import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rMotor, type RMotor } from './webr';
import { prognoseRechnen, differenzenRechnen, periodogrammRechnen } from '../lib/rverfahren.svelte';
import { pruefzeitraumLuecke, type PrognoseWahl } from '../lib/prognose';
import { zeitPacf } from '../lib/zeitreihe';
import ERW from '../lib/testdaten/zeitreihen-abrunden-erwartet.json';

/* Zeitreihen abrunden im echten webR (Fachblatt docs/fachblaetter/ZEITREIHEN-ABRUNDEN.md): Differenzen prüfen (`sp_prog_differenzen`), Periodogramm (`sp_periodogramm`) und Prognose mit Lücken
 * (`sp_prognose_arima` mit NA) laufen über die echten Funktionen der App (rverfahren.svelte.ts → webR → engine/statable-prognose.R) und werden mit den Sollwerten aus
 * lib/testdaten/zeitreihen-abrunden-erwartet.json verglichen (scripts/zeitreihen-abrunden-erwartet.R, R 4.6.1; zweite Quelle forecast/urca/Handformeln). Toleranz 1e-6 relativ, Standardfehler 1e-3. Die Sollwerte kommen nie aus dem Code der App. */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'webr.mjs')) && existsSync(join(webrOrdner, 'manifest.json'));

type Pruef = { name: string; m: number; log: boolean; d: number; D: number; y: number[]; n: number; lags: number; grenze: number; acf: number[]; pacf: number[]; kpss: number; sd: number; r1: number };
type Pgram = { name: string; y: number[]; n: number; freq: number[]; spec: number[]; spitzen_periode: number[]; spitzen_anteil: number[] };
type Luecke = { name: string; y: (number | null)[]; m: number; log: boolean; order: number[]; seasonal: number[]; konst: boolean; drift: boolean; nobs: number; b: number[]; bn: string[]; se: number[]; aicc: number; loglik: number; sigma2: number; mittel: number[]; u95: number[]; o95: number[]; rmse: number; mae: number };
const J = ERW as unknown as { pruefung: Pruef[]; periodogramm: Pgram[]; luecken: Luecke[]; ljung_luecken: { q: number; h: number; fitdf: number; p: number; n: number }; korrelogramm_luecken: { acf: number[]; pacf: number[]; grenze: number; n: number }; pruefzeit_luecken: { pr: number; rmse: number; mae: number; rmse_naiv: number; mae_naiv: number } };
const rel = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-9), `${was}: ist ${ist}, soll ${soll}`).toBeLessThanOrEqual(tol);
const abs = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll), `${was}: ist ${ist}, soll ${soll}`).toBeLessThanOrEqual(tol);
const wahl = (o: Partial<PrognoseWahl>): PrognoseWahl => ({ art: 'arima', h: 12, log: false, p: 0, d: 0, q: 0, P: 0, D: 0, Q: 0, konst: false, glaettung: 'einfach', ...o });

describe.skipIf(!da)('Zeitreihen abrunden in webR gegen die Sollwerte des Fachblatts', () => {
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

  it('Differenzen prüfen: acht Fälle - KPSS, Streuung, r1, n, ACF, PACF, Grenze und Verzögerungen gleich den Sollwerten', async () => {
    expect(J.pruefung.length).toBe(8);
    for (const p of J.pruefung) {
      const a = await differenzenRechnen(p.y, p.m, p.log, p.d, p.D);
      rel(a.kpss[p.d]!, p.kpss, 1e-6, `${p.name} KPSS`); rel(a.sd[p.d]!, p.sd, 1e-6, `${p.name} Streuung`); rel(a.r1[p.d]!, p.r1, 1e-6, `${p.name} r1`);
      expect(a.nZeile[p.d], `${p.name} n`).toBe(p.n); expect(a.n, `${p.name} n`).toBe(p.n); expect(a.lags, `${p.name} Lags`).toBe(p.lags); rel(a.grenze, p.grenze, 1e-9, `${p.name} Grenze`);
      expect(a.acf.length).toBe(p.acf.length); expect(a.pacf, `${p.name} PACF vorhanden`).not.toBeNull();
      p.acf.forEach((v, i) => abs(a.acf[i]!, v, 1e-9, `${p.name} ACF ${i + 1}`)); p.pacf.forEach((v, i) => abs(a.pacf![i]!, v, 1e-9, `${p.name} PACF ${i + 1}`));
      // die PACF kommt zweimal zustande (R und JavaScript aus der ACF): beide gleich
      zeitPacf(a.acf)!.forEach((v, i) => abs(v, p.pacf[i]!, 1e-9, `${p.name} zeitPacf ${i + 1}`));
    }
  }, 600000);

  it('Differenzen prüfen: die Zeilen für d = 0, 1, 2 beim gewählten D (log Air, D = 0) stehen alle da; Saisonstärke bei m = 12 hoch, bei m = 1 nicht bestimmt', async () => {
    const air = J.pruefung.find(p => p.name === 'air_log_10')!;
    const a = await differenzenRechnen(air.y, 12, true, 1, 0);
    const soll = ['air_log_00', 'air_log_10', 'air_log_20'].map(n => J.pruefung.find(p => p.name === n)!);
    soll.forEach((p, k) => { rel(a.kpss[k]!, p.kpss, 1e-6, `KPSS d=${k}`); rel(a.sd[k]!, p.sd, 1e-6, `Streuung d=${k}`); rel(a.r1[k]!, p.r1, 1e-6, `r1 d=${k}`); });
    expect(a.staerke).not.toBeNull(); expect(a.staerke!).toBeGreaterThan(0.64); expect(a.staerke!).toBeLessThan(1);
    const nil = J.pruefung.find(p => p.name === 'nile_10')!;
    expect((await differenzenRechnen(nil.y, 1, false, 1, 0)).staerke).toBeNull();
  }, 300000);

  it('Differenzen prüfen mit Lücken: KPSS und Saisonstärke fehlen (null), ACF und PACF aus den vorhandenen Paaren gleich dem Sollwert; Log mit Wert 0 wird ein Satz', async () => {
    const k = J.korrelogramm_luecken, air5 = J.luecken.find(l => l.name === 'air5_log')!;
    const a = await differenzenRechnen(air5.y, 12, true, 1, 1);
    expect(a.kpss).toEqual([null, null, null]); expect(a.staerke).toBeNull();
    expect(a.n).toBe(k.n); expect(a.lags).toBe(24); rel(a.grenze, k.grenze, 1e-9, 'Grenze');
    expect(a.sd.every(v => v !== null && v > 0)).toBe(true);
    k.acf.forEach((v, i) => abs(a.acf[i]!, v, 1e-9, `ACF ${i + 1}`)); expect(a.pacf).not.toBeNull(); k.pacf.forEach((v, i) => abs(a.pacf![i]!, v, 1e-9, `PACF ${i + 1}`));
    await expect(differenzenRechnen([...air5.y.slice(0, 20), 0, 5], 12, true, 1, 1)).rejects.toThrow(/Log-Skala|log scale/);
  }, 300000);

  it('Periodogramm: vier Reihen - Frequenzen j/n, Spektrum, Perioden und Anteile der drei größten Spitzen gleich den Sollwerten (fast = FALSE)', async () => {
    expect(J.periodogramm.length).toBe(4);
    for (const p of J.periodogramm) {
      const a = await periodogrammRechnen(p.y);
      expect(a.n, p.name).toBe(p.n); expect(a.freq.length).toBe(p.freq.length);
      p.freq.forEach((f, i) => { abs(a.freq[i]!, f, 1e-12, `${p.name} Frequenz ${i + 1}`); abs(a.freq[i]!, (i + 1) / p.n, 1e-12, `${p.name} Frequenz j/n`); });
      p.spec.forEach((v, i) => rel(a.spec[i]!, v, 1e-6, `${p.name} Spektrum ${i + 1}`));
      expect(a.spitzen.length, p.name).toBe(3);
      p.spitzen_periode.forEach((v, i) => rel(a.spitzen[i]!.periode, v, 1e-6, `${p.name} Periode ${i + 1}`)); p.spitzen_anteil.forEach((v, i) => rel(a.spitzen[i]!.anteil, v, 1e-6, `${p.name} Anteil ${i + 1}`));
    }
    // Zahlen des Fachblatts, gerundet
    const rund = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;
    const air = await periodogrammRechnen(J.periodogramm[0]!.y); expect(air.spitzen.map(s => rund(s.periode, 3))).toEqual([12, 6, 3]); expect(air.spitzen.map(s => rund(s.anteil, 4))).toEqual([0.5911, 0.1758, 0.0301]);
    const sin = await periodogrammRechnen(J.periodogramm[2]!.y); expect(rund(sin.spitzen[0]!.periode, 3)).toBe(17.143); expect(rund(sin.spitzen[0]!.anteil, 4)).toBe(0.9572);
  }, 300000);

  it('Periodogramm: Lücken und unter 20 Werte werden zu einem Satz, nie zu einer Rechnung', async () => {
    const y = J.periodogramm[3]!.y;
    await expect(periodogrammRechnen([...y.slice(0, 40), null, ...y.slice(41, 60)])).rejects.toThrow(/Lücken|gaps/);
    await expect(periodogrammRechnen(y.slice(0, 19))).rejects.toThrow(/20/);
  }, 300000);

  it('Prognose mit Lücken: vier Fälle - Koeffizienten, Standardfehler (1e-3), AICc, erste Prognose mit 95-%-Band, RMSE, Zahl der Werte gleich den Sollwerten', async () => {
    expect(J.luecken.length).toBe(4);
    for (const l0 of J.luecken) {
      // jsonlite schreibt Vektoren der Länge 1 als einzelne Zahl bzw. einzelnen Text
      const l = { ...l0, b: [l0.b].flat(), bn: [l0.bn].flat(), se: [l0.se].flat() };
      expect(l.y.some(v => v === null), l.name).toBe(true);
      const o = l.order, S = l.seasonal;
      const a = await prognoseRechnen(l.y, l.m, wahl({ log: l.log, h: 12, p: o[0]!, d: o[1]!, q: o[2]!, P: S[0]!, D: S[1]!, Q: S[2]!, konst: l.konst }), 0);
      expect(a.namen, l.name).toEqual(l.bn); expect(a.drift, l.name).toBe(l.drift);
      l.b.forEach((v, i) => rel(a.b[i]!, v, 1e-6, `${l.name} ${l.bn[i]}`)); l.se.forEach((v, i) => rel(a.se[i]!, v, 1e-3, `${l.name} SE ${l.bn[i]}`));
      rel(a.aicc!, l.aicc, 1e-6, `${l.name} AICc`); expect(a.nobs, `${l.name} nobs`).toBe(l.nobs);
      rel(a.mittel[0]!, l.mittel[0]!, 1e-6, `${l.name} Prognose 1`); rel(a.u95[0]!, l.u95[0]!, 1e-6, `${l.name} u95`); rel(a.o95[0]!, l.o95[0]!, 1e-6, `${l.name} o95`);
      a.mittel.forEach((v, i) => rel(v, l.mittel[i]!, 1e-6, `${l.name} Prognose ${i + 1}`));
      rel(a.rmse!, l.rmse, 1e-6, `${l.name} RMSE`); rel(a.mae!, l.mae, 1e-6, `${l.name} MAE`);
      expect(a.pruef, `${l.name}: ohne Prüfzeitraum angefragt`).toBeNull();
    }
  }, 600000);

  it('Prognose mit Lücken: Ljung-Box zählt nur vorhandene Residuen (Air mit 5 NA: Q(24) = 22,208, df 22)', async () => {
    const l = J.luecken.find(x => x.name === 'air5_log')!, lj = J.ljung_luecken;
    const a = await prognoseRechnen(l.y, 12, wahl({ log: true, d: 1, q: 1, D: 1, Q: 1 }), 0);
    expect(a.ljung!.h).toBe(lj.h); expect(a.ljung!.fitdf).toBe(lj.fitdf); expect(a.ljung!.h - a.ljung!.fitdf).toBe(22);
    rel(a.ljung!.q, lj.q, 1e-6, 'Q'); rel(a.ljung!.p, lj.p, 1e-6, 'p');
  }, 300000);

  it('Prüfzeitraum mit Lücken: Nil (Lücken früher) wird gerechnet und gleicht dem Sollwert; Air (Lücke 130 im Vergleichsjahr) entfällt', async () => {
    const nil = J.luecken.find(x => x.name === 'nile3')!, p = J.pruefzeit_luecken;
    expect(pruefzeitraumLuecke(nil.y, 1, 5)).toBe(false);
    const a = await prognoseRechnen(nil.y, 1, wahl({ h: 5, p: 1, d: 1, q: 1 }), 5);
    expect(a.pruef).not.toBeNull(); expect(a.pruef!.pr).toBe(p.pr);
    rel(a.pruef!.rmse, p.rmse, 1e-6, 'RMSE'); rel(a.pruef!.mae, p.mae, 1e-6, 'MAE'); rel(a.pruef!.rmseNaiv, p.rmse_naiv, 1e-6, 'RMSE einfache Regel'); rel(a.pruef!.maeNaiv, p.mae_naiv, 1e-6, 'MAE einfache Regel');
    const air = J.luecken.find(x => x.name === 'air5_log')!;
    expect(pruefzeitraumLuecke(air.y, 12, 12)).toBe(true);
    const b = await prognoseRechnen(air.y, 12, wahl({ log: true, d: 1, q: 1, D: 1, Q: 1 }), 12);
    expect(b.pruef).toBeNull();
  }, 300000);

  it('Prognose mit Lücken: Automatik und Glättung werden ein Satz mit Grund, nie eine Rechnung; mit Wert 0 und Log ein Satz', async () => {
    const nil = J.luecken.find(x => x.name === 'nile3')!;
    await expect(prognoseRechnen(nil.y, 1, wahl({ art: 'auto' }), 0)).rejects.toThrow(/KPSS, STL und HoltWinters/);
    await expect(prognoseRechnen(nil.y, 1, wahl({ art: 'glaettung', glaettung: 'einfach' }), 0)).rejects.toThrow(/KPSS, STL und HoltWinters/);
    await expect(prognoseRechnen([...nil.y.slice(0, 29), 0], 1, wahl({ log: true, d: 1, q: 1 }), 0)).rejects.toThrow(/Log-Skala/);
  }, 300000);
});
