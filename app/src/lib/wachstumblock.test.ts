/**
 * B4 Teil 1: Wachstumskurvenmodell, Eingaberegeln und R-Skript (lib/wachstumblock.ts).
 * Gegenprobe: Das erzeugte R-Skript läuft in ECHTEM R 4.6.1 (nur wenn Rscript da ist, mit lavaan) und muss die Sollwerte aus scripts/wachstum-erwartet.R treffen
 * (lavaan::growth; der Rest des Modells ist dort zusätzlich gegen nlme::lme geprüft). Ein böser Spaltenname und ein Fehlend-Code gehören dazu.
 */
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { baueWachstumSkript, zeitwerteLesen } from './wachstumblock';
import type { RSpalte } from './rskript';
import soll from './wachstum-erwartet.json';

const RSCRIPT = 'C:/Program Files/R/R-4.6.1/bin/Rscript.exe';
const mitR = existsSync(RSCRIPT) && spawnSync(RSCRIPT, ['-e', 'quit(status = as.integer(!requireNamespace("lavaan", quietly = TRUE)))']).status === 0;
const tmp = mitR ? mkdtempSync(join(tmpdir(), 'wachstum-')) : '';
afterAll(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }); });

describe('Zeitwerte lesen', () => {
  it('leer ergibt 0, 1, 2 …; Semikolon, Leerraum, Komma und Dezimalkomma', () => {
    expect(zeitwerteLesen('', 4)).toEqual([0, 1, 2, 3]);
    expect(zeitwerteLesen('0, 1, 3, 6', 4)).toEqual([0, 1, 3, 6]);
    expect(zeitwerteLesen('0,1,3,6', 4)).toEqual([0, 1, 3, 6]);
    expect(zeitwerteLesen('0; 0,5; 1,5', 3)).toEqual([0, 0.5, 1.5]);
    expect(zeitwerteLesen('0 1 2', 3)).toEqual([0, 1, 2]);
  });
  it('falsche Anzahl, Text oder zu wenige verschiedene Werte geben null', () => {
    expect(zeitwerteLesen('0, 1', 3)).toBeNull();
    expect(zeitwerteLesen('0, 1, x', 3)).toBeNull();
    expect(zeitwerteLesen('1, 1, 1', 3)).toBeNull();
    expect(zeitwerteLesen('0, 1, 2, 3', 3)).toBeNull();
  });
});

type Fall = { zeit: number[]; gleich: boolean; fiml: boolean; daten: Record<string, (number | null)[]>; lavaan: Record<string, number | number[]> };
const BOESE = 'Zeit"1\'\\n# system("x")';

describe.skipIf(!mitR)('R-Skript des Wachstumskurvenmodells in echtem R', () => {
  for (const name of ['A', 'A_gleich', 'B', 'C_fiml']) {
    it(`Fall ${name}: Skript trifft die Sollwerte`, () => {
      const f = (soll as unknown as Record<string, Fall>)[name]!;
      const ks = Object.keys(f.daten), k = ks.length, n = f.daten[ks[0]!]!.length;
      const spalten: RSpalte[] = ks.map((_, j) => ({ name: j === 1 ? BOESE : `zeit${j + 1}`, bezeichnung: '', art: 'zahl', werteLabels: {}, fehlend: [9999] }));
      const zeilen = Array.from({ length: n }, (_, i) => ks.map(key => f.daten[key]![i] ?? 9999));   // Lücken als Fehlend-Code
      const L = f.lavaan as Record<string, number>;
      const sk = baueWachstumSkript({ spalten, zeilen, benutzt: spalten.map(c => c.name), zeit: f.zeit, gleichRest: f.gleich, fiml: f.fiml, titel: 'Wachstum', datum: '2026-11-14',
        statable: { n: Number(L.n), mittelI: Number(L.mw_i), mittelS: Number(L.mw_s), varI: Number(L.var_i), varS: Number(L.var_s), kov: Number(L.kov), chisq: Number(L.chisq), df: Number(L.df), cfi: Number(L.cfi), rmsea: Number(L.rmsea) } });
      expect(sk.r).not.toContain('system("x")\n');   // Kommentar-Zeilen und Texte kommen nur als Text an
      writeFileSync(join(tmp, `${name}.csv`), sk.csv.replace(/9999/g, ''), 'utf8');   // Fehlend-Code wie in der echten Ausgabe: leere Zelle
      writeFileSync(join(tmp, sk.csvName), sk.csv, 'utf8');
      const skript = sk.r + '\ncat("MW", mittelwerte$est, "\n"); cat("VAR", varianzen$est, "\n"); cat("KOV", kovarianz$est, "\n"); cat("FIT", passung[["chisq"]], passung[["df"]], "\n")\n';
      writeFileSync(join(tmp, `${name}.R`), skript, 'utf8');
      const lauf = spawnSync(RSCRIPT, [`${name}.R`], { cwd: tmp, encoding: 'utf8' });
      expect(lauf.status, lauf.stderr).toBe(0);
      const z = (kopf: string) => (lauf.stdout.split('\n').find(l => l.startsWith(kopf + ' ')) ?? '').slice(kopf.length + 1).trim().split(/\s+/).map(Number);
      const nah = (a: number, b: number, tol: number, was: string) => expect(Math.abs(a - b) / Math.max(Math.abs(b), 1e-9), was).toBeLessThan(tol);
      nah(z('MW')[0]!, Number(L.mw_i), 1e-6, 'Mittel i'); nah(z('MW')[1]!, Number(L.mw_s), 1e-6, 'Mittel s');
      nah(z('VAR')[0]!, Number(L.var_i), 1e-5, 'Var i'); nah(z('VAR')[1]!, Number(L.var_s), 1e-5, 'Var s'); nah(z('KOV')[0]!, Number(L.kov), 1e-5, 'Kov');
      nah(z('FIT')[0]!, Number(L.chisq), 1e-5, 'Chi²'); expect(z('FIT')[1]).toBe(Number(L.df));
    }, 60000);
  }
});
