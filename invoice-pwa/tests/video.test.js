import test from "node:test";
import assert from "node:assert/strict";
import * as V from "../video.js";
import { ensureSchema, readVideo, writeVideo, APP_SCHEMA } from "../storage.js";

const mem = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
const proj = (o = {}) => V.newProject("p1", "2026-10-01", { title: "Promo", included: 2, fee: 50000, currency: "KRW", ...o });

test("timecodes parse and format", () => {
  assert.equal(V.parseTimecode("1:24"), 84);
  assert.equal(V.parseTimecode("01:02:03"), 3723);
  assert.equal(V.parseTimecode(""), null);
  assert.ok(Number.isNaN(V.parseTimecode("1:75")));
  assert.ok(Number.isNaN(V.parseTimecode("abc")));
  assert.ok(Number.isNaN(V.parseTimecode("1:2")));
  assert.equal(V.formatTimecode(84), "01:24");
  assert.equal(V.formatTimecode(3723), "1:02:03");
  assert.equal(V.formatTimecode(null), "");
});

test("the first request opens round 1, and requests sort by timecode", () => {
  let p = proj();
  p = V.addRequest(p, { tc: "2:00", text: "Cut the intro", by: "Mina" }, "a", "2026-10-02").project;
  p = V.addRequest(p, { tc: "0:10", text: "Louder music", by: "Mina" }, "b", "2026-10-02").project;
  p = V.addRequest(p, { tc: "", text: "Overall colour is too warm", by: "" }, "c", "2026-10-02").project;
  assert.equal(p.rounds, 1);
  assert.equal(p.status, "revising");
  assert.deepEqual(V.requestsOf(p, 1).map((r) => r.id), ["b", "a", "c"]);
  assert.equal(V.openCount(p), 3);
  p = V.toggleRequest(p, "b");
  assert.equal(V.openCount(p), 2);
  p = V.removeRequest(p, "a");
  assert.equal(p.requests.length, 2);
});

test("bad requests are rejected without changing the project", () => {
  const p = proj();
  assert.equal(V.addRequest(p, { tc: "9:99", text: "x" }, "a", "2026-10-02").error, "tc");
  assert.equal(V.addRequest(p, { tc: "0:10", text: "   " }, "a", "2026-10-02").error, "text");
  assert.equal(p.requests.length, 0);
  assert.equal(p.rounds, 0);
});

test("extra rounds are billed once", () => {
  let p = proj();
  for (let i = 0; i < 4; i++) p = V.addRound(p);
  assert.equal(V.extraRounds(p), 2);
  assert.equal(V.extraCost(p), 100000);
  const label = (n) => `Round ${n}`;
  const a = V.billExtra(p, label);
  assert.deepEqual(a.items, [{ desc: "Round 3", qty: 1, price: 50000 }, { desc: "Round 4", qty: 1, price: 50000 }]);
  assert.equal(V.unbilledRounds(a.project), 0);
  assert.equal(V.billExtra(a.project, label).items.length, 0);
  // a fifth round later bills only itself
  const b = V.billExtra(V.addRound(a.project), label);
  assert.deepEqual(b.items.map((i) => i.desc), ["Round 5"]);
  assert.equal(V.unbilledRounds(V.resetBilled(b.project)), 3);
});

test("rounds within the included count cost nothing", () => {
  let p = proj({ included: 3 });
  p = V.addRound(V.addRound(p));
  assert.equal(V.extraRounds(p), 0);
  assert.equal(V.billExtra(p, String).items.length, 0);
});

test("deliveries only accept web links, and approval changes status", () => {
  let p = proj();
  assert.equal(V.addDelivery(p, { label: "v1", url: "javascript:alert(1)" }, "d", "2026-10-03").error, "url");
  assert.equal(V.addDelivery(p, { label: "v1", url: "not a url" }, "d", "2026-10-03").error, "url");
  p = V.addDelivery(p, { label: "", url: "https://example.com/f/abc" }, "d1", "2026-10-03").project;
  assert.equal(p.deliveries[0].label, "v1");
  assert.equal(p.status, "review");
  p = V.addDelivery(p, { label: "final", url: "https://example.com/f/def" }, "d2", "2026-10-04").project;
  p = V.markFinal(p, "d2");
  assert.deepEqual(p.deliveries.map((d) => d.final), [false, true]);
  p = V.approve(p, "Mina", "2026-10-05");
  assert.equal(p.status, "approved");
  assert.equal(p.approval.by, "Mina");
  // a new change request after approval reopens the project
  p = V.addRequest(p, { tc: "0:05", text: "One more thing" }, "r", "2026-10-06").project;
  assert.equal(p.status, "revising");
  assert.equal(p.approval, null);
});

test("late means past the due date and not approved", () => {
  assert.equal(V.isLate(proj({ due: "2026-10-01" }), "2026-10-02"), true);
  assert.equal(V.isLate(proj({ due: "2026-10-01", status: "approved" }), "2026-10-02"), false);
  assert.equal(V.isLate(proj({ due: "" }), "2026-10-02"), false);
});

test("export rows and text", () => {
  let p = proj({ title: "Promo", client: "Acme" });
  p = V.addRequest(p, { tc: "0:10", text: "Louder, please", by: "Mina" }, "a", "2026-10-02").project;
  const rows = V.toRows(p, { round: "Round", tc: "Time", text: "Change", by: "By", date: "Date", done: "Done" });
  assert.deepEqual(rows[1], ["1", "00:10", "Louder, please", "Mina", "2026-10-02", "0"]);
  assert.match(V.toText(p, { roundTitle: (n) => `Round ${n}` }), /\[ \] 00:10 {2}Louder, please \(Mina\)/);
});

test("csv export neutralises spreadsheet formulas", () => {
  const p = V.addRequest(proj(), { tc: "0:10", text: "=HYPERLINK(\"http://x\")", by: "@me" }, "a", "2026-10-02").project;
  const row = V.toRows(p, { round: "r", tc: "t", text: "x", by: "b", date: "d", done: "n" })[1];
  assert.equal(row[2][0], "'");
  assert.equal(row[3], "'@me");
});

test("validProject accepts our own output and rejects junk", () => {
  let p = V.addRequest(proj(), { tc: "0:10", text: "x" }, "a", "2026-10-02").project;
  assert.equal(V.validProject(p), true);
  assert.equal(V.validProject({ ...p, status: "lol" }), false);
  assert.equal(V.validProject({ ...p, currency: "usd" }), false);
  assert.equal(V.validProject({ ...p, deliveries: [{ id: "x", url: "javascript:1" }] }), false);
  assert.equal(V.validProject(null), false);
});

test("upgrading from schema 1 copies the old data aside and keeps it", () => {
  const ls = mem({ "qb.invoices": '[{"id":"1"}]', "qb.sheets": "[]" });
  const r = ensureSchema(ls);
  assert.deepEqual(r, { schema: APP_SCHEMA, locked: false });
  assert.equal(ls.getItem("qb.invoices"), '[{"id":"1"}]');
  assert.equal(ls.getItem("qb.invoices.bak-v1"), '[{"id":"1"}]');
  assert.equal(ls.getItem("qb.docs.bak-v1"), null);
  // second run changes nothing
  ls.setItem("qb.invoices", '[{"id":"2"}]');
  ensureSchema(ls);
  assert.equal(ls.getItem("qb.invoices.bak-v1"), '[{"id":"1"}]');
});

test("data from a newer schema is locked, not overwritten", () => {
  const ls = mem({ "qb.meta": '{"schema":99}' });
  assert.equal(ensureSchema(ls).locked, true);
  assert.equal(ls.getItem("qb.meta"), '{"schema":99}');
});

test("video storage keeps one previous generation and reports newer or broken data", () => {
  const ls = mem();
  assert.deepEqual(readVideo(ls), { projects: [], locked: false });
  writeVideo(ls, [proj()]);
  writeVideo(ls, [proj(), proj({ id: "p2" })]);
  assert.equal(readVideo(ls).projects.length, 2);
  assert.equal(JSON.parse(ls.getItem("qb.video.bak")).projects.length, 1);
  ls.setItem("qb.video", '{"v":5,"projects":[]}');
  assert.equal(readVideo(ls).locked, true);
  ls.setItem("qb.video", "{oops");
  assert.equal(readVideo(ls).broken, true);
});
