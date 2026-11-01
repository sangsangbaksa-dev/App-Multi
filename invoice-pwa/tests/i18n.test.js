import test from "node:test";
import assert from "node:assert/strict";
import * as I from "../i18n.js";

test("detectLang", () => {
  assert.equal(I.detectLang(null, ["ko-KR"]), "ko");
  assert.equal(I.detectLang(null, ["fr-FR", "es-MX"]), "es");
  assert.equal(I.detectLang(null, ["de"]), "en");
  assert.equal(I.detectLang("ja", ["ko"]), "ja");
});
test("every language has every key", () => {
  const en = Object.keys(I.DICT.en).sort();
  assert.ok(en.length > 200);
  for (const l of Object.keys(I.LANGS)) assert.deepEqual(Object.keys(I.DICT[l]).sort(), en, l);
});
test("no placeholder is lost in translation", () => {
  for (const [k, v] of Object.entries(I.DICT.en)) {
    const slots = (s) => [...s.matchAll(/(?<!\{)\{(\w+)\}(?!\})/g)].map((m) => m[1]).sort().join();
    for (const l of Object.keys(I.LANGS)) assert.equal(slots(I.DICT[l][k]), slots(v), `${l}.${k}`);
  }
});
test("t interpolates and falls back", () => {
  I.setLang("ko");
  assert.match(I.t("freeLimit", { n: 3 }), /3/);
  I.setLang("en");
  assert.equal(I.t("nope"), "nope");
});
test("client page strings exist in every language", () => {
  for (const l of Object.keys(I.LANGS)) for (const k of ["shareLink", "shareCopied", "vwPaid", "vwOverdue", "vwPay", "vwBad", "payLinkL"]) {
    assert.ok(I.DICT[l][k] && I.DICT[l][k] !== I.DICT.en[k] || l === "en", `${l}.${k}`);
  }
});
