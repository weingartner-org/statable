#!/usr/bin/env node
/**
 * Übersetzungsbündel für eine Sprache (Leitfaden: docs/LEITFADEN-NEUE-SPRACHE.md, Auftrag: docs/sprachen/AUFTRAG-UEBERSETZEN.md).
 *
 *   node i18n/uebersetzen.mjs fr --buendel     schreibt docs/sprachen/fr-arbeit/in-<teil>.json (nur Texte, die in fr noch fehlen)
 *   node i18n/uebersetzen.mjs fr --zusammen    trägt out-<teil>.json in src/i18n/sprachen/fr.json + fr.hilfe.json und output/fr-dict.json ein -
 *                                              NUR Schlüssel, die dort fehlen oder leer sind. Vorhandene Werte (Handkorrekturen!) bleiben;
 *                                              weicht ein out-Wert ab, steht eine Zeile „behalten: <schlüssel>“, am Ende die Zahl.
 *   ... --zusammen --ueberschreiben            der alte Fall: out-Werte ersetzen vorhandene (nur wenn die Sprachdatei ausdrücklich neu aus out- entstehen soll)
 *
 * Teile: hilfe-1, hilfe-2, saetze, lib, oberflaeche (seiten/), bausteine, pspp (PSPP-Tabellenköpfe aus pspp-vorlage.json).
 * Erklärtexte und Meldungen (lib/messages.<code>.json) übersetzt ein eigener Agent direkt aus messages.en.json - nicht hier.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bereich } from './katalog.mjs';
import { einspielen } from './einspielen.mjs';

const APP = fileURLToPath(new URL('..', import.meta.url));
const [code, art, ...schalter] = process.argv.slice(2);
const ueberschreiben = schalter.includes('--ueberschreiben');
// --klein <Wörter> (Bauplan 7 Sprachen): eigener Teil „lernen“, jedes Bündel höchstens so viele Wörter, Texte einer Datei bleiben zusammen
const ki = schalter.indexOf('--klein'), klein = ki >= 0 ? Number(schalter[ki + 1]) : 0;
const rest = schalter.filter((x, i) => x !== '--ueberschreiben' && !(ki >= 0 && (i === ki || i === ki + 1)));
if (!code || !['--buendel', '--zusammen'].includes(art) || rest.length || (ueberschreiben && art !== '--zusammen') || (ki >= 0 && (art !== '--buendel' || !(klein > 0)))) { console.error('Aufruf: node i18n/uebersetzen.mjs <code> --buendel [--klein <Wörter>] | --zusammen [--ueberschreiben]'); process.exit(2); }
const ARBEIT = join(APP, '..', 'docs', 'sprachen', `${code}-arbeit`);
const json = f => JSON.parse(readFileSync(f, 'utf8'));
const katalog = json(join(APP, 'src/i18n/katalog.json'));
const SPR = join(APP, 'src/i18n/sprachen');
const datei = b => join(SPR, b === 'hilfe' ? `${code}.hilfe.json` : `${code}.json`);
const vorhanden = { ...(existsSync(datei('kern')) ? json(datei('kern')) : {}), ...(existsSync(datei('hilfe')) ? json(datei('hilfe')) : {}) };
const DICT = join(APP, 'src/output', `${code}-dict.json`);

function teil(k, e) {
  if (bereich(e) === 'hilfe') return 'hilfe';
  const o = e.orte[0];
  if (klein && o.startsWith('lernen/')) return 'lernen';
  if (/^lib\/(\w*saetze|ergebnis|berichtsatz|guetetabellen)\.ts$/.test(o)) return 'saetze';
  if (o.startsWith('lib/') || o.startsWith('i18n/') || o.startsWith('output/') || o.startsWith('engine/')) return 'lib';
  if (o.startsWith('seiten/')) return 'oberflaeche';
  return 'bausteine';
}

/** Einheitliche Typografie je Sprache, egal welcher Agent übersetzt hat. Französisch, Italienisch: typografischer Apostroph (zwischen Buchstaben). */
const APOSTROPH = s => s.replace(/(?<=\p{L})'(?=\p{L})/gu, '\u2019');
const GLAETTEN = { fr: APOSTROPH, it: APOSTROPH, nl: APOSTROPH, sv: APOSTROPH, pl: APOSTROPH, uk: APOSTROPH };
const glätten = t => (typeof t === 'string' ? (GLAETTEN[code] ?? (x => x))(t) : Object.fromEntries(Object.entries(t).map(([f, x]) => [f, glätten(x)])));

if (art === '--buendel') {
  mkdirSync(ARBEIT, { recursive: true });
  const teile = {};
  for (const [k, e] of Object.entries(katalog)) {
    if (vorhanden[k] !== undefined) continue;
    const t = teil(k, e);
    (teile[t] ??= []).push({ k, en: e.en ?? e.de, de: e.de, ...(e.sie ? { sie: e.sie } : {}), ...(e.mehrzahl ? { mehrzahl: true } : {}), orte: e.orte });
  }
  // Hilfe in zwei Hälften (nach Wörtern), damit ein Agent nicht zu viel bekommt
  if (teile.hilfe && !klein) {
    const w = x => [x.en].flat().join(' ').split(/\s+/).length;
    const ges = teile.hilfe.reduce((s, x) => s + w(x), 0);
    let s = 0; const a = [], b = [];
    for (const x of teile.hilfe) { (s < ges / 2 ? a : b).push(x); s += w(x); }
    delete teile.hilfe; teile['hilfe-1'] = a; teile['hilfe-2'] = b;
  }
  const vorlage = json(join(APP, 'src/i18n/pspp-vorlage.json')).eintraege;
  const dict = existsSync(DICT) ? json(DICT) : {};
  teile.pspp = vorlage.filter(e => dict[e.en] === undefined).map(e => ({ k: e.en, en: e.en, de: e.de, orte: ['PSPP-Tabelle (Titel/Kopf); Platzhalter %s %d %g %% genau übernehmen'] }));
  if (klein) {
    // Jeden Teil in Bündel ≤ klein Wörter teilen; Texte derselben Datei (orte[0]) bleiben zusammen, außer eine Datei allein ist größer
    const w = x => [x.en].flat().join(' ').split(/\s+/).length;
    for (const [t, liste] of Object.entries({ ...teile })) {
      if (t === 'pspp') continue;
      const nachDatei = new Map();
      for (const x of liste) { const o = x.orte[0] ?? ''; if (!nachDatei.has(o)) nachDatei.set(o, []); nachDatei.get(o).push(x); }
      const stuecke = []; let akt = [], aw = 0;
      const schliessen = () => { if (akt.length) stuecke.push(akt); akt = []; aw = 0; };
      for (const gruppe of nachDatei.values()) {
        const gw = gruppe.reduce((s, x) => s + w(x), 0);
        if (aw && aw + gw > klein) schliessen();
        for (const x of gruppe) { if (aw && aw + w(x) > klein) schliessen(); akt.push(x); aw += w(x); }
      }
      schliessen();
      delete teile[t];
      if (stuecke.length === 1) teile[t] = stuecke[0];
      else stuecke.forEach((st, i) => { teile[`${t}-${String(i + 1).padStart(2, '0')}`] = st; });
    }
  }
  for (const [t, liste] of Object.entries(teile)) {
    if (!liste.length) continue;
    writeFileSync(join(ARBEIT, `in-${t}.json`), JSON.stringify(liste, null, 1) + '\n');
    console.log(`in-${t}.json: ${liste.length} Texte, ${liste.reduce((s, x) => s + [x.en].flat().join(' ').split(/\s+/).length, 0)} Wörter`);
  }
} else {
  const kern = existsSync(datei('kern')) ? json(datei('kern')) : {}, hilfe = existsSync(datei('hilfe')) ? json(datei('hilfe')) : {};
  const dict = existsSync(DICT) ? json(DICT) : {};
  let n = 0, fremd = 0, behalten = 0, ersetzt = 0;
  const eintragen = (ziel, k, t) => {
    const r = einspielen(ziel, k, t, ueberschreiben);
    if (r === 'neu') n++;
    else if (r === 'ersetzt') { n++; ersetzt++; }
    else if (r === 'behalten') { behalten++; console.log(`behalten: ${k}`); }
  };
  for (const f of readdirSync(ARBEIT).filter(f => /^out-.*\.json$/.test(f)).sort()) {
    const aus = json(join(ARBEIT, f));
    for (const [k, roh] of Object.entries(aus)) {
      const t = glätten(roh);
      if (/^out-(nacht-)?pspp\.json$/.test(f)) { eintragen(dict, k, t); continue; }
      const e = katalog[k];
      if (!e) { fremd++; continue; }
      eintragen(bereich(e) === 'hilfe' ? hilfe : kern, k, t);
    }
  }
  // Veraltete Schlüssel (Text in de/en geändert) entfernen - sonst bleibt eine Übersetzung zu einem Text stehen, den es nicht mehr gibt
  let weg = 0;
  for (const o of [kern, hilfe]) for (const k of Object.keys(o)) if (!katalog[k]) { delete o[k]; weg++; }
  if (weg) console.log(`${weg} veraltete Übersetzungen entfernt`);
  const sortiert = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(datei('kern'), JSON.stringify(sortiert(kern), null, 1) + '\n');
  writeFileSync(datei('hilfe'), JSON.stringify(sortiert(hilfe), null, 1) + '\n');
  if (Object.keys(dict).length) writeFileSync(DICT, JSON.stringify(dict, null, 1) + '\n');
  console.log(`${n} neu eingetragen${ersetzt ? ` (davon ${ersetzt} ersetzt, --ueberschreiben)` : ''}, ${behalten} vorhandene behalten${fremd ? `, ${fremd} Schlüssel nicht im Katalog (veraltet) übersprungen` : ''} → sprachen/${code}.json, ${code}.hilfe.json, output/${code}-dict.json`);
}
