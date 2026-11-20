/**
 * Word-Export eines Transkripts nach Froschauer und Lueger (Fachblatt Feinstruktur, Abschnitt 4):
 * Titel, Angaben, Kodierschema als echte Tabelle, dann die Beiträge mit Zeitmarke am Beginn.
 * Zeilennummern kommen von Word selbst (`w:lnNumType`, fortlaufend), nicht als Text; so kann ein Screenreader sie überspringen.
 * Zeilenabstand 1,5, rechter Rand 3,5 cm für Randbemerkungen. Betonung `_Wort_` wird unterstrichen. Statable ändert das Dokument nicht.
 * Der Aufruf (Knopf) steht in der Transkript-Ansicht; diese Datei ist reine Funktion (die Seite lädt herunter).
 */
import type { Dokument } from './qualprojekt';
import { alleInhalte, beitragTeile, codepoints } from './transkript-text';
import { formatZeit } from './zeitmarken';

type Docx = typeof import('docx');
type Run = InstanceType<Docx['TextRun']>;
type Absatz = InstanceType<Docx['Paragraph']>;

const STEUER = new RegExp("[\x00-\x08\x0b\x0c\x0e-\x1f" + String.fromCharCode(0xfffe, 0xffff) + "]", "g");
const sauber = (t: string): string => String(t ?? "").replace(STEUER, "");
const ZEILENENDEN = new RegExp("[\t\r\n" + String.fromCharCode(0x2028, 0x2029) + "]+", "g");
const einzeilig = (t: string): string => sauber(t).replace(ZEILENENDEN, " ").trim();

/** 3,5 cm in Twips (1 cm = 567 Twips, aufgerundet auf die übliche Zahl 1984). */
export const RAND_RECHTS_TWIPS = 1984;

const ROLLE: Record<string, { de: string; en: string }> = {
  interview: { de: 'Interviewende Person', en: 'Interviewer' },
  befragt: { de: 'Befragte Person', en: 'Interviewee' },
  andere: { de: 'Andere', en: 'Other' }
};

/** Betonung: `_Wort_` (nicht mitten in einem Wort) wird zu unterstrichenem Text, die Unterstriche fallen weg. */
export function betonungTeile(text: string): { text: string; unterstrichen: boolean }[] {
  const teile: { text: string; unterstrichen: boolean }[] = [];
  const re = /(?<![\p{L}\p{N}_])_([^\s_](?:[^_\n]*[^\s_])?)_(?![\p{L}\p{N}_])/gu;
  let pos = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > pos) teile.push({ text: text.slice(pos, m.index), unterstrichen: false });
    teile.push({ text: m[1]!, unterstrichen: true });
    pos = m.index + m[0].length;
  }
  if (pos < text.length) teile.push({ text: text.slice(pos), unterstrichen: false });
  return teile;
}

interface Zeile { kennung: string; rolle?: string; beschreibung: string }
interface Eintrag { kennung?: string; zeitMs?: number; inhalt: string }

/** Zerlegt das Dokument in Kodierschema (Kopfzeilen `I1 = …`), weitere Angaben aus dem Kopf und die Beiträge. */
function zerlegen(dok: Dokument): { schema: Zeile[]; angaben: string[]; beitraege: Eintrag[] } {
  const t = dok.transkript;
  const cps = codepoints(dok.text);
  const inhalte = t ? alleInhalte(dok) : [dok.text];
  const abs = t?.abschnitte ?? [];
  const ersterMitSprecher = abs.findIndex((a) => a.sprecher !== undefined);
  const beitraege: Eintrag[] = [];
  const schema: Zeile[] = [];
  const angaben: string[] = [];
  const rolleVon = new Map<string, string | undefined>();

  abs.forEach((a, i) => {
    const istKopf = a.sprecher === undefined && a.zeitMs === undefined && (ersterMitSprecher < 0 || i < ersterMitSprecher);
    if (istKopf) {
      for (const z0 of sauber(inhalte[i] ?? '').split(/\r?\n/)) {
        const z = z0.trim();
        if (!z) continue;
        const m = /^(\S{1,12})\s*=\s*(.+)$/.exec(z);
        if (m) schema.push({ kennung: m[1]!, beschreibung: m[2]!.trim() });
        else angaben.push(z);
      }
      return;
    }
    const sp = a.sprecher ? t!.sprecher.find((s) => s.id === a.sprecher) : undefined;
    let kennung = sp?.name;
    if (a.sprecher) {
      const k = beitragTeile(cps, dok, i).kennung;
      const imText = cps.slice(k.start, k.ende).join('').replace(/\s*:\s*$/, '').trim();
      if (imText) kennung = imText;
    }
    if (kennung && !rolleVon.has(kennung)) rolleVon.set(kennung, sp?.rolle);
    beitraege.push({ kennung, zeitMs: a.zeitMs, inhalt: inhalte[i] ?? '' });
  });
  if (!t) beitraege.push({ inhalt: dok.text });

  const rolleFuer = (k: string): string | undefined => {
    const r = rolleVon.get(k);
    if (r) return r;
    if (/^I\d*$/i.test(k)) return 'interview';
    if (/^B\d*$/i.test(k)) return 'befragt';
    return undefined;
  };
  for (const z of schema) z.rolle = rolleFuer(z.kennung);
  // Sprecher, die im Kopf fehlen, trotzdem ins Kodierschema (ohne Beschreibung)
  for (const k of rolleVon.keys()) if (!schema.some((z) => z.kennung === k)) schema.push({ kennung: k, rolle: rolleFuer(k), beschreibung: '' });
  return { schema, angaben, beitraege };
}

/**
 * Word nach Froschauer und Lueger. Aufruf in der Transkript-Ansicht:
 * `const bytes = await transkriptWordFL(dok, sprache); speichereDatei(bytes, dateiname)` (Dateiname-Vorschlag: `${dok.name}-Froschauer-Lueger.docx`).
 */
export async function transkriptWordFL(dok: Dokument, sprache: string = 'de'): Promise<Uint8Array> {
  const de = sprache === 'de', sp = de ? 'de' : 'en';
  const D: Docx = await import('docx');
  const { wordStile } = await import('./export');
  const s = wordStile(D);
  const stile = { ...s, default: { ...s.default, document: { run: { ...s.default.document.run, language: { value: sp } } } } };

  const lauf = (t: string, o: { bold?: boolean; italics?: boolean; size?: number; underline?: boolean } = {}): Run =>
    new D.TextRun({ text: sauber(t).replace(/[\r\n\t]+/g, ' '), font: 'Arial', size: o.size ?? 22, bold: o.bold, italics: o.italics, ...(o.underline ? { underline: { type: D.UnderlineType.SINGLE } } : {}) });
  const kopfAbsatz = (kinder: Run[]) => new D.Paragraph({ spacing: { before: 0, after: 120, line: 360 }, suppressLineNumbers: true, children: kinder });
  const ueberschrift = (t: string, ebene: 'TITLE' | 'HEADING_1', ohneZeilennr = false) =>
    new D.Paragraph({ heading: D.HeadingLevel[ebene], suppressLineNumbers: ohneZeilennr || undefined, children: [lauf(t, { bold: true, size: ebene === 'TITLE' ? 32 : 26 })] });

  const { schema, angaben, beitraege } = zerlegen(dok);
  const titel = dok.name || (de ? 'Transkript' : 'Transcript');

  // Abschnitt 1: Titel, Angaben, Kodierschema (ohne Zeilennummern)
  const a1: (Absatz | InstanceType<Docx['Table']>)[] = [ueberschrift(titel, 'TITLE', true), ueberschrift(de ? 'Angaben zum Transkript' : 'About this transcript', 'HEADING_1', true)];
  const meine: string[] = [de ? 'Transkriptionsregeln: nach Froschauer und Lueger' : 'Transcription rules: after Froschauer and Lueger'];
  if (dok.datei?.name) meine.push(de ? `Datei: ${dok.datei.name}` : `File: ${dok.datei.name}`);
  for (const a of [...meine, ...angaben]) a1.push(kopfAbsatz([lauf(a, { size: 20 })]));
  a1.push(ueberschrift(de ? 'Kodierschema' : 'Coding scheme', 'HEADING_1', true));
  if (schema.length) {
    const zelle = (t: string, fett: boolean) => new D.TableCell({ children: [new D.Paragraph({ suppressLineNumbers: true, children: [lauf(t, { bold: fett, size: 20 })] })] });
    a1.push(new D.Table({
      width: { size: 100, type: D.WidthType.PERCENTAGE },
      tableLook: { firstRow: true, firstColumn: true, noHBand: true, noVBand: true },
      rows: [
        new D.TableRow({ tableHeader: true, cantSplit: true, children: (de ? ['Kennung', 'Rolle', 'Beschreibung'] : ['Code', 'Role', 'Description']).map((h) => zelle(h, true)) }),
        ...schema.map((z) => new D.TableRow({ cantSplit: true, children: [zelle(z.kennung, true), zelle(z.rolle ? (ROLLE[z.rolle]?.[sp] ?? z.rolle) : '-', false), zelle(z.beschreibung || '-', false)] }))
      ]
    }));
  } else a1.push(kopfAbsatz([lauf(de ? 'Kein Kodierschema vorhanden.' : 'No coding scheme available.', { size: 20 })]));
  a1.push(new D.Paragraph({ spacing: { before: 120, after: 120 }, suppressLineNumbers: true, children: [lauf(de ? 'Die Zeilen im Transkript sind fortlaufend nummeriert (Zeilennummern von Word, nicht Teil des Textes).' : 'The lines of the transcript are numbered continuously (Word line numbers, not part of the text).', { italics: true, size: 20 })] }));

  // Abschnitt 2: Transkript mit fortlaufenden Zeilennummern, Zeilenabstand 1,5
  const a2: Absatz[] = [ueberschrift(de ? 'Transkript' : 'Transcript', 'HEADING_1', true)];
  for (const b of beitraege) {
    const kinder: Run[] = [];
    if (b.zeitMs !== undefined) kinder.push(lauf(formatZeit(b.zeitMs, 'klammer') + ' '));
    if (b.kennung) kinder.push(lauf(`${b.kennung}:`, { bold: true }), lauf(' '));
    sauber(b.inhalt).split(/\r?\n/).forEach((z, i) => {
      betonungTeile(z).forEach((p, j) => {
        const r = new D.TextRun({ text: p.text, font: 'Arial', size: 22, ...(p.unterstrichen ? { underline: { type: D.UnderlineType.SINGLE } } : {}), ...(i > 0 && j === 0 ? { break: 1 } : {}) });
        kinder.push(r);
      });
      if (!z && i > 0) kinder.push(new D.TextRun({ text: '', break: 1 }));
    });
    a2.push(new D.Paragraph({ spacing: { before: 0, after: 120, line: 360 }, children: kinder }));
  }

  const rand = { top: 1417, bottom: 1417, left: 1417, right: RAND_RECHTS_TWIPS };
  const doc = new D.Document({
    creator: 'Statable', title: einzeilig(titel), styles: stile,
    sections: [
      { properties: { page: { margin: rand } }, children: a1 },
      { properties: { page: { margin: rand }, lineNumbers: { countBy: 1, restart: D.LineNumberRestartFormat.CONTINUOUS } }, children: a2 }
    ]
  });
  return new Uint8Array(await D.Packer.toArrayBuffer(doc));
}
