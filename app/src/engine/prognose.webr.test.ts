import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rMotor, type RMotor } from './webr';
import { prognoseRechnen } from '../lib/rverfahren.svelte';
import { prognoseStandardWahl, prognoseWahlBereinigen, pruefzeitraumLaenge, horizontStandard, type PrognoseWahl, type PrognoseAntwort } from '../lib/prognose';
import ERW from '../lib/testdaten/prognose-erwartet.json';

/* Prognose der Zeitreihen im echten webR (Fachblatt docs/fachblaetter/PROGNOSE-ARIMA.md, Abschnitt 2): die Sollwerte aus dem Fachblatt und aus lib/testdaten/prognose-erwartet.json
 * (R am Mac, forecast::auto.arima mit stepwise = FALSE, approximation = FALSE; scripts/prognose-erwartet.R) werden mit der echten Funktion der App (prognoseRechnen → webR → engine/statable-prognose.R) nachgerechnet.
 * Gemessen wird auch die Zeit der Automatik für AirPassengers (Ausgabe „ZEIT“ im Lauf). Die Sollwerte kommen nie aus dem Code der App. */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'webr.mjs')) && existsSync(join(webrOrdner, 'manifest.json'));

type Reihe = { reihe: string; log: boolean; m: number; h: number; y: number[]; ordnung: number[]; konst: boolean; aicc: number; mittel: number[]; b: number[]; bn: string[] };
const J = ERW as unknown as Record<string, Reihe>;
const AIR = J.air!.y, NIL = J.nile!.y;
const wahl = (o: Partial<PrognoseWahl>): PrognoseWahl => ({ art: 'arima', h: 12, log: false, p: 0, d: 0, q: 0, P: 0, D: 0, Q: 0, konst: false, glaettung: 'einfach', ...o });
const rund = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

describe.skipIf(!da)('Prognose in webR gegen die Sollwerte des Fachblatts und von R am Mac', () => {
  let server: Server; let r: any; let motor: RMotor;
  const zeiten: Record<string, number> = {};
  const lauf = async (name: string, y: number[], m: number, w: PrognoseWahl, pr: number): Promise<PrognoseAntwort> => {
    const t0 = performance.now();
    const a = await prognoseRechnen(y, m, prognoseWahlBereinigen(w, { raster: m === 12 ? 'monatlich' : 'jaehrlich', periode: m, y }), pr);
    zeiten[name] = Math.round(performance.now() - t0);
    return a;
  };

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
  afterAll(() => { console.log('ZEIT (ms, einschließlich Daten binden):', JSON.stringify(zeiten)); r?.close?.(); server?.close(); });

  it('AirPassengers, log, von Hand (0,1,1)(0,1,1)12: Parameter, AICc, Prognose, 95-%-Band, Ljung-Box und Prüfzeitraum wie im Fachblatt', async () => {
    const a = await lauf('air-hand', AIR, 12, wahl({ log: true, d: 1, q: 1, D: 1, Q: 1 }), pruefzeitraumLaenge(144, 12));
    expect(a.namen).toEqual(['ma1', 'sma1']);
    expect(rund(a.b[0]!, 4)).toBe(-0.4018); expect(rund(a.b[1]!, 4)).toBe(-0.5569);
    expect(rund(a.aicc!, 2)).toBe(-483.21);
    expect(a.mittel.map(v => Math.round(v)).filter((_, i) => i < 3 || i === 11)).toEqual([450, 426, 479, 477]);
    expect([Math.round(a.u95[0]!), Math.round(a.o95[0]!)]).toEqual([419, 484]);
    expect(a.ljung!.h).toBe(24); expect(a.ljung!.h - a.ljung!.fitdf).toBe(22); expect(rund(a.ljung!.q, 2)).toBe(26.45); expect(rund(a.ljung!.p, 3)).toBe(0.233);
    const p = a.pruef!;
    expect([rund(p.rmse, 2), rund(p.mae, 2), rund(p.rmseNaiv, 2), rund(p.maeNaiv, 2)]).toEqual([18.59, 13.26, 50.71, 47.83]);
    expect(p.pr).toBe(12);
    // die Grenzen kommen aus stats::predict (nicht aus forecast): 80 % liegt innerhalb von 95 %, alles um die Prognose herum und positiv (Log-Skala)
    a.mittel.forEach((m, i) => { expect(a.u95[i]!).toBeLessThan(a.u80[i]!); expect(a.u80[i]!).toBeLessThan(m); expect(m).toBeLessThan(a.o80[i]!); expect(a.o80[i]!).toBeLessThan(a.o95[i]!); expect(a.u95[i]!).toBeGreaterThan(0); });
  }, 300000);

  it('Modell ohne Saison auf einer Reihe mit Saison: einfache Regel und Ljung-Box nehmen trotzdem die Periode der Reihe, die Leitplanken schlagen an', async () => {
    const a = await lauf('air-ohne-saison', AIR, 12, wahl({ log: true, d: 1, q: 1 }), 12);
    expect(a.periode).toBe(1); expect(a.ljung!.h).toBe(24); expect(rund(a.ljung!.q, 2)).toBe(261.81); expect(a.ljung!.p).toBeLessThan(0.05);
    expect([rund(a.pruef!.rmse, 2), rund(a.pruef!.rmseNaiv, 2)]).toEqual([93.29, 50.71]);
  }, 300000);

  it('AirPassengers, log, Automatik: wählt (0,1,1)(0,1,1)12, d = 1, D = 1, KPSS ,537, Saisonstärke ,951, nächstes Modell (2,1,1)(0,1,1) mit AICc −481,79; Zeit der Automatik gemessen', async () => {
    const a = await lauf('air-auto-log', AIR, 12, wahl({ art: 'auto', log: true, konst: true }), 12);
    expect([a.p, a.d, a.q, a.P, a.D, a.Q]).toEqual([0, 1, 1, 0, 1, 1]);
    const w = a.wahl!;
    expect([w.d, w.D]).toEqual([1, 1]); expect(rund(w.kpss, 3)).toBe(0.537); expect(rund(w.staerke!, 3)).toBe(0.951);
    expect(w.liste.length).toBe(5); expect(w.geprueft).toBeGreaterThan(5);
    const n2 = w.liste[1]!; expect([n2.p, n2.q, n2.P, n2.Q, n2.konst]).toEqual([2, 1, 0, 1, false]); expect(rund(n2.aicc, 2)).toBe(-481.79);
    expect(rund(a.aicc!, 2)).toBe(-483.21);
    console.log(`ZEIT Automatik AirPassengers (log, ${w.geprueft} Modelle): ${zeiten['air-auto-log']} ms`);
  }, 600000);

  it('Nil, von Hand (1,1,1) ohne Konstante: ar1 ,254, ma1 −,874, Prognose 816, 836, 840, 842, 842, 95 % erster Schritt 541 bis 1092', async () => {
    const a = await lauf('nil-hand', NIL, 1, wahl({ h: 5, p: 1, d: 1, q: 1 }), pruefzeitraumLaenge(100, 1));
    expect(a.namen).toEqual(['ar1', 'ma1']); expect(rund(a.b[0]!, 3)).toBe(0.254); expect(rund(a.b[1]!, 3)).toBe(-0.874);
    expect(a.mittel.map(v => Math.round(v))).toEqual([816, 836, 840, 842, 842]);
    expect([Math.round(a.u95[0]!), Math.round(a.o95[0]!)]).toEqual([541, 1092]);
    expect(a.pruef!.pr).toBe(5); expect(a.periode).toBe(1);
  }, 300000);

  it('Nil, einfache Glättung: α = ,2466, Prognose 805, 95 % erster Schritt 523 bis 1087', async () => {
    const a = await lauf('nil-einfach', NIL, 1, wahl({ art: 'glaettung', h: 5, glaettung: 'einfach' }), 5);
    expect(rund(a.alpha!, 4)).toBe(0.2466); expect(a.beta).toBeNull(); expect(a.gamma).toBeNull();
    expect(Math.round(a.mittel[0]!)).toBe(805); expect([Math.round(a.u95[0]!), Math.round(a.o95[0]!)]).toEqual([523, 1087]);
  }, 300000);

  it('AirPassengers, Holt-Winters multiplikativ: α ,2756, β ,0327, γ ,8707, erste Prognose 447,06', async () => {
    const a = await lauf('air-hw-mult', AIR, 12, wahl({ art: 'glaettung', glaettung: 'mult' }), 12);
    expect([rund(a.alpha!, 4), rund(a.beta!, 4), rund(a.gamma!, 4)]).toEqual([0.2756, 0.0327, 0.8707]); expect(rund(a.mittel[0]!, 2)).toBe(447.06);
    expect(a.periode).toBe(12); expect(a.pruef).not.toBeNull();
  }, 300000);

  it('Fehler kommen als Satz, nie als Absturz: Log mit Wert 0, multiplikativ mit Wert 0, Saison zu kurz', async () => {
    const mitNull = [...NIL.slice(0, 29), 0];
    await expect(prognoseRechnen(mitNull, 1, wahl({ art: 'arima', log: true, d: 1, q: 1 }), 0)).rejects.toThrow(/Log-Skala/);
    await expect(prognoseRechnen(mitNull, 1, wahl({ art: 'glaettung', glaettung: 'mult' }), 0)).rejects.toThrow(/multiplikative/);
    await expect(prognoseRechnen(AIR.slice(0, 20), 12, wahl({ art: 'glaettung', glaettung: 'add' }), 0)).rejects.toThrow(/zu kurz|too short/);
  }, 300000);

  it('Standardwahl: Horizont und Prüfzeitraum nach den Regeln des Fachblatts (Probe an echten Reihen)', () => {
    const w = prognoseStandardWahl({ raster: 'monatlich', periode: 12, y: AIR }, true);
    expect([w.art, w.h, w.log]).toEqual(['auto', 12, true]); expect(horizontStandard(100, 1)).toBe(5);
  });

  it('20 Läufe gegen forecast::auto.arima (R am Mac): gleiches Modell, gleicher AICc, gleiche Punktprognose (Automatik, je mit und ohne Log)', async () => {
    const namen = Object.keys(J);
    expect(namen.length).toBe(20);
    for (const k of namen) {
      const s = J[k]!;
      const a = await lauf(`auto-${k}`, s.y, s.m, wahl({ art: 'auto', h: s.h, log: s.log }), 0);
      expect([a.p, a.d, a.q, a.P, a.D, a.Q], `${k}: Modell`).toEqual(s.ordnung);
      expect(a.konst, `${k}: Konstante`).toBe(s.konst);
      expect(Math.abs(a.aicc! - s.aicc), `${k}: AICc ist ${a.aicc}, soll ${s.aicc}`).toBeLessThan(1e-3 * Math.max(1, Math.abs(s.aicc)) / 100);
      s.mittel.forEach((v, i) => expect(Math.abs(a.mittel[i]! - v) / Math.abs(v), `${k}: Prognose ${i + 1}`).toBeLessThan(1e-5));
    }
  }, 3600000);
});
