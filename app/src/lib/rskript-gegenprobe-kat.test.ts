/**
 * B1 Teil 2d, Gegenprobe: Das R-Skript zu den drei Regressionen, die Statable in webR rechnet (ordinal, multinomial, Zähldaten), läuft in ECHTEM R 4.6.1
 * (Rscript, nur wenn es da ist, sonst übersprungen). Seine Zahlen werden mit den Sollwerten aus `testdaten/welle3-erwartet.json` verglichen
 * (scripts/welle3-erwartet.R, Venables & Ripley 2002) - denselben Sollwerten, gegen die engine/welle3.webr.test.ts und engine/kategreg.webr.test.ts Statable prüfen.
 * Nichts ist hier von Hand eingetragen. Das `e`, aus dem das Skript entsteht, hat den Aufbau, den Statable hält (Prädiktoren und Stufen aus `katDaten`).
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import ERW from './testdaten/welle3-erwartet.json';
import { katDaten, type KatArt, type KatBasis } from './kategreg';
import { baueRSkript, rSkriptMoeglich, type RKontext, type RSpalte } from './rskript';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);

type Z = Record<string, any>;
type DS = { n: number; spalten: Record<string, { typ: 'zahl' | 'gruppe'; werte: (number | null)[]; labels?: string[] }> };
const E = ERW as unknown as { datensaetze: Record<string, DS>; ordinal: Z[]; multinomial: Z[]; zaehldaten: Z[] };

/** Datensatz als Statable-Sitzung: Gruppen als Zahlen 1 … k mit Wertebeschriftungen (wie engine/kategreg.webr.test.ts). */
function sitzung(ds: string, ordinal: string[] = []): { spalten: Spalte[]; zeilen: Wert[][] } {
  const D = E.datensaetze[ds]!, namen = Object.keys(D.spalten);
  const spalten: Spalte[] = namen.map(name => {
    const s = D.spalten[name]!;
    return { name, bezeichnung: name, art: 'zahl', niveau: ordinal.includes(name) ? 'ordinal' : s.typ === 'gruppe' ? 'nominal' : 'metrisch', format: '', fehlend: [], fehlendText: '',
      werteLabels: s.typ === 'gruppe' ? Object.fromEntries(s.labels!.map((l, i) => [String(i + 1), l])) : {} } as Spalte;
  });
  const zeilen: Wert[][] = Array.from({ length: D.n }, (_, i) => namen.map((n): Wert => D.spalten[n]!.werte[i] ?? null));
  return { spalten, zeilen };
}
const ctxVon = (s: { spalten: Spalte[]; zeilen: Wert[][] }, blatt: string[]): RKontext => ({ spalten: s.spalten as RSpalte[], zeilen: s.zeilen as (string | number | null)[][], blattSpalten: blatt, titel: 'Gegenprobe Teil 2d', datum: '14.11.2026' });

/** Das Ergebnis, wie Statable es hält: Aufbau aus katDaten, Zahlen nur für die Kommentarzeilen. */
function ergebnis(art: KatArt, s: { spalten: Spalte[]; zeilen: Wert[][] }, ziel: string, praed: string[], mehr: Z = {}): { typ: string; e: KatBasis & Z } {
  const dt = katDaten(art, ziel, praed, s.zeilen, s.spalten, { zeit: mehr.offsetSpalte });
  const basis: KatBasis = { ziel, praed: dt.praed, n: 0, ausgelassen: 0, koef: [], lr: [], modelltest: { chi2: NaN, df: 0, p: NaN }, loglik: NaN, loglik0: NaN, warnungen: [] };
  return { typ: art, e: { ...basis, art, nagelkerke: NaN, coxSnell: NaN, schwellen: [], theta: null, ...mehr } };
}

const tmp = mitR ? mkdtempSync(join(tmpdir(), 'rskript-kat-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });
const abweichung: Record<string, number> = {};
let fall = '';

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
/** Relativ zu max(1e-3, |soll|) wie engine/kategreg.webr.test.ts. */
function nah(ist: number | undefined, soll: number, was: string, tol = 1e-6) {
  expect(ist, `${was}: kein Wert aus R`).toBeDefined();
  const d = Math.abs(ist! - soll) / Math.max(1e-3, Math.abs(soll));
  abweichung[fall] = Math.max(abweichung[fall] ?? 0, d);
  expect(d, `${was}: R-Skript ${ist} gegen Soll ${soll}`).toBeLessThan(tol);
}
const reihe = (ist: number[] | undefined, soll: number[], was: string, tol = 1e-6) => {
  expect(ist?.length, `${was}: Anzahl`).toBe(soll.length);
  soll.forEach((v, i) => nah(ist![i], v, `${was}[${i}]`, tol));
};

const AUS_KAT = `.a("b", koef$b); .a("se", koef$se); .a("p", koef$p); .a("mt", modelltest[["chi2"]]); .a("lr", lr[, "chi2"]); .a("n", n_faelle)`;

describe.skipIf(!mitR)('R-Skript Teil 2d gegen die Sollwerte aus R (welle3-erwartet.json)', () => {
  afterAll(() => { console.log('Größte Abweichung R-Skript gegen Soll je Fall:', JSON.stringify(abweichung)); });

  for (const name of ['a_housing', 'b_eigen_brant_signifikant', 'c_leere_stufe']) {
    it(`ordinal ${name}: B, SE, p, Schwellen, Modelltest, Nagelkerke, LR je Prädiktor`, () => {
      fall = `ordreg ${name}`;
      const f = E.ordinal.find(x => x.name === name)!;
      const s = sitzung(f.datensatz, [f.ziel]), praed = f.praediktoren.map((p: Z) => p.name);
      const erg = ergebnis('ordreg', s, f.ziel, praed, { stufen: f.ziel_stufen });
      const r = inR(erg, ctxVon(s, [f.ziel, ...praed]), `${AUS_KAT}; .a("th", schwellen$theta); .a("thse", schwellen$se); .a("nk", nagelkerke)`);
      expect(r.n![0]).toBe(f.n_gueltig);
      reihe(r.b, f.koeffizienten.map((k: Z) => k.b), 'B', 1e-5);
      reihe(r.se, f.koeffizienten.map((k: Z) => k.se), 'SE', 1e-5);
      reihe(r.p, f.koeffizienten.map((k: Z) => k.p), 'p', 1e-4);
      reihe(r.th, f.schwellen.map((k: Z) => k.theta), 'Schwelle', 1e-5);
      reihe(r.thse, f.schwellen.map((k: Z) => k.se), 'SE Schwelle', 1e-5);
      nah(r.mt![0], f.modelltest.chi2, 'Modelltest χ²');
      nah(r.nk![0], f.pseudo_r2.nagelkerke, 'Nagelkerke');
      reihe(r.lr, f.lr_je_praediktor.map((k: Z) => k.chi2), 'LR je Prädiktor', 1e-5);
    });
  }

  for (const name of ['a_housing_referenz_erste', 'b_housing_referenz_letzte', 'c_eigen']) {
    it(`multinomial ${name}: B, SE je Kategorie, Modelltest, Nagelkerke, LR je Prädiktor`, () => {
      fall = `multreg ${name}`;
      const f = E.multinomial.find(x => x.name === name)!;
      const s = sitzung(f.datensatz), praed = f.praediktoren.map((p: Z) => p.name);
      const kat = Object.keys(f.kategorien);
      const erg = ergebnis('multreg', s, f.ziel, praed, { referenz: f.referenz, kategorien: kat });
      const r = inR(erg, ctxVon(s, [f.ziel, ...praed]), `${AUS_KAT}; .a("nk", nagelkerke)`);
      expect(r.n![0]).toBe(f.n_gueltig);
      const alle = kat.flatMap(k => f.kategorien[k] as Z[]);
      reihe(r.b, alle.map(k => k.b), 'B', 1e-4);
      reihe(r.se, alle.map(k => k.se), 'SE', 1e-4);
      nah(r.mt![0], f.modelltest.chi2, 'Modelltest χ²', 1e-6);
      nah(r.nk![0], f.pseudo_r2.nagelkerke, 'Nagelkerke', 1e-6);
      reihe(r.lr, f.lr_je_praediktor.map((k: Z) => k.chi2_geklemmt ?? k.chi2), 'LR je Prädiktor', 1e-5);
    });
  }

  for (const name of ['a_quine', 'b_offset', 'c_ohne_ueberdispersion', 'd_viele_nullen', 'e_glmnb_versagt']) {
    it(`Zähldaten ${name}: Modell wie Statable, B, SE, θ, Modelltest, LR je Prädiktor, Überdispersion`, () => {
      fall = `zaehlreg ${name}`;
      const f = E.zaehldaten.find(x => x.name === name)!;
      const s = sitzung(f.datensatz), praed = f.praediktoren.map((p: Z) => p.name);
      const modell = f.automatisch_profil.modell as 'poisson' | 'negbin', soll = modell === 'negbin' ? f.negbin_profil : f.poisson;
      const erg = ergebnis('zaehlreg', s, f.ziel, praed, { modell, grund: f.automatisch_profil.grund, offset: f.offset ? 'zeit' : null, ...(f.offset ? { offsetSpalte: f.offset } : {}) });
      const r = inR(erg, ctxVon(s, [f.ziel, ...praed]), `${AUS_KAT}; .a("pdf", pearson_df); .a("lru", lr_ueber)${modell === 'negbin' ? '; .a("theta", theta); .a("thse", theta_se)' : ''}`);
      expect(r.n![0]).toBe(f.n_gueltig);
      reihe(r.b, soll.koeffizienten.map((k: Z) => k.b), 'B', 1e-5);
      reihe(r.se, soll.koeffizienten.map((k: Z) => k.se), 'SE', 1e-5);
      nah(r.mt![0], soll.modelltest.chi2, 'Modelltest χ²', 1e-5);
      reihe(r.lr, soll.lr_je_praediktor.map((k: Z) => k.chi2_geklemmt ?? k.chi2), 'LR je Prädiktor', 1e-5);
      nah(r.pdf![0], f.poisson.pearson_chi2_df, 'Pearson χ²/df');
      nah(r.lru![0], f.negbin_profil.lr_ueber.chi2 ?? f.ueberdispersion_ml.lr, 'LR Überdispersion', 1e-5);
      if (modell === 'negbin') { nah(r.theta![0], soll.theta, 'θ', 1e-5); nah(r.thse![0], soll.theta_se, 'SE θ', 1e-4); }
    });
  }

  it('kein Skript: Fallgewicht, fehlende Spalte, Offset ohne Spaltennamen (alte Projektdatei)', () => {
    const s = sitzung('zaehl_offset'), ctx = ctxVon(s, ['y', 'x', 'g']);
    const ok = ergebnis('zaehlreg', s, 'y', ['x', 'g'], { modell: 'poisson', offset: null });
    expect(rSkriptMoeglich(ok, ctx)).toBe(true);
    expect(rSkriptMoeglich(ok, { ...ctx, gewicht: true })).toBe(false);
    expect(rSkriptMoeglich({ typ: 'zaehlreg', e: { ...ok.e, ziel: 'gibt-es-nicht' } }, ctx)).toBe(false);
    expect(rSkriptMoeglich(ergebnis('zaehlreg', s, 'y', ['x', 'g'], { modell: 'poisson', offset: 'zeit' }), ctx)).toBe(false);
  });

  it('Sicherheit: böse Namen und Stufen landen nur als Text, das Skript parst und ruft nichts Gefährliches', () => {
    const s = sitzung('multi_eigen');
    const bose = 'v"); system("calc"); #\n';
    s.spalten[0]!.name = bose; s.spalten[0]!.werteLabels = { 1: 'Bus\n system("x")', 2: "Rad'); unlink('.')", 3: 'Zug' };
    s.spalten[2]!.werteLabels = { 1: 'Land`', 2: 'Stadt\u2028q()', 3: 'Vorort' };
    const erg = ergebnis('multreg', s, bose, ['alter', 'w'], { referenz: 'Bus\n system("x")', kategorien: ["Rad'); unlink('.')", 'Zug'] });
    const ctx = ctxVon(s, [bose, 'alter', 'w']);
    const sk = baueRSkript(erg, ctx);
    const ordner = mkdtempSync(join(tmp, 'p-'));
    writeFileSync(join(ordner, 's.R'), sk.r, 'utf8');
    const l = spawnSync(RSCRIPT, ['-e', 'p <- getParseData(parse("s.R", encoding = "UTF-8", keep.source = TRUE)); f <- unique(p$text[p$token == "SYMBOL_FUNCTION_CALL"]); cat("@@", paste(sort(f), collapse = " "))'], { cwd: ordner, encoding: 'utf8' });
    expect(l.status, l.stderr).toBe(0);
    const aufrufe = (/@@ (.*)/.exec(l.stdout)?.[1] ?? '').split(' ');
    expect(aufrufe.length).toBeGreaterThan(5);
    for (const b of ['system', 'system2', 'unlink', 'shell', 'q', 'quit', 'file.remove', 'eval']) expect(aufrufe, b).not.toContain(b);
  });
});
