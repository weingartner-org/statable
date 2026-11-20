import { describe, expect, it } from 'vitest';
import { kandidaten, titelwort, verlinke, verlinkeAbschnitt } from './verlinken';

const liste = [
  { id: 'ki', titel: 'Konfidenzintervall (KI)' }, { id: 'streuung', titel: 'Streuung' }, { id: 'stichprobe', titel: 'Stichprobe' },
  { id: 'regression', titel: 'Regression' }, { id: 'p', titel: 'Rho' }, { id: 'viel', titel: 'Eigenwert, Parallelanalyse und Rotation' }
];
const k = kandidaten(liste);
const text = (t: { text: string }[]) => t.map(x => x.text).join('');

describe('Begriffe verlinken', () => {
  it('Titelwort ohne Klammer; kurze und mehrteilige Titel entfallen', () => {
    expect(titelwort('Konfidenzintervall (KI)')).toBe('Konfidenzintervall');
    expect(k.map(x => x.id)).not.toContain('p');
    expect(k.map(x => x.id)).not.toContain('viel');
  });
  it('erste Nennung wird Link, Text bleibt vollständig, kein HTML', () => {
    const t = verlinke('Das Konfidenzintervall zeigt die Streuung. Noch ein Konfidenzintervall <b>x</b>.', k, new Set());
    expect(text(t)).toBe('Das Konfidenzintervall zeigt die Streuung. Noch ein Konfidenzintervall <b>x</b>.');
    expect(t.filter(x => x.id).map(x => x.id)).toEqual(['ki', 'streuung', 'ki']);
  });
  it('jedes Vorkommen wird Link, auch in späteren Absätzen; nur ganze Wörter', () => {
    const abs = 'Stichprobe, Streuung, Regression, Konfidenzintervall.';
    expect(verlinke(abs, k, new Set()).filter(x => x.id)).toHaveLength(4);
    const a = verlinkeAbschnitt(['Die Streuung.', 'Wieder Streuung.', { h: 'Streuung' }, { code: 'Streuung' }], k);
    expect(a[0]!.some(x => x.id)).toBe(true);
    expect(a[1]!.some(x => x.id)).toBe(true);
    expect(a[2]).toBeUndefined(); expect(a[3]).toBeUndefined();
    expect(verlinke('Streuungsmaße', k, new Set()).some(x => x.id)).toBe(false);
  });
  it('der eigene Begriff wird nicht verlinkt', () => {
    expect(verlinke('Streuung', kandidaten(liste, 'streuung'), new Set()).some(x => x.id)).toBe(false);
  });
});
