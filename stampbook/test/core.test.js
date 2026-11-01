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

/* ---- insights ---- */
const stamp = (p, d, kind) => C.addStamp(p, d, '', kind);
const sample = () => {
  const a = mk({ id: 'a', student: 'Mina', total: 10 }), b = mk({ id: 'b', student: 'Joon', total: 4, price: 200 });
  stamp(a, '2026-09-30'); stamp(a, '2026-10-05'); stamp(a, '2026-10-12', 'noshow'); stamp(a, '2026-10-19', 'excused'); stamp(a, '2026-10-26');
  stamp(b, '2026-10-05'); stamp(b, '2026-11-02');
  return [a, b];
};
test('ymAdd crosses year boundaries', () => {
  assert.equal(C.ymAdd('2026-11', 1), '2026-12'); assert.equal(C.ymAdd('2026-12', 1), '2027-01'); assert.equal(C.ymAdd('2026-01', -2), '2025-11');
});
test('monthGrid is rectangular and starts on the right weekday', () => {
  const g = C.monthGrid('2026-11', 0); // 1 Nov 2026 is a Sunday
  assert.equal(g.length % 7, 0); assert.equal(g[0], '2026-11-01'); assert.equal(g.filter(Boolean).length, 30); assert.equal(g.length, 35);
  const m = C.monthGrid('2026-11', 1); assert.equal(m.indexOf('2026-11-01'), 6); assert.equal(m.length, 42);
  assert.equal(C.monthGrid('2026-02', 1).filter(Boolean).length, 28);
});
test('events and dayMap include every kind, sorted', () => {
  const ev = C.events(sample()); assert.equal(ev.length, 7); assert.equal(ev[0].date, '2026-09-30');
  const dm = C.dayMap(sample(), '2026-10'); assert.deepEqual(Object.keys(dm).sort(), ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
  assert.equal(dm['2026-10-05'].length, 2); assert.equal(dm['2026-10-19'][0].kind, 'excused');
});
test('monthlyTrend counts lessons and no-shows, excused excluded', () => {
  const t = C.monthlyTrend(sample(), '2026-11', 3);
  assert.deepEqual(t.map(x => x.ym), ['2026-09', '2026-10', '2026-11']);
  assert.deepEqual(t.map(x => x.lessons), [1, 4, 1]); assert.deepEqual(t.map(x => x.noshow), [0, 1, 0]);
  assert.equal(C.monthlyTrend([], '2026-01', 2)[0].lessons, 0);
});
test('weekdayCounts', () => {
  const c = C.weekdayCounts(sample()); // 05 Oct 2026 is Monday, 12 Oct Monday(noshow counts), 26 Oct Monday
  assert.equal(c.reduce((x, y) => x + y, 0), 6); assert.equal(c[1], 5);
});
test('studentStats merges packs by name and computes attendance', () => {
  const ps = sample(); ps.push(mk({ id: 'c', student: ' mina ', total: 2 })); stamp(ps[2], '2026-11-01');
  const rows = C.studentStats(ps, '2026-11-05'), m = rows.find(r => r.student === 'Mina');
  assert.equal(rows.length, 2); assert.equal(m.packs, 2); assert.equal(m.lessons, 5); assert.equal(m.noshow, 1); assert.equal(m.excused, 1);
  assert.equal(m.attendance, 80); assert.equal(m.last, '2026-11-01'); assert.equal(m.sinceLast, 4); assert.equal(m.spent, 1000);
  assert.equal(rows[0].student, 'Mina', 'busiest first');
  assert.equal(m.avgGap, Math.round(32 / 4 * 10) / 10);
});
test('studentStats handles students with no lessons', () => {
  const r = C.studentStats([mk()], '2026-11-01')[0];
  assert.equal(r.lessons, 0); assert.equal(r.attendance, null); assert.equal(r.last, ''); assert.equal(r.sinceLast, null); assert.equal(r.avgGap, null);
});
test('quiet lists students with lessons left and no recent lesson', () => {
  const ps = sample(), today = '2026-11-20';
  assert.deepEqual(C.quiet(ps, today, 14).map(r => r.student), ['Mina', 'Joon']);
  assert.deepEqual(C.quiet(ps, today, 20).map(r => r.student), ['Mina']);
  assert.deepEqual(C.quiet(ps, today, 30).length, 0);
  const done = mk({ total: 1 }); stamp(done, '2026-01-01');
  assert.equal(C.quiet([done], today, 14).length, 0, 'no lessons left means nothing to chase');
  assert.equal(C.quiet([mk({ expires: '2026-01-01' })], today, 14).length, 0, 'expired lessons are not chased');
  assert.equal(C.quiet([mk()], today, 14).length, 1, 'never started counts');
});
test('overview totals', () => {
  const o = C.overview(sample(), '2026-11-05');
  assert.deepEqual(o, { students: 2, lessons: 6, noshow: 1, excused: 1, noshowRate: 17 });
  assert.equal(C.overview([], '2026-11-05').noshowRate, 0);
});

test('app i18n: every language has every key', () => {
  const I = require('../app/i18n.js'), keys = Object.keys(I.L.en);
  for (const l of I.langs) for (const k of keys) assert.ok(typeof I.L[l][k] === 'string' && I.L[l][k].trim(), `${l}.${k}`);
});
