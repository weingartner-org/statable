import { describe, expect, it } from 'vitest';
// Hinweis: Beim Zusammenführen auf './kodieren' umstellen (der andere Bauer benennt kodierprobe um).
import { absaetze, einheitAn, saetze } from './kodieren';
import { langesTranskript } from './testdaten/langes-transkript';

describe('Leistungsprobe: 100.000 Zeichen, rund 1.500 Sätze (Fachblatt 6b, Punkt 7)', () => {
  const text = langesTranskript();

  it('das Testtranskript ist deterministisch und hat die vorgesehene Größe', () => {
    expect(langesTranskript()).toBe(text);
    expect(text.length).toBeGreaterThan(100000);
    expect(text.length).toBeLessThan(105000);
  });

  it('saetze: einmal in unter 1.500 ms, 1.300 bis 1.700 Sätze', () => {
    const t0 = performance.now();
    const s = saetze(text, 'de');
    const ms = performance.now() - t0;
    expect(s.length).toBeGreaterThanOrEqual(1300);
    expect(s.length).toBeLessThanOrEqual(1700);
    expect(ms).toBeLessThan(1500);
  });

  it('einheitAn: 1.000 Aufrufe zusammen in unter 100 ms', () => {
    const s = saetze(text, 'de');
    const a = absaetze(text);
    expect(a.length).toBeGreaterThan(100);
    const cps = Array.from({ length: 1000 }, (_, i) => Math.floor((i * 7919) % text.length));
    const t0 = performance.now();
    let treffer = 0;
    for (const cp of cps) if (einheitAn(s, cp)) treffer++;
    const ms = performance.now() - t0;
    expect(treffer).toBe(1000);
    expect(ms).toBeLessThan(100);
  });
});
