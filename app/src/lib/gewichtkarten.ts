/**
 * Welche Stellen der Tabelle in lib/gewichte.ts eine Frage berührt (Fachblatt S-A, 1.5): aus Karte und Optionen die Liste `karte:teil`.
 * Reine Logik ohne Oberfläche; die Prüfliste des Blatts macht daraus Sperren (mit Satz) und Hinweise.
 * Bei Umfragegewichten rechnet Statable nur beschreibend: dann zählen von den vier Karten mit Kennzahlen (Verteilung, Kreuztabelle, Gruppenvergleich, Zusammenhang)
 * nur die beschreibenden Teile - der Test bleibt weg (die Karte zeigt ihn mit einem Umfragegewicht nicht).
 */
import { L } from './sitzung.svelte';
import { gewichtStatus, type GewichtArt, type GewichtStatus } from './gewichte';

export interface KartenWahl {
  verfahren: string;
  art: GewichtArt;
  /** Später S-D2: Umfragegewicht mit der Antwort „Personen einzeln gezogen: Ja“ (`Gewicht.klumpenfrei`) - nur dann kann eine Stelle den Status `design` haben (Tabelle in lib/gewichte.ts, dritter Eintrag)
   *  und nur dann nennen die Karten Verteilung, Kreuztabelle, Gruppenvergleich und Regression ihre zusätzlichen Stellen. Bei Häufigkeitsgewicht ohne Wirkung. */ klumpenfrei?: boolean;
  /** ein Mehrfachantworten-Set unter den gewählten Spalten */ set?: boolean;
  /** Gruppenvergleich mit zweiter Gruppierung (zweifaktorielle Varianzanalyse) oder Kontrollvariable (Kovarianzanalyse) */ gruppen2?: boolean;
  /** Regression: Ziel mit zwei Werten (logistisch) */ logistik?: boolean;
  /** Regression: ordinales, multinomiales oder Zähldaten-Modell (R) */ katModell?: boolean;
  /** Zusammenhang: Spearman, Kendall oder Partialkorrelation statt Pearson */ rangKorr?: boolean;
  /** Prä-Post oder Messwiederholung mit zwei bzw. mehr Ja/Nein-Spalten (McNemar, Cochran-Q) */ jaNein?: boolean;
  /** Übereinstimmung: ICC oder Krippendorffs Alpha statt Cohens Kappa */ iccInter?: boolean;
  /** Später S-F (M6): „Methodenvergleich“ (Passing-Bablok, Deming) ist angeschaltet - eigene Stelle `uebereinstimmung:methodenvergleich` statt Kappa oder ICC, bei beiden Gewichtsarten gesperrt */ methodenvergleich?: boolean;
  /** Äquivalenztest oder Reliable Change Index angeschaltet */ aequi?: boolean;
  /** Kreuztabelle: „Stärke des Zusammenhangs“ (Gamma, Tau, Somers d, Lambda, UC; Später S-B) angeschaltet */ masse?: boolean;
  /** Kreuztabelle: Aufteilung nach einer Schichtvariable (Mantel-Haenszel; Später S-B) gewählt */ schicht?: boolean;
  /** Welle S-D, M7: „Referenzbereich bestimmen“ ist angeschaltet (Karte Verteilung) - gesperrt mit einem Fallgewicht */ referenz?: boolean;
  /** Welle S-D, T2: „Ausreißer prüfen“ ist angeschaltet (Karte Verteilung) - nur der Hinweis „Das Fallgewicht wird hier nicht verwendet.“ */ ausreisser?: boolean;
  /** Welle S-B: „Ohne Normalverteilung - mit Zufallsverfahren“ angeschaltet (Permutationstest, Bootstrap) */ zufall?: boolean;
  /** Später S-D: bedingte oder serielle Mediation (PROCESS 6, 7, 14) statt der einfachen Mediation */ bedingt?: boolean;
  /** Später S-D2: „Test gegen einen Wert“ auf der Karte Verteilung angeschaltet (erzeugt die bis S-D2 verwaiste Stelle `verteilung:mittel-ki-test`; bei beiden Arten) */ mittelTest?: boolean;
  /** Später S-D2: Regression mit mehreren Blöcken (hierarchische Regression): eigene Stelle `vorhersage:linear-block`, bleibt mit Umfragegewicht gesperrt */ bloecke?: boolean;
  /** Welle S-E, Q1: Regression als Quantilregression (R, quantreg) - eigene Stelle `vorhersage:quantil`, bei beiden Gewichtsarten gesperrt */ quantil?: boolean;
  /** Kurs-Paket: Regression mit Ja/Nein-Ziel als Probit (R, glm) - eigene Stelle `vorhersage:probit`, bei beiden Gewichtsarten gesperrt */ probit?: boolean;
  /** Kurs-Paket: lineare Regression mit Präzisionsgewichten (R, lm) - eigene Stelle `vorhersage:wls`, bei beiden Gewichtsarten gesperrt */ wls?: boolean;
  /** Abschnitt 5: nichtlineare Regression mit fester Formel (R, nls) - eigene Stelle `vorhersage:nls`, bei beiden Gewichtsarten gesperrt */ nls?: boolean;
  /** Welle S-E, Q2: Regression als Ridge, Lasso oder Elastic Net (R, glmnet) - eigene Stelle `vorhersage:penalisiert`, bei beiden Gewichtsarten gesperrt */ penalisiert?: boolean;
  /** Später S-F (A): Kaplan-Meier mit „Sterbetafel“ unter „Weitere Wege“ - eigene Stelle `kaplanmeier:sterbetafel`, bei beiden Gewichtsarten gesperrt */ sterbetafel?: boolean;
  /** Später S-F (A): Cox-Regression mit zeitabhängiger Größe (Tabelle in Intervall-Form) - eigene Stelle `kaplanmeier:cox-zeitabh`, bei beiden Gewichtsarten gesperrt */ coxZeit?: boolean;
  /** Später S-F2 (C, D): Kaplan-Meier-Karte mit AFT-Modell (Zeitverhältnis, survreg) - eigene Stelle `kaplanmeier:aft`, gesperrt */ aft?: boolean;
  /** Später S-F2 (D): Kaplan-Meier-Karte mit Kennung (cluster() oder Frailty) - eigene Stelle `kaplanmeier:frailty`, gesperrt */ frailty?: boolean;
  /** Später S-F2 (C): Zeitreihen-Karte mit zweiter Reihe (Kreuzkorrelation) - eigene Stelle `zeitreihen:kreuz` statt `zeitreihen:alle`, gesperrt */ kreuz?: boolean;
  /** Welle S-B: einer der weiteren Rangtests (Vorzeichen, Median, Jonckheere-Terpstra, Kolmogorov-Smirnov) ist gewählt oder soll geprüft werden */ rangWeitere?: boolean;
}
export interface Stelle { id: string; titel: string; status: GewichtStatus }

/** Wie die Stelle im Satz „‹Titel› kann mit Fallgewichten noch nicht rechnen …“ heißt. */
export function stellenTitel(id: string): string {
  switch (id) {
    case 'diagramm:histogramm': return L('Das Histogramm', 'The histogram');
    case 'diagramm:box': return L('Das Diagramm der einzelnen Werte', 'The chart of the individual values');
    case 'diagramm:streu': return L('Das Streudiagramm', 'The scatter plot');
    case 'diagramm:verlauf': return L('Das Verlaufsdiagramm', 'The line chart');
    case 'verteilung:normalitaet': return L('Die Prüfung auf Normalverteilung', 'The test for normality');
    case 'verteilung:kennwerte': return L('Die Verteilung', 'The distribution');
    case 'verteilung:anteil-ki': return L('Die Anteile mit Konfidenzintervall', 'The proportions with confidence interval');
    case 'verteilung:mittel-ki-test': return L('Der Test des Mittelwerts gegen einen Wert', 'The test of the mean against a value');
    case 'referenz:alle': return L('Der Referenzbereich', 'The reference range');
    case 'ausreisser:alle': return L('Der Ausreißertest', 'The outlier test');
    case 'kreuz:test': return L('Der Test der Kreuztabelle', 'The test of the crosstab');
    case 'gruppen:test': return L('Der Gruppenvergleich', 'The group comparison');
    case 'gruppen:rang': return L('Der Rangtest', 'The rank test');
    case 'gruppen:rang-weitere': return L('Der Rangtest', 'The rank test');
    case 'praepost:vorzeichen': return L('Der Vorzeichentest', 'The sign test');
    case 'gruppen:zufall': case 'zusammenhang:zufall': case 'vorhersage:zufall': case 'verteilung:zufall': return L('Das Zufallsverfahren (Permutationstest, Bootstrap)', 'The random procedure (permutation test, bootstrap)');
    case 'gruppen:aequivalenz': return L('Der Äquivalenztest', 'The equivalence test');
    case 'praepost:gepaart': return L('Der Vorher-Nachher-Vergleich', 'The before-after comparison');
    case 'praepost:wilcoxon': return L('Der Wilcoxon-Test', 'The Wilcoxon test');
    case 'praepost:aequivalenz-rci': return L('Der Äquivalenztest und der Reliable Change Index', 'The equivalence test and the reliable change index');
    case 'messwiederholung:alle': return L('Die Auswertung mit Messwiederholung', 'The repeated-measures analysis');
    case 'zusammenhang:pearson': return L('Die Korrelation', 'The correlation');
    case 'zusammenhang:rang': return L('Die Rangkorrelation (Spearman, Kendall) und die Partialkorrelation', 'The rank correlation (Spearman, Kendall) and the partial correlation');
    case 'korrmatrix:alle': return L('Die Korrelationsmatrix', 'The correlation matrix');
    case 'vorhersage:linear': case 'vorhersage:linear-block': return L('Die Regression', 'The regression');
    case 'vorhersage:logistik': return L('Die logistische Regression', 'The logistic regression');
    case 'vorhersage:logistik-roc': return L('Die logistische Regression', 'The logistic regression');
    case 'vorhersage:quantil': return L('Die Quantilregression', 'The quantile regression');
    case 'vorhersage:probit': return L('Die Probit-Regression', 'The probit regression');
    case 'vorhersage:nls': return L('Die nichtlineare Regression', 'The nonlinear regression');
    case 'vorhersage:wls': return L('Die gewichtete Regression mit Präzisionsgewichten', 'The weighted regression with precision weights');
    case 'vorhersage:penalisiert': return L('Die Strafregression (Ridge, Lasso, Elastic Net)', 'The penalized regression (ridge, lasso, elastic net)');
    case 'vorhersage:ordinal-multinomial-zaehl': return L('Dieses Regressionsmodell (ordinal, multinomial, Zähldaten)', 'This regression model (ordinal, multinomial, count data)');
    case 'mediation:bootstrap': return L('Die Mediation (mit Bootstrap)', 'The mediation (with bootstrap)');
    case 'mediation:bedingt': return L('Die bedingte oder serielle Mediation (mit Bootstrap)', 'The conditional or serial mediation (with bootstrap)');
    case 'moderation:alle': return L('Die Moderation', 'The moderation');
    case 'skala:alpha': return L('Cronbachs Alpha', "Cronbach's alpha");
    case 'faktor:komponenten': return L('Die Faktorenanalyse', 'The factor analysis');
    case 'uebereinstimmung:kappa': return L('Cohens Kappa', "Cohen's kappa");
    case 'uebereinstimmung:icc-krippendorff': return L('Die Übereinstimmung (ICC, Krippendorffs Alpha)', "The agreement (ICC, Krippendorff's alpha)");
    case 'uebereinstimmung:methodenvergleich': return L('Der Methodenvergleich (Passing-Bablok, Deming)', 'The method comparison (Passing-Bablok, Deming)');
    case 'mehrebenen:alle': return L('Das Mehrebenenmodell', 'The multilevel model');
    case 'kaplanmeier:alle': return L('Die Überlebenszeitanalyse', 'The survival analysis');
    case 'kaplanmeier:sterbetafel': return L('Die Sterbetafel', 'The life table');
    case 'kaplanmeier:aft': return L('Das AFT-Modell (Zeitverhältnis)', 'The AFT model (time ratio)');
    case 'kaplanmeier:frailty': return L('Die Cox-Regression mit Kennung (Cluster oder Frailty)', 'The Cox regression with an identifier (cluster or frailty)');
    case 'zeitreihen:kreuz': return L('Die Kreuzkorrelation', 'The cross-correlation');
    case 'diagramm:mittelgruppen': return L('Das Bild der Mittelwerte nach Gruppe', 'The chart of means by group');
    case 'kaplanmeier:cox-zeitabh': return L('Die Cox-Regression mit zeitabhängiger Größe', 'The Cox regression with a time-dependent covariate');
    case 'zeitreihen:alle': return L('Die Zeitreihe', 'The time series');
    case 'cluster:alle': return L('Die Clusteranalyse', 'The cluster analysis');
    case 'diskriminanz:alle': return L('Die Diskriminanzanalyse', 'The discriminant analysis');
    case 'loglinear:alle': return L('Das loglineare Modell', 'The log-linear model');
    case 'manova:alle': return L('Die MANOVA', 'The MANOVA');
    case 'armut:alle': return L('Die Auswertung von Armut und Ungleichheit', 'The analysis of poverty and inequality');
    case 'mehrfach:alle': return L('Die Auswertung von Mehrfachantworten', 'The analysis of multiple responses');
    case 'kreuz:haeufigkeit-prozent': return L('Die Kreuztabelle', 'The crosstab');
    case 'kreuz:masse': return L('Die Stärke des Zusammenhangs', 'The strength of the association');
    case 'kreuz:schicht': return L('Der Mantel-Haenszel-Test', 'The Mantel-Haenszel test');
    case 'gruppen:mittelwerte': return L('Der Vergleich der Gruppenmittelwerte', 'The comparison of the group means');
    default: return L('Dieses Verfahren', 'This method');
  }
}

/** Die Stellen, die diese Frage berührt. Eine Stelle mit dem Status „sperren“ sperrt das Blatt, eine mit „hinweis“ zeigt den Satz „Das Fallgewicht wird hier nicht verwendet.“ */
export function gewichtStellenIds(k: KartenWahl): string[] {
  const u = k.art === 'umfrage';
  const ja = u && k.klumpenfrei === true;   // Später S-D2: Umfragegewicht mit „Personen einzeln gezogen: Ja“ - die Karten nennen dann zusätzliche Stellen (Tabelle: dritter Eintrag)
  switch (k.verfahren) {
    case 'verteilung': return ['verteilung:kennwerte', ...(ja ? ['verteilung:anteil-ki'] : []), 'verteilung:vielfalt', ...(k.mittelTest ? ['verteilung:mittel-ki-test'] : []), ...(k.set ? ['mehrfach:alle'] : []), ...(k.zufall ? ['verteilung:zufall'] : []), ...(k.referenz ? ['referenz:alle'] : []), ...(k.ausreisser ? ['ausreisser:alle'] : [])];
    case 'kreuz': return k.set ? ['mehrfach:alle'] : [...(u && !ja ? ['kreuz:haeufigkeit-prozent'] : ['kreuz:haeufigkeit-prozent', 'kreuz:test']), ...(k.masse ? ['kreuz:masse'] : []), ...(k.schicht ? ['kreuz:schicht'] : [])];
    case 'gruppen': return k.gruppen2 ? ['vorhersage:linear-block'] : u && !ja ? ['gruppen:mittelwerte', ...(k.zufall ? ['gruppen:zufall'] : [])] : ['gruppen:mittelwerte', 'gruppen:test', ...(k.aequi ? ['gruppen:aequivalenz'] : []), ...(k.rangWeitere ? ['gruppen:rang-weitere'] : []), ...(k.zufall ? ['gruppen:zufall'] : [])];
    case 'praepost': return k.jaNein ? ['messwiederholung:alle'] : ['praepost:gepaart', ...(k.rangWeitere ? ['praepost:vorzeichen'] : []), ...(k.aequi ? ['praepost:aequivalenz-rci'] : [])];
    case 'messwiederholung': return ['messwiederholung:alle'];
    case 'zusammenhang': return k.rangKorr ? ['zusammenhang:rang'] : ['zusammenhang:pearson', ...(k.zufall ? ['zusammenhang:zufall'] : [])];
    case 'korrmatrix': return ['korrmatrix:alle'];
    case 'vorhersage': return k.probit ? ['vorhersage:probit'] : k.wls ? ['vorhersage:wls'] : k.nls ? ['vorhersage:nls'] : k.quantil ? ['vorhersage:quantil'] : k.penalisiert ? ['vorhersage:penalisiert'] : [k.katModell ? 'vorhersage:ordinal-multinomial-zaehl' : k.bloecke ? 'vorhersage:linear-block' : k.logistik ? (ja ? 'vorhersage:logistik' : 'vorhersage:logistik-roc') : 'vorhersage:linear', ...(k.zufall ? ['vorhersage:zufall'] : [])];
    case 'mediation': return ['mediation:pfade', 'mediation:bootstrap', ...(k.bedingt ? ['mediation:bedingt'] : [])];
    case 'moderation': return ['moderation:alle'];
    case 'skala': return ['skala:alpha'];
    case 'faktor': return ['faktor:komponenten'];
    case 'uebereinstimmung': return [k.methodenvergleich ? 'uebereinstimmung:methodenvergleich' : k.iccInter ? 'uebereinstimmung:icc-krippendorff' : 'uebereinstimmung:kappa'];
    case 'mehrebenen': return ['mehrebenen:alle'];
    case 'meta': return ['meta:alle'];
    case 'kaplanmeier': return k.sterbetafel || k.coxZeit || k.aft || k.frailty ? [...(k.sterbetafel ? ['kaplanmeier:sterbetafel'] : []), ...(k.coxZeit ? ['kaplanmeier:cox-zeitabh'] : []), ...(k.aft ? ['kaplanmeier:aft'] : []), ...(k.frailty ? ['kaplanmeier:frailty'] : [])] : ['kaplanmeier:alle'];
    case 'zeitreihen': return [k.kreuz ? 'zeitreihen:kreuz' : 'zeitreihen:alle'];
    case 'cluster': return ['cluster:alle'];
    case 'diskriminanz': return ['diskriminanz:alle'];
    case 'loglinear': return ['loglinear:alle'];
    case 'manova': return ['manova:alle'];
    case 'armut': return ['armut:alle'];
    case 'einzelfall': return ['einzelfall:alle'];
    case 'faelle': return ['faelle:alle'];
    case 'kategorien': return ['kategorien:alle'];
    default: return [];
  }
}
/** Verwendet die Karte das Fallgewicht wirklich (rechnet, beschreibt oder ist gesperrt)? Nein bei Meta-Analyse, Einzelfall, Fälle vergleichen und Offene Antworten: dort steht nur der Hinweis, nie „gewichtet mit …“. */
/** Stellen, die bei Umfragegewicht mit „Ja“ nicht gerechnet werden, das Blatt aber NICHT sperren: ROC und AUC der logistischen Regression entfallen mit einem Satz (survey rechnet sie nicht). */
export function umfrageEntfaellt(k: KartenWahl): string[] {
  return k.art === 'umfrage' && k.klumpenfrei === true && k.verfahren === 'vorhersage' && k.logistik && !k.katModell && !k.bloecke ? ['vorhersage:logistik-roc'] : [];
}
/** Womit die Standardfehler einer Umfrage-Karte kommen: `survey` (mit „Ja“ und mindestens einer Stelle `design`), `beschreibend` (Umfragegewicht, mindestens eine beschreibende Stelle), sonst `null` (Häufigkeitsgewicht, Karte ohne Gewicht). */
export function umfrageRechenweg(k: KartenWahl): 'survey' | 'beschreibend' | null {
  if (k.art !== 'umfrage') return null;
  const st = gewichtStellen(k).map(x => x.status);
  if (st.includes('design')) return 'survey';
  return st.includes('beschreibend') ? 'beschreibend' : null;
}
/** Welche Karten die designbasierte Rechnung schon wirklich anstoßen (Später S-D2). Die Bauer der Karten setzen ihre Zeile auf `true`, sobald die Karte die R-Funktion ruft und das Ergebnis zeigt -
 *  bis dahin gibt die Oberfläche das „Ja“ nicht an die Stellen weiter, damit nirgends „designbasiert“ steht, wo nur beschrieben wird. Jede Karte hat ihre eigene Zeile (keine Merge-Konflikte). */
export const DESIGN_ANGEBUNDEN: Record<string, boolean> = {
  verteilung: true,    // A2: Mittelwert und Anteil mit Intervall (angebunden, lib/umfragerechnen.ts)
  kreuz: true,         // A2: Rao-Scott (angebunden)
  gruppen: true,       // B: t-Test, Wald-F, Gruppenmittel
  vorhersage: true     // B: lineare und logistische Regression
};
/** Der Wert für `KartenWahl.klumpenfrei`, den die Oberfläche übergibt: das „Ja“ des Gewichts, aber nur für Karten, die designbasiert rechnen (`DESIGN_ANGEBUNDEN`). */
export const klumpenfreiFuer = (verfahren: string, g?: { art: GewichtArt; klumpenfrei?: boolean } | null): boolean | undefined =>
  g?.art === 'umfrage' && g.klumpenfrei === true && DESIGN_ANGEBUNDEN[verfahren] === true ? true : undefined;
export const verwendetGewicht = (verfahren: string, art: GewichtArt, klumpenfrei?: boolean): boolean => !gewichtStellenIds({ verfahren, art, klumpenfrei }).every(i => gewichtStatus(i, art, klumpenfrei) === 'hinweis');
export function gewichtStellen(k: KartenWahl): Stelle[] {
  return gewichtStellenIds(k).map(id => ({ id, titel: stellenTitel(id), status: gewichtStatus(id, k.art, k.klumpenfrei) }));
}

/** Die Karten, bei denen ein Umfragegewicht nur beschreibende Zahlen ergibt (Ergebnis `gewichtet`, lib/gewichtbeschreibend.ts). */
export const BESCHREIBEND = ['verteilung', 'kreuz', 'gruppen', 'zusammenhang'] as const;
