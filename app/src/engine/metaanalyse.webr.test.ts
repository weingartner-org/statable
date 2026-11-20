import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_R from './statable.R?raw';

/* Referenzwerte: Rscript am Mac (R 4.6.1, metafor 5.2-1), 08.10.2026, erzeugt mit scripts/metaanalyse-erwartet.R (metafor direkt, ohne engine/statable.R).
 * webR 0.6.0 hat R 4.6.0 und metafor 5.0-1. Die Zahlen sollen auf mindestens 6 Stellen übereinstimmen; die Intervalle von τ² und I² (Profil-Likelihood, confint) auf 5 Stellen. */
const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/metafor_5.0-1.tgz')) && existsSync(webrOrdner + '/manifest.json');

const REF: Record<string, Record<string, number>> = {
  bcg: { est: -0.7145323483651, se: 0.1797815317804, ci_lb: -1.06689767574, ci_ub: -0.3621670209901, stat: -3.974447994125, p: 7.054267348521e-05, pi_lb: -1.866692346607, pi_ub: 0.4376276498769, tau2: 0.3132433259809, tau2_lo: 0.1196953128166, tau2_hi: 1.111486262215, i2: 92.221386074966, i2_lo: 81.917722721505, i2_hi: 97.678089605069, h2: 12.855760803112, q: 152.233008082373, egger_stat: -1.401282002289, egger_p: 0.188706995082 },
  bcg_kh: { se: 0.1807917455191, ci_lb: -1.108443723, ci_ub: -0.3206209737302, stat: -3.952239889678, p: 0.001920015085134, pi_lb: -1.996016967022, pi_ub: 0.5669522702921 },
  normand: { est: -0.5371082585668, se: 0.3086614915982, ci_lb: -1.142073665514, ci_ub: 0.06785714838005, stat: -1.740120725089, p: 0.08183782180716, pi_lb: -2.382094344814, pi_ub: 1.307877827681, tau2: 0.7908429210485, i2: 95.49493711312, q: 123.729274359725, egger_stat: -0.4994886045247, egger_p: 0.6327493824499 },
  molloy: { est: 0.1499179884249, se: 0.03156103310824, ci_lb: 0.08805950021786, ci_ub: 0.2117764766319, stat: 4.750097625472, p: 2.033184696749e-06, tau2: 0.008110503698384, i2: 61.732401200736, q: 38.159515423616, egger_stat: 1.34503442705, egger_p: 0.1999987233297 }
};
const SCHLUESSEL: Record<string, string> = { est: 'est', se: 'se', ci_lb: 'ci_lb', ci_ub: 'ci_ub', stat: 'stat', p: 'p', pi_lb: 'pi_lb', pi_ub: 'pi_ub', tau2: 'tau2', tau2_lo: 'tau2_lo', tau2_hi: 'tau2_hi', i2: 'i2', i2_lo: 'i2_lo', i2_hi: 'i2_hi', h2: 'h2', q: 'q', egger_stat: 'egger_stat', egger_p: 'egger_p' };
const BCG = 'data.frame(tpos=c(4,6,3,62,33,180,8,505,29,17,186,5,27), tneg=c(119,300,228,13536,5036,1361,2537,87886,7470,1699,50448,2493,16886), cpos=c(11,29,11,248,47,372,10,499,45,65,141,3,29), cneg=c(128,274,209,12619,5761,1079,619,87892,7232,1600,27197,2338,17825))';
const NORMAND = 'data.frame(m1i=c(55,27,64,66,14,19,52,21,30), sd1i=c(47,7,17,20,8,7,45,16,27), n1i=c(155,31,75,18,8,57,34,110,60), m2i=c(75,29,119,137,18,18,41,31,23), sd2i=c(64,4,29,48,11,4,34,27,20), n2i=c(156,32,71,18,13,52,33,183,52))';
const MOLLOY = 'data.frame(ri=c(.187,.162,.34,.32,.27,0,.175,.05,.26,.01,-.09,.37,0,.15,.24,.04), ni=c(109,749,55,107,72,65,174,326,58,771,56,91,116,537,158,65))';

describe.skipIf(!da)('Meta-Analyse in webR gegen R am Mac (braucht: bash scripts/webr-holen.sh)', () => {
  it('rechnet REML, Knapp-Hartung, Hedges g, Fisher z, Prädiktionsintervall, Egger wie metafor und meldet Fehler', async () => {
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
    const vergleiche = (o: Record<string, any>, ref: Record<string, number>) => {
      for (const [k, soll] of Object.entries(ref)) nah(eins(o[SCHLUESSEL[k] ?? k]), soll, /_(lo|hi)$/.test(k) ? 1e-5 : 1e-6, k);
    };
    try {
      await r.init();
      await r.evalRVoid(R_START);
      await r.installPackages(['metafor'], { quiet: true });
      sh = await new r.Shelter();
      await rechne(`{ ${STATABLE_R}\nTRUE }`);
      await rechne(`{ suppressMessages(library(metafor)); b <- ${BCG}; es <- escalc(measure = 'RR', ai = tpos, bi = tneg, ci = cpos, di = cneg, data = b); bcg <- data.frame(yi = es$yi, sei = sqrt(es$vi)); TRUE }`);

      // BCG: Effekt + SE (die Oberfläche übergibt yi und sei), REML
      let o = await rechne(`sp_meta(bcg, 'es', FALSE)`);
      vergleiche(o, REF.bcg!);
      expect(eins(o.k)).toBe(13); expect(eins(o.q_df)).toBe(12); expect(eins(o.egger_df)).toBe(11);
      expect(o.gewicht.reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(100, 6);
      // Knapp-Hartung
      o = await rechne(`sp_meta(bcg, 'es', TRUE)`);
      vergleiche(o, REF.bcg_kh!);
      expect(eins(o.stat_df)).toBe(12);
      // Meta-Regression (S-H, 22.10.): Breitengrad (und Jahr) als Moderatoren, Referenz Rscript am Mac (metafor 5.2-1, direkt aufgerufen) auf 6 Stellen
      await rechne(`{ bcg$mod1 <- c(44,55,42,52,13,44,19,13,27,42,18,33,33); bcg2 <- bcg; bcg2$mod2 <- c(48,49,60,77,73,53,73,80,68,61,74,69,76); TRUE }`);
      const reg = (x: Record<string, any>, ref: Record<string, number[] | number>) => {
        for (const [k, soll] of Object.entries(ref)) {
          const ist = x.reg[k]; const a = Array.isArray(ist) ? ist : [ist], b = Array.isArray(soll) ? soll : [soll];
          b.forEach((v, i) => nah(a[i], v, 1e-6, `reg.${k}[${i}]`));
        }
      };
      o = await rechne(`sp_meta(bcg, 'es', FALSE)`);
      reg(o, { b: [0.251464294374, -0.029101660928], se: [0.249103666389, 0.00719555475708], p: [0.312746171947, 5.24585597431e-05], ci_lb: [-0.236769920165, -0.0432046891007], ci_ub: [0.739698508914, -0.0149986327554],
        qm: 16.35712557, qm_p: 5.245855974e-05, qe: 30.73309001, qe_p: 0.001214290987, tau2: 0.07635469471, i2: 68.39313051, r2: 75.62447836 });
      expect(eins(o.reg.qm_df)).toBe(1); expect(eins(o.reg.qe_df)).toBe(11); expect(eins(o.est)).toBeCloseTo(-0.7145323483651, 6);   // das Grundmodell bleibt daneben
      o = await rechne(`sp_meta(bcg, 'es', TRUE)`);
      reg(o, { se: [0.283930037419, 0.00820154179601], p: [0.394751838059, 0.00456554558896], ci_lb: [-0.373461504489, -0.0471531327109], ci_ub: [0.876390093238, -0.0110501891451], qm: 12.59054553, qm_p: 0.004565545589, df: 11 });
      o = await rechne(`sp_meta(bcg2, 'es', FALSE)`);
      reg(o, { b: [0.0788524539759, -0.028011275213, 0.00190755659625], se: [1.2292956941, 0.0102340409465, 0.0146838158164], qm: 12.20425052, qm_p: 0.00223810611, qe: 28.32514366, tau2: 0.1107873515, r2: 64.63217494 });
      expect(eins(o.reg.qm_df)).toBe(2); expect(eins(o.reg.qe_df)).toBe(10);
      // Hedges g aus M, SD, n (escalc SMD)
      o = await rechne(`sp_meta(${NORMAND}, 'smd', FALSE)`);
      vergleiche(o, REF.normand!);
      // Korrelationen über Fisher z
      o = await rechne(`sp_meta(${MOLLOY}, 'r', FALSE)`);
      vergleiche(o, REF.molloy!);
      nah(Math.tanh(eins(o.est)), 0.1488048389995, 1e-6, 'r');

      // Fehlerfälle: R meldet, statt abzustürzen
      const keine = await rechne(`sp_meta(data.frame(yi = c(0.1, NA), sei = c(0.2, 0.2)), 'es')`);
      expect(keine.fehler).toBeTruthy();
      // zwei Studien: rechnet, Egger entfällt (NA -> null)
      const zwei = await rechne(`sp_meta(data.frame(yi = c(0.1, 0.4), sei = c(0.2, 0.3)), 'es')`);
      expect(eins(zwei.k)).toBe(2); expect(eins(zwei.egger_p) ?? null).toBeNull();
    } finally { r.close?.(); server.close(); }
  }, 900000);
});
