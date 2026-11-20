/**
 * Dateien einlesen: CSV, Excel (.xlsx/.xls), OpenDocument (.ods) werden hier im Browser zu einer Tabelle
 * und dann als CSV + Syntax an die Engine gegeben. SPSS-Dateien (.sav) liest die Engine selbst, Stata-Dateien (.dta) liest ./stata.ts, SAS-Dateien (.sas7bdat, .xpt) liest ./sas.ts (erst beim Öffnen geladen).
 * Warum nicht in der C-Engine: PSPP 2.1.1 kann kein XLSX; ein eigener Leser in C müsste bei jeder
 * PSPP-Fassung nachgezogen werden (docs/PLAN-FERTIGBAU.md, Abschnitt 4).
 */

import { L } from './sitzung.svelte';
import { zitWert } from './befehlstext';
import { gueltigerName } from './skalabau';
import { profil } from '../i18n/profil';
import type { Projekt } from './ablage';
import { leseProjektdateiMitMeldungen, ProjektdateiFehler, type DateiMeldung } from './projektdatei';
import { istVerschluesselt } from './projektpasswort';
import { entschluesselMitDialog } from './projektpasswort-ui.svelte';
import { kleinste, groesste } from './menge';
import { zm } from './zeitmarke';
import { schaetzeText, schaetzeSav, urteil, groesseAusBytes, maxBytesTabelle, type Groesse } from './groessengrenze';

export type Zelle = string | number | Date | null;
export interface Tabelle {
  kopf: string[]; zeilen: Zelle[][]; quelle: string; /** Excel: Namen der übrigen Blätter mit Inhalt (Prüfung C5) */ weitere?: string[];
  /** Excel: Name des gelesenen Blatts; `gewaehlt`: die Person hat es bei mehreren Blättern gewählt (S-F2 D1) */ blatt?: string; gewaehlt?: boolean;
  /** Die Überschriften sind schon gültige Namen aus Statable selbst (Übungsdateien in der gewählten Sprache): bleiben wie sie sind, auch mit ä, é, Griechisch oder Kyrillisch. */ festeNamen?: boolean;
  /** CSV: das erkannte Trennzeichen (in einer Datei mit Komma als Trenner kann das Komma kein Dezimalzeichen sein, D2) */
  trenner?: string;
  /** CSV: Datenzeilen (Nummer wie in der Datentabelle) mit anderer Feldzahl als die Kopfzeile (D11) */
  abweichend?: { zeile: number; felder: number }[];
  /** Excel: Titelzeilen über der Tabelle, die übersprungen wurden (mit Zeilennummer im Blatt), und die Zeile der Kopfzeile (D9) */
  titel?: { zeilen: { zeile: number; text: string }[]; kopfzeile: number }
}
/** Was beim Einlesen gedeutet wurde und im Daten-Check steht (nicht gespeichert, nur nach dem Öffnen). */
export type Lesehinweis =
  | { art: 'lesart'; /** Überschrift in der Datei */ kopf: string; /** Name in der Engine */ spalte: string; beispiele: string[] }
  | { art: 'feldzahl'; erwartet: number; zeilen: { zeile: number; felder: number }[] }
  /** Titelzeile(n) über der Excel-Tabelle übersprungen (D9). */
  | { art: 'titel'; zeilen: { zeile: number; text: string }[]; kopfzeile: number }
  /** Spalte aus Zahlen mit Prozent- oder Währungszeichen (D10): als Text gelesen, bis die Person „Als Zahl lesen“ wählt. */
  | { art: 'beiwerk'; kopf: string; spalte: string; beispiele: string[]; zeichen: string[] };
export type Art = 'zahl' | 'text' | 'datum';
export interface Spaltenplan { name: string; bezeichnung: string; art: Art; breite: number; dezimalen: number; punkt?: boolean; /** Kennzeichen für fehlend in einer Zahlenspalte („k.A.“) und wie oft */ marker?: Record<string, number>; /** Werte wie 1.333 wurden als Dezimalzahlen gelesen, obwohl es auch Tausender sein könnten (D2) */ lesart?: { beispiele: string[] }; /** Die Überschrift kam schon vor: so hieß sie in der Datei (G6) */ umbenanntVon?: string; /** Nur Zahlen mit Zeichen wie % oder € (D10): als Text gelesen, mit Hinweis */ beiwerk?: { beispiele: string[]; zeichen: string[] }; /** Auf Wunsch (Daten-Check): das Zeichen weglassen und den Rest als Zahl lesen */ ohneBeiwerk?: boolean; /** Datumsspalte mit Uhrzeit (`datumzeit`: 2026-01-31 14:05:00) oder nur Uhrzeit (`uhrzeit`: Dauer seit Mitternacht, wie TIME in SPSS); ohne Angabe: nur das Datum (S-F2 D3) */ zeit?: 'datumzeit' | 'uhrzeit' }

export type Eingelesen =
  | { art: 'sav'; bytes: Uint8Array; name: string }
  | { art: 'stata'; bytes: Uint8Array; name: string }
  | { art: 'sas'; bytes: Uint8Array; name: string }
  | { art: 'tabelle'; tabelle: Tabelle; name: string }
  | { art: 'syntax'; text: string; name: string }
  | { art: 'projekt'; projekt: Projekt; name: string; /** Einträge der Projektdatei, die diese Fassung nicht kennt (übersprungen) */ meldungen?: DateiMeldung[]; /** aus einer Datei mit Passwort geöffnet: Speichern fragt wieder nach dem Passwort, Autospeichern schreibt nicht unverschlüsselt */ verschluesselt?: boolean };

/** Zeilenumbrüche in einer Zelle, Überschrift oder Beschriftung → ein Leerzeichen (PSPP trennt Fälle an jedem Umbruch, auch in Anführungszeichen; D1/D5). */
export const einzeilig = (s: string) => s.replace(/[ \t]*[\r\n\u2028\u2029\u0085]+[ \t]*/g, ' ');

/** Fallzahl aus der Ausgabe von `SHOW N.` (Tabelle „N | 5“); null, wenn nicht gefunden. */
export function liesFallzahl(items: import('../engine/types').OutputItem[]): number | null {
  for (const i of items) {
    if (i.type !== 'table') continue;
    const k = i.cells.find(c => c.r === 0 && c.c === 0), w = i.cells.find(c => c.r === 0 && c.c === 1);
    if (i.rows === 1 && i.cols === 2 && k?.t === 'N' && w && /^\d+$/.test(w.t)) return Number(w.t);
  }
  return null;
}

const endung = (n: string) => (/\.([a-z0-9]+)$/i.exec(n)?.[1] ?? '').toLowerCase();

/** Liest eine Datei, wie sie vom Datei-Dialog oder per Ziehen kommt. */
export async function leseDatei(datei: File): Promise<Eingelesen> {
  const e = endung(datei.name);
  await pruefeGroesseVorher(datei, e);
  if (e === 'sav' || e === 'zsav') return { art: 'sav', bytes: new Uint8Array(await datei.arrayBuffer()), name: datei.name };
  if (e === 'sas7bdat' || e === 'xpt') return { art: 'sas', bytes: new Uint8Array(await datei.arrayBuffer()), name: datei.name };
  if (e === 'dta') return { art: 'stata', bytes: new Uint8Array(await datei.arrayBuffer()), name: datei.name };
  if (e === 'statable') {
    let bytes: Uint8Array = new Uint8Array(await datei.arrayBuffer());
    const mitPasswort = istVerschluesselt(bytes);
    if (mitPasswort) {
      const klar = await entschluesselMitDialog(bytes, datei.name);
      if (!klar) throw new DateiFehler('abgebrochen', datei.name);   // Abbrechen oder Schlüssel-Datei: nichts wird geöffnet
      bytes = klar;
    }
    try { const r = leseProjektdateiMitMeldungen(bytes); return { art: 'projekt', projekt: r.projekt, name: datei.name, ...(r.meldungen.length ? { meldungen: r.meldungen } : {}), ...(mitPasswort ? { verschluesselt: true } : {}) }; }
    catch (f) { throw new DateiFehler(f instanceof ProjektdateiFehler && f.grund === 'neuer' ? 'neuer' : 'unlesbar', datei.name); }
  }
  if (e === 'sps' || e === 'syntax') return { art: 'syntax', text: dekodiere(new Uint8Array(await datei.arrayBuffer())), name: datei.name };
  if (e === 'csv' || e === 'txt' || e === 'tsv') {
    zm('lesen-0');
    const bytes = new Uint8Array(await datei.arrayBuffer());
    zm('lesen-1');
    if (istBinaer(bytes)) throw new DateiFehler('unlesbar', datei.name);   // D17: PNG, Programm … mit der Endung .csv
    const text = dekodiere(bytes); zm('dekodiert');
    const tabelle = leseCsv(text, datei.name); zm('zerlegt');
    return { art: 'tabelle', tabelle, name: datei.name };
  }
  if (e === 'xlsx' || e === 'xlsm' || e === 'xls' || e === 'ods') return { art: 'tabelle', tabelle: await leseTabellenkalkulation(await datei.arrayBuffer(), datei.name), name: datei.name };
  throw new DateiFehler('format', datei.name);
}

/** Vor dem Einlesen (Abschlusstest A1): ist die Datei so groß, dass der Tab abstürzen würde? Dann `DateiFehler('gross')` mit der geschätzten Größe - der Rest der Datei wird gar nicht erst gelesen. */
export async function pruefeGroesseVorher(datei: File, endung: string): Promise<void> {
  let g: Groesse | null = null;
  if (endung === 'csv' || endung === 'txt' || endung === 'tsv') {
    const kopf = new Uint8Array(await datei.slice(0, 65536).arrayBuffer()), zwei = (kopf[0] === 0xff && kopf[1] === 0xfe) || (kopf[0] === 0xfe && kopf[1] === 0xff) || !!utf16OhneBom(kopf);
    g = schaetzeText(zwei ? dekodiere(kopf) : new TextDecoder('utf-8').decode(kopf), zwei ? datei.size / 2 : datei.size);   // UTF-16: zwei Bytes je Zeichen
  }
  else if (endung === 'sav' || endung === 'zsav') g = schaetzeSav(new Uint8Array(await datei.slice(0, 128).arrayBuffer()));
  else if (endung === 'xlsx' || endung === 'xlsm' || endung === 'xls' || endung === 'ods') { if (datei.size > maxBytesTabelle) g = groesseAusBytes(datei.size); }
  if (g && urteil(g) === 'zugross') throw new DateiFehler('gross', datei.name, JSON.stringify({ g, bytes: datei.size }));
}
/** Nach dem Einlesen, wenn Zeilen und Spalten feststehen: zu groß? */
export function pruefeGroesseNachher(zeilen: number, spalten: number, name: string, bytes = 0): void {
  const g = { zeilen, spalten, zellen: zeilen * spalten, geschaetzt: false };
  if (urteil(g) === 'zugross') throw new DateiFehler('gross', name, JSON.stringify({ g, bytes }));
}

export class DateiFehler extends Error {
  grund: 'format' | 'leer' | 'unlesbar' | 'neuer' | 'stata' | 'gross' | 'abgebrochen'; datei: string; details: string;
  /** details: bei „stata“ die Fassung, die nicht unterstützt wird (Formatnummer). */
  constructor(grund: 'format' | 'leer' | 'unlesbar' | 'neuer' | 'stata' | 'gross' | 'abgebrochen', datei: string, details = '') { super(`${grund}: ${datei}`); this.grund = grund; this.datei = datei; this.details = details; }
}

/** UTF-16 ohne BOM (D6): Bei Text mit lateinischen Buchstaben ist jedes zweite Byte 0 - bei LE das zweite („a“ = 61 00), bei BE das erste („a“ = 00 61).
 *  Gilt erst, wenn in den ersten 4 KB mindestens 6 von 10 Zeichen so aussehen und das andere Byte fast nie 0 ist; eine Binärdatei (PNG, Programm) hat Nullen an beiden Stellen
 *  und fällt durch, ebenso Text, der nach dem Lesen Steuerzeichen enthielte. */
export function utf16OhneBom(b: Uint8Array): 'utf-16le' | 'utf-16be' | null {
  const n = Math.min(b.length, 4096) & ~1;
  if (n < 4) return null;
  let nullGerade = 0, nullUngerade = 0;
  for (let i = 0; i < n; i += 2) { if (b[i] === 0) nullGerade++; if (b[i + 1] === 0) nullUngerade++; }
  const paare = n / 2, art = nullUngerade >= paare * 0.6 && nullGerade <= paare * 0.02 ? 'utf-16le' : nullGerade >= paare * 0.6 && nullUngerade <= paare * 0.02 ? 'utf-16be' : null;
  if (!art) return null;
  const text = new TextDecoder(art).decode(b.subarray(0, n));
  let steuer = 0; for (const c of text) { const k = c.charCodeAt(0); if (k < 32 && k !== 9 && k !== 10 && k !== 12 && k !== 13) steuer++; }
  return steuer < 2 ? art : null;
}

/** Null- oder Steuerbytes in den ersten 64 KB: keine Textdatei (D17). UTF-16 (mit BOM oder erkennbar ohne) ist Text. */
export function istBinaer(b: Uint8Array): boolean {
  if (b.length >= 2 && ((b[0] === 0xff && b[1] === 0xfe) || (b[0] === 0xfe && b[1] === 0xff))) return false;
  if (utf16OhneBom(b)) return false;
  const n = Math.min(b.length, 65536);
  let steuer = 0;
  for (let i = 0; i < n; i++) {
    const c = b[i]!;
    if (c === 0) return true;
    if (c < 32 && c !== 9 && c !== 10 && c !== 12 && c !== 13 && !(c === 0x1a && i === b.length - 1)) steuer++;   // 0x1A am Ende: Dateiende-Zeichen alter DOS-Dateien
  }
  return steuer >= 2;
}

/** UTF-16 (mit BOM oder erkannt ohne BOM, D6), UTF-8, sonst Windows-1252 (alte Excel-CSV und SPSS-Syntax aus Moodle). */
export function dekodiere(b: Uint8Array): string {
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2));
  if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2));
  const u16 = utf16OhneBom(b);   // vor UTF-8: Nullbytes sind auch gültiges UTF-8
  if (u16) return new TextDecoder(u16).decode(b.length % 2 ? b.subarray(0, b.length - 1) : b);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/^﻿/, ''); }
  catch { return new TextDecoder('windows-1252').decode(b); }
}

/** Die erste Zeile (bis zum ersten Zeilenende außerhalb von Anführungszeichen); eine Überschrift mit Umbruch darin zählt ganz. */
function ersteZeile(text: string): string {
  let inAnf = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"') inAnf = !inAnf;
    else if (!inAnf && (c === '\n' || c === '\r')) return text.slice(0, i);
  }
  return text;
}

/** CSV mit erkanntem Trennzeichen (; , Tab |) und Dezimalkomma. Zeilenende: \n, \r\n oder nur \r. */
export function leseCsv(text: string, quelle = L('Tabelle', 'Table')): Tabelle {
  const erste = ersteZeile(text);
  const aussen = (tz: string) => { let n = 1, q = false; for (const c of erste) { if (c === '"') q = !q; else if (!q && c === tz) n++; } return n; };
  const trenner = [';', '\t', ',', '|'].map(t => [t, aussen(t)] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const roh: string[][] = [];
  let zeile: string[] = [], feld = '', inAnf = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inAnf) { if (c === '"') { if (text[i + 1] === '"') { feld += '"'; i++; } else inAnf = false; } else feld += c; continue; }
    if (c === '"') inAnf = true;
    else if (c === trenner) { zeile.push(feld); feld = ''; }
    else if (c === '\n' || (c === '\r' && text[i + 1] !== '\n')) { zeile.push(feld); roh.push(zeile); zeile = []; feld = ''; }
    else if (c !== '\r') feld += c;
  }
  if (feld || zeile.length) { zeile.push(feld); roh.push(zeile); }
  const nichtLeer = roh.filter(z => z.some(f => f.trim() !== ''));
  if (!nichtLeer.length) throw new DateiFehler('leer', quelle);
  let [kopf, ...rest] = nichtLeer as [string[], ...string[][]];
  // D21: Schluss-Trennzeichen (id;punkte;;) - Spalten ohne Überschrift, in denen nirgends etwas steht, sind keine Spalten.
  let breite = kopf.length;
  while (breite > 1 && kopf[breite - 1]!.trim() === '' && rest.every(z => (z[breite - 1] ?? '').trim() === '')) breite--;
  if (breite < kopf.length) {
    kopf = kopf.slice(0, breite);
    rest = rest.map(z => (z.length > breite && z.slice(breite).every(f => f.trim() === '') ? z.slice(0, breite) : z));
  }
  const abweichend = rest.flatMap((z, i) => (z.length !== kopf.length ? [{ zeile: i + 1, felder: z.length }] : []));
  return {
    kopf: kopf.map(k => einzeilig(k).trim()), zeilen: rest.map(z => z.map(f => (f.trim() === '' ? null : f.trim()))), quelle, trenner,
    ...(abweichend.length ? { abweichend } : {})
  };
}

/** Ein Blatt mit Inhalt in einer Arbeitsmappe: Name und Zahl der Datenzeilen (ohne Kopfzeile). */
export interface BlattInfo { name: string; zeilen: number }
/** Fragt die Person, welches Blatt gelesen wird (Dialog in der Oberfläche). Antwort: der Name oder null = abgebrochen. */
export type BlattFrager = (datei: string, blaetter: BlattInfo[]) => Promise<string | null>;
let blattFrager: BlattFrager | null = null;
/** Die Oberfläche meldet hier ihren Dialog an; ohne Frager (Tests, andere Wege) gilt das erste Blatt mit Inhalt. */
export const setzeBlattFrager = (f: BlattFrager | null) => { blattFrager = f; };

/** Excel und OpenDocument über SheetJS (0.20.3, nur bei Bedarf geladen). Hat die Mappe mehrere Blätter mit Inhalt, fragt `blattFrager` (S-F2 D1); `blatt` nennt das Blatt gleich. */
export async function leseTabellenkalkulation(buf: ArrayBuffer, quelle: string, blatt?: string): Promise<Tabelle> {
  const XLSX = await import('xlsx');
  let mappe;
  try { mappe = XLSX.read(buf, { type: 'array', cellDates: true, dense: true }); } catch { throw new DateiFehler('unlesbar', quelle); }
  // Nicht leere Zeilen mit ihrer Zeilennummer im Blatt (für den Hinweis auf übersprungene Titelzeilen, D9).
  const inhaltNr = (name: string) => {
    const blatt = mappe.Sheets[name]!, ref = (blatt as { '!ref'?: string })['!ref'], z0 = ref ? XLSX.utils.decode_range(ref).s.r : 0;
    return XLSX.utils.sheet_to_json<Zelle[]>(blatt, { header: 1, raw: true, defval: null, blankrows: true }).map((z, i) => ({ z, nr: z0 + i + 1 })).filter(x => x.z.some(v => v !== null && v !== ''));
  };
  const gefuellt = (z: Zelle[]) => z.filter(v => v !== null && v !== '' && !(typeof v === 'string' && v.trim() === '')).length;
  const mitInhalt = mappe.SheetNames.map(name => ({ name, alle: inhaltNr(name) })).filter(x => x.alle.length > 0);
  if (!mitInhalt.length) throw new DateiFehler('leer', quelle);
  let gewaehlt = false, wahl = mitInhalt[0]!;
  if (blatt !== undefined) {
    const t = mitInhalt.find(x => x.name === blatt);
    if (!t) throw new DateiFehler('unlesbar', quelle);
    wahl = t; gewaehlt = mitInhalt.length > 1;
  } else if (mitInhalt.length > 1 && blattFrager) {
    const antwort = await blattFrager(quelle, mitInhalt.map(x => ({ name: x.name, zeilen: Math.max(0, x.alle.length - 1) })));
    if (antwort === null) throw new DateiFehler('abgebrochen', quelle);
    const t = mitInhalt.find(x => x.name === antwort);
    if (!t) throw new DateiFehler('unlesbar', quelle);
    wahl = t; gewaehlt = true;
  }
  const { name, alle } = wahl;
  const weitere = mitInhalt.filter(x => x.name !== name).map(x => x.name);
  // D9: Eine Titelzeile über der Tabelle (nur eine gefüllte Zelle, auch verbunden über alle Spalten) ist kein Kopf: überspringen, solange die nächste Zeile mehrere Felder hat.
  const einziger = (z: Zelle[]) => z.find(v => v !== null && v !== '' && !(typeof v === 'string' && v.trim() === ''));
  let k = 0;
  while (k < 4 && k + 1 < alle.length && gefuellt(alle[k]!.z) === 1 && typeof einziger(alle[k]!.z) === 'string') k++;
  if (k > 0 && gefuellt(alle[k]!.z) < 2) k = 0;   // dahinter keine Tabelle mit mehreren Feldern: dann war es keine Titelzeile (z. B. eine Tabelle mit nur einer Spalte)
  const titel = alle.slice(0, k).map(x => ({ zeile: x.nr, text: einzeilig(String(einziger(x.z))).trim() }));
  const [kopf, ...rest] = alle.slice(k).map(x => x.z) as [Zelle[], ...Zelle[][]];
  const breite = Math.max(kopf.length, groesste(rest.map(r => r.length)));
  return {
    kopf: Array.from({ length: breite }, (_, i) => einzeilig(String(kopf[i] ?? '')).trim()),
    zeilen: rest.map(r => Array.from({ length: breite }, (_, i) => { const v = r[i] ?? null; return typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v; })),
    quelle: `${quelle} ${L(`(Blatt „${name}“)`, `(sheet "${name}")`)}`,
    blatt: name,
    ...(gewaehlt ? { gewaehlt: true } : {}),
    ...(weitere.length ? { weitere } : {}),
    ...(titel.length ? { titel: { zeilen: titel, kopfzeile: alle[k]!.nr } } : {})
  };
}

/** "3,5" und "3.5" sind Zahlen; "1.234,5" auch. Text bleibt Text.
 *  punkt: Die Spalte schreibt Dezimalen mit Punkt (dann ist "2.875" 2,875 und nicht 2875). */
export function alsZahl(v: Zelle, punkt = false): number | null {
  if (v === null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v instanceof Date) return null;
  let s = v.replace(/\s/g, '').replace(/\u2212/g, '-');   // U+2212 ist das echte Minuszeichen (Word, Excel-Export) - D10
  // Klammer-Negative aus der Buchhaltung: (9,78) = −9,78. Nur Klammer um eine Zahl ohne Vorzeichen.
  const klammer = /^\(([^()]+)\)$/.exec(s);
  if (klammer) { const r = /^[-+]/.test(klammer[1]!) ? null : alsZahl(klammer[1]!, punkt); return r === null ? null : -r; }
  if (/^[-+]?\d{1,3}(['’]\d{3})+([.,]\d+)?$/.test(s)) s = s.replace(/['’]/g, '');   // Schweizer Tausendertrenner: 1'000.5
  if (!punkt && /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s) ? Number(s) : null;
}

/** Zeichen, die an einer Zahl hängen können, ohne dass der Wert ein anderer wird: Prozent- und Währungszeichen (D10). */
const BEIWERK = /[%€$£¥]|(?<![A-Za-zÄÖÜäöüß])(?:EUR|USD|CHF|GBP|Euro|Fr\.)(?![A-Za-zÄÖÜäöüß])/gi;
/** Die Zelle ohne Prozent- und Währungszeichen: „45 %“ → „45“ (nicht 0,45), „€ 12,50“ → „12,50“. */
export const ohneBeiwerk = (v: Zelle): Zelle => (typeof v === 'string' ? v.replace(BEIWERK, '').trim() : v);

/** Gültiger, eindeutiger PSPP-Name aus einer Spaltenüberschrift (Buchstabe zuerst, nur Buchstaben/Ziffern/_). */
export function psppName(kopf: string, vergeben: Set<string>, nr: number): string {
  // Andere Akzente fallen weg statt den Buchstaben zu verlieren: „âge“ → age, „érték“ → ertek (vorher „ge“, „rt_k“).
  let n = kopf.normalize('NFC').replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  // Überschrift nur in anderer Schrift (Griechisch, Kyrillisch …): der Name behält ihre Buchstaben, statt „spalte1“ zu werden.
  if (!n) { const u = kopf.normalize('NFC').replace(/[^\p{L}\p{N}_]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 30); if (u && gueltigerName(u)) n = u; }
  if (!n) n = `spalte${nr}`;
  if (!/^\p{L}/u.test(n)) n = 'v' + n;
  if (/^(ALL|AND|BY|EQ|GE|GT|LE|LT|NE|NOT|OR|TO|WITH)$/i.test(n)) n += '_';
  let k = n, i = 2;
  while (vergeben.has(k.toLowerCase())) k = `${n}_${i++}`;
  vergeben.add(k.toLowerCase());
  return k;
}

/** Ein Name, den Statable selbst vergibt (Übungsdateien, „Listen vergleichen“): bleibt mit allen Buchstaben jeder Schrift, wenn er gültig und frei ist; sonst wie eine Überschrift aus einer Datei. */
export function festerName(wunsch: string, vergeben: Set<string>, nr: number): string {
  if (!gueltigerName(wunsch) || vergeben.has(wunsch.toLowerCase())) return psppName(wunsch, vergeben, nr);
  vergeben.add(wunsch.toLowerCase());
  return wunsch;
}

/** Übliche Kennzeichen für „keine Angabe“ in Zahlenspalten (Excel, R, SPSS-Export, Fragebögen). Prüfung A12/C4. */
const MARKER = /^(k\.?\s?a\.?|keine\s+angabe|n\.?\s?a\.?|n\/a|na|nan|null|none|missing|fehlt|#nv|#n\/a|-|–|\.|\?|\*)$/i;
export const istMarker = (v: Zelle) => typeof v === 'string' && MARKER.test(v.trim());

/**
 * Ein Datum, wie es in der gewählten Sprache getippt wird (Reihenfolge und Trenner aus profil().datum: 31.12.2026, 12/31/2026, 2026.12.31.).
 * Gibt nur die Teile zurück (ungeprüft: ob es den Tag gibt, prüft der Aufrufer). Tag und Monat ein- oder zweistellig, Jahr vierstellig oder (wenn erlaubt) zweistellig.
 */
export function profilDatum(text: string, jahrZwei = false): { tag: number; mon: number; jahr: number } | null {
  const { folge, trenner } = profil().datum;
  const tr = trenner.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
  const m = new RegExp(`^(\\d{1,4})${tr}\\s*(\\d{1,2})${tr}\\s*(\\d{1,4})\\.?$`).exec(text.trim());
  if (!m) return null;
  const [a, b, c] = [m[1]!, m[2]!, m[3]!];
  const [t, mo, j] = folge === 'TMJ' ? [a, b, c] : folge === 'MTJ' ? [b, a, c] : [c, b, a];
  if (t.length > 2 || mo.length > 2 || !(j.length === 4 || (jahrZwei && j.length === 2))) return null;
  return { tag: Number(t), mon: Number(mo), jahr: j.length === 2 ? 2000 + Number(j) : Number(j) };
}

/** Ein Zeitpunkt aus einer Zelle: Kalendertag (wie er dasteht, ohne Zeitzone) und, wenn die Zelle eine Uhrzeit nennt, Sekunden seit Mitternacht. */
export interface Zeitpunkt { y: number; m: number; d: number; sek: number | null }

/** Uhrzeit als Sekunden seit Mitternacht; null, wenn Stunde, Minute oder Sekunde nicht möglich sind. Mit AM/PM zählt die 12-Stunden-Uhr. */
function uhrSekunden(h: string, mi: string, se: string | undefined, ap: string | undefined): number | null {
  let hh = Number(h);
  const mm = Number(mi), ss = Number(se ?? 0);
  if (ap) { if (hh < 1 || hh > 12) return null; hh = (hh % 12) + (/pm/i.test(ap) ? 12 : 0); }
  return hh > 23 || mm > 59 || ss > 59 ? null : hh * 3600 + mm * 60 + ss;
}
const UHRZEIT = '(\\d{1,2}):(\\d{2})(?::(\\d{2})(?:[.,]\\d+)?)?(?:\\s*(AM|PM)|\\s*Uhr)?';
const UHRZEIT_GANZ = new RegExp(`^${UHRZEIT}$`, 'i');
const gueltigerTag = (y: number, m: number, d: number) => { const t = new Date(y, m - 1, d); return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d; };
/** Excel schreibt eine Uhrzeit ohne Datum als Datum am 30.12.1899 (Jahr unter 1900). */
const nurUhrzeitDatum = (d: Date) => d.getFullYear() < 1900;
/** Wanduhr-Sekunden eines Date (lokale Teile, keine Zeitzonen-Verschiebung), auf die Sekunde gerundet: Excel liefert 14:30 als 14:29:59,999. */
function wandUhr(d: Date): Date { return new Date(Math.round(d.getTime() / 1000) * 1000); }

/** Uhrzeit allein („14:30“, „14:30:15“, „2:30 PM“, „14:30 Uhr“; bei Excel ein Datum am 30.12.1899) als Sekunden seit Mitternacht - wie SPSS TIME eine Dauer. Sonst null. */
export function liesUhrzeit(v: Zelle): number | null {
  if (v instanceof Date) { if (Number.isNaN(v.getTime()) || !nurUhrzeitDatum(v)) return null; const w = wandUhr(v); return w.getHours() * 3600 + w.getMinutes() * 60 + w.getSeconds(); }
  if (typeof v !== 'string') return null;
  const m = UHRZEIT_GANZ.exec(v.trim());
  return m ? uhrSekunden(m[1]!, m[2]!, m[3], m[4]) : null;
}

/**
 * Datum, mit oder ohne Uhrzeit, aus einer Zelle: Excel-Datum („Date“), „2026-01-31“, „2026-01-31 14:05“, „2026-01-31T14:05:30“ (ein Zeitzonen-Anhang wird nicht verrechnet), „31.1.2026 14:05“,
 * und die Schreibweise der Sprache (Reihenfolge und Trenner aus profil().datum, mit „14:05“ oder „2:05 PM“). Die Uhrzeit bleibt, wie sie dasteht; es wird nie in eine Zeitzone umgerechnet.
 */
export function liesZeitpunkt(v: Zelle): Zeitpunkt | null {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime()) || nurUhrzeitDatum(v)) return null;
    const w = wandUhr(v), sek = w.getHours() * 3600 + w.getMinutes() * 60 + w.getSeconds();
    return { y: w.getFullYear(), m: w.getMonth() + 1, d: w.getDate(), sek: sek === 0 ? null : sek };
  }
  if (typeof v !== 'string') return null;
  const t = v.trim();
  // Monatsangabe „1949-01“ oder „1949/01“ gilt als Erster des Monats (Fachblatt PROGNOSE-ARIMA, Abschnitt 5); „2024-13“ und „1949-1x“ sind kein Datum
  const monat = /^(\d{4})[-/](0[1-9]|1[0-2])$/.exec(t);
  if (monat) return { y: +monat[1]!, m: +monat[2]!, d: 1, sek: null };
  let datum: [number, number, number] | null = null, sek: number | null = null;
  const iso = new RegExp(`^(\\d{4})-(\\d{2})-(\\d{2})(?:[ T]${UHRZEIT.replace('(?:\\s*(AM|PM)|\\s*Uhr)?', '')}(?:Z|[+-]\\d{2}:?\\d{2})?)?$`).exec(t);
  if (iso) {
    datum = [+iso[1]!, +iso[2]!, +iso[3]!];
    if (iso[4] !== undefined) { sek = uhrSekunden(iso[4], iso[5]!, iso[6], undefined); if (sek === null) return null; }
  } else {
    // Datum und (nach Leerzeichen, Komma oder T) eine Uhrzeit trennen; das Datum ist TT.MM.JJJJ oder die Schreibweise der Sprache.
    const m = new RegExp(`^(.*?)(?:[\\s,]+${UHRZEIT})?$`, 'i').exec(t);
    if (!m) return null;
    if (m[2] !== undefined) { sek = uhrSekunden(m[2], m[3]!, m[4], m[5]); if (sek === null) return null; }
    const kopf = m[1]!.trim();
    const punkt = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(kopf);   // TT.MM.JJJJ gilt in jeder Sprache
    const p = punkt ? null : profilDatum(kopf);
    datum = punkt ? [+punkt[3]!, +punkt[2]!, +punkt[1]!] : p ? [p.jahr, p.mon, p.tag] : null;
  }
  if (!datum || !gueltigerTag(...datum)) return null;
  return { y: datum[0], m: datum[1], d: datum[2], sek };
}

/** Datum als Text („2026-01-31“, „2026-01-31 14:05“, „31.1.2026“, dazu die Schreibweise der Sprache) - so schreiben Fragebogen-Tools Daten in CSV. Die Uhrzeit liefert `liesZeitpunkt`. */
export function textAlsDatum(v: Zelle): Date | null {
  if (v instanceof Date) return v;
  const z = liesZeitpunkt(v);
  return z ? new Date(z.y, z.m - 1, z.d) : null;
}

/** Plant Name, Art und Format je Spalte. */
/** `tausender`: Überschriften von Spalten, deren Werte wie 1.333 als Tausender gelesen werden sollen (Knopf im Daten-Check, D2). */
export function planeSpalten(t: Tabelle, tausender: string[] = [], alsZahlLesen: string[] = []): Spaltenplan[] {
  const vergeben = new Set<string>(), bezeichnungen = new Set<string>();
  return t.kopf.map((k, i) => {
    const werte = t.zeilen.map(z => z[i] ?? null).filter(v => v !== null);
    const name = t.festeNamen ? festerName(k, vergeben, i + 1) : psppName(k, vergeben, i + 1);
    let bezeichnung = k && k !== name ? k : '', umbenanntVon: string | undefined;
    // G6: Zwei Spalten mit gleicher Überschrift hießen überall gleich („Bei x lag der Wert höher als bei x“). Die spätere bekommt „(2)“, „(3)“ …
    const anzeige = bezeichnung || name;
    if (bezeichnungen.has(anzeige.toLowerCase())) {
      let n = 2; while (bezeichnungen.has(`${anzeige} (${n})`.toLowerCase())) n++;
      bezeichnung = `${anzeige} (${n})`; umbenanntVon = anzeige;
    }
    bezeichnungen.add((bezeichnung || name).toLowerCase());
    // S-F2 D3: Uhrzeit allein („14:30“) ist eine Dauer seit Mitternacht (wie SPSS TIME); Datum mit Uhrzeit behält die Uhrzeit.
    if (werte.length && werte.every(v => liesUhrzeit(v) !== null)) return { name, bezeichnung, art: 'datum', breite: 8, dezimalen: 0, zeit: 'uhrzeit', ...(umbenanntVon ? { umbenanntVon } : {}) };
    if (werte.length && werte.every(v => v instanceof Date || textAlsDatum(v) !== null)) {
      const mitZeit = werte.some(v => liesZeitpunkt(v)?.sek != null);
      return { name, bezeichnung, art: 'datum', breite: mitZeit ? 19 : 10, dezimalen: 0, ...(mitZeit ? { zeit: 'datumzeit' as const } : {}), ...(umbenanntVon ? { umbenanntVon } : {}) };
    }
    // Prüfrunde 07.10.: Hat ein Wert der Spalte einen Punkt, der kein Tausender sein kann („2.62“), und keiner ein Komma,
    // dann ist der Punkt in der ganzen Spalte ein Dezimalpunkt - sonst wurde „2.875“ zu 2875 (mtcars).
    const texte = werte.filter((v): v is string => typeof v === 'string');
    const ohneKomma = !texte.some(v => v.includes(','));
    const erzwungen = tausender.includes(k);
    // D2: In einer Datei mit Komma als Trenner kann das Komma kein Dezimalzeichen sein - der Punkt ist es.
    let punkt = !erzwungen && ohneKomma && (t.trenner === ',' || texte.some(v => /^[-+]?\d*\.\d+$/.test(v.trim()) && !/^-?\d{1,3}(\.\d{3})+$/.test(v.trim())));
    // D2: Sonst bleibt „1.333“ mehrdeutig. Stehen in der ganzen Spalte nur Werte unter 10 (1.333, 2.667, 3), sind es Dezimalzahlen
    // (Skalenmittel aus drei Fragen) - gelesen so, aber mit Hinweis im Daten-Check. Mehrstellige Werte (12.500) bleiben Tausender.
    let lesart: Spaltenplan['lesart'];
    if (!punkt && !erzwungen && ohneKomma) {
      const dreistellig = texte.filter(v => /^-?\d\.\d{3}$/.test(v.trim()));
      const alleKlein = werte.filter(v => !istMarker(v)).every(v => (typeof v === 'number' ? Math.abs(v) < 10 : typeof v === 'string' && /^-?\d(\.\d{3})?$/.test(v.trim())));
      if (dreistellig.length && alleKlein) { punkt = true; lesart = { beispiele: [...new Set(dreistellig.map(v => v.trim()))].slice(0, 3) }; }
    }
    // Kennzeichen wie „k.A.“ machen eine Zahlenspalte nicht zu Text - sie werden fehlend, und Statable sagt es nach dem Einlesen.
    const ohneMarker = werte.filter(v => !istMarker(v));
    const weg = alsZahlLesen.includes(k);   // D10: auf Wunsch ohne Prozent- und Währungszeichen
    const zahlen = ohneMarker.map(v => alsZahl(weg ? ohneBeiwerk(v) : v, punkt));
    if (ohneMarker.length && zahlen.every(z => z !== null)) {
      const dez = Math.min(6, Math.max(0, groesste(zahlen.map(z => { const s = String(z); return s.includes('.') && !s.includes('e') ? s.split('.')[1]!.length : 0; }))));
      const marker: Record<string, number> = {};
      for (const v of werte) if (istMarker(v)) marker[String(v).trim()] = (marker[String(v).trim()] ?? 0) + 1;
      return { name, bezeichnung, art: 'zahl', breite: 12, dezimalen: dez, punkt, ...(weg ? { ohneBeiwerk: true } : {}), ...(Object.keys(marker).length ? { marker } : {}), ...(lesart ? { lesart } : {}), ...(umbenanntVon ? { umbenanntVon } : {}) };
    }
    // D10: Besteht die Spalte (bis auf Kennzeichen wie „k.A.“) nur aus Zahlen, an denen Prozent- oder Währungszeichen hängen, bleibt sie Text - mit Hinweis im Daten-Check.
    const mit = ohneMarker.filter((v): v is string => typeof v === 'string' && ohneBeiwerk(v) !== v);
    const beiwerk = mit.length && ohneMarker.every(v => alsZahl(ohneBeiwerk(v), punkt) !== null)
      ? { beispiele: [...new Set(mit.map(v => v.trim()))].slice(0, 3), zeichen: [...new Set(mit.flatMap(v => (v.match(BEIWERK) ?? []).map(z => (/^[a-z]/i.test(z) ? z.toUpperCase() : z))))] }
      : undefined;
    const bytes = Math.max(1, groesste(werte.map(v => new TextEncoder().encode(String(v)).length)));
    return { name, bezeichnung, art: 'text', breite: Math.min(32767, bytes), dezimalen: 0, ...(beiwerk ? { beiwerk } : {}), ...(umbenanntVon ? { umbenanntVon } : {}) };
  });
}

const csvFeld = (s: string) => { const e = einzeilig(s); return /[",]/.test(e) ? `"${e.replace(/"/g, '""')}"` : e; };
/** Sekunden seit Mitternacht als hh:mm:ss. */
const uhrText = (k: number) => [Math.floor(k / 3600), Math.floor(k / 60) % 60, k % 60].map(x => String(x).padStart(2, '0')).join(':');
const iso = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

/** Erzeugt die Datei für die Engine und die Syntax zum Einlesen. */
/** Die CSV für die Engine in Häppchen: So gibt es nie alle Zeilen auf einmal als Text und daneben noch als ganzen Text und als Bytes (1 Mio. × 20: drei Kopien zu je rund 120 MB). `leeren`: Jede fertige Zeile wird gleich frei, die Quelle ist danach unbrauchbar. */
export function csvBytes<Z>(kopf: string, zeilen: Z[], zeile: (z: Z) => string, je = 50000, leeren = false): Uint8Array {
  const enc = new TextEncoder(), teile: Uint8Array[] = [enc.encode(kopf + '\n')];
  let summe = teile[0]!.length;
  for (let a = 0; a < zeilen.length; a += je) {
    let text = '';
    for (let i = a, b = Math.min(a + je, zeilen.length); i < b; i++) { text += zeile(zeilen[i]!) + '\n'; if (leeren) zeilen[i] = undefined as Z; }
    const b = enc.encode(text); teile.push(b); summe += b.length;
  }
  const alles = new Uint8Array(summe);
  let pos = 0;
  for (let i = 0; i < teile.length; i++) { alles.set(teile[i]!, pos); pos += teile[i]!.length; teile[i] = new Uint8Array(0); }
  return alles;
}

export function zurEngine(t: Tabelle, plan = planeSpalten(t), leeren = false): { syntax: string; csv: Uint8Array; plan: Spaltenplan[] } {
  const zeile = (z: Tabelle['zeilen'][number]) => plan.map((p, i) => {
    const v = z[i] ?? null;
    if (v === null) return '';
    if (p.art === 'zahl') { const z = alsZahl(p.ohneBeiwerk ? ohneBeiwerk(v) : v, p.punkt); return z === null ? '' : String(z); }
    if (p.art === 'datum') {
      if (p.zeit === 'uhrzeit') { const k = liesUhrzeit(v); return k === null ? '' : uhrText(k); }
      if (p.zeit === 'datumzeit') { const z = liesZeitpunkt(v); return z ? `${String(z.y).padStart(4, '0')}-${String(z.m).padStart(2, '0')}-${String(z.d).padStart(2, '0')} ${uhrText(z.sek ?? 0)}` : ''; }
      const d = textAlsDatum(v); return d ? iso(d) : '';
    }
    return csvFeld(v instanceof Date ? iso(v) : String(v));
  }).join(',');
  const csv = csvBytes(plan.map(p => p.name).join(','), t.zeilen, zeile, undefined, leeren);
  const fmt = (p: Spaltenplan) => p.art === 'zahl' ? `F${Math.min(40, Math.max(8, p.breite))}.${p.dezimalen}` : p.art === 'datum' ? (p.zeit === 'uhrzeit' ? 'TIME8.0' : p.zeit === 'datumzeit' ? 'YMDHMS20.0' : 'EDATE10') : `A${p.breite}`;
  const zit = (s: string) => zitWert(einzeilig(s));
  const syntax = [
    `GET DATA /TYPE=TXT /FILE='/import.csv' /ENCODING='UTF-8' /ARRANGEMENT=DELIMITED /DELCASE=LINE /FIRSTCASE=2 /DELIMITERS=',' /QUALIFIER='"'`,
    `  /VARIABLES=${plan.map(p => `${p.name} ${fmt(p)}`).join(' ')}.`,
    ...plan.filter(p => p.bezeichnung).map(p => `VARIABLE LABELS ${p.name} ${zit(p.bezeichnung.slice(0, 250))}.`),
    plan.some(p => p.art === 'zahl') ? `VARIABLE LEVEL ${plan.filter(p => p.art === 'zahl').map(p => p.name).join(' ')} (SCALE).` : '',
    plan.some(p => p.art === 'text') ? `VARIABLE LEVEL ${plan.filter(p => p.art === 'text').map(p => p.name).join(' ')} (NOMINAL).` : '',
    // Leere Textzellen sind fehlend, keine eigene Kategorie (Prüfung A1).
    ...plan.filter(p => p.art === 'text').map(p => `MISSING VALUES ${p.name} ('').`),
    'EXECUTE.'
  ].filter(Boolean).join('\n');
  return { syntax, csv, plan };
}
