import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-d-erwartet.json';
import {
  TESTS, ausfallZuschlag, ereignisseLogRank, hrAusMedianen, hrAusUeberleben, hmVarianz, nAuc, nAucGesamt, nEinAnteil, nZweiAnteile, obuchowskiV, personenLogRank, planPruefung, powerEinAnteilExakt,
  powerZweiAnteile, satzAnteile, satzAuc, satzLogRank
} from './power';
import { s } from './sitzung.svelte';

/* ===== ROTE TESTS Welle S-D, M9: Fallzahlplanung für Anteile, Überleben (Log-Rank) und AUC - Prüfer; der Bauer A ändert Test und JSON nicht =====
 * Soll: scripts/spaeter-d-erwartet.R → testdaten/spaeter-d-erwartet.json (m9). Fachblatt Abschnitt 5 + „Entscheidungen Opus“ 5. Alle Zahlen R (power.prop.test, pwr, pROC::power.roc.test, Aufzählung, Hmisc::cpower, Simulation - im Skript gegengeprüft).
 * Erweiterung von lib/power.ts (reine Funktionen, keine Daten; `power:alle` bleibt unberührt). Neue Einträge in TESTS: 'anteile', 'ueberleben', 'auc' (die Oberfläche in seiten/Planen.svelte ist nicht Teil dieses Tests). API:
 *
 *   nZweiAnteile(p1, p2, o?: { alpha = .05; power = .8; seiten: 1 | 2 = 2; k = 1 /* n2 / n1 *\/; verfahren: 'gepoolt' | 'korrigiert' | 'ungepoolt' | 'h' | 'fisher' = 'gepoolt' }):
 *        { exakt: number | null /* Formelwert vor dem Aufrunden, bei 'fisher' null *\/; n1: number; n2: number; gesamt: number; erreicht: number | null; erstes?: number /* nur fisher *\/ }
 *        gepoolt = Fleiss/power.prop.test · korrigiert = Fleiss-Tytun-Ury (Stetigkeitskorrektur) · ungepoolt · h = Cohens h (wie pwr.2p.test) · fisher = Aufzählung aller Tafeln (x1, x2);
 *        n1 = aufgerundet (nie gerundet); n2 = ceil(k · n1)... n2 = k · n1 mit ganzzahligem k·n1 (hier nur k = 1 und k = 2 getestet); gesamt = n1 + n2.
 *        erreicht = Power zur AUFGERUNDETEN Zahl: gepoolt → Pearson-χ², korrigiert → Yates, fisher → Fisher (jeweils Aufzählung), ungepoolt und h: null.
 *        fisher: `erstes` = kleinstes n1 mit Power ≥ Ziel, `n1` = DAUERHAFTES n (Sägezahn: kleinstes n, ab dem die Power in den folgenden 30 Schritten nicht mehr unter das Ziel fällt); n bis 400, darüber Fehler.
 *   powerZweiAnteile(p1, p2, n1, n2, o: { alpha?: .05; seiten?: 1 | 2; test: 'pearson' | 'yates' | 'fisher' }): number        Aufzählung aller Tafeln; Pearson/Yates nur Tafeln mit zwei von null verschiedenen Spaltensummen; Fisher zweiseitig = R fisher.test (p ≤ alpha,
 *        Tafeln mit p ≤ den beobachteten · (1 + 1e-7)); einseitig: gleiche Richtung wie p1 < p2
 *   nEinAnteil(p0, p1, o?: { alpha?; power?; seiten?; verfahren: 'normal' | 'h' | 'exakt' = 'normal' }): { exakt: number | null; n: number; erstes?: number }
 *        normal: [z1·√(p0q0) + z2·√(p1q1)]² / (p1 − p0)² · h: ((z1 + z2)/h)², h = 2·asin√p1 − 2·asin√p0 · exakt: Binomialtest wie R binom.test (Minimum-Likelihood); n = DAUERHAFTES n (wie oben, 30 Schritte), erstes = kleinstes n mit Power ≥ Ziel
 *   powerEinAnteilExakt(p0, p1, n, alpha = .05): number
 *   ereignisseLogRank(hr, o?: { alpha?; power?; seiten?; k = 1 /* n_B / n_K *\/; formel: 'schoenfeld' | 'freedman' = 'schoenfeld' }): { exakt: number; d: number /* aufgerundet *\/ }
 *        Schoenfeld: (z1 + z2)² / (πK·πB·ln²HR) · Freedman: (z1 + z2)²(1 + k·HR)² / (k·(1 − HR)²)
 *   personenLogRank(d: number, sK: number, hr: number, k = 1): { sB: number; P: number; N: number; nExakt: number }        S_B = S_K^HR; P = 1 − (πK·S_K + πB·S_B); N = ceil(d / P)
 *   hrAusMedianen(medianK, medianB) = medianK / medianB (exponentiell) · hrAusUeberleben(sK, sB) = ln sB / ln sK
 *   hmVarianz(A, nA, nN): number        Hanley-McNeil: Var(A) = [A(1−A) + (nA−1)(Q1−A²) + (nN−1)(Q2−A²)] / (nA·nN), Q1 = A/(2−A), Q2 = 2A²/(1+A)
 *   obuchowskiV(A, R): number           Var(A)·nA = 0,0099·e^(−a²/2)·[(5a²+8) + (a²+8)/R], a = Φ⁻¹(A)·1,414
 *   nAuc(auc1, o?: { auc0 = .5; alpha?; power?; R = 1 /* Kontrollen je Fall *\/; verfahren: 'hm' | 'obuchowski' = 'hm' }): { nA: number; nN: number /* exakt *\/; nCases: number; nControls: number /* aufgerundet *\/ }
 *   nAucGesamt(auc1, praevalenz, o?): { R: number; nCases: number; nControls: number; N: number }     R = (1 − π)/π; N = ceil(nA_exakt / π)
 *   ausfallZuschlag(n, ausfall): number = ceil(n / (1 − ausfall))
 *   planPruefung(p): { fehler: null | 'gleich' | 'rand' | 'hr' | 'auc'; hinweise: ('normalnaeherung' | 'gross' | 'sehr-gross' | 'auc-klein')[] }
 *        { art: 'anteile'; p1; p2; n?; alpha?; power? } · { art: 'ueberleben'; hr } · { art: 'auc'; auc1; auc0?; nCases? } · optional `gesamt` (Personen) für 'sehr-gross' (> 1 000 000)
 *   satzAnteile(p1, p2, o, f: Fmt), satzLogRank(hr, sK, o, f), satzAuc(auc1, o, f): string        Fachblatt 5.6; `Fmt` wie in power.ts
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const E = (erwartet as any).m9;
const nah = (ist: number, soll: number, tol = 1e-9) => expect(Math.abs(ist - soll), `${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const F = { en: false, punkt: false };

describe('Neue Einträge in TESTS', () => { it('anteile, ueberleben, auc', () => { for (const t of ['anteile', 'ueberleben', 'auc']) expect(TESTS as string[]).toContain(t); }); });

describe('Zwei Anteile: Beispiel p1 = ,30 gegen p2 = ,50, α = ,05 zweiseitig, Power ,80', () => {
  const B = E.anteile.beispiel;
  for (const [v, f] of [['gepoolt', 'a'], ['korrigiert', 'b'], ['ungepoolt', 'c'], ['h', 'd']] as const) it(`${v}: ${B.formeln[f].exakt.toFixed(4)} → ${B.formeln[f].n} je Gruppe`, () => {
    const r = nZweiAnteile(0.3, 0.5, { verfahren: v }); nah(r.exakt!, B.formeln[f].exakt, 1e-9); expect(r.n1).toBe(B.formeln[f].n); expect(r.n2).toBe(B.formeln[f].n); expect(r.gesamt).toBe(2 * B.formeln[f].n);
  });
  it('Fachblatt: 92,9988 / 97,9350 / 90,2621 / 92,6963 und 93 / 98 / 91 / 93', () => {
    const w = (v: any) => nZweiAnteile(0.3, 0.5, { verfahren: v });
    nah(w('gepoolt').exakt!, 92.9988, 1e-5); nah(w('korrigiert').exakt!, 97.935, 1e-5); nah(w('ungepoolt').exakt!, 90.2621, 1e-5); nah(w('h').exakt!, 92.6963, 1e-5);
    expect([w('gepoolt').n1, w('korrigiert').n1, w('ungepoolt').n1, w('h').n1]).toEqual([93, 98, 91, 93]);
  });
  it('erreichte Power zur aufgerundeten Zahl: gepoolt (Pearson) ,7991, korrigiert (Yates) ,7790 - also unter 80 %, das muss die Seite zeigen', () => {
    nah(nZweiAnteile(0.3, 0.5, { verfahren: 'gepoolt' }).erreicht!, B.formeln.a.power.pearson, 1e-9); nah(nZweiAnteile(0.3, 0.5, { verfahren: 'korrigiert' }).erreicht!, B.formeln.b.power.yates, 1e-9);
    expect(nZweiAnteile(0.3, 0.5, { verfahren: 'ungepoolt' }).erreicht).toBeNull(); expect(nZweiAnteile(0.3, 0.5, { verfahren: 'h' }).erreicht).toBeNull();
  });
  it('Power durch Aufzählung (Pearson / Yates / Fisher) zu n = 93 und 98: wer mit 93 plant und mit Yates oder Fisher rechnet, hat nur 75 %', () => {
    for (const [f, n] of [['a', 93], ['b', 98]] as const) for (const t of ['pearson', 'yates', 'fisher'] as const) nah(powerZweiAnteile(0.3, 0.5, n, n, { test: t }), B.formeln[f].power[t], 1e-9);
    expect(powerZweiAnteile(0.3, 0.5, 93, 93, { test: 'fisher' })).toBeLessThan(0.76);
  });
  it('Fisher exakt: kleinstes n mit Power ≥ ,80 ist 102 (Power bei 101 ,7994, bei 102 ,8061); Power-Verlauf n = 60 bis 130 gleich R', () => {
    const r = nZweiAnteile(0.3, 0.5, { verfahren: 'fisher' }); expect(r.n1).toBe(B.fisher.dauerhaft); expect(r.erstes).toBe(B.fisher.erstes); expect(r.n1).toBe(102); expect(r.n2).toBe(102); expect(r.gesamt).toBe(204); expect(r.exakt).toBeNull();
    nah(r.erreicht!, B.fisher.power[102 - B.fisher.n_von], 1e-9);
    for (const n of [60, 80, 93, 98, 101, 102, 103, 110, 130]) nah(powerZweiAnteile(0.3, 0.5, n, n, { test: 'fisher' }), B.fisher.power[n - B.fisher.n_von], 1e-9);
  });
  it('ungleiche Gruppen 1 : 2: n1 = 70,2776 → 71, n2 = 142, gesamt 213', () => {
    const r = nZweiAnteile(0.3, 0.5, { k: 2 }); nah(r.exakt!, B.ungleich_1_2.n1_exakt, 1e-9); expect([r.n1, r.n2, r.gesamt]).toEqual([71, 142, 213]);
  });
  it('einseitig α = ,05: 73,14 → 74', () => { const r = nZweiAnteile(0.3, 0.5, { seiten: 1 }); nah(r.exakt!, B.einseitig.exakt, 1e-9); expect(r.n1).toBe(74); });
  it('Ausfallzuschlag n/(1 − Ausfall), aufgerundet: 93 bei 10 % → 104, bei 20 % → 117, bei 0 % → 93', () => {
    expect([ausfallZuschlag(93, 0.1), ausfallZuschlag(93, 0.2), ausfallZuschlag(93, 0)]).toEqual([B.ausfall.a10, B.ausfall.a20, B.ausfall.a0]); expect(B.ausfall.a10).toBe(104);
  });
  it('Cohen 1988, Tabelle 6.4.1 (h = ,2 / ,5 / ,8): 392,44 → 393, 62,79 → 63, 24,53 → 25 (die Tabelle rundet bei ,2 auf 392)', () => {
    const c = E.anteile.cohen;   // Anteile mit dem gewünschten h: p2 = sin²(asin √p1 + h/2)
    c.h.forEach((h: number, i: number) => { const p2 = Math.sin(Math.asin(Math.sqrt(0.3)) + h / 2) ** 2, r = nZweiAnteile(0.3, p2, { verfahren: 'h' }); nah(r.exakt!, c.n_exakt[i], 1e-7); expect(r.n1).toBe(c.n[i]); });
    expect(c.n).toEqual([393, 63, 25]);
  });
  it('seltene Ereignisse p1 = ,05, p2 = ,15: 140,095 → 141 · 149,928 → 150 · 137,355 → 138 · 132,368 → 133 · Fisher 151 (Power bei 141 ,7652, bei 150 ,7973)', () => {
    const S = E.anteile.selten, w = (v: any) => nZweiAnteile(0.05, 0.15, { verfahren: v });
    nah(w('gepoolt').exakt!, S.a, 1e-9); nah(w('korrigiert').exakt!, S.b, 1e-9); nah(w('ungepoolt').exakt!, S.c, 1e-9); nah(w('h').exakt!, S.d, 1e-9);
    expect([w('gepoolt').n1, w('korrigiert').n1, w('ungepoolt').n1, w('h').n1]).toEqual([141, 150, 138, 133]);
    const f = w('fisher'); expect(f.erstes).toBe(S.fisher.erstes); expect(f.erstes).toBe(151); expect(f.n1).toBeGreaterThanOrEqual(151);
    nah(powerZweiAnteile(0.05, 0.15, 141, 141, { test: 'fisher' }), S.fisher.power141, 1e-9); nah(powerZweiAnteile(0.05, 0.15, 150, 150, { test: 'fisher' }), S.fisher.power150, 1e-9);
  }, 120000);
  it('kleine n (p1 = ,10 gegen ,50): Fisher gleich der Aufzählung in R, dauerhaftes n beachtet den Sägezahn', () => {
    const K = E.anteile.fisher_klein, r = nZweiAnteile(0.1, 0.5, { verfahren: 'fisher' }); expect(r.erstes).toBe(K.erstes); expect(r.n1).toBe(K.dauerhaft);
    for (const n of [8, 12, 16, 20, 30]) nah(powerZweiAnteile(0.1, 0.5, n, n, { test: 'fisher' }), K.power[n - K.n_von], 1e-9);
  });
});

describe('Ein Anteil: p0 = ,20 gegen p1 = ,35, α = ,05 zweiseitig, Power ,80', () => {
  const A = E.ein_anteil;
  it('Normalnäherung 62,4535 → 63; Cohens h (,33881) 68,3753 → 69', () => {
    const a = nEinAnteil(0.2, 0.35, { verfahren: 'normal' }), h = nEinAnteil(0.2, 0.35, { verfahren: 'h' }); nah(a.exakt!, A.normal, 1e-9); expect(a.n).toBe(63); nah(h.exakt!, A.h, 1e-9); expect(h.n).toBe(69);
    nah(a.exakt!, 62.4535, 1e-6); nah(h.exakt!, 68.3753, 1e-5);
  });
  it('exakt (Binomialtest wie R binom.test): erstes n mit Power ≥ ,80 ist 66, DAUERHAFT ab 72 (Sägezahn: 68 ,7981; 70 ,7721; 71 ,7966)', () => {
    const r = nEinAnteil(0.2, 0.35, { verfahren: 'exakt' }); expect(r.erstes).toBe(66); expect(r.n).toBe(72); expect(r.exakt).toBeNull(); expect([A.exakt_erstes, A.exakt_dauerhaft]).toEqual([66, 72]);
  });
  it('Power des exakten Tests für n = 30 bis 90 gleich R (1e-9)', () => { for (let n = 30; n <= 90; n++) nah(powerEinAnteilExakt(0.2, 0.35, n), A.exakt_power[n - A.n_von], 1e-9); });
  it('einseitig (Normalnäherung)', () => { nah(nEinAnteil(0.2, 0.35, { verfahren: 'normal', seiten: 1 }).exakt!, A.einseitig_normal, 1e-9); });
});

describe('Log-Rank-Test: Ereignisse (Schoenfeld, Freedman), dann Personen', () => {
  const Lr = E.logrank;
  Lr.hr.forEach((hr: number, i: number) => it(`HR = ${hr}: Schoenfeld ${Lr.schoenfeld_ceil[i]} · Freedman ${Lr.freedman_ceil[i]} Ereignisse`, () => {
    const a = ereignisseLogRank(hr), b = ereignisseLogRank(hr, { formel: 'freedman' }); nah(a.exakt, Lr.schoenfeld[i], 1e-9); nah(b.exakt, Lr.freedman[i], 1e-9); expect(a.d).toBe(Lr.schoenfeld_ceil[i]); expect(b.d).toBe(Lr.freedman_ceil[i]);
  }));
  it('Fachblatt: HR = ,5 → 65,35 → 66 (Schoenfeld) und 70,64 → 71 (Freedman)', () => {
    nah(ereignisseLogRank(0.5).exakt, 65.35, 1e-4); nah(ereignisseLogRank(0.5, { formel: 'freedman' }).exakt, 70.64, 1e-4); expect(ereignisseLogRank(0.5).d).toBe(66);
  });
  it('Zuteilung 2 : 1 (Schoenfeld) 73,51; Freedman allgemein für k = 2 (Machin)', () => {
    nah(ereignisseLogRank(0.5, { k: 2 }).exakt, Lr.k2_schoenfeld, 1e-9); nah(ereignisseLogRank(0.5, { k: 2 }).exakt, 73.51, 1e-4); nah(ereignisseLogRank(0.5, { k: 2, formel: 'freedman' }).exakt, Lr.k2_freedman, 1e-9);
  });
  it('Personen: Überlebensanteil im Kontrollarm .60 nach einem Jahr, HR = ,5, 66 Ereignisse → S_B = ,7746, P = ,3127, N = 212 (Freedman, 71 Ereignisse: 228)', () => {
    const p = personenLogRank(66, 0.6, 0.5); nah(p.sB, Lr.personen.sB, 1e-12); nah(p.P, Lr.personen.P, 1e-12); nah(p.nExakt, Lr.personen.N_exakt, 1e-9); expect(p.N).toBe(212);
    expect(personenLogRank(71, 0.6, 0.5).N).toBe(228); expect(personenLogRank(Lr.personen_freedman.d, 0.6, 0.5).N).toBe(Lr.personen_freedman.N);
  });
  it('2 : 1 (Behandlung : Kontrolle), HR = ,7, S_K = ,5', () => {
    const q = Lr.personen2, p = personenLogRank(q.d, q.sK, q.hr, q.k); nah(p.sB, q.sB, 1e-12); nah(p.P, q.P, 1e-12); expect(p.N).toBe(q.N); expect(ereignisseLogRank(0.7, { k: 2 }).d).toBe(q.d);
  });
  it('über zwei Mediane (12 gegen 24 Monate → HR ,5) und über zwei Überlebensanteile (,60 gegen ,7746 → HR ,5)', () => {
    nah(hrAusMedianen(12, 24), Lr.median.hr, 1e-12); nah(hrAusMedianen(12, 24), 0.5, 1e-12); nah(hrAusUeberleben(0.6, 0.6 ** 0.5), 0.5, 1e-12); nah(hrAusUeberleben(0.6, 0.7746), Lr.ueberleben.hr, 1e-12);
  });
  it('die Zahl der EREIGNISSE ist die Größe: Simulation (exponentiell, survdiff) bestätigt Schoenfeld ,79 / Freedman ,83 bei N = 212 / 228', () => { expect(Lr.sim.N212).toBeGreaterThan(0.76); expect(Lr.sim.N228).toBeGreaterThan(0.8); });
});

describe('AUC: Hanley-McNeil (Voreinstellung) und Obuchowski', () => {
  const A = E.auc;
  for (const t of A.tabelle) it(`AUC ,${Math.round(t.auc1 * 100)} gegen ,5 (R = 1): Hanley-McNeil ${t.hm.toFixed(2)} → ${t.hm_n}, Obuchowski ${t.ob.toFixed(2)} → ${t.ob_n}`, () => {
    const h = nAuc(t.auc1), o = nAuc(t.auc1, { verfahren: 'obuchowski' }); nah(h.nA, t.hm, 1e-6); nah(o.nA, t.ob, 1e-6); expect(h.nCases).toBe(t.hm_n); expect(o.nCases).toBe(t.ob_n); expect(h.nControls).toBe(t.hm_n); expect(h.nA).toBeCloseTo(h.nN, 9);
  });
  it('Obuchowski = pROC::power.roc.test (12,74362 bei AUC ,80) auf 6 Stellen; R = 2: 9,76 Fälle und 19,51 Kontrollen', () => {
    nah(nAuc(0.8, { verfahren: 'obuchowski' }).nA, A.pROC_n_auc80, 1e-6); nah(nAuc(0.8, { verfahren: 'obuchowski' }).nA, 12.74362, 1e-6);
    const o = nAuc(0.8, { verfahren: 'obuchowski', R: 2 }), r = A.r2; nah(o.nA, r.pROC_ncases, 1e-6); nah(o.nN, r.pROC_ncontrols, 1e-6); nah(o.nA, r.ob_nA, 1e-9); const h = nAuc(0.8, { R: 2 }); nah(h.nA, r.hm_nA, 1e-9); nah(h.nN, r.hm_nN, 1e-9);
  });
  it('Standardfehler: Hanley-McNeil bei A = ,8, nA = 20, nN = 30 und die Nullvarianz (nA + nN + 1)/(12·nA·nN) bei A = ,5', () => {
    nah(hmVarianz(A.se_funktion.auc, A.se_funktion.nA, A.se_funktion.nN), A.se_funktion.se2, 1e-12); nah(hmVarianz(0.5, 30, 20), A.null_varianz.wert, 1e-14); nah(obuchowskiV(0.8, 1.5), A.se_funktion.ob_v, 1e-12);
    nah(Math.sqrt(hmVarianz(0.8, 50, 50)), A.se.hm, 1e-12); nah(Math.sqrt(obuchowskiV(0.8, 1) / 50), A.se.ob, 1e-12); expect(A.se.simuliert).toBeGreaterThan(0.042); expect(A.se.simuliert).toBeLessThan(0.0455);
  });
  it('über die Häufigkeit (Anteil Kranke ,20 → R = 4): Fälle, Kontrollen und Gesamtzahl N = nA / π, aufgerundet', () => {
    const H = A.haeufigkeit, h = nAucGesamt(0.8, 0.2), o = nAucGesamt(0.8, 0.2, { verfahren: 'obuchowski' }); nah(h.R, 4, 1e-12);
    expect([h.nCases, h.nControls, h.N]).toEqual([H.hm_cases, H.hm_controls, H.hm_N]); expect([o.nCases, o.nControls, o.N]).toEqual([H.ob_cases, H.ob_controls, H.ob_N]);
  });
  it('AUC₀ ≠ ,5 (z. B. ,70 gegen ,60) ist erlaubt; nie NaN', () => { const r = nAuc(0.7, { auc0: 0.6 }); expect(Number.isFinite(r.nA) && r.nA > 0).toBe(true); expect(r.nA).toBeGreaterThan(nAuc(0.7).nA); });
});

describe('Eingaben am Rand: Fehlercode, Hinweise, nie NaN', () => {
  it('Anteile: gleich → gleich; 0 oder 1 oder außerhalb → rand; Normalnäherung unsicher bei n·p < 5; sehr große Zahlen', () => {
    expect(planPruefung({ art: 'anteile', p1: 0.3, p2: 0.3 }).fehler).toBe('gleich'); expect(planPruefung({ art: 'anteile', p1: 0, p2: 0.3 }).fehler).toBe('rand'); expect(planPruefung({ art: 'anteile', p1: 0.3, p2: 1 }).fehler).toBe('rand'); expect(planPruefung({ art: 'anteile', p1: -0.1, p2: 0.3 }).fehler).toBe('rand');
    expect(planPruefung({ art: 'anteile', p1: 0.3, p2: 0.5 }).fehler).toBeNull(); expect(planPruefung({ art: 'anteile', p1: 0.02, p2: 0.04, n: 100 }).hinweise).toContain('normalnaeherung'); expect(planPruefung({ art: 'anteile', p1: 0.3, p2: 0.5, n: 93 }).hinweise).not.toContain('normalnaeherung');
    expect(planPruefung({ art: 'anteile', p1: 0.3, p2: 0.5, power: 0.99 }).hinweise).toContain('gross'); expect(planPruefung({ art: 'anteile', p1: 0.3, p2: 0.5, alpha: 0.001 }).hinweise).toContain('gross');
    expect(planPruefung({ art: 'anteile', p1: 0.3, p2: 0.5, gesamt: 2_000_000 } as any).hinweise).toContain('sehr-gross');
  });
  it('Überleben: HR = 1 oder ≤ 0 → hr; AUC: AUC₁ ≤ AUC₀ oder AUC₀ < ,5 → auc, wenig Fälle (n_A < 10) → auc-klein', () => {
    expect(planPruefung({ art: 'ueberleben', hr: 1 }).fehler).toBe('hr'); expect(planPruefung({ art: 'ueberleben', hr: 0 }).fehler).toBe('hr'); expect(planPruefung({ art: 'ueberleben', hr: -0.5 }).fehler).toBe('hr'); expect(planPruefung({ art: 'ueberleben', hr: 0.5 }).fehler).toBeNull();
    expect(planPruefung({ art: 'auc', auc1: 0.5 }).fehler).toBe('auc'); expect(planPruefung({ art: 'auc', auc1: 0.4 }).fehler).toBe('auc'); expect(planPruefung({ art: 'auc', auc1: 0.7, auc0: 0.45 }).fehler).toBe('auc'); expect(planPruefung({ art: 'auc', auc1: 0.7, auc0: 0.7 }).fehler).toBe('auc');
    expect(planPruefung({ art: 'auc', auc1: 0.8 }).fehler).toBeNull(); expect(planPruefung({ art: 'auc', auc1: 0.95, nCases: 6 }).hinweise).toContain('auc-klein'); expect(planPruefung({ art: 'auc', auc1: 0.8, nCases: 40 }).hinweise).not.toContain('auc-klein');
  });
  it('Rechenfunktionen liefern bei gültigen, aber extremen Eingaben endliche Zahlen (Power ,999, α = ,001, HR = ,99)', () => {
    expect(Number.isFinite(nZweiAnteile(0.3, 0.5, { power: 0.999, alpha: 0.001 }).n1)).toBe(true); expect(Number.isFinite(ereignisseLogRank(0.99).d)).toBe(true); expect(ereignisseLogRank(0.99).d).toBeGreaterThan(10000); expect(Number.isFinite(nAuc(0.51).nA)).toBe(true);
  });
});

describe('Sätze (Fachblatt 5.6): ganze Sätze mit den Annahmen', () => {
  it('Anteile: Test, α, Power, Personen je Gruppe und insgesamt, dazu die Zahl für Fisher', () => {
    const t = satzAnteile(0.3, 0.5, { alpha: 0.05, power: 0.8, seiten: 2 }, F);
    expect(t).toContain(',30'); expect(t).toContain(',50'); expect(t).toContain('93 Personen je Gruppe'); expect(t).toContain('186 insgesamt'); expect(t).toMatch(/Fisher.*102 je Gruppe/); expect(t).toMatch(/80\s%/); expect(t).not.toMatch(/NaN|undefined/);
  });
  it('Log-Rank: Ereignisse (Schoenfeld, nach Freedman), Personen, Annahme proportionale Hazards', () => {
    const t = satzLogRank(0.5, 0.6, { alpha: 0.05, power: 0.8, seiten: 2 }, F);
    expect(t).toContain('66 Ereignisse'); expect(t).toMatch(/Freedman.*71/); expect(t).toContain('212 Personen'); expect(t).toMatch(/proportional/i); expect(t).toContain(',50'); expect(t).not.toMatch(/NaN|undefined/);
  });
  it('AUC: Personen mit und ohne den Zustand (Hanley-McNeil), nach Obuchowski eine weniger', () => {
    const t = satzAuc(0.8, { alpha: 0.05, power: 0.8 }, F); expect(t).toContain('14 Personen mit'); expect(t).toContain('14 ohne'); expect(t).toContain('Hanley-McNeil'); expect(t).toMatch(/Obuchowski.*13/); expect(t).not.toMatch(/NaN|undefined/);
  });
});
