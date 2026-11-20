import { describe, expect, it } from 'vitest';
import SOLL from '../../../pruefdaten/mikro/geheim-soll.json';
import { s } from './sitzung.svelte';
import { geheimhalten, mitRaendern, rundeTabelle, schutzIntervall } from './geheimhaltung';

/* ===== Paket M2: Geheimhaltung in Tabellen (Fachblatt MIKRODATEN-2026-10-24, Abschnitt M2) =====
 * Sollwerte der Schutzintervalle: pruefdaten/mikro/geheim-soll.R (R lpSolve) -> geheim-soll.json. Die Sperrmuster dort stammen aus geheimhalten();
 * die Intervalle dazu rechnet R unabhängig. Strukturtests (Zelle n = 2 bei minN 3 gesperrt, keine Zeile/Spalte mit genau einer Sperrung) stehen direkt hier. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
type Iv = { zeile: number; spalte: number; wert: number; min: number | null; max: number | null }[];
type Fall = { name: string; tabelle: number[][]; gesperrt: number[][]; intervalle: Iv; intervalleEins: Iv };
const FAELLE = SOLL as unknown as Fall[];
const fall = (n: string) => FAELLE.find(f => f.name === n)!;
const innen = (t: number[][]) => t.slice(0, -1).map(z => z.slice(0, -1));
const nah = (ist: number, soll: number, was: string) => expect(Math.abs(ist - soll), `${was} (ist ${ist}, soll ${soll})`).toBeLessThanOrEqual(1e-6 * Math.max(1, Math.abs(soll)));

const einzeln = (g: boolean[][]) => {
  const bad: string[] = [];
  g.forEach((z, i) => { if (z.filter(Boolean).length === 1) bad.push(`Zeile ${i}`); });
  for (let j = 0; j < g[0]!.length; j++) if (g.filter(z => z[j]).length === 1) bad.push(`Spalte ${j}`);
  return bad;
};
let seed = 12345;
const zufall = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };

describe('Schutzintervall gegen R lpSolve', () => {
  for (const f of FAELLE) it(`Fall ${f.name}`, () => {
    const g = f.gesperrt.map(z => z.map(v => v === 1));
    const erg = schutzIntervall(f.tabelle, g);
    expect(erg.length).toBe(f.intervalle.length);
    f.intervalle.forEach((soll, k) => {
      const ist = erg[k]!;
      expect([ist.zeile, ist.spalte], 'Reihenfolge').toEqual([soll.zeile, soll.spalte]);
      nah(ist.min, soll.min!, `${f.name} min (${soll.zeile},${soll.spalte})`);
      nah(ist.max, soll.max!, `${f.name} max (${soll.zeile},${soll.spalte})`);
    });
  });
  for (const f of FAELLE) it(`Fall ${f.name} mit Untergrenze 1 (gesperrt heißt n ≥ 1)`, () => {
    const erg = schutzIntervall(f.tabelle, f.gesperrt.map(z => z.map(v => v === 1)), undefined, 0, 1);
    expect(erg.length).toBe(f.intervalleEins.length);
    f.intervalleEins.forEach((soll, k) => {
      nah(erg[k]!.min, soll.min!, `${f.name} min (${soll.zeile},${soll.spalte})`);
      nah(erg[k]!.max, soll.max!, `${f.name} max (${soll.zeile},${soll.spalte})`);
    });
  });
  it('Untergrenze 1 ändert das Ergebnis (Fall K-klein: [0, 2] wird genau 1) und geheimhalten() schützt auch dann', () => {
    const f = fall('K-klein'), g = f.gesperrt.map(z => z.map(v => v === 1));
    expect(schutzIntervall(f.tabelle, g, undefined, 0, 0)[0]!.sicher).toBe(true);
    expect(schutzIntervall(f.tabelle, g, undefined, 0, 1)[0]!.sicher).toBe(false);
    const n = innen(f.tabelle);
    const e = geheimhalten({ n });
    expect(e.geschuetzt).toBe(true);
    expect(e.intervalle.every(z => z.min >= 1 - 1e-9)).toBe(true);
    expect(e.gesamt).toBeGreaterThan(geheimhalten({ n }, { untergrenzeEins: false }).gesamt - 1);
    expect(geheimhalten({ n, wert: n.map(z => z.map(v => v * 2.5)) }).intervalle.some(z => z.min < 1)).toBe(true);
  });
  it('zu wenig gesperrt: Breite 0 wird als unsicher erkannt', () => {
    const f = fall('ohne-C'), erg = schutzIntervall(f.tabelle, f.gesperrt.map(z => z.map(v => v === 1)));
    expect(erg[0]!.sicher).toBe(false);
    const g = fall('C'), ok = schutzIntervall(g.tabelle, g.gesperrt.map(z => z.map(v => v === 1)));
    expect(ok.every(z => z.sicher)).toBe(true);
  });
  it('Schutzgrad: Breite muss mindestens p % des Werts sein', () => {
    const f = fall('A'), g = f.gesperrt.map(z => z.map(v => v === 1));
    const e0 = schutzIntervall(f.tabelle, g, undefined, 0), e100 = schutzIntervall(f.tabelle, g, undefined, 1000);
    expect(e0.every(z => z.sicher)).toBe(true);
    expect(e100.some(z => !z.sicher)).toBe(true);
  });
});

describe('Sperren', () => {
  it('Muster von A bis D wie in geheim-soll.R (Untergrenze 0, wie dort gerechnet)', () => {
    const T: Record<string, number[][]> = { A: innen(fall('A').tabelle), B: innen(fall('B').tabelle), C: innen(fall('C').tabelle), D: innen(fall('D').tabelle) };
    for (const [k, n] of Object.entries(T)) {
      const e = geheimhalten({ n }, { untergrenzeEins: false });
      expect(e.gesperrt.map(z => z.map(v => (v ? 1 : 0))), `Muster ${k}`).toEqual(fall(k).gesperrt);
      expect(e.geschuetzt, `geschützt ${k}`).toBe(true);
    }
  });
  it('Rechteck allein reicht nicht (Fall E, R: Zelle auf genau 2 festgelegt): Nachsperren schließt die Lücke', () => {
    const f = fall('E-nur-wuerfel'), erg = schutzIntervall(f.tabelle, f.gesperrt.map(z => z.map(v => v === 1)));
    const z = erg.find(x => x.zeile === 0 && x.spalte === 2)!;
    expect(z.breite).toBe(0);
    const e = geheimhalten({ n: innen(fall('E').tabelle) }, { untergrenzeEins: false });
    expect(e.gesperrt.map(r => r.map(v => (v ? 1 : 0)))).toEqual(fall('E').gesperrt);
    expect(e.geschuetzt).toBe(true);
  });
  it('Zelle mit n = 2 bei minN 3 ist primär gesperrt, bei minN 2 nicht', () => {
    const n = [[10, 2], [20, 30]];
    const e = geheimhalten({ n });
    expect(e.status[0]![1]).toBe('primaer'); expect(e.grund[0]![1]).toBe('minN');
    expect(e.primaer).toBe(1);
    const e2 = geheimhalten({ n }, { minN: 2 });
    expect(e2.status[0]![1]).toBe('frei'); expect(e2.gesamt).toBe(0);
  });
  it('leere Zellen werden nie gesperrt, Ränder zählen als Zellen', () => {
    const e = geheimhalten({ n: [[0, 1], [0, 5]] });
    expect(e.gesperrt[0]![0] || e.gesperrt[1]![0] || e.gesperrt[2]![0]).toBe(false);
    expect(e.status[0]![1]).toBe('primaer');
    // Randzelle: Zeilensumme 2 (< 3) ist selbst primär
    const f = geheimhalten({ n: [[1, 1], [10, 10]] });
    expect(f.status[0]![2]).toBe('primaer');
    expect(f.n[2]![2]).toBe(22);
  });
  it('Keine Zeile und keine Spalte mit genau einer Sperrung; alle primären Zellen geschützt (200 Zufallstabellen)', () => {
    let geprueft = 0;
    for (let t = 0; t < 200; t++) {
      const R = 2 + Math.floor(zufall() * 7), C = 2 + Math.floor(zufall() * 7);
      const n = Array.from({ length: R }, () => Array.from({ length: C }, () => { const u = zufall(); return u < 0.15 ? 0 : u < 0.4 ? 1 + Math.floor(zufall() * 2) : 3 + Math.floor(zufall() * 40); }));
      const e = geheimhalten({ n });
      if (e.ungeschuetzt.length) continue;   // Sonderfall durch leere Zellen, eigener Test
      geprueft++;
      expect(einzeln(e.gesperrt), `Tabelle ${t}`).toEqual([]);
      expect(e.intervalle.filter(z => z.primaer && !z.sicher), `Intervall Tabelle ${t} ${JSON.stringify(n)} ${JSON.stringify(e.gesperrt)}`).toEqual([]);
      for (let i = 0; i <= R; i++) for (let j = 0; j <= C; j++) if (e.n[i]![j] === 0) expect(e.gesperrt[i]![j]).toBe(false);
    }
    expect(geprueft).toBeGreaterThan(150);
  });
  it('ist deterministisch', () => {
    const n = [[1, 5, 9, 4], [6, 2, 8, 7], [3, 3, 3, 9]];
    expect(geheimhalten({ n }).gesperrt).toEqual(geheimhalten({ n }).gesperrt);
  });
  it('Zeile ohne Fälle und eine einzige Zelle: wirft nicht, leere Zellen bleiben frei, keine einzelne Sperrung', () => {
    for (const n of [[[1, 5], [0, 0]], [[1, 0], [0, 0]], [[0, 0], [0, 0]]]) {
      const e = geheimhalten({ n });
      expect(einzeln(e.gesperrt)).toEqual([]);
      expect(e.gesperrt[1]![0] || e.gesperrt[1]![1]).toBe(false);
    }
    expect(geheimhalten({ n: [] }).protokoll[0]).toContain('leer');
  });
  it('30 × 30 rechnet zügig', () => {
    const n = Array.from({ length: 30 }, () => Array.from({ length: 30 }, () => { const u = zufall(); return u < 0.08 ? 1 : u < 0.12 ? 2 : 5 + Math.floor(zufall() * 50); }));
    const t0 = Date.now(), e = geheimhalten({ n });
    expect(Date.now() - t0).toBeLessThan(20000);
    expect(einzeln(e.gesperrt)).toEqual([]);
    expect(e.intervalle.filter(z => z.primaer).every(z => z.sicher)).toBe(true);
  });
});

describe('Dominanz- und p-%-Regel', () => {
  const n = [[3, 3], [5, 5]];
  const beitraege = [[[90, 5, 5], [34, 33, 33]], [[20, 20, 20, 20, 20], [30, 25, 20, 15, 10]]];
  it('Dominanz (n = 1, k = 85): 90 von 100 ist gesperrt, 34 von 100 nicht', () => {
    const e = geheimhalten({ n, beitraege }, { dominanz: {} });
    expect(e.status[0]![0]).toBe('primaer'); expect(e.grund[0]![0]).toBe('dominanz');
    expect(e.status[0]![1]).not.toBe('primaer');
    expect(e.protokoll.join(' ')).toContain('85');
  });
  it('Dominanz mit n = 2, k = 60: 30 + 25 von 100 reicht nicht, 55 von 100 nicht; 90 + 5 ja', () => {
    const e = geheimhalten({ n, beitraege }, { dominanz: { n: 2, k: 60 } });
    expect(e.grund[0]![0]).toBe('dominanz'); expect(e.status[1]![1]).not.toBe('primaer');
  });
  it('p-%-Regel: (Wert − x1 − x2) < p/100 · x1', () => {
    // Zelle [50, 45, 2]: 97 − 95 = 2 < 5 → gesperrt; Zelle [50, 30, 20]: 20 < 5 nicht
    const e = geheimhalten({ n: [[3, 3], [5, 5]], beitraege: [[[50, 45, 2], [50, 30, 20]], [[20, 20, 20, 20, 20], [30, 25, 20, 15, 10]]] }, { prozent: 10 });
    expect(e.grund[0]![0]).toBe('prozent'); expect(e.status[0]![1]).not.toBe('primaer');
  });
  it('Regeln sind standardmäßig aus; minN geht vor', () => {
    expect(geheimhalten({ n, beitraege }).primaer).toBe(0);
    const e = geheimhalten({ n: [[2, 3], [5, 5]], beitraege }, { dominanz: {} });
    expect(e.grund[0]![0]).toBe('minN');
  });
  it('ohne Beiträge: Hinweis im Protokoll', () => {
    expect(geheimhalten({ n }, { dominanz: {} }).protokoll.join(' ')).toContain('Beiträge');
  });
});

describe('Runden', () => {
  it('Basis 3, konventionell', () => {
    const r = rundeTabelle([[0, 1, 2, 4, 5, 7, 8]], 3).tabelle[0]!;
    expect(r.slice(0, 7)).toEqual([0, 0, 3, 3, 6, 6, 9]);
  });
  it('Basis 5 und 10: die Hälfte der Basis wird aufgerundet', () => {
    expect(rundeTabelle([[2, 3, 7, 12, 13]], 5).tabelle[0]!.slice(0, 5)).toEqual([0, 5, 5, 10, 15]);
    expect(rundeTabelle([[4, 5, 14, 15, 25]], 10).tabelle[0]!.slice(0, 5)).toEqual([0, 10, 10, 20, 30]);
  });
  it('Ränder getrennt gerundet; Hinweis, wenn Summen abweichen', () => {
    const r = rundeTabelle([[1, 1], [1, 1]], 3);
    expect(r.tabelle).toEqual([[0, 0, 3], [0, 0, 3], [3, 3, 3]]);
    expect(r.summenAbweichend).toBe(true);
    expect(r.hinweis).toContain('Summen können abweichen');
    expect(rundeTabelle([[3, 6], [9, 12]], 3).summenAbweichend).toBe(false);
  });
  it('mitRaendern', () => {
    expect(mitRaendern([[1, 2], [3, 4]])).toEqual([[1, 2, 3], [3, 4, 7], [4, 6, 10]]);
  });
});
