(function () {
  var I = window.HBI, S = window.HB_SITE || {}, sel = document.getElementById('lang'), saved = '';
  try { saved = localStorage.getItem('homebrief.lang') || ''; } catch (e) {}
  var lang = I.S[saved] ? saved : I.detect(navigator);
  I.langs.forEach(function (l) { var o = document.createElement('option'); o.value = l; o.textContent = I.names[l]; sel.appendChild(o); });
  function draw() {
    var d = I.S[lang]; sel.value = lang; document.documentElement.lang = lang; document.title = d.ttl;
    var md = document.querySelector('meta[name=description]'); if (md) md.setAttribute('content', d.lede);
    document.querySelectorAll('[data-i]').forEach(function (n) { var v = d[n.getAttribute('data-i')]; if (v) n.textContent = v; });
    var p = document.getElementById('price'); if (p) p.textContent = d.priceLine + (S.price ? ' · ' + S.price : '');
  }
  sel.addEventListener('change', function () { lang = sel.value; try { localStorage.setItem('homebrief.lang', lang); } catch (e) {} draw(); });
  draw();
})();
