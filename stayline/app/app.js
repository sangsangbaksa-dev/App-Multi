(function () {
  'use strict';
  var C = window.SL, I = window.I18N, CFG = window.SL_CONFIG;
  var KEY = 'stayline.v1', root = document.getElementById('root');
  var state = load(), lang = I.pick(state.lang), plan = {}, adding = false, creating = false;

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.trackers)) return s; } catch (e) {}
    return { v: 1, trackers: [], active: '', pro: false, lang: '' };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function T(k, v) { return I.t(lang, k, v); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === 'class') e.className = attrs[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    [].concat(kids == null ? [] : kids).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function toast(msg) {
    var t = h('div', { class: 'toast', role: 'status' }, msg); document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }
  function uid() { return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function fmt(s) {
    try { return new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(C.dn(s) * 86400000)); }
    catch (e) { return s; }
  }
  function current() {
    return state.trackers.filter(function (t) { return t.id === state.active; })[0] || state.trackers[0] || null;
  }
  function download(name, text, type) {
    var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: type })), download: name });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function needPro() { if (state.pro) return false; toast(T('proOnly')); return true; }

  function leftText(n) {
    if (n >= 0) return n === 1 ? T('dayLeft') : T('daysLeft', { n: n });
    return n === -1 ? T('dayOver') : T('daysOver', { n: -n });
  }

  /* ---------- views ---------- */
  function header() {
    var sel = h('select', { 'aria-label': T('lang'), onchange: function () { state.lang = sel.value; lang = sel.value; save(); render(); } },
      I.langs.map(function (l) { return h('option', { value: l, selected: l === lang ? '' : false }, I.L[l].name); }));
    return h('header', null, [h('h1', null, [h('span', { class: 'mark' }, '▸'), T('app')]), sel]);
  }

  function tabs() {
    var cur = current();
    return h('nav', { class: 'tabs' }, state.trackers.map(function (t) {
      return h('button', { class: 'tab' + (cur && t.id === cur.id ? ' on' : ''), onclick: function () { state.active = t.id; plan = {}; save(); render(); } }, t.name || T('namePh'));
    }).concat([h('button', { class: 'tab add', 'aria-label': T('newTracker'), onclick: function () {
      if (!state.pro && state.trackers.length >= CFG.freeLimit) { toast(T('limitMsg', { max: CFG.freeLimit })); return; }
      creating = true; render();
    } }, '+')]));
  }

  function board(tr) {
    var s = C.summary(tr, C.todayStr());
    var big = s.left < 0 ? -s.left : s.left;
    var cells = C.strip(tr, C.todayStr());
    var strip = h('div', { class: 'strip', role: 'img', 'aria-label': T('usedOf', { u: s.used, l: s.rule.limit }) },
      cells.map(function (c) { return h('i', { class: (c.in ? 'in ' : '') + (c.today ? 'now ' : '') + (c.future ? 'fut' : '') }); }));
    return h('section', { class: 'board st-' + s.state }, [
      h('div', { class: 'flap', 'aria-live': 'polite' }, [
        h('div', { class: 'digits' }, String(big).split('').map(function (d) { return h('b', null, d); })),
        h('div', { class: 'unit' }, T(s.left < 0 ? 'unitOver' : 'unitLeft'))
      ]),
      h('div', { class: 'line' }, [h('span', { class: 'chip' }, T('s_' + s.state)), h('span', null, T('usedOf', { u: s.used, l: s.rule.limit }))]),
      strip,
      h('div', { class: 'sub' }, [
        h('span', null, T('from_win', { date: fmt(s.windowFrom) })),
        s.inside ? h('span', null, T('inside')) : null,
        s.freesOn ? h('span', { class: 'free' }, T('freeOn', { date: fmt(s.freesOn) })) : null
      ])
    ]);
  }

  function planner(tr) {
    var start = plan.arrive || C.addDays(C.todayStr(), 1), n = plan.nights || 14, rule = C.cleanRule(tr.rule);
    var out = h('p', { class: 'plan-out', id: 'plan-out', role: 'status' });
    function calc() {
      var a = document.getElementById('p-arrive').value, d = +document.getElementById('p-days').value;
      plan = { arrive: a, nights: d };
      if (!C.validDate(a) || !(d >= 1)) { out.textContent = ''; return; }
      var max = C.maxStay(tr, a, C.todayStr()), msg;
      if (d > rule.limit) msg = T('planNoEarly', { n: d });
      else {
        var e = C.earliestEntry(tr, d, a, C.todayStr());
        msg = max <= 0 ? T('planNone') : T('planMax', { date: fmt(a), n: max, end: fmt(C.addDays(a, max - 1)) });
        if (e === a) msg += ' ' + T('planNow'); else if (e) msg += ' ' + T('planEarly', { n: d, date: fmt(e) });
        else msg += ' ' + T('planNoEarly', { n: d });
      }
      out.textContent = msg;
    }
    var wrap = h('section', { class: 'card' }, [
      h('h2', null, T('planH')),
      h('div', { class: 'grid2' }, [
        h('label', null, [T('arrive'), h('input', { type: 'date', id: 'p-arrive', value: start, oninput: calc })]),
        h('label', null, [T('nights'), h('input', { type: 'number', id: 'p-days', min: 1, max: 366, value: n, inputmode: 'numeric', oninput: calc })])
      ]), out]);
    setTimeout(calc, 0);
    return wrap;
  }

  function tripList(tr) {
    var list = tr.trips.length ? h('ul', { class: 'trips' }, tr.trips.map(function (t) {
      var days = Object.keys(C.stayDays([t], C.todayStr())).length;
      return h('li', null, [
        h('div', null, [
          h('strong', null, t.place || '—'),
          h('span', { class: 'dates' }, fmt(t.from) + ' → ' + (t.to ? fmt(t.to) : T('today')) + ' · ' + days)
        ]),
        h('span', { class: 'rowbtns' }, [
          !t.to ? h('button', { class: 'ghost', onclick: function () { t.to = C.todayStr(); save(); render(); } }, T('leftToday')) : null,
          h('button', { class: 'ghost x', 'aria-label': T('confTrip'), onclick: function () { if (confirm(T('confTrip'))) { C.removeTrip(tr, t.id); save(); render(); } } }, '×')
        ])
      ]);
    })) : h('p', { class: 'muted' }, T('noTrips'));
    return h('section', { class: 'card' }, [
      h('div', { class: 'rowhead' }, [h('h2', null, T('trips')), h('button', { class: 'pri small', onclick: function () { adding = true; render(); } }, '+ ' + T('addTrip'))]),
      list]);
  }

  function tripDialog(tr) {
    var dlg = h('dialog', null), err = h('p', { class: 'err', role: 'alert' });
    var from = h('input', { type: 'date', id: 'f-from', required: '', value: C.todayStr() });
    var to = h('input', { type: 'date', id: 'f-to' });
    var on = h('input', { type: 'checkbox', id: 'f-on', onchange: function () { to.disabled = on.checked; if (on.checked) to.value = ''; } });
    dlg.appendChild(h('form', { method: 'dialog', onsubmit: function (e) {
      e.preventDefault();
      var ok = C.addTrip(tr, { place: document.getElementById('f-place').value, from: from.value, to: on.checked ? '' : to.value });
      if (!ok) { err.textContent = T('badTrip'); return; }
      adding = false; save(); render();
    } }, [
      h('h2', null, T('addTrip')),
      h('label', null, [T('place'), h('input', { id: 'f-place', maxlength: 60 })]),
      h('label', null, [T('from'), from]),
      h('label', null, [T('to'), to]),
      h('label', { class: 'chk' }, [on, T('ongoing')]),
      err,
      h('div', { class: 'row' }, [h('button', { type: 'button', class: 'ghost', onclick: function () { adding = false; render(); } }, T('cancel')), h('button', { type: 'submit', class: 'pri' }, T('save'))])
    ]));
    return dlg;
  }

  function trackerDialog() {
    var dlg = h('dialog', null);
    var sel = h('select', { id: 'f-rule', onchange: sync }, [['schengen', 'r_schengen'], ['tax183', 'r_tax183'], ['custom', 'r_custom'], ['customYear', 'r_customYear']]
      .map(function (o) { return h('option', { value: o[0] }, T(o[1])); }));
    var limit = h('input', { type: 'number', id: 'f-limit', min: 1, max: 366, value: 90 });
    var win = h('input', { type: 'number', id: 'f-win', min: 1, max: 730, value: 180 });
    var custom = h('div', { class: 'grid2', hidden: '' }, [h('label', null, [T('limit'), limit]), h('label', { id: 'f-winl' }, [T('window'), win])]);
    function sync() {
      var v = sel.value; custom.hidden = v.indexOf('custom') !== 0;
      document.getElementById('f-winl').hidden = v !== 'custom';
    }
    dlg.appendChild(h('form', { method: 'dialog', onsubmit: function (e) {
      e.preventDefault();
      var v = sel.value, rule = v === 'schengen' ? C.PRESETS.schengen : v === 'tax183' ? C.PRESETS.tax183
        : v === 'custom' ? { kind: 'rolling', limit: limit.value, window: win.value } : { kind: 'year', limit: limit.value };
      var t = { id: uid(), name: (document.getElementById('f-name').value || '').trim().slice(0, 40) || T('namePh'), rule: C.cleanRule(rule), trips: [] };
      state.trackers.push(t); state.active = t.id; creating = false; save(); render();
    } }, [
      h('h2', null, T('newTracker')),
      h('label', null, [T('trackerName'), h('input', { id: 'f-name', maxlength: 40, placeholder: T('namePh') })]),
      h('label', null, [T('rule'), sel]), custom,
      h('div', { class: 'row' }, [h('button', { type: 'button', class: 'ghost', onclick: function () { creating = false; render(); } }, T('cancel')), h('button', { type: 'submit', class: 'pri' }, T('save'))])
    ]));
    setTimeout(sync, 0);
    return dlg;
  }

  function empty() {
    return h('div', { class: 'empty' }, [
      h('div', { class: 'ghostflap' }, '90'),
      h('h2', null, T('emptyH')), h('p', null, T('emptyB')),
      h('button', { class: 'pri', onclick: function () { creating = true; render(); } }, T('newTracker'))]);
  }

  function footer(tr) {
    var file = h('input', { type: 'file', accept: 'application/json', hidden: '', onchange: function () {
      var f = file.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () {
        try { var s = JSON.parse(r.result); if (!s || !Array.isArray(s.trackers)) throw 0; state = { v: 1, trackers: s.trackers, active: s.active || '', pro: state.pro, lang: state.lang }; save(); render(); toast(T('restored')); }
        catch (e) { toast(T('badFile')); }
      };
      r.readAsText(f);
    } });
    var lic = h('input', { id: 'lic', placeholder: T('licPh'), autocomplete: 'off', spellcheck: 'false' });
    return h('footer', { class: 'foot' }, [
      h('div', { class: 'row wrap' }, [
        h('button', { class: 'ghost', onclick: function () { download('stayline-backup.json', JSON.stringify({ v: 1, trackers: state.trackers, active: state.active }), 'application/json'); toast(T('backupDone')); } }, T('exp')),
        h('button', { class: 'ghost', onclick: function () { file.click(); } }, T('imp')), file,
        h('button', { class: 'ghost', onclick: function () { if (needPro()) return; download('stayline.csv', C.toCsv(state.trackers, C.todayStr()), 'text/csv'); } }, T('csv')),
        h('button', { class: 'ghost', onclick: function () { if (needPro()) return; window.print(); } }, T('print'))
      ]),
      h('div', { class: 'settings' }, state.pro ? h('span', { class: 'chip' }, T('pro') + ' ✓') : [
        h('label', null, [T('lic'), lic]),
        h('button', { class: 'pri', onclick: function () {
          if (C.validKey(lic.value)) { state.pro = true; save(); toast(T('okKey')); render(); } else toast(T('badKey'));
        } }, T('activate')),
        h('a', { class: 'ghost link', href: CFG.checkoutUrl, rel: 'noopener', target: '_blank' }, T('upgrade'))
      ]),
      tr ? h('button', { class: 'ghost danger', onclick: function () {
        if (!confirm(T('confDel'))) return;
        state.trackers = state.trackers.filter(function (t) { return t.id !== tr.id; }); state.active = ''; save(); render();
      } }, T('del')) : null,
      h('p', { class: 'fine' }, T('disclaimer')), h('p', { class: 'fine' }, T('privacy'))
    ]);
  }

  function render() {
    document.documentElement.lang = lang; document.title = T('app');
    var tr = current(), kids = [header()];
    if (!tr) kids.push(h('p', { class: 'tag' }, T('tag')), empty());
    else {
      kids.push(tabs(), board(tr), planner(tr), tripList(tr));
      var pr = h('div', { class: 'printonly' }, [h('h1', null, T('printTitle') + ' — ' + tr.name)]);
      kids.push(pr);
    }
    kids.push(footer(tr));
    root.replaceChildren.apply(root, kids);
    if (adding && tr) { var d = tripDialog(tr); root.appendChild(d); d.showModal(); }
    if (creating) { var d2 = trackerDialog(); root.appendChild(d2); d2.showModal(); }
  }
  render();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
