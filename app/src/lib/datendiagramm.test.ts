import { describe, it, expect } from 'vitest';
import type { Spalte } from './verzeichnis';
import { diagrammArt, haeufigkeitAus, kreuzAus, zahlenAus, paareAus, istKategorie, DD_STUFEN_MAX } from './datendiagramm';

// Diagramm direkt aus der Datenansicht (Friedrich Beckmann, 28.10.2026).
const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
const spalten = [sp('punkte', { fehlend: [99] }), sp('alter'), sp('gruppe', { art: 'text', niveau: 'nominal', format: 'A5' }), sp('schule', { werteLabels: { '1': 'Primar', '2': 'Sekundar' } }), sp('gewicht'), sp('frei', { art: 'text', niveau: 'nominal', format: 'A20' })];
const zeilen: (string | number | null)[][] = [
  [10, 20, 'A', 1, 1, 't1'], [12, 22, 'B', 2, 2, 't2'], [99, 30, 'A', 1, 1, 't3'], [14, null, 'B', 2, 0, 't4'], [null, 25, '', 1, 1, 't5']
];
const s = (n: string) => spalten.find(x => x.name === n)!;

describe('Diagramm aus der Datenansicht', () => {
  it('erkennt Gruppen: Text, nominal, beschriftete Zahlen mit wenigen Stufen', () => {
    expect(istKategorie(s('gruppe'), zeilen, spalten)).toBe(true);
    expect(istKategorie(s('schule'), zeilen, spalten)).toBe(true);
    expect(istKategorie(s('punkte'), zeilen, spalten)).toBe(false);
  });
  it('wählt das Bild zur Auswahl und die passende Frage', () => {
    expect(diagrammArt(s('punkte'), undefined, zeilen, spalten)).toMatchObject({ art: 'verteilung', frage: { art: 'verteilung', w: { l1: ['punkte'] } } });
    expect(diagrammArt(s('gruppe'), undefined, zeilen, spalten).art).toBe('saeulen');
    expect(diagrammArt(s('punkte'), s('alter'), zeilen, spalten)).toMatchObject({ art: 'streu', x: 'punkte', y: 'alter', frage: { art: 'zusammenhang' } });
    // Zahl und Gruppen in beiden Reihenfolgen: Mittelwert nach Gruppe, die Zahl ist das Gemessene
    for (const [a, b] of [['punkte', 'gruppe'], ['gruppe', 'punkte']] as const) expect(diagrammArt(s(a), s(b), zeilen, spalten)).toMatchObject({ art: 'gruppenmittel', y: 'punkte', g: 'gruppe', frage: { art: 'gruppen', w: { l1: ['punkte'], l2: ['gruppe'] } } });
    expect(diagrammArt(s('gruppe'), s('schule'), zeilen, spalten)).toMatchObject({ art: 'kreuz', gezaehlt: 'gruppe', gruppen: 'schule', frage: { art: 'kreuz' } });
  });
  it('freier Text mit sehr vielen Stufen gibt kein Säulenbild', () => {
    const viele = Array.from({ length: DD_STUFEN_MAX + 1 }, (_, i) => [0, 0, 'A', 1, 1, `t${i}`]);
    expect(diagrammArt(s('frei'), undefined, viele, spalten).art).toBe('keins');
  });
  it('Zahlen und Paare ohne fehlende Werte (Fehlcode 99, leer)', () => {
    expect(zahlenAus(s('punkte'), zeilen, spalten)).toEqual([10, 12, 14]);
    expect(paareAus(s('punkte'), s('alter'), zeilen, spalten)).toEqual([[10, 20], [12, 22]]);
  });
  it('Häufigkeiten mit Beschriftungen, Anteil an den gültigen Angaben, mit Fallgewicht', () => {
    const h = haeufigkeitAus(s('schule'), 'Schulform', zeilen, spalten);
    expect(h.werte).toEqual([{ name: 'Primar', anzahl: 3, anteil: 0.6 }, { name: 'Sekundar', anzahl: 2, anteil: 0.4 }]);
    const g = haeufigkeitAus(s('gruppe'), 'Gruppe', zeilen, spalten, 'gewicht');
    expect(g.n).toBe(4); expect(g.werte).toEqual([{ name: 'A', anzahl: 2, anteil: 0.5 }, { name: 'B', anzahl: 2, anteil: 0.5 }]);   // Gewicht 0 zählt nicht, leer ist fehlend
    expect(g.fehlend).toBe(1);
  });
  it('Kreuzzählung: Zeilen = Gruppen der zweiten Spalte', () => {
    const k = kreuzAus(s('gruppe'), s('schule'), 'Gruppe', 'Schulform', zeilen, spalten);
    expect(k.zaehlung).toEqual({ zeilen: ['Primar', 'Sekundar'], spalten: ['A', 'B'], tab: [[2, 0], [0, 2]] });
    expect(k.n).toBe(4);
  });
});
