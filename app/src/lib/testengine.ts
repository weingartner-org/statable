/** Nur für Tests: die echte WASM-Engine in Node (ohne Worker). */
import type { OutputItem } from '../engine/types';

export async function nodeEngine() {
  const pfad = new URL('../../public/wasm/pspp.mjs', import.meta.url).href;
  const { default: erzeuge } = (await import(/* @vite-ignore */ pfad)) as { default: () => Promise<any> };
  const m = await erzeuge();
  if (m.cwrap('pspp_web_init', 'number', [])() !== 0) throw new Error('init');
  const run = m.cwrap('pspp_web_run', 'number', ['string']);
  let stand = 0;
  return {
    lies(pfad: string): Uint8Array { return m.FS.readFile(pfad); },
    run(syntax: string, dateien: Record<string, Uint8Array> = {}): OutputItem[] {
      for (const [p, b] of Object.entries(dateien)) m.FS.writeFile(p, b);
      run(syntax);
      const alles: string = m.FS.readFile('/out.ndjson', { encoding: 'utf8' });
      const neu = alles.slice(stand); stand = alles.length;
      return neu.split('\n').filter(Boolean).map(l => JSON.parse(l) as OutputItem);
    }
  };
}
