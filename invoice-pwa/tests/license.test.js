import test from "node:test";
import assert from "node:assert/strict";
import { check, configured, _clearCache } from "../api/license.js";
import * as LS from "../license.js";
import { makeLicense as makeKey } from "../logic.js";

test.beforeEach(_clearCache);
const env = { LEMONSQUEEZY_PRODUCT_ID: "prod-1" };
// Fake Lemon Squeezy: returns whatever `reply` says (with an HTTP status), and records what was sent (form body).
const fake = (reply, status = 200) => { const calls = []; const f = async (url, init) => { calls.push({ url, body: Object.fromEntries(new URLSearchParams(init.body)) }); return { status, json: async () => reply }; }; f.calls = calls; return f; };
const ok = (purchase = {}) => ({ valid: true, license_key: { status: purchase.status || 'active' }, meta: { product_id: 'prod-1' } });

test("when disabled the function reports not configured and never calls out", async () => {
  const f = fake({});
  assert.deepEqual((await check({ action: "activate", key: "good-key-0001" }, { LEMONSQUEEZY_DISABLED: "1" }, f)).body, { configured: false });
  assert.equal(f.calls.length, 0);
  assert.equal(configured({ LEMONSQUEEZY_DISABLED: "1" }), false);
});

test("a valid key activates and the server sends only the key", async () => {
  const f = fake(ok());
  const r = await check({ action: "activate", key: "good-key-0001", name: "QuickBill" }, env, f);
  assert.deepEqual(r.body, { configured: true, valid: true, instance: "" });
  assert.equal(f.calls[0].url, "https://api.lemonsqueezy.com/v1/licenses/validate");
  assert.deepEqual(f.calls[0].body, { license_key: "good-key-0001" });
});

test("unknown keys are refused; refunded and charged-back purchases are refused with a reason", async () => {
  const u = await check({ action: "activate", key: "good-key-0001" }, env, fake({ valid: false, error: 'license_key not found' }, 404));
  assert.equal(u.body.valid, false); assert.equal(u.body.reason, "unknown");
  for (const p of [{ status: 'disabled' }, { status: 'expired' }]) {
    const r = await check({ action: "validate", key: "good-key-0001" }, env, fake(ok(p)));
    assert.equal(r.body.valid, false); assert.equal(r.body.reason, "revoked");
  }
});

test("validate confirms a stored key", async () => {
  assert.equal((await check({ action: "validate", key: "good-key-0001", instance: "" }, env, fake(ok()))).body.valid, true);
});

test("malformed input is rejected before any call; upstream failures are 502", async () => {
  const f = fake({});
  assert.equal((await check({ action: "activate", key: "../../etc" }, env, f)).body.reason, "format");
  assert.equal((await check({ action: "activate", key: "" }, env, f)).body.valid, false);
  assert.equal(f.calls.length, 0);
  assert.equal((await check({ action: "nope", key: "good-key-0001" }, env, f)).code, 400);
  const boom = async () => { throw new Error("down"); };
  assert.equal((await check({ action: "activate", key: "good-key-0001" }, env, boom)).code, 502);
  assert.equal((await check({ action: "activate", key: "good-key-0001" }, env, fake({}, 503))).code, 502);
});

// ---- browser side ----
const reply = (json, ok = true) => async () => ({ ok, json: async () => json });
const router = (routes) => async (url, init) => (routes[init?.method === "POST" ? "post" : "get"])(url, init);

test("not configured: offline-format keys still activate, others do not", async () => {
  const fetchImpl = reply({ configured: false });
  const good = await LS.activate(makeKey("AB12", "CD34"), { fetchImpl, api: "/api/license" });
  assert.equal(good.ok, true); assert.equal(good.record, null);
  assert.equal((await LS.activate("PRO-AAAA-BBBB-CCCC", { fetchImpl, api: "/api/license" })).ok, false);
});

test("no function reachable (network error): behaves like not configured", async () => {
  const fetchImpl = async () => { throw new Error("offline"); };
  assert.equal((await LS.activate(makeKey("AB12", "CD34"), { fetchImpl, api: "/api/license" })).ok, true);
});

test("configured: the server decides, offline keys are refused", async () => {
  const fetchImpl = router({
    get: reply({ configured: true }),
    post: async (_u, init) => ({ ok: true, json: async () => (JSON.parse(init.body).key === "good-key-0001" ? { valid: true, instance: "inst-1" } : { valid: false, reason: "unknown" }) }),
  });
  const ok = await LS.activate("good-key-0001", { fetchImpl, api: "/api/license", now: 5 });
  assert.deepEqual(ok.record, { key: "good-key-0001", instance: "inst-1", checkedAt: 5 });
  assert.equal((await LS.activate(makeKey("AB12", "CD34"), { fetchImpl, api: "/api/license" })).ok, false);
});

test("proStatus: server record wins; offline keys count only while the server is off", () => {
  const k = makeKey("AB12", "CD34");
  assert.equal(LS.proStatus(k, null, false), true);
  assert.equal(LS.proStatus(k, null, true), false);
  assert.equal(LS.proStatus("good-key-0001", { key: "good-key-0001" }, true), true);
  assert.equal(LS.proStatus("other", { key: "good-key-0001" }, true), false);
});

test("recheck: only a clear refusal removes Pro", async () => {
  const rec = { key: "good-key-0001", instance: "inst-1", checkedAt: 0 };
  const opts = (fetchImpl) => ({ fetchImpl, api: "/api/license", now: 99 });
  assert.equal(LS.needsRecheck(rec, LS.RECHECK_MS + 1), true);
  assert.equal(LS.needsRecheck({ ...rec, checkedAt: 10 }, 20), false);
  assert.deepEqual(await LS.recheck(rec, opts(reply({ valid: true }))), { keep: true, record: { ...rec, checkedAt: 99 } });
  assert.deepEqual(await LS.recheck(rec, opts(reply({ valid: false, reason: "revoked" }))), { keep: false });
  assert.equal((await LS.recheck(rec, opts(async () => { throw new Error("offline"); }))).keep, true);
  assert.equal((await LS.recheck(rec, opts(reply({}, false)))).keep, true);
  assert.equal((await LS.recheck(rec, opts(reply({ configured: false })))).keep, true);
  assert.equal((await LS.recheck(rec, opts(reply({ valid: false, reason: "format" })))).keep, true);
});

test("rate limit: one retry after Retry-After, then a 429 (never 'invalid'); verdicts are cached", async () => {
  const mk = (statuses) => { let i = 0; const f = async () => { const st = statuses[Math.min(i++, statuses.length - 1)]; f.n = i; return st === 429 ? { status: 429, headers: { get: () => "0" }, json: async () => ({}) } : { status: 200, headers: { get: () => null }, json: async () => ok() }; }; return f; };
  const a = mk([429, 200]);
  assert.equal((await check({ action: "validate", key: "good-key-0001" }, env, a)).body.valid, true);
  assert.equal(a.n, 2);
  const b = mk([429]);
  const r = await check({ action: "validate", key: "good-key-0002" }, env, b);
  assert.equal(r.code, 429); assert.equal(r.body.error, "rate_limited"); assert.equal(b.n, 2);
  const again = await check({ action: "validate", key: "good-key-0001" }, env, a);
  assert.equal(again.body.valid, true); assert.equal(a.n, 2); // served from cache
});
