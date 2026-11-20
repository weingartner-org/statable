import { describe, expect, it } from 'vitest';
import { korrespondenz } from './korrespondenz';

/* Sollwerte: R `MASS::corresp(tab, nf = 3)` (Singulärwerte `cor`, `rscore` · cor, `cscore` · cor), Tabelle 5 × 4, n = 253, χ² = 80,05744589. Hauptkoordinaten gelten bis auf das Vorzeichen einer Dimension. */
const TAB = [[20, 15, 8, 5], [10, 25, 12, 9], [4, 12, 30, 14], [6, 8, 10, 28], [3, 5, 9, 20]];
const COR = [0.4456356532, 0.2976581321, 0.1710002733];
const R1 = [-0.6749964334, -0.3604262425, 0.1989407298, 0.4209105927, 0.5070244264], R2 = [0.1991418248, -0.07891666001, -0.4780928079, 0.3064814784, 0.2056501884];
const C1 = [-0.6398955327, -0.3744316808, 0.1631104785, 0.5341966334], C2 = [0.291979889, -0.06423476728, -0.4275395517, 0.277899391];

describe('Korrespondenzanalyse gegen MASS::corresp', () => {
  const e = korrespondenz(TAB);
  if ('fehler' in e) throw new Error(e.fehler);
  const gleich = (ist: number[], soll: number[], was: string) => { const v = Math.sign(ist[0]! * soll[0]!) || 1; ist.forEach((x, i) => expect(x * v, `${was}${i}`).toBeCloseTo(soll[i]!, 8)); };
  it('Singulärwerte, Trägheit und χ²', () => {
    e.singulaer.forEach((v, i) => expect(v).toBeCloseTo(COR[i]!, 9));
    expect(e.chi2).toBeCloseTo(80.05744589, 6); expect(e.n).toBe(253); expect(e.dimensionen).toBe(3);
    expect(e.anteil.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
  it('Koordinaten der Zeilen und Spalten', () => {
    gleich(e.zeilen.map(z => z.koord[0]!), R1, 'Zeile D1'); gleich(e.zeilen.map(z => z.koord[1]!), R2, 'Zeile D2');
    gleich(e.spalten.map(z => z.koord[0]!), C1, 'Spalte D1'); gleich(e.spalten.map(z => z.koord[1]!), C2, 'Spalte D2');
  });
  it('Fehlerfälle', () => {
    expect(korrespondenz([[1, 2]])).toEqual({ fehler: 'zu-klein' });
    expect(korrespondenz([[1, 2], [0, 0]])).toEqual({ fehler: 'leere-zeile' });
    expect(korrespondenz([[1, 0], [2, 0]])).toEqual({ fehler: 'leere-spalte' });
    expect(korrespondenz([[1, -2], [3, 4]])).toEqual({ fehler: 'werte' });
  });
});
