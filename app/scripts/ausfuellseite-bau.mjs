// Baut die Ausfüllseite (src/ausfuellen/seite.ts) zu EINER minifizierten JS-Datei (IIFE) und gibt Text und Module zurück (Stufe 3C).
// Benutzt von vite.config.ts (virtuelles Modul „virtual:ausfuellseite“) und scripts/ausfuellseite-groesse.mjs.
// Nicht gebündelt werden: scrypt, die Post-Quanten-Empfänger und P-256 von typage (Platzhalter in src/ausfuellen/ohne/leer.ts); die Ausfüllseite verschlüsselt nur an einen X25519-Empfänger.
import { build } from 'vite';
import { resolve } from 'node:path';

export async function baueAusfuellseite(wurzel) {
  const leer = resolve(wurzel, 'src/ausfuellen/ohne/leer.ts');
  const aus = await build({
    configFile: false, root: wurzel, logLevel: 'silent', define: { 'process.env.NODE_ENV': '"production"' },
    resolve: { alias: [
      { find: '@noble/hashes/scrypt.js', replacement: leer },
      { find: '@noble/post-quantum/hybrid.js', replacement: leer },
      { find: '@noble/curves/nist.js', replacement: leer },
    ] },
    build: { write: false, minify: true, sourcemap: false, target: 'es2022', lib: { entry: resolve(wurzel, 'src/ausfuellen/seite.ts'), formats: ['iife'], name: 'StatableAusfuellen', fileName: 'seite' } },
  });
  const teil = (Array.isArray(aus) ? aus : [aus]).flatMap(a => ('output' in a ? a.output : [])).find(o => o.type === 'chunk');
  if (!teil || teil.type !== 'chunk') throw new Error('Ausfüllseite: Bau ohne Ergebnis');
  return { code: teil.code, moduleIds: teil.moduleIds, module: teil.modules };
}
