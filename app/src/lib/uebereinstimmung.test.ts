import { beforeAll, describe, expect, it } from 'vitest';
import { kappa, iccErgebnis, saetzeKappa, saetzeIcc } from './ergebnis';
import { KAPPA_STUFEN_MAX, kappaZuVieleStufen, uebereinstimmungsArt, type Ctx } from './verfahren';
import { icc, kappaAusTabelle, kappaTabelle, type KappaTabelle } from './uebereinstimmung';
import { finde } from './tabelle';
import { nodeEngine } from './testengine';

/* Vergleichswerte aus R (Skript: scripts/uebereinstimmung-erwartet.R):
 *   Kappa: irr::kappa2 (value, z, p) und psych::cohen.kappa (KI); ICC: psych::ICC (ICC2/ICC3, F, p, Grenzen). */
const A = [1, 2, 2, 3, 3, 4, 1, 2, 3, 4, 2, 2, 3, 3, 1, 4, 4, 2, 3, 1, 2, 3, 2, 4, 1, 3, 2, 3, 4, 2];
const B = [1, 2, 3, 3, 2, 4, 2, 2, 3, 3, 2, 1, 3, 4, 1, 4, 3, 2, 3, 1, 3, 3, 2, 4, 2, 3, 2, 2, 4, 1];
const paare = A.map((a, i) => [a, B[i]!] as [number, number]);
const R1 = [9, 6, 8, 7, 10, 6, 5, 8, 7, 9, 4, 6], R2 = [7, 6, 9, 6, 10, 7, 6, 9, 7, 10, 6, 8], R3 = [8, 5, 7, 7, 9, 7, 4, 9, 6, 8, 5, 5];
const f = (v: number, s = 5) => v.toFixed(s);

describe('Cohens Kappa', () => {
  const t: KappaTabelle = kappaTabelle(paare);
  it('Tabelle: alle vergebenen Kategorien, quadratisch', () => {
    expect(t.kategorien).toEqual([1, 2, 3, 4]);
    expect(t.tab).toEqual([[3, 2, 0, 0], [2, 6, 2, 0], [0, 2, 6, 1], [0, 0, 2, 4]]);   // wie PSPP-Kreuztabelle
    expect(t.n).toBe(30);
    expect(t.uebereinstimmung).toBeCloseTo(19 / 30, 10);
  });
  it('ungewichtet: wie R (irr::kappa2, psych::cohen.kappa)', () => {
    const k = kappaAusTabelle(t.tab);
    expect([f(k.kappa, 6), f(k.z, 6), f(k.p, 6)]).toEqual(['0.496183', '4.568486', '0.000005']);
    // Eigener Fehler nach Fleiss, Cohen & Everitt (1969) = psych::cohen.kappa (KI .2559/.7364); PSPP/SPSS geben .122723 - die vierte Stelle weicht ab.
    expect([f(k.se, 6)]).toEqual(['0.122578']);
    expect([f(k.kiLo, 4), f(k.kiHi, 4)]).toEqual(['0.2559', '0.7364']);
  });
  it('PSPP-Tabelle (CROSSTABS /STATISTICS=KAPPA) gibt dieselben Zahlen', async () => {
    const e = await nodeEngine();
    e.run('NEW FILE.\nDATA LIST LIST /a b.\nBEGIN DATA\n' + A.map((v, i) => `${v} ${B[i]}`).join('\n') + '\nEND DATA.\n');
    const r = finde(e.run('CROSSTABS /TABLES=a BY b /STATISTICS=KAPPA /CELLS=COUNT.'), /^Symmetric Measures$/)!;
    const zahlen = r.n.flat().filter((v): v is number => v !== undefined);
    expect(f(zahlen[0]!, 6)).toBe('0.496183'); expect(f(zahlen[1]!, 6)).toBe('0.122723'); expect(f(zahlen[2]!, 6)).toBe('4.568486');   // Wert, asymptotischer Fehler, T
  });
  it('gewichtet linear und quadratisch: wie R (irr::kappa2 weight = equal / squared)', () => {
    const l = kappaAusTabelle(t.tab, 'linear'), q = kappaAusTabelle(t.tab, 'quadratisch');
    expect([f(l.kappa, 6), f(l.z, 6)]).toEqual(['0.659794', '5.272656']);
    expect([f(q.kappa, 6), f(q.z, 6), f(q.p, 5)]).toEqual(['0.807018', '4.425442', '0.00001']);
    expect([f(l.kiLo, 3), f(l.kiHi, 3)]).toEqual(['0.486', '0.834']);   // psych::cohen.kappa: .4858 / .8338
    expect([f(q.kiLo, 3), f(q.kiHi, 3)]).toEqual(['0.696', '0.918']);   // psych::cohen.kappa: .6957 / .9183
  });
  it('Kategorie nur bei einer Person: Tabelle bleibt quadratisch', () => {
    const t2 = kappaTabelle([[1, 1], [2, 2], [3, 2], [1, 1], [3, 2], [2, 2], [1, 2]]);
    expect(t2.kategorien).toEqual([1, 2, 3]); expect(t2.tab.length).toBe(3);
    expect(Number.isFinite(kappaAusTabelle(t2.tab).kappa)).toBe(true);
  });
  it('Text-Kategorien', () => {
    const t3 = kappaTabelle([['ja', 'ja'], ['nein', 'ja'], ['nein', 'nein'], ['ja', 'ja']]);
    expect(t3.kategorien).toEqual(['ja', 'nein']); expect(t3.tab).toEqual([[2, 0], [1, 1]]);
  });
});

describe('ICC (Zweifach-ANOVA, vollständige Fälle)', () => {
  const daten = R1.map((_, i) => [R1[i]!, R2[i]!, R3[i]!]);
  it('drei Beurteilende: ICC(2,1), ICC(2,k), ICC(3,1), ICC(3,k) mit KI und F wie psych::ICC', () => {
    const r = icc(daten);
    expect([r.n, r.k, r.df1, r.df2]).toEqual([12, 3, 11, 22]);
    expect([f(r.f, 4)]).toEqual(['11.5918']);
    expect(r.p).toBeLessThan(1e-6);
    expect([r.absolut.einzel.icc, r.absolut.einzel.kiLo, r.absolut.einzel.kiHi].map(v => f(v, 4))).toEqual(['0.7374', '0.4511', '0.9072']);
    expect([r.absolut.mittel.icc, r.absolut.mittel.kiLo, r.absolut.mittel.kiHi].map(v => f(v, 4))).toEqual(['0.8939', '0.7115', '0.9670']);
    expect([r.konsistenz.einzel.icc, r.konsistenz.einzel.kiLo, r.konsistenz.einzel.kiHi].map(v => f(v, 4))).toEqual(['0.7793', '0.5297', '0.9232']);
    expect([r.konsistenz.mittel.icc, r.konsistenz.mittel.kiLo, r.konsistenz.mittel.kiHi].map(v => f(v, 4))).toEqual(['0.9137', '0.7717', '0.9730']);
  });
  it('zwei Beurteilende', () => {
    const r = icc(R1.map((v, i) => [v, R3[i]!]));
    expect([r.absolut.einzel.icc, r.absolut.einzel.kiLo, r.absolut.einzel.kiHi].map(v => f(v, 4))).toEqual(['0.8489', '0.5625', '0.9539']);
    expect([r.konsistenz.einzel.icc, r.konsistenz.einzel.kiLo, r.konsistenz.einzel.kiHi].map(v => f(v, 4))).toEqual(['0.8640', '0.5957', '0.9589']);
    expect([r.konsistenz.mittel.icc, r.konsistenz.mittel.kiLo, r.konsistenz.mittel.kiHi].map(v => f(v, 4))).toEqual(['0.9271', '0.7466', '0.9790']);
  });
});

describe('Sätze und Wahl der Art', () => {
  it('Kappa: PSPP-Zahlen (SE .1227), Satz, APA und Marken', async () => {
    const e = await nodeEngine();
    e.run('NEW FILE.\nDATA LIST LIST /a b.\nBEGIN DATA\n' + A.map((v, i) => `${v} ${B[i]}`).join('\n') + '\nEND DATA.\n');
    const k = kappa(e.run('CROSSTABS /TABLES=a BY b /STATISTICS=KAPPA /CELLS=COUNT.'), 'a', 'b', paare, true);
    expect(k.quelle).toBe('pspp');
    expect([f(k.kappa, 4), f(k.se, 4), f(k.kiLo, 4), f(k.kiHi, 4)]).toEqual(['0.4962', '0.1227', '0.2557', '0.7367']);
    const s = saetzeKappa(k, n => (n === 'a' ? 'Note A' : 'Note B'));
    expect(s.haupt).toBe('Die Beurteilungen in „Note A“ und „Note B“ stimmen bei 63\u00a0% der 30 Fälle überein; um den Zufall bereinigt ist die Übereinstimmung mäßig (Cohens κ = ,50).');
    expect(s.apa).toBe('κ = ,50, p < ,001, 95 %-KI [,26; ,74], n = 30');
    expect(s.marken.map(m => m.text)).toContain('Übereinstimmung: mäßig · κ = ,50');
    const lin = saetzeKappa({ ...k, ...k.alle.linear, gewicht: 'linear' }, n => n);
    expect(lin.apa).toBe('κ (linear) = ,66, p < ,001, 95 %-KI [,49; ,83], n = 30');
  });
  it('Kappa ohne PSPP-Tabelle (Kategorie nur bei einer Person) rechnet mit eigenem Code', () => {
    const k = kappa([], 'a', 'b', [[1, 1], [2, 2], [3, 2], [1, 1], [3, 2], [2, 2], [1, 2]], false);
    expect(k.quelle).toBe('eigen'); expect(Number.isFinite(k.kappa)).toBe(true);
  });
  it('ICC: Satz, APA, Marken (absolute Übereinstimmung ist die Vorgabe)', () => {
    const r = iccErgebnis(['r1', 'r2', 'r3'], R1.map((_, i) => [R1[i]!, R2[i]!, R3[i]!]), 12);
    expect(r.modell).toBe('absolut');
    const s = saetzeIcc(r);
    expect(s.haupt).toBe('Die Übereinstimmung der 3 Beurteilenden ist bei 12 Fällen mäßig (absolute Übereinstimmung: die Werte sollen gleich sein).');
    expect(s.zusatz).toContain('ICC(2,1) = ,74');
    expect(s.apa).toBe('ICC(2,1) = ,74, 95 %-KI [,45; ,91]; ICC(2,3) = ,89, 95 %-KI [,71; ,97]; F(11, 22) = 11,59, p < ,001');
    expect(s.marken.some(m => m.hinweis)).toBe(true);   // n = 12 < 30
    expect(saetzeIcc({ ...r, modell: 'konsistenz' }).apa).toContain('ICC(3,1) = ,78');
  });
  it('perfekte Übereinstimmung: ICC = 1 statt NaN', () => {
    const r = icc([[1, 1], [2, 2], [3, 3], [4, 4]]);
    expect(r.absolut.einzel.icc).toBe(1); expect(r.konsistenz.mittel.icc).toBe(1);
    expect(() => icc([[2, 2], [2, 2], [2, 2]])).toThrow();
  });
  it('Kappa mit Punktwerten (B13): Warnung vor dem Rechnen bei mehr als 15 verschiedenen Werten', () => {
    const zahl = new Set(['p1', 'p2', 'note1', 'note2', 'p3']), v: Record<string, number> = { p1: 723, p2: 742, note1: 5, note2: 6, p3: 40 };
    const c: Ctx = { verschieden: n => v[n] ?? 10, gueltig: () => 30, istZahl: n => zahl.has(n) };
    expect(KAPPA_STUFEN_MAX).toBe(15);
    expect(kappaZuVieleStufen(['p1', 'p2'], c, 'kappa')).toBe(742);   // Auswahl „Stufen oder Noten (Kappa)“ bei Punktwerten
    expect(kappaZuVieleStufen(['note1', 'note2'], c)).toBe(0);
    expect(kappaZuVieleStufen(['p1', 'p2'], c)).toBe(0);              // ohne Wunsch wählt Statable den ICC
    expect(kappaZuVieleStufen(['p1', 'p2', 'p3'], c)).toBe(0);            // drei Spalten ohne Wunsch: ICC
    expect(kappaZuVieleStufen(['p1', 'p2', 'p3'], c, 'kappa')).toBe(742);   // Wunsch „Stufen oder Noten“: Fleiss' Kappa, gleiche Warnung (Fachblatt G2)
    const text = (n: string) => ({ ...c, istZahl: () => false, verschieden: () => (n === 'viele' ? 30 : 4) });
    expect(kappaZuVieleStufen(['a', 'b'], text('viele'))).toBe(30);   // Text mit 30 Kategorien -> Kappa gewählt, Warnung
    expect(kappaZuVieleStufen(['a', 'b'], text('wenig'))).toBe(0);
  });
  it('Auswahl: zwei Kategorienspalten -> Kappa, Zahlenspalten -> ICC, Wunsch nur wenn es passt', () => {
    const zahl = new Set(['n1', 'n2', 'n3', 'note1', 'note2']), wenige: Record<string, number> = { note1: 4, note2: 5, n1: 20, n2: 18, n3: 19, t1: 3, t2: 3 };
    const c: Ctx = { verschieden: n => wenige[n] ?? 10, gueltig: () => 30, istZahl: n => zahl.has(n) };
    expect(uebereinstimmungsArt(['note1', 'note2'], c).art).toBe('kappa');
    expect(uebereinstimmungsArt(['n1', 'n2'], c).art).toBe('icc');
    expect(uebereinstimmungsArt(['n1', 'n2', 'n3'], c).art).toBe('icc');
    expect(uebereinstimmungsArt(['t1', 't2'], c).art).toBe('kappa');
    expect(uebereinstimmungsArt(['t1', 't2', 't3'], c).art).toBe('inter');          // drei Spalten mit Kategorien: Fleiss' Kappa und Krippendorffs Alpha (Fachblatt G2)
    expect(uebereinstimmungsArt(['t1', 'n1', 'n2'], c).art).toBe('unklar');         // Text und Zahlen mit vielen Werten gemischt
    expect(uebereinstimmungsArt(['note1', 'note2', 't1'], c).art).toBe('inter');
    expect(uebereinstimmungsArt(['note1', 'note2'], c).art).toBe('kappa');          // zwei Spalten: unverändert Cohens Kappa
    expect(uebereinstimmungsArt(['note1', 'note2'], c, 'icc').art).toBe('icc');
    expect(uebereinstimmungsArt(['n1', 'n2', 'n3'], c, 'kappa').art).toBe('inter');  // Wunsch Kappa bei drei Zahlenspalten: Fleiss' Kappa, Alpha
    expect(uebereinstimmungsArt(['t1', 't2'], c, 'icc').art).toBe('kappa');          // ICC nur für Zahlenspalten
  });
});
