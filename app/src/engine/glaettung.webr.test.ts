import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rMotor, type RMotor } from './webr';
import { prognoseRechnen, etsRechnen, neuRechnen } from '../lib/rverfahren.svelte';
import { neuModell, neuSperre, neuAufruf } from '../lib/modellneu';
import { mehrereRechnen, mehrereFlags, type Bauer } from '../lib/mehrere';
import { hatBand, etsKandidaten, prognoseLeitplanken, type PrognoseE, type PrognoseWahl } from '../lib/prognose';
import ERW from '../lib/testdaten/glaettung-erwartet.json';
import PROG from '../lib/testdaten/prognose-erwartet.json';

/* Glättung und Serienarbeit im echten webR (Fachblatt docs/fachblaetter/GLAETTUNG-SERIEN.md, Abschnitt 6): die echten Funktionen der App (rverfahren.svelte.ts → webR → engine/statable-glaettung.R, statable-prognose.R)
 * werden mit den Sollwerten aus lib/testdaten/glaettung-erwartet.json (scripts/glaettung-erwartet.R, R 4.6.1; Formeln gegen forecast::ets und forecast::Arima, null Abweichungen) und lib/testdaten/prognose-erwartet.json verglichen.
 * Toleranz 1e-6 relativ; Parameter und AICc 1e-5, weil optim empfindlich ist. Die Sollwerte kommen nie aus dem Code der App und werden hier nicht verändert; weicht eine Zahl ab, wird nicht die Toleranz geweitet, sondern gemeldet.
 * Gemessen wird auch die Zeit der Automatik (Ausgabe „ZEIT“ im Lauf). */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'webr.mjs')) && existsSync(join(webrOrdner, 'manifest.json'));

type Gedaempft = { name: string; y: number[]; h: number; alpha: number; beta: number; phi: number; loglik: number; aicc: number; mittel: number[]; u95: number[]; o95: number[] };
type Auto = { name: string; y: number[]; m: number; kandidaten: string[]; aicc: number[]; wahl: string; mittel: number[]; ets_wahl: string; ets_aicc: number };
type SaisonAaa = { y: number[]; m: number; alpha: number; beta: number; gamma: number; aicc: number; loglik: number; mittel: number[]; u95: number[]; o95: number[] };
type NeueDaten = { y_alt: number[]; y_neu: number[]; b: number[]; namen: string[]; loglik: number; sigma2: number; mittel: number[]; se: number[] };
const J = ERW as unknown as { gedaempft: Gedaempft[]; automatik: Auto[]; saison_aaa: SaisonAaa; neue_daten: NeueDaten };
type Prog = { y: number[]; m: number; h: number; ordnung: number[]; konst: boolean; aicc: number; mittel: number[] };
const P = PROG as unknown as Record<string, Prog>;
const rel = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-300), `${was}: ist ${ist}, soll ${soll}`).toBeLessThanOrEqual(tol);
const wahl = (o: Partial<PrognoseWahl>): PrognoseWahl => ({ art: 'auto', h: 12, log: false, p: 0, d: 0, q: 0, P: 0, D: 0, Q: 0, konst: false, glaettung: 'einfach', ...o });
const zeiten: Record<string, number> = {};
const zeit = async <T>(name: string, f: () => Promise<T>): Promise<T> => { const t0 = performance.now(); const r = await f(); zeiten[name] = Math.round(performance.now() - t0); return r; };

describe.skipIf(!da)('Glättung und Serienarbeit in webR gegen die Sollwerte des Fachblatts', () => {
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
  afterAll(() => { console.log('ZEIT (ms, einschließlich Daten binden):', JSON.stringify(zeiten)); r?.close?.(); server?.close(); });

  it('gedämpfter Trend (BJsales, austres, uspop): α, β, φ, loglik, AICc, Prognose und 95-%-Band gleich den Sollwerten; der Prüfzeitraum rechnet', async () => {
    expect(J.gedaempft.length).toBe(3);
    for (const g of J.gedaempft) {
      const a = await zeit(`gedaempft-${g.name}`, () => prognoseRechnen(g.y, 1, wahl({ art: 'glaettung', glaettung: 'gedaempft', h: g.h }), 5));
      expect(a.art).toBe('glaettung'); expect(a.ets).toBe('AAdN'); expect(a.glaettung).toBe('gedaempft');
      rel(a.alpha!, g.alpha, 1e-5, `${g.name} α`); rel(a.beta!, g.beta, 1e-5, `${g.name} β`); rel(a.phi!, g.phi, 1e-5, `${g.name} φ`);
      rel(a.loglik!, g.loglik, 1e-5, `${g.name} loglik`); rel(a.aicc!, g.aicc, 1e-5, `${g.name} AICc`);
      expect(a.mittel.length).toBe(g.h);
      g.mittel.forEach((v, i) => rel(a.mittel[i]!, v, 1e-6, `${g.name} Prognose ${i + 1}`));
      g.u95.forEach((v, i) => rel(a.u95[i]!, v, 1e-6, `${g.name} u95 ${i + 1}`)); g.o95.forEach((v, i) => rel(a.o95[i]!, v, 1e-6, `${g.name} o95 ${i + 1}`));
      expect(hatBand(a)).toBe(true); expect(a.ljung).not.toBeNull(); expect(a.pruef).not.toBeNull(); expect(a.pruef!.pr).toBe(5);
    }
  }, 600000);

  it('Warnung am Rand: austres und uspop (φ = 0,98, α nahe 1) schlagen an, BJsales nicht', async () => {
    const codes: Record<string, string[]> = {};
    for (const g of J.gedaempft) {
      const a = await prognoseRechnen(g.y, 1, wahl({ art: 'glaettung', glaettung: 'gedaempft', h: g.h }), 0);
      const w = wahl({ art: 'glaettung', glaettung: 'gedaempft', h: g.h });
      codes[g.name] = prognoseLeitplanken({ wahl: w, antwort: a, T: g.y.length, periode: 1, alleWerteUeber0: true }).map(l => l.code);
    }
    expect(codes.austres).toContain('ets-rand'); expect(codes.uspop).toContain('ets-rand'); expect(codes.bjsales).not.toContain('ets-rand');
  }, 600000);

  it('Automatik über die Glättung (AirPassengers, USAccDeaths, BJsales, WWWusage, Nil): gleiche Wahl, gleiche Reihenfolge der besten fünf, gleicher AICc, gleiche Prognose; Zeit gemessen', async () => {
    expect(J.automatik.length).toBe(5);
    for (const g of J.automatik) {
      const schritte: string[] = [];
      const a = await zeit(`automatik-${g.name}`, () => prognoseRechnen(g.y, g.m, wahl({ art: 'ets-auto', h: 12 }), 0, (f, n) => schritte.push(`${f}/${n}`)));
      const nk = etsKandidaten(g.m, g.y.length, g.y.every(v => v > 0)).length;   // R und die Liste in der Oberfläche haben dieselben Kandidaten
      expect(schritte, `${g.name} Fortschritt`).toEqual(Array.from({ length: nk + 1 }, (_, i) => `${i}/${nk}`)); expect(a.wahlEts!.geprueft).toBe(nk);
      expect(a.ets, `${g.name} Wahl`).toBe(g.wahl);
      expect(a.wahlEts, g.name).not.toBeNull();
      expect(a.wahlEts!.modelle, `${g.name} Reihenfolge`).toEqual(g.kandidaten.slice(0, 5));
      a.wahlEts!.aicc.forEach((v, i) => rel(v, g.aicc[i]!, 1e-5, `${g.name} AICc ${g.kandidaten[i]}`));
      rel(a.aicc!, g.aicc[0]!, 1e-5, `${g.name} AICc der Wahl`);
      expect(a.mittel.length).toBe(12);
      g.mittel.forEach((v, i) => rel(a.mittel[i]!, v, 1e-6, `${g.name} Prognose ${i + 1}`));
      // kein Intervall bei Fehlerart M, sonst eines
      expect(hatBand(a), `${g.name} Band`).toBe(!g.wahl.startsWith('M'));
    }
    console.log(`ZEIT Automatik über die Glättung, AirPassengers (neun Modelle): ${zeiten['automatik-air']} ms; USAccDeaths: ${zeiten['automatik-usacc']} ms; BJsales: ${zeiten['automatik-bjsales']} ms; WWWusage: ${zeiten['automatik-www']} ms; Nil: ${zeiten['automatik-nile']} ms`);
  }, 1800000);

  it('Fehlerart M: AirPassengers (MAM) bekommt kein Intervall, die Leitplanke sagt es, die Prüfliste zeigt die Automatik-Grenze; Prüfzeitraum rechnet', async () => {
    const g = J.automatik.find(x => x.name === 'air')!;
    const w = wahl({ art: 'ets-auto', h: 12 });
    const a = await zeit('air-mit-pruefzeitraum', () => prognoseRechnen(g.y, g.m, w, 12));
    expect(a.ets).toBe('MAM'); expect(a.u95).toEqual([]); expect(a.o80).toEqual([]);
    expect(a.pruef).not.toBeNull(); expect(a.pruef!.pr).toBe(12);
    const codes = prognoseLeitplanken({ wahl: w, antwort: a, T: g.y.length, periode: 12, alleWerteUeber0: true }).map(l => l.code);
    expect(codes).toContain('ets-kein-intervall'); expect(codes).toContain('ets-grenze'); expect(codes).not.toContain('holt-winters'); expect(codes).not.toContain('untergrenze');
  }, 900000);

  it('Saison additiv (USAccDeaths, ETS(A,A,A)): α, β, γ, AICc, Prognose und Band über 24 Monate gleich den Sollwerten (Intervall mit γ bei jedem 12. Schritt)', async () => {
    const g = J.saison_aaa;
    const a = await zeit('aaa', () => etsRechnen(g.y, 12, 'AAA', 24, 0));
    expect(a.ets).toBe('AAA');
    rel(a.alpha!, g.alpha, 1e-5, 'α'); rel(a.beta!, g.beta, 1e-5, 'β'); rel(a.gamma!, g.gamma, 1e-5, 'γ'); rel(a.aicc!, g.aicc, 1e-5, 'AICc'); rel(a.loglik!, g.loglik, 1e-5, 'loglik');
    expect(a.mittel.length).toBe(24);
    g.mittel.forEach((v, i) => rel(a.mittel[i]!, v, 1e-6, `Prognose ${i + 1}`));
    g.u95.forEach((v, i) => rel(a.u95[i]!, v, 1e-6, `u95 ${i + 1}`)); g.o95.forEach((v, i) => rel(a.o95[i]!, v, 1e-6, `o95 ${i + 1}`));
  }, 900000);

  it('Fehler kommen als Satz, nie als Absturz: Lücken, Wert 0 bei Fehlerart M, ein Modell außerhalb der Liste', async () => {
    const bj = J.gedaempft[0]!.y;
    await expect(prognoseRechnen([...bj.slice(0, 30), null, ...bj.slice(31)], 1, wahl({ art: 'ets-auto' }), 0)).rejects.toThrow(/Lücken|gaps/);
    await expect(prognoseRechnen([...bj.slice(0, 30), null, ...bj.slice(31)], 1, wahl({ art: 'glaettung', glaettung: 'gedaempft' }), 0)).rejects.toThrow(/Lücken|gaps/);
    await expect(etsRechnen([...bj.slice(0, 30), 0, ...bj.slice(31)], 1, 'MNM', 5, 0)).rejects.toThrow(/multiplikative/);
    await expect(etsRechnen(bj, 1, 'XYZ' as 'ANN', 5, 0)).rejects.toThrow();   // die Liste lässt nichts anderes zu: schon der Aufruf wird nicht gebaut
  }, 600000);

  it('Modell auf neue Daten (AirPassengers, log, (0,1,1)(0,1,1)12 an Daten bis Dez. 1958 geschätzt): Koeffizienten wie im Fachblatt, auf die ganze Reihe angewandt gleiche loglik, σ² und Prognose wie forecast::Arima', async () => {
    const n = J.neue_daten;
    const w = wahl({ art: 'arima', log: true, d: 1, q: 1, D: 1, Q: 1, h: 12 });
    const alt = await zeit('neu-schaetzen', () => prognoseRechnen(n.y_alt, 12, w, 0));
    n.b.forEach((v, i) => rel(alt.b[i]!, v, 1e-5, `${n.namen[i]} (Schätzung an den alten Daten)`));
    const modell = neuModell({ wahl: w, pr: 0, antwort: alt } satisfies PrognoseE)!;
    expect(modell).not.toBeNull(); expect(modell.namen).toEqual(n.namen);
    expect(neuSperre(modell, { raster: 'monatlich', periode: 12, y: n.y_neu })).toBeNull();
    const a = await zeit('neu-anwenden', () => neuRechnen(n.y_neu, 12, { ...modell, b: n.b }, 12));   // mit den Koeffizienten der Sollwerte: die Rechnung selbst ist dann unabhängig vom Optimierer
    expect(a.neu).toBe(true); expect(a.aicc).toBeNull(); expect(a.se).toEqual([]); expect(a.pruef).toBeNull();
    rel(a.loglik!, n.loglik, 1e-6, 'loglik'); rel(a.sigma2!, n.sigma2, 1e-6, 'σ²');
    expect(a.mittel.length).toBe(12);
    n.mittel.forEach((v, i) => rel(a.mittel[i]!, v, 1e-6, `Prognose ${i + 1}`));
    // Standardfehler der Prognose (auf der Log-Skala) aus dem Band zurückgerechnet
    n.se.forEach((v, i) => rel((Math.log(a.o95[i]!) - Math.log(a.mittel[i]!)) / 1.959963984540054, v, 1e-6, `SE ${i + 1}`));
    // dasselbe mit den Koeffizienten der eigenen Schätzung an den alten Daten: im Rahmen der Optimierer-Toleranz
    const b = await neuRechnen(n.y_neu, 12, modell, 12);
    rel(b.mittel[0]!, n.mittel[0]!, 1e-5, 'erste Prognose mit eigener Schätzung');
  }, 900000);

  it('Modell auf neue Daten: Drift und Mittelwert rechnen (fit$call$xreg), eine Lücke ist erlaubt, falsche Koeffizienten, zu kurze Reihe und Wert 0 bei Log werden zu Sätzen', async () => {
    const nil = J.gedaempft[0]!.y;   // BJsales
    const drift = await neuRechnen(nil, 1, { p: 1, d: 1, q: 0, P: 0, D: 0, Q: 0, konst: true, drift: true, log: false, periode: 1, namen: ['ar1', 'drift'], b: [0.3, 0.2] }, 5);
    expect(drift.drift).toBe(true); expect(drift.mittel.length).toBe(5); expect(drift.mittel.every(Number.isFinite)).toBe(true); expect(drift.namen).toEqual(['ar1', 'drift']);
    expect(drift.mittel[1]! - drift.mittel[0]!).toBeGreaterThan(0);   // die Drift steigt
    const mittel = await neuRechnen(nil, 1, { p: 1, d: 0, q: 0, P: 0, D: 0, Q: 0, konst: true, drift: false, log: false, periode: 1, namen: ['ar1', 'intercept'], b: [0.9, 230] }, 5);
    expect(mittel.namen).toEqual(['ar1', 'intercept']); expect(mittel.konst).toBe(true);
    const luecke = await neuRechnen([...nil.slice(0, 40), null, ...nil.slice(41)], 1, { p: 1, d: 1, q: 0, P: 0, D: 0, Q: 0, konst: false, drift: false, log: false, periode: 1, namen: ['ar1'], b: [0.3] }, 5);
    expect(luecke.mittel.length).toBe(5);
    await expect(neuRechnen(nil, 1, { p: 1, d: 1, q: 0, P: 0, D: 0, Q: 0, konst: false, drift: false, log: false, periode: 1, namen: ['ar1'], b: [0.3, 0.1] }, 5)).rejects.toThrow(/nicht anwenden|cannot be applied/);
    await expect(neuRechnen(nil.slice(0, 2), 1, { p: 1, d: 1, q: 0, P: 0, D: 0, Q: 0, konst: false, drift: false, log: false, periode: 1, namen: ['ar1'], b: [0.3] }, 2)).rejects.toThrow(/zu kurz|too short/);
    await expect(neuRechnen([...nil.slice(0, 40), 0, ...nil.slice(41)], 1, { p: 1, d: 1, q: 0, P: 0, D: 0, Q: 0, konst: false, drift: false, log: true, periode: 1, namen: ['ar1'], b: [0.3] }, 5)).rejects.toThrow(/Log-Skala|log scale/);
    // der Aufruf: Koeffizienten als Zahlen, nichts anderes
    expect(neuAufruf({ p: 1, d: 1, q: 0, P: 0, D: 0, Q: 0, konst: false, drift: false, log: false, periode: 1, namen: ['ar1'], b: [0.25] }, 1, 5).code).toContain('c(0.25)');
  }, 600000);

  it('Mehrere Reihen auf einmal (ldeaths, USAccDeaths): dieselbe Funktion wie die Einzelprognose, Modell, AICc und Prognose gleich den Sollwerten; eine Reihe scheitert einzeln, die anderen laufen; Fortschritt wird gemeldet', async () => {
    const ld = P.ld!, de = P.deaths!, kurz = P.air!.y.slice(0, 15);
    const reihen: Record<string, number[]> = { ld: ld.y, deaths: de.y, null: [...de.y.slice(0, 30), 0, ...de.y.slice(31)], kurz };
    const bauer: Bauer = sp => ({ ok: true, e: { raster: 'monatlich', periode: 12, erster: '1974-01-01', t: reihen[sp]!.map((_, i) => i + 1), y: reihen[sp]! } });
    const schritte: string[] = [];
    const l = await zeit('mehrere', () => mehrereRechnen({ spalten: ['ld', 'deaths', 'null', 'kurz'], h: 12, log: true }, bauer, prognoseRechnen, { fortschritt: (f, g) => schritte.push(`${f}/${g}`) }));
    expect(schritte).toEqual(['0/4', '1/4', '2/4', '3/4', '4/4']);
    expect(l.abgebrochen).toBe(false); expect(l.zeilen.map(z => z.ok)).toEqual([true, true, false, false]);
    // log: true gilt für alle; die Sollwerte ld_log und deaths_log gehören dazu
    for (const [i, k] of [[0, 'ld_log'], [1, 'deaths_log']] as const) {
      const z = l.zeilen[i]!, s = P[k]!;
      if (!z.ok) throw new Error('Zeile fehlt');
      expect([z.antwort.p, z.antwort.d, z.antwort.q, z.antwort.P, z.antwort.D, z.antwort.Q], `${k} Modell`).toEqual(s.ordnung);
      expect(z.antwort.konst, `${k} Konstante`).toBe(s.konst); rel(z.antwort.aicc!, s.aicc, 1e-5, `${k} AICc`);
      s.mittel.forEach((v, j) => rel(z.antwort.mittel[j]!, v, 1e-6, `${k} Prognose ${j + 1}`));
      expect(z.pr).toBe(12); expect(z.antwort.pruef).not.toBeNull();
    }
    const nullZ = l.zeilen[2]!, kurzZ = l.zeilen[3]!;
    expect(nullZ.ok).toBe(false); expect(kurzZ.ok).toBe(false);
    if (!nullZ.ok) expect(nullZ.grund).toEqual({ art: 'prognose', code: 'log-nicht-positiv' });
    if (!kurzZ.ok) expect(kurzZ.grund).toEqual({ art: 'prognose', code: 'zu-kurz' });
    // ohne Log: die Sollwerte ld und deaths
    const l2 = await mehrereRechnen({ spalten: ['ld', 'deaths'], h: 12, log: false }, bauer, prognoseRechnen);
    for (const [i, k] of [[0, 'ld'], [1, 'deaths']] as const) {
      const z = l2.zeilen[i]!, s = P[k]!;
      if (!z.ok) throw new Error('Zeile fehlt');
      expect([z.antwort.p, z.antwort.d, z.antwort.q, z.antwort.P, z.antwort.D, z.antwort.Q], `${k} Modell`).toEqual(s.ordnung);
      expect(z.antwort.konst, `${k} Konstante`).toBe(s.konst); rel(z.antwort.aicc!, s.aicc, 1e-5, `${k} AICc`);
      s.mittel.forEach((v, j) => rel(z.antwort.mittel[j]!, v, 1e-6, `${k} Prognose ${j + 1}`));
      expect(Array.isArray(mehrereFlags(z))).toBe(true);
    }
    // Abbruch: nach der ersten Reihe; was fertig ist, bleibt
    let n = 0;
    const ab = await mehrereRechnen({ spalten: ['ld', 'deaths'], h: 12, log: false }, bauer, prognoseRechnen, { abbruch: () => n++ >= 1 });
    expect(ab.abgebrochen).toBe(true); expect(ab.zeilen.length).toBe(1);
  }, 1800000);
});
