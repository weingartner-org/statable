/**
 * B3 Teil 4b: Daten und R-Skript des Concept-Mapping-Blocks (lib/conceptblock.ts). Das Skript läuft in echtem R und liefert dieselben Gruppen und Kartenabstände wie lib/conceptmap.ts.
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { conceptRechne, type ConceptErgebnis } from './conceptmap';
import { baueCmSkript, cmDaten } from './conceptblock';
import type { RSpalte } from './rskript';

// 10 Personen, 12 Aussagen in drei Themen (1-4, 5-8, 9-12); einige Aussagen sind verlegt
const THEMA = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3];
const VERLEGT = [[2, 5, 1], [8, 9, 2], [3, 11, 4], [6, 1, 2], [0, 7, 1], [10, 2, 2], [4, 8, 3], [11, 6, 2], [1, 10, 3], [7, 3, 1]];
const PERSONEN = VERLEGT.map(([a, b, st]) => THEMA.map((t, j) => (j === a || j === b ? st! : t)));
const BOESE = 'Aussage"1\'\n# system("x")';
const namen = [BOESE, ...Array.from({ length: 11 }, (_, i) => `a${i + 2}`)];
const sp = (name: string): RSpalte => ({ name, bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [99] });
const spalten = namen.map(sp);
const zeilen: (string | number | null)[][] = [...PERSONEN.map(r => r.slice()), Array(12).fill(null) as null[], [...PERSONEN[0]!.slice(0, 11), 99]];

describe('Concept Mapping: Daten', () => {
  it('Personen mit Lücke oder Fehlend-Code entfallen, Fehler werden benannt', () => {
    const d = cmDaten(spalten, zeilen, namen);
    if ('fehler' in d) throw new Error(d.fehler);
    expect(d.weg).toBe(2); expect(d.sorts.length).toBe(10);
    expect(cmDaten(spalten, zeilen, namen.slice(0, 4))).toEqual({ fehler: 'zu-wenig-spalten' });
    expect(cmDaten(spalten, zeilen.slice(0, 1), namen)).toEqual({ fehler: 'zu-wenig-personen' });
  });
});

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT);
const tmp = mitR ? mkdtempSync(join(tmpdir(), 'cmap-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });

describe.skipIf(!mitR)('Concept Mapping: R-Skript in echtem R', () => {
  it('gleiche Gruppen und Kartenabstände (böser Spaltenname, Fehlend-Code)', () => {
    const d = cmDaten(spalten, zeilen, namen);
    if ('fehler' in d) throw new Error(d.fehler);
    const e = conceptRechne(d.sorts, 3) as ConceptErgebnis;
    const sk = baueCmSkript({ spalten, zeilen, benutzt: namen, gruppen: 3, titel: 'CM', datum: '2026-11-15' });
    expect(sk.r).not.toContain('system("x")\n');
    writeFileSync(join(tmp, sk.csvName), sk.csv.replace(/99/g, ''), 'utf8');
    writeFileSync(join(tmp, 'p.R'), sk.r + '\nf <- function(x) format(x, digits = 15); cat("GR", gruppe, "\n"); cat("DIST", f(as.vector(dist(karte))), "\n")\n', 'utf8');
    const lauf = spawnSync(RSCRIPT, ['p.R'], { cwd: tmp, encoding: 'utf8' });
    expect(lauf.status, lauf.stderr).toBe(0);
    const z = (n: string) => (lauf.stdout.split('\n').find(l => l.startsWith(n + ' ')) ?? '').slice(n.length + 1).trim().split(/\s+/).map(Number);
    expect(z('GR')).toEqual(e.gruppe);
    const dist: number[] = [];
    for (let j = 0; j < e.koord.length; j++) for (let i = j + 1; i < e.koord.length; i++) dist.push(Math.hypot(e.koord[i]![0]! - e.koord[j]![0]!, e.koord[i]![1]! - e.koord[j]![1]!));
    z('DIST').forEach((v, i) => expect(Math.abs(v - dist[i]!)).toBeLessThan(1e-6));
  });
});
