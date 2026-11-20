/**
 * Stata-Dateien (.dta) lesen - eigener Leser, reines TypeScript, ohne Abhängigkeit.
 * Warum: PSPP 2.1.1 kann keine .dta-Dateien lesen (geprüft 08.10.2026). Die Daten gehen als Spalten + Zeilen
 * an die Engine, genau wie eingegebene Daten (`neuAufbauen` in eingabe.ts): Bezeichnungen, Wertelabels,
 * fehlende Werte und Messniveau kommen so mit.
 *
 * Formate (Quelle: stata.com/help.cgi?dta, dta_117, dta_115):
 *   114 (Stata 10/11), 115 (Stata 12)      binär, Kopf fest
 *   117 (Stata 13)                         Tags <stata_dta> …, Zeichensatz Latin-1 (Windows-1252, gültiges UTF-8 wird erkannt), strL
 *   118 (Stata 14-17), 119 (viele Variablen) wie 117, Zeichensatz UTF-8
 *   120, 121 (Stata 18/19, nur mit Alias-Variablen): wie 118/119 plus Typ 65525 = Alias (Doku dta_121); Alias hat in der Datenzeile
 *   keine Bytes (aus der Doku angenommen, nicht an einer echten Datei geprüft - darum prüft der Leser, dass die Daten genau am <strls> enden)
 * Beide Byte-Reihenfolgen. ≤ 113 und > 121 werden verständlich abgelehnt.
 */
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { psppName } from './einlesen';
import { L } from './sitzung.svelte';

export class StataFehler extends Error {
  grund: 'version' | 'kaputt'; version: number;
  constructor(grund: 'version' | 'kaputt', version = 0, text = '') { super(`${grund} ${version} ${text}`); this.grund = grund; this.version = version; }
}

export interface StataDaten {
  version: number;
  spalten: Spalte[];
  zeilen: Wert[][];
  /** Hinweise für die Person (was nicht 1:1 übernommen wurde). */
  hinweise: string[];
}

/** Rohspalte vor der Umwandlung. Erweiterte Fehlende (.a-.z) stehen als { tag } im Wertefeld. */
type Roh = number | string | null | { tag: number };

const MAX_ZEILEN = 20_000_000;

class Leser {
  v: DataView; b: Uint8Array; le: boolean; pos = 0;
  constructor(b: Uint8Array, le: boolean) { this.b = b; this.v = new DataView(b.buffer, b.byteOffset, b.byteLength); this.le = le; }
  pruefe(n: number) { if (n < 0 || this.pos + n > this.b.length) throw new StataFehler('kaputt', 0, 'Ende'); }
  u8() { this.pruefe(1); return this.v.getUint8(this.pos++); }
  u16() { this.pruefe(2); const x = this.v.getUint16(this.pos, this.le); this.pos += 2; return x; }
  i16() { this.pruefe(2); const x = this.v.getInt16(this.pos, this.le); this.pos += 2; return x; }
  u32() { this.pruefe(4); const x = this.v.getUint32(this.pos, this.le); this.pos += 4; return x; }
  i32() { this.pruefe(4); const x = this.v.getInt32(this.pos, this.le); this.pos += 4; return x; }
  u64() { this.pruefe(8); const x = Number(this.v.getBigUint64(this.pos, this.le)); this.pos += 8; return x; }
  bytes(n: number) { this.pruefe(n); const x = this.b.subarray(this.pos, this.pos + n); this.pos += n; return x; }
  ascii(n: number) { return String.fromCharCode(...this.bytes(n)); }
  erwarte(tag: string) { if (this.ascii(tag.length) !== tag) throw new StataFehler('kaputt', 0, tag); }
}

const nullEnde = (b: Uint8Array) => { const i = b.indexOf(0); return i < 0 ? b : b.subarray(0, i); };

/** Prüft, ob die Bytes nach einer Stata-Datei aussehen (Erkennung unabhängig von der Endung). */
export function istStata(b: Uint8Array): boolean {
  if (b.length > 11 && String.fromCharCode(...b.subarray(0, 11)) === '<stata_dta>') return true;
  return b.length > 10 && b[0]! >= 102 && b[0]! <= 115 && (b[1] === 1 || b[1] === 2) && b[2] === 1;
}

export function leseStata(bytes: Uint8Array): StataDaten {
  if (bytes.length < 11) throw new StataFehler('kaputt');
  if (String.fromCharCode(...bytes.subarray(0, 11)) === '<stata_dta>') return leseTags(bytes);
  const rel = bytes[0]!;
  if (rel >= 102 && rel <= 115 && (bytes[1] === 1 || bytes[1] === 2) && bytes[2] === 1) {
    if (rel < 114) throw new StataFehler('version', rel);
    return leseAlt(bytes, rel);
  }
  throw new StataFehler('kaputt');
}

/* ---------- Werte ---------- */

// Fehlende Werte: byte > 100, int > 32740, long > 2147483620; float ≥ 2^127, double ≥ 2^1023 (·, .a bis .z).
function byteWert(x: number): Roh { return x > 100 ? { tag: x - 101 } : x; }
function intWert(x: number): Roh { return x > 32740 ? { tag: x - 32741 } : x; }
function longWert(x: number): Roh { return x > 2147483620 ? { tag: x - 2147483621 } : x; }
const F127 = 2 ** 127, D1023 = 2 ** 1023;
// Jeder Buchstabe liegt 2^-12 (relativ) über dem vorigen: · = 0x7f000000 bzw. 0x7fe0…, .a = 0x7f000800 bzw. 0x7fe0010000000000.
function floatWert(x: number): Roh {
  if (Number.isNaN(x)) return { tag: 0 };
  if (x >= F127) return { tag: Math.max(0, Math.min(26, Math.round((x / F127 - 1) * 4096))) };
  return Number(x.toPrecision(7));
}
function doubleWert(x: number): Roh {
  if (Number.isNaN(x)) return { tag: 0 };
  if (x >= D1023) return { tag: Math.max(0, Math.min(26, Math.round((x / D1023 - 1) * 4096))) };
  return x;
}

/** Zeichenfolge: UTF-8 oder Windows-1252, am ersten NUL beendet. */
function text(b: Uint8Array, utf8: boolean): string {
  const t = nullEnde(b);
  if (utf8) return new TextDecoder('utf-8').decode(t);
  // Ältere Fassungen: Latin-1/Windows-1252. Manche Programme (z. B. R haven) schreiben dort trotzdem UTF-8 - gültiges UTF-8 gilt als UTF-8.
  try { return new TextDecoder('utf-8', { fatal: true }).decode(t); } catch { return new TextDecoder('windows-1252').decode(t); }
}

/* ---------- Gemeinsame Umwandlung ---------- */

interface Kopf {
  version: number; namen: string[]; formate: string[]; beschriftungen: string[]; wertelabelNamen: string[];
}
type Wertelabels = Record<string, Record<string, string>>; // Tabellenname → { Wert-Text → Beschriftung }; ".a" für erweiterte

function baue(kopf: Kopf, spaltenRoh: Roh[][], typen: ('byte' | 'int' | 'long' | 'float' | 'double' | 'str' | 'strl')[], tabellen: Wertelabels): StataDaten {
  const hinweise: string[] = [];
  const vergeben = new Set<string>();
  const n = spaltenRoh[0]?.length ?? 0;
  const spalten: Spalte[] = [];
  const zeilen: Wert[][] = Array.from({ length: n }, () => []);
  const tabellenGenutzt = new Set<string>();
  const umgewandelt: string[] = [];

  kopf.namen.forEach((orig, k) => {
    const roh = spaltenRoh[k]!;
    const typ = typen[k]!;
    const name = psppName(orig, vergeben, k + 1);
    const bez = kopf.beschriftungen[k] || (orig !== name ? orig : '');
    const fmt = kopf.formate[k] ?? '';
    const tabName = kopf.wertelabelNamen[k] ?? '';
    const tabelle = tabName ? tabellen[tabName] : undefined;
    if (tabName) tabellenGenutzt.add(tabName);
    let art: 'zahl' | 'text' | 'datum' = typ === 'str' || typ === 'strl' ? 'text' : 'zahl';
    let werte: Wert[] = [];
    let fehlend: number[] = [];
    let werteLabels: Record<string, string> = {};
    let format = art === 'text' ? 'A1' : 'F8.0';

    if (art === 'text') {
      werte = roh.map(x => (typeof x === 'string' && x !== '' ? x : null));
    } else {
      // Datum: %td / %d (Tage seit 01.01.1960), %tc / %tC (Millisekunden)
      const tage = /^%-?t?d($|[^a-z])/i.test(fmt) && !/^%-?t[cCwmqhy]/.test(fmt);
      const zeit = /^%-?t[cC]/.test(fmt);
      if (tage || zeit) {
        art = 'datum'; format = 'EDATE10';
        werte = roh.map(x => (typeof x === 'number' ? datum(zeit ? Math.floor(x / 86400000) : Math.floor(x)) : null));
        if (zeit) umgewandelt.push(`${name} (${L('Uhrzeit nicht übernommen', 'time of day not kept')})`);
      } else {
        if (/^%-?t[wmqhy]/.test(fmt)) hinweise.push(L(`„${bez || orig}“ ist ein Stata-Zeitformat (${fmt.replace(/^%-?/, '%')}) und steht als Zahl in der Tabelle.`, `"${bez || orig}" is a Stata time format (${fmt.replace(/^%-?/, '%')}) and appears as a number in the table.`));
        // erweiterte Fehlende (.a-.z): als benutzerdefinierte fehlende Werte, höchstens drei; der Rest wird "fehlt"
        const tags = [...new Set(roh.filter((x): x is { tag: number } => typeof x === 'object' && x !== null).map(x => x.tag).filter(t => t > 0))].sort((a, b) => a - b);
        const echte = roh.filter((x): x is number => typeof x === 'number');
        const kodes = new Map<number, number>();
        let kandidat = -9991;
        for (const t of tags.slice(0, 3)) {
          while (echte.includes(kandidat) || [...kodes.values()].includes(kandidat)) kandidat--;
          kodes.set(t, kandidat); kandidat--;
        }
        if (tags.length > 3) hinweise.push(L(`„${bez || orig}“ hat mehr als drei verschiedene fehlende Werte (.a bis .z). Ab dem vierten gelten sie einfach als „fehlt“.`, `"${bez || orig}" has more than three different missing values (.a to .z). From the fourth on they count simply as "missing".`));
        werte = roh.map(x => (typeof x === 'number' ? x : typeof x === 'object' && x !== null ? (kodes.get(x.tag) ?? null) : null));
        fehlend = [...kodes.values()];
        for (const [t, kode] of kodes) werteLabels[String(kode)] = tabelle?.['.' + String.fromCharCode(96 + t)] ?? '.' + String.fromCharCode(96 + t);
      }
      if (tabelle) for (const [w, l] of Object.entries(tabelle)) if (!w.startsWith('.')) werteLabels[String(Number(w))] = l;
    }
    const mitLabels = Object.keys(tabelle ?? {}).some(w => !w.startsWith('.'));
    const ganz = Object.keys(werteLabels).map(Number).filter(x => !fehlend.includes(x)).sort((a, b) => a - b);
    const aufeinander = ganz.length >= 4 && ganz.every((x, i) => Number.isInteger(x) && (i === 0 || x === ganz[i - 1]! + 1));
    spalten.push({
      name, bezeichnung: bez, art, format,
      // Stata kennt kein Messniveau: Zahlen mit Wertelabels sind Gruppen (nominal), eine lückenlose Reihe ab vier Stufen (Likert) ist ordinal.
      niveau: art === 'zahl' ? (mitLabels ? (aufeinander ? 'ordinal' : 'nominal') : 'metrisch') : 'nominal',
      fehlend, fehlendText: fehlend.join(', '), werteLabels
    });
    for (let i = 0; i < n; i++) zeilen[i]![k] = werte[i] ?? null;
  });

  if (umgewandelt.length) hinweise.push(L(`Zeitpunkte wurden zu Datum: ${umgewandelt.join(', ')}.`, `Date-times became dates: ${umgewandelt.join(', ')}.`));
  return { version: kopf.version, spalten, zeilen, hinweise };
}

function datum(tage: number): string {
  const d = new Date(Date.UTC(1960, 0, 1) + tage * 86400000);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
}

/** Wertelabel-Tabelle (beide Formen gleich): n, Textlänge, Offsets, Werte, Text. */
function leseTabelle(l: Leser, utf8: boolean): Record<string, string> {
  const n = l.u32(), txtlen = l.u32();
  if (n > 1_000_000 || txtlen > l.b.length) throw new StataFehler('kaputt');
  const off = Array.from({ length: n }, () => l.u32());
  const wert = Array.from({ length: n }, () => l.i32());
  const txt = l.bytes(txtlen);
  const aus: Record<string, string> = {};
  for (let i = 0; i < n; i++) {
    if (off[i]! > txtlen) throw new StataFehler('kaputt');
    const w = wert[i]!;
    // Werte im Bereich der erweiterten Fehlenden (.a-.z) sind als long-Fehlende gespeichert
    const schluessel = w > 2147483620 ? '.' + String.fromCharCode(96 + (w - 2147483621)) : String(w);
    if (w === 2147483621) continue; // "." selbst hat keine Beschriftung, die wir brauchen
    aus[schluessel] = text(txt.subarray(off[i]!), utf8);
  }
  return aus;
}

/* ---------- Stata 13-18 (Tags) ---------- */

function leseTags(b: Uint8Array): StataDaten {
  const l0 = new Leser(b, true);
  l0.erwarte('<stata_dta><header><release>');
  const version = Number(l0.ascii(3));
  if (version < 117) throw new StataFehler('kaputt');
  if (version > 121) throw new StataFehler('version', version);
  l0.erwarte('</release><byteorder>');
  const bo = l0.ascii(3);
  if (bo !== 'LSF' && bo !== 'MSF') throw new StataFehler('kaputt');
  const l = new Leser(b, bo === 'LSF');
  l.pos = l0.pos; l.erwarte('</byteorder><K>');
  const K = version === 119 || version === 121 ? l.u32() : l.u16();
  l.erwarte('</K><N>');
  const N = version === 117 ? l.u32() : l.u64();
  if (N > MAX_ZEILEN || K > 120000) throw new StataFehler('kaputt');
  l.erwarte('</N><label>');
  const lab = version === 117 ? l.u8() : l.u16(); l.bytes(lab);
  l.erwarte('</label><timestamp>');
  l.bytes(l.u8());
  l.erwarte('</timestamp></header><map>');
  const karte = Array.from({ length: 14 }, () => l.u64());
  const utf8 = version >= 118;
  const NAME = utf8 ? 129 : 33, FMT = utf8 ? 57 : 49, LBL = utf8 ? 321 : 81;
  const bei = (i: number, tag: string) => { l.pos = karte[i]!; if (karte[i]! > b.length) throw new StataFehler('kaputt'); l.erwarte(tag); };

  bei(2, '<variable_types>');
  const typcode = Array.from({ length: K }, () => l.u16());
  bei(3, '<varnames>');
  const namen = Array.from({ length: K }, () => text(l.bytes(NAME), utf8));
  bei(5, '<formats>');
  const formate = Array.from({ length: K }, () => text(l.bytes(FMT), utf8));
  bei(6, '<value_label_names>');
  const wlNamen = Array.from({ length: K }, () => text(l.bytes(NAME), utf8));
  bei(7, '<variable_labels>');
  const beschr = Array.from({ length: K }, () => text(l.bytes(LBL), utf8));

  const typen: ('byte' | 'int' | 'long' | 'float' | 'double' | 'str' | 'strl' | 'alias')[] = typcode.map(t =>
    t >= 1 && t <= 2045 ? 'str' : t === 32768 ? 'strl' : t === 65525 ? 'alias' : t === 65526 ? 'double' : t === 65527 ? 'float' : t === 65528 ? 'long' : t === 65529 ? 'int' : t === 65530 ? 'byte' : (() => { throw new StataFehler('kaputt', version, 'Typ'); })());
  const breite = typen.map((t, i) => t === 'str' ? typcode[i]! : t === 'strl' ? 8 : t === 'alias' ? 0 : { byte: 1, int: 2, long: 4, float: 4, double: 8 }[t]);
  const zeile = breite.reduce((a, c) => a + c, 0);

  bei(9, '<data>');
  if (l.pos + zeile * N > b.length) throw new StataFehler('kaputt', version, 'Daten');
  const spaltenRoh: Roh[][] = Array.from({ length: K }, () => new Array<Roh>(N));
  const strlPos: { spalte: number; zeile: number; v: number; o: number }[] = [];
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < K; k++) {
      const t = typen[k]!;
      let x: Roh;
      switch (t) {
        case 'byte': x = byteWert(l.v.getInt8(l.pos)); l.pos += 1; break;
        case 'int': x = intWert(l.i16()); break;
        case 'long': x = longWert(l.i32()); break;
        case 'float': x = floatWert(l.v.getFloat32(l.pos, l.le)); l.pos += 4; break;
        case 'double': x = doubleWert(l.v.getFloat64(l.pos, l.le)); l.pos += 8; break;
        case 'str': x = text(l.bytes(typcode[k]!), utf8); break;
        case 'alias': x = null; break; // Alias auf eine Variable in einem anderen Frame: keine eigenen Werte in der Datei
        default: {
          // strL: 117 → v (4 Byte), o (4 Byte); 118/119 → v (2 Byte), o (6 Byte)
          let v: number, o: number;
          if (version === 117) { v = l.u32(); o = l.u32(); }
          else if (l.le) { v = l.u16(); o = Number(l.v.getUint32(l.pos, true)) + l.v.getUint16(l.pos + 4, true) * 2 ** 32; l.pos += 6; }
          else { v = l.u16(); o = l.v.getUint16(l.pos, false) * 2 ** 32 + l.v.getUint32(l.pos + 2, false); l.pos += 6; }
          strlPos.push({ spalte: k, zeile: i, v, o }); x = '';
        }
      }
      spaltenRoh[k]![i] = x;
    }
  }

  if (strlPos.length) {
    bei(10, '<strls>');
    const tab = new Map<string, string>();
    while (b[l.pos] === 0x47 /* G */ ) {
      l.erwarte('GSO');
      const v = l.u32(); const o = version === 117 ? l.u32() : l.u64();
      const art = l.u8(); const len = l.u32();
      const daten = l.bytes(len);
      tab.set(`${v}:${o}`, art === 130 ? text(daten, utf8) : '');
    }
    for (const p of strlPos) if (p.v !== 0 || p.o !== 0) spaltenRoh[p.spalte]![p.zeile] = tab.get(`${p.v}:${p.o}`) ?? '';
  }

  if (typen.includes('alias') && l.pos + 7 !== karte[10]) throw new StataFehler('kaputt', version, 'Alias');
  bei(11, '<value_labels>');
  const tabellen: Wertelabels = {};
  while (l.ascii(5) === '<lbl>') {
    l.u32();
    const nm = text(l.bytes(NAME), utf8); l.bytes(3);
    tabellen[nm] = leseTabelle(l, utf8);
    l.erwarte('</lbl>');
  }
  const behalte = typen.map((t, k) => (t === 'alias' ? -1 : k)).filter(k => k >= 0);
  const aus = baue({ version, namen: behalte.map(k => namen[k]!), formate: behalte.map(k => formate[k]!), beschriftungen: behalte.map(k => beschr[k]!), wertelabelNamen: behalte.map(k => wlNamen[k]!) },
    behalte.map(k => spaltenRoh[k]!), behalte.map(k => typen[k] as Exclude<typeof typen[number], 'alias'>), tabellen);
  const alias = namen.filter((_, k) => typen[k] === 'alias');
  if (alias.length) aus.hinweise.push(L(`Verweise auf andere Stata-Frames (${alias.join(', ')}) enthalten keine eigenen Werte und wurden ausgelassen.`, `References to other Stata frames (${alias.join(', ')}) hold no values of their own and were skipped.`));
  return aus;
}

/* ---------- Stata 10-12 (114, 115) ---------- */

function leseAlt(b: Uint8Array, version: number): StataDaten {
  const le = b[1] === 2;
  const l = new Leser(b, le);
  l.pos = 4;
  const K = l.i16(); const N = l.i32();
  if (K < 0 || N < 0 || N > MAX_ZEILEN) throw new StataFehler('kaputt');
  l.bytes(81); l.bytes(18);
  const code = Array.from({ length: K }, () => l.u8());
  const typen: ('byte' | 'int' | 'long' | 'float' | 'double' | 'str')[] = code.map(t =>
    t >= 1 && t <= 244 ? 'str' : t === 251 ? 'byte' : t === 252 ? 'int' : t === 253 ? 'long' : t === 254 ? 'float' : t === 255 ? 'double' : (() => { throw new StataFehler('kaputt', version, 'Typ'); })());
  const namen = Array.from({ length: K }, () => text(l.bytes(33), false));
  l.bytes((K + 1) * 2);
  const formate = Array.from({ length: K }, () => text(l.bytes(49), false));
  const wlNamen = Array.from({ length: K }, () => text(l.bytes(33), false));
  const beschr = Array.from({ length: K }, () => text(l.bytes(81), false));
  // Erweiterungsfelder (Merkmale) überspringen: Art (1), Länge (4), Daten, Ende bei 0/0
  for (;;) { const art = l.u8(); const len = l.i32(); if (art === 0 && len === 0) break; if (len < 0) throw new StataFehler('kaputt'); l.bytes(len); }
  const breite = typen.map((t, i) => t === 'str' ? code[i]! : { byte: 1, int: 2, long: 4, float: 4, double: 8 }[t]);
  const zeile = breite.reduce((a, c) => a + c, 0);
  if (l.pos + zeile * N > b.length) throw new StataFehler('kaputt', version, 'Daten');
  const spaltenRoh: Roh[][] = Array.from({ length: K }, () => new Array<Roh>(N));
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < K; k++) {
      let x: Roh;
      switch (typen[k]!) {
        case 'byte': x = byteWert(l.v.getInt8(l.pos)); l.pos += 1; break;
        case 'int': x = intWert(l.i16()); break;
        case 'long': x = longWert(l.i32()); break;
        case 'float': x = floatWert(l.v.getFloat32(l.pos, le)); l.pos += 4; break;
        case 'double': x = doubleWert(l.v.getFloat64(l.pos, le)); l.pos += 8; break;
        default: x = text(l.bytes(code[k]!), false);
      }
      spaltenRoh[k]![i] = x;
    }
  }
  const tabellen: Wertelabels = {};
  while (l.pos + 4 <= b.length) {
    const len = l.i32();
    if (len < 0) throw new StataFehler('kaputt');
    const ende = l.pos + 36 + len; // Länge zählt ab der Tabelle (n, txtlen, …) hinter Name + Füllbytes
    const nm = text(l.bytes(33), false); l.bytes(3);
    const sub = new Leser(b, le); sub.pos = l.pos;
    tabellen[nm] = leseTabelle(sub, false);
    l.pos = Math.max(sub.pos, ende);
  }
  return baue({ version, namen, formate, beschriftungen: beschr, wertelabelNamen: wlNamen }, spaltenRoh, typen, tabellen);
}

/** Stata-Fassung zu einer Formatnummer, für Meldungen. */
export function stataFassung(version: number): string {
  return version <= 113 ? 'Stata 8' : version === 114 ? 'Stata 10/11' : version === 115 ? 'Stata 12' : version === 117 ? 'Stata 13'
    : version === 118 ? 'Stata 14-17' : version === 119 ? 'Stata 15-18' : version >= 120 && version <= 121 ? 'Stata 18/19' : L('einer neueren Stata-Fassung', 'a newer Stata version');
}
