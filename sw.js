/* Service worker: es lo que hace que la app funcione sin internet.

   VERSION la reescribe app_publicar.py en cada publicación. Cuando cambia, el
   navegador tira el caché viejo y se baja todo de nuevo: así el promotor que ya
   tenía la app instalada recibe la corrección sin hacer nada.

   Dos estrategias distintas a propósito:
   - el armazón (html, iconos, manifest) va de caché primero: abre instantáneo
     y anda en el subsuelo de una casa sin señal.
   - las jornadas van de red primero: si hay internet, trae la última versión;
     si no, la que tenga guardada. Es la única parte que puede cambiar seguido.
*/
const VERSION = "v10";
const CACHE = "recorrida-" + VERSION;
const ARMAZON = ["./", "./index.html", "./manifest.webmanifest",
                 "./icono-192.png", "./icono-512.png", "./icono-180.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ARMAZON))
    .then(() => self.skipWaiting())
    .catch(() => self.skipWaiting()));     // si falta un icono, igual se instala
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.includes("/jornadas/")) {
    e.respondWith(
      fetch(req).then(r => {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(req, copia));
        return r;
      }).catch(() => caches.match(req))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      const copia = r.clone();
      caches.open(CACHE).then(c => c.put(req, copia));
      return r;
    }))
  );
});
