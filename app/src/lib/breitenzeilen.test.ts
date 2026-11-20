import { describe, expect, it } from 'vitest';
import { breitenZeilen } from './breitenzeilen';

describe('Spaltenbreite: nur die Zeilen, die sie bestimmen (A2)', () => {
  it('wenige verschiedene Werte: jeder Wert kommt vor (genau)', () => {
    const z = Array.from({ length: 50000 }, (_, r) => [r % 3 === 0 ? 'ja' : r % 3 === 1 ? 'nein' : null, r % 2]);
    const rs = breitenZeilen(z, 0).map(r => z[r]![0]);
    expect(new Set(rs)).toEqual(new Set(['ja', 'nein', null]));
    expect(breitenZeilen(z, 1).length).toBe(2);
  });
  it('viele Zahlen: kleinster (mit Minus) und größter Wert sind dabei, 1.000 Stichproben, nicht alle Zeilen', () => {
    const z = Array.from({ length: 100000 }, (_, r) => [(r * 7919) % 100003 / 10]);
    z[41234] = [-123456.7]; z[77777] = [99999999.9];
    const rs = breitenZeilen(z, 0);
    expect(rs).toContain(41234); expect(rs).toContain(77777);
    expect(rs.length).toBeLessThan(1100);
  });
  it('viele Texte: die längsten sind dabei', () => {
    const z = Array.from({ length: 60000 }, (_, r) => ['Person ' + r]);
    z[12345] = ['ein sehr, sehr langer Freitext in einer einzigen Zelle'];
    expect(breitenZeilen(z, 0)).toContain(12345);
  });
  // Zeitgrenze: Allein gemessen ca. 0,3 s; im Gesamtlauf der Suite (parallel, 2300+ Tests) schwankt die Uhr um ein Mehrfaches,
  // eine feste Grenze von 1 s war dort gelegentlich rot (16.10.). Die Aussage ist: das ist deutlich billiger als der alte Weg
  // (jede Zelle formatieren und messen). Darum Vergleich gegen genau diese alte Rechnung, auf derselben Maschine unter derselben Last
  // gemessen, dazu eigener Test-Timeout statt der 5 s Voreinstellung.
  it('100.000 Zeilen × 47 Spalten: viel billiger als jede Zelle zu formatieren (vorher 3 s Stillstand)', () => {
    const z = Array.from({ length: 100000 }, (_, r) => Array.from({ length: 47 }, (_, c) => ((r * (c + 3)) % 9973) / 10));
    const t0 = performance.now(); for (let c = 0; c < 47; c++) breitenZeilen(z, c);
    const neu = performance.now() - t0;
    const fmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }), t1 = performance.now(); let breit = 0;
    for (let c = 0; c < 47; c++) for (let r = 0; r < z.length; r++) breit = Math.max(breit, fmt.format(z[r]![c] as number).length);
    const alt = performance.now() - t1;
    expect(breit).toBeGreaterThan(0);
    expect(neu).toBeLessThan(alt / 2);
    expect(neu).toBeLessThan(10000);   // großzügige absolute Obergrenze (allein ca. 0,4 s)
  }, 120000);
});
