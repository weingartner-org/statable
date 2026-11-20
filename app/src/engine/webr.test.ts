import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { R_PROBEN, R_START } from './rproben';
import { rDataFrameCode, rZuJson } from './webr';

describe('rZuJson', () => {
  it('macht benannte Vektoren zu Objekten, NA zu null', () => {
    expect(rZuJson({ type: 'double', names: ['a', 'b'], values: [1, null] })).toEqual({ a: 1, b: null });
    expect(rZuJson({ type: 'character', names: null, values: ['x', 'y'] })).toEqual(['x', 'y']);
    expect(rZuJson({ type: 'list', names: ['n', 'w'], values: [{ type: 'integer', names: null, values: [3] }, { type: 'double', names: null, values: [0.5, 1] }] })).toEqual({ n: [3], w: [0.5, 1] });
  });
});

describe('rDataFrameCode', () => {
  it('legt Faktoren mit Labels an', () => {
    const c = rDataFrameCode('d', [{ name: 'g', art: 'faktor', werte: [1, 2], labels: [{ wert: 1, label: 'A' }, { wert: 2, label: 'B' }] }]);
    expect(c).toContain('d <- local(');
    expect(c).toContain("factor(w[[i]], levels = l$wert, labels = l$label)");
  });
});

/* Referenzwerte: Rscript am Mac (R 4.6.1; lme4 2.0.6, lavaan 0.7.2, psych 2.6.9 und 2.6.5, metafor 5.2.1), 08.10.2026,
 * erzeugt mit scripts/webr-messen.mjs. webR 0.6.0 hat R 4.6.0, lme4 2.0-1, lavaan 0.6-21, psych 2.6.5, metafor 5.0-1.
 * survey (17.10.2026): Rscript am Mac mit survey 4.5 und mitools 2.7 (R_LIBS), webR hat dieselben Versionen. Das ist die Gleichheit
 * Browser-R gegen Mac-R, kein Sollwert für die Karten (die liegen in scripts/spaeter-d2-erwartet.R).
 * quantreg 6.1 und glmnet 5.1 (18.10.2026): Rscript am Mac (R 4.6.1, dieselben Paketversionen), Engel-Daten bzw. QuickStartExample mit festen Falten;
 * Gleichheit Browser-R gegen Mac-R, kein Sollwert für die Karten (die liegen in scripts/spaeter-e-erwartet.R). */
const REF: Record<string, Record<string, number>> = {
 "lmer": {
  "b_Intercept": 251.4051048,
  "b_Days": 10.46728596,
  "se_Intercept": 9.746716268,
  "se_Days": 0.804221429,
  "t_Days": 13.01542782,
  "var_Subject": 1378.178514,
  "var_Residual": 960.4565786,
  "REML": 1786.465085,
  "ICC": 0.5893089171
 },
 "cfa": {
  "chisq": 85.30552177,
  "df": 24.0,
  "pvalue": 8.502553217e-09,
  "cfi": 0.9305596518,
  "tli": 0.8958394777,
  "rmsea": 0.09212148451,
  "srmr": 0.06520505718,
  "lambda_x1": 0.7718804204,
  "lambda_x2": 0.423600992,
  "lambda_x3": 0.5811323239,
  "lambda_x4": 0.8515822224,
  "lambda_x5": 0.8550654464,
  "lambda_x6": 0.8380100739,
  "lambda_x7": 0.569514684,
  "lambda_x8": 0.7230444328,
  "lambda_x9": 0.6650092188
 },
 "omega": {
  "omega_h": 0.4492435513,
  "omega_total": 0.8508350734,
  "alpha": 0.760402219,
  "G6": 0.8084867408
 },
 "survey": {
  "mittel": 662.2873632,
  "se": 9.585428876,
  "ci_u": 643.385314,
  "ci_o": 681.1894124,
  "df": 199,
  "F": 13.6839436,
  "ndf": 1.893007026,
  "ddf": 376.7083982,
  "p_F": 3.061132412e-06,
  "b_ell": -0.5057255519,
  "se_ell": 0.3931798234,
  "b_meals": -3.110628994,
  "se_meals": 0.2837343929,
  "logit_b": 0.0009774097171,
  "logit_se": 0.007336745824,
  "anteil": 0.1536373898,
  "anteil_se": 0.0292057864
 },
 "quantreg": {
  "b0": 81.4822474169,
  "b1": 0.5601805512,
  "q25_b0": 95.4835396346,
  "q25_b1": 0.4741032082,
  "rank_u1": 0.4870222694,
  "rank_o1": 0.6019890421,
  "rank_u0": 53.2591515454,
  "rank_o0": 114.0115572428,
  "boot_se0": 27.0417232641,
  "boot_se1": 0.0352927592,
  "n": 235
 },
 "glmnet": {
  "lam_min": 0.0689688892,
  "lam_1se": 0.1322761402,
  "cvm_min": 1.0215242251,
  "b_V1": 1.3373939112,
  "b_V2": 0,
  "b_int": 0.1479270558,
  "n_nichtnull": 10,
  "ridge_lam": 0.1630762082,
  "ridge_cvm": 1.1168745072,
  "en_V1": 1.3274627376,
  "en_df": 14
 },
 "rma": {
  "b": -0.7145323484,
  "se": 0.1797815318,
  "ci_lb": -1.066897676,
  "ci_ub": -0.362167021,
  "tau2": 0.313243326,
  "I2": 92.22138607,
  "H2": 12.8557608,
  "QE": 152.2330081,
  "QEp": 1.996764591e-26,
  "k": 13.0
 }
};

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const hatPaket = (n: string) => readdirSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6')).some(f => f.startsWith(`${n}_`));
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/lme4_2.0-1.tgz'));

describe.skipIf(!da)('webR in Node gegen R am Mac (braucht: bash scripts/webr-holen.sh)', () => {
  it('rechnet lmer, cfa, omega, rma, survey, quantreg und glmnet wie R', async () => {
    // Paket-Ordner über HTTP, wie im Browser
    const server = createServer((req, res) => {
      const f = join(webrOrdner, 'repo', decodeURIComponent((req.url ?? '/').split('?')[0]!));
      if (!existsSync(f)) { res.statusCode = 404; res.end(); return; }
      createReadStream(f).pipe(res);
    });
    await new Promise<void>(ok => server.listen(0, ok));
    const port = (server.address() as { port: number }).port;
    const { WebR } = await import(/* @vite-ignore */ pathToFileURL(join(webrOrdner, 'webr.mjs')).href) as { WebR: new (o: object) => any };
    const r = new WebR({ baseUrl: webrOrdner + '/', repoUrl: `http://localhost:${port}/`, channelType: 3 });
    try {
      await r.init();
      await r.evalRVoid(R_START);
      const sh = await new r.Shelter();
      for (const p of R_PROBEN) {
        if (!p.pakete.every(hatPaket)) continue;   // Paket nicht geholt (älterer webr-Ordner): Probe überspringen
        await r.installPackages(p.pakete, { quiet: true });
        const js = rZuJson(await (await sh.evalR(`{${p.code}}`)).toJs()) as Record<string, number>;
        for (const [n, soll] of Object.entries(REF[p.id]!)) {
          const ist = js[n]!;
          // omega_h: die iterative Rotation (GPArotation) weicht in der 6. Stelle ab; sonst stimmen alle Werte auf mindestens 8 Stellen
          const tol = n === 'omega_h' ? 1e-5 : 1e-7;
          expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-12), `${p.id}.${n}`).toBeLessThan(tol);
        }
      }
    } finally { r.close?.(); server.close(); }
  }, 600000);   // fünf Proben mit Paketen; bei stark belasteter Maschine (mehrere Läufe zugleich) reichen 180 s nicht
});
