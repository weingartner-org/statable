import { describe, it, expect } from 'vitest';
import { psppName, festerName } from './einlesen';

// Johannes 29.10.2026: Namen in jeder Sprache. Überschriften aus Dateien bleiben lesbar, Namen von Statable selbst behalten ihre Schrift.
describe('Spaltennamen mit Akzenten und anderen Schriften', () => {
  it('Überschriften aus Dateien: Akzente fallen weg, der Buchstabe bleibt', () => {
    expect(psppName('âge', new Set(), 1)).toBe('age');
    expect(psppName('érték', new Set(), 1)).toBe('ertek');
    expect(psppName('Größe', new Set(), 1)).toBe('Groesse');
  });
  it('Überschriften nur in griechischer oder kyrillischer Schrift werden nicht zu „spalte1“', () => {
    expect(psppName('Ηλικία', new Set(), 1)).toBe('Ηλικία');
    expect(psppName('вік (роки)', new Set(), 1)).toBe('вік_роки');
  });
  it('feste Namen bleiben, solange sie gültig und frei sind', () => {
    const v = new Set<string>();
    expect(festerName('ανάγνωση_πριν', v, 1)).toBe('ανάγνωση_πριν');
    expect(festerName('lecture_après', v, 2)).toBe('lecture_après');
    expect(festerName('ANÁGNOSI', v, 3)).toBe('ANÁGNOSI');
    expect(festerName('LECTURE_APRÈS', v, 4)).toBe('LECTURE_APRES');   // schon vergeben (PSPP unterscheidet Groß/Klein nicht): wie eine Überschrift
    expect(festerName('with', v, 5)).not.toBe('with');
  });
});
