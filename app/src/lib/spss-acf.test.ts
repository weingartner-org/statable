import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { zeitAcf, zeitPacf } from './zeitreihe';

/* ACF und PACF der Karte Zeitreihen gegen SPSS 32 (ACF-Befehl, Sollwerte pruefdaten/pc-sollwerte-spss/01-acf-pacf.txt, AirPassengers, Lag 1 bis 24).
 * SPSS druckt drei Stellen, darum Toleranz 0,0006. Läuft nur, wo die Ablage da ist (Mac-Ordner mit pruefdaten). */
const wurzel = join(import.meta.dirname, '../../../pruefdaten');
const dat = join(wurzel, 'pc-sollwerte-spss/01-acf-pacf.txt'), csv = join(wurzel, 'pc-sollwerte-spss/daten/airpassengers.csv');
const da = existsSync(dat) && existsSync(csv);

function spssBloecke(text: string): { acf: number[]; pacf: number[] }[] {
  const zeilen = text.split('\n'), aus: { acf: number[]; pacf: number[] }[] = [];
  let art: 'acf' | 'pacf' | null = null, ak: number[] = [], pk: number[] = [];
  const zahl = (s: string) => Number(s.replace(/^(-?)\./, '$10.'));
  for (const z of zeilen) {
    if (/^Autocorrelations/.test(z)) { if (ak.length && pk.length) { aus.push({ acf: ak, pacf: pk }); ak = []; pk = []; } art = 'acf'; continue; }
    if (/^Partial Autocorrelations/.test(z)) { art = 'pacf'; continue; }
    const m = /^\s*(\d+)\s+(-?\d*\.\d+)\s/.exec(z);
    if (m && art) (art === 'acf' ? ak : pk).push(zahl(m[2]!));
  }
  if (ak.length && pk.length) aus.push({ acf: ak, pacf: pk });
  return aus;
}
const diff = (x: number[], lag: number) => x.slice(lag).map((v, i) => v - x[i]!);

describe.skipIf(!da)('ACF und PACF gegen SPSS 32 (AirPassengers, log)', () => {
  const y = readFileSync(csv, 'utf8').trim().split('\n').slice(1).map(Number), ly = y.map(Math.log);
  const b = spssBloecke(readFileSync(dat, 'utf8'));
  const faelle: [string, number[]][] = [['log', ly], ['log, d = 1', diff(ly, 1)], ['log, d = 1, D = 1 (12)', diff(diff(ly, 12), 1)], ['LN, d = 1, D = 1 (12)', diff(diff(y.map(Math.log), 12), 1)]];
  it('vier Blöcke mit je 24 Verzögerungen gelesen', () => { expect(b.length).toBe(4); b.forEach(x => { expect(x.acf.length).toBe(24); expect(x.pacf.length).toBe(24); }); });
  faelle.forEach(([name, x], i) => {
    it(`${name}: alle 24 ACF- und PACF-Werte auf drei Stellen gleich`, () => {
      const a = zeitAcf(x, 24), p = zeitPacf(a)!;
      a.forEach((v, k) => expect(Math.abs(v - b[i]!.acf[k]!), `ACF ${k + 1}`).toBeLessThan(0.0006));
      p.forEach((v, k) => expect(Math.abs(v - b[i]!.pacf[k]!), `PACF ${k + 1}`).toBeLessThan(0.0006));
    });
  });
});
