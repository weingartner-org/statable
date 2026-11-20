import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_UMFRAGE_R from './statable-umfrage.R?raw';
import { s } from '../lib/sitzung.svelte';
import { parseCsv } from '../dialogs/csv';
import { kalibrierenPlan, kalStart, type KalVerfahren } from '../lib/fallgewicht.svelte';
import { kalibrierenLesen, R_PAKETE_KALIBRIEREN } from '../lib/genauigkeit';
import type { Spalte } from '../lib/verzeichnis';

/* Paket M5b: Kalibrieren in der Oberfläche. Die Eingabe läuft durch die TS-Funktionen der Oberfläche (kalibrierenPlan: Kategorien, Sollsummen, Ausgangsgewicht, Grenzen, planKalibrieren,
 * kalibrierenLesen), gerechnet wird in webR mit statable-umfrage.R; Sollwerte: pruefdaten/mikro/kalibrieren-ui-soll.R -> kalibrieren-ui-soll.json (survey::calibrate auf puf-simuliert.csv).
 * Läuft nur, wenn das webR-Repo mit survey und MASS da ist. */
s.einst.sprache = 'de';
const webrOrdner = join(import.meta.dirname, '../../public/webr');
const repo = join(webrOrdner, 'repo/bin/emscripten/contrib/4.6');
const da = existsSync(join(repo, 'survey_4.5.tgz')) && existsSync(join(webrOrdner, 'manifest.json'));
const ROOT = join(import.meta.dirname, '../../../pruefdaten/mikro');
type Z = Record<string, any>;
const eins = (x: any) => (Array.isArray(x) ? x[0] : x);

describe.skipIf(!da)('Kalibrieren in der Oberfläche gegen survey::calibrate', { timeout: 300000 }, () => {
  let server: Server; let r: any; let sh: any; let SOLL: Z;
  beforeAll(async () => {
    SOLL = JSON.parse(readFileSync(join(ROOT, 'kalibrieren-ui-soll.json'), 'utf8')).soll;
    const rows = parseCsv(readFileSync(join(ROOT, 'puf/puf-simuliert.csv'), 'utf8'));
    const kopf = rows[0]!, num = new Set(['alter', 'einkommen', 'haushalt', 'gewicht']);
    s.spalten = kopf.map(n => ({ name: n, bezeichnung: '', art: num.has(n) ? 'zahl' : 'text', niveau: 'nominal', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {} }) as Spalte);
    s.zeilen = rows.slice(1).map(z => z.map((v, j) => (num.has(kopf[j]!) ? (v === '' ? null : Number(v)) : v)));
    server = createServer((req, res) => {
      const f = join(webrOrdner, 'repo', decodeURIComponent((req.url ?? '/').split('?')[0]!));
      if (!existsSync(f)) { res.statusCode = 404; res.end(); return; }
      createReadStream(f).pipe(res);
    });
    await new Promise<void>(ok => server.listen(0, ok));
    const port = (server.address() as { port: number }).port;
    const { WebR } = await import(/* @vite-ignore */ pathToFileURL(join(webrOrdner, 'webr.mjs')).href) as { WebR: new (o: object) => any };
    r = new WebR({ baseUrl: webrOrdner + '/', repoUrl: `http://localhost:${port}/`, channelType: 3 });
    await r.init(); await r.evalRVoid(R_START);
    await r.installPackages(R_PAKETE_KALIBRIEREN, { quiet: true });
    sh = await new r.Shelter();
    await rechne(`{ ${STATABLE_UMFRAGE_R}\nTRUE }`);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });
  const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Z;

  async function lauf(fall: 'A' | 'B' | 'C' | 'D' | 'E', v: Exclude<KalVerfahren, 'raking'>, ausgang: string, grenzen?: [number, number]) {
    const S = SOLL[fall];
    const z = { merkmale: ['bundesland', 'geschlecht'], eingaben: {
      bundesland: Object.fromEntries(SOLL.bundesland.map((b: string, i: number) => [b, String(SOLL.summen_bundesland[i])])),
      geschlecht: Object.fromEntries(SOLL.geschlecht.map((g: string, i: number) => [g, String(S.summen_geschlecht[i])])) }, ausgang, name: 'k' };
    const o = { ...kalStart(), ...(grenzen ? { lo: String(grenzen[0]), hi: String(grenzen[1]) } : {}) };
    const p = kalibrierenPlan(z, v, o);
    expect('satz' in p ? p.satz : '').toBe('');
    if ('satz' in p) return null;
    const werte: Record<string, unknown> = {};
    for (const sp of p.plan.spalten) werte[sp.name] = await new r.RDouble(sp.werte as (number | null)[]);
    await r.objs.globalEnv.bind('.sp_bind', await new r.RList(werte));
    await r.evalRVoid('d <- as.data.frame(.sp_bind); rm(.sp_bind)');
    const antwort = await rechne(p.plan.aufruf);
    const erg = kalibrierenLesen(p.plan, antwort);
    expect('ok' in erg && erg.ok, JSON.stringify(erg).slice(0, 300)).toBe(true);
    if (!('ok' in erg) || !erg.ok) return null;
    const soll: number[] = S.w, ist = erg.gewichte as number[];
    expect(ist.length).toBe(soll.length);
    let schlimmster = 0;
    ist.forEach((g, i) => { schlimmster = Math.max(schlimmster, Math.abs(g - soll[i]!) / Math.abs(soll[i]!)); });
    expect(schlimmster, `Fall ${fall}: größte relative Abweichung`).toBeLessThan(1e-6);
    expect(erg.negativ).toBe(S.negativ);
    expect(Math.abs(erg.summe - S.summe) / S.summe).toBeLessThan(1e-9);
    expect(erg.ohneGewicht).toEqual([]);
    return erg;
  }
  it('A: linear, Ausgangsgewicht gewicht - gleich survey', async () => { await lauf('A', 'linear', 'gewicht'); });
  it('B: linear, ohne Ausgangsgewicht (alle 1) - gleich survey', async () => { await lauf('B', 'linear', ''); });
  it('C: linear, anderer Frauenanteil - gleich survey, Faktoren wie survey', async () => {
    const e = await lauf('C', 'linear', 'gewicht'); if (!e) return;
    expect(Math.abs(e.gMin - SOLL.C.g_min)).toBeLessThan(1e-6); expect(Math.abs(e.gMax - SOLL.C.g_max)).toBeLessThan(1e-6);
  });
  it('D: begrenzt (0,9 bis 1,1) - gleich survey::calibrate mit bounds', async () => {
    const e = await lauf('D', 'begrenzt', 'gewicht', [0.9, 1.1]); if (!e) return;
    expect(e.gMin).toBeGreaterThanOrEqual(0.9 - 1e-9); expect(e.gMax).toBeLessThanOrEqual(1.1 + 1e-9);
  });
  it('E: begrenzt, die obere Grenze 1,088 greift wirklich - gleich survey::calibrate', async () => {
    expect(SOLL.E.an_grenze).toBeGreaterThan(100);
    const e = await lauf('E', 'begrenzt', 'gewicht', [0.8, 1.088]); if (!e) return;
    expect(Math.abs(e.gMax - 1.088)).toBeLessThan(1e-6);
  });
});
