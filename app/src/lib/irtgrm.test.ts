import { describe, expect, it } from 'vitest';
import { stufenModell } from './irtgrm';
import DATEN from './irtgrm-daten.csv?raw';

/* Sollwerte: R `ltm::grm(Y)` (ltm 1.2-0) auf irtgrm-daten.csv (600 Personen, 5 Aufgaben mit 5 Stufen, set.seed(21)): Extrmt, Dscrmn, Log-Likelihood −4555,665748.
 * Standardfehler: R `optimHess` auf derselben Log-Likelihood (21 Stützstellen) an den ltm-Schätzwerten, also die beobachtete Information. ltm selbst meldet für die Schwellen 2 bis 4 abweichende Werte (0,119; 0,115; 0,313);
 * Schwelle 1 und Trennschärfe stimmen mit ltm überein. */
const y = DATEN.trim().split('\n').slice(1).map(z => z.split(',').map(Number));
const B1 = [-1.5026306224, -0.4610046307, 0.2253983205, 1.1988605065], SE1 = [0.16337, 0.09996, 0.09278, 0.14033], A1 = 1.1117795581, SEA1 = 0.12289;
const B4 = [-1.1637580040, -0.2152306080, 0.5957247222, 1.1403744718], A4 = 1.9574264687, SEA4 = 0.21762226460;

describe('Stufenmodell (GRM) gegen ltm::grm', () => {
  it('Schwellen, Trennschärfe, Log-Likelihood und Standardfehler', () => {
    const r = stufenModell(y);
    if ('fehler' in r) throw new Error(r.fehler);
    expect(r.logLik).toBeCloseTo(-4555.665748, 2);
    r.item[0]!.schwellen.forEach((b, k) => { expect(b).toBeCloseTo(B1[k]!, 3); expect(Math.abs(r.item[0]!.seSchwellen[k]! - SE1[k]!) / SE1[k]!).toBeLessThan(0.005); });
    expect(r.item[0]!.a).toBeCloseTo(A1, 3); expect(Math.abs(r.item[0]!.seA - SEA1) / SEA1).toBeLessThan(0.005);
    r.item[3]!.schwellen.forEach((b, k) => expect(b).toBeCloseTo(B4[k]!, 3)); expect(r.item[3]!.a).toBeCloseTo(A4, 3); expect(Math.abs(r.item[3]!.seA - SEA4) / SEA4).toBeLessThan(0.005);
  });
  it('Fehlerfälle', () => {
    expect(stufenModell(y.map(r => r.slice(0, 2)))).toEqual({ fehler: 'zu-wenig-aufgaben' });
    expect(stufenModell(y.slice(0, 20))).toEqual({ fehler: 'zu-wenig-personen' });
    expect(stufenModell(y.map(r => [r[0]!, r[1]!, 1]))).toEqual({ fehler: 'stufe-leer' });
    expect(stufenModell(y.map(r => [r[0]!, r[1]!, 0.5]))).toEqual({ fehler: 'werte' });
  });
});
