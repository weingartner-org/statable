/**
 * Vorlage für die Einwilligung zu einem Interview (Stufe F2B). Grundlage: docs/feinstruktur/FACHBLATT-EINWILLIGUNG.md Abschnitt 2.
 * Ein EIGENER Text (nichts aus Formularen einer Lehrveranstaltung oder Hochschule). KEINE RECHTSBERATUNG: Der Satz steht in Word und HTML als Hinweis für die
 * Forschenden. Was die forschende Person selbst eintragen muss, steht in eckigen Klammern; `offenePlatzhalter` zählt sie. Die Rechtsgrundlage steht nur als Platzhalter.
 * Fünf Kästchen (gestuft): Teilnahme, Tonaufnahme, Zitate, Archivierung, Weitergabe.
 */
import { KEINE_RECHTSBERATUNG, offenePlatzhalter, type Abschnitt } from './datenschutzvorlage';
import { wordStile } from './export';

type Sp = 'de' | 'en';
export interface EinwilligungsvorlageOptionen {
  /** Kontakt (Name, E-Mail oder Anschrift); fehlt er, steht ein Platzhalter. */
  kontakt?: string;
  /** Verantwortliche Stelle (Person oder Hochschule); fehlt sie, steht ein Platzhalter. */
  verantwortlich?: string;
}
export type { Abschnitt };

const PLATZ = {
  de: { kontakt: '[Kontakt eintragen]', verantwortlich: '[Verantwortliche Stelle eintragen]', person: '[Name der forschenden Person]', hochschule: '[Hochschule]', projekt: '[Lehrveranstaltung oder Projekt]', dauer: '[Dauer eintragen]', ort: '[Ort eintragen]', frist: '[Löschfrist eintragen]', grund: '[Rechtsgrundlage laut Ihrer Hochschule]', wer: '[Empfänger eintragen]', speicher: '[Speicherort eintragen]', zweck: '[Verwendung der Ergebnisse eintragen]' },
  en: { kontakt: '[Enter contact]', verantwortlich: '[Enter responsible body]', person: '[Name of the researcher]', hochschule: '[University]', projekt: '[Course or project]', dauer: '[Enter duration]', ort: '[Enter place]', frist: '[Enter deletion period]', grund: '[Legal basis according to your university]', wer: '[Enter recipient]', speicher: '[Enter storage location]', zweck: '[Enter use of the results]' }
} as const;

/** Die fünf Kästchen-Punkte (Fachblatt Abschnitt 2), je mit Frage in der Sie-Form. */
const KAESTCHEN: Record<Sp, { punkt: string; frage: string }[]> = {
  de: [
    { punkt: 'Teilnahme am Interview', frage: 'Ich nehme am Interview teil.' },
    { punkt: 'Tonaufnahme', frage: 'Das Gespräch darf auf Tonband aufgenommen werden.' },
    { punkt: 'Verwendung von Zitaten', frage: 'Kurze Stellen aus meinem Interview dürfen anonymisiert in Arbeiten wörtlich angeführt werden.' },
    { punkt: 'Archivierung', frage: 'Die anonymisierte Abschrift darf in einem Archiv für spätere Forschung abgelegt werden.' },
    { punkt: 'Weitergabe', frage: 'Die anonymisierte Abschrift darf an die folgenden Personen oder Stellen weitergegeben werden: [Empfänger eintragen].' }
  ],
  en: [
    { punkt: 'Participation in the interview', frage: 'I take part in the interview.' },
    { punkt: 'Audio recording', frage: 'The conversation may be recorded on audio.' },
    { punkt: 'Use of quotations', frage: 'Short passages from my interview may be quoted word for word, anonymised, in written work.' },
    { punkt: 'Archiving', frage: 'The anonymised transcript may be stored in an archive for later research.' },
    { punkt: 'Sharing', frage: 'The anonymised transcript may be shared with the following persons or bodies: [Enter recipient].' }
  ]
};

export function einwilligungsvorlageTitel(sprache: Sp): string {
  return sprache === 'de' ? 'Einwilligung zum Interview' : 'Consent to the interview';
}

/** Die Teile der Vorlage (Wer forscht bis Unterschrift) als Abschnitte. Der Kästchen-Teil führt die fünf Punkte als Liste; HTML und Word machen daraus Auswahlfelder. */
export function einwilligungsvorlageAbschnitte(sprache: Sp, optionen: EinwilligungsvorlageOptionen = {}): Abschnitt[] {
  const de = sprache === 'de', P = PLATZ[sprache];
  const kontakt = (optionen.kontakt ?? '').trim() || P.kontakt;
  const verantw = (optionen.verantwortlich ?? '').trim() || P.verantwortlich;
  const a: Abschnitt[] = [];

  a.push({ ueberschrift: de ? 'Wer forscht' : 'Who is researching', absaetze: [
    de ? `Das Interview führt ${P.person} von ${P.hochschule} im Rahmen von ${P.projekt} durch.` : `The interview is conducted by ${P.person} of ${P.hochschule} as part of ${P.projekt}.`,
    de ? `Verantwortlich für die Forschung ist ${verantw}. Fragen und Wünsche richten Sie an: ${kontakt}` : `The research is the responsibility of ${verantw}. Questions and requests go to: ${kontakt}`
  ] });
  a.push({ ueberschrift: de ? 'Thema und Ziel' : 'Topic and aim', absaetze: [
    de ? 'Hier steht in einfachen Worten, worum es in der Forschung geht und was Sie im Gespräch erzählen sollen.' : 'Here, in plain words, it says what the research is about and what you are asked to talk about.',
    de ? `Die Ergebnisse werden verwendet für: ${P.zweck}` : `The results will be used for: ${P.zweck}`
  ] });
  a.push({ ueberschrift: de ? 'Ablauf' : 'Procedure', absaetze: [
    de ? `Das Gespräch findet in der Form eines offenen Interviews statt und dauert etwa ${P.dauer}. Ort: ${P.ort}` : `The conversation takes the form of an open interview and lasts about ${P.dauer}. Place: ${P.ort}`
  ] });
  a.push({ ueberschrift: de ? 'Aufnahme und Transkript' : 'Recording and transcript', absaetze: [
    de ? 'Wenn Sie zustimmen, wird das Gespräch aufgenommen und danach Wort für Wort abgeschrieben. Beim Abschreiben werden Namen und andere Angaben geändert, an denen man Sie erkennen könnte.'
       : 'If you agree, the conversation is recorded and then written down word for word. While writing it down, names and other details by which you could be recognised are changed.',
    de ? `Die Aufnahme wird gelöscht: ${P.frist}` : `The recording is deleted: ${P.frist}`
  ] });
  a.push({ ueberschrift: de ? 'Zugang und Speicherort' : 'Access and storage', absaetze: [
    de ? `Zugang zu den Daten haben nur die in dieser Vorlage genannten Personen. Gespeichert wird hier: ${P.speicher}. Ihre Kontaktdaten werden getrennt von den Gesprächsdaten aufbewahrt.`
       : `Only the persons named in this form have access to the data. They are stored here: ${P.speicher}. Your contact details are kept separately from the interview data.`
  ] });
  a.push({ ueberschrift: de ? 'Anonymisierung' : 'Anonymisation', absaetze: [
    de ? 'Im Text werden Namen, Orte und andere erkennbare Angaben verändert oder weggelassen. Ganz unkenntlich lassen sich Erzählungen über das eigene Leben aber schwer machen: Wer Sie gut kennt, könnte sich selbst oder Sie trotzdem erkennen.'
       : 'Names, places and other recognisable details are changed or left out of the text. Stories about your own life are, however, difficult to make completely unrecognisable: people who know you well might still recognise you.'
  ] });
  a.push({ ueberschrift: de ? 'Grenzen der Vertraulichkeit' : 'Limits of confidentiality', absaetze: [
    de ? 'Alles, was Sie sagen, wird vertraulich behandelt. Es gibt eine Grenze, die vorab feststehen muss: [Grenzen der Vertraulichkeit eintragen, zum Beispiel Gefahr für Leib und Leben, soweit sie für Ihre Forschung zutrifft].'
       : 'Everything you say is treated in confidence. There is one limit that must be clear beforehand: [Enter limits of confidentiality, for example danger to life and limb, as far as it applies to your research].'
  ] });
  a.push({ ueberschrift: de ? 'Freiwilligkeit' : 'Voluntariness', absaetze: [
    de ? 'Ihre Teilnahme ist freiwillig. Wenn Sie Nein sagen, hat das keine Nachteile für Sie. Sie dürfen Fragen auslassen, eine Pause verlangen oder das Gespräch jederzeit beenden.'
       : 'Taking part is voluntary. If you say no, there are no disadvantages for you. You may skip questions, ask for a break or end the conversation at any time.'
  ] });
  a.push({ ueberschrift: de ? 'Widerruf' : 'Withdrawal', absaetze: [
    de ? `Sie können Ihre Zustimmung ganz oder für einzelne Punkte zurücknehmen. Teilen Sie das dafür mit: ${kontakt}. Der Widerruf gilt für die Zukunft. Was schon veröffentlicht ist, kann nicht mehr zurückgeholt werden; je früher Sie sich melden, desto mehr lässt sich noch ändern.`
       : `You can withdraw your consent completely or for single points. Tell this to: ${kontakt}. A withdrawal applies to the future. What has already been published cannot be taken back; the earlier you get in touch, the more can still be changed.`,
    de ? `Rechtsgrundlage: ${P.grund}` : `Legal basis: ${P.grund}`
  ] });
  a.push({ ueberschrift: de ? 'Ihre Zustimmung (Kästchen)' : 'Your consent (boxes)', absaetze: [
    de ? 'Sie entscheiden bei jedem Punkt einzeln. Wenn Sie bei einem Punkt Nein ankreuzen, können Sie trotzdem teilnehmen.' : 'You decide on each point separately. If you tick No for one point, you can still take part.'
  ], punkte: KAESTCHEN[sprache].map(k => `${k.punkt}: ${k.frage}`) });
  a.push({ ueberschrift: de ? 'Unterschrift' : 'Signature', absaetze: [
    de ? 'Ort, Datum: ______________________' : 'Place, date: ______________________',
    de ? 'Unterschrift der befragten Person: ______________________' : 'Signature of the interviewee: ______________________',
    de ? 'Unterschrift der forschenden Person: ______________________' : 'Signature of the researcher: ______________________',
    de ? 'Eine Fassung bleibt bei Ihnen, eine bei der forschenden Person.' : 'One copy stays with you, one with the researcher.'
  ] });
  return a;
}

const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Barrierefreies HTML: ein Formular, je Punkt ein fieldset mit legend und zwei Auswahlknöpfen „Ja“ und „Nein“, jeder mit label. */
export function einwilligungsvorlageHtml(sprache: Sp, optionen: EinwilligungsvorlageOptionen = {}): string {
  const de = sprache === 'de';
  const titel = einwilligungsvorlageTitel(sprache);
  const abs = einwilligungsvorlageAbschnitte(sprache, optionen);
  const kaestchen = KAESTCHEN[sprache];
  const teile: string[] = [];
  for (const a of abs) {
    teile.push(`<section>\n<h2>${esc(a.ueberschrift)}</h2>`);
    for (const t of a.absaetze) teile.push(`<p>${esc(t)}</p>`);
    if (a.ueberschrift === abs[abs.length - 2]!.ueberschrift) {
      kaestchen.forEach((k, i) => {
        teile.push(`<fieldset>\n<legend>${esc(k.punkt)}</legend>\n<p>${esc(k.frage)}</p>\n<p><input type="radio" name="punkt${i + 1}" id="punkt${i + 1}-ja" value="ja"> <label for="punkt${i + 1}-ja">${de ? 'Ja' : 'Yes'}</label>\n<input type="radio" name="punkt${i + 1}" id="punkt${i + 1}-nein" value="nein"> <label for="punkt${i + 1}-nein">${de ? 'Nein' : 'No'}</label></p>\n</fieldset>`);
      });
    } else if (a.punkte?.length) {
      teile.push(`<ul>${a.punkte.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`);
    }
    teile.push('</section>');
  }
  return `<!doctype html>
<html lang="${sprache}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<style>
body { font-family: Arial, Helvetica, sans-serif; font-size: 1.1rem; line-height: 1.6; max-width: 42rem; margin: 0 auto; padding: 1rem; color: #1d2530; background: #fff; }
h1, h2 { line-height: 1.25; }
fieldset { margin: 1rem 0; padding: 0.75rem 1rem; border: 2px solid #1d2530; }
legend { font-weight: bold; padding: 0 0.4rem; }
input { width: 1.4rem; height: 1.4rem; vertical-align: middle; }
label { margin-right: 1.5rem; }
.hinweis { border-left: 4px solid #1d2530; padding-left: 0.75rem; font-weight: bold; }
</style>
</head>
<body>
<main>
<h1>${esc(titel)}</h1>
<p class="hinweis">${esc(KEINE_RECHTSBERATUNG[sprache])}</p>
<form>
${teile.join('\n')}
</form>
</main>
</body>
</html>
`;
}

type Docx = typeof import('docx');
/** Word-Fassung (barrierefrei: Titel, Überschriften, Sprache): Hinweis für die Forschenden, alle Teile, die fünf Punkte mit Ja/Nein-Kästchen. */
export function baueEinwilligungsvorlageWord(D: Docx, sprache: Sp, optionen: EinwilligungsvorlageOptionen = {}) {
  const de = sprache === 'de', schrift = 'Arial';
  const titel = einwilligungsvorlageTitel(sprache);
  const lauf = (t: string, o: { fett?: boolean; groesse?: number } = {}) => new D.TextRun({ text: t, font: schrift, size: o.groesse ?? 22, bold: o.fett });
  const absatz = (t: string) => new D.Paragraph({ spacing: { after: 160, line: 360 }, children: [lauf(t)] });
  const punkt = (t: string) => new D.Paragraph({ bullet: { level: 0 }, spacing: { after: 120, line: 340 }, children: [lauf(t)] });
  const h1 = (t: string) => new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, children: [lauf(t, { fett: true, groesse: 26 })] });
  const h2 = (t: string) => new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, children: [lauf(t, { fett: true, groesse: 23 })] });
  const abs = einwilligungsvorlageAbschnitte(sprache, optionen);
  const kaestchenName = abs[abs.length - 2]!.ueberschrift;
  const kinder: InstanceType<Docx['Paragraph']>[] = [
    new D.Paragraph({ heading: D.HeadingLevel.TITLE, children: [lauf(titel, { fett: true, groesse: 32 })] }),
    h1(de ? 'Hinweis an die forschende Person' : 'Note for the researcher'),
    absatz(KEINE_RECHTSBERATUNG[sprache]),
    absatz(de ? 'Was in eckigen Klammern steht, müssen Sie noch ausfüllen. Diesen Abschnitt löschen Sie, bevor Sie die Vorlage weitergeben.' : 'What is in square brackets still has to be filled in by you. Delete this section before you hand out the form.'),
    h1(titel)
  ];
  for (const a of abs) {
    kinder.push(h2(a.ueberschrift), ...a.absaetze.map(absatz));
    if (a.ueberschrift === kaestchenName) {
      for (const k of KAESTCHEN[sprache]) kinder.push(absatz(`${k.punkt}: ${k.frage}`), absatz(de ? '☐ Ja     ☐ Nein' : '☐ Yes     ☐ No'));
    } else kinder.push(...(a.punkte ?? []).map(punkt));
  }
  return new D.Document({ creator: 'Statable', title: titel, subject: titel, styles: wordStile(D, schrift), sections: [{ children: kinder }] });
}

export async function einwilligungsvorlageWord(sprache: Sp, optionen: EinwilligungsvorlageOptionen = {}): Promise<Uint8Array> {
  const D = await import('docx');
  return new Uint8Array(await D.Packer.toArrayBuffer(baueEinwilligungsvorlageWord(D, sprache, optionen)));
}

/** Zahl der noch offenen Platzhalter in der Vorlage (für den Hinweis in der Oberfläche). */
export function einwilligungsvorlageOffen(sprache: Sp, optionen: EinwilligungsvorlageOptionen = {}): string[] {
  return offenePlatzhalter(einwilligungsvorlageAbschnitte(sprache, optionen).map(a => [a.ueberschrift, ...a.absaetze, ...(a.punkte ?? [])].join('\n')).join('\n'));
}
