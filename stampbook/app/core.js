/* Stampbook core: pure functions, no DOM. Works in browser (window.SB) and Node. */
(function (root) {
  'use strict';
  var DAY = 86400000;

  function todayStr(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function parse(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / DAY); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return todayStr(d); }
  function addMonths(s, n) {
    var d = parse(s), day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return todayStr(d);
  }

  /* a stamp is {id,date,note,kind}. kind '' = lesson, 'noshow' = student missed it, still counted;
     'excused' = cancelled in good time, logged but not counted. Older data has no kind and stays valid. */
  function counted(p) { return p.stamps.filter(function (s) { return s.kind !== 'excused'; }); }
  function used(p) { return counted(p).length; }
  function remaining(p) { return Math.max(0, p.total - used(p)); }
  function perLesson(p) { return p.total > 0 ? p.price / p.total : 0; }
  /* money still owed back to the student in lessons: the unearned part of what they paid */
  function unearned(p) { return Math.round(remaining(p) * perLesson(p) * 100) / 100; }

  /* status: done (all used) > expired (date passed, lessons left) > low (<=1 left) > active */
  function status(p, today) {
    today = today || todayStr();
    if (remaining(p) === 0) return 'done';
    if (p.expires && p.expires < today) return 'expired';
    if (remaining(p) <= 1) return 'low';
    return 'active';
  }
  function daysLeft(p, today) {
    if (!p.expires) return null;
    return daysBetween(today || todayStr(), p.expires);
  }

  function addStamp(p, date, note, kind) {
    kind = kind === 'noshow' || kind === 'excused' ? kind : '';
    if (kind !== 'excused' && remaining(p) <= 0) return false;
    p.stamps.push({ id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date: date, note: String(note || '').slice(0, 200), kind: kind });
    p.stamps.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    return true;
  }
  function setNote(p, id, note) {
    for (var i = 0; i < p.stamps.length; i++) if (p.stamps[i].id === id) { p.stamps[i].note = String(note || '').slice(0, 200); return true; }
    return false;
  }
  /* validity in months, remembered so a renewal can copy it; derived for packs made before it was stored */
  function monthsOf(p) {
    if (typeof p.months === 'number') return p.months;
    if (!p.expires || !p.start) return 0;
    return Math.max(1, Math.round(daysBetween(p.start, p.expires) / 30.44));
  }
  function renew(p, today, id) {
    var m = monthsOf(p);
    return { id: id || 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), student: p.student, total: p.total, price: p.price,
      currency: p.currency, start: today, months: m, expires: m > 0 ? addMonths(today, m) : '', stamps: [], paid: true, renewsFrom: p.id };
  }
  function extend(p, months, today) { p.expires = addMonths(p.expires && p.expires > today ? p.expires : today, months); return p.expires; }
  /* packs a teacher should act on today: last lesson, expiring within 7 days, or expired with lessons left */
  function attention(packs, today) {
    return packs.filter(function (p) {
      var st = status(p, today), dl = daysLeft(p, today);
      return st === 'low' || st === 'expired' || (st === 'active' && dl !== null && dl <= 7);
    });
  }
  function matches(p, q) { q = String(q || '').trim().toLowerCase(); return !q || p.student.toLowerCase().indexOf(q) !== -1; }
  function removeStamp(p, id) {
    var n = p.stamps.length;
    p.stamps = p.stamps.filter(function (s) { return s.id !== id; });
    return p.stamps.length !== n;
  }

  /* stats for a month key "YYYY-MM": lessons given, revenue recognised (per-lesson), cash collected by start date */
  function monthStats(packs, ym) {
    var lessons = 0, earned = 0, cash = 0;
    packs.forEach(function (p) {
      var pl = perLesson(p);
      counted(p).forEach(function (s) { if (s.date.slice(0, 7) === ym) { lessons++; earned += pl; } });
      if (p.start && p.start.slice(0, 7) === ym && p.paid !== false) cash += p.price;
    });
    return { lessons: lessons, earned: Math.round(earned * 100) / 100, cash: cash };
  }
  function totalUnearned(packs, today) {
    var sum = 0;
    packs.forEach(function (p) { if (status(p, today) !== 'expired') sum += unearned(p); });
    return Math.round(sum * 100) / 100;
  }
  /* lessons the student paid for but never took, after expiry: kept by the teacher, listed so policy is a conscious choice */
  function lapsed(packs, today) {
    return packs.filter(function (p) { return status(p, today) === 'expired'; });
  }

  /* ---- insights: calendar + per-student and monthly stats. All pure, derived from stamps only. ---- */
  function ymAdd(ym, n) { return addMonths(ym + '-01', n).slice(0, 7); }
  /* cells for a month calendar: leading/trailing blanks are null so rows are always 7 wide. weekStart 0 = Sunday, 1 = Monday */
  function monthGrid(ym, weekStart) {
    weekStart = weekStart === 1 ? 1 : 0;
    var first = parse(ym + '-01'), days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    var lead = (first.getDay() - weekStart + 7) % 7, cells = [], i;
    for (i = 0; i < lead; i++) cells.push(null);
    for (i = 1; i <= days; i++) cells.push(ym + '-' + (i < 10 ? '0' : '') + i);
    while (cells.length % 7) cells.push(null);
    return cells;
  }
  /* every stamp on every pack, newest context attached: [{date,kind,stampId,packId,student,note}] sorted by date */
  function events(packs) {
    var out = [];
    packs.forEach(function (p) {
      p.stamps.forEach(function (s) { out.push({ date: s.date, kind: s.kind || '', stampId: s.id, packId: p.id, student: p.student, note: s.note || '' }); });
    });
    return out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.student < b.student ? -1 : a.student > b.student ? 1 : 0; });
  }
  /* {date: [events]} for one month */
  function dayMap(packs, ym) {
    var m = {};
    events(packs).forEach(function (e) { if (e.date.slice(0, ym.length) === ym) (m[e.date] = m[e.date] || []).push(e); });
    return m;
  }
  /* last n months ending at endYm, oldest first */
  function monthlyTrend(packs, endYm, n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var ym = ymAdd(endYm, -i), ms = monthStats(packs, ym), ns = 0;
      packs.forEach(function (p) { p.stamps.forEach(function (s) { if (s.kind === 'noshow' && s.date.slice(0, 7) === ym) ns++; }); });
      out.push({ ym: ym, lessons: ms.lessons, earned: ms.earned, noshow: ns });
    }
    return out;
  }
  /* lessons counted per weekday, index 0 = Sunday */
  function weekdayCounts(packs) {
    var c = [0, 0, 0, 0, 0, 0, 0];
    packs.forEach(function (p) { counted(p).forEach(function (s) { c[parse(s.date).getDay()]++; }); });
    return c;
  }
  /* one row per student (packs merged by name, case-insensitive), busiest first */
  function studentStats(packs, today) {
    var map = {}, order = [];
    packs.forEach(function (p) {
      var k = p.student.trim().toLowerCase();
      if (!map[k]) { map[k] = { student: p.student.trim(), packs: 0, lessons: 0, noshow: 0, excused: 0, left: 0, spent: 0, dates: [], currency: p.currency || '' }; order.push(k); }
      var r = map[k], st = status(p, today);
      r.packs++; r.spent += p.paid === false ? 0 : p.price;
      if (st !== 'expired') r.left += remaining(p);
      p.stamps.forEach(function (s) {
        if (s.kind === 'excused') r.excused++; else { r.lessons++; r.dates.push(s.date); if (s.kind === 'noshow') r.noshow++; }
      });
    });
    return order.map(function (k) {
      var r = map[k], d = r.dates.sort(), gap = null;
      if (d.length > 1) gap = Math.round(daysBetween(d[0], d[d.length - 1]) / (d.length - 1) * 10) / 10;
      return { student: r.student, packs: r.packs, lessons: r.lessons, noshow: r.noshow, excused: r.excused, left: r.left, spent: r.spent, currency: r.currency,
        attended: r.lessons - r.noshow, attendance: r.lessons ? Math.round((r.lessons - r.noshow) / r.lessons * 100) : null,
        last: d.length ? d[d.length - 1] : '', avgGap: gap, sinceLast: d.length && today ? daysBetween(d[d.length - 1], today) : null };
    }).sort(function (a, b) { return b.lessons - a.lessons || (a.student < b.student ? -1 : 1); });
  }
  /* students holding unused, unexpired lessons who have not had a lesson for `days` days (or never started) */
  function quiet(packs, today, days) {
    return studentStats(packs, today).filter(function (r) {
      return r.left > 0 && (r.sinceLast === null || r.sinceLast >= days);
    });
  }
  /* headline numbers for the whole history */
  function overview(packs, today) {
    var rows = studentStats(packs, today), lessons = 0, noshow = 0, excused = 0;
    rows.forEach(function (r) { lessons += r.lessons; noshow += r.noshow; excused += r.excused; });
    return { students: rows.length, lessons: lessons, noshow: noshow, excused: excused, noshowRate: lessons ? Math.round(noshow / lessons * 100) : 0 };
  }

  /* ---- balance card: a read-only snapshot packed into a URL hash, no server ---- */
  function b64e(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return (typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64'))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64d(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encodeCard(p, teacher) {
    return b64e(JSON.stringify({
      v: 1, t: teacher || '', n: p.student, T: p.total, x: p.expires || '',
      s: counted(p).map(function (s) { return s.date; })
    }));
  }
  function decodeCard(str) {
    try {
      var o = JSON.parse(b64d(str));
      if (!o || o.v !== 1 || typeof o.n !== 'string' || !(o.T > 0) || !Array.isArray(o.s)) return null;
      if (o.T > 1000 || o.s.length > 1000) return null;
      var re = /^\d{4}-\d{2}-\d{2}$/;
      if (o.x && !re.test(o.x)) return null;
      for (var i = 0; i < o.s.length; i++) if (!re.test(o.s[i])) return null;
      return { teacher: String(o.t || '').slice(0, 80), student: o.n.slice(0, 80), total: o.T, expires: o.x || '', dates: o.s };
    } catch (e) { return null; }
  }

  /* ---- csv ---- */
  function csvCell(v) {
    v = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; /* neutralise spreadsheet formulas */
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function toCsv(packs) {
    var rows = [['student', 'pack_start', 'expires', 'total', 'used', 'remaining', 'price', 'currency', 'lesson_dates', 'no_shows', 'excused']];
    packs.forEach(function (p) {
      rows.push([p.student, p.start || '', p.expires || '', p.total, used(p), remaining(p), p.price, p.currency || '',
        counted(p).map(function (s) { return s.date; }).join(' '),
        p.stamps.filter(function (s) { return s.kind === 'noshow'; }).length, p.stamps.filter(function (s) { return s.kind === 'excused'; }).length]);
    });
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\n');
  }

  /* ---- offline licence check. Placeholder scheme: anyone reading this file can mint a key.
     Replace with a vendor-issued key + server check before charging real money. ---- */
  function keySum(body) {
    var h = 7;
    for (var i = 0; i < body.length; i++) h = (h * 31 + body.charCodeAt(i)) % 46656;
    return h.toString(36).toUpperCase().padStart(3, '0');
  }
  function makeKey(seed) {
    var body = (seed || 'AAAAAAAA').toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(8, 'A').slice(0, 8);
    return 'SB-' + body.slice(0, 4) + '-' + body.slice(4, 8) + '-' + keySum(body);
  }
  function validKey(k) {
    var m = /^SB-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{3})$/.exec(String(k || '').trim().toUpperCase());
    return !!m && keySum(m[1] + m[2]) === m[3];
  }

  var API = {
    todayStr: todayStr, parse: parse, daysBetween: daysBetween, addDays: addDays, addMonths: addMonths,
    counted: counted, used: used, setNote: setNote, monthsOf: monthsOf, renew: renew, extend: extend, attention: attention, matches: matches, remaining: remaining, perLesson: perLesson, unearned: unearned, status: status, daysLeft: daysLeft,
    addStamp: addStamp, removeStamp: removeStamp, monthStats: monthStats, totalUnearned: totalUnearned, lapsed: lapsed,
    ymAdd: ymAdd, monthGrid: monthGrid, events: events, dayMap: dayMap, monthlyTrend: monthlyTrend, weekdayCounts: weekdayCounts, studentStats: studentStats, quiet: quiet, overview: overview,
    encodeCard: encodeCard, decodeCard: decodeCard, toCsv: toCsv, csvCell: csvCell, makeKey: makeKey, validKey: validKey
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SB = API;
})(typeof window !== 'undefined' ? window : globalThis);
