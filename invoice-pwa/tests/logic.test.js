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
  const it = [{ qty: 1, price: 100 }];
  assert.ok(L.overdue({ status: "sent", items: it, dueDate: "2020-01-01" }, "2020-02-01"));
  assert.ok(!L.overdue({ status: "paid", items: it, dueDate: "2020-01-01" }, "2020-02-01"));
  assert.ok(!L.overdue({ status: "sent", items: it, paid: 100, dueDate: "2020-01-01" }, "2020-02-01"));
  assert.ok(!L.overdue({ status: "sent", type: "quote", items: it, dueDate: "2020-01-01" }, "2020-02-01"));
  assert.ok(!L.overdue({ status: "draft", items: it, dueDate: "2020-01-01" }, "2020-02-01"));
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

const inv = (o) => ({ id: o.number, type: "invoice", client: "A", currency: "USD", status: "sent", paid: 0,
  issueDate: "2024-01-01", dueDate: "2024-01-15", items: [{ qty: 1, price: 100 }], taxRate: 10, ...o });

test("settle keeps status and paid consistent", () => {
  assert.equal(L.settle(inv({ status: "paid" })).paid, 110);
  assert.equal(L.settle(inv({ paid: 110 })).status, "paid");
  assert.equal(L.settle(inv({ paid: 999 })).paid, 110); // clamped
  assert.equal(L.settle(inv({ paid: -5 })).paid, 0);
  assert.equal(L.settle(inv({ paid: 50 })).status, "sent");
  assert.equal(L.balanceOf(inv({ paid: 50 })), 60);
  assert.equal(L.settle(inv({ type: "quote", paid: 40 })).paid, 0);
});
test("numbering is per document type", () => {
  const list = [{ number: "INV-0007" }, { number: "QUO-0002" }];
  assert.equal(L.nextNumber(list, "invoice"), "INV-0008");
  assert.equal(L.nextNumber(list, "quote"), "QUO-0003");
  assert.equal(L.nextNumber([], "quote"), "QUO-0001");
});
test("convertQuote creates a fresh draft invoice", () => {
  const q = inv({ number: "QUO-0001", type: "quote", status: "accepted", paid: 0 });
  const c = L.convertQuote(q, [q], () => "new", "2024-05-01");
  assert.equal(c.type, "invoice"); assert.equal(c.number, "INV-0001"); assert.equal(c.status, "draft");
  assert.equal(c.dueDate, "2024-05-15"); assert.equal(c.convertedFrom, "QUO-0001");
  c.items[0].price = 1; assert.equal(q.items[0].price, 100); // deep copy
});
test("summarize and byClient ignore quotes and drafts, split by currency", () => {
  const list = [
    inv({ number: "INV-1", paid: 50 }),                       // balance 60, overdue
    inv({ number: "INV-2", dueDate: "2099-01-01" }),          // balance 110, not overdue
    inv({ number: "INV-3", status: "paid", paid: 110 }),
    inv({ number: "INV-4", status: "draft" }),
    inv({ number: "QUO-1", type: "quote" }),
    inv({ number: "INV-5", currency: "KRW", items: [{ qty: 1, price: 1000 }], taxRate: 0, client: "B" }),
  ];
  const s = L.summarize(list, "2024-06-01");
  const usd = s.find((x) => x.currency === "USD");
  assert.deepEqual(usd, { currency: "USD", outstanding: 170, overdue: 60, collected: 160 });
  assert.equal(s.find((x) => x.currency === "KRW").overdue, 1000);
  const c = L.byClient(list);
  assert.equal(c.length, 2);
  const a = c.find((x) => x.client === "A");
  assert.deepEqual([a.count, a.billed, a.paid, a.balance], [3, 330, 160, 170]);
});
test("csv has type and balance", () => {
  const csv = L.toCSV([inv({ number: "INV-1", paid: 10 })]);
  assert.match(csv, /^"?type"?,/);
  assert.match(csv, /"invoice","INV-1".*"110","10","100"/);
});

test("late fee grows per started month and is idempotent", () => {
  const o = inv({ number: "INV-9", taxRate: 0, dueDate: "2024-01-15" }); // 100 owed
  assert.equal(L.lateFeeAmount(o, "2024-01-15", 2), 0);
  assert.equal(L.lateFeeAmount(o, "2024-01-16", 2), 2);
  assert.equal(L.lateFeeAmount(o, "2024-02-14", 2), 2);   // 30 days = one month
  assert.equal(L.lateFeeAmount(o, "2024-02-15", 2), 4);   // 31 days = two
  assert.equal(L.lateFeeAmount({ ...o, paid: 100 }, "2025-01-01", 2), 0);
  const once = L.applyLateFee(o, "2024-03-01", 2, "Late fee");
  const twice = L.applyLateFee(once, "2024-03-01", 2, "Late fee");
  assert.deepEqual(once.items, twice.items);
  assert.equal(once.items.filter((x) => x.lateFee).length, 1);
  assert.equal(L.applyLateFee(o, "2024-01-01", 2, "x").items.length, 1); // not late yet
});
test("ageing buckets", () => {
  const list = [
    inv({ number: "A", taxRate: 0, dueDate: "2024-05-20" }),  // 12 days
    inv({ number: "B", taxRate: 0, dueDate: "2024-04-01" }),  // 61 days
    inv({ number: "C", taxRate: 0, dueDate: "2023-01-01" }),  // very old
    inv({ number: "D", taxRate: 0, dueDate: "2024-05-20", status: "paid", paid: 100 }),
  ];
  assert.deepEqual(L.ageing(list, "2024-06-01"), [{ currency: "USD", d30: 100, d60: 0, d90: 100, older: 100 }]);
});
test("tracked time becomes invoice lines", () => {
  const e = [
    { client: "A", desc: "Design", secs: 5400 }, { client: "A", desc: "Calls", secs: 1800 },
    { client: "B", desc: "x", secs: 3600 }, { client: "A", desc: "old", secs: 3600, billed: true },
  ];
  assert.deepEqual(L.unbilledByClient(e), [{ client: "A", secs: 7200, count: 2 }, { client: "B", secs: 3600, count: 1 }]);
  assert.deepEqual(L.timeItems(e, "A", 80), [{ desc: "Design", qty: 1.5, price: 80 }, { desc: "Calls", qty: 0.5, price: 80 }]);
});
