const test = require('node:test'), assert = require('node:assert');
const C = require('../app/core.js');
const mk = (o) => Object.assign({ id: 'p1', student: 'Mina', total: 10, price: 500, currency: 'USD', start: '2026-10-01', expires: '2026-12-31', stamps: [], paid: true }, o);
// 2026-11-05 is a Thursday (4), 2026-11-07 a Saturday (6)

test('weekText lists each planned date with times, empty when nothing is planned', () => {
  const a = mk({ id: 'a', student: 'Ann', schedule: { days: [4], time: '18:00' } });
  const b = mk({ id: 'b', student: 'Ben', schedule: { days: [4, 6], time: '' } });
  assert.equal(C.weekText([a, b], '2026-11-05', 3), '2026-11-05\n  Ben\n  18:00  Ann\n2026-11-07\n  Ben');
  assert.equal(C.weekText([mk()], '2026-11-05', 7), '');
});
test('nextLesson returns the first planned date, skipping skipped days, or null when done', () => {
  const a = mk({ schedule: { days: [4], time: '09:00', skip: ['2026-11-05'] } });
  assert.deepEqual(C.nextLesson(a, '2026-11-04'), { date: '2026-11-12', time: '09:00' });
  assert.equal(C.nextLesson(mk(), '2026-11-04'), null, 'no schedule');
  const done = mk({ total: 1, schedule: { days: [4] } }); C.addStamp(done, '2026-10-02');
  assert.equal(C.nextLesson(done, '2026-11-04'), null, 'no lessons left');
});
test('duplicatePack copies the terms and schedule, starts fresh, and gets a new id', () => {
  const p = mk({ months: 3, schedule: { days: [4], time: '18:00' }, ink: 2, stamps: [{ id: 's', date: '2026-10-02', note: '', kind: '' }] });
  const q = C.duplicatePack(p, '2026-11-01', 'new1');
  assert.equal(q.id, 'new1'); assert.equal(q.student, 'Mina'); assert.equal(q.total, 10); assert.equal(q.price, 500);
  assert.equal(q.start, '2026-11-01'); assert.equal(q.expires, '2027-02-01'); assert.deepEqual(q.stamps, []);
  assert.deepEqual(q.schedule, { days: [4], time: '18:00' }); assert.notEqual(q.schedule, p.schedule); assert.equal(q.ink, 2);
  assert.equal(q.renewsFrom, undefined, 'a duplicate is not a renewal');
});
test('skipRange skips planned days in the range once, and rejects bad ranges', () => {
  const a = mk({ schedule: { days: [4], time: '' } });
  assert.equal(C.skipRange(a, '2026-11-02', '2026-11-19'), 3, 'Thursdays 5, 12, 19');
  assert.deepEqual(a.schedule.skip, ['2026-11-05', '2026-11-12', '2026-11-19']);
  assert.equal(C.skipRange(a, '2026-11-02', '2026-11-19'), 0, 'second time adds nothing');
  assert.equal(C.skipRange(a, '2026-11-19', '2026-11-02'), -1, 'to before from');
  assert.equal(C.skipRange(a, 'nov', '2026-11-02'), -1);
  assert.equal(C.skipRange(a, '2026-01-01', '2027-06-01'), -1, 'longer than a year');
  assert.equal(C.skipRange(mk(), '2026-11-01', '2026-11-30'), 0, 'no schedule');
});
test('duplicateDates finds dates stamped more than once in one pack only', () => {
  const a = mk({ id: 'a', student: 'Ann' }); C.addStamp(a, '2026-10-02'); C.addStamp(a, '2026-10-02'); C.addStamp(a, '2026-10-03');
  const b = mk({ id: 'b', student: 'Ben' }); C.addStamp(b, '2026-10-02');
  assert.deepEqual(C.duplicateDates([a, b]), [{ packId: 'a', student: 'Ann', date: '2026-10-02', count: 2 }]);
});
test('packBackup is a backup file with one pack that round-trips', () => {
  const p = mk({ id: 'z' }); C.addStamp(p, '2026-10-02', 'note');
  const back = JSON.parse(C.packBackup(p));
  assert.equal(back.v, 1); assert.equal(back.packs.length, 1); assert.deepEqual(back.packs[0], JSON.parse(JSON.stringify(p)));
});
test('knownStudents is distinct, trimmed and sorted case-insensitively', () => {
  const list = [mk({ student: ' bo ' }), mk({ student: 'Ann' }), mk({ student: 'Bo' }), mk({ student: 'cy' })];
  assert.deepEqual(C.knownStudents(list), ['Ann', 'bo', 'cy']);
});
test('percentUsed counts counted lessons and caps at 100', () => {
  const p = mk({ total: 4 }); assert.equal(C.percentUsed(p), 0);
  C.addStamp(p, '2026-10-02'); C.addStamp(p, '2026-10-03', '', 'excused'); assert.equal(C.percentUsed(p), 25);
  C.addStamp(p, '2026-10-04'); C.addStamp(p, '2026-10-05'); assert.equal(C.percentUsed(p), 75);
  assert.equal(C.percentUsed(mk({ total: 0 })), 0);
});
