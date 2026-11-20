// ROT (Prüfer, Stufe 6.6, 09.11.2026): Testhalbierung (Split-Half). Gebaut wird noch nichts - dieser Test sagt, was gebaut werden soll.
//
// ERWARTETE SCHNITTSTELLE (lib/ergebnis.ts, neben `skala(...)`):
//   splitHalfSyntax(spalten: string[]): string
//       -> `RELIABILITY /VARIABLES=<spalten> /MODEL=SPLIT(<ceil(k/2)>).`  PSPP 2.x bricht bei `/MODEL=SPLIT` ohne Zahl ab
//          („The split point must be less than the number of variables“), die Zahl muss also immer gesetzt werden.
//          Teil 1 = erste ceil(k/2) Fragen, Teil 2 = übrige (wie SPSS; bei k = 7 vier plus drei, bei k = 5 drei plus zwei).
//   splitHalf(items: OutputItem[]): SplitHalf     liest die Tabelle „Reliability Statistics“ der PSPP-Ausgabe
//       SplitHalf = { art: 'splithalf'; n: number; k1: number; k2: number; r: number; sbGleich: number; sbUngleich: number;
//                     guttman: number; alpha1: number; alpha2: number }
//       r = Korrelation der Hälften, sbGleich/sbUngleich = Spearman-Brown (gleiche/ungleiche Länge), guttman = Guttman-Split-Half.
// Sollwerte: app/src/lib/testdaten/split-half-retest-erwartet.json (R, Skript scripts/split-half-retest-erwartet.R) und
// Abschnitt `spss` darin (SPSS 32, 3 Stellen). Toleranz 1e-3.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import * as ergebnis from './ergebnis';
import { nodeEngine } from './testengine';

const { splitHalf, splitHalfSyntax } = ergebnis as unknown as {
  splitHalf: (items: unknown[]) => Record<string, number | string>;
  splitHalfSyntax: (spalten: string[]) => string;
};
const soll = JSON.parse(readFileSync(new URL('./testdaten/split-half-retest-erwartet.json', import.meta.url), 'utf8'));
const FELDER = ['r', 'sbGleich', 'sbUngleich', 'guttman', 'alpha1', 'alpha2'] as const;

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

const rechne = (datei: string, spalten: string[]) => {
  const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL(`./testdaten/${datei}`, import.meta.url), 'utf8')));
  e.run(syntax, { '/import.csv': csv });
  return splitHalf(e.run(splitHalfSyntax(spalten)));
};

describe('Testhalbierung: Syntax', () => {
  it('splitHalfSyntax setzt den Teilungspunkt ceil(k/2) immer ausdrücklich', () => {
    expect(typeof splitHalfSyntax).toBe('function');
    expect(splitHalfSyntax(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toMatch(/\/MODEL=SPLIT\(4\)/);
    expect(splitHalfSyntax(['a', 'b', 'c', 'd', 'e'])).toMatch(/\/MODEL=SPLIT\(3\)/);
    expect(splitHalfSyntax(['a', 'b', 'c', 'd'])).toMatch(/\/MODEL=SPLIT\(2\)/);
    expect(splitHalfSyntax(['a', 'b', 'c', 'd'])).toContain('/VARIABLES=a b c d');
  });
});

describe('Testhalbierung: PSPP-Ausgabe gegen R und SPSS 32 (Toleranz 1e-3)', () => {
  const fall: [string, string, string[]][] = [
    ['davisthin', 'split-half-davisthin.csv', ['dt1', 'dt2', 'dt3', 'dt4', 'dt5', 'dt6', 'dt7']],   // 191 Personen, k = 7: 4 + 3
    ['fuenf', 'split-half-fuenf.csv', ['dt1', 'dt2', 'dt3', 'dt4', 'dt5']],                        // ungerade k = 5: 3 + 2
    ['konstant', 'split-half-konstant.csv', ['a', 'b', 'c', 'd']]                                   // Frage b konstant: Alpha von Teil 1 = 0
  ];
  for (const [name, datei, spalten] of fall) {
    it(`${name}: Fragen je Teil, r, Spearman-Brown, Guttman und Alpha je Teil`, () => {
      const r = rechne(datei, spalten), s = soll.splitHalf[name], x = soll.spss[name];
      expect(r.art).toBe('splithalf');
      expect([r.k1, r.k2]).toEqual([s.k1, s.k2]);
      expect([r.k1, r.k2]).toEqual([x.k1, x.k2]);
      expect(r.n).toBe(s.n);
      for (const f of FELDER) {
        expect(Math.abs(Number(r[f]) - s[f]), `${name}.${f} gegen R`).toBeLessThan(1e-3);
        expect(Math.abs(Number(r[f]) - x[f]), `${name}.${f} gegen SPSS`).toBeLessThan(1e-3);
      }
    });
  }
});