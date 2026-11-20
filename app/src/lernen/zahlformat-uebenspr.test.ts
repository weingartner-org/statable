import { describe, expect, it } from 'vitest';
import '../i18n/profil';
import { ladeSprache, paarText } from '../i18n/laufzeit';
import { FAELLE } from './fragen-faktor';

/** Abnahme 31.10. F13: In Ukrainisch stand in der Üben-Tabelle „нижче 0.30“ (Punkt), obwohl die Sprache das Komma hat; der eingesetzte Wert kam im englischen Format. */
describe('Üben: eingesetzte Zahlen folgen dem Dezimalzeichen der Sprache', () => {
  it('uk: Komma, nicht Punkt', async () => {
    await ladeSprache('uk');
    const t = Object.values(FAELLE!).flatMap(f => f.tabellen).flatMap(x => (x.titel ? [paarText('uk', x.titel)] : []));
    expect(t.length).toBeGreaterThan(0);
    for (const x of t) expect(x, x).not.toMatch(/\d\.\d/);
    expect(t.some(x => /0,30|0,40/.test(x))).toBe(true);
  });
});
