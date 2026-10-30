const test = require('node:test'), assert = require('node:assert');
const C = require('../app/core.js');
const mk = (o) => Object.assign({ id: 'p1', student: 'Mina', total: 10, price: 500, currency: 'USD', start: '2026-10-01', expires: '2026-12-31', stamps: [], paid: true }, o);

test('remaining and per-lesson value', () => {
  const p = mk(); assert.equal(C.remaining(p), 10); assert.equal(C.perLesson(p), 50);
  C.addStamp(p, '2026-10-05'); C.addStamp(p, '2026-10-02');
  assert.equal(C.remaining(p), 8); assert.equal(C.unearned(p), 400);
  assert.equal(p.stamps[0].date, '2026-10-02', 'stamps stay sorted');
});
test('cannot stamp beyond total', () => {
  const p = mk({ total: 1 }); assert.ok(C.addStamp(p, '2026-10-01')); assert.equal(C.addStamp(p, '2026-10-02'), false);
});
test('status transitions', () => {
  const p = mk({ total: 3 });
  assert.equal(C.status(p, '2026-11-01'), 'active');
  C.addStamp(p, '2026-10-02'); C.addStamp(p, '2026-10-03');
  assert.equal(C.status(p, '2026-11-01'), 'low');
  assert.equal(C.status(p, '2027-01-01'), 'expired');
  C.addStamp(p, '2026-10-04'); assert.equal(C.status(p, '2027-01-01'), 'done');
  assert.equal(C.status(mk({ expires: '' }), '2030-01-01'), 'active');
});
test('removeStamp restores balance', () => {
  const p = mk(); C.addStamp(p, '2026-10-02'); const id = p.stamps[0].id;
  assert.ok(C.removeStamp(p, id)); assert.equal(C.remaining(p), 10); assert.equal(C.removeStamp(p, id), false);
});
test('date helpers incl. month-end clamp', () => {
  assert.equal(C.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(C.addMonths('2026-11-15', 3), '2027-02-15');
  assert.equal(C.addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(C.daysBetween('2026-10-01', '2026-10-31'), 30);
});
test('month stats and unearned total exclude expired', () => {
  const a = mk(); C.addStamp(a, '2026-10-05'); C.addStamp(a, '2026-11-02');
  const b = mk({ id: 'p2', start: '2026-11-03', price: 100, total: 4, expires: '2026-01-01' });
  const s = C.monthStats([a, b], '2026-10'); assert.deepEqual(s, { lessons: 1, earned: 50, cash: 500 });
  assert.equal(C.monthStats([a, b], '2026-11').cash, 100);
  assert.equal(C.totalUnearned([a, b], '2026-11-10'), 400);
  assert.equal(C.lapsed([a, b], '2026-11-10').length, 1);
});
test('balance card round-trips unicode and rejects junk', () => {
  const p = mk({ student: '김민아 😀' }); C.addStamp(p, '2026-10-05');
  const c = C.decodeCard(C.encodeCard(p, 'Park 선생님'));
  assert.equal(c.student, '김민아 😀'); assert.equal(c.teacher, 'Park 선생님'); assert.deepEqual(c.dates, ['2026-10-05']); assert.equal(c.total, 10);
  assert.equal(C.decodeCard('not-base64!!'), null);
  assert.equal(C.decodeCard(Buffer.from(JSON.stringify({ v: 1, n: 'x', T: 5, s: ['<script>'] })).toString('base64')), null);
  assert.equal(C.decodeCard(Buffer.from(JSON.stringify({ v: 1, n: 'x', T: 99999, s: [] })).toString('base64')), null);
  assert.equal(C.encodeCard(p, '').includes('+'), false);
});
test('csv escapes quotes, commas and formula injection', () => {
  const p = mk({ student: '=HYPERLINK("x"),"a"' });
  const out = C.toCsv([p]).split('\n')[1];
  assert.ok(out.startsWith('"\'=HYPERLINK(""x""),""a"""'), out);
});
test('licence keys', () => {
  const k = C.makeKey('hello123'); assert.ok(C.validKey(k)); assert.ok(C.validKey(' ' + k.toLowerCase() + ' '));
  assert.equal(C.validKey(k.slice(0, -1) + (k.endsWith('A') ? 'B' : 'A')), false); assert.equal(C.validKey(''), false);
});

test('excused absences are logged but not counted; no-shows are counted', () => {
  const p = mk({ total: 2 });
  assert.ok(C.addStamp(p, '2026-10-02', 'sick', 'excused')); assert.equal(C.remaining(p), 2);
  assert.ok(C.addStamp(p, '2026-10-03', '', 'noshow')); assert.equal(C.remaining(p), 1);
  assert.ok(C.addStamp(p, '2026-10-04')); assert.equal(C.status(p, '2026-10-05'), 'done');
  assert.equal(C.addStamp(p, '2026-10-06'), false); assert.ok(C.addStamp(p, '2026-10-06', 'late', 'excused'), 'excused allowed when full');
  assert.equal(C.decodeCard(C.encodeCard(p, '')).dates.length, 2);
  assert.equal(C.monthStats([p], '2026-10').lessons, 2);
  assert.ok(C.toCsv([p]).split('\n')[1].endsWith(',1,2'));
});
test('legacy stamps without kind still work', () => {
  const p = mk(); p.stamps.push({ id: 'x', date: '2026-10-01', note: '' }); assert.equal(C.remaining(p), 9);
});
test('notes are trimmed and settable', () => {
  const p = mk(); C.addStamp(p, '2026-10-01', 'x'.repeat(500)); assert.equal(p.stamps[0].note.length, 200);
  assert.ok(C.setNote(p, p.stamps[0].id, 'ok')); assert.equal(p.stamps[0].note, 'ok'); assert.equal(C.setNote(p, 'nope', 'z'), false);
});
test('renew copies terms; months derived for old packs', () => {
  const old = mk({ start: '2026-10-01', expires: '2026-12-31' }); assert.equal(C.monthsOf(old), 3);
  const n = C.renew(old, '2026-11-15', 'new1'); assert.equal(n.expires, '2027-02-15'); assert.equal(n.total, 10); assert.equal(n.stamps.length, 0); assert.equal(n.renewsFrom, 'p1');
  assert.equal(C.renew(mk({ expires: '' }), '2026-11-15').expires, '');
  assert.equal(C.monthsOf(mk({ months: 6 })), 6);
});
test('extend moves from later of expiry or today', () => {
  const p = mk({ expires: '2026-10-01' }); assert.equal(C.extend(p, 1, '2026-10-20'), '2026-11-20');
  const q = mk({ expires: '2026-12-10' }); assert.equal(C.extend(q, 1, '2026-10-20'), '2027-01-10');
});
test('attention and search', () => {
  const a = mk({ expires: '2026-11-03' }), b = mk({ id: 'b', student: 'Joon', expires: '2027-06-01' }), c = mk({ id: 'c', student: 'Ana', total: 1 });
  C.addStamp(c, '2026-10-01', '', ''); // done -> not attention
  const t = '2026-10-30'; assert.deepEqual(C.attention([a, b, c], t).map(x => x.id), ['p1']);
  assert.equal(C.matches(b, ' jo '), true); assert.equal(C.matches(b, 'zz'), false); assert.equal(C.matches(b, ''), true);
});
