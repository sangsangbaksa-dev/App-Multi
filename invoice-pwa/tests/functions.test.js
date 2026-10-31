import test from "node:test";
import assert from "node:assert/strict";
import { handle } from "../functions/api/license.js";

const env = { POLAR_ORGANIZATION_ID: "org-1", POLAR_BENEFIT_ID: "ben-1" };
const ls = (reply) => async () => ({ status: 200, json: async () => reply });
const post = (body) => new Request("https://example.test/api/license", { method: "POST", body: JSON.stringify(body) });

test("Pages Function: GET reports whether the license check is configured", async () => {
  assert.deepEqual(await (await handle(new Request("https://example.test/api/license"), {})).json(), { configured: false });
  const r = await handle(new Request("https://example.test/api/license"), env);
  assert.deepEqual(await r.json(), { configured: true });
  assert.equal(r.headers.get("Cache-Control"), "no-store");
});

test("Pages Function: activate accepts our product and refuses another", async () => {
  const ok = await handle(post({ action: "activate", key: "good-key-0001" }), env, ls({ id: "inst-123456", license_key: { status: "granted", benefit_id: "ben-1" } }));
  assert.deepEqual(await ok.json(), { configured: true, valid: true, instance: "inst-123456" });
  const other = await handle(post({ action: "activate", key: "good-key-0001" }), env, ls({ id: "x", license_key: { status: "granted", benefit_id: "other" } }));
  assert.equal((await other.json()).reason, "product");
});

test("Pages Function: bad method, bad body, no env", async () => {
  assert.equal((await handle(new Request("https://example.test/api/license", { method: "DELETE" }), env)).status, 405);
  const junk = await handle(new Request("https://example.test/api/license", { method: "POST", body: "not json" }), env);
  assert.deepEqual(await junk.json(), { configured: true, valid: false, reason: "format" });
  assert.deepEqual(await (await handle(post({ action: "activate", key: "good-key-0001" }), {})).json(), { configured: false });
});
