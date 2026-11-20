import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rMotor, rZuJson, type RMotor } from './webr';
import { diskriminanzRechnen, loglinearRechnen, manovaRechnen, probitRechnen, wlsRechnen } from '../lib/rverfahren.svelte';
import { diskrGrundquote, type DiskrE } from '../lib/diskriminanz';
import { logVergleiche, type LogWahl } from '../lib/loglinear';
import type { Spalte } from '../lib/verzeichnis';
import type { Wert } from '../lib/eingabe';
import ERW from '../lib/testdaten/kurspaket-erwartet.json';

/* Kurs-Paket im echten webR (Fachblatt docs/fachblaetter/KURSPAKET.md): Diskriminanzanalyse, loglineare Modelle, MANOVA, Probit, gewichtete Regression.
 * Die Sollwerte kommen aus lib/testdaten/kurspaket-erwartet.json (scripts/kurspaket-erwartet.R, R am Mac, gegen Formeln von Hand, MASS::loglm und SPSS geprüft) und nie aus dem Code der App.
 * Gerechnet wird mit den echten Funktionen der App (rverfahren.svelte.ts → webR → engine/statable-kurspaket.R). Toleranz 1e-6 relativ. Die Daten kommen aus den Datensätzen von R selbst. */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const da = existsSync(join(webrOrdner, 'webr.mjs')) && existsSync(join(webrOrdner, 'manifest.json')) && existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/MASS_7.3-65.tgz'));

type Z = Record<string, any>;
const E = ERW as unknown as { lda: Z[]; loglinear: Z[]; manova: Z[]; probit: Z[]; wls: Z[] };
const av = (x: unknown): number[] => (Array.isArray(x) ? (x as number[]) : [x as number]);
const nah = (ist: number, soll: number, tol: number, was: string) => expect(Math.abs(ist - soll) / Math.max(Math.abs(soll), 1e-300), `${was} (ist ${ist}, soll ${soll})`).toBeLessThan(tol);
const nahFeld = (ist: number[], soll: unknown, tol: number, was: string) => { const s = av(soll); expect(ist.length, `${was}: Länge`).toBe(s.length); s.forEach((v, i) => nah(ist[i]!, v, tol, `${was}[${i}]`)); };

/** Spalten und Zeilen einer Statable-Sitzung aus Spalten von Zahlen und Texten. */
function sitzung(cols: Record<string, (number | string | null)[]>, text: string[] = []): { spalten: Spalte[]; zeilen: Wert[][] } {
  const namen = Object.keys(cols), n = cols[namen[0]!]!.length;
  const spalten: Spalte[] = namen.map(name => ({ name, bezeichnung: name, art: text.includes(name) ? 'text' : 'zahl', niveau: text.includes(name) ? 'nominal' : 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {} }));
  const zeilen: Wert[][] = Array.from({ length: n }, (_, i) => namen.map((nm): Wert => cols[nm]![i] ?? null));
  return { spalten, zeilen };
}

describe.skipIf(!da)('Kurs-Paket in webR gegen die Sollwerte (R am Mac; braucht: bash scripts/webr-holen.sh)', () => {
  let server: Server; let r: any; let sh: any; let motor: RMotor;
  /** Ein R-Ausdruck, der eine Liste gleich langer Spalten ergibt (Faktoren als Text), als Sitzung. */
  const daten = async (ausdruck: string, text: string[] = []) => sitzung(rZuJson(await (await sh.evalR(`local({ x <- ${ausdruck}; for (n in names(x)) if (is.factor(x[[n]])) x[[n]] <- as.character(x[[n]]); as.list(x) })`)).toJs()) as Record<string, (number | string | null)[]>, text);

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
    await r.installPackages(['MASS'], { quiet: true });
    await r.evalRVoid('suppressMessages(library(MASS))');
    sh = await new r.Shelter();
    motor = rMotor(); motor.einhaengen(r, ['MASS']);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  /* ---------------------------------------------------------------- 1. Diskriminanz */
  const diskr = async (name: string): Promise<{ e: DiskrE; soll: Z }> => {
    const soll = E.lda.find(x => x.name === name)!;
    if (name === 'iris') {
      const q = await daten('iris', ['Species']);
      return { e: await diskriminanzRechnen('Species', ['Sepal.Length', 'Sepal.Width', 'Petal.Length', 'Petal.Width'], q), soll };
    }
    const q = await daten('local({ b <- biopsy[complete.cases(biopsy), ]; data.frame(class = as.character(b$class), v1 = b$V1, v2 = b$V2, v3 = b$V3, v4 = b$V4, v5 = b$V5) })', ['class']);
    return { e: await diskriminanzRechnen('class', ['v1', 'v2', 'v3', 'v4', 'v5'], q), soll };
  };
  for (const name of ['iris', 'biopsy_gleich', 'biopsy_groesse']) {
    it(`Diskriminanz ${name}: Eigenwerte, Wilks, χ², df, standardisierte Koeffizienten (Vorzeichen: erster Koeffizient positiv), Einteilung gelernt und Leave-one-out`, async () => {
      const { e, soll } = await diskr(name);
      const w = soll.prior as 'gleich' | 'groesse';
      expect(e.gruppen.map(g => g.name)).toEqual(soll.gruppen);
      nahFeld(e.eigen, soll.eigen, 1e-6, 'Eigenwerte'); nahFeld(e.anteil, soll.anteil, 1e-6, 'Anteil'); nahFeld(e.kanon, soll.kanon, 1e-6, 'kanonische Korrelation');
      nahFeld(e.wilks, soll.wilks, 1e-6, 'Wilks'); nahFeld(e.chi, soll.chi, 1e-6, 'χ²'); nahFeld(e.df, soll.df, 1e-9, 'df'); nahFeld(e.pw, soll.p, 1e-6, 'p');
      const std = soll.standard as number[][];   // Zeilen = Zahlenspalten, Spalten = Funktionen
      e.standard.forEach((f, j) => f.forEach((v, i) => nah(v, std[i]![j]!, 1e-6, `standardisiert[${i}][${j}]`)));
      e.standard.forEach((f, j) => expect(f[0]!, `Funktion ${j + 1}: erster Koeffizient positiv`).toBeGreaterThan(0));
      const z = e.einteilung[w];
      expect(z.tabelle).toEqual(soll.tabelle); expect(z.tabelleLoo).toEqual(soll.tabelle_loo);
      nah(z.treffer, soll.treffer, 1e-9, 'Treffer'); nah(z.trefferLoo, soll.treffer_loo, 1e-9, 'Leave-one-out');
      expect(diskrGrundquote(e)).toBeCloseTo(Math.max(...soll.tabelle.map((row: number[]) => row.reduce((a, b) => a + b, 0))) / e.n, 10);
    }, 300000);
  }
  it('Diskriminanz: Funktionen, Eigenwerte und Wilks hängen nicht an den Vorwahrscheinlichkeiten (gleich und nach Größe geben dieselben Zahlen, nur die Einteilung ändert sich)', async () => {
    const gl = E.lda.find(x => x.name === 'biopsy_gleich')!, gr = E.lda.find(x => x.name === 'biopsy_groesse')!;
    nahFeld(av(gl.eigen), gr.eigen, 1e-12, 'Eigenwert der Sollwerte'); expect(gl.treffer).not.toBe(gr.treffer);
    const { e } = await diskr('biopsy_gleich');
    expect(e.einteilung.gleich.treffer).not.toBe(e.einteilung.groesse.treffer);
    nah(e.einteilung.groesse.treffer, gr.treffer, 1e-9, 'Treffer nach Größe'); nah(e.einteilung.gleich.treffer, gl.treffer, 1e-9, 'Treffer gleich');
  }, 300000);

  /* ---------------------------------------------------------------- 2. Loglineare Modelle */
  const modelle: [string, LogWahl][] = [['unabhaengig', { art: 'unabh', eigen: [] }], ['haareaugen_sex', { art: 'eigen', eigen: [[0, 1]] }], ['zweifach', { art: 'zwei', eigen: [] }]];
  for (const [name, wahl] of modelle) {
    it(`Loglinear HairEyeColor, ${name}: G², df, p, X², AIC, Anteil erwartet unter 5, kleinster erwarteter Wert`, async () => {
      const q = await daten('local({ h <- as.data.frame(HairEyeColor); data.frame(Hair = as.character(h$Hair), Eye = as.character(h$Eye), Sex = as.character(h$Sex), Freq = h$Freq) })', ['Hair', 'Eye', 'Sex']);
      const soll = E.loglinear.find(x => x.name === name)!;
      const e = await loglinearRechnen(['Hair', 'Eye', 'Sex'], 'Freq', wahl, q);
      const m = e.modelle[0]!;
      nah(m.g2, soll.g2, 1e-6, 'G²'); expect(m.df).toBe(soll.df); nah(m.p!, soll.p, 1e-6, 'p'); nah(m.x2, soll.x2, 1e-6, 'X²'); nah(m.pX2!, soll.p_x2, 1e-6, 'p (X²)');
      nah(m.aic, soll.aic, 1e-6, 'AIC'); nah(m.erwartetMin, soll.erwartet_min, 1e-6, 'kleinster erwarteter Wert'); nah(m.kleiner5, soll.kleiner5, 1e-9, 'Anteil unter 5');
      expect(e.zellen).toBe(32); expect(e.n).toBe(592);
    }, 300000);
  }
  it('Loglinear: das gewählte Modell zuerst, die Vergleiche mit einfacheren Modellen sind Differenzen von G² und df der Sollwerte', async () => {
    const q = await daten('local({ h <- as.data.frame(HairEyeColor); data.frame(Hair = as.character(h$Hair), Eye = as.character(h$Eye), Sex = as.character(h$Sex), Freq = h$Freq) })', ['Hair', 'Eye', 'Sex']);
    const a = E.loglinear.find(x => x.name === 'unabhaengig')!, b = E.loglinear.find(x => x.name === 'zweifach')!;
    const e = await loglinearRechnen(['Hair', 'Eye', 'Sex'], 'Freq', { art: 'zwei', eigen: [] }, q);
    const v = logVergleiche(e);
    expect(v.length).toBe(1);
    nah(v[0]!.dG2, a.g2 - b.g2, 1e-6, 'ΔG²'); expect(v[0]!.dDf).toBe(a.df - b.df);
  }, 300000);
  it('Loglinear ohne Häufigkeitsspalte (eine Zeile je Beobachtung) und mit leeren Zellen: dieselbe Tabelle gibt dieselben Zahlen', async () => {
    const q = await daten('local({ h <- as.data.frame(HairEyeColor); h <- h[rep(seq_len(nrow(h)), h$Freq), ]; data.frame(Hair = as.character(h$Hair), Eye = as.character(h$Eye), Sex = as.character(h$Sex)) })', ['Hair', 'Eye', 'Sex']);
    const soll = E.loglinear.find(x => x.name === 'zweifach')!;
    const e = await loglinearRechnen(['Hair', 'Eye', 'Sex'], null, { art: 'zwei', eigen: [] }, q);
    nah(e.modelle[0]!.g2, soll.g2, 1e-6, 'G²'); expect(e.modelle[0]!.df).toBe(soll.df); expect(e.n).toBe(592);
    // eine Zelle weglassen: die leere Zelle bleibt in der Tabelle und in den Freiheitsgraden (df = Zellen − Parameter)
    const ohne = q.zeilen.filter(z => !(z[0] === 'Black' && z[1] === 'Blue' && z[2] === 'Male'));
    const e2 = await loglinearRechnen(['Hair', 'Eye', 'Sex'], null, { art: 'unabh', eigen: [] }, { spalten: q.spalten, zeilen: ohne });
    expect(e2.zellen).toBe(32); expect(e2.leer).toBe(1); expect(e2.modelle[0]!.df).toBe(24);
  }, 300000);

  /* ---------------------------------------------------------------- 3. MANOVA */
  for (const name of ['iris', 'iris_ungleich']) {
    it(`MANOVA ${name}: Pillai, Wilks, Hotelling-Lawley, Roy mit F und Freiheitsgraden, einzelne Zielgrößen`, async () => {
      const q = await daten(name === 'iris' ? 'iris' : 'iris[c(1:50, 51:80, 101:125), ]', ['Species']);
      const soll = E.manova.find(x => x.name === name)!;
      const e = await manovaRechnen('Species', ['Sepal.Length', 'Sepal.Width', 'Petal.Length', 'Petal.Width'], q);
      expect(e.n).toBe(soll.n); expect(e.k).toBe(soll.k);
      for (const [k, s] of [['pillai', soll.pillai], ['wilks', soll.wilks], ['hotelling', soll.hotelling], ['roy', soll.roy]] as const) {
        const t = e[k];
        nah(t.wert, s.wert, 1e-6, `${k} Wert`); nah(t.F, s.F, 1e-6, `${k} F`); expect(t.df1).toBe(s.df1); expect(t.df2).toBe(s.df2); nah(t.p, s.p, 1e-6, `${k} p`);
      }
      e.einzeln.forEach((u, j) => { const s = soll.einzeln[j]; nah(u.F, s.F, 1e-6, `Zielgröße ${j + 1} F`); expect(u.df1).toBe(s.df1); expect(u.df2).toBe(s.df2); nah(u.p, s.p, 1e-6, `Zielgröße ${j + 1} p`); });
    }, 300000);
  }

  /* ---------------------------------------------------------------- 4. Probit */
  for (const [name, ziel, praed, ausdruck] of [
    ['mtcars', 'am', ['wt', 'hp'], 'mtcars[, c("am", "wt", "hp")]'],
    ['birthwt', 'low', ['age', 'lwt', 'smoke'], 'birthwt[, c("low", "age", "lwt", "smoke")]']
  ] as const) {
    it(`Probit ${name}: b, SE, z, p, 95-%-Intervall, AIC, Devianz, Nullmodell, n`, async () => {
      const q = await daten(ausdruck);
      const soll = E.probit.find(x => x.name === name)!;
      const e = await probitRechnen(ziel, [...praed], q);
      nahFeld(e.koef.map(k => k.b), soll.b, 1e-6, 'b'); nahFeld(e.koef.map(k => k.se), soll.se, 1e-6, 'SE'); nahFeld(e.koef.map(k => k.z), soll.z, 1e-6, 'z'); nahFeld(e.koef.map(k => k.p), soll.p, 1e-6, 'p');
      nahFeld(e.koef.map(k => k.kiU), soll.kiu, 1e-6, 'Intervall unten'); nahFeld(e.koef.map(k => k.kiO), soll.kio, 1e-6, 'Intervall oben');
      nah(e.aic, soll.aic, 1e-6, 'AIC'); nah(e.devianz, soll.devianz, 1e-6, 'Devianz'); nah(e.nullDevianz, soll.null, 1e-6, 'Nullmodell'); expect(e.n).toBe(soll.n);
      expect(e.konvergiert).toBe(true);
    }, 300000);
  }
  it('Probit mtcars (fast trennbar): R warnt, die Prüfbedingung schlägt an - beides kommt in der Antwort an und wird nicht verschluckt', async () => {
    const e = await probitRechnen('am', ['wt', 'hp'], await daten('mtcars[, c("am", "wt", "hp")]'));
    expect(e.fastTrennbar).toBe(true); expect(e.warnung).toBe(true);
  }, 300000);
  it('Probit birthwt: nicht trennbar, keine Warnung', async () => {
    const e = await probitRechnen('low', ['age', 'lwt', 'smoke'], await daten('birthwt[, c("low", "age", "lwt", "smoke")]'));
    expect(e.fastTrennbar).toBe(false); expect(e.warnung).toBe(false);
  }, 300000);

  /* ---------------------------------------------------------------- 5. Gewichtete Regression */
  for (const name of ['cars_1_durch_x', 'cars_mit_nullen']) {
    it(`Gewichtete Regression ${name}: b, SE, t, p, R², σ, df, n`, async () => {
      const soll = E.wls.find(x => x.name === name)!;
      const q = sitzung({ dist: av(soll.y), speed: av(soll.x), w: av(soll.w) });
      const e = await wlsRechnen('dist', ['speed'], 'w', q);
      nahFeld(e.koef.map(k => k.b), soll.b, 1e-6, 'b'); nahFeld(e.koef.map(k => k.se), soll.se, 1e-6, 'SE'); nahFeld(e.koef.map(k => k.t), soll.t, 1e-6, 't'); nahFeld(e.koef.map(k => k.p), soll.p, 1e-6, 'p');
      nah(e.r2, soll.r2, 1e-6, 'R²'); nah(e.sigma, soll.sigma, 1e-6, 'σ'); expect(e.df).toBe(soll.df); expect(e.n).toBe(soll.n_genutzt);
      // Abnahme 31.10. S3: F, df und p des Gesamttests fehlten (p stand als „-“) - Sollwerte aus summary(lm(…, weights))$fstatistic und pf()
      nah(e.f!, soll.f, 1e-6, 'F'); expect(e.fDf1).toBe(soll.f_df1); expect(e.fDf2).toBe(soll.f_df2); expect(e.fP, 'p (F) darf nicht fehlen').not.toBeNull(); nah(e.fP!, soll.f_p, 1e-6, 'p (F)');
      expect(e.nullen).toBe(av(soll.w).filter(v => v === 0).length);
    }, 300000);
  }
  it('Gewichtete Regression: ein negatives oder fehlendes Gewicht sperrt mit einem Satz, ohne R aufzurufen', async () => {
    const soll = E.wls.find(x => x.name === 'cars_1_durch_x')!;
    const neg = av(soll.w).map((v, i) => (i === 4 ? -1 : v)), fehlt = av(soll.w).map((v, i) => (i === 4 ? null : v)) as (number | null)[];
    await expect(wlsRechnen('dist', ['speed'], 'w', sitzung({ dist: av(soll.y), speed: av(soll.x), w: neg }))).rejects.toThrow(/negativ|negative/);
    await expect(wlsRechnen('dist', ['speed'], 'w', sitzung({ dist: av(soll.y), speed: av(soll.x), w: fehlt }))).rejects.toThrow(/fehlt|missing/);
  }, 300000);
});
