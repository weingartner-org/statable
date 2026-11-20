/** Bericht und Export (Abnahme 08.10.2026): Einleitungssatz mit der gerechneten n, einheitliche Zahlen in den Tabellen. */
import { describe, expect, it } from 'vitest';
import type { TableItem } from '../engine/types';
import { einheitlicheNullen, tabelleDe } from './export';
import { stichprobenText } from './berichtsatz';

const blatt = (art: string, typ: string, e: unknown) => ({ id: art, titel: art, art, ergebnis: { typ, e }, items: [], imBericht: true }) as never;
const tabelle = (zeilen: [string, number | undefined][][], kopf: string[]): TableItem => {
  const cells = [...kopf.map((t, c) => ({ r: 0, c, rs: 1, cs: 1, t, h: true, x: true })), ...zeilen.flatMap((z, r) => z.map(([t, n], c) => ({ r: r + 1, c, rs: 1, cs: 1, t, h: false, x: false, ...(n !== undefined ? { n } : {}) })))];
  return { type: 'table', label: 'T', layer: [], title: null, rows: zeilen.length + 1, cols: kopf.length, headRows: [1, 1], headCols: [0, 0], cells, caption: null, footnotes: [] } as never;
};

describe('Einleitungssatz', () => {
  it('nennt die gerechnete n, wenn Lücken fehlen', () => {
    const t = stichprobenText([blatt('mediation', 'mediation', { n: 147 })], 150, false);
    expect(t.text).toBe('An der Untersuchung nahmen 150 Personen teil, davon 147 mit vollständigen Angaben für die Auswertung.');
  });
  it('Spanne bei verschiedenen Rechnungen, ohne Lücken unverändert', () => {
    expect(stichprobenText([blatt('a', 'mediation', { n: 147 }), blatt('b', 'moderation', { n: 146 })], 150, false).text).toContain('je nach Auswertung 146 bis 147');
    expect(stichprobenText([blatt('a', 'mediation', { n: 150 })], 150, false).text).toBe('An der Untersuchung nahmen 150 Personen teil.');
  });
  it('Fälle statt Personen bei Kappa und ICC; englisch', () => {
    expect(stichprobenText([blatt('uebereinstimmung', 'kappa', { n: 58 })], 60, false).text).toBe('Die Daten enthalten 60 Fälle, davon 58 mit vollständigen Angaben für die Auswertung.');
    expect(stichprobenText([blatt('uebereinstimmung', 'icc', { icc: { n: 60 } })], 60, true).text).toBe('The data contain 60 cases.');
    expect(stichprobenText([blatt('g', 'zusammenhang', { n: 58 })], 60, true).text).toBe('60 people took part in the study, of whom 58 had complete data for the analyses.');
  });
});

describe('Zahlen in den Tabellen', () => {
  it('Minus als „−“, PSPP „.000“ als „< ,001“, deutsch und englisch', async () => {
    const tb = tabelle([[['r1', undefined], ['-.98', -0.98], ['.000', 0]]], ['', 'r', 'Sig. (2-tailed)']);
    const de = tabelleDe(tb, null).zeilen[1]!.map(c => c.t);
    expect(de.slice(1)).toEqual(['−,98', '< ,001']);
  });
  it('eine Spalte mit „0,47“ und „,50“ bekommt überall die Null', () => {
    const z = (t: string) => ({ t, kopf: false, span: 1, zahl: true });
    const zeilen = [[{ t: 'Effekt', kopf: true, span: 1, zahl: false }], [z('0,47')], [z('−,50')], [z(',23')]].map((x, i) => (i === 0 ? [x[0]!, { ...z('Wert'), zahl: false }] : [{ t: 'a', kopf: true, span: 1, zahl: false }, x[0]!]));
    einheitlicheNullen(zeilen, 1);
    expect(zeilen.slice(1).map(r => r[1]!.t)).toEqual(['0,47', '−0,50', '0,23']);
  });
});
