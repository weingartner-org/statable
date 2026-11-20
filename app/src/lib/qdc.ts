/**
 * REFI-QDA-Codebuch (.qdc, Schema QDA-XML 1.0) schreiben und lesen (Paket 4E, Fachblatt Stufe 4, Entscheide 4E).
 * Reine Funktionen ohne Oberfläche. Gelesen wird nur mit `globalThis.DOMParser` (Browser; in Tests @xmldom/xmldom).
 * Dateien mit DOCTYPE werden abgelehnt (keine Entities), Größe höchstens 5 MB.
 */
import type { Code } from './qualprojekt';

export type QdcFehlerCode = 'doctype' | 'zugross' | 'kaputt' | 'wurzel' | 'leer';

/** Eine abgelehnte Datei; `code` sagt, warum. Die Oberfläche macht daraus einen eigenen Satz. */
export class QdcFehler extends Error {
  readonly code: QdcFehlerCode;
  constructor(code: QdcFehlerCode, sprache: 'de' | 'en' = 'de') {
    const d = sprache === 'de';
    const texte: Record<QdcFehlerCode, string> = {
      doctype: d ? 'Die Datei enthält eine DOCTYPE-Angabe. Aus Sicherheitsgründen liest Statable solche Dateien nicht.' : 'The file contains a DOCTYPE declaration. For security reasons Statable does not read such files.',
      zugross: d ? 'Die Datei ist größer als 5 MB.' : 'The file is larger than 5 MB.',
      kaputt: d ? 'Die Datei ist kein lesbares XML.' : 'The file is not readable XML.',
      wurzel: d ? 'Die Datei ist kein Codebuch (Wurzelelement CodeBook fehlt).' : 'The file is not a codebook (root element CodeBook is missing).',
      leer: d ? 'Die Datei ist leer.' : 'The file is empty.'
    };
    super(texte[code]);
    this.name = 'QdcFehler';
    this.code = code;
  }
}

export interface QdcMeldung { art: 'sets' | 'guid' | 'name' | 'farbe'; satz: string }
export interface QdcErgebnis { codes: Code[]; meldungen: QdcMeldung[] }

export const QDC_MAX_BYTES = 5 * 1024 * 1024;
const NS = 'urn:QDA-XML:codebook:1.0';
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ETIKETT = {
  de: { anker: 'Ankerbeispiel', regel: 'Kodierregel' },
  en: { anker: 'Anchor example', regel: 'Coding rule' }
} as const;

/* ------------------------------------------------------------------ gemeinsam */
const klein = (id: string): string => id.trim().replace(/^\{|\}$/g, '').toLowerCase();

function neueGuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID().toLowerCase();
  const h = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${h(8)}-${h(4)}-4${h(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${h(3)}-${h(12)}`;
}

/** '#rgb' oder '#rrggbb' (beliebige Schreibweise) → '#rrggbb' klein; sonst undefined. */
export function farbeNormal(f: string | null | undefined): string | undefined {
  const t = (f ?? '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(t)) return t;
  if (/^#[0-9a-f]{3}$/.test(t)) return '#' + [...t.slice(1)].map(z => z + z).join('');
  return undefined;
}

/* ------------------------------------------------------------------ schreiben */
// eslint-disable-next-line no-control-regex
const XML_UNGUELTIG = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f￾￿]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;
const sauber = (t: string): string => String(t ?? '').replace(XML_UNGUELTIG, '');
const maskText = (t: string): string => sauber(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const maskAttr = (t: string): string => maskText(t).replace(/"/g, '&quot;').replace(/[\t\r\n]+/g, ' ');
const eineZeile = (t: string): string => sauber(t).replace(/[\r\n]+/g, ' ').trim();

/** Beschreibung wie im Fachblatt: Definition, Leerzeile, Ankerbeispiele (je eine Zeile), Leerzeile, Kodierregel. */
function beschreibung(k: Code, sprache: 'de' | 'en'): string {
  const e = ETIKETT[sprache];
  const teile: string[] = [];
  const def = sauber(k.definition ?? '').replace(/\r\n?/g, '\n').trim();
  if (def) teile.push(def);
  const anker = (k.anker ?? []).map(a => eineZeile(a.text)).filter(Boolean).map(t => `${e.anker}: ${t}`);
  if (anker.length) teile.push(anker.join('\n'));
  const regel = sauber(k.regel ?? '').replace(/\r\n?/g, '\n').trim();
  if (regel) teile.push(`${e.regel}: ${regel}`);
  return teile.join('\n\n');
}

export function schreibeQdc(codes: Code[], sprache: 'de' | 'en'): string {
  if (!codes.length) throw new QdcFehler('leer', sprache);
  const sp = sprache === 'en' ? 'en' : 'de';
  // Datei-GUIDs: vorhandene GUID-Form klein; sonst neu (nur in der Datei); doppelte ebenfalls neu
  const guidVon = new Map<string, string>(), benutzt = new Set<string>();
  for (const k of codes) {
    let g = klein(k.id);
    if (!GUID.test(g) || benutzt.has(g)) g = neueGuid();
    benutzt.add(g); guidVon.set(k.id, g);
  }
  const ids = new Set(codes.map(k => k.id));
  const kinder = new Map<string, Code[]>();
  const wurzeln: Code[] = [];
  for (const k of codes) {
    if (k.elternId && ids.has(k.elternId) && k.elternId !== k.id) (kinder.get(k.elternId) ?? kinder.set(k.elternId, []).get(k.elternId)!).push(k);
    else wurzeln.push(k);
  }
  const ord = (a: Code, b: Code) => a.reihenfolge - b.reihenfolge;
  wurzeln.sort(ord); for (const l of kinder.values()) l.sort(ord);
  const gesehen = new Set<string>();
  const o: string[] = [];
  const schreibe = (k: Code, tiefe: number) => {
    gesehen.add(k.id);
    const f = farbeNormal(k.farbe);
    const attr = `guid="${guidVon.get(k.id)}" name="${maskAttr(k.name)}" isCodable="${k.kodierbar === false ? 'false' : 'true'}"${f ? ` color="${f}"` : ''}`;
    const einr = '  '.repeat(tiefe);
    const b = beschreibung(k, sp);
    const kin = (kinder.get(k.id) ?? []).filter(x => !gesehen.has(x.id));
    if (!b && !kin.length) { o.push(`${einr}<Code ${attr}/>`); return; }
    o.push(`${einr}<Code ${attr}>`);
    if (b) o.push(`${einr}  <Description>${maskText(b)}</Description>`);
    for (const x of kin) if (!gesehen.has(x.id)) schreibe(x, tiefe + 1);
    o.push(`${einr}</Code>`);
  };
  for (const w of wurzeln) schreibe(w, 2);
  // Ringe (A ist Kind von B und umgekehrt): nicht erreichte Codes als Wurzeln, damit nichts verloren geht
  for (const k of codes) if (!gesehen.has(k.id)) schreibe(k, 2);
  return `<?xml version="1.0" encoding="utf-8"?>\n<CodeBook xmlns="${NS}" origin="Statable">\n  <Codes>\n${o.join('\n')}\n  </Codes>\n</CodeBook>\n`;
}

/* ------------------------------------------------------------------ lesen */
function zerlegeBeschreibung(text: string): { definition?: string; anker: { text: string }[]; regel?: string } {
  const zeilen = text.replace(/\r\n?/g, '\n').split('\n');
  const reAnker = /^(?:Ankerbeispiel|Anchor example):[ \t]?(.*)$/, reRegel = /^(?:Kodierregel|Coding rule):[ \t]?(.*)$/;
  const def: string[] = [], regel: string[] = [], anker: string[] = [];
  let teil: 'def' | 'anker' | 'regel' = 'def', ersteAnker = false;
  zeilen.forEach((z, i) => {
    const vorLeer = i === 0 || zeilen[i - 1] === '';
    const folgtAnker = i > 0 && teil === 'anker' && reAnker.test(zeilen[i - 1]!);
    const a = reAnker.exec(z), r = reRegel.exec(z);
    if (a && (vorLeer || folgtAnker)) { teil = 'anker'; ersteAnker = true; anker.push(a[1]!.trim()); return; }
    if (r && vorLeer) { teil = 'regel'; regel.push(r[1]!); return; }
    if (teil === 'def') def.push(z);
    else if (teil === 'regel') regel.push(z);
    else if (z.trim() && ersteAnker && anker.length) anker[anker.length - 1] = (anker[anker.length - 1] + ' ' + z.trim()).trim();
  });
  const definition = def.join('\n').trim();
  const reg = regel.join('\n').trim();
  return { definition: definition || undefined, anker: anker.filter(Boolean).map(t => ({ text: t })), regel: reg || undefined };
}

type Knoten = { nodeType: number; localName?: string | null; nodeName: string; childNodes: ArrayLike<Knoten>; textContent: string | null; getAttribute?: (n: string) => string | null };
const kinderVon = (k: Knoten, name: string): Knoten[] => Array.from(k.childNodes).filter(c => c.nodeType === 1 && (c.localName ?? c.nodeName) === name);

export function leseQdc(text: string, sprache: 'de' | 'en'): QdcErgebnis {
  const sp = sprache === 'en' ? 'en' : 'de';
  const d = sp === 'de';
  const t = String(text ?? '').replace(/^﻿/, '');
  if (t.length > QDC_MAX_BYTES || (t.length > QDC_MAX_BYTES / 3 && new TextEncoder().encode(t).length > QDC_MAX_BYTES)) throw new QdcFehler('zugross', sp);
  if (!t.trim()) throw new QdcFehler('leer', sp);
  if (/<!DOCTYPE/i.test(t)) throw new QdcFehler('doctype', sp);
  const Parser = (globalThis as { DOMParser?: new () => { parseFromString(s: string, typ: string): unknown } }).DOMParser;
  if (!Parser) throw new QdcFehler('kaputt', sp);
  let wurzel: Knoten | null;
  try {
    const dok = new Parser().parseFromString(t, 'text/xml') as { documentElement: Knoten | null; getElementsByTagName?: (n: string) => ArrayLike<unknown> };
    if (dok.getElementsByTagName?.('parsererror')?.length) throw new Error('parsererror');
    wurzel = dok.documentElement;
  } catch { throw new QdcFehler('kaputt', sp); }
  if (!wurzel) throw new QdcFehler('kaputt', sp);
  if ((wurzel.localName ?? wurzel.nodeName) !== 'CodeBook') throw new QdcFehler('wurzel', sp);

  const meldungen: QdcMeldung[] = [];
  const codes: Code[] = [];
  const benutzt = new Set<string>();
  let neueIds = 0, ohneName = 0, schlechteFarbe = 0;

  const lies = (el: Knoten, eltern: string | undefined, platz: number) => {
    let id = klein(el.getAttribute?.('guid') ?? '');
    if (!GUID.test(id) || benutzt.has(id)) { id = neueGuid(); neueIds++; }
    benutzt.add(id);
    let name = (el.getAttribute?.('name') ?? '').trim();
    if (!name) { name = d ? '(ohne Namen)' : '(no name)'; ohneName++; }
    const roh = el.getAttribute?.('color');
    const farbe = farbeNormal(roh);
    if (roh && !farbe) schlechteFarbe++;
    const beschr = kinderVon(el, 'Description')[0]?.textContent ?? '';
    const z = zerlegeBeschreibung(beschr);
    const k: Code = { id, name, kodierbar: (el.getAttribute?.('isCodable') ?? 'true').trim().toLowerCase() !== 'false', reihenfolge: platz };
    if (eltern) k.elternId = eltern;
    if (farbe) k.farbe = farbe;
    if (z.definition) k.definition = z.definition;
    if (z.anker.length) k.anker = z.anker;
    if (z.regel) k.regel = z.regel;
    codes.push(k);
    kinderVon(el, 'Code').forEach((c, i) => lies(c, id, i));
  };
  const behaelter = kinderVon(wurzel, 'Codes')[0];
  if (behaelter) kinderVon(behaelter, 'Code').forEach((c, i) => lies(c, undefined, i));

  const mengen = kinderVon(wurzel, 'Sets').flatMap(s => kinderVon(s, 'Set')).length;
  if (kinderVon(wurzel, 'Sets').length) {
    meldungen.push({ art: 'sets', satz: d
      ? `Die Datei enthält ${mengen === 1 ? 'eine Menge (Set)' : `${mengen} Mengen (Sets)`}. Mengen werden nicht übernommen; die Codes sind da.`
      : `The file contains ${mengen === 1 ? 'one set' : `${mengen} sets`}. Sets are not imported; the codes are.` });
  }
  if (neueIds) meldungen.push({ art: 'guid', satz: d
    ? `${neueIds} ${neueIds === 1 ? 'Code hatte' : 'Codes hatten'} keine gültige Kennung (GUID) und ${neueIds === 1 ? 'hat' : 'haben'} eine neue bekommen.`
    : `${neueIds} ${neueIds === 1 ? 'code had' : 'codes had'} no valid identifier (GUID) and got a new one.` });
  if (ohneName) meldungen.push({ art: 'name', satz: d ? `${ohneName} Code ohne Namen wurde mit „(ohne Namen)“ übernommen.` : `${ohneName} code without a name was imported as "(no name)".` });
  if (schlechteFarbe) meldungen.push({ art: 'farbe', satz: d ? `${schlechteFarbe} Farbangabe war nicht lesbar und wurde weggelassen.` : `${schlechteFarbe} colour value was not readable and was left out.` });
  return { codes, meldungen };
}
