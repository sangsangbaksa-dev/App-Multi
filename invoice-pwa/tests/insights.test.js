import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../logic.js";

const inv = (o) => ({ type: "invoice", status: "sent", currency: "USD", items: [{ qty: 1, price: 100 }], paid: 0, issueDate: "2026-10-05", dueDate: "2026-11-04", ...o });

test("monthsBack lists months oldest first, across a year boundary", () => {
  assert.deepEqual(L.monthsBack("2026-02-10", 3), ["2025-12", "2026-01", "2026-02"]);
});

test("monthlyFlow buckets by issue month, caps collected at billed, skips quotes, drafts and other currencies", () => {
  const list = [
    inv({ issueDate: "2026-10-03", paid: 40 }),
    inv({ issueDate: "2026-10-20", paid: 500 }),
    inv({ issueDate: "2026-08-01", items: [{ qty: 2, price: 50 }], paid: 100 }),
    inv({ type: "quote", issueDate: "2026-10-01" }),
    inv({ status: "draft", issueDate: "2026-10-01" }),
    inv({ currency: "EUR", issueDate: "2026-10-01" }),
    inv({ issueDate: "2024-01-01" }),
  ];
  const flow = L.monthlyFlow(list, "2026-10-15", 3, "USD");
  assert.deepEqual(flow.map((r) => r.month), ["2026-08", "2026-09", "2026-10"]);
  assert.deepEqual(flow[0], { month: "2026-08", billed: 100, collected: 100 });
  assert.deepEqual(flow[1], { month: "2026-09", billed: 0, collected: 0 });
  assert.deepEqual(flow[2], { month: "2026-10", billed: 200, collected: 140 });
});

test("currencyOf picks the most used currency and lists the rest", () => {
  const r = L.currencyOf([inv({}), inv({ currency: "KRW" }), inv({ currency: "KRW" }), inv({ type: "quote", currency: "JPY" })]);
  assert.equal(r.currency, "KRW");
  assert.deepEqual(r.others, ["USD"]);
  assert.equal(L.currencyOf([]).currency, "USD");
});

test("forecast averages six months of collections and counts unpaid balances due within 30 days", () => {
  const list = [
    inv({ issueDate: "2026-06-01", items: [{ qty: 1, price: 600 }], paid: 600 }),
    inv({ issueDate: "2026-10-01", items: [{ qty: 1, price: 300 }], paid: 300 }),
    inv({ issueDate: "2026-10-02", dueDate: "2026-10-20", paid: 0 }),   // 100 due soon
    inv({ issueDate: "2026-10-02", dueDate: "2026-12-20", paid: 0 }),   // not soon
    inv({ issueDate: "2026-09-02", dueDate: "2026-10-05", paid: 50 }),  // already past due, not counted
  ];
  const f = L.forecast(list, "2026-10-15", "USD");
  assert.equal(f.avgMonthly, 158.33); // (600 + 300 + 50) / 6
  assert.equal(f.next3, 474.99);
  assert.equal(f.dueSoon, 100);
  assert.deepEqual(L.forecast([], "2026-10-15"), { avgMonthly: 0, next3: 0, dueSoon: 0 });
});

test("hourlyRate grosses up for tax and divides by billable hours", () => {
  assert.deepEqual(L.hourlyRate({ netTarget: 60000, taxPct: 20, hours: 1200 }), { gross: 75000, rate: 62.5 });
  assert.deepEqual(L.hourlyRate({ netTarget: 1000, taxPct: 0, hours: 100 }), { gross: 1000, rate: 10 });
  assert.equal(L.hourlyRate({ netTarget: 0, taxPct: 0, hours: 100 }), null);
  assert.equal(L.hourlyRate({ netTarget: 100, taxPct: 100, hours: 100 }), null);
  assert.equal(L.hourlyRate({ netTarget: 100, taxPct: 0, hours: 0 }), null);
});

test("netAfter takes tax and fees off a gross amount and refuses impossible rates", () => {
  assert.deepEqual(L.netAfter({ gross: 1000, taxPct: 10, feePct: 5 }), { tax: 100, fee: 50, net: 850 });
  assert.deepEqual(L.netAfter({ gross: 99.99, taxPct: 0, feePct: 0 }), { tax: 0, fee: 0, net: 99.99 });
  assert.equal(L.netAfter({ gross: 100, taxPct: 60, feePct: 40 }), null);
  assert.equal(L.netAfter({ gross: -1, taxPct: 0, feePct: 0 }), null);
});
