import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-b-erwartet.json';
import { MH_MAX_SCHICHTEN, mantelHaenszel, mhHinweisText, verallgemeinerterCmh, type MhHinweis } from './mantelhaenszel';
import { s } from './sitzung.svelte';

/* ===== Welle S-B, Teil 2: Mantel-Haenszel mit Schichtvariable (Fachblatt Abschnitt 2 und „Entscheidungen Opus“, „Belege IBM“) =====
 * Sollwerte: scripts/spaeter-b-erwartet.R → testdaten/spaeter-b-erwartet.json (Abschnitt mantelhaenszel): IBM-Formeln (Cochran, Mantel-Haenszel, Breslow-Day, Tarone, Robins-Breslow-Greenland) in R, geprüft gegen
 * mantelhaen.test, metafor::rma.mh und DescTools::BreslowDayTest (7 bis 9 Stellen). Der Bauer ändert Test und JSON nicht.
 * Das Modul `lib/mantelhaenszel.ts` (reine Funktionen, keine Oberfläche; PSPP kann nichts davon) hat diese API - sie ist hier festgelegt:
 *
 *   type Schicht = number[][]            2×2: [[a, b], [c, d]]; Zeile 1 = Gruppe 1, Spalte 1 = Ereignis; OR = a·d/(b·c). Häufigkeitsgewichte = ganzzahlige Zellen (Σw), die Rollenwahl steckt in der Zeilen-/Spaltenreihenfolge.
 *   mantelHaenszel(schichten: Schicht[], opt?: { korrektur?: boolean /* Voreinstellung true *\/ }): MhErgebnis
 *   MhErgebnis = {
 *     fehler: null | 'keine-schicht' | 'zu-viele-schichten';      mehr als MH_MAX_SCHICHTEN = 20 Schichten: Fehler, sonst nichts berechnet
 *     k: number; n: number;                                         Zahl der Schichten (Eingabe), Σ aller Zellen
 *     schichten: { n: number; or: number | null; lo: number | null; hi: number | null }[];    je Schicht (Eingaberreihenfolge): OR mit Woolf-KI; null, sobald EINE Zelle 0 ist (keine Haldane-Korrektur)
 *     unbereinigt: { or; lo; hi } | null;                           Summe über die Schichten, OR mit Woolf-KI; null bei einer 0-Zelle
 *     delta: number; varianz: number;                               Δ = Σ(a − E), ΣV mit n²(n − 1); Schichten mit n = 1 und mit leerem Rand tragen 0 bei
 *     cmh: { chi2: number | null; p: number | null; df: 1; korrigiert: boolean };   χ² = (|Δ| − c)²/ΣV mit c = 0,5 bei opt.korrektur und |Δ| ≥ 0,5 (R-Regel, Fachblatt/Opus), sonst c = 0; korrigiert = c war 0,5;
 *                                                                   ΣV = 0 → chi2 = p = null (kein Test möglich)
 *     orMH: { or; lo; hi; seLn } | null;                            OR_MH = Σ(a·d/n)/Σ(b·c/n), KI nach Robins, Breslow & Greenland (qnorm(,975)); null, wenn Σ(b·c/n) = 0 oder Σ(a·d/n) = 0 (kein gemeinsames OR schätzbar)
 *     breslowDay: { chi2; df: number; p: number | null; schichten: number } | null;      mit dem MH-OR; Schichten mit r1 = 0, c1 = 0 oder einer Schätzzelle ≤ 0 gehen nicht ein (IBM); df = schichten − 1; null, wenn keine Schicht eingeht
 *     tarone: { chi2; df; p; schichten } | null;                    BD − (Σ(a − ã))²/ΣVar(ã) (Tarone 1985), derselbe df
 *     schichtenMitEinemFall: number[];                              0-basierte Nummern der Schichten mit n = 1
 *     hinweise: MhHinweis[] }
 *   MhHinweis = 'schicht-ein-fall' (eine Schicht mit n = 1) | 'duenne-schichten' (mindestens 20 % der Schichten mit n < 10) | 'bd-warnung' (Tarone-p < ,05: Warnung wegen unterschiedlicher ORs) |
 *               'eine-schicht' (k = 1: kein Schichtvergleich) | 'keine-varianz' (ΣV = 0) | 'kein-or' (orMH null)
 *   verallgemeinerterCmh(schichten: number[][][]): { chi2: number; df: number; p: number } | null    Landis-Heyman-Koch für I×J×K, df = (I−1)(J−1); Schichten mit n < 2 gehen nicht ein; null, wenn ΣV nicht umkehrbar
 *   mhHinweisText(code: MhHinweis, namen?: string[]): string      ganze Sätze (de)
 * Entscheidungen: Cochran wird nicht gezeigt (nicht im Ergebnis), Woolf-Homogenität nicht, kein exakter bedingter Test (Opus 2).
 * ABWEICHUNG IBM ↔ R-Regel (dem Prüfer-Bericht): IBM rechnet M = (|Δ| − 0,5)·sgn(Δ)/√ΣV, also IMMER mit 0,5; R (und dieser Test, Entwurf des Fachblatts) nimmt die 0,5 nur bei |Δ| ≥ 0,5. Verschieden nur bei 0 < |Δ| < 0,5
 * (Fall delta_klein: IBM 0,0157, R-Regel 0,0142): Opus entscheidet - bis dahin gilt die R-Regel im Test.
 */

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const E = (erwartet as any).mantelhaenszel, F = E.faelle;
const nah = (ist: number, soll: number, tol = 1e-9, was = '') => expect(Math.abs(ist - soll), `${was} ${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const nahRel = (ist: number, soll: number, tol = 1e-8, was = '') => expect(Math.abs(ist - soll), `${was} ${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.abs(soll) + 1e-300);
const gleichOderNull = (ist: number | null, soll: number | null, fn: (a: number, b: number) => void) => { if (soll === null || soll === undefined) expect(ist).toBeNull(); else { expect(ist).not.toBeNull(); fn(ist!, soll); } };
const geeignet = Object.keys(F).filter(n => F[n].k <= MH_MAX_SCHICHTEN);

describe('Pflichtfälle (2.9) gegen die Sollwerte aus R', () => {
  it('die Fälle sind da: Berkeley, K = 3, K = 1, Nullzelle, n = 1, Σ b·c = 0, Δ = 0, 0 < |Δ| < 0,5, 3×3×2, 20+ Stufen, vertauscht', () => {
    for (const n of ['berkeley', 'klein_k3', 'eine_schicht', 'nullzelle', 'schicht_ein_fall', 'summe_bc_null', 'delta_null', 'delta_klein', 'zwanzig_plus', 'vertauscht']) expect(F[n], n).toBeTruthy();
    expect(E.allgemein.chi2).toBeGreaterThan(0);
  });
  for (const name of geeignet) it(`${name}: Schicht-ORs, unbereinigt, Δ, CMH (mit und ohne Korrektur), OR_MH mit KI, Breslow-Day, Tarone, Hinweise`, () => {
    const f = F[name], r = mantelHaenszel(f.schichten);
    expect(r.fehler).toBeNull(); expect(r.k).toBe(f.k); expect(r.n).toBe(f.n); expect(r.schichten).toHaveLength(f.k);
    r.schichten.forEach((x, i) => { const so = f.schicht_or[i]; expect(x.n).toBe(f.schichten_n[i]); gleichOderNull(x.or, so.or ?? null, (a, b) => nahRel(a, b)); gleichOderNull(x.lo, so.lo ?? null, (a, b) => nahRel(a, b)); gleichOderNull(x.hi, so.hi ?? null, (a, b) => nahRel(a, b)); });
    if (f.unbereinigt) { expect(r.unbereinigt).not.toBeNull(); nahRel(r.unbereinigt!.or, f.unbereinigt.or); nahRel(r.unbereinigt!.lo, f.unbereinigt.lo); nahRel(r.unbereinigt!.hi, f.unbereinigt.hi); } else expect(r.unbereinigt).toBeNull();
    nah(r.delta, f.delta, 1e-9); nah(r.varianz, f.varianz, 1e-9);
    // CMH: Voreinstellung = mit Stetigkeitskorrektur (R-Regel); umschaltbar auf „ohne“
    gleichOderNull(r.cmh.chi2, f.cmh.korrigiert.chi2 ?? null, (a, b) => nah(a, b, 1e-9, 'CMH mit Korrektur')); gleichOderNull(r.cmh.p, f.cmh.korrigiert.p ?? null, (a, b) => nahRel(a, b, 1e-7));
    expect(r.cmh.df).toBe(1); expect(r.cmh.korrigiert).toBe(f.cmh.korrektur_angewendet);
    const o = mantelHaenszel(f.schichten, { korrektur: false }); gleichOderNull(o.cmh.chi2, f.cmh.unkorrigiert.chi2 ?? null, (a, b) => nah(a, b, 1e-9, 'CMH ohne Korrektur')); expect(o.cmh.korrigiert).toBe(false);
    if (f.or_mh) { expect(r.orMH).not.toBeNull(); nahRel(r.orMH!.or, f.or_mh.or); nahRel(r.orMH!.lo, f.or_mh.lo); nahRel(r.orMH!.hi, f.or_mh.hi); nahRel(r.orMH!.seLn, f.or_mh.se_ln); } else expect(r.orMH, 'kein gemeinsames OR schätzbar').toBeNull();
    if (f.breslow_day) { expect(r.breslowDay).not.toBeNull(); nah(r.breslowDay!.chi2, f.breslow_day.chi2, 1e-8); expect(r.breslowDay!.df).toBe(f.breslow_day.df); expect(r.breslowDay!.schichten).toBe(f.bd_schichten);
      gleichOderNull(r.breslowDay!.p, f.breslow_day.p ?? null, (a, b) => nahRel(a, b, 1e-6)); nah(r.tarone!.chi2, f.tarone.chi2, 1e-8); expect(r.tarone!.df).toBe(f.tarone.df); gleichOderNull(r.tarone!.p, f.tarone.p ?? null, (a, b) => nahRel(a, b, 1e-6)); }
    else { expect(r.breslowDay).toBeNull(); expect(r.tarone).toBeNull(); }
    expect(r.schichtenMitEinemFall).toEqual((f.schichten_mit_einem_fall as number[]).map(i => i - 1));
    const erw: MhHinweis[] = [];
    if (f.schichten_mit_einem_fall.length) erw.push('schicht-ein-fall'); if (f.anteil_duenn >= 0.2) erw.push('duenne-schichten'); if (f.tarone && f.tarone.p !== null && f.tarone.p < 0.05) erw.push('bd-warnung');
    if (f.k === 1) erw.push('eine-schicht'); if (!f.or_mh) erw.push('kein-or'); if (f.cmh.korrigiert.chi2 === null) erw.push('keine-varianz');
    expect([...r.hinweise].sort(), name).toEqual([...erw].sort());
    for (const v of [r.delta, r.varianz, r.cmh.chi2, r.cmh.p, r.orMH?.or, r.breslowDay?.chi2, r.tarone?.chi2]) if (v !== null && v !== undefined) expect(Number.isNaN(v), `${name} NaN`).toBe(false);
  });
});

describe('Berkeley (UCBAdmissions, Bickel, Hammel & O’Connell 1975): die Lehre vom Simpson-Paradox', () => {
  const b = F.berkeley, r = mantelHaenszel(b.schichten);
  it('N = 4526, sechs Fächer; unbereinigt OR 1,84 (Männer häufiger zugelassen), Schicht-ORs ,349 ,803 1,133 ,921 1,222 ,828', () => {
    expect(r.n).toBe(4526); expect(r.k).toBe(6); nah(r.unbereinigt!.or, 1.841, 1e-3);
    r.schichten.forEach((x, i) => nah(x.or!, [0.349, 0.803, 1.133, 0.921, 1.222, 0.828][i]!, 1e-3));
  });
  it('bereinigt: CMH χ² = 1,4269 (p = ,2323) mit, 1,5246 (p = ,2169) ohne Korrektur; OR_MH = ,9047, KI [,7719; 1,0603]; Breslow-Day 18,83 mit 5 df (p = ,0021), Tarone ebenso', () => {
    nah(r.cmh.chi2!, 1.4269, 1e-4); nah(r.cmh.p!, 0.2323, 1e-3); nah(mantelHaenszel(b.schichten, { korrektur: false }).cmh.chi2!, 1.5246, 1e-4);
    nah(r.orMH!.or, 0.9047, 1e-4); nah(r.orMH!.lo, 0.7719, 1e-4); nah(r.orMH!.hi, 1.0603, 1e-4); nah(r.orMH!.seLn, 0.08099, 1e-3);
    nah(r.breslowDay!.chi2, 18.8255, 1e-5); expect(r.breslowDay!.df).toBe(5); nah(r.breslowDay!.p!, 0.0021, 2e-2); nah(r.tarone!.chi2, 18.8255, 1e-5);
    expect(r.hinweise).toContain('bd-warnung');
  });
  it('Zeilen vertauscht (Männer ↔ Frauen): OR_MH → 1/OR_MH, KI vertauscht und gekehrt, CMH und Breslow-Day gleich', () => {
    const v = mantelHaenszel(F.vertauscht.schichten);
    nahRel(v.orMH!.or, 1 / r.orMH!.or); nahRel(v.orMH!.lo, 1 / r.orMH!.hi); nahRel(v.orMH!.hi, 1 / r.orMH!.lo); nah(v.cmh.chi2!, r.cmh.chi2!, 1e-9); nah(v.breslowDay!.chi2, r.breslowDay!.chi2, 1e-8);
    nahRel(v.unbereinigt!.or, 1 / r.unbereinigt!.or);
    // und tatsächlich aus dem Berkeley-Fall durch Tauschen der Zeilen entstanden
    expect(F.vertauscht.schichten.map((t: number[][]) => t[0])).toEqual(b.schichten.map((t: number[][]) => t[1]));
  });
  it('MH-OR und unbereinigtes OR sind verschieden (Simpson): 0,90 gegen 1,84 - das Modul rechnet beide', () => { expect(r.unbereinigt!.or).toBeGreaterThan(1.8); expect(r.orMH!.or).toBeLessThan(1); });
});

describe('Kleine Fälle, K = 1, Nullzellen', () => {
  it('K = 3 (a,b,c,d: 3,2,1,4 / 2,1,0,3 / 1,0,1,2): OR_MH = 13,5, KI [1,111; 164,03], CMH (korrigiert) 3,038 mit p = ,0813', () => {
    const r = mantelHaenszel(F.klein_k3.schichten); nah(r.orMH!.or, 13.5, 1e-12); nah(r.orMH!.lo, 1.111, 1e-3); nah(r.orMH!.hi, 164.03, 1e-4); nah(r.cmh.chi2!, 3.038, 1e-3); nah(r.cmh.p!, 0.0813, 1e-2);
    expect(r.schichten[1]!.or).toBeNull();   // Nullzelle in der Schicht: kein Schicht-OR, keine Haldane-Korrektur; das gemeinsame OR ist trotzdem definiert
  });
  it('K = 1: OR_MH = OR, das Robins-Breslow-Greenland-KI ist das Woolf-KI; CMH ohne Korrektur = Pearson-χ² · (n − 1)/n', () => {
    const t = F.eine_schicht.schichten[0] as number[][], r = mantelHaenszel([t]), [[a, b], [c, d]] = t as [[number, number], [number, number]], n = a + b + c + d;
    nahRel(r.orMH!.or, (a * d) / (b * c), 1e-12); const se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d); nahRel(r.orMH!.lo, Math.exp(Math.log((a * d) / (b * c)) - 1.959964 * se), 1e-6); nahRel(r.orMH!.hi, Math.exp(Math.log((a * d) / (b * c)) + 1.959964 * se), 1e-6);
    const pearson = (n * (a * d - b * c) ** 2) / ((a + b) * (c + d) * (a + c) * (b + d)); nah(mantelHaenszel([t], { korrektur: false }).cmh.chi2!, pearson * (n - 1) / n, 1e-9);
    expect(r.breslowDay).toBeNull(); expect(r.hinweise).toContain('eine-schicht');
  });
  it('Schicht mit nur einem Fall geht nicht ein (nicht in Δ, nicht in ΣV), und der Hinweis nennt sie', () => {
    const r = mantelHaenszel(F.schicht_ein_fall.schichten), ohne = mantelHaenszel([F.schicht_ein_fall.schichten[0], F.schicht_ein_fall.schichten[2]]);
    expect(r.schichtenMitEinemFall).toEqual([1]); expect(r.hinweise).toContain('schicht-ein-fall'); nah(r.cmh.chi2!, ohne.cmh.chi2!, 1e-12); nah(r.delta, ohne.delta, 1e-12);
    expect(mhHinweisText('schicht-ein-fall', ['B'])).toBe('Schicht ‹B› hat nur einen Fall und geht nicht ein.');
  });
  it('Σ b·c = 0: kein gemeinsames OR schätzbar (kein Wert, kein KI), der Test geht trotzdem; Satz „kein gemeinsames Odds Ratio schätzbar“', () => {
    const r = mantelHaenszel(F.summe_bc_null.schichten); expect(r.orMH).toBeNull(); expect(r.hinweise).toContain('kein-or'); expect(r.cmh.chi2).not.toBeNull(); expect(r.breslowDay).toBeNull();
    expect(mhHinweisText('kein-or')).toContain('kein gemeinsames Odds Ratio schätzbar');
  });
  it('Σ a·d = 0 (OR_MH wäre 0): ebenfalls kein Wert, kein KI', () => {
    const r = mantelHaenszel([[[0, 3], [2, 4]], [[2, 1], [3, 0]]]); expect(r.orMH).toBeNull(); expect(r.hinweise).toContain('kein-or');
  });
  it('ΣV = 0 (jede Schicht mit einem Nullrand): kein Test, kein NaN, Hinweis keine-varianz', () => {
    const r = mantelHaenszel([[[3, 0], [2, 0]], [[4, 5], [0, 0]]]); expect(r.varianz).toBe(0); expect(r.cmh.chi2).toBeNull(); expect(r.cmh.p).toBeNull(); expect(r.hinweise).toContain('keine-varianz');
    expect(mhHinweisText('keine-varianz')).not.toMatch(/NaN/);
  });
  it('Δ genau 0: χ² = 0, p = 1, keine Korrektur angewendet; 0 < |Δ| < 0,5: R-Regel ohne Korrektur (siehe Abweichung IBM)', () => {
    const z = mantelHaenszel(F.delta_null.schichten); expect(Math.abs(z.delta)).toBe(0); expect(Math.abs(z.cmh.chi2!)).toBe(0); nah(z.cmh.p!, 1, 1e-12); expect(z.cmh.korrigiert).toBe(false);
    const k = F.delta_klein, r = mantelHaenszel(k.schichten); expect(Math.abs(r.delta)).toBeGreaterThan(0); expect(Math.abs(r.delta)).toBeLessThan(0.5); expect(r.cmh.korrigiert).toBe(false);
    nah(r.cmh.chi2!, k.cmh.unkorrigiert.chi2, 1e-12); expect(Math.abs(k.cmh.ibm_formel.chi2 - k.cmh.unkorrigiert.chi2)).toBeGreaterThan(1e-4);   // die IBM-Formel gäbe etwas anderes: dokumentiert im JSON, Entscheidung Opus
  });
});

describe('Grenzen und verallgemeinerter CMH', () => {
  it('mehr als 20 Schichten (22): Fehler zu-viele-schichten, nichts berechnet; genau 20 gehen', () => {
    expect(MH_MAX_SCHICHTEN).toBe(20); const z = F.zwanzig_plus;
    const r = mantelHaenszel(z.schichten); expect(r.fehler).toBe('zu-viele-schichten'); expect(r.orMH).toBeNull(); expect(r.cmh.chi2).toBeNull();
    const g = mantelHaenszel(z.schichten.slice(0, 20)); expect(g.fehler).toBeNull(); expect(g.k).toBe(20); expect(g.cmh.chi2).not.toBeNull();
    expect(mantelHaenszel([]).fehler).toBe('keine-schicht');
  });
  it('viele dünne Schichten (≥ 20 % mit n < 10): Hinweis; Berkeley ohne', () => {
    expect(mantelHaenszel(F.duenn_viele.schichten).hinweise).toContain('duenne-schichten'); expect(mantelHaenszel(F.berkeley.schichten).hinweise).not.toContain('duenne-schichten');
  });
  it('3×3×2 (Landis, Heyman & Koch): Q = mantelhaen.test, df = 4', () => {
    const a = E.allgemein, r = verallgemeinerterCmh(a.schichten)!; nah(r.chi2, a.chi2, 1e-9); expect(r.df).toBe(a.df); nahRel(r.p, a.p, 1e-7);
  });
  it('2×2×K: der verallgemeinerte CMH ist der UNkorrigierte MH-Wert (Berkeley)', () => {
    const r = verallgemeinerterCmh(F.berkeley.schichten)!; nah(r.chi2, F.berkeley.cmh.unkorrigiert.chi2, 1e-9); expect(r.df).toBe(1);
  });
  it('eine Schicht mit n = 1 geht nicht ein (3×3×3 mit einem Fall in der dritten Schicht = 3×3×2)', () => {
    const a = E.allgemein.mit_n1_schicht, r = verallgemeinerterCmh(a.schichten)!; nah(r.chi2, a.chi2, 1e-9); nah(r.chi2, E.allgemein.chi2, 1e-12);
  });
  it('Sätze: ganze Sätze, nie NaN', () => { for (const c of ['schicht-ein-fall', 'duenne-schichten', 'bd-warnung', 'eine-schicht', 'keine-varianz', 'kein-or'] as MhHinweis[]) { const t = mhHinweisText(c, ['x']); expect(t).not.toMatch(/NaN|undefined/); expect(t.trim().endsWith('.')).toBe(true); } });
});
