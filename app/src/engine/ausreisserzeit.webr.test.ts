import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rMotor, type RMotor } from './webr';
import { ausreisserRechnen } from '../lib/rverfahren.svelte';
import ERW from '../lib/testdaten/ausreisser-zeitreihe-erwartet.json';

/* „Auffällige Werte suchen“ im echten webR (scripts/ausreisser-zeitreihe-erwartet.R): die echte Funktion der App (rverfahren.svelte.ts → webR → engine/statable-prognose.R: `sp_ausreisser`) wird mit den
 * Sollwerten aus lib/testdaten/ausreisser-zeitreihe-erwartet.json verglichen (scripts/ausreisser-zeitreihe-erwartet.R, R 4.6.1, forecast; Reihen: AirPassengers, USAccDeaths, nottem, Nile, WWWusage, lynx, die Luft-Reihen
 * der Beispieldatei und zwei Reihen mit eingefügten Ausreißern). Verglichen werden Muster (erwartet), Reste, z, Streuung, Median, Ordnung, erster geprüfter Platz und die markierten Plätze.
 * Toleranz: Reste und z mit Saison (stl, deterministisch) 1e-6, ARIMA (Optimierer) 1e-3 der Streuung. Die markierten Plätze müssen gleich sein, wenn kein z näher als 1e-3 an der Schwelle liegt.
 * Die Sollwerte kommen nie aus dem Code der App und werden hier nicht verändert. */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'webr.mjs')) && existsSync(join(webrOrdner, 'manifest.json'));

type Reihe = { name: string; y: number[]; m: number; log: boolean; schwelle: number; modell: 'stl' | 'arima'; von: number; p: number; d: number; q: number; konst: boolean; rest: number[]; z: number[]; erwartet: number[]; auff: number[]; skala: number; median: number; abstand: number };
const J = ERW as unknown as { reihen: Reihe[]; eingefuegt: { saison: number[]; ar: number[] } };

describe.skipIf(!da)('Auffällige Werte in webR gegen die Sollwerte des Skripts', () => {
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

  it('alle Reihen: Muster, Reste, z, Streuung, Median, Ordnung und markierte Plätze gleich den Sollwerten', async () => {
    expect(J.reihen.length).toBe(13);
    for (const s of J.reihen) {
      const a = await ausreisserRechnen(s.y, s.m, { schwelle: s.schwelle, log: s.log });
      const tol = (s.modell === 'stl' ? 1e-6 : 1e-3) * Math.max(1, s.skala);
      expect(a.modell, s.name).toBe(s.modell); expect(a.n, s.name).toBe(s.y.length); expect(a.von, s.name).toBe(s.von);
      expect([a.p, a.d, a.q, a.konst], `${s.name} Ordnung`).toEqual([s.p, s.d, s.q, s.konst]);
      expect(a.rest.length, s.name).toBe(s.rest.length);
      s.rest.forEach((v, i) => expect(Math.abs(a.rest[i]! - v), `${s.name} Rest ${i + s.von}`).toBeLessThanOrEqual(tol));
      s.z.forEach((v, i) => expect(Math.abs(a.z[i]! - v), `${s.name} z ${i + s.von}`).toBeLessThanOrEqual(s.modell === 'stl' ? 1e-5 : 1e-2));
      s.erwartet.forEach((v, i) => expect(Math.abs(a.erwartet[i]! - v) / Math.max(1, Math.abs(v)), `${s.name} erwartet ${i + 1}`).toBeLessThanOrEqual(s.modell === 'stl' ? 1e-6 : 1e-4));
      expect(Math.abs(a.skala - s.skala) / s.skala, `${s.name} Streuung`).toBeLessThanOrEqual(s.modell === 'stl' ? 1e-6 : 1e-3);
      expect(Math.abs(a.median - s.median), `${s.name} Median`).toBeLessThanOrEqual(tol);
      if (s.abstand > 1e-3) expect(a.auff, `${s.name} markierte Plätze`).toEqual(([] as number[]).concat(s.auff));  // jsonlite schreibt einen einzelnen Platz als Zahl
    }
  }, 900000);

  it('die eingefügten Ausreißer (feste Zufallszahlen) werden gefunden, der größere zuerst', async () => {
    const sa = J.reihen.find(x => x.name === 'eingefuegt_saison')!, ar = J.reihen.find(x => x.name === 'eingefuegt_ar')!;
    const a = await ausreisserRechnen(sa.y, sa.m, { schwelle: 3.5, log: false }), b = await ausreisserRechnen(ar.y, ar.m, { schwelle: 3.5, log: false });
    for (const p of J.eingefuegt.saison) expect(a.auff).toContain(p);
    for (const p of J.eingefuegt.ar) expect(b.auff).toContain(p);
    const top = a.auff.reduce((m, p) => (Math.abs(a.z[p - 1]!) > Math.abs(a.z[m - 1]!) ? p : m), a.auff[0]!);
    expect(top).toBe(90);   // Abzug von 30 liegt weiter vom Muster als der Zuschlag von 25 an Platz 40
  }, 600000);

  it('Fehler werden Sätze, nie ein Absturz: Lücke, Log mit Wert 0, alle gleich', async () => {
    const y = J.reihen.find(x => x.name === 'nile')!.y;
    await expect(ausreisserRechnen(y.map((v, i) => (i === 10 ? null : v)), 1, { schwelle: 3.5, log: false })).rejects.toThrow(/Lücken|gaps/);
    await expect(ausreisserRechnen(y.map((v, i) => (i === 10 ? 0 : v)), 1, { schwelle: 3.5, log: true })).rejects.toThrow(/Log-Skala|log scale/);
    await expect(ausreisserRechnen(y.map(() => 7), 1, { schwelle: 3.5, log: false })).rejects.toThrow(/gleich|equal/);
  }, 300000);

  it('Einschleusen: ein Aufruf mit einer anderen Schwelle als 3, 3,5, 4 wird schon in JS abgelehnt, bevor R etwas sieht', async () => {
    await expect(ausreisserRechnen([1, 2, 3], 1, { schwelle: 1e9, log: false })).rejects.toThrow();
  });
});
