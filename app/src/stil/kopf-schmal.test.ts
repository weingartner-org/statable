import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/** Abnahme 31.10. S1: Mit Projekt hat der Kopf bis zu zehn Knöpfe; bei 375 px war er 424 px breit und quetschte den Projekt-Knopf auf 22 px.
 *  Im Browser gemessen (Mac, 320/360/375 px, mit Projekt, de/uk/el): scrollWidth = clientWidth. Dieser Wächter hält die Regel fest. */
describe('Kopf bei schmaler Breite', () => {
  const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
  it('bricht die Kopfzeile um und lässt die Knöpfe umbrechen (nur über die Schwelle eng-480, nie @media)', () => {
    expect(css).toMatch(/:where\(:root\.eng-480\) \.kopf-oben\{flex-wrap:wrap/);
    expect(css).toMatch(/:where\(:root\.eng-480\) \.kopf-rechts\{flex-wrap:wrap;max-width:100%/);
  });
});
