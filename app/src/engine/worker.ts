/// <reference lib="webworker" />
// Läuft die PSPP-Engine (WebAssembly) außerhalb des Hauptfadens.
import type { DataResult, OutputItem, RunResult, SavResult } from './types';

interface Request { id: number; op: 'run' | 'data' | 'exportSav' | 'importSav'; syntax?: string; bytes?: Uint8Array; files?: Record<string, Uint8Array> }
interface PsppModule {
  cwrap(name: string, ret: string, args: string[]): (...a: unknown[]) => number;
  FS: {
    readFile(p: string): Uint8Array;
    readFile(p: string, o: { encoding: 'utf8' }): string;
    writeFile(p: string, d: Uint8Array): void;
    unlink(p: string): void;
  };
}

declare const __WASM_BYTES__: number;

let mod: PsppModule;
let runSyntax: (syntax: string) => number;
let offset = 0;

/** Quelldateien, die die Engine nach dem Einlesen nicht mehr braucht; sonst lägen die Daten doppelt in ihrem Speicher. Eine zweite Datei (Zusammenführen) bleibt, sie gilt über mehrere Aufrufe. */
const NUR_EINMAL = new Set(['/import.csv', '/eingabe.csv']);
const weg = (pfad: string) => { try { mod.FS.unlink(pfad); } catch { /* keine Datei */ } };

/** Lädt die Engine-Datei selbst, damit die Ladeanzeige echte Bytes zeigen kann. */
async function ladeWasm(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url);
  if (!r.ok || !r.body) throw new Error(`Engine nicht geladen (${r.status})`);
  // Bei gepackter Übertragung zählt Content-Length die gepackten Bytes - dann gilt die Größe aus dem Bau.
  const gesamt = r.headers.get('content-encoding') ? __WASM_BYTES__ : Number(r.headers.get('content-length')) || __WASM_BYTES__;
  const teile: Uint8Array[] = []; let geladen = 0, zuletzt = 0;
  const leser = r.body.getReader();
  for (;;) {
    const { done, value } = await leser.read();
    if (done) break;
    teile.push(value); geladen += value.length;
    if (geladen - zuletzt > 65536) { zuletzt = geladen; self.postMessage({ fortschritt: [geladen, Math.max(gesamt, geladen)] }); }
  }
  self.postMessage({ fortschritt: [geladen, geladen] });
  const alles = new Uint8Array(geladen); let pos = 0;
  for (const t of teile) { alles.set(t, pos); pos += t.length; }
  return alles.buffer;
}

async function boot(): Promise<void> {
  // Der Hauptfaden gibt die Adresse des Engine-Ordners als Worker-Namen mit - so passt sie unter jedem Pfad.
  const ordner = self.name || `${self.location.origin}/wasm/`;
  const [{ default: createPspp }, wasmBinary] = await Promise.all([
    import(/* @vite-ignore */ new URL('pspp.mjs', ordner).href) as Promise<{ default: (m?: { wasmBinary?: ArrayBuffer }) => Promise<PsppModule> }>,
    ladeWasm(new URL('pspp.wasm', ordner).href)]);
  mod = await createPspp({ wasmBinary });
  const init = mod.cwrap('pspp_web_init', 'number', []);
  runSyntax = mod.cwrap('pspp_web_run', 'number', ['string']) as (s: string) => number;
  if (init() !== 0) throw new Error('PSPP-Start fehlgeschlagen');
}
const ready = boot();

function take(): OutputItem[] {
  const all = mod.FS.readFile('/out.ndjson', { encoding: 'utf8' });
  const fresh = all.slice(offset);
  offset = all.length;
  return fresh.split('\n').filter(Boolean).map(l => JSON.parse(l) as OutputItem);
}

self.onmessage = async ({ data }: MessageEvent<Request>) => {
  const { id, op, syntax, bytes, files } = data;
  try {
    await ready;
    const t0 = performance.now();
    if (op === 'run') {
      for (const [pfad, inhalt] of Object.entries(files ?? {})) mod.FS.writeFile(pfad, inhalt);
      runSyntax(syntax ?? '');
      for (const pfad of Object.keys(files ?? {})) if (NUR_EINMAL.has(pfad)) weg(pfad);
      const res: RunResult = { items: take(), ms: Math.round(performance.now() - t0) };
      self.postMessage({ id, ...res });
    } else if (op === 'data') {
      runSyntax("SAVE TRANSLATE /OUTFILE='/data.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
      const items = take();
      let csv = '';
      try { csv = mod.FS.readFile('/data.csv', { encoding: 'utf8' }); } catch { /* leer */ }
      weg('/data.csv');
      const res: DataResult = { csv, items };
      self.postMessage({ id, ...res });
    } else if (op === 'exportSav') {
      runSyntax("SAVE OUTFILE='/p.sav'.");
      const items = take();
      let out = new Uint8Array(0);
      try { out = mod.FS.readFile('/p.sav') as Uint8Array<ArrayBuffer>; } catch { /* keine Daten */ }
      weg('/p.sav');
      if (out.byteLength !== out.buffer.byteLength) out = new Uint8Array(out);   // nur ein ganzes Feld lässt sich ohne Kopie übergeben
      const res: SavResult = { bytes: out, items };
      self.postMessage({ id, ...res }, [out.buffer]);
    } else if (op === 'importSav') {
      mod.FS.writeFile('/in.sav', bytes ?? new Uint8Array(0));
      runSyntax("NEW FILE.\nGET FILE='/in.sav'.\nEXECUTE.");
      weg('/in.sav');
      const res: RunResult = { items: take(), ms: Math.round(performance.now() - t0) };
      self.postMessage({ id, ...res });
    }
  } catch (e) {
    self.postMessage({ id, error: String(e) });
  }
};
