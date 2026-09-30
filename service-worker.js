// La fiecare modificare a fișierelor, schimbă numărul versiunii V.
const V='incasari-v4',A=['./','index.html','styles.css','app.js','manifest.json','icon-180.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
 e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(x=>{const c=x.clone();caches.open(V).then(h=>h.put(e.request,c));return x}).catch(()=>caches.match('index.html'))))});
