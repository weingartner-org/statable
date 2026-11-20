import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson, rDataFrameCode, type RSpalte } from './webr';
import ERW from '../lib/testdaten/umfrage-entwurf-erwartet.json';
import { s } from '../lib/sitzung.svelte';
import type { Entwurf, GewichtAbdruck } from '../lib/gewichte';
import { gewichtetBeschreiben, type Quelle } from '../lib/gewichtbeschreibend';
import { planVerteilung, verteilungLesen, planKreuz, kreuzLesen } from '../lib/umfragedaten';
import { planTotal, totalLesen } from '../lib/genauigkeit';
import { gruppenDaten, regressionDaten } from '../lib/umfrage-gr-rechnen';
import { umfrageLesen, umfrageHinweise, hinweisSatz, umfrageFuss, umfrageFehlerSatz, type UmfrageErgebnis } from '../lib/umfrage';
import { entwurfPlan } from '../lib/umfrageentwurf';
import type { Spalte } from '../lib/verzeichnis';

/* Abschnitt 6, Teil A: Schichten, Klumpen, Grundgesamtheit und Schicht mit einem Klumpen - alle Fälle über die Funktionen der App (Plan bauen, R rufen, Antwort lesen) gegen die Sollwerte aus
 * scripts/umfrage-entwurf-erwartet.R (lib/testdaten/umfrage-entwurf-erwartet.json; die Datei ändert der Bau nie). Toleranz 1e-6 relativ.
 * Die Wörterliste der Texte läuft deutsch (s.einst). R und survey kommen aus public/webr; fehlen sie, wird die Datei übersprungen. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const webrOrdner = join(import.meta.dirname, '../../public/webr');
const rDatei = join(import.meta.dirname, 'statable-umfrage.R');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/survey_4.5.tgz')) && existsSync(join(webrOrdner, 'manifest.json'));

type Z = Record<string, any>;
const J = ERW as unknown as Z;
const TOL = 1e-6;
const eins = (x: any): any => (Array.isArray(x) ? eins(x[0]) : x);
const nah = (ist: any, soll: any, was: string, tol = TOL) => {
  const i = eins(ist), r = eins(soll);
  expect(typeof i, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number');
  expect(Math.abs(i - r) / Math.max(Math.abs(r), 1e-12), `${was} (ist ${i}, soll ${r})`).toBeLessThanOrEqual(tol);
};

/** Die Quelle der App aus den Spalten eines Falls der JSON; Text bleibt Text, Zahlen bleiben Zahlen. */
function quelleVon(daten: Z, w?: number[]): Quelle {
  const namen = Object.keys(daten), n = (daten[namen[0]!] as unknown[]).length;
  const spalten = namen.map(name => ({ name, bezeichnung: '', art: typeof daten[name][0] === 'string' ? 'text' : 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [] as number[], fehlendText: '' })) as unknown as Spalte[];
  const zeilen = Array.from({ length: n }, (_, i) => namen.map(c => daten[c][i] as string | number | null));
  return { spalten, zeilen, w: w ?? (daten.pw as number[]) } as unknown as Quelle;
}
const entwurfVon = (p: Z, extra: Partial<Entwurf> = {}): Entwurf => ({
  ...(p.klumpen ? { klumpen: p.klumpen } : {}), ...(p.klumpen2 ? { klumpen2: p.klumpen2 } : {}), ...(p.schicht ? { schicht: p.schicht } : {}), ...(p.fpc ? { fpc: p.fpc } : {}), ...(p.fpc2 ? { fpc2: p.fpc2 } : {}), ...extra
});
const abdruckVon = (q: Quelle, entwurf?: Entwurf): GewichtAbdruck => ({ spalte: 'pw', art: 'umfrage', klumpenfrei: true, ...(entwurf ? { entwurf } : {}), summe: q.w.reduce((a, b) => a + b, 0), zeilen: q.w.filter(x => x > 0).length, rechenweg: 'survey', surveyVersion: '4.5' });

describe.skipIf(!da)('Abschnitt 6, Teil A: Schichten und Klumpen in webR gegen R (survey 4.5)', () => {
  let server: Server; let r: any; let sh: any; let paketFehler = '';
  const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Z;
  const daten = async (name: string, spalten: RSpalte[]) => {
    const werte: Record<string, unknown> = {}, lab: Record<string, unknown> = {};
    for (const sp of spalten) { werte[sp.name] = await new r.RDouble(sp.werte.map((v: any) => (v == null ? null : Number(v)))); lab[sp.name] = await new r.RList({}); }
    const g = r.objs.globalEnv;
    await g.bind('.sp_werte', await new r.RList(werte)); await g.bind('.sp_art', await new r.RCharacter(spalten.map(x => x.art))); await g.bind('.sp_lab', await new r.RList(lab));
    await r.evalRVoid(rDataFrameCode(name, spalten) + '\nrm(.sp_werte, .sp_art, .sp_lab)');
  };
  /** Ein Aufruf der App auf den Spalten der App; die Antwort wird wie in der Oberfläche gelesen. */
  const lauf = async (spalten: RSpalte[], aufruf: string): Promise<UmfrageErgebnis> => {
    await daten('d', spalten);
    return umfrageLesen('mittel', await rechne(`tryCatch(${aufruf}, error = function(e) list(fehler = conditionMessage(e)))`));
  };
  /** Verteilung über planVerteilung: alle Aufträge nacheinander, dann verteilungLesen. */
  const verteilung = async (q: Quelle, g: GewichtAbdruck, spalten: string[]) => {
    const e = gewichtetBeschreiben('verteilung', { l1: spalten, l2: [] }, q, g), plan = planVerteilung(e, q, null);
    await daten('d', plan.spalten);
    const antwort: Record<string, unknown> = { mittel: null, anteile: {} };
    for (const a of plan.auftraege) {
      const roh = await rechne(`tryCatch(${a.aufruf}, error = function(e) list(fehler = conditionMessage(e)))`);
      if (a.schluessel === 'mittel') antwort.mittel = roh; else (antwort.anteile as Record<string, unknown>)[a.schluessel] = roh;
    }
    return { plan, e, l: verteilungLesen(plan, antwort, null, 'logit') };
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
    try { await r.installPackages(['survey'], { quiet: true }); await r.evalRVoid(`suppressMessages(library(survey))`); } catch (e) { paketFehler = String((e as Error)?.message ?? e); }
    sh = await new r.Shelter();
    await rechne(`{ ${readFileSync(rDatei, 'utf8')}\nTRUE }`);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  it('survey ist da und die Funktionen sind definiert', async () => {
    expect(paketFehler).toBe('');
    const o = await rechne(`list(m = exists('sp_umfrage_mittel'), e = exists('um_entwurf_design'))`);
    expect([eins(o.m), eins(o.e)]).toEqual([true, true]);
  });

  for (const id of ['geschichtet', 'klumpen', 'klumpen_ohne_fpc', 'zwei_stufen']) {
    describe(`Fall ${id}`, () => {
      const F = J[id] as Z, q = quelleVon(F.daten), ent = entwurfVon(F.plan), g = abdruckVon(q, ent);

      it('Mittel, Standardfehler, n, Freiheitsgrade, deff und Anteil (Verteilung)', async () => {
        const { l, e } = await verteilung(q, g, ['api00', 'sch.wide']);
        expect('ok' in l, JSON.stringify(l)).toBe(true);
        const d = (l as { ok: Z }).ok, m = d.mittel.e.ergebnisse[0];
        nah(m.n, F.n, `${id} n`, 1e-12); nah(m.df, F.df, `${id} df`, 1e-12);
        nah(m.mittel, F.mittel, `${id} Mittel`); nah(m.se, F.mittel_se, `${id} SE`); nah(m.deffSurvey, F.deff, `${id} deff`);
        nah(d.mittel.e.entwurf.df, F.df, `${id} df des Plans`, 1e-12);
        const a = d.anteile[0].e.kategorien.find((k: Z) => k.wert === e.kategorien[0]!.werte.indexOf('Yes') + 1);
        nah(a.p, F.anteil_ja, `${id} Anteil`); nah(a.se, F.anteil_se, `${id} SE Anteil`);
      }, 300000);

      it('Hochrechnung der Summe von enroll', async () => {
        const plan = planTotal(q, { art: 'summe', spalte: 'enroll' }, { entwurf: ent });
        const o = totalLesen(plan, await lauf(plan.spalten, plan.aufruf)) as { ok: Z };
        expect(o.ok.fehlerCode).toBeUndefined();
        nah(o.ok.summe.total, F.total, `${id} Total`); nah(o.ok.summe.se, F.total_se, `${id} SE Total`);
      }, 300000);

      it('Gruppenvergleich: Mittel und Standardfehler je Gruppe (stype)', async () => {
        const dg = gruppenDaten('api00', 'stype', q.w, q.zeilen as any, q.spalten as any, ent);
        const o = await lauf(dg.spalten, dg.aufruf);
        expect(o.fehlerCode, JSON.stringify(o)).toBeUndefined();
        (o.gruppen as Z[]).forEach((x, i) => { nah(x.mittel, F.gruppe_m[i], `${id} Mittel ${F.gruppe[i]}`); nah(x.se, F.gruppe_se[i], `${id} SE ${F.gruppe[i]}`); });
        expect(o.entwurf).toBeTruthy();
      }, 300000);

      it('Regression api00 ~ ell + meals + mobility: Koeffizienten, SE, t, p und Freiheitsgrade', async () => {
        const dr = regressionDaten('api00', ['ell', 'meals', 'mobility'], null, () => null, q.w, q.zeilen as any, q.spalten as any, ent);
        const o = await lauf(dr.spalten, dr.aufruf);
        expect(o.fehlerCode, JSON.stringify(o)).toBeUndefined();
        const k = o.koef as Z[];
        expect(k.length).toBe(F.glm_namen.length); nah(o.df, F.glm_df, `${id} df der Regression`, 1e-12);
        k.forEach((x, i) => { nah(x.b, F.glm_b[i], `${id} b ${F.glm_namen[i]}`); nah(x.se, F.glm_se[i], `${id} SE ${F.glm_namen[i]}`); nah(x.t, F.glm_t[i], `${id} t ${F.glm_namen[i]}`); nah(x.p, F.glm_p[i], `${id} p ${F.glm_namen[i]}`, 1e-5); });
      }, 300000);

      it('Kreuztabelle rechnet mit dem Plan (Rao-Scott), ohne Absturz', async () => {
        const e = gewichtetBeschreiben('kreuz', { l1: ['sch.wide'], l2: ['stype'] }, q, g), plan = planKreuz(e, q);
        const k = kreuzLesen(plan, await lauf(plan.spalten, plan.aufruf));
        expect('ok' in k, JSON.stringify(k)).toBe(true);
        const ok = (k as { ok: Z }).ok.e;
        expect(ok.fehlerCode, JSON.stringify(ok)).toBeUndefined(); expect(Number.isFinite(ok.f)).toBe(true); expect(ok.entwurf).toBeTruthy();
      }, 300000);
    });
  }

  describe('Warnung, Freiheitsgrade und Fußzeile (Klumpen)', () => {
    const F = J.klumpen as Z, q = quelleVon(F.daten), ent = entwurfVon(F.plan), g = abdruckVon(q, ent);
    it('Klumpen: Hinweis zur Varianz mit dem deff, wenige Freiheitsgrade (14 unter 20); Fußzeile mit deff und n/deff, ohne Kish', async () => {
      const { l } = await verteilung(q, g, ['api00']), d = (l as { ok: Z }).ok, e = d.mittel.e;
      const h = umfrageHinweise('mittel', e);
      expect(h).toContain('plan-varianz'); expect(h).toContain('wenige-freiheitsgrade');
      const satz = hinweisSatz('plan-varianz', e); expect(satz).toContain('9,35'); expect(satz).toContain('Varianz');
      expect(hinweisSatz('wenige-freiheitsgrade', e)).toContain('14 Freiheitsgrade');
      const fuss = umfrageFuss(g, { n: e.ergebnisse[0].gewicht.n, kishNeff: e.ergebnisse[0].gewicht.kishNeff }, e.ergebnisse[0].deffSurvey);
      expect(fuss).toContain('deff'); expect(fuss).toContain('n/deff'); expect(fuss).not.toContain('Kish'); expect(fuss).toContain('dnum');
      nah(e.ergebnisse[0].n / e.ergebnisse[0].deffSurvey, 183 / F.deff, 'effektive Stichprobengröße n/deff');
    }, 300000);
    it('derselbe Datensatz falsch als einzeln gezogen: SE 7,82 statt 23,54', async () => {
      const gEinzeln = abdruckVon(q), { l, plan } = await verteilung(q, gEinzeln, ['api00']);
      expect(plan.auftraege[0]!.aufruf).not.toContain('entwurf');
      const m = (l as { ok: Z }).ok.mittel.e;
      nah(m.ergebnisse[0].se, J.falsch_einzeln.se, 'SE einzeln gezogen'); expect(m.entwurf).toBeUndefined();
      expect(umfrageHinweise('mittel', m)).not.toContain('plan-varianz');
      expect(umfrageFuss(gEinzeln, { n: 183, kishNeff: 100 })).toContain('Kish');
    }, 300000);
    it('Geschichtet mit vielen Freiheitsgraden: kein Hinweis zu wenigen Freiheitsgraden und keine Klumpen-Warnung', async () => {
      const G = J.geschichtet as Z, qg = quelleVon(G.daten), { l } = await verteilung(qg, abdruckVon(qg, entwurfVon(G.plan)), ['api00']);
      const h = umfrageHinweise('mittel', (l as { ok: Z }).ok.mittel.e);
      expect(h).not.toContain('wenige-freiheitsgrade'); expect(h).not.toContain('plan-varianz');
    }, 300000);
  });

  describe('Schicht mit einem Klumpen (Beispiel: eine Schule in Schicht H)', () => {
    const L = J.lonely as Z, q = quelleVon(L.daten);
    const soll = (regel: string) => (L.ergebnisse as Z[]).find(x => x.regel === regel)!;
    it('ohne Regel: Sperre, die die Schicht nennt; die Rechnung läuft nicht', async () => {
      s.spalten = q.spalten as any; s.zeilen = q.zeilen as any; s.gewicht = { spalte: 'pw', art: 'umfrage', klumpenfrei: true, entwurf: { schicht: 'stype', fpc: 'fpc' } };
      const ent = { schicht: 'stype', fpc: 'fpc' } as Entwurf, { l } = await verteilung(q, abdruckVon(q, ent), ['api00']);
      const f = (l as { ok: Z }).ok.fehler ?? (l as { ok: Z }).ok.mittel?.e;
      expect(f.fehlerCode).toBe('einsamer-klumpen'); expect(f.n).toBe(1);
      const satz = umfrageFehlerSatz(f); expect(satz).toContain('H'); expect(satz).toContain('nur einen Klumpen'); expect(satz).toContain('Regel');
    }, 300000);
    for (const regel of ['adjust', 'average', 'remove', 'certainty']) {
      it(`Regel ${regel}: Mittel bleibt, der Standardfehler folgt der Regel`, async () => {
        const ent = { schicht: 'stype', fpc: 'fpc', einsam: regel } as Entwurf, { l } = await verteilung(q, abdruckVon(q, ent), ['api00']);
        const m = (l as { ok: Z }).ok.mittel!.e.ergebnisse[0];
        expect(m.fehlerCode, JSON.stringify(m)).toBeUndefined();
        nah(m.mittel, 666.795, 'Mittel überall 666,795', 1e-6); nah(m.mittel, soll(regel).mittel, `${regel} Mittel`); nah(m.se, soll(regel).se, `${regel} SE`);
      }, 300000);
    }
    it('die Option survey.lonely.psu gilt nur für den Aufruf und ist danach wie vorher (gesetzt und ungesetzt)', async () => {
      const ent = { schicht: 'stype', fpc: 'fpc', einsam: 'remove' } as Entwurf, e = gewichtetBeschreiben('verteilung', { l1: ['api00'], l2: [] }, q, abdruckVon(q, ent)), plan = planVerteilung(e, q, null);
      await daten('d', plan.spalten);
      await rechne(`{ options(survey.lonely.psu = 'average'); TRUE }`);
      const o = await rechne(`tryCatch(${plan.auftraege[0]!.aufruf}, error = function(e) list(fehler = conditionMessage(e)))`);
      expect(o.fehler).toBeUndefined();
      expect(eins((await rechne(`list(o = getOption('survey.lonely.psu'))`)).o)).toBe('average');
      await rechne(`{ options(survey.lonely.psu = NULL); TRUE }`);
      await rechne(`tryCatch(${plan.auftraege[0]!.aufruf}, error = function(e) list(fehler = conditionMessage(e)))`);
      expect(eins((await rechne(`list(o = is.null(getOption('survey.lonely.psu')))`)).o)).toBe(true);
    }, 300000);
    it('die Regel steht im Methodensatz (Bericht) und der Satz sagt, dass das Mittel bleibt', async () => {
      const { umfrageMethode } = await import('../lib/umfrage');
      const t = umfrageMethode(abdruckVon(q, { schicht: 'stype', fpc: 'fpc', einsam: 'adjust' }));
      expect(t).toContain('Schicht mit nur einem Klumpen'); expect(t).toContain('adjust'); expect(t).toContain('stype');
    });
  });

  describe('Sperren (keine Zeile fällt still weg)', () => {
    const G = J.geschichtet as Z, K = J.klumpen as Z;
    const fehler = async (daten: Z, plan: Entwurf, w?: number[]) => {
      const q = quelleVon(daten, w), { l } = await verteilung(q, abdruckVon(q, plan), ['api00']);
      const d = (l as { ok: Z }).ok; return (d.fehler ?? d.mittel?.e) as Z;
    };
    it('Lücken in der Schicht: Satz mit der Zahl; Zeilen ohne Gewicht zählen nicht dazu', async () => {
      const daten = JSON.parse(JSON.stringify(G.daten)) as Z;
      [0, 1, 2, 3, 4].forEach(i => { daten.stype[i] = null; });
      const f = await fehler(daten, entwurfVon(G.plan));
      expect(f.fehlerCode).toBe('entwurf-luecken'); expect(f.n).toBe(5); expect(f.bereich).toBe('schicht');
      expect(umfrageFehlerSatz(f)).toContain('In 5 Zeilen fehlt die Angabe zur Schicht');
      const w = (G.daten.pw as number[]).map((x, i) => (i < 5 ? 0 : x)), ok = await fehler(daten, entwurfVon(G.plan), w);
      expect(ok.fehlerCode).toBeUndefined();
    }, 300000);
    it('Lücken im Klumpen und in der Grundgesamtheit', async () => {
      const daten = JSON.parse(JSON.stringify(K.daten)) as Z; daten.dnum[3] = null; daten.fpc[7] = null;
      expect((await fehler(daten, entwurfVon(K.plan))).bereich).toBe('klumpen');
      daten.dnum[3] = (K.daten.dnum as number[])[3];
      const f = await fehler(daten, entwurfVon(K.plan)); expect(f.fehlerCode).toBe('entwurf-luecken'); expect(f.bereich).toBe('fpc'); expect(f.n).toBe(1);
    }, 300000);
    it('weniger als 2 Klumpen', async () => {
      const daten = JSON.parse(JSON.stringify(K.daten)) as Z; daten.dnum = daten.dnum.map(() => 1);
      const f = await fehler(daten, entwurfVon(K.plan)); expect(f.fehlerCode).toBe('entwurf-zu-wenig-klumpen'); expect(f.n).toBe(1);
      expect(umfrageFehlerSatz(f)).toContain('nur 1 Klumpen');
    }, 300000);
    it('Grundgesamtheit unter der Stichprobe, und uneinheitliche Grundgesamtheit', async () => {
      const daten = JSON.parse(JSON.stringify(G.daten)) as Z; daten.fpc = daten.fpc.map(() => 10);
      const f = await fehler(daten, entwurfVon(G.plan)); expect(f.fehlerCode).toBe('entwurf-fpc-klein'); expect(f.n).toBe(3);
      const d2 = JSON.parse(JSON.stringify(G.daten)) as Z; d2.fpc[0] = 4000;
      const u = await fehler(d2, entwurfVon(G.plan)); expect(u.fehlerCode).toBe('entwurf-fpc-uneinheitlich'); expect(u.n).toBe(1);
    }, 300000);
    it('zweite Stufe nur mit erster Stufe und beiden Angaben zur Grundgesamtheit: sonst spielt sie keine Rolle (R-Seite: ungültig)', async () => {
      const Z2 = J.zwei_stufen as Z;
      expect(entwurfPlan(quelleVon(Z2.daten), { klumpen: 'dnum', klumpen2: 'snum', fpc: 'fpc1' }, [0, 1])!.entwurf.klumpen2).toBeUndefined();
      expect(entwurfPlan(quelleVon(Z2.daten), { klumpen2: 'snum', fpc2: 'fpc2' }, [0, 1])).toBeNull();
      const q = quelleVon(Z2.daten), e = gewichtetBeschreiben('verteilung', { l1: ['api00'], l2: [] }, q, abdruckVon(q)), plan = planVerteilung(e, q, null);
      await daten('d', plan.spalten);
      const o = await rechne(`sp_umfrage_mittel(d, c('m1'), 'w', NULL, NULL, NULL, entwurf = list(k = TRUE, k2 = TRUE, s = FALSE, f = FALSE, f2 = FALSE, einsam = NULL))`);
      expect(eins(o.fehler_code)).toBe('entwurf-ungueltig');
    }, 300000);
  });
});

describe('Sicherheit: Namen und Werte aus der Datei kommen nie in den R-Code', () => {
  const boese = "x'); system('calc'); (' `y` \n stop(1) #";
  it('Spaltennamen des Plans stehen nicht im Aufruf; dort nur feste Wörter und Wahrheitswerte, die Daten gehen als Zahlen-Spalten mit festen Namen', () => {
    const q = quelleVon({ pw: [1, 2, 3, 4], a: ['u', 'v', 'u', 'v'], b: [1, 2, 3, 4], c: [10, 10, 10, 10] });
    (q.spalten as any[]).push({ name: boese, bezeichnung: '', art: 'text', niveau: 'nominal', format: 'A8', fehlend: [], fehlendText: '' });
    q.zeilen.forEach((z, i) => z.push(['p', 'q', 'p', 'q'][i]!));
    const p = entwurfPlan(q, { schicht: boese, klumpen: 'a', fpc: 'c', einsam: 'average' }, [0, 1, 2, 3])!;
    expect(p.rTeil).toBe("entwurf = list(k = TRUE, k2 = FALSE, s = TRUE, f = TRUE, f2 = FALSE, einsam = 'average')");
    expect(p.rTeil).not.toContain('system'); expect(p.spalten.map(x => x.name)).toEqual(['dz_k1', 'dz_s', 'dz_f1']);
    expect(p.spalten[1]!.werte).toEqual([1, 2, 1, 2]);
    expect(() => entwurfPlan(q, { schicht: 'a', einsam: "adjust'); system('x'); ('" as never }, [0])!.rTeil).not.toThrow();
    expect(entwurfPlan(q, { schicht: 'a', einsam: "adjust'); system('x'); ('" as never }, [0])!.rTeil).toContain('einsam = NULL');
  });
});
