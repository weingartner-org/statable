import { describe, expect, it } from 'vitest';
import { csvBytes } from './einlesen';

/* Stufe 2 große Dateien: Die CSV für die Engine entsteht in Häppchen. Sie muss Byte für Byte dieselbe sein wie die alte Fassung aus einem ganzen Text. */
const alt = (kopf: string, zeilen: string[]) => new TextEncoder().encode([kopf, ...zeilen].join('\n') + '\n');

describe('CSV in Häppchen', () => {
  const zeilen = Array.from({ length: 1003 }, (_, i) => `${i},"ä""ö ${i % 7}",€𝄞,${i % 3 ? '' : '1.5'}`);
  it.each([1, 2, 7, 1000, 1003, 1004, 50000])('gleiche Bytes bei Häppchen von %i Zeilen', je => {
    expect(csvBytes('a,b,c,d', zeilen, z => z, je)).toEqual(alt('a,b,c,d', zeilen));
  });
  it('ohne Zeilen bleibt die Kopfzeile', () => {
    expect(csvBytes('a', [] as string[], z => z)).toEqual(alt('a', []));
  });
});
