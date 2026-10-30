// Builds the folder that Cloudflare Pages publishes: node scripts/build-pages.mjs  ->  dist/
// It copies only what visitors need (no tests, design sources, docs, or the Vercel function) and writes
// dist/_headers from the security headers in vercel.json, so the CSP is defined in one place.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");
const SKIP_DIRS = new Set(["tests", "design", "api", "functions", "scripts", "node_modules", "dist", ".git", ".wrangler"]);
const SKIP_FILES = new Set(["package.json", "package-lock.json", "vercel.json", ".vercelignore", "landing.src.html", "README.md", "wrangler.toml"]);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
let n = 0;
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!SKIP_DIRS.has(name)) walk(p); continue; }
    if (SKIP_FILES.has(name) || name.startsWith("_")) continue;
    const to = join(out, relative(root, p));
    mkdirSync(dirname(to), { recursive: true });
    cpSync(p, to);
    n++;
  }
})(root);

const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
const all = vercel.headers.find((h) => h.source === "/(.*)").headers;
const lines = ["/*", ...all.map((h) => `  ${h.key}: ${h.value}`), "",
  "/sw.js", "  Cache-Control: no-cache", "",
  "/fonts/*", "  Cache-Control: public, max-age=604800", "",
  // The project's own *.pages.dev address stays out of search results once a custom domain is the real one.
  "https://:project.pages.dev/*", "  X-Robots-Tag: noindex", ""];
writeFileSync(join(out, "_headers"), lines.join("\n"));
if (!existsSync(join(out, "index.html")) || !existsSync(join(out, "app.html"))) throw new Error("index.html or app.html missing from dist");
console.log(`dist/: ${n} files + _headers`);
