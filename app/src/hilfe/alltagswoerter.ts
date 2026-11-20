/**
 * Alltagswörter und Fragen zu den Hilfe-Artikeln (Suche ohne Fachbegriff, 30.10.2026).
 * Je Artikel-id: der Fachbegriff, der unter dem Treffer steht, und die Wörter, die Menschen stattdessen sagen.
 * Nur Wörter zählen, die Reihenfolge nicht; Umlaute und Groß/klein sind egal. Gewicht in `suche.ts`: zwischen Titel und Stichwort.
 * Texte der Hilfe-Artikel bleiben unberührt. Übersetzungen in die übrigen Sprachen folgen später (bis dahin sucht Deutsch/Englisch so).
 */
import { P, type Paar } from '../i18n/laufzeit';

/** `mehr`: später ergänzte Wörter als eigener Satz, damit die übersetzten `woerter` unverändert bleiben (sonst verwaisen ihre Übersetzungen). */
export interface Alltag { id: string; fach: Paar; woerter: Paar; mehr?: Paar }
const e = (id: string, fach: Paar, woerter: Paar, mehr?: Paar): Alltag => ({ id, fach, woerter, mehr });

/** Füllwörter, die bei ganzen Fragen nichts zur Suche beitragen (nur Deutsch und Englisch; geglättet geschrieben: ä=a, ü=u, ß=ss). */
export const FUELLWOERTER: Record<'de' | 'en', Set<string>> = {
  de: new Set('wie ist sind das die der den dem des ein eine einen einer einem ich meine meinen meiner meines mein meinem mir mich und oder es zu zum zur von vom mit bei auf im in an am aus fur kann konnen man was wo wann gibt hat haben habe wird werden soll muss ob dass da so auch noch nur doch bitte spss amos'.split(' ')),
  en: new Set('how is are the a an of to do does did i my me we our you your and or it its in on at for with there this that what which be can should must if so also just please spss amos'.split(' '))
};

export const ALLTAG: Alltag[] = [
  e('frage-zusammenhang', P('Korrelation', 'Correlation'),
    P('zusammenhang zusammen hängt hängen abhängig abhängen stark schwach beziehung verbunden verbindung dinge zahlen variablen gleichzeitig steigt steigen je desto mehr weniger gehören', 'related relationship relate connected association link linked strong weak things variables together move rise fall more less go'))
  ,e('korrelation', P('Korrelation', 'Correlation'),
    P('zusammenhang zusammen hängen stark schwach beziehung verbunden zwei dinge', 'relationship related strong weak connected two things'))
  ,e('frage-korrmatrix', P('Korrelationsmatrix', 'Correlation matrix'),
    P('viele zahlen alle paare tabelle zusammenhänge mehrere variablen übersicht jede mit jeder', 'many numbers all pairs table several variables overview each with each'))
  ,e('rangkorrelation', P('Rangkorrelation', 'Rank correlation'),
    P('rangfolge reihenfolge ordnung platzierung zusammenhang noten ränge', 'ranking order rank grades relationship'))
  ,e('frage-partialkorrelation', P('Partialkorrelation', 'Partial correlation'),
    P('dritte herausrechnen kontrollieren konstant halten ohne einfluss störfaktor dritter zahl', 'third remove control hold constant without influence confounder'))
  ,e('mantel-haenszel', P('Mantel-Haenszel', 'Mantel-Haenszel'),
    P('dritte größe festhalten schichten störfaktor kontrollieren zusammenhang bleibt', 'third factor hold strata confounder control relationship remains'))
  ,e('frage-gruppen', P('Gruppenvergleich (t-Test)', 'Group comparison (t test)'),
    P('gruppen verschieden unterschied unterscheiden unterschiedlich vergleichen vergleich besser schlechter höher niedriger männer frauen mädchen jungen klassen gleich ungleich anders mittelwerte', 'groups gender sex different difference differ compare comparison better worse higher lower men women girls boys classes same unequal means'))
  ,e('frage-posthoc', P('Paarvergleiche (Post-hoc)', 'Pairwise comparisons (post hoc)'),
    P('welche gruppen unterscheiden sich paarweise jede einzeln drei mehr als zwei von den gruppen tukey genau sich', 'which groups differ pairwise each single three more than two of the groups tukey exactly'))
  ,e('frage-praepost', P('Vorher-Nachher-Vergleich', 'Before-after comparison'),
    P('vorher nachher vergleichen davor danach veränderung verändert verändern verbessert besser training therapie schulung prä post zwei messungen gleichen personen entwicklung fortschritt gewirkt wirkung', 'before after compare change changed improved better training therapy pre post two measurements same people progress worked effect'))
  ,e('mcnemar-test-cochran-q', P('McNemar-Test', 'McNemar test'),
    P('ja nein vorher nachher gleiche personen wechsel zeit veränderung anteil', 'yes no before after same people switch time change share'))
  ,e('reliable-change-index', P('Reliable Change Index', 'Reliable change index'),
    P('echte veränderung einzelne person einzelfalldiagnostik patient patientin messfehler verlässlich verbessert klient', 'real change single person single case patient measurement error reliable improved client'))
  ,e('frage-messwiederholung', P('Messwiederholung', 'Repeated measures'),
    P('mehrmals gemessen within subjects glm ändern ändert mehrere zeitpunkte wiederholte messung verlauf drei messungen zeit verändert über zeit', 'measured repeatedly within subjects glm change several time points repeated measurement course three measurements over time'),
    P('stimmung laune befinden', 'mood feeling'))
  ,e('friedman-test', P('Friedman-Test', 'Friedman test'),
    P('mehrere zeitpunkte ränge nicht normal wiederholt rangtest verlauf', 'several time points ranks not normal repeated rank test course'))
  ,e('p-wert', P('p-Wert', 'p value'),
    P('zufall echt zufällig reiner entstanden signifikant bedeutsam statistisch wahrscheinlichkeit gesichert irrtum ergebnis glück 0,05 gilt', 'chance real random coincidence luck significant meaningful statistical probability reliable fluke result'))
  ,e('signifikanz', P('Signifikanz', 'Significance'),
    P('bedeutsam wichtig echt zufall statistisch nachweisbar sternchen', 'meaningful important real chance statistical detectable stars'))
  ,e('effektstaerke', P('Effektstärke', 'Effect size'),
    P('wie groß unterschied praktisch bedeutsam relevant stark wichtig groß klein spürbar cohen', 'how big difference practically meaningful relevant strong important large small noticeable cohen'))
  ,e('konfidenzintervall', P('Konfidenzintervall', 'Confidence interval'),
    P('wie sicher unsicherheit spielraum bereich genauigkeit schätzung vertrauensbereich fehlerbalken spanne ungefähr ergebnis', 'how certain uncertainty range precision estimate error bars span approximately margin result'))
  ,e('standardfehler', P('Standardfehler', 'Standard error'),
    P('genauigkeit mittelwert schätzung wie genau fehler stichprobe', 'precision mean estimate how precise error sample'))
  ,e('reliabilitaet', P('Zuverlässigkeit (Cronbachs Alpha)', 'Reliability (Cronbachs alpha)'),
    P('passen fragen zusammen fragebogen skala konsistent zuverlässig zuverlässigkeit verlässlich messfehler items einheitlich innere konsistenz fragen messen dasselbe', 'questions fit together questionnaire scale consistent reliable reliability dependable measurement error items internal consistency measure same'))
  ,e('frage-skala', P('Zuverlässigkeit (Cronbachs Alpha)', 'Reliability (Cronbachs alpha)'),
    P('passen fragen zusammen fragebogen skala konsistent zuverlässig zuverlässigkeit verlässlich items einheitlich summenwert', 'questions fit together questionnaire scale consistent reliable reliability dependable items uniform sum score'))
  ,e('trennschaerfe', P('Trennschärfe', 'Item-total correlation'),
    P('welche frage schlecht passt item entfernen weglassen fragen aussortieren', 'which question fits badly item remove drop questions sort out'))
  ,e('frage-faktor', P('Faktorenanalyse', 'Factor analysis'),
    P('dahinter dimensionen fragen bündeln zusammenfassen ordnen gruppieren konstrukt skalen bilden welche fragen gehören zusammen gemeinsame hintergrund', 'underlying dimensions questions bundle combine arrange group construct build scales which questions belong together common background'))
  ,e('faktorenanalyse', P('Faktorenanalyse', 'Factor analysis'),
    P('fragen bündeln dimensionen gemeinsame dahinter gruppieren', 'questions bundle dimensions common underlying group'))
  ,e('frage-uebereinstimmung', P('Übereinstimmung (Kappa, ICC)', 'Agreement (kappa, ICC)'),
    P('übereinstimmung einig beurteiler urteilen zwei rater einigkeit gleiche urteile gutachter beobachter bewerter bewerten bewertet', 'agreement agree raters judges two rater consensus same judgments observers scorers'))
  ,e('kappa', P('Cohens Kappa', 'Cohens kappa'),
    P('einigkeit zufallskorrigiert beurteiler übereinstimmung kategorien', 'agreement chance corrected raters categories'))
  ,e('bland-altman', P('Bland-Altman-Diagramm', 'Bland-Altman plot'),
    P('zwei messgeräte vergleichen methoden übereinstimmen messverfahren abweichung', 'two devices compare methods agree measurement procedures deviation'))
  ,e('methodenvergleich', P('Methodenvergleich', 'Method comparison'),
    P('zwei messverfahren vergleichen neues gerät ersetzen gleichwertig messgerät', 'two measurement procedures compare new device replace equivalent instrument'))
  ,e('intercoder', P('Intercoder-Übereinstimmung', 'Intercoder agreement'),
    P('codierer kodieren zwei personen kategorien einig interviews texte', 'coders coding two people categories agree interviews texts'))
  ,e('power', P('Poweranalyse (Fallzahl)', 'Power analysis (sample size)'),
    P('wie viele personen brauche teilnehmer probanden stichprobengröße genug ausreichend leute zu wenig planen studie fallzahl umfang', 'how many people need participants subjects sample size enough sufficient too few plan study'))
  ,e('teststaerke', P('Teststärke (Power)', 'Power'),
    P('genug personen unterschied finden entdecken wahrscheinlichkeit finden zu wenig', 'enough people find difference detect probability too few'))
  ,e('stichprobe', P('Stichprobe', 'Sample'),
    P('befragte auswahl teilgruppe teilnehmer wie viele ausgewählt leute', 'respondents selection subgroup participants how many selected people'))
  ,e('ausreisser', P('Ausreißer', 'Outlier'),
    P('werte die aus der reihe tanzen extrem extremwerte seltsam komisch auffällig abweichend weit weg unplausibel fehler zu hoch zu niedrig ungewöhnlich', 'values that stand out extreme odd strange conspicuous deviating far away implausible mistake too high too low unusual unusual'))
  ,e('logistische-regression', P('Logistische Regression', 'Logistic regression'),
    P('ja nein vorhersagen vorhersage ereignis eintreten passiert wahrscheinlichkeit zwei ausgänge bestanden durchgefallen krank gesund kauft', 'yes no predict prediction event happen occurs probability two outcomes passed failed ill healthy buys'))
  ,e('frage-vorhersage', P('Regression', 'Regression'),
    P('vorhersagen vorhersage erklären einfluss einflussfaktoren welche faktoren beeinflusst beeinflussen vorhersagbar ja nein prognose bestimmen note noten', 'predict prediction explain influence factors which factors affects affect predictable yes no forecast determine grade grades marks'))
  ,e('regression', P('Regression', 'Regression'),
    P('gerade linie trend steigung einfluss vorhersagen', 'straight line trend slope influence predict'))
  ,e('r-quadrat', P('R-Quadrat', 'R squared'),
    P('wie viel erklärt anteil erklärt güte modell passt modellgüte', 'how much explained share explained goodness model fits model quality'))
  ,e('koeffizient-b', P('Regressionskoeffizient', 'Regression coefficient'),
    P('steigung pro einheit je ein punkt mehr um wie viel steigt', 'slope per unit each one point more by how much rises'))
  ,e('beta', P('Standardisiertes Beta', 'Standardized beta'),
    P('welcher einfluss am größten wichtigster vergleichen einflüsse stärkster', 'which influence largest most important compare influences strongest'))
  ,e('odds-ratio', P('Odds Ratio', 'Odds ratio'),
    P('chance chancen verhältnis wie viel wahrscheinlicher mal so', 'chance chances ratio how much more likely times as'))
  ,e('ordinale-regression', P('Ordinale Regression', 'Ordinal regression'),
    P('noten stufen rang vorhersagen geordnete stufen zustimmung skala vorhersage', 'grades levels rank predict ordered levels agreement scale prediction'))
  ,e('multinomiale-regression', P('Multinomiale Regression', 'Multinomial regression'),
    P('mehrere kategorien vorhersagen welche wahl entscheidung partei', 'several categories predict which choice decision party'))
  ,e('zaehldaten-regression', P('Zähldaten-Regression', 'Count regression'),
    P('anzahl zählen wie oft häufigkeit unfälle fehler ereignisse pro', 'number count how often frequency accidents errors events per'))
  ,e('hierarchische-regression', P('Hierarchische Regression', 'Hierarchical regression'),
    P('schrittweise blöcke nacheinander zusätzlich bringt mehr erklärt', 'stepwise blocks one after another additionally adds more explained'))
  ,e('frage-verteilung', P('Beschreibende Statistik', 'Descriptive statistics'),
    P('verteilt aussehen überblick beschreiben zusammenfassen durchschnitt häufigkeit verteilung histogramm übersicht daten kennzahlen', 'distributed look overview describe summarize average frequency distribution histogram summary data figures'))
  ,e('mittelwert', P('Mittelwert', 'Mean'),
    P('durchschnitt durchschnittlich mittel mitte typischer wert schnitt', 'average mean middle typical value'))
  ,e('standardabweichung', P('Standardabweichung', 'Standard deviation'),
    P('streuung schwankung spannweite wie unterschiedlich werte abweichung breit', 'spread variation range how different values deviation wide'))
  ,e('streuung', P('Streuung', 'Spread'),
    P('schwankung schwanken unterschiedlich weit auseinander verteilt breit', 'variation vary different far apart distributed wide'))
  ,e('normalverteilung-pruefen', P('Normalverteilung prüfen', 'Checking normality'),
    P('variable glockenkurve glocke normal verteilt schief symmetrisch passt kurve voraussetzung erfüllt normalverteilt', 'variable bell curve bell normal distributed skewed symmetric fits curve assumption met normally'))
  ,e('normalverteilung', P('Normalverteilung', 'Normal distribution'),
    P('glockenkurve glocke glockenform schief symmetrisch', 'bell curve bell shape skewed symmetric'))
  ,e('rangtest', P('Rangtest', 'Rank test'),
    P('nicht normal keine normalverteilung schief ränge alternative zum t-test kleine gruppen rangfolge verletzt verteilt daten verteilung', 'not normal no normal distribution skewed ranks alternative to t test small groups ranking violated data distributed distribution'))
  ,e('rangtests-weitere', P('Rangtests', 'Rank tests'),
    P('nicht normal ordinale daten ränge median vorzeichen alternative', 'not normal ordinal data ranks median sign alternative'))
  ,e('frage-kreuz', P('Kreuztabelle (Chi-Quadrat)', 'Crosstab (chi-square)'),
    P('häufigkeiten unterschiedlich oft kategorien auszählen tabelle anteile anteil raucheranteil raucher prozent gruppen kommt vor ankreuzen verhältnis', 'frequencies different often categories count table shares share smokers percent groups occurs ratio'))
  ,e('chi-quadrat', P('Chi-Quadrat-Test', 'Chi-square test'),
    P('häufigkeiten kategorien tabelle unterschiedlich oft anteile', 'frequencies categories table different often shares'))
  ,e('frage-mediation', P('Mediation', 'Mediation'),
    P('zwischenschritt vermittelt umweg indirekt einfluss warum wirkt mechanismus über dazwischen', 'intermediate step mediated detour indirect influence why works mechanism via in between'))
  ,e('frage-moderation', P('Moderation', 'Moderation'),
    P('hängt davon ab abhängig interaktionsterm zentrieren drittes bedingung gilt nur wechselwirkung interaktion unterschiedlich stark je nach', 'depends on dependent third condition only applies interaction term centering differently strong according to'))
  ,e('frage-mehrebenen', P('Mehrebenenmodell', 'Multilevel model'),
    P('verschachtelt schüler klassen schulen gruppen in gruppen cluster hierarchisch mitarbeiter teams ebenen', 'nested pupils classes schools groups within groups cluster hierarchical employees teams levels'))
  ,e('frage-meta', P('Meta-Analyse', 'Meta-analysis'),
    P('studien zusammenfassen mehrere studien gesamtbild literatur review gesamtergebnis', 'studies combine several studies overall picture literature review overall result'))
  ,e('frage-kaplanmeier', P('Kaplan-Meier', 'Kaplan-Meier'),
    P('zeit bis überleben dauer wie lange ereignis abbruch rückfall ausfall überlebenszeit', 'time until survival duration how long event dropout relapse failure survival time'))
  ,e('cox-regression', P('Cox-Regression', 'Cox regression'),
    P('einflüsse auf überleben risiko zeit bis ereignis faktoren dauer', 'influences on survival risk time until event factors duration'))
  ,e('hazard-ratio', P('Hazard Ratio', 'Hazard ratio'),
    P('risiko pro zeit wie viel höher risiko ereignis', 'risk per time how much higher risk event'))
  ,e('zensierung', P('Zensierung', 'Censoring'),
    P('noch nicht eingetreten abgebrochen verloren ausgeschieden nicht beobachtet', 'not yet occurred dropped out lost left not observed'))
  ,e('frage-einzelfall', P('Einzelfallanalyse', 'Single-case analysis'),
    P('eine person förderung wirkt kind einzelfall einzelfalldiagnostik patient patientin verlauf therapie wirkung', 'one person support works child single case diagnostics patient course therapy effect'))
  ,e('frage-cluster', P('Clusteranalyse', 'Cluster analysis'),
    P('gruppen finden typen segmente einteilen ähnlich ähnliche kundentypen versteckte', 'find groups types segments divide similar similar customer types hidden'))
  ,e('frage-diskriminanz', P('Diskriminanzanalyse', 'Discriminant analysis'),
    P('zuordnen welcher gruppe gehört klassifizieren erkennen zugehörigkeit', 'assign which group belongs classify recognize membership'))
  ,e('frage-zeitreihen', P('Zeitreihe', 'Time series'),
    P('entwicklung verlauf trend monatlich jahre zeit saison saisonal schwankung über die zeit', 'development course trend monthly years time season seasonal fluctuation over time'))
  ,e('zeitreihe-prognose', P('Prognose (ARIMA)', 'Forecast (ARIMA)'),
    P('zukunft weiterentwicklung weitergehen vorhersage nächste monate vorausschauen prognostizieren', 'future continue forecast next months look ahead predict'))
  ,e('frage-armut', P('Ungleichheit (Gini)', 'Inequality (Gini)'),
    P('einkommen ungleichheit gini armut verteilung gerechtigkeit reich arm verteilt', 'income inequality gini poverty distribution fairness rich poor distributed'))
  ,e('vielfalt-diversitaet', P('Vielfalt (Shannon)', 'Diversity (Shannon)'),
    P('vielfalt abwechslung durchmischt gemischt vielfältig bunt', 'variety variation mixed diverse colorful'))
  ,e('fehlende-werte-little-imputation', P('Fehlende Werte', 'Missing values'),
    P('fehlende fehlen fehlt antworten lücken leer nicht beantwortet ausgelassen fragebogen löcher ersetzen auffüllen ersetzung ergänzen missing values imputation', 'missing blank gaps unanswered answers questionnaire holes replace fill in'),
    P('umfrage umgang', 'survey data handle deal'))
  ,e('messinvarianz', P('Messinvarianz', 'Measurement invariance'),
    P('mgcfa multigruppen test fragebogen zwei sprachen sprachversionen übersetzung übersetzt gleich dasselbe messen gruppen kulturen', 'mgcfa multigroup test questionnaire two languages language versions translation translated same measure groups cultures'))
  ,e('faire-aufgaben-dif', P('Faire Aufgaben (DIF)', 'Fair items (DIF)'),
    P('test aufgabe fair unfair sprachen sprachversionen übersetzung benachteiligt gruppen gleich', 'test item fair unfair languages language versions translation disadvantaged groups same'))
  ,e('aequivalenztest-tost', P('Äquivalenztest (TOST)', 'Equivalence test (TOST)'),
    P('gleich gut praktisch gleich genug kein unterschied nachweisen gleichwertig gleichwertigkeit beweisen methoden', 'equally good practically equal enough no difference prove equivalent equivalence demonstrate methods'))
  ,e('bayes', P('Bayes-Faktor', 'Bayes factor'),
    P('wahrscheinlichkeit für hypothese evidenz für keinen unterschied wie stark spricht', 'probability for hypothesis evidence for no difference how strongly supports'))
  ,e('zufallsverfahren-permutation', P('Permutationstest', 'Permutation test'),
    P('ohne annahmen zufall mischen neu mischen durchtauschen', 'without assumptions chance shuffle reshuffle swap'))
  ,e('bootstrap', P('Bootstrap', 'Bootstrap'),
    P('wiederholt ziehen neu ziehen ohne annahmen simulieren stichprobe', 'repeatedly draw redraw without assumptions simulate sample'))
  ,e('roc-kurve', P('ROC-Kurve', 'ROC curve'),
    P('schwellenwert grenzwert test trennen trennt diagnostik cutoff zwei gruppen zahl', 'threshold limit test separate separates diagnostics cutoff two groups number'))
  ,e('sensitivitaet', P('Sensitivität', 'Sensitivity'),
    P('kranke erkannt treffsicher test findet krank richtig positiv', 'ill detected accurate test finds sick true positive'))
  ,e('relatives-risiko', P('Relatives Risiko', 'Relative risk'),
    P('risiko vergleichen risikoverhältnis erkrankung wie viel häufiger', 'risk compare risk ratio illness how much more often'))
  ,e('risikomasse', P('Risikomaße', 'Risk measures'),
    P('risiko vergleichen erkrankung vierfeldertafel behandlung', 'risk compare illness fourfold table treatment'))
  ,e('nnt', P('NNT', 'NNT'),
    P('wie viele behandeln behandelt werden müssen nutzen therapie', 'how many treated need to be treated benefit therapy'))
  ,e('zweifaktorielle-varianzanalyse', P('Zweifaktorielle Varianzanalyse', 'Two-way ANOVA'),
    P('zwei faktoren geschlecht und gruppe zwei einflüsse beide zugleich', 'two factors gender and group two influences both at once'))
  ,e('kovarianzanalyse', P('Kovarianzanalyse', 'Analysis of covariance'),
    P('gleiche ausgangslage kontrollvariable herausrechnen vorwert ausgleichen startwert', 'same starting point control variable adjust for pretest balance baseline'))
  ,e('frage-manova', P('MANOVA', 'MANOVA'),
    P('mehrere ergebnisse gleichzeitig mehrere zahlen zugleich mehrere abhängige', 'several outcomes at once several numbers together several dependent'))
  ,e('frage-loglinear', P('Loglineare Modelle', 'Log-linear models'),
    P('mehrere kategorien zusammenhang drei variablen tabelle komplex', 'several categories relationship three variables table complex'))
  ,e('frage-mehrfachantworten', P('Mehrfachantworten', 'Multiple responses'),
    P('mehrere antworten ankreuzen mehrfachauswahl checkboxen mehreres wählen', 'several answers tick multiple choice checkboxes choose several'))
  ,e('frage-kategorien', P('Offene Antworten ordnen', 'Coding open answers'),
    P('freitext offene antworten kategorisieren codieren inhaltsanalyse qualitative texte sortieren', 'free text open answers categorize code content analysis qualitative texts sort'))
  ,e('frage-faelle', P('Fälle vergleichen (Mixed Methods)', 'Comparing cases (mixed methods)'),
    P('zahlen und aussagen zusammen interviews qualitativ quantitativ verbinden', 'numbers and statements together interviews qualitative quantitative combine'))
  ,e('daten-oeffnen', P('Daten öffnen', 'Opening data'),
    P('datei laden importieren excel csv spss öffnen einlesen hochladen formate eigene daten', 'file load import excel csv spss open read upload formats own data'))
  ,e('daten-check', P('Daten-Check', 'Data check'),
    P('fehler in daten prüfen fehlende werte lücken aufräumen sauber kontrollieren plausibel', 'errors in data check missing values gaps tidy clean verify plausible'))
  ,e('keine-angabe-bereich', P('Fehlende Werte', 'Missing values'),
    P('fehlend leer keine angabe lücke weiß nicht nicht beantwortet unbekannt 99 999', 'missing empty no answer gap do not know unanswered unknown 99 999'))
  ,e('daten-vorbereiten', P('Daten vorbereiten', 'Preparing data'),
    P('umkodieren neue variable berechnen umbenennen summenwert filtern auswählen zusammenführen umpolen', 'recode new variable compute rename sum score filter select merge reverse'))
  ,e('umstrukturieren', P('Umstrukturieren (breit/lang)', 'Restructure (wide/long)'),
    P('breit lang format wechseln zeilen spalten drehen umformen', 'wide long format switch rows columns rotate reshape'))
  ,e('spalten-seite', P('Skalenniveau', 'Level of measurement'),
    P('skalenniveau nominal ordinal metrisch spalte typ beschreiben art der daten', 'level of measurement nominal ordinal scale column type describe kind of data'))
  ,e('klassen-bilden', P('Klassen bilden', 'Binning'),
    P('altersgruppen kategorisieren einteilen gruppen bilden aus zahlen zusammenfassen stufen', 'age groups categorize divide form groups from numbers combine levels'))
  ,e('normwerte', P('Normwerte', 'Norm scores'),
    P('z-wert iq prozentrang vergleichswerte standardisieren testwerte einordnen', 'z score iq percentile comparison values standardize test scores classify'))
  ,e('fallgewichte', P('Fallgewichte', 'Case weights'),
    P('gewichten gewicht repräsentativ hochrechnen anpassen bevölkerung', 'weight weights representative scale up adjust population'))
  ,e('datenschutz-projekt', P('Projekt speichern', 'Saving a project'),
    P('speichern sichern projekt datenschutz meine daten server privat anonym wohin hochgeladen verloren gespeichert', 'save back up project privacy my data server private anonymous where uploaded lost where stored'))
  ,e('installieren-offline', P('Offline-Nutzung', 'Offline use'),
    P('ohne internet offline app installieren ohne netz kein netz', 'without internet offline app install without network no network'))
  ,e('bericht-seite', P('Bericht und Export', 'Report and export'),
    P('export word pdf drucken bericht ergebnisse speichern abgeben herunterladen exportieren', 'export word pdf print report results save hand in download'))
  ,e('ergebnissatz', P('Ergebnissatz', 'Result sentence'),
    P('satz für arbeit apa formulieren aufschreiben schreiben text hausarbeit abschlussarbeit', 'sentence for paper apa phrase write down writing text term paper thesis'))
  ,e('statable-zitieren', P('Zitieren', 'Citing'),
    P('zitieren quelle angeben literaturverzeichnis angeben nennen', 'cite source state reference list mention'))
  ,e('diagramm-anpassen', P('Diagramme anpassen', 'Customizing charts'),
    P('grafik bild diagramm ändern farbe beschriftung speichern schöner', 'graphic picture chart change color labels save nicer'))
  ,e('blatt-seite', P('Seite Blatt (Einstieg)', 'Page Sheet (start)'),
    P('welcher test verfahren methode auswertung wählen passt wofür anfangen wo anfangen nehmen richtige', 'which test procedure method analysis choose fits where to begin start take right use'))
  ,e('tabelle-zusammenstellen', P('Tabelle zusammenstellen', 'Assemble a table'),
    P('tabelle bericht arbeit seminararbeit abschlussarbeit ergebnistabelle bauen zusammenstellen mittelwerte vergleichen vergleich je gruppe', 'table report thesis term paper results table build assemble means compare comparison per group'))
  ,e('voraussetzungen-pruefen', P('Voraussetzungen', 'Requirements'),
    P('voraussetzung mindestens wie viele daten genug fälle mindestgröße darf ich erlaubt', 'requirement at least how many data enough cases minimum size allowed'))
  ,e('spss-menue', P('SPSS-Menü', 'SPSS menu'),
    P('spss umsteigen wo finde ich menü umsteiger gewohnt', 'spss switching where do i find menu switcher used to'))
  ,e('tastatur', P('Tastatur', 'Keyboard'),
    P('tastenkürzel shortcuts bedienung screenreader ohne maus tasten', 'keyboard shortcuts operation screen reader without mouse keys'))
  ,e('befehle-seite', P('Befehle (Syntax)', 'Commands (syntax)'),
    P('syntax code befehl programmieren sps eigene befehle skript', 'syntax code command programming sps own commands script'))
  ,e('beispiele-seite', P('Beispiele', 'Examples'),
    P('beispiel übung üben beispieldaten ausprobieren lernen fertige fälle', 'example practice practise sample data try out learn ready-made cases'))
  ,e('verstehen', P('Verstehen', 'Understand'),
    P('ausprobieren lernen simulation ohne daten spielen erklären begreifen', 'try out learn simulation without data play explain grasp'))
  ,e('verstehen-verteilungen', P('Verteilungen berechnen', 'Computing distributions'),
    P('wahrscheinlichkeit berechnen würfel münze rechnen quantil', 'probability compute dice coin calculate quantile'))
  ,e('verstehen-zuteilung', P('Zufallszuteilung', 'Random assignment'),
    P('zufällig auswählen zuteilen losen auslosen randomisieren verlosen', 'randomly select assign draw lots randomize raffle'))
  ,e('lernlabor', P('Lernlabor', 'Learning lab'),
    P('experiment stichprobe zufall ausprobieren simulieren würfeln', 'experiment sample chance try out simulate roll dice'))
];
