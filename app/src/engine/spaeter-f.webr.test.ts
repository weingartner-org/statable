import { pathToFileURL } from 'node:url';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { R_START } from './rproben';
import { rZuJson, rDataFrameCode, type RSpalte } from './webr';
import STATABLE_R from './statable.R?raw';
import { umformenWechsel, coxZpDaten, coxZpAufruf } from '../lib/coxzeit';
import ERW from '../lib/testdaten/spaeter-f-erwartet.json';

/* Später, Welle S-F, Cox mit zeitabhängiger Größe (Zählprozess) in webR gegen die Sollwerte aus R am Mac. ROTE TESTS des Sollwert-Prüfers
 * (Fachblatt docs/fachblaetter/SPAETER-F-UEBERLEBEN-MEDIZIN.md Abschnitt 2, „Entscheidungen Opus (18.10.)“ 3 gehen vor). Der Bauer A darf diese Datei und die JSON nicht ändern.
 * Bauer A baut `sp_cox_zp` in der NEUEN Datei `engine/statable-ueberleben.R` (wird hier von der Platte gelesen, NACH statable.R geladen: sp_id und die kat_*-Helfer dürfen benutzt werden; `statable.R` bleibt unverändert) -
 * survival (3.8-x) liegt seit Welle 7 im webR-Repo und im Manifest. Der Umformer (Form A) rechnet in JS: lib/coxzeit.ts (Test: lib/coxzeit.test.ts).
 * Sollwerte: scripts/spaeter-f-erwartet.R → lib/testdaten/spaeter-f-erwartet.json, Abschnitt `coxzp` (R 4.6.1, survival 3.8-6 am Mac). Zweite Quellen im Skript (stopifnot): eigenes Newton-Raphson (partielle Likelihood von Hand,
 * Zählprozess, Efron und Breslow; 1e-12), die Umformung gleich survival::tmerge (Abweichung 0) und GEDRUCKT die survival-Vignette `timedep`, Abschnitt 3.3, S. 11 (Kalbfleisch & Prentice 1980, Tabelle 6.1, Modell 6): age 0,01527 (SE 0,01750), trt 0,04457 (0,32171),
 * surgery −0,62113 (0,36786), year −0,13608 (0,07090), age:trt 0,02703 (0,02714), LR 16,06 auf 5 Freiheitsgrade, 170 Zeilen, 75 Ereignisse.
 *
 * EINGABE: sp_cox_zp(d, start, stopp, ereignis, id, praed, faktoren = character(0), ties = 'efron')
 *   - d: data.frame (wie RMotor.daten und rDataFrameCode); start, stopp (Zahlen; Abschnitte (Start, Stopp], links offen), ereignis (0/1, 1 nur in der letzten Zeile der Person), id (Ganzzahl-Kennung der Person; nur zum Zählen der Personen,
 *     KEIN cluster(id): für EINE zeitabhängige Größe sind mehrere Zeilen je Person in Ordnung), praed = Namen der Prädiktoren in der Reihenfolge der Formel (die zeitabhängige Größe darf an jeder Stelle stehen), faktoren = Namen der Gruppen-Prädiktoren
 *     (art 'faktor': Codes 1 … k mit Wertelabels, ERSTE STUFE = VERGLEICHSGRUPPE; nichts wird umsortiert). ties: 'efron' (Voreinstellung, wie sp_cox) | 'breslow'. Zeilen mit fehlenden Werten fallen listenweise heraus.
 *   - Alle Namen gehen durch `sp_id` (zweite Sperre wie bei den anderen Funktionen); Namen kommen nie als Text in den Code, sondern als Namen von Spalten der Daten (R-Namen id, start, stopp, ereignis, p01 …).
 * AUSGABE (R-Liste wie sp_cox; Skalare dürfen als Vektor der Länge 1 ankommen; Zeilenlisten = Arrays von Objekten; sp_cox_zp wirft nie, Fehler = list(fehler = '…')):
 *   ties, n (ZEILEN im Modell), personen (verschiedene id unter den Zeilen im Modell), ausgelassen (Zeilen mit Lücken), ereignisse, npar, epv (= ereignisse/npar), epv_hinweis (TRUE bei epv < 10),
 *   koef[{name, b, se, z, p, hr, ki_u, ki_o}]   hr = exp(b), ki = exp(b -/+ qnorm(,975)·se), z = b/se, p = 2·pnorm(-|z|) (Wald); name = Spalte (+ Stufe bei Gruppen: 'surgeryja')
 *   loglik, loglik0, modelltest{chi2, df, p}, lr_praed[{name, chi2, df, p}] (LR je Prädiktor auf denselben Zeilen; df = Zahl der Koeffizienten des Prädiktors), ph{gesamt{chi2, df, p}, praed[{name, chi2, df, p}]}
 *   (cox.zph(transform = 'km', terms = TRUE), auch mit Zählprozess-Daten), trennung, warnungen. KEINE Konkordanz (bei Zählprozess-Daten nicht aussagekräftig).
 *   Fehler (list(fehler = Text), nie ein Absturz): ein Stopp, der nicht größer als der Start ist, in einer Zeile des Modells: 'stop time must be greater than start time' (coxph würde die Zeile still zu NA machen);
 *   kein Ereignis unter den gültigen Zeilen: 'no event among the valid cases'; Ereignis nicht 0/1: 'the event must be coded 0 or 1'.
 * TOLERANZEN (relativ): B, SE, z, HR, KI, logLik, χ² 1e-6; cox.zph-χ² 1e-5; p-Werte auf der log-Skala |ln(ist/soll)| < 2e-3 (webR 3.8-12 gegen Mac 3.8-6). */

const webrOrdner = join(import.meta.dirname, '../../public/webr');
const manifestPfad = join(webrOrdner, 'manifest.json');
const dateiR = process.env.STATABLE_UEBERLEBEN_R ?? join(import.meta.dirname, 'statable-ueberleben.R');   // Umgebungsvariable nur zum Ausprobieren einer anderen Fassung
const da = existsSync(join(webrOrdner, 'repo/bin/emscripten/contrib/4.6/MASS_7.3-65.tgz')) && existsSync(manifestPfad);

type Z = Record<string, any>;
const J = ERW as unknown as Z;
const ZP = J.coxzp as Z, DATEN = ZP.daten as Record<string, Record<string, (number | null)[]>>, FAELLE = ZP.faelle as Record<string, Z>;
const eins = (x: any) => (Array.isArray(x) ? x[0] : x);
const nah = (ist: any, soll: number, tol: number, was: string) => { const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet, ist ${JSON.stringify(ist)}`).toBe('number'); expect(Math.abs(i - soll) / Math.max(Math.abs(soll), 1e-3), `${was} (ist ${i}, soll ${soll})`).toBeLessThan(tol); };
const pNah = (ist: any, soll: number, was: string) => { const i = eins(ist); expect(typeof i, `${was}: Zahl erwartet`).toBe('number'); if (soll === 0 || i === 0) { expect(i, was).toBe(soll); return; } expect(Math.abs(Math.log(i / soll)), `${was} (ist ${i}, soll ${soll})`).toBeLessThan(2e-3); };
const zeilen = (x: any): Z[] => (Array.isArray(x) ? x : x == null ? [] : [x]);
const leerVektor = (x: any) => x == null || (Array.isArray(x) && x.length === 0) || (typeof x === 'object' && !Array.isArray(x) && (x as Z).type === 'null');
const rVec = (x: (string | number | null)[]) => x.length === 0 ? 'character(0)' : `c(${x.map(v => (v == null ? 'NA' : typeof v === 'string' ? `'${v.replace(/'/g, "\\'")}'` : String(v))).join(', ')})`;

/** Spalten eines Datensatzes aus dem JSON als RSpalte: Gruppen-Spalten (`faktoren`) als Faktor mit den Stufen aus `stufen` (Codes 1 … k in dieser Reihenfolge, 0/1 der Quelle → 1/2). */
function spaltenAus(ds: string, namen: string[], faktoren: string[], stufen: Record<string, string[]> = {}, aendern: (name: string, werte: (number | null)[]) => (number | null)[] = (_, w) => w): RSpalte[] {
  return namen.map(name => {
    const werte = aendern(name, DATEN[ds]![name]!.slice());
    if (!faktoren.includes(name)) return { name, art: 'zahl', werte } as RSpalte;
    const lv = stufen[name]!; return { name, art: 'faktor', werte: werte.map(v => (v == null ? null : v + 1)), labels: lv.map((label, i) => ({ wert: i + 1, label })) } as RSpalte;
  });
}
const SPALTEN = ['id', 'start', 'stopp', 'ereignis'];

describe.skipIf(!existsSync(manifestPfad))('Manifest: survival steht im webR-Manifest (seit Welle 7)', () => {
  it('survival liegt im Repo und im Manifest', () => {
    const m = JSON.parse(readFileSync(manifestPfad, 'utf8')) as { pakete: Record<string, { p: string }[]> };
    expect(Object.keys(m.pakete), 'Feld pakete enthält survival').toContain('survival'); expect(m.pakete.survival!.some(d => /\/survival_[\d.-]+\.tgz$/.test(d.p))).toBe(true);
  });
});

describe.skipIf(!da)('Später S-F: Cox mit zeitabhängiger Größe (Zählprozess) in webR gegen R am Mac (braucht: engine/statable-ueberleben.R mit sp_cox_zp)', () => {
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
  const aufruf = (args: string) => `tryCatch(sp_cox_zp(${args}), error = function(e) list(fehler = conditionMessage(e)))`;
  const lauf = async (f: Z, aendern?: (name: string, w: (number | null)[]) => (number | null)[]) => {
    const praed = f.frage.praed as string[], faktoren = (f.frage.faktoren ?? []) as string[]; await daten('d', spaltenAus(f.frage.daten, [...SPALTEN, ...praed], faktoren, f.frage.faktor_stufen ?? {}, aendern));
    return rechne(aufruf(`d, 'start', 'stopp', 'ereignis', 'id', ${rVec(praed)}, ${rVec(faktoren)}, '${f.frage.ties}'`));
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
    if (existsSync(dateiR)) await rechne(`{ ${readFileSync(dateiR, 'utf8')}\nTRUE }`);
  }, 900000);
  afterAll(() => { r?.close?.(); server?.close(); });

  it('survival ist aus dem webR-Repo installierbar, die Datei engine/statable-ueberleben.R liegt da und definiert sp_cox_zp', async () => {
    expect(survivalFehler, 'survival muss aus dem webR-Repo installierbar sein').toBe('');
    expect(existsSync(dateiR), 'engine/statable-ueberleben.R fehlt (Bauer A)').toBe(true);
    const o = await rechne(`c(zp = exists('sp_cox_zp'), cox = exists('sp_cox'), survival = requireNamespace('survival', quietly = TRUE))`); expect([eins(o.zp), eins(o.cox), eins(o.survival)]).toEqual([true, true, true]);
  });

  /** Vergleich eines Ergebnisses mit den Sollwerten. */
  const pruefe = (o: Z, soll: Z, was: string, tol = 1e-6) => {
    expect(o.fehler, `${was}: R-Fehler: ${o.fehler}`).toBeUndefined();
    expect(eins(o.ties), `${was}: ties`).toBe(soll.ties); expect(eins(o.n), `${was}: n (Zeilen)`).toBe(soll.n); expect(eins(o.personen), `${was}: personen`).toBe(soll.personen); expect(eins(o.ausgelassen), `${was}: ausgelassen`).toBe(soll.ausgelassen);
    expect(eins(o.ereignisse), `${was}: ereignisse`).toBe(soll.ereignisse); expect(eins(o.npar), `${was}: npar`).toBe(soll.npar); nah(o.epv, soll.epv, 1e-12, `${was} epv`); expect(eins(o.epv_hinweis), `${was}: epv_hinweis`).toBe(soll.epv_hinweis);
    expect(zeilen(o.koef).length, `${was}: Zahl der Koeffizienten`).toBe(soll.koef.length);
    for (const sk of soll.koef as Z[]) {
      const z = zeilen(o.koef).find(x => eins(x.name) === sk.name); expect(z, `${was}: Koeffizient ${sk.name}`).toBeDefined();
      nah(z!.b, sk.b, tol, `${was} ${sk.name} b`); nah(z!.se, sk.se, tol, `${was} ${sk.name} se`); nah(z!.z, sk.z, tol, `${was} ${sk.name} z`); pNah(z!.p, sk.p, `${was} ${sk.name} p`);
      nah(z!.hr, sk.hr, tol, `${was} ${sk.name} hr`); nah(z!.ki_u, sk.ki_u, tol, `${was} ${sk.name} ki_u`); nah(z!.ki_o, sk.ki_o, tol, `${was} ${sk.name} ki_o`);
    }
    nah(o.loglik, soll.loglik, tol, `${was} loglik`); nah(o.loglik0, soll.loglik0, tol, `${was} loglik0`); nah(o.modelltest.chi2, soll.modelltest.chi2, tol, `${was} modelltest.chi2`); expect(eins(o.modelltest.df)).toBe(soll.modelltest.df); pNah(o.modelltest.p, soll.modelltest.p, `${was} modelltest.p`);
    for (const l of soll.lr_praed as Z[]) { const z = zeilen(o.lr_praed).find(x => eins(x.name) === l.name); expect(z, `${was}: lr_praed ${l.name}`).toBeDefined(); nah(z!.chi2, l.chi2, tol, `${was} lr ${l.name}.chi2`); expect(eins(z!.df), `${was} lr ${l.name}.df`).toBe(l.df); pNah(z!.p, l.p, `${was} lr ${l.name}.p`); }
    expect(eins(o.trennung), `${was}: trennung`).toBe(soll.trennung); expect(leerVektor(o.warnungen), `${was}: keine Warnungen`).toBe(leerVektor(soll.warnungen));
    expect(o.konkordanz, 'keine Konkordanz bei Zählprozess-Daten').toBeUndefined();
    if (soll.ph) {
      expect(o.ph, `${was}: ph`).toBeDefined(); nah(o.ph.gesamt.chi2, soll.ph.gesamt.chi2, 1e-5, `${was} ph gesamt chi2`); expect(eins(o.ph.gesamt.df)).toBe(soll.ph.gesamt.df); pNah(o.ph.gesamt.p, soll.ph.gesamt.p, `${was} ph gesamt p`);
      for (const q of soll.ph.praed as Z[]) { const z = zeilen(o.ph.praed).find(x => eins(x.name) === q.name); expect(z, `${was}: ph ${q.name}`).toBeDefined(); nah(z!.chi2, q.chi2, 1e-5, `${was} ph ${q.name} chi2`); pNah(z!.p, q.p, `${was} ph ${q.name} p`); }
    } else expect(typeof eins(o.ph_fehler), `${was}: ph_fehler statt ph`).toBe('string');
  };

  for (const name of Object.keys(FAELLE)) {
    it(`${name}: Koeffizienten, HR mit Intervall, Modelltest, LR je Prädiktor, Proportionalität (cox.zph) gleich R am Mac`, async () => { const o = await lauf(FAELLE[name]!); pruefe(o, FAELLE[name]!.soll, name); });
  }

  it('Stanford-Herzdaten, Vignette-Regel: 170 Zeilen, 103 Personen, 75 Ereignisse; Transplantation HR 0,987 [0,534; 1,824]; die strenge Regel gibt 169 Zeilen und HR 0,897 [0,487; 1,651] (ein Patient verschiebt es)', async () => {
    const a = await lauf(FAELLE.jasa_zaehlt!), b = await lauf(FAELLE.jasa_streng!);
    expect([eins(a.n), eins(a.personen), eins(a.ereignisse)]).toEqual([170, 103, 75]); expect([eins(b.n), eins(b.personen), eins(b.ereignisse)]).toEqual([169, 103, 75]);
    const ka = zeilen(a.koef).find(x => eins(x.name) === 'wert')!, kb = zeilen(b.koef).find(x => eins(x.name) === 'wert')!;
    nah(ka.hr, 0.9872, 1e-3, 'HR Vignette-Regel'); nah(ka.ki_u, 0.5342, 1e-3, 'unten'); nah(ka.ki_o, 1.8243, 1e-3, 'oben'); nah(kb.hr, 0.8967, 1e-3, 'HR streng'); nah(kb.ki_u, 0.4871, 1e-3, 'unten streng'); nah(kb.ki_o, 1.6510, 1e-3, 'oben streng');
  });
  it('GEDRUCKT (survival-Vignette timedep S. 11, Kalbfleisch & Prentice Tabelle 6.1 Modell 6, Breslow, mit Wechselwirkung Alter × Transplantation als eigene Spalte): Koeffizienten und Standardfehler auf die gedruckten 4 bis 5 Stellen, LR 16,06 auf 5 df, p = ,006687', async () => {
    const g = ZP.gedruckt as Z, o = await lauf(FAELLE.jasa_modell6!); expect(o.fehler).toBeUndefined();
    (g.namen as string[]).forEach((n, i) => { const name = ['age', 'wert', 'surgery', 'year', 'age_wert'][i]!; const z = zeilen(o.koef).find(x => eins(x.name) === name)!; expect(Math.abs(eins(z.b) - g.koeffizienten[i]), `${n} b`).toBeLessThan(5.5e-5); expect(Math.abs(eins(z.se) - g.standardfehler[i]), `${n} SE`).toBeLessThan(5.5e-5); });
    expect(Math.abs(eins(o.modelltest.chi2) - g.lr)).toBeLessThan(5.5e-3); expect(eins(o.modelltest.df)).toBe(g.df); expect(Math.abs(eins(o.modelltest.p) / g.p - 1)).toBeLessThan(5e-3); expect([eins(o.n), eins(o.ereignisse)]).toEqual([g.zeilen, g.ereignisse]);
  });
  it('das Paket-Beispiel survival::heart (172 Zeilen, Konvention +1 von Kalbfleisch & Prentice): Efron und Breslow gleich R; Transplantation HR 0,99', async () => {
    const e = await lauf(FAELLE.heart_efron!), b = await lauf(FAELLE.heart_breslow!); expect([eins(e.n), eins(e.ereignisse)]).toEqual([172, 75]); nah(zeilen(e.koef).find(x => eins(x.name) === 'wert')!.hr, 0.9898, 2e-3, 'HR heart Efron'); expect(eins(b.ties)).toBe('breslow');
  });
  it('Gruppen-Prädiktor (Operation: nein/ja, Vergleichsgruppe nein): Koeffizientenname „surgeryja“, die Zahlen gleich der Rechnung mit der 0/1-Spalte', async () => {
    const g = await lauf(FAELLE.jasa_zaehlt_gruppe!), z = await lauf(FAELLE.jasa_zaehlt!); expect(g.fehler).toBeUndefined(); expect(zeilen(g.koef).map(x => eins(x.name))).toEqual(['wert', 'age', 'surgeryja', 'year']);
    zeilen(g.koef).forEach((k, i) => nah(k.b, eins(zeilen(z.koef)[i]!.b), 1e-9, `Koeffizient ${i}`)); expect(eins(zeilen(g.lr_praed).find(x => eins(x.name) === 'surgery')!.df)).toBe(1);
  });
  it('fehlende Werte listenweise: eine Lücke im Alter → 169 Zeilen im Modell, ausgelassen = 1', async () => {
    const o = await lauf(FAELLE.jasa_zaehlt!, (name, w) => { if (name === 'age') w[4] = null; return w; }); expect(o.fehler).toBeUndefined(); expect([eins(o.n), eins(o.ausgelassen)]).toEqual([169, 1]);
  });
  it('Bindungen: Efron und Breslow unterscheiden sich auf den Herzdaten (gleiche Ereigniszeiten durch die halbe Tageseinheit) nur wenig, aber messbar - beide gleich R; Voreinstellung ist Efron', async () => {
    const e = await lauf(FAELLE.jasa_zaehlt!), b = await lauf(FAELLE.jasa_zaehlt_breslow!); expect([eins(e.ties), eins(b.ties)]).toEqual(['efron', 'breslow']);
    const de = Math.abs(eins(zeilen(e.koef)[0]!.b) - eins(zeilen(b.koef)[0]!.b)); expect(de).toBeGreaterThan(1e-4); expect(de).toBeLessThan(0.05);
    const standard = await rechne(aufruf(`d, 'start', 'stopp', 'ereignis', 'id', ${rVec(FAELLE.jasa_zaehlt!.frage.praed)}`)); expect(eins(standard.ties), 'ohne Angabe: Efron').toBe('efron'); nah(zeilen(standard.koef)[0]!.b, eins(zeilen(e.koef)[0]!.b), 1e-12, 'Voreinstellung = Efron');
  });
  it('Fehler als Text, nie ein Absturz: Stopp gleich Start; kein Ereignis; Ereignis nicht 0/1', async () => {
    const f = ZP.fehlerfaelle as Z;
    const a = await lauf(FAELLE.jasa_zaehlt!, (name, w) => (name === 'stopp' ? w.map((v, i) => (i === 2 ? DATEN.jasa_v!.start![2]! : v)) : w)); expect(String(eins(a.fehler))).toMatch(new RegExp(f.stopp_gleich_start.erwartet)); expect(a.koef).toBeUndefined();
    const b = await lauf(FAELLE.jasa_zaehlt!, (name, w) => (name === 'ereignis' ? w.map(() => 0) : w)); expect(String(eins(b.fehler))).toMatch(new RegExp(f.kein_ereignis.erwartet)); expect(b.koef).toBeUndefined();
    const c = await lauf(FAELLE.jasa_zaehlt!, (name, w) => (name === 'ereignis' ? w.map((v, i) => (i === 0 ? 2 : v)) : w)); expect(String(eins(c.fehler))).toMatch(/event must be coded 0 or 1/); expect(typeof eins(c.fehler), 'nicht der Fehler „Funktion fehlt“').toBe('string'); expect(String(eins(c.fehler))).not.toMatch(/sp_cox_zp|could not find/i);
  });

  /* ---------------------------------------------------------------- Sicherheit (CLAUDE.md): Namen gehen nie als Text in R-Code */
  const GEFAHR = [`x'); assign('.pwned', TRUE, globalenv()); ('`, 'a`; assign(".pwned", TRUE, globalenv()); `b', `a" ; assign('.pwned', TRUE, globalenv()) ; "b`, `x\n assign('.pwned', TRUE, globalenv())`];
  const pwned = async () => (await rechne(`exists('.pwned', envir = globalenv())`)) as unknown as boolean[] | boolean;
  it('R-Seite: sp_id lehnt gefährliche Namen für Start, Stopp, Ereignis, Kennung und Prädiktoren ab (zweite Sperre), nichts läuft', async () => {
    const d = `data.frame(id = c(1, 1, 1, 2, 2, 2), start = c(0, 1, 2, 0, 1, 2), stopp = c(1, 2, 3, 1, 2, 3), ereignis = c(0, 0, 1, 0, 0, 1), p01 = c(0, 1, 1, 0, 0, 1))`;
    for (const g of GEFAHR) {
      await r.objs.globalEnv.bind('.sp_arg', await new r.RList({ g: await new r.RCharacter([g]) }));
      for (const code of [`${d}, .sp_arg$g, 'stopp', 'ereignis', 'id', 'p01'`, `${d}, 'start', .sp_arg$g, 'ereignis', 'id', 'p01'`, `${d}, 'start', 'stopp', .sp_arg$g, 'id', 'p01'`, `${d}, 'start', 'stopp', 'ereignis', .sp_arg$g, 'p01'`, `${d}, 'start', 'stopp', 'ereignis', 'id', .sp_arg$g`]) {
        const o = await rechne(aufruf(code)); expect(String(eins(o.fehler)), code).toMatch(/unsafe name/); expect(eins(await pwned())).toBe(false);
      }
    }
  });
  it('die echten App-Funktionen (Umformer, coxZpDaten, coxZpAufruf) mit Spalten- und Größennamen voller Anführungszeichen: dieselben Zahlen wie mit harmlosen Namen, die Falle löst nie aus', async () => {
    const J0 = (J.coxzeit.umformer as Z).jasa.eingabe as Z;
    const eingabe = (namen: [string, string, string]) => ({ kennung: J0.kennung, ende: J0.ende, ereignis: J0.ereignis, wechsel: J0.wechsel, fest: { [namen[0]]: J0.age, [namen[1]]: J0.surgery, [namen[2]]: J0.year } });
    const lauf1 = async (wert: string, fest: [string, string, string]) => {
      const u = umformenWechsel(eingabe(fest), { regel: 'zaehlt' }); expect(u.ok).toBe(true); if (!u.ok) throw new Error('Umformer'); const dt = coxZpDaten(u.zeilen, { wertName: wert, festNamen: fest });
      await daten('d', dt.spalten); return { o: await rechne(coxZpAufruf(dt)), code: coxZpAufruf(dt) };
    };
    const harmlos = await lauf1('Transplantation', ['Alter', 'Operation', 'Jahr']), gefahr = await lauf1(GEFAHR[0]!, [GEFAHR[1]!, GEFAHR[2]!, GEFAHR[3]!]);
    expect(harmlos.o.fehler, `harmlos: ${harmlos.o.fehler}`).toBeUndefined(); expect(gefahr.o.fehler, `gefährlich: ${gefahr.o.fehler}`).toBeUndefined();
    // die App-Funktionen benennen die Spalten mit festen R-Namen (p01 = zeitabhängige Größe, p02 … = feste Größen): die Namen im Sollwert werden entsprechend umbenannt
    const rn: Record<string, string> = { wert: 'p01', age: 'p02', surgery: 'p03', year: 'p04' }; const umbenannt = JSON.parse(JSON.stringify(FAELLE.jasa_zaehlt!.soll), (k, v) => (k === 'name' && typeof v === 'string' ? rn[v] ?? v : v));
    pruefe(harmlos.o, umbenannt, 'App-Aufruf harmlos'); pruefe(gefahr.o, umbenannt, 'App-Aufruf gefährliche Namen');
    for (const g of GEFAHR) expect(gefahr.code).not.toContain(g); expect(eins(await pwned())).toBe(false);
  });
  it('das Ergebnis trägt die R-Namen (p01 …), nie die Anzeigenamen aus den Daten: Namen kommen nur aus festen Wörtern', async () => {
    const o = await lauf(FAELLE.jasa_zaehlt!); expect(JSON.stringify(o)).not.toMatch(/pwned|assign\(/);
  });
});
