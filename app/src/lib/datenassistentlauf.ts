/**
 * Die Daten-Assistenten (lib/datenassistent.ts) mit der Engine verbinden: Vorschau durch Probelauf, Anwenden als EIN Rückgängig-Schritt,
 * zweite Datei einlesen. Die reinen Rechenregeln stehen in datenassistent.ts; hier liegt nur, was die laufende Engine braucht.
 */
import { motor, aendere, rueckgaengig, melde, textAbgebrochen, leseAktiveDaten, s, L } from './sitzung.svelte';
import { leseDatei, planeSpalten, zurEngine, liesFallzahl, type Eingelesen } from './einlesen';
import { leseStata } from './stata';
import { neuAufbauen } from './eingabe';
import { AssistentFehler, type Daten } from './datenassistent';
import { EngineAbgebrochen } from '../engine/wasm-engine';
import type { OutputItem } from '../engine/types';

/** Pfad der zweiten Datei in der Engine (Dateisystem im Speicher): roh, so wie eingelesen. */
export const ZWEITE_DATEI = '/zz_b_roh.sav';

/**
 * Alles, was die Daten der Engine zeitweise verändert (Probelauf, Anwenden, zweite Datei laden), läuft nacheinander: sonst sicherte ein Anwenden
 * mitten im Probelauf dessen Zwischenstand als „Stand davor“.
 */
let kette: Promise<void> = Promise.resolve();
function nacheinander<T>(f: () => Promise<T>): Promise<T> {
  const p = kette.then(f);
  kette = p.then(() => undefined, () => undefined);
  return p;
}

/** Fehlermeldungen von PSPP aus einem Lauf (ohne Warnungen und Hinweise). */
export const fehlerTexte = (items: OutputItem[]): string[] =>
  items.flatMap(i => (i.type === 'message' && i.severity === 'error' ? [i.text.split('\n')[0] ?? i.text] : []));

/**
 * Probelauf: führt den Befehl aus, liest die Daten danach und stellt den Stand davor wieder her - die Daten und der Verlauf bleiben unberührt.
 * Für die Vorschau („so sehen die Daten danach aus“) und für Zahlen, die nur PSPP kennt (leere Ergebnisse, Auswahl).
 * Soll ein Ergebnis in einer Datei angesehen werden, steht am Ende des Befehls `GET FILE=…`.
 */
export function probelauf(syntax: string): Promise<{ daten: Daten | null; fehler: string[] }> {
  return nacheinander(async () => {
    const e = await motor();
    const { bytes } = await e.exportSav();
    try {
      const r = await e.run(syntax);
      const fehler = fehlerTexte(r.items);
      return { daten: fehler.length ? null : await leseAktiveDaten(e), fehler };
    } finally { await e.importSav(bytes.slice()); }
  });
}

/**
 * Anwenden: ein Rückgängig-Schritt. Meldet PSPP einen Fehler, wird der Schritt zurückgenommen und nichts bleibt halb gemacht (wie im Skalenbau).
 * `true`, wenn die Daten jetzt geändert sind.
 */
/** Solange gesammelt wird, meldet `wendeAn` den Erfolg nicht einzeln: die Aufrufer sagen am Ende einen Sammelsatz an (eine Ansage statt vieler, die NVDA verschluckt). Fehler werden weiter sofort gemeldet. */
let sammelt = false;
export const sammleMeldungen = (an: boolean) => { sammelt = an; };
export const wendeAn = (text: string, syntax: string): Promise<boolean> => nacheinander(() => wendeAnJetzt(text, syntax));
async function wendeAnJetzt(text: string, syntax: string): Promise<boolean> {
  try {
    const r = await aendere(text, syntax);
    if (fehlerTexte(r.items).length) {
      await rueckgaengig();
      s.wieder = s.wieder.slice(0, -1);   // der zurückgenommene Versuch soll nicht als „Wiederholen“ stehen bleiben
      melde(L('Das ging nicht. Es ist alles wie vorher.', "That didn't work. Everything is as it was before."));
      return false;
    }
    if (!sammelt) melde(text + '.', true);
    return true;
  } catch (f) {
    if (f instanceof EngineAbgebrochen) { melde(textAbgebrochen()); return false; }
    throw f;
  }
}

/** Die zweite Datei: ihre Spalten und Zeilen für die Vorprüfung in JS und die Bytes, die vor jedem Lauf in die Engine geschrieben werden. */
export interface ZweiteDatei { name: string; daten: Daten; bytes: Uint8Array }

/**
 * Liest eine zweite Datei (SPSS, Stata, CSV, Excel) und gibt sie als `ZweiteDatei` zurück. Dafür wird sie kurz in die Engine geladen;
 * danach stehen dort wieder die Daten des Projekts. Syntax-Dateien und Statable-Projekte sind keine Daten (`AssistentFehler('dateiart')`).
 */
export async function ladeZweiteDatei(datei: File, o: { projekt?: boolean } = {}): Promise<ZweiteDatei> {
  let eingelesen = await leseDatei(datei);
  // Eigenschaften übernehmen und Datensätze vergleichen dürfen auch ein Statable-Projekt (.statable) als Quelle nehmen: darin liegen die Daten als .sav.
  if (eingelesen.art === 'projekt' && o.projekt) eingelesen = { art: 'sav', bytes: eingelesen.projekt.sav, name: eingelesen.name };
  return nacheinander(() => ladeZweiteJetzt(datei, eingelesen));
}
async function ladeZweiteJetzt(datei: File, eingelesen: Eingelesen): Promise<ZweiteDatei> {
  const e = await motor();
  const { bytes: meine } = await e.exportSav();
  try {
    let items: OutputItem[] = [];
    if (eingelesen.art === 'sav') items = (await e.importSav(eingelesen.bytes.slice())).items;
    else if (eingelesen.art === 'tabelle') {
      await e.run('NEW FILE.');
      const { syntax, csv } = zurEngine(eingelesen.tabelle, planeSpalten(eingelesen.tabelle));
      const r = await e.run(syntax + '\nSHOW N.', { '/import.csv': csv });
      items = r.items;
      const fallzahl = liesFallzahl(r.items);
      if (fallzahl !== null && fallzahl !== eingelesen.tabelle.zeilen.length) throw new AssistentFehler('lesen', datei.name);
    } else if (eingelesen.art === 'stata') {
      const stata = leseStata(eingelesen.bytes);
      const { syntax, csv } = neuAufbauen(stata.spalten, stata.zeilen);
      items = (await e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv })).items;
    } else if (eingelesen.art === 'sas') {
      const { leseSas } = await import('./sas');
      let sas; try { sas = leseSas(eingelesen.bytes); } catch { throw new AssistentFehler('lesen', datei.name); }
      const { syntax, csv } = neuAufbauen(sas.spalten, sas.zeilen);
      items = (await e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv })).items;
    } else throw new AssistentFehler('dateiart', datei.name);
    if (fehlerTexte(items).length) throw new AssistentFehler('lesen', datei.name);
    const daten = await leseAktiveDaten(e);
    if (!daten.spalten.length) throw new AssistentFehler('lesen', datei.name);
    const { bytes } = await e.exportSav();
    return { name: datei.name, daten, bytes };
  } finally { await e.importSav(meine.slice()); }
}

/** Die zweite Datei (roh) in die Engine schreiben - vor jedem Lauf, der sie braucht; die Engine kann zwischendurch neu gestartet sein. */
export function legeZweiteBereit(z: ZweiteDatei): Promise<void> {
  return nacheinander(async () => { await (await motor()).run('SET PRINTBACK=OFF.', { [ZWEITE_DATEI]: z.bytes.slice() }); });
}
