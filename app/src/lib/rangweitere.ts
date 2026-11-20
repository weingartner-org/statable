/**
 * Weitere Rangtests (Später, Welle S-B, Teil 3; Fachblatt SPAETER-B-OPTIONEN.md Abschnitt 3, „Entscheidungen Opus“ und „Belege IBM“):
 * Vorzeichentest (Vorher-Nachher), Mediantest, Jonckheere-Terpstra und Kolmogorov-Smirnov für zwei Stichproben. Reine Funktionen aus den Rohwerten, keine Oberfläche
 * (Sätze und Tabellen: lib/rangweiteresaetze.ts). Alle vier laufen als JavaScript: PSPP rechnet Jonckheere-Terpstra bei gleichen Werten falsch (Prüfgröße 34 statt 40,5),
 * den Mediantest nur asymptotisch, K-S für zwei Stichproben gar nicht, den Vorzeichentest bei gleich vielen Plus und Minus mit p > 1.
 * Tests: rangweitere.test.ts (Sollwerte aus R, Aufzählung aller Aufteilungen, gedruckte IBM-Beispiele).
 *
 * Entscheidungen Opus (gehen vor, auch wo IBM abweicht):
 *  - Vorzeichentest: immer exakt (Binomial ½), Nullen entfallen. IBM rechnet ab n > 25 eine Näherung.
 *  - Mediantest: Gesamtmedian, Gleichstand zählt zu „≤“ (wie SPSS). 2 Gruppen: das maßgebliche p ist Fisher-exakt, immer; dazu Pearson und Yates (IBM-Formel mit N/2).
 *    SPSS zeigt bei N ≤ 30 Fisher, darüber Yates (`ibmRegel`). Ab 3 Gruppen nur Pearson (kein Freeman-Halton).
 *  - Jonckheere-Terpstra: Prüfgröße zählt Gleichstände halb; Varianz mit Bindungskorrektur; exakt bedingt (alle Zuordnungen der Gruppenmarken, Bindungen bleiben), solange die
 *    Zahl der Aufteilungen höchstens 2 000 000 beträgt, darüber asymptotisch. Zweiseitig exakt nach IBM: P(|T − E| ≥ |t − E|).
 *  - Kolmogorov-Smirnov: exakt (bedingt auf die Werte, Bindungen bleiben, in ganzen Zahlen) bis n1 · n2 ≤ 10 000, darüber asymptotisch (Smirnov-Reihe). Nur zweiseitig.
 */
import { chiQuadratP, lnGamma, normal } from './verteilung';
import { L } from './sitzung.svelte';

export type RangWeitereHinweis = 'keinUnterschied' | 'einPaar' | 'alle-gleich' | 'nichts-ueber-median' | 'zu-wenig-gruppen' | 'zu-wenig-werte' | 'viel-auf-median' | 'erwartet-klein';

/** Wie in rangtests.ts: auf 12 gültige Stellen runden, bevor verglichen wird (0,3 − 0,1 und 0,2 sind dieselbe Zahl). */
const rund = (v: number) => Number(v.toPrecision(12));
const median = (w: number[]): number => { const a = [...w].sort((x, y) => x - y), m = a.length >> 1; return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2; };

/* ===================================================================================================================== Vorzeichentest */
export interface VorzeichenErgebnis {
  plus: number; minus: number; nullen: number; n: number;
  pZwei: number | null; pEin: number | null; pPunkt: number | null;
  grund: null | 'keinUnterschied' | 'einPaar';
}
/** P(X = k) für X ~ Bin(n, ½), in Logarithmen (n bis in die Tausende ohne Überlauf). */
function binomHalbBis(n: number, k: number): { kum: number; punkt: number } {
  let lp = -n * Math.LN2, kum = 0, punkt = 0;
  for (let i = 0; i <= k; i++) {
    const p = Math.exp(lp);
    kum += p; punkt = p;
    lp += Math.log((n - i) / (i + 1));
  }
  return { kum, punkt };
}
/** Paare [vorher, nachher]; Differenz = nachher − vorher, Nullen entfallen. Zweiseitig: min(1, 2·P(X ≤ min(plus, minus))), also bei plus = minus genau 1. */
export function vorzeichenTest(paare: [number, number][]): VorzeichenErgebnis {
  let plus = 0, minus = 0, nullen = 0;
  for (const [a, b] of paare) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const dd = rund(b - a);
    if (dd > 0) plus++; else if (dd < 0) minus++; else nullen++;
  }
  const n = plus + minus;
  if (n === 0) return { plus, minus, nullen, n, pZwei: null, pEin: null, pPunkt: null, grund: 'keinUnterschied' };
  const { kum, punkt } = binomHalbBis(n, Math.min(plus, minus));
  return { plus, minus, nullen, n, pZwei: Math.min(1, 2 * kum), pEin: Math.min(1, kum), pPunkt: punkt, grund: n === 1 ? 'einPaar' : null };
}

/* ===================================================================================================================== Mediantest */
export interface MedianErgebnis {
  n: number; median: number; gruppen: number; ueber: number[]; bis: number[];
  aufMedian: number; anteilAufMedian: number;
  chi2: number | null; df: number | null; p: number | null;
  fisherP: number | null; yates: { chi2: number; p: number } | null; ibmRegel: 'fisher' | 'yates' | null;
  hinweise: ('viel-auf-median' | 'erwartet-klein')[];
  grund: null | 'zu-wenig-gruppen' | 'alle-gleich' | 'nichts-ueber-median';
}
/** Ab diesem Anteil Werte genau auf dem Median kommt der Hinweis (Fachblatt 3.2: 20 %). */
export const MEDIAN_AUF_ANTEIL = 0.2;
const lnFak = (n: number) => lnGamma(n + 1);
/** Fisher-exakt für die 2×2-Tabelle (Zeile 1: a, b; Zeile 2: c, d), zweiseitig wie R `fisher.test`: Summe der Tabellen, deren Wahrscheinlichkeit höchstens die beobachtete ist (relative Toleranz 1e-7 wie R). */
export function fisherZweiMalZwei(a: number, b: number, c: number, d: number): number {
  const n1 = a + b, n2 = c + d, m1 = a + c, N = n1 + n2;
  const lnP = (x: number) => lnFak(n1) - lnFak(x) - lnFak(n1 - x) + lnFak(n2) - lnFak(m1 - x) - lnFak(n2 - m1 + x) - (lnFak(N) - lnFak(m1) - lnFak(N - m1));
  const lo = Math.max(0, m1 - n2), hi = Math.min(n1, m1), pb = Math.exp(lnP(a));
  let s = 0;
  for (let x = lo; x <= hi; x++) { const p = Math.exp(lnP(x)); if (p <= pb * (1 + 1e-7)) s += p; }
  return Math.min(1, s);
}
export function mediantest(gruppen: { name: string; werte: number[] }[]): MedianErgebnis {
  const g = gruppen.map(x => x.werte.filter(Number.isFinite).map(rund)).filter(w => w.length > 0);
  const alle = g.flat(), n = alle.length;
  const leer: MedianErgebnis = { n, median: n ? median(alle) : 0, gruppen: g.length, ueber: [], bis: [], aufMedian: 0, anteilAufMedian: 0, chi2: null, df: null, p: null, fisherP: null, yates: null, ibmRegel: null, hinweise: [], grund: null };
  if (!n) return { ...leer, grund: 'zu-wenig-gruppen' };
  const M = median(alle);
  const ueber = g.map(w => w.filter(v => v > M).length), bis = g.map((w, i) => w.length - ueber[i]!);
  const aufMedian = alle.filter(v => v === M).length, anteil = aufMedian / n;
  const basis: MedianErgebnis = { ...leer, median: M, ueber, bis, aufMedian, anteilAufMedian: anteil };
  if (g.length < 2) return { ...basis, grund: 'zu-wenig-gruppen' };
  if (alle.every(v => v === alle[0])) return { ...basis, grund: 'alle-gleich' };
  const U = ueber.reduce((a, b) => a + b, 0);
  if (U === 0) return { ...basis, grund: 'nichts-ueber-median' };
  const k = g.length, B = n - U;
  let chi2 = 0, klein = 0;
  for (let i = 0; i < k; i++) {
    const ni = g[i]!.length;
    for (const [o, r] of [[ueber[i]!, U], [bis[i]!, B]] as const) { const e = ni * r / n; chi2 += (o - e) ** 2 / e; if (e < 5) klein++; }
  }
  const hinweise: MedianErgebnis['hinweise'] = [];
  if (anteil >= MEDIAN_AUF_ANTEIL - 1e-12) hinweise.push('viel-auf-median');
  if (klein / (2 * k) > 0.2) hinweise.push('erwartet-klein');
  const df = k - 1, p = chiQuadratP(chi2, df);
  let fisherP: number | null = null, yates: { chi2: number; p: number } | null = null, ibmRegel: 'fisher' | 'yates' | null = null;
  if (k === 2) {
    const a = ueber[0]!, b = bis[0]!, c = ueber[1]!, d = bis[1]!;
    fisherP = fisherZweiMalZwei(a, b, c, d);
    const yc = n * (Math.abs(a * d - b * c) - n / 2) ** 2 / ((a + b) * (c + d) * (a + c) * (b + d));   // IBM: immer mit N/2, nie auf 0 begrenzt
    yates = { chi2: yc, p: chiQuadratP(yc, 1) };
    ibmRegel = n <= 30 ? 'fisher' : 'yates';
  }
  return { ...basis, chi2, df, p, fisherP, yates, ibmRegel, hinweise };
}

/* ===================================================================================================================== Jonckheere-Terpstra */
export interface JtP { zwei: number; steigt: number; faellt: number }
export interface JtErgebnis {
  n: number; gruppen: number; jt: number; mittel: number; varianz: number; sd: number; z: number; aufteilungen: number;
  modus: 'exakt' | 'asymptotisch';
  asymptotisch: JtP; exakt: JtP | null; p: JtP;
  /** Bei einem Grund sind alle Zahlen Platzhalter (p = 1), nie NaN. */
  grund: null | 'zu-wenig-gruppen' | 'zu-wenig-werte' | 'alle-gleich';
}
/** Obergrenze der Aufteilungen für die Vollauszählung (Entscheidung Opus: höchstens 2 · 10^6). */
export const JT_EXAKT_MAX = 2_000_000;
/** Schutz für den Speicher der Zählung (Zustände × Breite der Prüfgröße). */
const JT_ZAHL_MAX = 30_000_000;

function binom(n: number, k: number): number {
  k = Math.min(k, n - k); let r = 1;
  for (let i = 1; i <= k; i++) { r = (r * (n - k + i)) / i; if (r < 9e15) r = Math.round(r); }
  return r;
}
/** N! / Π n_i! als Zahl (exakt, solange sie unter 2^53 liegt). */
function aufteilungenVon(ns: number[]): number {
  let rest = ns.reduce((a, b) => a + b, 0), r = 1;
  for (const m of ns) { r *= binom(rest, m); rest -= m; }
  return r;
}

/**
 * Exakte bedingte Verteilung von 2·JT über alle Zuordnungen der Gruppenmarken zu den N Werten (gleiche Werte bleiben gleich). Zählung über die Stufen der Werte:
 * Zustand = wie viele Werte jeder Gruppe schon vergeben sind; an einer Stufe mit t gleichen Werten wählt man, wie viele davon je Gruppe sind (m_g), mit t!/Πm_g! Möglichkeiten.
 * Beitrag zu 2·JT: Σ_h m_h · Σ_{g<h} (2·benutzt_g + m_g) - Werte in einer niedrigeren Gruppe und kleiner zählen voll, gleiche halb.
 */
function jtVerteilung(ns: number[], stufen: number[]): { verteilung: Float64Array; erwartet2: number } | null {
  const G = ns.length, schritt: number[] = []; let zustaende = 1;
  for (let g = 0; g < G; g++) { schritt.push(zustaende); zustaende *= ns[g]! + 1; }
  let paare = 0; for (let i = 0; i < G; i++) for (let j = i + 1; j < G; j++) paare += ns[i]! * ns[j]!;
  const breite = 2 * paare + 1;
  if (zustaende * breite > JT_ZAHL_MAX) return null;
  let aktuell: (Float64Array | null)[] = new Array(zustaende).fill(null);
  aktuell[0] = new Float64Array(breite); aktuell[0]![0] = 1;
  const benutzt = new Array<number>(G).fill(0), m = new Array<number>(G).fill(0);
  for (const t of stufen) {
    const neu: (Float64Array | null)[] = new Array(zustaende).fill(null);
    for (let z = 0; z < zustaende; z++) {
      const dist = aktuell[z]; if (!dist) continue;
      let rest = z; for (let g = 0; g < G; g++) { benutzt[g] = rest % (ns[g]! + 1); rest = Math.floor(rest / (ns[g]! + 1)); }
      const rek = (g: number, uebrig: number, gewicht: number) => {
        if (g === G - 1) {
          if (uebrig > ns[g]! - benutzt[g]!) return;
          m[g] = uebrig;
          let inc = 0, vorher = 0;
          for (let h = 0; h < G; h++) { inc += m[h]! * vorher; vorher += 2 * benutzt[h]! + m[h]!; }
          let z2 = z; for (let h = 0; h < G; h++) z2 += m[h]! * schritt[h]!;
          let ziel = neu[z2]; if (!ziel) { ziel = new Float64Array(breite); neu[z2] = ziel; }
          for (let v = 0; v + inc < breite; v++) if (dist[v]) ziel[v + inc]! += dist[v]! * gewicht;
          return;
        }
        const max = Math.min(uebrig, ns[g]! - benutzt[g]!);
        for (let k = 0; k <= max; k++) { m[g] = k; rek(g + 1, uebrig - k, gewicht * binom(uebrig, k)); }
      };
      rek(0, t, 1);
    }
    aktuell = neu;
  }
  const ende = aktuell[zustaende - 1];
  return ende ? { verteilung: ende, erwartet2: paare } : null;
}

export function jonckheereTerpstra(gruppen: number[][], opt: { exaktMax?: number } = {}): JtErgebnis {
  const g = gruppen.map(w => w.filter(Number.isFinite).map(rund)).filter(w => w.length > 0);
  const ns = g.map(w => w.length), N = ns.reduce((a, b) => a + b, 0), k = g.length;
  const platz = (grund: NonNullable<JtErgebnis['grund']>): JtErgebnis => ({
    n: N, gruppen: k, jt: 0, mittel: 0, varianz: 0, sd: 0, z: 0, aufteilungen: 1, modus: 'asymptotisch',
    asymptotisch: { zwei: 1, steigt: 1, faellt: 1 }, exakt: null, p: { zwei: 1, steigt: 1, faellt: 1 }, grund
  });
  if (k < 2) return platz('zu-wenig-gruppen');
  if (N < 3) return platz('zu-wenig-werte');
  const alle = g.flat().sort((a, b) => a - b);
  if (alle[0] === alle[N - 1]) return platz('alle-gleich');
  // Stufen (gleiche Werte) und Zahlen je Gruppe und Stufe
  const werte: number[] = [], t: number[] = [];
  for (const v of alle) { if (werte.length && werte[werte.length - 1] === v) t[t.length - 1]!++; else { werte.push(v); t.push(1); } }
  const stufeVon = new Map(werte.map((v, i) => [v, i] as const));
  const zaehl = g.map(w => { const c = new Array<number>(werte.length).fill(0); for (const v of w) c[stufeVon.get(v)!]!++; return c; });
  // JT: Σ_{i<j} (#{a < b} + ½ #{a = b}), a aus Gruppe i, b aus Gruppe j
  let jt2 = 0;
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    let davor = 0;
    for (let l = 0; l < werte.length; l++) { jt2 += zaehl[j]![l]! * (2 * davor + zaehl[i]![l]!); davor += zaehl[i]![l]!; }
  }
  const jt = jt2 / 2;
  let sn2 = 0, sn3 = 0, sn1 = 0;
  for (const n of ns) { sn1 += n * (n - 1); sn2 += n * (n - 1) * (2 * n + 5); sn3 += n * (n - 1) * (n - 2); }
  let st1 = 0, st2 = 0, st3 = 0;
  for (const x of t) { st1 += x * (x - 1); st2 += x * (x - 1) * (2 * x + 5); st3 += x * (x - 1) * (x - 2); }
  const mittel = (N * N - ns.reduce((a, n) => a + n * n, 0)) / 4;
  const varianz = (N * (N - 1) * (2 * N + 5) - sn2 - st2) / 72 + (sn3 * st3) / (36 * N * (N - 1) * (N - 2)) + (sn1 * st1) / (8 * N * (N - 1));
  const sd = Math.sqrt(varianz), z = sd > 0 ? (jt - mittel) / sd : 0;
  const steigtA = normal(-z), faelltA = normal(z);
  const asymptotisch: JtP = { zwei: Math.min(1, 2 * Math.min(steigtA, faelltA)), steigt: steigtA, faellt: faelltA };
  const aufteilungen = aufteilungenVon(ns), max = opt.exaktMax ?? JT_EXAKT_MAX;
  let exakt: JtP | null = null;
  if (aufteilungen <= max) {
    const v = jtVerteilung(ns, t);
    if (v) {
      const dist = v.verteilung, E2 = v.erwartet2, total = dist.reduce((a, b) => a + b, 0);
      let ge = 0, le = 0, zw = 0;
      const dz = Math.abs(jt2 - E2);
      for (let x = 0; x < dist.length; x++) {
        const c = dist[x]!; if (!c) continue;
        if (x >= jt2) ge += c;
        if (x <= jt2) le += c;
        if (Math.abs(x - E2) >= dz) zw += c;
      }
      exakt = { steigt: ge / total, faellt: le / total, zwei: Math.min(1, zw / total) };
    }
  }
  return { n: N, gruppen: k, jt, mittel, varianz, sd, z, aufteilungen, modus: exakt ? 'exakt' : 'asymptotisch', asymptotisch, exakt, p: exakt ?? asymptotisch, grund: null };
}

/* ===================================================================================================================== Kolmogorov-Smirnov, zwei Stichproben */
export interface KsErgebnis {
  n1: number; n2: number; d: number; z: number; modus: 'exakt' | 'asymptotisch';
  pAsymptotisch: number; pExakt: number | null;
  /** Bei grund 'zu-wenig-werte' null (nie NaN); der Typ bleibt `number`, wie in der festgelegten Schnittstelle. */
  p: number;
  grund: null | 'zu-wenig-werte';
}
/** Obergrenze für n1 · n2, bis zu der exakt gerechnet wird (wie R `ks.test`). */
export const KS_EXAKT_PRODUKT_MAX = 10_000;
/** Smirnov-Reihe 2 Σ (−1)^(k−1) e^(−2k²z²), die asymptotische Verteilung der K-S-Prüfgröße (SPSS); unter z = 0,27 ist sie 1. */
export function smirnovP(z: number): number {
  if (!(z >= 0.27)) return 1;
  let s = 0;
  for (let k = 1; k <= 200; k++) { const t = Math.exp(-2 * k * k * z * z); s += (k % 2 ? 1 : -1) * t; if (t < 1e-18) break; }
  return Math.min(1, Math.max(0, 2 * s));
}
export function ksZwei(x: number[], y: number[], opt: { exaktMaxProdukt?: number } = {}): KsErgebnis {
  const a = x.filter(Number.isFinite).map(rund), b = y.filter(Number.isFinite).map(rund), n1 = a.length, n2 = b.length;
  if (!n1 || !n2) return { n1, n2, d: 0, z: 0, modus: 'asymptotisch', pAsymptotisch: 1, pExakt: null, p: null as unknown as number, grund: 'zu-wenig-werte' };
  // gepoolt sortieren; jedes Element trägt die Gruppe (0 = x, 1 = y); Blockenden = Stellen, an denen sich der Wert ändert
  const alle = [...a.map(v => [v, 0] as const), ...b.map(v => [v, 1] as const)].sort((p, q) => p[0] - q[0]);
  const N = n1 + n2, ende: boolean[] = new Array(N).fill(false);
  for (let i = 0; i < N; i++) ende[i] = i === N - 1 || alle[i + 1]![0] !== alle[i]![0];
  let i1 = 0, j1 = 0, dInt = 0;
  for (let i = 0; i < N; i++) { if (alle[i]![1] === 0) i1++; else j1++; if (ende[i]) dInt = Math.max(dInt, Math.abs(i1 * n2 - j1 * n1)); }
  const d = dInt / (n1 * n2), z = d * Math.sqrt((n1 * n2) / (n1 + n2)), pAsy = smirnovP(z);
  const exakt = n1 * n2 <= (opt.exaktMaxProdukt ?? KS_EXAKT_PRODUKT_MAX);
  let pExakt: number | null = null;
  if (exakt) {
    // Pfade durch das Gitter: A = kleinere, B = größere Gruppe; geprüft wird nur an den Blockenden; P(D ≥ d) = schlechte Pfade / alle Pfade
    const A = Math.min(n1, n2), B = Math.max(n1, n2);
    let gut = new Float64Array(A + 1), schlecht = new Float64Array(A + 1);
    gut[0] = 1;
    for (let kk = 0; kk < N; kk++) {
      const gutN = new Float64Array(A + 1), schlN = new Float64Array(A + 1);
      for (let aa = Math.max(0, kk - B); aa <= Math.min(A, kk); aa++) {
        const g0 = gut[aa]!, s0 = schlecht[aa]!;
        if (!g0 && !s0) continue;
        if (aa < A) { gutN[aa + 1]! += g0; schlN[aa + 1]! += s0; }
        if (kk - aa < B) { gutN[aa]! += g0; schlN[aa]! += s0; }
      }
      if (ende[kk]) {
        const k1 = kk + 1;
        for (let aa = Math.max(0, k1 - B); aa <= Math.min(A, k1); aa++) {
          if (gutN[aa] && Math.abs(aa * B - (k1 - aa) * A) >= dInt) { schlN[aa]! += gutN[aa]!; gutN[aa] = 0; }
        }
      }
      gut = gutN; schlecht = schlN;
    }
    pExakt = Math.min(1, schlecht[A]! / (gut[A]! + schlecht[A]!));
  }
  return { n1, n2, d, z, modus: exakt ? 'exakt' : 'asymptotisch', pAsymptotisch: pAsy, pExakt, p: exakt ? pExakt! : pAsy, grund: null };
}

/* ===================================================================================================================== Sätze für Ränder und Hinweise */
/** Ganze Sätze zu den Rändern und Hinweisen; `test` wählt die Fassung, wo der Wortlaut vom Test abhängt. */
export function rangWeitereText(code: RangWeitereHinweis, test?: 'vorzeichen' | 'median' | 'jt' | 'ks'): string {
  switch (code) {
    case 'keinUnterschied': return L('Kein Paar hat einen Unterschied.', 'No pair has a difference.');
    case 'einPaar': return L('Nur ein Paar hat einen Unterschied. Mit so wenigen Paaren lässt sich nichts testen.', 'Only one pair has a difference. With so few pairs nothing can be tested.');
    case 'alle-gleich': return test === 'median' ? L('Alle Werte liegen auf dem Median.', 'All values lie on the median.') : L('Alle Werte sind gleich.', 'All values are equal.');
    case 'nichts-ueber-median': return L('Kein Wert liegt über dem Median. Dann lässt sich der Mediantest nicht rechnen.', 'No value lies above the median. The median test then cannot be calculated.');
    case 'zu-wenig-gruppen': return L('Es braucht mindestens zwei Gruppen mit je einem Wert.', 'At least two groups with one value each are needed.');
    case 'zu-wenig-werte': return L('Es sind zu wenige Werte da, um diesen Test zu rechnen. Jede Gruppe braucht mindestens einen Wert.', 'There are too few values to calculate this test. Every group needs at least one value.');
    case 'viel-auf-median': return L('Viele Werte liegen genau auf dem Median; das Ergebnis hängt davon ab, auf welche Seite sie fallen. Kruskal-Wallis nutzt mehr Information.', 'Many values lie exactly on the median; the result depends on which side they fall. Kruskal-Wallis uses more information.');
    case 'erwartet-klein': return L('In mehr als einem Fünftel der Zellen werden weniger als 5 Fälle erwartet. Die Näherung des χ²-Tests ist dann unsicher (Cochran).', 'In more than a fifth of the cells fewer than 5 cases are expected. The χ² approximation is then uncertain (Cochran).');
  }
}
