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
