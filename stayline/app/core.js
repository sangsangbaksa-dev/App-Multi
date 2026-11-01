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

  /* longest run of days starting on day number e that keeps `set` within the rule (set is not modified) */
  function runFit(set, rule, e) {
    var n = 0, added = [];
    for (var d = e; d < e + 800; d++) {
      if (!set[d]) { set[d] = true; added.push(d); }
      if (firstBreach(set, rule, e) !== null) { if (added[added.length - 1] === d) { delete set[d]; added.pop(); } break; }
      n++;
    }
    added.forEach(function (x) { delete set[x]; });
    return n;
  }
  /* first day number >= f where a run of `nights` days breaks nothing, or null */
  function firstFit(base, rule, nights, f) {
    for (var e = f; e < f + 800; e++) {
      var set = {}, k;
      for (k in base) set[k] = true;
      for (var i = 0; i < nights; i++) set[e + i] = true;
      if (firstBreach(set, rule, e) === null) return e;
    }
    return null;
  }
  /* how many days in a row can I stay if I arrive on `entry`? 0 means arriving already breaks the limit */
  function maxStay(tr, entry, today) {
    return runFit(stayDays(tr.trips, today || todayStr()), cleanRule(tr.rule), dn(entry));
  }
  /* first arrival date >= from for which a stay of `nights` days breaks nothing; null if impossible */
  function earliestEntry(tr, nights, from, today) {
    var rule = cleanRule(tr.rule);
    nights = Math.floor(nights);
    if (!(nights >= 1) || nights > rule.limit) return null;
    var e = firstFit(stayDays(tr.trips, today || todayStr()), rule, nights, dn(from));
    return e === null ? null : str(e);
  }

  /* ---- what-if itinerary. drafts = [{ id, from, to }] (both required), never counted as real trips.
     Drafts are replayed in date order on top of the real trips; each result says whether that leg fits. ---- */
  function validDraft(d) { return !!d && validDate(d.from) && validDate(d.to) && dn(d.to) >= dn(d.from) && dn(d.to) - dn(d.from) <= 366; }
  function byFrom(a, b) { return a.from < b.from ? -1 : a.from > b.from ? 1 : 0; }
  function simulate(tr, drafts, today) {
    today = today || todayStr();
    var rule = cleanRule(tr.rule), set = stayDays(tr.trips, today), res = [], peak = 0, peakDate = null, ok = true;
    (drafts || []).filter(validDraft).sort(byFrom).forEach(function (d) {
      var a = dn(d.from), b = dn(d.to), days = b - a + 1, fit = runFit(set, rule, a), i;
      for (i = a; i <= b; i++) set[i] = true;
      var breach = firstBreach(set, rule, a), p = 0, pd = null;
      for (i = a; i <= b; i++) { var u = usedOn(set, rule, i); if (u > p) { p = u; pd = i; } }
      if (p > peak) { peak = p; peakDate = str(pd); }
      var fits = breach === null;
      if (!fits) ok = false;
      var early = null;
      if (!fits && days <= rule.limit) {
        var tmp = {}, k;
        for (k in set) tmp[k] = true;
        for (i = a; i <= b; i++) delete tmp[i];
        /* days other drafts or real trips already hold stay in tmp, so the suggestion respects them */
        var e = firstFit(tmp, rule, days, a); early = e === null ? null : str(e);
      }
      res.push({ id: d.id, from: d.from, to: d.to, days: days, ok: fits, breachDate: breach === null ? null : str(breach),
        fit: fit, trimTo: !fits && fit > 0 ? str(a + fit - 1) : null, earliest: early, peak: p, peakDate: pd === null ? null : str(pd) });
    });
    return { ok: ok, legs: res, peak: peak, peakDate: peakDate, limit: rule.limit };
  }
  function addDraft(tr, d) {
    if (!validDraft(d)) return false;
    tr.drafts = tr.drafts || [];
    if (tr.drafts.length >= 20) return false;
    tr.drafts.push({ id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), from: d.from, to: d.to });
    tr.drafts.sort(byFrom);
    return true;
  }
  function removeDraft(tr, id) {
    var n = (tr.drafts || []).length; tr.drafts = (tr.drafts || []).filter(function (d) { return d.id !== id; }); return tr.drafts.length !== n;
  }
  /* turn every draft into a real (planned) trip and empty the list; returns how many moved */
  function commitDrafts(tr) {
    var n = 0;
    (tr.drafts || []).slice().forEach(function (d) { if (addTrip(tr, { place: '', from: d.from, to: d.to })) n++; });
    tr.drafts = [];
    return n;
  }

  /* ---- family / group: one trip for several counters (each keeps its own rule) ---- */
  function fitsRun(base, rule, e, nights) {
    var set = {}, k;
    for (k in base) set[k] = true;
    for (var i = 0; i < nights; i++) set[e + i] = true;
    return firstBreach(set, rule, e) === null;
  }
  /* everyone arrives on `entry`: how long can the group stay together, and who is the limit? */
  function groupMaxStay(trackers, entry, today) {
    today = today || todayStr();
    var people = trackers.map(function (tr) { return { id: tr.id, name: tr.name, max: maxStay(tr, entry, today) }; });
    var min = people.length ? Math.min.apply(null, people.map(function (p) { return p.max; })) : 0;
    return { days: min, people: people, limiting: people.filter(function (p) { return p.max === min; }).map(function (p) { return p.id; }) };
  }
  /* first arrival date >= from when the whole group can stay `nights` days; null if some rule never allows it */
  function groupEarliest(trackers, nights, from, today) {
    today = today || todayStr();
    nights = Math.floor(nights);
    if (!trackers.length || !(nights >= 1)) return null;
    var rules = trackers.map(function (tr) { return cleanRule(tr.rule); });
    if (rules.some(function (r) { return nights > r.limit; })) return null;
    var bases = trackers.map(function (tr) { return stayDays(tr.trips, today); });
    for (var e = dn(from), end = e + 800; e < end; e++) {
      var all = true;
      for (var i = 0; i < trackers.length && all; i++) all = fitsRun(bases[i], rules[i], e, nights);
      if (all) return str(e);
    }
    return null;
  }

  /* contiguous ranges of arrival dates (within `horizon` days after `from`) from which a stay of `nights` days fits */
  function arrivalWindows(tr, nights, from, today, horizon) {
    var rule = cleanRule(tr.rule), out = [];
    nights = Math.floor(nights);
    if (!(nights >= 1) || nights > rule.limit) return out;
    var base = stayDays(tr.trips, today || todayStr()), f = dn(from), cur = null;
    for (var e = f; e <= f + (horizon || 365); e++) {
      if (fitsRun(base, rule, e, nights)) { if (cur) cur.to = str(e); else { cur = { from: str(e), to: str(e) }; out.push(cur); } }
      else cur = null;
    }
    return out;
  }

  /* pasted text -> trips. One trip per line: two dates (YYYY-MM-DD, YYYY/M/D or YYYY.M.D) plus an optional place;
     one date = a single day. Lines that do not parse are returned in `bad` (1-based line numbers). */
  function parseTrips(text) {
    var trips = [], bad = [], DATE = /(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/g;
    String(text || '').split(/\r?\n/).slice(0, 500).forEach(function (line, i) {
      if (!line.trim()) return;
      var ds = [], m, rest = line;
      DATE.lastIndex = 0;
      while ((m = DATE.exec(line))) ds.push(m[1] + '-' + (m[2].length < 2 ? '0' : '') + m[2] + '-' + (m[3].length < 2 ? '0' : '') + m[3]);
      rest = line.replace(DATE, ' ').replace(/[,;→>\t]|\bto\b|(^|\s)[-~–—](\s|$)/gi, ' ').replace(/\s+/g, ' ').trim();
      var t = ds.length === 1 ? { from: ds[0], to: ds[0] } : ds.length === 2 ? { from: ds[0], to: ds[1] } : null;
      if (!t || !validTrip(t)) { bad.push(i + 1); return; }
      trips.push({ place: rest.slice(0, 60), from: t.from, to: t.to });
    });
    return { trips: trips, bad: bad };
  }

  /* heads-ups worth a banner today, across all counters: over, leave-by within 7 days, breach ahead within 14,
     permit ending within 30 (or already ended). Most urgent first. */
  var URGENT_DAYS = { over: 0, leave_by: 7, breach_ahead: 14, permit_end: 30, permit_gone: 0 };
  function urgent(trackers, today) {
    today = today || todayStr();
    var out = [];
    trackers.forEach(function (tr) {
      alerts(tr, today).forEach(function (a) {
        if (a.kind === 'over' || a.kind === 'permit_gone' || (a.kind in URGENT_DAYS && a.in >= 0 && a.in <= URGENT_DAYS[a.kind])) out.push({ kind: a.kind, date: a.date, in: a.in, id: tr.id, name: tr.name });
      });
    });
    return out.sort(function (a, b) { return a.in - b.in; });
  }
  /* plain-text version of a what-if result, for sharing */
  function itineraryText(sim, label) {
    return sim.legs.map(function (l) {
      return l.from + ' -> ' + l.to + ' (' + l.days + ') ' + (l.ok ? 'OK' : 'X ' + l.breachDate) + (label ? ' ' + label(l) : '');
    }).join('\n');
  }

  /* days spent inside per calendar month, oldest first, ending with the month of `today` */
  function monthlyUsage(tr, today, months) {
    today = today || todayStr();
    var set = stayDays(tr.trips, today), t = new Date(dn(today) * 86400000), out = [];
    for (var i = months - 1; i >= 0; i--) {
      var y = t.getUTCFullYear(), m = t.getUTCMonth() - i;
      var first = Date.UTC(y, m, 1) / 86400000, next = Date.UTC(y, m + 1, 1) / 86400000, n = 0;
      for (var d = first; d < next; d++) if (set[d]) n++;
      out.push({ month: str(first).slice(0, 7), days: n });
    }
    return out;
  }

  /* days left on each of the next `n` days if nothing new is added (an ongoing stay is assumed to end today) */
  function forecast(tr, today, n) {
    today = today || todayStr();
    var rule = cleanRule(tr.rule), set = stayDays(tr.trips, today), t = dn(today), out = [];
    for (var i = 0; i <= n; i++) out.push({ date: str(t + i), left: rule.limit - usedOn(set, rule, t + i) });
    return out;
  }

  /* dated heads-up list for one tracker, soonest first. kind: over | leave_by | frees | breach_ahead | permit_end | permit_gone.
     in = days from today (0 = today). */
  function alerts(tr, today) {
    today = today || todayStr();
    var rule = cleanRule(tr.rule), set = stayDays(tr.trips, today), t = dn(today), out = [];
    var s = summary(tr, today);
    function add(kind, d) { out.push({ kind: kind, date: str(d), in: d - t }); }
    if (s.left < 0) add('over', t);
    else if (s.inside) {
      var ld = lastDay(tr, today);
      if (ld) add('leave_by', dn(ld));
    }
    var ahead = firstBreach(set, rule, t + 1);
    if (ahead !== null && s.left >= 0) add('breach_ahead', ahead);
    if (s.freesOn) add('frees', dn(s.freesOn));
    if (s.permit) add(s.permit.state === 'gone' ? 'permit_gone' : 'permit_end', dn(tr.expires));
    return out.sort(function (a, b) { return a.in - b.in; });
  }

  /* all-day calendar events for every upcoming key date (separate from toIcs, which exports trips). label(kind, tracker) supplies the (translated) title. */
  function alertsIcs(trackers, today, label) {
    today = today || todayStr();
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stayline//EN', 'CALSCALE:GREGORIAN'], stamp = today.replace(/-/g, '') + 'T000000Z';
    trackers.forEach(function (tr) {
      alerts(tr, today).forEach(function (a) {
        if (a.kind === 'over' || a.kind === 'permit_gone' || a.in < 0) return;
        var day = a.date.replace(/-/g, ''), next = addDays(a.date, 1).replace(/-/g, '');
        lines.push('BEGIN:VEVENT', 'UID:' + tr.id + '-' + a.kind + '-' + day + '@stayline', 'DTSTAMP:' + stamp,
          'DTSTART;VALUE=DATE:' + day, 'DTEND;VALUE=DATE:' + next,
          'SUMMARY:' + icsEsc((label ? label(a.kind, tr) : a.kind) + (tr.name ? ' (' + tr.name + ')' : '')), 'END:VEVENT');
      });
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  /* If you are inside today and keep staying, the last day that still fits the rule (null if not inside,
     already over, or the limit is not reached within 800 days). */
  function lastDay(tr, today) {
    var rule = cleanRule(tr.rule), set = stayDays(tr.trips, today), t = dn(today);
    if (!set[t] || usedOn(set, rule, t) > rule.limit) return null;
    for (var d = t + 1; d <= t + 800; d++) {
      set[d] = true;
      if (usedOn(set, rule, d) > rule.limit) return str(d - 1);
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
      tr.drafts = [];
      (Array.isArray(t.drafts) ? t.drafts : []).slice(0, 20).forEach(function (x, i) {
        if (validDraft(x)) tr.drafts.push({ id: String(x.id || 'd' + i).slice(0, 40), from: x.from, to: x.to });
      });
      tr.drafts.sort(byFrom);
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
  function icsEsc(v) { return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
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
    stayDays: stayDays, usedOn: usedOn, summary: summary, maxStay: maxStay, lastDay: lastDay, earliestEntry: earliestEntry, strip: strip,
    validDraft: validDraft, simulate: simulate, addDraft: addDraft, removeDraft: removeDraft, commitDrafts: commitDrafts, forecast: forecast, groupMaxStay: groupMaxStay, groupEarliest: groupEarliest, monthlyUsage: monthlyUsage, urgent: urgent, itineraryText: itineraryText, arrivalWindows: arrivalWindows, parseTrips: parseTrips, alerts: alerts, alertsIcs: alertsIcs,
    validTrip: validTrip, addTrip: addTrip, updateTrip: updateTrip, sanitize: sanitize, removeTrip: removeTrip, toCsv: toCsv, toIcs: toIcs, csvCell: csvCell, makeKey: makeKey, validKey: validKey
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SL = API;
})(typeof window !== 'undefined' ? window : globalThis);
