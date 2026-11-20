/**
 * SAS-Dateien lesen: .sas7bdat (Datensatz-Datei von SAS) und .xpt (Transportdatei Fassung 5) - eigener Leser,
 * reines TypeScript, ohne Abhängigkeit. Die Daten gehen als Spalten + Zeilen an die Engine, wie bei Stata (./stata.ts).
 *
 * Herkunft: portiert aus pandas (pandas/io/sas/sas7bdat.py, sas.pyx, sas_constants.py, sas_xport.py; Stand 24.10.2026),
 * die ihrerseits auf Jared Hobbs' `sas7bdat` (sas7bdat.py), R `sas7bdat` (Matt Shotwell) und `xport` (Jack Cushman) beruhen.
 * pandas steht unter der BSD-3-Lizenz: Copyright (c) 2008-2011, AQR Capital Management, LLC, Lambda Foundry, Inc. and PyData
 * Development Team; Copyright (c) 2011-2026, Open source contributors. Der Lizenztext liegt in
 * docs/fremdquellen/pandas-sas/LICENSE. Die Quelltexte liegen daneben (docs/fremdquellen/pandas-sas/).
 *
 * Was gelesen wird:
 *   .sas7bdat  32 und 64 Bit, beide Byte-Reihenfolgen, Seiten Meta/Daten/Mix/AMD, Kompression RLE (SASYZCRL) und RDC (SASYZCR2),
 *              Zahlen mit 3 bis 8 Byte, Text mit der Kodierung aus dem Kopf, gelöschte Zeilen werden übersprungen,
 *              Namen, Beschriftungen und Formate der Spalten.
 *   .xpt       Transportdatei Fassung 5 (IBM-Gleitkomma, auch gekürzte Zahlen mit 2 bis 7 Byte). Fassung 8 und CPORT-Dateien nicht.
 * Datum, Datum mit Uhrzeit und Uhrzeit erkennt der Leser am Format (DATE, DATETIME, TIME … wie pandas `sas_date_formats`).
 * Fehlende Werte (`.`, `.A` bis `.Z`, `._`) sind in SAS Zahlen, die keine Zahlen sind (NaN) - sie werden „fehlt“.
 * Wertelabels stehen in SAS in einem eigenen Katalog (.sas7bcat), den Statable nicht liest.
 * Eine Datei, die nicht stimmig ist, ergibt `SasFehler` - nie einen Absturz und nie falsche Zahlen.
 */
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { psppName } from './einlesen';
import { L, Lp } from './sitzung.svelte';
import { zitat } from '../i18n/profil';

export class SasFehler extends Error {
  constructor(text: string) { super(text); }
}
const fehler = (text: string): never => { throw new SasFehler(text); };

export interface SasDaten {
  art: 'sas7bdat' | 'xpt';
  spalten: Spalte[];
  zeilen: Wert[][];
  /** Hinweise für die Person (was nicht 1:1 übernommen wurde). */
  hinweise: string[];
}

const MAX_ZEILEN = 20_000_000;

/* ---------- Gemeinsames: Formate, Datum, Text ---------- */

// Quelle: pandas sas_constants.py (sas_date_formats / sas_datetime_formats), dazu die Zeit-Formate.
const DATUM = new Set(['DATE', 'DAY', 'DDMMYY', 'DOWNAME', 'JULDAY', 'JULIAN', 'MMDDYY', 'MMYY', 'MMYYC', 'MMYYD', 'MMYYP', 'MMYYS', 'MMYYN', 'MONNAME', 'MONTH', 'MONYY', 'QTR', 'QTRR', 'NENGO',
  'WEEKDATE', 'WEEKDATX', 'WEEKDAY', 'WEEKV', 'WORDDATE', 'WORDDATX', 'YEAR', 'YYMM', 'YYMMC', 'YYMMD', 'YYMMP', 'YYMMS', 'YYMMN', 'YYMON', 'YYMMDD', 'YYQ', 'YYQC', 'YYQD', 'YYQP', 'YYQS', 'YYQN',
  'YYQR', 'YYQRC', 'YYQRD', 'YYQRP', 'YYQRS', 'YYQRN', 'YYMMDDP', 'YYMMDDC', 'E8601DA', 'YYMMDDN', 'MMDDYYC', 'MMDDYYS', 'MMDDYYD', 'YYMMDDS', 'B8601DA', 'DDMMYYN', 'YYMMDDD', 'DDMMYYB', 'DDMMYYP',
  'MMDDYYP', 'YYMMDDB', 'MMDDYYN', 'DDMMYYC', 'DDMMYYD', 'DDMMYYS', 'MINGUO']);
const DATUMZEIT = new Set(['DATETIME', 'DTWKDATX', 'B8601DN', 'B8601DT', 'B8601DX', 'B8601DZ', 'B8601LX', 'E8601DN', 'E8601DT', 'E8601DX', 'E8601DZ', 'E8601LX', 'DATEAMPM', 'DTDATE', 'DTMONYY', 'DTYEAR', 'TOD', 'MDYAMPM']);
const ZEIT = new Set(['TIME', 'TIMEAMPM', 'HHMM', 'E8601TM', 'B8601TM']);
/** Übliche Zahlenformate von SAS - alles andere ist ein eigenes Format (oft mit Wertelabels im Katalog). */
const ZAHLFORMAT = /^(BEST|F|COMMA|COMMAX|DOLLAR|DOLLARX|PERCENT|PERCENTN|Z|E|D|NUMX|NLNUM|NLNUMI|NLMNY|NLMNYI|NLPCT|NLPCTI|BINARY|HEX|OCTAL|ROMAN|WORDS|WORDF|WORDS|NEGPAREN|YEN|EURO|SSN|PVALUE|MGRDF|IB|IBR|PD|PK|RB|S370FF|S370FIB|S370FPD|NLDATE|NLDATM|NLTIME|NLDATEYQ|JNENGO|DATEJL|MONTH|WEEKU|WEEKW)$/;

/** Formatname ohne Breite und Punkt („DATE9.“ → DATE). */
const formatName = (f: string) => f.trim().toUpperCase().replace(/[\d.]+$/, '').replace(/^\$/, '$');
type DatumsArt = 'datum' | 'datumzeit' | 'zeit' | null;
function datumsArt(format: string): DatumsArt {
  const n = formatName(format);
  return DATUM.has(n) ? 'datum' : DATUMZEIT.has(n) ? 'datumzeit' : ZEIT.has(n) ? 'zeit' : null;
}

// SAS lässt den 29. Februar in Jahren aus, die durch 4000 teilbar sind (anders als der gregorianische Kalender): ab 01.03.4000 und 01.03.8000 fehlt je ein Tag.
const MARZ_4000 = 745154, MARZ_8000 = 2206123;
const EPOCHE_MS = Date.UTC(1960, 0, 1);
const zwei = (n: number) => String(n).padStart(2, '0');

/** Sekunden seit 01.01.1960 (SAS-Zählung) → Datum und Sekunden seit Mitternacht; null, wenn es kein Datum 0001-9999 ist. */
function zeitpunkt(sekunden: number): { t: number; m: number; j: number; sek: number } | null {
  const tage = Math.floor(sekunden / 86400);
  const korr = tage + (tage >= MARZ_4000 ? 1 : 0) + (tage >= MARZ_8000 ? 1 : 0);
  const d = new Date(EPOCHE_MS + korr * 86400000);
  const j = d.getUTCFullYear();
  if (Number.isNaN(d.getTime()) || j < 1 || j > 9999) return null;
  return { t: d.getUTCDate(), m: d.getUTCMonth() + 1, j, sek: sekunden - tage * 86400 };
}
const datumText = (z: { t: number; m: number; j: number }) => `${zwei(z.t)}.${zwei(z.m)}.${String(z.j).padStart(4, '0')}`;
const uhrText = (s: number) => `${zwei(Math.floor(s / 3600))}:${zwei(Math.floor(s / 60) % 60)}:${zwei(Math.floor(s) % 60)}`;

/** Wandelt eine Zahlenspalte nach ihrem Format in Datum, Datum mit Uhrzeit oder Uhrzeit. `null`: bleibt eine Zahl. */
function alsDatum(art: Exclude<DatumsArt, null>, werte: Wert[], hinweise: string[], name: string): { werte: Wert[]; format: string } | null {
  if (art === 'zeit') {
    // Uhrzeit = Sekunden seit Mitternacht. Dauern über 24 Stunden oder negative bleiben Zahlen.
    if (!werte.every(v => v === null || (typeof v === 'number' && v >= 0 && v < 86400))) return null;
    return { werte: werte.map(v => (typeof v === 'number' ? uhrText(v) : null)), format: 'TIME8.0' };
  }
  let ausserhalb = 0;
  const aus = werte.map(v => {
    if (typeof v !== 'number') return null;
    const z = zeitpunkt(art === 'datum' ? Math.round(v * 86400) : Math.floor(v));
    if (!z) { ausserhalb++; return null; }
    return art === 'datum' ? datumText(z) : `${datumText(z)} ${uhrText(z.sek)}`;
  });
  if (ausserhalb) hinweise.push(L(`„${name}“ hat ${ausserhalb} Werte, die kein gültiges Datum sind. Sie stehen als „fehlt“.`, `"${name}" has ${ausserhalb} values that are not a valid date. They are shown as missing.`));
  return { werte: aus, format: art === 'datum' ? 'EDATE10' : 'YMDHMS20.0' };
}

/** Kodierung aus dem Kopf (SAS-Nummer) → Name für TextDecoder; nur, was ein Browser kennt. Quelle der Nummern: pandas sas_constants.py. */
const KODIERUNG: Record<number, string> = {
  0: 'windows-1252', 20: 'utf-8', 28: 'windows-1252', 29: 'windows-1252', 30: 'iso-8859-2', 31: 'iso-8859-3', 32: 'iso-8859-4', 33: 'iso-8859-5', 34: 'iso-8859-6', 35: 'iso-8859-7',
  36: 'iso-8859-8', 37: 'windows-1254', 38: 'iso-8859-10', 39: 'windows-874', 40: 'iso-8859-15', 49: 'ibm866', 51: 'windows-874', 60: 'windows-1250', 61: 'windows-1251', 62: 'windows-1252',
  63: 'windows-1253', 64: 'windows-1254', 65: 'windows-1255', 66: 'windows-1256', 67: 'windows-1257', 68: 'windows-1258', 69: 'macintosh', 118: 'big5', 123: 'big5', 125: 'gb18030', 126: 'gbk',
  134: 'euc-jp', 136: 'shift_jis', 138: 'shift_jis', 140: 'euc-kr', 141: 'euc-kr', 142: 'euc-kr', 167: 'iso-2022-jp', 204: 'windows-1252', 205: 'gb18030', 227: 'iso-8859-14', 242: 'iso-8859-13',
  246: 'x-mac-cyrillic', 248: 'shift_jis'
};
const utf8Streng = new TextDecoder('utf-8', { fatal: true });
function textDecoder(code: number, hinweise: string[]): TextDecoder {
  const name = KODIERUNG[code];
  if (name) { try { return new TextDecoder(name); } catch { /* unbekannt im Browser */ } }
  hinweise.push(L('Die Datei nennt einen Zeichensatz, den Statable nicht kennt. Statable nimmt Windows-1252; Umlaute und Sonderzeichen können falsch aussehen.', 'The file names a character set that Statable does not know. Statable uses Windows-1252; umlauts and special characters may look wrong.'));
  return new TextDecoder('windows-1252');
}

/** Die Spalten (Name, Bezeichnung, Art, Format) aus den Rohwerten bauen; Datumsspalten wandeln. */
interface RohSpalte { name: string; label: string; format: string; zahl: boolean; werte: Wert[] }
function baue(roh: RohSpalte[], n: number, hinweise: string[]): { spalten: Spalte[]; zeilen: Wert[][] } {
  const vergeben = new Set<string>();
  const spalten: Spalte[] = [];
  const eigene: string[] = [];
  roh.forEach((r, k) => {
    const name = psppName(r.name, vergeben, k + 1);
    const bez = r.label || (r.name !== name ? r.name : '');
    let art: Spalte['art'] = r.zahl ? 'zahl' : 'text', format = r.zahl ? 'F8.0' : 'A1';
    if (r.zahl) {
      const da = datumsArt(r.format);
      const w = da ? alsDatum(da, r.werte, hinweise, bez || r.name) : null;
      if (w) { art = 'datum'; format = w.format; r.werte = w.werte; }
      else {
        const f = formatName(r.format);
        if (f && !da && !ZAHLFORMAT.test(f)) eigene.push(bez || r.name);
      }
    }
    spalten.push({ name, bezeichnung: bez, art, format, niveau: art === 'zahl' ? 'metrisch' : 'nominal', fehlend: [], fehlendText: '', werteLabels: {} });
  });
  if (eigene.length) {
    // Testrunde 24.10.: Anführungszeichen der Sprache (zitat), nicht fest „…“ - sonst standen in englischen Meldungen deutsche Zeichen.
    const z = eigene.slice(0, 5).map(x => zitat(x)).join(', ') + (eigene.length > 5 ? ' …' : '');
    const n = eigene.length;
    hinweise.push(Lp(n, `Eine Spalte hat in SAS ein eigenes Format (${z}). Wertelabels dazu stehen in SAS in einem eigenen Katalog (.sas7bcat) und kommen nicht mit - die Zahlen schon.`,
      `${n} Spalten haben in SAS ein eigenes Format (${z}). Wertelabels dazu stehen in SAS in einem eigenen Katalog (.sas7bcat) und kommen nicht mit - die Zahlen schon.`,
      `One column has a custom format in SAS (${z}). Value labels for it are kept in SAS in a separate catalog (.sas7bcat) and do not come along - the numbers do.`,
      `${n} columns have a custom format in SAS (${z}). Value labels for them are kept in SAS in a separate catalog (.sas7bcat) and do not come along - the numbers do.`));
  }
  const zeilen: Wert[][] = new Array(n);
  for (let i = 0; i < n; i++) { const z = new Array<Wert>(roh.length); for (let k = 0; k < roh.length; k++) z[k] = roh[k]!.werte[i] ?? null; zeilen[i] = z; }
  return { spalten, zeilen };
}

/* ---------- Kompression (RLE und RDC) ---------- */

/** Lauflängen-Kompression „SASYZCRL“. Schreibt genau in `aus`, gibt die Zahl der geschriebenen Bytes zurück. */
function rleEntpacken(ein: Uint8Array, aus: Uint8Array): number {
  let i = 0, r = 0;
  const hole = (p: number) => { if (p >= ein.length) fehler('lesen außerhalb'); return ein[p]!; };
  const kopiere = (n: number) => { if (i + n > ein.length || r + n > aus.length) fehler('lesen außerhalb'); aus.set(ein.subarray(i, i + n), r); r += n; i += n; };
  const fuelle = (n: number, v: number) => { if (r + n > aus.length) fehler('schreiben außerhalb'); aus.fill(v, r, r + n); r += n; };
  while (i < ein.length) {
    const erst = ein[i]!, steuer = erst & 0xf0, ende = erst & 0x0f;
    i++;
    switch (steuer) {
      case 0x00: { const n = hole(i) + 64 + ende * 256; i++; kopiere(n); break; }
      case 0x40: { const n = hole(i) + 18 + ende * 256; i++; const v = hole(i); i++; fuelle(n, v); break; }
      case 0x60: { const n = ende * 256 + hole(i) + 17; i++; fuelle(n, 0x20); break; }
      case 0x70: { const n = ende * 256 + hole(i) + 17; i++; fuelle(n, 0x00); break; }
      case 0x80: kopiere(ende + 1); break;
      case 0x90: kopiere(ende + 17); break;
      case 0xa0: kopiere(ende + 33); break;
      case 0xb0: kopiere(ende + 49); break;
      case 0xc0: { const v = hole(i); i++; fuelle(ende + 3, v); break; }
      case 0xd0: fuelle(ende + 2, 0x40); break;
      case 0xe0: fuelle(ende + 2, 0x20); break;
      case 0xf0: fuelle(ende + 2, 0x00); break;
      default: fehler('Steuerbyte');
    }
  }
  return r;
}

/** Ross-Data-Compression „SASYZCR2“. */
function rdcEntpacken(ein: Uint8Array, aus: Uint8Array): number {
  let i = 0, r = 0, bits = 0, maske = 0;
  const fuelle = (n: number, v: number) => { if (r + n > aus.length) fehler('schreiben außerhalb'); aus.fill(v, r, r + n); r += n; };
  const zurueck = (abstand: number, n: number) => {
    const von = r - abstand;
    if (von < 0 || r + n > aus.length) fehler('lesen außerhalb');
    for (let k = 0; k < n; k++) aus[r + k] = aus[von + k]!;   // Überlappung gewollt: so wächst ein kurzes Muster
    r += n;
  };
  while (i < ein.length) {
    maske >>= 1;
    if (maske === 0) {
      if (i + 2 > ein.length) fehler('lesen außerhalb');
      bits = (ein[i]! << 8) + ein[i + 1]!; i += 2; maske = 0x8000;
    }
    if ((bits & maske) === 0) {
      if (i >= ein.length || r >= aus.length) fehler('lesen außerhalb');
      aus[r++] = ein[i++]!;
      continue;
    }
    if (i >= ein.length) fehler('lesen außerhalb');
    const befehl = (ein[i]! >> 4) & 0x0f;
    let zahl = ein[i]! & 0x0f;
    i++;
    if (befehl === 0) {          // kurze Wiederholung
      if (i >= ein.length) fehler('lesen außerhalb');
      fuelle(zahl + 3, ein[i]!); i++;
    } else if (befehl === 1) {   // lange Wiederholung
      if (i + 2 > ein.length) fehler('lesen außerhalb');
      zahl += ein[i]! << 4; zahl += 19;
      fuelle(zahl, ein[i + 1]!); i += 2;
    } else if (befehl === 2) {   // langes Muster
      if (i + 2 > ein.length) fehler('lesen außerhalb');
      const abstand = zahl + 3 + (ein[i]! << 4);
      zahl = ein[i + 1]! + 16; i += 2;
      zurueck(abstand, zahl);
    } else {                      // kurzes Muster
      if (i >= ein.length) fehler('lesen außerhalb');
      const abstand = zahl + 3 + (ein[i]! << 4); i++;
      zurueck(abstand, befehl);
    }
  }
  return r;
}

/* ---------- .sas7bdat ---------- */

const MAGIC = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xc2, 0xea, 0x81, 0x60, 0xb3, 0x14, 0x11, 0xcf, 0xbd, 0x92, 0x08, 0x00, 0x09, 0xc7, 0x31, 0x8c, 0x18, 0x1f, 0x10, 0x11];
export const istSas7bdat = (b: Uint8Array) => b.length >= 32 && MAGIC.every((x, i) => b[i] === x);

const SEITE_META = 0x0000, SEITE_DATEN = 0x0100, SEITE_MIX = 0x0200, SEITE_AMD = 0x0400, SEITE_META2 = 0x4000;
const DATEN_KOPF = 8;   // Zeiger auf Teilköpfe beginnen 8 Byte nach dem Seitenkopf (+ bitOffset)
const GELOESCHT = 0x0080;

// Teilkopf-Kennungen (pandas sas_constants.py, subheader_signature_to_index): Schlüssel = Bytes als Hex.
const T_ZEILE = 0, T_SPALTENZAHL = 1, T_ZAEHLER = 2, T_TEXT = 3, T_NAME = 4, T_ATTRIBUT = 5, T_FORMAT = 6, T_LISTE = 7, T_DATEN = 8;
const KENNUNG = new Map<string, number>();
for (const [hex, idx] of [
  ['f7f7f7f7', T_ZEILE], ['00000000f7f7f7f7', T_ZEILE], ['f7f7f7f700000000', T_ZEILE], ['f7f7f7f7fffffbfe', T_ZEILE],
  ['f6f6f6f6', T_SPALTENZAHL], ['00000000f6f6f6f6', T_SPALTENZAHL], ['f6f6f6f600000000', T_SPALTENZAHL], ['f6f6f6f6fffffbfe', T_SPALTENZAHL],
  ['00fcffff', T_ZAEHLER], ['fffffc00', T_ZAEHLER], ['00fcffffffffffff', T_ZAEHLER], ['fffffffffffffc00', T_ZAEHLER],
  ['fdffffff', T_TEXT], ['fffffffd', T_TEXT], ['fdffffffffffffff', T_TEXT], ['fffffffffffffffd', T_TEXT],
  ['ffffffff', T_NAME], ['ffffffffffffffff', T_NAME],
  ['fcffffff', T_ATTRIBUT], ['fffffffc', T_ATTRIBUT], ['fcffffffffffffff', T_ATTRIBUT], ['fffffffffffffffc', T_ATTRIBUT],
  ['fefbffff', T_FORMAT], ['fffffbfe', T_FORMAT], ['fefbffffffffffff', T_FORMAT], ['fffffffffffffbfe', T_FORMAT],
  ['feffffff', T_LISTE], ['fffffffe', T_LISTE], ['feffffffffffffff', T_LISTE], ['fffffffffffffffe', T_LISTE]
] as [string, number][]) KENNUNG.set(hex, idx);
const hex = (b: Uint8Array, von: number, n: number) => { let s = ''; for (let i = 0; i < n; i++) s += b[von + i]!.toString(16).padStart(2, '0'); return s; };

type Ref = [idx: number, start: number, laenge: number];

class Sas7 {
  b: Uint8Array; kopfDv: DataView;
  le = true; u64 = false; intLen = 4; bitOffset = 16; zeigerLen = 12; geloeschtZeiger = 12;
  kopfLaenge = 0; seitenLaenge = 0; kodierung = 0;
  kompression: '' | 'RLE' | 'RDC' = '';
  // Seite im Zugriff
  seite: Uint8Array = new Uint8Array(0); sdv: DataView = new DataView(new ArrayBuffer(0));
  seitenTyp = 0; seitenRoh = 0; blockZahl = 0; teilkopfZahl = 0;
  // Metadaten
  zeilenLaenge = 0; zeilenZahl = 0; mixZeilen = 0; spaltenZahl: number | null = null; zaehler1 = 0; zaehler2 = 0;
  textRoh: Uint8Array[] = [];
  nameRefs: Ref[] = []; formatRefs: [Ref, Ref][] = [];
  offsets: number[] = []; laengen: number[] = []; typen: ('d' | 's')[] = [];
  datenTeilkoepfe: [number, number][] = [];
  dec!: TextDecoder;
  hinweise: string[] = [];
  lateinisch = false;

  constructor(b: Uint8Array) {
    this.b = b; this.kopfDv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (!istSas7bdat(b) || b.length < 288) fehler('keine SAS-Datei');
    this.u64 = b[32] === 0x33;
    this.intLen = this.u64 ? 8 : 4;
    this.bitOffset = this.u64 ? 32 : 16; this.zeigerLen = this.u64 ? 24 : 12; this.geloeschtZeiger = this.u64 ? 24 : 12;
    const a2 = b[35] === 0x33 ? 4 : 0;
    this.le = b[37] === 1;
    this.kodierung = b[70]!;
    this.kopfLaenge = this.uint(this.kopfDv, 196 + a2, 4);
    this.seitenLaenge = this.uint(this.kopfDv, 200 + a2, 4);
    if (this.kopfLaenge < 288 || this.kopfLaenge > b.length) fehler('Kopf abgeschnitten');
    if (this.seitenLaenge < 512 || this.seitenLaenge > 1 << 26) fehler('Seitengröße');
    this.dec = textDecoder(this.kodierung, this.hinweise);
    this.lateinisch = KODIERUNG[this.kodierung] === 'windows-1252' || KODIERUNG[this.kodierung] === undefined;
  }

  uint(dv: DataView, off: number, w: number): number {
    if (off < 0 || off + w > dv.byteLength) fehler('Seite zu klein');
    switch (w) {
      case 1: return dv.getUint8(off);
      case 2: return dv.getUint16(off, this.le);
      case 4: return dv.getUint32(off, this.le);
      case 8: return Number(dv.getBigUint64(off, this.le));
      default: return fehler('Breite');
    }
  }
  u(off: number, w: number) { return this.uint(this.sdv, off, w); }
  /** Text einer Zelle. Steht im Kopf ein westeuropäischer Zeichensatz, die Bytes sind aber gültiges UTF-8 mit Sonderzeichen, gilt UTF-8 (so schreiben manche Programme). */
  text(b: Uint8Array) {
    if (this.lateinisch) {
      let hoch = false; for (let i = 0; i < b.length; i++) if (b[i]! >= 0x80) { hoch = true; break; }
      if (hoch) { try { return utf8Streng.decode(b); } catch { /* kein UTF-8 */ } }
    }
    return this.dec.decode(b);
  }

  /** Seite `i` laden (null am Dateiende); eine angebrochene Seite ist ein Fehler. */
  ladeSeite(i: number): boolean {
    const von = this.kopfLaenge + i * this.seitenLaenge;
    if (von >= this.b.length) return false;
    if (von + this.seitenLaenge > this.b.length) fehler('Seite abgeschnitten');
    this.seite = this.b.subarray(von, von + this.seitenLaenge);
    this.sdv = new DataView(this.seite.buffer, this.seite.byteOffset, this.seite.byteLength);
    this.seitenRoh = this.u(this.bitOffset, 2);
    this.seitenTyp = this.seitenRoh & 0xff00;
    this.blockZahl = this.u(2 + this.bitOffset, 2);
    this.teilkopfZahl = this.u(4 + this.bitOffset, 2);
    return true;
  }

  /** Alle Teilköpfe der Seite: Daten-Teilköpfe (komprimierte Zeilen) sammeln, die übrigen verarbeiten. */
  sammle(): [number, number][] {
    const aus: [number, number][] = [];
    const sl = this.seitenLaenge, il = this.intLen;
    const start = DATEN_KOPF + this.bitOffset;
    let komprimiert = this.kompression !== '';
    for (let i = 0; i < this.teilkopfZahl; i++) {
      const z = start + this.zeigerLen * i;
      if (z + 2 * il + 2 > sl) fehler('Seite zu klein');
      const off = this.u(z, il), len = this.u(z + il, il), komp = this.seite[z + 2 * il]!, typ = this.seite[z + 2 * il + 1]!;
      if (len === 0 || komp === 1) continue;
      if (off > sl - il || len > sl - off) fehler('Seite zu klein');
      const idx = KENNUNG.get(hex(this.seite, off, il)) ?? T_DATEN;
      if (idx === T_DATEN) {
        if (!(komprimiert && (komp === 4 || komp === 0) && typ === 1)) fehler('unbekannte Teilkopf-Kennung');
        if (aus.length >= sl) fehler('zu viele Teilköpfe');
        aus.push([off, len]);
      } else {
        this.verarbeite(idx, off, len);
        komprimiert = this.kompression !== '';   // der erste Textblock kann die Kompression einschalten
      }
    }
    return aus;
  }

  verarbeite(idx: number, off: number, len: number) {
    const il = this.intLen;
    switch (idx) {
      case T_ZEILE: {
        this.zeilenLaenge = this.u(off + 5 * il, il);
        if (this.zeilenLaenge > this.seitenLaenge) fehler('Zeile länger als die Seite');
        this.zeilenZahl = this.u(off + 6 * il, il);
        this.zaehler1 = this.u(off + 9 * il, il); this.zaehler2 = this.u(off + 10 * il, il);
        this.mixZeilen = this.u(off + 15 * il, il);
        if (this.mixZeilen * this.zeilenLaenge > this.seitenLaenge) fehler('Mix-Seite passt nicht');
        break;
      }
      case T_SPALTENZAHL: this.spaltenZahl = this.u(off + il, il); break;
      case T_TEXT: {
        const o = off + il, groesse = this.u(o, 2);
        if (o + groesse > this.seitenLaenge) fehler('Seite zu klein');
        let e = groesse; const buf = this.seite.subarray(o, o + groesse);
        while (e > 0 && (buf[e - 1] === 0 || buf[e - 1] === 0x20)) e--;
        const roh = buf.slice(0, e);
        this.textRoh.push(roh);
        if (this.textRoh.length === 1) {
          let s = ''; for (const x of roh) s += String.fromCharCode(x);
          if (s.includes('SASYZCRL')) this.kompression = 'RLE';
          if (s.includes('SASYZCR2')) this.kompression = 'RDC';
        }
        break;
      }
      case T_NAME: {
        const o = off + il, n = Math.floor((len - 2 * il - 12) / 8);
        for (let i = 0; i < n; i++) {
          const z = o + 8 * (i + 1);
          this.nameRefs.push([this.u(z, 2), this.u(z + 2, 2), this.u(z + 4, 2)]);
        }
        break;
      }
      case T_ATTRIBUT: {
        const n = Math.floor((len - 2 * il - 12) / (il + 8));
        for (let i = 0; i < n; i++) {
          this.offsets.push(this.u(off + il + 8 + i * (il + 8), il));
          this.laengen.push(this.u(off + 2 * il + 8 + i * (il + 8), 4));
          this.typen.push(this.u(off + 2 * il + 14 + i * (il + 8), 1) === 1 ? 'd' : 's');
        }
        break;
      }
      case T_FORMAT: {
        const d = 3 * il;
        this.formatRefs.push([
          [this.u(off + 22 + d, 2), this.u(off + 24 + d, 2), this.u(off + 26 + d, 2)],
          [this.u(off + 28 + d, 2), this.u(off + 30 + d, 2), this.u(off + 32 + d, 2)]
        ]);
        break;
      }
      default: break;   // Zähler und Liste: ohne Bedeutung für das Lesen
    }
  }

  /** Nach den Daten können AMD-Seiten Spaltentexte tragen (zum Beispiel nach dem Umbenennen einer Spalte) - nur diese Textblöcke lesen. */
  leseAmdText(ab: number) {
    for (let i = ab; this.ladeSeite(i); i++) {
      if (this.seitenTyp !== SEITE_AMD) continue;
      const il = this.intLen, kopf = this.bitOffset + 8;
      let n = this.teilkopfZahl;
      if (kopf + n * this.zeigerLen > this.seitenLaenge) n = 0;
      for (let k = 0; k < n; k++) {
        const z = kopf + k * this.zeigerLen;
        const off = this.u(z, il), len = this.u(z + il, il), komp = this.u(z + 2 * il, 1);
        if (len < il + 2 || off + len > this.seitenLaenge || komp === 1) continue;
        if (KENNUNG.get(hex(this.seite, off, il)) !== T_TEXT) continue;
        const groesse = this.u(off + il, 2);
        if (off + il + groesse <= this.seitenLaenge) this.verarbeite(T_TEXT, off, len);
      }
    }
  }

  signatur() { return [this.zeilenLaenge, this.zeilenZahl, this.mixZeilen, this.spaltenZahl, this.kompression, this.offsets.length, this.nameRefs.length].join('|'); }

  lies(): SasDaten {
    const b = this.b;
    // 1. Metadaten: Seiten lesen, bis eine Daten- oder Mix-Seite (oder eine Seite mit Daten-Teilköpfen) kommt
    let seitenNr = 0, fertig = false, gefunden = false;
    while (!fertig) {
      if (!this.ladeSeite(seitenNr)) break;
      gefunden = true;
      this.datenTeilkoepfe = [];
      if (this.seitenTyp === SEITE_META || this.seitenTyp === SEITE_META2 || this.seitenTyp === SEITE_AMD || this.seitenTyp === SEITE_MIX) this.datenTeilkoepfe = this.sammle();
      fertig = this.seitenTyp === SEITE_DATEN || this.seitenTyp === SEITE_MIX || this.datenTeilkoepfe.length > 0;
      if (!fertig) seitenNr++;
    }
    const erste = seitenNr;
    if (this.spaltenZahl === null) fehler('keine Spalten-Angaben');
    // Manche Dateien tragen im Kopf Null Spalten, obwohl die Spaltenangaben da sind: dann gelten diese.
    const cc = this.spaltenZahl === 0 && this.typen.length > 0 ? this.typen.length : this.spaltenZahl!;
    if (this.typen.length === 0 || cc === 0) return { art: 'sas7bdat', spalten: [], zeilen: [], hinweise: this.hinweise };

    // 2. Spaltentexte auflösen (nötigenfalls aus AMD-Seiten hinter den Daten)
    let nText = this.textRoh.length;
    if (this.nameRefs.some(r => r[0] >= nText) || this.formatRefs.some(f => f.some(r => r[0] >= nText && r[2] > 0))) {
      if (gefunden) { const gemerkt = { seite: this.seite, sdv: this.sdv, typ: this.seitenTyp, roh: this.seitenRoh, bz: this.blockZahl, tz: this.teilkopfZahl }; this.leseAmdText(erste + 1); Object.assign(this, { seite: gemerkt.seite, sdv: gemerkt.sdv, seitenTyp: gemerkt.typ, seitenRoh: gemerkt.roh, blockZahl: gemerkt.bz, teilkopfZahl: gemerkt.tz }); }
      nText = this.textRoh.length;
    }
    if (this.nameRefs.length < cc || this.typen.length < cc || this.offsets.length < cc || this.laengen.length < cc) fehler('Spaltenangaben unvollständig');
    const stueck = (r: Ref, eins = false) => { const t = this.textRoh[eins ? Math.min(r[0], nText - 1) : r[0]]; if (!t) return fehler('Spaltentext fehlt'); return this.text(t.subarray(r[1], r[1] + r[2])); };
    const namen = this.nameRefs.slice(0, cc).map(r => { if (r[0] >= nText) fehler('Spaltenname fehlt'); return stueck(r); });
    const formate: string[] = [], labels: string[] = [];
    for (let j = 0; j < cc; j++) {
      const f = this.formatRefs[j];
      formate.push(f && nText ? stueck(f[0], true) : ''); labels.push(f && nText ? stueck(f[1], true) : '');
    }
    // 3. Die Angaben zu Spalten und Zeilen prüfen, bevor gelesen wird
    for (let j = 0; j < cc; j++) {
      if (this.typen[j] === 'd' && this.laengen[j]! > 8) fehler('Zahl länger als 8 Byte');
      if (this.offsets[j]! + this.laengen[j]! > this.zeilenLaenge) fehler('Spalte liegt hinter der Zeile');
    }
    const minZeile = Math.max(1, this.kompression ? Math.min(this.zeilenLaenge, this.zeigerLen) : this.zeilenLaenge);
    if (this.zeilenZahl > MAX_ZEILEN || this.zeilenZahl > Math.floor(b.length / minZeile)) fehler('mehr Zeilen, als in die Datei passen');
    const gemerkt = this.signatur();

    // 4. Zeilen lesen
    const werte: Wert[][] = Array.from({ length: cc }, () => []);
    const zahlSpeicher = new Uint8Array(8), zahlDv = new DataView(zahlSpeicher.buffer);
    const entpackt = this.kompression ? new Uint8Array(this.zeilenLaenge) : null;
    const entpacke = this.kompression === 'RLE' ? rleEntpacken : rdcEntpacken;
    const verarbeiteZeile = (off: number, len: number) => {
      let quelle = this.seite, basis = off;
      if (off + len > this.seite.length) fehler('Zeile liegt hinter der Seite');
      if (entpackt && len < this.zeilenLaenge) {
        const n = entpacke(this.seite.subarray(off, off + len), entpackt);
        if (n !== this.zeilenLaenge) fehler('entpackte Zeile hat die falsche Länge');
        quelle = entpackt; basis = 0;
      } else if (len < this.zeilenLaenge) fehler('Zeile zu kurz');
      for (let j = 0; j < cc; j++) {
        const ln = this.laengen[j]!;
        if (ln === 0) { for (let k = j; k < cc; k++) werte[k]!.push(null); return; }
        const start = basis + this.offsets[j]!;
        if (this.typen[j] === 'd') {
          zahlSpeicher.fill(0);
          const m = this.le ? 8 - ln : 0;
          for (let k = 0; k < ln; k++) zahlSpeicher[m + k] = quelle[start + k]!;
          const v = zahlDv.getFloat64(0, this.le);
          werte[j]!.push(Number.isFinite(v) ? v : null);   // NaN = fehlend (`.`, `.A` bis `.Z`)
        } else {
          let e = ln; while (e > 0 && (quelle[start + e - 1] === 0 || quelle[start + e - 1] === 0x20)) e--;
          werte[j]!.push(e === 0 ? null : this.text(quelle.subarray(start, start + e)));
        }
      }
    };

    const il = this.seitenLaenge;
    let datei = 0, zeilenSeite = 0, geloeschtKarte = -1, naechste = erste, teilkoepfe = this.datenTeilkoepfe;
    const mixEff = Math.min(this.zeilenZahl, this.mixZeilen);
    const seiteVorbereiten = () => {
      zeilenSeite = 0; geloeschtKarte = -1;
      if ((this.seitenRoh & GELOESCHT) && (this.seitenTyp === SEITE_DATEN || this.seitenTyp === SEITE_MIX)) {
        let start = this.bitOffset + DATEN_KOPF + this.teilkopfZahl * this.zeigerLen;
        start += start % 8;
        geloeschtKarte = start + (this.blockZahl - this.teilkopfZahl) * this.zeilenLaenge + this.u(this.geloeschtZeiger, 4);
      }
    };
    const istGeloescht = () => {
      if (geloeschtKarte < 0) return false;
      const p = geloeschtKarte + (zeilenSeite >> 3);
      if (p < 0 || p >= il) fehler('lesen außerhalb');
      return ((this.seite[p]! >> (7 - (zeilenSeite % 8))) & 1) === 1;
    };
    /** Nächste Seite mit Zeilen; false am Dateiende. */
    const weiter = (): boolean => {
      for (;;) {
        naechste++;
        if (!this.ladeSeite(naechste)) return false;
        seiteVorbereiten();
        if (this.seitenTyp === SEITE_META || this.seitenTyp === SEITE_META2) { teilkoepfe = this.sammle(); return true; }
        if (this.seitenTyp === SEITE_DATEN || this.seitenTyp === SEITE_MIX) { teilkoepfe = []; return true; }
      }
    };
    if (this.zeilenZahl > 0) {
      if (!gefunden) fehler('keine Daten');
      this.ladeSeite(erste); seiteVorbereiten();
      teilkoepfe = this.datenTeilkoepfe;
      while (datei < this.zeilenZahl) {
        const t = this.seitenTyp;
        if (t === SEITE_META || t === SEITE_META2) {
          if (zeilenSeite >= teilkoepfe.length) { if (!weiter()) break; continue; }
          const [off, len] = teilkoepfe[zeilenSeite]!;
          verarbeiteZeile(off, len); zeilenSeite++; datei++;
        } else if (t === SEITE_MIX || t === SEITE_DATEN) {
          const anzahl = t === SEITE_MIX ? mixEff : this.blockZahl;
          if (zeilenSeite >= anzahl) { if (!weiter()) break; continue; }
          if (istGeloescht()) {
            zeilenSeite++; datei++;
            continue;
          }
          let off: number;
          if (t === SEITE_MIX) {
            const kopf = this.bitOffset + DATEN_KOPF + this.teilkopfZahl * this.zeigerLen;
            off = kopf + (kopf % 8) + zeilenSeite * this.zeilenLaenge;
          } else off = this.bitOffset + DATEN_KOPF + zeilenSeite * this.zeilenLaenge;
          verarbeiteZeile(off, this.zeilenLaenge); zeilenSeite++; datei++;
        } else fehler('unbekannte Seitenart');
      }
      if (datei < this.zeilenZahl) fehler('Datei endet vor der letzten Zeile');
      if (this.signatur() !== gemerkt) fehler('Datei ändert ihren Aufbau mitten in den Daten');
    }

    const n = werte[0]?.length ?? 0;
    const roh: RohSpalte[] = namen.map((name, j) => ({ name, label: labels[j]!, format: formate[j]!, zahl: this.typen[j] === 'd', werte: werte[j]! }));
    const { spalten, zeilen } = baue(roh, n, this.hinweise);
    return { art: 'sas7bdat', spalten, zeilen, hinweise: this.hinweise };
  }
}

/* ---------- .xpt (Transportdatei, Fassung 5) ---------- */

const XPT_KOPF1 = 'HEADER RECORD*******LIBRARY HEADER RECORD!!!!!!!000000000000000000000000000000  ';
const XPT_MITGLIED1 = 'HEADER RECORD*******MEMBER  HEADER RECORD!!!!!!!000000000000000001600000000';
const XPT_MITGLIED2 = 'HEADER RECORD*******DSCRPTR HEADER RECORD!!!!!!!000000000000000000000000000000  ';
const XPT_OBS = 'HEADER RECORD*******OBS     HEADER RECORD!!!!!!!000000000000000000000000000000  ';
const latin1 = (b: Uint8Array, von: number, n: number) => { let s = ''; for (let i = von; i < Math.min(b.length, von + n); i++) s += String.fromCharCode(b[i]!); return s; };
export const istXpt = (b: Uint8Array) => b.length >= 80 && latin1(b, 0, 80) === XPT_KOPF1;

/** IBM-Gleitkomma (8 Byte, Bytes 2 bis 8 dürfen fehlen und sind dann 0) → Zahl; Bitrechnung wie pandas `_parse_float_vec`, damit die Werte gleich sind. */
function ibmZahl(b: Uint8Array, von: number, laenge: number, dv: DataView, speicher: Uint8Array): number | null {
  speicher.fill(0);
  for (let i = 0; i < laenge; i++) speicher[i] = b[von + i]!;
  const x1 = dv.getUint32(0, false), x2 = dv.getUint32(4, false);
  // Fehlend: erstes Byte A-Z, _ oder . und alle übrigen 0
  const f0 = speicher[0]!;
  if (((f0 >= 0x41 && f0 <= 0x5a) || f0 === 0x5f || f0 === 0x2e) && (x1 & 0x00ffffff) === 0 && x2 === 0) return null;
  if ((x1 & 0x00ffffff) === 0 && x2 === 0) return (x1 & 0x80000000) !== 0 ? -0 : 0;
  let schub = 0;
  if (x1 & 0x00200000) schub = 1;
  if (x1 & 0x00400000) schub = 2;
  if (x1 & 0x00800000) schub = 3;
  let i1 = ((x1 & 0x00ffffff) >>> schub) >>> 0;
  const i2 = (((x2 >>> schub) | (((x1 & 7) * 2 ** (32 - schub)) % 4294967296)) >>> 0);
  i1 = (i1 & 0xffefffff) >>> 0;
  const e = (((((x1 >>> 24) & 0x7f) - 65) << 2) + schub + 1023) << 20;
  i1 = ((i1 | e | (x1 & 0x80000000)) >>> 0);
  dv.setUint32(0, i1, false); dv.setUint32(4, i2, false);
  return dv.getFloat64(0, false);
}

function leseXpt(b: Uint8Array): SasDaten {
  const hinweise: string[] = [];
  const zeile = (i: number) => latin1(b, i * 80, 80);
  if (b.length < 80 * 9) fehler('Datei zu kurz');
  if (zeile(1).slice(0, 24).trim() !== 'SAS     SAS     SASLIB') fehler('Kopf ungültig');
  const m1 = zeile(3), m2 = zeile(4);
  if (!m1.startsWith(XPT_MITGLIED1) || m2 !== XPT_MITGLIED2) fehler('Mitgliedskopf nicht gefunden');
  const feldLaenge = parseInt(m1.slice(75, 78), 10);
  if (!(feldLaenge >= 88 && feldLaenge <= 200)) fehler('Feldlänge');
  const feldZahl = parseInt(zeile(7).slice(54, 58), 10);
  if (!(feldZahl >= 0 && feldZahl < 100000)) fehler('Feldzahl');
  let datenLaenge = feldLaenge * feldZahl;
  if (datenLaenge % 80) datenLaenge += 80 - (datenLaenge % 80);
  const feldStart = 8 * 80;
  if (feldStart + datenLaenge + 80 > b.length) fehler('Datei abgeschnitten');
  interface Feld { zahl: boolean; laenge: number; name: string; label: string; format: string }
  const felder: Feld[] = [];
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let satz = 0;
  for (let i = 0; i < feldZahl; i++) {
    const o = feldStart + i * feldLaenge;
    const art = dv.getInt16(o, false), laenge = dv.getInt16(o + 4, false);
    if (art !== 1 && art !== 2) fehler('Feldart');
    if (art === 1 && (laenge < 2 || laenge > 8)) fehler('Zahlbreite');
    if (laenge < 0) fehler('Feldbreite');
    felder.push({ zahl: art === 1, laenge, name: latin1(b, o + 8, 8).trim(), label: latin1(b, o + 16, 40).trim(), format: latin1(b, o + 56, 8).trim() });
    satz += laenge;
  }
  if (zeile((feldStart + datenLaenge) / 80) !== XPT_OBS) fehler('Beobachtungskopf nicht gefunden');
  const start = feldStart + datenLaenge + 80;
  // Zahl der Sätze: Rest der Datei, abzüglich der Leerzeichen-Füllung am Ende (wie pandas)
  const rest = b.length - start;
  let n: number;
  if (satz > 80) n = Math.floor(rest / satz);
  else {
    let fuell = 0;
    if (b.length >= 80) for (let w = 0; w < 10; w++) { let leer = true; for (let k = 0; k < 8; k++) if (b[b.length - 80 + w * 8 + k] !== 0x20) leer = false; if (leer) fuell += 8; }
    n = satz > 0 ? Math.floor((rest - fuell) / satz) : 0;
  }
  if (n < 0 || n > MAX_ZEILEN) fehler('Satzzahl');
  const utf8 = (() => { try { new TextDecoder('utf-8', { fatal: true }).decode(b.subarray(start)); return true; } catch { return false; } })();
  const dec = new TextDecoder(utf8 ? 'utf-8' : 'windows-1252');
  const speicher = new Uint8Array(8), sdv = new DataView(speicher.buffer);
  const roh: RohSpalte[] = felder.map(f => ({ name: f.name, label: f.label, format: f.format, zahl: f.zahl, werte: new Array<Wert>(n) }));
  for (let i = 0; i < n; i++) {
    let p = start + i * satz;
    for (let j = 0; j < felder.length; j++) {
      const f = felder[j]!;
      if (f.zahl) roh[j]!.werte[i] = ibmZahl(b, p, f.laenge, sdv, speicher);
      else {
        let e = f.laenge; while (e > 0 && (b[p + e - 1] === 0x20 || (b[p + e - 1]! >= 9 && b[p + e - 1]! <= 13))) e--;
        roh[j]!.werte[i] = e === 0 ? null : dec.decode(b.subarray(p, p + e));
      }
      p += f.laenge;
    }
  }
  if (!felder.length) return { art: 'xpt', spalten: [], zeilen: [], hinweise };
  const { spalten, zeilen } = baue(roh, n, hinweise);
  return { art: 'xpt', spalten, zeilen, hinweise };
}

/* ---------- Eingang ---------- */

/** Liest .sas7bdat oder .xpt (Erkennung am Inhalt, nicht an der Endung). Wirft nur `SasFehler`. */
export function leseSas(bytes: Uint8Array): SasDaten {
  try {
    if (istXpt(bytes)) return leseXpt(bytes);
    if (istSas7bdat(bytes)) return new Sas7(bytes).lies();
  } catch (f) {
    if (f instanceof SasFehler) throw f;
    throw new SasFehler(f instanceof Error ? f.message : String(f));   // RangeError & Co. bei kaputten Dateien
  }
  return fehler('kein SAS-Format');
}
