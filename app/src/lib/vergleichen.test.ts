import { describe, expect, it, vi } from 'vitest';

vi.mock('./sitzung.svelte', () => ({ L: (de: string) => de, istEn: () => false, aktuelleSprache: () => 'de', s: { einst: { sprache: 'de', zahl: 'sprache' } }, melde: () => {} }));
import { abweichungenAlsTabelle, vergleiche } from './vergleichen';
import type { Daten } from './umformen';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';

/* S-F2 D6: Datensätze vergleichen (Doppeleingabe von Fragebögen). Zelle für Zelle über einen Schlüssel; beide fehlend = gleich; Zahlen gleich, wenn der gelesene Wert gleich ist; Text genau gleich. */
const sp = (name: string, art: Spalte['art'] = 'zahl'): Spalte => ({ name, bezeichnung: '', art, niveau: 'nominal', format: art === 'text' ? 'A10' : 'F8.0', fehlend: [], fehlendText: '', werteLabels: {} });
const daten = (spalten: Spalte[], zeilen: Wert[][]): Daten => ({ spalten, zeilen });
const A = () => daten([sp('id'), sp('alter'), sp('name', 'text'), sp('nur1')], [[1, 30, 'Anna', 5], [2, 41, 'Ben', 6], [3, null, 'Cem', 7], [4, 22, null, 8]]);
const B = () => daten([sp('ID'), sp('Alter'), sp('name', 'text'), sp('nur2')], [[3, null, 'Cem', 1], [1, 30, 'Anna', 2], [2, 14, 'ben ', 3], [5, 20, 'Eva', 4]]);

describe('Datensätze vergleichen', () => {
  it('Abweichungen Zelle für Zelle mit Schlüssel, Spalte, Wert in Datei 1 und 2; Fälle und Spalten nur in einer Datei; Zusammenfassung', () => {
    const r = vergleiche(A(), B(), { schluessel: 'id', locker: false });
    expect(r.problem).toBeNull();
    expect(r.abweichungen.map(a => [a.schluessel, a.spalte, a.wert1, a.wert2])).toEqual([['2', 'alter', 41, 14], ['2', 'name', 'Ben', 'ben ']]);
    expect(r.nurIn1).toEqual(['4']); expect(r.nurIn2).toEqual(['5']);
    expect(r.spaltenNur1).toEqual(['nur1']); expect(r.spaltenNur2).toEqual(['nur2']);
    expect(r.verglichenFaelle).toBe(3);
    expect(r.jeSpalte).toEqual([{ spalte: 'alter', anzahl: 1 }, { spalte: 'name', anzahl: 1 }]);
  });
  it('beide fehlend = gleich; eines fehlt = Abweichung', () => {
    const a = daten([sp('id'), sp('x')], [[1, null], [2, 5]]), b = daten([sp('id'), sp('x')], [[1, null], [2, null]]);
    const r = vergleiche(a, b, { schluessel: 'id', locker: false });
    expect(r.abweichungen.map(x => [x.schluessel, x.wert1, x.wert2])).toEqual([['2', 5, null]]);
  });
  it('Zahlen: der gelesene Wert zählt (1 und 1,0 gleich), 0,1+0,2 ist nicht 0,3', () => {
    const a = daten([sp('id'), sp('x')], [[1, 1], [2, 0.1 + 0.2]]), b = daten([sp('id'), sp('x')], [[1, 1.0], [2, 0.3]]);
    expect(vergleiche(a, b, { schluessel: 'id', locker: false }).abweichungen).toHaveLength(1);
  });
  it('Option „Leerzeichen am Rand und Groß/Klein nicht beachten“ (aus als Voreinstellung)', () => {
    const streng = vergleiche(A(), B(), { schluessel: 'id', locker: false }), locker = vergleiche(A(), B(), { schluessel: 'id', locker: true });
    expect(streng.abweichungen.some(a => a.spalte === 'name')).toBe(true);
    expect(locker.abweichungen.map(a => a.spalte)).toEqual(['alter']);
  });
  it('doppelte Schlüssel: klarer Satz, kein Vergleich', () => {
    const a = daten([sp('id'), sp('x')], [[1, 1], [1, 2], [2, 3]]);
    const r = vergleiche(a, daten([sp('id'), sp('x')], [[1, 1], [2, 3]]), { schluessel: 'id', locker: false });
    expect(r.problem).toEqual({ art: 'doppelt', datei: 1, schluessel: ['1'] });
    expect(r.abweichungen).toEqual([]);
    const r2 = vergleiche(daten([sp('id')], [[1]]), daten([sp('id')], [[7], [7], [8], [8]]), { schluessel: 'id', locker: false });
    expect(r2.problem).toEqual({ art: 'doppelt', datei: 2, schluessel: ['7', '8'] });
  });
  it('Schlüssel fehlt in einer Datei; Fälle ohne Schlüsselwert werden gezählt, nicht verglichen', () => {
    expect(vergleiche(A(), daten([sp('x')], [[1]]), { schluessel: 'id', locker: false }).problem).toEqual({ art: 'schluessel', datei: 2 });
    const r = vergleiche(daten([sp('id'), sp('x')], [[1, 1], [null, 2]]), daten([sp('id'), sp('x')], [[1, 1], [null, 9]]), { schluessel: 'id', locker: false });
    expect(r.problem).toBeNull(); expect(r.ohneSchluessel).toEqual([1, 1]); expect(r.abweichungen).toEqual([]);
  });
  it('ohne Schlüssel: nach Zeilennummer, nur bei gleicher Zeilenzahl', () => {
    const a = daten([sp('x'), sp('y')], [[1, 2], [3, 4]]), b = daten([sp('x'), sp('y')], [[1, 2], [3, 9]]);
    const r = vergleiche(a, b, { schluessel: null, locker: false });
    expect(r.nachZeile).toBe(true);
    expect(r.abweichungen.map(x => [x.schluessel, x.spalte, x.wert1, x.wert2])).toEqual([['2', 'y', 4, 9]]);
    expect(vergleiche(a, daten([sp('x')], [[1]]), { schluessel: null, locker: false }).problem).toEqual({ art: 'zeilenzahl', n1: 2, n2: 1 });
  });
  it('keine gemeinsame Spalte außer dem Schlüssel', () => {
    expect(vergleiche(daten([sp('id'), sp('a')], [[1, 1]]), daten([sp('id'), sp('b')], [[1, 1]]), { schluessel: 'id', locker: false }).problem).toEqual({ art: 'keineGemeinsamen' });
  });
  it('Liste für den CSV-Export: Kopf und eine Zeile je Abweichung, Texte gegen Formeln neutral', () => {
    const r = vergleiche(daten([sp('id'), sp('t', 'text')], [['=1', '=cmd']]), daten([sp('id'), sp('t', 'text')], [['=1', '+x']]), { schluessel: 'id', locker: false });
    const t = abweichungenAlsTabelle(r, 'Schlüssel', 'Spalte', 'Datei 1', 'Datei 2');
    expect(t.kopf).toEqual(['Schlüssel', 'Spalte', 'Datei 1', 'Datei 2']);
    expect(t.zeilen).toEqual([["'=1", 't', "'=cmd", "'+x"]]);
  });
});
