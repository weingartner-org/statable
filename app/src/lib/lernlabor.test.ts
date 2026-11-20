/* Welle 6, Kachel L4 „Lernlabor“ (Fachblatt docs/fachblaetter/WELLE6-VERSTEHEN.md, L4 und „Entscheidungen Opus“): Bayes/Vierfeldertafel gegen R (exakt), Simulationen über EIGENSCHAFTEN mit festem
 * Startwert und Toleranzen laut Fachblatt (1)-(5), dazu der exakte Vergleich, wo es geht (Randomisierung per Vollauszählung, Überdeckung per Summe über dbinom). Sollwerte: scripts/welle6-erwartet.R.
 * Der Bauer darf Sollwerte, Startwerte und Toleranzen NICHT ändern. Alle Simulationen im Test haben feste Startwerte → das Ergebnis ist deterministisch; ein Fehlschlag ist kein Zufallsflackern.
 * Die Zufallszahlen sind NICHT die von R (mulberry32 ≠ Mersenne-Twister): geprüft wird nie „Zahl gleich R“, sondern Eigenschaft + Toleranz. Rot, bis lib/lernlabor.ts existiert; der Block A (Erzeuger zufall.ts) ist heute grün.
 *
 * API von lib/lernlabor.ts (festgelegt vom Prüfer; reine Funktionen, alle Zufallszahlen aus zufall(startwert) von lib/zufall.ts bzw. teilstrom()):
 *   teilstrom(startwert, nummer) → number          neuer Startwert (ganze Zahl 0 … 2³²−1) aus (Startwert, laufende Nummer) MISCHEN, nicht „+1“ (F11): teilstrom(1,1) ≠ teilstrom(2,0)
 *   Ziehungen aus rng = zufall(s):  ziehNormal(rng, mu, sigma) · ziehExponential(rng, rate) · ziehGleich(rng, a, b) · ziehBinomial(rng, n, p) · ziehPoisson(rng, lambda) · ziehHyper(rng, N, K, n) · ziehWuerfel(rng) (1…6)
 *   type Population = { art:'normal'; mu; sigma } | { art:'gleich'; a; b } | { art:'exponential'; rate } | { art:'zweigipflig'; mu1; mu2; sigma } (50:50-Mischung zweier Normalverteilungen) | { art:'wuerfel' } | { art:'anteil'; p } (0/1)
 *   populationKennzahlen(pop) → { mittel, sd }     (Standardabweichung der Grundgesamtheit, Nenner N)
 *   stichprobenverteilung({ pop, n, B, startwert }) → { werte, mittelDerWerte, empirischerSE, theoretischerSE, theoretischerMittel }   Statistik = Mittelwert (bei 'anteil' ist das der Anteil); 1 ≤ n ≤ 500, 1 ≤ B ≤ 100 000, sonst Fehler (throw)
 *   perzentilIntervall(werte, niveau) → [lo, hi]   Quantil-TYP 7 (R-Standard) bei (1−niveau)/2 und 1−(1−niveau)/2 (F17)
 *   bootstrap({ daten, B, niveau, startwert }) → { werte, mittel, se, lo, hi, tLo, tHi, hinweisKlein }   Mittelwert; Ziehen mit Zurücklegen vom Umfang n; se = SD der Bootstrap-Werte (Nenner B−1 ist egal, B groß);
 *        lo/hi = perzentilIntervall(werte, niveau); tLo/tHi = t-Intervall (lib/kennzahlen.ts); hinweisKlein = (n < 10)
 *   randomisierung({ g1, g2, B, startwert }) → { beobachtet, p, werte, welch: { t, df, p } }    beobachtet = mean(g1) − mean(g2); werte = Differenzen der B Mischungen; p zweiseitig (|d| ≥ |beobachtet|, relative
 *        Toleranz 1e-9) als (Anzahl + 1)/(B + 1) (F16; Phipson & Smyth) - nie 0; welch = Welch-t-Test (Formel)
 *   randomisierungExakt(g1, g2) → { p, anzahl, gesamt } | null      Vollauszählung aller C(n1+n2, n1) Aufteilungen, null wenn gesamt > 20 000; p = anzahl/gesamt (ohne „+1“)
 *   muenzwurf({ p, N, startwert }) → { treffer, relativ, verlauf }          verlauf[i] = relative Häufigkeit nach i+1 Würfen (Länge N)
 *   wuerfelwurf({ wuerfel: 1 | 2, p?: number[6], N, startwert }) → { haeufigkeit }   Index = Augenzahl bzw. Summe (Länge 7 bzw. 13; Index 0, bei zwei Würfeln auch 1, bleibt 0)
 *   urne({ rot, blau, ziehungen, mitZuruecklegen, N, startwert }) → { haeufigkeit }  Index k = Zahl roter Kugeln unter den gezogenen (Länge ziehungen + 1); ohne Zurücklegen ziehungen ≤ rot + blau
 *   ueberdeckung({ art:'mittel'; mu; sigma; n; niveau; anzahl?; startwert; nummer? } | { art:'anteil'; p; n; niveau; anzahl?; startwert; nummer?; mitWald? }) →
 *        { intervalle: { lo, hi, ueberdeckt, treffer?, wald?: { lo, hi, ueberdeckt } }[], anzahl, ueberdeckt, waldUeberdeckt? }   Standard anzahl = 100; nummer = „Weitere 100“ (Teilstrom);
 *        'mittel': t-Intervall der Stichprobe; 'anteil': Wilson (lib/kennzahlen.ts) mit treffer = Zahl der Erfolge; wald = Näherungsformel p̂ ± z√(p̂(1−p̂)/n) - NUR hier, als Vergleich (Opus F5)
 *   bayes(praevalenz, se, sp) → { ppv, npv, pPositiv }
 *   bezugsgroesse(praevalenz, se, sp) → { N, ganzzahlig }       kleinste Zehnerpotenz aus {1000, 10 000, 100 000, 1 000 000}, bei der alle vier Zellen ganzzahlig sind (Toleranz 1e-9 relativ); sonst N = 1000, ganzzahlig = false
 *   vierfeldertafel({ modus:'rate'; praevalenz; se; sp; N? } | { modus:'haeufig'; rp; fp; fn; rn }) → { rp, fp, fn, rn, n, krank, gesund, positiv, negativ, praevalenz, se, sp, ppv, npv, N, ganzzahlig }
 *        (modus 'rate' ohne N nimmt bezugsgroesse(); Zellen werden NIE gerundet; modus 'haeufig': N = n)
 *   unabhaengig(pA, pB, pAB) → { gleich, produkt }              gleich = |pAB − pA·pB| ≤ 1e-9 (F18); produkt = pA·pB
 * TOLERANZEN: siehe Fachblatt (4): (a) Mittel der Mittel = μ ± 4σ/√(nB), empirischer SE = σ/√n ± 4 % (B = 10 000); (b) Bootstrap-SE = √((n−1)/n)·s/√n ± 3 % (B = 10 000); (c) Randomisierungs-p im
 * ± 4√(p(1−p)/B)-Streifen (+ 1/(B+1) für das „+1“) um den EXAKTEN Wert; (d) Überdeckung bei 1e5 Wiederholungen = exakte Überdeckungswahrscheinlichkeit ± 4 SE; (e) relative Häufigkeit → P ± 4√(P(1−P)/N).
 * Umwandlungen: χ²-Anpassung an die in R berechnete Verteilung (N = 1e5), Schwelle p > 1e-4 (kritischer Wert qchisq(1 − 1e-4, df) aus R). Erzeuger: Mittel 0,5 ± 4/√(12n), KS-Abstand < 1,6276/√n (1 %-Wert).
 * NICHT enthalten (Fachblatt (5) „Goldene Zahlen“): der feste Lauf Startwert 1 als Regressionstest - die Zahlen kann nur der fertige Code liefern; der Bauer legt ihn nach grünen Tests an. */
import { describe, expect, it } from 'vitest';
import type * as LL from './lernlabor';
import type * as KZ from './kennzahlen';
import { zufall } from './zufall';
import { diagnose } from './diagnostik';
import erwartet from './testdaten/welle6-erwartet.json';

const mods = import.meta.glob(['./lernlabor.ts', './kennzahlen.ts']);
async function lade<T>(datei: string): Promise<T> {
  const f = mods[datei];
  if (!f) throw new Error(`lib/${datei.slice(2)} fehlt (Welle 6)`);
  return (await f()) as T;
}
const LL_ = () => lade<typeof LL>('./lernlabor.ts');
const KZ_ = () => lade<typeof KZ>('./kennzahlen.ts');

const L4 = (erwartet as unknown as { l4: Record<string, any[]> }).l4;
const GEDRUCKT = (erwartet as unknown as { gedruckt: any[] }).gedruckt;
const nah = (ist: number, soll: number, was: string, rel = 1e-9) => {
  expect(Number.isNaN(ist), `${was}: NaN`).toBe(false);
  if (soll === 0) { expect(Math.abs(ist), `${was}: soll 0, ist ${ist}`).toBeLessThanOrEqual(1e-12); return; }
  expect(Math.abs(ist - soll), `${was}: ist ${ist}, R ${soll}, relativ ${Math.abs(ist - soll) / Math.abs(soll)}`).toBeLessThanOrEqual(rel * Math.abs(soll));
};
const num = (v: unknown): number => (v === 'Inf' ? Infinity : v === '-Inf' ? -Infinity : (v as number));
const mittelwert = (v: ArrayLike<number>) => { let s = 0; for (let i = 0; i < v.length; i++) s += v[i]!; return s / v.length; };
const sdStich = (v: number[]) => { const m = mittelwert(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };
const popAus = (p: any): LL.Population => { const { mittel: _m, sd: _s, ...rest } = p; return rest as LL.Population; };

/* ================================================================================================================ A. Erzeuger (zufall.ts, existiert) */
describe('A. Erzeuger zufall(startwert) (mulberry32): Gleichverteilung und Reproduzierbarkeit - heute grün', () => {
  it('gleicher Startwert → bitgleiche Folge (1000 Zahlen); anderer Startwert → andere Folge', () => {
    const a = zufall(1), b = zufall(1), c = zufall(2);
    const fa = Array.from({ length: 1000 }, a), fb = Array.from({ length: 1000 }, b), fc = Array.from({ length: 1000 }, c);
    expect(fa).toEqual(fb); expect(fa).not.toEqual(fc);
  });
  for (const startwert of [1, 20261016]) {
    it(`Startwert ${startwert}, n = 1e6: Mittel 0,5 ± 4/√(12n), alle Werte in [0; 1), Kolmogorov-Smirnov-Abstand < 1,6276/√n (1 %-Wert)`, () => {
      const n = 1e6, r = zufall(startwert), x = new Float64Array(n);
      for (let i = 0; i < n; i++) x[i] = r();
      expect(Math.abs(mittelwert(x) - 0.5), 'Mittel').toBeLessThanOrEqual(4 / Math.sqrt(12 * n));
      x.sort();
      expect(x[0]!).toBeGreaterThanOrEqual(0); expect(x[n - 1]!).toBeLessThan(1);
      let d = 0; for (let i = 0; i < n; i++) d = Math.max(d, Math.abs((i + 1) / n - x[i]!), Math.abs(i / n - x[i]!));
      expect(d, 'KS-Abstand').toBeLessThan(1.6276 / Math.sqrt(n));
    });
  }
});

/* ================================================================================================================ B. Teilströme (F11) */
describe('B. teilstrom(startwert, nummer): mischen statt „+1“ (F11)', () => {
  it('deterministisch, ganze Zahl in [0; 2³²), alle 36 Paare (Startwert 0…5 × Nummer 0…5) verschieden, und teilstrom(1,1) ≠ teilstrom(2,0), teilstrom(1,2) ≠ teilstrom(2,1)', async () => {
    const { teilstrom } = await LL_(); const alle = new Set<number>();
    for (let s = 0; s < 6; s++) for (let k = 0; k < 6; k++) {
      const t = teilstrom(s, k); expect(t).toBe(teilstrom(s, k)); expect(Number.isInteger(t) && t >= 0 && t < 2 ** 32, `(${s},${k}) = ${t}`).toBe(true); alle.add(t);
    }
    expect(alle.size).toBe(36);
    expect(teilstrom(1, 1)).not.toBe(teilstrom(2, 0)); expect(teilstrom(1, 2)).not.toBe(teilstrom(2, 1));
  });
  it('Teilströme sind unkorreliert: |r| < 4/√n zwischen den Folgen (1,0)/(1,1) und (1,1)/(2,0) bei n = 20 000', async () => {
    const { teilstrom } = await LL_(), n = 20000;
    const folge = (s: number, k: number) => { const r = zufall(teilstrom(s, k)); return Array.from({ length: n }, r); };
    const korr = (a: number[], b: number[]) => { const ma = mittelwert(a), mb = mittelwert(b); let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i]! - ma) * (b[i]! - mb); saa += (a[i]! - ma) ** 2; sbb += (b[i]! - mb) ** 2; } return sab / Math.sqrt(saa * sbb); };
    expect(Math.abs(korr(folge(1, 0), folge(1, 1)))).toBeLessThan(4 / Math.sqrt(n));
    expect(Math.abs(korr(folge(1, 1), folge(2, 0)))).toBeLessThan(4 / Math.sqrt(n));
  });
});

/* ================================================================================================================ C. Umwandlungen */
function chi2Diskret(x: number[], klassen: { von: unknown; bis: unknown; p: number }[]): number {
  const o = new Array(klassen.length).fill(0), N = x.length;
  for (const v of x) { const i = klassen.findIndex(k => v >= num(k.von) && v <= num(k.bis)); expect(i, `Wert ${v} liegt in keiner Klasse (Träger?)`).toBeGreaterThanOrEqual(0); o[i]++; }
  return klassen.reduce((s, k, i) => s + (o[i] - N * k.p) ** 2 / (N * k.p), 0);
}
describe('C. Umwandlungen: 1e5 Ziehungen gegen die in R berechnete Verteilung (χ²-Anpassung, kritischer Wert 1e-4)', () => {
  const N = 1e5;
  for (const u of L4.umwandlung_diskret!) {
    const titel = u.art === 'binom' ? `Binomial(${u.n}; ${u.p})` : u.art === 'poisson' ? `Poisson(${u.lambda})` : u.art === 'hyper' ? `hypergeometrisch(${u.N}, ${u.K}, ${u.n})` : 'Würfel';
    it(`${titel}: χ² (df ${u.df}) < ${u.kritisch.toFixed(2)}`, async () => {
      const L = await LL_(), r = zufall(20261016), x: number[] = [];
      for (let i = 0; i < N; i++) x.push(u.art === 'binom' ? L.ziehBinomial(r, u.n, u.p) : u.art === 'poisson' ? L.ziehPoisson(r, u.lambda) : u.art === 'hyper' ? L.ziehHyper(r, u.N, u.K, u.n) : L.ziehWuerfel(r));
      expect(chi2Diskret(x, u.klassen)).toBeLessThan(u.kritisch);
    });
  }
  for (const u of L4.umwandlung_stetig!) {
    const titel = u.art === 'normal' ? `Normal(${u.mu}; ${u.sigma})` : u.art === 'exponential' ? `Exponential(${u.rate})` : `Gleich(${u.a}; ${u.b})`;
    it(`${titel}: 100 Klassen gleicher Wahrscheinlichkeit (Kanten aus R), χ² (df 99) < ${u.kritisch.toFixed(2)}`, async () => {
      const L = await LL_(), r = zufall(20261016), kanten: number[] = u.kanten, o = new Array(100).fill(0);
      for (let i = 0; i < N; i++) {
        const v = u.art === 'normal' ? L.ziehNormal(r, u.mu, u.sigma) : u.art === 'exponential' ? L.ziehExponential(r, u.rate) : L.ziehGleich(r, u.a, u.b);
        let lo = 0, hi = kanten.length; while (lo < hi) { const m = (lo + hi) >> 1; if (kanten[m]! < v) lo = m + 1; else hi = m; } o[lo]++;
      }
      const e = N / 100; expect(o.reduce((s, c) => s + (c - e) ** 2 / e, 0)).toBeLessThan(u.kritisch);
    });
  }
});

/* ================================================================================================================ D./E. Stichprobenverteilung (ZGS) */
describe('D. Populationen und Stichprobenverteilung (Fachblatt 4a)', () => {
  it('populationKennzahlen gegen R (Formeln, numerisch gegengeprüft): μ und σ der Grundgesamtheit', async () => {
    const { populationKennzahlen } = await LL_();
    for (const p of L4.populationen!) { const k = populationKennzahlen(popAus(p)); nah(k.mittel, p.mittel, `${p.art} μ`, 1e-12); nah(k.sd, p.sd, `${p.art} σ`, 1e-12); }
  });
  L4.populationen!.forEach((p, i) => {
    const n = p.art === 'exponential' ? 5 : p.art === 'anteil' ? 50 : 25, B = 10000;
    it(`${p.art} (${JSON.stringify(popAus(p)).slice(0, 60)}), n = ${n}, B = ${B}: Mittel der Mittel = μ ± 4σ/√(nB); empirischer SE = σ/√n ± 4 %; theoretischer SE = σ/√n`, async () => {
      const { stichprobenverteilung } = await LL_(), r = stichprobenverteilung({ pop: popAus(p), n, B, startwert: 100 + i });
      expect(r.werte.length).toBe(B);
      const se = p.sd / Math.sqrt(n);
      nah(r.theoretischerSE, se, 'theoretischer SE', 1e-12); nah(r.theoretischerMittel, p.mittel, 'theoretischer Mittelwert', 1e-12);
      expect(Math.abs(r.mittelDerWerte - p.mittel), 'Mittel der Mittel').toBeLessThanOrEqual(4 * p.sd / Math.sqrt(n * B));
      expect(Math.abs(r.empirischerSE / se - 1), `empirischer SE ${r.empirischerSE} gegen ${se}`).toBeLessThanOrEqual(0.04);
      expect(Math.abs(mittelwert(r.werte) - r.mittelDerWerte)).toBeLessThan(1e-9);
    });
  });
  it('n = 1 und n = 500 gehen, n = 0, n = 501, B = 0 und B = 100 001 sind Fehler (Obergrenzen des Fachblatts)', async () => {
    const { stichprobenverteilung } = await LL_(), pop: LL.Population = { art: 'normal', mu: 0, sigma: 1 };
    expect(() => stichprobenverteilung({ pop, n: 1, B: 10, startwert: 1 })).not.toThrow(); expect(() => stichprobenverteilung({ pop, n: 500, B: 10, startwert: 1 })).not.toThrow();
    expect(() => stichprobenverteilung({ pop, n: 0, B: 10, startwert: 1 })).toThrow(); expect(() => stichprobenverteilung({ pop, n: 501, B: 10, startwert: 1 })).toThrow();
    expect(() => stichprobenverteilung({ pop, n: 5, B: 0, startwert: 1 })).toThrow(); expect(() => stichprobenverteilung({ pop, n: 5, B: 100001, startwert: 1 })).toThrow();
  });
});

/* ================================================================================================================ F. Bootstrap */
describe('F. Bootstrap (Fachblatt 4b, F17)', () => {
  it('perzentilIntervall = R quantile(type = 7) für 1001 und 7 Werte, Niveau 90/95/99 % (1e-12)', async () => {
    const { perzentilIntervall } = await LL_();
    for (const z of L4.perzentil!) for (const iv of z.intervalle) { const [lo, hi] = perzentilIntervall(z.werte, iv.niveau); nah(lo, iv.lo, `${z.name} ${iv.niveau} lo`, 1e-12); nah(hi, iv.hi, `${z.name} ${iv.niveau} hi`, 1e-12); }
  });
  for (const b of L4.bootstrap!) {
    it(`${b.name} (n = ${b.n}): Bootstrap-SE = √((n−1)/n)·s/√n ± 3 % bei B = 10 000; Perzentil-Intervall; t-Intervall aus Kachel 2; Hinweis n < 10 = ${b.hinweis_klein}`, async () => {
      const { bootstrap, perzentilIntervall } = await LL_(), r = bootstrap({ daten: b.daten, B: 10000, niveau: 0.95, startwert: 7 });
      expect(r.werte.length).toBe(10000);
      expect(Math.abs(r.se / b.se_boot_exakt - 1), `SE ${r.se} gegen ${b.se_boot_exakt}`).toBeLessThanOrEqual(0.03);
      nah(r.mittel, b.mittel, 'Mittel der Daten', 1e-12);
      const [lo, hi] = perzentilIntervall(r.werte, 0.95); expect([r.lo, r.hi]).toEqual([lo, hi]);
      expect(r.lo).toBeLessThan(b.mittel); expect(r.hi).toBeGreaterThan(b.mittel);
      const min = Math.min(...b.daten), max = Math.max(...b.daten); expect(Math.min(...r.werte)).toBeGreaterThanOrEqual(min - 1e-12); expect(Math.max(...r.werte)).toBeLessThanOrEqual(max + 1e-12);
      nah(r.tLo, b.t_lo, 't-Intervall unten', 1e-9); nah(r.tHi, b.t_hi, 't-Intervall oben', 1e-9);
      expect(r.hinweisKlein).toBe(b.hinweis_klein);
    });
  }
});

/* ================================================================================================================ G. Randomisierung */
describe('G. Randomisierungstest (Fachblatt 4c, F16)', () => {
  for (const r of L4.randomisierung!) {
    it(`${r.name}: Welch-t wie R; ${r.exakt ? 'Vollauszählung exakt (C = ' + r.gesamt + '); Simulation im ± 4√(p(1−p)/B)-Streifen um den exakten Wert' : 'C = ' + r.gesamt + ' > 20 000 → keine Vollauszählung (null)'}`, async () => {
      const { randomisierung, randomisierungExakt } = await LL_(), B = 10000;
      const s = randomisierung({ g1: r.g1, g2: r.g2, B, startwert: 3 });
      nah(s.beobachtet, r.beobachtet, 'beobachtete Differenz', 1e-12);
      if (r.beobachtet !== 0) { nah(s.welch.t, r.welch_t, 'Welch t', 1e-9); nah(s.welch.df, r.welch_df, 'Welch df', 1e-9); nah(s.welch.p, r.welch_p, 'Welch p', 1e-9); }
      expect(s.werte.length).toBe(B);
      expect(Math.round(s.p * (B + 1) * 1e6) / 1e6, 'p = (Anzahl + 1)/(B + 1)').toBe(Math.round(s.p * (B + 1)));
      expect(s.p).toBeGreaterThanOrEqual(1 / (B + 1)); expect(s.p).toBeLessThanOrEqual(1);
      const ex = randomisierungExakt(r.g1, r.g2);
      if (!r.exakt) { expect(ex).toBeNull(); return; }
      expect(ex).not.toBeNull(); expect(ex!.gesamt).toBe(r.gesamt); expect(ex!.anzahl).toBe(r.exakt.anzahl); nah(ex!.p, r.exakt.p, 'exaktes p', 1e-12);
      expect(Math.abs(s.p - r.exakt.p), `Simulation ${s.p} gegen exakt ${r.exakt.p}`).toBeLessThanOrEqual(4 * Math.sqrt(r.exakt.p * (1 - r.exakt.p) / B) + 1 / (B + 1));
    });
  }
  it('„+1“: klarer Unterschied (3 gegen 3 Werte, kein Überlapp) → p ≥ 1/(B + 1) und nie 0; die Vollauszählung gibt dort 2/20 = 0,1', async () => {
    const { randomisierung, randomisierungExakt } = await LL_(), B = 999;
    const s = randomisierung({ g1: [100, 101, 102], g2: [1, 2, 3], B, startwert: 1 });
    expect(s.p).toBeGreaterThan(0); expect(s.p).toBeGreaterThanOrEqual(1 / (B + 1));
    const e = randomisierungExakt([100, 101, 102], [1, 2, 3]); expect(e!.anzahl).toBe(2); expect(e!.gesamt).toBe(20); nah(e!.p, 0.1, 'exakt', 1e-12);
  });
});

/* ================================================================================================================ H. Zufallsexperimente */
describe('H. Zufallsexperimente (Fachblatt 4d/4e): relative Häufigkeit → P ± 4√(P(1−P)/N) bei N = 1e5', () => {
  const N = 1e5;
  const streifen = (h: ArrayLike<number>, P: number[], was: string) => {
    expect(Array.from(h).reduce((a, b) => a + b, 0), `${was}: Summe der Häufigkeiten`).toBe(N);
    P.forEach((p, k) => { if (p === 0) expect(h[k], `${was} k=${k}`).toBe(0); else expect(Math.abs(h[k]! / N - p), `${was} k=${k}: ${h[k]! / N} gegen ${p}`).toBeLessThanOrEqual(4 * Math.sqrt(p * (1 - p) / N)); });
  };
  for (const e of L4.experimente!) {
    const titel = `${e.art}${e.rot !== undefined ? ` (${e.rot} rot, ${e.blau} blau, ${e.ziehungen} Ziehungen)` : ''}`;
    it(titel, async () => {
      const L = await LL_();
      if (e.art === 'muenze') {
        const r = L.muenzwurf({ p: e.p, N, startwert: 1 });
        streifen([N - r.treffer, r.treffer], e.werte, titel); expect(r.relativ).toBe(r.treffer / N);
        expect(r.verlauf.length).toBe(N); expect(r.verlauf[N - 1]).toBe(r.treffer / N); expect(r.verlauf[0] === 0 || r.verlauf[0] === 1).toBe(true);
      } else if (e.art.startsWith('wuerfel1')) streifen(L.wuerfelwurf({ wuerfel: 1, p: e.art === 'wuerfel1' ? undefined : e.p, N, startwert: 1 }).haeufigkeit, [0, ...e.p], titel);
      else if (e.art === 'wuerfel2_summe') streifen(L.wuerfelwurf({ wuerfel: 2, N, startwert: 1 }).haeufigkeit, e.p, titel);
      else streifen(L.urne({ rot: e.rot, blau: e.blau, ziehungen: e.ziehungen, mitZuruecklegen: e.art === 'urne_mit', N, startwert: 1 }).haeufigkeit, e.p, titel);
    });
  }
  it('Verlauf der relativen Häufigkeit (Gesetz der großen Zahlen): nach 10 000 Würfen einer fairen Münze im Streifen 0,5 ± 4·√(0,25/10 000), und der Verlauf ist die laufende Summe', async () => {
    const { muenzwurf } = await LL_(), r = muenzwurf({ p: 0.5, N: 20000, startwert: 5 });
    expect(Math.abs(r.verlauf[9999]! - 0.5)).toBeLessThanOrEqual(4 * Math.sqrt(0.25 / 10000));
    for (const i of [0, 9, 99, 999, 19999]) expect(Number.isInteger(Math.round(r.verlauf[i]! * (i + 1) * 1e6) / 1e6) && Math.abs(r.verlauf[i]! * (i + 1) - Math.round(r.verlauf[i]! * (i + 1))) < 1e-6, `Verlauf[${i}] · ${i + 1} ist eine ganze Zahl`).toBe(true);
  });
});

/* ================================================================================================================ I. Überdeckung */
describe('I. Überdeckung von Konfidenzintervallen (Fachblatt 4f)', () => {
  const REP = 100000;
  const streifen = (anteil: number, soll: number, was: string) => expect(Math.abs(anteil - soll), `${was}: ${anteil} gegen exakt ${soll}`).toBeLessThanOrEqual(4 * Math.sqrt(soll * (1 - soll) / REP));
  for (const u of L4.ueberdeckung!) {
    it(`Anteil n = ${u.n}, p = ${u.p}, 95 %: 1e5 Wiederholungen → Wilson ${u.wilson.toFixed(4)} (exakt, Summe über dbinom), Wald ${u.wald.toFixed(4)} (exakt) jeweils ± 4 SE`, async () => {
      const { ueberdeckung } = await LL_(), r = ueberdeckung({ art: 'anteil', p: u.p, n: u.n, niveau: 0.95, anzahl: REP, startwert: 1, mitWald: true });
      expect(r.intervalle.length).toBe(REP); expect(r.anzahl).toBe(REP);
      streifen(r.ueberdeckt / REP, u.wilson, 'Wilson'); streifen(r.waldUeberdeckt! / REP, u.wald, 'Wald');
    }, 60000);
  }
  for (const u of L4.ueberdeckung_niveau!) {
    it(`Anteil n = ${u.n}, p = ${u.p}, Niveau ${u.niveau}: Wilson exakt ${u.wilson.toFixed(4)} ± 4 SE`, async () => {
      const { ueberdeckung } = await LL_(), r = ueberdeckung({ art: 'anteil', p: u.p, n: u.n, niveau: u.niveau, anzahl: REP, startwert: 2 });
      streifen(r.ueberdeckt / REP, u.wilson, 'Wilson');
    }, 60000);
  }
  for (const n of [5, 30]) {
    it(`Mittelwert (t-Intervall), Normal(50; 10), n = ${n}, 95 %: exakte Überdeckung ist das Niveau; 1e5 Wiederholungen ± 4 SE`, async () => {
      const { ueberdeckung } = await LL_(), r = ueberdeckung({ art: 'mittel', mu: 50, sigma: 10, n, niveau: 0.95, anzahl: REP, startwert: 3 });
      streifen(r.ueberdeckt / REP, 0.95, `t-KI n=${n}`);
    }, 60000);
  }
  it('Wald überdeckt bei n = 50, p = 0,05 deutlich schlechter als Wilson (Brown, Cai & DasGupta 2001) - gleiche Aussage wie die exakten Zahlen aus R', () => {
    const g = GEDRUCKT.find(x => x.kachel === 'L4' && /Wilson gegen Wald/.test(x.name))!;
    expect(g.wald).toBeLessThan(g.wilson - 0.03);
  });
  it('100 Intervalle (Standard), Kennzeichnung stimmt, Wilson = lib/kennzahlen.ts, Wald nur auf Wunsch; „Weitere 100“ (nummer) liefert neue, aber reproduzierbare Intervalle', async () => {
    const { ueberdeckung } = await LL_(), { wilsonIntervall } = await KZ_();
    const a = ueberdeckung({ art: 'anteil', p: 0.3, n: 40, niveau: 0.95, startwert: 1 });
    expect(a.intervalle.length).toBe(100); expect(a.anzahl).toBe(100); expect(a.waldUeberdeckt).toBeUndefined(); expect(a.intervalle.every(i => i.wald === undefined)).toBe(true);
    expect(a.ueberdeckt).toBe(a.intervalle.filter(i => i.ueberdeckt).length);
    for (const i of a.intervalle) {
      expect(i.ueberdeckt, `[${i.lo}; ${i.hi}]`).toBe(i.lo <= 0.3 && 0.3 <= i.hi);
      const w = wilsonIntervall(i.treffer!, 40, 0.95); nah(i.lo, w.lo, 'lo', 1e-12); nah(i.hi, w.hi, 'hi', 1e-12);
    }
    const b = ueberdeckung({ art: 'anteil', p: 0.3, n: 40, niveau: 0.95, startwert: 1, nummer: 1 }), b2 = ueberdeckung({ art: 'anteil', p: 0.3, n: 40, niveau: 0.95, startwert: 1, nummer: 1 });
    expect(b).toEqual(b2); expect(b.intervalle).not.toEqual(a.intervalle);
    const m = ueberdeckung({ art: 'mittel', mu: 50, sigma: 10, n: 12, niveau: 0.9, startwert: 1 });
    for (const i of m.intervalle) expect(i.ueberdeckt).toBe(i.lo <= 50 && 50 <= i.hi);
    const w = ueberdeckung({ art: 'anteil', p: 0.3, n: 40, niveau: 0.95, startwert: 1, mitWald: true });
    for (const i of w.intervalle) { expect(i.wald).toBeDefined(); expect(i.wald!.ueberdeckt).toBe(i.wald!.lo <= 0.3 && 0.3 <= i.wald!.hi); }
  });
});

/* ================================================================================================================ J. Bayes / Vierfeldertafel */
describe('J. Vierfeldertafel und Bayes (Fachblatt 4e, F10, F18) - reine Arithmetik, 1e-12', () => {
  it('Bayes aus Prävalenz, Sensitivität, Spezifität: PPV, NPV, P(positiv) wie R (Formel); dazu natürliche Häufigkeiten', async () => {
    const { bayes } = await LL_();
    for (const b of L4.bayes!) { const r = bayes(b.praevalenz, b.se, b.sp), t = `π=${b.praevalenz} Se=${b.se} Sp=${b.sp}`; nah(r.ppv, b.ppv, `${t} PPV`, 1e-12); nah(r.npv, b.npv, `${t} NPV`, 1e-12); nah(r.pPositiv, b.p_pos, `${t} P(positiv)`, 1e-12); }
  });
  it('Bezugsgröße so, dass alle Zellen ganzzahlig sind (kleinste Zehnerpotenz ab 1000, bis 10⁶), sonst 1000 mit Dezimalstellen und ganzzahlig = false', async () => {
    const { bezugsgroesse } = await LL_();
    for (const b of L4.bayes!) { const r = bezugsgroesse(b.praevalenz, b.se, b.sp); expect(r.N, `π=${b.praevalenz} Se=${b.se} Sp=${b.sp}`).toBe(b.N); expect(r.ganzzahlig).toBe(b.ganzzahlig); }
    expect(bezugsgroesse(0.01, 0.9, 0.91).N).toBe(10000);       // 89,1 falsch Positive bei N = 1000 → erst N = 10 000 ist ganzzahlig (Fachblatt F10)
  });
  it('Modus Prävalenz/Se/Sp: alle vier Zellen und die Ränder wie R, NIE gerundet; auch mit vorgegebenem N', async () => {
    const { vierfeldertafel } = await LL_();
    for (const b of L4.bayes!) {
      const t = vierfeldertafel({ modus: 'rate', praevalenz: b.praevalenz, se: b.se, sp: b.sp }), w = `π=${b.praevalenz} Se=${b.se} Sp=${b.sp}`;
      nah(t.rp, b.rp, `${w} RP`, 1e-9); nah(t.fp, b.fp, `${w} FP`, 1e-9); nah(t.fn, b.fn, `${w} FN`, 1e-9); nah(t.rn, b.rn, `${w} RN`, 1e-9);
      nah(t.krank, b.krank, `${w} krank`, 1e-9); nah(t.gesund, b.gesund, `${w} gesund`, 1e-9); nah(t.positiv, b.positiv, `${w} positiv`, 1e-9); nah(t.negativ, b.negativ, `${w} negativ`, 1e-9);
      nah(t.ppv, b.ppv, `${w} PPV`, 1e-12); nah(t.npv, b.npv, `${w} NPV`, 1e-12); expect(t.N).toBe(b.N); expect(t.n).toBe(b.N);
    }
    const t = vierfeldertafel({ modus: 'rate', praevalenz: 1 / 3, se: 0.6, sp: 0.8, N: 1000 });
    nah(t.krank, 1000 / 3, 'krank (nicht gerundet)', 1e-12); expect(Number.isInteger(t.krank)).toBe(false); expect(t.ganzzahlig).toBe(false);
    expect(vierfeldertafel({ modus: 'rate', praevalenz: 0.1, se: 0.5, sp: 0.5, N: 200 }).rp).toBe(10);
  });
  it('Modus vier Häufigkeiten: Se, Sp, Prävalenz, PPV, NPV wie R; PPV gleich lib/diagnostik.ts diagnose() (Punktschätzer)', async () => {
    const { vierfeldertafel } = await LL_();
    for (const h of L4.haeufigkeiten!) {
      const t = vierfeldertafel({ modus: 'haeufig', rp: h.rp, fp: h.fp, fn: h.fn, rn: h.rn }), w = `RP=${h.rp} FP=${h.fp} FN=${h.fn} RN=${h.rn}`;
      expect(t.n).toBe(h.n); nah(t.praevalenz, h.praevalenz, `${w} Prävalenz`, 1e-12); nah(t.sp, h.sp, `${w} Sp`, 1e-12); nah(t.npv, h.npv, `${w} NPV`, 1e-12);
      if (h.se !== null) nah(t.se, h.se, `${w} Se`, 1e-12); if (h.ppv !== null) nah(t.ppv, h.ppv, `${w} PPV`, 1e-12);
      if (h.rp > 0 && h.fp > 0 && h.fn > 0 && h.rn > 0) { const d = diagnose(h.rp, h.fp, h.fn, h.rn); nah(t.ppv, d.ppv.wert, `${w} PPV gegen diagnose()`, 1e-12); nah(t.se, d.se.wert, `${w} Se gegen diagnose()`, 1e-12); }
    }
  });
  it('Unabhängigkeit: P(A ∩ B) = P(A)·P(B) nur bei Gleichheit innerhalb 1e-9; Zahlen nebeneinander (F18)', async () => {
    const { unabhaengig, vierfeldertafel } = await LL_();
    for (const u of L4.unabhaengig_haeufig!) { const t = vierfeldertafel({ modus: 'haeufig', rp: u.rp, fp: u.fp, fn: u.fn, rn: u.rn }), r = unabhaengig(t.krank / t.n, t.positiv / t.n, t.rp / t.n); expect(r.gleich, u.name).toBe(u.unabhaengig); nah(r.produkt, u.produkt, `${u.name} Produkt`, 1e-12); }
    for (const u of L4.unabhaengig_rate!) { const r = unabhaengig(u.pA, u.pB, u.pAB); expect(r.gleich, `π=${u.praevalenz} Se=${u.se} Sp=${u.sp}`).toBe(u.unabhaengig); nah(r.produkt, u.produkt, 'Produkt', 1e-12); }
  });
  it('gedruckt: Mammographie (Gigerenzer & Hoffrage 1995; Zahlen über Sekundärquellen, siehe JSON): 1 %, 80 %, 9,6 % falsch positiv → 7,8 %; Häufigkeiten 8 von 103', async () => {
    const { bayes, vierfeldertafel } = await LL_(), g = GEDRUCKT.find(x => x.kachel === 'L4' && /Mammographie/.test(x.name))!;
    const r = bayes(g.praevalenz, g.se, 1 - g.fpr); expect(Math.round(r.ppv * 1000) / 10).toBe(g.ppv_prozent_gedruckt);
    const t = vierfeldertafel({ modus: 'haeufig', rp: g.haeufigkeiten.rp, fp: g.haeufigkeiten.fp, fn: g.haeufigkeiten.fn, rn: g.haeufigkeiten.rn });
    expect(t.positiv).toBe(103); expect(t.rp).toBe(8); expect(Math.round(t.ppv * 1000) / 10).toBe(7.8);
    const m = vierfeldertafel({ modus: 'rate', praevalenz: 0.01, se: 0.8, sp: 0.904 });
    expect(m.N).toBe(100000); nah(m.fp, 9504, 'FP bei N = 100 000', 1e-9);
  });
});

/* ================================================================================================================ K. Reproduzierbarkeit */
describe('K. Reproduzierbarkeit (Fachblatt (1)): gleicher Startwert → gleiche Ausgabe, kein versteckter Zustand', () => {
  it('jede Simulation zweimal mit dazwischen anderer Arbeit: JSON-gleich; anderer Startwert → anders; Ergebnis übersteht JSON-Rundlauf (Speichern/Neuladen)', async () => {
    const L = await LL_();
    const lauf = (s: number) => ({
      sv: L.stichprobenverteilung({ pop: { art: 'exponential', rate: 1 }, n: 10, B: 500, startwert: s }),
      bs: L.bootstrap({ daten: [3, 5, 8, 9, 12, 15, 4, 6], B: 500, niveau: 0.95, startwert: s }),
      rz: L.randomisierung({ g1: [5, 7, 9, 12], g2: [3, 4, 8], B: 500, startwert: s }),
      mw: L.muenzwurf({ p: 0.4, N: 300, startwert: s }),
      uw: L.ueberdeckung({ art: 'anteil', p: 0.3, n: 30, niveau: 0.95, startwert: s })
    });
    const a = lauf(1); lauf(99); const b = lauf(1), c = lauf(2);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b)); expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
    expect(JSON.parse(JSON.stringify(a))).toEqual(a);
  });
});
