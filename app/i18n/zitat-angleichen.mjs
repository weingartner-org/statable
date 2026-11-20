#!/usr/bin/env node
/**
 * Anführungszeichen um Platzhalter wie im Englischen (Bauplan 7 Sprachen, 11.11.2026).
 * Der Code setzt eingesetzte Namen meist selbst in die Anführungszeichen der Sprache (zitat()); schreibt eine Übersetzung
 * zusätzlich “{0}”, erscheint der Name doppelt zitiert. Regel: Zeichen um {n} nur, wo das Englische an dieser Stelle welche hat.
 *
 *   node i18n/zitat-angleichen.mjs <code>      gleicht src/i18n/sprachen/<code>(.hilfe).json und docs/sprachen/<code>-arbeit/out-*.json an
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('..', import.meta.url));
const code = process.argv[2];
if (!code) { console.error('Aufruf: node i18n/zitat-angleichen.mjs <code>'); process.exit(2); }
const json = f => JSON.parse(readFileSync(f, 'utf8'));
const katalog = json(join(APP, 'src/i18n/katalog.json'));

const AUF = '"“„«‘\'‹「', ZU = '"”“»’\'›」';
// Welche Platzhalter stehen im Englischen in Anführungszeichen?
const zitiert = en => {
  const s = new Set();
  for (const m of [en].flat().join('\n').matchAll(/\{(\d+)\}/g)) {
    const vor = m.input[m.index - 1], nach = m.input[m.index + m[0].length];
    if (vor && nach && AUF.includes(vor) && ZU.includes(nach)) s.add(m[1]);
  }
  return s;
};
const re = new RegExp(`([${AUF}])\\{(\\d+)\\}([${ZU}])`, 'gu');
// dazu Kendalls „τb/τc“ → „tau-b/tau-c“ (Mischschrift, Leitfaden: Prüfskript meldet sie als Fehler)
const angleichen = (t, frei) => t.replace(re, (m, a, n, z) => (frei.has(n) ? m : `{${n}}`)).replace(/τ([bc])(?![\p{L}])/gu, 'tau-$1');
const wert = (v, frei) => (typeof v === 'string' ? angleichen(v, frei) : Object.fromEntries(Object.entries(v).map(([f, x]) => [f, angleichen(x, frei)])));

function datei(f, schluessel = k => k) {
  if (!existsSync(f)) return 0;
  const o = json(f); let n = 0;
  for (const [k, v] of Object.entries(o)) {
    const e = katalog[schluessel(k)]; if (!e) continue;
    const neu = wert(v, zitiert(e.en ?? e.de));
    if (JSON.stringify(neu) !== JSON.stringify(v)) { o[k] = neu; n++; }
  }
  if (n) writeFileSync(f, JSON.stringify(o, null, 1) + '\n');
  return n;
}
let ges = 0;
for (const b of ['', '.hilfe']) { const n = datei(join(APP, 'src/i18n/sprachen', `${code}${b}.json`)); ges += n; console.log(`${code}${b}.json: ${n} angeglichen`); }
const ARBEIT = join(APP, '..', 'docs', 'sprachen', `${code}-arbeit`);
if (existsSync(ARBEIT)) for (const f of readdirSync(ARBEIT).filter(f => /^out-(?!pspp).*\.json$/.test(f))) { const n = datei(join(ARBEIT, f)); if (n) console.log(`${f}: ${n} angeglichen`); ges += n; }
console.log(`zusammen ${ges}`);
