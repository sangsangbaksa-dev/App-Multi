// Builds the public landing pages from landing.src.html:
//   index.html (English), ko/ ja/ zh/ es/ index.html, sitemap.xml, robots.txt
// Each language page is the source page after its JavaScript has run, so search engines get real text
// in that language without executing anything, plus canonical + hreflang links and JSON-LD data.
// Run from invoice-pwa/ after changing landing.src.html, i18n.js, config.js or the site address:
//   node design/seo.cjs                      (site address comes from config.js)
//   SITE_URL=https://www.example.com node design/seo.cjs
const fs = require("fs");
const path = require("path");
const http = require("http");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const LANGS = ["en", "ko", "ja", "zh", "es"];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

async function main() {
  const cfgSrc = fs.readFileSync(path.join(root, "config.js"), "utf8");
  const read = (k) => (new RegExp(k + ':\\s*"([^"]*)"').exec(cfgSrc) || [])[1] || "";
  const site = (process.env.SITE_URL || read("siteUrl")).replace(/\/+$/, "");
  const price = read("priceShort");
  const priceNum = (/([\d.]+)/.exec(price) || [])[1];
  const cur = price.includes("$") ? "USD" : price.includes("€") ? "EUR" : price.includes("₩") ? "KRW" : "";

  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    const f = path.join(root, p === "/" ? "landing.src.html" : p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  }).listen(0);
  const port = server.address().port;
  const browser = await chromium.launch();

  const url = (l) => `${site}/${l === "en" ? "" : l + "/"}`;
  const alternates = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${url(l)}">`).concat(`<link rel="alternate" hreflang="x-default" href="${url("en")}">`).join("\n");

  for (const lang of LANGS) {
    const ctx = await browser.newContext({ locale: lang === "zh" ? "zh-CN" : lang });
    const page = await ctx.newPage();
    await page.addInitScript((l) => { try { localStorage.setItem("qb.lang", l); } catch {} }, lang);
    await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
    const data = await page.evaluate(() => ({
      title: document.title,
      desc: document.querySelector('meta[name="description"]').content,
      heroTitle: document.querySelector(".hero h1")?.textContent || "",
      faq: [...document.querySelectorAll("#faq details")].map((d) => ({ q: d.querySelector("summary").textContent.trim(), a: d.querySelector("p").textContent.trim() })),
      html: document.documentElement.outerHTML,
    }));
    await ctx.close();

    const ld = [
      {
        "@context": "https://schema.org", "@type": "SoftwareApplication", name: "QuickBill", url: url(lang), inLanguage: lang,
        applicationCategory: "BusinessApplication", operatingSystem: "Any (web browser)", description: data.desc,
        image: `${site}/og.png`,
        offers: [{ "@type": "Offer", name: "Free", price: "0", priceCurrency: cur || "USD" }].concat(priceNum && cur ? [{ "@type": "Offer", name: "Pro", price: priceNum, priceCurrency: cur }] : []),
      },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: data.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ].map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");

    const head = [
      `<title>${esc(data.title)}</title>`,
      `<meta name="description" content="${esc(data.desc)}">`,
      `<link rel="canonical" href="${url(lang)}">`,
      alternates,
      `<meta property="og:type" content="website">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta property="og:title" content="${esc(data.title)}">`,
      `<meta property="og:description" content="${esc(data.desc)}">`,
      `<meta property="og:url" content="${url(lang)}">`,
      `<meta property="og:locale" content="${{ en: "en_US", ko: "ko_KR", ja: "ja_JP", zh: "zh_CN", es: "es_ES" }[lang]}">`,
      `<meta property="og:image" content="${site}/og.png">`,
      `<meta name="twitter:title" content="${esc(data.title)}">`,
      `<meta name="twitter:description" content="${esc(data.desc)}">`,
      `<meta name="twitter:image" content="${site}/og.png">`,
      ld,
    ].join("\n");

    let html = "<!doctype html>\n" + data.html;
    html = html.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, "<!--seo:start-->\n" + head + "\n<!--seo:end-->");
    html = html.replace(/<html[^>]*>/, lang === "en" ? '<html lang="en">' : `<html lang="${lang}" data-lang="${lang}">`); // the root page keeps auto-detecting the browser language
    if (lang !== "en") {
      // Pages live one folder down: point relative links back up, leave #anchors and absolute links alone.
      html = html.replace(/\b(href|src)="(?!#|https?:|mailto:|data:|\/)([^"]*)"/g, '$1="../$2"');
      html = html.replace(/from "\.\//g, 'from "../').replace(/register\("sw\.js"\)/g, 'register("../sw.js")');
    }
    const out = lang === "en" ? path.join(root, "index.html") : path.join(root, lang, "index.html");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    console.log("wrote", path.relative(root, out), html.length, "bytes");
  }
  await browser.close();
  server.close();

  const pages = [""].concat(LANGS.slice(1).map((l) => l + "/"));
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    .concat(pages.map((p) => `<url><loc>${site}/${p}</loc>${LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${url(l)}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${url("en")}"/></url>`))
    .concat(["terms.html", "privacy.html"].map((p) => `<url><loc>${site}/${p}</loc></url>`), "</urlset>").join("\n") + "\n";
  fs.writeFileSync(path.join(root, "sitemap.xml"), xml);
  fs.writeFileSync(path.join(root, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`);
  console.log("site:", site);
}
main().catch((e) => { console.error(e); process.exit(1); });
