import { describe, expect, it } from 'vitest';
import { einfachSatz } from './mehrfaktorsaetze';

describe('Satz zu den einfachen Haupteffekten', () => {
  const z = (p: number[]) => p.map((x, i) => ({ stufe: `S${i + 1}`, df1: 1, df2: 10, f: 1, p: x, pHolm: x }));
  it('nennt die Stufen, bei allen oder bei keiner', () => {
    expect(einfachSatz('A', 'B', z([0.01, 0.2]))).toContain('bedeutsam bei S1; bei den übrigen Stufen nicht');
    expect(einfachSatz('A', 'B', z([0.01, 0.02]))).toContain('bei allen Stufen bedeutsam');
    expect(einfachSatz('A', 'B', z([0.3, 0.2]))).toContain('bei keiner Stufe');
    expect(einfachSatz('A', 'B', [])).toBe('');
  });
});
