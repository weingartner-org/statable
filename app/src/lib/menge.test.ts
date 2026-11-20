import { describe, expect, it } from 'vitest';
import { kleinste, groesste } from './menge';

describe('kleinste / groesste', () => {
  it('wie Math.min/Math.max, auch leer und mit NaN', () => {
    expect([kleinste([3, -1, 2]), groesste([3, -1, 2])]).toEqual([-1, 3]);
    expect([kleinste([]), groesste([])]).toEqual([Infinity, -Infinity]);
    expect(Number.isNaN(kleinste([1, NaN, 0]))).toBe(true);
    expect(groesste(new Set([4, 9]).values())).toBe(9);
  });
  it('500 000 Werte ohne Stapelüberlauf (Prüfung G1/G5)', () => {
    const a = Array.from({ length: 500000 }, (_, i) => i % 7);
    expect([kleinste(a), groesste(a)]).toEqual([0, 6]);
    expect(() => Math.min(...a)).toThrow();   // Beleg: so stürzte es vorher ab
  });
});
