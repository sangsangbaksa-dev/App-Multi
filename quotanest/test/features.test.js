const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const QN = require('../app/core.js');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

test('forecast: weekly remaining is the limit minus this week, never negative, null without a limit', () => {
  const now = Date.UTC(2026, 10, 4, 12);
  const recs = [{ ts: now - HOUR, input: 300, output: 100, cacheRead: 0, cacheWrite: 0 }];
  assert.equal(QN.forecast({ records: recs, now, metric: 'io', weekLimit: 1000 }).week.remaining, 600);
  assert.equal(QN.forecast({ records: recs, now, metric: 'io', weekLimit: 100 }).week.remaining, 0);
  assert.equal(QN.forecast({ records: recs, now, metric: 'io', weekLimit: 0 }).week.remaining, null);
});

test('dailyTotals: 14 local days oldest first, zero-filled, counts only the chosen metric', () => {
  const now = Date.UTC(2026, 10, 4, 12);
  const recs = [
    { ts: now, input: 10, output: 5, cacheRead: 100, cacheWrite: 0 },
    { ts: now - 3 * DAY, input: 7, output: 0, cacheRead: 0, cacheWrite: 0 },
    { ts: now - 40 * DAY, input: 999, output: 0, cacheRead: 0, cacheWrite: 0 }
  ];
  const io = QN.dailyTotals(recs, 'io', now, 14);
  assert.equal(io.length, 14);
  assert.equal(io[13].day, QN.localDay(now));
  assert.equal(io[13].tokens, 15);
  assert.equal(io[13 - 3].tokens, 7);
  assert.equal(io.reduce((a, r) => a + r.tokens, 0), 22); // the 40-day-old record is outside the window
  const all = QN.dailyTotals(recs, 'all', now, 14);
  assert.equal(all[13].tokens, 115);
});

test('dailyTotals: skips records without a valid timestamp instead of throwing', () => {
  const now = Date.UTC(2026, 10, 4, 12);
  const out = QN.dailyTotals([{ ts: NaN, input: 5 }, null, { ts: now, input: 1, output: 0 }], 'io', now, 2);
  assert.equal(out[1].tokens, 1);
});

test('toCsv: header plus one integer row per day', () => {
  assert.equal(QN.toCsv([{ day: '2026-11-03', tokens: 12.4 }, { day: '2026-11-04', tokens: 0 }]),
    'day,tokens\n2026-11-03,12\n2026-11-04,0\n');
});

test('estimateCost: rate per million tokens, null when the rate is missing or zero', () => {
  assert.equal(QN.estimateCost(2000000, 3), 6);
  assert.equal(QN.estimateCost(500, '0.5'), 0.00025);
  assert.equal(QN.estimateCost(500, ''), null);
  assert.equal(QN.estimateCost(500, 0), null);
  assert.equal(QN.estimateCost(500, -1), null);
});

test('i18n: every language has exactly the same keys', () => {
  const sb = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'i18n.js'), 'utf8'), sb);
  const I = sb.window.QN_I18N;
  const base = Object.keys(I.en).sort();
  for (const lang of Object.keys(I)) {
    assert.deepEqual(Object.keys(I[lang]).sort(), base, lang + ' keys differ from en');
  }
});
