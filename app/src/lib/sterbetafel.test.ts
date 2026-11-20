import { describe, expect, it } from 'vitest';
import ERW from './testdaten/spaeter-f-erwartet.json';
import { s } from './sitzung.svelte';
import { sterbetafel, gehanNaeherung, gehanPaarweise, intervallAnfaenge } from './sterbetafel';
import { sterbetafelHauptsatz, sterbetafelTestSatz, sterbetafelFuss } from './sterbetafelsaetze';

/* ===== Später, Welle S-F, Teil 1: Sterbetafel wie SPSS SURVIVAL (Option „Sterbetafel statt Kaplan-Meier-Kurve“ der Karte kaplanmeier; Fachblatt SPAETER-F Abschnitt 1 und „Entscheidungen Opus (18.10.)“ 2 gehen vor) =====
 * ROTE TESTS des Sollwert-Prüfers. Der Bauer A darf diese Datei und die JSON nicht ändern. Sollwerte: scripts/spaeter-f-erwartet.R (Abschnitt sterbetafel). Jeder Wert hat dort zwei Wege:
 * eigene Umsetzung der IBM-Formeln und KMsurv::lifetab (alle Spalten, 1e-15); Gehan: Paar-für-Paar-Definition und coin::logrank_test(type = "Gehan-Breslow"); Handbeispiel von Hand.
 * FESTGELEGT (Opus 2): die in sich stimmige Fassung (Median mit h_i, se(f) mit P_{i-1}, Punktzahl mit +CE_k) - Abweichungen vom IBM-Text stehen in der Hilfe. Gehan-Wilcoxon NUR NÄHERUNGSWEISE
 * (die Zeit jedes Falls wird durch den Anfang seines Intervalls ersetzt; so rechnet SPSS), kein exakter Test. Fallgewicht gesperrt (gewichte-spaeter-f.test.ts). Rechnung in JS, kein R, kein PSPP.
 *
 * SCHNITTSTELLE lib/sterbetafel.ts
 *   sterbetafel(zeit: (number|null)[], ereignis: (number|null)[], anfaenge: number[]): TafelErgebnis | TafelFehler
 *      anfaenge = Anfänge t_1 < … < t_k der Intervalle, t_1 = 0; das LETZTE Intervall ab t_k ist OFFEN (alle Zeiten ab t_k). Zuordnung t_i <= X < t_(i+1) (Zeit genau auf der Grenze gehört ins obere Intervall).
 *      Ungültig (zählt als `ausgeschlossen`, wird nicht gerechnet): Zeit null/NaN/< 0, Ereignis null oder nicht 0/1. Ereignis 1 = Ereignis, 0 = zensiert (ausgeschieden).
 *      TafelErgebnis = { ok: true; zeilen: TafelZeile[]; median: { wert: number | null; erreicht: boolean; imOffenen: boolean }; n: number; ereignisse: number; zensiert: number; ausgeschlossen: number }
 *      TafelZeile = { anfang; breite: number | null; amAnfang (l_i); ausgeschieden (c_i); ereignisse (d_i); risiko (r_i = l_i - c_i/2); q (= d_i/r_i); kum (P_i, kumulierter Anteil am ENDE des Intervalls);
 *                     dichte, hazard, seDichte, seHazard: number | null; seKum }       breite, dichte, hazard, seDichte, seHazard sind im OFFENEN Schlussintervall null (nicht NaN), seKum gibt es immer
 *      Leere Intervalle (l_i = 0, niemand mehr dabei) werden NICHT ausgegeben (die Tafel endet dort). Rechnen in der stabilen Form (bei q = 0 und q = 1 nie NaN; se = 0 dort, wo der Grenzwert 0 ist).
 *      Formeln (IBM Algorithms 14.0 SURVIVAL, stimmige Fassung): l_i = l_(i-1) - c_(i-1) - d_(i-1); r_i = l_i - c_i/2; q_i = d_i/r_i; P_i = Π(1 - q_j); f_i = (P_(i-1) - P_i)/h_i; Hazard = 2q_i/(h_i(1 + p_i));
 *      se(P_i) = P_i·√(Σ_(j<=i) q_j/(r_j p_j)); se(f_i) = P_(i-1) q_i/h_i·√(Σ_(j<i) q_j/(r_j p_j) + p_i/(r_i q_i)); se(λ_i) = √(λ_i²/(r_i q_i)·(1 - (λ_i h_i/2)²)), 0 bei q_i = 0.
 *      median: Md = t_i + h_i·(P_(i-1) - 0,5)/(P_(i-1) - P_i) für das erste Intervall i mit P_i <= 0,5 (h_i, NICHT h_(i-1) wie im IBM-Text). Bleibt P der letzten ausgegebenen Zeile über 0,5: erreicht = false, wert = null.
 *      Fällt der Median in das offene Schlussintervall (dort gibt es keine Breite): erreicht = false, wert = null, imOffenen = true.
 *      TafelFehler = { ok: false; code: 'zu-wenige-intervalle' (weniger als 2 Anfänge) | 'zu-viele-intervalle' (mehr als 50) | 'anfaenge' (nicht aufsteigend, erster Anfang nicht 0, nicht endlich) | 'keine-faelle' | 'kein-ereignis' (alle zensiert)
 *                              | 'alle-zeiten-gleich' }    Eingaben ungleich lang: 'anfaenge' gilt nicht, sondern wirft nie - der Aufrufer liefert gleich lange Listen
 *   gehanNaeherung(zeit: number[], ereignis: number[], gruppe: number[], anfaenge: number[]): { D; df; p; summeS } | null
 *      bereinigte Eingaben gleicher Länge; gruppe = 0 … g-1 (g >= 2, sonst null). Zeit jedes Falls := Anfang seines Intervalls; Punktzahl S_k nach IBM mit A2 = W_c - CLE_k + CE_k (Summe aller S = 0);
 *      D = (W - 1)·Σ_j SS_j²/W_j / Σ_i S_i², χ² mit g - 1 Freiheitsgraden (p oberer Rand). Ist Σ S_i² = 0 (zum Beispiel liegen alle Zeiten im selben Intervall): null oder D = 0 mit p = 1 - NIE NaN.
 *   gehanPaarweise(…gleich…): { a: number; b: number; D; df; p }[]      alle Paare a < b, jedes mit der Rechnung der zwei Gruppen allein (ohne Korrektur für mehrere Vergleiche)
 *   intervallAnfaenge(zeit: number[], opt?: { breite?: number; ende?: number }):
 *        { ok: true; breite: number; ende: number; anfaenge: number[]; aufgerundet: boolean } | { ok: false; code: 'breite' | 'zu-wenige-intervalle' | 'zu-viele-intervalle' }
 *      Voreinstellung der Breite: der Wert aus {1, 2, 5}·10^k, der max(zeit)/10 auf der LOG-Skala am nächsten liegt (lung: 1022/10 = 102,2 → 100); Ende = größtes Vielfaches der Breite <= max(zeit); anfaenge = 0, breite, …, ende
 *      (das Ende ist der Anfang des offenen Intervalls). Ist ein angegebenes Ende kein Vielfaches der Breite: AUFRUNDEN (aufgerundet = true; die Breite bleibt, wie vom Menschen gewählt). Mehr als 50 Anfänge: 'zu-viele-intervalle'.
 * SCHNITTSTELLE lib/sterbetafelsaetze.ts (deutsche Sätze über L/d/Lp, Zahlenformat über i18n/profil, p ohne Null; hier Sprache de, du)
 *   sterbetafelHauptsatz(e: TafelErgebnis, opt: { breite: number; einheit: string }): string       nennt „Sterbetafel“, die Breite mit Einheit, n, die Ereignisse und den Median (oder „nicht erreicht“)
 *   sterbetafelTestSatz(g: { D; df; p }): string                                                    „Wilcoxon (Gehan)“, χ²(df) = D (zwei Stellen), p (< ,001 oder p = ,xxx)
 *   sterbetafelFuss(): string                                                                       sagt, dass Gehan frühe Ereignisse stärker gewichtet als der Log-Rank-Test, und dass man den Test vor dem Blick auf die Daten wählt */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Z = Record<string, any>;
const S = (ERW as unknown as Z).sterbetafel as Z, F = S.faelle as Z, DAT = S.daten as Z;

const nah = (ist: any, soll: number, tol: number, was: string) => {
  expect(typeof ist, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Number.isNaN(ist), `${was}: NaN`).toBe(false);
  expect(Math.abs(ist - soll), `${was} (ist ${ist}, soll ${soll})`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
};
const pNah = (ist: number, soll: number, was: string) => { expect(Math.abs(Math.log(ist / soll)), `${was} (ist ${ist}, soll ${soll})`).toBeLessThan(1e-6); };
const keinNaN = (x: unknown, pfad = ''): void => {
  if (typeof x === 'number') expect(Number.isNaN(x), `NaN bei ${pfad}`).toBe(false);
  else if (Array.isArray(x)) x.forEach((v, i) => keinNaN(v, `${pfad}[${i}]`));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) keinNaN(v, `${pfad}.${k}`);
};
const ok = (e: any) => { expect(e.ok, `Fehler: ${JSON.stringify(e)}`).toBe(true); return e; };
const SPALTEN = ['amAnfang', 'ausgeschieden', 'ereignisse', 'risiko', 'q', 'kum', 'dichte', 'hazard', 'seKum', 'seDichte', 'seHazard'] as const;
function tafelGleich(ist: Z, soll: Z, was: string, tol = 1e-12) {
  expect(ist.zeilen.length, `${was}: Zahl der Zeilen`).toBe(soll.zeilen.length);
  soll.zeilen.forEach((z: Z, i: number) => {
    const e = ist.zeilen[i]; nah(e.anfang, z.anfang, 0, `${was} Zeile ${i} anfang`);
    if (z.breite === null) expect(e.breite, `${was} Zeile ${i}: offenes Intervall hat keine Breite`).toBeNull(); else nah(e.breite, z.breite, 0, `${was} Zeile ${i} breite`);
    for (const k of SPALTEN) { if (z[k] === null) expect(e[k], `${was} Zeile ${i} ${k} (offenes Intervall)`).toBeNull(); else nah(e[k], z[k], tol, `${was} Zeile ${i} ${k}`); }
  });
  expect([ist.n, ist.ereignisse, ist.zensiert], `${was}: n, Ereignisse, zensiert`).toEqual([soll.n, soll.ereignisse, soll.zensiert]);
  expect(ist.median.erreicht, `${was}: Median erreicht`).toBe(soll.median.erreicht); expect(!!ist.median.imOffenen, `${was}: Median im offenen Intervall`).toBe(soll.median.imOffenen);
  if (soll.median.erreicht) nah(ist.median.wert, soll.median.wert, tol, `${was} Median`); else expect(ist.median.wert, `${was}: Median nicht erreicht → wert null`).toBeNull();
  keinNaN(ist, was);
}
const rechne = (zeit: number[], ereignis: number[], anfaenge: number[]) => ok(sterbetafel(zeit, ereignis, anfaenge));
const lung = { zeit: DAT.lung.zeit as number[], e: DAT.lung.ereignis as number[], sex: (DAT.lung.geschlecht as number[]).map(v => v - 1), ecog: DAT.lung.ecog as (number | null)[] };
const ST100 = F.lung_gesamt.frage.anfaenge as number[];

describe('Sterbetafel: lung (228 Fälle, 165 Ereignisse), Intervalle zu 100 Tagen, letztes offen - alle Spalten gleich eigener Umsetzung und KMsurv::lifetab', () => {
  it('Gesamttafel (Fachblatt 1.7, Tabelle): jede Spalte jeder Zeile, 1e-12', () => { tafelGleich(rechne(lung.zeit, lung.e, ST100), F.lung_gesamt.soll, 'lung gesamt'); });
  it('Ecken der Tabelle gegen die gedruckten Zahlen des Fachblatts: Zeile 1 und das offene Schlussintervall', () => {
    const e = rechne(lung.zeit, lung.e, ST100); const z0 = e.zeilen[0], zl = e.zeilen[10];
    expect([z0.amAnfang, z0.ausgeschieden, z0.ereignisse, z0.risiko]).toEqual([228, 1, 31, 227.5]); nah(z0.kum, 0.863736, 1e-6, 'P1'); nah(z0.seKum, 0.022745, 1e-5, 'se P1');
    expect([zl.anfang, zl.amAnfang, zl.ausgeschieden, zl.ereignisse, zl.breite, zl.dichte, zl.hazard]).toEqual([1000, 2, 2, 0, null, null, null]); nah(zl.kum, 0.054755, 1e-5, 'P 1000+');
  });
  it('Median 319,38 Tage aus der Tafel (Kaplan-Meier: 310): beide Werte stehen im Sollwert, die Tafel ist kein Kaplan-Meier', () => {
    const e = rechne(lung.zeit, lung.e, ST100); nah(e.median.wert, 319.3774, 1e-6, 'Median'); expect(F.lung_gesamt.soll.kaplanMeierMedian).toBe(310);
    nah(e.zeilen[8].kum, 0.054755, 1e-4, 'Tafel nach 900'); nah(F.lung_gesamt.soll.kaplanMeier900, 0.0503, 1e-3, 'Kaplan-Meier nach 900'); expect(Math.abs(e.zeilen[8].kum - F.lung_gesamt.soll.kaplanMeier900)).toBeGreaterThan(0.004);
  });
  it('nach Geschlecht: Männer und Frauen einzeln; bei den Frauen ist das offene Schlussintervall leer und wird nicht ausgegeben (10 Zeilen); Mediane 262,68 und 402,78', () => {
    const soll = F.lung_geschlecht.soll.gruppen as Z[];
    [0, 1].forEach(g => { const i = lung.sex.map((v, k) => (v === g ? k : -1)).filter(k => k >= 0); const e = rechne(i.map(k => lung.zeit[k]!), i.map(k => lung.e[k]!), ST100); tafelGleich(e, soll[g]!, `lung Geschlecht ${g + 1}`); });
    expect(soll[1]!.zeilen.length).toBe(10); nah(soll[0]!.median.wert, 262.6827, 1e-6, 'Median Männer'); nah(soll[1]!.median.wert, 402.7791, 1e-6, 'Median Frauen');
  });
  it('ungleich breite Intervalle (0, 50, 150, 300, 500, 800+): der Median nimmt h_i (325,65), nicht h_(i-1) wie im gedruckten IBM-Text (319,24)', () => {
    const e = rechne(lung.zeit, lung.e, F.lung_ungleich.frage.anfaenge); tafelGleich(e, F.lung_ungleich.soll, 'lung ungleich');
    nah(e.median.wert, 325.6518, 1e-6, 'Median h_i'); expect(Math.abs(e.median.wert - F.lung_ungleich.soll.medianMitHVorher), 'der IBM-Wert 319,24 ist es NICHT').toBeGreaterThan(5);
  });
});

describe('Sterbetafel: Beispiel mit 927 Fällen (KMsurv-Hilfeseite = Klein & Moeschberger 2003, Kap. 4 [Seite nicht beschafft]; Einzeldaten rekonstruiert) und Handbeispiel von Hand', () => {
  it('927 Fälle in 10 Intervallen (0, 2, 3, 5, 7, 11, 17, 25, 37, 53+): alle Spalten gleich KMsurv::lifetab (im Skript auf 1e-13), Median 11,2078 (h_i; mit h_(i-1) wären es 11,1385)', () => {
    const f = F.f927; const e = rechne(f.eingabe.zeit, f.eingabe.ereignis, f.frage.anfaenge); tafelGleich(e, f.soll, '927 Fälle');
    nah(e.median.wert, 11.2078, 1e-5, 'Median'); nah(f.soll.medianMitHVorher, 11.1385, 1e-4, 'Median mit h_(i-1) (nur zur Abgrenzung)');
    expect(e.zeilen.length).toBe(10); nah(e.zeilen[9].kum, 0, 0, 'letztes Intervall: alle sterben, P = 0'); nah(e.zeilen[9].seKum, 0, 1e-12, 'se(P) = 0, kein NaN');
  });
  it('Handbeispiel n = 12 (Intervalle 0, 4, 8, 12+): l = 12, 11, 6, 2; c = 0, 1, 2, 1; d = 1, 4, 2, 1; r = 12, 10,5, 5, 1,5 - von Hand gerechnet', () => {
    const h = F.hand; const e = rechne(h.eingabe.zeit, h.eingabe.ereignis, h.frage.anfaenge); tafelGleich(e, h.soll.gesamt, 'Hand');
    expect(e.zeilen.map((z: Z) => z.amAnfang)).toEqual([12, 11, 6, 2]); expect(e.zeilen.map((z: Z) => z.ausgeschieden)).toEqual([0, 1, 2, 1]); expect(e.zeilen.map((z: Z) => z.ereignisse)).toEqual([1, 4, 2, 1]); expect(e.zeilen.map((z: Z) => z.risiko)).toEqual([12, 10.5, 5, 1.5]);
    nah(e.zeilen[0].seKum, (11 / 12) * Math.sqrt(1 / 132), 1e-14, 'se(P1) von Hand = 11/12·√(1/132)'); nah(e.median.wert, 8 + (4 * (e.zeilen[1].kum - 0.5)) / (e.zeilen[1].kum - e.zeilen[2].kum), 1e-14, 'Median von Hand'); nah(e.median.wert, 9.188811, 1e-6, 'Median (Fachblatt)');
  });
  it('Gruppe 1 des Handbeispiels: im offenen Schlussintervall stirbt der letzte Fall, q = 1: P = 0, se(P) = 0, kein NaN, keine Dichte (offen)', () => {
    const h = F.hand; const i = (h.eingabe.gruppe as number[]).map((g, k) => (g === 0 ? k : -1)).filter(k => k >= 0);
    const e = rechne(i.map(k => h.eingabe.zeit[k]), i.map(k => h.eingabe.ereignis[k]), h.frage.anfaenge); tafelGleich(e, h.soll.gruppe1, 'Hand Gruppe 1');
    const z = e.zeilen[3]; expect([z.q, z.kum, z.seKum, z.dichte, z.hazard, z.seHazard]).toEqual([1, 0, 0, null, null, null]);
  });
  it('Eigenschaft: ohne Zensierte und mit höchstens einem Ereignis je Intervall ist die Tafel gleich Kaplan-Meier an den Intervallenden (10 Ereignisse bei 0,5; 1,5; … 9,5, Intervalle 0, 1, …, 9+): P = 0,9; 0,8; … ; 0', () => {
    const t = Array.from({ length: 10 }, (_, i) => i + 0.5), e = rechne(t, t.map(() => 1), Array.from({ length: 10 }, (_, i) => i));
    expect(e.zeilen.length).toBe(10); e.zeilen.forEach((z: Z, i: number) => { nah(z.kum, (9 - i) / 10, 1e-14, `P ${i}`); nah(z.q, 1 / (10 - i), 1e-14, `q ${i}`); });
    expect(e.zeilen.map((z: Z) => z.amAnfang)).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });
  it('Eigenschaft: der kumulierte Anteil fällt nie (lung, mehrere Breiten), liegt in [0; 1] und die Standardfehler sind endlich', () => {
    for (const b of [25, 50, 100, 150, 200]) {
      const a = intervallAnfaenge(lung.zeit, { breite: b, ende: 1000 }); const e = rechne(lung.zeit, lung.e, ok(a).anfaenge);
      e.zeilen.forEach((z: Z, i: number) => { expect(z.kum).toBeLessThanOrEqual(i === 0 ? 1 : e.zeilen[i - 1].kum + 1e-15); expect(z.kum).toBeGreaterThanOrEqual(0); expect(Number.isFinite(z.seKum)).toBe(true); });
      keinNaN(e, `Breite ${b}`);
    }
  });
});

describe('Sterbetafel: Ränder (nie NaN, immer eine Antwort)', () => {
  it('Zeit 0 und Zeit genau auf der Grenze: Zeit 10 gehört ins Intervall [10; 20), Zeit 0 ins erste; Zahlen von Hand (l = 7, 5, 2; c = 0, 1, 1; d = 2, 2, 1)', () => {
    const g = F.grenze; const e = rechne(g.eingabe.zeit, g.eingabe.ereignis, g.frage.anfaenge); tafelGleich(e, g.soll, 'Grenze');
    expect(e.zeilen.map((z: Z) => z.amAnfang)).toEqual([7, 5, 2]); expect(e.zeilen.map((z: Z) => z.ausgeschieden)).toEqual([0, 1, 1]); expect(e.zeilen.map((z: Z) => z.ereignisse)).toEqual([2, 2, 1]);
  });
  it('Median nicht erreicht (Beobachtung nach 150 Tagen beendet): erreicht = false, wert = null, kein NaN', () => {
    const g = F.nicht_erreicht; const e = rechne(g.eingabe.zeit, g.eingabe.ereignis, g.frage.anfaenge); tafelGleich(e, g.soll, 'nicht erreicht');
    expect(e.median).toEqual({ wert: null, erreicht: false, imOffenen: false }); expect(e.zeilen[e.zeilen.length - 1].kum).toBeGreaterThan(0.5);
  });
  it('Median fällt ins offene Schlussintervall: erreicht = false, imOffenen = true; das offene Intervall mit q = 1 hat P = 0', () => {
    const g = F.median_offen; const e = rechne(g.eingabe.zeit, g.eingabe.ereignis, g.frage.anfaenge); tafelGleich(e, g.soll, 'Median offen');
    expect(e.median).toEqual({ wert: null, erreicht: false, imOffenen: true }); expect(e.zeilen[1].kum).toBe(0);
  });
  it('ungültige Werte werden gezählt und ausgelassen: Zeit < 0, fehlend, NaN; Ereignis fehlend oder nicht 0/1', () => {
    const e = rechne([1, 2, 3, 4, -1, null as any, NaN, 5, 6], [1, 0, 1, 1, 1, 1, 1, null as any, 2], [0, 3]);
    expect(e.ausgeschlossen).toBe(5); expect(e.n).toBe(4); expect(e.ereignisse).toBe(3); expect(e.zensiert).toBe(1); keinNaN(e);
  });
  it('Fehler als Antwort statt Absturz: alle zensiert, alle Zeiten gleich, keine Fälle, zu wenige/zu viele Intervalle, Anfänge nicht aufsteigend oder nicht bei 0', () => {
    const code = (z: any, e: any, a: number[]) => { const r = sterbetafel(z, e, a) as Z; expect(r.ok).toBe(false); return r.code; };
    expect(code([1, 2, 3, 4], [0, 0, 0, 0], [0, 2])).toBe('kein-ereignis'); expect(code([5, 5, 5, 5], [1, 0, 1, 0], [0, 2])).toBe('alle-zeiten-gleich'); expect(code([], [], [0, 2])).toBe('keine-faelle'); expect(code([null, null], [1, 1], [0, 2])).toBe('keine-faelle');
    expect(code([1, 2, 3], [1, 0, 1], [0])).toBe('zu-wenige-intervalle'); expect(code([1, 2, 3], [1, 0, 1], Array.from({ length: 51 }, (_, i) => i))).toBe('zu-viele-intervalle');
    expect(code([1, 2, 3], [1, 0, 1], [0, 2, 2])).toBe('anfaenge'); expect(code([1, 2, 3], [1, 0, 1], [0, 3, 2])).toBe('anfaenge'); expect(code([1, 2, 3], [1, 0, 1], [1, 3])).toBe('anfaenge'); expect(code([1, 2, 3], [1, 0, 1], [0, NaN])).toBe('anfaenge');
    expect(sterbetafel(Array.from({ length: 4 }, (_, i) => i + 0.5), [1, 1, 1, 1], Array.from({ length: 50 }, (_, i) => i)).ok, 'genau 50 Intervalle gehen').toBe(true);
  });
  it('1000 Fälle: sofort fertig (Zeitgrenze 2 s)', () => {
    const zeit = Array.from({ length: 1000 }, (_, i) => ((i * 7919) % 997) + 0.25), ereignis = zeit.map((_, i) => (i % 3 === 0 ? 0 : 1)); const t0 = performance.now();
    const e = rechne(zeit, ereignis, Array.from({ length: 11 }, (_, i) => i * 100)); expect(performance.now() - t0).toBeLessThan(2000); keinNaN(e);
  });
});

describe('Intervalle: Voreinstellung der Breite und Aufrunden', () => {
  it('lung: Breite 100 (aus 1, 2, 5 · 10^k, nächster Wert zu 102,2 auf der Log-Skala), Ende 1000, 11 Anfänge', () => {
    const a = ok(intervallAnfaenge(lung.zeit)); expect([a.breite, a.ende, a.anfaenge.length, a.aufgerundet]).toEqual([F.intervalle.lung.breite, F.intervalle.lung.ende, F.intervalle.lung.anzahl, false]);
    expect(a.anfaenge).toEqual(ST100);
  });
  it('927-Beispiel: größte Zeit 55,1 → Breite 5, Ende 55, 12 Anfänge', () => {
    const a = ok(intervallAnfaenge(F.f927.eingabe.zeit)); expect([a.breite, a.ende, a.anfaenge.length]).toEqual([F.intervalle.f927.breite, F.intervalle.f927.ende, F.intervalle.f927.anzahl]); expect(Math.max(...F.f927.eingabe.zeit)).toBe(F.intervalle.f927.maxZeit);
  });
  it('angegebene Breite mit Ende, das kein Vielfaches ist, wird AUFGERUNDET (Ende 950 bei Breite 100 → 1000), die Breite bleibt', () => {
    const a = ok(intervallAnfaenge(lung.zeit, { breite: 100, ende: 950 })); expect([a.breite, a.ende, a.aufgerundet, a.anfaenge.length]).toEqual([100, 1000, true, 11]);
    const b = ok(intervallAnfaenge(lung.zeit, { breite: 100, ende: 900 })); expect([b.ende, b.aufgerundet]).toEqual([900, false]);
  });
  it('Fehler: Breite <= 0 oder nicht endlich, Ende 0 (nur ein Intervall), mehr als 50 Anfänge', () => {
    const code = (o: any) => (intervallAnfaenge(lung.zeit, o) as Z).code;
    expect(code({ breite: 0 })).toBe('breite'); expect(code({ breite: -5 })).toBe('breite'); expect(code({ breite: NaN })).toBe('breite'); expect(code({ breite: 100, ende: 0 })).toBe('zu-wenige-intervalle'); expect(code({ breite: 10, ende: 1000 })).toBe('zu-viele-intervalle');
    expect(ok(intervallAnfaenge(lung.zeit, { breite: 20, ende: 980 })).anfaenge.length, '50 Anfänge gehen').toBe(50);
  });
});

describe('Wilcoxon (Gehan), NÄHERUNGSWEISE (Opus 2): Zeit := Intervallanfang; gleich Paar-für-Paar-Rechnung und coin::logrank_test(type = "Gehan-Breslow") (im Skript)', () => {
  const sex = F.lung_geschlecht.soll.gehan as Z;
  it('lung nach Geschlecht: D = 13,52836, df 1, p = ,000235; die Summe der Punktzahlen ist 0 (mit +CE_k; mit −CE_k wie im IBM-Text gedruckt wäre sie es nicht)', () => {
    const g = gehanNaeherung(lung.zeit, lung.e, lung.sex, ST100)!; expect(g).not.toBeNull(); nah(g.D, sex.D, 1e-10, 'D'); nah(g.D, 13.52836, 1e-6, 'D (Fachblatt)'); expect(g.df).toBe(1); pNah(g.p, sex.p, 'p'); nah(g.summeS, 0, 1e-9, 'Summe der Punktzahlen');
  });
  it('mit Intervallen zu 50 Tagen (viele Bindungen weniger): Soll aus R, Summe 0', () => {
    const w = F.lung_geschlecht_50; const g = gehanNaeherung(lung.zeit, lung.e, lung.sex, w.frage.anfaenge)!; nah(g.D, w.soll.gehan.D, 1e-10, 'D'); pNah(g.p, w.soll.gehan.p, 'p'); nah(g.summeS, 0, 1e-9, 'Summe');
    expect(Math.abs(g.D - sex.D), 'die Breite der Intervalle ändert das Ergebnis').toBeGreaterThan(1e-3);
  });
  it('drei Gruppen (ph.ecog 0/1/2, n = 226): df = 2, gleich coin; Paare 0-1, 0-2, 1-2 einzeln', () => {
    const w = F.lung_ecog.soll; const i = lung.ecog.map((v, k) => (v !== null && v < 3 ? k : -1)).filter(k => k >= 0); expect(i.length).toBe(226);
    const zeit = i.map(k => lung.zeit[k]!), e = i.map(k => lung.e[k]!), g = i.map(k => lung.ecog[k]!);
    const r = gehanNaeherung(zeit, e, g, ST100)!; nah(r.D, w.gehan.D, 1e-10, 'D'); expect(r.df).toBe(2); pNah(r.p, w.gehan.p, 'p'); nah(r.summeS, 0, 1e-9, 'Summe');
    const pa = gehanPaarweise(zeit, e, g, ST100); expect(pa.map(x => [x.a, x.b])).toEqual([[0, 1], [0, 2], [1, 2]]);
    pa.forEach((x, k) => { nah(x.D, w.paarweise[k].D, 1e-10, `D ${x.a}-${x.b}`); expect(x.df).toBe(1); pNah(x.p, w.paarweise[k].p, `p ${x.a}-${x.b}`); });
  });
  it('Handbeispiel (zwei Gruppen zu je 6): D = 0,02993, p = ,8626', () => {
    const h = F.hand; const g = gehanNaeherung(h.eingabe.zeit, h.eingabe.ereignis, h.eingabe.gruppe, h.frage.anfaenge)!; nah(g.D, h.soll.gehan.D, 1e-10, 'D'); pNah(g.p, h.soll.gehan.p, 'p'); nah(g.summeS, 0, 1e-9, 'Summe');
  });
  it('Ränder: nur eine Gruppe → null; keine NaN bei lauter gleichen Werten', () => {
    expect(gehanNaeherung([1, 2, 3, 4], [1, 0, 1, 1], [0, 0, 0, 0], [0, 2])).toBeNull();
    const g = gehanNaeherung([1, 2, 3, 4], [1, 1, 1, 1], [0, 0, 1, 1], [0, 10]); if (g) keinNaN(g, 'Gehan, alle Zeiten im selben Intervall');
  });
});

describe('Sätze (deutsch, du): ganze Sätze, nie NaN', () => {
  it('Hauptsatz lung: Sterbetafel, Intervalle von 100 Tagen, n = 228, 165 Ereignisse, Median 319', () => {
    const t = sterbetafelHauptsatz(rechne(lung.zeit, lung.e, ST100), { breite: 100, einheit: 'Tagen' });
    expect(t).toMatch(/Sterbetafel/); expect(t).toContain('100 Tagen'); expect(t).toContain('n = 228'); expect(t).toContain('165'); expect(t).toMatch(/Median/); expect(t).toContain('319'); expect(t).not.toMatch(/NaN|undefined|null/); expect(t).toMatch(/[.!?]$/);
  });
  it('Hauptsatz bei nicht erreichtem Median sagt „nicht erreicht“ ohne Zahl-Unsinn', () => {
    const g = F.nicht_erreicht; const t = sterbetafelHauptsatz(rechne(g.eingabe.zeit, g.eingabe.ereignis, g.frage.anfaenge), { breite: 50, einheit: 'Tagen' }); expect(t).toMatch(/nicht/); expect(t).not.toMatch(/NaN|undefined|null/);
  });
  it('Testsatz: lung nach Geschlecht „χ²(1) = 13,53, p < ,001“, Handbeispiel „p = ,863“, drei Gruppen „χ²(2) = 18,34“', () => {
    const a = sterbetafelTestSatz({ D: sex().D, df: 1, p: sex().p }); expect(a).toMatch(/Gehan/); expect(a).toContain('χ²(1) = 13,53'); expect(a).toMatch(/p < ,001/);
    const h = F.hand.soll.gehan; expect(sterbetafelTestSatz({ D: h.D, df: 1, p: h.p })).toMatch(/p = ,863/);
    const e = F.lung_ecog.soll.gehan; expect(sterbetafelTestSatz({ D: e.D, df: 2, p: e.p })).toContain('χ²(2) = 18,34');
    function sex() { return F.lung_geschlecht.soll.gehan as Z; }
  });
  it('Fußsatz: Gehan gewichtet frühe Ereignisse stärker als der Log-Rank-Test; Test vor dem Blick auf die Daten wählen', () => {
    const t = sterbetafelFuss(); expect(t).toMatch(/Gehan/); expect(t).toMatch(/Log-Rank/); expect(t).toMatch(/früh/); expect(t).toMatch(/vor/);
  });
  it('Fußsatz B4 (SPSS-Vergleich): Gehan ungefähr, SPSS exakt - hier 13,528 gegen 12,777 - in Deutsch und Englisch', () => {
    try {
      s.einst.sprache = 'de'; const t = sterbetafelFuss();
      expect(t).toContain('Statable rechnet den Test nach Gehan ungefähr: Jede Zeit zählt als Anfang ihres Intervalls (in SPSS: /CALCULATE=APPROXIMATE, dort gleich).'); expect(t).toContain('hier 13,528, SPSS exakt 12,777');
      s.einst.sprache = 'en'; const e = sterbetafelFuss();
      expect(e).toContain('Statable computes the Gehan test approximately: each time counts as the start of its interval (in SPSS: /CALCULATE=APPROXIMATE, which gives the same).'); expect(e).toContain('here 13.528, SPSS exact 12.777');
    } finally { s.einst.sprache = 'de'; }
  });
});
