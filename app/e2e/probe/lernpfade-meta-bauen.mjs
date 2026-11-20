// Erzeugt die Fragenliste für `lernpfade-durchlauf.mjs`: Einheiten, Pfade, Fragenart, Bild-/Tabellenbezug, Ort-/Farbwörter, Lösungen der Rechenaufgaben.
// Aufruf (im Ordner app): node e2e/probe/lernpfade-meta-bauen.mjs <ausgabeordner>   -> <ausgabeordner>/meta.json
// Baut `lernpfade-meta.ts` mit Vite (SSR) in einen Ordner außerhalb des Projekts; Quelldateien bleiben unberührt.
import { build } from 'vite';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const aus = resolve(process.argv[2] ?? '.');
await build({ configFile: false, root: resolve('.'), logLevel: 'error', publicDir: false,
  build: { ssr: resolve('e2e/probe/lernpfade-meta.ts'), outDir: resolve(aus, 'metaout'), emptyOutDir: true, rollupOptions: { output: { entryFileNames: 'meta.mjs', codeSplitting: false } } },
  ssr: { noExternal: true } });
const r = spawnSync(process.execPath, [resolve(aus, 'metaout/meta.mjs'), resolve(aus, 'meta.json')], { stdio: 'inherit' });
process.exit(r.status ?? 1);
