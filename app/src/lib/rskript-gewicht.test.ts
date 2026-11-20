/**
 * B1 Teil 2f: R-Skript mit Häufigkeitsgewicht. Das Skript erweitert die Zeilen (jede Zeile so oft, wie ihr Gewicht sagt) und rechnet dann wie ungewichtet.
 * Gegenprobe: PSPP mit `WEIGHT BY w` (die Statable-Engine, so wie das Blatt rechnet) gegen das Skript in ECHTEM R 4.6.1 (nur wenn Rscript da ist).
 * Das Gewicht ist w = Zeilennummer mod 4 (0, 1, 2, 3): Zeilen mit 0 zählen nicht, andere doppelt oder dreifach - so fällt jeder Fehler beim Zählen auf.
 * Dazu reine Prüfungen ohne R: welche Arten ein Skript bekommen, Umfragegewicht sperrt, die Felder aus Abdruck und aktivem Gewicht.
 * Sollwerte nur aus PSPP und R, nichts von Hand.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { alsZahl, leseCsv, planeSpalten, zurEngine } from './einlesen';
import { anova, faktoren, faktorTabellenBereinigen, kappa, kreuz, praePost, verteilung, vorhersage, zusammenhang, zweiGruppen } from './ergebnis';
import { regFaktor, regTerme, regressionBefehl } from './regfaktor';
import { VERFAHREN } from './verfahren';
import { baueRBericht, baueRSkript, rGewichtFelder, rSkriptMoeglich, type RKontext, type RSpalte } from './rskript';
import { nodeEngine } from './testengine';

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);
const W = (i: number) => (i + 1) % 4;   // wie PSPP: MOD($CASENUM, 4)

type Motor = Awaited<ReturnType<typeof nodeEngine>>;
interface Satz { e: Motor; spalten: RSpalte[]; zeilen: (string | number | null)[][]; ctx: (blatt: string[]) => RKontext }

/** Datei in die Engine (wie die App), Spalte w anhängen und `WEIGHT BY w`; derselbe Kontext für das Skript mit `gewichtSpalte: 'w'`. */
async function ladeGewichtet(datei: string, labels: Record<string, Record<string, string>> = {}): Promise<Satz> {
  const e = await nodeEngine();
  const tab = leseCsv(readFileSync(new URL(`./testdaten/${datei}`, import.meta.url), 'utf8'));
  const b = zurEngine(tab);
  e.run(b.syntax, { '/import.csv': b.csv });
  for (const [n, l] of Object.entries(labels)) e.run(`VALUE LABELS ${n} ${Object.entries(l).map(([k, v]) => `${k} '${v}'`).join(' ')}.`);
  e.run('COMPUTE w = MOD($CASENUM, 4).\nEXECUTE.\nWEIGHT BY w.');
  const plan = planeSpalten(tab);
  const spalten: RSpalte[] = [...plan.map(p => ({ name: p.name, bezeichnung: '', art: (p.art === 'zahl' ? 'zahl' : 'text') as RSpalte['art'], werteLabels: labels[p.name] ?? {}, fehlend: [] })), { name: 'w', bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [] }];
  const zeilen = tab.zeilen.map((z, zi) => [...plan.map((p, i) => { const v = z[i] ?? null; if (v === null || v === '') return null; return p.art === 'zahl' ? alsZahl(v, p.punkt) : String(v); }), W(zi)]);
  return { e, spalten, zeilen, ctx: blatt => ({ spalten, zeilen, blattSpalten: blatt, titel: 'Gegenprobe gewichtet', datum: '14.11.2026', gewichtSpalte: 'w' }) };
}

const tmp = mitR ? mkdtempSync(join(tmpdir(), 'rskript-w-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });
const abweichung: Record<string, number> = {};
let art = '';

function inR(erg: { typ: string; e: unknown }, ctx: RKontext, ausgabe: string): Record<string, number[]> {
  expect(rSkriptMoeglich(erg, ctx), 'R-Skript möglich').toBe(true);
  const sk = baueRSkript(erg, ctx), ordner = mkdtempSync(join(tmp, 'f-'));
  expect(sk.r).toContain('daten <- daten[rep(seq_len(nrow(daten)), round(gewicht)), , drop = FALSE]');
  expect(sk.csv.split('\n')[0]).toMatch(/(^|,)w$/);
  const kopf = `.a <- function(n, x) cat("@@", n, "=", paste(sprintf("%.12g", as.numeric(x)), collapse = ","), "\\n", sep = "")\n`;
  writeFileSync(join(ordner, sk.csvName), sk.csv, 'utf8');
  writeFileSync(join(ordner, sk.rName), sk.r + '\n' + kopf + ausgabe + '\n', 'utf8');
  const l = spawnSync(RSCRIPT, [sk.rName], { cwd: ordner, encoding: 'utf8' });
  expect(l.status, `Rscript: ${l.stderr}\n${sk.r}`).toBe(0);
  const aus: Record<string, number[]> = {};
  for (const z of l.stdout.split(/\r?\n/)) { const m = /^@@(\w+)=(.*)$/.exec(z); if (m) aus[m[1]!] = m[2]!.split(',').map(Number); }
  return aus;
}
function nah(ist: number | undefined, soll: number, was: string, tol = 1e-6) {
  expect(ist, `${was}: kein Wert aus R`).toBeDefined();
  const d = Math.abs(ist! - soll) / Math.max(1, Math.abs(soll));
  abweichung[art] = Math.max(abweichung[art] ?? 0, d);
  expect(d, `${was}: R ${ist} gegen PSPP ${soll}`).toBeLessThan(tol);
}

describe('R-Skript mit Fallgewicht: wann es eines gibt', () => {
  const spalten: RSpalte[] = ['y', 'g', 'w'].map(name => ({ name, bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [] }));
  const ctx: RKontext = { spalten, zeilen: [[1, 1, 1], [2, 2, 2]], blattSpalten: ['y', 'g'], titel: 't', datum: 'd', gewichtSpalte: 'w' };
  const zus = { typ: 'zusammenhang', e: { x: 'y', y: 'g', r: 0.5, p: 0.1, n: 3, kiLo: 0, kiHi: 1 } };

  it('rGewichtFelder: nur gleiches Häufigkeitsgewicht an Blatt und Projekt wird nachgebaut', () => {
    expect(rGewichtFelder(undefined, undefined)).toEqual({});
    expect(rGewichtFelder({ spalte: 'w', art: 'haeufigkeit' }, { spalte: 'w', art: 'haeufigkeit' })).toEqual({ gewichtSpalte: 'w' });
    expect(rGewichtFelder({ spalte: 'w', art: 'umfrage' }, { spalte: 'w', art: 'umfrage' })).toEqual({ gewicht: true });
    expect(rGewichtFelder({ spalte: 'w', art: 'haeufigkeit' }, { spalte: 'v', art: 'haeufigkeit' })).toEqual({ gewicht: true });
    expect(rGewichtFelder({ spalte: 'w', art: 'haeufigkeit' }, undefined)).toEqual({ gewicht: true });
    expect(rGewichtFelder(undefined, { spalte: 'w', art: 'haeufigkeit' })).toEqual({ gewicht: true });
  });
  it('Pearson mit Häufigkeitsgewicht ja, Rang- und Partialkorrelation nein, Umfragegewicht nie', () => {
    expect(rSkriptMoeglich(zus, ctx)).toBe(true);
    expect(rSkriptMoeglich({ ...zus, e: { ...zus.e, methode: 'spearman' } }, ctx)).toBe(false);
    expect(rSkriptMoeglich({ ...zus, e: { ...zus.e, kontroll: ['w'] } }, ctx)).toBe(false);
    expect(rSkriptMoeglich(zus, { ...ctx, gewichtSpalte: undefined, gewicht: true })).toBe(false);
    expect(rSkriptMoeglich(zus, { ...ctx, gewichtSpalte: 'fehlt' })).toBe(false);
  });
  it('gesperrte Arten (logistisch, Skala, ICC, Messwiederholung, webR, Rangtest) bekommen mit Häufigkeitsgewicht kein Skript', () => {
    for (const typ of ['logistik', 'skala', 'icc', 'messwiederholung', 'ordreg', 'multreg', 'zaehlreg']) expect(rSkriptMoeglich({ typ, e: {} }, ctx), typ).toBe(false);
    expect(rSkriptMoeglich({ ...zus, typ: 'zwei-gruppen', rang: {} }, ctx)).toBe(false);
  });
  it('das Gewicht ist selbst eine gewählte Spalte: kein Skript (die Rechnung wäre verdreht)', () => {
    expect(rSkriptMoeglich({ ...zus, e: { ...zus.e, y: 'w' } }, ctx)).toBe(false);
  });
  it('böser Spaltenname des Gewichts bleibt im Kommentar und in daten[["…"]]', () => {
    const bose = 'w")\nq()\n#';
    const sp2 = spalten.map(s => (s.name === 'w' ? { ...s, name: bose } : s));
    const sk = baueRSkript(zus, { ...ctx, spalten: sp2, gewichtSpalte: bose });
    expect(sk.r).not.toMatch(/^q\(\)/m);
    expect(sk.r).toContain(`gewicht <- daten[['w")\\nq()\\n#']]`);
    expect(sk.r).toContain('# Häufigkeitsgewicht w") q() #:');
  });
});

describe.skipIf(!mitR)('R-Skript mit Häufigkeitsgewicht gegen PSPP WEIGHT BY (Rscript 4.6.1)', () => {
  let rf: Satz, sl: Satz;
  beforeAll(async () => {
    rf = await ladeGewichtet('regression-faktor.csv', { studiengang: { 1: 'Lehramt', 2: 'Sozialpaed', 3: 'Psychologie' } });
    sl = await ladeGewichtet('schlaf-und-konzentration.csv');
  }, 120000);
  afterAll(() => { console.log('Größte Abweichung R gegen PSPP (gewichtet) je Art:', JSON.stringify(abweichung)); });

  it('zwei-gruppen: Student, Welch, Cohens d, n = Summe der Gewichte', () => {
    art = 'zwei-gruppen';
    const e = zweiGruppen(rf.e.run("T-TEST GROUPS=zwei('nein' 'ja') /VARIABLES=punkte."), 'punkte', 'zwei');
    const r = inR({ typ: 'zwei-gruppen', e }, rf.ctx(['punkte', 'zwei']),
      ".a('tK', ergebnis$statistic); .a('dfK', ergebnis$parameter); .a('pK', ergebnis$p.value); .a('tW', ergebnis_welch$statistic); .a('dfW', ergebnis_welch$parameter); .a('pW', ergebnis_welch$p.value); .a('d', d_cohen)");
    nah(r.tK![0], e.tKlassisch, 't klassisch'); nah(r.dfK![0], e.dfKlassisch, 'df klassisch'); nah(r.pK![0], e.pKlassisch, 'p klassisch');
    nah(r.tW![0], e.t, 't Welch'); nah(r.dfW![0], e.df, 'df Welch'); nah(r.pW![0], e.p, 'p Welch'); nah(r.d![0], e.d, 'Cohens d');
  });

  it('anova: F, p, Quadratsummen, Levene', () => {
    art = 'anova';
    const e = anova(rf.e.run('ONEWAY punkte BY studiengang\n  /STATISTICS=DESCRIPTIVES HOMOGENEITY.'), 'punkte', 'studiengang');
    const r = inR({ typ: 'anova', e }, rf.ctx(['punkte', 'studiengang']),
      ".a('f', tabelle_aov[['F value']][1]); .a('p', tabelle_aov[['Pr(>F)']][1]); .a('ss', tabelle_aov[['Sum Sq']]); .a('df', tabelle_aov[['Df']]); .a('lf', levene[['F value']][1]); .a('lp', levene[['Pr(>F)']][1])");
    nah(r.f![0], e.f, 'F'); nah(r.p![0], e.p, 'p'); nah(r.ss![0], e.ssZwischen, 'SS zwischen'); nah(r.ss![1], e.ssInnerhalb, 'SS innerhalb');
    nah(r.df![0], e.dfZwischen, 'df zwischen'); nah(r.df![1], e.dfInnerhalb, 'df innerhalb');
    nah(r.lf![0], e.levene!, 'Levene F'); nah(r.lp![0], e.leveneP!, 'Levene p');
  });

  it('prae-post: t, df, p, dz', () => {
    art = 'prae-post';
    const e = praePost(rf.e.run('T-TEST PAIRS=lernzeit WITH punkte (PAIRED).'), 'lernzeit', 'punkte');
    const r = inR({ typ: 'prae-post', e }, rf.ctx(['lernzeit', 'punkte']), ".a('t', ergebnis$statistic); .a('df', ergebnis$parameter); .a('p', ergebnis$p.value); .a('dz', dz)");
    nah(r.t![0], -e.t, 't (umgekehrtes Vorzeichen)'); nah(r.df![0], e.df, 'df'); nah(r.p![0], e.p, 'p'); nah(r.dz![0], e.dz, 'dz');
  });

  it('zusammenhang Pearson: r, p, n', () => {
    art = 'zusammenhang';
    const e = zusammenhang(rf.e.run('CORRELATIONS /VARIABLES=lernzeit punkte.'), 'lernzeit', 'punkte');
    const r = inR({ typ: 'zusammenhang', e }, rf.ctx(['lernzeit', 'punkte']), ".a('r', ergebnis$estimate); .a('p', ergebnis$p.value); .a('ki', ergebnis$conf.int); .a('n', ergebnis$parameter + 2)");
    nah(r.r![0], e.r, 'r'); nah(r.p![0], e.p, 'p'); nah(r.n![0], e.n, 'n');
    nah(r.ki![0], e.kiLo, 'KI unten', 1e-5); nah(r.ki![1], e.kiHi, 'KI oben', 1e-5);   // 1,96 gegen qnorm(0,975) wie in der ungewichteten Gegenprobe
  });

  it('kreuz: Chi-Quadrat, Cramérs V, gewichtete Zählung; 2 x 2 mit Fisher', () => {
    art = 'kreuz';
    const e = kreuz(rf.e.run('CROSSTABS /TABLES=sg_text BY zwei\n  /STATISTICS=CHISQ\n  /CELLS=COUNT ROW EXPECTED.'));
    const r = inR({ typ: 'kreuz', e }, rf.ctx(['zwei', 'sg_text']), ".a('chi', ergebnis$statistic); .a('p', ergebnis$p.value); .a('v', v_cramer); .a('tab', as.vector(t(tab)))");
    nah(r.chi![0], e.chi2, 'Chi-Quadrat'); nah(r.p![0], e.p, 'p'); nah(r.v![0], e.v, 'Cramérs V');
    expect(r.tab).toEqual(e.zaehlung!.tab.flat());
    const e2 = kreuz(rf.e.run('CROSSTABS /TABLES=zwei BY hoch\n  /STATISTICS=CHISQ\n  /CELLS=COUNT ROW EXPECTED.'));
    expect(e2.fisherP).toBeDefined();
    const r2 = inR({ typ: 'kreuz', e: e2 }, rf.ctx(['hoch', 'zwei']), ".a('chi', ergebnis$statistic); .a('fp', fisher$p.value)");
    nah(r2.chi![0], e2.chi2, 'Chi-Quadrat 2 x 2'); nah(r2.fp![0], e2.fisherP!, 'Fisher p');
  });

  it('vorhersage mit Gruppen-Spalte und Zahl: B, p, KI, R², F, Beta', () => {
    art = 'vorhersage';
    const sp = rf.spalten.find(x => x.name === 'studiengang')!, i = rf.spalten.indexOf(sp);
    const werte = rf.zeilen.map(z => z[i]).filter((v): v is number => v !== null);
    const t = regTerme(['studiengang', 'lernzeit'], n => (n === 'studiengang' ? regFaktor({ ...sp, bezeichnung: '', niveau: 'nominal', format: '', fehlendText: '' }, werte, rf.spalten.map(s => s.name)) : null));
    const e = vorhersage(rf.e.run(regressionBefehl('punkte', t)), 'punkte', t);
    const r = inR({ typ: 'vorhersage', e }, rf.ctx(['punkte', 'studiengang', 'lernzeit']),
      ".a('b', coef(modell)[-1]); .a('p', ergebnis$coefficients[-1, 4]); .a('lo', konfidenz[-1, 1]); .a('hi', konfidenz[-1, 2]); .a('r2', ergebnis$r.squared); .a('f', ergebnis$fstatistic[1]); .a('beta', beta)");
    e.praediktoren.forEach((x, j) => { nah(r.b![j], x.b, `B ${x.name}`); nah(r.p![j], x.p, `p ${x.name}`, 1e-5); nah(r.lo![j], x.lo, `KI unten ${x.name}`); nah(r.hi![j], x.hi, `KI oben ${x.name}`); nah(r.beta![j], x.beta, `Beta ${x.name}`); });
    nah(r.r2![0], e.r2, 'R²'); nah(r.f![0], e.f, 'F');
  });

  it('verteilung: n, Mittelwert, SD, Quartile, Häufigkeiten', () => {
    art = 'verteilung';
    const e = verteilung(sl.e.run('FREQUENCIES /VARIABLES=alter konzentration\n  /FORMAT=NOTABLE\n  /STATISTICS=MEAN STDDEV MIN MAX MEDIAN SKEWNESS KURTOSIS\n  /PERCENTILES=25 50 75\n  /ALGORITHM=COMPATIBLE.\nFREQUENCIES /VARIABLES=handy_im_bett\n  /STATISTICS=NONE.'));
    const r = inR({ typ: 'verteilung', e }, sl.ctx(['alter', 'konzentration', 'handy_im_bett']), ".a('n', kennzahlen[, 'n']); .a('m', kennzahlen[, 'mittelwert']); .a('sd', kennzahlen[, 'sd']); .a('q1', kennzahlen[, 'q1']); .a('md', kennzahlen[, 'median']); .a('q3', kennzahlen[, 'q3']); .a('h', as.vector(haeufigkeiten[[1]]))");
    e.zahlen.forEach((z, j) => {
      nah(r.n![j], z.n, `n ${z.name}`); nah(r.m![j], z.m, `M ${z.name}`); nah(r.sd![j], z.sd, `SD ${z.name}`);
      nah(r.q1![j], z.q1!, `Q1 ${z.name}`); nah(r.md![j], z.median!, `Median ${z.name}`); nah(r.q3![j], z.q3!, `Q3 ${z.name}`);
    });
    expect(r.h).toEqual(e.gruppen[0]!.werte.map(w => w.anzahl));
  });

  it('kappa: Statable rechnet aus den erweiterten Paaren (wie das Blatt) - das Skript kommt auf dasselbe', async () => {
    art = 'kappa';
    const A = [1, 2, 3, 1, 3, 2, 1, 2, 3, 3, 2, 1, 1, 2, 3, 2, 2, 3, 1, 1], B = [1, 2, 2, 1, 3, 3, 2, 2, 3, 3, 1, 1, 1, 2, 3, 2, 3, 3, 2, 1];
    const e = await nodeEngine();
    e.run('NEW FILE.\nDATA LIST LIST /a b.\nBEGIN DATA\n' + A.map((v, i) => `${v} ${B[i]}`).join('\n') + '\nEND DATA.\nCOMPUTE w = MOD($CASENUM, 4).\nEXECUTE.\nWEIGHT BY w.');
    const paare = A.flatMap((v, i) => Array.from({ length: W(i) }, () => [v, B[i]!] as [number, number]));
    const k = kappa(e.run('CROSSTABS /TABLES=a BY b /STATISTICS=KAPPA /CELLS=COUNT.'), 'a', 'b', paare, true);
    const spalten: RSpalte[] = ['a', 'b', 'w'].map(name => ({ name, bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [] }));
    const ctx: RKontext = { spalten, zeilen: A.map((v, i) => [v, B[i]!, W(i)]), blattSpalten: ['a', 'b'], titel: 'Kappa', datum: 'heute', gewichtSpalte: 'w' };
    for (const g of ['keins', 'linear', 'quadratisch'] as const) {
      const r = inR({ typ: 'kappa', e: { ...k, ...k.alle[g], gewicht: g } }, ctx, ".a('k', kappa); .a('n', sum(tab))");
      nah(r.k![0], g === 'keins' ? k.kappa : k.alle[g].kappa, `Kappa ${g}`);
      expect(r.n![0]).toBe(paare.length);
    }
  });

  it('faktor Hauptkomponenten + Varimax: Eigenwerte, KMO, Bartlett mit n = Summe der Gewichte', async () => {
    art = 'faktor';
    const s = await ladeGewichtet('fa-zwei.csv'), v = VERFAHREN.find(x => x.id === 'faktor')!;
    const namen = s.spalten.map(x => x.name).filter(n => n !== 'w');
    const items = faktorTabellenBereinigen(s.e.run(v.syntax({ l1: namen, l2: [], l3: [], l4: [] } as never, { fa: { methode: 'pc', zahl: 2, grenze: null } } as never)));
    const e = faktoren(items, namen.map(n => [n, n] as [string, string]), 2);
    const r = inR({ typ: 'faktor', e }, s.ctx(namen), ".a('eig', eigenwerte); .a('kmo', c(kmo, bartlett_chi2, bartlett_df, bartlett_p))");
    e.eigen!.forEach((x, j) => nah(r.eig![j], x, `Eigenwert ${j}`));
    nah(r.kmo![0], e.kmo!.kmo, 'KMO'); nah(r.kmo![1], e.kmo!.chi2, 'Bartlett χ²', 1e-5); nah(r.kmo![2], e.kmo!.df, 'df'); nah(r.kmo![3], e.kmo!.p, 'Bartlett p');
  });

  it('Bericht: gewichteter t-Test und ungewichtetes Blatt nebeneinander - jedes Blatt rechnet mit seinem Stand, daten_alle bleibt unverändert', () => {
    art = 'bericht';
    const ew = zweiGruppen(rf.e.run("T-TEST GROUPS=zwei('nein' 'ja') /VARIABLES=punkte."), 'punkte', 'zwei');
    const sk = baueRBericht([
      { erg: { typ: 'zwei-gruppen', e: ew }, ctx: rf.ctx(['punkte', 'zwei']) },
      { erg: { typ: 'zwei-gruppen', e: ew }, ctx: { ...rf.ctx(['punkte', 'zwei']), gewichtSpalte: undefined, gewicht: true } }
    ], 'Bericht gewichtet', 'heute')!;
    expect(sk.mit.length).toBe(1); expect(sk.ohne.length).toBe(1);
    const ordner = mkdtempSync(join(tmp, 'b-'));
    writeFileSync(join(ordner, sk.csvName), sk.csv, 'utf8');
    writeFileSync(join(ordner, sk.rName), sk.r + '\ncat("@@n=", nrow(daten_alle), ",", nrow(blatt_1$daten), "\\n", sep = "")\ncat("@@t=", blatt_1$ergebnis$statistic, "\\n", sep = "")\n', 'utf8');
    const l = spawnSync(RSCRIPT, [sk.rName], { cwd: ordner, encoding: 'utf8' });
    expect(l.status, l.stderr).toBe(0);
    const n = /@@n=(\d+),(\d+)/.exec(l.stdout)!, t = /@@t=(\S+)/.exec(l.stdout)!;
    expect(Number(n[1])).toBe(rf.zeilen.length);
    expect(Number(n[2])).toBe(rf.zeilen.reduce((a, _, i) => a + W(i), 0));
    nah(Number(t[1]), ew.tKlassisch, 't im Bericht');
  });
});
