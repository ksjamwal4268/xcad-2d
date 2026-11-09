const CACHE_NAME = 'xcad-2d-v2026';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './css/cad.css',
  './js/cad-engine.js',
  './js/cad-commands.js',
  './js/cad-ui.js',
  './js/dxf-exporter.js',
  './js/xcad-templates.js',
  './js/xcad-ai-blocks.js',
  './js/xcad-gis-map.js',
  './js/xcad-parametric.js',
  './js/xcad-lisp.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => cached))
  );
});
