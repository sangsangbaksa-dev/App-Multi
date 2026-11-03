(function () {
  'use strict';
  var C = window.SB, I = window.I18N, CFG = window.SB_SITE;
  var KEY = 'stampbook.v1', root = document.getElementById('root');
  var state = load(), lang = I.pick(state.lang), query = '', filter = 'all', storageOk = true, view = 'packs', calYm = C.todayStr().slice(0, 7), calDay = '', fresh = '';
  function applyTheme() { var t = state.theme === 'light' || state.theme === 'dark' ? state.theme : ''; if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
  applyTheme();

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.packs)) return s; } catch (e) {}
    return { v: 1, packs: [], teacher: '', pro: false, lang: '' };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; } catch (e) { storageOk = false; } if (cloud) cloud.changed(); }

  /* Optional cloud sync (Supabase). Off unless config.js has a project URL and key. Licence fields stay on this device. */
  var LOCAL_ONLY = ['pro', 'key', 'licMode', 'instanceId', 'licChecked', 'lang', 'theme'];
  var cloud = window.CloudSync ? window.CloudSync.create({
    url: CFG.supabaseUrl, anonKey: CFG.supabaseKey, app: 'stampbook', storage: window.localStorage, device: (navigator.platform || 'web').slice(0, 60),
    snapshot: function () { var o = JSON.parse(JSON.stringify(state)); LOCAL_ONLY.forEach(function (k) { delete o[k]; }); return o; },
    isEmpty: function (snap) { return !snap.packs || !snap.packs.length; },
    apply: function (snap) {
      if (!snap || !Array.isArray(snap.packs)) return;
      var keep = {}; LOCAL_ONLY.forEach(function (k) { keep[k] = state[k]; });
      try { localStorage.setItem(KEY, JSON.stringify(Object.assign({ teacher: '', lang: '' }, snap, keep))); } catch (e) { return; }
      location.reload();
    },
    onResult: function (r) { if (r.status === 'pushed') toast(window.CloudI18n.t(lang, 'pushed')); }
  }) : null;
  if (cloud && !cloud.enabled()) cloud = null;
  function T(k, v) { return I.t(lang, k, v); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === 'class') e.className = attrs[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    (function flat(a) { return Array.isArray(a) ? a.reduce(function (x, y) { return x.concat(flat(y)); }, []) : [a]; })(kids == null ? [] : kids).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function toast(msg, actionLabel, action, keep) {
    /* a delete's Undo toast (keep) survives other toasts, which stack above it, so a later action cannot make a delete permanent unnoticed */
    [].forEach.call(document.querySelectorAll('.toast'), function (x) { if (!x.hasAttribute('data-keep')) x.remove(); });
    var kids = [msg];
    if (action) kids.push(h('button', { class: 'tbtn', onclick: function () { t.remove(); action(); } }, actionLabel));
    var t = h('div', { class: 'toast', role: 'status', 'data-keep': keep ? '1' : false }, kids); document.body.appendChild(t);
    /* the timer waits while the pointer or keyboard focus is on the toast, so Undo cannot vanish under a finger or a focused button */
    var ms = action ? 6000 : 2200, timer = setTimeout(done, ms), hold = false, hov = false, foc = false;
    function done() { if (hold || (t.matches && t.matches(':hover'))) { timer = setTimeout(done, 1500); return; } if (t.contains(document.activeElement) && document.body) document.body.focus(); t.remove(); }
    function upd() { hold = hov || foc; }
    t.addEventListener('mouseenter', function () { hov = true; upd(); }); t.addEventListener('mouseleave', function () { hov = false; upd(); });
    t.addEventListener('pointerdown', function () { hov = true; upd(); setTimeout(function () { hov = false; upd(); }, 4000); });
    t.addEventListener('focusin', function () { foc = true; upd(); }); t.addEventListener('focusout', function () { foc = false; upd(); });
  }
  function money(n, cur) {
    try { return new Intl.NumberFormat(lang, { style: 'currency', currency: cur || 'USD', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n); }
    catch (e) { return n + ' ' + (cur || ''); }
  }
  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function copy(text, okMsg) {
    var done = function () { toast(okMsg || T('copied')); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    else fallback();
    function fallback() {
      var ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { prompt('', text); } ta.remove();
    }
  }
  function activeCount() { return state.packs.filter(function (p) { var s = C.status(p); return s === 'active' || s === 'low'; }).length; }
  function needPro() { showUpgrade(); }

  /* ---------- read-only balance card (opened from a shared link) ---------- */
  function renderCard(card) {
    document.title = card.student + ' · ' + T('app');
    var left = Math.max(0, card.total - card.dates.length), grid = h('div', { class: 'grid' });
    for (var i = 0; i < card.total; i++) {
      var d = card.dates[i];
      grid.appendChild(h('div', { class: 'slot' + (d ? ' on' : ''), style: d ? '--r:' + (((i * 37) % 13) - 6) + 'deg' : false, title: d || '' }, d ? d.slice(5).replace('-', '/') : ''));
    }
    var exp = card.expires ? (card.expires < C.todayStr() ? T('expOn', { date: card.expires }) : T('expIn', { d: C.daysBetween(C.todayStr(), card.expires) })) : '';
    root.appendChild(h('div', { class: 'bal card' }, [
      h('div', { class: 'note' }, T('cardH') + (card.teacher ? ' · ' + T('cardFrom', { t: card.teacher }) : '')),
      h('h2', { style: 'font:700 22px var(--serif);margin:6px 0' }, card.student),
      h('div', { class: 'big' }, String(left)),
      h('div', {}, T('cardLeft', { n: left, total: card.total })), h('div', { class: 'meta' }, exp), card.owed ? h('div', { class: 'meta' }, T('cardOwed', { n: card.owed })) : null, card.unpaid ? h('div', { class: 'meta' }, T('cardUnpaid')) : null, card.next ? h('div', { class: 'nextnote' }, [h('b', {}, T('cardNext') + ': '), card.next]) : null, grid,
      h('p', { class: 'note' }, (card.asOf ? T('cardAsOf', { date: card.asOf }) + ' · ' : '') + T('cardNote'))
    ]));
  }

  /* ---------- main ---------- */
  function render() {
    root.textContent = '';
    document.documentElement.lang = lang; document.title = T('app');
    var m = location.hash.match(/^#c=([\w-]+)$/);
    if (m) { var card = C.decodeCard(m[1]); if (card) return renderCard(card); }

    var sel = h('select', { 'aria-label': T('lang'), onchange: function (e) { lang = e.target.value; state.lang = lang; save(); render(); } },
      I.langs.map(function (l) { return h('option', { value: l, selected: l === lang ? 'selected' : false }, I.L[l].name); }));
    root.appendChild(h('header', {}, [
      h('h1', {}, [T('app'), h('small', {}, T('tag'))]),
      state.pro ? h('span', { class: 'chip c-active' }, T('pro')) : h('button', { class: 'ghost', onclick: function () { document.getElementById('lic').scrollIntoView({ behavior: 'smooth' }); } }, T('upgrade')),
      sel
    ]));

    var today = C.todayStr(), ym = today.slice(0, 7), ms = C.monthStats(state.packs, ym);
    var curs = state.packs.map(function (p) { return p.currency || 'USD'; }).filter(function (c, i, a) { return a.indexOf(c) === i; });
    if (!curs.length) curs = ['USD'];
    function perCur(fn) { return curs.map(function (c) { return money(fn(state.packs.filter(function (p) { return (p.currency || 'USD') === c; })), c); }).join(' + '); }
    root.appendChild(h('div', { class: 'sum' }, [
      h('div', {}, [h('b', {}, String(ms.lessons)), h('span', {}, T('thisMonth') + ' · ' + T('given'))]),
      h('div', {}, [h('b', {}, perCur(function (ps) { return C.monthStats(ps, ym).earned; })), h('span', {}, T('earned'))]),
      h('div', {}, [h('b', {}, perCur(function (ps) { return C.totalUnearned(ps, today); })), h('span', {}, T('owed'))])
    ]));
    if (!storageOk) root.appendChild(h('div', { class: 'warnbar', role: 'alert' }, T('storageErr')));
    root.appendChild(tabs());
    if (view === 'cal') root.appendChild(calendarView(today));
    else if (view === 'ins') root.appendChild(insightsView(today));
    else packsView(today);

    root.appendChild(settings());
    root.appendChild(h('p', { class: 'note' }, T('privacy')));
    root.appendChild(newDialog());
    root.appendChild(upgradeDialog());
  }
  function packsView(today) {
    if (C.backupDue(state.packs, state.lastBackup, Date.now())) root.appendChild(h('div', { class: 'warnbar', role: 'status' }, [T('backupNudge') + ' ', h('button', { class: 'ghost sm', onclick: doBackup }, T('backupNow'))]));
    var plan = C.agenda(state.packs, today, 1);
    if (plan.length) root.appendChild(h('div', { class: 'card todaybox' }, [h('h3', {}, T('todayH')), h('ul', { class: 'evs' }, plan.map(function (e) {
      var p = state.packs.filter(function (x) { return x.id === e.packId; })[0];
      return h('li', {}, [e.time ? h('span', { class: 'ld' }, e.time) : null, h('b', {}, e.student), h('span', { class: 'ln' }, T('left', { n: C.remaining(p) })),
        h('button', { class: 'ghost sm', onclick: function () { C.toggleSkip(p, today); save(); render(); } }, T('skip')),
        h('button', { class: 'stampbtn sm', onclick: function () { stamp(p, today); } }, T('stampToday'))]); }))]));
    var wk = C.weekPlan(state.packs, today, 7);
    if (state.packs.length) root.appendChild(h('details', { class: 'weekbox', open: wk.length ? 'open' : false }, [h('summary', {}, T('weekH') + (wk.length ? ' (' + wk.reduce(function (n, d) { return n + d.items.length; }, 0) + ')' : '')),
      wk.length ? h('div', {}, wk.map(function (d) { return h('div', { class: 'wkday' }, [h('b', {}, d.date === today ? T('todayH') : fmt({ weekday: 'short', month: 'short', day: 'numeric' }, d.date)),
        h('ul', { class: 'evs' }, d.items.map(function (e) { return h('li', {}, [e.time ? h('span', { class: 'ld' }, e.time) : null, e.student]); }))]); })) : h('p', { class: 'note' }, T('weekEmpty'))]));
    var att = C.attention(state.packs, today);
    root.appendChild(h('div', { class: 'row', style: 'margin-bottom:16px' }, [h('button', { class: 'pri', onclick: openNew }, '+ ' + T('newPack')),
      att.length ? h('span', { class: 'chip c-low' }, T('attn', { n: att.length })) : null]));
    if (state.packs.length >= 4) {
      var q = h('input', { type: 'search', 'aria-label': T('search'), placeholder: T('search'), value: query, oninput: function (e) { query = e.target.value; renderList(); } });
      root.appendChild(h('div', { class: 'row', style: 'margin-bottom:12px' }, [h('div', { style: 'flex:1;min-width:160px' }, q),
        ['all', 'attn'].map(function (f) { return h('button', { class: 'ghost' + (filter === f ? ' on' : ''), 'aria-pressed': String(filter === f), onclick: function () { filter = f; render(); } }, T(f === 'all' ? 'filterAll' : 'filterAttn')); })]));
    }
    listBox = h('div', { id: 'list' }); root.appendChild(listBox);

    if (!state.packs.length) {
      root.appendChild(h('div', { class: 'empty' }, [h('h2', {}, T('emptyH')), h('p', {}, T('emptyB')), h('button', { class: 'pri', onclick: openNew }, '+ ' + T('newPack'))]));
    }
    renderList();

    var lap = C.lapsed(state.packs, today);
    if (lap.length) root.appendChild(h('div', { class: 'lapsed' }, [h('h3', {}, T('lapsedH')), h('div', { class: 'note' }, T('lapsedB'))]));

  }
  var listBox;

  /* ---------- calendar + insights ---------- */
  function tabs() {
    return h('div', { class: 'tabs', role: 'tablist' }, [['packs', 'tabPacks'], ['cal', 'tabCal'], ['ins', 'tabInsights']].map(function (t) {
      return h('button', { class: 'ghost' + (view === t[0] ? ' on' : ''), role: 'tab', 'aria-selected': String(view === t[0]), onclick: function () { view = t[0]; render(); } }, T(t[1]));
    }));
  }
  function fmt(opts, ds) { try { return new Intl.DateTimeFormat(lang, opts).format(C.parse(ds)); } catch (e) { return ds; } }
  function weekStart() { return lang === 'es' || lang === 'zh' ? 1 : 0; }
  function calendarView(today) {
    var ws = weekStart(), map = C.dayMap(state.packs, calYm), plan = {}, box = h('div', { class: 'cal' });
    var head = h('div', { class: 'calhead' }, [
      h('button', { class: 'ghost', 'aria-label': T('calPrev'), onclick: function () { calYm = C.ymAdd(calYm, -1); calDay = ''; render(); } }, '‹'),
      h('b', { 'aria-live': 'polite' }, fmt({ year: 'numeric', month: 'long' }, calYm + '-01')),
      h('button', { class: 'ghost', 'aria-label': T('calNext'), onclick: function () { calYm = C.ymAdd(calYm, 1); calDay = ''; render(); } }, '›'),
      h('button', { class: 'ghost', onclick: function () { calYm = today.slice(0, 7); calDay = today; render(); } }, T('calThisMonth'))]);
    state.packs.reduce(function (acc, p) { return acc.concat(C.plannedWithSkips(p, today, 190)); }, []).forEach(function (e) { if (e.date.slice(0, 7) === calYm) (plan[e.date] = plan[e.date] || []).push(e); });
    var grid = h('div', { class: 'calgrid', role: 'grid' });
    for (var i = 0; i < 7; i++) grid.appendChild(h('div', { class: 'dow', role: 'columnheader' }, fmt({ weekday: 'short' }, C.addDays('2026-11-01', (i + ws) % 7))));
    C.monthGrid(calYm, ws).forEach(function (d) {
      if (!d) return grid.appendChild(h('div', { class: 'day blank' }));
      var ev = map[d] || [], n = ev.filter(function (e) { return e.kind !== 'excused'; }).length;
      grid.appendChild(h('button', { type: 'button', class: 'day' + (d === today ? ' today' : '') + (d === calDay ? ' sel' : '') + (ev.length ? ' has' : '') + (plan[d] ? ' plan' : ''),
        'aria-pressed': String(d === calDay), 'aria-label': d + (ev.length ? ' · ' + ev.map(function (e) { return e.kind === 'noshow' ? T('kNoshow') : e.kind === 'excused' ? T('kExcused') : e.mk ? T('mkTag') : T('legendLesson'); }).join(', ') : '') + (plan[d] ? ' · ' + T('planned') : ''),
        onclick: function () { calDay = calDay === d ? '' : d; render(); } },
        [h('span', {}, String(+d.slice(8))), ev.length ? h('i', { class: 'dots' }, ev.slice(0, 4).map(function (e) { return h('u', { class: 'k-' + (e.mk ? 'mk' : (e.kind || 'lesson')) }); })) : (plan[d] ? h('i', { class: 'dots' }, [h('u', { class: 'k-plan' })]) : null),
         n > 4 ? h('em', {}, '+' + (n - 4)) : null]));
    });
    box.appendChild(head); box.appendChild(grid);
    box.appendChild(h('div', { class: 'legend note' }, [['lesson', 'legendLesson'], ['noshow', 'legendNoshow'], ['excused', 'legendExcused'], ['mk', 'mkTag'], ['plan', 'planned']].map(function (k) {
      return h('span', {}, [h('u', { class: 'k-' + k[0] }), ' ' + T(k[1])]); })));
    if (calDay && calDay.slice(0, 7) === calYm) {
      var list = map[calDay] || [];
      box.appendChild(h('div', { class: 'card calday' }, [h('h3', {}, T('calDay', { date: fmt({ dateStyle: 'full' }, calDay) })),
        (plan[calDay] || []).length ? h('ul', { class: 'evs' }, plan[calDay].map(function (e) { var pk = state.packs.filter(function (x) { return x.id === e.packId; })[0]; return h('li', {}, [e.time ? h('span', { class: 'ld' }, e.time) : null, h('b', {}, e.student), h('span', { class: 'tag t-excused' }, T(e.skipped ? 'skipped' : 'planned')),
          h('button', { class: 'ghost sm', onclick: function () { C.toggleSkip(pk, e.date); save(); render(); } }, T(e.skipped ? 'unskip' : 'skip'))]); })) : null,
        list.length ? h('ul', { class: 'evs' }, list.map(function (e) {
          return h('li', {}, [h('b', {}, e.student), e.kind ? h('span', { class: 'tag t-' + e.kind }, T(e.kind === 'noshow' ? 'kNoshow' : 'kExcused')) : null, e.mk ? h('span', { class: 'tag t-mk' }, T('mkTag')) : null, h('span', { class: 'ln' }, e.note)]); }))
          : ((plan[calDay] || []).length ? null : h('p', { class: 'note' }, T('calNone')))]));
    }
    return box;
  }
  function bars(items, max, cls) {
    return h('div', { class: 'bars ' + (cls || '') }, items.map(function (it) {
      return h('div', { class: 'bar' + (it.hot ? ' hot' : '') }, [h('span', { class: 'bv' }, String(it.v)),
        h('i', { style: 'height:' + (max ? Math.max(it.v ? 4 : 0, Math.round(it.v / max * 100)) : 0) + '%', title: it.l + ': ' + it.v }), h('span', { class: 'bl' }, it.l)]);
    }));
  }
  function sumByCur(fn) {
    var curs = state.packs.map(function (p) { return p.currency || 'USD'; }).filter(function (c, i, x) { return x.indexOf(c) === i; });
    return curs.map(function (c) { return money(fn(state.packs.filter(function (p) { return (p.currency || 'USD') === c; })), c); }).join(' + ');
  }
  function insightsView(today) {
    var ov = C.overview(state.packs, today), box = h('div', { class: 'ins' });
    if (!ov.lessons && !C.makeupList(state.packs, today).length) { box.appendChild(h('div', { class: 'empty' }, [h('p', {}, T('insNoData'))])); return box; }
    box.appendChild(h('div', { class: 'sum' }, [
      h('div', {}, [h('b', {}, String(ov.students)), h('span', {}, T('ovStudents'))]),
      h('div', {}, [h('b', {}, String(ov.lessons)), h('span', {}, T('ovLessons'))]),
      h('div', {}, [h('b', {}, ov.noshowRate + '%'), h('span', {}, T('ovNoshow'))])]));
    var tr = C.monthlyTrend(state.packs, today.slice(0, 7), 6), tmax = Math.max.apply(null, tr.map(function (x) { return x.lessons; }));
    box.appendChild(h('div', { class: 'card' }, [h('h3', {}, T('insTrend')),
      bars(tr.map(function (x, i) { return { v: x.lessons, l: fmt({ month: 'short' }, x.ym + '-01'), hot: i === tr.length - 1 }; }), tmax)]));
    var wc = C.weekdayCounts(state.packs), wmax = Math.max.apply(null, wc), ws = weekStart();
    box.appendChild(h('div', { class: 'card' }, [h('h3', {}, T('insWeekday')),
      bars([0, 1, 2, 3, 4, 5, 6].map(function (i) { var d = (i + ws) % 7; return { v: wc[d], l: fmt({ weekday: 'short' }, C.addDays('2026-11-01', d)), hot: wmax > 0 && wc[d] === wmax }; }), wmax, 'wk')]));
    var mkl = C.makeupList(state.packs, today);
    box.appendChild(h('div', { class: 'card' }, [h('h3', {}, T('mkH')), h('p', { class: 'note' }, T('mkB')),
      mkl.length ? h('ul', { class: 'evs' }, mkl.map(function (r) { return h('li', {}, [h('b', {}, r.student), h('span', { class: 'ln' }, T('mkOwed', { n: r.owed }) + ' · ' + (r.open ? T('left', { n: r.remaining }) : T('mkClosed')))]); }))
        : h('p', { class: 'note' }, T('mkNone'))]));
    var risk = C.packsAtRisk(state.packs, today);
    if (risk.length) box.appendChild(h('div', { class: 'card' }, [h('h3', {}, T('paceH')), h('ul', { class: 'evs' }, risk.map(function (r) {
      return h('li', {}, [h('b', {}, r.student), h('span', { class: 'ln' }, T('paceRisk', { date: r.finish, exp: r.expires, n: Math.ceil(r.needPerWeek * 10) / 10 }))]); }))]));
    var qs = C.quiet(state.packs, today, 14);
    box.appendChild(h('div', { class: 'card' }, [h('h3', {}, T('insQuiet')), h('p', { class: 'note' }, T('insQuietB', { d: 14 })),
      qs.length ? h('ul', { class: 'evs' }, qs.map(function (r) {
        return h('li', {}, [h('b', {}, r.student), h('span', { class: 'ln' }, T('left', { n: r.left }) + ' · ' + (r.sinceLast === null ? T('stNever') : T('stAgo', { d: r.sinceLast })))]); }))
        : h('p', { class: 'note' }, T('insQuietNone'))]));
    var fc = C.forecast(state.packs, today, 30);
    if (fc.lessons) box.appendChild(h('div', { class: 'card' }, [h('h3', {}, T('fcH')), h('p', {}, T('fcB', { n: fc.lessons, v: sumByCur(function (ps) { return C.forecast(ps, today, 30).value; }) }))]));
    var inc = C.incomeByMonth(state.packs, today.slice(0, 7), 6), tot = {};
    inc.forEach(function (r) { Object.keys(r.byCur).forEach(function (c) { tot[c] = (tot[c] || 0) + r.byCur[c]; }); });
    var cks = Object.keys(tot).sort(function (a, b) { return tot[b] - tot[a]; });
    if (cks.length) {
      var main = cks[0], imax = Math.max.apply(null, inc.map(function (r) { return r.byCur[main] || 0; }));
      box.appendChild(h('div', { class: 'card' }, [h('h3', {}, T('incH')),
        bars(inc.map(function (r, i) { return { v: r.byCur[main] || 0, l: fmt({ month: 'short' }, r.ym + '-01'), hot: i === inc.length - 1 }; }), imax),
        h('p', { class: 'note' }, cks.map(function (c) { return money(Math.round(tot[c] * 100) / 100, c); }).join(' + ')),
        h('button', { class: 'ghost sm', onclick: function () { if (!state.pro) return needPro(); download('stampbook-income.csv', C.incomeCsv(state.packs, today.slice(0, 7), 6), 'text/csv'); } }, T('incCsv'))]));
    }
    var up = C.unpaid(state.packs);
    if (up.length) box.appendChild(h('div', { class: 'card' }, [h('h3', {}, T('owedH') + ' · ' + sumByCur(C.outstanding)), h('ul', { class: 'evs' }, up.map(function (p) {
      return h('li', {}, [h('b', {}, p.student), h('span', { class: 'ln' }, money(p.price, p.currency) + ' · ' + (p.start || ''))]); }))]));
    var res = h('ul', { class: 'evs', 'aria-live': 'polite' });
    var qin = h('input', { type: 'search', placeholder: T('noteSearch'), 'aria-label': T('noteSearch'), oninput: function (e) {
      res.textContent = ''; var hits = C.searchNotes(state.packs, e.target.value, 30);
      hits.forEach(function (x) { res.appendChild(h('li', {}, [h('span', { class: 'ld' }, x.date), h('b', {}, x.student), h('span', { class: 'ln' }, x.note)])); });
      if (!hits.length && e.target.value.trim().length >= 2) res.appendChild(h('li', { class: 'note' }, T('noteNone')));
    } });
    box.appendChild(h('div', { class: 'card' }, [h('h3', {}, T('noteSearch')), qin, res]));
    var rows = C.studentStats(state.packs, today);
    box.appendChild(h('div', { class: 'card' }, [h('h3', {}, T('insStudents')), h('button', { class: 'ghost sm', style: 'margin-bottom:8px', onclick: function () { if (!state.pro) return needPro(); download('stampbook-stats.csv', C.statsCsv(state.packs, today), 'text/csv'); } }, T('statsCsvBtn')), h('ul', { class: 'evs' }, rows.map(function (r) {
      var bits = [T('stLessons', { n: r.lessons })];
      if (r.attendance !== null) bits.push(r.attendance + '% ' + T('stAttend'));
      if (r.last) bits.push(T('stLast') + ' ' + r.last);
      if (r.avgGap !== null) bits.push(T('stGap', { d: r.avgGap }));
      bits.push(money(r.spent, r.currency) + ' ' + T('stSpent'));
      return h('li', {}, [h('b', {}, r.student), h('span', { class: 'ln' }, bits.join(' · '))]);
    }))]));
    return box;
  }
  function renderList() {
    if (!listBox) return;
    var today = C.todayStr(), order = { low: 0, active: 1, expired: 2, done: 3 };
    listBox.textContent = '';
    var shown = state.packs.filter(function (p) { return C.matches(p, query) && (filter === 'all' || C.attention([p], today).length); })
      .sort(function (a, b) { return order[C.status(a, today)] - order[C.status(b, today)]; });
    shown.forEach(function (p) { listBox.appendChild(packCard(p, today)); });
    if (state.packs.length && !shown.length) listBox.appendChild(h('p', { class: 'note', role: 'status' }, T('noMatch')));
  }
  function upgradeDialog() {
    return h('dialog', { id: 'up', 'aria-labelledby': 'up-h' }, [
      h('h2', { id: 'up-h', style: 'font:700 22px var(--serif);margin:0 0 6px' }, T('upH')),
      h('p', {}, T('upB', { max: CFG.freeLimit })),
      h('ul', {}, [T('upL1'), T('upL2'), T('upL3')].map(function (x) { return h('li', {}, x); })),
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:16px' }, [
        h('button', { class: 'ghost', onclick: function () { document.getElementById('up').close(); } }, T('cancel')),
        h('button', { class: 'ghost', onclick: function () { document.getElementById('up').close(); document.getElementById('lic').scrollIntoView({ behavior: 'smooth' }); document.getElementById('lic').focus(); } }, T('haveKey')),
        h('a', { class: 'btnlink', href: CFG.checkoutUrl, target: '_blank', rel: 'noopener' }, T('upBuy'))])]);
  }
  function showUpgrade() { var d = document.getElementById('up'); if (d && d.showModal) d.showModal(); else toast(T('limit', { max: CFG.freeLimit })); }

  function packCard(p, today) {
    var st = C.status(p, today), rem = C.remaining(p), grid = h('div', { class: 'grid ink' + C.inkOf(p), role: 'group', 'aria-label': p.student });
    var cs = C.counted(p);
    for (var i = 0; i < p.total; i++) {
      (function (i) {
        var s = cs[i], isNext = !s && i === cs.length && st !== 'expired';
        grid.appendChild(h('button', {
          class: 'slot' + (s ? ' on' : '') + (isNext ? ' next' : '') + (s && s.id === fresh ? ' fresh' : ''), type: 'button',
          style: s ? '--r:' + (((i * 37) % 13) - 6) + 'deg' : false, title: s ? s.date : '',
          'aria-label': (i + 1) + '/' + p.total + (s ? ' · ' + s.date + (s.kind === 'noshow' ? ' · ' + T('kNoshow') : '') : ''),
          onclick: function () {
            if (s) { if (confirm(T('confStamp') + ' ' + s.date)) { C.removeStamp(p, s.id); save(); render(); } }
            else if (isNext) stamp(p, today);
          }
        }, s ? (s.kind === 'noshow' ? '✕' : s.date.slice(5).replace('-', '/')) : String(i + 1)));
      })(i);
    }
    var dl = C.daysLeft(p, today), soon = st === 'active' && dl !== null && dl <= 7;
    var exp = !p.expires ? T('noExp') : dl < 0 ? T('expOn', { date: p.expires }) : dl === 0 ? T('expToday') : T('expIn', { d: dl });
    var dateIn = h('input', { type: 'date', value: today, 'aria-label': T('stampOther') });
    var canStamp = rem > 0 && st !== 'expired';
    var rowEls = canStamp ? [h('button', { class: 'stampbtn', onclick: function () { stamp(p, today); } }, T('stampToday')), dateIn,
      h('button', { class: 'ghost', onclick: function () { if (dateIn.value) stamp(p, dateIn.value); } }, T('stampOther'))] : [];
    var more = [];
    if (canStamp) more.push(h('button', { class: 'ghost', title: T('noshowTip'), onclick: function () { stamp(p, dateIn.value || today, 'noshow'); } }, T('kNoshow')),
      h('button', { class: 'ghost', title: T('excusedTip'), onclick: function () { stamp(p, dateIn.value || today, 'excused'); } }, T('kExcused')));
    var owed = C.makeupsOwed(p);
    if (canStamp && owed > 0) more.push(h('button', { class: 'ghost mk', onclick: function () { stamp(p, dateIn.value || today, '', true); } }, T('mkBtn', { n: owed })));
    if (owed > 0 && !canStamp) more.push(h('span', { class: 'chip c-expired' }, T('mkOwed', { n: owed }) + ' · ' + T('mkClosed')));
    if (owed > 0) more.push(h('button', { class: 'ghost', title: T('mkWaiveTip'), onclick: function () { if (confirm(T('mkWaiveAsk', { n: owed }))) { C.waiveMakeups(p); save(); render(); } } }, T('mkWaive')));
    var pc = st === 'active' || st === 'low' ? C.pace(p, today) : null;
    var paceBar = pc && pc.atRisk ? h('p', { class: 'warnbar' }, [h('b', {}, T('paceH') + ': '), T('paceRisk', { date: pc.finish, exp: p.expires, n: Math.ceil(pc.needPerWeek * 10) / 10 })]) : null;
    var foot = [];
    if (st === 'low' || st === 'expired' || st === 'done') foot.push(h('button', { class: 'pri', onclick: function () { renewPack(p); } }, T('renewPack')));
    if (p.expires && st !== 'done') foot.push(h('button', { class: 'ghost', onclick: function () { var d = C.extend(p, 1, today); save(); render(); toast(T('extended', { date: d })); } }, T('extend')));
    foot.push(h('button', { class: 'ghost inkbtn', title: T('inkBtn'), onclick: function () { C.setInk(p, (C.inkOf(p) + 1) % C.INK_COUNT); save(); render(); } }, [h('span', { class: 'dot ink' + C.inkOf(p), 'aria-hidden': 'true' }), ' ' + T('inkBtn')]));
    foot.push(h('button', { class: 'ghost', onclick: function () { C.setPaid(p, p.paid === false); save(); render(); } }, T(p.paid === false ? 'markPaid' : 'markUnpaid')));
    foot.push(h('button', { class: 'ghost', onclick: function () { copy(reportText(p, today.slice(0, 7)), T('reportCopied')); } }, T('reportBtn')));
    if (st === 'low' || st === 'expired' || soon) foot.push(h('button', { class: 'ghost', onclick: function () { copy(T(p.expires ? 'remindExp' : 'remind', { name: p.student, n: rem, date: p.expires }), T('remindCopied')); } }, T('remindBtn')));
    foot.push(h('button', { class: 'ghost', onclick: function () { var v = prompt(T('nextPh', { max: C.NEXT_MAX }), p.next || ''); if (v !== null) { var tooLong = v.trim().length > C.NEXT_MAX; C.setNext(p, v); save(); render(); toast(tooLong ? T('nextCut', { max: C.NEXT_MAX }) : T('nextSaved')); } } }, T('nextBtn') + (p.next ? ' ✓' : '')));
    if (p.paid === false) foot.push(h('button', { class: 'ghost', onclick: function () { copy(T('payMsg', { name: p.student, total: p.total, price: money(p.price, p.currency) }), T('remindCopied')); } }, T('payBtn')));
    if (p.next) foot.push(h('button', { class: 'ghost', onclick: function () { copy(T('nextMsg', { name: p.student, note: p.next }), T('remindCopied')); } }, T('nextMsgBtn')));
    foot.push(h('button', { class: 'ghost', onclick: function () { copy(receiptText(p), T('receiptCopied')); } }, T('receiptBtn')), h('button', { class: 'ghost', onclick: function () { printReceipt(p); } }, T('printBtn')));
    foot.push(h('button', { class: 'ghost', onclick: function () { showQr(p); } }, 'QR' + (state.pro ? '' : ' · ' + T('pro'))));
    foot.push(h('button', { class: 'ghost', onclick: function () { shareLink(p); } }, T('share') + (state.pro ? '' : ' · ' + T('pro'))),
      h('button', { class: 'ghost', onclick: function () { renewNote(p); } }, T('renew')),
      h('button', { class: 'ghost', onclick: function () { deletePack(p); } }, T('del')));
    var log = h('details', { class: 'log' }, [h('summary', {}, T('hist') + ' (' + p.stamps.length + ')'),
      p.stamps.length ? h('ul', {}, p.stamps.slice().reverse().map(function (s) {
        return h('li', {}, [h('span', { class: 'ld' }, s.date), s.kind ? h('span', { class: 'tag t-' + s.kind }, T(s.kind === 'noshow' ? 'kNoshow' : 'kExcused')) : null, s.mk ? h('span', { class: 'tag t-mk' }, T('mkTag')) : null,
          h('span', { class: 'ln' }, s.note || ''),
          h('button', { class: 'ghost sm', 'aria-label': T('editNote') + ' ' + s.date, onclick: function () { var v = prompt(T('notePh'), s.note || ''); if (v !== null) { C.setNote(p, s.id, v); save(); render(); } } }, T('editNote'))]);
      })) : h('p', { class: 'note' }, T('histEmpty'))]);
    var sch = scheduleEditor(p);
    return h('section', { class: 'card ' + st, 'aria-label': p.student }, [
      h('div', { class: 'top' }, [h('h2', {}, p.student), h('span', {}, [p.paid === false ? h('span', { class: 'chip c-expired', style: 'margin-right:6px' }, T('unpaid')) : null, h('span', { class: 'chip c-' + st }, T('s_' + st))])]),
      h('div', { class: 'meta' }, [T('left', { n: rem }), h('span', { class: soon ? 'soon' : '' }, exp + (soon ? ' · ' + T('soon') : '')), money(p.price, p.currency)].reduce(function (a, x, i) { if (i) a.push(' · '); a.push(x); return a; }, [])),
      paceBar, grid, h('div', { class: 'row' }, rowEls), more.length ? h('div', { class: 'row', style: 'margin-top:8px' }, more) : null, sch, log,
      h('div', { class: 'foot' }, foot)
    ]);
  }
  function scheduleEditor(p) {
    var cur = p.schedule || { days: [], time: '' }, ws = weekStart(), sel = cur.days.slice(), time = h('input', { type: 'time', value: cur.time || '', 'aria-label': T('schedTime') });
    var btns = [0, 1, 2, 3, 4, 5, 6].map(function (i) { var d = (i + ws) % 7;
      var b = h('button', { type: 'button', class: 'ghost sm' + (sel.indexOf(d) !== -1 ? ' on' : ''), 'aria-pressed': String(sel.indexOf(d) !== -1), onclick: function () {
        var k = sel.indexOf(d); if (k === -1) sel.push(d); else sel.splice(k, 1);
        var on = k === -1; b.className = 'ghost sm' + (on ? ' on' : ''); b.setAttribute('aria-pressed', String(on)); } }, fmt({ weekday: 'short' }, C.addDays('2026-11-01', d)));
      return b; });
    var names = cur.days.map(function (d) { return fmt({ weekday: 'short' }, C.addDays('2026-11-01', d)); }).join(' ');
    return h('details', { class: 'sched' }, [h('summary', {}, T('schedH') + (names ? ' · ' + names + (cur.time ? ' ' + cur.time : '') : '')),
      h('p', { class: 'note' }, T('schedHint')), h('div', { class: 'row' }, btns),
      h('div', { class: 'row', style: 'margin-top:8px' }, [h('div', { style: 'flex:1;min-width:120px' }, time),
        h('button', { class: 'pri', onclick: function () { C.setSchedule(p, sel, time.value); save(); render(); toast(T('schedSaved')); } }, T('schedSave'))])]);
  }
  function doBackup() { download('stampbook-' + C.todayStr() + '.json', JSON.stringify(Object.assign({}, state, { lastBackup: Date.now() })), 'application/json'); state.lastBackup = Date.now(); save(); toast(T('backupDone')); render(); }
  function reportText(p, ym) {
    var r = C.report(p, ym, C.todayStr()), out = [T('reportHead', { name: p.student, month: fmt({ year: 'numeric', month: 'long' }, ym + '-01') })];
    if (!r.rows.length) out.push(T('reportNone'));
    r.rows.forEach(function (x) { out.push(x.date.slice(5).replace('-', '/') + (x.kind ? ' [' + T(x.kind === 'noshow' ? 'kNoshow' : 'kExcused') + ']' : '') + (x.note ? ' ' + x.note : '')); });
    out.push(T('reportLine', { n: r.lessons, a: r.noshow, b: r.excused, left: r.left, total: r.total }));
    if (r.owed) out.push(T('reportOwed', { n: r.owed }));
    if (r.expires) out.push(T('reportExp', { date: r.expires }));
    return out.join('\n');
  }
  function receiptText(p) {
    var r = C.receipt(p, state.teacher);
    return T('receiptT', { name: r.student, total: r.total, price: money(r.price, r.currency), per: money(r.perLesson, r.currency), status: T(r.paid ? 'receiptPaid' : 'receiptDue'), start: r.start || '-', exp: r.expires || T('receiptNoExp'), from: r.teacher ? T('receiptFrom', { t: r.teacher }) : '' }).replace(/\n+$/, '');
  }
  function printReceipt(p) {
    var old = document.getElementById('print-receipt'); if (old) old.remove();
    var box = h('pre', { id: 'print-receipt' }, receiptText(p)); document.body.appendChild(box); document.body.classList.add('printing');
    /* afterprint is unreliable on some mobile browsers, so a timer cleans up too */
    var end = function () { box.remove(); document.body.classList.remove('printing'); window.removeEventListener('afterprint', end); };
    window.addEventListener('afterprint', end); setTimeout(end, 30000); /* the class stays until afterprint (or this timer) because mobile browsers snapshot the page after print() returns */
    try { window.print(); } catch (e) { end(); return; }
  }
  /* delete is undoable for a few seconds instead of asking first: a mistaken tap loses nothing */
  function deletePack(p) {
    var at = state.packs.indexOf(p); if (at === -1) return;
    state.packs.splice(at, 1); save(); render();
    toast(T('delDone') + ': ' + p.student, T('undo'), function () { state.packs.splice(Math.min(at, state.packs.length), 0, p); save(); render(); }, true);
  }
  function renewPack(p) {
    if (!state.pro && activeCount() >= CFG.freeLimit && C.status(p) === 'active') return showUpgrade();
    if (!state.pro && activeCount() >= CFG.freeLimit && C.status(p) === 'low') return showUpgrade();
    var n = C.renew(p, C.todayStr()); state.packs.unshift(n); save(); render(); toast(T('renewed', { name: p.student }));
  }
  function stamp(p, date, kind, makeup) {
    if (!C.addStamp(p, date, '', kind, makeup)) return;
    var id = p.stamps.filter(function (x) { return x.date === date; }).pop().id;
    fresh = id; save(); render(); fresh = '';
    if (C.justCompleted(p, id)) { toast(T('packDone', { name: p.student }), T('undo'), function () { C.removeStamp(p, id); save(); render(); }); return; }
    toast(T('stamped', { date: date }), T('undo'), function () { C.removeStamp(p, id); save(); render(); });
  }
  function shareLink(p) {
    if (!state.pro) return needPro();
    var url = location.origin + location.pathname + '#c=' + C.encodeCard(p, state.teacher);
    if (p.next && !confirm(T('shareNoteAsk', { note: p.next }))) return;
    if (navigator.share && (/Mobi|Android/i.test(navigator.userAgent || '') || navigator.maxTouchPoints > 1)) navigator.share({ title: p.student, text: T('cardH') + ': ' + p.student, url: url }).catch(function (e) { if (e && e.name !== 'AbortError') copy(url, T('linkCopied')); });
    else copy(url, T('linkCopied'));
  }
  /* QR code of the balance link, drawn offline, so the card can be shown on the teacher's phone at the lesson */
  function showQr(p) {
    if (!state.pro) return needPro();
    if (!window.qrcode) return toast(T('qrErr'));
    var url = location.origin + location.pathname + '#c=' + C.encodeCard(p, state.teacher), img;
    if (url.length > 2000) return toast(T('qrErr'));
    try { var q = window.qrcode(0, 'L'); q.addData(url); q.make(); img = h('img', { src: q.createDataURL(6, 2), alt: T('qrAlt', { name: p.student }) }); }
    catch (e) { return toast(T('qrErr')); }
    var old = document.getElementById('qrdlg'); if (old) old.remove();
    var d = h('dialog', { id: 'qrdlg', 'aria-labelledby': 'qr-h' }, [h('div', { class: 'qrbox' }, [h('h2', { id: 'qr-h', style: 'font:700 20px var(--serif);margin:0 0 8px' }, p.student), img, h('p', { class: 'note' }, T('qrNote')),
      h('button', { class: 'pri', onclick: function () { d.close(); d.remove(); } }, T('qrClose'))])]);
    d.addEventListener('close', function () { d.remove(); });
    document.body.appendChild(d); if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  function renewNote(p) {
    var exp = p.expires ? T('renewExp', { date: p.expires }) : '';
    copy(T('renewMsg', { name: p.student, n: C.remaining(p), exp: exp }));
  }

  /* ---------- new pack dialog ---------- */
  function newDialog() {
    var f = {
      name: h('input', { id: 'f-name', required: 'required', maxlength: 80, autocomplete: 'off' }),
      total: h('input', { id: 'f-total', type: 'number', min: 1, max: 200, value: 10, inputmode: 'numeric', required: 'required' }),
      price: h('input', { id: 'f-price', type: 'number', min: 0, step: 'any', inputmode: 'decimal', required: 'required' }),
      cur: h('input', { id: 'f-cur', maxlength: 3, value: (state.packs[0] && state.packs[0].currency) || guessCur() }),
      start: h('input', { id: 'f-start', type: 'date', value: C.todayStr(), required: 'required' }),
      valid: h('input', { id: 'f-valid', type: 'number', min: 0, max: 60, value: 3, inputmode: 'numeric' })
    };
    function lab(id, key, el) { return [h('label', { for: id }, T(key)), el]; }
    var pre = C.presets(state.packs, 3), preRow = pre.length ? [h('div', { class: 'row presets', role: 'group', 'aria-label': T('presetH') }, pre.map(function (x) {
      return h('button', { type: 'button', class: 'ghost sm', onclick: function () { f.total.value = x.total; f.price.value = x.price; f.cur.value = x.currency || f.cur.value; f.valid.value = x.months; } },
        T('presetFmt', { n: x.total, price: money(x.price, x.currency), m: x.months })); }))] : [];
    var form = h('form', { method: 'dialog', onsubmit: function (e) {
      e.preventDefault();
      if (!state.pro && activeCount() >= CFG.freeLimit) { document.getElementById('dlg').close(); showUpgrade(); return; }
      var total = Math.round(+f.total.value), price = +f.price.value, months = Math.round(+f.valid.value) || 0;
      if (!f.name.value.trim() || !(total >= 1) || !(price >= 0) || !f.start.value) return;
      state.packs.unshift({ id: uid(), student: f.name.value.trim(), total: total, price: price, currency: (f.cur.value || 'USD').toUpperCase().slice(0, 3),
        start: f.start.value, months: months, expires: months > 0 ? C.addMonths(f.start.value, months) : '', stamps: [], paid: true });
      save(); render();
    } }, [].concat(preRow, lab('f-name', 'student', f.name),
      [h('div', { class: 'two' }, [h('div', {}, lab('f-total', 'lessons', f.total)), h('div', {}, lab('f-price', 'price', f.price))])],
      [h('div', { class: 'two' }, [h('div', {}, lab('f-cur', 'currency', f.cur)), h('div', {}, lab('f-start', 'start', f.start))])],
      lab('f-valid', 'valid', f.valid),
      [h('div', { class: 'row', style: 'margin-top:18px;justify-content:flex-end' }, [
        h('button', { type: 'button', class: 'ghost', onclick: function () { document.getElementById('dlg').close(); } }, T('cancel')),
        h('button', { type: 'submit', class: 'pri' }, T('save'))])]));
    return h('dialog', { id: 'dlg' }, form);
  }
  function guessCur() {
    var l = (navigator.language || 'en').toLowerCase();
    return l.indexOf('ko') === 0 ? 'KRW' : l.indexOf('ja') === 0 ? 'JPY' : l.indexOf('zh') === 0 ? 'CNY' : l.indexOf('es') === 0 ? 'EUR' : 'USD';
  }
  function openNew() {
    if (!state.pro && activeCount() >= CFG.freeLimit) { showUpgrade(); return; }
    var d = document.getElementById('dlg'); if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    document.getElementById('f-name').focus();
  }

  /* ---------- settings: teacher name, backup, csv, licence ---------- */
  function download(name, text, type) {
    var a = h('a', { href: URL.createObjectURL(new Blob([type === 'text/csv' ? '\uFEFF' + text : text], { type: type })), download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function settings() {
    var teacher = h('input', { id: 's-t', value: state.teacher || '', maxlength: 80, onchange: function (e) { state.teacher = e.target.value.trim(); save(); } });
    var file = h('input', { type: 'file', accept: 'application/json', style: 'display:none', onchange: function (e) {
      var fl = e.target.files[0]; if (!fl) return; var r = new FileReader();
      r.onload = function () {
        try {
          var o = JSON.parse(r.result); if (!o || !Array.isArray(o.packs)) throw 0;
          o.packs = o.packs.filter(function (p) { return p && typeof p.student === 'string' && p.total > 0 && Array.isArray(p.stamps); });
          if (state.packs.length && confirm(T('mergeAsk'))) { var mg = C.mergePacks(state.packs, o.packs); state.packs = mg.packs; save(); render(); return toast(T('merged', { a: mg.added, m: mg.merged })); }
          var keep = { pro: state.pro, key: state.key, licMode: state.licMode, instanceId: state.instanceId, licChecked: state.licChecked }; state = Object.assign({ teacher: '', lang: '' }, o, keep); save(); render(); toast(T('restored'));
        } catch (x) { toast(T('badFile')); }
      }; r.readAsText(fl);
    } });
    var key = h('input', { id: 'lic', placeholder: T('licPh'), autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false' });
    var cloudPanel = cloud && window.CloudPanel ? window.CloudPanel.build({ cloud: cloud, lang: function () { return lang; } }) : null;
    return h('div', { class: 'settings' }, [
      h('label', { for: 's-t' }, T('teacher')), teacher,
      h('div', { class: 'row', role: 'group', 'aria-label': T('theme'), style: 'margin:14px 0 0' }, [h('span', { class: 'note' }, T('theme') + ':')].concat([['', 'themeAuto'], ['light', 'themeLight'], ['dark', 'themeDark']].map(function (x) {
        var on = (state.theme || '') === x[0];
        return h('button', { class: 'ghost sm' + (on ? ' on' : ''), 'aria-pressed': String(on), onclick: function () { if (x[0]) state.theme = x[0]; else delete state.theme; applyTheme(); save(); render(); } }, T(x[1])); }))),
      h('div', { class: 'row', style: 'margin:14px 0' }, [
        h('button', { class: 'ghost', onclick: doBackup }, T('exp')),
        h('button', { class: 'ghost', onclick: function () { var ics = C.toIcs(state.packs, C.todayStr(), 120, Date.now()); if (ics.indexOf('BEGIN:VEVENT') === -1) return toast(T('icsEmpty')); download('stampbook-lessons.ics', ics, 'text/calendar'); } }, T('icsBtn') + ' (.ics)'),
        h('button', { class: 'ghost', onclick: function () { file.click(); } }, T('imp')), file,
        h('button', { class: 'ghost', onclick: function () { if (!state.pro) return needPro(); download('stampbook.csv', C.toCsv(state.packs), 'text/csv'); } }, T('csv')),
        h('button', { class: 'ghost', onclick: function () { if (!state.pro) return needPro(); var ym = C.todayStr().slice(0, 7); download('stampbook-' + ym + '.csv', C.monthReport(state.packs, ym), 'text/csv'); } }, T('monthCsv'))
      ]),
      cloudPanel ? h('div', { style: 'margin:14px 0' }, [cloudPanel.el]) : null,
      state.pro ? null : h('div', {}, [
        h('label', { for: 'lic' }, T('lic')),
        h('div', { class: 'row' }, [key,
          h('button', { id: 'act', class: 'pri', onclick: function () { activate(key.value); } }, T('activate'))]),
        h('p', {}, [h('a', { href: CFG.checkoutUrl, rel: 'noopener', target: '_blank' }, T('upgrade'))])
      ])
    ]);
  }

  /* Licence: the server function checks the key with the payment provider when it is configured. If it answers
     {configured:false} (or is not there), the older offline checksum is used. A network failure never falls back. */
  function callLicense(body) {
    var ctl = window.AbortController ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 10000) : 0;
    return fetch('/api/license', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }, function (e) { if (e && e.name === 'AbortError') throw e; return { status: r.status, j: null }; }); })
      .then(function (x) { clearTimeout(timer); return x; }, function (e) { clearTimeout(timer); throw e; });
  }
  function grant(mode, key, instanceId) { state.pro = true; state.key = key; state.licMode = mode; state.instanceId = instanceId || ''; state.licChecked = Date.now(); save(); render(); toast(T('okKey')); }
  function activate(raw) {
    var key = String(raw || '').trim();
    if (!key) return toast(T('badKey'));
    callLicense({ action: 'activate', key: key }).then(function (r) {
      if (r.j && r.j.configured === true) {
        if (r.status === 502 || (r.j.reason === 'unreachable')) return toast(T('netErr'));
        return r.j.ok ? grant('server', key, r.j.instanceId) : toast(T('badKey'));
      }
      if (C.validKey(key)) grant('offline', key.toUpperCase()); else toast(T('badKey'));
    }, function (err) {
      if (err && err.name === 'AbortError') return toast(T('netTimeout'));
      /* no server function reachable at all: only the offline scheme can be checked, and only when the app is served without one */
      if (!navigator.onLine) return toast(T('netErr'));
      if (C.validKey(key)) grant('offline', key.toUpperCase()); else toast(T('badKey'));
    });
  }
  /* once a week, ask the server whether a server-activated key is still good; only an explicit "invalid" removes Pro */
  function recheck() {
    if (!state.pro || state.licMode !== 'server' || !state.instanceId || Date.now() - (state.licChecked || 0) < 7 * 86400000) return;
    callLicense({ action: 'validate', key: state.key, instanceId: state.instanceId }).then(function (r) {
      if (!r.j || r.j.configured !== true || r.status === 502) return;
      if (r.j.ok) { state.licChecked = Date.now(); save(); }
      else if (r.j.reason === 'invalid' || r.j.reason === 'refunded') { state.pro = false; save(); render(); toast(T('badKey')); }
    }, function () {});
  }

  window.addEventListener('hashchange', render);
  render();
  recheck();
  if (cloud && cloud.user()) cloud.sync().then(function (r) { if (r.status === 'pulled') toast(window.CloudI18n.t(lang, 'pulled')); });
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
