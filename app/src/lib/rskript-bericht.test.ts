/**
 * B1 Teil 2e: der ganze Bericht als EIN R-Skript (`baueRBericht`).
 * Aufbau (ohne R) und Gegenprobe in ECHTEM R 4.6.1 (nur wenn Rscript da ist): Jedes Blatt rechnet in seiner eigenen Umgebung,
 * die Zahlen von `blatt_<n>$…` sind dieselben wie PSPP (die Statable-Engine). Sollwerte aus PSPP, nichts von Hand.
 * Besonders geprüft: Blatt 1 legt die Gruppen-Spalte mit nur zwei von drei Stufen an - Blatt 2 muss trotzdem alle drei sehen.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { alsZahl, leseCsv, planeSpalten, zurEngine } from './einlesen';
import { anova, zusammenhang, zweiGruppen, type Anova, type Zusammenhang, type ZweiGruppen } from './ergebnis';
import { baueRBericht, kom, type RBerichtBlatt, type RKontext, type RSpalte } from './rskript';
import { nodeEngine } from './testengine';

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);

describe('baueRBericht', () => {
  let spalten: RSpalte[], zeilen: (string | number | null)[][];
  let e1: ZweiGruppen, e2: Anova, e3: Zusammenhang, e4: ZweiGruppen;
  const ctx = (blatt: string[], titel: string, gewicht = false): RKontext => ({ spalten, zeilen, blattSpalten: blatt, titel, datum: '14.11.2026', gewicht });
  let blaetter: RBerichtBlatt[];

  beforeAll(async () => {
    const e = await nodeEngine();
    const labels = { studiengang: { 1: 'Lehramt', 2: 'Sozialpaed', 3: 'Psychologie' } } as Record<string, Record<string, string>>;
    const tab = leseCsv(readFileSync(new URL('./testdaten/regression-faktor.csv', import.meta.url), 'utf8'));
    const b = zurEngine(tab);
    e.run(b.syntax, { '/import.csv': b.csv });
    e.run("VALUE LABELS studiengang 1 'Lehramt' 2 'Sozialpaed' 3 'Psychologie'.");
    const plan = planeSpalten(tab);
    spalten = plan.map(p => ({ name: p.name, bezeichnung: '', art: p.art === 'zahl' ? 'zahl' : 'text', werteLabels: labels[p.name] ?? {}, fehlend: [] }));
    zeilen = tab.zeilen.map(z => plan.map((p, i) => { const v = z[i] ?? null; if (v === null || v === '') return null; return p.art === 'zahl' ? alsZahl(v, p.punkt) : String(v); }));
    e1 = zweiGruppen(e.run('T-TEST GROUPS=studiengang(1 3) /VARIABLES=punkte.'), 'punkte', 'studiengang');
    e2 = anova(e.run('ONEWAY punkte BY studiengang\n  /STATISTICS=DESCRIPTIVES HOMOGENEITY.'), 'punkte', 'studiengang');
    e3 = zusammenhang(e.run('CORRELATIONS /VARIABLES=lernzeit punkte.'), 'lernzeit', 'punkte');
    e4 = zweiGruppen(e.run("T-TEST GROUPS=zwei('nein' 'ja') /VARIABLES=punkte."), 'punkte', 'zwei');
    blaetter = [
      { erg: { typ: 'zwei-gruppen', e: e1 }, ctx: ctx(['punkte', 'studiengang'], 'Lehramt gegen Psychologie') },
      { erg: { typ: 'mehrfach', e: {} }, ctx: ctx([], 'Mehrfachantworten "Hobbys"\nzweite Zeile') },
      { erg: { typ: 'anova', e: e2 }, ctx: ctx(['punkte', 'studiengang'], 'Drei Studiengänge') },
      { erg: { typ: 'zusammenhang', e: e3 }, ctx: ctx(['lernzeit', 'punkte'], 'Lernzeit und Punkte') },
      { erg: { typ: 'zwei-gruppen', e: e4 }, ctx: ctx(['punkte', 'zwei'], 'Mit Fallgewicht', true) },
      { erg: null, ctx: ctx([], 'Veraltet') },
      { erg: { typ: 'zwei-gruppen', e: e4 }, ctx: ctx(['punkte', 'zwei'], 'Ja gegen nein') }
    ];
  }, 120000);

  it('Aufbau: Blätter mit Skript nummeriert, die anderen nur im Kopf, eine CSV mit allen benutzten Spalten', () => {
    const r = baueRBericht(blaetter, 'Bericht Übung', '14.11.2026')!;
    expect(r.mit).toEqual(['Lehramt gegen Psychologie', 'Drei Studiengänge', 'Lernzeit und Punkte', 'Ja gegen nein']);
    expect(r.ohne).toEqual(['Mehrfachantworten "Hobbys"\nzweite Zeile', 'Mit Fallgewicht', 'Veraltet']);
    expect(r.rName).toBe('Bericht_Ubung.R');
    expect(r.csvName).toBe('Bericht_Ubung-daten.csv');
    expect(r.csv.split('\n')[0]).toBe('studiengang,lernzeit,punkte,zwei');   // Reihenfolge des Projekts, ungenutzte Spalten nicht
    expect(r.csv.trim().split('\n').length).toBe(zeilen.length + 1);
    for (let n = 1; n <= 4; n++) expect(r.r).toContain(`blatt_${n} <- local({`);
    expect(r.r).not.toContain('blatt_5');
    expect(r.r.match(/^daten <- daten_alle$/gm)!.length).toBe(4);
    expect(r.r).toContain(`#   - ${kom('Mehrfachantworten "Hobbys"\nzweite Zeile')}`);   // Titel ohne Zeilenumbruch im Kommentar
    expect(r.r).toContain('colClasses = c(\'zwei\' = "character")');
  });

  it('kein Blatt mit Skript → null', () => {
    expect(baueRBericht([blaetter[1]!, blaetter[4]!, blaetter[5]!], 'Leer', '14.11.2026')).toBeNull();
    expect(baueRBericht([], 'Leer', '14.11.2026')).toBeNull();
  });

  it('jede Codezeile außerhalb von Kommentaren beginnt nicht mit einem Titel (Titel mit Zeilenumbruch bricht nicht aus)', () => {
    const r = baueRBericht(blaetter, 'Bericht\nq()', '14.11.2026')!;
    expect(r.r.split('\n').some(z => z.trim() === 'q()')).toBe(false);
  });

  describe.skipIf(!mitR)('in R 4.6.1', () => {
    let tmp = '';
    afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });
    it('alle Blätter rechnen getrennt und stimmen mit PSPP überein', () => {
      const r = baueRBericht(blaetter, 'Bericht \u00dcbung "q()"', '14.11.2026')!;
      tmp = mkdtempSync(join(tmpdir(), 'rbericht-'));
      const aus = `
.a <- function(n, x) cat("@@", n, "=", paste(sprintf("%.12g", as.numeric(x)), collapse = ","), "\\n", sep = "")
.a('t1', blatt_1$ergebnis$statistic); .a('lev1', nlevels(blatt_1$daten[['studiengang']]))
.a('f2', blatt_2$tabelle_aov[['F value']][1]); .a('p2', blatt_2$tabelle_aov[['Pr(>F)']][1]); .a('lev2', nlevels(blatt_2$daten[['studiengang']]))
.a('r3', blatt_3$ergebnis$estimate); .a('p3', blatt_3$ergebnis$p.value)
.a('t4', blatt_4$ergebnis$statistic); .a('w4', blatt_4$ergebnis_welch$p.value)
.a('roh', is.numeric(daten_alle[['studiengang']]))
`;
      writeFileSync(join(tmp, r.csvName), r.csv, 'utf8');
      writeFileSync(join(tmp, r.rName), r.r + '\n' + aus, 'utf8');
      const l = spawnSync(RSCRIPT, [r.rName], { cwd: tmp, encoding: 'utf8' });
      expect(l.status, `Rscript: ${l.stderr}\n${r.r}`).toBe(0);
      const w: Record<string, number> = {};
      for (const z of l.stdout.split(/\r?\n/)) { const m = /^@@(\w+)=(.*)$/.exec(z); if (m) w[m[1]!] = Number(m[2]); }
      const nah = (ist: number | undefined, soll: number, was: string) => { expect(ist, was).toBeDefined(); expect(Math.abs(ist! - soll) / Math.max(1, Math.abs(soll)), `${was}: R ${ist} gegen PSPP ${soll}`).toBeLessThan(1e-6); };
      nah(w.t1, e1.tKlassisch, 'Blatt 1 t'); expect(w.lev1).toBe(2);
      nah(w.f2, e2.f, 'Blatt 2 F'); nah(w.p2, e2.p, 'Blatt 2 p'); expect(w.lev2).toBe(3);   // Blatt 1 hat die Spalte nicht verändert
      nah(w.r3, e3.r, 'Blatt 3 r'); nah(w.p3, e3.p, 'Blatt 3 p');
      nah(w.t4, e4.tKlassisch, 'Blatt 4 t'); nah(w.w4, e4.p, 'Blatt 4 Welch p');
      expect(w.roh).toBe(1);   // daten_alle bleibt unverändert
      expect(l.stdout).toContain('== 1. Lehramt gegen Psychologie ==');
    }, 60000);
  });
});
