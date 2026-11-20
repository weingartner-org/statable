import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import erwartet from './testdaten/spaeter-a-erwartet.json';
import { beschleunigung, hesterberg, intervall, jackknife, normInter, Ziehung } from './bootstrap';

/* ===== Welle S-A, Teil 2: Bootstrap-Grundlage mit Perzentil und BCa (Fachblatt Abschnitt 2 und „Entscheidungen Opus“) =====
 * Sollwerte: scripts/spaeter-a-erwartet.R → testdaten/spaeter-a-erwartet.json (Abschnitt bootstrap): FESTE Bootstrap-Verteilungen t aus R (boot, set.seed), an denen die
 * deterministischen Teile auf 1e-9 treffen müssen (unabhängig vom Zufallsgenerator); dazu ein statistischer Test der JS-Ziehungen. Der Bauer ändert Test und JSON nicht.
 * Das Modul `lib/bootstrap.ts` (reine Funktionen, keine Oberfläche; Zufall bleibt lib/zufall.ts) hat diese API - sie ist hier festgelegt:
 *
 *   normInter(t: number[], alpha: number[]): number[]       boot:::norm.inter: nur endliche t; Rang rk = (R+1)·alpha; ganzzahlig → Ordnungsstatistik, sonst Interpolation auf der NORMALskala
 *       zwischen den Nachbarn; rk ≤ 1 bzw. ≥ R → kleinste bzw. größte Ziehung (kein Fehler, die Warnung macht intervall)
 *   jackknife(statistik: (indizes: Int32Array) => number, n: number): { t0; theta: number[]; L: number[] }     theta[i] = Statistik ohne Fall i; L[i] = (n − 1)(t0 − theta[i])
 *       - GENAU die Definition von boot::empinf(type = "jack") (nicht der Mittelwert der Auslassungen wie bei Efron/Tibshirani 14.15; bei Mittelwerten gleich, bei der Korrelation nicht)
 *   beschleunigung(L: number[]): number                      a = ΣL³ / (6·(ΣL²)^1,5); NaN wenn ΣL² = 0
 *   intervall(t: number[], t0: number, art: 'perzentil' | 'bca', niveau: number, L?: number[]): {
 *       art; niveau; lo: number | null; hi: number | null;   (null = nicht berechenbar, NIE NaN)
 *       B: number /* gültige Ziehungen *\/; ungueltig: number /* nicht endliche Ziehungen (NaN, ±Inf), wie is.finite in boot *\/; anteilGleich: number /* Anteil t == t0 *\/;
 *       z0?, a?, niveauLo?, niveauHi?  (nur bca: z0 = qnorm(Anteil t < t0) STRIKT kleiner, a aus L, angepasste Niveaus)
 *       warnungen: ('rand' | 'z0unendlich' | 'viele-gleiche' | 'a-undefiniert')[] }
 *       'rand' = ein Rang (B+1)·Niveau ≤ 1 oder ≥ B (Randwert benutzt); 'z0unendlich' = z0 nicht endlich (lo = hi = null); 'a-undefiniert' = ΣL² = 0 (lo = hi = null);
 *       'viele-gleiche' = Anteil t == t0 > 5 % (bei beiden Arten gemeldet; dann ist Perzentil die Voreinstellung)
 *   hesterberg(n: number): boolean                           true bei n < 30 (Hinweis: Bootstrap-Intervalle bei kleinen Stichproben meist zu schmal)
 *   class Ziehung { constructor(n, statistik, opt?: { startwert?: number /* 20261008 *\/; B?: number /* 9999 *\/ }); t0: number; t: number[]; B; startwert; n; fertig: boolean;
 *       weiter(anzahl: number): number /* Stand nach dem Block; in Blöcken, damit Fortschritt und „Abbrechen“ gehen *\/ }
 *       Ziehen mit Zurücklegen: indizes[i] = floor(zufall() · n) aus lib/zufall.ts mit dem Startwert; gleicher Startwert ⇒ gleiche t, unabhängig von der Blockgröße.
 *       Die Statistik bekommt ein Int32Array der Länge n mit Werten 0 … n − 1.
 * Entscheidungen Opus (nicht hier testbar, aber verlangt): Mediation bleibt bei Perzentil als Voreinstellung (BCa wählbar), B Mediation 5000, neue Optionen 10 000; Startwert sichtbar in „Gerechnet“.
 */

const B = (erwartet as any).bootstrap;
const nah = (ist: number, soll: number, tol = 1e-9) => expect(Math.abs(ist - soll), `${ist} gegen ${soll}`).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(soll)));
const nahListe = (ist: number[], soll: number[], tol = 1e-9) => { expect(ist.length).toBe(soll.length); soll.forEach((x, i) => nah(ist[i]!, x, tol)); };
const ID = (n: number) => Int32Array.from({ length: n }, (_, i) => i);
const mittelStat = (d: number[]) => (idx: Int32Array) => { let s = 0; for (const i of idx) s += d[i]!; return s / idx.length; };
const korStat = (x: number[], y: number[]) => (idx: Int32Array) => {
  const n = idx.length; let mx = 0, my = 0; for (const i of idx) { mx += x[i]!; my += y[i]!; } mx /= n; my /= n;
  let sxy = 0, sxx = 0, syy = 0; for (const i of idx) { sxy += (x[i]! - mx) * (y[i]! - my); sxx += (x[i]! - mx) ** 2; syy += (y[i]! - my) ** 2; }
  return sxy / Math.sqrt(sxx * syy);
};
const STAT: Record<string, (f: any) => (idx: Int32Array) => number> = { mean: f => mittelStat(f.daten), cor: f => korStat(f.daten.LSAT, f.daten.GPA) };

describe('norm.inter wie das R-Paket boot (Interpolation auf der Normalskala; Ränder)', () => {
  it('Niveaus über die ganze Spanne (0,05 % … 99,95 %) bei B = 999: gleiche Grenzen wie boot:::norm.inter', () => {
    const n = B.norm_inter; nahListe(normInter(n.t, n.alpha), n.soll, 1e-12);
  });
  it('ungültige Ziehungen (NaN, ±Inf) zählen nicht mit', () => {
    const n = B.norm_inter, mit = [NaN, ...n.t, Infinity, -Infinity, NaN];
    nahListe(normInter(mit, n.alpha), n.soll, 1e-12);
  });
  it('ganzzahliger Rang ist eine Ordnungsstatistik (B = 9999, 2,5 % → Rang 250), nicht interpoliert', () => {
    const f = B.faelle[0], t = [...f.t].sort((a: number, b: number) => a - b);
    expect(normInter(f.t, [0.025, 0.975])).toEqual([t[249], t[9749]]);
  });
});

describe('Jackknife und Beschleunigung a aus den Daten (R: empinf(type = "jack"))', () => {
  it('Mittelwert n = 12: Auslassungen, L und a', () => {
    const j = B.jackknife.mittel_n12, r = jackknife(mittelStat(j.daten), 12);
    nahListe(r.theta, j.loo, 1e-12); nahListe(r.L, j.L, 1e-12); nah(beschleunigung(r.L), j.a, 1e-12);
  });
  it('Korrelation Law School n = 15: L nach boot (t0 − Auslassung) - a = −0,0740879, NICHT −0,0756716 (Mittel der Auslassungen)', () => {
    const j = B.jackknife.korrelation_lawschool, r = jackknife(korStat(j.daten_LSAT, j.daten_GPA), 15);
    nahListe(r.theta, j.loo, 1e-12); nahListe(r.L, j.L, 1e-12); nah(beschleunigung(r.L), j.a, 1e-12);
    nah(j.a, -0.0740878669, 1e-8); expect(Math.abs(j.a - j.a_efron)).toBeGreaterThan(1e-3);
    nah(r.t0, 0.7763745, 1e-7);   // Efron & Tibshirani (1993): r = 0,776
  });
  it('n = 3 (Jackknife entartet, aber definiert)', () => {
    const j = B.jackknife.n3, r = jackknife(mittelStat(j.daten), 3);
    nahListe(r.L, j.L, 1e-12); nah(beschleunigung(r.L), j.a, 1e-12);
  });
  it('alle L gleich 0 (konstante Statistik): a ist NaN, nicht 0 und nicht Fehler', () => { expect(Number.isNaN(beschleunigung([0, 0, 0]))).toBe(true); });
});

describe('Perzentil- und BCa-Intervall an der festen Verteilung aus R (1e-9)', () => {
  for (const f of B.faelle) for (const st of f.stufen) it(`${f.name}: ${Math.round(st.niveau * 100)} %`, () => {
    const L = f.L as number[];
    const p = intervall(f.t, f.t0, 'perzentil', st.niveau);
    nah(p.lo!, st.perz_lo); nah(p.hi!, st.perz_hi); expect(p.B).toBe(f.B); expect(p.ungueltig).toBe(0);
    const b = intervall(f.t, f.t0, 'bca', st.niveau, L);
    nah(b.lo!, st.bca_lo); nah(b.hi!, st.bca_hi); nah(b.niveauLo!, st.niveau_lo, 1e-9); nah(b.niveauHi!, st.niveau_hi, 1e-9);
    nah(b.z0!, f.z0, 1e-9); nah(b.a!, f.a, 1e-9); nah(b.anteilGleich, f.anteil_gleich, 1e-12);
    expect(b.art).toBe('bca'); expect(b.niveau).toBe(st.niveau);
    expect(Number.isNaN(b.lo)).toBe(false); expect(Number.isNaN(b.hi)).toBe(false);
  });
  it('Daten → Jackknife → BCa: dieselben Grenzen, wenn L aus den Daten kommt (Mittelwert und Korrelation)', () => {
    for (const f of B.faelle.filter((x: any) => x.statistik !== 'median')) {
      const L = jackknife(STAT[f.statistik]!(f), f.n).L, st = f.stufen.find((s: any) => s.niveau === 0.95);
      const b = intervall(f.t, f.t0, 'bca', 0.95, L); nah(b.lo!, st.bca_lo); nah(b.hi!, st.bca_hi);
    }
  });
  it('Law-School (Efron & Tibshirani 1993, Tab. 3.2, r = 0,776): BCa 95 % liegt links unter dem Perzentil-Intervall (a < 0, z0 < 0) - Lehrbuchbild', () => {
    const f = B.faelle[1], st = f.stufen.find((s: any) => s.niveau === 0.95);
    expect(f.n).toBe(15); nah(f.t0, 0.7763745, 1e-7);
    expect(st.bca_lo).toBeLessThan(st.perz_lo); expect(f.a).toBeLessThan(0); expect(f.z0).toBeLessThan(0);
    const g = B.monte_carlo.gedruckt_nicht_scharf;   // eine veröffentlichte S-Plus-Rechnung (B = 1000): nur Plausibilität, ihr Monte-Carlo-Fehler ist groß
    expect(Math.abs(st.bca_lo - g.bca_lo)).toBeLessThan(0.05); expect(Math.abs(st.bca_hi - g.bca_hi)).toBeLessThan(0.02);
  });
});

describe('Warnungen und Sonderfälle: als Daten gemeldet, nie NaN', () => {
  it('Median mit vielen gleichen Werten (24,5 % der Ziehungen = t0): Warnung viele-gleiche; Ergebnis wie boot', () => {
    const f = B.faelle[2], st = f.stufen[0];
    const b = intervall(f.t, f.t0, 'bca', st.niveau, f.L); nah(b.lo!, st.bca_lo); nah(b.hi!, st.bca_hi);
    expect(b.warnungen).toEqual(f.warnungen); expect(f.warnungen).toEqual(['viele-gleiche']);
    expect(intervall(f.t, f.t0, 'perzentil', st.niveau).warnungen).toContain('viele-gleiche');
    nah(b.anteilGleich, f.anteil_gleich, 1e-12);
  });
  it('Mittelwerte und Korrelation haben keine Warnung', () => {
    for (const i of [0, 1, 3]) { const f = B.faelle[i]; expect(intervall(f.t, f.t0, 'bca', .95, f.L).warnungen).toEqual([]); }
  });
  const syn = (name: string) => B.synthetisch.find((x: any) => x.name === name);
  it('Rand: angepasstes Niveau jenseits von B/(B+1): Randwerte wie boot, Warnung rand', () => {
    const s = syn('rand_oben'), b = intervall(s.t, s.t0, 'bca', s.niveau, s.L);
    nah(b.lo!, s.boot_ergebnis[0]); nah(b.hi!, s.boot_ergebnis[1]); expect(b.warnungen).toContain('rand'); expect(b.warnungen).toEqual(s.warnungen);
  });
  it('Rand beim Perzentil-Intervall: Niveau 99,9 % bei B = 999 → Rang < 1: kleinste/größte Ziehung + Warnung', () => {
    const n = B.norm_inter, p = intervall(n.t, 0, 'perzentil', 0.999);
    expect(p.warnungen).toContain('rand'); expect(p.lo).toBe(Math.min(...(n.t as number[]))); expect(p.hi).toBe(Math.max(...(n.t as number[])));
  });
  for (const name of ['z0_unendlich', 'z0_minus_unendlich']) it(`${name}: BCa lässt sich nicht berechnen (boot bricht ab): lo = hi = null, Warnung z0unendlich; Perzentil geht`, () => {
    const s = syn(name), b = intervall(s.t, s.t0, 'bca', s.niveau, s.L);
    expect(s.boot_fehler).toContain('infinite'); expect(b.lo).toBeNull(); expect(b.hi).toBeNull(); expect(b.warnungen).toEqual(['z0unendlich']);
    const p = intervall(s.t, s.t0, 'perzentil', s.niveau); nah(p.lo!, s.perz[0]); nah(p.hi!, s.perz[1]); expect(p.warnungen).not.toContain('z0unendlich');
  });
  it('a nicht definiert (alle L = 0): lo = hi = null, Warnung a-undefiniert', () => {
    const s = syn('konstant_L_null'), b = intervall(s.t, s.t0, 'bca', s.niveau, s.L);
    expect(s.boot_fehler).toContain("'a' is NA"); expect(b.lo).toBeNull(); expect(b.hi).toBeNull(); expect(b.warnungen).toEqual(['a-undefiniert']);
  });
  it('ungültige Ziehungen (NaN, ±Inf, NA→NaN) werden gezählt und lassen sich weg: Ergebnis wie boot mit is.finite', () => {
    const s = syn('mit_ungueltigen'), t = (s.t as (number | null)[]).map(v => v ?? NaN);
    const b = intervall(t, s.t0, 'bca', s.niveau, s.L);
    expect(b.ungueltig).toBe(7); expect(b.B).toBe(9999 - 7); nah(b.lo!, s.boot_ergebnis[0]); nah(b.hi!, s.boot_ergebnis[1]);
    expect(intervall(t, s.t0, 'perzentil', s.niveau).ungueltig).toBe(7);
  });
  it('Hesterberg-Hinweis bei n < 30', () => { expect(hesterberg(29)).toBe(true); expect(hesterberg(30)).toBe(false); expect(hesterberg(12)).toBe(true); });
});

describe('Ziehung: reproduzierbar, in Blöcken, mit Zurücklegen', () => {
  const daten = [3.1, 4.7, 2.2, 5.9, 3.8, 4.1, 2.9, 6.3, 3.5, 4.4, 5.2, 3.0];
  it('Voreinstellung: B = 9999, Startwert 20261008', () => {
    const z = new Ziehung(12, mittelStat(daten)); expect(z.B).toBe(9999); expect(z.startwert).toBe(20261008); expect(z.n).toBe(12);
    nah(z.t0, daten.reduce((a, b) => a + b, 0) / 12, 1e-12);
  });
  it('gleicher Startwert → gleiche Verteilung, auch bei anderer Blockgröße; anderer Startwert → andere', () => {
    const a = new Ziehung(12, mittelStat(daten), { B: 500 }), b = new Ziehung(12, mittelStat(daten), { B: 500 }), c = new Ziehung(12, mittelStat(daten), { B: 500, startwert: 7 });
    a.weiter(500); for (let i = 0; i < 5; i++) b.weiter(100); c.weiter(500);
    expect(a.t).toEqual(b.t); expect(a.t).not.toEqual(c.t); expect(a.fertig).toBe(true);
  });
  it('weiter meldet den Stand und hört bei B auf', () => {
    const a = new Ziehung(12, mittelStat(daten), { B: 250 });
    expect(a.weiter(100)).toBe(100); expect(a.fertig).toBe(false); expect(a.weiter(100)).toBe(200); expect(a.weiter(100)).toBe(250); expect(a.fertig).toBe(true); expect(a.t.length).toBe(250); expect(a.weiter(10)).toBe(250);
  });
  it('die Statistik bekommt n Indizes aus 0 … n − 1 (mit Zurücklegen: Wiederholungen kommen vor)', () => {
    let wiederholt = 0, schlecht = 0; const z = new Ziehung(12, (idx) => { if (idx.length !== 12 || idx.some(i => i < 0 || i > 11 || !Number.isInteger(i))) schlecht++; if (new Set(idx).size < 12) wiederholt++; return idx[0]!; }, { B: 300 });
    z.weiter(300); expect(schlecht).toBe(0); expect(wiederholt).toBeGreaterThan(250);
  });
  it('jeder Fall wird etwa gleich oft gezogen', () => {
    const zaehl = new Array(12).fill(0); const z = new Ziehung(12, (idx) => { for (const i of idx) zaehl[i]++; return 0; }, { B: 2000 }); z.weiter(2000);
    for (const c of zaehl) expect(Math.abs(c - 2000)).toBeLessThan(250);
  });
});

describe('Statistischer Test der JS-Ziehungen (Law School, B = 9999, 20 Startwerte): Mittel der Grenzen innerhalb von 4 Sigma der Monte-Carlo-Referenz (B = 400 000 in R)', () => {
  const mc = B.monte_carlo, f = B.faelle[1];
  const lauf = (startwert: number) => {
    const z = new Ziehung(15, korStat(f.daten.LSAT, f.daten.GPA), { startwert, B: 9999 }); z.weiter(9999);
    const L = jackknife(korStat(f.daten.LSAT, f.daten.GPA), 15).L;
    const bca = intervall(z.t, z.t0, 'bca', 0.95, L), perz = intervall(z.t, z.t0, 'perzentil', 0.95);
    return [bca.lo!, bca.hi!, perz.lo!, perz.hi!];
  };
  it('BCa und Perzentil, untere und obere Grenze', () => {
    const r = Array.from({ length: 20 }, (_, i) => lauf(i + 1)), mittel = [0, 1, 2, 3].map(k => r.reduce((a, x) => a + x[k]!, 0) / 20);
    const ref = [mc.referenz.bca_lo, mc.referenz.bca_hi, mc.referenz.perz_lo, mc.referenz.perz_hi], sd = [mc.sd_r.bca_lo, mc.sd_r.bca_hi, mc.sd_r.perz_lo, mc.sd_r.perz_hi];
    ['BCa unten', 'BCa oben', 'Perzentil unten', 'Perzentil oben'].forEach((n, k) => {
      expect(Math.abs(mittel[k]! - ref[k]!), `${n}: Mittel ${mittel[k]} gegen Referenz ${ref[k]}`).toBeLessThanOrEqual(mc.toleranz_faktor * sd[k]!);
    });
  });
  it('die Streuung der JS-Läufe ist von der Größe wie in R (nicht kleiner als ein Viertel, nicht größer als das Vierfache)', () => {
    const r = Array.from({ length: 20 }, (_, i) => lauf(i + 1)), sd = (v: number[]) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };
    const ist = [0, 1, 2, 3].map(k => sd(r.map(x => x[k]!))), soll = [mc.sd_r.bca_lo, mc.sd_r.bca_hi, mc.sd_r.perz_lo, mc.sd_r.perz_hi];
    ist.forEach((v, k) => { expect(v).toBeGreaterThan(soll[k]! / 4); expect(v).toBeLessThan(soll[k]! * 4); });
  });
});

describe('Mediation nutzt die gemeinsame Grundlage (Fachblatt 2.2 / 2.4; Entscheidung Opus: Perzentil bleibt Voreinstellung, B = 5000)', () => {
  const quelle = readFileSync(new URL('./mediation.ts', import.meta.url), 'utf8');
  it('mediation.ts importiert lib/bootstrap und behauptet nicht mehr „type = 7“', () => {
    expect(/from '\.\/bootstrap'/.test(quelle), 'import … from ./bootstrap').toBe(true);
    expect(/type\s*=\s*7|type 7/.test(quelle), 'Satz „Perzentile wie R quantile(type = 7)“ berichtigen (boot-Interpolation)').toBe(false);
  });
  it('5000 Ziehungen und fester Startwert bleiben', () => { expect(quelle).toMatch(/ZIEHUNGEN\s*=\s*5000/); expect(quelle).toMatch(/STARTWERT\s*=\s*20261008/); });
});
