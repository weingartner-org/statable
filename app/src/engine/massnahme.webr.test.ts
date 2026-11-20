import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rMotor, type RMotor } from './webr';
import { massnahmeRechnen, massnahmeVorschlagRechnen, grangerRechnen, prognoseRechnen, differenzenRechnen } from '../lib/rverfahren.svelte';
import { massnahmeLeitplanken, massnahmeHauptsatz, vorschlagUebernehmen, type MassnahmeWahl, type MassnahmeE } from '../lib/massnahme';
import { grangerWarnungen, grangerSaetze, type GrangerE } from '../lib/granger';
import type { PrognoseWahl } from '../lib/prognose';
import ERW from '../lib/testdaten/massnahme-erwartet.json';

/* „Hat die Maßnahme gewirkt?“ und Granger-Test im echten webR (Fachblatt docs/fachblaetter/MASSNAHME.md): die echten Funktionen der App (rverfahren.svelte.ts → webR → engine/statable-prognose.R:
 * `sp_massnahme`, `sp_massnahme_vorschlag`, `sp_granger`) werden mit den Sollwerten aus lib/testdaten/massnahme-erwartet.json verglichen (scripts/massnahme-erwartet.R, R 4.6.1; zweite Quelle forecast::Arima,
 * lmtest::grangertest). Toleranz 1e-6 relativ, Standardfehler und was daraus folgt (z, p, Intervalle) 1e-3. Die Sollwerte kommen nie aus dem Code der App und werden hier nicht verändert. */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'webr.mjs')) && existsSync(join(webrOrdner, 'manifest.json'));

type Wirkung = { name: string; y: number[]; m: number; log: boolean; order: number[]; seasonal: number[]; t0: number; stufe: boolean; impuls: boolean; namen: string[]; b: number[]; se: number[]; z: number[]; p: number[]; kiu: number[]; kio: number[];
  sigma2: number; aicc: number; mittel: number[]; u95: number[]; o95: number[]; ljung: { q: number; h: number; fitdf: number; p: number }; nobs: number };
type Granger = { name: string; x: number[]; y: number[]; k: number; F: number; df1: number; df2: number; p: number; n: number };
const J = ERW as unknown as { wirkung: Wirkung[]; granger: Granger[] };
const rel = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-300), `${was}: ist ${ist}, soll ${soll}`).toBeLessThanOrEqual(tol);
const wahlVon = (w: Wirkung, h = 12): MassnahmeWahl => ({ t0: w.t0, art: w.stufe && w.impuls ? 'beides' : w.impuls ? 'impuls' : 'stufe', log: w.log, p: w.order[0]!, d: w.order[1]!, q: w.order[2]!, P: w.seasonal[0]!, D: w.seasonal[1]!, Q: w.seasonal[2]!, konst: false, h });
const arima = (o: Partial<PrognoseWahl>): PrognoseWahl => ({ art: 'auto', h: 12, log: false, p: 0, d: 0, q: 0, P: 0, D: 0, Q: 0, konst: false, glaettung: 'einfach', ...o });

describe.skipIf(!da)('Maßnahme und Granger in webR gegen die Sollwerte des Fachblatts', () => {
  let server: Server; let r: any; let motor: RMotor;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const f = join(webrOrdner, 'repo', decodeURIComponent((req.url ?? '/').split('?')[0]!));
      if (!existsSync(f)) { res.statusCode = 404; res.end(); return; }
      createReadStream(f).pipe(res);
    });
    await new Promise<void>(ok => server.listen(0, ok));
    const port = (server.address() as { port: number }).port;
    const { WebR } = await import(/* @vite-ignore */ pathToFileURL(join(webrOrdner, 'webr.mjs')).href) as { WebR: new (o: object) => any };
    r = new WebR({ baseUrl: webrOrdner + '/', repoUrl: `http://localhost:${port}/`, channelType: 3 });
    await r.init(); await r.evalRVoid(R_START);
    motor = rMotor(); motor.einhaengen(r, []);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  it('vier Fälle: Parameter, Standardfehler, AICc, sigma², Prognose mit 95-%-Band und Ljung-Box gleich den Sollwerten (fit$call$xreg und newxreg stimmen, sonst wäre die Prognose falsch)', async () => {
    expect(J.wirkung.length).toBe(4);
    for (const w of J.wirkung) {
      const a = await massnahmeRechnen(w.y, w.m, wahlVon(w));
      expect(a.namen, w.name).toEqual(w.namen); expect(a.nobs, `${w.name} nobs`).toBe(w.nobs);
      w.b.forEach((v, i) => rel(a.b[i]!, v, 1e-6, `${w.name} b ${w.namen[i]}`));
      w.se.forEach((v, i) => rel(a.se[i]!, v, 1e-3, `${w.name} SE ${w.namen[i]}`));
      w.z.forEach((v, i) => rel(a.z[i]!, v, 1e-3, `${w.name} z ${w.namen[i]}`));
      w.p.forEach((v, i) => rel(a.pw[i]!, v, 1e-3, `${w.name} p ${w.namen[i]}`));
      w.kiu.forEach((v, i) => rel(a.kiu[i]!, v, 1e-3, `${w.name} KI unten ${w.namen[i]}`)); w.kio.forEach((v, i) => rel(a.kio[i]!, v, 1e-3, `${w.name} KI oben ${w.namen[i]}`));
      rel(a.sigma2!, w.sigma2, 1e-6, `${w.name} sigma²`); rel(a.aicc!, w.aicc, 1e-6, `${w.name} AICc`);
      expect(a.mittel.length, w.name).toBe(12);
      w.mittel.forEach((v, i) => rel(a.mittel[i]!, v, 1e-6, `${w.name} Prognose ${i + 1}`));
      w.u95.forEach((v, i) => rel(a.u95[i]!, v, 1e-6, `${w.name} u95 ${i + 1}`)); w.o95.forEach((v, i) => rel(a.o95[i]!, v, 1e-6, `${w.name} o95 ${i + 1}`));
      expect(a.ljung, w.name).not.toBeNull();
      rel(a.ljung!.q, w.ljung.q, 1e-6, `${w.name} Q`); expect(a.ljung!.h, `${w.name} h`).toBe(w.ljung.h); expect(a.ljung!.fitdf, `${w.name} fitdf`).toBe(w.ljung.fitdf); rel(a.ljung!.p, w.ljung.p, 1e-3, `${w.name} Ljung p`);
    }
  }, 600000);

  it('die zwei Warnungen schlagen an: Seatbelts → ljung (Q(24) = 78,06, p < ,001), Nil → nicht-tauglich (ma1 am Rand); der Satz sagt „ging … einher“, nie „bewirkte“', async () => {
    const sb = J.wirkung.find(w => w.name === 'seatbelts_stufe')!, nil = J.wirkung.find(w => w.name === 'nile_stufe_1899')!;
    const as = await massnahmeRechnen(sb.y, sb.m, wahlVon(sb)), an = await massnahmeRechnen(nil.y, nil.m, wahlVon(nil));
    const codes = (m: MassnahmeE) => massnahmeLeitplanken(m, { T: m.antwort.nobs }).map(l => l.code);
    const ms: MassnahmeE = { wahl: wahlVon(sb), antwort: as }, mn: MassnahmeE = { wahl: wahlVon(nil), antwort: an };
    expect(as.tauglich).toBe(true); expect(an.tauglich).toBe(false);
    expect(codes(ms)).toContain('ljung'); expect(codes(ms)).not.toContain('nicht-tauglich');
    expect(codes(mn)).toContain('nicht-tauglich'); expect(codes(mn)).not.toContain('ljung');
    expect(an.b[0]).toBeLessThan(-0.99);   // ma1 am Rand
    for (const [m, ein] of [[ms, 'Februar 1983'], [mn, '1899']] as const) {
      const satz = massnahmeHauptsatz(m, { name: 'x', zeit: ein });
      expect(satz).toMatch(/ging .* einher/); expect(satz).not.toMatch(/bewirk|verursach/i);
    }
  }, 600000);

  it('nur Impuls rechnet (Spalte „impuls“, newxreg mit derselben Spalte), die Konstante nur auf Wunsch und nur bei d + D = 0', async () => {
    const w = J.wirkung.find(x => x.name === 'nile_stufe_1899')!;
    const a = await massnahmeRechnen(w.y, 1, { ...wahlVon(w), art: 'impuls', p: 1, d: 0, q: 0, konst: false });
    expect(a.namen).toEqual(['ar1', 'impuls']); expect(a.mittel.length).toBe(12); expect(a.mittel.every(Number.isFinite)).toBe(true);
    const k = await massnahmeRechnen(w.y, 1, { ...wahlVon(w), art: 'stufe', p: 1, d: 0, q: 0, konst: true });
    expect(k.namen).toEqual(['ar1', 'intercept', 'stufe']); expect(k.konst).toBe(true);
    const nk = await massnahmeRechnen(w.y, 1, { ...wahlVon(w), art: 'stufe', konst: true });   // d = 1: keine Konstante, auch wenn verlangt
    expect(nk.konst).toBe(false); expect(nk.namen).toEqual(['ma1', 'stufe']);
  }, 600000);

  it('Fehler kommen als Satz, nie als Absturz: Zeitpunkt am Rand, Log mit Wert 0', async () => {
    const w = J.wirkung.find(x => x.name === 'nile_stufe_1899')!;
    await expect(massnahmeRechnen(w.y, 1, { ...wahlVon(w), t0: 1 })).rejects.toThrow(/rand|edge/i);
    await expect(massnahmeRechnen([...w.y.slice(0, 40), 0, ...w.y.slice(41)], 1, { ...wahlVon(w), log: true })).rejects.toThrow(/Log-Skala|log scale/);
  }, 600000);

  it('Modellvorschlag: gleich der Automatik der Prognose auf den Werten vor der Maßnahme; die Werte ab der Maßnahme ändern ihn nicht; er wählt nichts aus', async () => {
    const w = J.wirkung.find(x => x.name === 'nile_stufe_1899')!;
    const v = await massnahmeVorschlagRechnen(w.y, 1, w.t0, false);
    expect(v.n).toBe(w.t0 - 1); expect(v.liste.length).toBeGreaterThan(0); expect(v.liste.length).toBeLessThanOrEqual(5);
    const auto = await prognoseRechnen(w.y.slice(0, w.t0 - 1), 1, arima({ art: 'auto' }), 0);
    const k = v.liste[0]!;
    expect([k.p, v.d, k.q, k.P, v.D, k.Q]).toEqual([auto.p, auto.d, auto.q, auto.P, auto.D, auto.Q]); expect(k.konst).toBe(auto.konst); rel(k.aicc, auto.aicc!, 1e-6, 'AICc');
    // Werte ab der Maßnahme verändern: derselbe Vorschlag
    const stark = w.y.map((x, i) => (i >= w.t0 - 1 ? x * 3 + 500 : x));
    const v2 = await massnahmeVorschlagRechnen(stark, 1, w.t0, false);
    expect(v2.liste).toEqual(v.liste); expect([v2.d, v2.D, v2.kpss]).toEqual([v.d, v.D, v.kpss]);
    // übernehmen setzt nur die Ordnung; die Konstante bleibt aus
    const u = vorschlagUebernehmen({ ...wahlVon(w), p: 3, q: 3 }, v);
    expect([u.p, u.d, u.q, u.P, u.D, u.Q, u.konst]).toEqual([k.p, v.d, k.q, k.P, v.D, k.Q, false]);
    // Lücken: nur selbst wählen; Log mit Wert 0: Satz
    await expect(massnahmeVorschlagRechnen([...w.y.slice(0, 10), null, ...w.y.slice(11)], 1, w.t0, false)).rejects.toThrow(/Lücken|gaps/);
    await expect(massnahmeVorschlagRechnen([0, ...w.y.slice(1)], 1, w.t0, true)).rejects.toThrow(/Log-Skala|log scale/);
  }, 900000);

  it('Granger: vier Fälle - F, df1, df2, p und Zahl der Fälle gleich den Sollwerten; beide Richtungen in einem Aufruf', async () => {
    expect(J.granger.length).toBe(4);
    for (const g of J.granger) {
      const a = await grangerRechnen(g.x, g.y, g.k);
      rel(a.xy.F, g.F, 1e-6, `${g.name} F`); expect(a.xy.df1, `${g.name} df1`).toBe(g.df1); expect(a.xy.df2, `${g.name} df2`).toBe(g.df2); rel(a.xy.p, g.p, 1e-6, `${g.name} p`);
      expect(a.n, `${g.name} n`).toBe(g.n); expect(a.k).toBe(g.k);
    }
    // die Rückrichtung: Eier → Hühner und Hühner → Eier stehen beide in den Sollwerten
    const ei = J.granger[0]!, hu = J.granger[1]!;
    const a = await grangerRechnen(ei.x, ei.y, ei.k);
    rel(a.yx.F, hu.F, 1e-6, 'Hühner → Eier F'); expect(a.yx.df2).toBe(hu.df2); rel(a.yx.p, hu.p, 1e-6, 'Hühner → Eier p');
    // KPSS je Reihe: gleich der Differenzenprüfung (d = 0)
    const kx = (await differenzenRechnen(ei.x, 1, false, 0, 0)).kpss[0]!, ky = (await differenzenRechnen(ei.y, 1, false, 0, 0)).kpss[0]!;
    rel(a.kpssX, kx, 1e-9, 'KPSS x'); rel(a.kpssY, ky, 1e-9, 'KPSS y');
    const g: GrangerE = { antwort: a };
    expect(grangerWarnungen(g, { x: 'Eier', y: 'Hühner' }).map(x => x.code)).toContain('ursache');
    expect(grangerSaetze(g, { x: 'Eier', y: 'Hühner' }).join(' ')).not.toMatch(/verursach|bewirk/i);
  }, 600000);

  it('Granger: Lücken, unterschiedliche Länge, unter 30 Werte, konstante Reihe und k außerhalb werden zu einem Satz, nie zu einer Rechnung', async () => {
    const g = J.granger[0]!;
    await expect(grangerRechnen([...g.x.slice(0, 20), null, ...g.x.slice(21)], g.y, 3)).rejects.toThrow(/Lücken|gaps/);
    await expect(grangerRechnen(g.x.slice(0, 29), g.y.slice(0, 29), 3)).rejects.toThrow(/30/);
    await expect(grangerRechnen(g.x.map(() => 5), g.y, 3)).rejects.toThrow(/nur einen Wert|only one value/);
    await expect(grangerRechnen(g.x, g.y, 0)).rejects.toThrow(/ganze Zahl|whole number/);
    await expect(grangerRechnen(g.x, g.y, Math.floor(g.y.length / 4) + 1)).rejects.toThrow(/ganze Zahl|whole number/);
  }, 600000);
});
