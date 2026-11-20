import { describe, it, expect } from 'vitest';
import { tabelleDe, ohneNull } from './export';
import { s } from './sitzung.svelte';
import { ohneNull as wertOhneNull, pWert } from './ergebnis';
import { dfKlammer } from '../i18n/profil';
import type { Cell, TableItem } from '../engine/types';

const z = (r: number, c: number, t: string, n?: number, h = false): Cell => ({ r, c, rs: 1, cs: 1, h, a: n === undefined ? 'l' : 'r', t, n });
const tab = (cells: Cell[], rows: number, cols: number): TableItem => ({ type: 'table', label: 'T', layer: [], title: null, rows, cols, headRows: [1, 0], headCols: [1, 0], cells, footnotes: [] } as unknown as TableItem);

describe('Null vor dem Komma (09.10.)', () => {
  it('Kreuztabelle: erwartete Häufigkeit und Prozent mit Null', () => {
    s.einst.sprache = 'de'; s.einst.zahl = 'komma';
    const t = tabelleDe(tab([z(0, 0, '', undefined, true), z(0, 1, 'männlich', undefined, true), z(1, 0, 'Erwartet', undefined, true), z(1, 1, '.44', 0.44), z(2, 0, 'Zeile %', undefined, true), z(2, 1, '.0%', 0)], 3, 2), null);
    expect(t.zeilen[1]![1]!.t).toBe('0,44');
    expect(t.zeilen[2]![1]!.t).toMatch(/^0,0/);
  });
  it('p-Wert und Korrelation bleiben ohne Null (APA), auch wenn die Art in der Zeile steht', () => {
    const t = tabelleDe(tab([z(0, 0, '', undefined, true), z(0, 1, 'Sig.', undefined, true), z(0, 2, 'Lesen', undefined, true), z(1, 0, 'Korrelation nach Pearson', undefined, true), z(1, 1, '.04', 0.04), z(1, 2, '.31', 0.31)], 2, 3), null);
    expect(t.zeilen[1]!.slice(1).map(c => c.t)).toEqual([',04', ',31']);
  });
  it('Köpfe, die nie über 1 gehen', () => {
    for (const k of ['Sig. (2-seitig)', 'Korrelation', 'R-Quadrat', 'Cronbachs Alpha', 'Partielles Eta-Quadrat', 'W', 'ε (Huynh-Feldt)', 'Kappa', 'β', 'Beta']) expect(ohneNull(k), k).toBe(true);
    for (const k of ['Mittelwert', 'Erwartet', 'Std. Abweichung', 'Zeile %', 'Wilcoxon W', 'B']) expect(ohneNull(k), k).toBe(false);
  });
  it('Griechische Wörter sind keine Formelzeichen (η, α … mitten im Wort)', () => {
    for (const k of ['ηp²', 'η²', 'α', 'ω (McDonald)', 'κ', 'ε (Greenhouse-Geisser)', 'β']) expect(ohneNull(k), k).toBe(true);
    for (const k of ['Συγκέντρωση (βαθμοί) Με ίσες διακυμάνσεις', 'Μέσος όρος', 'Ηλικία']) expect(ohneNull(k), k).toBe(false);
  });
});

describe('Schalter „Null vor dem Komma“ (Johannes 09.10.)', () => {
  it('Standard aus: p, r ohne Null wie im Deutschen; an: mit Null, auch in Tabellen', () => {
    s.einst.sprache = 'de'; s.einst.zahl = 'komma'; s.einst.nullVorKomma = false;
    expect([wertOhneNull(0.31), pWert(0.034), pWert(0.0001)]).toEqual([',31', '= ,034', '< ,001']);
    s.einst.nullVorKomma = true;
    expect([wertOhneNull(0.31), wertOhneNull(-0.2), pWert(0.034), pWert(0.0001)]).toEqual(['0,31', '−0,20', '= 0,034', '< 0,001']);
    const t = tabelleDe(tab([z(0, 0, '', undefined, true), z(0, 1, 'Sig.', undefined, true), z(0, 2, 'Lesen', undefined, true), z(1, 0, 'Korrelation nach Pearson', undefined, true), z(1, 1, '.04', 0.04), z(1, 2, '.31', 0.31)], 2, 3), null);
    expect(t.zeilen[1]!.slice(1).map(c => c.t)).toEqual(['0,04', '0,31']);
    s.einst.nullVorKomma = false;
  });
});

describe('Freiheitsgrade mit Nachkommastellen (Welch, Johannes 09.10.)', () => {
  it('Dezimalkomma: Semikolon, sonst mehrdeutig; ganze Zahlen und Punkt: Komma', () => {
    s.einst.sprache = 'de'; s.einst.zahl = 'komma';
    expect(dfKlammer('2', '76,4')).toBe('(2; 76,4)');
    expect(dfKlammer('2', '57')).toBe('(2, 57)');
    s.einst.zahl = 'punkt';
    expect(dfKlammer('2', '76.4')).toBe('(2, 76.4)');
    s.einst.zahl = 'komma';
  });
});
