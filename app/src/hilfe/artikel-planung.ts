/**
 * Hilfe-Artikel und Lehreinheiten zur Forschungsplanung (V2 Teil 3, 14.11.2026): `dmp-planen` (Datenmanagementplan) und `prereg-planen` (Präregistrierung in Statable),
 * zugleich die Erklärung der Einheiten `datenmanagementplan` und `praeregistrierung-planen` (lernen/lernplan-planung.ts). Nur Deutsch und Englisch, jeder Text ein Textpaar P(de, en).
 * Die Fragen der Seite „Studie planen“ stehen in lib/planung.ts. Die allgemeine Erklärung der Vorregistrierung steht schon im Artikel `sf-vorregistrierung` (Pfad „Sauber forschen“);
 * hier steht nur, was für die Planung in Statable und für die Unterscheidung bestätigend/erkundend neu ist (keine Doppelung). Keine Zahlen aus Daten, nur Begriffe und Regeln.
 * Quellen (eigene Worte, keine Aufgabe aus einem Buch): Wilkinson u. a. (2016), Scientific Data 3; Science Europe (2021), Practical Guide to the International Alignment of Research Data
 * Management; Simmons, Nelson & Simonsohn (2011), Psychological Science 22; Nosek u. a. (2018), PNAS 115; Center for Open Science, Vorlage „OSF Preregistration“.
 */
import { P } from '../i18n/laufzeit';
import { a, falsch, mitnehmen, type Roh } from './artikel-roh';

const Q_DMP = P('Wilkinson, M. D. u. a. (2016). The FAIR Guiding Principles for scientific data management and stewardship. Scientific Data, 3, 160018 (frei zugänglich). Science Europe (2021). Practical Guide to the International Alignment of Research Data Management, Extended Edition (frei zugänglich).',
  'Wilkinson, M. D. et al. (2016). The FAIR Guiding Principles for scientific data management and stewardship. Scientific Data, 3, 160018 (open access). Science Europe (2021). Practical Guide to the International Alignment of Research Data Management, Extended Edition (open access).');
const Q_PREREG = P('Simmons, J. P., Nelson, L. D. & Simonsohn, U. (2011). False-positive psychology: Undisclosed flexibility in data collection and analysis allows presenting anything as significant. Psychological Science, 22, 1359-1366. Nosek, B. A. u. a. (2018). The preregistration revolution. Proceedings of the National Academy of Sciences, 115, 2600-2606 (frei zugänglich). Center for Open Science: Vorlage „OSF Preregistration“ (frei zugänglich).',
  'Simmons, J. P., Nelson, L. D. & Simonsohn, U. (2011). False-positive psychology: Undisclosed flexibility in data collection and analysis allows presenting anything as significant. Psychological Science, 22, 1359-1366. Nosek, B. A. et al. (2018). The preregistration revolution. Proceedings of the National Academy of Sciences, 115, 2600-2606 (open access). Center for Open Science: template "OSF Preregistration" (open access).');

const WEG = (kopf: ReturnType<typeof P>) => ({ ol: [
  P('Auf der Startseite „Studie anlegen“ öffnen, einen Namen eingeben und das Kästchen „Danach die Studie planen“ ankreuzen. Oder auf der Seite „Fragebogen planen“ den Sprung „Zur Planung“ nehmen. Strg+K: „Datenmanagementplan“ oder „Präregistrierung“.',
    'On the start page open "Create a study", enter a name and tick "Plan the study afterwards". Or take the jump "To the planning" on the page "Plan a questionnaire". Ctrl+K: "data management plan" or "preregistration".'),
  kopf,
  P('Bei jeder Frage den Stand wählen (Ausgefüllt, Offen, Trifft nicht zu) und den Text schreiben. Statable setzt nichts vor; ohne Stand steht die Frage auf „Offen“.',
    'For each question choose the status (Done, Open, Does not apply) and write the text. Statable presets nothing; with no status the question stays "Open".'),
  P('Unter „Statable weiß“ stehen Zahlen aus dem Projekt (zum Beispiel wie viele Fragen der Fragebogen hat). „Als Antwort übernehmen“ hängt den Satz an den Text an; Inhalt von Dokumenten kommt nie hinein.',
    'Under "Statable knows" there are numbers from the project (for example how many questions the questionnaire has). "Take over as answer" appends the sentence to the text; content of documents never goes in.'),
  P('Mit „Als Word-Datei“ wird der Plan zum Abgeben oder Hinterlegen gespeichert. Der Plan liegt im Projekt und bleibt im Browser.',
    'With "As Word file" the plan is saved for handing in or depositing. The plan lies in the project and stays in the browser.')
] });

export const ROH_PLANUNG: Roh[] = [
  a('dmp-planen', 'verstehen', P('Was geschieht mit meinen Daten, bevor, während und nachdem ich forsche? (Datenmanagementplan, FAIR)', 'What happens to my data before, during and after my research? (data management plan, FAIR)'),
    P('Datenmanagementplan DMP Forschungsdaten FAIR auffindbar zugänglich interoperabel wiederverwendbar Rohdaten Dokumentation Repositorium Löschfrist Pseudonymisierung Anonymisierung Förderer', 'data management plan DMP research data FAIR findable accessible interoperable reusable raw data documentation repository retention period pseudonymisation anonymisation funder'),
    [
      { h: P('Kurz', 'In brief') },
      P('Ein Datenmanagementplan (DMP, data management plan) legt vor der Erhebung fest, wie mit den Daten umgegangen wird: was entsteht, wo es liegt, wer darauf zugreifen darf, wie lange es aufbewahrt wird und wo es am Ende hinkommt. Viele Förderer verlangen ihn. Sein Wert liegt aber darin, dass er Entscheidungen zwingt, die sonst erst im Streit oder beim Datenverlust fallen. Er gehört also an den Anfang, nicht als Papier an das Ende.',
        'A data management plan (DMP) fixes before the data collection how the data are handled: what arises, where it lies, who may access it, how long it is kept and where it ends up. Many funders require it. Its worth, however, is that it forces decisions that otherwise fall only in a dispute or at data loss. So it belongs at the start, not as a form for the end.'),
      { h: P('Was in den Plan gehört', 'What belongs in the plan') },
      { ul: [
        P('Welche Daten entstehen: Rohdaten (so, wie sie erhoben wurden), aufbereitete Daten (bereinigt, kodiert) und Dokumentation (Kodebuch, Fragebogen, Regeln der Aufbereitung). Die Dokumentation macht Daten erst für andere und für das spätere Ich lesbar.', 'Which data arise: raw data (as collected), processed data (cleaned, coded) and documentation (codebook, questionnaire, rules of processing). The documentation first makes data readable for others and for the later self.'),
        P('Personenbezug: Wer erkannt werden könnte, braucht Einwilligung und Schutz. Pseudonymisieren heißt, Namen durch Kennungen zu ersetzen und die Zuordnungsliste getrennt zu halten; die Person bleibt dann mit der Liste bestimmbar. Anonymisieren heißt, dass auch mit Zusatzwissen niemand mehr bestimmbar ist; das ist bei Texten und kleinen Gruppen schwer.', 'Personal reference: people who could be recognised need consent and protection. Pseudonymising means replacing names by codes and keeping the assignment list apart; with the list the person remains identifiable. Anonymising means that nobody is identifiable even with additional knowledge; with texts and small groups that is hard.'),
        P('Speicherung und Zugriff: wo liegen die Daten, wer darf wie zugreifen, wie wird gesichert (Sicherungskopie, Verschlüsselung).', 'Storage and access: where the data lie, who may access them and how, how they are backed up (backup, encryption).'),
        P('Aufbewahrung und Löschung: Fristen kommen aus den Regeln der Hochschule, des Förderers und der Einwilligung; was darüber hinaus nicht nötig ist, wird gelöscht.', 'Retention and deletion: periods come from the rules of the university, the funder and the consent; what is not needed beyond them is deleted.'),
        P('Weitergabe und Archiv: in ein Repositorium (Archiv für Forschungsdaten) mit Beschreibung und fester Adresse, wenn Einwilligung und Rechte es erlauben; sonst nur die Beschreibung der Daten.', 'Sharing and archive: into a repository (archive for research data) with description and a persistent address, if consent and rights allow; otherwise only the description of the data.'),
        P('Zuständigkeit: wer was tut und wer bei Fragen entscheidet.', 'Responsibility: who does what and who decides in case of questions.')
      ] },
      { h: P('FAIR in vier Wörtern', 'FAIR in four words') },
      P('Die FAIR-Grundsätze (Wilkinson u. a. 2016) wollen Daten auffindbar (findable: Beschreibung und feste Adresse), zugänglich (accessible: klarer Weg, auch mit Schutzbedingungen), interoperabel (interoperable: gängige Formate, erklärte Begriffe) und wiederverwendbar (reusable: Dokumentation und Lizenz) machen. FAIR heißt nicht „frei für alle“: Daten mit Personenbezug können FAIR beschrieben und trotzdem geschützt sein.',
        'The FAIR principles (Wilkinson et al. 2016) want data to be findable (description and persistent address), accessible (clear way, also with protection conditions), interoperable (common formats, explained terms) and reusable (documentation and licence). FAIR does not mean "free for everyone": data with personal reference can be described FAIR and still protected.'),
      { h: P('So geht es in Statable', 'How to do it in Statable') },
      WEG(P('Auf der Seite „Studie planen“ die Liste „Datenmanagementplan“ wählen (18 Fragen in sechs Gruppen).', 'On the page "Plan the study" choose the list "Data management plan" (18 questions in six groups).')),
      { h: P('Grenzen', 'Limits') },
      { ul: [
        P('Statable gibt keine Rechtsauskunft und bewertet den Plan nicht. Es gibt keine Gesamtnote, nur „x von n bearbeitet“.', 'Statable gives no legal advice and does not assess the plan. There is no overall grade, only "x of n done".'),
        P('Die Fragen sind eine eigene Kurzfassung und ersetzen die Vorlage Ihres Förderers oder Ihrer Hochschule nicht; wo eine verlangt wird, deren Vorlage ausfüllen.', 'The questions are our own short version and do not replace the template of your funder or university; where one is required, fill in that template.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      falsch(P('Der Datenmanagementplan ist Papierkram, den man nach der Studie ausfüllt.', 'The data management plan is a form to be filled in after the study.'),
        P('Er ist eine Planung vor der Erhebung. Was erst danach aufgeschrieben wird, ist ein Bericht, kein Plan, und die Entscheidungen (zum Beispiel Löschfristen und Einwilligung) lassen sich dann oft nicht mehr nachholen.', 'It is a planning before the data collection. What is written down only afterwards is a report, not a plan, and the decisions (for example retention periods and consent) can often no longer be made up.')),
      falsch(P('Pseudonymisiert und anonymisiert ist dasselbe.', 'Pseudonymised and anonymised are the same.'),
        P('Bei Pseudonymen gibt es noch eine Zuordnungsliste, die Daten bleiben personenbezogen und brauchen Schutz. Anonym sind Daten erst, wenn niemand mehr bestimmbar ist.', 'With pseudonyms an assignment list still exists, the data remain personal and need protection. Data are anonymous only when nobody is identifiable any more.')),
      { h: P('Quellen', 'Sources') },
      Q_DMP,
      mitnehmen(
        P('Der Datenmanagementplan (DMP) kommt vor die Erhebung; er zwingt zu Entscheidungen über Daten, Schutz, Aufbewahrung und Ablage.', 'The data management plan (DMP) comes before the data collection; it forces decisions on data, protection, retention and archiving.'),
        P('Rohdaten, aufbereitete Daten und Dokumentation sind drei verschiedene Dinge; ohne Dokumentation sind Daten schwer wiederzuverwenden.', 'Raw data, processed data and documentation are three different things; lacking documentation, data are hard to reuse.'),
        P('Pseudonym heißt: bestimmbar mit der Zuordnungsliste; anonym heißt: nicht mehr bestimmbar.', 'Pseudonym means: identifiable with the assignment list; anonymous means: no longer identifiable.'),
        P('FAIR (auffindbar, zugänglich, interoperabel, wiederverwendbar) heißt nicht, dass alle alles sehen dürfen.', 'FAIR (findable, accessible, interoperable, reusable) does not mean that everybody may see everything.')
      )
    ], ['eh-anonym-pseudonym', 'sf-vorregistrierung', 'eh-einwilligung-prozess']),

  a('prereg-planen', 'verstehen', P('Wie halte ich Hypothesen und Auswertung vorab fest? (Präregistrierung, bestätigend und erkundend)', 'How do I fix hypotheses and analysis beforehand? (preregistration, confirmatory and exploratory)'),
    P('Präregistrierung Vorregistrierung bestätigend erkundend explorativ Forschungsfreiheitsgrade Zeitstempel Register OSF Abweichung Hypothese Abbruchregel Ausschlussregel qualitative Studie Studie planen', 'preregistration confirmatory exploratory researcher degrees of freedom timestamp registry OSF deviation hypothesis stopping rule exclusion rule qualitative study plan the study'),
    [
      { h: P('Kurz', 'In brief') },
      P('Die allgemeine Erklärung (was in einen Analyseplan gehört, ein Rechenbeispiel von Hand) steht im Artikel „Was wird vorab festgelegt? (Vorregistrierung)“. Hier geht es um zwei Dinge, die für das Planen in Statable zählen: den Unterschied zwischen bestätigender und erkundender Analyse und das, was eine Präregistrierung nicht leistet.',
        'The general explanation (what belongs in an analysis plan, an example calculated by hand) is in the article "What is fixed beforehand? (preregistration)". Here two things count for planning in Statable: the difference between confirmatory and exploratory analysis, and what a preregistration does not do.'),
      { h: P('Bestätigend und erkundend', 'Confirmatory and exploratory') },
      P('Eine bestätigende (confirmatory) Analyse prüft eine Hypothese, die vor dem Blick auf die Daten feststand, mit einem Plan, der vorher feststand. Eine erkundende (exploratory) Analyse sucht in den Daten nach Mustern und ist wertvoll, liefert aber Hinweise für die nächste Studie, keine Prüfung. Die Präregistrierung verbietet das Erkunden nicht, sie trennt beides sichtbar. Wer flexibel auswertet (andere Zielgröße, andere Ausschlüsse, später aufhören) und nur das Ergebnis mit p unter 0,05 berichtet, erhöht die Zahl falsch-positiver Ergebnisse stark (Simmons u. a. 2011; Forschungsfreiheitsgrade).',
        'A confirmatory analysis tests a hypothesis that was fixed before looking at the data, with a plan that was fixed beforehand. An exploratory analysis searches the data for patterns and is valuable, but yields hints for the next study, not a test. Preregistration does not forbid exploring, it separates both visibly. Whoever analyses flexibly (other outcome, other exclusions, stopping later) and reports only the result with p below 0.05 greatly increases the number of false-positive results (Simmons et al. 2011; researcher degrees of freedom).'),
      { h: P('Was in die Präregistrierung gehört', 'What belongs in the preregistration') },
      { ul: [
        P('Hypothesen mit Richtung und Begründung, Stichprobe mit Fallzahl, Abbruchregel und Ausschlussregeln, Variablen und Messinstrumente, Modell und Umgang mit fehlenden Werten, Korrektur bei mehreren Tests. Die 21 Fragen in Statable folgen dieser Gliederung als eigene Kurzfassung.', 'Hypotheses with direction and reasoning, sample with size, stopping rule and exclusion rules, variables and instruments, model and handling of missing values, correction for several tests. The 21 questions in Statable follow this outline as our own short version.'),
        P('Wo hinterlegt: bei einem Register, das ein Datum festhält und spätere Änderungen sichtbar lässt (zum Beispiel OSF Registries). Ein Text nur auf dem eigenen Rechner hat keinen Zeitstempel, der Dritte überzeugt.', 'Where deposited: at a registry that records a date and keeps later changes visible (for example OSF Registries). A text only on your own computer has no timestamp that convinces third parties.'),
        P('Abweichungen werden offen berichtet, mit Grund; Zusatzanalysen werden als erkundend gekennzeichnet.', 'Deviations are reported openly, with reason; additional analyses are marked as exploratory.')
      ] },
      { h: P('So geht es in Statable', 'How to do it in Statable') },
      WEG(P('Auf der Seite „Studie planen“ die Liste „Präregistrierung“ wählen (21 Fragen). Die Hypothesen schreiben Sie selbst; Statable schlägt keine vor.', 'On the page "Plan the study" choose the list "Preregistration" (21 questions). You write the hypotheses yourself; Statable suggests none.')),
      { h: P('Grenzen', 'Limits') },
      { ul: [
        P('Statable hinterlegt nichts und vergibt keinen Zeitstempel; die Hinterlegung machen Sie selbst bei einem Register.', 'Statable deposits nothing and gives no timestamp; you do the depositing yourself at a registry.'),
        P('Eine Präregistrierung ersetzt keine gute Studie, und ein eingereichter Plan beweist nichts. Für qualitative Studien gibt es eigene Vorlagen; die Fragen hier sind für Studien mit Hypothesentests gedacht.', 'A preregistration does not replace a good study, and a submitted plan proves nothing. For qualitative studies there are templates of their own; the questions here are meant for studies with hypothesis tests.')
      ] },
      { h: P('Was oft falsch verstanden wird', 'What is often misunderstood') },
      falsch(P('Eine Präregistrierung verbietet es, in den Daten zu erkunden.', 'A preregistration forbids exploring in the data.'),
        P('Sie trennt, was geplant war, von dem, was erst nachher auffiel. Erkunden bleibt möglich und wird als erkundend berichtet.', 'It separates what was planned from what was noticed only afterwards. Exploring remains possible and is reported as exploratory.')),
      falsch(P('Wer präregistriert hat, hat damit seine Hypothese bewiesen.', 'Whoever preregistered has thereby proved the hypothesis.'),
        P('Die Präregistrierung sagt nur, was vorab geplant war. Ob die Hypothese stimmt, zeigen erst die Daten und weitere Studien.', 'The preregistration only says what was planned beforehand. Whether the hypothesis is true is shown only by the data and further studies.')),
      { h: P('Quellen', 'Sources') },
      Q_PREREG,
      mitnehmen(
        P('Bestätigend heißt: Hypothese und Plan standen vor dem Blick auf die Daten fest; erkundend heißt: Muster gesucht, Hinweis für die nächste Studie.', 'Confirmatory means: hypothesis and plan were fixed before looking at the data; exploratory means: patterns searched, a hint for the next study.'),
        P('Flexible Auswertung mit Auswahl des Ergebnisses erhöht die Zahl falsch-positiver Befunde (Forschungsfreiheitsgrade).', 'Flexible analysis with selection of the result increases the number of false-positive findings (researcher degrees of freedom).'),
        P('Der Zeitstempel kommt vom Register, nicht von Statable; Abweichungen werden offen berichtet.', 'The timestamp comes from the registry, not from Statable; deviations are reported openly.'),
        P('Eine Präregistrierung beweist nichts und ersetzt keine gute Studie.', 'A preregistration proves nothing and does not replace a good study.')
      )
    ], ['sf-vorregistrierung', 'sf-p-hacking'])
];
