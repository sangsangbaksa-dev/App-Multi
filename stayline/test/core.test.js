const test = require('node:test'), assert = require('node:assert'), C = require('../app/core.js');
const tr = (trips, rule) => ({ id: 'x', name: 'Me', rule: rule || C.PRESETS.schengen, trips: trips.map(([from, to], i) => ({ id: 't' + i, place: '', from, to })) });

test('dates: day numbers are DST-proof and round-trip', () => {
  assert.equal(C.str(C.dn('2026-03-29')), '2026-03-29');
  assert.equal(C.dn('2026-03-30') - C.dn('2026-03-28'), 2);
  assert.equal(C.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(C.validDate('2026-02-30'), false);
  assert.equal(C.validDate('2028-02-29'), true);
});
test('first and last day both count', () => {
  const s = C.summary(tr([['2026-06-01', '2026-06-10']]), '2026-06-30');
  assert.equal(s.used, 10); assert.equal(s.left, 80); assert.equal(s.state, 'ok');
});
test('overlapping trips count each day once', () => {
  assert.equal(C.summary(tr([['2026-06-01', '2026-06-10'], ['2026-06-05', '2026-06-12']]), '2026-06-30').used, 12);
});
test('ongoing trip runs through today', () => {
  assert.equal(C.summary(tr([['2026-06-01', '']]), '2026-06-10').used, 10);
  assert.equal(C.summary(tr([['2026-06-01', '']]), '2026-06-10').inside, true);
});
test('rolling window: days older than 180 fall out', () => {
  const t = tr([['2026-01-01', '2026-03-31']]); // 90 days
  assert.equal(C.summary(t, '2026-06-29').used, 90);
  const s = C.summary(t, '2026-06-29'); assert.equal(s.state, 'tight'); assert.equal(s.left, 0);
  // Jan 1 is day 1 of window when today = Jun 29 (window of 180 days ends today); next day Jan 1 drops out
  assert.equal(C.summary(t, '2026-06-30').used, 89);
  assert.equal(s.freesOn, '2026-06-30');
});
test('over the limit is flagged', () => {
  const s = C.summary(tr([['2026-01-01', '2026-04-10']]), '2026-04-10'); // 100 days
  assert.equal(s.used, 100); assert.equal(s.left, -10); assert.equal(s.state, 'over');
});
test('maxStay from a clean slate is the limit', () => {
  assert.equal(C.maxStay(tr([]), '2026-07-01', '2026-06-01'), 90);
});
test('maxStay accounts for days already used', () => {
  const t = tr([['2026-05-01', '2026-06-09']]); // 40 days
  assert.equal(C.maxStay(t, '2026-07-01', '2026-06-15'), 50);
});
test('maxStay respects a later planned trip', () => {
  const t = tr([['2026-09-01', '2026-09-30']]); // 30 planned days, contiguous with a long July-August stay
  assert.equal(C.maxStay(t, '2026-07-01', '2026-06-15'), 60);
});
test('earliestEntry: immediately when there is room, later when full', () => {
  assert.equal(C.earliestEntry(tr([]), 30, '2026-07-01', '2026-06-01'), '2026-07-01');
  const full = tr([['2026-01-01', '2026-03-31']]);
  // while the window slides, one day leaves as one arrives, so a full 90 days can start straight away
  assert.equal(C.earliestEntry(full, 10, '2026-06-29', '2026-06-29'), '2026-06-30');
  // a stay that ended at the limit must wait until its first day leaves the window
  const jam = tr([['2026-06-01', '2026-08-29']]);
  assert.equal(C.earliestEntry(jam, 1, '2026-08-30', '2026-08-29'), '2026-11-28');
  assert.equal(C.earliestEntry(full, 91, '2026-06-29', '2026-06-29'), null);
});
test('calendar-year rule resets on Jan 1', () => {
  const r = { kind: 'year', limit: 183 };
  const t = tr([['2026-01-01', '2026-06-30']], r); // 181 days
  assert.equal(C.summary(t, '2026-07-01').used, 181);
  assert.equal(C.summary(t, '2027-01-02').used, 0);
  assert.equal(C.maxStay(t, '2026-07-01', '2026-07-01'), 2);
  assert.equal(C.summary(tr([['2026-01-01', '2026-07-02']], r), '2026-07-02').freesOn, '2027-01-01');
});
test('trip validation', () => {
  const t = tr([]);
  assert.equal(C.addTrip(t, { from: '2026-02-30', to: '' }), false);
  assert.equal(C.addTrip(t, { from: '2026-05-10', to: '2026-05-01' }), false);
  assert.equal(C.addTrip(t, { from: '2026-05-01', to: '2026-05-10', place: 'Lisbon' }), true);
  assert.equal(C.addTrip(t, { from: '2026-06-01', to: '' }), true);
  assert.equal(t.trips[0].from, '2026-06-01', 'newest first');
  assert.equal(C.removeTrip(t, t.trips[0].id), true); assert.equal(t.trips.length, 1);
});
test('cleanRule clamps nonsense', () => {
  assert.deepEqual(C.cleanRule({ kind: 'rolling', limit: 500, window: 10 }), { kind: 'rolling', limit: 366, window: 366 });
  assert.deepEqual(C.cleanRule({ kind: 'rolling', limit: 'abc', window: null }), { kind: 'rolling', limit: 90, window: 180 });
  assert.equal(C.cleanRule(null).limit, 90);
});
test('strip covers the window and flags today', () => {
  const s = C.strip(tr([['2026-06-01', '2026-06-03']]), '2026-06-10');
  assert.equal(s.length, 180); assert.equal(s[179].today, true); assert.equal(s.filter(c => c.in).length, 3);
  const y = C.strip(tr([], { kind: 'year', limit: 183 }), '2026-06-10'); assert.equal(y.length, 365); assert.equal(y.filter(c => c.future).length > 0, true);
});
test('csv neutralises formulas and quotes', () => {
  const t = tr([['2026-06-01', '2026-06-03']]); t.trips[0].place = '=HYPERLINK("x")'; t.name = 'A,B';
  const out = C.toCsv([t], '2026-06-10');
  assert.ok(out.includes("\"'=HYPERLINK(\"\"x\"\")\"")); assert.ok(out.includes('"A,B"')); assert.ok(out.includes(',3'));
});
test('licence keys', () => {
  const k = C.makeKey('TESTKEY1'); assert.ok(C.validKey(k)); assert.ok(C.validKey(k.toLowerCase()));
  assert.equal(C.validKey('SL-AAAA-AAAA-ZZZ'), false); assert.equal(C.validKey(''), false);
});
test('i18n: every language has every English key and the same placeholders', () => {
  const I = require('../app/i18n.js'), en = I.L.en, ph = s => (s.match(/\{\w+\}/g) || []).sort().join();
  for (const l of I.langs) for (const k of Object.keys(en)) {
    assert.ok(I.L[l][k] != null, l + ' missing ' + k);
    assert.equal(ph(I.L[l][k]), ph(en[k]), l + '.' + k + ' placeholders');
  }
  assert.equal(I.pick('ko'), 'ko'); assert.equal(I.pick('fr'), 'en');
});

test('permit: days to expiry and state', () => {
  const t = tr([]); t.expires = '2026-07-10';
  assert.deepEqual(C.summary(t, '2026-06-01').permit, { days: 39, state: 'ok' });
  assert.equal(C.summary(t, '2026-06-25').permit.state, 'soon');
  assert.equal(C.summary(t, '2026-07-10').permit.days, 0);
  assert.equal(C.summary(t, '2026-07-11').permit.state, 'gone');
  assert.equal(C.summary(tr([]), '2026-06-01').permit, null);
});
test('updateTrip edits, re-sorts and rejects bad dates', () => {
  const t = tr([['2026-05-01', '2026-05-10'], ['2026-06-01', '2026-06-05']]);
  const id = t.trips.filter(x => x.from === '2026-06-01')[0].id;
  assert.equal(C.updateTrip(t, id, { from: '2026-04-01', to: '2026-04-03', place: 'Rome' }), true);
  assert.deepEqual(t.trips.map(x => x.from), ['2026-05-01', '2026-04-01']); assert.equal(t.trips[1].place, 'Rome');
  assert.equal(C.updateTrip(t, id, { from: '2026-04-05', to: '2026-04-03' }), false);
  assert.equal(t.trips[1].from, '2026-04-01', 'unchanged after rejection');
  assert.equal(C.updateTrip(t, 'nope', { from: '2026-04-05' }), false);
});
test('sanitize drops malformed data and clamps rules', () => {
  const out = C.sanitize([
    { id: 'a', name: 'x'.repeat(100), rule: { kind: 'rolling', limit: 9999, window: 1 }, expires: 'bad', trips: [{ from: '2026-01-01', to: '2026-01-05' }, { from: 'nope' }, null, { from: '2026-02-02', to: '2026-02-01' }] },
    null, 'str', { trips: 'x' }
  ]);
  assert.equal(out.length, 2); assert.equal(out[0].name.length, 40); assert.equal(out[0].rule.limit, 366);
  assert.equal(out[0].expires, ''); assert.equal(out[0].trips.length, 1); assert.deepEqual(out[1].trips, []);
  assert.deepEqual(C.sanitize('nope'), []);
});

/* Cross-check against the worked examples in the European Commission's short-stay calculator user manual
   (home-affairs.ec.europa.eu, "short_stay_schengen_calculator_user_manual_en.pdf"). See docs/verification.md. */
test('EC manual example A: 90 days from 1 June 2014 end on 29 Aug 2014 (1 Jan stay has left the window)', () => {
  const t = tr([['2014-01-01', '2014-01-01']]);
  assert.equal(C.maxStay(t, '2014-06-01', '2014-05-31'), 90);
  assert.equal(C.addDays('2014-06-01', 89), '2014-08-29');
  const w = C.summary(tr([['2014-01-01', '2014-01-01'], ['2014-06-01', '2014-08-29']]), '2014-08-29');
  assert.equal(w.used, 90); assert.equal(w.windowFrom, '2014-03-03'); assert.equal(w.left, 0);
  assert.equal(C.summary(tr([['2014-01-01', '2014-01-01'], ['2014-06-01', '2014-08-30']]), '2014-08-30').left, -1);
});
test('EC manual example B: visa holder with three stays in 2015', () => {
  const t = tr([['2015-01-01', '2015-01-10'], ['2015-03-01', '2015-03-30'], ['2015-05-01', '2015-06-09']]);
  assert.equal(C.maxStay(t, '2015-06-20', '2015-06-20'), 20);
  assert.equal(C.maxStay(t, '2015-08-07', '2015-08-07'), 20);
  assert.equal(C.addDays('2015-08-07', 19), '2015-08-26', 'manual: leave on 26.8.2015');
  assert.equal(C.maxStay(t, '2015-08-08', '2015-08-08'), 50);
  assert.equal(C.maxStay(t, '2015-09-08', '2015-09-08'), 90);
});

test('toIcs: one all-day event per trip, end is exclusive, ongoing ends today, text escaped', () => {
  const t = tr([['2026-06-01', '2026-06-10'], ['2026-07-01', '']]);
  t.trips[0].place = 'Paris, FR';
  const ics = C.toIcs([t], '2026-07-05');
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/); assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(ics, /DTSTART;VALUE=DATE:20260601\r\nDTEND;VALUE=DATE:20260611/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260701\r\nDTEND;VALUE=DATE:20260706/);
  assert.match(ics, /SUMMARY:Me: Paris\\, FR/);
});

test('lastDay: last stay-day that fits when you keep staying; null when not inside or already over', () => {
  // 80 days used up to today (ongoing since 2026-04-12 => 2026-04-12..2026-06-30 = 80 days), limit 90 => 10 more days
  const t = tr([['2026-04-12', '']]);
  assert.equal(C.summary(t, '2026-06-30').used, 80);
  assert.equal(C.lastDay(t, '2026-06-30'), '2026-07-10');
  assert.equal(C.lastDay(tr([['2026-04-12', '2026-05-01']]), '2026-06-30'), null, 'not inside today');
  assert.equal(C.lastDay(tr([['2026-03-01', '']]), '2026-06-30'), null, 'already over');
  const y = tr([['2026-12-20', '']], { kind: 'year', limit: 183 });
  assert.equal(C.lastDay(y, '2026-12-25'), '2027-07-02', 'calendar-year rule resets on 1 Jan: day 183 of 2027');
});

/* ---- what-if itinerary, forecast, alerts, calendar export ---- */
const drafts = (list) => list.map(([from, to], i) => ({ id: 'd' + i, from, to }));

test('simulate: legs that fit are ok and report their peak', () => {
  const r = C.simulate(tr([]), drafts([['2026-07-01', '2026-07-30'], ['2026-09-01', '2026-09-20']]), '2026-06-01');
  assert.equal(r.ok, true); assert.equal(r.legs.length, 2);
  assert.equal(r.legs[0].days, 30); assert.equal(r.legs[0].peak, 30);
  assert.equal(r.legs[1].peak, 50); assert.equal(r.peak, 50); assert.equal(r.peakDate, '2026-09-20');
});
test('simulate: a leg that breaks the limit names the day, a trim and an earliest date', () => {
  const t = tr([['2026-05-01', '2026-06-09']]); // 40 days used
  const r = C.simulate(t, drafts([['2026-07-01', '2026-08-30']]), '2026-06-15'); // 61 more days -> 101
  const leg = r.legs[0];
  assert.equal(r.ok, false); assert.equal(leg.ok, false);
  assert.equal(leg.breachDate, '2026-08-20'); // 40 + 50 = 90 on Aug 19, 91 on Aug 20
  assert.equal(leg.fit, 50); assert.equal(leg.trimTo, '2026-08-19');
  assert.ok(leg.earliest > '2026-07-01');
  // the suggestion really fits
  assert.equal(C.simulate(t, drafts([[leg.earliest, C.addDays(leg.earliest, 60)]]), '2026-06-15').ok, true);
});
test('simulate: drafts are replayed in date order and count against each other', () => {
  const r = C.simulate(tr([]), drafts([['2026-03-20', '2026-04-19'], ['2026-01-10', '2026-03-10']]), '2026-01-01');
  assert.equal(r.legs[0].from, '2026-01-10');
  assert.equal(r.legs[1].peak, 60 + 31); assert.equal(r.legs[1].ok, false);
});
test('simulate: drafts never touch the real trips and overlaps count once', () => {
  const t = tr([['2026-07-01', '2026-07-10']]);
  const r = C.simulate(t, drafts([['2026-07-05', '2026-07-12']]), '2026-06-01');
  assert.equal(r.legs[0].peak, 12); assert.equal(t.trips.length, 1); assert.equal(C.summary(t, '2026-07-20').used, 10);
});
test('simulate: ignores malformed drafts; works with the year rule', () => {
  assert.equal(C.simulate(tr([]), [{ from: 'x', to: '2026-01-01' }, { from: '2026-02-02', to: '2026-02-01' }, null], '2026-01-01').legs.length, 0);
  const y = tr([], C.PRESETS.tax183);
  assert.equal(C.simulate(y, drafts([['2026-01-01', '2026-07-02']]), '2026-01-01').legs[0].ok, true);  // 183 days
  assert.equal(C.simulate(y, drafts([['2026-01-01', '2026-07-03']]), '2026-01-01').legs[0].ok, false); // 184
});
test('refactored maxStay and earliestEntry keep their answers', () => {
  assert.equal(C.earliestEntry(tr([]), 30, '2026-07-01', '2026-06-01'), '2026-07-01');
  assert.equal(C.earliestEntry(tr([]), 91, '2026-07-01', '2026-06-01'), null);
  const t = tr([['2026-05-01', '2026-06-09']]);
  assert.equal(C.maxStay(t, '2026-07-01', '2026-06-15'), 50);
  assert.equal(C.stayDays(t.trips, '2026-06-15')[C.dn('2026-07-01')], undefined); // no leaked days
});
test('addDraft / removeDraft / commitDrafts', () => {
  const t = tr([]);
  assert.equal(C.addDraft(t, { from: '2026-08-02', to: '2026-08-01' }), false);
  assert.equal(C.addDraft(t, { from: '2026-09-01', to: '2026-09-05' }), true);
  assert.equal(C.addDraft(t, { from: '2026-08-01', to: '2026-08-05' }), true);
  assert.equal(t.drafts[0].from, '2026-08-01');
  assert.equal(C.removeDraft(t, t.drafts[1].id), true); assert.equal(t.drafts.length, 1);
  C.addDraft(t, { from: '2026-10-01', to: '2026-10-05' });
  assert.equal(C.commitDrafts(t), 2); assert.equal(t.drafts.length, 0); assert.equal(t.trips.length, 2);
  for (let i = 0; i < 25; i++) C.addDraft(t, { from: '2027-01-01', to: '2027-01-02' });
  assert.equal(t.drafts.length, 20);
});
test('sanitize keeps valid drafts and drops bad ones', () => {
  const out = C.sanitize([{ id: 'a', name: 'x', trips: [], drafts: [{ id: 'd', from: '2026-01-01', to: '2026-01-05' }, { from: 'bad', to: '' }, { from: '2026-02-01', to: '2026-01-01' }] }]);
  assert.equal(out[0].drafts.length, 1); assert.equal(out[0].drafts[0].id, 'd');
  assert.deepEqual(C.sanitize([{ id: 'b', trips: [] }])[0].drafts, []);
});
test('forecast: room returns as old days fall out of the window', () => {
  const f = C.forecast(tr([['2026-01-01', '2026-03-31']]), '2026-06-29', 3);
  assert.equal(f.length, 4); assert.equal(f[0].left, 0); assert.equal(f[1].left, 1); assert.equal(f[3].left, 3);
});
test('alerts: must leave by, breach ahead, frees on, permit', () => {
  const inside = tr([['2026-06-01', '']]); inside.expires = '2026-06-20';
  const a = C.alerts(inside, '2026-06-10');
  const kinds = a.map(x => x.kind);
  assert.deepEqual(kinds, ['permit_end', 'leave_by']);
  assert.equal(a.find(x => x.kind === 'leave_by').date, '2026-08-29'); // day 90 of a stay that began Jun 1
  assert.equal(a.find(x => x.kind === 'permit_end').in, 10);
  const ahead = C.alerts(tr([['2026-06-01', '2026-06-30'], ['2026-08-01', '2026-10-31']]), '2026-07-05');
  assert.equal(ahead[0].kind, 'breach_ahead'); assert.equal(ahead[0].date, '2026-09-30'); // 30 + 60 = 90 on Sep 29, 91 on Sep 30
  const over = C.alerts(tr([['2026-01-01', '2026-04-10']]), '2026-04-10');
  assert.equal(over[0].kind, 'over');
  assert.deepEqual(C.alerts(tr([]), '2026-06-10'), []);
});
test('alertsIcs: valid all-day events, upcoming only, escaped', () => {
  const t = tr([['2026-06-01', '']]); t.id = 'k1'; t.name = 'Ann, Bob'; t.expires = '2026-07-01';
  const ics = C.alertsIcs([t], '2026-06-10', (k) => 'Stayline: ' + k);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n')); assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260701\r\nDTEND;VALUE=DATE:20260702'));
  assert.ok(ics.includes('SUMMARY:Stayline: permit_end (Ann\\, Bob)'));
  const gone = tr([]); gone.expires = '2026-01-01';
  assert.equal(C.alertsIcs([gone], '2026-06-10').includes('BEGIN:VEVENT'), false);
});

test('groupMaxStay: the tightest person limits the group', () => {
  const a = tr([]), b = tr([['2026-05-01', '2026-06-09']]); b.id = 'b'; a.id = 'a';
  const g = C.groupMaxStay([a, b], '2026-07-01', '2026-06-15');
  assert.equal(g.days, 50); assert.deepEqual(g.limiting, ['b']);
  assert.equal(g.people.find(p => p.id === 'a').max, 90);
  assert.equal(C.groupMaxStay([], '2026-07-01').days, 0);
});
test('groupEarliest: first date everyone fits; mixed rules; impossible lengths', () => {
  const a = tr([]), b = tr([['2026-01-01', '2026-03-31']]); // b used 90 days, room again from Jun 30
  assert.equal(C.groupEarliest([a], 30, '2026-06-01', '2026-06-01'), '2026-06-01');
  const e = C.groupEarliest([a, b], 10, '2026-06-01', '2026-06-01');
  assert.ok(e > '2026-06-01'); assert.equal(C.simulate(b, drafts([[e, C.addDays(e, 9)]]), '2026-06-01').ok, true);
  assert.equal(C.groupEarliest([a, tr([], { kind: 'rolling', limit: 20, window: 60 })], 30, '2026-06-01'), null);
  assert.equal(C.groupEarliest([], 5, '2026-06-01'), null);
});
test('monthlyUsage: days per month, across a year boundary', () => {
  const m = C.monthlyUsage(tr([['2025-12-30', '2026-01-02']]), '2026-02-10', 3);
  assert.deepEqual(m, [{ month: '2025-12', days: 2 }, { month: '2026-01', days: 2 }, { month: '2026-02', days: 0 }]);
});

test('arrivalWindows: ranges of arrival dates that fit', () => {
  const t = tr([['2026-01-01', '2026-03-31']]); // 90 used; room opens day by day from Jun 30
  const w = C.arrivalWindows(t, 5, '2026-06-01', '2026-06-01', 120);
  assert.equal(w.length, 1); assert.ok(w[0].from > '2026-06-01');
  assert.equal(C.maxStay(t, w[0].from, '2026-06-01') >= 5, true);
  assert.equal(C.maxStay(t, C.addDays(w[0].from, -1), '2026-06-01') >= 5, false);
  assert.deepEqual(C.arrivalWindows(tr([]), 30, '2026-06-01', '2026-06-01', 10), [{ from: '2026-06-01', to: '2026-06-11' }]);
  assert.deepEqual(C.arrivalWindows(tr([]), 91, '2026-06-01'), []);
});
test('arrivalWindows: a blocked stretch splits the windows', () => {
  const t = tr([['2026-07-01', '2026-07-20']]); // 20 days
  const w = C.arrivalWindows(t, 80, '2026-06-01', '2026-06-01', 60);
  assert.ok(w.length >= 1); assert.ok(w.every(x => x.from <= x.to));
});
test('parseTrips: lines with 1 or 2 dates, place text, bad lines reported', () => {
  const r = C.parseTrips('2026-03-01 to 2026-03-10 Paris\n2026/4/5 - 2026.4.9, Rome, Italy\n\n2026-05-02\nnothing here\n2026-06-10 2026-06-01\n');
  assert.equal(r.trips.length, 3); assert.deepEqual(r.bad, [5, 6]);
  assert.deepEqual(r.trips[0], { place: 'Paris', from: '2026-03-01', to: '2026-03-10' });
  assert.deepEqual(r.trips[1], { place: 'Rome Italy', from: '2026-04-05', to: '2026-04-09' });
  assert.deepEqual(r.trips[2], { place: '', from: '2026-05-02', to: '2026-05-02' });
  assert.deepEqual(C.parseTrips('').trips, []);
});

test('urgent: only near-term items, across counters, most urgent first', () => {
  const a = tr([['2026-06-01', '']]); a.id = 'a'; a.name = 'Ana'; // leave-by Aug 29
  const b = tr([]); b.id = 'b'; b.name = 'Ben'; b.expires = '2026-06-25';
  const u = C.urgent([a, b], '2026-06-10');
  assert.deepEqual(u.map(x => x.kind), ['permit_end']);          // permit in 15 days is within 30; Aug 29 is not within 7
  const u2 = C.urgent([a, b], '2026-08-25');
  assert.deepEqual(u2.map(x => x.kind + ':' + x.id), ['permit_gone:b', 'leave_by:a']);
  assert.deepEqual(C.urgent([tr([])], '2026-06-10'), []);
  assert.equal(C.urgent([tr([['2026-01-01', '2026-04-10']])], '2026-04-10')[0].kind, 'over');
});
test('itineraryText: one line per leg', () => {
  const sim = C.simulate(tr([]), drafts([['2026-07-01', '2026-07-10'], ['2026-08-01', '2026-12-31']]), '2026-06-01');
  const txt = C.itineraryText(sim).split('\n');
  assert.equal(txt.length, 2); assert.equal(txt[0], '2026-07-01 -> 2026-07-10 (10) OK'); assert.ok(txt[1].includes(' X 2026-'));
});

test('audit: finds overstay episodes with the worst excess; clean history is empty', () => {
  assert.deepEqual(C.audit(tr([['2026-01-01', '2026-03-31']]), '2026-06-01', 1), []);
  const t = tr([['2025-10-01', '2026-01-10']]); // 102 days
  const a = C.audit(t, '2026-06-01', 1);
  assert.equal(a.length, 1); assert.equal(a[0].from, '2025-12-30'); assert.equal(a[0].to, '2026-01-10'); assert.equal(a[0].over, 12);
  const two = C.audit(tr([['2025-10-01', '2026-01-10'], ['2026-05-01', '2026-07-30']]), '2026-07-30', 1);
  assert.equal(two.length, 2);
  assert.deepEqual(C.audit(tr([['2026-01-01', '']], C.PRESETS.tax183), '2026-06-01', 1), []);
});
