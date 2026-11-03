/* Homebrief client logic. Pure (no DOM), unit-tested. Exposed as window.HB (browser) or module.exports (tests). */
(function (root) {
  var UI = ['en', 'ko', 'ja', 'zh', 'es'];
  var OUT = ['en', 'ko', 'ja', 'zh', 'zh-Hant', 'es', 'fr', 'de', 'pt', 'it', 'vi', 'th', 'id', 'ru', 'ar', 'hi', 'tr', 'nl', 'pl', 'tl'];
  var OUT_NAME = { en: 'English', ko: '한국어', ja: '日本語', zh: '简体中文', 'zh-Hant': '繁體中文', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português', it: 'Italiano', vi: 'Tiếng Việt', th: 'ไทย', id: 'Bahasa Indonesia', ru: 'Русский', ar: 'العربية', hi: 'हिन्दी', tr: 'Türkçe', nl: 'Nederlands', pl: 'Polski', tl: 'Filipino' };
  var TOKENS = { student: '[[STUDENT]]', parent: '[[PARENT]]', tutor: '[[TUTOR]]' };

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Name variants worth hiding: the full name, each word, and the given name of an unspaced CJK name (e.g. 김민준 -> 민준). */
  function variants(name) {
    name = String(name || '').trim(); if (name.length < 2) return [];
    var v = [name], parts = name.split(/\s+/);
    if (parts.length > 1) parts.forEach(function (p) { if (p.length >= 2) v.push(p); });
    else if (/^[぀-ヿ㐀-鿿가-힯]{3,4}$/.test(name)) v.push(name.slice(name.length === 4 ? 2 : 1));
    return v.filter(function (x, i) { return v.indexOf(x) === i; }).sort(function (a, b) { return b.length - a.length; });
  }
  function nameMap(names) { /* names: {student, parent, tutor} -> list of [regex, token], longest first */
    var list = [];
    Object.keys(TOKENS).forEach(function (k) { variants(names[k]).forEach(function (v) { list.push([v, TOKENS[k]]); }); });
    list.sort(function (a, b) { return b[0].length - a[0].length; });
    return list.map(function (p) { return [new RegExp(/^[A-Za-z0-9]/.test(p[0]) ? '\\b' + esc(p[0]) + '\\b' : esc(p[0]), 'gi'), p[1]]; });
  }
  function mask(text, map) { var t = String(text == null ? '' : text); map.forEach(function (p) { t = t.replace(p[0], p[1]); }); return t; }
  function unmask(text, names) {
    var t = String(text == null ? '' : text);
    Object.keys(TOKENS).forEach(function (k) { var re = new RegExp(esc(TOKENS[k]), 'g'); t = t.replace(re, names[k] || ({ student: 'the student', parent: 'Parent', tutor: '' })[k]); });
    return t;
  }
  /* Phones, e-mails and long digit runs never need to reach the AI. */
  function scrub(text) {
    return String(text == null ? '' : text).replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]').replace(/\+?\d[\d\s().-]{7,}\d/g, function (m) { return m.replace(/\D/g, '').length >= 9 ? '[number]' : m; });
  }
  function prepare(text, map) { return scrub(mask(text, map)); }

  function detect(nav) {
    var l = String((nav && (nav.language || (nav.languages && nav.languages[0]))) || 'en').toLowerCase().slice(0, 2);
    return UI.indexOf(l) >= 0 ? l : 'en';
  }

  var DEFAULT = function () { return { v: 1, ui: '', tutorLang: '', tutorName: '', hideNames: true, students: [], reports: [], license: '' }; };
  function str(v, n) { return typeof v === 'string' ? v.slice(0, n) : ''; }
  function sanitize(d) {
    var o = DEFAULT(); if (!d || typeof d !== 'object') return o;
    o.ui = UI.indexOf(d.ui) >= 0 ? d.ui : ''; o.tutorLang = OUT.indexOf(d.tutorLang) >= 0 ? d.tutorLang : ''; o.tutorName = str(d.tutorName, 60); o.hideNames = d.hideNames !== false; o.license = str(d.license, 90);
    var ids = {};
    (Array.isArray(d.students) ? d.students : []).slice(0, 300).forEach(function (s) {
      if (!s || typeof s !== 'object' || !str(s.name, 80).trim()) return;
      var id = str(s.id, 30) || uid(); if (ids[id]) return; ids[id] = 1;
      o.students.push({ id: id, name: str(s.name, 80).trim(), subject: str(s.subject, 80), parentName: str(s.parentName, 80), parentLang: OUT.indexOf(s.parentLang) >= 0 ? s.parentLang : 'en', tone: ['warm', 'concise', 'formal'].indexOf(s.tone) >= 0 ? s.tone : 'warm', goals: str(s.goals, 400) });
    });
    (Array.isArray(d.reports) ? d.reports : []).slice(0, 5000).forEach(function (r) {
      if (!r || typeof r !== 'object' || !ids[r.studentId]) return;
      o.reports.push({ id: str(r.id, 30) || uid(), studentId: r.studentId, kind: ['report', 'reply', 'summary'].indexOf(r.kind) >= 0 ? r.kind : 'report', date: str(r.date, 10), topics: str(r.topics, 400), notes: str(r.notes, 4000), homework: str(r.homework, 800), next: str(r.next, 800), effort: Math.min(5, Math.max(0, parseInt(r.effort, 10) || 0)), understanding: Math.min(5, Math.max(0, parseInt(r.understanding, 10) || 0)), subject: str(r.subject, 200), text: str(r.text, 5000), short: str(r.short, 800), mine: str(r.mine, 5000), at: str(r.at, 30) });
    });
    return o;
  }
  function today(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fileText(r, st) { return (r.subject ? r.subject + '\n\n' : '') + r.text + '\n'; }
  function safeName(s) { return String(s).replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'report'; }
  /* Lesson records for the progress summary, oldest first, only the saved lesson notes (never generated texts). */
  function pickForSummary(reports, studentId, n) {
    return reports.filter(function (r) { return r.studentId === studentId && r.kind === 'report'; }).sort(function (a, b) { return (a.date || '').localeCompare(b.date || '') || (a.at || '').localeCompare(b.at || ''); }).slice(-n);
  }
  function payloadReports(list, map) {
    return list.map(function (r) { return { date: r.date, topics: prepare(r.topics, map), notes: prepare(r.notes, map), homework: prepare(r.homework, map), effort: r.effort, understanding: r.understanding }; });
  }
  var api = { UI: UI, OUT: OUT, OUT_NAME: OUT_NAME, TOKENS: TOKENS, uid: uid, variants: variants, nameMap: nameMap, mask: mask, unmask: unmask, scrub: scrub, prepare: prepare, detect: detect, DEFAULT: DEFAULT, sanitize: sanitize, today: today, fileText: fileText, safeName: safeName, pickForSummary: pickForSummary, payloadReports: payloadReports };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HB = api;
})(typeof window !== 'undefined' ? window : globalThis);
