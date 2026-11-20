import { describe, it, expect } from 'vitest';
import de from './messages.de.json';
import en from './messages.en.json';

/**
 * Wächter für die Begriffe A-Z der Hilfe (Stil: docs/fachblaetter/LEXIKON-STIL.md).
 * Prüft nur Form und Spuren, nicht die Fachaussagen - die stehen in docs/fachblaetter/BEGRIFFE-BERICHT.md.
 */
const felder = ['kurz', 'beispiel', 'vorsicht'] as const;
const verboten = [
  /Zeitmanagement/i, /Wiederholungsstrateg/i, /Lernen im Studium/i, /Statistikangst/i, /Ablenkbar/i,
  /time management/i, /rehearsal/i, /statistics anxiety/i, /distractib/i,
  /B = 0[,.]24/, /β = [,.]29/, /β = [,.]21/, /R² = [,.]15/, /R² = [,.]08/, /Konstante 2[,.]17/, /constant 2[,.]17/i,
];
const sprachen = { de: de.erklaer, en: en.erklaer } as Record<string, Record<string, Record<string, unknown>>>;
const woerter = (t: string) => t.trim().split(/\s+/).length;

describe('Begriffe A-Z: Form und Spuren', () => {
  it('135 Begriffe, in beiden Sprachen dieselben Schlüssel', () => {
    expect(Object.keys(de.erklaer)).toHaveLength(135);
    expect(Object.keys(en.erklaer)).toEqual(Object.keys(de.erklaer));
  });
  for (const [sprache, erklaer] of Object.entries(sprachen)) {
    it(`${sprache}: keine Spuren aus fremden Unterlagen, keine langen Striche`, () => {
      for (const [k, e] of Object.entries(erklaer)) for (const f of felder) {
        const t = String(e[f]);
        for (const v of verboten) expect(t, `${k}.${f}`).not.toMatch(v);
        expect(t, `${k}.${f}`).not.toMatch(/[–—]/);
      }
    });
    it(`${sprache}: kurz höchstens 60 Wörter, vorsicht höchstens drei Sätze`, () => {
      for (const [k, e] of Object.entries(erklaer)) {
        expect(woerter(String(e.kurz)), `${k}.kurz`).toBeLessThanOrEqual(60);
        const saetze = String(e.vorsicht).replace(/u\. a\.|et al\./g, '').match(/[.!?](\s|$)/g) ?? [];
        expect(saetze.length, `${k}.vorsicht`).toBeLessThanOrEqual(3);
      }
    });
  }
  it('Deutsch: Erklärtexte sprechen niemanden an (kein du, kein Sie als Anrede)', () => {
    for (const [k, e] of Object.entries(de.erklaer)) for (const f of felder) expect(String(e[f]), `${k}.${f}`).not.toMatch(/\b(du|dein\w*|Ihr\w*|Ihnen)\b/);
  });
});
