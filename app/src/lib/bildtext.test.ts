import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { s } from './sitzung.svelte';
import { ladeSprache } from '../i18n/laufzeit';
import { umformen } from '../../i18n/auszug.mjs';
import { bildtext, MAX_LISTE, MAX_ZEILEN, type Art, type ArtDaten, type BildText } from './bildtext';
import { verlaufsart, pearson, z, sauber } from './bildtext/zahlen';
import { zusammenhang, R_SCHWELLE } from './bildtext/streu';
import { qqEnden, ENDE_SCHWELLE } from './bildtext/qq';
import { schneidetNull } from './bildtext/forest';
import { anteilBei } from './bildtext/kaplan';

/* Wächter für lib/bildtext/ (Barrierefreiheit Welle 4): Beispieldaten → erwartete Sätze (de und en), Grenzfälle, keine BookAccess-Zeichen, Regeln der Muster einzeln. */
const vorher = s.einst.sprache;
afterEach(() => { s.einst.sprache = vorher; });
const mit = <T>(sp: 'de' | 'en' | 'xx', f: () => T): T => { s.einst.sprache = sp; return f(); };

const quartile = (n: number): [number, number][] => Array.from({ length: n }, (_, i) => [i - n / 2, i - n / 2] as [number, number]);
const BEISPIELE: { [A in Art]: ArtDaten[A] } = {
  histogramm: { name: 'Alter', grenzen: [0, 10, 20, 30], anzahl: [3, 12, 5], n: 20, mittel: 17.2, median: 16 },
  saeulen: { kategorieName: 'Gruppe', kategorien: ['A', 'B', 'C'], wertName: 'Mittelwert von Alter', reihen: [{ werte: [3.5, 4.25, 2] }] },
  kreis: { name: 'Fach', teile: [{ name: 'Psych', wert: 30 }, { name: 'Bio', wert: 10 }] },
  linie: { xAchse: { name: 'Jahr' }, yAchse: { name: 'Umsatz', einheit: 'Mio. Euro' }, x: [2020, 2021, 2022, 2023], reihen: [{ werte: [1, 2, 3.5, 4] }] },
  streu: { xAchse: { name: 'Alter' }, yAchse: { name: 'Größe' }, punkte: [[1, 2], [2, 4.1], [3, 5.9], [4, 8.2]], gerade: { a: 0, b: 2, r2: 0.99 } },
  boxplot: { name: 'Alter', gruppenName: 'Gruppe', gruppen: [{ name: 'A', n: 20, unten: 1, q1: 3, median: 5, q3: 7, oben: 9, ausreisser: [15] }, { name: 'B', n: 20, unten: 2, q1: 4, median: 6, q3: 8, oben: 10 }] },
  mittelwerte: { name: 'Alter', gruppenName: 'Gruppe', fehler: 'ki95', gruppen: [{ name: 'A', n: 10, mittel: 5, unten: 4, oben: 6 }, { name: 'B', n: 12, mittel: 7.5, unten: 6.1, oben: 8.9 }] },
  qq: { name: 'Alter', punkte: quartile(20), steigung: 1, achsenabschnitt: 0 },
  kaplan: { zeitName: 'Zeit', ereignisName: 'Tod', kurven: [{ name: 'A', n: 20, ereignisse: 8, median: 12, punkte: [{ t: 5, s: 0.9 }, { t: 12, s: 0.5 }] }], logrank: { chi2: 4.2, df: 1, p: 0.04 }, tMax: 20 },
  forest: { mass: 'Odds Ratio', nullwert: 1, studien: [{ name: 'S1', eff: 1.5, unten: 0.9, oben: 2.4, gewicht: 40 }, { name: 'S2', eff: 1.3, unten: 1.05, oben: 1.6, gewicht: 60 }], gesamt: { eff: 1.4, unten: 1.1, oben: 1.8 } },
  scree: { eigen: [3.1, 1.4, 0.8, 0.5], extrahiert: 2 },
  pfad: { knoten: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C', latent: true }], pfade: [{ von: 'a', nach: 'b', wert: 0.5, p: 0.01 }, { von: 'a', nach: 'c', wert: 0.2, p: 0.3, korrelation: true }] },
  streumatrix: { variablen: ['X', 'Y', 'Z'], r: [[1, 0.5, 0.1], [0.5, 1, -0.3], [0.1, -0.3, 1]], n: 30 },
  karte: { wertName: 'Dichte', gebiete: [{ name: 'Wien', wert: 4000 }, { name: 'Tirol', wert: 60 }, { name: 'Kärnten', wert: null }] },
  baum: { wurzel: { text: 'Alter', kinder: [{ text: 'jung', ast: 'unter 30' }, { text: 'alt', ast: 'ab 30' }] } },
  verteilung: { xAchse: { name: 'z' }, yAchse: { name: 'Dichte' }, kurven: [{ punkte: [[-1, 0.24], [0, 0.4], [1, 0.24]] }], marken: [{ name: 'Mittelwert', x: 0 }] },
  heatmap: { wertName: 'Korrelation', zeilen: ['a', 'b'], spalten: ['x', 'y'], werte: [[1, 0.2], [0.2, 1]] },
  sonstiges: { artName: 'Dendrogramm', titel: 'Zusammenlegungen', saetze: ['Es gibt 4 Gruppen.'], kennwerte: [{ name: 'Höhe', wert: '12' }] }
};
const ARTEN = Object.keys(BEISPIELE) as Art[];
const alleTexte = (t: BildText): string[] => [t.kurz, ...t.beschreibung, ...t.liste, t.tabelle.titel, ...t.tabelle.kopf, ...t.tabelle.zeilen.flat().map(String)];
const holen = (art: Art, daten?: unknown) => bildtext(art as 'kreis', (daten ?? BEISPIELE[art]) as ArtDaten['kreis']);

describe('Beispieldaten → erwartete Kurztexte (de und en)', () => {
  const ERWARTET: Record<Art, [string, string]> = {
    histogramm: ['Histogramm (Verteilung) von Alter, n = 20, 3 Klassen von 0 bis 30; die höchste Klasse reicht von 10 bis unter 20 mit 12 Werten.', 'Histogram (distribution) of Alter, n = 20, 3 classes from 0 to 30; the highest class spans from 10 to under 20 with 12 values.'],
    saeulen: ['Säulendiagramm: Mittelwert von Alter nach Gruppe, 3 Säulen; höchste Säule B mit 4,25, niedrigste C mit 2.', 'Column chart: Mittelwert von Alter by Gruppe, 3 columns; highest B with 4.25, lowest C with 2.'],
    kreis: ['Kreisdiagramm: Anteile von Fach, 2 Sektoren; größter Anteil Psych mit 75,0 %.', 'Pie chart: shares of Fach, 2 sectors; largest share Psych with 75.0%.'],
    linie: ['Liniendiagramm: Umsatz von 2020 bis 2023; erster Wert 1, letzter Wert 4, Höchstwert 4 (2023), Tiefstwert 1 (2020).', 'Line chart: Umsatz from 2020 to 2023; first value 1, last value 4, highest 4 (2023), lowest 1 (2020).'],
    streu: ['Streudiagramm: Größe gegen Alter, n = 4; positiver Zusammenhang, Korrelation 1,00.', 'Scatter plot: Größe against Alter, n = 4; positive relationship, correlation 1.00.'],
    boxplot: ['Boxplot von Alter nach Gruppe, 2 Gruppen; höchster Median in B mit 6, insgesamt 1 Ausreißer.', 'Box plot of Alter by Gruppe, 2 groups; highest median in B with 6, 1 outlier in total.'],
    mittelwerte: ['Mittelwertdiagramm: Alter nach Gruppe, 2 Gruppen; Fehlerbalken zeigen 95-%-Konfidenzintervall; höchster Mittelwert B mit 7,5.', 'Mean plot: Alter by Gruppe, 2 groups; error bars show 95% confidence interval; highest mean B with 7.5.'],
    qq: ['Q-Q-Diagramm (Normalverteilung) von Alter, n = 20; die Punkte liegen an beiden Enden nahe an der Geraden.', 'Q-Q plot (normal distribution) of Alter, n = 20; the points lie close to the line at both ends.'],
    kaplan: ['Kaplan-Meier-Kurve (Überlebenskurve): Anteil ohne Tod über Zeit; mediane Überlebenszeit 12.', 'Kaplan-Meier curve (survival curve): share without Tod over Zeit; median survival time 12.'],
    forest: ['Forest-Plot (Effekte der Studien): Odds Ratio für 2 Studien; Gesamteffekt 1,40, 95-%-Intervall von 1,10 bis 1,80; das Intervall enthält den Nullwert nicht.', 'Forest plot (effects of the studies): Odds Ratio for 2 studies; overall effect 1.40, 95% interval from 1.10 to 1.80; the interval does not contain the null value.'],
    scree: ['Scree-Plot (Eigenwerte): 4 Komponenten, 2 Eigenwerte über 1; erster Eigenwert 3,10.', 'Scree plot (eigenvalues): 4 components, 2 eigenvalues above 1; first eigenvalue 3.10.'],
    pfad: ['Pfaddiagramm mit 3 Variablen und 2 Pfaden; stärkster Pfad von A nach B mit 0,50.', 'Path diagram with 3 variables and 2 paths; strongest path from A to B with 0.50.'],
    streumatrix: ['Streumatrix (Streudiagramme aller Paare) von 3 Variablen: X, Y, Z; n = 30.', 'Scatter plot matrix (scatter plots of all pairs) of 3 variables: X, Y, Z; n = 30.'],
    karte: ['Karte: Dichte in 3 Gebieten; höchster Wert in Wien (4000), niedrigster in Tirol (60).', 'Map: Dichte in 3 areas; highest value in Wien (4000), lowest in Tirol (60).'],
    baum: ['Baumdiagramm mit 3 Knoten, 2 Endknoten und 2 Ebenen; Wurzel: Alter.', 'Tree diagram with 3 nodes, 2 end nodes and 2 levels; root: Alter.'],
    verteilung: ['Kurvendiagramm: Dichte über z, von -1 bis 1; höchster Wert 0,4 bei 0.', 'Curve chart: Dichte over z, from -1 to 1; highest value 0.4 at 0.'],
    heatmap: ['Heatmap: Korrelation für 2 Zeilen und 2 Spalten; höchster Wert 1 (a, x), niedrigster 0,2 (a, y).', 'Heat map: Korrelation for 2 rows and 2 columns; highest value 1 (a, x), lowest 0.2 (a, y).'],
    sonstiges: ['Dendrogramm: Zusammenlegungen.', 'Dendrogramm: Zusammenlegungen.']
  };
  for (const art of ARTEN) {
    it(art, () => {
      expect(mit('de', () => holen(art).kurz)).toBe(ERWARTET[art][0]);
      expect(mit('en', () => holen(art).kurz)).toBe(ERWARTET[art][1]);
    });
  }
  it('Reihenfolge der Beschreibung: Art, waagrechte Achse, senkrechte Achse, Menge, dann ein Element je Zeile (Histogramm de)', () => {
    const t = mit('de', () => bildtext('histogramm', BEISPIELE.histogramm));
    expect(t.beschreibung).toEqual(['Histogramm (Verteilung) von Alter.', 'Waagrechte Achse: Alter, von 0 bis 30.', 'Senkrechte Achse: Anzahl der Werte, von 0 bis 12.', 'Das Histogramm besteht aus 3 Rechtecken.', 'Mittelwert 17,2, Median 16.']);
    expect(t.liste).toEqual(['Rechteck 1: von 0 bis unter 10, Höhe 3.', 'Rechteck 2: von 10 bis unter 20, Höhe 12.', 'Rechteck 3: von 20 bis 30, Höhe 5.']);
    expect(t.tabelle.kopf).toEqual(['Klasse', 'Anzahl', 'Prozent']);
    expect(t.tabelle.zeilen[1]).toEqual(['von 10 bis 20', 12, '60,0 %']);
  });
  it('Streudiagramm: Punkte als (x; y) mit Strichpunkt, Gerade in Worten (de und en)', () => {
    const de = mit('de', () => bildtext('streu', BEISPIELE.streu)), en = mit('en', () => bildtext('streu', BEISPIELE.streu));
    expect(de.beschreibung).toContain('Wertepaare, nach Alter sortiert: (1; 2); (2; 4,1); (3; 5,9); (4; 8,2).');
    expect(de.beschreibung).toContain('Regressionsgerade: Größe = 0 plus 2 mal Alter, steigend, Bestimmtheitsmaß 0,990.');
    expect(en.beschreibung).toContain('Regression line: Größe = 0 plus 2 times Alter, rising, coefficient of determination 0.990.');
    expect(en.beschreibung).toContain('Value pairs, sorted by Alter: (1; 2); (2; 4.1); (3; 5.9); (4; 8.2).');
  });
  it('Boxplot: Median, Quartile, Fühler, Ausreißer je Gruppe', () => {
    const t = mit('de', () => bildtext('boxplot', BEISPIELE.boxplot));
    expect(t.liste).toEqual(['A: Median 5, erstes Quartil 3, drittes Quartil 7, Fühler von 1 bis 9; Ausreißer: 15.', 'B: Median 6, erstes Quartil 4, drittes Quartil 8, Fühler von 2 bis 10; keine Ausreißer.']);
    expect(t.tabelle.zeilen[0]).toEqual(['A', 20, '1', '3', '5', '7', '15', 1]);
  });
  it('Zahlenformat über das Sprachprofil: Dezimalkomma de, Punkt en; kein Tausendertrenner; ASCII-Minus', () => {
    expect(mit('de', () => z(1234567.891))).toBe('1234567,891');
    expect(mit('en', () => z(1234567.891))).toBe('1234567.891');
    expect(mit('de', () => z(-2.5))).toBe('-2,5');
    expect(mit('de', () => z(-0.0001, 2))).toBe('0,00');
    expect(mit('de', () => z(1e21))).not.toMatch(/e/i);
  });
});

describe('Grenzfälle', () => {
  it('leere Daten: kein Absturz, sagt „keine Werte“ / „keine Daten“', () => {
    const leer: Record<Art, unknown> = {
      histogramm: { name: 'A', grenzen: [], anzahl: [] }, saeulen: { kategorien: [], wertName: 'W', reihen: [] }, kreis: { name: 'A', teile: [] },
      linie: { xAchse: { name: 'x' }, yAchse: { name: 'y' }, x: [], reihen: [] }, streu: { xAchse: { name: 'x' }, yAchse: { name: 'y' }, punkte: [] },
      boxplot: { name: 'A', gruppen: [] }, mittelwerte: { name: 'A', fehler: 'keine', gruppen: [] }, qq: { name: 'A', punkte: [], steigung: 1, achsenabschnitt: 0 },
      kaplan: { zeitName: 'z', ereignisName: 'e', kurven: [] }, forest: { mass: 'OR', nullwert: 1, studien: [] }, scree: { eigen: [] },
      pfad: { knoten: [], pfade: [] }, streumatrix: { variablen: ['A'] }, karte: { gebiete: [] }, baum: { wurzel: { text: 'Wurzel' } },
      verteilung: { xAchse: { name: 'x' }, yAchse: { name: 'y' }, kurven: [] }, heatmap: { wertName: 'w', zeilen: [], spalten: [], werte: [] }, sonstiges: {}
    };
    for (const art of ARTEN) {
      const t = mit('de', () => holen(art, leer[art]));
      expect(t.kurz.length, art).toBeGreaterThan(5);
      expect(t.kurz, art).not.toMatch(/NaN|undefined|Infinity/);
      for (const x of alleTexte(t)) expect(x, art).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
  it('n = 0 im Histogramm trotz Klassen', () => {
    const t = mit('de', () => bildtext('histogramm', { name: 'A', grenzen: [0, 1, 2], anzahl: [0, 0], n: 0 }));
    expect(t.kurz).toBe('Histogramm (Verteilung) von A: keine Werte.');
  });
  it('Histogramm: leere Klasse hat Höhe 0, alle Werte gleich (eine Klasse)', () => {
    const t = mit('de', () => bildtext('histogramm', { name: 'A', grenzen: [0, 1, 2, 3], anzahl: [4, 0, 4] }));
    expect(t.liste[1]).toBe('Rechteck 2: von 1 bis unter 2, Höhe 0.');
    const eins = mit('de', () => bildtext('histogramm', { name: 'A', grenzen: [5, 6], anzahl: [7] }));
    expect(eins.beschreibung).toContain('Das Histogramm besteht aus 1 Rechteck.');
    expect(eins.liste).toEqual(['Rechteck 1: von 5 bis 6, Höhe 7.']);
  });
  it('Histogramm in Prozent und Dichte: Höhe nach der Achse', () => {
    const p = mit('de', () => bildtext('histogramm', { name: 'A', grenzen: [0, 2, 4], anzahl: [1, 3], art: 'prozent' }));
    expect(p.liste[0]).toBe('Rechteck 1: von 0 bis unter 2, Höhe 25,0 % (1 Werte).');
    const d = mit('de', () => bildtext('histogramm', { name: 'A', grenzen: [0, 2, 4], anzahl: [1, 3], art: 'dichte' }));
    expect(d.liste[1]).toBe('Rechteck 2: von 2 bis 4, Höhe 0,375 (3 Werte).');
  });
  it('eine Gruppe im Boxplot und Mittelwertdiagramm, eine Säule, ein Kreisteil, keine Mehrzahl-Fehler', () => {
    const b = mit('en', () => bildtext('boxplot', { name: 'A', gruppen: [{ unten: 1, q1: 2, median: 3, q3: 4, oben: 5, ausreisser: [9] }] }));
    expect(b.kurz).toBe('Box plot of A: median 3, middle half from 2 to 4, 1 outlier.');
    expect(mit('de', () => bildtext('saeulen', { kategorien: ['X'], wertName: 'W', reihen: [{ werte: [3] }] }).kurz)).toBe('Säulendiagramm: W, eine Säule: X mit 3.');
    const f = mit('de', () => bildtext('forest', { mass: 'OR', nullwert: 1, studien: [{ name: 'S', eff: 2, unten: 1.5, oben: 2.5 }] }));
    expect(f.kurz).toBe('Forest-Plot (Effekte der Studien): OR für 1 Studie.');
    const m = mit('de', () => bildtext('mittelwerte', { name: 'A', fehler: 'sd', gruppen: [{ name: 'G', mittel: 2 }] }));
    expect(m.kurz).toContain('1 Gruppe;');
    for (const art of ARTEN) for (const sp of ['de', 'en'] as const) for (const x of alleTexte(mit(sp, () => holen(art)))) expect(x).not.toMatch(/\b1 (Studien|Pfaden|Gruppen|Klassen|Kategorien|Zeilen|Spalten|Ebenen|Variablen|studies|paths|groups|classes|categories|rows|columns|levels|variables|outliers)\b/);
  });
  it('alle Werte gleich: Linie meldet „alle Werte gleich“, Streudiagramm keine Korrelation', () => {
    const l = mit('de', () => bildtext('linie', { xAchse: { name: 'x' }, yAchse: { name: 'y' }, x: [1, 2, 3], reihen: [{ werte: [5, 5, 5] }] }));
    expect(l.liste[0]).toContain('alle Werte gleich');
    const st = mit('de', () => bildtext('streu', { xAchse: { name: 'x' }, yAchse: { name: 'y' }, punkte: [[1, 5], [2, 5], [3, 5]] }));
    expect(st.kurz).toBe('Streudiagramm: y gegen x, n = 3.');
  });
  it('sehr lange Listen: mehr als 20 Elemente nur in der Tabelle, mehr als 500 Zeilen gekürzt, Text sagt es', () => {
    const k = Array.from({ length: MAX_LISTE + 1 }, (_, i) => `K${i}`);
    const t = mit('de', () => bildtext('saeulen', { kategorien: k, wertName: 'W', reihen: [{ werte: k.map((_, i) => i) }] }));
    expect(t.liste).toEqual([]);
    expect(t.beschreibung).toContain('Die Einzelangaben stehen in der Tabelle.');
    expect(t.tabelle.zeilen).toHaveLength(MAX_LISTE + 1);
    const genau = mit('de', () => bildtext('saeulen', { kategorien: k.slice(0, MAX_LISTE), wertName: 'W', reihen: [{ werte: k.slice(0, MAX_LISTE).map((_, i) => i) }] }));
    expect(genau.liste).toHaveLength(MAX_LISTE);
    const punkte = Array.from({ length: MAX_ZEILEN + 50 }, (_, i) => [i, i * 2] as [number, number]);
    const lang = mit('en', () => bildtext('streu', { xAchse: { name: 'x' }, yAchse: { name: 'y' }, punkte }));
    expect(lang.tabelle.zeilen).toHaveLength(MAX_ZEILEN);
    expect(lang.beschreibung.some(b => b.startsWith(`The table shows the first ${MAX_ZEILEN} of ${MAX_ZEILEN + 50} rows`))).toBe(true);
    expect(lang.beschreibung.join(' ')).not.toContain('Value pairs');
  });
  it('Streudiagramm mit Gruppen: eine Zeile je Gruppe, Punkte nur in der Tabelle', () => {
    const t = mit('de', () => bildtext('streu', { xAchse: { name: 'x' }, yAchse: { name: 'y' }, gruppen: [{ name: 'A', punkte: [[1, 1], [2, 2], [3, 3]] }, { name: 'B', punkte: [[1, 3], [2, 2], [3, 1]] }] }));
    expect(t.liste).toEqual(['A: 3 Punkte; positiver Zusammenhang, Korrelation 1,00.', 'B: 3 Punkte; negativer Zusammenhang, Korrelation -1,00.']);
    expect(t.tabelle.kopf).toEqual(['Gruppe', 'x', 'y']);
  });
  it('Karte mit nur einem Wert sagt nicht „niedrigster“; Gebiet ohne Wert steht als „kein Wert“ in der Tabelle', () => {
    const t = mit('de', () => bildtext('karte', { gebiete: [{ name: 'A', wert: 1 }, { name: 'B', wert: null }] }));
    expect(t.kurz).toBe('Karte mit 2 Gebieten; nur A hat einen Wert (1).');
    expect(t.tabelle.zeilen[1]).toEqual(['B', 'kein Wert']);
  });
});

describe('Keine BookAccess-Zeichen in erzeugten Texten', () => {
  const VERBOTEN = [/[{}]/, /\^/, /\|/, /---/];
  const BOESE = 'Na|me {x} a^2 ---';
  /** Alle Beispieldaten, mit bösen Namen aus „Daten“ (Spaltennamen, Beschriftungen). */
  const boese = (): Partial<Record<Art, unknown>> => ({
    histogramm: { ...BEISPIELE.histogramm, name: BOESE }, saeulen: { ...BEISPIELE.saeulen, kategorien: [BOESE, 'B', 'C'], wertName: BOESE, kategorieName: BOESE },
    kreis: { name: BOESE, teile: [{ name: BOESE, wert: 1 }] }, linie: { ...BEISPIELE.linie, xAchse: { name: BOESE }, yAchse: { name: BOESE } },
    streu: { ...BEISPIELE.streu, xAchse: { name: BOESE }, yAchse: { name: BOESE } }, boxplot: { ...BEISPIELE.boxplot, name: BOESE, gruppen: [{ name: BOESE, unten: 1, q1: 2, median: 3, q3: 4, oben: 5, ausreisser: [8] }] },
    mittelwerte: { ...BEISPIELE.mittelwerte, name: BOESE, gruppen: [{ name: BOESE, mittel: 1 }] }, qq: { ...BEISPIELE.qq, name: BOESE },
    kaplan: { ...BEISPIELE.kaplan, zeitName: BOESE, ereignisName: BOESE }, forest: { ...BEISPIELE.forest, mass: BOESE, studien: [{ name: BOESE, eff: 1, unten: 0, oben: 2 }] },
    pfad: { knoten: [{ id: 'a', name: BOESE }, { id: 'b', name: BOESE }], pfade: [{ von: 'a', nach: 'b', wert: 0.3 }] }, streumatrix: { variablen: [BOESE, 'Y'] },
    karte: { gebiete: [{ name: BOESE, wert: 2, klasse: BOESE }, { name: 'B', wert: 1 }], wertName: BOESE, legende: [BOESE], vermerk: BOESE }, baum: { wurzel: { text: BOESE, kinder: [{ text: BOESE, ast: BOESE }] } },
    verteilung: { ...BEISPIELE.verteilung, xAchse: { name: BOESE }, marken: [{ name: BOESE, x: 0 }] }, heatmap: { ...BEISPIELE.heatmap, wertName: BOESE, zeilen: [BOESE, 'b'] },
    sonstiges: { artName: BOESE, titel: BOESE, saetze: [BOESE], kennwerte: [{ name: BOESE, wert: BOESE }], tabelle: { kopf: [BOESE], zeilen: [[BOESE]] } }
  });
  const pruefe = (sp: 'de' | 'en' | 'xx', daten: (a: Art) => unknown) => {
    for (const art of ARTEN) for (const x of alleTexte(mit(sp, () => holen(art, daten(art))))) for (const v of VERBOTEN) expect(x, `${art} in ${sp}`).not.toMatch(v);
  };
  for (const sp of ['de', 'en', 'xx'] as const) {
    it(`Beispieldaten in ${sp}`, async () => { if (sp === 'xx') await ladeSprache('xx'); pruefe(sp, a => BEISPIELE[a]); });
    it(`Namen aus Daten mit | { } ^ --- in ${sp}`, async () => { if (sp === 'xx') await ladeSprache('xx'); pruefe(sp, a => boese()[a] ?? BEISPIELE[a]); });
  }
  it('sauber() ersetzt die Zeichen durch Wörter oder harmlose Zeichen', () => {
    expect(mit('de', () => sauber('a^2 | {b} ---'))).toBe('a hoch 2 / (b) -');
    expect(mit('en', () => sauber('a^2'))).toBe('a to the power of 2');
  });
  it('Quelltext: kein { } ^ | --- in den festen Texten (L, Lp) aller Dateien in lib/bildtext/', () => {
    const dir = new URL('./bildtext/', import.meta.url);
    const dateien = readdirSync(dir).filter(f => f.endsWith('.ts'));
    expect(dateien.length).toBeGreaterThan(18);
    let anzahl = 0;
    for (const f of dateien) {
      const { eintraege } = umformen(readFileSync(new URL(f, dir), 'utf8'));
      for (const e of eintraege) {
        anzahl++;
        for (const t of [e.de, e.en ?? ''].flatMap(x => (typeof x === 'string' ? [x] : Object.values(x as Record<string, string>)))) { const ohneStelle = t.replace(/\{\d+\}/g, ''); for (const v of VERBOTEN) expect(ohneStelle, `${f}: „${t}“`).not.toMatch(v); }
      }
    }
    expect(anzahl).toBeGreaterThan(150);
  });
});

describe('Regeln der Muster einzeln', () => {
  it('verlaufsart: streng steigend, streng fallend, gleich; sonst nichts; unter 3 Werten nichts', () => {
    expect(verlaufsart([1, 2, 3])).toBe('steigend');
    expect(verlaufsart([3, 2, 1])).toBe('fallend');
    expect(verlaufsart([2, 2, 2])).toBe('gleich');
    expect(verlaufsart([1, 2, 2])).toBeNull();
    expect(verlaufsart([1, 3, 2])).toBeNull();
    expect(verlaufsart([1, 2])).toBeNull();
    expect(verlaufsart([1, NaN, 3])).toBeNull();
  });
  it('Linie: Verlaufsmuster nur bei lückenloser Reihe, keine Behauptung bei Zickzack', () => {
    const t = (werte: (number | null)[]) => mit('de', () => bildtext('linie', { xAchse: { name: 'x' }, yAchse: { name: 'y' }, x: [1, 2, 3, 4], reihen: [{ werte }] }).liste[0]!);
    expect(t([1, 2, 3, 4])).toContain('jeder Wert größer als der vorige');
    expect(t([4, 3, 2, 1])).toContain('jeder Wert kleiner als der vorige');
    expect(t([1, 3, 2, 4])).not.toMatch(/jeder Wert|alle Werte gleich/);
    expect(t([1, null, 3, 4])).not.toMatch(/jeder Wert/);
  });
  it('Streudiagramm: Richtung nach Vorzeichen von r, Schwelle 0,1, ab 3 Punkten', () => {
    expect(R_SCHWELLE).toBe(0.1);
    expect(zusammenhang(0.5)).toBe('positiv');
    expect(zusammenhang(-0.5)).toBe('negativ');
    expect(zusammenhang(0.099)).toBe('keiner');
    expect(zusammenhang(-0.05)).toBe('keiner');
    expect(zusammenhang(null)).toBeNull();
    expect(pearson([[1, 1], [2, 2]])).toBeNull();
    expect(pearson([[1, 1], [2, 1], [3, 1]])).toBeNull();
    expect(pearson([[1, 3], [2, 2], [3, 1]])).toBeCloseTo(-1, 10);
    const kein = mit('de', () => bildtext('streu', { xAchse: { name: 'x' }, yAchse: { name: 'y' }, punkte: [[1, 2], [2, 3], [3, 1], [4, 3], [5, 2]] }));
    expect(kein.kurz).toContain('kein erkennbarer linearer Zusammenhang');
  });
  it('Q-Q: Enden relativ zur Geraden, Schwelle 0,5 Steigungen, ab 8 Punkten', () => {
    expect(ENDE_SCHWELLE).toBe(0.5);
    const gerade = quartile(20);
    expect(qqEnden({ punkte: gerade, steigung: 1, achsenabschnitt: 0 })).toEqual({ links: 'nahe', rechts: 'nahe' });
    const schwer = gerade.map(([x, y], i) => [x, i < 2 ? y - 3 : i > 17 ? y + 3 : y] as [number, number]);
    expect(qqEnden({ punkte: schwer, steigung: 1, achsenabschnitt: 0 })).toEqual({ links: 'unterhalb', rechts: 'oberhalb' });
    expect(qqEnden({ punkte: gerade.slice(0, 7), steigung: 1, achsenabschnitt: 0 })).toBeNull();
    expect(qqEnden({ punkte: gerade, steigung: 0, achsenabschnitt: 0 })).toBeNull();
    const t = mit('de', () => bildtext('qq', { name: 'A', punkte: schwer, steigung: 1, achsenabschnitt: 0 }));
    expect(t.kurz).toContain('das linke Ende liegt unterhalb der Geraden, das rechte Ende oberhalb der Geraden');
    const kurz = mit('de', () => bildtext('qq', { name: 'A', punkte: gerade.slice(0, 5), steigung: 1, achsenabschnitt: 0 }));
    expect(kurz.kurz).toBe('Q-Q-Diagramm (Normalverteilung) von A, n = 5.');
  });
  it('Forest: Nulllinie wird geschnitten, wenn unten <= Nullwert <= oben (auch auf dem Rand)', () => {
    expect(schneidetNull(0.9, 1.2, 1)).toBe(true);
    expect(schneidetNull(1, 2, 1)).toBe(true);
    expect(schneidetNull(1.01, 2, 1)).toBe(false);
    expect(schneidetNull(-2, -0.1, 0)).toBe(false);
    const t = mit('de', () => bildtext('forest', { mass: 'g', nullwert: 0, studien: [], gesamt: { eff: 0.1, unten: -0.2, oben: 0.4 } }));
    expect(t.kurz).toContain('das Intervall enthält den Nullwert.');
  });
  it('Kaplan-Meier: Anteil zu einer Zeit ist der Wert des letzten Schritts (davor 1)', () => {
    const p = [{ t: 5, s: 0.9 }, { t: 12, s: 0.5 }];
    expect([0, 4.9, 5, 11.9, 12, 50].map(t => anteilBei(p, t))).toEqual([1, 1, 0.9, 0.9, 0.5, 0.5]);
    const t = mit('de', () => bildtext('kaplan', { zeitName: 'Zeit', ereignisName: 'Ereignis', kurven: [{ n: 10, ereignisse: 2, median: null, punkte: p }] }));
    expect(t.kurz).toContain('mediane Überlebenszeit nicht erreicht');
  });
  it('Scree: „jeder Eigenwert kleiner“ nur bei streng fallender Reihe; kein „Knick“', () => {
    const fall = mit('de', () => bildtext('scree', { eigen: [3, 2, 1, 0.5] }));
    expect(fall.beschreibung).toContain('Jeder Eigenwert ist kleiner als der vorige.');
    const nicht = mit('de', () => bildtext('scree', { eigen: [3, 3, 1, 0.5] }));
    expect(nicht.beschreibung).not.toContain('Jeder Eigenwert ist kleiner als der vorige.');
    for (const e of [fall, nicht]) expect(alleTexte(e).join(' ')).not.toMatch(/Knick/);
  });
});
