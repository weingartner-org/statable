/**
 * „Belege als Word“ (Stufe 6b2, Fachblatt 3.5): Titel, Hinweis auf Code und Filter, Tabelle mit Kopfzeile (Dokument | Fall | Stelle | Text, bei Untercodes dazu Code).
 * Barrierefrei nach `scripts/docx-pruefen.mjs`: Titel, Überschrift 1, Kopfzeile, Sprache. Reine Funktion; das Herunterladen macht die Seite.
 */
export interface BelegZeile { dokument: string; fall: string; stelle: string; text: string; code?: string }

const W = {
  de: { titel: (c: string) => `Belege zu „${c}“`, filter: 'Filter', stellen: 'Stellen', kopf: ['Dokument', 'Fall', 'Stelle', 'Text'], code: 'Code', keine: 'Es gibt keine Stellen zu diesem Code.', anzahl: (n: number) => (n === 1 ? '1 Stelle' : `${n} Stellen`) },
  en: { titel: (c: string) => `Passages for "${c}"`, filter: 'Filter', stellen: 'Passages', kopf: ['Document', 'Case', 'Passage', 'Text'], code: 'Code', keine: 'There are no passages for this code.', anzahl: (n: number) => (n === 1 ? '1 passage' : `${n} passages`) },
};

// eslint-disable-next-line no-control-regex
const XML_UNGUELTIG = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f￾￿]/g;
const sauber = (t: string): string => String(t ?? '').replace(XML_UNGUELTIG, '');

export async function belegeWord(zeilen: BelegZeile[], opt: { code: string; filter?: string; sprache: 'de' | 'en' }): Promise<Uint8Array> {
  const sp = opt.sprache === 'en' ? 'en' : 'de', w = W[sp];
  const D = await import('docx');
  const { wordStile } = await import('./export');
  const stile = wordStile(D);
  const styles = { ...stile, default: { ...stile.default, document: { run: { ...stile.default.document.run, language: { value: sp } } } } };
  const lauf = (t: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) => new D.TextRun({ text: sauber(t).replace(/[\r\n]+/g, ' '), font: 'Arial', size: o.size ?? 22, bold: o.bold, italics: o.italics });
  const ueb = (t: string, e: 'TITLE' | 'HEADING_1') => new D.Paragraph({ heading: D.HeadingLevel[e], children: [lauf(t, { bold: true, size: e === 'TITLE' ? 32 : 26 })] });
  const zelle = (t: string, fett: boolean) => new D.TableCell({ children: sauber(t).split(/\r?\n/).map(l => new D.Paragraph({ children: [new D.TextRun({ text: l, font: 'Arial', size: 20, bold: fett })] })) });
  const mitCode = zeilen.some(z => z.code);
  const kopf = mitCode ? [...w.kopf, w.code] : w.kopf;
  const k: (InstanceType<typeof D.Paragraph> | InstanceType<typeof D.Table>)[] = [ueb(w.titel(opt.code), 'TITLE')];
  k.push(new D.Paragraph({ spacing: { after: 80 }, children: [lauf(w.anzahl(zeilen.length))] }));
  if (opt.filter) k.push(new D.Paragraph({ spacing: { after: 80 }, children: [lauf(`${w.filter}: `, { bold: true }), lauf(opt.filter)] }));
  k.push(ueb(w.stellen, 'HEADING_1'));
  if (!zeilen.length) k.push(new D.Paragraph({ children: [lauf(w.keine, { italics: true })] }));
  else {
    k.push(new D.Table({
      width: { size: 100, type: D.WidthType.PERCENTAGE },
      tableLook: { firstRow: true, firstColumn: true, noHBand: true, noVBand: true },
      rows: [
        new D.TableRow({ tableHeader: true, cantSplit: true, children: kopf.map(x => zelle(x, true)) }),
        ...zeilen.map(z => new D.TableRow({ cantSplit: true, children: [zelle(z.dokument, true), zelle(z.fall || '-', false), zelle(z.stelle, false), zelle(z.text, false), ...(mitCode ? [zelle(z.code ?? '-', false)] : [])] })),
      ],
    }));
  }
  const doc = new D.Document({ creator: 'Statable', title: w.titel(opt.code), styles, sections: [{ children: k }] });
  return new Uint8Array(await D.Packer.toArrayBuffer(doc));
}

/* ---------------------------------------------------------------------------------------------
 * „Matrix als Word“ (Stufe 6c, Fachblatt 3.3): Fall-Kategorie-Matrix mit eigenen Zusammenfassungen.
 * ------------------------------------------------------------------------------------------- */
import type { FkMatrix } from './kodieren-ansichten';

const FK = {
  de: {
    titel: 'Fall-Kategorie-Matrix', fall: 'Fall', matrix: 'Matrix',
    satz: (p: string, u: boolean) => `Kodiert von: ${p}. Untercodes ${u ? 'sind enthalten' : 'sind nicht enthalten'}.`,
    ohne: (n: number) => `(${n === 0 ? 'keine Belege' : n === 1 ? '1 Beleg' : `${n} Belege`}, keine Zusammenfassung)`,
    belege: 'Belege', leer: 'Die Matrix ist leer.',
    zitat: 'Die Datei enthält wörtliche Zitate aus den Dokumenten.',
    an: (t: string) => `„${t}“`,
    themenSatz: (p: string) => `Spalten sind Themen, die Sie gebildet haben. Belege: von Ihnen gewählte Stellen und Stellen mit Codes des Themas. Kodiert von: ${p}.`,
  },
  en: {
    titel: 'Case-by-category matrix', fall: 'Case', matrix: 'Matrix',
    satz: (p: string, u: boolean) => `Coded by: ${p}. Subcodes are ${u ? 'included' : 'not included'}.`,
    ohne: (n: number) => `(${n === 0 ? 'no passages' : n === 1 ? '1 passage' : `${n} passages`}, no summary)`,
    belege: 'Passages', leer: 'The matrix is empty.',
    zitat: 'The file contains verbatim quotes from the documents.',
    an: (t: string) => `"${t}"`,
    themenSatz: (p: string) => `Columns are themes you have built. Passages: those you chose and those coded with a code of the theme. Coded by: ${p}.`,
  },
};

export async function fallKategorieWord(m: FkMatrix, opt: { sprache: 'de' | 'en'; personen: string; mitUntercodes: boolean; mitBelegen: boolean; themen?: boolean }): Promise<Uint8Array> {
  const sp = opt.sprache === 'en' ? 'en' : 'de', w = FK[sp];
  const D = await import('docx');
  const { wordStile } = await import('./export');
  const stile = wordStile(D);
  const styles = { ...stile, default: { ...stile.default, document: { run: { ...stile.default.document.run, language: { value: sp } } } } };
  const lauf = (t: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) => new D.TextRun({ text: sauber(t).replace(/[\r\n]+/g, ' '), font: 'Arial', size: o.size ?? 22, bold: o.bold, italics: o.italics });
  const ueb = (t: string, e: 'TITLE' | 'HEADING_1') => new D.Paragraph({ heading: D.HeadingLevel[e], children: [lauf(t, { bold: true, size: e === 'TITLE' ? 32 : 26 })] });
  const absatz = (t: string, o: { bold?: boolean; italics?: boolean } = {}) => new D.Paragraph({ children: [new D.TextRun({ text: sauber(t).replace(/[\r\n]+/g, ' '), font: 'Arial', size: 20, bold: o.bold, italics: o.italics })] });
  const zelle = (teile: InstanceType<typeof D.Paragraph>[]) => new D.TableCell({ children: teile.length ? teile : [absatz('')] });
  const k: (InstanceType<typeof D.Paragraph> | InstanceType<typeof D.Table>)[] = [ueb(w.titel, 'TITLE')];
  k.push(new D.Paragraph({ spacing: { after: 80 }, children: [lauf(opt.themen ? w.themenSatz(opt.personen) : w.satz(opt.personen, opt.mitUntercodes))] }));
  if (opt.mitBelegen) k.push(new D.Paragraph({ spacing: { after: 80 }, children: [lauf(w.zitat, { italics: true })] }));
  k.push(ueb(w.matrix, 'HEADING_1'));
  if (!m.zeilen.length || !m.spalten.length) k.push(new D.Paragraph({ children: [lauf(w.leer, { italics: true })] }));
  else {
    k.push(new D.Table({
      width: { size: 100, type: D.WidthType.PERCENTAGE },
      tableLook: { firstRow: true, firstColumn: true, noHBand: true, noVBand: true },
      rows: [
        new D.TableRow({ tableHeader: true, cantSplit: true, children: [w.fall, ...m.spalten.map(s => s.name)].map(x => zelle([absatz(x, { bold: true })])) }),
        ...m.zeilen.map((z, zi) => new D.TableRow({
          children: [
            zelle([absatz(z.name, { bold: true })]),
            ...m.spalten.map((_, si) => {
              const c = m.zellen[zi]![si]!;
              const teile = [c.zusammenfassung !== undefined ? absatz(c.zusammenfassung) : absatz(w.ohne(c.belege.length), { italics: true })];
              if (opt.mitBelegen && c.belege.length) {
                teile.push(absatz(`${w.belege}:`, { bold: true }));
                for (const b of c.belege) teile.push(absatz(w.an(b.text)));
              }
              return zelle(teile);
            }),
          ],
        })),
      ],
    }));
  }
  const doc = new D.Document({ creator: 'Statable', title: w.titel, styles, sections: [{ children: k }] });
  return new Uint8Array(await D.Packer.toArrayBuffer(doc));
}
