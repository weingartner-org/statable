import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { nodeEngine } from '../lib/testengine';
import { finde } from '../lib/tabelle';

/**
 * PSPP 2.1.1 brach bei CROSSTABS ab, sobald alle 8 Zellarten zugleich verlangt wurden (/CELLS=ALL oder alle einzeln):
 * crosstabs.c:494 prüfte `proc.n_cells < CRS_N_CELLS` statt `<=` - ein Zählfehler. Behoben mit patches/0002-crosstabs-alle-zellen.diff
 * (Bericht an PSPP: docs/PSPP-FEHLERBERICHT-CROSSTABS.md). Fängt die Oberfläche trotzdem einmal einen Absturz, hilft wasm-engine.ts.
 */
const DATEN = `DATA LIST LIST /g a.\nBEGIN DATA\n${Array.from({ length: 40 }, (_, i) => `${i % 2} ${i % 3}`).join('\n')}\nEND DATA.\n`;
const ZELLEN = ['COUNT', 'ROW', 'COLUMN', 'TOTAL', 'EXPECTED', 'RESID', 'SRESID', 'ASRESID'];

describe('CROSSTABS mit allen Zellarten (Patch crosstabs.c:494)', () => {
  it('/CELLS=ALL und alle 8 einzeln laufen und zeigen alle 8 Zeilen je Zelle', async () => {
    for (const cells of ['ALL', ZELLEN.join(' ')]) {
      const e = await nodeEngine();
      const items = e.run(DATEN + `CROSSTABS g BY a /CELLS=${cells}.`);
      const t = JSON.stringify(finde(items, /^g × a$/));
      for (const z of ['Count', 'Expected', 'Row %', 'Column %', 'Total %', 'Residual', 'Std. Residual', 'Adjusted Residual']) expect(t).toContain(`"${z}"`);
    }
  });

  it('7 von 8 Zellarten und alle Statistiken laufen weiter', async () => {
    const e = await nodeEngine();
    for (const weg of ZELLEN) expect(finde(e.run(DATEN + `CROSSTABS g BY a /CELLS=${ZELLEN.filter(z => z !== weg).join(' ')}.`), /^g × a$/)).toBeTruthy();
    expect(finde(e.run(DATEN + 'CROSSTABS g BY a /STATISTICS=CHISQ PHI CC LAMBDA KAPPA ETA CORR GAMMA D BTAU CTAU /CELLS=COUNT.'), /^Symmetric Measures$/)).toBeTruthy();
  });

  it('die geführten Auswertungen und Bausteine verlangen nie /CELLS=ALL', () => {
    for (const datei of ['../lib/verfahren.ts', '../lib/bausteine.ts']) {
      const text = readFileSync(new URL(datei, import.meta.url), 'utf8');
      const angaben = [...text.matchAll(/\/CELLS=([A-Z ]+)/g)].map(m => m[1]!.trim().split(/\s+/));
      expect(angaben.length).toBeGreaterThan(0);
      for (const a of angaben) expect(a).not.toContain('ALL');
    }
  });
});
