// ROT (Prüfer, Stufe 6.6, 09.11.2026): Retest-Reliabilität. Die ICC gibt es schon (lib/uebereinstimmung.ts); neu ist die Retest-Korrelation.
//
// ERWARTETE SCHNITTSTELLE (lib/ergebnis.ts):
//   iccErgebnis(spalten, daten, gesamt, modell?) liefert bei GENAU ZWEI Spalten zusätzlich das Feld `rtt: number`
//   (Pearson-Korrelation der beiden Spalten, „Retest-Korrelation r_tt“; vollständige Fälle). Bei drei und mehr Spalten bleibt `rtt` undefiniert.
//   saetzeIcc(r).zusatz nennt bei zwei Spalten „r_tt = ,93“ (Komma, zwei Stellen), damit der Wert im Text steht (der RCI setzt eine Reliabilität ein, oft r_tt).
// Sollwerte: app/src/lib/testdaten/split-half-retest-erwartet.json (R: cor, irr::icc twoway agreement/consistency single; scripts/split-half-retest-erwartet.R)
// und Abschnitt `spss.retest` (SPSS 32, 3 Stellen). Toleranz 1e-3.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { leseCsv } from './einlesen';
import { iccErgebnis, saetzeIcc } from './ergebnis';
import { icc } from './uebereinstimmung';

const soll = JSON.parse(readFileSync(new URL('./testdaten/split-half-retest-erwartet.json', import.meta.url), 'utf8')).retest;
const spss = JSON.parse(readFileSync(new URL('./testdaten/split-half-retest-erwartet.json', import.meta.url), 'utf8')).spss.retest;
const roh = leseCsv(readFileSync(new URL('./testdaten/retest-zwei-zeitpunkte.csv', import.meta.url), 'utf8'));
const t1 = roh.zeilen.map(z => Number(z[0])), t2 = roh.zeilen.map(z => Number(z[1]));
const daten = t1.map((v, i) => [v, t2[i]!]);
const nah = (a: number, b: number) => Math.abs(a - b) < 1e-3;

describe('Retest: ICC aus lib/uebereinstimmung.ts gegen R (irr::icc) und SPSS 32', () => {
  it('ICC(2,1) absolute Übereinstimmung mit 95-%-KI', () => {
    const r = icc(daten).absolut.einzel;
    expect(nah(r.icc, soll.icc21.icc) && nah(r.kiLo, soll.icc21.lo) && nah(r.kiHi, soll.icc21.hi)).toBe(true);
    expect(nah(r.icc, spss.icc21.icc) && nah(r.kiLo, spss.icc21.lo) && nah(r.kiHi, spss.icc21.hi)).toBe(true);
  });
  it('ICC(3,1) Konsistenz mit 95-%-KI', () => {
    const r = icc(daten).konsistenz.einzel;
    expect(nah(r.icc, soll.icc31.icc) && nah(r.kiLo, soll.icc31.lo) && nah(r.kiHi, soll.icc31.hi)).toBe(true);
    expect(nah(r.icc, spss.icc31.icc) && nah(r.kiLo, spss.icc31.lo) && nah(r.kiHi, spss.icc31.hi)).toBe(true);
  });
});

describe('Retest: neues Feld rtt (Pearson) bei genau zwei Spalten', () => {
  it('rtt stimmt mit R (cor) und SPSS (CORRELATIONS) überein', () => {
    const r = iccErgebnis(['t1', 't2'], daten, daten.length) as unknown as { rtt?: number };
    expect(r.rtt, 'iccErgebnis(...).rtt fehlt').toBeTypeOf('number');
    expect(Math.abs(r.rtt! - soll.rtt)).toBeLessThan(1e-3);
    expect(Math.abs(r.rtt! - spss.rtt)).toBeLessThan(1e-3);
  });
  it('bei drei Spalten gibt es kein rtt', () => {
    const r = iccErgebnis(['a', 'b', 'c'], daten.map((z, i) => [z[0]!, z[1]!, z[0]! + (i % 3)]), daten.length) as unknown as { rtt?: number };
    expect(r.rtt).toBeUndefined();
  });
  it('der Satz nennt r_tt', () => {
    const s = saetzeIcc(iccErgebnis(['t1', 't2'], daten, daten.length));
    expect(s.zusatz).toContain('r_tt = ,93');
  });
});