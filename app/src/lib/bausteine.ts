/**
 * Befehls-Bausteine für die Seite „Befehle“: fertige Syntax, gefüllt mit den Spalten der offenen Daten.
 * Die Spalten werden nach Art gewählt (Zahl, Gruppen, Fragen einer Skala). Fehlt etwas Passendes, entfällt der Baustein.
 * Jeder Baustein ist in bausteine.test.ts mit der echten Engine (PSPP 2.1.1) geprüft.
 */
import { istFehlend } from './fehlend';
import type { Spalte } from './verzeichnis';
import { zitWert } from './befehlstext';
import type { Wert } from './eingabe';
import { L } from './sitzung.svelte';
import { klassenBefehl } from './klassieren';
import type { Gewicht } from './gewichte';

/** Eine Lücke im Baustein: passende Spalten (Namen) und die Vorwahl. */
export interface Feld { id: string; titel: string; mehrere: boolean; optionen: string[]; vorgabe: string[] }
export type Werte = Record<string, string[]>;
/** syntax: mit der Vorwahl gefüllt; bau: mit eigener Wahl; mindestens: Zahl der Spalten je Feld (sonst 1). */
export interface Baustein { id: string; titel: string; syntax: string; felder: Feld[]; mindestens: Record<string, number>; bau: (w: Werte) => string }
export interface Bausteingruppe { id: string; titel: string; bausteine: Baustein[] }

const kennung = (sp: Spalte) => /^(nr|id|lfdn|lfd_?nr|nummer|fall|case)$/i.test(sp.name);
const hatLabels = (sp: Spalte) => Object.keys(sp.werteLabels).length > 0;
/** Wert in PSPP-Syntax: Text in Hochkommas, Zahl mit Punkt. */
const wert = (v: string | number) => (typeof v === 'number' ? String(v) : zitWert(v));
const zahlText = (n: number) => String(Math.round(n * 100) / 100);

/** Name für eine neue Spalte, der noch nicht vergeben ist. */
function frei(basis: string, namen: Set<string>) {
  const b = basis.slice(0, 60);
  if (!namen.has(b.toLowerCase())) return b;
  for (let i = 2; ; i++) if (!namen.has(`${b}${i}`.toLowerCase())) return `${b}${i}`;
}

/** Fragen einer Skala: die größte Reihe von Zahlspalten mit gleichem Namensanfang (FG1, FG2 …), sonst alle Zahlen. */
function skalenFragen(zahlen: Spalte[]): Spalte[] {
  const reihen = new Map<string, Spalte[]>();
  for (const sp of zahlen) {
    const m = /^(.*?[A-Za-z_])_?\d+R?$/.exec(sp.name);
    if (m) reihen.set(m[1]!.toLowerCase(), [...(reihen.get(m[1]!.toLowerCase()) ?? []), sp]);
  }
  const beste = [...reihen.values()].sort((a, b) => b.length - a.length)[0];
  return beste && beste.length >= 3 ? beste.slice(0, 12) : zahlen.slice(0, 8);
}

/** `gewicht`: das Fallgewicht des Projekts; der Median im Baustein „In Gruppen teilen“ ist dann gewichtet (wie die Quantile der Verteilungskarte). */
export function bausteine(spalten: Spalte[], zeilen: Wert[][], gewicht?: Gewicht): Bausteingruppe[] {
  const gueltig = (i: number) => {
    const sp = spalten[i]!;
    return zeilen.map(z => z[i]).filter(v => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && istFehlend(sp, v))) as (string | number)[];
  };
  const info = spalten.map((sp, i) => {
    const w = gueltig(i);
    // Reihenfolge wie PSPP: Text nach Zeichencode („Weiblich“ vor „divers“), sonst stimmt der Bereich bei K-W nicht.
    const verschieden = [...new Set(w)].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0));
    return { sp, w, verschieden };
  }).filter(x => !kennung(x.sp) && x.sp.art !== 'datum' && x.w.length > 0);

  // Zahl: misst etwas (nicht nominal, ohne Wertelabels); Gruppen: 2 bis 12 verschiedene Werte, Text und Wertelabels zuerst.
  const zahlen = info.filter(x => x.sp.art === 'zahl' && (x.sp.niveau !== 'nominal' || !hatLabels(x.sp)) && x.verschieden.length > 2);
  const gruppen = info.filter(x => x.verschieden.length >= 2 && x.verschieden.length <= 12)
    .sort((a, b) => Number(b.sp.art === 'text' || hatLabels(b.sp)) - Number(a.sp.art === 'text' || hatLabels(a.sp)));
  const zwei = gruppen.find(x => x.verschieden.length === 2);
  const mehr = gruppen.find(x => x.verschieden.length > 2) ?? zwei;
  // Zielgröße: die letzte Zahlspalte (in Fragebögen steht das Gemessene meist hinten); die übrigen sagen voraus.
  const y = zahlen.at(-1);
  const andere = zahlen.filter(x => x !== y);
  const namen = new Set(spalten.map(sp => sp.name.toLowerCase()));
  const fragen = skalenFragen(zahlen.map(x => x.sp));

  const median = (w: number[]) => { const s = [...w].sort((a, c) => a - c), m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
  const mittel = (w: number[]) => w.reduce((a, c) => a + c, 0) / w.length;
  type Info = (typeof info)[number];
  const nach = new Map(info.map(x => [x.sp.name, x]));
  const I = (name: string) => nach.get(name)!;
  const gruppenTest = (name: string) => { const g = I(name); return `${name}(${wert(g.verschieden[0]!)} ${wert(g.verschieden[1] ?? g.verschieden[0]!)})`; };

  // Ein Feld je Lücke: welche Spalten passen, was vorgewählt ist. Fehlt die Vorwahl, entfällt der Baustein.
  const F = (id: string, titel: string, optionen: Info[], vorgabe: Info | Info[] | undefined, mehrere = false): Feld | null => {
    const v = (Array.isArray(vorgabe) ? vorgabe : vorgabe ? [vorgabe] : []).map(x => x.sp.name);
    return v.length ? { id, titel, mehrere, optionen: optionen.map(x => x.sp.name), vorgabe: v } : null;
  };
  const b = (id: string, titel: string, felder: (Feld | null)[], bau: (w: Werte) => string, mindestens: Record<string, number> = {}): Baustein[] => {
    if (felder.some(f => !f)) return [];
    const ff = felder as Feld[];
    if (ff.some(f => f.vorgabe.length < (mindestens[f.id] ?? 1))) return [];
    return [{ id, titel, felder: ff, mindestens, bau, syntax: bau(Object.fromEntries(ff.map(f => [f.id, f.vorgabe]))) }];
  };
  const tZahl = L('Gemessene Zahl', 'Measured number'), tGruppen = L('Gruppen', 'Groups');

  const gr: Bausteingruppe[] = [
    { id: 'beschreiben', titel: L('Beschreiben', 'Describe'), bausteine: [
      ...b('frequencies', L('Häufigkeiten', 'Frequencies'), [F('v', L('Spalten', 'Columns'), info, gruppen.slice(0, 3), true)], w => `FREQUENCIES /VARIABLES=${w.v!.join(' ')}.`),
      ...b('descriptives', L('Mittelwerte', 'Means'), [F('v', L('Spalten', 'Columns'), zahlen, zahlen.slice(0, 6), true)], w => `DESCRIPTIVES /VARIABLES=${w.v!.join(' ')}\n  /STATISTICS=MEAN STDDEV MIN MAX.`),
      ...b('examine', L('Nach Gruppen erkunden', 'Explore by group'), [F('y', tZahl, zahlen, y), F('g', tGruppen, gruppen, mehr)], w => `EXAMINE /VARIABLES=${w.y![0]} BY ${w.g![0]}\n  /STATISTICS=DESCRIPTIVES\n  /PLOT=NONE.`)
    ] },
    { id: 'unterschiede', titel: L('Unterschiede', 'Differences'), bausteine: [
      ...b('ttest-unabh', L('t-Test unabhängig', 't test independent'), [F('y', tZahl, zahlen, y), F('g', L('Zwei Gruppen', 'Two groups'), gruppen, zwei)], w => `T-TEST GROUPS=${gruppenTest(w.g![0]!)}\n  /VARIABLES=${w.y![0]}.`),
      ...b('ttest-gepaart', L('t-Test gepaart', 't test paired'), [F('a', L('Erste Messung', 'First measurement'), zahlen, andere.at(-1)), F('b', L('Zweite Messung', 'Second measurement'), zahlen, y)], w => `T-TEST PAIRS=${w.a![0]} WITH ${w.b![0]} (PAIRED).`),
      ...b('ttest-eine', L('t-Test eine Stichprobe', 't test one sample'), [F('y', tZahl, zahlen, y)], w => `* ${L('Testwert anpassen', 'Adjust the test value')}.\nT-TEST /TESTVAL=${zahlText(Math.round(mittel(I(w.y![0]!).w as number[])))}\n  /VARIABLES=${w.y![0]}.`),
      ...b('oneway', L('Varianzanalyse', 'ANOVA'), [F('y', tZahl, zahlen, y), F('g', tGruppen, gruppen, mehr)], w => `ONEWAY ${w.y![0]} BY ${w.g![0]}\n  /STATISTICS=DESCRIPTIVES HOMOGENEITY\n  /POSTHOC=BONFERRONI.`),
      ...b('mann-whitney', 'Mann-Whitney', [F('y', tZahl, zahlen, y), F('g', L('Zwei Gruppen', 'Two groups'), gruppen, zwei)], w => `NPAR TESTS /M-W=${w.y![0]} BY ${gruppenTest(w.g![0]!)}.`),
      ...b('wilcoxon', 'Wilcoxon', [F('a', L('Erste Messung', 'First measurement'), zahlen, andere.at(-1)), F('b', L('Zweite Messung', 'Second measurement'), zahlen, y)], w => `NPAR TESTS /WILCOXON=${w.a![0]} WITH ${w.b![0]} (PAIRED).`),
      ...b('kruskal-wallis', 'Kruskal-Wallis', [F('y', tZahl, zahlen, y), F('g', tGruppen, gruppen, mehr)], w => { const g = I(w.g![0]!); return `NPAR TESTS /K-W=${w.y![0]} BY ${g.sp.name}(${wert(g.verschieden[0]!)} ${wert(g.verschieden.at(-1)!)}).`; })
    ] },
    { id: 'zusammenhaenge', titel: L('Zusammenhänge', 'Relationships'), bausteine: [
      ...b('correlations', L('Korrelation', 'Correlation'), [F('v', L('Spalten', 'Columns'), zahlen, zahlen.slice(-4), true)], w => `CORRELATIONS /VARIABLES=${w.v!.join(' ')}\n  /PRINT=TWOTAIL.`, { v: 2 }),
      ...b('crosstabs', L('Kreuztabelle mit χ²', 'Crosstab with χ²'), [F('a', L('Zeilen', 'Rows'), gruppen, gruppen[0]), F('b', L('Spalten', 'Columns'), gruppen, gruppen[1])], w => `CROSSTABS /TABLES=${w.a![0]} BY ${w.b![0]}\n  /STATISTICS=CHISQ PHI\n  /CELLS=COUNT ROW EXPECTED.`),
      ...b('regression', L('Regression', 'Regression'), [F('y', L('Vorherzusagen', 'To predict'), zahlen, y), F('x', L('Woraus', 'Predictors'), zahlen, andere.slice(-3), true)], w => `REGRESSION\n  /VARIABLES=${w.x!.join(' ')} ${w.y![0]}\n  /STATISTICS=COEFF R ANOVA CI(95)\n  /DEPENDENT=${w.y![0]}\n  /METHOD=ENTER.`)
    ] },
    { id: 'skalen', titel: L('Skalen', 'Scales'), bausteine: [
      ...b('reliability', L('Cronbachs Alpha', "Cronbach's alpha"), [F('v', L('Fragen der Skala', 'Items of the scale'), zahlen, fragen.map(sp => I(sp.name)), true)], w => `RELIABILITY /VARIABLES=${w.v!.join(' ')}\n  /MODEL=ALPHA\n  /SUMMARY=TOTAL.`, { v: 3 }),
      ...b('factor', L('Faktorenanalyse', 'Factor analysis'), [F('v', L('Fragen', 'Items'), zahlen, fragen.map(sp => I(sp.name)), true)], w => `FACTOR /VARIABLES=${w.v!.join(' ')}\n  /EXTRACTION=PC\n  /ROTATION=VARIMAX\n  /PRINT=INITIAL EXTRACTION ROTATION KMO\n  /CRITERIA=MINEIGEN(1).`, { v: 3 })
    ] },
    { id: 'vorbereiten', titel: L('Daten vorbereiten', 'Prepare data'), bausteine: [
      ...b('compute', L('Neue Spalte berechnen', 'Compute a column'), [F('v', L('Mittelwert aus', 'Mean of'), zahlen, fragen.map(sp => I(sp.name)), true)], w => `COMPUTE ${frei(L('mittelwert', 'mean_score'), namen)} = MEAN(${w.v!.join(', ')}).\nEXECUTE.`, { v: 2 }),
      ...b('recode', L('In Gruppen teilen', 'Split into groups'), [F('y', L('Zahl', 'Number'), zahlen, y)], w => {
        // Derselbe Weg wie im Daten-Assistenten „Klassen bilden“ (lib/klassieren.ts): zwei Klassen an der Grenze des Medians (Quantil Typ 6 = Median), der Medianwert gehört zur unteren Klasse.
        // Die Grenze steht mit voller Genauigkeit im Befehl (Prüfung C2: 3,295 gerundet auf 3,3 schob die Werte 3,3 in die untere Gruppe); nur das Label ist gerundet.
        const neu = frei(`${w.y![0]}_gruppe`, namen);
        return klassenBefehl({ spalten, zeilen }, { spalte: w.y![0]!, ziel: neu, art: 'quantil', k: 2, gewicht: gewicht && spalten.some(sp => sp.name.toLowerCase() === gewicht.spalte.toLowerCase()) ? gewicht : undefined }).syntax;
      }),
      ...b('select-if', L('Nur eine Gruppe auswerten', 'Analyze one group only'), [F('g', tGruppen, gruppen, zwei ?? mehr), F('y', tZahl, zahlen, y)], w => `TEMPORARY.\nSELECT IF (${w.g![0]} = ${wert(I(w.g![0]!).verschieden[0]!)}).\nDESCRIPTIVES /VARIABLES=${w.y![0]}.`)
    ] }
  ];
  return gr.filter(g => g.bausteine.length > 0);
}
