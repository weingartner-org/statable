/**
 * Dokumente für das Kodieren einlesen (Stufe 6b, Paket 6b3; Fachblatt `docs/erheben/FACHBLATT-STUFE-6B.md`, Abschnitt 3.8).
 *
 * `leseDokument` liest .txt, .docx und .pdf zu Klartext. `dokumentAusText` baut daraus ein `Dokument` für das `QualProjekt`.
 * Der Text wird hier einmal festgelegt. Nichts wird ausgeführt: PDF ohne Skripte (`isEvalSupported: false`), Worker aus dem eigenen Paket.
 * Das PDF-Paket (pdfjs-dist, Apache-2.0) wird nur bei Bedarf geladen.
 */
import { L } from './sitzung.svelte';
import { docxText } from './transkript-lesen';
import type { Dokument } from './qualprojekt';

export const MAX_DOKUMENT_BYTES = 20 * 1048576;

export interface GeleseneDatei {
  text: string;
  art: 'text' | 'pdftext';
  sprache?: string;
  hinweise: string[];
}

export const PDF_KERNSATZ = () => L(
  'Text aus PDF: Bitte prüfen Sie Absätze und Seitenzahlen. Gescannte PDFs ohne Textebene kann Statable nicht lesen.',
  'Text from PDF: Please check paragraphs and page numbers. Statable cannot read scanned PDFs without a text layer.');

/* ------------------------------------------------------------------ Text */

/** Entfernt eine Kodierungsmarke (BOM) und liest UTF-8 oder UTF-16. Der Hinweis nennt, was geschah. */
export function textAusBytes(bytes: Uint8Array): { text: string; hinweise: string[] } {
  const hinweise: string[] = [];
  const utf16 = () => L('Die Datei war in UTF-16 gespeichert (Kodierungsmarke entfernt).', 'The file was saved as UTF-16 (byte order mark removed).');
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    hinweise.push(utf16());
    return { text: new TextDecoder('utf-16le').decode(bytes.subarray(2)), hinweise };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    hinweise.push(utf16());
    return { text: new TextDecoder('utf-16be').decode(bytes.subarray(2)), hinweise };
  }
  let b = bytes;
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) {
    b = b.subarray(3);
    hinweise.push(L('Eine unsichtbare Kodierungsmarke (BOM) am Dateianfang wurde entfernt.', 'An invisible byte order mark (BOM) at the start of the file was removed.'));
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(b), hinweise };
  } catch {
    hinweise.push(L('Die Datei war nicht in UTF-8 gespeichert; Umlaute wurden als Windows-Text (1252) gelesen. Bitte prüfen Sie sie.',
      'The file was not saved as UTF-8; characters were read as Windows text (1252). Please check them.'));
    return { text: new TextDecoder('windows-1252').decode(b), hinweise };
  }
}

/* ------------------------------------------------------------------ PDF */

const KLEIN = /^\p{Ll}/u;
const GROSS = /^\p{Lu}/u;
const SATZENDE = /[.!?…]["'“”»«)\]]*$/u;
const TRENNER = /\p{L}-$/u;

/**
 * Fügt die Zeilen aus einem PDF zu Text zusammen. `seiten[s][z]` ist Zeile z auf Seite s.
 * Silbentrennung am Zeilenende ("Ver-" + "bindung") wird zusammengefügt; endet eine Zeile mit einem Satzzeichen und beginnt die nächste groß,
 * beginnt ein neuer Absatz (`\n`); sonst Leerzeichen. Leere Zeilen trennen Absätze. Seiten sind mit `\n\n` getrennt.
 */
export function pdfZeilenZuText(seiten: string[][]): string {
  const ausgabe: string[] = [];
  for (const zeilen of seiten) {
    let seite = '';
    let offen = false; // vorige Zeile da, noch ohne Absatzende
    for (const roh of zeilen) {
      const z = roh.replace(/\s+/g, ' ').trim();
      if (!z) { if (seite && !seite.endsWith('\n')) seite += '\n'; offen = false; continue; }
      if (!seite || !offen) { seite += z; offen = true; continue; }
      if (TRENNER.test(seite) && KLEIN.test(z)) seite = seite.slice(0, -1) + z;
      else if (SATZENDE.test(seite) && GROSS.test(z)) seite += '\n' + z;
      else seite += ' ' + z;
    }
    ausgabe.push(seite.replace(/\n+$/, ''));
  }
  return ausgabe.filter(s => s !== '').join('\n\n');
}

interface PdfInhaltEintrag { str?: string; hasEOL?: boolean; transform?: number[] }
export interface PdfModul {
  getDocument(opt: Record<string, unknown>): { promise: Promise<{
    numPages: number;
    getPage(n: number): Promise<{ getTextContent(): Promise<{ items: PdfInhaltEintrag[] }>; cleanup?(): void }>;
    destroy?(): Promise<void>;
  }> };
  GlobalWorkerOptions?: { workerSrc: string };
}

/** Liest die Zeilen je Seite. `modul` nur für Tests (Node-Fassung von pdfjs). */
export async function pdfSeiten(bytes: Uint8Array, modul?: PdfModul): Promise<string[][]> {
  let pdfjs = modul;
  if (!pdfjs) {
    pdfjs = (await import('pdfjs-dist')) as unknown as PdfModul;
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string;
    if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = worker;
  }
  const doc = await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false, enableXfa: false, useSystemFonts: false }).promise;
  const seiten: string[][] = [];
  try {
    for (let s = 1; s <= doc.numPages; s++) {
      const seite = await doc.getPage(s);
      const inhalt = await seite.getTextContent();
      const zeilen: string[] = [];
      let aktuell = '';
      let y: number | undefined;
      for (const e of inhalt.items) {
        if (typeof e.str !== 'string') continue;
        const ey = e.transform?.[5];
        if (y !== undefined && ey !== undefined && Math.abs(ey - y) > 2 && aktuell) { zeilen.push(aktuell); aktuell = ''; }
        if (ey !== undefined) y = ey;
        aktuell += e.str;
        if (e.hasEOL) { zeilen.push(aktuell); aktuell = ''; }
      }
      if (aktuell) zeilen.push(aktuell);
      seiten.push(zeilen);
      seite.cleanup?.();
    }
  } finally { await doc.destroy?.(); }
  return seiten;
}

/* ------------------------------------------------------------------ Einstieg */

/** Liest eine Datei (.txt, .docx, .pdf) zu Klartext. Wirft einen `Error` mit verständlichem Satz, wenn nichts zu lesen ist. */
export async function leseDokument(name: string, bytes: Uint8Array, optionen: { pdfModul?: PdfModul } = {}): Promise<GeleseneDatei> {
  if (bytes.length > MAX_DOKUMENT_BYTES) {
    throw new Error(L('Die Datei ist größer als 20 MB. Bitte teilen Sie sie in kleinere Dokumente.', 'The file is larger than 20 MB. Please split it into smaller documents.'));
  }
  const endung = (name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]) ?? '';
  const istPdf = endung === 'pdf' || (bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);
  if (istPdf) {
    let seiten: string[][];
    try { seiten = await pdfSeiten(bytes, optionen.pdfModul); }
    catch { throw new Error(L('Diese PDF-Datei konnte nicht gelesen werden. ', 'This PDF file could not be read. ') + PDF_KERNSATZ()); }
    const text = pdfZeilenZuText(seiten);
    if (!text.trim()) throw new Error(PDF_KERNSATZ());
    return { text, art: 'pdftext', hinweise: [PDF_KERNSATZ()] };
  }
  const istZip = bytes.length > 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (endung === 'docx' || istZip) {
    const t = docxText(bytes);
    if (t === undefined) throw new Error(L('Diese Word-Datei konnte nicht gelesen werden. Gespeichert werden muss als .docx.', 'This Word file could not be read. It must be saved as .docx.'));
    if (!t.trim()) throw new Error(L('In dieser Word-Datei steht kein Text.', 'This Word file contains no text.'));
    return { text: t, art: 'text', hinweise: [] };
  }
  if (endung === 'doc' || endung === 'rtf' || endung === 'odt') {
    throw new Error(L('Dieses Format kann Statable nicht lesen. Bitte speichern Sie es als .docx oder .txt.', 'Statable cannot read this format. Please save it as .docx or .txt.'));
  }
  const { text, hinweise } = textAusBytes(bytes);
  if (!text.trim()) throw new Error(L('In dieser Datei steht kein Text.', 'This file contains no text.'));
  return { text, art: 'text', hinweise };
}

/** Baut ein Dokument für das Projekt. Der Text wird hier festgelegt und danach nicht mehr verändert. */
export function dokumentAusText(name: string, text: string, art: 'text' | 'pdftext', sprache?: string): Dokument {
  const jetzt = Date.now();
  const d: Dokument = { id: crypto.randomUUID(), name: name.trim(), art, text, erstellt: jetzt, geaendert: jetzt };
  if (sprache) d.sprache = sprache;
  return d;
}
