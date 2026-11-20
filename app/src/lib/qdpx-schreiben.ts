/**
 * REFI-QDA-Projektdatei (.qdpx, QDA-XML 1.0) schreiben (Ausbau A1): das Gegenstück zu `leseQdpx` in `qdpx.ts`.
 * Zuordnung nach `docs/ausbau/ARCHITEKTUR-DATENMODELL-AUSBAU.md`, Abschnitt 5. Reine Funktion ohne Oberfläche.
 *
 * ZIP mit `project.qde` und `sources/<guid>.txt` (Texte der Dokumente und Memos als UTF-8, nicht im XML, damit Zeilenumbrüche und
 * Positionen unverändert bleiben). Positionen sind Unicode-Codepoints, Ende exklusiv, wie im Modell und wie der Leser sie liest.
 *
 * Nie ausgegeben werden: Einwilligungen, Protokolle, Feinstrukturanalysen, Zusammenfassungen der Matrix, Einstufungen (`stufe`),
 * Arbeitsplatz-Merker, Änderungsprotokoll. Sie bleiben nur in der Statable-Projektdatei.
 * Aller Text aus dem Projekt wird maskiert (Text und Attribute) und von in XML 1.0 verbotenen Zeichen befreit.
 */
import { strToU8, zipSync } from 'fflate';
import { farbeNormal } from './qdc';
import { cpTeil, positionsKarte, type Code, type Dokument, type Fall, type Memo, type MemoArt, type QualProjekt, type Variable } from './qualprojekt';
import { ARBEITSWEISE_EN_KURZ } from './arbeitsweise';

const NS = 'urn:QDA-XML:project:1.0';
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Feste Präfixe für Feldnotizen im Namen der Note; der Leser erkennt beide Sprachen. */
export const MEMO_PRAEFIX: Record<'de' | 'en', Record<Exclude<MemoArt, 'memo'>, string>> = {
  de: {
    'feldnotiz-empirisch': '[Feldnotiz empirisch] ', 'feldnotiz-methodisch': '[Feldnotiz methodisch] ', 'feldnotiz-theoretisch': '[Feldnotiz theoretisch] ',
    // Stufe A3 (Architekturblatt Ausbau 5: „Memo.art als Präfix im Namen der Note“; der Leser erkennt beide Sprachen)
    tagebuch: '[Reflexives Tagebuch] ', 'gt-code': '[Code-Memo] ', 'gt-theoretisch': '[Theoretisches Memo] ', 'gt-methodisch': '[Methodenmemo] ',
    'gt-auswahl': '[Theoretische Auswahl] ', saettigung: '[Sättigungs-Memo] ', 'ipa-beschreibend': '[Randnotiz beschreibend] ',
    'ipa-sprachlich': '[Randnotiz sprachlich] ', 'ipa-begrifflich': '[Randnotiz begrifflich] ', vergleich: '[Vergleich] ',
  },
  en: {
    'feldnotiz-empirisch': '[Field note: empirical] ', 'feldnotiz-methodisch': '[Field note: methodological] ', 'feldnotiz-theoretisch': '[Field note: theoretical] ',
    tagebuch: '[Reflexive journal] ', 'gt-code': '[Code memo] ', 'gt-theoretisch': '[Theoretical memo] ', 'gt-methodisch': '[Methodological memo] ',
    'gt-auswahl': '[Theoretical sampling] ', saettigung: '[Saturation memo] ', 'ipa-beschreibend': '[Exploratory note: descriptive] ',
    'ipa-sprachlich': '[Exploratory note: linguistic] ', 'ipa-begrifflich': '[Exploratory note: conceptual] ', vergleich: '[Comparison] ',
  },
};
/** Name eines Themen-Sets (fest, in beiden Sprachen gleich: Rückweg im Leser) und erste Zeile der Projektbeschreibung */
export const THEMA_SET = 'Theme: ';
export const ANSATZ_ZEILE = 'Approach: ';
/** Absatz-Überschriften in der Beschreibung eines Codes (fest, in beiden Sprachen gleich: Rückweg im Leser). */
export const BESCHR_REGEL = 'Rule:';
export const BESCHR_ANKER = 'Anchor examples:';

/* ------------------------------------------------------------------ XML-Hilfen */
// eslint-disable-next-line no-control-regex
const XML_UNGUELTIG = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f￾￿]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;
const sauber = (t: unknown): string => String(t ?? '').replace(XML_UNGUELTIG, '');
const maskText = (t: unknown): string => sauber(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const maskAttr = (t: unknown): string => maskText(t).replace(/"/g, '&quot;').replace(/[\t\r\n]+/g, ' ');
const eineZeile = (t: string): string => sauber(t).replace(/[\r\n]+/g, ' ').trim();

/** Für Dateien im ZIP: nur ungültige Einzelzeichen werden ersetzt (U+FFFD), sonst bleibt der Text Byte für Byte, damit Positionen stimmen. */
const dateiText = (t: string): string => t.replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '�');

const iso = (ms: number | undefined): string | undefined => {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return undefined;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};
const attrIf = (name: string, wert: string | undefined): string => (wert === undefined || wert === '' ? '' : ` ${name}="${maskAttr(wert)}"`);

/* ------------------------------------------------------------------ Kennungen */
/** Stabile Kennung aus Text und Zähler (gleiches Projekt gibt gleiche Datei); gültige Form mit Version 4 und Variante 8-b. */
function ableiten(text: string, zaehler: number): string {
  const teile: string[] = [];
  for (let s = 0; s < 4; s++) {
    let h = 0x811c9dc5 ^ (s * 0x9e3779b1) ^ zaehler;
    const t = text + '\u0000' + s;
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
    teile.push((h >>> 0).toString(16).padStart(8, '0'));
  }
  const x = teile.join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-4${x.slice(13, 16)}-${'89ab'[parseInt(x[16]!, 16) & 3]}${x.slice(17, 20)}-${x.slice(20, 32)}`;
}

class Guids {
  private benutzt = new Set<string>();
  private nach = new Map<string, string>();
  /** Kennung zu einer Modell-id: vorhandene gültige GUID (klein, ohne Klammern) oder stabil neu; gleiche id gibt gleiche GUID. */
  fuer(art: string, id: string): string {
    const schluessel = art + '\u0000' + id;
    const alt = this.nach.get(schluessel);
    if (alt) return alt;
    const roh = id.trim().replace(/^\{|\}$/g, '').toLowerCase();
    let g = roh;
    if (!GUID.test(g) || this.benutzt.has(g)) { let n = 0; do { g = ableiten(schluessel, n++); } while (this.benutzt.has(g)); }
    this.benutzt.add(g); this.nach.set(schluessel, g);
    return g;
  }
  neu(schluessel: string): string { return this.fuer('neu', schluessel); }
}

/* ------------------------------------------------------------------ Codes */
/** Beschreibung wie im Architekturblatt: Definition, dann Absatz „Rule: …“, dann Absatz „Anchor examples:“ mit je einem Beispiel pro Zeile. */
function beschreibung(k: Code): string {
  const teile: string[] = [];
  const def = sauber(k.definition ?? '').replace(/\r\n?/g, '\n').trim();
  if (def) teile.push(def);
  const regel = sauber(k.regel ?? '').replace(/\r\n?/g, '\n').replace(/\n{2,}/g, '\n').trim();
  if (regel) teile.push(`${BESCHR_REGEL} ${regel}`);
  const anker = (k.anker ?? []).map(a => eineZeile(a.text)).filter(Boolean);
  if (anker.length) teile.push(`${BESCHR_ANKER}\n${anker.join('\n')}`);
  return teile.join('\n\n');
}

/* ------------------------------------------------------------------ Werte von Fällen */
const TYP: Record<Variable['typ'], string> = { text: 'Text', 'ja/nein': 'Boolean', ganzzahl: 'Integer', zahl: 'Float', datum: 'Date', datumzeit: 'DateTime' };
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const DATUMZEIT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
const dezimal = (n: number): string => {
  const s = String(n);
  return /e/i.test(s) ? n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 }) : s;
};

/** Ein Wert als Element passend zum Typ der Variablen; passt er nicht, steht er als Text (der Wert geht nie verloren). null: kein Wert. */
function wertElement(typ: Variable['typ'], w: string | number | boolean | null): string | null {
  if (w === null || w === undefined) return null;
  const t = (name: string, inhalt: string) => `<${name}>${maskText(inhalt)}</${name}>`;
  if (typ === 'ja/nein' && typeof w === 'boolean') return t('BooleanValue', w ? 'true' : 'false');
  if (typ === 'ganzzahl' && typeof w === 'number' && Number.isSafeInteger(w)) return t('IntegerValue', String(w));
  if ((typ === 'zahl' || typ === 'ganzzahl') && typeof w === 'number' && Number.isFinite(w)) return t('FloatValue', dezimal(w));
  if (typ === 'datum' && typeof w === 'string' && DATUM.test(w.trim()) && !Number.isNaN(Date.parse(w.trim()))) return t('DateValue', w.trim());
  if (typ === 'datumzeit' && typeof w === 'string' && DATUMZEIT.test(w.trim()) && !Number.isNaN(Date.parse(w.trim()))) return t('DateTimeValue', w.trim());
  return t('TextValue', String(w));
}

/* ------------------------------------------------------------------ schreiben */
export function schreibeQdpx(projekt: QualProjekt, sprache: 'de' | 'en'): Uint8Array {
  const sp: 'de' | 'en' = sprache === 'en' ? 'en' : 'de';
  const g = new Guids();
  const dateien: Record<string, Uint8Array> = {};

  const personen = new Set(projekt.kodierende.map(k => k.id));
  const userAttr = (name: string, id: string | undefined): string => (id !== undefined && personen.has(id) ? ` ${name}="${g.fuer('person', id)}"` : '');

  /* --- Codes: Baum über Verschachtelung --- */
  const codeIds = new Set(projekt.codes.map(c => c.id));
  const codeKinder = new Map<string, Code[]>();
  const wurzeln: Code[] = [];
  for (const k of projekt.codes) {
    if (k.elternId && codeIds.has(k.elternId) && k.elternId !== k.id) (codeKinder.get(k.elternId) ?? codeKinder.set(k.elternId, []).get(k.elternId)!).push(k);
    else wurzeln.push(k);
  }
  const ord = (a: Code, b: Code) => a.reihenfolge - b.reihenfolge;
  wurzeln.sort(ord); for (const l of codeKinder.values()) l.sort(ord);

  /* --- Memos: an welchen Stellen hängen NoteRefs --- */
  const dokNachId = new Map(projekt.dokumente.map(d => [d.id, d]));
  const segNachId = new Map(projekt.segmente.map(s => [s.id, s]));
  const fallNachId = new Map(projekt.faelle.map(f => [f.id, f]));
  const noteAn = { projekt: [] as string[], dokument: new Map<string, string[]>(), code: new Map<string, string[]>(), segment: new Map<string, string[]>() };
  const merke = (m: Map<string, string[]>, id: string, guid: string) => { (m.get(id) ?? m.set(id, []).get(id)!).push(guid); };
  const memoGuid = new Map<string, string>();
  for (const m of projekt.memos) {
    const gu = g.fuer('memo', m.id); memoGuid.set(m.id, gu);
    const ziele = new Set<string>();   // gleiche Stelle nur einmal
    let irgendwo = false;
    const an = (kind: 'dokument' | 'code' | 'segment', id: string) => { const k = kind + '\u0000' + id; if (!ziele.has(k)) { ziele.add(k); merke(noteAn[kind], id, gu); } irgendwo = true; };
    for (const b of m.bezug) {
      if (b.art === 'dokument' && b.id !== undefined && dokNachId.has(b.id)) an('dokument', b.id);
      else if (b.art === 'code' && b.id !== undefined && codeIds.has(b.id)) an('code', b.id);
      else if (b.art === 'segment' && b.id !== undefined && segNachId.has(b.id) && dokNachId.has(segNachId.get(b.id)!.dokument)) an('segment', b.id);
      // REFI-QDA kennt keine NoteRef an einem Fall: die Note hängt an den Dokumenten des Falls
      else if (b.art === 'fall' && b.id !== undefined && fallNachId.has(b.id)) for (const d of projekt.dokumente) if (d.fall === b.id) an('dokument', d.id);
    }
    if (!irgendwo) noteAn.projekt.push(gu);   // projekt, Protokoll, Sequenzanalyse (nicht im Format) oder nichts mehr da: am ganzen Projekt
  }
  const noteRefs = (guids: string[] | undefined, einr: string): string[] => (guids ?? []).map(x => `${einr}<NoteRef targetGUID="${x}"/>`);

  const o: string[] = [];
  const kopf = `<?xml version="1.0" encoding="utf-8"?>`;
  const zeit = iso(projekt.herkunft?.zeit);
  o.push(`<Project xmlns="${NS}" name="${maskAttr(projekt.name || 'Statable')}" origin="Statable"${zeit ? ` creationDateTime="${zeit}"` : ''}>`);

  /* Users */
  if (projekt.kodierende.length) {
    o.push('  <Users>');
    for (const k of projekt.kodierende) o.push(`    <User guid="${g.fuer('person', k.id)}"${attrIf('name', sauber(k.name))}/>`);
    o.push('  </Users>');
  }

  /* CodeBook */
  if (projekt.codes.length) {
    o.push('  <CodeBook>', '    <Codes>');
    const gesehen = new Set<string>();
    const schreibeCode = (k: Code, tiefe: number) => {
      gesehen.add(k.id);
      const f = farbeNormal(k.farbe);
      const einr = '  '.repeat(tiefe);
      const attr = `guid="${g.fuer('code', k.id)}" name="${maskAttr(k.name)}" isCodable="${k.kodierbar === false ? 'false' : 'true'}"${f ? ` color="${f}"` : ''}`;
      const b = beschreibung(k);
      const refs = noteRefs(noteAn.code.get(k.id), einr + '  ');
      const kin = (codeKinder.get(k.id) ?? []).filter(x => !gesehen.has(x.id));
      if (!b && !refs.length && !kin.length) { o.push(`${einr}<Code ${attr}/>`); return; }
      o.push(`${einr}<Code ${attr}>`);
      if (b) o.push(`${einr}  <Description>${maskText(b)}</Description>`);
      o.push(...refs);
      for (const x of kin) if (!gesehen.has(x.id)) schreibeCode(x, tiefe + 1);
      o.push(`${einr}</Code>`);
    };
    for (const w of wurzeln) schreibeCode(w, 3);
    for (const k of projekt.codes) if (!gesehen.has(k.id)) schreibeCode(k, 3);   // Ringe: nichts geht verloren
    o.push('    </Codes>', '  </CodeBook>');
  }

  /* Variables */
  const varNachId = new Map(projekt.variablen.map(v => [v.id, v]));
  if (projekt.variablen.length) {
    o.push('  <Variables>');
    for (const v of projekt.variablen) {
      const attr = `guid="${g.fuer('variable', v.id)}" name="${maskAttr(v.name)}" typeOfVariable="${TYP[v.typ] ?? 'Text'}"`;
      const b = sauber(v.beschreibung ?? '').trim();
      o.push(b ? `    <Variable ${attr}><Description>${maskText(b)}</Description></Variable>` : `    <Variable ${attr}/>`);
    }
    o.push('  </Variables>');
  }

  /* Cases */
  if (projekt.faelle.length) {
    o.push('  <Cases>');
    for (const f of projekt.faelle as Fall[]) {
      o.push(`    <Case guid="${g.fuer('fall', f.id)}"${attrIf('name', sauber(f.name))}>`);
      for (const [vid, w] of Object.entries(f.werte)) {
        const v = varNachId.get(vid);
        if (!v) continue;
        const el = wertElement(v.typ, w);
        if (el === null) continue;
        o.push(`      <VariableValue><VariableRef targetGUID="${g.fuer('variable', v.id)}"/>${el}</VariableValue>`);
      }
      for (const d of projekt.dokumente) if (d.fall === f.id) o.push(`      <SourceRef targetGUID="${g.fuer('dokument', d.id)}"/>`);
      o.push('    </Case>');
    }
    o.push('  </Cases>');
  }

  /* Sources: alle Dokumente als TextSource (Medien liegen nicht im Projekt, bei audio/video steht das Transkript) */
  const segmenteJeDok = new Map<string, typeof projekt.segmente>();
  for (const s of projekt.segmente) (segmenteJeDok.get(s.dokument) ?? segmenteJeDok.set(s.dokument, []).get(s.dokument)!).push(s);
  const kodJeSeg = new Map<string, typeof projekt.kodierungen>();
  for (const k of projekt.kodierungen) {
    if (!codeIds.has(k.code)) continue;
    (kodJeSeg.get(k.segment) ?? kodJeSeg.set(k.segment, []).get(k.segment)!).push(k);
  }
  if (projekt.dokumente.length) {
    o.push('  <Sources>');
    for (const d of projekt.dokumente as Dokument[]) {
      const dg = g.fuer('dokument', d.id);
      dateien[`sources/${dg}.txt`] = strToU8(dateiText(d.text));
      const cz = iso(d.erstellt);
      o.push(`    <TextSource guid="${dg}"${attrIf('name', sauber(d.name))} plainTextPath="internal://${dg}.txt"${cz ? ` creationDateTime="${cz}"` : ''}>`);
      const karte = positionsKarte(d.text);
      const L = karte.laenge;
      for (const s of segmenteJeDok.get(d.id) ?? []) {
        if (!(s.start >= 0 && s.start < s.ende && s.ende <= L)) continue;
        // Textprobe als Name: der Leser prüft damit, wie die Positionen gezählt sind (Zeilenumbrüche, BOM)
        const probe = cpTeil(d.text, s.start, Math.min(s.ende, s.start + 60), karte).replace(/\s+/g, ' ').trim();
        const name = probe ? probe + (s.ende > s.start + 60 ? '…' : '') : '';
        const sz = iso(s.erstellt);
        const sg = g.fuer('segment', s.id);
        const cods = kodJeSeg.get(s.id) ?? [];
        const refs = noteRefs(noteAn.segment.get(s.id), '        ');
        const attr = `guid="${sg}"${attrIf('name', sauber(name))} startPosition="${s.start}" endPosition="${s.ende}"${userAttr('creatingUser', s.kodierende ?? cods[0]?.kodierende)}${sz ? ` creationDateTime="${sz}"` : ''}`;
        if (!cods.length && !refs.length) { o.push(`      <PlainTextSelection ${attr}/>`); continue; }
        o.push(`      <PlainTextSelection ${attr}>`);
        for (const k of cods) {
          const kz = iso(k.erstellt);
          o.push(`        <Coding guid="${g.fuer('kodierung', k.id)}"${userAttr('creatingUser', k.kodierende)}${kz ? ` creationDateTime="${kz}"` : ''}><CodeRef targetGUID="${g.fuer('code', k.code)}"/></Coding>`);
        }
        o.push(...refs);
        o.push('      </PlainTextSelection>');
      }
      o.push(...noteRefs(noteAn.dokument.get(d.id), '      '));
      o.push('    </TextSource>');
    }
    o.push('  </Sources>');
  }

  /* Notes */
  if (projekt.memos.length) {
    o.push('  <Notes>');
    for (const m of projekt.memos as Memo[]) {
      const mg = memoGuid.get(m.id)!;
      dateien[`sources/${mg}.txt`] = strToU8(dateiText(m.text));
      const praefix = m.art && m.art !== 'memo' ? MEMO_PRAEFIX[sp][m.art] ?? '' : '';
      const name = (praefix + (m.titel ?? '')).trimEnd();
      const mz = iso(m.erstellt);
      o.push(`    <Note guid="${mg}"${attrIf('name', sauber(name))} plainTextPath="internal://${mg}.txt"${userAttr('creatingUser', m.kodierende)}${mz ? ` creationDateTime="${mz}"` : ''}/>`);
    }
    o.push('  </Notes>');
  }

  /* Sets */
  const mengen = projekt.mengen ?? [];
  // Themen (Stufe A3): als Set „Theme: …“ mit den Codes, Beschreibung = zentrales Konzept. Verworfene Themen gehen nicht ins Format
  // (sie stehen im Methodenanhang); Stand, Verlauf, Unterthemen und Fall bleiben in der Projektdatei.
  const themenAus = (projekt.themen ?? []).filter(t => t.stand !== 'verworfen');
  if (mengen.length || themenAus.length) {
    o.push('  <Sets>');
    for (const t of themenAus) {
      const mit = t.codes.filter(i => codeIds.has(i)).map(i => `      <MemberCode targetGUID="${g.fuer('code', i)}"/>`);
      const beschr = t.konzept ? [`      <Description>${maskText(t.konzept)}</Description>`] : [];
      const attr = `guid="${g.fuer('thema', t.id)}" name="${maskAttr(THEMA_SET + eineZeile(t.name))}"`;
      const innen = [...beschr, ...mit];
      o.push(innen.length ? `    <Set ${attr}>` : `    <Set ${attr}/>`);
      if (innen.length) { o.push(...innen); o.push('    </Set>'); }
    }
    for (const me of mengen) {
      const mit = me.art === 'dokumente'
        ? me.mitglieder.filter(i => dokNachId.has(i)).map(i => `      <MemberSource targetGUID="${g.fuer('dokument', i)}"/>`)
        : me.mitglieder.filter(i => codeIds.has(i)).map(i => `      <MemberCode targetGUID="${g.fuer('code', i)}"/>`);
      const attr = `guid="${g.fuer('menge', me.id)}" name="${maskAttr(me.name)}"`;
      o.push(mit.length ? `    <Set ${attr}>` : `    <Set ${attr}/>`);
      if (mit.length) { o.push(...mit); o.push('    </Set>'); }
    }
    o.push('  </Sets>');
  }

  /* Projektbeschreibung: Arbeitsweise als erste Zeile „Approach: …“ (nur zur Information; Architekturblatt Ausbau 5) */
  if (projekt.arbeitsweise && projekt.arbeitsweise !== 'allgemein') o.push(`  <Description>${maskText(ANSATZ_ZEILE + ARBEITSWEISE_EN_KURZ[projekt.arbeitsweise])}</Description>`);

  /* Memos am ganzen Projekt (Project/NoteRef steht nach Description) */
  o.push(...noteRefs(noteAn.projekt, '  '));
  o.push('</Project>');

  dateien['project.qde'] = strToU8(`${kopf}\n${o.join('\n')}\n`);
  return zipSync(dateien, { level: 6 });
}

/** Was nicht in die REFI-QDA-Datei geht (Knopf auf der Seite „Interviews“ und Methodenanhang). Liegt hier, damit die Seite den Word-Code nicht mitlädt. */
export const NICHT_IN_QDPX: { de: string[]; en: string[] } = {
  de: ['Einwilligungen', 'Protokolle', 'Feinstrukturanalysen und andere Sequenzanalysen mit ihren Spaltensätzen', 'Zusammenfassungen der Matrix', 'Einstufungen als Zahl an einer Kodierung', 'Änderungsprotokoll des Codebuchs', 'Angabe zur KI-Nutzung', 'Typen', 'Stand und Verlauf der Themen, verworfene Themen, Unterthemen', 'Kodierphasen', 'Einzelfall-Modus', 'Verknüpfung mit dem Datensatz, Joint Displays, Design-Steckbrief, Selbstprüfung und Item-Entwürfe (Mixed Methods)', 'Berichtshilfe (COREQ, SRQR)'],
  en: ['Consents', 'Protocols', 'Fine structure analyses and other sequential analyses with their column sets', 'Summaries of the matrix', 'Ratings as a number on a coding', 'Change log of the codebook', 'Statement on AI use', 'Types', 'Status and history of themes, discarded themes, subthemes', 'Coding phases', 'Single-case mode', 'Link with the data set, joint displays, design profile, self-check and item drafts (mixed methods)', 'Reporting checklists (COREQ, SRQR)'],
};
