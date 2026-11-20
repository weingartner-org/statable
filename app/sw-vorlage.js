/* Statable - Service Worker. Wird beim Bau aus app/sw-vorlage.js erzeugt (vite.config.ts), nicht von Hand ändern.
 * Zweiter Start sofort und ohne Netz: der Kern des Pakets liegt im Cache. Teile, die nur bei Bedarf geladen werden (Excel/Word/PDF, Hilfe-Artikel,
 * PDF-Schriften, Beispieldaten; Liste BEDARF, beim Bau aus den dynamischen Importen abgeleitet), kommen beim ersten Abruf dazu und gehen danach auch ohne Netz.
 * Ein neuer Stand wird beim nächsten Aufruf im Hintergrund geholt und gilt beim Aufruf danach. */
const VERSION = '__VERSION__';
const DATEIEN = __DATEIEN__;
const BEDARF = new Set(__BEDARF__.map(u => new URL(u, self.registration.scope).href));
const CACHE = 'statable-' + VERSION;

self.addEventListener('install', e => {
  // cache: 'reload' - am HTTP-Cache vorbei, sonst käme z. B. eine alte wasm/pspp.wasm (Name ohne Prüfwert) in den neuen Stand.
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(DATEIEN.map(u => new Request(u, { cache: 'reload' })));
    // Bedarfsteile, die der vorige Stand schon hatte und die unverändert sind (gleicher Name mit Prüfwert): mitnehmen, damit sie offline nicht verloren gehen.
    const alt = (await caches.keys()).filter(n => n.startsWith('statable-') && n !== CACHE);
    for (const n of alt) {
      const ac = await caches.open(n);
      for (const k of await ac.keys()) {
        if (!BEDARF.has(k.url) || !/\/assets\//.test(k.url) || await c.match(k)) continue;
        const a = await ac.match(k);
        if (a) await c.put(k, a);
      }
    }
    await self.skipWaiting();
  })());
});

// Den vorigen Stand behalten: eine offene alte Seite lädt Teile (z. B. Excel-Export) erst bei Bedarf nach.
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const alt = (await caches.keys()).filter(n => n.startsWith('statable-') && n !== CACHE).sort();
    await Promise.all(alt.slice(0, -1).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Immer zuerst der eigene Stand: neue Seite + alte Engine (wasm/ heißt in jedem Stand gleich) darf es nicht geben.
const ausCache = async r => (await (await caches.open(CACHE)).match(r, { ignoreSearch: true })) ?? (await caches.match(r, { ignoreSearch: true }));

// R im Browser (webR, Ordner webr/): wird NICHT beim ersten Besuch geholt, sondern erst nach dem ersten Bedarf hier abgelegt.
// Eigener Cache (Name beginnt nicht mit „statable-“, überlebt neue Stände); die Dateien haben feste Versionen (scripts/webr-holen.sh).
const WEBR_CACHE = 'webr-v1';
const webrDatei = async r => {
  const c = await caches.open(WEBR_CACHE);
  const t = await c.match(r, { ignoreSearch: true });
  if (t) return t;
  const a = await fetch(r);
  if (a.status === 200) c.put(r, a.clone()).catch(() => { /* Speicher voll: ohne Cache weiter */ });
  return a;
};

// Bedarfsteile (Liste BEDARF): beim ersten Abruf holen und im eigenen Stand ablegen. Dateien ohne Prüfwert im Namen (beispiel/*.csv) am HTTP-Cache vorbei.
const bedarfsDatei = async r => {
  if (!BEDARF.has(r.url.split(/[?#]/)[0])) return fetch(r);
  const a = await fetch(r, /\/assets\//.test(r.url) ? undefined : { cache: 'reload' });
  if (a.status === 200) (await caches.open(CACHE)).put(r.url.split(/[?#]/)[0], a.clone()).catch(() => { /* Speicher voll: ohne Cache weiter */ });
  return a;
};

const WURZEL = new URL('./', self.registration.scope).href;
const istApp = u => { const x = new URL(u); x.search = ''; x.hash = ''; return x.href === WURZEL || x.href === WURZEL + 'index.html'; };

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (new URL(r.url).pathname.includes('/api/')) return;   // Konto-Server (PocketBase) nie aus dem Cache
  if (new URL(r.url).pathname.includes('/webr/')) { e.respondWith(webrDatei(r)); return; }
  // Auch die Seite aus dem Cache: ein Stand gilt immer ganz. Einen neuen sw.js prüft der Browser bei jedem Aufruf selbst.
  // Nur die App selbst (Wurzel oder index.html): Ein Klick auf eine Datei (Plakat-PDF, Quelltext-Archiv, Beispieldaten) ist auch eine Navigation
  // und bekam sonst die App-Seite statt der Datei - „PDF“ war dann eine HTML-Datei (Johannes 19.10.2026).
  if (r.mode === 'navigate' && istApp(r.url)) {
    e.respondWith((async () => (await ausCache(new URL('./', self.registration.scope).href)) ?? fetch(r))());
    return;
  }
  e.respondWith(ausCache(r).then(t => t ?? bedarfsDatei(r)));
});
