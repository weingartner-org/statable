import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson, rDataFrameCode, type RSpalte } from './webr';
import STATABLE_R from './statable.R?raw';
import ERW from '../lib/testdaten/welle3-erwartet.json';

/* Welle 3: ordinale, multinomiale und Zähldaten-Regression in webR gegen die Sollwerte aus R am Mac.
 * ROTE TESTS des Prüfers (Fachblatt docs/fachblaetter/WELLE3-REGRESSION-KATEGORIEN-ZAEHLDATEN.md, Schnittstelle + „Nachtrag nach den Sollwerten“).
 * Der Bauer darf diese Datei nicht ändern; er baut `sp_ordreg`, `sp_multreg`, `sp_zaehlreg` in engine/statable.R, bis sie grün ist.
 * Sollwerte: scripts/welle3-erwartet.R -> lib/testdaten/welle3-erwartet.json (R 4.6.1, MASS 7.3-65, nnet 7.3-20, am 16.10.2026). webR 0.6.0 hat R 4.6.0 und MASS 7.3-65 (dieselbe Version
 * wie am Mac); nnet kommt mit 7.3-21 neu ins webR-Repo (Gegenprobe: multinom ist unabhängig vom Startwert bis in die 15. Stelle und stimmt mit VGAM auf 1e-6).
 *
 * EINGABE (wie lib/rverfahren.svelte.ts mit RMotor.daten und rDataFrameCode, Spalten als RSpalte):
 *   - Zahlen-Prädiktoren und Zählziel: art 'zahl'. Gruppen-Prädiktoren (Namen in `faktoren`): art 'faktor' - Codes 1..k mit Wertelabels, die Stufen von R liegen in Reihenfolge der Codes,
 *     ERSTE STUFE = VERGLEICHSGRUPPE (so entscheidet es Statable vorher, lib/regfaktor.ts; die R-Funktion sortiert nichts um).
 *   - Ziel von sp_ordreg / sp_multreg: art 'text' (Beschriftungen). `stufen` (ordinal) = ALLE Zielstufen in Statable-Ordnung, auch solche ohne Fälle; die R-Funktion lässt Stufen ohne Fälle weg
 *     und meldet die verwendeten unter `stufen`. `referenz` (multinomial) = Beschriftung der Vergleichskategorie.
 *   - Spaltennamen sind beliebige gültige R-Namen (die Tests nehmen die Namen aus dem JSON). Fehlende Werte = NA; gerechnet wird listenweise (n = gültige Fälle, ausgelassen = die übrigen).
 *   - sp_zaehlreg(d, ziel, praed, faktoren, modell, zeit): modell 'auto' | 'poisson' | 'negbin'; zeit = Name der Offset-Spalte oder NULL.
 * AUSGABE (R-Liste; Skalare dürfen als Vektor der Länge 1 ankommen, `koef` und die anderen Zeilenlisten sind Listen benannter Listen = Arrays von Objekten):
 *   alle:       n, ausgelassen, koef[{name, [kategorie], b, se, z, p, or | irr, ki_u, ki_o}], lr_praed[{name, chi2, df, p}], modelltest{chi2, df, p}, loglik, loglik0.
 *               name = Name wie in R (Spalte + Stufe, z. B. 'InflMedium', Konstante '(Intercept)'). or/irr = exp(b); ki_u/ki_o = Wald-KI auf der Skala von or/irr, exp(b ± qnorm(,975)·se).
 *               Fehler (R-Meldung statt Ergebnis): {fehler: '…'} - sp_* werfen nie, sie geben list(fehler=) zurück (oder der Aufrufer fängt mit tryCatch wie bei Mehrebenen).
 *   ordinal:    stufen (verwendete Zielstufen), schwellen[{name, theta, se}], nagelkerke, coxsnell,
 *               brant {gesamt{chi2, df, p}, praed[{name, chi2, df, p}]} (je Prädiktor, df = (J-2)·Koeffizienten; Formel nach Brant 1990, NICHT brant::brant) ODER brant_fehler (Text) und kein `brant`
 *               wenn nicht prüfbar (eine binäre Teilung konvergiert nicht oder eine Zelle Gruppenstufe × Teilung ist leer; JSON: brant_pruefbar).
 *               polr läuft mit control = list(reltol = 1e-14, maxit = 1000, ndeps = rep(1e-6, npar)).
 *   multinom.:  referenz, kategorien (Beschriftungen ohne Vergleichskategorie), koef mit `kategorie`, konvergiert (convergence == 0), nagelkerke, coxsnell;
 *               lr_praed-Zeilen mit chi2 >= 0 (negative auf 0, p = 1) und `unsicher` (true, wenn geklemmt oder nicht konvergiert). maxit = 1000, reltol = 1e-12.
 *   Zähldaten:  modell (gewähltes: 'poisson' | 'negbin'), grund ('ueberdispersion' | 'keine_ueberdispersion' | 'theta_am_rand' | 'gewaehlt'), theta und theta_se (nur bei negbin, sonst null),
 *               pearson_df (= Pearson-χ² / Freiheitsgrade des Poisson-Modells), lr_ueber{chi2, p} (p halbiert, bei chi2 <= 0 p = 1), nullen{beobachtet, erwartet} (erwartet für das GEWÄHLTE Modell),
 *               nullen_hinweis (true bei beobachtet > 1,5·erwartet und > 10 %), offset (Name oder null). Negativ-binomial = Profil-Likelihood über log θ in [log 1e-3, log 1e4], dann glm(negative.binomial(θ̂));
 *               ohne `glm.nb`. koef/loglik/modelltest/lr_praed gelten für das gewählte Modell (Nullmodell und Modell ohne Prädiktor schätzen θ neu).
 * TOLERANZEN (relativ, soweit nicht anders gesagt): B, SE, z, KI, logLik, χ² 1e-6 (IRLS bzw. BFGS mit reltol 1e-14: Rundungsunterschiede BLAS webR/Mac liegen bei 1e-12); multinom 1e-5 (Optimierer, Gegenprobe VGAM 1e-6);
 *   θ 1e-6 und SE(θ) 1e-5 (optimize tol 1e-10 auf log θ); Brant 1e-5 (Kovarianz aus glm.fit mit Standard-eps); p-Werte auf der log-Skala |ln(ist/soll)| < 2e-3, weil p ein χ² von bis zu 1200 verstärkt. */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const manifestPfad = join(webrOrdner, 'manifest.json');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/MASS_7.3-65.tgz')) && existsSync(manifestPfad);

type Z = Record<string, any>;
const E = ERW as unknown as { datensaetze: Record<string, { n: number; spalten: Record<string, { typ: 'zahl' | 'gruppe'; werte: (number | null)[]; labels?: string[] }> }>; ordinal: Z[]; multinomial: Z[]; zaehldaten: Z[]; ordinal_zwei_stufen_polr_fehler: string };
const fall = (liste: Z[], name: string) => liste.find(f => f.name === name)!;

const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
const nah = (ist: any, soll: number, tol: number, was: string) => { const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Math.abs(i - soll) / Math.max(Math.abs(soll), 1e-3), `${was} (ist ${i}, soll ${soll})`).toBeLessThan(tol); };
const pNah = (ist: any, soll: number, was: string) => { const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet`).toBe('number'); if (soll === 0 || i === 0) { expect(i, was).toBe(soll); return; } expect(Math.abs(Math.log(i / soll)), `${was} (ist ${i}, soll ${soll})`).toBeLessThan(2e-3); };
/** R-NULL kommt als {type:'null'}, NA als null, fehlend als undefined: alles heißt „leer“. */
const leer = (x: any) => { const v = eins(x); return v == null || (typeof v === 'object' && (v as Z).type === 'null'); };
const zeilen = (x: any): Z[] => (Array.isArray(x) ? x : x == null ? [] : [x]);

/** Spalten für einen Fall aus dem JSON-Datensatz: Zielspalte als Text (Ordinal/Multinomial), Gruppen als Faktor, Zahlen als Zahl. */
function spaltenAus(ds: string, ziel: string, praed: string[], opt: { zielText?: boolean; extra?: string[] } = {}): RSpalte[] {
  const D = E.datensaetze[ds]!;
  return [ziel, ...praed, ...(opt.extra ?? [])].map(name => {
    const s = D.spalten[name]!;
    if (s.typ === 'zahl') return { name, art: 'zahl', werte: s.werte } as RSpalte;
    if (name === ziel && opt.zielText) return { name, art: 'text', werte: s.werte.map(w => (w == null ? null : s.labels![w - 1]!)) } as RSpalte;
    return { name, art: 'faktor', werte: s.werte, labels: s.labels!.map((label, i) => ({ wert: i + 1, label })) } as RSpalte;
  });
}
const rVec = (x: (string | number | null)[]) => x.length === 0 ? 'character(0)' : `c(${x.map(v => (v == null ? 'NA' : typeof v === 'string' ? `'${v}'` : String(v))).join(', ')})`;
const faktorenVon = (sp: RSpalte[], ohne: string) => sp.filter(s => s.art === 'faktor' && s.name !== ohne).map(s => s.name);

describe.skipIf(!existsSync(manifestPfad))('Manifest: Pakete für Welle 3', () => {
  it('nnet (multinom) steht im webR-Manifest, mit Datei im Repo', () => {
    const m = JSON.parse(readFileSync(manifestPfad, 'utf8')) as { pakete: Record<string, { p: string }[]> };
    expect(Object.keys(m.pakete), 'Feld pakete enthält nnet').toContain('nnet');
    expect(m.pakete.nnet!.some(d => /\/nnet_[\d.-]+\.tgz$/.test(d.p)), 'nnet_<Version>.tgz in der Dateiliste').toBe(true);
    expect(Object.keys(m.pakete), 'MASS bleibt drin').toContain('MASS');
  });
});

describe.skipIf(!da)('Welle 3 in webR gegen R am Mac (braucht: bash scripts/webr-holen.sh, nnet im Repo)', () => {
  let server: Server; let r: any; let sh: any; let nnetFehler = '';
  const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Z;
  /** Daten wie RMotor.daten: .sp_werte/.sp_art/.sp_lab binden, dann rDataFrameCode. */
  const daten = async (name: string, spalten: RSpalte[]) => {
    const werte: Record<string, unknown> = {}, lab: Record<string, unknown> = {};
    for (const sp of spalten) {
      werte[sp.name] = sp.art === 'text' ? await new r.RCharacter(sp.werte.map((v: any) => (v == null ? null : String(v)))) : await new r.RDouble(sp.werte.map((v: any) => (v == null ? null : Number(v))));   // Zahl und Faktor-Codes als double
      lab[sp.name] = sp.art === 'faktor' && sp.labels
        ? await new r.RList({ wert: await new r.RDouble(sp.labels.map(l => Number(l.wert))), label: await new r.RCharacter(sp.labels.map(l => l.label)) })
        : await new r.RList({});
    }
    const g = r.objs.globalEnv;
    await g.bind('.sp_werte', await new r.RList(werte)); await g.bind('.sp_art', await new r.RCharacter(spalten.map(s => s.art))); await g.bind('.sp_lab', await new r.RList(lab));
    await r.evalRVoid(rDataFrameCode(name, spalten) + '\nrm(.sp_werte, .sp_art, .sp_lab)');
  };
  const aufruf = (f: string, args: string) => `tryCatch(${f}(${args}), error = function(e) list(fehler = conditionMessage(e)))`;
  const ord = async (sp: RSpalte[], ziel: string, praed: string[], stufen: string[]) => { await daten('d', sp); return rechne(aufruf('sp_ordreg', `d, '${ziel}', ${rVec(praed)}, ${rVec(faktorenVon(sp, ziel))}, ${rVec(stufen)}`)); };
  const mult = async (sp: RSpalte[], ziel: string, praed: string[], referenz: string) => { await daten('d', sp); return rechne(aufruf('sp_multreg', `d, '${ziel}', ${rVec(praed)}, ${rVec(faktorenVon(sp, ziel))}, '${referenz}'`)); };
  const zaehl = async (sp: RSpalte[], ziel: string, praed: string[], modell: string, zeit: string | null) => { await daten('d', sp); return rechne(aufruf('sp_zaehlreg', `d, '${ziel}', ${rVec(praed)}, ${rVec(faktorenVon(sp, ziel))}, '${modell}', ${zeit ? `'${zeit}'` : 'NULL'}`)); };

  /** Gemeinsames: Fälle, Koeffizienten (b, se, z, p, Effekt, KI), Modelltest, LR je Prädiktor, logLik. */
  const gemeinsam = (o: Z, soll: Z, modell: Z, effekt: 'or' | 'irr', tol = 1e-6, kategorie?: string) => {
    expect(o.fehler, `R-Fehler: ${o.fehler}`).toBeUndefined();
    expect(eins(o.n)).toBe(soll.n_gueltig); expect(eins(o.ausgelassen)).toBe(soll.n_ausgelassen);
    nah(o.loglik, modell.loglik_modell ?? modell.loglik, tol, 'loglik');
    nah(o.loglik0, modell.loglik_null ?? (modell.loglik - modell.modelltest.chi2 / 2), tol, 'loglik0');
    nah(o.modelltest.chi2, modell.modelltest.chi2, tol, 'modelltest.chi2'); expect(eins(o.modelltest.df)).toBe(modell.modelltest.df); pNah(o.modelltest.p, modell.modelltest.p, 'modelltest.p');
    for (const l of modell.lr_je_praediktor as Z[]) {
      const z = zeilen(o.lr_praed).find(x => eins(x.name) === l.spalte); expect(z, `lr_praed ${l.spalte}`).toBeDefined();
      nah(z!.chi2, l.chi2_geklemmt ?? l.chi2, Math.max(tol, 1e-6), `lr ${l.spalte}.chi2`); expect(eins(z!.df), `lr ${l.spalte}.df`).toBe(l.df); pNah(z!.p, l.p_geklemmt ?? l.p, `lr ${l.spalte}.p`);
    }
  };
  const koeffizienten = (o: Z, sollZeilen: Z[], effekt: 'or' | 'irr', tol: number, kategorie?: string) => {
    for (const s of sollZeilen) {
      const z = zeilen(o.koef).find(x => eins(x.name) === s.name && (kategorie === undefined || eins(x.kategorie) === kategorie));
      if (s.name === '(Intercept)' && !z) continue; // Konstante: wenn geliefert, dann richtig
      expect(z, `Koeffizient ${kategorie ?? ''} ${s.name}`).toBeDefined();
      const w = `${kategorie ?? ''} ${s.name}`;
      nah(z!.b, s.b, tol, `${w} b`); nah(z!.se, s.se, tol, `${w} se`); nah(z!.z, s.z, tol, `${w} z`); pNah(z!.p, s.p, `${w} p`);
      nah(z![effekt], s[effekt], tol, `${w} ${effekt}`); nah(z!.ki_u, s[`${effekt}_ki_unten`], tol, `${w} ki_u`); nah(z!.ki_o, s[`${effekt}_ki_oben`], tol, `${w} ki_o`);
    }
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
    await r.installPackages(['MASS'], { quiet: true });
    try { await r.installPackages(['nnet'], { quiet: true }); await r.evalRVoid(`suppressMessages(library(nnet))`); } catch (e) { nnetFehler = String((e as Error)?.message ?? e); }
    sh = await new r.Shelter();
    await rechne(`{ ${STATABLE_R}\nTRUE }`);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  it('die drei R-Funktionen sind in engine/statable.R definiert und nnet ist ladbar', async () => {
    const o = await rechne(`c(ordreg = exists('sp_ordreg'), multreg = exists('sp_multreg'), zaehlreg = exists('sp_zaehlreg'))`);
    expect([eins(o.ordreg), eins(o.multreg), eins(o.zaehlreg)]).toEqual([true, true, true]);
    expect(nnetFehler, 'nnet muss aus dem webR-Repo installierbar sein').toBe('');
  });

  describe('ordinal (sp_ordreg)', () => {
    const pruefe = (o: Z, f: Z, tol = 1e-6) => {
      gemeinsam(o, f, f, 'or', tol); koeffizienten(o, f.koeffizienten, 'or', tol);
      expect(o.stufen).toEqual(f.ziel_stufen);
      f.schwellen.forEach((s: Z, i: number) => { const z = zeilen(o.schwellen)[i]!; expect(eins(z.name)).toBe(s.name); nah(z.theta, s.theta, tol, `theta ${s.name}`); nah(z.se, s.se, tol, `se ${s.name}`); });
      nah(o.nagelkerke, f.pseudo_r2.nagelkerke, tol, 'nagelkerke'); nah(o.coxsnell, f.pseudo_r2.cox_snell, tol, 'coxsnell');
    };
    const brant = (o: Z, f: Z) => {
      expect(f.brant_pruefbar).toBe(true); expect(o.brant_fehler, 'Brant muss rechenbar sein').toBeUndefined();
      nah(o.brant.gesamt.chi2, f.brant_soll.gesamt.chi2, 1e-5, 'brant gesamt chi2'); expect(eins(o.brant.gesamt.df)).toBe(f.brant_soll.gesamt.df); pNah(o.brant.gesamt.p, f.brant_soll.gesamt.p, 'brant gesamt p');
      for (const [name, s] of Object.entries(f.brant_soll.je_praediktor as Record<string, Z>)) {
        const z = zeilen(o.brant.praed).find(x => eins(x.name) === name); expect(z, `brant ${name}`).toBeDefined();
        nah(z!.chi2, s.chi2, 1e-5, `brant ${name} chi2`); expect(eins(z!.df)).toBe(s.df); pNah(z!.p, s.p, `brant ${name} p`);
      }
    };
    it('housing (V&R 2002): B, Schwellen, Modelltest, Nagelkerke, LR je Prädiktor, Brant (eigene Formel, nicht brant::brant)', async () => {
      const f = fall(E.ordinal, 'a_housing'); const sp = spaltenAus('housing', 'Sat', ['Infl', 'Type', 'Cont'], { zielText: true });
      const o = await ord(sp, 'Sat', ['Infl', 'Type', 'Cont'], f.ziel_stufen_angegeben);
      pruefe(o, f); brant(o, f);
      nah(eins(o.koef.find((k: Z) => eins(k.name) === 'InflHigh').b), 1.28881908845857, 1e-6, 'InflHigh = 1,2888 (V&R)');
    }, 300000);
    it('eigener Datensatz mit Stufen nie < selten < oft < immer (nicht alphabetisch): Brant signifikant, 5 fehlende Werte listenweise', async () => {
      const f = fall(E.ordinal, 'b_eigen_brant_signifikant'); const sp = spaltenAus('ordinal_eigen', 'y', ['x', 'g'], { zielText: true });
      const o = await ord(sp, 'y', ['x', 'g'], f.ziel_stufen_angegeben);
      pruefe(o, f); brant(o, f);
      expect(eins(o.brant.gesamt.p)).toBeLessThan(0.05);
      expect(o.stufen, 'Ordnung der Stufen bleibt, wie übergeben').toEqual(['nie', 'selten', 'oft', 'immer']);
    }, 300000);
    it('Zielstufe ohne Fälle (Wertelabel „manchmal“) fällt weg: dieselben Zahlen wie mit 4 Stufen, keine zusätzliche Schwelle', async () => {
      const f = fall(E.ordinal, 'c_leere_stufe'); const sp = spaltenAus('ordinal_eigen', 'y_leer', ['x', 'g'], { zielText: true });
      expect(f.ziel_stufen_angegeben).toEqual(['nie', 'selten', 'manchmal', 'oft', 'immer']);
      const o = await ord(sp, 'y_leer', ['x', 'g'], f.ziel_stufen_angegeben);
      pruefe(o, f); brant(o, f);
      expect(zeilen(o.schwellen).length).toBe(3); expect(o.stufen).toEqual(['nie', 'selten', 'oft', 'immer']);
    }, 300000);
    it('Brant nicht prüfbar, wenn eine Teilung nicht konvergiert (x trennt „nie“): polr rechnet, kein Brant-Zahlenwert, nur brant_fehler', async () => {
      const f = fall(E.ordinal, 'd_brant_trennung_teilung'); expect(f.brant_pruefbar).toBe(false);
      const sp = spaltenAus('ordinal_trennung_teilung', 'y', ['x', 'h'], { zielText: true });
      const o = await ord(sp, 'y', ['x', 'h'], f.ziel_stufen_angegeben);
      pruefe(o, f, 1e-5);
      expect(o.brant, 'keine Zahl, wenn nicht prüfbar').toBeUndefined(); expect(typeof eins(o.brant_fehler), 'brant_fehler ist ein Text').toBe('string');
    }, 300000);
    it('Brant nicht prüfbar bei leerer Zelle Gruppenstufe × Teilung (Stufe „nie“ nur in Gruppe Land): polr normal, brant_fehler', async () => {
      const f = fall(E.ordinal, 'e_brant_leere_zelle'); expect(f.brant_pruefbar).toBe(false);
      const sp = spaltenAus('ordinal_leere_zelle', 'y', ['x', 'g'], { zielText: true });
      const o = await ord(sp, 'y', ['x', 'g'], f.ziel_stufen_angegeben);
      pruefe(o, f, 1e-5);
      expect(o.brant).toBeUndefined(); expect(typeof eins(o.brant_fehler)).toBe('string');
    }, 300000);
    it('vollständige Trennung (Alter bestimmt die Stufe): polr bricht ab → {fehler}, kein Ergebnis', async () => {
      const f = fall(E.ordinal, 'f_trennung_voll'); expect(f.polr_fehler).toMatch(/starting values/);
      const sp = spaltenAus('ordinal_trennung_voll', 'y', ['alter'], { zielText: true });
      const o = await ord(sp, 'y', ['alter'], f.ziel_stufen_angegeben);
      expect(typeof eins(o.fehler), 'fehler (Text) statt Ergebnis').toBe('string'); expect(String(eins(o.fehler)), 'Text nennt die Trennung (R-Meldung oder Satz aus G18a)').toMatch(/starting values|trenn|separat|gelingt/i); expect(o.koef).toBeUndefined();
    }, 300000);
    it('nur 2 Zielstufen: keine Rechnung mit polr (verlangt 3 Stufen), sondern fehler mit Hinweis auf die logistische Regression', async () => {
      expect(E.ordinal_zwei_stufen_polr_fehler).toMatch(/3 or more levels/);
      const D = E.datensaetze.ordinal_eigen!, y = D.spalten.y!;
      const sp = spaltenAus('ordinal_eigen', 'y', ['x', 'g']); sp[0] = { name: 'y', art: 'text', werte: y.werte.map(w => (w == null ? null : w <= 2 ? 'niedrig' : 'hoch')) };
      const o = await ord(sp, 'y', ['x', 'g'], ['niedrig', 'hoch']);
      expect(typeof eins(o.fehler)).toBe('string'); expect(String(eins(o.fehler)).toLowerCase(), 'Hinweis sagt: 2 Stufen').toMatch(/logist|2 (stufen|levels)|zwei stufen|two levels|3 or more levels|3 oder mehr/); expect(o.koef).toBeUndefined();
    }, 300000);
  });

  describe('multinomial (sp_multreg)', () => {
    const pruefe = (o: Z, f: Z, tol = 1e-5) => {
      gemeinsam(o, f, f, 'or', tol);
      expect(eins(o.referenz)).toBe(f.referenz); expect(o.kategorien).toEqual(Object.keys(f.kategorien));
      expect(eins(o.konvergiert)).toBe(f.convergence === 0);
      for (const [k, zeilenSoll] of Object.entries(f.kategorien as Record<string, Z[]>)) koeffizienten(o, zeilenSoll, 'or', tol, k);
      nah(o.nagelkerke, f.pseudo_r2.nagelkerke, tol, 'nagelkerke'); nah(o.coxsnell, f.pseudo_r2.cox_snell, tol, 'coxsnell');
    };
    it('housing, Sat nominal, Vergleichskategorie Low (R-Weg): B, SE, OR, KI je Kategorie, LR je Prädiktor (df 4, 6, 2), Nagelkerke', async () => {
      const f = fall(E.multinomial, 'a_housing_referenz_erste'); const sp = spaltenAus('housing', 'Sat', ['Infl', 'Type', 'Cont'], { zielText: true });
      pruefe(await mult(sp, 'Sat', ['Infl', 'Type', 'Cont'], 'Low'), f);
    }, 300000);
    it('dasselbe mit Vergleichskategorie High (SPSS-Weg): andere B und OR, gleiche Anpassung; B(Medium|High) = B(Medium|Low) - B(High|Low)', async () => {
      const f = fall(E.multinomial, 'b_housing_referenz_letzte'); const sp = spaltenAus('housing', 'Sat', ['Infl', 'Type', 'Cont'], { zielText: true });
      const o = await mult(sp, 'Sat', ['Infl', 'Type', 'Cont'], 'High');
      pruefe(o, f);
      const a = fall(E.multinomial, 'a_housing_referenz_erste');
      const b = (liste: Z[], n: string) => liste.find(z => z.name === n)!.b as number;
      const zeile = zeilen(o.koef).find(x => eins(x.kategorie) === 'Medium' && eins(x.name) === 'InflHigh')!;
      nah(zeile.b, b(a.kategorien.Medium, 'InflHigh') - b(a.kategorien.High, 'InflHigh'), 1e-5, 'Referenzwechsel');
    }, 300000);
    it('eigener Datensatz Bus/Rad/Zug mit metrischem Prädiktor und Gruppe (LR je Prädiktor df 2 und 4), 2 fehlende Werte', async () => {
      const f = fall(E.multinomial, 'c_eigen'); const sp = spaltenAus('multi_eigen', 'v', ['alter', 'w'], { zielText: true });
      pruefe(await mult(sp, 'v', ['alter', 'w'], 'Bus'), f);
    }, 300000);
    it('Trennung (Alter bestimmt die Kategorie): konvergiert = false, LR-χ² nie negativ (auf 0, p = 1, unsicher), kein Absturz', async () => {
      const f = fall(E.multinomial, 'd_trennung'); expect(f.convergence).toBe(1);
      const sp = spaltenAus('multi_trennung', 'v', ['alter', 'w'], { zielText: true });
      const o = await mult(sp, 'v', ['alter', 'w'], 'Bus');
      expect(o.fehler, `R-Fehler: ${o.fehler}`).toBeUndefined(); expect(eins(o.konvergiert)).toBe(false);
      expect(eins(o.n)).toBe(f.n_gueltig); expect(zeilen(o.koef).length).toBe(8);
      for (const z of zeilen(o.lr_praed)) { expect(eins(z.chi2), `lr ${eins(z.name)} nicht negativ`).toBeGreaterThanOrEqual(0); expect(eins(z.unsicher), `lr ${eins(z.name)} unsicher`).toBe(true); }
      const w = zeilen(o.lr_praed).find(x => eins(x.name) === 'w')!; expect(eins(w.chi2)).toBe(0); expect(eins(w.p)).toBe(1);
    }, 300000);
  });

  describe('Zähldaten (sp_zaehlreg)', () => {
    /** Sollwerte des gewählten Modells: Poisson-Block oder negbin_profil. */
    const gewaehlt = (f: Z, m: 'poisson' | 'negbin') => (m === 'poisson' ? f.poisson : f.negbin_profil);
    const pruefe = (o: Z, f: Z, m: 'poisson' | 'negbin', tol = 1e-6) => {
      const S = gewaehlt(f, m);
      gemeinsam(o, f, { ...S, loglik_modell: S.loglik }, 'irr', tol); koeffizienten(o, S.koeffizienten, 'irr', tol);
      expect(eins(o.modell)).toBe(m);
      nah(o.pearson_df, f.poisson.pearson_chi2_df, tol, 'pearson_df');
      nah(o.nullen.beobachtet, f.nullen_beobachtet, 1e-12, 'nullen.beobachtet'); nah(o.nullen.erwartet, S.nullen_erwartet, 1e-5, 'nullen.erwartet');
      if (m === 'negbin') { nah(o.theta, S.theta, 1e-6, 'theta'); nah(o.theta_se, S.theta_se, 1e-5, 'theta_se'); }
      else { expect(leer(o.theta), 'theta nur bei negbin').toBe(true); }
      nah(o.lr_ueber.chi2, Math.max(f.negbin_profil.lr_ueber.lr, 0), 1e-6, 'lr_ueber.chi2'); pNah(o.lr_ueber.p, f.negbin_profil.lr_ueber.p, 'lr_ueber.p');
      if (f.offset) expect(eins(o.offset)).toBe(f.offset); else expect(leer(o.offset), 'offset leer').toBe(true);
    };
    it('quine (V&R 2002, Kap. 7.4), automatisch → negativ-binomial: θ = 1,2749, LR Poisson/negbin = 1192,0 (p halbiert), Pearson χ²/df = 13,2, LR je Prädiktor mit neu geschätztem θ', async () => {
      const f = fall(E.zaehldaten, 'a_quine'); const praed = ['Eth', 'Sex', 'Age', 'Lrn'];
      const o = await zaehl(spaltenAus('quine', 'Days', praed), 'Days', praed, 'auto', null);
      pruefe(o, f, 'negbin'); expect(eins(o.grund)).toBe('ueberdispersion');
      nah(o.theta, 1.27489264215287, 1e-6, 'theta quine'); nah(o.lr_ueber.chi2, 1192.03261196057, 1e-6, 'LR 1192,0'); nah(o.pearson_df, 13.1668426271773, 1e-6, 'Pearson 13,2');
      expect(eins(o.nullen_hinweis)).toBe(false);   // 6,2 % Nullen < 10 %
    }, 300000);
    it('quine, Poisson erzwungen: Poisson-Koeffizienten (zu kleine SE), Pearson, Hinweis-Daten', async () => {
      const f = fall(E.zaehldaten, 'a_quine'); const praed = ['Eth', 'Sex', 'Age', 'Lrn'];
      const o = await zaehl(spaltenAus('quine', 'Days', praed), 'Days', praed, 'poisson', null);
      pruefe(o, f, 'poisson'); expect(eins(o.grund)).toBe('gewaehlt');
    }, 300000);
    it('Offset „zeit“: IRR je Zeiteinheit; Offset nur über offset(log(zeit)); 3 fehlende Werte; Nullen-Hinweis nur beim Poisson-Modell', async () => {
      const f = fall(E.zaehldaten, 'b_offset'); const praed = ['x', 'g'];
      const sp = spaltenAus('zaehl_offset', 'y', praed, { extra: ['zeit'] });
      const o = await zaehl(sp, 'y', praed, 'auto', 'zeit');
      pruefe(o, f, 'negbin'); expect(eins(o.offset)).toBe('zeit');
      const p = await zaehl(sp, 'y', praed, 'poisson', 'zeit');
      pruefe(p, f, 'poisson'); expect(eins(p.nullen_hinweis), 'Poisson erwartet 6,7 % Nullen, beobachtet 15 %').toBe(f.nullen_hinweis_poisson);
      expect(eins(o.nullen_hinweis), 'negativ-binomial erwartet 12 %: kein Hinweis').toBe(f.nullen_hinweis_profil);
      expect(Math.abs(eins(p.koef.find((k: Z) => eins(k.name) === 'x').b) - f.poisson.b_ohne_offset[1]), 'mit Offset anders als ohne').toBeGreaterThan(0.01);
    }, 300000);
    it('Poisson-Daten ohne Überdispersion: θ̂ am oberen Rand (10⁴) → automatisch Poisson (grund theta_am_rand), LR <= 0 → p = 1', async () => {
      const f = fall(E.zaehldaten, 'c_ohne_ueberdispersion'); const praed = ['x', 'g'];
      expect(f.automatisch_profil).toEqual({ modell: 'poisson', grund: 'theta_am_rand' });
      const o = await zaehl(spaltenAus('zaehl_poisson', 'y', praed), 'y', praed, 'auto', null);
      pruefe(o, f, 'poisson'); expect(eins(o.grund)).toBe('theta_am_rand');
      expect(eins(o.lr_ueber.p)).toBe(1); expect(eins(o.lr_ueber.chi2)).toBe(0);
    }, 300000);
    it('Poisson-Daten, negativ-binomial erzwungen: θ̂ liegt am Rand (≈ 10⁴), Koeffizienten wie Poisson', async () => {
      const f = fall(E.zaehldaten, 'c_ohne_ueberdispersion'); const praed = ['x', 'g'];
      const o = await zaehl(spaltenAus('zaehl_poisson', 'y', praed), 'y', praed, 'negbin', null);
      expect(o.fehler, `R-Fehler: ${o.fehler}`).toBeUndefined(); expect(eins(o.modell)).toBe('negbin');
      nah(o.theta, f.negbin_profil.theta, 1e-4, 'theta am Rand'); koeffizienten(o, f.negbin_profil.koeffizienten, 'irr', 1e-5);
    }, 300000);
    it('Null-Überschuss (30 % strukturelle Nullen): negativ-binomial gewählt, Nullen-Hinweis gegen das GEWÄHLTE Modell (beobachtet 25,5 % > 1,5 × 11,4 %)', async () => {
      const f = fall(E.zaehldaten, 'd_viele_nullen'); const praed = ['x', 'g'];
      const o = await zaehl(spaltenAus('zaehl_nullen', 'y', praed), 'y', praed, 'auto', null);
      pruefe(o, f, 'negbin'); expect(eins(o.nullen_hinweis)).toBe(true);
    }, 300000);
    it('glm.nb versagt (θ = 1,7·10⁶ statt 0,28): die Profil-Likelihood findet θ̂ = 0,2837 und wählt negativ-binomial - nicht fälschlich Poisson', async () => {
      const f = fall(E.zaehldaten, 'e_glmnb_versagt'); const praed = ['x', 'g'];
      expect(f.negbin_ml.theta).toBeLessThan(0.3); expect(f.negbin.theta).toBeGreaterThan(1e6);   // Sollwert-Selbstprüfung: das Paket scheitert wirklich
      const o = await zaehl(spaltenAus('zaehl_glmnb_versagt', 'y', praed), 'y', praed, 'auto', null);
      pruefe(o, f, 'negbin'); expect(eins(o.grund)).toBe('ueberdispersion');
      nah(o.theta, f.negbin_ml.theta, 1e-4, 'theta = negbin_ml'); nah(o.lr_ueber.chi2, f.ueberdispersion_ml.lr, 1e-5, 'LR gegen Poisson 1177');
    }, 300000);
  });
});
