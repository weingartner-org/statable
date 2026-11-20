import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rQ, rBool, rZahl, rGanz, rWahl } from './rsicher';
import { rZuJson, rDataFrameCode, type RSpalte } from './webr';
import { katDaten, type RAufruf } from '../lib/kategreg';
import { quantilAufruf, quantilIntervall } from '../lib/quantil';
import { strafAufruf } from '../lib/strafreg';
import { clusterSchnitt } from '../lib/cluster';
import type { Spalte } from '../lib/verzeichnis';
import type { Wert } from '../lib/eingabe';
import ERW from '../lib/testdaten/spaeter-e-erwartet.json';

/* Später, Welle S-E: Quantilregression (quantreg), Strafregression (glmnet), Ward und k-Means in webR gegen die Sollwerte aus R am Mac. ROTE TESTS des Sollwert-Prüfers
 * (Fachblatt docs/fachblaetter/SPAETER-E-VORHERSAGE-ZEITREIHEN-CLUSTER.md, „Entscheidungen Opus (18.10.)“). Der Bauer darf diese Datei und die JSON nicht ändern.
 * Bauer A: bringt quantreg 6.1 und glmnet 5.1 (samt SparseM, MatrixModels, foreach, iterators, shape, codetools) ins webR-Repo und baut `sp_quantil` und `sp_glmnet` in
 * `engine/statable-vorhersage-e.R` (wird hier von der Platte gelesen). Bauer B: baut `sp_cluster_ward` und `sp_cluster_kmeans` in `engine/statable-zeitcluster.R` (nur R-Basis stats).
 * Sollwerte: scripts/spaeter-e-erwartet.R → lib/testdaten/spaeter-e-erwartet.json (R 4.6.1, quantreg 6.1, glmnet 5.1; zweite Quellen im Skript).
 * Stopp-Regel (Opus 10): läuft glmnet in webR nicht, wird Ridge/Lasso NICHT in JS nachgebaut; dann bleiben nur die glmnet-Tests rot, der Bericht geht an Opus.
 *
 * ---------- VERTRAG DER R-FUNKTIONEN (jede wirft nie: Fehler = list(fehler = Text); Skalare dürfen als Vektor der Länge 1 ankommen; alle Zahlen und Texte UNBENANNT) ----------
 * Eingabe immer d = data.frame (Spalten wie RMotor.daten: Zahlen als Zahl, Gruppen als factor mit der Vergleichsgruppe als ERSTER Stufe; die R-Funktion sortiert nichts um). Fehlende Werte listenweise.
 *
 * sp_quantil(d, ziel, praed, faktoren, tau, ki, B, startwert)    ziel/praed/faktoren: Namen; tau: Zahlen; ki: 'boot' | 'nid' | 'rang'; B, startwert: ganze Zahlen
 *    X <- model.matrix(~ praed) (Konstante zuerst); je tau: rq.fit.br; Verlust = Σ ρ_tau(Residuen); boot: RNGkind('Mersenne-Twister', 'Inversion', 'Rejection'); set.seed(startwert) VOR JEDEM tau,
 *    dann quantreg::boot.rq(X, y, tau, R = B, bsmethod = 'xy')$B; nid: summary(rq(y ~ X - 1, tau), se = 'nid'); rang: summary(…, se = 'rank', alpha = .05, iid = FALSE) im tryCatch
 *    → { n, ausgelassen, tau, namen (Spalten von X), ki_art, ergebnisse: [ { tau, b, verlust, warnungen (eindeutige R-Meldungen von Anpassung und summary),
 *          boot: { B, se (sd je Spalte, n − 1), spalten: [ B Werte je Koeffizient ] }      (nur ki 'boot'; das Perzentil-Intervall rechnet JS: lib/quantil.ts quantilIntervall)
 *          nid: { se, t, p, df = n − p }                                                   (nur ki 'nid')
 *          rang: { unten, oben } | rang_fehler: Text der R-Meldung                         (nur ki 'rang')
 *       } ], ols: { b, se, unten, oben, r2, df } }                                          (lm; 95-%-KI mit confint)
 * sp_glmnet(d, ziel, praed, faktoren, alpha, foldids, regel, standardisieren)    foldids: Liste ganzer Vektoren (eine Faltung je Wiederholung, aus JS); regel 'se1' | 'min'
 *    vollständige Fälle; X <- model.matrix(~ praed)[, -1]; konstante Spalten vorher heraus (Namen in `konstant`); glmnet(X, y, alpha, standardize, control = list(thresh = 1e-14)) → lambda-Folge;
 *    je Wiederholung cv.glmnet(X, y, alpha, foldid, lambda = Folge, standardize, control = list(thresh = 1e-14)); cvm und cvsd = Mittel über die Wiederholungen; lambda.min/1se wie getOptcv.glmnet
 *    → { n, ausgelassen, alpha, regel, standardisieren, namen, konstant, lambda, nzero, cvm, cvsd, lambda_min, lambda_1se, lambda_gewaehlt, cvm_min, cvsd_min, cvm_1se, cvsd_1se, cv_fehler, cv_se,
 *        konstante, koef (Originalskala), sx (sd mit 1/n), std_koef (= koef·sx), df (Zahl der Koeffizienten ≠ 0), nullfehler (mean((y − mean(y))²)), train_pen (mittlerer quadrierter Trainingsfehler),
 *        train_ols (derselbe der gewöhnlichen Regression, NULL wenn p + 1 >= n), wiederholungen: [ { lambda_min, lambda_1se, lambda, gewaehlt (Namen der Koeffizienten ≠ 0) } ], pfad_std: [ je Größe b·sx über die lambda ], warnungen }
 * sp_cluster_ward(d, merkmale, standardisieren, ks)    vollständige Fälle über die Merkmale; z = scale(X) bzw. roh; hclust(dist(Z), 'ward.D2'); cutree für jedes k in ks
 *    → { n, ausgelassen, zeilen (1-basierte Zeilennummern der gerechneten Fälle in d), merge_a, merge_b (Spalten von hclust$merge), hoehe, order, ks, zuordnung: [ cutree-Vektor je k ] }
 * sp_cluster_kmeans(d, merkmale, standardisieren, k, nstart, startwert, start_zeilen)    start_zeilen NULL: Startzeilen je Start u[sample.int(length(u), k)] mit u = which(!duplicated(Z)) nach
 *    RNGkind(…, 'Rejection'); set.seed(startwert); sonst genau diese Zeilen (ein Start). Jeder Start: kmeans(Z, Z[zeilen, ], iter.max = 100, algorithm = 'Hartigan-Wong') - bei Abbruch (Fehler/Warnung)
 *    Rückfall auf 'Lloyd' (rueckfall = TRUE). Bester Start = kleinste tot.withinss. length(u) < k: Fehler „more cluster centers than distinct data points.“
 *    → { n, ausgelassen, zeilen, k, zuordnung (R-Nummern), zentren (Liste je Cluster, auf der Skala der Rechnung = z bzw. roh), groesse, wss_je, wss, totss, zwischen_anteil, algorithmus, rueckfall,
 *        beste_x (Zahl der Starts mit WSS relativ 1e-9 gleich dem kleinsten), starts, wss_starts }
 * Alle vier lesen NUR Daten und Zahlen; Namen aus den Daten gehen nie in den Code (Sicherheit: Abschnitt „Injektion“ unten). */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const repoOrdner = join(webrOrdner, 'repo/bin/emscripten/contrib/4.6');
const dateiA = process.env.STATABLE_VORHERSAGE_E_R ?? join(import.meta.dirname, 'statable-vorhersage-e.R');   // Umgebungsvariable nur zum Ausprobieren einer anderen Fassung
const dateiB = process.env.STATABLE_ZEITCLUSTER_R ?? join(import.meta.dirname, 'statable-zeitcluster.R');
const da = existsSync(join(webrOrdner, 'webr.mjs')) && existsSync(join(webrOrdner, 'manifest.json'));

type Z = Record<string, any>;
const J = ERW as unknown as Z;
const DATEN = J.daten as Z, LABELS = J.gruppen_labels as Record<string, string[]>;
const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
const istNull = (x: any) => x == null || (Array.isArray(x) && x.length === 0) || (typeof x === 'object' && !Array.isArray(x) && (x as Z).type === 'null');
const zeilen = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
const rLit = (x: unknown): string => (x === null || x === undefined ? 'NULL' : typeof x === 'string' ? rQ(x) : typeof x === 'boolean' ? rBool(x) : Array.isArray(x) ? (x.length === 0 ? 'character(0)' : x.length === 1 ? `c(${rLit(x[0])})` : `c(${x.map(rLit).join(', ')})`) : rZahl(x));   // SICHERHEIT: nur sichere Namen und endliche Zahlen (engine/rsicher.ts)
const rInts = (x: number[]) => `c(${x.map(rGanz).join(', ')})`;

/** Vergleich Zahl: Toleranz relativ, bei Werten unter 1 absolut (wie das Skript). */
const nah = (ist: any, soll: number, tol: number, was: string) => {
  const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number');
  expect(Math.abs(i - soll), `${was} (ist ${i}, soll ${soll})`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
};
const pNah = (ist: any, soll: number, was: string) => {
  const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet`).toBe('number');
  if (soll === 0 || soll < 1e-300) { expect(i, was).toBeLessThan(1e-100); return; }
  expect(Math.abs(Math.log(i / soll)), `${was} (ist ${i}, soll ${soll})`).toBeLessThan(1e-6);
};
/** Rekursiv Feld für Feld. `ohne`: Pfade, die nicht verglichen werden. */
function vergleiche(ist: any, soll: any, tol: number, pfad: string, ohne: RegExp | null = null): void {
  if (ohne && ohne.test(pfad)) return;
  if (soll === null) { expect(istNull(ist), `${pfad}: null erwartet, ist ${JSON.stringify(ist)}`).toBe(true); return; }
  if (Array.isArray(soll)) {
    if (soll.length === 0) { expect(istNull(ist), `${pfad}: leere Liste erwartet, ist ${JSON.stringify(ist)}`).toBe(true); return; }
    const l = zeilen(ist); expect(l.length, `${pfad}: Länge`).toBe(soll.length);
    // Meldungen als Menge; die Zahl vor „non-positive fis“ ist plattformabhängig (wasm und Mac runden knapp verschieden), darum ohne Ziffern verglichen
    if (typeof soll[0] === 'string' && /warnungen$/.test(pfad)) { const norm = (a: string[]) => a.map(x => x.replace(/\d+ non-positive fis/, 'n non-positive fis')).sort(); expect(norm(l), pfad).toEqual(norm(soll)); return; }
    soll.forEach((v, k) => vergleiche(l[k], v, tol, `${pfad}[${k}]`, ohne)); return;
  }
  if (typeof soll === 'object') { for (const [k, v] of Object.entries(soll)) { expect(ist, `${pfad}: Objekt erwartet`).toBeTruthy(); vergleiche((ist as Z)[k], v, tol, `${pfad}.${k}`, ohne); } return; }
  if (typeof soll === 'number') {
    if (/(^|\.)p(\[\d+\])?$/.test(pfad) && soll < 0.1) pNah(ist, soll, pfad);
    else if (/\.(n|df|ausgelassen|B|starts|beste_x|nzero|k|algorithmus)(\[\d+\])?$/.test(pfad)) expect(eins(ist), pfad).toBe(soll);
    else nah(ist, soll, tol, pfad); return;
  }
  expect(eins(ist), pfad).toBe(soll);
}
/** Gleiche Partition, gleichgültig wie die Nummern vergeben sind (erstes Auftreten = 1). */
const kanon = (l: number[]) => { const m = new Map<number, number>(); return l.map(v => { if (!m.has(v)) m.set(v, m.size + 1); return m.get(v)!; }); };

describe.skipIf(!da)('Später S-E: quantreg, glmnet, Ward und k-Means in webR gegen R am Mac (braucht: quantreg und glmnet im webR-Repo, die beiden R-Dateien in engine/)', () => {
  let server: Server; let r: any; let sh: any; const fehler: Record<string, string> = {};
  const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Z;
  const lauf = async (code: string) => rechne(`tryCatch(${code}, error = function(e) list(fehler = conditionMessage(e)))`);

  /** Spalten eines Datensatzes als data.frame d: Gruppen als factor (Stufenfolge `stufen` oder die Beschriftungen des JSON). */
  async function datenBinden(ds: string, namen: string[], faktoren: string[], stufen: Record<string, string[]> = {}) {
    const D = DATEN[ds] as Z, sp: RSpalte[] = namen.map(name => {
      const werte = zeilen(D[name]).map(v => (v == null ? null : Number(v)));
      if (!faktoren.includes(name)) return { name, art: 'zahl' as const, werte };
      const orig = LABELS[name]!, level = stufen[name] ?? orig;
      return { name, art: 'faktor' as const, werte: werte.map(v => (v == null ? null : level.indexOf(orig[v - 1]!) + 1)), labels: level.map((l, i) => ({ wert: i + 1, label: l })) };
    });
    await rDatenBinden('d', sp);
  }
  async function rDatenBinden(name: string, spalten: RSpalte[]) {
    const werte: Record<string, unknown> = {}, lab: Record<string, unknown> = {};
    for (const sp of spalten) {
      werte[sp.name] = await new r.RDouble(sp.werte.map((v: any) => (v == null ? null : Number(v))));
      lab[sp.name] = sp.art === 'faktor' && sp.labels ? await new r.RList({ wert: await new r.RDouble(sp.labels.map(l => Number(l.wert))), label: await new r.RCharacter(sp.labels.map(l => l.label)) }) : await new r.RList({});
    }
    const g = r.objs.globalEnv;
    await g.bind('.sp_werte', await new r.RList(werte)); await g.bind('.sp_art', await new r.RCharacter(spalten.map(s => s.art))); await g.bind('.sp_lab', await new r.RList(lab));
    await r.evalRVoid(rDataFrameCode(name, spalten) + '\nrm(.sp_werte, .sp_art, .sp_lab)');
  }
  const spaltenVon = (f: Z) => [f.ziel, ...(f.praed as string[])] as string[];

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
    for (const p of ['quantreg', 'glmnet']) { try { await r.installPackages([p], { quiet: true }); await r.evalRVoid(`suppressMessages(library(${p}))`); } catch (e) { fehler[p] = String((e as Error)?.message ?? e) || 'Fehler ohne Meldung'; } }
    sh = await new r.Shelter();
    for (const f of [dateiA, dateiB]) if (existsSync(f)) await rechne(`{ ${readFileSync(f, 'utf8')}\nTRUE }`);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  /* ---------------------------------------------------------------- Pakete und Dateien */
  it('quantreg 6.1 und glmnet 5.1 sind aus dem webR-Repo installierbar und laden (Zeit: Paketladen messen, docs/WEBR-QUANTREG-GLMNET-MESSUNG-….md)', async () => {
    expect(existsSync(join(repoOrdner, 'quantreg_6.1.tgz')), 'quantreg_6.1.tgz fehlt im webR-Repo (Bauer A: scripts/webr-holen.sh, Manifest, Prüfsummen)').toBe(true);
    expect(existsSync(join(repoOrdner, 'glmnet_5.1.tgz')), 'glmnet_5.1.tgz fehlt im webR-Repo').toBe(true);
    expect(fehler.quantreg ?? '', 'quantreg').toBe(''); expect(fehler.glmnet ?? '', 'glmnet (Stopp-Regel: Bericht an Opus, nicht in JS nachbauen)').toBe('');
    const o = await rechne(`c(q = as.character(packageVersion('quantreg')), g = as.character(packageVersion('glmnet')))`); expect([eins(o.q), eins(o.g)]).toEqual(['6.1', '5.1']);
  });
  it('die R-Dateien liegen da und definieren die vier Funktionen', async () => {
    expect(existsSync(dateiA), 'engine/statable-vorhersage-e.R fehlt').toBe(true); expect(existsSync(dateiB), 'engine/statable-zeitcluster.R fehlt').toBe(true);
    const o = await rechne(`c(q = exists('sp_quantil'), g = exists('sp_glmnet'), w = exists('sp_cluster_ward'), k = exists('sp_cluster_kmeans'))`); expect([eins(o.q), eins(o.g), eins(o.w), eins(o.k)]).toEqual([true, true, true, true]);
  });
  it('Zufall: gleicher Startwert gibt in webR dieselben Zufallszahlen wie am Mac (Mersenne-Twister, Inversion, Rejection)', async () => {
    const o = await rechne(`{ RNGkind('Mersenne-Twister', 'Inversion', 'Rejection'); set.seed(20261008L); list(u = runif(1), s = sample(1000L, 1L), n = rnorm(1)) }`), z = J.zufall_probe as Z;
    nah(o.u, z.u, 1e-15, 'runif'); expect(eins(o.s)).toBe(z.s); nah(o.n, z.n, 1e-15, 'rnorm');
  });

  /* ---------------------------------------------------------------- Quantilregression */
  const Q = J.quantil.faelle as Record<string, Z>;
  const quantilAnruf = (f: Z) => `sp_quantil(d, ${rQ(f.ziel)}, ${rLit(f.praed)}, ${rLit(f.faktoren ?? [])}, ${rLit(f.tau)}, ${rQ(f.ki)}, ${rGanz(f.B)}, ${rGanz(f.startwert)})`;
  const quantilLauf = async (name: string) => {
    const f = Q[name]!.frage as Z; await datenBinden(f.daten, spaltenVon(f), f.faktoren ?? [], f.faktor_stufen ?? {}); return lauf(quantilAnruf(f));
  };
  for (const name of Object.keys(Q)) {
    it(`Quantilregression ${name}: Koeffizienten, Verlust, Warnungen, Intervall-Angaben und OLS gleich R am Mac`, async () => {
      const soll = Q[name]!.soll as Z, o = await quantilLauf(name);
      if (soll.fehler_enthaelt) { expect(o.fehler, 'R-Fehler als Text, nie geworfen').toMatch(new RegExp(soll.fehler_enthaelt)); return; }
      expect(o.fehler, `R-Fehler: ${o.fehler}`).toBeUndefined();
      vergleiche(o, soll, 1e-8, name, /\.boot\.(se|spalten|pruef|unten|oben)$|\.boot\.pruef/);
      const ergs = zeilen(o.ergebnisse) as Z[], exakt = !!(Q[name]!.soll.ergebnisse as Z[])[0]!.boot?.spalten;
      ergs.forEach((e, i) => {
        const se = (soll.ergebnisse as Z[])[i]!.boot as Z | undefined; if (!se) return;
        const sp = zeilen(e.boot.spalten).map(c => zeilen(c) as number[]); expect(sp.length, `${name} τ#${i}: Spalten`).toBe(zeilen(soll.namen).length);
        sp.forEach((col, j) => {
          expect(col.length).toBe(se.B); const b0 = zeilen(soll.ergebnisse[i].b)[j], iv = quantilIntervall(col, b0, 0.95), seS = zeilen(se.se)[j];
          if (exakt) {
            // eindeutige Lösungen (Engel, stetige Daten): dieselben Ziehungen ⇒ dieselbe Matrix, Spalte für Spalte
            col.forEach((v, k) => nah(v, se.spalten[j][k], 1e-9, `${name} Bootstrap[${k}][${j}]`)); nah(iv.se, seS, 1e-9, `${name} SE ${j}`); nah(iv.unten, zeilen(se.unten)[j], 1e-9, `${name} Perzentil unten ${j}`); nah(iv.oben, zeilen(se.oben)[j], 1e-9, `${name} Perzentil oben ${j}`);
          } else {
            // diskrete Daten (quant.csv, kleine Beispiele): die Anpassung einzelner Ziehungen ist nicht eindeutig („Solution may be nonunique“), wasm und Mac wählen dann zuweilen eine andere Ecke -
            // gleiche Ziehungen, aber Abweichungen im Bereich 1e-5 der SE. Verlangt wird: SE auf 1 %, Grenzen auf 2 % der SE, Mittelwert der Ziehungen auf 2 % der SE.
            const p = se.pruef[j]; expect(col.length).toBe(p.n); nah(iv.se, seS, 1e-2, `${name} SE ${j}`); expect(Math.abs(iv.unten - zeilen(se.unten)[j]), `${name} Perzentil unten ${j}`).toBeLessThanOrEqual(0.02 * seS + 1e-9); expect(Math.abs(iv.oben - zeilen(se.oben)[j]), `${name} Perzentil oben ${j}`).toBeLessThanOrEqual(0.02 * seS + 1e-9);
            expect(Math.abs(col.reduce((a, b) => a + b, 0) / col.length - p.summe / p.n), `${name} Mittel ${j}`).toBeLessThanOrEqual(0.02 * seS + 1e-9);
          }
        });
      });
    });
  }
  it('Engel τ = ,5 (gedruckt in Koenkers Anleitung): Konstante 81,4822 und Steigung 0,5602, Rang-Grenzen der Steigung 0,46615 / 0,61789 (95 %, iid = FALSE)', async () => {
    const o = await quantilLauf('engel_rang_sieben'); const e = zeilen(o.ergebnisse)[3] as Z; nah(zeilen(e.b)[0], 81.4822474, 1e-7, 'Konstante'); nah(zeilen(e.b)[1], 0.5601806, 1e-6, 'Steigung'); nah(e.verlust, 8779.9663, 1e-7, 'Verlust');
    nah(zeilen(e.rang.unten)[1], 0.46615139, 1e-6, 'unten'); nah(zeilen(e.rang.oben)[1], 0.61788592, 1e-6, 'oben');
  });
  it('Rang-Umkehr bricht ab (n = 30, τ = ,9): rang_fehler statt Absturz, die Anpassung selbst bleibt', async () => {
    const o = await quantilLauf('rand30_rang'); const e = zeilen(o.ergebnisse)[0] as Z; expect(String(eins(e.rang_fehler))).toMatch(/non-conformable/); expect(e.rang).toBeUndefined(); expect(zeilen(e.b).length).toBe(2);
  });
  it('Median bei geradem n: R meldet „Solution may be nonunique“ und nennt die Ecke 4 (nicht den Median 3,5)', async () => {
    const o = await quantilLauf('gerade_nid'); const e = zeilen(o.ergebnisse)[0] as Z; expect(zeilen(e.b)).toEqual([4, 9]); expect(zeilen(e.warnungen).join(' ')).toMatch(/nonunique/);
  });
  it('Rangmangel (zwei gleiche Vorhersagegrößen): list(fehler = „Singular design matrix“), kein Absturz', async () => {
    await datenBinden('rangmangel', ['y', 'a', 'b'], []); const o = await lauf(`sp_quantil(d, 'y', c('a', 'b'), character(0), c(0.5), 'boot', 100L, 20261008L)`); expect(String(eins(o.fehler))).toMatch(/Singular design matrix/);
    expect(String(eins(o.fehler))).toBe(J.quantil.fehler_rangmangel);
  });
  it('fehlende Werte listenweise: quant.csv hat 3 Zeilen mit Lücken → n = 147, ausgelassen = 3', async () => { const o = await quantilLauf('quant_nid'); expect([eins(o.n), eins(o.ausgelassen)]).toEqual([147, 3]); });
  it('Vergleichsgruppe wechseln (B, A, C): andere Koeffizientennamen und Werte, wie in R', async () => {
    const o = await quantilLauf('quant_vergleich_b'); expect(zeilen(o.namen)).toEqual(zeilen(Q.quant_vergleich_b!.soll.namen)); expect(zeilen(o.namen).some((x: string) => /gruppeA/.test(x)) && !zeilen(o.namen).some((x: string) => /gruppeB/.test(x))).toBe(true);
  });
  it('gleicher Startwert ⇒ gleiche Matrix; anderer Startwert ⇒ andere (Bootstrap reproduzierbar)', async () => {
    const f = { ...(Q.quant_boot!.frage as Z), tau: [0.5], B: 200 } as Z; await datenBinden(f.daten, spaltenVon(f), f.faktoren, {});
    const a = await lauf(quantilAnruf(f)), b = await lauf(quantilAnruf(f)), c = await lauf(quantilAnruf({ ...f, startwert: 20261009 }));
    const col = (x: Z) => zeilen(zeilen(x.ergebnisse)[0].boot.spalten)[1]; expect(col(a)).toEqual(col(b)); expect(col(a)).not.toEqual(col(c));
  });
  it('Spaltennamen voller Anführungszeichen (Injektion): die echte Aufruf-Funktion der App gibt dieselben Zahlen, die Falle löst nie aus', async () => {
    const GEFAHR = [`x'); assign('.pwned', TRUE, globalenv()); ('`, `a\`; assign('.pwned', TRUE, globalenv()); \`b`];
    const D = DATEN.engel as Z, n = zeilen(D.income).length;
    const mach = (namen: [string, string]) => { const sp: Spalte[] = namen.map(name => ({ name, bezeichnung: name, art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {} }) as Spalte); const z: Wert[][] = Array.from({ length: n }, (_, i) => [D.foodexp[i], D.income[i]]); return katDaten('zaehlreg', namen[0], [namen[1]], z, sp); };
    const lieferung = async (dt: ReturnType<typeof mach>, a: RAufruf) => { await rDatenBinden('d', dt.spalten); const l: Record<string, unknown> = {}; for (const [k, v] of Object.entries(a.args)) l[k] = await new r.RCharacter(Array.isArray(v) ? v : [v]); await r.objs.globalEnv.bind('.sp_arg', await new r.RList(l)); return rechne(a.code); };
    const op = { tau: [0.25, 0.5, 0.75], ki: 'nid' as const, B: 200, startwert: 20261008 };
    const dtA = mach(['foodexp', 'income']), dtB = mach([`z${GEFAHR[0]}`, `p${GEFAHR[1]}`]); const a = await lieferung(dtA, quantilAufruf(dtA, op)), b = await lieferung(dtB, quantilAufruf(dtB, op));
    expect(a.fehler, `harmlos: ${a.fehler}`).toBeUndefined(); expect(b.fehler, `gefährlich: ${b.fehler}`).toBeUndefined(); vergleiche(b, a, 1e-12, 'Injektion');
    const falle = await rechne(`exists('.pwned', envir = globalenv())`); expect(eins(falle)).toBe(false);
  });

  /* ---------------------------------------------------------------- Strafregression */
  const G = J.strafreg.faelle as Record<string, Z>;
  const glmnetAnruf = (f: Z) => `sp_glmnet(d, ${rQ(f.ziel)}, ${rLit(f.praed)}, ${rLit(f.faktoren ?? [])}, ${rZahl(f.alpha)}, list(${(f.foldids as number[][]).map(rInts).join(', ')}), ${rWahl(f.regel, ['se1', 'min'] as const)}, ${rBool(f.standardisieren)})`;
  const glmnetLauf = async (name: string, aendern: (f: Z) => Z = f => f) => {
    const f = aendern(G[name]!.frage as Z); const praed = (f.praed as string[]); let ds = f.daten as string;
    if (f.konstante_spalte) { const D = DATEN[ds] as Z, n = zeilen(D[f.ziel]).length; (DATEN as Z)[`${ds}__k`] = { ...D, K: Array(n).fill(3) }; ds = `${ds}__k`; }
    await datenBinden(ds, [f.ziel, ...praed], f.faktoren ?? [], f.faktor_stufen ?? {}); return lauf(glmnetAnruf(f));
  };
  for (const name of Object.keys(G)) {
    it(`Strafregression ${name}: lambda-Folge, Kreuzvalidierung, Wahl, Koeffizienten, Wiederholungen, Pfad gleich glmnet am Mac`, async () => {
      const o = await glmnetLauf(name), soll = G[name]!.soll as Z; expect(o.fehler, `R-Fehler: ${o.fehler}`).toBeUndefined();
      vergleiche(o, soll, 1e-6, name);
      for (const k of ['lambda_min', 'lambda_1se', 'lambda_gewaehlt']) nah(o[k], soll[k], 1e-12, `${name} ${k}: dasselbe lambda der Folge (gleiche Folge, gleiche Faltung)`);
      expect(zeilen(o.lambda).findIndex((v: number) => Math.abs(v - eins(o.lambda_gewaehlt)) < 1e-12 * v), `${name}: das gewählte lambda steht in der Folge`).toBeGreaterThanOrEqual(0);
      expect(String(eins(o.regel))).toBe(soll.regel);
    });
  }
  it('QuickStart (gedruckt in der glmnet-Vignette): lambda_max 1,630762, 67 Werte; Lasso 1se: lambda 0,1322761 mit 8 Koeffizienten ≠ 0', async () => {
    const o = await glmnetLauf('qs_lasso'); expect(zeilen(o.lambda).length).toBe(67); nah(zeilen(o.lambda)[0], 1.630762, 1e-6, 'lambda_max'); nah(o.lambda_1se, 0.1322761, 1e-5, 'lambda.1se'); expect(eins(o.df)).toBe(8);
  });
  it('Faltungen aus JS sind Eingabe: eine andere Faltung gibt eine andere Fehlerkurve (die Zahlen hängen an ihr), die lambda-Folge bleibt', async () => {
    const a = await glmnetLauf('qs_lasso'), b = await glmnetLauf('qs_lasso', f => ({ ...f, foldids: [Array.from({ length: 100 }, (_, i) => Math.floor(i / 10) + 1)] }));
    expect(zeilen(a.cvm)).not.toEqual(zeilen(b.cvm)); expect(zeilen(a.lambda)).toEqual(zeilen(b.lambda));   // die Fehlerkurve hängt an der Faltung, die lambda-Folge der Gesamtdaten nicht
  });
  it('fehlende Werte listenweise: vorhersage_glm hat 3 Lücken in X7 → n = 117, ausgelassen = 3; Vergleichsgruppe wechseln ändert die Auswahl', async () => {
    const a = await glmnetLauf('vg_lasso'), b = await glmnetLauf('vg_lasso_vergleich_b'); expect([eins(a.n), eins(a.ausgelassen)]).toEqual([117, 3]);
    const mengeA = zeilen(a.koef).map((v: number, i: number) => (v !== 0 ? zeilen(a.namen)[i] : null)).filter(Boolean).join(), mengeB = zeilen(b.koef).map((v: number, i: number) => (v !== 0 ? zeilen(b.namen)[i] : null)).filter(Boolean).join();
    expect(mengeA).not.toBe(mengeB); expect(zeilen(b.namen)).toContain('grA'); expect(zeilen(b.namen)).not.toContain('grB');
  });
  it('konstante Spalte K: herausgenommen (Name in `konstant`), Ergebnis wie ohne sie', async () => {
    const o = await glmnetLauf('vg_lasso_konstant'), ohne = await glmnetLauf('vg_lasso'); expect(zeilen(o.konstant)).toEqual(['K']); expect(zeilen(o.namen)).not.toContain('K'); vergleiche(o.koef, zeilen(ohne.koef), 1e-12, 'koef');
  });
  it('p > n (30 Fälle, 40 Spalten): läuft, train_ols ist null, höchstens 100 lambda', async () => {
    const o = await glmnetLauf('pn_lasso'); expect(o.fehler).toBeUndefined(); expect(istNull(o.train_ols)).toBe(true); expect(zeilen(o.lambda).length).toBeLessThanOrEqual(100); expect(zeilen(o.namen).length).toBe(40);
  });
  it('ohne Standardisierung: lambda.1se 0,2128, alle zehn Größen (Fachblatt 2.11)', async () => { const o = await glmnetLauf('vg_lasso_ohne_std'); nah(o.lambda_1se, 0.21282, 1e-4, 'lambda.1se'); expect(eins(o.df)).toBe(10); expect(eins(o.standardisieren)).toBe(false); });
  it('fünf Wiederholungen: je Wiederholung eigene Auswahl in `wiederholungen`, Mittel der Kurven; die Auswahl blieb in 4 von 5 gleich', async () => {
    const o = await glmnetLauf('vg_lasso_wdh5'); const w = zeilen(o.wiederholungen) as Z[]; expect(w.length).toBe(5);
    const mengen = w.map(x => zeilen(x.gewaehlt).slice().sort().join('|')); const zaehl = new Map<string, number>(); mengen.forEach(m => zaehl.set(m, (zaehl.get(m) ?? 0) + 1)); expect(Math.max(...zaehl.values())).toBe(J.strafreg_js.stabilitaet_wdh5.haeufigste);
  });
  it('Spaltennamen voller Anführungszeichen (Injektion): Strafregression mit der echten Aufruf-Funktion, gleiche Zahlen, Falle löst nie aus', async () => {
    const GEFAHR = [`x'); assign('.pwned', TRUE, globalenv()); ('`, `a\`; assign('.pwned', TRUE, globalenv()); \`b`, `q"); assign('.pwned', TRUE, globalenv()); ("`, `n\nassign('.pwned', TRUE, globalenv())\n`];
    const D = DATEN.vorhersage_glm as Z, n = zeilen(D.y).length, namen = ['y', 'X1', 'X2', 'X3', 'X5'];
    const mach = (nn: string[]) => { const sp: Spalte[] = nn.map(name => ({ name, bezeichnung: name, art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {} }) as Spalte); const z: Wert[][] = Array.from({ length: n }, (_, i) => namen.map(c => D[c][i])); return katDaten('zaehlreg', nn[0]!, nn.slice(1), z, sp); };
    const lieferung = async (dt: ReturnType<typeof mach>, a: RAufruf) => { await rDatenBinden('d', dt.spalten); const l: Record<string, unknown> = {}; for (const [k, v] of Object.entries(a.args)) l[k] = await new r.RCharacter(Array.isArray(v) ? v : [v]); await r.objs.globalEnv.bind('.sp_arg', await new r.RList(l)); return rechne(a.code); };
    const folds = [Array.from({ length: n }, (_, i) => (i % 10) + 1)], op = { alpha: 1, foldids: folds, regel: 'se1' as const, standardisieren: true };
    const dtA = mach(namen), dtB = mach(namen.map((x, i) => `${x}${GEFAHR[i % GEFAHR.length]}_${i}`)); const a = await lieferung(dtA, strafAufruf(dtA, op)), b = await lieferung(dtB, strafAufruf(dtB, op));
    expect(a.fehler, `harmlos: ${a.fehler}`).toBeUndefined(); expect(b.fehler, `gefährlich: ${b.fehler}`).toBeUndefined(); vergleiche(b.koef, zeilen(a.koef), 1e-12, 'koef'); expect(eins(b.lambda_gewaehlt)).toBe(eins(a.lambda_gewaehlt));
    expect(eins(await rechne(`exists('.pwned', envir = globalenv())`))).toBe(false);
  });

  /* ---------------------------------------------------------------- Clusteranalyse */
  const CL = J.cluster_r as Record<string, Z>;
  const clusterDaten = async (f: Z) => datenBinden(f.daten, f.merkmale as string[], []);
  for (const name of Object.keys(CL).filter(k => k.endsWith('_ward_z') || k === 'ausreisser_ward')) {
    it(`Ward ${name}: merge, Höhen (ward.D2), order, Schnitte und Zeilennummern gleich R`, async () => {
      const f = CL[name]!.frage as Z, soll = CL[name]!.soll as Z; await clusterDaten(f);
      const o = await lauf(`sp_cluster_ward(d, ${rLit(f.merkmale)}, ${rBool(f.standardisieren)}, ${rInts(f.ks)})`); expect(o.fehler, `R-Fehler: ${o.fehler}`).toBeUndefined();
      for (const k of ['n', 'ausgelassen', 'zeilen', 'ks']) expect(zeilen(o[k]), k).toEqual(zeilen(soll[k]));
      zeilen(soll.hoehe).forEach((h: number, i: number) => nah(zeilen(o.hoehe)[i], h, 1e-9, `Höhe ${i}`)); expect(zeilen(o.zuordnung).length).toBe(zeilen(soll.zuordnung).length);
      // Gleichstände (iris hat doppelte Zeilen): die Reihenfolge gleich hoher Verschmelzungen darf zwischen R am Mac und webR wechseln - verglichen werden Höhen und Schnitte, nicht merge/order Zeile für Zeile
      zeilen(soll.zuordnung).forEach((z: number[], i: number) => expect(kanon(zeilen(zeilen(o.zuordnung)[i])), `Schnitt k = ${zeilen(soll.ks)[i]}`).toEqual(kanon(zeilen(z))));
      const nn = eins(o.n) as number, ma = zeilen(o.merge_a) as number[], mb = zeilen(o.merge_b) as number[], ord = zeilen(o.order) as number[];
      expect(ma.length).toBe(nn - 1); expect(mb.length).toBe(nn - 1); expect([...ord].sort((a, b) => a - b)).toEqual(Array.from({ length: nn }, (_, i) => i + 1));
      const benutzt = [...ma, ...mb]; expect(new Set(benutzt).size, 'jeder Einzelfall und jede Verschmelzung genau einmal als Teil benutzt').toBe(2 * (nn - 1));
      zeilen(soll.ks).forEach((k: number, i: number) => expect(kanon(clusterSchnitt(ma, mb, nn, k)), `Schnitt aus merge, k = ${k}`).toEqual(kanon(zeilen(zeilen(o.zuordnung)[i]))));
    });
  }
  for (const name of Object.keys(CL).filter(k => k.includes('_kmeans_'))) {
    it(`k-Means ${name}: ${CL[name]!.frage.start_zeilen ? 'fester Start (Hartigan-Wong)' : `${CL[name]!.frage.nstart} Starts mit Startwert ${CL[name]!.frage.startwert}`}: Zuordnung, Zentren, Streuung, „beste Lösung in x von n“`, async () => {
      const f = CL[name]!.frage as Z, soll = CL[name]!.soll as Z; await clusterDaten(f);
      const o = await lauf(`sp_cluster_kmeans(d, ${rLit(f.merkmale)}, ${rBool(f.standardisieren)}, ${rGanz(f.k)}, ${rGanz(f.nstart)}, ${rGanz(f.startwert)}, ${f.start_zeilen ? rInts(f.start_zeilen) : 'NULL'})`); expect(o.fehler, `R-Fehler: ${o.fehler}`).toBeUndefined();
      expect(eins(o.algorithmus)).toBe('Hartigan-Wong'); expect(eins(o.rueckfall)).toBe(false); expect([eins(o.n), eins(o.ausgelassen), eins(o.k), eins(o.starts)]).toEqual([soll.n, soll.ausgelassen, soll.k, soll.starts]); expect(zeilen(o.zeilen)).toEqual(zeilen(soll.zeilen));
      nah(o.wss, soll.wss, 1e-9, 'WSS'); nah(o.totss, soll.totss, 1e-9, 'TSS'); nah(o.zwischen_anteil, soll.zwischen_anteil, 1e-9, 'Anteil zwischen');
      expect(kanon(zeilen(o.zuordnung)), 'Partition').toEqual(kanon(zeilen(soll.zuordnung))); expect(zeilen(o.groesse).slice().sort((a: number, b: number) => a - b)).toEqual(zeilen(soll.groesse).slice().sort((a: number, b: number) => a - b));
      if (f.start_zeilen) { expect(zeilen(o.zuordnung)).toEqual(zeilen(soll.zuordnung)); zeilen(soll.zentren).forEach((c: number[], j: number) => zeilen(c).forEach((v, m) => nah(zeilen(zeilen(o.zentren)[j])[m], v, 1e-9, `Zentrum ${j}.${m}`))); zeilen(soll.wss_je).forEach((v: number, j: number) => nah(zeilen(o.wss_je)[j], v, 1e-9, `WSS je ${j}`)); }
      expect(eins(o.beste_x), 'beste Lösung in x von n Starts').toBe(soll.beste_x); zeilen(soll.wss_starts).forEach((v: number, i: number) => nah(zeilen(o.wss_starts)[i], v, 1e-9, `WSS Start ${i}`));
    });
  }
  it('iris roh, k = 3 mit den PSPP-Anfangszentren: 50 / 62 / 38, Streuung 78,85144 (gedruckt in vielen Lehrbüchern und gleich PSPP QUICK CLUSTER)', async () => {
    const f = CL.iris_kmeans_roh_fest!.frage as Z; await clusterDaten(f); const o = await lauf(`sp_cluster_kmeans(d, ${rLit(f.merkmale)}, FALSE, 3L, 1L, 20261008L, ${rInts(f.start_zeilen)})`);
    expect(zeilen(o.groesse).slice().sort((a: number, b: number) => a - b)).toEqual([38, 50, 62]); nah(o.wss, 78.85144, 1e-6, 'WSS');
  });
  it('k größer als die Zahl verschiedener Fälle: list(fehler) mit „distinct“, kein Absturz', async () => {
    const f = CL.k_zu_gross!.frage as Z; await clusterDaten(f); const o = await lauf(`sp_cluster_kmeans(d, ${rLit(f.merkmale)}, FALSE, 5L, 25L, 20261008L, NULL)`); expect(String(eins(o.fehler))).toMatch(/distinct/);
  });
  it('fehlende Werte (cluster_umfrage: 2 Lücken in angst): n = 118, zeilen ohne die Zeilen 7 und 61', async () => {
    const f = CL.umfrage_ward_z!.frage as Z; await clusterDaten(f); const o = await lauf(`sp_cluster_ward(d, ${rLit(f.merkmale)}, TRUE, c(3L))`); expect([eins(o.n), eins(o.ausgelassen)]).toEqual([118, 2]);
    const z = zeilen(o.zeilen); expect(z.length).toBe(118); expect(z).not.toContain(7); expect(z).not.toContain(61);
  });
  it('Spaltennamen voller Anführungszeichen (Injektion): die Merkmale gehen als Bezeichner, die Daten kommen als Objekt', async () => {
    const GEFAHR = [`x'); assign('.pwned', TRUE, globalenv()); ('`, `a\`; assign('.pwned', TRUE, globalenv()); \`b`];
    const D = DATEN.iris as Z; const sp = (names: string[]): RSpalte[] => names.map((name, j) => ({ name, art: 'zahl' as const, werte: zeilen(D[['laenge_kelch', 'breite_kelch', 'laenge_blatt', 'breite_blatt'][j]!]) }));
    // R bekommt immer die sicheren Namen m01, m02 …; die gefährlichen stehen nur in der Anzeige (JS). Hier: die Funktion darf mit den harmlosen Namen laufen und die Falle nicht existieren.
    await rDatenBinden('d', sp(['m01', 'm02', 'm03', 'm04'])); const o = await lauf(`sp_cluster_ward(d, ${rLit(['m01', 'm02', 'm03', 'm04'])}, TRUE, c(3L))`); expect(o.fehler).toBeUndefined();
    expect(() => rQ(GEFAHR[0])).toThrow(); expect(() => rQ(GEFAHR[1])).toThrow(); expect(eins(await rechne(`exists('.pwned', envir = globalenv())`))).toBe(false);
  });
});
