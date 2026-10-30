import test from "node:test";
import assert from "node:assert/strict";
import { check, configured } from "../api/license.js";
import * as LS from "../license.js";
import { makeLicense as makeKey } from "../logic.js";

const env = { LS_STORE_ID: "10", LS_PRODUCT_ID: "20" };
const meta = { store_id: 10, product_id: 20 };
// Fake Lemon Squeezy: returns whatever `reply` says, and records what was sent.
const fake = (reply) => { const calls = []; const f = async (url, init) => { calls.push({ url, body: new URLSearchParams(init.body) }); return { status: 200, json: async () => reply }; }; f.calls = calls; return f; };

test("without env vars the function reports not configured and never calls out", async () => {
  const f = fake({});
  assert.deepEqual((await check({ action: "activate", key: "good-key-0001" }, {}, f)).body, { configured: false });
  assert.equal(f.calls.length, 0);
  assert.equal(configured({ LS_STORE_ID: "1" }), false);
});

test("a key for our store and product activates and returns only the instance id", async () => {
  const f = fake({ activated: true, license_key: { status: "active" }, instance: { id: "inst-123456" }, meta: { ...meta, customer_email: "a@b.c" } });
  const r = await check({ action: "activate", key: "good-key-0001", name: "QuickBill" }, env, f);
  assert.deepEqual(r.body, { configured: true, valid: true, instance: "inst-123456" });
  assert.equal(f.calls[0].url, "https://api.lemonsqueezy.com/v1/licenses/activate");
  assert.equal(f.calls[0].body.get("license_key"), "good-key-0001");
});

test("a key bought for another product or store is refused", async () => {
  const f = fake({ activated: true, license_key: { status: "active" }, instance: { id: "x" }, meta: { store_id: 10, product_id: 99 } });
  const r = await check({ action: "activate", key: "good-key-0001" }, env, f);
  assert.equal(r.body.valid, false);
  assert.equal(r.body.reason, "product");
});

test("disabled, expired and unknown keys are refused with a reason", async () => {
  for (const [status, reason] of [["disabled", "revoked"], ["expired", "revoked"]]) {
    const r = await check({ action: "activate", key: "good-key-0001" }, env, fake({ activated: true, license_key: { status }, meta }));
    assert.equal(r.body.valid, false); assert.equal(r.body.reason, reason);
  }
  const u = await check({ action: "activate", key: "good-key-0001" }, env, fake({ activated: false, error: "not found" }));
  assert.equal(u.body.reason, "unknown");
  const l = await check({ action: "activate", key: "good-key-0001" }, env, fake({ activated: false, error: "limit", license_key: { status: "active" }, meta }));
  assert.equal(l.body.reason, "limit");
});

test("validate confirms a stored key; a refund turns it off", async () => {
  assert.equal((await check({ action: "validate", key: "good-key-0001", instance: "inst-123456" }, env, fake({ valid: true, license_key: { status: "active" }, meta }))).body.valid, true);
  const r = await check({ action: "validate", key: "good-key-0001" }, env, fake({ valid: false, license_key: { status: "disabled" }, meta }));
  assert.equal(r.body.valid, false); assert.equal(r.body.reason, "revoked");
});

test("malformed input is rejected before any call; upstream failures are 502", async () => {
  const f = fake({});
  assert.equal((await check({ action: "activate", key: "../../etc" }, env, f)).body.reason, "format");
  assert.equal((await check({ action: "activate", key: "" }, env, f)).body.valid, false);
  assert.equal(f.calls.length, 0);
  assert.equal((await check({ action: "nope", key: "good-key-0001" }, env, f)).code, 400);
  const boom = async () => { throw new Error("down"); };
  assert.equal((await check({ action: "activate", key: "good-key-0001" }, env, boom)).code, 502);
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
