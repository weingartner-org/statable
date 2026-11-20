/**
 * Nachvollziehbarkeit (Ausbau A1): Ansicht und Word-Ausgaben zum Änderungsprotokoll des Codebuchs, Methodenanhang des Projekts.
 * Reine Funktionen ohne Oberfläche. Nie Text aus Dokumenten (keine Ankerbeispiele, keine Segmente); von Statable wird nichts ausgefüllt,
 * die KI-Angabe der Person steht wörtlich da. Einwilligungen nur als „dokumentiert: ja/nein“ je Fall.
 */
import { CODE_AENDERUNGEN, codeProtokoll, type CodeWert } from './codebuch-protokoll';
import { methodenanhang } from './feinstruktur-word';
import { PROTOKOLL_ART } from './protokoll-texte';
import { MEMO_ARTEN, type Aenderung, type Code, type KodierPhase, type QualProjekt, type ThemaSchritt, type ThemaStand } from './qualprojekt';
import { ARBEITSWEISE_TEXT, arbeitsweise as arbeitsweiseVon } from './arbeitsweise';
import { themaFaelle, themenReihenfolge } from './themen';
import { designName, gewichtText, integrationText, notation, reihenfolgeText, zweckText } from './mm-design';
import { punkteDer, standText } from './mm-selbstpruefung';
import { zeilenName } from './mixed';
import { passungName } from './faellesaetze';

type Sp = 'de' | 'en';
type Docx = typeof import('docx');
type Teil = InstanceType<Docx['Paragraph']> | InstanceType<Docx['Table']>;

/** Feste Texte je Kennung des Änderungsprotokolls */
export const ART_TEXT: Record<string, { de: string; en: string }> = {
  'code.neu': { de: 'Code angelegt', en: 'Code created' },
  'code.umbenannt': { de: 'Code umbenannt', en: 'Code renamed' },
  'code.definition': { de: 'Definition geändert', en: 'Definition changed' },
  'code.regel': { de: 'Kodierregel geändert', en: 'Coding rule changed' },
  'code.anker': { de: 'Ankerbeispiele geändert', en: 'Anchor examples changed' },
  'code.verschoben': { de: 'Code verschoben', en: 'Code moved' },
  'code.zusammengelegt': { de: 'Codes zusammengelegt', en: 'Codes merged' },
  'code.geteilt': { de: 'Code geteilt', en: 'Code split' },
  'code.geloescht': { de: 'Code gelöscht', en: 'Code deleted' },
  'code.phase': { de: 'Phase geändert', en: 'Phase changed' },
  'code.kodierbar': { de: 'Kodierbar geändert', en: 'Codable changed' },
  // Stufe A3: Verweise auf Themen (Einzelheiten im Verlauf des Themas)
  'thema.angelegt': { de: 'Thema angelegt', en: 'Theme created' },
  'thema.umbenannt': { de: 'Thema umbenannt', en: 'Theme renamed' },
  'thema.konzept': { de: 'Zentrales Konzept geändert', en: 'Central organising concept changed' },
  'thema.beschreibung': { de: 'Beschreibung des Themas geändert', en: 'Theme description changed' },
  'thema.codes': { de: 'Codes des Themas geändert', en: 'Codes of the theme changed' },
  'thema.belege': { de: 'Belege des Themas geändert', en: 'Passages of the theme changed' },
  'thema.zusammengelegt': { de: 'Themen zusammengelegt', en: 'Themes merged' },
  'thema.geteilt': { de: 'Thema geteilt', en: 'Theme split' },
  'thema.verworfen': { de: 'Thema verworfen', en: 'Theme discarded' },
  'thema.wieder-aufgenommen': { de: 'Thema wieder aufgenommen', en: 'Theme taken up again' },
  'thema.stand': { de: 'Stand des Themas geändert', en: 'Theme status changed' },
  'thema.eltern': { de: 'Thema verschoben (Unterthema)', en: 'Theme moved (subtheme)' },
  'thema.fall': { de: 'Fall des Themas geändert', en: 'Case of the theme changed' },
};
/** Wörter für Kodierphasen, Stand und Schritte von Themen (Methodenanhang, Oberfläche) */
export const PHASE_TEXT: Record<KodierPhase, { de: string; en: string }> = {
  offen: { de: 'offen', en: 'open' }, fokussiert: { de: 'fokussiert', en: 'focused' }, axial: { de: 'axial', en: 'axial' }, theoretisch: { de: 'theoretisch', en: 'theoretical' },
};
export const STAND_TEXT: Record<ThemaStand, { de: string; en: string }> = {
  kandidat: { de: 'Kandidat', en: 'candidate' }, aktiv: { de: 'aktiv', en: 'active' }, verworfen: { de: 'verworfen', en: 'discarded' },
};
export const SCHRITT_TEXT: Record<ThemaSchritt['was'], { de: string; en: string }> = {
  angelegt: { de: 'angelegt', en: 'created' }, umbenannt: { de: 'umbenannt', en: 'renamed' }, konzept: { de: 'zentrales Konzept', en: 'central concept' },
  beschreibung: { de: 'Beschreibung', en: 'description' }, codes: { de: 'Codes', en: 'codes' }, belege: { de: 'Belege', en: 'passages' },
  zusammengelegt: { de: 'zusammengelegt', en: 'merged' }, geteilt: { de: 'geteilt', en: 'split' }, verworfen: { de: 'verworfen', en: 'discarded' },
  'wieder-aufgenommen': { de: 'wieder aufgenommen', en: 'taken up again' }, stand: { de: 'Stand', en: 'status' }, eltern: { de: 'Unterthema von', en: 'subtheme of' }, fall: { de: 'Fall', en: 'case' },
};
/** Namen der Memo-Arten (Methodenanhang) */
export const MEMO_ART_TEXT: Record<string, { de: string; en: string }> = {
  memo: { de: 'Memo', en: 'Memo' }, 'feldnotiz-empirisch': { de: 'Feldnotiz empirisch', en: 'Field note: empirical' }, 'feldnotiz-methodisch': { de: 'Feldnotiz methodisch', en: 'Field note: methodological' },
  'feldnotiz-theoretisch': { de: 'Feldnotiz theoretisch', en: 'Field note: theoretical' }, tagebuch: { de: 'Reflexives Tagebuch', en: 'Reflexive journal' },
  'gt-code': { de: 'Code-Memo', en: 'Code memo' }, 'gt-theoretisch': { de: 'Theoretisches Memo', en: 'Theoretical memo' }, 'gt-methodisch': { de: 'Methodenmemo', en: 'Methodological memo' },
  'gt-auswahl': { de: 'Theoretische Auswahl', en: 'Theoretical sampling' }, saettigung: { de: 'Sättigungs-Memo', en: 'Saturation memo' },
  'ipa-beschreibend': { de: 'Randnotiz beschreibend', en: 'Exploratory note: descriptive' }, 'ipa-sprachlich': { de: 'Randnotiz sprachlich', en: 'Exploratory note: linguistic' },
  'ipa-begrifflich': { de: 'Randnotiz begrifflich', en: 'Exploratory note: conceptual' }, vergleich: { de: 'Vergleich zweier Stellen', en: 'Comparison of two passages' },
};
export const artText = (was: string, sp: Sp): string => ART_TEXT[was]?.[sp] ?? was;
/** Arten, die im Projekt vorkommen, in fester Reihenfolge (erst die bekannten, dann fremde Kennungen) */
export function artenIn(q: Pick<QualProjekt, 'protokoll'>): string[] {
  const da = new Set(codeProtokoll(q).map(a => a.was));
  const bekannt = (CODE_AENDERUNGEN as readonly string[]).filter(x => da.has(x));
  return [...bekannt, ...[...da].filter(x => !bekannt.includes(x)).sort()];
}

export interface ProtokollZeile {
  zeit: number; zeitText: string; person: string;
  art: string; artText: string;
  /** Code-id (Filter-Schlüssel) und Name von heute */
  code: string; codeName: string;
  vorher: string; nachher: string;
}
export interface ProtokollFilter { art?: string; code?: string }

const zeitText = (ms: number, sp: Sp): string =>
  new Date(ms).toLocaleString(sp === 'de' ? 'de-AT' : 'en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

const wertVon = (v: unknown): CodeWert | undefined => (v && typeof v === 'object' && typeof (v as CodeWert).code === 'string' ? (v as CodeWert) : undefined);
const wertText = (v: unknown, sp: Sp): string => {
  const w = wertVon(v);
  if (!w) return '-';
  if (w.anzahl !== undefined) return sp === 'de' ? (w.anzahl === 1 ? '1 Ankerbeispiel' : `${w.anzahl} Ankerbeispiele`) : (w.anzahl === 1 ? '1 anchor example' : `${w.anzahl} anchor examples`);
  return w.text?.trim() ? w.text : '-';
};

/** Name des Codes: heute gültiger Name, sonst (gelöscht) aus dem Eintrag; letzte Rückfallebene die Kennung. */
function codeNamen(q: Pick<QualProjekt, 'codes' | 'protokoll'>, sp: Sp): (id: string) => string {
  const heute = new Map<string, string>(q.codes.map((c: Code) => [c.id, c.name]));
  const frueher = new Map<string, string>();
  for (const a of q.protokoll) {
    const v = wertVon(a.vorher), n = wertVon(a.nachher);
    if (a.was === 'code.geloescht' && v?.text) frueher.set(v.code, v.text);
    else if (n?.text && (a.was === 'code.neu' || a.was === 'code.umbenannt') && !frueher.has(n.code)) frueher.set(n.code, n.text);
  }
  const geloescht = sp === 'de' ? ' (gelöscht)' : ' (deleted)';
  return (id) => heute.get(id) ?? (frueher.has(id) ? frueher.get(id)! + geloescht : id + geloescht);
}

const codeIdVon = (a: Aenderung): string => (wertVon(a.nachher) ?? wertVon(a.vorher))?.code ?? '';

/** Zeilen für die Ansicht, neueste zuerst. */
export function protokollZeilen(q: Pick<QualProjekt, 'protokoll' | 'codes' | 'kodierende'>, sprache: Sp, filter: ProtokollFilter = {}): ProtokollZeile[] {
  const name = codeNamen(q, sprache);
  const person = new Map(q.kodierende.map(k => [k.id, k.name]));
  return codeProtokoll(q)
    .map((a): ProtokollZeile => {
      const code = codeIdVon(a);
      // Themen-Verweis (A3): Name des Themas statt eines Codes
      const th = a.was.startsWith('thema.') ? (a.nachher as { text?: unknown } | undefined)?.text : undefined;
      return {
        zeit: a.zeit, zeitText: zeitText(a.zeit, sprache), person: (a.kodierende && person.get(a.kodierende)) || '-',
        art: a.was, artText: artText(a.was, sprache), code, codeName: code ? name(code) : typeof th === 'string' ? (sprache === 'de' ? `Thema: ${th}` : `Theme: ${th}`) : '-',
        vorher: wertText(a.vorher, sprache), nachher: wertText(a.nachher, sprache),
      };
    })
    .filter(z => (!filter.art || z.art === filter.art) && (!filter.code || z.code === filter.code));
}

/** Codes, die im Protokoll vorkommen (Auswahl für den Filter), nach Name sortiert */
export function codesImProtokoll(q: Pick<QualProjekt, 'protokoll' | 'codes' | 'kodierende'>, sprache: Sp): { id: string; name: string }[] {
  const m = new Map<string, string>();
  for (const z of protokollZeilen(q, sprache)) if (z.code && !m.has(z.code)) m.set(z.code, z.codeName);
  return [...m].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, sprache));
}

/* ---------------- Word ---------------- */

const STEUER = new RegExp('[\x00-\x08\x0b\x0c\x0e-\x1f' + String.fromCharCode(0xfffe, 0xffff) + ']', 'g');
const sauber = (t: string): string => String(t ?? '').replace(STEUER, '');

export async function wordWerkzeug(sp: Sp) {
  const D: Docx = await import('docx');
  const { wordStile } = await import('./export');
  const s = wordStile(D);
  const stile = { ...s, default: { ...s.default, document: { run: { ...s.default.document.run, language: { value: sp } } } } };
  const lauf = (t: string, f: { bold?: boolean; italics?: boolean; size?: number } = {}) => new D.TextRun({ text: sauber(t).replace(/[\r\n\t]+/g, ' '), font: 'Arial', size: f.size ?? 22, bold: f.bold, italics: f.italics });
  const absatz = (t: string, f: { bold?: boolean; italics?: boolean } = {}) => new D.Paragraph({ spacing: { after: 120 }, children: [lauf(t, f)] });
  const punkt = (t: string) => new D.Paragraph({ bullet: { level: 0 }, children: [lauf(t)] });
  const ue = (t: string, e: 'TITLE' | 'HEADING_1' | 'HEADING_2') =>
    new D.Paragraph({ heading: D.HeadingLevel[e], children: [lauf(t, { bold: true, size: e === 'TITLE' ? 32 : e === 'HEADING_1' ? 26 : 24 })] });
  const zelle = (t: string, fett = false) => new D.TableCell({ children: [new D.Paragraph({ children: [lauf(t || '-', { bold: fett, size: 20 })] })] });
  const tabelle = (kopf: string[], zeilen: string[][]) => new D.Table({
    width: { size: 100, type: D.WidthType.PERCENTAGE }, tableLook: { firstRow: true, noHBand: true, noVBand: true },
    rows: [
      new D.TableRow({ tableHeader: true, cantSplit: true, children: kopf.map(k => zelle(k, true)) }),
      ...zeilen.map(z => new D.TableRow({ cantSplit: true, children: z.map(t => zelle(t)) })),
    ],
  });
  const fertig = async (titel: string, kinder: Teil[]) => {
    const doc = new D.Document({ creator: 'Statable', title: sauber(titel).replace(/\s+/g, ' '), styles: stile, sections: [{ properties: { page: { margin: { top: 1417, bottom: 1417, left: 1417, right: 1417 } } }, children: kinder }] });
    return new Uint8Array(await D.Packer.toArrayBuffer(doc));
  };
  return { absatz, punkt, ue, tabelle, fertig };
}

const KOPF_PROTOKOLL = { de: ['Zeit', 'Person', 'Art', 'Code', 'Vorher', 'Nachher'], en: ['Time', 'Person', 'Type', 'Code', 'Before', 'After'] };
const zeileZuText = (z: ProtokollZeile): string[] => [z.zeitText, z.person, z.artText, z.codeName, z.vorher, z.nachher];

/** Das ganze Änderungsprotokoll (nach den Filtern der Ansicht) als Word-Tabelle. */
export async function protokollWord(q: QualProjekt, sprache: Sp, filter: ProtokollFilter = {}): Promise<Uint8Array> {
  const sp: Sp = sprache === 'en' ? 'en' : 'de', de = sp === 'de';
  const w = await wordWerkzeug(sp);
  const alle = protokollZeilen(q, sp), z = protokollZeilen(q, sp, filter);
  const titel = de ? 'Änderungsprotokoll des Codebuchs' : 'Change log of the codebook';
  const k: Teil[] = [w.ue(titel, 'TITLE'), w.absatz(sauber(q.name))];
  const fl: string[] = [];
  if (filter.art) fl.push(`${de ? 'Art' : 'Type'}: ${artText(filter.art, sp)}`);
  if (filter.code) fl.push(`Code: ${alle.find(x => x.code === filter.code)?.codeName ?? filter.code}`);
  if (fl.length) k.push(w.absatz(`Filter: ${fl.join('; ')}`));
  k.push(w.absatz(de ? `${z.length} von ${alle.length} Einträgen.` : `${z.length} of ${alle.length} entries.`));
  k.push(w.ue(de ? 'Einträge, neueste zuerst' : 'Entries, newest first', 'HEADING_1'));
  if (!z.length) k.push(w.absatz(de ? 'Keine Einträge.' : 'No entries.', { italics: true }));
  else k.push(w.tabelle(KOPF_PROTOKOLL[sp], z.map(zeileZuText)));
  return w.fertig(titel, k);
}

/** Codebaum in Reihenfolge von oben nach unten, mit Ebene */
function codeReihenfolge(codes: readonly Code[]): { code: Code; ebene: number }[] {
  const ids = new Set(codes.map(c => c.id));
  const kinder = new Map<string | undefined, Code[]>();
  for (const c of codes) {
    const e = c.elternId && ids.has(c.elternId) && c.elternId !== c.id ? c.elternId : undefined;
    kinder.set(e, [...(kinder.get(e) ?? []), c]);
  }
  const aus: { code: Code; ebene: number }[] = [], gesehen = new Set<string>();
  const geh = (e: string | undefined, ebene: number) => {
    for (const c of (kinder.get(e) ?? []).slice().sort((a, b) => a.reihenfolge - b.reihenfolge)) {
      if (gesehen.has(c.id)) continue;
      gesehen.add(c.id); aus.push({ code: c, ebene }); geh(c.id, ebene + 1);
    }
  };
  geh(undefined, 0);
  for (const c of codes) if (!gesehen.has(c.id)) { gesehen.add(c.id); aus.push({ code: c, ebene: 0 }); geh(c.id, 1); }
  return aus;
}

const zahlWort = (n: number, de1: string, deN: string, en1: string, enN: string, sp: Sp): string => (sp === 'de' ? (n === 1 ? `1 ${de1}` : `${n} ${deN}`) : (n === 1 ? `1 ${en1}` : `${n} ${enN}`));

/** Was nicht in der REFI-QDA-Datei (.qdpx) steht (Liste des Knopfs „Als REFI-QDA-Projekt speichern“, dazu die Angaben dieser Stufe) */
export { NICHT_IN_QDPX } from './qdpx-schreiben';
import { NICHT_IN_QDPX } from './qdpx-schreiben';

/** Methodenanhang des Projekts als Word-Datei. Enthält nie Text aus Dokumenten. */
export async function methodenanhangWord(q: QualProjekt, sprache: Sp): Promise<Uint8Array> {
  const sp: Sp = sprache === 'en' ? 'en' : 'de', de = sp === 'de';
  const w = await wordWerkzeug(sp);
  const titel = de ? 'Methodenanhang' : 'Methods appendix';
  const k: Teil[] = [w.ue(titel, 'TITLE'), w.absatz(sauber(q.name))];

  // (1) Projekt und Kodierende
  k.push(w.ue(de ? 'Projekt und Kodierende' : 'Project and coders', 'HEADING_1'));
  const namen = q.kodierende.map(x => x.name).filter(Boolean);
  const dd = zahlWort(q.dokumente.length, 'Dokument', 'Dokumente', 'document', 'documents', sp), ff = zahlWort(q.faelle.length, 'Fall', 'Fälle', 'case', 'cases', sp);
  k.push(w.absatz(de ? `Das Projekt enthält ${dd} und ${ff}.` : `The project contains ${dd} and ${ff}.`));
  k.push(w.absatz(namen.length ? `${de ? 'Kodierende' : 'Coders'}: ${namen.join(', ')}.` : (de ? 'Kodierende: keine eingetragen.' : 'Coders: none entered.')));
  // Arbeitsweise (A3): nur die Angabe der Person
  const aw = arbeitsweiseVon(q);
  k.push(w.absatz(q.arbeitsweise
    ? `${de ? 'Arbeitsweise' : 'Approach'}: ${ARBEITSWEISE_TEXT[aw].name[de ? 0 : 1]}${ARBEITSWEISE_TEXT[aw].quelle ? ` (${ARBEITSWEISE_TEXT[aw].quelle})` : ''}.`
    : (de ? 'Arbeitsweise: nicht gewählt (allgemein).' : 'Approach: not chosen (general).')));
  if (q.einzelfall && (q.einzelfall.fertig.length || q.einzelfall.an)) {
    const fn = (id: string): string => q.faelle.find(f => f.id === id)?.name ?? id;
    const n = q.einzelfall.fertig.length;
    const reihe = q.einzelfall.fertig.map(fn).join(', ');
    k.push(w.absatz(de
      ? `Einzelfall-Modus (IPA): ${n} von ${q.faelle.length} Fällen als fertig markiert${n ? ` (in dieser Reihenfolge: ${reihe})` : ''}.`
      : `Single-case mode (IPA): ${n} of ${q.faelle.length} cases marked as done${n ? ` (in this order: ${reihe})` : ''}.`));
  }
  // Memos nach Art (nur Zahlen, nie Text)
  const memoArt = new Map<string, number>();
  for (const m of q.memos) memoArt.set(m.art ?? 'memo', (memoArt.get(m.art ?? 'memo') ?? 0) + 1);
  if ([...memoArt.keys()].some(x => x !== 'memo')) {
    k.push(w.absatz(`${de ? 'Memos nach Art' : 'Memos by type'}: ${MEMO_ARTEN.filter(x => memoArt.has(x)).map(x => `${MEMO_ART_TEXT[x]![sp]} ${memoArt.get(x)}`).join(', ')}.`));
  }

  // (2) Codebaum
  k.push(w.ue(de ? 'Codebaum' : 'Code tree', 'HEADING_1'));
  if (!q.codes.length) k.push(w.absatz(de ? 'Es gibt noch keine Codes.' : 'There are no codes yet.', { italics: true }));
  else {
    const phaseVon = (c: Code): string => (c.phase ? PHASE_TEXT[c.phase]?.[sp] ?? c.phase : '');
    const mitPhase = q.codes.some(c => phaseVon(c) !== '');
    const kopf = de ? ['Ebene', 'Name', 'Definition', 'Kodierregel', 'Ankerbeispiele', 'Kodierbar'] : ['Level', 'Name', 'Definition', 'Coding rule', 'Anchor examples', 'Codable'];
    if (mitPhase) kopf.push(de ? 'Phase' : 'Phase');
    k.push(w.tabelle(kopf, codeReihenfolge(q.codes).map(({ code: c, ebene }) => [
      String(ebene + 1), c.name, c.definition ?? '', c.regel ?? '', String(c.anker?.length ?? 0), c.kodierbar ? (de ? 'ja' : 'yes') : (de ? 'nein' : 'no'),
      ...(mitPhase ? [phaseVon(c)] : []),
    ])));
  }

  // (3) Änderungsprotokoll gekürzt: je Code und Art der letzte Eintrag, höchstens 50
  k.push(w.ue(de ? 'Änderungsprotokoll (gekürzt)' : 'Change log (shortened)', 'HEADING_1'));
  const alle = protokollZeilen(q, sp); // neueste zuerst
  const letzte = new Map<string, ProtokollZeile>();
  for (const z of alle) { const s = z.code + '\u0000' + z.art; if (!letzte.has(s)) letzte.set(s, z); }
  const kurz = [...letzte.values()].sort((a, b) => b.zeit - a.zeit).slice(0, 50).sort((a, b) => a.zeit - b.zeit);
  if (!alle.length) k.push(w.absatz(de ? 'Es gibt keine Einträge im Änderungsprotokoll.' : 'There are no entries in the change log.', { italics: true }));
  else {
    const n = zahlWort(alle.length, 'Eintrag', 'Einträge', 'entry', 'entries', sp);
    k.push(w.absatz(de
      ? `Das Änderungsprotokoll hat ${n}. Hier steht je Code und Art nur der letzte Eintrag (höchstens 50 Zeilen, ${kurz.length} gezeigt).`
      : `The change log has ${n}. Only the last entry per code and type is shown (at most 50 rows, ${kurz.length} shown).`));
    k.push(w.tabelle(KOPF_PROTOKOLL[sp], kurz.map(zeileZuText)));
  }

  // (4) Übereinstimmung
  k.push(w.ue(de ? 'Übereinstimmung der Kodierenden' : 'Agreement between coders', 'HEADING_1'));
  k.push(w.absatz(aw === 'ta-reflexiv'
    ? (de ? 'Bei reflexiver Themenanalyse wird keine Übereinstimmungszahl als Gütemaß berichtet.' : 'In reflexive thematic analysis, no agreement figure is reported as a quality measure.')
    : (de ? 'Statable schreibt keine Übereinstimmungszahl in den Anhang, weil keine gespeichert ist.' : 'Statable does not write an agreement figure into the appendix because none is stored.')));

  // (4b) Themen (A3): Stand und Verlauf; verworfene Themen nur genannt
  const th = themenReihenfolge(q).map(x => x.thema);
  if (th.length) {
    k.push(w.ue(de ? 'Themen' : 'Themes', 'HEADING_1'));
    const lebend = th.filter(t => t.stand !== 'verworfen'), weg = th.filter(t => t.stand === 'verworfen');
    const codeName = (id: string): string => q.codes.find(c => c.id === id)?.name ?? id;
    const fallName = (id: string): string => q.faelle.find(f => f.id === id)?.name ?? id;
    const themaName = (id: string): string => th.find(t => t.id === id)?.name ?? id;
    if (lebend.length) {
      k.push(w.absatz(de ? 'Die Themen hat die forschende Person gebildet; Statable schlägt keine Themen vor.' : 'The themes were developed by the researcher; Statable does not suggest themes.'));
      k.push(w.tabelle(de ? ['Thema', 'Stand', 'Zentrales Konzept', 'Codes', 'Fälle', 'Art'] : ['Theme', 'Status', 'Central organising concept', 'Codes', 'Cases', 'Kind'],
        lebend.map(t => [
          t.name, STAND_TEXT[t.stand][sp], t.konzept ?? '', t.codes.map(codeName).join(', '),
          de ? `${themaFaelle(q, t).length} von ${q.faelle.length}` : `${themaFaelle(q, t).length} of ${q.faelle.length}`,
          t.fall ? (de ? `persönlich (${fallName(t.fall)})` : `personal (${fallName(t.fall)})`)
            : t.aus?.length ? (de ? `Gruppe aus ${t.aus.map(themaName).join(', ')}` : `group from ${t.aus.map(themaName).join(', ')}`)
              : t.elternId ? (de ? `Unterthema von ${themaName(t.elternId)}` : `subtheme of ${themaName(t.elternId)}`) : '',
        ])));
      k.push(w.ue(de ? 'Verlauf der Themen' : 'History of the themes', 'HEADING_2'));
      k.push(w.tabelle(de ? ['Thema', 'Zeit', 'Schritt', 'Vorher', 'Nachher', 'Notiz'] : ['Theme', 'Time', 'Step', 'Before', 'After', 'Note'],
        lebend.flatMap(t => t.verlauf.map(s => [t.name, zeitText(s.zeit, sp), SCHRITT_TEXT[s.was]?.[sp] ?? s.was, s.vorher ?? '', s.nachher ?? '', s.notiz ?? '']))));
    }
    if (weg.length) k.push(w.absatz(`${de ? 'Verworfene Themen' : 'Discarded themes'}: ${weg.map(t => t.name).join(', ')}.`));
  }

  // (4c) Mixed Methods (A2): Angaben und Texte der Person; nie Text aus Dokumenten (gewählte Belege stehen im Word des Joint Displays, nicht hier)
  const jds = q.jointDisplays ?? [];
  if (q.mmDesign || q.verknuepfung || jds.length || q.instrument?.length || q.selbstpruefung?.length) {
    k.push(w.ue('Mixed Methods', 'HEADING_1'));
    const d = q.mmDesign;
    if (d) {
      k.push(w.ue(de ? 'Design-Steckbrief' : 'Design profile', 'HEADING_2'));
      const n = notation(d), nm = designName(d);
      if (d.reihenfolge) k.push(w.absatz(`${de ? 'Reihenfolge' : 'Sequence'}: ${reihenfolgeText(d.reihenfolge)}.`));
      if (d.gewicht) k.push(w.absatz(`${de ? 'Gewicht' : 'Priority'}: ${gewichtText(d.gewicht)}.`));
      if (n) k.push(w.absatz(`${de ? 'Schreibweise (Morse 1991)' : 'Notation (Morse 1991)'}: ${n}${nm ? ` - ${nm.en}${de ? ` (${nm.de})` : ''}` : ''}.`));
      if (d.zwecke.length) k.push(w.absatz(`${de ? 'Zwecke' : 'Purposes'}: ${d.zwecke.map(zweckText).join('; ')}.`));
      if (d.integration.length) k.push(w.absatz(`Integration: ${d.integration.map(integrationText).join('; ')}.`));
      for (const zeile of sauber(d.beschreibung ?? '').split(/\r?\n/).map(x => x.trim()).filter(Boolean)) k.push(w.absatz(zeile));
    }
    if (q.verknuepfung) {
      const v = q.variablen.find(x => x.id === q.verknuepfung!.variable)?.name ?? '';
      k.push(w.absatz(de ? `Verknüpfung: Die Fälle sind über die Fallvariable „${v}“ mit der Spalte „${q.verknuepfung.spalte}“ des Datensatzes verknüpft.` : `Linking: the cases are linked to the column "${q.verknuepfung.spalte}" of the data set through the case variable "${v}".`));
    }
    if (jds.length) {
      k.push(w.ue('Joint Displays', 'HEADING_2'));
      const ART = { 'qual-nach-gruppen': de ? 'Themen oder Codes nach Gruppen' : 'Themes or codes by groups', 'zahlen-nach-qual': de ? 'Zahlen nach qualitativen Gruppen' : 'Numbers by qualitative groups', 'seite-an-seite': de ? 'Seite an Seite' : 'Side by side' };
      k.push(w.absatz(de ? 'Belegstellen, Passung und Meta-Inferenz hat die forschende Person gewählt und geschrieben; Statable zählt nur.' : 'Passages, fit and meta-inference were chosen and written by the researcher; Statable only counts.'));
      k.push(w.tabelle(de ? ['Joint Display', 'Art', 'Zeilen', 'Gewählte Belege', 'Passung'] : ['Joint display', 'Kind', 'Rows', 'Chosen passages', 'Fit'],
        jds.map(j => {
          const p = Object.values(j.passung);
          return [j.name, ART[j.art], String(j.zeilen.length), String(j.belege.length),
            (['bestaetigung', 'erweiterung', 'widerspruch'] as const).map(x => `${passungName(x)} ${p.filter(y => y === x).length}`).join(', ')];
        })));
      const metas = jds.flatMap(j => Object.entries(j.metaInferenz).filter(([, t]) => t.trim()).map(([schl, t]) => {
        const art = schl.slice(0, schl.indexOf(':')), id = schl.slice(schl.indexOf(':') + 1);
        const zeile = art === 'code' || art === 'thema' ? zeilenName(q, { art, id }) : schl;
        return [j.name, zeile, passungName(j.passung[schl] ?? 'offen'), sauber(t)];
      }));
      if (metas.length) k.push(w.tabelle(de ? ['Joint Display', 'Zeile', 'Passung', 'Meta-Inferenz'] : ['Joint display', 'Row', 'Fit', 'Meta-inference'], metas));
    }
    if (q.instrument?.length) {
      const imPlan = q.instrument.filter(i => i.plan).length;
      k.push(w.absatz(de ? `Instrumentenentwicklung: ${q.instrument.length} Item-Entwürfe aus Kategorien, davon ${imPlan} in einen Fragebogen-Plan übernommen.` : `Instrument development: ${q.instrument.length} item drafts from categories, ${imPlan} of them taken into a questionnaire plan.`));
    }
    for (const l of q.selbstpruefung ?? []) {
      k.push(w.ue(l.liste === 'mmat'
        ? (de ? 'Selbstprüfung nach MMAT 2018 (eigene Kurzfassung, ohne Gesamtnote)' : 'Self-check after MMAT 2018 (own short version, no overall score)')
        : (de ? 'Selbstprüfung nach GRAMMS (eigene Kurzfassung)' : 'Self-check after GRAMMS (own short version)'), 'HEADING_2'));
      k.push(w.tabelle(de ? ['Punkt', 'Stand', 'Fundstelle', 'Notiz'] : ['Item', 'Status', 'Location', 'Note'],
        punkteDer(l.liste).flatMap(pt => { const x = l.punkte.find(y => y.kennung === pt.kennung); return x ? [[`${pt.nummer} ${pt.text()}`, standText(l.liste, x.stand), sauber(x.fundstelle ?? ''), sauber(x.notiz ?? '')]] : []; })));
    }
  }

  // (4d) Berichtshilfe (A5): nur Zählung je Liste, die Tabelle ist ein eigener Word-Anhang; keine Gesamtnote
  if (q.berichtshilfe?.length) {
    k.push(w.ue(de ? 'Berichtshilfe (COREQ, SRQR)' : 'Reporting checklists (COREQ, SRQR)', 'HEADING_1'));
    for (const l of q.berichtshilfe) {
      const n = l.liste === 'coreq' ? 32 : 21, name = l.liste === 'coreq' ? 'COREQ' : 'SRQR';
      k.push(w.absatz(de
        ? `${name}: ${l.punkte.length} von ${n} Punkten bearbeitet, eigene Kurzfassung. Die ganze Liste mit Stand und Fundstellen steht im Word-Anhang der Berichtshilfe.`
        : `${name}: ${l.punkte.length} of ${n} items worked on, own short version. The whole list with status and locations is in the Word appendix of the reporting checklist.`));
    }
  }

  // (5) KI-Nutzung: Text der Person wörtlich
  k.push(w.ue(de ? 'KI-Nutzung' : 'Use of AI', 'HEADING_1'));
  const ki = q.kiNutzung;
  if (!ki) k.push(w.absatz(de ? 'Noch nicht angegeben.' : 'Not yet stated.'));
  else if (!ki.genutzt) k.push(w.absatz(de ? 'Nach Angabe der Forschenden keine KI genutzt.' : 'According to the researchers, no AI was used.'));
  else {
    const zw = ki.zwecke.map(z => ({ transkription: de ? 'Transkription' : 'Transcription', uebersetzung: de ? 'Übersetzung' : 'Translation', anderes: de ? 'Anderes' : 'Other' }[z] ?? z));
    k.push(w.absatz(de ? 'Nach Angabe der Forschenden wurde KI genutzt.' : 'According to the researchers, AI was used.'));
    k.push(w.absatz(`${de ? 'Zwecke' : 'Purposes'}: ${zw.length ? zw.join(', ') : (de ? 'keine angegeben' : 'none stated')}.`));
    for (const zeile of sauber(ki.text ?? '').split(/\r?\n/).map(x => x.trim()).filter(Boolean)) k.push(w.absatz(zeile));
  }

  // (6) Was nicht in der .qdpx steht
  k.push(w.ue(de ? 'Was nicht in der REFI-QDA-Datei (.qdpx) steht' : 'What is not in the REFI-QDA file (.qdpx)', 'HEADING_1'));
  k.push(w.absatz(de ? 'Diese Teile bleiben nur in der Statable-Projektdatei:' : 'These parts stay only in the Statable project file:'));
  for (const t of NICHT_IN_QDPX[sp]) k.push(w.punkt(t));

  // (7) Einwilligung: nur ja/nein je Fall
  if (q.einwilligungen) {
    k.push(w.ue(de ? 'Einwilligung' : 'Consent', 'HEADING_1'));
    if (!q.faelle.length) k.push(w.absatz(de ? 'Es gibt keine Fälle.' : 'There are no cases.', { italics: true }));
    else k.push(w.tabelle(de ? ['Fall', 'Einwilligung dokumentiert'] : ['Case', 'Consent documented'],
      q.faelle.map(f => [f.name, q.einwilligungen!.some(e => e.fall === f.id) ? (de ? 'ja' : 'yes') : (de ? 'nein' : 'no')])));
  }

  // (8) Protokolle: nur Art und Zahl
  if (q.protokolle?.length) {
    k.push(w.ue(de ? 'Protokolle' : 'Protocols', 'HEADING_1'));
    const n = new Map<string, number>();
    for (const p of q.protokolle) n.set(p.art, (n.get(p.art) ?? 0) + 1);
    k.push(w.tabelle(de ? ['Art', 'Anzahl'] : ['Type', 'Number'], [...n].map(([a, z]) => [PROTOKOLL_ART[a as keyof typeof PROTOKOLL_ART]?.[sp] ?? a, String(z)])));
  }

  // (9) Feinstrukturanalysen und andere Sequenzanalysen (A4)
  if (q.sequenzanalysen?.length) {
    const nurFs = q.sequenzanalysen.every(sa => sa.verfahren === 'feinstruktur');
    k.push(w.ue(nurFs ? (de ? 'Feinstrukturanalysen' : 'Fine structure analyses') : (de ? 'Sequenzanalysen' : 'Sequential analyses'), 'HEADING_1'));
    for (const sa of q.sequenzanalysen) {
      k.push(w.ue(sa.name || (de ? 'Feinstrukturanalyse' : 'Fine structure analysis'), 'HEADING_2'));
      const dokumentName = sa.dokument ? q.dokumente.find(d => d.id === sa.dokument)?.name : undefined;
      for (const t of methodenanhang(sa, sp, { ...(dokumentName ? { dokumentName } : {}), eigene: q.spaltensaetze ?? [] })) k.push(w.absatz(t));
    }
  }

  // (10) Typen
  if (q.typen?.length) {
    k.push(w.ue(de ? 'Typen der typenbildenden Inhaltsanalyse' : 'Types of the type-building content analysis', 'HEADING_1'));
    const merkmal = (id: string): string => q.codes.find(c => c.id === id)?.name ?? q.variablen.find(v => v.id === id)?.name ?? id;
    const fall = (id: string): string => q.faelle.find(f => f.id === id)?.name ?? id;
    k.push(w.tabelle(de ? ['Typ', 'Beschreibung', 'Fälle', 'Merkmale'] : ['Type', 'Description', 'Cases', 'Features'],
      q.typen.map(t => [t.name, t.beschreibung ?? '', t.faelle.map(fall).join(', '), t.merkmale.map(merkmal).join(', ')])));
  }
  return w.fertig(titel, k);
}
