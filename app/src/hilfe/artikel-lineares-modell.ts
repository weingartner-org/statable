/**
 * Hilfe-Artikel zum Lernpfad „Das lineare Modell: ein Werkzeug für vieles“ (sieben neue Einheiten, Johannes 05.11.2026). Jeder Artikel ist zugleich die Erklärung seiner Einheit.
 * Nur Deutsch und Englisch, jeder Text ein Textpaar P(de, en); die übrigen Sprachen fallen auf Englisch zurück. Stil: docs/fachblaetter/LEXIKON-STIL.md.
 * Eigene, erfundene Zahlenbeispiele (nichts aus einem Lehrbuch). Fachaussagen stützen sich auf kurs-lokal/bibliothek/wissen.json (reg-kleinste-quadrate, reg-modellvergleich, t-test-freiheitsgrade,
 * varianz-erwartungstreu-sd-nicht, t-test-drei-varianten, standardfehler-mittelwert, f-gleich-t-quadrat, reg-dummy-kodierung, reg-voraussetzung-residuen, reg-folgen-verletzungen,
 * reg-residuenplots, reg-gauss-markov, fehlerbalken-ueberlappung, belia-se-balken); zu Diagrammen und Datenanlage gibt es dort keine Quelle, die Texte bleiben bei Rechnung und gängiger Praxis.
 */
import { P } from '../i18n/laufzeit';
import { a, falsch, mitnehmen, type Roh } from './artikel-roh';

export const ROH_LM: Roh[] = [
  // ---------------------------------------------------------------- 1. Ergebnis = Modell + Fehler
  a('lm-modell-fehler', 'verstehen', P('Passt mein Modell zu den Daten? (Ergebnis = Modell + Fehler, Residuum, Quadratsumme)', 'Does my model fit the data? (outcome = model + error, residual, sum of squares)'),
    P('Modell Fehler Residuum Rest Abweichung Quadratsumme SS Mittelwert einfachstes Modell kleinste Quadrate Ergebnis gleich Modell plus Fehler lineares Modell', 'model error residual deviation sum of squares SS mean simplest model least squares outcome equals model plus error linear model'),
    [
      { h: P('Kurz', 'In brief') },
      P('Fast jedes Verfahren dieses Lernwegs folgt einer Idee: Ergebnis = Modell + Fehler. Das Modell sagt für jede Person einen Wert voraus, der Fehler ist, was übrig bleibt. Das einfachste Modell ist der Mittelwert.', 'Almost every procedure of this learning path follows one idea: outcome = model + error. The model predicts a value for every person, the error is what is left over. The simplest model is the mean.'),
      { h: P('Ein Beispiel von Hand', 'An example by hand') },
      P('Fünf Studierende haben 4, 10, 2, 9 und 5 Stunden gelernt. Wer sonst nichts weiß, sagt für alle denselben Wert voraus: den Mittelwert, hier 6 Stunden. Das ist ein Modell, das einfachste.', 'Five students studied 4, 10, 2, 9 and 5 hours. If nothing else is known, one predicts the same value for everybody: the mean, here 6 hours. That is a model, the simplest one.'),
      P('Die Abweichung einer Person (auch Residuum, Rest oder Fehler genannt) ist gemessen minus Modell. Für die Person mit 2 Stunden gilt: 2 − 6 = −4. Das Minus heißt: Das Modell sagt zu viel voraus.', 'The deviation of a person (also called residual or error) is measured minus model. For the person with 2 hours: 2 − 6 = −4. The minus means: the model predicts too much.'),
      P('Alle Abweichungen zusammen ergeben beim Mittelwert immer 0, denn Plus und Minus gleichen sich aus. Darum wird jede Abweichung quadriert und dann addiert. Das ergibt die Quadratsumme (SS): 4 + 16 + 16 + 9 + 1 = 46.', 'All deviations together always sum to 0 at the mean, because plus and minus cancel. So every deviation is squared and then added. That gives the sum of squares (SS): 4 + 16 + 16 + 9 + 1 = 46.'),
      { h: P('Warum der Mittelwert?', 'Why the mean?') },
      P('Der Mittelwert ist der Wert, bei dem die Quadratsumme am kleinsten wird (Methode der kleinsten Quadrate). Jeder andere Wert als Modell ergibt eine größere Quadratsumme. Dasselbe Prinzip legt die Regressionsgerade fest.', 'The mean is the value for which the sum of squares is smallest (method of least squares). Any other value as a model gives a larger sum of squares. The same principle fixes the regression line.'),
      { h: P('Bessere Modelle', 'Better models') },
      P('Ein besseres Modell nutzt mehr Wissen, zum Beispiel die Gruppe oder die Lernstunden einer Person. Es macht die Quadratsumme der Fehler kleiner. Sinkt sie von 80 auf 60, erklärt das Modell (80 − 60) : 80 = 25 % der Streuung. Das ist das R².', 'A better model uses more knowledge, for example the group or the study hours of a person. It makes the sum of squares of the errors smaller. If it falls from 80 to 60, the model explains (80 − 60) : 80 = 25% of the spread. That is R².'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Unter „Lernen“ die Einheit zu diesem Artikel öffnen: erst „Selbst rechnen“, dann „Regler“ mit dem Baustein „Modellwert“.', 'Under "Learning" open the unit for this article: first "Work it out yourself", then "Slider" with the tool "Model value".'),
        P('In einer Regression zeigt die Ergebnistabelle R², und die Tabelle der Varianzanalyse enthält die Quadratsumme der Fehler.', 'In a regression the result table shows R², and the table of the analysis of variance contains the sum of squares of the errors.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      { ul: [
        P('Die Summe der Abweichungen sagt nichts über die Passung: Beim Mittelwert ist sie immer 0.', 'The sum of the deviations says nothing about the fit: at the mean it is always 0.'),
        P('Dass die Quadratsumme mit einer weiteren Größe sinkt, belegt noch keinen Effekt: Jede zusätzliche Größe senkt sie ein wenig, auch eine Zufallszahl. Beurteilt wird mit korrigiertem R², Test und Sparsamkeit.', 'That the sum of squares falls with a further variable does not yet show an effect: every additional variable lowers it a little, even a random number. The judgement uses adjusted R², a test and parsimony.')
      ] },
      falsch(P('Ein Modell passt gut, wenn die Abweichungen zusammen null ergeben.', 'A model fits well when the deviations add up to zero.'),
        P('Beim Mittelwert ist die Summe der Abweichungen immer null, auch bei schlechter Passung. Erst die Quadratsumme zeigt, wie groß der Fehler insgesamt ist.', 'At the mean the sum of the deviations is always zero, even with a poor fit. Only the sum of squares shows how large the error is overall.')),
      { h: P('Für Fachleute', 'For specialists') },
      P('Kleinste Quadrate minimieren Σ(y − ŷ)². Hat das Modell nur eine Konstante, ist ŷ der Mittelwert. Die Gesamtquadratsumme zerfällt in SS_Modell + SS_Fehler, R² = SS_Modell : SS_gesamt. Mit Konstante im Modell sind die Residuen im Mittel 0 und mit jedem Prädiktor unkorreliert.', 'Least squares minimises Σ(y − ŷ)². If the model has only a constant, ŷ is the mean. The total sum of squares splits into SS_model + SS_error, R² = SS_model : SS_total. With a constant in the model the residuals average 0 and are uncorrelated with every predictor.'),
      { h: P('Quellen', 'Sources') },
      P('Backhaus, K., Erichson, B., Gensler, S., Weiber, R. & Weiber, T. Multivariate Analysemethoden, Kapitel 2 (Regressionsanalyse). Bortz, J. & Schuster, C. Statistik für Human- und Sozialwissenschaftler, Kapitel 11.', 'Backhaus, K., Erichson, B., Gensler, S., Weiber, R. & Weiber, T. Multivariate Analysemethoden, chapter 2 (regression analysis). Bortz, J. & Schuster, C. Statistik für Human- und Sozialwissenschaftler, chapter 11.'),
      mitnehmen(
        P('Ergebnis = Modell + Fehler: Der Fehler ist gemessen minus Modell.', 'Outcome = model + error: the error is measured minus model.'),
        P('Der Mittelwert ist das einfachste Modell und macht die Quadratsumme am kleinsten.', 'The mean is the simplest model and makes the sum of squares smallest.'),
        P('Abweichungen werden quadriert, weil sich Plus und Minus sonst aufheben.', 'Deviations are squared because plus and minus would otherwise cancel.'),
        P('R² sagt, welchen Anteil der Quadratsumme ein besseres Modell wegnimmt.', 'R² says what share of the sum of squares a better model removes.')
      )
    ], ['residuen', 'regression', 'lineares-modell']),

  // ---------------------------------------------------------------- 2. Freiheitsgrade
  a('lm-freiheitsgrade', 'verstehen', P('Warum n − 1? (Freiheitsgrade, Varianz einer Stichprobe)', 'Why n − 1? (degrees of freedom, variance of a sample)'),
    P('Freiheitsgrade n minus 1 Varianz Stichprobe Standardabweichung Nenner Bessel df Mittelwert geschätzt frei wählbar t-Test', 'degrees of freedom n minus 1 variance sample standard deviation denominator Bessel df mean estimated free to vary t test'),
    [
      { h: P('Kurz', 'In brief') },
      P('Freiheitsgrade sind die Zahl der Werte, die noch frei variieren können, nachdem etwas aus den Daten geschätzt wurde. Mit dem Mittelwert aus n Werten sind es n − 1. Durch sie wird die Quadratsumme zur Varianz.', 'Degrees of freedom are the number of values that can still vary freely after something has been estimated from the data. With the mean from n values there are n − 1. Dividing the sum of squares by them gives the variance.'),
      { h: P('Ein Beispiel von Hand', 'An example by hand') },
      P('Vier Kinder, Mittelwert der Gewichte 20 kg. Drei Gewichte sind 22, 25 und 19. Die Summe aller vier muss 4 · 20 = 80 sein, also wiegt das vierte Kind 80 − 66 = 14 kg. Es war nicht mehr frei: Von vier Werten sind nur drei frei, die Freiheitsgrade sind 3.', 'Four children, mean weight 20 kg. Three weights are 22, 25 and 19. The sum of all four must be 4 · 20 = 80, so the fourth child weighs 80 − 66 = 14 kg. It was no longer free: of four values only three are free, the degrees of freedom are 3.'),
      { h: P('Warum durch n − 1 teilen?', 'Why divide by n − 1?') },
      P('Die Quadratsumme der Abweichungen vom Mittelwert hier ist 66. Der Mittelwert stammt aus denselben Daten und liegt ihnen näher als der wahre Wert der Grundgesamtheit. Darum sind die Abweichungen im Mittel zu klein. Teilt man durch n − 1 statt durch n, gleicht das genau aus: Die Varianz der Stichprobe ist ein erwartungstreuer Schätzer der Varianz der Grundgesamtheit. Hier: 66 : 3 = 22 statt 66 : 4 = 16,5.', 'The sum of squared deviations from the mean here is 66. The mean comes from the same data and is closer to them than the true value of the population. So the deviations are too small on average. Dividing by n − 1 instead of n corrects exactly for this: the variance of the sample is an unbiased estimator of the variance of the population. Here: 66 : 3 = 22 instead of 66 : 4 = 16.5.'),
      { h: P('Freiheitsgrade zählen', 'Counting degrees of freedom') },
      { ul: [
        P('Ein Mittelwert (Einstichproben-t-Test, gepaarter t-Test mit n Paaren): n − 1.', 'One mean (one-sample t test, paired t test with n pairs): n − 1.'),
        P('Zwei Gruppen mit gleicher Varianz (gepoolter t-Test): n₁ + n₂ − 2, denn zwei Mittelwerte werden geschätzt.', 'Two groups with equal variance (pooled t test): n₁ + n₂ − 2, because two means are estimated.'),
        P('Allgemein: Zahl der Werte minus Zahl der aus den Daten geschätzten Größen.', 'In general: number of values minus number of quantities estimated from the data.')
      ] },
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Unter „Lernen“ die Einheit öffnen: „Selbst rechnen“, danach „Regler“.', 'Under "Learning" open the unit: "Work it out yourself", then "Slider".'),
        P('Im Rechner „Verteilungen berechnen“ die t-Verteilung wählen und die Freiheitsgrade ändern: Mit wenigen Freiheitsgraden ist sie breiter als die Normalverteilung, mit vielen fast gleich.', 'In the calculator "Calculate distributions" choose the t distribution and change the degrees of freedom: with few degrees of freedom it is wider than the normal distribution, with many almost the same.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      { ul: [
        P('Freiheitsgrade sind keine Stichprobengröße und kein Effekt. Sie sagen, wie viele Informationen übrig sind, um den Fehler zu schätzen.', 'Degrees of freedom are neither a sample size nor an effect. They say how much information is left to estimate the error.'),
        P('Die Standardabweichung mit n − 1 ist nicht ganz erwartungstreu; nur die Varianz ist es.', 'The standard deviation with n − 1 is not quite unbiased; only the variance is.')
      ] },
      falsch(P('Freiheitsgrade sind die Zahl der Personen.', 'Degrees of freedom are the number of people.'),
        P('Freiheitsgrade zählen die Werte, die nach dem Schätzen noch frei variieren können. Beim Mittelwert aus n Werten sind es n − 1.', 'Degrees of freedom count the values that can still vary freely after estimating. With the mean from n values there are n − 1.')),
      { h: P('Für Fachleute', 'For specialists') },
      P('E[Σ(xᵢ − x̄)²] = (n − 1)σ², deshalb ist s² = SS : (n − 1) erwartungstreu für σ². Die Standardabweichung s ist als Wurzel kein erwartungstreuer Schätzer von σ. Die t-Verteilung hängt nur von den Freiheitsgraden ab und nähert sich mit wachsenden Freiheitsgraden der Standardnormalverteilung.', 'E[Σ(xᵢ − x̄)²] = (n − 1)σ², so s² = SS : (n − 1) is unbiased for σ². The standard deviation s, as a root, is not an unbiased estimator of σ. The t distribution depends only on the degrees of freedom and approaches the standard normal distribution as they grow.'),
      { h: P('Quellen', 'Sources') },
      P('Bortz, J. & Schuster, C. Statistik für Human- und Sozialwissenschaftler, Kapitel 6 und 8.', 'Bortz, J. & Schuster, C. Statistik für Human- und Sozialwissenschaftler, chapters 6 and 8.'),
      mitnehmen(
        P('Wer einen Mittelwert aus den Daten schätzt, verliert einen Freiheitsgrad.', 'Estimating a mean from the data costs one degree of freedom.'),
        P('Die Varianz der Stichprobe wird durch n − 1 geteilt, damit sie die Varianz der Grundgesamtheit nicht unterschätzt.', 'The variance of the sample is divided by n − 1 so that it does not underestimate the variance of the population.'),
        P('Beim gepoolten t-Test mit zwei Gruppen gibt es n₁ + n₂ − 2 Freiheitsgrade.', 'The pooled t test with two groups has n₁ + n₂ − 2 degrees of freedom.'),
        P('Wenige Freiheitsgrade machen die t-Verteilung breiter als die Normalverteilung.', 'Few degrees of freedom make the t distribution wider than the normal distribution.')
      )
    ], ['lm-modell-fehler', 'freiheitsgrade', 'lm-signal-rauschen']),

  // ---------------------------------------------------------------- 3. Signal und Rauschen
  a('lm-signal-rauschen', 'verstehen', P('Wie deutlich hebt sich der Effekt vom Zufall ab? (Prüfgröße = Effekt durch Fehler: t, F, χ²)', 'How clearly does the effect stand out from chance? (test statistic = effect divided by error: t, F, χ²)'),
    P('Prüfgröße Teststatistik t F Chi-Quadrat Effekt Fehler Signal Rauschen Standardfehler Signal-Rausch-Verhältnis Welch Mittelwertdifferenz', 'test statistic t F chi-square effect error signal noise standard error signal-to-noise ratio Welch mean difference'),
    [
      { h: P('Kurz', 'In brief') },
      P('Eine Prüfgröße teilt den Effekt (das Signal) durch den Fehler (das Rauschen). t, F und χ² haben diese Bauart. Je größer der Wert, desto weniger passt „nur Zufall“ zu den Daten.', 'A test statistic divides the effect (the signal) by the error (the noise). t, F and χ² have this shape. The larger the value, the less "chance alone" fits the data.'),
      { h: P('Ein Beispiel von Hand', 'An example by hand') },
      P('Zwei Übungsgruppen (je 10 Personen) schreiben denselben Test. Gruppe A: Mittelwert 14, Standardabweichung 5. Gruppe B: Mittelwert 10, Standardabweichung 3.', 'Two practice groups (10 people each) write the same test. Group A: mean 14, standard deviation 5. Group B: mean 10, standard deviation 3.'),
      { ol: [
        P('Effekt (Signal): 14 − 10 = 4 Punkte.', 'Effect (signal): 14 − 10 = 4 points.'),
        P('Rauschen: der Standardfehler des Unterschieds, Wurzel aus (5² : 10 + 3² : 10) = Wurzel aus 3,4 = 1,84. Streuungen werden als Quadrate addiert, danach folgt die Wurzel.', 'Noise: the standard error of the difference, square root of (5² : 10 + 3² : 10) = square root of 3.4 = 1.84. Spreads are added as squares, the root comes afterwards.'),
        P('t = Effekt : Standardfehler = 4 : 1,84 = 2,17.', 't = effect : standard error = 4 : 1.84 = 2.17.')
      ] },
      { h: P('Warum diese Form?', 'Why this shape?') },
      P('Ein Unterschied von 4 Punkten ist bei kleiner Streuung viel und bei großer Streuung wenig. Erst das Verhältnis zum Fehler zeigt, wie ungewöhnlich er für reinen Zufall wäre. Mehr Personen verkleinern den Standardfehler: Viermal so viele Personen halbieren ihn, t verdoppelt sich (hier 4,34 bei je 40 Personen).', 'A difference of 4 points is a lot when the spread is small and little when the spread is large. Only the ratio to the error shows how unusual it would be for pure chance. More people make the standard error smaller: four times as many people halve it, t doubles (here 4.34 with 40 people each).'),
      { h: P('Dieselbe Idee in drei Verfahren', 'The same idea in three procedures') },
      { ul: [
        P('t: Unterschied von Mittelwerten durch seinen Standardfehler.', 't: difference of means divided by its standard error.'),
        P('F: erklärte Varianz durch Restvarianz. Bei zwei Gruppen ist F = t².', 'F: explained variance divided by residual variance. With two groups F = t².'),
        P('χ²: Abweichung der gezählten von den erwarteten Häufigkeiten, geteilt durch die erwartete Häufigkeit.', 'χ²: deviation of the counted from the expected frequencies, divided by the expected frequency.')
      ] },
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Unter „Lernen“ die Einheit öffnen: „Selbst rechnen“, danach „Regler“.', 'Under "Learning" open the unit: "Work it out yourself", then "Slider".'),
        P('Im Rechner „Gruppen aus Kennzahlen vergleichen“ lassen sich Mittelwert, Standardabweichung und Zahl der Personen beider Gruppen eintragen. Das t muss dem von Hand gerechneten Wert gleichen.', 'In the calculator "Compare groups from summary numbers" the mean, standard deviation and number of people of both groups can be entered. The t must equal the value calculated by hand.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      { ul: [
        P('Ein großes t sagt nur, dass der Unterschied sich vom Zufall abhebt, nicht, dass er groß oder wichtig ist. Mit sehr vielen Personen wird auch ein winziger Effekt deutlich. Wie groß er ist, zeigt die Effektstärke.', 'A large t only says that the difference stands out from chance, not that it is large or important. With very many people even a tiny effect stands out. How large it is shows the effect size.')
      ] },
      falsch(P('Ein großes t heißt, der Effekt ist groß.', 'A large t means the effect is large.'),
        P('Ein großes t heißt nur, dass sich der Unterschied vom Zufall abhebt. Mit sehr vielen Personen genügt auch ein winziger Effekt. Wie groß er ist, sagt die Effektstärke.', 'A large t only means that the difference stands out from chance. With very many people even a tiny effect is enough. How large it is, the effect size says.')),
      { h: P('Für Fachleute', 'For specialists') },
      P('Die Prüfgröße des t-Tests ist Schätzer minus Testwert durch den geschätzten Standardfehler. Der Welch-Test nutzt den Standardfehler ohne Pooling, Wurzel aus (s₁² : n₁ + s₂² : n₂), und passt die Freiheitsgrade an (meist nicht ganzzahlig). Bei gleichen Gruppengrößen ist der gepoolte Standardfehler derselbe.', 'The test statistic of the t test is estimate minus test value divided by the estimated standard error. The Welch test uses the standard error without pooling, square root of (s₁² : n₁ + s₂² : n₂), and adjusts the degrees of freedom (usually not whole numbers). With equal group sizes the pooled standard error is the same.'),
      { h: P('Quellen', 'Sources') },
      P('Bortz, J. & Schuster, C. Statistik für Human- und Sozialwissenschaftler, Kapitel 8. Dormann, C. F. Parametrische Statistik, Kapitel zur Varianzanalyse.', 'Bortz, J. & Schuster, C. Statistik für Human- und Sozialwissenschaftler, chapter 8. Dormann, C. F. Parametrische Statistik, chapter on the analysis of variance.'),
      mitnehmen(
        P('Prüfgröße = Effekt : Fehler, also Signal durch Rauschen.', 'Test statistic = effect : error, that is signal divided by noise.'),
        P('t, F und χ² haben alle diese Bauart.', 't, F and χ² all have this shape.'),
        P('Mehr Personen verkleinern den Standardfehler, der Effekt selbst bleibt gleich.', 'More people make the standard error smaller; the effect itself stays the same.'),
        P('Bei zwei Gruppen ist F = t².', 'With two groups F = t².')
      )
    ], ['lm-modell-fehler', 'standardfehler', 'effektstaerke', 'p-wert']),

  // ---------------------------------------------------------------- 4. Gruppenvergleich ist Regression
  a('lm-gruppen-regression', 'verstehen', P('Ist ein Gruppenvergleich eine Regression? (Gruppen als 0/1-Spalte, Referenzgruppe, lineares Modell)', 'Is a group comparison a regression? (groups as a 0/1 column, reference group, linear model)'),
    P('Regression 0/1 Dummy Referenzgruppe Konstante b0 b1 Mittelwertdifferenz Gruppenvergleich lineares Modell Gruppe Kodierung', 'regression 0/1 dummy reference group constant b0 b1 mean difference group comparison linear model group coding'),
    [
      { h: P('Kurz', 'In brief') },
      P('Ein Gruppenvergleich ist ein Regressionsmodell mit einer 0/1-Spalte: b₀ ist der Mittelwert der Referenzgruppe, b₁ der Unterschied der Mittelwerte. Der t-Wert für b₁ gleicht dem t-Wert des t-Tests für zwei Gruppen.', 'A group comparison is a regression model with a 0/1 column: b₀ is the mean of the reference group, b₁ the difference of the means. The t value for b₁ equals the t value of the t test for two groups.'),
      { h: P('Ein Beispiel von Hand', 'An example by hand') },
      P('Sechs Personen, Punkte im Test. Gruppe 0 (ohne Lernkarten): 4, 6, 8. Gruppe 1 (mit Lernkarten): 8, 10, 15. Modell: Punkte = b₀ + b₁ · Gruppe + Fehler.', 'Six people, test points. Group 0 (without flash cards): 4, 6, 8. Group 1 (with flash cards): 8, 10, 15. Model: points = b₀ + b₁ · group + error.'),
      { ul: [
        P('Für Gruppe = 0 bleibt nur b₀ übrig. Das beste Modell sagt für sie ihren Mittelwert voraus: b₀ = 6.', 'For group = 0 only b₀ is left. The best model predicts their mean for them: b₀ = 6.'),
        P('Für Gruppe = 1 sagt das Modell b₀ + b₁ voraus, den Mittelwert der Gruppe 1, also 11. Daraus folgt b₁ = 11 − 6 = 5: der Unterschied der Mittelwerte.', 'For group = 1 the model predicts b₀ + b₁, the mean of group 1, which is 11. So b₁ = 11 − 6 = 5: the difference of the means.'),
        P('Der Rest einer Person ist gemessen minus Vorhersage, etwa 15 − 11 = 4. Die Reste beider Rechnungen sind dieselben, darum liefern t-Test und Regression dasselbe t (hier 2,10).', 'The residual of a person is measured minus prediction, for example 15 − 11 = 4. The residuals of both calculations are the same, so t test and regression give the same t (here 2.10).')
      ] },
      { h: P('Wozu die Regression?', 'Why use regression?') },
      { ul: [
        P('Weitere Größen (zum Beispiel das Alter) lassen sich einfach ins Modell nehmen.', 'Further variables (for example age) can simply be put into the model.'),
        P('Gruppen mit mehr als zwei Stufen brauchen eine 0/1-Spalte (Dummy) weniger als Stufen; die Stufe ohne Spalte ist die Referenz. Alle Stufen zusammen mit der Konstante ergäben keine eindeutige Lösung.', 'Groups with more than two levels need one 0/1 column (dummy) fewer than levels; the level without a column is the reference. All levels together with the constant would give no unique solution.'),
        P('Wer eine andere Gruppe zur Referenz macht, ändert b₀ und das Vorzeichen von b₁, aber nicht die Vorhersagen.', 'Whoever makes another group the reference changes b₀ and the sign of b₁, but not the predictions.')
      ] },
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Unter „Lernen“ die Einheit öffnen: „Selbst rechnen“, danach „Beispiel“ mit dem Beispiel „Autos“.', 'Under "Learning" open the unit: "Work it out yourself", then "Example" with the example "Cars".'),
        P('Im Beispiel zuerst den Schritt „Wie weit fahren Automatik und Handschaltung?“ (Gruppenvergleich) öffnen, dann den Schritt „Eine 0/1-Größe in der Tabelle“ (Regression): Die Konstante ist der Mittelwert der Automatikwagen, das B der Getriebe-Zeile der Unterschied.', 'In the example first open the step "How far do automatic and manual cars go?" (group comparison), then the step "A 0/1 variable in the table" (regression): the constant is the mean of the automatic cars, the B of the transmission row the difference.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      { ul: [
        P('Die Konstante ist nicht der Mittelwert aller, sondern der Mittelwert der Referenzgruppe (der Gruppe mit 0).', 'The constant is not the mean of everybody but the mean of the reference group (the group with 0).')
      ] },
      falsch(P('Die Konstante b₀ ist der Mittelwert aller Personen.', 'The constant b₀ is the mean of all people.'),
        P('Bei 0/1-Kodierung ist b₀ der Mittelwert der Referenzgruppe (Gruppe 0). b₁ ist der Unterschied der Mittelwerte.', 'With 0/1 coding b₀ is the mean of the reference group (group 0). b₁ is the difference of the means.')),
      { h: P('Für Fachleute', 'For specialists') },
      P('Mit 0/1-Kodierung und Konstante ist b₀ = ȳ₀ und b₁ = ȳ₁ − ȳ₀; der t-Test für b₁ entspricht dem gepoolten t-Test (gleiche Varianzen, n₁ + n₂ − 2 Freiheitsgrade). Bei zwei Gruppen ist das F der Varianzanalyse das Quadrat dieses t.', 'With 0/1 coding and a constant, b₀ = ȳ₀ and b₁ = ȳ₁ − ȳ₀; the t test for b₁ corresponds to the pooled t test (equal variances, n₁ + n₂ − 2 degrees of freedom). With two groups the F of the analysis of variance is the square of this t.'),
      { h: P('Quellen', 'Sources') },
      P('Backhaus, K., Erichson, B., Gensler, S., Weiber, R. & Weiber, T. Multivariate Analysemethoden, Kapitel 2 (Dummy-Variablen). Bortz, J. & Schuster, C. Statistik für Human- und Sozialwissenschaftler, Kapitel 8 und 12.', 'Backhaus, K., Erichson, B., Gensler, S., Weiber, R. & Weiber, T. Multivariate Analysemethoden, chapter 2 (dummy variables). Bortz, J. & Schuster, C. Statistik für Human- und Sozialwissenschaftler, chapters 8 and 12.'),
      mitnehmen(
        P('Ein Gruppenvergleich ist ein Regressionsmodell mit einer 0/1-Spalte.', 'A group comparison is a regression model with a 0/1 column.'),
        P('b₀ ist der Mittelwert der Referenzgruppe, b₁ der Unterschied der Mittelwerte.', 'b₀ is the mean of the reference group, b₁ the difference of the means.'),
        P('Der t-Wert für b₁ gleicht dem t-Wert des gepoolten t-Tests.', 'The t value for b₁ equals the t value of the pooled t test.'),
        P('Wechselt die Referenzgruppe, ändert sich nur das Vorzeichen von b₁.', 'If the reference group changes, only the sign of b₁ changes.')
      )
    ], ['dummy-variable', 'koeffizient-b', 'gepoolter-t-test', 'lm-modell-fehler']),

  // ---------------------------------------------------------------- 5. Annahmen-Landkarte
  a('lm-annahmen', 'verstehen', P('Welche Annahme brauche ich wofür? (Landkarte der Annahmen der Regression, Residuen)', 'Which assumption do I need for what? (map of the assumptions of regression, residuals)'),
    P('Annahmen Voraussetzungen Regression Linearität Unabhängigkeit gleiche Streuung Homoskedastizität Normalverteilung Residuen Reste große Stichprobe Rangfolge Residuenplot Q-Q-Diagramm', 'assumptions requirements regression linearity independence equal spread homoscedasticity normal distribution residuals large sample ranking residual plot Q-Q plot'),
    [
      { h: P('Kurz', 'In brief') },
      P('Nicht jede Annahme ist für jedes Ziel gleich wichtig. Die Normalverteilung betrifft die Reste (Residuen), nicht die Rohdaten. Am meisten schadet eine falsche Form des Zusammenhangs. Geprüft wird an den Resten.', 'Not every assumption matters equally for every goal. The normal distribution concerns the residuals, not the raw data. A wrong shape of the relationship harms most. The check uses the residuals.'),
      { h: P('Welche Annahme für welches Ziel?', 'Which assumption for which goal?') },
      { ul: [
        P('Koeffizienten b schätzen (die Gerade selbst): vor allem Linearität (die Beziehung ist in den Koeffizienten linear) und keine wichtige Größe fehlt. Nichtlinearität, fehlende Variablen und Messfehler in x verzerren die Koeffizienten. Normalverteilte Fehler sind dafür nicht nötig.', 'Estimating coefficients b (the line itself): above all linearity (the relationship is linear in the coefficients) and no important variable missing. Nonlinearity, missing variables and measurement error in x bias the coefficients. Normally distributed errors are not needed for this.'),
        P('Intervalle und p-Werte: zusätzlich unabhängige Beobachtungen, gleiche Streuung der Fehler und annähernd normalverteilte Fehler. Ungleiche Streuung und Abhängigkeit machen die Schätzung ungenauer, aber nicht verzerrt; verletzte Normalität gefährdet Tests und Intervalle.', 'Intervals and p values: in addition independent observations, equal spread of the errors and approximately normal errors. Unequal spread and dependence make the estimate less precise but not biased; violated normality endangers tests and intervals.'),
        P('Vorhersage einzelner Werte: wie bei den Intervallen, und nur innerhalb des Bereichs der Daten.', 'Predicting single values: as for the intervals, and only within the range of the data.')
      ] },
      { h: P('Die Normalverteilung betrifft die Reste', 'The normal distribution concerns the residuals') },
      P('Gefordert sind normalverteilte Fehler, nicht normalverteilte Rohdaten, und über die Verteilung der Vorhersagegröße wird nichts verlangt. Ein schiefes Histogramm der Zielgröße ist darum noch kein Befund. Bei großen Stichproben mildert der zentrale Grenzwertsatz die Folgen verletzter Normalität.', 'What is required are normally distributed errors, not normally distributed raw data, and nothing is required about the distribution of the predictor. A skewed histogram of the outcome is therefore not yet a finding. With large samples the central limit theorem mitigates the consequences of violated normality.'),
      { h: P('Eine übliche Rangfolge der Sorgfalt', 'A common ranking of care') },
      P('Oft genannt wird: zuerst Linearität, dann unabhängige Beobachtungen, dann gleiche Streuung, zuletzt Normalität. Belegt ist der Kern dieser Reihenfolge: Eine falsche Form verzerrt die Koeffizienten, die übrigen Verletzungen betreffen Genauigkeit und Tests. Wie Unabhängigkeit und gleiche Streuung untereinander einzuordnen sind, ist eine Gewohnheit, kein Gesetz.', 'Often named: first linearity, then independent observations, then equal spread, last normality. The core of this order is backed: a wrong shape biases the coefficients, the other violations concern precision and tests. How independence and equal spread rank against each other is a habit, not a law.'),
      { h: P('Ein Beispiel von Hand', 'An example by hand') },
      P('Fünf Personen, Stunden x = 1 bis 5 und Punkte y = 5, 4, 5, 8, 13. Die Gerade ist ŷ = 1 + 2x, also ŷ = 3, 5, 7, 9, 11. Die Reste (y − ŷ) sind +2, −1, −2, −1, +2. Die Summe ist 0, wie immer bei einer Konstante. Das Muster zählt: oben, unten, unten, unten, oben ist ein Bogen. Die Gerade hat die falsche Form.', 'Five people, hours x = 1 to 5 and points y = 5, 4, 5, 8, 13. The line is ŷ = 1 + 2x, so ŷ = 3, 5, 7, 9, 11. The residuals (y − ŷ) are +2, −1, −2, −1, +2. The sum is 0, as always with a constant. The pattern counts: above, below, below, below, above is a curve. The line has the wrong shape.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Unter „Lernen“ die Einheit öffnen: „Selbst rechnen“, danach „Regler“ mit dem Rechner „Gerade zum Anfassen“.', 'Under "Learning" open the unit: "Work it out yourself", then "Slider" with the calculator "A line to play with".'),
        P('Beim Prüfen: Residuen gegen die vorhergesagten Werte ansehen. Sie sollen ohne Muster um 0 streuen: Eine Kurve zeigt Nichtlinearität, ein Trichter ungleiche Streuung. Die Normalität der Fehler prüft ein Q-Q-Diagramm der Residuen, nicht der Rohdaten.', 'When checking: look at the residuals against the predicted values. They should scatter around 0 without a pattern: a curve shows nonlinearity, a funnel unequal spread. The normality of the errors is checked with a Q-Q plot of the residuals, not of the raw data.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      { ul: [
        P('Die Summe der Residuen ist mit Konstante immer 0 und die Korrelation mit x ebenfalls: Diese Zahlen können nicht zeigen, dass das Modell passt. Nur die Muster im Bild zeigen es.', 'The sum of the residuals is always 0 with a constant, and so is the correlation with x: these numbers cannot show that the model fits. Only the patterns in the picture do.')
      ] },
      falsch(P('Die Daten müssen normalverteilt sein, damit eine Regression gilt.', 'The data must be normally distributed for a regression to hold.'),
        P('Die Normalverteilung betrifft die Reste (Residuen), nicht die Rohdaten, und sie zählt vor allem für Tests und Intervalle bei kleinen Stichproben. Geprüft wird sie im Bild der Reste.', 'Normality concerns the residuals, not the raw data, and it matters mainly for tests and intervals in small samples. It is checked in the picture of the residuals.')),
      { h: P('Für Fachleute', 'For specialists') },
      P('Der Satz von Gauß-Markov gilt bei homoskedastischen Fehlern in der Klasse linearer, bedingt unverzerrter Schätzer und verlangt keine Normalverteilung. Heteroskedastizität und Autokorrelation lassen die Schätzer unverzerrt, machen sie aber ineffizient und die Standardfehler falsch. „Linear“ meint linear in den Koeffizienten: b₀ + b₁x + b₂x² ist ein lineares Modell.', 'The Gauss-Markov theorem holds for homoscedastic errors in the class of linear, conditionally unbiased estimators and requires no normal distribution. Heteroscedasticity and autocorrelation leave the estimators unbiased but make them inefficient and the standard errors wrong. "Linear" means linear in the coefficients: b₀ + b₁x + b₂x² is a linear model.'),
      { h: P('Quellen', 'Sources') },
      P('Backhaus, K., Erichson, B., Gensler, S., Weiber, R. & Weiber, T. Multivariate Analysemethoden, Kapitel 2 (Annahmen, Folgen von Verletzungen, Residuenplots). Bortz, J. & Schuster, C. Statistik für Human- und Sozialwissenschaftler, Kapitel 11.', 'Backhaus, K., Erichson, B., Gensler, S., Weiber, R. & Weiber, T. Multivariate Analysemethoden, chapter 2 (assumptions, consequences of violations, residual plots). Bortz, J. & Schuster, C. Statistik für Human- und Sozialwissenschaftler, chapter 11.'),
      mitnehmen(
        P('Ein Bogen in den Resten zeigt, dass der Zusammenhang nicht gerade ist (Linearität).', 'A curve in the residuals shows that the relationship is not straight (linearity).'),
        P('Ein Trichter in den Resten zeigt ungleiche Streuung.', 'A funnel in the residuals shows unequal spread.'),
        P('Die Normalverteilung der Reste wird im Q-Q-Diagramm geprüft.', 'The normal distribution of the residuals is checked in the Q-Q plot.'),
        P('Die Summe der Reste ist mit Konstante immer 0 und beweist nichts: Das Muster im Bild zählt.', 'The sum of the residuals is always 0 with a constant and proves nothing: the pattern in the picture counts.')
      )
    ], ['regression', 'residuen', 'lm-gruppen-regression']),

  // ---------------------------------------------------------------- 6. Diagramme ehrlich
  a('lm-diagramme', 'bericht', P('Zeigt mein Diagramm ehrlich, was in den Daten steckt? (Diagrammart, abgeschnittene Achse, 3D, Fehlerbalken)', 'Does my chart honestly show what is in the data? (chart type, truncated axis, 3D, error bars)'),
    P('Diagramm Säulendiagramm Achse abgeschnitten Achsenbeginn 3D Fehlerbalken Standardfehler Konfidenzintervall Standardabweichung ehrlich irreführend Prozent Übertreibung', 'chart column chart axis truncated axis start 3D error bars standard error confidence interval standard deviation honest misleading percent exaggeration'),
    [
      { h: P('Kurz', 'In brief') },
      P('Ein Diagramm zeigt Zahlen als Längen, Flächen und Lagen. Das Auge vergleicht diese, nicht die Zahlen darunter. Ehrlich ist es, wenn das Bild denselben Eindruck macht wie die Zahlen: Säulen beginnen bei 0, keine 3D-Effekte, Fehlerbalken sind benannt.', 'A chart shows numbers as lengths, areas and positions. The eye compares these, not the numbers underneath. It is honest when the picture gives the same impression as the numbers: columns start at 0, no 3D effects, error bars are named.'),
      { h: P('Die Diagrammart wählen', 'Choosing the chart type') },
      { ul: [
        P('Mittelwerte mehrerer Gruppen: Säulen (ab 0) oder Punkte mit Intervall.', 'Means of several groups: columns (from 0) or dots with an interval.'),
        P('Verlauf über die Zeit: Linien.', 'Course over time: lines.'),
        P('Zusammenhang zweier Zahlen: Punktwolke (Streudiagramm).', 'Relationship of two numbers: scatter plot.'),
        P('Verteilung einer Zahl: Histogramm oder Boxplot.', 'Distribution of one number: histogram or boxplot.')
      ] },
      { h: P('Abgeschnittene Achse', 'Truncated axis') },
      P('80 % und 90 % Zufriedenheit mit zwei Mensen. Beginnt die Achse bei 70, sind die Säulen 10 und 20 hoch. B wirkt doppelt so hoch wie A, also 100 % höher, obwohl der Wert nur (90 − 80) : 80 = 12,5 % größer ist. Das Bild übertreibt den Unterschied auf das Achtfache. Säulen vergleichen Längen, darum müssen sie bei 0 beginnen. Bei Punkten und Linien darf die Achse später beginnen, wenn Lage und Verlauf zählen.', '80% and 90% satisfaction with two canteens. If the axis starts at 70, the columns are 10 and 20 high. B looks twice as high as A, so 100% higher, although the value is only (90 − 80) : 80 = 12.5% larger. The picture exaggerates the difference eightfold. Columns compare lengths, so they must start at 0. For dots and lines the axis may start later when position and course matter.'),
      { h: P('Dreidimensionale Darstellungen', 'Three-dimensional displays') },
      P('Tiefe, Perspektive und Schatten verändern, wie hoch eine Säule wirkt. Die dritte Dimension trägt keine Information, erschwert aber das Ablesen. Flache Säulen oder Punkte zeigen dieselben Zahlen klarer.', 'Depth, perspective and shadows change how tall a column looks. The third dimension carries no information but makes reading harder. Flat columns or dots show the same numbers more clearly.'),
      { h: P('Fehlerbalken benennen', 'Naming error bars') },
      { ul: [
        P('Die Beschriftung muss sagen, ob die Balken Standardabweichung, Standardfehler oder Konfidenzintervall zeigen; aus den Balken allein lässt sich das nicht erkennen.', 'The caption must say whether the bars show standard deviation, standard error or confidence interval; this cannot be seen from the bars alone.'),
        P('Ein Balken von einem Standardfehler ist etwa halb so breit wie ein 95-Prozent-Intervall.', 'A bar of one standard error is about half as wide as a 95 percent interval.'),
        P('Haben zwei 95-Prozent-Intervalle keinen gemeinsamen Bereich, ist der Unterschied signifikant. Überlappen sie, folgt daraus nicht, dass er es nicht ist.', 'If two 95 percent intervals share no common range, the difference is significant. If they overlap, it does not follow that it is not.'),
        P('Bei Messwiederholung (vorher und nachher bei denselben Personen) sagen die Balken der beiden Mittelwerte nichts über die Signifikanz des Unterschieds.', 'With repeated measures (before and after in the same people) the bars of the two means say nothing about the significance of the difference.')
      ] },
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Unter „Lernen“ die Einheit öffnen: „Selbst rechnen“, danach „Regler“ mit dem Baustein „Achse“.', 'Under "Learning" open the unit: "Work it out yourself", then "Slider" with the tool "Axis".'),
        P('Was sich an einem Diagramm anpassen lässt, steht in der Hilfe „Diagramme anpassen und speichern“ (verwandter Artikel).', 'What can be adjusted in a chart is described in the help "Adjusting and saving charts" (related article).')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      { ul: [
        P('Es hilft nicht, die abgeschnittene Achse nur zu beschriften: Das Auge sieht zuerst die Höhen.', 'It does not help just to label the truncated axis: the eye sees the heights first.')
      ] },
      falsch(P('Eine beschriftete abgeschnittene Achse ist unproblematisch.', 'A truncated axis is harmless as long as it is labelled.'),
        P('Das Auge vergleicht zuerst die Höhen der Säulen. Beginnt die Achse nicht bei 0, wirkt ein kleiner Unterschied riesig, auch mit Beschriftung. Säulen beginnen bei 0.', 'The eye first compares the heights of the columns. If the axis does not start at 0, a small difference looks huge, even with a label. Columns start at 0.')),
      { h: P('Für Fachleute', 'For specialists') },
      P('Der Übertreibungsfaktor einer Achse ab a ist ((y₂ − a) : (y₁ − a) − 1) : (y₂ : y₁ − 1). Fehlerbalken: SE = s : Wurzel n; das 95-Prozent-Intervall ist etwa ±2 SE (bei kleinem n mit dem t-Wert).', 'The exaggeration factor of an axis starting at a is ((y₂ − a) : (y₁ − a) − 1) : (y₂ : y₁ − 1). Error bars: SE = s : square root of n; the 95 percent interval is about ±2 SE (with the t value at small n).'),
      { h: P('Quellen', 'Sources') },
      P('Belia, S., Fidler, F., Williams, J. & Cumming, G. (2005). Researchers misunderstand confidence intervals and standard error bars. Psychological Methods, 10(4), 389-396. Zu Diagrammart, Achse und 3D gibt es keine eigene Quelle in der Sammlung; der Text beruht auf der Rechnung und gängiger Praxis.', 'Belia, S., Fidler, F., Williams, J. & Cumming, G. (2005). Researchers misunderstand confidence intervals and standard error bars. Psychological Methods, 10(4), 389-396. For chart type, axis and 3D there is no source of its own in the collection; the text rests on the calculation and common practice.'),
      mitnehmen(
        P('Säulen und Balken beginnen bei 0.', 'Columns and bars start at 0.'),
        P('Der Übertreibungsfaktor einer abgeschnittenen Achse lässt sich ausrechnen.', 'The exaggeration factor of a truncated axis can be calculated.'),
        P('Die dritte Dimension eines 3D-Diagramms trägt keine Information.', 'The third dimension of a 3D chart carries no information.'),
        P('Fehlerbalken brauchen die Angabe, was sie zeigen (SE, KI oder Standardabweichung).', 'Error bars need a note on what they show (SE, CI or standard deviation).')
      )
    ], ['fehlerbalken', 'diagramm-anpassen']),

  // ---------------------------------------------------------------- 7. Daten sauber anlegen
  a('lm-daten-anlegen', 'daten', P('Wie lege ich eine Tabelle so an, dass sich damit rechnen lässt? (Datenmatrix, Codes, breit und lang)', 'How do I set up a table so that I can calculate with it? (data matrix, codes, wide and long)'),
    P('Daten anlegen Tabelle Zeile Spalte Person Codes Beschriftungen Wertelabel breit lang Messwiederholung Mehrebenen Kennung Codebuch umstrukturieren', 'set up data table row column person codes labels value labels wide long repeated measures multilevel ID codebook reshape'),
    [
      { h: P('Kurz', 'In brief') },
      P('Eine Zeile je Beobachtung (meist je Person), eine Spalte je Größe, jede Zelle ein Wert. Codes bekommen Beschriftungen, fehlende Werte bleiben leer oder bekommen einen Fehlendcode, nie 0. Ob die Tabelle breit oder lang steht, hängt vom Verfahren ab.', 'One row per observation (usually per person), one column per variable, one value per cell. Codes get labels, missing values stay empty or get a missing-value code, never 0. Whether the table is wide or long depends on the procedure.'),
      { h: P('Zeilen und Spalten', 'Rows and columns') },
      { ul: [
        P('Eine Spalte enthält eine Größe in einer Einheit. Zwei Angaben in einer Zelle („12 kg, 3 Jahre“) lassen sich nicht rechnen.', 'A column holds one variable in one unit. Two pieces of information in one cell ("12 kg, 3 years") cannot be calculated with.'),
        P('Eine Kennung je Person (zum Beispiel P01) erlaubt später das Zusammenführen und Umformen. Namen taugen nicht als Kennung.', 'An identifier per person (for example P01) allows merging and reshaping later. Names do not make good identifiers.')
      ] },
      { h: P('Codes und Beschriftungen', 'Codes and labels') },
      P('Kategorien werden als Zahlen kodiert (1 = weiblich, 2 = männlich, 3 = divers). Die Wertebeschriftung sagt, was jeder Code bedeutet, damit Tabellen und Diagramme lesbar sind; gerechnet wird mit dem Code. Ein Codebuch hält fest, was jede Spalte und jeder Code bedeutet.', 'Categories are coded as numbers (1 = female, 2 = male, 3 = diverse). The value label says what each code means so that tables and charts are readable; calculations use the code. A codebook records what every column and every code means.'),
      { h: P('Fehlende Werte', 'Missing values') },
      P('Lässt jemand eine Frage aus, bleibt die Zelle leer, oder es gilt ein eigener Code wie 99, der als „fehlend“ gekennzeichnet ist. Eine 0 würde als Messwert gezählt und den Mittelwert verfälschen. Rechnungen zählen dann nur die Zeilen mit Wert.', 'If someone skips a question, the cell stays empty, or a code of its own such as 99 applies, marked as "missing". A 0 would be counted as a measured value and distort the mean. Calculations then count only the rows with a value.'),
      { h: P('Breit oder lang?', 'Wide or long?') },
      { ul: [
        P('Breit: eine Zeile je Person, eine Spalte je Zeitpunkt. So erwarten es die Verfahren für Messwiederholung (zum Beispiel vorher und nachher).', 'Wide: one row per person, one column per time point. This is what procedures for repeated measures expect (for example before and after).'),
        P('Lang: eine Zeile je Messung, Spalten für Kennung, Zeitpunkt und Wert. So brauchen es Mehrebenen-Modelle.', 'Long: one row per measurement, columns for ID, time point and value. This is what multilevel models need.')
      ] },
      P('Beispiel: 12 Personen mit 3 Zeitpunkten haben breit 12 Zeilen und 4 Spalten (Kennung und drei Messwerte), lang 36 Zeilen und 3 Spalten (Kennung, Zeitpunkt, Wert). Fehlen drei Werte, bleiben in der langen Form 36 Zeilen, davon 33 mit Wert.', 'Example: 12 people with 3 time points have in the wide form 12 rows and 4 columns (ID and three values), in the long form 36 rows and 3 columns (ID, time point, value). If three values are missing, the long form keeps 36 rows, 33 of them with a value.'),
      { h: P('So geht es in Statable', 'How it works in Statable') },
      { ol: [
        P('Unter „Lernen“ die Einheit öffnen: „Selbst rechnen“, danach „Beispiel“ mit dem Beispiel „Hilft das Lesetraining?“.', 'Under "Learning" open the unit: "Work it out yourself", then "Example" with the example "Does the reading training help?".'),
        P('Auf der Seite „Daten“ wandelt „Umstrukturieren“ breit in lang um und umgekehrt; die Vorschau zeigt vorher und nachher. Die Zeilenzahl der langen Form lässt sich mit der Rechnung vergleichen (96 Kinder mal 3 Tests).', 'On the page "Data" "Reshape" turns wide into long and back; the preview shows before and after. The number of rows of the long form can be compared with the calculation (96 children times 3 tests).')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      { ul: [
        P('Leer und 0 bedeuten nicht dasselbe: leer heißt „nicht bekannt“, 0 ist ein Messwert.', 'Empty and 0 do not mean the same: empty means "not known", 0 is a measured value.')
      ] },
      falsch(P('Eine leere Zelle und eine 0 bedeuten dasselbe.', 'An empty cell and a 0 mean the same.'),
        P('Leer heißt „nicht bekannt“, 0 ist ein gemessener Wert. Werden beide verwechselt, verschieben sich Mittelwerte und Fallzahlen.', 'Empty means "not known", 0 is a measured value. If the two are confused, means and numbers of cases shift.')),
      { h: P('Für Fachleute', 'For specialists') },
      P('Die lange Form entspricht dem „tidy“-Format: eine Zeile je Beobachtung, eine Spalte je Variable. Die Zahl der Zeilen der langen Form ist Personen mal Messzeitpunkte, bei einem unvollständigen Plan die Zahl der vorhandenen Messungen.', 'The long form corresponds to the "tidy" format: one row per observation, one column per variable. The number of rows of the long form is people times measurement points, with an incomplete design the number of measurements present.'),
      { h: P('Quellen', 'Sources') },
      P('Zu Datenanlage und Formaten gibt es keine eigene Quelle in der Sammlung; der Text beruht auf gängiger Praxis und auf der Hilfe zum Umstrukturieren.', 'For data setup and formats there is no source of its own in the collection; the text rests on common practice and on the help on reshaping.'),
      mitnehmen(
        P('Eine Zeile je Beobachtung, eine Spalte je Größe.', 'One row per observation, one column per variable.'),
        P('Codes brauchen Wertelabels und ein Codebuch.', 'Codes need value labels and a codebook.'),
        P('Fehlende Werte werden gekennzeichnet, nie mit 0 gefüllt.', 'Missing values are marked, never filled with 0.'),
        P('Die lange Form hat Personen mal Messzeitpunkte Zeilen, bei Lücken entsprechend weniger.', 'The long form has people times points in time rows, fewer if there are gaps.')
      )
    ], ['umstrukturieren', 'daten-seite'])
];
