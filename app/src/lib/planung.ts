/**
 * Forschungsplanung (Stufe V2): Datenmanagementplan (DMP) und Präregistrierung als Fragelisten in eigener Kurzfassung
 * (Fachblatt `docs/ausbau/FACHBLATT-V2-FORSCHUNGSPLANUNG.md`).
 *
 * Quellen der Gliederung: Science Europe (2021), Practical Guide to the International Alignment of Research Data Management (sechs Kernbereiche);
 * Center for Open Science, Vorlage „OSF Preregistration“ (Studieninformation, Design, Stichprobe, Variablen, Analyseplan, Sonstiges).
 * Kein Satz der Vorlagen wird übernommen: Fragen und Hilfen sind eigene, kurze Texte in einfacher Sprache. Kennungen sind fest (`dmp-1-1` … `pre-6-2`).
 *
 * Regeln: Keine Gesamtnote und kein Prozentwert, nur „x von n bearbeitet“ und „noch offen“. Was Statable aus dem Projekt weiß, ist nur ein
 * Hinweis; er wird beim Öffnen berechnet und nie als Antwort gespeichert. Nie Text aus Dokumenten oder Antworten, nur Zahlen und Arten.
 * Statable reicht nichts irgendwo ein und bewertet den Plan nicht.
 */
import { L } from './sitzung.svelte';
import type { FragebogenPlan } from './fragebogenplan';

export const PLAN_LISTEN = ['dmp', 'prereg'] as const;
export type PlanListe = typeof PLAN_LISTEN[number];
export const PLAN_STAENDE = ['ausgefuellt', 'offen', 'nicht-zutreffend'] as const;
export type PlanStand = typeof PLAN_STAENDE[number];
/** Was die Person eingetragen hat. Ohne Stand und ohne Text wird nichts gespeichert. */
export interface PlanAntwort { kennung: string; stand?: PlanStand; text?: string; geaendert: number }
export interface Planung { liste: PlanListe; antworten: PlanAntwort[] }

export interface PlanFrage {
  kennung: string;
  /** Nummer des Bereichs (1 bis 6) */
  bereich: number;
  /** Thema als englischer Fachbegriff */
  begriff: string;
  frage: () => string;
  hilfe: () => string;
}

const BEREICH_DMP: ((() => string))[] = [
  () => L('Daten beschreiben und erheben (data description and collection)', 'Data description and collection'),
  () => L('Dokumentation und Datenqualität (documentation and data quality)', 'Documentation and data quality'),
  () => L('Speichern und Sichern (storage and backup)', 'Storage and backup'),
  () => L('Recht und Ethik (legal and ethical requirements)', 'Legal and ethical requirements'),
  () => L('Teilen und Aufbewahren (data sharing and long-term preservation)', 'Data sharing and long-term preservation'),
  () => L('Zuständigkeiten und Mittel (responsibilities and resources)', 'Responsibilities and resources'),
];
const BEREICH_PRE: ((() => string))[] = [
  () => L('Studieninformation (study information)', 'Study information'),
  () => L('Design (design plan)', 'Design plan'),
  () => L('Stichprobe (sampling plan)', 'Sampling plan'),
  () => L('Variablen (variables)', 'Variables'),
  () => L('Analyseplan (analysis plan)', 'Analysis plan'),
  () => L('Sonstiges (other)', 'Other'),
];
export const bereichName = (l: PlanListe, nr: number): string => (l === 'dmp' ? BEREICH_DMP : BEREICH_PRE)[nr - 1]!();
export const bereichZahl = (l: PlanListe): number => (l === 'dmp' ? BEREICH_DMP : BEREICH_PRE).length;

type Roh = [string, number, string, [string, string], [string, string]];
const f = (id: string, bereich: number, begriff: string, frage: [string, string], hilfe: [string, string]): Roh => [id, bereich, begriff, frage, hilfe];

const DMP_ROH: Roh[] = [
  f('dmp-1-1', 1, 'Data types and sources', ['Welche Daten entstehen, und woher kommen sie?', 'Which data will arise, and where do they come from?'], ['Zum Beispiel: Antworten eines Online-Fragebogens, Interviewaufnahmen und Transkripte, vorhandene Daten aus einem Archiv.', 'For example: answers from an online questionnaire, interview recordings and transcripts, existing data from an archive.']),
  f('dmp-1-2', 1, 'Volume and formats', ['Wie viele Daten sind es ungefähr, und in welchen Dateiformaten?', 'Roughly how much data is it, and in which file formats?'], ['Zahl der Personen und Dateien, grobe Größe, Formate wie CSV, SAV, DOCX, WAV. Offene Formate sind auf Dauer sicherer.', 'Number of people and files, rough size, formats like CSV, SAV, DOCX, WAV. Open formats are safer in the long run.']),
  f('dmp-1-3', 1, 'Re-use of existing data', ['Verwenden Sie vorhandene Daten, und wenn ja, mit welcher Erlaubnis?', 'Do you re-use existing data, and if so under which permission?'], ['Nennen Sie Quelle und Lizenz. Wenn Sie nur selbst erheben, schreiben Sie „keine“.', 'Name the source and licence. If you only collect data yourself, write "none".']),
  f('dmp-2-1', 2, 'Documentation and metadata', ['Wie halten Sie fest, was Variablen, Codes und Werte bedeuten?', 'How do you record what variables, codes and values mean?'], ['Ein Kodebuch (Variablenname, Beschriftung, Werte, Fehlend-Codes) und eine kurze Beschreibung der Erhebung genügen oft.', 'A codebook (variable name, label, values, missing codes) and a short description of the data collection are often enough.']),
  f('dmp-2-2', 2, 'Quality control', ['Wie sichern Sie die Qualität der Daten (Eingabe, Prüfung, Bereinigung)?', 'How do you ensure data quality (entry, checks, cleaning)?'], ['Zum Beispiel Doppeleingabe, Plausibilitätsprüfung, ein Protokoll aller Änderungen an den Rohdaten.', 'For example double entry, plausibility checks, a log of all changes made to the raw data.']),
  f('dmp-2-3', 2, 'Versioning and naming', ['Wie benennen und versionieren Sie Dateien?', 'How do you name and version files?'], ['Eine feste Namensregel und ein Änderungsprotokoll verhindern, dass mehrere „final“-Fassungen entstehen.', 'A fixed naming rule and a change log prevent several "final" versions from piling up.']),
  f('dmp-3-1', 3, 'Storage during the project', ['Wo liegen die Daten während der Arbeit, und wer hat Zugriff?', 'Where do the data live during the work, and who has access?'], ['Ort (Gerät, Laufwerk der Hochschule), Verschlüsselung, Zugriffskreis. Statable selbst speichert nichts außerhalb Ihres Geräts.', 'Place (device, university drive), encryption, circle of access. Statable itself stores nothing outside your device.']),
  f('dmp-3-2', 3, 'Backup', ['Wie und wie oft sichern Sie die Daten?', 'How and how often do you back up the data?'], ['Eine Sicherung an einem anderen Ort als das Original, mit Datum. Prüfen Sie einmal, dass sich die Sicherung öffnen lässt.', 'A backup in a different place from the original, with a date. Check once that the backup actually opens.']),
  f('dmp-3-3', 3, 'Data security', ['Wie schützen Sie sensible Daten (Passwort, Verschlüsselung, getrennte Aufbewahrung)?', 'How do you protect sensitive data (password, encryption, separate storage)?'], ['Bei personenbezogenen Daten: Zuordnungsliste getrennt von den Daten und mit Passwort. Statable kann Projektdateien mit Passwort verschlüsseln.', 'For personal data: keep the key list apart from the data and password protected. Statable can encrypt project files with a password.']),
  f('dmp-4-1', 4, 'Personal data and consent', ['Enthalten die Daten personenbezogene Angaben, und welche Einwilligung liegt vor?', 'Do the data contain personal information, and what consent is there?'], ['Name, Stimme, Adresse, aber auch seltene Merkmalskombinationen. Halten Sie fest, wofür die Personen zugestimmt haben und wie sie widerrufen können.', 'Name, voice, address, but also rare combinations of traits. Record what people agreed to and how they can withdraw.']),
  f('dmp-4-2', 4, 'Anonymisation and pseudonymisation', ['Wie anonymisieren oder pseudonymisieren Sie, und wann?', 'How and when do you anonymise or pseudonymise?'], ['Pseudonymisiert heißt: mit Zuordnungsliste noch rückführbar. Anonym heißt: nicht mehr rückführbar. Das ist ein Unterschied im Datenschutzrecht.', 'Pseudonymised means: still traceable with a key list. Anonymous means: no longer traceable. This makes a difference in data protection law.']),
  f('dmp-4-3', 4, 'Ethics approval and rules', ['Welche Genehmigung (Ethikvotum) und welche Regeln der Hochschule oder des Förderers gelten?', 'Which approval (ethics vote) and which rules of your university or funder apply?'], ['Nennen Sie Stelle und Aktenzeichen, sobald vorhanden. Ob eine Genehmigung nötig ist, klären Sie mit Ihrer Hochschule.', 'Name the body and reference number once you have it. Whether approval is needed is something to settle with your university.']),
  f('dmp-5-1', 5, 'Data sharing', ['Welche Daten teilen Sie nach der Studie, mit wem und unter welcher Lizenz?', 'Which data will you share after the study, with whom and under which licence?'], ['Möglichst offen, so weit Datenschutz und Einwilligung es erlauben („so offen wie möglich, so geschlossen wie nötig“).', 'As open as possible, as far as data protection and consent allow ("as open as possible, as closed as necessary").']),
  f('dmp-5-2', 5, 'Long-term preservation', ['Wo bewahren Sie die Daten langfristig auf, und wie lange?', 'Where will you keep the data long term, and for how long?'], ['Ein Repositorium Ihrer Hochschule oder Ihres Fachs mit dauerhafter Kennung (DOI). Viele Förderer verlangen mindestens zehn Jahre.', 'A repository of your university or field with a persistent identifier (DOI). Many funders ask for at least ten years.']),
  f('dmp-5-3', 5, 'Deletion', ['Welche Daten löschen Sie wann (zum Beispiel Aufnahmen, Kontaktdaten)?', 'Which data do you delete, and when (for example recordings, contact details)?'], ['Nennen Sie je Datenart eine Frist. Aufnahmen werden meist früher gelöscht als Transkripte.', 'Give a deadline for each kind of data. Recordings are usually deleted earlier than transcripts.']),
  f('dmp-6-1', 6, 'Responsibilities', ['Wer ist für was zuständig (Erhebung, Aufbereitung, Sicherung, Weitergabe)?', 'Who is responsible for what (collection, preparation, backup, sharing)?'], ['Eine Person je Aufgabe, mit Vertretung. Auch bei einer Einzelarbeit: Wer übernimmt, wenn Sie ausfallen?', 'One person per task, with a deputy. Even for solo work: who takes over if you are away?']),
  f('dmp-6-2', 6, 'Resources', ['Welche Mittel brauchen Sie für den Umgang mit den Daten (Zeit, Speicher, Software, Kosten)?', 'Which resources do you need for handling the data (time, storage, software, cost)?'], ['Auch Zeit für das Aufbereiten und Dokumentieren zählt. Statable ist frei nutzbar und braucht kein Konto.', 'Time for preparing and documenting counts too. Statable is free to use and needs no account.']),
  f('dmp-6-3', 6, 'Review of the plan', ['Wann prüfen und aktualisieren Sie diesen Plan?', 'When will you review and update this plan?'], ['Ein Plan ist ein lebendes Dokument: etwa nach der Erhebung und vor dem Abschluss.', 'A plan is a living document: for example after data collection and before the end of the project.']),
];

const PRE_ROH: Roh[] = [
  f('pre-1-1', 1, 'Title', ['Wie heißt die Studie?', 'What is the study called?'], ['Ein kurzer, beschreibender Titel.', 'A short, descriptive title.']),
  f('pre-1-2', 1, 'Description', ['Worum geht es in der Studie, in zwei bis drei Sätzen?', 'What is the study about, in two or three sentences?'], ['Fragestellung und Hintergrund, ohne Ergebnisse vorwegzunehmen.', 'Research question and background, without anticipating results.']),
  f('pre-1-3', 1, 'Hypotheses', ['Welche Hypothesen prüfen Sie, jeweils mit erwarteter Richtung?', 'Which hypotheses do you test, each with the expected direction?'], ['Eine Hypothese pro Zeile, so formuliert, dass Daten sie widerlegen könnten. Erkundende Fragen bitte getrennt als solche kennzeichnen.', 'One hypothesis per line, phrased so that data could refute it. Please mark exploratory questions separately as such.']),
  f('pre-2-1', 2, 'Study type', ['Welche Art von Studie ist es (Experiment, Beobachtung, Befragung, andere)?', 'What kind of study is it (experiment, observation, survey, other)?'], ['Bei Experimenten: Zufallszuteilung ja oder nein.', 'For experiments: random assignment yes or no.']),
  f('pre-2-2', 2, 'Study design', ['Welche Gruppen oder Bedingungen und welche Messzeitpunkte gibt es?', 'Which groups or conditions and which measurement points are there?'], ['Zum Beispiel: zwei Gruppen (Training, Kontrolle), Messung vorher und nachher.', 'For example: two groups (training, control), measured before and after.']),
  f('pre-2-3', 2, 'Randomisation and blinding', ['Wie werden Personen zugeteilt, und wer weiß davon (Verblindung)?', 'How are people assigned, and who knows about it (blinding)?'], ['Beschreiben Sie das Verfahren (zum Beispiel Zufallszahlen, Block-Zuteilung). „Nicht zutreffend“ bei Befragungen ohne Zuteilung.', 'Describe the procedure (for example random numbers, block assignment). "Not applicable" for surveys without assignment.']),
  f('pre-3-1', 3, 'Existing data', ['Haben Sie die Daten schon gesehen oder erhoben, bevor Sie diesen Plan schreiben?', 'Have you already seen or collected the data before writing this plan?'], ['Ehrlich eintragen: noch nicht erhoben, erhoben aber nicht angesehen, oder schon angesehen. Das ändert, wie belastbar die Vorab-Festlegung ist.', 'Be honest: not yet collected, collected but not looked at, or already looked at. This changes how firm the advance commitment is.']),
  f('pre-3-2', 3, 'Sample and recruitment', ['Wen sprechen Sie an, und wie finden Sie die Teilnehmenden?', 'Whom do you address, and how do you find the participants?'], ['Grundgesamtheit, Auswahl, Ein- und Ausschlusskriterien.', 'Population, selection, inclusion and exclusion criteria.']),
  f('pre-3-3', 3, 'Sample size', ['Wie groß soll die Stichprobe sein, und warum genau so groß?', 'How large should the sample be, and why exactly that size?'], ['Am besten mit einer Fallzahlplanung (Teststärke). Der Fallzahl-Rechner von Statable gibt Ihnen dafür Zahlen.', 'Ideally with a sample-size calculation (power). Statable\'s sample-size calculator gives you numbers for this.']),
  f('pre-3-4', 3, 'Stopping rule', ['Wann hören Sie mit der Datenerhebung auf?', 'When do you stop collecting data?'], ['Eine feste Regel vorher (Fallzahl erreicht, Datum), nicht „sobald das Ergebnis passt“.', 'A fixed rule beforehand (target size reached, date), not "as soon as the result fits".']),
  f('pre-4-1', 4, 'Manipulated variables', ['Welche Merkmale verändern Sie selbst (Bedingungen, Behandlungen)?', 'Which characteristics do you change yourself (conditions, treatments)?'], ['Nennen Sie jede Bedingung und ihre Stufen. Ohne eigenes Eingreifen: „nicht zutreffend“.', 'Name each condition and its levels. Without intervention: "not applicable".']),
  f('pre-4-2', 4, 'Measured variables', ['Was messen Sie, mit welchem Instrument und in welcher Einheit?', 'What do you measure, with which instrument and in which unit?'], ['Je Variable: Name, Skala, Quelle des Fragebogens. Hier hilft Ihr Fragebogen-Plan.', 'Per variable: name, scale, source of the questionnaire. Your questionnaire plan helps here.']),
  f('pre-4-3', 4, 'Indices and scales', ['Wie bilden Sie Skalen oder Kennzahlen aus Einzelfragen?', 'How do you build scales or indices from single questions?'], ['Mittelwert oder Summe, Umpolung, wie viele fehlende Antworten erlaubt sind.', 'Mean or sum, reverse scoring, how many missing answers are allowed.']),
  f('pre-5-1', 5, 'Statistical models', ['Mit welchem Verfahren prüfen Sie jede Hypothese?', 'With which method do you test each hypothesis?'], ['Zum Beispiel: t-Test für unabhängige Stichproben, Regression mit diesen Variablen. Eine Zeile je Hypothese.', 'For example: independent-samples t-test, regression with these variables. One line per hypothesis.']),
  f('pre-5-2', 5, 'Transformations', ['Verändern Sie Variablen vor der Auswertung (Umpolen, Logarithmus, Gruppieren)?', 'Do you change variables before the analysis (reverse scoring, log, grouping)?'], ['Nennen Sie jede Änderung und den Grund.', 'Name every change and the reason.']),
  f('pre-5-3', 5, 'Inference criteria', ['Welches Signifikanzniveau und welche Korrektur bei mehreren Tests nutzen Sie?', 'Which significance level and which correction for multiple tests do you use?'], ['Zum Beispiel α = 0,05, Holm-Korrektur. Einseitig oder zweiseitig festlegen.', 'For example α = 0.05, Holm correction. Decide one-sided or two-sided.']),
  f('pre-5-4', 5, 'Data exclusion', ['Welche Fälle schließen Sie aus, und nach welcher Regel?', 'Which cases do you exclude, and by which rule?'], ['Regeln vorher festlegen (zum Beispiel unvollständig ausgefüllt, Aufmerksamkeitsfrage nicht bestanden). Ausreißer-Regel gleich mit.', 'Fix rules beforehand (for example incomplete, attention check failed). Include the outlier rule.']),
  f('pre-5-5', 5, 'Missing data', ['Wie gehen Sie mit fehlenden Werten um?', 'How do you deal with missing values?'], ['Zum Beispiel: Fälle mit fehlenden Werten in der Analysevariablen ausschließen, oder multiple Imputation. Begründen Sie kurz.', 'For example: exclude cases with missing values in the analysis variable, or multiple imputation. Give a short reason.']),
  f('pre-5-6', 5, 'Exploratory analyses', ['Welche Analysen sind erkundend und nicht vorab festgelegt?', 'Which analyses are exploratory and not fixed in advance?'], ['Erkunden ist erlaubt, wenn es im Bericht so heißt. Hier steht, was Sie schon jetzt als erkundend einordnen.', 'Exploring is allowed if the report calls it that. Here you list what you already regard as exploratory.']),
  f('pre-6-1', 6, 'Deviations', ['Wie berichten Sie Abweichungen von diesem Plan?', 'How will you report deviations from this plan?'], ['Abweichungen sind normal. Wichtig ist, sie im Bericht offen zu nennen, mit Grund.', 'Deviations are normal. What matters is to name them openly in the report, with the reason.']),
  f('pre-6-2', 6, 'Other', ['Gibt es etwas, das für das Verständnis des Plans wichtig ist und oben nicht passt?', 'Is there anything important for understanding the plan that did not fit above?'], ['Zum Beispiel: Pilotstudie, Genehmigung, Förderer.', 'For example: pilot study, approval, funder.']),
];

const baue = (roh: Roh[]): readonly PlanFrage[] => roh.map(([kennung, bereich, begriff, fr, hi]) => ({ kennung, bereich, begriff, frage: () => L(fr[0], fr[1]), hilfe: () => L(hi[0], hi[1]) }));
export const DMP: readonly PlanFrage[] = baue(DMP_ROH);
export const PREREG: readonly PlanFrage[] = baue(PRE_ROH);
export const fragenDerListe = (l: PlanListe): readonly PlanFrage[] => (l === 'dmp' ? DMP : PREREG);
export const KENNUNG: Record<PlanListe, RegExp> = { dmp: /^dmp-[1-6]-[1-3]$/, prereg: /^pre-[1-6]-[1-6]$/ };

export const listeName = (l: PlanListe): string => (l === 'dmp'
  ? L('Datenmanagementplan (data management plan)', 'Data management plan')
  : L('Präregistrierung (preregistration)', 'Preregistration'));
export const quelleText = (l: PlanListe): string => (l === 'dmp'
  ? L('Eigene Kurzfassung, gegliedert nach den sechs Kernbereichen von Science Europe (2021). Für Förderanträge die Vorlage des Förderers verwenden.', 'Own short version, structured by the six core areas of Science Europe (2021). For grant applications use your funder\'s template.')
  : L('Eigene Kurzfassung, gegliedert wie die Vorlage „OSF Preregistration“ des Center for Open Science. Hochladen müssen Sie selbst; erst ein Register mit Zeitstempel macht daraus eine Präregistrierung.', 'Own short version, structured like the "OSF Preregistration" template of the Center for Open Science. You have to upload it yourself; only a registry with a timestamp makes it a preregistration.'));
export const KEINE_RECHTSBERATUNG = (): string => L(
  'Dies ist eine Arbeitshilfe und keine Rechtsberatung. Ihre Hochschule oder Ihr Förderer kann andere Vorgaben haben; prüfen Sie den Plan dort.',
  'This is a working aid and not legal advice. Your university or funder may have other requirements; check the plan with them.');
export const standText = (s: PlanStand): string =>
  ({ ausgefuellt: L('Ausgefüllt', 'Filled in'), offen: L('Offen', 'Open'), 'nicht-zutreffend': L('Trifft nicht zu', 'Not applicable') })[s];

/* ---- Eintragen ---- */

export const antwortVon = (p: readonly Planung[] | undefined, l: PlanListe, kennung: string): PlanAntwort | undefined =>
  p?.find(x => x.liste === l)?.antworten.find(a => a.kennung === kennung);

/**
 * Stand oder Text setzen. `stand: null` nimmt den Stand zurück. Gespeichert wird eine Antwort nur, wenn sie einen Stand oder einen Text hat;
 * ein leerer Eintrag fällt weg, leere Listen auch (`undefined` = nichts zu speichern).
 */
export function setzeAntwort(p: readonly Planung[] | undefined, l: PlanListe, kennung: string, aenderung: { stand?: PlanStand | null; text?: string }, jetzt = Date.now()): Planung[] | undefined {
  if (!fragenDerListe(l).some(x => x.kennung === kennung)) throw new Error(`Planung: unbekannte Frage ${kennung}`);
  const listen = (p ?? []).map(x => ({ liste: x.liste, antworten: [...x.antworten] }));
  let i = listen.findIndex(x => x.liste === l);
  if (i < 0) { listen.push({ liste: l, antworten: [] }); i = listen.length - 1; }
  const alt = listen[i]!.antworten.find(a => a.kennung === kennung);
  const rest = listen[i]!.antworten.filter(a => a.kennung !== kennung);
  const stand = aenderung.stand === undefined ? alt?.stand : aenderung.stand ?? undefined;
  const text = (aenderung.text ?? alt?.text ?? '').trim();
  if (stand || text) {
    const a: PlanAntwort = { kennung, geaendert: jetzt };
    if (stand) a.stand = stand;
    if (text) a.text = text;
    const reihe = fragenDerListe(l).map(x => x.kennung);
    rest.push(a);
    rest.sort((x, y) => reihe.indexOf(x.kennung) - reihe.indexOf(y.kennung));
  }
  listen[i] = { liste: l, antworten: rest };
  const r = listen.filter(x => x.antworten.length).sort((a, b) => PLAN_LISTEN.indexOf(a.liste) - PLAN_LISTEN.indexOf(b.liste));
  return r.length ? r : undefined;
}

/** Reine Zählung als Arbeitshilfe (keine Note): bearbeitet = Stand „ausgefüllt“ oder „trifft nicht zu“; noch offen = alles andere */
export function zaehlung(p: readonly Planung[] | undefined, l: PlanListe): { n: number; bearbeitet: number; nochOffen: number } {
  const alle = fragenDerListe(l);
  const bearb = alle.filter(q => { const s = antwortVon(p, l, q.kennung)?.stand; return s === 'ausgefuellt' || s === 'nicht-zutreffend'; }).length;
  return { n: alle.length, bearbeitet: bearb, nochOffen: alle.length - bearb };
}

/** Aus der Projektdatei: streng geprüft (jedes Feld einzeln). Wirft bei einer falschen Form, damit nichts still verloren geht; leere Listen fallen weg. */
export function lesePlanung(x: unknown): Planung[] {
  if (!Array.isArray(x)) throw new Error('Planung: Liste erwartet');
  const aus: Planung[] = [];
  for (const e of x) {
    if (!e || typeof e !== 'object') throw new Error('Planung: Eintrag');
    const o = e as Record<string, unknown>;
    const liste = o.liste;
    if (typeof liste !== 'string' || !(PLAN_LISTEN as readonly string[]).includes(liste) || !Array.isArray(o.antworten)) throw new Error('Planung: Liste');
    if (aus.some(a => a.liste === liste)) throw new Error('Planung: doppelte Liste');
    const l = liste as PlanListe, reihe = fragenDerListe(l).map(q => q.kennung), antworten: PlanAntwort[] = [];
    for (const a of o.antworten) {
      if (!a || typeof a !== 'object') throw new Error('Planung: Antwort');
      const r = a as Record<string, unknown>;
      if (typeof r.kennung !== 'string' || !KENNUNG[l].test(r.kennung) || !reihe.includes(r.kennung) || antworten.some(y => y.kennung === r.kennung)) throw new Error('Planung: Kennung');
      if (r.stand !== undefined && !(typeof r.stand === 'string' && (PLAN_STAENDE as readonly string[]).includes(r.stand))) throw new Error('Planung: Stand');
      if (r.text !== undefined && typeof r.text !== 'string') throw new Error('Planung: Text');
      const text = typeof r.text === 'string' ? r.text.slice(0, 20000) : '';
      if (!r.stand && !text) continue;
      const w: PlanAntwort = { kennung: r.kennung, geaendert: typeof r.geaendert === 'number' && Number.isFinite(r.geaendert) ? r.geaendert : 0 };
      if (r.stand) w.stand = r.stand as PlanStand;
      if (text) w.text = text;
      antworten.push(w);
    }
    if (antworten.length) { antworten.sort((a, b) => reihe.indexOf(a.kennung) - reihe.indexOf(b.kennung)); aus.push({ liste: l, antworten }); }
  }
  return aus.sort((a, b) => PLAN_LISTEN.indexOf(a.liste) - PLAN_LISTEN.indexOf(b.liste));
}

/* ---- Hinweise aus dem Projekt („Statable weiß“) ---- */

/** Nur Zahlen, Arten und Einstellungen; nie Text aus Dokumenten oder Antworten. */
export interface PlanQuellen {
  fragebogen?: { seiten: number; fragen: number; itemsInBloecken: number; sprachen: number; skalen: number; pflichtfragen: number; einwilligungsfrage: boolean; verschluesselt: boolean; einmalCodes: boolean };
  qual?: { dokumente: number; transkripte: number; faelle: number; einwilligungen: number; mitWiderruf: number; mitLoeschfrist: number; kodierende: number; kiAngabe?: 'ja' | 'nein' };
  datensatz?: { zeilen: number; spalten: number; mitBeschriftung: number; fehlendCodes: number };
}
export interface PlanHinweis { text: string; ziel?: string; zielText?: string }

/** Zahlen aus einem Fragebogen-Plan (ohne Text) */
export function fragebogenQuelle(plan: FragebogenPlan): NonNullable<PlanQuellen['fragebogen']> {
  let fragen = 0, items = 0, pflicht = 0, einw = !!plan.einwilligung;
  for (const s of plan.elemente) for (const e of s.elemente) {
    if (e.art === 'frage') { fragen++; if (e.pflicht) pflicht++; if (e.typ === 'einwilligung') einw = true; }
    else if (e.art === 'block') { items += e.items.length; if (e.pflicht) pflicht++; }
  }
  return { seiten: plan.elemente.length, fragen, itemsInBloecken: items, sprachen: plan.sprachen.length, skalen: plan.skalen.length, pflichtfragen: pflicht, einwilligungsfrage: einw, verschluesselt: !!plan.empfaenger, einmalCodes: !!plan.codeVerlangt };
}

const n = (z: number, de1: string, deN: string, en1: string, enN: string): string => L(z === 1 ? `1 ${de1}` : `${z} ${deN}`, z === 1 ? `1 ${en1}` : `${z} ${enN}`);

/**
 * Was Statable aus dem Projekt weiß, je Kennung. Nur Hinweise, nie Antwort. Steht nichts im Projekt, gibt es keinen Eintrag.
 * `lokal` = Daten bleiben im Browser (Kernaussage von Statable), steht immer bei Speicherung.
 */
export function planHinweise(q: PlanQuellen): Record<string, PlanHinweis[]> {
  const r: Record<string, PlanHinweis[]> = {};
  const dazu = (ks: string[], h: PlanHinweis) => { for (const k of ks) (r[k] ??= []).push(h); };
  const FB = { ziel: 'fragebogen', zielText: L('Zum Fragebogen-Plan', 'To the questionnaire plan') };
  const fb = q.fragebogen;
  if (fb) {
    const z = fb.fragen + fb.itemsInBloecken;
    dazu(['dmp-1-1', 'pre-4-2'], { text: L(`Fragebogen mit ${n(z, 'Frage oder Item', 'Fragen und Items', 'question or item', 'questions and items')} auf ${n(fb.seiten, 'Seite', 'Seiten', 'page', 'pages')}, in ${n(fb.sprachen, 'Sprache', 'Sprachen', 'language', 'languages')}.`, `Questionnaire with ${n(z, 'Frage oder Item', 'Fragen und Items', 'question or item', 'questions and items')} on ${n(fb.seiten, 'Seite', 'Seiten', 'page', 'pages')}, in ${n(fb.sprachen, 'Sprache', 'Sprachen', 'language', 'languages')}.`), ...FB });
    if (fb.skalen) dazu(['pre-4-3'], { text: L(`Im Fragebogen-Plan sind ${n(fb.skalen, 'Skala', 'Skalen', 'scale', 'scales')} gebildet (Mittelwert oder Summe, Mindestzahl gültiger Antworten).`, `The questionnaire plan defines ${n(fb.skalen, 'Skala', 'Skalen', 'scale', 'scales')} (mean or sum, minimum of valid answers).`), ...FB });
    dazu(['dmp-2-1'], { text: L('Aus dem Fragebogen-Plan entsteht ein Kodebuch (Variablennamen, Beschriftungen, Werte) beim Export.', 'The questionnaire plan produces a codebook (variable names, labels, values) on export.'), ...FB });
    dazu(['dmp-4-1'], { text: fb.einwilligungsfrage ? L('Der Fragebogen enthält eine Einwilligungsfrage.', 'The questionnaire contains a consent question.') : L('Der Fragebogen enthält noch keine Einwilligungsfrage.', 'The questionnaire does not yet contain a consent question.'), ...FB });
    dazu(['dmp-3-3'], { text: fb.verschluesselt ? L('Antworten werden im Gerät der Teilnehmenden verschlüsselt (öffentlicher Schlüssel eingetragen).', 'Answers are encrypted on the participant\'s device (public key entered).') : L('Noch kein Schlüssel für verschlüsselte Antworten eingetragen.', 'No key for encrypted answers entered yet.'), ...FB });
    if (fb.einmalCodes) dazu(['dmp-4-2', 'pre-3-2'], { text: L('Der Fragebogen verlangt einen Einmal-Code (Teilnahme-Code).', 'The questionnaire requires a one-time code (participation code).'), ...FB });
    if (fb.pflichtfragen) dazu(['pre-5-5'], { text: L(`${n(fb.pflichtfragen, 'Frage ist', 'Fragen sind', 'question is', 'questions are')} als Pflicht gesetzt; dort fehlen keine Antworten.`, `${n(fb.pflichtfragen, 'Frage ist', 'Fragen sind', 'question is', 'questions are')} marked as required; there are no missing answers there.`), ...FB });
  }
  const ql = q.qual;
  if (ql) {
    const INT = { ziel: 'interviews', zielText: L('Zur Seite Interviews', 'To the interviews page') };
    if (ql.dokumente) dazu(['dmp-1-1', 'dmp-1-2'], { text: L(`Qualitatives Projekt: ${n(ql.dokumente, 'Dokument', 'Dokumente', 'document', 'documents')}, davon ${n(ql.transkripte, 'Transkript', 'Transkripte', 'transcript', 'transcripts')}, ${n(ql.faelle, 'Fall', 'Fälle', 'case', 'cases')}.`, `Qualitative project: ${n(ql.dokumente, 'Dokument', 'Dokumente', 'document', 'documents')}, of which ${n(ql.transkripte, 'Transkript', 'Transkripte', 'transcript', 'transcripts')}, ${n(ql.faelle, 'Fall', 'Fälle', 'case', 'cases')}.`), ...INT });
    if (ql.einwilligungen) dazu(['dmp-4-1'], { text: L(`Einwilligungen erfasst: ${ql.einwilligungen}${ql.mitWiderruf ? `, davon mit Widerruf: ${ql.mitWiderruf}` : ''}.`, `Consents recorded: ${ql.einwilligungen}${ql.mitWiderruf ? `, of which with withdrawal: ${ql.mitWiderruf}` : ''}.`), ...INT });
    if (ql.mitLoeschfrist) dazu(['dmp-5-3'], { text: L(`Für ${n(ql.mitLoeschfrist, 'Einwilligung', 'Einwilligungen', 'consent', 'consents')} sind Löschfristen eingetragen.`, `Deletion deadlines are entered for ${n(ql.mitLoeschfrist, 'Einwilligung', 'Einwilligungen', 'consent', 'consents')}.`), ...INT });
    if (ql.kodierende) dazu(['dmp-6-1'], { text: L(`Im Projekt eingetragene Kodierende: ${ql.kodierende}.`, `Coders entered in the project: ${ql.kodierende}.`) });
    if (ql.kiAngabe) dazu(['dmp-4-3'], { text: ql.kiAngabe === 'ja' ? L('KI-Nutzung im Projekt offengelegt: ja.', 'AI use disclosed in the project: yes.') : L('KI-Nutzung im Projekt offengelegt: keine KI genutzt.', 'AI use disclosed in the project: no AI used.'), ziel: 'kodieren/nachvollziehbarkeit', zielText: L('Zur KI-Angabe', 'To the AI statement') });
    dazu(['pre-6-2'], { text: L('Für qualitative Studien gibt es eigene Vorlagen zur Vorregistrierung; diese Liste ist für Studien mit Zahlen gedacht.', 'Qualitative studies have their own preregistration templates; this list is meant for studies with numbers.') });
  }
  const ds = q.datensatz;
  if (ds) {
    dazu(['dmp-1-2'], { text: L(`Datensatz: ${n(ds.zeilen, 'Fall', 'Fälle', 'case', 'cases')}, ${n(ds.spalten, 'Spalte', 'Spalten', 'column', 'columns')}.`, `Dataset: ${n(ds.zeilen, 'Fall', 'Fälle', 'case', 'cases')}, ${n(ds.spalten, 'Spalte', 'Spalten', 'column', 'columns')}.`), ziel: 'daten', zielText: L('Zur Datenansicht', 'To the data view') });
    dazu(['dmp-2-1'], { text: L(`${ds.mitBeschriftung} von ${ds.spalten} Spalten haben eine Beschriftung${ds.fehlendCodes ? `, ${n(ds.fehlendCodes, 'Fehlend-Code ist', 'Fehlend-Codes sind', 'missing code is', 'missing codes are')} benannt` : ''}.`, `${ds.mitBeschriftung} of ${ds.spalten} columns have a label${ds.fehlendCodes ? `, ${n(ds.fehlendCodes, 'Fehlend-Code ist', 'Fehlend-Codes sind', 'missing code is', 'missing codes are')} named` : ''}.`), ziel: 'daten', zielText: L('Zur Datenansicht', 'To the data view') });
    dazu(['pre-3-3'], { text: L(`Im Datensatz stehen ${n(ds.zeilen, 'Fall', 'Fälle', 'case', 'cases')}. Eine Fallzahl in der Präregistrierung gehört VOR die Erhebung.`, `The dataset has ${n(ds.zeilen, 'Fall', 'Fälle', 'case', 'cases')}. A sample size in a preregistration belongs BEFORE the collection.`) });
  }
  dazu(['dmp-3-1'], { text: L('Statable rechnet im Browser; Ihre Daten verlassen Ihr Gerät nicht. Wo Sie die Projektdatei ablegen, bestimmen Sie.', 'Statable computes in the browser; your data do not leave your device. You decide where to store the project file.') });
  return r;
}

/* ---- Word ---- */

type Sp = 'de' | 'en';

/** Eine Liste als Word-Dokument: Kopf mit Quellenhinweis und Hinweis „keine Rechtsberatung“, dann je Bereich eine Überschrift und je Frage Antwort und Stand. */
export async function planungWord(name: string, p: readonly Planung[] | undefined, l: PlanListe, sprache: Sp): Promise<Uint8Array> {
  const sp: Sp = sprache === 'en' ? 'en' : 'de', de = sp === 'de';
  const { wordWerkzeug } = await import('./nachvollziehbarkeit');
  const w = await wordWerkzeug(sp);
  const titel = l === 'dmp' ? (de ? 'Datenmanagementplan' : 'Data management plan') : (de ? 'Präregistrierung' : 'Preregistration');
  const z = zaehlung(p, l);
  type Teil = ReturnType<typeof w.ue> | ReturnType<typeof w.absatz> | ReturnType<typeof w.tabelle>;
  const k: Teil[] = [
    w.ue(titel, 'TITLE'),
    w.absatz(name),
    w.absatz(quelleText(l), { italics: true }),
    w.absatz(KEINE_RECHTSBERATUNG(), { italics: true }),
    w.absatz(de ? `${z.bearbeitet} von ${z.n} Fragen bearbeitet. Den Stand hat die forschende Person gesetzt; die Liste ist keine Bewertung der Studie.` : `${z.bearbeitet} of ${z.n} questions worked on. The status was set by the researcher; the list is not a rating of the study.`),
  ];
  let bereich = 0;
  for (const q of fragenDerListe(l)) {
    if (q.bereich !== bereich) { bereich = q.bereich; k.push(w.ue(`${bereich}. ${bereichName(l, bereich)}`, 'HEADING_1')); }
    const a = antwortVon(p, l, q.kennung);
    k.push(w.ue(q.frage(), 'HEADING_2'));
    k.push(w.absatz(a?.text ?? (a?.stand === 'nicht-zutreffend' ? (de ? 'Trifft nicht zu.' : 'Not applicable.') : (de ? '(noch nicht beantwortet)' : '(not answered yet)')), a?.text ? {} : { italics: true }));
    if (a?.stand) k.push(w.absatz(`${de ? 'Stand' : 'Status'}: ${standText(a.stand)}`, { italics: true }));
  }
  return w.fertig(titel, k);
}
