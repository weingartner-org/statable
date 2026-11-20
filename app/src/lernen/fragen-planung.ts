/**
 * Üben: Forschungsplanung (V2 Teil 3, 14.11.2026): Einheiten `datenmanagementplan` und `praeregistrierung-planen` (lernen/lernplan-planung.ts), je 4 Fragen, 8 Fragen, Thema `erheben`.
 * Grundlage sind die Hilfe-Artikel `dmp-planen` und `prereg-planen` (hilfe/artikel-planung.ts, `Hilfe:<id>`). Gefragt wird nach Regeln und Begriffen, nicht nach Rechtslage; alle Beispiele sind erfunden.
 * Quellen: Wilkinson u. a. (2016), Scientific Data 3; Simmons, Nelson & Simonsohn (2011), Psychological Science 22; Nosek u. a. (2018), PNAS 115.
 * Formregeln wie `fragen-ausbau.ts`: vier Antworten, genau eine richtig, gleich gebaut, gleiches Klammerwort in einer Frage, keine absoluten Wörter, jede falsche Antwort eine echte Fehlvorstellung, Lösungsplätze verteilt.
 */
import { P } from '../i18n/laufzeit';
import type { Antwort, Frage } from './fragen';

type Paar = ReturnType<typeof P>;
type A = [Paar, Paar];
const a = (t: Paar, w: Paar, richtig?: true): Antwort => ({ text: t, warum: w, ...(richtig ? { richtig } : {}) });

function fr(id: string, artikel: string, belege: string[], stamm: Paar, platz: number, richtig: A, falsch: [A, A, A]): Frage {
  const antworten: Antwort[] = falsch.map(f => a(f[0], f[1]));
  antworten.splice(platz, 0, a(richtig[0], richtig[1], true));
  return { id, thema: 'erheben', stamm, antworten, hilfe: [artikel], belege: [...belege, `Hilfe:${artikel}`] };
}
const WI = 'Wilkinson u. a. 2016, Scientific Data 3, 160018';
const SE = 'Science Europe 2021, Practical Guide to the International Alignment of Research Data Management';
const SI = 'Simmons, Nelson & Simonsohn 2011, Psychological Science 22, 1359-1366';
const NO = 'Nosek u. a. 2018, PNAS 115, 2600-2606';

export const FRAGEN_PLANUNG: Frage[] = [
  fr('eh-pl-dmp-wann', 'dmp-planen', [WI, SE],
    P('Ein Team will 80 Interviews führen und fragt, wann der Datenmanagementplan geschrieben werden soll. Was ist richtig? (Datenmanagementplan)', 'A team wants to conduct 80 interviews and asks when the data management plan is to be written. What is right? (data management plan)'), 1,
    [P('Vor der Erhebung, weil Einwilligung, Speicherort und Löschfrist vorher feststehen müssen (Datenmanagementplan)', 'Before the data collection, because consent, storage and retention must be settled first (data management plan)'),
     P('Was nachher aufgeschrieben wird, ist ein Bericht. Einwilligung und Schutz lassen sich nach den Interviews nicht mehr nachholen.', 'What is written down afterwards is a report. Consent and protection cannot be made up after the interviews.')],
    [[P('Nach der Erhebung, weil man dann weiß, welche Daten wirklich entstanden sind (Datenmanagementplan)', 'After the data collection, because then one knows which data really arose (data management plan)'),
      P('Dann ist vieles entschieden oder verpasst. Der Plan darf angepasst werden, aber er beginnt vorher.', 'Then much is decided or missed. The plan may be adjusted, but it begins beforehand.')],
     [P('Erst bei der Abgabe der Arbeit, weil der Förderer ihn dann verlangt (Datenmanagementplan)', 'Only at hand-in of the work, because the funder then requires it (data management plan)'),
      P('Förderer verlangen ihn oft schon beim Antrag. Sein Wert liegt darin, Entscheidungen früh zu erzwingen.', 'Funders often require it already at the application. Its worth is to force decisions early.')],
     [P('Erst dann, wenn eine Förderung vorliegt und der Förderer ihn ausdrücklich verlangt (Datenmanagementplan)', 'Only when funding is granted and the funder explicitly requires it (data management plan)'),
      P('Personenbezogene Daten brauchen Einwilligung und Schutz, auch ohne Förderer. Der Plan hilft dabei.', 'Personal data need consent and protection, also without a funder. The plan helps with that.')]]),
  fr('eh-pl-dmp-daten', 'dmp-planen', [WI, SE],
    P('Eine Studie hat Fragebögen auf Papier, die eingetippte Tabelle ohne Tippfehler und ein Kodebuch mit den Bedeutungen der Codes. Was ist was? (Datenarten)', 'A study has paper questionnaires, the typed table without typing errors and a codebook with the meanings of the codes. What is what? (kinds of data)'), 3,
    [P('Papier sind Rohdaten, die bereinigte Tabelle aufbereitete Daten, das Kodebuch Dokumentation (Datenarten)', 'Paper is raw data, the cleaned table is processed data, the codebook is documentation (kinds of data)'),
     P('Rohdaten sind, wie sie erhoben wurden; aufbereitet ist bereinigt und kodiert; die Dokumentation erklärt beides.', 'Raw data are as collected; processed means cleaned and coded; the documentation explains both.')],
    [[P('Die bereinigte Tabelle sind Rohdaten, das Papier Dokumentation, das Kodebuch aufbereitete Daten (Datenarten)', 'The cleaned table is raw data, the paper is documentation, the codebook is processed data (kinds of data)'),
      P('Das Papier ist die Erhebung selbst, also Rohdaten; das Kodebuch beschreibt, es enthält keine Antworten.', 'The paper is the collection itself, so raw data; the codebook describes, it holds no answers.')],
     [P('Alle drei sind Rohdaten, weil sie aus derselben Studie stammen (Datenarten)', 'All three are raw data because they come from the same study (kinds of data)'),
      P('Rohdaten, aufbereitete Daten und Dokumentation sind drei verschiedene Dinge mit verschiedenen Aufbewahrungsfragen.', 'Raw data, processed data and documentation are three different things with different questions of retention.')],
     [P('Papier und Tabelle sind Dokumentation, das Kodebuch sind aufbereitete Daten (Datenarten)', 'Paper and table are documentation, the codebook is processed data (kinds of data)'),
      P('Dokumentation heißt: Beschreibung der Daten, nicht die Daten.', 'Documentation means: description of the data, not the data.')]]),
  fr('eh-pl-dmp-pseudo', 'dmp-planen', [WI, SE],
    P('Ein Team ersetzt in Interviews die Namen durch Kennungen und hält die Zuordnungsliste in einem verschlossenen Ordner. Was trifft zu? (Pseudonymisierung)', 'A team replaces the names in interviews by codes and keeps the assignment list in a locked folder. What applies? (pseudonymisation)'), 0,
    [P('Pseudonymisiert: Mit der Liste bleibt die Person bestimmbar, der Schutz gilt weiter (Pseudonymisierung)', 'Pseudonymised: with the list the person remains identifiable, protection still applies (pseudonymisation)'),
     P('Pseudonymisieren trennt Namen und Daten, hebt den Personenbezug aber nicht auf, solange die Liste besteht.', 'Pseudonymising separates names and data but does not remove the personal reference as long as the list exists.')],
    [[P('Die Daten sind anonymisiert, weil kein Name mehr im Text steht (Pseudonymisierung)', 'The data are anonymised because no name is in the text any more (pseudonymisation)'),
      P('Anonym sind Daten erst, wenn niemand mehr bestimmbar ist, auch nicht mit Zusatzwissen oder der Liste.', 'Data are anonymous only when nobody is identifiable any more, not even with additional knowledge or the list.')],
     [P('Die Daten brauchen keinen Schutz mehr, weil die Liste verschlossen ist (Pseudonymisierung)', 'The data need no protection any more because the list is locked (pseudonymisation)'),
      P('Die Daten bleiben personenbezogen; Einwilligung und Schutz gelten weiter.', 'The data remain personal; consent and protection continue to apply.')],
     [P('Die Daten sind erst pseudonymisiert, wenn die Liste gelöscht wurde (Pseudonymisierung)', 'The data are pseudonymised only when the list has been deleted (pseudonymisation)'),
      P('Ohne Liste wären sie eher anonym. Pseudonymisieren heißt gerade, die Liste getrennt aufzubewahren.', 'Without the list they would rather be anonymous. Pseudonymising means precisely to keep the list apart.')]]),
  fr('eh-pl-dmp-fair', 'dmp-planen', [WI, SE],
    P('Eine Studie mit sensiblen Interviews soll FAIR sein. Wie geht das? (FAIR-Grundsätze)', 'A study with sensitive interviews is to be FAIR. How does that work? (FAIR principles)'), 2,
    [P('Die Daten bleiben geschützt, werden aber beschrieben und mit fester Adresse auffindbar gemacht; der Zugang ist geregelt (FAIR-Grundsätze)', 'The data stay protected but are described and made findable with a persistent address; access is regulated (FAIR principles)'),
     P('FAIR verlangt Beschreibung, Auffindbarkeit und einen klaren Zugangsweg, nicht die Freigabe sensibler Inhalte.', 'FAIR asks for description, findability and a clear way of access, not release of sensitive content.')],
    [[P('Die Transkripte werden öffentlich ins Netz gestellt, damit alle sie lesen können (FAIR-Grundsätze)', 'The transcripts are published on the web so that everyone can read them (FAIR principles)'),
      P('FAIR heißt nicht „für alle offen“. Personenbezogene Daten bleiben geschützt.', 'FAIR does not mean "open to all". Personal data remain protected.')],
     [P('Sensible Daten sind für FAIR ungeeignet und werden deshalb nicht beschrieben (FAIR-Grundsätze)', 'Sensitive data are unsuitable for FAIR and are therefore not described (FAIR principles)'),
      P('Auch geschützte Daten lassen sich beschreiben und auffindbar machen; so erfährt man, dass es sie gibt und wie man Zugang beantragt.', 'Protected data can also be described and made findable; so one learns that they exist and how to apply for access.')],
     [P('Die Daten werden in einem eigenen Dateiformat ohne Dokumentation abgelegt, damit sie sicher sind (FAIR-Grundsätze)', 'The data are stored in a format of their own without documentation so that they are safe (FAIR principles)'),
      P('Interoperabel und wiederverwendbar heißt: gängige Formate und Dokumentation. Ein Geheimformat verhindert das.', 'Interoperable and reusable means: common formats and documentation. A secret format prevents that.')]]),

  fr('eh-pl-pr-trennen', 'prereg-planen', [SI, NO],
    P('Nach dem Erheben fällt einem Team auf, dass die Gruppe mit dem Training in einer Nebenfrage besser abschneidet. Was gilt? (bestätigend und erkundend)', 'After collecting, a team notices that the training group does better on a side question. What applies? (confirmatory and exploratory)'), 1,
    [P('Das ist ein erkundender Befund: ein Hinweis für die nächste Studie, offen als nachträglich zu berichten (bestätigend und erkundend)', 'That is an exploratory finding: a hint for the next study, to be reported openly as post hoc (confirmatory and exploratory)'),
     P('Was nicht vorab geplant war, bestätigt nichts; es darf aber berichtet werden, wenn es als erkundend gekennzeichnet ist.', 'What was not planned beforehand confirms nothing; it may be reported, though, if marked as exploratory.')],
    [[P('Das ist ein bestätigender Befund, weil das Ergebnis klar ausfiel (bestätigend und erkundend)', 'That is a confirmatory finding because the result was clear (confirmatory and exploratory)'),
      P('Bestätigend wird ein Ergebnis durch den Plan vor den Daten, nicht durch seine Deutlichkeit.', 'A result becomes confirmatory through the plan before the data, not through its clarity.')],
     [P('Das darf nicht berichtet werden, weil eine Präregistrierung Zusatzbefunde verbietet (bestätigend und erkundend)', 'That must not be reported because a preregistration forbids additional findings (confirmatory and exploratory)'),
      P('Die Präregistrierung trennt Geplantes von Erkundetem. Berichten ist erlaubt, wenn es gekennzeichnet ist.', 'The preregistration separates the planned from the explored. Reporting is allowed if it is marked.')],
     [P('Das wird rückwirkend in den Plan eingetragen, damit es bestätigend zählt (bestätigend und erkundend)', 'That is entered into the plan retroactively so that it counts as confirmatory (confirmatory and exploratory)'),
      P('Ein nachträglich geänderter Plan hat seinen Zweck verloren. Der Zeitstempel zeigt die ursprüngliche Fassung.', 'A plan changed afterwards has lost its purpose. The timestamp shows the original version.')]]),
  fr('eh-pl-pr-flexibel', 'prereg-planen', [SI],
    P('Ohne Plan probiert ein Team zwei Zielgrößen, drei Ausschlussregeln und mehrere Zeitpunkte zum Aufhören und berichtet nur die Auswertung mit einem p unter 0,05. Was ist das Problem? (Forschungsfreiheitsgrade)', 'Without a plan a team tries two outcomes, three exclusion rules and several stopping points and reports only the analysis with a p below 0.05. What is the problem? (researcher degrees of freedom)'), 3,
    [P('Jede Wahl nach Sicht der Daten erhöht die Chance auf einen falsch-positiven Befund, berichtet wird nur der Gewinner (Forschungsfreiheitsgrade)', 'With each choice after seeing the data the chance of a false-positive finding rises, and the report shows only the winner (researcher degrees of freedom)'),
     P('Die Zahl der Wege vervielfacht die Chancen auf ein p unter 0,05, auch wenn kein Effekt besteht (Simmons u. a. 2011).', 'The number of paths multiplies the chances of a p below 0.05, even if there is no effect (Simmons et al. 2011).')],
    [[P('Es gibt kein Problem, weil jede einzelne Auswertung für sich korrekt gerechnet ist und deshalb stimmt (Forschungsfreiheitsgrade)', 'There is no problem, because each single analysis is calculated correctly on its own (researcher degrees of freedom)'),
      P('Die einzelne Rechnung stimmt, aber die Auswahl nach dem Ergebnis macht das berichtete p irreführend.', 'The single calculation is right, but the selection by the result makes the reported p misleading.')],
     [P('Dass zu wenige Personen befragt wurden, was ein größerer Datensatz sofort behebt (Forschungsfreiheitsgrade)', 'That too few people were surveyed, which a larger data set fixes at once (researcher degrees of freedom)'),
      P('Mehr Personen helfen der Genauigkeit, nicht der Auswahl nach dem Ergebnis; die Freiheitsgrade bleiben.', 'More people help precision, not the selection by the result; the degrees of freedom remain.')],
     [P('Dass die Grenze von 0,05 zu streng ist und auf 0,10 erhöht werden sollte (Forschungsfreiheitsgrade)', 'That the limit of 0.05 is too strict and should be raised to 0.10 (researcher degrees of freedom)'),
      P('Ein lockereres Niveau vermehrt falsch-positive Befunde noch.', 'A looser level increases false-positive findings further.')]]),
  fr('eh-pl-pr-stempel', 'prereg-planen', [NO, 'Center for Open Science, Vorlage OSF Preregistration'],
    P('Eine Person schreibt ihre Präregistrierung als Datei und legt sie auf den eigenen Rechner. Reicht das als Präregistrierung? (Zeitstempel)', 'A person writes the preregistration as a file and puts it on their own computer. Is that enough as a preregistration? (timestamp)'), 0,
    [P('Nein, denn erst ein Register mit Datum belegt, dass der Plan vor den Daten feststand (Zeitstempel)', 'No, because only a registry with a date shows that the plan was fixed before the data (timestamp)'),
     P('Eine Datei auf dem eigenen Rechner lässt sich ändern, ohne dass es jemand sieht. Das Register macht den Zeitpunkt prüfbar.', 'A file on your own computer can be changed without anyone seeing it. The registry makes the time checkable.')],
    [[P('Ja, denn das Änderungsdatum der Datei auf dem Rechner ist der Zeitstempel (Zeitstempel)', 'Yes, because the change date of the file on the computer is the timestamp (timestamp)'),
      P('Das Dateidatum lässt sich ändern und überzeugt Dritte nicht.', 'The file date can be changed and does not convince third parties.')],
     [P('Ja, denn Statable vergibt beim Speichern des Plans einen Zeitstempel (Zeitstempel)', 'Yes, because Statable gives the timestamp when saving the plan (timestamp)'),
      P('Statable hinterlegt nichts und vergibt keinen Zeitstempel; das geschieht bei einem Register.', 'Statable deposits nothing and gives no timestamp; that happens at a registry.')],
     [P('Ja, wenn der Plan per Mail an die Betreuung geht, denn Mails tragen ein Datum (Zeitstempel)', 'Yes, if the plan goes by mail to the supervisor, since mails carry a date (timestamp)'),
      P('Eine Mail kann helfen, ist aber kein öffentlich prüfbarer Eintrag; Register sind dafür gebaut.', 'A mail can help but is not a publicly checkable entry; registries are built for that.')]]),
  fr('eh-pl-pr-grenze', 'prereg-planen', [NO],
    P('Eine Studie wurde präregistriert und hielt sich an den Plan. Was folgt daraus? (Präregistrierung)', 'A study was preregistered and followed the plan. What follows from that? (preregistration)'), 2,
    [P('Erkennbar ist, was vorab geplant war; ob die Hypothese stimmt, zeigen erst Daten und Wiederholungen (Präregistrierung)', 'It shows what was planned beforehand; whether the hypothesis is true only data and replications show (preregistration)'),
     P('Die Präregistrierung macht die Auswertung nachvollziehbar, sie beweist weder Effekt noch Qualität.', 'The preregistration makes the analysis traceable; it proves neither effect nor quality.')],
    [[P('Die Hypothese ist damit bewiesen, weil der Plan vorher feststand und eingehalten wurde (Präregistrierung)', 'The hypothesis is thereby proved, because the plan was fixed beforehand and followed (preregistration)'),
      P('Ein Plan beweist nichts; das Ergebnis kann der Hypothese auch widersprechen.', 'A plan proves nothing; the result can also contradict the hypothesis.')],
     [P('Die Studie braucht keine gute Messung und Fallzahl mehr, weil der Plan sie ersetzt (Präregistrierung)', 'The study needs no good measurement and sample size any more because the plan replaces them (preregistration)'),
      P('Eine Präregistrierung ersetzt keine gute Studie; Messung und Fallzahl müssen im Plan begründet sein.', 'A preregistration does not replace a good study; measurement and sample size must be justified in the plan.')],
     [P('Eine Abweichung vom Plan macht die Studie ungültig und muss verschwiegen werden (Präregistrierung)', 'A deviation from the plan makes the study invalid and must be concealed (preregistration)'),
      P('Abweichungen sind erlaubt, wenn sie offen mit Grund berichtet werden; verschwiegen werden sie nicht.', 'Deviations are allowed if reported openly with reason; they are not concealed.')]])
];
