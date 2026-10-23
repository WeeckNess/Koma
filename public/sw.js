const CACHE='koma-public-v12';
const IMAGE_CACHE='koma-cover-images-v1';
const COVER_HOSTS=['openapi.bnf.fr','covers.openlibrary.org','media.hachette.fr','books.google.com','books.google.fr','books.googleusercontent.com','images.penguinrandomhouse.com','inventaire.io','cover.openbd.jp','api.ki-oon.com'];
const SHELL=['/offline.html','/offline.js','/icon-192.png','/icon-512.png','/favicon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k!==IMAGE_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method==='GET'&&COVER_HOSTS.includes(u.hostname)&&e.request.destination==='image'){e.respondWith(caches.open(IMAGE_CACHE).then(async cache=>{const hit=await cache.match(e.request);if(hit)return hit;const response=await fetch(e.request);if(response.ok||response.type==='opaque'){await cache.put(e.request,response.clone());const keys=await cache.keys();if(keys.length>250)await cache.delete(keys[0])}return response}));return}
 if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/')||u.pathname.includes('chatgpt')||u.pathname==='/connect')return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match('/offline.html')));return}
 if(SHELL.includes(u.pathname)||/\.(?:jpg|png|svg|woff2)$/.test(u.pathname)){e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return response})));}
});
