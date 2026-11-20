import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-d-erwartet.json';
import { leseCsv, zurEngine } from './einlesen';
import { nodeEngine } from './testengine';
import { regressionsModelle } from './regressionlesen';
import { intervall } from './bootstrap';
import { zufall } from './zufall';
import {
  effektNamen, intervalleAus, moderatorWerte, PROZESS_B, PROZESS_STARTWERT, prozessBefehl, prozessEffekte, prozessJackknife, prozessPruefung, prozessRechne, prozessSaetze, prozessZiehung, schaetze,
  vollstaendigeFaelle, type Modell, type ProzessDaten
} from './prozess';
import { s } from './sitzung.svelte';

/* ===== ROTE TESTS Welle S-D, G14: bedingte und serielle Mediation (PROCESS 7, 14, 6) - Prüfer; der Bauer A ändert Test und JSON nicht =====
 * Soll: scripts/spaeter-d-erwartet.R → testdaten/spaeter-d-erwartet.json (g14), Daten testdaten/prozess.csv (n = 150: x, w, m1, m2, y). Fachblatt docs/fachblaetter/SPAETER-D-PSYCHOLOGIE-MIXED-RECHNER.md Abschnitt 1 + „Entscheidungen Opus“ 1.
 * Zweite und dritte Quelle der Punktschätzer (im Skript gegengeprüft): R `lm`, `lavaan`, PSPP REGRESSION (hier im Test: dieselben Gleichungen durch die echte Engine), `mediation::mediate` (Formel).
 * Neues Modul `lib/prozess.ts` (reine Funktionen; PSPP rechnet nur die Regressionen, das Bootstrap ist eigener Code auf lib/bootstrap.ts). Alle Zahlen ohne Rundung. API:
 *
 *   type Modell = 6 | 7 | 14        (Rollen: x, m = erster/einziger Mediator, y, w = Moderator (7, 14), m2 = zweiter Mediator (6))
 *   interface ProzessDaten { x: number[]; m: number[]; y: number[]; w?: number[]; m2?: number[] }       nur vollständige Fälle
 *   PROZESS_B = 5000, PROZESS_STARTWERT = 20261008        (Entscheidung Opus: B = 5000, Perzentil ist Voreinstellung, BCa wählbar)
 *   effektNamen(modell, nW = 0): string[]
 *        7 und 14: ['index', 'bedingt1' … 'bedingt<nW>']        6: ['ind1','ind2','ind3','summe','c1','c2','c3','direkt','gesamt']
 *        Modell 7: θ(w) = (a1 + a3·w)·b, Index a3·b;  Modell 14: θ(w) = a·(b1 + b3·w), Index a·b3;  Modell 6: ind1 = a1b1, ind2 = a2b2, ind3 = a1·d21·b2, summe, c1 = ind1−ind2, c2 = ind1−ind3, c3 = ind2−ind3, direkt = c′, gesamt = c′ + summe
 *   schaetze(modell, d: ProzessDaten, wWerte?: number[]): Schaetzung        OLS in JS, ZENTRIERT wie das Fachblatt 1.3 (nur die beiden Faktoren eines Produkts, am Mittelwert der vollständigen Fälle)
 *        { modell; n; mittelW?; namen; effekte: number[] (in der Reihenfolge von effektNamen); direkt: number;
 *          gleichungen: Record<'m'|'m2'|'y', { terme: string[]; b: number[]; se: number[]; t: number[]; p: number[]; konstante: { b; se; t; p }; r2: number; df: number }> }
 *        Gleichungen und Terme (Reihenfolge): Modell 7: m: x, w, xw (zentriert; xw = Produkt der zentrierten) · y: x, m (roh)
 *                                              Modell 14: m: x (roh) · y: x (roh), m (zentriert), w (zentriert), mw (Produkt der zentrierten)
 *                                              Modell 6: m: x · m2: x, m · y: x, m, m2 (alle roh)       („m2“ als Schlüssel nur bei Modell 6)
 *        Die Effekte sind gegen die Zentrierung invariant (gleich wie roh gerechnet), die Einzelkoeffizienten nicht (Fachblatt 1.3).
 *   prozessEffekte(modell, d, indizes: Int32Array, wWerte?): number[]        die Effekte für eine Ziehung (Zeilennummern 0 … n−1, mit Zurücklegen), geschlossene OLS; Rangmangel: lauter NaN (nie 0, nie Ausnahme)
 *   prozessJackknife(modell, d, wWerte?): { t0: number[]; L: number[][] }        L[k][i] = (n − 1)(t0[k] − Effekt k ohne Fall i) mit festen W-Werten - genau wie boot::empinf(type = "jack")
 *        (Strom wie lib/bootstrap.ts `Ziehung`: zufall(startwert), je Ziehung indizes[i] = floor(rng() · n) nacheinander, sonst nichts aus dem Strom)
 *   prozessZiehung(modell, d, opt?: { startwert?: number; B?: number; wWerte?: number[] }): { ziehung: Ziehung; spalten: number[][]; namen: string[] }
 *        EINE gemeinsame Ziehung für alle Effekte (Muster mediationZiehung): ziehung.t = spalten[0] (der erste Effekt), die übrigen Effekte stehen in spalten[k], gleich lang und Ziehung für Ziehung dieselben;
 *        gleicher Startwert ⇒ gleiche Verteilung (auch bei anderer Blockgröße); die W-Werte bleiben in allen Ziehungen FEST (die der Originaldaten)
 *   intervalleAus(namen: string[], t0: number[], t: number[][], L: number[][] | null, art: 'perzentil' | 'bca', niveau = 0.95):
 *        { name; wert: number; lo: number | null; hi: number | null; art: 'perzentil' | 'bca'; wunsch: 'perzentil' | 'bca'; ungueltig: number; B: number; warnungen: string[] }[]
 *        je Effekt wie lib/bootstrap.ts `intervall`; BCa, das sich nicht berechnen lässt (z0 unendlich, a undefiniert), fällt auf das Perzentil-Intervall zurück: art 'perzentil', wunsch 'bca', die Warnung bleibt stehen
 *   moderatorWerte(w: number[], regel: 'perzentil' | 'sd' | 'eigen', eigen?: number[]):
 *        { regel: 'perzentil'|'sd'|'eigen'|'zwei'; werte: number[] /* verschiedene Werte aufsteigend *\/; perzentile?: number[] /* die drei Perzentile 16/50/84 (Typ 6), auch wenn gleich *\/;
 *          beobachtet: boolean[]; ausserhalb: boolean[] /* je Wert: außerhalb [Minimum; Maximum] von w *\/; zusammen: boolean /* Perzentile fielen zusammen *\/; einzig: boolean /* nur EIN verschiedener Wert *\/; zwei: boolean }
 *        Regel 'perzentil' = Typ 6 (nie Typ 7); hat w genau zwei verschiedene Werte, gilt regel 'zwei' und werte = diese beiden Werte
 *   prozessPruefung(modell, d: Partial<ProzessDaten>, namen?: Partial<Record<'x'|'m'|'y'|'w'|'m2', string>>):
 *        { fehler: null | 'n-zu-klein' | 'w-konstant' | 'm-zwei-werte' | 'y-zwei-werte' | 'rolle-doppelt'; hinweise: ('n-unter-30' | 'n-unter-50')[] }
 *        n < 10 gesperrt; n < 30 Hinweis (Hesterberg); n < 50 Hinweis nur bei Modell 7 und 14 (Wechselwirkung); M, M2 oder Y mit nur zwei Werten gesperrt (X mit zwei Werten ist erlaubt); dieselbe Spalte in zwei Rollen gesperrt
 *   vollstaendigeFaelle(modell, spalten: Partial<Record<'x'|'m'|'y'|'w'|'m2', (number | null)[]>>): { daten: ProzessDaten; n: number; ausgeschlossen: number; zeilen: number[] /* 1-basiert, ausgeschlossen *\/ }
 *        nur die Rollen des Modells zählen (7, 14: x m y w · 6: x m m2 y), listenweise
 *   prozessBefehl(modell, sp: { x: string; m: string; y: string; w?: string; m2?: string }, d: ProzessDaten): string        PSPP-Syntax: je Gleichung ein REGRESSION-Lauf in der Reihenfolge von `gleichungen` (7, 14: zwei; 6: drei),
 *        mit TEMPORARY + SELECT IF (nur vollständige Fälle) und den Hilfsspalten (zentriert, Produkt) per COMPUTE (nur für die Rechnung); `regressionsModelle(items)` liefert die Läufe, Terme in der Reihenfolge von `terme`
 *   prozessRechne(modell, d, opt?: { startwert?; B?; wWerte?; art?: 'perzentil' | 'bca' }): { modell; n; wWerte?: number[]; schaetzung: Schaetzung; intervalle: ReturnType<typeof intervalleAus>; B: number; startwert: number; art: 'perzentil' | 'bca'; ungueltig: number }
 *   prozessSaetze(erg: ReturnType<typeof prozessRechne>, bez: { x: string; m: string; y: string; w?: string; m2?: string }): string[]        ganze Sätze (Fachblatt 1.9), Sprache aus s.einst, nie p-Wert für Effekte, nie Sobel
 */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const E = (erwartet as any).g14;
const nah = (ist: number, soll: number, tol = 1e-9) => expect(Math.abs(ist - soll), `${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const nahListe = (ist: number[], soll: number[], tol = 1e-9) => { expect(ist.length, `Länge ${ist.length} gegen ${soll.length}`).toBe(soll.length); soll.forEach((x, i) => nah(ist[i]!, x, tol)); };
const dat = E.daten;
const daten = (modell: Modell, q = dat, mname = 'm1'): ProzessDaten => (modell === 6 ? { x: q.x, m: q[mname], m2: q.m2, y: q.y } : { x: q.x, m: q[mname], y: q.y, w: q.w });
const KEY: Record<Modell, string> = { 7: 'm7', 14: 'm14', 6: 'm6' };
const MODELLE: Modell[] = [7, 14, 6];
const wvon = (modell: Modell): number[] | undefined => (modell === 6 ? undefined : E[KEY[modell]].w_werte);
const ID = (n: number) => Int32Array.from({ length: n }, (_, i) => i);

describe('Namen der Effekte', () => {
  it('Modell 7 und 14: Index zuerst, dann ein bedingter Effekt je W-Wert; Modell 6: neun Effekte', () => {
    expect(effektNamen(7, 3)).toEqual(['index', 'bedingt1', 'bedingt2', 'bedingt3']); expect(effektNamen(14, 2)).toEqual(['index', 'bedingt1', 'bedingt2']);
    expect(effektNamen(6)).toEqual(['ind1', 'ind2', 'ind3', 'summe', 'c1', 'c2', 'c3', 'direkt', 'gesamt']);
  });
  it('Voreinstellungen: B = 5000, Startwert 20261008', () => { expect(PROZESS_B).toBe(5000); expect(PROZESS_STARTWERT).toBe(20261008); });
});

describe('Punktschätzer: Pfade, Standardfehler und Effekte gleich R lm (zentriert), lavaan und PSPP', () => {
  for (const mo of MODELLE) it(`Modell ${mo}: Gleichungen (b, SE, t, p, R², df) und Effekte`, () => {
    const soll = E[KEY[mo]], sc = schaetze(mo, daten(mo), wvon(mo));
    expect(sc.n).toBe(150); expect(sc.namen).toEqual(soll.namen);
    for (const [ziel, g] of Object.entries(soll.gleichungen) as [string, any][]) {
      const ist = sc.gleichungen[ziel as 'm']; expect(ist, `Gleichung ${ziel}`).toBeDefined();
      expect(ist.terme).toEqual(g.terme); nahListe(ist.b, g.b); nahListe(ist.se, g.se); nahListe(ist.t, g.t); nahListe(ist.p, g.p, 1e-6);
      nah(ist.konstante.b, g.konstante.b); nah(ist.konstante.se, g.konstante.se); nah(ist.r2, g.r2); expect(ist.df).toBe(g.df);
    }
    nahListe(sc.effekte, soll.effekte, 1e-9); nah(sc.direkt, soll.direkt, 1e-9);
  });
  it('Fachblatt 1.8 (6 Stellen): Modell 7 Index ,075212, bedingte Effekte ,024147 / ,090635 / ,188411; Modell 14 Index ,010796; Modell 6 Summe ,156913', () => {
    nahListe(schaetze(7, daten(7), E.w_werte.perz6).effekte, [0.075212, 0.024147, 0.090635, 0.188411], 2e-5);
    nahListe(schaetze(14, daten(14), E.w_werte.perz6).effekte, [0.010796, 0.088384, 0.097928, 0.111963], 2e-5);
    nahListe(schaetze(6, daten(6)).effekte.slice(0, 4), [0.075145, 0.052074, 0.029694, 0.156913], 2e-5);
  });
  it('Zentrierung: der Koeffizient von X im a-Pfad (Modell 7) ist der Effekt bei mittlerem W (,2450, SE ,0429), roh wäre er −,3262; der Index ist gleich', () => {
    const sc = schaetze(7, daten(7), wvon(7)), a = sc.gleichungen.m!;
    nah(a.b[0]!, 0.2450, 5e-5); nah(a.se[0]!, 0.0429, 5e-5); expect(Math.abs(a.b[0]! - E.roh_m7_a.b[0])).toBeGreaterThan(0.5);
    nah(a.b[2]!, E.roh_m7_a.b[2], 1e-9);   // der Koeffizient des Produkts ist invariant
    nah(sc.effekte[0]!, E.m7.effekte[0], 1e-9);
  });
  it('Zentrierung ändert die Effekte nicht: ungezentriert (prozessEffekte mit allen Zeilen) = zentriert (schaetze), alle Modelle, 1e-9', () => {
    for (const mo of MODELLE) nahListe(prozessEffekte(mo, daten(mo), ID(150), wvon(mo)), schaetze(mo, daten(mo), wvon(mo)).effekte, 1e-9);
  });
  it('Gesamteffekt-Identität (Modell 6): gesamt = direkt + Summe = Steigung von Y auf X allein', () => {
    const sc = schaetze(6, daten(6)); nah(sc.effekte[8]!, E.m6.gesamt_lm, 1e-9); nah(sc.effekte[8]!, sc.effekte[7]! + sc.effekte[3]!, 1e-12);
    nah(sc.effekte[3]!, sc.effekte[0]! + sc.effekte[1]! + sc.effekte[2]!, 1e-12); nah(sc.effekte[4]!, sc.effekte[0]! - sc.effekte[1]!, 1e-12); nah(sc.effekte[5]!, sc.effekte[0]! - sc.effekte[2]!, 1e-12); nah(sc.effekte[6]!, sc.effekte[1]! - sc.effekte[2]!, 1e-12);
    nah(sc.effekte[8]!, 0.3924460828, 1e-9);   // Fachblatt 1.2
  });
  it('Modell 6: vollständig standardisiert nur hier (Ind·SD(X)/SD(Y): ,1064 / ,0738 / ,0421); Hilfsfunktion über die Effekte', () => {
    const sd = (a: number[]) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
    const sc = schaetze(6, daten(6)), f = sd(dat.x) / sd(dat.y); nahListe(sc.effekte.slice(0, 3).map(v => v * f), E.m6.ind_std, 1e-9); nahListe(E.m6.ind_std, [0.1064, 0.0738, 0.0421], 6e-5);
  });
});

describe('Moderatorwerte: Typ 6 (nie Typ 7), Mittelwert ± SD, eigene Werte, Ränder', () => {
  const Fall = (name: string) => E.moderator.find((f: any) => f.name === name);
  it('Beispiel: 16./50./84. Perzentil nach Typ 6 = 2,216 / 3,100 / 4,400 (Typ 7 gäbe 2,284); alle drei kommen in den Daten vor oder liegen im Bereich', () => {
    const f = Fall('beispiel'), r = moderatorWerte(f.w, 'perzentil');
    nahListe(r.werte, f.perz6_verschieden, 1e-12); nahListe(r.perzentile!, f.perz6, 1e-12); expect(r.regel).toBe('perzentil');
    expect(r.werte[0]).toBeCloseTo(2.216, 12); expect(Math.abs(r.werte[0]! - f.perz7[0])).toBeGreaterThan(0.05); expect(r.ausserhalb).toEqual([false, false, false]);
    expect(r.zusammen).toBe(false); expect(r.einzig).toBe(false); expect(r.zwei).toBe(false);
  });
  it('Mittelwert ± 1 SD (2,181 / 3,318 / 4,455)', () => {
    const f = Fall('beispiel'), r = moderatorWerte(f.w, 'sd'); nahListe(r.werte, f.sd_werte, 1e-12); expect(r.regel).toBe('sd');
  });
  it('Likert 1 bis 5: der interpolierte Wert (4,84) kommt auf der Skala nicht vor - beobachtet = false', () => {
    const f = Fall('likert'), r = moderatorWerte(f.w, 'perzentil'); nahListe(r.werte, f.perz6_verschieden, 1e-12); expect(r.werte[r.werte.length - 1]).toBeCloseTo(4.84, 10);
    const zu = f.perz6_verschieden.map((v: number) => f.perz6.indexOf(v)); expect(r.beobachtet).toEqual(zu.map((i: number) => f.perz6_beobachtet[i])); expect(r.beobachtet).toContain(false);
  });
  it('zusammenfallende Perzentile (20 % Einsen: 0 / 0 / 1): die VERSCHIEDENEN Werte 0 und 1, zusammen = true; bei 15 % Einsen sind alle drei 0: nur ein Wert (einzig)', () => {
    const z = Fall('zusammen20'), r = moderatorWerte(z.w, 'perzentil'); expect(r.werte).toEqual([0, 1]); expect(r.perzentile).toEqual([0, 0, 1]); expect(r.zusammen).toBe(true); expect(r.einzig).toBe(false);
    const e = Fall('ein_wert15'), q = moderatorWerte(e.w, 'perzentil'); expect(q.werte).toEqual([0]); expect(q.zusammen).toBe(true); expect(q.einzig).toBe(true);
  });
  it('Moderator mit zwei Werten: regel zwei, die beiden Werte, kein Perzentil', () => {
    const f = Fall('zwei_werte'), r = moderatorWerte(f.w, 'perzentil'); expect(r.regel).toBe('zwei'); expect(r.zwei).toBe(true); expect(r.werte).toEqual([0, 1]);
  });
  it('Werte außerhalb [Minimum; Maximum]: eigene Werte 0,5 und 9 (Bereich 1 bis 7) und Mittel − SD unter dem Minimum', () => {
    const f = Fall('eigen_ausserhalb'), r = moderatorWerte(f.w, 'eigen', f.eigen); expect(r.werte).toEqual([0.5, 3.1, 9]); expect(r.ausserhalb).toEqual(f.eigen_ausserhalb); expect(r.ausserhalb).toEqual([true, false, true]); expect(r.regel).toBe('eigen');
    const g = Fall('schief_sd_ausserhalb'), q = moderatorWerte(g.w, 'sd'); expect(q.ausserhalb).toEqual(g.sd_ausserhalb); expect(q.ausserhalb[0]).toBe(true);
  });
  it('nie NaN, auch bei konstantem W', () => {
    const r = moderatorWerte([3, 3, 3, 3, 3], 'perzentil'); expect(r.werte.every(Number.isFinite)).toBe(true); expect(r.einzig).toBe(true);
  });
});

describe('Der Wert eines bedingten Effekts hängt an der Quantilregel (Befund 3) und an den W-Werten', () => {
  it('Typ 6 gegen Typ 7 und Mittel ± SD: bedingter Effekt beim niedrigen W (Modell 7: ,0241 / ,0293 / ,0215), Index gleich', () => {
    const a = schaetze(7, daten(7), E.w_werte.perz6), b = schaetze(7, daten(7), E.w_werte.perz7), c = schaetze(7, daten(7), E.w_werte.sd);
    nahListe(b.effekte, E.m7_perz7.effekte, 1e-9); nahListe(c.effekte, E.m7_sd.effekte, 1e-9); nah(a.effekte[0]!, b.effekte[0]!, 1e-12); nah(a.effekte[0]!, c.effekte[0]!, 1e-12);
    expect(a.effekte[1]!).toBeCloseTo(0.0241, 3); expect(b.effekte[1]!).toBeCloseTo(0.0293, 3); expect(c.effekte[1]!).toBeCloseTo(0.0215, 3);
    nahListe(schaetze(14, daten(14), E.w_werte.perz7).effekte, E.m14_perz7.effekte, 1e-9); nahListe(schaetze(14, daten(14), E.w_werte.sd).effekte, E.m14_sd.effekte, 1e-9);
  });
  it('W mit zwei Werten: Index = θ(1) − θ(0) genau (Modell 7 und 14); Fachblatt: ,164289 / ,060765 / ,225054', () => {
    const z = E.zwei_werte, d7 = daten(7, { ...dat, w: z.w }), r = schaetze(7, d7, [0, 1]);
    nahListe(r.effekte, z.m7.effekte, 1e-9); nah(r.effekte[2]! - r.effekte[1]!, r.effekte[0]!, 1e-12); nahListe(r.effekte, [0.164289, 0.060765, 0.225054], 2e-5);
    const r14 = schaetze(14, daten(14, { ...dat, w: z.w }), [0, 1]); nahListe(r14.effekte, z.m14.effekte, 1e-9); nah(r14.effekte[2]! - r14.effekte[1]!, r14.effekte[0]!, 1e-12);
  });
});

describe('Fälle mit Lücken: jedes Modell nimmt nur seine Spalten, alle Gleichungen dieselben Fälle', () => {
  const L = E.luecken;
  for (const mo of MODELLE) it(`Modell ${mo}: vollständige Fälle, n und Ausgeschlossene, Schätzer wie R auf den vollständigen Fällen`, () => {
    const soll = L.modelle[KEY[mo]], d = L.daten;
    const roh = mo === 6 ? { x: d.x, m: d.m1, m2: d.m2, y: d.y } : { x: d.x, m: d.m1, y: d.y, w: d.w };
    const v = vollstaendigeFaelle(mo, roh as any);
    expect(v.n).toBe(soll.n); expect(v.ausgeschlossen).toBe(soll.ausgeschlossen); expect(v.zeilen).toEqual(soll.zeilen_aus);
    const sc = schaetze(mo, v.daten, mo === 6 ? undefined : soll.w_werte);
    nahListe(sc.effekte, soll.effekte, 1e-9); for (const [ziel, g] of Object.entries(soll.gleichungen) as [string, any][]) { nahListe(sc.gleichungen[ziel as 'm']!.b, g.b); nahListe(sc.gleichungen[ziel as 'm']!.se, g.se); }
    if (mo === 6) nah(sc.effekte[8]!, soll.gesamt_lm, 1e-9);   // c = c′ + Σ gilt nur auf denselben Fällen
  });
  it('145 Fälle bei Modell 7 und 6, 5 ausgeschlossen (Fachblatt 1.10 Nr. 10: n im Satz)', () => { expect(L.modelle.m7.n).toBe(145); expect(L.modelle.m6.ausgeschlossen).toBe(5); });
});

describe('Bootstrap: eine gemeinsame Ziehung für alle Effekte, feste Ziehungen aus R (1e-9)', () => {
  for (const mo of MODELLE) {
    const F = E.bootstrap[KEY[mo]];
    it(`Modell ${mo}: Effekte einer festen Ziehung (die ersten vier Ziehungen von R boot) gleich R`, () => {
      const d = daten(mo);
      for (const z of F.ziehungen) nahListe(prozessEffekte(mo, d, Int32Array.from((z.idx as number[]).map(i => i - 1)), wvon(mo)), z.effekte, 1e-9);
    });
    it(`Modell ${mo}: Jackknife (n Auslassungen aller Gleichungen, W-Werte fest) gleich boot::empinf(type = "jack")`, () => {
      const jk = prozessJackknife(mo, daten(mo), wvon(mo)); expect(jk.L.length).toBe(F.namen.length); nahListe(jk.t0, F.effekte.map((e: any) => e.t0), 1e-9);
      F.jackknife_L.forEach((L: number[], k: number) => nahListe(jk.L[k]!, L, 1e-9));
    });
    for (const art of ['perzentil', 'bca'] as const) for (const niveau of [0.9, 0.95]) it(`Modell ${mo}: ${art === 'bca' ? 'BCa' : 'Perzentil'}-Intervall ${niveau * 100} % je Effekt an der festen Verteilung aus R (B = 5000)`, () => {
      const t = F.effekte.map((e: any) => e.t as number[]), t0 = F.effekte.map((e: any) => e.t0 as number), L = F.effekte.map((e: any) => e.L as number[]);
      const iv = intervalleAus(F.namen, t0, t, L, art, niveau);
      expect(iv.map(i => i.name)).toEqual(F.namen);
      F.effekte.forEach((e: any, k: number) => {
        const st = e.stufen.find((x: any) => x.niveau === niveau), r = iv[k]!;
        nah(r.lo!, art === 'bca' ? st.bca_lo : st.perz_lo, 1e-9); nah(r.hi!, art === 'bca' ? st.bca_hi : st.perz_hi, 1e-9); nah(r.wert, e.t0, 1e-12);
        expect(r.art).toBe(art); expect(r.wunsch).toBe(art); expect(r.B).toBe(F.B); expect(r.ungueltig).toBe(0);
      });
    });
  }
  it('der Index prüft die Moderation: Modell 14 schließt null ein (Perzentil und BCa), Modell 7 nicht; Befund 2', () => {
    for (const art of ['perzentil', 'bca'] as const) {
      const f14 = E.bootstrap.m14, f7 = E.bootstrap.m7;
      const i14 = intervalleAus(f14.namen, f14.effekte.map((e: any) => e.t0), f14.effekte.map((e: any) => e.t), f14.effekte.map((e: any) => e.L), art)[0]!;
      const i7 = intervalleAus(f7.namen, f7.effekte.map((e: any) => e.t0), f7.effekte.map((e: any) => e.t), f7.effekte.map((e: any) => e.L), art)[0]!;
      expect(i14.lo!).toBeLessThan(0); expect(i14.hi!).toBeGreaterThan(0); expect(i7.lo!).toBeGreaterThan(0);
      // dabei sind alle drei bedingten Effekte von Modell 14 einzeln von null verschieden (Fachblatt Befund 2)
      const alle = intervalleAus(f14.namen, f14.effekte.map((e: any) => e.t0), f14.effekte.map((e: any) => e.t), f14.effekte.map((e: any) => e.L), art);
      for (const b of alle.slice(1)) expect(b.lo!).toBeGreaterThan(0);
    }
  });
  it('Modell 6: alle drei Kontraste schließen null ein', () => {
    const f = E.bootstrap.m6, iv = intervalleAus(f.namen, f.effekte.map((e: any) => e.t0), f.effekte.map((e: any) => e.t), f.effekte.map((e: any) => e.L), 'perzentil');
    for (const n of ['c1', 'c2', 'c3']) { const r = iv.find(i => i.name === n)!; expect(r.lo!).toBeLessThan(0); expect(r.hi!).toBeGreaterThan(0); }
    for (const n of ['ind1', 'ind2', 'ind3', 'summe']) expect(iv.find(i => i.name === n)!.lo!).toBeGreaterThan(0);
  });
  it('BCa mit Rückfall: z0 unendlich (alle Ziehungen unter t0) → Perzentil-Intervall mit der Warnung, nie null/NaN', () => {
    const t = Array.from({ length: 999 }, (_, i) => -2 + (4 * i) / 998), L = Array.from({ length: 10 }, (_, i) => Math.sin(i + 1));
    const r = intervalleAus(['index'], [10], [t], [L], 'bca')[0]!;
    expect(r.wunsch).toBe('bca'); expect(r.art).toBe('perzentil'); expect(r.warnungen).toContain('z0unendlich');
    const p = intervalleAus(['index'], [10], [t], [L], 'perzentil')[0]!; expect(r.lo).toBe(p.lo); expect(r.hi).toBe(p.hi); expect(Number.isFinite(r.lo!) && Number.isFinite(r.hi!)).toBe(true);
  });
  it('alle L gleich 0 (a undefiniert): ebenfalls Rückfall auf das Perzentil mit der Warnung a-undefiniert', () => {
    const t = Array.from({ length: 999 }, (_, i) => Math.sin(i)), r = intervalleAus(['index'], [0.1], [t], [Array(10).fill(0)], 'bca')[0]!;
    expect(r.art).toBe('perzentil'); expect(r.warnungen).toContain('a-undefiniert'); expect(Number.isFinite(r.lo!)).toBe(true);
  });
});

describe('Ziehung in JS: gemeinsam, reproduzierbar, Rangmangel', () => {
  const d7 = daten(7), wv7 = wvon(7);
  it('gleicher Startwert ⇒ gleiche Verteilung für ALLE Effekte, auch bei anderer Blockgröße; anderer Startwert ⇒ andere', () => {
    const a = prozessZiehung(7, d7, { B: 300, wWerte: wv7 }), b = prozessZiehung(7, d7, { B: 300, wWerte: wv7 }), c = prozessZiehung(7, d7, { B: 300, startwert: 7, wWerte: wv7 });
    a.ziehung.weiter(300); for (let i = 0; i < 3; i++) b.ziehung.weiter(100); c.ziehung.weiter(300);
    expect(a.spalten).toEqual(b.spalten); expect(a.spalten[0]).not.toEqual(c.spalten[0]); expect(a.ziehung.t).toEqual(a.spalten[0]); expect(a.namen).toEqual(['index', 'bedingt1', 'bedingt2', 'bedingt3']);
    expect(a.spalten.every(sp => sp.length === 300)).toBe(true); expect(a.ziehung.startwert).toBe(PROZESS_STARTWERT); expect(a.ziehung.B).toBe(300);
  });
  it('Voreinstellung B = 5000 und Startwert 20261008', () => { const z = prozessZiehung(7, d7, { wWerte: wv7 }); expect(z.ziehung.B).toBe(5000); expect(z.ziehung.startwert).toBe(20261008); });
  it('derselben Ziehung gehören alle Effekte: bei zwei W-Werten ist der Index in JEDER Ziehung θ(1) − θ(0) (Modell 7 und 14)', () => {
    for (const mo of [7, 14] as const) {
      const z = prozessZiehung(mo, daten(mo, { ...dat, w: E.zwei_werte.w }), { B: 400, wWerte: [0, 1] }); z.ziehung.weiter(400);
      let gueltig = 0; for (let i = 0; i < 400; i++) { if (!Number.isFinite(z.spalten[0]![i]!)) continue; gueltig++; nah(z.spalten[2]![i]! - z.spalten[1]![i]!, z.spalten[0]![i]!, 1e-9); } expect(gueltig).toBeGreaterThan(390);
    }
  });
  it('Modell 6: in jeder Ziehung gilt gesamt = direkt + Summe, Summe = ind1 + ind2 + ind3 und c1 = ind1 − ind2', () => {
    const z = prozessZiehung(6, daten(6), { B: 300 }); z.ziehung.weiter(300); const [i1, i2, i3, su, c1, c2, c3, di, ge] = z.spalten as number[][];
    for (let i = 0; i < 300; i++) { nah(ge![i]!, di![i]! + su![i]!, 1e-9); nah(su![i]!, i1![i]! + i2![i]! + i3![i]!, 1e-9); nah(c1![i]!, i1![i]! - i2![i]!, 1e-9); nah(c2![i]!, i1![i]! - i3![i]!, 1e-9); nah(c3![i]!, i2![i]! - i3![i]!, 1e-9); }
  });
  it('W-Werte bleiben in allen Ziehungen fest: die Effekte einer Ziehung entsprechen prozessEffekte mit den Indizes des Stroms (zufall(startwert))', () => {
    const z = prozessZiehung(7, d7, { B: 20, startwert: 99, wWerte: wv7 }); z.ziehung.weiter(20); const rng = zufall(99);
    for (let b = 0; b < 20; b++) { const idx = new Int32Array(150); for (let i = 0; i < 150; i++) idx[i] = Math.floor(rng() * 150); const e = prozessEffekte(7, d7, idx, wv7); z.spalten.forEach((sp, k) => nah(sp[b]!, e[k]!, 1e-12)); }
  });
  it('Rangmangel (kleines n, Dummy mit einer einzigen 1): Ziehungen ohne diese Zeile sind ungültig - gezählt, alle Effekte NaN, nie 0 und keine Ausnahme', () => {
    const k = E.klein.daten, dk = daten(14, k), B = 300, sw = 11, rng = zufall(sw); let erwartet = 0;
    for (let b = 0; b < B; b++) { let drin = false; for (let i = 0; i < 12; i++) if (Math.floor(rng() * 12) === E.klein.einzige_eins - 1) drin = true; if (!drin) erwartet++; }
    expect(erwartet).toBeGreaterThan(0);
    const z = prozessZiehung(14, dk, { B, startwert: sw, wWerte: [2, 3, 4] }); z.ziehung.weiter(B);
    const rng2 = zufall(sw), ohne: boolean[] = []; for (let b = 0; b < B; b++) { let drin = false; for (let i = 0; i < 12; i++) if (Math.floor(rng2() * 12) === E.klein.einzige_eins - 1) drin = true; ohne.push(!drin); }
    ohne.forEach((o, b) => { if (o) z.spalten.forEach(sp => expect(Number.isNaN(sp[b]!), `Ziehung ${b} ohne Zeile 3: NaN`).toBe(true)); });
    const ungueltig = z.spalten[0]!.filter(v => !Number.isFinite(v)).length; expect(ungueltig).toBeGreaterThanOrEqual(erwartet); expect(ungueltig).toBeLessThanOrEqual(erwartet + 3);   // (Rangmangel auch bei sehr wenigen verschiedenen Zeilen möglich)
    for (let b = 0; b < B; b++) { const nanAnz = z.spalten.filter(sp => Number.isNaN(sp[b]!)).length; expect(nanAnz === 0 || nanAnz === z.spalten.length, `Ziehung ${b}`).toBe(true); }
    const iv = intervall(z.ziehung.t, z.ziehung.t0, 'perzentil', 0.95); expect(iv.ungueltig).toBe(ungueltig); expect(iv.B).toBe(B - ungueltig);
    expect(Number.isNaN(prozessEffekte(14, dk, Int32Array.from([0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]), [2, 3, 4])[0]!)).toBe(true);
  });
});

describe('Statistischer Test der JS-Ziehungen gegen die R-Referenz (B = 100 000 geschlossene Formeln; JS: 20 Startwerte mit B = 5000)', () => {
  for (const mo of MODELLE) it(`Modell ${mo}: Mittel der Perzentil- und BCa-Grenzen aus 20 Läufen innerhalb ${'4·√(1/20 + 1/20)'} · sd der R-Läufe von der Referenz`, () => {
    const M = E.monte_carlo[KEY[mo]], d = daten(mo), wv = wvon(mo), jk = prozessJackknife(mo, d, wv), namen = effektNamen(mo, wv?.length ?? 0); expect(M.namen).toEqual(namen);
    const summe = namen.map(() => ({ perz_lo: 0, perz_hi: 0, bca_lo: 0, bca_hi: 0 }));
    for (let r = 1; r <= 20; r++) {
      const z = prozessZiehung(mo, d, { B: 5000, startwert: 1000 + r, wWerte: wv }); z.ziehung.weiter(5000);
      namen.forEach((_, k) => { const p = intervall(z.spalten[k]!, jk.t0[k]!, 'perzentil', 0.95), b = intervall(z.spalten[k]!, jk.t0[k]!, 'bca', 0.95, jk.L[k]!);
        summe[k]!.perz_lo += p.lo! / 20; summe[k]!.perz_hi += p.hi! / 20; summe[k]!.bca_lo += b.lo! / 20; summe[k]!.bca_hi += b.hi! / 20; });
    }
    namen.forEach((n, k) => { for (const g of ['perz_lo', 'perz_hi', 'bca_lo', 'bca_hi'] as const) {
      const tol = M.toleranz_faktor * M.sd_r[k][g]; expect(Math.abs(summe[k]![g] - M.referenz[k][g]), `${n} ${g}: JS ${summe[k]![g]} gegen R ${M.referenz[k][g]} (Toleranz ${tol})`).toBeLessThanOrEqual(tol);
    } });
  }, 300000);
});

describe('Prüfungen und Ränder: gesperrt mit Code, nie NaN', () => {
  const d = (n: number, f: (i: number) => number = i => Math.sin(i * 1.7) * 3 + i * 0.1): ProzessDaten => ({ x: Array.from({ length: n }, (_, i) => f(i)), m: Array.from({ length: n }, (_, i) => Math.cos(i * 0.9) * 2 + i * 0.05), y: Array.from({ length: n }, (_, i) => Math.sin(i * 0.4) + i * 0.02), w: Array.from({ length: n }, (_, i) => Math.cos(i * 2.3) + 3), m2: Array.from({ length: n }, (_, i) => Math.sin(i * 3.1) + i * 0.03) });
  it('n < 10 gesperrt, n < 30 Hinweis, n < 50 Hinweis nur bei Wechselwirkung (7, 14)', () => {
    expect(prozessPruefung(7, d(9)).fehler).toBe('n-zu-klein'); expect(prozessPruefung(6, d(9)).fehler).toBe('n-zu-klein'); expect(prozessPruefung(7, d(10)).fehler).toBeNull();
    expect(prozessPruefung(7, d(29)).hinweise).toEqual(['n-unter-30', 'n-unter-50']); expect(prozessPruefung(6, d(29)).hinweise).toEqual(['n-unter-30']);
    expect(prozessPruefung(14, d(40)).hinweise).toEqual(['n-unter-50']); expect(prozessPruefung(6, d(40)).hinweise).toEqual([]); expect(prozessPruefung(7, d(150)).hinweise).toEqual([]);
  });
  it('konstantes W gesperrt; M, M2 oder Y mit nur zwei Werten gesperrt; X mit zwei Werten erlaubt', () => {
    const k = d(60); expect(prozessPruefung(7, { ...k, w: k.w!.map(() => 4) }).fehler).toBe('w-konstant'); expect(prozessPruefung(14, { ...k, w: k.w!.map(() => 4) }).fehler).toBe('w-konstant');
    expect(prozessPruefung(7, { ...k, m: k.m.map((_, i) => i % 2) }).fehler).toBe('m-zwei-werte'); expect(prozessPruefung(6, { ...k, m2: k.m2!.map((_, i) => i % 2) }).fehler).toBe('m-zwei-werte');
    expect(prozessPruefung(14, { ...k, y: k.y.map((_, i) => (i % 3 ? 1 : 0)) }).fehler).toBe('y-zwei-werte');
    expect(prozessPruefung(7, { ...k, x: k.x.map((_, i) => i % 2) }).fehler).toBeNull();
  });
  it('dieselbe Spalte in zwei Rollen gesperrt', () => { expect(prozessPruefung(7, d(60), { x: 'a', m: 'b', y: 'c', w: 'a' }).fehler).toBe('rolle-doppelt'); expect(prozessPruefung(6, d(60), { x: 'a', m: 'b', m2: 'b', y: 'c' }).fehler).toBe('rolle-doppelt'); expect(prozessPruefung(6, d(60), { x: 'a', m: 'b', m2: 'd', y: 'c' }).fehler).toBeNull(); });
});

describe('prozessRechne: alles zusammen, Sätze nennen Methode, B und Startwert', () => {
  it('Modell 7 (B = 2000): Index mit Intervall ohne null, drei bedingte Effekte, Metadaten', () => {
    const r = prozessRechne(7, daten(7), { B: 2000, wWerte: E.w_werte.perz6 }); expect(r.n).toBe(150); expect(r.B).toBe(2000); expect(r.startwert).toBe(20261008); expect(r.art).toBe('perzentil');
    expect(r.intervalle.map(i => i.name)).toEqual(['index', 'bedingt1', 'bedingt2', 'bedingt3']); nahListe(r.intervalle.map(i => i.wert), E.m7.effekte, 1e-9);
    expect(r.intervalle[0]!.lo!).toBeGreaterThan(0.02); expect(r.intervalle[0]!.hi!).toBeLessThan(0.14); expect(r.ungueltig).toBe(0);
  });
  it('gleicher Startwert ⇒ gleiche Intervalle (alle Effekte); anderer Startwert ⇒ andere', () => {
    const a = prozessRechne(14, daten(14), { B: 400, wWerte: E.w_werte.perz6 }), b = prozessRechne(14, daten(14), { B: 400, wWerte: E.w_werte.perz6 }), c = prozessRechne(14, daten(14), { B: 400, startwert: 5, wWerte: E.w_werte.perz6 });
    expect(a.intervalle).toEqual(b.intervalle); expect(a.intervalle[0]!.lo).not.toBe(c.intervalle[0]!.lo);
  });
  const bez = { x: 'Unterstützung', m: 'Selbstwirksamkeit', y: 'Wohlbefinden', w: 'Belastung', m2: 'Zuversicht' };
  it('Satz Modell 7 (Index ohne null): „hängt von … ab“, Index ,075, 16. Perzentil, Startwert; kein p-Wert, kein Sobel', () => {
    const t = prozessSaetze(prozessRechne(7, daten(7), { B: 1000, wWerte: E.w_werte.perz6 }), bez).join('\n');
    expect(t).toContain('Index der moderierten Mediation'); expect(t).toMatch(/hängt von Belastung ab/); expect(t).toContain(',075'); expect(t).toMatch(/16\. Perzentil.*2,22/); expect(t).toMatch(/50\. Perzentil.*3,10/); expect(t).toMatch(/84\. Perzentil.*4,40/);
    expect(t).toContain('Startwert 20261008'); expect(t).toMatch(/Perzentil-Intervall/); expect(t).toContain('Querschnitt'); expect(t).not.toMatch(/\bp\s*[=<]/); expect(t).not.toMatch(/Sobel/); expect(t).not.toMatch(/NaN|undefined/);
  });
  it('Satz Modell 14 (Index schließt null ein): trennt Index und Einzeleffekte - „Die Daten sichern nicht …“, behauptet keine Moderation', () => {
    const t = prozessSaetze(prozessRechne(14, daten(14), { B: 1000, wWerte: E.w_werte.perz6 }), bez).join('\n');
    expect(t).toContain('schließt null ein'); expect(t).toMatch(/Daten sichern nicht/); expect(t).not.toMatch(/hängt von Belastung ab/); expect(t).toContain(',011');
  });
  it('Satz Modell 6: nennt den Weg über beide Mediatoren, die Summe und die Kontraste (Einheit von Y)', () => {
    const t = prozessSaetze(prozessRechne(6, daten(6), { B: 1000 }), bez).join('\n');
    expect(t).toContain('beide Mediatoren hintereinander'); expect(t).toContain(',030'); expect(t).toContain(',157'); expect(t).toMatch(/Kontraste/); expect(t).toContain('Wohlbefinden'); expect(t).not.toMatch(/NaN|undefined/);
  });
});

describe('PSPP-Engine: dieselben Gleichungen durch REGRESSION (zweite Quelle der Punktschätzer, 1e-8)', () => {
  let e: Awaited<ReturnType<typeof nodeEngine>>;
  beforeAll(async () => { e = await nodeEngine(); const b = zurEngine(leseCsv(readFileSync(new URL('./testdaten/prozess.csv', import.meta.url), 'utf8'))); e.run(b.syntax, { '/import.csv': b.csv }); }, 120000);
  const sp = { x: 'x', m: 'm1', y: 'y', w: 'w', m2: 'm2' };
  for (const mo of MODELLE) it(`Modell ${mo}: ${mo === 6 ? 'drei' : 'zwei'} Läufe, Koeffizienten und Standardfehler wie R lm`, () => {
    const items = e.run(prozessBefehl(mo, mo === 6 ? { x: sp.x, m: sp.m, m2: sp.m2, y: sp.y } : { x: sp.x, m: sp.m, y: sp.y, w: sp.w }, daten(mo)));
    const ms = regressionsModelle(items), soll = Object.values(E[KEY[mo]].gleichungen) as any[]; expect(ms.length).toBe(soll.length);
    ms.forEach((m, i) => { nahListe(m.terme.map(t => t.b), soll[i].b, 1e-8); nahListe(m.terme.map(t => t.se), soll[i].se, 1e-8); nah(m.konstante.b, soll[i].konstante.b, 1e-8); nah(m.r2, soll[i].r2, 1e-8); });
  });
  it('Lücken: die Läufe nehmen nur vollständige Fälle des Modells (Modell 7: n = 145)', () => {
    const roh = readFileSync(new URL('./testdaten/prozess.csv', import.meta.url), 'utf8').trim().split('\n'); const kopf = roh[0]!.split(';');
    const zeilen = roh.slice(1).map(z => z.split(';')); const L = E.luecken.daten; kopf.forEach((k, j) => zeilen.forEach((z, i) => { z[j] = L[k][i] === null ? '' : z[j]!; }));
    const e2 = e; const csv = [kopf.join(';'), ...zeilen.map(z => z.join(';'))].join('\n'); const b = zurEngine(leseCsv(csv)); e2.run(b.syntax, { '/import.csv': b.csv });
    const items = e2.run(prozessBefehl(7, { x: 'x', m: 'm1', y: 'y', w: 'w' }, vollstaendigeFaelle(7, { x: L.x, m: L.m1, y: L.y, w: L.w }).daten));
    const ms = regressionsModelle(items); expect(ms[0]!.n).toBe(145); const soll = E.luecken.modelle.m7.gleichungen; nahListe(ms[0]!.terme.map(t => t.b), soll.m.b, 1e-8); nahListe(ms[1]!.terme.map(t => t.b), soll.y.b, 1e-8);
  });
});
