/* Small self-contained UI for cloud sync: login form when signed out, status + "Sync now" when signed in.
   Plain DOM, no framework. Text comes from cloud-i18n.js. Copied into each app by shared/sync-copies.js. */
(function (root) {
  'use strict';
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) { if (k === 'class') e.className = attrs[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]); else if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]); }
    [].concat(kids == null ? [] : kids).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  /* opts: cloud (CloudSync instance), lang() -> 'en'|..., toast(msg) optional */
  function build(opts) {
    var cloud = opts.cloud, I = root.CloudI18n, mode = 'in', msg = '', conflict = false, busy = false;
    var box = el('div', { class: 'cloud-panel' });
    var T = function (k, v) { return I.t(opts.lang(), k, v); };
    function say(m, isConflict) { msg = m || ''; conflict = !!isConflict; render(); }
    function report(r) {
      var map = { 'in-sync': 'inSync', pushed: 'pushed', pulled: 'pulled', offline: 'offline', error: 'error' };
      if (r.status === 'conflict') return say(T('conflict'), true);
      if (r.status === 'signed-out') return say('');
      say(map[r.status] ? T(map[r.status]) : '');
    }
    function run(p) { busy = true; render(); return p.then(function (r) { busy = false; report(r); return r; }); }
    function render() {
      var u = cloud.user();
      box.textContent = '';
      box.appendChild(el('h3', {}, T('title')));
      box.appendChild(el('p', { class: 'muted' }, T('note')));
      if (u) {
        var at = cloud.lastSync();
        box.appendChild(el('p', {}, [T('as', { email: u.email }), el('br'), at ? T('last', { time: new Date(at).toLocaleString(opts.lang()) }) : T('never')]));
        var row = el('div', { class: 'row wrap' });
        if (conflict) {
          row.appendChild(el('button', { type: 'button', class: 'ghost', onclick: function () { run(cloud.resolve('cloud')); } }, T('useCloud')));
          row.appendChild(el('button', { type: 'button', class: 'ghost', onclick: function () { run(cloud.resolve('device')); } }, T('useDevice')));
        } else {
          row.appendChild(el('button', { type: 'button', class: 'ghost', disabled: busy ? 'disabled' : null, onclick: function () { run(cloud.sync()); } }, T('syncNow')));
        }
        row.appendChild(el('button', { type: 'button', class: 'ghost', onclick: function () { cloud.signOut().then(function () { say(''); }); } }, T('signOut')));
        box.appendChild(row);
      } else {
        var em = el('input', { type: 'email', required: 'required', autocomplete: 'username', maxlength: '120', 'aria-label': T('email'), placeholder: T('email') });
        var pw = el('input', { type: 'password', required: 'required', autocomplete: mode === 'up' ? 'new-password' : 'current-password', maxlength: '200', 'aria-label': T('pass'), placeholder: T('pass') });
        var form = el('form', { class: 'cloud-form', onsubmit: function (e) {
          e.preventDefault();
          var email = em.value.trim().toLowerCase(), pass = pw.value;
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say(T('errEmail'));
          if (pass.length < 8) return say(T('errShort'));
          busy = true; render();
          (mode === 'up' ? cloud.signUp(email, pass) : cloud.signIn(email, pass)).then(function (r) {
            busy = false;
            if (r && r.confirmed === false) { mode = 'in'; return say(T('confirmSent')); }
            return run(cloud.sync());
          }, function (err) { busy = false; say(T(I.errKey[err && err.code] || 'errBad')); });
        } }, [em, pw,
          el('div', { class: 'row wrap' }, [
            el('button', { type: 'submit', class: 'pri primary', disabled: busy ? 'disabled' : null }, T(mode === 'up' ? 'signUp' : 'signIn')),
            el('button', { type: 'button', class: 'ghost', onclick: function () { mode = mode === 'up' ? 'in' : 'up'; msg = ''; render(); } }, T(mode === 'up' ? 'toIn' : 'toUp'))])]);
        box.appendChild(form);
      }
      box.appendChild(el('p', { class: 'cloud-msg', role: 'status' }, msg));
    }
    cloud.onChange(function () { render(); });
    render();
    return { el: box, render: render, report: report };
  }
  var api = { build: build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CloudPanel = api;
})(typeof window !== 'undefined' ? window : globalThis);
