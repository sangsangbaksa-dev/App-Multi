import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

// Offline use breaks silently if a new module is imported but never cached by the service worker.
test("every module imported by app.js and view.js is in the service worker cache list", () => {
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const cached = new Set([...sw.matchAll(/"([^"]+)"/g)].map((m) => m[1].replace(/^\.\//, "")));
  const wanted = new Set();
  const walk = (file) => {
    if (wanted.has(file)) return;
    wanted.add(file);
    const src = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    for (const m of src.matchAll(/from\s+"\.\/([\w.-]+\.js)"/g)) walk(m[1]);
  };
  for (const entry of ["app.js", "view.js"]) walk(entry);
  for (const f of wanted) assert.ok(cached.has(f), `${f} missing from sw.js`);
  assert.ok(cached.has("view"), "client page missing from sw.js");
  assert.ok(readdirSync(new URL("..", import.meta.url)).includes("view.html"));
});
