/**
 * Üben: Instrumentvariablen (B2 Teil 2b, 14.11.2026; Einheit `instrumentvariablen` in lernen/lernplan-panel.ts). Kennungen `iv-<kürzel>`, Thema `iv`.
 * Alle Zahlen: Zigaretten-Daten (CigarettesSW, 48 US-Staaten, 1995; Ziel log Packungen je Kopf, Preis log real endogen, Einkommen log real) aus scripts/iv-erwartet.R
 * (lib/iv-erwartet.json; AER::ivreg, sandwich, zweiter Weg von Hand); Wächter lernen/fragen-iv.test.ts. Eigene Wortlaute.
 * Quellen: Stock & Watson, Introduction to Econometrics (Zigaretten-Beispiel); Hanck u. a., Introduction to Econometrics with R, Kap. 12 (frei zugänglich).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const SW = 'Stock & Watson, Introduction to Econometrics (Kap. Instrumental Variables Regression)';
const HA = 'Hanck u. a., Introduction to Econometrics with R, Kap. 12 (econometrics-with-r.org)';
const RECHNUNG = 'Rechnung: scripts/iv-erwartet.R';
const KOPF_DE = 'Zigaretten in 48 US-Staaten, 1995 (alles in Logarithmen): Der Verbrauch wird durch den Preis erklärt; als Instrument dient der Steuerunterschied.';
const KOPF_EN = 'Cigarettes in 48 US states, 1995 (everything in logarithms): consumption is explained by price; the tax difference serves as the instrument.';

export const FRAGEN: Frage[] = [
  {
    id: 'iv-grund', thema: 'iv', karte: 'vorhersage',
    stamm: P('Warum kann die gewöhnliche Regression des Verbrauchs auf den Preis verzerrt sein? (Instrumentvariablen)', 'Why can the ordinary regression of consumption on price be biased? (instrumental variables)'),
    antworten: [
      a(P('Der Preis wird auch von der Nachfrage mitbestimmt: Nachfrage und Preis beeinflussen einander, die Regression kann beides nicht trennen', 'The price is also co-determined by demand: demand and price influence each other, and the regression cannot separate the two'), P('Das ist die Endogenität: Die Ursache steckt selbst im System, das sie erklären soll.', 'That is endogeneity: the cause is itself part of the system it is meant to explain.'), true),
      a(P('Weil 48 Staaten zu wenige Fälle für eine Regression sind', 'Because 48 states are too few cases for a regression'), P('Wenige Fälle machen das Ergebnis unsicher, aber nicht verzerrt; mit mehr Fällen bliebe das Problem bestehen.', 'Few cases make the result uncertain but not biased; with more cases the problem would remain.')),
      a(P('Weil Logarithmen nur mit Instrumenten funktionieren', 'Because logarithms only work with instruments'), P('Mit Logarithmen lässt sich auch gewöhnlich rechnen; sie machen nur die Zahl zur Elastizität.', 'Ordinary calculation also works with logarithms; they only make the number an elasticity.')),
      a(P('Weil der Preis eine Zahl ist und kein Ja/Nein', 'Because the price is a number and not a yes/no'), P('Die Art der Spalte hat damit nichts zu tun.', 'The kind of column has nothing to do with it.'))
    ],
    hilfe: ['instrumentvariablen'], belege: [SW, HA, 'Hilfe:instrumentvariablen']
  },
  {
    id: 'iv-instrument', thema: 'iv', karte: 'vorhersage',
    stamm: P('Was muss ein Instrument leisten, damit die zweistufige Rechnung (2SLS) sinnvoll ist? (Instrumentvariablen)', 'What must an instrument achieve for the two-stage calculation (2SLS) to make sense? (instrumental variables)'),
    antworten: [
      a(P('Es muss die Ursache deutlich bewegen (relevant) und darf nur über die Ursache aufs Ergebnis wirken (exogen)', 'It must move the cause clearly (relevant) and may act on the outcome only through the cause (exogenous)'), P('Beide Bedingungen zusammen; die erste lässt sich mit der ersten Stufe prüfen, die zweite nur begründen.', 'Both conditions together; the first can be checked with the first stage, the second can only be argued.'), true),
      a(P('Es muss mit dem Ergebnis möglichst stark zusammenhängen', 'It must be as strongly related to the outcome as possible'), P('Gerade ein eigener Weg zum Ergebnis macht ein Instrument ungültig.', 'An own path to the outcome is exactly what makes an instrument invalid.')),
      a(P('Es muss aus derselben Befragung stammen wie die Ursache', 'It must come from the same survey as the cause'), P('Die Herkunft ist gleichgültig; es kommt auf die Wirkungswege an.', 'The origin does not matter; what counts is the paths of effect.')),
      a(P('Es muss einen p-Wert unter ,05 haben', 'It must have a p value below .05'), P('Ein p-Wert allein sagt nichts über die Gültigkeit; wichtig ist die Stärke (erste-Stufe-F) und die Begründung.', 'A p value alone says nothing about validity; what matters is strength (first-stage F) and the argument.'))
    ],
    hilfe: ['instrumentvariablen'], belege: [SW, 'Hilfe:instrumentvariablen']
  },
  {
    id: 'iv-erste-stufe', thema: 'iv', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Die erste Stufe ergibt F(1; 45) = 45,16. Was sagt das? (Instrumentvariablen)`, `${KOPF_EN} The first stage gives F(1, 45) = 45.16. What does that say? (instrumental variables)`),
    antworten: [
      a(P('Der Steuerunterschied bewegt den Preis deutlich; das Instrument ist nicht schwach (Faustregel: F über 10)', 'The tax difference moves the price clearly; the instrument is not weak (rule of thumb: F above 10)'), P('F = 45,16 liegt weit über der Faustregel von 10: Die Relevanz ist gegeben.', 'F = 45.16 lies far above the rule of thumb of 10: relevance is given.'), true),
      a(P('Der Steuerunterschied ist gültig, es gibt keinen eigenen Weg zur Nachfrage', 'The tax difference is valid, it has no path of its own to demand'), P('Das sagt die erste Stufe nicht; Exogenität lässt sich aus den Daten nicht beweisen.', 'The first stage does not say that; exogeneity cannot be proved from the data.')),
      a(P('Der Preis hat keinen Einfluss auf den Verbrauch', 'Price has no influence on consumption'), P('Die erste Stufe betrifft den Zusammenhang zwischen Instrument und Preis, nicht zwischen Preis und Verbrauch.', 'The first stage concerns the relationship between instrument and price, not between price and consumption.')),
      a(P('Das Ergebnis ist damit bewiesen', 'The result is thereby proven'), P('Auch ein starkes Instrument beweist nichts über seine Gültigkeit.', 'Even a strong instrument proves nothing about its validity.'))
    ],
    hilfe: ['instrumentvariablen'], belege: [SW, RECHNUNG, 'Hilfe:instrumentvariablen']
  },
  {
    id: 'iv-ergebnis', thema: 'iv', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Die gewöhnliche Regression gibt für den Preis −1,4065 (Standardfehler 0,2514), die Rechnung mit Instrument −1,1434 (Standardfehler 0,3595). Was fällt auf? (Instrumentvariablen)`, `${KOPF_EN} Ordinary regression gives −1.4065 for the price (standard error 0.2514), the calculation with the instrument −1.1434 (standard error 0.3595). What stands out? (instrumental variables)`),
    antworten: [
      a(P('Der Schätzwert ist mit Instrument weniger stark, aber der Standardfehler ist größer: Das Instrument kostet Genauigkeit', 'The estimate is weaker with the instrument, but the standard error is larger: the instrument costs precision'), P('Das ist typisch: Es wird nur ein Teil der Schwankung des Preises genutzt, darum ist das Ergebnis unsicherer.', 'That is typical: only part of the variation of the price is used, so the result is less certain.'), true),
      a(P('Die Rechnung mit Instrument ist falsch, weil sie vom gewöhnlichen Ergebnis abweicht', 'The calculation with the instrument is wrong because it differs from the ordinary result'), P('Eine Abweichung ist der Sinn: Sie zeigt, dass die gewöhnliche Regression verzerrt sein kann.', 'A difference is the point: it shows that ordinary regression can be biased.')),
      a(P('Der Standardfehler ist beim Instrument kleiner, weil die Rechnung genauer ist', 'The standard error is smaller with the instrument because the calculation is more precise'), P('Es ist umgekehrt: 0,3595 ist größer als 0,2514.', 'It is the other way round: 0.3595 is larger than 0.2514.')),
      a(P('Beide Zahlen sind gleich, nur anders gerundet', 'Both numbers are the same, only rounded differently'), P('Die Unterschiede sind inhaltlich, nicht durch Rundung.', 'The differences are substantive, not due to rounding.'))
    ],
    hilfe: ['instrumentvariablen'], belege: [SW, HA, RECHNUNG, 'Hilfe:instrumentvariablen']
  },
  {
    id: 'iv-sargan', thema: 'iv', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Mit zwei Instrumenten (Steuerunterschied und Zigarettensteuer) ergibt der Sargan-Test χ²(1) = 0,33, p = ,564. Wie liest man das? (Instrumentvariablen)`, `${KOPF_EN} With two instruments (tax difference and cigarette tax) the Sargan test gives χ²(1) = 0.33, p = .564. How is that read? (instrumental variables)`),
    antworten: [
      a(P('Die beiden Instrumente widersprechen einander nicht; bewiesen ist damit nicht, dass beide gültig sind, denn der Test setzt voraus, dass mindestens eines gültig ist', 'The two instruments do not contradict each other; this does not prove that both are valid, because the test assumes that at least one is valid'), P('Der Sargan-Test prüft nur relativ: Passen mehrere Instrumente zueinander? Ein nicht deutliches Ergebnis ist kein Beweis.', 'The Sargan test only tests relatively: do several instruments fit each other? A non-significant result is no proof.'), true),
      a(P('Beide Instrumente sind damit bewiesen gültig', 'Both instruments are thereby proven valid'), P('Das wäre ein Schluss aus „nicht deutlich“ auf „bewiesen“.', 'That would be a conclusion from "not clear" to "proven".')),
      a(P('Mindestens ein Instrument ist ungültig', 'At least one instrument is invalid'), P('Bei p = ,564 gibt es dafür keinen Hinweis.', 'With p = .564 there is no hint of that.')),
      a(P('Der Test zeigt, ob der Preis endogen ist', 'The test shows whether the price is endogenous'), P('Das prüft der Wu-Hausman-Test; der Sargan-Test prüft die Instrumente.', 'The Wu-Hausman test checks that; the Sargan test checks the instruments.'))
    ],
    hilfe: ['instrumentvariablen'], belege: [SW, RECHNUNG, 'Hilfe:instrumentvariablen']
  },
  {
    id: 'iv-mehrfach', thema: 'iv', mehrfach: true, karte: 'vorhersage',
    stamm: P('Welche Aussagen über Instrumentvariablen stimmen? Mehrere können stimmen. (Instrumentvariablen)', 'Which statements about instrumental variables are true? Several can be true. (instrumental variables)'),
    antworten: [
      a(P('Unter etwa 10 in der erste-Stufe-F gilt ein Instrument als schwach; die Schätzung kann dann stark verzerrt sein.', 'Below about 10 in the first-stage F an instrument is regarded as weak; the estimate can then be strongly biased.'), P('Stimmt: Darum steht die erste-Stufe-F in Statable immer neben dem Ergebnis.', 'True: that is why the first-stage F always stands next to the result in Statable.'), true),
      a(P('Dass das Instrument nur über die Ursache wirkt, lässt sich aus den Daten nicht beweisen, sondern nur mit Sachwissen begründen.', 'That the instrument acts only through the cause cannot be proved from the data, only argued from subject knowledge.'), P('Stimmt: Es ist eine Annahme.', 'True: it is an assumption.'), true),
      a(P('Mit einem sehr starken Instrument (hohes F) ist die Gültigkeit gesichert.', 'With a very strong instrument (high F) validity is secured.'), P('Stimmt nicht: Stärke und Gültigkeit sind zwei verschiedene Dinge.', 'Not true: strength and validity are two different things.')),
      a(P('Das Instrument sollte möglichst stark direkt aufs Ergebnis wirken.', 'The instrument should act as strongly as possible directly on the outcome.'), P('Stimmt nicht: Ein direkter Weg zum Ergebnis macht es ungültig.', 'Not true: a direct path to the outcome makes it invalid.'))
    ],
    hilfe: ['instrumentvariablen'], belege: [SW, HA, 'Hilfe:instrumentvariablen']
  }
];
