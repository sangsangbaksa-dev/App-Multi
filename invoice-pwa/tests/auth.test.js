import test from "node:test";
import assert from "node:assert/strict";
import { AuthError, createAuth, localBackend } from "../auth.js";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
};
const code = (p) => p.then(() => null, (e) => (e instanceof AuthError ? e.code : e));

test("sign up stores a salted hash, starts a session, and normalises the email", async () => {
  const s = memory();
  const a = createAuth(localBackend(s));
  assert.equal(await a.init(), null);
  const u = await a.signUp("  Me@Example.COM ", "correct horse");
  assert.deepEqual(u, { email: "me@example.com" });
  const stored = JSON.parse(s.getItem("qb.accounts"))["me@example.com"];
  assert.ok(stored.salt && stored.hash && !JSON.stringify(stored).includes("correct horse"));
});

test("sign up rejects bad email, short password and duplicates", async () => {
  const a = createAuth(localBackend(memory()));
  assert.equal(await code(a.signUp("nope", "12345678")), "email");
  assert.equal(await code(a.signUp("a@b.co", "short")), "short");
  await a.signUp("a@b.co", "12345678");
  assert.equal(await code(a.signUp("A@B.co", "another-one")), "exists");
});

test("sign in checks the password; sign out ends the session and survives a reload", async () => {
  const s = memory();
  const a = createAuth(localBackend(s));
  await a.signUp("a@b.co", "12345678");
  await a.signOut();
  assert.equal(a.user, null);
  assert.equal(await code(a.signIn("a@b.co", "wrong-pass")), "bad");
  assert.equal(await code(a.signIn("nobody@b.co", "12345678")), "bad");
  await a.signIn("a@b.co", "12345678");
  const reloaded = createAuth(localBackend(s));
  assert.deepEqual(await reloaded.init(), { email: "a@b.co" });
  await reloaded.signOut();
  assert.equal(await createAuth(localBackend(s)).init(), null);
});

test("listeners hear every change, and a dangling session is ignored", async () => {
  const s = memory();
  const a = createAuth(localBackend(s));
  const seen = [];
  a.onChange((u) => seen.push(u && u.email));
  await a.signUp("x@y.io", "12345678");
  await a.signOut();
  assert.deepEqual(seen, ["x@y.io", null]);
  s.setItem("qb.session", JSON.stringify({ email: "ghost@y.io" }));
  assert.equal(await createAuth(localBackend(s)).init(), null);
});
