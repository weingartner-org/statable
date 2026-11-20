/**
 * Plausibilitätsregeln (Abschnitt 4): Regeln anlegen, Fälle auflisten, nichts ändern. Rechnet in JavaScript, ohne `eval` und ohne freien Ausdruck.
 * Fünf feste Arten: Wertebereich, erlaubte Werte, „wenn A, dann B“ mit festen Vergleichen, Summe von Spalten gleich Spalte (mit Toleranz), eindeutiger Schlüssel.
 *
 * Grundsätze:
 *  - Ein fehlender Wert in einem nötigen Eingang macht die Regel für diese Zeile „nicht prüfbar“. Das wird eigens gezählt, nie als verletzt.
 *  - Es wird nichts korrigiert, nichts geändert. Die Prüfung liest nur.
 *  - Bei vielen Zeilen läuft die Prüfung in Portionen und gibt dazwischen die Hand zurück (kein Einfrieren).
 *  - Regeln aus einer Datei sind fremde Eingabe: `leseRegeln` prüft Typen, Längen und Anzahl und verwirft den Rest.
 */
import { L, Lp, d } from './sitzung.svelte';
import { istFehlend } from './fehlend';

export const PLAUSI_MAX_REGELN = 50, PLAUSI_MAX_WERTE = 500, PLAUSI_MAX_ZEILEN_LISTE = 1000, PLAUSI_PORTION = 50_000, PLAUSI_MAX_NAME = 200, PLAUSI_MAX_TEXT = 200;

export type Vergleich = '=' | '!=' | '<' | '<=' | '>' | '>=';
export const VERGLEICHE: Vergleich[] = ['=', '!=', '<', '<=', '>', '>='];
export interface Bedingung { spalte: string; op: Vergleich; wert: string | number }

export type Regel =
  | { id: string; art: 'bereich'; spalte: string; min: number | null; max: number | null }
  | { id: string; art: 'werte'; spalte: string; erlaubt: (string | number)[] }
  | { id: string; art: 'wenn'; wenn: Bedingung; dann: Bedingung }
  | { id: string; art: 'summe'; teile: string[]; ziel: string; toleranz: number }
  | { id: string; art: 'schluessel'; spalten: string[] };
export type RegelArt = Regel['art'];
export const REGEL_ARTEN: RegelArt[] = ['bereich', 'werte', 'wenn', 'summe', 'schluessel'];

/** Was die Prüfung von einer Spalte wissen muss. */
export interface PlausiSpalte { name: string; art: 'zahl' | 'text' | 'datum'; fehlend: number[]; fehlendBereich?: { von: number; bis: number } | null; leerGueltig?: boolean }
export type PlausiZelle = string | number | null | undefined;

/* ------------------------------------------------------------------------------------------------------------------------------- Eingabe lesen */
/** Eine Zahl, wie sie getippt wird: mit Punkt oder Komma, sonst nichts. */
export function zahlLesen(t: string): number | null {
  const x = String(t).trim().replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(x)) return null;
  const z = Number(x);
  return Number.isFinite(z) ? z : null;
}

const istObjekt = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const eigen = (o: Record<string, unknown>, k: string): unknown => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const name = (x: unknown): string | null => (typeof x === 'string' && x.length > 0 && x.length <= PLAUSI_MAX_NAME && !/[\u0000-\u001f\u007f]/.test(x) ? x : null);
const wertOk = (x: unknown): x is string | number => (typeof x === 'number' && Number.isFinite(x)) || (typeof x === 'string' && x.length <= PLAUSI_MAX_TEXT && !/[\u0000-\u001f\u007f]/.test(x));
const zahlOk = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const idOk = (x: unknown, nr: number): string => (typeof x === 'string' && /^[A-Za-z0-9_-]{1,20}$/.test(x) ? x : `r${nr}`);

function bedingung(x: unknown): Bedingung | null {
  if (!istObjekt(x)) return null;
  const sp = name(eigen(x, 'spalte')), op = eigen(x, 'op'), w = eigen(x, 'wert');
  if (!sp || !VERGLEICHE.includes(op as Vergleich) || !wertOk(w)) return null;
  return { spalte: sp, op: op as Vergleich, wert: w };
}

/** Regeln aus fremder Hand (Projektdatei, Regeldatei, Vorlage): was nicht passt, wird weggelassen. Höchstens 50 Regeln, 500 Werte je Regel. Wirft nie. */
export function leseRegeln(roh: unknown): Regel[] {
  if (!Array.isArray(roh)) return [];
  const aus: Regel[] = [];
  const ids = new Set<string>();
  for (const r of roh.slice(0, PLAUSI_MAX_REGELN * 2)) {
    if (aus.length >= PLAUSI_MAX_REGELN) break;
    if (!istObjekt(r)) continue;
    let id = idOk(eigen(r, 'id'), aus.length + 1);
    while (ids.has(id)) id += 'x';
    const art = eigen(r, 'art');
    let neu: Regel | null = null;
    if (art === 'bereich') {
      const sp = name(eigen(r, 'spalte')), mi = eigen(r, 'min') ?? null, ma = eigen(r, 'max') ?? null;
      if (sp && (mi === null || zahlOk(mi)) && (ma === null || zahlOk(ma)) && (mi !== null || ma !== null) && !(mi !== null && ma !== null && (mi as number) > (ma as number))) neu = { id, art, spalte: sp, min: mi as number | null, max: ma as number | null };
    } else if (art === 'werte') {
      const sp = name(eigen(r, 'spalte')), e = eigen(r, 'erlaubt');
      if (sp && Array.isArray(e) && e.length > 0 && e.length <= PLAUSI_MAX_WERTE && e.every(wertOk)) neu = { id, art, spalte: sp, erlaubt: [...e] as (string | number)[] };
    } else if (art === 'wenn') {
      const a = bedingung(eigen(r, 'wenn')), b = bedingung(eigen(r, 'dann'));
      if (a && b) neu = { id, art, wenn: a, dann: b };
    } else if (art === 'summe') {
      const t = eigen(r, 'teile'), z = name(eigen(r, 'ziel')), tol = eigen(r, 'toleranz');
      if (Array.isArray(t) && t.length >= 2 && t.length <= 50 && z && t.every(x => name(x) !== null) && zahlOk(tol) && tol >= 0) neu = { id, art, teile: [...t] as string[], ziel: z, toleranz: tol };
    } else if (art === 'schluessel') {
      const sp = eigen(r, 'spalten');
      if (Array.isArray(sp) && sp.length >= 1 && sp.length <= 10 && sp.every(x => name(x) !== null)) neu = { id, art, spalten: [...sp] as string[] };
    }
    if (neu) { ids.add(id); aus.push(neu); }
  }
  return aus;
}

/** Die Regeln als Datei (JSON, ohne Daten): Format und Version stehen drin, damit eine fremde Datei erkannt wird. */
export const PLAUSI_FORMAT = 'statable-regeln';
export const PLAUSI_DATEI_MAX = 2 * 1024 * 1024;
export const regelnAlsText = (regeln: readonly Regel[]) => JSON.stringify({ format: PLAUSI_FORMAT, version: 1, regeln }, null, 1);
export function regelnAusText(text: string): { ok: true; regeln: Regel[]; verworfen: number } | { ok: false; grund: 'unlesbar' | 'zu-gross' | 'fremd' } {
  if (typeof text !== 'string') return { ok: false, grund: 'unlesbar' };
  if (text.length > PLAUSI_DATEI_MAX) return { ok: false, grund: 'zu-gross' };
  let o: unknown;
  try { o = JSON.parse(text); } catch { return { ok: false, grund: 'unlesbar' }; }
  if (!istObjekt(o)) return { ok: false, grund: 'unlesbar' };
  if (eigen(o, 'format') !== PLAUSI_FORMAT || !Array.isArray(eigen(o, 'regeln'))) return { ok: false, grund: 'fremd' };
  const roh = eigen(o, 'regeln') as unknown[];
  const regeln = leseRegeln(roh);
  return { ok: true, regeln, verworfen: Math.max(0, Math.min(roh.length, PLAUSI_MAX_REGELN * 2) - regeln.length) };
}

/* ------------------------------------------------------------------------------------------------------------------------------- Prüfen */
export interface RegelErgebnis {
  id: string;
  /** Zeilen, in denen alle nötigen Eingänge da waren */
  geprueft: number;
  verletzt: number;
  /** Zeilen mit einem fehlenden Wert in einem nötigen Eingang */
  nichtPruefbar: number;
  /** „Wenn A, dann B“: in so vielen geprüften Zeilen traf die Bedingung zu (sonst gilt die Regel dort als erfüllt, ohne dass B nötig war) */
  bedingungZutraf?: number;
  /** Spalten der Regel, die es in den Daten nicht gibt: Die Regel wurde nicht geprüft. */
  spaltenFehlen: string[];
  /** Zahlenvergleich mit einer Textspalte oder ähnliches: die Regel passt nicht zur Art der Spalte */
  artPasstNicht: string[];
}
export interface PlausiErgebnis {
  zeilen: number;
  regeln: RegelErgebnis[];
  /** Die ersten Zeilen (nach Zeilennummer ab 0) mit mindestens einer verletzten Regel: Zeile und die Nummern der Regeln (ab 0) */
  liste: { zeile: number; regeln: number[] }[];
  /** Zeilen mit mindestens einer verletzten Regel */
  zeilenVerletzt: number;
  /** je Zeile die Zahl verletzter Regeln (für die neue Spalte); `null`, wenn nicht verlangt */
  anzahl: Uint16Array | null;
  abgebrochen: boolean;
}

export interface PlausiOpt {
  portion?: number;
  /** Zusätzlich die Zahl verletzter Regeln je Zeile festhalten */
  mitAnzahl?: boolean;
  signal?: AbortSignal;
  /** Nach jeder Portion: bisher bearbeitete Zeilen */
  fortschritt?: (bearbeitet: number, gesamt: number) => void;
  /** Gibt die Hand zurück (Vorgabe: `setTimeout`); im Test austauschbar */
  pause?: () => Promise<void>;
}

const pauseVorgabe = () => new Promise<void>(r => setTimeout(r, 0));
const spaltenIndex = (spalten: readonly PlausiSpalte[]) => new Map(spalten.map((s, i) => [s.name.toLowerCase(), i]));

/** Ist die Zelle fehlend? Leer, ungültig, „keine Angabe“-Code oder (bei Text) der leere Text. */
export function zelleFehlt(sp: PlausiSpalte, v: PlausiZelle): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'number') return Number.isNaN(v) || istFehlend(sp, v);
  if (sp.art === 'text') return v === '' && sp.leerGueltig !== true;
  return v === '';
}

function vergleiche(a: string | number, op: Vergleich, b: string | number): boolean {
  switch (op) {
    case '=': return a === b;
    case '!=': return a !== b;
    case '<': return a < b;
    case '<=': return a <= b;
    case '>': return a > b;
    case '>=': return a >= b;
  }
}

/** Die Spalten (Namen), die eine Regel braucht. */
export function regelSpalten(r: Regel): string[] {
  switch (r.art) {
    case 'bereich': case 'werte': return [r.spalte];
    case 'wenn': return [r.wenn.spalte, r.dann.spalte];
    case 'summe': return [...r.teile, r.ziel];
    case 'schluessel': return [...r.spalten];
  }
}

/** Zahl und Text müssen zur Spalte passen: ein Zahlenvergleich nur bei Zahlenspalten, ein Textwert nur bei Textspalten; Datumsspalten nur für den Schlüssel. */
function artPrueft(r: Regel, spalten: readonly PlausiSpalte[], idx: Map<string, number>): string[] {
  const art = (n: string) => spalten[idx.get(n.toLowerCase()) ?? -1]?.art;
  const schlecht: string[] = [];
  const zahlSpalte = (n: string) => { if (art(n) !== undefined && art(n) !== 'zahl') schlecht.push(n); };
  const passt = (b: Bedingung) => {
    const a = art(b.spalte); if (a === undefined) return;
    if (a === 'datum') { schlecht.push(b.spalte); return; }
    if (a === 'zahl' && typeof b.wert !== 'number') schlecht.push(b.spalte);
    if (a === 'text' && (typeof b.wert !== 'string' || (b.op !== '=' && b.op !== '!='))) schlecht.push(b.spalte);
  };
  switch (r.art) {
    case 'bereich': zahlSpalte(r.spalte); break;
    case 'werte': {
      const a = art(r.spalte);
      if (a === 'datum') schlecht.push(r.spalte);
      else if (a === 'zahl' && r.erlaubt.some(x => typeof x !== 'number')) schlecht.push(r.spalte);
      else if (a === 'text' && r.erlaubt.some(x => typeof x !== 'string')) schlecht.push(r.spalte);
      break;
    }
    case 'wenn': passt(r.wenn); passt(r.dann); break;
    case 'summe': for (const n of [...r.teile, r.ziel]) zahlSpalte(n); break;
    case 'schluessel': break;
  }
  return [...new Set(schlecht)];
}

/**
 * Prüft die Regeln an den Zeilen, in Portionen. Ändert nichts. `zeilen` darf sehr groß sein (1 Mio. Zeilen); zwischen den Portionen läuft `opt.pause`.
 * Schlüssel: Zwei Durchgänge (zählen, dann markieren), weil erst am Ende feststeht, welche Schlüssel doppelt sind. Eine Zeile mit fehlendem Teil des Schlüssels ist nicht prüfbar und zählt nicht als Duplikat.
 */
export async function pruefeRegeln(spalten: readonly PlausiSpalte[], zeilen: readonly (readonly PlausiZelle[])[], regeln: readonly Regel[], opt: PlausiOpt = {}): Promise<PlausiErgebnis> {
  const n = zeilen.length, portion = Math.max(1, opt.portion ?? PLAUSI_PORTION), pause = opt.pause ?? pauseVorgabe;
  const idx = spaltenIndex(spalten);
  const ergebnisse: RegelErgebnis[] = regeln.map(r => ({ id: r.id, geprueft: 0, verletzt: 0, nichtPruefbar: 0, ...(r.art === 'wenn' ? { bedingungZutraf: 0 } : {}), spaltenFehlen: regelSpalten(r).filter(x => !idx.has(x.toLowerCase())), artPasstNicht: artPrueft(r, spalten, idx) }));
  const aktiv = regeln.map((_, i) => ergebnisse[i]!.spaltenFehlen.length === 0 && ergebnisse[i]!.artPasstNicht.length === 0);
  const pos = (nm: string) => idx.get(nm.toLowerCase())!;
  const anzahl = opt.mitAnzahl ? new Uint16Array(n) : null;
  const liste: { zeile: number; regeln: number[] }[] = [];
  let zeilenVerletzt = 0, abgebrochen = false;

  // Schlüssel: erst zählen
  const zaehler = new Map<number, Map<string, number>>();
  const schluesselVon = (r: Extract<Regel, { art: 'schluessel' }>, z: readonly PlausiZelle[], ps: number[]): string | null => {
    const teile: string[] = [];
    for (let k = 0; k < ps.length; k++) {
      const v = z[ps[k]!];
      if (zelleFehlt(spalten[ps[k]!]!, v)) return null;
      teile.push(typeof v === 'number' ? 'n' + String(v) : 's' + String(v));
    }
    return JSON.stringify(teile);
  };
  const schluesselPos = new Map<number, number[]>();
  regeln.forEach((r, i) => { if (r.art === 'schluessel' && aktiv[i]) { schluesselPos.set(i, r.spalten.map(pos)); zaehler.set(i, new Map()); } });

  const gesamt = n * (zaehler.size ? 2 : 1);
  let fertig = 0;
  const weiter = async (): Promise<boolean> => {
    opt.fortschritt?.(fertig, gesamt);
    await pause();
    if (opt.signal?.aborted) { abgebrochen = true; return false; }
    return true;
  };
  if (zaehler.size) {
    for (let start = 0; start < n; start += portion) {
      const ende = Math.min(n, start + portion);
      for (let zi = start; zi < ende; zi++) {
        const z = zeilen[zi]!;
        for (const [i, m] of zaehler) { const k = schluesselVon(regeln[i] as Extract<Regel, { art: 'schluessel' }>, z, schluesselPos.get(i)!); if (k !== null) m.set(k, (m.get(k) ?? 0) + 1); }
      }
      fertig = ende;
      if (!(await weiter())) return { zeilen: n, regeln: ergebnisse, liste, zeilenVerletzt, anzahl, abgebrochen };
    }
  }

  for (let start = 0; start < n; start += portion) {
    const ende = Math.min(n, start + portion);
    for (let zi = start; zi < ende; zi++) {
      const z = zeilen[zi]!;
      let verletzte: number[] | null = null;
      for (let i = 0; i < regeln.length; i++) {
        if (!aktiv[i]) continue;
        const r = regeln[i]!, e = ergebnisse[i]!;
        let ergebnis: 'ok' | 'verletzt' | 'fehlt' = 'ok';
        switch (r.art) {
          case 'bereich': {
            const p = pos(r.spalte), v = z[p];
            if (zelleFehlt(spalten[p]!, v) || typeof v !== 'number') ergebnis = 'fehlt';
            else if ((r.min !== null && v < r.min) || (r.max !== null && v > r.max)) ergebnis = 'verletzt';
            break;
          }
          case 'werte': {
            const p = pos(r.spalte), v = z[p];
            if (zelleFehlt(spalten[p]!, v)) ergebnis = 'fehlt';
            else if (!r.erlaubt.includes(v as string | number)) ergebnis = 'verletzt';
            break;
          }
          case 'wenn': {
            const pa = pos(r.wenn.spalte), va = z[pa];
            if (zelleFehlt(spalten[pa]!, va)) { ergebnis = 'fehlt'; break; }
            if (!vergleiche(va as string | number, r.wenn.op, r.wenn.wert)) break;
            const pb = pos(r.dann.spalte), vb = z[pb];
            if (zelleFehlt(spalten[pb]!, vb)) { ergebnis = 'fehlt'; break; }
            e.bedingungZutraf = (e.bedingungZutraf ?? 0) + 1;
            if (!vergleiche(vb as string | number, r.dann.op, r.dann.wert)) ergebnis = 'verletzt';
            break;
          }
          case 'summe': {
            let s = 0, fehlt = false;
            for (const t of r.teile) { const p = pos(t), v = z[p]; if (zelleFehlt(spalten[p]!, v) || typeof v !== 'number') { fehlt = true; break; } s += v; }
            const pz = pos(r.ziel), vz = z[pz];
            if (fehlt || zelleFehlt(spalten[pz]!, vz) || typeof vz !== 'number') { ergebnis = 'fehlt'; break; }
            if (Math.abs(s - vz) > r.toleranz + 1e-9 * Math.max(1, Math.abs(vz))) ergebnis = 'verletzt';
            break;
          }
          case 'schluessel': {
            const k = schluesselVon(r, z, schluesselPos.get(i)!);
            if (k === null) ergebnis = 'fehlt';
            else if ((zaehler.get(i)!.get(k) ?? 0) > 1) ergebnis = 'verletzt';
            break;
          }
        }
        if (ergebnis === 'fehlt') { e.nichtPruefbar++; continue; }
        e.geprueft++;
        if (ergebnis === 'verletzt') { e.verletzt++; (verletzte ??= []).push(i); }
      }
      if (verletzte) {
        zeilenVerletzt++;
        if (anzahl) anzahl[zi] = verletzte.length;
        if (liste.length < PLAUSI_MAX_ZEILEN_LISTE) liste.push({ zeile: zi, regeln: verletzte });
      }
    }
    fertig = (zaehler.size ? n : 0) + ende;
    if (!(await weiter())) return { zeilen: n, regeln: ergebnisse, liste, zeilenVerletzt, anzahl, abgebrochen };
  }
  opt.fortschritt?.(gesamt, gesamt);
  return { zeilen: n, regeln: ergebnisse, liste, zeilenVerletzt, anzahl, abgebrochen };
}

/* ------------------------------------------------------------------------------------------------------------------------------- Sätze */
const opText = (o: Vergleich) => (o === '!=' ? '≠' : o === '<=' ? '≤' : o === '>=' ? '≥' : o);
const wertText = (w: string | number) => (typeof w === 'number' ? String(w).replace('.', ',') : `„${w}“`);
const wertTextEn = (w: string | number) => (typeof w === 'number' ? String(w) : `"${w}"`);

/** Die Regel in einem Satz (Spaltennamen und Werte sind Daten und kommen als Text in die Anzeige). */
export function regelSatz(r: Regel): string {
  switch (r.art) {
    case 'bereich': {
      const a = r.min !== null ? String(r.min).replace('.', ',') : null, b = r.max !== null ? String(r.max).replace('.', ',') : null;
      const ae = r.min !== null ? String(r.min) : null, be = r.max !== null ? String(r.max) : null;
      if (a !== null && b !== null) return L(`${r.spalte} liegt zwischen ${a} und ${b}`, `${r.spalte} lies between ${ae} and ${be}`);
      if (a !== null) return L(`${r.spalte} ist mindestens ${a}`, `${r.spalte} is at least ${ae}`);
      return L(`${r.spalte} ist höchstens ${b}`, `${r.spalte} is at most ${be}`);
    }
    case 'werte': return L(`${r.spalte} ist einer von: ${r.erlaubt.map(wertText).join(', ')}`, `${r.spalte} is one of: ${r.erlaubt.map(wertTextEn).join(', ')}`);
    case 'wenn': return L(`Wenn ${r.wenn.spalte} ${opText(r.wenn.op)} ${wertText(r.wenn.wert)}, dann ${r.dann.spalte} ${opText(r.dann.op)} ${wertText(r.dann.wert)}`, `If ${r.wenn.spalte} ${opText(r.wenn.op)} ${wertTextEn(r.wenn.wert)}, then ${r.dann.spalte} ${opText(r.dann.op)} ${wertTextEn(r.dann.wert)}`);
    case 'summe': return L(`${r.teile.join(' + ')} ergibt ${r.ziel} (Toleranz ${String(r.toleranz).replace('.', ',')})`, `${r.teile.join(' + ')} equals ${r.ziel} (tolerance ${r.toleranz})`);
    case 'schluessel': return L(`${r.spalten.join(' + ')} kommt nur einmal vor`, `${r.spalten.join(' + ')} occurs only once`);
  }
}
export const regelArtName = (a: RegelArt): string => ({
  bereich: L('Wertebereich', 'Range of values'),
  werte: L('Erlaubte Werte', 'Allowed values'),
  wenn: L('Wenn A, dann B', 'If A, then B'),
  summe: L('Summe gleich Spalte', 'Sum equals column'),
  schluessel: L('Eindeutiger Schlüssel', 'Unique key')
}[a]);

/** Warum eine Regel nicht geprüft wurde, als Satz; leer, wenn sie geprüft wurde. */
export function regelProblemSatz(e: RegelErgebnis): string {
  if (e.spaltenFehlen.length) return Lp(e.spaltenFehlen.length, `Die Spalte ${e.spaltenFehlen.join(', ')} gibt es in den Daten nicht. Die Regel wurde nicht geprüft.`, `Die Spalten ${e.spaltenFehlen.join(', ')} gibt es in den Daten nicht. Die Regel wurde nicht geprüft.`, `The column ${e.spaltenFehlen.join(', ')} does not exist in the data. The rule was not checked.`, `The columns ${e.spaltenFehlen.join(', ')} do not exist in the data. The rule was not checked.`);
  if (e.artPasstNicht.length) return L(`Die Regel passt nicht zur Art der Spalte (${e.artPasstNicht.join(', ')}): Zahlen brauchen eine Zahlenspalte, Texte eine Textspalte, und Daten lassen sich nur beim Schlüssel prüfen. Die Regel wurde nicht geprüft.`, `The rule does not fit the type of the column (${e.artPasstNicht.join(', ')}): numbers need a number column, text needs a text column, and dates can only be checked in a key. The rule was not checked.`);
  return '';
}

/** Der Satz zu einer geprüften Regel: geprüft, verletzt, nicht prüfbar. */
export function ergebnisSatz(e: RegelErgebnis): string {
  const p = regelProblemSatz(e);
  if (p) return p;
  return L(`${e.geprueft} geprüft, ${e.verletzt} verletzt, ${e.nichtPruefbar} nicht prüfbar (fehlender Wert).`, `${e.geprueft} checked, ${e.verletzt} violated, ${e.nichtPruefbar} not checkable (missing value).`);
}

export const keineKorrekturSatz = (): string => d('Statable zeigt nur, wo eine Regel nicht erfüllt ist, und ändert nichts. Ob ein Wert falsch ist und was dann gilt, entscheidest du.', 'Statable zeigt nur, wo eine Regel nicht erfüllt ist, und ändert nichts. Ob ein Wert falsch ist und was dann gilt, entscheiden Sie.', 'Statable only shows where a rule is not met and changes nothing. You decide whether a value is wrong and what then applies.');
export const erfuelltSatz = (): string => L('Eine erfüllte Regel beweist nicht, dass der Wert stimmt.', 'A rule that is met does not prove that the value is correct.');
export const nichtPruefbarSatz = (): string => L('„Nicht prüfbar“ heißt: Ein Wert, den die Regel braucht, fehlt in dieser Zeile. Das zählt nicht als verletzt und nicht als erfüllt.', '"Not checkable" means: a value the rule needs is missing in this row. It counts neither as violated nor as met.');
export const listeKuerzungSatz = (gesamt: number): string => (gesamt > PLAUSI_MAX_ZEILEN_LISTE
  ? Lp(gesamt, `Es sind ${gesamt} Zeile betroffen; angezeigt werden die ersten ${PLAUSI_MAX_ZEILEN_LISTE}.`, `Es sind ${gesamt} Zeilen betroffen; angezeigt werden die ersten ${PLAUSI_MAX_ZEILEN_LISTE}.`, `${gesamt} row is affected; the first ${PLAUSI_MAX_ZEILEN_LISTE} are shown.`, `${gesamt} rows are affected; the first ${PLAUSI_MAX_ZEILEN_LISTE} are shown.`) : '');
export function dateiFehlerSatz(g: 'unlesbar' | 'zu-gross' | 'fremd'): string {
  switch (g) {
    case 'unlesbar': return L('Die Datei ist kein lesbares JSON.', 'The file is not readable JSON.');
    case 'zu-gross': return L('Die Datei ist größer als 2 MB und wird nicht gelesen.', 'The file is larger than 2 MB and is not read.');
    case 'fremd': return L('Das ist keine Regeldatei von Statable.', 'This is not a rules file from Statable.');
  }
}
