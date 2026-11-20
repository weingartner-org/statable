/**
 * Nur für Tests: dieselbe Schnittstelle wie `WasmEngine` (engine/wasm-engine.ts), aber die PSPP-Engine läuft in Node ohne Worker.
 * Mit `setzeTestMotor` (lib/sitzung.svelte.ts) laufen dann die echten Funktionen der Sitzung (`oeffneTabelle`, `aendere`, `rueckgaengig` …) gegen die echte Engine.
 * Die Operationen sind die des Workers (engine/worker.ts): run, data, exportSav, importSav.
 */
import type { DataResult, OutputItem, RunResult, SavResult } from '../engine/types';
import { korrigiereAusgabe } from '../engine/korrektur';
import type { WasmEngine } from '../engine/wasm-engine';

export async function erzeugeTestMotor(): Promise<WasmEngine> {
  const pfad = new URL('../../public/wasm/pspp.mjs', import.meta.url).href;
  const { default: erzeuge } = (await import(/* @vite-ignore */ pfad)) as { default: () => Promise<any> };
  const m = await erzeuge();
  if (m.cwrap('pspp_web_init', 'number', [])() !== 0) throw new Error('init');
  const runSyntax = m.cwrap('pspp_web_run', 'number', ['string']);
  let stand = 0;
  const nimm = (): OutputItem[] => {
    const alles: string = m.FS.readFile('/out.ndjson', { encoding: 'utf8' });
    const neu = alles.slice(stand); stand = alles.length;
    return neu.split('\n').filter(Boolean).map(l => JSON.parse(l) as OutputItem);
  };
  const e = {
    onFortschritt: undefined, nachNeustart: undefined,
    async run(syntax: string, files: Record<string, Uint8Array> = {}): Promise<RunResult> {
      for (const [p, b] of Object.entries(files)) m.FS.writeFile(p, b);
      runSyntax(syntax);
      for (const p of Object.keys(files)) if (p === '/import.csv' || p === '/eingabe.csv') m.FS.unlink(p);   // wie engine/worker.ts
      const items = nimm(); korrigiereAusgabe(items, syntax);
      return { items, ms: 0 };
    },
    async data(): Promise<DataResult> {
      runSyntax("SAVE TRANSLATE /OUTFILE='/data.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
      const items = nimm(); let csv = '';
      try { csv = m.FS.readFile('/data.csv', { encoding: 'utf8' }); m.FS.unlink('/data.csv'); } catch { /* leer */ }
      return { csv, items };
    },
    async exportSav(): Promise<SavResult> {
      runSyntax("SAVE OUTFILE='/p.sav'.");
      const items = nimm(); let bytes = new Uint8Array(0);
      try { bytes = new Uint8Array(m.FS.readFile('/p.sav')); m.FS.unlink('/p.sav'); } catch { /* keine Daten */ }
      return { bytes, items };
    },
    async importSav(bytes: Uint8Array): Promise<RunResult> {
      m.FS.writeFile('/in.sav', bytes ?? new Uint8Array(0));
      runSyntax("NEW FILE.\nGET FILE='/in.sav'.\nEXECUTE.");
      m.FS.unlink('/in.sav');
      return { items: nimm(), ms: 0 };
    },
    abbrechen() { /* im Test nichts zu abbrechen */ },
    async reset() { /* nicht nötig */ }
  };
  return e as unknown as WasmEngine;
}
