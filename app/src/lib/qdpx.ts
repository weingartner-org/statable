/**
 * REFI-QDA-Projektdatei (.qdpx, QDA-XML 1.0) lesen und zwei qualitative Projekte zusammenführen (Paket 5A, Fachblatt Stufe 5).
 * Reine Funktionen ohne Oberfläche. Positionen im Modell sind immer Unicode-Codepoints, Ende exklusiv.
 * Text aus der Datei wird nie als HTML, R- oder PSPP-Code benutzt. XML ohne DOCTYPE, Größengrenzen, Pfade nur innerhalb `sources/`.
 * Gelesen wird mit `globalThis.DOMParser` (Browser; in Tests @xmldom/xmldom), wie in `qdc.ts`.
 */
import { unzipSync } from 'fflate';
import { farbeNormal } from './qdc';
import { ANSATZ_ZEILE, MEMO_PRAEFIX, THEMA_SET } from './qdpx-schreiben';
import type { Spaltensatz } from './feinstruktur-spalten';
import { qualFassung, type ItemEntwurf, type JointDisplay, type Protokoll, type Typ, type Sequenzanalyse, type Thema, type Code, type Dokument, type Fall, type Kodierende, type Kodierung, type Memo, type MemoArt, type Menge, type QualProjekt, type Segment, type Variable } from './qualprojekt';

export type QdpxFehlerCode = 'kein-zip' | 'keine-qde' | 'mehrere-qde' | 'doctype' | 'zugross' | 'kaputt' | 'wurzel';

const FEHLER_TEXT: Record<QdpxFehlerCode, { de: string; en: string }> = {
  'kein-zip': { de: 'Die Datei ist keine .qdpx-Datei (kein ZIP-Archiv).', en: 'The file is not a .qdpx file (not a ZIP archive).' },
  'keine-qde': { de: 'In der Datei fehlt die Projektbeschreibung (.qde).', en: 'The project description (.qde) is missing in the file.' },
  'mehrere-qde': { de: 'Die Datei enthält mehrere Projektbeschreibungen (.qde), und keine heißt project.qde.', en: 'The file contains several project descriptions (.qde), and none is named project.qde.' },
  doctype: { de: 'Die Projektbeschreibung enthält eine DOCTYPE-Angabe. Aus Sicherheitsgründen liest Statable solche Dateien nicht.', en: 'The project description contains a DOCTYPE declaration. For security reasons Statable does not read such files.' },
  zugross: { de: 'Die Datei ist zu groß.', en: 'The file is too large.' },
  kaputt: { de: 'Die Projektbeschreibung ist kein lesbares XML.', en: 'The project description is not readable XML.' },
  wurzel: { de: 'Die Datei ist kein REFI-QDA-Projekt (Wurzelelement Project fehlt).', en: 'The file is not a REFI-QDA project (root element Project is missing).' },
};

export class QdpxFehler extends Error {
  readonly code: QdpxFehlerCode;
  constructor(code: QdpxFehlerCode, sprache: 'de' | 'en' = 'de') {
    super(FEHLER_TEXT[code][sprache === 'en' ? 'en' : 'de']);
    this.name = 'QdpxFehler';
    this.code = code;
  }
}

export type QdpxMeldungArt = 'zaehlweise-crlf' | 'zaehlweise-bom' | 'bom-entfernt' | 'positionen-ungeprueft' | 'positionen-unsicher'
  | 'segment-ausserhalb' | 'segment-leer' | 'guid-unbekannt' | 'quelle-fehlt' | 'nicht-gelesen' | 'kodierende-unbekannt'
  | 'dokumentvariablen-fall' | 'name-doppelt' | 'text-verschieden' | 'fallwert-verschieden' | 'person-gleicher-name' | 'zitat-gekuerzt'
  | 'ansatz-genannt' | 'arbeitsweise-verschieden' | 'thema-gleicher-name'
  | 'analyse-gleicher-name' | 'pruefpunkt-verschieden' | 'element-nicht-uebernommen' | 'einstellung-verschieden' | 'einwilligungen-nicht-uebernommen';
export interface QdpxMeldung { art: QdpxMeldungArt; satz: string; dokument?: string; anzahl?: number; was?: string }
export interface QdpxZaehlung { dokumente: number; codes: number; segmente: number; kodierungen: number; kodierende: number; memos: number; faelle: number; variablen: number; mengen: number }
export interface QdpxErgebnis { projekt: QualProjekt; meldungen: QdpxMeldung[]; zaehlung: QdpxZaehlung; programm?: string }

export const QDE_MAX_BYTES = 50 * 1024 * 1024;
/** Schutz vor ZIP-Bomben (gleiche Art wie die Projektdatei): entpackt höchstens 2 GB und über 100 KB höchstens das 100-fache der Dateigröße. */
const MAX_ENTPACKT = 2 * 1024 ** 3;
const MAX_FAKTOR = 100;
const FAKTOR_AB = 100 * 1024;

/* ------------------------------------------------------------------ gemeinsam */
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const gnorm = (g: string | null | undefined): string => (g ?? '').trim().replace(/^[{}]+|[{}]+$/g, '').trim().toLowerCase();
const neueGuid = (): string => globalThis.crypto.randomUUID().toLowerCase();
const normLeer = (s: string): string => s.replace(/\s+/g, ' ');

/** Vergibt Kennungen: gültige Datei-GUIDs (klein, ohne Klammern) werden übernommen, sonst oder bei Doppelten neu. Nie Namen wie "__proto__". */
class Kennungen {
  private benutzt = new Set<string>();
  fuer(guid: string | null | undefined): string {
    const g = gnorm(guid);
    if (GUID.test(g) && !this.benutzt.has(g)) { this.benutzt.add(g); return g; }
    return this.neu();
  }
  neu(): string { let i = neueGuid(); while (this.benutzt.has(i)) i = neueGuid(); this.benutzt.add(i); return i; }
}

type Knoten = { nodeType: number; localName?: string | null; nodeName: string; namespaceURI?: string | null; childNodes: ArrayLike<Knoten>; textContent: string | null; getAttribute?: (n: string) => string | null };
const ln = (k: Knoten): string => k.localName ?? k.nodeName;
const kinder = (k: Knoten | undefined, name?: string): Knoten[] =>
  k ? Array.from(k.childNodes).filter(c => c.nodeType === 1 && (name === undefined || ln(c) === name)) : [];
const attr = (k: Knoten, n: string): string | null => k.getAttribute?.(n) ?? null;
const tx = (k: Knoten | undefined): string => k?.textContent ?? '';

/** Feste Präfixe im Namen einer Note (Schreiber: qdpx-schreiben.ts): Memo-Art von Feldnotizen und (seit A3) Tagebuch, GT, IPA, Vergleich - beide Sprachen. */
const MEMO_PRAEFIXE: [string, MemoArt][] = (['de', 'en'] as const).flatMap(sp => Object.entries(MEMO_PRAEFIX[sp]).map(([art, pr]) => [pr, art as MemoArt] as [string, MemoArt]));
/** Trennt die Beschreibung eines Codes, wenn sie die festen Absätze „Rule:“ und „Anchor examples:“ am Ende hat (so schreibt Statable sie); sonst bleibt sie unverändert die Definition. */
function zerlegeCodeBeschreibung(text: string): { definition: string; regel?: string; anker?: { text: string }[] } {
  const bloecke = text.replace(/\r\n?/g, '\n').split('\n\n');
  let anker: { text: string }[] | undefined, regel: string | undefined;
  const letzter = () => bloecke[bloecke.length - 1] ?? '';
  if (letzter().startsWith('Anchor examples:\n')) {
    anker = letzter().slice('Anchor examples:\n'.length).split('\n').map(t => t.trim()).filter(Boolean).map(t => ({ text: t }));
    bloecke.pop();
  }
  if (letzter().startsWith('Rule: ')) {
    regel = letzter().slice('Rule: '.length);
    bloecke.pop();
  }
  if (anker === undefined && regel === undefined) return { definition: text };
  const r: { definition: string; regel?: string; anker?: { text: string }[] } = { definition: bloecke.join('\n\n') };
  if (regel !== undefined) r.regel = regel;
  if (anker?.length) r.anker = anker;
  return r;
}

const TYP: Record<string, Variable['typ']> = { Text: 'text', Boolean: 'ja/nein', Integer: 'ganzzahl', Float: 'zahl', Date: 'datum', DateTime: 'datumzeit' };
const WERT = new Set(['TextValue', 'BooleanValue', 'IntegerValue', 'FloatValue', 'DateValue', 'DateTimeValue']);

/* ------------------------------------------------------------------ Zählweisen der Positionen */
type Modus = 'a' | 'b' | 'c';
/** Anfang jeder Zähleinheit bei "\r\n zählt als ein Zeichen" (Codepoint-Index); am Ende der Textende als Sperrwert. */
function einheitenB(cps: string[]): number[] {
  const s: number[] = []; let i = 0; const n = cps.length;
  while (i < n) { s.push(i); i += cps[i] === '\r' && cps[i + 1] === '\n' ? 2 : 1; }
  s.push(n);
  return s;
}
function idxVon(modus: Modus, p: number, eb: number[]): number | null {
  if (p < 0) return null;
  if (modus === 'a') return p;
  if (modus === 'c') return p >= 1 ? p - 1 : null;
  return p >= eb.length ? null : eb[p]!;
}
function stamm(name: string): string {
  let st = name.trim();
  for (const e of ['...', '…']) if (st.endsWith(e)) st = st.slice(0, -e.length);
  return normLeer(st).trim();
}
function probePasst(cps: string[], idx: number | null, name: string): boolean {
  if (idx === null || idx < 0 || idx > cps.length) return false;
  const st = stamm(name);
  if (!st) return false;
  const fenster = cps.slice(idx, idx + Array.from(st).length * 8 + 50).join('');
  return normLeer(fenster).startsWith(st);
}
function waehleZaehlweise(cps: string[], text: string, sels: { start: number | null; name: string | null }[], origin: string, hatBom: boolean): { modus: Modus; art: 'geprueft' | 'ungeprueft' | 'unsicher' } {
  const vorgabe: Modus = origin.toUpperCase().includes('ATLAS') ? 'b' : 'a';
  const gesamt = normLeer(text);
  const proben = sels.filter(s => s.name && s.start !== null && stamm(s.name) && gesamt.includes(stamm(s.name)));
  if (!proben.length) return { modus: vorgabe, art: 'ungeprueft' };
  const eb = einheitenB(cps);
  const modi: Modus[] = hatBom ? ['a', 'b', 'c'] : ['a', 'b'];
  const pkt = new Map<Modus, number>(modi.map(m => [m, proben.filter(p => probePasst(cps, idxVon(m, p.start!, eb), p.name!)).length]));
  const best = Math.max(...pkt.values());
  if (best / proben.length >= 0.8) {
    for (const m of [vorgabe, ...(['a', 'b', 'c'] as Modus[]).filter(x => x !== vorgabe)]) if (pkt.get(m) === best) return { modus: m, art: 'geprueft' };
  }
  return { modus: vorgabe, art: 'unsicher' };
}

/* ------------------------------------------------------------------ Sätze */
const WAS_DE: Record<string, string> = {
  PictureSource: 'Bilder', PDFSelection: 'Markierungen in PDF-Seiten (Flächen)', AudioSelection: 'Zeitmarkierungen in Audio', VideoSelection: 'Zeitmarkierungen in Video',
  Link: 'Verknüpfungen (Links)', Graph: 'Diagramme (Graphen)', TranscriptSelection: 'Markierungen in Transkripten', AudioSource: 'Audioquellen ohne Transkript', VideoSource: 'Videoquellen ohne Transkript',
};
const WAS_EN: Record<string, string> = {
  PictureSource: 'pictures', PDFSelection: 'marked areas in PDF pages', AudioSelection: 'time marks in audio', VideoSelection: 'time marks in video',
  Link: 'links', Graph: 'graphs', TranscriptSelection: 'marks in transcripts', AudioSource: 'audio sources without a transcript', VideoSource: 'video sources without a transcript',
};

function satz(art: QdpxMeldungArt, d: boolean, dok: string | undefined, n: number, was?: string): string {
  const q = dok === undefined ? '' : `„${dok}“`, qe = dok === undefined ? '' : `"${dok}"`;
  switch (art) {
    case 'zaehlweise-crlf': return d ? `${q}: Die Positionen zählen einen Zeilenumbruch (\\r\\n) als ein Zeichen. Statable hat sie auf den echten Text umgerechnet.` : `${qe}: The positions count a line break (\\r\\n) as one character. Statable converted them to the real text.`;
    case 'zaehlweise-bom': return d ? `${q}: Die Positionen zählen das Zeichen am Textanfang (BOM) mit. Statable hat sie umgerechnet.` : `${qe}: The positions count the byte order mark at the start of the text. Statable converted them.`;
    case 'bom-entfernt': return d ? `${q}: Am Textanfang stand ein unsichtbares Zeichen (BOM). Es wurde entfernt.` : `${qe}: The text started with an invisible character (BOM). It was removed.`;
    case 'positionen-ungeprueft': return d ? `${q}: Positionen ungeprüft übernommen (keine Textprobe in der Datei).` : `${qe}: Positions taken over unchecked (no text sample in the file).`;
    case 'positionen-unsicher': return d ? `${q}: Die Textstellen passen nicht sicher zum Text. Bitte Stichproben prüfen.` : `${qe}: The text passages do not safely match the text. Please check some samples.`;
    case 'segment-ausserhalb': return d ? `${q}: ${n} ${n === 1 ? 'Textstelle liegt' : 'Textstellen liegen'} nicht im Text und wurde${n === 1 ? '' : 'n'} nicht übernommen.` : `${qe}: ${n} text ${n === 1 ? 'passage lies' : 'passages lie'} outside the text and ${n === 1 ? 'was' : 'were'} not imported.`;
    case 'segment-leer': return d ? `${q}: ${n} ${n === 1 ? 'Textstelle ist' : 'Textstellen sind'} leer (Start gleich Ende) und wurde${n === 1 ? '' : 'n'} nicht übernommen.` : `${qe}: ${n} text ${n === 1 ? 'passage is' : 'passages are'} empty (start equals end) and ${n === 1 ? 'was' : 'were'} not imported.`;
    case 'guid-unbekannt': return d ? `${q}: ${n} ${n === 1 ? 'Kodierung verweist' : 'Kodierungen verweisen'} auf einen Code, den es nicht gibt, und wurde${n === 1 ? '' : 'n'} nicht übernommen.` : `${qe}: ${n} ${n === 1 ? 'coding refers' : 'codings refer'} to a code that does not exist and ${n === 1 ? 'was' : 'were'} not imported.`;
    case 'quelle-fehlt': return d ? `${q}: Der Text fehlt in der Datei (liegt außerhalb oder ist nicht enthalten). Das Dokument wurde nicht übernommen.` : `${qe}: The text is missing in the file (it is stored elsewhere or not included). The document was not imported.`;
    case 'nicht-gelesen': { const w = was ?? ''; return d ? `${n} × ${WAS_DE[w] ?? w} nicht übernommen (Statable übernimmt aus REFI-QDA nur Texte).` : `${n} × ${WAS_EN[w] ?? w} not imported (Statable imports only texts from REFI-QDA).`; }
    case 'kodierende-unbekannt': return d ? `${n} ${n === 1 ? 'Person oder Kodierung ohne' : 'Personen oder Kodierungen ohne'} Namen: ${n === 1 ? 'sie heißt' : 'sie heißen'} „Person n“ oder „Unbekannt“.` : `${n} ${n === 1 ? 'person or coding' : 'people or codings'} without a name: named "Person n" or "Unknown".`;
    case 'dokumentvariablen-fall': return d ? `${q}: Dokumentvariablen als Fall übernommen.` : `${qe}: Document variables taken over as a case.`;
    case 'name-doppelt': return d ? `${q}: Der Dokumentname kommt mehrfach vor. Das spätere Dokument heißt jetzt mit Zusatz „(2)“.` : `${qe}: The document name occurs more than once. The later document now has the suffix "(2)".`;
    case 'ansatz-genannt': return d ? `Die Datei nennt eine Arbeitsweise: „${was ?? ''}“. Statable übernimmt sie nicht als Einstellung; wählen Sie Ihre Arbeitsweise im Kodier-Arbeitsplatz.` : `The file names an approach: "${was ?? ''}". Statable does not take it over as a setting; choose your approach in the coding workplace.`;
    default: return '';
  }
}

/* ------------------------------------------------------------------ lesen */
const dekodiere = (b: Uint8Array): { text: string; bom: boolean } => {
  const bom = b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
  return { text: new TextDecoder('utf-8', { ignoreBOM: true }).decode(bom ? b.subarray(3) : b), bom };
};

interface SegInfo { el: Knoten; codings: Knoten[]; seg: Segment; dok: Dokument; text: string }

export function leseQdpx(bytes: Uint8Array, sprache: 'de' | 'en'): QdpxErgebnis {
  const sp: 'de' | 'en' = sprache === 'en' ? 'en' : 'de';
  const d = sp === 'de';
  const fehler = (c: QdpxFehlerCode) => new QdpxFehler(c, sp);

  /* --- ZIP --- */
  const eintraege: { name: string; groesse: number }[] = [];
  try { unzipSync(bytes, { filter: f => { eintraege.push({ name: f.name, groesse: f.originalSize }); return false; } }); }
  catch { throw fehler('kein-zip'); }
  const dateien = eintraege.filter(e => !e.name.endsWith('/'));
  let qdes = dateien.filter(e => !e.name.includes('/') && e.name.toLowerCase().endsWith('.qde'));
  if (!qdes.length) throw fehler('keine-qde');
  if (qdes.length > 1) {
    qdes = qdes.filter(e => e.name.toLowerCase() === 'project.qde');
    if (!qdes.length) throw fehler('mehrere-qde');
  }
  const qde = qdes[0]!;
  const summe = dateien.reduce((s, e) => s + e.groesse, 0);
  if (qde.groesse > QDE_MAX_BYTES || dateien.some(e => e.groesse > QDE_MAX_BYTES || e.groesse > MAX_ENTPACKT) || summe > MAX_ENTPACKT || (summe > FAKTOR_AB && summe > MAX_FAKTOR * bytes.length)) throw fehler('zugross');
  const holen = new Set(dateien.filter(e => e.name === qde.name || e.name.toLowerCase().startsWith('sources/')).map(e => e.name));
  let z: Record<string, Uint8Array>;
  try { z = unzipSync(bytes, { filter: f => holen.has(f.name) }); } catch { throw fehler('kein-zip'); }
  const quellDateien = new Map<string, Uint8Array>();
  for (const [n, b] of Object.entries(z)) if (n !== qde.name) quellDateien.set(n.toLowerCase(), b);

  /* --- XML --- */
  const qdeBytes = z[qde.name];
  if (!qdeBytes) throw fehler('kaputt');
  const xml = dekodiere(qdeBytes).text;
  if (/<!DOCTYPE/i.test(xml)) throw fehler('doctype');
  const Parser = (globalThis as { DOMParser?: new () => { parseFromString(s: string, typ: string): unknown } }).DOMParser;
  if (!Parser) throw fehler('kaputt');
  let w: Knoten | null;
  try {
    const dok = new Parser().parseFromString(xml, 'text/xml') as { documentElement: Knoten | null; getElementsByTagName?: (n: string) => ArrayLike<unknown> };
    if (dok.getElementsByTagName?.('parsererror')?.length) throw new Error('parsererror');
    w = dok.documentElement;
  } catch { throw fehler('kaputt'); }
  if (!w) throw fehler('kaputt');
  if (ln(w) !== 'Project' || !(w.namespaceURI ?? '').startsWith('urn:QDA-XML:project:')) throw fehler('wurzel');

  const origin = attr(w, 'origin') ?? '';
  const jetzt = Date.now();
  const ids = new Kennungen();

  /* --- Meldungen sammeln (je Art, Dokument und was) --- */
  const meld = new Map<string, { art: QdpxMeldungArt; dokument?: string; was?: string; n: number }>();
  const m = (art: QdpxMeldungArt, dokument?: string, n = 1, was?: string) => {
    const k = `${art}\u0000${dokument ?? ''}\u0000${was ?? ''}`;
    const e = meld.get(k);
    if (e) e.n += n; else meld.set(k, { art, dokument, was, n });
  };

  /* --- Kodierende --- */
  const kodierende: Kodierende[] = [];
  const personNachGuid = new Map<string, string>();
  let personNr = 0, unbekanntId: string | undefined, unbekanntAnzahl = 0;
  for (const u of kinder(kinder(w, 'Users')[0], 'User')) {
    let nm = attr(u, 'name');
    if (!nm) { personNr++; nm = `Person ${personNr}`; unbekanntAnzahl++; }
    const g = gnorm(attr(u, 'guid'));
    const id = ids.fuer(g);
    kodierende.push({ id, name: nm });
    if (g && !personNachGuid.has(g)) personNachGuid.set(g, id);
  }
  const personFuer = (codingUser: string | null, selUser: string | null): string => {
    const g = gnorm(codingUser || selUser);
    const id = g ? personNachGuid.get(g) : undefined;
    if (id) return id;
    unbekanntAnzahl++;
    if (!unbekanntId) { unbekanntId = ids.neu(); kodierende.push({ id: unbekanntId, name: d ? 'Unbekannt' : 'Unknown' }); }
    return unbekanntId;
  };

  /* --- Codes --- */
  const codes: Code[] = [];
  const codeEl = new Map<string, Knoten>();                       // code.id -> Element
  const codeNachGuid = new Map<string, Code>();
  const liesCodes = (el: Knoten, eltern: string | undefined) => {
    kinder(el, 'Code').forEach((c, i) => {
      const desc = kinder(c, 'Description')[0];
      const code: Code = { id: ids.fuer(attr(c, 'guid')), name: attr(c, 'name') ?? '', kodierbar: (attr(c, 'isCodable') ?? 'true').trim() === 'true', reihenfolge: i };
      if (eltern) code.elternId = eltern;
      const farbe = farbeNormal(attr(c, 'color')); if (farbe) code.farbe = farbe;
      if (desc) {
        const z = zerlegeCodeBeschreibung(tx(desc));
        code.definition = z.definition;
        if (z.regel !== undefined) code.regel = z.regel;
        if (z.anker) code.anker = z.anker;
      }
      codes.push(code); codeEl.set(code.id, c);
      codeNachGuid.set(gnorm(attr(c, 'guid')), code);
      liesCodes(c, code.id);
    });
  };
  const cb = kinder(w, 'CodeBook')[0];
  const cbCodes = kinder(cb, 'Codes')[0];
  if (cbCodes) liesCodes(cbCodes, undefined);

  /* --- Variablen --- */
  const variablen: Variable[] = [];
  const varNachGuid = new Map<string, Variable>();
  for (const v of kinder(kinder(w, 'Variables')[0], 'Variable')) {
    const x: Variable = { id: ids.fuer(attr(v, 'guid')), name: attr(v, 'name') ?? '', typ: TYP[attr(v, 'typeOfVariable') ?? 'Text'] ?? 'text' };
    variablen.push(x); varNachGuid.set(gnorm(attr(v, 'guid')), x);
  }
  const werteVon = (el: Knoten): Fall['werte'] => {
    const out: Fall['werte'] = {};
    for (const vv of kinder(el, 'VariableValue')) {
      const ref = kinder(vv, 'VariableRef')[0];
      const wk = kinder(vv).find(x => WERT.has(ln(x)));
      if (!ref || !wk) continue;
      const v = varNachGuid.get(gnorm(attr(ref, 'targetGUID')));
      if (!v) continue;
      const t = ln(wk), txt = tx(wk);
      let val: string | number | boolean | null;
      if (t === 'BooleanValue') val = ['true', '1'].includes(txt.trim().toLowerCase());
      else if (t === 'IntegerValue' || t === 'FloatValue') { const n = Number(txt.trim()); val = txt.trim() !== '' && Number.isFinite(n) ? n : null; }
      else if (t === 'TextValue') val = txt;
      else val = txt.trim();
      Object.defineProperty(out, v.id, { value: val, enumerable: true, writable: true, configurable: true });
    }
    return out;
  };

  /* --- Dokumente, Segmente, Kodierungen --- */
  const dokumente: Dokument[] = [];
  const dokEl = new Map<string, Knoten>();                        // dokument.id -> Quell-Element
  const dokNachGuid = new Map<string, Dokument[]>();
  const segmente: SegInfo[] = [];
  const kodierungen: Kodierung[] = [];
  const namenZaehler = new Map<string, number>();
  let nichtGelesen = 0;
  const nichtGelesenZaehlen = (was: string, n = 1) => { if (n > 0) { m('nicht-gelesen', undefined, n, was); nichtGelesen += n; } };

  const eindeutig = (n: string): string => {
    const k = (namenZaehler.get(n) ?? 0) + 1;
    namenZaehler.set(n, k);
    if (k === 1) return n;
    m('name-doppelt', n);
    return `${n} (${k})`;
  };

  const holeText = (el: Knoten, dokname: string): { text: string | null; bom: boolean } => {
    const p = attr(el, 'plainTextPath');
    if (p) {
      let b: Uint8Array | undefined;
      if (p.startsWith('internal://')) {
        const rest = p.slice('internal://'.length).replace(/^\/+/, '');
        if (!rest.split('/').some(t => t === '..' || t === '.' || t.includes('\\'))) b = quellDateien.get('sources/' + rest.toLowerCase());
      }
      if (!b) { m('quelle-fehlt', dokname); return { text: null, bom: false }; }
      const x = dekodiere(b);
      if (x.bom) m('bom-entfernt', dokname);
      return { text: x.text, bom: x.bom };
    }
    const pc = kinder(el, 'PlainTextContent')[0];
    if (pc) return { text: tx(pc), bom: false };
    m('quelle-fehlt', dokname);
    return { text: null, bom: false };
  };

  const zahlAttr = (el: Knoten, a: string): number | null => {
    const v = attr(el, a);
    return v !== null && /^\s*[+-]?\d+\s*$/.test(v) ? parseInt(v, 10) : null;
  };

  const neuesSegment = (dok: Dokument, a: number, b: number, el: Knoten, codings: Knoten[], selUser: string | null, text: string) => {
    const seg: Segment = { id: ids.neu(), dokument: dok.id, start: a, ende: b, erstellt: jetzt };
    segmente.push({ el, codings, seg, dok, text });
    for (const cd of codings) {
      const ref = kinder(cd, 'CodeRef')[0];
      const code = ref ? codeNachGuid.get(gnorm(attr(ref, 'targetGUID'))) : undefined;
      if (!code) { m('guid-unbekannt', dok.name); continue; }
      kodierungen.push({ id: ids.neu(), segment: seg.id, code: code.id, kodierende: personFuer(attr(cd, 'creatingUser'), selUser), erstellt: jetzt });
    }
  };

  const baueDokument = (quelle: Knoten, textEl: Knoten, art: Dokument['art'], nameRoh: string, selContainer: Knoten | null, quellCodings: Knoten[]) => {
    const t = holeText(textEl, nameRoh);
    if (t.text === null) return;
    const text = t.text;
    const name = eindeutig(nameRoh);
    const sels = selContainer ? kinder(selContainer, 'PlainTextSelection').map(el => ({ el, start: zahlAttr(el, 'startPosition'), ende: zahlAttr(el, 'endPosition'), name: attr(el, 'name') })) : [];
    const cps = Array.from(text);
    const L = cps.length;
    const { modus, art: pruef } = waehleZaehlweise(cps, text, sels, origin, t.bom);
    if (sels.length && pruef === 'ungeprueft') m('positionen-ungeprueft', name);
    else if (pruef === 'unsicher') m('positionen-unsicher', name);
    if (modus === 'b' && text.includes('\r\n')) m('zaehlweise-crlf', name);
    if (modus === 'c') m('zaehlweise-bom', name);
    const dok: Dokument = { id: ids.fuer(attr(quelle, 'guid')), name, art, text, erstellt: jetzt, geaendert: jetzt };
    dokumente.push(dok); dokEl.set(dok.id, quelle);
    const gk = gnorm(attr(quelle, 'guid'));
    (dokNachGuid.get(gk) ?? dokNachGuid.set(gk, []).get(gk)!).push(dok);
    const eb = modus === 'b' ? einheitenB(cps) : [];
    const sub = (a: number, b: number) => cps.slice(a, b).join('');
    for (const s of sels) {
      if (s.start === null || s.ende === null) { m('segment-ausserhalb', name); continue; }
      if (s.start === s.ende) { m('segment-leer', name); continue; }
      const a = idxVon(modus, s.start, eb), b = idxVon(modus, s.ende, eb);
      if (a === null || b === null || !(a >= 0 && a < b && b <= L)) { m('segment-ausserhalb', name); continue; }
      neuesSegment(dok, a, b, s.el, kinder(s.el, 'Coding'), attr(s.el, 'creatingUser'), sub(a, b));
    }
    if (quellCodings.length && L > 0) neuesSegment(dok, 0, L, quelle, quellCodings, null, text);
  };

  const quellen = kinder(kinder(w, 'Sources')[0]);
  for (const src of quellen) {
    const t = ln(src), name = attr(src, 'name') ?? '';
    if (t === 'TextSource') baueDokument(src, src, 'text', name, src, kinder(src, 'Coding'));
    else if (t === 'PDFSource') {
      for (const r of kinder(src, 'Representation')) baueDokument(src, r, 'pdftext', name, r, []);
      nichtGelesenZaehlen('PDFSelection', kinder(src, 'PDFSelection').length);
    } else if (t === 'AudioSource' || t === 'VideoSource') {
      nichtGelesenZaehlen(t === 'AudioSource' ? 'AudioSelection' : 'VideoSelection', kinder(src, t === 'AudioSource' ? 'AudioSelection' : 'VideoSelection').length);
      const trs = kinder(src, 'Transcript');
      if (!trs.length) nichtGelesenZaehlen(t);
      trs.forEach((tr, i) => {
        const nm = i === 0 ? name : `${name} (${d ? 'Transkript' : 'Transcript'} ${i + 1})`;
        baueDokument(src, tr, t === 'AudioSource' ? 'audio' : 'video', nm, null, []);
        nichtGelesenZaehlen('TranscriptSelection', kinder(tr, 'TranscriptSelection').length);
      });
    } else if (t === 'PictureSource') nichtGelesenZaehlen('PictureSource');
  }
  if (kinder(w, 'Links').length) nichtGelesenZaehlen('Link', kinder(kinder(w, 'Links')[0], 'Link').length);
  if (kinder(w, 'Graphs').length) nichtGelesenZaehlen('Graph', kinder(kinder(w, 'Graphs')[0], 'Graph').length);

  /* --- Fälle --- */
  const faelle: Fall[] = [];
  const dokFall = (dok: Dokument, fall: Fall) => { if (dok.fall === undefined) dok.fall = fall.id; };
  const quelleName = new Map(quellen.map(s => [gnorm(attr(s, 'guid')), attr(s, 'name')]));
  const inFall = new Set<string>();
  for (const c of kinder(kinder(w, 'Cases')[0], 'Case')) {
    const refs = kinder(c, 'SourceRef').map(x => gnorm(attr(x, 'targetGUID')));
    refs.forEach(r => inFall.add(r));
    const fall: Fall = { id: ids.fuer(attr(c, 'guid')), name: attr(c, 'name') || (refs.length === 1 ? quelleName.get(refs[0]!) ?? '' : ''), werte: werteVon(c) };
    faelle.push(fall);
    for (const r of refs) for (const dk of dokNachGuid.get(r) ?? []) dokFall(dk, fall);
  }
  for (const src of quellen) {
    const wv = werteVon(src), g = gnorm(attr(src, 'guid'));
    if (Object.keys(wv).length && !inFall.has(g)) {
      const fall: Fall = { id: ids.neu(), name: attr(src, 'name') ?? '', werte: wv };
      faelle.push(fall);
      for (const dk of dokNachGuid.get(g) ?? []) dk.fall = fall.id;
      m('dokumentvariablen-fall', attr(src, 'name') ?? '');
    }
  }

  /* --- Memos --- */
  interface NoteInfo { memo: Memo; bezug: Memo['bezug'] }
  const notes = new Map<string, NoteInfo>();
  for (const n of kinder(kinder(w, 'Notes')[0], 'Note')) {
    const t = holeText(n, attr(n, 'name') ?? '');
    const memo: Memo = { id: ids.neu(), text: t.text ?? '', bezug: [], erstellt: jetzt };
    let titel = attr(n, 'name');
    if (titel !== null) {
      const p = MEMO_PRAEFIXE.find(([pr]) => titel!.startsWith(pr) || titel === pr.trimEnd());
      if (p) { memo.art = p[1]; titel = titel.startsWith(p[0]) ? titel.slice(p[0].length) : ''; }
      if (titel !== '' || !p) memo.titel = titel;
    }
    notes.set(gnorm(attr(n, 'guid')), { memo, bezug: [] });
  }
  const noteRefs = (el: Knoten, art: Memo['bezug'][number]['art'], id?: string) => {
    for (const r of kinder(el, 'NoteRef')) {
      const n = notes.get(gnorm(attr(r, 'targetGUID')));
      if (n) n.bezug.push(id === undefined ? { art } : { art, id });
    }
  };
  noteRefs(w, 'projekt');
  for (const dk of dokumente) if (dk.art === 'text') noteRefs(dokEl.get(dk.id)!, 'dokument', dk.id);
  for (const c of codes) noteRefs(codeEl.get(c.id)!, 'code', c.id);
  for (const s of segmente) { noteRefs(s.el, 'segment', s.seg.id); for (const cd of s.codings) noteRefs(cd, 'segment', s.seg.id); }
  const memos: Memo[] = [];
  for (const n of notes.values()) { n.memo.bezug = n.bezug.length ? n.bezug : [{ art: 'projekt' }]; memos.push(n.memo); }
  for (const s of segmente) {
    const ds = ln(s.el) === 'PlainTextSelection' ? kinder(s.el, 'Description')[0] : undefined;
    if (ds && tx(ds).trim()) memos.push({ id: ids.neu(), titel: d ? 'Kommentar (ATLAS.ti)' : 'Comment (ATLAS.ti)', text: tx(ds), bezug: [{ art: 'segment', id: s.seg.id }], erstellt: jetzt });
  }

  /* --- Mengen --- */
  const mengen: Menge[] = [];
  const themen: Thema[] = [];
  for (const st of kinder(kinder(w, 'Sets')[0], 'Set')) {
    const dn = kinder(st, 'MemberSource').map(x => dokNachGuid.get(gnorm(attr(x, 'targetGUID')))?.[0]?.id).filter((x): x is string => !!x);
    const cn = kinder(st, 'MemberCode').map(x => codeNachGuid.get(gnorm(attr(x, 'targetGUID')))?.id).filter((x): x is string => !!x);
    const name = attr(st, 'name') ?? '';
    // Themen (Stufe A3): Set „Theme: …“ nur mit Codes → Thema (Beschreibung = zentrales Konzept); Stand und Verlauf stehen nicht im Format
    if (name.startsWith(THEMA_SET) && name.length > THEMA_SET.length && !dn.length) {
      const tName = name.slice(THEMA_SET.length).trim();
      const konzept = tx(kinder(st, 'Description')[0]).trim();
      const t: Thema = {
        id: ids.fuer(attr(st, 'guid')), name: tName, codes: [...new Set(cn)], stand: 'aktiv', reihenfolge: themen.length,
        verlauf: [{ zeit: jetzt, was: 'angelegt', nachher: tName, notiz: d ? 'aus REFI-QDA eingelesen' : 'read from REFI-QDA' }], erstellt: jetzt, geaendert: jetzt,
      };
      if (konzept) t.konzept = konzept;
      themen.push(t);
      continue;
    }
    if (dn.length) mengen.push({ id: ids.neu(), name, art: 'dokumente', mitglieder: dn });
    if (cn.length) mengen.push({ id: ids.neu(), name, art: 'codes', mitglieder: cn });
  }

  if (unbekanntAnzahl) m('kodierende-unbekannt', undefined, unbekanntAnzahl);

  const meldungen: QdpxMeldung[] = [...meld.values()].map(e => {
    const r: QdpxMeldung = { art: e.art, satz: satz(e.art, d, e.dokument, e.n, e.was) };
    if (e.dokument !== undefined) r.dokument = e.dokument;
    if (e.was !== undefined) r.was = e.was;
    if (['segment-ausserhalb', 'segment-leer', 'guid-unbekannt', 'nicht-gelesen', 'kodierende-unbekannt'].includes(e.art)) r.anzahl = e.n;
    return r;
  });

  const projekt: QualProjekt = {
    format: 'statable-qualitativ', version: 1, id: ids.neu(), name: attr(w, 'name') || 'REFI-QDA',
    kodierende, dokumente, codes, segmente: segmente.map(s => s.seg), kodierungen, memos, faelle, variablen, mengen, protokoll: [],
    herkunft: { art: 'qdpx', zeit: jetzt, ...(origin ? { programm: origin } : {}) },
  };
  if (themen.length) projekt.themen = themen;
  // Arbeitsweise aus der Projektbeschreibung („Approach: …“): nur als Hinweis, nie als Einstellung (Architekturblatt Ausbau 5)
  const ansatz = tx(kinder(w, 'Description')[0]).split(/\r?\n/)[0]?.trim() ?? '';
  if (ansatz.startsWith(ANSATZ_ZEILE) && ansatz.length > ANSATZ_ZEILE.length) {
    const was = ansatz.slice(ANSATZ_ZEILE.length).trim();
    meldungen.push({ art: 'ansatz-genannt', was, satz: satz('ansatz-genannt', d, undefined, 1, was) });
  }
  projekt.version = qualFassung(projekt);
  void nichtGelesen;
  const ergebnis: QdpxErgebnis = {
    projekt, meldungen,
    zaehlung: { dokumente: dokumente.length, codes: codes.length, segmente: projekt.segmente.length, kodierungen: kodierungen.length, kodierende: kodierende.length, memos: memos.length, faelle: faelle.length, variablen: variablen.length, mengen: mengen.length },
  };
  if (origin) ergebnis.programm = origin;
  return ergebnis;
}

/* ------------------------------------------------------------------ zusammenführen */
export interface Zusammenfuehrung { projekt: QualProjekt; meldungen: QdpxMeldung[]; codeZuordnung: { von: string; zu: string; wie: 'guid' | 'pfad' | 'neu' }[] }

const klon = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const pfadTeil = (t: string): string => normLeer(t).trim().toLowerCase();
const istUnbekannt = (n: string): boolean => n === 'Unbekannt' || n === 'Unknown';

/** b wird an a gehängt (Fachblatt 5A, "Zusammenführen"). a und b bleiben unverändert. gleichePersonen: id in b → id in a (nur nach Rückfrage "dieselbe Person"). */
export function fuehreZusammen(a: QualProjekt, b: QualProjekt, sprache: 'de' | 'en', gleichePersonen: Record<string, string> = {}): Zusammenfuehrung {
  const d = sprache !== 'en';
  const r = klon(a);
  const meldungen: QdpxMeldung[] = [];
  const belegt = new Set<string>();
  const merke = (q: QualProjekt) => {
    for (const l of [q.kodierende, q.dokumente, q.codes, q.segmente, q.kodierungen, q.memos, q.faelle, q.variablen, q.mengen ?? [], q.themen ?? [], q.protokolle ?? [], q.sequenzanalysen ?? [], q.typen ?? [], q.jointDisplays ?? [], q.instrument ?? []]) for (const x of l) belegt.add(x.id);
  };
  merke(r);
  const frei = (id: string): string => {
    let i = id;
    while (belegt.has(i)) i = globalThis.crypto.randomUUID().toLowerCase();
    belegt.add(i);
    return i;
  };
  const urspruenglicheCodes = new Set(r.codes.map(c => c.id));

  /* Variablen und Fälle */
  const varZiel = new Map<string, string>();
  const varNachName = new Map<string, Variable>();
  for (const v of r.variablen) if (!varNachName.has(v.name)) varNachName.set(v.name, v);
  const varName = new Map<string, string>();
  for (const v of b.variablen) {
    varName.set(v.id, v.name);
    const e = varNachName.get(v.name);
    if (e) { varZiel.set(v.id, e.id); continue; }
    const neu: Variable = { ...klon(v), id: frei(v.id) };
    r.variablen.push(neu); varNachName.set(neu.name, neu); varZiel.set(v.id, neu.id);
  }
  const fallZiel = new Map<string, string>();
  const fallNachName = new Map<string, Fall>();
  for (const f of r.faelle) if (!fallNachName.has(f.name)) fallNachName.set(f.name, f);
  for (const f of b.faelle) {
    const e = fallNachName.get(f.name);
    if (e) {
      fallZiel.set(f.id, e.id);
      for (const [vid, wert] of Object.entries(f.werte)) {
        const zid = varZiel.get(vid);
        if (zid === undefined) continue;
        if (!Object.prototype.hasOwnProperty.call(e.werte, zid)) Object.defineProperty(e.werte, zid, { value: wert, enumerable: true, writable: true, configurable: true });
        else if (e.werte[zid] !== wert) {
          const vn = varName.get(vid) ?? '';
          meldungen.push({ art: 'fallwert-verschieden', dokument: undefined, was: vn, satz: d
            ? `Fall „${f.name}“, Variable „${vn}“: Die Werte sind in den beiden Dateien verschieden. Statable behält den Wert der ersten Datei.`
            : `Case "${f.name}", variable "${vn}": the values differ between the two files. Statable keeps the value of the first file.` });
        }
      }
    } else {
      const werte: Fall['werte'] = {};
      for (const [vid, wert] of Object.entries(f.werte)) { const zid = varZiel.get(vid); if (zid !== undefined) Object.defineProperty(werte, zid, { value: wert, enumerable: true, writable: true, configurable: true }); }
      const neu: Fall = { id: frei(f.id), name: f.name, werte };
      r.faelle.push(neu); fallNachName.set(neu.name, neu); fallZiel.set(f.id, neu.id);
    }
  }

  /* Dokumente: gleicher Text = dasselbe Dokument (Name aus a); gleicher Name mit anderem Text = eigenes Dokument */
  const textZuDok = new Map<string, Dokument>();
  for (const dk of r.dokumente) if (!textZuDok.has(dk.text)) textZuDok.set(dk.text, dk);
  const namenA = new Set(r.dokumente.map(x => x.name));
  const dokZiel = new Map<string, string>();
  for (const dk of b.dokumente) {
    const gleich = textZuDok.get(dk.text);
    if (gleich) { dokZiel.set(dk.id, gleich.id); continue; }
    let name = dk.name;
    if (namenA.has(dk.name)) {
      name = `${dk.name} ${d ? '(aus Datei 2)' : '(from file 2)'}`;
      meldungen.push({ art: 'text-verschieden', dokument: dk.name, satz: d
        ? `Der Text von „${dk.name}“ ist in den beiden Dateien verschieden. Die Textstellen lassen sich nicht vergleichen.`
        : `The text of "${dk.name}" differs between the two files. The text passages cannot be compared.` });
    }
    const neu: Dokument = { ...klon(dk), id: frei(dk.id), name };
    if (dk.fall !== undefined) { const f = fallZiel.get(dk.fall); if (f) neu.fall = f; else delete neu.fall; }
    if (neu.transkript) for (const s of neu.transkript.sprecher) if (s.fall !== undefined) { const f = fallZiel.get(s.fall); if (f) s.fall = f; else delete s.fall; }
    r.dokumente.push(neu); dokZiel.set(dk.id, neu.id);
  }

  /* Codes: gleiche Kennung, sonst gleicher Pfad der Namen, sonst neu */
  const codeNachId = new Map(r.codes.map(c => [c.id, c]));
  const pfadVon = (c: Code, nach: Map<string, Code>): string => {
    const t: string[] = []; const gesehen = new Set<string>();
    for (let x: Code | undefined = c; x && !gesehen.has(x.id); x = x.elternId !== undefined ? nach.get(x.elternId) : undefined) { gesehen.add(x.id); t.unshift(pfadTeil(x.name)); }
    return t.join('/');
  };
  const pfadA = new Map<string, Code>();
  for (const c of r.codes) { const k = pfadVon(c, codeNachId); if (!pfadA.has(k)) pfadA.set(k, c); }
  const bNachId = new Map(b.codes.map(c => [c.id, c]));
  const codeZiel = new Map<string, { zu: string; wie: 'guid' | 'pfad' | 'neu' }>();
  const ordne = (c: Code, tiefe = 0): { zu: string; wie: 'guid' | 'pfad' | 'neu' } => {
    const schon = codeZiel.get(c.id);
    if (schon) return schon;
    let z: { zu: string; wie: 'guid' | 'pfad' | 'neu' };
    if (urspruenglicheCodes.has(c.id)) z = { zu: c.id, wie: 'guid' };
    else {
      const schl = pfadVon(c, bNachId);
      const gleich = pfadA.get(schl);
      if (gleich) z = { zu: gleich.id, wie: 'pfad' };
      else {
        const eltern = c.elternId !== undefined && bNachId.has(c.elternId) && tiefe < 1000 ? ordne(bNachId.get(c.elternId)!, tiefe + 1).zu : undefined;
        const geschwister = r.codes.filter(x => x.elternId === eltern);
        const neu: Code = { ...klon(c), id: frei(c.id), reihenfolge: geschwister.reduce((mx, x) => Math.max(mx, x.reihenfolge + 1), 0) };
        if (eltern !== undefined) neu.elternId = eltern; else delete neu.elternId;
        r.codes.push(neu); codeNachId.set(neu.id, neu); pfadA.set(schl, neu);
        z = { zu: neu.id, wie: 'neu' };
      }
    }
    codeZiel.set(c.id, z);
    return z;
  };
  const codeZuordnung = b.codes.map(c => ({ von: c.id, ...ordne(c) }));

  /* Kodierende bleiben getrennt */
  const persZiel = new Map<string, string>();
  const rIds = new Set(r.kodierende.map(k => k.id));
  const nurUnbekannt = b.kodierende.every(k => istUnbekannt(k.name));
  const nameVorhanden = (n: string) => r.kodierende.find(k => k.name === n);
  for (const k of b.kodierende) {
    if (nurUnbekannt) {
      const n = d ? 'Datei 2' : 'File 2';
      const e = nameVorhanden(n);
      if (e) persZiel.set(k.id, e.id); else { const neu = { id: frei(k.id), name: n }; r.kodierende.push(neu); persZiel.set(k.id, neu.id); }
    } else if (rIds.has(k.id)) persZiel.set(k.id, k.id);
    else if (gleichePersonen[k.id] !== undefined && r.kodierende.some(x => x.id === gleichePersonen[k.id])) persZiel.set(k.id, gleichePersonen[k.id]!);
    else if (istUnbekannt(k.name)) {
      const e = r.kodierende.find(x => istUnbekannt(x.name));
      if (e) persZiel.set(k.id, e.id); else { const neu = { id: frei(k.id), name: k.name }; r.kodierende.push(neu); persZiel.set(k.id, neu.id); }
    } else if (nameVorhanden(k.name)) {
      const neuName = `${k.name} ${d ? '(Datei 2)' : '(File 2)'}`;
      const neu = { id: frei(k.id), name: neuName };
      r.kodierende.push(neu); persZiel.set(k.id, neu.id);
      meldungen.push({ art: 'person-gleicher-name', was: k.id, satz: d
        ? `Ist „${k.name}“ in beiden Dateien dieselbe Person? Statable hält sie vorerst getrennt („${neuName}“).`
        : `Is "${k.name}" the same person in both files? Statable keeps them apart for now ("${neuName}").` });
    } else { const neu = { id: frei(k.id), name: k.name }; r.kodierende.push(neu); persZiel.set(k.id, neu.id); }
  }
  const person = (id: string | undefined): string | undefined => (id === undefined ? undefined : persZiel.get(id) ?? id);

  /* Segmente und Kodierungen: jede Person behält ihr eigenes Segment */
  const segZiel = new Map<string, string>();
  for (const s of b.segmente) {
    const dz = dokZiel.get(s.dokument);
    if (!dz) continue;
    const neu: Segment = { ...klon(s), id: frei(s.id), dokument: dz };
    if (s.kodierende !== undefined) neu.kodierende = person(s.kodierende)!;
    r.segmente.push(neu); segZiel.set(s.id, neu.id);
  }
  for (const k of b.kodierungen) {
    const sz = segZiel.get(k.segment), cz = codeZiel.get(k.code);
    if (!sz || !cz) continue;
    r.kodierungen.push({ ...klon(k), id: frei(k.id), segment: sz, code: cz.zu, kodierende: person(k.kodierende)! });
  }
  for (const c of r.codes) if (c.anker && !urspruenglicheCodes.has(c.id)) for (const an of c.anker) if (an.segment !== undefined) { const s = segZiel.get(an.segment); if (s) an.segment = s; else delete an.segment; }

  /* Themen (Stufe A3, Architekturblatt Ausbau 2): nie still verschmelzen, auch nicht bei gleichem Namen; sie stehen nebeneinander, die
     Herkunft steht im Verlauf. Zusammenlegen macht die Person. */
  const themaZiel = new Map<string, string>();
  if (b.themen?.length) {
    for (const t of b.themen) themaZiel.set(t.id, frei(t.id));
    const herkunft = b.name || 'REFI-QDA';
    const basisReihe = r.themen?.length ?? 0;
    for (const t of b.themen) {
      const x: Thema = {
        ...klon(t), id: themaZiel.get(t.id)!,
        codes: [...new Set(t.codes.map(c => codeZiel.get(c)?.zu).filter((c): c is string => !!c))],
        reihenfolge: basisReihe + t.reihenfolge,
        verlauf: [...klon(t.verlauf), { zeit: Date.now(), was: 'angelegt', nachher: t.name, notiz: d ? `zusammengeführt aus „${herkunft}“` : `merged from "${herkunft}"` }],
      };
      const belege = (t.belege ?? []).map(s => segZiel.get(s)).filter((s): s is string => !!s);
      if (belege.length) x.belege = belege; else delete x.belege;
      if (t.fall !== undefined) { const f = fallZiel.get(t.fall); if (f) x.fall = f; else delete x.fall; }
      if (t.elternId !== undefined) x.elternId = themaZiel.get(t.elternId)!;
      if (t.aus) x.aus = t.aus.map(a2 => themaZiel.get(a2)).filter((a2): a2 is string => !!a2);
      if (t.kodierende !== undefined) { const p = person(t.kodierende); if (p) x.kodierende = p; else delete x.kodierende; }
      for (const s of x.verlauf) if (s.kodierende !== undefined) { const p = person(s.kodierende); if (p) s.kodierende = p; else delete s.kodierende; }
      if ((r.themen ?? []).some(y => y.name.trim().toLocaleLowerCase() === t.name.trim().toLocaleLowerCase() && (y.fall ?? '') === (x.fall ?? ''))) {
        meldungen.push({ art: 'thema-gleicher-name', dokument: undefined, was: t.name, satz: d
          ? `Thema „${t.name}“ gibt es in beiden Dateien. Statable legt Themen nie selbst zusammen: Beide stehen nebeneinander; legen Sie sie bei Bedarf im Bereich „Themen“ zusammen.`
          : `Theme "${t.name}" exists in both files. Statable never merges themes by itself: both are listed; merge them in the "Themes" area if needed.` });
      }
      (r.themen ??= []).push(x);
    }
  }
  if ((a.arbeitsweise ?? 'allgemein') !== (b.arbeitsweise ?? 'allgemein')) {
    meldungen.push({ art: 'arbeitsweise-verschieden', dokument: undefined, satz: d
      ? 'Die beiden Projekte haben verschiedene Arbeitsweisen. Statable behält die Arbeitsweise des ersten Projekts; sie ist nur eine Voreinstellung.'
      : 'The two projects have different approaches. Statable keeps the approach of the first project; it is only a preset.' });
  }

  /* Memos und Mengen */
  const protZiel = new Map<string, string>();
  for (const pr of b.protokolle ?? []) protZiel.set(pr.id, frei(pr.id));
  const saZiel = new Map<string, string>();
  for (const sa of b.sequenzanalysen ?? []) saZiel.set(sa.id, frei(sa.id));
  const ziel = (art: string, id: string | undefined): string | undefined => {
    if (id === undefined) return undefined;
    if (art === 'protokoll') return protZiel.get(id);
    if (art === 'sequenzanalyse') return saZiel.get(id);
    if (art === 'dokument') return dokZiel.get(id);
    if (art === 'code') return codeZiel.get(id)?.zu;
    if (art === 'segment') return segZiel.get(id);
    if (art === 'fall') return fallZiel.get(id);
    if (art === 'thema') return themaZiel.get(id);
    return undefined;
  };
  for (const mm of b.memos) {
    const bezug = mm.bezug.flatMap((x): Memo['bezug'] => { if (x.art === 'projekt') return [{ art: 'projekt' }]; const z = ziel(x.art, x.id); return z ? [{ art: x.art, id: z }] : []; });
    if (!bezug.length) continue;
    const neu: Memo = { ...klon(mm), id: frei(mm.id), bezug };
    if (mm.kodierende !== undefined) neu.kodierende = person(mm.kodierende)!;
    r.memos.push(neu);
  }
  for (const me of b.mengen ?? []) {
    const mitglieder = me.mitglieder.map(i => ziel(me.art === 'dokumente' ? 'dokument' : 'code', i)).filter((x): x is string => !!x);
    if (!mitglieder.length) continue;
    (r.mengen ??= []).push({ id: frei(me.id), name: me.name, art: me.art, mitglieder });
  }

  /* Spaltensätze (Stufe A6): eingebaute stehen nicht im Projekt; eigene: gleiche Kennung und gleicher Inhalt = wiederverwenden, sonst neu */
  const satzZiel = new Map<string, string>();
  const satzKennungen = new Set((r.spaltensaetze ?? []).map(x => x.kennung));
  const satzNamenA = new Set((r.spaltensaetze ?? []).map(x => JSON.stringify(x.name)));
  for (const s of b.spaltensaetze ?? []) {
    const e = (r.spaltensaetze ?? []).find(x => x.kennung === s.kennung);
    if (e && JSON.stringify(e) === JSON.stringify(s)) { satzZiel.set(s.kennung, e.kennung); continue; }
    let kennung = s.kennung;
    while (satzKennungen.has(kennung)) kennung = `eigen-${globalThis.crypto.randomUUID().slice(0, 8)}`;
    satzKennungen.add(kennung);
    const x: Spaltensatz = { ...klon(s), kennung };
    if (satzNamenA.has(JSON.stringify(s.name))) {
      const z = d ? ' (aus Datei 2)' : ' (from file 2)';
      x.name = { ...x.name, de: x.name.de + z, en: x.name.en + z };
    }
    (r.spaltensaetze ??= []).push(x); satzZiel.set(s.kennung, kennung);
  }

  /* Sequenzanalysen (Stufe A6): jede Analyse aus b kommt neu dazu; Kennungen innerhalb der Analyse gelten nur dort und bleiben */
  for (const sa of b.sequenzanalysen ?? []) {
    const x: Sequenzanalyse = { ...klon(sa), id: saZiel.get(sa.id)! };
    if (sa.dokument !== undefined) { const dz = dokZiel.get(sa.dokument); if (dz) x.dokument = dz; else delete x.dokument; }
    if (sa.kodierende !== undefined) { const p = person(sa.kodierende); if (p) x.kodierende = p; else delete x.kodierende; }
    if (sa.spaltensatz !== undefined) x.spaltensatz = satzZiel.get(sa.spaltensatz) ?? sa.spaltensatz;
    for (const e of x.einheiten) {
      const alle = [e.paraphrase, e.intentionen, e.lesarten, e.rollen, e.anschluss, ...Object.values(e.weitere ?? {})];
      for (const l of alle) for (const en of l) if (en.person !== undefined) { const p = person(en.person); if (p) en.person = p; else delete en.person; }
    }
    x.herkunft = { art: 'zusammengefuehrt', quellen: [...(sa.herkunft?.quellen ?? []), b.name || 'REFI-QDA'], zeit: Date.now() };
    if ((r.sequenzanalysen ?? []).some(y => y.name === sa.name)) {
      x.name = `${sa.name} ${d ? '(aus Datei 2)' : '(from file 2)'}`;
      meldungen.push({ art: 'analyse-gleicher-name', dokument: undefined, was: sa.name, satz: d
        ? `Es gibt in beiden Dateien eine Analyse „${sa.name}“. Beide bleiben erhalten; die zweite heißt „${x.name}“.`
        : `Both files contain an analysis "${sa.name}". Both are kept; the second is called "${x.name}".` });
    }
    (r.sequenzanalysen ??= []).push(x);
  }

  /* Protokolle (Stufe A6a): alle aus b; Fall, Dokument und Person umgesetzt; ein Bezug, der in b ins Leere zeigt, entfällt */
  for (const pr of b.protokolle ?? []) {
    const x: Protokoll = { ...klon(pr), id: protZiel.get(pr.id)! };
    if (pr.fall !== undefined) { const f = fallZiel.get(pr.fall); if (f) x.fall = f; else delete x.fall; }
    if (pr.dokument !== undefined) { const dz = dokZiel.get(pr.dokument); if (dz) x.dokument = dz; else delete x.dokument; }
    if (pr.kodierende !== undefined) { const p = person(pr.kodierende); if (p) x.kodierende = p; else delete x.kodierende; }
    (r.protokolle ??= []).push(x);
  }

  /* Typen, Joint Displays, Instrument (Stufe A6a): aus beiden; geht ein Bezug nicht sicher, bleibt das Element aus b weg (mit Meldung) */
  const weg = (was: string, name: string): void => {
    meldungen.push({ art: 'element-nicht-uebernommen', dokument: undefined, was: name, satz: d
      ? `${was} „${name}“ aus Datei 2 wurde nicht übernommen: Ein Bezug auf Fälle, Codes oder Themen ließ sich nicht sicher umsetzen.`
      : `${was} "${name}" from file 2 was not taken over: a reference to cases, codes or themes could not be mapped safely.` });
  };
  const typZiel = new Map<string, string>();
  for (const t of b.typen ?? []) {
    const faelle = t.faelle.map(f => fallZiel.get(f));
    const merkmale = t.merkmale.map(m => codeZiel.get(m)?.zu ?? varZiel.get(m));
    if (faelle.some(f => f === undefined) || merkmale.some(m => m === undefined)) { weg(d ? 'Der Typ' : 'The type', t.name); continue; }
    const x: Typ = { ...klon(t), id: frei(t.id), faelle: [...new Set(faelle as string[])], merkmale: [...new Set(merkmale as string[])] };
    typZiel.set(t.id, x.id);
    (r.typen ??= []).push(x);
  }
  /** Schlüssel `code:<id>`, `thema:<id>`, `typ:<id>` umsetzen; alle anderen (w:…, ohne, nv, mit, alle) bleiben */
  const schl = (k: string): string | undefined => {
    const i = k.indexOf(':');
    const art = i < 0 ? '' : k.slice(0, i), id = k.slice(i + 1);
    if (art === 'code') { const z = codeZiel.get(id)?.zu; return z ? `code:${z}` : undefined; }
    if (art === 'thema') { const z = themaZiel.get(id); return z ? `thema:${z}` : undefined; }
    if (art === 'typ') { const z = typZiel.get(id); return z ? `typ:${z}` : undefined; }
    return k;
  };
  for (const jd of b.jointDisplays ?? []) {
    const x: JointDisplay = { ...klon(jd), id: frei(jd.id) };
    let ok = true;
    const g = jd.gruppierung;
    if (g) {
      if (g.quelle === 'variable') { const v = varZiel.get(g.id); if (v) x.gruppierung = { quelle: 'variable', id: v }; else ok = false; }
      else if (g.quelle === 'code') { const c = codeZiel.get(g.id)?.zu; if (c) x.gruppierung = { quelle: 'code', id: c }; else ok = false; }
      else if (g.quelle === 'thema') { const t = themaZiel.get(g.id); if (t) x.gruppierung = { quelle: 'thema', id: t }; else ok = false; }
    }
    x.zeilen = [];
    for (const z of jd.zeilen) { const zz = z.art === 'code' ? codeZiel.get(z.id)?.zu : themaZiel.get(z.id); if (zz) x.zeilen.push({ art: z.art, id: zz }); else ok = false; }
    if (!ok) { weg(d ? 'Das Joint Display' : 'The joint display', jd.name); continue; }
    const karte = <T>(o: Record<string, T>): Record<string, T> => {
      const aus: Record<string, T> = {};
      for (const [k, v] of Object.entries(o)) { const n = schl(k); if (n !== undefined) Object.defineProperty(aus, n, { value: v, enumerable: true, writable: true, configurable: true }); }
      return aus;
    };
    x.passung = karte(jd.passung); x.metaInferenz = karte(jd.metaInferenz);
    if (jd.zahlen) x.zahlen = karte(jd.zahlen);
    x.belege = jd.belege.flatMap(be => { const z = schl(be.zeile), gr = schl(be.gruppe), s = segZiel.get(be.segment); return z !== undefined && gr !== undefined && s ? [{ zeile: z, gruppe: gr, segment: s }] : []; });
    if (jd.kodierende !== undefined) { const p = person(jd.kodierende); if (p) x.kodierende = p; else delete x.kodierende; }
    (r.jointDisplays ??= []).push(x);
  }
  for (const it of b.instrument ?? []) {
    const x: ItemEntwurf = { ...klon(it), id: frei(it.id) };
    if (it.herkunft) { const hz = it.herkunft.art === 'code' ? codeZiel.get(it.herkunft.id)?.zu : themaZiel.get(it.herkunft.id); if (hz) x.herkunft = { art: it.herkunft.art, id: hz }; else delete x.herkunft; }
    if (it.beleg !== undefined) { const s = segZiel.get(it.beleg); if (s) x.beleg = s; else delete x.beleg; }
    delete x.plan;   // der Fragebogen-Plan gehört zum Statable-Projekt der Datei 2, nicht zu diesem
    if (it.kodierende !== undefined) { const p = person(it.kodierende); if (p) x.kodierende = p; else delete x.kodierende; }
    (r.instrument ??= []).push(x);
  }

  /* Einzelangaben: die erste Datei gewinnt; fehlt es dort, kommt es aus b; verschiedene Angaben: Meldung */
  const einzel = (feld: 'verknuepfung' | 'mmDesign' | 'kiNutzung', name: string): void => {
    const vb = b[feld];
    if (vb === undefined) return;
    const bv = klon(vb) as { variable?: string; kodierende?: string };
    if (feld === 'verknuepfung') {
      const v = varZiel.get(bv.variable ?? '');
      if (!v) { if (r[feld] === undefined) weg(d ? 'Die Angabe' : 'The entry', name); return; }
      bv.variable = v;
    }
    if (r[feld] === undefined) {
      if (bv.kodierende !== undefined) { const p = person(bv.kodierende); if (p) bv.kodierende = p; else delete bv.kodierende; }
      (r as unknown as Record<string, unknown>)[feld] = bv;
      return;
    }
    const strip = (o: unknown): string => JSON.stringify(o, (key, v) => (key === 'geaendert' || key === 'kodierende' ? undefined : v));
    if (strip(r[feld]) !== strip(bv)) {
      meldungen.push({ art: 'einstellung-verschieden', dokument: undefined, was: name, satz: d
        ? `${name}: Die beiden Dateien haben verschiedene Angaben. Statable behält die Angabe der ersten Datei.`
        : `${name}: the two files have different entries. Statable keeps the entry of the first file.` });
    }
  };
  einzel('verknuepfung', d ? 'Verknüpfung mit dem Datensatz' : 'Link to the data set');
  einzel('mmDesign', d ? 'Design-Steckbrief' : 'Design profile');
  einzel('kiNutzung', d ? 'Angabe zur KI-Nutzung' : 'Statement on AI use');

  /* Einwilligungen gehören zur Person, die sie eingeholt hat: nie aus b übernommen (Datenschutz), nur gezählt */
  if (b.einwilligungen?.length) {
    const n = b.einwilligungen.length;
    meldungen.push({ art: 'einwilligungen-nicht-uebernommen', dokument: undefined, anzahl: n, satz: d
      ? `${n} ${n === 1 ? 'Einwilligung' : 'Einwilligungen'} aus Datei 2 ${n === 1 ? 'wurde' : 'wurden'} bewusst nicht übernommen: Einwilligungen gehören zu der Person, die sie eingeholt hat.`
      : `${n} consent ${n === 1 ? 'record' : 'records'} from file 2 ${n === 1 ? 'was' : 'were'} deliberately not taken over: consent belongs to the person who obtained it.` });
  }

  /* Selbstprüfung und Berichtshilfe: a gewinnt, nichts wird überschrieben; eine Meldung je Liste */
  const mischePunkte = <P extends { kennung: string; stand: string; fundstelle?: string; notiz?: string }, L extends { liste: string; punkte: P[] }>(la: L[] | undefined, lb: L[] | undefined, name: (l: string) => string): L[] | undefined => {
    if (!lb?.length) return la;
    const aus: L[] = la ?? [];
    for (const bl of lb) {
      const al = aus.find(x => x.liste === bl.liste);
      if (!al) { aus.push(klon(bl)); continue; }
      let verschieden = 0;
      for (const bp of bl.punkte) {
        const ap = al.punkte.find(x => x.kennung === bp.kennung);
        if (!ap) al.punkte.push(klon(bp));
        else if (ap.stand !== bp.stand || ap.fundstelle !== bp.fundstelle || ap.notiz !== bp.notiz) verschieden++;
      }
      if (verschieden) {
        const n = name(bl.liste);
        meldungen.push({ art: 'pruefpunkt-verschieden', dokument: undefined, was: n, anzahl: verschieden, satz: d
          ? `${n}: Bei ${verschieden} Punkten stehen in den beiden Dateien verschiedene Angaben. Statable behält die Angaben der ersten Datei.`
          : `${n}: For ${verschieden} items the two files have different entries. Statable keeps the entries of the first file.` });
      }
    }
    return aus;
  };
  const sp = mischePunkte(r.selbstpruefung, b.selbstpruefung, l => l.toUpperCase());
  if (sp) r.selbstpruefung = sp;
  const bh = mischePunkte(r.berichtshilfe, b.berichtshilfe, l => l.toUpperCase());
  if (bh) r.berichtshilfe = bh;

  r.protokoll.push({ zeit: Date.now(), was: 'qdpx-zusammengefuehrt', nachher: { dokumente: r.dokumente.length, codes: r.codes.length, kodierungen: r.kodierungen.length } });
  r.version = qualFassung(r);
  return { projekt: r, meldungen, codeZuordnung };
}
