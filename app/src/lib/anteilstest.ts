/** Welle 6, Kachel „Anteilstest verstehen“: Binomialtest mit Ablehnungsbereich K (Schulkonvention), tatsächlichem α, p-Wert, Fehler 2. Art und Prognoseintervall.
 *  Reine Funktionen. Entscheidung Opus F4: K mit α/2 JE SEITE und p-Wert nach der Verdopplung - dann gilt x ∈ K ⟺ p ≤ α, Entscheidung und p-Wert widersprechen sich nie.
 *  R `binom.test` rechnet zweiseitig anders (Summe aller Wahrscheinlichkeiten ≤ P(X = x)); bei p0 ≠ 0,5 kann der p-Wert dort kleiner sein. */
import { links as pLinks, rechts as pRechts, zwischen } from './verteilungen';
import { zZumNiveau } from './kennzahlen';

export type Seite = 'links' | 'rechts' | 'zwei';
export interface Bereich { links: number | null; rechts: number | null; tatsaechlichAlpha: number; leer: boolean }

/** „≤ α“ mit relativer Toleranz 1e-7 (wie R bei Gleichheit, z. B. P = 0,05 genau). */
export const klein = (p: number, alpha: number) => p <= alpha * (1 + 1e-7);

/** Ablehnungsbereich K = {0, …, links} ∪ {rechts, …, n}; null = dieser Teil ist leer.
 *  rechts: g = kleinstes g mit P(X ≥ g) ≤ α; links: k = größtes k mit P(X ≤ k) ≤ α; zweiseitig α/2 je Seite. `tatsaechlichAlpha` = P(X ∈ K | p0) (0 bei leerem K). */
export function ablehnungsbereich(n: number, p0: number, alpha: number, seite: Seite): Bereich {
  const v = { art: 'binom', n, p: p0 } as const, a = seite === 'zwei' ? alpha / 2 : alpha;
  let g: number | null = null, k: number | null = null;
  if (seite !== 'links') {
    let lo = 0, hi = n + 1;                           // kleinstes g in [0; n + 1] mit P(X ≥ g) ≤ a (bei n + 1 ist P = 0)
    while (lo < hi) { const m = Math.floor((lo + hi) / 2); if (klein(pRechts(v, m), a)) hi = m; else lo = m + 1; }
    if (lo <= n) g = lo;
  }
  if (seite !== 'rechts') {
    let lo = -1, hi = n;                              // größtes k in [−1; n] mit P(X ≤ k) ≤ a (bei −1 ist P = 0)
    while (lo < hi) { const m = Math.ceil((lo + hi) / 2) + 0; if (klein(pLinks(v, m), a)) lo = m; else hi = m - 1; }
    if (lo >= 0) k = lo;
  }
  const leer = g === null && k === null;
  const tats = (k !== null ? pLinks(v, k) : 0) + (g !== null ? pRechts(v, g) : 0);
  return { links: k, rechts: g, tatsaechlichAlpha: leer ? 0 : tats, leer };
}

/** p-Wert: einseitig P(X ≤ x) bzw. P(X ≥ x); zweiseitig nach Verdopplung min(1; 2·min(P(X ≤ x); P(X ≥ x))). */
export function pWert(n: number, p0: number, x: number, seite: Seite): number {
  const v = { art: 'binom', n, p: p0 } as const;
  if (seite === 'links') return pLinks(v, x);
  if (seite === 'rechts') return pRechts(v, x);
  return Math.min(1, 2 * Math.min(pLinks(v, x), pRechts(v, x)));
}

/** Fehler 2. Art β = P(X ∉ K | p1) und Teststärke 1 − β = P(X ∈ K | p1), beide direkt summiert (nicht eine aus der anderen). */
export function fehlerZweiterArt(n: number, p0: number, alpha: number, seite: Seite, p1: number): { beta: number; teststaerke: number } {
  const b = ablehnungsbereich(n, p0, alpha, seite), v = { art: 'binom', n, p: p1 } as const;
  const teststaerke = (b.links !== null ? pLinks(v, b.links) : 0) + (b.rechts !== null ? pRechts(v, b.rechts) : 0);
  const beta = zwischen(v, (b.links ?? -1) + 1, (b.rechts ?? n + 1) - 1);
  return { beta, teststaerke: Math.min(1, teststaerke) };
}

export interface Prognose { a: number; b: number; relA: number; relB: number; wahrscheinlichkeit: number; sigmaVon: number; sigmaBis: number }
/** Prognoseintervall (Vorwärtsschluss: p = p0 gilt): zweiseitig das KOMPLEMENT von K, [links + 1; rechts − 1], dazu als Anteile a/n und b/n und die Sigma-Näherung μ ∓ z(1 − α/2)·σ. */
export function prognoseintervall(n: number, p0: number, alpha: number): Prognose {
  const k = ablehnungsbereich(n, p0, alpha, 'zwei'), a = (k.links ?? -1) + 1, b = (k.rechts ?? n + 1) - 1;
  const mu = n * p0, sigma = Math.sqrt(n * p0 * (1 - p0)), z = zZumNiveau(1 - alpha);
  return { a, b, relA: a / n, relB: b / n, wahrscheinlichkeit: zwischen({ art: 'binom', n, p: p0 }, a, b), sigmaVon: mu - z * sigma, sigmaBis: mu + z * sigma };
}

export interface AnteilstestErgebnis { bereich: Bereich; pWert?: number; ablehnen?: boolean; pKlein?: boolean; beta?: number; teststaerke?: number; prognose?: Prognose }
/** Alles in einem Aufruf. pWert und ablehnen nur mit x (ablehnen = x ∈ K), beta und teststaerke nur mit p1, prognose nur zweiseitig. */
export function anteilstest(e: { n: number; p0: number; alpha: number; seite: Seite; x?: number; p1?: number }): AnteilstestErgebnis {
  const bereich = ablehnungsbereich(e.n, e.p0, e.alpha, e.seite), r: AnteilstestErgebnis = { bereich };
  if (e.x !== undefined) {
    r.pWert = pWert(e.n, e.p0, e.x, e.seite);
    r.pKlein = klein(r.pWert, e.alpha);   // dieselbe Toleranz wie in K: x ∈ K ⟺ p ≤ α (zweiseitig: 2·P ≤ α ⟺ P ≤ α/2)
    r.ablehnen = (bereich.links !== null && e.x <= bereich.links) || (bereich.rechts !== null && e.x >= bereich.rechts);
  }
  if (e.p1 !== undefined) Object.assign(r, fehlerZweiterArt(e.n, e.p0, e.alpha, e.seite, e.p1));
  if (e.seite === 'zwei') r.prognose = prognoseintervall(e.n, e.p0, e.alpha);
  return r;
}
