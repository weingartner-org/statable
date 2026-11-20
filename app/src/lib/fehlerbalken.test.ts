import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { balkenWiederholt } from './fehlerbalken';

const dir = new URL('../../../docs/fachblaetter/sollwerte/', import.meta.url);
const soll = JSON.parse(readFileSync(new URL('field-stufe2.json', dir), 'utf8')).cousineau_morey as { mittel: number[]; se_cm: number[]; lo: number[]; hi: number[]; se_normal: number[] };
/** sleepstudy, Tage 0 bis 3, breit: eine Zeile je Person. */
function breit(): number[][] {
  const z = readFileSync(new URL('sleepstudy.csv', dir), 'utf8').trim().split('\n').slice(1).map(l => l.split(',').map(s => s.replace(/"/g, '')));
  const je = new Map<string, number[]>();
  for (const [r, tag, vp] of z) if (+tag! <= 3) { const a = je.get(vp!) ?? []; a[+tag!] = +r!; je.set(vp!, a); }
  return [...je.values()];
}
const naeher = (a: number[], b: number[], tol = 1e-9) => a.forEach((v, i) => expect(Math.abs(v - b[i]!), `Wert ${i}`).toBeLessThan(tol));

describe('Fehlerbalken bei Messwiederholung (gegen R, Cousineau-Morey)', () => {
  const daten = breit();
  it('18 Personen, 4 Tage', () => { expect(daten).toHaveLength(18); expect(daten[0]).toHaveLength(4); });
  it('Cousineau-Morey: Mittel, Standardfehler und Intervall gleich R', () => {
    const b = balkenWiederholt(daten, 'cm')!;
    naeher(b.mittel, soll.mittel); naeher(b.se, soll.se_cm); naeher(b.lo, soll.lo); naeher(b.hi, soll.hi);
  });
  it('Standardfehler (gewöhnlich) gleich R', () => { naeher(balkenWiederholt(daten, 'se')!.halb, soll.se_normal); });
  it('95 %-Intervall = t · Standardfehler, Standardabweichung = SE · Wurzel n', () => {
    const k = balkenWiederholt(daten, 'ki')!, s = balkenWiederholt(daten, 'sd')!;
    k.halb.forEach((h, j) => expect(h / soll.se_normal[j]!).toBeCloseTo(2.109816, 5));   // qt(.975, 17)
    s.halb.forEach((h, j) => expect(h).toBeCloseTo(soll.se_normal[j]! * Math.sqrt(18), 9));
  });
  it('Cousineau-Morey ist bei Messwiederholung meist schmaler als das gewöhnliche Intervall', () => {
    const c = balkenWiederholt(daten, 'cm')!, k = balkenWiederholt(daten, 'ki')!;
    expect(c.halb.every((h, j) => h < k.halb[j]!)).toBe(true);
  });
  it('zu wenig Personen oder Lücken: null', () => {
    expect(balkenWiederholt([[1, 2], [2, 3]], 'ki')).toBeNull();
    expect(balkenWiederholt([[1, NaN], [2, 3], [3, 4], [4, 5]], 'ki')).not.toBeNull();   // Zeile mit Lücke fällt weg, 3 bleiben
    expect(balkenWiederholt([[1, NaN], [2, NaN], [3, 4]], 'ki')).toBeNull();
  });
});
