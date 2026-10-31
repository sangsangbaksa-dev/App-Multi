import test from "node:test";
import assert from "node:assert/strict";
import { check, configured } from "../api/license.js";
import * as LS from "../license.js";
import { makeLicense as makeKey } from "../logic.js";

const env = { POLAR_ORGANIZATION_ID: "org-1", POLAR_BENEFIT_ID: "ben-1" };
const lk = (status, extra = {}) => ({ status, benefit_id: "ben-1", ...extra });
// Fake Polar: returns whatever `reply` says (with an HTTP status), and records what was sent.
const fake = (reply, status = 200) => { const calls = []; const f = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return { status, json: async () => reply }; }; f.calls = calls; return f; };

test("without env vars the function reports not configured and never calls out", async () => {
  const f = fake({});
  assert.deepEqual((await check({ action: "activate", key: "good-key-0001" }, {}, f)).body, { configured: false });
  assert.equal(f.calls.length, 0);
  assert.equal(configured({ POLAR_ORGANIZATION_ID: "1" }), false);
});

test("a key for our organization and product activates and returns only the instance id", async () => {
  const f = fake({ id: "inst-123456", license_key: { ...lk("granted"), key: "good-key-0001" }, customer: { email: "a@b.c" } });
  const r = await check({ action: "activate", key: "good-key-0001", name: "QuickBill" }, env, f);
  assert.deepEqual(r.body, { configured: true, valid: true, instance: "inst-123456" });
  assert.equal(f.calls[0].url, "https://api.polar.sh/v1/customer-portal/license-keys/activate");
  assert.deepEqual(f.calls[0].body, { key: "good-key-0001", organization_id: "org-1", label: "QuickBill" });
});

test("a key bought for another product is refused", async () => {
  const f = fake({ id: "x", license_key: { status: "granted", benefit_id: "other" } });
  const r = await check({ action: "activate", key: "good-key-0001" }, env, f);
  assert.equal(r.body.valid, false);
  assert.equal(r.body.reason, "product");
});

test("disabled, expired and unknown keys are refused with a reason", async () => {
  for (const [status, reason] of [["disabled", "revoked"], ["revoked", "revoked"]]) {
    const r = await check({ action: "activate", key: "good-key-0001" }, env, fake({ id: "x", license_key: lk(status) }));
    assert.equal(r.body.valid, false); assert.equal(r.body.reason, reason);
  }
  const u = await check({ action: "activate", key: "good-key-0001" }, env, fake({ detail: "Not found" }, 404));
  assert.equal(u.body.reason, "unknown");
  const l = await check({ action: "activate", key: "good-key-0001" }, env, fake({ detail: "Activation limit reached" }, 403));
  assert.equal(l.body.reason, "limit");
});

test("validate confirms a stored key; a refund turns it off", async () => {
  assert.equal((await check({ action: "validate", key: "good-key-0001", instance: "inst-123456" }, env, fake(lk("granted", { activation: { id: "inst-123456" } })))).body.valid, true);
  const r = await check({ action: "validate", key: "good-key-0001" }, env, fake(lk("revoked")));
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
