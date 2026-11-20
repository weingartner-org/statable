/**
 * „So geht es in Excel, TI-84, SPSS“ in der Hilfe (S-K K7 Schritt 3): zu einem Frage-Artikel wenige allgemeine Zeilen ohne Zahlen,
 * sichtbar nur für die Programme, die in den Einstellungen („Vergleich mit anderen Programmen“) eingeschaltet sind.
 * Die Texte sind dieselben wie in `exceltianleitung.ts` (gleicher Wortlaut = gleiche Übersetzung); mit Zahlen steht es dort unter dem Ergebnis.
 */
import { L } from './sitzung.svelte';
import { xl } from './exceltianleitung';

export interface HilfeBezug { excel: string[]; ti: string[]; spss: string[]; r: string[]; jamovi: string[]; stata: string[] }

/** Zeilen je Programm für den Hilfe-Artikel `id`, oder null, wenn dazu nichts vorliegt. */
export function hilfeBezug(id: string): HilfeBezug | null {
  const b = hilfeBezugText(id);
  const x = ANDERE[id];
  return b && x ? { ...b, ...x } : null;
}

/** R-Befehle und jamovi-Menüs je Artikel: sprachneutral (Code und Eigennamen), darum ohne Übersetzung. */
const ANDERE: Record<string, { r: string[]; jamovi: string[]; stata: string[] }> = {
  'frage-gruppen': { r: ['t.test(y ~ gruppe, data = daten, var.equal = TRUE)  # Student', 't.test(y ~ gruppe, data = daten)  # Welch', 'summary(aov(y ~ gruppe, data = daten)); TukeyHSD(aov(y ~ gruppe, data = daten))'], jamovi: ["Analyses ▸ T-Tests ▸ Independent Samples T-Test (Student's and Welch's)", "Analyses ▸ ANOVA ▸ One-Way ANOVA (Fisher's or Welch's; Post-Hoc: Tukey or Games-Howell)"], stata: ['ttest y, by(gruppe)', 'ttest y, by(gruppe) unequal', 'oneway y gruppe, tabulate'] },
  'frage-praepost': { r: ['t.test(daten$vorher, daten$nachher, paired = TRUE)'], jamovi: ['Analyses ▸ T-Tests ▸ Paired Samples T-Test'], stata: ['ttest vorher == nachher'] },
  'frage-zusammenhang': { r: ['cor.test(daten$x, daten$y)'], jamovi: ['Analyses ▸ Regression ▸ Correlation Matrix (Pearson)'], stata: ['pwcorr x y, sig'] },
  'frage-vorhersage': { r: ['modell <- lm(y ~ x1 + x2, data = daten); summary(modell); confint(modell)'], jamovi: ['Analyses ▸ Regression ▸ Linear Regression'], stata: ['regress y x1 x2'] },
  'frage-verteilung': { r: ['summary(daten$x); sd(daten$x, na.rm = TRUE)'], jamovi: ['Analyses ▸ Exploration ▸ Descriptives'], stata: ['summarize x, detail'] },
  'frage-kreuz': { r: ['chisq.test(table(daten$gruppe, daten$antwort))'], jamovi: ['Analyses ▸ Frequencies ▸ Contingency Tables ▸ Independent Samples (χ²)'], stata: ['tabulate gruppe antwort, chi2 expected'] }
};

function hilfeBezugText(id: string): { excel: string[]; ti: string[]; spss: string[] } | null {
  switch (id) {
    case 'frage-gruppen': return {
      excel: [
        L('Mit Tabelle: Daten ▸ Datenanalyse ▸ „t-Test: Zwei Stichproben unter der Annahme gleicher Varianzen“ (oder „… ungleicher Varianzen“ für Welch).', 'With a table: Data ▸ Data Analysis ▸ "t-Test: Two-Sample Assuming Equal Variances" (or "… Unequal Variances" for Welch).'),
        L('Daten ▸ Datenanalyse ▸ „Anova: Einfaktorielle Varianzanalyse“, Eingabebereich mit den Köpfen, „Beschriftungen in erster Zeile“ ankreuzen. Die Ausgabe zeigt F, den p-Wert („P-Wert“) und F krit.', 'Data ▸ Data Analysis ▸ "Anova: Single Factor", input range with the headers, tick "Labels in first row". The output shows F, the p value ("P-value") and F crit.')
      ],
      ti: [
        L('STAT ▸ TESTS ▸ 4:2-SampTTest …', 'STAT ▸ TESTS ▸ 4:2-SampTTest …'),
        L('μ1: ≠μ2 (zweiseitig); Pooled: Yes für den klassischen Test, Pooled: No für Welch; dann Calculate.', 'μ1: ≠μ2 (two-sided); Pooled: Yes for the classical test, Pooled: No for Welch; then Calculate.'),
        L('Der TI-84 rechnet die klassische Varianzanalyse (gleiche Streuung); er zeigt F, p, die Freiheitsgrade und die Quadratsummen.', 'The TI-84 calculates the classical analysis of variance (equal spread); it shows F, p, the degrees of freedom and the sums of squares.')
      ],
      spss: [
        L('Analysieren ▸ Mittelwerte vergleichen ▸ T-Test bei unabhängigen Stichproben …; Gruppenvariable wählen und „Gruppen definieren“.', 'Analyze ▸ Compare Means ▸ Independent-Samples T Test …; choose the grouping variable and "Define Groups".'),
        L('Analysieren ▸ Mittelwerte vergleichen ▸ Einfaktorielle ANOVA …; unter „Optionen“ Welch ankreuzen, unter „Post hoc“ Tukey oder Games-Howell.', 'Analyze ▸ Compare Means ▸ One-Way ANOVA …; under "Options" tick Welch, under "Post Hoc" Tukey or Games-Howell.')
      ]
    };
    case 'frage-praepost': return {
      excel: [L('Mit Tabelle: Daten ▸ Datenanalyse ▸ „t-Test bei gepaarten Stichproben“ (t-Test: Paired Two Sample for Means).', 'With a table: Data ▸ Data Analysis ▸ "t-Test: Paired Two Sample for Means".')],
      ti: [L('Vorher in L1, nachher in L2; die Unterschiede als L3 = L1 − L2 (Kopf von L3 anwählen und L1 − L2 eingeben).', 'Before in L1, after in L2; the differences as L3 = L1 − L2 (select the header of L3 and enter L1 − L2).')],
      spss: [L('Analysieren ▸ Mittelwerte vergleichen ▸ T-Test bei gepaarten Stichproben …', 'Analyze ▸ Compare Means ▸ Paired-Samples T Test …')]
    };
    case 'frage-zusammenhang': return {
      excel: [
        L('Beide Zahlen stehen in zwei Spalten, jede Zeile ist eine Person (Bereiche A und B).', 'Both numbers are in two columns, every row is one person (ranges A and B).'),
        L(`r: ${xl('CORREL', 'KORREL', 'A', 'B')}, r²: ${xl('RSQ', 'BESTIMMTHEITSMASS', 'A', 'B')}`, `r: ${xl('CORREL', 'KORREL', 'A', 'B')}, r²: ${xl('RSQ', 'BESTIMMTHEITSMASS', 'A', 'B')}`)
      ],
      ti: [
        L('Die erste Zahl in L1, die zweite in L2. Einmalig 2nd ▸ CATALOG ▸ DiagnosticOn ▸ ENTER, damit r angezeigt wird.', 'The first number in L1, the second in L2. Once: 2nd ▸ CATALOG ▸ DiagnosticOn ▸ ENTER so that r is shown.'),
        L('STAT ▸ TESTS ▸ F:LinRegTTest (TI-83 Plus: E:LinRegTTest) …, Xlist: L1, Ylist: L2, Freq: 1, β & ρ: ≠0, Calculate.', 'STAT ▸ TESTS ▸ F:LinRegTTest (TI-83 Plus: E:LinRegTTest) …, Xlist: L1, Ylist: L2, Freq: 1, β & ρ: ≠0, Calculate.')
      ],
      spss: [L('Analysieren ▸ Korrelation ▸ Bivariat …; Pearson ankreuzen.', 'Analyze ▸ Correlate ▸ Bivariate …; tick Pearson.')]
    };
    case 'frage-vorhersage': return {
      excel: [
        L('Daten ▸ Datenanalyse ▸ „Regression“: Y-Eingabebereich = Ergebnis, X-Eingabebereich = alle Vorhersagegrößen, „Beschriftungen“ ankreuzen. Die Ausgabe zeigt R², F, p und je Vorhersagegröße B, Standardfehler, t, p und Intervall.', 'Data ▸ Data Analysis ▸ "Regression": Input Y range = outcome, Input X range = all predictors, tick "Labels". The output shows R², F, p and for each predictor B, standard error, t, p and interval.')
      ],
      ti: [
        L('STAT ▸ CALC ▸ 8:LinReg(a+bx) mit Xlist: L1, Ylist: L2, dann Calculate: zeigt a (Achsenabschnitt), b (Steigung), r², r. Mit STAT ▸ TESTS ▸ F:LinRegTTest (TI-83 Plus: E:LinRegTTest) kommen t und p dazu.', 'STAT ▸ CALC ▸ 8:LinReg(a+bx) with Xlist: L1, Ylist: L2, then Calculate: shows a (intercept), b (slope), r², r. With STAT ▸ TESTS ▸ F:LinRegTTest (TI-83 Plus: E:LinRegTTest) t and p are added.'),
        L('Der TI-84 rechnet in den Standardmenüs nur die Regression mit einer Vorhersagegröße (STAT ▸ CALC ▸ 8:LinReg(a+bx)). Für mehrere Vorhersagegrößen braucht es Excel oder ein anderes Programm.', 'The TI-84 only calculates regression with one predictor in its standard menus (STAT ▸ CALC ▸ 8:LinReg(a+bx)). For several predictors you need Excel or another program.')
      ],
      spss: [L('Analysieren ▸ Regression ▸ Linear …', 'Analyze ▸ Regression ▸ Linear …')]
    };
    case 'frage-verteilung': return {
      excel: [L('Alles auf einmal: Daten ▸ Datenanalyse ▸ „Beschreibende Statistik“ mit „Zusammenfassung der Statistiken“.', 'All at once: Data ▸ Data Analysis ▸ "Descriptive Statistics" with "Summary statistics".')],
      ti: [
        L('Die Werte in L1 eingeben (STAT ▸ 1:Edit).', 'Enter the values into L1 (STAT ▸ 1:Edit).'),
        L('STAT ▸ CALC ▸ 1:1-Var Stats, List: L1, Calculate: zeigt x̄, Sx (Stichprobe), σx (Gesamtheit), n, minX, Q1, Med, Q3, maxX.', 'STAT ▸ CALC ▸ 1:1-Var Stats, List: L1, Calculate: shows x̄, Sx (sample), σx (population), n, minX, Q1, Med, Q3, maxX.')
      ],
      spss: [L('Analysieren ▸ Deskriptive Statistiken ▸ Häufigkeiten … (mit Median und Quartilen) oder ▸ Deskriptive Statistik …', 'Analyze ▸ Descriptive Statistics ▸ Frequencies … (with median and quartiles) or ▸ Descriptives …')]
    };
    case 'frage-kreuz': return {
      excel: [
        L('Erwartete Anzahl je Zelle: Zeilensumme × Spaltensumme / Gesamtsumme, in eine zweite Tabelle derselben Form.', 'Expected count per cell: row total × column total / grand total, in a second table of the same shape.'),
        L(`p-Wert: ${xl('CHISQ.TEST', 'CHIQU.TEST', 'Beobachtet', 'Erwartet')}; χ² selbst: ${xl('CHISQ.INV.RT', 'CHIQU.INV.RE', 'p', 'df')}`, `p value: ${xl('CHISQ.TEST', 'CHIQU.TEST', 'Observed', 'Expected')}; χ² itself: ${xl('CHISQ.INV.RT', 'CHIQU.INV.RE', 'p', 'df')}`)
      ],
      ti: [L('STAT ▸ TESTS ▸ C:χ²-Test …, Observed: [A], Expected: [B], Calculate. Die erwarteten Anzahlen legt das Gerät selbst in [B] ab.', 'STAT ▸ TESTS ▸ C:χ²-Test …, Observed: [A], Expected: [B], Calculate. The device puts the expected counts into [B] itself.')],
      spss: [L('Analysieren ▸ Deskriptive Statistiken ▸ Kreuztabellen …; unter „Statistiken“ Chi-Quadrat ankreuzen.', 'Analyze ▸ Descriptive Statistics ▸ Crosstabs …; under "Statistics" tick Chi-square.')]
    };
    default: return null;
  }
}
