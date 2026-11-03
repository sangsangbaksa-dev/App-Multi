/* Paid-app licence check. Pure logic with injected fetch, storage and clock so Node tests can run it.
   The server answers { configured: false } until LEMONSQUEEZY_PRODUCT_ID is set; then the app stays locked until a key is activated.
   Offline, the last known answer is used, so a paying user is not locked out by a network problem. */
(function (root) {
  'use strict';
  var DAY = 864e5, RECHECK_MS = 7 * DAY, KEY = 'marginlog:license', GATE = 'marginlog:gate';
  function readRec(store) { try { return JSON.parse(store.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function writeRec(store, rec) { try { if (rec) store.setItem(KEY, JSON.stringify(rec)); else store.removeItem(KEY); } catch (e) { /* storage off */ } }
  function readGate(store) { try { return store.getItem(GATE) === '1'; } catch (e) { return false; } }
  function writeGate(store, on) { try { store.setItem(GATE, on ? '1' : '0'); } catch (e) { /* optional */ } }
  async function post(fetchImpl, api, body) {
    var r = await fetchImpl(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { var err = new Error('http ' + r.status); err.status = r.status; throw err; }
    return r.json();
  }
  /* true = paid access enforced, false = launch mode, null = could not tell */
  async function gateOn(fetchImpl, api) {
    try { var r = await fetchImpl(api, { cache: 'no-store' }); if (!r.ok) return null; return !!(await r.json()).configured; }
    catch (e) { return null; }
  }
  /* resolves { locked } */
  async function status(o) {
    var store = o.store, now = o.now || Date.now(), rec = readRec(store), gate = await gateOn(o.fetch, o.api);
    if (gate === null) return { locked: readGate(store) && !(rec && rec.key) };
    writeGate(store, gate);
    if (!gate) return { locked: false };
    if (!rec || !rec.key) return { locked: true };
    if (now - (rec.checkedAt || 0) > RECHECK_MS) {
      try {
        var r = await post(o.fetch, o.api, { key: rec.key });
        if (r.configured && r.valid === false) { writeRec(store, null); return { locked: true }; }
        if (r.valid === true) { rec.checkedAt = now; writeRec(store, rec); }
      } catch (e) { /* could not ask: keep the licence */ }
    }
    return { locked: false };
  }
  /* resolves { ok, reason? } where reason is 'invalid' or 'network' */
  async function activate(o) {
    var key = String(o.key || '').trim(), now = o.now || Date.now();
    try {
      var r = await post(o.fetch, o.api, { key: key });
      if (r.configured === false) return { ok: true };
      if (r.valid === true) { writeRec(o.store, { key: key, checkedAt: now }); writeGate(o.store, true); return { ok: true }; }
      return { ok: false, reason: 'invalid' };
    } catch (e) { return { ok: false, reason: e.status === 400 ? 'invalid' : 'network' }; }
  }
  var api = { status: status, activate: activate, KEY: KEY, RECHECK_MS: RECHECK_MS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MLLicense = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
