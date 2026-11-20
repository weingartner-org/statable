/**
 * B3 Teil 3b: Daten und R-Skript des Q-Methode-Blocks (lib/qblock.ts). Das Skript läuft in echtem R und liefert dieselben Zahlen wie lib/qmethode.ts.
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { qRechne, type QErgebnis } from './qmethode';
import { baueQSkript, qDaten } from './qblock';
import type { RSpalte } from './rskript';

const DATEN = [
  [2, 0, 3, 3, -2, 0, -3, -2], [2, 3, 0, 2, -3, -1, -1, -3], [1, 1, 1, 1, 1, 1, 0, -1], [3, 1, 2, 2, 2, 3, 3, 1],
  [1, 2, 2, 1, 3, 1, 1, 2], [-2, 2, 0, -1, 0, -3, 1, -1], [-1, -1, -1, -2, 2, 2, 2, 3], [0, 0, -1, 0, 0, -1, -1, 0],
  [-1, -1, -2, 0, -2, -1, 0, 0], [-2, -2, -2, -2, -1, 0, -1, 1], [0, -3, -1, -1, -1, -2, -2, -2], [-3, -2, -3, -3, -1, -2, -2, -1],
  [-1, -1, 1, -1, 1, 2, 2, 2],
];
const PERSONEN = DATEN[0]!.map((_, p) => DATEN.map(r => r[p]!)); // je Person ein Q-Sort mit 13 Aussagen
const BOESE = 'Aussage"1\'\n# system("x")';
const namen = [BOESE, ...Array.from({ length: 12 }, (_, i) => `a${i + 2}`)];
const sp = (name: string): RSpalte => ({ name, bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [99] });
const spalten = namen.map(sp);
const zeilen: (string | number | null)[][] = [...PERSONEN.map(r => r.slice()), Array(13).fill(null) as null[], [...PERSONEN[0]!.slice(0, 12), 99]];

describe('Q-Methode: Daten', () => {
  it('Personen mit Lücke oder Fehlend-Code entfallen, Fehler werden benannt', () => {
    const d = qDaten(spalten, zeilen, namen);
    if ('fehler' in d) throw new Error(d.fehler);
    expect(d.weg).toBe(2); expect(d.sorts.length).toBe(8);
    expect(qDaten(spalten, zeilen, namen.slice(0, 5))).toEqual({ fehler: 'zu-wenig-spalten' });
    expect(qDaten(spalten, zeilen.slice(0, 2), namen)).toEqual({ fehler: 'zu-wenig-personen' });
  });
});

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);
const tmp = mitR ? mkdtempSync(join(tmpdir(), 'qmeth-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });

describe.skipIf(!mitR)('Q-Methode: R-Skript in echtem R', () => {
  it('gleiche Ladungen, z-Werte und Faktor-Q-Sort (böser Spaltenname, Fehlend-Code)', () => {
    const d = qDaten(spalten, zeilen, namen);
    if ('fehler' in d) throw new Error(d.fehler);
    const e = qRechne(d.sorts, 2) as QErgebnis;
    const sk = baueQSkript({ spalten, zeilen, benutzt: namen, faktoren: 2, titel: 'Q', datum: '2026-11-15' });
    expect(sk.r).not.toContain('system("x")\n');
    writeFileSync(join(tmp, sk.csvName), sk.csv.replace(/99/g, ''), 'utf8');
    writeFileSync(join(tmp, 'p.R'), sk.r + '\nf <- function(x) format(x, digits = 15); cat("LAD", f(as.vector(lad)), "\n"); cat("Z", f(as.vector(z)), "\n"); cat("MARK", as.integer(as.vector(markiert)), "\n"); cat("SORT", as.vector(faktorsort), "\n"); cat("ERK", f(erklaert), "\n")\n', 'utf8');
    const lauf = spawnSync(RSCRIPT, ['p.R'], { cwd: tmp, encoding: 'utf8' });
    expect(lauf.status, lauf.stderr).toBe(0);
    const z = (n: string) => (lauf.stdout.split('\n').find(l => l.startsWith(n + ' ')) ?? '').slice(n.length + 1).trim().split(/\s+/).map(Number);
    const spaltenweise = (m: number[][]) => m[0]!.flatMap((_, j) => m.map(r => r[j]!));
    z('LAD').forEach((v, i) => expect(Math.abs(v - spaltenweise(e.ladungen)[i]!)).toBeLessThan(1e-4));
    z('Z').forEach((v, i) => expect(Math.abs(v - spaltenweise(e.z)[i]!)).toBeLessThan(1e-4));
    expect(z('MARK')).toEqual(spaltenweise(e.markiert.map(r => r.map(Number))));
    expect(z('SORT')).toEqual(spaltenweise(e.sort!));
    z('ERK').forEach((v, i) => expect(Math.abs(v - e.erklaert[i]!)).toBeLessThan(1e-3));
  });
});
