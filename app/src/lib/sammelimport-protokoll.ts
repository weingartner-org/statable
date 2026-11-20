/**
 * Stufe 3E: Protokoll des Sammelimports als Text und als Word-Datei (barrierefrei: Titel, echte Überschriften, Tabellen mit Kopfzeile;
 * `scripts/docx-pruefen.mjs` ohne Befund). Die Grenze „vollständig/teilweise“ steht darin (sie wird vor dem Einlesen festgelegt).
 * Alle Texte in der Sprache der Oberfläche (`L`), Zahlen über `i18n/profil.ts`.
 */
import type { FragebogenPlan } from './fragebogenplan';
import type { Kategorisierung } from './ruecklauf';
import { rr1, rr2 } from './ruecklauf';
import type { EingangsZustand, Pruefung } from './sammelimport';
import { ALLE_ZUSTAENDE } from './sammelimport';
import { L } from './sitzung.svelte';
import { dez } from '../i18n/profil';
import { wordStile } from './export';

type Docx = typeof import('docx');

export interface SammelProtokoll { plan: FragebogenPlan; pruefung: Pruefung; kategorisierung: Kategorisierung; grenze: number; datum: string; uebernommen: number }

export const zustandsWort = (z: EingangsZustand): string => ({
  uebernommen: L('übernommen', 'accepted'), doppelt: L('doppelt (nicht übernommen)', 'duplicate (not accepted)'), andererPlan: L('anderer Fragebogen (nicht übernommen)', 'different questionnaire (not accepted)'),
  andereRevision: L('andere Fassung (übernommen)', 'different version (accepted)'), unbekannterCode: L('unbekannter Code', 'unknown code'), doppelterCode: L('Code mehrfach benutzt', 'code used more than once'),
  ohneCode: L('ohne Code', 'without code'), nichtEntschluesselbar: L('nicht entschlüsselbar (falscher Schlüssel)', 'cannot be decrypted (wrong key)'),
  kaputt: L('beschädigt oder keine Antwort', 'damaged or not an answer'), keinAge: L('keine verschlüsselte Antwort', 'no encrypted answer'),
} as Record<EingangsZustand, string>)[z];

export const prozentText = (x: number): string => `${dez((x * 100).toFixed(1))} %`;
export const quoteText = (x: number): string => dez(x.toFixed(3));
export const KEINE_QUOTE_SATZ = (): string => L('Bei einem offenen Link gibt es keine Rücklaufquote, weil niemand weiß, wie viele den Link gesehen haben.', 'With an open link there is no response rate, because nobody knows how many people saw the link.');
export const SELBSTGEWAEHLT_SATZ = (): string => L('Das ist eine selbstgewählte Stichprobe: Wer teilnimmt, entscheidet selbst. Sie sagt nichts darüber, wie verzerrt die Antworten sind.', 'This is a self-selected sample: people decide for themselves whether to take part. It says nothing about how biased the answers are.');

/** Der Rücklauf-Absatz: mit Codes RR1/RR2 mit Formel, ohne Codes nur die Zahl der Antworten. */
export function ruecklaufSaetze(k: Kategorisierung, grenze: number): string[] {
  if (k.keineQuote || !k.zahlen) return [L(`Zahl der eingegangenen Antworten: ${k.anzahl}.`, `Number of answers received: ${k.anzahl}.`), KEINE_QUOTE_SATZ(), SELBSTGEWAEHLT_SATZ()];
  const z = k.zahlen, a = z.ausgegeben;
  return [
    L(`Ausgegebene Einmal-Codes: ${a}. Grenze für „vollständig“: ${prozentText(grenze)} der gezeigten Pflichtfragen (vorher festgelegt).`, `One-time codes issued: ${a}. Threshold for "complete": ${prozentText(grenze)} of the required questions shown (set beforehand).`),
    L(`Vollständig (I): ${z.vollstaendig}. Teilweise (P): ${z.teilweise}. Nicht zurückgekommen (NC): ${z.nichtZurueck}.`, `Complete (I): ${z.vollstaendig}. Partial (P): ${z.teilweise}. Not returned (NC): ${z.nichtZurueck}.`),
    L(`RR1 = I / (I + P + NC) = ${z.vollstaendig} / ${a} = ${quoteText(rr1(k) ?? 0)}.`, `RR1 = I / (I + P + NC) = ${z.vollstaendig} / ${a} = ${quoteText(rr1(k) ?? 0)}.`),
    L(`RR2 = (I + P) / (I + P + NC) = ${z.vollstaendig + z.teilweise} / ${a} = ${quoteText(rr2(k) ?? 0)}.`, `RR2 = (I + P) / (I + P + NC) = ${z.vollstaendig + z.teilweise} / ${a} = ${quoteText(rr2(k) ?? 0)}.`),
    L('Alle ausgegebenen Codes gelten als geeignet (AAPOR: e = 1, nicht geschätzt). Nach den Standard Definitions der AAPOR (10. Ausgabe 2023, S. 85-88).', 'All issued codes count as eligible (AAPOR: e = 1, not estimated). After the AAPOR Standard Definitions (10th edition, 2023, pp. 85-88).'),
    ...(z.doppelt ? [L(`${z.doppelt} Code(s) kamen mehrfach vor und zählen einmal, mit der besten Antwort.`, `${z.doppelt} code(s) appeared more than once and count once, with the best answer.`)] : []),
    ...(z.unbekannt ? [L(`${z.unbekannt} Code(s) stehen nicht in der Liste und zählen nicht mit.`, `${z.unbekannt} code(s) are not in the list and do not count.`)] : []),
  ];
}

export function sammelProtokollText(p: SammelProtokoll): string {
  const titel = p.plan.titel[p.plan.sprachen[0] ?? 'de'] || p.plan.id;
  const eingelesen = p.pruefung.zeilen.length;
  const zeilen = [
    L('Protokoll des Sammelimports', 'Protocol of the bulk import'),
    `${L('Fragebogen', 'Questionnaire')}: ${titel} (${L('Revision', 'revision')} ${p.plan.revision})`,
    `${L('Datum', 'Date')}: ${p.datum}`,
    L(`Gelesen wurden ${eingelesen} Eingänge, übernommen ${p.uebernommen}.`, `${eingelesen} items were read, ${p.uebernommen} accepted.`),
    '', L('Zustände', 'States'),
    ...ALLE_ZUSTAENDE.filter(z => p.pruefung.zahlen[z] > 0).map(z => `- ${zustandsWort(z)}: ${p.pruefung.zahlen[z]}`),
    '', L('Rücklauf', 'Response'), ...ruecklaufSaetze(p.kategorisierung, p.grenze),
  ];
  return zeilen.join('\n');
}

export function baueSammelWord(D: Docx, p: SammelProtokoll, zeilenListe: { quelle: string; zustand: EingangsZustand; uebernehmen: boolean }[] = []) {
  const schrift = 'Arial';
  const titelPlan = p.plan.titel[p.plan.sprachen[0] ?? 'de'] || p.plan.id;
  const titel = L('Protokoll des Sammelimports', 'Protocol of the bulk import');
  const lauf = (t: string, o: { fett?: boolean; kursiv?: boolean; groesse?: number } = {}) => new D.TextRun({ text: t, font: schrift, size: o.groesse ?? 22, bold: o.fett, italics: o.kursiv });
  const absatz = (t: string, o: { kursiv?: boolean; groesse?: number } = {}) => new D.Paragraph({ spacing: { after: 160, line: 360 }, children: [lauf(t, o)] });
  const h1 = (t: string) => new D.Paragraph({ heading: D.HeadingLevel.HEADING_1, children: [lauf(t, { fett: true, groesse: 26 })] });
  const zelle = (t: string, fett = false, rechts = false) => new D.TableCell({ children: [new D.Paragraph({ alignment: rechts ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT, children: [lauf(t, { fett })] })] });
  const tabelle = (kopf: string[], zeilen: string[][]) => new D.Table({
    width: { size: 100, type: D.WidthType.PERCENTAGE }, tableLook: { firstRow: true, firstColumn: true, noHBand: true, noVBand: true },
    rows: [new D.TableRow({ tableHeader: true, children: kopf.map((k, i) => zelle(k, true, i === kopf.length - 1 && kopf.length === 2)) }),
      ...zeilen.map(z => new D.TableRow({ cantSplit: true, children: z.map((t, i) => zelle(t, i === 0, i === z.length - 1 && z.length === 2)) }))],
  });
  const zahlen = ALLE_ZUSTAENDE.map(z => [zustandsWort(z), String(p.pruefung.zahlen[z])]);
  const kinder: (InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>)[] = [
    new D.Paragraph({ heading: D.HeadingLevel.TITLE, children: [lauf(titel, { fett: true, groesse: 32 })] }),
    absatz(`${L('Fragebogen', 'Questionnaire')}: ${titelPlan} (${L('Revision', 'revision')} ${p.plan.revision})`),
    absatz(`${L('Erstellt mit Statable am', 'Created with Statable on')} ${p.datum}`, { kursiv: true, groesse: 20 }),
    absatz(L(`Gelesen wurden ${p.pruefung.zeilen.length} Eingänge, übernommen ${p.uebernommen}. Grenze für „vollständig“: ${prozentText(p.grenze)} der gezeigten Pflichtfragen, vor dem Einlesen festgelegt.`, `${p.pruefung.zeilen.length} items were read, ${p.uebernommen} accepted. Threshold for "complete": ${prozentText(p.grenze)} of the required questions shown, set before reading in.`)),
    h1(L('Zustände der Eingänge', 'States of the items')), tabelle([L('Zustand', 'State'), L('Anzahl', 'Number')], zahlen),
    h1(L('Rücklauf', 'Response')), ...ruecklaufSaetze(p.kategorisierung, p.grenze).map(t => absatz(t)),
  ];
  if (zeilenListe.length) {
    kinder.push(h1(L('Liste der Eingänge', 'List of items')), tabelle([L('Quelle', 'Source'), L('Zustand', 'State'), L('Übernommen', 'Accepted')],
      zeilenListe.map(z => [z.quelle, zustandsWort(z.zustand), z.uebernehmen ? L('ja', 'yes') : L('nein', 'no')])));
  }
  return new D.Document({ creator: 'Statable', title: titel, subject: titelPlan, styles: wordStile(D, schrift), sections: [{ children: kinder }] });
}

export async function sammelProtokollWord(p: SammelProtokoll, zeilenListe?: { quelle: string; zustand: EingangsZustand; uebernehmen: boolean }[]): Promise<Uint8Array> {
  const D = await import('docx');
  return new Uint8Array(await D.Packer.toArrayBuffer(baueSammelWord(D, p, zeilenListe)));
}
