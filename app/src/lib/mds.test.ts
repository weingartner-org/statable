import { describe, expect, it } from 'vitest';
import { mds, abstandAusKorrelation, eigenSymmetrisch } from './mds';
import DATEN from './mds-daten.csv?raw';

/* Sollwerte: R `cmdscale(as.dist(sqrt(2 * (1 - cor(x)))), k = 2, eig = TRUE)` auf mds-daten.csv (200 Personen, 6 Spalten, set.seed(5)): Eigenwerte, GOF, Koordinaten bis auf das Vorzeichen je Dimension. */
const EIG = [1.423309786, 1.199113281, 0.6584543717, 0.4429395489, 0.3621360674];
const X1 = [-0.6029028577, -0.5865688701, -0.1436147036, 0.5889797685, 0.5609781544, 0.1831285085];
const X2 = [-0.1096156068, -0.1425841419, -0.1264069507, -0.3061280202, -0.2989763708, 0.9837110905];
const x = DATEN.trim().split('\n').slice(1).map(z => z.split(',').map(Number));

describe('klassische MDS gegen cmdscale', () => {
  it('Eigenzerlegung: A v = λ v', () => {
    const A = [[4, 1, 0.5], [1, 3, 0.2], [0.5, 0.2, 2]], { werte, vek } = eigenSymmetrisch(A);
    werte.forEach((l, k) => A.forEach((r, i) => expect(r.reduce((a, v, j) => a + v * vek[j]![k]!, 0)).toBeCloseTo(l * vek[i]![k]!, 10)));
  });
  it('Eigenwerte, GOF und Koordinaten', () => {
    const r = mds(abstandAusKorrelation(x), 2);
    if ('fehler' in r) throw new Error(r.fehler);
    EIG.forEach((v, i) => expect(r.eigenwerte[i]).toBeCloseTo(v, 8));
    expect(r.gof1).toBeCloseTo(0.6418142919, 8); expect(r.gof2).toBeCloseTo(0.6418142919, 8);
    const gl = (ist: number[], soll: number[]) => { const v = Math.sign(ist[0]! * soll[0]!) || 1; ist.forEach((q, i) => expect(q * v).toBeCloseTo(soll[i]!, 7)); };
    gl(r.koord.map(p => p[0]!), X1); gl(r.koord.map(p => p[1]!), X2);
  });
  it('Fehlerfälle', () => {
    expect(mds([[0, 1], [1, 0]])).toEqual({ fehler: 'zu-wenig-punkte' });
    expect(mds([[0, 1, 2], [1, 0, 1], [2, 5, 0]])).toEqual({ fehler: 'abstaende' });
  });
});
