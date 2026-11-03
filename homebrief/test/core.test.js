const test = require('node:test'), assert = require('node:assert/strict');
const H = require('../app/core.js'), I = require('../app/i18n.js');

test('names are masked (full, parts, CJK given name) and restored', () => {
  const names = { student: 'Kim Minjun', parent: '박소라', tutor: 'Waldo' }, m = H.nameMap(names);
  assert.equal(H.mask('Minjun and kim minjun met 소라 and 박소라 with Waldo', m), '[[STUDENT]] and [[STUDENT]] met [[PARENT]] and [[PARENT]] with [[TUTOR]]');
  assert.equal(H.unmask('Hi [[PARENT]], [[STUDENT]] ok. [[TUTOR]]', names), 'Hi 박소라, Kim Minjun ok. Waldo');
  assert.equal(H.mask('Minjuna stays', m), 'Minjuna stays', 'whole-word only for latin names');
});
test('unmask never leaves a raw token', () => { assert.ok(!/\[\[/.test(H.unmask('[[STUDENT]] [[PARENT]] [[TUTOR]]', {}))); });
test('scrub removes e-mails and phone numbers but keeps dates and small numbers', () => {
  assert.equal(H.scrub('a.b@x.com +82 10-1234-5678 on 2026-11-03, 12 problems'), '[email] [number] on 2026-11-03, 12 problems');
});
test('prepare = mask then scrub', () => { assert.equal(H.prepare('Waldo 010-1234-5678', H.nameMap({ tutor: 'Waldo' })), '[[TUTOR]] [number]'); });
test('sanitize drops junk, keeps valid data, defaults safely', () => {
  const d = H.sanitize({ ui: 'xx', tutorLang: 'ko', hideNames: false, license: 'K'.repeat(200), students: [{ id: 'a', name: ' Ann ', parentLang: 'zz', tone: 'rude' }, { name: '' }, null, { id: 'a', name: 'dup' }], reports: [{ studentId: 'a', kind: 'bogus', effort: 99, text: 't' }, { studentId: 'nope', text: 'x' }] });
  assert.equal(d.ui, ''); assert.equal(d.tutorLang, 'ko'); assert.equal(d.hideNames, false); assert.equal(d.license.length, 90);
  assert.equal(d.students.length, 1); assert.deepEqual([d.students[0].name, d.students[0].parentLang, d.students[0].tone], ['Ann', 'en', 'warm']);
  assert.equal(d.reports.length, 1); assert.deepEqual([d.reports[0].kind, d.reports[0].effort], ['report', 5]);
  assert.equal(H.sanitize('x').hideNames, true);
});
test('pickForSummary takes the latest N lesson reports of one student, oldest first', () => {
  const rs = [3, 1, 2, 4].map(n => ({ studentId: 'a', kind: 'report', date: '2026-11-0' + n, at: '' })).concat([{ studentId: 'a', kind: 'reply', date: '2026-11-09' }, { studentId: 'b', kind: 'report', date: '2026-11-08' }]);
  assert.deepEqual(H.pickForSummary(rs, 'a', 3).map(r => r.date), ['2026-11-02', '2026-11-03', '2026-11-04']);
});
test('payloadReports masks names and drops generated text', () => {
  const p = H.payloadReports([{ date: 'd', topics: 'Minjun', notes: 'Minjun 010 1234 5678 9', homework: '', effort: 3, understanding: 2, text: 'SECRET' }], H.nameMap({ student: 'Minjun' }));
  assert.equal(p[0].topics, '[[STUDENT]]'); assert.ok(!JSON.stringify(p).includes('SECRET'));
});
test('safeName and detect', () => { assert.equal(H.safeName('민준 / a?b'), '민준_a_b'); assert.equal(H.detect({ language: 'ko-KR' }), 'ko'); assert.equal(H.detect({ language: 'fr' }), 'en'); });
test('every UI string exists in all five languages and no placeholder is dropped', () => {
  const en = Object.keys(I.S.en); assert.ok(en.length > 100);
  for (const l of I.langs) { for (const k of en) assert.ok(I.S[l][k] && I.S[l][k].trim(), l + ':' + k); }
  for (const l of I.langs) assert.ok(!I.S[l].mockB.includes('[['), l);
});
test('output languages match the server list', () => { const { LANGS } = require('../lib/core.js'); assert.deepEqual([...H.OUT].sort(), Object.keys(LANGS).sort()); });
