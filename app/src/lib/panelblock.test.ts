/**
 * B2 Teil 1b: Daten für den Paneldaten-Block (vollständige Fälle, Fehler mit Namen) und das R-Skript in echtem R 4.6.1 (wenn da)
 * gegen die Sollwerte aus Desktop-R (scripts/panel-erwartet.R: plm, sandwich), auch mit bösem Spaltennamen und Fehlend-Code.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { panelDaten, panelBlockRechne, bauePanelSkript, PANEL_WENIG_GRUPPEN } from './panelblock';
import type { PanelErgebnis } from './panel';
import type { RSpalte } from './rskript';
import soll from './panel-erwartet.json';

const S = soll as any;
const csv = readFileSync(join(__dirname, 'testdaten', 'grunfeld.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map(z => z.split(';').map(v => Number(v.replace(',', '.'))));
const sp = (name: string, art: RSpalte['art'] = 'zahl', fehlend: number[] = []): RSpalte => ({ name, bezeichnung: '', art, werteLabels: {}, fehlend });
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);

describe('Daten für den Paneldaten-Block', () => {
  const spalten = [sp('firm'), sp('year'), sp('inv'), sp('value', 'zahl', [-9]), sp('capital'), sp('text', 'text')];
  it('vollständige Fälle; Fehlend-Code und Lücke zählen als Lücke', () => {
    const z: (string | number | null)[][] = csv.map(r => [...r, 'x']); z[3]![3] = -9; z[4]![4] = null;
    const d = panelDaten(spalten, z, 'firm', 'inv', ['value', 'capital']);
    expect('fehler' in d).toBe(false);
    if (!('fehler' in d)) { expect(d.y.length).toBe(198); expect(d.weg).toBe(2); expect(d.namen).toEqual(['value', 'capital']); }
  });
  it('Text-Spalte als Merkmal und Gruppe als Merkmal fallen weg; ohne Merkmal Fehler', () => {
    const z = csv.map(r => [...r, 'x']);
    expect(panelDaten(spalten, z, 'firm', 'inv', ['text'])).toEqual({ fehler: 'keine-merkmale' });
    expect(panelDaten(spalten, z, 'firm', 'inv', ['firm'])).toEqual({ fehler: 'keine-merkmale' });
    expect(panelDaten(spalten, z, 'text', 'inv', ['value'])).not.toHaveProperty('fehler');   // Text als Gruppenkennung geht
  });
  it('zeitkonstantes Merkmal: Fehler nennt den Namen', () => {
    const z = csv.map(r => [...r, 'x', r[0]! * 10]);
    const d = panelDaten([...spalten, sp('groesse')], z, 'firm', 'inv', ['value', 'groesse']);
    if ('fehler' in d) throw new Error(d.fehler);
    expect(panelBlockRechne(d)).toEqual({ fehler: 'konstant', namen: ['groesse'] });
  });
  it('Faustregel: wenige Gruppen', () => { expect(PANEL_WENIG_GRUPPEN).toBe(30); });
});

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);
const tmp = mitR ? mkdtempSync(join(tmpdir(), 'panel-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });
const BOESE = 'Wert"1\'\\n# system("x")';

describe.skipIf(!mitR)('R-Skript des Paneldaten-Blocks in echtem R', () => {
  for (const [fall, weg] of [['A', [] as number[]], ['B', S.B.zeilenEntfernt as number[] | undefined]] as const) {
    it(`Fall ${fall}: Skript trifft die Sollwerte (böser Spaltenname, Fehlend-Code)`, () => {
      const f = S[fall];
      const spalten: RSpalte[] = [sp('firm'), sp('year'), sp('inv'), sp(BOESE, 'zahl', [-9]), sp('capital')];
      let zeilen: (string | number | null)[][] = csv.map(r => [...r]);
      if (fall === 'B') zeilen = zeilen.filter((_, i) => !(weg ?? []).includes(i + 1));
      zeilen.push([1, 2000, 100, -9, 5]);   // fällt durch den Fehlend-Code weg
      const d = panelDaten(spalten, zeilen, 'firm', 'inv', [BOESE, 'capital']);
      if ('fehler' in d) throw new Error(d.fehler);
      const e = panelBlockRechne(d) as PanelErgebnis;
      expect(e.N).toBe(f.N);
      const sk = bauePanelSkript({ spalten, zeilen, gruppe: 'firm', ziel: 'inv', merkmale: [BOESE, 'capital'], r: e, titel: 'Panel', datum: '2026-11-14' });
      expect(sk.r).not.toContain('system("x")\n');
      writeFileSync(join(tmp, sk.csvName), sk.csv.replace(/-9(?=,|\n)/g, ''), 'utf8');
      writeFileSync(join(tmp, 'p.R'), sk.r + '\nf15 <- function(x) format(x, digits = 15); cat("N", N, "\\n"); cat("FEB", f15(fe$b), "\\n"); cat("FESE", f15(fe$se), "\\n"); cat("FESC", f15(fe$se_cluster), "\\n"); cat("PB", f15(pooled$b), "\\n"); cat("PSC", f15(pooled$se_cluster), "\\n"); cat("BB", f15(be$b), "\\n"); cat("F", f15(ftest$F), "\\n"); if (!is.null(re)) { cat("RB", f15(re$b), "\\n"); cat("H", f15(hausman$chi2), "\\n") }\n', 'utf8');
      const lauf = spawnSync(RSCRIPT, ['p.R'], { cwd: tmp, encoding: 'utf8' });
      expect(lauf.status, lauf.stderr).toBe(0);
      const z = (k: string) => (lauf.stdout.split('\n').find(l => l.startsWith(k + ' ')) ?? '').slice(k.length + 1).trim().split(/\s+/).map(Number);
      const arr = (v: number | number[]) => (Array.isArray(v) ? v : [v]);
      expect(z('N')[0]).toBe(f.N);
      z('FEB').forEach((v, i) => nah(v, arr(f.within.b)[i]!, 1e-9)); z('FESE').forEach((v, i) => nah(v, arr(f.within.se)[i]!, 1e-9)); z('FESC').forEach((v, i) => nah(v, arr(f.within.seCluster)[i]!, 1e-9));
      z('PB').forEach((v, i) => nah(v, arr(f.pooled.b)[i]!, 1e-9)); z('PSC').forEach((v, i) => nah(v, arr(f.pooled.seCluster)[i]!, 1e-9));
      z('BB').forEach((v, i) => nah(v, arr(f.between.b)[i]!, 1e-9)); nah(z('F')[0]!, f.ftestEffekte.F, 1e-9);
      if (f.balanciert) { z('RB').forEach((v, i) => nah(v, arr(f.random.b)[i]!, 1e-9)); nah(z('H')[0]!, f.hausman.chi2, 1e-8); }
      else expect(lauf.stdout).not.toContain('RB ');
    }, 120000);
  }
});

describe('Zahlen im Hilfe-Artikel „Paneldaten“ gegen die Sollwerte aus R', () => {
  const dec = (v: number, n: number) => v.toFixed(n).replace('.', ',');
  const A = S.A;
  it('Tabelle, F-Test, Hausman, Standardfehler', () => {
    const text = readFileSync(join(__dirname, '..', 'hilfe', 'artikel-paneldaten.ts'), 'utf8');
    const muss = [dec(A.within.b[0], 4), dec(A.within.b[1], 4), dec(A.random.b[1], 4), dec(A.random.b[2] ?? A.random.b[1], 4) /* Konstante steht vorn: b[1], b[2] */,
      dec(A.pooled.b[1], 4), dec(A.pooled.b[2], 4), dec(A.between.b[1], 4), dec(A.between.b[2], 4),
      dec(A.within.se[0], 4), dec(A.within.seCluster[0], 4), dec(A.pooled.se[1], 4), dec(A.pooled.seCluster[1], 4),
      dec(A.ftestEffekte.F, 2), dec(A.hausman.chi2, 2), dec(A.hausman.p, 3).replace('0,', ',')];
    for (const m of muss) expect(text, m).toContain(m.startsWith(',') ? m : m);
    expect(A.ftestEffekte.df1).toBe(9); expect(A.ftestEffekte.df2).toBe(188);
  });
});
