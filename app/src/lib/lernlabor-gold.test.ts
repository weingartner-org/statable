/* Welle 6, L4 „Lernlabor“: „Goldene Zahlen“ (Fachblatt (5)). Ein fester Lauf mit Startwert 1 wird als Regressionstest abgelegt: er schützt vor einer ungewollten Änderung
 * der Zufallsfolge oder der Umrechnung, er beweist KEINE Richtigkeit (die prüft lernlabor.test.ts über Eigenschaften). Ändern sich diese Zahlen absichtlich
 * (z. B. neuer Erzeuger), müssen sie bewusst neu erzeugt werden - und alle gespeicherten „Startwert 1“-Beispiele in Hilfe und Schule gelten dann nicht mehr.
 * Dazu: Stückelung ändert nichts (ein Lauf in vielen kleinen Schritten = ein Lauf am Stück), und die eigenen Helfer gegen bekannte Werte (R). */
import { describe, expect, it } from 'vitest';
import * as L from './lernlabor';
import { zufall } from './zufall';
import { tQuantil } from './verteilung';
import { wilsonIntervall } from './kennzahlen';

const nah = (ist: number, soll: number, rel = 1e-12) => expect(Math.abs(ist - soll)).toBeLessThanOrEqual(rel * Math.max(1e-300, Math.abs(soll)));
const nahe = (ist: number[], soll: number[]) => { expect(ist.length).toBe(soll.length); ist.forEach((v, i) => nah(v, soll[i]!)); };

describe('Goldene Zahlen: fester Lauf mit Startwert 1', () => {
  it('Erzeuger und Teilströme', () => {
    nahe(Array.from({ length: 3 }, zufall(1)), [0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
    expect([L.teilstrom(1, 0), L.teilstrom(1, 1), L.teilstrom(2, 0)]).toEqual([1989183610, 2712350597, 797705063]);
  });
  it('Stichprobenverteilung: Exponential(1), n = 10, B = 1000 und Anteil p = 0,3, n = 50', () => {
    const e = L.stichprobenverteilung({ pop: { art: 'exponential', rate: 1 }, n: 10, B: 1000, startwert: 1 });
    nah(e.mittelDerWerte, 0.9994105901803618); nah(e.empirischerSE, 0.3104217583777295); nahe(e.werte.slice(0, 3), [1.547214025557946, 0.9088005254086301, 1.0145682403894274]);
    const a = L.stichprobenverteilung({ pop: { art: 'anteil', p: 0.3 }, n: 50, B: 1000, startwert: 1 });
    nah(a.mittelDerWerte, 0.29951999999999956); nah(a.empirischerSE, 0.0631296677874591); nahe(a.werte.slice(0, 3), [0.22, 0.46, 0.34]);
  });
  it('Bootstrap: Reihe aus Kachel L4 b (n = 10), B = 1000', () => {
    const b = L.bootstrap({ daten: [12, 15, 9, 20, 14, 11, 18, 13, 16, 10], B: 1000, niveau: 0.95, startwert: 1 });
    nah(b.se, 1.0677863445828821); expect([b.lo, b.hi]).toEqual([11.8, 15.8]); nah(b.tLo, 11.280968393170298); nah(b.tHi, 16.319031606829704); nahe(b.werte.slice(0, 3), [12.5, 13, 11.4]);
  });
  it('Randomisierung: 5 gegen 6 Werte (462 Aufteilungen), B = 1000; die Vollauszählung gibt 8 von 462', () => {
    const r = L.randomisierung({ g1: [12, 15, 9, 20, 14], g2: [8, 10, 7, 11, 6, 9], B: 1000, startwert: 1 });
    expect(r.anzahl).toBe(23); nah(r.p, 24 / 1001); nahe(r.werte.slice(0, 3), [-1.4666666666666668, 0.7333333333333343, 4.4]);
    nah(r.welch.t, 2.791003326908703, 1e-12); nah(r.welch.df, 5.404041409516226, 1e-12); nah(r.welch.p, 0.03527700952702898, 1e-12);
    expect(L.randomisierungExakt([12, 15, 9, 20, 14], [8, 10, 7, 11, 6, 9])).toEqual({ p: 8 / 462, anzahl: 8, gesamt: 462 });
  });
  it('Zufallsexperimente: Münze, zwei Würfel, gezinkter Würfel, Urne (N = 1000)', () => {
    const m = L.muenzwurf({ p: 0.5, N: 1000, startwert: 1 });
    expect(m.treffer).toBe(524); nahe(m.verlauf.slice(0, 5), [0, 0, 1 / 3, 0.5, 0.4]);
    expect(L.wuerfelwurf({ wuerfel: 2, N: 1000, startwert: 1 }).haeufigkeit).toEqual([0, 0, 24, 60, 78, 111, 139, 149, 154, 126, 70, 47, 42]);
    expect(L.wuerfelwurf({ wuerfel: 1, p: [0.1, 0.1, 0.1, 0.1, 0.1, 0.5], N: 1000, startwert: 1 }).haeufigkeit).toEqual([0, 101, 105, 110, 100, 108, 476]);
    expect(L.urne({ rot: 3, blau: 7, ziehungen: 4, mitZuruecklegen: false, N: 1000, startwert: 1 }).haeufigkeit).toEqual([167, 524, 275, 34, 0]);
    expect(L.urne({ rot: 3, blau: 7, ziehungen: 4, mitZuruecklegen: true, N: 1000, startwert: 1 }).haeufigkeit).toEqual([252, 430, 232, 81, 5]);
  });
  it('Überdeckung: 100 Wilson-Intervalle (p = 0,3, n = 40) mit Wald; 100 t-Intervalle (Normal(50; 10), n = 12)', () => {
    const a = L.ueberdeckung({ art: 'anteil', p: 0.3, n: 40, niveau: 0.95, startwert: 1, mitWald: true });
    expect(a.ueberdeckt).toBe(95); expect(a.waldUeberdeckt).toBe(93);
    const i = a.intervalle[0]!; expect(i.treffer).toBe(15); nah(i.lo, 0.24222979167233274); nah(i.hi, 0.5296756086269889); nah(i.wald!.lo, 0.22497151011389663); nah(i.wald!.hi, 0.5250284898861034);
    const m = L.ueberdeckung({ art: 'mittel', mu: 50, sigma: 10, n: 12, niveau: 0.95, startwert: 1 });
    expect(m.ueberdeckt).toBe(98); nah(m.intervalle[0]!.lo, 47.67993080111656); nah(m.intervalle[0]!.hi, 61.215172801431);
  });
});

describe('Läufe in Stücken: dasselbe Ergebnis wie am Stück', () => {
  it('Stichprobenverteilung, Bootstrap und Randomisierung in Schritten von 1 ms bzw. 0 ms', async () => {
    const eins = { pop: { art: 'normal', mu: 5, sigma: 2 } as L.Population, n: 20, B: 3000, startwert: 4 };
    const stuecke = await L.laufeInStuecken(L.stichprobenverteilungLauf(eins), () => true, undefined, 0);
    expect(stuecke).toEqual(L.stichprobenverteilung(eins));
    const bo = { daten: [3, 5, 8, 9, 12, 15, 4, 6], B: 3000, niveau: 0.9, startwert: 4 };
    expect(await L.laufeInStuecken(L.bootstrapLauf(bo), () => true, undefined, 0)).toEqual(L.bootstrap(bo));
    const ra = { g1: [5, 7, 9, 12], g2: [3, 4, 8], B: 3000, startwert: 4 };
    expect(await L.laufeInStuecken(L.randomisierungLauf(ra), () => true, undefined, 0)).toEqual(L.randomisierung(ra));
  });
  it('Abbruch: weiter() = false gibt undefined zurück, der Fortschritt steigt', async () => {
    const l = L.stichprobenverteilungLauf({ pop: { art: 'wuerfel' }, n: 50, B: 20000, startwert: 1 }), anteile: number[] = []; let schritte = 0;
    const r = await L.laufeInStuecken(l, () => ++schritte < 3, a => anteile.push(a), 0);
    expect(r).toBeUndefined(); expect(anteile.length).toBeGreaterThan(0); expect(anteile.at(-1)!).toBeLessThan(1);
    expect(() => l.ergebnis()).toThrow();
  });
});

describe('Eigene Helfer gegen bekannte Werte (R)', () => {
  it('t-Quantil und Wilson: qt(0,975; 9) = 2,262157162740992; Wilson 7/40 = [0,0875; 0,3195] (Fachblatt); Rand x = 0 und x = n', () => {
    nah(tQuantil(0.975, 9), 2.262157162798205, 1e-12); nah(tQuantil(0.975, 1), 12.70620473617469, 1e-12); nah(tQuantil(0.995, 1000), 2.58075469806595, 1e-12);
    const w = wilsonIntervall(7, 40, 0.95); expect(Math.round(w.lo * 1e4) / 1e4).toBe(0.0875); expect(Math.round(w.hi * 1e4) / 1e4).toBe(0.3195);
    expect(wilsonIntervall(0, 10, 0.95).lo).toBe(0); expect(wilsonIntervall(10, 10, 0.95).hi).toBe(1);
  });
  it('Binomial und hypergeometrisch: dbinom(3; 10; 0,5) = 0,1171875; Lotto 6 aus 49: P(2 Richtige) = 15·123410/13983816', () => {
    nah(L.dbinom(3, 10, 0.5), 0.1171875, 1e-13); nah(L.dhyper(2, 49, 6, 6), (15 * 123410) / 13983816, 1e-12);
    let s = 0; for (let k = 0; k <= 20; k++) s += L.dbinom(k, 20, 0.3); nah(s, 1, 1e-13);
    s = 0; for (let k = 0; k <= 6; k++) s += L.dhyper(k, 49, 6, 6); nah(s, 1, 1e-13);
    nah(L.dbinom(0, 1000000, 1e-6), Math.exp(-1) * (1 - 5e-7), 1e-6);
  });
  it('Vollauszählung: mehr als 20 000 Aufteilungen → null; Zählung der Aufteilungen', () => {
    expect(L.aufteilungen(6, 3)).toBe(20); expect(L.aufteilungen(40, 20)).toBe(Infinity); expect(L.aufteilungen(15, 7)).toBe(6435);
  });
  it('Histogramm: gleiche Anzahl in den Klassen, Fläche 1; mit Gitter eine Säule je möglichem Wert', () => {
    const h = L.histogramm(Array.from({ length: 1000 }, (_, i) => i / 100)), flaeche = h.dichte.reduce((s, d, i) => s + d * (h.kanten[i + 1]! - h.kanten[i]!), 0);
    nah(flaeche, 1, 1e-12); expect(h.zaehler.reduce((a, b) => a + b, 0)).toBe(1000); expect(h.diskret).toBe(false);
    const g = L.histogramm([0, 0.2, 0.2, 0.6, 0.6, 0.6], 0.2); expect(g.diskret).toBe(true); expect(g.zaehler).toEqual([1, 2, 0, 3]); nah(g.kanten[0]!, -0.1, 1e-12);
  });
});
