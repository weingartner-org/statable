/**
 * B2 Teil 2d-2: Daten für den Block „Regressions-Diskontinuität“ (vollständige Fälle, Bandbreiten, Fehler) und das R-Skript in echtem R 4.6.1 (wenn da)
 * gegen die Sollwerte aus Desktop-R (scripts/rd-erwartet.R), auch mit bösem Spaltennamen und Fehlend-Code.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { rdDaten, rdBlockRechne, baueRdSkript, leseBandbreiten, bandbreitenVorschlag } from './rdblock';
import type { RdErgebnis } from './rd';
import type { RSpalte } from './rskript';
import soll from './rd-erwartet.json';

const S = soll as any;
const csv = readFileSync(join(__dirname, 'testdaten', 'senat.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map(z => z.split(';').map(v => Number(v.replace(',', '.'))));
const sp = (name: string, fehlend: number[] = []): RSpalte => ({ name, bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend });
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);

describe('Daten und Bandbreiten für den Regressions-Diskontinuität-Block', () => {
  it('vollständige Fälle; Fehlend-Code und Lücke zählen als Lücke', () => {
    const z: (string | number | null)[][] = csv.map(r => [...r]); z[3]![0] = -9; z[4]![1] = null;
    const d = rdDaten([sp('vote', [-9]), sp('margin')], z, 'vote', 'margin');
    if ('fehler' in d) throw new Error(d.fehler);
    expect(d.y.length).toBe(1295); expect(d.weg).toBe(2);
  });
  it('Fehler: nichts gewählt, doppelte Wahl, keine Bandbreite, Schwelle', () => {
    const SP = [sp('vote'), sp('margin')];
    expect(rdDaten(SP, csv, 'vote', '')).toEqual({ fehler: 'keine-auswahl' });
    expect(rdDaten(SP, csv, 'vote', 'vote')).toEqual({ fehler: 'doppelt' });
    const d = rdDaten(SP, csv, 'vote', 'margin'); if ('fehler' in d) throw new Error(d.fehler);
    expect(rdBlockRechne(d, 0, [], 1, 'dreieck')).toEqual({ fehler: 'keine-bandbreite' });
    expect(rdBlockRechne(d, NaN, [10], 1, 'dreieck')).toEqual({ fehler: 'schwelle' });
  });
  it('Bandbreiten lesen: Komma, Punkt, Semikolon, Doppelte und Unsinn fallen weg', () => {
    expect(leseBandbreiten('5, 7,5; 10 x -3 0 10')).toEqual([5, 7.5, 10]);
    expect(leseBandbreiten('')).toEqual([]);
    expect(leseBandbreiten('1 2 3 4 5 6 7 8')).toHaveLength(6);
  });
  it('Vorschlag aus der Standardabweichung', () => {
    const v = bandbreitenVorschlag(csv.map(r => r[1]!)); expect(v).toHaveLength(3); expect(v[0]!).toBeLessThan(v[1]!); expect(v[1]!).toBeLessThan(v[2]!);
    expect(bandbreitenVorschlag([1, 1, 1])).toEqual([]);
  });
  it('rechnet wie der Kern (Sollwerte aus R), mehrere Bandbreiten nebeneinander', () => {
    const d = rdDaten([sp('vote'), sp('margin')], csv, 'vote', 'margin'); if ('fehler' in d) throw new Error(d.fehler);
    const z = rdBlockRechne(d, 0, [10, 20], 1, 'dreieck'); if (!Array.isArray(z)) throw new Error(z.fehler);
    nah((z[0]!.e as RdErgebnis).b, S.a.b); nah((z[1]!.e as RdErgebnis).seRobust, S.b.seRobust);
  });
});

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);
const tmp = mitR ? mkdtempSync(join(tmpdir(), 'rd-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });
const BOESE = 'Wert"1\'\\n# system("x")';

describe.skipIf(!mitR)('R-Skript des Regressions-Diskontinuität-Blocks in echtem R', () => {
  for (const [fall, bw, ord, kern, fs] of [['Ordnung 1, dreieckig', [10, 20], 1, 'dreieck', [S.a, S.b]], ['Ordnung 1, gleich', [10], 1, 'gleich', [S.c]], ['Ordnung 2, dreieckig', [20], 2, 'dreieck', [S.d]]] as const) {
    it(`${fall}: Skript trifft die Sollwerte (böser Spaltenname, Fehlend-Code)`, () => {
      const spalten: RSpalte[] = [sp('vote', [-9]), sp(BOESE)];
      const zeilen: (string | number | null)[][] = csv.map(r => [...r]);
      zeilen.push([-9, 1]);   // fällt durch den Fehlend-Code weg
      const d = rdDaten(spalten, zeilen, 'vote', BOESE); if ('fehler' in d) throw new Error(d.fehler);
      expect(d.y.length).toBe(1297);
      const erg = rdBlockRechne(d, 0, [...bw], ord, kern); if (!Array.isArray(erg)) throw new Error(erg.fehler);
      const sk = baueRdSkript({ spalten, zeilen, ziel: 'vote', zuteilung: BOESE, schwelle: 0, bandbreiten: [...bw], ordnung: ord, kern, zeilenErg: erg, titel: 'RDD', datum: '2026-11-14' });
      expect(sk.r).not.toContain('system("x")\n');
      writeFileSync(join(tmp, sk.csvName), sk.csv.replace(/-9(?=,|\n)/g, ''), 'utf8');
      writeFileSync(join(tmp, 'p.R'), sk.r + '\nf15 <- function(x) format(x, digits = 15); cat("N", rd$n, "\\n"); cat("NL", rd$n_links, "\\n"); cat("NR", rd$n_rechts, "\\n"); cat("B", f15(rd$b), "\\n"); cat("SE", f15(rd$se), "\\n"); cat("SER", f15(rd$se_robust), "\\n")\n', 'utf8');
      const lauf = spawnSync(RSCRIPT, ['p.R'], { cwd: tmp, encoding: 'utf8' });
      expect(lauf.status, lauf.stderr).toBe(0);
      const z = (k: string) => (lauf.stdout.split('\n').find(l => l.startsWith(k + ' ')) ?? '').slice(k.length + 1).trim().split(/\s+/).map(Number);
      fs.forEach((f: any, i: number) => {
        expect(z('N')[i]).toBe(f.n); expect(z('NL')[i]).toBe(f.nLinks); expect(z('NR')[i]).toBe(f.nRechts);
        nah(z('B')[i]!, f.b, 1e-9); nah(z('SE')[i]!, f.se, 1e-9); nah(z('SER')[i]!, f.seRobust, 1e-9);
      });
    }, 120000);
  }
});
