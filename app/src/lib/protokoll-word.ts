/**
 * Word-Export eines Protokolls (Feinstruktur F2A): Titel (Art und Fall-Kennung), Kopf als Tabelle mit Kopfzeile,
 * Felder als Überschrift Ebene 2 mit Text darunter; Gedächtnisprotokoll mit drei Schritten, Schritt 3 als Tabelle „Beobachtung | Überlegung“.
 * Keine Klarnamen: nur `Fall.name` kommt ins Dokument. Reine Funktion (die Seite lädt herunter).
 */
import type { Protokoll, QualProjekt } from './qualprojekt';
import { BEOBACHTUNG_FELD_TEXT, INTERVIEW_FELD_TEXT, KOPF_TEXT, PROTOKOLL_ART, SCHRITT_TEXT, datumAnzeige } from './protokoll-texte';
import { INTERVIEW_FELDER } from './protokolle';
import { formatZeit } from './zeitmarken';

type Docx = typeof import('docx');
type Teil = InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>;

const STEUER = new RegExp('[\x00-\x08\x0b\x0c\x0e-\x1f' + String.fromCharCode(0xfffe, 0xffff) + ']', 'g');
const sauber = (t: string): string => String(t ?? '').replace(STEUER, '');
const ZEILENENDEN = new RegExp('[\t\r\n' + String.fromCharCode(0x2028, 0x2029) + ']+', 'g');
const einzeilig = (t: string): string => sauber(t).replace(ZEILENENDEN, ' ').trim();

export async function protokollWord(p: Protokoll, projekt: QualProjekt, sprache: 'de' | 'en'): Promise<Uint8Array> {
  const sp = sprache === 'de' ? 'de' : 'en';
  const de = sp === 'de';
  const D: Docx = await import('docx');
  const { wordStile } = await import('./export');
  const s = wordStile(D);
  const stile = { ...s, default: { ...s.default, document: { run: { ...s.default.document.run, language: { value: sp } } } } };

  const lauf = (t: string, o: { bold?: boolean; size?: number } = {}) => new D.TextRun({ text: sauber(t).replace(/[\r\n\t]+/g, ' '), font: 'Arial', size: o.size ?? 22, bold: o.bold });
  const ueb = (t: string, ebene: 'TITLE' | 'HEADING_1' | 'HEADING_2') => new D.Paragraph({ heading: D.HeadingLevel[ebene], children: [lauf(t, { bold: true, size: ebene === 'TITLE' ? 32 : ebene === 'HEADING_1' ? 26 : 23 })] });
  /** Text mit Zeilenumbrüchen als eigene Absätze; leer: ein Strich. */
  const textAbs = (t: string | undefined): InstanceType<Docx['Paragraph']>[] => {
    const z = sauber(t ?? '').split(/\r?\n/);
    if (!z.some((x) => x.trim())) return [new D.Paragraph({ spacing: { after: 120 }, children: [lauf('-')] })];
    return z.map((x) => new D.Paragraph({ spacing: { after: 120, line: 300 }, children: [lauf(x)] }));
  };
  const zelle = (t: string, fett = false) => new D.TableCell({ children: fett ? [new D.Paragraph({ children: [lauf(t, { bold: true })] })] : textAbs(t) });
  const tabelle = (kopf: string[], zeilen: string[][]) => new D.Table({
    width: { size: 100, type: D.WidthType.PERCENTAGE },
    tableLook: { firstRow: true, noHBand: true, noVBand: true },
    rows: [
      new D.TableRow({ tableHeader: true, cantSplit: true, children: kopf.map((k) => zelle(k, true)) }),
      ...zeilen.map((z) => new D.TableRow({ children: z.map((t) => zelle(t)) }))
    ]
  });

  const fall = p.fall ? projekt.faelle.find((f) => f.id === p.fall) : undefined;
  const art = PROTOKOLL_ART[p.art][sp];
  const titel = fall ? `${art} - ${einzeilig(fall.name)}` : art;

  const teile: Teil[] = [ueb(titel, 'TITLE'), ueb(de ? 'Angaben' : 'Details', 'HEADING_1')];
  const zeilen: string[][] = [];
  if (fall) zeilen.push([KOPF_TEXT.fall[sp], einzeilig(fall.name)]);
  const k = p.kopf;
  if (k.datum) zeilen.push([KOPF_TEXT.datum[sp], datumAnzeige(k.datum, sp)]);
  if (k.uhrzeit) zeilen.push([KOPF_TEXT.uhrzeit[sp], einzeilig(k.uhrzeit)]);
  if (k.ort) zeilen.push([KOPF_TEXT.ort[sp], einzeilig(k.ort)]);
  if (k.dauerMin !== undefined) zeilen.push([KOPF_TEXT.dauer[sp], String(k.dauerMin)]);
  if (k.kontaktweg) zeilen.push([KOPF_TEXT.kontaktweg[sp], einzeilig(k.kontaktweg)]);
  if (p.art === 'gedaechtnis' && p.schritte?.s1?.beginn) {
    const d = new Date(p.schritte.s1.beginn);
    zeilen.push([de ? 'Beginn Schritt 1' : 'Start of step 1', d.toLocaleString(de ? 'de-AT' : 'en-GB')]);
  }
  if (!zeilen.length) zeilen.push([de ? 'Angaben' : 'Details', '-']);
  teile.push(tabelle([de ? 'Angabe' : 'Item', de ? 'Eintrag' : 'Entry'], zeilen));

  if (p.art === 'interview') {
    teile.push(ueb(de ? 'Protokoll' : 'Protocol', 'HEADING_1'));
    for (const key of INTERVIEW_FELDER) {
      teile.push(ueb(INTERVIEW_FELD_TEXT[key]!.name[sp], 'HEADING_2'), ...textAbs(p.felder[key]));
    }
    teile.push(ueb(de ? 'Schwierige Stellen' : 'Difficult passages', 'HEADING_2'));
    const st = p.schwierigeStellen ?? [];
    if (!st.length) teile.push(...textAbs(''));
    for (const x of st) teile.push(...textAbs(`${x.zeitMs !== undefined ? formatZeit(x.zeitMs, 'klammer') + ' ' : ''}${x.text}`));
    // Felder, die diese Fassung nicht kennt, gehen nicht verloren
    const fremd = Object.keys(p.felder).filter((x) => !(INTERVIEW_FELDER as readonly string[]).includes(x));
    for (const x of fremd) teile.push(ueb(einzeilig(x), 'HEADING_2'), ...textAbs(p.felder[x]));
  } else if (p.art === 'beobachtung') {
    teile.push(ueb(de ? 'Protokoll' : 'Protocol', 'HEADING_1'));
    for (const key of ['beobachtung', 'ueberlegung'] as const) {
      teile.push(ueb(BEOBACHTUNG_FELD_TEXT[key].name[sp], 'HEADING_2'), ...textAbs(p.felder[key]));
    }
  } else {
    const sch = p.schritte ?? {};
    teile.push(ueb(SCHRITT_TEXT.s1.name[sp], 'HEADING_1'), ...textAbs(sch.s1?.text));
    teile.push(ueb(SCHRITT_TEXT.s2.name[sp], 'HEADING_1'), ...textAbs(sch.s2?.text));
    if (sch.s2?.notizen) teile.push(ueb(de ? 'Notizen aus dem Feld (Jottings)' : 'Notes from the field (jottings)', 'HEADING_2'), ...textAbs(sch.s2.notizen));
    teile.push(ueb(SCHRITT_TEXT.s3.name[sp], 'HEADING_1'));
    const ab = sch.s3?.abschnitte ?? [];
    if (!ab.length) teile.push(...textAbs(''));
    else teile.push(tabelle([BEOBACHTUNG_FELD_TEXT.beobachtung.name[sp], BEOBACHTUNG_FELD_TEXT.ueberlegung.name[sp]], ab.map((a) => [a.beobachtung, a.ueberlegung])));
  }

  const doc = new D.Document({
    creator: 'Statable', title: einzeilig(titel), styles: stile,
    sections: [{ properties: { page: { margin: { top: 1417, bottom: 1417, left: 1417, right: 1417 } } }, children: teile }]
  });
  return new Uint8Array(await D.Packer.toArrayBuffer(doc));
}
