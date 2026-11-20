/**
 * Raten (Später, Welle S-F, M4): Inzidenzrate aus Ereignissen und Personenzeit, Ratenverhältnis und Ratendifferenz (Rechner „Aus Kennzahlen rechnen“ im Reiter „Verstehen“).
 * Fachblatt docs/fachblaetter/SPAETER-F-UEBERLEBEN-MEDIZIN.md, Abschnitt 3 und „Entscheidungen Opus (18.10.)“ 4. Reine Funktionen in JS (kein R, kein PSPP, keine Spaltennamen).
 *
 *  - Rate je Gruppe mit EXAKTEM Poisson-Intervall nach Garwood: unten χ²(α/2; 2x)/(2T) (0 bei x = 0), oben χ²(1 − α/2; 2x + 2)/(2T). Die Quantile kommen aus lib/power.ts (Gammafunktion mit Poisson-Dichte
 *    nach Loader, ohne Auslöschung), darum auch für sehr große x genau.
 *  - Ratenverhältnis EXAKT bedingt wie R `poisson.test(c(x1, x2), c(T1, T2))`: bei gleichen Raten ist x1 unter x1 + x2 binomial mit p = T1/(T1 + T2); Clopper-Pearson-Intervall von x1/(x1 + x2),
 *    umgerechnet auf p/(1 − p) · T2/T1; p-Wert zweiseitig wie `binom.test` (relative Toleranz 1e-7).
 *  - Ratendifferenz mit Wald-Intervall ± z · √(x1/T1² + x2/T2²) (Näherung).
 *  - Vergleich mit einer Erwartung (SMR): `poisson.test(x, T = erwartet)`.
 * Die Funktionen werfen nie und geben nie NaN zurück (Fehler als Antwort).
 */
import { chi2Quantil } from './power';
import { betaiXY, dbinomRaw, dpoisRaw } from './verteilung';
import { links, rechts } from './verteilungen';
import { qnorm } from './diagrammdaten';

/** Zeiteinheiten je Personenjahr (Personenjahre = Zeit / Faktor). Statable rät die Einheit nie aus den Zahlen. */
export const PERSONENZEIT_FAKTOREN = { tage: 365.25, wochen: 52.1775, monate: 12, jahre: 1 } as const;
export type Zeiteinheit = keyof typeof PERSONENZEIT_FAKTOREN;
export const ZEITEINHEITEN: Zeiteinheit[] = ['tage', 'wochen', 'monate', 'jahre'];
export const MAX_GRUPPEN_RATEN = 12;

const gueltigerNiveau = (n: number) => Number.isFinite(n) && n > 0 && n < 1;

/** Rate x / T mit exaktem Intervall nach Garwood, alle Werte je Personenjahr (nicht skaliert). */
export function rateExakt(x: number, personenjahre: number, niveau = 0.95): { rate: number; unten: number; oben: number } {
  const a = (1 - niveau) / 2, T = personenjahre;
  return {
    rate: x / T,
    unten: x > 0 ? chi2Quantil(a, 2 * x) / 2 / T : 0,
    oben: chi2Quantil(1 - a, 2 * x + 2) / 2 / T
  };
}

/* ------------------------------------------------------------------ exakter p-Wert wie binom.test / poisson.test */
const REL_FEHLER = 1 + 1e-7;

/** Kleinstes i in [von, bis], für das gilt(i) wahr ist (gilt ist auf dem Bereich von „falsch“ nach „wahr“ monoton); bis + 1, wenn nirgends. */
function ersteWahr(von: number, bis: number, gilt: (i: number) => boolean): number {
  let lo = von, hi = bis + 1;
  while (lo < hi) { const m = Math.floor((lo + hi) / 2); if (gilt(m)) hi = m; else lo = m + 1; }
  return lo;
}

/** Zweiseitiger exakter Binomialtest (R `binom.test`): x von n bei Wahrscheinlichkeit p0 = T1/(T1 + T2) (q0 = T2/(T1 + T2) wird mitgegeben, damit nichts ausgelöscht wird). */
export function binomZweiseitig(x: number, n: number, p0: number, q0: number): number {
  if (n === 0) return 1;
  const m = n * p0;
  if (x === m) return 1;
  const pmf = (i: number) => dbinomRaw(i, n, p0, q0), d = pmf(x), schwelle = d * REL_FEHLER, v = { art: 'binom', n, p: p0 } as const;
  if (x < m) {
    const i0 = ersteWahr(Math.ceil(m), n, i => pmf(i) <= schwelle);                   // pmf fällt ab ceil(m)
    return Math.min(1, links(v, x) + (i0 <= n ? rechts(v, i0) : 0));
  }
  const j0 = ersteWahr(0, Math.floor(m), i => pmf(i) > schwelle);                      // pmf steigt bis floor(m)
  return Math.min(1, (j0 >= 1 ? links(v, j0 - 1) : 0) + rechts(v, x));
}

/** Zweiseitiger exakter Poisson-Test (R `poisson.test(x, T)` mit Erwartung m = r · T). */
export function poissonZweiseitig(x: number, m: number): number {
  if (!(m > 0)) return x === 0 ? 1 : 0;
  if (x === m) return 1;
  const pmf = (i: number) => dpoisRaw(i, m), d = pmf(x), schwelle = d * REL_FEHLER, v = { art: 'poisson', lambda: m } as const;
  if (x < m) {
    let hi = Math.max(Math.ceil(2 * m - x), Math.ceil(m) + 1);
    while (pmf(hi) > d) hi *= 2;                                                       // wie R: so weit nach rechts, bis die Dichte unter d liegt
    const i0 = ersteWahr(Math.ceil(m), hi, i => pmf(i) <= schwelle);
    return Math.min(1, links(v, x) + rechts(v, i0));
  }
  const j0 = ersteWahr(0, Math.floor(m), i => pmf(i) > schwelle);
  return Math.min(1, (j0 >= 1 ? links(v, j0 - 1) : 0) + rechts(v, x));
}

/* ------------------------------------------------------------------ Clopper-Pearson als Odds */
/** Grenzen der Odds p/(1 − p) des exakten (Clopper-Pearson) Intervalls für x von n. `unten` ist 0 bei x = 0, `oben` ist ∞ bei x = n. Bisektion auf dem Log-Odds-Maßstab: auch winzige und
 *  riesige Werte bleiben auf etwa 13 Stellen genau. */
export function clopperPearsonOdds(x: number, n: number, niveau = 0.95): { unten: number; oben: number } {
  const a = (1 - niveau) / 2;
  if (n === 0) return { unten: 0, oben: Infinity };
  const pq = (t: number) => ({ p: 1 / (1 + Math.exp(-t)), q: 1 / (1 + Math.exp(t)) });
  const suche = (fkt: (t: number) => number, wachsend: boolean): number => {
    let lo = -700, hi = 700;
    for (let i = 0; i < 200; i++) {
      const mitte = (lo + hi) / 2, f = fkt(mitte);
      if (wachsend ? f < a : f > a) lo = mitte; else hi = mitte;
      if (hi - lo < 1e-14 * Math.max(1, Math.abs(mitte))) break;
    }
    return (lo + hi) / 2;
  };
  let unten = 0, oben = Infinity;
  if (x > 0) unten = Math.exp(suche(t => { const { p, q } = pq(t); return betaiXY(x, n - x + 1, p, q).unten; }, true));                // P(X ≥ x | p) wächst mit p
  if (x < n) oben = x === 0 ? Math.expm1(-Math.log(a) / n) : Math.exp(suche(t => { const { p, q } = pq(t); return betaiXY(x + 1, n - x, p, q).oben; }, false));   // P(X ≤ x | p) fällt mit p
  return { unten, oben };
}

/* ------------------------------------------------------------------ Vergleich mit einer Erwartung (SMR) */
export interface SmrErgebnis { ok: boolean; code?: 'beobachtet' | 'erwartet'; verhaeltnis: number | null; unten: number | null; oben: number | null; p: number | null }
/** Beobachtete gegen erwartete Ereignisse: Verhältnis mit exaktem Intervall und zweiseitigem exaktem p (R `poisson.test(beobachtet, erwartet)`). */
export function smrRechnen(beobachtet: number, erwartet: number, niveau = 0.95): SmrErgebnis {
  const fehler = (code: 'beobachtet' | 'erwartet'): SmrErgebnis => ({ ok: false, code, verhaeltnis: null, unten: null, oben: null, p: null });
  if (!Number.isInteger(beobachtet) || beobachtet < 0) return fehler('beobachtet');
  if (!(Number.isFinite(erwartet) && erwartet > 0) || !gueltigerNiveau(niveau)) return fehler('erwartet');
  const r = rateExakt(beobachtet, erwartet, niveau);
  return { ok: true, verhaeltnis: r.rate, unten: r.unten, oben: r.oben, p: poissonZweiseitig(beobachtet, erwartet) };
}

/* ------------------------------------------------------------------ Rechner */
export interface RatenEingabe {
  gruppen: { name: string; ereignisse: number; zeit: number }[];
  einheit: Zeiteinheit;
  /** Maßstab: Raten je so viele Personenjahre (Voreinstellung 1000) */
  je?: number;
  /** Index der Vergleichsgruppe (Voreinstellung 0) */
  vergleich?: number;
  niveau?: number;
}
export interface RatenGruppe { name: string; ereignisse: number; personenjahre: number; rate: number; unten: number; oben: number }
export interface RatenVergleich {
  gruppe: number; gegen: number;
  rr: number | null; unten: number | null; oben: number | null; p: number | null;
  diff: number; diffUnten: number; diffOben: number;
  hinweis?: 'nenner-null';
}
export interface RatenErgebnis {
  ok: true; je: number; einheit: Zeiteinheit; niveau: number;
  gruppen: RatenGruppe[]; vergleiche: RatenVergleich[]; hinweise: string[];
}
export type RatenFehler = { ok: false; code: 'gruppen' | 'zeit' | 'ereignisse' | 'einheit' | 'vergleich' | 'je' | 'niveau'; gruppe?: number };

/** Rate je Gruppe, Ratenverhältnis jeder Gruppe gegen die Vergleichsgruppe (exakt bedingt) und Ratendifferenz (Wald). Das Verhältnis der Gruppe i ist (x_i/T_i)/(x_v/T_v). */
export function ratenRechnen(e: RatenEingabe): RatenErgebnis | RatenFehler {
  const niveau = e.niveau ?? 0.95, je = e.je ?? 1000, v = e.vergleich ?? 0;
  if (!Array.isArray(e.gruppen) || e.gruppen.length < 1 || e.gruppen.length > MAX_GRUPPEN_RATEN) return { ok: false, code: 'gruppen' };
  if (!Object.prototype.hasOwnProperty.call(PERSONENZEIT_FAKTOREN, e.einheit)) return { ok: false, code: 'einheit' };
  for (let i = 0; i < e.gruppen.length; i++) {
    const g = e.gruppen[i]!;
    if (!(typeof g.zeit === 'number' && Number.isFinite(g.zeit) && g.zeit > 0)) return { ok: false, code: 'zeit', gruppe: i };
    if (!(typeof g.ereignisse === 'number' && Number.isInteger(g.ereignisse) && g.ereignisse >= 0)) return { ok: false, code: 'ereignisse', gruppe: i };
  }
  if (!Number.isInteger(v) || v < 0 || v >= e.gruppen.length) return { ok: false, code: 'vergleich' };
  if (!(typeof je === 'number' && Number.isFinite(je) && je > 0)) return { ok: false, code: 'je' };
  if (!gueltigerNiveau(niveau)) return { ok: false, code: 'niveau' };
  const faktor = PERSONENZEIT_FAKTOREN[e.einheit], z = qnorm(1 - (1 - niveau) / 2);
  const gruppen: RatenGruppe[] = e.gruppen.map(g => {
    const T = g.zeit / faktor, r = rateExakt(g.ereignisse, T, niveau);
    return { name: g.name, ereignisse: g.ereignisse, personenjahre: T, rate: r.rate * je, unten: r.unten * je, oben: r.oben * je };
  });
  const gv = gruppen[v]!, xv = gv.ereignisse, Tv = gv.personenjahre;
  const vergleiche: RatenVergleich[] = [];
  gruppen.forEach((gi, i) => {
    if (i === v) return;
    const xi = gi.ereignisse, Ti = gi.personenjahre, n = xi + xv;
    const p0 = Ti / (Ti + Tv), q0 = Tv / (Ti + Tv);
    const diff = (xi / Ti - xv / Tv) * je, se = Math.sqrt(xi / (Ti * Ti) + xv / (Tv * Tv)) * je;
    const basis = { gruppe: i, gegen: v, diff, diffUnten: diff - z * se, diffOben: diff + z * se };
    const p = n === 0 ? null : binomZweiseitig(xi, n, p0, q0);
    if (xv === 0) { vergleiche.push({ ...basis, rr: null, unten: null, oben: null, p, hinweis: 'nenner-null' }); return; }
    const cp = clopperPearsonOdds(xi, n, niveau), skala = Tv / Ti;
    if (xi === 0) { vergleiche.push({ ...basis, rr: 0, unten: 0, oben: cp.oben * skala, p }); return; }
    vergleiche.push({ ...basis, rr: (xi / Ti) / (xv / Tv), unten: cp.unten * skala, oben: cp.oben * skala, p });
  });
  return { ok: true, je, einheit: e.einheit, niveau, gruppen, vergleiche, hinweise: gruppen.length > 2 ? ['mehrere-vergleiche'] : [] };
}
