const C="quickbill-v3",F=["./","index.html","app.html","i18n.js","app.js","logic.js","config.js","style.css","manifest.json","icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
