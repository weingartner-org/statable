/**
 * Risikomaße aus der Vierfeldertafel (Welle 7, M2): Risiko je Gruppe, Risikodifferenz (RD), Relatives Risiko (RR), Odds Ratio (OR), NNT.
 * Tafel [[a, b], [c, d]]: Zeile 1 = Gruppe/Behandlung, Zeile 2 = Vergleichsgruppe; Spalte 1 = Ereignis, Spalte 2 = kein Ereignis.
 * Entscheidungen (Fachblatt Welle 7, Nachträge):
 *  - Risiken mit Wilson-Intervall (wie diagnostik.ts); RD mit dem Intervall nach Newcombe (1998, Methode 10 = Wilson-Hybrid, = DescTools::BinomDiffCI "score");
 *    RR mit dem Log-Intervall nach Katz (Wald auf ln RR); OR mit Woolf (= effektki.ts).
 *  - Keine Haldane-Korrektur: RR ist bei a = 0 oder c = 0, OR bei jeder Nullzelle nicht schätzbar (null). Die RD mit Newcombe geht immer.
 *  - NNT = 1/|ARR| mit dem Intervall nach Altman (1998, BMJ 317:1309) aus den Kehrwerten der Grenzen der absoluten Risikoreduktion (ARR, Nutzen positiv).
 *    Schließt das Intervall der ARR die 0 ein, geht das NNT-Intervall durch unendlich („NNTH … bis ∞ bis NNTB …“); nie ein Intervall mit negativen Zahlen.
 *  - Fall-Kontroll-Studie: Risiken sind nicht schätzbar, nur das Odds Ratio ist zulässig.
 * Geprüft gegen R (scripts/welle7-erwartet.R; DescTools, epiR, eigene Formeln). ⚠ von der Fachperson abzunehmen.
 */
import { oddsRatio2x2 } from './effektki';
import { wilson, type Anteil } from './diagnostik';

const Z = 1.959963984540054;

export interface RisikoKi { wert: number; lo: number; hi: number }
export type NntIntervall =
  | { typ: 'nntb' | 'nnth'; von: number; bis: number }
  | { typ: 'durchUnendlich'; nntb: number; nnth: number };
export interface Nnt { wert: number | null; art: 'NNTB' | 'NNTH' | null; intervall: NntIntervall }
export interface Risikomasse {
  n1: number; n2: number; nullzelle: boolean;
  r1: Anteil | null; r2: Anteil | null;
  rd: RisikoKi | null; rr: RisikoKi | null;
  or: { wert: number; lo: number; hi: number } | null;
  nnt: Nnt | null;
}
export interface RisikoOptionen { design?: 'kohorte' | 'fallKontrolle'; ereignisGut?: boolean }

/** NNT und Intervall aus der absoluten Risikoreduktion `arr` (Nutzen positiv) mit Intervall [lo, hi] (Altman 1998). */
export function nntAusArr(arr: number, lo: number, hi: number): Nnt {
  const wert = arr === 0 ? null : 1 / Math.abs(arr);
  const art = arr > 0 ? 'NNTB' : arr < 0 ? 'NNTH' : null;
  let intervall: NntIntervall;
  if (lo > 0) intervall = { typ: 'nntb', von: 1 / hi, bis: 1 / lo };
  else if (hi < 0) intervall = { typ: 'nnth', von: 1 / Math.abs(lo), bis: 1 / Math.abs(hi) };
  else intervall = { typ: 'durchUnendlich', nntb: 1 / hi, nnth: 1 / Math.abs(lo) };
  return { wert, art, intervall };
}

export function risikomasse(tab: number[][], opt: RisikoOptionen = {}): Risikomasse {
  const [a, b, c, d] = [tab[0]?.[0], tab[0]?.[1], tab[1]?.[0], tab[1]?.[1]] as number[];
  const zellen = [a, b, c, d];
  if (zellen.some(z => !Number.isInteger(z) || (z as number) < 0)) throw new Error('Zellen müssen ganze Zahlen ab 0 sein');
  const n1 = a! + b!, n2 = c! + d!;
  if (n1 === 0 || n2 === 0) throw new Error('Eine Zeile ist leer');
  const nullzelle = zellen.some(z => z === 0);
  const or0 = oddsRatio2x2([[a!, b!], [c!, d!]]);
  const or = or0 ? { wert: or0.or, lo: or0.lo, hi: or0.hi } : null;
  if (opt.design === 'fallKontrolle') return { n1, n2, nullzelle, r1: null, r2: null, rd: null, rr: null, or, nnt: null };

  const r1 = wilson(a!, n1), r2 = wilson(c!, n2);
  const diff = r1.wert - r2.wert;
  // Newcombe (1998), Methode 10: Wilson-Intervalle beider Anteile zusammengesetzt
  const rd: RisikoKi = {
    wert: diff,
    lo: diff - Math.sqrt((r1.wert - r1.lo) ** 2 + (r2.hi - r2.wert) ** 2),
    hi: diff + Math.sqrt((r1.hi - r1.wert) ** 2 + (r2.wert - r2.lo) ** 2)
  };
  let rr: RisikoKi | null = null;
  if (a! > 0 && c! > 0) {
    const w = r1.wert / r2.wert, l = Math.log(w), se = Math.sqrt(1 / a! - 1 / n1 + 1 / c! - 1 / n2);
    rr = { wert: w, lo: Math.exp(l - Z * se), hi: Math.exp(l + Z * se) };
  }
  // ARR mit Nutzen positiv: Ereignis unerwünscht -> weniger Ereignisse in Zeile 1 ist Nutzen (ARR = -RD, Intervall gespiegelt)
  const nnt = opt.ereignisGut ? nntAusArr(rd.wert, rd.lo, rd.hi) : nntAusArr(-rd.wert, -rd.hi, -rd.lo);
  return { n1, n2, nullzelle, r1, r2, rd, rr, or, nnt };
}
