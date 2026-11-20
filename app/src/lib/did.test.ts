/**
 * B2 Teil 2c: Differenz-in-Differenzen gegen Sollwerte aus Desktop-R (scripts/did-erwartet.R: lm mit Wechselwirkung, sandwich HC1, zweiter Weg über die vier Gruppenmittel),
 * Häuserpreise nahe einer Müllverbrennungsanlage (kielmc, 1978/1981, 321 Häuser), ohne und mit Merkmalen.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { didRechnen, type DidErgebnis } from './did';
import soll from './did-erwartet.json';

const zeilen = readFileSync(join(__dirname, 'testdaten', 'hauspreise.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map(z => z.split(';').map(v => Number(v.replace(',', '.'))));
// Spalten: rprice, nearinc, y81, area, rooms, age
const y = zeilen.map(z => z[0]!), beh = zeilen.map(z => z[1]!), nach = zeilen.map(z => z[2]!);
const S = soll as any;
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.max(1, Math.abs(b))).toBeLessThan(tol);
function lauf(mit: boolean): DidErgebnis {
  const e = didRechnen(y, beh, nach, zeilen.map(z => (mit ? [z[3]!, z[4]!, z[5]!] : [])), mit ? ['Fläche', 'Zimmer', 'Alter'] : []);
  if ('fehler' in e) throw new Error(e.fehler);
  return e;
}
function vergleich(e: DidErgebnis, f: any) {
  expect(e.n).toBe(f.n); expect(e.k).toBe(f.k);
  f.b.forEach((v: number, i: number) => { nah(e.koef[i]!.b, v); nah(e.koef[i]!.se, f.se[i]); nah(e.koef[i]!.seRobust, f.seRobust[i]); });
  nah(e.sigma, f.sigma); nah(e.r2, f.r2);
  (['m00', 'm01', 'm10', 'm11', 'n00', 'n01', 'n10', 'n11'] as const).forEach(k => nah(e.mittel[k], f.mittel[k]));
}
describe('Differenz-in-Differenzen gegen R', () => {
  it('ohne Merkmale: Koeffizienten, Fehler, vier Gruppenmittel, Differenz der Mittel = b3', () => {
    const e = lauf(false); vergleich(e, S.ohne); nah(e.didMittel, S.ohne.did2); nah(e.koef[3]!.b, e.didMittel);
  });
  it('mit Fläche, Zimmern, Alter', () => { vergleich(lauf(true), S.mit); });
  it('Fehler: keine 0/1-Werte, leere Gruppe, zu wenig Fälle', () => {
    expect(didRechnen([1, 2, 3, 4], [0, 1, 2, 1], [0, 0, 1, 1], [[], [], [], []], [])).toEqual({ fehler: 'keine-null-eins' });
    expect(didRechnen([1, 2, 3, 4], [0, 0, 1, 1], [0, 1, 0, 0], [[], [], [], []], [])).toEqual({ fehler: 'leere-gruppe' });
    expect(didRechnen([1, 2, 3, 4], [0, 0, 1, 1], [0, 1, 0, 1], [[], [], [], []], [])).toEqual({ fehler: 'zu-wenig-faelle' });
  });
});
