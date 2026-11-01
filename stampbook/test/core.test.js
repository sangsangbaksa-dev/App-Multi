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

/* ---- schedule, agenda, ics, backup nudge ---- */
const sched = (o) => { const p = mk(Object.assign({ start: '2026-11-01', expires: '2026-12-31', total: 3 }, o)); C.setSchedule(p, [1, 3], '18:30'); return p; };
test('setSchedule normalises days and time, empty removes it', () => {
  const p = mk(); assert.deepEqual(C.setSchedule(p, ['3', 1, 1, 9, -1, 'x', 2.5], '7:00'), { days: [1, 3], time: '' });
  assert.equal(C.setSchedule(p, [2], '07:05').time, '07:05');
  assert.equal(C.setSchedule(p, [], '10:00'), null); assert.equal(p.schedule, undefined);
});
test('upcoming respects remaining lessons, window and stamped dates', () => {
  const p = sched(); // Mondays and Wednesdays
  assert.deepEqual(C.upcoming(p, '2026-11-01', 14).map(e => e.date), ['2026-11-02', '2026-11-04', '2026-11-09']);
  C.addStamp(p, '2026-11-02'); assert.deepEqual(C.upcoming(p, '2026-11-01', 14).map(e => e.date), ['2026-11-04', '2026-11-09'], 'stamped day and used lesson drop out');
  assert.deepEqual(C.upcoming(sched({ start: '2026-11-05' }), '2026-11-01', 20).map(e => e.date), ['2026-11-09', '2026-11-11', '2026-11-16'], 'not before start');
  assert.deepEqual(C.upcoming(sched({ expires: '2026-11-03' }), '2026-11-01', 14).map(e => e.date), ['2026-11-02'], 'not after expiry');
  assert.deepEqual(C.upcoming(mk(), '2026-11-01', 14), [], 'no schedule');
  const done = sched({ total: 1 }); C.addStamp(done, '2026-10-30'); assert.deepEqual(C.upcoming(done, '2026-11-01', 14), []);
});
test('agenda merges packs sorted by date then time', () => {
  const a = sched({ id: 'a', student: 'A' }), b = sched({ id: 'b', student: 'B' }); C.setSchedule(b, [1], '09:00');
  const ag = C.agenda([a, b], '2026-11-02', 3);
  assert.deepEqual(ag.map(e => e.student + e.date.slice(8) + e.time), ['B0209:00', 'A0218:30', 'A0418:30']);
});
test('toIcs makes valid, escaped events', () => {
  const p = sched({ student: 'Mi,na; Kim' }), ics = C.toIcs([p], '2026-11-02', 1, Date.UTC(2026, 10, 1, 12, 0, 0));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.includes('SUMMARY:Mi\\,na\\; Kim')); assert.ok(ics.includes('DTSTART:20261102T183000') && ics.includes('DTEND:20261102T193000'));
  assert.ok(ics.includes('DTSTAMP:20261101T120000Z'));
  const late = mk({ id: 'l', start: '2026-11-01', expires: '' }); C.setSchedule(late, [1], '23:30');
  assert.ok(C.toIcs([late], '2026-11-02', 1, 0).includes('DTEND:20261103T003000'), 'crosses midnight');
  const allDay = mk({ id: 'd', start: '2026-11-01', expires: '' }); C.setSchedule(allDay, [1], '');
  assert.ok(C.toIcs([allDay], '2026-11-02', 1, 0).includes('DTSTART;VALUE=DATE:20261102'));
  assert.equal(C.toIcs([], '2026-11-02', 30, 0).includes('VEVENT'), false);
});
test('backupDue only when there is data worth saving', () => {
  const few = mk(); for (let i = 1; i <= 4; i++) C.addStamp(few, '2026-10-0' + i);
  const now = Date.UTC(2026, 10, 1); assert.equal(C.backupDue([few], 0, now), false);
  C.addStamp(few, '2026-10-05'); assert.equal(C.backupDue([few], 0, now), true);
  assert.equal(C.backupDue([few], now - 13 * 86400000, now), false); assert.equal(C.backupDue([few], now - 14 * 86400000, now), true);
});

/* ---- payments, note search, forecast ---- */
test('unpaid packs and outstanding amount', () => {
  const a = mk({ id: 'a', price: 300 }), b = mk({ id: 'b', price: 120.5 }), c = mk({ id: 'c' });
  assert.equal(C.setPaid(a, false), false); C.setPaid(b, false);
  assert.deepEqual(C.unpaid([a, b, c]).map(p => p.id), ['a', 'b']); assert.equal(C.outstanding([a, b, c]), 420.5);
  C.setPaid(a, true); assert.equal(C.outstanding([a, b, c]), 120.5);
  assert.equal(C.outstanding([mk({ paid: undefined })]), 0, 'legacy packs without the flag count as paid');
});
test('unpaid packs are left out of cash collected', () => {
  const p = mk({ start: '2026-10-03' }); assert.equal(C.monthStats([p], '2026-10').cash, 500);
  C.setPaid(p, false); assert.equal(C.monthStats([p], '2026-10').cash, 0);
});
test('searchNotes is case-insensitive, newest first, ignores short queries', () => {
  const p = mk(); C.addStamp(p, '2026-10-01', 'Scales and Arpeggios'); C.addStamp(p, '2026-10-08', 'homework: scales'); C.addStamp(p, '2026-10-15', 'sight reading');
  assert.deepEqual(C.searchNotes([p], ' SCALES ').map(e => e.date), ['2026-10-08', '2026-10-01']);
  assert.deepEqual(C.searchNotes([p], 's'), []); assert.deepEqual(C.searchNotes([p], ''), []); assert.deepEqual(C.searchNotes([p], 'zzz'), []);
  assert.equal(C.searchNotes([p], 'sc', 1).length, 1);
  assert.equal(C.searchNotes([p], 'scales')[0].student, 'Mina');
});
test('forecast values planned lessons at the per-lesson price', () => {
  const p = sched({ price: 300 }); // 3 lessons, 100 each, Mon/Wed
  assert.deepEqual(C.forecast([p], '2026-11-01', 14), { lessons: 3, value: 300 });
  assert.deepEqual(C.forecast([p], '2026-11-01', 4), { lessons: 2, value: 200 });
  assert.deepEqual(C.forecast([mk()], '2026-11-01', 30), { lessons: 0, value: 0 });
});

/* ---- presets and monthly report ---- */
test('presets ranks reused terms, ties go to the newer pack', () => {
  const ps = [mk({ id: '1', total: 8, price: 400 }), mk({ id: '2', total: 10, price: 500 }), mk({ id: '3', total: 10, price: 500 }), mk({ id: '4', total: 5, price: 250 })];
  const r = C.presets(ps, 2); assert.equal(r.length, 2); assert.deepEqual([r[0].total, r[0].price, r[0].count], [10, 500, 2]); assert.equal(r[1].total, 8, 'newest of the singles');
  assert.deepEqual(C.presets([], 3), []);
  assert.equal(C.presets(ps).length, 3, 'default is three');
});
test('presets keeps currency and validity apart', () => {
  const r = C.presets([mk({ id: '1', currency: 'KRW', months: 1, start: '', expires: '' }), mk({ id: '2', currency: 'USD', months: 3 })], 5);
  assert.equal(r.length, 2); assert.equal(r[0].currency, 'KRW'); assert.equal(r[0].months, 1); assert.equal(r[1].months, 3);
});
test('report summarises one month of a pack', () => {
  const p = mk({ total: 5 }); C.addStamp(p, '2026-09-30'); C.addStamp(p, '2026-10-05', 'scales'); C.addStamp(p, '2026-10-12', '', 'noshow'); C.addStamp(p, '2026-10-19', '', 'excused');
  const r = C.report(p, '2026-10', '2026-11-01');
  assert.deepEqual(r.rows.map(x => x.date), ['2026-10-05', '2026-10-12', '2026-10-19']);
  assert.deepEqual([r.lessons, r.noshow, r.excused, r.left, r.total, r.status], [2, 1, 1, 2, 5, 'active']);
  assert.equal(r.rows[0].note, 'scales'); assert.deepEqual(C.report(p, '2026-08', '2026-11-01').rows, []);
});
