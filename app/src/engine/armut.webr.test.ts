import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rMotor, type RMotor } from './webr';
import { armutRechnen } from '../lib/rverfahren.svelte';
import { armutGewaehlt, armutDaten, armutPunkte, saetzeArmut, tabellenArmut } from '../lib/armut';
import type { Spalte } from '../lib/verzeichnis';
import type { Wert } from '../lib/eingabe';
import ERW from '../lib/testdaten/index-armut-erwartet.json';

/* Armut und Ungleichheit in webR (Fachblatt Abschnitt 3, Teil 2): gewichteter Median, Schwelle, Quote, S80/S20, Gini und die Standardfehler mit survey.
 * Die Sollwerte kommen aus lib/testdaten/index-armut-erwartet.json (scripts/index-armut-erwartet.R, gegen laeken und convey geprüft) unter `armut_csv`, gehören zu lib/testdaten/eusilc-kurz.csv und nie aus dem Code der App.
 * Gerechnet wird mit der echten Funktion der App (rverfahren.svelte.ts → webR → engine/statable-armut.R). Toleranz 1e-6 relativ, Standardfehler 1e-4 relativ. */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'webr.mjs')) && existsSync(join(webrOrdner, 'manifest.json')) && existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/survey_4.5.tgz'));
const S = ERW.armut_csv;
const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-300), `${was} (ist ${ist}, soll ${soll})`).toBeLessThan(tol);

const sp = (name: string, o: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: name, art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {}, ...o });
type Sitz = { spalten: Spalte[]; zeilen: Wert[][] };
/** eusilc-kurz.csv: Einkommen, Gewicht, Klumpen (psu), Schicht. */
function csv(): Sitz {
  const zeilen = readFileSync(join(import.meta.dirname, '../lib/testdaten/eusilc-kurz.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map(z => z.split(',').map(Number) as Wert[]);
  return { spalten: ['eink', 'gew', 'psu', 'schicht'].map(n => sp(n)), zeilen };
}
/** Kleine Reihe von Einkommen und Gewichten (ohne Klumpen), für Regeln. */
const klein = (e: (number | null)[], w: number[]): Sitz => ({ spalten: [sp('e'), sp('w')], zeilen: e.map((v, i): Wert[] => [v, w[i]!]) });

describe.skipIf(!da)('Armut und Ungleichheit in webR gegen die Sollwerte (R am Mac; braucht: bash scripts/webr-holen.sh)', () => {
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
    await r.installPackages(['survey'], { quiet: true });
    await r.evalRVoid('suppressMessages(library(survey))');
    motor = rMotor(); motor.einhaengen(r, ['survey']);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  it('Schichten und Klumpen: n, Median, Schwelle, Quote mit fester Schwelle, S80/S20, Gini und beide Standardfehler (Entwurf angegeben)', async () => {
    const e = await armutRechnen('eink', 'gew', 'psu', 'schicht', csv());
    const q = armutGewaehlt(e);
    expect(e.n).toBe(S.n); expect(e.anteil).toBe(0.6);
    nah(e.median, S.median, 1e-6, 'Median'); nah(q.schwelle, S.schwelle, 1e-6, 'Schwelle'); nah(q.quote, S.quote, 1e-6, 'Quote');
    nah(q.se, S.quote_se, 1e-4, 'SE der Quote (feste Schwelle)'); nah(e.s80s20!, S.s80s20, 1e-6, 'S80/S20'); nah(e.gini!, S.gini, 1e-6, 'Gini'); nah(e.giniSe!, S.gini_se, 1e-4, 'SE des Gini');
    expect(e.klumpenN).toBeGreaterThan(1); expect(e.schichtN).toBeGreaterThan(1);
    // Die Sätze und Tabellen entstehen aus dem Ergebnis: Entwurf und feste Schwelle stehen drin
    const sz = saetzeArmut(e), text = `${sz.haupt} ${sz.zusatz} ${sz.vorsicht}`;
    expect(sz.haupt).toMatch(/feste[nr] Schwelle|fixed threshold/); expect(sz.zusatz).toMatch(/Entwurf|Design/); expect(text).toMatch(/Äquivalenzskala|equivalence scale/);
    expect(tabellenArmut(e).length).toBe(2);
  }, 600000);

  it('einzeln gezogen (ohne Klumpen und Schicht): dieselben Zahlen, die Standardfehler sind die kleineren Sollwerte', async () => {
    const e = await armutRechnen('eink', 'gew', null, null, csv());
    const q = armutGewaehlt(e);
    nah(q.quote, S.quote, 1e-6, 'Quote'); nah(e.gini!, S.gini, 1e-6, 'Gini'); nah(e.s80s20!, S.s80s20, 1e-6, 'S80/S20');
    nah(q.se, S.einfach.quote_se, 1e-4, 'SE der Quote einzeln gezogen'); nah(e.giniSe!, S.einfach.gini_se, 1e-4, 'SE des Gini einzeln gezogen');
    expect(e.klumpen).toBeNull(); expect(e.schicht).toBeNull(); expect(saetzeArmut(e).zusatz).toMatch(/einzeln gezogen|drawn individually/);
  }, 600000);

  it('die vier Schwellen (40, 50, 60, 70 %) kommen aus einem Lauf; die Schwelle ist jeweils der Anteil des Medians', async () => {
    const e = await armutRechnen('eink', 'gew', 'psu', 'schicht', csv());
    expect(e.quoten.map(x => x.anteil)).toEqual([0.4, 0.5, 0.6, 0.7]);
    for (const x of e.quoten) nah(x.schwelle, x.anteil * e.median, 1e-12, `Schwelle bei ${x.anteil}`);
    expect(e.quoten[0]!.quote).toBeLessThan(e.quoten[1]!.quote); expect(e.quoten[2]!.quote).toBeLessThan(e.quoten[3]!.quote);
  }, 600000);

  it('Quote zählt strikt unter der Schwelle (<), nicht gleich: ein Einkommen genau auf der Schwelle zählt nicht mit', async () => {
    const e = await armutRechnen('e', 'w', null, null, klein([6, 10, 10, 10, 10, 12, 14, 16], [1, 1, 1, 1, 1, 1, 1, 1]));
    const q = armutGewaehlt(e);
    expect(q.schwelle).toBe(0.6 * e.median);
    const ys = [6, 10, 10, 10, 10, 12, 14, 16], unter = ys.filter(v => v < q.schwelle).length, bis = ys.filter(v => v <= q.schwelle).length;
    expect(bis).toBeGreaterThan(unter);   // ein Wert liegt genau auf der Schwelle
    nah(q.quote, (100 * unter) / ys.length, 1e-12, 'Quote mit <');
  }, 300000);

  it('Median, Quote, Gini und S80/S20 ändern sich nicht, wenn alle Gewichte mit demselben Faktor multipliziert werden; die Einkommen skalieren den Median, nicht Quote und Gini', async () => {
    const eink = [3, 5, 8, 8, 9, 12, 15, 21, 40, 55, 80, 120].map(v => v * 100), gew = [1.5, 2, 1, 3, 2.5, 1, 4, 2, 1, 1.5, 2, 1];
    const a = await armutRechnen('e', 'w', null, null, klein(eink, gew));
    const b = await armutRechnen('e', 'w', null, null, klein(eink, gew.map(v => v * 7)));
    const c = await armutRechnen('e', 'w', null, null, klein(eink.map(v => v * 1000), gew));
    for (const x of [b, c]) { nah(armutGewaehlt(x).quote, armutGewaehlt(a).quote, 1e-9, 'Quote'); nah(x.gini!, a.gini!, 1e-9, 'Gini'); nah(x.s80s20!, a.s80s20!, 1e-9, 'S80/S20'); }
    nah(b.median, a.median, 1e-12, 'Median bei anderen Gewichten'); nah(c.median, a.median * 1000, 1e-12, 'Median bei anderen Einkommen');
  }, 300000);

  it('negatives Einkommen: nicht gelöscht, geht in Median und Quote ein, Gini und S80/S20 sind gesperrt (keine Zahl), mit Satz; eine Null sperrt nicht', async () => {
    const e = await armutRechnen('e', 'w', null, null, klein([-50, 0, 10, 20, 30, 40, 60, 80, 100, 200], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]));
    expect(e.n).toBe(10); expect(e.nullen).toBe(1); expect(e.negativ).toBe(1);
    expect(e.gini).toBeNull(); expect(e.s80s20).toBeNull(); expect(e.giniSe).toBeNull();
    expect(armutGewaehlt(e).quote).toBeGreaterThan(0);
    expect(saetzeArmut(e).zusatz).toMatch(/nicht berechnet|not calculated/);
    expect(tabellenArmut(e)[0]!.rows).toBeGreaterThan(5);
    const mitNull = await armutRechnen('e', 'w', null, null, klein([0, 10, 20, 30, 40, 60, 80, 100, 200, 300], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]));
    expect(mitNull.nullen).toBe(1); expect(mitNull.gini).not.toBeNull(); expect(mitNull.giniSe).not.toBeNull();
  }, 300000);

  it('Lücken werden nie aufgefüllt: Zeilen ohne Einkommen oder Gewicht fallen heraus und werden gezählt; Gewicht 0 geht nicht ein', async () => {
    const s = klein([10, null, 30, 40, 50, 60, 70, 80], [1, 1, 1, 2, 1, 0, 1, 1]);
    const dt = armutDaten('e', 'w', null, null, s.zeilen, s.spalten);
    expect(dt.ausgelassen).toBe(1); expect(dt.gewichtNull).toBe(1); expect(dt.n).toBe(6);
    const e = await armutRechnen('e', 'w', null, null, s);
    expect(e.n).toBe(6); expect(e.ausgelassen).toBe(1); expect(e.gewichtNull).toBe(1);
  }, 300000);

  it('Sperren vor R: negatives Gewicht, eine Spalte doppelt, ein Klumpen, Schicht mit einem Fall; unter 200 Fällen ein Hinweis', async () => {
    const neg = klein([10, 20, 30], [1, -1, 1]);
    await expect(armutRechnen('e', 'w', null, null, neg)).rejects.toThrow(/negativ|negative/);
    await expect(armutRechnen('e', 'e', null, null, klein([1, 2, 3], [1, 1, 1]))).rejects.toThrow(/verschiedene Spalten|different columns/);
    const ein: Sitz = { spalten: [sp('e'), sp('w'), sp('k')], zeilen: [[10, 1, 1], [20, 1, 1], [30, 1, 1]] };
    await expect(armutRechnen('e', 'w', 'k', null, ein)).rejects.toThrow(/nur einen Klumpen|only one cluster/);
    const duenn: Sitz = { spalten: [sp('e'), sp('w'), sp('s')], zeilen: [[10, 1, 1], [20, 1, 1], [30, 1, 2]] };
    await expect(armutRechnen('e', 'w', null, 's', duenn)).rejects.toThrow(/nur einen Fall|only one case/);
    const dt = armutDaten('e', 'w', null, null, klein([1, 2, 3, 4, 5, 6], [1, 1, 1, 1, 1, 1]).zeilen, klein([], []).spalten);
    expect(armutPunkte(dt).some(p => p.text.match(/schwanken|vary/))).toBe(true);
  }, 300000);
});
