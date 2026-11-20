import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_R from './statable.R?raw';

/* Referenzwerte: Rscript am Mac (R 4.6.1, lme4 2.0.6, lmerTest 3.2.1, performance 0.17.0), 08.10.2026, erzeugt mit scripts/mehrebenen-erwartet.R.
 * webR 0.6.0 hat R 4.6.0, lme4 2.0-1, lmerTest 3.2-1 (ohne ggplot2, siehe scripts/lmertest-schlank.sh). Die Zahlen sollen auf mindestens 6 Stellen übereinstimmen,
 * die Freiheitsgrade nach Satterthwaite (Hesse-Matrix per numDeriv) auf 5 Stellen. */
const REF: Record<string, Record<string, number | number[]>> = {
  sleep_voll: { b: [251.405104848484, 10.467285959596], se: [9.746716268396, 0.8042214289536], df: [22.81019896696, 161.000000059566], t: [25.79382613852, 13.015427819693], tau: 1378.178513516607, sigma: 960.456578580447, icc_voll: 0.5893089170576, r2_m: 0.2798856367721, r2_c: 0.7042554523236 },
  sleep_null: { tau: 1278.337756569811, sigma: 1958.865177026968, icc: 0.3948895953673, b: 298.507891666666 },
  sleep_steigung: { b: [251.405104848482, 10.467285959596], se: [6.824596695083, 1.545789643897], df: [16.999726370022, 16.999983752859], tau: 612.100158057007, tau_steigung: 35.071714450484, kor: 0.06555123825695, sigma: 654.940008257545, r2_m: 0.2786510581582, r2_c: 0.7992199227863 },
  mathach_null: { tau: 8.614024837479, sigma: 39.148321890968, icc: 0.1803517923115, b: 12.636973811447, n: 7185, ng: 160 },
  mathach_voll: { b: [14.114510883728, 2.089423939806, -2.961471875124, -1.229794364156], se: [0.1970282879547, 0.1057057959075, 0.2057554419636, 0.1627085015894], df: [262.941419796756, 6831.716840263018, 4829.986173484772, 6640.584996065416], tau: 3.673648419595, sigma: 35.909002001326, icc_voll: 0.09280956127317, r2_m: 0.1335976694408, r2_c: 0.214008089626 },
  mathach_zentriert: { b: [12.657822901785, 2.390195793904], se: [0.1879851929862, 0.1057190821718], df: [148.302344633026, 6838.077573300813], tau: 4.768174611081, sigma: 37.034398535458, r2_m: 0.07664820803977, r2_c: 0.1819695373294 },
  ausschnitt_voll: { b: [14.446369485692, 2.612222617676, -3.10405505639], se: [0.3723140488744, 0.3260943595534, 0.6246119072406], df: [50.427307738319, 688.821783276769, 281.844287149062], t: [38.801569614065, 8.010634165072, -4.969573939286], tau: 2.47933350648, sigma: 35.065712325002, icc_voll: 0.06603623598193, r2_m: 0.1694430781694, r2_c: 0.2242899310558 }
};

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/lmerTest_3.2-1.tgz')) && existsSync(webrOrdner + '/manifest.json');
const csv = (f: string) => { const z = readFileSync(join(import.meta.dirname, '../lib/testdaten', f), 'utf8').trim().split('\n'); return { kopf: z[0]!.split(';'), zeilen: z.slice(1).map(l => l.split(';')) }; };

describe.skipIf(!da)('Mehrebenen-Modelle in webR gegen R am Mac (braucht: bash scripts/webr-holen.sh)', () => {
  it('rechnet Nullmodell, feste Effekte (Satterthwaite), R², zufällige Steigung und Fehlerfälle wie R', async () => {
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
    const vergleiche = (o: Record<string, any>, ref: Record<string, number | number[]>, zuordnung: Record<string, string>, tol = 1e-6, tolDf = 1e-5) => {
      for (const [rk, ok] of Object.entries(zuordnung)) {
        const soll = ref[rk]; if (soll === undefined) continue;
        const ist = o[ok];
        if (Array.isArray(soll)) soll.forEach((v, i) => nah(ist[i], v, rk === 'df' ? tolDf : tol, `${ok}[${i}]`));
        else nah(eins(ist), soll, tol, ok);
      }
    };
    const Z = { b: 'fest_b', se: 'fest_se', df: 'fest_df', t: 'fest_t', tau: 'tau', sigma: 'sigma', icc_voll: 'icc_voll', r2_m: 'r2_m', r2_c: 'r2_c' };
    try {
      await r.init();
      await r.evalRVoid(R_START);
      await r.installPackages(['lme4', 'lmerTest'], { quiet: true });
      sh = await new r.Shelter();
      await rechne(`{ ${STATABLE_R}\nTRUE }`);
      // Datensätze: sleepstudy (lme4), MathAchieve (nlme), Klassen-Ausschnitt (CSV)
      await rechne(`{ suppressMessages(library(lme4)); sl <- sleepstudy; names(sl)[1] <- 'y'; names(sl)[3] <- 'g'; sl$g <- as.character(sl$g); sl$p01 <- sl$Days; sl <- sl[, c('y','g','p01')]; TRUE }`);
      await rechne(`{ data(MathAchieve, package = 'nlme'); ma <- as.data.frame(MathAchieve); ma2 <- data.frame(y = ma$MathAch, g = as.character(ma$School), p01 = ma$SES, p02 = factor(ma$Minority, levels = c('No','Yes')), p03 = factor(ma$Sex, levels = c('Male','Female'))); TRUE }`);
      const k = csv('klassen-ausschnitt.csv'), spalte = (j: number, text = false) => (text ? `c(${k.zeilen.map(z => `'${z[j]}'`).join(',')})` : `c(${k.zeilen.map(z => z[j]!.replace(',', '.')).join(',')})`);
      await rechne(`{ ka <- data.frame(y = ${spalte(4)}, g = ${spalte(0, true)}, p01 = ${spalte(3)}, p02 = factor(${spalte(2)}, levels = c(0, 1))); TRUE }`);

      // sleepstudy: Nullmodell, Days, Days mit zufälliger Steigung
      let o = await rechne(`sp_mehrebenen(sl, 'p01')`);
      vergleiche(o, REF.sleep_voll!, Z);
      nah(eins(o.null_tau), REF.sleep_null!.tau as number, 1e-6, 'null_tau'); nah(eins(o.null_sigma), REF.sleep_null!.sigma as number, 1e-6, 'null_sigma'); nah(eins(o.null_icc), REF.sleep_null!.icc as number, 1e-6, 'null_icc');
      nah(eins(o.null_const), REF.sleep_null!.b as number, 1e-6, 'null_const');
      expect(eins(o.singular)).toBe(false);
      expect(o.gruppe.length).toBe(18);
      o = await rechne(`sp_mehrebenen(sl, 'p01', 'p01')`);
      vergleiche(o, REF.sleep_steigung!, { b: 'fest_b', se: 'fest_se', df: 'fest_df', tau: 'tau', sigma: 'sigma', r2_m: 'r2_m', r2_c: 'r2_c', tau_steigung: 'tau_steigung', kor: 'kor_ach_steig' });
      o = await rechne(`sp_mehrebenen(sl)`);
      expect(eins(o.mit_praed)).toBe(false);
      nah(eins(o.null_icc), REF.sleep_null!.icc as number, 1e-6, 'null-only icc');

      // Klassen-Ausschnitt (Zahl und Faktor)
      o = await rechne(`sp_mehrebenen(ka, c('p01','p02'))`);
      vergleiche(o, REF.ausschnitt_voll!, Z);
      expect(o.fest_name).toEqual(['(Intercept)', 'p01', 'p021']);

      // MathAchieve: 160 Schulen, 7185 Schülerinnen und Schüler
      o = await rechne(`sp_mehrebenen(ma2, c('p01','p02','p03'))`);
      vergleiche(o, REF.mathach_voll!, Z);
      nah(eins(o.null_tau), REF.mathach_null!.tau as number, 1e-6, 'ma null_tau'); nah(eins(o.null_icc), REF.mathach_null!.icc as number, 1e-6, 'ma null_icc');
      expect(eins(o.n)).toBe(7185); expect(eins(o.ng)).toBe(160);
      expect(o.an_term).toEqual(['p01', 'p02', 'p03']);
      o = await rechne(`sp_mehrebenen(ma2[, c('y','g','p01')], 'p01', zentrieren = TRUE)`);
      vergleiche(o, REF.mathach_zentriert!, { b: 'fest_b', se: 'fest_se', df: 'fest_df', tau: 'tau', sigma: 'sigma', r2_m: 'r2_m', r2_c: 'r2_c' });

      // Fehlerfälle: R meldet, statt abzustürzen
      const einzeln = await rechne(`sp_mehrebenen(data.frame(y = c(1,2,3,4), g = c('a','b','c','d'), p01 = c(1,2,3,5)), 'p01')`);
      expect(einzeln.fehler).toBeTruthy();
      const eine = await rechne(`sp_mehrebenen(data.frame(y = c(1,2,3,4), g = rep('a', 4)))`);
      expect(eine.fehler).toBeTruthy();
    } finally { r.close?.(); server.close(); }
  }, 900000);
});
