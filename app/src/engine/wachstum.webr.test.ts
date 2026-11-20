import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_R from './statable.R?raw';
import soll from '../lib/wachstum-erwartet.json';

/* Wachstumskurvenmodell (B4 Teil 1, 14.11.2026): sp_wachstum in webR gegen Sollwerte aus Desktop-R (scripts/wachstum-erwartet.R, lavaan::growth und nlme::lme als zweiter Weg).
 * Vier Fälle: gleiche Abstände, gleiche Restvarianz (= gemischtes Modell), ungleiche Abstände, FIML mit Lücken. */
const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/lavaan_0.6-21.tgz')) && existsSync(webrOrdner + '/manifest.json');
type Fall = { zeit: number[]; gleich: boolean; fiml: boolean; daten: Record<string, (number | null)[]>; lavaan: Record<string, number | number[]>; lme: Record<string, number> | null };
const rData = (f: Fall) => `data.frame(${Object.entries(f.daten).map(([k, v]) => `${k} = c(${v.map(x => (x === null ? 'NA' : String(x))).join(',')})`).join(', ')})`;

describe.skipIf(!da)('Wachstumskurvenmodell in webR (braucht: bash scripts/webr-holen.sh)', () => {
  it('Mittelwerte, Varianzen, Kovarianz und Passung wie lavaan::growth und nlme::lme', async () => {
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
    const nah = (ist: number, s: number, tol: number, was: string) => expect(Math.abs(ist - s) / Math.max(Math.abs(s), 1e-9), was).toBeLessThan(tol);
    const e = (x: any) => (Array.isArray(x) ? x[0] : x);
    try {
      await r.init();
      await r.evalRVoid(R_START);
      await r.installPackages(['lavaan'], { quiet: true });
      sh = await new r.Shelter();
      await rechne(`{ ${STATABLE_R}\nTRUE }`);
      for (const [name, f] of Object.entries(soll as unknown as Record<string, Fall>)) {
        await rechne(`{ d <- ${rData(f)}; TRUE }`);
        const o = await rechne(`sp_wachstum(d, zeit = c(${f.zeit.join(',')}), gleich_rest = ${f.gleich ? 'TRUE' : 'FALSE'}, fiml = ${f.fiml ? 'TRUE' : 'FALSE'})`);
        expect(o.fehler, name).toBeUndefined();
        const L = f.lavaan as Record<string, number>;
        const mw = Object.fromEntries(o.mw_name.map((n: string, i: number) => [n, o.mw_est[i]])), va = Object.fromEntries(o.var_name.map((n: string, i: number) => [n, o.var_est[i]]));
        nah(mw.i, e(L.mw_i), 1e-5, `${name} Mittel i`); nah(mw.s, e(L.mw_s), 1e-5, `${name} Mittel s`);
        nah(va.i, e(L.var_i), 1e-4, `${name} Var i`); nah(va.s, e(L.var_s), 1e-4, `${name} Var s`); nah(e(o.kov_est), e(L.kov), 1e-4, `${name} Kov`);
        expect(e(o.n), `${name} n`).toBe(e(L.n)); expect(o.fit, name).not.toBeNull();
        nah(e(o.fit.chisq), e(L.chisq), 1e-4, `${name} Chi²`); expect(e(o.fit.df), `${name} df`).toBe(e(L.df));
        nah(e(o.fit.cfi), e(L.cfi), 1e-4, `${name} CFI`); nah(e(o.fit.rmsea), e(L.rmsea), 1e-3, `${name} RMSEA`);
        (L.impl as unknown as number[]).forEach((x, i) => nah(o.impl_mw[i], x, 1e-5, `${name} modellierter Mittelwert ${i}`));
        if (f.lme && f.lme.mw_i !== undefined) {   // zweiter Weg: gemischtes Modell (ML) bei gleicher Restvarianz
          nah(mw.i, f.lme.mw_i!, 1e-5, `${name} lme Mittel i`); nah(mw.s, f.lme.mw_s!, 1e-5, `${name} lme Mittel s`);
          nah(va.i, f.lme.var_i!, 1e-3, `${name} lme Var i`); nah(va.s, f.lme.var_s!, 1e-3, `${name} lme Var s`); nah(e(o.kov_est), f.lme.kov!, 1e-3, `${name} lme Kov`);
          o.rest_var.forEach((x: number) => nah(x, f.lme!.rest!, 1e-3, `${name} lme Rest`));
        }
      }
      // Fehlerfälle
      await rechne(`{ d2 <- data.frame(v1 = rnorm(30), v2 = rnorm(30)); d3 <- data.frame(v1 = rnorm(10), v2 = rnorm(10), v3 = rnorm(10)); TRUE }`);
      expect(e((await rechne(`sp_wachstum(d2)`)).fehler)).toBe('at least three time points needed');
      expect(e((await rechne(`sp_wachstum(d3)`)).fehler)).toBe('too few complete cases');
      expect(e((await rechne(`sp_wachstum(d, zeit = c(0, 1))`)).fehler)).toBe('time values must be numbers, at least three different');
      expect(e((await rechne(`tryCatch(sp_wachstum(setNames(d, c('v1', 'x y', 'v3', 'v4'))), error = function(e) list(fehler = conditionMessage(e)))`)).fehler)).toBe('unsafe name rejected');
    } finally { r.close?.(); server.close(); }
  }, 900000);
});
