import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FREIGEGEBEN } from '../i18n/laufzeit';

/** Die Plakat-Links in Hilfe und Impressum müssen auf echte PDF-Dateien zeigen - je freigegebener Sprache eine (18.10.2026). */
describe('Plakat zum Herunterladen', () => {
  for (const sp of FREIGEGEBEN) {
    it(`statable-plakat-${sp}.pdf ist ein PDF`, () => {
      const daten = readFileSync(new URL(`../../public/plakat/statable-plakat-${sp}.pdf`, import.meta.url));
      expect(daten.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(daten.subarray(-1024).toString('latin1')).toContain('%%EOF');
      expect(daten.length).toBeGreaterThan(20000);
    });
  }
  it('der Link nennt den Dateinamen mit .pdf und den Typ', () => {
    const quelle = readFileSync(new URL('./PlakatLink.svelte', import.meta.url), 'utf8');
    expect(quelle).toContain('download={name(');
    expect(quelle).toContain('type="application/pdf"');
  });
});
