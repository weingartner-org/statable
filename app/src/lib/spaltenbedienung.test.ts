import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { sitz } from './kptesthilfe';
import { umwandeln, umwandlungAnwenden, dezimalstellenBefehl, labelsUebertragen, liesDatumText, liesZahlText, angezeigteStellen } from './spaltenbedienung';
import type { Spalte } from './verzeichnis';

s.einst.sprache = 'de'; s.einst.anrede = 'du';

describe('Spaltentyp umstellen', () => {
  it('Text → Zahl: Komma und Punkt, unlesbare Werte werden gezählt und fehlend, leere Zellen nicht', () => {
    const d = sitz({ x: ['1,5', '2.25', 'abc', '', ' 7 ', '1.234,5', null] }, ['x']);
    const p = umwandeln(d, 'x', 'zahl');
    expect(p.werte).toEqual([1.5, 2.25, null, null, 7, null, null]);
    expect(p.nichtUmwandelbar).toEqual([{ zeile: 2, wert: 'abc' }, { zeile: 5, wert: '1.234,5' }]);
    expect(p.umgewandelt).toBe(3);
    expect(p.neu.art).toBe('zahl'); expect(p.neu.format).toBe('F8.2'); expect(p.neu.niveau).toBe('metrisch');
    const neu = umwandlungAnwenden(d, p);
    expect(neu.spalten[0]!.art).toBe('zahl'); expect(neu.zeilen.map(z => z[0])).toEqual(p.werte);
  });
  it('Text-Codes „keine Angabe“ zählen nicht als Fehler', () => {
    const d = sitz({ x: ['1', 'k.A.', '3'] }, ['x']); d.spalten[0]!.fehlendText = 'k.A.';
    const p = umwandeln(d, 'x', 'zahl');
    expect(p.nichtUmwandelbar).toEqual([]); expect(p.werte).toEqual([1, null, 3]);
  });
  it('Zahl → Text: gleicher Wert als Text, „keine Angabe“-Codes bleiben fehlend, Labels wandern mit', () => {
    const d = sitz({ x: [1, 2.5, 99, null] });
    d.spalten[0]!.fehlend = [99]; d.spalten[0]!.werteLabels = { '1': 'ja', '2': 'nein' };
    const p = umwandeln(d, 'x', 'text');
    expect(p.werte).toEqual(['1', '2.5', null, null]);
    expect(p.fehlendBleibt).toBe(1);
    expect(p.neu.art).toBe('text'); expect(p.neu.niveau).toBe('nominal'); expect(p.neu.werteLabels).toEqual({ '1': 'ja', '2': 'nein' });
    expect(p.neu.format).toBe('A3');
  });
  it('Text → Datum und zurück; ungültige Tage werden gezählt', () => {
    const d = sitz({ t: ['31.12.2026', '2026-01-05', '31.02.2026', 'gestern', ''] }, ['t']);
    const p = umwandeln(d, 't', 'datum');
    expect(p.werte).toEqual(['31.12.2026', '05.01.2026', null, null, null]);
    expect(p.nichtUmwandelbar.map(x => x.wert)).toEqual(['31.02.2026', 'gestern']);
    expect(p.neu.art).toBe('datum'); expect(p.neu.format).toBe('EDATE10');
    const neu = umwandlungAnwenden(d, p);
    const zurueck = umwandeln(neu, 't', 'text');
    expect(zurueck.werte).toEqual(['31.12.2026', '05.01.2026', null, null, null]);
  });
  it('Zahl ↔ Datum über JJJJMMTT', () => {
    const d = sitz({ n: [20260905, 20260230, 12, 1.5] });
    const p = umwandeln(d, 'n', 'datum');
    expect(p.werte).toEqual(['05.09.2026', null, null, null]); expect(p.nichtUmwandelbar.length).toBe(3);
    const neu = umwandlungAnwenden(sitz({ n: [20260905] }), umwandeln(sitz({ n: [20260905] }), 'n', 'datum'));
    expect(umwandeln(neu, 'n', 'zahl').werte).toEqual([20260905]);
  });
  it('gleiche Art, unbekannte Spalte, Uhrzeit-Spalte: keine Umwandlung', () => {
    const d = sitz({ x: [1, 2] });
    expect(umwandeln(d, 'x', 'zahl').grund).toBe('gleich');
    expect(umwandeln(d, 'y', 'text').grund).toBe('spalte');
    const u = sitz({ z: ['10:00'] }); u.spalten[0]!.art = 'datum'; u.spalten[0]!.format = 'TIME8.0';
    expect(umwandeln(u, 'z', 'text').grund).toBe('zeit');
    expect(umwandlungAnwenden(d, umwandeln(d, 'x', 'zahl'))).toBe(d);
  });
  it('Lesen: Zahl und Datum in Schreibweisen', () => {
    expect(liesZahlText('-1,5e2')).toBe(-150); expect(liesZahlText('1,2,3')).toBeNull(); expect(liesZahlText('')).toBeNull();
    expect(liesDatumText('2026-02-29')).toBeNull(); expect(liesDatumText('29.02.2024')).toEqual({ y: 2024, m: 2, d: 29 });
    expect(liesDatumText('12/31/2026', 'ADATE10')).toEqual({ y: 2026, m: 12, d: 31 });
  });
});

describe('Dezimalstellen der Anzeige', () => {
  const d = sitz({ a: [1234.5678, -2], b: [3, 4], t: [0, 0] }, []);
  d.spalten[2]!.art = 'text';
  it('ein FORMATS-Befehl je Format, nur Zahlenspalten, Werte bleiben', () => {
    const r = dezimalstellenBefehl(d, ['a', 'b', 't'], 1);
    expect(r.syntax).toBe('FORMATS a b (F8.1).\nEXECUTE.');
    expect(r.uebersprungen).toEqual(['t']); expect(r.spalten).toEqual(['a', 'b']);
    expect(d.zeilen[0]![0]).toBe(1234.5678);
  });
  it('Breite reicht für den größten Wert; 0 Stellen ohne Punkt; Format-Art bleibt', () => {
    const g = sitz({ a: [123456789.5, -1] }); g.spalten[0]!.format = 'COMMA12.2';
    expect(dezimalstellenBefehl(g, ['a'], 0).syntax).toMatch(/^FORMATS a \(COMMA\d+\.0\)\./);
    expect(angezeigteStellen({ format: 'F8.2' } as Spalte)).toBe(2);
    expect(dezimalstellenBefehl(g, ['a'], 3).syntax).toMatch(/COMMA1\d\.3/);
  });
  it('Spalte, die es nicht gibt, ergibt keinen Befehl', () => { expect(dezimalstellenBefehl(d, ['zz'], 2).syntax).toBe(''); });
});

describe('Wertelabels übertragen', () => {
  const d = sitz({ q1: [1, 2, 3], q2: [1, 2, 3], q3: [1, 2, 3], t: ['a', 'b', 'a'] }, ['t']);
  d.spalten[0]!.werteLabels = { '1': 'stimme zu', '2': 'teils', '3': "nicht d'accord" };
  d.spalten[2]!.werteLabels = { '9': 'alt' };
  it('ein Befehl für alle Zielspalten, vorher leeren, Apostroph verdoppelt; bisherige Labels werden genannt', () => {
    const r = labelsUebertragen(d, 'q1', ['q2', 'q3', 'q1']);
    expect(r.ziele).toEqual(['q2', 'q3']); expect(r.ersetzt).toEqual(['q3']); expect(r.paare).toBe(3);
    expect(r.syntax).toBe("VALUE LABELS q2 q3.\nVALUE LABELS q2 q3 1 'stimme zu' 2 'teils' 3 'nicht d''accord'.\nEXECUTE.");
  });
  it('andere Art wird übersprungen; Quelle ohne Labels ergibt keinen Befehl', () => {
    const r = labelsUebertragen(d, 'q1', ['t', 'q2']);
    expect(r.uebersprungen).toEqual([{ name: 't', grund: 'art' }]); expect(r.ziele).toEqual(['q2']);
    const l = labelsUebertragen(d, 'q2', ['q3']);
    expect(l.syntax).toBe(''); expect(l.uebersprungen[0]!.grund).toBe('quelle-leer');
  });
  it('Text-Schlüssel gehen durch zitWert', () => {
    const e = sitz({ a: ['m', 'w'], b: ['m', 'w'] }, ['a', 'b']); e.spalten[0]!.werteLabels = { m: 'männlich', w: 'weiblich' };
    expect(labelsUebertragen(e, 'a', ['b']).syntax).toBe("VALUE LABELS b.\nVALUE LABELS b 'm' 'männlich' 'w' 'weiblich'.\nEXECUTE.");
  });
});
