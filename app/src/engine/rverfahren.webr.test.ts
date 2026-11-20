import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_R from './statable.R?raw';

/* Referenzwerte: Rscript am Mac (R 4.6.1, lavaan 0.7.2, psych 2.6.9), 08.10.2026, erzeugt mit scripts/cfa-omega-erwartet.R.
 * webR 0.6.0 hat R 4.6.0, lavaan 0.6-21, psych 2.6.5 - kleine Unterschiede in der letzten Stelle sind möglich (omega_h: Rotation iterativ). */
const REF: Record<string, Record<string, number>> = {
 "omega_hs": { "omega": 0.7380691717, "lo": 0.6949216417, "hi": 0.7812167017, "n": 301 },
 "omega_hs_h": { "omega_h": 0.4492435513, "omega_t_psych": 0.8508350734 },
 "omega_hs_boot": { "omega": 0.7380691717, "lo": 0.6786616087, "hi": 0.8053285607, "ziehungen": 60 },
 "omega_bfi": { "omega": 0.8031966544, "lo": 0.7724290257, "hi": 0.8339642832, "n": 387 },
 "omega_bfi_fiml": { "omega": 0.804997844, "lo": 0.7743080505, "hi": 0.8356876375, "n": 400 },
 "cfa_hs": { "chisq": 85.30552177, "df": 24, "pvalue": 8.502553217e-09, "cfi": 0.9305596518, "tli": 0.8958394777, "rmsea": 0.09212148451, "rmsea.ci.lower": 0.07141849044, "rmsea.ci.upper": 0.1136780168, "srmr": 0.06520505718, "lam_v1": 0.7718804204, "lam_v2": 0.423600992, "lam_v3": 0.5811323239, "lam_v4": 0.8515822224, "lam_v5": 0.8550654464, "lam_v6": 0.8380100739, "lam_v7": 0.569514684, "lam_v8": 0.7230444328, "lam_v9": 0.6650092188, "se_v1": 0.05497272867, "se_v2": 0.05961911656, "se_v3": 0.05513930691, "se_v4": 0.02254309593, "se_v5": 0.02234124932, "se_v6": 0.02335517756, "se_v7": 0.05315486789, "se_v8": 0.05053057743, "se_v9": 0.05109433974, "kor_F1F2": 0.4585093004, "kor_F1F3": 0.4705345445, "kor_F2F3": 0.2829847304, "n": 301 },
 "cfa_bfi_wlsmv": { "chisq": 147.9047438, "df": 26, "pvalue": 0, "cfi": 0.9486258905, "tli": 0.9288666176, "rmsea": 0.1115200496, "rmsea.ci.lower": 0.09442016789, "rmsea.ci.upper": 0.1293255497, "srmr": 0.0772575111, "lam_v1": 0.5935161127, "lam_v2": 0.7547168952, "lam_v3": 0.5140778405, "lam_v4": 0.7931545486, "lam_v5": 0.8497962881, "lam_v6": 0.8391374764, "lam_v7": 0.7513817376, "lam_v8": 0.6179309933, "lam_v9": 0.5498455849, "se_v1": 0.03831544383, "se_v2": 0.03708425199, "se_v3": 0.04461049078, "se_v4": 0.03269477819, "se_v5": 0.02190329086, "se_v6": 0.02438554319, "se_v7": 0.02414669886, "se_v8": 0.03662899344, "se_v9": 0.04003663519, "kor_F1F2": -0.2135832856, "n": 378 }
};

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/lavaan_0.6-21.tgz')) || existsSync(webrOrdner + '/manifest.json');
const csv = (f: string) => { const z = readFileSync(join(import.meta.dirname, '../lib/testdaten', f), 'utf8').trim().split('\n'); return { kopf: z[0]!.split(';'), zeilen: z.slice(1).map(l => l.split(';').map(v => (v === '' ? 'NA' : v.replace(',', '.')))) }; };
/** R-Code für einen data.frame v1 … vk aus den Spalten einer CSV (fehlend = NA). */
const dfCode = (f: string) => { const c = csv(f); return `data.frame(${c.kopf.map((_, j) => `v${j + 1} = c(${c.zeilen.map(z => z[j]).join(',')})`).join(', ')})`; };

describe.skipIf(!da)('Omega und CFA in webR gegen R am Mac (braucht: bash scripts/webr-holen.sh)', () => {
  it('rechnet Omega, CFA (ML, WLSMV) und die Fehlerfälle wie R', async () => {
    const server = createServer((req, res) => {
      const f = join(webrOrdner, 'repo', decodeURIComponent((req.url ?? '/').split('?')[0]!));
      if (!existsSync(f)) { res.statusCode = 404; res.end(); return; }
      createReadStream(f).pipe(res);
    });
    await new Promise<void>(ok => server.listen(0, ok));
    const port = (server.address() as { port: number }).port;
    const { WebR } = await import(/* @vite-ignore */ pathToFileURL(join(webrOrdner, 'webr.mjs')).href) as { WebR: new (o: object) => any };
    const r = new WebR({ baseUrl: webrOrdner + '/', repoUrl: `http://localhost:${port}/`, channelType: 3 });
    const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Record<string, any>;
    const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
    const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-9), was).toBeLessThan(tol);
    let sh: any;
    try {
      await r.init();
      await r.evalRVoid(R_START);
      await r.installPackages(['lavaan', 'psych', 'GPArotation'], { quiet: true });
      sh = await new r.Shelter();
      await rechne(`{ ${STATABLE_R}\nTRUE }`);
      await rechne(`{ suppressMessages(library(lavaan)); hs <- HolzingerSwineford1939[, paste0('x', 1:9)]; names(hs) <- paste0('v', 1:9); TRUE }`);
      await rechne(`{ bfi <- ${dfCode('bfi-ausschnitt.csv')}; TRUE }`);

      // Omega: Delta-Methode, Holzinger
      let o = await rechne(`sp_omega(hs, boot = 0L, nf = 3L)`);
      for (const k of ['omega', 'lo', 'hi']) nah(eins(o[k]), REF.omega_hs![k]!, 1e-6, 'omega_hs.' + k);
      expect(eins(o.n)).toBe(REF.omega_hs!.n);
      nah(eins(o.omega_h), REF.omega_hs_h!.omega_h!, 1e-4, 'omega_h');
      nah(eins(o.omega_t_psych), REF.omega_hs_h!.omega_t_psych!, 1e-6, 'omega_t_psych');
      // Omega: Bootstrap (60 Ziehungen, fester Startwert)
      o = await rechne(`sp_omega(hs, boot = 60L)`);
      for (const k of ['omega', 'lo', 'hi']) nah(eins(o[k]), REF.omega_hs_boot![k]!, 1e-6, 'omega_boot.' + k);
      // Omega mit fehlenden Werten: listwise und FIML
      o = await rechne(`sp_omega(bfi[, 5:9], boot = 0L)`);
      for (const k of ['omega', 'lo', 'hi']) nah(eins(o[k]), REF.omega_bfi![k]!, 1e-6, 'omega_bfi.' + k);
      expect(eins(o.n)).toBe(REF.omega_bfi!.n);
      o = await rechne(`sp_omega(bfi[, 5:9], boot = 0L, fiml = TRUE)`);
      for (const k of ['omega', 'lo', 'hi']) nah(eins(o[k]), REF.omega_bfi_fiml![k]!, 1e-6, 'omega_bfi_fiml.' + k);
      expect(eins(o.n)).toBe(REF.omega_bfi_fiml!.n);

      // CFA, ML
      let c = await rechne(`sp_cfa(hs, list(F1 = c('v1','v2','v3'), F2 = c('v4','v5','v6'), F3 = c('v7','v8','v9')))`);
      const f = c.fit as Record<string, any>, ref = REF.cfa_hs!;
      for (const k of ['chisq', 'df', 'pvalue', 'cfi', 'tli', 'rmsea', 'rmsea.ci.lower', 'rmsea.ci.upper', 'srmr']) nah(eins(f[k]), ref[k]!, 1e-6, 'cfa.' + k);
      c.last_item.forEach((q: string, i: number) => { nah(c.last_std[i], ref['lam_' + q]!, 1e-6, 'lam_' + q); nah(c.last_se[i], ref['se_' + q]!, 1e-5, 'se_' + q); });
      c.kor_a.forEach((a: string, i: number) => nah(c.kor_r[i], ref['kor_' + a + c.kor_b[i]]!, 1e-6, 'kor_' + a));
      expect(eins(c.n)).toBe(ref.n);
      expect(eins(c.heywood)).toBe(false);
      // CFA, WLSMV mit fehlenden Werten (Personen ausgelassen)
      c = await rechne(`sp_cfa(bfi, list(F1 = c('v1','v2','v3','v4'), F2 = c('v5','v6','v7','v8','v9')), ordinal = TRUE)`);
      const w = c.fit as Record<string, any>, rw = REF.cfa_bfi_wlsmv!;
      for (const k of ['chisq', 'df', 'cfi', 'tli', 'rmsea', 'rmsea.ci.lower', 'rmsea.ci.upper', 'srmr']) nah(eins(w[k]), rw[k]!, 1e-5, 'wlsmv.' + k);
      c.last_item.forEach((q: string, i: number) => nah(c.last_std[i], rw['lam_' + q]!, 1e-5, 'wlsmv lam_' + q));
      expect(eins(c.n)).toBe(rw.n);

      // Fehlerfälle: R meldet, statt abzustürzen
      const fe = await rechne(`tryCatch(sp_cfa(hs, list(F1 = c('v1'), F2 = c('v2'), F3 = c('v3'))), error = function(e) list(fehler = conditionMessage(e)))`);
      expect(fe.fehler ?? (eins(fe.heywood) !== undefined ? 'ok-ohne-Fehler' : '')).toBeTruthy();
    } finally { r.close?.(); server.close(); }
  }, 600000);
});
