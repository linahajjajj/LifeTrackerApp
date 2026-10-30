/* Life Book service worker: works offline and serves photos saved on this device.
   Bump VERSION on every release so phones drop the old cached files. */
const VERSION = 'v36-web-1';
const SHELL = 'shell-' + VERSION;
const FONTS = 'fonts-v1';
const CORE = ['/', '/index.html', '/css/app.css', '/js/runtime.js', '/js/app.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== FONTS).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

function blobFromDB(id) {
  return new Promise((res, rej) => {
    const r = indexedDB.open('lina-life', 1);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs'); if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs'); };
    r.onerror = () => rej(r.error);
    r.onsuccess = () => { const g = r.result.transaction('blobs').objectStore('blobs').get(id); g.onsuccess = () => res(g.result); g.onerror = () => rej(g.error); };
  });
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin && url.pathname.startsWith('/_blob/')) {
    const id = decodeURIComponent(url.pathname.slice(7));
    e.respondWith(blobFromDB(id).then(b => b ? new Response(b, { headers: { 'content-type': b.type || 'image/jpeg', 'cache-control': 'no-store' } }) : new Response('', { status: 404 })).catch(() => new Response('', { status: 404 })));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (url.origin === location.origin) {
    // network first so updates arrive; cache when offline
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cp = r.clone(); caches.open(SHELL).then(c => c.put(e.request, cp)); } return r; })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('/index.html'))));
  }
});
