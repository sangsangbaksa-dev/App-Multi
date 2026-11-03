const test = require('node:test'), assert = require('node:assert');
const C = require('../app/core.js');
test('a class closure removes that date from planned lessons for every pack', () => {
  const p = { id: 'a', student: 'M', total: 10, price: 1, currency: 'USD', start: '2026-11-01', months: 0, expires: '', stamps: [], paid: true, schedule: { days: [1, 3, 5], time: '10:00' } };
  const dates = () => C.upcoming(p, '2026-11-02', 14).map(e => e.date);
  assert.ok(dates().includes('2026-11-04'));
  C.setClosures(['2026-11-04']);
  try { assert.ok(!dates().includes('2026-11-04')); assert.ok(dates().includes('2026-11-06')); }
  finally { C.setClosures([]); }
});
