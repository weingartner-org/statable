import { describe, expect, it } from 'vitest';
import { artikelTeile } from './artikel';

/* Fachprüfung Welle 7, Punkt 14: Die Seitenleiste „Ergebnis lesen“ der Faktor-Karte erklärt Komponenten und Ladungen, nicht CFI und RMSEA (die gehören zur konfirmatorischen Analyse). */
describe('Faktor-Karte: Seitenleiste „Ergebnis lesen“', () => {
  const text = (sp: 'de' | 'en') => JSON.stringify(artikelTeile('frage-faktor', ['lesen'], sp));
  it('erklärt Komponenten, Ladungen und Eigenwert - ohne CFI und RMSEA', () => {
    for (const sp of ['de', 'en'] as const) { const t = text(sp); expect(t).toMatch(/Ladung|loading/); expect(t).toMatch(/Eigenwert|eigenvalue/); expect(t).not.toMatch(/CFI|RMSEA/); }
    expect(text('de')).toContain('Komponenten fassen die Varianz mehrerer Fragen zusammen');
  });
  it('die Passung der konfirmatorischen Analyse steht weiter im Artikel', () => {
    const alle = JSON.stringify(artikelTeile('frage-faktor', ['kurz', 'voraus', 'lesen'], 'de')); expect(alle).not.toMatch(/RMSEA/);
  });
});
