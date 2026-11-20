import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson, rDataFrameCode, type RSpalte } from './webr';
import STATABLE_R from './statable.R?raw';
import ERW from '../lib/testdaten/welle7-erwartet.json';

/* Welle 7, M1 Cox-Regression in webR gegen die Sollwerte aus R am Mac. ROTE TESTS des Prüfers (Fachblatt docs/fachblaetter/WELLE7-MEDIZIN-TESTS-PCA.md, Nachtrag Punkt 5).
 * Der Bauer darf diese Datei nicht ändern; er baut `sp_cox` in engine/statable.R und bringt `survival` (3.8-x, Matrix liegt schon im Repo) ins webR-Repo und ins Manifest
 * (bash scripts/webr-holen.sh, wie nnet in Welle 3), bis sie grün ist.
 * Sollwerte: scripts/welle7-erwartet.R -> lib/testdaten/welle7-erwartet.json, Abschnitt `cox` (R 4.6.1, survival 3.8-6 am Mac; Efron = Voreinstellung, Breslow zusätzlich).
 * Zweite Quellen im Skript (stopifnot): eigene Maximierung der partiellen Likelihood (Efron und Breslow, ohne survival), cox.zph gegen Score-Test über coxph(+tt()), eigene Konkordanz-Zählung,
 * gedruckte Tutorial-Ausgabe von survival::lung (JSON: `cox.veroeffentlicht`). Ein gedruckter SPSS-Ausdruck mit Rohdaten liegt nicht vor: SPSS rechnet Breslow, die Breslow-Zahlen stehen je Fall unter `breslow`.
 *
 * EINGABE (wie lib/rverfahren.svelte.ts mit RMotor.daten und rDataFrameCode, Spalten als RSpalte):
 *   sp_cox(d, zeit, ereignis, praed, faktoren, ties = 'efron')
 *   - d: data.frame; `zeit` (Zahl, > 0 oder >= 0), `ereignis` (Zahl 0/1, 1 = Ereignis; die Oberfläche codiert vorher um, hier lung: status == 2), `praed` = Namen der Prädiktoren in der Reihenfolge der Formel,
 *     `faktoren` = Namen der Gruppen-Prädiktoren (art 'faktor': Codes 1..k mit Wertelabels, ERSTE STUFE = VERGLEICHSGRUPPE; die R-Funktion sortiert nichts um). Fehlende Werte = NA, gerechnet wird listenweise.
 *   - ties: 'efron' (Voreinstellung; so rechnet R und Statable) | 'breslow' (so rechnet SPSS COXREG; nur für die Hilfe und den Vergleich).
 *   - Spaltennamen sind beliebige gültige R-Namen (z. B. 'ph.ecog'); Koeffizientennamen wie in R: Spalte + Stufe ('sexFrauen', 'gruppeB'), metrisch = Spaltenname.
 * AUSGABE (R-Liste; Skalare dürfen als Vektor der Länge 1 ankommen; Zeilenlisten = Arrays von Objekten; sp_cox wirft nie, Fehler = list(fehler = '…')):
 *   ties, n (Fälle im Modell), ausgelassen (wegen fehlender Werte), ereignisse, npar (Zahl der Koeffizienten), epv (= ereignisse/npar), epv_hinweis (TRUE bei epv < 10; Peduzzi et al. 1995),
 *   koef[{name, b, se, z, p, hr, ki_u, ki_o}]    hr = exp(b), ki = exp(b -/+ qnorm(,975)·se), z = b/se, p = 2·pnorm(-|z|) (Wald)
 *   loglik, loglik0, modelltest{chi2, df, p}      Likelihood-Quotienten-Test des Modells (2·(loglik - loglik0), df = npar)
 *   lr_praed[{name, chi2, df, p}]                 LR je Prädiktor (Gruppen zusammen, df = Stufen - 1), auf denselben Fällen; name = Spaltenname (nicht Koeffizientenname)
 *   ph{gesamt{chi2, df, p}, praed[{name, chi2, df, p}]}   cox.zph(transform = 'km', terms = TRUE): je Prädiktor (Term) und GLOBAL; bei EINEM Prädiktor ist gesamt = praed[0]; scheitert cox.zph: `ph_fehler` (Text) statt `ph`
 *   konkordanz{c, se}                             Harrells C aus fit$concordance (beschreibend)
 *   trennung (TRUE, wenn R "coefficient may be infinite" oder "did not converge" meldet; sonst FALSE), warnungen (Text-Array der R-Warnungen, leer wenn keine)
 *   Kein Ereignis in den gültigen Fällen: list(fehler = '…') und kein koef (R rechnet hier still mit NA).
 * TOLERANZEN (relativ): B, SE, z, HR, KI, logLik, χ² 1e-6 (coxph bricht bei 1e-9 relativer Änderung der logLik ab; BLAS webR/Mac 1e-12); cox.zph-χ² 1e-5; Konkordanz 1e-9, SE der Konkordanz 1e-6;
 * p-Werte auf der log-Skala |ln(ist/soll)| < 2e-3 (ein χ² bis 75 verstärkt Rundungsfehler im p). */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const manifestPfad = join(webrOrdner, 'manifest.json');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/MASS_7.3-65.tgz')) && existsSync(manifestPfad);

type Z = Record<string, any>;
const E = ERW as unknown as { cox: { datensaetze: Record<string, { n: number; spalten: Record<string, { typ: 'zahl' | 'gruppe'; werte: (number | null)[]; labels?: string[] }> }>; faelle: Z[]; sonderfaelle: Z[]; veroeffentlicht: Z } };
const C = E.cox;

const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
const nah = (ist: any, soll: number, tol: number, was: string) => { const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Math.abs(i - soll) / Math.max(Math.abs(soll), 1e-3), `${was} (ist ${i}, soll ${soll})`).toBeLessThan(tol); };
const pNah = (ist: any, soll: number, was: string) => { const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet`).toBe('number'); if (soll === 0 || i === 0) { expect(i, was).toBe(soll); return; } expect(Math.abs(Math.log(i / soll)), `${was} (ist ${i}, soll ${soll})`).toBeLessThan(2e-3); };
const zeilen = (x: any): Z[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
const leerVektor = (x: any) => x == null || (Array.isArray(x) && x.length === 0) || (typeof x === 'object' && !Array.isArray(x) && (x as Z).type === 'null');

/** Spalten für einen Fall aus dem JSON-Datensatz: Reihenfolge zeit, Prädiktoren, ereignis; Gruppen als Faktor, Zahlen als Zahl. */
function spaltenAus(ds: string, zeit: string, praed: string[], ereignis: string): RSpalte[] {
  const D = C.datensaetze[ds]!;
  return [zeit, ...praed, ereignis].map(name => {
    const s = D.spalten[name]!;
    if (s.typ === 'zahl') return { name, art: 'zahl', werte: s.werte } as RSpalte;
    return { name, art: 'faktor', werte: s.werte, labels: s.labels!.map((label, i) => ({ wert: i + 1, label })) } as RSpalte;
  });
}
const rVec = (x: (string | number | null)[]) => x.length === 0 ? 'character(0)' : `c(${x.map(v => (v == null ? 'NA' : typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : String(v))).join(', ')})`;

describe.skipIf(!existsSync(manifestPfad))('Manifest: Paket für Welle 7', () => {
  it('survival steht im webR-Manifest, mit Datei im Repo; Matrix und MASS bleiben drin', () => {
    const m = JSON.parse(readFileSync(manifestPfad, 'utf8')) as { pakete: Record<string, { p: string }[]> };
    expect(Object.keys(m.pakete), 'Feld pakete enthält survival').toContain('survival');
    expect(m.pakete.survival!.some(d => /\/survival_[\d.-]+\.tgz$/.test(d.p)), 'survival_<Version>.tgz in der Dateiliste').toBe(true);
    expect(Object.keys(m.pakete)).toContain('Matrix'); expect(Object.keys(m.pakete)).toContain('MASS');
  });
});

describe.skipIf(!da)('Welle 7 Cox in webR gegen R am Mac (braucht: bash scripts/webr-holen.sh, survival im Repo)', () => {
  let server: Server; let r: any; let sh: any; let survivalFehler = '';
  const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Z;
  /** Daten wie RMotor.daten: .sp_werte/.sp_art/.sp_lab binden, dann rDataFrameCode. */
  const daten = async (name: string, spalten: RSpalte[]) => {
    const werte: Record<string, unknown> = {}, lab: Record<string, unknown> = {};
    for (const sp of spalten) {
      werte[sp.name] = await new r.RDouble(sp.werte.map((v: any) => (v == null ? null : Number(v))));   // Zahl und Faktor-Codes als double
      lab[sp.name] = sp.art === 'faktor' && sp.labels
        ? await new r.RList({ wert: await new r.RDouble(sp.labels.map(l => Number(l.wert))), label: await new r.RCharacter(sp.labels.map(l => l.label)) })
        : await new r.RList({});
    }
    const g = r.objs.globalEnv;
    await g.bind('.sp_werte', await new r.RList(werte)); await g.bind('.sp_art', await new r.RCharacter(spalten.map(s => s.art))); await g.bind('.sp_lab', await new r.RList(lab));
    await r.evalRVoid(rDataFrameCode(name, spalten) + '\nrm(.sp_werte, .sp_art, .sp_lab)');
  };
  const aufruf = (f: string, args: string) => `tryCatch(${f}(${args}), error = function(e) list(fehler = conditionMessage(e)))`;
  const cox = async (f: Z, ties?: 'efron' | 'breslow') => {
    const sp = spaltenAus(f.datensatz, f.zeit, f.praed, f.ereignis); await daten('d', sp);
    return rechne(aufruf('sp_cox', `d, '${f.zeit}', '${f.ereignis}', ${rVec(f.praed)}, ${rVec(sp.filter(s => s.art === 'faktor').map(s => s.name))}${ties ? `, ties = '${ties}'` : ''}`));
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
    try { await r.installPackages(['survival'], { quiet: true }); await r.evalRVoid(`suppressMessages(library(survival))`); } catch (e) { survivalFehler = String((e as Error)?.message ?? e); }
    sh = await new r.Shelter();
    await rechne(`{ ${STATABLE_R}\nTRUE }`);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  it('sp_cox ist in engine/statable.R definiert und survival ist aus dem webR-Repo installierbar', async () => {
    const o = await rechne(`c(cox = exists('sp_cox'), survival = requireNamespace('survival', quietly = TRUE))`);
    expect(survivalFehler, 'survival muss aus dem webR-Repo installierbar sein').toBe('');
    expect([eins(o.cox), eins(o.survival)]).toEqual([true, true]);
  });

  /** Vergleich eines Ergebnisses mit den Sollwerten (`soll` = f.efron oder f.breslow). */
  const pruefe = (o: Z, f: Z, soll: Z, ties: string, tol = 1e-6) => {
    expect(o.fehler, `R-Fehler: ${o.fehler}`).toBeUndefined();
    expect(eins(o.ties)).toBe(ties); expect(eins(o.n)).toBe(soll.n); expect(eins(o.ausgelassen)).toBe(soll.ausgelassen); expect(eins(o.ereignisse)).toBe(soll.ereignisse); expect(eins(o.npar)).toBe(soll.npar);
    nah(o.epv, soll.epv, 1e-12, 'epv'); expect(eins(o.epv_hinweis), 'epv_hinweis').toBe(soll.epv_hinweis);
    expect(zeilen(o.koef).length).toBe(soll.koef.length);
    for (const s of soll.koef as Z[]) {
      const z = zeilen(o.koef).find(x => eins(x.name) === s.name); expect(z, `Koeffizient ${s.name}`).toBeDefined();
      nah(z!.b, s.b, tol, `${s.name} b`); nah(z!.se, s.se, tol, `${s.name} se`); nah(z!.z, s.z, tol, `${s.name} z`); pNah(z!.p, s.p, `${s.name} p`);
      nah(z!.hr, s.hr, tol, `${s.name} hr`); nah(z!.ki_u, s.ki_u, tol, `${s.name} ki_u`); nah(z!.ki_o, s.ki_o, tol, `${s.name} ki_o`);
      expect(eins(z!.ki_u), `${s.name}: ki_u < hr < ki_o`).toBeLessThan(eins(z!.hr)); expect(eins(z!.ki_o)).toBeGreaterThan(eins(z!.hr));
    }
    nah(o.loglik, soll.loglik, tol, 'loglik'); nah(o.loglik0, soll.loglik0, tol, 'loglik0');
    nah(o.modelltest.chi2, soll.modelltest.chi2, tol, 'modelltest.chi2'); expect(eins(o.modelltest.df)).toBe(soll.modelltest.df); pNah(o.modelltest.p, soll.modelltest.p, 'modelltest.p');
    for (const l of soll.lr_praed as Z[]) {
      const z = zeilen(o.lr_praed).find(x => eins(x.name) === l.name); expect(z, `lr_praed ${l.name}`).toBeDefined();
      nah(z!.chi2, l.chi2, tol, `lr ${l.name}.chi2`); expect(eins(z!.df), `lr ${l.name}.df`).toBe(l.df); pNah(z!.p, l.p, `lr ${l.name}.p`);
    }
    nah(o.konkordanz.c, soll.konkordanz.c, 1e-9, 'konkordanz.c'); nah(o.konkordanz.se, soll.konkordanz.se, 1e-6, 'konkordanz.se');
    expect(eins(o.trennung), 'trennung').toBe(false); expect(leerVektor(o.warnungen), 'keine Warnungen').toBe(true);
  };
  const pruefePh = (o: Z, soll: Z) => {
    expect(o.ph_fehler, `cox.zph-Fehler: ${o.ph_fehler}`).toBeUndefined(); expect(o.ph).toBeDefined();
    nah(o.ph.gesamt.chi2, soll.ph.gesamt.chi2, 1e-5, 'ph.gesamt.chi2'); expect(eins(o.ph.gesamt.df)).toBe(soll.ph.gesamt.df); pNah(o.ph.gesamt.p, soll.ph.gesamt.p, 'ph.gesamt.p');
    for (const s of soll.ph.praed as Z[]) {
      const z = zeilen(o.ph.praed).find(x => eins(x.name) === s.name); expect(z, `ph ${s.name}`).toBeDefined();
      nah(z!.chi2, s.chi2, 1e-5, `ph ${s.name}.chi2`); expect(eins(z!.df), `ph ${s.name}.df`).toBe(s.df); pNah(z!.p, s.p, `ph ${s.name}.p`);
    }
  };
  const fall = (name: string) => C.faelle.find(f => f.name === name)!;

  describe('Efron (Voreinstellung)', () => {
    it('lung, nur Geschlecht (Referenz Männer): B = -0,531, SE = 0,167, HR = 0,588, LR = 10,63 auf 1 df (gedruckt in Tutorials); PH-Test: GLOBAL = Term', async () => {
      const f = fall('a_lung_sex'); const o = await cox(f);   // ohne ties-Argument: Efron
      pruefe(o, f, f.efron, 'efron'); pruefePh(o, f.efron);
      const k = zeilen(o.koef)[0]!; expect(eins(k.name)).toBe('sexFrauen');
      nah(k.b, C.veroeffentlicht.lung_sex.b, 6e-4, 'gedruckt: B'); nah(k.se, C.veroeffentlicht.lung_sex.se, 6e-4, 'gedruckt: SE'); nah(o.modelltest.chi2, C.veroeffentlicht.lung_sex.lr, 6e-4, 'gedruckt: LR');
      expect(eins(o.n)).toBe(228); expect(eins(o.ereignisse)).toBe(165);
    }, 300000);
    it('lung, age + sex + ph.ecog: gedruckte Werte (0,011067 / -0,552612 / 0,463728, LR 30,5 auf 3 df), n = 227 und 1 fehlender Wert listenweise', async () => {
      const f = fall('b_lung_mehrfach'); const o = await cox(f, 'efron');
      pruefe(o, f, f.efron, 'efron'); pruefePh(o, f.efron);
      const g = C.veroeffentlicht.lung_mehrfach.b as number[]; ['age', 'sexFrauen', 'ph.ecog'].forEach((n, i) => nah(zeilen(o.koef).find(x => eins(x.name) === n)!.b, g[i]!, 1e-4, `gedruckt: ${n}`));
      expect(eins(o.n)).toBe(227); expect(eins(o.ausgelassen)).toBe(1); expect(eins(o.ereignisse)).toBe(164);
    }, 300000);
    it('lung, Gruppe mit 3 Stufen (ecog3) + age: Koeffizient je Stufe, LR und PH je Prädiktor mit df = 2 (Gruppe zusammen)', async () => {
      const f = fall('c_lung_gruppe3'); const o = await cox(f);
      pruefe(o, f, f.efron, 'efron'); pruefePh(o, f.efron);
      expect(eins(zeilen(o.lr_praed).find(x => eins(x.name) === 'ecog3')!.df)).toBe(2); expect(eins(zeilen(o.ph.praed).find(x => eins(x.name) === 'ecog3')!.df)).toBe(2);
    }, 300000);
    it('viele gleiche Zeiten (11 Ereigniszeiten für 89 Ereignisse): alle Zahlen wie coxph(ties = "efron")', async () => {
      const f = fall('d_gebunden'); const o = await cox(f); pruefe(o, f, f.efron, 'efron'); pruefePh(o, f.efron);
    }, 300000);
    it('Gefahren kreuzen sich: cox.zph für gruppe und GLOBAL signifikant (p < ,001), HR dennoch gerechnet - Hinweis zuerst ist Sache der Oberfläche', async () => {
      const f = fall('e_ph_verletzt'); const o = await cox(f); pruefe(o, f, f.efron, 'efron'); pruefePh(o, f.efron);
      expect(eins(o.ph.gesamt.p)).toBeLessThan(0.001); expect(eins(zeilen(o.ph.praed).find(x => eins(x.name) === 'gruppe')!.p)).toBeLessThan(0.001);
      expect(eins(zeilen(o.ph.praed).find(x => eins(x.name) === 'x')!.p)).toBeGreaterThan(0.05);
    }, 300000);
    it('weniger als 10 Ereignisse je Koeffizient (17 Ereignisse, 3 Koeffizienten = 5,7): epv_hinweis = TRUE; genau 10 (30 Ereignisse, 3 Koeffizienten): FALSE', async () => {
      const f = fall('f_wenig_ereignisse'); const o = await cox(f); pruefe(o, f, f.efron, 'efron'); pruefePh(o, f.efron);
      expect(eins(o.epv_hinweis)).toBe(true); nah(o.epv, 17 / 3, 1e-12, 'epv');
      const g = fall('g_epv_grenze'); const p = await cox(g); pruefe(p, g, g.efron, 'efron'); pruefePh(p, g.efron);
      expect(eins(p.epv_hinweis)).toBe(false); expect(eins(p.epv)).toBe(10); expect(eins(p.ereignisse)).toBe(30);
    }, 300000);
  });

  describe('Breslow (so rechnet SPSS COXREG; nur Hilfe-Satz und Vergleich)', () => {
    for (const name of ['a_lung_sex', 'b_lung_mehrfach', 'c_lung_gruppe3', 'd_gebunden', 'e_ph_verletzt', 'f_wenig_ereignisse']) {
      it(`${name}: ties = "breslow" liefert die Breslow-Zahlen (B, SE, HR, KI, logLik, Modelltest, LR je Prädiktor)`, async () => {
        const f = fall(name); const o = await cox(f, 'breslow'); pruefe(o, f, f.breslow, 'breslow');
      }, 300000);
    }
    it('bei vielen Bindungen weichen Efron und Breslow sichtbar ab (> 1 % im ersten Koeffizienten; Fall d: 4,7 %), bei fast keinen Bindungen nicht (lung < 0,3 %)', () => {
      expect(fall('d_gebunden').abweichung_breslow_efron_rel_erster_koeffizient).toBeGreaterThan(0.01);
      expect(fall('a_lung_sex').abweichung_breslow_efron_rel_erster_koeffizient).toBeLessThan(0.003);
    });
  });

  describe('Sonderfälle', () => {
    it('vollständige Trennung (Gruppe B ohne Ereignis): R rechnet weiter, sp_cox meldet trennung = TRUE und die R-Warnung, kein Absturz', async () => {
      const f = C.sonderfaelle.find(x => x.name === 'h_trennung')!; expect(f.warnung_r).toMatch(/may be infinite/);
      const o = await cox(f);
      expect(o.fehler, `R-Fehler: ${o.fehler}`).toBeUndefined(); expect(eins(o.trennung)).toBe(true);
      expect(zeilen(o.warnungen).map(w => String(eins(w))).join(' ')).toMatch(/infinite|converge/i);
      expect(zeilen(o.koef).length).toBe(2);
    }, 300000);
    it('kein Ereignis: {fehler} (Text) und kein Koeffizient - R selbst rechnet hier still mit NA', async () => {
      const f = C.sonderfaelle.find(x => x.name === 'i_keine_ereignisse')!;
      const o = await cox(f);
      expect(typeof eins(o.fehler), 'fehler (Text)').toBe('string'); expect(String(eins(o.fehler)), 'nicht der Fehler „Funktion fehlt“').not.toMatch(/sp_cox|could not find/i); expect(o.koef).toBeUndefined();
    }, 300000);
  });
});
