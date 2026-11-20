/**
 * Kurze Wörter, die an mehreren Stellen eingesetzt werden (Falle 31): gleicher Text = gleicher Schlüssel,
 * also eine Übersetzung für alle Sätze. Zeigt je Wort die Übersetzung und die Dateien, damit man jeden Satz einmal liest.
 *   node i18n/kurzwoerter.mjs <code>     (liest docs/sprachen/<code>-arbeit/out-*.json, sonst src/i18n/sprachen/<code>.json)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const code = process.argv[2];
if (!code) { console.error('Aufruf: node i18n/kurzwoerter.mjs <code>'); process.exit(2); }
const json = p => JSON.parse(readFileSync(p, 'utf8'));
const katalog = json(join(APP, 'src/i18n/katalog.json'));
const arbeit = join(APP, '..', 'docs/sprachen', `${code}-arbeit`);
const ziel = {};
if (existsSync(arbeit)) for (const f of readdirSync(arbeit)) if (/^out-.*\.json$/.test(f)) Object.assign(ziel, json(join(arbeit, f)));
const datei = join(APP, 'src/i18n/sprachen', `${code}.json`);
if (!Object.keys(ziel).length && existsSync(datei)) Object.assign(ziel, json(datei));

for (const [k, e] of Object.entries(katalog)) {
  const en = e.en ?? e.de;
  if (typeof en !== 'string' || en.length > 25 || en.includes('{') || !/^[a-z]/.test(en)) continue;
  const orte = new Set(e.orte.map(o => o.split('/').pop()));
  if (orte.size < 2) continue;
  console.log(`${k}\t${JSON.stringify(en)}\t${JSON.stringify(ziel[k] ?? '-')}\t${[...orte].join(' ')}`);
}
