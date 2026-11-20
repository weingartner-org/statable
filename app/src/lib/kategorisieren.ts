/**
 * Offene Antworten ordnen (Welle 4, G7): kurze Freitexte aus dem Fragebogen in Kategorien einteilen.
 * Reine Logik ohne Oberfläche: Kategorien (Kodierleitfaden), Zuordnung, Häufigkeiten und die Ergebnisspalten samt PSPP-Syntax zum Übernehmen.
 * Fachblatt: docs/fachblaetter/WELLE4-FAELLE-OFFENE-ANTWORTEN.md (Abschnitt G7). Quellen: Kuckartz & Rädiker (2022), Kap. 3 und 4; Mayring (2022).
 *
 * Drei Zustände je Antwort: leer (kein Text) · offen (Text, noch keine Kategorie) · zugeordnet. Leer und offen sind FEHLEND, nie „keine Kategorie“ und nie 0.
 * Prozentbasis: Personen mit zugeordneter Antwort (`nZugeordnet`); bei Mehrfachzuordnung zusätzlich Prozent der Nennungen. Kein Test, keine Verallgemeinerung.
 * Statable ordnet nichts selbst zu (keine KI): Jede Zuordnung kommt von einer Person.
 */
import { freierName } from './skalabau';
import { L } from './sitzung.svelte';
import { zit } from './befehlstext';

export interface Antwort { schluessel: string; text: string | null }
export interface Kategorie { id: string; name: string; beschreibung: string; beispiel: string }
/** Der Zustand einer Kodierung; liegt im Blatt (Projektdatei). `zuordnung`: Schlüssel der Antwort → Kategorie-ids, geordnet nach der Kategorienliste. */
export interface KatZustand { kategorien: Kategorie[]; mehrfach: boolean; zuordnung: Record<string, string[]> }
export type AntwortZustand = 'leer' | 'offen' | 'zugeordnet';

export const leererKatZustand = (): KatZustand => ({ kategorien: [], mehrfach: false, zuordnung: {} });

/** Neue Kategorie hinten anfügen; der Code einer Kategorie ist ihre Stelle in der Liste + 1. */
export function neueKategorie(z: KatZustand, name: string, beschreibung = '', beispiel = ''): string {
  const nummern = z.kategorien.map(k => Number(k.id.slice(1))).filter(Number.isFinite);
  const id = `k${Math.max(0, ...nummern) + 1}`;
  z.kategorien.push({ id, name: name.trim(), beschreibung, beispiel });
  return id;
}
export function benenneKategorie(z: KatZustand, id: string, name: string) {
  const k = z.kategorien.find(x => x.id === id); if (k) k.name = name.trim();
}
/** Ordnet die Kategorien einer Zuordnung nach der Reihenfolge der Liste und lässt unbekannte weg. */
function ordnen(z: KatZustand, ids: string[]): string[] {
  const menge = new Set(ids);
  return z.kategorien.filter(k => menge.has(k.id)).map(k => k.id);
}
function sortiereAlle(z: KatZustand) {
  for (const key of Object.keys(z.zuordnung)) { const n = ordnen(z, z.zuordnung[key]!); if (n.length) z.zuordnung[key] = n; else delete z.zuordnung[key]; }
}
/** Löschen: Die Zuordnungen zu dieser Kategorie entfallen; Antworten ohne Kategorie sind wieder „offen“. */
export function loescheKategorie(z: KatZustand, id: string) {
  z.kategorien = z.kategorien.filter(k => k.id !== id);
  for (const key of Object.keys(z.zuordnung)) {
    const rest = z.zuordnung[key]!.filter(x => x !== id);
    if (rest.length) z.zuordnung[key] = rest; else delete z.zuordnung[key];
  }
}
/** Zusammenführen: Die Zuordnungen von `von` gehen auf `nach` über (ohne Doppelte); `von` entfällt. */
export function fuehreZusammen(z: KatZustand, vonId: string, nachId: string) {
  if (vonId === nachId || !z.kategorien.some(k => k.id === vonId) || !z.kategorien.some(k => k.id === nachId)) return;
  for (const key of Object.keys(z.zuordnung)) {
    const l = z.zuordnung[key]!;
    if (!l.includes(vonId)) continue;
    z.zuordnung[key] = ordnen(z, [...l.filter(x => x !== vonId), nachId]);
  }
  z.kategorien = z.kategorien.filter(k => k.id !== vonId);
  sortiereAlle(z);
}
/** Eine Stelle nach vorn (-1) oder hinten (1); verschiebt die Codes. Am Rand passiert nichts. */
export function verschiebeKategorie(z: KatZustand, id: string, richtung: -1 | 1) {
  const i = z.kategorien.findIndex(k => k.id === id), j = i + richtung;
  if (i < 0 || j < 0 || j >= z.kategorien.length) return;
  const [k] = z.kategorien.splice(i, 1); z.kategorien.splice(j, 0, k!);
  sortiereAlle(z);
}
/** Die Kategorien einer Antwort, die es noch gibt; bei „eine Kategorie je Antwort“ höchstens die mit dem kleinsten Code. */
function kategorienVon(z: KatZustand, schluessel: string): string[] {
  const l = ordnen(z, z.zuordnung[schluessel] ?? []);
  return z.mehrfach ? l : l.slice(0, 1);
}
/** Zuordnen (`an = true`) oder die Zuordnung entfernen. Eine Kategorie je Antwort: `an` ERSETZT die bisherige; mehrfach: fügt hinzu bzw. entfernt. */
export function ordne(z: KatZustand, schluessel: string, kategorieId: string, an = true) {
  if (an && !z.kategorien.some(k => k.id === kategorieId)) return;
  const jetzt = z.zuordnung[schluessel] ?? [];
  let neu: string[];
  if (an) neu = z.mehrfach ? ordnen(z, [...jetzt, kategorieId]) : [kategorieId];
  else neu = jetzt.filter(x => x !== kategorieId);
  if (neu.length) z.zuordnung[schluessel] = neu; else delete z.zuordnung[schluessel];
}
/** Alle Zuordnungen einer Antwort entfernen. */
export function leereAntwort(z: KatZustand, schluessel: string) { delete z.zuordnung[schluessel]; }
/** Wechsel zwischen „eine Kategorie je Antwort“ und „mehrere“: mehrfach → eins behält die Kategorie mit dem kleinsten Code, eins → mehrfach verliert nichts. */
export function setzeModus(z: KatZustand, mehrfach: boolean) {
  if (z.mehrfach === mehrfach) return;
  if (!mehrfach) for (const key of Object.keys(z.zuordnung)) { const l = ordnen(z, z.zuordnung[key]!).slice(0, 1); if (l.length) z.zuordnung[key] = l; else delete z.zuordnung[key]; }
  z.mehrfach = mehrfach;
}

export const hatText = (a: Antwort) => a.text !== null && a.text !== undefined && String(a.text).trim() !== '';
/** leer = kein Text oder nur Leerraum (gewinnt gegen jede Zuordnung); offen = Text, keine Kategorie; zugeordnet = mindestens eine Kategorie. */
export function zustandVon(a: Antwort, z: KatZustand): AntwortZustand {
  if (!hatText(a)) return 'leer';
  return kategorienVon(z, a.schluessel).length ? 'zugeordnet' : 'offen';
}
export const zustaende = (antworten: Antwort[], z: KatZustand): AntwortZustand[] => antworten.map(a => zustandVon(a, z));

export interface KatZeile { id: string; name: string; code: number; n: number; prozentPersonen: number; prozentNennungen: number }
export interface KatHaeufigkeit {
  modus: 'eins' | 'mehrfach'; nZeilen: number; nLeer: number; nOffen: number; nZugeordnet: number; nNennungen: number; summePersonenProzent: number; kategorien: KatZeile[];
}
/** Häufigkeiten je Kategorie. Prozent 0-100. `prozentPersonen`: Basis sind die Antworten mit mindestens einer Kategorie; `prozentNennungen`: Basis ist die Summe aller Zuordnungen (bei „eins“ gleich). */
export function haeufigkeiten(antworten: Antwort[], z: KatZustand): KatHaeufigkeit {
  const zahl = new Map<string, number>(z.kategorien.map(k => [k.id, 0]));
  let nLeer = 0, nOffen = 0, nZugeordnet = 0, nNennungen = 0;
  for (const a of antworten) {
    const zs = zustandVon(a, z);
    if (zs === 'leer') { nLeer++; continue; }
    if (zs === 'offen') { nOffen++; continue; }
    nZugeordnet++;
    for (const id of kategorienVon(z, a.schluessel)) { zahl.set(id, (zahl.get(id) ?? 0) + 1); nNennungen++; }
  }
  const kategorien = z.kategorien.map((k, i): KatZeile => {
    const n = zahl.get(k.id) ?? 0;
    return { id: k.id, name: k.name, code: i + 1, n, prozentPersonen: nZugeordnet ? n / nZugeordnet * 100 : 0, prozentNennungen: nNennungen ? n / nNennungen * 100 : 0 };
  });
  return { modus: z.mehrfach ? 'mehrfach' : 'eins', nZeilen: antworten.length, nLeer, nOffen, nZugeordnet, nNennungen, summePersonenProzent: kategorien.reduce((a, k) => a + k.prozentPersonen, 0), kategorien };
}

export interface KatSpalte { name: string; kategorieId: string | null; label: string; werte: (number | null)[] }
export interface KatSet { name: string; label: string; spalten: string[]; zaehlwert: 1 }
export interface KatErgebnis { modus: 'eins' | 'mehrfach'; spalten: KatSpalte[]; labels: { code: number; label: string }[]; set: KatSet | null }

/** Name für ein Mehrfachantworten-Set (mehrfach.ts `setNameFehler`): Buchstabe vorn, dann Buchstaben, Ziffern, Unterstrich. */
const setName = (n: string) => { const t = n.replace(/[^A-Za-z0-9ÄÖÜäöüß_]/g, '_'); return /^[A-Za-zÄÖÜäöü]/.test(t) ? t : `K_${t}`; };
/** Die Spalten, die in die Daten kommen. `grundname` ist meist der Name der Textspalte; `vorhandene` sind die FREMDEN Spalten (und Sets) - ihre Namen werden nie überschrieben, sondern mit einer Zahl ausgewichen. */
export function ergebnis(antworten: Antwort[], z: KatZustand, grundname: string, vorhandene: string[] = [], bezeichnung = '', zusatz = ''): KatErgebnis {
  const grund = grundname.slice(0, 52);
  const zs = zustaende(antworten, z);
  // Der Zusatz (zweite Kodierung) hält die Spaltenbezeichnungen verschieden: PSPP führt die Wertelabels in DISPLAY DICTIONARY unter der Bezeichnung, nicht unter dem Namen.
  const lab = (bezeichnung ? `${bezeichnung} - ${L('Kategorien', 'categories')}` : `${grundname} - ${L('Kategorien', 'categories')}`) + zusatz;
  if (!z.mehrfach) {
    const code = new Map(z.kategorien.map((k, i) => [k.id, i + 1]));
    const werte = antworten.map((a, i) => (zs[i] === 'zugeordnet' ? code.get(kategorienVon(z, a.schluessel)[0]!) ?? null : null));
    return { modus: 'eins', spalten: [{ name: freierName(`${grund}_kat`, vorhandene), kategorieId: null, label: lab, werte }], labels: z.kategorien.map((k, i) => ({ code: i + 1, label: k.name })), set: null };
  }
  // Ein gemeinsamer freier Stamm für das ganze Set (`gefehlt_kat`, sonst `gefehlt_kat2` …), die Nummern folgen der Kategorienliste: nie gemischt aus Stämmen (`kat12` neben `kat2`).
  const belegtGross = new Set(vorhandene.map(n => n.toUpperCase()));
  let stamm = `${grund}_kat`;
  for (let i = 2; z.kategorien.some((_, j) => belegtGross.has(`${stamm}${j + 1}`.toUpperCase())); i++) stamm = `${grund}_kat${i}`;
  const belegt = [...vorhandene, ...z.kategorien.map((_, j) => `${stamm}${j + 1}`)];
  const spalten = z.kategorien.map((k, j): KatSpalte => {
    const name = `${stamm}${j + 1}`;
    return { name, kategorieId: k.id, label: k.name + zusatz, werte: antworten.map((a, i) => (zs[i] === 'zugeordnet' ? (kategorienVon(z, a.schluessel).includes(k.id) ? 1 : 0) : null)) };
  });
  const set: KatSet | null = spalten.length >= 2 ? { name: freierName(setName(`${grund}_kat`), belegt), label: lab, spalten: spalten.map(s => s.name), zaehlwert: 1 } : null;
  return { modus: 'mehrfach', spalten, labels: [], set };
}

/** Zahlenliste für ANY(), in Zeilen von höchstens etwa 90 Zeichen (Fortsetzungszeilen sind eingerückt). */
function liste(nummern: number[]): string {
  const zeilen: string[] = []; let zeile = '';
  for (const n of nummern) {
    const teil = ',' + n;
    if (zeile.length + teil.length > 90) { zeilen.push(zeile); zeile = teil; } else zeile += teil;
  }
  zeilen.push(zeile);
  return zeilen.join('\n    ');
}
/**
 * PSPP-Syntax zum Übernehmen: je Spalte `COMPUTE name = $SYSMIS.` und danach `IF (ANY($CASENUM, …)) name = Wert.` (die Werte hängen an der Zeilennummer;
 * leer und offen bleiben fehlend), dann FORMATS, VARIABLE LABELS, VALUE LABELS, VARIABLE LEVEL … (NOMINAL) und EXECUTE. Hochkomma in Namen wird verdoppelt.
 * (RECODE nimmt $CASENUM in PSPP 2.1.1 nicht als Eingabe.) `loesche`: eigene Spalten aus einer früheren Übernahme, die vorher entfernt werden
 * (Zahl der Kategorien oder Modus haben sich geändert).
 */
export function uebernahmeBefehl(erg: KatErgebnis, optionen: { loesche?: string[] } = {}): string {
  const t: string[] = [];
  if (optionen.loesche?.length) t.push(`DELETE VARIABLES ${optionen.loesche.join(' ')}.`);
  for (const sp of erg.spalten) {
    const nach = new Map<number, number[]>();
    sp.werte.forEach((w, i) => { if (w !== null) (nach.get(w) ?? nach.set(w, []).get(w)!).push(i + 1); });
    t.push(`COMPUTE ${sp.name} = $SYSMIS.`);
    for (const [w, nr] of [...nach].sort((a, b) => a[0] - b[0])) t.push(`IF (ANY($CASENUM${liste(nr)})) ${sp.name} = ${w}.`);
  }
  const namen = erg.spalten.map(s => s.name);
  if (!namen.length) return 'EXECUTE.';
  t.push('EXECUTE.');
  t.push(`FORMATS ${namen.join(' ')} (F${erg.modus === 'eins' ? Math.max(1, String(erg.labels.length).length) : 1}.0).`);
  t.push(`VARIABLE LABELS ${erg.spalten.map(s => `${s.name} ${zit(s.label.slice(0, 250))}`).join('\n    ')}.`);
  if (erg.modus === 'eins') { if (erg.labels.length) t.push(`VALUE LABELS ${namen[0]} ${erg.labels.map(l => `${l.code} ${zit(l.label.slice(0, 120))}`).join(' ')}.`); }
  else t.push(`VALUE LABELS ${namen.join(' ')} 0 ${zit(L('nicht genannt', 'not mentioned'))} 1 ${zit(L('genannt', 'mentioned'))}.`);
  t.push(`VARIABLE LEVEL ${namen.join(' ')} (NOMINAL).`);
  t.push('EXECUTE.');
  return t.join('\n');
}
