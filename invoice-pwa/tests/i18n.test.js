import test from "node:test";
import assert from "node:assert/strict";
import * as I from "../i18n.js";
import { readFileSync } from "node:fs";

test("detectLang", () => {
  assert.equal(I.detectLang(null, ["ko-KR"]), "ko");
  assert.equal(I.detectLang(null, ["fr-FR", "es-MX"]), "es");
  assert.equal(I.detectLang(null, ["de"]), "en");
  assert.equal(I.detectLang("ja", ["ko"]), "ja");
});
test("every language has every key", async () => {
  const src = readFileSync(new URL("../i18n.js", import.meta.url), "utf8");
  const keysOf = (l) => {
    const start = src.indexOf(`\n  ${l}: {`, src.indexOf("const D"));
    const end = src.indexOf("\n  },", start);
    return [...src.slice(start, end).matchAll(/\b([a-zA-Z0-9]+): "/g)].map((m) => m[1]).sort();
  };
  const en = keysOf("en");
  assert.ok(en.length > 80);
  for (const l of ["ko", "ja", "zh", "es"]) assert.deepEqual(keysOf(l), en, l);
});
test("t interpolates and falls back", () => {
  I.setLang("ko");
  assert.match(I.t("freeLimit", { n: 3 }), /3/);
  I.setLang("en");
  assert.equal(I.t("nope"), "nope");
});
