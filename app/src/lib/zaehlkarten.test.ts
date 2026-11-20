import { describe, expect, it } from 'vitest';
import { zaehlkarte, type Zaehlkarte, type ZaehlFehler } from './zaehlkarten';

/* Sollwerte: Rscript am Mac (R 4.6.1, qcc): qcc(d, sizes = n, type = "p" | "np" | "c" | "u"). d = fehlerhafte Stücke bzw. Fehler, n = Stichprobengröße. */
const D = [3, 5, 2, 4, 6, 1, 8, 3, 2, 4], N = [50, 50, 50, 60, 60, 40, 50, 50, 55, 50];
const g = (r: Zaehlkarte | ZaehlFehler): Zaehlkarte => { if ('fehler' in r) throw new Error(r.fehler); return r; };
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.abs(b), `${a} gegen ${b}`).toBeLessThan(tol);

describe('Zählwert-Regelkarten gegen R qcc', () => {
  it('p-Karte mit wechselnder Größe: Mittellinie und Grenzen je Stichprobe', () => {
    const r = g(zaehlkarte('p', D, N)); nah(r.mitte, 38 / 515, 1e-10); nah(r.ucl[0]!, 0.1846987844, 1e-9); nah(r.ucl[3]!, 0.1750350921, 1e-9); nah(r.ucl[5]!, 0.1977902146, 1e-9); nah(r.ucl[8]!, 0.1795372095, 1e-9); expect(r.lcl.every(v => v === 0)).toBe(true);
    expect(r.aus).toEqual([]);
  });
  it('np-Karte (feste Größe 50)', () => { const r = g(zaehlkarte('np', D, D.map(() => 50))); nah(r.mitte, 3.8); nah(r.ucl[0]!, 9.421458885, 1e-9); expect(r.lcl[0]).toBe(0); });
  it('c-Karte', () => { const r = g(zaehlkarte('c', D)); nah(r.mitte, 3.8); nah(r.ucl[0]!, 9.648076607, 1e-9); });
  it('u-Karte mit wechselnder Fläche', () => { const r = g(zaehlkarte('u', D, N)); nah(r.mitte, 0.07378640777, 1e-9); nah(r.ucl[0]!, 0.1890320298, 1e-9); });
  it('Signal: Punkt über der oberen Grenze', () => { const r = g(zaehlkarte('c', [3, 4, 2, 5, 3, 4, 20, 3, 2, 4])); expect(r.aus).toEqual([6]); });
  it('Fehler', () => {
    expect(zaehlkarte('c', [1, 2, 3])).toEqual({ fehler: 'zu-wenig' }); expect(zaehlkarte('c', [1, 2, 3.5, 4, 5])).toEqual({ fehler: 'zaehlwerte' });
    expect(zaehlkarte('p', D, [50, 50])).toEqual({ fehler: 'groessen' }); expect(zaehlkarte('p', [60, 1, 2, 3, 4], [50, 50, 50, 50, 50])).toEqual({ fehler: 'mehr-als-groesse' });
    expect(zaehlkarte('c', [0, 0, 0, 0, 0])).toEqual({ fehler: 'keine-streuung' });
  });
});
