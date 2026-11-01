const C="quickbill-v20",F=["./","app","view","share.js","fx.js","clients.js","catalog.js","view.js","i18n.js","app.js","workspace.js","insights.js","playbook.js","auth.js","account.js","storage.js","license.js","sheet.js","docs.js","landing.css","logic.js","config.js","style.css","manifest.json","icon.svg","icon-192.png","fonts/newsreader-latin-400-normal.woff2","fonts/newsreader-latin-600-normal.woff2","fonts/inter-latin-400-normal.woff2","fonts/inter-latin-500-normal.woff2","fonts/inter-latin-600-normal.woff2","cloud-data.js","cloud-i18n.js","cloud-sync.js","cloud-panel.js"];
// Cache-first from this version's cache only. Old caches are dropped on activate, so a deploy is picked up
// on the next load instead of serving the previous version's files forever.
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(F)))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(caches.open(C).then(c=>c.match(e.request)).then(r=>r||fetch(e.request)))});
