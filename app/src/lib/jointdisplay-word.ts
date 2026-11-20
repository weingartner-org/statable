/**
 * Joint Display als Word und als HTML (Stufe A2). Beide zeigen dieselbe Tabelle wie die Seite (`jdAufbau`):
 * Zelle = erst die Zahl („3 von 5 Fällen“), dann, wenn die Person eine gewählt hat, das Zitat mit Quelle; danach die Spalten Passung und Meta-Inferenz.
 * Statable wählt keine Zitate und schreibt keine Meta-Inferenz; beides steht nur da, wenn die Person es eingetragen hat.
 * Word barrierefrei nach `scripts/docx-pruefen.mjs` (Titel, Überschrift 1, Wiederholungs-Kopfzeile, Sprache); HTML mit `lang`, `caption`, `th scope`, alles escaped.
 * Reine Funktionen; das Herunterladen macht die Seite. Texte aus Dateien kommen nur als Text, nie als HTML.
 */
import type { JdAufbau, JdZellAnzeige } from './mixed';

export interface JdExportOpt { titel: string; art: string; hinweis: string; sprache: 'de' | 'en'; zeilenKopf?: string }

const W = {
  de: { zeile: 'Zeile', passung: 'Passung', meta: 'Meta-Inferenz', leer: 'Die Tabelle ist leer.', veraltet: 'Die gewählte Stelle passt nicht mehr zur Zelle.', ausgelassen: (n: number) => (n === 1 ? '1 Fall ist nicht gezählt (kein Interview oder keine Verknüpfung).' : `${n} Fälle sind nicht gezählt (kein Interview oder keine Verknüpfung).`), tabelle: 'Tabelle', fallzahl: 'Statable zählt nur; ob Zahlen und Aussagen zusammenpassen, entscheiden Sie.',
    passungen: { offen: 'offen', bestaetigung: 'Bestätigung', erweiterung: 'Erweiterung', widerspruch: 'Widerspruch' }, anfuehr: (t: string) => `„${t}“` },
  en: { zeile: 'Row', passung: 'Fit', meta: 'Meta-inference', leer: 'The table is empty.', veraltet: 'The chosen passage no longer fits this cell.', ausgelassen: (n: number) => (n === 1 ? '1 case is not counted (no interview or no link).' : `${n} cases are not counted (no interview or no link).`), tabelle: 'Table', fallzahl: 'Statable only counts; whether numbers and statements fit together is for you to decide.',
    passungen: { offen: 'open', bestaetigung: 'confirmation', erweiterung: 'expansion', widerspruch: 'discordance' }, anfuehr: (t: string) => `"${t}"` },
} as const;

// eslint-disable-next-line no-control-regex
const XML_UNGUELTIG = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f￾￿]/g;
const sauber = (t: string): string => String(t ?? '').replace(XML_UNGUELTIG, '');
const kopfName = (k: { name: string; n?: number }): string => (k.n !== undefined ? `${k.name} (n = ${k.n})` : k.name);

type Woerter = typeof W['de'] | typeof W['en'];
/** Teile der Zelle: Zahl, dann Zitat mit Quelle, oder Hinweis auf eine veraltete Wahl. */
function zellTeile(z: JdZellAnzeige, w: Woerter): { text: string; kursiv?: boolean }[] {
  const r: { text: string; kursiv?: boolean }[] = [{ text: z.text || '-' }];
  if (z.beleg) { r.push({ text: w.anfuehr(z.beleg.text), kursiv: true }); r.push({ text: `(${z.beleg.quelle})` }); }
  else if (z.belegVeraltet) r.push({ text: w.veraltet, kursiv: true });
  return r;
}

export async function jointDisplayWord(aufbau: JdAufbau, opt: JdExportOpt): Promise<Uint8Array> {
  const sp = opt.sprache === 'en' ? 'en' : 'de', w = W[sp];
  const D = await import('docx');
  const { wordStile } = await import('./export');
  const stile = wordStile(D);
  const styles = { ...stile, default: { ...stile.default, document: { run: { ...stile.default.document.run, language: { value: sp } } } } };
  const lauf = (t: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) => new D.TextRun({ text: sauber(t).replace(/[\r\n]+/g, ' '), font: 'Arial', size: o.size ?? 22, bold: o.bold, italics: o.italics });
  const ueb = (t: string, e: 'TITLE' | 'HEADING_1') => new D.Paragraph({ heading: D.HeadingLevel[e], children: [lauf(t, { bold: true, size: e === 'TITLE' ? 32 : 26 })] });
  const absatz = (t: string, o: { bold?: boolean; italics?: boolean } = {}) => new D.Paragraph({ children: [new D.TextRun({ text: sauber(t).replace(/[\r\n]+/g, ' '), font: 'Arial', size: 20, bold: o.bold, italics: o.italics })] });
  const zelle = (teile: InstanceType<typeof D.Paragraph>[]) => new D.TableCell({ children: teile.length ? teile : [absatz('')] });
  const k: (InstanceType<typeof D.Paragraph> | InstanceType<typeof D.Table>)[] = [ueb(opt.titel, 'TITLE')];
  k.push(new D.Paragraph({ spacing: { after: 80 }, children: [lauf(opt.art)] }));
  k.push(ueb(w.tabelle, 'HEADING_1'));
  if (!aufbau.zeilen.length || !aufbau.kopf.length) k.push(new D.Paragraph({ children: [lauf(w.leer, { italics: true })] }));
  else {
    const kopf = [opt.zeilenKopf ?? w.zeile, ...aufbau.kopf.map(kopfName), w.passung, w.meta];
    k.push(new D.Table({
      width: { size: 100, type: D.WidthType.PERCENTAGE },
      tableLook: { firstRow: true, firstColumn: true, noHBand: true, noVBand: true },
      rows: [
        new D.TableRow({ tableHeader: true, cantSplit: true, children: kopf.map(x => zelle([absatz(x, { bold: true })])) }),
        ...aufbau.zeilen.map(z => new D.TableRow({
          cantSplit: true,
          children: [
            zelle([absatz(z.n !== undefined ? `${z.name} (n = ${z.n})` : z.name, { bold: true })]),
            ...z.zellen.map(c => zelle(zellTeile(c, w).map(t => absatz(t.text, { italics: t.kursiv })))),
            zelle([absatz(w.passungen[z.passung])]),
            zelle([absatz(z.meta || '-')]),
          ],
        })),
      ],
    }));
  }
  if (aufbau.ausgelassen > 0) k.push(new D.Paragraph({ spacing: { before: 120 }, children: [lauf(w.ausgelassen(aufbau.ausgelassen))] }));
  k.push(new D.Paragraph({ spacing: { before: 120 }, children: [lauf(opt.hinweis, { italics: true })] }));
  k.push(new D.Paragraph({ children: [lauf(w.fallzahl, { italics: true })] }));
  const doc = new D.Document({ creator: 'Statable', title: sauber(opt.titel), styles, sections: [{ children: k }] });
  return new Uint8Array(await D.Packer.toArrayBuffer(doc));
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Text für HTML: die fünf Zeichen escaped, Zeilenumbrüche werden zu Leerzeichen. Text aus Dateien wird nie als HTML eingesetzt. */
export const htmlText = (t: string): string => sauber(t).replace(/[&<>"']/g, c => ESC[c]!).replace(/[\r\n]+/g, ' ');

export function jointDisplayHtml(aufbau: JdAufbau, opt: JdExportOpt): string {
  const sp = opt.sprache === 'en' ? 'en' : 'de', w = W[sp];
  const e = htmlText;
  const zeilen = aufbau.zeilen.map(z => {
    const zellen = z.zellen.map(c => `<td>${zellTeile(c, w).map(t => (t.kursiv ? `<blockquote><p>${e(t.text)}</p></blockquote>` : `<p>${e(t.text)}</p>`)).join('')}</td>`).join('');
    return `<tr><th scope="row">${e(z.n !== undefined ? `${z.name} (n = ${z.n})` : z.name)}</th>${zellen}<td>${e(w.passungen[z.passung])}</td><td>${e(z.meta || '-')}</td></tr>`;
  }).join('\n');
  const tabelle = !aufbau.zeilen.length || !aufbau.kopf.length
    ? `<p>${e(w.leer)}</p>`
    : `<table>\n<caption>${e(opt.titel)} - ${e(opt.art)}</caption>\n<thead><tr><th scope="col">${e(opt.zeilenKopf ?? w.zeile)}</th>${aufbau.kopf.map(c => `<th scope="col">${e(kopfName(c))}</th>`).join('')}<th scope="col">${e(w.passung)}</th><th scope="col">${e(w.meta)}</th></tr></thead>\n<tbody>\n${zeilen}\n</tbody>\n</table>`;
  return `<!DOCTYPE html>
<html lang="${sp}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(opt.titel)}</title>
<style>
body { font-family: Arial, sans-serif; line-height: 1.45; margin: 1rem auto; max-width: 70rem; padding: 0 1rem; color: #111; background: #fff; }
table { border-collapse: collapse; width: 100%; }
caption { text-align: left; font-weight: bold; padding: .5rem 0; }
th, td { border: 1px solid #555; padding: .5rem; text-align: left; vertical-align: top; }
td p, td blockquote { margin: 0 0 .4rem; }
blockquote { font-style: italic; margin-inline: 0; }
</style>
</head>
<body>
<main>
<h1>${e(opt.titel)}</h1>
<p>${e(opt.art)}</p>
${tabelle}
${aufbau.ausgelassen > 0 ? `<p>${e(w.ausgelassen(aufbau.ausgelassen))}</p>` : ''}
<p>${e(opt.hinweis)}</p>
<p>${e(w.fallzahl)}</p>
</main>
</body>
</html>
`;
}
