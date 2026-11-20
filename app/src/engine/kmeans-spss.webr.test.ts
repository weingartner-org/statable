import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rBool, rGanz, rIds } from './rsicher';
import { rZuJson, rDataFrameCode, type RSpalte } from './webr';
import { nodeEngine } from '../lib/testengine';

/* k-Means in Statable gegen SPSS QUICK CLUSTER (Employee data: educ, salary, salbegin; 3 Gruppen).
 * Hier wird kein Fehler behoben, sondern ein UNTERSCHIED ZU SPSS festgehalten (Bauplan Ausbessern, Paket G, B7).
 * Rechenweg wie die Statable-Cluster-Karte: sp_cluster_kmeans (engine/statable-zeitcluster.R), Startwert 20261008, 25 Starts, iter.max 100.
 * Sollwerte: docs/spss-vergleich/teil4-kmeans-ausgabe.txt (R 4.6.1 am Mac, Skript teil4-kmeans-vergleich.R).
 *   Rohwerte:  Gruppen (nach Gehalt absteigend) 45 / 79 / 350, Streuung innerhalb 32.350.665.018,476.
 *   z-Werte (Voreinstellung der Karte, standardisiert: true): Größen 242 / 169 / 63.
 * SPSS QUICK CLUSTER bleibt bei 11 / 74 / 389 stehen (Streuung innerhalb 33.961.568.397,235): ein Start, lokales Optimum.
 * Statable findet mit 25 Starts eine BESSERE Lösung (kleinere Streuung); das belegt der Test. Kein Fehler in Statable.
 * Die IBM-Datei kommt nicht ins Repo (Regel 7): sie wird von der Installation gelesen, fehlt sie, wird übersprungen. */

const sav = '/Applications/IBM SPSS Statistics/Resources/Samples/English/Employee data.sav';
const webrOrdner = join(import.meta.dirname, '../../public/webr');
const dateiB = join(import.meta.dirname, 'statable-zeitcluster.R');
const da = existsSync(sav) && existsSync(join(webrOrdner, 'webr.mjs'));
type Z = Record<string, any>;
const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
const liste = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);

const SOLL = { roh: { groessen: [45, 79, 350], wss: 32350665018.476 }, spss: { groessen: [11, 74, 389], wss: 33961568397.235 }, z: { groessen: [242, 169, 63] } };

describe.skipIf(!da)('k-Means: Statable gegen SPSS QUICK CLUSTER (Employee data, IBM-Datei von der Installation)', () => {
  let server: Server; let r: any; let sh: any; let X: number[][] = [];
  const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Z;

  async function lauf(standardisiert: boolean) {
    const sp: RSpalte[] = ['v1', 'v2', 'v3'].map((name, j) => ({ name, art: 'zahl' as const, werte: X.map(z => z[j]!) }));
    const werte: Record<string, unknown> = {}, lab: Record<string, unknown> = {};
    for (const s of sp) { werte[s.name] = await new r.RDouble(s.werte as number[]); lab[s.name] = await new r.RList({}); }
    const g = r.objs.globalEnv;
    await g.bind('.sp_werte', await new r.RList(werte)); await g.bind('.sp_art', await new r.RCharacter(sp.map(s => s.art))); await g.bind('.sp_lab', await new r.RList(lab));
    await r.evalRVoid(rDataFrameCode('d', sp) + '\nrm(.sp_werte, .sp_art, .sp_lab)');
    return rechne(`tryCatch(sp_cluster_kmeans(d, ${rIds(['v1', 'v2', 'v3'])}, ${rBool(standardisiert)}, ${rGanz(3)}, ${rGanz(25)}, ${rGanz(20261008)}, NULL), error = function(e) list(fehler = conditionMessage(e)))`);
  }
  /** Größen nach Gehalt (Spalte 2) der Gruppenmittel absteigend; Gruppen aus der Zuordnung, Mittel aus den Rohwerten. */
  const groessenNachGehalt = (zu: number[]) => {
    const ks = [...new Set(zu)]; const mw = ks.map(k => { const i = zu.flatMap((v, t) => (v === k ? [t] : [])); return { n: i.length, gehalt: i.reduce((a, t) => a + X[t]![1]!, 0) / i.length }; });
    return mw.sort((a, b) => b.gehalt - a.gehalt).map(m => m.n);
  };

  beforeAll(async () => {
    // Daten: PSPP-Engine liest die .sav und schreibt CSV; nur diese drei Spalten, nur ganze Fälle
    const e = await nodeEngine();
    e.run(`GET FILE='/e.sav'.\nSAVE TRANSLATE OUTFILE='/e.csv' /TYPE=CSV /FIELDNAMES /REPLACE /KEEP=educ salary salbegin.`, { '/e.sav': new Uint8Array(readFileSync(sav)) });
    const csv = new TextDecoder().decode(e.lies('/e.csv')).trim().split(/\r?\n/).slice(1);
    X = csv.map(l => l.split(',').map(Number)).filter(z => z.length === 3 && z.every(Number.isFinite));
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
    sh = await new r.Shelter();
    await rechne(`{ ${readFileSync(dateiB, 'utf8')}\nTRUE }`);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  it('Daten: 474 Fälle, keine fehlenden Werte (wie in der Ausgabedatei)', () => { expect(X.length).toBe(474); });

  it('Rohwerte: Größen 45 / 79 / 350, Streuung innerhalb 32,35 Mrd. - kleiner als bei SPSS (11 / 74 / 389, 33,96 Mrd.)', async () => {
    const o = await lauf(false); expect(o.fehler, `R-Fehler: ${o.fehler}`).toBeUndefined();
    expect(groessenNachGehalt(liste(o.zuordnung))).toEqual(SOLL.roh.groessen);
    expect(Math.abs(eins(o.wss) - SOLL.roh.wss) / SOLL.roh.wss).toBeLessThan(1e-6);
    expect(eins(o.wss), 'bessere Lösung als SPSS (lokales Optimum)').toBeLessThan(SOLL.spss.wss);
    expect(groessenNachGehalt(liste(o.zuordnung))).not.toEqual(SOLL.spss.groessen);
  });

  it('z-Werte (Voreinstellung der Karte): Größen 242 / 169 / 63', async () => {
    const o = await lauf(true); expect(o.fehler, `R-Fehler: ${o.fehler}`).toBeUndefined();
    expect(liste(o.groesse).slice().sort((a, b) => b - a)).toEqual(SOLL.z.groessen);
  });
});
