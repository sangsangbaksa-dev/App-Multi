import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../clients.js";

const inv = () => ({ type: "invoice", client: " Acme GmbH ", clientEmail: "ap@acme.example", currency: "EUR", taxRate: 19, issueDate: "2026-10-01", dueDate: "2026-10-31", payinfo: "IBAN DE00", payLink: "https://pay.example/acme" });

test("profile is learned from an invoice, keyed by trimmed lower-case name", () => {
  const m = C.learn({}, inv());
  assert.deepEqual(Object.keys(m), ["acme gmbh"]);
  assert.deepEqual(m["acme gmbh"], { email: "ap@acme.example", terms: 30, taxRate: 19, currency: "EUR", payinfo: "IBAN DE00", payLink: "https://pay.example/acme" });
});
test("quotes and nameless invoices teach nothing; later invoices replace the profile", () => {
  assert.deepEqual(C.learn({}, { ...inv(), type: "quote" }), {});
  assert.deepEqual(C.learn({}, { ...inv(), client: "  " }), {});
  const m = C.learn(C.learn({}, inv()), { ...inv(), dueDate: "2026-10-08" });
  assert.equal(m["acme gmbh"].terms, 7);
});
test("applyDefaults sets terms from the issue date and keeps items", () => {
  const m = C.learn({}, inv());
  const doc = { client: "acme gmbh", issueDate: "2026-11-02", dueDate: "2026-11-16", currency: "USD", taxRate: 0, payinfo: "", payLink: "", items: [{ desc: "x" }] };
  const out = C.applyDefaults(doc, m["acme gmbh"]);
  assert.equal(out.dueDate, "2026-12-02");
  assert.equal(out.currency, "EUR");
  assert.equal(out.taxRate, 19);
  assert.equal(out.clientEmail, "ap@acme.example");
  assert.deepEqual(out.items, [{ desc: "x" }]);
  assert.equal(C.applyDefaults(doc, undefined), doc);
});
test("cleanProfile rejects junk", () => {
  const p = C.cleanProfile({ email: "not mail", terms: 9999, taxRate: -3, currency: "usd", payinfo: "x".repeat(900), payLink: "http://insecure" });
  assert.deepEqual(p, { email: "", terms: 14, taxRate: 0, currency: "", payinfo: "x".repeat(600), payLink: "" });
});
test("validEmail and mailtoUrl", () => {
  assert.ok(C.validEmail("a.b+c@sub.example.com"));
  for (const bad of ["", "a@b", "a b@c.de", "a@b.c", "<a@b.de>", "x@y.de,z@y.de"]) assert.equal(C.validEmail(bad), false, bad);
  assert.equal(C.mailtoUrl("a@b.de", "Hi & bye", "Line1\nLine2"), "mailto:a@b.de?subject=Hi%20%26%20bye&body=Line1%0ALine2");
  assert.equal(C.mailtoUrl("bad", "s", "b"), "");
});
test("forget removes by normalised name", () => {
  assert.deepEqual(C.forget(C.learn({}, inv()), "ACME gmbh"), {});
});
