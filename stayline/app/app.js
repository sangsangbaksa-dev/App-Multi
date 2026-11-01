(function () {
  'use strict';
  var C = window.SL, I = window.I18N, CFG = window.SL_CONFIG;
  var KEY = 'stayline.v1', root = document.getElementById('root');
  var state = load(), lang = I.pick(state.lang), plan = {}, adding = false, creating = false, editing = '', editCounter = false, upsell = false, pasting = false, calMonth = '';

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.trackers)) { s.trackers = C.sanitize(s.trackers); return s; } } catch (e) {}
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
  function toast(msg, undo) {
    var t = h('div', { class: 'toast', role: 'status' }, msg); document.body.appendChild(t);
    if (undo) t.appendChild(h('button', { class: 'ghost small tundo', onclick: function () { t.remove(); undo(); } }, T('undo')));
    setTimeout(function () { t.remove(); }, undo ? 6000 : 2200);
  }
  /* snapshot before a destructive change; the toast offers to put it back */
  function undoable(msg, change) {
    var snap = JSON.stringify({ t: state.trackers, a: state.active });
    change();
    toast(msg, function () { var s = JSON.parse(snap); state.trackers = C.sanitize(s.t); state.active = s.a; save(); render(); toast(T('undone')); });
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
    var a = h('a', { href: URL.createObjectURL(new Blob([type === 'text/csv' ? '\uFEFF' + text : text], { type: type })), download: name });
    document.body.appendChild(a); a.click(); a.remove();
  }
  /* Pro key check. If the server function is configured it decides; if it is absent (404) or not configured,
     fall back to the built-in offline check. A network failure never unlocks anything. */
  function verifyKey(key) {
    if (!key) return Promise.resolve('bad');
    return fetch(CFG.licenseApi, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: key }) })
      .then(function (r) { return r.ok ? r.json() : { configured: false }; })
      .then(function (d) { return d && d.configured ? (d.valid ? 'ok' : 'bad') : (C.validKey(key) ? 'ok' : 'bad'); })
      .catch(function () { return 'net'; });
  }
  function legal(page) { return (lang === 'en' ? '/' : '/' + lang + '/') + page; }
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
      return h('button', { class: 'tab' + (cur && t.id === cur.id ? ' on' : ''), 'aria-pressed': cur && t.id === cur.id ? 'true' : 'false', onclick: function () { state.active = t.id; plan = {}; save(); render(); } }, t.name || T('namePh'));
    }).concat([h('button', { class: 'tab add', 'aria-label': T('newTracker'), onclick: function () {
      if (!state.pro && state.trackers.length >= CFG.freeLimit) { upsell = true; render(); return; }
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
        s.inside && C.lastDay(tr, C.todayStr()) ? h('span', null, T('leaveBy', { date: fmt(C.lastDay(tr, C.todayStr())) })) : null,
        s.freesOn ? h('span', { class: 'free' }, T('freeOn', { date: fmt(s.freesOn) })) : null,
        s.permit ? h('span', { class: 'permit p-' + s.permit.state }, s.permit.state === 'gone' ? T('permitGone', { date: fmt(tr.expires) }) : s.permit.days === 0 ? T('permitToday') : T('permitLeft', { n: s.permit.days })) : null
      ]),
      h('button', { class: 'ghost small editc', onclick: function () { editCounter = true; render(); } }, T('editCounter'))
    ]);
  }

  function ruleLabel(r) { return r.kind === 'year' ? r.limit + ' / ' + T('calYear') : r.limit + ' / ' + r.window; }
  function overview() {
    var today = C.todayStr(), cur = current();
    return h('section', { class: 'card ov' }, [h('h2', null, T('overview')), h('ul', null, state.trackers.map(function (t) {
      var s = C.summary(t, today);
      return h('li', null, h('button', { class: 'ovrow' + (cur && cur.id === t.id ? ' on' : ''), onclick: function () { state.active = t.id; plan = {}; save(); render(); } }, [
        h('span', null, [h('strong', null, t.name || T('namePh')), h('span', { class: 'dates' }, ruleLabel(s.rule))]),
        h('span', { class: 'chip st-' + s.state }, leftText(s.left)),
        s.permit && s.permit.state !== 'ok' ? h('span', { class: 'permit p-' + s.permit.state }, s.permit.state === 'gone' ? '!' : s.permit.days + 'd') : null
      ]));
    }))]);
  }

  function planner(tr) {
    var start = plan.arrive || C.addDays(C.todayStr(), 1), n = plan.nights || 14, rule = C.cleanRule(tr.rule);
    var out = h('p', { class: 'plan-out', id: 'plan-out', role: 'status' }), win = h('div', { class: 'wins' });
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
        if (tr.expires && max > 0 && C.addDays(a, d - 1) > tr.expires) msg += ' ' + T('planPast', { date: fmt(tr.expires) });
      }
      out.textContent = msg;
      var wins = d <= rule.limit ? C.arrivalWindows(tr, d, C.todayStr() > a ? C.todayStr() : a, C.todayStr(), 365) : [];
      win.replaceChildren();
      if (d <= rule.limit) {
        win.appendChild(h('div', null, wins.length ? T('winH', { n: d }) : T('winNone', { n: d })));
        wins.slice(0, 4).forEach(function (w) { win.appendChild(h('div', { class: 'dates' }, T('winRange', { a: fmt(w.from), b: fmt(w.to) }))); });
      }
    }
    var wrap = h('section', { class: 'card' }, [
      h('h2', null, T('planH')),
      h('div', { class: 'grid2' }, [
        h('label', null, [T('arrive'), h('input', { type: 'date', id: 'p-arrive', value: start, oninput: calc })]),
        h('label', null, [T('nights'), h('input', { type: 'number', id: 'p-days', min: 1, max: 366, value: n, inputmode: 'numeric', oninput: calc })])
      ]), out, win]);
    setTimeout(calc, 0);
    return wrap;
  }

  function rel(n) { return n === 0 ? T('todayWord') : n === 1 ? T('inDay') : T('inDays', { n: n }); }
  function banner() {
    var list = C.urgent(state.trackers, C.todayStr());
    if (!list.length) return null;
    return h('section', { class: 'banner', role: 'region', 'aria-label': T('bannerH') }, [h('strong', null, T('bannerH')),
      h('ul', null, list.slice(0, 5).map(function (u) {
        return h('li', null, T('a_' + u.kind) + ' · ' + (u.name || T('namePh')) + ' · ' + fmt(u.date) + (u.in >= 0 ? ' · ' + rel(u.in) : ''));
      }))]);
  }
  function keyDates(tr) {
    var list = C.alerts(tr, C.todayStr());
    return h('section', { class: 'card' }, [h('h2', null, T('alertsH')),
      list.length ? h('ul', { class: 'alerts' }, list.map(function (a) {
        return h('li', { class: 'al-' + a.kind }, [h('span', null, T('a_' + a.kind)),
          h('span', { class: 'dates' }, fmt(a.date) + (a.in >= 0 ? ' · ' + rel(a.in) : ''))]);
      })) : h('p', { class: 'muted' }, T('noAlerts'))]);
  }

  /* what-if: several future legs replayed on top of the real trips; nothing is saved until "add all" */
  function itinerary(tr) {
    var res = C.simulate(tr, tr.drafts || [], C.todayStr()), n = res.legs.length;
    var from = h('input', { type: 'date', id: 'w-from', 'aria-label': T('from'), value: C.addDays(C.todayStr(), 30) });
    var to = h('input', { type: 'date', id: 'w-to', 'aria-label': T('to'), value: C.addDays(C.todayStr(), 44) });
    var err = h('p', { class: 'err', role: 'alert' });
    var rows = res.legs.map(function (l) {
      var msg = l.ok ? T('legOk', { n: l.peak, l: res.limit }) : [T('legBreach', { date: fmt(l.breachDate) }),
        l.trimTo ? ' ' + T('legTrim', { date: fmt(l.trimTo), n: l.fit }) : ' ' + T('legNone'),
        l.earliest && l.earliest !== l.from ? ' ' + T('legEarly', { date: fmt(l.earliest) }) : ''].join('');
      return h('li', { class: l.ok ? 'leg-ok' : 'leg-bad' }, [
        h('div', null, [h('strong', null, fmt(l.from) + ' → ' + fmt(l.to) + ' · ' + l.days), h('span', { class: 'dates' }, msg)]),
        h('button', { class: 'ghost x', 'aria-label': T('removeLeg'), onclick: function () { C.removeDraft(tr, l.id); save(); render(); } }, '×')
      ]);
    });
    return h('section', { class: 'card' }, [h('h2', null, T('whatH')), h('p', { class: 'muted' }, T('whatHint')),
      h('div', { class: 'grid2' }, [h('label', null, [T('from'), from]), h('label', null, [T('to'), to])]),
      err, h('div', { class: 'row' }, [h('button', { class: 'pri small', onclick: function () {
        if (!C.addDraft(tr, { from: from.value, to: to.value })) { err.textContent = T('badTrip'); return; }
        save(); render();
      } }, '+ ' + T('addLeg'))]),
      n ? h('ul', { class: 'trips legs' }, rows) : h('p', { class: 'muted' }, T('noLegs')),
      n ? h('p', { class: 'verdict ' + (res.ok ? 'v-ok' : 'v-bad'), role: 'status' }, T(res.ok ? 'whatOk' : 'whatBad')) : null,
      n ? h('div', { class: 'row' }, [
        h('button', { class: 'ghost', onclick: function () {
          var txt = C.itineraryText(res, function (l) { return l.ok ? '' : T('legBreach', { date: l.breachDate }); }).trim();
          (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast(T('copied')); }, function () { toast(T('copyFail')); });
        } }, T('copyBtn')),
        h('button', { class: 'ghost', onclick: function () { tr.drafts = []; save(); render(); } }, T('clearAll')),
        h('button', { class: 'pri', onclick: function () { undoable(T('applied', { n: res.legs.length }), function () { C.commitDrafts(tr); save(); render(); }); } }, T('applyAll'))]) : null]);
  }

  function forecastCard(tr) {
    var f = C.forecast(tr, C.todayStr(), 180), max = C.cleanRule(tr.rule).limit;
    var bars = h('div', { class: 'fc', role: 'img', 'aria-label': T('forecastCap') }, f.map(function (x) {
      var v = Math.max(0, Math.min(max, x.left));
      return h('i', { title: T('forecastTip', { date: fmt(x.date), n: x.left }), class: x.left < 0 ? 'neg' : '', style: 'height:' + Math.max(2, Math.round(v / max * 100)) + '%' });
    }));
    return h('section', { class: 'card' }, [h('h2', null, T('forecastH')), bars, h('p', { class: 'muted small' }, T('forecastCap'))]);
  }

  function groupCard() {
    var start = plan.garrive || C.addDays(C.todayStr(), 1), n = plan.gnights || 14, all = state.trackers;
    var out = h('div', { class: 'plan-out', id: 'g-out', role: 'status' });
    function calc() {
      var a = document.getElementById('g-arrive').value, d = +document.getElementById('g-days').value;
      plan.garrive = a; plan.gnights = d; out.replaceChildren();
      if (!C.validDate(a) || !(d >= 1)) return;
      var g = C.groupMaxStay(all, a, C.todayStr()), nm = {}, lim = C.groupEarliest(all, d, a, C.todayStr());
      all.forEach(function (t) { nm[t.id] = t.name || T('namePh'); });
      out.appendChild(h('p', null, g.days > 0 ? T('groupMax', { date: fmt(a), n: g.days, end: fmt(C.addDays(a, g.days - 1)) }) : T('groupNone')));
      out.appendChild(h('ul', { class: 'alerts' }, g.people.map(function (p) { return h('li', null, h('span', null, T('groupWho', { name: nm[p.id], n: p.max }))); })));
      out.appendChild(h('p', { class: 'muted' }, T('groupLimit', { name: g.limiting.map(function (id) { return nm[id]; }).join(', ') })));
      out.appendChild(h('p', null, lim ? (lim === a ? T('planNow') : T('groupEarly', { n: d, date: fmt(lim) })) : T('groupNoEarly', { n: d })));
    }
    var card = h('section', { class: 'card' }, [h('h2', null, T('groupH')), h('p', { class: 'muted' }, T('groupHint')),
      h('div', { class: 'grid2' }, [
        h('label', null, [T('arrive'), h('input', { type: 'date', id: 'g-arrive', value: start, oninput: calc })]),
        h('label', null, [T('nights'), h('input', { type: 'number', id: 'g-days', min: 1, max: 366, value: n, inputmode: 'numeric', oninput: calc })])]), out]);
    setTimeout(calc, 0);
    return card;
  }
  function calendarCard(tr) {
    var ym = calMonth || C.todayStr().slice(0, 7), weeks = C.calendarMonth(tr, ym, C.todayStr());
    var label;
    try { label = new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(C.dn(ym + '-01') * 86400000)); } catch (e) { label = ym; }
    var heads = weeks[0].map(function (c) {
      var w; try { w = new Intl.DateTimeFormat(lang, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(C.dn(c.date) * 86400000)); } catch (e) { w = ''; }
      return h('span', { class: 'wd' }, w);
    });
    var cells = [].concat.apply([], weeks).map(function (c) {
      return h('span', { class: 'day' + (c.inMonth ? '' : ' off') + (c.in ? (c.planned ? ' plan' : ' in') : '') + (c.over ? ' over' : '') + (c.today ? ' now' : ''), title: fmt(c.date) }, String(+c.date.slice(8)));
    });
    return h('section', { class: 'card' }, [
      h('div', { class: 'rowhead' }, [h('h2', null, T('calH') + ' · ' + label), h('span', { class: 'rowbtns' }, [
        h('button', { class: 'ghost small', 'aria-label': T('calPrev'), onclick: function () { calMonth = C.addMonth(ym, -1); render(); } }, '‹'),
        h('button', { class: 'ghost small', 'aria-label': T('calNext'), onclick: function () { calMonth = C.addMonth(ym, 1); render(); } }, '›')])]),
      h('div', { class: 'cal' }, heads.concat(cells)), h('p', { class: 'muted small' }, T('calLegend'))]);
  }
  function auditCard(tr) {
    var eps = C.audit(tr, C.todayStr(), 3);
    return h('section', { class: 'card' }, [h('h2', null, T('auditH')),
      eps.length ? h('ul', { class: 'alerts' }, eps.map(function (e) { return h('li', { class: 'al-over' }, h('span', null, T('auditEp', { from: fmt(e.from), to: fmt(e.to), n: e.over }))); }))
        : h('p', { class: 'v-ok' }, T('auditOk')),
      h('p', { class: 'muted small' }, T('auditNote'))]);
  }
  function monthCard(tr) {
    var m = C.monthlyUsage(tr, C.todayStr(), 12);
    var bars = h('div', { class: 'fc months', role: 'img', 'aria-label': T('monthCap') }, m.map(function (x) {
      return h('i', { title: T('monthTip', { month: x.month, n: x.days }), style: 'height:' + Math.max(2, Math.round(x.days / 31 * 100)) + '%' });
    }));
    return h('section', { class: 'card' }, [h('h2', null, T('monthH')), bars, h('p', { class: 'muted small' }, T('monthCap'))]);
  }

  function tripList(tr) {
    var list = tr.trips.length ? h('ul', { class: 'trips' }, tr.trips.map(function (t) {
      var days = Object.keys(C.stayDays([t], C.todayStr())).length;
      return h('li', null, [
        h('div', null, [
          h('strong', null, t.place || '—'),
          h('span', { class: 'dates' }, fmt(t.from) + ' → ' + (t.to ? fmt(t.to) : T('today')) + ' · ' + days),
          t.from > C.todayStr() ? h('span', { class: 'chip plan' }, T('planned')) : null
        ]),
        h('span', { class: 'rowbtns' }, [
          !t.to ? h('button', { class: 'ghost', onclick: function () { t.to = C.todayStr(); save(); render(); } }, T('leftToday')) : null,
          h('button', { class: 'ghost', onclick: function () { editing = t.id; render(); } }, T('edit')),
          h('button', { class: 'ghost x', 'aria-label': T('confTrip'), onclick: function () { if (confirm(T('confTrip'))) undoable(T('tripGone'), function () { C.removeTrip(tr, t.id); save(); render(); }); } }, '×')
        ])
      ]);
    })) : h('p', { class: 'muted' }, T('noTrips'));
    return h('section', { class: 'card' }, [
      h('div', { class: 'rowhead' }, [h('h2', null, T('trips')), h('span', { class: 'rowbtns' }, [h('button', { class: 'ghost small', onclick: function () { pasting = true; render(); } }, T('pasteBtn')), h('button', { class: 'pri small', onclick: function () { adding = true; render(); } }, '+ ' + T('addTrip'))])]),
      list]);
  }

  function tripDialog(tr) {
    var cur = editing ? tr.trips.filter(function (x) { return x.id === editing; })[0] : null;
    var dlg = h('dialog', { 'aria-labelledby': 'dlg-h' }), err = h('p', { class: 'err', role: 'alert' });
    var from = h('input', { type: 'date', id: 'f-from', required: '', value: cur ? cur.from : C.todayStr() });
    var to = h('input', { type: 'date', id: 'f-to', value: cur ? cur.to : '', disabled: cur && !cur.to ? '' : false });
    var on = h('input', { type: 'checkbox', id: 'f-on', checked: cur && !cur.to ? '' : false, onchange: function () { to.disabled = on.checked; if (on.checked) to.value = ''; } });
    dlg.appendChild(h('form', { method: 'dialog', onsubmit: function (e) {
      e.preventDefault();
      var data = { place: document.getElementById('f-place').value, from: from.value, to: on.checked ? '' : to.value };
      var ok = cur ? C.updateTrip(tr, cur.id, data) : C.addTrip(tr, data);
      if (!ok) { err.textContent = T('badTrip'); return; }
      adding = false; editing = ''; save(); render();
    } }, [
      h('h2', { id: 'dlg-h' }, cur ? T('editTrip') : T('addTrip')),
      h('label', null, [T('place'), h('input', { id: 'f-place', maxlength: 60, value: cur ? cur.place : '' })]),
      h('label', null, [T('from'), from]),
      h('label', null, [T('to'), to]),
      h('label', { class: 'chk' }, [on, T('ongoing')]),
      err,
      h('div', { class: 'row' }, [h('button', { type: 'button', class: 'ghost', onclick: function () { adding = false; editing = ''; render(); } }, T('cancel')), h('button', { type: 'submit', class: 'pri' }, T('save'))])
    ]));
    return dlg;
  }

  function pasteDialog(tr) {
    var dlg = h('dialog', { 'aria-labelledby': 'dlg-h' }), info = h('p', { class: 'muted', role: 'status' }), parsed = { trips: [], bad: [] };
    var ta = h('textarea', { id: 'f-paste', rows: 6, spellcheck: 'false', oninput: function () {
      parsed = C.parseTrips(ta.value);
      info.textContent = ta.value.trim() ? T('pasteFound', { n: parsed.trips.length }) + (parsed.bad.length ? ' ' + T('pasteBad', { lines: parsed.bad.slice(0, 8).join(', ') }) : '') : '';
      go.disabled = !parsed.trips.length;
    } });
    var go = h('button', { type: 'button', class: 'pri', disabled: '', onclick: function () {
      pasting = false;
      undoable(T('pasteDone', { n: parsed.trips.length }), function () { parsed.trips.forEach(function (t) { C.addTrip(tr, t); }); save(); render(); });
    } }, T('pasteAdd'));
    dlg.appendChild(h('div', null, [h('h2', { id: 'dlg-h' }, T('pasteH')), h('p', { class: 'muted' }, T('pasteHint')), ta, info,
      h('div', { class: 'row' }, [h('button', { type: 'button', class: 'ghost', onclick: function () { pasting = false; render(); } }, T('cancel')), go])]));
    return dlg;
  }
  function trackerDialog() {
    var dlg = h('dialog', { 'aria-labelledby': 'dlg-h' });
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
      var t = { id: uid(), name: (document.getElementById('f-name').value || '').trim().slice(0, 40), rule: C.cleanRule(rule), expires: document.getElementById('f-exp').value || '', trips: [] };
      state.trackers.push(t); state.active = t.id; creating = false; save(); render();
    } }, [
      h('h2', { id: 'dlg-h' }, T('newTracker')),
      h('label', null, [T('trackerName'), h('input', { id: 'f-name', maxlength: 40, placeholder: T('namePh') })]),
      h('label', null, [T('rule'), sel]), custom,
      h('label', null, [T('expires'), h('input', { type: 'date', id: 'f-exp' })]),
      h('div', { class: 'row' }, [h('button', { type: 'button', class: 'ghost', onclick: function () { creating = false; render(); } }, T('cancel')), h('button', { type: 'submit', class: 'pri' }, T('save'))])
    ]));
    setTimeout(sync, 0);
    return dlg;
  }

  function counterDialog(tr) {
    var dlg = h('dialog', { 'aria-labelledby': 'dlg-h' });
    dlg.appendChild(h('form', { method: 'dialog', onsubmit: function (e) {
      e.preventDefault();
      tr.name = (document.getElementById('e-name').value || '').trim().slice(0, 40);
      var x = document.getElementById('e-exp').value; tr.expires = C.validDate(x) ? x : '';
      editCounter = false; save(); render();
    } }, [
      h('h2', { id: 'dlg-h' }, T('editCounter')),
      h('label', null, [T('trackerName'), h('input', { id: 'e-name', maxlength: 40, value: tr.name })]),
      h('label', null, [T('expires'), h('input', { type: 'date', id: 'e-exp', value: tr.expires || '' })]),
      h('div', { class: 'row' }, [h('button', { type: 'button', class: 'ghost', onclick: function () { editCounter = false; render(); } }, T('cancel')), h('button', { type: 'submit', class: 'pri' }, T('save'))])
    ]));
    return dlg;
  }
  function upsellDialog() {
    var dlg = h('dialog', { 'aria-labelledby': 'dlg-h' });
    dlg.appendChild(h('div', null, [
      h('h2', { id: 'dlg-h' }, T('upH')), h('p', null, T('limitMsg', { max: CFG.freeLimit })),
      h('div', { class: 'row' }, [h('button', { class: 'ghost', onclick: function () { upsell = false; render(); } }, T('later')),
        h('a', { class: 'pri btnlink', href: CFG.checkoutUrl, rel: 'noopener', target: '_blank' }, T('upgrade'))])
    ]));
    return dlg;
  }
  function quickStart() {
    var t = { id: uid(), name: '', rule: C.cleanRule(C.PRESETS.schengen), expires: '', trips: [] };
    state.trackers.push(t); state.active = t.id; save(); render();
  }

  function empty() {
    return h('div', { class: 'empty' }, [
      h('div', { class: 'ghostflap' }, '90'),
      h('h2', null, T('emptyH')), h('p', null, T('emptyB')),
      h('div', { class: 'row center' }, [h('button', { class: 'pri', onclick: quickStart }, T('quick')), h('button', { class: 'ghost', onclick: function () { creating = true; render(); } }, T('newTracker'))])]);
  }

  function footer(tr) {
    var file = h('input', { type: 'file', accept: 'application/json', hidden: '', onchange: function () {
      var f = file.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () {
        try { var s = JSON.parse(r.result); if (!s || !Array.isArray(s.trackers)) throw 0; state = { v: 1, trackers: C.sanitize(s.trackers), active: s.active || '', pro: state.pro, lang: state.lang }; save(); render(); toast(T('restored')); }
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
        h('button', { class: 'ghost', onclick: function () { download('stayline.ics', C.toIcs(state.trackers, C.todayStr()), 'text/calendar'); } }, T('ics')),
        h('button', { class: 'ghost', onclick: function () {
          if (needPro()) return;
          download('stayline-key-dates.ics', C.alertsIcs(state.trackers, C.todayStr(), function (k) { return T('icsLabel_' + k); }), 'text/calendar'); toast(T('icsDone'));
        } }, T('icsKey')),
        h('button', { class: 'ghost', onclick: function () { if (needPro()) return; window.print(); } }, T('print'))
      ]),
      h('div', { class: 'settings' }, state.pro ? h('span', { class: 'chip' }, T('pro') + ' ✓') : [
        h('label', null, [T('lic'), lic]),
        h('button', { class: 'pri', onclick: function () {
          var key = lic.value.trim();
          verifyKey(key).then(function (r) {
            if (r === 'ok') { state.pro = true; save(); toast(T('okKey')); render(); }
            else toast(T(r === 'net' ? 'licNet' : 'badKey'));
          });
        } }, T('activate')),
        h('a', { class: 'ghost link', href: CFG.checkoutUrl, rel: 'noopener', target: '_blank' }, T('upgrade'))
      ]),
      tr ? h('button', { class: 'ghost danger', onclick: function () {
        if (!confirm(T('confDel'))) return;
        undoable(T('counterGone'), function () { state.trackers = state.trackers.filter(function (t) { return t.id !== tr.id; }); state.active = ''; save(); render(); });
      } }, T('del')) : null,
      h('p', { class: 'fine' }, T('disclaimer')), h('p', { class: 'fine' }, T('privacy')),
      h('p', { class: 'fine' }, [h('a', { href: legal('privacy') }, T('privacyLink')), ' · ', h('a', { href: legal('terms') }, T('termsLink')), ' · ', h('a', { href: 'mailto:' + CFG.supportEmail }, CFG.supportEmail)])
    ]);
  }

  function render() {
    document.documentElement.lang = lang; document.title = T('app');
    var tr = current(), kids = [header()];
    if (!tr) kids.push(h('p', { class: 'tag' }, T('tag')), empty());
    else {
      var bn = banner(); if (bn) kids.push(bn);
      kids.push(tabs());
      if (state.trackers.length > 1) kids.push(overview());
      kids.push(board(tr), keyDates(tr), planner(tr), itinerary(tr));
      if (state.trackers.length > 1) kids.push(groupCard());
      kids.push(calendarCard(tr), forecastCard(tr), monthCard(tr), auditCard(tr), tripList(tr));
      var pr = h('div', { class: 'printonly' }, [h('h1', null, T('printTitle') + ' — ' + tr.name)]);
      kids.push(pr);
    }
    kids.push(footer(tr));
    root.replaceChildren.apply(root, kids);
    if ((adding || editing) && tr) { var d = tripDialog(tr); root.appendChild(d); d.showModal(); }
    if (pasting && tr) { var d5 = pasteDialog(tr); root.appendChild(d5); d5.showModal(); }
    if (editCounter && tr) { var d3 = counterDialog(tr); root.appendChild(d3); d3.showModal(); }
    if (upsell) { var d4 = upsellDialog(); root.appendChild(d4); d4.showModal(); }
    if (creating) { var d2 = trackerDialog(); root.appendChild(d2); d2.showModal(); }
  }
  document.addEventListener('cancel', function () { adding = creating = editCounter = upsell = pasting = false; editing = ''; setTimeout(render, 0); }, true);
  render();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
