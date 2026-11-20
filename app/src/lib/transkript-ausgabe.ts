/**
 * Transkript und Redeanteile ausgeben (Fachblatt Stufe 4, 4B „Zeitmarken umwandeln“ und „Export“):
 * f4-Text, WebVTT, Word (Transkript, Redeanteile). Statable ändert dabei nichts am Dokument.
 */
import type { Dokument } from './qualprojekt';
import { redeanteileKopf, redeanteileZellen, type RedeanteilZeile } from './redeanteile';
import { alleInhalte } from './transkript-text';
import { formatZeit } from './zeitmarken';

type Sprache = 'de' | 'en' | string;
type Docx = typeof import('docx');
const STEUER = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g;
const sauber = (t: string): string => String(t ?? '').replace(STEUER, '');
const einzeilig = (t: string): string => sauber(t).replace(/[\t\r\n\u2028\u2029]+/g, ' ').trim();

interface Beitrag { sprecher?: string; name?: string; inhalt: string; zeitMs?: number; bisMs?: number; endeMs?: number }

/** Beiträge mit Name, Inhalt (ohne Kennung und Rand-Zeitmarke) und Ende (bisMs, sonst Beginn des nächsten Beitrags). */
function beitraege(dok: Dokument): Beitrag[] {
  const t = dok.transkript;
  if (!t) return [{ inhalt: dok.text }];
  const inhalte = alleInhalte(dok);
  return t.abschnitte.map((a, i) => ({
    sprecher: a.sprecher,
    name: a.sprecher ? (t.sprecher.find((s) => s.id === a.sprecher)?.name ?? a.sprecher) : undefined,
    inhalt: inhalte[i]!, zeitMs: a.zeitMs, bisMs: a.bisMs,
    endeMs: a.bisMs ?? t.abschnitte[i + 1]?.zeitMs
  }));
}

/** Text in f4-Form: je Beitrag `Name: Inhalt #hh:mm:ss-d#` (Zeit = Ende des Beitrags), Beiträge durch eine Leerzeile. Ohne Zeit keine Marke. */
export function alsF4Text(dok: Dokument): string {
  return beitraege(dok).map((b) => `${b.name ? `${b.name}: ` : ''}${b.inhalt}${b.endeMs !== undefined ? ` ${formatZeit(b.endeMs, 'f4')}` : ''}`).join('\n\n');
}

const vttText = (t: string): string => sauber(t).replace(/\r\n?/g, '\n').replace(/\n{2,}/g, '\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** WebVTT: ein Cue je Beitrag mit `<v Name>`. Braucht Zeiten; ein letzter Beitrag ohne Ende dauert eine Sekunde. */
export function alsVtt(dok: Dokument): string {
  const bs = beitraege(dok);
  if (!bs.some((b) => b.zeitMs !== undefined)) throw new Error('Dieses Transkript hat keine Zeitangaben. WebVTT braucht Zeiten; bitte als Text oder Word ausgeben.');
  const cues: string[] = [];
  for (const b of bs) {
    if (b.zeitMs === undefined || !b.inhalt.trim()) continue;
    const ende = b.endeMs !== undefined && b.endeMs > b.zeitMs ? b.endeMs : b.zeitMs + 1000;
    const name = b.name ? `<v ${vttText(b.name).replace(/\n/g, ' ')}>` : '';
    cues.push(`${formatZeit(b.zeitMs, 'vtt')} --> ${formatZeit(ende, 'vtt')}\n${name}${vttText(b.inhalt)}`);
  }
  return `WEBVTT\n\n${cues.join('\n\n')}\n`;
}

/* ------------------------------------------------------------------ Word */
async function stile(D: Docx, sprache: string) {
  const { wordStile } = await import('./export');
  const s = wordStile(D);
  return { ...s, default: { ...s.default, document: { run: { ...s.default.document.run, language: { value: sprache } } } } };
}
const lauf = (D: Docx, t: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) =>
  new D.TextRun({ text: sauber(t).replace(/[\r\n\t]+/g, ' '), font: 'Arial', size: o.size ?? 22, bold: o.bold, italics: o.italics });
const absatz = (D: Docx, kinder: InstanceType<Docx['TextRun']>[], vor = 0) => new D.Paragraph({ spacing: { before: vor, after: 120, line: 300 }, children: kinder });
const ueberschrift = (D: Docx, t: string, ebene: 'TITLE' | 'HEADING_1') => new D.Paragraph({ heading: D.HeadingLevel[ebene], children: [lauf(D, t, { bold: true, size: ebene === 'TITLE' ? 32 : 26 })] });
const alsBytes = async (D: Docx, doc: InstanceType<Docx['Document']>) => new Uint8Array(await D.Packer.toArrayBuffer(doc));

const ROLLEN: Record<string, { de: string; en: string }> = {
  interview: { de: 'Interviewende Person', en: 'Interviewer' }, befragt: { de: 'Befragte Person', en: 'Interviewee' }, andere: { de: 'Andere', en: 'Other' }
};

/** Word: Titel, „Angaben zum Transkript“, dann ein Absatz je Beitrag mit fettem `Name:` (Zeit wählbar: keine, am Anfang, f4-Ende). */
export async function transkriptWord(dok: Dokument, opt: { zeit: 'keine' | 'anfang' | 'f4' }, sprache: Sprache = 'de'): Promise<Uint8Array> {
  const de = sprache === 'de', sp = de ? 'de' : 'en';
  const D = await import('docx');
  const t = dok.transkript;
  const k: InstanceType<Docx['Paragraph']>[] = [ueberschrift(D, dok.name || (de ? 'Transkript' : 'Transcript'), 'TITLE'), ueberschrift(D, de ? 'Angaben zum Transkript' : 'About this transcript', 'HEADING_1')];
  const angaben: string[] = [];
  if (t?.regeln === 'froschauer-lueger') angaben.push(de ? 'Transkriptionsregeln: nach Froschauer und Lueger' : 'Transcription rules: after Froschauer and Lueger');
  else if (t?.regeln) angaben.push(de ?`Transkriptionsregeln: ${t.regeln === 'einfach' ? 'einfach' : 'erweitert'} (nach Dresing und Pehl)` : `Transcription rules: ${t.regeln === 'einfach' ? 'simple' : 'extended'} (after Dresing and Pehl)`);
  if (t?.quelle) angaben.push(de ? `Quelle: ${t.quelle}` : `Source: ${t.quelle}`);
  if (dok.datei?.name) angaben.push(de ? `Datei: ${dok.datei.name}` : `File: ${dok.datei.name}`);
  if (t?.sprecher.length) angaben.push((de ? 'Sprecher: ' : 'Speakers: ') + t.sprecher.map((s) => (s.rolle ? `${s.name} (${ROLLEN[s.rolle]?.[sp] ?? s.rolle})` : s.name)).join(', '));
  if (!angaben.length) angaben.push(de ? 'Keine weiteren Angaben.' : 'No further information.');
  for (const a of angaben) k.push(absatz(D, [lauf(D, a, { size: 20 })]));
  k.push(ueberschrift(D, de ? 'Transkript' : 'Transcript', 'HEADING_1'));
  for (const b of beitraege(dok)) {
    const kinder: InstanceType<Docx['TextRun']>[] = [];
    if (opt.zeit === 'anfang' && b.zeitMs !== undefined) kinder.push(lauf(D, formatZeit(b.zeitMs, 'klammer') + ' '));
    if (b.name) kinder.push(lauf(D, `${b.name}:`, { bold: true }), lauf(D, ' '));
    const zeilen = sauber(b.inhalt).split(/\r?\n/);
    zeilen.forEach((z, i) => kinder.push(new D.TextRun({ text: z, font: 'Arial', size: 22, ...(i > 0 ? { break: 1 } : {}) })));
    if (opt.zeit === 'f4' && b.endeMs !== undefined) kinder.push(lauf(D, ' ' + formatZeit(b.endeMs, 'f4')));
    k.push(absatz(D, kinder));
  }
  const doc = new D.Document({ creator: 'Statable', title: einzeilig(dok.name || (de ? 'Transkript' : 'Transcript')), styles: await stile(D, sp), sections: [{ children: k }] });
  return alsBytes(D, doc);
}

/** Word: Tabelle der Redeanteile mit Kopfzeile und dem Hinweis, dass Redeanteile nicht sagen, was gesagt wird. */
export async function redeanteileWord(zeilen: RedeanteilZeile[], dokName: string, sprache: Sprache = 'de'): Promise<Uint8Array> {
  const de = sprache === 'de', sp = de ? 'de' : 'en';
  const D = await import('docx');
  const titel = `${de ? 'Redeanteile' : 'Speaking shares'}: ${einzeilig(dokName)}`;
  const zelle = (t: string, fett: boolean) => new D.TableCell({ children: [new D.Paragraph({ children: [new D.TextRun({ text: sauber(t), font: 'Arial', size: 20, bold: fett })] })] });
  const tabelle = new D.Table({
    width: { size: 100, type: D.WidthType.PERCENTAGE },
    tableLook: { firstRow: true, firstColumn: true, noHBand: true, noVBand: true },
    rows: [
      new D.TableRow({ tableHeader: true, cantSplit: true, children: redeanteileKopf(sp).map((h) => zelle(h, true)) }),
      ...zeilen.map((z) => { const c = redeanteileZellen({ ...z, rolle: z.rolle ? (ROLLEN[z.rolle]?.[sp] ?? z.rolle) : undefined }); return new D.TableRow({ cantSplit: true, children: c.map((t, i) => zelle(t, i === 0)) }); })
    ]
  });
  const k: (InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>)[] = [
    ueberschrift(D, titel, 'TITLE'), ueberschrift(D, de ? 'Redeanteile je Person' : 'Speaking shares by person', 'HEADING_1'), tabelle,
    absatz(D, [lauf(D, de ? 'Redeanteile sagen, wie viel jemand spricht, nicht was. Im Interview soll die befragte Person meist deutlich mehr sprechen.' : 'Speaking shares say how much someone speaks, not what is said. In an interview the interviewee usually speaks considerably more.', { italics: true, size: 20 })], 200)
  ];
  const doc = new D.Document({ creator: 'Statable', title: einzeilig(titel), styles: await stile(D, sp), sections: [{ children: k }] });
  return alsBytes(D, doc);
}
