import { describe, it, expect } from 'vitest';
import { skalenArt, stufenFarben, istAusserhalb } from './stufenfarben';

const haeufigkeit = ['sehr selten', 'selten', 'manchmal', 'oft', 'sehr oft'];
const zustimmung = ['stimme gar nicht zu', 'stimme eher nicht zu', 'teils teils', 'stimme eher zu', 'stimme voll zu'];

describe('Farben geordneter Antwortskalen', () => {
  it('nur ordinale Spalten mit mindestens drei Stufen werden abgestuft', () => {
    expect(skalenArt('ordinal', haeufigkeit)).toBe('steigend');
    expect(skalenArt('nominal', haeufigkeit)).toBe('keine');
    expect(skalenArt('metrisch', haeufigkeit)).toBe('keine');
    expect(skalenArt(undefined, haeufigkeit)).toBe('keine');
    expect(skalenArt('ordinal', ['ja', 'nein'])).toBe('keine');
  });
  it('Zustimmung ist zweipolig, Häufigkeit und Wichtigkeit nicht', () => {
    expect(skalenArt('ordinal', zustimmung)).toBe('zweipolig');
    expect(skalenArt('ordinal', ['trifft nicht zu', 'trifft eher nicht zu', 'trifft eher zu', 'trifft zu'])).toBe('zweipolig');
    expect(skalenArt('ordinal', ['sehr unzufrieden', 'unzufrieden', 'zufrieden', 'sehr zufrieden'])).toBe('zweipolig');
    expect(skalenArt('ordinal', ['strongly disagree', 'disagree', 'neutral', 'agree', 'strongly agree'])).toBe('zweipolig');
    expect(skalenArt('ordinal', ['nie', 'selten', 'manchmal', 'oft', 'immer'])).toBe('steigend');
    expect(skalenArt('ordinal', ['gar nicht wichtig', 'etwas wichtig', 'sehr wichtig'])).toBe('steigend');
  });
  it('„weiß nicht“ steht außerhalb und zählt nicht mit', () => {
    expect(istAusserhalb('weiß nicht')).toBe(true);
    expect(istAusserhalb('keine Angabe')).toBe(true);
    expect(istAusserhalb('selten')).toBe(false);
    expect(skalenArt('ordinal', ['nie', 'selten', 'weiß nicht'])).toBe('keine');
    const f = stufenFarben([...haeufigkeit, 'weiß nicht'], 'steigend');
    expect(f).toHaveLength(6);
    expect(f[5]!.ausserhalb).toBe(true);
    expect(f.slice(0, 5).every(x => !x.ausserhalb)).toBe(true);
  });
  it('steigend: jede Stufe hat eine eigene, immer kräftigere Farbe', () => {
    const f = stufenFarben(haeufigkeit, 'steigend');
    expect(new Set(f.map(x => x.fuell)).size).toBe(5);
    const anteil = f.map(x => (x.fuell.includes('var(--tinte) ') ? 100 + Number(/--tinte\) (\d+)%/.exec(x.fuell)?.[1]) : Number(/dg-a\) (\d+)%/.exec(x.fuell)?.[1])));
    expect(anteil[0]).toBeLessThan(anteil[1]!);
    expect(anteil[1]).toBeLessThan(anteil[2]!);
    expect(anteil[2]).toBeLessThan(anteil[3]!);
    expect(f.every(x => x.fuell.includes('--dg-a'))).toBe(true);
    expect(f.every(x => !x.fuell.includes('--dg-b'))).toBe(true);
  });
  it('zweipolig: zwei Töne, heller neutraler Mittelpunkt, nach außen kräftiger', () => {
    const f = stufenFarben(zustimmung, 'zweipolig');
    expect(f[0]!.fuell).toContain('--dg-b');
    expect(f[1]!.fuell).toContain('--dg-b');
    expect(f[2]!.fuell).toContain('--tinte-2');
    expect(f[3]!.fuell).toContain('--dg-a');
    expect(f[4]!.fuell).toContain('--dg-a');
    // außen kräftiger als innen, beidseitig gleich
    const p = (s: string) => (s.includes('var(--tinte) ') ? 100 + Number(/--tinte\) (\d+)%/.exec(s)?.[1]) : Number(/ (\d+)%/.exec(s)?.[1]));
    expect(p(f[0]!.fuell)).toBeGreaterThanOrEqual(p(f[1]!.fuell));
    expect(p(f[4]!.fuell)).toBeGreaterThanOrEqual(p(f[3]!.fuell));
    expect(p(f[0]!.fuell)).toBe(p(f[4]!.fuell));
  });
  it('zweipolig: das verneinende Ende bekommt Ton B auch bei umgekehrter Kodierung', () => {
    const f = stufenFarben([...zustimmung].reverse(), 'zweipolig');
    expect(f[0]!.fuell).toContain('--dg-a');
    expect(f[4]!.fuell).toContain('--dg-b');
  });
  it('gerade Stufenzahl: kein Mittelpunkt, beide Seiten gleich hell innen', () => {
    const f = stufenFarben(['trifft nicht zu', 'trifft eher nicht zu', 'trifft eher zu', 'trifft zu'], 'zweipolig');
    expect(f.some(x => x.fuell.includes('--tinte-2'))).toBe(false);
    expect(f[1]!.fuell.replace('--dg-b', 'X')).toBe(f[2]!.fuell.replace('--dg-a', 'X'));
  });
  it('keine Abstufung bei „keine“', () => {
    expect(stufenFarben(haeufigkeit, 'keine')).toEqual([]);
  });
});
