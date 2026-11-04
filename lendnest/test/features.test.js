const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../app/core.js');

test('tags: trimmed, de-duplicated case-insensitively, at most 5, 24 chars', () => {
  assert.deepEqual(C.parseTags(' tools, Tools ,books，garden'), ['tools', 'books', 'garden']);
  assert.equal(C.parseTags(['a', 'b', 'c', 'd', 'e', 'f', 'g']).length, 5);
  assert.equal(C.parseTags('x'.repeat(60))[0].length, 24);
  assert.deepEqual(C.parseTags(undefined), []);
});
test('tags: allTags counts most-used first and hasTag ignores case', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina');
  s.entries.push(C.makeEntry({ title: 'a', personId: p.id, tags: 'Tools' }), C.makeEntry({ title: 'b', personId: p.id, tags: 'tools, books' }));
  assert.deepEqual(C.allTags(s).map(x => [x.tag, x.count]), [['Tools', 2], ['books', 1]]);
  assert.ok(C.hasTag(s.entries[0], 'TOOLS')); assert.ok(!C.hasTag(s.entries[1], 'garden'));
});
test('search matches tags', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina'); const e = C.makeEntry({ title: 'Saw', personId: p.id, tags: 'workshop' });
  assert.ok(C.match(e, p, 'workshop')); assert.ok(!C.match(e, p, 'kitchen'));
});
test('reminder log: records valid tones and dates, keeps the newest 50', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina'); const e = C.makeEntry({ title: 'a', personId: p.id, dir: 'out' });
  assert.equal(C.recordNudge(e, 'shout', '2026-10-01'), false); assert.equal(C.recordNudge(e, 'firm', 'bad'), false);
  C.recordNudge(e, 'gentle', '2026-10-01'); C.recordNudge(e, 'final', '2026-10-05');
  assert.deepEqual(C.lastNudge(e), { date: '2026-10-05', tone: 'final' });
  for (let i = 0; i < 60; i++) C.recordNudge(e, 'firm', '2026-10-06');
  assert.equal(e.nudges.length, 50);
});
test('sanitize keeps tags and reminder log through a save and reload', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina'); const e = C.makeEntry({ title: 'a', personId: p.id, tags: 'x, y', dir: 'out' });
  C.recordNudge(e, 'gentle', '2026-10-01'); s.entries.push(e);
  const back = C.sanitize(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.entries[0].tags, ['x', 'y']); assert.deepEqual(back.entries[0].nudges, [{ date: '2026-10-01', tone: 'gentle' }]);
});
test('sanitize drops malformed reminder entries', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina');
  const raw = { people: [p], entries: [Object.assign(C.makeEntry({ title: 'a', personId: p.id }), { nudges: [{ date: 'nope', tone: 'gentle' }, { date: '2026-10-01', tone: 'x' }, null, { date: '2026-10-02', tone: 'firm' }] })], settings: {} };
  assert.deepEqual(C.sanitize(raw).entries[0].nudges, [{ date: '2026-10-02', tone: 'firm' }]);
});

test('reminders: due on or before today, oldest first, closed entries never due', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina');
  const a = C.makeEntry({ title: 'a', personId: p.id, date: '2026-10-01' }), b = C.makeEntry({ title: 'b', personId: p.id, date: '2026-10-01' }), c = C.makeEntry({ title: 'c', personId: p.id, date: '2026-10-01' });
  C.setRemindOn(a, '2026-10-05'); C.setRemindOn(b, '2026-10-03'); C.setRemindOn(c, '2026-10-20');
  s.entries.push(a, b, c);
  assert.deepEqual(C.remindersDue(s, '2026-10-05').map(e => e.title), ['b', 'a']);
  C.markReturned(a, '2026-10-04'); assert.deepEqual(C.remindersDue(s, '2026-10-05').map(e => e.title), ['b']);
  assert.equal(C.setRemindOn(b, 'nope'), ''); assert.equal(C.remindersDue(s, '2026-10-05').length, 0);
});
test('snooze moves the reminder to a day from now', () => {
  const e = C.makeEntry({ title: 'x', personId: 'p', date: '2026-10-01' });
  assert.equal(C.snoozeReminder(e, 3, '2026-10-05'), '2026-10-08');
});
test('sanitize keeps a valid reminder date and drops an invalid one', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina');
  const ok = C.makeEntry({ title: 'a', personId: p.id, remindOn: '2026-10-09' }), bad = C.makeEntry({ title: 'b', personId: p.id, remindOn: '2026-13-40' });
  s.entries.push(ok, bad); const back = C.sanitize(JSON.parse(JSON.stringify(s)));
  assert.equal(back.entries[0].remindOn, '2026-10-09'); assert.equal(back.entries[1].remindOn, '');
});
test('tag summary: open and closed counts, outstanding money per currency', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina');
  const m = C.makeEntry({ kind: 'money', amount: 40, currency: 'USD', title: 'loan', personId: p.id, date: '2026-10-01', tags: 'cash' });
  const i = C.makeEntry({ title: 'drill', personId: p.id, date: '2026-10-01', tags: 'Cash, tools' });
  s.entries.push(m, i); C.repay(m, 15, '2026-10-02');
  const r = C.tagSummary(s); const cash = r.find(x => x.tag.toLowerCase() === 'cash');
  assert.equal(cash.open, 2); assert.equal(cash.closed, 0); assert.deepEqual(cash.money, { USD: 25 });
  assert.equal(r.find(x => x.tag === 'tools').open, 1);
});

test('duplicate: same person, same direction, same title (any case), still open', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina'); const q = C.addPerson(s, 'Jun');
  const a = C.makeEntry({ title: 'Power drill', personId: p.id, dir: 'out' }); s.entries.push(a);
  assert.equal(C.findOpenDuplicate(s, { title: ' power DRILL ', personId: p.id, dir: 'out' }), a);
  assert.equal(C.findOpenDuplicate(s, { title: 'Power drill', personId: q.id, dir: 'out' }), null, 'other person');
  assert.equal(C.findOpenDuplicate(s, { title: 'Power drill', personId: p.id, dir: 'in' }), null, 'other direction');
  assert.equal(C.findOpenDuplicate(s, { title: 'Ladder', personId: p.id, dir: 'out' }), null, 'other title');
  assert.equal(C.findOpenDuplicate(s, { id: a.id, title: 'Power drill', personId: p.id, dir: 'out' }), null, 'editing itself is not a duplicate');
});
test('duplicate: a returned entry no longer counts', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina');
  const a = C.makeEntry({ title: 'Book', personId: p.id, dir: 'out' }); C.markReturned(a, '2026-10-01'); s.entries.push(a);
  assert.equal(C.findOpenDuplicate(s, { title: 'Book', personId: p.id, dir: 'out' }), null);
});
test('aging: buckets open lent entries by how late they are', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina'); const now = '2026-11-01';
  const mk = (due, extra) => { const e = C.makeEntry(Object.assign({ title: 'x', personId: p.id, dir: 'out', date: '2026-09-01', due: due }, extra || {})); s.entries.push(e); return e; };
  mk(''); mk('2026-11-05'); mk('2026-11-01'); mk('2026-10-27'); mk('2026-10-20'); mk('2026-09-30'); C.writeOff(mk('2026-09-30'));
  const back = mk('2026-10-01'); C.markReturned(back, '2026-10-02');
  s.entries.push(C.makeEntry({ title: 'b', personId: p.id, dir: 'in', date: '2026-09-01', due: '2026-09-02' }));
  assert.deepEqual(C.aging(s, now), { notDue: 3, late1to7: 1, late8to30: 1, late31plus: 1 });
});

const mkLoan = (s, person, o) => { const e = C.makeEntry(Object.assign({ title: 'x', personId: person.id, dir: 'out', date: '2026-10-01' }, o)); s.entries.push(e); return e; };
test('dueFrom: adds days to a lent date and refuses bad input', () => {
  assert.equal(C.dueFrom('2026-10-01', 14), '2026-10-15');
  assert.equal(C.dueFrom('2026-10-01', -1), ''); assert.equal(C.dueFrom('nope', 7), ''); assert.equal(C.dueFrom('2026-10-01', 1.5), '');
});
test('dueWithin: open entries due from today up to N days ahead, soonest first', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina'); const now = '2026-11-01';
  const a = mkLoan(s, p, { due: '2026-11-05' }); const b = mkLoan(s, p, { due: '2026-11-02' }); mkLoan(s, p, { due: '2026-11-20' }); mkLoan(s, p, { due: '2026-10-30' });
  assert.deepEqual(C.dueWithin(s, 7, now).map(e => e.id), [b.id, a.id]);
});
test('lastActivity: latest of lent, repayment, extension, reminder and return dates', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina');
  const e = mkLoan(s, p, { kind: 'money', amount: 100, due: '2026-12-01' });
  C.repay(e, 20, '2026-10-20'); C.recordNudge(e, 'gentle', '2026-10-25');
  assert.equal(C.lastActivity(e), '2026-10-25');
});
test('quiet: open entries with nothing new for N days', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina');
  const old = mkLoan(s, p, { date: '2026-08-01' }); mkLoan(s, p, { date: '2026-10-25' }); const back = mkLoan(s, p, { date: '2026-08-01' }); C.markReturned(back, '2026-08-02');
  assert.deepEqual(C.quiet(s, 30, '2026-11-01').map(e => e.id), [old.id]);
});
test('overdueByPerson: counts overdue entries per person, most first', () => {
  const s = C.newState(); const a = C.addPerson(s, 'Ann'); const b = C.addPerson(s, 'Ben'); const now = '2026-11-01';
  mkLoan(s, a, { due: '2026-10-01' }); mkLoan(s, a, { due: '2026-10-05' }); mkLoan(s, b, { due: '2026-10-20' }); mkLoan(s, b, { due: '2026-12-01' });
  assert.deepEqual(C.overdueByPerson(s, now).map(x => [x.name, x.count]), [['Ann', 2], ['Ben', 1]]);
});
test('returnRate: share of returned, dated entries that came back on or before the due date', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina');
  const ok = mkLoan(s, p, { due: '2026-10-10' }); C.markReturned(ok, '2026-10-09');
  const late = mkLoan(s, p, { due: '2026-10-10' }); C.markReturned(late, '2026-10-12');
  mkLoan(s, p, { due: '2026-10-10' }); // still open: not counted
  assert.deepEqual(C.returnRate(s), { onTime: 1, late: 1, rate: 0.5 });
  assert.deepEqual(C.returnRate(C.newState()), { onTime: 0, late: 0, rate: null });
});
test('renameTag: renames on every entry, case-insensitively, without duplicating', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina');
  const a = mkLoan(s, p, { tags: 'Tools, books' }); const b = mkLoan(s, p, { tags: 'tools, garden' }); mkLoan(s, p, { tags: 'books' });
  assert.equal(C.renameTag(s, 'TOOLS', 'hand tools'), 2);
  assert.deepEqual(a.tags, ['hand tools', 'books']); assert.deepEqual(b.tags, ['hand tools', 'garden']);
  assert.equal(C.renameTag(s, 'missing', 'x'), 0); assert.equal(C.renameTag(s, 'books', '  '), 0);
});
test('countByStatus: counts each state', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina'); const now = '2026-11-01';
  mkLoan(s, p, { due: '2026-10-01' }); mkLoan(s, p, { due: '2026-11-02' }); mkLoan(s, p, { due: '2026-12-30' });
  const r = mkLoan(s, p, {}); C.markReturned(r, '2026-10-02');
  assert.deepEqual(C.countByStatus(s, now), { open: 1, soon: 1, overdue: 1, returned: 1, written: 0 });
});
test('personStatement: open entries for one person, and null for an unknown person', () => {
  const s = C.newState(); const p = C.addPerson(s, 'Mina'); const q = C.addPerson(s, 'Jun');
  const m = mkLoan(s, p, { kind: 'money', amount: 50, title: '', due: '2026-12-01' }); C.repay(m, 20, '2026-10-05');
  mkLoan(s, q, { title: 'Ladder' }); const done = mkLoan(s, p, { title: 'Book' }); C.markReturned(done, '2026-10-03');
  const st = C.personStatement(s, p.id, '2026-11-01');
  assert.equal(st.person, 'Mina'); assert.deepEqual(st.rows.map(r => [r.kind, r.amount, r.status]), [['money', 30, 'open']]);
  assert.equal(C.personStatement(s, 'nobody', '2026-11-01'), null);
});
