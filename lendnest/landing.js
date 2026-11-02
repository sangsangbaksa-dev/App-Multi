(function () {
  var I = window.LNI, sel = document.getElementById('lang'), feat = document.getElementById('feat'), saved = '';
  try { saved = localStorage.getItem('lendnest.lang') || ''; } catch (e) {}
  var lang = I.LAND[saved] ? saved : I.detect(navigator);
  I.langs.forEach(function (l) { var o = document.createElement('option'); o.value = l; o.textContent = I.L[l].name; sel.appendChild(o); });
  function draw() {
    var d = I.LAND[lang]; sel.value = lang; document.documentElement.lang = lang; document.title = d.ttl; var md = document.querySelector('meta[name=description]'); if (md) md.setAttribute('content', d.lede);
    document.querySelectorAll('[data-i]').forEach(function (n) { n.textContent = d[n.getAttribute('data-i')]; });
    feat.textContent = '';
    for (var i = 1; i <= 6; i++) { var c = document.createElement('article'), h = document.createElement('h2'), p = document.createElement('p'); h.textContent = d['f' + i + 'h']; p.textContent = d['f' + i + 'b']; c.appendChild(h); c.appendChild(p); feat.appendChild(c); }
  }
  sel.addEventListener('change', function () { lang = sel.value; try { localStorage.setItem('lendnest.lang', lang); } catch (e) {} draw(); });
  draw();
})();
