import { describe, expect, it, vi } from 'vitest';
vi.mock('./sitzung.svelte', () => ({ s: { einst: { zahl: 'komma', sprache: 'de' } }, melde: () => {}, L: (de: string) => de, istEn: () => false }));
const { alsExcelZahl } = await import('./export');

describe('alsExcelZahl', () => {
  it('liest deutsche und englische Zahlen, behält Nachkommastellen und APA-Form', () => {
    expect(alsExcelZahl('60,72')).toEqual({ wert: 60.72, format: '0.00' });
    expect(alsExcelZahl(',964')).toEqual({ wert: 0.964, format: '#.000' });
    expect(alsExcelZahl('-2,5')).toEqual({ wert: -2.5, format: '0.0' });
    expect(alsExcelZahl('43')).toEqual({ wert: 43, format: '0' });
    expect(alsExcelZahl('1.234,5')).toEqual({ wert: 1234.5, format: '#,##0.0' });
    expect(alsExcelZahl('95,0%')).toEqual({ wert: 0.95, format: '0.0%' });
    expect(alsExcelZahl('1,234.5', false)).toEqual({ wert: 1234.5, format: '#,##0.0' });
    expect(alsExcelZahl('.964', false)).toEqual({ wert: 0.964, format: '#.000' });
  });
  it('lässt Text stehen', () => {
    for (const t of ['<,001', '', 'ja', '.', '1,2,3']) expect(alsExcelZahl(t)).toBeNull();
  });
});
