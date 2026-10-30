// Static server that applies the headers from vercel.json, so the e2e suites run under the same CSP as production.
// Usage: node tests/serve.cjs [port]   (default 8123)
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain" };

// /api/license runs the real function. With QB_MOCK_LS=1 (and LS_STORE_ID / LS_PRODUCT_ID set) the calls to
// Lemon Squeezy are answered from a small table instead of the network:
//   good-key-0001 -> valid, REVOKED-key-001 -> disabled, OTHER-product-01 -> belongs to another product
let licenseHandler = null;
const mockLS = () => {
  const orig = global.fetch;
  global.fetch = async (url, init) => {
    if (!String(url).startsWith("https://api.lemonsqueezy.com/")) return orig(url, init);
    const f = new URLSearchParams(init.body), key = f.get("license_key");
    const meta = { store_id: Number(process.env.LS_STORE_ID), product_id: Number(process.env.LS_PRODUCT_ID) };
    const mk = (status, m = meta) => ({ license_key: { status, key }, instance: { id: "11111111-2222-3333-4444-555555555555", name: f.get("instance_name") }, meta: m });
    let body;
    if (key === "good-key-0001") body = { activated: true, valid: true, ...mk("active") };
    else if (key === "REVOKED-key-001") body = { activated: true, valid: false, ...mk("disabled") };
    else if (key === "OTHER-product-01") body = { activated: true, valid: true, ...mk("active", { store_id: 1, product_id: 2 }) };
    else body = { activated: false, valid: false, error: "license_key not found." };
    return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  };
};
if (process.env.QB_MOCK_LS) mockLS();
async function api(req, res) {
  licenseHandler ||= (await import(path.join(root, "api/license.js"))).default;
  let raw = ""; for await (const c of req) raw += c;
  let body = {}; try { body = JSON.parse(raw); } catch {}
  const shim = { setHeader: (k, v) => res.setHeader(k, v), status(c) { res.statusCode = c; return this; }, json(o) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); } };
  await licenseHandler({ method: req.method, body }, shim);
}

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/api/license") return api(req, res);
  // Clean URLs like Vercel (cleanUrls) and Cloudflare Pages: /app.html redirects to /app, /ko/index.html to /ko/.
  if (p.endsWith(".html")) {
    const to = p.endsWith("/index.html") ? p.slice(0, -"index.html".length) : p.slice(0, -".html".length);
    res.writeHead(308, { Location: to || "/" });
    return res.end();
  }
  if (p !== "/" && !p.endsWith("/") && !path.extname(p)) {
    if (fs.existsSync(path.join(root, p + ".html"))) p += ".html";
    else if (fs.existsSync(path.join(root, p, "index.html"))) { res.writeHead(308, { Location: p + "/" }); return res.end(); }
  }
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
  const h = { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" };
  for (const rule of cfg.headers) {
    const re = new RegExp("^" + rule.source.replace(/\(\.\*\)/g, ".*").replace(/\\\\\./g, "\\.") + "$");
    if (re.test(p)) for (const x of rule.headers) h[x.key] = x.value;
  }
  res.writeHead(200, h);
  fs.createReadStream(f).pipe(res);
}).listen(Number(process.argv[2]) || 8123, () => console.log("serving on", process.argv[2] || 8123));
