/* Homebrief UI. All text is inserted with textContent; nothing from the AI or the user is ever parsed as HTML. */
(function () {
  var H = window.HB, I = window.HBI, SITE = window.HB_SITE || {};
  var KEY = 'homebrief.v1', root = document.getElementById('root'), toastEl = document.getElementById('toast');
  var data = load(), tab = 'students', sess = null, gateMsg = '', editing = null;
  var draft = { report: {}, reply: {}, sum: {} }, result = { report: null, reply: null, summary: null };
  var busy = false;

  function load() { var d; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} return H.sanitize(d); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { toast(t('errNet')); } }
  function ui() { return data.ui || I.detect(navigator); }
  function t(k) { return (I.S[ui()] || I.S.en)[k] || I.S.en[k] || k; }
  function myLang() { return data.tutorLang || (H.OUT.indexOf(ui()) >= 0 ? ui() : 'en'); }
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove('on'); }, 2200); }

  function h(tag, attrs) {
    var el = document.createElement(tag), kids = Array.prototype.concat.apply([], Array.prototype.slice.call(arguments, 2));
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v); else if (k === 'class') el.className = v; else if (k === 'value') el.value = v; else el.setAttribute(k, v === true ? '' : v);
    });
    kids.forEach(function (c) { if (c == null || c === false) return; el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); });
    return el;
  }
  function field(label, el) { var id = 'f' + Math.random().toString(36).slice(2, 8); el.id = id; return h('div', null, h('label', { for: id }, label), el); }
  function opts(list, sel, nameOf) { return list.map(function (v) { var o = h('option', { value: v }, nameOf(v)); if (v === sel) o.selected = true; return o; }); }
  function langSelect(sel, onchange) { var s = h('select', { onchange: onchange && function () { onchange(s.value); } }, opts(H.OUT, sel, function (c) { return H.OUT_NAME[c]; })); return s; }
  function pills(n, cur, set) { var w = h('div', { class: 'pills', role: 'group' }); [1, 2, 3, 4, 5].forEach(function (i) { var b = h('button', { type: 'button', 'aria-pressed': String(cur === i), onclick: function () { var on = cur === i ? 0 : i; set(on); Array.prototype.forEach.call(w.children, function (c, j) { c.setAttribute('aria-pressed', String(on === j + 1)); }); cur = on; } }, String(i)); w.appendChild(b); }); return w; }
  function seg(items, cur, set) { var w = h('div', { class: 'seg', role: 'group' }); items.forEach(function (it) { var b = h('button', { type: 'button', 'aria-pressed': String(cur === it[0]), onclick: function () { cur = it[0]; set(cur); Array.prototype.forEach.call(w.children, function (c, j) { c.setAttribute('aria-pressed', String(items[j][0] === cur)); }); } }, it[1]); w.appendChild(b); }); return w; }
  function student(id) { return data.students.filter(function (s) { return s.id === id; })[0]; }

  /* ---------- server ---------- */
  function api(route, body) {
    return fetch('/api/' + route, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + data.license }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; }); })
      .catch(function () { return { ok: false, reason: 'net' }; });
  }
  function reasonText(j) { return ({ invalid: t('errInvalid'), refunded: t('errRefunded'), quota: t('errQuota'), not_configured: t('errNotConfigured'), ai_not_configured: t('errNotConfigured'), net: t('errNet'), unreachable: t('errNet') })[j.reason] || t('errAi'); }
  function refreshStatus() { return api('status').then(function (j) { if (j.ok) { sess = { used: j.used, limit: j.limit }; return true; } if (j.reason === 'invalid' || j.reason === 'refunded') { gateMsg = reasonText(j); data.license = ''; save(); } else gateMsg = reasonText(j); return false; }); }
  function ctx(student) { /* what the server may see */
    var names = { student: student.name, parent: student.parentName, tutor: data.tutorName };
    return { names: names, map: data.hideNames ? H.nameMap(names) : [], prep: function (s) { return data.hideNames ? H.prepare(s, this.map) : H.scrub(s); } };
  }
  function unmaskAll(obj, names) { var o = {}; Object.keys(obj).forEach(function (k) { var v = obj[k]; o[k] = typeof v === 'string' ? H.unmask(v, names) : Array.isArray(v) ? v.map(function (x) { return H.unmask(x, names); }) : v; }); return o; }
  function generate(route, st, body) {
    if (busy) return Promise.resolve(null); busy = true;
    return api(route, Object.assign({ parentLang: st.parentLang, tutorLang: myLang(), tone: st.tone, subjectArea: st.subject, goals: st.goals }, body)).then(function (j) {
      busy = false;
      if (!j.ok) { if (j.reason === 'invalid' || j.reason === 'refunded') { data.license = ''; save(); gateMsg = reasonText(j); } return { error: reasonText(j), gate: !data.license }; }
      sess = { used: j.used, limit: j.limit }; return { out: j.result };
    });
  }

  /* ---------- views ---------- */
  function render() {
    document.documentElement.lang = ui(); document.title = 'Homebrief';
    root.textContent = '';
    if (!data.license) { root.appendChild(gate()); return; }
    var top = h('div', { class: 'top' }, h('div', { class: 'brand' }, h('img', { src: '../icon.svg', alt: '' }), 'Homebrief'), meter());
    root.appendChild(top);
    var body = h('div', { id: 'main', tabindex: '-1' });
    ({ students: vStudents, report: vReport, reply: vReply, summary: vSummary, history: vHistory, settings: vSettings })[tab](body);
    root.appendChild(body);
    var nav = h('nav', { class: 'tabs', 'aria-label': 'Homebrief' }, h('div'));
    [['students', 'tStudents'], ['report', 'tNew'], ['reply', 'tReply'], ['summary', 'tSummary'], ['history', 'tHistory'], ['settings', 'tSettings']].forEach(function (x) {
      nav.firstChild.appendChild(h('button', { 'aria-current': tab === x[0] ? 'page' : null, onclick: function () { tab = x[0]; editing = null; render(); window.scrollTo(0, 0); } }, t(x[1])));
    });
    root.appendChild(nav);
  }
  function meter() {
    if (!sess) return h('div');
    var pct = Math.min(100, Math.round(sess.used / sess.limit * 100));
    return h('div', { class: 'meter', role: 'group', 'aria-label': t('credits') }, t('credits') + ': ' + Math.max(0, sess.limit - sess.used) + ' / ' + sess.limit, h('i', null, h('u', { style: 'width:' + pct + '%' })));
  }

  function gate() {
    var wrap = h('div'), key = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX', value: '' }), msg = h('p', { class: 'err', role: 'alert' }, gateMsg);
    var lang = h('select', { 'aria-label': 'Language', onchange: function () { data.ui = lang.value; save(); render(); } }, opts(I.langs, ui(), function (l) { return I.names[l]; }));
    var go = h('button', { class: 'btn', type: 'button', onclick: function () {
      var v = key.value.trim(); if (!v) return; go.disabled = true; msg.textContent = ''; data.license = v;
      refreshStatus().then(function (ok) { go.disabled = false; if (ok) { gateMsg = ''; save(); render(); } else { data.license = ''; msg.textContent = gateMsg; } });
    } }, t('gateBtn'));
    var buy = SITE.checkoutUrl ? h('a', { class: 'btn ghost', href: SITE.checkoutUrl, rel: 'noopener' }, t('gateBuy') + (SITE.price ? ' · ' + SITE.price : '')) : h('p', { class: 'mute' }, t('gateSoon') + ' ', h('a', { href: 'mailto:' + (SITE.supportEmail || '') }, SITE.supportEmail || ''));
    wrap.appendChild(h('div', { class: 'top' }, h('div', { class: 'brand' }, h('img', { src: '../icon.svg', alt: '' }), 'Homebrief'), lang));
    wrap.appendChild(h('div', { class: 'card' }, h('h2', null, t('gateTitle')), h('p', null, t('gateLead')), field(t('gateKey'), key), msg, h('div', { class: 'row' }, go, SITE.checkoutUrl ? buy : null), SITE.checkoutUrl ? null : buy));
    wrap.appendChild(h('p', { class: 'mute' }, t('privacyNote')));
    return wrap;
  }

  function vStudents(body) {
    if (editing) { body.appendChild(studentForm(editing === 'new' ? null : student(editing))); return; }
    body.appendChild(h('div', { class: 'row' }, h('h2', { style: 'margin:0;flex:1' }, t('tStudents')), h('button', { class: 'btn', onclick: function () { editing = 'new'; render(); } }, '+ ' + t('addStudent'))));
    if (!data.students.length) body.appendChild(h('div', { class: 'card' }, t('noStudents')));
    data.students.forEach(function (s) {
      var reps = data.reports.filter(function (r) { return r.studentId === s.id; }), last = reps.map(function (r) { return r.date; }).sort().pop();
      body.appendChild(h('div', { class: 'card stu' }, h('div', null, h('b', null, s.name), h('div', { class: 'mute' }, [s.subject, H.OUT_NAME[s.parentLang], reps.length + ' ' + t('reportsN'), last ? t('lastOn') + ' ' + last : ''].filter(Boolean).join(' · '))),
        h('div', { class: 'row', style: 'margin:0' }, h('button', { class: 'btn sm', onclick: function () { draft.report.sid = s.id; tab = 'report'; render(); } }, t('tNew')), h('button', { class: 'btn sm ghost', onclick: function () { editing = s.id; render(); } }, t('editStudent')))));
    });
  }
  function studentForm(s) {
    var f = s ? Object.assign({}, s) : { id: H.uid(), name: '', subject: '', parentName: '', parentLang: 'en', tone: 'warm', goals: '' };
    var name = h('input', { value: f.name, maxlength: 80, autocomplete: 'off' }), subj = h('input', { value: f.subject, maxlength: 80 }), par = h('input', { value: f.parentName, maxlength: 80, autocomplete: 'off' }), goals = h('textarea', { maxlength: 400 }, f.goals);
    var pl = langSelect(f.parentLang), tone = seg([['warm', t('toneWarm')], ['concise', t('toneConcise')], ['formal', t('toneFormal')]], f.tone, function (v) { f.tone = v; });
    var err = h('p', { class: 'err', role: 'alert' });
    var card = h('div', { class: 'card' }, h('h2', null, s ? t('editStudent') : t('addStudent')), field(t('sName'), name), h('div', { class: 'grid2' }, field(t('sSubject'), subj), field(t('sParent'), par)), field(t('sParentLang'), pl), h('label', null, t('sTone')), tone, field(t('sGoals'), goals), err,
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: function () {
        if (!name.value.trim()) { err.textContent = t('sName'); name.focus(); return; }
        Object.assign(f, { name: name.value.trim(), subject: subj.value.trim(), parentName: par.value.trim(), parentLang: pl.value, goals: goals.value.trim() });
        if (s) data.students[data.students.indexOf(s)] = f; else data.students.push(f);
        save(); editing = null; render();
      } }, t('save')), h('button', { class: 'btn ghost', onclick: function () { editing = null; render(); } }, t('cancel')),
        s ? h('button', { class: 'btn danger', onclick: function () { if (confirm(t('confirmDel'))) { data.students = data.students.filter(function (x) { return x.id !== s.id; }); data.reports = data.reports.filter(function (r) { return r.studentId !== s.id; }); save(); editing = null; render(); } } }, t('del')) : null));
    return card;
  }

  function studentPicker(d, onpick) {
    var sel = h('select', { onchange: function () { d.sid = sel.value; if (onpick) onpick(); } }, opts(data.students.map(function (s) { return s.id; }), d.sid || (data.students[0] && data.students[0].id), function (id) { return student(id).name; }));
    if (!d.sid && data.students[0]) d.sid = data.students[0].id; return field(t('pickStudent'), sel);
  }
  function needStudent(body) { if (data.students.length) return false; body.appendChild(h('div', { class: 'card' }, t('needStudent'), h('div', { class: 'row' }, h('button', { class: 'btn', onclick: function () { tab = 'students'; editing = 'new'; render(); } }, '+ ' + t('addStudent'))))); return true; }

  /* result card shared by report / reply / summary */
  function resultCard(kind, res, st, onSave, onRegen) {
    var cost = kind === 'summary' ? t('credit2') : t('credit1');
    var box = h('div', { class: 'card out' }), names = ctx(st).names, cur = 'parent';
    var views = kind === 'reply' ? [['parent', t('vParent'), res.reply], ['mine', t('theirMsgMine'), res.parent_message_translation], ['copy', t('vMine'), res.tutor_copy]] :
      kind === 'summary' ? [['parent', t('vParent'), res.parent_message], ['mine', t('vMine'), res.tutor_copy]] :
      [['parent', t('vParent'), res.parent_message], ['short', t('vShort'), res.short_message], ['mine', t('vMine'), res.tutor_copy]];
    var ta = h('textarea', { 'aria-label': t('vParent') }), subject = res.subject ? h('input', { value: res.subject, 'aria-label': t('subject') }) : null;
    var texts = {}; views.forEach(function (v) { texts[v[0]] = v[2] || ''; }); ta.value = texts.parent;
    var tabs = h('div', { class: 'tabsm' }); views.forEach(function (v) { var b = h('button', { type: 'button', class: 'btn sm ' + (v[0] === cur ? '' : 'ghost'), onclick: function () { texts[cur] = ta.value; cur = v[0]; ta.value = texts[cur]; ta.setAttribute('aria-label', v[1]); Array.prototype.forEach.call(tabs.children, function (c) { c.className = 'btn sm ghost'; }); b.className = 'btn sm'; } }, v[1]); tabs.appendChild(b); });
    box.appendChild(tabs); if (subject) box.appendChild(field(t('subject'), subject)); box.appendChild(ta);
    if (res.flags && res.flags.length) box.appendChild(h('div', { class: 'flag' }, h('b', null, t('flags')), h('ul', null, res.flags.map(function (f) { return h('li', null, f); }))));
    if (kind === 'summary' && (res.highlights.length || res.next_focus.length)) box.appendChild(h('div', { class: 'mute' }, res.highlights.length ? h('p', null, h('b', null, t('highlights') + ': '), res.highlights.join(' · ')) : null, res.next_focus.length ? h('p', null, h('b', null, t('nextFocus') + ': '), res.next_focus.join(' · ')) : null));
    function curText() { texts[cur] = ta.value; return ta.value; }
    var pb = h('div', { id: 'printbox', 'aria-hidden': 'true', style: 'display:none' });
    box.appendChild(h('p', { class: 'mute' }, t('reviewNote')));
    box.appendChild(h('div', { class: 'row' },
      h('button', { class: 'btn sm', onclick: function () { copy(curText()); } }, t('copy')),
      navigator.share ? h('button', { class: 'btn sm ghost', onclick: function () { navigator.share({ text: curText() }).catch(function () {}); } }, t('share')) : null,
      h('button', { class: 'btn sm ghost', onclick: function () { download((subject ? subject.value + '\n\n' : '') + curText(), H.safeName(st.name + '-' + H.today())); } }, t('download')),
      h('button', { class: 'btn sm ghost', onclick: function () { pb.textContent = (subject ? subject.value + '\n\n' : '') + curText(); pb.style.display = 'block'; window.print(); pb.style.display = 'none'; } }, t('print')),
      h('button', { class: 'btn sm', onclick: function () { texts[cur] = ta.value; onSave({ subject: subject ? subject.value : '', text: texts.parent, short: texts.short || '', mine: texts.copy || texts.mine || '' }); toast(t('saved')); } }, t('saveHist'))));
    var again = h('input', { placeholder: t('regenPh'), maxlength: 300, 'aria-label': t('regen') });
    box.appendChild(h('div', { class: 'row' }, h('div', { style: 'flex:1;min-width:200px' }, again), h('button', { class: 'btn sm ghost', onclick: function () { onRegen(again.value); } }, t('regen') + ' · ' + cost)));
    box.appendChild(pb);
    return box;
  }
  function copy(text) { (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast(t('copied')); }, function () { var a = h('textarea', { style: 'position:fixed;left:-999px' }); a.value = text; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); toast(t('copied')); } catch (e) {} a.remove(); }); }
  function download(text, name) { var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })), download: name + '.txt' }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); }
  function fail(slot, res) { var e = h('p', { class: 'err', role: 'alert' }, res.error); slot.textContent = ''; slot.appendChild(e); if (res.gate) render(); }

  function vReport(body) {
    if (needStudent(body)) return;
    var d = draft.report, slot = h('div'); d.date = d.date || H.today(); d.length = d.length || 'standard';
    var st = function () { return student(d.sid) || data.students[0]; };
    var topics = h('input', { value: d.topics || '', maxlength: 400, oninput: function () { d.topics = topics.value; } }), notes = h('textarea', { maxlength: 4000, placeholder: t('notesPh'), oninput: function () { d.notes = notes.value; } }), hw = h('input', { value: d.homework || '', maxlength: 800, oninput: function () { d.homework = hw.value; } }), nx = h('input', { value: d.next || '', maxlength: 800, oninput: function () { d.next = nx.value; } }), dt = h('input', { type: 'date', value: d.date, onchange: function () { d.date = dt.value; } });
    notes.value = d.notes || '';
    var tone = h('div'); function drawTone() { tone.textContent = ''; d.tone = d.tone || st().tone; tone.appendChild(seg([['warm', t('toneWarm')], ['concise', t('toneConcise')], ['formal', t('toneFormal')]], d.tone, function (v) { d.tone = v; })); }
    d.tone = null; drawTone();
    var extra = h('input', { placeholder: t('extraPh'), maxlength: 300, value: d.extra || '', oninput: function () { d.extra = extra.value; } });
    var go = h('button', { class: 'btn', onclick: function () { run(''); } }, t('generate') + ' · ' + t('credit1'));
    function run(change) {
      if ((d.notes || '').trim().length < 3) { toast(t('needNotes')); notes.focus(); return; }
      var s = st(), c = ctx(s); go.disabled = true; go.textContent = t('generating'); slot.textContent = '';
      generate('report', s, { date: d.date, topics: c.prep(d.topics || ''), notes: c.prep(d.notes), homework: c.prep(d.homework || ''), next: c.prep(d.next || ''), effort: d.effort || 0, understanding: d.understanding || 0, length: d.length, tone: d.tone || s.tone, extra: c.prep([d.extra, change].filter(Boolean).join('. ')) }).then(function (r) {
        go.disabled = false; go.textContent = t('generate') + ' · ' + t('credit1'); if (!r) return; refreshMeter();
        if (r.error) return fail(slot, r);
        var res = unmaskAll(r.out, c.names); result.report = res;
        slot.appendChild(resultCard('report', res, s, function (v) { data.reports.unshift({ id: H.uid(), studentId: s.id, kind: 'report', date: d.date, topics: d.topics || '', notes: d.notes || '', homework: d.homework || '', next: d.next || '', effort: d.effort || 0, understanding: d.understanding || 0, subject: v.subject, text: v.text, short: v.short, mine: v.mine, at: new Date().toISOString() }); save(); }, run));
        slot.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
    body.appendChild(h('h2', null, t('tNew')));
    body.appendChild(h('div', { class: 'card' }, studentPicker(d, function () { d.tone = null; drawTone(); }), h('div', { class: 'grid2' }, field(t('date'), dt), field(t('topics'), topics)),
      h('div', { class: 'grid2' }, h('div', null, h('label', null, t('effort')), pills(5, d.effort || 0, function (v) { d.effort = v; })), h('div', null, h('label', null, t('understanding')), pills(5, d.understanding || 0, function (v) { d.understanding = v; }))),
      field(t('notes'), notes), h('div', { class: 'grid2' }, field(t('homework'), hw), field(t('next'), nx)),
      h('label', null, t('length')), seg([['short', t('lenShort')], ['standard', t('lenStd')], ['detailed', t('lenLong')]], d.length, function (v) { d.length = v; }), h('label', null, t('tone')), tone, field(t('extra'), extra),
      h('p', { class: 'mute' }, data.hideNames ? t('hiddenNote') : ''), h('div', { class: 'row' }, go)));
    body.appendChild(slot);
  }
  function refreshMeter() { var top = document.querySelector('.top'); if (top && top.lastChild) top.lastChild.replaceWith(meter()); }

  function vReply(body) {
    if (needStudent(body)) return;
    var d = draft.reply, slot = h('div'), s = function () { return student(d.sid) || data.students[0]; };
    var msg = h('textarea', { maxlength: 3000, oninput: function () { d.message = msg.value; } }), intent = h('textarea', { maxlength: 600, placeholder: t('intentPh'), oninput: function () { d.intent = intent.value; }, style: 'min-height:80px' });
    msg.value = d.message || ''; intent.value = d.intent || '';
    var go = h('button', { class: 'btn', onclick: function () { run(''); } }, t('genReply') + ' · ' + t('credit1'));
    function run(change) {
      if ((d.message || '').trim().length < 2) { toast(t('needMsg')); msg.focus(); return; }
      var st = s(), c = ctx(st); go.disabled = true; go.textContent = t('generating'); slot.textContent = '';
      generate('reply', st, { message: c.prep(d.message), intent: c.prep(d.intent || ''), extra: c.prep(change || ''), length: 'short' }).then(function (r) {
        go.disabled = false; go.textContent = t('genReply') + ' · ' + t('credit1'); if (!r) return; refreshMeter();
        if (r.error) return fail(slot, r);
        var res = unmaskAll(r.out, c.names);
        slot.appendChild(resultCard('reply', res, st, function (v) { data.reports.unshift({ id: H.uid(), studentId: st.id, kind: 'reply', date: H.today(), notes: d.message || '', text: v.text, mine: v.mine, subject: '', at: new Date().toISOString() }); save(); }, run));
      });
    }
    body.appendChild(h('h2', null, t('tReply')));
    body.appendChild(h('div', { class: 'card' }, studentPicker(d), field(t('parentSaid'), msg), field(t('intent'), intent), h('p', { class: 'mute' }, data.hideNames ? t('hiddenNote') : ''), h('div', { class: 'row' }, go)));
    body.appendChild(slot);
  }

  function vSummary(body) {
    if (needStudent(body)) return;
    var d = draft.sum, slot = h('div'); d.n = d.n || 8;
    body.appendChild(h('h2', null, t('tSummary')));
    var go = h('button', { class: 'btn', onclick: function () { run(''); } }, t('genSummary') + ' · ' + t('credit2'));
    var st = function () { return student(d.sid) || data.students[0]; };
    function run(change) {
      var s = st(), recs = H.pickForSummary(data.reports, s.id, d.n); if (!recs.length) { slot.textContent = ''; slot.appendChild(h('p', { class: 'err' }, t('needLessons'))); return; }
      var c = ctx(s); go.disabled = true; go.textContent = t('generating'); slot.textContent = '';
      generate('summary', s, { reports: H.payloadReports(recs, c.map), period: recs[0].date + ' – ' + recs[recs.length - 1].date, length: 'standard', extra: c.prep(change || '') }).then(function (r) {
        go.disabled = false; go.textContent = t('genSummary') + ' · ' + t('credit2'); if (!r) return; refreshMeter();
        if (r.error) return fail(slot, r);
        var res = unmaskAll(r.out, c.names);
        slot.appendChild(resultCard('summary', res, s, function (v) { data.reports.unshift({ id: H.uid(), studentId: s.id, kind: 'summary', date: H.today(), notes: '', subject: v.subject, text: v.text, mine: v.mine, at: new Date().toISOString() }); save(); }, run));
      });
    }
    body.appendChild(h('div', { class: 'card' }, studentPicker(d), h('label', null, t('period')), seg([[4, t('last4')], [8, t('last8')], [12, t('last12')]], d.n, function (v) { d.n = v; }), h('p', { class: 'mute' }, data.hideNames ? t('hiddenNote') : ''), h('div', { class: 'row' }, go)));
    body.appendChild(slot);
  }

  function vHistory(body) {
    var f = draft.hist || ''; body.appendChild(h('h2', null, t('tHistory')));
    var sel = h('select', { 'aria-label': t('pickStudent'), onchange: function () { draft.hist = sel.value; render(); } }, h('option', { value: '' }, t('all')), opts(data.students.map(function (s) { return s.id; }), f, function (id) { return student(id).name; }));
    body.appendChild(sel);
    var list = data.reports.filter(function (r) { return !f || r.studentId === f; });
    if (!list.length) body.appendChild(h('div', { class: 'card' }, t('empty')));
    var card = h('div', { class: 'card' });
    list.slice(0, 200).forEach(function (r) {
      var s = student(r.studentId), kind = { report: 'kReport', reply: 'kReply', summary: 'kSummary' }[r.kind];
      card.appendChild(h('div', { class: 'hist' }, h('b', null, (s ? s.name : '') + ' · ' + t(kind) + ' · ' + r.date), r.subject ? h('div', { class: 'mute' }, r.subject) : null, h('pre', null, r.text),
        h('div', { class: 'row', style: 'margin-top:4px' }, h('button', { class: 'btn sm', onclick: function () { copy(r.text); } }, t('copy')), h('button', { class: 'btn sm ghost', onclick: function () { download((r.subject ? r.subject + '\n\n' : '') + r.text, H.safeName((s ? s.name : 'x') + '-' + r.date)); } }, t('download')), h('button', { class: 'btn sm danger', onclick: function () { if (confirm(t('confirmDel'))) { data.reports = data.reports.filter(function (x) { return x.id !== r.id; }); save(); render(); } } }, t('del')))));
    });
    if (list.length) body.appendChild(card);
  }

  function vSettings(body) {
    body.appendChild(h('h2', null, t('tSettings')));
    var ul = h('select', { onchange: function () { data.ui = ul.value; save(); render(); } }, opts(I.langs, ui(), function (l) { return I.names[l]; }));
    var ml = langSelect(myLang(), function (v) { data.tutorLang = v; save(); }), nm = h('input', { value: data.tutorName, maxlength: 60, autocomplete: 'name', onchange: function () { data.tutorName = nm.value.trim(); save(); } });
    var hide = h('input', { type: 'checkbox', checked: data.hideNames, style: 'width:22px;min-height:22px;margin-right:8px', onchange: function () { data.hideNames = hide.checked; save(); } });
    var file = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: function () {
      var f = file.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () { try { var j = JSON.parse(r.result); if (!j || j.v !== 1 || !Array.isArray(j.students)) throw 0; var lic = data.license; data = H.sanitize(j); data.license = lic; save(); toast(t('restoreOk')); render(); } catch (e) { toast(t('restoreBad')); } };
      r.readAsText(f);
    } });
    body.appendChild(h('div', { class: 'card' }, field(t('sLang'), ul), field(t('sMyLang'), ml), field(t('sMyName'), nm), h('label', { style: 'display:flex;align-items:center;margin-top:16px' }, hide, t('sHide')), h('p', { class: 'mute' }, t('hiddenNote'))));
    body.appendChild(h('div', { class: 'card' }, h('div', { class: 'row', style: 'margin:0' },
      h('button', { class: 'btn sm', onclick: function () { var c = Object.assign({}, data, { license: '' }); download(JSON.stringify(c), 'homebrief-backup-' + H.today()); } }, t('backup')),
      h('button', { class: 'btn sm ghost', onclick: function () { file.click(); } }, t('restore')), file),
      h('p', { class: 'mute' }, t('privacyNote'))));
    body.appendChild(h('div', { class: 'card' }, h('div', { class: 'row', style: 'margin:0' },
      h('button', { class: 'btn sm ghost', onclick: function () { data.license = ''; sess = null; save(); render(); } }, t('signOut')),
      h('button', { class: 'btn sm danger', onclick: function () { if (confirm(t('wipeAsk'))) { try { localStorage.removeItem(KEY); } catch (e) {} data = H.sanitize(null); sess = null; render(); } } }, t('wipe')))));
    body.appendChild(h('p', { class: 'mute' }, h('a', { href: '../privacy' }, t('priv')), ' · ', h('a', { href: '../terms' }, t('terms'))));
  }

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
  render();
  if (data.license) refreshStatus().then(function (ok) { if (ok || !data.license) render(); });
})();
