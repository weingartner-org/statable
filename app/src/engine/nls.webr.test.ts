import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rMotor, type RMotor } from './webr';
import { nlsRechnen } from '../lib/rverfahren.svelte';
import { saetzeNls, nlsWarnungen, tabellenNls, nlsRCode, NLS_FORMELN, type NlsArt } from '../lib/nls';
import type { Spalte } from '../lib/verzeichnis';
import type { Wert } from '../lib/eingabe';
import ERW from '../lib/testdaten/abschluss-erwartet.json';

/* Nichtlineare Regression mit fester Formelauswahl im echten webR (Fachblatt Abschnitt 5). Gerechnet wird mit den echten Funktionen der App (rverfahren.svelte.ts → webR → engine/statable-kurspaket.R, sp_nls).
 * Die Sollwerte kommen aus lib/testdaten/abschluss-erwartet.json (scripts/abschluss-erwartet.R, unabhängig: nlsLM und Standardfehler von Hand aus der Jacobi-Matrix) und nie aus dem Code der App.
 * Toleranz 1e-6 relativ, Standardfehler 1e-4 relativ. Daten und Startwerte stehen im JSON. */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'webr.mjs')) && existsSync(join(webrOrdner, 'manifest.json'));

type Z = Record<string, any>;
const E = ERW as unknown as { nls: Z[]; nls_kein: { x: number[]; y: number[]; ergebnis: string } };
const av = (x: unknown): number[] => (Array.isArray(x) ? (x as number[]) : [x as number]);
const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-300), `${was} (ist ${ist}, soll ${soll})`).toBeLessThan(tol);
const nahFeld = (ist: number[], soll: unknown, tol: number, was: string) => { const s = av(soll); expect(ist.length, `${was}: Länge`).toBe(s.length); s.forEach((v, i) => nah(ist[i]!, v, tol, `${was}[${i}]`)); };

/** Spalten und Zeilen einer Statable-Sitzung aus Spalten von Zahlen. */
function sitzung(cols: Record<string, (number | string | null)[]>, text: string[] = []): { spalten: Spalte[]; zeilen: Wert[][] } {
  const namen = Object.keys(cols), n = cols[namen[0]!]!.length;
  const spalten: Spalte[] = namen.map(name => ({ name, bezeichnung: name, art: text.includes(name) ? 'text' : 'zahl', niveau: text.includes(name) ? 'nominal' : 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {} }));
  const zeilen: Wert[][] = Array.from({ length: n }, (_, i) => namen.map((nm): Wert => cols[nm]![i] ?? null));
  return { spalten, zeilen };
}

describe.skipIf(!da)('Nichtlineare Regression in webR gegen die Sollwerte (R am Mac; braucht: bash scripts/webr-holen.sh)', () => {
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

  for (const soll of (ERW as unknown as { nls: Z[] }).nls) {
    it(`${soll.name} (${soll.art}): Startwerte, Parameter, SE, t, p, RSS, σ, df, AIC, Wald- und Profil-Intervall, angepasste Werte`, async () => {
      const q = sitzung({ y: av(soll.y), x: av(soll.x) });
      const e = await nlsRechnen('y', ['x'], soll.art as NlsArt, q);
      expect(e.art).toBe(soll.art);
      nahFeld(e.start, soll.start, 1e-9, 'Startwerte (genau nach start())');
      expect(e.koef.map(k => k.name)).toEqual(av(soll.namen));
      nahFeld(e.koef.map(k => k.b), soll.b, 1e-6, 'b');
      nahFeld(e.koef.map(k => k.se), soll.se, 1e-4, 'SE');
      nahFeld(e.koef.map(k => k.t), soll.t, 1e-4, 't');
      nahFeld(e.koef.map(k => k.p), soll.p, 1e-3, 'p');
      nah(e.rss, soll.rss, 1e-6, 'RSS'); nah(e.sigma, soll.sigma, 1e-6, 'σ'); expect(e.df).toBe(soll.df); nah(e.aic, soll.aic, 1e-6, 'AIC');
      nahFeld(e.koef.map(k => k.waldU), soll.ki_wald_u, 1e-4, 'Wald unten'); nahFeld(e.koef.map(k => k.waldO), soll.ki_wald_o, 1e-4, 'Wald oben');
      expect(e.profil, 'Profil-Intervall berechnet').toBe(true);
      nahFeld(e.koef.map(k => k.profilU), soll.ki_u, 1e-4, 'Profil unten'); nahFeld(e.koef.map(k => k.profilO), soll.ki_o, 1e-4, 'Profil oben');
      nahFeld(e.angepasst.slice(0, 3), soll.angepasst1, 1e-6, 'angepasste Werte');
      expect(e.n).toBe(av(soll.x).length); expect(e.ausgelassen).toBe(0);
      av(soll.y).forEach((y, i) => nah(e.rest[i]! + e.angepasst[i]!, y, 1e-9, `Rest + angepasst = y (${i})`));
    }, 300000);
  }

  it('die Zahlen des Fachblatts: Puromycin a 212,68 (6,947), b 0,0641 (0,0083), RSS 1195,449, df 10', async () => {
    const soll = E.nls[0]!;
    const e = await nlsRechnen('y', ['x'], 'michaelis', sitzung({ y: av(soll.y), x: av(soll.x) }));
    expect(e.koef[0]!.b).toBeCloseTo(212.68, 2); expect(e.koef[0]!.se).toBeCloseTo(6.947, 3); expect(e.koef[1]!.b).toBeCloseTo(0.0641, 4); expect(e.koef[1]!.se).toBeCloseTo(0.0083, 4);
    expect(e.rss).toBeCloseTo(1195.449, 3); expect(e.df).toBe(10);
  }, 300000);

  it('Scheitert die Rechnung (Gerade als Michaelis-Menten), gibt es einen Satz und nie eine Zahl', async () => {
    expect(E.nls_kein.ergebnis).toBe('fehler');   // Sollwert: nls scheitert
    const q = sitzung({ y: E.nls_kein.y, x: E.nls_kein.x });
    await expect(nlsRechnen('y', ['x'], 'michaelis', q)).rejects.toThrow(/kein Ergebnis gefunden|found no result/);
    // und die Sätze zeigen keine Zahl aus einer gescheiterten Rechnung: es gibt nur die Fehlermeldung
    try { await nlsRechnen('y', ['x'], 'michaelis', q); } catch (x) { expect((x as Error).message).not.toMatch(/\d/); }
  }, 300000);

  it('Sperren vor R: x nicht positiv bei Michaelis-Menten und Potenz, y nicht positiv bei exponentiell und logistisch, keine Formel, zwei Vorhersagen, zu wenig Fälle', async () => {
    const x = [0, 1, 2, 3, 4, 5, 6], y = [1, 2, 3, 4, 5, 6, 7], neg = [1, 2, 3, 0, 5, 6, 7];
    await expect(nlsRechnen('y', ['x'], 'michaelis', sitzung({ y, x }))).rejects.toThrow(/x/);
    await expect(nlsRechnen('y', ['x'], 'potenz', sitzung({ y, x }))).rejects.toThrow(/x/);
    await expect(nlsRechnen('y', ['x'], 'exponentiell', sitzung({ y: neg, x: [1, 2, 3, 4, 5, 6, 7] }))).rejects.toThrow(/y/);
    await expect(nlsRechnen('y', ['x'], 'logistisch', sitzung({ y: neg, x: [1, 2, 3, 4, 5, 6, 7] }))).rejects.toThrow(/y/);
    await expect(nlsRechnen('y', ['x'], '', sitzung({ y, x: [1, 2, 3, 4, 5, 6, 7] }))).rejects.toThrow(/Formel|formula/);
    await expect(nlsRechnen('y', ['x', 'z'], 'potenz', sitzung({ y, x: [1, 2, 3, 4, 5, 6, 7], z: [3, 1, 2, 5, 4, 6, 7] }))).rejects.toThrow(/genau eine|exactly one/);
    await expect(nlsRechnen('y', ['x'], 'logistisch', sitzung({ y: [1, 2, 3], x: [1, 2, 3] }))).rejects.toThrow(/Zu wenige|Too few/);
  }, 300000);

  it('Lücken fallen heraus und werden gezählt; Sätze, Tabellen und R-Text zeigen kein R² und die Warnungen sind da', async () => {
    const soll = E.nls[3]!;   // cars, Potenz
    const y = av(soll.y).map((v, i) => (i === 4 ? null : v)), x = av(soll.x).map((v, i) => (i === 9 ? null : v));
    const e = await nlsRechnen('y', ['x'], 'potenz', sitzung({ y, x }));
    expect(e.ausgelassen).toBe(2); expect(e.n).toBe(48);
    const st = saetzeNls(e, n => n);
    expect(`${st.haupt} ${st.zusatz} ${st.apa}`).not.toMatch(/R²|R2/);
    expect(st.vorsicht).toMatch(/begründet|justified/); expect(st.vorsicht).toMatch(/lokales Optimum|local optimum/); expect(st.vorsicht).toMatch(/außerhalb|outside/);
    expect(st.vorsicht).toMatch(/Näherungen|approximations/); expect(st.vorsicht).toMatch(/2 Zeilen mit einer Lücke|2 rows with a gap/);
    expect(nlsWarnungen(e).length).toBeGreaterThanOrEqual(6);
    const t = tabellenNls(e, n => n);
    expect(t.map(x => x.label)).toEqual(['NLS Koeffizienten', 'NLS Modell', 'NLS Residuen']);
    expect(JSON.stringify(t)).not.toMatch(/R²/);
    for (const a of NLS_FORMELN) expect(nlsRCode('y', 'x', a)).toMatch(/nls\(.*maxiter = 200, tol = 1e-7, minFactor = 1\/4096/);
  }, 300000);
});
