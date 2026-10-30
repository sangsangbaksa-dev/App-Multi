(function () {
  'use strict';
  var C = window.SB, I = window.I18N, CFG = window.SB_CONFIG;
  var KEY = 'stampbook.v1', root = document.getElementById('root');
  var state = load(), lang = I.pick(state.lang), query = '', filter = 'all', storageOk = true;

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.packs)) return s; } catch (e) {}
    return { v: 1, packs: [], teacher: '', pro: false, lang: '' };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; } catch (e) { storageOk = false; } }
  function T(k, v) { return I.t(lang, k, v); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === 'class') e.className = attrs[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    (function flat(a) { return Array.isArray(a) ? a.reduce(function (x, y) { return x.concat(flat(y)); }, []) : [a]; })(kids == null ? [] : kids).forEach(function (c) { if (c == null) return; e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function toast(msg, actionLabel, action) {
    [].forEach.call(document.querySelectorAll('.toast'), function (x) { x.remove(); });
    var kids = [msg];
    if (action) kids.push(h('button', { class: 'tbtn', onclick: function () { t.remove(); action(); } }, actionLabel));
    var t = h('div', { class: 'toast', role: 'status' }, kids); document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, action ? 6000 : 2200);
  }
  function money(n, cur) {
    try { return new Intl.NumberFormat(lang, { style: 'currency', currency: cur || 'USD', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n); }
    catch (e) { return n + ' ' + (cur || ''); }
  }
  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function copy(text, okMsg) {
    var done = function () { toast(okMsg || T('copied')); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    else fallback();
    function fallback() {
      var ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { prompt('', text); } ta.remove();
    }
  }
  function activeCount() { return state.packs.filter(function (p) { var s = C.status(p); return s === 'active' || s === 'low'; }).length; }
  function needPro() { showUpgrade(); }

  /* ---------- read-only balance card (opened from a shared link) ---------- */
  function renderCard(card) {
    document.title = card.student + ' · ' + T('app');
    var left = Math.max(0, card.total - card.dates.length), grid = h('div', { class: 'grid' });
    for (var i = 0; i < card.total; i++) {
      var d = card.dates[i];
      grid.appendChild(h('div', { class: 'slot' + (d ? ' on' : ''), style: d ? '--r:' + (((i * 37) % 13) - 6) + 'deg' : false, title: d || '' }, d ? d.slice(5).replace('-', '/') : ''));
    }
    var exp = card.expires ? (card.expires < C.todayStr() ? T('expOn', { date: card.expires }) : T('expIn', { d: C.daysBetween(C.todayStr(), card.expires) })) : '';
    root.appendChild(h('div', { class: 'bal card' }, [
      h('div', { class: 'note' }, T('cardH') + (card.teacher ? ' · ' + T('cardFrom', { t: card.teacher }) : '')),
      h('h2', { style: 'font:700 22px var(--serif);margin:6px 0' }, card.student),
      h('div', { class: 'big' }, String(left)),
      h('div', {}, T('cardLeft', { n: left, total: card.total })), h('div', { class: 'meta' }, exp), grid,
      h('p', { class: 'note' }, T('cardNote'))
    ]));
  }

  /* ---------- main ---------- */
  function render() {
    root.textContent = '';
    document.documentElement.lang = lang; document.title = T('app');
    var m = location.hash.match(/^#c=([\w-]+)$/);
    if (m) { var card = C.decodeCard(m[1]); if (card) return renderCard(card); }

    var sel = h('select', { 'aria-label': T('lang'), onchange: function (e) { lang = e.target.value; state.lang = lang; save(); render(); } },
      I.langs.map(function (l) { return h('option', { value: l, selected: l === lang ? 'selected' : false }, I.L[l].name); }));
    root.appendChild(h('header', {}, [
      h('h1', {}, [T('app'), h('small', {}, T('tag'))]),
      state.pro ? h('span', { class: 'chip c-active' }, T('pro')) : h('button', { class: 'ghost', onclick: function () { document.getElementById('lic').scrollIntoView({ behavior: 'smooth' }); } }, T('upgrade')),
      sel
    ]));

    var today = C.todayStr(), ym = today.slice(0, 7), ms = C.monthStats(state.packs, ym);
    var curs = state.packs.map(function (p) { return p.currency || 'USD'; }).filter(function (c, i, a) { return a.indexOf(c) === i; });
    if (!curs.length) curs = ['USD'];
    function perCur(fn) { return curs.map(function (c) { return money(fn(state.packs.filter(function (p) { return (p.currency || 'USD') === c; })), c); }).join(' + '); }
    root.appendChild(h('div', { class: 'sum' }, [
      h('div', {}, [h('b', {}, String(ms.lessons)), h('span', {}, T('thisMonth') + ' · ' + T('given'))]),
      h('div', {}, [h('b', {}, perCur(function (ps) { return C.monthStats(ps, ym).earned; })), h('span', {}, T('earned'))]),
      h('div', {}, [h('b', {}, perCur(function (ps) { return C.totalUnearned(ps, today); })), h('span', {}, T('owed'))])
    ]));
    if (!storageOk) root.appendChild(h('div', { class: 'warnbar', role: 'alert' }, T('storageErr')));
    var att = C.attention(state.packs, today);
    root.appendChild(h('div', { class: 'row', style: 'margin-bottom:16px' }, [h('button', { class: 'pri', onclick: openNew }, '+ ' + T('newPack')),
      att.length ? h('span', { class: 'chip c-low' }, T('attn', { n: att.length })) : null]));
    if (state.packs.length >= 4) {
      var q = h('input', { type: 'search', 'aria-label': T('search'), placeholder: T('search'), value: query, oninput: function (e) { query = e.target.value; renderList(); } });
      root.appendChild(h('div', { class: 'row', style: 'margin-bottom:12px' }, [h('div', { style: 'flex:1;min-width:160px' }, q),
        ['all', 'attn'].map(function (f) { return h('button', { class: 'ghost' + (filter === f ? ' on' : ''), 'aria-pressed': String(filter === f), onclick: function () { filter = f; render(); } }, T(f === 'all' ? 'filterAll' : 'filterAttn')); })]));
    }
    listBox = h('div', { id: 'list' }); root.appendChild(listBox);

    if (!state.packs.length) {
      root.appendChild(h('div', { class: 'empty' }, [h('h2', {}, T('emptyH')), h('p', {}, T('emptyB')), h('button', { class: 'pri', onclick: openNew }, '+ ' + T('newPack'))]));
    }
    renderList();

    var lap = C.lapsed(state.packs, today);
    if (lap.length) root.appendChild(h('div', { class: 'lapsed' }, [h('h3', {}, T('lapsedH')), h('div', { class: 'note' }, T('lapsedB'))]));

    root.appendChild(settings());
    root.appendChild(h('p', { class: 'note' }, T('privacy')));
    root.appendChild(newDialog());
    root.appendChild(upgradeDialog());
  }
  var listBox;
  function renderList() {
    if (!listBox) return;
    var today = C.todayStr(), order = { low: 0, active: 1, expired: 2, done: 3 };
    listBox.textContent = '';
    var shown = state.packs.filter(function (p) { return C.matches(p, query) && (filter === 'all' || C.attention([p], today).length); })
      .sort(function (a, b) { return order[C.status(a, today)] - order[C.status(b, today)]; });
    shown.forEach(function (p) { listBox.appendChild(packCard(p, today)); });
    if (state.packs.length && !shown.length) listBox.appendChild(h('p', { class: 'note', role: 'status' }, T('noMatch')));
  }
  function upgradeDialog() {
    return h('dialog', { id: 'up', 'aria-labelledby': 'up-h' }, [
      h('h2', { id: 'up-h', style: 'font:700 22px var(--serif);margin:0 0 6px' }, T('upH')),
      h('p', {}, T('upB', { max: CFG.freeLimit })),
      h('ul', {}, [T('upL1'), T('upL2'), T('upL3')].map(function (x) { return h('li', {}, x); })),
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:16px' }, [
        h('button', { class: 'ghost', onclick: function () { document.getElementById('up').close(); } }, T('cancel')),
        h('button', { class: 'ghost', onclick: function () { document.getElementById('up').close(); document.getElementById('lic').scrollIntoView({ behavior: 'smooth' }); document.getElementById('lic').focus(); } }, T('haveKey')),
        h('a', { class: 'btnlink', href: CFG.checkoutUrl, target: '_blank', rel: 'noopener' }, T('upBuy'))])]);
  }
  function showUpgrade() { var d = document.getElementById('up'); if (d && d.showModal) d.showModal(); else toast(T('limit', { max: CFG.freeLimit })); }

  function packCard(p, today) {
    var st = C.status(p, today), rem = C.remaining(p), grid = h('div', { class: 'grid', role: 'group', 'aria-label': p.student });
    var cs = C.counted(p);
    for (var i = 0; i < p.total; i++) {
      (function (i) {
        var s = cs[i], isNext = !s && i === cs.length && st !== 'expired';
        grid.appendChild(h('button', {
          class: 'slot' + (s ? ' on' : '') + (isNext ? ' next' : ''), type: 'button',
          style: s ? '--r:' + (((i * 37) % 13) - 6) + 'deg' : false, title: s ? s.date : '',
          'aria-label': (i + 1) + '/' + p.total + (s ? ' · ' + s.date + (s.kind === 'noshow' ? ' · ' + T('kNoshow') : '') : ''),
          onclick: function () {
            if (s) { if (confirm(T('confStamp') + ' ' + s.date)) { C.removeStamp(p, s.id); save(); render(); } }
            else if (isNext) stamp(p, today);
          }
        }, s ? (s.kind === 'noshow' ? '✕' : s.date.slice(5).replace('-', '/')) : String(i + 1)));
      })(i);
    }
    var dl = C.daysLeft(p, today), soon = st === 'active' && dl !== null && dl <= 7;
    var exp = !p.expires ? T('noExp') : dl < 0 ? T('expOn', { date: p.expires }) : dl === 0 ? T('expToday') : T('expIn', { d: dl });
    var dateIn = h('input', { type: 'date', value: today, 'aria-label': T('stampOther') });
    var canStamp = rem > 0 && st !== 'expired';
    var rowEls = canStamp ? [h('button', { class: 'stampbtn', onclick: function () { stamp(p, today); } }, T('stampToday')), dateIn,
      h('button', { class: 'ghost', onclick: function () { if (dateIn.value) stamp(p, dateIn.value); } }, T('stampOther'))] : [];
    var more = [];
    if (canStamp) more.push(h('button', { class: 'ghost', title: T('noshowTip'), onclick: function () { stamp(p, dateIn.value || today, 'noshow'); } }, T('kNoshow')),
      h('button', { class: 'ghost', title: T('excusedTip'), onclick: function () { stamp(p, dateIn.value || today, 'excused'); } }, T('kExcused')));
    var foot = [];
    if (st === 'low' || st === 'expired' || st === 'done') foot.push(h('button', { class: 'pri', onclick: function () { renewPack(p); } }, T('renewPack')));
    if (p.expires && st !== 'done') foot.push(h('button', { class: 'ghost', onclick: function () { var d = C.extend(p, 1, today); save(); render(); toast(T('extended', { date: d })); } }, T('extend')));
    foot.push(h('button', { class: 'ghost', onclick: function () { shareLink(p); } }, T('share') + (state.pro ? '' : ' · ' + T('pro'))),
      h('button', { class: 'ghost', onclick: function () { renewNote(p); } }, T('renew')),
      h('button', { class: 'ghost', onclick: function () { if (confirm(T('confDel'))) { state.packs = state.packs.filter(function (x) { return x.id !== p.id; }); save(); render(); } } }, T('del')));
    var log = h('details', { class: 'log' }, [h('summary', {}, T('hist') + ' (' + p.stamps.length + ')'),
      p.stamps.length ? h('ul', {}, p.stamps.slice().reverse().map(function (s) {
        return h('li', {}, [h('span', { class: 'ld' }, s.date), s.kind ? h('span', { class: 'tag t-' + s.kind }, T(s.kind === 'noshow' ? 'kNoshow' : 'kExcused')) : null,
          h('span', { class: 'ln' }, s.note || ''),
          h('button', { class: 'ghost sm', 'aria-label': T('editNote') + ' ' + s.date, onclick: function () { var v = prompt(T('notePh'), s.note || ''); if (v !== null) { C.setNote(p, s.id, v); save(); render(); } } }, T('editNote'))]);
      })) : h('p', { class: 'note' }, T('histEmpty'))]);
    return h('section', { class: 'card ' + st, 'aria-label': p.student }, [
      h('div', { class: 'top' }, [h('h2', {}, p.student), h('span', { class: 'chip c-' + st }, T('s_' + st))]),
      h('div', { class: 'meta' }, [T('left', { n: rem }), h('span', { class: soon ? 'soon' : '' }, exp + (soon ? ' · ' + T('soon') : '')), money(p.price, p.currency)].reduce(function (a, x, i) { if (i) a.push(' · '); a.push(x); return a; }, [])),
      grid, h('div', { class: 'row' }, rowEls), more.length ? h('div', { class: 'row', style: 'margin-top:8px' }, more) : null, log,
      h('div', { class: 'foot' }, foot)
    ]);
  }
  function renewPack(p) {
    if (!state.pro && activeCount() >= CFG.freeLimit && C.status(p) === 'active') return showUpgrade();
    if (!state.pro && activeCount() >= CFG.freeLimit && C.status(p) === 'low') return showUpgrade();
    var n = C.renew(p, C.todayStr()); state.packs.unshift(n); save(); render(); toast(T('renewed', { name: p.student }));
  }
  function stamp(p, date, kind) {
    if (!C.addStamp(p, date, '', kind)) return;
    var id = p.stamps.filter(function (x) { return x.date === date; }).pop().id;
    save(); render();
    toast(T('stamped', { date: date }), T('undo'), function () { C.removeStamp(p, id); save(); render(); });
  }
  function shareLink(p) {
    if (!state.pro) return needPro();
    var url = location.origin + location.pathname + '#c=' + C.encodeCard(p, state.teacher);
    copy(url, T('linkCopied'));
  }
  function renewNote(p) {
    var exp = p.expires ? T('renewExp', { date: p.expires }) : '';
    copy(T('renewMsg', { name: p.student, n: C.remaining(p), exp: exp }));
  }

  /* ---------- new pack dialog ---------- */
  function newDialog() {
    var f = {
      name: h('input', { id: 'f-name', required: 'required', maxlength: 80, autocomplete: 'off' }),
      total: h('input', { id: 'f-total', type: 'number', min: 1, max: 200, value: 10, inputmode: 'numeric', required: 'required' }),
      price: h('input', { id: 'f-price', type: 'number', min: 0, step: 'any', inputmode: 'decimal', required: 'required' }),
      cur: h('input', { id: 'f-cur', maxlength: 3, value: (state.packs[0] && state.packs[0].currency) || guessCur() }),
      start: h('input', { id: 'f-start', type: 'date', value: C.todayStr(), required: 'required' }),
      valid: h('input', { id: 'f-valid', type: 'number', min: 0, max: 60, value: 3, inputmode: 'numeric' })
    };
    function lab(id, key, el) { return [h('label', { for: id }, T(key)), el]; }
    var form = h('form', { method: 'dialog', onsubmit: function (e) {
      e.preventDefault();
      if (!state.pro && activeCount() >= CFG.freeLimit) { document.getElementById('dlg').close(); showUpgrade(); return; }
      var total = Math.round(+f.total.value), price = +f.price.value, months = Math.round(+f.valid.value) || 0;
      if (!f.name.value.trim() || !(total >= 1) || !(price >= 0) || !f.start.value) return;
      state.packs.unshift({ id: uid(), student: f.name.value.trim(), total: total, price: price, currency: (f.cur.value || 'USD').toUpperCase().slice(0, 3),
        start: f.start.value, months: months, expires: months > 0 ? C.addMonths(f.start.value, months) : '', stamps: [], paid: true });
      save(); render();
    } }, [].concat(lab('f-name', 'student', f.name),
      [h('div', { class: 'two' }, [h('div', {}, lab('f-total', 'lessons', f.total)), h('div', {}, lab('f-price', 'price', f.price))])],
      [h('div', { class: 'two' }, [h('div', {}, lab('f-cur', 'currency', f.cur)), h('div', {}, lab('f-start', 'start', f.start))])],
      lab('f-valid', 'valid', f.valid),
      [h('div', { class: 'row', style: 'margin-top:18px;justify-content:flex-end' }, [
        h('button', { type: 'button', class: 'ghost', onclick: function () { document.getElementById('dlg').close(); } }, T('cancel')),
        h('button', { type: 'submit', class: 'pri' }, T('save'))])]));
    return h('dialog', { id: 'dlg' }, form);
  }
  function guessCur() {
    var l = (navigator.language || 'en').toLowerCase();
    return l.indexOf('ko') === 0 ? 'KRW' : l.indexOf('ja') === 0 ? 'JPY' : l.indexOf('zh') === 0 ? 'CNY' : l.indexOf('es') === 0 ? 'EUR' : 'USD';
  }
  function openNew() {
    if (!state.pro && activeCount() >= CFG.freeLimit) { showUpgrade(); return; }
    var d = document.getElementById('dlg'); if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    setTimeout(function () { document.getElementById('f-name').focus(); }, 30);
  }

  /* ---------- settings: teacher name, backup, csv, licence ---------- */
  function download(name, text, type) {
    var a = h('a', { href: URL.createObjectURL(new Blob([text], { type: type })), download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function settings() {
    var teacher = h('input', { id: 's-t', value: state.teacher || '', maxlength: 80, onchange: function (e) { state.teacher = e.target.value.trim(); save(); } });
    var file = h('input', { type: 'file', accept: 'application/json', style: 'display:none', onchange: function (e) {
      var fl = e.target.files[0]; if (!fl) return; var r = new FileReader();
      r.onload = function () {
        try {
          var o = JSON.parse(r.result); if (!o || !Array.isArray(o.packs)) throw 0;
          o.packs = o.packs.filter(function (p) { return p && typeof p.student === 'string' && p.total > 0 && Array.isArray(p.stamps); });
          o.pro = state.pro || (o.pro === true && C.validKey(o.key)); state = Object.assign({ teacher: '', lang: '' }, o); save(); render(); toast(T('restored'));
        } catch (x) { toast(T('badFile')); }
      }; r.readAsText(fl);
    } });
    var key = h('input', { id: 'lic', placeholder: T('licPh'), autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false' });
    return h('div', { class: 'settings' }, [
      h('label', { for: 's-t' }, T('teacher')), teacher,
      h('div', { class: 'row', style: 'margin:14px 0' }, [
        h('button', { class: 'ghost', onclick: function () { download('stampbook-' + C.todayStr() + '.json', JSON.stringify(state), 'application/json'); toast(T('backupDone')); } }, T('exp')),
        h('button', { class: 'ghost', onclick: function () { file.click(); } }, T('imp')), file,
        h('button', { class: 'ghost', onclick: function () { if (!state.pro) return needPro(); download('stampbook.csv', C.toCsv(state.packs), 'text/csv'); } }, T('csv'))
      ]),
      state.pro ? null : h('div', {}, [
        h('label', { for: 'lic' }, T('lic')),
        h('div', { class: 'row' }, [key,
          h('button', { class: 'pri', onclick: function () { if (C.validKey(key.value)) { state.pro = true; state.key = key.value.trim().toUpperCase(); save(); render(); toast(T('okKey')); } else toast(T('badKey')); } }, T('activate'))]),
        h('p', {}, [h('a', { href: CFG.checkoutUrl, rel: 'noopener', target: '_blank' }, T('upgrade'))])
      ])
    ]);
  }

  window.addEventListener('hashchange', render);
  render();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
