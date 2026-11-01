/* Optional Supabase login + backup/sync. Zero dependencies: plain fetch against GoTrue (/auth/v1) and PostgREST (/rest/v1).
   Local-first: the app never needs this file to work. With no url/anonKey in config, enabled() is false and nothing is sent.
   The same file is copied into invoice-pwa/, stampbook/app/ and stayline/app/ (test/cloud-sync.test.js checks the copies match;
   edit shared/cloud-sync.js and run `node shared/sync-copies.js`).

   Data model: one JSON snapshot per (user, app) in public.app_snapshots, protected by Row Level Security.
   Conflicts: every write carries the revision it was based on; the server only accepts it if that revision is still current. */
(function (root) {
  'use strict';
  var TABLE = 'app_snapshots';

  /* Stable string for hashing: object keys sorted, so key order never makes data look changed. */
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  }
  function hash(v) { /* FNV-1a 32-bit over the stable string, plus length: a change detector, not security */
    var s = stable(v), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16) + '.' + s.length;
  }

  /* What should a sync do? Pure function so it can be tested without a network.
     remote: null | {revision, hash}; meta: null | {revision, hash} from the last successful sync; localHash: hash of the data now. */
  function decide(remote, meta, localHash, localEmpty) {
    if (!remote) return 'push-new';
    if (remote.hash === localHash) return 'in-sync';
    if (!meta && localEmpty) return 'pull'; /* a fresh device with nothing on it just takes the cloud copy */
    if (meta && meta.revision === remote.revision) return meta.hash === localHash ? 'in-sync' : 'push';
    if (meta && meta.hash === localHash) return 'pull';
    return 'conflict';
  }

  function CloudError(code, status) { var e = new Error(code); e.code = code; e.status = status || 0; return e; }

  function create(opts) {
    var url = String(opts.url || '').replace(/\/+$/, ''), key = opts.anonKey || '', app = opts.app, store = opts.storage;
    var doFetch = opts.fetch || (typeof fetch === 'function' ? fetch.bind(root) : null);
    var now = opts.now || function () { return Date.now(); };
    var SK = 'cloud.session.' + app, MK = 'cloud.meta.' + app;
    var listeners = [];

    function enabled() { return /^https:\/\/[^\s/]+$/.test(url) && key.length > 20 && !!doFetch; }
    function read(k) { try { return JSON.parse(store.getItem(k)); } catch (e) { return null; } }
    function write(k, v) { try { if (v == null) store.removeItem(k); else store.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function emit() { listeners.forEach(function (f) { try { f(user()); } catch (e) {} }); }
    function user() { var s = read(SK); return s && s.email ? { email: s.email } : null; }

    function call(path, init, token) {
      var headers = { apikey: key, 'content-type': 'application/json' };
      headers.authorization = 'Bearer ' + (token || key);
      for (var h in (init.headers || {})) headers[h] = init.headers[h];
      return doFetch(url + path, { method: init.method || 'GET', headers: headers, body: init.body == null ? undefined : JSON.stringify(init.body) }).then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
          return { ok: r.ok, status: r.status, json: j };
        });
      }, function () { throw CloudError('network'); });
    }

    function saveSession(j, email) {
      var s = { access: j.access_token, refresh: j.refresh_token, exp: now() + (Number(j.expires_in) || 3600) * 1000, email: email || (j.user && j.user.email) || '', uid: j.user && j.user.id };
      write(SK, s); return s;
    }
    function authError(r) {
      var m = String((r.json && (r.json.msg || r.json.error_description || r.json.message || r.json.error_code)) || '').toLowerCase();
      if (/already|registered/.test(m)) return CloudError('exists', r.status);
      if (/confirm/.test(m)) return CloudError('confirm', r.status);
      if (/invalid login|credentials/.test(m)) return CloudError('bad', r.status);
      if (/password/.test(m)) return CloudError('short', r.status);
      if (/email/.test(m)) return CloudError('email', r.status);
      if (r.status === 429) return CloudError('rate', 429);
      return CloudError('bad', r.status);
    }

    function signUp(email, password) {
      return call('/auth/v1/signup', { method: 'POST', body: { email: email, password: password } }).then(function (r) {
        if (!r.ok) throw authError(r);
        if (r.json && r.json.access_token) { saveSession(r.json, email); emit(); return { email: email, confirmed: true }; }
        /* the project requires email confirmation: no session until the link in the mail is opened */
        if (r.json && r.json.user && Array.isArray(r.json.user.identities) && !r.json.user.identities.length) throw CloudError('exists');
        return { email: email, confirmed: false };
      });
    }
    function signIn(email, password) {
      return call('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email, password: password } }).then(function (r) {
        if (!r.ok) throw authError(r);
        saveSession(r.json, email); emit(); return { email: email };
      });
    }
    function signOut() {
      var s = read(SK); write(SK, null); write(MK, null); emit();
      if (s && s.access) return call('/auth/v1/logout?scope=local', { method: 'POST' }, s.access).then(function () {}, function () {});
      return Promise.resolve();
    }
    /* a valid access token, refreshing it when it is about to expire; null (and signed out) when the refresh is refused */
    function token() {
      var s = read(SK); if (!s) return Promise.resolve(null);
      if (s.exp - now() > 60000) return Promise.resolve(s.access);
      return call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh } }).then(function (r) {
        if (!r.ok) { if (r.status >= 400 && r.status < 500) { write(SK, null); emit(); } return null; }
        return saveSession(r.json, s.email).access;
      });
    }

    var sel = '?app=eq.' + encodeURIComponent(app) + '&select=data,revision,updated_at';
    function fetchRemote(tk) {
      return call('/rest/v1/' + TABLE + sel, {}, tk).then(function (r) {
        if (!r.ok) throw CloudError('server', r.status);
        var row = Array.isArray(r.json) ? r.json[0] : null;
        return row ? { data: row.data, revision: row.revision, updatedAt: row.updated_at, hash: hash(row.data) } : null;
      });
    }
    function pushRow(tk, data, baseRevision) {
      var dev = opts.device || '';
      if (baseRevision == null) { /* first upload; the primary key rejects it if another device got there first */
        return call('/rest/v1/' + TABLE, { method: 'POST', headers: { prefer: 'return=representation' }, body: { app: app, data: data, device: dev } }, tk).then(function (r) {
          if (r.status === 409) throw CloudError('conflict', 409);
          if (!r.ok) throw CloudError('server', r.status);
          return r.json[0].revision;
        });
      }
      /* compare-and-set: matches only while the server still has the revision this device last saw */
      return call('/rest/v1/' + TABLE + '?app=eq.' + encodeURIComponent(app) + '&revision=eq.' + baseRevision,
        { method: 'PATCH', headers: { prefer: 'return=representation' }, body: { data: data, revision: baseRevision + 1, device: dev } }, tk).then(function (r) {
        if (!r.ok) throw CloudError('server', r.status);
        if (!r.json || !r.json.length) throw CloudError('conflict', 409);
        return r.json[0].revision;
      });
    }

    var busy = null;
    /* result.status: 'in-sync' | 'pushed' | 'pulled' | 'conflict' | 'signed-out' | 'offline' | 'error' */
    function sync() {
      if (!enabled()) return Promise.resolve({ status: 'disabled' });
      if (busy) return busy;
      busy = token().then(function (tk) {
        if (!tk) return { status: 'signed-out' };
        var data = opts.snapshot(), lh = hash(data), meta = read(MK);
        return fetchRemote(tk).then(function (remote) {
          var act = decide(remote, meta, lh, !!(opts.isEmpty && opts.isEmpty(data)));
          if (act === 'in-sync') { if (remote) write(MK, { revision: remote.revision, hash: remote.hash, at: now() }); return { status: 'in-sync' }; }
          if (act === 'pull') { write(MK, { revision: remote.revision, hash: remote.hash, at: now() }); opts.apply(remote.data); return { status: 'pulled' }; }
          if (act === 'conflict') return { status: 'conflict', remote: { updatedAt: remote.updatedAt } };
          return pushRow(tk, data, act === 'push' ? remote.revision : null).then(function (rev) {
            write(MK, { revision: rev, hash: lh, at: now() }); return { status: 'pushed' };
          });
        });
      }).then(function (x) { busy = null; return x; }, function (e) {
        busy = null;
        if (e && e.code === 'conflict') return { status: 'conflict', remote: {} };
        return { status: e && e.code === 'network' ? 'offline' : 'error', code: e && e.code };
      });
      return busy;
    }
    /* Both sides changed: the user picks. 'device' overwrites the cloud copy, 'cloud' replaces this device's data. */
    function resolve(choice) {
      return token().then(function (tk) {
        if (!tk) return { status: 'signed-out' };
        return fetchRemote(tk).then(function (remote) {
          if (choice === 'cloud') {
            if (!remote) return { status: 'in-sync' };
            write(MK, { revision: remote.revision, hash: remote.hash, at: now() }); opts.apply(remote.data); return { status: 'pulled' };
          }
          var data = opts.snapshot(), lh = hash(data);
          return pushRow(tk, data, remote ? remote.revision : null).then(function (rev) { write(MK, { revision: rev, hash: lh, at: now() }); return { status: 'pushed' }; });
        });
      }).then(null, function (e) { return { status: e && e.code === 'network' ? 'offline' : 'error', code: e && e.code }; });
    }
    function lastSync() { var m = read(MK); return m && m.at ? m.at : 0; }
    /* debounced auto-sync after local edits; does nothing unless signed in */
    var timer = null;
    function changed(delay) {
      if (!enabled() || !user()) return;
      var set = opts.setTimeout || root.setTimeout, clear = opts.clearTimeout || root.clearTimeout;
      if (timer) clear(timer);
      timer = set(function () { timer = null; sync().then(function (r) { if (opts.onResult) opts.onResult(r); }); }, delay == null ? 4000 : delay);
    }

    return { enabled: enabled, user: user, signUp: signUp, signIn: signIn, signOut: signOut, sync: sync, resolve: resolve, lastSync: lastSync, changed: changed,
      onChange: function (f) { listeners.push(f); } };
  }

  var api = { create: create, decide: decide, hash: hash, stable: stable };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.CloudSync = api; }
})(typeof window !== 'undefined' ? window : globalThis);
