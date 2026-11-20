/**
 * B1 Gegenprobe: Das R-Skript, das Statable zu einem Ergebnis erzeugt, wird in ECHTEM R 4.6.1 ausgeführt (Rscript, nur wenn es da ist, sonst übersprungen),
 * und seine Zahlen werden mit dem Ergebnis verglichen, das PSPP (die Statable-Engine) für dieselben Daten liefert. Zwei unabhängige Programme.
 * Toleranz: relativ 1e-6 (p-Werte absolut 1e-6, weil „max(1, |soll|)“), sonst mit Grund im Kommentar.
 * Die Sollwerte stammen aus PSPP und R - nichts ist hier von Hand eingetragen.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { alsZahl, leseCsv, planeSpalten, zurEngine, type Tabelle } from './einlesen';
import { faktoren, faktorTabellenBereinigen, anova, iccErgebnis, kappa, kreuz, logistik, praePost, skala, splitHalf, splitHalfSyntax, verteilung, vorhersage, zusammenhang, zusammenhangPartial, zweiGruppen } from './ergebnis';
import { messwiederholung } from './messwiederholung';
import { friedman } from './friedman';
import { regFaktor, regTerme, regressionBefehl, type RegFaktor } from './regfaktor';
import { logistikBefehl, logistikKodierung, VERFAHREN } from './verfahren';
import { finde } from './tabelle';
import { baueRSkript, rSkriptMoeglich, type RKontext, type RSpalte } from './rskript';
import { spearman } from './rangkorrelation';
import { mannWhitney, kruskalWallis, wilcoxon } from './rangtests';
import { nodeEngine } from './testengine';

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);

type Motor = Awaited<ReturnType<typeof nodeEngine>>;
interface Satz { e: Motor; tab: Tabelle; spalten: RSpalte[]; zeilen: (string | number | null)[][]; ctx: (blatt: string[]) => RKontext }

/** Eine Datei laden: in die Engine (wie die App) und als Kontext für das Skript. `labels`: Wertebeschriftungen je Spalte (auch in der Engine gesetzt). */
async function lade(datei: string, labels: Record<string, Record<string, string>> = {}): Promise<Satz> {
  const e = await nodeEngine();
  const tab = leseCsv(readFileSync(new URL(`./testdaten/${datei}`, import.meta.url), 'utf8'));
  const b = zurEngine(tab);
  e.run(b.syntax, { '/import.csv': b.csv });
  for (const [n, l] of Object.entries(labels)) e.run(`VALUE LABELS ${n} ${Object.entries(l).map(([k, v]) => `${k} '${v}'`).join(' ')}.`);
  const plan = planeSpalten(tab);
  const spalten: RSpalte[] = plan.map(p => ({ name: p.name, bezeichnung: '', art: p.art === 'zahl' ? 'zahl' : 'text', werteLabels: labels[p.name] ?? {}, fehlend: [] }));
  const zeilen = tab.zeilen.map(z => plan.map((p, i) => { const v = z[i] ?? null; if (v === null || v === '') return null; return p.art === 'zahl' ? alsZahl(v, p.punkt) : String(v); }));
  return { e, tab, spalten, zeilen, ctx: blatt => ({ spalten, zeilen, blattSpalten: blatt, titel: 'Gegenprobe', datum: '14.11.2026' }) };
}

const tmp = mitR ? mkdtempSync(join(tmpdir(), 'rskript-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });
/** Größte Abweichung je Art (relativ zu max(1, |soll|)); wird am Ende ausgegeben. */
const abweichung: Record<string, number> = {};
let art = '';

/** Skript und CSV in einen eigenen Ordner, Ausgabezeilen anhängen, mit Rscript starten. Gibt die Zahlen zurück, die mit `.a('name', wert)` ausgegeben wurden. */
function inR(erg: { typ: string; e: unknown }, ctx: RKontext, ausgabe: string): Record<string, number[]> {
  expect(rSkriptMoeglich(erg, ctx), 'R-Skript möglich').toBe(true);
  const sk = baueRSkript(erg, ctx), ordner = mkdtempSync(join(tmp, 'f-'));
  const kopf = `.a <- function(n, x) cat("@@", n, "=", paste(sprintf("%.12g", as.numeric(x)), collapse = ","), "\\n", sep = "")\n`;
  writeFileSync(join(ordner, sk.csvName), sk.csv, 'utf8');
  writeFileSync(join(ordner, sk.rName), sk.r + '\n' + kopf + ausgabe + '\n', 'utf8');
  const l = spawnSync(RSCRIPT, [sk.rName], { cwd: ordner, encoding: 'utf8' });
  expect(l.status, `Rscript: ${l.stderr}\n${sk.r}`).toBe(0);
  const aus: Record<string, number[]> = {};
  for (const z of l.stdout.split(/\r?\n/)) { const m = /^@@(\w+)=(.*)$/.exec(z); if (m) aus[m[1]!] = m[2]!.split(',').map(Number); }
  return aus;
}
/** Vergleich mit Toleranz (relativ, mindestens absolut) und Merken der größten Abweichung. */
function nah(ist: number | undefined, soll: number, was: string, tol = 1e-6) {
  expect(ist, `${was}: kein Wert aus R`).toBeDefined();
  const d = Math.abs(ist! - soll) / Math.max(1, Math.abs(soll));
  abweichung[art] = Math.max(abweichung[art] ?? 0, d);
  expect(d, `${was}: R ${ist} gegen PSPP ${soll}`).toBeLessThan(tol);
}

describe.skipIf(!mitR)('R-Skript gegen PSPP (Rscript 4.6.1)', () => {
  let rf: Satz, sl: Satz, fh: Satz;
  beforeAll(async () => {
    rf = await lade('regression-faktor.csv', { studiengang: { 1: 'Lehramt', 2: 'Sozialpaed', 3: 'Psychologie' } });
    sl = await lade('schlaf-und-konzentration.csv');
    fh = await lade('split-half-fuenf.csv');
  }, 120000);
  afterAll(() => { console.log('Größte Abweichung R gegen PSPP je Art:', JSON.stringify(abweichung)); });

  it('zwei-gruppen (Text-Gruppen): Student, Welch, Cohens d', () => {
    art = 'zwei-gruppen';
    const e = zweiGruppen(rf.e.run("T-TEST GROUPS=zwei('nein' 'ja') /VARIABLES=punkte."), 'punkte', 'zwei');
    const r = inR({ typ: 'zwei-gruppen', e }, rf.ctx(['punkte', 'zwei']),
      ".a('tK', ergebnis$statistic); .a('dfK', ergebnis$parameter); .a('pK', ergebnis$p.value); .a('tW', ergebnis_welch$statistic); .a('dfW', ergebnis_welch$parameter); .a('pW', ergebnis_welch$p.value); .a('d', d_cohen); .a('diff', unname(ergebnis$estimate[1] - ergebnis$estimate[2]))");
    nah(r.tK![0], e.tKlassisch, 't klassisch'); nah(r.dfK![0], e.dfKlassisch, 'df klassisch'); nah(r.pK![0], e.pKlassisch, 'p klassisch');
    nah(r.tW![0], e.t, 't Welch'); nah(r.dfW![0], e.df, 'df Welch'); nah(r.pW![0], e.p, 'p Welch');
    nah(r.d![0], e.d, 'Cohens d'); nah(r.diff![0], e.diff, 'Mittelwertdifferenz');
  });

  it('zwei-gruppen (Zahlen-Gruppen mit Wertebeschriftung): Student und Welch', () => {
    art = 'zwei-gruppen';
    const e = zweiGruppen(rf.e.run("T-TEST GROUPS=studiengang(1 3) /VARIABLES=punkte."), 'punkte', 'studiengang');
    const r = inR({ typ: 'zwei-gruppen', e }, rf.ctx(['punkte', 'studiengang']), ".a('tK', ergebnis$statistic); .a('pW', ergebnis_welch$p.value); .a('tW', ergebnis_welch$statistic)");
    nah(r.tK![0], e.tKlassisch, 't klassisch'); nah(r.tW![0], e.t, 't Welch'); nah(r.pW![0], e.p, 'p Welch');
  });

  it('anova: F, p, Quadratsummen, η², Levene', () => {
    art = 'anova';
    const e = anova(rf.e.run('ONEWAY punkte BY studiengang\n  /STATISTICS=DESCRIPTIVES HOMOGENEITY.'), 'punkte', 'studiengang');
    expect(e.gruppen.map(g => g.name)).toEqual(['Lehramt', 'Sozialpaed', 'Psychologie']);
    const r = inR({ typ: 'anova', e }, rf.ctx(['punkte', 'studiengang']),
      ".a('f', tabelle_aov[['F value']][1]); .a('p', tabelle_aov[['Pr(>F)']][1]); .a('ss', tabelle_aov[['Sum Sq']]); .a('df', tabelle_aov[['Df']]); .a('eta2', eta2); .a('lf', levene[['F value']][1]); .a('lp', levene[['Pr(>F)']][1]); .a('wf', ergebnis_welch$statistic)");
    nah(r.f![0], e.f, 'F'); nah(r.p![0], e.p, 'p'); nah(r.ss![0], e.ssZwischen, 'SS zwischen'); nah(r.ss![1], e.ssInnerhalb, 'SS innerhalb');
    nah(r.df![0], e.dfZwischen, 'df zwischen'); nah(r.df![1], e.dfInnerhalb, 'df innerhalb');
    nah(r.eta2![0], e.ssZwischen / (e.ssZwischen + e.ssInnerhalb), 'η²');
    nah(r.lf![0], e.levene!, 'Levene F'); nah(r.lp![0], e.leveneP!, 'Levene p');
  });

  it('prae-post: t, df, p (Vorzeichen: R rechnet vorher - nachher), dz', () => {
    art = 'prae-post';
    const e = praePost(rf.e.run('T-TEST PAIRS=lernzeit WITH punkte (PAIRED).'), 'lernzeit', 'punkte');
    const r = inR({ typ: 'prae-post', e }, rf.ctx(['lernzeit', 'punkte']), ".a('t', ergebnis$statistic); .a('df', ergebnis$parameter); .a('p', ergebnis$p.value); .a('dz', dz); .a('diff', mean(differenz))");
    nah(r.t![0], -e.t, 't (umgekehrtes Vorzeichen)'); nah(r.df![0], e.df, 'df'); nah(r.p![0], e.p, 'p'); nah(r.dz![0], e.dz, 'dz'); nah(r.diff![0], e.diff, 'Unterschied nachher - vorher');
  });

  it('zusammenhang Pearson: r, p, 95-%-Bereich', () => {
    art = 'zusammenhang';
    const e = zusammenhang(rf.e.run('CORRELATIONS /VARIABLES=lernzeit punkte.'), 'lernzeit', 'punkte');
    const r = inR({ typ: 'zusammenhang', e }, rf.ctx(['lernzeit', 'punkte']), ".a('r', ergebnis$estimate); .a('p', ergebnis$p.value); .a('ki', ergebnis$conf.int); .a('n', ergebnis$parameter + 2)");
    nah(r.r![0], e.r, 'r'); nah(r.p![0], e.p, 'p'); // Statable bildet das Fisher-z-Intervall mit 1,96 (ergebnis.ts), R (cor.test) mit qnorm(0,975) = 1,959964: Unterschied in der 6. Stelle, darum Toleranz 1e-5.
    nah(r.ki![0], e.kiLo, 'KI unten', 1e-5); nah(r.ki![1], e.kiHi, 'KI oben', 1e-5); nah(r.n![0], e.n, 'n');
  });

  it('zusammenhang Spearman: rs, p (so wie Statable: exakt oder Näherung)', () => {
    art = 'zusammenhang';
    const i = rf.tab.kopf.indexOf('lernzeit'), j = rf.tab.kopf.indexOf('punkte');
    const paare = rf.zeilen.map(z => [z[i], z[j]] as [number | null, number | null]).filter((p): p is [number, number] => p[0] !== null && p[1] !== null);
    const e = zusammenhang(rf.e.run('CORRELATIONS /VARIABLES=lernzeit punkte.'), 'lernzeit', 'punkte', paare, 'spearman');
    expect(e.methode).toBe('spearman');
    const r = inR({ typ: 'zusammenhang', e }, rf.ctx(['lernzeit', 'punkte']), ".a('r', ergebnis$estimate); .a('p', ergebnis$p.value)");
    nah(r.r![0], spearman(paare).r, 'rs'); nah(r.r![0], e.r, 'rs (Blatt)');
    nah(r.p![0], e.p, 'p');
  });

  it('zusammenhang Kendall: tau-b, p', () => {
    art = 'zusammenhang';
    const i = rf.tab.kopf.indexOf('lernzeit'), j = rf.tab.kopf.indexOf('punkte');
    const paare = rf.zeilen.map(z => [z[i], z[j]] as [number | null, number | null]).filter((p): p is [number, number] => p[0] !== null && p[1] !== null);
    const e = zusammenhang(rf.e.run('CORRELATIONS /VARIABLES=lernzeit punkte.'), 'lernzeit', 'punkte', paare, 'kendall');
    const r = inR({ typ: 'zusammenhang', e }, rf.ctx(['lernzeit', 'punkte']), ".a('r', ergebnis$estimate); .a('p', ergebnis$p.value)");
    nah(r.r![0], e.r, 'tau-b'); nah(r.p![0], e.p, 'p');
  });

  it('zusammenhang partiell (Pearson und Spearman): r, df, p', () => {
    art = 'zusammenhang';
    const idx = ['alter', 'konzentration', 'kaffee_tassen'].map(n => sl.tab.kopf.indexOf(n));
    const z3 = sl.zeilen.map(z => idx.map(k => z[k] as number | null));
    for (const methode of ['pearson', 'spearman'] as const) {
      const e = zusammenhangPartial('alter', 'konzentration', ['kaffee_tassen'], z3, methode)!;
      const r = inR({ typ: 'zusammenhang', e }, sl.ctx(['alter', 'konzentration', 'kaffee_tassen']), ".a('r', r_partiell); .a('df', df_partiell); .a('p', p_partiell); .a('re', r_einfach)");
      nah(r.r![0], e.r, `r partiell ${methode}`); nah(r.df![0], e.df!, 'df'); nah(r.p![0], e.p, `p ${methode}`);
    }
  });

  it('kreuz: Chi-Quadrat, p, Cramérs V, Fisher bei 2 x 2', () => {
    art = 'kreuz';
    const e = kreuz(rf.e.run('CROSSTABS /TABLES=sg_text BY zwei\n  /STATISTICS=CHISQ\n  /CELLS=COUNT ROW EXPECTED.'));
    const r = inR({ typ: 'kreuz', e }, rf.ctx(['zwei', 'sg_text']), ".a('chi', ergebnis$statistic); .a('df', ergebnis$parameter); .a('p', ergebnis$p.value); .a('v', v_cramer); .a('tab', as.vector(t(tab)))");
    nah(r.chi![0], e.chi2, 'Chi-Quadrat'); nah(r.df![0], e.df, 'df'); nah(r.p![0], e.p, 'p'); nah(r.v![0], e.v, 'Cramérs V');
    expect(r.tab).toEqual(e.zaehlung!.tab.flat());
    const e2 = kreuz(sl.e.run('CROSSTABS /TABLES=handy_im_bett BY geschlecht\n  /STATISTICS=CHISQ\n  /CELLS=COUNT ROW EXPECTED.'));
    const r2 = inR({ typ: 'kreuz', e: e2 }, sl.ctx(['geschlecht', 'handy_im_bett']), ".a('chi', ergebnis$statistic); .a('p', ergebnis$p.value); .a('v', v_cramer)");
    nah(r2.chi![0], e2.chi2, 'Chi-Quadrat (Text)'); nah(r2.p![0], e2.p, 'p (Text)'); nah(r2.v![0], e2.v, 'V (Text)');
  });

  it('kreuz 2 x 2 mit Fisher', () => {
    art = 'kreuz';
    const e = kreuz(rf.e.run('CROSSTABS /TABLES=zwei BY hoch\n  /STATISTICS=CHISQ\n  /CELLS=COUNT ROW EXPECTED.'));
    expect(e.fisherP).toBeDefined();
    const r = inR({ typ: 'kreuz', e }, rf.ctx(['hoch', 'zwei']), ".a('chi', ergebnis$statistic); .a('p', ergebnis$p.value); .a('fp', fisher$p.value)");
    nah(r.chi![0], e.chi2, 'Chi-Quadrat'); nah(r.p![0], e.p, 'p'); nah(r.fp![0], e.fisherP!, 'Fisher p');
  });

  /** Regression: Gruppen-Spalte (Zahl mit Beschriftung oder Text) und Zahl. */
  const faktorVon = (s: Satz, n: string, niveau: 'nominal' | 'metrisch' = 'nominal'): RegFaktor | null => {
    const sp = s.spalten.find(x => x.name === n)!, i = s.tab.kopf.indexOf(n);
    const werte = s.zeilen.map(z => z[i]).filter((v): v is string | number => v !== null);
    return regFaktor({ ...sp, bezeichnung: '', niveau, format: '', fehlendText: '' }, werte, s.tab.kopf);
  };
  it('vorhersage mit Gruppen-Spalte (Zahl mit Beschriftung): B, KI, R², F, Beta', () => {
    art = 'vorhersage';
    const t = regTerme(['studiengang', 'lernzeit'], n => faktorVon(rf, n));
    const e = vorhersage(rf.e.run(regressionBefehl('punkte', t)), 'punkte', t);
    const r = inR({ typ: 'vorhersage', e }, rf.ctx(['punkte', 'studiengang', 'lernzeit']),
      ".a('b', coef(modell)[-1]); .a('p', ergebnis$coefficients[-1, 4]); .a('lo', konfidenz[-1, 1]); .a('hi', konfidenz[-1, 2]); .a('r2', ergebnis$r.squared); .a('f', ergebnis$fstatistic[1]); .a('beta', beta)");
    e.praediktoren.forEach((x, i) => { nah(r.b![i], x.b, `B ${x.name}`); nah(r.p![i], x.p, `p ${x.name}`, 1e-5); nah(r.lo![i], x.lo, `KI unten ${x.name}`); nah(r.hi![i], x.hi, `KI oben ${x.name}`); nah(r.beta![i], x.beta, `Beta ${x.name}`); });
    nah(r.r2![0], e.r2, 'R²'); nah(r.f![0], e.f, 'F');
  });
  it('vorhersage mit Text-Gruppen-Spalte und Zahl: B, R²', () => {
    art = 'vorhersage';
    const t = regTerme(['lernzeit', 'sg_text'], n => faktorVon(rf, n));
    const e = vorhersage(rf.e.run(regressionBefehl('punkte', t)), 'punkte', t);
    const r = inR({ typ: 'vorhersage', e }, rf.ctx(['punkte', 'lernzeit', 'sg_text']), ".a('b', coef(modell)[-1]); .a('r2', ergebnis$r.squared); .a('beta', beta)");
    e.praediktoren.forEach((x, i) => { nah(r.b![i], x.b, `B ${x.name}`); nah(r.beta![i], x.beta, `Beta ${x.name}`); });
    nah(r.r2![0], e.r2, 'R²');
  });
  it('vorhersage mit zwei Zahlen: B, KI, R²', () => {
    art = 'vorhersage';
    const e = vorhersage(sl.e.run('REGRESSION /VARIABLES=schlaf_stunden kaffee_tassen /DEPENDENT=konzentration /METHOD=ENTER /STATISTICS=COEFF R ANOVA CI(95).'), 'konzentration');
    const r = inR({ typ: 'vorhersage', e }, sl.ctx(['konzentration', 'schlaf_stunden', 'kaffee_tassen']), ".a('b', coef(modell)[-1]); .a('lo', konfidenz[-1, 1]); .a('r2', ergebnis$r.squared); .a('f', ergebnis$fstatistic[1]); .a('beta', beta)");
    e.praediktoren.forEach((x, i) => { nah(r.b![i], x.b, `B ${x.name}`); nah(r.lo![i], x.lo, `KI ${x.name}`); nah(r.beta![i], x.beta, `Beta ${x.name}`); });
    nah(r.r2![0], e.r2, 'R²'); nah(r.f![0], e.f, 'F');
  });

  /* Logistische Regression: PSPP bricht ab, wenn sich die Schätzung um weniger als 0,001 ändert (Hinweis in der Ausgabe); R rechnet bis 1e-8.
   * Darum liegen B, OR und p auf etwa 5 Stellen (Test logistik.test.ts: gegen R auf 5 Stellen) - hier Toleranz 1e-4 statt 1e-6. */
  it('logistik mit Gruppen-Spalte: B, OR, p, Nagelkerke, -2LL, Modelltest', () => {
    art = 'logistik';
    const sp = { ...rf.spalten.find(x => x.name === 'hoch')!, bezeichnung: '', niveau: 'nominal' as const, format: '', fehlendText: '' };
    const i = rf.tab.kopf.indexOf('hoch'), werte = rf.zeilen.map(z => z[i]).filter((v): v is number => v !== null);
    const k = logistikKodierung(sp, werte, false, rf.tab.kopf)!, t = regTerme(['studiengang', 'lernzeit'], n => faktorVon(rf, n));
    const e = logistik(rf.e.run(logistikBefehl(['studiengang', 'lernzeit'], k, t)), 'hoch', k, t);
    const r = inR({ typ: 'logistik', e }, rf.ctx(['hoch', 'studiengang', 'lernzeit']),
      ".a('b', coef(modell)[-1]); .a('or', odds_ratio[-1]); .a('p', ergebnis$coefficients[-1, 4]); .a('lo', odds_ratio_ki[-1, 1]); .a('hi', odds_ratio_ki[-1, 2]); .a('n2', minus2ll); .a('chi', chi2_modell); .a('df', df_modell); .a('pm', p_modell); .a('nk', nagelkerke); .a('cs', cox_snell); .a('tr', treffer)");
    const T = 1e-4;
    e.praediktoren.forEach((x, j) => { nah(r.b![j], x.b, `B ${x.name}`, T); nah(r.or![j], x.or, `OR ${x.name}`, T); nah(r.p![j], x.p, `p ${x.name}`, T); nah(r.lo![j], x.orLo, `OR unten ${x.name}`, T); nah(r.hi![j], x.orHi, `OR oben ${x.name}`, T); });
    nah(r.n2![0], e.minus2ll, '-2LL', T); nah(r.chi![0], e.chi2, 'Modelltest chi2', T); nah(r.df![0], e.df, 'df'); nah(r.pm![0], e.p, 'p Modell', T);
    nah(r.nk![0], e.nagelkerke, 'Nagelkerke', T); nah(r.cs![0], e.coxSnell, 'Cox-Snell', T); nah(r.tr![0], e.treffer, 'Trefferquote');
  });
  it('logistik mit Text-Ziel und Zahlen: B, OR, Nagelkerke', () => {
    art = 'logistik';
    const sp = { ...sl.spalten.find(x => x.name === 'handy_im_bett')!, bezeichnung: '', niveau: 'nominal' as const, format: '', fehlendText: '' };
    const i = sl.tab.kopf.indexOf('handy_im_bett'), werte = sl.zeilen.map(z => z[i]).filter((v): v is string => v !== null);
    const k = logistikKodierung(sp, werte, false, sl.tab.kopf)!;
    const e = logistik(sl.e.run(logistikBefehl(['alter', 'konzentration', 'kaffee_tassen'], k)), 'handy_im_bett', k);
    const r = inR({ typ: 'logistik', e }, sl.ctx(['handy_im_bett', 'alter', 'konzentration', 'kaffee_tassen']), ".a('b', coef(modell)[-1]); .a('or', odds_ratio[-1]); .a('nk', nagelkerke); .a('n2', minus2ll); .a('tr', treffer)");
    const T = 1e-4;
    e.praediktoren.forEach((x, j) => { nah(r.b![j], x.b, `B ${x.name}`, T); nah(r.or![j], x.or, `OR ${x.name}`, T); });
    nah(r.nk![0], e.nagelkerke, 'Nagelkerke', T); nah(r.n2![0], e.minus2ll, '-2LL', T); nah(r.tr![0], e.treffer, 'Trefferquote');
  });

  it('skala: Cronbachs Alpha, Trennschärfe, Alpha ohne Item', () => {
    art = 'skala';
    const e = skala(sl.e.run("RELIABILITY /VARIABLES=alter semester kaffee_tassen konzentration /SCALE('Skala') ALL /MODEL=ALPHA /SUMMARY=TOTAL."));
    const r = inR({ typ: 'skala', e }, sl.ctx(['alter', 'semester', 'kaffee_tassen', 'konzentration']), ".a('alpha', alpha); .a('n', nrow(items)); .a('ts', trennschaerfe); .a('ao', alpha_ohne)");
    nah(r.alpha![0], e.alpha, 'Alpha'); nah(r.n![0], e.n, 'n');
    e.fragen.forEach((f, i) => { nah(r.ts![i], f.trennschaerfe, `Trennschärfe ${f.name}`); nah(r.ao![i], f.alphaOhne, `Alpha ohne ${f.name}`); });
  });

  it('verteilung: n, Mittelwert, SD, Quartile (type 6), Häufigkeiten', () => {
    art = 'verteilung';
    const e = verteilung(sl.e.run('FREQUENCIES /VARIABLES=alter konzentration\n  /FORMAT=NOTABLE\n  /STATISTICS=MEAN STDDEV MIN MAX MEDIAN SKEWNESS KURTOSIS\n  /PERCENTILES=25 50 75\n  /ALGORITHM=COMPATIBLE.\nFREQUENCIES /VARIABLES=handy_im_bett\n  /STATISTICS=NONE.'));
    expect(e.zahlen.length).toBe(2); expect(e.gruppen.length).toBe(1);
    const r = inR({ typ: 'verteilung', e }, sl.ctx(['alter', 'konzentration', 'handy_im_bett']), ".a('n', kennzahlen[, 'n']); .a('m', kennzahlen[, 'mittelwert']); .a('sd', kennzahlen[, 'sd']); .a('q1', kennzahlen[, 'q1']); .a('md', kennzahlen[, 'median']); .a('q3', kennzahlen[, 'q3']); .a('mn', kennzahlen[, 'min']); .a('mx', kennzahlen[, 'max']); .a('h', as.vector(haeufigkeiten[[1]]))");
    e.zahlen.forEach((z, i) => { nah(r.n![i], z.n, `n ${z.name}`); nah(r.m![i], z.m, `M ${z.name}`); nah(r.sd![i], z.sd, `SD ${z.name}`); nah(r.mn![i], z.min, 'min'); nah(r.mx![i], z.max, 'max');
      nah(r.q1![i], z.q1!, `Q1 ${z.name}`); nah(r.md![i], z.median!, `Median ${z.name}`); nah(r.q3![i], z.q3!, `Q3 ${z.name}`); });
    // PSPP zählt die Antworten alphabetisch: ja, nein
    expect(r.h).toEqual(e.gruppen[0]!.werte.map(w => w.anzahl));
  });

  it('kappa: ungewichtet, linear und quadratisch (drei Kategorien)', async () => {
    art = 'kappa';
    const A = [1, 2, 3, 1, 3, 2, 1, 2, 3, 3, 2, 1, 1, 2, 3, 2, 2, 3, 1, 1], B = [1, 2, 2, 1, 3, 3, 2, 2, 3, 3, 1, 1, 1, 2, 3, 2, 3, 3, 2, 1];
    const e = await nodeEngine();
    e.run('NEW FILE.\nDATA LIST LIST /a b.\nBEGIN DATA\n' + A.map((v, i) => `${v} ${B[i]}`).join('\n') + '\nEND DATA.\n');
    const paare = A.map((v, i) => [v, B[i]!] as [number, number]);
    const k = kappa(e.run('CROSSTABS /TABLES=a BY b /STATISTICS=KAPPA /CELLS=COUNT.'), 'a', 'b', paare, true);
    const spalten: RSpalte[] = [{ name: 'a', bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [] }, { name: 'b', bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [] }];
    const ctx: RKontext = { spalten, zeilen: A.map((v, i) => [v, B[i]!]), blattSpalten: ['a', 'b'], titel: 'Kappa', datum: 'heute' };
    for (const g of ['keins', 'linear', 'quadratisch'] as const) {
      const eg = { ...k, ...k.alle[g], gewicht: g };
      const r = inR({ typ: 'kappa', e: eg }, ctx, ".a('k', kappa); .a('p0', uebereinstimmung)");
      nah(r.k![0], g === 'keins' ? k.kappa : k.alle[g].kappa, `Kappa ${g}`);
    }
  });

  /* Teil 2a: Rangtests. Gegenprobe Statable (eigene Rechnung in rangtests.ts) gegen R; der t-Test davor kommt aus PSPP. */
  const spIx = (s: Satz, n: string) => s.spalten.findIndex(x => x.name === n);
  const zahlen = (s: Satz, ziel: string, gruppe: string, wert: string | number, auswahl?: number[]) =>
    (auswahl ?? s.zeilen.map((_, i) => i)).map(i => s.zeilen[i]!).filter(z => z[spIx(s, gruppe)] === wert && typeof z[spIx(s, ziel)] === 'number').map(z => z[spIx(s, ziel)] as number);
  const pruefeMw = (s: Satz, e: ReturnType<typeof zweiGruppen>, ziel: string, gruppe: string, wa: string | number, wb: string | number, auswahl?: number[]) => {
    const mw = mannWhitney(ziel, gruppe, { name: e.a.name, werte: zahlen(s, ziel, gruppe, wa, auswahl) }, { name: e.b.name, werte: zahlen(s, ziel, gruppe, wb, auswahl) })!;
    const ctx = { ...s.ctx([ziel, gruppe]), ...(auswahl ? { zeilenAuswahl: auswahl } : {}) };
    const r = inR({ typ: 'zwei-gruppen', e, rang: mw } as never, ctx, ".a('u', u_a); .a('z', z_rang); .a('p', p_rang); .a('pn', rang$p.value); .a('r', r_rang); .a('hl', hl)");
    nah(r.u![0], mw.uA, 'U'); nah(r.z![0], mw.z, 'z'); nah(r.p![0], mw.p, `p (${mw.exakt ? 'exakt' : 'Näherung'})`); nah(r.pn![0], mw.pNaeherung, 'p Näherung (wilcox.test)'); nah(r.r![0], mw.r, 'r');
    if (mw.hl) nah(r.hl![0], mw.hl.schaetzer, 'Hodges-Lehmann');
    return mw;
  };

  it('Rangtest Mann-Whitney exakt mit Bindungen (40 Fälle) und mit Näherung (120 Fälle)', () => {
    art = 'mann-whitney';
    const e = zweiGruppen(sl.e.run("T-TEST GROUPS=handy_im_bett('ja' 'nein') /VARIABLES=konzentration."), 'konzentration', 'handy_im_bett');
    const ersteGruppe = e.a.name === 'nein' ? 'nein' : 'ja', zweite = ersteGruppe === 'ja' ? 'nein' : 'ja';
    const exakt = pruefeMw(sl, e, 'konzentration', 'handy_im_bett', ersteGruppe, zweite, [...Array(40).keys()]);
    expect(exakt.exakt && exakt.bindungen, 'exakt mit Bindungen').toBe(true);
    const naeh = pruefeMw(sl, e, 'konzentration', 'handy_im_bett', ersteGruppe, zweite);
    expect(naeh.exakt, 'Näherung').toBe(false);
  });

  it('Rangtest Kruskal-Wallis: H, p, ε², Dunn mit Holm', () => {
    art = 'kruskal-wallis';
    const e = anova(rf.e.run('ONEWAY punkte BY studiengang\n  /STATISTICS=DESCRIPTIVES HOMOGENEITY.'), 'punkte', 'studiengang');
    const kw = kruskalWallis('punkte', 'studiengang', [1, 2, 3].map((w, i) => ({ wert: String(w), name: e.gruppen[i]!.name, werte: zahlen(rf, 'punkte', 'studiengang', w) })))!;
    const r = inR({ typ: 'anova', e, rang: kw } as never, rf.ctx(['punkte', 'studiengang']), ".a('h', rang$statistic); .a('df', rang$parameter); .a('p', rang$p.value); .a('eps2', eps2_rang); .a('dz', dunn$z); .a('dp', dunn$p_holm)");
    nah(r.h![0], kw.h, 'H'); nah(r.df![0], kw.df, 'df'); nah(r.p![0], kw.p, 'p'); nah(r.eps2![0], kw.eps2, 'ε²');
    kw.dunn.forEach((d, k) => { nah(r.dz![k], d.z, `Dunn z ${d.i}-${d.j}`); nah(r.dp![k], d.pHolm, `Dunn p Holm ${d.i}-${d.j}`); });
  });

  it('Rangtest Wilcoxon exakt mit Bindungen (30 Paare) und mit Näherung (120 Paare)', () => {
    art = 'wilcoxon';
    const e = praePost(sl.e.run('T-TEST PAIRS=kaffee_tassen WITH semester (PAIRED).'), 'kaffee_tassen', 'semester');
    for (const auswahl of [[...Array(30).keys()], undefined]) {
      const ix = auswahl ?? sl.zeilen.map((_, i) => i), a = spIx(sl, 'kaffee_tassen'), b = spIx(sl, 'semester');
      const paare = ix.map(i => sl.zeilen[i]!).filter(z => typeof z[a] === 'number' && typeof z[b] === 'number').map(z => [z[a] as number, z[b] as number] as [number, number]);
      const w = wilcoxon('kaffee_tassen', 'semester', paare)!;
      const ctx = { ...sl.ctx(['kaffee_tassen', 'semester']), ...(auswahl ? { zeilenAuswahl: auswahl } : {}) };
      const r = inR({ typ: 'prae-post', e, rang: w } as never, ctx, ".a('v', v_plus); .a('z', z_rang); .a('p', p_rang); .a('pn', rang$p.value); .a('r', r_rang); .a('hl', hl)");
      nah(r.v![0], w.vPlus, 'V+'); nah(r.z![0], w.z, 'z'); nah(r.p![0], w.p, `p (${w.exakt ? 'exakt' : 'Näherung'})`); nah(r.pn![0], w.pNaeherung, 'p Näherung (wilcox.test)'); nah(r.r![0], w.r, 'r');
      if (w.hl) nah(r.hl![0], w.hl.schaetzer, 'Pseudo-Median');
      expect(w.exakt, auswahl ? 'exakt' : 'Näherung').toBe(!!auswahl);
    }
  });

  /* Teil 2b: ICC, Messwiederholung einfaktoriell, Friedman, Testhalbierung. ICC, Messwiederholung und Friedman rechnet Statable selbst (kein PSPP-Befehl); die Testhalbierung kommt aus PSPP. */
  /** Zahlenspalten ohne Engine: Kontext aus einer Matrix (Zeile je Fall, null = fehlt). */
  const matrixKontext = (namen: string[], m: (number | null)[][]): RKontext => ({
    spalten: namen.map(n => ({ name: n, bezeichnung: '', art: 'zahl' as const, werteLabels: {}, fehlend: [] })), zeilen: m, blattSpalten: namen, titel: 'Gegenprobe', datum: '14.11.2026'
  });
  /** Wiederholbare Pseudo-Zufallszahlen (kein Math.random): gleiche Daten bei jedem Lauf. */
  const zufall = (start: number) => { let x = start; return () => { x = (x * 16807) % 2147483647; return x / 2147483647 - 0.5; }; };
  const zuVoll = (m: (number | null)[][]) => m.filter(z => z.every(v => v !== null)) as number[][];

  it('icc: drei Beurteilende (ICC(2,1) bis ICC(3,k), Konfidenzgrenzen, F-Test; eine Zeile mit Lücke)', () => {
    art = 'icc';
    const z = zufall(7), namen = ['b1', 'b2', 'b3'];
    const m: (number | null)[][] = Array.from({ length: 18 }, (_, i) => { const w = 10 + (i % 9) * 2 + z() * 4; return [w + z() * 3, w + 1.5 + z() * 3, w - 1 + z() * 3].map(v => Math.round(v * 10) / 10); });
    m[4]![1] = null;
    const e = iccErgebnis(namen, zuVoll(m), m.length);
    const r = inR({ typ: 'icc', e }, matrixKontext(namen, m), ".a('icc', icc$icc); .a('lo', icc$ki_lo); .a('hi', icc$ki_hi); .a('msz', ms_faelle); .a('msb', ms_spalten); .a('mse', ms_rest); .a('f', f_icc); .a('p', p_icc)");
    const soll = [e.icc.absolut.einzel, e.icc.absolut.mittel, e.icc.konsistenz.einzel, e.icc.konsistenz.mittel];
    soll.forEach((x, j) => { nah(r.icc![j], x.icc, `ICC ${j}`); nah(r.lo![j], x.kiLo, `KI unten ${j}`); nah(r.hi![j], x.kiHi, `KI oben ${j}`); });
    nah(r.msz![0], e.icc.msz, 'MS Fälle'); nah(r.msb![0], e.icc.msb, 'MS Spalten'); nah(r.mse![0], e.icc.mse, 'MS Rest'); nah(r.f![0], e.icc.f, 'F'); nah(r.p![0], e.icc.p, 'p');
  });

  it('icc: zwei Spalten mit r_tt und Bland-Altman', () => {
    art = 'icc';
    const z = zufall(11), namen = ['t1', 't2'];
    const m: (number | null)[][] = Array.from({ length: 25 }, (_, i) => { const w = 50 + i * 2 + z() * 10; return [Math.round((w + z() * 4) * 10) / 10, Math.round((w + 2 + z() * 4) * 10) / 10]; });
    const e = iccErgebnis(namen, zuVoll(m), m.length);
    expect(e.rtt, 'r_tt in Statable').toBeDefined(); expect(e.ba, 'Bland-Altman in Statable').toBeDefined();
    const r = inR({ typ: 'icc', e }, matrixKontext(namen, m), ".a('icc', icc$icc); .a('lo', icc$ki_lo); .a('hi', icc$ki_hi); .a('rtt', r_tt); .a('bm', ba_mittel); .a('bl', ba_lo); .a('bh', ba_hi)");
    [e.icc.absolut.einzel, e.icc.absolut.mittel, e.icc.konsistenz.einzel, e.icc.konsistenz.mittel].forEach((x, j) => { nah(r.icc![j], x.icc, `ICC ${j}`); nah(r.lo![j], x.kiLo, `KI unten ${j}`); nah(r.hi![j], x.kiHi, `KI oben ${j}`); });
    nah(r.rtt![0], e.rtt!, 'r_tt'); nah(r.bm![0], e.ba!.bias, 'Bland-Altman Mittel'); nah(r.bl![0], e.ba!.untere.wert, 'Grenze unten'); nah(r.bh![0], e.ba!.obere.wert, 'Grenze oben');
  });

  it('messwiederholung einfaktoriell, vier Zeitpunkte: F, p, GG, HF, ε, Mauchly, η²p, Paare (Bonferroni)', () => {
    art = 'messwiederholung';
    const z = zufall(23), namen = ['z1', 'z2', 'z3', 'z4'];
    const m: (number | null)[][] = Array.from({ length: 16 }, (_, i) => { const w = 20 + (i % 7) * 3 + z() * 6; return [w + z() * 3, w + 2 + z() * 4, w + 3.5 + z() * 5, w + 3 + z() * 3].map(v => Math.round(v * 10) / 10); });
    m[2]![3] = null;
    const e = messwiederholung(zuVoll(m), namen, undefined, undefined, m.length);
    const r = inR({ typ: 'messwiederholung', e }, matrixKontext(namen, m), ".a('f', f_zeit); .a('p', p_zeit); .a('pgg', p_gg); .a('phf', p_hf); .a('egg', eps_gg); .a('ehf', eps_hf); .a('w', unname(mauchly$statistic)); .a('pw', mauchly$p.value); .a('eta', eta2p); .a('sse', ss_fehler); .a('sst', ss_zeit); .a('pt', paare$t); .a('pd', paare$diff); .a('pp', paare$p); .a('pb', paare$p_bonf)");
    nah(r.f![0], e.zeit.f, 'F'); nah(r.p![0], e.zeit.p, 'p'); nah(r.pgg![0], e.zeit.pGG, 'p GG'); nah(r.phf![0], e.zeit.pHF, 'p HF');
    nah(r.egg![0], e.sphaer.gg, 'ε GG'); nah(r.ehf![0], e.sphaer.hf, 'ε HF'); nah(r.w![0], e.sphaer.w, 'Mauchly W'); nah(r.pw![0], e.sphaer.p, 'Mauchly p');
    nah(r.eta![0], e.zeit.etaP, 'η²p'); nah(r.sse![0], e.zeit.ssFehler, 'SS Fehler'); nah(r.sst![0], e.zeit.ss, 'SS Zeit');
    e.paare.forEach((a, j) => { nah(r.pt![j], a.t, `t ${a.i}-${a.j}`); nah(r.pd![j], a.diff, `Differenz ${a.i}-${a.j}`); nah(r.pp![j], a.p, `p ${a.i}-${a.j}`); nah(r.pb![j], a.pAnp, `p Bonferroni ${a.i}-${a.j}`); });
  });

  /* Teil 2c: gemischte Messwiederholung (Typ III, ungleich große Gruppen, Text-Gruppen) */
  it('messwiederholung gemischt, drei Zeitpunkte × drei ungleich große Gruppen: Zeit, Gruppe, Wechselwirkung (Typ III), GG, HF, Mauchly, Paare', () => {
    art = 'messw-gemischt';
    const z = zufall(41), namen = ['m1', 'm2', 'm3'], gr = ['ohne', 'kurz', 'lang'];
    const m: (number | string | null)[][] = Array.from({ length: 23 }, (_, i) => {
      const q = i < 5 ? 0 : i < 13 ? 1 : 2, w = 15 + (i % 5) * 2 + z() * 4;
      return [w + z() * 3, w + 1 + q * 1.5 + z() * 4, w + 1.5 + q * 3 + z() * 4].map(v => Math.round(v * 10) / 10).concat([gr[q]!] as never) as (number | string)[];
    });
    m[7]![1] = null; m[15]![3] = null;
    const voll = m.filter(r => r.every(v => v !== null));
    const e = messwiederholung(voll.map(r => r.slice(0, 3) as number[]), namen, voll.map(r => r[3] as string), 'gruppe', m.length);
    expect(new Set(e.gruppen.map(x => x.n)).size, 'ungleich groß').toBeGreaterThan(1);
    const ctx: RKontext = {
      spalten: [...namen.map(n => ({ name: n, bezeichnung: '', art: 'zahl' as const, werteLabels: {}, fehlend: [] })), { name: 'gruppe', bezeichnung: '', art: 'text' as const, werteLabels: {}, fehlend: [] }],
      zeilen: m, blattSpalten: [...namen, 'gruppe'], titel: 'Gegenprobe', datum: '14.11.2026'
    };
    const r = inR({ typ: 'messwiederholung', e }, ctx, ".a('ss', c(ss_zeit, ss_gruppe, ss_wechsel, ss_fehler, ss_personen)); .a('f', c(f_zeit, f_gruppe, f_wechsel)); .a('p', c(p_zeit, p_gruppe, p_wechsel)); .a('pk', c(p_zeit_gg, p_zeit_hf, p_wechsel_gg, p_wechsel_hf)); .a('eps', c(eps_gg, eps_hf)); .a('w', c(unname(mauchly$statistic), mauchly$p.value)); .a('eta', eta2p); .a('pd', paare$diff); .a('pt', paare$t); .a('pp', paare$p); .a('pb', paare$p_bonf)");
    const g = e.gruppe!, w = e.wechsel!;
    [e.zeit.ss, g.ss, w.ss, e.zeit.ssFehler, e.ssPersonen].forEach((x, j) => nah(r.ss![j], x, `SS ${j}`));
    [e.zeit.f, g.f, w.f].forEach((x, j) => nah(r.f![j], x, `F ${j}`)); [e.zeit.p, g.p, w.p].forEach((x, j) => nah(r.p![j], x, `p ${j}`));
    [e.zeit.pGG, e.zeit.pHF, w.pGG, w.pHF].forEach((x, j) => nah(r.pk![j], x, `p korrigiert ${j}`));
    nah(r.eps![0], e.sphaer.gg, 'ε GG'); nah(r.eps![1], e.sphaer.hf, 'ε HF'); nah(r.w![0], e.sphaer.w, 'Mauchly W'); nah(r.w![1], e.sphaer.p, 'Mauchly p');
    [e.zeit.etaP, g.etaP, w.etaP].forEach((x, j) => nah(r.eta![j], x, `η²p ${j}`));
    e.paare.forEach((a, j) => { nah(r.pd![j], a.diff, `Differenz ${j}`); nah(r.pt![j], a.t, `t ${j}`); nah(r.pp![j], a.p, `p ${j}`); nah(r.pb![j], a.pAnp, `p Bonferroni ${j}`); });
  });

  /* Teil 2c: Faktorenanalyse. Sollwerte = die PSPP-Tabellen (Eigenwerte, KMO/Bartlett, Ladungen), Zeilen über den Namen (PSPP sortiert mit /FORMAT=SORT),
   * Spalten über die beste Zuordnung, Vorzeichen beliebig (Betrag). `toleranz`: je PSPP-Tabelle die Grenze für die größte Abweichung einer Ladung. */
  const pruefeFaktor = async (datei: string, fa: { methode: 'pc' | 'paf'; zahl: number | null }, toleranz: { unrotiert: number; rotiert?: number }) => {
    const s = await lade(datei), v = VERFAHREN.find(x => x.id === 'faktor')!;
    const namen = s.spalten.map(x => x.name), w = { l1: namen, l2: [], l3: [], l4: [] };
    const items = faktorTabellenBereinigen(s.e.run(v.syntax(w as never, { fa: { ...fa, grenze: null } } as never)));
    const e = faktoren(items, namen.map(n => [n, n] as [string, string]), fa.zahl);
    const r = inR({ typ: 'faktor', e }, s.ctx(namen), ".a('eig', eigenwerte); .a('kmo', c(kmo, bartlett_chi2, bartlett_df, bartlett_p)); .a('lad', t(ladung)); .a('rot', t(ladung_rotiert))");
    e.eigen!.forEach((x, j) => nah(r.eig![j], x, `Eigenwert ${j}`));
    nah(r.kmo![0], e.kmo!.kmo, 'KMO'); nah(r.kmo![1], e.kmo!.chi2, 'Bartlett χ²', 1e-5); nah(r.kmo![2], e.kmo!.df, 'df'); nah(r.kmo![3], e.kmo!.p, 'Bartlett p');
    const m = e.faktoren.length;
    const perm = (n: number): number[][] => (n === 1 ? [[0]] : perm(n - 1).flatMap(p => Array.from({ length: n }, (_, k) => [...p.slice(0, k), n - 1, ...p.slice(k)])));
    const vergleiche = (re: RegExp, aus: number[], tol: number, was: string) => {
      const mt = finde(items, re)!; expect(mt, was).toBeTruthy();
      const pspp = new Map<string, number[]>();
      for (let i = mt.tabelle.headRows[0]; i < mt.t.length; i++) { const nm = mt.t[i]![0]; if (nm) pspp.set(nm, mt.n[i]!.slice(1).map(x => x ?? 0)); }
      expect(pspp.size, `${was}: Zeilen`).toBeGreaterThan(m);
      const rl = namen.map((_, i) => aus.slice(i * m, (i + 1) * m));
      const fehler = (pm: number[]) => Math.max(...namen.map((nm, i) => pspp.has(nm) ? Math.max(...pm.map((c, j) => Math.abs(Math.abs(rl[i]![c]!) - Math.abs(pspp.get(nm)![j]!)))) : 0));
      const best = Math.min(...perm(m).map(fehler));
      abweichung[`${art} ${was}`] = Math.max(abweichung[`${art} ${was}`] ?? 0, best);
      expect(best, was).toBeLessThan(tol);
    };
    vergleiche(/^Component Matrix$|^Factor Matrix$/, r.lad!, toleranz.unrotiert, 'unrotiert');
    if (toleranz.rotiert) vergleiche(/^Rotated Component Matrix$|^Pattern Matrix$/, r.rot!, toleranz.rotiert, 'rotiert');
    if (fa.methode === 'paf' && m > 1) {
      expect(e.korrelationen, 'Faktorkorrelationen in Statable').toBeDefined();
      const rk = inR({ typ: 'faktor', e }, s.ctx(namen), ".a('kor', faktor_korrelation)").kor!;
      // Spalten können vertauscht sein: Beträge der Korrelationen außerhalb der Diagonale als sortierte Liste vergleichen
      const aus = (k: number[]) => k.filter((_, i) => i % m !== Math.floor(i / m)).map(Math.abs).sort();
      const soll = aus(e.korrelationen!.flat()), ist = aus(rk);
      soll.forEach((x, j) => nah(ist[j], x, `Faktorkorrelation ${j}`, 1e-5));
    }
    return e;
  };
  it('faktor Hauptkomponenten + Varimax (Kaiser, 4 Komponenten): Eigenwerte, KMO, Bartlett, Ladungen vor und nach der Rotation', async () => {
    art = 'faktor-pc';
    const e = await pruefeFaktor('fa-drei.csv', { methode: 'pc', zahl: null }, { unrotiert: 1e-6, rotiert: 1e-4 });
    expect(e.faktoren.length).toBe(4);
  });
  it('faktor Hauptkomponenten + Varimax, zwei festgelegte Komponenten', async () => {
    art = 'faktor-pc';
    await pruefeFaktor('fa-zwei.csv', { methode: 'pc', zahl: 2 }, { unrotiert: 1e-6, rotiert: 1e-4 });
  });
  /* Hauptachsen: Extraktion (Kommunalitäten in höchstens 25 Schritten) wie PSPP. Promax: PSPP bildet das Ziel aus den Kaiser-normierten Varimax-Ladungen,
   * rechnet die Regression aber mit den nicht normierten - anders als R stats::promax (dort weicht die Mustermatrix bei drei Faktoren um 0,08 ab). */
  it('faktor Hauptachsen + Promax(4), zwei Faktoren: Extraktion und Mustermatrix wie PSPP', async () => {
    art = 'faktor-paf';
    await pruefeFaktor('fa-zwei.csv', { methode: 'paf', zahl: 2 }, { unrotiert: 1e-5, rotiert: 1e-5 });
  });
  it('faktor Hauptachsen + Promax(4), drei Faktoren: Extraktion und Mustermatrix wie PSPP', async () => {
    art = 'faktor-paf';
    await pruefeFaktor('fa-drei.csv', { methode: 'paf', zahl: 3 }, { unrotiert: 1e-5, rotiert: 1e-5 });
  });

  const pruefeFriedman = (m: number[][], namen: string[], erwarteExakt: boolean) => {
    const e = messwiederholung(m, namen, undefined, undefined, m.length), fr = friedman(m, namen);
    const r = inR({ typ: 'messwiederholung', e, rang: fr } as never, matrixKontext(namen, m), ".a('chi', unname(rang$statistic)); .a('df', unname(rang$parameter)); .a('p', rang$p.value); .a('w', kendall_w); .a('v', rang_paare$v_plus); .a('pp', rang_paare$p); .a('ph', rang_paare$p_holm)");
    nah(r.chi![0], fr.chi2, 'χ²'); nah(r.df![0], fr.df, 'df'); nah(r.p![0], fr.p, 'p'); nah(r.w![0], fr.kendallW, 'Kendalls W');
    fr.paare.forEach((a, j) => { nah(r.v![j], a.vPlus, `V+ ${a.i}-${a.j}`); nah(r.pp![j], a.p!, `p ${a.i}-${a.j}`); nah(r.ph![j], a.pHolm!, `p Holm ${a.i}-${a.j}`); });
    expect(fr.paare.every(a => a.nTest < 50), erwarteExakt ? 'exakt' : 'Näherung').toBe(erwarteExakt);
    return fr;
  };
  it('Friedman exakt mit Bindungen (12 Personen, ganze Zahlen) und mit Näherung (60 Personen)', () => {
    art = 'friedman';
    const z = zufall(31), namen = ['f1', 'f2', 'f3', 'f4'];
    const klein = Array.from({ length: 12 }, (_, i) => [3 + (i % 4), 4 + (i % 3), 5 + Math.round(z() * 4), 4 + Math.round(z() * 4)].map(v => Math.max(1, v)));
    const exakt = pruefeFriedman(klein, namen, true);
    expect(exakt.paare.some(a => a.nNull > 0), 'Bindungen (Nullen)').toBe(true);
    const gross = Array.from({ length: 60 }, (_, i) => [10 + (i % 6) + z() * 5, 11 + (i % 5) + z() * 5, 12 + (i % 4) + z() * 5, 11 + z() * 8].map(v => Math.round(v * 10) / 10));
    pruefeFriedman(gross, namen, false);
  });

  it('Testhalbierung mit fünf Fragen (ungerade Zahl): r, Spearman-Brown gleich und ungleich, Guttman, Alpha je Hälfte', () => {
    art = 'splithalf';
    const namen = ['dt1', 'dt2', 'dt3', 'dt4', 'dt5'];
    const e = { ...skala(fh.e.run(`RELIABILITY /VARIABLES=${namen.join(' ')} /SCALE('Skala') ALL /MODEL=ALPHA /SUMMARY=TOTAL.`)), splitHalf: splitHalf(fh.e.run(splitHalfSyntax(namen))) };
    const h = e.splitHalf;
    expect([h.k1, h.k2], 'Hälften 3 + 2').toEqual([3, 2]);
    const r = inR({ typ: 'skala', e }, fh.ctx(namen), ".a('r', r_haelften); .a('sg', sb_gleich); .a('su', sb_ungleich); .a('g', guttman); .a('a1', alpha_h1); .a('a2', alpha_h2)");
    nah(r.r![0], h.r, 'r der Hälften'); nah(r.sg![0], h.sbGleich, 'Spearman-Brown gleich'); nah(r.su![0], h.sbUngleich, 'Spearman-Brown ungleich');
    nah(r.g![0], h.guttman, 'Guttman'); nah(r.a1![0], h.alpha1, 'Alpha Hälfte 1'); nah(r.a2![0], h.alpha2, 'Alpha Hälfte 2');
  });
});
