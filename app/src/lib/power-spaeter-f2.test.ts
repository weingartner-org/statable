import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-f2-erwartet.json';
import { s } from './sitzung.svelte';
import {
  f2AusR2, powerR2Zuwachs, nR2Zuwachs, kleinstesF2R2Zuwachs, powerPartiell, nPartiell, powerKorrelation, powerAnovaEffekt, nAnovaEffekt, nAnovaMehrere, kontrastF, etaSpssAusF2, f2AusEtaSpss,
  powerMessw, nMessw, fMessAusSpss, planPruefungF2, satzR2Zuwachs, satzR2ZuwachsSens, satzPartiell, satzAnovaFaktoren, satzAncova, satzMessw, hinweisFestesModell, type Fmt
} from './power';

/* ===== Später, Welle S-F2, Teil A: Fallzahl ergänzen (Seite „Studie planen“; Fachblatt SPAETER-F2-ERGAENZUNGEN Abschnitt A und „Entscheidungen Opus (19.10.)“ 1 bis 5 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer A darf diese Datei und die JSON nicht ändern. Alles reine JS-Funktionen in lib/power.ts (kein R); wiederverwendet werden fNichtzentral, fQuantil, powerKorrelation.
 * Sollwerte: scripts/spaeter-f2-erwartet.R → testdaten/spaeter-f2-erwartet.json, Abschnitt `fallzahl` und `vergleich`: jede Zahl auf mindestens zwei Wegen (eigene Formel, WebPower, pwr, SuppDists) UND die gedruckten Beispiele
 * des G*Power-Handbuchs (Fassung 1. Juni 2023) und von Faul et al. 2007/2009 bis zur gedruckten Stelle. Toleranzen: Fallzahlen EXAKT, Power 1e-9 ABSOLUT (F-Verteilung); die exakte Korrelation 1e-6 absolut (die Hotelling-Dichte, in R adaptiv integriert, trifft die Simpson-Integration von power.ts auf 1e-8 bis 1e-7; SuppDists ist dafür NICHT genau genug),
 * λ und kritisches F 1e-9 relativ, Simulationen: Abstand höchstens 4 × mc_se.
 *
 * SCHNITTSTELLE lib/power.ts (neu; Namen und Signaturen sind fest)
 *   f2AusR2(r2voll: number, r2alt: number, r2alle?: number): number           f² = (R²voll − R²alt)/(1 − R²alle); ohne r2alle (Fall 1) ist r2alle = r2voll; Fall 2: r2alle = R² mit allen Blöcken
 *   powerR2Zuwachs(f2: number, N: number, q: number, m: number, alpha = 0.05): { power: number; lambda: number; krit: number; df1: number; df2: number }
 *        festes Modell (G*Power „R² increase“): λ = f²·N, df1 = q (getestete Prädiktoren), df2 = N − m − 1 (m = ALLE Prädiktoren im vollen Modell)
 *   nR2Zuwachs(f2: number, q: number, m: number, ziel = 0.8, alpha = 0.05): { N: number; power: number } | null        kleinste ganze Gesamtzahl mit Power ≥ ziel (≥ m + 2); null, wenn sie über 500 000 läge
 *   kleinstesF2R2Zuwachs(N: number, q: number, m: number, ziel = 0.8, alpha = 0.05): number | null        Sensitivität (Bisektion); null, wenn N ≤ m + 1 oder selbst f² = 10 nicht reicht
 *   powerPartiell(rp: number, N: number, k: number, o?: { alpha?: number; seiten?: 1 | 2; weg?: 'exakt' | 'fest' }): number
 *        k = Zahl der herausgerechneten Variablen; weg 'exakt' (Voreinstellung, Opus 3): exakte Verteilung von r aus N − k Paaren = powerKorrelation(|rp|, N − k, alpha, seiten);
 *        weg 'fest': „wie G*Power“: R²-Zuwachs mit q = 1, f² = rp²/(1 − rp²), m = k + 1, df2 = N − k − 2; einseitig ein nichtzentraler t-Test (λ = √(f²·N)); rp gilt als Betrag
 *   nPartiell(rp: number, k: number, o?: { alpha?: number; ziel?: number; seiten?: 1 | 2; weg?: 'exakt' | 'fest' }): number        kleinste ganze Zahl N (Voreinstellung ziel 0,8, zweiseitig, exakt), mindestens k + 4
 *   powerAnovaEffekt(f: number, N: number, df1: number, zellen: number, o?: { alpha?: number; kovariaten?: number; r2kov?: number }): { power; lambda; krit; df1; df2 }
 *        λ = f_korr²·N mit f_korr = f/√(1 − r2kov) (r2kov Voreinstellung 0); df2 = N − zellen − kovariaten (kovariaten Voreinstellung 0). Gilt für Haupteffekte, Wechselwirkungen, Kontraste (df1 = 1) und die Kovarianzanalyse
 *   nAnovaEffekt(f, df1, zellen, o?: { alpha?; ziel?; kovariaten?; r2kov? }): { N; power; jeZelle: number; NGleich: number; powerGleich: number } | null
 *        N = kleinste Gesamtzahl (G*Power: nicht auf Zellen aufgerundet), jeZelle = ⌈N/zellen⌉, NGleich = zellen·jeZelle, powerGleich = Power bei NGleich (Opus 4: beides zeigen)
 *   nAnovaMehrere(effekte: { name: string; f: number; df1: number }[], zellen: number, o?: {…wie nAnovaEffekt}): { N; jeZelle; NGleich; ungünstigster: string; je: { name: string; N: number }[] }   N = Maximum über die Effekte (Opus 4)
 *   kontrastF(c: number[], mu: number[], n: number, sigma: number): number        f = |Σ cᵢ μᵢ| / √(N Σ cᵢ²/n) / σ mit N = n · Zahl der Gruppen (gleich große Gruppen n); Gewichte c summieren zu 0
 *   etaSpssAusF2(f2: number, N: number, zellen: number): number         partielles η² der SPSS-Ausgabe: e = f²/(1 + f²); e·N/(N − zellen + zellen·e)
 *   f2AusEtaSpss(eta2spss: number, N0: number, df2: number): number     f² = g·df2/N0, g = η²/(1 − η²) (η² und N0 aus der Vorstudie, df2 = Fehler-Freiheitsgrade dort)
 *   powerMessw(f: number, N: number, k: number, m: number, rho: number, eps: number, typ: 'innerhalb' | 'zwischen' | 'wechsel', alpha = 0.05): { power; lambda; krit; df1; df2 }   Faul et al. 2007, Tabelle 3 (f wie G*Power: σ = SD EINER Messung)
 *   nMessw(f, k, m, rho, eps, typ, o?: { ziel?: number; alpha?: number }): { N: number; power: number } | null        kleinste ganze Zahl ≥ k + 2
 *   fMessAusSpss(eta2p: number, N0: number, k: number, m: number, rho: number): number        G*Power-f aus SPSS-η² (innerhalb): f_S² = g (m − 1)(N0 − k)/(m N0); f_G² = f_S² (1 − ρ); gibt f_G
 *   planPruefungF2(p: PlanEingabeF2): { fehler: string | null; hinweise: string[] }
 *        PlanEingabeF2 = { art: 'r2zuwachs'; r2voll: number; r2alt: number; q: number; m: number; N?: number } | { art: 'partiell'; rp: number; k: number; N?: number }
 *                      | { art: 'messw'; m: number; rho: number; eps: number; k: number; N?: number } | { art: 'anovaplus'; zellen: number; df1: number; kovariaten?: number; r2kov?: number; N?: number }
 *        Fehlercodes: r2zuwachs: 'r2' (nicht 0 ≤ alt < voll < 1), 'q' (q < 1, nicht ganz oder q > m), 'n' (N ≤ m + 1); partiell: 'rp' (|rp| ≥ 1 oder 0), 'k' (k < 0 oder nicht ganz), 'n' (N − k < 4);
 *        messw: 'm' (m < 2), 'rho' (ρ < −1/(m − 1) oder ρ ≥ 1; Opus 5), 'eps' (ε < 1/(m − 1) oder ε > 1), 'n' (N ≤ k + 1); anovaplus: 'zellen' (< 2), 'df1' (< 1 oder > zellen − 1), 'r2kov' (< 0 oder ≥ 1), 'n' (N ≤ zellen + kovariaten). Hinweis-Codes: 'zufall' (bei r2zuwachs immer: „gemessene Prädiktoren“),
 *        'epsilon-naeherung' (messw mit eps < 1), 'sehr-gross' (N > 1 000 000 nicht prüfbar ohne N: nur wenn N gegeben).
 *   satzR2Zuwachs(e: { f2: number; q: number; m: number; alpha: number; ziel: number; N: number }, f: Fmt): string
 *   satzR2ZuwachsSens(e: { f2: number; q: number; m: number; alpha: number; ziel: number; N: number }, f: Fmt): string        (f2 = der gerundete, aufgerundete Wert wie `effektAuf`)
 *   hinweisFestesModell(f: Fmt): string                         der Pflicht-Hinweissatz zum Zufallsmodell (Opus 2)
 *   satzPartiell(e: { rp: number; k: number; alpha: number; ziel: number; seiten: 1 | 2; weg: 'exakt' | 'fest'; N: number }, f: Fmt): string
 *   satzAnovaFaktoren(e: { a: number; b: number; effekt: 'A' | 'B' | 'A×B'; f: number; df1: number; alpha: number; ziel: number; N: number; jeZelle: number; NGleich: number }, f: Fmt): string
 *   satzAncova(e: { f: number; r2kov: number; kovariaten: number; df1: number; zellen: number; alpha: number; ziel: number; N: number }, f: Fmt): string
 *   satzMessw(e: { typ: 'innerhalb' | 'zwischen' | 'wechsel'; k: number; m: number; f: number; rho: number; eps: number; alpha: number; ziel: number; N: number }, f: Fmt): string
 *   Alle Sätze enden wie die vorhandenen (`satzAPriori`): „… Die Berechnung erfolgte in Statable über …, im Rechenweg wie G*Power.“ / „… following the procedure of G*Power.“ (Zahlen im Profil: p ohne Null, f² mit 2 oder 3 Stellen wie `effektText`). */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const J = ERW as unknown as Z, F = J.fallzahl as Z;
const DE: Fmt = { en: false, punkt: false }, EN: Fmt = { en: true, punkt: true };
const nah = (ist: any, soll: number, tol: number, was: string) => {
  expect(typeof ist, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Number.isNaN(ist), `${was}: NaN`).toBe(false);
  expect(Math.abs(ist - soll), `${was} (ist ${ist}, soll ${soll})`).toBeLessThanOrEqual(tol * Math.max(Math.abs(soll), 1));   // Zahlen unter 1 (Power) ABSOLUT, größere relativ: fNichtzentral in power.ts liegt gegen pf(ncp) in R um etwa 4e-10 daneben
};

describe('A.1 R²-Zuwachs: gedruckte Beispiele (G*Power-Handbuch Kap. 14, Faul 2009) und Raster', () => {
  const B = F.r2zuwachs.beispiele as Z;
  it('f² aus R²: Fall 1 (,30 gegen ,25: ,0714286) und Fall 2 (,16, ,10, ,20: ,075)', () => {
    nah(f2AusR2(B.fall1.r2voll, B.fall1.r2alt), B.fall1.f2_exakt, 1e-12, 'Fall 1'); nah(f2AusR2(B.fall2.r2voll, B.fall2.r2alt, B.fall2.r2alle), B.fall2.f2, 1e-12, 'Fall 2'); nah(f2AusR2(0.3, 0.25, 0.3), f2AusR2(0.3, 0.25), 1e-15, 'Fall 1 = Fall 2 mit r2alle = r2voll');
  });
  it('Fall 14.3.1 mit dem gerundeten f² des Eingabefelds (,0714286): λ 6,428574, krit 3,563110, df2 80, Power ,241297; N für ,80 = 242', () => {
    const b = B.fall1, e = powerR2Zuwachs(b.f2_gedruckt, b.N, b.q, b.m, b.alpha); nah(e.lambda, b.lambda, 1e-9, 'λ'); nah(e.krit, b.krit, 1e-9, 'krit'); expect(e.df1).toBe(4); expect(e.df2).toBe(b.df2); nah(e.power, b.power, 1e-9, 'Power');
    expect(Math.round(e.power * 1e6) / 1e6).toBe(0.241297); expect(nR2Zuwachs(b.f2_gedruckt, b.q, b.m, 0.8, b.alpha)!.N).toBe(b.n_fuer_80); expect(nR2Zuwachs(b.f2_exakt, b.q, b.m, 0.8, b.alpha)!.N).toBe(242);
    nah(powerR2Zuwachs(b.f2_exakt, b.N, b.q, b.m, b.alpha).power, b.power_mit_exaktem_f2, 1e-9, 'Power mit exaktem f²');
  });
  it('Fall 14.3.2 (Kontrollblock C): f² ,075, q 3, m 12, N 200, α ,01: λ 15, krit 3,888052, df2 187, Power ,766990', () => {
    const b = B.fall2, e = powerR2Zuwachs(b.f2, b.N, b.q, b.m, b.alpha); nah(e.lambda, 15, 1e-12, 'λ'); nah(e.krit, b.krit, 1e-9, 'krit'); expect(e.df2).toBe(187); nah(e.power, b.power, 1e-9, 'Power'); expect(Math.round(e.power * 1e6) / 1e6).toBe(0.76699);
  });
  it('Wechselwirkung V×W in 2×3×4 über die Regression (f² ,06251852, q 6, m 23, N 120): Power ,470; Faul 2009: f² ,15, q 1, m 3, N 60 → ,838477', () => {
    const w = B.wechselwirkung; nah(powerR2Zuwachs(w.f2, w.N, w.q, w.m, w.alpha).power, w.power, 1e-9, 'V×W'); expect(Math.round(w.power * 1000) / 1000).toBe(0.47);
    const f9 = B.faul2009; nah(powerR2Zuwachs(f9.f2, f9.N, f9.q, f9.m, f9.alpha).power, f9.power_zweiseitig, 1e-9, 'Faul 2009'); expect(Math.round(f9.power_zweiseitig * 1e6) / 1e6).toBe(0.838477);
  });
  for (const r of F.r2zuwachs.raster as Z[]) {
    it(`Raster f² ${r.f2}, q ${r.q}, ${r.kontrollen} Kontrollen, Ziel ${r.ziel}: N = ${r.N}`, () => {
      const e = nR2Zuwachs(r.f2, r.q, r.m, r.ziel, r.alpha)!; expect(e.N).toBe(r.N); nah(e.power, r.power, 1e-9, 'Power'); const p = powerR2Zuwachs(r.f2, r.N, r.q, r.m, r.alpha); nah(p.lambda, r.lambda, 1e-12, 'λ'); nah(p.krit, r.krit, 1e-9, 'krit'); expect(p.df2).toBe(r.df2);
      expect(powerR2Zuwachs(r.f2, r.N - 1, r.q, r.m, r.alpha).power, 'eine Person weniger reicht nicht').toBeLessThan(r.ziel);
    });
  }
  it('Sensitivität: kleinstes f² bei N, q, m (Skript: uniroot, 1e-6 relativ)', () => { for (const x of F.r2zuwachs.empfindlichkeit as Z[]) nah(kleinstesF2R2Zuwachs(x.N, x.q, x.m, x.ziel, 0.05)!, x.f2, 1e-6, `N ${x.N} q ${x.q} m ${x.m}`); });
  it('pwr.f2.test ist hier FALSCH (λ = f²(u + v + 1)): unsere Power ist die von G*Power und WebPower, nicht die von pwr', () => {
    const p = F.r2zuwachs.pwr_falle; nah(powerR2Zuwachs(B.fall1.f2_exakt, 90, 4, 9, 0.01).power, F.r2zuwachs.webpower_gleich, 1e-9, 'WebPower'); expect(Math.abs(powerR2Zuwachs(B.fall1.f2_exakt, 90, 4, 9, 0.01).power - p.fall1_pwr_f2_test_u4_v80)).toBeGreaterThan(0.01);
    for (const r of F.r2zuwachs.raster as Z[]) { if (r.kontrollen === 0) expect(r.pwr_N, `ohne Kontrollen gleich pwr (${r.f2}, q ${r.q})`).toBe(r.N); else expect(r.pwr_N, 'mit Kontrollen verlangt pwr zu viele').toBeGreaterThan(r.N); }
  });
  it('Zufallsmodell ist etwas ungünstiger als das feste (Simulation, 10 000 Läufe): die feste Zahl liegt über der simulierten, aber höchstens 0,04; der Hinweissatz sagt es', () => {
    const mc = F.r2zuwachs.mc_zufaellige_praediktoren as Z;   // das Skript rechnet N90 mit dem gerundeten, N242 mit dem exakten f²
    for (const k of ['N90', 'N242']) { const fest = powerR2Zuwachs(k === 'N90' ? B.fall1.f2_gedruckt : B.fall1.f2_exakt, k === 'N90' ? 90 : 242, 4, 9, 0.01).power; nah(fest, mc[k].fest, 1e-9, k); expect(fest - mc[k].zufaellig).toBeGreaterThan(4 * mc[k].mc_se); expect(fest - mc[k].zufaellig).toBeLessThan(0.04); }
    expect(hinweisFestesModell(DE)).toMatch(/gemessen/); expect(hinweisFestesModell(DE)).toMatch(/Sicherheitszuschlag/); expect(hinweisFestesModell(EN)).toMatch(/measured/);
  });
  it('sehr kleiner Effekt: mehr als 500 000 Personen → null; Sensitivität mit N ≤ m + 1 → null', () => { expect(nR2Zuwachs(1e-7, 1, 2)).toBeNull(); expect(kleinstesF2R2Zuwachs(5, 1, 4)).toBeNull(); });
});

describe('A.1 Sätze R²-Zuwachs (de und en)', () => {
  const e = { f2: B1(), q: 4, m: 9, alpha: 0.01, ziel: 0.8, N: 242 };
  function B1() { return (F.r2zuwachs.beispiele as Z).fall1.f2_exakt as number; }
  it('A priori deutsch: Kern (Zuwachs, 4 getestete von 9 Prädiktoren, f² = 0,071, α = ,01, 1 − β = ,80, N = 242, nichtzentrale F-Verteilung, wie G*Power, festes Modell)', () => {
    const t = satzR2Zuwachs(e, DE); for (const re of [/Zuwachs an erklärter Varianz/, /4 getestete/, /9 Prädiktoren/, /f² = 0,071/, /α = ,01/, /1 − β = ,80/, /N = 242/, /nichtzentrale F-Verteilung/, /wie G\*Power/, /festes Modell/]) expect(t).toMatch(re);
  });
  it('A priori englisch', () => { const t = satzR2Zuwachs(e, EN); for (const re of [/increase in explained variance/, /4 tested/, /9 predictors/, /f² = 0\.071/, /α = \.01/, /1 − β = \.80/, /N = 242/, /noncentral F distribution/, /G\*Power/, /fixed/]) expect(t).toMatch(re); });
  it('Sensitivität: „ab f² = 0,09“ (kleinster Wert 0,0801 aufgerundet), 1 getesteter von 4 Prädiktoren, N = 100', () => {
    const t = satzR2ZuwachsSens({ f2: 0.09, q: 1, m: 4, alpha: 0.05, ziel: 0.8, N: 100 }, DE); for (const re of [/Sensitivitätsanalyse/, /1 getesteter/, /4 Prädiktoren/, /N = 100/, /f² = 0,09/]) expect(t).toMatch(re);
    expect(satzR2ZuwachsSens({ f2: 0.09, q: 1, m: 4, alpha: 0.05, ziel: 0.8, N: 100 }, EN)).toMatch(/sensitivity analysis/);
  });
});

describe('A.2 Partielle Korrelation: exakt (N − k Paare) und „wie G*Power“ (fest)', () => {
  const P = F.partielle_korrelation as Z;
  it('ohne Kontrollvariablen (k = 0) ist exakt die gewöhnliche Korrelation: N = 84 bei r = ,3, Power ,80 (wie power.test.ts); powerPartiell = powerKorrelation(rp, N − k)', () => {
    expect(nPartiell(0.3, 0)).toBe(84); nah(powerPartiell(0.3, 84, 0), powerKorrelation(0.3, 84, 0.05, 2), 1e-12, 'k = 0'); nah(powerPartiell(0.3, 87, 3), powerKorrelation(0.3, 84, 0.05, 2), 1e-12, 'N − k Paare'); nah(powerPartiell(-0.3, 87, 3), powerPartiell(0.3, 87, 3), 1e-12, 'Betrag');
  });
  for (const r of P.raster as Z[]) {
    it(`ρp ${r.rp}, k ${r.k}, Ziel ${r.ziel}: fest ${r.N_fest}, exakt ${r.N_exakt}`, () => {
      expect(nPartiell(r.rp, r.k, { ziel: r.ziel, weg: 'fest' })).toBe(r.N_fest); expect(nPartiell(r.rp, r.k, { ziel: r.ziel, weg: 'exakt' })).toBe(r.N_exakt); expect(nPartiell(r.rp, r.k, { ziel: r.ziel }), 'Voreinstellung ist exakt').toBe(r.N_exakt);
      nah(powerPartiell(r.rp, r.N_fest, r.k, { weg: 'fest' }), r.power_fest, 1e-9, 'Power fest'); nah(powerPartiell(r.rp, r.N_exakt, r.k, { weg: 'exakt' }), r.power_exakt, 1e-6, 'Power exakt (Simpson mit 600 Schritten: bis 1e-7 bei n ≈ 1000)');
    });
  }
  it('einseitig (ρp ,3, k 3, ,80): fest 64, exakt 70; die feste Zahl hängt nicht von k ab (82 für alle k bei ρp ,3 zweiseitig)', () => {
    const e = P.einseitig; expect(nPartiell(e.rp, e.k, { ziel: e.ziel, seiten: 1, weg: 'fest' })).toBe(e.N_fest); expect(nPartiell(e.rp, e.k, { ziel: e.ziel, seiten: 1, weg: 'exakt' })).toBe(e.N_exakt);
    for (const k of [0, 1, 3]) expect(nPartiell(0.3, k, { weg: 'fest' })).toBe(82);
  });
  it('Simulation (20 000 Läufe, N 84): die exakte Power liegt bei k = 3 und k = 8 innerhalb 4 × mc_se der simulierten, die feste nicht', () => {
    const mc = P.mc as Z;
    for (const k of ['k3_N84', 'k8_N84']) { const kk = k === 'k3_N84' ? 3 : 8; nah(powerPartiell(0.3, 84, kk, { weg: 'exakt' }), mc[k].exakt, 1e-6, 'exakt'); nah(powerPartiell(0.3, 84, kk, { weg: 'fest' }), mc[k].fest, 1e-9, 'fest');
      expect(Math.abs(mc[k].exakt - mc[k].simuliert)).toBeLessThan(4 * mc[k].mc_se); expect(Math.abs(mc[k].fest - mc[k].simuliert)).toBeGreaterThan(4 * mc[k].mc_se); }
  });
  it('Sätze: exakt (Voreinstellung) nennt „exakte Verteilung von r“ und N − 3 Paare; fest nennt „R²-Zuwachs mit einem Prädiktor“; englisch ebenso', () => {
    const e = { rp: 0.3, k: 3, alpha: 0.05, ziel: 0.8, seiten: 2 as const };
    const a = satzPartiell({ ...e, weg: 'exakt', N: 87 }, DE); for (const re of [/partielle Korrelation/, /ρp = ,30/, /Kontrolle von 3 Variablen/, /α = ,05/, /1 − β = ,80/, /zweiseitig/, /N = 87/, /exakte Verteilung von r/, /N − 3 Paaren/]) expect(a).toMatch(re);
    const b = satzPartiell({ ...e, weg: 'fest', N: 82 }, DE); for (const re of [/N = 82/, /nichtzentrale F-Verteilung/, /R²-Zuwachs mit einem Prädiktor/, /G\*Power/]) expect(b).toMatch(re);
    const c = satzPartiell({ ...e, weg: 'exakt', N: 87 }, EN); for (const re of [/partial correlation/, /controlling for 3 variables/, /N = 87/, /exact distribution of r/]) expect(c).toMatch(re);
  });
});

describe('A.3 Varianzanalyse mehrfaktoriell, Kontraste, SPSS-η² (gedruckt: Handbuch Kap. 10 und 11, Abb. 14)', () => {
  const A = F.anova_mehrfaktoriell as Z, Bsp = A.beispiele as Z;
  it('einfaktoriell, 10 Gruppen, f ,25 (S. 25): λ 24,375, krit 1,904538, df2 380, Power ,952363 bei N = 390; kleinste Zahl 386', () => {
    const b = Bsp.einfaktoriell, e = powerAnovaEffekt(b.f, b.N, 9, b.k); nah(e.lambda, b.lambda, 1e-12, 'λ'); nah(e.krit, b.krit, 1e-9, 'krit'); expect(e.df2).toBe(380); nah(e.power, b.power, 1e-9, 'Power'); expect(nAnovaEffekt(0.25, 9, 10, { ziel: 0.95 })!.N).toBe(b.n_kleinste);
  });
  it('3×3×4-Plan, N 108, 36 Zellen: Haupteffekt A, A×B und A×B×C (S. 27-29; λ, kritisches F, df2, Power; Abb. 14: beobachtete Power ,476 und ,513)', () => {
    for (const [k, df1] of [['a', 2], ['ab', 4], ['abc', 12]] as const) { const b = Bsp[k], e = powerAnovaEffekt(b.f, b.N, df1, b.zellen); nah(e.lambda, b.lambda, 1e-9, `${k} λ`); nah(e.krit, b.krit, 1e-9, `${k} krit`); nah(e.power, b.power, 1e-9, `${k} Power`); expect(e.df2).toBe(72); }
    expect(Math.round(Bsp.ab.power * 1000) / 1000).toBe(0.476); expect(Math.round(Bsp.abc.power * 1000) / 1000).toBe(0.513);
  });
  it('A×C in 3×2×5 (30 Zellen, f ,1, Power ,95): N = 2283 (kein Vielfaches von 30), λ 22,83, df2 2253, Power ,950078; bei 30·77 = 2310: ,952674', () => {
    const b = Bsp.n_ac, e = nAnovaEffekt(b.f, b.df1, b.zellen, { ziel: b.ziel })!; expect(e.N).toBe(2283); nah(e.power, b.power, 1e-9, 'Power'); expect(e.jeZelle).toBe(77); expect(e.NGleich).toBe(2310); nah(e.powerGleich, 0.952674, 1e-6, 'bei 2310 (gedruckt auf 6 Stellen)');
    const p = powerAnovaEffekt(b.f, 2283, 8, 30); nah(p.lambda, b.lambda, 1e-12, 'λ'); expect(p.df2).toBe(b.df2);
  });
  it('Kontraste (S. 29-30; N 20, 4 Gruppen, n 5, σ 2): f = ,4375 / ,475164 / ,0625; Power ,451898 / ,514736 / ,057970 (G*Power rechnet mit dem auf 6 Stellen gerundeten f)', () => {
    const mu = [1.5, 2, 3, 4]; const soll: [number[], number, number][] = [[[-0.5, -0.5, 0.5, 0.5], 0.4375, 0.451898], [[-3, -1, 1, 3], 0.475164, 0.514736], [[1, -1, -1, 1], 0.0625, 0.05797]];
    for (const [c, f, p] of soll) { nah(kontrastF(c, mu, 5, 2), f, 1e-6, `f ${c}`); expect(Math.round(powerAnovaEffekt(Math.round(kontrastF(c, mu, 5, 2) * 1e6) / 1e6, 20, 1, 4).power * 1e6) / 1e6).toBe(p); }
    nah(powerAnovaEffekt(kontrastF([-3, -1, 1, 3], mu, 5, 2), 20, 1, 4).power, Bsp.kontraste.linear, 1e-3, 'linear (ungerundetes f)'); nah(Bsp.kontraste.linear, 0.514736, 1e-5, 'JSON linear');
  });
  it('SPSS-η²: aus f² (G*Power) und zurück; Abb. 14 der Handbuchs: partielles η² A ,428, A×B ,083 (der Text mit ,0813 ist ein Druckfehler), A×B×C ,140', () => {
    const e = A.spss_eta; nah(etaSpssAusF2(Bsp.a.f ** 2, 108, 36), e.a, 1e-9, 'A'); nah(etaSpssAusF2(Bsp.ab.f ** 2, 108, 36), e.ab, 1e-9, 'A×B'); nah(etaSpssAusF2(Bsp.abc.f ** 2, 108, 36), e.abc, 1e-9, 'A×B×C');
    expect([e.a, e.ab, e.abc].map(v => Math.round(v * 1000) / 1000)).toEqual([0.428, 0.083, 0.14]); nah(f2AusEtaSpss(e.ab, 108, 72), Bsp.ab.f ** 2, 1e-12, 'zurück: f² = g·df2/N0');
  });
  for (const r of A.raster as Z[]) {
    it(`Raster ${r.faktorA}×${r.faktorB}, Effekt ${r.effekt}, f ${r.f}: N ${r.N}, je Zelle ${r.je_zelle}, gleich große Zellen ${r.N_gleich}`, () => {
      const e = nAnovaEffekt(r.f, r.df1, r.zellen, { ziel: r.ziel })!; expect(e.N).toBe(r.N); nah(e.power, r.power, 1e-9, 'Power'); expect(e.jeZelle).toBe(r.je_zelle); expect(e.NGleich).toBe(r.N_gleich); nah(e.powerGleich, r.power_gleich, 1e-9, 'Power gleich große Zellen');
    });
  }
  it('mehrere Effekte am selben Plan: der ungünstigste bestimmt (3×3, f ,25: A 158, B 158, A×B 196 → 196, je Zelle 22, gleich große Zellen 198)', () => {
    const e = nAnovaMehrere([{ name: 'A', f: 0.25, df1: 2 }, { name: 'B', f: 0.25, df1: 2 }, { name: 'A×B', f: 0.25, df1: 4 }], 9)!; expect(e.N).toBe(196); expect(e.ungünstigster).toBe('A×B'); expect(e.je.map(x => x.N)).toEqual([158, 158, 196]); expect([e.jeZelle, e.NGleich]).toEqual([22, 198]);
  });
  it('Satz (3 × 3, Wechselwirkung): Kern de und en', () => {
    const e = { a: 3, b: 3, effekt: 'A×B' as const, f: 0.25, df1: 4, alpha: 0.05, ziel: 0.8, N: 196, jeZelle: 22, NGleich: 198 };
    const t = satzAnovaFaktoren(e, DE); for (const re of [/Wechselwirkung/, /3 × 3 Gruppen/, /f = ,25/, /4 Zähler-Freiheitsgrade/, /N = 196/, /22 je Zelle/, /198/, /wie G\*Power/]) expect(t).toMatch(re);
    const u = satzAnovaFaktoren(e, EN); for (const re of [/interaction/, /3 × 3 groups/, /f = \.25/, /N = 196/, /22 per cell/, /198/]) expect(u).toMatch(re);
  });
});

describe('A.4 Kovariate (Simulation 20 000 Läufe; Rechenweg f_korr = f/√(1 − R²), df2 = N − Zellen − Kovariaten)', () => {
  const An = F.ancova as Z;
  it('2×3-Plan, Haupteffekt B, N 120, R²_Kov ,30: Formel gleich JSON und innerhalb 4 × mc_se der Simulation, mit und ohne Kovariate', () => {
    const m = An.mc as Z; const a = powerAnovaEffekt(m.f_ohne_kovariate, m.N, m.df1, m.zellen).power, b = powerAnovaEffekt(m.f_ohne_kovariate, m.N, m.df1, m.zellen, { kovariaten: 1, r2kov: m.r2_kovariate }).power;
    nah(a, m.ohne.formel, 1e-9, 'ohne'); nah(b, m.mit.formel, 1e-9, 'mit'); expect(Math.abs(a - m.ohne.simuliert)).toBeLessThan(4 * m.mc_se); expect(Math.abs(b - m.mit.simuliert)).toBeLessThan(4 * m.mc_se);
    nah(powerAnovaEffekt(m.f_ohne_kovariate / Math.sqrt(1 - m.r2_kovariate), m.N, m.df1, m.zellen).power, m.mit.formel_df2_ohne_kovariate, 1e-9, 'f_korr mit df2 ohne Kovariate (zum Vergleich)');
  });
  for (const r of An.raster as Z[]) {
    it(`Raster f ${r.f}, ${r.kovariaten} Kovariate(n), R² ${r.r2_kovariate}: N ${r.N}`, () => {
      const e = nAnovaEffekt(r.f, r.df1, r.zellen, { ziel: r.ziel, kovariaten: r.kovariaten, r2kov: r.r2_kovariate })!; expect(e.N).toBe(r.N); nah(e.power, r.power, 1e-9, 'Power'); nah(r.f_korrigiert, r.f / Math.sqrt(1 - r.r2_kovariate), 1e-12, 'f korrigiert');
    });
  }
  it('R² = 0 und keine Kovariate gleich die Varianzanalyse ohne; ein höheres R² braucht weniger Personen', () => {
    expect(nAnovaEffekt(0.25, 2, 6, { r2kov: 0 })!.N).toBe(nAnovaEffekt(0.25, 2, 6)!.N); expect(nAnovaEffekt(0.25, 2, 6, { kovariaten: 1, r2kov: 0.5 })!.N).toBeLessThan(nAnovaEffekt(0.25, 2, 6, { kovariaten: 1, r2kov: 0.2 })!.N);
  });
  it('Satz: Kovariate, die 20 % der Streuung innerhalb der Gruppen erklärt, wirksames f = ,28', () => {
    const e = { f: 0.25, r2kov: 0.2, kovariaten: 1, df1: 2, zellen: 6, alpha: 0.05, ziel: 0.8, N: 127 }; const t = satzAncova(e, DE); for (const re of [/Kovariate/, /20 %/, /innerhalb der Gruppen/, /wirksames f = ,28/, /N = 127/, /wie G\*Power/]) expect(t).toMatch(re);
    const u = satzAncova(e, EN); for (const re of [/covariate/, /20%|20 %/, /effective f = \.28/, /N = 127/]) expect(u).toMatch(re);
  });
});

describe('A.5 Messwiederholung (Faul et al. 2007, Tabelle 3 und Beispiele S. 182-183; Simulation)', () => {
  const M = F.messwiederholung as Z, B = M.beispiel_faul2007 as Z;
  it('Beispiel Abb. 4 (N 90, 3 Gruppen, 3 Messungen, ρ ,3): innerhalb f ,2571934: krit 3,048, df 2/174, Power ,997; Wechselwirkung ,653; zwischen ,488', () => {
    const i = powerMessw(B.f_innerhalb, 90, 3, 3, 0.3, 1, 'innerhalb'); nah(i.power, B.power_innerhalb, 1e-9, 'innerhalb'); nah(i.krit, B.krit_innerhalb, 1e-9, 'krit'); expect([i.df1, i.df2]).toEqual([2, 174]); nah(i.lambda, B.lambda_innerhalb, 1e-9, 'λ');
    expect(Math.round(i.power * 1000) / 1000).toBe(0.997); nah(powerMessw(B.f_wechsel, 90, 3, 3, 0.3, 1, 'wechsel').power, B.power_wechsel, 1e-9, 'Wechselwirkung'); nah(powerMessw(B.f_zwischen, 90, 3, 3, 0.3, 1, 'zwischen').power, B.power_zwischen, 1e-9, 'zwischen');
    expect([B.power_wechsel, B.power_zwischen].map(v => Math.round(v * 1000) / 1000)).toEqual([0.653, 0.488]); expect(Math.round(powerMessw(0.2572, 90, 3, 3, 0.3, 1, 'innerhalb').lambda * 100) / 100).toBe(25.52);
  });
  it('Berti-Beispiel (N 20, 2 Gruppen, 10 Messungen, ρ ,5, f ,25): zwischen ,30, innerhalb ,95, Wechselwirkung ,95', () => {
    expect(Math.round(powerMessw(0.25, 20, 2, 10, 0.5, 1, 'zwischen').power * 100) / 100).toBe(0.3); expect(Math.round(powerMessw(0.25, 20, 2, 10, 0.5, 1, 'innerhalb').power * 100) / 100).toBe(0.95); expect(Math.round(powerMessw(0.25, 20, 2, 10, 0.5, 1, 'wechsel').power * 100) / 100).toBe(0.95);
  });
  it('DIE FALLE: dasselbe f ,2572 gibt in G*Power-Weise N = 36, in WebPower-Weise N = 148 (WebPowers f enthält die Korrelation); Statable rechnet G*Power-Weise', () => {
    const f = M.falle_f_gleich_aber_anders; expect(nMessw(f.f, f.k, f.m, f.rho, 1, 'innerhalb', { ziel: f.power })!.N).toBe(f.N_gpower); expect(f.N_gpower).toBe(36); expect(f.N_webpower_gleiches_f).toBe(148);
    const u = f.m / (1 - f.rho); expect(nMessw(f.f / Math.sqrt(u), f.k, f.m, f.rho, 1, 'innerhalb', { ziel: f.power })!.N, 'WebPower-f = G*Power-f mal √u').toBe(f.N_webpower_gleiches_f);
  });
  it('SPSS-η² → G*Power-f (innerhalb): Probe an Faul 2007: η²p der Bevölkerung ,128 → f_G² = ,0661 = ,2572²', () => { const u = M.spss_umrechnung; nah(fMessAusSpss(u.probe_eta2_pop, 90, 3, 3, 0.3) ** 2, u.probe_fg2, 1e-9, 'f_G²'); nah(Math.sqrt(u.probe_fg2), 0.2572, 5e-4, 'f_G'); });
  for (const r of M.raster as Z[]) {
    it(`Raster ${r.typ}, k ${r.k}, m ${r.m}, ρ ${r.rho}, ε ${r.eps}: N ${r.N}`, () => {
      const e = nMessw(r.f, r.k, r.m, r.rho, r.eps, r.typ, { ziel: r.ziel })!; expect(e.N).toBe(r.N); nah(e.power, r.power, 1e-9, 'Power'); const p = powerMessw(r.f, r.N, r.k, r.m, r.rho, r.eps, r.typ); nah(p.df1, r.df1, 1e-12, 'df1'); nah(p.df2, r.df2, 1e-12, 'df2');
    });
  }
  it('Simulation (sphärisch, 6000 Läufe): zwischen, innerhalb und Wechselwirkung des Faul-Beispiels liegen innerhalb 4 × mc_se_max der Formel', () => {
    const s_ = M.mc.sphaerisch, f = [powerMessw(B.f_zwischen, 90, 3, 3, 0.3, 1, 'zwischen').power, powerMessw(B.f_innerhalb, 90, 3, 3, 0.3, 1, 'innerhalb').power, powerMessw(B.f_wechsel, 90, 3, 3, 0.3, 1, 'wechsel').power];
    f.forEach((v, i) => expect(Math.abs(v - s_.simuliert[i]), `Gruppe ${i}`).toBeLessThan(4 * s_.mc_se_max));
  });
  it('nicht sphärisch ist die Formel eine Näherung und liegt über dem simulierten Greenhouse-Geisser-Test (,723 gegen ,694); der Satz sagt es', () => {
    const n = M.mc.nicht_sphaerisch; expect(n.formel_lambda_mal_eps - n.simuliert_greenhouse_geisser).toBeGreaterThan(4 * n.mc_se_max); expect(n.formel_lambda_mal_eps - n.simuliert_greenhouse_geisser).toBeLessThan(0.05);
    const t = satzMessw({ typ: 'innerhalb', k: 1, m: 3, f: 0.25, rho: 0.5, eps: 0.75, alpha: 0.05, ziel: 0.8, N: 34 }, DE); expect(t).toMatch(/Näherung/); expect(t).toMatch(/optimistisch/);
  });
  it('ρ-Grenze und Fehler: ρ < −1/(m − 1) gesperrt; ε unter 1/(m − 1) gesperrt; Messwiederholung braucht mindestens 2 Messungen', () => {
    expect(planPruefungF2({ art: 'messw', m: 3, rho: -0.6, eps: 1, k: 1 }).fehler).toBe('rho'); expect(planPruefungF2({ art: 'messw', m: 3, rho: -0.5, eps: 1, k: 1 }).fehler).toBeNull(); expect(planPruefungF2({ art: 'messw', m: 3, rho: 1, eps: 1, k: 1 }).fehler).toBe('rho');
    expect(planPruefungF2({ art: 'messw', m: 3, rho: 0.5, eps: 0.4, k: 1 }).fehler).toBe('eps'); expect(planPruefungF2({ art: 'messw', m: 1, rho: 0.5, eps: 1, k: 1 }).fehler).toBe('m'); expect(planPruefungF2({ art: 'messw', m: 3, rho: 0.5, eps: 0.75, k: 1 }).hinweise).toContain('epsilon-naeherung');
  });
  it('Sätze: innerhalb (eine Gruppe, 3 Messungen, f ,25, r ,50, ε 1): Kern de und en, Pflichtsatz „f wie in G*Power, nicht wie in SPSS oder WebPower“', () => {
    const e = { typ: 'innerhalb' as const, k: 1, m: 3, f: 0.25, rho: 0.5, eps: 1, alpha: 0.05, ziel: 0.8, N: 28 };
    const t = satzMessw(e, DE); for (const re of [/Messzeitpunkte/, /3 Messungen/, /f = ,25/, /Korrelation zwischen den Messungen r = ,50/, /ε = 1/, /N = 28/, /nicht wie in SPSS/, /WebPower/]) expect(t).toMatch(re); expect(t).not.toMatch(/Näherung/);
    const u = satzMessw(e, EN); for (const re of [/repeated measures/, /3 measurements/, /f = \.25/, /N = 28/, /not as in SPSS/]) expect(u).toMatch(re);
  });
});

describe('Eingaben prüfen (planPruefungF2) und Sonderfälle', () => {
  it('R²-Zuwachs: R²alt ≥ R²voll, q > m, q = 0, N ≤ m + 1 sind Fehler; sonst keiner, immer der Hinweis „zufall“', () => {
    expect(planPruefungF2({ art: 'r2zuwachs', r2voll: 0.25, r2alt: 0.3, q: 1, m: 3 }).fehler).toBe('r2'); expect(planPruefungF2({ art: 'r2zuwachs', r2voll: 1, r2alt: 0.3, q: 1, m: 3 }).fehler).toBe('r2'); expect(planPruefungF2({ art: 'r2zuwachs', r2voll: 0.3, r2alt: 0.25, q: 4, m: 3 }).fehler).toBe('q');
    expect(planPruefungF2({ art: 'r2zuwachs', r2voll: 0.3, r2alt: 0.25, q: 0, m: 3 }).fehler).toBe('q'); expect(planPruefungF2({ art: 'r2zuwachs', r2voll: 0.3, r2alt: 0.25, q: 1.5, m: 3 }).fehler).toBe('q'); expect(planPruefungF2({ art: 'r2zuwachs', r2voll: 0.3, r2alt: 0.25, q: 1, m: 3, N: 4 }).fehler).toBe('n');
    const ok = planPruefungF2({ art: 'r2zuwachs', r2voll: 0.3, r2alt: 0.25, q: 1, m: 3, N: 60 }); expect(ok.fehler).toBeNull(); expect(ok.hinweise).toContain('zufall');
  });
  it('partielle Korrelation: |ρp| = 1 oder 0, negatives oder nicht ganzes k, N − k < 4', () => {
    expect(planPruefungF2({ art: 'partiell', rp: 1, k: 1 }).fehler).toBe('rp'); expect(planPruefungF2({ art: 'partiell', rp: 0, k: 1 }).fehler).toBe('rp'); expect(planPruefungF2({ art: 'partiell', rp: 0.3, k: -1 }).fehler).toBe('k'); expect(planPruefungF2({ art: 'partiell', rp: 0.3, k: 2, N: 5 }).fehler).toBe('n'); expect(planPruefungF2({ art: 'partiell', rp: -0.3, k: 2, N: 60 }).fehler).toBeNull();
  });
  it('anovaplus: Zellen, df1, R²_Kov, N', () => {
    expect(planPruefungF2({ art: 'anovaplus', zellen: 1, df1: 1 }).fehler).toBe('zellen'); expect(planPruefungF2({ art: 'anovaplus', zellen: 4, df1: 4 }).fehler).toBe('df1'); expect(planPruefungF2({ art: 'anovaplus', zellen: 4, df1: 2, r2kov: 1 }).fehler).toBe('r2kov');
    expect(planPruefungF2({ art: 'anovaplus', zellen: 4, df1: 2, kovariaten: 1, N: 5 }).fehler).toBe('n'); expect(planPruefungF2({ art: 'anovaplus', zellen: 4, df1: 2, kovariaten: 1, r2kov: 0.3, N: 60 }).fehler).toBeNull();
  });
  it('N über 500 000 gibt null (Meldung der Seite), nicht eine Endlosschleife', () => { expect(nAnovaEffekt(0.0001, 1, 2)).toBeNull(); expect(nMessw(1e-6, 1, 3, 0.5, 1, 'innerhalb')).toBeNull(); expect(nPartiell(1e-6, 2)).toBeNull(); });
});
