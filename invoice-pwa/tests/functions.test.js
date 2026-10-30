import test from "node:test";
import assert from "node:assert/strict";
import { handle } from "../functions/api/license.js";

const env = { LS_STORE_ID: "10", LS_PRODUCT_ID: "20" };
const ls = (reply) => async () => ({ status: 200, json: async () => reply });
const post = (body) => new Request("https://example.test/api/license", { method: "POST", body: JSON.stringify(body) });

test("Pages Function: GET reports whether the license check is configured", async () => {
  assert.deepEqual(await (await handle(new Request("https://example.test/api/license"), {})).json(), { configured: false });
  const r = await handle(new Request("https://example.test/api/license"), env);
  assert.deepEqual(await r.json(), { configured: true });
  assert.equal(r.headers.get("Cache-Control"), "no-store");
});

test("Pages Function: activate accepts our product and refuses another", async () => {
  const meta = { store_id: 10, product_id: 20 };
  const ok = await handle(post({ action: "activate", key: "good-key-0001" }), env, ls({ activated: true, license_key: { status: "active" }, instance: { id: "inst-123456" }, meta }));
  assert.deepEqual(await ok.json(), { configured: true, valid: true, instance: "inst-123456" });
  const other = await handle(post({ action: "activate", key: "good-key-0001" }), env, ls({ activated: true, license_key: { status: "active" }, instance: { id: "x" }, meta: { store_id: 10, product_id: 99 } }));
  assert.equal((await other.json()).reason, "product");
});

test("Pages Function: bad method, bad body, no env", async () => {
  assert.equal((await handle(new Request("https://example.test/api/license", { method: "DELETE" }), env)).status, 405);
  const junk = await handle(new Request("https://example.test/api/license", { method: "POST", body: "not json" }), env);
  assert.deepEqual(await junk.json(), { configured: true, valid: false, reason: "format" });
  assert.deepEqual(await (await handle(post({ action: "activate", key: "good-key-0001" }), {})).json(), { configured: false });
});
