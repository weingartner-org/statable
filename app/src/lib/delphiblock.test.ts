/**
 * B3 Teil 2b: Daten und R-Skript des Delphi-Blocks (lib/delphiblock.ts). Das Skript läuft in echtem R und liefert dieselben Zahlen wie lib/delphi.ts.
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { delphiKennzahlen, kendallW } from './delphi';
import { baueDelphiSkript, delphiDaten } from './delphiblock';
import type { RSpalte } from './rskript';

const BOESE = 'Aussage"1\'\n# system("x")';
const sp = (name: string, fehlend: number[] = []): RSpalte => ({ name, bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend });
const namen = [BOESE, 'b', 'c', 'd'];
const spalten = namen.map(n => sp(n, [99]));
const zeilen: (string | number | null)[][] = [
  [4, 5, 2, 3], [5, 5, 2, 4], [4, 4, 3, 3], [5, 4, 1, 3], [4, 5, 2, 5], [3, 5, 2, 4], [99, 4, 3, 3], [4, null, 2, 4], [null, null, null, null],
];

describe('Delphi: Daten', () => {
  it('Lücken und Fehlend-Code bleiben Lücken, leere Zeilen entfallen, Fehler werden benannt', () => {
    const d = delphiDaten(spalten, zeilen, namen);
    if ('fehler' in d) throw new Error(d.fehler);
    expect(d.weg).toBe(1); expect(d.bew.length).toBe(8);
    expect(d.bew[6]![0]).toBeNull(); expect(d.bew[7]![1]).toBeNull();
    expect(delphiDaten(spalten, zeilen, ['b', 'c'])).toEqual({ fehler: 'zu-wenig-spalten' });
    expect(delphiDaten(spalten, zeilen.slice(0, 2), namen)).toEqual({ fehler: 'zu-wenig-fachleute' });
  });
});

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);
const tmp = mitR ? mkdtempSync(join(tmpdir(), 'delphi-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });

describe.skipIf(!mitR)('Delphi: R-Skript in echtem R', () => {
  it('gleiche Kennzahlen, Konsens und Kendalls W (böser Spaltenname, Fehlend-Code)', () => {
    const d = delphiDaten(spalten, zeilen, namen);
    if ('fehler' in d) throw new Error(d.fehler);
    const regel = { maxIqr: 1, band: [4, 5] as [number, number], minAnteil: 0.75 };
    const k = delphiKennzahlen(d.bew, regel), w = kendallW(d.bew)!;
    const sk = baueDelphiSkript({ spalten, zeilen, benutzt: namen, regel, titel: 'Delphi', datum: '2026-11-14' });
    expect(sk.r).not.toContain('system("x")\n');
    writeFileSync(join(tmp, sk.csvName), sk.csv.replace(/99/g, ''), 'utf8');
    writeFileSync(join(tmp, 'p.R'), sk.r + '\nf <- function(x) format(x, digits = 15); cat("MED", f(kennzahlen$median), "\n"); cat("IQR", f(kennzahlen$iqr), "\n"); cat("ANT", f(kennzahlen$anteil), "\n"); cat("KON", as.integer(kennzahlen$konsens), "\n"); cat("W", f(kendall$W), "\n"); cat("P", f(kendall$p), "\n"); cat("M", kendall$fachleute, "\n")\n', 'utf8');
    const lauf = spawnSync(RSCRIPT, ['p.R'], { cwd: tmp, encoding: 'utf8' });
    expect(lauf.status, lauf.stderr).toBe(0);
    const z = (n: string) => (lauf.stdout.split('\n').find(l => l.startsWith(n + ' ')) ?? '').slice(n.length + 1).trim().split(/\s+/).map(Number);
    z('MED').forEach((v, i) => expect(Math.abs(v - k[i]!.median)).toBeLessThan(1e-9));
    z('IQR').forEach((v, i) => expect(Math.abs(v - k[i]!.iqr)).toBeLessThan(1e-9));
    z('ANT').forEach((v, i) => expect(Math.abs(v - k[i]!.anteil!)).toBeLessThan(1e-9));
    expect(z('KON')).toEqual(k.map(r => (r.konsens ? 1 : 0)));
    expect(Math.abs(z('W')[0]! - w.w)).toBeLessThan(1e-9); expect(Math.abs(z('P')[0]! - w.p)).toBeLessThan(1e-9); expect(z('M')[0]).toBe(w.m);
  }, 120000);
});
