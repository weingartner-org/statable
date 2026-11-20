import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';

// Testrunde 24.10.2026, Teil A: Ausgaben der Befehle-Seite wanderten beim Projektwechsel mit (Zahlen aus Projekt 1 unter Projekt 2).
vi.mock('../engine/wasm-engine', () => {
  class EngineAbbruch extends Error {}
  class EngineAbgebrochen extends EngineAbbruch {}
  class WasmEngine {
    onFortschritt?: unknown; nachNeustart?: unknown;
    async run() { return { items: [], ms: 0 }; }
    async data() { return { csv: '' }; }
    async exportSav() { return { bytes: new Uint8Array([1, 2, 3]) }; }
    async importSav() { return { items: [], ms: 0 }; }
    abbrechen() {}
  }
  return { WasmEngine, EngineAbbruch, EngineAbgebrochen };
});

import { weiterarbeiten, projektSchliessen } from './sitzung.svelte';
import { speichereProjekt, type Projekt } from './ablage';
import { befehle } from './befehlsspeicher.svelte';

const projekt = (name: string): Projekt => ({ name, quelle: 'test.csv', sav: new Uint8Array([9]), blaetter: [], entscheid: {}, zeit: Date.now() });
const lauf = () => ({ id: 1, syntax: 'FREQUENCIES VARIABLES=gruppe.', items: [], ms: 1, zeit: 1 });

describe('Befehle-Ausgaben gehören zum Projekt', () => {
  it('Wechsel zu einem anderen Projekt und Schließen leeren die Ausgaben, der Befehlstext bleibt', async () => {
    const a = await speichereProjekt(projekt('nacht')), b = await speichereProjekt(projekt('mtcars'));
    await weiterarbeiten(a);
    befehle.text = 'FREQUENCIES VARIABLES=gruppe.'; befehle.laeufe = [lauf()];
    await weiterarbeiten(a, true);                 // dasselbe Projekt neu lesen: Ausgaben bleiben
    expect(befehle.laeufe.length).toBe(1);
    await weiterarbeiten(b);                       // anderes Projekt
    expect(befehle.laeufe).toEqual([]);
    expect(befehle.text).toBe('FREQUENCIES VARIABLES=gruppe.');
    befehle.laeufe = [lauf()];
    await projektSchliessen();
    expect(befehle.laeufe).toEqual([]);
  }, 20000);
});
