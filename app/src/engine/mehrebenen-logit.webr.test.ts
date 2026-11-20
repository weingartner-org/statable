import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_R from './statable.R?raw';

/* Mehrebenen-Modell für Ja/Nein (S-H, 22.10.2026): glmer (Logit, Laplace) in webR gegen R am Mac (Rscript, lme4 direkt aufgerufen, ohne engine/statable.R).
 * Daten: 14 Gruppen zu je 9 Fällen, simuliert mit set.seed(42): y 0/1, p01 Zahl, p02 0/1. Die Schätzer sollen auf 5 Stellen übereinstimmen (glmer: Optimierer und Version können im 6. Stelle abweichen). */
const Y = [1,1,1,0,0,1,1,1,1,1,0,1,0,0,0,0,1,0,1,1,1,0,0,1,1,0,1,1,1,1,0,0,0,1,0,0,1,0,0,0,1,1,1,1,0,0,0,0,1,0,1,1,0,1,1,1,1,1,0,1,1,1,0,1,0,0,0,1,1,0,0,1,1,1,1,1,1,0,1,1,1,1,0,1,1,1,0,0,0,1,1,1,0,1,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,0,0,0,0,0,1,1,0,1,1,0,0,1,1,1];
const X = [48.7,56.4,47.2,23.4,25.6,63.2,46.9,32.2,48.3,62.1,69,45.7,47.4,32.4,54.6,43.6,54.6,57,60.4,43.9,55,32.8,42.2,41.5,25.9,50.4,52.1,46.4,57.6,42.7,36.3,54.3,41.9,64.4,45.7,56.6,53.2,42.2,65.8,56.4,50.9,52.8,56.8,50.9,20.1,52.8,46.3,51.9,55.8,64,42.7,63,53.4,60.4,59.2,57.2,39.6,49.1,56.2,40.5,44.6,55.8,57.7,54.6,41.1,39,65.1,52.6,50.9,48.8,38.1,56.1,47.8,48.2,59.3,58.2,63.9,45.2,56.5,63.9,38.9,41.4,38.7,35.4,50.8,56.5,62,60.4,40,68.5,43.3,51.1,45.8,48.8,51.9,51.2,49.7,51.1,45.1,45,33.4,46.2,44.9,77,36.4,51.4,35.1,35.3,51.2,40,50,45.7,43.9,29.8,37.8,51.8,55.7,45.1,50,61.2,64.4,39,48.8,62,45.3,49.5];
const REF = {
  b: [-2.19732615971, 0.0517857526371, 0.173453094022], se: [1.08051176159, 0.0215574996627, 0.388890287343], z: [-2.033597632, 2.4022151663, 0.446020637871], p: [0.0419921807938, 0.0162961199797, 0.655582338287],
  tau: 0.374555713151, r2m: 0.0729514590897, r2c: 0.167708873046, nullTau: 0.223477249925, nullIcc: 0.0636081072379, nullConst: 0.40670998051, nullConstSe: 0.226381883947
};
const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/lmerTest_3.2-1.tgz')) && existsSync(webrOrdner + '/manifest.json');

describe.skipIf(!da)('Mehrebenen-Modell für Ja/Nein in webR gegen R am Mac (braucht: bash scripts/webr-holen.sh)', () => {
  it('rechnet Nullmodell (latenter ICC), feste Effekte als Log-Odds mit Wald-z, Zufallsvarianz und R² wie glmer', async () => {
    const server = createServer((req, res) => {
      const f = join(webrOrdner, 'repo', decodeURIComponent((req.url ?? '/').split('?')[0]!));
      if (!existsSync(f)) { res.statusCode = 404; res.end(); return; }
      createReadStream(f).pipe(res);
    });
    await new Promise<void>(ok => server.listen(0, ok));
    const port = (server.address() as { port: number }).port;
    const { WebR } = await import(/* @vite-ignore */ pathToFileURL(join(webrOrdner, 'webr.mjs')).href) as { WebR: new (o: object) => any };
    const r = new WebR({ baseUrl: webrOrdner + '/', repoUrl: `http://localhost:${port}/`, channelType: 3 });
    let sh: any;
    const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Record<string, any>;
    const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
    const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-9), was).toBeLessThan(tol);
    try {
      await r.init();
      await r.evalRVoid(R_START);
      await r.installPackages(['lme4', 'lmerTest'], { quiet: true });
      sh = await new r.Shelter();
      await rechne(`{ ${STATABLE_R}\nTRUE }`);
      await rechne(`{ d <- data.frame(y = c(${Y.join(',')}), g = rep(sprintf('S%02d', 1:14), each = 9), p01 = c(${X.join(',')}), p02 = rep(c(0, 1), length.out = 126)); TRUE }`);
      const o = await rechne(`sp_mehrebenen(d, c('p01', 'p02'), '', FALSE, TRUE)`);
      expect(o.fehler).toBeUndefined();
      expect(eins(o.binaer)).toBe(true); expect(eins(o.n)).toBe(126); expect(eins(o.ng)).toBe(14);
      REF.b.forEach((v, i) => { nah(o.fest_b[i], v, 1e-5, `b[${i}]`); nah(o.fest_se[i], REF.se[i]!, 1e-4, `se[${i}]`); nah(o.fest_t[i], REF.z[i]!, 1e-4, `z[${i}]`); nah(o.fest_p[i], REF.p[i]!, 1e-4, `p[${i}]`); });
      nah(eins(o.tau), REF.tau, 1e-4, 'tau'); nah(eins(o.sigma), Math.PI ** 2 / 3, 1e-12, 'sigma = pi²/3');
      nah(eins(o.r2_m), REF.r2m, 1e-4, 'r2m'); nah(eins(o.r2_c), REF.r2c, 1e-4, 'r2c');
      nah(eins(o.null_tau), REF.nullTau, 1e-4, 'null_tau'); nah(eins(o.null_icc), REF.nullIcc, 1e-4, 'null_icc'); nah(eins(o.null_const), REF.nullConst, 1e-4, 'null_const'); nah(eins(o.null_const_se), REF.nullConstSe, 1e-4, 'null_const_se');
      expect(o.fest_df.every((v: unknown) => v === null || Number.isNaN(v))).toBe(true);   // keine Freiheitsgrade beim Wald-z
      // Fehlerfall: mehr als zwei Werte
      const f = await rechne(`{ d2 <- d; d2$y <- rep(c(0, 1, 2), length.out = 126); sp_mehrebenen(d2, c('p01'), '', FALSE, TRUE) }`);
      expect(f.fehler).toBeTruthy();
      // ohne binaer bleibt alles wie vorher (lmerTest)
      const l = await rechne(`sp_mehrebenen(d, c('p01'), '', FALSE, FALSE)`);
      expect(eins(l.binaer) ?? false).toBe(false); expect(l.fest_df[0]).not.toBeNull();
    } finally { r.close?.(); server.close(); }
  }, 900000);
});
