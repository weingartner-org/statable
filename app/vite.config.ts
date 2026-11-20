import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import type { Plugin } from 'vite';
import { umformen } from './i18n/auszug.mjs';
import { cspAusDeploy } from '../scripts/csp-lesen.mjs';

const pBrotli = promisify(zlib.brotliCompress), pGzip = promisify(zlib.gzip);
const WASM = new URL('./public/wasm/pspp.wasm', import.meta.url);

/** Was zum Start gebraucht wird, steht nicht in der Liste „nur bei Bedarf“, auch wenn es als eigener Baustein geladen wird:
 *  die deutsche Wörterliste der Engine-Ausgabe (jede Tabelle in „Ausgabe“ ruft sie beim Anzeigen ab). */
const KERN_BAUSTEINE = ['output/de-dict.json'];
/** Ordner und Dateien in public/, die nur auf Abruf gebraucht werden (Beispieldaten, Installations-Bilder, Link-Vorschau). webr/ ist ohnehin ausgenommen. */
const BEDARF_ORDNER = ['beispiel/', 'klass/', 'karten/', 'screenshots/', 'vorschau.png', 'statistik/', 'ausfuellen/'];   // statistik/: Auswertung der Zählung, nur für Johannes
/** Dateien, die nur Text/Wasm enthalten und sich lohnend packen lassen (Schriften .woff2, Bilder .png sind schon gepackt). */
const PACKBAR = /\.(js|mjs|css|html|svg|json|csv|wasm|ttf|txt|webmanifest)$/;

/** Leitet aus dem Bau ab, was erst bei Bedarf in den Cache muss: alle Bausteine, die vom Startpaket aus nicht statisch erreichbar sind
 *  (dynamische Importe: Excel, Word, PDF, Hilfe-Artikel …), die Dateien (z. B. PDF-Schriften), die nur von ihnen benutzt werden, und BEDARF_ORDNER. */
function bedarfAusBau(bundle: Record<string, { type: string; fileName: string; imports?: string[]; isEntry?: boolean; moduleIds?: string[]; code?: string; source?: string | Uint8Array }>): Set<string> {
  const chunks = Object.values(bundle).filter(o => o.type === 'chunk');
  const kern = new Set<string>();
  const hinein = (f: string) => { if (kern.has(f) || !bundle[f]) return; kern.add(f); (bundle[f]!.imports ?? []).forEach(hinein); };
  chunks.filter(c => (c.isEntry && !c.moduleIds?.some(m => m.endsWith('/ausfuellen/seite.ts'))) || c.moduleIds?.some(m => KERN_BAUSTEINE.some(k => m.endsWith(k)))).forEach(c => hinein(c.fileName));   // Die Ausfüllseite (ausfuellen/) ist ein eigener Eintrag, kein Teil des Starts
  const bedarf = new Set(chunks.filter(c => !kern.has(c.fileName)).map(c => c.fileName));
  // Dateien (Schriften …): nur auf Abruf, wenn kein Kern-Baustein, kein CSS und nicht index.html sie nennt, aber ein Bedarfs-Baustein.
  const text = (o: { code?: string; source?: string | Uint8Array }) => (typeof o.code === 'string' ? o.code : typeof o.source === 'string' ? o.source : o.source ? Buffer.from(o.source).toString('latin1') : '');
  const kernText = Object.values(bundle).filter(o => kern.has(o.fileName) || (o.type === 'asset' && /\.(css|html)$/.test(o.fileName))).map(text).join('\n');
  const bedarfText = [...bedarf].map(f => text(bundle[f]!)).join('\n');
  for (const o of Object.values(bundle)) {
    if (o.type !== 'asset' || /\.(css|html)$/.test(o.fileName)) continue;
    const name = o.fileName.split('/').pop()!;
    if (!kernText.includes(name) && bedarfText.includes(name)) bedarf.add(o.fileName);
  }
  return bedarf;
}

/** Schreibt nach dem Bau dist/sw.js: Liste der Startdateien + Liste „nur bei Bedarf“ + Version aus allen Inhalten.
 *  Der Ordner webr/ (R im Browser, rund 80 MB, nur auf Abruf) gehört nicht dazu: der Service Worker legt ihn erst nach dem ersten Bedarf ab.
 *  Danach legt der Bau neben jede packbare Datei eine .br (Brotli 11) und .gz (Stufe 9) für `file_server { precompressed br gzip }`. */
function serviceWorker(): Plugin {
  let aus = '';
  let bedarf = new Set<string>();
  return {
    name: 'statable-sw', apply: 'build',
    configResolved(c) { aus = isAbsolute(c.build.outDir) ? c.build.outDir : join(c.root, c.build.outDir); },
    generateBundle(_o, bundle) { bedarf = bedarfAusBau(bundle as never); },
    async closeBundle() {
      // Offline-Fassung (scripts/offline-paket.sh): kein Service Worker, keine .br/.gz - der kleine Server im Paket liefert die Dateien roh.
      if (process.env.VITE_OFFLINE === '1') return;
      const alle = (d: string): string[] => readdirSync(d).flatMap(n => (statSync(join(d, n)).isDirectory() ? alle(join(d, n)) : [join(d, n)]));
      const dateien = alle(aus).map(f => relative(aus, f).split(sep).join('/')).filter(f => f !== 'sw.js' && !f.endsWith('.DS_Store') && !f.startsWith('webr/') && !HILFESEITE.test(f) && !/\.(br|gz)$/.test(f)).sort();
      const nurBedarf = dateien.filter(f => bedarf.has(f) || BEDARF_ORDNER.some(o => f.startsWith(o)));
      const start = dateien.filter(f => !nurBedarf.includes(f));
      const h = createHash('sha256');
      for (const f of dateien) h.update(f).update(readFileSync(join(aus, f)));
      const sw = readFileSync(new URL('./sw-vorlage.js', import.meta.url), 'utf8')
        .replace("'__VERSION__'", JSON.stringify(Date.now().toString(36) + '-' + h.digest('hex').slice(0, 10)))
        .replace('__DATEIEN__', JSON.stringify(['./', ...start.map(f => './' + f)]))
        .replace('__BEDARF__', JSON.stringify(nurBedarf.map(f => './' + f)));
      writeFileSync(join(aus, 'sw.js'), sw);
      const zuPacken = [...dateien, 'sw.js'].filter(f => PACKBAR.test(f) && statSync(join(aus, f)).size > 1024);
      await Promise.all(zuPacken.map(async f => {
        const roh = readFileSync(join(aus, f));
        const [br, gz] = await Promise.all([
          pBrotli(roh, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: roh.length } }),
          pGzip(roh, { level: 9 })
        ]);
        writeFileSync(join(aus, f + '.br'), br); writeFileSync(join(aus, f + '.gz'), gz);
      }));
    }
  };
}

/** Die Hilfe-Artikel als feste Seiten für Suchmaschinen (`src/hilfe/seiten.ts`): `<sp>/hilfe/<id>/`, `<sp>/hilfe/`, `hilfe.css`, `sitemap.xml`.
 *  Lädt die Artikel wie die App (mit Übersetzungen) über einen kleinen Vite-Server ohne Browser. Läuft vor `serviceWorker`, der diese Seiten
 *  nicht in den Cache nimmt (sie gehören nicht zur App). Die Offline-Fassung braucht sie nicht. */
function hilfeSeitenBau(): Plugin {
  return {
    name: 'statable-hilfeseiten', apply: 'build',
    async generateBundle(_o, bundle) {
      if (process.env.VITE_OFFLINE === '1') return;
      const { createServer } = await import('vite');
      const root = fileURLToPath(new URL('.', import.meta.url));
      // Ohne Vorab-Optimierung der Abhängigkeiten: Sie wurde hier (09.11.) nicht mehr fertig, das Laden überschritt die 60 s des SSR-Transports und der Bau brach ab.
      // Für das einmalige Vorab-Erzeugen der Hilfeseiten ist sie unnötig (ohne: Sitzung in rund 0,5 s geladen).
      const s = await createServer({ root, configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, ssr: { optimizeDeps: { noDiscovery: true, include: [] } }, plugins: [sprachSchluessel(), svelte()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
      try {
        const { artikelModul } = await s.ssrLoadModule('/src/hilfe/artikel-laden.ts');
        const { ladeSprache, FREIGEGEBEN } = await s.ssrLoadModule('/src/i18n/laufzeit.ts');
        const { hilfeSeiten } = await s.ssrLoadModule('/src/hilfe/seiten.ts');
        const { glossarNurEnglisch } = await s.ssrLoadModule('/src/hilfe/glossar.ts');
        const artikel: Record<string, unknown> = {};
        for (const sp of FREIGEGEBEN as string[]) {
          if (sp !== 'de' && sp !== 'en') await ladeSprache(sp, 'kern');
          artikel[sp] = (await artikelModul(sp)).artikelListe(sp).filter((a: { id: string }) => !glossarNurEnglisch(a.id, sp));
        }
        // Unterzeile wie der Ladebildschirm (eine Quelle: public/lade-sprache.js; Deutsch steht dort im HTML)
        const lade = readFileSync(new URL('./public/lade-sprache.js', import.meta.url), 'utf8');
        const T = Function(`return ${lade.match(/var T = (\{[\s\S]*?\n {2}\});/)![1]}`)() as Record<string, string[]>;
        const unterzeile = Object.fromEntries([['de', 'Statistik für Studium und Forschung'], ...Object.entries(T).map(([k, v]) => [k, v[1]])]);
        const schrift = (n: string) => Object.keys(bundle).find(f => new RegExp(`^assets/${n}-[\\w-]+\\.woff2$`).test(f))!;
        for (const d of hilfeSeiten({ sprachen: FREIGEGEBEN, artikel, unterzeile, schrift: { normal: schrift('atkinson-regular'), fett: schrift('atkinson-bold') } }))
          this.emitFile({ type: 'asset', fileName: d.pfad, source: d.inhalt });
      } finally { await s.close(); }
    }
  };
}
/** Pfade der Hilfe-Seiten im Bau: nicht in sw.js (weder Start noch Bedarf), nicht vorgepackt (Caddy packt beim Ausliefern). */
const HILFESEITE = /^([a-z]{2}\/hilfe\/|hilfe\.css$|sitemap\.xml$)/;

/** Virtuelles Modul `virtual:ausfuellseite` (Stufe 3C): das Skript der Ausfüllseite (`src/ausfuellen/seite.ts`) als EINE gebündelte, minifizierte JS-Datei in einer Zeichenkette.
 *  Statable setzt daraus in `lib/fragebogendatei.ts` die einzelne HTML-Datei zusammen (Plan, Skript und Stil inline). Gebaut wird mit einem eigenen, verschachtelten Vite-Aufruf
 *  (Bibliotheks-Modus, IIFE) beim Laden des Moduls - kein Vorbau, nichts Eingechecktes; `vite build`, `vite` und `vitest` bekommen dasselbe. Der Zugriff ist ein dynamischer Import:
 *  die Zeichenkette liegt in einem eigenen Baustein und wird nur geladen, wenn jemand die Datei erzeugt. */
function ausfuellseiteSkript(): Plugin {
  const ID = 'virtual:ausfuellseite', INTERN = '\0' + ID;
  return {
    name: 'statable-ausfuellseite',
    resolveId(id) { return id === ID ? INTERN : undefined; },
    async load(id) {
      if (id !== INTERN) return;
      const { baueAusfuellseite } = await import('./scripts/ausfuellseite-bau.mjs');
      const teil = await baueAusfuellseite(fileURLToPath(new URL('.', import.meta.url)));
      for (const m of teil.moduleIds as string[]) if (!m.startsWith('\0') && !m.includes('node_modules')) this.addWatchFile(m);
      return `export default ${JSON.stringify(teil.code)};`;
    }
  };
}

/** Vite/sirv schickt *.gz mit „Content-Encoding: gzip“ - der Browser entpackt dann schon, und webR (das die .data.gz-Dateien selbst entpackt) bekommt Unsinn.
 *  Gilt nur für `vite` und `vite preview`; auf einem echten Server darf für webr/**.gz kein Content-Encoding stehen (siehe DEPLOY.md). */
function webrOhneContentEncoding(): Plugin {
  const mw = (req: { url?: string; headers: Record<string, unknown> }, res: { setHeader: (n: string, v: unknown) => unknown }, next: () => void) => {
    if (req.url?.includes('/webr/') && /\.gz(\?|$)/.test(req.url)) {
      delete req.headers['accept-encoding'];   // `vite preview` komprimiert sonst zusätzlich
      const alt = res.setHeader.bind(res);
      res.setHeader = (n, v) => (n.toLowerCase() === 'content-encoding' ? res : alt(n, v)) as never;
    }
    next();
  };
  return { name: 'statable-webr-gz', configureServer: s => { s.middlewares.use(mw as never); }, configurePreviewServer: s => { s.middlewares.use(mw as never); } };
}

/** Hängt an jedes feste Textpaar L(de, en), T, Lx, d den Schlüssel für die Sprachdateien an (i18n/auszug.mjs; Bauplan Sprachen 0.1).
 *  Läuft vor Svelte, also auf dem Quelltext; der Code im Editor bleibt unverändert. Fügt keine Zeilen ein - Zeilennummern in Fehlern stimmen. */
function sprachSchluessel(): Plugin {
  const AUFRUF = /(?<![\w$.#])(Lp|L|T|Lx|d|P)\(/;
  return {
    name: 'statable-sprachen', enforce: 'pre',
    transform(code, id) {
      if (id.includes('?') || !/\/src\/.*\.(ts|svelte)$/.test(id) || id.endsWith('/src/i18n/laufzeit.ts') || !AUFRUF.test(code)) return;
      return { code: umformen(code).code, map: null };
    }
  };
}

// base './': das gebaute Paket läuft unter jedem Pfad (weingartner.org/programme/statable/ ebenso wie an der Wurzel eines Uni-Servers).
export default defineConfig({
  base: './',
  plugins: [sprachSchluessel(), svelte(), ausfuellseiteSkript(), webrOhneContentEncoding(), hilfeSeitenBau(), serviceWorker()],
  // __CSP__: Wortlaut der Content-Security-Policy aus DEPLOY.md für das Blatt „Für Behörden“ (seiten/Rechtliches.svelte) - nie von Hand kopiert.
  define: { __WASM_BYTES__: String(statSync(WASM).size), __CSP__: JSON.stringify(cspAusDeploy()) },
  // jsPDF lädt diese Teile nur für doc.html()/SVG - beides nutzt Statable nicht (spart rund 370 KB im Paket).
  resolve: { alias: Object.fromEntries(['html2canvas', 'canvg', 'dompurify'].map(n => [n, fileURLToPath(new URL('./src/leer/nichts.ts', import.meta.url))])) },
  worker: { format: 'es' },
  // Entwicklung: die Meldestelle läuft lokal (server/README.md, Port 8091; zum Prüfen z. B. 8093 über VITE_MELDEN_PORT)
  server: { proxy: { '/api/statable': { target: `http://127.0.0.1:${process.env.VITE_MELDEN_PORT ?? '8091'}`, changeOrigin: false } } },
  // Zwei Seiten: die App (index.html) und die feste Ausfüllseite für Links (ausfuellen/index.html, Stufe 3C).
  build: { target: 'es2022', assetsInlineLimit: 0, chunkSizeWarningLimit: 1200, rollupOptions: { input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), ausfuellen: fileURLToPath(new URL('./ausfuellen/index.html', import.meta.url)) } } },
  test: { include: ['src/**/*.test.ts'], testTimeout: 30000 }   // Suite ist groß geworden: unter Last brauchten Hilfe-Suche, Sprachkatalog u. a. mehr als 5 s (einzeln grün)
});
