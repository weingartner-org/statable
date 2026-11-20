/**
 * Konsens-Protokoll als Word (Stufe 5, Paket 5E1, Fachblatt 5B „Konsens-Ablauf“ Punkt 6): Titel, Datum, Personen, Schwelle, Tabelle vorher (je Code),
 * jede Abweichung mit Stelle, Entscheidung und Begründung, übernommene Regeln, Tabelle nachher. Gleicher Erzeuger wie der Leitfaden (`wordStile`):
 * Sprache gesetzt, Titel gesetzt, echte Überschriften, Tabellen mit Kopfzeile. Text kommt nur als Text in die Datei, nie als Markup. `docx-pruefen` muss Ausgang 0 geben.
 */
import { wordStile } from './export';
import { dez } from '../i18n/profil';
import type { SegmentErgebnis } from './segmentuebereinstimmung';
import { artText, NACHHER_SATZ, SCHWELLE_SATZ, type KonsensProtokollDaten, type Sprache } from './qualauswertung-ausgabe';

type Docx = typeof import('docx');
type Kind = InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>;

// Zeichen, die in XML 1.0 nicht vorkommen dürfen; Zeilentrenner werden zu Leerzeichen.
const XML_UNGUELTIG = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(8) + String.fromCharCode(11, 12) + String.fromCharCode(14) + '-' + String.fromCharCode(31) + String.fromCharCode(0xfffe, 0xffff) + ']', 'g');
const ZEILENTRENNER = new RegExp('[' + String.fromCharCode(9, 10, 13, 0x2028, 0x2029) + ']+', 'g');
const einzeilig = (t: string): string => String(t ?? '').replace(XML_UNGUELTIG, '').replace(ZEILENTRENNER, ' ').trim();

const WORTE = {
  de: {
    kopf: ['Code', 'Einheiten', 'Übereinstimmend', 'Nur bei A', 'Nur bei B', 'Prozent'], gesamt: 'Gesamt', vorher: 'Vorher: wie A und B kodiert haben', nachherA: 'Nachher: A gegen Konsens', nachherB: 'Nachher: B gegen Konsens',
    personen: 'Personen', datum: 'Datum', schwelle: 'Schwelle', a: 'Kodiererin oder Kodierer A', b: 'Kodiererin oder Kodierer B', konsens: 'Konsens-Person', codes: 'Codes',
    abw: 'Abweichungen und Entscheidungen', keine: 'Keine Abweichungen entschieden.', dok: 'Dokument', stelle: 'Textstellen', entscheidung: 'Entscheidung', begr: 'Begründung', regel: 'Kodierregel übernommen',
    regeln: 'Übernommene Kodierregeln', keineRegel: 'Es wurden keine Kodierregeln übernommen.', offen: (n: number) => `${n} Abweichung${n === 1 ? '' : 'en'} blieb${n === 1 ? '' : 'en'} offen und ${n === 1 ? 'wurde' : 'wurden'} nicht in den Konsens übernommen.`,
    kappa: (k: string, n: number) => `Zufallsbereinigt nach Brennan und Prediger (k = ${n} Codes): ${k}.`, kein: 'nicht berechenbar', ende: 'Ende des Protokolls.',
    nachher: 'Übereinstimmung nach der Einigung', angabe: 'Angabe', wert: 'Wert',
  },
  en: {
    kopf: ['Code', 'Units', 'Matching', 'Only A', 'Only B', 'Percent'], gesamt: 'Total', vorher: 'Before: how A and B coded', nachherA: 'After: A against consensus', nachherB: 'After: B against consensus',
    personen: 'People', datum: 'Date', schwelle: 'Threshold', a: 'Coder A', b: 'Coder B', konsens: 'Consensus person', codes: 'Codes',
    abw: 'Deviations and decisions', keine: 'No deviations decided.', dok: 'Document', stelle: 'Passages', entscheidung: 'Decision', begr: 'Reason', regel: 'Coding rule adopted',
    regeln: 'Coding rules adopted', keineRegel: 'No coding rules were adopted.', offen: (n: number) => `${n} deviation${n === 1 ? '' : 's'} stayed open and ${n === 1 ? 'was' : 'were'} not taken into the consensus.`,
    kappa: (k: string, n: number) => `Chance-corrected after Brennan and Prediger (k = ${n} codes): ${k}.`, kein: 'not computable', ende: 'End of the protocol.',
    nachher: 'Agreement after the consensus', angabe: 'Item', wert: 'Value',
  },
} as const;

const zahl = (n: number | null, st = 2): string => (n === null ? '-' : dez(n.toFixed(st)));
const prozent = (p: number | null): string => (p === null ? '-' : `${dez((p * 100).toFixed(1))} %`);

async function basis(D: Docx, sprache: Sprache) {
  const s = wordStile(D);
  return { ...s, default: { ...s.default, document: { run: { ...s.default.document.run, language: { value: sprache } } } } };
}
const lauf = (D: Docx, t: string, o: { bold?: boolean; italics?: boolean; size?: number } = {}) => new D.TextRun({ text: einzeilig(t), font: 'Arial', size: o.size ?? 22, bold: o.bold, italics: o.italics });
const absatz = (D: Docx, t: string, o: { bold?: boolean; italics?: boolean } = {}) => new D.Paragraph({ spacing: { after: 100, line: 300 }, children: [lauf(D, t, o)] });
const ueberschrift = (D: Docx, t: string, ebene: 'TITLE' | 'HEADING_1' | 'HEADING_2') =>
  new D.Paragraph({ heading: D.HeadingLevel[ebene], children: [lauf(D, t, { bold: true, size: ebene === 'TITLE' ? 32 : ebene === 'HEADING_1' ? 26 : 23 })] });
const zelle = (D: Docx, t: string, fett = false) => new D.TableCell({ children: [new D.Paragraph({ children: [new D.TextRun({ text: einzeilig(t), font: 'Arial', size: 20, bold: fett })] })] });
function tafel(D: Docx, kopf: readonly string[], zeilen: string[][]) {
  return new D.Table({
    width: { size: 100, type: D.WidthType.PERCENTAGE },
    tableLook: { firstRow: true, firstColumn: false, noHBand: true, noVBand: true },
    rows: [new D.TableRow({ tableHeader: true, cantSplit: true, children: kopf.map(k => zelle(D, k, true)) }), ...zeilen.map(z => new D.TableRow({ cantSplit: true, children: z.map(c => zelle(D, c)) }))],
  });
}

function ergebnisTafel(D: Docx, e: SegmentErgebnis, codes: { id: string; name: string }[], w: typeof WORTE.de | typeof WORTE.en, sprache: Sprache): Kind[] {
  const name = new Map(codes.map(c => [c.id, c.name]));
  const zeilen = e.jeCode.map(c => [name.get(c.code) ?? c.code, String(c.einheiten), String(c.uebereinstimmend), String(c.nurA), String(c.nurB), prozent(c.prozent)]);
  zeilen.push([w.gesamt, String(e.einheiten), String(e.uebereinstimmend), String(e.nurA), String(e.nurB), prozent(e.prozent)]);
  void sprache;
  return [tafel(D, w.kopf, zeilen), absatz(D, w.kappa(e.kappaBP === null ? w.kein : zahl(e.kappaBP), e.k))];
}

/** Das Protokoll als Word (Bytes). */
export async function konsensProtokollWord(d: KonsensProtokollDaten): Promise<Uint8Array> {
  const w = d.sprache === 'en' ? WORTE.en : WORTE.de, D = await import('docx');
  const k: Kind[] = [ueberschrift(D, d.titel, 'TITLE')];
  k.push(ueberschrift(D, w.personen, 'HEADING_1'));
  k.push(tafel(D, [w.angabe, w.wert], [[w.datum, d.datum], [w.a, d.personA], [w.b, d.personB], [w.konsens, d.konsens], [w.schwelle, `${Math.round(d.schwelle * 100)} %`], [w.codes, d.codes.map(c => c.name).join(', ')]]));
  k.push(absatz(D, SCHWELLE_SATZ(d.schwelle, d.sprache)));
  k.push(ueberschrift(D, w.vorher, 'HEADING_1'), ...ergebnisTafel(D, d.vorher, d.codes, w, d.sprache));
  k.push(ueberschrift(D, w.abw, 'HEADING_1'));
  if (!d.abweichungen.length) k.push(absatz(D, w.keine, { italics: true }));
  for (const a of d.abweichungen) {
    k.push(ueberschrift(D, d.sprache === 'de' ? `Abweichung ${a.nr}: ${artText(a.art, 'de')}` : `Deviation ${a.nr}: ${artText(a.art, 'en')}`, 'HEADING_2'));
    k.push(tafel(D, [w.dok, w.stelle, w.entscheidung, w.begr], [[a.dokument, a.stellen.map(s => `${s.name}, ${s.codeName}: ${s.text}`).join(' || '), a.entscheidung, a.begruendung]]));
  }
  if (d.offen) k.push(absatz(D, w.offen(d.offen), { italics: true }));
  const regeln = d.abweichungen.filter(a => a.regel);
  k.push(ueberschrift(D, w.regeln, 'HEADING_1'));
  if (!regeln.length) k.push(absatz(D, w.keineRegel, { italics: true }));
  else k.push(tafel(D, [w.codes, w.regel], regeln.map(a => [a.regel!.codeName, a.regel!.text])));
  k.push(ueberschrift(D, w.nachher, 'HEADING_1'));
  k.push(absatz(D, w.nachherA, { bold: true }), ...ergebnisTafel(D, d.nachherA, d.codes, w, d.sprache));
  k.push(absatz(D, w.nachherB, { bold: true }), ...ergebnisTafel(D, d.nachherB, d.codes, w, d.sprache));
  k.push(absatz(D, NACHHER_SATZ[d.sprache]));
  k.push(absatz(D, w.ende, { italics: true }));
  const doc = new D.Document({ creator: 'Statable', title: d.titel, subject: d.sprache === 'de' ? 'Konsens-Protokoll' : 'Consensus protocol', styles: await basis(D, d.sprache), sections: [{ children: k }] });
  return new Uint8Array(await D.Packer.toArrayBuffer(doc));
}

export const konsensDateiname = (d: Pick<KonsensProtokollDaten, 'personA' | 'personB' | 'sprache'>): string =>
  `${(d.sprache === 'de' ? 'Konsens-Protokoll ' : 'Consensus protocol ') + `${d.personA} ${d.personB}`}`.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) + '.docx';
