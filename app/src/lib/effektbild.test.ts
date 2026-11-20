import { describe, expect, it } from 'vitest';
import { ueberlappung, u3, ueberlegenheit, personenJeGruppe, einordnungD } from './effektbild';

/* Sollwerte: R pnorm (2 * pnorm(-d/2), pnorm(d), pnorm(d / sqrt(2))) und die Normalnäherung n = 2 (1,96 + 0,8416)² / d². */
describe('Effektstärke sehen', () => {
  it('Überlappung, U3 und Überlegenheit', () => {
    expect(ueberlappung(0.5)).toBeCloseTo(0.8025872, 6); expect(u3(0.5)).toBeCloseTo(0.6914625, 6); expect(ueberlegenheit(0.5)).toBeCloseTo(0.6381632, 6);
    expect(ueberlappung(0.8)).toBeCloseTo(0.6891565, 6); expect(u3(0.8)).toBeCloseTo(0.7881446, 6); expect(ueberlegenheit(0.8)).toBeCloseTo(0.7141961, 6);
    expect(ueberlappung(0)).toBeCloseTo(1, 12); expect(ueberlappung(-0.5)).toBeCloseTo(ueberlappung(0.5), 12);
  });
  it('Personen je Gruppe und Einordnung', () => {
    expect(personenJeGruppe(0.5)).toBe(63); expect(personenJeGruppe(0.8)).toBe(25); expect(personenJeGruppe(0)).toBe(Infinity);
    expect([0.1, 0.3, 0.6, 1, 1.5].map(einordnungD)).toEqual([0, 1, 2, 3, 4]);
  });
});
