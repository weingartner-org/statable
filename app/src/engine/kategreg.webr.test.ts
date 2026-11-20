import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson, rDataFrameCode, type RSpalte } from './webr';
import STATABLE_R from './statable.R?raw';
import ERW from '../lib/testdaten/welle3-erwartet.json';
import { katDaten, type RAufruf, ordAufruf, ordLesen, multAufruf, multLesen, zaehlAufruf, zaehlLesen, katFehlerText, type KatDaten } from '../lib/kategreg';
import type { Spalte } from '../lib/verzeichnis';
import type { Wert } from '../lib/eingabe';

/* Zusammenspiel TS → R → TS für Welle 3 (lib/kategreg.ts): Daten aus der Statable-Sitzung (Spalten mit Wertebeschriftungen, Umlaute in den Stufen),
 * R-Aufruf wie rverfahren.svelte.ts, Antwort gelesen. Die Zahlen stammen aus den Sollwerten von engine/welle3.webr.test.ts (scripts/welle3-erwartet.R, Venables & Ripley 2002). */
const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/nnet_7.3-21.tgz')) && existsSync(join(webrOrdner, 'manifest.json'));

type Z = Record<string, any>;
type DS = { n: number; spalten: Record<string, { typ: 'zahl' | 'gruppe'; werte: (number | null)[]; labels?: string[] }> };
const E = ERW as unknown as { datensaetze: Record<string, DS>; ordinal: Z[]; multinomial: Z[]; zaehldaten: Z[] };
const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-3), `${was} (ist ${ist}, soll ${soll})`).toBeLessThan(tol);

/** Datensatz aus dem JSON als Statable-Sitzung: Gruppen als Zahlen mit Wertebeschriftungen (Niveau nominal), `umbenennen` ersetzt Beschriftungen einer Spalte, `ordinal` markiert Spalten als ordinal. */
function sitzung(ds: string, o: { umbenennen?: Record<string, string[]>; ordinal?: string[] } = {}): { spalten: Spalte[]; zeilen: Wert[][] } {
  const D = E.datensaetze[ds]!, namen = Object.keys(D.spalten);
  const spalten: Spalte[] = namen.map(name => {
    const s = D.spalten[name]!, labels = o.umbenennen?.[name] ?? s.labels;
    return { name, bezeichnung: name, art: 'zahl', niveau: o.ordinal?.includes(name) ? 'ordinal' : s.typ === 'gruppe' ? 'nominal' : 'metrisch', format: '', fehlend: [], fehlendText: '',
      werteLabels: s.typ === 'gruppe' ? Object.fromEntries(labels!.map((l, i) => [String(i + 1), l])) : {} };
  });
  const zeilen: Wert[][] = Array.from({ length: D.n }, (_, i) => namen.map((n): Wert => D.spalten[n]!.werte[i] ?? null));
  return { spalten, zeilen };
}

describe.skipIf(!da)('Welle 3: Daten aus der Sitzung, R-Aufruf und Antwort (braucht: bash scripts/webr-holen.sh)', () => {
  let server: Server; let r: any; let sh: any;
  const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Z;
  const daten = async (spalten: RSpalte[]) => {
    const werte: Record<string, unknown> = {}, lab: Record<string, unknown> = {};
    for (const sp of spalten) {
      werte[sp.name] = sp.art === 'text' ? await new r.RCharacter(sp.werte.map((v: any) => (v == null ? null : String(v)))) : await new r.RDouble(sp.werte.map((v: any) => (v == null ? null : Number(v))));
      lab[sp.name] = sp.art === 'faktor' && sp.labels
        ? await new r.RList({ wert: await new r.RDouble(sp.labels.map(l => Number(l.wert))), label: await new r.RCharacter(sp.labels.map(l => l.label)) })
        : await new r.RList({});
    }
    const g = r.objs.globalEnv;
    await g.bind('.sp_werte', await new r.RList(werte)); await g.bind('.sp_art', await new r.RCharacter(spalten.map(s => s.art))); await g.bind('.sp_lab', await new r.RList(lab));
    await r.evalRVoid(rDataFrameCode('d', spalten) + '\nrm(.sp_werte, .sp_art, .sp_lab)');
  };
  /** Wie RMotor.rechne: Text aus den Daten (Zielstufen, Referenz) wird als `.sp_arg` gebunden, nie in den Code geschrieben. */
  const lauf = async (dt: KatDaten, aufruf: RAufruf) => {
    await daten(dt.spalten);
    const liste: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(aufruf.args)) liste[k] = await new r.RCharacter(Array.isArray(v) ? v : [v]);
    await r.objs.globalEnv.bind('.sp_arg', await new r.RList(liste));
    return rechne(aufruf.code);
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
    await r.installPackages(['MASS', 'nnet'], { quiet: true });
    sh = await new r.Shelter();
    await rechne(`{ ${STATABLE_R}\nTRUE }`);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  const PRAED = ['Infl', 'Type', 'Cont'];
  const UMLAUT = ['niedrig', 'mäßig', 'hoch'];   // Low, Medium, High mit Umlaut: darf den Aufruf nicht stören

  it('ordinal: Ziel mit Wertebeschriftungen in Statable-Ordnung, Umlaute, Koeffizienten nach Prädiktor und Stufe, Brant gelesen', async () => {
    const { spalten, zeilen } = sitzung('housing', { umbenennen: { Sat: UMLAUT }, ordinal: ['Sat'] });
    const dt = katDaten('ordreg', 'Sat', PRAED, zeilen, spalten);
    expect(dt.stufen).toEqual(UMLAUT);
    const antwort = await lauf(dt, ordAufruf(dt));
    expect(antwort.fehler, `R-Fehler: ${antwort.fehler}`).toBeUndefined();
    const o = ordLesen(antwort, dt), f = E.ordinal.find(x => x.name === 'a_housing')!;
    expect(o.stufen).toEqual(UMLAUT); expect(o.n).toBe(1681); expect(o.stufenN.reduce((a, b) => a + b, 0)).toBe(1681);
    const k = o.koef.find(x => x.pIdx === 0 && x.stufe === 'High')!;
    nah(k.b, 1.28881908845857, 1e-6, 'Infl High (V&R 2002)'); nah(k.effekt, Math.exp(1.28881908845857), 1e-6, 'OR');
    expect(o.koef.filter(x => x.pIdx === 1).map(x => x.stufe)).toEqual(['Apartment', 'Atrium', 'Terrace']);
    expect(o.lr.map(l => [l.pIdx, l.df])).toEqual([[0, 2], [1, 3], [2, 1]]);
    nah(o.nagelkerke, f.pseudo_r2.nagelkerke, 1e-6, 'Nagelkerke');
    expect(o.brant, 'Brant prüfbar').not.toBeNull(); nah(o.brant!.gesamt.chi2, f.brant_soll.gesamt.chi2, 1e-5, 'Brant gesamt'); expect(o.brant!.praed.map(z => z.pIdx)).toEqual([0, 1, 2]);
    expect(o.schwellen.map(s => s.name)).toEqual(['niedrig|mäßig', 'mäßig|hoch']);
  }, 300000);

  it('ordinal mit zwei Zielstufen: Satz zur logistischen Regression', async () => {
    const { spalten, zeilen } = sitzung('housing', { ordinal: ['Sat'] });
    const zwei = zeilen.map((z): Wert[] => [z[0] === 3 ? 2 : z[0]!, ...z.slice(1)]);   // High → Medium: nur noch Low und Medium
    const dt = katDaten('ordreg', 'Sat', PRAED, zwei, spalten);
    const antwort = await lauf(dt, ordAufruf(dt));
    expect(katFehlerText(String(antwort.fehler?.[0] ?? antwort.fehler))).toContain('logistischen Regression');
  }, 300000);

  it('multinomial: Vergleichskategorie und Kategorienfolge, Koeffizienten je Kategorie', async () => {
    const { spalten, zeilen } = sitzung('housing', { umbenennen: { Sat: UMLAUT } });
    const dt = katDaten('multreg', 'Sat', PRAED, zeilen, spalten);
    const antwort = await lauf(dt, multAufruf(dt, 'niedrig'));
    expect(antwort.fehler, `R-Fehler: ${antwort.fehler}`).toBeUndefined();
    const m = multLesen(antwort, dt), f = E.multinomial.find(x => x.name === 'a_housing_referenz_erste')!;
    expect(m.referenz).toBe('niedrig'); expect(m.kategorien).toEqual(['mäßig', 'hoch']); expect(m.konvergiert).toBe(true);
    const k = m.koef.find(x => x.kategorie === 'mäßig' && x.pIdx === 0 && x.stufe === 'Medium')!;
    nah(k.b, f.kategorien.Medium.find((z: Z) => z.name === 'InflMedium').b, 1e-5, 'mäßig, Infl Medium');
    expect(m.lr.map(l => l.df)).toEqual([4, 6, 2]);
    // andere Vergleichskategorie: die Folge der übrigen bleibt die von Statable
    const hoch = multLesen(await lauf(dt, multAufruf(dt, 'hoch')), dt);
    expect(hoch.referenz).toBe('hoch'); expect(hoch.kategorien).toEqual(['niedrig', 'mäßig']);
  }, 300000);

  it('Zähldaten: quine automatisch → negativ-binomial; mit Beobachtungszeit; negative Zielwerte als Satz', async () => {
    const q = sitzung('quine'), praed = ['Eth', 'Sex', 'Age', 'Lrn'];
    const dq = katDaten('zaehlreg', 'Days', praed, q.zeilen, q.spalten);
    const z = zaehlLesen(await lauf(dq, zaehlAufruf(dq)), dq);
    expect(z.modell).toBe('negbin'); expect(z.grund).toBe('ueberdispersion'); nah(z.theta!, 1.27489264215287, 1e-6, 'θ'); nah(z.lrUeber!.chi2, 1192.03261196057, 1e-6, 'LR');
    expect(z.offset).toBeNull(); expect(z.koef.filter(k => k.pIdx === 2).map(k => k.stufe)).toEqual(['F1', 'F2', 'F3']);
    const p = zaehlLesen(await lauf(dq, zaehlAufruf(dq, 'poisson')), dq);
    expect(p.modell).toBe('poisson'); expect(p.theta).toBeNull(); expect(p.grund).toBe('gewaehlt');
    const o = sitzung('zaehl_offset'), dz = katDaten('zaehlreg', 'y', ['x', 'g'], o.zeilen, o.spalten, { zeit: 'zeit' });
    const zo = zaehlLesen(await lauf(dz, zaehlAufruf(dz)), dz);
    expect(zo.offset).toBe('zeit'); nah(zo.theta!, E.zaehldaten.find(x => x.name === 'b_offset')!.negbin_profil.theta, 1e-6, 'θ mit Offset'); expect(zo.n).toBe(147);
    const neg = o.zeilen.map((z, i): Wert[] => (i === 3 ? [-2, ...z.slice(1)] : z));
    const dn = katDaten('zaehlreg', 'y', ['x'], neg, o.spalten);
    const a = await lauf(dn, zaehlAufruf(dn));
    expect(katFehlerText(String(a.fehler?.[0] ?? a.fehler))).toContain('negative Werte');
  }, 300000);
});
