/**
 * Nachrechnung der Aufgaben aus `rechenaufgaben-sf.ts` auf einem zweiten Weg (nur vom Wächter `rechenaufgaben.test.ts` gelesen).
 * Sollwerte, die R braucht (p-Wert), stehen in lib/testdaten/ueben-erwartet-sauber-forschen.json (scripts/ueben-erwartet-sauber-forschen.R); hier wird der p-Wert zusätzlich
 * durch numerische Integration der t-Dichte nachgerechnet.
 */
import { expect } from 'vitest';
import { DATEN_KREIS, DATEN_HACK, DATEN_VORREG, DATEN_PWERT, DATEN_BAYES } from './rechenaufgaben-sf';
import ERW from '../lib/testdaten/ueben-erwartet-sauber-forschen.json';

/** ln Γ(x) nach Lanczos. */
const lgamma = (x: number): number => {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
  let s = 1.000000000190015; for (const c of g) s += c / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
};
/** Zweiseitiger p-Wert der t-Verteilung: Fläche der Dichte jenseits von |t| (Simpson-Regel, Obergrenze 80). */
const pT = (t: number, df: number): number => {
  const c = Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2)) / Math.sqrt(df * Math.PI);
  const f = (x: number) => c * (1 + x * x / df) ** (-(df + 1) / 2);
  const a = Math.abs(t), b = 80, n = 200000, h = (b - a) / n;
  let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return 2 * (s * h / 3);
};
const binom = (n: number, k: number) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
/** Fehlalarmrisiko in Prozent über die Summe der Binomialwahrscheinlichkeiten (mindestens ein Treffer). */
const risiko = (m: number, a: number) => { let s = 0; for (let k = 1; k <= m; k++) s += binom(m, k) * a ** k * (1 - a) ** (m - k); return s * 100; };

export function sollSF(id: string): Record<string, number> | undefined {
  if (id === 'forschungskreislauf-vorhersage') {
    const { ausgeschlafen: a, kurz: k } = DATEN_KREIS;
    const m = (x: number[]) => x[0]! + x.reduce((s, v) => s + (v - x[0]!), 0) / x.length;   // Anfangswert plus mittlere Abweichung davon
    const grenze = m(a);
    return { 'mittel-lang': m(a), 'mittel-kurz': m(k), unterschied: m(k) - m(a), 'ueber-vergleich': [...k].sort((x, y) => y - x).findIndex(v => v <= grenze) === -1 ? k.length : [...k].sort((x, y) => y - x).findIndex(v => v <= grenze) };
  }
  if (id === 'fehlalarm-zielgroessen') {
    const { alpha, m } = DATEN_HACK;
    let erst = 1; while (risiko(erst, alpha) <= 50) erst++;
    expect(risiko(erst - 1, alpha)).toBeLessThan(50);
    return { m3: risiko(m[0]!, alpha), m5: risiko(m[1]!, alpha), m20: risiko(m[2]!, alpha), 'm-halb': erst };
  }
  if (id === 'vorregistrierung-plan') {
    const d = DATEN_VORREG;
    let wege = 0; for (let a = 0; a < d.zielgroessen; a++) for (let b = 0; b < d.ausreisser; b++) for (let c = 0; c < d.kontrollgroesse; c++) for (let e = 0; e < d.gruppen; e++) wege++;
    let n = d.ziel; while (n * (100 - d.ausfall * 100) < d.ziel * 100) n++;   // kleinste ganze Zahl mit n · 0,85 ≥ 120, in ganzen Prozent gerechnet
    return { wege, anteil: 100 * (1 / wege), 'alpha-hyp': d.alpha * (1 / d.hypothesen), rekrutieren: n };
  }
  if (id === 'p-bei-n') {
    const d = DATEN_PWERT, se = (n: number) => Math.sqrt(d.sd ** 2 / n + d.sd ** 2 / n);
    const t40 = d.diff / se(40);
    expect(pT(t40, 78)).toBeCloseTo(ERW.n40.p, 6);          // Integration gegen R
    expect(pT(d.diff / se(10), 18)).toBeCloseTo(ERW.n10.p, 6);
    expect(ERW.n40.t).toBeCloseTo(t40, 9);
    return { 'se-10': se(10), 't-10': d.diff / se(10), 't-160': d.diff / se(160), 'p-40': ERW.n40.p };
  }
  if (id === 'beta-posterior') {
    const { a, b, treffer: s, n } = DATEN_BAYES;
    // zweiter Weg: Posterior-Mittel als gewichtetes Mittel aus Prior-Mittel und Anteil der Stichprobe, Gewichte a + b und n
    const prior = a / (a + b), probe = s / n, gewicht = (a + b) / (a + b + n);
    expect(ERW.bayes.post_mittel).toBeCloseTo(gewicht * prior + (1 - gewicht) * probe, 9);
    return { 'prior-mittel': prior, 'post-a': a + s, 'post-b': b + (n - s), 'post-mittel': gewicht * prior + (1 - gewicht) * probe };
  }
  return undefined;
}
