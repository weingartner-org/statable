import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-b-erwartet.json';
import { jonckheereTerpstra, ksZwei, mediantest, rangWeitereText, vorzeichenTest, type RangWeitereHinweis } from './rangweitere';
import { s } from './sitzung.svelte';

/* ===== Welle S-B, Teil 3: vier weitere Rangtests - Vorzeichentest, Mediantest, Jonckheere-Terpstra, Kolmogorov-Smirnov (zwei Stichproben); Fachblatt Abschnitt 3, „Entscheidungen Opus“, „Belege IBM“ =====
 * Sollwerte: scripts/spaeter-b-erwartet.R → testdaten/spaeter-b-erwartet.json (Abschnitt rang): eigene Aufzählung aller Aufteilungen (R), R-Funktionen (binom.test, fisher.test, ks.test), PSPP-Engine (Vorzeichen, Median),
 * IBM-Handbuch (gedruckt: AZT-Vorzeichentest). Alle vier Tests laufen als JavaScript (PSPP rechnet Jonckheere-Terpstra bei Bindungen falsch, Mediantest nur asymptotisch, K-S zwei Stichproben gar nicht). Der Bauer ändert Test und JSON nicht.
 * Das Modul `lib/rangweitere.ts` (reine Funktionen, keine Oberfläche) hat diese API - sie ist hier festgelegt:
 *
 *   vorzeichenTest(paare: [number, number][]): { plus: number; minus: number; nullen: number; n: number; pZwei: number | null; pEin: number | null; pPunkt: number | null; grund: null | 'keinUnterschied' | 'einPaar' }
 *       paare = [vorher, nachher]; Differenz = nachher − vorher; Nullen entfallen; n = plus + minus; exakt Binomial (½): pEin = P(X ≤ min(plus, minus)), pZwei = min(1, 2·pEin) (bei plus = minus also 1), pPunkt = P(X = min);
 *       n = 0: grund 'keinUnterschied', alle p null; n = 1: grund 'einPaar' (p = 1, trotzdem). Für alle n exakt (Entscheidung Opus; auch n = 1000 ohne Überlauf).
 *   mediantest(gruppen: { name: string; werte: number[] }[]): {
 *       n: number; median: number; gruppen: number /* nichtleere *\/; ueber: number[]; bis: number[] /* je nichtleerer Gruppe: Zahl > M und ≤ M (Gleichstand zählt zu „≤“, wie SPSS) *\/;
 *       aufMedian: number; anteilAufMedian: number; chi2: number | null; df: number | null; p: number | null /* Pearson ohne Korrektur, df = k − 1 *\/;
 *       fisherP: number | null /* nur bei genau 2 Gruppen, zweiseitig wie R fisher.test, IMMER (Entscheidung Opus) *\/; yates: { chi2: number; p: number } | null /* nur bei 2 Gruppen: IBM-Formel immer mit N/2 *\/;
 *       ibmRegel: 'fisher' | 'yates' | null /* was SPSS bei 2 Gruppen zeigt: N ≤ 30 Fisher, sonst Yates *\/; hinweise: ('viel-auf-median' | 'erwartet-klein')[]; grund: null | 'zu-wenig-gruppen' | 'alle-gleich' | 'nichts-ueber-median' }
 *       Median = üblicher Median aller Werte (gewichtsfrei); leere Gruppen fallen weg; bei k ≥ 3 KEIN Fisher-Freeman-Halton (fisherP null). 'viel-auf-median' ab 20 % Werte genau auf dem Median; 'erwartet-klein' bei erwartet < 5 in mehr als 20 % der Zellen.
 *       grund: weniger als 2 nichtleere Gruppen; alle Werte gleich; keine Werte über dem Median (dann ist χ² nicht definiert): chi2, df, p, fisherP, yates, ibmRegel null.
 *   jonckheereTerpstra(gruppen: number[][], opt?: { exaktMax?: number /* 2 000 000 *\/ }): {
 *       n: number; gruppen: number; jt: number /* Σ_{i<j} (#{a < b} + ½ #{a = b}) *\/; mittel: number; varianz: number /* mit Bindungskorrektur (IBM Gl. nach 8.39) *\/; sd: number; z: number; aufteilungen: number /* N!/Πn_i! *\/;
 *       modus: 'exakt' | 'asymptotisch' /* exakt, wenn aufteilungen ≤ exaktMax *\/;
 *       asymptotisch: { zwei: number; steigt: number; faellt: number }; exakt: { zwei: number; steigt: number; faellt: number } | null;
 *       p: { zwei; steigt; faellt } /* die des Modus *\/; grund: null | 'zu-wenig-gruppen' | 'zu-wenig-werte' | 'alle-gleich' }
 *       Reihenfolge der Gruppen = Reihenfolge im Argument (Ergebnis hängt davon ab; Umkehrung = umgekehrtes Array); leere Gruppen fallen weg. Bedingte Permutationsverteilung der Gruppenlabels, Bindungen bleiben.
 *       'steigt' = P(JT ≥ beobachtet), 'faellt' = P(JT ≤ beobachtet), asymptotisch mit Normalverteilung; zwei: asymptotisch 2·min(Φ, 1 − Φ), exakt nach IBM (Entscheidung Opus „wie SPSS“): P(|JT − E| ≥ |jt − E|), NICHT 2·min.
 *   ksZwei(x: number[], y: number[], opt?: { exaktMaxProdukt?: number /* 10 000 *\/ }): {
 *       n1: number; n2: number; d: number; z: number /* D·√(n1·n2/(n1+n2)) *\/; modus: 'exakt' | 'asymptotisch' /* exakt, wenn n1·n2 ≤ exaktMaxProdukt *\/;
 *       pAsymptotisch: number /* Smirnov-Reihe, SPSS *\/; pExakt: number | null /* bedingt auf die Werte, mit Bindungen, in ganzen Zahlen; nur im Modus exakt *\/; p: number; grund: null | 'zu-wenig-werte' }
 *       Nur zweiseitig (Opus); n1 oder n2 = 0: grund 'zu-wenig-werte', p null.
 *   rangWeitereText(code: RangWeitereHinweis, test?: 'vorzeichen' | 'median' | 'jt' | 'ks'): string     ganze Sätze (de)
 *   RangWeitereHinweis = 'keinUnterschied' | 'einPaar' | 'alle-gleich' | 'nichts-ueber-median' | 'zu-wenig-gruppen' | 'zu-wenig-werte' | 'viel-auf-median' | 'erwartet-klein'
 * Fallgewicht: bei allen vieren gesperrt (siehe gewichte-spaeter-b.test.ts).
 * ABWEICHUNGEN IBM ↔ Fachblatt (im Prüferbericht): Vorzeichentest IBM exakt nur bis n = 25, darüber Normalnäherung (hier: exakt für alle, Opus); Mediantest bei 2 Gruppen IBM Fisher (N ≤ 30) oder Yates (hier: Pearson + Fisher immer, Yates mitgeliefert);
 * J-T zweiseitig IBM = P(|T − E| ≥ …) (hier IBM); K-S asymptotisch: IBM nimmt Reihenglieder bis 3,1 (hier: volle Reihe, Toleranz 1e-6).
 */

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const R = (erwartet as any).rang;
const nah = (ist: number, soll: number, tol = 1e-9, was = '') => expect(Math.abs(ist - soll), `${was} ${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const nahRel = (ist: number, soll: number, tol = 1e-9, was = '') => expect(Math.abs(ist - soll), `${was} ${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.abs(soll) + 1e-300);
const nahListe = (ist: number[], soll: number[], tol = 1e-9) => { expect(ist.length).toBe(soll.length); soll.forEach((x, i) => nah(ist[i]!, x, tol)); };
const paare = (f: any): [number, number][] => (f.vorher as number[]).map((v, i) => [v, f.nachher[i]]);
const hatNaN = (o: unknown): boolean => typeof o === 'number' ? Number.isNaN(o) : o && typeof o === 'object' ? Object.values(o as object).some(hatNaN) : false;

describe('Vorzeichentest (exakt, Nullen entfallen)', () => {
  for (const name of Object.keys(R.vorzeichen)) it(`${name}`, () => {
    const f = R.vorzeichen[name], r = vorzeichenTest(paare(f));
    expect([r.plus, r.minus, r.nullen, r.n]).toEqual([f.plus, f.minus, f.nullen, f.n]);
    if (f.grund === 'keinUnterschied') { expect(r.grund).toBe('keinUnterschied'); expect(r.pZwei).toBeNull(); expect(r.pEin).toBeNull(); expect(r.pPunkt).toBeNull(); return; }
    nahRel(r.pZwei!, f.p_zwei, 1e-9); nahRel(r.pEin!, f.p_ein, 1e-9); nahRel(r.pPunkt!, f.p_punkt, 1e-9); expect(r.grund).toBe(f.grund ?? null); expect(hatNaN(r)).toBe(false);
  });
  it('gedruckt (IBM Exact Tests Abb. 5.4, AZT): 2 negativ, 14 positiv, 4 Gleichstände → exakt 2-seitig ,004, 1-seitig ,002, Punkt ,002', () => {
    const r = vorzeichenTest(paare(R.vorzeichen.azt_ibm)); expect([r.plus, r.minus, r.nullen]).toEqual([14, 2, 4]);
    expect([r.pZwei, r.pEin, r.pPunkt].map(x => Math.round(x! * 1000) / 1000)).toEqual([0.004, 0.002, 0.002]);
  });
  it('k = m: p = 1 (nicht 2 · ½ = 1,246 wie PSPP); Grenze: 5 Paare nur Plus p = ,0625, 6 Paare ,03125', () => {
    nah(vorzeichenTest(paare(R.vorzeichen.gleich_viele)).pZwei!, 1, 1e-12); nah(vorzeichenTest(paare(R.vorzeichen.nur_plus_n5)).pZwei!, 0.0625, 1e-12); nah(vorzeichenTest(paare(R.vorzeichen.nur_plus_n6)).pZwei!, 0.03125, 1e-12);
    expect(R.vorzeichen.gleich_viele.pspp_zwei_bei_k_gleich_m).toBeGreaterThan(1);   // der PSPP-Befund (Prüfer-Bericht)
  });
  it('Nullen werden nicht mitgeteilt: 10 Paare, 4 ohne Unterschied → n = 6', () => { const r = vorzeichenTest(paare(R.vorzeichen.nur_plus_vier_nullen)); expect([r.n, r.nullen]).toEqual([6, 4]); nah(r.pZwei!, 0.03125, 1e-12); });
  it('1000 Paare (540 gegen 460): Binomial ohne Überlauf, wie R binom.test', () => { const r = vorzeichenTest(paare(R.vorzeichen.tausend)); nahRel(r.pZwei!, R.vorzeichen.tausend.p_zwei, 1e-9); expect(r.pZwei!).toBeGreaterThan(0.005); expect(r.pZwei!).toBeLessThan(0.02); });
  it('n = 1: p = 1 mit Grund einPaar; n = 0: Grund keinUnterschied, nie NaN', () => {
    const a = vorzeichenTest([[1, 2]]); nah(a.pZwei!, 1, 1e-12); expect(a.grund).toBe('einPaar'); const b = vorzeichenTest([[1, 1], [2, 2]]); expect(b.grund).toBe('keinUnterschied'); expect(b.pZwei).toBeNull(); expect(vorzeichenTest([]).grund).toBe('keinUnterschied');
    expect(rangWeitereText('keinUnterschied')).toBe('Kein Paar hat einen Unterschied.'); expect(rangWeitereText('einPaar')).toContain('Mit so wenigen Paaren lässt sich nichts testen');
  });
});

describe('Mediantest (Gesamtmedian; Gleichstand zählt zu „≤“; Pearson ohne Korrektur)', () => {
  for (const name of Object.keys(R.median)) it(`${name}`, () => {
    const f = R.median[name], gr = (f.gruppen_werte as number[][]).map((w, i) => ({ name: `G${i + 1}`, werte: w })), r = mediantest(gr);
    nah(r.median, f.median); expect(r.aufMedian).toBe(f.auf_median); nah(r.anteilAufMedian, f.anteil_auf_median, 1e-12); expect(r.gruppen).toBe(f.gruppen); expect(r.n).toBe(f.n);
    nahListe(r.ueber, f.ueber); nahListe(r.bis, f.bis);
    if (f.grund) { expect(r.grund).toBe(f.grund); for (const k of ['chi2', 'df', 'p', 'fisherP', 'yates', 'ibmRegel'] as const) expect(r[k], k).toBeNull(); return; }
    expect(r.grund).toBeNull(); nah(r.chi2!, f.chi2, 1e-9); expect(r.df).toBe(f.df); nahRel(r.p!, f.p, 1e-8);
    if (f.gruppen === 2) { nahRel(r.fisherP!, f.fisher_p, 1e-8); nah(r.yates!.chi2, f.yates.chi2, 1e-9); nahRel(r.yates!.p, f.yates.p, 1e-7); expect(r.ibmRegel).toBe(f.ibm_regel); }
    else { expect(r.fisherP).toBeNull(); expect(r.yates).toBeNull(); expect(r.ibmRegel).toBeNull(); }
    const erw: string[] = []; if (f.hinweis_auf_median) erw.push('viel-auf-median'); if (f.hinweis_erwartet) erw.push('erwartet-klein'); expect([...r.hinweise].sort()).toEqual(erw.sort());
    expect(hatNaN(r)).toBe(false);
  });
  it('Likert-Beispiel (n = 21): 7 von 21 Werten = Median 5 (zählen zu ≤), Tabelle 3/4, 3/5, 0/6, χ² = 3,4125, df 2, p = ,1815 - wie PSPP und SPSS', () => {
    const f = R.median.likert21, r = mediantest(f.gruppen_werte.map((w: number[], i: number) => ({ name: `G${i}`, werte: w })));
    expect(r.median).toBe(5); expect(r.aufMedian).toBe(7); expect(r.ueber).toEqual([3, 3, 0]); expect(r.bis).toEqual([4, 5, 6]); nah(r.chi2!, 3.4125, 1e-9); nah(r.p!, 0.18155, 1e-3); expect(r.hinweise).toContain('viel-auf-median');
    // die andere Konvention (coin: Gleichstand halb) gibt einen anderen Wert und ist NICHT das Soll
    expect(Math.abs(f.coin_zur_abgrenzung.chi2 - 3.4125)).toBeGreaterThan(0.05);
  });
  it('2 Gruppen: Fisher immer, Yates nach der IBM-Formel (N ≤ 30: SPSS zeigt Fisher, darüber Yates); A gegen B (3/4 gegen 3/5): Pearson ,045, Fisher p = 1', () => {
    const z = R.median.zwei_gruppen, r = mediantest(z.gruppen_werte.map((w: number[], i: number) => ({ name: `G${i}`, werte: w }))); expect(r.n).toBe(15); expect(r.ibmRegel).toBe('fisher'); nah(r.chi2!, 0.0446428571, 1e-9); nah(r.fisherP!, 1, 1e-9);
    const g = R.median.zwei_gross, r2 = mediantest(g.gruppen_werte.map((w: number[], i: number) => ({ name: `G${i}`, werte: w }))); expect(r2.n).toBe(38); expect(r2.ibmRegel).toBe('yates'); expect(r2.fisherP).not.toBeNull();
  });
  it('k ≥ 3: nur asymptotisch (kein Fisher-Freeman-Halton), mit Cochran-Hinweis bei erwartet < 5 in über 20 % der Zellen', () => {
    const f = R.median.likert21, r = mediantest(f.gruppen_werte.map((w: number[], i: number) => ({ name: `G${i}`, werte: w }))); expect(r.fisherP).toBeNull(); expect(r.hinweise).toContain('erwartet-klein');
    expect(R.median.drei_gross.hinweis_erwartet).toBe(false);
  });
  it('Ränder: alle Werte gleich (Median = jeder Wert, „> M“ leer), leere Gruppe fällt weg, nur eine Gruppe', () => {
    const a = mediantest([{ name: 'A', werte: [4, 4, 4] }, { name: 'B', werte: [4, 4, 4, 4] }]); expect(a.grund).toBe('alle-gleich'); expect(a.chi2).toBeNull(); expect(a.p).toBeNull();
    const m = mediantest([{ name: 'A', werte: [1, 2, 3, 9] }, { name: 'leer', werte: [] }, { name: 'B', werte: [4, 6, 7, 8, 10] }]), o = mediantest([{ name: 'A', werte: [1, 2, 3, 9] }, { name: 'B', werte: [4, 6, 7, 8, 10] }]);
    expect(m.gruppen).toBe(2); nah(m.chi2!, o.chi2!, 1e-12); expect(m.fisherP).not.toBeNull();
    expect(mediantest([{ name: 'A', werte: [1, 2, 3] }]).grund).toBe('zu-wenig-gruppen'); expect(mediantest([{ name: 'A', werte: [1, 2, 3] }, { name: 'B', werte: [] }]).grund).toBe('zu-wenig-gruppen');
    expect(mediantest([{ name: 'A', werte: [1, 2, 2, 2] }, { name: 'B', werte: [1, 2, 2, 2] }]).grund).toBe('nichts-ueber-median');
    expect(rangWeitereText('alle-gleich', 'median')).toBe('Alle Werte liegen auf dem Median.');
    expect(rangWeitereText('viel-auf-median')).toContain('Viele Werte liegen genau auf dem Median'); expect(rangWeitereText('viel-auf-median')).toContain('Kruskal-Wallis');
  });
  it('der Median ist der des Gesamtdatensatzes, nicht der der Gruppen', () => {
    const r = mediantest([{ name: 'A', werte: [1, 2, 3] }, { name: 'B', werte: [10, 11, 12] }]); expect(r.median).toBe(6.5); expect(r.ueber).toEqual([0, 3]); expect(r.bis).toEqual([3, 0]);
  });
});

describe('Jonckheere-Terpstra (Zählung mit halben Bindungen; Varianz mit Bindungskorrektur; exakt bedingt)', () => {
  for (const name of Object.keys(R.jt).filter(n => !n.startsWith('ibm_'))) it(`${name}`, () => {
    const f = R.jt[name], r = jonckheereTerpstra(f.gruppen);
    expect(r.n).toBe(f.n); expect(r.gruppen).toBe(f.gruppen.length); nah(r.jt, f.jt, 1e-12); nah(r.mittel, f.mittel, 1e-12); nah(r.varianz, f.varianz, 1e-10); nah(r.sd, f.sd, 1e-10); nah(r.z, f.z, 1e-9); nahRel(r.aufteilungen, f.aufteilungen, 1e-9);
    nahRel(r.asymptotisch.zwei, f.asymptotisch.zwei, 1e-8); nahRel(r.asymptotisch.steigt, f.asymptotisch.steigt, 1e-8); nahRel(r.asymptotisch.faellt, f.asymptotisch.faellt, 1e-8);
    if (f.exakt) {
      expect(r.modus).toBe('exakt'); expect(r.exakt).not.toBeNull(); nahRel(r.exakt!.steigt, f.exakt.steigt, 1e-12); nahRel(r.exakt!.faellt, f.exakt.faellt, 1e-12); nahRel(r.exakt!.zwei, f.exakt.zwei_ibm, 1e-12);
      expect(r.p).toEqual(r.exakt);
    } else { expect(r.modus).toBe('asymptotisch'); expect(r.exakt).toBeNull(); expect(r.p).toEqual(r.asymptotisch); }
    expect(r.grund).toBeNull(); expect(hatNaN(r)).toBe(false);
  });
  it('mit Bindungen (4+4+4: 1,2,2,4 / 2,3,5,5 / 3,5,6,6): JT = 40,5 (nicht 34 wie PSPP), μ = 24, σ² = 44,897, z = 2,462; 34 650 Aufteilungen exakt: einseitig ,00635, asymptotisch zweiseitig ,0138', () => {
    const f = R.jt.mit_bindungen, r = jonckheereTerpstra(f.gruppen);
    expect(r.jt).toBe(40.5); expect(r.mittel).toBe(24); nah(r.varianz, 44.897, 1e-4); nah(r.z, 2.462, 1e-3); expect(r.aufteilungen).toBe(34650); nah(r.exakt!.steigt, 0.00635, 2e-2); nah(r.asymptotisch.zwei, 0.0138, 1e-2);
    expect(f.pspp.jt).toBe(34); expect(f.pspp.gleich_mit_soll).toBe(false);   // der PSPP-Fehler (Befund 1): Statable liest PSPP dafür nie
  });
  it('ohne Bindungen stimmt PSPP mit dem Soll überein (JT, μ, σ, z, p)', () => { const f = R.jt.ohne_bindungen; expect(f.pspp.gleich_mit_soll).toBe(true); const r = jonckheereTerpstra(f.gruppen); nah(r.jt, f.pspp.jt, 1e-9); nah(r.sd, f.pspp.sd, 1e-9); nah(r.z, f.pspp.z, 1e-9); nahRel(r.asymptotisch.zwei, f.pspp.p, 1e-9); });
  it('IBM-Definition des exakten zweiseitigen p: P(|T − E| ≥ |t − E|); bei ungleich großen Gruppen (2 + 3 + 5) ist sie NICHT 2·min(P≥, P≤) - die Fachblatt-Zahl (Abweichung im Prüferbericht); bei gleich großen sind beide gleich', () => {
    for (const n of ['ungleiche_groessen', 'ungleiche_fallend']) { const f = R.jt[n], r = jonckheereTerpstra(f.gruppen); nahRel(r.exakt!.zwei, f.exakt.zwei_ibm, 1e-12, n); expect(Math.abs(f.exakt.zwei_ibm - f.exakt.zwei_zweimal_min), n).toBeGreaterThan(1e-4); expect(Math.abs(r.exakt!.zwei - f.exakt.zwei_zweimal_min), n).toBeGreaterThan(1e-4); }
    const g = R.jt.mit_bindungen; nahRel(jonckheereTerpstra(g.gruppen).exakt!.zwei, g.exakt.zwei_zweimal_min, 1e-12);
  });
  it('Grenze: Vollauszählung nur bis exaktMax Aufteilungen (34 650 gerade noch exakt, 34 649 asymptotisch); 10+10+10 asymptotisch', () => {
    const g = R.jt.mit_bindungen.gruppen; expect(jonckheereTerpstra(g, { exaktMax: 34650 }).modus).toBe('exakt'); const a = jonckheereTerpstra(g, { exaktMax: 34649 }); expect(a.modus).toBe('asymptotisch'); expect(a.exakt).toBeNull(); expect(jonckheereTerpstra(R.jt.zehn_zehn_zehn.gruppen).modus).toBe('asymptotisch');
    expect(jonckheereTerpstra(g).modus).toBe('exakt');   // Voreinstellung 2 000 000
  });
  it('Zeit: 5+5+5 (756 756 Aufteilungen, ohne Bindungen) exakt in unter 8 Sekunden; exakt und asymptotisch liegen nahe beieinander', () => {
    const g = [[1, 4, 5, 9, 12], [2, 6, 8, 11, 14], [3, 7, 10, 13, 15]], t0 = Date.now(), r = jonckheereTerpstra(g), dt = Date.now() - t0;
    expect(r.aufteilungen).toBe(756756); expect(r.modus).toBe('exakt'); expect(dt, `${dt} ms`).toBeLessThan(8000); expect(Math.abs(r.exakt!.zwei - r.asymptotisch.zwei)).toBeLessThan(0.03);
  });
  it('absteigende Alternative: Gruppenreihenfolge umgekehrt → steigt und fällt tauschen; JT + JT′ = Zahl der Paare aus verschiedenen Gruppen', () => {
    const f = R.jt.mit_bindungen, a = jonckheereTerpstra(f.gruppen), b = jonckheereTerpstra([...f.gruppen].reverse()), c = R.jt.absteigend;
    nah(a.jt + b.jt, (144 - 48) / 2, 1e-12); nahRel(b.exakt!.steigt, a.exakt!.faellt, 1e-12); nahRel(b.exakt!.faellt, a.exakt!.steigt, 1e-12); nah(b.jt, c.jt, 1e-12); nah(b.z, -a.z, 1e-12);
    nahRel(b.exakt!.zwei, a.exakt!.zwei, 1e-12);
  });
  it('zwei Gruppen: JT = Mann-Whitney-Zählung U (mit halben Bindungen), wie wilcox.test W', () => { const f = R.jt.zwei_gruppen, r = jonckheereTerpstra(f.gruppen); expect(r.gruppen).toBe(2); nah(r.jt, f.jt, 1e-12); });
  it('Ränder: leere Gruppe wird übersprungen, weniger als 2 Gruppen, N < 3, alle Werte gleich (σ = 0) - nie NaN', () => {
    const g = R.jt.mit_bindungen.gruppen, m = jonckheereTerpstra([g[0], [], g[2]]), o = jonckheereTerpstra([g[0], g[2]]); expect(m.gruppen).toBe(2); nah(m.jt, o.jt, 1e-12); nah(m.z, o.z, 1e-12);
    for (const [gr, grund] of [[[[1, 2, 3]], 'zu-wenig-gruppen'], [[[1, 2, 3], []], 'zu-wenig-gruppen'], [[[1], [2]], 'zu-wenig-werte'], [[[5, 5], [5, 5, 5]], 'alle-gleich']] as [number[][], string][]) {
      const r = jonckheereTerpstra(gr); expect(r.grund, JSON.stringify(gr)).toBe(grund); expect(hatNaN(r)).toBe(false);
    }
    expect(rangWeitereText('alle-gleich', 'jt')).toBe('Alle Werte sind gleich.');
  });
  it('gedruckt (IBM Exact Tests Abb. 8.8, O-Ring, N = 24, Gruppengrößen 17, 5, 1, 1): der Mittelwert E(JT) = (N² − Σ n_j²)/4 = 65', () => {
    const gr = [Array.from({ length: 17 }, (_, i) => i + 1), [3.5, 7.5, 9.5, 11.5, 20], [8.2], [9.9]]; expect(gr.flat()).toHaveLength(24); expect(jonckheereTerpstra(gr, { exaktMax: 0 }).mittel).toBe(R.jt.ibm_gedruckt_oring.mittel);
  });
});

describe('Kolmogorov-Smirnov, zwei Stichproben (exakt mit Bindungen in ganzen Zahlen bis n1·n2 ≤ 10 000)', () => {
  for (const name of Object.keys(R.ks).filter(n => !n.startsWith('ibm_'))) it(`${name}`, () => {
    const f = R.ks[name], r = ksZwei(f.x, f.y);
    expect([r.n1, r.n2]).toEqual([f.n1, f.n2]); nah(r.d, f.d, 1e-12); nah(r.z, f.z, 1e-9); expect(r.modus).toBe(f.modus); nah(r.pAsymptotisch, f.p_asymptotisch, 1e-6, 'asymptotisch');
    if (f.modus === 'exakt') { expect(r.pExakt).not.toBeNull(); nahRel(r.pExakt!, f.p_exakt, 1e-9, 'exakt'); expect(r.p).toBe(r.pExakt); } else { expect(r.pExakt).toBeNull(); expect(r.p).toBe(r.pAsymptotisch); }
    expect(r.grund).toBeNull(); expect(hatNaN(r)).toBe(false);
  });
  it('Likert mit Bindungen (x = 1,2,2,3,3,4; y = 2,3,4,4,5,5,5): D = 23/42, exakt p = ,1492, asymptotisch (SPSS-Formel) ,2872 - fast doppelt so groß', () => {
    const f = R.ks.beispiel_likert, r = ksZwei(f.x, f.y); nah(r.d, 23 / 42, 1e-12); nah(r.p, 0.1492, 1e-3); nah(r.pAsymptotisch, 0.2872, 1e-3); nah(r.z, 0.9843, 1e-3); expect(r.pAsymptotisch / r.p).toBeGreaterThan(1.8);
  });
  it('Grenze: 99 · 101 = 9999 und 100 · 100 = 10 000 exakt, 73 · 137 = 10 001 asymptotisch; Umschalten über exaktMaxProdukt', () => {
    expect(ksZwei(R.ks.grenze_9999.x, R.ks.grenze_9999.y).modus).toBe('exakt'); expect(ksZwei(R.ks.grenze_10000.x, R.ks.grenze_10000.y).modus).toBe('exakt'); expect(ksZwei(R.ks.grenze_10001.x, R.ks.grenze_10001.y).modus).toBe('asymptotisch');
    expect(ksZwei(R.ks.grenze_10001.x, R.ks.grenze_10001.y, { exaktMaxProdukt: 10001 }).modus).toBe('exakt'); expect(ksZwei(R.ks.beispiel_likert.x, R.ks.beispiel_likert.y, { exaktMaxProdukt: 41 }).modus).toBe('asymptotisch');
  });
  it('D = 1 (keine Überschneidung): exakt p = 2 / C(11, 5); alle Werte gleich: D = 0, p = 1', () => {
    const a = ksZwei(R.ks.d_gleich_eins.x, R.ks.d_gleich_eins.y); nah(a.d, 1, 1e-12); nahRel(a.pExakt!, 2 / 462, 1e-12); const b = ksZwei(R.ks.alle_gleich.x, R.ks.alle_gleich.y); expect(Math.abs(b.d)).toBe(0); nah(b.p!, 1, 1e-12); nah(b.pAsymptotisch, 1, 1e-12);
  });
  it('ohne Bindungen: der exakte Wert ist der klassische (Smirnov/Hodges)', () => { const f = R.ks.ohne_bindungen, r = ksZwei(f.x, f.y); nahRel(r.pExakt!, f.p_exakt, 1e-12); expect(f.aufzaehlung_geprueft).toBe(true); });
  it('gedruckt (IBM Exact Tests Abb. 6.6, Lehmann 1975, 10 + 10, D = ,6): Z = D·√(n1·n2/(n1+n2)) = 1,342 und die Smirnov-Reihe gibt ,055; die Daten stehen nur als Bild, hier ein Beispiel mit demselben D', () => {
    const g = R.ks.ibm_gedruckt_vitamin_c, x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], y = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16], r = ksZwei(x, y);
    expect(r.n1 * r.n2).toBe(100); nah(r.d, 0.6, 1e-12); nah(r.z, g.z, 1e-3); nah(r.pAsymptotisch, g.p_asymptotisch, 1e-3); expect(g.p_exakt).toBe(0.045);
  });
  it('Ränder: n1 oder n2 = 0 → zu-wenig-werte; n = 1 geht; Satz', () => {
    const r = ksZwei([], [1, 2]); expect(r.grund).toBe('zu-wenig-werte'); expect(r.p).toBeNull(); expect(ksZwei([1, 2], []).grund).toBe('zu-wenig-werte');
    const k = R.ks.klein_n1, e = ksZwei(k.x, k.y); expect(e.grund).toBeNull(); nahRel(e.pExakt!, k.p_exakt, 1e-12); expect(rangWeitereText('zu-wenig-werte')).toMatch(/Wert/);
  });
  it('Sätze: ganze Sätze, nie NaN', () => { for (const c of ['keinUnterschied', 'einPaar', 'alle-gleich', 'nichts-ueber-median', 'zu-wenig-gruppen', 'zu-wenig-werte', 'viel-auf-median', 'erwartet-klein'] as RangWeitereHinweis[]) { const t = rangWeitereText(c); expect(t).not.toMatch(/NaN|undefined/); expect(t.trim().endsWith('.')).toBe(true); } });
});
