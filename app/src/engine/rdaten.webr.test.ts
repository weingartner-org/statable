import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { RMotor, alsZahlenfeld, type RSpalte } from './webr';

/* Stufe 2 große Dateien: Die Spalten gehen als Zahlenfeld nach R. Im echten webR geprüft: Fehlend bleibt NA und wird nicht NaN, Werte und Faktoren kommen gleich an, die Zwischenstücke bleiben nicht im Speicher von R. */
const dir = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(dir, 'webr.mjs'));
let srv: Server | undefined, m: RMotor, r: { close(): void };

beforeAll(async () => {
  if (!da) return;
  srv = createServer((q, a) => { const f = join(dir, 'repo', decodeURIComponent((q.url ?? '/').split('?')[0]!)); if (!existsSync(f)) { a.writeHead(404); a.end(); return; } createReadStream(f).pipe(a); });
  await new Promise<void>(k => srv!.listen(0, '127.0.0.1', () => k()));
  const port = (srv!.address() as { port: number }).port;
  const { WebR } = (await import(/* @vite-ignore */ pathToFileURL(join(dir, 'webr.mjs')).href)) as { WebR: new (o: object) => { init(): Promise<void>; evalRVoid(c: string): Promise<void>; close(): void } };
  const w = new WebR({ baseUrl: dir + '/', repoUrl: `http://localhost:${port}/`, channelType: 3 });
  await w.init();
  await w.evalRVoid(R_START);
  r = w;
  m = new RMotor();
  m.einhaengen(w);
}, 120000);
afterAll(() => { r?.close(); srv?.close(); });

describe.skipIf(!da)('Spalten als Zahlenfeld im echten webR', () => {
  it('fehlend wird NA, nicht NaN; Zahlen, Unendlich und Null bleiben', async () => {
    await m.daten('d', [{ name: 'y', art: 'zahl', werte: [1.5, null, NaN, -0, Infinity, -Infinity, 1e-300, 4503599627370497] }]);
    const a = await m.rechne<{ na: boolean[]; nan: boolean[]; wert: (number | null)[]; art: string[] }>(`list(na = is.na(d$y), nan = is.nan(d$y), wert = d$y, art = class(d$y))`);
    expect(a.art).toEqual(['numeric']);
    expect(a.na).toEqual([false, true, true, false, false, false, false, false]);
    expect(a.nan).toEqual([false, false, false, false, false, false, false, false]);   // NA und NaN sind in R verschieden
    expect(a.wert.filter((_, i) => i !== 1 && i !== 2)).toEqual([1.5, -0, Infinity, -Infinity, 1e-300, 4503599627370497]);
  });

  it('Faktoren und Text kommen an wie bisher, auch mit fehlenden Werten', async () => {
    const sp: RSpalte[] = [
      { name: 'f', art: 'faktor', werte: [1, 2, null, 2], labels: [{ wert: 1, label: 'ä' }, { wert: 2, label: 'b' }] },
      { name: 't', art: 'text', werte: ['x', null, 'y', 'z'] },
      { name: 'z', art: 'zahl', werte: ['3', 4, null, 5] }
    ];
    await m.daten('d', sp);
    const a = await m.rechne<{ f: (string | null)[]; stufen: string[]; t: (string | null)[]; z: (number | null)[]; na: boolean[] }>(`list(f = as.character(d$f), stufen = levels(d$f), t = d$t, z = d$z, na = is.na(d$z))`);
    expect(a.f).toEqual(['ä', 'b', null, 'b']);
    expect(a.stufen).toEqual(['ä', 'b']);
    expect(a.t).toEqual(['x', null, 'y', 'z']);
    expect(a.na).toEqual([false, false, true, false]);
    expect(a.z[0]).toBe(3); expect(a.z[3]).toBe(5);
  });

  it('die Hilfsnamen sind danach weg, und der Speicher von R wächst nicht von Rechnung zu Rechnung', async () => {
    const lang: RSpalte = { name: 'y', art: 'zahl', werte: Array.from({ length: 200000 }, (_, i) => (i % 100 === 0 ? null : i)) };
    await m.daten('d', [lang]);
    const speicher = async () => (await m.rechne<number[]>(`{ g <- gc(); sum(g[, 2]) }`))[0] ?? 0;
    const vorher = await speicher();
    for (let i = 0; i < 5; i++) await m.daten('d', [lang]);
    const danach = await speicher();
    expect(danach - vorher).toBeLessThan(3);   // Megabyte; ohne eigenen Schutzraum wären es rund 8 MB (1,6 MB je Lauf)
    const namen = await m.rechne<string[] | string>(`ls(globalenv(), all.names = TRUE)`);
    expect([namen].flat().filter(n => n.startsWith('.sp_'))).toEqual([]);
  }, 60000);

  it('das Zahlenfeld selbst: null und NaN werden NaN, Text wird zur Zahl', () => {
    expect([...alsZahlenfeld([1, null, NaN, '2.5'])]).toEqual([1, NaN, NaN, 2.5]);
  });
});
