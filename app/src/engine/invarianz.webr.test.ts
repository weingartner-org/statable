import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_R from './statable.R?raw';
import DATEN from './invarianz-daten.csv?raw';

/* Messinvarianz (S-J, 23.10.2026): sp_invarianz in webR (lavaan 0.6-21) gegen R am Mac (Rscript, lavaan 0.7-2, dieselbe Funktion aus engine/statable.R).
 * Daten: invarianz-daten.csv (200 Personen, zwei Gruppen A/B zu je 100, zwei Faktoren zu je drei Fragen; in Gruppe B ist v6 um 0,5 verschoben: skalare Invarianz bricht). Toleranz 1e-4. */
const REF = {
  chisq: [11.25160492, 22.80345431, 51.75836537], df: [16, 20, 24], cfi: [1, 0.9928944268, 0.929644262], rmsea: [0, 0.03743964683, 0.1075452722], srmr: [0.02365533527, 0.0558221908, 0.07709259664],
  dChisq: [11.55184939, 28.95491106], dP: [0.02101436871, 7.98399977e-06]
};
const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/lavaan_0.6-21.tgz')) && existsSync(webrOrdner + '/manifest.json');

describe.skipIf(!da)('Messinvarianz in webR gegen R am Mac (braucht: bash scripts/webr-holen.sh)', () => {
  it('rechnet konfigurale, metrische und skalare Stufe mit Differenztests wie lavaan', async () => {
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
    const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-3), was).toBeLessThan(tol);
    try {
      await r.init();
      await r.evalRVoid(R_START);
      await r.installPackages(['lavaan'], { quiet: true });
      sh = await new r.Shelter();
      await rechne(`{ ${STATABLE_R}\nTRUE }`);
      await rechne(`{ d <- read.csv(text = ${JSON.stringify(DATEN)}); TRUE }`);
      const o = await rechne(`sp_invarianz(d, list(F1 = c('v1', 'v2', 'v3'), F2 = c('v4', 'v5', 'v6')))`);
      expect(o.fehler).toBeUndefined();
      expect(o.stufe).toEqual(['konfigural', 'metrisch', 'skalar']); expect(o.gruppen).toEqual(['A', 'B']); expect(o.n_gruppe).toEqual([100, 100]);
      REF.chisq.forEach((v, i) => { nah(o.chisq[i], v, 1e-4, `chisq[${i}]`); expect(o.df[i]).toBe(REF.df[i]); nah(o.cfi[i], REF.cfi[i]!, 1e-4, `cfi[${i}]`); nah(o.srmr[i], REF.srmr[i]!, 1e-3, `srmr[${i}]`); });
      REF.rmsea.slice(1).forEach((v, i) => nah(o.rmsea[i + 1], v, 1e-3, `rmsea[${i + 1}]`));
      REF.dChisq.forEach((v, i) => { nah(o.diff_chisq[i], v, 1e-4, `diff_chisq[${i}]`); expect(o.diff_df[i]).toBe(4); nah(o.diff_p[i], REF.dP[i]!, 1e-3, `diff_p[${i}]`); });
      // Teilweise Invarianz: v6 ist in Gruppe B verschoben, der Score-Test nennt v6 zuerst; mit v6 frei ist die skalare Stufe deutlich besser
      expect(o.vorschlag.item[0]).toBe('v6'); expect(o.vorschlag.x2[0]).toBeGreaterThan(o.vorschlag.x2[1]);
      const tt = await rechne(`sp_invarianz(d, list(F1 = c('v1', 'v2', 'v3'), F2 = c('v4', 'v5', 'v6')), frei = 'v6')`);
      expect(tt.teil.frei).toEqual(['v6']); expect(tt.teil.chisq[1]).toBeLessThan(o.chisq[2]); expect(tt.teil.cfi[1]).toBeGreaterThan(o.cfi[2]);
      const ref = await rechne(`{ m <- paste('F1 =~ v1 + v2 + v3', 'F2 =~ v4 + v5 + v6', sep = '\n'); f <- lavaan::cfa(m, data = d, group = 'g', group.equal = c('loadings', 'intercepts'), group.partial = c('F2 =~ v6', 'v6 ~ 1')); list(chisq = as.numeric(lavaan::fitMeasures(f, 'chisq')), df = as.numeric(lavaan::fitMeasures(f, 'df'))) }`);
      nah(eins(tt.teil.chisq[1]), eins(ref.chisq), 1e-6, 'teilweise skalar'); expect(eins(tt.teil.df[1])).toBe(eins(ref.df));
      // Abgestufte Antworten (WLSMV, Theta): gleiche Zahlen wie lavaan direkt
      await rechne(`{ set.seed(4); n <- 250; mk <- function(f, l, s = 0) as.integer(cut(l * f + rnorm(n, 0, .7) + s, c(-Inf, -1, 0, 1, Inf))); fa <- rnorm(n); fb <- rnorm(n); do <- data.frame(v1 = c(mk(fa, .8), mk(fb, .8)), v2 = c(mk(fa, .7), mk(fb, .7)), v3 = c(mk(fa, .6), mk(fb, .6, .6)), v4 = c(mk(fa, .75), mk(fb, .75)), g = rep(c('A', 'B'), each = n)); TRUE }`);
      const od = await rechne(`sp_invarianz(do, list(F1 = c('v1', 'v2', 'v3', 'v4')), ordinal = TRUE)`);
      expect(od.fehler).toBeUndefined(); expect(eins(od.ordinal)).toBe(true); expect(od.stufe).toEqual(['konfigural', 'metrisch', 'skalar']);
      const orf = await rechne(`{ m <- 'F1 =~ v1 + v2 + v3 + v4'; o <- c('v1', 'v2', 'v3', 'v4'); f <- function(ge) lavaan::cfa(m, data = do, group = 'g', group.equal = ge, ordered = o, estimator = 'WLSMV', parameterization = 'theta'); f0 <- f(character(0)); f1 <- f('thresholds'); f2 <- f(c('thresholds', 'loadings')); mm <- function(x) as.numeric(lavaan::fitMeasures(x, c('chisq.scaled', 'df.scaled', 'cfi.scaled', 'rmsea.scaled'))); a <- lavaan::lavTestLRT(f0, f1); list(m0 = mm(f0), m1 = mm(f1), m2 = mm(f2), d1 = a[['Chisq diff']][2]) }`);
      [0, 1, 2].forEach(i => { nah(od.chisq[i], orf[`m${i}`][0], 1e-6, `ordinal chisq ${i}`); expect(od.df[i]).toBe(orf[`m${i}`][1]); nah(od.cfi[i], orf[`m${i}`][2], 1e-6, `ordinal cfi ${i}`); });
      nah(od.diff_chisq[0], orf.d1[0] ?? eins(orf.d1), 1e-6, 'ordinal Differenz');
      // Fehlerfall: nur eine Gruppe
      const f = await rechne(`{ d2 <- d; d2$g <- 'A'; sp_invarianz(d2, list(F1 = c('v1', 'v2', 'v3'), F2 = c('v4', 'v5', 'v6'))) }`);
      expect(f.fehler).toBeTruthy();
    } finally { r.close?.(); server.close(); }
  }, 900000);
});

const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
