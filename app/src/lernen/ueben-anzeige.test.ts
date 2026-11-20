import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { VERFAHREN } from '../lib/verfahren';

/** Abnahme 31.10. F11: Die Rückmeldung zeigte die Kennung der Karte („faktor“) und Kennungen aus der Wissensdatei („wissen:…“). */
describe('Üben: Anzeige der Rückmeldung', () => {
  const quelle = readFileSync(new URL('../bausteine/VerstehenUeben.svelte', import.meta.url), 'utf8');
  it('zeigt den Namen der Karte und keine rohen Belege', () => {
    expect(quelle).not.toMatch(/\{f\.karte\}/);
    expect(quelle).not.toContain('f.belege.join');
    expect(quelle).toContain("startsWith('wissen:')");
  });
  it('jede Karte, auf die eine Frage zeigt, gibt es (sonst fehlt der Link)', () => {
    const ids = new Set(VERFAHREN.map(v => v.id));
    const module = import.meta.glob<{ FRAGEN?: { id: string; karte?: string }[] }>(['./fragen-*.ts', '!./fragen-bau.ts'], { eager: true });
    let n = 0;
    for (const m of Object.values(module)) for (const fr of m.FRAGEN ?? []) if (fr.karte) { n++; expect(ids.has(fr.karte), `${fr.id}: ${fr.karte}`).toBe(true); }
    expect(n).toBeGreaterThan(10);
  });
});
