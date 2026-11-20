/**
 * Anpassungstests (Welle 7, T1): Lilliefors-Test auf Normalverteilung und χ²-Anpassungstest für Kategorien.
 *
 * Lilliefors: Kolmogorov-Smirnov mit aus den Daten geschätzten Parametern (Lilliefors 1967), die p-Werte genau nach der Näherung
 * von R `nortest::lillie.test` (Dallal & Wilkinson 1986). ⚠ PSPP `NPAR TESTS /K-S(NORMAL)` hat dasselbe D, rechnet aber OHNE diese Korrektur;
 * sein „Asymp. Sig.“ ist zu groß (zu vorsichtig). Statable zeigt diese PSPP-Zahl nie.
 * χ²-Anpassung: wie R `chisq.test(x, p)` (ohne Stetigkeitskorrektur, ohne exakten Test); Cochran-Hinweis (1954) bei kleinen erwarteten Häufigkeiten.
 * Geprüft gegen R und PSPP (anpassung.test.ts, Sollwerte scripts/welle7-erwartet.R). ⚠ von der Fachperson abzunehmen.
 */
import { normal, chiQuadratP } from './verteilung';

export interface LillieforsErgebnis { d: number; p: number; n: number }

/** Lilliefors-Test; `null` bei weniger als 5 gültigen Werten oder konstanten Daten (nortest: Fehler bzw. NaN). Nicht endliche Werte werden ausgelassen. */
export function lilliefors(werte: number[]): LillieforsErgebnis | null {
  const x = werte.filter(Number.isFinite).sort((a, b) => a - b), n = x.length;
  if (n < 5) return null;
  const m = x.reduce((s, v) => s + v, 0) / n, sd = Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
  if (!(sd > 0)) return null;
  let d = 0;
  x.forEach((v, i) => { const p = normal((v - m) / sd); d = Math.max(d, (i + 1) / n - p, p - i / n); });
  const gross = n > 100, kd = gross ? d * (n / 100) ** 0.49 : d, nd = gross ? 100 : n;
  let p = Math.exp(-7.01256 * kd * kd * (nd + 2.78019) + 2.99587 * kd * Math.sqrt(nd + 2.78019) - 0.122119 + 0.974598 / Math.sqrt(nd) + 1.67997 / nd);
  if (p > 0.1) {
    const k = (Math.sqrt(n) - 0.01 + 0.85 / Math.sqrt(n)) * d;
    if (k <= 0.302) p = 1;
    else if (k <= 0.5) p = 2.76773 - 19.828315 * k + 80.709644 * k ** 2 - 138.55152 * k ** 3 + 81.218052 * k ** 4;
    else if (k <= 0.9) p = -4.901232 + 40.662806 * k - 97.490286 * k ** 2 + 94.029866 * k ** 3 - 32.355711 * k ** 4;
    else if (k <= 1.31) p = 6.198765 - 19.558097 * k + 23.186922 * k ** 2 - 12.234627 * k ** 3 + 2.423045 * k ** 4;
    else p = 0;
  }
  return { d, p, n };
}

export interface Chi2Anpassung {
  n: number; k: number; df: number; chi2: number; p: number;
  anteile: number[]; erwartet: number[]; residuen: number[]; stdResiduen: number[];
  minErwartet: number; anzahlUnter5: number; anteilUnter5: number;
  /** kleinste erwartete Häufigkeit unter 5 */
  hinweisUnter5: boolean;
  /** Cochran (1954): kleinste erwartete Häufigkeit unter 1 ODER mehr als 20 % der Kategorien unter 5 - das p ist dann unsicher */
  hinweisStreng: boolean;
}

/**
 * χ²-Anpassungstest. `beobachtet` = Häufigkeiten je Kategorie; `anteile` = erwartete Anteile oder Gewichte (werden auf Summe 1 gebracht), ohne: Gleichverteilung.
 * Wirft bei weniger als 2 Kategorien, falschen Häufigkeiten, n = 0 oder unbrauchbaren Anteilen.
 */
export function chi2Anpassung(beobachtet: number[], anteile?: number[]): Chi2Anpassung {
  const k = beobachtet.length;
  if (k < 2) throw new Error('Mindestens zwei Kategorien nötig');
  if (beobachtet.some(o => !Number.isInteger(o) || o < 0)) throw new Error('Häufigkeiten müssen ganze Zahlen ab 0 sein');
  const n = beobachtet.reduce((s, o) => s + o, 0);
  if (n === 0) throw new Error('Keine Beobachtungen');
  let pi: number[];
  if (anteile) {
    if (anteile.length !== k) throw new Error('Anteile und Kategorien passen nicht zusammen');
    if (anteile.some(a => !Number.isFinite(a) || a <= 0)) throw new Error('Anteile müssen größer als 0 sein');
    const s = anteile.reduce((t, a) => t + a, 0);
    pi = anteile.map(a => a / s);
  } else pi = beobachtet.map(() => 1 / k);
  const erwartet = pi.map(a => a * n);
  const residuen = beobachtet.map((o, i) => (o - erwartet[i]!) / Math.sqrt(erwartet[i]!));
  const stdResiduen = beobachtet.map((o, i) => (o - erwartet[i]!) / Math.sqrt(erwartet[i]! * (1 - pi[i]!)));
  const chi2 = residuen.reduce((s, r) => s + r * r, 0), df = k - 1;
  const minErwartet = Math.min(...erwartet), anzahlUnter5 = erwartet.filter(e => e < 5).length, anteilUnter5 = anzahlUnter5 / k;
  return {
    n, k, df, chi2, p: chiQuadratP(chi2, df), anteile: pi, erwartet, residuen, stdResiduen,
    minErwartet, anzahlUnter5, anteilUnter5, hinweisUnter5: minErwartet < 5, hinweisStreng: minErwartet < 1 || anteilUnter5 > 0.2
  };
}
