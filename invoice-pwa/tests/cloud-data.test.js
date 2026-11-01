import test from "node:test";
import assert from "node:assert/strict";
import { snapshot, apply, isEmpty, SYNC_KEYS } from "../cloud-data.js";

const mem = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };

test("snapshot contains only synced keys, never license or language", () => {
  const s = mem({ "qb.invoices": '[{"id":1}]', "qb.license": "SECRET", "qb.lang": "ko", "qb.licsrv": "{}", "qb.logo": '"data:image/png;base64,AA"', "qb.rate": "50" });
  assert.deepEqual(snapshot(s), { "qb.invoices": [{ id: 1 }], "qb.logo": "data:image/png;base64,AA", "qb.rate": 50 });
});

test("snapshot skips corrupt values", () => {
  assert.deepEqual(snapshot(mem({ "qb.invoices": "{oops", "qb.rate": "3" })), { "qb.rate": 3 });
});

test("apply writes the snapshot, removes missing keys, keeps local-only keys, backs up invoices", () => {
  const s = mem({ "qb.invoices": '[{"id":"old"}]', "qb.expenses": "[1]", "qb.license": "KEEP", "qb.lang": "ko" });
  assert.equal(apply(s, { "qb.invoices": [{ id: "new" }], "qb.rate": 10, "evil": 1 }), true);
  assert.equal(s.getItem("qb.invoices"), '[{"id":"new"}]');
  assert.equal(s.getItem("qb.expenses"), null);
  assert.equal(s.getItem("qb.rate"), "10");
  assert.equal(s.getItem("evil"), null);
  assert.equal(s.getItem("qb.license"), "KEEP");
  assert.equal(s.getItem("qb.lang"), "ko");
  assert.equal(s.getItem("qb.invoices.bak-cloud"), '[{"id":"old"}]');
});

test("apply refuses bad snapshots and changes nothing", () => {
  const s = mem({ "qb.invoices": '[{"id":1}]' });
  for (const bad of [null, "x", [], { "qb.invoices": "not a list" }]) assert.equal(apply(s, bad), false);
  assert.equal(s.getItem("qb.invoices"), '[{"id":1}]');
});

test("round trip", () => {
  const a = mem(Object.fromEntries(SYNC_KEYS.map((k) => [k, k === "qb.rate" ? "7" : k === "qb.me" ? '"Me"' : k === "qb.logo" ? '"x"' : "[]"])));
  const b = mem();
  apply(b, snapshot(a));
  assert.deepEqual(snapshot(b), snapshot(a));
});

test("isEmpty is true only when no list has entries", () => {
  assert.equal(isEmpty({}), true);
  assert.equal(isEmpty({ "qb.invoices": [], "qb.rate": 5 }), true);
  assert.equal(isEmpty({ "qb.expenses": [{}] }), false);
});
