import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Eine Engine ohne Worker: genug, damit Öffnen, Aktualisieren und Speichern laufen. */
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

import { s, weiterarbeiten, sichern, konfliktNeuLaden, konfliktHierWeiter } from './sitzung.svelte';
import { ladeProjekt, listeProjekte, loescheProjekt, speichereProjekt, type Projekt } from './ablage';

const projekt = (name: string, zeit: number): Projekt => ({ name, quelle: 'test.csv', sav: new Uint8Array([9]), blaetter: [], entscheid: {}, zeit });
const ZB = Date.now() + 1000, ZC = Date.now() + 2000;
const warte = (ms: number) => new Promise(r => setTimeout(r, ms));

beforeEach(async () => { for (const e of await listeProjekte()) await loescheProjekt(e.id); });

describe('Zwei Tabs, ein Projekt: die Sitzung fragt, statt still zu überschreiben (D16)', () => {
  it('Tab A schreibt nach einer Änderung in Tab B nicht, sondern meldet den Konflikt; „Neu laden“ und „Hier weiterarbeiten“ lösen ihn', async () => {
    const id = await speichereProjekt(projekt('Fassung 1', 100));
    await weiterarbeiten(id);                          // Tab A öffnet das Projekt und kennt Stand 100
    expect(s.konflikt).toBe(false);
    await speichereProjekt({ ...projekt('Tab B', ZB), id }, 100);   // Tab B speichert danach
    await sichern(); await warte(900);                 // Tab A will speichern
    expect(s.konflikt).toBe(true);
    expect((await ladeProjekt(id))?.name).toBe('Tab B');      // nichts überschrieben

    await konfliktNeuLaden();                          // Entscheidung 1: neu laden
    expect(s.konflikt).toBe(false);
    expect(s.projekt?.name).toBe('Tab B');

    // zweite Runde: wieder ein anderer Tab, diesmal Entscheidung 2
    await speichereProjekt({ ...projekt('Tab C', ZC), id }, ZB);
    await sichern(); await warte(900);
    expect(s.konflikt).toBe(true);
    konfliktHierWeiter(); await warte(900);
    expect(s.konflikt).toBe(false);
    expect((await ladeProjekt(id))?.name).toBe('Tab B');      // dieser Tab wusste „Tab B“ und überschreibt jetzt bewusst
    expect((await ladeProjekt(id))!.zeit).not.toBe(ZC);      // der Stand aus Tab C ist ersetzt
  }, 20000);
});
