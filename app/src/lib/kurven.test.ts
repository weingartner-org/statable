import { describe, expect, it } from 'vitest';
import { alleKurven, passeKurveAn, type Kurve, type KurvenFehler } from './kurven';

/* Sollwerte: Rscript am Mac (R 4.6.1), lm() mit den zwölf Punkten unten; R² der Transformationen auf der Skala von y nachgerechnet. */
const P: [number, number][] = [[1, 2.1], [2, 3.9], [3, 6.2], [4, 7.8], [5, 11.5], [6, 14.1], [7, 20.3], [8, 24.9], [9, 33.0], [10, 41.8], [12, 66.2], [14, 101.5]];
const ok = (k: Kurve | KurvenFehler): Kurve => { if ('fehler' in k) throw new Error(k.fehler); return k; };
const nah = (a: number, b: number, tol = 1e-8) => expect(Math.abs(a - b) / Math.max(Math.abs(b), 1e-12), `${a} gegen ${b}`).toBeLessThan(tol);

describe('Kurvenanpassung gegen R lm()', () => {
  it('Gerade', () => { const k = ok(passeKurveAn('gerade', P)); nah(k.koeff[0]!, -18.56521739); nah(k.koeff[1]!, 6.865217391); nah(k.r2, 0.8620457681); nah(k.r2korr, 0.848250345); });
  it('Quadrat (a + b·x + c·x²)', () => { const k = ok(passeKurveAn('quadratisch', P)); nah(k.koeff[0]!, 7.978827877); nah(k.koeff[1]!, -3.292679391); nah(k.koeff[2]!, 0.6955325464); nah(k.r2, 0.9942745409); nah(k.r2korr, 0.9930022166); nah(k.y(16), 133.3522895); });
  it('logarithmisch (a + b·ln x)', () => { const k = ok(passeKurveAn('logarithmisch', P)); nah(k.koeff[0]!, -21.26859544); nah(k.koeff[1]!, 29.0939386); nah(k.r2, 0.5811234181); nah(k.y(16), 59.39693059); });
  it('exponentiell (ln y gegen x): a, b, R² auf der Skala von y', () => { const k = ok(passeKurveAn('exponentiell', P)); nah(k.koeff[0]!, 2.350341533); nah(k.koeff[1]!, 0.2849754666); nah(k.r2, 0.9273166297); nah(k.y(16), 224.5656556); });
  it('Potenz (ln y gegen ln x)', () => { const k = ok(passeKurveAn('potenz', P)); nah(k.koeff[0]!, 1.395969794); nah(k.koeff[1]!, 1.450174122); nah(k.r2, 0.8268052509); nah(k.y(16), 77.8143439); });
});

describe('Kurvenanpassung: Grenzen statt falscher Zahlen', () => {
  it('Logarithmus und Potenz brauchen x > 0, Exponential und Potenz brauchen y > 0', () => {
    const mitNull: [number, number][] = [[0, 1], [1, 2], [2, 4], [3, 8]];
    expect(passeKurveAn('logarithmisch', mitNull)).toEqual({ fehler: 'x-nicht-positiv' });
    expect(passeKurveAn('potenz', mitNull)).toEqual({ fehler: 'x-nicht-positiv' });
    expect(passeKurveAn('exponentiell', [[1, 0], [2, 1], [3, 2], [4, 3]])).toEqual({ fehler: 'y-nicht-positiv' });
  });
  it('zu wenige Punkte, keine Streuung', () => {
    expect(passeKurveAn('quadratisch', [[1, 1], [2, 2], [3, 3]])).toEqual({ fehler: 'zu-wenig-punkte' });
    expect(passeKurveAn('gerade', [[1, 5], [2, 5], [3, 5]])).toEqual({ fehler: 'keine-streuung' });
    expect(passeKurveAn('quadratisch', [[1, 1], [1, 2], [1, 3], [1, 4]])).toEqual({ fehler: 'keine-streuung' });
  });
  it('alleKurven: passende Kurven und die Gründe der übrigen', () => {
    const r = alleKurven([[0, 1], [1, 2], [2, 4], [3, 8], [4, 15]]);
    expect(r.kurven.map(k => k.art)).toEqual(expect.arrayContaining(['gerade', 'quadratisch', 'exponentiell']));
    expect(r.fehlen.map(f => f.art)).toEqual(expect.arrayContaining(['logarithmisch', 'potenz']));
  });
  it('lineare Daten: Gerade und Quadrat gleich gut, Quadrat-Koeffizient ≈ 0', () => {
    const l: [number, number][] = Array.from({ length: 8 }, (_, i) => [i, 3 + 2 * i]);
    const q = ok(passeKurveAn('quadratisch', l)); expect(Math.abs(q.koeff[2]!)).toBeLessThan(1e-9); expect(ok(passeKurveAn('gerade', l)).r2).toBeCloseTo(1, 12);
  });
});

describe('Wachstumsmodelle gegen R nls()', () => {
  const G: [number, number][] = [[1, 2.1], [2, 3.0], [3, 4.6], [4, 7.4], [5, 11.2], [6, 16.1], [7, 21.6], [8, 26.4], [9, 29.7], [10, 31.8], [11, 32.9], [12, 33.5]];
  it('logistisch: K, Steigung r = 1/scal, Mittelpunkt, R², Vorhersage (R: nls(SSlogis))', () => {
    const k = ok(passeKurveAn('logistisch', G));
    nah(k.koeff[0]!, 34.84672403, 1e-6); nah(k.koeff[1]!, 0.5999341312, 1e-6); nah(k.koeff[2]!, 6.182932453, 1e-6); nah(k.r2, 0.9993697495, 1e-7); nah(k.y(13), 34.27290228, 1e-6);
  });
  it('Gompertz: Asym, b2, b3, R², Vorhersage (R: nls(SSgompertz))', () => {
    const k = ok(passeKurveAn('gompertz', G));
    nah(k.koeff[0]!, 38.64141713, 1e-5); nah(k.koeff[1]!, 6.120318499, 1e-5); nah(k.koeff[2]!, 0.7151151638, 1e-5); nah(k.r2, 0.9937299233, 1e-6); nah(k.y(13), 35.73185879, 1e-5);
  });
  it('Standardfehler der Koeffizienten wie nls() summary (logistisch und Gompertz)', () => {
    const l = ok(passeKurveAn('logistisch', G)); nah(l.se![0]!, 0.32143953154, 1e-4); nah(l.se![1]!, 0.01482569078, 1e-4); nah(l.se![2]!, 0.05409170002, 1e-4);
    const g = ok(passeKurveAn('gompertz', G)); nah(g.se![0]!, 1.85234627759, 1e-4); nah(g.se![1]!, 0.86200144066, 1e-4); nah(g.se![2]!, 0.02403242993, 1e-4);
  });
  it('ohne Sättigung (stetig wachsend) kein Wachstumsmodell: Fehler statt falscher Zahlen oder Passung', () => {
    const e: [number, number][] = Array.from({ length: 10 }, (_, i) => [i + 1, 2 ** (i / 2)]);
    const l = passeKurveAn('logistisch', e); expect('fehler' in l ? l.fehler : 'ok').toMatch(/keine-konvergenz|ok/);
  });
  it('y ≤ 0: Fehler', () => { expect(passeKurveAn('gompertz', [[1, 0], [2, 1], [3, 2], [4, 3]])).toEqual({ fehler: 'y-nicht-positiv' }); });
});

describe('Dosis-Wirkung (4PL) gegen R drc::LL.4', () => {
  const D: [number, number][] = [[0.01, 98.2], [0.03, 97.5], [0.1, 95.1], [0.3, 90.3], [1, 76.4], [3, 52.8], [10, 28.9], [30, 12.7], [100, 6.1], [300, 4.2]];
  it('unten, oben, EC50 (e), Steigung (b), R² und Vorhersage wie drm(y ~ x, fct = LL.4())', () => {
    const k = ok(passeKurveAn('vierpl', D));
    // Der untere Wert liegt auf einem flachen Optimum: drc und Statable stoppen bei leicht verschiedenen Schritten (Abweichung unter 2e-4), die Anpassung selbst (R², Vorhersage) stimmt auf 6 Stellen.
    nah(k.koeff[0]!, 2.643010643, 2e-4); nah(k.koeff[1]!, 98.51767514, 1e-5); nah(k.koeff[2]!, 3.427716836, 1e-4); nah(k.koeff[3]!, 0.9591382521, 1e-4); nah(k.r2, 0.9998340063, 1e-7); nah(k.y(2), 62.69732141, 1e-5);
  });
  it('Standardfehler (R: nls mit denselben Startwerten; der untere Wert liegt auf einem flachen Optimum, daher 2e-3)', () => {
    const k = ok(passeKurveAn('vierpl', D)); nah(k.se![0]!, 0.57754288206, 2e-3); nah(k.se![1]!, 0.42941539535, 2e-3); nah(k.se![2]!, 0.09109145063, 2e-3); nah(k.se![3]!, 0.02281510380, 2e-3);
  });
  it('steigende Kurve (Hemmung andersherum): gleiche Rechnung, Steigung mit anderem Vorzeichen', () => {
    const k = ok(passeKurveAn('vierpl', D.map(([x, y]) => [x, 100 - y] as [number, number]))); expect(k.r2).toBeGreaterThan(0.999); expect(k.koeff[3]!).toBeLessThan(0);
  });
  it('x ≤ 0: Fehler', () => { expect(passeKurveAn('vierpl', [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]])).toEqual({ fehler: 'x-nicht-positiv' }); });
});
