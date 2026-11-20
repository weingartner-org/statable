import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { papierbogenDruck, papierbogenDateiname } from './papierbogen-druck';

const plan = JSON.parse(readFileSync(new URL('./testdaten/fragebogenplan/export-plan.json', import.meta.url), 'utf8'));

describe('Papierbogen: Druckdatei', () => {
  it('erzeugt je Bogen eigene Seiten mit vier Eckmarken und Kästchen', () => {
    const d = papierbogenDruck(plan, 'de', 3);
    expect(d.boegen).toBe(3);
    expect(d.seiten).toBeGreaterThanOrEqual(3);
    expect(d.html).toContain('<html lang="de">');
    expect((d.html.match(/class="k"/g) ?? []).length).toBeGreaterThan(3);
    expect(d.html).toContain('Bogen 3 von 3');
    expect(d.html).not.toContain('undefined');
  });
  it('begrenzt die Anzahl und nennt den Dateinamen', () => {
    expect(papierbogenDruck(plan, 'de', 99999).boegen).toBe(500);
    expect(papierbogenDruck(plan, 'de', 0).boegen).toBe(1);
    expect(papierbogenDateiname(plan, 'de')).toMatch(/-antwortbogen\.html$/);
  });
});
