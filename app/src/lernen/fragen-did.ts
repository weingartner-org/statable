/**
 * Üben: Differenz-in-Differenzen (B2 Teil 2c, 14.11.2026; Einheit `differenz-in-differenzen` in lernen/lernplan-panel.ts). Kennungen `did-<kürzel>`, Thema `did`.
 * Alle Zahlen: Hauspreise nahe einer Müllverbrennungsanlage (kielmc, 321 Verkäufe in North Andover, 1978 und 1981) aus scripts/did-erwartet.R
 * (lib/did-erwartet.json; lm mit Wechselwirkung, sandwich HC1, zweiter Weg über die vier Gruppenmittel); Wächter lernen/fragen-did.test.ts. Eigene Wortlaute.
 * Quellen: Wooldridge, Introductory Econometrics (Kap. Pooled Cross Sections, Differenz-in-Differenzen; Datensatz kielmc); Cunningham, Causal Inference: The Mixtape,
 * Kap. Difference-in-Differences (frei zugänglich); Huntington-Klein, The Effect, Kap. Difference-in-Differences (frei zugänglich).
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

const a = (text: Antwort['text'], warum: Antwort['warum'], richtig?: true): Antwort => ({ text, warum, ...(richtig ? { richtig } : {}) });
const WO = 'Wooldridge, Introductory Econometrics (Differenz-in-Differenzen, Datensatz kielmc)';
const CU = 'Cunningham, Causal Inference: The Mixtape, Kap. Difference-in-Differences (mixtape.scunning.com)';
const RECHNUNG = 'Rechnung: scripts/did-erwartet.R';
const KOPF_DE = 'Hauspreise in North Andover (1978 und 1981, 321 Verkäufe, Preise in Dollar von 1978): Verglichen werden Häuser nahe einer geplanten Müllverbrennungsanlage mit den übrigen.';
const KOPF_EN = 'House prices in North Andover (1978 and 1981, 321 sales, prices in 1978 dollars): houses near a planned waste incinerator are compared with the others.';

export const FRAGEN: Frage[] = [
  {
    id: 'did-idee', thema: 'did', karte: 'vorhersage',
    stamm: P('Was misst die Differenz-in-Differenzen? (Differenz-in-Differenzen)', 'What does the difference-in-differences measure? (difference-in-differences)'),
    antworten: [
      a(P('Um wie viel sich die behandelte Gruppe von vorher zu nachher mehr (oder weniger) geändert hat als die Vergleichsgruppe', 'By how much the treated group changed more (or less) from before to after than the comparison group'), P('Genau das: die Änderung der Behandelten minus die Änderung der Vergleichsgruppe.', 'Exactly that: the change of the treated minus the change of the comparison group.'), true),
      a(P('Den Unterschied zwischen beiden Gruppen nach der Maßnahme', 'The difference between the two groups after the measure'), P('Das wäre nur der Vergleich nachher; er enthält auch Unterschiede, die schon vorher bestanden.', 'That would only be the comparison after; it also contains differences that existed before.')),
      a(P('Die Änderung der behandelten Gruppe allein', 'The change of the treated group alone'), P('Diese Änderung enthält auch alles, was ohnehin im Lauf der Zeit passiert; die Vergleichsgruppe zeigt, wie viel das ist.', 'This change also contains everything that happens over time anyway; the comparison group shows how much that is.')),
      a(P('Den Mittelwert aller Fälle vorher und nachher', 'The mean of all cases before and after'), P('Ein gemeinsamer Mittelwert sagt nichts über die Änderung der Gruppen.', 'A common mean says nothing about the change of the groups.'))
    ],
    hilfe: ['differenz-in-differenzen'], belege: [WO, CU, 'Hilfe:differenz-in-differenzen']
  },
  {
    id: 'did-lesen', thema: 'did', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Die übrigen Häuser stiegen im Mittel von 82517,23 auf 101307,51 (+18790,29), die Häuser nahe der Anlage von 63692,86 auf 70619,24 (+6926,38). Wie groß ist die Differenz-in-Differenzen? (Differenz-in-Differenzen)`, `${KOPF_EN} The other houses rose on average from 82517.23 to 101307.51 (+18790.29), the houses near the plant from 63692.86 to 70619.24 (+6926.38). How large is the difference-in-differences? (difference-in-differences)`),
    antworten: [
      a(P('−11863,90 (6926,38 minus 18790,29)', '−11863.90 (6926.38 minus 18790.29)'), P('Änderung der Behandelten minus Änderung der Vergleichsgruppe.', 'Change of the treated minus change of the comparison group.'), true),
      a(P('+6926,38', '+6926.38'), P('Das ist nur die Änderung der Häuser nahe der Anlage, ohne den Zeitverlauf der übrigen Häuser abzuziehen.', 'That is only the change of the houses near the plant, without subtracting the time path of the other houses.')),
      a(P('+25716,67 (beide Änderungen zusammen)', '+25716.67 (both changes together)'), P('Die beiden Änderungen werden voneinander abgezogen, nicht addiert.', 'The two changes are subtracted from each other, not added.')),
      a(P('−18824,37 (Unterschied der Preise vor der Maßnahme)', '−18824.37 (difference of the prices before the measure)'), P('Das ist der Unterschied der Preise 1978, also vorher; er gehört nicht zur Änderung.', 'That is the difference of the prices in 1978, i.e. before; it does not belong to the change.'))
    ],
    hilfe: ['differenz-in-differenzen'], belege: [WO, RECHNUNG, 'Hilfe:differenz-in-differenzen']
  },
  {
    id: 'did-trends', thema: 'did', karte: 'vorhersage',
    stamm: P('Welche Annahme muss gelten, damit die Differenz-in-Differenzen als Wirkung der Maßnahme gelesen werden darf? (Differenz-in-Differenzen)', 'Which assumption must hold for the difference-in-differences to be read as the effect of the measure? (difference-in-differences)'),
    antworten: [
      a(P('Ohne die Maßnahme wären beide Gruppen gleichlaufend weitergegangen (gleichlaufende Trends)', 'Without the measure both groups would have moved in parallel (parallel trends)'), P('Nur dann ist die Änderung der Vergleichsgruppe ein guter Maßstab dafür, was bei den Behandelten ohnehin passiert wäre.', 'Only then is the change of the comparison group a good yardstick for what would have happened to the treated anyway.'), true),
      a(P('Beide Gruppen müssen vor der Maßnahme gleich hohe Mittelwerte haben', 'Both groups must have equal means before the measure'), P('Die Höhe darf verschieden sein, wie hier (82517,23 gegen 63692,86); gleichlaufend ist der Verlauf gemeint.', 'The level may differ, as here (82517.23 against 63692.86); what must be parallel is the path.')),
      a(P('Die Gruppen müssen gleich groß sein', 'The groups must be equally large'), P('Die Größe der Gruppen ist für die Annahme gleichgültig (hier 123, 102, 56 und 40 Häuser in den vier Zellen).', 'The size of the groups does not matter for the assumption (here 123, 102, 56 and 40 houses in the four cells).')),
      a(P('Der p-Wert der Wechselwirkung muss unter ,05 liegen', 'The p value of the interaction must be below .05'), P('Ein p-Wert prüft nicht die Annahme, sondern eine Null-Wirkung unter der Annahme.', 'A p value does not check the assumption but a zero effect under the assumption.'))
    ],
    hilfe: ['differenz-in-differenzen'], belege: [WO, CU, 'Hilfe:differenz-in-differenzen']
  },
  {
    id: 'did-p', thema: 'did', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Die Differenz-in-Differenzen beträgt −11863,90 (Standardfehler 7456,65, p = ,113; robuster Standardfehler 8635,59, p = ,170). Wie liest man das? (Differenz-in-Differenzen)`, `${KOPF_EN} The difference-in-differences is −11863.90 (standard error 7456.65, p = .113; robust standard error 8635.59, p = .170). How is that read? (difference-in-differences)`),
    antworten: [
      a(P('Die Preise nahe der Anlage stiegen gut 11 Tausend Dollar weniger als die übrigen; aus diesen Daten ist das aber nicht deutlich von Null zu unterscheiden', 'Prices near the plant rose by a good 11 thousand dollars less than the others; from these data this cannot be clearly told from zero'), P('Der Schätzwert ist negativ, aber der p-Wert liegt deutlich über ,05, und die robuste Fassung ist noch weniger deutlich.', 'The estimate is negative, but the p value is clearly above .05, and the robust version is even less clear.'), true),
      a(P('Die Anlage hat die Preise um 11863,90 Dollar gesenkt', 'The plant lowered prices by 11863.90 dollars'), P('Ein Schätzwert ist keine gesicherte Wirkung; hier ist er nicht einmal deutlich von Null verschieden.', 'An estimate is not a secured effect; here it is not even clearly different from zero.')),
      a(P('Die Anlage hat die Preise nicht beeinflusst', 'The plant did not influence prices'), P('Ein nicht deutliches Ergebnis ist kein Beweis für keine Wirkung; die Daten sind nur zu unsicher.', 'A non-significant result is no proof of no effect; the data are just too uncertain.')),
      a(P('Die robuste Rechnung ist fehlerhaft, weil sie vom klassischen Standardfehler abweicht', 'The robust calculation is faulty because it differs from the classical standard error'), P('Eine Abweichung ist erlaubt: Robust rechnet ohne die Annahme gleich großer Streuung in allen Gruppen.', 'A difference is allowed: robust calculation works without the assumption of equal spread in all groups.'))
    ],
    hilfe: ['differenz-in-differenzen', 'cluster-robust'], belege: [WO, RECHNUNG, 'Hilfe:differenz-in-differenzen']
  },
  {
    id: 'did-merkmale', thema: 'did', karte: 'vorhersage',
    stamm: P(`${KOPF_DE} Nimmt man Fläche, Zimmer und Alter ins Modell, ergibt sich −11479,40 (Standardfehler 5302,66, p = ,031; robust 6237,81, p = ,067). Was ist fachlich dazu zu sagen? (Differenz-in-Differenzen)`, `${KOPF_EN} Adding area, rooms and age to the model gives −11479.40 (standard error 5302.66, p = .031; robust 6237.81, p = .067). What is to be said about this? (difference-in-differences)`),
    antworten: [
      a(P('Der Standardfehler wird kleiner, weil die Merkmale den Preis erklären; die Aussage bleibt aber unsicher, denn die robuste Fassung liegt knapp über ,05 und die Annahme gleichlaufender Trends ist damit nicht geprüft', 'The standard error shrinks because the features explain the price; the statement stays uncertain, though, because the robust version is just above .05 and the parallel-trends assumption is not checked by this'), P('Zusätzliche Merkmale machen die Schätzung genauer, aber sie ersetzen nicht die Begründung der Annahme.', 'Additional features make the estimate more precise, but they do not replace the justification of the assumption.'), true),
      a(P('Jetzt ist die Wirkung der Anlage bewiesen, weil der klassische p-Wert unter ,05 liegt', 'Now the effect of the plant is proven because the classical p value is below .05'), P('Wer nur die Fassung nimmt, die unter ,05 liegt, wählt das Ergebnis nach dem Wunsch aus; zudem beweist ein p-Wert keine Ursache.', 'Whoever takes only the version below .05 selects the result by wish; moreover a p value proves no cause.')),
      a(P('Die Merkmale haben den Schätzwert ganz verändert, also war das erste Ergebnis falsch', 'The features changed the estimate completely, so the first result was wrong'), P('Der Schätzwert änderte sich kaum (−11863,90 gegen −11479,40).', 'The estimate changed hardly at all (−11863.90 against −11479.40).')),
      a(P('In diesem Verfahren darf man keine weiteren Merkmale verwenden', 'No further features may be used in this method'), P('Sie dürfen hinein, wenn sie sich zwischen den Zeitpunkten nicht durch die Maßnahme ändern.', 'They may be included if they do not change between the points in time because of the measure.'))
    ],
    hilfe: ['differenz-in-differenzen'], belege: [WO, RECHNUNG, 'Hilfe:differenz-in-differenzen']
  },
  {
    id: 'did-mehrfach', thema: 'did', mehrfach: true, karte: 'vorhersage',
    stamm: P('Welche Aussagen über Differenz-in-Differenzen stimmen? Mehrere können stimmen. (Differenz-in-Differenzen)', 'Which statements about difference-in-differences are true? Several can be true. (difference-in-differences)'),
    antworten: [
      a(P('Mit nur einem Zeitpunkt vorher lässt sich die Annahme gleichlaufender Trends aus den Daten nicht prüfen.', 'With only one point in time before, the parallel-trends assumption cannot be checked from the data.'), P('Stimmt: Zwei Punkte ergeben nur eine Linie; erst mehrere Zeitpunkte vorher zeigen, ob die Verläufe gleichlaufend waren.', 'True: two points give only one line; only several points in time before show whether the paths were parallel.'), true),
      a(P('Die Gruppen dürfen nicht schon vorher auf die erwartete Maßnahme reagiert haben.', 'The groups must not have reacted beforehand to the expected measure.'), P('Stimmt: Sonst ist der Zeitpunkt „vorher“ schon beeinflusst.', 'True: otherwise the point "before" is already influenced.'), true),
      a(P('Die Vergleichsgruppe muss genauso viele Fälle haben wie die behandelte Gruppe.', 'The comparison group must have as many cases as the treated group.'), P('Stimmt nicht: Die Größe spielt für die Annahme keine Rolle.', 'Not true: size plays no role for the assumption.')),
      a(P('Ein deutlicher p-Wert beweist, dass die Maßnahme die Ursache der Änderung ist.', 'A clear p value proves that the measure is the cause of the change.'), P('Stimmt nicht: Er sagt nichts darüber, ob die Annahme gleichlaufender Trends stimmt.', 'Not true: it says nothing about whether the parallel-trends assumption holds.'))
    ],
    hilfe: ['differenz-in-differenzen'], belege: [WO, CU, 'Hilfe:differenz-in-differenzen']
  }
];
