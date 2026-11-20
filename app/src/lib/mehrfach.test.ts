import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mehrfachRechnen, optionenGeordnet, optionsNamenAus, schlageSetsVor, setNameFehler, zaehlwertVorschlag, type MehrfachSet, type Zelle } from './mehrfach';
import type { Spalte } from './verzeichnis';

/* Vergleichswerte aus R (scripts/mehrfach-erwartet.R, set.seed(20261008)) auf testdaten/mehrfach-medien.csv: 40 Fälle, 6 Medien-Spalten (0/1, leer = fehlend), Gruppe 1/2.
 * Rechenweg wie SPSS MULT RESPONSE (Mehrfachdichotomie, Zählwert 1): gültig = mindestens eine 1; Prozent der Antworten = n / alle Antworten; Prozent der Fälle = n / gültige Fälle.
 * IBM-Dokumentation (MISSING Subcommand der MULT RESPONSE): „a case is considered missing if none of the component variables contains the tabulating value“. */
const roh = readFileSync(new URL('./testdaten/mehrfach-medien.csv', import.meta.url), 'utf8').trim().split('\n').map(z => z.split(';'));
const kopf = roh[0]!;
const zeilen: Zelle[][] = roh.slice(1).map(z => z.map(t => (t.trim() === '' ? null : Number(t.replace(',', '.')))));
const sp = (n: string): Spalte => ({ name: n, bezeichnung: '', art: 'zahl', niveau: 'nominal', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {} });
const spalten = kopf.map(sp);
const medien = kopf.filter(n => n.startsWith('medien_'));
const spaltenWerte = (namen: string[]) => zeilen.map(z => namen.map(n => z[kopf.indexOf(n)]!));
const set: MehrfachSet = { name: 'medien', label: 'Genutzte Medien', spalten: medien, zaehlwert: 1 };
const gi = kopf.indexOf('gruppe');
const rechne = (mitNull: boolean, gruppe = false) => mehrfachRechnen({
  set, optionsNamen: medien, zeilen: spaltenWerte(medien), fehlend: medien.map(() => []), mitNull,
  ...(gruppe ? { gruppe: { spalte: 'gruppe', name: 'Gruppe', werte: zeilen.map(z => z[gi]!), fehlend: [], stufenName: (w: string | number) => `G${w}` } } : {})
});
const rund = (v: number) => Number(v.toFixed(6));

describe('Mehrfachantworten gegen R', () => {
  it('Häufigkeiten (Standard: gültig = mindestens eine Ankreuzung)', () => {
    const m = rechne(false);
    expect([m.faelle, m.fehlend, m.antworten, m.ohneAnkreuzung, m.zeilen]).toEqual([31, 9, 72, 0, 40]);
    expect(m.optionen.map(o => o.anzahl)).toEqual([24, 17, 10, 13, 6, 2]);
    expect(m.optionen.map(o => rund(o.proAntworten))).toEqual([0.333333, 0.236111, 0.138889, 0.180556, 0.083333, 0.027778]);
    expect(m.optionen.map(o => rund(o.proFaelle))).toEqual([0.774194, 0.548387, 0.322581, 0.419355, 0.193548, 0.064516]);
  });
  it('Prozent der Antworten ergeben 100, Prozent der Fälle mehr', () => {
    const m = rechne(false);
    expect(m.optionen.reduce((a, o) => a + o.proAntworten, 0)).toBeCloseTo(1, 12);
    expect(m.optionen.reduce((a, o) => a + o.proFaelle, 0)).toBeCloseTo(72 / 31, 12);
  });
  it('mit Fällen ohne Ankreuzung: gültig = mindestens eine Angabe', () => {
    const m = rechne(true);
    expect([m.faelle, m.fehlend, m.ohneAnkreuzung]).toEqual([38, 2, 7]);
    expect(m.optionen.map(o => o.anzahl)).toEqual([24, 17, 10, 13, 6, 2]);
    expect(m.optionen.map(o => rund(o.proFaelle))).toEqual([0.631579, 0.447368, 0.263158, 0.342105, 0.157895, 0.052632]);
  });
  it('Kreuztabelle nach Gruppe, Spalten-Prozente der Fälle', () => {
    const m = rechne(false, true), [g1, g2] = m.gruppe!.stufen;
    expect([g1!.faelle, g2!.faelle]).toEqual([14, 16]);
    expect(g1!.anzahl).toEqual([11, 5, 4, 3, 1, 0]); expect(g2!.anzahl).toEqual([12, 12, 6, 9, 5, 2]);
    expect(g1!.proFaelle.map(rund)).toEqual([0.785714, 0.357143, 0.285714, 0.214286, 0.071429, 0]);
    expect(g2!.proFaelle.map(rund)).toEqual([0.75, 0.75, 0.375, 0.5625, 0.3125, 0.125]);
    expect(m.gruppe!.ausgelassen).toBe(1);   // gültiger Fall ohne Gruppenangabe (Zeile 28)
  });
  it('Kreuztabelle mit Fällen ohne Ankreuzung', () => {
    const m = rechne(true, true), [g1, g2] = m.gruppe!.stufen;
    expect([g1!.faelle, g2!.faelle]).toEqual([19, 18]);
    expect(g1!.proFaelle.map(rund)).toEqual([0.578947, 0.263158, 0.210526, 0.157895, 0.052632, 0]);
    expect(g2!.proFaelle.map(rund)).toEqual([0.666667, 0.666667, 0.333333, 0.5, 0.277778, 0.111111]);
  });
  it('Reihenfolge der Anzeige', () => {
    const m = rechne(false);
    expect(optionenGeordnet(m).map(o => o.spalte)).toEqual(['medien_1', 'medien_2', 'medien_4', 'medien_3', 'medien_5', 'medien_6']);
    expect(optionenGeordnet({ ...m, sortiert: false }).map(o => o.spalte)).toEqual(medien);
  });
});

describe('Mehrfachantworten: Sonderfälle', () => {
  const eins = (zl: Zelle[][], extra: Partial<Parameters<typeof mehrfachRechnen>[0]> = {}) => mehrfachRechnen({ set: { name: 's', label: '', spalten: ['a', 'b'], zaehlwert: 1 }, optionsNamen: ['A', 'B'], zeilen: zl, fehlend: [[], []], mitNull: false, ...extra });
  it('niemand hat angekreuzt: keine Teilung durch null', () => {
    const m = eins([[0, 0], [null, null]]);
    expect([m.faelle, m.antworten, m.optionen[0]!.proFaelle, m.optionen[0]!.proAntworten]).toEqual([0, 0, 0, 0]);
  });
  it('benutzerdefinierter fehlender Wert zählt nicht als Angabe', () => {
    const m = eins([[99, 99], [1, 99]], { fehlend: [[99], [99]], mitNull: true });
    expect([m.faelle, m.fehlend]).toEqual([1, 1]);
  });
  it('Zählwert 2 (Kodierung 1 = nein, 2 = ja)', () => {
    const m = eins([[2, 1], [1, 2], [2, 2]], { set: { name: 's', label: '', spalten: ['a', 'b'], zaehlwert: 2 } });
    expect(m.optionen.map(o => o.anzahl)).toEqual([2, 2]);
  });
  it('Zählwert als Text', () => {
    const m = eins([['x', ''], ['x', 'x']], { set: { name: 's', label: '', spalten: ['a', 'b'], zaehlwert: 'x' } });
    expect(m.optionen.map(o => o.anzahl)).toEqual([2, 1]);
  });
});

describe('Sets vorschlagen', () => {
  const alle = schlageSetsVor(spalten, zeilen, []);
  it('erkennt medien_1 bis medien_6, nicht die Gruppe', () => {
    expect(alle).toHaveLength(1);
    expect(alle[0]).toMatchObject({ name: 'medien', spalten: medien, zaehlwert: 1 });
  });
  it('schlägt nichts vor, was schon in einem Set steht', () => {
    expect(schlageSetsVor(spalten, zeilen, [set])).toEqual([]);
  });
  it('Zählwert: 0/1 → 1; 1/2 mit Beschriftung „ja“ → 1 bzw. 2', () => {
    expect(zaehlwertVorschlag([0, 1])).toBe(1);
    expect(zaehlwertVorschlag([1, 2], w => (w === 2 ? 'ja' : 'nein'))).toBe(2);
    expect(zaehlwertVorschlag([1, 2])).toBe(1);
  });
  it('Namen prüfen', () => {
    expect(setNameFehler('medien', [set], spalten)).toBe('vergeben');
    expect(setNameFehler('gruppe', [], spalten)).toBe('vergeben');
    expect(setNameFehler('1abc', [], spalten)).toBe('form');
    expect(setNameFehler('mein set', [], spalten)).toBe('form');
    expect(setNameFehler('freizeit', [set], spalten)).toBe('');
    expect(setNameFehler('medien', [set], spalten, 'medien')).toBe('');
  });
});

describe('Namen der Optionen', () => {
  it('gemeinsamer Anfang fällt weg', () => {
    expect(optionsNamenAus(['Welche Medien nutzen Sie? [Fernsehen]', 'Welche Medien nutzen Sie? [Radio]'], ['m1', 'm2'])).toEqual(['Fernsehen', 'Radio']);
    expect(optionsNamenAus(['Medien: Fernsehen', 'Medien: Radio', 'Medien: Zeitung'], ['a', 'b', 'c'])).toEqual(['Fernsehen', 'Radio', 'Zeitung']);
  });
  it('ohne Bezeichnung der Spaltenname', () => { expect(optionsNamenAus(['', ''], ['medien_1', 'medien_2'])).toEqual(['medien_1', 'medien_2']); });
  it('ohne gemeinsamen Anfang bleiben die Bezeichnungen', () => { expect(optionsNamenAus(['Fernsehen', 'Radio'], ['a', 'b'])).toEqual(['Fernsehen', 'Radio']); });
});
