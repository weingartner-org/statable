/**
 * Vielfalt einer Kategorien-Variablen (Später, Welle S-B, Teil 5; Fachblatt SPAETER-B-OPTIONEN.md Abschnitt 5 und „Entscheidungen Opus“).
 * Reine Funktionen auf Häufigkeiten, kein PSPP, kein R, keine Oberfläche (Sätze und Tabelle: lib/diversitaetsaetze.ts).
 *
 * p_i = n_i / N, S = besetzte Kategorien, k = MÖGLICHE Kategorien (Wertelabels legen sie fest, sonst die besetzten).
 *  - IQV = k/(k − 1) · (1 − Σp²)                       Mueller & Schuessler 1961; Agresti & Agresti 1978
 *  - Shannon H = −Σ p ln p (natürlicher Logarithmus)    Shannon 1948; J = H / ln k (Pielou 1966)
 *  - Gini-Simpson 1 − Σp², unverzerrt 1 − Σ n(n − 1)/(N(N − 1))   Simpson 1949; Hurlbert 1971
 *  - effektive Kategorienzahl exp(H) (Hill 1) und 1/Σp² (Hill 2)   Hill 1973; Jost 2006
 * Kein Konfidenzintervall und kein Test in S-B (Entscheidung Opus). Umfragegewicht: nur gewichtete Anteile, die unverzerrte Form ist gesperrt.
 * Miller-Madow-Korrektur gibt es nicht: H wird nie über ln k hinausgeschoben.
 */
import { L, Lp, d } from './sitzung.svelte';

export type VielfaltHinweis = 'kleines-n' | 'k-eins' | 'n-zu-klein';

export interface Vielfalt {
  /** N = Σ der Häufigkeiten (Häufigkeitsgewicht: Σw) */
  n: number;
  /** Kategorien mit Häufigkeit > 0 */
  besetzt: number;
  /** k: die möglichen Kategorien (mindestens die besetzten) */
  moeglich: number;
  shannon: number; effektiv: number; invSimpson: number; giniSimpson: number;
  /** null bei N < 2, bei nicht ganzzahligen Häufigkeiten und beim Umfragegewicht */
  giniSimpsonUnverzerrt: number | null;
  /** null bei k = 1 */
  iqv: number | null; pielou: number | null;
  hinweise: VielfaltHinweis[];
}

const TOL = 1e-9;
const ganz = (v: number) => Math.abs(v - Math.round(v)) <= TOL;
/** Unter diesem N ist H merklich verzerrt klein (Hinweis, keine Korrektur). */
export const KLEINES_N = 50;

export function vielfalt(haeufigkeiten: number[], opt: { moeglich?: number; umfrage?: boolean } = {}): Vielfalt {
  const h = haeufigkeiten.filter(x => Number.isFinite(x) && x > 0);
  const n = h.reduce((a, b) => a + b, 0), besetzt = h.length;
  const k = Math.max(opt.moeglich !== undefined && Number.isFinite(opt.moeglich) ? Math.round(opt.moeglich) : besetzt, besetzt);
  let H = 0, s2 = 0, unv = 0;
  for (const x of h) { const p = x / n; H -= p * Math.log(p); s2 += p * p; unv += x * (x - 1); }
  if (!(n > 0)) { H = 0; s2 = 0; }
  const unverzerrt = !opt.umfrage && n >= 2 && h.every(ganz) ? 1 - unv / (n * (n - 1)) : null;
  const hinweise: VielfaltHinweis[] = [];
  if (n < KLEINES_N) hinweise.push('kleines-n');
  if (k === 1) hinweise.push('k-eins');
  if (n < 2) hinweise.push('n-zu-klein');
  return {
    n, besetzt, moeglich: k, shannon: H, effektiv: Math.exp(H), invSimpson: s2 > 0 ? 1 / s2 : 0, giniSimpson: 1 - s2,
    giniSimpsonUnverzerrt: unverzerrt, iqv: k > 1 ? (k / (k - 1)) * (1 - s2) : null, pielou: k > 1 ? H / Math.log(k) : null, hinweise
  };
}

/** Die möglichen Kategorien: die Zahl der Wertelabels (ohne fehlende Werte), wenn es welche gibt; sonst die besetzten. „Nur besetzte“ gibt die besetzten. Nie weniger als die besetzten. */
export function moeglicheKategorien(opt: { wertelabels: number | null; besetzt: number; nurBesetzte?: boolean }): number {
  if (opt.nurBesetzte || !opt.wertelabels || opt.wertelabels < 1) return opt.besetzt;
  return Math.max(opt.wertelabels, opt.besetzt);
}

/** Der Satzteil, der k immer nennt: „bei 4 möglichen Antworten“ bzw. „bei 3 besetzten Antworten“. */
export function vielfaltKText(k: number, art: 'moeglich' | 'besetzt'): string {
  return art === 'moeglich'
    ? Lp(k, `bei ${k} möglichen Antwort`, `bei ${k} möglichen Antworten`, `with ${k} possible answer`, `with ${k} possible answers`)
    : Lp(k, `bei ${k} besetzten Antwort`, `bei ${k} besetzten Antworten`, `with ${k} occupied answer`, `with ${k} occupied answers`);
}

/** Der Satz, der k nennt (ein ganzer Satz statt eines eingesetzten Satzteils): „Gerechnet wurde bei 4 möglichen Antworten.“ */
export function vielfaltKSatz(k: number, art: 'moeglich' | 'besetzt'): string {
  return art === 'moeglich'
    ? Lp(k, `Gerechnet wurde bei ${k} möglichen Antwort.`, `Gerechnet wurde bei ${k} möglichen Antworten.`, `The calculation used ${k} possible answer.`, `The calculation used ${k} possible answers.`)
    : Lp(k, `Gerechnet wurde bei ${k} besetzten Antwort.`, `Gerechnet wurde bei ${k} besetzten Antworten.`, `The calculation used ${k} occupied answer.`, `The calculation used ${k} occupied answers.`);
}

/** Ganze Sätze zu den Hinweisen. */
export function vielfaltHinweisText(code: VielfaltHinweis): string {
  switch (code) {
    case 'kleines-n': return d(`Bei weniger als ${KLEINES_N} Fällen fällt Shannon-H im Schnitt etwas zu klein aus. Lies die Zahl als Richtwert.`, `Bei weniger als ${KLEINES_N} Fällen fällt Shannon-H im Schnitt etwas zu klein aus. Lesen Sie die Zahl als Richtwert.`, `With fewer than ${KLEINES_N} cases Shannon H tends to come out a little too small. Read the number as a rough guide.`);
    case 'k-eins': return L('Es gibt nur eine mögliche Antwort. Dann sind der IQV und die Gleichmäßigkeit J nicht definiert.', 'There is only one possible answer. The IQV and the evenness J are then not defined.');
    case 'n-zu-klein': return L('Mit weniger als 2 Fällen lässt sich die unverzerrte Form von Gini-Simpson nicht berechnen.', 'With fewer than 2 cases the unbiased form of Gini-Simpson cannot be calculated.');
  }
}
