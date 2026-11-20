/**
 * Üben: Was leisten die weiteren Wege für Zeitreihen, und was bedeutet ihre Ausgabe? (Funktionsfragen, Charge 4, 01.11.2026)
 * Kreuzkorrelation, unterbrochene Zeitreihe (Maßnahme), Granger-Test, Saisonbereinigung. Quelle: die Hilfe-Artikel und die Fachblätter MASSNAHME
 * und SAISON-EUROSTAT (Belege `Hilfe:<id>`, `Fachblatt:<NAME>`). Ohne Zahlen aus Rechnungen und ohne Tabellen.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage, ThemaModul } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });

export const FRAGEN: Frage[] = [
  {
    id: 'zr-kreuz-richtung', thema: 'zeit', karte: 'zeitreihen',
    stamm: P('Die Kreuzkorrelation zeigt in Statable ihren höchsten Wert bei einem positiven k. Was heißt das?', 'The cross-correlation in Statable shows its highest value at a positive k. What does that mean?'),
    antworten: [
      a(P('Die erste Reihe liegt vorn, die zweite folgt k Schritte später; R zählt umgekehrt', 'The first series leads, the second follows k steps later; R counts oppositely'),
        P('Statable definiert r(k) als Korrelation der ersten Reihe zur Zeit t mit der zweiten zur Zeit t + k. Wer Zahlen aus R vergleicht, dreht das Vorzeichen von k.', 'Statable defines r(k) as the correlation of the first series at time t with the second at time t + k. Anyone comparing numbers from R flips the sign of k.'), true),
      a(P('Die zweite Reihe liegt vorn, und die erste folgt ihr erst k Schritte später nach', 'The second series leads, and the first follows it only k steps later'),
        P('Das wäre ein negatives k in der Definition von Statable. Positives k heißt: Die erste Reihe liegt vorn.',
          'That would be a negative k in the definition used by Statable. A positive k means: the first series leads.')),
      a(P('Beide Reihen sind um k Schritte gegen den Kalender verschoben, also zeitlich versetzt', 'Both series are shifted by k steps against the calendar, that is offset in time'),
        P('Die Kreuzkorrelation verschiebt die Reihen gegeneinander, nicht gegen den Kalender. Beide Reihen brauchen dieselben Zeitpunkte.',
          'The cross-correlation shifts the series against each other, not against the calendar. Both series need the same points in time.'))
    ],
    hilfe: ['zeitreihe-kreuzkorrelation'], belege: ['Hilfe:zeitreihe-kreuzkorrelation', 'Fachblatt:MASSNAHME']
  },
  {
    id: 'zr-kreuz-auto', thema: 'zeit', karte: 'zeitreihen',
    stamm: P('In der Kreuzkorrelation schlagen viele Stäbe über die Grenzen aus, obwohl die Reihen nichts miteinander zu tun haben. Woran kann das liegen?',
      'Many bars in the cross-correlation exceed the limits although the series have nothing to do with each other. What can be the cause?'),
    antworten: [
      a(P('Hängt eine Reihe stark von ihrer Vergangenheit ab, sind die Grenzen zu eng; erst Differenzen', 'If a series depends strongly on its own past, the limits are too narrow; difference first'),
        P('Die Grenzen setzen voraus, dass die Reihen für sich weißes Rauschen sind. Die Differenzen entstehen im Assistenten "Verschieben und glätten".', 'The limits assume that the series are white noise on their own. The differences arise in the assistant "Shift and smooth".'), true),
      a(P('Statable rechnet bei der Kreuzkorrelation zu viele Verzögerungen und verschiebt dadurch die Grenzen nach innen', 'Statable computes too many lags for the cross-correlation and thereby shifts the limits inwards'),
        P('Die Zahl der Verzögerungen ist nicht die Ursache. Bei zufälligen Reihen wäre schon ein Stab unter mehreren häufig draußen; das Hauptproblem ist die Autokorrelation.',
          'The number of lags is not the cause. With random series at least one bar out of several is often outside; the main problem is autocorrelation.')),
      a(P('Die Reihen sind zu kurz, darum gelten die Grenzen nur für Monatswerte mit vollen Jahren', 'The series are too short, so the limits apply only to monthly values with full years'),
        P('Eine Beschränkung auf Monatswerte gibt es nicht. Gebraucht werden gleiche Zeitpunkte, mindestens 10 Plätze und höchstens 10 % Lücken.',
          'There is no restriction to monthly values. What is needed are identical points in time, at least 10 places and at most 10% gaps.'))
    ],
    hilfe: ['zeitreihe-kreuzkorrelation'], belege: ['Hilfe:zeitreihe-kreuzkorrelation', 'Fachblatt:MASSNAHME']
  },
  {
    id: 'zr-mass-zeitpunkt', thema: 'zeit', karte: 'zeitreihen',
    stamm: P('Bei der unterbrochenen Zeitreihe ("Hat die Maßnahme gewirkt?") fragt Statable nach dem Zeitpunkt der Maßnahme. Wann wird er festgelegt?',
      'In the interrupted time series ("Did the measure work?") Statable asks for the time of the measure. When is it fixed?'),
    antworten: [
      a(P('Vorher; wer ihn aus den Daten sucht und dann testet, bekommt zu kleine p-Werte', 'Beforehand; picking it from the data and then testing makes p values too small'),
        P('"Die Maßnahme gilt ab" ist Pflicht und hat keine Vorgabe. Auch der Vorschlag für das Modell nutzt nur die Werte vor der Maßnahme.', '"The measure applies from" is required and has no default. Even the model suggestion uses only the values before the measure.'), true),
      a(P('Erst nach dem Blick auf die Reihe, am besten am größten Sprung der Werte', 'Only after looking at the series, preferably at the biggest jump in the values'),
        P('Ein im Nachhinein gewählter Zeitpunkt passt sich den Daten an. Dann sind die p-Werte zu klein.',
          'A point in time chosen afterwards adapts to the data. Then the p values are too small.')),
      a(P('Statable wählt ihn selbst aus den Daten, mit dem Vorschlag für das ARIMA-Modell', 'Statable chooses it itself from the data, with the suggestion for the ARIMA model'),
        P('Der Vorschlag betrifft nur das Modell, und er rechnet nichts. Den Zeitpunkt der Maßnahme wählt immer die Person.',
          'The suggestion concerns only the model, and it computes nothing. The time of the measure is always chosen by the person.'))
    ],
    hilfe: ['zeitreihe-massnahme'], belege: ['Hilfe:zeitreihe-massnahme', 'Fachblatt:MASSNAHME']
  },
  {
    id: 'zr-mass-ljung', thema: 'zeit', karte: 'zeitreihen',
    stamm: P('Bei der unterbrochenen Zeitreihe ist der Ljung-Box-Test auffällig. Was folgt für den geschätzten Effekt?',
      'In the interrupted time series the Ljung-Box test is conspicuous. What follows for the estimated effect?'),
    antworten: [
      a(P('Das Modell erfasst das Muster nicht ganz; p des Effekts ist zu optimistisch', 'The model does not capture the whole pattern; p of the effect is too optimistic'),
        P('Der Ljung-Box-Test prüft, ob die Fehler des Modells noch zusammenhängen. Ein anderes Modell zu wählen, kann helfen.', 'The Ljung-Box test checks whether the errors of the model are still related. Choosing another model may help.'), true),
      a(P('Der Effekt der Maßnahme ist damit bestätigt, denn der Test hat ein Muster gefunden', 'The effect of the measure is thereby confirmed, since the test has found a pattern'),
        P('Der Test sagt nichts über die Wirkung. Auch bei unauffälligem Test bleibt die Ursache offen: Alles, was zur selben Zeit geschah, steckt im Effekt.',
          'The test says nothing about the effect. Even with an inconspicuous test the cause stays open: everything that happened at the same time is part of the effect.')),
      a(P('Die Reihe ist saisonal und muss zuerst mit X-13 bereinigt werden, bevor man rechnet', 'The series is seasonal and must first be adjusted with X-13 before one calculates'),
        P('Saisonale Muster erfasst der Saisonteil des Modells. Der Test zeigt nur, dass die Fehler noch Struktur haben.',
          'Seasonal patterns are captured by the seasonal part of the model. The test shows only that the errors still have structure.'))
    ],
    hilfe: ['zeitreihe-massnahme'], belege: ['Hilfe:zeitreihe-massnahme', 'Fachblatt:MASSNAHME']
  },
  {
    id: 'zr-granger-k', thema: 'zeit', karte: 'zeitreihen',
    stamm: P('Beim Granger-Test muss die Zahl der Verzögerungen k gewählt werden. Wie geht man richtig vor?', 'In the Granger test the number of lags k has to be chosen. What is the right approach?'),
    antworten: [
      a(P('k vorab wählen; das kleinste p aus mehreren k zu nehmen macht p zu klein', 'Choose k beforehand; taking the smallest p of several k misleads'),
        P('Das Ergebnis gilt für genau dieses k. Ein zu großes k kostet Fälle und Kraft, ein zu kleines lässt längere Zusammenhänge aus.', 'The result holds for exactly this k. A k that is too large costs cases and power, one that is too small leaves out longer relationships.'), true),
      a(P('Das k mit dem kleinsten p übernehmen, weil es den Zusammenhang am besten zeigt', 'Take the k with the smallest p because it shows the relationship best'),
        P('Wer aus mehreren k das kleinste p wählt, testet mehrfach. Das macht die p-Werte zu klein.',
          'Whoever picks the smallest p from several k tests repeatedly. That makes the p values too small.')),
      a(P('k so groß wie möglich wählen, damit kein längerer Zusammenhang verpasst wird', 'Choose k as large as possible so that no longer relationship is missed'),
        P('Erlaubt ist ein Viertel der Reihe, aber ein großes k kostet Fälle und Kraft. Größer ist nicht besser.',
          'A quarter of the series is allowed, but a large k costs cases and power. Bigger is not better.'))
    ],
    hilfe: ['zeitreihe-granger'], belege: ['Hilfe:zeitreihe-granger', 'Fachblatt:MASSNAHME']
  },
  {
    id: 'zr-granger-name', thema: 'zeit', karte: 'zeitreihen',
    stamm: P('Beim Granger-Test helfen frühere Werte der Reihe A, die Reihe B vorherzusagen (signifikant). Was folgt daraus?', 'In the Granger test earlier values of series A help to predict series B (significant). What follows?'),
    antworten: [
      a(P('Ein Hinweis auf die Reihenfolge, aber keine Ursache; ein Dritter kann beide treiben', 'A hint about the order in time, but no cause; a third factor can drive both'),
        P('Auch erwartete Veränderungen können eine Reihe vorauslaufen lassen. Der Name "Granger-Kausalität" ist irreführend.', 'Expected changes can also make a series lead. The name "Granger causality" is misleading.'), true),
      a(P('Die Reihe A verursacht die Reihe B, weil frühere Werte von A die von B bestimmen', 'Series A causes series B, because earlier values of A determine those of B'),
        P('Der Test zeigt nur, dass frühere Werte helfen, die andere Reihe vorherzusagen. Mehr heißt das nicht.',
          'The test only shows that earlier values help to predict the other series. It means no more than that.')),
      a(P('Beide Reihen sind damit stationär, denn sonst hätte der Test keinen Beitrag gefunden', 'Both series are thereby stationary, since otherwise the test would have found no contribution'),
        P('Stationarität ist eine Voraussetzung, kein Ergebnis. Statable zeigt dazu den KPSS-Wert je Reihe; bei Trend sind die p-Werte unzuverlässig.',
          'Stationarity is a prerequisite, not a result. Statable shows the KPSS value for each series; with a trend the p values are unreliable.'))
    ],
    hilfe: ['zeitreihe-granger'], belege: ['Hilfe:zeitreihe-granger', 'Fachblatt:MASSNAHME']
  },
  {
    id: 'zr-saison', thema: 'zeit', karte: 'zeitreihen',
    stamm: P('Warum überlässt Statable die Saisonbereinigung mit X-13 einem Skript in R, statt selbst zu rechnen?', 'Why does Statable leave the seasonal adjustment with X-13 to an R script instead of calculating it itself?'),
    antworten: [
      a(P('X-13 läuft nicht im Browser; Statable liefert CSV und ein R-Skript zum Mitnehmen', 'X-13 does not run in the browser; Statable supplies CSV and an R script to take along'),
        P('Das Skript rechnet in R mit dem Paket seasonal und schreibt eine zweite CSV mit der bereinigten Reihe. Das Ergebnis hat Statable nicht geprüft.', 'The script calculates in R with the package seasonal and writes a second CSV with the adjusted series. Statable has not checked the result.'), true),
      a(P('Die Zerlegung in Trend, Saison und Rest in der Zeitreihen-Auswertung leistet bereits dasselbe', 'The decomposition into trend, season and remainder in the time-series analysis already does the same'),
        P('Die Zerlegung ist keine Saisonbereinigung nach X-13 und heißt auch nicht so. Sie bleibt, wie sie ist.',
          'The decomposition is not a seasonal adjustment by X-13 and is not called that. It remains as it is.')),
      a(P('Saisonbereinigung ist nur bei Tageswerten sinnvoll, und die rechnet Statable nirgends', 'Seasonal adjustment makes sense only for daily values, and Statable calculates those nowhere'),
        P('Angeboten wird sie nur bei Monats- oder Quartalswerten, ohne Lücken und mit mindestens 3 vollen Jahren.',
          'It is offered only for monthly or quarterly values, without gaps and with at least 3 full years.'))
    ],
    hilfe: ['saisonbereinigung-r'], belege: ['Hilfe:saisonbereinigung-r', 'Fachblatt:SAISON-EUROSTAT']
  },
  {
    id: 'zr-mass-mehrfach', thema: 'zeit', mehrfach: true, karte: 'zeitreihen',
    stamm: P('Welche Aussagen zur unterbrochenen Zeitreihe ("Hat die Maßnahme gewirkt?") stimmen? Mehrere können stimmen.', 'Which statements about the interrupted time series ("Did the measure work?") are correct? Several may be correct.'),
    antworten: [
      a(P('Der Satz sagt "ging ... einher" und nicht "bewirkte"', 'The sentence says "went along with" and not "caused"'),
        P('Alles, was zur selben Zeit geschah, steckt im Effekt. Eine ähnliche Reihe ohne Maßnahme wäre ein stärkerer Beleg.', 'Everything that happened at the same time is part of the effect. A similar series without the measure would be stronger evidence.'), true),
      a(P('Unter 50 Werten ist die Modellwahl unsicher; das ist eine übliche Untergrenze für ARIMA', 'Below 50 values the model choice is uncertain; that is a common lower limit for ARIMA'),
        P('Gerechnet wird ab 20 vorhandenen Werten, aber Statable warnt bei weniger als 50.', 'Calculation starts at 20 existing values, but Statable warns below 50.'), true),
      a(P('Eine Stufe fragt nach einem einmaligen Ausschlag, ein Impuls nach einer bleibenden Veränderung', 'A step asks about a one-off spike, an impulse about a lasting change'),
        P('Es ist umgekehrt: Eine Stufe fragt nach einer bleibenden Veränderung des Niveaus, ein Impuls nach einem einmaligen Ausschlag.', 'It is the other way round: a step asks about a lasting change of the level, an impulse about a one-off spike.')),
      a(P('Die Prognose nimmt an, dass die Stufe verschwindet und der Impuls bleibt', 'The forecast assumes that the step disappears and the impulse remains'),
        P('Die Prognose nimmt an, dass die Stufe bestehen bleibt und der Impuls nicht wiederkehrt.', 'The forecast assumes that the step remains and the impulse does not recur.'))
    ],
    hilfe: ['zeitreihe-massnahme'], belege: ['Hilfe:zeitreihe-massnahme', 'Fachblatt:MASSNAHME']
  }
];
export const FAELLE: ThemaModul['FAELLE'] = {};
