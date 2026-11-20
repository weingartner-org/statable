/**
 * Üben: Fallreihen zu den echten Beispielen (Stufe 2.3 des Vorhabens „nutzen“, Johannes 09.11.2026): je Beispiel zwei bis vier Fragen zum Deuten
 * einer Ergebnistabelle, mit je einer typischen Fehldeutung. Eigene Wortlaute. Kennungen `bx-<kurz>-…` (Kurzform je Beispiel in BX_FALL).
 * Jede Zahl in Frage, Tabelle und Antwort kommt aus app/src/lib/testdaten/ueben-erwartet-beispiele-echt.json (R, vom Prüfer, scripts/ueben-erwartet-beispiele-echt.R):
 * Die Hilfen `Z(<beispiel>).d/e/c/pd/pe/cp` holen sie dort ab und runden wie in Statable üblich; Zahlen von Hand stehen nur als einfache Konstanten da (1, 0, 0,05 …).
 * Der Wächter fragen-beispiele-echt.test.ts prüft jede Zahl in Tabellen und Texten gegen die JSON-Datei.
 * Belege: der Hilfe-Artikel (`Hilfe:<id>`) und die Sollwert-Datei.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, Tabelle, ThemaModul } from './fragen';
import ERW from '../lib/testdaten/ueben-erwartet-beispiele-echt.json';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const T = 'beispiele';
const SOLL = 'Code:lib/testdaten/ueben-erwartet-beispiele-echt.json';

/** Sollwerte je Beispiel (Schlüssel = Beispiel-Id). */
export const BX_JSON = (ERW as unknown as { aufgaben: Record<string, Record<string, number>> }).aufgaben;

/** Zahlen eines Beispiels aus der Sollwert-Datei: `d` deutsch (Komma), `e` englisch (Punkt), `c` Tabellenzelle (Punkt, die Tabelle setzt das Dezimalzeichen), `pd`/`pe`/`cp` für p-Werte. */
const Z = (b: string) => {
  const w = (k: string): number => { const v = BX_JSON[b]?.[k]; if (v === undefined) throw new Error(`ueben-erwartet-beispiele-echt.json: kein Wert „${b}.${k}“`); return v; };
  const pText = (k: string): string => { const v = w(k); return v < 0.001 ? '< 0.001' : `= ${v.toFixed(v >= 0.1 ? 2 : 3)}`; };
  return {
    d: (k: string, s = 2): string => w(k).toFixed(s).replace('.', ','),
    e: (k: string, s = 2): string => w(k).toFixed(s),
    da: (k: string, s = 2): string => Math.abs(w(k)).toFixed(s).replace('.', ','),
    ea: (k: string, s = 2): string => Math.abs(w(k)).toFixed(s),
    c: (k: string, s = 2): string | number => (s === 0 ? Number(w(k).toFixed(0)) : w(k).toFixed(s)),
    pd: (k: string): string => pText(k).replace('.', ','),
    pe: (k: string): string => pText(k),
    cp: (k: string): string => { const v = w(k); return v < 0.001 ? '<0.001' : v.toFixed(3); }
  };
};

const tabelle = (titel: Tabelle['titel'], kopf: Tabelle['kopf'], zeilen: Tabelle['zeilen'], quelle: Tabelle['quelle']): Tabelle => ({ titel, kopf, zeilen, quelle });

/** Fallreihe → Beispiel (der Wächter holt damit die Sollwerte). */
export const BX_FALL: Record<string, string> = {
  'bx-tit': 'titanic', 'bx-ber': 'berkeley-zulassung', 'bx-gal': 'galton-koerpergroesse', 'bx-pin': 'pinguine', 'bx-wei': 'wein', 'bx-bet': 'beton',
  'bx-her': 'herzinsuffizienz', 'bx-bru': 'brustkrebs-diagnostik', 'bx-sch': 'schlafentzug', 'bx-dia': 'diagnosen-uebereinstimmung', 'bx-lae': 'laenderspiele',
  'bx-co2': 'co2', 'bx-kal': 'kalibrierung', 'bx-spo': 'schule-portugal', 'bx-bil': 'bildung-ungleichheit', 'bx-arb': 'arbeit-einkommen-puf',
  'bx-woe': 'woerter-erkennen', 'bx-ank': 'anker-effekt'
};

const TI = Z('titanic'), BE = Z('berkeley-zulassung'), GA = Z('galton-koerpergroesse'), PI = Z('pinguine'), WE = Z('wein'), BT = Z('beton');
const HE = Z('herzinsuffizienz'), BR = Z('brustkrebs-diagnostik'), SC = Z('schlafentzug'), DI = Z('diagnosen-uebereinstimmung'), LA = Z('laenderspiele');
const CO = Z('co2'), KA = Z('kalibrierung'), SP = Z('schule-portugal'), BI = Z('bildung-ungleichheit'), AR = Z('arbeit-einkommen-puf');
const WO = Z('woerter-erkennen'), AN = Z('anker-effekt');

const QU = (de: string, en: string) => P(`Zahlen: Beispiel „${de}“ in Statable, mit R nachgerechnet (Sollwerte der Prüfung).`, `Figures: example "${en}" in Statable, recomputed with R (reference values of the check).`);
const Q_TIT = QU('Titanic', 'Titanic'), Q_BER = QU('Zulassung in Berkeley 1973', 'Admission at Berkeley 1973'), Q_GAL = QU('Galtons Körpergrößen', "Galton's body heights");
const Q_PIN = QU('Pinguine der Antarktis', 'Penguins of the Antarctic'), Q_WEI = QU('Vinho Verde', 'Vinho Verde'), Q_BET = QU('Beton', 'Concrete');
const Q_HER = QU('Überleben bei Herzschwäche', 'Survival with heart failure'), Q_BRU = QU('Gutartig oder bösartig', 'Benign or malignant');
const Q_SCH = QU('Schlafentzug und Reaktionszeit', 'Sleep deprivation and reaction time'), Q_DIA = QU('Psychiatrische Diagnosen', 'Psychiatric diagnoses');
const Q_LAE = QU('Heimvorteil im Fußball', 'Home advantage in football'), Q_CO2 = QU('CO₂ je Kopf', 'CO₂ per person'), Q_KAL = QU('Kalibriergerade', 'Calibration line');
const Q_SPO = QU('Noten an zwei Schulen in Portugal', 'Grades at two schools in Portugal'), Q_BIL = QU('Bildung und Ungleichheit', 'Education and inequality');
const Q_ARB = QU('Arbeit und Einkommen', 'Work and income'), Q_WOE = QU('Wörter erkennen', 'Recognising words'), Q_ANK = QU('Anker-Effekt', 'Anchoring effect');

export const FAELLE: NonNullable<ThemaModul['FAELLE']> = {
  // ======================================================== Titanic
  'bx-tit': {
    titel: P('Titanic: Überlebten Frauen öfter als Männer? Kreuztabelle und Chi-Quadrat-Test aus dem Beispiel „Titanic“', 'Titanic: did women survive more often than men? Crosstab and chi-square test from the example "Titanic"'),
    tabellen: [
      tabelle(P('Überleben nach Geschlecht (Zahl der Personen)', 'Survival by sex (number of people)'), [P('Geschlecht', 'Sex'), P('Überlebt', 'Survived'), P('Gestorben', 'Died'), P('Überlebt (Prozent)', 'Survived (percent)')],
        [['Frauen', TI.c('frauen_ueberlebt', 0), TI.c('frauen_gestorben', 0), TI.c('ueberlebt_frauen_prozent', 1)], ['Männer', TI.c('maenner_ueberlebt', 0), TI.c('maenner_gestorben', 0), TI.c('ueberlebt_maenner_prozent', 1)]], Q_TIT),
      tabelle(P('Chi-Quadrat-Test und Maße des Zusammenhangs', 'Chi-square test and measures of association'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Chi²', TI.c('chi2', 1)], ['Freiheitsgrade', TI.c('df', 0)], ['p', TI.cp('p')], ['Cramérs V', TI.c('cramers_v', 2)], ['Odds Ratio (Frauen gegen Männer)', TI.c('odds_ratio_frauen_gegen_maenner', 1)]], Q_TIT)
    ]
  },
  // ======================================================== Berkeley
  'bx-ber': {
    titel: P('Zulassung an einer Universität (Berkeley 1973): Männer und Frauen, alle Fachbereiche zusammen und die Fachbereiche A und C einzeln', 'Admission at a university (Berkeley 1973): men and women, all departments together and departments A and C separately'),
    tabellen: [
      tabelle(P('Alle Fachbereiche zusammen', 'All departments together'), [P('Geschlecht', 'Sex'), P('Bewerbungen', 'Applications'), P('Zugelassen (Prozent)', 'Admitted (percent)')],
        [['Männer', BE.c('bewerbungen_maenner_gesamt', 0), BE.c('quote_maenner_gesamt_prozent', 1)], ['Frauen', BE.c('bewerbungen_frauen_gesamt', 0), BE.c('quote_frauen_gesamt_prozent', 1)]], Q_BER),
      tabelle(P('Zugelassen (Prozent) im Fachbereich', 'Admitted (percent) in the department'), [P('Fachbereich', 'Department'), P('Männer', 'Men'), P('Frauen', 'Women')],
        [['A', BE.c('quote_maenner_fb_a_prozent', 1), BE.c('quote_frauen_fb_a_prozent', 1)], ['C', BE.c('quote_maenner_fb_c_prozent', 1), BE.c('quote_frauen_fb_c_prozent', 1)]], Q_BER)
    ]
  },
  // ======================================================== Galton
  'bx-gal': {
    titel: P('Galtons Familiendaten: Körpergröße der Kinder (cm) und Eltern-Mitte (cm), lineare Regression der Kindergröße auf die Eltern-Mitte', "Galton's family data: height of the children (cm) and mid-parent height (cm), linear regression of the child's height on the mid-parent height"),
    tabellen: [
      tabelle(P('Regression der Kindergröße auf die Eltern-Mitte', 'Regression of the child\'s height on the mid-parent height'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Steigung b', GA.c('steigung', 2)], ['Achsenabschnitt', GA.c('achsenabschnitt', 1)], ['Korrelation r', GA.c('r_eltern_mittel_kind', 2)], ['R²', GA.c('r2', 2)], ['R² mit Geschlecht des Kindes', GA.c('r2_mit_geschlecht', 2)]], Q_GAL),
      tabelle(P('Mittelwert und Standardabweichung (cm)', 'Mean and standard deviation (cm)'), [P('Größe', 'Height'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation')],
        [['Kinder', GA.c('mittel_kind', 1), GA.c('sd_kind', 1)], ['Eltern-Mitte', GA.c('mittel_eltern_mittel', 1), GA.c('sd_eltern_mittel', 1)]], Q_GAL)
    ]
  },
  // ======================================================== Pinguine
  'bx-pin': {
    titel: P('Pinguine der Antarktis: Flossenlänge (mm) bei drei Arten, Varianzanalyse; dazu Schnabellänge und Schnabeltiefe (mm)', 'Penguins of the Antarctic: flipper length (mm) in three species, analysis of variance; and bill length and bill depth (mm)'),
    tabellen: [
      tabelle(P('Flossenlänge nach Art', 'Flipper length by species'), [P('Art', 'Species'), P('Tiere', 'Animals'), P('Mittelwert (mm)', 'Mean (mm)')],
        [['Adeliepinguin', PI.c('n_adelie', 0), PI.c('mittel_flosse_adelie', 1)], ['Zügelpinguin', PI.c('n_zuegel', 0), PI.c('mittel_flosse_zuegel', 1)], ['Eselspinguin', PI.c('n_esel', 0), PI.c('mittel_flosse_esel', 1)]], Q_PIN),
      tabelle(P('Varianzanalyse (ANOVA) der Flossenlänge', 'Analysis of variance (ANOVA) of flipper length'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['F', PI.c('anova_f', 1)], ['Freiheitsgrade Zähler', PI.c('anova_df1', 0)], ['Freiheitsgrade Nenner', PI.c('anova_df2', 0)], ['p', PI.cp('anova_p')], ['eta²', PI.c('eta2', 2)]], Q_PIN),
      tabelle(P('Korrelation von Schnabellänge und Schnabeltiefe', 'Correlation of bill length and bill depth'), [P('Tiere', 'Animals'), P('Korrelation r', 'Correlation r')],
        [['Alle Arten zusammen', PI.c('r_schnabel_gesamt', 2)], ['Adeliepinguin', PI.c('r_schnabel_adelie', 2)], ['Zügelpinguin', PI.c('r_schnabel_zuegel', 2)], ['Eselspinguin', PI.c('r_schnabel_esel', 2)]], Q_PIN)
    ]
  },
  // ======================================================== Wein
  'bx-wei': {
    titel: P('Vinho Verde: Note der Verkostung (0 bis 10), vorhergesagt aus elf Laborwerten und der Weinfarbe (lineare Regression)', 'Vinho Verde: tasting score (0 to 10), predicted from eleven laboratory values and the wine colour (linear regression)'),
    tabellen: [
      tabelle(P('Anpassung der Regression', 'Fit of the regression'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['R²', WE.c('r2', 3)], ['R² korrigiert', WE.c('r2_korrigiert', 3)]], Q_WEI),
      tabelle(P('Varianzinflationsfaktor (VIF) einiger Angaben', 'Variance inflation factor (VIF) of some variables'), [P('Angabe', 'Variable'), P('VIF', 'VIF')],
        [['Dichte', WE.c('vif_wein_dichte', 1)], ['Restzucker', WE.c('vif_restzucker', 1)], ['Alkohol', WE.c('vif_alkohol_vol', 1)], ['Weinfarbe', WE.c('vif_weinfarbe', 1)], ['Chlorid', WE.c('vif_chlorid', 1)]], Q_WEI),
      tabelle(P('Korrelation von Alkohol und Note', 'Correlation of alcohol and score'), [P('Verfahren', 'Method'), P('Korrelation', 'Correlation')],
        [['Pearson', WE.c('r_alkohol_note', 2)], ['Spearman', WE.c('r_spearman_alkohol_note', 2)]], Q_WEI)
    ]
  },
  // ======================================================== Beton
  'bx-bet': {
    titel: P('Beton: Druckfestigkeit (MPa) bei Prüfungen im Labor, Zement (kg je Kubikmeter) und Alter bei der Prüfung (Tage)', 'Concrete: compressive strength (MPa) in laboratory tests, cement (kg per cubic metre) and age at testing (days)'),
    tabellen: [
      tabelle(P('Korrelation mit der Druckfestigkeit', 'Correlation with the compressive strength'), [P('Angabe', 'Variable'), P('Korrelation r', 'Correlation r')],
        [['Zement', BT.c('r_zement_festigkeit', 2)]], Q_BET),
      tabelle(P('Alter und Festigkeit: wie gut passt welche Form? (R²)', 'Age and strength: how well does which form fit? (R²)'), [P('Form der Linie', 'Form of the line'), P('R²', 'R²')],
        [['Gerade', BT.c('r2_alter_linear', 3)], ['Logarithmus', BT.c('r2_alter_log', 3)]], Q_BET)
    ]
  },
  // ======================================================== Herzinsuffizienz
  'bx-her': {
    titel: P('Menschen mit Herzschwäche, bis zu 285 Tage beobachtet: Überleben nach Auswurffraktion (drei Gruppen) und Cox-Regression', 'People with heart failure, followed for up to 285 days: survival by ejection fraction (three groups) and Cox regression'),
    tabellen: [
      tabelle(P('Gruppen der Auswurffraktion', 'Groups of the ejection fraction'), [P('Auswurffraktion', 'Ejection fraction'), P('Personen', 'People'), P('Gestorben', 'Died')],
        [['0 bis 30 %', HE.c('n_gruppe1', 0), HE.c('ereignisse_gruppe1', 0)], ['31 bis 40 %', HE.c('n_gruppe2', 0), HE.c('ereignisse_gruppe2', 0)], ['41 bis 80 %', HE.c('n_gruppe3', 0), HE.c('ereignisse_gruppe3', 0)]], Q_HER),
      tabelle(P('Log-Rank-Test über die drei Gruppen', 'Log-rank test across the three groups'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Chi²', HE.c('logrank_chi2', 1)], ['Freiheitsgrade', HE.c('logrank_df', 0)], ['p', HE.cp('logrank_p')]], Q_HER),
      tabelle(P('Cox-Regression: Hazard Ratio je Einheit', 'Cox regression: hazard ratio per unit'), [P('Angabe', 'Variable'), P('Hazard Ratio', 'Hazard ratio')],
        [['Alter (je Jahr)', HE.c('hr_alter', 2)], ['Auswurffraktion (je Prozentpunkt)', HE.c('hr_auswurffraktion', 2)], ['Kreatinin (je mg/dl)', HE.c('hr_serumkreatinin', 2)]], Q_HER)
    ]
  },
  // ======================================================== Brustkrebs
  'bx-bru': {
    titel: P('Gewebeproben der Brust: Radius der Zellkerne bei gutartigen und bösartigen Proben, Vergleich der Gruppen', 'Breast tissue samples: radius of the cell nuclei in benign and malignant samples, comparison of the groups'),
    tabellen: [
      tabelle(P('Radius der Zellkerne nach Befund', 'Radius of the cell nuclei by finding'), [P('Befund', 'Finding'), P('Proben', 'Samples'), P('Mittelwert', 'Mean'), P('Standardabweichung', 'Standard deviation')],
        [['gutartig', BR.c('n_gutartig', 0), BR.c('mittel_radius_gutartig', 1), BR.c('sd_radius_gutartig', 1)], ['bösartig', BR.c('n_boesartig', 0), BR.c('mittel_radius_boesartig', 1), BR.c('sd_radius_boesartig', 1)]], Q_BRU),
      tabelle(P('t-Test nach Welch, Effektstärke und Trennschärfe', 'Welch t test, effect size and separation'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['t (Welch)', BR.c('welch_t', 1)], ['p', BR.cp('welch_p')], ['Cohens d', BR.c('cohens_d', 1)], ['AUC Radius', BR.c('auc_radius', 2)], ['AUC Textur', BR.c('auc_textur', 2)]], Q_BRU)
    ]
  },
  // ======================================================== Schlafentzug
  'bx-sch': {
    titel: P('18 Personen schlafen zehn Tage lang nur drei Stunden pro Nacht; gemessen wird täglich die mittlere Reaktionszeit (Millisekunden)', '18 people sleep only three hours a night for ten days; the mean reaction time (milliseconds) is measured daily'),
    tabellen: [
      tabelle(P('Einfache Korrelation (jede Zeile als eigene Person gezählt)', 'Simple correlation (each row counted as a separate person)'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Korrelation Tag und Reaktionszeit', SC.c('r_tage_reaktion', 2)]], Q_SCH),
      tabelle(P('Mehrebenenmodell mit Personen als zweiter Ebene', 'Multilevel model with people as the second level'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['ICC im Nullmodell', SC.c('icc_nullmodell', 2)], ['Feste Steigung je Tag (ms)', SC.c('feste_steigung', 1)], ['Achsenabschnitt (ms)', SC.c('feste_achsenabschnitt', 1)]], Q_SCH)
    ]
  },
  // ======================================================== Diagnosen
  'bx-dia': {
    titel: P('30 Patientinnen und Patienten, jeweils mehrere unabhängige Diagnosen von Fachleuten (zum Beispiel Depression, Neurose, Schizophrenie)', '30 patients, several independent diagnoses each from experts (for example depression, neurosis, schizophrenia)'),
    tabellen: [
      tabelle(P('Übereinstimmung der Beurteilungen', 'Agreement of the ratings'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Gleiche Diagnose, Beurteilung 1 und 2 (Prozent)', DI.c('uebereinstimmung_1_2_prozent', 1)], ['Cohens Kappa, Beurteilung 1 und 2', DI.c('cohens_kappa_1_2', 2)], ['Fleiss-Kappa, alle sechs Beurteilungen', DI.c('fleiss_kappa_alle6', 2)], ['Fleiss-Kappa, erste drei Beurteilungen', DI.c('fleiss_kappa_erste3', 2)]], Q_DIA)
    ]
  },
  // ======================================================== Länderspiele
  'bx-lae': {
    titel: P('Länderspiele seit 2017: Tore der Heim- und der Gastmannschaft je Spiel, Heimsiege und Spielort', 'International matches since 2017: goals of the home and the away team per match, home wins and venue'),
    tabellen: [
      tabelle(P('Tore je Spiel', 'Goals per match'), [P('Mannschaft', 'Team'), P('Mittelwert', 'Mean'), P('Varianz', 'Variance')],
        [['Heim', LA.c('mittel_tore_heim', 2), LA.c('var_tore_heim', 2)], ['Gast', LA.c('mittel_tore_gast', 2), LA.c('var_tore_gast', 2)]], Q_LAE),
      tabelle(P('Ergebnis (Heimsieg, Unentschieden, Gastsieg) nach Spielort', 'Result (home win, draw, away win) by venue'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Heimsiege (Prozent)', LA.c('heimsiege_prozent', 1)], ['Chi²', LA.c('chi2', 1)], ['Freiheitsgrade', LA.c('df', 0)], ['p', LA.cp('p')], ['Cramérs V', LA.c('cramers_v', 2)]], Q_LAE)
    ]
  },
  // ======================================================== CO2
  'bx-co2': {
    titel: P('CO₂-Ausstoß je Einwohnerin und Einwohner der Welt (Tonnen), Jahr für Jahr über mehrere Jahrzehnte: Trendgerade', 'CO₂ emissions per person in the world (tonnes), year by year over several decades: trend line'),
    tabellen: [
      tabelle(P('Trendgerade und Autokorrelation', 'Trend line and autocorrelation'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Trend (Tonnen je Jahr)', CO.c('steigung_je_jahr', 3)], ['Korrelation Jahr und Wert', CO.c('r_jahr_welt', 2)], ['R² der Trendgeraden', CO.c('r2_trend', 2)], ['Autokorrelation (Verzögerung 1), Reihe', CO.c('autokorr_lag1_reihe', 2)], ['Autokorrelation (Verzögerung 1), Reste', CO.c('autokorr_lag1_reste', 2)]], Q_CO2)
    ]
  },
  // ======================================================== Kalibrierung
  'bx-kal': {
    titel: P('Flüssigkeitschromatographie: Signal (Peakfläche) bei sechs bekannten Konzentrationen, je fünf Messungen; Kalibriergerade nach DIN 32645 mit α = 1 %', 'Liquid chromatography: signal (peak area) at six known concentrations, five measurements each; calibration line according to DIN 32645 with α = 1%'),
    tabellen: [
      tabelle(P('Kalibriergerade (Signal gegen Konzentration)', 'Calibration line (signal against concentration)'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Steigung', KA.c('kal_steigung', 2)], ['Achsenabschnitt', KA.c('kal_achsenabschnitt', 2)], ['Reststandardabweichung', KA.c('kal_reststandardabweichung', 2)], ['R²', KA.c('kal_r2', 3)], ['Verfahrensstandardabweichung', KA.c('kal_verfahrensstandardabweichung', 2)]], Q_KAL),
      tabelle(P('Grenzen bei α = 1 % (in Konzentrationseinheiten)', 'Limits at α = 1% (in concentration units)'), [P('Grenze', 'Limit'), P('Wert', 'Value')],
        [['Nachweisgrenze', KA.c('kal_nachweisgrenze_a01', 1)], ['Erfassungsgrenze', KA.c('kal_erfassungsgrenze_a01', 1)], ['Bestimmungsgrenze', KA.c('kal_bestimmungsgrenze_a01', 1)]], Q_KAL)
    ]
  },
  'bx-spo': {
    titel: P('Jugendliche an zwei Schulen in Portugal: dieselben Personen mit drei Noten im Schuljahr (0 bis 20), Varianzanalyse mit Messwiederholung; dazu Hochschulwunsch und Endnote', 'Young people at two schools in Portugal: the same people with three grades in the school year (0 to 20), repeated-measures analysis of variance; and university plans and final grade'),
    tabellen: [
      tabelle(P('Mittelwerte der Noten über das Schuljahr', 'Mean grades over the school year'), [P('Abschnitt', 'Term'), P('Mittelwert', 'Mean')],
        [['1. Abschnitt', SP.c('mittel_g1', 2)], ['2. Abschnitt', SP.c('mittel_g2', 2)], ['3. Abschnitt', SP.c('mittel_g3', 2)]], Q_SPO),
      tabelle(P('Messwiederholung und Wechselwirkung Zeit mal Schule', 'Repeated measures and interaction time by school'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Epsilon (Greenhouse-Geisser)', SP.c('rm_gemischt_epsilon_gg', 2)], ['F der Wechselwirkung', SP.c('rm_gemischt_wechselwirkung_f', 2)], ['p der Wechselwirkung', SP.cp('rm_gemischt_wechselwirkung_p')], ['p der Wechselwirkung (korrigiert)', SP.cp('rm_gemischt_wechselwirkung_p_gg')]], Q_SPO),
      tabelle(P('Endnote nach Hochschulwunsch', 'Final grade by university plans'), [P('Hochschulwunsch', 'University plans'), P('Jugendliche', 'Young people'), P('Mittelwert', 'Mean')],
        [['Ja', SP.c('hochschulwunsch_n_ja', 0), SP.c('hochschulwunsch_mittel_ja', 1)], ['Nein', SP.c('hochschulwunsch_n_nein', 0), SP.c('hochschulwunsch_mittel_nein', 1)]], Q_SPO)
    ]
  },
  // ======================================================== Bildung und Ungleichheit
  'bx-bil': {
    titel: P('Länder der Welt: Anteil der Erwachsenen mit Abschluss der Sekundarstufe II (Prozent) und Gini-Index der Einkommen (0 bis 100)', 'Countries of the world: share of adults with upper secondary education (percent) and the Gini index of incomes (0 to 100)'),
    tabellen: [
      tabelle(P('Korrelation von Schulabschluss und Gini-Index', 'Correlation of school completion and the Gini index'), [P('Verfahren', 'Method'), P('Korrelation', 'Correlation'), P('Länder', 'Countries')],
        [['Pearson', BI.c('r_abschluss_gini', 2), BI.c('n_abschluss_gini', 0)], ['Spearman', BI.c('r_spearman_abschluss_gini', 2), BI.c('n_abschluss_gini', 0)]], Q_BIL),
      tabelle(P('Varianzanalyse nach Welch: Gini-Index nach Weltregion', 'Welch analysis of variance: Gini index by world region'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['F (Welch)', BI.c('welch_f', 1)], ['Freiheitsgrade Zähler', BI.c('welch_df1', 0)], ['Freiheitsgrade Nenner', BI.c('welch_df2', 1)], ['p', BI.cp('welch_p')]], Q_BIL)
    ]
  },
  // ======================================================== Arbeit und Einkommen
  'bx-arb': {
    titel: P('Erfundene Befragungsdaten im Stil eines Public-Use-Files: monatliches Nettoeinkommen Erwerbstätiger (Euro), mit dem Gewicht hochgerechnet', 'Invented survey data in the style of a public-use file: monthly net income of employed people (euro), scaled up with the weight'),
    tabellen: [
      tabelle(P('Verteilung und Ungleichheit der Einkommen', 'Distribution and inequality of incomes'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Median (gewichtet)', AR.c('median_gewichtet', 0)], ['20-%-Quantil', AR.c('q20_gewichtet', 0)], ['80-%-Quantil', AR.c('q80_gewichtet', 0)], ['Gini-Koeffizient (Prozent)', AR.c('gini_prozent', 1)], ['S80/S20', AR.c('s80_s20', 2)]], Q_ARB),
      tabelle(P('Median des Einkommens nach Geschlecht (gewichtet)', 'Median income by gender (weighted)'), [P('Geschlecht', 'Gender'), P('Median (Euro)', 'Median (euro)')],
        [['männlich', AR.c('median_gewichtet_maennlich', 0)], ['weiblich', AR.c('median_gewichtet_weiblich', 0)]], Q_ARB)
    ]
  },
  // ======================================================== Wörter erkennen
  'bx-woe': {
    titel: P('21 Personen entscheiden am Bildschirm, ob eine Buchstabenfolge ein englisches Wort ist; Reaktionszeit (ms) bei Wörtern für Pflanzen und für Tiere', '21 people decide on screen whether a string of letters is an English word; reaction time (ms) for words for plants and for animals'),
    tabellen: [
      tabelle(P('Reaktionszeit nach Wortart', 'Reaction time by word type'), [P('Wortart', 'Word type'), P('Antworten', 'Responses'), P('Mittelwert (ms)', 'Mean (ms)')],
        [['Pflanze', WO.c('n_pflanze', 0), WO.c('mittel_pflanze', 1)], ['Tier', WO.c('n_tier', 0), WO.c('mittel_tier', 1)]], Q_WOE),
      tabelle(P('Test auf Unterschied und Äquivalenztest (TOST)', 'Test for a difference and equivalence test (TOST)'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['Differenz Pflanze minus Tier (ms)', WO.c('differenz_pflanze_minus_tier', 1)], ['t (Welch)', WO.c('welch_t', 2)], ['p (Welch)', WO.c('welch_p', 2)], ['90-%-KI untere Grenze (ms)', WO.c('ki90_ug', 1)], ['90-%-KI obere Grenze (ms)', WO.c('ki90_og', 1)], ['Äquivalenzgrenze (ms)', WO.c('tost_grenze_ms', 0)], ['p (TOST)', WO.c('tost_p', 3)]], Q_WOE)
    ]
  },
  // ======================================================== Anker-Effekt
  'bx-ank': {
    titel: P('Schätzung der Entfernung San Francisco - New York (Meilen) nach einem niedrigen oder einem hohen Anker, zufällig zugeteilt; Länder des Standorts', 'Estimate of the distance San Francisco - New York (miles) after a low or a high anchor, assigned at random; countries of the site'),
    tabellen: [
      tabelle(P('Schätzung nach Anker', 'Estimate by anchor'), [P('Anker', 'Anchor'), P('Personen', 'People'), P('Mittelwert (Meilen)', 'Mean (miles)')],
        [['niedrig', AN.c('n_niedrig', 0), AN.c('mittel_niedrig', 1)], ['hoch', AN.c('n_hoch', 0), AN.c('mittel_hoch', 1)]], Q_ANK),
      tabelle(P('Vergleich der Anker und Wechselwirkung Anker mal Land', 'Comparison of the anchors and interaction anchor by country'), [P('Maß', 'Measure'), P('Wert', 'Value')],
        [['t (Welch)', AN.c('welch_t', 1)], ['Cohens d', AN.c('cohens_d', 2)], ['F der Wechselwirkung', AN.c('anova_ww_f', 2)], ['Freiheitsgrade Zähler', AN.c('anova_ww_df1', 0)], ['Freiheitsgrade Nenner', AN.c('anova_ww_df2', 0)], ['p der Wechselwirkung', AN.c('anova_ww_p', 3)]], Q_ANK)
    ]
  }
};

export const FRAGEN: Frage[] = [
  // ======================================================== 1. Titanic (tit)
  {
    id: 'bx-tit-or', thema: T, fall: 'bx-tit',
    stamm: P(`Die Kreuztabelle zeigt für Frauen gegen Männer ein Odds Ratio von ${TI.d('odds_ratio_frauen_gegen_maenner', 1)}. Wie ist dieser Wert zu lesen?`, `The crosstab shows an odds ratio of ${TI.e('odds_ratio_frauen_gegen_maenner', 1)} for women against men. How is this value to be read?`),
    antworten: [
      a(P(`Die Chance (Odds) zu überleben war bei Frauen etwa ${TI.d('odds_ratio_frauen_gegen_maenner', 0)}-mal so hoch wie bei Männern`, `The odds of surviving were about ${TI.e('odds_ratio_frauen_gegen_maenner', 0)} times as high for women as for men`), P('Das Odds Ratio ist der Quotient zweier Chancen (Überlebende geteilt durch Gestorbene) und nicht zweier Anteile. Ein Wert über 1 zeigt: Die Chance war bei Frauen größer.', 'The odds ratio is the quotient of two odds (survivors divided by those who died) and not of two shares. A value above 1 shows that the odds were larger for women.'), true),
      a(P(`Die Wahrscheinlichkeit zu überleben war bei Frauen ${TI.d('odds_ratio_frauen_gegen_maenner', 0)}-mal so hoch wie bei Männern`, `The probability of surviving was ${TI.e('odds_ratio_frauen_gegen_maenner', 0)} times as high for women as for men`), P(`Die Anteile sind ${TI.d('ueberlebt_frauen_prozent', 1)} und ${TI.d('ueberlebt_maenner_prozent', 1)} Prozent. Ihr Verhältnis ist deutlich kleiner als das Odds Ratio; es hieße relatives Risiko.`, `The shares are ${TI.e('ueberlebt_frauen_prozent', 1)} and ${TI.e('ueberlebt_maenner_prozent', 1)} percent. Their ratio is clearly smaller than the odds ratio; it is called the relative risk.`)),
      a(P(`Das Geschlecht war die Ursache des Überlebens, denn ein Odds Ratio von ${TI.d('odds_ratio_frauen_gegen_maenner', 0)} belegt eine Wirkung`, `Sex was the cause of survival, because an odds ratio of ${TI.e('odds_ratio_frauen_gegen_maenner', 0)} proves an effect`), P('Ein Odds Ratio beschreibt einen Zusammenhang in den beobachteten Daten. Ob das Geschlecht allein wirkte, zeigt es nicht: Reiseklasse und Alter gehen ebenfalls mit ein.', 'An odds ratio describes an association in the observed data. It does not show whether sex alone had an effect: travel class and age also play a part.')),
      a(P(`Frauen überlebten um ${TI.d('odds_ratio_frauen_gegen_maenner', 0)} Prozent häufiger als Männer`, `Women survived ${TI.e('odds_ratio_frauen_gegen_maenner', 0)} percent more often than men`), P(`Ein Odds Ratio ist keine Prozentzahl. Der Abstand der Anteile (${TI.d('ueberlebt_frauen_prozent', 1)} gegen ${TI.d('ueberlebt_maenner_prozent', 1)} Prozent) ist eine andere Angabe.`, `An odds ratio is not a percentage. The gap between the shares (${TI.e('ueberlebt_frauen_prozent', 1)} against ${TI.e('ueberlebt_maenner_prozent', 1)} percent) is a different statement.`))
    ],
    hilfe: ['odds-ratio', 'chi-quadrat'], belege: ['Hilfe:odds-ratio', SOLL]
  },
  {
    id: 'bx-tit-v', thema: T, fall: 'bx-tit',
    stamm: P(`Der Chi-Quadrat-Test ergibt Chi² = ${TI.d('chi2', 1)} mit p ${TI.pd('p')} und Cramérs V = ${TI.d('cramers_v', 2)}. Was sagt Cramérs V aus?`, `The chi-square test gives chi² = ${TI.e('chi2', 1)} with p ${TI.pe('p')} and Cramér's V = ${TI.e('cramers_v', 2)}. What does Cramér's V tell?`),
    antworten: [
      a(P(`Die Stärke des Zusammenhangs von Geschlecht und Überleben, hier mittel`, `The strength of the association of sex and survival, here medium`), P('V rechnet das Chi² auf die Fallzahl um und liegt zwischen 0 (kein Zusammenhang) und 1 (vollständiger Zusammenhang). Anders als das p wächst V nicht mit der Zahl der Personen.', 'V converts the chi² to the number of cases and lies between 0 (no association) and 1 (complete association). Unlike the p, V does not grow with the number of people.'), true),
      a(P('Die Sicherheit des Ergebnisses: Je kleiner das p, desto größer fällt V aus', 'The certainty of the result: the smaller the p, the larger V turns out'), P('Das p sagt, ob der Zusammenhang zufällig sein könnte, V seine Stärke. Bei sehr vielen Personen ist auch ein kleiner Zusammenhang deutlich, V bleibt dann klein.', 'The p tells whether the association could be chance, V its strength. With very many people even a small association is clear, and V then stays small.')),
      a(P(`Den Anteil der Überlebenden: ${TI.d('cramers_v', 2)} heißt, dass fast die Hälfte überlebte`, `The share of survivors: ${TI.e('cramers_v', 2)} means that almost half survived`), P(`Die Anteile stehen in der Tabelle: ${TI.d('ueberlebt_frauen_prozent', 1)} Prozent bei Frauen, ${TI.d('ueberlebt_maenner_prozent', 1)} bei Männern. V ist kein Anteil von Personen, sondern ein Maß der Stärke.`, `The shares are in the table: ${TI.e('ueberlebt_frauen_prozent', 1)} percent for women, ${TI.e('ueberlebt_maenner_prozent', 1)} for men. V is not a share of people but a measure of strength.`)),
      a(P('Das Odds Ratio, nur auf einer Skala von 0 bis 1 dargestellt', 'The odds ratio, merely shown on a scale from 0 to 1'), P(`Das Odds Ratio ist ein eigenes Maß (hier ${TI.d('odds_ratio_frauen_gegen_maenner', 1)}) ohne Obergrenze. V ist ein Stärkemaß für die ganze Tabelle und gilt auch für Tabellen mit mehr als vier Zellen.`, `The odds ratio is a measure of its own (here ${TI.e('odds_ratio_frauen_gegen_maenner', 1)}) without an upper limit. V is a measure of strength for the whole table and also applies to tables with more than four cells.`))
    ],
    hilfe: ['cramers-v', 'chi-quadrat'], belege: ['Hilfe:cramers-v', SOLL]
  },
  {
    id: 'bx-tit-ursache', thema: T, fall: 'bx-tit',
    stamm: P(`Frauen überlebten mit ${TI.d('ueberlebt_frauen_prozent', 1)} Prozent, Männer mit ${TI.d('ueberlebt_maenner_prozent', 1)} Prozent. Welche Schlussfolgerung stützen die Zahlen dieser Tabelle?`, `Women survived with ${TI.e('ueberlebt_frauen_prozent', 1)} percent, men with ${TI.e('ueberlebt_maenner_prozent', 1)} percent. Which conclusion do the figures of this table support?`),
    antworten: [
      a(P(`Frauen überlebten in dieser Tabelle häufiger; warum, zeigt sie allein nicht`, `Women survived more often in this table; why, it does not show by itself`), P('Die Kreuztabelle beschreibt, was geschah. Für Gründe müssten Reiseklasse und Alter gemeinsam betrachtet werden, etwa in einer logistischen Regression.', 'The crosstab describes what happened. For reasons, travel class and age would have to be looked at together, for example in a logistic regression.'), true),
      a(P(`Männer starben, weil sie den Frauen bei der Rettung den Vortritt ließen`, `Men died because they gave way to the women during the rescue`), P('Verhalten steht nicht in der Tabelle; sie enthält nur Geschlecht und Überleben. Aus Häufigkeiten allein lässt sich ein Beweggrund nicht ablesen.', 'Behaviour is not in the table; it contains only sex and survival. A motive cannot be read from frequencies alone.')),
      a(P(`Jede einzelne Frau hatte bessere Überlebenschancen als jeder einzelne Mann`, `Every single woman had better chances of survival than every single man`), P(`Die Anteile gelten für die Gruppen. ${TI.d('frauen_gestorben', 0)} Frauen starben, und ${TI.d('maenner_ueberlebt', 0)} Männer überlebten; einzelne Personen sagt der Anteil nicht voraus.`, `The shares apply to the groups. ${TI.e('frauen_gestorben', 0)} women died, and ${TI.e('maenner_ueberlebt', 0)} men survived; the share does not predict single people.`)),
      a(P('Der Unterschied ist zufällig, weil die Gruppen verschieden groß sind', 'The difference is due to chance because the groups differ in size'), P(`Verschiedene Gruppengrößen stören den Chi-Quadrat-Test nicht, er vergleicht Anteile. Mit Chi² = ${TI.d('chi2', 1)} und p ${TI.pd('p')} ist Zufall als Erklärung sehr unwahrscheinlich.`, `Different group sizes do not disturb the chi-square test, it compares shares. With chi² = ${TI.e('chi2', 1)} and p ${TI.pe('p')} chance is a very unlikely explanation.`))
    ],
    hilfe: ['zusammenhang-ursache', 'chi-quadrat'], belege: ['Hilfe:zusammenhang-ursache', SOLL]
  },

  // ======================================================== 2. Berkeley (ber)
  {
    id: 'bx-ber-fachbereiche', thema: T, fall: 'bx-ber',
    stamm: P(`Insgesamt wurden Männer zu ${BE.d('quote_maenner_gesamt_prozent', 1)} Prozent zugelassen, Frauen zu ${BE.d('quote_frauen_gesamt_prozent', 1)} Prozent (Chi² = ${BE.d('chi2_gesamt', 1)}, p ${BE.pd('p_gesamt')}). Was zeigt die zweite Tabelle mit den Fachbereichen A und C?`, `Overall, men were admitted at ${BE.e('quote_maenner_gesamt_prozent', 1)} percent, women at ${BE.e('quote_frauen_gesamt_prozent', 1)} percent (chi² = ${BE.e('chi2_gesamt', 1)}, p ${BE.pe('p_gesamt')}). What does the second table with the departments A and C show?`),
    antworten: [
      a(P(`Der Vorsprung der Männer schrumpft in C und kehrt sich in A um; die Gesamtzahl täuscht`, `The lead of the men shrinks in C and reverses in A; the overall figure misleads`), P(`In A liegen die Frauen mit ${BE.d('quote_frauen_fb_a_prozent', 1)} Prozent vor den Männern (${BE.d('quote_maenner_fb_a_prozent', 1)}), in C sind es ${BE.d('quote_maenner_fb_c_prozent', 1)} gegen ${BE.d('quote_frauen_fb_c_prozent', 1)}. Das ist das Simpson-Paradox.`, `In A the women are ahead of the men with ${BE.e('quote_frauen_fb_a_prozent', 1)} percent (${BE.e('quote_maenner_fb_a_prozent', 1)}), in C it is ${BE.e('quote_maenner_fb_c_prozent', 1)} against ${BE.e('quote_frauen_fb_c_prozent', 1)}. This is Simpson's paradox.`), true),
      a(P('Die Fachbereiche widersprechen dem Chi-Quadrat-Test, der also falsch gerechnet wurde', 'The departments contradict the chi-square test, which must therefore have been computed wrongly'), P('Der Test ist richtig gerechnet; er beantwortet eine andere Frage, nämlich die nach allen Bewerbungen zusammen. Die Fachbereiche trennen eine dritte Größe ab.', 'The test is computed correctly; it answers a different question, namely that about all applications together. The departments separate a third variable.')),
      a(P('Der Gesamtvergleich ist der richtige, weil er mehr Bewerbungen umfasst als ein einzelner Fachbereich', 'The overall comparison is the right one because it covers more applications than a single department'), P(`Eine größere Zahl macht einen Vergleich nicht verlässlicher, wenn die Gruppen ungleich auf die Fachbereiche verteilt sind (hier ${BE.d('bewerbungen_maenner_gesamt', 0)} Männer, ${BE.d('bewerbungen_frauen_gesamt', 0)} Frauen).`, `A larger number does not make a comparison more reliable when the groups are unevenly spread over the departments (here ${BE.e('bewerbungen_maenner_gesamt', 0)} men, ${BE.e('bewerbungen_frauen_gesamt', 0)} women).`)),
      a(P('Im Fachbereich A wurden Männer benachteiligt, denn ihre Quote liegt unter der der Frauen', 'In department A men were disadvantaged, because their rate is below that of the women'), P('Die Tabelle zeigt Quoten, aber nicht, warum sie so sind. Eine Benachteiligung lässt sich daraus nicht schließen; auch die Qualifikation der Bewerbenden fehlt.', 'The table shows rates, but not why they are as they are. A disadvantage cannot be concluded from it; the qualification of the applicants is also missing.'))
    ],
    hilfe: ['simpson-paradox', 'chi-quadrat'], belege: ['Hilfe:simpson-paradox', SOLL]
  },
  {
    id: 'bx-ber-verteilung', thema: T, fall: 'bx-ber',
    stamm: P('Welche Angabe fehlt in den beiden Tabellen noch, um zu verstehen, warum die Gesamtquote der Frauen niedriger ausfällt als die der Männer?', 'Which piece of information is still missing in the two tables to understand why the overall rate of the women is lower than that of the men?'),
    antworten: [
      a(P('Wie sich die Bewerbungen von Männern und Frauen auf die Fachbereiche verteilen', 'How the applications of men and women are spread over the departments'), P('Bewerben sich Frauen häufiger in Fachbereichen mit niedriger Quote, senkt das ihre Gesamtquote, ohne dass im einzelnen Fachbereich jemand benachteiligt wird.', 'If women apply more often to departments with a low rate, this lowers their overall rate without anyone being disadvantaged in the single department.'), true),
      a(P(`Die Zahl der Zulassungen, die in allen Fachbereichen zusammen vergeben wurden`, `The number of admissions that were granted in all departments together`), P('Die Gesamtzahl der Plätze erklärt den Unterschied zwischen den Geschlechtern nicht. Beide Gruppen bewerben sich um dieselben Plätze, aber in verschiedenen Fachbereichen.', 'The total number of places does not explain the difference between the sexes. Both groups apply for the same places, but in different departments.')),
      a(P(`Der p-Wert des Vergleichs von Männern und Frauen in jedem einzelnen Fachbereich`, `The p value of the comparison of men and women in each single department`), P('Ein p-Wert sagt, ob ein Unterschied zufällig sein könnte. Warum sich die Gesamtquote verschiebt, erklärt er nicht; dafür braucht man die Verteilung der Bewerbungen.', 'A p value says whether a difference could be due to chance. It does not explain why the overall rate shifts; for that the distribution of applications is needed.')),
      a(P(`Das Durchschnittsalter und die Vorbildung der Bewerbenden in jedem der sechs Fachbereiche`, `The mean age and previous education of the applicants in each of the six departments`), P('Das Alter ist eine andere Größe. Der Gesamtunterschied entsteht schon aus Geschlecht, Fachbereich und Zulassung; die beiden Tabellen zeigen zwei dieser drei Größen.', 'Age is a different variable. The overall difference already arises from sex, department and admission; the two tables show two of these three variables.'))
    ],
    hilfe: ['simpson-paradox', 'zusammenhang-ursache'], belege: ['Hilfe:simpson-paradox', SOLL]
  },
  {
    id: 'bx-ber-folge', thema: T, fall: 'bx-ber',
    stamm: P('Der Fall heißt Simpson-Paradox. Welche Folgerung für den Umgang mit Gruppenvergleichen ist richtig?', "The case is called Simpson's paradox. Which conclusion for dealing with group comparisons is correct?"),
    antworten: [
      a(P(`Vor der Deutung eines Gruppenunterschieds eine dritte Größe prüfen, die Gruppen und Ergebnis zugleich bestimmt`, `Before interpreting a group difference, check for a third variable that affects groups and outcome at the same time`), P('Wird der Zusammenhang nach der dritten Größe getrennt oder mit ihr gemeinsam gerechnet (etwa logistische Regression), zeigt sich, was bleibt.', 'If the association is separated by the third variable or computed together with it (for example logistic regression), what remains becomes visible.'), true),
      a(P(`Gesamtwerte aller Gruppen zusammen sind falsch und gehören aus jedem Bericht gestrichen, sobald es Untergruppen gibt`, `Overall values of all groups together are wrong and should be struck from every report as soon as subgroups exist`), P('Der Gesamtwert beschreibt die Lage richtig, nämlich wer insgesamt zugelassen wurde. Er darf nur nicht als Beweis für Benachteiligung in einem Fachbereich gelesen werden.', 'The overall value describes the situation correctly, namely who was admitted overall. It must only not be read as proof of disadvantage in a department.')),
      a(P('Bei jedem Zusammenhang kehrt sich das Vorzeichen um, sobald man nach einer weiteren Größe trennt', 'In every association the sign reverses as soon as one separates by a further variable'), P('Das geschieht selten und nur, wenn die dritte Größe mit Gruppe und Ergebnis zusammenhängt. Meist schwächt sich ein Zusammenhang ab, bleibt aber in der Richtung gleich.', 'This happens rarely and only when the third variable is related to the group and the outcome. Usually an association weakens but keeps its direction.')),
      a(P(`Das Paradox entsteht nur bei kleinen Stichproben und verschwindet bei mehr Bewerbungen und Fachbereichen`, `The paradox arises only in small samples and disappears with more applications and departments`), P('Die Fallzahl spielt keine Rolle: Mit mehr Bewerbungen bleibt die ungleiche Verteilung auf die Fachbereiche bestehen, und mit ihr das Paradox.', 'The number of cases plays no role: with more applications the uneven spread over the departments remains, and so does the paradox.'))
    ],
    hilfe: ['simpson-paradox', 'zusammenhang-ursache'], belege: ['Hilfe:simpson-paradox', SOLL]
  },

  // ======================================================== 3. Galton (gal)
  {
    id: 'bx-gal-steigung', thema: T, fall: 'bx-gal',
    stamm: P(`Die Steigung der Regression von Kindergröße auf Eltern-Mitte beträgt ${GA.d('steigung', 2)}. Wie ist ein Wert unter 1 zu deuten?`, `The slope of the regression of the child's height on the mid-parent height is ${GA.e('steigung', 2)}. How is a value below 1 to be interpreted?`),
    antworten: [
      a(P('Kinder sehr großer Eltern sind im Mittel weniger extrem als ihre Eltern: Regression zur Mitte', 'Children of very tall parents are on average less extreme than their parents: regression to the mean'), P(`Die Kindergröße hängt nur mäßig mit der Elterngröße zusammen, darum liegt die Vorhersage näher am Mittelwert. Das ist ein Effekt der Vorhersage, kein Schrumpfen.`, `The height of the child is only moderately related to the parents' height, so the prediction lies closer to the mean. This is an effect of the prediction, not a shrinking.`), true),
      a(P('Menschen werden von Generation zu Generation kleiner, und 1 minus die Steigung gibt den Rückgang an', 'People become smaller from generation to generation, and 1 minus the slope gives the decline'), P(`Die Kinder sind im Mittel ${GA.d('mittel_kind', 1)} cm groß, die Eltern-Mitte liegt bei ${GA.d('mittel_eltern_mittel', 1)} cm. Dieser Unterschied hat andere Gründe: Söhne und Töchter stehen in einer Gruppe.`, `The children are on average ${GA.e('mittel_kind', 1)} cm tall, the mid-parent height is ${GA.e('mittel_eltern_mittel', 1)} cm. This difference has other reasons: sons and daughters stand in one group.`)),
      a(P('Die Gerade wurde falsch geschätzt, denn die Steigung müsste 1 betragen, damit Kinder so groß wie ihre Eltern sind', 'The line was estimated wrongly, because the slope would have to be 1 for children to be as tall as their parents'), P('Die Steigung ergibt sich aus der Korrelation und den Streuungen beider Größen. Dass sie unter 1 liegt, ist hier zu erwarten und kein Schätzfehler.', 'The slope results from the correlation and the spreads of both variables. That it is below 1 is to be expected here and is no estimation error.')),
      a(P('Die Steigung ist nicht von 0 verschieden, weil sie kleiner als 1 ist', 'The slope does not differ from 0 because it is smaller than 1'), P('Der Vergleich mit 1 sagt nichts über den Test gegen 0. Eine Steigung kann unter 1 liegen und deutlich von 0 verschieden sein.', 'The comparison with 1 says nothing about the test against 0. A slope can be below 1 and clearly differ from 0.'))
    ],
    hilfe: ['regression-zur-mitte', 'koeffizient-b'], belege: ['Hilfe:regression-zur-mitte', SOLL]
  },
  {
    id: 'bx-gal-geschlecht', thema: T, fall: 'bx-gal',
    stamm: P(`Nimmt man das Geschlecht des Kindes ins Modell, steigt R² von ${GA.d('r2', 2)} auf ${GA.d('r2_mit_geschlecht', 2)}, die Steigung der Eltern-Mitte ändert sich von ${GA.d('steigung', 2)} auf ${GA.d('steigung_mit_geschlecht', 2)}. Was bedeutet das?`, `If the sex of the child is added to the model, R² rises from ${GA.e('r2', 2)} to ${GA.e('r2_mit_geschlecht', 2)}, and the slope of the mid-parent height changes from ${GA.e('steigung', 2)} to ${GA.e('steigung_mit_geschlecht', 2)}. What does this mean?`),
    antworten: [
      a(P(`Das Geschlecht erklärt viel Streuung der Kindergröße; die Wirkung der Eltern-Mitte ändert sich kaum`, `Sex explains much of the spread of the children's heights; the effect of the mid-parent height barely changes`), P('Söhne sind im Mittel deutlich größer als Töchter. Wird das berücksichtigt, bleibt weniger unerklärte Streuung, und die Steigung der Eltern-Mitte bleibt etwa gleich.', 'Sons are on average clearly taller than daughters. When this is taken into account, less unexplained spread remains, and the slope of the mid-parent height stays about the same.'), true),
      a(P(`Die Eltern-Mitte allein erklärt jetzt ${GA.d('r2_mit_geschlecht', 2)} der Streuung der Kindergröße, das Geschlecht fügt wenig hinzu`, `The mid-parent height alone now explains ${GA.e('r2_mit_geschlecht', 2)} of the spread of the children's heights, sex adds little`), P(`Das neue R² gilt für das ganze Modell aus Eltern-Mitte und Geschlecht zusammen. Der Anteil der Eltern-Mitte allein ist weiterhin klein (R² = ${GA.d('r2', 2)} in der einfachen Regression).`, `The new R² applies to the whole model of mid-parent height and sex together. The share of the mid-parent height alone is still small (R² = ${GA.e('r2', 2)} in the simple regression).`)),
      a(P('Der Größenunterschied zwischen Söhnen und Töchtern ist ein Messfehler und gehört aus den Daten entfernt', 'The height difference between sons and daughters is a measurement error and belongs removed from the data'), P('Der Unterschied ist echt und von Galton bekannt: Er rechnete die Mutter deshalb mit einem Faktor hoch. Er ist kein Fehler, sondern eine eigene Quelle der Streuung.', 'The difference is real and was known to Galton: he therefore scaled up the mother with a factor. It is not an error but a source of spread of its own.')),
      a(P('Das Modell mit Geschlecht ist schlechter, weil sich die Steigung der Eltern-Mitte verändert hat', 'The model with sex is worse because the slope of the mid-parent height has changed'), P(`Ein höheres R² (${GA.d('r2_mit_geschlecht', 2)} gegen ${GA.d('r2', 2)}) zeigt eine bessere Anpassung. Dass sich die Steigung etwas verschiebt, wenn eine Größe dazukommt, ist normal.`, `A higher R² (${GA.e('r2_mit_geschlecht', 2)} against ${GA.e('r2', 2)}) shows a better fit. That the slope shifts a little when a variable is added is normal.`))
    ],
    hilfe: ['regression-zur-mitte', 'r-quadrat'], belege: ['Hilfe:regression-zur-mitte', SOLL]
  },
  {
    id: 'bx-gal-streuung', thema: T, fall: 'bx-gal',
    stamm: P(`Die Standardabweichung der Eltern-Mitte beträgt ${GA.d('sd_eltern_mittel', 1)} cm, die der Kinder ${GA.d('sd_kind', 1)} cm. Welche Erklärung passt?`, `The standard deviation of the mid-parent height is ${GA.e('sd_eltern_mittel', 1)} cm, that of the children ${GA.e('sd_kind', 1)} cm. Which explanation fits?`),
    antworten: [
      a(P(`Der Durchschnitt aus zwei Eltern gleicht Extreme aus, und die Kinder umfassen Söhne und Töchter`, `An average of two parents evens out extremes, and the children include sons and daughters`), P('Beide Gründe führen zu mehr Streuung bei den Kindern. Mit der Regression zur Mitte hat der Unterschied nichts zu tun.', 'Both reasons lead to more spread among the children. The difference has nothing to do with regression to the mean.'), true),
      a(P('Die Regression zur Mitte macht die Verteilung in jeder Generation schmaler', 'Regression to the mean makes the distribution narrower in every generation'), P('Das ist ein häufiger Irrtum. Die Vorhersage liegt näher an der Mitte, die tatsächlichen Kinder streuen aber um die Gerade und halten die Gesamtstreuung der Generationen etwa gleich.', 'This is a common error. The prediction lies closer to the mean, but the actual children scatter around the line and keep the overall spread of the generations about the same.')),
      a(P('Die Kindergrößen haben einen Messfehler, die Elterngrößen sind exakt gemessen', 'The children\'s heights contain a measurement error, the parents\' heights were measured exactly'), P('Aus den Zahlen lässt sich kein Messfehler ablesen. Die größere Streuung der Kinder erklärt sich schon aus dem Mittelwert über zwei Eltern und dem Geschlecht der Kinder.', 'No measurement error can be read from the figures. The larger spread of the children is already explained by the average over two parents and the sex of the children.')),
      a(P(`Eltern-Mitte und Kindergröße sind völlig unkorreliert, und deshalb streuen sie so verschieden stark`, `Mid-parent height and the child's height are completely uncorrelated, which is why they spread so differently`), P(`Die beiden Größen hängen zusammen (r = ${GA.d('r_eltern_mittel_kind', 2)}). Die Standardabweichungen sind davon unabhängig; sie beschreiben die Breite jeder Verteilung für sich.`, `The two variables are related (r = ${GA.e('r_eltern_mittel_kind', 2)}). The standard deviations are independent of it; they describe the width of each distribution on its own.`))
    ],
    hilfe: ['regression-zur-mitte', 'streuung'], belege: ['Hilfe:regression-zur-mitte', SOLL]
  },

  // ======================================================== 4. Pinguine (pin)
  {
    id: 'bx-pin-eta', thema: T, fall: 'bx-pin',
    stamm: P(`Die Varianzanalyse der Flossenlänge ergibt eta² = ${PI.d('eta2', 2)}. Wie ist eta² zu lesen?`, `The analysis of variance of the flipper length gives eta² = ${PI.e('eta2', 2)}. How is eta² to be read?`),
    antworten: [
      a(P(`Der Anteil der Streuung der Flossenlänge, der auf die Art entfällt: ein sehr großer Effekt`, `The share of flipper length spread due to the species: a very large effect`), P('eta² teilt die Streuung zwischen den Gruppen durch die gesamte Streuung. Der Wert liegt zwischen 0 und 1; hier entfallen etwa vier Fünftel der Streuung auf die Art.', 'Eta² divides the spread between the groups by the total spread. The value lies between 0 and 1; here about four fifths of the spread belong to the species.'), true),
      a(P('Die Sicherheit des Befunds: eta² ist ähnlich wie 1 minus p zu verstehen', 'The certainty of the finding: eta² is to be understood like 1 minus p'), P(`Das p der Varianzanalyse (${PI.pd('anova_p')}) sagt, ob der Unterschied zufällig sein könnte. eta² sagt, wie groß der Anteil der Art an der Streuung ist; beides ist verschieden.`, `The p of the analysis of variance (${PI.pe('anova_p')}) says whether the difference could be due to chance. Eta² says how large the share of the species in the spread is; the two are different.`)),
      a(P(`Der mittlere Unterschied der Flossenlängen zwischen den Arten beträgt ${PI.d('eta2', 2)} Millimeter`, `The mean difference in flipper length between the species is ${PI.e('eta2', 2)} millimetres`), P(`eta² hat keine Einheit. Die Mittelwerte in der Tabelle (${PI.d('mittel_flosse_adelie', 1)}, ${PI.d('mittel_flosse_zuegel', 1)} und ${PI.d('mittel_flosse_esel', 1)} Millimeter) zeigen die Unterschiede in Millimetern.`, `Eta² has no unit. The means in the table (${PI.e('mittel_flosse_adelie', 1)}, ${PI.e('mittel_flosse_zuegel', 1)} and ${PI.e('mittel_flosse_esel', 1)} millimetres) show the differences in millimetres.`)),
      a(P('Mit eta² weiß man, welche der drei Arten sich voneinander unterscheiden', 'With eta² one knows which of the three species differ from each other'), P('eta² gilt für die Varianzanalyse als Ganzes. Welche Paare sich unterscheiden, zeigen erst die Paarvergleiche, die Post-hoc-Tests.', 'Eta² applies to the analysis of variance as a whole. Which pairs differ is shown only by the pairwise comparisons, the post hoc tests.'))
    ],
    hilfe: ['eta-quadrat', 'einfaktorielle-anova'], belege: ['Hilfe:eta-quadrat', SOLL]
  },
  {
    id: 'bx-pin-posthoc', thema: T, fall: 'bx-pin',
    stamm: P(`Die Varianzanalyse ergibt F = ${PI.d('anova_f', 1)} mit p ${PI.pd('anova_p')}. Was folgt daraus für den Vergleich der drei Arten?`, `The analysis of variance gives F = ${PI.e('anova_f', 1)} with p ${PI.pe('anova_p')}. What follows from this for the comparison of the three species?`),
    antworten: [
      a(P('Mindestens zwei Arten unterscheiden sich in der mittleren Flossenlänge; welche, zeigen die Paarvergleiche (Post-hoc)', 'At least two species differ in the mean flipper length; which, the pairwise comparisons (post hoc) show'), P(`Die Nullhypothese lautet: Alle Mittelwerte sind gleich. Ihre Ablehnung sagt nur, dass nicht alle gleich sind; Post-hoc-Tests schützen vor mehrfachem Testen.`, `The null hypothesis is: all means are equal. Rejecting it says only that not all are equal; post hoc tests protect against multiple testing.`), true),
      a(P('Die drei Arten unterscheiden sich paarweise voneinander, denn p ist sehr klein', 'The three species differ pairwise from each other, because p is very small'), P('Das p gilt für alle Mittelwerte zusammen. Zwei Arten könnten ähnlich sein, auch wenn die dritte weit abweicht; das entscheiden erst die Paarvergleiche.', 'The p applies to all means together. Two species could be similar even if the third deviates widely; that is decided only by the pairwise comparisons.')),
      a(P(`Die Art mit der größten mittleren Flossenlänge (${PI.d('mittel_flosse_esel', 1)} Millimeter) ist durch die Varianzanalyse als verschieden bewiesen`, `The species with the largest mean flipper length (${PI.e('mittel_flosse_esel', 1)} millimetres) is proved to differ by the analysis of variance`), P('Die Varianzanalyse zeigt nicht, welche Art abweicht. Dass ein Mittelwert am größten ist, genügt nicht, ohne den Paarvergleich bleibt der Unterschied ungeprüft.', 'The analysis of variance does not show which species deviates. That one mean is the largest is not enough; without the pairwise comparison the difference remains untested.')),
      a(P('Innerhalb jeder Art sind die Tiere gleich lang, sonst wäre F nicht so groß', 'Within each species the animals are equally long, otherwise F would not be so large'), P('F vergleicht die Streuung zwischen den Arten mit der Streuung innerhalb der Arten. Innerhalb der Arten streuen die Tiere durchaus; sie ist nur kleiner als zwischen den Arten.', 'F compares the spread between the species with the spread within the species. Within the species the animals do vary; it is only smaller than between the species.'))
    ],
    hilfe: ['post-hoc', 'paarvergleich'], belege: ['Hilfe:post-hoc', SOLL]
  },
  {
    id: 'bx-pin-simpson', thema: T, fall: 'bx-pin',
    stamm: P(`Über alle Tiere zusammen ist die Korrelation von Schnabellänge und Schnabeltiefe r = ${PI.d('r_schnabel_gesamt', 2)}, innerhalb jeder Art ist sie positiv (${PI.d('r_schnabel_adelie', 2)}, ${PI.d('r_schnabel_zuegel', 2)} und ${PI.d('r_schnabel_esel', 2)}). Was erklärt das?`, `Across all animals together the correlation of bill length and bill depth is r = ${PI.e('r_schnabel_gesamt', 2)}, within each species it is positive (${PI.e('r_schnabel_adelie', 2)}, ${PI.e('r_schnabel_zuegel', 2)} and ${PI.e('r_schnabel_esel', 2)}). What explains this?`),
    antworten: [
      a(P(`Die Art ist eine dritte Größe: Zwischen den Arten fällt die Linie, in jeder Art steigt sie (Simpson-Paradox)`, `The species is a third variable: between the species the line falls, within each species it rises (Simpson's paradox)`), P('Die Art ist eine dritte Größe, die mit beiden Maßen zusammenhängt. Trennt man nach der Art, zeigt sich der Zusammenhang innerhalb der Gruppen und kehrt sein Vorzeichen um.', 'The species is a third variable related to both measures. If one separates by species, the association within the groups appears and reverses its sign.'), true),
      a(P(`Ein Rechenfehler: Die Gesamtkorrelation müsste als Mittelwert zwischen den drei Einzelwerten liegen`, `A computing error: the overall correlation would have to lie as an average between the three single values`), P('Es gibt keine Regel, dass die Gesamtkorrelation ein Mittelwert der Gruppenkorrelationen ist. Unterschiede zwischen den Gruppen können sie ins Gegenteil verschieben.', 'There is no rule that the overall correlation is an average of the group correlations. Differences between the groups can shift it to the opposite.')),
      a(P(`Die Gesamtkorrelation ist die richtige, weil sie auf mehr Tieren beruht und alle Arten mischt`, `The overall correlation is the right one because it is based on more animals and mixes all species`), P('Die Zahl der Tiere macht sie nicht richtiger. Fragt man, wie sich Schnabeltiefe und -länge bei gleicher Art zueinander verhalten, antworten die Korrelationen innerhalb der Art.', 'The number of animals does not make it more correct. If one asks how bill depth and length relate within the same species, the correlations within the species answer.')),
      a(P(`Die Gruppen sind zu klein, und die positiven Werte innerhalb der Arten sind nur Zufall`, `The groups are too small, and the positive values within the species are mere chance`), P(`Die drei Werte sind alle positiv und mittel bis stark. Bei ${PI.d('n_adelie', 0)}, ${PI.d('n_zuegel', 0)} und ${PI.d('n_esel', 0)} Tieren je Art sind sie keine Zufallsschwankung.`, `The three values are all positive and medium to strong. With ${PI.e('n_adelie', 0)}, ${PI.e('n_zuegel', 0)} and ${PI.e('n_esel', 0)} animals per species they are not a chance fluctuation.`))
    ],
    hilfe: ['simpson-paradox', 'korrelation'], belege: ['Hilfe:simpson-paradox', SOLL]
  },

  // ======================================================== 5. Wein (wei)
  {
    id: 'bx-wei-vif', thema: T, fall: 'bx-wei',
    stamm: P(`Die Dichte hat in der Regression einen VIF von ${WE.d('vif_wein_dichte', 1)}. Wie ist das zu deuten?`, `The density has a VIF of ${WE.e('vif_wein_dichte', 1)} in the regression. How is this to be interpreted?`),
    antworten: [
      a(P(`Die Dichte lässt sich fast vollständig aus den anderen Angaben vorhersagen (Kollinearität)`, `The density can be predicted almost completely from the other variables (collinearity)`), P(`Ein hoher VIF vergrößert den Standardfehler des Koeffizienten: Er ist dann unsicher und kann sein Vorzeichen wechseln.`, `A high VIF enlarges the standard error of the coefficient: it is then uncertain and can change its sign.`), true),
      a(P('Die Dichte hat den stärksten Einfluss auf die Note, denn ihr VIF ist unter allen Angaben der größte', 'The density has the strongest influence on the score, because its VIF is the largest of all variables'), P('Der VIF misst die Überlappung mit den anderen Vorhersagegrößen, nicht den Einfluss auf die Note. Den Einfluss zeigen die Koeffizienten der Regression, nicht der VIF.', 'The VIF measures the overlap with the other predictors, not the influence on the score. The influence is shown by the coefficients of the regression, not by the VIF.')),
      a(P(`Die Dichte erklärt ${WE.d('vif_wein_dichte', 0)} Prozent der Streuung der Note, der Rest geht auf die übrigen Angaben zurück`, `The density explains ${WE.e('vif_wein_dichte', 0)} percent of the spread of the score, the rest is due to the other variables`), P(`Der VIF ist kein Anteil. Der erklärte Anteil der ganzen Regression ist R² = ${WE.d('r2', 3)}; zu ihm trägt die Dichte nur einen Teil bei.`, `The VIF is not a share. The explained share of the whole regression is R² = ${WE.e('r2', 3)}; the density contributes only a part of it.`)),
      a(P('Die Regression lässt sich bei einem so hohen Wert nicht berechnen, Statable bricht dann ab', 'The regression cannot be computed with such a high value, Statable then stops'), P(`Die Regression wird berechnet, sie ist nur schwerer zu lesen. Auch Restzucker hat mit ${WE.d('vif_restzucker', 1)} einen hohen Wert, Chlorid dagegen nur ${WE.d('vif_chlorid', 1)}.`, `The regression is computed, it is just harder to read. Residual sugar also has a high value with ${WE.e('vif_restzucker', 1)}, chloride only ${WE.e('vif_chlorid', 1)}.`))
    ],
    hilfe: ['vif', 'kollinearitaet'], belege: ['Hilfe:vif', SOLL]
  },
  {
    id: 'bx-wei-r2', thema: T, fall: 'bx-wei',
    stamm: P(`Das Modell hat R² = ${WE.d('r2', 3)}, korrigiert ${WE.d('r2_korrigiert', 3)}. Welche Aussage ist richtig?`, `The model has R² = ${WE.e('r2', 3)}, adjusted ${WE.e('r2_korrigiert', 3)}. Which statement is correct?`),
    antworten: [
      a(P(`Die Angaben erklären zusammen rund drei Zehntel der Streuung der Note, der Rest bleibt offen`, `The variables explain about three tenths of the spread of the score, the rest stays open`), P(`Rebsorte, Hersteller und Geschmack fehlen in den Daten. Einzelne Koeffizienten können trotzdem deutlich sein.`, `Grape variety, producer and taste are missing from the data. Single coefficients can still be clear.`), true),
      a(P(`Bei ${WE.d('r2', 0)} von 100 Weinen wird die Note vom Modell genau richtig vorhergesagt, bei den anderen nicht`, `For ${WE.e('r2', 0)} of 100 wines the score is predicted exactly right by the model, for the others it is not`), P('R² ist ein Anteil erklärter Streuung, keine Trefferquote. Es sagt nichts darüber, wie viele einzelne Noten genau getroffen werden.', 'R² is a share of explained spread, not a hit rate. It says nothing about how many single scores are hit exactly.')),
      a(P(`Der kleine Abstand zwischen R² und korrigiertem R² zeigt eine Überanpassung des Modells an diese Daten`, `The small gap between R² and adjusted R² shows overfitting of the model to these data`), P('Bei Überanpassung fällt das korrigierte R² deutlich ab. Hier liegen beide Werte nahe beieinander: Die Zahl der Angaben ist im Verhältnis zur Zahl der Weine klein.', 'With overfitting the adjusted R² drops clearly. Here both values are close to each other: the number of variables is small in relation to the number of wines.')),
      a(P('Bei einem R² unter 0,5 kann kein Koeffizient des Modells deutlich sein', 'With an R² below 0.5 no coefficient of the model can be clear'), P('Die Höhe von R² und die Deutlichkeit eines Koeffizienten sind zwei Fragen. Bei sehr vielen Weinen kann ein Koeffizient deutlich sein, obwohl R² klein bleibt.', 'The size of R² and the clarity of a coefficient are two questions. With very many wines a coefficient can be clear although R² stays small.'))
    ],
    hilfe: ['r-quadrat', 'kollinearitaet'], belege: ['Hilfe:r-quadrat', SOLL]
  },
  {
    id: 'bx-wei-spearman', thema: T, fall: 'bx-wei',
    stamm: P(`Alkohol und Note haben eine Pearson-Korrelation von ${WE.d('r_alkohol_note', 2)} und eine Spearman-Korrelation von ${WE.d('r_spearman_alkohol_note', 2)}. Warum schlägt Statable Spearman vor?`, `Alcohol and score have a Pearson correlation of ${WE.e('r_alkohol_note', 2)} and a Spearman correlation of ${WE.e('r_spearman_alkohol_note', 2)}. Why does Statable suggest Spearman?`),
    antworten: [
      a(P(`Die Note ist nur geordnet, die Rangkorrelation braucht keine gleichen Abstände zwischen den Stufen`, `The score is only ordered, the rank correlation needs no equal distances between the levels`), P(`Beide Werte liegen nahe beieinander: Der Zusammenhang hängt nicht von der Verteilungsform ab. Spearman ist hier die vorsichtigere Wahl.`, `Both values are close: the association does not depend on the shape of the distribution. Spearman is the more careful choice here.`), true),
      a(P('Spearman liefert bei jeder Stichprobe den größeren Wert und belegt den Zusammenhang deshalb zwingend stärker', 'Spearman gives the larger value in every sample and therefore necessarily proves the association more strongly'), P('Ob Spearman größer oder kleiner ausfällt, hängt von den Daten ab. Beide Maße beschreiben die Stärke eines Zusammenhangs, keines belegt ihn stärker.', 'Whether Spearman turns out larger or smaller depends on the data. Both measures describe the strength of an association, neither proves it more strongly.')),
      a(P('Pearson lässt sich bei so vielen Weinen nicht mehr berechnen, Spearman schon', 'Pearson can no longer be computed with so many wines, Spearman still can'), P('Die Zahl der Fälle hindert die Berechnung nicht. Die Wahl hängt vom Skalenniveau und der Verteilung ab, nicht von der Größe der Stichprobe.', 'The number of cases does not prevent the computation. The choice depends on the scale level and the distribution, not on the size of the sample.')),
      a(P('Alkohol verursacht die Note, und Spearman misst genau diese Wirkung des Alkohols', 'Alcohol causes the score, and Spearman measures exactly this effect of alcohol'), P('Keine Korrelation misst eine Wirkung. Auch Spearman beschreibt nur, wie gleichsinnig sich zwei Größen verändern; die Gründe liegen außerhalb der Zahl.', 'No correlation measures an effect. Spearman too only describes how similarly two variables change; the reasons lie outside the number.'))
    ],
    hilfe: ['rangkorrelation', 'pearson-korrelation'], belege: ['Hilfe:rangkorrelation', SOLL]
  },

  // ======================================================== 6. Beton (bet)
  {
    id: 'bx-bet-kurve', thema: T, fall: 'bx-bet',
    stamm: P(`Das Alter erklärt als Gerade R² = ${BT.d('r2_alter_linear', 3)} der Festigkeit, als Logarithmus ${BT.d('r2_alter_log', 3)}. Was zeigt das?`, `Age explains R² = ${BT.e('r2_alter_linear', 3)} of the strength as a straight line, ${BT.e('r2_alter_log', 3)} as a logarithm. What does this show?`),
    antworten: [
      a(P(`Der Zusammenhang ist gekrümmt: Beton wird erst schnell, dann langsamer fest`, `The relationship is curved: concrete gains strength quickly at first, then more slowly`), P('Beide Formen haben je eine Vorhersagegröße, das höhere R² beim Logarithmus kommt also nicht von mehr Zahlen im Modell, sondern von der besseren Form.', 'Both forms have one predictor each, so the higher R² of the logarithm does not come from more numbers in the model but from the better form.'), true),
      a(P('Das Alter hat keinen Einfluss auf die Festigkeit, weil das R² der Geraden so klein ist', 'Age has no influence on the strength because the R² of the line is so small'), P('Das kleine R² der Geraden zeigt nur, dass eine Gerade schlecht passt. Mit der Kurve steigt R² deutlich: Der Einfluss ist da, nur nicht als Gerade.', 'The small R² of the line shows only that a line fits badly. With the curve R² rises clearly: the influence is there, just not as a line.')),
      a(P('Die Gerade wurde falsch gerechnet; richtig gerechnet ergibt sie dasselbe R² wie der Logarithmus', 'The line was computed wrongly; computed correctly it gives the same R² as the logarithm'), P('Die Gerade ist richtig gerechnet. Sie ist die beste Gerade, aber die Daten laufen nicht geradlinig; ein anderes R² für eine andere Form ist zu erwarten.', 'The line is computed correctly. It is the best line, but the data do not run in a straight line; a different R² for a different form is to be expected.')),
      a(P('Beton wird nach der Kurve ab einem bestimmten Alter nicht mehr fester, das zeigt das R²', 'According to the curve concrete gains no more strength from a certain age on, the R² shows this'), P('R² sagt nichts über Alter jenseits der gemessenen Werte. Eine Kurve darf nicht über den Bereich der Daten hinaus fortgesetzt werden (Extrapolation).', 'R² says nothing about ages beyond the measured values. A curve must not be continued beyond the range of the data (extrapolation).'))
    ],
    hilfe: ['kurvenanpassung', 'r-quadrat'], belege: ['Hilfe:kurvenanpassung', SOLL]
  },
  {
    id: 'bx-bet-r', thema: T, fall: 'bx-bet',
    stamm: P(`Zement und Druckfestigkeit haben eine Korrelation von r = ${BT.d('r_zement_festigkeit', 2)}. Wie ist das zu lesen?`, `Cement and compressive strength have a correlation of r = ${BT.e('r_zement_festigkeit', 2)}. How is this to be read?`),
    antworten: [
      a(P(`Mehr Zement geht mit höherer Festigkeit einher; eine Ursache zeigt r nicht`, `More cement goes with higher strength; r does not show a cause`), P('r beschreibt einen Zusammenhang in diesen Prüfungen. Die Menge des Zements wurde nicht allein verändert; mehrere Angaben unterscheiden sich zugleich.', 'r describes an association in these tests. The amount of cement was not changed alone; several variables differ at the same time.'), true),
      a(P('Die Hälfte der Festigkeit stammt vom Zement, denn r beträgt etwa 0,5', 'Half of the strength comes from the cement, because r is about 0.5'), P(`Den erklärten Anteil gibt r² an, nicht r. Bei r = ${BT.d('r_zement_festigkeit', 2)} liegt er deutlich unter der Hälfte.`, `The explained share is given by r², not r. With r = ${BT.e('r_zement_festigkeit', 2)} it is clearly below half.`)),
      a(P(`Jedes Kilogramm Zement mehr erhöht die Festigkeit um ${BT.d('r_zement_festigkeit', 2)} MPa im Mittel`, `Each kilogram of cement more raises the strength by ${BT.e('r_zement_festigkeit', 2)} MPa on average`), P('r hat keine Einheit und ist keine Steigung. Der Anstieg je Kilogramm käme aus einer Regression und hängt von den Einheiten beider Größen ab.', 'r has no unit and is not a slope. The rise per kilogram would come from a regression and depends on the units of both variables.')),
      a(P('Der Zusammenhang ist schwach, denn nur ein r von 1 wäre ein starker Zusammenhang', 'The association is weak, because only an r of 1 would be a strong association'), P(`Dann wäre jeder Wert unter 1 schwach. Nach üblicher Faustregel ist ein r um ${BT.d('r_zement_festigkeit', 1)} ein mittlerer bis starker Zusammenhang.`, `Then every value below 1 would be weak. By the usual rule of thumb an r around ${BT.e('r_zement_festigkeit', 1)} is a medium to strong association.`))
    ],
    hilfe: ['korrelation', 'zusammenhang-ursache'], belege: ['Hilfe:korrelation', SOLL]
  },
  {
    id: 'bx-bet-wahl', thema: T, fall: 'bx-bet',
    stamm: P('Die Festigkeit soll aus mehreren Angaben vorhergesagt werden, darunter dem Alter. Was folgt aus dem Vergleich der Geraden mit der Kurve?', 'The strength is to be predicted from several variables, among them age. What follows from the comparison of the line with the curve?'),
    antworten: [
      a(P(`Als Vorhersagegröße den Logarithmus des Alters nehmen, so wird der Zusammenhang gerade`, `Use the logarithm of age as the predictor, which makes the relationship straight`), P('Die Regression nimmt einen geraden Zusammenhang je Vorhersagegröße an. Nach der Umrechnung des Alters (Transformation) wird aus der Kurve eine Gerade.', 'The regression assumes a linear relationship for each predictor. After converting age (transformation) the curve becomes a straight line.'), true),
      a(P('Das Alter aus dem Modell weglassen, weil es zur Geraden nicht passt', 'Leave age out of the model because it does not fit the line'), P('Damit ginge ein wichtiger Einfluss verloren. Passt eine Angabe nicht als Gerade, wird sie umgerechnet oder als Kurve aufgenommen, aber nicht entfernt.', 'An important influence would be lost. If a variable does not fit as a line, it is converted or included as a curve, but not removed.')),
      a(P('Das Alter in zwei oder drei Gruppen einteilen, das verbessert jede Vorhersage', 'Divide age into two or three groups, which improves any prediction'), P('Gruppen werfen Information weg, die in den Tagesangaben steckt. Eine passende Umrechnung (Logarithmus) nutzt alle Werte und bleibt eine einzige Größe im Modell.', 'Groups throw away information that is in the day values. A suitable conversion (logarithm) uses all values and remains a single variable in the model.')),
      a(P('Gar nichts, denn eine lineare Regression passt sich jeder Form der Daten von selbst an', 'Nothing at all, because a linear regression adapts itself to any form of the data'), P('Die lineare Regression kennt nur gerade Zusammenhänge je Vorhersagegröße. Für eine Kurve muss man die Form im Modell vorgeben, etwa durch Umrechnen oder einen quadratischen Term.', 'Linear regression knows only straight relationships per predictor. For a curve the form has to be specified in the model, for example by converting or a quadratic term.'))
    ],
    hilfe: ['kurvenanpassung', 'logarithmieren'], belege: ['Hilfe:kurvenanpassung', SOLL]
  },

  // ======================================================== 7. Herzinsuffizienz (her)
  {
    id: 'bx-her-hr', thema: T, fall: 'bx-her',
    stamm: P(`In der Cox-Regression hat die Auswurffraktion eine Hazard Ratio von ${HE.d('hr_auswurffraktion', 2)} je Prozentpunkt. Wie ist das zu lesen?`, `In the Cox regression the ejection fraction has a hazard ratio of ${HE.e('hr_auswurffraktion', 2)} per percentage point. How is this to be read?`),
    antworten: [
      a(P(`Das Sterberisiko ist je Prozentpunkt mehr Auswurffraktion das ${HE.d('hr_auswurffraktion', 2)}-Fache`, `The risk of dying is ${HE.e('hr_auswurffraktion', 2)} times as high per percentage point more of ejection fraction`), P('Eine Hazard Ratio unter 1 bedeutet weniger Risiko, über 1 mehr Risiko. Sie vergleicht Risiken zu jedem Zeitpunkt, nicht die Dauer des Überlebens.', 'A hazard ratio below 1 means less risk, above 1 more risk. It compares risks at any point in time, not the length of survival.'), true),
      a(P(`Je Prozentpunkt mehr Auswurffraktion leben die Menschen ${HE.d('hr_auswurffraktion', 2)} Tage länger`, `Per percentage point more of ejection fraction people live ${HE.e('hr_auswurffraktion', 2)} days longer`), P('Die Hazard Ratio hat keine Einheit und ist kein Zeitgewinn. Wie lange Menschen leben, zeigt die Überlebenskurve, etwa als Median.', 'The hazard ratio has no unit and is no gain of time. How long people live is shown by the survival curve, for example as the median.')),
      a(P('Eine Hazard Ratio unter 1 heißt, dass das Risiko steigt, wenn die Auswurffraktion größer wird', 'A hazard ratio below 1 means that the risk rises when the ejection fraction becomes larger'), P(`Es ist umgekehrt: Unter 1 sinkt das Risiko. Bei Alter (${HE.d('hr_alter', 2)}) und Kreatinin (${HE.d('hr_serumkreatinin', 2)}) liegt die Hazard Ratio über 1, dort steigt das Risiko.`, `It is the other way round: below 1 the risk falls. For age (${HE.e('hr_alter', 2)}) and creatinine (${HE.e('hr_serumkreatinin', 2)}) the hazard ratio is above 1, there the risk rises.`)),
      a(P(`Von 100 Menschen sterben ${HE.d('hr_auswurffraktion', 2)} weniger, wenn die Auswurffraktion um einen Prozentpunkt steigt`, `Of 100 people ${HE.e('hr_auswurffraktion', 2)} fewer die when the ejection fraction rises by one percentage point`), P('Eine Hazard Ratio ist ein Verhältnis von Risiken, keine Zahl von Personen. Über die Zahl der Todesfälle sagt sie ohne das Grundrisiko nichts aus.', 'A hazard ratio is a ratio of risks, not a number of people. Without the baseline risk it says nothing about the number of deaths.'))
    ],
    hilfe: ['hazard-ratio', 'kaplan-meier'], belege: ['Hilfe:hazard-ratio', SOLL]
  },
  {
    id: 'bx-her-zensiert', thema: T, fall: 'bx-her',
    stamm: P('Wer am Ende der Beobachtung noch lebt, ist zensiert. Wie geht die Kaplan-Meier-Kurve mit diesen Personen um?', 'Whoever is still alive at the end of the observation is censored. How does the Kaplan-Meier curve deal with these people?'),
    antworten: [
      a(P(`Sie zählen bis zu ihrem letzten Beobachtungstag mit und scheiden danach aus`, `They count up to their last day of observation and then drop out`), P('Zensierte Personen tragen Information bis zu dem Tag bei, an dem man sie noch sah. Danach weiß man nichts mehr über sie, und die Kurve rechnet nicht mit ihnen weiter.', 'Censored people contribute information up to the day on which they were still seen. After that nothing is known about them, and the curve does not go on counting them.'), true),
      a(P('Sie werden als überlebt gezählt, auch für die Zeit nach dem Ende der Beobachtung', 'They are counted as survived, also for the time after the end of the observation'), P('Das würde die Überlebenschance zu hoch ausweisen. Über die Zeit nach dem Ende der Beobachtung liegt keine Beobachtung vor.', 'That would show the chance of survival as too high. For the time after the end of the observation no observation exists.')),
      a(P('Sie werden aus den Daten gestrichen, weil ihre Geschichte unvollständig ist', 'They are removed from the data because their history is incomplete'), P(`Dann ginge Information verloren. Die Tabelle zeigt die Gruppen mit ${HE.d('n_gruppe1', 0)}, ${HE.d('n_gruppe2', 0)} und ${HE.d('n_gruppe3', 0)} Personen; ein Teil davon ist zensiert und gehört dennoch zur Auswertung.`, `Then information would be lost. The table shows the groups with ${HE.e('n_gruppe1', 0)}, ${HE.e('n_gruppe2', 0)} and ${HE.e('n_gruppe3', 0)} people; part of them is censored and still belongs to the analysis.`)),
      a(P('Sie werden vorsichtshalber als gestorben gezählt, damit das Risiko nicht unterschätzt wird', 'They are counted as dead as a precaution so that the risk is not underestimated'), P('Ein Tod, der nicht eintrat, darf nicht angenommen werden. Das würde das Risiko überschätzen. Zensiert heißt nur: bis dahin war nichts eingetreten.', 'A death that did not occur must not be assumed. That would overestimate the risk. Censored means only: until then nothing had happened.'))
    ],
    hilfe: ['zensierung', 'kaplan-meier'], belege: ['Hilfe:zensierung', SOLL]
  },
  {
    id: 'bx-her-logrank', thema: T, fall: 'bx-her',
    stamm: P(`Der Log-Rank-Test über die drei Gruppen ergibt Chi² = ${HE.d('logrank_chi2', 1)} mit ${HE.d('logrank_df', 0)} Freiheitsgraden, p ${HE.pd('logrank_p')}. Welche Folgerung ist richtig?`, `The log-rank test across the three groups gives chi² = ${HE.e('logrank_chi2', 1)} with ${HE.e('logrank_df', 0)} degrees of freedom, p ${HE.pe('logrank_p')}. Which conclusion is correct?`),
    antworten: [
      a(P(`Die drei Kurven sind kaum gleich; welche Paare sich unterscheiden, bleibt offen`, `The three curves are hardly equal; which pairs differ stays open`), P('Der Log-Rank-Test prüft die Nullhypothese gleicher Kurven in allen Gruppen. Für einzelne Paare braucht es Paarvergleiche mit Schutz gegen mehrfaches Testen.', 'The log-rank test checks the null hypothesis of equal curves in all groups. For single pairs pairwise comparisons with protection against multiple testing are needed.'), true),
      a(P(`Die Gruppe mit der niedrigsten Auswurffraktion stirbt ${HE.d('logrank_chi2', 1)} Tage früher`, `The group with the lowest ejection fraction dies ${HE.e('logrank_chi2', 1)} days earlier`), P('Chi² hat keine Einheit und ist kein Zeitunterschied. Der Test vergleicht den Verlauf der Kurven insgesamt, nicht eine Zahl von Tagen.', 'Chi² has no unit and is no time difference. The test compares the course of the curves as a whole, not a number of days.')),
      a(P('Die Auswurffraktion verursacht das Sterben, denn p ist kleiner als 0,001', 'The ejection fraction causes the dying because p is smaller than 0.001'), P('Das p sagt, dass die Kurven kaum zufällig verschieden sind. Die Auswurffraktion zeigt auch den Zustand der Person; ein Grund folgt aus dem Test nicht.', 'The p says that the curves are hardly different by chance. The ejection fraction also shows the condition of the person; a reason does not follow from the test.')),
      a(P('Alle drei Gruppen unterscheiden sich paarweise voneinander im Verlauf der Kurven', 'All three groups differ pairwise from each other in the course of the curves'), P(`Der Test gilt für alle Gruppen zugleich. In der Tabelle sterben in der zweiten und dritten Gruppe ${HE.d('ereignisse_gruppe2', 0)} und ${HE.d('ereignisse_gruppe3', 0)} Personen; diese Kurven könnten einander ähneln.`, `The test applies to all groups at the same time. In the table ${HE.e('ereignisse_gruppe2', 0)} and ${HE.e('ereignisse_gruppe3', 0)} people die in the second and third group; these curves could resemble each other.`))
    ],
    hilfe: ['kaplan-meier', 'p-wert'], belege: ['Hilfe:kaplan-meier', SOLL]
  },

  // ======================================================== 8. Brustkrebs (bru)
  {
    id: 'bx-bru-d', thema: T, fall: 'bx-bru',
    stamm: P(`Der Radius der Zellkerne unterscheidet sich zwischen bösartigen und gutartigen Proben mit t = ${BR.d('welch_t', 1)}, p ${BR.pd('welch_p')} und Cohens d = ${BR.d('cohens_d', 1)}. Wie ist Cohens d zu lesen?`, `The radius of the cell nuclei differs between malignant and benign samples with t = ${BR.e('welch_t', 1)}, p ${BR.pe('welch_p')} and Cohen's d = ${BR.e('cohens_d', 1)}. How is Cohen's d to be read?`),
    antworten: [
      a(P(`Die Gruppenmittel liegen etwa ${BR.d('cohens_d', 1)} Standardabweichungen auseinander: ein sehr großer Effekt`, `The group means are about ${BR.e('cohens_d', 1)} standard deviations apart: a very large effect`), P(`d misst den Unterschied der Mittelwerte in Einheiten der gemeinsamen Streuung, unabhängig von der Probenzahl. Das p sagt nur, dass er kaum Zufall ist.`, `d measures the difference of the means in units of the common spread, independent of the number of samples. The p only says it is hardly chance.`), true),
      a(P(`Bösartige Zellkerne sind im Mittel ${BR.d('cohens_d', 1)} Millimeter größer als gutartige`, `Malignant cell nuclei are on average ${BR.e('cohens_d', 1)} millimetres larger than benign ones`), P(`d hat keine Einheit. Der Unterschied der Mittelwerte in der Tabelle (${BR.d('mittel_radius_boesartig', 1)} gegen ${BR.d('mittel_radius_gutartig', 1)}) ist ein anderer Wert als d.`, `d has no unit. The difference of the means in the table (${BR.e('mittel_radius_boesartig', 1)} against ${BR.e('mittel_radius_gutartig', 1)}) is a different value from d.`)),
      a(P(`Weil p kleiner als 0,001 ist, ist der Unterschied auch größer als bei einem p von 0,01 oder 0,05`, `Because p is smaller than 0.001 the difference is also larger than with a p of 0.01 or 0.05`), P('Das p hängt auch von der Zahl der Proben ab. Zwei Unterschiede gleicher Größe können bei verschieden vielen Proben verschiedene p-Werte haben; die Größe zeigt d.', 'The p also depends on the number of samples. Two differences of the same size can have different p values with different numbers of samples; the size is shown by d.')),
      a(P(`Eine Probe mit großem Radius ist mit einer Wahrscheinlichkeit von ${BR.d('cohens_d', 1)} bösartig`, `A sample with a large radius is malignant with a probability of ${BR.e('cohens_d', 1)}`), P('Eine Wahrscheinlichkeit liegt zwischen 0 und 1 und ist kein d. Wie sicher ein Merkmal zwischen den Gruppen trennt, zeigt die AUC.', 'A probability lies between 0 and 1 and is no d. How surely a feature separates the groups is shown by the AUC.'))
    ],
    hilfe: ['cohens-d', 'effektstaerke'], belege: ['Hilfe:cohens-d', SOLL]
  },
  {
    id: 'bx-bru-auc', thema: T, fall: 'bx-bru',
    stamm: P(`Der Radius hat eine AUC von ${BR.d('auc_radius', 2)}, die Textur von ${BR.d('auc_textur', 2)}. Was sagt die AUC aus?`, `The radius has an AUC of ${BR.e('auc_radius', 2)}, the texture of ${BR.e('auc_textur', 2)}. What does the AUC say?`),
    antworten: [
      a(P(`In einem zufälligen Paar hat die bösartige Probe zu etwa ${BR.d('auc_radius', 2)} den größeren Radius`, `In a random pair the malignant sample has the larger radius with about ${BR.e('auc_radius', 2)}`), P('Die AUC ist die Fläche unter der ROC-Kurve und misst die Trennschärfe über alle möglichen Schwellen. 0,5 hieße Raten, 1 vollständige Trennung.', 'The AUC is the area under the ROC curve and measures the separation over all possible thresholds. 0.5 would mean guessing, 1 complete separation.'), true),
      a(P(`${BR.d('auc_radius', 2)} der Proben werden mit dem Radius richtig eingeteilt, unabhängig von der Schwelle`, `${BR.e('auc_radius', 2)} of the samples are classified correctly with the radius, independent of the threshold`), P('Die Trefferquote hängt von der gewählten Schwelle ab; die AUC fasst alle Schwellen zusammen und ist keine Trefferquote.', 'The hit rate depends on the chosen threshold; the AUC summarises all thresholds and is not a hit rate.')),
      a(P(`Bei der Textur sind ${BR.d('auc_textur', 2)} der Proben falsch eingeordnet`, `For the texture ${BR.e('auc_textur', 2)} of the samples are classified wrongly`), P(`Die AUC zählt keine falsch eingeordneten Proben. Ein Wert von ${BR.d('auc_textur', 2)} zeigt eine mäßige Trennung, wobei sich die Gruppen deutlich überlappen.`, `The AUC does not count wrongly classified samples. A value of ${BR.e('auc_textur', 2)} shows a moderate separation, with the groups overlapping clearly.`)),
      a(P('Eine AUC von 0,5 wäre das beste Ergebnis, weil beide Gruppen dann gleich behandelt werden', 'An AUC of 0.5 would be the best result because both groups are then treated equally'), P('Bei 0,5 trennt das Merkmal die Gruppen nicht besser als der Zufall. Je näher die AUC an 1 liegt, desto besser trennt es.', 'At 0.5 the feature separates the groups no better than chance. The closer the AUC is to 1, the better it separates.'))
    ],
    hilfe: ['roc-auc', 'roc-kurve'], belege: ['Hilfe:roc-auc', SOLL]
  },
  {
    id: 'bx-bru-schwelle', thema: T, fall: 'bx-bru',
    stamm: P('Für den Radius wird eine Schwelle festgelegt: Ab diesem Wert gilt eine Probe als verdächtig. Was geschieht, wenn man die Schwelle senkt?', 'A threshold is set for the radius: from this value a sample counts as suspicious. What happens if the threshold is lowered?'),
    antworten: [
      a(P(`Mehr bösartige werden erkannt, aber mehr gutartige zu Unrecht verdächtigt`, `More malignant samples are found, but more benign ones are wrongly suspected`), P('Die beiden Fehlerarten verhalten sich gegenläufig. Welcher Fehler schwerer wiegt, ein übersehener Befund oder ein unnötiger Verdacht, ist eine sachliche Entscheidung.', 'The two error types behave in opposite directions. Which error weighs more, a missed finding or an unnecessary suspicion, is a substantive decision.'), true),
      a(P(`Beides verbessert sich gleichzeitig, weil die Schwelle die Trennung der Gruppen verfeinert`, `Both improve at once because the threshold refines the separation of the groups`), P('Die Trennung der Gruppen steckt in der Verteilung des Merkmals und ändert sich mit der Schwelle nicht. Eine Schwelle verschiebt nur das Verhältnis der beiden Fehlerarten.', 'The separation of the groups lies in the distribution of the feature and does not change with the threshold. A threshold only shifts the ratio of the two error types.')),
      a(P('Mehr bösartige Proben werden übersehen, und weniger gutartige werden verdächtigt', 'More malignant samples are missed, and fewer benign ones are suspected'), P('Das gilt für eine höhere Schwelle. Bei einer niedrigeren Schwelle gilt mehr als verdächtig, es werden also weniger bösartige Proben übersehen.', 'That applies to a higher threshold. With a lower threshold more samples count as suspicious, so fewer malignant samples are missed.')),
      a(P(`Die AUC steigt, weil mehr Proben als verdächtig gelten (bisher ${BR.d('auc_radius', 2)})`, `The AUC rises because more samples count as suspicious (so far ${BR.e('auc_radius', 2)})`), P('Die AUC fasst alle möglichen Schwellen zusammen und hängt von keiner einzelnen ab. Eine bestimmte Schwelle ist nur ein Punkt auf der ROC-Kurve.', 'The AUC summarises all possible thresholds and depends on no single one. A particular threshold is only one point on the ROC curve.'))
    ],
    hilfe: ['sensitivitaet', 'spezifitaet'], belege: ['Hilfe:sensitivitaet', SOLL]
  },

  // ======================================================== 9. Schlafentzug (sch)
  {
    id: 'bx-sch-icc', thema: T, fall: 'bx-sch',
    stamm: P(`Das Nullmodell ergibt einen ICC von ${SC.d('icc_nullmodell', 2)}. Wie ist das zu lesen?`, `The null model gives an ICC of ${SC.e('icc_nullmodell', 2)}. How is this to be read?`),
    antworten: [
      a(P(`Etwa vier Zehntel der Streuung liegen zwischen den Personen, der Rest innerhalb einer Person`, `About four tenths of the spread lie between the people, the rest within a person`), P(`Der ICC (Intraklassenkorrelation) ist der Anteil der Gesamtstreuung auf der zweiten Ebene, hier der Personen. Manche sind insgesamt schneller.`, `The ICC (intraclass correlation) is the share of the total spread on the second level, here the people. Some are faster overall.`), true),
      a(P(`${SC.d('icc_nullmodell', 2)} der Personen sind im Mittel langsamer als der Durchschnitt aller Personen`, `${SC.e('icc_nullmodell', 2)} of the people are on average slower than the average of all people`), P('Der ICC zählt keine Personen. Er teilt die Streuung auf: wie viel zwischen den Personen und wie viel innerhalb jeder Person liegt.', 'The ICC does not count people. It divides the spread: how much lies between the people and how much within each person.')),
      a(P('Die Reaktionszeit verlängert sich im Lauf der Tage um den Anteil des ICC', 'The reaction time lengthens over the days by the share of the ICC'), P(`Die Veränderung über die Tage zeigt die feste Steigung (${SC.d('feste_steigung', 1)} Millisekunden je Tag). Der ICC des Nullmodells berücksichtigt die Tage noch gar nicht.`, `The change over the days is shown by the fixed slope (${SC.e('feste_steigung', 1)} milliseconds per day). The ICC of the null model does not take the days into account at all yet.`)),
      a(P(`Die Korrelation von Studientag und Reaktionszeit im Nullmodell beträgt ${SC.d('icc_nullmodell', 2)}`, `The correlation of study day and reaction time in the null model is ${SC.e('icc_nullmodell', 2)}`), P(`Die einfache Korrelation ist ${SC.d('r_tage_reaktion', 2)}. ICC und Korrelation sind verschiedene Maße: Der ICC zeigt, wie ähnlich die Werte derselben Person sind.`, `The simple correlation is ${SC.e('r_tage_reaktion', 2)}. ICC and correlation are different measures: the ICC shows how similar the values of the same person are.`))
    ],
    hilfe: ['icc-mehrebenen', 'intraklassenkorrelation'], belege: ['Hilfe:icc-mehrebenen', SOLL]
  },
  {
    id: 'bx-sch-warum', thema: T, fall: 'bx-sch',
    stamm: P(`Die einfache Korrelation von Studientag und Reaktionszeit beträgt ${SC.d('r_tage_reaktion', 2)} bei 180 Zeilen. Warum ist ein Mehrebenenmodell besser?`, `The simple correlation of study day and reaction time is ${SC.e('r_tage_reaktion', 2)} with 180 rows. Why is a multilevel model better?`),
    antworten: [
      a(P(`Werte derselben Person ähneln sich, aber der p-Wert zählt 180 unabhängige Personen`, `Values of the same person resemble each other, but the p value counts 180 independent people`), P('Abhängige Beobachtungen machen den p-Wert zu optimistisch. Das Mehrebenenmodell trennt die Unterschiede zwischen den Personen von denen innerhalb einer Person.', 'Dependent observations make the p value too optimistic. The multilevel model separates the differences between the people from those within a person.'), true),
      a(P('Die Reaktionszeit ist nicht normalverteilt, und nur das Mehrebenenmodell setzt keine Verteilung voraus', 'The reaction time is not normally distributed, and only the multilevel model assumes no distribution'), P('Auch das Mehrebenenmodell nimmt Verteilungen an. Der Grund ist die Struktur der Daten, nicht die Verteilung der Reaktionszeit.', 'The multilevel model also makes assumptions about distributions. The reason is the structure of the data, not the distribution of the reaction time.')),
      a(P(`Die Korrelation ist mit ${SC.d('r_tage_reaktion', 2)} zu klein, und das Mehrebenenmodell macht sie größer und damit deutlicher`, `The correlation is too small with ${SC.e('r_tage_reaktion', 2)}, and the multilevel model makes it larger and thus clearer`), P(`Ein Modell macht einen Zusammenhang nicht größer. Es schätzt ihn anders, hier als Zunahme je Tag (${SC.d('feste_steigung', 1)} Millisekunden) mit richtigem Standardfehler.`, `A model does not make an association larger. It estimates it differently, here as an increase per day (${SC.e('feste_steigung', 1)} milliseconds) with a correct standard error.`)),
      a(P('Eine Korrelation lässt sich nur für zwei Gruppen von Personen berechnen, nicht für Messreihen', 'A correlation can be computed only for two groups of people, not for series of measurements'), P('Die Korrelation lässt sich für jedes Paar von Messwerten berechnen. Das Problem ist nur, dass die Werte nicht voneinander unabhängig sind.', 'The correlation can be computed for any pair of measured values. The problem is only that the values are not independent of one another.'))
    ],
    hilfe: ['mehrebenen', 'unabhaengigkeit-beobachtungen'], belege: ['Hilfe:mehrebenen', SOLL]
  },
  {
    id: 'bx-sch-steigung', thema: T, fall: 'bx-sch',
    stamm: P(`Das Mehrebenenmodell ergibt eine feste Steigung von ${SC.d('feste_steigung', 1)} bei einem Achsenabschnitt von ${SC.d('feste_achsenabschnitt', 1)}. Was bedeuten die Werte?`, `The multilevel model gives a fixed slope of ${SC.e('feste_steigung', 1)} with an intercept of ${SC.e('feste_achsenabschnitt', 1)}. What do the values mean?`),
    antworten: [
      a(P(`Die Reaktionszeit steigt im Mittel um etwa ${SC.d('feste_steigung', 1)} Millisekunden je Tag, ab etwa ${SC.d('feste_achsenabschnitt', 1)} am Tag 0`, `On average the reaction time rises by about ${SC.e('feste_steigung', 1)} milliseconds per day, from about ${SC.e('feste_achsenabschnitt', 1)} on day 0`), P('Die feste Steigung ist der mittlere Verlauf. Einzelne Personen können stärker oder schwächer ansteigen; das ließe sich mit einer zufälligen Steigung prüfen.', 'The fixed slope is the mean course. Single people may rise more or less; this could be checked with a random slope.'), true),
      a(P(`Jede Person wird je Tag um genau ${SC.d('feste_steigung', 1)} Millisekunden langsamer, ohne Abweichung`, `Every person becomes slower by exactly ${SC.e('feste_steigung', 1)} milliseconds per day, without deviation`), P('Die feste Steigung beschreibt den Durchschnitt. Das Modell mit zufälligem Achsenabschnitt gibt allen dieselbe Steigung vor; in Wirklichkeit unterscheiden sie sich.', 'The fixed slope describes the average. The model with a random intercept gives everyone the same slope; in reality they differ.')),
      a(P(`Am Tag 0 beträgt die mittlere Reaktionszeit der Personen ${SC.d('feste_steigung', 1)} Millisekunden`, `On day 0 the mean reaction time of the people is ${SC.e('feste_steigung', 1)} milliseconds`), P(`Der Wert am Tag 0 ist der Achsenabschnitt (${SC.d('feste_achsenabschnitt', 1)} Millisekunden). Die Steigung gibt die Änderung je Tag an.`, `The value on day 0 is the intercept (${SC.e('feste_achsenabschnitt', 1)} milliseconds). The slope gives the change per day.`)),
      a(P(`Der Anstieg ist belegt, weil die Steigung deutlich größer als der ICC ist`, `The rise is proven because the slope is clearly larger than the ICC`), P(`Steigung (${SC.d('feste_steigung', 1)}) und ICC (${SC.d('icc_nullmodell', 2)}) haben verschiedene Einheiten und werden nicht verglichen. Ob die Steigung belegt ist, zeigt ihr Standardfehler.`, `Slope (${SC.e('feste_steigung', 1)}) and ICC (${SC.e('icc_nullmodell', 2)}) have different units and are not compared. Whether the slope is proven is shown by its standard error.`))
    ],
    hilfe: ['mehrebenen', 'koeffizient-b'], belege: ['Hilfe:mehrebenen', SOLL]
  },

  // ======================================================== 10. Diagnosen (dia)
  {
    id: 'bx-dia-kappa', thema: T, fall: 'bx-dia',
    stamm: P(`Die Beurteilungen 1 und 2 stimmen bei ${DI.d('uebereinstimmung_1_2_prozent', 1)} Prozent der Personen überein, Cohens Kappa beträgt ${DI.d('cohens_kappa_1_2', 2)}. Warum ist Kappa kleiner als die Prozentzahl?`, `Ratings 1 and 2 agree for ${DI.e('uebereinstimmung_1_2_prozent', 1)} percent of the people, Cohen's kappa is ${DI.e('cohens_kappa_1_2', 2)}. Why is kappa smaller than the percentage?`),
    antworten: [
      a(P(`Kappa zieht die Übereinstimmung ab, die schon durch Raten zu erwarten wäre`, `Kappa subtracts the agreement that guessing alone would already produce`), P('Wenn eine Diagnose häufig vorkommt, stimmen zwei Beurteilende auch zufällig oft überein. Kappa misst nur, was über diese Zufallsübereinstimmung hinausgeht.', 'If a diagnosis is frequent, two raters also agree often by chance. Kappa measures only what goes beyond this chance agreement.'), true),
      a(P('Kappa wertet nur die schwierigen Fälle, in denen die Diagnose zunächst unklar war', 'Kappa evaluates only the difficult cases in which the diagnosis was unclear at first'), P('Kappa nutzt alle Personen. Die Tabelle der Beurteilungen enthält leichte und schwierige Fälle gleichermaßen.', 'Kappa uses all people. The table of ratings contains easy and difficult cases alike.')),
      a(P('Kappa gewichtet jede Abweichung doppelt, darum fällt der Wert niedriger aus', 'Kappa weights each deviation twice, which is why the value turns out lower'), P('Das ungewichtete Kappa zählt jede Abweichung einmal. Der Abstand zur Prozentzahl entsteht durch den Abzug der Zufallsübereinstimmung.', 'Unweighted kappa counts each deviation once. The gap to the percentage arises from the subtraction of the chance agreement.')),
      a(P('Die Prozentzahl enthält Rundungsfehler, Kappa ist die genauere Rechnung derselben Größe', 'The percentage contains rounding errors, kappa is the more exact computation of the same quantity'), P('Es sind zwei verschiedene Größen. Die Prozentzahl misst rohe Übereinstimmung, Kappa die um den Zufall bereinigte; ein Rundungsfehler erklärt den Unterschied nicht.', 'They are two different quantities. The percentage measures raw agreement, kappa the agreement corrected for chance; a rounding error does not explain the difference.'))
    ],
    hilfe: ['kappa', 'kappa-paradox'], belege: ['Hilfe:kappa', SOLL]
  },
  {
    id: 'bx-dia-fleiss', thema: T, fall: 'bx-dia',
    stamm: P(`Das Fleiss-Kappa beträgt ${DI.d('fleiss_kappa_alle6', 2)} mit allen sechs Beurteilungen und ${DI.d('fleiss_kappa_erste3', 2)} mit den ersten drei. Was ist daraus zu schließen?`, `Fleiss' kappa is ${DI.e('fleiss_kappa_alle6', 2)} with all six ratings and ${DI.e('fleiss_kappa_erste3', 2)} with the first three. What is to be concluded from this?`),
    antworten: [
      a(P(`Kappa hängt davon ab, welche und wie viele Beurteilende einbezogen werden`, `Kappa depends on which and how many raters are included`), P('Mit weiteren Beurteilenden kommen weitere Abweichungen hinzu. Ein Kappa ohne Angabe der Beurteilenden lässt sich nicht einordnen.', 'With further raters further deviations come in. A kappa without a statement of the raters cannot be classified.'), true),
      a(P('Die ersten drei Beurteilenden sind die besseren, denn mit ihnen ist Kappa höher', 'The first three raters are the better ones, because with them kappa is higher'), P('Ein höheres Kappa zeigt mehr Einigkeit, nicht mehr Richtigkeit. Alle drei können dieselbe Diagnose irrtümlich stellen.', 'A higher kappa shows more agreement, not more correctness. All three can wrongly make the same diagnosis.')),
      a(P(`Mit ${DI.d('fleiss_kappa_alle6', 2)} stimmen 43 Prozent der Diagnosen überein`, `With ${DI.e('fleiss_kappa_alle6', 2)} 43 percent of the diagnoses agree`), P(`Kappa ist kein Prozentanteil übereinstimmender Diagnosen. Bei den ersten beiden Beurteilungen stimmen ${DI.d('uebereinstimmung_1_2_prozent', 1)} Prozent überein, das Kappa ist ${DI.d('cohens_kappa_1_2', 2)}.`, `Kappa is not a percentage of agreeing diagnoses. For the first two ratings ${DI.e('uebereinstimmung_1_2_prozent', 1)} percent agree, the kappa is ${DI.e('cohens_kappa_1_2', 2)}.`)),
      a(P('Das Kappa dürfte nicht von der Zahl der Beurteilenden abhängen, also liegt ein Fehler vor', 'Kappa should not depend on the number of raters, so there is an error'), P('Mit mehr Beurteilenden ändert sich die Menge der Vergleiche, und der Wert kann sich ändern. Das ist kein Fehler, sondern gehört zur Aussage des Maßes.', 'With more raters the set of comparisons changes, and the value can change. This is no error but part of the meaning of the measure.'))
    ],
    hilfe: ['fleiss-kappa', 'kappa'], belege: ['Hilfe:fleiss-kappa', SOLL]
  },
  {
    id: 'bx-dia-einordnung', thema: T, fall: 'bx-dia',
    stamm: P(`Wie wird ein Kappa von ${DI.d('fleiss_kappa_alle6', 2)} nach der gebräuchlichen Faustregel von Landis und Koch eingeordnet?`, `How is a kappa of ${DI.e('fleiss_kappa_alle6', 2)} classified by the common rule of thumb of Landis and Koch?`),
    antworten: [
      a(P(`Als mäßige Übereinstimmung; die Einordnung ist eine Konvention, kein Test`, `As moderate agreement, by convention and not by a test`), P('Die Stufen nach Landis und Koch sind eine Faustregel ohne Test. Wie viel Übereinstimmung genügt, hängt von der Folge einer Diagnose ab.', 'The levels of Landis and Koch are a rule of thumb without a test. How much agreement is enough depends on the consequence of a diagnosis.'), true),
      a(P('Als hohe Übereinstimmung, weil Kappa deutlich über 0 liegt', 'As high agreement because kappa is clearly above 0'), P('Der Wert 0 heißt: nicht besser als Zufall. Ein Wert über 0 ist die Untergrenze, nicht das Ziel; hohe Übereinstimmung beginnt erst bei deutlich größeren Werten.', 'The value 0 means: no better than chance. A value above 0 is the lower limit, not the goal; high agreement begins only at clearly larger values.')),
      a(P('Als ausreichend, weil das Kappa signifikant von 0 verschieden ist', 'As sufficient because kappa differs significantly from 0'), P('Ein Test gegen 0 zeigt nur, dass die Beurteilenden besser als zufällig übereinstimmen. Ob das für die Praxis reicht, ist eine andere Frage.', 'A test against 0 only shows that the raters agree better than chance. Whether that is enough for practice is another question.')),
      a(P('Als Beleg, dass die Mehrzahl der Diagnosen falsch ist, denn Kappa liegt unter 1', 'As proof that most diagnoses are wrong because kappa is below 1'), P('Kappa misst Übereinstimmung, nicht Richtigkeit. Ohne Referenzdiagnose lässt sich nicht sagen, welche Diagnose stimmt.', 'Kappa measures agreement, not correctness. Without a reference diagnosis it cannot be said which diagnosis is correct.'))
    ],
    hilfe: ['kappa', 'fleiss-kappa'], belege: ['Hilfe:kappa', SOLL]
  },

  // ======================================================== 11. Länderspiele (lae)
  {
    id: 'bx-lae-poisson', thema: T, fall: 'bx-lae',
    stamm: P(`Die Heimmannschaften erzielen im Mittel ${LA.d('mittel_tore_heim', 2)} Tore je Spiel, die Varianz der Tore beträgt ${LA.d('var_tore_heim', 2)}. Was folgt für ein Modell der Tore?`, `The home teams score ${LA.e('mittel_tore_heim', 2)} goals per match on average, the variance of the goals is ${LA.e('var_tore_heim', 2)}. What follows for a model of the goals?`),
    antworten: [
      a(P(`Bei Poisson wären Mittelwert und Varianz gleich; hier liegt Überdispersion vor`, `With Poisson mean and variance would be equal; here there is overdispersion`), P(`Bei Überdispersion unterschätzt eine reine Poisson-Regression die Standardfehler. Ein Modell mit zusätzlicher Streuung (zum Beispiel negative Binomial) passt besser.`, `With overdispersion a pure Poisson regression underestimates the standard errors. A model with extra spread (for example negative binomial) fits better.`), true),
      a(P('Die Varianz müsste kleiner als der Mittelwert sein, die Daten enthalten also einen Fehler', 'The variance would have to be smaller than the mean, so the data contain an error'), P('Für eine Poisson-Verteilung sind beide gleich, kleiner als der Mittelwert wäre die Varianz bei Unterdispersion. Die Daten sind nicht fehlerhaft, sie streuen nur stärker.', 'For a Poisson distribution both are equal; the variance would be smaller than the mean with underdispersion. The data are not faulty, they just scatter more.')),
      a(P('Heimteams schießen konstant mehr Tore, das zeigt die größere Varianz', 'Home teams constantly score more goals, which the larger variance shows'), P(`Der Vorsprung der Heimteams steckt im Mittelwert (${LA.d('mittel_tore_heim', 2)} gegen ${LA.d('mittel_tore_gast', 2)}). Die Varianz zeigt, wie unterschiedlich die Torzahlen von Spiel zu Spiel sind.`, `The lead of the home teams is in the mean (${LA.e('mittel_tore_heim', 2)} against ${LA.e('mittel_tore_gast', 2)}). The variance shows how different the numbers of goals are from match to match.`)),
      a(P('Überdispersion heißt, dass die Tore normalverteilt sind und eine lineare Regression genügt', 'Overdispersion means that the goals are normally distributed and a linear regression suffices'), P('Tore sind Zähldaten: ganze Zahlen ab 0, nach oben auslaufend. Überdispersion ist eine Eigenschaft solcher Daten und kein Hinweis auf eine Normalverteilung.', 'Goals are count data: whole numbers from 0, trailing off upwards. Overdispersion is a property of such data and no hint of a normal distribution.'))
    ],
    hilfe: ['ueberdispersion', 'poisson-verteilung'], belege: ['Hilfe:ueberdispersion', SOLL]
  },
  {
    id: 'bx-lae-v', thema: T, fall: 'bx-lae',
    stamm: P(`Der Chi-Quadrat-Test von Spielort und Ergebnis gibt Chi² = ${LA.d('chi2', 1)} mit ${LA.d('df', 0)} Freiheitsgraden, p ${LA.pd('p')}, Cramérs V = ${LA.d('cramers_v', 2)}. Wie ist das zu lesen?`, `The chi-square test of venue and result gives chi² = ${LA.e('chi2', 1)} with ${LA.e('df', 0)} degrees of freedom, p ${LA.pe('p')}, Cramér's V = ${LA.e('cramers_v', 2)}. How is this to be read?`),
    antworten: [
      a(P(`Der Zusammenhang ist deutlich, aber klein: Der Spielort erklärt wenig`, `The association is clear but small: the venue explains little`), P('Das p wächst mit der Zahl der Spiele, V nicht. Ein V um 0,1 gilt nach üblicher Faustregel als kleiner Zusammenhang; der Heimvorteil ist da, aber nicht groß.', 'The p grows with the number of matches, V does not. A V around 0.1 counts as a small association by the usual rule of thumb; the home advantage exists, but it is not large.'), true),
      a(P(`Der Heimvorteil ist groß, weil das p so klein ausfällt und Chi² so hoch ist`, `The home advantage is large because the p is so small and the chi² so high`), P('Ein kleines p belegt nur, dass der Zusammenhang kaum Zufall ist. Seine Größe zeigt V; sie ist hier klein.', 'A small p only proves that the association is hardly chance. Its size is shown by V; it is small here.')),
      a(P(`${LA.d('cramers_v', 1)} Prozent der Spiele werden allein durch den Spielort entschieden`, `${LA.e('cramers_v', 1)} percent of the matches are decided by the venue alone`), P('V ist kein Anteil entschiedener Spiele, sondern ein Stärkemaß der ganzen Tabelle. Aus ihm lässt sich keine Zahl von Spielen ablesen.', 'V is not a share of decided matches but a measure of strength of the whole table. No number of matches can be read from it.')),
      a(P(`Heimteams gewinnen in ${LA.d('chi2', 0)} Prozent der Spiele, wenn sie zu Hause spielen`, `Home teams win in ${LA.e('chi2', 0)} percent of the matches when they play at home`), P(`Chi² ist eine Prüfgröße und kein Anteil. Der Anteil der Heimsiege steht in der Tabelle: ${LA.d('heimsiege_prozent', 1)} Prozent aller Spiele.`, `Chi² is a test statistic and no share. The share of home wins is in the table: ${LA.e('heimsiege_prozent', 1)} percent of all matches.`))
    ],
    hilfe: ['cramers-v', 'chi-quadrat'], belege: ['Hilfe:cramers-v', SOLL]
  },
  {
    id: 'bx-lae-heimvorteil', thema: T, fall: 'bx-lae',
    stamm: P(`Die Heimmannschaft gewinnt ${LA.d('heimsiege_prozent', 1)} Prozent aller Spiele. Ist das schon ein Heimvorteil?`, `The home team wins ${LA.e('heimsiege_prozent', 1)} percent of all matches. Is that already a home advantage?`),
    antworten: [
      a(P(`Der Anteil allein genügt nicht: Man braucht den Vergleich mit Spielen an neutralem Ort`, `The share alone is not enough: one needs the comparison with matches at a neutral venue`), P('Auch ohne Heimrecht verteilen sich Siege, Unentschieden und Niederlagen nicht gleichmäßig. Erst der Vergleich nach Spielort zeigt, ob das Heimrecht etwas ändert.', 'Even without home rights wins, draws and defeats are not spread evenly. Only the comparison by venue shows whether home rights change anything.'), true),
      a(P('Ja, denn bei drei möglichen Ausgängen wäre ein Drittel zu erwarten, und der Anteil liegt darüber', 'Yes, because with three possible outcomes a third would be expected, and the share is above it'), P('Die drei Ausgänge sind nicht gleich wahrscheinlich: Unentschieden sind seltener als Siege. Ein Drittel ist darum keine Grundlage für den Vergleich.', 'The three outcomes are not equally likely: draws are rarer than wins. A third is therefore no basis for the comparison.')),
      a(P('Nein, denn ein Anteil unter 50 Prozent kann kein Vorteil sein', 'No, because a share below 50 percent cannot be an advantage'), P('Die Marke 50 Prozent gilt für zwei Ausgänge. Hier gibt es drei: Heimsieg, Unentschieden und Gastsieg, sodass auch ein Anteil unter 50 Prozent ein Vorsprung sein kann.', 'The mark of 50 percent applies to two outcomes. Here there are three: home win, draw and away win, so a share below 50 percent can also be an advantage.')),
      a(P('Ja, weil Chi² bei zwei Freiheitsgraden deutlich ist, also gewinnen Heimteams öfter', 'Yes, because chi² is clear with two degrees of freedom, so home teams win more often'), P('Chi² zeigt einen Zusammenhang von Spielort und Ergebnis an, nicht für sich eine Richtung. Die Richtung erkennt man erst an den Anteilen nach Spielort.', 'Chi² indicates an association of venue and result, not a direction by itself. The direction is recognised only from the shares by venue.'))
    ],
    hilfe: ['chi-quadrat-unabhaengigkeit', 'zusammenhang-ursache'], belege: ['Hilfe:chi-quadrat-unabhaengigkeit', SOLL]
  },

  // ======================================================== 12. CO2 (co2)
  {
    id: 'bx-co2-auto', thema: T, fall: 'bx-co2',
    stamm: P(`Die Reste der Trendgeraden haben bei Verzögerung 1 eine Autokorrelation von ${CO.d('autokorr_lag1_reste', 2)}. Was folgt daraus?`, `At lag 1 the residuals of the trend line have an autocorrelation of ${CO.e('autokorr_lag1_reste', 2)}. What follows from this?`),
    antworten: [
      a(P(`Benachbarte Jahre sind abhängig; p-Wert und Intervall der Geraden sind zu optimistisch`, `Neighbouring years are dependent; p value and interval of the line are too optimistic`), P(`Die Regression nimmt unabhängige Reste an. Hängen die Reste benachbarter Jahre zusammen, sind die Standardfehler zu klein.`, `The regression assumes independent residuals. If residuals of neighbouring years are related, the standard errors are too small.`), true),
      a(P('Die Reste sind unabhängig, weil ein Wert nahe 1 volle Zufälligkeit anzeigt', 'The residuals are independent because a value close to 1 indicates complete randomness'), P('Es ist umgekehrt: Ein Wert nahe 0 spräche für Unabhängigkeit, ein Wert nahe 1 für starke Abhängigkeit zwischen benachbarten Jahren.', 'It is the other way round: a value close to 0 would speak for independence, a value close to 1 for strong dependence between neighbouring years.')),
      a(P('Der Trend ist besonders stark, denn eine hohe Autokorrelation zeigt eine gute Anpassung', 'The trend is particularly strong, because a high autocorrelation shows a good fit'), P(`Die Güte des Trends zeigt R² (${CO.d('r2_trend', 2)}). Die Autokorrelation der Reste zeigt, dass die Reihe um die Gerade herum noch eine eigene Dynamik hat.`, `The quality of the trend is shown by R² (${CO.e('r2_trend', 2)}). The autocorrelation of the residuals shows that the series still has a dynamic of its own around the line.`)),
      a(P('Ein Wert so nahe an 1 deutet auf einen Rechenfehler hin und kommt in echten Reihen nicht vor', 'A value so close to 1 points to a computing error and does not occur in real series'), P(`Hohe Autokorrelationen sind bei Jahresreihen mit Trend üblich. Die Reihe selbst hat ${CO.d('autokorr_lag1_reihe', 2)}, die Reste liegen nur wenig darunter.`, `High autocorrelations are usual in annual series with a trend. The series itself has ${CO.e('autokorr_lag1_reihe', 2)}, the residuals are only slightly below.`))
    ],
    hilfe: ['autokorrelation', 'zeitreihe'], belege: ['Hilfe:autokorrelation', SOLL]
  },
  {
    id: 'bx-co2-trend', thema: T, fall: 'bx-co2',
    stamm: P(`Die Trendgerade steigt um ${CO.d('steigung_je_jahr', 3)} Tonnen je Jahr, R² = ${CO.d('r2_trend', 2)}. Wie ist das zu lesen?`, `The trend line rises by ${CO.e('steigung_je_jahr', 3)} tonnes per year, R² = ${CO.e('r2_trend', 2)}. How is this to be read?`),
    antworten: [
      a(P(`Die Reihe steigt im Mittel um diesen Betrag je Jahr; der Trend zeigt keine Ursache`, `The series rises on average by this amount a year; the trend shows no cause`), P('Das Jahr ist nur eine Zählung der Zeit. Wirtschaft, Energieträger und Bevölkerung stehen nicht im Modell; aus der Geraden lässt sich keine Ursache ablesen.', 'The year is only a count of time. Economy, energy sources and population are not in the model; no cause can be read from the line.'), true),
      a(P(`Die Zeit selbst verursacht den Anstieg, denn R² ist so hoch, dass die Gerade sicher passt`, `Time itself causes the rise, because R² is so high that the line surely fits`), P('Ein hohes R² zeigt, dass die Gerade den Verlauf gut beschreibt. Zeit wirkt nicht auf den Ausstoß; Gründe stecken in Größen, die sich über die Zeit verändern.', 'A high R² shows that the line describes the course well. Time does not act on the emissions; reasons lie in variables that change over time.')),
      a(P(`${CO.d('r2_trend', 2)} der Jahre liegen genau auf der Geraden, die anderen weichen davon ab`, `${CO.e('r2_trend', 2)} of the years lie exactly on the line, the others deviate from it`), P('R² ist der Anteil der Streuung, den die Gerade erklärt, kein Anteil von Jahren. Kein Jahr muss genau auf der Geraden liegen.', 'R² is the share of the spread explained by the line, not a share of years. No year has to lie exactly on the line.')),
      a(P(`${CO.d('steigung_je_jahr', 3)} ist die Korrelation zwischen Jahr und Ausstoß der Welt je Person`, `${CO.e('steigung_je_jahr', 3)} is the correlation between year and the emissions of the world per person`), P(`Die Korrelation von Jahr und Wert ist ${CO.d('r_jahr_welt', 2)}. Die Steigung hat die Einheit Tonnen je Jahr und ist keine Korrelation.`, `The correlation of year and value is ${CO.e('r_jahr_welt', 2)}. The slope has the unit tonnes per year and is no correlation.`))
    ],
    hilfe: ['trend', 'zusammenhang-ursache'], belege: ['Hilfe:trend', SOLL]
  },
  {
    id: 'bx-co2-prognose', thema: T, fall: 'bx-co2',
    stamm: P('Die Trendgerade soll mehrere Jahrzehnte in die Zukunft verlängert werden. Was spricht dagegen?', 'The trend line is to be extended several decades into the future. What speaks against it?'),
    antworten: [
      a(P(`Die Gerade beschreibt nur die beobachtete Zeit, nicht die Zukunft`, `The line describes only the observed time, not the future`), P('Eine Fortsetzung über den Datenbereich hinaus ist Extrapolation. Reihen mit Trend können kippen, wie viele Länder bei den Ausstößen je Kopf zeigen.', 'A continuation beyond the data range is extrapolation. Series with a trend can turn, as many countries show for emissions per person.'), true),
      a(P('Nichts, denn bei einem so hohen R² ist die Fortsetzung der Geraden sicher', 'Nothing, because with such a high R² the continuation of the line is safe'), P(`Ein hohes R² (${CO.d('r2_trend', 2)}) bestätigt die Anpassung an die Vergangenheit. Über die Zukunft sagt es nichts.`, `A high R² (${CO.e('r2_trend', 2)}) confirms the fit to the past. It says nothing about the future.`)),
      a(P('Die Autokorrelation macht jede Vorhersage unmöglich', 'The autocorrelation makes any prediction impossible'), P('Autokorrelation macht Vorhersagen nicht unmöglich; sie verlangt Modelle, die sie berücksichtigen, und verbreitert die Intervalle. Prognosen für Zeitreihen sind üblich.', 'Autocorrelation does not make predictions impossible; it requires models that take it into account and widens the intervals. Forecasts for time series are common.')),
      a(P('Jahre sind keine Zahlen, deshalb lässt sich mit ihnen keine Gerade verlängern', 'Years are no numbers, which is why no line can be extended with them'), P('Das Jahr ist eine metrische Größe, auf der eine Gerade verlaufen kann. Die Verlängerung ist rechnerisch möglich; fraglich ist ihre sachliche Gültigkeit.', 'The year is a metric variable on which a line can run. The extension is computationally possible; what is questionable is its substantive validity.'))
    ],
    hilfe: ['zeitreihe-prognose', 'extrapolation'], belege: ['Hilfe:zeitreihe-prognose', SOLL]
  },

  // ======================================================== 13. Kalibrierung (kal)
  {
    id: 'bx-kal-grenzen', thema: T, fall: 'bx-kal',
    stamm: P(`Bei α = 1 % beträgt die Nachweisgrenze ${KA.d('kal_nachweisgrenze_a01', 1)}, die Bestimmungsgrenze ${KA.d('kal_bestimmungsgrenze_a01', 1)} (Konzentrationseinheiten). Was bedeuten die beiden Grenzen?`, `At α = 1% the limit of detection is ${KA.e('kal_nachweisgrenze_a01', 1)}, the limit of quantification ${KA.e('kal_bestimmungsgrenze_a01', 1)} (concentration units). What do the two limits mean?`),
    antworten: [
      a(P('Ab der Nachweisgrenze ist ein Stoff sicher von „nichts“ zu unterscheiden, ab der Bestimmungsgrenze auch mit brauchbarer Genauigkeit zu messen', 'From the limit of detection a substance can be told safely from "nothing", from the limit of quantification it can also be measured with usable precision'), P('Die Nachweisgrenze beantwortet nur die Frage „da oder nicht da“. Für eine Mengenangabe mit begrenztem Fehler muss die Konzentration höher liegen, bei der Bestimmungsgrenze.', 'The limit of detection answers only the question "there or not there". For an amount with a limited error the concentration must be higher, at the limit of quantification.'), true),
      a(P('Ab der Nachweisgrenze lässt sich die Menge bereits genau messen, die Bestimmungsgrenze ist nur eine strengere Vorschrift', 'From the limit of detection the amount can already be measured exactly, the limit of quantification is merely a stricter rule'), P('Bei der Nachweisgrenze ist die Streuung der Messung noch so groß, dass die Menge selbst unsicher bleibt. Die höhere Bestimmungsgrenze ist ein anderes Kriterium, kein bloßes Regelwerk.', 'At the limit of detection the spread of the measurement is still so large that the amount itself remains uncertain. The higher limit of quantification is a different criterion, not a mere set of rules.')),
      a(P('Liegt eine Probe unter der Nachweisgrenze, enthält sie sicher keinen Stoff, denn die Messung zeigt dann nichts an', 'If a sample lies below the limit of detection it surely contains no substance, because the measurement then shows nothing'), P('Unter der Nachweisgrenze ist der Stoff nur nicht sicher vom Rauschen zu trennen. Er kann in kleiner Menge vorhanden sein.', 'Below the limit of detection the substance merely cannot be told safely from noise. It can be present in a small amount.')),
      a(P('Nachweis- und Bestimmungsgrenze sind zwei Namen für dieselbe Zahl, je nach Norm', 'Limit of detection and limit of quantification are two names for the same number, depending on the standard'), P(`Es sind verschiedene Werte mit verschiedener Aussage, eine Gleichsetzung ist falsch: hier ${KA.d('kal_nachweisgrenze_a01', 1)}, ${KA.d('kal_erfassungsgrenze_a01', 1)} (Erfassungsgrenze) und ${KA.d('kal_bestimmungsgrenze_a01', 1)}.`, `They are different values with different meanings, equating them is wrong: here ${KA.e('kal_nachweisgrenze_a01', 1)}, ${KA.e('kal_erfassungsgrenze_a01', 1)} (limit of identification) and ${KA.e('kal_bestimmungsgrenze_a01', 1)}.`))
    ],
    hilfe: ['kalibriergerade-nachweisgrenze', 'kalibrierung'], belege: ['Hilfe:kalibriergerade-nachweisgrenze', SOLL]
  },
  {
    id: 'bx-kal-empfindlichkeit', thema: T, fall: 'bx-kal',
    stamm: P(`Die Kalibriergerade hat eine Steigung von ${KA.d('kal_steigung', 2)} und einen Achsenabschnitt von ${KA.d('kal_achsenabschnitt', 2)}. Wie sind die Werte zu lesen?`, `The calibration line has a slope of ${KA.e('kal_steigung', 2)} and an intercept of ${KA.e('kal_achsenabschnitt', 2)}. How are the values to be read?`),
    antworten: [
      a(P('Die Steigung ist die Empfindlichkeit, Signal je Einheit Konzentration; der Achsenabschnitt ist das Signal bei Konzentration 0', 'The slope is the sensitivity, signal per unit of concentration; the intercept is the signal at concentration 0'), P('Signal und Konzentration haben verschiedene Einheiten. Aus der Geraden rechnet man später vom gemessenen Signal auf die Konzentration zurück.', 'Signal and concentration have different units. From the line one later calculates back from the measured signal to the concentration.'), true),
      a(P(`Das Gerät misst um den Faktor ${KA.d('kal_steigung', 2)} zu hoch und muss neu justiert werden, bis die Steigung 1 beträgt`, `The device measures too high by a factor of ${KA.e('kal_steigung', 2)} and must be readjusted until the slope is 1`), P('Eine Steigung von 1 ist nur zu erwarten, wenn beide Größen in derselben Einheit stehen. Hier ist eine Peakfläche gegen eine Konzentration aufgetragen.', 'A slope of 1 is to be expected only if both variables are in the same unit. Here a peak area is plotted against a concentration.')),
      a(P('Der Achsenabschnitt zeigt die kleinste Konzentration, die das Gerät noch messen kann', 'The intercept shows the smallest concentration that the device can still measure'), P('Der Achsenabschnitt ist ein Signal und keine Konzentration. Die kleinste sicher nachweisbare Konzentration folgt aus der Nachweisgrenze, nicht aus ihm.', 'The intercept is a signal and no concentration. The smallest reliably detectable concentration follows from the limit of detection, not from it.')),
      a(P('Eine Steigung ungleich 1 macht die Kalibrierung ungültig, sie gilt nur bei Steigung 1', 'A slope different from 1 makes the calibration invalid, it holds only with a slope of 1'), P('Eine Kalibrierung ist gültig, wenn die Punkte eng an der Geraden liegen und die Reste passen. Die Höhe der Steigung sagt nur, wie empfindlich das Verfahren ist.', 'A calibration is valid if the points lie close to the line and the residuals fit. The size of the slope only says how sensitive the procedure is.'))
    ],
    hilfe: ['kalibriergerade-nachweisgrenze', 'kalibrierung'], belege: ['Hilfe:kalibriergerade-nachweisgrenze', SOLL]
  },
  {
    id: 'bx-kal-r', thema: T, fall: 'bx-kal',
    stamm: P(`Das R² der Kalibriergeraden beträgt ${KA.d('kal_r2', 3)}. Was sagt das über die Güte der Kalibrierung?`, `The R² of the calibration line is ${KA.e('kal_r2', 3)}. What does that say about the quality of the calibration?`),
    antworten: [
      a(P('Die Punkte liegen eng an einer Geraden; ob sie im ganzen Bereich passt, zeigen die Reste', 'The points lie close to a line; whether it fits across the whole range is shown by the residuals'), P('Auch leicht gekrümmte Zusammenhänge können ein R² nahe 1 haben. Für die Kalibrierung zählen deshalb die Reste und die Grenzen nach DIN 32645.', 'Slightly curved relationships can also have an R² close to 1. For the calibration the residuals and the limits according to DIN 32645 therefore count.'), true),
      a(P('Ein R² nahe 1 beweist, dass der Zusammenhang im ganzen Bereich geradlinig ist', 'An R² close to 1 proves that the relationship is linear across the whole range'), P('Ein hohes R² schließt eine leichte Krümmung nicht aus; erst die Reste zeigen, ob die Gerade im ganzen Bereich trägt.', 'A high R² does not rule out a slight curvature; only the residuals show whether the line holds over the whole range.')),
      a(P('Ein R² nahe 1 bedeutet, dass die Steigung der Geraden etwa 1 beträgt', 'An R² close to 1 means that the slope of the line is about 1'), P(`R² misst, wie eng die Punkte an der Geraden liegen, nicht deren Steigung. Die Steigung liegt hier bei ${KA.d('kal_steigung', 2)}.`, `R² measures how closely the points lie to the line, not its slope. The slope here is ${KA.e('kal_steigung', 2)}.`)),
      a(P('Mit diesem R² ist die Nachweisgrenze automatisch niedrig und die Methode empfindlich', 'With this R² the limit of detection is automatically low and the method sensitive'), P(`Die Nachweisgrenze (hier ${KA.d('kal_nachweisgrenze_a01', 1)}) hängt von der Reststreuung bei kleinen Mengen und von der Steigung ab. Ein hohes R² sagt darüber nichts.`, `The limit of detection (here ${KA.e('kal_nachweisgrenze_a01', 1)}) depends on the residual spread at small amounts and on the slope. A high R² says nothing about it.`))
    ],
    hilfe: ['kalibriergerade-nachweisgrenze', 'korrelation'], belege: ['Hilfe:kalibriergerade-nachweisgrenze', SOLL]
  },

  // ======================================================== 14. Schule Portugal (spo)
  {
    id: 'bx-spo-gg', thema: T, fall: 'bx-spo',
    stamm: P(`Bei der Varianzanalyse mit Messwiederholung beträgt das Epsilon nach Greenhouse-Geisser ${SP.d('rm_gemischt_epsilon_gg', 2)}. Statable zeigt daneben einen korrigierten p-Wert. Wie ist das zu lesen?`, `In the repeated-measures analysis of variance the epsilon according to Greenhouse-Geisser is ${SP.e('rm_gemischt_epsilon_gg', 2)}. Statable shows a corrected p value beside it. How is this to be read?`),
    antworten: [
      a(P(`Epsilon unter 1 zeigt verletzte Sphärizität; der korrigierte p-Wert ist dann verlässlicher`, `Epsilon below 1 shows violated sphericity; the corrected p value is then more reliable`), P('Sphärizität heißt: Die Varianzen der Differenzen zwischen allen Paaren von Zeitpunkten sind gleich. Ist das verletzt, ist der gewöhnliche p-Wert zu klein.', 'Sphericity means: the variances of the differences between all pairs of time points are equal. If this is violated, the ordinary p value is too small.'), true),
      a(P(`Epsilon ${SP.d('rm_gemischt_epsilon_gg', 2)} heißt, dass sich die Noten bei ${SP.d('rm_gemischt_epsilon_gg', 2)} der Jugendlichen verbessern`, `Epsilon ${SP.e('rm_gemischt_epsilon_gg', 2)} means that the grades improve for ${SP.e('rm_gemischt_epsilon_gg', 2)} of the young people`), P('Epsilon ist kein Anteil von Personen. Es misst, wie stark die Sphärizität verletzt ist: 1 bedeutet erfüllt, kleinere Werte bedeuten stärkere Verletzung.', 'Epsilon is no share of people. It measures how strongly sphericity is violated: 1 means met, smaller values mean a stronger violation.')),
      a(P('Ein Epsilon nahe 1 zeigt einen starken Zeiteffekt in den Noten', 'An epsilon close to 1 shows a strong time effect in the grades'), P('Epsilon sagt nichts über die Größe des Zeiteffekts. Ein Wert nahe 1 bedeutet nur, dass die Sphärizität weitgehend erfüllt ist.', 'Epsilon says nothing about the size of the time effect. A value close to 1 only means that sphericity is largely met.')),
      a(P('Der unkorrigierte p-Wert bleibt auch bei verletzter Sphärizität der bessere, weil er kleiner ist', 'The uncorrected p value remains the better one even with violated sphericity because it is smaller'), P('Ein kleinerer p-Wert ist nicht besser, wenn er zu klein ausfällt. Die Korrektur gleicht das aus und schützt vor zu vielen falsch positiven Befunden.', 'A smaller p value is not better if it turns out too small. The correction compensates for this and protects against too many false positive findings.'))
    ],
    hilfe: ['greenhouse-geisser', 'sphaerizitaet'], belege: ['Hilfe:greenhouse-geisser', SOLL]
  },
  {
    id: 'bx-spo-ww', thema: T, fall: 'bx-spo',
    stamm: P(`Für die Wechselwirkung von Zeit und Schule zeigt Statable p ${SP.pd('rm_gemischt_wechselwirkung_p')} und korrigiert p ${SP.pd('rm_gemischt_wechselwirkung_p_gg')}. Welcher Wert wird berichtet, und was heißt die Wechselwirkung?`, `For the interaction of time and school Statable shows p ${SP.pe('rm_gemischt_wechselwirkung_p')} and corrected p ${SP.pe('rm_gemischt_wechselwirkung_p_gg')}. Which value is reported, and what does the interaction mean?`),
    antworten: [
      a(P(`Der korrigierte Wert; die Noten verlaufen in den Schulen verschieden`, `The corrected value; the grades run differently in the two schools`), P(`Die Korrektur ändert hier nichts: Beide Werte liegen unter 0,05. Eine Wechselwirkung betrifft die Form des Verlaufs, nicht den Gesamtunterschied.`, `The correction changes nothing here: both values are below 0.05. An interaction concerns the shape of the course, not the overall difference.`), true),
      a(P('Der kleinere Wert, weil er die Wechselwirkung stärker belegt', 'The smaller value because it proves the interaction more strongly'), P('Den passenden Wert wählt man nach der Sphärizität, nicht nach der Größe. Den kleineren zu nehmen, weil er besser aussieht, wäre eine Auswahl nach dem Ergebnis.', 'The suitable value is chosen according to sphericity, not by size. Taking the smaller one because it looks better would be a selection by the result.')),
      a(P('Der korrigierte Wert liegt über 0,01, also gibt es keine Wechselwirkung', 'The corrected value is above 0.01, so there is no interaction'), P('Eine Schwelle von 0,01 ist hier nicht vereinbart; üblich ist 0,05, und beide Werte liegen darunter. Die Wechselwirkung ist also belegt.', 'A threshold of 0.01 is not agreed here; 0.05 is usual, and both values are below it. So the interaction is established.')),
      a(P('Wechselwirkung heißt, dass beide Schulen im Schuljahr gleich viel dazulernen', 'Interaction means that both schools improve by the same amount during the school year'), P('Das ist das Gegenteil: Bei gleichem Verlauf gäbe es keine Wechselwirkung. Sie zeigt, dass die Noten in den Schulen verschieden steigen.', 'That is the opposite: with the same course there would be no interaction. It shows that the grades rise differently in the schools.'))
    ],
    hilfe: ['greenhouse-geisser', 'wechselwirkung'], belege: ['Hilfe:greenhouse-geisser', SOLL]
  },
  {
    id: 'bx-spo-wunsch', thema: T, fall: 'bx-spo',
    stamm: P(`Jugendliche mit Hochschulwunsch haben eine mittlere Endnote von ${SP.d('hochschulwunsch_mittel_ja', 1)}, ohne Hochschulwunsch von ${SP.d('hochschulwunsch_mittel_nein', 1)} (Welch-t = ${SP.d('hochschulwunsch_welch_t', 1)}). Was darf man schließen?`, `Young people with university plans have a mean final grade of ${SP.e('hochschulwunsch_mittel_ja', 1)}, without university plans of ${SP.e('hochschulwunsch_mittel_nein', 1)} (Welch t = ${SP.e('hochschulwunsch_welch_t', 1)}). What may be concluded?`),
    antworten: [
      a(P(`Der Unterschied ist groß, zeigt aber einen Zusammenhang und keine Ursache`, `The difference is large but shows an association and no cause`), P(`Es gibt zwei sehr verschieden große Gruppen (${SP.d('hochschulwunsch_n_ja', 0)} gegen ${SP.d('hochschulwunsch_n_nein', 0)}). Das Welch-Verfahren verkraftet das; die Richtung der Wirkung bleibt offen.`, `There are two groups of very different size (${SP.e('hochschulwunsch_n_ja', 0)} against ${SP.e('hochschulwunsch_n_nein', 0)}). The Welch procedure copes with that; the direction of the effect stays open.`), true),
      a(P('Der Hochschulwunsch hebt die Note sicher um den Unterschied der Mittelwerte', 'The wish for university surely raises the grade by the difference of the means'), P('Eine Ursache zeigt der Mittelwertvergleich nicht. Die Jugendlichen wurden nicht zufällig auf die Gruppen verteilt, sondern haben sich selbst eingeordnet.', 'A mean comparison does not show a cause. The young people were not assigned to the groups at random but placed themselves.')),
      a(P('Das Welch-t zeigt nur, dass die Gruppen verschieden groß sind', 'The Welch t shows only that the groups are of different size'), P('Das t vergleicht die Mittelwerte in Einheiten ihres Standardfehlers. Die verschiedene Größe der Gruppen berücksichtigt das Verfahren, aber es misst sie nicht.', 'The t compares the means in units of their standard error. The procedure takes the different size of the groups into account but does not measure it.')),
      a(P('Der Unterschied ist trotz des großen t unbedeutend, weil eine Gruppe nur wenige Jugendliche hat', 'The difference is unimportant despite the large t because one group has only few young people'), P('Eine kleinere Gruppe macht das Ergebnis unsicherer, aber nicht unbedeutend. Das Intervall des Unterschieds bleibt weit entfernt von 0.', 'A smaller group makes the result less certain, but not unimportant. The interval of the difference remains far away from 0.'))
    ],
    hilfe: ['welch-test', 'zusammenhang-ursache'], belege: ['Hilfe:welch-test', SOLL]
  },

  // ======================================================== 15. Bildung und Ungleichheit (bil)
  {
    id: 'bx-bil-r', thema: T, fall: 'bx-bil',
    stamm: P(`Bei ${BI.d('n_abschluss_gini', 0)} Ländern beträgt die Korrelation von Schulabschluss und Gini-Index r = ${BI.d('r_abschluss_gini', 2)}. Wie ist das zu lesen?`, `For ${BI.e('n_abschluss_gini', 0)} countries the correlation of school completion and the Gini index is r = ${BI.e('r_abschluss_gini', 2)}. How is this to be read?`),
    antworten: [
      a(P(`Mehr Abschlüsse gehen mit niedrigerem Gini einher; eine Ursache folgt daraus nicht`, `More completions go with a lower Gini; a cause does not follow from it`), P('Es ist ein Zusammenhang zwischen Ländern. Reichere Länder haben beides, mehr Abschlüsse und oft weniger Ungleichheit; Wohlstand kann beide Größen zugleich bewirken.', 'It is an association between countries. Richer countries have both, more completions and often less inequality; wealth can bring about both at the same time.'), true),
      a(P(`Mehr Schulbildung senkt den Gini-Index um ${BI.d('r_abschluss_gini', 2)} Punkte je Prozentpunkt mehr Abschlüsse`, `More schooling lowers the Gini index by ${BI.e('r_abschluss_gini', 2)} points per percentage point more completions`), P('r ist keine Steigung. Der Rückgang je Prozentpunkt stammt aus einer Regression und hat eine andere Größe, weil er von den Einheiten beider Größen abhängt.', 'r is no slope. The decline per percentage point comes from a regression and has a different size because it depends on the units of both variables.')),
      a(P(`Bildung erklärt ${BI.d('r_abschluss_gini', 2)} der Unterschiede im Gini-Index`, `Education explains ${BI.e('r_abschluss_gini', 2)} of the differences in the Gini index`), P('Den erklärten Anteil gibt r² an, und der ist deutlich kleiner als r. Zudem ist das Vorzeichen minus kein Teil eines Anteils.', 'The explained share is given by r², and that is clearly smaller than r. In addition the minus sign is no part of a share.')),
      a(P('Der negative Wert zeigt einen Eingabefehler, denn Korrelationen sind positiv', 'The negative value shows an input error, because correlations are positive'), P('Korrelationen liegen zwischen -1 und +1. Das Minus heißt nur: Wo die eine Größe höher ist, ist die andere im Mittel niedriger.', 'Correlations lie between -1 and +1. The minus only means: where one variable is higher, the other is on average lower.'))
    ],
    hilfe: ['korrelation', 'zusammenhang-ursache'], belege: ['Hilfe:korrelation', SOLL]
  },
  {
    id: 'bx-bil-spearman', thema: T, fall: 'bx-bil',
    stamm: P(`Die Pearson-Korrelation beträgt ${BI.d('r_abschluss_gini', 2)}, die Spearman-Korrelation ${BI.d('r_spearman_abschluss_gini', 2)}. Was sagt es, dass beide Werte nah beieinander liegen?`, `The Pearson correlation is ${BI.e('r_abschluss_gini', 2)}, the Spearman correlation ${BI.e('r_spearman_abschluss_gini', 2)}. What does it say that both values are close to each other?`),
    antworten: [
      a(P(`Der Zusammenhang liegt kaum an Ausreißern oder Schiefe`, `The association hardly rests on outliers or skewness`), P('Pearson reagiert auf Ausreißer und Schiefe, Spearman nicht. Ähnliche Werte sprechen dafür, dass der Zusammenhang bei vielen Ländern ähnlich ist.', 'Pearson reacts to outliers and skewness, Spearman does not. Similar values speak for the association being similar across many countries.'), true),
      a(P('Spearman bestätigt, dass Bildung die Ungleichheit verursacht', 'Spearman confirms that education causes the inequality'), P('Auch Spearman beschreibt nur einen Zusammenhang der Ränge. Eine Ursache zeigt keine Korrelation, gleich welcher Art.', 'Spearman too describes only an association of the ranks. No correlation shows a cause, whichever type.')),
      a(P('Der kleine Unterschied der beiden Werte ist selbst ein signifikantes Ergebnis', 'The small difference between the two values is itself a significant result'), P('Die beiden Maße werden nicht gegeneinander getestet. Ein kleiner Abstand zeigt nur, dass die Wahl des Verfahrens am Bild wenig ändert.', 'The two measures are not tested against each other. A small gap only shows that the choice of procedure changes the picture little.')),
      a(P('Die Daten sind normalverteilt, sonst wären die beiden Werte verschieden', 'The data are normally distributed, otherwise the two values would differ'), P('Ähnliche Werte können auch bei schiefen Verteilungen vorkommen. Eine Normalverteilung folgt daraus nicht und wird für r nach Pearson auch nicht gebraucht, um ihn zu berechnen.', 'Similar values can also occur with skewed distributions. A normal distribution does not follow from it and is not needed to compute Pearson\'s r.'))
    ],
    hilfe: ['rangkorrelation', 'pearson-korrelation'], belege: ['Hilfe:rangkorrelation', SOLL]
  },
  {
    id: 'bx-bil-welch', thema: T, fall: 'bx-bil',
    stamm: P(`Die Welch-Varianzanalyse des Gini-Index nach Weltregion ergibt F(${BI.d('welch_df1', 0)}; ${BI.d('welch_df2', 1)}) = ${BI.d('welch_f', 1)}. Warum ist der Freiheitsgrad im Nenner keine ganze Zahl?`, `The Welch analysis of variance of the Gini index by world region gives F(${BI.e('welch_df1', 0)}; ${BI.e('welch_df2', 1)}) = ${BI.e('welch_f', 1)}. Why is the degree of freedom in the denominator fractional?`),
    antworten: [
      a(P(`Er wird aus den ungleichen Streuungen und Gruppengrößen der Regionen geschätzt`, `It is estimated from the unequal spreads and group sizes of the regions`), P('Die gewöhnliche Varianzanalyse nimmt gleiche Varianzen in allen Gruppen an. Sind sie ungleich, gleicht die Welch-Korrektur das aus und gibt dafür gebrochene Freiheitsgrade an.', 'The ordinary analysis of variance assumes equal variances in all groups. If they are unequal, the Welch correction compensates for it and gives fractional degrees of freedom for it.'), true),
      a(P(`Ein Dezimalwert zeigt, dass Werte in den Gruppen fehlen oder ein Rechenfehler vorliegt`, `A decimal value shows that values are missing in the groups or that there is a computing error`), P('Fehlende Werte ändern die Zahl der Fälle in ganzen Zahlen. Gebrochene Freiheitsgrade sind das Merkmal der Welch-Korrektur und kein Fehler.', 'Missing values change the number of cases in whole numbers. Fractional degrees of freedom are the mark of the Welch correction and not an error.')),
      a(P(`Je Region gibt es im Durchschnitt ${BI.d('welch_df2', 1)} Länder, daher der Dezimalwert`, `On average there are ${BI.e('welch_df2', 1)} countries per region, hence the decimal value`), P('Der Freiheitsgrad ist keine Zahl von Ländern. Er ist eine Rechengröße für die Verteilung der Prüfgröße und hängt von der Streuung der Gruppen ab.', 'The degree of freedom is no number of countries. It is a computational quantity for the distribution of the test statistic and depends on the spread of the groups.')),
      a(P('Die Zahl zeigt, wie viele Weltregionen sich vom Rest unterscheiden', 'The number shows how many world regions differ from the rest'), P('Welche Regionen sich unterscheiden, sagt die Varianzanalyse nicht. Das zeigen Paarvergleiche, etwa nach Games-Howell, die bei ungleichen Varianzen passen.', 'The analysis of variance does not say which regions differ. That is shown by pairwise comparisons, for example after Games-Howell, which suit unequal variances.'))
    ],
    hilfe: ['welch-anova', 'welch-test'], belege: ['Hilfe:welch-anova', SOLL]
  },

  // ======================================================== 16. Arbeit und Einkommen (arb)
  {
    id: 'bx-arb-gini', thema: T, fall: 'bx-arb',
    stamm: P(`Der Gini-Koeffizient der Einkommen beträgt ${AR.d('gini_prozent', 1)} Prozent. Wie ist das zu lesen?`, `The Gini coefficient of the incomes is ${AR.e('gini_prozent', 1)} percent. How is this to be read?`),
    antworten: [
      a(P(`Er misst, wie ungleich die Einkommen verteilt sind; über deren Höhe sagt er nichts`, `It measures how unequally the incomes are distributed; it says nothing about their level`), P(`Der Gini beruht auf der Lorenzkurve, dem Vergleich der Verteilung mit völliger Gleichheit. Zwei Länder mit sehr verschiedenen Einkommen können denselben Gini haben.`, `The Gini is based on the Lorenz curve, the comparison of the distribution with complete equality. Two countries with very different incomes can have the same Gini.`), true),
      a(P(`${AR.d('gini_prozent', 1)} Prozent der Personen verdienen weniger als die Armutsschwelle des Landes`, `${AR.e('gini_prozent', 1)} percent of the people earn less than the poverty threshold of the country`), P('Der Gini-Koeffizient zählt keine Personen unter einer Schwelle. Das täte die Armutsquote, die in diesen Daten auch nicht im amtlichen Sinn berechnet wird.', 'The Gini coefficient counts no people below a threshold. The poverty rate would do that, and in these data it is not computed in the official sense either.')),
      a(P(`Die reichsten ${AR.d('gini_prozent', 1)} Prozent der Personen beziehen das Einkommen des Landes ausschließlich`, `The richest ${AR.e('gini_prozent', 1)} percent of the people receive the income of the country exclusively`), P('Der Gini ist keine Grenze, ab der Personen alles erhalten. Es ist eine einzige Zahl für die ganze Verteilung, die von 0 bis 100 Prozent reicht.', 'The Gini is no limit above which people receive everything. It is a single number for the whole distribution, ranging from 0 to 100 percent.')),
      a(P(`Die Einkommen streuen im Mittel um ${AR.d('gini_prozent', 1)} Prozent um den Durchschnitt aller Personen`, `Incomes scatter on average by ${AR.e('gini_prozent', 1)} percent around the average of all people`), P('Das wäre ein Variationskoeffizient, ein anderes Streuungsmaß. Der Gini misst den Abstand zur völligen Gleichheit, nicht die Abweichung vom Mittelwert.', 'That would be a coefficient of variation, a different measure of spread. The Gini measures the distance from complete equality, not the deviation from the mean.'))
    ],
    hilfe: ['gini', 'lorenzkurve'], belege: ['Hilfe:gini', SOLL]
  },
  {
    id: 'bx-arb-s80', thema: T, fall: 'bx-arb',
    stamm: P(`Das Quintilsverhältnis S80/S20 beträgt ${AR.d('s80_s20', 2)}. Was bedeutet es?`, `The quintile share ratio S80/S20 is ${AR.e('s80_s20', 2)}. What does it mean?`),
    antworten: [
      a(P(`Die obersten 20 Prozent beziehen ${AR.d('s80_s20', 2)}-mal so viel Einkommen wie die untersten 20 Prozent`, `The top 20 percent receive ${AR.e('s80_s20', 2)} times as much income as the bottom 20 percent`), P('S80/S20 teilt die Summe der Einkommen im obersten Fünftel durch die Summe im untersten Fünftel. Je größer der Wert, desto ungleicher sind die Einkommen verteilt.', 'S80/S20 divides the sum of the incomes in the top fifth by the sum in the bottom fifth. The larger the value, the more unequally the incomes are distributed.'), true),
      a(P(`Das 80-Prozent-Quantil (${AR.d('q80_gewichtet', 0)} Euro) ist ${AR.d('s80_s20', 2)}-mal so groß wie das 20-Prozent-Quantil (${AR.d('q20_gewichtet', 0)} Euro)`, `The 80 percent quantile (${AR.e('q80_gewichtet', 0)} euro) is ${AR.e('s80_s20', 2)} times as large as the 20 percent quantile (${AR.e('q20_gewichtet', 0)} euro)`), P('Das Verhältnis der beiden Quantile ist ein anderer, kleinerer Wert. S80/S20 vergleicht die Summen der Einkommen der Fünftel, nicht deren Grenzwerte.', 'The ratio of the two quantiles is a different, smaller value. S80/S20 compares the sums of the incomes of the fifths, not their limit values.')),
      a(P(`Die reichsten 20 Prozent erhalten ${AR.d('s80_s20', 2)} Prozent des gesamten Einkommens`, `The richest 20 percent receive ${AR.e('s80_s20', 2)} percent of the total income`), P('Das Verhältnis ist kein Prozentanteil am Gesamteinkommen. Ein Anteil der reichsten 20 Prozent müsste deutlich über 20 Prozent liegen und wäre eine andere Zahl.', 'The ratio is no percentage of the total income. A share of the richest 20 percent would have to be clearly above 20 percent and would be a different number.')),
      a(P(`Jede fünfte Person verdient das ${AR.d('s80_s20', 2)}-Fache des Medians`, `Every fifth person earns ${AR.e('s80_s20', 2)} times the median`), P(`Der Median liegt bei ${AR.d('median_gewichtet', 0)} Euro. Das Quintilsverhältnis vergleicht zwei Gruppen von je einem Fünftel der Personen, nicht eine Gruppe mit dem Median.`, `The median is ${AR.e('median_gewichtet', 0)} euro. The quintile share ratio compares two groups of one fifth of the people each, not one group with the median.`))
    ],
    hilfe: ['gini', 'armutsquote'], belege: ['Hilfe:gini', SOLL]
  },
  {
    id: 'bx-arb-geschlecht', thema: T, fall: 'bx-arb',
    stamm: P(`Der gewichtete Median des Einkommens liegt bei Männern bei ${AR.d('median_gewichtet_maennlich', 0)} Euro, bei Frauen bei ${AR.d('median_gewichtet_weiblich', 0)} Euro. Wie vorsichtig ist das zu deuten?`, `The weighted median income is ${AR.e('median_gewichtet_maennlich', 0)} euro for men and ${AR.e('median_gewichtet_weiblich', 0)} euro for women. How cautiously is this to be interpreted?`),
    antworten: [
      a(P(`Es ist ein Unterschied der Nettoeinkommen Erwerbstätiger, keine Lohnlücke bei gleicher Arbeit`, `It is a difference in net incomes of employed people, no pay gap for equal work`), P(`Der Vergleich zweier Mediane beschreibt die Verteilung. Wie viel davon an Teilzeit, Branche oder Erfahrung liegt, zeigte erst ein Modell mit diesen Angaben.`, `The comparison of two medians describes the distribution. How much of it is due to part-time work, industry or experience would be shown only by a model with these variables.`), true),
      a(P('Frauen werden für gleiche Arbeit schlechter bezahlt, denn der Unterschied der Mediane ist deutlich', 'Women are paid less for equal work because the difference of the medians is clear'), P('Aus einem Unterschied der Mediane lässt sich keine Bezahlung für gleiche Arbeit ableiten. In den Daten steht die Arbeitszeit der Personen nicht.', 'From a difference of medians no pay for equal work can be derived. The working hours of the people are not in the data.')),
      a(P('Mediane brauchen kein Gewicht, die Werte gelten also automatisch für die ganze Bevölkerung', 'Medians need no weight, so the values apply automatically to the whole population'), P('Auch der Median einer Befragung braucht das Gewicht, wenn Gruppen überproportional gezogen wurden. Der gewichtete Median rechnet auf die Bevölkerung hoch.', 'The median of a survey also needs the weight if groups were drawn disproportionately. The weighted median scales up to the population.')),
      a(P('Der Unterschied ist bedeutungslos, solange der Gini-Koeffizient bei beiden Geschlechtern gleich ist', 'The difference is meaningless as long as the Gini coefficient is the same for both sexes'), P(`Der Gini (${AR.d('gini_prozent', 1)} Prozent insgesamt) misst die Ungleichheit innerhalb einer Gruppe. Zwei Gruppen können denselben Gini und sehr verschiedene Mediane haben.`, `The Gini (${AR.e('gini_prozent', 1)} percent overall) measures the inequality within a group. Two groups can have the same Gini and very different medians.`))
    ],
    hilfe: ['median', 'zusammenhang-ursache'], belege: ['Hilfe:median', SOLL]
  },

  // ======================================================== 17. Wörter erkennen (woe)
  {
    id: 'bx-woe-nichtsig', thema: T, fall: 'bx-woe',
    stamm: P(`Der Welch-Test der Reaktionszeiten bei Pflanzen- und Tierwörtern ergibt p ${WO.pd('welch_p')}. Was darf man daraus schließen?`, `The Welch test of the reaction times for plant and animal words gives p ${WO.pe('welch_p')}. What may be concluded from this?`),
    antworten: [
      a(P(`Ein Unterschied ist nicht belegt; das heißt nicht, dass die Mittelwerte gleich sind`, `A difference is not proven; that does not mean that the means are equal`), P(`Das 90-Prozent-Intervall reicht von ${WO.d('ki90_ug', 1)} bis ${WO.d('ki90_og', 1)} Millisekunden: Es schließt 0 ein, aber auch Werte weit von 0.`, `The 90 percent interval runs from ${WO.e('ki90_ug', 1)} to ${WO.e('ki90_og', 1)} milliseconds: it includes 0, but also values far from 0.`), true),
      a(P(`Tier- und Pflanzenwörter werden gleich schnell erkannt, und das p bestätigt diese Gleichheit`, `Animal and plant words are recognised equally fast, and the p confirms this equality`), P(`Ein großes p bestätigt keine Gleichheit. Die Mittelwerte unterscheiden sich in der Stichprobe um ${WO.da('differenz_pflanze_minus_tier', 1)} Millisekunden.`, `A large p confirms no equality. The means differ in the sample by ${WO.ea('differenz_pflanze_minus_tier', 1)} milliseconds.`)),
      a(P(`Mit einer Wahrscheinlichkeit von ${WO.d('welch_p', 2)} sind die Wörter gleich schnell`, `With a probability of ${WO.e('welch_p', 2)} the words are equally fast`), P('Das p ist die Wahrscheinlichkeit der Daten bei angenommener Gleichheit, nicht die Wahrscheinlichkeit der Gleichheit bei diesen Daten. Beides ist verschieden.', 'The p is the probability of the data assuming equality, not the probability of equality given these data. The two are different.')),
      a(P('Der Unterschied ist echt, aber klein, weil kein Test ihn bestätigt', 'The difference is real but small because no test confirms it'), P('Ob ein Unterschied echt ist, lässt sich aus diesen Daten nicht sagen. Wer ihn für echt hält, behauptet mehr, als der Test hergibt.', 'Whether a difference is real cannot be said from these data. Whoever considers it real claims more than the test provides.'))
    ],
    hilfe: ['signifikanz', 'p-wert'], belege: ['Hilfe:signifikanz', SOLL]
  },
  {
    id: 'bx-woe-tost', thema: T, fall: 'bx-woe',
    stamm: P(`Der Äquivalenztest (TOST) mit der Grenze von ${WO.d('tost_grenze_ms', 0)} Millisekunden ergibt p = ${WO.d('tost_p', 3)}; das 90-Prozent-Intervall reicht von ${WO.d('ki90_ug', 1)} bis ${WO.d('ki90_og', 1)} Millisekunden. Was folgt?`, `The equivalence test (TOST) with the limit of ${WO.e('tost_grenze_ms', 0)} milliseconds gives p = ${WO.e('tost_p', 3)}; the 90 percent interval runs from ${WO.e('ki90_ug', 1)} to ${WO.e('ki90_og', 1)} milliseconds. What follows?`),
    antworten: [
      a(P(`Äquivalenz ist nicht belegt: p liegt über 0,05, und das Intervall überschreitet die Grenze`, `Equivalence is not established: p is above 0.05, and the interval crosses the limit`), P(`Der TOST zeigt Äquivalenz nur, wenn das ganze Intervall innerhalb der Grenzen liegt. Die Grenze muss vorher sachlich festgelegt sein.`, `The TOST shows equivalence only if the whole interval lies within the limits. The limit must be fixed beforehand on substantive grounds.`), true),
      a(P(`Äquivalenz ist belegt, weil der Unterschied von ${WO.da('differenz_pflanze_minus_tier', 1)} Millisekunden innerhalb von ±${WO.d('tost_grenze_ms', 0)} liegt`, `Equivalence is established because the difference of ${WO.ea('differenz_pflanze_minus_tier', 1)} milliseconds lies within ±${WO.e('tost_grenze_ms', 0)}`), P('Der Punktschätzer allein genügt nicht. Das ganze Konfidenzintervall muss in den Grenzen liegen; hier ragt es über die untere Grenze hinaus.', 'The point estimate alone is not enough. The whole confidence interval must lie within the limits; here it extends beyond the lower limit.')),
      a(P('Äquivalenz ist belegt, weil der Welch-Test keinen Unterschied zeigt', 'Equivalence is established because the Welch test shows no difference'), P('Kein belegter Unterschied ist kein belegter Nicht-Unterschied. Äquivalenz braucht einen eigenen Test mit festgelegter Grenze, den TOST.', 'No proven difference is no proven absence of difference. Equivalence needs a test of its own with a fixed limit, the TOST.')),
      a(P(`Mit p = ${WO.d('tost_p', 3)} sind die Wörter mit ${WO.d('tost_p', 3)} Wahrscheinlichkeit verschieden schnell`, `With p = ${WO.e('tost_p', 3)} the words are differently fast with a probability of ${WO.e('tost_p', 3)}`), P('Das p des TOST ist keine Wahrscheinlichkeit für einen Unterschied. Es gibt an, wie unerwartet die Daten wären, wenn der wahre Unterschied an der Grenze läge.', 'The p of the TOST is no probability of a difference. It states how unexpected the data would be if the true difference lay at the limit.'))
    ],
    hilfe: ['aequivalenztest-tost', 'konfidenzintervall'], belege: ['Hilfe:aequivalenztest-tost', SOLL]
  },
  {
    id: 'bx-woe-teilp', thema: T, fall: 'bx-woe',
    stamm: P(`Der TOST besteht aus zwei einseitigen Tests: für die untere Grenze p = ${WO.d('tost_p_unten', 3)}, für die obere p = ${WO.d('tost_p_oben', 4)}. Welcher Wert zählt für die Entscheidung?`, `The TOST consists of two one-sided tests: for the lower limit p = ${WO.e('tost_p_unten', 3)}, for the upper limit p = ${WO.e('tost_p_oben', 4)}. Which value counts for the decision?`),
    antworten: [
      a(P(`Der größere der beiden (${WO.d('tost_p_unten', 3)}), denn beide Grenzen müssen eingehalten werden`, `The larger of the two (${WO.e('tost_p_unten', 3)}), because both limits must be kept`), P('Beide Ungleichungen müssen zugleich gelten: Der Unterschied ist größer als die untere und kleiner als die obere Grenze. Die schwächere Hälfte entscheidet.', 'Both inequalities must hold at the same time: the difference is larger than the lower and smaller than the upper limit. The weaker half decides.'), true),
      a(P(`Der kleinere (${WO.d('tost_p_oben', 4)}), weil er die Äquivalenz am stärksten belegt und vorsichtiger ist`, `The smaller one (${WO.e('tost_p_oben', 4)}), because it proves equivalence most strongly and is more careful`), P('Ein einzelner kleiner Wert belegt nur die eine Seite. Wer den kleineren nimmt, übergeht die Seite, die noch offen ist.', 'A single small value proves only one side. Whoever takes the smaller one ignores the side that is still open.')),
      a(P(`Der Mittelwert der beiden p-Werte, weil beide Seiten gleich wichtig sind`, `The mean of the two p values, because both sides are equally important`), P('Die beiden Tests werden nicht gemittelt; sie bilden eine Und-Verbindung. Der Mittelwert würde die Schlussfolgerung verfälschen.', 'The two tests are not averaged; they form an and-connection. The mean would distort the conclusion.')),
      a(P(`Keiner der beiden, denn das p für die Entscheidung entsteht erst aus dem Welch-Test`, `Neither of them, because the p for the decision arises only from the Welch test`), P('Der TOST rechnet seine eigenen p-Werte. Der Welch-Test prüft die Nullhypothese gleicher Mittelwerte, eine andere Frage als die nach Äquivalenz innerhalb einer Grenze.', 'The TOST computes its own p values. The Welch test checks the null hypothesis of equal means, a different question from that of equivalence within a limit.'))
    ],
    hilfe: ['aequivalenztest-tost', 'aequivalenztest'], belege: ['Hilfe:aequivalenztest-tost', SOLL]
  },

  // ======================================================== 18. Anker-Effekt (ank)
  {
    id: 'bx-ank-t', thema: T, fall: 'bx-ank',
    stamm: P(`Der Welch-Test der Schätzungen nach niedrigem und hohem Anker ergibt t = ${AN.d('welch_t', 1)}; Cohens d beträgt ${AN.d('cohens_d', 2)}. Was verrät t über die Größe des Effekts?`, `The Welch test of the estimates after a low and a high anchor gives t = ${AN.e('welch_t', 1)}; Cohen's d is ${AN.e('cohens_d', 2)}. What does t reveal about the size of the effect?`),
    antworten: [
      a(P(`Wenig: t wächst mit der Personenzahl; die Größe zeigen die Mittelwerte und d`, `Little: t grows with the sample size; the size is shown by the means and d`), P(`Bei sehr vielen Personen (${AN.d('n_niedrig', 0)} und ${AN.d('n_hoch', 0)}) wird auch ein kleiner Unterschied sehr deutlich. Hier ist der Effekt auch groß: d = ${AN.d('cohens_d', 2)}.`, `With very many people (${AN.e('n_niedrig', 0)} and ${AN.e('n_hoch', 0)}) even a small difference becomes very clear. Here the effect is also large: d = ${AN.e('cohens_d', 2)}.`), true),
      a(P(`Der Anker verschiebt die Schätzung um ${AN.d('welch_t', 1)} Prozent gegenüber der Kontrollgruppe`, `The anchor shifts the estimate by ${AN.e('welch_t', 1)} percent compared with the control group`), P(`t ist eine Prüfgröße und keine Prozentzahl. Die Verschiebung zeigen die Mittelwerte: ${AN.d('mittel_niedrig', 0)} gegen ${AN.d('mittel_hoch', 0)} Meilen.`, `t is a test statistic and no percentage. The shift is shown by the means: ${AN.e('mittel_niedrig', 0)} against ${AN.e('mittel_hoch', 0)} miles.`)),
      a(P('Alles: Ein so großes t beweist einen großen Effekt, d ist überflüssig', 'Everything: such a large t proves a large effect, d is superfluous'), P('t verbindet Effekt und Fallzahl. Ein gleich großes t kann von einem kleinen Effekt bei sehr großer Stichprobe stammen; erst d trennt beides.', 'T combines effect and sample size. An equally large t can come from a small effect in a very large sample; only d separates the two.')),
      a(P('Ein so hohes t zeigt, dass die Zuteilung der Anker nicht zufällig war', 'Such a high t shows that the assignment of the anchors was not random'), P('Wie die Anker verteilt wurden, steht nicht im t. Weil die Zuteilung im Versuch zufällig war, darf der Unterschied hier als Wirkung des Ankers gelesen werden.', 'How the anchors were assigned is not in the t. Because the assignment in the experiment was random, the difference may be read here as an effect of the anchor.'))
    ],
    hilfe: ['effektstaerke', 'cohens-d'], belege: ['Hilfe:effektstaerke', SOLL]
  },
  {
    id: 'bx-ank-ww', thema: T, fall: 'bx-ank',
    stamm: P(`Die Wechselwirkung Anker mal Land ergibt F(${AN.d('anova_ww_df1', 0)}; ${AN.d('anova_ww_df2', 0)}) = ${AN.d('anova_ww_f', 2)}, p ${AN.pd('anova_ww_p')}. Wie ist das zu lesen?`, `The interaction anchor by country gives F(${AN.e('anova_ww_df1', 0)}; ${AN.e('anova_ww_df2', 0)}) = ${AN.e('anova_ww_f', 2)}, p ${AN.pe('anova_ww_p')}. How is this to be read?`),
    antworten: [
      a(P(`Die Stärke des Anker-Effekts ist nicht in allen Ländern gleich`, `The strength of the anchoring effect is not the same in all countries`), P('Die Wechselwirkung fragt: Hängt der Unterschied zwischen niedrigem und hohem Anker vom Land ab? Einzelne Länder zeigen erst einfache Effekte je Land.', 'The interaction asks: does the difference between the low and the high anchor depend on the country? Single countries are shown only by simple effects per country.'), true),
      a(P(`In einigen Ländern wirkt der Anker gar nicht, in den anderen wirkt er sehr stark`, `In some countries the anchor has no effect at all, in the others it acts very strongly`), P('Eine Wechselwirkung kann entstehen, wenn der Effekt überall in gleicher Richtung, aber verschieden stark wirkt. Dass er irgendwo fehlt, folgt daraus nicht.', 'An interaction can arise if the effect acts in the same direction everywhere but with different strength. That it is absent somewhere does not follow from it.')),
      a(P('Der Anker hat keinen Haupteffekt mehr, sobald die Wechselwirkung deutlich ist', 'The anchor has no main effect any more as soon as the interaction is clear'), P('Haupteffekt und Wechselwirkung sind getrennte Fragen mit eigenen Zeilen in der Tabelle. Bei gleichgerichteten Effekten bleibt der Haupteffekt gut zu deuten.', 'Main effect and interaction are separate questions with rows of their own in the table. With effects in the same direction the main effect remains easy to interpret.')),
      a(P('Die Länder unterscheiden sich in der mittleren Schätzung, unabhängig vom Anker', 'The countries differ in the mean estimate, independent of the anchor'), P('Das wäre der Haupteffekt des Landes. Die Wechselwirkung betrifft den Anker-Effekt selbst und fragt, ob er je nach Land verschieden ausfällt.', 'That would be the main effect of the country. The interaction concerns the anchoring effect itself and asks whether it turns out differently depending on the country.'))
    ],
    hilfe: ['wechselwirkung', 'zweifaktorielle-anova'], belege: ['Hilfe:wechselwirkung', SOLL]
  },
  {
    id: 'bx-ank-bedeutung', thema: T, fall: 'bx-ank',
    stamm: P(`Die Wechselwirkung ist mit p ${AN.pd('anova_ww_p')} deutlich, F beträgt nur ${AN.d('anova_ww_f', 2)}. Ist sie damit auch praktisch bedeutsam?`, `The interaction is clear with p ${AN.pe('anova_ww_p')}, F is only ${AN.e('anova_ww_f', 2)}. Is it therefore also of practical importance?`),
    antworten: [
      a(P(`Offen: Bei so vielen Personen genügt schon ein kleiner Unterschied für ein kleines p`, `Open: with so many people even a small difference is enough for a small p`), P('Ein Effektmaß für die Wechselwirkung (partielles eta²) oder der Vergleich der Anker-Effekte je Land zeigt, ob sich die Unterschiede in der Praxis lohnen.', 'An effect size for the interaction (partial eta²) or the comparison of the anchoring effects per country shows whether the differences matter in practice.'), true),
      a(P('Ja, denn ein p unter 0,05 genügt, um einen Unterschied als bedeutsam einzustufen', 'Yes, because a p below 0.05 is enough to classify a difference as important'), P('Das p sagt nur, dass der Unterschied kaum Zufall ist. Dass er groß wäre, sagt es nicht, vor allem bei sehr großen Stichproben.', 'The p says only that the difference is hardly chance. It does not say that it would be large, especially in very large samples.')),
      a(P(`Ja, denn ${AN.d('anova_ww_p', 3)} bedeutet eine Wahrscheinlichkeit von 99,9 Prozent, dass die Wechselwirkung groß ist`, `Yes, because ${AN.e('anova_ww_p', 3)} means a probability of 99.9 percent that the interaction is large`), P('Das p ist keine Wahrscheinlichkeit für eine Hypothese und sagt nichts über die Größe. Es misst, wie selten solche Daten ohne Wechselwirkung wären.', 'The p is no probability of a hypothesis and says nothing about size. It measures how rare such data would be without an interaction.')),
      a(P('Nein, denn ein F über 1 ist klein und ein F unter 5 ist bedeutungslos', 'No, because an F above 1 is small and an F below 5 is unimportant'), P('Für F gibt es keine feste Größenmarke dieser Art. Wie groß ein F ist, hängt von den Freiheitsgraden ab; die Bedeutung liest man an einem Effektmaß ab.', 'There is no fixed size mark of this kind for F. How large an F is depends on the degrees of freedom; importance is read from an effect size.'))
    ],
    hilfe: ['wechselwirkung', 'effektstaerke'], belege: ['Hilfe:wechselwirkung', SOLL]
  }
];
