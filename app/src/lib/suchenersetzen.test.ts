import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { sitz } from './kptesthilfe';
import { suchen, ersetzeTreffer, zeileNummer } from './suchenersetzen';

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const d = sitz({ zahl: [1, 1.5, 2, 1.5, null], ort: ['Wien', 'wien', 'Wiener Neustadt', null, 'Graz'], note: [1, 2, 1, 3, 1] }, ['ort']);
const o = (x: Partial<Parameters<typeof suchen>[1]>) => ({ spalten: null, suche: '', ersatz: '', modus: 'zelle' as const, gross: true, ...x });

describe('Suchen und Ersetzen', () => {
  it('Zahlen exakt: 1,5 findet 1.5, aber nicht 1 oder 15', () => {
    const p = suchen(d, o({ spalten: ['zahl'], suche: '1,5', ersatz: '9' }));
    expect(p.anzahl).toBe(2); expect(p.treffer.map(t => t.zeile)).toEqual([1, 3]);
    const { daten, ersetzt } = ersetzeTreffer(d, p);
    expect(ersetzt).toBe(2); expect(daten.zeilen.map(z => z[0])).toEqual([1, 9, 2, 9, null]);
  });
  it('Ersatz ist keine Zahl: Treffer stehen da, werden aber nicht ersetzt', () => {
    const p = suchen(d, o({ spalten: ['note'], suche: '1', ersatz: 'x' }));
    expect(p.anzahl).toBe(3); expect(p.nichtErsetzbar).toBe(3);
    expect(ersetzeTreffer(d, p).ersetzt).toBe(0);
  });
  it('leerer Ersatz bei Zahlen macht den Wert fehlend', () => {
    const p = suchen(d, o({ spalten: ['note'], suche: '3', ersatz: '' }));
    expect(ersetzeTreffer(d, p).daten.zeilen.map(z => z[2])).toEqual([1, 2, 1, null, 1]);
  });
  it('Text, ganze Zelle: groß/klein wählbar', () => {
    expect(suchen(d, o({ spalten: ['ort'], suche: 'Wien', ersatz: 'W' })).anzahl).toBe(1);
    const p = suchen(d, o({ spalten: ['ort'], suche: 'Wien', ersatz: 'W', gross: false }));
    expect(p.anzahl).toBe(2);
    expect(ersetzeTreffer(d, p).daten.zeilen.map(z => z[1])).toEqual(['W', 'W', 'Wiener Neustadt', null, 'Graz']);
  });
  it('Text, Teiltext: alle Vorkommen; Sonderzeichen sind Text, $ im Ersatz bleibt wörtlich', () => {
    const e = sitz({ t: ['a.b a.b', 'axb', 'x'] }, ['t']);
    const p = suchen(e, o({ suche: 'a.b', ersatz: '$&', modus: 'teil' }));
    expect(p.anzahl).toBe(1);
    expect(ersetzeTreffer(e, p).daten.zeilen.map(z => z[0])).toEqual(['$& $&', 'axb', 'x']);
    const q = suchen(d, o({ spalten: ['ort'], suche: 'wien', ersatz: 'Linz', modus: 'teil', gross: false }));
    expect(ersetzeTreffer(d, q).daten.zeilen.map(z => z[1])).toEqual(['Linz', 'Linz', 'Linzer Neustadt', null, 'Graz']);
  });
  it('alle Spalten: ein Textwort findet nur Textzellen; Treffer nennen die Spalte', () => {
    const p = suchen(d, o({ suche: 'Graz', ersatz: 'Linz' }));
    expect(p.uebersprungen).toEqual([]); expect(p.inSpalten).toEqual(['ort']);
    expect(p.treffer[0]).toMatchObject({ zeile: 4, name: 'ort', vorher: 'Graz', nachher: 'Linz' });
  });
  it('Datumsspalten bleiben außen vor; leere Suche und keine Spalte sind Fehler', () => {
    const e = sitz({ t: ['01.01.2026'] }, ['t']); e.spalten[0]!.art = 'datum';
    expect(suchen(e, o({ suche: '2026' })).uebersprungen).toEqual([{ name: 't', grund: 'datum' }]);
    expect(suchen(d, o({ suche: '' })).fehler).toBe('suche-leer');
    expect(suchen(d, o({ suche: 'x', spalten: ['gibtesnicht'] })).fehler).toBe('keine-spalte');
  });
  it('Rückgängig: die Eingabedaten bleiben unverändert', () => {
    const vorher = JSON.stringify(d.zeilen);
    ersetzeTreffer(d, suchen(d, o({ spalten: ['zahl'], suche: '2', ersatz: '5' })));
    expect(JSON.stringify(d.zeilen)).toBe(vorher);
  });
});

describe('Gehe zu Zeile', () => {
  it('Nummer wie in der Tabelle (ab 1), mit Tausenderpunkt; Fehlergründe', () => {
    expect(zeileNummer('3', 10)).toEqual({ index: 2 }); expect(zeileNummer(' 1.000 ', 5000)).toEqual({ index: 999 });
    expect(zeileNummer('0', 10)).toEqual({ fehler: 'zu-klein' }); expect(zeileNummer('11', 10)).toEqual({ fehler: 'zu-gross' });
    expect(zeileNummer('', 10)).toEqual({ fehler: 'leer' }); expect(zeileNummer('abc', 10)).toEqual({ fehler: 'keine-zahl' });
  });

  it('Beschriftungen von Zahlencodes werden gefunden wie auf dem Bildschirm („2 weiblich“) - ganz und als Teil, nie ersetzt', () => {
    const g = sitz({ geschlecht: [1, 2, 2, 1, null], alter: [21, 22, 23, 24, 25] }, []);
    g.spalten[0]!.werteLabels = { '1': 'männlich', '2': 'weiblich' };
    const ganz = suchen(g, o({ suche: 'weiblich', ersatz: 'x' }));
    expect(ganz.treffer.map(t => t.zeile)).toEqual([1, 2]);
    expect(ganz.treffer[0]).toMatchObject({ name: 'geschlecht', vorher: '2 weiblich', ersetzbar: false });
    expect(ganz.nichtErsetzbar).toBe(2);
    expect(suchen(g, o({ suche: 'weib', modus: 'zelle' })).anzahl).toBe(0);
    const teil = suchen(g, o({ suche: 'weib', modus: 'teil', gross: false }));
    expect(teil.treffer.map(t => t.zeile)).toEqual([1, 2]);
    expect(suchen(g, o({ suche: 'WEIB', modus: 'teil', gross: false })).anzahl).toBe(2);
    expect(ersetzeTreffer(g, teil).ersetzt).toBe(0);
    // die Zahl selbst findet weiter exakt
    expect(suchen(g, o({ suche: '2', spalten: ['geschlecht'] })).treffer.map(t => t.zeile)).toEqual([1, 2]);
  });
  it('Teiltext findet auch Teile einer Zahl (22 in 22), ganze Zelle nur die exakte Zahl; Teile werden nicht ersetzt', () => {
    const g = sitz({ alter: [21, 22, 122, 3] }, []);
    expect(suchen(g, o({ suche: '2', modus: 'teil' })).treffer.map(t => t.zeile)).toEqual([0, 1, 2]);
    expect(suchen(g, o({ suche: '2', modus: 'zelle' })).treffer.length).toBe(0);
    expect(suchen(g, o({ suche: '22', ersatz: '7', modus: 'zelle' })).treffer[0]).toMatchObject({ zeile: 1, ersetzbar: true, nachher: 7 });
    const teil = suchen(g, o({ suche: '2', modus: 'teil', ersatz: '9' }));
    expect(teil.treffer.every(t => !t.ersetzbar || t.nachher === 9)).toBe(true);
  });
});
