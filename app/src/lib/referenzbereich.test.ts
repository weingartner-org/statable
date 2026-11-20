import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-d-erwartet.json';
import {
  NORMAL_MIN_N, RANG_MIN_N_KI, RANG_MIN_N_PUNKT, REFERENZ_HINWEIS, ausreisserHinweis, boxCox, quantil6, rangGrenzen, referenzBoxCox, referenzGruppen, referenzNormal, referenzRang, satzReferenzRang
} from './referenzbereich';
import { s } from './sitzung.svelte';

/* ===== ROTE TESTS Welle S-D, M7: Referenzbereiche (2,5. bis 97,5. Perzentil) mit 90-%-Konfidenzintervall - Prüfer; der Bauer B ändert Test und JSON nicht =====
 * Soll: scripts/spaeter-d-erwartet.R → testdaten/spaeter-d-erwartet.json (m7). Fachblatt Abschnitt 4 + „Entscheidungen Opus“ 4. Daten: testdaten/referenz.csv (240 Werte; n = 120 sind die ersten 120).
 * Zweite Quelle im Skript: PSPP EXAMINE /PERCENTILES=HAVERAGE (= Typ 6; PSPP-Voreinstellung FREQUENCIES ohne /ALGORITHM=COMPATIBLE ist Typ 7, Befund F12), pbinom/dbinom (zwei Wege für die Ränge), qt(ncp) gegen uniroot(pt(ncp)),
 * MASS::boxcox (Gitter, Likelihood bis auf eine Konstante gleich), Simulation (Überdeckung exakt .899 bei n = 30; Rangintervall n = 150), Bland-Altman-Näherung. Horn-Pesce und Harrell-Davis werden NICHT gebaut (Opus 4). NIE `quantil7` aus diagrammdaten.ts.
 * Neues Modul `lib/referenzbereich.ts` (reine Funktionen). API:
 *
 *   RANG_MIN_N_PUNKT = 39 (kleinstes n mit Rang p(n+1) ≥ 1), RANG_MIN_N_KI = 119 (kleinstes n mit 90-%-Intervall der Rangmethode), NORMAL_MIN_N = 20
 *   quantil6(x: number[], p: number): number        Typ 6 (SPSS HAVERAGE, CLSI): r = p·(n + 1), lineare Interpolation; ist r < 1 oder r > n: NaN (kein stiller Randwert)
 *   rangGrenzen(n, p, niveau = 0.9): { l: number; u: number; abdeckung: number } | null        B ~ Bin(n, p); l = GRÖSSTER Rang mit P(B ≤ l − 1) ≤ (1 − niveau)/2, u = KLEINSTER Rang mit P(B ≤ u − 1) ≥ 1 − (1 − niveau)/2; null, wenn es kein l ≥ 1 gibt
 *   referenzRang(x: (number | null)[]): RangErgebnis        Fehlwerte werden ausgelassen (n = gültige)
 *     { n; ausgeschlossen; unten: number | null; oben: number | null /* Typ 6, null bei n < 39 *\/;
 *       ki: { rangUnten: [l, u]; rangOben: [l, u]; unten: [lo, hi]; oben: [lo, hi] /* Werte der Ränge *\/; abdeckung: [number, number] } | null /* null bei n < 119 *\/;
 *       hinweise: ('n-zu-klein' | 'ki-nicht-moeglich' | 'ganzzahlig')[]; fehler: null | 'alle-gleich' | 'keine-werte' }
 *       n < 39: hinweise ['n-zu-klein'] (nur parametrisch); 39 ≤ n < 119: Punktschätzung, hinweise ['ki-nicht-moeglich']; ganzzahlige Werte (alle x = Math.round(x)): 'ganzzahlig' dazu; alle Werte gleich: fehler 'alle-gleich', unten/oben/ki null
 *   referenzNormal(x: (number | null)[]): NormalErgebnis
 *     { n; ausgeschlossen; mittel; sd; unten; oben /* mittel ∓ 1,959964·sd *\/; kiUnten: [lo, hi]; kiOben: [lo, hi] /* EXAKT über die nichtzentrale t-Verteilung, 90 % *\/; naeherungUnten: [lo, hi]; naeherungOben: [lo, hi] /* Bland-Altman: SE = s·√(1/n + z²/(2(n−1))) *\/;
 *       shapiroP: number; hinweise: 'nicht-normal'[] /* shapiroP < ,05 *\/; fehler: null | 'n-zu-klein' /* n < 20 *\/ | 'alle-gleich' | 'keine-werte' }
 *   boxCox(x: number[]): { lambda: number; lambdaKi: [lo, hi] /* Profil-Likelihood, 95 % *\/; loglik: number } | { fehler: 'nicht-positiv' }
 *       Profil-Log-Likelihood L(λ) = −(n/2)·ln σ̂²(λ) + (λ − 1)·Σ ln xᵢ mit σ̂² = Varianz (Nenner n) von z = (x^λ − 1)/λ (λ = 0: ln x); λ in [−3; 3]; Intervall: L(λ) ≥ L(λ̂) − qchisq(.95, 1)/2
 *   referenzBoxCox(x: number[], lambda?: number): { lambda; mittelZ; sdZ; shapiroP /* der transformierten Werte *\/; unten: Grenze; oben: Grenze } | { fehler: 'nicht-positiv' }
 *       Grenze = { zt: number; ztKi: [lo, hi]; orig: number; origKi: [lo, hi] }  (zt = auf der transformierten Skala mittelZ ∓ z·sdZ, KI exakt nichtzentral t; orig = zurückgerechnet (λz + 1)^(1/λ) bzw. exp(z), monoton); lambda fehlt → geschätztes λ̂
 *   ausreisserHinweis(x: number[], o?: { lambda?: number }): { dr: { oben: number; unten: number }; verdacht: boolean /* D/R ≥ 1/3 *\/; tukey: { unten: number[]; oben: number[] } /* Zeilen (1-basiert) außerhalb Q1 − 1,5·IQR … Q3 + 1,5·IQR; mit lambda auf der Box-Cox-Skala *\/ }
 *       nur Hinweis: entfernt nie etwas, die Bereiche werden immer mit allen Werten gerechnet. D/R = (Abstand zum Nachbarn)/(Spannweite), je Ende.
 *   referenzGruppen(x: (number | null)[], gruppe: string[]): { gruppe: string; rang: RangErgebnis; normal: NormalErgebnis }[]        Reihenfolge des ersten Auftretens; jede Gruppe mit eigenem n und eigener Mindestzahl
 *   satzReferenzRang(e: RangErgebnis, einheit = ''): string        ganzer Satz (Fachblatt 4.9)
 *   REFERENZ_HINWEIS: string        „Der Bereich gilt nur, wenn die Werte von gesunden Referenzpersonen stammen, …“
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const E = (erwartet as any).m7;
const nah = (ist: number, soll: number, tol = 1e-9) => expect(Math.abs(ist - soll), `${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const paar = (ist: number[], soll: number[], tol = 1e-9) => { expect(ist.length).toBe(soll.length); soll.forEach((v, i) => nah(ist[i]!, v, tol)); };
const X: number[] = E.werte240, X120 = X.slice(0, 120);

describe('Konstanten und Typ 6', () => {
  it('Grenzen: 39, 119, 20', () => { expect(RANG_MIN_N_PUNKT).toBe(39); expect(RANG_MIN_N_KI).toBe(119); expect(NORMAL_MIN_N).toBe(20); });
  it('Typ 6 (nicht Typ 7): n = 120 → 29,74 / 75,2575; n = 240 → 31,325 / 77,74; Typ 7 wäre 31,26 / 69,8425', () => {
    nah(quantil6(X120, 0.025), 29.74, 1e-12); nah(quantil6(X120, 0.975), 75.2575, 1e-12); nah(quantil6(X, 0.025), 31.325, 1e-12); nah(quantil6(X, 0.975), 77.74, 1e-12);
    expect(Math.abs(quantil6(X120, 0.975) - E.rang.n120.typ7[1])).toBeGreaterThan(5);
  });
  it('PSPP EXAMINE HAVERAGE = Typ 6: Daten 1 bis 10, 25. und 75. Perzentil 2,75 / 8,25 (FREQUENCIES ohne COMPATIBLE gäbe 3,25 / 7,75)', () => { const z = Array.from({ length: 10 }, (_, i) => i + 1); nah(quantil6(z, 0.25), 2.75, 1e-12); nah(quantil6(z, 0.75), 8.25, 1e-12); });
  it('Rang kleiner als 1 oder größer als n: NaN, kein stiller Randwert (n = 38 bei p = ,025)', () => { expect(Number.isNaN(quantil6(X.slice(0, 38), 0.025))).toBe(true); expect(Number.isNaN(quantil6(X.slice(0, 38), 0.975))).toBe(true); expect(Number.isFinite(quantil6(X.slice(0, 39), 0.025))).toBe(true); expect(Number.isFinite(quantil6(X.slice(0, 39), 0.975))).toBe(true); });
});

describe('A Rangmethode: Ränder aus der Binomialverteilung (verteilungsfrei)', () => {
  for (const [name, t] of Object.entries(E.rang_tabelle) as [string, any][]) it(`${name}: ${t.ki_moeglich ? `Ränge ${t.unten.l}-${t.unten.u} und ${t.oben.l}-${t.oben.u}` : 'kein 90-%-Intervall'}`, () => {
    const u = rangGrenzen(t.n, 0.025), o = rangGrenzen(t.n, 0.975);
    if (!t.ki_moeglich) { expect(u).toBeNull(); return; }
    expect([u!.l, u!.u, o!.l, o!.u]).toEqual([t.unten.l, t.unten.u, t.oben.l, t.oben.u]); nah(u!.abdeckung, t.unten.abdeckung, 1e-12); nah(o!.abdeckung, t.oben.abdeckung, 1e-12);
  });
  it('erst ab n = 119 gibt es ein Intervall (0,975^118 = ,0504; 0,975^119 = ,0492); n = 120: Ränge 1 bis 7 und 114 bis 120, Abdeckung ,9205', () => {
    expect(rangGrenzen(118, 0.025)).toBeNull(); expect(rangGrenzen(119, 0.025)).not.toBeNull(); const r = rangGrenzen(120, 0.025)!; expect([r.l, r.u]).toEqual([1, 7]); expect(r.abdeckung).toBeCloseTo(0.9205, 4);
    const o = rangGrenzen(120, 0.975)!; expect([o.l, o.u]).toEqual([114, 120]); expect(rangGrenzen(240, 0.025)).toMatchObject({ l: 2, u: 11 }); expect(rangGrenzen(500, 0.025)).toMatchObject({ l: 7, u: 19 });
  });
  const pruefe = (name: string, x: (number | null)[], soll: any) => {
    const r = referenzRang(x); expect(r.n).toBe(soll.n);
    if (soll.unten === null) { expect(r.unten).toBeNull(); expect(r.oben).toBeNull(); } else { nah(r.unten!, soll.unten, 1e-12); nah(r.oben!, soll.oben, 1e-12); expect(Math.abs(r.unten! - soll.typ7[0])).toBeGreaterThan(1e-9); }
    if (soll.ki === null) expect(r.ki, name).toBeNull(); else {
      expect(r.ki!.rangUnten).toEqual(soll.ki.rang_unten); expect(r.ki!.rangOben).toEqual(soll.ki.rang_oben); paar(r.ki!.unten, soll.ki.unten, 1e-12); paar(r.ki!.oben, soll.ki.oben, 1e-12); paar(r.ki!.abdeckung, soll.ki.abdeckung, 1e-12);
    }
    return r;
  };
  it('n = 120 (Beispiel): 29,740 / 75,258; Konfidenzintervalle [26,7; 33,1] und [66,3; 78,9]; kein Hinweis', () => {
    const r = pruefe('n120', X120, E.rang.n120)!; paar(r.ki!.unten, [26.7, 33.1], 1e-12); paar(r.ki!.oben, [66.3, 78.9], 1e-12); expect(r.hinweise).toEqual([]); expect(r.fehler).toBeNull();
  });
  it('n = 240', () => { const r = pruefe('n240', X, E.rang.n240)!; expect(r.ki!.rangUnten).toEqual([2, 11]); expect(r.ki!.rangOben).toEqual([230, 239]); });
  for (const f of E.rang.weitere) it(`${f.text}: ${f.ki ? 'mit' : 'ohne'} Intervall, ${f.unten === null ? 'ohne' : 'mit'} Punktschätzung`, () => {
    const r = pruefe(f.name, X.slice(0, f.n), f)!;
    expect(r.hinweise).toEqual(f.n < 39 ? ['n-zu-klein'] : f.n < 119 ? ['ki-nicht-moeglich'] : []);
  });
  it('Gleichstände (ganze Zahlen): Rang-Intervalle bleiben gültig, Hinweis „ganzzahlig“', () => {
    const g = E.rang.ganzzahlig, r = pruefe('ganz', X120.map(v => Math.round(v)), g)!; expect(r.hinweise).toEqual(['ganzzahlig']); expect(referenzRang(X120).hinweise).not.toContain('ganzzahlig');
  });
  it('Fehlwerte in der Spalte: n im Satz (130 Zeilen, 10 leer → n = 120)', () => {
    const L = E.rang.luecken, r = referenzRang(L.daten); expect(r.n).toBe(120); expect(r.ausgeschlossen).toBe(10); nah(r.unten!, L.unten, 1e-12); nah(r.oben!, L.oben, 1e-12); expect(r.ki!.rangUnten).toEqual(L.ki.rang_unten);
  });
  it('alle Werte gleich: kein Bereich (SD = 0), Fehlercode, nie NaN', () => {
    const r = referenzRang(Array(150).fill(50)); expect(r.fehler).toBe('alle-gleich'); expect(r.unten).toBeNull(); expect(r.oben).toBeNull(); expect(r.ki).toBeNull(); const q = referenzNormal(Array(50).fill(7)); expect(q.fehler).toBe('alle-gleich'); expect(JSON.stringify(q)).not.toMatch(/NaN/);
    expect(referenzRang([null, null]).fehler).toBe('keine-werte');
  });
  it('Rangmethode, Simulation (Überdeckung bei n = 150 normal ≈ ,9419 - im Skript gemessen)', () => { expect(Math.abs(E.rang.simulation_abdeckung_n150 - rangGrenzen(150, 0.025)!.abdeckung)).toBeLessThan(0.008); });
});

describe('B Parametrisch: exaktes Konfidenzintervall über die nichtzentrale t-Verteilung', () => {
  for (const f of E.normal) it(`${f.name} (n = ${f.n})`, () => {
    const r = referenzNormal(X.slice(0, f.n)); expect(r.n).toBe(f.n); nah(r.mittel, f.mittel, 1e-12); nah(r.sd, f.sd, 1e-12); nah(r.unten, f.unten, 1e-12); nah(r.oben, f.oben, 1e-12);
    paar(r.kiUnten, f.ki_unten, 1e-6); paar(r.kiOben, f.ki_oben, 1e-6); paar(r.naeherungUnten, f.naeherung_unten, 1e-9); paar(r.naeherungOben, f.naeherung_oben, 1e-9); nah(r.shapiroP, f.shapiro_p, 1e-5); expect(r.fehler).toBeNull();
  });
  it('Fachblatt n = 120: untere Grenze 29,671, exakt [26,780; 32,052]; obere 69,411, exakt [67,030; 72,302]; Näherung [27,042; 32,300] und [66,782; 72,040]', () => {
    const r = referenzNormal(X120); paar([r.unten, ...r.kiUnten, r.oben, ...r.kiOben], [29.671, 26.78, 32.052, 69.411, 67.03, 72.302], 2e-5); paar([...r.naeherungUnten, ...r.naeherungOben], [27.042, 32.3, 66.782, 72.04], 2e-5);
  });
  it('Überdeckung des exakten Intervalls (Simulation n = 30, Soll ,90): im Skript gemessen', () => { expect(Math.abs(E.simulation_abdeckung_normal_n30 - 0.9)).toBeLessThan(0.008); });
  it('n < 20: gesperrt (fehler n-zu-klein), n = 20 geht', () => { expect(referenzNormal(X.slice(0, 19)).fehler).toBe('n-zu-klein'); expect(referenzNormal(X.slice(0, 20)).fehler).toBeNull(); });
  it('Hinweis „nicht-normal“ bei stark schiefen Werten (Shapiro-Wilk p < ,05), nicht beim Beispiel (p = ,296)', () => {
    const sch = referenzNormal(E.schief.werte); expect(sch.hinweise).toContain('nicht-normal'); nah(sch.shapiroP, E.schief.shapiro_p, 1e-4); nah(sch.unten, E.schief.unten, 1e-12); expect(referenzNormal(X120).hinweise).toEqual([]);
    // Roh-Normal liegt bei schiefen Daten daneben: Rangmethode und Normal weichen stark ab
    expect(Math.abs(sch.oben - referenzRang(E.schief.werte).oben!)).toBeGreaterThan(15);
  });
});

describe('Box-Cox: λ mit Intervall, nie still transformiert', () => {
  const Bc = E.boxcox;
  it('λ̂ = ,4652 mit 95-%-Profilintervall [−,221; 1,162] (enthält 0 = Logarithmus, aber nicht 1 = unverändert); Likelihood wie Skript', () => {
    const r = boxCox(X120) as any; nah(r.lambda, Bc.lambda, 1e-6); paar(r.lambdaKi, Bc.lambda_ki, 1e-6); nah(r.loglik, Bc.loglik, 1e-9);
    nah(r.lambda, 0.4652, 1e-3); expect(r.lambdaKi[0]).toBeLessThan(0); expect(r.lambdaKi[1]).toBeGreaterThan(1); expect(Bc.ki_enthaelt_null).toBe(true);
  });
  it('Rücktransformation bei λ̂: 31,32 [29,10; 33,21] und 70,93 [68,07; 74,49]; Shapiro-Wilk vorher / nachher p = ,296 / ,839', () => {
    const r = referenzBoxCox(X120) as any, h = Bc.haupt;
    nah(r.lambda, h.lambda, 1e-6); nah(r.mittelZ, h.mittel_z, 1e-6); nah(r.sdZ, h.sd_z, 1e-6); for (const g of ['unten', 'oben'] as const) { nah(r[g].zt, h[g].zt, 1e-6); paar(r[g].ztKi, h[g].zt_ki, 1e-6); nah(r[g].orig, h[g].orig, 1e-6); paar(r[g].origKi, h[g].orig_ki, 1e-6); }
    nah(r.shapiroP, h.shapiro_p, 1e-4); nah(r.shapiroP, Bc.shapiro_p_nachher, 1e-4); nah(referenzNormal(X120).shapiroP, Bc.shapiro_p_vorher, 1e-5);
    paar([r.unten.orig, ...r.unten.origKi, r.oben.orig, ...r.oben.origKi], [31.32, 29.1, 33.21, 70.93, 68.07, 74.49], 2e-4);
  });
  it('mit gegebenem λ: Logarithmus (λ = 0): 32,23 [30,37; 33,85] und 73,00 [69,51; 77,47]; Wurzel (λ = ,5)', () => {
    for (const [l, h] of [[0, Bc.logarithmus], [0.5, Bc.wurzel]] as const) { const r = referenzBoxCox(X120, l) as any; nah(r.lambda, l, 1e-15); for (const g of ['unten', 'oben'] as const) { nah(r[g].orig, h[g].orig, 1e-6); paar(r[g].origKi, h[g].orig_ki, 1e-6); } }
    const r0 = referenzBoxCox(X120, 0) as any; paar([r0.unten.orig, ...r0.unten.origKi, r0.oben.orig, ...r0.oben.origKi], [32.23, 30.37, 33.85, 73, 69.51, 77.47], 2e-4);
  });
  it('das Konfidenzintervall der Grenzen behandelt λ als bekannt: λ-Intervall ist breit, Logarithmus und Wurzel geben verschiedene Grenzen (32,2 / 73,0 gegen 31,3 / 70,9)', () => {
    const a = referenzBoxCox(X120, 0) as any, b = referenzBoxCox(X120, 0.5) as any; expect(Math.abs(a.oben.orig - b.oben.orig)).toBeGreaterThan(1.5);
  });
  it('negative Werte und 0: gesperrt (nicht-positiv), nie NaN', () => {
    expect(boxCox([1, 2, 3, -1, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])).toEqual({ fehler: 'nicht-positiv' }); expect(boxCox([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19])).toEqual({ fehler: 'nicht-positiv' });
    expect(referenzBoxCox([-5, ...X120.slice(0, 30)])).toEqual({ fehler: 'nicht-positiv' });
  });
});

describe('Ausreißer-Hinweis nach CLSI (D/R ≥ 1/3, Tukey 1,5): nur Hinweis, rechnet nie ohne die Werte', () => {
  const A = E.ausreisser_hinweis;
  it('n = 120: größter Abstand zum Nachbarn D/R = ,021 - kein Verdacht; mit einem Zusatzwert 260: ,776 - Verdacht', () => {
    const a = ausreisserHinweis(X120); nah(a.dr.oben, A.dr_n120[0], 1e-12); nah(a.dr.unten, A.dr_n120[1], 1e-12); expect(a.verdacht).toBe(false); expect(Math.max(a.dr.oben, a.dr.unten)).toBeLessThan(0.03);
    const b = ausreisserHinweis([...X120, A.wert_zusatz]); nah(b.dr.oben, A.dr_n121[0], 1e-12); expect(b.dr.oben).toBeCloseTo(0.776, 3); expect(b.verdacht).toBe(true);
  });
  it('Tukey 1,5 auf den Rohwerten markiert die obersten Zeilen (hier zwei: 77,8 und 78,9), auf der Box-Cox-Skala die gleichen Zeilen wie R', () => {
    const a = ausreisserHinweis(X120); expect(a.tukey.oben).toEqual(A.tukey_n120.oben_markiert); expect(a.tukey.unten).toEqual(A.tukey_n120.unten_markiert); expect(a.tukey.oben.length).toBe(2);
    const b = ausreisserHinweis(X120, { lambda: A.lambda }); expect(b.tukey.oben).toEqual(A.tukey_boxcox_n120.oben_markiert); expect(b.tukey.unten).toEqual(A.tukey_boxcox_n120.unten_markiert);
  });
  it('der Bereich wird mit allen Werten gerechnet: der Hinweis ändert referenzRang nicht', () => { const mit = referenzRang([...X120, 260]); ausreisserHinweis([...X120, 260]); expect(referenzRang([...X120, 260])).toEqual(mit); });
});

describe('Gruppenspalte: Bereiche je Gruppe, jede mit eigener Mindestzahl', () => {
  const Gr = E.gruppen, ergebnis = referenzGruppen(Gr.daten_x, Gr.daten_g);
  it('A (n = 130) mit Intervall, B (n = 70) nur Punktschätzung, C (n = 30) ohne Rangbereich; Reihenfolge des ersten Auftretens', () => {
    expect(ergebnis.map(g => g.gruppe)).toEqual(['A', 'B', 'C']); expect(ergebnis.map(g => g.rang.n)).toEqual([130, 70, 30]);
    ergebnis.forEach(g => { const soll = Gr.ergebnis[g.gruppe]; if (soll.ki === null) expect(g.rang.ki).toBeNull(); else expect(g.rang.ki!.rangUnten).toEqual(soll.ki.rang_unten); if (soll.unten === null) expect(g.rang.unten).toBeNull(); else nah(g.rang.unten!, soll.unten, 1e-12); });
    expect(ergebnis[1]!.rang.hinweise).toEqual(['ki-nicht-moeglich']); expect(ergebnis[2]!.rang.hinweise).toEqual(['n-zu-klein']); expect(ergebnis[2]!.normal.fehler).toBeNull();
  });
});

describe('Sätze', () => {
  it('Rangmethode (Fachblatt 4.9): Bereich, n, Methode, beide Konfidenzintervalle, Ränge', () => {
    const t = satzReferenzRang(referenzRang(X120), 'U/l');
    expect(t).toContain('29,7 bis 75,3 U/l'); expect(t).toContain('n = 120 Referenzpersonen'); expect(t).toContain('Rangmethode'); expect(t).toContain('26,7 bis 33,1'); expect(t).toContain('66,3 bis 78,9'); expect(t).toContain('Ränge 1 bis 7 und 114 bis 120'); expect(t).toContain('90-%-Konfidenzintervall'); expect(t).not.toMatch(/NaN|undefined/);
  });
  it('n zwischen 39 und 118: Punktschätzung ohne Intervall, der Satz nennt „mindestens 119 Werte“', () => {
    const t = satzReferenzRang(referenzRang(X.slice(0, 100)), 'mg/l'); expect(t).toContain('mindestens 119 Werte'); expect(t).not.toContain('Ränge'); expect(t).not.toMatch(/NaN|undefined/);
  });
  it('Referenzpersonen: fester Hinweis', () => { expect(REFERENZ_HINWEIS).toContain('gesunden Referenzpersonen'); expect(REFERENZ_HINWEIS).toMatch(/Patientinnen und Patienten/); });
});
