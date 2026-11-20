import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-d-erwartet.json';
import * as modul from './ausreisser';
import { AUSREISSER_SATZ, ausreisserAngebot, dixon, dixonKritisch, esd, grubbs, grubbsKritisch, grubbsP, satzEsd, satzGrubbs } from './ausreisser';
import { s } from './sitzung.svelte';

/* ===== ROTE TESTS Welle S-D, T2: Ausreißertests (nur Hinweis, nie löschen) - Prüfer; der Bauer B ändert Test und JSON nicht =====
 * Soll: scripts/spaeter-d-erwartet.R → testdaten/spaeter-d-erwartet.json (t2). Fachblatt Abschnitt 6 + „Entscheidungen Opus“ 6. Kritische Werte ohne Tabelle aus der t-Verteilung (Grubbs, ESD), Dixon aus der EXAKTEN Tabelle (zweidimensionale Integration).
 * Zweite Quelle im Skript: Simulation (1 Mio. Stichproben je n für Grubbs, 2 Mio. für Dixon, 40 000 für die Rate des ESD), NIST/SEMATECH e-Handbook (Grubbs 1.3.5.17.1: 8 Messungen, G = 2,4687; ESD 1.3.5.17.3: 54 Werte, drei Ausreißer),
 * Wikipedia (Dixon-Beispiel, Q = ,455, Tafel ,412 / ,466). Die Pakete `outliers` und `EnvStats` fehlen auf dem Mac (deshalb Simulation).
 * Neues Modul `lib/ausreisser.ts` (reine Funktionen; Zeilennummern 1-basiert wie in der Eingabeliste, Lücken (null) zählen mit, werden aber nicht geprüft). KEINE Funktion zum Entfernen oder Löschen. API:
 *
 *   grubbsKritisch(n, alpha = .05, seite: 'beide' | 'oben' | 'unten' = 'beide'): number     G_krit = ((n−1)/√n)·√(t²/(n−2+t²)), t = t(1 − α/(2n); n−2) zweiseitig, t(1 − α/n; n−2) einseitig
 *   grubbsP(g, n, seite = 'beide'): number        t = √(n(n−2)G²/((n−1)²−nG²)); p = 2n·P(T(n−2) > t) (einseitig ohne die 2), auf höchstens 1 begrenzt; nie NaN (G am Maximum (n−1)/√n → p = 0)
 *   grubbs(x: (number | null)[], o?: { alpha?; seite? }): { n; ausgeschlossen; mittel; sd; g; kritisch; p; zeile: number; wert: number; gleichstand: number[] /* alle Zeilen mit demselben Abstand (Rundung 9 Stellen) *\/; gefunden: boolean;
 *        ohne: { n; mittel; sd } /* ohne die Zeile des auffälligsten Werts *\/; hinweise: ('wenige-stufen' | 'nicht-normal')[]; fehler: null | 'n-zu-klein' /* n < 7 *\/ | 'alle-gleich' | 'keine-werte' }
 *        G = max|xᵢ − x̄|/s (s mit n−1; einseitig oben max(x − x̄), unten max(x̄ − x)); bei Gleichstand ist `zeile` die erste, `gleichstand` nennt alle
 *   esd(x, o?: { k?: number; alpha?: number }): { n; ausgeschlossen; k /* benutzt: höchstens min(10, ⌊0,2·n⌋) *\/; schritte: { i; zeile; wert; r; lambda }[]; anzahl: number /* GRÖSSTES i mit Rᵢ > λᵢ *\/; gemeldet: number[] /* Zeilen der ersten `anzahl` Schritte *\/;
 *        mittel; sd; ohne: { n; mittel; sd } /* ohne die gemeldeten *\/; hinweise: ('wenige-stufen' | 'nicht-normal')[]; fehler: null | 'n-zu-klein' /* n < 25 *\/ | 'alle-gleich' | 'keine-werte' }
 *        Rᵢ = max|x − x̄ᵢ|/sᵢ auf den noch n−i+1 Werten, dann diesen Wert entfernen; λᵢ = (n−i)·t/√((n−i−1+t²)(n−i+1)), t = t(1 − α/(2(n−i+1)); n−i−1)
 *   dixon(x, o?: { alpha? }): { n; rHoch; rTief; r /* Maximum *\/; seite: 'hoch' | 'tief'; zeile; wert; kritisch; gefunden; fehler: null | 'n-ausserhalb' /* n < 3 oder n > 10 *\/ | 'alle-gleich' | 'keine-werte' }
 *        r10: hoch (x(n) − x(n−1))/(x(n) − x(1)), tief (x(2) − x(1))/(x(n) − x(1)); zweiseitig = Maximum; gefunden ⇔ r > kritisch. KEIN p-Wert verlangt.
 *   dixonKritisch(n: number, alpha: number): number        n = 3 … 10, alpha ∈ {.10, .05, .01}; die EXAKTE Tabelle mit 4 Stellen (Fehler höchstens 6e-5 gegen die Integration), nicht die abgeschriebene aus Rorabacher 1991
 *   ausreisserAngebot(n): { grubbs: boolean /* n ≥ 7 *\/; esd: boolean /* n ≥ 25 *\/; dixon: boolean /* 3 ≤ n ≤ 10 *\/ }
 *   hinweise: 'wenige-stufen' = weniger als 15 verschiedene Werte; 'nicht-normal' = Shapiro-Wilk der Werte OHNE die gemeldeten (ohne Fund: aller Werte) mit p < ,05
 *   AUSREISSER_SATZ: „Der Fall bleibt in den Daten. Prüfe zuerst, ob ein Eingabe- oder Messfehler vorliegt oder ob der Wert zu einer anderen Gruppe gehört.“
 *   satzGrubbs(e), satzEsd(e): string        ganze Sätze mit Zeilennummer(n), Wert, M und SD mit und ohne; enthalten AUSREISSER_SATZ; p ohne führende Null
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const T = (erwartet as any).t2;
const nah = (ist: number, soll: number, tol = 1e-9) => expect(Math.abs(ist - soll), `${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const rel = (ist: number, soll: number, tol: number) => expect(Math.abs(ist - soll) / Math.abs(soll), `${ist} gegen ${soll}`).toBeLessThanOrEqual(tol);
const paar = (ist: number[], soll: number[], tol = 1e-9) => { expect(ist.length).toBe(soll.length); soll.forEach((v, i) => nah(ist[i]!, v, tol)); };

describe('Nie löschen, nie entfernen', () => {
  it('das Modul bietet keine Funktion zum Entfernen, Löschen oder Ausschließen von Fällen', () => { expect(Object.keys(modul).filter(k => /entfern|loesch|delete|remove|ausschliess|drop/i.test(k))).toEqual([]); });
  it('der feste Satz', () => { expect(AUSREISSER_SATZ).toBe('Der Fall bleibt in den Daten. Prüfe zuerst, ob ein Eingabe- oder Messfehler vorliegt oder ob der Wert zu einer anderen Gruppe gehört.'); });
  it('die übergebenen Werte bleiben unverändert (eingefroren)', () => {
    const x = Object.freeze([...T.esd_nist.daten]) as unknown as number[]; expect(() => { grubbs(x); esd(x, { k: 5 }); dixon(x.slice(0, 8)); }).not.toThrow();
  });
});

describe('Angebot: Grubbs ab 7, ESD ab 25, Dixon 3 bis 10', () => {
  it('Grenzen', () => {
    const a = T.angebot; expect(a).toMatchObject({ grubbs_ab: 7, esd_ab: 25, dixon_von: 3, dixon_bis: 10 });
    expect(ausreisserAngebot(6)).toEqual({ grubbs: false, esd: false, dixon: true }); expect(ausreisserAngebot(7)).toEqual({ grubbs: true, esd: false, dixon: true }); expect(ausreisserAngebot(10)).toEqual({ grubbs: true, esd: false, dixon: true });
    expect(ausreisserAngebot(11)).toEqual({ grubbs: true, esd: false, dixon: false }); expect(ausreisserAngebot(24)).toEqual({ grubbs: true, esd: false, dixon: false }); expect(ausreisserAngebot(25)).toEqual({ grubbs: true, esd: true, dixon: false }); expect(ausreisserAngebot(2).dixon).toBe(false);
  });
  it('die Rechenfunktionen selbst sagen es auch: n = 6 (Grubbs), n = 24 (ESD) und n = 11 / 2 (Dixon) → Fehlercode, keine Zahl', () => {
    const x = (n: number) => Array.from({ length: n }, (_, i) => Math.sin(i * 2.1) * 3 + i * 0.2);
    expect(grubbs(x(6)).fehler).toBe('n-zu-klein'); expect(grubbs(x(7)).fehler).toBeNull(); expect(esd(x(24)).fehler).toBe('n-zu-klein'); expect(esd(x(25)).fehler).toBeNull(); expect(dixon(x(11)).fehler).toBe('n-ausserhalb'); expect(dixon(x(2)).fehler).toBe('n-ausserhalb'); expect(dixon(x(10)).fehler).toBeNull();
  });
  it('alle Werte gleich (SD = 0): „alle-gleich“, kein Test; nur Lücken: keine-werte; nie NaN', () => {
    expect(grubbs(Array(20).fill(5)).fehler).toBe('alle-gleich'); expect(esd(Array(40).fill(5)).fehler).toBe('alle-gleich'); expect(dixon(Array(8).fill(5)).fehler).toBe('alle-gleich'); expect(grubbs([null, null, null]).fehler).toBe('keine-werte');
    expect(JSON.stringify(grubbs(Array(20).fill(5)))).not.toMatch(/NaN/);
  });
});

describe('Grubbs: kritische Werte aus der t-Verteilung, p-Wert, Beispiele', () => {
  for (const t of T.grubbs_tabelle) it(`n = ${t.n}: zweiseitig ${t.zwei.a05.toFixed(4)} / einseitig ${t.ein.a05.toFixed(4)} (α = ,05); ,10 und ,01`, () => {
    for (const [k, a] of [['a10', 0.1], ['a05', 0.05], ['a01', 0.01]] as const) { nah(grubbsKritisch(t.n, a), t.zwei[k], 1e-8); nah(grubbsKritisch(t.n, a, 'oben'), t.ein[k], 1e-8); nah(grubbsKritisch(t.n, a, 'unten'), t.ein[k], 1e-8); }
  });
  it('Fachblatt-Tabelle (zweiseitig / einseitig): n = 8: 2,1266 / 2,0317 · n = 10: 2,2900 / 2,1761 · n = 30: 2,9085 / 2,7451 · n = 100: 3,3841 / 3,2095 (Simulation: Typ-I-Fehler ,050 ± ,001)', () => {
    for (const [n, z, e] of [[3, 1.1543, 1.1531], [5, 1.715, 1.6714], [8, 2.1266, 2.0317], [10, 2.29, 2.1761], [20, 2.7082, 2.5566], [30, 2.9085, 2.7451], [100, 3.3841, 3.2095]] as const) { nah(grubbsKritisch(n), z, 1e-4 / z * 2); nah(grubbsKritisch(n, 0.05, 'oben'), e, 1e-4 / e * 2); }
    for (const r of T.grubbs_simulation.zwei) expect(Math.abs(r - 0.05)).toBeLessThan(0.0012);
  });
  it('NIST 1.3.5.17.1 (8 Messungen, https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h1.htm): G = 2,4687 (gerundet), einseitig kritisch 2,032; der Wert 245,57 in Zeile 8 ist ein Ausreißer', () => {
    const N = T.grubbs_nist, r = grubbs(N.daten); nah(r.g, N.g, 1e-9); nah(r.g, N.nist_g, 1e-4); nah(r.kritisch, N.kritisch, 1e-8); nah(grubbsKritisch(8, 0.05, 'oben'), N.nist_krit_einseitig, 1e-3);
    nah(r.mittel, N.mittel, 1e-9); nah(r.sd, N.sd, 1e-9); expect(r.zeile).toBe(8); expect(r.wert).toBe(245.57); expect(r.gefunden).toBe(true); rel(r.p, N.p, 1e-6); expect(r.n).toBe(8); expect(r.ausgeschlossen).toBe(0);
    nah(r.ohne.mittel, N.ohne.mittel, 1e-9); nah(r.ohne.sd, N.ohne.sd, 1e-9); expect(r.ohne.n).toBe(7);
  });
  it('p-Wert (zweiseitig, n·P(T>t)·2, auf 1 begrenzt) an mehreren Stellen; p nie über 1 und nie NaN', () => {
    rel(grubbsP(T.grubbs_nist.g, 8), T.grubbs_nist.p, 1e-6); expect(grubbsP(0.5, 8)).toBe(1); expect(grubbsP(2.2, 8)).toBeLessThanOrEqual(1); expect(grubbsP(2.2, 8)).toBeGreaterThan(grubbsP(2.4, 8));
    expect(grubbsP((8 - 1) / Math.sqrt(8), 8)).toBe(0); expect(Number.isNaN(grubbsP(0, 8))).toBe(false);
    nah(grubbsP(grubbsKritisch(20, 0.05), 20), 0.05, 1e-8); nah(grubbsP(grubbsKritisch(20, 0.05, 'oben'), 20, 'oben'), 0.05, 1e-8);
  });
  it('einseitig (nur mit Richtung vorab): oben und unten; Gleichstand am Extremwert: zwei gleiche Maxima - G gleich, beide gemeldet (Zeilen 9 und 10)', () => {
    const x = T.gleichstand.daten, g = grubbs(x); nah(g.g, T.gleichstand.grubbs.g, 1e-9); expect(g.zeile).toBe(9); expect(g.gleichstand).toEqual([9, 10]); expect(g.wert).toBe(15);
    const o = grubbs(x, { seite: 'oben' }), u = grubbs(x, { seite: 'unten' }); nah(o.g, T.grubbs_einseitig_oben.g, 1e-9); nah(o.kritisch, T.grubbs_einseitig_oben.kritisch, 1e-8); rel(o.p, T.grubbs_einseitig_oben.p, 1e-6);
    nah(u.g, T.grubbs_einseitig_unten.g, 1e-9); nah(u.kritisch, T.grubbs_einseitig_unten.kritisch, 1e-8); expect(u.zeile).toBe(T.grubbs_einseitig_unten.zeile); expect(u.gleichstand).toEqual([u.zeile]);
  });
  it('Lücken in der Spalte: ausgeschlossen = 2, n = 8, die Zeilennummer ist die der Liste mit Lücken (9)', () => {
    const L = T.luecke, r = grubbs(L.daten); expect(r.n).toBe(L.n); expect(r.ausgeschlossen).toBe(2); nah(r.g, L.grubbs.g, 1e-9); expect(r.zeile).toBe(9); expect(r.wert).toBe(245.57);
  });
  it('Niveau ,10 und ,01 ändern nur den kritischen Wert', () => { const x = T.grubbs_nist.daten, a = grubbs(x, { alpha: 0.1 }), b = grubbs(x, { alpha: 0.01 }); expect(a.kritisch).toBeLessThan(b.kritisch); nah(a.g, b.g, 1e-15); expect(a.gefunden).toBe(true); });
});

describe('Generalisierter ESD (Rosner): größtes i mit Rᵢ > λᵢ', () => {
  const N = T.esd_nist, r = esd(N.daten, { k: 10 });
  it('NIST 1.3.5.17.3 (54 Werte, https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h3.htm): drei Ausreißer - Zeilen 54, 53, 52 (6,01; 5,42; 5,34)', () => {
    expect(r.n).toBe(54); expect(r.k).toBe(10); expect(r.anzahl).toBe(3); expect(r.gemeldet).toEqual([54, 53, 52]); expect(r.schritte.slice(0, 3).map(x => x.wert)).toEqual([6.01, 5.42, 5.34]); expect(r.fehler).toBeNull();
  });
  it('Rᵢ und λᵢ (i = 1 … 10) gleich R auf 1e-6 und gleich NIST auf 3 Stellen (NIST druckt gerundet: 3,118 / 3,158 usw.)', () => {
    expect(r.schritte.length).toBe(10); r.schritte.forEach((x, i) => { expect(x.i).toBe(i + 1); nah(x.r, N.schritte[i].r, 1e-6); nah(x.lambda, N.schritte[i].lambda, 1e-6); expect(x.zeile).toBe(N.schritte[i].zeile); nah(x.r, N.nist_r[i], 2e-3); nah(x.lambda, N.nist_lambda[i], 2e-3); });
    nah(r.schritte[0]!.lambda, 3.158794, 1e-5);
  });
  it('λ₁ ist das zweiseitige Grubbs-Kriterium; Grubbs allein findet im Rosner-Beispiel NICHTS (G = 3,119 < 3,159, p = ,059) - Maskierung', () => {
    const g = grubbs(N.daten); nah(r.schritte[0]!.lambda, g.kritisch, 1e-10); expect(g.gefunden).toBe(false); nah(g.g, N.grubbs_allein.g, 1e-9); expect(g.p).toBeGreaterThan(0.05); expect(g.p).toBeLessThan(0.07); rel(g.p, N.grubbs_allein.p, 1e-6);
  });
  it('Niveau ,10 / ,05 / ,01: Zahl der Ausreißer und alle λ gleich R', () => {
    for (const n of N.niveaus) { const e = esd(N.daten, { k: 10, alpha: n.alpha }); expect(e.anzahl, `α = ${n.alpha}`).toBe(n.anzahl); paar(e.schritte.map(x => x.lambda), n.lambda, 1e-6); }
  });
  it('Maskierung, synthetisch (n = 25: 22 Normalwerte und 80, 83, 86): Grubbs allein findet nichts, ESD findet drei; bei n = 20 (Fachblatt) bleibt Grubbs ebenfalls ohne Fund', () => {
    const m = T.maskierung25, g = grubbs(m.daten), e = esd(m.daten, { k: 5 }); expect(g.gefunden).toBe(false); nah(g.g, m.grubbs.g, 1e-9); expect(e.anzahl).toBe(3); expect([...e.gemeldet].sort((a, b) => a - b)).toEqual([23, 24, 25]);
    e.schritte.forEach((x, i) => { nah(x.r, m.esd.schritte[i].r, 1e-6); nah(x.lambda, m.esd.schritte[i].lambda, 1e-6); });
    expect(grubbs(T.maskierung.daten).gefunden).toBe(false); expect(esd(T.maskierung.daten, { k: 4 }).fehler).toBe('n-zu-klein');
  });
  it('k wird begrenzt auf min(10, ⌊0,2·n⌋): n = 25 → 5, n = 54 mit k = 20 → 10', () => {
    const x = Array.from({ length: 25 }, (_, i) => Math.sin(i * 1.9) * 2 + 10); expect(esd(x, { k: 9 }).k).toBe(5); expect(esd(x, { k: 9 }).schritte.length).toBe(5); expect(esd(N.daten, { k: 20 }).k).toBe(10);
  });
  it('ESD hält das Niveau erst ab n ≈ 25 bis 50 (gemessen: 10: >7 %, 25: 5,8 %, 50: 4,9 %) - deshalb ab n = 25 angeboten', () => {
    const e = T.esd_typ1; expect(e.rate[0]).toBeGreaterThan(0.07); expect(Math.abs(e.rate[1] - 0.058)).toBeLessThan(0.01); expect(Math.abs(e.rate[2] - 0.049)).toBeLessThan(0.008);
  });
});

describe('Dixon r10: exakte kritische Werte (zweidimensionale Integration)', () => {
  for (const t of T.dixon_tabelle) it(`n = ${t.n}: ${t.a10.toFixed(4)} / ${t.a05.toFixed(4)} / ${t.a01.toFixed(4)} (α = ,10 / ,05 / ,01)`, () => {
    nah(dixonKritisch(t.n, 0.1), t.a10, 6e-5); nah(dixonKritisch(t.n, 0.05), t.a05, 6e-5); nah(dixonKritisch(t.n, 0.01), t.a01, 6e-5);
  });
  it('Fachblatt (3 Stellen, exakt): n = 4, 99 %: ,921 (nicht ,926 wie in der Erinnerung an Rorabacher 1991); n = 6, 95 %: ,628 (nicht ,625); n = 10: ,412 / ,466 / ,566', () => {
    nah(dixonKritisch(4, 0.01), 0.921, 1.2e-3); expect(Math.abs(dixonKritisch(4, 0.01) - 0.926)).toBeGreaterThan(0.003); nah(dixonKritisch(6, 0.05), 0.628, 1.2e-3); expect(Math.abs(dixonKritisch(6, 0.05) - 0.625)).toBeGreaterThan(0.0015);
    paar([dixonKritisch(10, 0.1), dixonKritisch(10, 0.05), dixonKritisch(10, 0.01)], [0.412, 0.466, 0.566], 1.2e-3);
  });
  it('Simulation (2 Mio. Stichproben je n) bestätigt die Tafel: Anteil über dem kritischen Wert .10 / .05 / .01', () => {
    const S = T.dixon_simulation; for (const v of S.a10) expect(Math.abs(v - 0.1)).toBeLessThan(0.002); for (const v of S.a05) expect(Math.abs(v - 0.05)).toBeLessThan(0.0015); for (const v of S.a01) expect(Math.abs(v - 0.01)).toBeLessThan(0.0008);
  });
  it('Wikipedia-Beispiel (n = 10, https://en.wikipedia.org/wiki/Dixon%27s_Q_test): Q = ,4545 (tief, Zeile 2, Wert 0,167) < ,466 → kein Ausreißer bei ,05; bei ,10 (kritisch ,412) schon', () => {
    const W = T.dixon_wiki, a = dixon(W.daten), b = dixon(W.daten, { alpha: 0.1 }); nah(a.r, W.r, 1e-12); nah(a.rTief, W.r_tief, 1e-12); nah(a.rHoch, W.r_hoch, 1e-12); expect(a.seite).toBe('tief'); expect(a.zeile).toBe(2); expect(a.wert).toBe(0.167);
    nah(a.kritisch, W.krit.a05, 6e-5); expect(a.gefunden).toBe(false); expect(b.gefunden).toBe(true); nah(b.kritisch, W.krit.a10 ?? 0.412, 1e-3); expect(a.fehler).toBeNull();
  });
  it('klarer Fund (n = 7, 9,8 zwischen Werten um 5,2): hoch, Zeile 7', () => { const F = T.dixon_fund, r = dixon(F.daten); nah(r.r, F.r, 1e-12); expect(r.seite).toBe('hoch'); expect(r.zeile).toBe(7); expect(r.gefunden).toBe(true); expect(r.gefunden).toBe(F.gefunden); });
  it('Lücken zählen nicht mit', () => { const r = dixon([null, ...T.dixon_wiki.daten, null]); expect(r.n).toBe(10); expect(r.zeile).toBe(3); });
});

describe('Hinweise: wenige Stufen, Normalverteilung fraglich', () => {
  it('Likert-Spalte (5 verschiedene Werte): Hinweis „wenige-stufen“ bei Grubbs und ESD; nicht bei vielen verschiedenen Werten', () => {
    expect(grubbs(T.likert).hinweise).toContain('wenige-stufen'); expect(esd(T.likert, { k: 3 }).hinweise).toContain('wenige-stufen'); expect(grubbs(T.esd_nist.daten).hinweise).not.toContain('wenige-stufen');
  });
  it('lognormale Daten (n = 60): Grubbs meldet einen Fund, Shapiro-Wilk der übrigen Werte p < ,05 → Hinweis „nicht-normal“; Normalverteilte: kein Hinweis', () => {
    const L = T.lognormal, r = grubbs(L.daten); expect(r.gefunden).toBe(L.grubbs.gefunden); expect(r.zeile).toBe(L.grubbs.zeile); expect(r.hinweise).toContain('nicht-normal'); expect(L.shapiro_ohne).toBeLessThan(0.05);
    const N = T.normal, q = grubbs(N.daten); expect(q.gefunden).toBe(false); expect(q.hinweise).not.toContain('nicht-normal'); expect(N.shapiro_alle).toBeGreaterThan(0.05);
  });
});

describe('Sätze: Zeilennummer, Werte, M und SD mit und ohne, der feste Satz', () => {
  it('Grubbs-Fund: Zeile 8, Wert 245,57, G, kritischer Wert, p ohne Null, „ohne diesen Wert“; kein Knopfwort zum Löschen', () => {
    const t = satzGrubbs(grubbs(T.grubbs_nist.daten)); expect(t).toContain('Zeile 8'); expect(t).toContain('245,57'); expect(t).toMatch(/2,47/); expect(t).toMatch(/ohne/); expect(t).toContain('Der Fall bleibt in den Daten.'); expect(t).not.toMatch(/\bp = 0,/); expect(t).not.toMatch(/NaN|undefined/);
  });
  it('ESD-Fund: nennt alle drei Zeilen (52, 53, 54) und die Zahl der Ausreißer; Grubbs allein hätte nichts gefunden steht nicht im Satz', () => {
    const t = satzEsd(esd(T.esd_nist.daten, { k: 10 })); expect(t).toMatch(/52.*53.*54|54.*53.*52/); expect(t).toMatch(/drei|3/); expect(t).toContain('Der Fall bleibt in den Daten.'); expect(t).not.toMatch(/NaN|undefined/);
  });
  it('ohne Fund: sagt es, nennt trotzdem den auffälligsten Wert und bleibt bei dem festen Satz', () => {
    const t = satzGrubbs(grubbs(T.esd_nist.daten)); expect(t).toMatch(/kein|nicht/i); expect(t).toContain('Zeile 54'); expect(t).toContain('Der Fall bleibt in den Daten.');
  });
});
