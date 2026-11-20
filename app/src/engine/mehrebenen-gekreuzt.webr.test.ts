import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_R from './statable.R?raw';

/* Gekreuzte Zufallseffekte (zwei Gruppierungen, nur zufällige Achsenabschnitte) in webR gegen die Sollwerte des Prüfers (R am Mac + SPSS 32):
 * docs/nutzen/SOLL-GEKREUZT-2026-11-10.json. Die Sollwerte werden hier nur gelesen, nie gerechnet.
 * Kleine Datei: docs/nutzen/SOLL-GEKREUZT-KLEIN.csv (Schlüssel „klein“). Echte Datei: app/public/beispiel/woerter-personen-reize.csv (Kodierung „andere“:
 * Vergleichsgruppe = alphabetisch erste Stufe, so wie die Oberfläche Faktoren kodiert). */
const SOLL = JSON.parse(readFileSync(join(import.meta.dirname, '../../../docs/nutzen/SOLL-GEKREUZT-2026-11-10.json'), 'utf8'));
const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/lmerTest_3.2-1.tgz')) && existsSync(webrOrdner + '/manifest.json');

describe.skipIf(!da)('Mehrebenen gekreuzt (zwei Gruppierungen) in webR gegen die Sollwerte (braucht: bash scripts/webr-holen.sh)', () => {
  it('kleine Datei: Varianzen beider Gruppierungen, sigma, Anteile, Konstante, B/SE/df von x; Erkennung; Fehlerfälle', async () => {
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
    const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-9), `${was}: ist ${ist}, soll ${soll}`).toBeLessThan(tol);
    try {
      await r.init();
      await r.evalRVoid(R_START);
      await r.installPackages(['lme4', 'lmerTest'], { quiet: true });
      sh = await new r.Shelter();
      await rechne(`{ ${STATABLE_R}\nTRUE }`);

      // ---- kleine Datei
      const kl = readFileSync(join(import.meta.dirname, '../../../docs/nutzen/SOLL-GEKREUZT-KLEIN.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map(l => l.split(','));
      const txt = (j: number) => `c(${kl.map(z => `'${z[j]}'`).join(',')})`, zahl = (j: number) => `c(${kl.map(z => z[j]).join(',')})`;
      await rechne(`{ kl <- data.frame(y = ${zahl(3)}, g = ${txt(0)}, p01 = ${zahl(2)}, g2 = ${txt(1)}); TRUE }`);
      const K = SOLL.klein;
      let o = await rechne(`sp_mehrebenen(kl, 'p01')`);
      expect(o.fehler).toBeUndefined();
      // Nullmodell
      nah(eins(o.null_tau), K.nullmodell.zufall.person.var, 1e-4, 'null_tau (Person)');
      nah(eins(o.null_tau2), K.nullmodell.zufall.reiz.var, 1e-4, 'null_tau2 (Reiz)');
      nah(eins(o.null_sigma), K.nullmodell.sigma2, 1e-4, 'null_sigma');
      nah(eins(o.null_icc), K.nullmodell.ICC.person, 1e-4, 'ICC Person');
      nah(eins(o.null_icc2), K.nullmodell.ICC.reiz, 1e-4, 'ICC Reiz');
      nah(eins(o.null_const), K.nullmodell.konstante.B, 1e-5, 'Konstante Nullmodell');
      nah(eins(o.null_const_se), K.nullmodell.konstante.SE, 1e-4, 'SE Konstante Nullmodell');
      nah(eins(o.null_const_df), K.nullmodell.konstante.df, 1e-3, 'df Konstante Nullmodell');
      // Modell y ~ x
      nah(eins(o.tau), K.modell.zufall.person.var, 1e-4, 'tau (Person)');
      nah(eins(o.tau2), K.modell.zufall.reiz.var, 1e-4, 'tau2 (Reiz)');
      nah(eins(o.sigma), K.modell.sigma2, 1e-4, 'sigma2');
      const sum = K.modell.zufall.person.var + K.modell.zufall.reiz.var + K.modell.sigma2;
      nah(eins(o.icc_voll), K.modell.zufall.person.var / sum, 1e-4, 'Anteil Person (Modell)');
      nah(eins(o.icc_voll2), K.modell.zufall.reiz.var / sum, 1e-4, 'Anteil Reiz (Modell)');
      nah(eins(o.aufgeklaert_3), (K.nullmodell.zufall.reiz.var - K.modell.zufall.reiz.var) / K.nullmodell.zufall.reiz.var, 1e-4, 'erklärte Varianz Reiz');
      nah(o.fest_b[0], K.modell.feste['(Intercept)'].B, 1e-5, 'Konstante B'); nah(o.fest_se[0], K.modell.feste['(Intercept)'].SE, 1e-4, 'Konstante SE'); nah(o.fest_df[0], K.modell.feste['(Intercept)'].df, 1e-3, 'Konstante df');
      nah(o.fest_b[1], K.modell.feste.x.B, 1e-5, 'x B'); nah(o.fest_se[1], K.modell.feste.x.SE, 1e-4, 'x SE'); nah(o.fest_df[1], K.modell.feste.x.df, 1e-3, 'x df');
      nah(o.fest_t[1], K.modell.feste.x.t, 1e-4, 'x t');
      nah(eins(o.r2_m), K.modell.R2.R2_marginal, 1e-3, 'R2 marginal'); nah(eins(o.r2_c), K.modell.R2.R2_konditional, 1e-3, 'R2 konditional');
      nah(o.an_f[0], K.modell.typ3_F.x.F, 1e-4, 'F von x');
      expect(eins(o.ng)).toBe(8); expect(eins(o.ng2)).toBe(6); expect(eins(o.n)).toBe(48);
      expect(eins(o.singular)).toBe(false);
      expect(o.gruppe.length).toBe(8);   // Raupendiagramm: erste Gruppierung

      // ohne Prädiktor: nur Nullmodell
      o = await rechne(`sp_mehrebenen(kl[, c('y','g','g2')])`);
      expect(eins(o.mit_praed)).toBe(false);
      nah(eins(o.null_tau2), K.nullmodell.zufall.reiz.var, 1e-4, 'null_tau2 ohne Prädiktor');

      // ohne g2 weiter wie bisher: kein Feld der zweiten Gruppierung
      o = await rechne(`sp_mehrebenen(kl[, c('y','g','p01')], 'p01')`);
      expect(o.null_tau2 === undefined || o.null_tau2 === null).toBe(true);
      nah(o.fest_b[1], K.nur_Personen_modell.feste.x.B, 1e-4, 'nur Personen: x B');

      // zufällige Steigung mit zwei Gruppierungen: R meldet statt zu rechnen; Ja/Nein ebenso
      o = await rechne(`sp_mehrebenen(kl, 'p01', 'p01')`);
      expect(o.fehler).toBeTruthy();
      o = await rechne(`sp_mehrebenen(transform(kl, y = as.numeric(y > median(y))), 'p01')`);
      expect(o.fehler).toBeTruthy();

      // ---- echte Datei: 45 Personen x 120 Reize, 2.553 Einzelversuche
      const z = readFileSync(join(import.meta.dirname, '../../public/beispiel/woerter-personen-reize.csv'), 'utf8').trim().split(/\r?\n/);
      const kopf = z[0]!.split(';'), ix = (n: string) => kopf.indexOf(n);
      const zeilen = z.slice(1).map(l => l.split(';'));
      const stufen = (n: string) => [...new Set(zeilen.map(zz => zz[ix(n)]!))].sort((a, b) => a.localeCompare(b, 'de'));
      const code = (n: string) => { const s = stufen(n); return `c(${zeilen.map(zz => s.indexOf(zz[ix(n)]!) + 1).join(',')})`; };
      expect(stufen('aufgabe')).toEqual(['entscheiden', 'vorlesen']); expect(stufen('wortart')).toEqual(['Nichtwort', 'Wort']); expect(stufen('haeufigkeit')).toEqual(['häufig', 'selten']);
      const rt = `c(${zeilen.map(zz => zz[ix('reaktionszeit')]).join(',')})`;
      const pr = `c(${zeilen.map(zz => `'${zz[ix('person')]}'`).join(',')})`, rr = `c(${zeilen.map(zz => `'${zz[ix('reiz')]}'`).join(',')})`;
      await rechne(`{ wp <- data.frame(y = ${rt}, g = ${pr}, p01 = factor(${code('aufgabe')}, levels = 1:2), p02 = factor(${code('wortart')}, levels = 1:2), p03 = factor(${code('haeufigkeit')}, levels = 1:2), g2 = ${rr}); TRUE }`);
      const G = SOLL.gekreuzt_andere, P = SOLL.personen_andere;
      // Nullmodell gekreuzt
      o = await rechne(`sp_mehrebenen(wp[, c('y','g','g2')])`);
      expect(eins(o.n)).toBe(2553); expect(eins(o.ng)).toBe(45); expect(eins(o.ng2)).toBe(120);
      nah(eins(o.null_tau), G.nullmodell.zufall.person.var, 1e-3, 'Nullmodell: Varianz Person');
      nah(eins(o.null_tau2), G.nullmodell.zufall.reiz.var, 1e-3, 'Nullmodell: Varianz Reiz');
      nah(eins(o.null_sigma), G.nullmodell.sigma2, 1e-3, 'Nullmodell: sigma2');
      nah(eins(o.null_icc), G.nullmodell.ICC.person, 1e-3, 'Nullmodell: ICC Person');
      nah(eins(o.null_icc2), G.nullmodell.ICC.reiz, 1e-3, 'Nullmodell: ICC Reiz');
      nah(eins(o.null_const), G.nullmodell.konstante.B, 1e-4, 'Nullmodell: Konstante');
      nah(eins(o.null_const_se), G.nullmodell.konstante.SE, 1e-3, 'Nullmodell: SE Konstante');
      // Modell aufgabe + wortart + haeufigkeit
      o = await rechne(`sp_mehrebenen(wp, c('p01','p02','p03'))`);
      expect(o.fehler).toBeUndefined();
      const F = G.modell.feste;
      expect(o.fest_name).toEqual(['(Intercept)', 'p012', 'p022', 'p032']);
      [['(Intercept)', 0], ['aufgabevorlesen', 1], ['wortartWort', 2], ['haeufigkeitselten', 3]].forEach(([nm, i]) => {
        nah(o.fest_b[i as number], F[nm as string].B, 1e-4, `${nm} B`); nah(o.fest_se[i as number], F[nm as string].SE, 1e-3, `${nm} SE`); nah(o.fest_df[i as number], F[nm as string].df, 1e-3, `${nm} df`);
      });
      nah(eins(o.aufgeklaert_3), (G.nullmodell.zufall.reiz.var - G.modell.zufall.reiz.var) / G.nullmodell.zufall.reiz.var, 1e-3, 'erklärte Varianz Reiz');
      nah(eins(o.tau), G.modell.zufall.person.var, 1e-3, 'Modell: Varianz Person'); nah(eins(o.tau2), G.modell.zufall.reiz.var, 1e-3, 'Modell: Varianz Reiz'); nah(eins(o.sigma), G.modell.sigma2, 1e-3, 'Modell: sigma2');
      nah(eins(o.r2_m), G.modell.R2.R2_marginal, 1e-3, 'R2 marginal'); nah(eins(o.r2_c), G.modell.R2.R2_konditional, 1e-3, 'R2 konditional');
      nah(o.an_f[0], G.modell.typ3_F.aufgabe.F, 1e-3, 'F aufgabe'); nah(o.an_f[1], G.modell.typ3_F.wortart.F, 1e-3, 'F wortart');
      expect(o.an_term).toEqual(['p01', 'p02', 'p03']);
      // Gegenprobe: nur Personen (wie bisher) - SE der Wortart kleiner, df riesig (die Lehrbotschaft)
      o = await rechne(`sp_mehrebenen(wp[, c('y','g','p01','p02','p03')], c('p01','p02','p03'))`);
      nah(o.fest_se[2], P.modell.feste.wortartWort.SE, 1e-3, 'nur Personen: wortart SE'); nah(o.fest_df[2], P.modell.feste.wortartWort.df, 1e-3, 'nur Personen: wortart df');
    } finally { r.close?.(); server.close(); }
  }, 1800000);
});
