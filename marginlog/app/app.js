/* Marginlog UI. No framework: string templates + event delegation. Strict CSP friendly (no inline handlers). */
(function () {
  'use strict';
  var C = window.MLCore, I = window.MLI18n, KEY = 'marginlog:v1';
  var S = { cases: [], cur: null, tab: 'log', lang: 'en', f: { q: '', tag: '', sev: 0, voided: false } };
  var blocked = false, corruptKey = null, lastTrig = null, root = document.getElementById('root'), pending = { photos: [] }, toastTimer = null, liveTimer = null, undoBuf = null;

  function t(k, v) {
    var s = (I.L[S.lang] && I.L[S.lang][k]); if (s == null) s = I.L.en[k]; if (s == null) return k;
    if (v) for (var x in v) s = s.split('{' + x + '}').join(v[x]);
    return s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, el) { return (el || document).querySelector(sel); }
  function cur() { return S.cases.filter(function (c) { return c.id === S.cur; })[0] || null; }
  function now() { return Date.now(); }

  /* ---------- storage ---------- */
  var CPKEY = KEY + ':cp';
  function readCp() { try { return JSON.parse(localStorage.getItem(CPKEY) || '{}') || {}; } catch (e) { return {}; } }
  function load() {
    var raw = null, d = null;
    try { raw = localStorage.getItem(KEY); d = raw ? JSON.parse(raw) : null; } catch (e) { d = undefined; }
    if (d === undefined || (d && !Array.isArray(d.cases))) {
      /* unreadable data: keep a copy first and refuse to overwrite it if the copy fails */
      try { corruptKey = KEY + ':corrupt-' + Date.now(); localStorage.setItem(corruptKey, raw); } catch (e2) { corruptKey = null; blocked = true; }
    } else if (d) { S.cases = d.cases.map(C.sanitizeCase).filter(Boolean); S.cur = d.cur; S.lang = I.L[d.lang] ? d.lang : S.lang; }
    if (!S.cases.some(function (c) { return c.id === S.cur; })) S.cur = (S.cases.filter(function (c) { return !c.archived; })[0] || S.cases[0] || {}).id || null;
  }
  function save() {
    if (blocked) { toast(t('corruptBlocked')); return false; }
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, lang: S.lang, cur: S.cur, cases: S.cases }));
      var cp = {}; S.cases.forEach(function (c) { if (c.entries.length) cp[c.id] = { n: c.entries.length, head: c.entries[c.entries.length - 1].hash }; });
      localStorage.setItem(CPKEY, JSON.stringify(cp)); return true;
    } catch (e) { toast(t('saveFail')); return false; }
  }
  var db = null;
  function idb() {
    if (db) return db;
    db = new Promise(function (res, rej) {
      try {
        var r = indexedDB.open('marginlog', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('photos'); };
        r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
      } catch (e) { rej(e); }
    });
    return db;
  }
  function photoPut(id, data) { return idb().then(function (d) { return new Promise(function (res, rej) { var q = d.transaction('photos', 'readwrite').objectStore('photos').put(data, id); q.onsuccess = res; q.onerror = function () { rej(q.error); }; }); }); }
  function photoDel(id) { return idb().then(function (d) { d.transaction('photos', 'readwrite').objectStore('photos').delete(id); }, function () { /* no store */ }); }
  function photoSweep() {
    var used = {}; S.cases.forEach(function (c) { c.entries.forEach(function (e) { e.photos.forEach(function (p) { used[p.id] = 1; }); }); });
    if (blocked) return;
    idb().then(function (d) { var q = d.transaction('photos').objectStore('photos').getAllKeys(); q.onsuccess = function () { q.result.forEach(function (k) { if (!used[k]) photoDel(k); }); }; }, function () { /* no store */ });
  }
  function photoGet(id) { return idb().then(function (d) { return new Promise(function (res) { var q = d.transaction('photos').objectStore('photos').get(id); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; }); }, function () { return null; }); }

  /* ---------- helpers ---------- */
  function fmtAt(at) { var p = C.parseAt(at); return p ? t('days')[p.dow] + ' ' + p.day + ' ' + C.pad(p.h) + ':' + C.pad(p.mi) : at; }
  function fmtDur(m) { return m >= 60 ? Math.floor(m / 60) + ' ' + t('hShort') + (m % 60 ? ' ' + (m % 60) + ' ' + t('min') : '') : m + ' ' + t('min'); }
  function toast(msg, action, fn) {
    var el = $('#toast'); if (!el) return;
    el.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? ' <button type="button" id="toast-act">' + esc(action) + '</button>' : '');
    el.hidden = false; clearTimeout(toastTimer);
    if (action) $('#toast-act').addEventListener('click', function () { fn(); el.hidden = true; });
    toastTimer = setTimeout(function () { el.hidden = true; undoBuf = null; }, action ? 9000 : 6000);
  }
  function download(name, mime, text) {
    var a = document.createElement('a'), u = URL.createObjectURL(new Blob([text], { type: mime }));
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 500);
  }
  function labels() {
    return { counterpart: t('counterpart'), goal: t('goal'), generated: t('generated'), summary: t('summary'), total: t('stTotal'), last30: t('stLast30'), prev30: t('stPrev30'), avgSev: t('stAvg'), minutes: t('stMinutes'), quietHits: t('stQuiet'), pattern: t('pattern'), days: t('days'), timeline: t('timeline'), sev: t('sevWord'), late: t('lateBadge'), witness: t('witness'), photos: t('photos'), reportedTo: t('reportedBadge'), voidedBadge: t('voidedBadge'), steps: t('stepsH'), stepNames: I.stepNames(S.lang), due: t('dueWord'), answered: t('answered'), integrity: t('integrity'), chainOk: t('chainOk'), chainBad: t('chainBad') };
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9぀-ヿ㐀-鿿가-힯]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'case'; }

  /* ---------- render ---------- */
  function render() {
    document.documentElement.lang = S.lang; document.title = 'Marginlog';
    var c = cur(), h = '<header class="top"><h1>Marginlog</h1><div class="topbtns"><label class="sr" for="lang">' + esc(t('language')) + '</label><select id="lang">' +
      Object.keys(I.L).map(function (k) { return '<option value="' + k + '"' + (k === S.lang ? ' selected' : '') + '>' + esc(I.L[k].name) + '</option>'; }).join('') +
      '</select><button type="button" class="ghost" data-act="data">' + esc(t('dataBtn')) + '</button></div></header>';
    h += '<main id="main">';
    h += c ? caseView(c) : emptyView();
    h += '</main><footer class="foot"><p>' + esc(t('privacy')) + '</p><p>' + esc(t('disclaimer')) + '</p></footer>';
    root.innerHTML = h;
    hydratePhotos(); startLiveTick();
  }
  function emptyView() {
    var h = '<section class="empty"><h2>' + esc(t('emptyH')) + '</h2><p>' + esc(t('emptyB')) + '</p><div class="kinds">';
    Object.keys(C.KINDS).forEach(function (k) { h += '<button type="button" class="kind" data-act="newcase" data-kind="' + k + '"><b>' + esc(t('kind_' + k)) + '</b><span>' + esc(t('kindHint_' + k)) + '</span></button>'; });
    h += '</div><p class="hint">' + esc(t('sealHint')) + '</p></section>';
    return h;
  }
  function caseView(c) {
    var st = C.stats(c, now()), sg = C.suggestNext(c, now()), act = S.cases;
    var h = '<div class="caserow"><label class="sr" for="casesel">' + esc(t('caseSel')) + '</label><select id="casesel">' +
      act.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === c.id ? ' selected' : '') + '>' + esc(x.name) + (x.archived ? ' (' + esc(t('archivedWord')) + ')' : '') + '</option>'; }).join('') +
      '</select><button type="button" class="ghost" data-act="newcase" data-kind="">' + esc(t('newCase')) + '</button></div>';
    h += '<section class="hero" aria-labelledby="hero-h"><h2 id="hero-h" class="sr">' + esc(c.name) + '</h2>';
    if (!st.total) h += '<p class="big">' + esc(t('noneYet')) + '</p>';
    else h += '<p class="big"><span class="digits">' + st.sinceDays + '</span> ' + esc(t(st.sinceDays === 1 ? 'daySince1' : 'daysSince')) + '</p>';
    h += '<dl class="mini"><div><dt>' + esc(t('stTotal')) + '</dt><dd>' + st.total + '</dd></div><div><dt>' + esc(t('stLast30')) + '</dt><dd>' + st.last30 + (st.trend !== 'flat' ? ' <span class="tr ' + st.trend + '" title="' + esc(t('trend_' + st.trend)) + '">' + (st.trend === 'up' ? '▲' : '▼') + '<span class="sr"> ' + esc(t('trend_' + st.trend)) + '</span></span>' : '') + '</dd></div><div><dt>' + esc(t('stAvg')) + '</dt><dd>' + (st.avgSev || '–') + '</dd></div><div><dt>' + esc(t('strengthWord')) + '</dt><dd>' + (st.total ? C.caseStrength(c) + '%' : '–') + '</dd></div></dl>';
    h += suggestion(c, sg) + '</section>';
    if (c.live) h += '<section class="live" aria-live="off"><p><b>' + esc(t('liveOn')) + '</b> <span id="live-clock" data-start="' + c.live.start + '">00:00</span></p><div class="btns"><button type="button" class="pri" data-act="livestop">' + esc(t('liveStop')) + '</button><button type="button" class="ghost" data-act="livedrop">' + esc(t('liveDrop')) + '</button></div></section>';
    else h += '<div class="actions"><button type="button" class="pri" data-act="log">' + esc(t('logBtn')) + '</button><button type="button" class="sec" data-act="livestart">' + esc(t('liveStart')) + '</button></div>';
    h += '<nav class="tabs" role="tablist" aria-label="' + esc(t('sections')) + '">' + ['log', 'patterns', 'steps', 'report', 'case'].map(function (k) { return '<button type="button" role="tab" id="tab-' + k + '" aria-selected="' + (S.tab === k) + '" tabindex="' + (S.tab === k ? 0 : -1) + '" aria-controls="panel" data-act="tab" data-tab="' + k + '" class="tab' + (S.tab === k ? ' on' : '') + '">' + esc(t('tab_' + k)) + '</button>'; }).join('') + '</nav>';
    h += '<section id="panel" role="tabpanel" aria-labelledby="tab-' + S.tab + '">' + ({ log: logTab, patterns: patternsTab, steps: stepsTab, report: reportTab, 'case': caseTab }[S.tab])(c) + '</section>';
    return h;
  }
  function suggestion(c, sg) {
    var names = I.stepNames(S.lang);
    if (sg.key === 'none') return '<p class="sugg">' + esc(t('sg_none')) + '</p>';
    var sn = names[(sg.kind || (sg.step && sg.step.kind))] || '', msg = t('sg_' + sg.key, { step: (S.lang === 'en' || S.lang === 'es') && (I.L[S.lang]['sg_' + sg.key] || '').indexOf('{step}') !== 0 ? sn.toLowerCase() : sn, date: sg.step ? sg.step.due : '' });
    return '<p class="sugg ' + (sg.key === 'overdue' ? 'warn' : '') + '"><b>' + esc(t('nextStep')) + '</b> ' + esc(msg) + (sg.kind ? ' <button type="button" class="link" data-act="addstep" data-kind="' + sg.kind + '">' + esc(t('logStep')) + '</button>' : '') + (sg.step ? ' <button type="button" class="link" data-act="stepdone" data-id="' + esc(sg.step.id) + '">' + esc(t('markAnswered')) + '</button>' : '') + '</p>';
  }

  function matches(e, c) {
    var f = S.f; if (f.sev && e.sev < f.sev) return false;
    if (f.tag && e.tags.indexOf(f.tag) < 0) return false;
    if (f.q) { var q = f.q.toLowerCase(); if ((e.text + ' ' + e.witness + ' ' + e.tags.join(' ') + ' ' + C.addenda(c.entries, e.id).map(function (n) { return n.text; }).join(' ')).toLowerCase().indexOf(q) < 0) return false; }
    return true;
  }
  function logTab(c) {
    var v = C.voidedIds(c.entries), all = c.entries.filter(function (e) { return e.type === 'event' && (S.f.voided || !v[e.id]); });
    if (!all.length) return '<div class="empty small"><h3>' + esc(t('logEmptyH')) + '</h3><p>' + esc(t('logEmptyB')) + '</p></div>';
    var tags = {}; C.events(c.entries).forEach(function (e) { e.tags.forEach(function (x) { tags[x] = 1; }); });
    var list = all.filter(function (e) { return matches(e, c); }).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    var h = '<form class="filters" role="search" id="filters" autocomplete="off"><label class="sr" for="fq">' + esc(t('search')) + '</label><input id="fq" type="search" placeholder="' + esc(t('search')) + '" value="' + esc(S.f.q) + '" maxlength="60">' +
      '<label class="sr" for="ftag">' + esc(t('tagsWord')) + '</label><select id="ftag"><option value="">' + esc(t('anyTag')) + '</option>' + Object.keys(tags).sort().map(function (x) { return '<option' + (S.f.tag === x ? ' selected' : '') + ' value="' + esc(x) + '">' + esc(x) + '</option>'; }).join('') + '</select>' +
      '<label class="sr" for="fsev">' + esc(t('sevWord')) + '</label><select id="fsev"><option value="0">' + esc(t('anySev')) + '</option>' + [2, 3, 4, 5].map(function (n) { return '<option' + (S.f.sev === n ? ' selected' : '') + ' value="' + n + '">' + esc(t('sevMin', { n: n })) + '</option>'; }).join('') + '</select>' +
      '<label class="chk"><input type="checkbox" id="fvoid"' + (S.f.voided ? ' checked' : '') + '> ' + esc(t('showVoided')) + '</label></form>';
    if (!list.length) return h + '<div class="empty small"><p>' + esc(t('noMatch')) + '</p><button type="button" class="ghost" data-act="clearf">' + esc(t('clearFilters')) + '</button></div>';
    h += '<p class="count" role="status">' + esc(t('showing', { n: list.length, t: all.length })) + '</p><ol class="entries">';
    list.forEach(function (e) {
      var s = C.strength(e), isV = !!v[e.id], notes = C.addenda(c.entries, e.id), p = C.parseAt(e.at), quiet = p && C.inQuiet(p.h, c.quiet);
      h += '<li class="entry' + (isV ? ' voided' : '') + '" data-id="' + esc(e.id) + '"><div class="eh"><b>' + esc(fmtAt(e.at)) + '</b>' + (e.sev ? '<span class="sev s' + e.sev + '" title="' + esc(t('sevWord') + ' ' + e.sev + '/5') + '"><span aria-hidden="true">' + '●'.repeat(e.sev) + '○'.repeat(5 - e.sev) + '</span><span class="sr">' + esc(t('sevWord') + ' ' + e.sev + '/5') + '</span></span>' : '') + (e.dur ? '<span class="pill">' + esc(fmtDur(e.dur)) + '</span>' : '') +
        (C.isLate(e) ? '<span class="pill warn" title="' + esc(t('lateHint')) + '">' + esc(t('lateBadge')) + '</span>' : '') + (quiet ? '<span class="pill">' + esc(t('quietBadge')) + '</span>' : '') + (e.reported ? '<span class="pill ok">' + esc(t('reportedBadge')) + '</span>' : '') + (isV ? '<span class="pill warn">' + esc(t('voidedBadge')) + '</span>' : '') + '</div>' +
        '<p class="et">' + esc(e.text) + '</p>' +
        (e.tags.length ? '<p class="tg">' + e.tags.map(function (x) { return '<span class="tag">#' + esc(x) + '</span>'; }).join(' ') + '</p>' : '') +
        (e.witness ? '<p class="wit">' + esc(t('witness')) + ': ' + esc(e.witness) + '</p>' : '') +
        (e.photos.length ? '<div class="ph">' + e.photos.map(function (p2) { return '<button type="button" class="thumb" data-act="photo" data-pid="' + esc(p2.id) + '" aria-label="' + esc(t('openPhoto')) + '"><img alt="" data-pid="' + esc(p2.id) + '" width="64" height="64"></button>'; }).join('') + '</div>' : '') +
        notes.map(function (n) { return '<p class="note"><span>+ ' + esc(fmtAt(n.at)) + '</span> ' + esc(n.text) + '</p>'; }).join('') +
        (isV ? '<p class="note">' + esc(t('voidReason')) + ': ' + esc(v[e.id].text) + '</p>' : '') +
        '<div class="meter" title="' + esc(t('strengthWord')) + '"><span class="bar"><i style="width:' + s.score + '%"></i></span><span class="sc">' + esc(t('strengthWord')) + ' ' + s.score + '%</span></div>' +
        (!isV && s.tips.length ? '<p class="tips">' + esc(t('improve')) + ' ' + s.tips.slice(0, 3).map(function (x) { return esc(t('tip_' + x)); }).join(' · ') + '</p>' : '') +
        (!isV ? '<div class="btns sm"><button type="button" class="ghost" data-act="note" data-id="' + esc(e.id) + '">' + esc(t('addNote')) + '</button><button type="button" class="ghost danger" data-act="void" data-id="' + esc(e.id) + '">' + esc(t('voidBtn')) + '</button></div>' : '') +
        '</li>';
    });
    return h + '</ol>';
  }
  function wlabel(ts) { try { return new Intl.DateTimeFormat(S.lang, { month: 'numeric', day: 'numeric' }).format(new Date(ts)); } catch (e) { return C.toLocalStamp(new Date(ts)).slice(5, 10); } }
  function patternsTab(c) {
    var evs = C.events(c.entries), st = C.stats(c, now());
    if (evs.length < 2) return '<div class="empty small"><h3>' + esc(t('patEmptyH')) + '</h3><p>' + esc(t('patEmptyB')) + '</p></div>';
    var hm = C.heatmap(evs), wk = C.weekly(evs, now(), 8), tb = C.topBand(evs), maxW = Math.max.apply(null, wk.map(function (w) { return w.n; })) || 1;
    var h = '<h3>' + esc(t('patH')) + '</h3>';
    if (tb) h += '<p class="insight">' + esc(t('patSentence', { day: t('days')[tb.dow], dshare: tb.dowShare, a: C.pad(tb.from) + ':00', b: C.pad(tb.to) + ':00', hshare: tb.hourShare })) + '</p>';
    h += '<div class="hm" aria-hidden="true"><div class="hmrow hmhead"><span></span>' + [0, 3, 6, 9, 12, 15, 18, 21].map(function (x) { return '<span class="hl" style="grid-column:' + (x + 2) + ' / span 3">' + C.pad(x) + '</span>'; }).join('') + '</div>';
    hm.grid.forEach(function (row, d) {
      h += '<div class="hmrow"><span class="dl">' + esc(t('days')[d]) + '</span>' + row.map(function (n, hr) { return '<i class="hc' + '' + '" style="opacity:' + (n ? (0.3 + 0.7 * n / hm.max).toFixed(2) : 0.1) + '" title="' + esc(t('days')[d] + ' ' + C.pad(hr) + ':00 – ' + n) + '"></i>'; }).join('') + '</div>';
    });
    if (c.quiet) h += '<div class="hmrow"><span class="dl">' + esc(t('quietShort')) + '</span>' + hm.grid[0].map(function (n, hr) { return '<i class="qb' + (C.inQuiet(hr, c.quiet) ? ' on' : '') + '"></i>'; }).join('') + '</div>';
    h += '</div><ul class="sr" aria-label="' + esc(t('heatAria')) + '">'; hm.grid.forEach(function (row, d) { row.forEach(function (n, hr) { if (n) h += '<li>' + esc(t('days')[d] + ' ' + C.pad(hr) + ':00 – ' + n) + '</li>'; }); }); h += '</ul><p class="cap">' + esc(t('heatCap')) + (c.quiet ? ' ' + esc(t('heatQuiet')) : '') + '</p>';
    h += '<h3>' + esc(t('weeksH')) + '</h3><ul class="sr" aria-label="' + esc(t('weeksAria')) + '">' + wk.map(function (w) { return '<li>' + esc(wlabel(w.start) + ': ' + w.n) + '</li>'; }).join('') + '</ul><div class="wk" aria-hidden="true">' + wk.map(function (w) {
      var d = new Date(w.start); return '<div class="wc"><span class="wn">' + w.n + '</span><i style="height:' + Math.round(6 + 64 * w.n / maxW) + 'px" title="' + esc(w.n + ' · ' + wlabel(w.start)) + '"></i><span class="wd">' + wlabel(w.start) + '</span></div>';
    }).join('') + '</div>';
    h += '<h3>' + esc(t('factsH')) + '</h3><ul class="facts"><li>' + esc(t('fact_total', { n: st.total, a: st.first.slice(0, 10), b: st.last.slice(0, 10) })) + '</li><li>' + esc(t('fact_gap', { n: st.longestGap })) + '</li>' +
      (st.minutes ? '<li>' + esc(t('fact_minutes', { n: st.minutes, h: Math.round(10 * st.minutes / 60) / 10 })) + '</li>' : '') +
      (c.quiet ? '<li>' + esc(t('fact_quiet', { n: st.quiet, a: C.pad(c.quiet[0]) + ':00', b: C.pad(c.quiet[1]) + ':00' })) + '</li>' : '') +
      (st.late ? '<li>' + esc(t('fact_late', { n: st.late })) + '</li>' : '') +
      '<li>' + esc(t('fact_trend_' + st.trend, { a: st.last30, b: st.prev30 })) + '</li></ul>';
    return h;
  }
  function stepsTab(c) {
    var names = I.stepNames(S.lang), done = {}; (c.steps || []).forEach(function (s) { done[s.kind] = 1; });
    var h = '<h3>' + esc(t('ladderH')) + '</h3><ol class="ladder">' + C.ladder(c).map(function (k, i) { return '<li class="' + (done[k] ? 'dn' : '') + '"><span class="num">' + (done[k] ? '✓' : i + 1) + '</span><div><b>' + esc(names[k]) + '</b><span>' + esc(t('stepHint_' + k)) + '</span></div><button type="button" class="ghost" data-act="addstep" data-kind="' + k + '">' + esc(t('logStep')) + '</button></li>'; }).join('') + '</ol>';
    h += '<h3>' + esc(t('stepsH')) + '</h3>';
    if (!(c.steps || []).length) return h + '<div class="empty small"><p>' + esc(t('stepsEmpty')) + '</p></div>';
    h += '<ul class="steps">' + c.steps.slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; }).map(function (s) {
      var overdue = s.due && !s.done && s.due < C.toLocalStamp(new Date(now())).slice(0, 10);
      return '<li><div><b>' + esc(names[s.kind]) + '</b> · ' + esc(s.at) + (s.note ? '<br>' + esc(s.note) : '') + (s.due ? '<br><span class="pill' + (overdue ? ' warn' : '') + '">' + esc(t('dueWord')) + ' ' + esc(s.due) + (s.done ? ' · ' + esc(t('answered')) : overdue ? ' · ' + esc(t('overdueWord')) : '') + '</span>' : '') + '</div><div class="btns sm">' + (s.due && !s.done ? '<button type="button" class="ghost" data-act="stepdone" data-id="' + esc(s.id) + '">' + esc(t('markAnswered')) + '</button>' : '') + '<button type="button" class="ghost danger" data-act="stepdel" data-id="' + esc(s.id) + '">' + esc(t('delete')) + '</button></div></li>';
    }).join('') + '</ul>';
    return h;
  }
  function reportTab(c) {
    var evs = C.events(c.entries);
    if (!evs.length) return '<div class="empty small"><h3>' + esc(t('repEmptyH')) + '</h3><p>' + esc(t('repEmptyB')) + '</p></div>';
    return '<div class="btns wrap"><button type="button" class="pri" data-act="copyrep">' + esc(t('copyRep')) + '</button><button type="button" class="sec" data-act="print">' + esc(t('printRep')) + '</button><button type="button" class="ghost" data-act="dlmd">' + esc(t('dlMd')) + '</button><button type="button" class="ghost" data-act="dlcsv">' + esc(t('dlCsv')) + '</button></div>' +
      '<p class="hint">' + esc(t('repHint')) + '</p><p id="chainline" class="chain" role="status">' + esc(t('verifying')) + '</p><button type="button" class="ghost" data-act="verify">' + esc(t('verifyNow')) + '</button><pre id="repview" class="rep" tabindex="0" aria-label="' + esc(t('tab_report')) + '"></pre><div id="repphotos" class="repphotos"></div>';
  }
  function caseTab(c) {
    var h = '<form id="caseform-inline" class="form" autocomplete="off"><p class="hint">' + esc(t('kind_' + c.kind)) + '</p><button type="button" class="sec" data-act="editcase">' + esc(t('editCase')) + '</button></form>';
    h += '<p class="hint">' + esc(t('sealExplain')) + '</p><div class="btns wrap"><button type="button" class="ghost" data-act="archive">' + esc(c.archived ? t('unarchive') : t('archive')) + '</button><button type="button" class="ghost danger" data-act="delcase">' + esc(t('deleteCase')) + '</button></div>';
    return h;
  }

  /* ---------- photos ---------- */
  function hydratePhotos() {
    var imgs = root.querySelectorAll('img[data-pid]');
    Array.prototype.forEach.call(imgs, function (img) { photoGet(img.getAttribute('data-pid')).then(function (d) { if (d) img.src = d; else img.alt = t('photoMissing'); }); });
  }
  function readPhoto(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('read')); };
      fr.onload = function () {
        var im = new Image();
        im.onerror = function () { rej(new Error('image')); };
        im.onload = function () {
          var max = 1280, k = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(im.width * k)); cv.height = Math.max(1, Math.round(im.height * k));
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', 0.8));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- dialogs ---------- */
  var dlg = null;
  function openDialog(html, onSubmit, opts) {
    closeDialog();
    dlg = document.createElement('dialog'); dlg.className = 'dlg'; dlg.setAttribute('aria-labelledby', 'dlg-h');
    dlg.innerHTML = '<form method="dialog" novalidate>' + html + '</form>';
    document.body.appendChild(dlg);
    var form = $('form', dlg);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault(); if (!onSubmit || form.__busy) return; form.__busy = true;
      var btns = form.querySelectorAll('button[type=submit]'); Array.prototype.forEach.call(btns, function (b) { b.disabled = true; });
      var done = function () { form.__busy = false; Array.prototype.forEach.call(btns, function (b) { b.disabled = false; }); };
      var fail = function () { err(t(window.crypto && window.crypto.subtle ? 'saveFail' : 'cryptoFail')); };
      var r; try { r = onSubmit(form, ev); } catch (e) { done(); return fail(); }
      Promise.resolve(r).catch(fail).then(done);
    });
    dlg.addEventListener('cancel', function () { pending.photos = []; });
    dlg.addEventListener('close', function () { if (dlg) { dlg.remove(); dlg = null; } setTimeout(restoreFocus, 0); });
    $('[data-close]', dlg) && Array.prototype.forEach.call(dlg.querySelectorAll('[data-close]'), function (b) { b.addEventListener('click', function () { pending.photos = []; closeDialog(); }); });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    var first = $((opts && opts.focus) || 'input,textarea,select,button', dlg); first && first.focus();
    return dlg;
  }
  function restoreFocus() {
    if (!lastTrig) return; var a = lastTrig.split('|'), el = (a[1] && $('[data-act="' + a[0] + '"][data-id="' + a[1] + '"]')) || $('[data-act="' + a[0] + '"]') || $('#main');
    if (el && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('dialog'))) { if (el.id === 'main') el.setAttribute('tabindex', '-1'); el.focus(); }
  }
  function closeDialog() { if (dlg) { try { dlg.close(); } catch (e) { /* already closed */ } if (dlg) { dlg.remove(); dlg = null; } } }
  function err(msg) { var e = $('.err', dlg); if (e) { e.textContent = msg; e.hidden = !msg; } }
  function btnRow(saveKey) { return '<p class="err" role="alert" hidden></p><div class="btns"><button type="submit" class="pri">' + esc(t(saveKey || 'save')) + '</button><button type="button" class="ghost" data-close>' + esc(t('cancel')) + '</button></div>'; }

  function entryDialog(c, pre) {
    pre = pre || {}; pending.photos = [];
    var kind = C.KINDS[c.kind], nowStamp = C.toLocalStamp(new Date(now()));
    var sugg = kind.tags.map(function (x) { return '<button type="button" class="tag sug" data-tagadd="' + esc(x) + '">+ ' + esc(x) + '</button>'; }).join(' ');
    var d = openDialog('<h2 id="dlg-h">' + esc(t('logBtn')) + '</h2>' +
      '<label for="e-at">' + esc(t('when')) + '</label><input id="e-at" type="datetime-local" required value="' + esc(pre.at || nowStamp) + '" max="' + esc(nowStamp) + '">' +
      '<label for="e-text">' + esc(t('what')) + '</label><textarea id="e-text" rows="4" maxlength="4000" required placeholder="' + esc(t('whatPh_' + c.kind)) + '" aria-describedby="e-help"></textarea><p id="e-help" class="hint">' + esc(t('whatHelp')) + '</p>' +
      '<fieldset><legend>' + esc(t('sevWord')) + '</legend><div class="sevpick">' + [1, 2, 3, 4, 5].map(function (n) { return '<label><input type="radio" name="sev" value="' + n + '"' + (n === 2 ? ' checked' : '') + '><span>' + n + '</span></label>'; }).join('') + '</div><p class="hint">' + esc(t('sevHelp')) + '</p></fieldset>' +
      '<label for="e-dur">' + esc(t('durMin')) + '</label><input id="e-dur" type="number" min="0" max="14400" inputmode="numeric" value="' + (pre.dur || '') + '">' +
      '<label for="e-tags">' + esc(t('tagsWord')) + '</label><input id="e-tags" maxlength="120" placeholder="' + esc(t('tagsPh')) + '"><div class="sugs">' + sugg + '</div>' +
      '<label for="e-wit">' + esc(t('witness')) + '</label><input id="e-wit" maxlength="200" placeholder="' + esc(t('witnessPh')) + '">' +
      '<label class="chk"><input type="checkbox" id="e-rep"> ' + esc(t('reportedChk')) + '</label>' +
      '<label for="e-ph">' + esc(t('addPhotos')) + '</label><input id="e-ph" type="file" accept="image/*" multiple><div id="e-phl" class="ph"></div><p class="hint">' + esc(t('photoHelp')) + '</p>' + btnRow('sealSave'),
      function (form) { return submitEntry(c, form, pre); });
    d.addEventListener('click', function (ev) {
      var b = ev.target.closest && ev.target.closest('[data-tagadd]'); if (!b) return;
      var inp = $('#e-tags', d), cur2 = C.cleanTags(inp.value); cur2.push(b.getAttribute('data-tagadd')); inp.value = C.cleanTags(cur2).join(', ');
    });
    $('#e-ph', d).addEventListener('change', function (ev) {
      var files = Array.prototype.slice.call(ev.target.files).slice(0, 6 - pending.photos.length);
      Promise.all(files.map(function (f) { return readPhoto(f).catch(function () { return null; }); })).then(function (r) {
        var bad = r.filter(function (x) { return !x; }).length; r.forEach(function (x) { if (x && pending.photos.length < 6) pending.photos.push(x); });
        paintPhotos(d); err(bad ? t('photoBad') : ''); ev.target.value = '';
      });
    });
    d.addEventListener('click', function (ev) { var rb = ev.target.closest && ev.target.closest('[data-rm]'); if (rb) { pending.photos.splice(+rb.getAttribute('data-rm'), 1); paintPhotos(d); } });
  }
  function paintPhotos(d) {
    $('#e-phl', d).innerHTML = pending.photos.map(function (x, i) { return '<span class="pv"><img alt="" width="64" height="64" src="' + x + '"><button type="button" class="rm" data-rm="' + i + '" aria-label="' + esc(t('rmPhoto')) + '">×</button></span>'; }).join('');
  }
  async function submitEntry(c, form, pre) {
    var at = $('#e-at', form).value, text = $('#e-text', form).value.trim(), p = C.parseAt(at);
    if (!p) return err(t('errWhen'));
    if (p.ts > now() + 5 * 6e4) return err(t('errFuture'));
    if (text.length < 3) { $('#e-text', form).focus(); return err(t('errText')); }
    var dur = $('#e-dur', form).value; if (dur !== '' && !(+dur >= 0 && +dur <= 14400)) return err(t('errDur'));
    var sev = +(form.querySelector('input[name=sev]:checked') || { value: 2 }).value, photos = [];
    try {
      for (var i = 0; i < pending.photos.length; i++) { var data = pending.photos[i], h = await C.sha256Hex(data), id = C.uid(); await photoPut(id, data); photos.push({ id: id, h: h }); }
    } catch (e) { return err(t('photoStoreFail')); }
    var last = c.entries[c.entries.length - 1], e = await C.seal(last ? last.hash : '', { type: 'event', at: at, rec: now(), text: text, sev: sev, dur: dur === '' ? 0 : +dur, tags: $('#e-tags', form).value, witness: $('#e-wit', form).value.trim(), photos: photos, reported: $('#e-rep', form).checked });
    c.entries.push(e); if (pre && pre.live) c.live = null;
    if (!save()) { c.entries.pop(); photos.forEach(function (p) { photoDel(p.id); }); return err(t('saveFail')); }
    pending.photos = []; closeDialog(); S.tab = 'log'; render(); toast(t('sealed', { h: e.hash.slice(0, 8) }));
  }
  function noteDialog(c, id) {
    openDialog('<h2 id="dlg-h">' + esc(t('addNote')) + '</h2><p class="hint">' + esc(t('noteHelp')) + '</p><label for="n-text">' + esc(t('noteText')) + '</label><textarea id="n-text" rows="3" maxlength="1000" required></textarea>' + btnRow('sealSave'), async function (form) {
      var text = $('#n-text', form).value.trim(); if (text.length < 2) return err(t('errText'));
      var last = c.entries[c.entries.length - 1], e = await C.seal(last.hash, { type: 'note', ref: id, at: C.toLocalStamp(new Date(now())), rec: now(), text: text });
      c.entries.push(e); if (!save()) { c.entries.pop(); return err(t('saveFail')); } closeDialog(); render(); toast(t('sealed', { h: e.hash.slice(0, 8) }));
    });
  }
  function voidDialog(c, id) {
    openDialog('<h2 id="dlg-h">' + esc(t('voidBtn')) + '</h2><p class="hint">' + esc(t('voidHelp')) + '</p><label for="v-text">' + esc(t('voidReason')) + '</label><textarea id="v-text" rows="2" maxlength="300" required></textarea>' + btnRow('voidConfirm'), async function (form) {
      var text = $('#v-text', form).value.trim(); if (text.length < 3) return err(t('errText'));
      var last = c.entries[c.entries.length - 1], e = await C.seal(last.hash, { type: 'void', ref: id, at: C.toLocalStamp(new Date(now())), rec: now(), text: text });
      c.entries.push(e); if (!save()) { c.entries.pop(); return err(t('saveFail')); } closeDialog(); render(); toast(t('voided'));
    });
  }
  function stepDialog(c, kind) {
    var names = I.stepNames(S.lang), today = C.toLocalStamp(new Date(now())).slice(0, 10);
    openDialog('<h2 id="dlg-h">' + esc(t('logStep')) + '</h2><label for="s-kind">' + esc(t('stepKind')) + '</label><select id="s-kind">' + C.STEP_KINDS.map(function (k) { return '<option value="' + k + '"' + (k === kind ? ' selected' : '') + '>' + esc(names[k]) + '</option>'; }).join('') + '</select>' +
      '<label for="s-at">' + esc(t('stepDate')) + '</label><input id="s-at" type="date" required value="' + today + '" max="' + today + '"><label for="s-note">' + esc(t('stepNote')) + '</label><textarea id="s-note" rows="2" maxlength="300"></textarea>' +
      '<label for="s-due">' + esc(t('stepDue')) + '</label><input id="s-due" type="date"><p class="hint">' + esc(t('stepDueHelp')) + '</p>' + btnRow(), function (form) {
      var at = $('#s-at', form).value, due = $('#s-due', form).value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(at)) return err(t('errWhen')); if (at > today) return err(t('errFuture')); if (due && due < at) return err(t('errDue'));
      (c.steps = c.steps || []).push({ id: C.uid(), kind: $('#s-kind', form).value, at: at, note: $('#s-note', form).value.trim().slice(0, 300), due: due, done: false });
      if (!save()) { c.steps.pop(); return err(t('saveFail')); } closeDialog(); S.tab = 'steps'; render(); toast(t('stepSaved'));
    });
  }
  function caseDialog(kind, existing) {
    var c = existing, k = c ? c.kind : kind || 'other', q = c ? c.quiet : C.KINDS[k].quiet;
    openDialog('<h2 id="dlg-h">' + esc(t(c ? 'editCase' : 'newCase')) + '</h2>' +
      '<label for="c-kind">' + esc(t('caseKind')) + '</label><select id="c-kind"' + (c ? ' disabled' : '') + '>' + Object.keys(C.KINDS).map(function (x) { return '<option value="' + x + '"' + (x === k ? ' selected' : '') + '>' + esc(t('kind_' + x)) + '</option>'; }).join('') + '</select>' +
      '<label for="c-name">' + esc(t('caseName')) + '</label><input id="c-name" maxlength="80" required value="' + esc(c ? c.name : '') + '" placeholder="' + esc(t('caseNamePh')) + '">' +
      '<label for="c-who">' + esc(t('counterpart')) + '</label><input id="c-who" maxlength="80" value="' + esc(c ? c.counterpart : '') + '" placeholder="' + esc(t('counterpartPh')) + '">' +
      '<label for="c-goal">' + esc(t('goal')) + '</label><input id="c-goal" maxlength="200" value="' + esc(c ? c.goal : '') + '" placeholder="' + esc(t('goalPh')) + '">' +
      '<fieldset><legend>' + esc(t('quietWord')) + '</legend><label class="chk"><input type="checkbox" id="c-qon"' + (q ? ' checked' : '') + '> ' + esc(t('quietOn')) + '</label><div class="two"><div><label for="c-qa">' + esc(t('quietFrom')) + '</label><input id="c-qa" type="number" min="0" max="23" value="' + (q ? q[0] : 22) + '"></div><div><label for="c-qb">' + esc(t('quietTo')) + '</label><input id="c-qb" type="number" min="0" max="23" value="' + (q ? q[1] : 7) + '"></div></div></fieldset>' + btnRow(), function (form) {
      var name = $('#c-name', form).value.trim(); if (!name) { $('#c-name', form).focus(); return err(t('errName')); }
      if ($('#c-qon', form).checked && ($('#c-qa', form).value === '' || $('#c-qb', form).value === '')) return err(t('errQuiet'));
      var quiet = $('#c-qon', form).checked ? [C.clampInt($('#c-qa', form).value, 0, 23), C.clampInt($('#c-qb', form).value, 0, 23)] : null;
      var o = c || { id: C.uid(), kind: $('#c-kind', form).value, created: now(), archived: false, entries: [], steps: [], live: null };
      o.name = name; o.counterpart = $('#c-who', form).value.trim(); o.goal = $('#c-goal', form).value.trim(); o.quiet = quiet;
      var was = [o.name, o.counterpart, o.goal, o.quiet]; if (!c) S.cases.push(o); S.cur = o.id; S.tab = 'log';
      if (!save()) { if (!c) S.cases.pop(); return err(t('saveFail')); } closeDialog(); render();
    });
    if (!c) $('#c-kind', dlg).addEventListener('change', function (ev) { var q2 = C.KINDS[ev.target.value].quiet; $('#c-qon', dlg).checked = !!q2; if (q2) { $('#c-qa', dlg).value = q2[0]; $('#c-qb', dlg).value = q2[1]; } });
  }
  function dataDialog() {
    openDialog('<h2 id="dlg-h">' + esc(t('dataH')) + '</h2><p class="hint">' + esc(t('dataHelp')) + '</p><div class="btns wrap"><button type="button" class="pri" id="d-exp">' + esc(t('backup')) + '</button><label class="btn sec" for="d-imp">' + esc(t('restore')) + '</label><input id="d-imp" class="sr" type="file" accept="application/json,.json"></div><p class="hint">' + esc(t('installHint')) + '</p><p class="err" role="alert" hidden></p><div class="btns"><button type="button" class="ghost" data-close>' + esc(t('close')) + '</button></div>');
    $('#d-exp', dlg).addEventListener('click', backup);
    $('#d-imp', dlg).addEventListener('change', function (ev) { var f = ev.target.files[0]; if (f) restore(f); });
  }
  async function backup() {
    var photos = {}, ids = [];
    S.cases.forEach(function (c) { c.entries.forEach(function (e) { e.photos.forEach(function (p) { ids.push(p.id); }); }); });
    for (var i = 0; i < ids.length; i++) { var d = await photoGet(ids[i]); if (d) photos[ids[i]] = d; }
    download('marginlog-backup-' + C.toLocalStamp(new Date(now())).slice(0, 10) + '.json', 'application/json', JSON.stringify({ app: 'marginlog', v: 1, cases: S.cases, photos: photos }));
    err(''); toast(t('backupDone'));
  }
  function restore(file) {
    var fr = new FileReader();
    fr.onerror = function () { err(t('badFile')); };
    fr.onload = async function () {
      try {
        var d = JSON.parse(fr.result); if (!d || d.app !== 'marginlog' || !Array.isArray(d.cases)) throw new Error('shape');
        var cs = d.cases.map(C.sanitizeCase).filter(Boolean), broken = 0, ph = d.photos && typeof d.photos === 'object' ? d.photos : {};
        for (var i = 0; i < cs.length; i++) { var v = await C.verifyChain(cs[i].entries); if (!v.ok) broken++; }
        var n = 0;
        var skipped = 0; cs = cs.filter(function (c) { var same = S.cases.some(function (x) { return x.id === c.id && x.entries.length && c.entries.length && x.entries[x.entries.length - 1].hash === c.entries[c.entries.length - 1].hash; }); if (same) skipped++; return !same; });
        cs.forEach(function (c) { if (S.cases.some(function (x) { return x.id === c.id; })) c.id = C.uid(); });
        for (var j = 0; j < cs.length; j++) for (var k = 0; k < cs[j].entries.length; k++) for (var m = 0; m < cs[j].entries[k].photos.length; m++) {
          var p = cs[j].entries[k].photos[m], data = ph[p.id];
          if (typeof data === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(data) && data.length < 6e6 && await C.sha256Hex(data) === p.h) { await photoPut(p.id, data); n++; }
        }
        S.cases = S.cases.concat(cs); /* checkpoints are written by save() */ if (!S.cur && cs[0]) S.cur = cs[0].id; save(); closeDialog(); render();
        toast(broken ? t('restoredBroken', { n: cs.length, b: broken }) : t('restored', { n: cs.length }) + (skipped ? ' ' + t('restoredSkipped', { n: skipped }) : ''));
      } catch (e) { err(t('badFile')); }
    };
    fr.readAsText(file);
  }

  /* ---------- report ---------- */
  async function fillReport() {
    var c = cur(), pre = $('#repview'); if (!c || !pre) return;
    var chain = await C.verifyChain(c.entries, readCp()[c.id]), bad = 0;
    for (var i = 0; i < c.entries.length; i++) for (var j = 0; j < c.entries[i].photos.length; j++) { var p = c.entries[i].photos[j], d = await photoGet(p.id); if (!d || await C.sha256Hex(d) !== p.h) bad++; }
    var ok = chain.ok && !bad, md = C.reportMarkdown(c, labels(), now(), ok ? chain : { ok: false });
    pre.textContent = md; var line = $('#chainline'); if (line) { line.textContent = ok ? t('chainOk', { n: c.entries.length, h: chain.head }) : (chain.ok ? t('photoHashBad', { n: bad }) : t(chain.truncated ? 'chainTrunc' : 'chainBadAt', { n: chain.bad + 1 })); line.className = 'chain ' + (ok ? 'good' : 'bad'); }
    var box = $('#repphotos'); if (box) {
      var h = ''; C.events(c.entries).forEach(function (e) { e.photos.forEach(function (p2) { h += '<figure><img alt="" data-pid="' + esc(p2.id) + '"><figcaption>' + esc(fmtAt(e.at)) + '</figcaption></figure>'; }); }); box.innerHTML = h; hydratePhotos();
    }
    return md;
  }

  /* ---------- live timer ---------- */
  function startLiveTick() {
    clearInterval(liveTimer); var el = $('#live-clock'); if (!el) return;
    function tick() { var s = Math.max(0, Math.floor((now() - +el.getAttribute('data-start')) / 1000)); el.textContent = (s >= 3600 ? C.pad(Math.floor(s / 3600)) + ':' : '') + C.pad(Math.floor(s / 60) % 60) + ':' + C.pad(s % 60); }
    tick(); liveTimer = setInterval(tick, 1000);
  }

  /* ---------- events ---------- */
  root.addEventListener('click', async function (ev) {
    var b = ev.target.closest('[data-act]'); if (!b) return;
    var act = b.getAttribute('data-act'), c = cur(), id = b.getAttribute('data-id'); lastTrig = act + '|' + (id || '');
    if (act === 'data') return dataDialog();
    if (act === 'newcase') return caseDialog(b.getAttribute('data-kind') || 'other');
    if (!c) return;
    if (act === 'tab') { S.tab = b.getAttribute('data-tab'); render(); var tb = $('#tab-' + S.tab); tb && tb.focus(); if (S.tab === 'report') fillReport(); return; }
    if (act === 'log') return entryDialog(c);
    if (act === 'livestart') { c.live = { start: now() }; save(); render(); return; }
    if (act === 'livedrop') { c.live = null; save(); render(); return; }
    if (act === 'livestop') { var st = new Date(c.live.start); return entryDialog(c, { at: C.toLocalStamp(st), dur: Math.max(1, Math.ceil((now() - c.live.start) / 6e4)), live: true }); }
    if (act === 'note') return noteDialog(c, id);
    if (act === 'void') return voidDialog(c, id);
    if (act === 'addstep') return stepDialog(c, b.getAttribute('data-kind'));
    if (act === 'stepdone') { (c.steps || []).forEach(function (s) { if (s.id === id) s.done = true; }); save(); render(); if (S.tab === 'report') fillReport(); return; }
    if (act === 'stepdel') { var del = c.steps.filter(function (s) { return s.id === id; })[0]; c.steps = c.steps.filter(function (s) { return s.id !== id; }); save(); render(); toast(t('stepRemoved'), t('undo'), function () { c.steps.push(del); save(); render(); }); return; }
    if (act === 'clearf') { S.f = { q: '', tag: '', sev: 0, voided: S.f.voided }; return render(); }
    if (act === 'editcase') return caseDialog(null, c);
    if (act === 'archive') { c.archived = !c.archived; if (!save()) { c.archived = !c.archived; return; } render(); toast(t(c.archived ? 'archivedMsg' : 'unarchivedMsg')); return; }
    if (act === 'delcase') {
      return openDialog('<h2 id="dlg-h">' + esc(t('deleteCase')) + '</h2><p>' + esc(t('delConfirm', { name: c.name })) + '</p><p class="hint">' + esc(t('delHint')) + '</p><div class="btns"><button type="submit" class="pri danger">' + esc(t('deleteCase')) + '</button><button type="button" class="ghost" data-close>' + esc(t('cancel')) + '</button></div>', function () {
        var idx = S.cases.indexOf(c), was = S.cur, undone = false, pids = []; c.entries.forEach(function (e) { e.photos.forEach(function (p) { pids.push(p.id); }); });
        setTimeout(function () { if (!undone && S.cases.indexOf(c) < 0) pids.forEach(photoDel); }, 12000); S.cases.splice(idx, 1); S.cur = (S.cases.filter(function (x) { return !x.archived; })[0] || S.cases[0] || {}).id || null; save(); closeDialog(); render();
        toast(t('caseDeleted'), t('undo'), function () { undone = true; S.cases.splice(idx, 0, c); S.cur = was; save(); render(); });
      }, { focus: '[data-close]' });
    }
    if (act === 'photo') { var d = await photoGet(b.getAttribute('data-pid')); if (!d) return toast(t('photoMissing')); return openDialog('<h2 id="dlg-h" class="sr">' + esc(t('openPhoto')) + '</h2><img class="big-ph" alt="" src="' + d + '"><div class="btns"><button type="button" class="ghost" data-close>' + esc(t('close')) + '</button></div>'); }
    if (act === 'verify') { var l = $('#chainline'); if (l) l.textContent = t('verifying'); return fillReport(); }
    if (act === 'copyrep') { var pv = $('#repview'), md = pv && pv.textContent ? pv.textContent : await fillReport(); try { await navigator.clipboard.writeText(md); toast(t('copied')); } catch (e) { var pre = $('#repview'); var r = document.createRange(); r.selectNodeContents(pre); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast(t('copyFail')); } return; }
    if (act === 'dlmd') { var md2 = await fillReport(); return download('marginlog-' + slug(c.name) + '.md', 'text/markdown', md2); }
    if (act === 'dlcsv') return download('marginlog-' + slug(c.name) + '.csv', 'text/csv', '﻿' + C.toCsv(c));
    if (act === 'print') { await fillReport(); return window.print(); }
  });
  root.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.id === 'lang') { S.lang = el.value; save(); render(); if (S.tab === 'report') fillReport(); }
    else if (el.id === 'casesel') { S.cur = el.value; S.f = { q: '', tag: '', sev: 0, voided: false }; save(); render(); if (S.tab === 'report') fillReport(); }
    else if (el.id === 'ftag') { S.f.tag = el.value; render(); }
    else if (el.id === 'fsev') { S.f.sev = +el.value; render(); }
    else if (el.id === 'fvoid') { S.f.voided = el.checked; render(); }
  });
  function onSearch(ev) {
    if (ev.target.id === 'fq' && !ev.isComposing) { S.f.q = ev.target.value; var pos = ev.target.selectionStart; render(); var q = $('#fq'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }
  }
  root.addEventListener('input', onSearch); root.addEventListener('compositionend', onSearch);
  root.addEventListener('keydown', function (ev) {
    var tb = ev.target.closest && ev.target.closest('[role=tab]'); if (!tb || (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft' && ev.key !== 'Home' && ev.key !== 'End')) return;
    var keys = ['log', 'patterns', 'steps', 'report', 'case'], i = keys.indexOf(tb.getAttribute('data-tab'));
    i = ev.key === 'Home' ? 0 : ev.key === 'End' ? keys.length - 1 : (i + (ev.key === 'ArrowRight' ? 1 : keys.length - 1)) % keys.length;
    ev.preventDefault(); S.tab = keys[i]; render(); $('#tab-' + S.tab).focus(); if (S.tab === 'report') fillReport();
  });
  root.addEventListener('submit', function (ev) { ev.preventDefault(); });

  var tel = document.createElement('div'); tel.id = 'toast'; tel.className = 'toast'; tel.setAttribute('role', 'status'); tel.setAttribute('aria-live', 'polite'); tel.hidden = true; document.body.appendChild(tel);
  /* ---------- boot ---------- */
  var nl = (navigator.language || 'en').slice(0, 2); if (I.L[nl]) S.lang = nl;
  load(); render(); if (S.tab === 'report') fillReport();
  if (blocked) toast(t('corruptBlocked'));
  else if (corruptKey) toast(t('corrupt', { k: corruptKey }));
  else if (!(window.crypto && window.crypto.subtle)) toast(t('cryptoFail'));
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () { /* offline cache is optional */ });
  photoSweep();
  window.addEventListener('storage', function (ev) { if (ev.key === KEY) { closeDialog(); S.cases = []; S.cur = null; load(); render(); toast(t('otherTab')); } });
  window.__ml = { S: S, render: render };
})();
