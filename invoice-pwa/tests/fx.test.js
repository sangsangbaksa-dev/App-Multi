import test from "node:test";
import assert from "node:assert/strict";
import * as F from "../fx.js";

const sums = [
  { currency: "USD", outstanding: 100, overdue: 40, collected: 10 },
  { currency: "EUR", outstanding: 200, overdue: 0, collected: 50 },
  { currency: "KRW", outstanding: 130000, overdue: 65000, collected: 0 },
];
test("combine converts with typed rates", () => {
  const c = F.combine(sums, { base: "USD", rates: { EUR: 1.1, KRW: 0.00077 } });
  assert.equal(c.currency, "USD");
  assert.equal(c.outstanding, 100 + 220 + 100.1);
  assert.equal(c.overdue, 40 + 50.05);
  assert.equal(c.collected, 65);
  assert.deepEqual(c.missing, []);
});
test("a currency without a rate is reported, not guessed", () => {
  const c = F.combine(sums, { base: "USD", rates: { EUR: 1.1 } });
  assert.deepEqual(c.missing, ["KRW"]);
  assert.equal(c.outstanding, 320);
});
test("base can be any currency and base rows need no rate", () => {
  const c = F.combine(sums, { base: "EUR", rates: { USD: 0.9 } });
  assert.equal(c.currency, "EUR");
  assert.equal(c.outstanding, 290);
  assert.deepEqual(c.missing, ["KRW"]);
});
test("cleanRates drops bad entries and defaults the base", () => {
  assert.deepEqual(F.cleanRates(null), { base: "USD", rates: {} });
  const r = F.cleanRates({ base: "eur", rates: { USD: "x", GBP: -1, JPY: "0.0065", EUR: 2, CAD: Infinity, "AB": 1 } });
  assert.deepEqual(r, { base: "USD", rates: { EUR: 2, JPY: 0.0065 } });
});
test("convert and parseRate", () => {
  assert.equal(F.convert(10, "EUR", { base: "USD", rates: { EUR: 1.234 } }), 12.34);
  assert.equal(F.convert(10, "GBP", { base: "USD", rates: {} }), null);
  assert.equal(F.parseRate("1,25"), 1.25);
  assert.equal(F.parseRate(""), 0);
  assert.equal(F.parseRate("-3"), 0);
  assert.equal(F.parseRate("abc"), 0);
});
