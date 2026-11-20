/**
 * Paket 2F: das Protokoll der doppelten Dateneingabe als Word-Datei (barrierefrei: Titel, echte Überschriften, Tabellen mit Kopfzeile, Sprache; `scripts/docx-pruefen.mjs` ohne Befund).
 * Inhalt: Kennzahlen (Bögen, Felder, Abweichungen, je 1.000 Felder, wie entschieden), Abweichungen je Feld, Satzvorschlag für den Methodenteil, Quelle.
 */
import type { FragebogenPlan } from './fragebogenplan';
import { protokollText, type Protokoll } from './doppeleingabe';
import { feldBeschriftungen } from './doppeleingabe-daten';
import { wordStile } from './export';

type Docx = typeof import('docx');

const T = {
  de: {
    titel: 'Protokoll der doppelten Dateneingabe', fragebogen: 'Fragebogen', zahlen: 'Kennzahlen', kennzahl: 'Kennzahl', wert: 'Wert',
    boegen: 'Bögen in beiden Durchgängen (verglichen)', nurA: 'Bögen nur in Durchgang A (nicht verglichen)', nurB: 'Bögen nur in Durchgang B (nicht verglichen)', nurEinfach: 'davon als einfach erfasst übernommen',
    felder: 'Verglichene Felder', abw: 'Abweichungen', je1000: 'Abweichungen je 1.000 Felder', nachA: 'Entschieden nach Durchgang A', nachB: 'Entschieden nach Durchgang B', neu: 'Entschieden mit neuem Wert',
    jeFeld: 'Abweichungen je Feld', feld: 'Feld', text: 'Frage', anzahl: 'Abweichungen', keine: 'Keine Abweichungen.',
    satz: 'Satzvorschlag für den Methodenteil', quelle: 'Quelle', stand: 'Erstellt mit Statable am', num: (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',')
  },
  en: {
    titel: 'Protocol of the double data entry', fragebogen: 'Questionnaire', zahlen: 'Key figures', kennzahl: 'Figure', wert: 'Value',
    boegen: 'Questionnaires in both passes (compared)', nurA: 'Questionnaires only in pass A (not compared)', nurB: 'Questionnaires only in pass B (not compared)', nurEinfach: 'of these included as single entry',
    felder: 'Fields compared', abw: 'Discrepancies', je1000: 'Discrepancies per 1,000 fields', nachA: 'Decided in favour of pass A', nachB: 'Decided in favour of pass B', neu: 'Decided with a new value',
    jeFeld: 'Discrepancies per field', feld: 'Field', text: 'Question', anzahl: 'Discrepancies', keine: 'No discrepancies.',
    satz: 'Suggested sentence for the methods section', quelle: 'Source', stand: 'Created with Statable on', num: (x: number) => (Math.round(x * 10) / 10).toFixed(1)
  }
};
export const PAULSEN_2012 = 'Paulsen, A., Overgaard, S., & Lauritsen, J. M. (2012). Quality of data entry using single entry, double entry and automated forms processing - an example based on a study of patient-reported outcomes. PLoS ONE, 7(4), e35087. https://doi.org/10.1371/journal.pone.0035087';

/** Das Word-Dokument (Bau ohne Browser prüfbar: `D` ist das geladene Modul `docx`). */
export function baueProtokollWord(D: Docx, plan: FragebogenPlan, p: Protokoll, sprache: 'de' | 'en', datum: string) {
  const X = T[sprache], schrift = 'Arial';
  const titelPlan = plan.titel[sprache] || plan.titel[plan.sprachen[0] ?? ''] || plan.id;
  const lauf = (t: string, o: { fett?: boolean; kursiv?: boolean; groesse?: number } = {}) => new D.TextRun({ text: t, font: schrift, size: o.groesse ?? 22, bold: o.fett, italics: o.kursiv });
  const absatz = (t: string, o: { kursiv?: boolean; groesse?: number } = {}) => new D.Paragraph({ spacing: { after: 160, line: 360 }, children: [lauf(t, o)] });
  const ueberschrift = (t: string) => new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, children: [lauf(t, { fett: true, groesse: 26 })] });
  const zelle = (t: string, fett = false, rechts = false) => new D.TableCell({ children: [new D.Paragraph({ alignment: rechts ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT, children: [lauf(t, { fett })] })] });
  const tabelle = (kopf: string[], zeilen: string[][], rechtsAb = 1) => new D.Table({
    width: { size: 100, type: D.WidthType.PERCENTAGE }, tableLook: { firstRow: true, firstColumn: true, noHBand: true, noVBand: true },
    rows: [new D.TableRow({ tableHeader: true, children: kopf.map((k, i) => zelle(k, true, i >= rechtsAb && i === kopf.length - 1 && kopf.length > 1)) }),
      ...zeilen.map(z => new D.TableRow({ cantSplit: true, children: z.map((t, i) => zelle(t, i === 0, i >= rechtsAb && i === z.length - 1 && z.length > 1)) }))]
  });
  const zahlen: string[][] = [
    [X.boegen, String(p.boegen)], [X.nurA, String(p.nurA)], [X.nurB, String(p.nurB)],
    ...(p.nurEinfach ? [[X.nurEinfach, String(p.nurEinfach)]] : []),
    [X.felder, String(p.felder)], [X.abw, String(p.abweichungen)], [X.je1000, X.num(p.je1000)],
    [X.nachA, String(p.nachA)], [X.nachB, String(p.nachB)], [X.neu, String(p.neu)]
  ];
  const felder = feldBeschriftungen(plan, sprache);
  const jeFeld = Object.entries(p.jeFeld).map(([id, n]) => [felder[id]?.name ?? id, felder[id]?.text ?? '', String(n)]);
  const kinder: (InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>)[] = [
    new D.Paragraph({ heading: D.HeadingLevel.TITLE, children: [lauf(X.titel, { fett: true, groesse: 32 })] }),
    absatz(`${X.fragebogen}: ${titelPlan}`),
    absatz(`${X.stand} ${datum}`, { kursiv: true, groesse: 20 }),
    ueberschrift(X.zahlen), tabelle([X.kennzahl, X.wert], zahlen),
    ueberschrift(X.jeFeld),
    ...(jeFeld.length ? [tabelle([X.feld, X.text, X.anzahl], jeFeld, 2)] : [absatz(X.keine)]),
    ueberschrift(X.satz), absatz(protokollText(p, sprache)),
    ueberschrift(X.quelle), absatz(PAULSEN_2012)
  ];
  return new D.Document({ creator: 'Statable', title: X.titel, subject: titelPlan, styles: wordStile(D, schrift), sections: [{ children: kinder }] });
}

/** Das Protokoll als .docx (Bytes). */
export async function protokollWord(plan: FragebogenPlan, p: Protokoll, sprache: 'de' | 'en', datum: string): Promise<Uint8Array> {
  const D = await import('docx');
  return new Uint8Array(await D.Packer.toArrayBuffer(baueProtokollWord(D, plan, p, sprache, datum)));
}
