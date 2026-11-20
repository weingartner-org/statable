import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_R from './statable.R?raw';

/* Pfadmodell (S-J S1, 23.10.2026): sp_pfad in webR (lavaan 0.6-21). Prüfung gegen R-Grundregeln im selben Lauf: die Koeffizienten einer Regressionsgleichung sind die der kleinsten Quadrate (lm), das R² je Ziel
 * ist das von lm, ein indirekter Effekt ist das Produkt der Koeffizienten, der Gesamteffekt direkt + indirekt. Daten: 150 Fälle, v1 → v2 → v3 → v4 und v1 → v3 (set.seed(6)). */
const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/lavaan_0.6-21.tgz')) && existsSync(webrOrdner + '/manifest.json');

describe.skipIf(!da)('Pfadmodell in webR (braucht: bash scripts/webr-holen.sh)', () => {
  it('Koeffizienten wie lm, indirekte Effekte als Produkte, Fit und Fehlerfälle', async () => {
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
    const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-9), was).toBeLessThan(tol);
    try {
      await r.init();
      await r.evalRVoid(R_START);
      await r.installPackages(['lavaan'], { quiet: true });
      sh = await new r.Shelter();
      await rechne(`{ ${STATABLE_R}\nTRUE }`);
      await rechne(`{ set.seed(6); n <- 150; v1 <- rnorm(n); v2 <- 0.5*v1 + rnorm(n, 0, .8); v3 <- 0.4*v2 + 0.3*v1 + rnorm(n, 0, .8); v4 <- 0.5*v3 + rnorm(n, 0, .9); d <- data.frame(v1, v2, v3, v4); TRUE }`);
      const o = await rechne(`sp_pfad(d, list(v2 = 'v1', v3 = c('v1', 'v2'), v4 = 'v3'))`);
      expect(o.fehler).toBeUndefined();
      const ref = await rechne(`{ a <- coef(lm(v2 ~ v1, d)); b <- coef(lm(v3 ~ v1 + v2, d)); c4 <- coef(lm(v4 ~ v3, d)); list(a = a[['v1']], b1 = b[['v1']], b2 = b[['v2']], c = c4[['v3']], r2 = c(summary(lm(v2 ~ v1, d))$r.squared, summary(lm(v3 ~ v1 + v2, d))$r.squared, summary(lm(v4 ~ v3, d))$r.squared)) }`);
      const est: Record<string, number> = {}; o.von.forEach((v: string, i: number) => { est[`${v}>${o.nach[i]}`] = o.est[i]; });
      nah(est['v1>v2']!, ref.a, 1e-6, 'a'); nah(est['v1>v3']!, ref.b1, 1e-6, 'b1'); nah(est['v2>v3']!, ref.b2, 1e-6, 'b2'); nah(est['v3>v4']!, ref.c, 1e-6, 'c');
      o.r2.forEach((v: number, i: number) => nah(v, ref.r2[i], 1e-6, `r2[${i}]`));
      const eff: Record<string, number> = {}; o.eff_pfad.forEach((p: string, i: number) => { eff[p] = o.eff_est[i]; });
      nah(eff['v1>v2>v3']!, eins(ref.a) * eins(ref.b2), 1e-6, 'v1>v2>v3'); nah(eff['v2>v3>v4']!, eins(ref.b2) * eins(ref.c), 1e-6, 'v2>v3>v4'); nah(eff['v1>v2>v3>v4']!, eins(ref.a) * eins(ref.b2) * eins(ref.c), 1e-6, 'v1>v2>v3>v4');
      expect(Object.keys(eff).sort().join('|')).toContain('v1>v3'); nah(eff['v1>v3']!, eins(ref.b1) + eins(ref.a) * eins(ref.b2), 1e-6, 'Gesamteffekt v1>v3');
      expect(o.eff_art.filter((a: string) => a === 'total').length).toBe(3); expect(eins(o.df)).toBe(2);
      // latente Faktoren: der standardisierte Pfad F1 → F2 ist die Faktorkorrelation der CFA
      await rechne(`{ set.seed(9); n <- 300; f1 <- rnorm(n); f2 <- 0.5*f1 + rnorm(n, 0, .85); mk <- function(f, l) l*f + rnorm(n, 0, .6); dl <- data.frame(v1 = mk(f1, .8), v2 = mk(f1, .7), v3 = mk(f1, .6), v4 = mk(f2, .8), v5 = mk(f2, .7), v6 = mk(f2, .65)); TRUE }`);
      const lat = await rechne(`sp_pfad(dl, list(F2 = 'F1'), faktoren = list(F1 = c('v1', 'v2', 'v3'), F2 = c('v4', 'v5', 'v6')))`);
      expect(lat.fehler).toBeUndefined();
      const cfa = await rechne(`{ c <- lavaan::cfa('F1 =~ v1 + v2 + v3\nF2 =~ v4 + v5 + v6', data = dl); s <- lavaan::standardizedSolution(c); list(r = s[s$op == '~~' & s$lhs == 'F1' & s$rhs == 'F2', 'est.std'], ld = s[s$op == '=~', 'est.std']) }`);
      nah(eins(lat.std), eins(cfa.r), 1e-5, 'Pfad F1 > F2 = Faktorkorrelation'); expect(eins(lat.df)).toBe(8); expect(lat.last_item.length).toBe(6);
      lat.last_std.forEach((x: number, i: number) => nah(x, cfa.ld[i], 1e-5, `Ladung ${i}`));
      // Bootstrap (S3): Perzentilintervall der indirekten Effekte; Schätzwerte unverändert, Grenzen umschließen die Schätzung und liegen nah am Delta-Intervall
      const bt = await rechne(`sp_pfad(d, list(v2 = 'v1', v3 = c('v1', 'v2'), v4 = 'v3'), boot = 200L)`);
      expect(bt.fehler).toBeUndefined(); expect(eins(bt.boot)).toBe(200); expect(bt.eff_est.length).toBe(o.eff_est.length);
      bt.eff_est.forEach((x: number, i: number) => { nah(x, o.eff_est[i], 1e-6, `Boot-Schätzwert ${i}`); expect(bt.eff_lo[i]).toBeLessThan(x); expect(bt.eff_hi[i]).toBeGreaterThan(x);
        const breite = o.eff_hi[i] - o.eff_lo[i]; expect(Math.abs((bt.eff_hi[i] - bt.eff_lo[i]) - breite) / breite, `Boot-Breite ${i}`).toBeLessThan(0.5); });
      // Modellvergleich (S3): Pfad v1 > v3 auf 0 setzen; Chi-Quadrat-Differenz wie lavTestLRT, df-Differenz 1
      const vg = await rechne(`sp_pfad(d, list(v2 = 'v1', v3 = c('v1', 'v2'), v4 = 'v3'), nullpfade = list(v3 = 'v1'))`);
      expect(vg.fehler).toBeUndefined(); expect(vg.vergleich).not.toBeNull();
      const rv = await rechne(`{ f1 <- lavaan::sem('v2 ~ v1\nv3 ~ v1 + v2\nv4 ~ v3', data = d, fixed.x = TRUE); f0 <- lavaan::sem('v2 ~ v1\nv3 ~ 0*v1 + v2\nv4 ~ v3', data = d, fixed.x = TRUE); a <- lavaan::lavTestLRT(f1, f0); list(dchi = a[['Chisq diff']][2], ddf = a[['Df diff']][2], p = a[['Pr(>Chisq)']][2]) }`);
      nah(eins(vg.vergleich.dchisq), eins(rv.dchi), 1e-6, 'Delta-Chi'); expect(eins(vg.vergleich.ddf)).toBe(eins(rv.ddf)); nah(eins(vg.vergleich.p), eins(rv.p), 1e-5, 'p der Differenz'); expect(eins(vg.vergleich.k)).toBe(1);
      // Fehlerfälle
      const z = await rechne(`sp_pfad(d, list(v2 = 'v1', v1 = 'v2'))`); expect(eins(z.fehler)).toBe('cycle');
      const sl = await rechne(`sp_pfad(d, list(v2 = 'v2'))`); expect(eins(sl.fehler)).toBe('self loop');
    } finally { r.close?.(); server.close(); }
  }, 900000);
});
const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
