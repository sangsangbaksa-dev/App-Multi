import test from "node:test";
import assert from "node:assert/strict";
import * as S from "../share.js";
import * as L from "../logic.js";

const inv = () => ({
  id: "x", type: "invoice", number: "INV-0007", from: "Min-jun 김 Studio", client: "Acme <GmbH>", currency: "EUR",
  issueDate: "2026-10-01", dueDate: "2026-10-15", taxRate: 10, discount: 5, paid: 100, status: "sent",
  notes: "Thanks — 감사합니다 ✓", payinfo: "IBAN DE00 0000", payLink: "https://pay.example.com/i/7", lateFeePct: 2,
  items: [{ desc: "Design", qty: 2, price: 250 }, { desc: "Hosting", qty: 1, price: 40.5 }],
});

test("round trip keeps money, text and unicode intact", () => {
  const r = S.decodeShare(S.encodeShare(inv(), "ko"));
  assert.ok(r.ok);
  assert.equal(r.inv.lang, "ko");
  assert.equal(r.inv.notes, "Thanks — 감사합니다 ✓");
  assert.equal(r.inv.client, "Acme <GmbH>");
  assert.equal(L.totalOf(r.inv), L.totalOf(inv()));
  assert.equal(L.balanceOf(r.inv), L.balanceOf(inv()));
  assert.equal(r.inv.payLink, "https://pay.example.com/i/7");
});
test("payload is url-safe", () => {
  assert.match(S.encodeShare(inv(), "en"), /^[A-Za-z0-9_-]+$/);
});
test("shareUrl puts the data in the fragment and reports long links", () => {
  const { url, long } = S.shareUrl("https://q.example/view.html#old", inv(), "en");
  assert.match(url, /^https:\/\/q\.example\/view\.html#d=[\w-]+$/);
  assert.equal(long, false);
  const big = inv();
  big.items = Array.from({ length: 100 }, (_, i) => ({ desc: "x".repeat(150) + i, qty: 1, price: i }));
  assert.equal(S.shareUrl("https://q.example/view.html", big, "en").long, true);
});
test("payloadFromHash", () => {
  assert.equal(S.payloadFromHash("#d=abc_-1"), "abc_-1");
  assert.equal(S.payloadFromHash("#x=1&d=abc"), "abc");
  assert.equal(S.payloadFromHash("#nothing"), "");
  assert.equal(S.payloadFromHash(""), "");
});
test("only https payment links survive, in the link and in decoding", () => {
  assert.equal(S.safeLink("javascript:alert(1)"), "");
  assert.equal(S.safeLink("http://pay.example.com"), "");
  assert.equal(S.safeLink("https://user:pw@pay.example.com"), "");
  assert.equal(S.safeLink("not a url"), "");
  assert.equal(S.safeLink(" https://pay.example.com/a "), "https://pay.example.com/a");
  const forged = Buffer.from(JSON.stringify({ ...S.toSnapshot(inv()), pl: "javascript:alert(1)" })).toString("base64url");
  assert.equal(S.decodeShare(forged).inv.payLink, "");
});
test("bad payloads are rejected, never thrown", () => {
  const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
  const good = S.toSnapshot(inv());
  for (const bad of ["", "***", "abc", b64("not json"), b64({}), b64({ ...good, cur: "usd" }), b64({ ...good, cur: "ZZZ9" }),
    b64({ ...good, is: "yesterday" }), b64({ ...good, it: "x" }), b64({ ...good, it: [5] }), "A".repeat(S.MAX_PAYLOAD + 1)]) {
    assert.equal(S.decodeShare(bad).ok, false, bad.slice(0, 20));
  }
  assert.equal(S.decodeShare(b64({ ...good, v: 99 })).reason, "newer");
  assert.equal(S.decodeShare(undefined).ok, false);
});
test("decoding clamps numbers, text and item count", () => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const r = S.decodeShare(b64({ ...S.toSnapshot(inv()), tx: -5, pd: "x", n: "N".repeat(500), l: "xx", st: "weird", it: [["a", -1, "z", 0]] }));
  assert.ok(r.ok);
  assert.equal(r.inv.taxRate, 0);
  assert.equal(r.inv.paid, 0);
  assert.equal(r.inv.number.length, 40);
  assert.equal(r.inv.lang, "en");
  assert.equal(r.inv.status, "sent");
  assert.deepEqual(r.inv.items, [{ desc: "a", qty: 0, price: 0 }]);
  const many = S.decodeShare(b64({ ...S.toSnapshot(inv()), it: Array.from({ length: 101 }, () => ["a", 1, 1, 0]) }));
  assert.equal(many.ok, false);
});
test("quotes carry no payments and are never 'due'", () => {
  const q = { ...inv(), type: "quote", paid: 50 };
  const r = S.decodeShare(S.encodeShare(q, "en"));
  assert.equal(r.inv.type, "quote");
  assert.equal(r.inv.paid, 0);
  assert.equal(S.shareStatus(r.inv, "2026-10-10").kind, "quote");
  assert.equal(S.shareStatus(r.inv, "2026-11-01").kind, "quoteExpired");
});
test("status: due, due today, overdue with late fee, paid, draft", () => {
  const base = inv();
  assert.deepEqual(
    (({ kind, days }) => ({ kind, days }))(S.shareStatus(base, "2026-10-10")), { kind: "due", days: 5 });
  assert.equal(S.shareStatus(base, "2026-10-15").kind, "dueToday");
  const od = S.shareStatus(base, "2026-10-20");
  assert.equal(od.kind, "overdue");
  assert.equal(od.days, 5);
  assert.equal(od.balance, L.balanceOf(base));
  assert.equal(od.lateFee, L.round2(od.balance * 0.02));
  assert.equal(od.payable, L.round2(od.balance + od.lateFee));
  assert.equal(S.shareStatus({ ...base, status: "paid" }, "2026-12-01").kind, "paid");
  assert.equal(S.shareStatus({ ...base, paid: 1e6, status: "sent" }, "2026-12-01").kind, "paid");
  assert.equal(S.shareStatus({ ...base, status: "draft" }, "2026-12-01").kind, "draft");
});
test("an existing late-fee line is not charged twice", () => {
  const base = inv();
  base.items.push({ desc: "Late fee", qty: 1, price: 10, lateFee: true });
  const od = S.shareStatus(base, "2026-11-30");
  assert.equal(od.lateFee, 0);
  assert.equal(od.payable, od.balance);
});
test("totals helper matches the sender's totals", () => {
  assert.equal(S.shareTotals(inv()).total, L.totalOf(inv()));
});
