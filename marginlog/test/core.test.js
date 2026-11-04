const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const C = require('../app/core.js'), I = require('../app/i18n.js');
const NOW = new Date(2026, 10, 2, 12, 0).getTime();
const mk = async (list, kind = 'noise') => {
  const c = { id: 'c', name: 'T', kind, quiet: [22, 7], entries: [], steps: [] };
  for (const f of list) { const last = c.entries[c.entries.length - 1]; c.entries.push(await C.seal(last ? last.hash : '', Object.assign({ type: 'event', rec: C.parseAt(f.at).ts + 6e4, text: 'loud music for a long time from upstairs' }, f))); }
  return c;
};

test('parseAt validates and gives Monday-based weekday', () => {
  assert.equal(C.parseAt('2026-11-02T10:05').dow, 0); assert.equal(C.parseAt('2026-11-08T23:59').dow, 6);
  for (const bad of ['', null, '2026-02-30T10:00', '2026-13-01T10:00', '2026-11-02T24:00', '2026-11-02 10:60', 'x']) assert.equal(C.parseAt(bad), null, String(bad));
});
test('chain verifies, and any tampering is caught at the right record', async () => {
  const c = await mk([{ at: '2026-10-01T23:00' }, { at: '2026-10-02T23:10' }, { at: '2026-10-03T02:00' }]);
  assert.deepEqual((await C.verifyChain(c.entries)).ok, true);
  const t1 = JSON.parse(JSON.stringify(c.entries)); t1[1].text = 'changed'; const r1 = await C.verifyChain(t1); assert.equal(r1.ok, false); assert.equal(r1.bad, 1);
  const t2 = JSON.parse(JSON.stringify(c.entries)); t2.splice(1, 1); assert.equal((await C.verifyChain(t2)).bad, 1);
  const t3 = JSON.parse(JSON.stringify(c.entries)); t3[0].at = '2026-09-01T10:00'; assert.equal((await C.verifyChain(t3)).bad, 0);
  assert.equal((await C.verifyChain([])).ok, true);
});
test('void hides an event from stats but keeps it in the chain; notes attach', async () => {
  const c = await mk([{ at: '2026-10-01T23:00' }, { at: '2026-10-02T23:00' }]);
  const last = c.entries[1]; c.entries.push(await C.seal(last.hash, { type: 'void', ref: c.entries[0].id, at: '2026-10-03T08:00', rec: NOW, text: 'wrong night' }));
  c.entries.push(await C.seal(c.entries[2].hash, { type: 'note', ref: c.entries[1].id, at: '2026-10-03T09:00', rec: NOW, text: 'neighbour apologised' }));
  assert.equal(C.events(c.entries).length, 1); assert.equal(C.addenda(c.entries, c.entries[1].id).length, 1); assert.equal((await C.verifyChain(c.entries)).ok, true);
});
test('seal clamps and cleans fields', async () => {
  const e = await C.seal('', { at: '2026-10-01T10:00', rec: 1, text: 'x'.repeat(5000), sev: 99, dur: -4, tags: ' Bass, bass ,LOUD,,' });
  assert.equal(e.text.length, 4000); assert.equal(e.sev, 5); assert.equal(e.dur, 0); assert.deepEqual(e.tags, ['bass', 'loud']);
});
test('quiet window wraps midnight', () => {
  assert.ok(C.inQuiet(23, [22, 7])); assert.ok(C.inQuiet(3, [22, 7])); assert.ok(!C.inQuiet(7, [22, 7])); assert.ok(!C.inQuiet(12, [22, 7])); assert.ok(C.inQuiet(13, [12, 14])); assert.ok(!C.inQuiet(5, null)); assert.ok(!C.inQuiet(5, [8, 8]));
});
test('stats: counts, windows, quiet hits, late, gap, trend', async () => {
  const c = await mk([{ at: '2026-10-20T23:30' }, { at: '2026-10-25T03:00' }, { at: '2026-10-30T14:00', sev: 4, dur: 30 }, { at: '2026-11-01T22:30', sev: 2, rec: NOW }, { at: '2026-09-20T22:30' }, { at: '2026-09-25T10:00', rec: NOW }]);
  const s = C.stats(c, NOW);
  assert.equal(s.total, 6); assert.equal(s.last30, 4); assert.equal(s.prev30, 2); assert.equal(s.quiet, 4); assert.equal(s.late, 1);
  assert.equal(s.minutes, 30); assert.equal(s.sinceDays, 1); assert.equal(s.avgSev, 3); assert.equal(s.trend, 'up'); assert.ok(s.longestGap >= 4);
  assert.equal(C.stats({ entries: [], quiet: null }, NOW).sinceDays, null);
});
test('heatmap and weekly bucket by weekday/hour and week', async () => {
  const c = await mk([{ at: '2026-11-02T10:00' }, { at: '2026-11-02T10:30' }, { at: '2026-11-08T23:00' }, { at: '2026-10-26T09:00' }]);
  const h = C.heatmap(C.events(c.entries)); assert.equal(h.grid[0][10], 2); assert.equal(h.grid[6][23], 1); assert.equal(h.max, 2);
  const w = C.weekly(C.events(c.entries), NOW, 8); assert.equal(w.length, 8); assert.equal(w[7].n, 3); assert.equal(w[6].n, 1);
});
test('topBand needs 5 events and finds the busiest weekday and 3-hour band', async () => {
  const c = await mk([{ at: '2026-10-02T22:00' }, { at: '2026-10-09T23:00' }, { at: '2026-10-16T22:30' }, { at: '2026-10-23T22:15' }, { at: '2026-10-20T10:00' }]);
  const tb = C.topBand(C.events(c.entries)); assert.equal(tb.dow, 4); assert.equal(tb.from, 21); assert.equal(C.topBand(C.events(c.entries).slice(0, 4)), null);
});
test('strength score and tips', async () => {
  const bare = await C.seal('', { at: '2026-10-01T10:00', rec: C.parseAt('2026-10-05T10:00').ts, text: 'short' });
  assert.equal(C.strength(bare).score, 0); assert.ok(C.strength(bare).tips.includes('timely'));
  const full = await C.seal('', { at: '2026-10-01T10:00', rec: C.parseAt('2026-10-01T11:00').ts, text: 'a long and specific description of what was heard', dur: 20, witness: 'Ana', photos: [{ id: 'p', h: 'h' }], tags: ['bass'] });
  assert.equal(C.strength(full).score, 100); assert.deepEqual(C.strength(full).tips, []);
});
test('suggestNext climbs the ladder', async () => {
  const day = d => '2026-10-' + String(d).padStart(2, '0') + 'T23:00';
  let c = await mk([]); assert.equal(C.suggestNext(c, NOW).key, 'none');
  c = await mk([{ at: day(30) }]); assert.equal(C.suggestNext(c, NOW).key, 'talk');
  c.steps.push({ id: 's1', kind: 'talk', at: '2026-10-31', note: '', due: '', done: false }); assert.equal(C.suggestNext(c, NOW).key, 'keep');
  c = await mk([{ at: day(28) }, { at: day(29) }, { at: day(30) }]); c.steps.push({ id: 's1', kind: 'talk', at: '2026-10-31', due: '', done: false }); assert.deepEqual([C.suggestNext(c, NOW).key, C.suggestNext(c, NOW).kind], ['written', 'written']);
  c.steps.push({ id: 's2', kind: 'written', at: '2026-11-01', due: '2026-11-05', done: false }); assert.equal(C.suggestNext(c, NOW).key, 'waiting');
  c.steps[1].due = '2026-11-01'; assert.equal(C.suggestNext(c, NOW).key, 'overdue');
  c.steps[1].due = ''; assert.equal(C.suggestNext(c, NOW).key, 'complaint');
  c.steps.push({ id: 's3', kind: 'complaint', at: '2026-11-02', due: '', done: false }); assert.equal(C.suggestNext(c, NOW).key, 'next'); assert.equal(C.suggestNext(c, NOW).kind, 'mediation');
});
test('CSV neutralises formulas and quotes cells; markdown report carries seal line', async () => {
  const c = await mk([{ at: '2026-10-01T23:00', text: '=HYPERLINK("x"),\nline', witness: '+1 Ana' }]);
  const csv = C.toCsv(c); assert.ok(csv.includes('"\'=HYPERLINK(""x""),\nline"')); assert.ok(csv.includes("'+1 Ana"));
  const L = Object.assign({}, I.L.en, { stepNames: I.stepNames('en'), days: I.L.en.days, sev: 'Severity', late: 'late', reportedTo: 'reported', stTotal: 'x' });
  const lab = { counterpart: 'Other', goal: 'Goal', generated: 'Generated', summary: 'Summary', total: 'Incidents', last30: 'Last 30', prev30: 'prev', avgSev: 'Avg', minutes: 'Min', quietHits: 'Quiet', pattern: 'Pattern', days: I.L.en.days, timeline: 'Timeline', sev: 'Severity', late: 'late', witness: 'Witness', photos: 'Photos', reportedTo: 'reported', voidedBadge: 'voided', recordedAt: 'recorded', steps: 'Steps', stepNames: I.stepNames('en'), due: 'due', answered: 'answered', integrity: 'Integrity', chainOk: I.L.en.chainOk, chainBad: I.L.en.chainBad };
  const chain = await C.verifyChain(c.entries); const md = C.reportMarkdown(c, lab, NOW, chain);
  assert.ok(md.startsWith('# T')); assert.ok(md.includes('Seal intact. Sealed records: 1')); assert.ok(C.reportMarkdown(c, lab, NOW, { ok: false }).includes('Seal check failed'));
});
test('sanitizeCase drops junk and clamps', () => {
  assert.equal(C.sanitizeCase(null), null);
  const s = C.sanitizeCase({ name: 'x'.repeat(200), kind: 'nope', quiet: [30, -2], entries: [{ id: 'a' }, null, { id: 'b', type: 'event', at: '2026-10-01T10:00', rec: 5, text: 't', hash: 'h', prev: '', sev: 77, tags: ['A'] }], steps: [{ kind: 'bogus', at: '2026-10-01' }, { kind: 'talk', at: '2026-10-01', due: 'soon' }] });
  assert.equal(s.name.length, 80); assert.equal(s.kind, 'other'); assert.deepEqual(s.quiet, [23, 0]); assert.equal(s.entries.length, 2, 'damaged record is kept, not dropped'); assert.equal(s.entries[1].sev, 5); assert.equal(s.steps.length, 1); assert.equal(s.steps[0].due, '');
});

test('i18n: every language has every key, same placeholders, arrays of 7 days', () => {
  const en = I.L.en, ph = s => (typeof s === 'string' ? (s.match(/\{[a-z]+\}/g) || []).sort().join() : '');
  for (const l of Object.keys(I.L)) {
    assert.equal(I.L[l].days.length, 7, l); assert.deepEqual(Object.keys(I.L[l]).sort(), Object.keys(en).sort(), l);
    for (const k of Object.keys(en)) { assert.ok(I.L[l][k] !== '' , l + ' ' + k); if (typeof en[k] === 'string') assert.equal(ph(I.L[l][k]), ph(en[k]), l + ' ' + k); }
    for (const k of C.STEP_KINDS) assert.ok(I.stepNames(l)[k], l + ' step ' + k);
  }
});
test('i18n: every key the UI asks for exists', () => {
  const src = fs.readFileSync(path.join(__dirname, '../app/app.js'), 'utf8'), en = I.L.en, missing = [];
  for (const m of src.matchAll(/\bt\('([A-Za-z0-9_]+)'/g)) if (!m[1].endsWith('_') && !(m[1] in en)) missing.push(m[1]);
  const dyn = { kind_: Object.keys(C.KINDS), kindHint_: Object.keys(C.KINDS), whatPh_: Object.keys(C.KINDS), trend_: ['up', 'down', 'flat'], fact_trend_: ['up', 'down', 'flat'], stepHint_: C.STEP_KINDS, tip_: ['text', 'dur', 'witness', 'photo', 'timely', 'tag'], rd_: ['count','span','strength','parties','written','late'], tab_: ['log', 'patterns', 'steps', 'report', 'case'], sg_: ['none', 'talk', 'written', 'complaint', 'next', 'keep', 'overdue', 'waiting', 'exhausted'] };
  for (const p in dyn) for (const k of dyn[p]) if (!((p + k) in en)) missing.push(p + k);
  assert.deepEqual(missing, []);
});
test('site build: five landing pages with hreflang and an app link', () => {
  const cp = require('child_process'); const out = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ml-'));
  cp.execFileSync(process.execPath, [path.join(__dirname, '../scripts/build.js')], { env: Object.assign({}, process.env, { OUT: out }), stdio: 'pipe' });
  for (const f of ['index.html', 'ko/index.html', 'ja/index.html', 'zh/index.html', 'es/index.html', 'app/index.html', 'app/sw.js', 'app/core.js', '_headers', 'icon-512.png']) assert.ok(fs.existsSync(path.join(out, f)), f);
  const ko = fs.readFileSync(path.join(out, 'ko/index.html'), 'utf8'); assert.ok(ko.includes('lang="ko"') && ko.includes('hreflang="es"') && ko.includes('href="../app/"'));
  assert.equal(fs.existsSync(path.join(out, 'test')), false);
});
test('voided entries stay in the report and CSV, marked, and are counted separately', async () => {
  const c = await mk([{ at: '2026-10-01T23:00', text: 'first incident text here' }, { at: '2026-10-02T23:00', text: 'second incident text here' }]);
  c.entries.push(await C.seal(c.entries[1].hash, { type: 'void', ref: c.entries[0].id, at: '2026-10-03T08:00', rec: NOW, text: 'wrong night' }));
  const lab = Object.assign({}, I.L.en, { recordedAt: 'recorded', stepNames: I.stepNames('en'), days: I.L.en.days, total: 'Incidents', last30: 'L', prev30: 'p', avgSev: 'A', minutes: 'M', quietHits: 'Q', reportedTo: 'r', late: 'late', sev: 'Sev', steps: 'Steps', due: 'due' });
  const md = C.reportMarkdown(c, lab, NOW, { ok: true, head: 'a'.repeat(64) });
  assert.ok(md.includes('VOIDED') && md.includes('wrong night') && md.includes('first incident text here')); assert.ok(md.includes('Incidents: 1'));
  assert.ok(C.toCsv(c).includes('wrong night'));
});

test('damaged or truncated chains are never reported as intact', async () => {
  const c = await mk([{ at: '2026-10-01T23:00' }, { at: '2026-10-02T23:00' }, { at: '2026-10-03T23:00' }]);
  const cp = { n: 3, head: c.entries[2].hash };
  assert.equal((await C.verifyChain(c.entries, cp)).ok, true);
  const cut = JSON.parse(JSON.stringify(c.entries)).slice(0, 2); const r = await C.verifyChain(cut, cp); assert.equal(r.ok, false); assert.equal(r.truncated, true);
  const dmg = JSON.parse(JSON.stringify(c)); delete dmg.entries[2].hash; const s = C.sanitizeCase(dmg); assert.equal(s.entries.length, 3); assert.equal((await C.verifyChain(s.entries)).ok, false);
  const swapped = JSON.parse(JSON.stringify(c.entries)); swapped.pop(); swapped.push(c.entries[1]); assert.equal((await C.verifyChain(swapped, cp)).ok, false);
});
test('suggestNext reports an exhausted ladder', async () => {
  const c = await mk([{ at: '2026-10-30T23:00' }, { at: '2026-10-31T23:00' }, { at: '2026-11-01T23:00' }]);
  for (const k of C.ladder(c)) c.steps.push({ id: k, kind: k, at: '2026-11-01', due: '', done: false });
  assert.equal(C.suggestNext(c, NOW).key, 'exhausted');
});
test('sanitizeCase rejects inherited property names as kind', () => {
  assert.equal(C.sanitizeCase({ name: 'x', kind: 'constructor' }).kind, 'other'); assert.equal(C.sanitizeCase({ name: 'x', kind: '__proto__' }).kind, 'other');
});

test('inRange: open or closed day bounds on the entry day, invalid stamps never match', () => {
  const at = '2026-10-10T23:30';
  assert.equal(C.inRange(at, '', ''), true);
  assert.equal(C.inRange(at, '2026-10-10', ''), true);
  assert.equal(C.inRange(at, '2026-10-11', ''), false);
  assert.equal(C.inRange(at, '', '2026-10-10'), true);
  assert.equal(C.inRange(at, '', '2026-10-09'), false);
  assert.equal(C.inRange(at, '2026-10-01', '2026-10-31'), true);
  assert.equal(C.inRange('not a date', '', ''), false);
});

test('notice letter is built only from the log and uses the chosen deadline', async () => {
  const c = await mk([{ at: '2026-10-20T23:30', dur: 30, text: 'Loud bass until late' }, { at: '2026-10-25T03:00', text: 'Again, stomping' }, { at: '2026-10-30T14:00', text: 'Music' }]);
  c.name = 'Flat 3B'; c.counterpart = 'Mr Lee'; c.goal = 'Keep quiet after 22:00';
  for (const lang of Object.keys(I.L)) {
    const L = Object.assign({}, I.L[lang], { stepNames: I.stepNames(lang) }), txt = C.noticeLetter(c, L, NOW, 14);
    assert.ok(txt.includes('Flat 3B') && txt.includes('Mr Lee') && txt.includes('2026-11-16') && txt.includes('Keep quiet after 22:00'), lang);
    assert.ok(!/\{[a-z]+\}/.test(txt), lang + ' unfilled placeholder');
    assert.ok(txt.includes('2026-10-20 23:30') && txt.includes('2026-10-30 14:00'));
  }
});
test('calendar export lists only open deadlines, escapes text and folds long lines', () => {
  const L = Object.assign({}, I.L.en, { stepNames: I.stepNames('en') });
  const c = { name: 'A, B; C', steps: [{ id: 's1', kind: 'written', at: '2026-11-01', due: '2026-11-15', done: false }, { id: 's2', kind: 'talk', at: '2026-11-01', due: '2026-11-10', done: true }, { id: 's3', kind: 'talk', at: '2026-11-01', due: '', done: false }] };
  const ics = C.toIcs(c, L, NOW);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 1); assert.ok(ics.includes('DTSTART;VALUE=DATE:20261115') && ics.includes('DTEND;VALUE=DATE:20261116'));
  assert.ok(ics.includes('A\\, B\\; C')); assert.equal(C.toIcs({ name: 'x', steps: [] }, L, NOW), '');
  const long = C.toIcs({ name: 'x'.repeat(200), steps: [c.steps[0]] }, L, NOW); assert.ok(long.split('\r\n').every(l => l.length <= 75));
  assert.equal(C.addDays('2026-12-31', 1), '2027-01-01');
});
test('readiness and tag counts', async () => {
  const c = await mk([{ at: '2026-10-01T23:00', tags: 'bass,party' }, { at: '2026-10-10T23:00', tags: 'bass' }, { at: '2026-10-20T23:00' }]);
  const r = C.readiness(c, NOW); assert.equal(r.total, 6); assert.deepEqual(r.checks.filter(x => x.ok).map(x => x.key), ['count', 'span', 'late']);
  c.counterpart = 'x'; c.goal = 'y'; c.steps.push({ id: 'w', kind: 'written', at: '2026-10-21', due: '', done: false });
  assert.ok(C.readiness(c, NOW).checks.find(x => x.key === 'written').ok && C.readiness(c, NOW).checks.find(x => x.key === 'parties').ok);
  assert.deepEqual(C.tagCounts(C.events(c.entries)), [{ tag: 'bass', n: 2 }, { tag: 'party', n: 1 }]);
});

test('encrypted backup: round trip works, wrong passphrase and altered data are refused', async () => {
  const env = await C.encryptText('{"app":"marginlog","cases":[]}', 'correct horse');
  assert.equal(env.alg, 'AES-GCM'); assert.ok(!JSON.stringify(env).includes('cases'));
  assert.equal(await C.decryptText(env, 'correct horse'), '{"app":"marginlog","cases":[]}');
  await assert.rejects(C.decryptText(env, 'wrong passphrase'));
  const bad = Object.assign({}, env, { data: env.data.slice(0, -4) + 'AAAA' });
  await assert.rejects(C.decryptText(bad, 'correct horse'));
  await assert.rejects(C.decryptText(Object.assign({}, env, { iter: 1e9 }), 'correct horse'), /format/);
});

test('overview: one row per case with counts, overdue deadlines and strength', async () => {
  const c = await mk([{ at: '2026-10-01T23:00', text: 'first incident text here' }]);
  c.name = 'Flat 3B'; c.steps = [{ id: 's1', kind: 'written', at: '2026-10-02', due: '2026-10-10', done: false }, { id: 's2', kind: 'talk', at: '2026-10-02', due: '2026-10-20', done: false }];
  const empty = { id: 'e', kind: 'work', name: '', entries: [], steps: [] };
  const rows = C.overview([c, empty], NOW);
  assert.equal(rows[0].name, 'Flat 3B'); assert.equal(rows[0].total, 1); assert.equal(rows[0].openSteps, 2);
  assert.equal(rows[0].overdue, 2); // both deadlines (Oct 10 and Oct 20) are before NOW (Nov 2)
  assert.equal(rows[1].total, 0); assert.equal(rows[1].strength, 0);
});

test('calendarAll: one calendar with open deadlines from every active case; digest lists overdue first', async () => {
  const L = Object.assign({}, I.L.en, { stepNames: I.stepNames('en') });
  const a = await mk([{ at: '2026-10-01T23:00', text: 'first incident text here' }]);
  a.name = 'Flat 3B'; a.steps = [{ id: 'st1', kind: 'written', at: '2026-10-02', due: '2026-10-10', done: false }];
  const b = await mk([{ at: '2026-10-05T23:00', text: 'second incident text here' }]);
  b.name = 'Boss'; b.steps = [{ id: 'st2', kind: 'talk', at: '2026-10-06', due: '2026-11-20', done: false }];
  const arch = Object.assign({}, b, { id: 'x', name: 'Old', archived: true, steps: [{ id: 'st3', kind: 'talk', at: '2026-10-06', due: '2026-11-21', done: false }] });
  const ics = C.calendarAll([a, b, arch], L, NOW);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR') && ics.trimEnd().endsWith('END:VCALENDAR'));
  assert.equal(C.calendarAll([], L, NOW), '');
  const md = C.digest([a, b, arch], L, NOW);
  assert.ok(md.includes('## Needs attention') && md.includes('Written notice in Flat 3B was due 2026-10-10'));
  assert.ok(md.includes('Flat 3B (Noise or neighbour)') || md.includes('Flat 3B ('));
  assert.ok(!md.includes('Old'));
});
