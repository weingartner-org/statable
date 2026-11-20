import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-d-erwartet.json';
import { prozessRechne, prozessRechneAsync, type ProzessDaten } from './prozess';

/* Bauer A, Welle S-D: die Rechnung in Häppchen (für Lade-Animation und „Abbrechen“) gibt dieselben Zahlen wie die Rechnung am Stück; Abbruch gibt null. */
const dat = (erwartet as any).g14.daten;
const d7: ProzessDaten = { x: dat.x, m: dat.m1, y: dat.y, w: dat.w };
const W = [2.216, 3.1, 4.4];

describe('prozessRechneAsync', () => {
  for (const art of ['perzentil', 'bca'] as const) it(`${art}: gleiche Intervalle wie prozessRechne (B = 300), Fortschritt läuft bis 1`, async () => {
    const f: number[] = [], a = await prozessRechneAsync(7, d7, { B: 300, wWerte: W, art, fortschritt: x => f.push(x) }), b = prozessRechne(7, d7, { B: 300, wWerte: W, art });
    expect(a).not.toBeNull(); expect(a!.intervalle).toEqual(b.intervalle); expect(a!.ungueltig).toBe(b.ungueltig); expect(f.at(-1)).toBe(1);
  });
  it('Abbruch vor dem Start und mitten im Jackknife: null', async () => {
    expect(await prozessRechneAsync(7, d7, { B: 300, wWerte: W, abbruch: () => true })).toBeNull();
    let n = 0; expect(await prozessRechneAsync(7, d7, { B: 20, wWerte: W, art: 'bca', abbruch: () => ++n > 2 })).toBeNull();   // 1: vor den Ziehungen, 2: danach, 3: zu Beginn des Jackknife
  });
});
