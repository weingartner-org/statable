import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-b-erwartet.json';
import { moeglicheKategorien, vielfalt, vielfaltHinweisText, vielfaltKText, type VielfaltHinweis } from './diversitaet';
import { s } from './sitzung.svelte';

/* ===== Welle S-B, Teil 5: Diversitätsindizes für nominale Variablen (Fachblatt Abschnitt 5 und „Entscheidungen Opus“) =====
 * Sollwerte: scripts/spaeter-b-erwartet.R → testdaten/spaeter-b-erwartet.json (Abschnitt vielfalt): eigene Formeln, gegengeprüft mit DescTools::Entropy und den bekannten Beziehungen
 * (exp(H) = k bei Gleichverteilung, IQV = 1, Gini-Simpson unverzerrt = 1 bei N = S). Der Bauer ändert Test und JSON nicht.
 * Das Modul `lib/diversitaet.ts` (reine Funktionen auf Häufigkeiten, kein PSPP, kein R, keine Oberfläche) hat diese API - sie ist hier festgelegt:
 *
 *   vielfalt(haeufigkeiten: number[], opt?: { moeglich?: number; umfrage?: boolean }): {
 *       n: number /* Σ *\/; besetzt: number /* Kategorien mit Häufigkeit > 0 *\/; moeglich: number /* k: opt.moeglich, sonst besetzt *\/;
 *       shannon: number /* H = −Σ p ln p, natürlicher Logarithmus, 0·ln 0 = 0 *\/; effektiv: number /* exp(H) *\/; invSimpson: number /* 1/Σp² *\/; giniSimpson: number /* 1 − Σp² *\/;
 *       giniSimpsonUnverzerrt: number | null /* 1 − Σ n(n−1)/(N(N−1)); null bei N < 2, bei nicht ganzzahligem N und bei opt.umfrage *\/;
 *       iqv: number | null /* k/(k−1)·(1 − Σp²); null bei k = 1 *\/; pielou: number | null /* J = H/ln k; null bei k = 1 *\/;
 *       hinweise: VielfaltHinweis[] }
 *   Die Häufigkeiten sind Summen der Gewichte (Häufigkeitsgewicht: ganzzahlig, N = Σw; Umfragegewicht: Kommazahlen, opt.umfrage = true: nur gewichtete Anteile, die unverzerrte Form ist gesperrt, kein KI).
 *   VielfaltHinweis = 'kleines-n' (N < 50: H ist bei kleinem N verzerrt klein) | 'k-eins' (k = 1: IQV und J nicht definiert) | 'n-zu-klein' (N < 2: die unverzerrte Form ist nicht definiert)
 *   moeglicheKategorien(opt: { wertelabels: number | null; besetzt: number; nurBesetzte?: boolean }): number
 *       Entscheidung Opus: die MÖGLICHEN Kategorien, wenn Wertelabels sie festlegen (Zahl der Wertelabels ohne fehlende Werte), sonst die besetzten; Schalter „nur besetzte“ gibt die besetzten.
 *   vielfaltKText(k: number, art: 'moeglich' | 'besetzt'): string       der Satzteil „bei 4 möglichen Antworten“ / „bei 3 besetzten Antworten“ (der Satz nennt k immer)
 *   vielfaltHinweisText(code: VielfaltHinweis): string                ganze Sätze (de)
 * Sichtbar (Opus): IQV, Shannon H (ln) mit Gleichmäßigkeit J, effektive Kategorienzahl exp(H); unter „Weitere Zahlen“: Gini-Simpson roh und unverzerrt, 1/Σp²; kein KI, kein Test in S-B.
 */

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const V = (erwartet as any).vielfalt;
const nah = (ist: number, soll: number, tol = 1e-12, was = '') => expect(Math.abs(ist - soll), `${was} ${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const gleichOderNull = (ist: number | null, soll: number | null | undefined, tol = 1e-12) => { if (soll === null || soll === undefined) expect(ist).toBeNull(); else { expect(ist).not.toBeNull(); nah(ist!, soll, tol); } };
const hatNaN = (o: unknown): boolean => typeof o === 'number' ? Number.isNaN(o) : o && typeof o === 'object' ? Object.values(o as object).some(hatNaN) : false;

describe('Pflichtfälle (5.4) gegen die Sollwerte aus R', () => {
  for (const name of Object.keys(V)) it(`${name}`, () => {
    const f = V[name], r = vielfalt(f.haeufigkeiten, { moeglich: f.moeglich, umfrage: f.umfrage });
    expect(r.n).toBeCloseTo(f.n, 12); expect(r.besetzt).toBe(f.besetzt); expect(r.moeglich).toBe(f.moeglich);
    nah(r.shannon, f.shannon); nah(r.effektiv, f.effektiv); nah(r.invSimpson, f.inv_simpson); nah(r.giniSimpson, f.gini_simpson);
    gleichOderNull(r.giniSimpsonUnverzerrt, f.gini_simpson_unverzerrt); gleichOderNull(r.iqv, f.iqv); gleichOderNull(r.pielou, f.pielou);
    nah(r.shannon, f.desctools_entropy, 1e-12, 'DescTools::Entropy');
    const erw: VielfaltHinweis[] = []; if (f.hinweis_kleines_n) erw.push('kleines-n'); if (f.moeglich === 1) erw.push('k-eins'); if (f.n < 2) erw.push('n-zu-klein');
    expect([...r.hinweise].sort(), name).toEqual([...erw].sort()); expect(hatNaN(r)).toBe(false);
  });
  it('die Fälle sind da: Tabelle (40,30,20,10), (97,1,1,1), Gleichverteilung, eine Kategorie, (12,8) mit k = 2 und k = 4, N = 5 alle verschieden, N = 1, Häufigkeitsgewicht, Umfragegewicht, leere Kategorie', () => {
    for (const n of ['tabelle_oben', 'ungleich', 'gleichverteilung', 'eine_kategorie_k1', 'zwei_k2', 'zwei_k4', 'n5_alle_verschieden', 'n1_k1', 'haeufigkeitsgewicht', 'umfragegewicht', 'leere_kategorie']) expect(V[n], n).toBeTruthy();
  });
  it('Fachblatt-Zahlen (N = 100: 40, 30, 20, 10): H = 1,2799 (1,846 Bit), J = ,9232, Gini-Simpson ,70 / unverzerrt ,7071, IQV ,9333, exp(H) = 3,596, 1/Σp² = 3,333', () => {
    const r = vielfalt([40, 30, 20, 10]); nah(r.shannon, 1.279854, 1e-6); nah(r.pielou!, 0.9232, 1e-4); nah(r.giniSimpson, 0.7, 1e-12); nah(r.giniSimpsonUnverzerrt!, 0.7070707, 1e-6); nah(r.iqv!, 0.9333, 1e-4); nah(r.effektiv, 3.596, 1e-3); nah(r.invSimpson, 3.3333333, 1e-6);
    nah(r.shannon / Math.LN2, 1.846, 1e-3); expect(r.hinweise).toEqual([]);   // N = 100: kein Hinweis
  });
});

describe('Beziehungen (zweite Quelle)', () => {
  it('Gleichverteilung 25 × 4: H = ln 4, J = 1, IQV = 1, exp(H) = 1/Σp² = k = 4, Gini-Simpson ,75 (unverzerrt ,7576)', () => {
    const r = vielfalt([25, 25, 25, 25]); nah(r.shannon, Math.log(4)); nah(r.pielou!, 1); nah(r.iqv!, 1); nah(r.effektiv, 4); nah(r.invSimpson, 4); nah(r.giniSimpson, 0.75); nah(r.giniSimpsonUnverzerrt!, 0.7575757576, 1e-9);
  });
  it('gleiche Anteile mit beliebigem k: exp(H) = k, IQV = 1; N = S (alle verschieden): unverzerrt = 1, H = ln N', () => {
    for (const k of [2, 3, 5, 8]) { const r = vielfalt(Array(k).fill(7)); nah(r.effektiv, k); nah(r.iqv!, 1); nah(r.pielou!, 1); }
    const e = vielfalt([1, 1, 1, 1, 1]); nah(e.giniSimpsonUnverzerrt!, 1); nah(e.shannon, Math.log(5)); expect(e.shannon).toBeLessThanOrEqual(Math.log(5) + 1e-12);   // nie über ln k begrenzt, nie darüber (keine Miller-Madow-Korrektur)
  });
  it('Basisunabhängigkeit: J, IQV, Gini-Simpson und die effektiven Zahlen ändern sich nicht, wenn man alle Häufigkeiten verdoppelt', () => {
    const a = vielfalt([40, 30, 20, 10]), b = vielfalt([80, 60, 40, 20]); for (const k of ['shannon', 'effektiv', 'invSimpson', 'giniSimpson'] as const) nah(a[k], b[k]); nah(a.iqv!, b.iqv!); nah(a.pielou!, b.pielou!);
    expect(Math.abs(a.giniSimpsonUnverzerrt! - b.giniSimpsonUnverzerrt!)).toBeGreaterThan(1e-4);   // nur die unverzerrte Form hängt von N ab
  });
  it('Diversität ≠ Gleichmäßigkeit: viele seltene Kategorien erhöhen H, aber nicht J (97, 1, 1, 1: J = ,12)', () => { const r = vielfalt([97, 1, 1, 1]); nah(r.pielou!, 0.1210, 1e-3); nah(r.iqv!, 0.0784, 1e-3); nah(r.giniSimpson, 0.0588, 1e-3); expect(vielfalt([97, 1, 1, 1, 1, 1, 1]).shannon).toBeGreaterThan(r.shannon); });
});

describe('Kategorienzahl k (Entscheidung Opus: mögliche Kategorien, wenn Wertelabels sie festlegen, sonst besetzte)', () => {
  it('(12, 8) in vier möglichen Kategorien: J = ,4855, IQV ,64; mit k = S = 2: J = ,9710, IQV ,96', () => {
    const a = vielfalt([12, 8, 0, 0], { moeglich: 4 }), b = vielfalt([12, 8]); nah(a.pielou!, 0.4855, 1e-3); nah(a.iqv!, 0.64, 1e-9); nah(b.pielou!, 0.9710, 1e-3); nah(b.iqv!, 0.96, 1e-9); expect(a.moeglich).toBe(4); expect(a.besetzt).toBe(2); expect(b.moeglich).toBe(2);
    nah(a.shannon, b.shannon);   // H selbst hängt nicht von k ab
  });
  it('moeglicheKategorien: Wertelabels legen sie fest; ohne Labels die besetzten; „nur besetzte“ gibt die besetzten', () => {
    expect(moeglicheKategorien({ wertelabels: 4, besetzt: 3 })).toBe(4); expect(moeglicheKategorien({ wertelabels: null, besetzt: 3 })).toBe(3); expect(moeglicheKategorien({ wertelabels: 4, besetzt: 3, nurBesetzte: true })).toBe(3);
    expect(moeglicheKategorien({ wertelabels: 0, besetzt: 3 })).toBe(3); expect(moeglicheKategorien({ wertelabels: 2, besetzt: 3 })).toBe(3);   // mehr besetzte als Labels (Daten ohne Label): nie k < besetzt
  });
  it('der Satz nennt k immer', () => {
    expect(vielfaltKText(4, 'moeglich')).toBe('bei 4 möglichen Antworten'); expect(vielfaltKText(3, 'besetzt')).toBe('bei 3 besetzten Antworten');
  });
  it('leere Kategorie: 0 · ln 0 = 0, Σp² unverändert; J und IQV mit k = 4', () => {
    const f = V.leere_kategorie, a = vielfalt(f.haeufigkeiten, { moeglich: 4 }), b = vielfalt([30, 20, 10]); nah(a.shannon, b.shannon); nah(a.giniSimpson, b.giniSimpson); nah(a.pielou!, b.shannon / Math.log(4)); nah(a.iqv!, (4 / 3) * b.giniSimpson);
    expect(a.besetzt).toBe(3); expect(a.moeglich).toBe(4);
  });
});

describe('Ränder: nie NaN, Sätze', () => {
  it('eine besetzte Kategorie: H = 0, Gini-Simpson 0; bei k = 1 sind IQV und J nicht definiert (null), bei k = 4 sind sie 0', () => {
    const a = vielfalt([10]); nah(a.shannon, 0); nah(a.giniSimpson, 0); expect(a.iqv).toBeNull(); expect(a.pielou).toBeNull(); expect(a.hinweise).toContain('k-eins'); expect(hatNaN(a)).toBe(false);
    const b = vielfalt([10, 0, 0, 0], { moeglich: 4 }); nah(b.iqv!, 0); nah(b.pielou!, 0); nah(b.effektiv, 1);
    expect(vielfaltHinweisText('k-eins')).toContain('nicht definiert');
  });
  it('N = 1: unverzerrte Form nicht definiert (null); N < 50: Hinweis (H ist verzerrt klein)', () => {
    const a = vielfalt([1, 0, 0], { moeglich: 3 }); expect(a.giniSimpsonUnverzerrt).toBeNull(); expect(a.hinweise).toEqual(expect.arrayContaining(['n-zu-klein', 'kleines-n']));
    expect(vielfalt(Array(10).fill(5)).hinweise).not.toContain('kleines-n'); expect(vielfalt(Array(10).fill(4)).hinweise).toContain('kleines-n');
  });
  it('Umfragegewicht (Kommazahlen): H, J, IQV, Gini-Simpson roh, exp(H) aus den gewichteten Anteilen; die unverzerrte Form ist gesperrt (null); ebenso bei nicht ganzzahligem N ohne Schalter', () => {
    const f = V.umfragegewicht, r = vielfalt(f.haeufigkeiten, { umfrage: true }); expect(r.giniSimpsonUnverzerrt).toBeNull(); nah(r.shannon, f.shannon); nah(r.giniSimpson, f.gini_simpson);
    expect(vielfalt([1.5, 2.2]).giniSimpsonUnverzerrt).toBeNull(); expect(vielfalt([12, 7, 4, 2], { umfrage: true }).giniSimpsonUnverzerrt).toBeNull(); expect(vielfalt([12, 7, 4, 2]).giniSimpsonUnverzerrt).not.toBeNull();
  });
  it('Häufigkeitsgewicht: die Summen der Gewichte sind ganzzahlige Häufigkeiten, N = Σw, unverzerrte Form definiert', () => {
    const f = V.haeufigkeitsgewicht, r = vielfalt(f.haeufigkeiten); expect(r.n).toBe(25); expect(r.giniSimpsonUnverzerrt).not.toBeNull(); nah(r.giniSimpsonUnverzerrt!, f.gini_simpson_unverzerrt);
  });
  it('Sätze: ganze Sätze, nie NaN', () => { for (const c of ['kleines-n', 'k-eins', 'n-zu-klein'] as VielfaltHinweis[]) { const t = vielfaltHinweisText(c); expect(t).not.toMatch(/NaN|undefined/); expect(t.trim().endsWith('.')).toBe(true); } });
  it('die Eingabe bleibt unverändert', () => { const h = [3, 0, 5]; vielfalt(h); expect(h).toEqual([3, 0, 5]); });
});
