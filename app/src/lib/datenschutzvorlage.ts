/**
 * Datenschutz-Texte für Befragungen ohne Server, Paket 3G. Grundlage: docs/erheben/FACHBLATT-STUFE-3.md (Abschnitt 3G) und
 * docs/machbarkeit-2026-11-08/recherche-D-einlesen.md (Abschnitt 1.4).
 *
 * Geliefert werden VORLAGEN (Deutsch und Englisch), die die forschende Person anpasst. KEINE RECHTSBERATUNG: Das steht in der Word-Fassung als eigener Hinweis
 * und in der Hilfe; im Text für die Befragten steht es nicht (er geht an die Teilnehmenden). Was die forschende Person selbst eintragen muss, steht in eckigen
 * Klammern (`[Kontakt eintragen]`); `offenePlatzhalter` zählt sie, damit die Oberfläche vor dem Verschicken warnen kann.
 *
 * Aussagen zum Verfahren stützen sich auf das, was Statable tut (Antwort wird im Gerät verschlüsselt; keine IP-Adresse, kein Gerät, keine Uhrzeit in der Antwort;
 * höchstens ein Datum) und auf die Einordnung: „Solange keine Antwort über einen Server von Statable läuft, ist Statable nicht Empfänger der Daten.“
 * Rechtliche Begriffe: DSGVO Art. 4 Nr. 5 (Pseudonymisierung), Art. 4 Nr. 7 (Verantwortlicher), Art. 6 Abs. 1 Buchst. a (Einwilligung), Art. 7 Abs. 3 (Widerruf);
 * alle auf eur-lex gelesen (Hilfe-Artikel `eh-datenschutz-ohne-server`).
 */
import type { FragebogenPlan, Lok } from './fragebogenplan';
import { wordStile } from './export';

export type Sprache = 'de' | 'en';
/** Rückwege einer Antwort (Fachblatt 3C und 3F): Datei, Text (zum Kopieren), QR-Code, Teilen-Menü des Geräts, Erhebungsstation. */
export type Rueckweg = 'datei' | 'text' | 'qr' | 'teilen' | 'station';
export interface DatenschutzOptionen {
  /** Welche Rückwege der Fragebogen anbietet; ohne Angabe: Datei und Text. */
  wege?: Rueckweg[];
  /** Zweck in einem Satz (ohne Schlusspunkt zwingend); fehlt er, steht ein Platzhalter. */
  zweck?: string;
  /** Dauer in Minuten (ganze Zahl); fehlt sie, steht ein Platzhalter. */
  dauerMinuten?: number;
  /** Löschfrist als Text („zwei Jahre nach Abschluss der Arbeit“); fehlt sie, steht ein Platzhalter. */
  loeschfrist?: string;
  /** Kontakt (Name, E-Mail oder Anschrift); fehlt er, steht `[Kontakt eintragen]`. */
  kontakt?: string;
  /** Verantwortliche Stelle (Person oder Hochschule); fehlt sie, steht ein Platzhalter. */
  verantwortlich?: string;
  /** Der Fragebogen wird über einen Link geöffnet (nicht als Datei): ergänzt den Satz zum Server, der die Seite ausliefert. */
  link?: boolean;
}
export interface Abschnitt { ueberschrift: string; absaetze: string[]; punkte?: string[] }

const PLATZ = {
  de: { kontakt: '[Kontakt eintragen]', verantwortlich: '[Verantwortliche Stelle eintragen]', zweck: '[Zweck der Befragung eintragen]', dauer: '[Dauer eintragen]', frist: '[Löschfrist eintragen]' },
  en: { kontakt: '[Enter contact]', verantwortlich: '[Enter responsible body]', zweck: '[Enter purpose of the survey]', dauer: '[Enter duration]', frist: '[Enter deletion period]' }
} as const;

export const KEINE_RECHTSBERATUNG = {
  de: 'Dies ist eine Vorlage und keine Rechtsberatung. Passen Sie den Text an Ihre Befragung an und lassen Sie ihn vor dem Verschicken von Ihrer Hochschule oder Ihrer Datenschutzbeauftragten bzw. Ihrem Datenschutzbeauftragten prüfen.',
  en: 'This is a template and not legal advice. Adapt the text to your survey and have your university or your data protection officer check it before you send it out.'
} as const;
/** Die Einordnung zu Statable, wörtlich nach dem Fachblatt. */
export const EINORDNUNG = {
  de: 'Solange keine Antwort über einen Server von Statable läuft, ist Statable nicht Empfänger der Daten; verantwortlich ist die forschende Person bzw. ihre Hochschule.',
  en: 'As long as no answer passes through a Statable server, Statable is not a recipient of the data; the researcher or their university is responsible.'
} as const;

const titelVon = (plan: FragebogenPlan, sp: Sprache) => plan.titel[sp] || plan.titel[plan.sprachen[0] ?? ''] || '';
const WEGE_STANDARD: Rueckweg[] = ['datei', 'text'];

/** Wer sieht was, je Rückweg (ein Satz oder zwei, Sie-Form). */
const WEG_TEXT: Record<Sprache, Record<Rueckweg, string>> = {
  de: {
    datei: 'Antwort als Datei: Sie speichern eine verschlüsselte Datei und schicken sie selbst zurück, zum Beispiel als E-Mail-Anhang. Den Inhalt kann nur die forschende Person öffnen. Der Anbieter des Weges, den Sie wählen, sieht aber, von wem die Datei kommt und an wen sie geht; anonym ist die Teilnahme auf diesem Weg deshalb nicht.',
    text: 'Antwort als Text: Sie kopieren einen Text aus Buchstaben und Zahlen und fügen ihn selbst in eine Nachricht ein. Auch dieser Text ist verschlüsselt und nur für die forschende Person lesbar. Der Anbieter der Nachricht sieht, von wem sie kommt und an wen sie geht.',
    qr: 'QR-Code: Der Code enthält Ihre verschlüsselte Antwort. Wer ihn sieht oder scannt, kann den Inhalt nicht lesen; die forschende Person sieht, dass Sie ihn vorzeigen.',
    teilen: 'Teilen-Menü Ihres Geräts: Sie schicken die verschlüsselte Datei über eine App Ihrer Wahl. Der Inhalt bleibt verschlüsselt; die App und ihr Anbieter sehen, von wem die Datei kommt und an wen sie geht.',
    station: 'Erhebungsstation: Sie füllen den Fragebogen an einem Gerät vor Ort aus. Die Antwort wird sofort verschlüsselt und nur verschlüsselt im Gerät abgelegt; wer nach Ihnen kommt, sieht Ihre Antwort nicht. Die Personen vor Ort sehen allerdings, dass Sie teilgenommen haben.'
  },
  en: {
    datei: 'Answer as a file: you save an encrypted file and send it back yourself, for example as an email attachment. Only the researcher can open its content. The provider of the route you choose does see who the file comes from and who it goes to; participation by this route is therefore not anonymous.',
    text: 'Answer as text: you copy a text of letters and numbers and paste it into a message yourself. This text, too, is encrypted and readable only by the researcher. The provider of the message sees who it comes from and who it goes to.',
    qr: 'QR code: the code contains your encrypted answer. Whoever sees or scans it cannot read the content; the researcher sees that you are showing it.',
    teilen: 'Share menu of your device: you send the encrypted file through an app of your choice. The content stays encrypted; the app and its provider see who the file comes from and who it goes to.',
    station: 'Survey station: you fill in the questionnaire on a device on site. The answer is encrypted at once and stored on the device only in encrypted form; whoever comes after you does not see your answer. The people on site can, however, see that you took part.'
  }
};

/** Die Teilnahme-Information als Abschnitte (Überschrift, Absätze, Stichpunkte). Texte in Sie-Form; Platzhalter in eckigen Klammern. */
export function teilnahmeInformationAbschnitte(plan: FragebogenPlan, sprache: Sprache, optionen: DatenschutzOptionen = {}): Abschnitt[] {
  const de = sprache === 'de', P = PLATZ[sprache];
  const wege = (optionen.wege?.length ? optionen.wege : WEGE_STANDARD).filter((w, i, l) => l.indexOf(w) === i);
  const zweck = (optionen.zweck ?? '').trim() || P.zweck;
  const kontakt = (optionen.kontakt ?? '').trim() || P.kontakt;
  const verantw = (optionen.verantwortlich ?? '').trim() || P.verantwortlich;
  const frist = (optionen.loeschfrist ?? '').trim() || P.frist;
  const dauer = Number.isInteger(optionen.dauerMinuten) && (optionen.dauerMinuten ?? 0) > 0
    ? (de ? `Das Ausfüllen dauert etwa ${optionen.dauerMinuten} Minuten.` : `Filling it in takes about ${optionen.dauerMinuten} minutes.`)
    : (de ? `Das Ausfüllen dauert etwa ${P.dauer}.` : `Filling it in takes about ${P.dauer}.`);
  const ende = (t: string) => (/[.!?\]]$/.test(t) ? t : `${t}.`);
  const out: Abschnitt[] = [];

  out.push({ ueberschrift: de ? 'Worum es geht' : 'What this is about', absaetze: [
    de ? `Sie sind zu der Befragung „${titelVon(plan, sprache)}“ eingeladen. Zweck: ${ende(zweck)}` : `You are invited to the survey “${titelVon(plan, sprache)}”. Purpose: ${ende(zweck)}`,
    dauer
  ] });
  out.push({ ueberschrift: de ? 'Freiwillig' : 'Voluntary', absaetze: [
    de ? 'Die Teilnahme ist freiwillig. Sie können jederzeit aufhören, ohne dass Ihnen daraus ein Nachteil entsteht. Solange Sie Ihre Antwort nicht zurückgegeben haben, verlässt nichts Ihr Gerät.'
       : 'Taking part is voluntary. You can stop at any time without any disadvantage. As long as you have not returned your answer, nothing leaves your device.'
  ] });
  out.push({ ueberschrift: de ? 'Wer Ihre Antwort sehen kann' : 'Who can see your answer', absaetze: [
    de ? 'Ihre Antwort wird auf diesem Gerät verschlüsselt. Nur die Person, die den Fragebogen verschickt hat, kann sie öffnen. Ohne Schlüsseldatei und Passwort kann niemand die Antworten öffnen, auch Statable nicht.'
       : 'Your answer is encrypted on this device. Only the person who sent the questionnaire can open it. Without the key file and its password nobody can open the answers, not even Statable.',
    de ? 'Wie Ihre Antwort zurückkommt, bestimmen Sie. Je nach Weg sieht jemand anderes, dass Sie teilgenommen haben:' : 'You decide how your answer comes back. Depending on the route, somebody else can see that you took part:'
  ], punkte: wege.map(w => WEG_TEXT[sprache][w]) });
  const nichtGespeichert = [
    de ? 'Ihre Antwort enthält keine IP-Adresse, keine Gerätekennung und keine Uhrzeit, höchstens ein Datum.' : 'Your answer contains no IP address, no device identifier and no time of day, at most a date.',
    de ? 'Ihr Name wird nur gespeichert, wenn eine Frage danach verlangt.' : 'Your name is stored only if a question asks for it.'
  ];
  if (plan.codeVerlangt) nichtGespeichert.push(de
    ? 'Der Fragebogen verlangt einen Einmal-Code. Er steht in Ihrer Antwort. Wer die Liste der ausgegebenen Codes mit Namen verknüpft hat, kann Ihre Antwort Ihnen zuordnen; die Daten sind dann pseudonymisiert, nicht anonym.'
    : 'The questionnaire asks for a one-time code. It is part of your answer. Whoever has linked the list of issued codes to names can assign your answer to you; the data are then pseudonymised, not anonymous.');
  if (optionen.link) nichtGespeichert.push(de
    ? 'Beim Öffnen des Links lädt Ihr Gerät die Seite von einem Server; dessen Betreiber ist technisch Ihre Internetadresse bekannt. Ihre Antworten werden dorthin nicht gesendet.'
    : 'When you open the link your device loads the page from a server; its operator can technically see your internet address. Your answers are not sent there.');
  out.push({ ueberschrift: de ? 'Was nicht gespeichert wird' : 'What is not stored', absaetze: [], punkte: nichtGespeichert });
  out.push({ ueberschrift: de ? 'Löschung' : 'Deletion', absaetze: [
    de ? `Die Antworten werden gelöscht: ${ende(frist)}` : `The answers are deleted: ${ende(frist)}`,
    de ? 'Eine einzelne Antwort lässt sich nur löschen, wenn sich erkennen lässt, welche Ihre ist, zum Beispiel über Ihren Code oder Ihre Nachricht. Bei einer anonymen Antwort ist das nach dem Absenden nicht mehr möglich.'
       : 'A single answer can be deleted only if it can be recognised as yours, for example by your code or your message. For an anonymous answer this is no longer possible after sending.'
  ] });
  out.push({ ueberschrift: de ? 'Verantwortlich und Kontakt' : 'Responsible body and contact', absaetze: [
    de ? `Verantwortlich für die Befragung ist ${verantw}. Fragen und Wünsche richten Sie an: ${kontakt}` : `Responsible for the survey is ${verantw}. Questions and requests go to: ${kontakt}`,
    EINORDNUNG[sprache]
  ] });
  return out;
}

const plainText = (abs: Abschnitt[]): string => abs.map(a => [a.ueberschrift, ...a.absaetze, ...(a.punkte ?? []).map(p => `- ${p}`)].join('\n')).join('\n\n');

/** Die Teilnahme-Information als Text zum Übernehmen in `plan.einleitung` (Absätze durch Leerzeile getrennt, Überschriften als eigene Zeile, Stichpunkte mit „- “). Ohne Hinweis „keine Rechtsberatung“ (der steht in der Word-Fassung und in der Hilfe). */
export function teilnahmeInformation(plan: FragebogenPlan, sprache: Sprache, optionen: DatenschutzOptionen = {}): string {
  return plainText(teilnahmeInformationAbschnitte(plan, sprache, optionen));
}

/** Die Einwilligung als Text zum Übernehmen in `plan.einwilligung.text`. Eine Aussage je Zeile, so lässt sich jede Zeile einzeln prüfen; Widerruf nach Art. 7 Abs. 3 DSGVO ist genannt. */
export function einwilligungText(plan: FragebogenPlan, sprache: Sprache): string {
  const t = titelVon(plan, sprache);
  return sprache === 'de'
    ? [`Ich habe die Teilnahme-Information zur Befragung „${t}“ gelesen und verstanden.`,
       'Ich nehme freiwillig teil und weiß, dass ich vor dem Zurückgeben meiner Antwort jederzeit aufhören kann.',
       'Ich bin damit einverstanden, dass meine verschlüsselte Antwort zu dem dort genannten Zweck verarbeitet wird.',
       'Ich kann diese Einwilligung jederzeit widerrufen; die Verarbeitung bis dahin bleibt rechtmäßig.'].join('\n')
    : [`I have read and understood the participant information on the survey “${t}”.`,
       'I take part voluntarily and know that I can stop at any time before returning my answer.',
       'I agree that my encrypted answer is processed for the purpose stated there.',
       'I can withdraw this consent at any time; processing up to then remains lawful.'].join('\n');
}

/** Eckige Klammern, die noch ausgefüllt werden müssen (leer, wenn die Vorlage vollständig angepasst ist). */
export function offenePlatzhalter(text: string): string[] {
  return [...new Set(text.match(/\[[^\]\n]{3,80}\]/g) ?? [])];
}

/** Übernimmt Teilnahme-Information und Einwilligung in eine Kopie des Plans (Sprache `sprache`); andere Sprachen und `pflicht` bleiben, ohne Einwilligung bisher ist sie Pflicht. */
export function mitDatenschutzTexten(plan: FragebogenPlan, sprache: Sprache, optionen: DatenschutzOptionen = {}): FragebogenPlan {
  const einleitung: Lok = { ...(plan.einleitung ?? {}), [sprache]: teilnahmeInformation(plan, sprache, optionen) };
  const einwilligung = { text: { ...(plan.einwilligung?.text ?? {}), [sprache]: einwilligungText(plan, sprache) }, pflicht: plan.einwilligung?.pflicht ?? true };
  return { ...plan, einleitung, einwilligung, geaendert: Date.now() };
}

type Docx = typeof import('docx');
/** Die Word-Fassung (barrierefrei: Titel, echte Überschriften, Sprache; `scripts/docx-pruefen.mjs` ohne Befund): Hinweis „keine Rechtsberatung“, Teilnahme-Information, Einwilligung. `D` ist das geladene Modul `docx`. */
export function baueTeilnahmeWord(D: Docx, plan: FragebogenPlan, sprache: Sprache, optionen: DatenschutzOptionen = {}) {
  const de = sprache === 'de', schrift = 'Arial';
  const titel = de ? 'Teilnahme-Information und Einwilligung' : 'Participant information and consent';
  const lauf = (t: string, o: { fett?: boolean; kursiv?: boolean; groesse?: number } = {}) => new D.TextRun({ text: t, font: schrift, size: o.groesse ?? 22, bold: o.fett, italics: o.kursiv });
  const absatz = (t: string, kursiv = false) => new D.Paragraph({ spacing: { after: 160, line: 360 }, children: [lauf(t, { kursiv })] });
  const punkt = (t: string) => new D.Paragraph({ bullet: { level: 0 }, spacing: { after: 120, line: 340 }, children: [lauf(t)] });
  const h1 = (t: string) => new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, children: [lauf(t, { fett: true, groesse: 26 })] });
  const h2 = (t: string) => new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, children: [lauf(t, { fett: true, groesse: 23 })] });
  const kinder: InstanceType<Docx['Paragraph']>[] = [
    new D.Paragraph({ heading: D.HeadingLevel.TITLE, children: [lauf(titel, { fett: true, groesse: 32 })] }),
    h1(de ? 'Hinweis an die forschende Person' : 'Note for the researcher'),
    absatz(KEINE_RECHTSBERATUNG[sprache]),
    absatz(de ? 'Die eckigen Klammern [ … ] sind noch auszufüllen. Diesen Abschnitt vor dem Verschicken löschen.' : 'The square brackets [ … ] still have to be filled in. Delete this section before sending.'),
    h1(de ? 'Teilnahme-Information' : 'Participant information')
  ];
  for (const a of teilnahmeInformationAbschnitte(plan, sprache, optionen)) {
    kinder.push(h2(a.ueberschrift), ...a.absaetze.map(t => absatz(t)), ...(a.punkte ?? []).map(punkt));
  }
  kinder.push(h1(de ? 'Einwilligung' : 'Consent'), ...einwilligungText(plan, sprache).split('\n').map(t => absatz(t)));
  return new D.Document({ creator: 'Statable', title: titel, subject: titelVon(plan, sprache) || titel, styles: wordStile(D, schrift), sections: [{ children: kinder }] });
}

/** Die Word-Fassung als .docx (Bytes). */
export async function teilnahmeWord(plan: FragebogenPlan, sprache: Sprache, optionen: DatenschutzOptionen = {}): Promise<Uint8Array> {
  const D = await import('docx');
  return new Uint8Array(await D.Packer.toArrayBuffer(baueTeilnahmeWord(D, plan, sprache, optionen)));
}
