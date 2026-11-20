import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import type { Haeufigkeit, Saetze, Verteilung } from './ergebnis';
import { anpassungFuer, anpassungen, anteilAusText, mitAnpassung, tabellenAnpassung, lillieSatz } from './anpassungsaetze';
import { lilliefors } from './anpassung';
import ERW from './testdaten/welle7-erwartet.json';

/* Welle 7, T1: Sätze und Tabellen zu Lilliefors und χ²-Anpassung; Zahlen prüft anpassung.test.ts gegen R und PSPP. Hier: nie „ist normalverteilt“, Cochran-Hinweis, eigene Anteile, ungültige Eingabe. */
type Z = Record<string, any>;
const E = ERW as unknown as { lilliefors: Z[]; chi2_anpassung: Z[] };
const haeuf = (name: string, anz: number[]): Haeufigkeit => ({ name, n: anz.reduce((a, b) => a + b, 0), fehlend: 0, werte: anz.map((a, i) => ({ name: `K${i + 1}`, anzahl: a, anteil: a / anz.reduce((x, y) => x + y, 0) })) });
const verteilung = (extra: Partial<Verteilung>): Verteilung => ({ art: 'verteilung', zahlen: [], gruppen: [], ...extra });
const basis: Saetze = { haupt: 'H', zusatz: 'Z', vorsicht: 'V', apa: 'A', marken: [] };
const mitSprache = <T,>(sp: 'de' | 'en', f: () => T): T => { const alt = s.einst.sprache; s.einst.sprache = sp; try { return f(); } finally { s.einst.sprache = alt; } };
const kennzahl = (name: string, x: number[]) => ({ name, n: x.length, m: 0, sd: 1, min: 0, max: 1, lil: lilliefors(x)! });

describe('Lilliefors in der Verteilung', () => {
  const klein = E.lilliefors.find(f => f.name === 'd_n20_formel1_p_klein')!, gross = E.lilliefors.find(f => f.name === 'e_n30_poly_b')!;
  it('weicht ab / spricht nicht dagegen, nie „ist normalverteilt“', () => {
    const a = lillieSatz(kennzahl('Reaktionszeit', klein.x)), b = lillieSatz(kennzahl('Punkte', gross.x));
    expect(a).toMatch(/weicht die Verteilung nach dem Lilliefors-Test von einer Normalverteilung ab \(D = ,241, p = ,003\)/);
    expect(b).toMatch(/spricht der Lilliefors-Test nicht gegen eine Normalverteilung \(D = ,078, p = ,910\)/); expect(a + b).not.toMatch(/ist normalverteilt/);
  });
  it('Sätze, APA, Vorsicht (Q-Q-Diagramm) und Tabelle', () => {
    const e = verteilung({ zahlen: [{ ...kennzahl('Reaktionszeit', klein.x), sw: { w: 0.77, p: 0.0003, n: 20 } }] });
    const t = mitAnpassung(basis, e);
    expect(t.zusatz).toContain('Lilliefors-Test'); expect(t.apa).toBe('A; Lilliefors D = ,241, p = ,003'); expect(t.vorsicht).toBe('V');   // der Hinweis zu Shapiro-Wilk steht schon in den Sätzen der Verteilung: nicht zweimal
    const nurLil = mitAnpassung(basis, verteilung({ zahlen: [kennzahl('Reaktionszeit', klein.x)] })); expect(nurLil.vorsicht).toMatch(/belegt keine/); expect(nurLil.vorsicht).toMatch(/Q-Q-Diagramm zeigt mehr/);
    expect(t.marken.some(m => m.erklaer === 'lilliefors' && m.hinweis)).toBe(true);
    const tab = tabellenAnpassung(e)[0]!; expect(tab.cells.map(c => c.t)).toEqual(expect.arrayContaining(['Shapiro-Wilk (W)', 'Lilliefors (D)']));
    expect(tab.cells.some(c => c.t.includes('Asymp'))).toBe(false);
  });
  it('ohne Tests oder Kategorien bleibt alles, wie es ist', () => { expect(mitAnpassung(basis, verteilung({}))).toBe(basis); expect(tabellenAnpassung(verteilung({}))).toEqual([]); });
});

describe('χ²-Anpassung in der Verteilung', () => {
  it('Eingabe der Anteile: Komma, Prozent, Gewichte', () => {
    expect(anteilAusText('25')).toBe(25); expect(anteilAusText('12,5 %')).toBe(12.5); expect(anteilAusText('0.5')).toBe(0.5); expect(anteilAusText('')).toBeNull(); expect(anteilAusText('0')).toBeNull(); expect(anteilAusText('abc')).toBeNull();
  });
  it('Gleichverteilung: nicht signifikant belegt keine Gleichverteilung', () => {
    const e = verteilung({ gruppen: [haeuf('Lieblingsfach', [18, 25, 22, 35])] }), t = mitAnpassung(basis, e);
    expect(t.zusatz).toContain('weichen nicht signifikant von einer Gleichverteilung ab (χ²-Anpassungstest, χ²(3, N = 100) = 6,32, p = ,097)'); expect(t.zusatz).toContain('belegt keine Gleichverteilung');
    expect(t.apa).toBe('A; χ²(3, N = 100) = 6,32, p = ,097');
  });
  it('signifikant: sagt, welche Kategorie am stärksten abweicht', () => {
    const t = mitAnpassung(basis, verteilung({ gruppen: [haeuf('Wahl', [60, 40])] }));
    expect(t.zusatz).toContain('sind nicht gleichmäßig verteilt'); expect(t.zusatz).toContain('Am stärksten weicht „K1“ ab (beobachtet 60, erwartet 50)'); expect(t.zusatz).toContain('p = ,046');
  });
  it('eigene Anteile (Mendel): Zahlen wie das Lehrbuch; Gewichte werden normiert', () => {
    const e = verteilung({ gruppen: [haeuf('Erbsen', [315, 108, 101, 32])], anteile: { Erbsen: ['9', '3', '3', '1'] } }), a = anpassungFuer(e.gruppen[0]!, e.anteile!.Erbsen)!;
    expect(a.eigen).toBe(true); expect(a.r.chi2).toBeCloseTo(0.470, 3); expect(a.r.p).toBeCloseTo(0.925, 3);
    expect(mitAnpassung(basis, e).zusatz).toContain('weichen nicht signifikant von den vorab festgelegten Anteilen ab (χ²-Anpassungstest gegen vorab festgelegte Anteile 9 : 3 : 3 : 1,'); expect(mitAnpassung(basis, e).apa).toContain('(gegen vorab festgelegte Anteile 9 : 3 : 3 : 1)');
    const tab = tabellenAnpassung(e)[0]!; expect(tab.footnotes[0]!.t).toMatch(/^Vorab festgelegte Anteile 9 : 3 : 3 : 1\./);
  });
  it('unbrauchbare Eingabe: Gleichverteilung und der Satz sagt es', () => {
    const e = verteilung({ gruppen: [haeuf('Wahl', [60, 40])], anteile: { Wahl: ['60', ''] } }); const a = anpassungFuer(e.gruppen[0]!, e.anteile!.Wahl)!;
    expect(a.eigen).toBe(false); expect(a.ungueltig).toBe(true); expect(mitAnpassung(basis, e).zusatz).toContain('unvollständig oder keine Zahlen größer als 0');
    expect(anpassungFuer(e.gruppen[0]!, ['60', '40', '5'])!.eigen).toBe(false);
  });
  it('Cochran: streng → p unsicher; mild → unkritisch', () => {
    const streng = mitAnpassung(basis, verteilung({ gruppen: [haeuf('Selten', [3, 1, 9, 2])] })).zusatz;
    expect(streng).toMatch(/Achtung: Bei „Selten“ wird in 4 von 4 Kategorien weniger als 5 erwartet/); expect(streng).toContain('das p ist unsicher');
    const mild = mitAnpassung(basis, verteilung({ gruppen: [haeuf('Fast', [30, 28, 35, 25, 32, 2])], anteile: { Fast: ['0,2', '0,2', '0,2', '0,2', '0,18', '0,02'] } })).zusatz; expect(mild).not.toContain('Achtung'); expect(mild).toMatch(/noch unkritisch/);
    expect(tabellenAnpassung(verteilung({ gruppen: [haeuf('Selten', [3, 1, 9, 2])] }))[0]!.footnotes[0]!.t).toContain('das p ist unsicher');
  });
  it('englisch', () => { expect(mitSprache('en', () => mitAnpassung(basis, verteilung({ gruppen: [haeuf('Choice', [18, 25, 22, 35])] })).zusatz)).toContain('do not deviate significantly from a uniform distribution'); });
  it('nicht rechenbar: keine Sätze (Kategorie mit Nachkommastellen, keine Beobachtung)', () => { expect(anpassungFuer(haeuf('x', [0, 0]))).toBeNull(); expect(anpassungFuer({ ...haeuf('x', [3, 4]), werte: [{ name: 'a', anzahl: 2.5, anteil: 0.5 }, { name: 'b', anzahl: 3, anteil: 0.5 }] })).toBeNull(); });
});

describe('Fachprüfung: eigene Anteile nur vorab, Kategorien statt metrischer Zahlen', () => {
  const e0 = (extra: Partial<Verteilung> = {}) => verteilung({ gruppen: [haeuf('Fach', [48, 22, 18, 12])], anteile: { Fach: ['40', '30', '20', '10'] }, ...extra });
  it('Satz und APA-Zeile nennen die Anteile „40 : 30 : 20 : 10“', () => {
    const t = mitAnpassung(basis, e0());
    expect(t.zusatz).toContain('gegen vorab festgelegte Anteile 40 : 30 : 20 : 10'); expect(t.apa).toContain('(gegen vorab festgelegte Anteile 40 : 30 : 20 : 10)');
    expect(t.zusatz).not.toContain('nach dem Ergebnis geändert');
  });
  it('nach dem Ergebnis geänderte Anteile: Hinweis zuerst, in Satz, APA-Zeile und Tabelle', () => {
    const t = mitAnpassung(basis, e0({ anteileGeaendert: { Fach: true } }));
    const hinweis = 'Die Anteile wurden nach dem Ergebnis geändert - das p gilt dann nicht mehr als Test einer vorab festgelegten Annahme.';
    expect(t.zusatz.indexOf(hinweis)).toBeGreaterThan(-1); expect(t.zusatz.indexOf(hinweis)).toBeLessThan(t.zusatz.indexOf('Die Häufigkeiten bei'));
    expect(t.apa).toContain('nach dem Ergebnis geändert'); expect(tabellenAnpassung(e0({ anteileGeaendert: { Fach: true } }))[0]!.footnotes[0]!.t.startsWith(hinweis)).toBe(true);
    expect(mitSprache('en', () => mitAnpassung(basis, e0({ anteileGeaendert: { Fach: true } })).zusatz)).toContain('The proportions were changed after the result');
  });
  it('Gleichverteilung kennt weder Anteile noch Hinweis', () => {
    const t = mitAnpassung(basis, verteilung({ gruppen: [haeuf('Fach', [48, 22, 18, 12])], anteileGeaendert: { Fach: true } }));
    expect(t.zusatz).not.toMatch(/Anteile|geändert/); expect(t.apa).not.toMatch(/gegen/);
  });
  it('nur Kategorien: eine metrische Zahlenspalte mit wenigen Werten bekommt keinen χ²-Test, aber den Satz zum Normalverteilungstest', () => {
    const metrisch = { ...haeuf('Punkte', [5, 9, 12, 7, 3]), kategorie: false }, kategorie = { ...haeuf('Note', [5, 9, 12, 7, 3]), kategorie: true };
    const z = { name: 'Punkte', n: 36, m: 3, sd: 1, min: 1, max: 5, stufen: true };
    expect(anpassungen(verteilung({ gruppen: [metrisch] })).length).toBe(0); expect(anpassungen(verteilung({ gruppen: [kategorie] })).length).toBe(1);
    const t = mitAnpassung(basis, verteilung({ zahlen: [z], gruppen: [metrisch] }));
    expect(t.zusatz).toContain('Mit nur wenigen verschiedenen Werten sagt ein Normalverteilungstest wenig; das Q-Q-Diagramm zeigt mehr.'); expect(t.zusatz).not.toContain('χ²-Anpassungstest');
    expect(tabellenAnpassung(verteilung({ zahlen: [z], gruppen: [metrisch] }))).toEqual([]);
    expect(mitAnpassung(basis, verteilung({ gruppen: [haeuf('Alt', [5, 9])] })).zusatz).toContain('χ²-Anpassungstest');   // alte Dateien ohne Kennzeichen: Kategorien
  });
  it('nach geänderten Anteilen: „angegebene“ statt „vorab festgelegte“ Anteile - in Satz, APA-Zeile und Fußnote, de und en', () => {
    for (const sp of ['de', 'en'] as const) {
      const t = mitSprache(sp, () => mitAnpassung(basis, e0({ anteileGeaendert: { Fach: true } }))), f = mitSprache(sp, () => tabellenAnpassung(e0({ anteileGeaendert: { Fach: true } }))[0]!.footnotes[0]!.t);
      const satz = t.zusatz.slice(t.zusatz.search(sp === 'de' ? /Die Häufigkeiten bei/ : /The frequencies for/));
      expect(satz).not.toMatch(/vorab festgelegt|fixed beforehand/); expect(t.apa).not.toMatch(/vorab festgelegt|fixed beforehand/); expect(f.replace(/Die Anteile wurden nach dem Ergebnis geändert[^.]*\./, '').replace(/The proportions were changed after the result[^.]*\./, '')).not.toMatch(/vorab festgelegt|fixed beforehand/);
      expect(satz).toMatch(sp === 'de' ? /von den angegebenen Anteilen ab \(χ²-Anpassungstest gegen die Anteile 40 : 30 : 20 : 10/ : /from the stated proportions/);
    }
    const n = mitAnpassung(basis, e0({ gruppen: [haeuf('Fach', [40, 30, 20, 10])], anteileGeaendert: { Fach: true } })).zusatz;
    expect(n).toContain('weichen nicht signifikant von den angegebenen Anteilen ab');
    expect(mitAnpassung(basis, e0()).zusatz).toContain('vorab festgelegten Anteilen');   // ohne Änderung bleibt es „vorab festgelegt“
  });
});
