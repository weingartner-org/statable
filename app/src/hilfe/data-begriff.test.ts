import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { artikelListe } from './artikel';
import { ladeGlossar } from './glossar';

/** Jede Wahl mit `data-begriff` erklärt sich am Rand (Meldung 31.10.): Das Ziel muss es geben, sonst bliebe der Rand stumm. */
const quellen = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? quellen(join(d, e.name)) : e.name.endsWith('.svelte') ? [join(d, e.name)] : []);

describe('data-begriff', () => {
  it('Jedes Ziel existiert, und es sind genug Wahlen verknüpft', async () => {
    await ladeGlossar('de');
    const alle = new Set(artikelListe('de').map(a => a.id));
    let n = 0;
    for (const f of quellen(join(__dirname, '..'))) for (const m of readFileSync(f, 'utf8').matchAll(/data-begriff="([^"]+)"/g)) { n++; expect(alle.has(m[1]!), `${f}: ${m[1]}`).toBe(true); }
    expect(n).toBeGreaterThan(50);
  });
});
