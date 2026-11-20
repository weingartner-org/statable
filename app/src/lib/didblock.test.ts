/**
 * B2 Teil 2c: Daten für den Block „Differenz-in-Differenzen“ (vollständige Fälle, Fehler) und das R-Skript in echtem R 4.6.1 (wenn da)
 * gegen die Sollwerte aus Desktop-R (scripts/did-erwartet.R), auch mit bösem Spaltennamen und Fehlend-Code.
 * Beispieldatei public/beispiel/hauspreise-muellofen.csv.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { didDaten, didBlockRechne, baueDidSkript } from './didblock';
import type { DidErgebnis } from './did';
import type { RSpalte } from './rskript';
import soll from './did-erwartet.json';

const S = soll as any;
const csv = readFileSync(join(__dirname, '..', '..', 'public', 'beispiel', 'hauspreise-muellofen.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map(z => z.split(';').map(v => Number(v.replace(',', '.'))));
const sp = (name: string, art: RSpalte['art'] = 'zahl', fehlend: number[] = []): RSpalte => ({ name, bezeichnung: '', art, werteLabels: {}, fehlend });
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);
const SPALTEN = [sp('preis', 'zahl', [-9]), sp('nah'), sp('nachher'), sp('flaeche'), sp('zimmer'), sp('alter')];

describe('Daten für den Differenz-in-Differenzen-Block', () => {
  it('vollständige Fälle; Fehlend-Code und Lücke zählen als Lücke', () => {
    const z: (string | number | null)[][] = csv.map(r => [...r]); z[3]![0] = -9; z[4]![3] = null;
    const d = didDaten(SPALTEN, z, 'preis', 'nah', 'nachher', ['flaeche']);
    if ('fehler' in d) throw new Error(d.fehler);
    expect(d.y.length).toBe(319); expect(d.weg).toBe(2);
  });
  it('Fehler: nichts gewählt, doppelte Wahl, Gruppe nicht 0/1', () => {
    expect(didDaten(SPALTEN, csv, 'preis', '', 'nachher', [])).toEqual({ fehler: 'keine-auswahl' });
    expect(didDaten(SPALTEN, csv, 'preis', 'nah', 'nah', [])).toEqual({ fehler: 'doppelt' });
    const d = didDaten(SPALTEN, csv, 'preis', 'zimmer', 'nachher', []);
    if ('fehler' in d) throw new Error(d.fehler);
    expect(didBlockRechne(d)).toEqual({ fehler: 'keine-null-eins' });
  });
  it('rechnet wie der Kern (Sollwerte aus R)', () => {
    const d = didDaten(SPALTEN, csv, 'preis', 'nah', 'nachher', ['flaeche', 'zimmer', 'alter']);
    if ('fehler' in d) throw new Error(d.fehler);
    const e = didBlockRechne(d) as DidErgebnis; nah(e.koef[3]!.b, S.mit.b[3]); nah(e.koef[3]!.seRobust, S.mit.seRobust[3]);
  });
});

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);
const tmp = mitR ? mkdtempSync(join(tmpdir(), 'did-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });
const BOESE = 'Wert"1\'\\n# system("x")';

describe.skipIf(!mitR)('R-Skript des Differenz-in-Differenzen-Blocks in echtem R', () => {
  for (const [fall, exo, f] of [['ohne Merkmale', [], S.ohne], ['mit Merkmalen', ['flaeche', 'zimmer', 'alter'], S.mit]] as const) {
    it(`${fall}: Skript trifft die Sollwerte (böser Spaltenname, Fehlend-Code)`, () => {
      const spalten: RSpalte[] = [sp('preis'), sp(BOESE), sp('nachher', 'zahl', [-9]), sp('flaeche'), sp('zimmer'), sp('alter')];
      const zeilen: (string | number | null)[][] = csv.map(r => [...r]);
      zeilen.push([100000, 1, -9, 1, 1, 1]);   // fällt durch den Fehlend-Code weg
      const d = didDaten(spalten, zeilen, 'preis', BOESE, 'nachher', [...exo]);
      if ('fehler' in d) throw new Error(d.fehler);
      const e = didBlockRechne(d) as DidErgebnis;
      expect(e.n).toBe(321);
      const sk = baueDidSkript({ spalten, zeilen, ziel: 'preis', gruppe: BOESE, zeit: 'nachher', exo: [...exo], r: e, titel: 'DiD', datum: '2026-11-14' });
      expect(sk.r).not.toContain('system("x")\n');
      writeFileSync(join(tmp, sk.csvName), sk.csv.replace(/-9(?=,|\n)/g, ''), 'utf8');
      writeFileSync(join(tmp, 'p.R'), sk.r + '\nf15 <- function(x) format(x, digits = 15); cat("N", n, "\\n"); cat("B", f15(did$b), "\\n"); cat("SE", f15(did$se), "\\n"); cat("SER", f15(did$se_robust), "\\n"); cat("MW", f15(unlist(mittel)), "\\n"); cat("DM", f15(did_mittel), "\\n"); cat("SIG", f15(sigma), f15(r2), "\\n")\n', 'utf8');
      const lauf = spawnSync(RSCRIPT, ['p.R'], { cwd: tmp, encoding: 'utf8' });
      expect(lauf.status, lauf.stderr).toBe(0);
      const z = (k: string) => (lauf.stdout.split('\n').find(l => l.startsWith(k + ' ')) ?? '').slice(k.length + 1).trim().split(/\s+/).map(Number);
      expect(z('N')[0]).toBe(f.n);
      z('B').forEach((v, i) => nah(v, f.b[i], 1e-9)); z('SE').forEach((v, i) => nah(v, f.se[i], 1e-9)); z('SER').forEach((v, i) => nah(v, f.seRobust[i], 1e-9));
      const mm = f.mittel; [mm.m00, mm.m01, mm.m10, mm.m11, mm.n00, mm.n01, mm.n10, mm.n11].forEach((v: number, i: number) => nah(z('MW')[i]!, v, 1e-9));
      nah(z('DM')[0]!, f.did2, 1e-9); nah(z('SIG')[0]!, f.sigma, 1e-9); nah(z('SIG')[1]!, f.r2, 1e-9);
    }, 120000);
  }
});
