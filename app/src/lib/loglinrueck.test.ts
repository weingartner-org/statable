import { describe, expect, it } from 'vitest';
import { soll3 } from './testdaten/field3';
import { anpassen, erzeugende, kWegTabelle, loglinRueckwaerts, ohneTerm, rueckwaertsAusDaten, zellTabelle, zellZeilen, type ZellTabelle } from './loglinrueck';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { logHuelle } from './loglinear';

/* Sollwerte: R MASS::loglm (Opus), docs/fachblaetter/sollwerte/field-stufe3.json, Abschnitt loglinear: HairEyeColor (Hair 4 × Eye 4 × Sex 2), n = 592.
 * ⚠ In der Sollwert-Datei steht bei k = 1 (G² = 309,5256, df = 28) das Ergebnis von loglm(~ 1): Das ist NICHT das Modell „alle 32 Zellen gleich“.
 *   Dieses hat G² = 475,118, df = 31 (R von Hand: 2 · Σ o · ln(o / (592 / 32)); `loglm(~ 1)` lässt die Tabelle auf drei Randzeilen zusammenfallen). Darum prüft der Test k = 1 gegen die
 *   von Hand gerechneten Werte und k = 2, 3 gegen die Datei. Die Datei bleibt unverändert (Sollwerte gehören dem Prüfer).
 */
const s = soll3.loglinear;
// HairEyeColor in der Reihenfolge Hair × Eye × Sex (R: Männer zuerst, dann Frauen); Zeile = Haare (Black, Brown, Red, Blond), Spalte = Augen (Brown, Blue, Hazel, Green).
const MAENNER = [[32, 11, 10, 3], [53, 50, 25, 15], [10, 10, 7, 7], [3, 30, 5, 8]], FRAUEN = [[36, 9, 5, 2], [66, 34, 29, 14], [16, 7, 7, 7], [4, 64, 5, 8]];
const tab: ZellTabelle = (() => { const z: number[] = []; for (let h = 0; h < 4; h++) for (let a = 0; a < 4; a++) { z.push(MAENNER[h]![a]!, FRAUEN[h]![a]!); } return { dims: [4, 4, 2], zahl: z, n: z.reduce((x, y) => x + y, 0) }; })();
/* ⚠ Toleranz bei den Zahlen, die in der Sollwert-Datei aus MASS::loglm stammen (k = 3 und Schritt 1): loglm rechnet mit loglin (IPF, eps = 0,1) und weicht um 1,1e-6 relativ vom exakten
 * glm ab. Exakt (R glm, poisson, von Hand abgefragt): Modell mit allen Zweifach-Wechselwirkungen G² = 6,761250418772, df 9; Unabhängigkeit G² = 166,300139500487, X² = 164,924717380;
 * Gleichverteilung G² = 475,117989076447, X² = 557,621621620; Endmodell G² = 11,763722868927, df 12. Gegen diese exakten Werte gilt 1e-9. */
const nah = (a: number, b: number, rel = 5e-6) => expect(Math.abs(a - b) <= rel * Math.abs(b), `${a} gegen ${b}`).toBe(true);
const namen = ['Hair', 'Eye', 'Sex'];
const idx = (n: string) => n.split(':').map(x => namen.indexOf(x)).sort((a, b) => a - b);

describe('Loglineare Analyse wie SPSS HILOGLINEAR gegen R', () => {
  it('exakte glm-Werte (1e-9)', () => {
    const t = kWegTabelle(tab);
    nah(t[2]!.g2Hoeher, 6.761250418772, 1e-9); nah(t[1]!.g2Hoeher, 166.300139500487, 1e-9); nah(t[1]!.x2Hoeher, 164.924717380, 1e-9);
    nah(t[0]!.g2Hoeher, 475.117989076447, 1e-9); nah(t[0]!.x2Hoeher, 557.621621620, 1e-9); nah(t[2]!.x2Hoeher, 6.869027239, 1e-9);
    nah(loglinRueckwaerts(tab, 0.05).g2, 11.763722868927, 1e-9);
  });
  it('die Tabelle hat 592 Fälle', () => { expect(tab.n).toBe(592); });
  it('K-Weg- und höhere Effekte sind 0 (k = 2 und 3 gegen die Sollwerte, k = 1 von Hand)', () => {
    const t = kWegTabelle(tab);
    nah(t[0]!.g2Hoeher, 475.118, 1e-6); expect(t[0]!.dfHoeher).toBe(31);
    for (const k of [2, 3]) { nah(t[k - 1]!.g2Hoeher, s.kweg_und_hoeher.G2[k - 1]); expect(t[k - 1]!.dfHoeher).toBe(s.kweg_und_hoeher.df[k - 1]); }
  });
  it('genau k-Weg-Effekte sind 0 (k = 2 und 3 gegen die Sollwerte; k = 1 aus 475,118 − 166,300 bei df 7)', () => {
    const t = kWegTabelle(tab);
    nah(t[0]!.g2Genau, 475.118 - s.kweg_und_hoeher.G2[1]); expect(t[0]!.dfGenau).toBe(7);
    for (const k of [2, 3]) { nah(t[k - 1]!.g2Genau, s.kweg_genau.G2[k - 1]); expect(t[k - 1]!.dfGenau).toBe(s.kweg_genau.df[k - 1]); }
  });
  it('Rückwärts-Eliminierung: Schritte, Endmodell, G², df, p', () => {
    const r = loglinRueckwaerts(tab, 0.05);
    const entf = r.schritte.filter(x => x.entfernt).map(x => x.entfernt!.map(i => namen[i]).join(':'));
    expect(entf).toEqual(s.rueckwaerts.map((x: { entfernt: string }) => x.entfernt));
    s.rueckwaerts.forEach((x: { dG2: number; ddf: number; p: number }, i: number) => {
      const c = r.schritte[i]!.kandidaten.find(k => k.term.join('-') === r.schritte[i]!.entfernt!.join('-'))!;
      nah(c.dG2, x.dG2); expect(c.dDf).toBe(x.ddf); nah(c.p, x.p);
    });
    const ende = logHuelle(s.endmodell.map(idx), 3).map(t => t.join('-')).sort();
    expect(r.terme.map(t => t.join('-')).sort()).toEqual(ende);
    nah(r.g2, s.end_G2); expect(r.df).toBe(s.end_df); nah(r.p, s.end_p);
    expect(r.schritte.at(-1)!.entfernt).toBeNull();
  });
  it('Endmodell: erwartete Häufigkeiten erhalten die Ränder, Summe 592', () => {
    const r = loglinRueckwaerts(tab, 0.05), z = zellZeilen(tab, r.erwartet, [['Black', 'Brown', 'Red', 'Blond'], ['Brown', 'Blue', 'Hazel', 'Green'], ['Male', 'Female']]);
    nah(z.reduce((a, b) => a + b.erw, 0), 592, 1e-9); expect(z).toHaveLength(32); expect(z[0]!.stufen).toEqual(['Black', 'Brown', 'Male']);
    // Rand Hair × Eye bleibt erhalten (Term im Modell)
    nah(z.filter(c => c.stufen[0] === 'Black' && c.stufen[1] === 'Brown').reduce((a, b) => a + b.erw, 0), 68, 1e-9);
  });
  it('Kriterium: p = 1 entfernt nichts, ein kleines p entfernt mehr', () => {
    const nie = loglinRueckwaerts(tab, 1); expect(nie.schritte).toHaveLength(1); expect(nie.schritte[0]!.entfernt).toBeNull(); expect(nie.df).toBe(0);   // p > 1 gibt es nicht: nichts wird entfernt
    const viel = loglinRueckwaerts(tab, 0.0001), normal = loglinRueckwaerts(tab, 0.05);
    expect(viel.schritte.length).toBeGreaterThan(normal.schritte.length); expect(viel.g2).toBeGreaterThan(normal.g2); expect(viel.df).toBeGreaterThan(normal.df);
  });
  it('Hilfen: erzeugende Klasse, Entfernen eines Terms hierarchisch', () => {
    expect(erzeugende([[0], [1], [0, 1], [0, 1, 2]])).toEqual([[0, 1, 2]]);
    expect(ohneTerm([[0, 1, 2]], [0, 1, 2]).map(t => t.join('-')).sort()).toEqual(['0-1', '0-2', '1-2']);
    expect(ohneTerm([[0, 1], [0, 2]], [0, 1]).map(t => t.join('-')).sort()).toEqual(['0-2', '1']);
  });
  it('IPF: Unabhängigkeit ergibt G² 166,30 bei df 24', () => { const a = anpassen(tab, [[0], [1], [2]]); nah(a.g2, s.kweg_und_hoeher.G2[1]); expect(a.df).toBe(24); expect(a.konvergiert).toBe(true); });
});

describe('Rückwärts aus den Zeilen einer Tabelle (Text-Spalten und Häufigkeitsspalte, ohne R)', () => {
  const sp = (name: string, art: 'text' | 'zahl'): Spalte => ({ name, bezeichnung: '', art, niveau: art === 'text' ? 'nominal' : 'metrisch', format: art === 'text' ? 'A8' : 'F8.0', fehlend: [], fehlendText: '', werteLabels: {} });
  const H = ['Black', 'Brown', 'Red', 'Blond'], A = ['Brown', 'Blue', 'Hazel', 'Green'];
  const zeilen: Wert[][] = []; for (let h = 0; h < 4; h++) for (let a = 0; a < 4; a++) { zeilen.push([H[h]!, A[a]!, 'Male', MAENNER[h]![a]!]); zeilen.push([H[h]!, A[a]!, 'Female', FRAUEN[h]![a]!]); }
  const spalten = [sp('Hair', 'text'), sp('Eye', 'text'), sp('Sex', 'text'), sp('Freq', 'zahl')];
  it('liefert dieselben Schritte und das Endmodell wie der Sollwert', () => {
    const l = rueckwaertsAusDaten(['Hair', 'Eye', 'Sex'], 'Freq', zeilen, spalten, 0.05);
    expect(l.tab.n).toBe(592); expect(l.tab.dims.slice().sort()).toEqual([2, 4, 4]);
    nah(l.rueck.g2, s.end_G2); expect(l.rueck.df).toBe(s.end_df); nah(l.rueck.p, s.end_p);
    expect(l.rueck.schritte.filter(x => x.entfernt)).toHaveLength(2);
    expect(l.labels[0]!.slice().sort()).toEqual(H.slice().sort());
    nah(l.kweg[1]!.g2Hoeher, s.kweg_und_hoeher.G2[1]);
  });
  it('ohne Häufigkeitsspalte zählt jede Zeile einmal', () => {
    const einzeln: Wert[][] = []; for (const z of zeilen) for (let i = 0; i < (z[3] as number); i++) einzeln.push([z[0]!, z[1]!, z[2]!]);
    const l = rueckwaertsAusDaten(['Hair', 'Eye', 'Sex'], null, einzeln, spalten.slice(0, 3), 0.05);
    expect(l.tab.n).toBe(592); nah(l.rueck.g2, s.end_G2);
  });
});
