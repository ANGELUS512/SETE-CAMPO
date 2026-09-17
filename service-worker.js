const CACHE_NAME = 'sete-campo-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // El HTML: caché PRIMERO (abre al instante siempre, así la señal esté mala o nula
  // — con señal mala, esperar a la red antes de rendirse podía tardar mucho y
  // parecer que "no abre"). Se actualiza solo en segundo plano si hay señal.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        const actualizarEnSegundoPlano = fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          }
          return response;
        }).catch(() => cached);
        return cached || actualizarEnSegundoPlano;
      })
    );
    return;
  }

  // Todo lo demás (íconos, manifest, y librerías externas como xlsx.js o fuentes):
  // si ya está en caché, se sirve al toque (funciona sin internet) y de paso se
  // refresca en segundo plano si hay señal. Si nunca se había pedido, se busca
  // en la red y se guarda para la próxima vez sin conexión.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchAndCache = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchAndCache;
    })
  );
});
