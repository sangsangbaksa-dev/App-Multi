// Run: node tests/e2e-site.cjs  (static server with the production headers on :8123: node tests/serve.cjs)
// Landing pages in five languages, SEO tags, structured data, sitemap/robots, terms and privacy pages, axe.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const BASE = "http://localhost:8123";
const LANGS = ["en", "ko", "ja", "zh", "es"];
const AXE = "/tmp/axe/node_modules/axe-core/axe.min.js"; // npm i axe-core --prefix /tmp/axe
const axe = fs.existsSync(AXE) ? fs.readFileSync(AXE, "utf8") : "";

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: "block" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => m.type() === "error" && errs.push(m.text()));

  const urls = {};
  for (const l of LANGS) {
    const path = l === "en" ? "/" : `/${l}/`;
    await p.goto(BASE + path);
    const d = await p.evaluate(() => ({
      lang: document.documentElement.lang,
      title: document.title,
      desc: document.querySelector('meta[name="description"]').content,
      canon: document.querySelector('link[rel=canonical]').href,
      alts: [...document.querySelectorAll('link[rel=alternate][hreflang]')].map((a) => a.hreflang),
      ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)),
      h1: document.querySelector("h1").textContent.trim(),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      empty: [...document.querySelectorAll("[data-i18n]")].filter((e) => !e.textContent.trim() && !e.hasAttribute("hidden") && e.tagName !== "OPTION").length,
    }));
    assert.equal(d.lang, l, l);
    assert.ok(d.title.length > 12 && d.desc.length > 40, l);
    assert.ok(d.canon.endsWith(path), `${l} canonical ${d.canon}`);
    assert.deepEqual(d.alts, [...LANGS, "x-default"], l);
    assert.equal(d.ld[0]["@type"], "SoftwareApplication");
    assert.equal(d.ld[1]["@type"], "FAQPage");
    assert.equal(d.ld[1].mainEntity.length, 6);
    assert.ok(d.ld[0].offers.some((o) => o.price === "19"), "Pro price in structured data");
    assert.ok(d.overflow <= 0, `${l} sideways scroll ${d.overflow}`);
    assert.equal(d.empty, 0, `${l} has empty translated elements`);
    urls[l] = d;
    // the HTML a crawler gets (no JavaScript) already has the text
    const raw = await (await fetch(BASE + path)).text();
    assert.ok(raw.includes(d.h1.slice(0, 12)), `${l} static HTML contains the headline`);
  }
  assert.notEqual(urls.ko.h1, urls.en.h1);

  // a localized page keeps its language for a visitor with no saved choice, and links still work from /ko/
  await p.goto(BASE + "/ko/");
  assert.equal(await p.locator("#lang").inputValue(), "ko");
  assert.ok((await p.locator('a[href="../app.html"]').count()) > 0);
  await p.click('a[href="../terms.html"]');
  await p.waitForURL("**/terms.html");

  // the root page still follows the browser language
  const ko = await b.newContext({ locale: "ko-KR", serviceWorkers: "block" });
  const kp = await ko.newPage();
  await kp.goto(BASE + "/");
  await kp.waitForFunction(() => document.documentElement.lang === "ko");
  await ko.close();

  // legal pages
  for (const [page, h1en, h1ko] of [["terms.html", "Terms of use", "이용약관"], ["privacy.html", "Privacy", "개인정보 처리방침"]]) {
    await p.goto(`${BASE}/${page}`);
    assert.equal(await p.locator('article[data-l="en"] h1').textContent(), h1en);
    assert.ok(await p.locator('article[data-l="ko"]').isHidden());
    assert.ok((await p.locator('article[data-l="en"]').innerText()).includes("[support email]"), "placeholder email shown while unset");
    if (page === "terms.html") assert.ok((await p.locator('article[data-l="en"]').innerText()).includes("14 days"));
    await p.click("#swlang");
    assert.equal(await p.locator('article[data-l="ko"] h1').textContent(), h1ko);
    assert.ok(await p.locator('article[data-l="en"]').isHidden());
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0, true);
  }

  // accessibility on the new pages
  const wide = await b.newContext({ viewport: { width: 1100, height: 900 }, serviceWorkers: "block" });
  const w = await wide.newPage();
  for (const path of ["/", "/ko/", "/terms.html", "/privacy.html"]) {
    await w.goto(BASE + path);
    if (!axe) continue;
    await w.addScriptTag({ content: axe });
    const r = await w.evaluate(() => axe.run());
    assert.deepEqual(r.violations.map((v) => `${path} ${v.id} ${v.nodes[0].target}`), []);
  }

  // crawler files
  const robots = await (await fetch(BASE + "/robots.txt")).text();
  assert.match(robots, /Sitemap: https?:\/\/.+\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/api\//);
  const sm = await (await fetch(BASE + "/sitemap.xml")).text();
  for (const l of LANGS.slice(1)) assert.ok(sm.includes(`/${l}/</loc>`), l);
  assert.ok(sm.includes("terms.html") && sm.includes("privacy.html"));

  await b.close();
  assert.deepEqual(errs, []);
  console.log("e2e site OK");
})().catch((e) => { console.error(e); process.exit(1); });
