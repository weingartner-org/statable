import { korrigiereAusgabe } from './korrektur';
import type { DataResult, Engine, RunResult, SavResult } from './types';

type Reply<T> = T & { id: number; error?: string };

/** Die Engine ist abgestürzt (z. B. eine Assertion in PSPP: „Aborted(…)“). Danach rechnet sie nicht mehr - sie wird neu gestartet. */
export class EngineAbbruch extends Error {
  constructor(public grund: string) { super(grund); this.name = 'EngineAbbruch'; }
}
/** Die Person hat eine lang laufende Rechnung abgebrochen („Abbrechen“): derselbe Neustart wie nach einem Absturz, aber kein Fehler in PSPP. */
export class EngineAbgebrochen extends EngineAbbruch {
  constructor() { super('Abgebrochen'); this.name = 'EngineAbgebrochen'; }
}
/** Erkennt den Absturz von WebAssembly (abort, RuntimeError) an der Fehlermeldung aus dem Worker. */
export const istAbbruch = (meldung: string) => /\bAborted\(|RuntimeError|unreachable|memory access out of bounds/.test(meldung);
type Roh = (syntax: string, files?: Record<string, Uint8Array>) => Promise<RunResult>;

/** Spricht mit dem Worker, der die WebAssembly-Engine hält. Eine Sitzung = ein Worker. */
export class WasmEngine implements Engine {
  private worker!: Worker;
  private nextId = 0;
  private pending = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void }>();

  /** Bytes der Engine-Datei, geladen von gesamt - für die Ladeanzeige. */
  onFortschritt?: (geladen: number, gesamt: number) => void;
  /** Nach einem Absturz: die frische Engine wieder mit den Daten füllen (`roh` umgeht das Warten auf die Erholung). */
  nachNeustart?: (roh: Roh) => Promise<void>;
  /** Läuft, solange sich die Engine nach einem Absturz erholt; jeder neue Aufruf wartet darauf. */
  private erholung: Promise<void> | null = null;

  constructor() { this.start(); }

  private start(): void {
    const wasmOrdner = new URL('wasm/', document.baseURI).href;
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: wasmOrdner });
    this.worker.onmessage = ({ data }: MessageEvent<Reply<object> & { fortschritt?: [number, number] }>) => {
      if (data.fortschritt) { this.onFortschritt?.(...data.fortschritt); return; }
      const p = this.pending.get(data.id);
      if (!p) return;
      this.pending.delete(data.id);
      if (data.error && istAbbruch(data.error)) { this.neustart(); p.reject(new EngineAbbruch(data.error)); }
      else if (data.error) p.reject(new Error(data.error)); else p.resolve(data as never);
    };
    this.worker.onerror = e => {
      for (const p of this.pending.values()) p.reject(new Error(e.message));
      this.pending.clear();
    };
  }

  /** Neuer Worker nach einem Absturz; alles, was noch wartete, scheitert mit demselben Abbruch. Die Daten füllt `nachNeustart` wieder ein. */
  private neustart(grund?: EngineAbbruch): void {
    if (this.erholung) return;
    this.worker.terminate();
    for (const p of this.pending.values()) p.reject(grund ?? new EngineAbbruch('Neustart nach Absturz'));
    this.pending.clear();
    this.start();
    const roh: Roh = (syntax, files) => this.roh<RunResult>('run', syntax, undefined, files);
    this.erholung = (async () => {
      try { await roh('SET PRINTBACK=OFF.'); await this.nachNeustart?.(roh); }
      catch { /* bleibt die Erholung aus, meldet der nächste Aufruf den Fehler selbst */ }
      finally { this.erholung = null; }
    })();
  }

  /** Bricht die laufende Rechnung ab: der Worker wird beendet, eine frische Engine startet und bekommt die Daten zurück (`nachNeustart`). Die wartende Rechnung scheitert mit `EngineAbgebrochen`. */
  abbrechen(): void { this.neustart(new EngineAbgebrochen()); }

  private async call<T>(op: 'run' | 'data' | 'exportSav' | 'importSav', syntax?: string, bytes?: Uint8Array, files?: Record<string, Uint8Array>, schenken = false): Promise<T> {
    while (this.erholung) await this.erholung;
    return this.roh<T>(op, syntax, bytes, files, schenken);
  }

  private roh<T>(op: 'run' | 'data' | 'exportSav' | 'importSav', syntax?: string, bytes?: Uint8Array, files?: Record<string, Uint8Array>, schenken = false): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, { resolve: resolve as (v: never) => void, reject });
      this.worker.postMessage({ id, op, syntax, bytes, files }, [...(bytes ? [bytes.buffer] : []), ...(schenken && files ? Object.values(files).map(f => f.buffer) : [])]);
    });
  }

  /** `schenken`: Die Bytes von `files` wandern in den Worker statt kopiert zu werden; sie sind danach hier leer. */
  async run(syntax: string, files?: Record<string, Uint8Array>, schenken = false): Promise<RunResult> { const r = await this.call<RunResult>('run', syntax, undefined, files, schenken); korrigiereAusgabe(r.items, syntax); return r; }
  data(): Promise<DataResult> { return this.call<DataResult>('data'); }
  exportSav(): Promise<SavResult> { return this.call<SavResult>('exportSav'); }
  importSav(bytes: Uint8Array): Promise<RunResult> { return this.call<RunResult>('importSav', undefined, bytes); }
  async reset(): Promise<void> { this.worker.terminate(); this.pending.clear(); this.start(); }
}
