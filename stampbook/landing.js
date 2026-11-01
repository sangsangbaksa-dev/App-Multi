/* Language switch navigates between the static, per-language pages (good for search engines). */
(function () {
  var sel = document.getElementById('lang');
  if (!sel) return;
  sel.addEventListener('change', function () {
    try { localStorage.setItem('sb.landing.lang', sel.value); } catch (e) {}
    location.href = sel.options[sel.selectedIndex].getAttribute('data-href');
  });
})();
