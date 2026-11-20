/**
 * B1 R-Skript (Teil 1): Einheitstests ohne Engine. Aufbau des Skripts je Ergebnisart, die CSV (nur benutzte Spalten, Fehlend leer, Filter) und die Sicherheit (Fachblatt, Abschnitt „Sicherheit“).
 * Die Zahlen gegen PSPP und R prüft rskript-gegenprobe.test.ts.
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { baueRSkript, datenCsv, kom, rDateiBasis, rSkriptMoeglich, rSkriptZip, type RErgebnis, type RKontext, type RSpalte } from './rskript';

const sp = (name: string, art: 'zahl' | 'text' | 'datum' = 'zahl', o: Partial<RSpalte> = {}): RSpalte => ({ name, bezeichnung: '', art, werteLabels: {}, fehlend: [], ...o });
const kontext = (spalten: RSpalte[], zeilen: (string | number | null)[][], blatt: string[], o: Partial<RKontext> = {}): RKontext => ({ spalten, zeilen, blattSpalten: blatt, titel: 'Mein Blatt', datum: '14.11.2026', ...o });
const gruppe = (name: string) => ({ name, n: 10, m: 1, sd: 1, kiLo: 0, kiHi: 2 });

/** Ein kleiner Datensatz: y (Zahl, Code 99 fehlt), g (Text ja/nein), h (Zahl 1/2 mit Beschriftung), x1, x2, nicht benutzt. */
const spalten: RSpalte[] = [sp('y', 'zahl', { fehlend: [99] }), sp('g', 'text'), sp('h', 'zahl', { werteLabels: { 1: 'eins', 2: 'zwei' } }), sp('x1'), sp('x2'), sp('nicht_benutzt', 'text')];
const zeilen: (string | number | null)[][] = [[1, 'ja', 1, 1, 5, 'geheim'], [2, 'nein', 2, 2, 4, 'geheim'], [99, 'ja', 1, 3, 3, 'geheim'], [4, 'nein', 2, 4, 2, 'geheim'], [null, 'ja', 1, 5, 1, 'geheim'], [6, null, 2, 6, 0, 'geheim']];
const ctxD = (blatt: string[], o: Partial<RKontext> = {}) => kontext(spalten, zeilen, blatt, o);

const tGruppen: RErgebnis = { typ: 'zwei-gruppen', e: { art: 'zwei-gruppen', abhaengig: 'y', gruppenSpalte: 'g', a: gruppe('ja'), b: gruppe('nein'), diff: 1, t: 2.1, df: 48, p: 0.041, diffLo: 0, diffHi: 2, tKlassisch: 2.2, dfKlassisch: 50, pKlassisch: 0.03, d: 0.6, dLo: 0, dHi: 1, spGepoolt: 1 }, werte: {} };
const anovaE: RErgebnis = { typ: 'anova', e: { art: 'anova', abhaengig: 'y', gruppenSpalte: 'h', gruppen: [{ name: 'eins', n: 3, m: 1, sd: 1 }, { name: 'zwei', n: 3, m: 2, sd: 1 }], n: 6, ssZwischen: 1, ssInnerhalb: 2, dfZwischen: 1, dfInnerhalb: 4, f: 2, p: 0.2 } };
const praePostE: RErgebnis = { typ: 'prae-post', e: { art: 'prae-post', vorher: 'x1', nachher: 'x2', n: 6, m1: 1, sd1: 1, m2: 2, sd2: 1, diff: 1, sdDiff: 1, diffLo: 0, diffHi: 2, t: 2, df: 5, p: 0.1, r: 0, dz: 1, dzLo: 0, dzHi: 2, dav: 1 } };
const zus = (o: object = {}): RErgebnis => ({ typ: 'zusammenhang', e: { art: 'zusammenhang', x: 'x1', y: 'x2', r: -0.5, p: 0.3, n: 6, kiLo: -0.9, kiHi: 0.5, ...o } });
const kreuzE: RErgebnis = { typ: 'kreuz', e: { art: 'kreuz', gezaehlt: 'h', gruppen: 'g', chi2: 1, df: 1, p: 0.3, n: 5, v: 0.4, stufen: 1, unter5: 0, zellen: 4, minErwartet: 2, je: [], zaehlung: { zeilen: ['ja', 'nein'], spalten: ['eins', 'zwei'], tab: [[2, 1], [0, 2]] } } };
const vorhersageE: RErgebnis = { typ: 'vorhersage', e: { art: 'vorhersage', ziel: 'y', r2: 0.5, r2korr: 0.4, f: 3, df1: 2, df2: 3, p: 0.1, praediktoren: [{ name: 'x1', spalte: 'x1', b: 1, beta: 0.5, p: 0.1, lo: 0, hi: 2 }, { name: 'g: nein (vs. ja)', spalte: 'g', b: 1, beta: 0.5, p: 0.1, lo: 0, hi: 2, faktor: { wert: 'nein', stufe: 'nein', referenz: 'ja' } }], faktoren: [{ spalte: 'g', referenz: 'ja', stufen: 2, werte: ['ja', 'nein'], dr2: 0.1, f: 1, df1: 1, df2: 3, p: 0.3 }] } };
const verteilungE: RErgebnis = { typ: 'verteilung', e: { art: 'verteilung', zahlen: [{ name: 'x1', n: 6, m: 3, sd: 2, min: 1, max: 6, median: 3 }], gruppen: [{ name: 'g', n: 5, fehlend: 1, werte: [{ name: 'ja', anzahl: 3, anteil: 0.6 }, { name: 'nein', anzahl: 2, anteil: 0.4 }] }] } };
const logistikE: RErgebnis = { typ: 'logistik', e: { art: 'logistik', ziel: 'g', ereignis: 'nein', referenz: 'ja', n: 5, nEreignis: 2, nReferenz: 3, minus2ll: 5, chi2: 1, df: 1, p: 0.3, coxSnell: 0.1, nagelkerke: 0.2, treffer: 0.6, praediktoren: [{ name: 'x1', spalte: 'x1', b: 1, se: 1, p: 0.3, or: 2.7, orLo: 0.3, orHi: 20 }] } };
const skalaE: RErgebnis = { typ: 'skala', e: { art: 'skala', alpha: 0.8, n: 6, fragen: [{ name: 'x1', trennschaerfe: 0.5, alphaOhne: 0.7 }, { name: 'x2', trennschaerfe: 0.5, alphaOhne: 0.7 }] } };
const kappaE = (gewicht = 'keins'): RErgebnis => ({ typ: 'kappa', e: { art: 'kappa', a: 'x1', b: 'x2', n: 6, kategorien: [1, 2, 3, 4, 5, 6], tab: [], uebereinstimmung: 0.5, kappa: 0.3, gewicht, alle: {}, gewichtbar: true, empfohlen: 'keins', quelle: 'pspp' } });

describe('R-Skript: Aufbau je Ergebnisart', () => {
  it('zwei-gruppen: Student, Welch, Levene, Cohens d, Gruppen als factor, Zahlen von Statable', () => {
    const r = baueRSkript(tGruppen, ctxD(['y', 'g'])).r;
    for (const s of ['read.csv(', "t.test(y ~ g, var.equal = TRUE)", 't.test(y ~ g)', 'anova(lm(abs(y - ave(y, g)) ~ g))', 'sd_gepoolt', 'd_cohen', "daten[['g']] <- factor(daten[['g']], levels = c('ja', 'nein'))", 't(48) = 2.1, p = 0.041', 't(50) = 2.2, p = 0.03']) expect(r, s).toContain(s);
    expect(r).toContain('# Erstellt mit Statable (statable.eu) am 14.11.2026');
  });
  it('anova: aov, summary, TukeyHSD, oneway.test, η², Gruppen mit Beschriftung', () => {
    const r = baueRSkript(anovaE, ctxD(['y', 'h'])).r;
    for (const s of ['aov(y ~ g)', 'summary(modell)', 'TukeyHSD(modell)', 'oneway.test(y ~ g)', 'eta2 <-', "levels = c(1, 2), labels = c('eins', 'zwei')"]) expect(r, s).toContain(s);
  });
  it('prae-post: gepaarter t-Test mit Hinweis auf das Vorzeichen', () => {
    const r = baueRSkript(praePostE, ctxD(['x1', 'x2'])).r;
    expect(r).toContain('t.test(vorher, nachher, paired = TRUE)'); expect(r).toContain('differenz <- nachher - vorher'); expect(r).toContain('dz <-');
  });
  it('zusammenhang: Pearson, Spearman, Kendall mit exact nach Statable', () => {
    expect(baueRSkript(zus(), ctxD(['x1', 'x2'])).r).toContain("cor.test(x, y, method = 'pearson')");
    expect(baueRSkript(zus({ methode: 'spearman', exakt: false }), ctxD(['x1', 'x2'])).r).toContain("cor.test(x, y, method = 'spearman', exact = FALSE)");
    expect(baueRSkript(zus({ methode: 'kendall', exakt: true }), ctxD(['x1', 'x2'])).r).toContain("cor.test(x, y, method = 'kendall', exact = TRUE)");
  });
  it('zusammenhang partiell: Residuen, df = n - 2 - k; Spearman über Ränge; Kendall nicht', () => {
    const r = baueRSkript(zus({ kontroll: ['x2'], methode: 'pearson', y: 'y' }), ctxD(['x1', 'y', 'x2'])).r;
    for (const s of ['resid(lm(x ~ k1, data = vars))', 'resid(lm(y ~ k1, data = vars))', 'df_partiell <- nrow(vars) - 2 - 1', 'p_partiell']) expect(r, s).toContain(s);
    expect(baueRSkript(zus({ kontroll: ['x2'], methode: 'spearman', y: 'y' }), ctxD(['x1', 'y', 'x2'])).r).toContain('lapply(vars, rank)');
    expect(rSkriptMoeglich(zus({ kontroll: ['x2'], methode: 'kendall', y: 'y' }), ctxD(['x1', 'y', 'x2']))).toBe(false);
  });
  it('kreuz: table, chisq.test ohne Korrektur, Cramérs V; Fisher nur wenn Statable ihn zeigt', () => {
    const r = baueRSkript(kreuzE, ctxD(['h', 'g'])).r;
    for (const s of ['table(zeile, spalte)', 'chisq.test(tab, correct = FALSE)', 'v_cramer']) expect(r, s).toContain(s);
    expect(r).not.toContain('fisher.test');
    const k = kreuzE.e as { fisherP?: number };
    expect(baueRSkript({ typ: 'kreuz', e: { ...k, fisherP: 0.4 } }, ctxD(['h', 'g'])).r).toContain('fisher.test(tab)');
  });
  it('vorhersage: lm, summary, confint, Beta; Gruppen-Spalte als factor mit der ersten Gruppe als Bezug', () => {
    const r = baueRSkript(vorhersageE, ctxD(['y', 'x1', 'g'])).r;
    for (const s of ['lm(y ~ x1 + x2, data = d)', 'summary(modell)', 'confint(modell)', 'scale(', "daten[['g']] <- factor(daten[['g']], levels = c('ja', 'nein'))", '# x2 = g (Gruppen, Vergleichsgruppe: ja)']) expect(r, s).toContain(s);
  });
  it('verteilung: Kennzahlen mit quantile type 6, Häufigkeiten mit table', () => {
    const r = baueRSkript(verteilungE, ctxD(['x1', 'g'])).r;
    for (const s of ['quantile(x, c(0.25, 0.5, 0.75), type = 6', "list('x1' = daten[['x1']])", "table(factor(daten[['g']], levels = c('ja', 'nein')))"]) expect(r, s).toContain(s);
  });
  it('logistik: glm binomial, Odds Ratio, Wald-Intervall, Nagelkerke; Ereignis als zweite Stufe', () => {
    const r = baueRSkript(logistikE, ctxD(['g', 'x1'])).r;
    for (const s of ['glm(y ~ x1, family = binomial, data = d)', 'exp(coef(modell))', 'exp(confint.default(modell))', 'nagelkerke <-', "levels = c('ja', 'nein')"]) expect(r, s).toContain(s);
  });
  it('skala: Alpha von Hand mit na.omit (listenweise)', () => {
    const r = baueRSkript(skalaE, ctxD(['x1', 'x2'])).r;
    for (const s of ["na.omit(daten[c('x1', 'x2')])", 'ncol(x) / (ncol(x) - 1) * (1 - sum(apply(x, 2, var)) / var(rowSums(x)))', 'alpha_ohne']) expect(r, s).toContain(s);
  });
  it('kappa: ungewichtet, linear, quadratisch', () => {
    expect(baueRSkript(kappaE(), ctxD(['x1', 'x2'])).r).toContain('gewicht <- diag(k)');
    expect(baueRSkript(kappaE('linear'), ctxD(['x1', 'x2'])).r).toContain('abs(i - j) / (k - 1)');
    expect(baueRSkript(kappaE('quadratisch'), ctxD(['x1', 'x2'])).r).toContain('((i - j) / (k - 1))^2');
  });
  it('nur die zehn Arten; Fallgewicht und fehlende Spalten sperren', () => {
    expect(rSkriptMoeglich({ typ: 'faktor', e: {} }, ctxD(['x1']))).toBe(false);
    expect(rSkriptMoeglich(null, ctxD([]))).toBe(false);
    expect(rSkriptMoeglich(tGruppen, ctxD(['y', 'g'], { gewicht: true }))).toBe(false);
    expect(rSkriptMoeglich(tGruppen, ctxD(['y', 'g']))).toBe(true);
    expect(rSkriptMoeglich(tGruppen, kontext([sp('y')], [[1]], ['y']))).toBe(false);   // Gruppen-Spalte fehlt
    expect(() => baueRSkript({ typ: 'faktor', e: {} }, ctxD([]))).toThrow();
  });
});

describe('R-Skript: Daten (CSV)', () => {
  it('nur die benutzten Spalten, Fehlend-Code und Lücken leer, Punkt als Dezimalzeichen', () => {
    const c = baueRSkript(tGruppen, ctxD(['y', 'g'])).csv;
    expect(c.split('\n')).toEqual(['y,g', '1,ja', '2,nein', ',ja', '4,nein', ',ja', '6,', '']);
    expect(c).not.toContain('geheim'); expect(c).not.toContain('x1');
  });
  it('Zahlen mit Punkt, Datum als ISO, Anführungszeichen und Kommas im Text quotiert', () => {
    const s = [sp('d', 'datum'), sp('t', 'text'), sp('z')], k = kontext(s, [['02.09.2026', 'a, "b"', 1.25], ['03.09.2026 10:11:12', ' x ', -3]], ['z']);
    expect(datenCsv(k, s).split('\n')).toEqual(['d,t,z', '2026-09-02,"a, ""b""",1.25', '2026-09-03 10:11:12," x ",-3', '']);
  });
  it('Fehlend-Bereich als leere Zelle', () => {
    const s = [sp('z', 'zahl', { fehlend: [], fehlendBereich: { von: 90, bis: 99 } })], k = kontext(s, [[5], [90], [95], [99], [100]], ['z']);
    expect(datenCsv(k, s)).toBe('z\n5\n\n\n\n100\n');
  });
  it('Filter: nur die ausgewählten Zeilen', () => {
    const c = baueRSkript(tGruppen, ctxD(['y', 'g'], { zeilenAuswahl: [0, 1, 3] })).csv;
    expect(c).toBe('y,g\n1,ja\n2,nein\n4,nein\n');
  });
  it('ZIP mit genau zwei Dateien, ASCII-Namen', () => {
    const res = baueRSkript(tGruppen, ctxD(['y', 'g'], { titel: 'Größe: Äpfel / Birnen' })), z = unzipSync(rSkriptZip(res));
    expect(Object.keys(z).sort()).toEqual(['Grosse_Apfel_Birnen-daten.csv', 'Grosse_Apfel_Birnen.R']);
    expect(strFromU8(z['Grosse_Apfel_Birnen.R']!)).toContain("read.csv('Grosse_Apfel_Birnen-daten.csv'");
    expect(rDateiBasis('日本語')).toBe('statable');
  });
  it('Text-Spalten werden als Text gelesen (T und F bleiben Buchstaben)', () => {
    expect(baueRSkript(tGruppen, ctxD(['y', 'g'])).r).toContain(`colClasses = c('g' = "character")`);
  });
});

describe('R-Skript: Sicherheit (bösartige Namen, Beschriftungen, Titel)', () => {
  const NAME = 'a`); system("x")#', LABEL = `'); unlink("~", recursive=TRUE); ('`, TITEL = 'Titel\nsystem("y")\r\nunlink("~")\u2028shell("z")';
  const bose = (): { erg: RErgebnis; ctx: RKontext } => {
    const s = [sp(NAME), sp('g\n";system("g")', 'text', { werteLabels: { w: LABEL, m: 'männ' } })];
    const ctx = kontext(s, [[1, 'w'], [2, 'm'], [3, 'w'], [4, 'm']], [NAME, s[1]!.name], { titel: TITEL });
    const e = { ...(tGruppen.e as object), abhaengig: NAME, gruppenSpalte: s[1]!.name, a: gruppe(LABEL), b: gruppe('männ') };
    return { erg: { typ: 'zwei-gruppen', e, werte: {} }, ctx };
  };
  it('kein Zeilenumbruch bricht aus einem Kommentar oder Text aus', () => {
    const { erg, ctx } = bose(), r = baueRSkript(erg, ctx).r;
    for (const z of r.split('\n')) expect(/^(system|unlink|shell)\(/.test(z.trim()), z).toBe(false);
    expect(r.split('\n').filter(z => /system\(|unlink\(|shell\(/.test(z)).every(z => z.startsWith('#') || /'/.test(z) || /`/.test(z))).toBe(true);
    expect(kom('a\nb\r\nc\u2028d\u0085e')).toBe('a b c d e');
  });
  const rscript = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
  it.skipIf(!existsSync(rscript))('parst in echtem R, ohne Aufruf von system, unlink oder shell', () => {
    const { erg, ctx } = bose(), r = baueRSkript(erg, ctx).r, ordner = mkdtempSync(join(tmpdir(), 'rsicher-'));
    try {
      const datei = join(ordner, 'x.R');
      writeFileSync(datei, r, 'utf8');
      const l = spawnSync(rscript, ['-e', `x <- parse('x.R', encoding = 'UTF-8'); cat('AUFRUFE:', intersect(all.names(x), c('system', 'unlink', 'shell', 'system2', 'shell.exec')), '\\n'); cat('AUSDRUECKE:', length(x), '\\n')`], { cwd: ordner, encoding: 'utf8' });
      expect(l.status, l.stderr).toBe(0);
      expect(l.stdout).toMatch(/AUFRUFE: *\r?\n/);   // nichts gefunden
      expect(Number(/AUSDRUECKE: (\d+)/.exec(l.stdout)![1])).toBeGreaterThan(10);
    } finally { rmSync(ordner, { recursive: true, force: true }); }
  });
});

describe('R-Skript Teil 2b: ICC, Messwiederholung (mit Friedman), Testhalbierung', () => {
  const m = (icc: number) => ({ icc, kiLo: icc - 0.1, kiHi: icc + 0.1 });
  const iccE = (spaltenNamen: string[], extra: object = {}): RErgebnis => ({ typ: 'icc', e: { art: 'icc', spalten: spaltenNamen, modell: 'absolut', gesamt: 6, mittelwerte: [1, 2], icc: { n: 6, k: spaltenNamen.length, msz: 2, msb: 1, mse: 0.5, f: 4, df1: 5, df2: 5, p: 0.07, absolut: { einzel: m(0.5), mittel: m(0.7) }, konsistenz: { einzel: m(0.6), mittel: m(0.8) } }, ...extra } });
  const mwE = (zeitpunkte: string[], extra: object = {}, rang?: object): RErgebnis => ({
    typ: 'messwiederholung', ...(rang ? { rang } : {}),
    e: { art: 'messwiederholung', zeitpunkte, gruppen: [], n: 6, gesamt: 6, randmittel: [1, 2], zellen: [], sphaer: { w: 0.8, chi2: 1, df: 2, p: 0.5, gg: 0.9, hf: 1 }, korrektur: 'gg',
      zeit: { quelle: 'zeit', ss: 4, df: 2, ssFehler: 2, dfFehler: 10, msFehler: 0.2, f: 10, p: 0.004, pGG: 0.006, pHF: 0.004, etaP: 0.7, etaPLo: 0.2, etaPHi: 0.8, etaG: 0.5, etaGLo: 0.1, etaGHi: 0.7 },
      ssPersonen: 3, dfPersonen: 5, paare: [{ i: 0, j: 1, diff: 1, se: 0.5, df: 5, t: 2, p: 0.1, pAnp: 0.3, kiLo: 0, kiHi: 2, dz: 0.8 }], ...extra }
  });
  const friedmanE = (k: number) => ({ art: 'friedman', n: 6, k, kein: false, chi2: 6, df: k - 1, p: 0.05, kendallW: 0.5, rangsummen: [], mittlereRaenge: [], mediane: [], zeitpunkte: [], vorschlag: {}, paare: [{ i: 0, j: 1, von: 'x1', nach: 'x2', vPlus: 5, vMinus: 1, nTest: 6, nNull: 0, p: 0.1, pHolm: 0.3 }] });

  it('icc: Matrix mit na.omit, beide Modelle, zwei Spalten zusätzlich r_tt und Bland-Altman', () => {
    const r2 = baueRSkript(iccE(['x1', 'x2'], { rtt: 0.5, ba: { bias: 0.4, untere: { wert: -1 }, obere: { wert: 1 } } }), ctxD(['x1', 'x2'])).r;
    for (const s of ['as.matrix(na.omit(daten[c(', "row.names = c('ICC(2,1)', 'ICC(2,k)', 'ICC(3,1)', 'ICC(3,k)')", 'ms_faelle', 'f_icc', 'p_icc', 'r_tt <- cor(', 'ba_mittel', 'ba_lo', 'ba_hi', 'ICC(2,1) = 0.5 [0.4; 0.6]', 'Bland-Altman']) expect(r2, s).toContain(s);
    const r3 = baueRSkript(iccE(['x1', 'x2', 'y']), ctxD(['x1', 'x2', 'y'])).r;
    expect(r3).not.toContain('r_tt'); expect(r3).not.toContain('ba_mittel'); expect(r3).toContain('qf(0.975');
  });
  it('icc: nicht möglich bei fehlender, doppelter oder Text-Spalte', () => {
    expect(rSkriptMoeglich(iccE(['x1', 'gibtsnicht']), ctxD([]))).toBe(false);
    expect(rSkriptMoeglich(iccE(['x1', 'x1']), ctxD([]))).toBe(false);
    expect(rSkriptMoeglich(iccE(['x1', 'g']), ctxD([]))).toBe(false);
    expect(rSkriptMoeglich(iccE(['x1', 'x2']), ctxD([]))).toBe(true);
  });
  it('messwiederholung ohne Gruppe: Quadratsummen, ε, Mauchly, Paare mit Bonferroni; ohne Friedman kein Rangtest', () => {
    const r = baueRSkript(mwE(['x1', 'x2', 'y']), ctxD(['x1', 'x2', 'y'])).r;
    for (const s of ['breit <- as.matrix(na.omit(', 'ss_zeit', 'ss_fehler', 'eps_gg', 'eps_hf', 'mauchly.test(lm(breit ~ 1), X = ~1)', 'p.adjust(paare$p, "bonferroni")', 'p_gg', 'p_hf', 'eta2p', 'F(2, 10) = 10']) expect(r, s).toContain(s);
    expect(r).not.toContain('friedman.test');
  });
  it('messwiederholung mit fehlenden Spalten und Faktor ohne Ergebnis: kein Eintrag', () => {
    expect(rSkriptMoeglich(mwE(['x1', 'nix']), ctxD([]))).toBe(false);
    expect(rSkriptMoeglich({ typ: 'faktor', e: {} }, ctxD([]))).toBe(false);
    expect(rSkriptMoeglich(mwE(['x1', 'x2', 'y']), ctxD([]))).toBe(true);
  });
  it('messwiederholung mit Friedman: friedman.test, Kendalls W, Paare mit exakter p-Funktion und Holm; bei zwei Zeitpunkten kein Friedman', () => {
    const r = baueRSkript(mwE(['x1', 'x2', 'y'], {}, friedmanE(3)), ctxD(['x1', 'x2', 'y'])).r;
    for (const s of ['friedman.test(breit_r)', 'kendall_w', 'p_bedingt <- function', 'wilc <- function', 'p.adjust(rang_paare$p[mit_p], "holm")', 'Friedman: chi²(2) = 6, p = 0.05']) expect(r, s).toContain(s);
    expect(baueRSkript(mwE(['x1', 'x2'], {}, friedmanE(2)), ctxD(['x1', 'x2'])).r).not.toContain('friedman.test');
  });
  it('skala mit Testhalbierung: Hälften, Spearman-Brown beide, Guttman; ohne splitHalf nichts davon', () => {
    const sh = { art: 'splithalf', n: 6, k1: 1, k2: 1, r: 0.8, sbGleich: 0.89, sbUngleich: 0.89, guttman: 0.88, alpha1: 0.7, alpha2: 0.6 };
    const e = { ...(skalaE.e as object), splitHalf: sh };
    const r = baueRSkript({ typ: 'skala', e }, ctxD(['x1', 'x2'])).r;
    for (const s of ['k1 <- 1', 'haelfte1 <- rowSums(items[seq_len(k1)])', 'sb_gleich <-', 'sb_ungleich <-', 'guttman <-', 'alpha_h1', 'alpha_h2', 'Spearman-Brown gleich = 0.89']) expect(r, s).toContain(s);
    expect(baueRSkript(skalaE, ctxD(['x1', 'x2'])).r).not.toContain('haelfte1');
    expect(baueRSkript({ typ: 'skala', e: { ...e, splitHalf: { ...sh, k1: 2 } } }, ctxD(['x1', 'x2'])).r).not.toContain('haelfte1');   // Teilung außerhalb: kein Teil
  });
  it('Sicherheit: bösartige Namen bei icc, Messwiederholung, Friedman und Testhalbierung parsen in R ohne system, unlink, shell', () => {
    const NAME = 'a`); system("x")#', N2 = 'b\n"); unlink("~")', N3 = `c'); shell("z"); ('`;
    const s = [sp(NAME), sp(N2), sp(N3)];
    const ctx = kontext(s, [[1, 2, 3], [2, 4, 5], [3, 5, 9], [4, 7, 8]], [NAME, N2, N3], { titel: 'T\nsystem("y")' });
    const sh = { art: 'splithalf', n: 4, k1: 2, k2: 1, r: 0.8, sbGleich: 0.9, sbUngleich: 0.9, guttman: 0.9, alpha1: 0.7, alpha2: 0.6 };
    const fa: RErgebnis[] = [iccE([NAME, N2, N3]), mwE([NAME, N2, N3], {}, friedmanE(3)), { typ: 'skala', e: { ...(skalaE.e as object), fragen: [NAME, N2, N3].map(n => ({ name: n, trennschaerfe: 0.5, alphaOhne: 0.5 })), splitHalf: sh } }];
    const rscript = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
    for (const erg of fa) {
      const r = baueRSkript(erg, ctx).r;
      for (const z of r.split('\n')) expect(/^(system|unlink|shell)\(/.test(z.trim()), z).toBe(false);
      if (!existsSync(rscript)) continue;
      const ordner = mkdtempSync(join(tmpdir(), 'rsicher2b-'));
      try {
        writeFileSync(join(ordner, 'x.R'), r, 'utf8');
        const l = spawnSync(rscript, ['-e', `x <- parse('x.R', encoding = 'UTF-8'); cat('AUFRUFE:', intersect(all.names(x), c('system', 'unlink', 'shell', 'system2', 'shell.exec')), '\\n'); cat('AUSDRUECKE:', length(x), '\\n')`], { cwd: ordner, encoding: 'utf8' });
        expect(l.status, l.stderr).toBe(0);
        expect(l.stdout).toMatch(/AUFRUFE: *\r?\n/);
        expect(Number(/AUSDRUECKE: (\d+)/.exec(l.stdout)![1])).toBeGreaterThan(10);
      } finally { rmSync(ordner, { recursive: true, force: true }); }
    }
  });
});

describe('R-Skript Teil 2c: gemischte Messwiederholung, Faktorenanalyse', () => {
  const ef = (quelle: string) => ({ quelle, ss: 4, df: 2, ssFehler: 2, dfFehler: 10, msFehler: 0.2, f: 10, p: 0.004, pGG: 0.006, pHF: 0.004, etaP: 0.7, etaPLo: 0.2, etaPHi: 0.8, etaG: 0.5, etaGLo: 0.1, etaGHi: 0.7 });
  const gemE = (zeitpunkte: string[], gruppenSpalte: string, extra: object = {}): RErgebnis => ({ typ: 'messwiederholung', e: {
    art: 'messwiederholung', zeitpunkte, gruppenSpalte, gruppen: [{ name: 'a', n: 3 }, { name: 'b', n: 3 }], n: 6, gesamt: 6, randmittel: [1, 2], zellen: [], sphaer: { w: 0.8, chi2: 1, df: 2, p: 0.5, gg: 0.9, hf: 1 }, korrektur: 'gg',
    zeit: ef('zeit'), gruppe: ef('gruppe'), wechsel: ef('wechsel'), ssPersonen: 3, dfPersonen: 4, paare: [{ i: 0, j: 1, diff: 1, se: 0.5, df: 4, t: 2, p: 0.1, pAnp: 0.3, kiLo: 0, kiHi: 2, dz: 0.8 }], ...extra } });
  const faE = (methode: 'pc' | 'paf', m = 2, extra: object = {}): RErgebnis => ({ typ: 'faktor', e: { art: 'faktor', methode, faktoren: Array.from({ length: m }, (_, i) => ({ nr: i + 1, fragen: [{ name: 'x1', ladung: 0.7 }] })), erklaert: 0.5, doppelt: [], ohne: [], n: 6, fragen: 3, eigen: [1.8, 1.1, 0.1], kmo: { kmo: 0.6, chi2: 5, df: 3, p: 0.2 }, ...extra } });

  it('gemischt: Typ III von Hand, Gruppe als factor, GG/HF für Zeit und Wechselwirkung, Mauchly mit Gruppe, Paare mit gepoolter Streuung', () => {
    const r = baueRSkript(gemE(['x1', 'x2', 'y'], 'g'), ctxD(['x1', 'x2', 'y', 'g'])).r;
    for (const s of ["gruppe <- factor(roh[['g']])", 'n_harm <- g / sum(1 / ng)', 'ss_zeit <- g * n_harm', 'ss_gruppe', 'ss_wechsel', 'p_zeit_gg', 'p_wechsel_hf', 'mauchly.test(lm(breit ~ gruppe), X = ~1)', 'paare$p_bonf', 'Zeit × Gruppe: F(2, 10) = 10']) expect(r, s).toContain(s);
    expect(r).not.toContain('aov(');
  });
  it('gemischt: kein Eintrag, wenn die Gruppenspalte fehlt oder auch Zeitpunkt ist', () => {
    expect(rSkriptMoeglich(gemE(['x1', 'x2'], 'nix'), ctxD([]))).toBe(false);
    expect(rSkriptMoeglich(gemE(['x1', 'x2'], 'x1'), ctxD([]))).toBe(false);
    expect(rSkriptMoeglich(gemE(['x1', 'x2'], 'g'), ctxD([]))).toBe(true);
  });
  it('faktor: Hauptkomponenten + Varimax bzw. Hauptachsen + Promax wie PSPP, KMO, Bartlett, Zahl der Faktoren aus dem Ergebnis', () => {
    const pc = baueRSkript(faE('pc'), ctxD(['x1', 'x2', 'y'])).r;
    for (const s of ['m <- 2', 'varimax(ladung, normalize = TRUE', 'kmo <-', 'bartlett_chi2', 'eigenwerte <-', 'KMO = 0.6']) expect(pc, s).toContain(s);
    expect(pc).not.toContain('ziel <-');
    const paf = baueRSkript(faE('paf'), ctxD(['x1', 'x2', 'y'])).r;
    for (const s of ['kommunalitaet <- 1 - 1 / diag(ri)', 'for (schritt in 1:25)', 'ziel <- normiert * abs(normiert)^3', 'faktor_korrelation']) expect(paf, s).toContain(s);
    expect(paf).not.toContain('promax(');
  });
  it('faktor: kein Eintrag bei Text-Spalte, ausgelassenen Fragen, zu vielen Faktoren oder unter drei Fragen', () => {
    expect(rSkriptMoeglich(faE('pc'), ctxD(['x1', 'x2', 'g']))).toBe(false);
    expect(rSkriptMoeglich(faE('pc', 2, { ausgelassen: ['y'] }), ctxD(['x1', 'x2', 'y']))).toBe(false);
    expect(rSkriptMoeglich(faE('pc', 3), ctxD(['x1', 'x2', 'y']))).toBe(false);
    expect(rSkriptMoeglich(faE('pc', 1), ctxD(['x1', 'x2']))).toBe(false);
    expect(rSkriptMoeglich(faE('pc'), ctxD(['x1', 'x2', 'y'], { gewicht: true }))).toBe(false);
    expect(rSkriptMoeglich(faE('pc', 1), ctxD(['x1', 'x2', 'y']))).toBe(true);
  });
  it('Sicherheit: bösartige Namen bei gemischter Messwiederholung und Faktorenanalyse parsen in R ohne system, unlink, shell', () => {
    const NAME = 'a`); system("x")#', N2 = 'b\n"); unlink("~")', N3 = `c'); shell("z"); ('`, NG = 'g"]]); system2("q"); x[["';
    const s = [sp(NAME), sp(N2), sp(N3), sp(NG, 'text')];
    const ctx = kontext(s, [[1, 2, 3, 'u'], [2, 4, 5, 'u'], [3, 5, 9, 'v'], [4, 7, 8, 'v']], [NAME, N2, N3, NG], { titel: 'T\nsystem("y")' });
    const ctxF = kontext(s, [[1, 2, 3, 'u'], [2, 4, 5, 'u'], [3, 5, 9, 'v'], [4, 7, 8, 'v']], [NAME, N2, N3], { titel: 'T\nsystem("y")' });
    const faelle: [RErgebnis, RKontext][] = [[gemE([NAME, N2, N3], NG), ctx], [faE('paf', 2, { faktoren: [{ nr: 1, fragen: [{ name: NAME, ladung: 0.7 }] }, { nr: 2, fragen: [{ name: N3, ladung: 0.6 }] }] }), ctxF]];
    const rscript = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
    for (const [erg, c] of faelle) {
      expect(rSkriptMoeglich(erg, c)).toBe(true);
      const r = baueRSkript(erg, c).r;
      for (const z of r.split('\n')) expect(/^(system|system2|unlink|shell)\(/.test(z.trim()), z).toBe(false);
      if (!existsSync(rscript)) continue;
      const ordner = mkdtempSync(join(tmpdir(), 'rsicher2c-'));
      try {
        writeFileSync(join(ordner, 'x.R'), r, 'utf8');
        const l = spawnSync(rscript, ['-e', `x <- parse('x.R', encoding = 'UTF-8'); cat('AUFRUFE:', intersect(all.names(x), c('system', 'unlink', 'shell', 'system2', 'shell.exec')), '\\n'); cat('AUSDRUECKE:', length(x), '\\n')`], { cwd: ordner, encoding: 'utf8' });
        expect(l.status, l.stderr).toBe(0);
        expect(l.stdout).toMatch(/AUFRUFE: *\r?\n/);
        expect(Number(/AUSDRUECKE: (\d+)/.exec(l.stdout)![1])).toBeGreaterThan(10);
      } finally { rmSync(ordner, { recursive: true, force: true }); }
    }
  });
});
