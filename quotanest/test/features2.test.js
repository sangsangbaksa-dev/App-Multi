const test = require('node:test');
const assert = require('node:assert/strict');
const QN = require('../app/core.js');

const HOUR = 60 * 60 * 1000;
const rec = (ts, input, source) => ({ ts, input, output: 0, cacheRead: 0, cacheWrite: 0, source: source || 'claude' });

test('blockHistory: newest first, one entry per 5-hour block, capped by n', () => {
  const base = Date.UTC(2026, 10, 4, 0);
  const recs = [rec(base, 100), rec(base + HOUR, 50), rec(base + 6 * HOUR, 300), rec(base + 12 * HOUR, 700)];
  const h = QN.blockHistory(recs, 'io', 2);
  assert.equal(h.length, 2);
  assert.equal(h[0].used, 700);
  assert.equal(h[1].used, 300);
  assert.equal(QN.blockHistory(recs, 'io', 0).length, 3); // 0 means the default of 5
  assert.equal(QN.blockHistory([], 'io', 5).length, 0);
});

test('minutesToReset: whole minutes, never negative, null without an end', () => {
  const now = Date.UTC(2026, 10, 4, 12);
  assert.equal(QN.minutesToReset(now, now + 90 * 60000), 90);
  assert.equal(QN.minutesToReset(now, now - 5 * 60000), 0);
  assert.equal(QN.minutesToReset(now, NaN), null);
});

test('countBySource: counts claude, codex, manual; unknown sources go to other', () => {
  const c = QN.countBySource([rec(1, 1, 'claude'), rec(2, 1, 'codex'), rec(3, 1, 'manual'), rec(4, 1, 'csv'), null]);
  assert.deepEqual(c, { claude: 1, codex: 1, manual: 1, other: 2 });
});

test('usageSummaryText: lists block, week and average with percentages', () => {
  const f = { active: { used: 300, pct: 0.3 }, week: { used: 900, pct: null, perDay: 300 } };
  const text = QN.usageSummaryText(f, { block: 'Block', week: 'Week', perDay: 'Per day' }, (n) => String(n));
  assert.equal(text, 'Block: 300 (30%)\nWeek: 900\nPer day: 300');
  assert.equal(QN.usageSummaryText(null, {}), '');
});

test('daysToWeekLimit: remaining divided by the daily average; null without a limit or an average', () => {
  assert.equal(QN.daysToWeekLimit(700, 100), 7);
  assert.equal(QN.daysToWeekLimit(0, 100), 0);
  assert.equal(QN.daysToWeekLimit(null, 100), null);
  assert.equal(QN.daysToWeekLimit(700, 0), null);
});

test('checkThreshold: over, near (80% or more) and ok; null without a limit', () => {
  assert.equal(QN.checkThreshold(1200, 1000), 'over');
  assert.equal(QN.checkThreshold(800, 1000), 'near');
  assert.equal(QN.checkThreshold(799, 1000), 'ok');
  assert.equal(QN.checkThreshold(5, 0), null);
});

test('sizeVerdict: ok up to 2000 tokens, large up to 5000, then too large', () => {
  assert.equal(QN.sizeVerdict(2000), 'ok');
  assert.equal(QN.sizeVerdict(2001), 'large');
  assert.equal(QN.sizeVerdict(5001), 'too_large');
});

test('calibrationError: mean relative error after the learned factor; null with no pairs', () => {
  assert.equal(QN.calibrationError([]), null);
  // One pair: factor 2 scales 100 to 200, which matches the actual 200 exactly.
  assert.equal(QN.calibrationError([{ estimated: 100, actual: 200 }]), 0);
  // Two pairs with the same ratio give zero error after correction.
  assert.equal(QN.calibrationError([{ estimated: 100, actual: 150 }, { estimated: 200, actual: 300 }]), 0);
});

test('percentSaved: rounds and clamps to 0..100', () => {
  assert.equal(QN.percentSaved(100, 75), 25);
  assert.equal(QN.percentSaved(100, 120), 0);
  assert.equal(QN.percentSaved(0, 0), 0);
  assert.equal(QN.percentSaved(10, -5), 100);
});
