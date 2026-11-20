import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-b-erwartet.json';
import {
  KORRELATION_EXAKT_BIS, VOLLAUSZAEHLUNG_MAX, ZUFALL_B_MAX, ZUFALL_GEWICHT_MAX, aufteilungen, permutationGruppen, permutationKorrelation, welchKi, welchT, type PermErgebnis
} from './permutation';
import { Ziehung, hesterberg, intervall, jackknife, koeffizientStatistik } from './bootstrap';
import { bootstrapHinweise } from './bootstrapsaetze';
import { aufteilungen as aufteilungenLern, randomisierungExakt, strom, welchTest, ziehNormal } from './lernlabor';
import { GewichtFehler, erweitern } from './gewichte';
import { s } from './sitzung.svelte';

/* ===== Welle S-B, Teil 6: Zufallsverfahren L5 - Permutationstest (Gruppen, Korrelation), geschichteter Bootstrap, Regressions-Bootstrap (Fachblatt Abschnitt 6 und „Entscheidungen Opus“) =====
 * Sollwerte: scripts/spaeter-b-erwartet.R → testdaten/spaeter-b-erwartet.json (Abschnitt zufall): exakte Permutationsverteilungen durch Aufzählung (R; Fisher-Pitman coin::oneway_test als zweite Quelle),
 * feste Bootstrap-Ziehungsverteilungen aus boot (geschichtet bzw. Fall-Bootstrap) - intervall() muss auf 1e-9 treffen -, Monte-Carlo-Referenzen für die statistischen Tests (Muster: bootstrap.test.ts aus S-A). Der Bauer ändert Test und JSON nicht.
 *
 * Neues Modul `lib/permutation.ts` (reine Funktionen):
 *   VOLLAUSZAEHLUNG_MAX = 20000 · KORRELATION_EXAKT_BIS = 8 · ZUFALL_B_MAX = 99999 · ZUFALL_GEWICHT_MAX = 100000
 *   aufteilungen(n: number, k: number, grenze = VOLLAUSZAEHLUNG_MAX): number      C(n, k), darüber Infinity - GENAU wie lernlabor.ts
 *   welchT(x: number[], y: number[]): number      Welch-t (Differenz der Mittel / √(s1²/n1 + s2²/n2)); SE = 0: 0 bei gleichen Mitteln, sonst ±Infinity; n < 2 in einer Gruppe: NaN
 *   welchKi(x, y, niveau = 0,95): { differenz: number; lo: number; hi: number; df: number }      Welch-t-Intervall (Welch-Satterthwaite), wie R t.test(var.equal = FALSE)
 *   permutationGruppen(x: number[], y: number[], opt?: { statistik?: 'mittel' | 'mittel-roh' | 'median'; B?: number /* 9999 *\/; startwert?: number /* 20261008 *\/ }): PermErgebnis
 *   PermErgebnis = { statistik; modus: 'exakt' | 'zufall'; n1: number; n2: number; t0: number; differenz: number; b: number; gesamt: number; p: number; B: number | null; startwert: number | null; grund: null | 'zu-wenig'; hinweise: 'welch-ersatz'[] }
 *       'mittel' = das WELCH-t wird permutiert (Entscheidung Opus: studentisiert - der einfache Permutationstest hält das Niveau bei ungleicher Streuung und ungleichem n nicht), t0 = Welch-t, differenz = Differenz der Mittel;
 *       'mittel-roh' = die rohe Differenz der Mittel (nur für den Gleichheitstest mit dem Lernlabor und die Lehrfälle); 'median' = die rohe Differenz der Mediane, t0 = differenz = Median x − Median y.
 *       Zweiseitig: b = Zahl der Aufteilungen mit |T*| ≥ |T0| (relative Toleranz 1e-9: |T*| ≥ |T0|·(1 − 1e-9)); modus 'exakt', wenn C(n1+n2, n1) ≤ VOLLAUSZAEHLUNG_MAX: alle Aufteilungen, gesamt = C, p = b/gesamt (die beobachtete ist dabei);
 *       sonst 'zufall': B zufällige Aufteilungen (Fisher-Yates mit lib/zufall.ts bzw. lernlabor-Strom), gesamt = B, p = (b + 1)/(B + 1) (Phipson & Smyth: nie 0). B wird auf ZUFALL_B_MAX begrenzt.
 *       Welch-t bei n < 2 in einer Gruppe nicht definiert: Ersatz rohe Differenz und Hinweis 'welch-ersatz'; n1 oder n2 = 0: grund 'zu-wenig', p = null.
 *       Alle Werte gleich: t0 = 0, p = 1. Gleicher Startwert ⇒ gleiches Ergebnis.
 *   permutationKorrelation(x: number[], y: number[], opt?: { B?: number; startwert?: number }): { modus: 'exakt' | 'zufall'; n: number; r: number | null; b: number; gesamt: number; p: number | null; B: number | null; startwert: number | null; grund: null | 'keine-streuung' | 'zu-wenig' }
 *       Permutation der y-Werte gegen die x-Werte; exakt (alle n! Anordnungen) bis n ≤ KORRELATION_EXAKT_BIS (8), p = b/n! mit |r*| ≥ |r0| (Toleranz wie oben); darüber B Zufallsanordnungen, p = (b + 1)/(B + 1).
 *       Eine Spalte ohne Streuung: r nicht definiert → grund 'keine-streuung', r = p = null. n < 2: 'zu-wenig'.
 * Erweiterung `lib/bootstrap.ts` (S-A-Modul; die S-A-Tests bleiben unverändert grün):
 *   new Ziehung(n, statistik, { startwert?, B?, schichten?: ArrayLike<number> })    mit `schichten` (Schichtnummer je Zeile, beliebige Zahlen): je Schicht h werden n_h Zeilen mit Zurücklegen aus den Zeilen DER Schicht gezogen
 *       (Gruppengrößen bleiben in jeder Ziehung fest, nie eine Ziehung ohne Mitglied einer Gruppe); die Statistik bekommt weiter ein Int32Array der Länge n. Ohne `schichten` unverändert.
 *   jackknife(statistik, n, schichten?)       mit Schichten: L_i = (n_h − 1)(t0 − θ_(−i)) mit n_h = Größe der Schicht von i (wie boot::usual.jack, geprüft: empinf(type = "jack") mit strata); ohne: (n − 1) wie bisher
 *   koeffizientStatistik(x: number[][] /* Spalten der Prädiktoren, ohne Konstante *\/, y: number[], j: number): (indizes: Int32Array) => number
 *       Regressionskoeffizient des Prädiktors j (0-basiert) im Modell y ~ 1 + x₀ + x₁ + … für die gezogenen Zeilen (Kleinste Quadrate); singuläre Entwurfsmatrix (Rangmangel, z. B. ein Dummy ohne Einsen in der Ziehung) → NaN (zählt als ungültige Ziehung, intervall() zählt sie).
 *   bootstrapHinweise(e) (bootstrapsaetze.ts): neues Feld `tIntervall?: { lo: number; hi: number }` - bei n < 30 nennt der Hesterberg-Satz die Zahl des t-Intervalls („… das t-Intervall wäre hier [0,39; 8,61]“).
 * Fallgewicht (Entscheidung Opus): Häufigkeitsgewicht rechnet über die erweiterte Menge (erweitern(…, ZUFALL_GEWICHT_MAX)), bei Σw > 100 000 gesperrt (GewichtFehler 'zu-gross'); Umfragegewicht gesperrt (siehe gewichte-spaeter-b.test.ts).
 * Nicht gebaut (Opus): Freedman-Lane, Residuen-Bootstrap, Permutationstest für Regressionskoeffizienten.
 */

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const Z = (erwartet as any).zufall, PG = Z.permutation_gruppen, PK = Z.permutation_korrelation, BS = Z.bootstrap;
const nah = (ist: number, soll: number, tol = 1e-9, was = '') => expect(Math.abs(ist - soll), `${was} ${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const nahRel = (ist: number, soll: number, tol = 1e-9, was = '') => expect(Math.abs(ist - soll), `${was} ${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.abs(soll) + 1e-300);
const nahListe = (ist: number[], soll: number[], tol = 1e-9) => { expect(ist.length).toBe(soll.length); soll.forEach((x, i) => nah(ist[i]!, x, tol)); };
const ID = (n: number) => Int32Array.from({ length: n }, (_, i) => i);
const hatNaN = (o: unknown): boolean => typeof o === 'number' ? Number.isNaN(o) : o && typeof o === 'object' ? Object.values(o as object).some(hatNaN) : false;
const STAT = { mittel: 'mittel', roh: 'mittel-roh', median: 'median' } as const;

describe('Konstanten und Hilfen', () => {
  it('Grenzen wie festgelegt; aufteilungen = lernlabor.aufteilungen', () => {
    expect([VOLLAUSZAEHLUNG_MAX, KORRELATION_EXAKT_BIS, ZUFALL_B_MAX, ZUFALL_GEWICHT_MAX]).toEqual([20000, 8, 99999, 100000]);
    for (const [n, k] of [[13, 6], [24, 12], [15, 7], [50, 10], [5, 0], [4, 4]]) expect(aufteilungen(n!, k!)).toBe(aufteilungenLern(n!, k!));
    expect(aufteilungen(13, 6)).toBe(1716); expect(aufteilungen(24, 12)).toBe(Infinity); expect(aufteilungen(24, 12, 3_000_000)).toBe(2704156);
  });
  it('Welch-t und Welch-Intervall = R (6 gegen 7 Werte); SE 0', () => {
    const x = PG.sechs_sieben.x as number[], y = PG.sechs_sieben.y as number[], w = PG.sechs_sieben.welch_ki; nah(welchT(x, y), PG.sechs_sieben.mittel.t0, 1e-12);
    const k = welchKi(x, y); nah(k.differenz, w.diff, 1e-12); nah(k.lo, w.lo, 1e-9); nah(k.hi, w.hi, 1e-9); nah(k.df, w.df, 1e-9);
    expect(Math.abs(welchT([5, 5, 5], [5, 5]))).toBe(0); expect(welchT([5, 5, 5], [3, 3])).toBe(Infinity); expect(welchT([3, 3], [5, 5, 5])).toBe(-Infinity); expect(Number.isNaN(welchT([1], [1, 2, 3]))).toBe(true);
  });
});

describe('Permutationstest für Gruppen: exakte Verteilung durch Aufzählung (R) - 1e-12', () => {
  for (const name of ['sechs_sieben', 'drei_fuenfzehn', 'likert_median', 'streuung_null', 'alle_gleich'])
    for (const [stat, schluessel] of [['mittel', 'mittel'], ['mittel-roh', 'mittel_roh'], ['median', 'median']] as const) it(`${name} - ${stat}`, () => {
      const f = PG[name], soll = f[schluessel], r = permutationGruppen(f.x, f.y, { statistik: stat }) as PermErgebnis;
      expect(r.modus).toBe('exakt'); expect([r.n1, r.n2]).toEqual([soll.n1, soll.n2]); expect(r.gesamt).toBe(soll.gesamt); expect(r.b).toBe(soll.b); nah(r.p, soll.p, 1e-12); nah(r.t0, soll.t0, 1e-9);
      nah(r.differenz, stat === 'median' ? soll.differenz_median : soll.differenz, 1e-9); expect(r.B).toBeNull(); expect(r.grund).toBeNull(); expect(r.statistik).toBe(stat); expect(hatNaN(r)).toBe(false);
    });
  it('6 gegen 7 (12,15,9,20,17,14 / 8,11,13,7,10,12,9): 1 716 Aufteilungen; rohe Differenz p = ,02273 (Fisher-Pitman, coin: dieselbe Zahl), Differenz 4,5; Median-Permutation 22 verschiedene Werte, p = ,0513', () => {
    const f = PG.sechs_sieben, roh = permutationGruppen(f.x, f.y, { statistik: 'mittel-roh' }), med = permutationGruppen(f.x, f.y, { statistik: 'median' });
    expect(roh.gesamt).toBe(1716); nah(roh.p, 0.02273, 1e-2); nah(roh.differenz, 4.5, 1e-12); nah(med.p, 0.0513, 1e-2); expect(f.median.verschiedene_werte).toBe(22);
  });
  it('Alle Werte gleich: T = 0, p = 1; Streuung 0 in einer Gruppe: Welch-t endlich', () => {
    const a = permutationGruppen(PG.alle_gleich.x, PG.alle_gleich.y); expect(Math.abs(a.t0)).toBe(0); nah(a.p, 1, 1e-12);
    const b = permutationGruppen(PG.streuung_null.x, PG.streuung_null.y); expect(Number.isFinite(b.t0)).toBe(true); expect(b.p).toBeGreaterThan(0); expect(b.p).toBeLessThanOrEqual(1);
  });
  it('Welch-t permutiert ≠ rohe Differenz permutiert (ungleiche Streuung und n): das sind verschiedene p', () => {
    const f = PG.drei_fuenfzehn; expect(Math.abs(f.mittel.p - f.mittel_roh.p)).toBeGreaterThan(1e-3);
  });
  it('Welch-t bei n < 2 in einer Gruppe nicht definiert: Ersatz rohe Differenz mit Hinweis; leere Gruppe: grund zu-wenig', () => {
    const a = permutationGruppen([5], [1, 2, 3, 4]), b = permutationGruppen([5], [1, 2, 3, 4], { statistik: 'mittel-roh' }); expect(a.hinweise).toContain('welch-ersatz'); nah(a.p, b.p, 1e-12); expect(Number.isNaN(a.p)).toBe(false);
    const c = permutationGruppen([], [1, 2, 3]); expect(c.grund).toBe('zu-wenig'); expect(c.p).toBeNull();
  });
  it('Gleichheit mit dem Lernlabor: lernlabor.randomisierungExakt (rohe Differenz, p = Anzahl/Gesamt) = permutationGruppen(…, mittel-roh) - sonst laufen die beiden unbemerkt auseinander', () => {
    for (const n of ['sechs_sieben', 'drei_fuenfzehn', 'likert_median', 'alle_gleich']) { const f = PG[n], l = randomisierungExakt(f.x, f.y)!, r = permutationGruppen(f.x, f.y, { statistik: 'mittel-roh' }); expect(l).not.toBeNull(); expect(r.b, n).toBe(l.anzahl); expect(r.gesamt, n).toBe(l.gesamt); nah(r.p, l.p, 1e-12, n); }
  });
});

describe('Permutationstest im Zufallsmodus (mehr als 20 000 Aufteilungen): p = (b + 1)/(B + 1), nie 0', () => {
  const f = PG.zwoelf_zwoelf;
  it('12 gegen 12 (2 704 156 Aufteilungen): modus zufall, B = 9999, p = (b + 1)/(B + 1)', () => {
    const r = permutationGruppen(f.x, f.y); expect(r.modus).toBe('zufall'); expect(r.B).toBe(9999); expect(r.startwert).toBe(20261008); expect(r.gesamt).toBe(9999); expect(f.gesamt).toBe(2704156);
    expect(Math.abs(r.p * 10000 - Math.round(r.p * 10000))).toBeLessThan(1e-6); expect(r.p).toBeGreaterThanOrEqual(1 / 10000); expect(r.b).toBe(Math.round(r.p * 10000) - 1);
    nah(r.t0, f.t0, 1e-9);
  });
  it('gleicher Startwert ⇒ gleiche Zahl, anderer ⇒ (meist) andere; B über 99 999 wird begrenzt', () => {
    const a = permutationGruppen(f.x, f.y, { B: 999, startwert: 5 }), b = permutationGruppen(f.x, f.y, { B: 999, startwert: 5 }), c = permutationGruppen(f.x, f.y, { B: 999, startwert: 6 });
    expect(a).toEqual(b); expect(a.b === c.b && a.p === c.p).toBe(a.b === c.b); expect(permutationGruppen(f.x, f.y, { B: 250000, startwert: 1 }).B).toBe(99999);
  });
  it('statistisch: sieben Startwerte, p liegt im Mittel beim exakten Wert aus der vollständigen Aufzählung (4 Sigma des Mittels + ein Zählschritt)', () => {
    const B = 9999, p0 = f.p_exakt_referenz, ps = Array.from({ length: 7 }, (_, i) => permutationGruppen(f.x, f.y, { B, startwert: 100 + i }).p), m = ps.reduce((a, b) => a + b, 0) / 7;
    const sd = Math.sqrt(p0 * (1 - p0) / B / 7); expect(Math.abs(m - p0), `Mittel ${m} gegen ${p0}`).toBeLessThanOrEqual(4 * sd + 1 / (B + 1));
  });
  it('Fehler 1. Art: Welch-t permutiert hält das Niveau bei ungleicher Streuung und ungleichem n (n = 10, SD 4 gegen n = 40, SD 1; 499 Zufallsaufteilungen, 4000 Datensätze): 5 % ± 2 Prozentpunkte und höchstens 1,8 Punkte über dem Welch-t-Test auf denselben Daten; die rohe Differenz nicht (> 15 %)', () => {
    const rng = strom(77, 1), D = 4000, B = 499; let welch = 0, wtest = 0, roh = 0, rohN = 0;
    for (let d = 0; d < D; d++) {
      const x = Array.from({ length: 10 }, () => ziehNormal(rng, 0, 4)), y = Array.from({ length: 40 }, () => ziehNormal(rng, 0, 1));
      if (welchTest(x, y).p <= 0.05) wtest++;
      if (permutationGruppen(x, y, { statistik: 'mittel', B, startwert: 1000 + d }).p! <= 0.05) welch++;
      if (d < 400) { rohN++; if (permutationGruppen(x, y, { statistik: 'mittel-roh', B, startwert: 5000 + d }).p! <= 0.05) roh++; }
    }
    const anteil = welch / D, wt = wtest / D;
    expect(Math.abs(anteil - 0.05), `Welch-t permutiert: ${anteil}`).toBeLessThanOrEqual(0.02); expect(anteil - wt, `Welch-t permutiert ${anteil} gegen Welch-t-Test ${wt}`).toBeLessThanOrEqual(0.018); expect(anteil - wt).toBeGreaterThanOrEqual(-0.006);
    expect(roh / rohN, `rohe Differenz: ${roh / rohN}`).toBeGreaterThan(0.15);
    expect(Z.permutation_gruppen.fehler_1_art.rohe_differenz_permutiert).toBeGreaterThan(0.2);   // R-Referenz 29,7 % (Fachblatt 29,7 %); R: Welch-t permutiert 4,7 %, Welch-t-Test 4,1 %
  }, 240000);
});

describe('Permutationstest für die Korrelation (Permutation der y-Werte)', () => {
  for (const name of ['n7', 'n8']) it(`${name}: exakt, alle n! Anordnungen`, () => {
    const f = PK[name], r = permutationKorrelation(f.x, f.y); expect(r.modus).toBe('exakt'); expect(r.gesamt).toBe(f.gesamt); expect(r.b).toBe(f.b); nah(r.p!, f.p, 1e-12); nah(r.r!, f.r, 1e-12); expect(r.n).toBe(f.n); expect(r.B).toBeNull(); expect(r.grund).toBeNull();
  });
  it('n = 7: 5 040, n = 8: 40 320 Anordnungen; die Verteilung von r hat Mittel 0 und Varianz 1/(n − 1) (die Sollwerte erfüllen es)', () => {
    expect([PK.n7.gesamt, PK.n8.gesamt]).toEqual([5040, 40320]); nah(PK.n7.mittel, 0, 1e-12); nah(PK.n7.varianz, 1 / 6, 1e-12); nah(PK.n8.varianz, 1 / 7, 1e-12);
  });
  it('n = 9 (362 880 Anordnungen): Zufallsmodus mit B Ziehungen und p = (b + 1)/(B + 1)', () => {
    const f = PK.n9, r = permutationKorrelation(f.x, f.y); expect(r.modus).toBe('zufall'); expect(r.gesamt).toBe(9999); expect(r.B).toBe(9999); expect(r.p!).toBeGreaterThanOrEqual(1 / 10000); expect(r.b).toBe(Math.round(r.p! * 10000) - 1);
    nah(r.r!, f.r, 1e-12); expect(permutationKorrelation(f.x, f.y, { B: 99, startwert: 3 })).toEqual(permutationKorrelation(f.x, f.y, { B: 99, startwert: 3 }));
  });
  it('Law School (n = 15, r = ,7764; Efron & Tibshirani 1993): Monte-Carlo-p liegt bei der Referenz (2 Millionen Anordnungen in R: ,0007 …) - der t-Test gibt ,00067', () => {
    const f = PK.law_school, B = 9999, ps = Array.from({ length: 5 }, (_, i) => permutationKorrelation(f.x, f.y, { B, startwert: 50 + i }).p!), m = ps.reduce((a, b) => a + b, 0) / 5;
    nah(f.r, 0.7763745, 1e-7); for (const p of ps) expect(p).toBeGreaterThanOrEqual(1 / (B + 1));
    expect(Math.abs(m - f.p_referenz_zufall), `Mittel ${m} gegen ${f.p_referenz_zufall}`).toBeLessThanOrEqual(4 * Math.sqrt(f.p_referenz_zufall / B / 5) + 2 / (B + 1)); expect(f.p_t_test).toBeLessThan(0.001);
  });
  it('Ränder: eine Spalte ohne Streuung → keine-streuung (r und p null), n < 2 → zu-wenig; nie NaN', () => {
    const k = PK.konstant, r = permutationKorrelation(k.x, k.y); expect(r.grund).toBe('keine-streuung'); expect(r.r).toBeNull(); expect(r.p).toBeNull(); expect(hatNaN(r)).toBe(false);
    expect(permutationKorrelation([1], [2]).grund).toBe('zu-wenig'); const n2 = permutationKorrelation([1, 2], [3, 5]); expect(n2.gesamt).toBe(2); nah(n2.p!, 1, 1e-12);
  });
});

describe('Häufigkeitsgewicht (Entscheidung Opus): über die erweiterte Menge; Σw > 100 000 gesperrt', () => {
  it('Werte mit Gewichten erweitern = die rep()-erweiterte Datei in R; der Permutationstest darauf = die Aufzählung', () => {
    const g = PG.gewicht, x = erweitern(g.werte1 as number[], g.gewicht1 as number[], ZUFALL_GEWICHT_MAX), y = erweitern(g.werte2 as number[], g.gewicht2 as number[], ZUFALL_GEWICHT_MAX);
    expect(x).toEqual(g.erweitert1); expect(y).toEqual(g.erweitert2);
    for (const [stat, k] of [['mittel', 'mittel'], ['mittel-roh', 'mittel_roh']] as const) { const r = permutationGruppen(x, y, { statistik: stat }); expect(r.b).toBe(g[k].b); expect(r.gesamt).toBe(g[k].gesamt); nah(r.p, g[k].p, 1e-12); }
  });
  it('Summe der Gewichte über 100 000: GewichtFehler zu-gross; genau 100 000 geht', () => {
    expect(() => erweitern([1], [ZUFALL_GEWICHT_MAX + 1], ZUFALL_GEWICHT_MAX)).toThrow(GewichtFehler);
    try { erweitern([1], [ZUFALL_GEWICHT_MAX + 1], ZUFALL_GEWICHT_MAX); } catch (e) { expect((e as GewichtFehler).code).toBe('zu-gross'); }
    expect(erweitern([1], [ZUFALL_GEWICHT_MAX], ZUFALL_GEWICHT_MAX)).toHaveLength(ZUFALL_GEWICHT_MAX);
  });
});

const gruppenStat = (f: any, med = false) => (idx: Int32Array) => {
  const a: number[] = [], b: number[] = []; for (const i of idx) (f.daten.g[i] === 1 ? a : b).push(f.daten.y[i]);
  const m = (v: number[]) => v.reduce((x, y) => x + y, 0) / v.length, md = (v: number[]) => { const s = [...v].sort((x, y) => x - y), h = s.length >> 1; return s.length % 2 ? s[h]! : (s[h - 1]! + s[h]!) / 2; };
  return med ? md(a) - md(b) : m(a) - m(b);
};
const regStat = (f: any, j = 0) => koeffizientStatistik([f.daten.x1, f.daten.x2], f.daten.y, j);

describe('Geschichteter Bootstrap (Gruppen): Ziehung, Jackknife je Schicht, Intervalle an der festen Verteilung aus R (1e-9)', () => {
  it('Ziehung mit Schichten: in jeder Ziehung genau n_h Zeilen aus der Schicht h (nie eine Gruppe ohne Mitglied); alle Indizes gültig', () => {
    const f = BS.faelle[0], g = f.schichten as number[]; let schlecht = 0, wiederholt = 0;
    const z = new Ziehung(13, idx => { const c = [0, 0]; for (const i of idx) { if (i < 0 || i > 12 || !Number.isInteger(i)) schlecht++; else c[g[i] === 1 ? 0 : 1]!++; } if (c[0] !== 6 || c[1] !== 7) schlecht++; if (new Set(idx).size < 13) wiederholt++; return 0; }, { schichten: g, B: 1500 });
    z.weiter(1500); expect(schlecht).toBe(0); expect(wiederholt).toBeGreaterThan(1400);
  });
  it('gleicher Startwert ⇒ gleiche Verteilung (auch bei anderer Blockgröße); jede Zeile wird etwa gleich oft gezogen; t0 = Statistik der ganzen Stichprobe', () => {
    const f = BS.faelle[0], st = gruppenStat(f), a = new Ziehung(13, st, { B: 400, schichten: f.schichten }), b = new Ziehung(13, st, { B: 400, schichten: f.schichten });
    a.weiter(400); for (let i = 0; i < 4; i++) b.weiter(100); expect(a.t).toEqual(b.t); nah(a.t0, 4.5, 1e-12);
    const zaehl = new Array(13).fill(0); const z = new Ziehung(13, idx => { for (const i of idx) zaehl[i]++; return 0; }, { B: 2000, schichten: f.schichten }); z.weiter(2000);
    for (let i = 0; i < 13; i++) { const soll = 2000; expect(Math.abs(zaehl[i] - soll), `Zeile ${i}`).toBeLessThan(300); }
  });
  for (const k of [0, 1]) it(`${BS.faelle[k].name}: Jackknife je Schicht L = (n_h − 1)(t0 − Auslassung) wie boot::empinf(type = "jack", strata)`, () => {
    const f = BS.faelle[k], j = jackknife(gruppenStat(f, k === 1), f.n, f.schichten); nahListe(j.theta, f.loo, 1e-12); nahListe(j.L, f.L, 1e-12);
    const ohne = jackknife(gruppenStat(f, k === 1), f.n); expect(Math.abs(ohne.L[0]! - j.L[0]!)).toBeGreaterThan(1e-3);   // ohne Schichten wäre (n − 1) statt (n_h − 1) - ein anderer Wert
  });
  for (const k of [0, 1, 2]) for (const st of BS.faelle[k].stufen) it(`${BS.faelle[k].name}: ${Math.round(st.niveau * 100)} % Perzentil und BCa (Jackknife aus den Daten) = boot`, () => {
    const f = BS.faelle[k], L = k < 2 ? jackknife(gruppenStat(f, k === 1), f.n, f.schichten).L : jackknife(regStat(f), f.n).L;
    const p = intervall(f.t, f.t0, 'perzentil', st.niveau); nah(p.lo!, st.perz_lo); nah(p.hi!, st.perz_hi); const b = intervall(f.t, f.t0, 'bca', st.niveau, L); nah(b.lo!, st.bca_lo); nah(b.hi!, st.bca_hi);
    nah(b.z0!, f.z0, 1e-9); nah(b.a!, f.a, 1e-9); expect(b.warnungen.includes('viele-gleiche')).toBe(f.warnungen.includes('viele-gleiche')); expect(hatNaN([p.lo, p.hi, b.lo, b.hi])).toBe(false);
  });
  it('Gruppen 6 gegen 7: Perzentil-Intervall ist bei diesen n zu schmal; der Hesterberg-Satz nennt die Zahl des t-Intervalls [0,39; 8,61]; n < 30', () => {
    const f = BS.faelle[0], w = f.welch_ki; expect(hesterberg(f.n)).toBe(true); const pz = intervall(f.t, f.t0, 'perzentil', 0.95); expect(pz.hi! - pz.lo!).toBeLessThan(w.hi - w.lo);
    const h = bootstrapHinweise({ art: 'perzentil', ziehungen: 9999, startwert: 20261008, n: 13, tIntervall: { lo: w.lo, hi: w.hi } }).join(' '); expect(h).toContain('t-Intervall'); expect(h).toContain('0,39'); expect(h).toContain('8,61');
    expect(bootstrapHinweise({ art: 'perzentil', ziehungen: 9999, startwert: 20261008, n: 60, tIntervall: { lo: 1, hi: 2 } }).join(' ')).not.toContain('t-Intervall');
  });
  it('Median-Differenz (diskret): viele Ziehungen gleich dem Schätzer → Warnung viele-gleiche; Perzentil bleibt die Voreinstellung', () => {
    const f = BS.faelle[1]; expect(f.anteil_gleich).toBeGreaterThan(0.05); expect(f.warnungen).toEqual(['viele-gleiche']); expect(intervall(f.t, f.t0, 'perzentil', 0.95).warnungen).toContain('viele-gleiche');
  });
  it('statistisch: JS-Ziehungen (geschichtet, B = 9999, 20 Startwerte) - Mittel der Grenzen innerhalb von 4 Sigma der Monte-Carlo-Referenz (B = 400 000 in R)', () => {
    const mc = BS.monte_carlo, f = BS.faelle[0], st = gruppenStat(f), L = jackknife(st, f.n, f.schichten).L;
    const lauf = (startwert: number) => { const z = new Ziehung(f.n, st, { startwert, B: 9999, schichten: f.schichten }); z.weiter(9999); const b = intervall(z.t, z.t0, 'bca', 0.95, L), p = intervall(z.t, z.t0, 'perzentil', 0.95); return [b.lo!, b.hi!, p.lo!, p.hi!]; };
    const r = Array.from({ length: 20 }, (_, i) => lauf(i + 1)), mittel = [0, 1, 2, 3].map(k => r.reduce((a, x) => a + x[k]!, 0) / 20);
    const ref = [mc.referenz.bca_lo, mc.referenz.bca_hi, mc.referenz.perz_lo, mc.referenz.perz_hi], sd = [mc.sd_r.bca_lo, mc.sd_r.bca_hi, mc.sd_r.perz_lo, mc.sd_r.perz_hi];
    ['BCa unten', 'BCa oben', 'Perzentil unten', 'Perzentil oben'].forEach((n, k) => expect(Math.abs(mittel[k]! - ref[k]!), `${n}: Mittel ${mittel[k]} gegen Referenz ${ref[k]}`).toBeLessThanOrEqual(mc.toleranz_faktor * sd[k]!));
  });
});

describe('Fall-Bootstrap der Regressionskoeffizienten (einzige Art; kein Residuen-Bootstrap)', () => {
  const f = BS.faelle[2];
  it('koeffizientStatistik = lm: Koeffizient von x1 der ganzen Stichprobe (n = 40) und alle 40 Auslassungen (1e-9)', () => {
    nah(regStat(f)(ID(40)), f.t0, 1e-9); nah(f.klassisch.b, f.t0, 1e-9); const j = jackknife(regStat(f), f.n); nahListe(j.theta, f.loo, 1e-9); nahListe(j.L, f.L, 1e-8);
  });
  it('Zeilen doppelt gezogen ändern den Koeffizienten wie die erweiterte Datei (Indizes sind Zeilennummern mit Wiederholung)', () => {
    const idx = Int32Array.from([...Array.from({ length: 40 }, (_, i) => i), 3, 3, 17]); const x1 = [...f.daten.x1, f.daten.x1[3], f.daten.x1[3], f.daten.x1[17]], x2 = [...f.daten.x2, f.daten.x2[3], f.daten.x2[3], f.daten.x2[17]], y = [...f.daten.y, f.daten.y[3], f.daten.y[3], f.daten.y[17]];
    nah(koeffizientStatistik([f.daten.x1, f.daten.x2], f.daten.y, 0)(idx), koeffizientStatistik([x1, x2], y, 0)(ID(43)), 1e-9);
  });
  it('Fall-Bootstrap: die Intervalle aus Perzentil und BCa treffen R; der Fall-Bootstrap-SE (,1485 im Fachblatt-Beispiel) ist größer als der klassische bei wachsender Streuung', () => {
    expect(f.se_boot).toBeGreaterThan(f.klassisch.se * 0.9); expect(f.klassisch.ki).toHaveLength(2);
  });
  it('singuläre Ziehung (Dummy mit nur 2 Einsen unter 30 Zeilen): NaN, zählt als ungültige Ziehung; Anteil ≈ (28/30)^30 = ,126', () => {
    const g = BS.singulaer, st = koeffizientStatistik([g.x, g.dummy], g.y, 0);
    expect(Number.isNaN(st(Int32Array.from({ length: 30 }, (_, i) => i + 2 > 29 ? 5 : i + 2)))).toBe(true);   // keine der beiden Einsen (Zeilen 0, 1) gezogen
    expect(Number.isNaN(st(ID(30)))).toBe(false);
    const z = new Ziehung(30, st, { B: 4000, startwert: 9 }); z.weiter(4000); const ung = z.t.filter(v => !Number.isFinite(v)).length / 4000;
    expect(Math.abs(ung - g.anteil_singulaer_erwartet), `Anteil ${ung}`).toBeLessThan(0.025);
    const ci = intervall(z.t, z.t0, 'perzentil', 0.95); expect(ci.ungueltig).toBe(z.t.filter(v => !Number.isFinite(v)).length); expect(ci.lo).not.toBeNull(); expect(hatNaN([ci.lo, ci.hi])).toBe(false);
  });
  it('Regression mit 2 Prädiktoren: der Koeffizient von x2 ist ebenfalls lm (Auslassung 0 gegen R-Modell mit den zwei Spalten vertauscht ist derselbe Wert)', () => {
    const a = koeffizientStatistik([f.daten.x1, f.daten.x2], f.daten.y, 1)(ID(40)), b = koeffizientStatistik([f.daten.x2, f.daten.x1], f.daten.y, 0)(ID(40)); nah(a, b, 1e-9);
  });
});
