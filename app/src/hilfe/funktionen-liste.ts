/**
 * Alle Funktionen, die man in Statable aufrufen kann (Bauplan Nutzen/Erklären, Stufe 1.2). Reine Daten für den Wächter `funktionen-abgedeckt.test.ts`.
 * Wo der Code schon eine Liste hat, wird sie importiert, damit neue Funktionen von selbst auffallen:
 *  - Karten in „Neue Auswertung“: `VERFAHREN` (lib/verfahren.ts)
 *  - Weitere Auswertungen (Zusatzverfahren, die in einer Karte stecken): `ARTIKEL_ZU_KARTE` (lib/fach.ts) und `qualitaetKarten()` (lib/qualitaet.ts)
 *  - Daten-Assistenten: `ASSISTENTEN` (lib/datenassistenten.ts)
 *  - Lernlabor und Verstehen: `KACHELN`, `LABOR_TEILE`, `PROBIEREN` (lernen/lernsuche.ts)
 *  - Rechner „Studie planen“: `KLASSISCHE_TESTS`, `NEUE_TESTS`, `F2_TESTS` (lib/power.ts)
 * Datenwerkzeuge und Exporte stehen als Menüeinträge in Svelte-Dateien (seiten/Daten.svelte u. a.) und sind hier von Hand geführt; `quelle` sagt, wo.
 * Die Namen der Karten und Zusatzverfahren kommen aus den Hilfe-Artikeln (deutsch und englisch), darum lädt dieses Modul `artikel.ts`: nicht im Startpaket verwenden.
 */
import { P, type Paar } from '../i18n/laufzeit';
import { inSprache } from '../lib/sitzung.svelte';
import { VERFAHREN } from '../lib/verfahren';
import { ARTIKEL_ZU_KARTE } from '../lib/fach';
import { qualitaetKarten } from '../lib/qualitaet';
import { ASSISTENTEN } from '../lib/datenassistenten';
import { KACHELN, LABOR_TEILE, PROBIEREN } from '../lernen/lernsuche';
import { KLASSISCHE_TESTS, NEUE_TESTS, F2_TESTS, type Test, type NeuerTest } from '../lib/power';
import { artikelListe } from './artikel';

export type FunktionsGruppe = 'neue-auswertung' | 'weitere' | 'assistent' | 'datenwerkzeug' | 'export' | 'verstehen' | 'rechner';
export interface Funktion {
  id: string;
  gruppe: FunktionsGruppe;
  name: Paar;
  /** Wo im Code die Funktion definiert ist (Datei und Liste). */
  quelle: string;
  /** Kennungen der Hilfe-Artikel, die sie erklären (müssen nicht alle existieren: der Wächter prüft es). */
  hilfe: string[];
  /** SPSS-Menüname, falls anders als der Statable-Name. */
  spss?: string;
  /** Kennung der Rechenkarte in Statable (lib/verfahren.ts), falls die Funktion in einer Karte steckt: Lehreinheiten und Beispielschritte hängen daran. */
  karte?: string;
  /** Eigene Suchbegriffe, wenn der abgeleitete nicht taugt: Fachbegriff (deutsch) und englischer Name. */
  suche?: { fach?: string; en?: string };
}

/** Name in beiden Sprachen: zuerst deutsch, dann englisch. */
const beide = (f: () => string): Paar => P(inSprache('de', f), inSprache('en', f));
const de = artikelListe('de'), en = artikelListe('en');
const titel = (id: string): Paar => P(de.find(a => a.id === id)?.titel ?? id, en.find(a => a.id === id)?.titel ?? id);

/* ---------- 1. Karten in „Neue Auswertung“ ---------- */
const NEUE: Funktion[] = VERFAHREN.map(v => ({
  id: v.id, gruppe: 'neue-auswertung', name: beide(() => v.titel), quelle: 'lib/verfahren.ts (VERFAHREN)', hilfe: [`frage-${v.id}`], karte: v.id,
  // Fachbegriff: der erste Teil des Zusatzes auf der Karte („t-Test für zwei unabhängige Stichproben, …“ → „t-Test“)
  suche: { fach: erster(inSprache('de', () => v.zusatz ?? v.titel)), en: erster(inSprache('en', () => v.zusatz ?? v.titel)) }
}));
/** Erster Fachbegriff eines Zusatzes: bis zum ersten Komma, ohne „für …“, „nach …“, „for …“, „by …“. */
function erster(t: string): string { return t.split(/[,;(]/)[0]!.split(/ (?:für|nach|bei|for|by) /)[0]!.trim(); }

/* ---------- 2. Weitere Auswertungen ---------- */
/** Zusatzverfahren mit Hilfe-Artikel, die in keiner Liste des Codes stehen (Blöcke im Ergebnis eines Blattes). */
const WEITERE_ZUSATZ: [string, string][] = [
  ['bootstrap-intervalle', 'gruppen'], ['robuste-verfahren', 'gruppen'], ['balken-mittelwerte', 'gruppen'], ['saisonbereinigung-r', 'zeitreihen'], ['loglinear-rueckwaerts', 'loglinear']
];
/** Name in Klammern am Ende der Artikelüberschrift („… (Zweifaktorielle Varianzanalyse, …)“) ist der Fachbegriff; sonst die ganze Überschrift. */
const fachAusTitel = (t: string) => { const m = /\(([^)]*)\)\s*$/.exec(t); return erster(m ? m[1]! : t.replace(/\?$/, '')); };
const WEITERE: Funktion[] = [...Object.entries(ARTIKEL_ZU_KARTE), ...WEITERE_ZUSATZ].map(([id, karte]) => {
  const n = titel(id);
  return { id, gruppe: 'weitere' as const, name: n, quelle: Object.hasOwn(ARTIKEL_ZU_KARTE, id) ? `lib/fach.ts (ARTIKEL_ZU_KARTE) in Karte „${karte}“` : `Zusatzblock in Karte „${karte}“ (seiten/Blatt.svelte)`, hilfe: [id], karte,
    suche: { fach: fachAusTitel(n.de), en: fachAusTitel(n.en) } };
});
/** Zählkarten sind eine eigene Kachel in „Qualität und Prozess“, im Artikel „Regelkarten“ aber nur ein Teil. */
const QUALITAET_ZU_ARTIKEL: Record<string, string> = { regelkarte: 'regelkarten', zaehlkarte: 'regelkarten', messsystem: 'messsystemanalyse-gauge-rr', kalibrier: 'kalibriergerade-nachweisgrenze', kurven: 'kurvenanpassung' };
const ZAEHLKARTEN: Funktion = { id: 'zaehlkarten', gruppe: 'weitere', name: P('Zählkarten (p-, np-, c-, u-Karte)', 'Count charts (p, np, c, u chart)'), quelle: 'lib/qualitaet.ts (qualitaetKarten, „zaehlkarte“)', hilfe: ['regelkarten'], karte: 'verteilung', suche: { fach: 'Zählkarten', en: 'count charts' } };

/* ---------- 3. Daten-Assistenten ---------- */
const ASSISTENT_HILFE: Record<string, string[]> = {
  umkodieren: ['daten-vorbereiten', 'klassen-bilden'], berechnen: ['daten-vorbereiten'], auswahl: ['daten-vorbereiten'], zusammen: ['daten-vorbereiten'], aggregieren: ['daten-vorbereiten'],
  doppelte: ['daten-vorbereiten'], zaehlen: ['daten-vorbereiten'], fehlendcodes: ['daten-vorbereiten', 'keine-angabe-bereich'], sortieren: ['daten-vorbereiten'], rang: ['daten-vorbereiten'],
  datum: ['daten-vorbereiten'], auffaellig: ['daten-vorbereiten'], eigenschaften: ['eigenschaften-uebernehmen'], vergleichen: ['datensaetze-vergleichen'], zeitreihe: ['verschieben-glaetten'],
  index: ['indexzahlen'], winsor: ['robuste-verfahren'], abgleich: ['fallkontrolle-abgleich'], klassifikation: ['klassifikation'], plausibel: ['plausibilitaet'], mikrodaten: ['mikrodaten-schuetzen']
};
/** SPSS-Menünamen, soweit es sie gibt (Analysieren, Transformieren, Daten). */
const SPSS_ASSISTENT: Record<string, string> = {
  umkodieren: 'Umkodieren in andere Variablen', berechnen: 'Variable berechnen', auswahl: 'Fälle auswählen', zusammen: 'Dateien zusammenfügen', aggregieren: 'Aggregieren',
  doppelte: 'Doppelte Fälle identifizieren', zaehlen: 'Werte innerhalb von Fällen zählen', sortieren: 'Fälle sortieren', rang: 'Fälle rangordnen', datum: 'Datum und Uhrzeit zuweisen'
};
/** Der Name „Zählen“ allein ist als Suchwort zu allgemein (viele Artikel zählen etwas); so tippen Studierende: „Werte zählen“. */
const ASSISTENT_SUCHE: Record<string, { fach: string; en: string }> = { zaehlen: { fach: 'Werte zählen', en: 'count values' }, sortieren: { fach: 'Fälle sortieren', en: 'sort cases' } };
const ASSIST: Funktion[] = ASSISTENTEN.map(a => ({
  id: `assistent-${a.id}`, gruppe: 'assistent', name: beide(a.name), quelle: 'lib/datenassistenten.ts (ASSISTENTEN)', hilfe: ASSISTENT_HILFE[a.id] ?? [],
  ...(SPSS_ASSISTENT[a.id] ? { spss: SPSS_ASSISTENT[a.id] } : {}), suche: ASSISTENT_SUCHE[a.id] ?? { fach: inSprache('de', a.name), en: inSprache('en', a.name) }
}));

/* ---------- 4. Datenwerkzeuge (Datenleiste „Daten bearbeiten“ und Seiten rund um die Daten) ---------- */
const DAT = (id: string, name: Paar, quelle: string, hilfe: string[], extra: Partial<Funktion> = {}): Funktion => ({ id, gruppe: 'datenwerkzeug', name, quelle, hilfe, ...extra });
const DATENWERKZEUGE: Funktion[] = [
  DAT('daten-eingeben', P('Zellen direkt eingeben und ändern', 'Enter and change cells directly'), 'seiten/Daten.svelte (bearbeitenEintraege: eingeben)', ['daten-seite'], { suche: { fach: 'Zellen eingeben', en: 'enter cells' } }),
  DAT('spalten-beschreiben', P('Spalten beschreiben', 'Describe columns'), 'seiten/Daten.svelte (Umschalter „Daten | Spalten“), seiten/Spalten.svelte', ['spalten-seite'], { spss: 'Variablenansicht', suche: { fach: 'Skalenniveau', en: 'describe columns' } }),
  DAT('fallgewicht', P('Fallgewicht setzen', 'Set a case weight'), 'seiten/Daten.svelte (bearbeitenEintraege: gewicht)', ['fallgewichte'], { spss: 'Fälle gewichten', suche: { fach: 'Fallgewicht', en: 'case weight' } }),
  DAT('umstrukturieren', P('Umstrukturieren (breit ↔ lang)', 'Reshape (wide ↔ long)'), 'seiten/Daten.svelte (bearbeitenEintraege: umformen), seiten/Umformen.svelte', ['umstrukturieren'], { spss: 'Daten umstrukturieren', suche: { fach: 'Umstrukturieren', en: 'reshape' } }),
  DAT('daten-diagramm', P('Diagramm aus einer oder zwei Spalten', 'Chart from one or two columns'), 'seiten/Daten.svelte (Knopf „Diagramm“), bausteine/DatenDiagramm.svelte', ['diagramm-anpassen'], { spss: 'Diagrammerstellung', suche: { fach: 'Diagramm', en: 'chart' } }),
  DAT('lesemodus', P('Lesemodus der Datentabelle', 'Reading mode of the data table'), 'seiten/Daten.svelte (Knopf „Lesemodus“), bausteine/DatenLesemodus.svelte', ['barrierefrei-bedienen'], { suche: { fach: 'Lesemodus', en: 'reading mode' } }),
  DAT('daten-suchen', P('In den Daten suchen und zu einer Zelle springen', 'Search the data and jump to a cell'), 'seiten/Daten.svelte (DatenSuchen)', ['daten-seite'], { suche: { fach: 'Daten suchen', en: 'search the data' } }),
  DAT('daten-check', P('Daten-Check', 'Data check'), 'seiten/Daten.svelte (checkAuf), lib/datencheck.ts', ['daten-check'], { suche: { fach: 'Daten-Check', en: 'data check' } }),
  DAT('daten-oeffnen', P('Daten öffnen (SPSS, Excel, CSV, Stata, SAS, ODS)', 'Open data (SPSS, Excel, CSV, Stata, SAS, ODS)'), 'seiten/Start.svelte, lib/einlesen.ts', ['daten-oeffnen'], { spss: 'Datei > Öffnen > Daten', suche: { fach: 'Daten öffnen', en: 'open data' } }),
  DAT('eurostat', P('Daten von Eurostat laden', 'Load data from Eurostat'), 'lib/eurostat.ts (eurostatquelle.ts)', ['eurostat-oeffnen'], { suche: { fach: 'Eurostat', en: 'Eurostat' } }),
  DAT('normwerte', P('Normwerte (z, T, IQ, Stanine, Prozentrang)', 'Norm scores (z, T, IQ, stanine, percentile rank)'), 'bausteine (Normwerte im Assistenten Berechnen), hilfe/leistung.ts', ['normwerte'], { suche: { fach: 'Normwerte', en: 'norm scores' } }),
  DAT('klassen-bilden', P('Klassen bilden: Zahlen in Gruppen teilen', 'Form classes: split numbers into groups'), 'bausteine/AssistentUmkodieren.svelte (Klassen)', ['klassen-bilden'], { suche: { fach: 'Klassen bilden', en: 'form classes' } }),
  DAT('raking', P('Gewichte berechnen (Raking)', 'Compute weights (raking)'), 'lib/gewichte.ts (Raking)', ['raking'], { suche: { fach: 'Raking', en: 'raking' } }),
  DAT('kalibrieren-gewichte', P('Gewichte an Randsummen anpassen (Kalibrieren, GREG)', 'Calibrate weights to known totals (GREG)'), 'lib/gewichte.ts (Kalibrieren)', ['kalibrieren-gewichte'], { suche: { fach: 'Kalibrieren', en: 'calibrate weights' } }),
  DAT('stichprobenplan', P('Stichprobenplan der Umfrage angeben', 'Describe the survey sampling design'), 'lib/gewichte.ts (Stichprobenplan)', ['umfrage-stichprobenplan'], { suche: { fach: 'Stichprobenplan', en: 'sampling design' } }),
  DAT('vorlage-protokoll', P('Auswertung mit neuen Daten wiederholen (Vorlage und Protokoll)', 'Repeat the analysis with new data (template and log)'), 'seiten/Protokoll.svelte, lib/abgleich.ts', ['vorlage-protokoll'], { suche: { fach: 'Vorlage', en: 'template' } }),
  DAT('karte-gebiete', P('Karte: eine Zahl je Region', 'Map: one number per region'), 'seiten/Karte.svelte', ['karte'], { suche: { fach: 'Karte', en: 'map' } }),
  DAT('tabelle-zusammenstellen', P('Tabelle zusammenstellen', 'Assemble a table'), 'seiten/Tabelle.svelte', ['tabelle-zusammenstellen'], { suche: { fach: 'Tabelle zusammenstellen', en: 'assemble a table' } }),
  DAT('tabelle-veroeffentlichung', P('Tabelle für die Veröffentlichung (amtliche Statistik)', 'Table for publication (official statistics)'), 'seiten/Amtlich.svelte', ['tabelle-veroeffentlichung'], { suche: { fach: 'Hochrechnung', en: 'official statistics' } }),
  DAT('befehle', P('Befehle (Syntax) ausführen', 'Run commands (syntax)'), 'seiten/Befehle.svelte', ['befehle-seite', 'syntax-grundlagen'], { spss: 'Syntax-Editor', suche: { fach: 'Syntax', en: 'syntax' } })
];

/* ---------- 5. Exporte ---------- */
const EXP = (id: string, name: Paar, quelle: string, hilfe: string[], extra: Partial<Funktion> = {}): Funktion => ({ id, gruppe: 'export', name, quelle, hilfe, ...extra });
const EXPORTE: Funktion[] = [
  EXP('export-ergebnis-word', P('Ergebnisse als Word-Datei', 'Results as Word file'), 'seiten/Blatt.svelte (Ergebnis-Menü: word)', ['bericht-seite'], { suche: { fach: 'Word', en: 'Word' } }),
  EXP('export-ergebnis-pdf', P('Ergebnisse als PDF (über Drucken, getaggt)', 'Results as PDF (via Print, tagged)'), 'seiten/Blatt.svelte (Ergebnis-Menü: pdf-bf)', ['bericht-seite'], { suche: { fach: 'PDF', en: 'PDF' } }),
  EXP('export-ergebnis-excel', P('Ergebnisse als Excel-Datei', 'Results as Excel file'), 'seiten/Blatt.svelte (Ergebnis-Menü: excel)', ['bericht-seite'], { suche: { fach: 'Excel', en: 'Excel' } }),
  EXP('export-tabelle', P('Einzelne Tabelle als Word oder Excel', 'Single table as Word or Excel'), 'bausteine/Ausgabe.svelte (word, excel)', ['bericht-seite'], { suche: { fach: 'einzelne Tabelle', en: 'single table' } }),
  EXP('export-diagramm', P('Diagramm als PNG, SVG, PDF oder Bild kopieren', 'Chart as PNG, SVG, PDF or copy image'), 'bausteine/DiagrammExport.svelte (png, svg, pdf, kopie)', ['diagramm-anpassen'], { suche: { fach: 'Diagramm speichern', en: 'save chart' } }),
  EXP('export-daten', P('Daten als Excel, SPSS (.sav) oder CSV speichern', 'Save data as Excel, SPSS (.sav) or CSV'), 'seiten/Daten.svelte (ExportMenue: xlsx, sav, csv-codes, csv-text)', ['daten-seite'], { spss: 'Datei > Speichern unter', suche: { fach: 'Daten speichern', en: 'save data' } }),
  EXP('export-bericht', P('Bericht als Word, PDF oder Excel', 'Report as Word, PDF or Excel'), 'seiten/Bericht.svelte', ['bericht-seite'], { suche: { fach: 'Bericht', en: 'report' } }),
  EXP('export-ergebnissatz', P('Ergebnissatz und Zeile für die Arbeit kopieren', 'Copy the result sentence and the line for the paper'), 'seiten/Blatt.svelte (Ergebnissatz, APA-Zeile)', ['ergebnissatz'], { suche: { fach: 'Ergebnissatz', en: 'result sentence' } }),
  EXP('export-projekt', P('Projekt speichern und laden', 'Save and load the project'), 'Projekt-Menü (bausteine)', ['projektmenue', 'datenschutz-projekt'], { suche: { fach: 'Projekt speichern', en: 'save project' } })
];

/* ---------- 6. Lernlabor und Verstehen ---------- */
const VERSTEHEN: Funktion[] = [
  ...KACHELN.map((k): Funktion => ({ id: `verstehen-${k.id}`, gruppe: 'verstehen', name: k.titel, quelle: 'lernen/lernsuche.ts (KACHELN)', hilfe: [k.hilfe], suche: { fach: k.titel.de.split(':')[0]!.trim(), en: k.titel.en.split(':')[0]!.trim() } })),
  ...LABOR_TEILE.map((t): Funktion => ({ id: `labor-${t.id}`, gruppe: 'verstehen', name: P(`Lernlabor: ${t.name.de}`, `Learning lab: ${t.name.en}`), quelle: 'lernen/lernsuche.ts (LABOR_TEILE)', hilfe: ['lernlabor'], suche: { fach: t.name.de, en: t.name.en } })),
  ...PROBIEREN.map((p): Funktion => ({ id: `probieren-${p.id}`, gruppe: 'verstehen', name: P(`Ausprobieren: ${p.titel.de}`, `Try it out: ${p.titel.en}`), quelle: 'lernen/lernsuche.ts (PROBIEREN)', hilfe: [p.hilfe], suche: { fach: p.titel.de.split(':')[0]!.trim(), en: p.titel.en.split(':')[0]!.trim() } }))
];

/* ---------- 7. Rechner „Studie planen“ ---------- */
const PLAN_NAMEN: Record<Test | NeuerTest, Paar> = {
  unabhaengig: P('Fallzahl: zwei Gruppen vergleichen (t-Test)', 'Sample size: compare two groups (t test)'), gepaart: P('Fallzahl: vorher und nachher (gepaarter t-Test)', 'Sample size: before and after (paired t test)'),
  korrelation: P('Fallzahl: Zusammenhang zweier Zahlen (Korrelation)', 'Sample size: relationship of two numbers (correlation)'), anova: P('Fallzahl: drei oder mehr Gruppen (Varianzanalyse)', 'Sample size: three or more groups (ANOVA)'),
  chi2: P('Fallzahl: Häufigkeiten in Gruppen (Chi-Quadrat)', 'Sample size: frequencies across groups (chi-square)'), regression: P('Fallzahl: etwas vorhersagen (Regression)', 'Sample size: predict something (regression)'),
  anteile: P('Fallzahl: Anteile vergleichen', 'Sample size: compare proportions'), ueberleben: P('Fallzahl: Überleben vergleichen (Log-Rank)', 'Sample size: compare survival (log-rank)'),
  auc: P('Fallzahl: Trennschärfe eines Tests (AUC)', 'Sample size: how well a test separates (AUC)'), anovaplus: P('Fallzahl: mehrere Faktoren oder Messwiederholung', 'Sample size: several factors or repeated measures'),
  r2zuwachs: P('Fallzahl: R²-Zuwachs eines Blocks', 'Sample size: R² increase of a block'), partiell: P('Fallzahl: partielle Korrelation', 'Sample size: partial correlation')
};
const PLAN_FACH: Record<Test | NeuerTest, [string, string]> = {
  unabhaengig: ['Poweranalyse', 'power analysis'], gepaart: ['Poweranalyse', 'power analysis'], korrelation: ['Poweranalyse', 'power analysis'], anova: ['Poweranalyse', 'power analysis'], chi2: ['Poweranalyse', 'power analysis'],
  regression: ['Poweranalyse', 'power analysis'], anteile: ['Poweranalyse', 'power analysis'], ueberleben: ['Log-Rank', 'log-rank'], auc: ['AUC', 'AUC'], anovaplus: ['Fallzahl', 'sample size'], r2zuwachs: ['R²-Zuwachs', 'R² increase'], partiell: ['partielle Korrelation', 'partial correlation']
};
const PLAN_HILFE: Partial<Record<Test | NeuerTest, string[]>> = { anovaplus: ['fallzahl-ergaenzen'], r2zuwachs: ['fallzahl-ergaenzen'], partiell: ['fallzahl-ergaenzen'] };
const PLAN_IDS = [...new Set<Test | NeuerTest>([...KLASSISCHE_TESTS, ...NEUE_TESTS, ...F2_TESTS])];
const RECHNER: Funktion[] = PLAN_IDS.map(t => ({
  id: `planen-${t}`, gruppe: 'rechner', name: PLAN_NAMEN[t] ?? P(t, t), quelle: 'lib/power.ts (KLASSISCHE_TESTS, NEUE_TESTS, F2_TESTS), seiten/Planen.svelte', hilfe: PLAN_HILFE[t] ?? ['power'],
  suche: { fach: (PLAN_FACH[t] ?? [t, t])[0], en: (PLAN_FACH[t] ?? [t, t])[1] }
}));

/** SPSS-Menünamen der Karten (Analysieren > …), soweit es sie dort gibt. */
export const SPSS_KARTEN: Record<string, string> = {
  gruppen: 'T-Test bei unabhängigen Stichproben', praepost: 'T-Test bei gepaarten Stichproben', zusammenhang: 'Bivariate Korrelation', korrmatrix: 'Bivariate Korrelation', vorhersage: 'Lineare Regression',
  verteilung: 'Häufigkeiten', kreuz: 'Kreuztabellen', skala: 'Reliabilitätsanalyse', faktor: 'Faktorenanalyse', messwiederholung: 'Allgemeines lineares Modell Messwiederholung', cluster: 'Clusterzentrenanalyse',
  diskriminanz: 'Diskriminanzanalyse', loglinear: 'Loglinear', manova: 'Multivariat', kaplanmeier: 'Kaplan-Meier', mehrebenen: 'Gemischte Modelle', uebereinstimmung: 'Kappa', zeitreihen: 'Zeitreihen'
};
for (const f of NEUE) if (SPSS_KARTEN[f.id]) f.spss = SPSS_KARTEN[f.id];

/** Vertiefende Artikel (Kennungen `vv-*` Vergleiche und Varianzanalyse, `rp-*` Regression prüfen, `lm-*` lineares Modell verstehen), die zu einer Funktion gehören: sie stehen im Feld `hilfe` hinter dem ersten Artikel. Schlüssel: Kennung der Funktion. */
const VERTIEFUNG: Record<string, string[]> = {
  gruppen: ['vv-kontraste', 'vv-trend', 'vv-dunnett', 'lm-signal-rauschen', 'lm-gruppen-regression'],
  'zweifaktorielle-varianzanalyse': ['vv-wechselwirkung', 'vv-einfache-effekte'],
  messwiederholung: ['vv-sphaerizitaet'],
  vorhersage: ['rp-einfluss', 'rp-beitrag', 'rp-ueberanpassung', 'lm-modell-fehler', 'lm-annahmen'],
  zusammenhang: ['rp-korrelationen-vergleichen'],
  verteilung: ['lm-freiheitsgrade'],
  'daten-eingeben': ['lm-daten-anlegen'],
  'daten-diagramm': ['lm-diagramme']
};
for (const f of [...NEUE, ...WEITERE, ...DATENWERKZEUGE]) for (const id of VERTIEFUNG[f.id] ?? []) if (!f.hilfe.includes(id)) f.hilfe.push(id);

export const FUNKTIONEN: Funktion[] = [...NEUE, ...WEITERE, ZAEHLKARTEN, ...ASSIST, ...DATENWERKZEUGE, ...EXPORTE, ...VERSTEHEN, ...RECHNER];

/** Die Kacheln in „Qualität und Prozess“: je Kachel die Funktion, auf die sie zeigt (für den Fundort „Kachel“). */
export const QUALITAET_KACHELN: { kachel: string; funktion: string }[] = qualitaetKarten().map(q => ({ kachel: q.id, funktion: q.id === 'zaehlkarte' ? 'zaehlkarten' : (QUALITAET_ZU_ARTIKEL[q.id] ?? q.id) }));
export const GRUPPEN: { id: FunktionsGruppe; name: Paar }[] = [
  { id: 'neue-auswertung', name: P('Karten in „Neue Auswertung“', 'Cards in "New analysis"') },
  { id: 'weitere', name: P('Weitere Auswertungen', 'More analyses') },
  { id: 'assistent', name: P('Daten-Assistenten', 'Data assistants') },
  { id: 'datenwerkzeug', name: P('Datenwerkzeuge', 'Data tools') },
  { id: 'export', name: P('Exporte', 'Exports') },
  { id: 'verstehen', name: P('Lernlabor und Verstehen', 'Learning lab and Understand') },
  { id: 'rechner', name: P('Rechner „Studie planen“', 'Calculators "Plan a study"') }
];
