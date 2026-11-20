import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_UMFRAGE_R from './statable-umfrage.R?raw';
import { s } from '../lib/sitzung.svelte';
import { setzePuf, ladeSoll, type SollTabelle } from '../lib/amtlich-probe';
import { umfrageLesen } from '../lib/umfrage';
import { gewichtLage } from '../lib/fallgewicht.svelte';
import { planRep, istRepPlan, type RepPlan } from '../lib/genauigkeit';
import { amtlichWahlAus, leereAmtlichWahl, amtlichGrund, amtlichPlan, leereRoh, AmtlichRFehler, amtlichBaue, type AmtlichWahl, type AmtlichGrund, type RohMatrix } from '../lib/amtlich';
const stufeNameFuerTest = (_spalte: string, wert: string | number) => String(wert);

/* M5a: die Zahlen, die „Tabelle für die Veröffentlichung“ von R bekommt (Plan -> R -> Lesen), gegen survey 4.5 am Mac.
 * Sollwerte: pruefdaten/mikro/amtlich-soll.R -> amtlich-soll.json (direkt mit survey gerechnet, nicht mit Statable). Läuft nur, wenn das webR-Repo mit survey da ist (wie genauigkeit.webr.test.ts). */
s.einst.sprache = 'de';
const webrOrdner = join(import.meta.dirname, '../../public/webr');
const repo = join(webrOrdner, 'repo/bin/emscripten/contrib/4.6');
const da = existsSync(join(repo, 'survey_4.5.tgz')) && existsSync(join(webrOrdner, 'manifest.json'));
const SOLL = da ? ladeSoll() : ({} as Record<string, SollTabelle>);
const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-9);

describe.skipIf(!da)('Tabelle für die Veröffentlichung: R-Weg in webR gegen survey', { timeout: 600000 }, () => {
  let server: Server; let r: any; let sh: any;
  const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Record<string, unknown>;
  const binde = async (name: string, spalten: { name: string; werte: (number | string | null)[] }[]) => {
    const werte: Record<string, unknown> = {};
    for (const sp of spalten) werte[sp.name] = await new r.RDouble(sp.werte as (number | null)[]);
    await r.objs.globalEnv.bind('.sp_bind', await new r.RList(werte));
    await r.evalRVoid(`${name} <- as.data.frame(.sp_bind); rm(.sp_bind)`);
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
    await r.installPackages(['survey'], { quiet: true });
    sh = await new r.Shelter();
    await rechne(`{ ${STATABLE_UMFRAGE_R}\nTRUE }`);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  /** Plan bauen, jeden Auftrag in R rechnen (so wie lib/rverfahren.svelte.ts es tut), lesen. */
  async function lauf(w: AmtlichWahl, mitRep: boolean) {
    const l = gewichtLage(); if (l.art !== 'gilt') throw new Error('Gewicht');
    const q = { spalten: s.spalten, zeilen: s.zeilen, w: l.pruefung.w };
    const g = amtlichGrund(w, q, false) as AmtlichGrund;
    let rep: RepPlan | undefined;
    if (mitRep) { const p = planRep(q, { anfang: w.rep.anfang, typ: w.rep.typ, fay: w.rep.fay, scale: w.rep.scale }); expect(istRepPlan(p)).toBe(true); rep = p as RepPlan; }
    const plan = amtlichPlan(w, g, rep); if ('fehler' in plan) throw new Error(plan.fehler);
    await binde('d', plan.spalten);
    const roh: RohMatrix = leereRoh(g.zeilen.length, g.spalten.length);
    for (const a of plan.auftraege) {
      const antwort = await rechne(`tryCatch(${a.aufruf}, error = function(e) list(fehler_code = 'unbekannt', meldung = conditionMessage(e)))`);
      a.lies(umfrageLesen(a.art, antwort), roh);
    }
    return { g, roh, plan };
  }
  /** Vergleich mit dem Soll nach den Namen der Stufen: Schätzwert, SE und CV. */
  function gleich(g: AmtlichGrund, roh: RohMatrix, soll: SollTabelle, was: string) {
    const R = g.zeilen.length, C = g.spalten.length;
    const ps = (i: number) => (i < R ? soll.zeilen.indexOf(String(g.zeilen[i])) : R), qs = (j: number) => (j < C ? (g.hatSpalte ? soll.spalten.indexOf(String(g.spalten[j])) : 0) : C);
    let n = 0;
    for (let i = 0; i <= R; i++) for (let j = 0; j <= C; j++) {
      const e = soll.est[ps(i)]![qs(j)], se = soll.se[ps(i)]![qs(j)], cv = soll.cv[ps(i)]![qs(j)], z = roh[i]![j]!;
      if (e === null || e === undefined) continue;
      expect(z.schaetzer, `${was} ${i},${j} Schätzwert`).not.toBeNull(); expect(rel(z.schaetzer!, e), `${was} ${i},${j} Schätzwert ${z.schaetzer} gegen ${e}`).toBeLessThan(1e-8);
      if (se !== null && se !== undefined) { expect(z.se, `${was} ${i},${j} SE`).not.toBeNull(); expect(Math.abs(z.se! - se) <= 1e-8 * Math.max(Math.abs(se), 1e-9) + 1e-9, `${was} ${i},${j} SE ${z.se} gegen ${se}`).toBe(true); }
      if (cv !== null && cv !== undefined) { expect(z.cv, `${was} ${i},${j} CV`).not.toBeNull(); expect(rel(z.cv!, cv), `${was} ${i},${j} CV ${z.cv} gegen ${cv}`).toBeLessThan(1e-6); }
      n++;
    }
    return n;
  }
  const rep = { an: true, anfang: 'w_rep', typ: 'bootstrap' as const, fay: null, scale: 1 / 49 };
  const wahl = (x: Partial<AmtlichWahl>) => amtlichWahlAus({ ...leereAmtlichWahl(), rep, ...x });

  it('Replikationsgewichte (Bootstrap, scale 1/49, mse): Hochrechnung Erwerbsstatus × Bundesland mit SE und CV gleich survey', async () => {
    setzePuf('umfrage', false);
    const { g, roh } = await lauf(wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'anzahl' }), true);
    expect(gleich(g, roh, SOLL.rep_anzahl!, 'Anzahl')).toBe(40);
  });
  it('Replikationsgewichte: Anteil je Zeile, je Spalte, am Gesamt - SE und CV gleich survey', async () => {
    setzePuf('umfrage', false);
    for (const [inhalt, soll] of [['zeile', SOLL.rep_zeile!], ['spalte', SOLL.rep_spalte!], ['gesamt', SOLL.rep_gesamt!]] as const) {
      const { g, roh } = await lauf(wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt }), true);
      gleich(g, roh, soll, `Anteil ${inhalt}`);
    }
  });
  it('Replikationsgewichte: Mittelwert und Summe des Einkommens nach Geschlecht, Mittelwert nach Geschlecht × Bildung', async () => {
    setzePuf('umfrage', false);
    let l = await lauf(wahl({ zeile: 'geschlecht', inhalt: 'mittel', wert: 'einkommen' }), true); gleich(l.g, l.roh, SOLL.rep_mittel_geschlecht!, 'Mittel');
    l = await lauf(wahl({ zeile: 'geschlecht', inhalt: 'summe', wert: 'einkommen' }), true); gleich(l.g, l.roh, SOLL.rep_summe_geschlecht!, 'Summe');
    l = await lauf(wahl({ zeile: 'geschlecht', spalte: 'bildung', inhalt: 'mittel', wert: 'einkommen' }), true); gleich(l.g, l.roh, SOLL.rep_mittel_geschlecht_bildung!, 'Mittel × Bildung');
  });
  it('Stichprobenplan „einzeln gezogen“ (Linearisierung): Hochrechnung und Anteil je Spalte gleich survey', async () => {
    setzePuf('umfrage', true);
    let l = await lauf(wahl({ zeile: 'erwerbsstatus', spalte: 'geschlecht', inhalt: 'anzahl', rep: { ...rep, an: false } }), false); gleich(l.g, l.roh, SOLL.lin_anzahl!, 'lin Anzahl');
    l = await lauf(wahl({ zeile: 'erwerbsstatus', spalte: 'geschlecht', inhalt: 'spalte', rep: { ...rep, an: false } }), false); gleich(l.g, l.roh, SOLL.lin_spalte!, 'lin Anteil');
  });
  it('Die ganze Tabelle: Kennzeichnung mit CV und Geheimhaltung auf den Zahlen von R; keine gesperrte Zelle zeigt einen Wert', async () => {
    setzePuf('umfrage', false);
    const w = wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'anzahl', geheim: 'sperren', minN: 20, cvZeigen: true });
    const { g, roh } = await lauf(w, true);
    const t = amtlichBaue(w, g, roh, { gw: { spalte: 'gewicht', art: 'umfrage', summe: 1, zeilen: 1 }, weg: 'rep', nameZeile: 'Erwerbsstatus', nameSpalte: 'Bundesland', nameWert: '', nameGewicht: 'gewicht', stufe: stufeNameFuerTest, nRep: 50, scaleRep: 1 / 49, typRep: 'bootstrap' });
    expect(t.cvSpalte).toBe(true); expect(t.mitGenauigkeit).toBe(true);
    expect(t.fuss.join(' ')).toContain('50 Replikationsgewichten (Bootstrap, Faktor 0,0204)');
    for (const z of t.zellen.flat()) { if (z.gesperrt) { expect(z.text).toBe('x'); expect(z.cvText).toBe('x'); } else expect(z.cvText).not.toBe(''); }
    // Cv in Prozent: Zelle Burgenland arbeitslos ist gesperrt; Wien erwerbstätig hat einen CV unter 20 %
    const i = t.zeilenName.indexOf('erwerbstätig'), j = t.spaltenName.indexOf('Wien');
    expect(t.zellen[i]![j]!.kennzeichen).toBe(''); expect(Number(t.zellen[i]![j]!.cvText.replace(',', '.'))).toBeLessThan(20);
  });
  it('Ein Fehler, der die ganze Tabelle trifft (Replikationsspalten fehlen in R): als Ausnahme mit Code', async () => {
    setzePuf('umfrage', false);
    const l = gewichtLage(); if (l.art !== 'gilt') throw new Error('Gewicht');
    const w = wahl({ zeile: 'erwerbsstatus', spalte: 'bundesland', inhalt: 'anzahl' }), q = { spalten: s.spalten, zeilen: s.zeilen, w: l.pruefung.w };
    const g = amtlichGrund(w, q, false) as AmtlichGrund, p = planRep(q, { anfang: 'w_rep', typ: 'bootstrap', scale: 1 / 49 }) as RepPlan;
    const plan = amtlichPlan(w, g, { ...p, rTeil: p.rTeil.replace("anfang = 'rw'", "anfang = 'zz'") }); if ('fehler' in plan) throw new Error(plan.fehler);
    await binde('d', plan.spalten);
    const antwort = await rechne(`tryCatch(${plan.auftraege[0]!.aufruf}, error = function(e) list(fehler_code = 'unbekannt', meldung = conditionMessage(e)))`);
    expect(() => plan.auftraege[0]!.lies(umfrageLesen('total', antwort), leereRoh(g.zeilen.length, g.spalten.length))).toThrow(AmtlichRFehler);
  });
});
