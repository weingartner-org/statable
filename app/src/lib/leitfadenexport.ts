/**
 * Leitfaden als Word (Paket 4D, Fachblatt 4D und Entscheid 10): zwei Fassungen.
 * 1. „Leitfaden als Word“: Titel, Forschungsfrage, je Block eine Überschrift (Ebene 2) und eine Tabelle mit Kopfzeile. Spalten wie sie oft nach Helfferich dargestellt werden:
 *    Erzählaufforderung (Leitfrage) · Inhaltliche Aspekte (Check) · Konkrete Fragen · Aufrechterhaltungsfragen. Danach auf Wunsch „Gestrichene Fragen“ mit Grund
 *    und „Für den Kurzfragebogen“.
 * 2. „Zum Mitnehmen ins Interview“: große Schrift (16 pt), nur Erzählaufforderungen und Aspekte als Liste, ohne Tabelle.
 * Sprache gesetzt, Titel gesetzt, echte Überschriften, Tabellen mit Kopfzeile. Text kommt nur als Text in die Datei, nie als Markup.
 */
import { wordStile } from './export';
import { bloeckeGeordnet, type Leitfaden, type LeitfadenSprache } from './leitfaden';

type Docx = typeof import('docx');
type Kind = InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>;

// Zeichen, die in XML 1.0 nicht vorkommen dürfen (würden die docx zerstören); Zeilentrenner werden zu Leerzeichen.
const XML_UNGUELTIG = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(8) + String.fromCharCode(11, 12) + String.fromCharCode(14) + '-' + String.fromCharCode(31) + String.fromCharCode(0xfffe, 0xffff) + ']', 'g');
const ZEILENTRENNER = new RegExp('[' + String.fromCharCode(9, 10, 13, 0x2028, 0x2029) + ']+', 'g');
const sauber = (t: string): string => String(t ?? '').replace(XML_UNGUELTIG, '');
const einzeilig = (t: string): string => sauber(t).replace(ZEILENTRENNER, ' ').trim();

export interface LeitfadenWordOptionen {
  /** Gestrichene Fragen mit Grund anhängen (Voreinstellung aus). */
  gestrichen?: boolean;
  /** Fragen „für den Kurzfragebogen“ anhängen (Voreinstellung an, wenn es welche gibt). */
  kurzfragebogen?: boolean;
}

const WORTE = {
  de: {
    titel: 'Interview-Leitfaden', mitnehmen: 'Zum Mitnehmen', frage: 'Forschungsfrage', leitfaden: 'Leitfaden',
    block: (n: number, t: string) => `Block ${n}: ${t || 'ohne Titel'}`,
    spalten: ['Erzählaufforderung (Leitfrage)', 'Inhaltliche Aspekte (Check)', 'Konkrete Fragen', 'Aufrechterhaltungsfragen'],
    gestrichen: 'Gestrichene Fragen', kurz: 'Für den Kurzfragebogen', grund: 'Grund', keinGrund: 'kein Grund angegeben',
    leer: 'Noch keine Blöcke.', aspekte: 'Aspekte', ende: 'Ende des Leitfadens.'
  },
  en: {
    titel: 'Interview guide', mitnehmen: 'To take along', frage: 'Research question', leitfaden: 'Guide',
    block: (n: number, t: string) => `Block ${n}: ${t || 'untitled'}`,
    spalten: ['Narrative prompt (guiding question)', 'Content aspects (check)', 'Concrete questions', 'Maintenance questions'],
    gestrichen: 'Deleted questions', kurz: 'For the short questionnaire', grund: 'Reason', keinGrund: 'no reason given',
    leer: 'No blocks yet.', aspekte: 'Aspects', ende: 'End of the guide.'
  }
} as const;
const worte = (sp: LeitfadenSprache) => (sp === 'en' ? WORTE.en : WORTE.de);

async function basis(D: Docx, sprache: LeitfadenSprache) {
  const s = wordStile(D);
  return { ...s, default: { ...s.default, document: { run: { ...s.default.document.run, language: { value: sprache } } } } };
}
const lauf = (D: Docx, t: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) => new D.TextRun({ text: einzeilig(t), font: 'Arial', size: o.size ?? 22, bold: o.bold, italics: o.italics });
const absatz = (D: Docx, t: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) => new D.Paragraph({ spacing: { after: 100, line: 300 }, children: [lauf(D, t, o)] });
const punkt = (D: Docx, t: string, size = 22) => new D.Paragraph({ bullet: { level: 0 }, spacing: { after: 80, line: 300 }, children: [lauf(D, t, { size })] });
const ueberschrift = (D: Docx, t: string, ebene: 'TITLE' | 'HEADING_1' | 'HEADING_2', groesse?: number) =>
  new D.Paragraph({ heading: D.HeadingLevel[ebene], children: [lauf(D, t, { bold: true, size: groesse ?? (ebene === 'TITLE' ? 32 : ebene === 'HEADING_1' ? 26 : 23) })] });

/** Zelle mit mehreren Absätzen (eine Zeile je Eintrag). */
function zelle(D: Docx, zeilen: string[], fett = false) {
  const f = zeilen.filter(z => z.trim());
  return new D.TableCell({ children: (f.length ? f : ['']).map(z => new D.Paragraph({ children: [new D.TextRun({ text: einzeilig(z), font: 'Arial', size: 20, bold: fett })] })) });
}
function tafel(D: Docx, kopf: readonly string[], zeile: string[][]) {
  return new D.Table({
    width: { size: 100, type: D.WidthType.PERCENTAGE },
    tableLook: { firstRow: true, firstColumn: false, noHBand: true, noVBand: true },
    rows: [new D.TableRow({ tableHeader: true, cantSplit: true, children: kopf.map(k => zelle(D, [k], true)) }), new D.TableRow({ cantSplit: true, children: zeile.map(z => zelle(D, z)) })]
  });
}
const alsBytes = async (D: Docx, doc: InstanceType<Docx['Document']>) => new Uint8Array(await D.Packer.toArrayBuffer(doc));
const titelVon = (lf: Leitfaden, w: ReturnType<typeof worte>) => einzeilig(lf.titel) || w.titel;

/** Leitfaden als Word-Tabelle (Querformat, damit vier Spalten Platz haben). */
export async function leitfadenWord(lf: Leitfaden, opt: LeitfadenWordOptionen = {}): Promise<Uint8Array> {
  const w = worte(lf.sprache), D = await import('docx');
  const titel = titelVon(lf, w);
  const k: Kind[] = [ueberschrift(D, `${w.titel}: ${titel}`, 'TITLE')];
  if (lf.forschungsfrage?.trim()) k.push(absatz(D, `${w.frage}: ${lf.forschungsfrage}`));
  k.push(ueberschrift(D, w.leitfaden, 'HEADING_1'));
  const bloecke = bloeckeGeordnet(lf);
  if (!bloecke.length) k.push(absatz(D, w.leer, { italics: true }));
  bloecke.forEach((b, i) => {
    k.push(ueberschrift(D, w.block(i + 1, b.titel), 'HEADING_2'), tafel(D, w.spalten, [[b.erzaehlaufforderung], b.aspekte, b.konkret, b.aufrechterhaltung]));
  });
  const kurz = lf.gesammelt.filter(g => g.status === 'kurzfragebogen');
  if (opt.kurzfragebogen !== false && kurz.length) k.push(ueberschrift(D, w.kurz, 'HEADING_1'), ...kurz.map(g => punkt(D, g.text)));
  const weg = lf.gesammelt.filter(g => g.status === 'gestrichen');
  if (opt.gestrichen && weg.length) k.push(ueberschrift(D, w.gestrichen, 'HEADING_1'), ...weg.map(g => punkt(D, `${g.text} (${w.grund}: ${g.grund?.trim() || w.keinGrund})`)));
  k.push(absatz(D, w.ende, { italics: true }));
  const doc = new D.Document({ creator: 'Statable', title: titel, subject: w.titel, styles: await basis(D, lf.sprache), sections: [{ properties: { page: { size: { orientation: D.PageOrientation.LANDSCAPE } } }, children: k }] });
  return alsBytes(D, doc);
}

/** Leitfaden zum Mitnehmen ins Interview: große Schrift (16 pt), je Block die Erzählaufforderung und die Aspekte als Liste, ohne Tabelle. */
export async function leitfadenMitnehmenWord(lf: Leitfaden): Promise<Uint8Array> {
  const w = worte(lf.sprache), D = await import('docx');
  const titel = titelVon(lf, w), G = 32;
  const k: Kind[] = [ueberschrift(D, `${titel} (${w.mitnehmen})`, 'TITLE', 40)];
  if (lf.forschungsfrage?.trim()) k.push(absatz(D, `${w.frage}: ${lf.forschungsfrage}`, { size: G }));
  const bloecke = bloeckeGeordnet(lf);
  if (!bloecke.length) k.push(absatz(D, w.leer, { italics: true, size: G }));
  bloecke.forEach((b, i) => {
    k.push(ueberschrift(D, w.block(i + 1, b.titel), 'HEADING_1', 36));
    if (b.erzaehlaufforderung.trim()) k.push(absatz(D, b.erzaehlaufforderung, { size: G }));
    if (b.aspekte.some(a => a.trim())) k.push(absatz(D, `${w.aspekte}:`, { size: G }), ...b.aspekte.filter(a => a.trim()).map(a => punkt(D, a, G)));
  });
  k.push(absatz(D, w.ende, { italics: true, size: G }));
  const doc = new D.Document({ creator: 'Statable', title: `${titel} (${w.mitnehmen})`, subject: w.titel, styles: await basis(D, lf.sprache), sections: [{ children: k }] });
  return alsBytes(D, doc);
}

/** Dateiname ohne verbotene Zeichen. */
export const leitfadenDateiname = (lf: Leitfaden, mitnehmen = false): string =>
  `${(lf.titel || 'Leitfaden').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Leitfaden'}${mitnehmen ? '-zum-Mitnehmen' : ''}.docx`;
