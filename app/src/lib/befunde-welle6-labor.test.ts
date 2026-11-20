/* Welle 6, Befunde der Fachprüfung (L1-L4): jeder behobene Befund bekommt einen eigenen Test. Sollwerte stammen aus R (testdaten/welle6-erwartet.json) oder sind Rechenproben. */
import { describe, expect, it } from 'vitest';
import { inSprache } from './sitzung.svelte';
import { ereignisImTraeger, links, linksStreng, rechts, rechtsStreng, zwischen, quantil, type Verteilung } from './verteilungen';
import { anteilstest, ablehnungsbereich, pWert } from './anteilstest';
import { exakteUeberdeckung, ueberdeckung } from './lernlabor';
import { prozent as vProzent, wahrscheinlichkeit as vWk } from './verstehenformat';
import * as S from './lernlaborsaetze';
import erwartet from './testdaten/welle6-erwartet.json';

const de = <T>(f: () => T) => inSprache('de', f), en = <T>(f: () => T) => inSprache('en', f);
const norm = (t: string) => t.replace(/[  ]/g, ' ');

describe('L1: winzige Wahrscheinlichkeiten und Rundungsreste', () => {
  it('Normal z = ±40: die Rechnung liefert 0, die Anzeige sagt „kleiner als“ statt 0; außerhalb des Trägers bleibt es 0', () => {
    const v = { art: 'normal', mu: 0, sigma: 1 } as const;
    expect(rechts(v, 40)).toBe(0); expect(links(v, -40)).toBe(0);
    expect(ereignisImTraeger(v, 'rechts', 40)).toBe(true); expect(ereignisImTraeger(v, 'links', -40)).toBe(true); expect(ereignisImTraeger(v, 'zwischen', 39, 40, 41)).toBe(true);
    expect(norm(de(() => vWk(0, true)))).toBe('kleiner als 1 · 10⁻²⁹⁰'); expect(norm(en(() => vWk(0, true)))).toBe('less than 1 · 10⁻²⁹⁰');
    expect(norm(de(() => vProzent(0, true)))).toMatch(/^kleiner als 1 · 10⁻²⁸⁸ ?%$/);
    expect(de(() => vWk(0, false))).toBe('0'); expect(norm(de(() => vProzent(0, false)))).toMatch(/^0 ?%$/);
    const chi = { art: 'chi2', df: 3 } as const;
    expect(ereignisImTraeger(chi, 'links', 0)).toBe(false); expect(ereignisImTraeger(chi, 'linksStreng', -1)).toBe(false); expect(ereignisImTraeger(chi, 'rechts', 5)).toBe(true);
    const b = { art: 'binom', n: 10, p: 0.5 } as const;
    expect(ereignisImTraeger(b, 'rechts', 11)).toBe(false); expect(ereignisImTraeger(b, 'rechtsStreng', 10)).toBe(false); expect(ereignisImTraeger(b, 'links', -1)).toBe(false); expect(ereignisImTraeger(b, 'links', 0)).toBe(true);
    expect(ereignisImTraeger(b, 'zwischen', 11, 11, 12)).toBe(false);
  });
  it('Voller Träger: P(0 ≤ X ≤ n) ist genau 1 (kein „1 − 2,78·10⁻¹⁵“), Binomial/Poisson/hypergeometrisch, auch große n', () => {
    for (const [v, a, b] of [[{ art: 'binom', n: 10, p: 0.3 }, 0, 10], [{ art: 'binom', n: 1000, p: 0.5 }, 0, 1000], [{ art: 'binom', n: 100000, p: 0.01 }, 0, 100000], [{ art: 'hyper', N: 49, K: 6, n: 6 }, 0, 6], [{ art: 'hyper', N: 50, K: 10, n: 20 }, 0, 20]] as const)
      expect(zwischen(v, a, b), JSON.stringify(v)).toBe(1);
    expect(zwischen({ art: 'binom', n: 100, p: 0.5 }, 0, 100)).toBe(1);
    expect(zwischen({ art: 'binom', n: 100, p: 0.5 }, 0, 99)).toBeCloseTo(1 - 2 ** -100, 15); expect(zwischen({ art: 'binom', n: 100, p: 0.5 }, 1, 100)).toBeCloseTo(1 - 2 ** -100, 15);
    expect(zwischen({ art: 'binom', n: 100, p: 0.5 }, 30, 70)).toBeCloseTo(0.99996, 4);                       // R: pbinom(70,100,.5) - pbinom(29,100,.5)
    expect(zwischen({ art: 'poisson', lambda: 4.5 }, 0, 1000)).toBe(1);
    expect(vWk(zwischen({ art: 'binom', n: 10, p: 0.3 }, 0, 10))).toBe('1');
  });
  it('Quantil bei Gleichheit: Binomial n = 3, p = 0,5, q = 0,5 → x = 1, erreicht genau 0,5', () => {
    const r = quantil({ art: 'binom', n: 3, p: 0.5 }, 0.5); expect(r.x).toBe(1); expect(r.erreicht).toBeCloseTo(0.5, 12);
  });
});

describe('L3: Entscheidung und p-Wert mit derselben Toleranz; Mengen', () => {
  it('x ∈ K ⟺ p ≤ α (Toleranz 1e-7 relativ) im ganzen Gitter von n, p0, α, Seite und allen x', () => {
    let geprueft = 0;
    for (const n of [5, 10, 20, 50, 100]) for (const p0 of [0.05, 0.1, 0.25, 0.5, 0.9]) for (const alpha of [0.01, 0.05, 0.0625, 0.1]) for (const seite of ['links', 'rechts', 'zwei'] as const)
      for (let x = 0; x <= n; x++) { const e = anteilstest({ n, p0, alpha, seite, x }); expect(e.pKlein, `n=${n} p0=${p0} α=${alpha} ${seite} x=${x}`).toBe(e.ablehnen); geprueft++; }
    expect(geprueft).toBeGreaterThan(5000);
  });
  it('Gleichheit: n = 4, p0 = 0,5, rechts, α = 1/16: P(X ≥ 4) = 0,0625 genau → in K, und p ≤ α', () => {
    const e = anteilstest({ n: 4, p0: 0.5, alpha: 0.0625, seite: 'rechts', x: 4 }); expect(e.bereich.rechts).toBe(4); expect(e.ablehnen).toBe(true); expect(e.pKlein).toBe(true); expect(e.pWert).toBeCloseTo(0.0625, 15);
    expect(ablehnungsbereich(4, 0.5, 0.0625, 'rechts').tatsaechlichAlpha).toBeCloseTo(0.0625, 15); expect(pWert(4, 0.5, 4, 'rechts')).toBeCloseTo(0.0625, 15);
  });
});

describe('L4: Überdeckung exakt, Sätze, Stellen', () => {
  it('exakte Überdeckung (Summe über dbinom) gegen R: Wilson und Wald, alle Fälle des Prüfers', () => {
    const L4 = (erwartet as unknown as { l4: { ueberdeckung: { n: number; p: number; niveau: number; wilson: number; wald: number }[]; ueberdeckung_niveau: { n: number; p: number; niveau: number; wilson: number }[] } }).l4;
    for (const u of L4.ueberdeckung) { expect(exakteUeberdeckung(u.p, u.n, u.niveau, 'wilson')).toBeCloseTo(u.wilson, 9); expect(exakteUeberdeckung(u.p, u.n, u.niveau, 'wald')).toBeCloseTo(u.wald, 9); }
    for (const u of L4.ueberdeckung_niveau) expect(exakteUeberdeckung(u.p, u.n, u.niveau, 'wilson')).toBeCloseTo(u.wilson, 9);
    expect(exakteUeberdeckung(0.3, 30000, 0.95, 'wilson')).toBeGreaterThan(0.94);   // großes n: nur um den Gipfel summiert
  });
  it('Satz nennt das gewählte Niveau und sagt, wenn Wilson deutlich darunter liegt (n = 30, p = 0,005: exakt etwa 86 %)', () => {
    const ex = exakteUeberdeckung(0.005, 30, 0.95, 'wilson'); expect(ex).toBeCloseTo(0.8604, 4);
    const s = norm(de(() => S.satzExakteUeberdeckung(ex, 0.95, false)));
    expect(s).toContain('Bei kleinem n und p nahe 0 oder 1 überdeckt auch Wilson seltener als das Niveau, hier etwa'); expect(s).toContain(`${Math.round(ex * 100)} von 100`);
    expect(de(() => S.satzExakteUeberdeckung(0.951, 0.95, false))).toBe('');
    const w = norm(de(() => S.satzExakteUeberdeckung(ex, 0.95, true, 0.85))); expect(w).toContain('Schulformel (Wald)'); expect(w).toContain('85,0 %');
    expect(norm(de(() => S.lehreKiNiveau(0.9)))).toContain('mit 90 %'); expect(norm(de(() => S.lehreKiNiveau(0.99)))).toContain('etwa 99 von 100 Mal');
    expect(norm(en(() => S.lehreKiNiveau(0.9)))).toContain('with 90%');
  });
  it('NPV 0,99999 wird nicht zu „1,0000 (100,00 %)“; sehr nahe an 1 genug Stellen', () => {
    const t = norm(de(() => S.wk(0.99999))); expect(t).not.toContain('1,0000'); expect(t).not.toContain('100,00'); expect(t).toMatch(/^0,99999\d* \(99,999\d* %\)$/);
    expect(norm(de(() => S.wk(0.9999999)))).toMatch(/^0,99999990/); expect(norm(de(() => S.wk(0.9)))).toBe('0,9000 (90,00 %)'); expect(norm(de(() => S.wk(1)))).toBe('1,0000 (100,00 %)');
  });
  it('Prozentschreibweise nach dem Sprachprofil (proz): Deutsch mit geschütztem Leerzeichen, Englisch ohne', () => {
    expect(de(() => S.prozent(0.0443))).toBe('4,43 %'); expect(en(() => S.prozent(0.0443))).toBe('4.43%');
    expect(norm(en(() => S.satzUeberdeckung({ intervalle: [], anzahl: 100, ueberdeckt: 95, wahr: 0.3, niveau: 0.9, startwert: 1, nummer: 0 }, 0, 100, 95)))).toContain('about 90 times in 100');
  });
});

describe('Nachprüfung: „1 − …“ nahe 1 aus dem direkt gerechneten Schwanz', () => {
  const zeige = (v: Verteilung, p: number, rest: number) => norm(de(() => vWk(p, false, rest)));
  it('Normal P(X ≤ 8) = 1 − 6,22 · 10⁻¹⁶ (R: pnorm(8, lower.tail = FALSE) = 6,220961e-16), nicht 1 − 6,66 · 10⁻¹⁶; spiegelbildlich P(X ≥ −8)', () => {
    const v = { art: 'normal', mu: 0, sigma: 1 } as const;
    expect(rechtsStreng(v, 8)).toBeCloseTo(6.220960574e-16, 24); expect(zeige(v, links(v, 8), rechtsStreng(v, 8))).toBe('1 − 6,22 · 10⁻¹⁶');
    expect(zeige(v, rechts(v, -8), linksStreng(v, -8))).toBe('1 − 6,22 · 10⁻¹⁶');
    expect(zeige(v, links(v, 8), rechtsStreng(v, 8))).not.toContain('6,66');
  });
  it('Alle Verteilungen: Binomial, t, χ², F, Poisson - die Anzeige nahe 1 folgt R (lower.tail = FALSE)', () => {
    const fall: [Verteilung, number, number][] = [
      [{ art: 'binom', n: 100, p: 0.5 }, 80, 1.351381261e-10], [{ art: 't', df: 3 }, 60, 5.099796837e-06], [{ art: 'chi2', df: 3 }, 60, 5.878230728e-13],
      [{ art: 'f', d1: 3, d2: 12 }, 2000, 1.852922221e-16], [{ art: 'poisson', lambda: 4.5 }, 30, 2.790699674e-16]
    ];
    for (const [v, x, soll] of fall) {
      const rest = rechtsStreng(v, x); expect(Math.abs(rest / soll - 1), JSON.stringify(v)).toBeLessThan(1e-8);
      const t = zeige(v, links(v, x), rest);
      if (soll < 1e-8) expect(t, JSON.stringify(v)).toBe(`1 − ${norm(de(() => expS(soll)))}`);
      else expect(t.startsWith('0,9999'), t).toBe(true);
    }
  });
  it('P(X ≥ x) nahe 1 spiegelbildlich: Binomial P(X ≥ 20) bei n = 100, p = 0,5 hat den Rest P(X < 20) direkt', () => {
    const v = { art: 'binom', n: 100, p: 0.5 } as const, rest = linksStreng(v, 20);
    expect(rest).toBeGreaterThan(0); expect(rest).toBeLessThan(1e-8); expect(zeige(v, rechts(v, 20), rest)).toBe(`1 − ${norm(de(() => expS(rest)))}`);
    expect(zeige(v, rechts(v, 20), rest)).toMatch(/^1 − \d,\d\d · 10⁻[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/);
  });
  it('ohne Gegenschwanz bleibt das Verhalten wie bisher (Aufrufer ohne rest), und ein rest von 0 wird nicht benutzt', () => {
    expect(de(() => vWk(0.5))).toBe('0,5000'); expect(de(() => vWk(0.99999))).toMatch(/^0,99999/); expect(de(() => vWk(0.9999999999, false, 0))).toMatch(/^1 − /);
  });
});

describe('Nachprüfung: Überdeckungssatz', () => {
  it('Ziel = gewähltes Niveau; deutlich darunter (n = 8, p = 2 %: exakt 85,1 %) ein ganzer anderer Satz ohne „etwa 95 von 100“', () => {
    const e = ueberdeckung({ art: 'anteil', p: 0.02, n: 8, niveau: 0.95, startwert: 1 }), ex = exakteUeberdeckung(0.02, 8, 0.95, 'wilson');
    expect(ex).toBeCloseTo(0.851, 3);
    const unten = norm(de(() => S.satzUeberdeckung(e, 0, 100, e.ueberdeckt, ex)));
    expect(unten).toContain('Das Verfahren zielt auf ein Niveau von 95 %, überdeckt aber bei diesen Eingaben auf lange Sicht nur etwa 85 von 100 Mal'); expect(unten).not.toContain('etwa 95 von 100'); expect(unten).not.toContain('soll es');
    expect(norm(en(() => S.satzUeberdeckung(e, 0, 100, e.ueberdeckt, ex)))).toContain('aims at a level of 95%, but with these inputs it covers the true value only about 85 times in 100');
    const ok = norm(de(() => S.satzUeberdeckung(e, 0, 100, e.ueberdeckt, 0.94)));
    expect(ok).toContain('Das Verfahren zielt auf ein Niveau von 95 %: auf lange Sicht soll es etwa 95 von 100 Mal überdecken'); expect(ok).not.toContain('nur etwa');
    expect(norm(de(() => S.satzUeberdeckung(e, 0, 100, e.ueberdeckt)))).toContain('soll es etwa 95 von 100 Mal');   // t-Intervall: kein exakter Wert nötig
    const n90 = ueberdeckung({ art: 'anteil', p: 0.3, n: 40, niveau: 0.9, startwert: 1 });
    expect(norm(de(() => S.satzUeberdeckung(n90, 0, 100, n90.ueberdeckt, exakteUeberdeckung(0.3, 40, 0.9))))).toContain('Niveau von 90 %: auf lange Sicht soll es etwa 90 von 100');
  });
});
/** 1,35 · 10⁻¹⁰ wie die Anzeige (drei gültige Stellen). */
function expS(v: number): string { const [m, e] = v.toExponential(2).split('e'); const hoch = String(Number(e)).split('').map(c => ({ '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' } as Record<string, string>)[c] ?? c).join(''); return `${m!.replace('.', ',')} · 10${hoch}`; }
