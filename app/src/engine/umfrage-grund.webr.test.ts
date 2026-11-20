import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson } from './webr';
import STATABLE_UMFRAGE_R from './statable-umfrage.R?raw';
import FIX from './umfrage-grund.json';

/* Später S-D2, Bauer A1: die gemeinsame Grundlage `um_*` und `sp_umfrage_grund` in engine/statable-umfrage.R, in webR gegen survey 4.5 am Mac.
 * Das sind Prüfungen der MECHANIK (Design aus Zeilen mit Gewicht > 0, subset statt Löschen, Freiheitsgrade, Kish je Frage, Fehlerabfang, Skalen-Unabhängigkeit).
 * Die Sollwerte der Karten (Mittel mit KI, Rao-Scott, t-Test, Regression ...) legt der Prüfer fest (scripts/spaeter-d2-erwartet.R) und gehören nicht hierher.
 * Vergleichszahlen: scripts/umfrage-grund-fixture.R -> umfrage-grund.json (direkt aus survey: svymean, SE, degf). */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const repo = join(webrOrdner, 'repo/bin/emscripten/contrib/4.6');
const da = existsSync(join(repo, 'survey_4.5.tgz')) && existsSync(join(webrOrdner, 'manifest.json'));

type Z = Record<string, any>;
const F = FIX as unknown as { daten: Record<string, number[]>; luecken_index: number[]; faelle: Record<string, Z>; ungleich: { y: number[]; w: number[]; ergebnis: Z } };
const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
const nah = (ist: any, soll: number, tol: number, was: string) => { const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Math.abs(i - soll) / Math.max(Math.abs(soll), 1e-9), `${was} (ist ${i}, soll ${soll})`).toBeLessThan(tol); };

describe.skipIf(!da)('Manifest: survey, mitools, DBI sind im webR-Repo (ohne RcppArmadillo)', () => {
  it('survey hängt im Manifest an mitools und DBI; RcppArmadillo wird nicht gebraucht; die Versionen der Bestandspakete sind unverändert', () => {
    const m = JSON.parse(readFileSync(join(webrOrdner, 'manifest.json'), 'utf8')) as { pakete: Record<string, { p: string; b: number }[]> };
    const dateien = (m.pakete.survey ?? []).map(d => d.p.split('/').pop()!);
    for (const n of ['survey_4.5.tgz', 'mitools_2.7.tgz', 'DBI_1.3.0.tgz', 'Matrix_1.7-5.tgz', 'lattice_0.22-9.tgz', 'Rcpp_1.1.1-1.1.tgz', 'survival_3.8-12.tgz']) expect(dateien, n).toContain(n);
    expect(dateien.some(n => n.startsWith('RcppArmadillo')), 'RcppArmadillo steht nur unter LinkingTo und fehlt absichtlich').toBe(false);
  });
});

describe.skipIf(!da)('Umfrage-Grundlage (um_*) in webR gegen survey am Mac', { timeout: 240000 }, () => {
  let server: Server; let r: any; let sh: any; let fehler = '';
  const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Z;
  /** data.frame d0: api00, ell, meals, stype (Zahl), w (= pw), optional mit Lücken und Gewichtsänderungen. */
  const daten = async () => {
    const werte: Record<string, unknown> = {};
    for (const [n, v] of Object.entries(F.daten)) werte[n === 'pw' ? 'w' : n] = await new r.RDouble(v);
    await r.objs.globalEnv.bind('.sp_d0', await new r.RList(werte));
    await r.evalRVoid(`d0 <- as.data.frame(.sp_d0); rm(.sp_d0)`);
  };
  const mittel = `function(d, vars = 'api00', auswahl = NULL) { D <- um_design(d, 'w'); T <- um_teil(D, um_gueltig(d, vars, auswahl)); m <- survey::svymean(~api00, T$ds); k <- um_kish(T$w)
    list(mittel = unname(coef(m)), se = as.numeric(survey::SE(m)), df = um_df(T), n = T$n, neff = k$neff, verhaeltnis = k$verhaeltnis) }`;

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
    try { await r.installPackages(['survey'], { quiet: true }); } catch (e) { fehler = String((e as Error)?.message ?? e); }
    sh = await new r.Shelter();
    await rechne(`{ ${STATABLE_UMFRAGE_R}\nTRUE }`);
    await daten();
    await rechne(`{ mittel <- ${mittel}; TRUE }`);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  it('survey ist aus dem webR-Repo installierbar (ohne RcppArmadillo) und die Funktionen sind definiert', async () => {
    expect(fehler).toBe('');
    const o = await rechne(`c(grund = exists('sp_umfrage_grund'), design = exists('um_design'), survey = requireNamespace('survey', quietly = TRUE), arma = requireNamespace('RcppArmadillo', quietly = TRUE))`);
    expect([eins(o.grund), eins(o.design), eins(o.survey), eins(o.arma)]).toEqual([true, true, true, false]);
  });

  it('alle Zeilen: Mittel, SE, df, Kish gleich survey am Mac', async () => {
    const o = await rechne(`mittel(d0)`), s = F.faelle.alle!;
    nah(o.mittel, s.mittel, 1e-9, 'Mittel'); nah(o.se, s.se, 1e-9, 'SE'); expect(eins(o.df)).toBe(s.df); expect(eins(o.n)).toBe(s.n); nah(o.neff, s.neff, 1e-9, 'n_eff'); nah(o.verhaeltnis, s.verhaeltnis, 1e-9, 'max/min');
  });

  it('Teilgruppe: subset statt Löschen - df zählt nur die Fälle der Teilgruppe, Kish auf diesen Fällen', async () => {
    const o = await rechne(`mittel(within(d0, E <- stype == 1), 'api00', 'E')`), s = F.faelle.teil_E!;
    nah(o.mittel, s.mittel, 1e-9, 'Mittel'); nah(o.se, s.se, 1e-9, 'SE'); expect(eins(o.df)).toBe(99); expect(eins(o.n)).toBe(100); nah(o.neff, s.neff, 1e-9, 'n_eff');
  });

  it('fehlende Werte der Frage: Teilpopulation (n = 196, df = 195), nicht Zeilen löschen', async () => {
    const idx = F.luecken_index.join(', ');
    const o = await rechne(`{ d <- d0; d$api00[c(${idx})] <- NA; mittel(d) }`), s = F.faelle.luecken!;
    nah(o.mittel, s.mittel, 1e-9, 'Mittel'); nah(o.se, s.se, 1e-9, 'SE'); expect(eins(o.df)).toBe(s.df); expect(eins(o.n)).toBe(s.n); nah(o.neff, s.neff, 1e-9, 'n_eff');
  });

  it('Gewicht 0 (10 Zeilen) wird vor svydesign gelöscht; fehlendes Gewicht zählt ebenso nicht', async () => {
    const o = await rechne(`{ d <- d0; d$w[1:10] <- 0; mittel(d) }`), s = F.faelle.nullgewichte!;
    nah(o.mittel, s.mittel, 1e-9, 'Mittel'); nah(o.se, s.se, 1e-9, 'SE'); expect(eins(o.df)).toBe(s.df);
    const g = await rechne(`{ d <- d0; d$w[1:10] <- NA; sp_umfrage_grund(d, 'w', 'api00') }`);
    expect(eins(g.n_gewicht)).toBe(190); expect(eins(g.n)).toBe(190); expect(eins(g.n_zeilen)).toBe(200);
  });

  it('Skala der Gewichte (x 0,01) ändert Mittel und SE nicht', async () => {
    const o = await rechne(`{ d <- d0; d$w <- d$w * 0.01; mittel(d) }`), s = F.faelle.skaliert!;
    nah(o.mittel, s.mittel, 1e-9, 'Mittel'); nah(o.se, s.se, 1e-9, 'SE');
  });

  it('sp_umfrage_grund: Fälle, Kish, Freiheitsgrade, Version; Hinweise bei sehr ungleichen Gewichten und kleiner Stichprobe', async () => {
    const g = await rechne(`sp_umfrage_grund(d0, 'w', 'api00')`);
    expect(g.fehler).toBeUndefined(); expect(eins(g.df)).toBe(199); expect(eins(g.survey)).toBe('4.5'); nah(g.neff, F.faelle.alle!.neff, 1e-9, 'n_eff'); nah(g.deff_gewichte, 200 / F.faelle.alle!.neff, 1e-9, 'deff');
    expect(g.hinweise === undefined || (Array.isArray(g.hinweise) && g.hinweise.length === 0), 'keine Hinweise bei gleichmäßigen Gewichten').toBe(true);
    const u = F.ungleich;
    const o = await rechne(`{ d <- data.frame(y = c(${u.y.join(',')}), w = c(${u.w.join(',')})); r <- sp_umfrage_grund(d, 'w', 'y'); T <- um_teil(um_design(d, 'w'), um_gueltig(d, 'y')); m <- survey::svymean(~y, T$ds); c(r, list(mittel = unname(coef(m)), se = as.numeric(survey::SE(m)))) }`);
    nah(o.neff, u.ergebnis.neff, 1e-9, 'n_eff'); nah(o.verhaeltnis, 200, 1e-12, 'max/min'); nah(o.mittel, u.ergebnis.mittel, 1e-9, 'Mittel'); nah(o.se, u.ergebnis.se, 1e-9, 'SE'); expect(eins(o.df)).toBe(99);
    const h = (Array.isArray(o.hinweise) ? o.hinweise : [o.hinweise]).map(eins);
    expect(h).toContain('ungleiche-gewichte'); expect(h, 'n = 100 ist keine kleine Stichprobe').not.toContain('kleine-stichprobe');
    const k = await rechne(`{ d <- d0[1:20, ]; sp_umfrage_grund(d, 'w', 'api00') }`);
    expect((Array.isArray(k.hinweise) ? k.hinweise : [k.hinweise]).map(eins)).toContain('kleine-stichprobe');
  });

  it('Fehler statt stillem Unsinn: negative Gewichte, leere Auswahl, zu viele Zeilen, kein Gewicht > 0, fehlende Spalte - als Code mit Zahlen', async () => {
    const neg = await rechne(`{ d <- d0; d$w[3] <- -1; sp_umfrage_grund(d, 'w', 'api00') }`); expect(eins(neg.fehler_code)).toBe('gewicht-negativ'); expect(eins(neg.n)).toBe(1);
    const leer = await rechne(`sp_umfrage_grund(d0, 'w', 'api00', d0$stype == 99)`); expect(eins(leer.fehler_code)).toBe('zu-wenig'); expect(eins(leer.n)).toBe(0);
    const viele = await rechne(`sp_umfrage_grund(d0[rep(seq_len(200), length.out = 200001), ], 'w', 'api00')`); expect(eins(viele.fehler_code)).toBe('zu-viele-zeilen'); expect(eins(viele.n)).toBe(200001);
    expect(eins((await rechne(`{ d <- d0; d$w <- 0; sp_umfrage_grund(d, 'w', 'api00') }`)).fehler_code)).toBe('zu-wenig');
    expect(eins((await rechne(`sp_umfrage_grund(d0, 'gibtsnicht', 'api00')`)).fehler_code)).toBe('gewicht-fehlt');
    const fremd = await rechne(`um_ruf(stop('irgendwas'))`); expect(eins(fremd.fehler_code)).toBe('unbekannt'); expect(eins(fremd.meldung)).toBe('irgendwas');
  });

  it('Rangmangel: die Spalte, die survey still weglässt, wird genannt; Gruppen leer oder mit weniger als 2 Fällen; Anteil 0 oder 1', async () => {
    const rang = await rechne(`um_ruf(um_rang(api00 ~ ell + ell2, within(d0, ell2 <- 2 * ell), rep(TRUE, 200)))`);
    expect(eins(rang.fehler_code)).toBe('rangmangel'); expect(eins(rang.spalte)).toBe('ell2'); expect(eins(rang.n)).toBe(200);
    expect(eins((await rechne(`um_ruf(um_rang(api00 ~ ell + meals, d0, rep(TRUE, 200)))`)).fehler_code), 'volle Spalten: kein Fehler').toBeUndefined();
    const klein = await rechne(`um_ruf(um_gruppen(c(1, 2, 2, 2), rep(TRUE, 4)))`); expect(eins(klein.fehler_code)).toBe('gruppe-klein'); expect(eins(klein.gruppe)).toBe(1); expect(eins(klein.n_gruppe)).toBe(1); expect(eins(klein.n)).toBe(4);
    const leerG = await rechne(`um_ruf(um_gruppen(c(1, 1, 1, 1), rep(TRUE, 4), gruppen = c(1, 2)))`); expect(eins(leerG.fehler_code)).toBe('gruppe-leer'); expect(eins(leerG.gruppe)).toBe(2);
    expect(eins((await rechne(`um_ruf(um_gruppen(c(1, 1, 1), rep(TRUE, 3)))`)).fehler_code)).toBe('zu-wenig-gruppen');
    const ok = await rechne(`um_gruppen(c(1, 1, 2, 2, 2), rep(TRUE, 5))`); expect(ok).toEqual({ '1': 2, '2': 3 });
    const g = await rechne(`c(null = um_anteil_grenze(0), eins = um_anteil_grenze(1), mitte = um_anteil_grenze(0.1))`); expect([eins(g.null), eins(g.eins), eins(g.mitte)]).toEqual([true, true, false]);
  });

  it('Trennung in der logistischen Regression wird zum Fehler (survey meldet nur eine Warnung); Freiheitsgrade n - p', async () => {
    const t = await rechne(`{ d <- d0; d$y <- as.numeric(d$api00 > 600); T <- um_teil(um_design(d, 'w'), rep(TRUE, 200))
      f <- um_fange(survey::svyglm(y ~ api00, T$ds, family = quasibinomial()))
      list(trennung = f$trennung, fehler = tryCatch({ um_trennung_pruefen(f, 200L); NA_character_ }, sp_umfrage_fehler = function(e) e$felder$fehler_code), df3 = um_df(T, 3L)) }`);
    expect(eins(t.trennung)).toBe(true); expect(eins(t.fehler)).toBe('trennung'); expect(eins(t.df3)).toBe(197);
    const ok = await rechne(`{ d <- d0; d$y <- as.numeric(d$api00 > 600 & d$ell > 20 | d$meals > 70); T <- um_teil(um_design(d, 'w'), rep(TRUE, 200))
      f <- um_fange(survey::svyglm(y ~ ell, T$ds, family = quasibinomial())); list(trennung = f$trennung, nw = length(f$warnungen)) }`);
    expect(eins(ok.trennung), 'kein Trennungsfall: keine Meldung').toBe(false);
  });
});
