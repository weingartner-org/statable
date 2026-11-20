import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson, rDataFrameCode, type RSpalte } from './webr';
import STATABLE_R from './statable.R?raw';
import ERW from '../lib/testdaten/spaeter-f2-erwartet.json';

/* Später, Welle S-F2, Teil D: AFT-Modell (survreg) und Frailty/cluster (coxph) in webR gegen die Sollwerte aus R am Mac. ROTE TESTS des Sollwert-Prüfers
 * (Fachblatt docs/fachblaetter/SPAETER-F2-ERGAENZUNGEN.md Abschnitt D und „Entscheidungen Opus (19.10.)“ 9 und 10 gehen vor). Der Bauer B darf diese Datei und die JSON nicht ändern.
 * Bauer B baut `sp_aft`, `sp_aft_aic` und `sp_frailty` in der VORHANDENEN Datei `engine/statable-ueberleben.R` (wird hier von der Platte gelesen, NACH statable.R geladen: sp_id und die kat_*-Helfer dürfen benutzt werden; `statable.R` und
 * `sp_cox_zp` bleiben unverändert). survival (3.8-x) liegt im webR-Repo; `survreg` und `frailty` stecken darin.
 * Sollwerte: scripts/spaeter-f2-erwartet.R → lib/testdaten/spaeter-f2-erwartet.json, Abschnitte `aft`, `frailty`, `daten` (R 4.6.1, survival 3.8-6 am Mac). Zweite Quellen im Skript (stopifnot): eigene Weibull-Likelihood (Log-Likelihood auf 1e-8, Gradient 0),
 * Exponentialmodell von Hand (exp(b₀) = Zeitsumme/Ereignisse), `frailtyEM::emfrail` (Breslow: Koeffizient 5e-4, Varianz 2e-3), `coxme` nur als Richtungsprobe.
 *
 * R-Namen wie bei sp_cox: Spalten `zeit`, `ereignis`, `p01`, `p02` … (Prädiktoren in der Reihenfolge der Formel), `kennung` (Ganzzahl-Code 1 … G der Person/Gruppe, nie Text); Gruppen-Prädiktoren (`faktoren`): Faktor mit Codes 1 … k und Wertelabels,
 * ERSTE Stufe = Vergleichsgruppe, Koeffizientenname = Spalte + Stufe (`p03GN`).
 *
 * sp_aft(d, zeit, ereignis, praed, faktoren = character(0), dist = 'weibull')    dist: 'weibull' | 'exponential' | 'lognormal' | 'loglogistic'; praed darf leer sein (nur Achsenabschnitt)
 *   AUSGABE (R-Liste; Skalare dürfen als Vektor der Länge 1 ankommen): dist, n (Zeilen im Modell), ausgelassen, ereignisse, npar (Zahl der Koeffizienten ohne Skala), koef[{name, b, se, z, p, zeitverhaeltnis, ki_u, ki_o}] (erste Zeile der Achsenabschnitt mit name 'achsenabschnitt',
 *   dann die Prädiktoren; zeitverhaeltnis = exp(b), ki = exp(b -/+ qnorm(,975)·se), z = b/se, p = Wald zweiseitig), skala (σ; bei 'exponential' 1), loglik, loglik0, aic, hr_weibull (NUR bei dist 'weibull': [{name, hr = exp(−b/σ), ki_u, ki_o}] ohne Achsenabschnitt,
 *   ki = exp(−(b ± qnorm(,975)·se)/σ) mit σ fest - Näherung), trennung, warnungen. Fehler als list(fehler = Text), nie ein Absturz: Zeit ≤ 0 in einer Zeile des Modells 'survival times must be greater than zero'; kein Ereignis 'no event among the valid cases';
 *   Ereignis nicht 0/1 'the event must be coded 0 or 1'; unbekannte dist 'unknown distribution'.
 * sp_aft_aic(d, zeit, ereignis, praed, faktoren = character(0))   { vergleich: [{dist, aic, loglik}] in der Reihenfolge weibull, exponential, lognormal, loglogistic }
 * sp_frailty(d, zeit, ereignis, kennung, praed, faktoren = character(0), art = 'cluster', ties = 'efron')    art: 'cluster' (coxph + cluster(kennung), robuste Standardfehler) | 'gamma' (coxph + frailty(kennung, distribution = 'gamma'), EM-Verfahren); ties 'efron' | 'breslow'
 *   AUSGABE: art, ties, n, ausgelassen, ereignisse, gruppen (verschiedene kennung unter den Zeilen im Modell), npar, wenige_gruppen (TRUE bei gruppen < 20: Hinweis, nicht gesperrt), koef[{name, b, se, z, p, hr, ki_u, ki_o}] mit
 *   cluster: se = ROBUSTER Standardfehler (z, p, KI daraus), zusätzlich se_naiv; gamma: se = se(coef) der coxph-Ausgabe; hr = exp(b), ki = exp(b -/+ qnorm(,975)·se).
 *   gamma zusätzlich: varianz (Frailty-Varianz θ), c_loglik, loglik0 (c.loglik bei θ = 0), lr_chi2 = 2·(c_loglik − loglik0), p_halbiert = ½·P(χ²₁ ≥ lr_chi2) (Rand des Parameterraums), rand (TRUE bei varianz < 1e-4), warnungen.
 *   Fehler: weniger als 2 Gruppen mit mindestens 2 Zeilen 'at least two groups with two rows'; sonst wie sp_aft (ohne Zeit-Regel: Cox akzeptiert Zeit 0).
 * ALLE Skalare kommen OHNE Namen an (unname): die App liest `eins(x)`-artig; ein benannter Wert wird zu einem Objekt.
 * TOLERANZEN (relativ): b, se, z, ZV, HR, KI, logLik, AIC 1e-6 (survreg); Frailty-Zahlen (b, se, Varianz, c.loglik) 1e-4 (EM, webR 3.8-12 gegen Mac 3.8-6); p-Werte auf der log-Skala |ln(ist/soll)| < 2e-3. */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const manifestPfad = join(webrOrdner, 'manifest.json');
const dateiR = process.env.STATABLE_UEBERLEBEN_R ?? join(import.meta.dirname, 'statable-ueberleben.R');
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/MASS_7.3-65.tgz')) && existsSync(manifestPfad);

type Z = Record<string, any>;
const J = ERW as unknown as Z, AFT = J.aft as Z, FR = J.frailty as Z, DAT = J.daten as Z;
const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
const nah = (ist: any, soll: number, tol: number, was: string) => { const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Math.abs(i - soll) / Math.max(Math.abs(soll), 1e-3), `${was} (ist ${i}, soll ${soll})`).toBeLessThanOrEqual(tol); };
const pNah = (ist: any, soll: number, was: string) => { const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet`).toBe('number'); expect(Math.abs(Math.log(i / soll)), `${was} (ist ${i}, soll ${soll})`).toBeLessThan(2e-3); };
const zeilen = (x: any): Z[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
const rVec = (x: string[]) => (x.length === 0 ? 'character(0)' : `c(${x.map(v => `'${v}'`).join(', ')})`);
const col = (name: string, werte: (number | null)[]): RSpalte => ({ name, art: 'zahl', werte } as RSpalte);
const fakt = (name: string, werte: (number | null)[], labels: string[]): RSpalte => ({ name, art: 'faktor', werte, labels: labels.map((label, i) => ({ wert: i + 1, label })) } as RSpalte);

/** Daten wie die App sie an R gibt (R-Namen). */
const lungSp = (): RSpalte[] => [col('zeit', DAT.aft.lung.zeit), col('ereignis', DAT.aft.lung.ereignis), col('p01', DAT.aft.lung.age), col('p02', DAT.aft.lung.sex), col('p03', DAT.aft.lung.ph_ecog)];
const ovarSp = (): RSpalte[] => [col('zeit', DAT.aft.ovarian.zeit), col('ereignis', DAT.aft.ovarian.ereignis), col('p01', DAT.aft.ovarian.ecog_ps), col('p02', DAT.aft.ovarian.rx)];
const ratsSp = (): RSpalte[] => [col('zeit', DAT.frailty.rats.zeit), col('ereignis', DAT.frailty.rats.ereignis), col('p01', DAT.frailty.rats.rx), col('kennung', DAT.frailty.rats.wurf)];
const kidSp = (): RSpalte[] => [col('zeit', DAT.frailty.kidney.zeit), col('ereignis', DAT.frailty.kidney.ereignis), col('p01', DAT.frailty.kidney.age), col('p02', DAT.frailty.kidney.sex), fakt('p03', DAT.frailty.kidney.krankheit, ['Other', 'GN', 'AN', 'PKD']), col('kennung', DAT.frailty.kidney.id)];
const NAMEN_LUNG: Record<string, string> = { '(Intercept)': 'achsenabschnitt', age: 'p01', sex: 'p02', 'ph.ecog': 'p03' };
const NAMEN_OVAR: Record<string, string> = { '(Intercept)': 'achsenabschnitt', 'ecog.ps': 'p01', rx: 'p02' };
const NAMEN_KID: Record<string, string> = { age: 'p01', sex: 'p02', diseaseGN: 'p03GN', diseaseAN: 'p03AN', diseasePKD: 'p03PKD' };

describe.skipIf(!existsSync(manifestPfad))('Manifest: survival steht im webR-Manifest', () => {
  it('survival liegt im Repo und im Manifest', () => {
    const m = JSON.parse(readFileSync(manifestPfad, 'utf8')) as { pakete: Record<string, { p: string }[]> };
    expect(Object.keys(m.pakete)).toContain('survival'); expect(m.pakete.survival!.some(d => /\/survival_[\d.-]+\.tgz$/.test(d.p))).toBe(true);
  });
});

describe.skipIf(!da)('Später S-F2 D: AFT-Modell und Frailty in webR gegen R am Mac (braucht: engine/statable-ueberleben.R mit sp_aft, sp_aft_aic, sp_frailty)', () => {
  let server: Server; let r: any; let sh: any; let survivalFehler = '';
  const rechne = async (code: string) => rZuJson(await (await sh.evalR(code)).toJs()) as Z;
  const daten = async (name: string, spalten: RSpalte[]) => {
    const werte: Record<string, unknown> = {}, lab: Record<string, unknown> = {};
    for (const sp of spalten) {
      werte[sp.name] = await new r.RDouble(sp.werte.map((v: any) => (v == null ? null : Number(v))));
      lab[sp.name] = sp.art === 'faktor' && sp.labels ? await new r.RList({ wert: await new r.RDouble(sp.labels.map(l => Number(l.wert))), label: await new r.RCharacter(sp.labels.map(l => l.label)) }) : await new r.RList({});
    }
    const g = r.objs.globalEnv;
    await g.bind('.sp_werte', await new r.RList(werte)); await g.bind('.sp_art', await new r.RCharacter(spalten.map(s => s.art))); await g.bind('.sp_lab', await new r.RList(lab));
    await r.evalRVoid(rDataFrameCode(name, spalten) + '\nrm(.sp_werte, .sp_art, .sp_lab)');
  };
  const aft = (args: string) => `tryCatch(sp_aft(${args}), error = function(e) list(fehler = conditionMessage(e)))`;
  const fra = (args: string) => `tryCatch(sp_frailty(${args}), error = function(e) list(fehler = conditionMessage(e)))`;
  const aftLauf = async (sp: RSpalte[], praed: string[], dist: string, faktoren: string[] = []) => { await daten('d', sp); return rechne(aft(`d, 'zeit', 'ereignis', ${rVec(praed)}, ${rVec(faktoren)}, '${dist}'`)); };
  const fraLauf = async (sp: RSpalte[], praed: string[], art: string, ties = 'efron', faktoren: string[] = []) => { await daten('d', sp); return rechne(fra(`d, 'zeit', 'ereignis', 'kennung', ${rVec(praed)}, ${rVec(faktoren)}, '${art}', '${ties}'`)); };

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
    if (existsSync(dateiR)) await rechne(`{ ${readFileSync(dateiR, 'utf8')}\nTRUE }`);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  it('survival ist installierbar; die Datei definiert sp_aft, sp_aft_aic und sp_frailty (neben sp_cox und sp_cox_zp)', async () => {
    expect(survivalFehler).toBe(''); const o = await rechne(`c(aft = exists('sp_aft'), aic = exists('sp_aft_aic'), fr = exists('sp_frailty'), cox = exists('sp_cox'), zp = exists('sp_cox_zp'))`);
    expect([eins(o.aft), eins(o.aic), eins(o.fr), eins(o.cox), eins(o.zp)], 'sp_aft, sp_aft_aic, sp_frailty fehlen in engine/statable-ueberleben.R (Bauer B)').toEqual([true, true, true, true, true]);
  });

  /* ---------------------------------------------------------------- AFT */
  const pruefeAft = (o: Z, soll: Z, namen: Record<string, string>, was: string, mitHr = false) => {
    expect(o.fehler, `${was}: R-Fehler: ${o.fehler}`).toBeUndefined(); expect(eins(o.n), `${was}: n`).toBe(soll.n); expect(eins(o.ereignisse), `${was}: ereignisse`).toBe(soll.ereignisse);
    expect(zeilen(o.koef).length, `${was}: Zahl der Koeffizienten`).toBe(soll.koef.length);
    for (const sk of soll.koef as Z[]) {
      const nm = namen[sk.name]!; const z = zeilen(o.koef).find(x => eins(x.name) === nm); expect(z, `${was}: Koeffizient ${nm}`).toBeDefined();
      for (const k of ['b', 'se', 'z']) nah(z![k], sk[k], 1e-6, `${was} ${nm} ${k}`); pNah(z!.p, sk.p, `${was} ${nm} p`); nah(z!.zeitverhaeltnis, sk.zeitverhaeltnis, 1e-6, `${was} ${nm} ZV`); nah(z!.ki_u, sk.ki_u, 1e-6, `${was} ${nm} ki_u`); nah(z!.ki_o, sk.ki_o, 1e-6, `${was} ${nm} ki_o`);
    }
    nah(o.skala, soll.skala, 1e-6, `${was} skala`); nah(o.loglik, soll.loglik, 1e-6, `${was} loglik`); nah(o.aic, soll.aic, 1e-6, `${was} aic`); expect(eins(o.trennung), `${was}: keine Trennung`).toBe(false);
    if (!mitHr) expect(o.hr_weibull, `${was}: hr_weibull nur beim Weibull-Modell`).toBeUndefined();
  };
  for (const dist of ['weibull', 'exponential', 'lognormal', 'loglogistic']) {
    it(`lung (227 Fälle, 164 Ereignisse), ${dist}: Koeffizienten, Zeitverhältnis mit Intervall, Skala, Log-Likelihood, AIC gleich R am Mac`, async () => {
      const o = await aftLauf(lungSp(), ['p01', 'p02', 'p03'], dist); pruefeAft(o, AFT[dist], NAMEN_LUNG, dist, dist === 'weibull'); expect(eins(o.dist)).toBe(dist); expect(eins(o.npar)).toBe(4);
    });
  }
  it('Weibull in HR: exp(−b/σ) mit Intervall (σ fest), nur für Weibull: age 1,0103, Frau 0,5778, ECOG 1,5913; nahe an Cox (1,0111 / ,5754 / 1,5900)', async () => {
    const o = await aftLauf(lungSp(), ['p01', 'p02', 'p03'], 'weibull'); expect(zeilen(o.hr_weibull)).toHaveLength(3); const namen: Record<string, string> = { age: 'p01', sex: 'p02', 'ph.ecog': 'p03' };
    for (const sh_ of AFT.weibull_in_hr as Z[]) { const z = zeilen(o.hr_weibull).find(x => eins(x.name) === namen[sh_.name])!; expect(z, sh_.name).toBeDefined(); nah(z.hr, sh_.hr, 1e-6, `HR ${sh_.name}`); nah(z.ki_u, sh_.ki_u, 1e-6, 'ki_u'); nah(z.ki_o, sh_.ki_o, 1e-6, 'ki_o'); expect(Math.abs(Math.log(sh_.hr) - Math.log(sh_.hr_cox))).toBeLessThan(0.05); }
  });
  it('VORZEICHEN (Falle): Frauen: b = +0,401 und Zeitverhältnis 1,49 im AFT-Modell; Cox gäbe b = −0,553 und HR 0,575 - der Sollwert hält beides', async () => {
    const o = await aftLauf(lungSp(), ['p01', 'p02', 'p03'], 'weibull'); const z = zeilen(o.koef).find(x => eins(x.name) === 'p02')!; expect(eins(z.b)).toBeGreaterThan(0); nah(z.zeitverhaeltnis, 1.4934525, 1e-6, 'ZV'); const v = AFT.vorzeichen_falle as Z; expect(v.sex_b_cox).toBeLessThan(0); nah(v.sex_hr_cox, 0.5754446, 1e-6, 'HR Cox');
  });
  it('AIC-Vergleich der vier Verteilungen: Reihenfolge Weibull < log-logistisch < exponentiell < log-normal, Werte gleich R', async () => {
    await daten('d', lungSp()); const o = await rechne(`tryCatch(sp_aft_aic(d, 'zeit', 'ereignis', c('p01', 'p02', 'p03'), character(0)), error = function(e) list(fehler = conditionMessage(e)))`); expect(o.fehler).toBeUndefined();
    const v = zeilen(o.vergleich); expect(v.map(x => eins(x.dist))).toEqual(['weibull', 'exponential', 'lognormal', 'loglogistic']); for (const x of v) { nah(x.aic, AFT[eins(x.dist)].aic, 1e-6, `AIC ${eins(x.dist)}`); nah(x.loglik, AFT[eins(x.dist)].loglik, 1e-6, `logLik ${eins(x.dist)}`); }
    expect(v.map(x => [eins(x.dist), eins(x.aic)] as [string, number]).sort((a, b) => a[1] - b[1]).map(x => x[0])).toEqual(AFT.aic_rangfolge);
  });
  it('Handrechnung: nur Achsenabschnitt, exponentiell: exp(b₀) = Zeitsumme/Ereignisse = 423,9146 (Mittelwert der Überlebenszeit); σ = 1', async () => {
    const h = AFT.handrechnung_exponential as Z; const o = await aftLauf(lungSp(), [], 'exponential'); expect(o.fehler).toBeUndefined(); expect(zeilen(o.koef)).toHaveLength(1); nah(zeilen(o.koef)[0]!.zeitverhaeltnis, h.exp_b0, 1e-6, 'exp(b0)'); nah(h.exp_b0, h.zeitsumme / h.ereignisse, 1e-8, 'Zeitsumme/Ereignisse'); nah(o.skala, 1, 1e-12, 'σ');
  });
  it('zweites Beispiel ovarian (26 Frauen, 12 Ereignisse; ecog.ps, rx): Weibull gleich R', async () => { const o = await aftLauf(ovarSp(), ['p01', 'p02'], 'weibull'); pruefeAft(o, { ...AFT.ovarian_weibull, n: 26 }, NAMEN_OVAR, 'ovarian', true); });
  it('Gruppen-Prädiktor (Faktor mit Vergleichsgruppe = erste Stufe): Koeffizientenname Spalte + Stufe („p02w“); die Steigungen gleich der Rechnung mit der Zahl (der Achsenabschnitt unterscheidet sich um die Steigung des Geschlechts)', async () => {
    const sp = lungSp().map(s => (s.name === 'p02' ? fakt('p02', (s.werte as number[]), ['m', 'w']) : s)); const g = await aftLauf(sp, ['p01', 'p02', 'p03'], 'weibull', ['p02']); const z = await aftLauf(lungSp(), ['p01', 'p02', 'p03'], 'weibull');
    expect(g.fehler).toBeUndefined(); expect(zeilen(g.koef).map(x => eins(x.name))).toEqual(['achsenabschnitt', 'p01', 'p02w', 'p03']); const zk = (n: string) => zeilen(z.koef).find(x => eins(x.name) === n)!, gk = (n: string) => zeilen(g.koef).find(x => eins(x.name) === n)!;
    for (const [a, b] of [['p01', 'p01'], ['p02', 'p02w'], ['p03', 'p03']] as const) { nah(gk(b).b, eins(zk(a).b), 1e-9, `Steigung ${b}`); nah(gk(b).se, eins(zk(a).se), 1e-9, `se ${b}`); }
    nah(gk('achsenabschnitt').b, eins(zk('achsenabschnitt').b) + eins(zk('p02').b), 1e-9, 'Achsenabschnitt: Zahl 1 = m, Faktor m = 0');
  });
  it('fehlende Werte listenweise: eine Lücke im Alter → 226 Zeilen, ausgelassen 1', async () => { const sp = lungSp().map(s => (s.name === 'p01' ? col('p01', (s.werte as (number | null)[]).map((v, i) => (i === 4 ? null : v))) : s)); const o = await aftLauf(sp, ['p01', 'p02', 'p03'], 'weibull'); expect([eins(o.n), eins(o.ausgelassen)]).toEqual([226, 1]); });
  it('Fehler als Text, nie ein Absturz: Zeit 0 („survival times must be greater than zero“, Cox hätte es akzeptiert); kein Ereignis; Ereignis nicht 0/1; unbekannte Verteilung', async () => {
    const z0 = lungSp().map(s => (s.name === 'zeit' ? col('zeit', (s.werte as number[]).map((v, i) => (i === 0 ? 0 : v))) : s)); const a = await aftLauf(z0, ['p01'], 'weibull'); expect(String(eins(a.fehler))).toMatch(/greater than zero/); expect(a.koef).toBeUndefined();
    const k0 = lungSp().map(s => (s.name === 'ereignis' ? col('ereignis', (s.werte as number[]).map(() => 0)) : s)); expect(String(eins((await aftLauf(k0, ['p01'], 'weibull')).fehler))).toMatch(/no event among the valid cases/);
    const k2 = lungSp().map(s => (s.name === 'ereignis' ? col('ereignis', (s.werte as number[]).map((v, i) => (i === 0 ? 2 : v))) : s)); expect(String(eins((await aftLauf(k2, ['p01'], 'weibull')).fehler))).toMatch(/event must be coded 0 or 1/);
    expect(String(eins((await aftLauf(lungSp(), ['p01'], 'gumbel')).fehler))).toMatch(/unknown distribution/);
  });

  /* ---------------------------------------------------------------- Frailty und cluster */
  it('rats, cluster: Koeffizient identisch zum Modell ohne cluster, robuster Standardfehler ,2710, HR 2,0416, p ,0085; gruppen 100, 42 Ereignisse', async () => {
    const o = await fraLauf(ratsSp(), ['p01'], 'cluster'); expect(o.fehler, `${o.fehler}`).toBeUndefined(); const c = FR.rats.cluster as Z, k = zeilen(o.koef)[0]!;
    expect(eins(o.art)).toBe('cluster'); expect([eins(o.n), eins(o.ereignisse), eins(o.gruppen)]).toEqual([300, 42, 100]); expect(eins(o.wenige_gruppen)).toBe(false);
    nah(k.b, c.b, 1e-6, 'b'); nah(k.b, FR.rats.ohne.b, 1e-9, 'b gleich ohne cluster'); nah(k.se, c.se_robust, 1e-6, 'robuster se'); nah(k.se_naiv, c.se_naiv, 1e-6, 'se naiv'); nah(k.hr, c.hr, 1e-6, 'HR'); nah(k.z, c.b / c.se_robust, 1e-6, 'z'); pNah(k.p, c.p, 'p');
    nah(k.ki_u, Math.exp(c.b - 1.959963984540054 * c.se_robust), 1e-6, 'ki_u'); nah(k.ki_o, Math.exp(c.b + 1.959963984540054 * c.se_robust), 1e-6, 'ki_o');
  });
  it('rats, Frailty (gamma, Efron = Voreinstellung): b ,72708, se ,3183, Varianz 2,0204, c.loglik −217,5498 gegen −222,6654 ohne Frailty, LR 10,23, halbiertes p ,00069', async () => {
    const o = await fraLauf(ratsSp(), ['p01'], 'gamma'); expect(o.fehler, `${o.fehler}`).toBeUndefined(); const f = FR.rats.frailty_gamma_efron as Z, k = zeilen(o.koef)[0]!; expect(eins(o.ties)).toBe('efron'); expect(eins(o.rand)).toBe(false);
    nah(k.b, f.b, 1e-4, 'b'); nah(k.se, f.se, 1e-4, 'se'); nah(k.hr, f.hr, 1e-4, 'HR'); pNah(k.p, f.p, 'p'); nah(o.varianz, f.varianz, 1e-4, 'Varianz'); nah(o.c_loglik, f.c_loglik, 1e-5, 'c.loglik'); nah(o.loglik0, f.loglik_ohne_frailty, 1e-5, 'loglik0'); nah(o.lr_chi2, f.lr_chi2, 1e-3, 'LR');
    pNah(o.p_halbiert, f.p_halbiert, 'p halbiert'); expect(eins(o.p_halbiert)).toBeLessThan(0.001);
  });
  it('rats, Frailty mit Breslow: gleich emfrail (Koeffizient 5e-4, Varianz 2e-3, Log-Likelihoods 1e-3) und gleich dem Sollwert', async () => {
    const o = await fraLauf(ratsSp(), ['p01'], 'gamma', 'breslow'); expect(o.fehler).toBeUndefined(); const f = FR.rats.frailty_gamma_breslow as Z, em = FR.rats.emfrail_gamma as Z, k = zeilen(o.koef)[0]!; expect(eins(o.ties)).toBe('breslow');
    nah(k.b, f.b, 1e-4, 'b'); nah(o.varianz, f.varianz, 1e-4, 'Varianz'); nah(o.c_loglik, f.c_loglik, 1e-5, 'c.loglik'); nah(k.b, em.b, 5e-4, 'b gegen emfrail'); nah(o.varianz, em.varianz, 2e-3, 'Varianz gegen emfrail'); nah(o.c_loglik, em.loglik[0], 1e-3, 'Log-Likelihood gegen emfrail'); nah(o.loglik0, em.loglik[1], 1e-3, 'ohne Frailty gegen emfrail');
  });
  it('kidney (38 Patienten × 2 Zeilen, 58 Ereignisse; age, sex, disease als Faktor): cluster gleich R (Koeffizienten, robuste Standardfehler); Frailty-Varianz ≈ 0 (Rand des Parameterraums, rand = TRUE) und Koeffizienten wie ohne Frailty', async () => {
    const c = await fraLauf(kidSp(), ['p01', 'p02', 'p03'], 'cluster', 'efron', ['p03']); expect(c.fehler, `${c.fehler}`).toBeUndefined(); const K = FR.kidney as Z;
    expect(zeilen(c.koef).map(x => eins(x.name))).toEqual(['p01', 'p02', 'p03GN', 'p03AN', 'p03PKD']); expect([eins(c.n), eins(c.ereignisse), eins(c.gruppen)]).toEqual([76, 58, 38]);
    K.ohne.namen.forEach((nm: string, i: number) => { const z = zeilen(c.koef).find(x => eins(x.name) === NAMEN_KID[nm])!; nah(z.b, K.cluster.b[i], 1e-6, `b ${nm}`); nah(z.se, K.cluster.se_robust[i], 1e-6, `robuster se ${nm}`); });
    const g = await fraLauf(kidSp(), ['p01', 'p02', 'p03'], 'gamma', 'efron', ['p03']); expect(g.fehler, `${g.fehler}`).toBeUndefined(); expect(eins(g.varianz)).toBeLessThan(1e-4); expect(eins(g.rand)).toBe(true); expect(eins(g.p_halbiert)).toBeGreaterThan(0.1);
    K.ohne.namen.forEach((nm: string, i: number) => { const z = zeilen(g.koef).find(x => eins(x.name) === NAMEN_KID[nm])!; nah(z.b, K.frailty_gamma.b[i], 1e-4, `Frailty b ${nm}`); nah(z.se, K.frailty_gamma.se[i], 1e-4, `Frailty se ${nm}`); nah(z.b, K.ohne.b[i], 1e-4, `wie ohne Frailty ${nm}`); });
    nah(g.loglik0, K.frailty_gamma.loglik_ohne_frailty, 1e-5, 'loglik0');
  });
  it('Hinweis „wenige Gruppen“ unter 20 Gruppen (nicht gesperrt); gesperrt bei weniger als 2 Gruppen mit mindestens 2 Zeilen (lauter Einzelzeilen: „at least two groups with two rows“)', async () => {
    const w = DAT.frailty.rats.wurf as number[]; const keep = w.map((v, i) => (v <= 15 ? i : -1)).filter(i => i >= 0); const wenige = ratsSp().map(s => col(s.name, keep.map(i => (s.werte as any)[i])));
    const a = await fraLauf(wenige, ['p01'], 'cluster'); expect(a.fehler).toBeUndefined(); expect(eins(a.gruppen)).toBe(15); expect(eins(a.wenige_gruppen)).toBe(true);
    const einzel = ratsSp().map(s => (s.name === 'kennung' ? col('kennung', (s.werte as number[]).map((_, i) => i + 1)) : s)); for (const art of ['cluster', 'gamma']) { const o = await fraLauf(einzel, ['p01'], art); expect(String(eins(o.fehler)), art).toMatch(/at least two groups with two rows/); expect(o.koef).toBeUndefined(); }
  });
  it('Cox akzeptiert Zeit 0, das AFT-Modell nicht: dieselben Daten mit einer Null-Zeit laufen bei sp_frailty, brechen bei sp_aft ab', async () => {
    const z0 = ratsSp().map(s => (s.name === 'zeit' ? col('zeit', (s.werte as number[]).map((v, i) => (i === 0 ? 0 : v))) : s)); const f = await fraLauf(z0, ['p01'], 'cluster'); expect(f.fehler, `${f.fehler}`).toBeUndefined();
    await daten('d', z0); const a = await rechne(aft(`d, 'zeit', 'ereignis', c('p01'), character(0), 'weibull'`)); expect(String(eins(a.fehler))).toMatch(/greater than zero/);
  });
  it('Fehler wie sp_cox: kein Ereignis, Ereignis nicht 0/1, ungültige Art oder Bindung → Text, nie ein Absturz', async () => {
    const k0 = ratsSp().map(s => (s.name === 'ereignis' ? col('ereignis', (s.werte as number[]).map(() => 0)) : s)); expect(String(eins((await fraLauf(k0, ['p01'], 'cluster')).fehler))).toMatch(/no event among the valid cases/);
    const k2 = ratsSp().map(s => (s.name === 'ereignis' ? col('ereignis', (s.werte as number[]).map((v, i) => (i === 0 ? 2 : v))) : s)); expect(String(eins((await fraLauf(k2, ['p01'], 'cluster')).fehler))).toMatch(/event must be coded 0 or 1/);
    expect(typeof eins((await fraLauf(ratsSp(), ['p01'], 'weibull')).fehler)).toBe('string'); expect(typeof eins((await fraLauf(ratsSp(), ['p01'], 'cluster', 'exakt')).fehler)).toBe('string');
  });

  /* ---------------------------------------------------------------- Sicherheit (CLAUDE.md): Namen gehen nie als Text in R-Code */
  const GEFAHR = [`x'); assign('.pwned', TRUE, globalenv()); ('`, 'a`; assign(".pwned", TRUE, globalenv()); `b', `a" ; assign('.pwned', TRUE, globalenv()) ; "b`, `x\n assign('.pwned', TRUE, globalenv())`];
  const pwned = async () => (await rechne(`exists('.pwned', envir = globalenv())`)) as unknown as boolean[] | boolean;
  it('R-Seite: sp_id lehnt gefährliche Namen für Zeit, Ereignis, Kennung und Prädiktoren ab (zweite Sperre) - bei sp_aft, sp_aft_aic und sp_frailty; nichts läuft', async () => {
    const d = `data.frame(zeit = c(1, 2, 3, 4, 5, 6), ereignis = c(1, 0, 1, 1, 0, 1), kennung = c(1, 1, 2, 2, 3, 3), p01 = c(0, 1, 1, 0, 0, 1))`;
    for (const g of GEFAHR) {
      await r.objs.globalEnv.bind('.sp_arg', await new r.RList({ g: await new r.RCharacter([g]) }));
      const codes = [aft(`${d}, .sp_arg$g, 'ereignis', 'p01'`), aft(`${d}, 'zeit', .sp_arg$g, 'p01'`), aft(`${d}, 'zeit', 'ereignis', .sp_arg$g`), `tryCatch(sp_aft_aic(${d}, 'zeit', 'ereignis', .sp_arg$g), error = function(e) list(fehler = conditionMessage(e)))`,
        fra(`${d}, .sp_arg$g, 'ereignis', 'kennung', 'p01'`), fra(`${d}, 'zeit', .sp_arg$g, 'kennung', 'p01'`), fra(`${d}, 'zeit', 'ereignis', .sp_arg$g, 'p01'`), fra(`${d}, 'zeit', 'ereignis', 'kennung', .sp_arg$g`)];
      for (const code of codes) { const o = await rechne(code); expect(String(eins(o.fehler)), code).toMatch(/unsafe name/); expect(eins(await pwned())).toBe(false); }
    }
  });
  it('Verteilung, Art und Bindung gehen nur als feste Wörter durch: ein Wort mit Anführungszeichen wird abgelehnt, es läuft nichts', async () => {
    await daten('d', lungSp()); const o = await rechne(aft(`d, 'zeit', 'ereignis', c('p01'), character(0), "weibull'); assign('.pwned', TRUE, globalenv()); ('x"`)); expect(String(eins(o.fehler))).toMatch(/unknown distribution|unsafe name/); expect(eins(await pwned())).toBe(false);
  });
  it('das Ergebnis trägt die R-Namen (achsenabschnitt, p01 …), nie Anzeigenamen aus den Daten', async () => { const o = await aftLauf(lungSp(), ['p01', 'p02', 'p03'], 'weibull'); expect(o.fehler, `${o.fehler}`).toBeUndefined(); expect(zeilen(o.koef).length).toBeGreaterThan(0); expect(JSON.stringify(o)).not.toMatch(/pwned|assign\(/); });
});
