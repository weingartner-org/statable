import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_UMFRAGE_R from './statable-umfrage.R?raw';
import { s } from '../lib/sitzung.svelte';
import { gewichtetBeschreiben } from '../lib/gewichtbeschreibend';
import { R_PAKETE_KALIBRIEREN, planRep, istRepPlan, planTotal, totalLesen, planKalibrieren, kalibrierenLesen, werteAusTotal, werteAusKreuz, type RepPlan } from '../lib/genauigkeit';
import type { Quelle } from '../lib/gewichtbeschreibend';

/* Paket M4: Hochrechnung (sp_umfrage_total), CV und ungewichtetes n, Replikationsgewichte und Kalibrieren in webR gegen survey 4.5.
 * Sollwerte: pruefdaten/mikro/genauigkeit-soll.R -> genauigkeit-soll.json (direkt mit survey gerechnet, nicht mit statable-umfrage.R). Am Mac vergleicht pruefdaten/mikro/genauigkeit-pruefen.R dieselben Zahlen mit Rscript.
 * Läuft nur, wenn das webR-Repo mit survey da ist (wie umfrage-grund.webr.test.ts). */
s.einst.sprache = 'de';
void gewichtetBeschreiben;

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const repo = join(webrOrdner, 'repo/bin/emscripten/contrib/4.6');
const da = existsSync(join(repo, 'survey_4.5.tgz')) && existsSync(join(webrOrdner, 'manifest.json'));
const JSON_DATEI = join(import.meta.dirname, '../../../pruefdaten/mikro/genauigkeit-soll.json');

type Z = Record<string, any>;
type Spalten = Record<string, (number | null)[]>;
const FIX = da || existsSync(JSON_DATEI) ? (JSON.parse(readFileSync(JSON_DATEI, 'utf8')) as { daten: Record<string, Spalten>; soll: Z }) : ({ daten: {}, soll: {} } as { daten: Record<string, Spalten>; soll: Z });
const S = FIX.soll, D = FIX.daten;
const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
const liste = (x: any): any[] => (Array.isArray(x) ? x : [x]);
const nah = (ist: any, soll: number | null, tol: number, was: string) => {
  if (soll === null) { expect(ist === null || ist === undefined || (typeof eins(ist) === 'object' && eins(ist)?.type === 'null'), `${was}: null erwartet, ist ${JSON.stringify(ist)}`).toBe(true); return; }
  const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Math.abs(i - soll) / Math.max(Math.abs(soll), 1e-9), `${was} (ist ${i}, soll ${soll})`).toBeLessThan(tol);
};
const alleNah = (ist: any, soll: number[], tol: number, was: string) => { const v = liste(ist); expect(v.length, `${was}: Länge`).toBe(soll.length); soll.forEach((x, i) => nah(v[i], x, tol, `${was}[${i}]`)); };
const cols = (...teile: Spalten[]): Spalten => Object.assign({}, ...teile);
const mit = (basis: Spalten, ...extra: Record<string, number[]>[]): Spalten => Object.assign({}, basis, ...extra);

describe.skipIf(!da)('Genauigkeit (Teil 3 von statable-umfrage.R) in webR gegen survey am Mac', { timeout: 300000 }, () => {
  let server: Server; let r: any; let sh: any; let fehler = '';
  const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Z;
  /** Bindet Spalten als data.frame unter `name` in R (Zahlen; null = NA). */
  const binde = async (name: string, spalten: Spalten) => {
    const werte: Record<string, unknown> = {};
    for (const [n, v] of Object.entries(spalten)) werte[n] = await new r.RDouble(v);
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
    try { await r.installPackages(['survey', 'MASS'], { quiet: true }); } catch (e) { fehler = String((e as Error)?.message ?? e); }
    sh = await new r.Shelter();
    await rechne(`{ ${STATABLE_UMFRAGE_R}\nTRUE }`);
    await binde('d_lin', D.basis!);
    await binde('d_boot', cols(D.basis!, D.boot!));
    await binde('d_jk', cols(D.jk_basis!, D.jk!));
    await binde('d_brr', cols(D.brr_basis!, D.brr!));
    await binde('d_fay', cols(D.brr_basis!, D.fay!));
    await binde('d_klein', D.klein!);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  const zeile = (o: any, soll: Z, was: string, feld = 'total') => { nah(o[feld], soll.est, 1e-9, `${was} Schätzwert`); nah(o.se, soll.se, 1e-9, `${was} SE`); nah(o.ki_u, soll.ki_u, 1e-9, `${was} KI unten`); nah(o.ki_o, soll.ki_o, 1e-9, `${was} KI oben`); nah(o.cv, soll.cv, 1e-9, `${was} CV`); };
  /** Alle Schätzungen eines Designs gegen survey. */
  const alles = async (daten: string, S1: Z, auswahl: string, rep: string) => {
    const n = S1.n;
    const t = await rechne(`sp_umfrage_total(${daten}, 'y', 'w', ${auswahl}, 'summe', NULL, ${rep})`);
    expect(eins(t.n)).toBe(n); expect(eins(t.n_ungew)).toBe(n); nah(t.df, S1.df, 1e-12, 'df'); zeile(t.summe, S1.total_summe_y, 'Summe y');
    const k = await rechne(`sp_umfrage_total(${daten}, 'a', 'w', ${auswahl}, 'kategorien', c(1, 2, 3), ${rep})`);
    liste(k.kategorien).forEach((z, i) => { zeile(z, S1.total_kat_a[i], `Anzahl a=${i + 1}`); expect(eins(z.n_ungew)).toBe(S1.total_kat_a[i].n_ungew); });
    zeile(k.gesamt, S1.total_gesamt, 'Gesamt');
    const m = (await rechne(`sp_umfrage_mittel(${daten}, 'y', 'w', ${auswahl}, NULL, ${rep})`)).ergebnisse; const m1 = liste(m)[0];
    nah(m1.mittel, S1.mittel_y.est, 1e-9, 'Mittel'); nah(m1.se, S1.mittel_y.se, 1e-9, 'Mittel SE'); nah(m1.cv, S1.mittel_y.cv, 1e-9, 'Mittel CV'); expect(eins(m1.n_ungew)).toBe(n);
    const a = await rechne(`sp_umfrage_anteil(${daten}, 'a', 'w', ${auswahl}, 1, ${rep})`); const a1 = liste(a.kategorien)[0];
    nah(a1.p, S1.anteil_a1.est, 1e-9, 'Anteil'); nah(a1.se, S1.anteil_a1.se, 1e-9, 'Anteil SE'); nah(a1.cv, S1.anteil_a1.cv, 1e-9, 'Anteil CV'); expect(eins(a.n_ungew)).toBe(n);
    const kr = await rechne(`sp_umfrage_kreuz(${daten}, 'a', 'b', 'w', ${auswahl}, ${rep})`);
    alleNah(kr.anteile, S1.kreuz_p, 1e-9, 'Zellanteile'); alleNah(kr.se_zellen, S1.kreuz_se, 1e-9, 'Zell-SE'); alleNah(kr.faelle_zellen, S1.kreuz_n, 1e-12, 'Zell-n');
    alleNah(kr.cv_zellen, S1.kreuz_se.map((x: number, i: number) => x / Math.abs(S1.kreuz_p[i])), 1e-9, 'Zell-CV');
    return { kr, a1 };
  };

  it('Pakete: Kalibrieren mit Grenzen braucht MASS (R_PAKETE_KALIBRIEREN), ohne Grenzen genügt survey', async () => {
    expect(R_PAKETE_KALIBRIEREN).toEqual(['survey', 'MASS']);
    expect(eins((await rechne(`requireNamespace('MASS', quietly = TRUE)`)))).toBe(true);
  });
  it('survey ist da und die Funktionen sind definiert', async () => {
    expect(fehler).toBe('');
    const o = await rechne(`c(total = exists('sp_umfrage_total'), kal = exists('sp_umfrage_kalibrieren'), survey = requireNamespace('survey', quietly = TRUE))`);
    expect([eins(o.total), eins(o.kal), eins(o.survey)]).toEqual([true, true, true]);
  });

  it('Linearisierung: Hochrechnung, CV, ungewichtetes n, Mittel, Anteil, Zellen - gleich survey (alle Fälle und Teilpopulation)', async () => {
    await alles('d_lin', S.linear.alle, 'NULL', 'NULL');
    await rechne(`{ d_lin$E <- d_lin$sel; TRUE }`);
    await alles('d_lin', S.linear.teil, `'E'`, 'NULL');
  });

  it('Lücken in der Frage: Teilpopulation (df aus den Fällen), Summe mit CV', async () => {
    const L = S.luecke_total_y2, t = await rechne(`sp_umfrage_total(transform(d_lin, v = y2), 'v', 'w', NULL, 'summe')`);
    expect(eins(t.n)).toBe(L.n); nah(t.df, L.df, 1e-12, 'df'); nah(t.summe.total, L.est, 1e-9, 'Summe'); nah(t.summe.se, L.se, 1e-9, 'SE'); nah(t.summe.cv, L.cv, 1e-9, 'CV');
  });

  it('Bootstrap-Replikationsgewichte (survey-Voreinstellung scale = 1/(R - 1), mse = TRUE): alles gleich survey, auch Rao-Scott-F und beide Anteilsintervalle', async () => {
    const rep = `list(anfang = 'rw', typ = 'bootstrap')`;
    const { kr, a1 } = await alles('d_boot', S.boot_voreinstellung.alle, 'NULL', rep);
    alleNah([kr.f, kr.ndf, kr.ddf, kr.p_f], [S.boot_kreuz_F.f, S.boot_kreuz_F.ndf, S.boot_kreuz_F.ddf, S.boot_kreuz_F.p], 1e-8, 'Rao-Scott F');
    alleNah([a1.logit.u, a1.logit.o], S.boot_anteil_a1_ci.logit, 1e-8, 'Anteil logit'); alleNah([a1.beta.u, a1.beta.o], S.boot_anteil_a1_ci.beta, 1e-8, 'Anteil beta');
    const t = await rechne(`sp_umfrage_total(d_boot, 'y', 'w', NULL, 'summe', NULL, ${rep})`);
    expect(eins(t.rep.typ)).toBe('bootstrap'); expect(eins(t.rep.n_rep)).toBe(50); nah(t.rep.scale, S.boot_voreinstellung.scale, 1e-12, 'scale'); expect(eins(t.df)).toBe(49);
  });
  it('Bootstrap, Teilpopulation', async () => {
    await rechne(`{ d_boot$E <- d_boot$sel; TRUE }`);
    await alles('d_boot', S.boot_voreinstellung.teil, `'E'`, `list(anfang = 'rw', typ = 'bootstrap')`);
  });
  it('Bootstrap mit eigenem scale (der von as.svrepdesign): gleich survey', async () => {
    await alles('d_boot', S.boot_scale.alle, 'NULL', `list(anfang = 'rw', typ = 'bootstrap', scale = ${S.boot_scale.scale})`);
  });

  it('JK1, BRR und Fay (rho = 0,3): Summe, KI mit df aus dem Rang, Mittel, CV und scale gleich survey', async () => {
    const fall = async (daten: string, rep: string, S1: Z, sc: number) => {
      const t = await rechne(`sp_umfrage_total(${daten}, 'y', 'w', NULL, 'summe', NULL, ${rep})`), m = liste((await rechne(`sp_umfrage_mittel(${daten}, 'y', 'w', NULL, NULL, ${rep})`)).ergebnisse)[0];
      nah(t.df, S1.df, 1e-12, 'df'); nah(t.rep.scale, sc, 1e-12, 'scale'); nah(t.summe.total, S1.total, 1e-9, 'Summe'); nah(t.summe.se, S1.total_se, 1e-9, 'Summe SE'); nah(t.summe.ki_u, S1.total_ki_u, 1e-9, 'KI unten'); nah(t.summe.ki_o, S1.total_ki_o, 1e-9, 'KI oben');
      nah(m.mittel, S1.mittel, 1e-9, 'Mittel'); nah(m.se, S1.mittel_se, 1e-9, 'Mittel SE'); nah(m.cv, S1.mittel_cv, 1e-9, 'Mittel CV');
    };
    await fall('d_jk', `list(anfang = 'jw', typ = 'JK1')`, S.jk1, S.jk1_scale);
    await fall('d_brr', `list(anfang = 'bw', typ = 'BRR')`, S.brr, S.brr_scale);
    await fall('d_fay', `list(anfang = 'fw', typ = 'Fay', fay = 0.3)`, S.fay, S.fay_scale);
  });

  it('Fehler als Code: Replikationsgewichte (fehlen, Art, ungültig, Fay, scale, zu groß) und Hochrechnung (Art)', async () => {
    const code = async (c: string) => eins((await rechne(c)).fehler_code);
    expect(await code(`sp_umfrage_total(d_boot, 'y', 'w', NULL, 'summe', NULL, list(anfang = 'xx', typ = 'bootstrap'))`)).toBe('rep-fehlt');
    expect(eins((await rechne(`sp_umfrage_total(d_boot, 'y', 'w', NULL, 'summe', NULL, list(anfang = 'xx', typ = 'bootstrap'))`)).n)).toBe(0);
    expect(await code(`sp_umfrage_total(d_boot, 'y', 'w', NULL, 'summe', NULL, list(anfang = 'rw', typ = 'jackknife'))`)).toBe('rep-typ');
    expect(await code(`{ d <- d_boot; d$rw7[3] <- NA; sp_umfrage_total(d, 'y', 'w', NULL, 'summe', NULL, list(anfang = 'rw', typ = 'bootstrap')) }`)).toBe('rep-ungueltig');
    expect(await code(`{ d <- d_boot; d$rw7[3] <- -1; sp_umfrage_total(d, 'y', 'w', NULL, 'summe', NULL, list(anfang = 'rw', typ = 'bootstrap')) }`)).toBe('rep-ungueltig');
    expect(await code(`sp_umfrage_total(d_fay, 'y', 'w', NULL, 'summe', NULL, list(anfang = 'fw', typ = 'Fay'))`)).toBe('rep-fay');
    expect(await code(`sp_umfrage_total(d_fay, 'y', 'w', NULL, 'summe', NULL, list(anfang = 'fw', typ = 'Fay', fay = 1))`)).toBe('rep-fay');
    expect(await code(`sp_umfrage_total(d_boot, 'y', 'w', NULL, 'summe', NULL, list(anfang = 'rw', typ = 'bootstrap', scale = -1))`)).toBe('rep-scale');
    expect(await code(`sp_umfrage_total(d_boot, 'y', 'w', NULL, 'summe', NULL, list(anfang = 'rw', typ = 'bootstrap', rscales = c(1, 2)))`)).toBe('rep-scale');
    expect(await code(`sp_umfrage_total(d_lin, 'y', 'w', NULL, 'mittelwert')`)).toBe('art-unbekannt');
    expect(await code(`sp_umfrage_total(d_lin, 'y', 'w', NULL, 'summe', NULL, list(anfang = 'rw'))`)).toBe('rep-typ');
    expect(await code(`sp_umfrage_total(d_lin, 'y', 'w', d_lin$y > 1e9, 'summe')`)).toBe('zu-wenig');
    expect(await code(`{ d <- d_lin; d$w[2] <- -1; sp_umfrage_total(d, 'y', 'w') }`)).toBe('gewicht-negativ');
  });

  it('Sicherheit: ein Text als Anfang der Replikationsspalten läuft nie als Code (sp_id wirft, die Antwort ist ein Fehler)', async () => {
    const o = await rechne(`{ assign('.sp_boese', FALSE, envir = globalenv()); x <- sp_umfrage_total(d_boot, 'y', 'w', NULL, 'summe', NULL, list(anfang = "rw'); assign('.sp_boese', TRUE, envir = globalenv()); ('", typ = 'bootstrap')); list(fehler = x$fehler_code, meldung = x$meldung, ausgefuehrt = .sp_boese) }`);
    expect(eins(o.fehler)).toBe('unbekannt'); expect(String(eins(o.meldung))).toContain('unsafe name rejected'); expect(eins(o.ausgefuehrt)).toBe(false);
    const p = await rechne(`um_ruf(sp_umfrage_kalibrieren(d_lin, 'w', c("a'); stop('x'); ('"), list(c(1, 2)), 2))`);
    expect(eins(p.fehler_code)).toBe('unbekannt');
  });

  describe('Kalibrieren (calibrate linear)', () => {
    const K = () => S.kalibrieren;
    const aufruf = (daten: string, pop: string, gesamt: string, bounds: string) => `sp_umfrage_kalibrieren(${daten}, 'w', c('a', 'b'), ${pop}, ${gesamt}, ${bounds})`;
    const popVoll = () => `list(c(${K().sollsummen.a.join(', ')}), c(${K().sollsummen.b.join(', ')}))`;
    it('linear: Gewichte gleich calibrate, Sollsummen erreicht, Gesamtzahl aus dem ersten Rand', async () => {
      const o = await rechne(aufruf('d_lin', popVoll(), 'NULL', 'NULL'));
      alleNah(o.gewichte, K().frei.w, 1e-8, 'Gewichte'); expect(eins(o.negativ)).toBe(K().frei.negativ); expect(liste(o.hinweise ?? []).length).toBe(0);
      nah(o.summe, K().sollsummen.gesamt, 1e-9, 'Summe'); expect(eins(o.n)).toBe(200); expect(eins(o.n_zeilen)).toBe(200);
      expect(eins(o.max_abweichung)).toBeLessThan(1e-6);
    });
    it('begrenzt (0,8 bis 1,6): gleich calibrate mit bounds, Faktor innerhalb der Grenzen', async () => {
      const o = await rechne(aufruf('d_lin', popVoll(), 'NULL', 'c(0.8, 1.6)'));
      alleNah(o.gewichte, K().begrenzt.w, 1e-6, 'Gewichte'); expect(eins(o.g_min)).toBeGreaterThanOrEqual(0.8 - 1e-9); expect(eins(o.g_max)).toBeLessThanOrEqual(1.6 + 1e-9); alleNah(o.grenzen, [0.8, 1.6], 1e-12, 'Grenzen');
    });
    it('negative Gewichte: kein Fehler, Hinweis mit Vorschlag „begrenzt kalibrieren“; begrenzt geht ohne Hinweis; ohne Konvergenz: Fehler', async () => {
      const N = K().negativ, pop = `list(c(${N.summen_a.join(', ')}), c(${N.summen_b.join(', ')}))`;
      const o = await rechne(aufruf('d_klein', pop, String(N.gesamt), 'NULL'));
      alleNah(o.gewichte, N.w, 1e-8, 'Gewichte'); expect(eins(o.negativ)).toBe(N.negativ); expect(liste(o.hinweise).map(eins)).toEqual(['negative-gewichte', 'begrenzt-kalibrieren']);
      const b = await rechne(aufruf('d_klein', pop, String(N.gesamt), `c(${N.bounds.join(', ')})`));
      alleNah(b.gewichte, N.begrenzt, 1e-6, 'Gewichte begrenzt'); expect(eins(b.negativ)).toBe(0); expect(liste(b.hinweise ?? []).length).toBe(0);
      expect(eins((await rechne(aufruf('d_klein', pop, String(N.gesamt), `c(${N.nicht_erreicht_bounds.join(', ')})`))).fehler_code)).toBe('kalibrieren-unmoeglich');
    });
    it('Zeilen ohne Gewicht oder mit ungültigem Code bekommen kein neues Gewicht (NA), die übrigen werden kalibriert', async () => {
      const o = await rechne(`{ d <- d_lin; d$w[1:3] <- 0; d$b[5] <- NA; ${aufruf('d', popVoll(), 'NULL', 'NULL')} }`);
      const g = liste(o.gewichte); expect(g.length).toBe(200); expect([0, 1, 2, 4].map(i => eins(g[i]))).toEqual([null, null, null, null]);
      expect(eins(o.n)).toBe(196); expect(liste(o.ohne_gewicht).map(eins)).toEqual([1, 2, 3, 5]); nah(o.summe, 6194, 1e-9, 'Summe');
    });
    it('Fehler als Code: Merkmale, Ränder, Summen, Stufe ohne Fall, Grenzen', async () => {
      const code = async (c: string) => { const o = await rechne(c); return [eins(o.fehler_code), eins(o.merkmal)]; };
      expect((await code(`sp_umfrage_kalibrieren(d_lin, 'w', character(0), list(), NULL, NULL)`))[0]).toBe('merkmale');
      expect((await code(`sp_umfrage_kalibrieren(d_lin, 'w', c('a', 'b', 'a', 'b'), list(1, 2, 3, 4), NULL, NULL)`))[0]).toBe('merkmale');
      expect(await code(`sp_umfrage_kalibrieren(d_lin, 'w', c('a'), list(c(100, -5, 50)), NULL, NULL)`)).toEqual(['rand-ungueltig', 1]);
      expect(await code(`sp_umfrage_kalibrieren(d_lin, 'w', c('a', 'b'), list(c(4421, 755, 1018), c(1712, 4000)), NULL, NULL)`)).toEqual(['raender-summen', 2]);
      expect(await code(`sp_umfrage_kalibrieren(d_lin, 'w', c('a'), list(c(4421, 755, 1018, 10)), NULL, NULL)`)).toEqual(['kategorie-ohne-stichprobe', 1]);
      expect((await code(`sp_umfrage_kalibrieren(d_lin, 'w', c('a'), list(c(4421, 755, 1018)), NULL, c(1.2, 2))`))[0]).toBe('bounds-ungueltig');
      expect((await code(`sp_umfrage_kalibrieren(d_lin, 'w', c('a'), list(c(4421, 755, 1018)), NULL, c(0.5, Inf))`))[0]).toBe('bounds-ungueltig');
      expect((await code(`sp_umfrage_kalibrieren(d_lin, 'gibtsnicht', c('a'), list(c(4421, 755, 1018)), NULL, NULL)`))[0]).toBe('gewicht-fehlt');
      expect((await code(`{ d <- d_lin; d$w[3] <- -1; sp_umfrage_kalibrieren(d, 'w', c('a'), list(c(4421, 755, 1018)), NULL, NULL) }`))[0]).toBe('gewicht-negativ');
    });
    it('Stufe ohne Fall mit Sollsumme 0 entfällt (kein Fehler)', async () => {
      const o = await rechne(`sp_umfrage_kalibrieren(d_lin, 'w', c('a'), list(c(4421, 755, 1018, 0)), NULL, NULL)`);
      expect(o.fehler_code).toBeUndefined(); nah(o.summe, 6194, 1e-9, 'Summe');
    });
  });

  describe('Der Weg über lib/genauigkeit.ts (Plan -> R -> Lesen), mit den Daten von survey', () => {
    const basis = D.basis!;
    const quelle = (namen: string[], extra: Spalten = {}): Quelle => {
      const alle = { ...basis, ...extra }, n = basis.w!.length;
      return { spalten: namen.map(name => ({ name, art: 'zahl', fehlend: [], werteLabels: {} })) as Quelle['spalten'], zeilen: Array.from({ length: n }, (_, i) => namen.map(c => alle[c]![i] ?? null)), w: basis.w!.map(x => x ?? 0) };
    };
    /** Die Spalten des Plans nach R (so macht es RMotor.daten) und den Aufruf ausführen. */
    const lauf = async (spalten: { name: string; werte: (number | string | null)[] }[], aufruf: string) => {
      const sp: Spalten = {}; for (const c of spalten) sp[c.name] = c.werte as (number | null)[];
      await binde('d', sp); return rechne(`{ ${aufruf} }`);
    };
    const repSpalten = (anz: number) => ({ ...Object.fromEntries(Array.from({ length: anz }, (_, k) => [`w_rep${k + 1}`, D.boot![`rw${k + 1}`]!])) });
    it('Replikationsgewichte über gemeinsamen Anfang (w_rep1 ... w_rep50, auch w_rep10 nach w_rep9): Hochrechnung gleich survey', async () => {
      const q = quelle(['y', 'a', ...Object.keys(repSpalten(50))], repSpalten(50));
      const rp = planRep(q, { anfang: 'w_rep', typ: 'bootstrap' }); expect(istRepPlan(rp)).toBe(true); const rep = rp as RepPlan;
      expect(rep.namen[9]).toBe('w_rep10'); expect(rep.spalten.length).toBe(50);
      const p = planTotal(q, { art: 'summe', spalte: 'y' }, { rep });
      expect(p.aufruf).toContain(`list(anfang = 'rw', typ = 'bootstrap'`);
      const o = await lauf(p.spalten, `x <- ${p.aufruf}; x`);
      const l = totalLesen(p, o); expect('ok' in l).toBe(true);
      const w = werteAusTotal((l as { ok: Z }).ok)[0]!, so = S.boot_voreinstellung.alle.total_summe_y;
      nah(w.schaetzer, so.est, 1e-9, 'Summe'); nah(w.se, so.se, 1e-9, 'SE'); nah(w.cv, so.cv, 1e-9, 'CV'); nah(w.kiU, so.ki_u, 1e-9, 'KI'); expect(w.n).toBe(200);
    });
    it('Kategorien mit Auswahl: Teilpopulation gleich survey', async () => {
      const q = quelle(['a', 'sel'], {});
      const p = planTotal(q, { art: 'kategorien', spalte: 'a' }, { auswahl: q.zeilen.map(z => z[1] === 1) });
      const o = await lauf(p.spalten, p.aufruf); const l = totalLesen(p, o) as { ok: Z };
      const w = werteAusTotal(l.ok), so = S.linear.teil;
      [1, 2, 3].forEach((k, i) => { const x = w.find(v => v.schluessel === `k:${k}`)!; nah(x.schaetzer, so.total_kat_a[i].est, 1e-9, `a=${k}`); nah(x.cv, so.total_kat_a[i].cv, 1e-9, `CV a=${k}`); expect(x.n).toBe(so.total_kat_a[i].n_ungew); });
      nah(w.find(v => v.schluessel === 'gesamt')!.schaetzer, so.total_gesamt.est, 1e-9, 'Gesamt');
    });
    it('Kreuztabelle: Zellwerte mit CV und Fällen aus der Antwort', async () => {
      const q = quelle(['a', 'b']), p = { spalten: [{ name: 'w', werte: basis.w! }, { name: 'z', werte: basis.a! }, { name: 's', werte: basis.b! }] };
      const o = await lauf(p.spalten, `sp_umfrage_kreuz(d, 'z', 's', 'w', NULL)`); void q;
      const { umfrageLesen } = await import('../lib/umfrage'); const w = werteAusKreuz(umfrageLesen('kreuz', o));
      expect(w.length).toBe(6); expect(w[0]!.schluessel).toBe('z:1:1'); expect(w[1]!.schluessel).toBe('z:2:1'); expect(w[3]!.schluessel).toBe('z:1:2');
      w.forEach((x, i) => { nah(x.schaetzer, S.linear.alle.kreuz_p[i], 1e-9, `p ${i}`); nah(x.cv, S.linear.alle.kreuz_se[i] / S.linear.alle.kreuz_p[i], 1e-9, `CV ${i}`); expect(x.n).toBe(S.linear.alle.kreuz_n[i]); });
    });
    it('Kalibrieren: Plan -> R -> Lesen gibt Gewichte in der Länge der Daten, null für Zeilen ohne Gewicht', async () => {
      const q = quelle(['a', 'b']); q.w[0] = 0; q.w[9] = 0;
      const k = S.kalibrieren.sollsummen;
      const p = planKalibrieren(q, { merkmale: [{ spalte: 'a', werte: [1, 2, 3], summen: k.a }, { spalte: 'b', werte: [1, 2], summen: k.b }], gesamt: k.gesamt, grenzen: null });
      expect('problem' in p).toBe(false); const plan = p as Exclude<typeof p, { problem: unknown }>;
      const o = await lauf(plan.spalten, plan.aufruf); const l = kalibrierenLesen(plan, o);
      expect('ok' in l && l.ok).toBe(true); if (!('ok' in l) || !l.ok) return;
      expect(l.gewichte.length).toBe(200); expect(l.gewichte[0]).toBeNull(); expect(l.gewichte[9]).toBeNull(); expect(typeof l.gewichte[1]).toBe('number'); expect(l.ohneGewicht).toEqual([1, 10]);
      expect(l.gewichte.reduce<number>((a, x) => a + (x ?? 0), 0)).toBeCloseTo(6194, 5); expect(l.nGewichtet).toBe(198);
    });
  });
});
