/** `uebersetzen.mjs --zusammen` darf Handkorrekturen nie überschreiben (zweimal passiert, 16.10.). */
import { describe, expect, it } from 'vitest';
import { einspielen, leer } from '../../i18n/einspielen.mjs';

describe('--zusammen: nur fehlende Schlüssel eintragen', () => {
  it('fehlender oder leerer Schlüssel wird eingetragen', () => {
    const z: Record<string, unknown> = { b: '', c: {} };
    expect(einspielen(z, 'a', 'neu')).toBe('neu');
    expect(einspielen(z, 'b', 'neu')).toBe('neu');
    expect(einspielen(z, 'c', { one: 'x', other: 'y' })).toBe('neu');
    expect(z).toEqual({ a: 'neu', b: 'neu', c: { one: 'x', other: 'y' } });
  });
  it('vorhandener, abweichender Wert bleibt (auch Mehrzahl-Objekte)', () => {
    const z: Record<string, unknown> = { a: 'Handkorrektur', m: { one: 'a', other: 'b' } };
    expect(einspielen(z, 'a', 'out-Wert')).toBe('behalten');
    expect(einspielen(z, 'm', { one: 'a', other: 'c' })).toBe('behalten');
    expect(z).toEqual({ a: 'Handkorrektur', m: { one: 'a', other: 'b' } });
  });
  it('gleicher Wert wird als gleich gemeldet, nicht als Abweichung', () => {
    const z: Record<string, unknown> = { a: 'x', m: { one: 'a', other: 'b' } };
    expect(einspielen(z, 'a', 'x')).toBe('gleich');
    expect(einspielen(z, 'm', { one: 'a', other: 'b' })).toBe('gleich');
  });
  it('--ueberschreiben: der alte Fall', () => {
    const z: Record<string, unknown> = { a: 'alt' };
    expect(einspielen(z, 'a', 'neu', true)).toBe('ersetzt');
    expect(z.a).toBe('neu');
  });
  it('leer: nur undefined, null, "" und {}', () => {
    expect([undefined, null, '', {}].every(leer)).toBe(true);
    expect(['0', 0, 'x', { one: 'x' }].some(leer)).toBe(false);
  });
});
