const C="quickbill-v7",F=["./","index.html","app.html","i18n.js","app.js","workspace.js","sheet.js","docs.js","landing.css","logic.js","config.js","style.css","manifest.json","icon.svg","icon-192.png","fonts/newsreader-latin-400-normal.woff2","fonts/newsreader-latin-600-normal.woff2","fonts/inter-latin-400-normal.woff2","fonts/inter-latin-500-normal.woff2","fonts/inter-latin-600-normal.woff2"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
