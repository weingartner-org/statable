import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rQ, rBool, rZahl } from './rsicher';
import { rZuJson, rDataFrameCode, type RSpalte } from './webr';
import ERW from '../lib/testdaten/spaeter-d2-erwartet.json';

/* Welle S-D2: Umfragerechnung (R-Paket survey) in webR gegen die Sollwerte aus R am Mac. ROTE TESTS des Prüfers (Fachblatt docs/fachblaetter/SPAETER-D2-UMFRAGEGEWICHTE.md, „Entscheidungen Opus (17.10.)“).
 * Der Bauer darf diese Datei und die JSON nicht ändern. Er baut die fünf Funktionen sp_umfrage_* in `engine/statable-umfrage.R` (eigene Datei; wird hier von der Platte gelesen) und bringt survey 4.5
 * (samt mitools, DBI) ins webR-Repo und ins Manifest (Paketaufnahme, Bauer A1). Der Vertrag (Eingabe, Ausgabe, Entscheidungen, Toleranzen) steht im Kopf von app/src/lib/umfrage.test.ts.
 * Sollwerte: scripts/spaeter-d2-erwartet.R → lib/testdaten/spaeter-d2-erwartet.json (R 4.6.1, survey 4.5; zweite Quelle Handrechnung, dritte sandwich).
 * Alle Zahlen und Texte der Antwort UNBENANNT (as.numeric/unname), sonst liefert rZuJson Objekte statt Zahlen.
 * Aufruf je Fall:  sp_umfrage_<art>(d, <Frage-Felder in der Reihenfolge des Vertrags>) mit d = data.frame aus den Spalten des Datensatzes (alles Zahlen, fehlend = NA); w/auswahl = Spaltennamen.
 * Prüft: (1) jedes Feld des Sollwerts, (2) Skalen-Invarianz (Gewichte ×0,01, ×10, auf Mittel 1 normiert → dieselben Zahlen, nur w_min/w_max skalieren), (3) keine Warnung zu nicht ganzzahligen Werten, (4) Zeilen mit Gewicht 0 im Eingabe-Frame. */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const rDatei = process.env.STATABLE_UMFRAGE_R ?? join(import.meta.dirname, 'statable-umfrage.R');   // Umgebungsvariable nur zum Ausprobieren einer anderen Fassung
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/survey_4.5.tgz')) && existsSync(join(webrOrdner, 'manifest.json'));

type Z = Record<string, any>;
const J = ERW as unknown as Z;
const FAELLE = J.faelle as Z[];
const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
const istNull = (x: any) => x == null || (Array.isArray(x) && x.length === 0) || (typeof x === 'object' && !Array.isArray(x) && (x as Z).type === 'null');
const rLit = (x: unknown): string => (x === null || x === undefined ? 'NULL' : typeof x === 'string' ? rQ(x) : typeof x === 'boolean' ? rBool(x) : Array.isArray(x) ? (x.length === 1 ? `c(${rLit(x[0])})` : `c(${x.map(rLit).join(', ')})`) : rZahl(x));   // SICHERHEIT: nur sichere Namen und endliche Zahlen (engine/rsicher.ts)

/** Spaltennamen, die eine Frage braucht. */
function spaltenVon(fr: Z): string[] {
  const n = new Set<string>();
  for (const k of ['ys', 'y', 'a', 'b', 'g']) for (const v of [fr[k]].flat()) if (typeof v === 'string') n.add(v);
  for (const v of fr.praed ?? []) n.add(v);
  n.add(fr.w); if (fr.auswahl) n.add(fr.auswahl);
  return [...n];
}
/** Aufruf-Text des Vertrags. */
function aufrufVon(art: string, fr: Z, w = fr.w): string {
  const wl = rLit(w), au = rLit(fr.auswahl ?? null);
  switch (art) {
    case 'mittel': return `sp_umfrage_mittel(d, ${rLit(fr.ys)}, ${wl}, ${au}, ${rLit(fr.mu0 ?? null)})`;
    case 'anteil': return `sp_umfrage_anteil(d, ${rLit(fr.y)}, ${wl}, ${au}, ${rLit(fr.kategorien ?? null)})`;
    case 'kreuz': return `sp_umfrage_kreuz(d, ${rLit(fr.a)}, ${rLit(fr.b)}, ${wl}, ${au})`;
    case 'gruppen': return `sp_umfrage_gruppen(d, ${rLit(fr.y)}, ${rLit(fr.g)}, ${rLit(fr.gruppen)}, ${wl}, ${au})`;
    default: return `sp_umfrage_regression(d, ${rLit(fr.y)}, ${rLit(fr.praed)}, ${rLit(!!fr.logistik)}, ${wl}, ${au})`;
  }
}
const nah = (ist: any, soll: number, tol: number, was: string) => {
  const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number');
  expect(Math.abs(i - soll) / Math.max(Math.abs(soll), 1e-12), `${was} (ist ${i}, soll ${soll})`).toBeLessThanOrEqual(tol);
};
const pNah = (ist: any, soll: number, was: string) => {
  const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet`).toBe('number');
  if (soll === 0 || i === 0) { expect(i, was).toBe(soll); return; }
  expect(Math.abs(Math.log(i / soll)), `${was} (ist ${i}, soll ${soll})`).toBeLessThan(1e-4);
};
const zeilen = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
/** Vergleicht eine R-Antwort mit dem Sollwert, Feld für Feld (rekursiv). `ohne`: Pfade, die nicht verglichen werden (z. B. bei Skalierung w_min/w_max). */
function vergleiche(ist: any, soll: any, tol: number, pfad: string, ohne: RegExp | null = null): void {
  if (ohne && ohne.test(pfad)) return;
  if (soll === null) { expect(istNull(ist), `${pfad}: null erwartet, ist ${JSON.stringify(ist)}`).toBe(true); return; }
  if (Array.isArray(soll)) {
    if (soll.length === 0) { expect(istNull(ist), `${pfad}: leere Liste erwartet`).toBe(true); return; }
    if (typeof soll[0] !== 'object') { const l = zeilen(ist); expect(l.length, `${pfad}: Länge`).toBe(soll.length); soll.forEach((v: any, k: number) => vergleiche(l[k], v, tol, `${pfad}[${k}]`, ohne)); return; }
    const l = zeilen(ist); expect(l.length, `${pfad}: Zahl der Zeilen`).toBe(soll.length); soll.forEach((v: any, k: number) => vergleiche(l[k], v, tol, `${pfad}[${k}]`, ohne)); return;
  }
  if (typeof soll === 'object') { for (const [k, v] of Object.entries(soll)) { expect(ist, `${pfad}: Objekt erwartet`).toBeTruthy(); vergleiche((ist as Z)[k], v, tol, `${pfad}.${k}`, ohne); } return; }
  if (typeof soll === 'number') {
    if (/(^|\.)(p|p_f|p_chi2)$/.test(pfad) && soll > 0 && soll < 0.1) pNah(ist, soll, pfad); else nah(ist, soll, /\.(df|ndf|n|k|treffer|ereignisse|npar|zeilen|spalten|n_zellen|leer|code|wert|gruppe1|gruppe2|gruppe|n_gruppe|zeilenstufen|spaltenstufen|mu0)$/.test(pfad) ? 1e-12 : tol, pfad); return;
  }
  expect(eins(ist), pfad).toBe(soll);
}

describe.skipIf(!da)('Welle S-D2: survey in webR gegen R am Mac (braucht: survey 4.5 im webR-Repo, engine/statable-umfrage.R)', () => {
  let server: Server; let r: any; let sh: any; let paketFehler = '';
  const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Z;
  const daten = async (name: string, spalten: RSpalte[]) => {
    const werte: Record<string, unknown> = {}, lab: Record<string, unknown> = {};
    for (const sp of spalten) { werte[sp.name] = await new r.RDouble(sp.werte.map((v: any) => (v == null ? null : Number(v)))); lab[sp.name] = await new r.RList({}); }
    const g = r.objs.globalEnv;
    await g.bind('.sp_werte', await new r.RList(werte)); await g.bind('.sp_art', await new r.RCharacter(spalten.map(s => s.art))); await g.bind('.sp_lab', await new r.RList(lab));
    await r.evalRVoid(rDataFrameCode(name, spalten) + '\nrm(.sp_werte, .sp_art, .sp_lab)');
  };
  const binde = async (f: Z, extra: Record<string, (number | null)[]> = {}) => {
    const D = J.daten[f.daten] as Z, namen = spaltenVon(f.frage).filter(n => !(n in extra));
    const sp: RSpalte[] = [...namen.map(name => ({ name, art: 'zahl' as const, werte: D.spalten[name] as (number | null)[] })), ...Object.entries(extra).map(([name, werte]) => ({ name, art: 'zahl' as const, werte }))];
    await daten('d', sp);
  };
  const lauf = async (f: Z, w?: string) => rechne(`tryCatch(${aufrufVon(f.art, f.frage, w)}, error = function(e) list(fehler = conditionMessage(e)))`);

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
    try { await r.installPackages(['survey'], { quiet: true }); await r.evalRVoid(`suppressMessages(library(survey))`); } catch (e) { paketFehler = String((e as Error)?.message ?? e); }
    sh = await new r.Shelter();
    if (existsSync(rDatei)) await rechne(`{ ${readFileSync(rDatei, 'utf8')}\nTRUE }`);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  it('survey 4.5 ist aus dem webR-Repo installierbar und die fünf Funktionen sind in engine/statable-umfrage.R definiert', async () => {
    expect(paketFehler, 'survey muss aus dem webR-Repo installierbar sein (Bauer A1)').toBe('');
    expect(existsSync(rDatei), 'engine/statable-umfrage.R fehlt').toBe(true);
    const o = await rechne(`list(v = as.character(packageVersion('survey')), m = exists('sp_umfrage_mittel'), a = exists('sp_umfrage_anteil'), k = exists('sp_umfrage_kreuz'), g = exists('sp_umfrage_gruppen'), r = exists('sp_umfrage_regression'))`);
    expect(String(eins(o.v))).toBe('4.5'); expect(['m', 'a', 'k', 'g', 'r'].map(k => eins(o[k]))).toEqual([true, true, true, true, true]);
  });

  describe('alle Fälle gegen die Sollwerte', () => {
    for (const f of FAELLE) it(`${f.id}: ${f.pflicht}`, async () => {
      await binde(f); const o = await lauf(f);
      expect(o.fehler, `R-Fehler: ${eins(o.fehler)}`).toBeUndefined();
      vergleiche(o, f.soll, f.art === 'regression' && f.frage.logistik ? 1e-5 : 1e-9, f.id);
    }, 300000);
  });

  describe('Skalen-Invarianz (P3): Gewichte ×0,01, ×10 und auf Mittel 1 normiert geben dieselben Zahlen', () => {
    for (const id of J.skalierte_faelle as string[]) {
      const f = FAELLE.find(x => x.id === id)!;
      for (const [name, fak] of [['x0,01', 0.01], ['x10', 10], ['normiert', null]] as const) it(`${id} ${name}`, async () => {
        const pw = J.daten[f.daten].spalten[f.frage.w] as number[], m = pw.reduce((a, b) => a + b, 0) / pw.length;
        await binde(f, { pw_s: pw.map(x => (fak === null ? x / m : x * fak)) }); const o = await lauf(f, 'pw_s');
        expect(o.fehler).toBeUndefined(); vergleiche(o, f.soll, f.art === 'regression' && f.frage.logistik ? 1e-5 : 1e-9, id, /\.gewicht\.(w_min|w_max)$/);
      }, 300000);
    }
  });

  describe('Zeilenregel und Warnungen', () => {
    it('Gewicht 0 in der Eingabe: die Zeilen zählen nicht (P8: n = 190, df 189) - wie gelöscht', async () => {
      const f = FAELLE.find(x => x.id === 'P8')!; await binde(f); const o = await lauf(f); const e = zeilen(o.ergebnisse)[0];
      expect(eins(e.n)).toBe(190); expect(eins(e.df)).toBe(189);
    }, 300000);
    it('logistisch: keine R-Warnung zu nicht ganzzahligen Erfolgen erscheint (quasibinomial), warnungen ist leer (P29)', async () => {
      const f = FAELLE.find(x => x.id === 'P27')!; await binde(f); const o = await lauf(f);
      expect(zeilen(o.warnungen).join(' ')).not.toMatch(/non-integer|nicht-ganzzahl|successes/i); expect(zeilen(o.warnungen).length).toBe(0);
    }, 300000);
    it('Trennung (P28): fehler_code "trennung" statt absurder Koeffizienten', async () => {
      const f = FAELLE.find(x => x.id === 'P28')!; await binde(f); const o = await lauf(f);
      expect(eins(o.fehler_code)).toBe('trennung'); expect(o.koef).toBeUndefined();
    }, 300000);
    it('Rangmangel (P26): fehler_code "rangmangel" mit der Spalte, kein stilles Weglassen', async () => {
      const f = FAELLE.find(x => x.id === 'P26')!; await binde(f); const o = await lauf(f);
      expect(eins(o.fehler_code)).toBe('rangmangel'); expect(eins(o.spalte)).toBe('ell2');
    }, 300000);
    it('Rand: Aufruf mit einer einzigen gültigen Zeile gibt fehler_code "zu-wenig", nie NaN oder eine Ausnahme', async () => {
      const f = { ...FAELLE.find(x => x.id === 'P2')!, frage: { ys: 'api00', w: 'pw', auswahl: 'nur1', mu0: null } };
      const pw = J.daten.apistrat.spalten.pw as number[]; await binde(f, { nur1: pw.map((_, i) => (i === 0 ? 1 : 0)) }); const o = await lauf(f);
      expect(o.fehler, 'keine R-Ausnahme').toBeUndefined(); const e = zeilen(o.ergebnisse)[0]; expect(eins(e.fehler_code)).toBe('zu-wenig'); expect(eins(e.n)).toBe(1);
    }, 300000);
  });
});
