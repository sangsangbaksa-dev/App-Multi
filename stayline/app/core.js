/* Stayline core: pure functions, no DOM. Works in browser (window.SL) and Node.
   A "tracker" is { id, name, rule, trips }.
   rule  = { kind: 'rolling', limit, window }   e.g. 90 days in any 180
         | { kind: 'year',    limit }           e.g. 183 days per calendar year
   trip  = { id, place, from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' | '' }  ('' = still there)
   Both the first and last day of a trip count as full days. All maths is on UTC day numbers, so DST cannot shift a count. */
(function (root) {
  'use strict';
  var RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  function dn(s) { var m = RE.exec(s); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : NaN; }
  function str(n) {
    var d = new Date(n * 86400000), m = d.getUTCMonth() + 1, day = d.getUTCDate();
    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function todayStr(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function addDays(s, n) { return str(dn(s) + n); }
  function validDate(s) { var n = dn(s); return !isNaN(n) && str(n) === s; }

  var PRESETS = {
    schengen: { kind: 'rolling', limit: 90, window: 180 },
    tax183: { kind: 'year', limit: 183 }
  };
  function cleanRule(r) {
    r = r || PRESETS.schengen;
    var limit = Math.max(1, Math.min(366, Math.floor(+r.limit) || 90));
    if (r.kind === 'year') return { kind: 'year', limit: limit };
    var win = Math.max(limit, Math.min(730, Math.floor(+r.window) || 180));
    return { kind: 'rolling', limit: limit, window: win };
  }

  /* set of day numbers spent inside. Ongoing trips run through `today`. Overlaps count once. */
  function stayDays(trips, today) {
    var set = {}, t = dn(today);
    (trips || []).forEach(function (tr) {
      var a = dn(tr.from), b = tr.to ? dn(tr.to) : t;
      if (isNaN(a) || isNaN(b) || b < a || b - a > 3660) return;
      for (var d = a; d <= b; d++) set[d] = true;
    });
    return set;
  }
  function windowStart(rule, d) {
    if (rule.kind === 'year') return Date.UTC(new Date(d * 86400000).getUTCFullYear(), 0, 1) / 86400000;
    return d - (rule.window - 1);
  }
  function usedOn(set, rule, d) {
    var n = 0;
    for (var x = windowStart(rule, d); x <= d; x++) if (set[x]) n++;
    return n;
  }
  /* first stay-day >= from where the count passes the limit, or null */
  function firstBreach(set, rule, from) {
    var keys = Object.keys(set).map(Number).filter(function (d) { return d >= from; }).sort(function (a, b) { return a - b; });
    for (var i = 0; i < keys.length; i++) if (usedOn(set, rule, keys[i]) > rule.limit) return keys[i];
    return null;
  }

  /* where the tracker stands on `today`: used, left, state, and when the next day frees up */
  function summary(tr, today) {
    today = today || todayStr();
    var rule = cleanRule(tr.rule), set = stayDays(tr.trips, today), t = dn(today);
    var used = usedOn(set, rule, t), left = rule.limit - used;
    var state = left < 0 ? 'over' : left <= Math.max(5, Math.round(rule.limit * 0.15)) ? 'tight' : 'ok';
    var ws = windowStart(rule, t), freesOn = null;
    if (used >= rule.limit) {
      if (rule.kind === 'rolling') {
        /* first future day on which one more day still fits */
        for (var d = t + 1; d <= t + rule.window + 1; d++) if (usedOn(set, rule, d) < rule.limit) { freesOn = str(d); break; }
      } else freesOn = (new Date(t * 86400000).getUTCFullYear() + 1) + '-01-01';
    }
    var permit = null;
    if (tr.expires && validDate(tr.expires)) {
      var pd = dn(tr.expires) - t;
      permit = { days: pd, state: pd < 0 ? 'gone' : pd <= 30 ? 'soon' : 'ok' };
    }
    return { rule: rule, used: used, left: left, state: state, windowFrom: str(ws), freesOn: freesOn, inside: !!set[t], permit: permit };
  }

  /* how many days in a row can I stay if I arrive on `entry`? 0 means arriving already breaks the limit */
  function maxStay(tr, entry, today) {
    var rule = cleanRule(tr.rule), set = stayDays(tr.trips, today || todayStr()), e = dn(entry), n = 0;
    for (var d = e; d < e + 800; d++) {
      var had = set[d]; set[d] = true;
      if (firstBreach(set, rule, e) !== null) { if (!had) delete set[d]; break; }
      n++;
    }
    return n;
  }
  /* first arrival date >= from for which a stay of `nights` days breaks nothing; null if impossible */
  function earliestEntry(tr, nights, from, today) {
    var rule = cleanRule(tr.rule);
    nights = Math.floor(nights);
    if (!(nights >= 1) || nights > rule.limit) return null;
    var base = stayDays(tr.trips, today || todayStr()), f = dn(from);
    for (var e = f; e < f + 800; e++) {
      var set = {}, k;
      for (k in base) set[k] = true;
      for (var i = 0; i < nights; i++) set[e + i] = true;
      if (firstBreach(set, rule, e) === null) return str(e);
    }
    return null;
  }

  /* cells for the strip: every day of the current window, marked in/out/today */
  function strip(tr, today) {
    var rule = cleanRule(tr.rule), set = stayDays(tr.trips, today), t = dn(today), a = windowStart(rule, t), out = [];
    var end = rule.kind === 'year' ? Date.UTC(new Date(t * 86400000).getUTCFullYear(), 11, 31) / 86400000 : t;
    for (var d = a; d <= end; d++) out.push({ date: str(d), in: !!set[d], today: d === t, future: d > t });
    return out;
  }

  function validTrip(t) {
    if (!t || !validDate(t.from)) return false;
    if (t.to && (!validDate(t.to) || dn(t.to) < dn(t.from))) return false;
    return true;
  }
  function addTrip(tr, trip) {
    if (!validTrip(trip)) return false;
    tr.trips.push({ id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), place: String(trip.place || '').slice(0, 60), from: trip.from, to: trip.to || '' });
    tr.trips.sort(function (a, b) { return a.from < b.from ? 1 : a.from > b.from ? -1 : 0; });
    return true;
  }
  function updateTrip(tr, id, patch) {
    var t = tr.trips.filter(function (x) { return x.id === id; })[0];
    if (!t) return false;
    var next = { place: patch.place != null ? patch.place : t.place, from: patch.from, to: patch.to || '' };
    if (!validTrip(next)) return false;
    t.place = String(next.place || '').slice(0, 60); t.from = next.from; t.to = next.to;
    tr.trips.sort(function (a, b) { return a.from < b.from ? 1 : a.from > b.from ? -1 : 0; });
    return true;
  }
  /* rebuild a tracker list from untrusted JSON (restore from file): drop anything malformed, clamp the rest */
  function sanitize(list) {
    var out = [];
    (Array.isArray(list) ? list : []).slice(0, 50).forEach(function (t) {
      if (!t || typeof t !== 'object') return;
      var tr = { id: String(t.id || 'k' + out.length).slice(0, 40), name: String(t.name || '').slice(0, 40), rule: cleanRule(t.rule), expires: validDate(t.expires) ? t.expires : '', trips: [] };
      (Array.isArray(t.trips) ? t.trips : []).slice(0, 2000).forEach(function (x, i) {
        if (x && validTrip(x)) tr.trips.push({ id: String(x.id || 't' + i).slice(0, 40), place: String(x.place || '').slice(0, 60), from: x.from, to: x.to || '' });
      });
      tr.trips.sort(function (a, b) { return a.from < b.from ? 1 : a.from > b.from ? -1 : 0; });
      out.push(tr);
    });
    return out;
  }
  function removeTrip(tr, id) {
    var n = tr.trips.length; tr.trips = tr.trips.filter(function (t) { return t.id !== id; }); return tr.trips.length !== n;
  }

  function csvCell(v) {
    v = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function toCsv(trackers, today) {
    var rows = [['tracker', 'rule', 'permit_until', 'place', 'from', 'to', 'days']];
    trackers.forEach(function (tr) {
      var r = cleanRule(tr.rule), label = r.kind === 'year' ? r.limit + '/calendar-year' : r.limit + '/' + r.window;
      tr.trips.slice().reverse().forEach(function (t) {
        var days = Object.keys(stayDays([t], today || todayStr())).length;
        rows.push([tr.name, label, tr.expires || '', t.place, t.from, t.to, days]);
      });
    });
    return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\n');
  }

  /* iCalendar export: one all-day event per trip (DTEND is exclusive, so the day after the last day).
     An ongoing trip ends today. */
  function icsEsc(v) { return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function toIcs(trackers, today) {
    var t0 = today || todayStr(), stamp = t0.replace(/-/g, '') + 'T000000Z';
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stayline//EN', 'CALSCALE:GREGORIAN'];
    trackers.forEach(function (tr) {
      tr.trips.forEach(function (t) {
        var end = t.to || t0;
        lines.push('BEGIN:VEVENT', 'UID:' + String(t.id).replace(/[^A-Za-z0-9_-]/g, '') + '@stayline',
          'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + t.from.replace(/-/g, ''),
          'DTEND;VALUE=DATE:' + addDays(end, 1).replace(/-/g, ''),
          'SUMMARY:' + icsEsc((tr.name ? tr.name + ': ' : '') + (t.place || 'Stay')), 'END:VEVENT');
      });
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  /* ---- offline licence check. Placeholder scheme: anyone reading this file can mint a key.
     Replace with a vendor-issued key + server check before charging real money. ---- */
  function keySum(body) {
    var h = 11;
    for (var i = 0; i < body.length; i++) h = (h * 37 + body.charCodeAt(i)) % 46656;
    return h.toString(36).toUpperCase().padStart(3, '0');
  }
  function makeKey(seed) {
    var body = (seed || 'AAAAAAAA').toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(8, 'A').slice(0, 8);
    return 'SL-' + body.slice(0, 4) + '-' + body.slice(4, 8) + '-' + keySum(body);
  }
  function validKey(k) {
    var m = /^SL-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{3})$/.exec(String(k || '').trim().toUpperCase());
    return !!m && keySum(m[1] + m[2]) === m[3];
  }

  var API = {
    PRESETS: PRESETS, dn: dn, str: str, todayStr: todayStr, addDays: addDays, validDate: validDate, cleanRule: cleanRule,
    stayDays: stayDays, usedOn: usedOn, summary: summary, maxStay: maxStay, earliestEntry: earliestEntry, strip: strip,
    validTrip: validTrip, addTrip: addTrip, updateTrip: updateTrip, sanitize: sanitize, removeTrip: removeTrip, toCsv: toCsv, toIcs: toIcs, csvCell: csvCell, makeKey: makeKey, validKey: validKey
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SL = API;
})(typeof window !== 'undefined' ? window : globalThis);
