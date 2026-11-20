/**
 * Raking (iteratives proportionales Anpassen, Deming und Stephan 1940): Umfragegewichte aus bekannten Randverteilungen der Grundgesamtheit.
 * Reines JS, kein R. Später, Welle S-F2, Teil B; Fachblatt docs/fachblaetter/SPAETER-F2-ERGAENZUNGEN.md, Abschnitt B und „Entscheidungen Opus (19.10.)“ 6.
 * Drei unabhängige Umsetzungen (survey::rake, mipfp::Ipfp, anesrake) liefern dieselben Gewichte (raking.test.ts).
 *
 * Anders als `survey::rake` prüft Statable ALLE Ränder nach dem Lauf: survey meldet auch dann Erfolg, wenn die Voreinstellung nach einem Durchgang abbricht (Anteile als Ränder),
 * wenn die Ränder unvereinbar sind oder wenn die Randsummen verschieden sind. Randfälle stoppen mit einem Satz; es wird nichts still weitergerechnet.
 */
import { L, Lp, d } from './sitzung.svelte';
import { zahlDe } from './format';
import { designeffekt, kish } from './gewichte';

export type RakingHinweis = 'raender-summen' | 'verhaeltnis-gross';
export interface RakingEingabe {
  faktoren: (string | number | null)[][];
  /** Kategorie → Anteil ODER Zahl; jeder Rand wird durch SEINE eigene Summe geteilt */
  raender: Record<string, number>[];
  /** Ausgangsgewicht je Fall (Voreinstellung 1); null oder ≤ 0 lässt den Fall ohne Gewicht */
  ausgang?: (number | null)[];
  /** relative Schranke, bezogen auf die Zielsumme (1e-10) */
  tol?: number;
  maxit?: number;
}
export interface RakingErgebnisOk {
  ok: true; gewichte: (number | null)[]; durchgaenge: number; maxAbweichung: number; nGewichtet: number; ohneGewicht: number[];
  summe: number; kish: number; designeffekt: number; kleinstes: number; groesstes: number; verhaeltnis: number; hinweise: RakingHinweis[];
}
export type RakingCode = 'merkmale' | 'rand-fehlt' | 'kategorie-ohne-stichprobe' | 'kategorie-ohne-rand' | 'rand-null' | 'nicht-erreicht' | 'zu-wenig';
export interface RakingFehler { ok: false; code: RakingCode; merkmal?: number; kategorie?: string; maxAbweichung?: number; durchgaenge?: number }
export type RakingErgebnis = RakingErgebnisOk | RakingFehler;

/** Mehr als 5 Merkmale rechnet Statable nicht (die Ränder werden dann zu dünn besetzt). */
export const RAKING_MAX_MERKMALE = 5;
/** Größtes/kleinstes Gewicht über dieser Zahl: Hinweis (Vorschlag ohne Quelle, Fachblatt B). */
export const RAKING_VERHAELTNIS = 5;

const fehler = (code: RakingCode, mehr: Partial<RakingFehler> = {}): RakingFehler => ({ ok: false, code, ...mehr });
const fehlt = (v: unknown) => v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v));

/** Gewichte berechnen. Wirft nie; Fehler kommen als `{ ok: false, code }`. */
export function rake(e: RakingEingabe): RakingErgebnis {
  const K = e.faktoren.length, n = K ? e.faktoren[0]!.length : 0, tol = e.tol ?? 1e-10, maxit = e.maxit ?? 1000;
  if (K < 1 || K > RAKING_MAX_MERKMALE || e.raender.length !== K || e.faktoren.some(f => f.length !== n) || (e.ausgang && e.ausgang.length !== n)) return fehler('merkmale');
  // Ränder lesen: Kategorie (Text) → Zahl
  const rand: Map<string, number>[] = [];
  for (let k = 0; k < K; k++) {
    const eintraege = Object.entries(e.raender[k]!);
    if (!eintraege.length || eintraege.some(([, v]) => typeof v !== 'number' || !Number.isFinite(v) || v < 0)) return fehler('rand-fehlt', { merkmal: k });
    if (!(eintraege.reduce((a, [, v]) => a + v, 0) > 0)) return fehler('rand-fehlt', { merkmal: k });
    rand.push(new Map(eintraege));
  }
  // gültige Fälle: alle Merkmale vorhanden, Ausgangsgewicht positiv
  const w0 = new Float64Array(n), gueltig = new Uint8Array(n);
  let nGueltig = 0;
  const ohneGewicht: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = e.ausgang ? e.ausgang[i] : 1;
    let ok = typeof a === 'number' && Number.isFinite(a) && a > 0;
    for (let k = 0; ok && k < K; k++) if (fehlt(e.faktoren[k]![i])) ok = false;
    if (ok) { gueltig[i] = 1; w0[i] = a as number; nGueltig++; } else ohneGewicht.push(i);
  }
  if (nGueltig < 2) return fehler('zu-wenig');
  // Kategorien der Stichprobe (nur gültige Fälle) als Zahlen 0 … c − 1 je Merkmal
  const kat: Int32Array[] = [], namen: string[][] = [];
  for (let k = 0; k < K; k++) {
    const idx = new Map<string, number>(), nm: string[] = [], a = new Int32Array(n).fill(-1), f = e.faktoren[k]!;
    for (let i = 0; i < n; i++) {
      if (!gueltig[i]) continue;
      const t = String(f[i]); let c = idx.get(t);
      if (c === undefined) { c = nm.length; idx.set(t, c); nm.push(t); }
      a[i] = c;
    }
    kat.push(a); namen.push(nm);
  }
  for (let k = 0; k < K; k++) for (const [t, v] of rand[k]!) if (v > 0 && !namen[k]!.includes(t)) return fehler('kategorie-ohne-stichprobe', { merkmal: k, kategorie: t });
  for (let k = 0; k < K; k++) for (const t of namen[k]!) if (!rand[k]!.has(t)) return fehler('kategorie-ohne-rand', { merkmal: k, kategorie: t });
  for (let k = 0; k < K; k++) for (const t of namen[k]!) if (!(rand[k]!.get(t)! > 0)) return fehler('rand-null', { merkmal: k, kategorie: t });
  // Zielsummen: Anteil (durch die EIGENE Summe) mal Zielsumme (Summe der Ausgangsgewichte der gültigen Fälle)
  let zielSumme = 0; for (let i = 0; i < n; i++) if (gueltig[i]) zielSumme += w0[i]!;
  const ziel: Float64Array[] = namen.map((nm, k) => { const s = [...rand[k]!.values()].reduce((a, v) => a + v, 0); return Float64Array.from(nm, t => (rand[k]!.get(t)! / s) * zielSumme); });
  const w = Float64Array.from(w0);
  const randSummen = (k: number): Float64Array => { const s = new Float64Array(namen[k]!.length), a = kat[k]!; for (let i = 0; i < n; i++) if (gueltig[i]) { const c = a[i]!; s[c] = s[c]! + w[i]!; } return s; };
  const abweichung = (): number => { let m = 0; for (let k = 0; k < K; k++) { const s = randSummen(k); for (let c = 0; c < s.length; c++) m = Math.max(m, Math.abs(s[c]! - ziel[k]![c]!)); } return m / zielSumme; };
  // Lauf: ein Durchgang = alle Merkmale nacheinander; danach ALLE Ränder gegen die Ziele prüfen
  let durchgaenge = 0, abw = Infinity;
  while (durchgaenge < maxit) {
    for (let k = 0; k < K; k++) {
      const s = randSummen(k), a = kat[k]!, faktor = Float64Array.from(s, (v, c) => ziel[k]![c]! / v);
      for (let i = 0; i < n; i++) if (gueltig[i]) w[i] = w[i]! * faktor[a[i]!]!;
    }
    durchgaenge++;
    abw = abweichung();
    if (abw <= tol) break;
  }
  if (!(abw <= tol)) return fehler('nicht-erreicht', { maxAbweichung: abw, durchgaenge });
  // Skalieren: Summe = Zahl der gewichteten Fälle (Mittel 1)
  const skala = nGueltig / zielSumme, gewichte: (number | null)[] = new Array(n).fill(null), nur: number[] = [];
  let klein = Infinity, gross = -Infinity;
  for (let i = 0; i < n; i++) if (gueltig[i]) { const v = w[i]! * skala; gewichte[i] = v; nur.push(v); if (v < klein) klein = v; if (v > gross) gross = v; }
  const summe = nur.reduce((a, v) => a + v, 0);
  const hinweise: RakingHinweis[] = [];
  const sums = e.raender.map(r => Object.values(r).reduce((a, v) => a + v, 0)), smax = Math.max(...sums), smin = Math.min(...sums);
  if (smax - smin > 0.01 * smin) hinweise.push('raender-summen');
  if (gross / klein > RAKING_VERHAELTNIS) hinweise.push('verhaeltnis-gross');
  return { ok: true, gewichte, durchgaenge, maxAbweichung: abw, nGewichtet: nGueltig, ohneGewicht, summe, kish: kish(nur), designeffekt: designeffekt(nur), kleinstes: klein, groesstes: gross, verhaeltnis: gross / klein, hinweise };
}

/* ---------------------------------------------------------------------------------------------------------------------------------- Sätze */

const liste = (m: string[]) => (m.length <= 1 ? (m[0] ?? '') : m.slice(0, -1).join(', ') + L(' und ', ' and ') + m.at(-1));
const merkmalName = (m: string[], k?: number) => (k !== undefined && m[k] ? m[k]! : L('einem Merkmal', 'a variable'));

/** Ganze Sätze für den Bericht: Raking, Durchgänge, Kish, Skalierung, Fälle ohne Gewicht, Hinweise. */
export function rakingSaetze(e: RakingErgebnisOk, merkmale: string[]): string[] {
  const aus: string[] = [];
  const pers = e.maxAbweichung * e.nGewichtet;
  const genau = pers < 1e-4 ? L('die Ränder stimmen bis auf weniger als 0,0001 Personen', 'the margins match to within less than 0.0001 people') : L(`größte Abweichung einer Randsumme ${zahlDe(pers, 4)} Personen`, `largest deviation of a margin ${zahlDe(pers, 4)} people`);
  const durch = Lp(e.durchgaenge, `${e.durchgaenge} Durchgang`, `${e.durchgaenge} Durchgänge`, `${e.durchgaenge} iteration`, `${e.durchgaenge} iterations`);
  const ml = liste(merkmale);
  aus.push(L(`Die Gewichte wurden durch iteratives proportionales Anpassen (Raking) an die Randverteilungen von ${ml} angeglichen (${durch}; ${genau}). Die effektive Stichprobengröße (Kish) beträgt ${zahlDe(Math.round(e.kish * 10) / 10, 1)} von ${e.nGewichtet} Fällen.`,
    `The weights were adjusted to the marginal distributions of ${ml} by iterative proportional fitting (raking) (${durch}; ${genau}). The effective sample size (Kish) is ${zahlDe(Math.round(e.kish * 10) / 10, 1)} of ${e.nGewichtet} cases.`));
  aus.push(L('Die Gewichte sind so skaliert, dass ihre Summe der Zahl der Fälle entspricht (Mittel 1). Das ändert Mittelwerte, Anteile und die effektive Stichprobengröße nicht.',
    'The weights are scaled so that their sum equals the number of cases (mean 1). This changes neither means, proportions nor the effective sample size.'));
  if (e.ohneGewicht.length) aus.push(Lp(e.ohneGewicht.length,
    `${e.ohneGewicht.length} Fall ohne Gewicht: Es fehlt eine Angabe zu einem der Merkmale oder das Ausgangsgewicht. Dieser Fall zählt in den Auswertungen nicht mit.`,
    `${e.ohneGewicht.length} Fälle ohne Gewicht: Es fehlt eine Angabe zu einem der Merkmale oder das Ausgangsgewicht. Diese Fälle zählen in den Auswertungen nicht mit.`,
    `${e.ohneGewicht.length} case without a weight: a value of one of the variables or the starting weight is missing. This case is not counted in the analyses.`,
    `${e.ohneGewicht.length} cases without a weight: a value of one of the variables or the starting weight is missing. These cases are not counted in the analyses.`));
  if (e.hinweise.includes('raender-summen')) aus.push(d('Die Summen der eingegebenen Ränder weichen um mehr als 1 % voneinander ab. Statable hat jeden Rand durch seine eigene Summe geteilt. Prüfe die Zahlen und ihre Quelle.',
    'Die Summen der eingegebenen Ränder weichen um mehr als 1 % voneinander ab. Statable hat jeden Rand durch seine eigene Summe geteilt. Prüfen Sie die Zahlen und ihre Quelle.',
    'The sums of the margins entered differ by more than 1%. Statable divided each margin by its own sum. Check the numbers and their source.'));
  if (e.hinweise.includes('verhaeltnis-gross')) aus.push(L(`Das größte Gewicht ist ${zahlDe(Math.round(e.verhaeltnis * 10) / 10, 1)}-mal so groß wie das kleinste. Einzelne Fälle zählen dann sehr stark, und die Schätzungen werden ungenauer.`,
    `The largest weight is ${zahlDe(Math.round(e.verhaeltnis * 10) / 10, 1)} times the smallest. Single cases then count very strongly and estimates become less precise.`));
  return aus;
}

/** Ein Satz zu jedem Fehlercode; `merkmale` sind die Anzeigenamen der gewählten Spalten in der Reihenfolge der Eingabe. */
export function rakingFehlerSatz(f: RakingFehler, merkmale: string[]): string {
  const m = merkmalName(merkmale, f.merkmal), kat = f.kategorie ?? '';
  switch (f.code) {
    case 'merkmale': return L(`Raking braucht 1 bis ${RAKING_MAX_MERKMALE} Merkmale, und zu jedem gehört ein Rand.`, `Raking needs 1 to ${RAKING_MAX_MERKMALE} variables, and each has one margin.`);
    case 'rand-fehlt': return d(`Für ${m} fehlt der Rand, oder er enthält eine negative oder keine Zahl. Gib zu jeder Kategorie eine Zahl ab 0 ein.`, `Für ${m} fehlt der Rand, oder er enthält eine negative oder keine Zahl. Geben Sie zu jeder Kategorie eine Zahl ab 0 ein.`, `The margin for ${m} is missing, or it contains a negative number or no number. Enter a number of 0 or more for each category.`);
    case 'zu-wenig': return L('Weniger als 2 Fälle haben zu allen Merkmalen eine Angabe. Damit lässt sich nicht gewichten.', 'Fewer than 2 cases have a value for all the variables. That is not enough to weight.');
    case 'kategorie-ohne-stichprobe': return d(`Die Kategorie „${kat}“ steht im Rand von ${m}, kommt aber in der Stichprobe nicht vor. Dafür lässt sich kein Gewicht berechnen. Nimm die Kategorie aus dem Rand (und rechne die übrigen Anteile neu) oder fasse Kategorien zusammen.`, `Die Kategorie „${kat}“ steht im Rand von ${m}, kommt aber in der Stichprobe nicht vor. Dafür lässt sich kein Gewicht berechnen. Nehmen Sie die Kategorie aus dem Rand (und rechnen Sie die übrigen Anteile neu) oder fassen Sie Kategorien zusammen.`,
      `The category "${kat}" is in the margin of ${m} but does not occur in the sample. No weight can be calculated for it. Remove the category from the margin (and recalculate the other shares) or combine categories.`);
    case 'kategorie-ohne-rand': return d(`Die Kategorie „${kat}“ von ${m} kommt in der Stichprobe vor, hat aber keinen Rand. Gib für sie eine Zahl ein.`, `Die Kategorie „${kat}“ von ${m} kommt in der Stichprobe vor, hat aber keinen Rand. Geben Sie für sie eine Zahl ein.`, `The category "${kat}" of ${m} occurs in the sample but has no margin. Enter a number for it.`);
    case 'rand-null': return d(`Der Rand von „${kat}“ in ${m} ist 0, in der Stichprobe gibt es aber Fälle dazu. Sie bekämen das Gewicht 0 und fielen heraus. Prüfe den Rand oder fasse Kategorien zusammen.`, `Der Rand von „${kat}“ in ${m} ist 0, in der Stichprobe gibt es aber Fälle dazu. Sie bekämen das Gewicht 0 und fielen heraus. Prüfen Sie den Rand oder fassen Sie Kategorien zusammen.`,
      `The margin of "${kat}" in ${m} is 0, but the sample has cases in it. They would get the weight 0 and drop out. Check the margin or combine categories.`);
    case 'nicht-erreicht': {
      const prozent = zahlDe(Math.round((f.maxAbweichung ?? 0) * 1000) / 10, 1);
      return d(`Die Randverteilungen sind miteinander nicht vereinbar: Nach ${f.durchgaenge ?? 1000} Durchgängen weicht eine Randsumme noch um ${prozent} % der Fälle vom Ziel ab. Prüfe die Zahlen.`, `Die Randverteilungen sind miteinander nicht vereinbar: Nach ${f.durchgaenge ?? 1000} Durchgängen weicht eine Randsumme noch um ${prozent} % der Fälle vom Ziel ab. Prüfen Sie die Zahlen.`,
        `The marginal distributions are not compatible with each other: after ${f.durchgaenge ?? 1000} iterations a margin still deviates from the target by ${prozent}% of the cases. Check the numbers.`);
    }
  }
}

/** Hinweis zum Standardfehler: S-D2 rechnet mit den Gewichten als festen Zahlen. */
export function rakingSeSatz(): string {
  return L('Statable nimmt die Gewichte als fest. Der Standardfehler ist dadurch meist etwas zu groß, also eher vorsichtig (Beispiel: 9,37 statt 9,08).',
    'Statable takes the weights as fixed. The standard error is therefore usually somewhat too large, so rather cautious (example: 9.37 instead of 9.08).');
}
