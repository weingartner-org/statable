/**
 * Protokoll jeder Datenänderung (Abschnitt 6, Teil B). Reine Logik ohne Oberfläche und ohne Engine:
 *  - die Arten einer Änderung und ihre Merkmale (wiederholbar oder nicht),
 *  - die strenge Prüfung von PSPP-Syntax, die aus einer Vorlagendatei kommt (`pruefeSyntax`),
 *  - der Vergleich vorher/nachher (welche Spalten, wie viele Zeilen),
 *  - CSV-Export, Prüfsumme (SHA-256).
 *
 * Grundsatz: Im Protokoll und in der Vorlage stehen keine Werte aus den Daten - nur Spaltennamen, Zahlen (Zeilen) und das, was die Person selbst als Regel eingegeben hat.
 * Schritte, deren Befehl Werte aus den Daten tragen würde (Zeilennummern, Kennwerte der alten Daten, gefundene Schreibweisen), werden mit Grund „nicht wiederholbar“ ohne Befehl abgelegt.
 */
import type { Gewicht } from './gewichte';
import type { EurostatQuelle } from './eurostat';

/** Die Datei (oder Abfrage), aus der die Daten kamen: Name und Prüfsumme (SHA-256 über die Bytes); bei Daten von Eurostat dazu die Quelle mit der genauen Abfrage. */
export interface DatenDatei { name: string; sha256: string | null; eurostat?: EurostatQuelle }

/** Was eine Datenänderung ist - der Schlüssel; der Klartext kommt aus `protokollsaetze.ts`. */
export type Art =
  | 'umkodieren' | 'berechnen' | 'auswahl' | 'fehlend' | 'beschriften' | 'sortieren' | 'spalteWeg' | 'umbenennen' | 'zaehlen' | 'rang' | 'aggregieren' | 'gewicht' | 'befehl'
  | 'zusammen' | 'zelle' | 'zeilePlus' | 'zeileWeg' | 'einfuegen' | 'spaltePlus' | 'neuaufbau' | 'umformen' | 'index' | 'zeitreihe' | 'auffaellig' | 'reihenfolge' | 'raking' | 'mikro'
  | 'kategorien' | 'datencheck' | 'lesart' | 'abgleich' | 'vorlage'
  | 'klassifikation' | 'plausibel';

/** Warum ein Schritt nicht wiederholt werden kann. */
export type NichtGrund =
  | 'zeilen'        // bezieht sich auf einzelne Zeilen (Zelle, Zeile, Einfügen, Zeilennummern im Befehl)
  | 'aus-daten'     // der Befehl trüge Werte oder Kennwerte aus den damaligen Daten
  | 'zweite-datei'  // braucht eine zweite Datei
  | 'befehl'        // enthält einen Befehl oder Zeichen, die in Vorlagen nicht erlaubt sind
  | 'fehler'        // ist mit einer Fehlermeldung zu Ende gegangen
  | 'neu'           // baut die Daten als neues Projekt auf (Umformen)
  | 'art'           // diese Art ist in Vorlagen noch nicht möglich
  | 'zu-lang';

export interface Sortierschluessel { spalte: string; richtung: 'auf' | 'ab'; natuerlich: boolean }
/** Wie ein Schritt auf neuen Daten wiederholt wird: immer über dieselbe Funktion wie von Hand. */
export type Wiederhol =
  | { typ: 'syntax'; befehle: string[]; gewicht?: Gewicht | null }
  | { typ: 'sortieren'; schluessel: Sortierschluessel[]; altName: string | null }
  | { typ: 'spalteWeg'; name: string }
  | { typ: 'lesart'; modus: 'tausender' | 'zahl'; kopf: string };

export type SpaltenArt = 'zahl' | 'text' | 'datum';

/** Was das Protokoll vom Abgleich festhält: die Spalten, die Toleranzen, k und die Zählungen. */
export interface AbgleichAngabe { fall: string; k: number; anker: string[]; zahlen: { spalte: string; toleranz: number }[]; faelle: number; voll: number; teilweise: number; ohne: number; ausgeschlossen: number }

export interface ProtokollEintrag {
  nr: number;
  art: Art;
  /** Spalten, die sich geändert haben (neu, entfernt, andere Werte oder Eigenschaften): nur Namen. */
  spalten: string[];
  /** Zeilen, in denen sich mindestens eine Zelle geändert hat oder neu gefüllt wurde (bei weniger oder mehr Zeilen: der Unterschied). `null` = nicht bestimmt. */
  betroffen: number | null;
  vorher: number; nachher: number;
  zeit: number;
  quelle: 'hand' | 'vorlage';
  ergebnis: 'ok' | 'fehler' | 'abgebrochen';
  /** Nur bei Fehler/Abbruch: kein Text aus PSPP (er könnte Werte nennen), nur die Art des Grundes. */
  grund?: 'pspp' | 'person' | 'sonst';
  vorlage?: { datei: string; pruefsummeVorlage: string | null; pruefsummeDaten: string | null; datenName: string | null; schritt: number };
  /** Rückgängig: der Schritt bleibt stehen. */
  zurueck?: { zeit: number; grund: 'rueckgaengig' | 'abbruch' };
  /** Dieser Eintrag wiederholt den zurückgenommenen Eintrag mit dieser Nummer („Wiederholen“). */
  wiederholtVon?: number;
  /** Nur Vorlage-Lauf: eine vorhandene Spalte wurde einer fehlenden zugeordnet (`von` = Name in der Datei, `nach` = Name in der Vorlage). */
  zuordnung?: { von: string; nach: string };
  /** Hinweise der Prüfung vor dem Lauf, die die Person bestätigt hat (nur Zahlen). Nur bei Art `vorlage`. */
  pruefung?: { sperren: number; warnungen: number; hinweise: number; bestaetigt: boolean; zeilenNeueKategorien: number };
  /** Nur Art `abgleich` (Fälle und Kontrollen abgleichen): die Regel der Person - nur Spaltennamen und Zahlen, keine Werte aus den Daten. */
  abgleich?: AbgleichAngabe;
  // ---- für die Vorlage (kein Wert aus den Daten) ----
  wiederhol?: Wiederhol;
  nicht?: NichtGrund;
  /** Der Befehl enthält Text-Werte (Regel der Person, zum Beispiel beim Umkodieren von Texten). */
  werte?: boolean;
  /** Spalten, die vor dem Schritt da waren und die der Schritt benutzt, mit ihrer Art. */
  liest?: Record<string, SpaltenArt>;
  erzeugt?: string[];
  /** Gehört nicht in eine Vorlage (Zuordnung und Vermerk eines Vorlage-Laufs). */
  ohneVorlage?: boolean;
}

/** Ein Eintrag zählt für die Vorlage, wenn er noch gilt: nicht zurückgenommen, nicht abgebrochen, kein Vermerk. */
export const gilt = (e: ProtokollEintrag) => !e.zurueck && e.ergebnis === 'ok' && e.art !== 'vorlage' && !e.ohneVorlage;

/* ------------------------------------------------------------------------------------------------------------------------------- Art aus dem Befehl */
const ART_NACH_BEFEHL: [RegExp, Art][] = [
  [/^RECODE\b/, 'umkodieren'], [/^(COMPUTE|IF|DO IF|ELSE IF|ELSE|END IF|STRING|NUMERIC)\b/, 'berechnen'], [/^(SELECT IF|FILTER)\b/, 'auswahl'], [/^MISSING VALUES\b/, 'fehlend'],
  [/^(VARIABLE LABELS|VALUE LABELS|ADD VALUE LABELS|VARIABLE LEVEL|FORMATS)\b/, 'beschriften'], [/^SORT CASES\b/, 'sortieren'], [/^DELETE VARIABLES\b/, 'spalteWeg'], [/^RENAME VARIABLES\b/, 'umbenennen'],
  [/^COUNT\b/, 'zaehlen'], [/^RANK\b/, 'rang'], [/^AGGREGATE\b/, 'aggregieren'], [/^WEIGHT\b/, 'gewicht'], [/^(MATCH FILES|ADD FILES)\b/, 'zusammen']
];
/** Die Art nach dem ersten Befehl, der etwas tut (Hilfsbefehle wie EXECUTE zählen nicht). */
export function artAusSyntax(syntax: string): Art {
  for (const roh of syntax.split(/\.\s*(?:\r?\n|$)/)) {
    const z = roh.replace(/^\s*(?:\*[^\n]*\n)*/g, '').trim().replace(/\s+/g, ' ').toUpperCase();
    if (!z || z.startsWith('*') || z === 'EXECUTE') continue;
    for (const [re, a] of ART_NACH_BEFEHL) if (re.test(z)) return a;
    return 'befehl';
  }
  return 'befehl';
}

/* ------------------------------------------------------------------------------------------------------------------------------- Strenge Prüfung der Syntax */
const ERLAUBT: string[][] = [
  ['ADD', 'VALUE', 'LABELS'], ['VARIABLE', 'LABELS'], ['VALUE', 'LABELS'], ['MISSING', 'VALUES'], ['VARIABLE', 'LEVEL'], ['DELETE', 'VARIABLES'], ['RENAME', 'VARIABLES'], ['SORT', 'CASES'], ['SELECT', 'IF'],
  ['ELSE', 'IF'], ['DO', 'IF'], ['END', 'IF'],
  ['COMPUTE'], ['IF'], ['RECODE'], ['COUNT'], ['RANK'], ['AGGREGATE'], ['FILTER'], ['FORMATS'], ['STRING'], ['NUMERIC'], ['EXECUTE'], ['WEIGHT'], ['ELSE']
];
const MAX_ZEICHEN = 400_000, MAX_BEFEHLE = 4000, MAX_STRING = 2000;
const STEUER = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
const WORT = /^[\p{L}@#$][\p{L}\p{N}._@#$]*/u;
const ZAHL = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const OPERATOR = /^[=+\-*<>&|~]+/;
const DATEIWORTE = new Set(['FILE', 'OUTFILE', 'INFILE', 'TABLE']);

export type SyntaxGrund = 'zeichen' | 'zeichenkette' | 'befehl' | 'datei' | 'zu-lang' | 'leer' | 'zeilen';
export type SyntaxPruefung = { ok: true; befehle: string[]; hatWerte: boolean; kommentare: number } | { ok: false; grund: SyntaxGrund };

/**
 * Prüft PSPP-Syntax streng und gibt sie als Liste einzeiliger Befehle zurück, die mit Punkt enden. Was nicht in die Liste passt, wird nicht „repariert“, sondern abgelehnt.
 *  - Zeichenketten werden nach den PSPP-Regeln gelesen ('…' oder "…", Verdopplung, X'…' für Sonderzeichen); ein Zeilenumbruch oder anderes Steuerzeichen darin ist verboten.
 *  - Außerhalb von Zeichenketten sind nur Buchstaben, Ziffern, `_ . # @ $`, Leerraum und `( ) , / = + - * < > & | ~` erlaubt (kein Semikolon, kein Ausrufezeichen, kein `/*`).
 *  - Jeder Befehl muss mit einem der erlaubten Befehle beginnen (nur solche, die die Daten umformen); Dateibezüge sind nur `OUTFILE=*`.
 *  - Leerraum außerhalb von Zeichenketten wird zu einem Leerzeichen: jeder Befehl steht danach in einer Zeile, ein Punkt mitten darin kann ihn nicht teilen.
 * Kommentarzeilen (`* …`, `COMMENT …`) werden weggelassen und gezählt. Beschriftungen und Namen gelangen nie als Code in R: diese Prüfung gilt nur für PSPP.
 */
export function pruefeSyntax(text: string): SyntaxPruefung {
  if (typeof text !== 'string') return { ok: false, grund: 'zeichen' };
  if (text.length > MAX_ZEICHEN) return { ok: false, grund: 'zu-lang' };
  if (/\bANY\s*\(\s*\$CASENUM\s*,/i.test(text)) return { ok: false, grund: 'zeilen' };
  const n = text.length;
  const befehle: string[] = [];
  let hatWerte = false, kommentare = 0;
  let i = 0;
  let aus = '', tiefe = 0, strings = 0;
  const weiss = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v';
  const neu = () => { aus = ''; tiefe = 0; strings = 0; };
  /** Ein Befehl ist zu Ende (Punkt): prüfen und ablegen. */
  const ende = (): SyntaxGrund | null => {
    const t0 = aus.trim();
    if (!t0) return null;
    if (tiefe !== 0) return 'zeichen';
    const w = (/^([A-Za-z]+)(?:\s+([A-Za-z]+))?(?:\s+([A-Za-z]+))?/.exec(t0) ?? []).slice(1).filter(Boolean).map(x => x.toUpperCase());
    const passt = ERLAUBT.find(e => e.every((x, k) => w[k] === x));
    if (!passt) return 'befehl';
    // Dateibezüge: FILE=, OUTFILE=, INFILE=, TABLE= sind verboten, außer OUTFILE=* bei AGGREGATE
    const toks = t0.match(/'(?:[^']|'')*'|"(?:[^"]|"")*"|[\p{L}@#$][\p{L}\p{N}._@#$]*|\S/gu) ?? [];
    for (let k = 0; k < toks.length; k++) {
      if (!DATEIWORTE.has(toks[k]!.toUpperCase()) || toks[k + 1] !== '=') continue;
      if (!(toks[k]!.toUpperCase() === 'OUTFILE' && passt[0] === 'AGGREGATE' && toks[k + 2] === '*')) return 'datei';
    }
    if (strings && passt[passt.length - 1] !== 'LABELS') hatWerte = true;
    befehle.push(t0 + '.');
    return null;
  };
  while (i < n) {
    const c = text[i]!;
    if (weiss(c)) { if (aus && !aus.endsWith(' ')) aus += ' '; i++; continue; }
    // Kommentar: nur am Anfang eines Befehls
    if (!aus.trim() && (c === '*' || (text.slice(i, i + 7).toUpperCase() === 'COMMENT' && !/[\p{L}\p{N}._@#$]/u.test(text[i + 7] ?? ' ')))) {
      const m = /\.[ \t]*(?:\r?\n|$)/.exec(text.slice(i));
      i = m ? i + m.index + m[0].length : n; kommentare++; neu(); continue;
    }
    if (c === "'" || c === '"') {
      const hex = /[Xx]$/.test(aus) && !/[\p{L}\p{N}._@#$]/u.test(aus.slice(-2, -1) || ' ');   // X'0A': Sonderzeichen als Hex
      let j = i + 1, inhalt = '';
      for (;;) {
        const ch = text[j];
        if (ch === undefined) return { ok: false, grund: 'zeichenkette' };
        if (ch === c) { if (text[j + 1] === c) { inhalt += c; j += 2; continue; } break; }
        if (STEUER.test(ch)) return { ok: false, grund: 'zeichenkette' };
        inhalt += ch; j++;
      }
      if (Array.from(inhalt).length > MAX_STRING) return { ok: false, grund: 'zeichenkette' };
      if (hex && (!/^[0-9A-Fa-f]*$/.test(inhalt) || inhalt.length % 2)) return { ok: false, grund: 'zeichenkette' };
      aus += text.slice(i, j + 1); strings++; i = j + 1; continue;
    }
    if (c === '.' && (i + 1 >= n || weiss(text[i + 1]!))) {
      const g = ende(); if (g) return { ok: false, grund: g };
      if (befehle.length > MAX_BEFEHLE) return { ok: false, grund: 'zu-lang' };
      neu(); i++; continue;
    }
    if (c === '(') { tiefe++; aus += c; i++; continue; }
    if (c === ')') { tiefe--; if (tiefe < 0) return { ok: false, grund: 'zeichen' }; aus += c; i++; continue; }
    if (c === ',') { aus += c; i++; continue; }
    if (c === '/') { if (text[i + 1] === '*') return { ok: false, grund: 'zeichen' }; aus += c; i++; continue; }
    const rest = text.slice(i, i + 200);
    let m: RegExpExecArray | null;
    if ((m = OPERATOR.exec(rest))) { aus += m[0]; i += m[0].length; continue; }
    if ((m = WORT.exec(rest))) {
      let w = m[0]; const nach = text[i + w.length];
      if (w.endsWith('.') && (nach === undefined || weiss(nach))) w = w.slice(0, -1);   // der Punkt gehört dem Befehlsende
      aus += w; i += w.length; continue;
    }
    if ((m = ZAHL.exec(rest))) {
      let z = m[0]; const nach = text[i + z.length];
      if (z.endsWith('.') && (nach === undefined || weiss(nach))) z = z.slice(0, -1);
      aus += z; i += z.length; continue;
    }
    return { ok: false, grund: 'zeichen' };
  }
  if (aus.trim()) return { ok: false, grund: 'zeichen' };   // der letzte Befehl endet nicht mit einem Punkt
  if (!befehle.length) return { ok: false, grund: 'leer' };
  return { ok: true, befehle, hatWerte, kommentare };
}

/** Namen (Bezeichner) in den Befehlen, außerhalb von Zeichenketten - für „welche Spalten benutzt der Schritt“. */
export function bezeichnerIn(befehle: string[]): string[] {
  const raus = new Set<string>();
  for (const b of befehle) {
    const ohne = b.replace(/'(?:[^']|'')*'|"(?:[^"]|"")*"/g, ' ');
    for (const m of ohne.matchAll(/[\p{L}@#$][\p{L}\p{N}._@#$]*/gu)) raus.add(m[0].replace(/\.+$/, ''));
  }
  return [...raus];
}

/* ------------------------------------------------------------------------------------------------------------------------------- Vorher und nachher */
export interface Stand { spalten: { name: string; art: SpaltenArt }[]; zeilen: (string | number | null)[][]; zeichen: string[] }

/** Der Stand einer Tabelle für den Vergleich: pro Spalte ein Fingerabdruck der Eigenschaften (Beschriftung, Niveau, Format, Wertebeschriftungen, fehlende Werte). Keine Datenwerte. */
export function standVon(spalten: readonly { name: string; art: SpaltenArt; bezeichnung?: string; niveau?: string; format?: string; fehlend?: number[]; werteLabels?: Record<string, string> }[], zeilen: Stand['zeilen']): Stand {
  return { spalten: spalten.map(s => ({ name: s.name, art: s.art })), zeilen, zeichen: spalten.map(s => JSON.stringify([s.bezeichnung ?? '', s.niveau ?? '', s.format ?? '', s.fehlend ?? [], s.werteLabels ?? {}])) };
}

const gleich = (a: string | number | null | undefined, b: string | number | null | undefined) => (a ?? null) === (b ?? null) || (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b));

/** Welche Spalten haben sich geändert und in wie vielen Zeilen. Die Zeilen werden nach Position verglichen. */
export function vergleiche(vor: Stand, nach: Stand): { spalten: string[]; betroffen: number; erzeugt: string[] } {
  const nameVor = new Map(vor.spalten.map((s, i) => [s.name.toLowerCase(), i])), nameNach = new Map(nach.spalten.map((s, i) => [s.name.toLowerCase(), i]));
  const spalten: string[] = [], erzeugt: string[] = [];
  const paare: [number, number][] = [];
  for (const [k, j] of nameNach) {
    const i = nameVor.get(k);
    const sp = nach.spalten[j]!;
    if (i === undefined) { spalten.push(sp.name); erzeugt.push(sp.name); continue; }
    paare.push([i, j]);
    if (vor.spalten[i]!.art !== sp.art || vor.zeichen[i] !== nach.zeichen[j]) spalten.push(sp.name);
  }
  for (const [k, i] of nameVor) if (!nameNach.has(k)) spalten.push(vor.spalten[i]!.name);
  const nV = vor.zeilen.length, nN = nach.zeilen.length, gemeinsam = Math.min(nV, nN);
  let betroffen = Math.abs(nV - nN);
  const geaendert = new Set<string>();
  for (let r = 0; r < gemeinsam; r++) {
    const a = vor.zeilen[r]!, b = nach.zeilen[r]!;
    let ver = false;
    for (const [i, j] of paare) if (!gleich(a[i], b[j])) { ver = true; geaendert.add(nach.spalten[j]!.name); }
    for (const sp of erzeugt) { const j = nameNach.get(sp.toLowerCase())!; if (b[j] !== null && b[j] !== undefined) ver = true; }
    if (ver) betroffen++;
  }
  for (const g of geaendert) if (!spalten.includes(g)) spalten.push(g);
  return { spalten, betroffen, erzeugt };
}

/* ------------------------------------------------------------------------------------------------------------------------------- Prüfsumme */
/** SHA-256 über die Bytes (im Browser mit `crypto.subtle`), als 64 Zeichen Hex. `null`, wenn der Browser es nicht kann (unsicherer Kontext). */
export async function pruefsumme(bytes: ArrayBuffer | Uint8Array): Promise<string | null> {
  try {
    const sub = (globalThis as { crypto?: Crypto }).crypto?.subtle; if (!sub) return null;
    const roh = bytes instanceof Uint8Array ? new Uint8Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer) : new Uint8Array(bytes);
    const h = new Uint8Array(await sub.digest('SHA-256', roh));
    return [...h].map(b => b.toString(16).padStart(2, '0')).join('');
  } catch { return null; }
}
export const istPruefsumme = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x);

/* ------------------------------------------------------------------------------------------------------------------------------- Lesen aus der Projektdatei */
const ARTEN: Art[] = ['umkodieren', 'berechnen', 'auswahl', 'fehlend', 'beschriften', 'sortieren', 'spalteWeg', 'umbenennen', 'zaehlen', 'rang', 'aggregieren', 'gewicht', 'befehl', 'zusammen', 'zelle', 'zeilePlus', 'zeileWeg', 'einfuegen', 'spaltePlus', 'neuaufbau', 'umformen', 'index', 'zeitreihe', 'auffaellig', 'reihenfolge', 'raking', 'mikro', 'kategorien', 'datencheck', 'lesart', 'abgleich', 'klassifikation', 'plausibel', 'vorlage'];
const NICHT: NichtGrund[] = ['zeilen', 'aus-daten', 'zweite-datei', 'befehl', 'fehler', 'neu', 'art', 'zu-lang'];
const zahl = (x: unknown, vorgabe = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : vorgabe);
const text = (x: unknown, max = 300) => (typeof x === 'string' ? x.slice(0, max) : '');
const nameListe = (x: unknown) => (Array.isArray(x) ? x.filter((n): n is string => typeof n === 'string').map(n => n.slice(0, 200)).slice(0, 2000) : []);

/** Ein Wiederhol-Angabe aus fremder Hand prüfen: Syntax streng, Namen als PSPP-Namen. Alles andere → `null`. */
export function leseWiederhol(w: unknown, nameOk: (n: unknown) => n is string, gewichtLesen: (g: unknown) => Gewicht | null): Wiederhol | null {
  if (!w || typeof w !== 'object') return null;
  const o = w as Record<string, unknown>;
  if (o.typ === 'syntax') {
    if (!Array.isArray(o.befehle) || !o.befehle.length || o.befehle.some(b => typeof b !== 'string')) return null;
    const p = pruefeSyntax((o.befehle as string[]).join('\n'));
    if (!p.ok) return null;
    const g = o.gewicht === undefined ? undefined : o.gewicht === null ? null : gewichtLesen(o.gewicht);
    if (o.gewicht && !g) return null;
    if (g && !nameOk(g.spalte)) return null;
    return { typ: 'syntax', befehle: p.befehle, ...(g !== undefined ? { gewicht: g } : {}) };
  }
  if (o.typ === 'sortieren') {
    if (!Array.isArray(o.schluessel) || !o.schluessel.length || o.schluessel.length > 20) return null;
    const sch: Sortierschluessel[] = [];
    for (const k of o.schluessel as Record<string, unknown>[]) {
      if (!k || !nameOk(k.spalte) || (k.richtung !== 'auf' && k.richtung !== 'ab')) return null;
      sch.push({ spalte: k.spalte, richtung: k.richtung, natuerlich: k.natuerlich === true });
    }
    if (o.altName !== null && o.altName !== undefined && !nameOk(o.altName)) return null;
    return { typ: 'sortieren', schluessel: sch, altName: (o.altName as string | null | undefined) ?? null };
  }
  if (o.typ === 'spalteWeg') return nameOk(o.name) ? { typ: 'spalteWeg', name: o.name } : null;
  if (o.typ === 'lesart') return (o.modus === 'tausender' || o.modus === 'zahl') && typeof o.kopf === 'string' && o.kopf.length > 0 && o.kopf.length <= 300 ? { typ: 'lesart', modus: o.modus, kopf: o.kopf } : null;
  return null;
}

/** Das Protokoll aus der Projektdatei oder der Ablage: was nicht passt, wird weggelassen (nie ein Absturz). */
export function leseProtokoll(x: unknown, nameOk: (n: unknown) => n is string, gewichtLesen: (g: unknown) => Gewicht | null): ProtokollEintrag[] {
  if (!Array.isArray(x)) return [];
  const aus: ProtokollEintrag[] = [];
  for (const r of x.slice(0, 100_000)) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    if (!ARTEN.includes(o.art as Art)) continue;
    const e: ProtokollEintrag = {
      nr: aus.length + 1, art: o.art as Art, spalten: nameListe(o.spalten), betroffen: o.betroffen === null ? null : zahl(o.betroffen), vorher: zahl(o.vorher), nachher: zahl(o.nachher), zeit: zahl(o.zeit),
      quelle: o.quelle === 'vorlage' ? 'vorlage' : 'hand', ergebnis: o.ergebnis === 'fehler' || o.ergebnis === 'abgebrochen' ? o.ergebnis : 'ok'
    };
    if (o.nr !== e.nr && typeof o.nr === 'number') e.nr = o.nr;
    if (o.grund === 'pspp' || o.grund === 'person' || o.grund === 'sonst') e.grund = o.grund;
    const v = o.vorlage as Record<string, unknown> | undefined;
    if (v && typeof v === 'object') e.vorlage = { datei: text(v.datei, 200), pruefsummeVorlage: istPruefsumme(v.pruefsummeVorlage) ? v.pruefsummeVorlage : null, pruefsummeDaten: istPruefsumme(v.pruefsummeDaten) ? v.pruefsummeDaten : null, datenName: typeof v.datenName === 'string' ? text(v.datenName, 200) : null, schritt: zahl(v.schritt) };
    const z = o.zurueck as Record<string, unknown> | undefined;
    if (z && typeof z === 'object') e.zurueck = { zeit: zahl(z.zeit), grund: z.grund === 'abbruch' ? 'abbruch' : 'rueckgaengig' };
    if (typeof o.wiederholtVon === 'number') e.wiederholtVon = o.wiederholtVon;
    const zu = o.zuordnung as Record<string, unknown> | undefined;
    if (zu && typeof zu === 'object') e.zuordnung = { von: text(zu.von, 200), nach: text(zu.nach, 200) };
    const p = o.pruefung as Record<string, unknown> | undefined;
    if (p && typeof p === 'object') e.pruefung = { sperren: zahl(p.sperren), warnungen: zahl(p.warnungen), hinweise: zahl(p.hinweise), bestaetigt: p.bestaetigt === true, zeilenNeueKategorien: zahl(p.zeilenNeueKategorien) };
    const ab = o.abgleich as Record<string, unknown> | undefined;
    if (ab && typeof ab === 'object') e.abgleich = { fall: text(ab.fall, 200), k: zahl(ab.k), anker: nameListe(ab.anker).slice(0, 50), zahlen: (Array.isArray(ab.zahlen) ? ab.zahlen : []).slice(0, 50).filter((z): z is Record<string, unknown> => !!z && typeof z === 'object').map(z => ({ spalte: text(z.spalte, 200), toleranz: zahl(z.toleranz) })),
      faelle: zahl(ab.faelle), voll: zahl(ab.voll), teilweise: zahl(ab.teilweise), ohne: zahl(ab.ohne), ausgeschlossen: zahl(ab.ausgeschlossen) };
    const w = leseWiederhol(o.wiederhol, nameOk, gewichtLesen); if (w) e.wiederhol = w;
    if (NICHT.includes(o.nicht as NichtGrund)) e.nicht = o.nicht as NichtGrund;
    if (o.werte === true) e.werte = true;
    if (o.liest && typeof o.liest === 'object') { const l: Record<string, SpaltenArt> = {}; for (const [k, a] of Object.entries(o.liest as Record<string, unknown>).slice(0, 2000)) if (a === 'zahl' || a === 'text' || a === 'datum') l[k.slice(0, 200)] = a; e.liest = l; }
    if (o.erzeugt) e.erzeugt = nameListe(o.erzeugt);
    if (o.ohneVorlage === true) e.ohneVorlage = true;
    aus.push(e);
  }
  return aus;
}

/* ------------------------------------------------------------------------------------------------------------------------------- CSV */
/** Eine CSV-Zelle: Anführungszeichen verdoppeln; Zellen, die mit = + - @ beginnen, bekommen ein Apostroph (Tabellenkalkulationen würden sie sonst als Formel lesen). */
export function csvZelle(w: string | number | null | undefined): string {
  let t = w === null || w === undefined ? '' : String(w);
  if (/^[=+\-@\t\r]/.test(t) && !/^-?\d+([.,]\d+)?$/.test(t)) t = "'" + t;
  return /[";\r\n,]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}
