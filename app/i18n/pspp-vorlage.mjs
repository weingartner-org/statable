#!/usr/bin/env node
/**
 * Vorlage für Übersetzende der PSPP-Tabellentexte (Bauplan Sprachen, 0.5).
 *
 * Die Engine liefert Tabellentitel und Spalten-/Zeilenköpfe auf Englisch. Jede Sprache außer Englisch kann dazu ein Wörterbuch
 * `src/output/<code>-dict.json` haben (Schlüssel = englischer PSPP-Text, Wert = Übersetzung); fehlt es oder ein Eintrag, bleibt das Original.
 * PSPPs eigene .po-Dateien haben rund 2 800 Texte - fast alles Menüs und Fehlermeldungen. In Tabellen werden etwa 240 sichtbar.
 * Diese Vorlage nennt genau diese Texte, je Eintrag englisch und deutsch.
 *
 *   node i18n/pspp-vorlage.mjs                 schreiben: src/i18n/pspp-vorlage.json
 *   node i18n/pspp-vorlage.mjs --pruefen       nur vergleichen; Ausgang 1, wenn die Datei veraltet ist
 *   node i18n/pspp-vorlage.mjs --pruefen fr    src/output/fr-dict.json gegen die Vorlage prüfen (fehlende Einträge, Platzhalter %s %zu %g)
 *   node i18n/pspp-vorlage.mjs --texte         die gefundenen englischen Texte zeigen (zum Nachsehen)
 *
 * Wo die Texte herkommen (abgelegte Ausgaben, keine Rechnung nötig):
 *   app/src/lib/testdaten/, docs/entwurf-opus/daten/, pruefung-2026-10-08/ - jede Zeichenkette in den JSON-Dateien, die genau einem Eintrag
 *   des deutschen Wörterbuchs (src/output/de-dict.json) oder den Ergänzungen in src/output/format-de.ts entspricht, dazu Titel mit Klammerzusatz
 *   („Group Statistics (Alter)“) und Wörterbuch-Einträge mit Platzhaltern („Pair %zu“), wenn ein Fund sie ausfüllt.
 * Ein neuer Text kommt dazu, sobald er in einer abgelegten Ausgabe steht: Datei dort ablegen, Skript laufen lassen.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const APP = fileURLToPath(new URL('..', import.meta.url));
const WURZEL = join(APP, '..');
const QUELLEN = ['app/src/lib/testdaten', 'docs/entwurf-opus/daten', 'pruefung-2026-10-08'];
const VORLAGE = join(APP, 'src/i18n/pspp-vorlage.json');
const DICT = code => join(APP, `src/output/${code}-dict.json`);

/** Die deutschen Ergänzungen aus format-de.ts (was im Wörterbuch von PSPP fehlt). */
function ergaenzung() {
  const t = readFileSync(join(APP, 'src/output/format-de.ts'), 'utf8');
  const block = /export const ERGAENZUNG_DE[^{]*\{([\s\S]*?)\n\};/.exec(t)?.[1] ?? '';
  const aus = {};
  for (const m of block.matchAll(/(['"])((?:\\.|(?!\1).)*)\1\s*:\s*(['"])((?:\\.|(?!\3).)*)\3/g)) aus[m[2].replace(/\\(['"])/g, '$1')] = m[4].replace(/\\(['"])/g, '$1');
  return aus;
}

const dateien = d => (existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? dateien(join(d, e.name)) : [join(d, e.name)])) : []);

/** Alle Zeichenketten einer JSON-Datei (Werte, nicht Schlüssel); Zeilen mit Zeilenumbruch oder Tabulator (Spaltenköpfe) auch einzeln. */
function zeichenketten(wert, aus) {
  if (typeof wert === 'string') { aus.add(wert.trim()); for (const z of wert.split(/[\n\t]/)) aus.add(z.trim()); }
  else if (Array.isArray(wert)) for (const w of wert) zeichenketten(w, aus);
  else if (wert && typeof wert === 'object') for (const w of Object.values(wert)) zeichenketten(w, aus);
}

/** Muster eines Wörterbuch-Eintrags mit Platzhaltern wie in output/format-de.ts (ausVorlage). */
const muster = en => new RegExp('^' + en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%%/g, '\u0001').replace(/%(?:zu|ld|d|g|s)/g, '(.+?)').replace(/\u0001/g, '%') + '$');
const mitPlatzhalter = en => /%[a-z]/.test(en) && en.length <= 80 && en.replace(/%[a-z]|%%|[^A-Za-z]/g, '').length >= 4;

/** Wörter aus Bedienung und PSPP-Meldungen, die in den abgelegten Seitentexten vorkommen, aber nie in einer Tabelle stehen. */
const KEIN_TABELLENTEXT = new Set(['Back', 'Both', 'Cancel', 'Chart', 'Close', 'Continue', 'Data', 'Date', 'Export', 'Help', 'Insert', 'Report', 'Save', 'Settings', 'Show', 'Text', 'Title']);
const MELDUNG = /^%s (is|are) /;

/** Sollwert-Dateien (R-Rechnungen und Eingabedaten der Tests, `welle5-erwartet.json`): enthalten Spaltennamen wie „note“, aber keine PSPP-Ausgabe. */
const SOLLWERTE = /-erwartet\.json$/;

export function sammle() {
  const de = JSON.parse(readFileSync(join(APP, 'src/output/de-dict.json'), 'utf8'));
  const erg = ergaenzung();
  const woerterbuch = { ...de, ...erg };
  const funde = new Set();
  for (const q of QUELLEN) for (const f of dateien(join(WURZEL, q))) {
    if (!f.endsWith('.json') || SOLLWERTE.test(f)) continue;
    let j; try { j = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
    zeichenketten(j, funde);
  }
  const treffer = new Map();   // englisch → Fundort-Zählung egal
  // zwei Buchstaben, auch getrennt („S.E.“); ein Platzhalter ist %s, %zu, %g, %% - nicht jedes % („% of Variance“)
  const hatBuchstaben = t => /\p{L}.*\p{L}/u.test(t);
  const platzhalter = t => /%(?:zu|ld|d|g|s|%)/.test(t);
  const vorlagen = Object.keys(woerterbuch).filter(mitPlatzhalter).map(en => [en, muster(en)]);
  for (const f of funde) {
    if (!f || !hatBuchstaben(f) || KEIN_TABELLENTEXT.has(f) || MELDUNG.test(f)) continue;
    if (Object.hasOwn(woerterbuch, f) && !platzhalter(f)) { treffer.set(f, woerterbuch[f]); continue; }
    // „Titel (Variable)“: der Teil vor der letzten Klammer
    const k = /^(.*\S)\s+\(.*\)$/.exec(f)?.[1];
    if (k && Object.hasOwn(woerterbuch, k) && !platzhalter(k) && hatBuchstaben(k)) { treffer.set(k, woerterbuch[k]); continue; }
    for (const [en, re] of vorlagen) if (re.test(f)) { treffer.set(en, woerterbuch[en]); break; }
  }
  return [...treffer].filter(([en]) => !MELDUNG.test(en)).map(([en, d]) => ({ en, de: d })).sort((a, b) => a.en.localeCompare(b.en, 'en'));
}

export const aufbau = liste => JSON.stringify({
  hinweis: 'Englische PSPP-Texte, die in Tabellen sichtbar werden (Titel, Spalten-, Zeilenköpfe), mit der deutschen Übersetzung. Übersetzung je Sprache: src/output/<code>-dict.json = { "englischer Text": "Übersetzung" }. Platzhalter (%s, %zu, %g, %%) und Klammerzusätze genau so übernehmen. Erzeugt von i18n/pspp-vorlage.mjs - nicht von Hand ändern.',
  eintraege: liste
}, null, 1) + '\n';

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) haupt(process.argv.slice(2));

function haupt(arg) {
  const [befehl, code] = [arg[0], arg[1]];
  if (befehl === '--pruefen' && code) {
    // Wörterbuch einer Sprache gegen die Vorlage
    const datei = DICT(code);
    if (!existsSync(datei)) { console.log(`${code}: ${relative(APP, datei)} fehlt - die Tabellen bleiben englisch.`); process.exit(0); }
    const dict = JSON.parse(readFileSync(datei, 'utf8'));
    const vorlage = JSON.parse(readFileSync(VORLAGE, 'utf8')).eintraege;
    const platz = t => (t.match(/%(?:zu|ld|d|g|s|%)/g) ?? []).sort().join(' ');
    const fehlt = vorlage.filter(e => !(e.en in dict) && !(e.en in dict && dict[e.en]));
    const falsch = vorlage.filter(e => e.en in dict && platz(e.en) !== platz(dict[e.en]));
    console.log(`${code}: ${vorlage.length - fehlt.length} von ${vorlage.length} Texten übersetzt.`);
    for (const e of fehlt) console.log('  fehlt:', e.en);
    for (const e of falsch) console.log('  Platzhalter passen nicht:', e.en, '→', dict[e.en]);
    process.exit(fehlt.length || falsch.length ? 1 : 0);
  }
  const liste = sammle();
  if (befehl === '--texte') { for (const e of liste) console.log(e.en); console.log(liste.length, 'Texte'); process.exit(0); }
  const neu = aufbau(liste);
  if (befehl === '--pruefen') {
    const alt = existsSync(VORLAGE) ? readFileSync(VORLAGE, 'utf8') : '';
    if (alt !== neu) { console.error('src/i18n/pspp-vorlage.json ist veraltet - node i18n/pspp-vorlage.mjs'); process.exit(1); }
    console.log('Vorlage ist aktuell:', liste.length, 'Texte');
  } else {
    writeFileSync(VORLAGE, neu);
    console.log(`${relative(APP, VORLAGE)}: ${liste.length} Texte`);
  }
}
