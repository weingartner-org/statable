#!/usr/bin/env node
/**
 * Schreibt src/i18n/katalog.json (alle festen Textpaare aus dem Quelltext, Schlüssel → { de, en, sie?, orte })
 * und src/i18n/sprachen/xx.json (Prüfsprache: jeder Text in [Klammern], Umlaute, 40 % länger) sowie xr.json (Prüfsprache von rechts nach links: arabische Buchstaben davor und dahinter).
 *
 *   node i18n/katalog.mjs           schreiben
 *   node i18n/katalog.mjs --pruefen nur vergleichen; Ausgang 1, wenn katalog.json veraltet ist
 *   node i18n/katalog.mjs --offen   Aufrufe zeigen, die der Auszug nicht fassen kann (Argument kein fester Text)
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { umformen, offeneAufrufe } from './auszug.mjs';

const APP = fileURLToPath(new URL('..', import.meta.url));
// Pfade mit / (auch unter Windows), sonst stimmen Ortsangaben und Filter zwischen Mac und Windows nicht überein
const rel = (von, zu) => relative(von, zu).split(sep).join('/');
const SRC = join(APP, 'src');
const ZIEL = join(SRC, 'i18n');

export function quelldateien() {
  const alle = d => readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? alle(join(d, e.name)) : [join(d, e.name)]));
  return alle(SRC).filter(f => /\.(ts|svelte)$/.test(f) && !/\.test\.ts$/.test(f) && !rel(SRC, f).endsWith('i18n/laufzeit.ts') && !rel(SRC, f).includes('testdaten/')).sort();
}

/** Bereich eines Textes: „hilfe“, wenn er nur in der Hilfe vorkommt (eigene Sprachdatei <code>.hilfe.json, erst mit der Hilfe geladen), sonst „kern“. */
export const bereich = e => (e.orte.every(o => o.startsWith('hilfe/')) ? 'hilfe' : 'kern');

export function sammle() {
  const katalog = {};
  for (const f of quelldateien()) {
    const src = readFileSync(f, 'utf8');
    const { eintraege } = umformen(src);
    for (const e of eintraege) {
      const ort = rel(SRC, f);   // ohne Zeile: sonst veraltet der Katalog bei jeder Änderung
      const alt = katalog[e.k];
      if (alt) {
        if (JSON.stringify([alt.de, alt.en ?? null]) !== JSON.stringify([e.de, e.en ?? null])) throw new Error(`Schlüssel ${e.k} doppelt vergeben (${alt.orte[0]} und ${ort}) - in auszug.mjs den Schlüssel verlängern`);
        if (!alt.orte.includes(ort)) alt.orte.push(ort);
        continue;
      }
      katalog[e.k] = { de: e.de, ...(e.en !== undefined ? { en: e.en } : {}), ...(e.sie !== undefined && e.sie !== e.de ? { sie: e.sie } : {}), ...(e.mehrzahl ? { mehrzahl: true } : {}), orte: [ort] };
    }
  }
  return Object.fromEntries(Object.entries(katalog).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** Prüfsprache „xx“: zeigt auf einen Blick, welcher Text nicht übersetzt wird (kein [ ]) und wo längere Texte abgeschnitten werden. */
const AKZENT = { a: 'á', e: 'ë', i: 'ï', o: 'ö', u: 'ü', A: 'Å', E: 'É', O: 'Ø', U: 'Ü', c: 'ç', n: 'ñ', y: 'ý' };
export function pseudo(t) {
  // Platzhalter {0} und die von PSPP (%s, %zu, %g, %%) bleiben unberührt
  const teile = t.split(/(\{\d+\}|%[a-z]+|%%)/);
  const umgeformt = teile.map(x => (/^(\{\d+\}|%[a-z]+|%%)$/.test(x) ? x : x.replace(/[aeiouAEOUcny]/g, c => AKZENT[c]))).join('');
  const zusatz = Math.ceil(t.replace(/\{\d+\}|%[a-z]+|%%/g, '').length * 0.4);
  return `[${umgeformt}${zusatz > 2 ? ' ' + '·'.repeat(Math.min(zusatz, 40)) : ''}]`;
}

/** Prüfsprache „xr“ (Welle R, Schrift von rechts nach links): der englische Text mit arabischen Buchstaben davor und dahinter, „[ابت Text تبا]“.
 *  Die Seite läuft dann mit dir="rtl", und gemischte Sätze (Latein im Arabischen) zeigen sofort, wo Zahlen, Formeln und Namen zerfallen. Platzhalter {0} und PSPP-Muster bleiben. */
export function pseudoRtl(t) { return `[ابت ${t} تبا]`; }

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const arg = process.argv[2];
  if (arg === '--offen') {
    let n = 0;
    for (const f of quelldateien()) {
      const src = readFileSync(f, 'utf8');
      for (const o of offeneAufrufe(src)) {
        console.log(`${rel(SRC, f)}:${src.slice(0, o.ort).split('\n').length}  ${o.text.replace(/\s+/g, ' ').slice(0, 150)}`);
        n++;
      }
    }
    console.log(`\n${n} Aufrufe ohne festen Text`);
    process.exit(0);
  }
  const katalog = sammle();
  const json = JSON.stringify(katalog, null, 1) + '\n';
  const datei = join(ZIEL, 'katalog.json');
  if (arg === '--pruefen') {
    const alt = existsSync(datei) ? readFileSync(datei, 'utf8') : '';
    if (alt !== json) { console.error('src/i18n/katalog.json ist veraltet: node i18n/katalog.mjs'); process.exit(1); }
    console.log(`katalog.json aktuell (${Object.keys(katalog).length} Texte)`);
    process.exit(0);
  }
  mkdirSync(join(ZIEL, 'sprachen'), { recursive: true });
  writeFileSync(datei, json);
  const xx = e => (e.mehrzahl ? { one: pseudo(e.en[0]), other: pseudo(e.en[1]) } : pseudo(e.en ?? e.de));
  for (const b of ['kern', 'hilfe']) {
    const teil = Object.fromEntries(Object.entries(katalog).filter(([, e]) => bereich(e) === b).map(([k, e]) => [k, xx(e)]));
    writeFileSync(join(ZIEL, 'sprachen', b === 'kern' ? 'xx.json' : 'xx.hilfe.json'), JSON.stringify(teil, null, 1) + '\n');
  }
  const xr = e => (e.mehrzahl ? { one: pseudoRtl(e.en[0]), other: pseudoRtl(e.en[1]) } : pseudoRtl(e.en ?? e.de));
  for (const b of ['kern', 'hilfe']) {
    const teil = Object.fromEntries(Object.entries(katalog).filter(([, e]) => bereich(e) === b).map(([k, e]) => [k, xr(e)]));
    writeFileSync(join(ZIEL, 'sprachen', b === 'kern' ? 'xr.json' : 'xr.hilfe.json'), JSON.stringify(teil, null, 1) + '\n');
  }
  // PSPP-Tabellen in den Prüfsprachen: aus der Vorlage (i18n/pspp-vorlage.mjs) ein Wörterbuch output/xx-dict.json und output/xr-dict.json
  const vorlage = join(SRC, 'i18n', 'pspp-vorlage.json');
  if (existsSync(vorlage)) {
    const eintraege = JSON.parse(readFileSync(vorlage, 'utf8')).eintraege;
    writeFileSync(join(SRC, 'output', 'xx-dict.json'), JSON.stringify(Object.fromEntries(eintraege.map(e => [e.en, pseudo(e.en)])), null, 1) + '\n');
    writeFileSync(join(SRC, 'output', 'xr-dict.json'), JSON.stringify(Object.fromEntries(eintraege.map(e => [e.en, pseudoRtl(e.en)])), null, 1) + '\n');
  }
  const w = Object.values(katalog).reduce((s, e) => s + [e.en ?? e.de].flat().join(' ').split(/\s+/).length, 0);
  console.log(`${Object.keys(katalog).length} Texte, rund ${w} Wörter (Englisch) → src/i18n/katalog.json, sprachen/xx.json`);
}
