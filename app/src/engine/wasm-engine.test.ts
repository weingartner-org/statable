import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WasmEngine, EngineAbbruch, EngineAbgebrochen, istAbbruch } from './wasm-engine';

/** Stellt den Worker nach: „ABSTURZ“ im Befehl lässt ihn so abbrechen wie PSPP bei CROSSTABS (Assertion → RuntimeError). */
class FalscherWorker {
  static alle: FalscherWorker[] = [];
  befehle: string[] = [];
  beendet = false;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { message: string }) => void) | null = null;
  constructor() { FalscherWorker.alle.push(this); }
  postMessage({ id, syntax }: { id: number; syntax?: string }) {
    if (this.beendet) return;
    this.befehle.push(syntax ?? '');
    if (syntax?.includes('ENDLOS')) return;   // rechnet und rechnet - nie eine Antwort
    const antwort = syntax?.includes('ABSTURZ')
      ? { id, error: 'Error: RuntimeError: Aborted(Assertion failed: proc.n_cells < CRS_N_CELLS, at: ../../pspp-2.1.1/src/language/commands/crosstabs.c,494,cmd_crosstabs)' }
      : { id, items: [], ms: 0 };
    queueMicrotask(() => this.onmessage?.({ data: antwort }));
  }
  terminate() { this.beendet = true; }
}

describe('WasmEngine nach einem Absturz von PSPP', () => {
  beforeEach(() => { FalscherWorker.alle = []; vi.stubGlobal('Worker', FalscherWorker); vi.stubGlobal('document', { baseURI: 'http://localhost/' }); });

  it('erkennt Abbrüche von WebAssembly, nicht gewöhnliche Fehler', () => {
    expect(istAbbruch('RuntimeError: Aborted(Assertion failed: x)')).toBe(true);
    expect(istAbbruch('RuntimeError: memory access out of bounds')).toBe(true);
    expect(istAbbruch('Engine nicht geladen (404)')).toBe(false);
  });

  it('meldet den Abbruch, startet neu, füllt die Daten wieder ein und rechnet danach weiter', async () => {
    const e = new WasmEngine();
    e.nachNeustart = async roh => { await roh('DATEN WIEDER EINFUELLEN'); };
    await expect(e.run('CROSSTABS ABSTURZ.')).rejects.toBeInstanceOf(EngineAbbruch);
    await e.run('FREQUENCIES x.');
    expect(FalscherWorker.alle).toHaveLength(2);
    expect(FalscherWorker.alle[0]!.beendet).toBe(true);
    // Erst die Engine starten, dann die Daten, dann die nächste Rechnung - nie umgekehrt.
    expect(FalscherWorker.alle[1]!.befehle).toEqual(['SET PRINTBACK=OFF.', 'DATEN WIEDER EINFUELLEN', 'FREQUENCIES x.']);
  });

  it('gewöhnliche Fehler lassen die Engine stehen', async () => {
    const e = new WasmEngine();
    const w = FalscherWorker.alle[0]!;
    w.postMessage = ({ id }: { id: number }) => queueMicrotask(() => w.onmessage?.({ data: { id, error: 'Error: etwas anderes' } }));
    await expect(e.run('X.')).rejects.not.toBeInstanceOf(EngineAbbruch);
    expect(FalscherWorker.alle).toHaveLength(1);
  });

  it('Abbrechen: eine endlose Rechnung endet, die Engine startet neu, die Daten sind wieder da, der nächste Befehl läuft', async () => {
    const e = new WasmEngine();
    e.nachNeustart = async roh => { await roh('DATEN WIEDER EINFUELLEN'); };
    const lang = e.run('LOOP ENDLOS.').catch(x => x);
    e.abbrechen();
    expect(await lang).toBeInstanceOf(EngineAbgebrochen);
    expect(await lang).toBeInstanceOf(EngineAbbruch);
    await e.run('FREQUENCIES x.');
    expect(FalscherWorker.alle).toHaveLength(2);
    expect(FalscherWorker.alle[0]!.beendet).toBe(true);
    expect(FalscherWorker.alle[1]!.befehle).toEqual(['SET PRINTBACK=OFF.', 'DATEN WIEDER EINFUELLEN', 'FREQUENCIES x.']);
  });

  it('Abbrechen ohne laufende Rechnung schadet nicht', async () => {
    const e = new WasmEngine();
    e.abbrechen();
    await e.run('FREQUENCIES x.');
    expect(FalscherWorker.alle).toHaveLength(2);
  });
});
