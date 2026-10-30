import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../logic.js";

test("totals with tax and discount", () => {
  const t = L.calcTotals([{ qty: 2, price: 50.10 }, { qty: 1, price: 19.9 }], 10, 20);
  assert.deepEqual(t, { subtotal: 120.1, discount: 20, tax: 10.01, total: 110.11 });
});
test("discount cannot exceed subtotal; bad input is safe", () => {
  assert.equal(L.calcTotals([{ qty: 1, price: 10 }], 0, 999).total, 0);
  assert.equal(L.calcTotals([{ qty: "x", price: null }]).total, 0);
});
test("invoice numbering", () => {
  assert.equal(L.nextInvoiceNumber([]), "INV-0001");
  assert.equal(L.nextInvoiceNumber([{ number: "INV-0009" }, { number: "INV-0002" }]), "INV-0010");
});
test("free limit gating", () => {
  const three = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.equal(L.canSave(three, false, null), false);
  assert.equal(L.canSave(three, false, "b"), true);
  assert.equal(L.canSave(three, true, null), true);
});
test("license keys", () => {
  const k = L.makeLicense("AB12", "CD34");
  assert.ok(L.validLicense(k));
  assert.ok(L.validLicense(k.toLowerCase()));
  assert.ok(!L.validLicense("PRO-AB12-CD34-0000"));
  assert.ok(!L.validLicense(""));
});
test("csv escapes quotes", () => {
  const csv = L.toCSV([{ number: "INV-1", client: 'A "B" Co', items: [{ qty: 1, price: 5 }], currency: "USD", status: "sent" }]);
  assert.match(csv, /"A ""B"" Co"/);
});
test("overdue", () => {
  assert.ok(L.overdue({ status: "sent", dueDate: "2020-01-01" }, "2020-02-01"));
  assert.ok(!L.overdue({ status: "paid", dueDate: "2020-01-01" }, "2020-02-01"));
});

test("addPeriod clamps month ends", () => {
  assert.equal(L.addPeriod("2024-01-31", "monthly"), "2024-02-29");
  assert.equal(L.addPeriod("2024-12-15", "monthly"), "2025-01-15");
  assert.equal(L.addPeriod("2024-02-26", "weekly"), "2024-03-04");
});
test("runRecurring creates one draft per elapsed period", () => {
  const base = { id: "r", number: "INV-0001", client: "A", issueDate: "2024-01-01", dueDate: "2024-01-15",
    items: [{ qty: 1, price: 10 }], recur: "monthly", nextRun: "2024-02-01", status: "paid" };
  let n = 0;
  const { invoices, created } = L.runRecurring([base], "2024-03-05", () => "g" + ++n);
  assert.equal(created, 2);
  assert.equal(invoices.length, 3);
  const g = invoices.filter((i) => i.id.startsWith("g"));
  assert.deepEqual(g.map((i) => i.number).sort(), ["INV-0002", "INV-0003"]);
  assert.ok(g.every((i) => i.status === "draft" && !i.recur && i.dueDate === L.addDays(i.issueDate, 14)));
  assert.equal(invoices.find((i) => i.id === "r").nextRun, "2024-04-01");
  assert.equal(base.nextRun, "2024-02-01"); // input untouched
  assert.equal(L.runRecurring(invoices, "2024-03-05", () => "x").created, 0);
});

test("validInvoice rejects junk", () => {
  const ok = { id: "a", number: "INV-1", items: [], status: "draft", currency: "USD", issueDate: "2024-01-01", dueDate: "2024-01-02" };
  assert.ok(L.validInvoice(ok));
  assert.ok(!L.validInvoice({ ...ok, currency: "usd" }));
  assert.ok(!L.validInvoice({ ...ok, items: null }));
  assert.ok(!L.validInvoice(null));
});
