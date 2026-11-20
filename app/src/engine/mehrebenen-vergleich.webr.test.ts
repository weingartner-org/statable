import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_R from './statable.R?raw';
import { mebDaten } from '../lib/mehrebenen';
import { mebVergleichLesen, mebVergleichAuftrag } from '../lib/mebvergleich';
import type { Spalte } from '../lib/verzeichnis';

/* Field-Stufe 2b: Gruppenmittel-Zentrierung, Wechselwirkung über die Ebenen, Modellvergleich mit ML - Kette mebDaten (TS) → sp_meb_vergleich (webR, lme4) gegen R am Mac.
 * Sollwerte: docs/fachblaetter/sollwerte/field-stufe2.json, Abschnitt mehrebenen (Skript field-stufe2.R: nlme::MathAchieve + MathAchSchool, n = 7185, 160 Schulen).
 * mSES = Gruppenmittel von SES, cSES = SES − mSES, kath = 1 bei katholischer Schule; mA: cSES + mSES + kath, mBi: + cSES:kath, mB: + zufällige Steigung für cSES (alle ML). Toleranz 1e-6 relativ
 * (lme4 mit anderem Optimierer-Lauf kann in der 6. Stelle abweichen: die Likelihood-Werte sind flach am Optimum, sie stimmen auf 1e-6 überein, die Koeffizienten auf 1e-4). */
const ordner = join(import.meta.dirname, '../../../docs/fachblaetter/sollwerte');
const soll = JSON.parse(readFileSync(join(ordner, 'field-stufe2.json'), 'utf8')).mehrebenen;
const csv = readFileSync(join(ordner, 'mathachieve.csv'), 'utf8').trim().split('\n').slice(1).map(z => z.replace(/"/g, '').split(','));
const zeilen: (string | number | null)[][] = csv.map(z => [z[0]!, Number(z[1]), Number(z[2]), z[3] === 'Catholic' ? 1 : 0]);
const sp = (name: string, extra: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {}, ...extra });
const spalten = [sp('Schule', { art: 'text', niveau: 'nominal' }), sp('Mathe'), sp('SES'), sp('kath')];
const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-9), `${was}: ${ist} gegen ${soll}`).toBeLessThan(tol);

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/lme4_2.0-1.tgz')) && existsSync(webrOrdner + '/manifest.json');

describe('Daten für den Modellvergleich (ohne R)', () => {
  const wechsel: [{ quelle: string; rolle?: 'innerhalb' | 'zwischen' }, { quelle: string }][] = [[{ quelle: 'SES', rolle: 'innerhalb' }, { quelle: 'kath' }]];
  const d = mebDaten('Mathe', 'Schule', ['SES', 'kath'], zeilen, spalten, { zentrieren: 'gruppe', wechsel });
  it('SES wird zu Abweichung vom Gruppenmittel (innerhalb) und Gruppenmittel (zwischen); kath bleibt; ein Produkt', () => {
    expect(d.praed.map(p => p.teile?.map(t => t.rolle ?? t.quelle).join('×') ?? p.name)).toEqual(['innerhalb', 'zwischen', 'kath', 'innerhalb×kath']);
    expect(d.spalten.map(c => c.name)).toEqual(['y', 'g', 'p01', 'p02', 'p03', 'p04']);
    const mean = new Map<string, number[]>(); for (const z of zeilen) mean.set(z[0] as string, [...(mean.get(z[0] as string) ?? []), z[2] as number]);
    const gm = (g: string) => { const v = mean.get(g)!; return v.reduce((a, b) => a + b, 0) / v.length; };
    zeilen.forEach((z, i) => {
      const m = gm(z[0] as string), c = (z[2] as number) - m;
      nah(Math.abs((d.spalten[2]!.werte[i] as number) - c) + 1, 1, 1e-9, 'cSES'); nah(Math.abs((d.spalten[3]!.werte[i] as number) - m) + 1, 1, 1e-9, 'mSES');
      nah(Math.abs((d.spalten[5]!.werte[i] as number) - c * (z[3] as number)) + 1, 1, 1e-9, 'cSES*kath');
    });
  });
  it('Gesamtmittel: Mittel der vollständigen Fälle wird abgezogen; unvollständige Zeilen zählen nicht', () => {
    const z2 = [['a', 1, 10, 0], ['a', 2, 20, 1], ['b', 3, 30, 0], ['b', 4, null, 1]] as (string | number | null)[][];
    const g = mebDaten('Mathe', 'Schule', ['SES'], z2, spalten, { zentrieren: 'gesamt' });
    expect(g.spalten[2]!.werte).toEqual([-10, 0, 10, null]);
  });
  it('Gruppen-Spalte mit drei Stufen geht nicht in ein Produkt; zwei Stufen als 0/1', () => {
    const sp3 = [sp('Schule', { art: 'text', niveau: 'nominal' }), sp('Mathe'), sp('SES'), sp('typ', { art: 'text', niveau: 'nominal' })];
    const z3 = [['a', 1, 1, 'x'], ['a', 2, 2, 'y'], ['b', 3, 3, 'z'], ['b', 4, 4, 'x']] as (string | number | null)[][];
    expect(mebDaten('Mathe', 'Schule', ['SES', 'typ'], z3, sp3, { wechsel: [[{ quelle: 'SES' }, { quelle: 'typ' }]] }).praed).toHaveLength(2);
    const z2s = [['a', 1, 1, 'x'], ['a', 2, 2, 'y'], ['b', 3, 3, 'y'], ['b', 4, 4, 'x']] as (string | number | null)[][];
    const m = mebDaten('Mathe', 'Schule', ['SES', 'typ'], z2s, sp3, { wechsel: [[{ quelle: 'SES' }, { quelle: 'typ' }]] });
    expect(m.praed).toHaveLength(3); expect(m.spalten[4]!.werte).toEqual([0, 2, 3, 0]);
  });
  it('Auftrag: Haupteffekte und Produkte getrennt, Steigung als Spaltenkennung', () => {
    const e = { y: 'Mathe', gruppe: 'Schule', praedOrig: ['SES', 'kath'], praed: d.praed, zentrierArt: 'gruppe' as const, zentriert: true, wechsel };
    const a = mebVergleichAuftrag(e, d.praed[0]!.name, zeilen, spalten);
    expect(a.feste).toEqual(['p01', 'p02', 'p03']); expect(a.produkte).toEqual(['p04']); expect(a.steigung).toBe('p01'); expect(a.binaer).toBe(false);
  });
});

describe.skipIf(!da)('Modellvergleich Mehrebenen in webR gegen R am Mac (braucht: bash scripts/webr-holen.sh)', () => {
  it('ICC des Nullmodells, AIC, BIC, −2LL, feste Effekte, LRT Wechselwirkung und zufällige Steigung wie lme4 (ML)', async () => {
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
    try {
      await r.init();
      await r.evalRVoid(R_START);
      await r.installPackages(['lme4', 'lmerTest'], { quiet: true });
      sh = await new r.Shelter();
      await rechne(`{ ${STATABLE_R}\nTRUE }`);
      const wechsel: [{ quelle: string; rolle?: 'innerhalb' | 'zwischen' }, { quelle: string }][] = [[{ quelle: 'SES', rolle: 'innerhalb' }, { quelle: 'kath' }]];
      const dd = mebDaten('Mathe', 'Schule', ['SES', 'kath'], zeilen, spalten, { zentrieren: 'gruppe', wechsel });
      const zahlen = (w: (number | string | null)[]) => `c(${w.map(v => (v === null ? 'NA' : String(v))).join(',')})`;
      await rechne(`{ d <- data.frame(y = ${zahlen(dd.spalten[0]!.werte)}, g = c(${dd.spalten[1]!.werte.map(v => `'${v}'`).join(',')}), ${dd.spalten.slice(2).map(c => `${c.name} = ${zahlen(c.werte)}`).join(', ')}); TRUE }`);
      const o = await rechne(`sp_meb_vergleich(d, c('p01','p02','p03'), c('p04'), 'p01')`);
      expect(o.fehler).toBeUndefined();
      const v = mebVergleichLesen(o, 'p01');
      expect(v.modelle.map(m => m.schluessel)).toEqual(['m0', 'm1', 'm2', 'm3']);
      nah(v.icc, soll.icc, 1e-6, 'icc');
      const ref = [soll.ml.m0, soll.ml.mA, undefined, soll.ml.mB];
      v.modelle.forEach((m, i) => { const q = ref[i]; if (!q) return; nah(m.aic, q[0], 1e-6, `AIC ${m.schluessel}`); nah(m.bic, q[1], 1e-6, `BIC ${m.schluessel}`); nah(m.loglik, q[2], 1e-6, `logLik ${m.schluessel}`); nah(m.minus2ll, -2 * q[2], 1e-6, `-2LL ${m.schluessel}`); });
      expect(v.tests.map(t => `${t.von}>${t.nach}`)).toEqual(['m0>m1', 'm1>m2', 'm2>m3']);
      const w = v.tests[1]!, st = v.tests[2]!;
      nah(w.chi2, soll.lrt_wechselwirkung.chi2, 1e-5, 'LRT Wechselwirkung chi2'); expect(w.df).toBe(soll.lrt_wechselwirkung.df); nah(w.p, soll.lrt_wechselwirkung.p, 1e-4, 'LRT Wechselwirkung p');
      nah(st.chi2, soll.lrt_zufaellige_steigung.chi2, 1e-4, 'LRT Steigung chi2'); expect(st.df).toBe(soll.lrt_zufaellige_steigung.df); nah(st.p, soll.lrt_zufaellige_steigung.p, 1e-4, 'LRT Steigung p');
      // feste Effekte des größten Modells: (Intercept), cSES (p01), mSES (p02), kath (p03), cSES:kath (p04)
      const f = new Map(v.fest.map(x => [x.name, x.b]));
      nah(f.get('(Intercept)')!, soll.feste_mB['(Intercept)'], 1e-4, 'Konstante'); nah(f.get('p01')!, soll.feste_mB.cSES, 1e-4, 'cSES'); nah(f.get('p02')!, soll.feste_mB.mSES, 1e-4, 'mSES');
      nah(f.get('p03')!, soll.feste_mB.kath, 1e-4, 'kath'); nah(f.get('p04')!, soll.feste_mB['cSES:kath'], 1e-4, 'cSES:kath');
      // ohne Produkte und ohne Steigung: nur m0, m1
      const o2 = await rechne(`sp_meb_vergleich(d, c('p01','p02','p03'))`);
      expect(mebVergleichLesen(o2, '').modelle.map(m => m.schluessel)).toEqual(['m0', 'm1']);
      // Fehlerfälle: Ja/Nein-Ziel, unbekannte Steigung
      expect((await rechne(`{ d2 <- d; d2$y <- rep(c(0, 1), length.out = nrow(d)); sp_meb_vergleich(d2, 'p01') }`)).fehler).toBeTruthy();
      expect((await rechne(`sp_meb_vergleich(d, 'p01', character(0), 'p02')`)).fehler).toBeTruthy();
    } finally { r.close?.(); server.close(); }
  }, 1800000);
});
