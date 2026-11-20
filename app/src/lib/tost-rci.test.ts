import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cronbachAlpha, einordnung, rciAusItems, rciGruppe, rciWert, RCI_GRENZE, sDiff } from './rci';
import { tostGepaart, tostGruppen } from './tost';

/* Fachblatt Welle 2, Paket D (docs/fachblaetter/WELLE2-PSYCHOLOGIE.md): G15 Äquivalenztest (TOST) und G16 Reliable Change Index.
 * Sollwerte: scripts/tost-rci-erwartet.R -> testdaten/tost-rci-erwartet.json (R 4.6.1, TOSTER 0.8.6, psych, effectsize).
 *
 * G15 TOST - erste Quelle TOSTER::t_TOST(eqb = c(-Δ, Δ), var.equal = FALSE bzw. paired = TRUE), zweite Quelle zwei t.test(mu = ∓Δ) (im Skript per stopifnot, 1e-10).
 *  Die Rechnung ist Welch (zwei Gruppen) bzw. t-Test der Differenzen (gepaart). Differenz = Gruppe 1 minus Gruppe 2; gepaart nachher minus vorher.
 *  Untere Grenze testet H0: Differenz <= -Δ (einseitig "größer"), obere H0: Differenz >= +Δ (einseitig "kleiner"); pTost = max(pUnten, pOben); aequivalent = pTost < ,05.
 *  KI: 90 % der Differenz (alpha = ,05 je Seite, Lakens 2017). Nur SYMMETRISCHE Grenzen ±Δ (Δ in Rohwerten, Pflichteingabe, > 0); es gibt keinen Parameter für asymmetrische Grenzen.
 *  Δ als d (festgelegt): zwei Gruppen deltaD = Δ / s_p, s_p = sqrt(((n1-1) s1² + (n2-1) s2²) / (n1+n2-2)), OHNE Hedges-Korrektur (Cohen-d);
 *  gepaart deltaD = Δ / SD(Differenzen) (d_z). dBeob = Differenz / s_p bzw. Differenz / SD(Differenzen).
 *  null (kein Ergebnis) bei: Δ nicht endlich oder <= 0; weniger als 2 Werte je Gruppe / weniger als 2 Paare; gepaart ungleich lange Listen; nicht endliche Werte;
 *  beide Gruppen ohne Streuung; gepaart SD der Differenzen = 0.
 *
 * G16 RCI nach Jacobson & Truax (1991): sDiff = √2 · SD1 · √(1 − r), SD1 = SD (n-1) der VORHER-Werte (nicht der Differenzen), RCI = (x2 − x1) / sDiff.
 *  Einordnung hoheBesser = true: RCI > 1,96 'verbessert', RCI < −1,96 'verschlechtert', sonst 'unveraendert'; hoheBesser = false kehrt Verbessert/Verschlechtert um.
 *  GRENZREGEL (festgelegt): |RCI| wird vor dem Vergleich auf 12 gültige Stellen gerundet (Number(x.toPrecision(12)), wie die 12-Stellen-Regel in G9/G10);
 *  > 1,96 ist verlässlich, genau 1,96 nicht. Gültig für 0 <= r < 1 und SD1 > 0, sonst null (r = 1 teilt durch 0; negatives Alpha ist keine Reliabilität).
 *  r kommt entweder eingegeben oder als Cronbachs Alpha der Vorher-Items (Zeilen = Personen, Spalten = Items, Summenwert als Skala).
 *
 * API, die der Bauer anlegen muss (diese Tests sind absichtlich rot, bis die Module existieren):
 *  app/src/lib/tost.ts
 *    tostGruppen(x: number[], y: number[], delta: number): TostErgebnis | null
 *    tostGepaart(nachher: number[], vorher: number[], delta: number): TostErgebnis | null
 *    TostErgebnis = { n1, n2, differenz, se, df, tUnten, pUnten, tOben, pOben, pTost, ki90: [number, number], aequivalent: boolean, delta, deltaD, dBeob, tNull, pNull }
 *      (gepaart: n1 = n2 = Zahl der Paare; tNull/pNull = t-Test gegen 0, zweiseitig)
 *  app/src/lib/rci.ts
 *    RCI_GRENZE = 1.96
 *    sDiff(sd1: number, r: number): number | null
 *    rciWert(x1: number, x2: number, sd1: number, r: number): number | null
 *    einordnung(rci: number, hoheBesser: boolean): 'verbessert' | 'unveraendert' | 'verschlechtert'
 *    cronbachAlpha(zeilen: number[][]): number | null            // k/(k-1) · (1 − Σ Var(Item) / Var(Summe)), Varianzen mit n-1; null bei < 2 Items, < 2 Personen oder Var(Summe) = 0
 *    rciGruppe(vorher: number[], nachher: number[], r: number, hoheBesser: boolean): RciGruppe | null
 *    rciAusItems(vorher: number[][], nachher: number[][], hoheBesser: boolean): (RciGruppe & { alpha: number }) | null   // Summenwerte je Person, r = Alpha der Vorher-Items
 *    RciGruppe = { n, sdVorher, sDiff, personen: { rci: number; einordnung: Einordnung }[], anzahl: Record<Einordnung, number>, anteil: Record<Einordnung, number> } */

type Eo = 'verbessert' | 'unveraendert' | 'verschlechtert';
interface TostSoll {
  name: string; art: 'gruppen' | 'gepaart'; x: number[]; y: number[]; delta: number; n1: number; n2: number;
  differenz: number; se: number; df: number; t_unten: number; p_unten: number; t_oben: number; p_oben: number; p_tost: number; aequivalent: boolean; ki90: number[];
  t_nullhypothese: number; p_nullhypothese: number; delta_d: number; d_beob: number; quelle?: string;
  veroeffentlicht?: { differenz: number; df: number; t_unten: number; p_unten: number; t_oben: number; p_oben: number; ki90: number[]; t_nullhypothese: number; p_nullhypothese: number };
}
interface RciSoll {
  name: string; vorher: number[]; nachher: number[]; n: number; r: number; r_quelle: string; hoheBesser: boolean; sd_vorher: number; s_diff: number; rci: number[]; einordnung: Eo[];
  anzahl: Record<Eo, number>; anteil: Record<Eo, number>; items_vorher?: number[][]; items_nachher?: number[][]; alpha_psych?: number; alpha_formel?: number;
}
interface RciPubl { name: string; sd1: number; r: number; x1: number; x2: number; s_diff: number; rci: number; einordnung: Eo; veroeffentlicht: { s_diff: number; rci: number }; quelle: string }
const J = JSON.parse(readFileSync(new URL('./testdaten/tost-rci-erwartet.json', import.meta.url), 'utf8')) as { tost: TostSoll[]; rci: (RciSoll | RciPubl)[]; grenze: number };
const nah = (a: number | undefined, b: number, tol = 1e-9) => { expect(a).toBeTypeOf('number'); expect(Math.abs(a! - b)).toBeLessThan(tol * Math.max(1, Math.abs(b))); };
const tf = (n: string) => J.tost.find(f => f.name === n)!;
const rf = (n: string) => J.rci.find(f => f.name === n) as RciSoll;

describe('G15 Äquivalenztest (TOST) gegen R/TOSTER', () => {
  for (const f of J.tost) it(`${f.name} [${f.art}, Δ = ${f.delta}, ${f.aequivalent ? 'Gleichwertigkeit gezeigt' : 'nicht gezeigt'}]`, () => {
    const e = f.art === 'gruppen' ? tostGruppen(f.x, f.y, f.delta) : tostGepaart(f.x, f.y, f.delta);
    expect(e).not.toBeNull();
    const r = e!;
    expect([r.n1, r.n2]).toEqual([f.n1, f.n2]);
    nah(r.differenz, f.differenz); nah(r.se, f.se); nah(r.df, f.df);
    nah(r.tUnten, f.t_unten); nah(r.pUnten, f.p_unten); nah(r.tOben, f.t_oben); nah(r.pOben, f.p_oben);
    nah(r.pTost, f.p_tost); expect(r.pTost).toBe(Math.max(r.pUnten, r.pOben));
    nah(r.ki90[0], f.ki90[0]!); nah(r.ki90[1], f.ki90[1]!);
    expect(r.aequivalent).toBe(f.aequivalent); expect(r.aequivalent).toBe(r.pTost < 0.05);
    nah(r.tNull, f.t_nullhypothese); nah(r.pNull, f.p_nullhypothese);
    expect(r.delta).toBe(f.delta); nah(r.deltaD, f.delta_d); nah(r.dBeob, f.d_beob);
  });

  it('Fall a: ungleiche Varianzen -> Welch-df deutlich unter n1 + n2 - 2', () => {
    const f = tf('a_welch_gezeigt');
    expect(f.df).toBeLessThan(f.n1 + f.n2 - 2 - 5);
    expect(tostGruppen(f.x, f.y, f.delta)!.df).toBeLessThan(f.n1 + f.n2 - 2 - 5);
  });
  it('Fall b/d: scheitert die untere bzw. obere Grenze (p der scheiternden Seite entscheidet)', () => {
    const b = tostGruppen(tf('b_welch_nicht_gezeigt').x, tf('b_welch_nicht_gezeigt').y, 2)!;
    expect(b.pUnten).toBeGreaterThan(b.pOben); expect(b.pTost).toBe(b.pUnten);
    const d = tostGepaart(tf('d_gepaart_nicht_gezeigt').x, tf('d_gepaart_nicht_gezeigt').y, 1)!;
    expect(d.pOben).toBeGreaterThan(d.pUnten); expect(d.pTost).toBe(d.pOben);
  });
  it('Fall e: vertauschte Gruppen spiegeln das Ergebnis (gleiches pTost, Differenz und KI gespiegelt, Grenzen vertauscht)', () => {
    const a = tf('a_welch_gezeigt'), s = tf('e_spiegel_a');
    const ra = tostGruppen(a.x, a.y, a.delta)!, rs = tostGruppen(s.x, s.y, s.delta)!;
    nah(rs.pTost, ra.pTost, 1e-12); nah(rs.differenz, -ra.differenz, 1e-12); nah(rs.pUnten, ra.pOben, 1e-12); nah(rs.pOben, ra.pUnten, 1e-12);
    nah(rs.ki90[0], -ra.ki90[1], 1e-12); nah(rs.ki90[1], -ra.ki90[0], 1e-12); nah(rs.deltaD, ra.deltaD, 1e-12); nah(rs.dBeob, -ra.dBeob, 1e-12);
  });
  it('Fall e: nur symmetrische Grenzen - Δ muss endlich und größer 0 sein, sonst kein Ergebnis', () => {
    const f = tf('a_welch_gezeigt');
    for (const d of [0, -1, NaN, Infinity, -Infinity]) { expect(tostGruppen(f.x, f.y, d), `Δ = ${d}`).toBeNull(); expect(tostGepaart(f.x, f.y.slice(0, f.x.length), d)).toBeNull(); }
  });
  it('ungültige Daten: zu wenige Werte, ungleich lange Paare, nicht endliche Werte, keine Streuung', () => {
    expect(tostGruppen([1], [1, 2, 3], 1)).toBeNull();
    expect(tostGruppen([1, 2, 3], [], 1)).toBeNull();
    expect(tostGruppen([1, 2, NaN], [1, 2, 3], 1)).toBeNull();
    expect(tostGruppen([5, 5, 5], [5, 5, 5, 5], 1)).toBeNull();
    expect(tostGruppen([5, 5, 5], [4, 5, 6], 1)).not.toBeNull();   // nur eine Gruppe ohne Streuung: Welch ist definiert
    expect(tostGepaart([1, 2, 3], [1, 2], 1)).toBeNull();
    expect(tostGepaart([1], [2], 1)).toBeNull();
    expect(tostGepaart([2, 3, 4], [1, 2, 3], 1)).toBeNull();       // alle Differenzen +1: SD der Differenzen 0
    expect(tostGepaart([2, 3, Infinity], [1, 2, 3], 1)).toBeNull();
  });
  it('Veröffentlicht (TOSTER-Vignette "An Introduction to t_TOST", sleep, Δ = 0,5): gedruckte Zahlen', () => {
    for (const n of ['f_sleep_welch', 'f_sleep_gepaart']) {
      const f = tf(n), v = f.veroeffentlicht!;
      expect(f.quelle).toContain('TOSTER-Vignette');
      const r = (f.art === 'gruppen' ? tostGruppen(f.x, f.y, f.delta) : tostGepaart(f.x, f.y, f.delta))!;
      nah(r.differenz, v.differenz, 1e-9); expect(Math.abs(r.df - v.df)).toBeLessThan(0.005);
      nah(r.tUnten, v.t_unten, 6e-4); nah(r.tOben, v.t_oben, 6e-4); nah(r.pUnten, v.p_unten, 6e-4); nah(r.tNull, v.t_nullhypothese, 6e-4); nah(r.pNull, v.p_nullhypothese, 6e-4);
      nah(r.ki90[0], v.ki90[0]!, 6e-4); nah(r.ki90[1], v.ki90[1]!, 6e-4);
      expect(r.aequivalent).toBe(false);   // beide: Gleichwertigkeit nicht gezeigt (TOST: "don't reject null equivalence hypothesis")
    }
    const w = tf('f_sleep_welch'); expect(Math.abs(tostGruppen(w.x, w.y, 0.5)!.pOben - 0.012)).toBeLessThan(6e-4);   // TOST Upper der Vignette: 0.012
  });
});

describe('G16 Reliable Change Index (Jacobson & Truax 1991)', () => {
  const pruefe = (f: RciSoll, g: ReturnType<typeof rciGruppe>) => {
    expect(g).not.toBeNull();
    const r = g!;
    expect(r.n).toBe(f.n); nah(r.sdVorher, f.sd_vorher); nah(r.sDiff, f.s_diff);
    expect(r.personen).toHaveLength(f.n);
    r.personen.forEach((p, i) => { nah(p.rci, f.rci[i]!); expect(p.einordnung, `Person ${i + 1}`).toBe(f.einordnung[i]); });
    expect(r.anzahl).toEqual(f.anzahl);
    for (const k of ['verbessert', 'unveraendert', 'verschlechtert'] as Eo[]) nah(r.anteil[k], f.anteil[k]);
    expect(r.anzahl.verbessert + r.anzahl.unveraendert + r.anzahl.verschlechtert).toBe(f.n);
  };
  it('Grenze und Formel', () => { expect(RCI_GRENZE).toBe(1.96); expect(J.grenze).toBe(1.96); nah(sDiff(10, 0.5)!, 10, 1e-12); });

  it('g: 20 Personen, r = ,85 eingegeben, hohe Werte besser', () => {
    const f = rf('g_r085_hoch_besser');
    pruefe(f, rciGruppe(f.vorher, f.nachher, f.r, f.hoheBesser));
    expect(f.anzahl).toEqual({ verbessert: 7, unveraendert: 10, verschlechtert: 3 });   // Anker aus R
  });
  it('h: dieselben Daten, hohe Werte schlechter - Einordnung kehrt sich um, RCI-Werte und "unverändert" bleiben', () => {
    const g = rf('g_r085_hoch_besser'), f = rf('h_r085_hoch_schlechter');
    pruefe(f, rciGruppe(f.vorher, f.nachher, f.r, f.hoheBesser));
    expect(f.hoheBesser).toBe(false);
    expect(f.anzahl).toEqual({ verbessert: g.anzahl.verschlechtert, unveraendert: g.anzahl.unveraendert, verschlechtert: g.anzahl.verbessert });
    const rg = rciGruppe(g.vorher, g.nachher, g.r, true)!, rh = rciGruppe(f.vorher, f.nachher, f.r, false)!;
    rg.personen.forEach((p, i) => { nah(rh.personen[i]!.rci, p.rci, 1e-12); });
  });
  it('SD1 ist die SD der Vorher-Werte (n-1), nicht die der Differenzen', () => {
    const f = rf('g_r085_hoch_besser'), r = rciGruppe(f.vorher, f.nachher, f.r, true)!;
    const m = f.vorher.reduce((a, b) => a + b, 0) / f.n, sd = Math.sqrt(f.vorher.reduce((a, b) => a + (b - m) ** 2, 0) / (f.n - 1));
    nah(r.sdVorher, sd, 1e-12); nah(r.sDiff, Math.sqrt(2) * sd * Math.sqrt(1 - f.r), 1e-12);
    nah(rciWert(f.vorher[0]!, f.nachher[0]!, sd, f.r)!, r.personen[0]!.rci, 1e-12);
  });
  it('i: r aus Cronbachs Alpha der Vorher-Items (5 Items) - zweite Quelle psych::alpha = Formel', () => {
    const f = rf('i_alpha_aus_items');
    expect(f.r_quelle).toBe('alpha'); nah(f.alpha_psych, f.alpha_formel!, 1e-10);
    nah(cronbachAlpha(f.items_vorher!)!, f.alpha_formel!, 1e-10);
    nah(f.r, f.alpha_formel!, 1e-12);
    const g = rciAusItems(f.items_vorher!, f.items_nachher!, f.hoheBesser);
    expect(g).not.toBeNull(); nah(g!.alpha, f.alpha_formel!, 1e-10);
    pruefe(f, g);
    // Summenwerte stimmen mit den im Skript gebildeten überein
    const sum = (z: number[][]) => z.map(r => r.reduce((a, b) => a + b, 0));
    expect(sum(f.items_vorher!)).toEqual(f.vorher); expect(sum(f.items_nachher!)).toEqual(f.nachher);
  });
  it('Alpha: ungültige Eingaben -> null', () => {
    expect(cronbachAlpha([[1], [2], [3]])).toBeNull();            // nur 1 Item
    expect(cronbachAlpha([[1, 2]])).toBeNull();                   // nur 1 Person
    expect(cronbachAlpha([[3, 3, 3], [3, 3, 3], [3, 3, 3]])).toBeNull();   // Var(Summe) = 0
  });
  it('j: Grenzfall |RCI| = 1,96 ist NICHT verlässlich, 1,97 schon (Rundung auf 12 Stellen)', () => {
    const f = rf('j_grenzfall_196');
    pruefe(f, rciGruppe(f.vorher, f.nachher, f.r, true));
    expect(f.einordnung).toEqual(['unveraendert', 'unveraendert', 'verbessert', 'verschlechtert', 'unveraendert']);
    expect(einordnung(1.96, true)).toBe('unveraendert'); expect(einordnung(-1.96, true)).toBe('unveraendert');
    expect(einordnung(1.96 + 1e-13, true)).toBe('unveraendert');   // Gleitkomma-Rest nach 12 gültigen Stellen = 1,96
    expect(einordnung(1.9600001, true)).toBe('verbessert'); expect(einordnung(-1.9600001, true)).toBe('verschlechtert');
    expect(einordnung(1.96, false)).toBe('unveraendert');
    expect(einordnung(2.5, false)).toBe('verschlechtert'); expect(einordnung(-2.5, false)).toBe('verbessert');
    expect(einordnung(0, true)).toBe('unveraendert');
  });
  it('k: Jacobson & Truax (1991), Tabelle 1: SD = 7,5, r = ,80, 32,5 -> 47,5 ergibt S_diff = 4,74 und RC = 3,16', () => {
    const f = J.rci.find(x => x.name === 'k_jacobson_truax_1991') as RciPubl;
    expect(f.quelle).toContain('Jacobson');
    nah(sDiff(f.sd1, f.r)!, f.s_diff, 1e-12); nah(rciWert(f.x1, f.x2, f.sd1, f.r)!, f.rci, 1e-12);
    expect(Math.abs(sDiff(7.5, 0.8)! - f.veroeffentlicht.s_diff)).toBeLessThan(0.005);   // gedruckt 4,74
    expect(Math.abs(rciWert(32.5, 47.5, 7.5, 0.8)! - f.veroeffentlicht.rci)).toBeLessThan(0.005);   // gedruckt 3,16
    expect(einordnung(rciWert(32.5, 47.5, 7.5, 0.8)!, true)).toBe('verbessert');
  });
  it('ungültige Eingaben -> null (r = 1, r < 0, SD1 = 0, ungleich lange Listen, weniger als 2 Personen, nicht endliche Werte)', () => {
    expect(sDiff(10, 1)).toBeNull(); expect(sDiff(10, -0.1)).toBeNull(); expect(sDiff(0, 0.5)).toBeNull(); expect(sDiff(-3, 0.5)).toBeNull(); expect(sDiff(NaN, 0.5)).toBeNull();
    expect(sDiff(10, 0)).not.toBeNull(); nah(sDiff(10, 0)!, Math.sqrt(2) * 10, 1e-12);
    expect(rciWert(1, 2, 10, 1)).toBeNull();
    expect(rciGruppe([1, 2, 3], [1, 2], 0.8, true)).toBeNull();
    expect(rciGruppe([1], [2], 0.8, true)).toBeNull();
    expect(rciGruppe([5, 5, 5], [6, 7, 8], 0.8, true)).toBeNull();      // SD der Vorher-Werte 0
    expect(rciGruppe([1, 2, 3], [1, 2, 3], 1, true)).toBeNull();
    expect(rciGruppe([1, 2, 3], [1, 2, Infinity], 0.8, true)).toBeNull();
  });
});
