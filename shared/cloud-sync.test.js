const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const Cloud = require('./cloud-sync.js');
const { fakeServer, URL_, KEY } = require('./fake-supabase.js');

const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
function device(srv, shared, name) {
  const d = { data: shared, applied: 0, store: mem() };
  d.cloud = Cloud.create({ url: URL_, anonKey: KEY, app: 'stampbook', storage: d.store, fetch: srv.fn, device: name, snapshot: () => d.data, apply: (x) => { d.data = x; d.applied++; } });
  return d;
}

test('hash ignores key order and detects changes', () => {
  assert.equal(Cloud.hash({ a: 1, b: [1, { c: 2, d: 3 }] }), Cloud.hash({ b: [1, { d: 3, c: 2 }], a: 1 }));
  assert.notEqual(Cloud.hash({ a: 1 }), Cloud.hash({ a: 2 }));
});

test('decide covers every case', () => {
  const r = { revision: 3, hash: 'R' };
  assert.equal(Cloud.decide(null, null, 'L'), 'push-new');
  assert.equal(Cloud.decide(r, null, 'R'), 'in-sync');
  assert.equal(Cloud.decide(r, { revision: 3, hash: 'old' }, 'L'), 'push');
  assert.equal(Cloud.decide(r, { revision: 2, hash: 'L' }, 'L'), 'pull');
  assert.equal(Cloud.decide(r, { revision: 2, hash: 'old' }, 'L'), 'conflict');
  assert.equal(Cloud.decide(r, null, 'L'), 'conflict');
  assert.equal(Cloud.decide(r, null, 'L', true), 'pull');
  assert.equal(Cloud.decide(r, { revision: 2, hash: 'old' }, 'L', true), 'conflict');
  assert.equal(Cloud.decide(null, null, 'L', true), 'push-new');
});

test('disabled without config: nothing is sent', async () => {
  let calls = 0;
  const c = Cloud.create({ url: '', anonKey: '', app: 'x', storage: mem(), fetch: () => { calls++; }, snapshot: () => ({}), apply() {} });
  assert.equal(c.enabled(), false);
  assert.equal((await c.sync()).status, 'disabled');
  assert.equal(calls, 0);
});

test('rejects non-https project URLs', () => {
  assert.equal(Cloud.create({ url: 'http://evil.test', anonKey: KEY, app: 'x', storage: mem(), fetch() {}, snapshot() {}, apply() {} }).enabled(), false);
});

test('sign up, sign in, sign out, errors', async () => {
  const srv = fakeServer(), d = device(srv, { v: 1 });
  assert.equal((await d.cloud.sync()).status, 'signed-out');
  await assert.rejects(d.cloud.signUp('a@b.co', '123'), { code: 'short' });
  assert.deepEqual(await d.cloud.signUp('a@b.co', 'secret123'), { email: 'a@b.co', confirmed: true });
  assert.equal(d.cloud.user().email, 'a@b.co');
  await d.cloud.signOut(); assert.equal(d.cloud.user(), null);
  await assert.rejects(d.cloud.signIn('a@b.co', 'wrong'), { code: 'bad' });
  await assert.rejects(d.cloud.signUp('a@b.co', 'secret123'), { code: 'exists' });
  await d.cloud.signIn('a@b.co', 'secret123'); assert.equal(d.cloud.user().email, 'a@b.co');
  srv.setConfirm(true);
  assert.equal((await device(srv, {}).cloud.signUp('n@b.co', 'secret123')).confirmed, false);
});

test('two devices: push, pull, in-sync, conflict, resolve both ways', async () => {
  const srv = fakeServer();
  const A = device(srv, { packs: [1] }, 'A'), B = device(srv, { packs: [] }, 'B');
  await A.cloud.signUp('a@b.co', 'secret123'); await B.cloud.signIn('a@b.co', 'secret123').catch(() => {});
  await B.cloud.signIn('a@b.co', 'secret123');
  assert.equal((await A.cloud.sync()).status, 'pushed');
  assert.equal((await A.cloud.sync()).status, 'in-sync');
  // B has never synced and has different data: it must ask, not overwrite.
  assert.equal((await B.cloud.sync()).status, 'conflict');
  assert.deepEqual(B.data, { packs: [] });
  assert.equal((await B.cloud.resolve('cloud')).status, 'pulled');
  assert.deepEqual(B.data, { packs: [1] });
  // A edits, B pulls it automatically.
  A.data = { packs: [1, 2] }; assert.equal((await A.cloud.sync()).status, 'pushed');
  assert.equal((await B.cloud.sync()).status, 'pulled'); assert.deepEqual(B.data, { packs: [1, 2] });
  // Both edit: second one to sync gets a conflict instead of silently losing data.
  A.data = { packs: [1, 2, 3] }; B.data = { packs: [1, 2, 'b'] };
  assert.equal((await A.cloud.sync()).status, 'pushed');
  assert.equal((await B.cloud.sync()).status, 'conflict');
  assert.equal((await B.cloud.resolve('device')).status, 'pushed');
  assert.equal(Object.values(srv.rows)[0].data.packs[2], 'b');
  assert.equal((await A.cloud.sync()).status, 'pulled');
});

test('stale revision is refused by the server even if the client is out of date', async () => {
  const srv = fakeServer(), A = device(srv, { n: 1 }), B = device(srv, { n: 1 });
  await A.cloud.signUp('a@b.co', 'secret123'); await B.cloud.signIn('a@b.co', 'secret123');
  await A.cloud.sync(); await B.cloud.sync();
  A.data = { n: 2 }; await A.cloud.sync();
  // B still believes revision 1 and edits: it must not overwrite A's change.
  B.data = { n: 3 }; assert.equal((await B.cloud.sync()).status, 'conflict');
  assert.equal(Object.values(srv.rows)[0].data.n, 2);
});

test('network failure reports offline and keeps data', async () => {
  const srv = fakeServer(), A = device(srv, { n: 1 });
  await A.cloud.signUp('a@b.co', 'secret123');
  const c = Cloud.create({ url: URL_, anonKey: KEY, app: 'stampbook', storage: A.store, fetch: async () => { throw new Error('down'); }, snapshot: () => A.data, apply() { throw new Error('no'); } });
  assert.equal((await c.sync()).status, 'offline');
});

test('copies in the apps are identical to the shared file', () => {
  for (const f of ['cloud-sync.js', 'cloud-i18n.js', 'cloud-panel.js']) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    for (const d of ['invoice-pwa', 'stampbook/app', 'stayline/app'])
      assert.equal(fs.readFileSync(path.join(__dirname, '..', d, f), 'utf8'), src, d + '/' + f);
  }
});

test('every language has every cloud string', () => {
  const I = require('./cloud-i18n.js'), en = Object.keys(I.S.en);
  for (const l of Object.keys(I.S)) assert.deepEqual(Object.keys(I.S[l]).sort(), en.slice().sort(), l);
});

test('a fresh empty device takes the cloud copy without asking', async () => {
  const srv = fakeServer(), A = device(srv, { packs: [1] }), B = device(srv, { packs: [] });
  B.cloud = Cloud.create({ url: URL_, anonKey: KEY, app: 'stampbook', storage: B.store, fetch: srv.fn, snapshot: () => B.data, isEmpty: (s) => !s.packs.length, apply: (x) => { B.data = x; } });
  await A.cloud.signUp('a@b.co', 'secret123'); await A.cloud.sync(); await B.cloud.signIn('a@b.co', 'secret123');
  assert.equal((await B.cloud.sync()).status, 'pulled'); assert.deepEqual(B.data, { packs: [1] });
});
