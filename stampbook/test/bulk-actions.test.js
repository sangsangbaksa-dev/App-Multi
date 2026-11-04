const test = require('node:test'), assert = require('node:assert');
const C = require('../app/core.js');
const mk = (o) => Object.assign({ id: 'p1', student: 'Mina', total: 10, price: 500, currency: 'USD', start: '2026-10-01', expires: '2026-12-31', stamps: [], paid: true }, o);

test('moveStamp changes the date, keeps note and kind, and re-sorts', () => {
  const p = mk(); C.addStamp(p, '2026-10-02', 'homework'); C.addStamp(p, '2026-10-05', '', 'noshow');
  const id = p.stamps[0].id;
  assert.ok(C.moveStamp(p, id, '2026-10-09'));
  assert.deepEqual(p.stamps.map(s => s.date), ['2026-10-05', '2026-10-09']);
  const moved = p.stamps.find(s => s.id === id);
  assert.equal(moved.note, 'homework'); assert.equal(moved.kind, '');
});
test('moveStamp rejects a bad date or an unknown stamp', () => {
  const p = mk(); C.addStamp(p, '2026-10-02'); const id = p.stamps[0].id;
  assert.equal(C.moveStamp(p, id, '2026-13'), false);
  assert.equal(C.moveStamp(p, id, 'tomorrow'), false);
  assert.equal(C.moveStamp(p, id, ''), false);
  assert.equal(C.moveStamp(p, 'nope', '2026-10-03'), false);
  assert.equal(p.stamps[0].date, '2026-10-02', 'unchanged after rejects');
});
test('stampPlanned stamps each scheduled pack once, and a second press does nothing', () => {
  const a = mk({ id: 'a', student: 'Ann', schedule: { days: [4], time: '18:00' } }); // 2026-11-05 is a Thursday
  const b = mk({ id: 'b', student: 'Ben', schedule: { days: [4, 6], time: '' } });
  const c = mk({ id: 'c', student: 'Cy' }); // no schedule
  const d = '2026-11-05';
  assert.equal(C.stampPlanned([a, b, c], d), 2);
  assert.equal(C.counted(a).length, 1); assert.equal(C.counted(b).length, 1); assert.equal(C.counted(c).length, 0);
  assert.equal(C.stampPlanned([a, b, c], d), 0, 'already stamped that day');
});
test('stampPlanned skips a planned lesson that was skipped (holiday)', () => {
  const a = mk({ id: 'a', schedule: { days: [4], time: '', skip: ['2026-11-05'] } });
  assert.equal(C.stampPlanned([a], '2026-11-05'), 0);
  assert.equal(C.counted(a).length, 0);
});
test('stampPlanned never goes past a full pack', () => {
  const a = mk({ id: 'a', total: 1, schedule: { days: [4], time: '' } }); C.addStamp(a, '2026-10-01');
  assert.equal(C.stampPlanned([a], '2026-11-05'), 0);
});
test('dayPlanText lists the day with times, empty for a free day', () => {
  const a = mk({ id: 'a', student: 'Ann', schedule: { days: [4], time: '18:00' } });
  const b = mk({ id: 'b', student: 'Ben', schedule: { days: [4], time: '09:30' } });
  assert.equal(C.dayPlanText([a, b], '2026-11-05'), '09:30  Ben\n18:00  Ann');
  assert.equal(C.dayPlanText([a, b], '2026-11-06'), '');
});
