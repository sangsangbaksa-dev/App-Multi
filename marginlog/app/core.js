/* Marginlog core: pure functions, no DOM. Works in the browser (window.MLCore) and in Node tests. */
(function (root) {
  'use strict';
  var KINDS = {
    noise: { tags: ['music', 'voices', 'bass', 'stomping', 'party', 'construction', 'pets'], quiet: [22, 7], steps: ['talk', 'written', 'complaint', 'mediation', 'authority'] },
    landlord: { tags: ['repair', 'mould', 'heating', 'water', 'entry', 'rent', 'deposit'], quiet: null, steps: ['talk', 'written', 'complaint', 'mediation', 'legal'] },
    work: { tags: ['remarks', 'workload', 'exclusion', 'schedule', 'pay', 'threat'], quiet: null, steps: ['talk', 'written', 'complaint', 'mediation', 'legal'] },
    vendor: { tags: ['missed deadline', 'poor work', 'no show', 'extra charge', 'no reply'], quiet: null, steps: ['written', 'complaint', 'mediation', 'legal'] },
    other: { tags: [], quiet: null, steps: ['talk', 'written', 'complaint', 'mediation', 'legal'] }
  };
  var STEP_KINDS = ['talk', 'written', 'complaint', 'mediation', 'authority', 'legal'];
  var LATE_HOURS = 48;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }
  function toLocalStamp(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function parseAt(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3], h = +m[4], mi = +m[5];
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
    var dt = new Date(y, mo - 1, d, h, mi);
    if (dt.getMonth() !== mo - 1) return null;
    return { y: y, m: mo, d: d, h: h, mi: mi, dow: (dt.getDay() + 6) % 7, ts: dt.getTime(), day: m[1] + '-' + m[2] + '-' + m[3] };
  }
  function dayNum(stamp) { var p = parseAt(stamp); return p ? Math.floor(Date.UTC(p.y, p.m - 1, p.d) / 864e5) : null; }

  /* ---------- sealing ---------- */
  async function sha256Hex(str) {
    var buf = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    var a = new Uint8Array(buf), out = '';
    for (var i = 0; i < a.length; i++) out += (a[i] < 16 ? '0' : '') + a[i].toString(16);
    return out;
  }
  function payload(prev, e) {
    return JSON.stringify([prev || '', e.id, e.type, e.ref || '', e.at, e.rec, e.text, e.sev || 0, e.dur || 0, e.tags || [], e.witness || '', (e.photos || []).map(function (p) { return p.h; }), !!e.reported]);
  }
  async function seal(prev, fields) {
    var e = {
      id: fields.id || uid(), type: fields.type || 'event', ref: fields.ref || '', at: fields.at, rec: fields.rec,
      text: String(fields.text || '').slice(0, 4000), sev: clampInt(fields.sev, 0, 5), dur: clampInt(fields.dur, 0, 14400),
      tags: cleanTags(fields.tags), witness: String(fields.witness || '').slice(0, 200), photos: (fields.photos || []).slice(0, 6).map(function (p) { return { id: String(p.id), h: String(p.h) }; }), reported: !!fields.reported
    };
    e.prev = prev || '';
    e.hash = await sha256Hex(payload(prev, e));
    return e;
  }
  async function verifyChain(entries, cp) {
    var prev = '';
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e.prev !== prev) return { ok: false, bad: i };
      if (await sha256Hex(payload(prev, e)) !== e.hash) return { ok: false, bad: i };
      prev = e.hash;
    }
    if (cp && cp.n) {
      if (entries.length < cp.n) return { ok: false, bad: entries.length, truncated: true };
      if (entries[cp.n - 1].hash !== cp.head) return { ok: false, bad: cp.n - 1 };
    }
    return { ok: true, bad: -1, head: prev, n: entries.length };
  }
  function clampInt(v, lo, hi) { v = Math.round(Number(v)); if (!isFinite(v)) v = lo; return Math.max(lo, Math.min(hi, v)); }
  function cleanTags(t) {
    var seen = {}, out = [];
    (Array.isArray(t) ? t : String(t || '').split(',')).forEach(function (x) {
      x = String(x).trim().toLowerCase().slice(0, 24);
      if (x && !seen[x] && out.length < 8) { seen[x] = 1; out.push(x); }
    });
    return out;
  }

  /* ---------- views over the chain ---------- */
  function voidedIds(entries) { var v = {}; entries.forEach(function (e) { if (e.type === 'void') v[e.ref] = e; }); return v; }
  function events(entries) { var v = voidedIds(entries); return entries.filter(function (e) { return e.type === 'event' && !v[e.id]; }); }
  function addenda(entries, id) { return entries.filter(function (e) { return e.type === 'note' && e.ref === id; }); }
  function isLate(e) { var p = parseAt(e.at); return !!p && e.rec - p.ts > LATE_HOURS * 36e5; }
  function inQuiet(h, q) { if (!q) return false; var a = q[0], b = q[1]; return a === b ? false : (a < b ? h >= a && h < b : h >= a || h < b); }

  function heatmap(evs) {
    var g = []; for (var r = 0; r < 7; r++) { g.push(new Array(24).fill(0)); }
    var max = 0;
    evs.forEach(function (e) { var p = parseAt(e.at); if (p) { g[p.dow][p.h]++; if (g[p.dow][p.h] > max) max = g[p.dow][p.h]; } });
    return { grid: g, max: max };
  }
  function weekly(evs, nowTs, weeks) {
    weeks = weeks || 8; var out = [], i, now = new Date(nowTs);
    var monDay = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5) - ((now.getDay() + 6) % 7);
    for (i = weeks - 1; i >= 0; i--) { var dd = monDay - i * 7, u = new Date(dd * 864e5); out.push({ start: new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate()).getTime(), day: dd, n: 0, sev: 0 }); }
    evs.forEach(function (e) {
      var dn = dayNum(e.at); if (dn == null) return;
      var idx = Math.floor((dn - out[0].day) / 7);
      if (idx >= 0 && idx < weeks) { out[idx].n++; out[idx].sev += e.sev || 0; }
    });
    return out;
  }
  function topBand(evs) {
    if (evs.length < 5) return null;
    var dow = new Array(7).fill(0), hr = new Array(24).fill(0);
    evs.forEach(function (e) { var p = parseAt(e.at); if (p) { dow[p.dow]++; hr[p.h]++; } });
    var bestD = 0, i; for (i = 1; i < 7; i++) if (dow[i] > dow[bestD]) bestD = i;
    var bestH = 0, bestS = -1;
    for (i = 0; i < 24; i++) { var s = hr[i] + hr[(i + 1) % 24] + hr[(i + 2) % 24]; if (s > bestS) { bestS = s; bestH = i; } }
    return { dow: bestD, dowShare: Math.round(100 * dow[bestD] / evs.length), from: bestH, to: (bestH + 3) % 24, hourShare: Math.round(100 * bestS / evs.length) };
  }
  function stats(c, nowTs) {
    var evs = events(c.entries), n = evs.length, st = { total: n, last30: 0, prev30: 0, avgSev: 0, minutes: 0, quiet: 0, late: 0, sinceDays: null, longestGap: 0, trend: 'flat', first: null, last: null };
    if (!n) return st;
    var sev = 0, sevN = 0, days = [], now = new Date(nowTs), todayN = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
    evs.forEach(function (e) {
      var p = parseAt(e.at); if (!p) return;
      var dn = dayNum(e.at), ago = todayN - dn;
      if (ago >= 0 && ago < 30) st.last30++; else if (ago >= 30 && ago < 60) st.prev30++;
      if (e.sev) { sev += e.sev; sevN++; }
      st.minutes += e.dur || 0;
      if (inQuiet(p.h, c.quiet)) st.quiet++;
      if (isLate(e)) st.late++;
      days.push(dn);
    });
    st.avgSev = sevN ? Math.round(10 * sev / sevN) / 10 : 0;
    days.sort(function (a, b) { return a - b; });
    st.first = evs.reduce(function (m, e) { return !m || e.at < m ? e.at : m; }, null);
    st.last = evs.reduce(function (m, e) { return !m || e.at > m ? e.at : m; }, null);
    st.sinceDays = Math.max(0, todayN - days[days.length - 1]);
    for (var i = 1; i < days.length; i++) st.longestGap = Math.max(st.longestGap, days[i] - days[i - 1] - 1);
    if (st.last30 > st.prev30 + 1 || (st.prev30 === 0 && st.last30 >= 3)) st.trend = 'up';
    else if (st.prev30 > st.last30 + 1) st.trend = 'down';
    return st;
  }

  /* ---------- evidence strength ---------- */
  function strength(e) {
    var s = 0, tips = [];
    if ((e.text || '').trim().length >= 40) s += 25; else tips.push('text');
    if (e.dur > 0) s += 15; else tips.push('dur');
    if (e.witness) s += 15; else tips.push('witness');
    if (e.photos && e.photos.length) s += 20; else tips.push('photo');
    if (!isLate(e) && e.rec - (parseAt(e.at) || { ts: e.rec }).ts < 24 * 36e5) s += 15; else tips.push('timely');
    if (e.tags && e.tags.length) s += 10; else tips.push('tag');
    return { score: s, tips: tips };
  }
  function caseStrength(c) {
    var evs = events(c.entries); if (!evs.length) return 0;
    return Math.round(evs.reduce(function (a, e) { return a + strength(e).score; }, 0) / evs.length);
  }

  /* ---------- escalation ladder ---------- */
  function ladder(c) { return (KINDS[c.kind] || KINDS.other).steps; }
  function suggestNext(c, nowTs) {
    var done = {}, steps = c.steps || [], evs = events(c.entries);
    steps.forEach(function (s) { done[s.kind] = (done[s.kind] || 0) + 1; });
    var order = ladder(c), st = stats(c, nowTs), hi = evs.filter(function (e) { return e.sev >= 4; }).length;
    if (!evs.length) return { key: 'none' };
    var pending = steps.filter(function (s) { return s.due && !s.done; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
    var today = toLocalStamp(new Date(nowTs)).slice(0, 10);
    if (pending.length && pending[0].due < today) return { key: 'overdue', step: pending[0] };
    if (pending.length) return { key: 'waiting', step: pending[0] };
    for (var i = 0; i < order.length; i++) {
      var k = order[i];
      if (done[k]) continue;
      if (k === 'talk') { if (done.written || done.complaint) continue; return { key: 'talk', kind: k }; }
      if (k === 'written') { if (done.complaint) continue; return evs.length >= 3 || hi >= 1 ? { key: 'written', kind: k } : { key: 'keep' }; }
      if (k === 'complaint') return st.last30 >= 2 || hi >= 2 ? { key: 'complaint', kind: k } : { key: 'keep' };
      return st.last30 >= 2 ? { key: 'next', kind: k } : { key: 'keep' };
    }
    return order.every(function (k) { return done[k]; }) ? { key: 'exhausted' } : { key: 'keep' };
  }

  /* ---------- exports ---------- */
  function csvCell(v) {
    v = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function toCsv(c) {
    var rows = [['when', 'recorded', 'late', 'severity', 'minutes', 'tags', 'witness', 'reported', 'text', 'notes', 'voided', 'hash']], vd = voidedIds(c.entries);
    c.entries.filter(function (e) { return e.type === 'event'; }).slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; }).forEach(function (e) {
      rows.push([e.at.replace('T', ' '), new Date(e.rec).toISOString(), isLate(e) ? 'yes' : '', e.sev || '', e.dur || '', e.tags.join(' '), e.witness, e.reported ? 'yes' : '', e.text, addenda(c.entries, e.id).map(function (n) { return n.text; }).join(' | '), vd[e.id] ? vd[e.id].text : '', e.hash.slice(0, 16)]);
    });
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }
  function reportMarkdown(c, L, nowTs, chain) {
    var st = stats(c, nowTs), vd = voidedIds(c.entries), evs = events(c.entries), all = c.entries.filter(function (e) { return e.type === 'event'; }).slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; });
    var out = ['# ' + c.name, ''];
    if (c.counterpart) out.push(L.counterpart + ': ' + c.counterpart);
    if (c.goal) out.push(L.goal + ': ' + c.goal);
    out.push(L.generated + ': ' + toLocalStamp(new Date(nowTs)).replace('T', ' '), '');
    out.push('## ' + L.summary, '');
    out.push('- ' + L.total + ': ' + st.total + (st.first ? ' (' + st.first.slice(0, 10) + ' – ' + st.last.slice(0, 10) + ')' : ''));
    out.push('- ' + L.last30 + ': ' + st.last30 + ' (' + L.prev30 + ': ' + st.prev30 + ')');
    if (st.avgSev) out.push('- ' + L.avgSev + ': ' + st.avgSev + ' / 5');
    if (st.minutes) out.push('- ' + L.minutes + ': ' + st.minutes);
    if (c.quiet) out.push('- ' + L.quietHits + ' (' + pad(c.quiet[0]) + ':00–' + pad(c.quiet[1]) + ':00): ' + st.quiet);
    var nv = all.length - evs.length; if (nv) out.push('- ' + L.voidedBadge + ': ' + nv);
    var tb = topBand(evs); if (tb) out.push('- ' + L.pattern + ': ' + L.days[tb.dow] + ' ' + tb.dowShare + '%, ' + pad(tb.from) + ':00–' + pad(tb.to) + ':00 ' + tb.hourShare + '%');
    out.push('', '## ' + L.timeline, '');
    all.forEach(function (e, i) {
      var isV = !!vd[e.id], tags = e.tags.length ? ' [' + e.tags.join(', ') + ']' : '';
      out.push((i + 1) + '. **' + e.at.replace('T', ' ') + '**' + (e.sev ? ' · ' + L.sev + ' ' + e.sev + '/5' : '') + (e.dur ? ' · ' + e.dur + ' min' : '') + tags + (isLate(e) ? ' · ' + L.late : '') + (isV ? ' · ' + L.voidedBadge.toUpperCase() : ''));
      out.push('   ' + e.text.replace(/\n+/g, ' '));
      out.push('   #' + e.hash.slice(0, 16));
      if (e.witness) out.push('   ' + L.witness + ': ' + e.witness);
      if (e.photos.length) out.push('   ' + L.photos + ': ' + e.photos.length);
      if (e.reported) out.push('   ' + L.reportedTo);
      if (isV) out.push('   ' + L.voidedBadge.toUpperCase() + ' (' + vd[e.id].at.replace('T', ' ') + '): ' + vd[e.id].text.replace(/\n+/g, ' '));
      addenda(c.entries, e.id).forEach(function (n) { out.push('   + ' + n.at.replace('T', ' ') + ': ' + n.text.replace(/\n+/g, ' ')); });
    });
    if ((c.steps || []).length) {
      out.push('', '## ' + L.steps, '');
      c.steps.slice().sort(function (a, b) { return a.at < b.at ? -1 : 1; }).forEach(function (s) { out.push('- ' + s.at + ' · ' + (L.stepNames[s.kind] || s.kind) + (s.note ? ': ' + s.note : '') + (s.due ? ' (' + L.due + ' ' + s.due + (s.done ? ', ' + L.answered : '') + ')' : '')); });
    }
    out.push('', '## ' + L.integrity, '');
    out.push(chain && chain.ok ? L.chainOk.replace('{n}', c.entries.length).replace('{h}', chain.head) : L.chainBad);
    return out.join('\n') + '\n';
  }

  /* ---------- import / sanitise ---------- */
  function sanitizeCase(c) {
    if (!c || typeof c !== 'object') return null;
    var kind = KINDS[c.kind] ? c.kind : 'other', q = Array.isArray(c.quiet) && c.quiet.length === 2 ? [clampInt(c.quiet[0], 0, 23), clampInt(c.quiet[1], 0, 23)] : null;
    /* Never drop a damaged record silently: keep it (coerced) so the chain check fails visibly. */
    var entries = (Array.isArray(c.entries) ? c.entries : []).filter(function (e) { return e && typeof e === 'object'; }).map(function (e) {
      var okShape = typeof e.id === 'string' && typeof e.hash === 'string' && typeof e.prev === 'string' && ['event', 'note', 'void'].indexOf(e.type) >= 0 && parseAt(e.at) && isFinite(e.rec) && typeof e.text === 'string';
      return { id: String(e.id || uid()).slice(0, 40), type: ['event', 'note', 'void'].indexOf(e.type) >= 0 ? e.type : 'event', ref: String(e.ref || '').slice(0, 40), at: parseAt(e.at) ? e.at : '1970-01-01T00:00', rec: isFinite(e.rec) ? +e.rec : 0, text: String(e.text == null ? '' : e.text).slice(0, 4000), sev: clampInt(e.sev, 0, 5), dur: clampInt(e.dur, 0, 14400), tags: cleanTags(e.tags), witness: String(e.witness || '').slice(0, 200), photos: (Array.isArray(e.photos) ? e.photos : []).slice(0, 6).filter(function (p) { return p && p.id; }).map(function (p) { return { id: String(p.id).slice(0, 40), h: String(p.h).slice(0, 64) }; }), reported: !!e.reported, prev: okShape ? e.prev : '?', hash: okShape ? e.hash : '' };
    });
    var steps = (Array.isArray(c.steps) ? c.steps : []).filter(function (s) { return s && STEP_KINDS.indexOf(s.kind) >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(s.at || ''); }).map(function (s) {
      return { id: String(s.id || uid()).slice(0, 40), kind: s.kind, at: s.at, note: String(s.note || '').slice(0, 300), due: /^\d{4}-\d{2}-\d{2}$/.test(s.due || '') ? s.due : '', done: !!s.done };
    });
    return { id: String(c.id || uid()).slice(0, 40), name: String(c.name || 'Case').slice(0, 80), kind: kind, counterpart: String(c.counterpart || '').slice(0, 80), goal: String(c.goal || '').slice(0, 200), quiet: q, created: isFinite(c.created) ? +c.created : Date.now(), archived: !!c.archived, entries: entries, steps: steps, live: c.live && isFinite(c.live.start) ? { start: +c.live.start } : null };
  }

  var api = {
    KINDS: KINDS, STEP_KINDS: STEP_KINDS, LATE_HOURS: LATE_HOURS,
    uid: uid, pad: pad, toLocalStamp: toLocalStamp, parseAt: parseAt, dayNum: dayNum, sha256Hex: sha256Hex, seal: seal, verifyChain: verifyChain, cleanTags: cleanTags, clampInt: clampInt,
    events: events, addenda: addenda, voidedIds: voidedIds, isLate: isLate, inQuiet: inQuiet, heatmap: heatmap, weekly: weekly, topBand: topBand, stats: stats,
    strength: strength, caseStrength: caseStrength, ladder: ladder, suggestNext: suggestNext, toCsv: toCsv, reportMarkdown: reportMarkdown, sanitizeCase: sanitizeCase
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MLCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
