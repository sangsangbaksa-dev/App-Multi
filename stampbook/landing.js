/* Language switch navigates between the static, per-language pages (good for search engines). */
(function () {
  var sel = document.getElementById('lang');
  if (!sel) return;
  sel.addEventListener('change', function () {
    try { localStorage.setItem('sb.landing.lang', sel.value); } catch (e) {}
    location.href = sel.options[sel.selectedIndex].getAttribute('data-href');
  });
})();

/* Hero demo: a stamp sheet you can tap. Nothing is stored or sent. */
(function () {
  var box = document.getElementById('demo'), grid = document.getElementById('demo-grid');
  if (!box || !grid) return;
  var TOTAL = 10, START = 3, left = document.getElementById('demo-left'), hint = document.getElementById('demo-hint'), reset = document.getElementById('demo-reset');
  var dates = ['3/10', '10/14', '10/21', '10/28', '11/4', '11/11', '11/18', '11/25', '12/2', '12/9'], used;
  function paint() {
    grid.textContent = '';
    for (var i = 0; i < TOTAL; i++) {
      var b = document.createElement('button'); b.type = 'button';
      b.className = 'c' + (i < used ? ' on' : i === used ? ' n' : '');
      b.textContent = i < used ? dates[i] : String(i + 1);
      b.setAttribute('aria-label', (i + 1) + '/' + TOTAL);
      if (i === used) { b.onclick = press; } else { b.tabIndex = -1; b.setAttribute('aria-disabled', 'true'); }
      grid.appendChild(b);
    }
    var n = TOTAL - used;
    left.textContent = box.getAttribute('data-left').replace('{n}', n);
    var done = n === 0;
    hint.textContent = done ? box.getAttribute('data-done') : hint.getAttribute('data-tap');
    reset.hidden = !done;
  }
  function press() {
    used++; paint();
    var on = grid.querySelectorAll('.c.on'); if (on.length) on[on.length - 1].classList.add('fresh');
    var nx = grid.querySelector('.c.n'); if (nx && document.activeElement === document.body) nx.focus();
  }
  hint.setAttribute('data-tap', hint.textContent);
  reset.onclick = function () { used = START; paint(); var nx = grid.querySelector('.c.n'); if (nx) nx.focus(); };
  used = START; paint();
})();
