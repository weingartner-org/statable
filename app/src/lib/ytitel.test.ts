import { describe, it, expect } from 'vitest';
import { yZeilen, yZusatz, xZeilen, xZusatz } from './ytitel';

describe('senkrechter Achsentitel', () => {
  it('kurz: eine Zeile, kein Zusatz', () => {
    expect(yZeilen('Anzahl', 260)).toEqual(['Anzahl']);
    expect(yZusatz('Anzahl', 260)).toBe(0);
  });
  it('lang: bricht um statt abzuschneiden, nichts geht verloren', () => {
    const t = 'Abweichung bei Beschäftigung während des Studiums (Stunden pro Woche)';
    const z = yZeilen(t, 266, 13, true);
    expect(z.length).toBeGreaterThan(1);
    expect(z.join(' ')).toBe(t);
    expect(z.some(l => l.includes('…'))).toBe(false);
    expect(yZusatz(t, 266, 13, true)).toBe((z.length - 1) * 16);
  });
  it('sehr lang: höchstens drei Zeilen, dann „…“', () => {
    const z = yZeilen('wort '.repeat(80), 200);
    expect(z).toHaveLength(3);
    expect(z[2]!.endsWith('…')).toBe(true);
  });
  it('ein überlanges Wort wird geteilt', () => {
    const z = yZeilen('Donaudampfschifffahrtsgesellschaftskapitänsmütze', 120);
    expect(z.length).toBeGreaterThan(1);
    expect(z[0]!.endsWith('-')).toBe(true);
  });
});

describe('waagrechter Achsentitel', () => {
  it('kurz: eine Zeile, kein Zusatz', () => {
    expect(xZeilen('Zeit', 400)).toEqual(['Zeit']);
    expect(xZusatz('Zeit', 400)).toBe(0);
  });
  it('lang: bricht um statt abzuschneiden, nichts geht verloren', () => {
    const t = 'Wann wurde die Hochschulreife erworben (Jahr des Abschlusses an der Schule)';
    const z = xZeilen(t, 300, 13, true);
    expect(z.length).toBeGreaterThan(1);
    expect(z.join(' ')).toBe(t);
    expect(z.some(l => l.includes('…'))).toBe(false);
    expect(xZusatz(t, 300, 13, true)).toBe((z.length - 1) * 16);
  });
  it('sehr lang: höchstens drei Zeilen, dann „…“; der Zusatz wächst höchstens um zwei Zeilen', () => {
    const z = xZeilen('wort '.repeat(80), 300);
    expect(z).toHaveLength(3);
    expect(z[2]!.endsWith('…')).toBe(true);
    expect(xZusatz('wort '.repeat(80), 300)).toBe(32);
  });
  it('breitere Achse braucht weniger Zeilen', () => {
    const t = 'Wann wurde die Hochschulreife erworben (Jahr des Abschlusses)';
    expect(xZeilen(t, 600).length).toBeLessThan(xZeilen(t, 200).length);
  });
});
