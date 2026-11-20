/**
 * Fragebogen-Plan (Paket 1C, erste Fassung): das Modell nach docs/erheben/ARCHITEKTUR-FRAGEBOGEN-PLAN.md, XLSForm lesen, Variablen aus dem Plan, Zuordnung der Spaltenköpfe
 * von KoboToolbox und ODK zu den Variablen des Plans, Kodebuch aus Plan und Zuordnung.
 *
 * XLSForm wird NACH DER XLSFORM-DOKUMENTATION gelesen und mit pyxform gegengeprüft (testdaten/dienste/xlsform/LIESMICH.md); die Zuordnung der Kobo- und ODK-Köpfe ist
 * nach Dokumentation und Forumsberichten gebaut, NICHT AN ECHTEN EXPORTEN GEPRÜFT.
 *
 * GRUNDSATZ: Nichts wird still geraten oder verändert. Was übersprungen, nicht verstanden oder umgerechnet wird, steht als Meldung da. Text aus Dateien gelangt nie in einen Befehl
 * (der Plan ist nur Daten; die Befehle entstehen in fragebogenimport.svelte.ts über `zit`).
 */
import type { Kodebuch, KodebuchSpalte } from './kodebuch';
import type { Tabelle, Zelle } from './einlesen';
import { L } from './sitzung.svelte';
import { zit } from './befehlstext';

/* ------------------------------------------------------------------ Typen (wörtlich nach dem Architekturblatt) */
export type Lok = Record<string, string>;
export type Bedingung =
  | { und: Bedingung[] } | { oder: Bedingung[] } | { nicht: Bedingung }
  | { frage: string; ist: '=' | '≠' | '<' | '≤' | '>' | '≥'; wert: number }
  | { frage: string; gewaehlt: number }
  | { frage: string; beantwortet: boolean };
export interface Bild { datei: string; alt: Lok }
export interface Option { id: string; wert: number; text: Lok; fehlend?: 'weissNicht' | 'keineAngabe' | 'trifftNichtZu'; ausschliessend?: boolean; bild?: Bild }
export interface Antwortliste { id: string; name: string; geordnet: boolean; optionen: Option[] }
export type FrageTyp = 'einfach' | 'mehrfach' | 'zahl' | 'text' | 'datum' | 'regler' | 'rangfolge' | 'einwilligung';
export interface Frage {
  art: 'frage'; id: string; name: string; typ: FrageTyp; text: Lok; hilfe?: Lok; kurz?: Lok;
  pflicht?: { an: true; meldung?: Lok }; wennGezeigt?: Bedingung; gueltig?: { regel: Bedingung; meldung: Lok };
  liste?: string; anders?: { an: true; text: Lok }; zufall?: boolean;
  zahl?: { min?: number; max?: number; schritt?: number; ganz: boolean; einheit?: Lok };
  text_?: { mehrzeilig: boolean; maxZeichen?: number }; bild?: Bild;
  kodebuch: { niveau: 'nominal' | 'ordinal' | 'skala'; umgepolt?: boolean };
  /** Nachtrag 08.11.: Pfad der XLSForm-Gruppen (`aussen/innen`), flach gemacht; Kobo und ODK schreiben ihn in die Spaltenköpfe. */
  gruppe?: string;
}
export interface Block {
  art: 'block'; id: string; name: string; text: Lok; hilfe?: Lok; liste: string;
  items: { id: string; name: string; text: Lok; umgepolt?: boolean; kurz?: Lok }[];
  pflicht?: { an: true; meldung?: Lok }; wennGezeigt?: Bedingung; zufall?: boolean; kodebuch: { niveau: 'ordinal' | 'skala' };
}
export interface Hinweis { art: 'hinweis'; id: string; name: string; text: Lok; wennGezeigt?: Bedingung; bild?: Bild }
export type Element = Frage | Block | Hinweis;
export interface Seite { art: 'seite'; id: string; name: string; titel?: Lok; wennGezeigt?: Bedingung; elemente: Element[] }
export interface Skala { id: string; name: string; items: string[]; bildung: 'mittelwert' | 'summe'; mindestens: number }
export interface FragebogenPlan {
  format: 'statable-fragebogen'; version: 1; id: string; revision: number; titel: Lok; sprachen: string[];
  einleitung?: Lok; einwilligung?: { text: Lok; pflicht: boolean }; abschluss?: Lok;
  einstellungen: { fortschritt: boolean; zurueck: boolean; pretest: boolean; fehlendFilter: 'code' | 'leer' };
  antwortlisten: Antwortliste[]; skalen: Skala[]; elemente: Seite[];
  herkunft?: { art: 'neu' | 'xlsform' | 'limesurvey' | 'import'; datei?: string; zeit: number; codes?: Record<string, Record<string, number>> };
  exportNamen?: { limesurvey?: Record<string, string> };
  /** Paket 2D: je Element-id die Kennungen der Qualitätsregeln, die als „geprüft, passt so“ abgehakt sind (Fehler aus planPruefen lassen sich nicht abhaken). */
  geprueft?: Record<string, string[]>;
  /** Stufe 3A: öffentlicher age-Schlüssel der forschenden Person (`age1…`), an den Antworten verschlüsselt werden. Der private Schlüssel gehört nie in den Plan. */
  empfaenger?: { schluessel: string; name: string };
  /** Paket 3D: Der Fragebogen verlangt einen Einmal-Code (Teilnahme-Code). Steht auch in der Fragebogen-Datei. */
  codeVerlangt?: boolean;
  /** Paket 3D: Liste der Einmal-Codes. Bleibt im Projekt; steht NICHT in der Fragebogen-Datei (sonst könnte jemand gültige Codes ablesen). */
  codes?: { code: string; ausgegeben?: boolean }[];
  geaendert: number;
}
export interface PlanVariable extends KodebuchSpalte {
  name: string;
  quelle: { element: string; option?: string; item?: string; teil?: 'anders' | 'kommentar' };
  typ: 'zahl' | 'text' | 'datum';
}

export type PlanMeldung =
  | { art: 'uebersprungen'; name: string; typ: string; satz: string }
  | { art: 'filterIgnoriert'; name: string; satz: string }
  | { art: 'relevant'; name: string; text: string; satz: string }
  | { art: 'uebersetzungFehlt'; name: string; sprache: string; satz: string }
  | { art: 'labelOhneSprache'; satz: string }
  | { art: 'codeAbbildung'; liste: string; abbildung: [string, number][]; satz: string }
  | { art: 'namenGeaendert'; von: string; nach: string; satz: string };

export interface SpaltenZuordnung { kopf: string; frage: string; art: 'antwort' | 'sammelspalte' | 'optionsspalte' | 'anders'; option?: string; variable: string | null }

/* ------------------------------------------------------------------ Hilfen */
const ZEILE = (z: Zelle | undefined): string => (z === null || z === undefined || z instanceof Date ? '' : String(z).trim());
const flach = (plan: FragebogenPlan): Element[] => plan.elemente.flatMap(s => s.elemente);
const txt = (l: Lok | undefined, sprache: string): string => (l ? l[sprache] ?? Object.values(l).find(x => x) ?? '' : '');
const kuerze = (t: string, n = 120) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
const SCHLUESSEL = /^(ALL|AND|BY|EQ|GE|GT|LE|LT|NE|NOT|OR|TO|WITH)$/i;
/** Gültig in allen Zielen (Architekturblatt 5.2). */
export const planNameOk = (n: string) => /^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(n) && !SCHLUESSEL.test(n);
const uuid = (): string => {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16)); b[6] = (b[6]! & 0x0f) | 0x40; b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
const optionName = (liste: string, o: Option) => o.id.startsWith(liste + ':') ? o.id.slice(liste.length + 1) : o.id;

/* ------------------------------------------------------------------ XLSForm lesen */
type Blatt = Zelle[][];
/** Die Blätter der Mappe (Name klein geschrieben) und ihre Dokumenteigenschaften (`Comments` trägt beim Statable-Export die Titel aller Sprachen). */
const eigenschaftenVon = new WeakMap<Map<string, Blatt>, Record<string, unknown>>();
async function liesMappe(bytes: ArrayBuffer | Uint8Array): Promise<Map<string, Blatt> | null> {
  try {
    const XLSX = await import('xlsx');
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const mappe = XLSX.read(u8, { type: 'array', cellDates: true });
    const aus = new Map<string, Blatt>();
    for (const n of mappe.SheetNames) aus.set(n.trim().toLowerCase(), XLSX.utils.sheet_to_json<Zelle[]>(mappe.Sheets[n]!, { header: 1, raw: true, defval: null, blankrows: false }));
    eigenschaftenVon.set(aus, { ...(mappe.Props ?? {}) });
    return aus;
  } catch { return null; }
}
const kopfVon = (b: Blatt | undefined): string[] => (b?.[0] ?? []).map(c => ZEILE(c));
const hatSpalten = (kopf: string[]) => kopf.some(k => k.toLowerCase() === 'type') && kopf.some(k => k.toLowerCase() === 'name') && kopf.some(k => /^label(::|$)/i.test(k));

/** Eine XLSForm: Blatt `survey` mit den Spalten `type`, `name` und mindestens einer Spalte `label…`. Wirft nie. */
export async function istXlsform(bytes: ArrayBuffer | Uint8Array): Promise<boolean> {
  try { const m = await liesMappe(bytes); return !!m && hatSpalten(kopfVon(m.get('survey'))); } catch { return false; }
}

interface Sprache { code: string; name: string }
const sprachVon = (suffix: string): Sprache => { const s = suffix.trim(); const m = /\(([^()]+)\)\s*$/.exec(s); return { code: m ? m[1]!.trim() : s, name: s }; };
const UNTERSTUETZT = new Set(['select_one', 'select_multiple', 'integer', 'decimal', 'text', 'date', 'range', 'rank', 'acknowledge', 'note']);
const OHNE_NAME_OK = new Set(['note']);
const TYP_ALIAS: Record<string, string> = { string: 'text', int: 'integer', trigger: 'acknowledge' };
/** Typ-Zelle der XLSForm in die Schreibweise von pyxform bringen: `begin group`, `select one from liste`, `select all that apply from liste`, `string`, `int`, `trigger` (alte Namen, die pyxform kennt). */
function normalisiereTyp(roh: string): { erst: string; args: string[] } {
  const t = roh.trim().replace(/^(begin|end)\s+/i, (_, a: string) => `${a.toLowerCase()}_`);
  const sel = /^(select[_ ]one|select1|select[_ ]multiple|select[_ ]all[_ ]that[_ ]apply)(?:\s+from)?\s+(\S[\s\S]*)$/i.exec(t);
  if (sel) return { erst: /multiple|all/i.test(sel[1]!) ? 'select_multiple' : 'select_one', args: sel[2]!.trim().split(/\s+/) };
  const [e, ...args] = t.split(/\s+/);
  const k = (e ?? '').toLowerCase();
  return { erst: TYP_ALIAS[k] ?? k, args };
}

/** Ein Blatt als Zeilen mit Zugriff auf Spalten (Kopf klein geschrieben) und auf Beschriftungen je Sprache. */
function tabelleVon(blatt: Blatt, praefix: string) {
  const kopf = kopfVon(blatt);
  const zeilen = blatt.slice(1).filter(r => r.some(c => ZEILE(c) !== ''));
  const idx = (n: string) => kopf.findIndex(k => k.toLowerCase().replace(/\s+/g, '_') === n);
  const spr: { sprache: Sprache; i: number }[] = [];
  kopf.forEach((k, i) => { const m = new RegExp(`^${praefix}(?:::(.*))?$`, 'i').exec(k); if (m) spr.push({ sprache: m[1] === undefined ? { code: 'default', name: 'default' } : sprachVon(m[1]), i }); });
  return { kopf, zeilen, idx, spr };
}

/* ---- Bedingungen aus der Schreibweise des Statable-Exports (XLSForm `relevant`) ---- */
const RX = {
  oder: /or\b/y, und: /and\b/y, auf: /\(/y, zu: /\)/y, nicht: /not\(/y,
  wahl: /selected\(\$\{([A-Za-z0-9_]+)\},\s*'(-?\d+)'\)/y,
  vgl: /\$\{([A-Za-z0-9_]+)\}\s*(!=|<=|>=|=|<|>)\s*(?:(-?\d+(?:\.\d+)?)|'')/y
};
/** Liest nur die Formen, die der Export schreibt (siehe `alsXlsform`): Vergleich mit Zahl, `selected`, leer/nicht leer, and, or, not( ). Alles andere: null. Nichts wird ausgeführt. */
export function bedingungAusXls(src: string): Bedingung | null {
  let p = 0;
  const lies = (re: RegExp): RegExpExecArray | null => { while (src[p] === ' ') p++; re.lastIndex = p; const m = re.exec(src); if (m) { p = re.lastIndex; return m; } return null; };
  const kette = (wort: RegExp, bau: (l: Bedingung[]) => Bedingung, weiter: () => Bedingung | null): Bedingung | null => {
    const erste = weiter(); if (!erste) return null;
    const l = [erste];
    while (lies(wort)) { const x = weiter(); if (!x) return null; l.push(x); }
    return l.length === 1 ? erste : bau(l);
  };
  const primaer = (): Bedingung | null => {
    if (lies(RX.nicht)) { const b = ausdruck(); return b && lies(RX.zu) ? { nicht: b } : null; }
    if (lies(RX.auf)) { const b = ausdruck(); return b && lies(RX.zu) ? b : null; }
    let m = lies(RX.wahl); if (m) return { frage: m[1]!, gewaehlt: Number(m[2]) };
    m = lies(RX.vgl);
    if (!m) return null;
    if (m[3] === undefined) return m[2] === '=' ? { frage: m[1]!, beantwortet: false } : m[2] === '!=' ? { frage: m[1]!, beantwortet: true } : null;
    const ist = ({ '=': '=', '!=': '≠', '<': '<', '<=': '≤', '>': '>', '>=': '≥' } as const)[m[2] as '=' | '!=' | '<' | '<=' | '>' | '>=']!;
    return { frage: m[1]!, ist, wert: Number(m[3]) };
  };
  const und = () => kette(RX.und, l => ({ und: l }), primaer);
  const ausdruck = (): Bedingung | null => kette(RX.oder, l => ({ oder: l }), und);
  const b = ausdruck();
  while (src[p] === ' ') p++;
  return b && p === src.length ? b : null;
}
/** Prüft ein aus der Datei gelesenes JSON auf die Form einer Bedingung (nur Daten; Tiefe begrenzt). */
function istBedingung(x: unknown, tiefe = 0): x is Bedingung {
  if (!x || typeof x !== 'object' || tiefe > 12) return false;
  const o = x as Record<string, unknown>;
  if ('und' in o) return Array.isArray(o.und) && o.und.length > 0 && o.und.every(y => istBedingung(y, tiefe + 1));
  if ('oder' in o) return Array.isArray(o.oder) && o.oder.length > 0 && o.oder.every(y => istBedingung(y, tiefe + 1));
  if ('nicht' in o) return istBedingung(o.nicht, tiefe + 1);
  if (typeof o.frage !== 'string') return false;
  if ('gewaehlt' in o) return typeof o.gewaehlt === 'number' && Number.isFinite(o.gewaehlt);
  if ('beantwortet' in o) return typeof o.beantwortet === 'boolean';
  return typeof o.wert === 'number' && Number.isFinite(o.wert) && ['=', '≠', '<', '≤', '>', '≥'].includes(o.ist as string);
}

/**
 * XLSForm → Plan. Wirft Error mit „keinXlsform“, wenn keine XLSForm vorliegt. Festlegungen: siehe Kopf von fragebogenplan-1c.test.ts.
 * Was Statable nicht kann, wird übersprungen und GEMELDET; fehlende Übersetzungen bleiben in `Lok` fehlende Schlüssel (kein Rückfall auf die Standardsprache).
 * Trägt `settings` die Spalte `statable_plan_id`, stammt die Datei aus dem Statable-Export (`alsXlsform`, Paket 2E): dann werden auch die `statable_*`-Spalten, das Block-Muster
 * (Gruppe `field-list` mit Kopfzeile `label`), `other` + `<name>_anders`, `relevant` als Bedingung und das Blatt `statable_skalen` gelesen (Rückweg).
 */
export async function planAusXlsform(bytes: ArrayBuffer | Uint8Array, dateiname = 'xlsform.xlsx'): Promise<{ plan: FragebogenPlan; meldungen: PlanMeldung[] }> {
  const mappe = await liesMappe(bytes);
  const survey = mappe?.get('survey');
  if (!mappe || !survey || !hatSpalten(kopfVon(survey))) throw new Error('keinXlsform');
  const eigenschaften = eigenschaftenVon.get(mappe) ?? {};
  const meldungen: PlanMeldung[] = [];
  const sv = tabelleVon(survey, 'label'), hv = tabelleVon(survey, 'hint');
  const chB = mappe.get('choices'), ch = chB ? tabelleVon(chB, 'label') : null;

  // Sprachen: in der Reihenfolge der Spalten `label…` (zuerst survey, dann zusätzliche aus choices); die Standardsprache aus settings steht vorn
  const sprachen: Sprache[] = [];
  for (const x of [...sv.spr, ...(ch?.spr ?? [])]) if (!sprachen.some(s => s.code === x.sprache.code)) sprachen.push(x.sprache);
  if (sv.spr.some(x => x.sprache.code === 'default' && x.sprache.name === 'default') || ch?.spr.some(x => x.sprache.code === 'default' && x.sprache.name === 'default')) {
    meldungen.push({ art: 'labelOhneSprache', satz: L('Die Beschriftungen stehen teils in einer Spalte „label“ ohne Sprache. Statable nennt diese Sprache „default“, so wie pyxform es auch tut.', 'The labels are partly in a column "label" without a language. Statable calls this language "default", as pyxform does.') });
  }
  const settingsB = mappe.get('settings'); const st = settingsB ? tabelleVon(settingsB, 'label') : null;
  const setting = (n: string) => { if (!st) return ''; const i = st.idx(n); const z = st.zeilen[0]; return i >= 0 && z ? ZEILE(z[i]) : ''; };
  const statable = !!st && st.idx('statable_plan_id') >= 0 && setting('statable_plan_id') !== '';
  const standard = setting('default_language').toLowerCase();
  if (standard) { const i = sprachen.findIndex(s => s.name.toLowerCase() === standard || s.code.toLowerCase() === standard); if (i > 0) sprachen.unshift(sprachen.splice(i, 1)[0]!); }
  const codes = sprachen.map(s => s.code);
  const titelText = setting('form_title') || dateiname.replace(/\.[^.]*$/, '');
  let titel: Lok = Object.fromEntries(codes.map(c => [c, titelText]));
  if (statable && typeof eigenschaften.Comments === 'string') {
    // Der Export legt die Titel aller Sprachen in die Dokumenteigenschaft „Kommentare“ (settings kennt nur einen Titel)
    try {
      const j = JSON.parse(eigenschaften.Comments) as { statable?: number; titel?: Record<string, unknown> };
      const jt = j?.titel;
      if (j?.statable === 1 && jt && typeof jt === 'object') titel = Object.fromEntries(codes.map(c => [c, typeof jt[c] === 'string' && jt[c] !== '' ? (jt[c] as string) : titelText]));
    } catch { /* kein JSON: der eine Titel gilt für alle Sprachen */ }
  }

  const lokVon = (z: Zelle[], spalten: { sprache: Sprache; i: number }[], fehlt?: (sprache: string) => void): Lok => {
    const l: Lok = {};
    for (const c of codes) { const sp = spalten.find(x => x.sprache.code === c); const t = sp ? ZEILE(z[sp.i]) : ''; if (t) l[c] = t; else fehlt?.(c); }
    return l;
  };
  const hatText = (l: Lok) => Object.keys(l).length > 0;
  const wert = (z: Zelle[], v: { idx: (n: string) => number }, n: string) => { const i = v.idx(n); return i >= 0 ? ZEILE(z[i]) : ''; };
  const zusatz = statable ? { alt: tabelleVon(survey, 'statable_alt'), bild: tabelleVon(survey, 'image'), einheit: tabelleVon(survey, 'statable_einheit'), kurz: tabelleVon(survey, 'statable_kurz'), pflichtMeldung: tabelleVon(survey, 'required_message') } : null;
  const NIVEAUS = ['nominal', 'ordinal', 'skala'] as const;
  const niveauVon = (z: Zelle[]) => { const n = wert(z, sv, 'statable_niveau'); return (NIVEAUS as readonly string[]).includes(n) ? (n as (typeof NIVEAUS)[number]) : null; };
  const ja = (t: string) => /^(yes|true|ja)$/i.test(t);

  /* ---- survey durchgehen ---- */
  const seiten: Seite[] = [];
  let auto: Seite | null = null;
  const gruppen: string[] = [];
  let ueberspringTiefe = 0;
  const benutzteListen = new Map<string, { orOther: boolean }>();
  const skalaItems = new Map<string, string[]>();
  const skalaMerken = (z: Zelle[], id: string) => { if (!statable) return; for (const n of wert(z, sv, 'statable_skala').split(',').map(x => x.trim()).filter(Boolean)) skalaItems.set(n, [...(skalaItems.get(n) ?? []), id]); };
  const anderesText: Lok = Object.fromEntries(codes.map(c => [c, /^de/i.test(c) ? 'Anderes, und zwar:' : 'Other, please specify:']));
  const uebersprungen = (name: string, typ: string) => meldungen.push({ art: 'uebersprungen', name, typ, satz: L(`„${name}“ (Typ ${typ}) kann Statable nicht lesen und überspringt es.`, `Statable cannot read "${name}" (type ${typ}) and skips it.`) });
  const seiteFuer = (): Seite => {
    if (gruppen.length) return seiten[seiten.length - 1]!;
    if (!auto) { const n = seiten.length + 1; auto = { art: 'seite', id: `seite:seite${n}`, name: `seite${n}`, elemente: [] }; seiten.push(auto); }
    return auto;
  };
  const relevantMelden = (name: string, text: string) => meldungen.push({ art: 'relevant', name, text, satz: L(`Für „${name}“ gilt die Bedingung „${text}“. Statable zeigt sie nur an; als Bedingung auswerten kann es sie noch nicht.`, `For "${name}" the condition "${text}" applies. Statable only shows it; it cannot evaluate it as a condition yet.`) });
  /** Statable-Export: die Bedingung als Baum, sonst (und bei fremden Dateien) nur die Meldung. */
  const bedingungSetzen = (ziel: { wennGezeigt?: Bedingung }, name: string, rel: string) => {
    if (!rel) return;
    const b = statable ? bedingungAusXls(rel) : null;
    if (b) ziel.wennGezeigt = b; else relevantMelden(name, rel);
  };
  let letzte: Frage | null = null;

  for (let zi = 0; zi < sv.zeilen.length; zi++) {
    const z = sv.zeilen[zi]!;
    const typRoh = wert(z, sv, 'type'); if (!typRoh) continue;
    const { erst, args } = normalisiereTyp(typRoh);
    const name = wert(z, sv, 'name');
    if (ueberspringTiefe > 0) {
      if (erst.startsWith('begin_')) ueberspringTiefe++; else if (erst.startsWith('end_')) ueberspringTiefe--;
      continue;
    }
    if (erst === 'begin_group') {
      const gname = name || `gruppe${seiten.length + 1}`;
      // Block-Muster des Statable-Exports: Gruppe `field-list`, erste Zeile eine Frage mit Aussehen `label`, danach die Items
      const kopfZeile = sv.zeilen[zi + 1];
      if (statable && zusatz && gruppen.length && /(^|\s)field-list(\s|$)/.test(wert(z, sv, 'appearance')) && kopfZeile && normalisiereTyp(wert(kopfZeile, sv, 'type')).erst === 'select_one' && wert(kopfZeile, sv, 'appearance') === 'label') {
        const fehltB = (c: string) => meldungen.push({ art: 'uebersetzungFehlt', name: gname, sprache: c, satz: L(`Für „${gname}“ fehlt der Text in der Sprache ${c}. Statable setzt keinen anderen Text ein.`, `For "${gname}" the text in the language ${c} is missing. Statable does not substitute another text.`) });
        const liste = normalisiereTyp(wert(kopfZeile, sv, 'type')).args[0] ?? '';
        const blk: Block = { art: 'block', id: gname, name: gname, text: lokVon(z, sv.spr, fehltB), liste, items: [], kodebuch: { niveau: niveauVon(z) === 'skala' ? 'skala' : 'ordinal' } };
        const hilfeB = lokVon(z, hv.spr); if (hatText(hilfeB)) blk.hilfe = hilfeB;
        bedingungSetzen(blk, gname, wert(z, sv, 'relevant'));
        if (ja(wert(z, sv, 'statable_zufall'))) blk.zufall = true;
        let pflicht = false;
        zi += 2;
        for (; zi < sv.zeilen.length; zi++) {
          const r = sv.zeilen[zi]!;
          const e2 = normalisiereTyp(wert(r, sv, 'type')).erst;
          if (e2 === 'end_group') break;
          if (e2 !== 'select_one') continue;
          const rn = wert(r, sv, 'name');
          const iname = rn.startsWith(`${gname}_`) ? rn.slice(gname.length + 1) : rn;
          const item: Block['items'][number] = { id: iname, name: iname, text: lokVon(r, sv.spr, c => meldungen.push({ art: 'uebersetzungFehlt', name: rn, sprache: c, satz: L(`Für „${rn}“ fehlt der Text in der Sprache ${c}. Statable setzt keinen anderen Text ein.`, `For "${rn}" the text in the language ${c} is missing. Statable does not substitute another text.`) })) };
          if (ja(wert(r, sv, 'statable_umgepolt'))) item.umgepolt = true;
          const kurz = lokVon(r, zusatz.kurz.spr); if (hatText(kurz)) item.kurz = kurz;
          if (ja(wert(r, sv, 'required'))) pflicht = true;
          skalaMerken(r, iname);
          blk.items.push(item);
        }
        if (pflicht) blk.pflicht = { an: true };
        seiteFuer().elemente.push(blk);
        benutzteListen.set(liste, { orOther: benutzteListen.get(liste)?.orOther ?? false });
        letzte = null;
        continue;
      }
      const rel = wert(z, sv, 'relevant');
      if (!gruppen.length) {
        auto = null;
        const l = lokVon(z, sv.spr);
        const seite: Seite = { art: 'seite', id: `seite:${gname}`, name: gname, ...(hatText(l) ? { titel: l } : {}), elemente: [] };
        bedingungSetzen(seite, gname, rel);
        seiten.push(seite);
      } else if (rel) relevantMelden(gname, rel);
      gruppen.push(gname); letzte = null; continue;
    }
    if (erst === 'end_group') { gruppen.pop(); letzte = null; continue; }
    if (erst.startsWith('begin_')) { uebersprungen(name || erst, erst); ueberspringTiefe = 1; continue; }
    if (erst.startsWith('end_')) continue;
    if (!UNTERSTUETZT.has(erst) || (!name && !OHNE_NAME_OK.has(erst))) { uebersprungen(name || typRoh, erst); continue; }

    const fehlt = (c: string) => meldungen.push({ art: 'uebersetzungFehlt', name, sprache: c, satz: L(`Für „${name}“ fehlt der Text in der Sprache ${c}. Statable setzt keinen anderen Text ein.`, `For "${name}" the text in the language ${c} is missing. Statable does not substitute another text.`) });
    const text = lokVon(z, sv.spr, fehlt);
    const rel = wert(z, sv, 'relevant');
    // Statable-Export: die Textfrage `<name>_anders` gehört zur Option „Anderes“ der Frage davor
    if (statable && erst === 'text' && letzte && (letzte.typ === 'einfach' || letzte.typ === 'mehrfach') && name === `${letzte.name}_anders` && rel === `selected(\${${letzte.name}}, 'other')`) {
      letzte.anders = { an: true, text };
      benutzteListen.set(letzte.liste!, { orOther: true });
      letzte = null; continue;
    }
    if (wert(z, sv, 'choice_filter')) meldungen.push({ art: 'filterIgnoriert', name, satz: L(`Bei „${name}“ ist ein Filter für die Antworten eingetragen (choice_filter). Statable ignoriert ihn; alle Antworten der Liste bleiben.`, `"${name}" has a filter on the answers (choice_filter). Statable ignores it; all answers of the list stay.`) });
    const seite = seiteFuer();
    if (erst === 'note') {
      const h: Hinweis = { art: 'hinweis', id: name || `hinweis${seite.elemente.length + 1}`, name: name || `hinweis${seite.elemente.length + 1}`, text };
      bedingungSetzen(h, h.name, rel);
      if (zusatz) {
        const d = Object.values(lokVon(z, zusatz.bild.spr))[0];
        if (d) h.bild = { datei: d, alt: lokVon(z, zusatz.alt.spr) };
      }
      seite.elemente.push(h); letzte = null; continue;
    }

    const f: Frage = { art: 'frage', id: name, name, typ: 'text', text, kodebuch: { niveau: 'nominal' } };
    bedingungSetzen(f, name, rel);
    const hilfe = lokVon(z, hv.spr);
    if (hatText(hilfe)) f.hilfe = hilfe;
    if (/^(yes|true|true\(\)|ja)$/i.test(wert(z, sv, 'required'))) f.pflicht = { an: true };
    if (gruppen.length) f.gruppe = gruppen.join('/');
    if (erst === 'select_one' || erst === 'select_multiple' || erst === 'rank') {
      const liste = args[0] ?? '';
      if (!liste) { uebersprungen(name, erst); continue; }
      const orOther = args.slice(1).includes('or_other') || /\bor specify other\b/i.test(args.join(' '));
      f.typ = erst === 'select_one' ? 'einfach' : erst === 'select_multiple' ? 'mehrfach' : 'rangfolge';
      f.liste = liste; f.kodebuch = { niveau: erst === 'rank' ? 'ordinal' : 'nominal' };
      if (orOther && erst !== 'rank') f.anders = { an: true, text: anderesText };
      const alt = benutzteListen.get(liste); benutzteListen.set(liste, { orOther: (alt?.orOther ?? false) || (orOther && erst !== 'rank') });
      if (statable && /randomize\s*=\s*true/i.test(wert(z, sv, 'parameters'))) f.zufall = true;
    } else if (erst === 'integer' || erst === 'decimal') { f.typ = 'zahl'; f.zahl = { ganz: erst === 'integer' }; f.kodebuch = { niveau: 'skala' }; }
    else if (erst === 'text') { f.typ = 'text'; f.text_ = { mehrzeilig: statable && /(^|\s)multiline(\s|$)/.test(wert(z, sv, 'appearance')) }; }
    else if (erst === 'date') { f.typ = 'datum'; f.kodebuch = { niveau: 'skala' }; }
    else if (erst === 'range') {
      f.typ = 'regler'; f.kodebuch = { niveau: 'skala' };
      const p: Record<string, number> = { start: 0, end: 10, step: 1 };
      for (const m of wert(z, sv, 'parameters').matchAll(/(\w+)\s*=\s*(-?\d+(?:\.\d+)?)/g)) p[m[1]!.toLowerCase()] = Number(m[2]);
      f.zahl = { min: p.start, max: p.end, schritt: p.step, ganz: Number.isInteger(p.start) && Number.isInteger(p.end) && Number.isInteger(p.step) };
    }
    else if (erst === 'acknowledge') { f.typ = 'einwilligung'; f.kodebuch = { niveau: 'nominal' }; }
    if (zusatz) {
      const n = niveauVon(z); if (n) f.kodebuch = { ...f.kodebuch, niveau: n };
      if (ja(wert(z, sv, 'statable_umgepolt'))) f.kodebuch = { ...f.kodebuch, umgepolt: true };
      const kurz = lokVon(z, zusatz.kurz.spr); if (hatText(kurz)) f.kurz = kurz;
      const pm = lokVon(z, zusatz.pflichtMeldung.spr); if (f.pflicht && hatText(pm)) f.pflicht = { an: true, meldung: pm };
      if (f.typ === 'zahl') {
        const vorn = /^(?:\.\s*(?:>=|<=)\s*-?\d+(?:\.\d+)?(?:\s+and\s+)?)+/.exec(wert(z, sv, 'constraint'))?.[0] ?? '';
        const mn = /\.\s*>=\s*(-?\d+(?:\.\d+)?)/.exec(vorn), mx = /\.\s*<=\s*(-?\d+(?:\.\d+)?)/.exec(vorn);
        if (mn) f.zahl = { ...f.zahl!, min: Number(mn[1]) };
        if (mx) f.zahl = { ...f.zahl!, max: Number(mx[1]) };
      }
      if (f.typ === 'zahl' || f.typ === 'regler') { const e = lokVon(z, zusatz.einheit.spr); if (hatText(e)) f.zahl = { ...f.zahl!, einheit: e }; }
      const mz = Number(wert(z, sv, 'statable_maxzeichen'));
      if (f.typ === 'text' && Number.isInteger(mz) && mz > 0) f.text_ = { ...f.text_!, maxZeichen: mz };
      const gj = wert(z, sv, 'statable_gueltig');
      if (gj) {
        try {
          const g = JSON.parse(gj) as { regel?: unknown; meldung?: unknown };
          if (istBedingung(g.regel) && g.meldung && typeof g.meldung === 'object' && Object.values(g.meldung as object).every(x => typeof x === 'string')) f.gueltig = { regel: g.regel, meldung: g.meldung as Lok };
        } catch { /* nicht lesbar: ignoriert */ }
      }
      skalaMerken(z, name);
    }
    seite.elemente.push(f);
    letzte = f;
  }

  /* ---- Antwortlisten (nur die benutzten; beim Statable-Export alle, in der Reihenfolge des Blatts) ---- */
  const antwortlisten: Antwortliste[] = [];
  const herkunftCodes: Record<string, Record<string, number>> = {};
  if (ch) {
    const zuLesen: [string, { orOther: boolean }][] = statable
      ? [...new Set(ch.zeilen.map(z => wert(z, ch, 'list_name')).filter(Boolean))].map(n => [n, benutzteListen.get(n) ?? { orOther: false }])
      : [...benutzteListen];
    for (const [liste, info] of zuLesen) {
      const roh: { name: string; l: Lok; z: Zelle[] }[] = [];
      for (const z of ch.zeilen) {
        if (wert(z, ch, 'list_name') !== liste) continue;
        const name = wert(z, ch, 'name'); if (!name || (info.orOther && name === 'other')) continue;
        const id = `${liste}:${name}`;
        const l = lokVon(z, ch.spr, c => meldungen.push({ art: 'uebersetzungFehlt', name: id, sprache: c, satz: L(`Für die Antwort „${name}“ der Liste „${liste}“ fehlt der Text in der Sprache ${c}. Statable setzt keinen anderen Text ein.`, `For the answer "${name}" of the list "${liste}" the text in the language ${c} is missing. Statable does not substitute another text.`) }));
        if (!roh.some(r => r.name === name)) roh.push({ name, l, z });
      }
      if (!roh.length) continue;
      const ganz = roh.every(r => /^-?\d+$/.test(r.name));
      const optionen: Option[] = roh.map((r, i) => {
        const o: Option = { id: `${liste}:${r.name}`, wert: ganz ? Number(r.name) : i + 1, text: r.l };
        if (statable) {
          const fe = wert(r.z, ch, 'statable_fehlend');
          if (fe === 'weissNicht' || fe === 'keineAngabe' || fe === 'trifftNichtZu') o.fehlend = fe;
          if (ja(wert(r.z, ch, 'statable_ausschliessend'))) o.ausschliessend = true;
        }
        return o;
      });
      const geordnet = statable && roh.some(r => ja(wert(r.z, ch, 'statable_geordnet')));
      antwortlisten.push({ id: liste, name: liste, geordnet, optionen });
      if (!ganz) {
        const abbildung: [string, number][] = optionen.map(o => [optionName(liste, o), o.wert]);
        herkunftCodes[liste] = Object.fromEntries(abbildung);
        meldungen.push({ art: 'codeAbbildung', liste, abbildung, satz: L(`Die Antworten der Liste „${liste}“ haben Text als Namen. Statable zählt sie in der Reihenfolge der Liste: ${abbildung.map(([n, c]) => `${n} → ${c}`).join(', ')}.`, `The answers of the list "${liste}" have text as names. Statable numbers them in the order of the list: ${abbildung.map(([n, c]) => `${n} → ${c}`).join(', ')}.`) });
      }
    }
  }

  const skalen: Skala[] = [];
  const skB = mappe.get('statable_skalen');
  if (statable && skB) {
    const sk = tabelleVon(skB, 'name');
    for (const z of sk.zeilen) {
      const n = wert(z, sk, 'name'); if (!n) continue;
      const m = Number(wert(z, sk, 'mindestens'));
      skalen.push({ id: n, name: n, items: skalaItems.get(n) ?? [], bildung: wert(z, sk, 'bildung') === 'summe' ? 'summe' : 'mittelwert', mindestens: Number.isInteger(m) && m > 0 ? m : 1 });
    }
  }

  const plan: FragebogenPlan = {
    format: 'statable-fragebogen', version: 1, id: uuid(), revision: 1, titel, sprachen: codes,
    einstellungen: { fortschritt: true, zurueck: true, pretest: false, fehlendFilter: 'code' },
    antwortlisten, skalen, elemente: seiten,
    herkunft: { art: 'xlsform', datei: dateiname, zeit: Date.now(), ...(Object.keys(herkunftCodes).length ? { codes: herkunftCodes } : {}) },
    geaendert: Date.now()
  };
  namenPruefen(plan, meldungen);
  return { plan, meldungen };
}

/** Namen der Fragen: gültig in allen Zielen und nach dem Ableiten eindeutig (Architekturblatt 5.2); sonst wird geändert UND gemeldet. */
function namenPruefen(plan: FragebogenPlan, meldungen: PlanMeldung[]) {
  const vergeben = new Set<string>();
  const sprache = plan.sprachen[0] ?? 'default';
  for (const el of flach(plan)) {
    if (el.art === 'hinweis') continue;
    const von = el.name;
    let basis = planNameOk(el.name) ? el.name : (el.name.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^[^A-Za-z]+/, 'v').slice(0, 32) || 'frage');
    if (SCHLUESSEL.test(basis)) basis += '_';
    let name = basis, k = 2;
    const frei = () => variablenVon(plan, { ...el, name } as Element, sprache).every(v => !vergeben.has(v.name.toLowerCase())) && planNameOk(name);
    while (!frei() && k < 200) name = `${basis.slice(0, 32 - String(k).length - 1)}_${k++}`;
    el.name = name;
    for (const v of variablenVon(plan, el, sprache)) vergeben.add(v.name.toLowerCase());
    if (name !== von) meldungen.push({ art: 'namenGeaendert', von, nach: name, satz: L(`Der Name „${von}“ ist als Variablenname nicht möglich oder schon vergeben. Statable nennt die Variable „${name}“.`, `The name "${von}" is not possible as a variable name or is already taken. Statable calls the variable "${name}".`) });
  }
}

/* ------------------------------------------------------------------ variablenAusPlan */
const TXT = {
  de: { nicht: 'nicht angekreuzt', zugestimmt: 'zugestimmt' },
  en: { nicht: 'not ticked', zugestimmt: 'agreed' }
};
const wortschatz = (sprache: string) => (/^de/i.test(sprache) || sprache === 'default' ? TXT.de : TXT.en);

function variablenVon(plan: FragebogenPlan, el: Element, sprache: string): PlanVariable[] {
  if (el.art === 'hinweis') return [];
  const out: PlanVariable[] = [];
  const w = wortschatz(sprache);
  const liste = (id: string | undefined) => plan.antwortlisten.find(l => l.id === id);
  const labelsVon = (l: Antwortliste | undefined) => Object.fromEntries((l?.optionen ?? []).map(o => [String(o.wert), txt(o.text, sprache)]));
  const fehlendVon = (l: Antwortliste | undefined) => { const f = (l?.optionen ?? []).filter(o => o.fehlend).map(o => o.wert); return f.length ? { fehlend: f } : {}; };
  const suffix = (n: number) => (n < 0 ? `m${-n}` : String(n));
  if (el.art === 'block') {
    const l = liste(el.liste);
    for (const it of el.items) out.push({ name: `${el.name}_${it.name}`, label: kuerze(`${txt(el.text, sprache)} - ${txt(it.kurz ?? it.text, sprache)}`), werteLabels: labelsVon(l), ...fehlendVon(l), niveau: el.kodebuch.niveau, typ: 'zahl', gruppe: { id: el.name, art: 'itemblock' }, quelle: { element: el.id, item: it.id } });
    if (plan.einstellungen.pretest) out.push({ name: `${el.name}_kommentar`, label: kuerze(txt(el.text, sprache)), rolle: 'text', niveau: 'nominal', typ: 'text', quelle: { element: el.id, teil: 'kommentar' } });
    return out;
  }
  const label = kuerze(txt(el.kurz ?? el.text, sprache));
  const f = el;
  switch (f.typ) {
    case 'einfach': { const l = liste(f.liste); out.push({ name: f.name, label, werteLabels: labelsVon(l), ...fehlendVon(l), niveau: f.kodebuch.niveau, typ: 'zahl', quelle: { element: f.id } }); break; }
    case 'mehrfach':
      for (const o of liste(f.liste)?.optionen ?? []) out.push({ name: `${f.name}_${suffix(o.wert)}`, label: kuerze(`${label} - ${txt(o.text, sprache)}`), werteLabels: { '0': w.nicht, '1': txt(o.text, sprache) || String(o.wert) }, niveau: 'nominal', typ: 'zahl', gruppe: { id: f.name, art: 'mehrfach', zaehlwert: 1 }, quelle: { element: f.id, option: o.id } });
      break;
    case 'rangfolge':
      for (const o of liste(f.liste)?.optionen ?? []) out.push({ name: `${f.name}_${suffix(o.wert)}`, label: kuerze(`${label} - ${txt(o.text, sprache)}`), niveau: 'ordinal', typ: 'zahl', quelle: { element: f.id, option: o.id } });
      break;
    case 'zahl': case 'regler': out.push({ name: f.name, label, niveau: 'skala', typ: 'zahl', quelle: { element: f.id } }); break;
    case 'text': out.push({ name: f.name, label, rolle: 'text', niveau: 'nominal', typ: 'text', quelle: { element: f.id } }); break;
    case 'datum': out.push({ name: f.name, label, niveau: 'skala', typ: 'datum', quelle: { element: f.id } }); break;
    case 'einwilligung': out.push({ name: f.name, label, werteLabels: { '1': w.zugestimmt }, niveau: 'nominal', typ: 'zahl', quelle: { element: f.id } }); break;
  }
  if (f.anders?.an) out.push({ name: `${f.name}_anders`, label: kuerze(`${label} - ${txt(f.anders.text, sprache)}`), rolle: 'text', niveau: 'nominal', typ: 'text', quelle: { element: f.id, teil: 'anders' } });
  if (plan.einstellungen.pretest) out.push({ name: `${f.name}_kommentar`, label, rolle: 'text', niveau: 'nominal', typ: 'text', quelle: { element: f.id, teil: 'kommentar' } });
  return out;
}

/** Die Spalten des Datensatzes aus dem Plan (Architekturblatt 5). Rein: gleicher Plan, gleiche Variablen; der Plan wird nicht verändert. */
export function variablenAusPlan(plan: FragebogenPlan, sprache: string = plan.sprachen[0] ?? 'de'): PlanVariable[] {
  return flach(plan).flatMap(el => variablenVon(plan, el, sprache));
}

/* ------------------------------------------------------------------ Werte */
const frageMitId = (plan: FragebogenPlan, id: string): Frage | undefined => flach(plan).find((e): e is Frage => e.art === 'frage' && e.id === id);
const listeVon = (plan: FragebogenPlan, f: Frage | undefined) => (f?.liste ? plan.antwortlisten.find(l => l.id === f.liste) : undefined);

/** XLSForm-Name (Kobo „XML values“) → Option der Frage; `other` und Unbekanntes: null. */
export function optionNachName(plan: FragebogenPlan, frageId: string, name: string | number): Option | null {
  const f = frageMitId(plan, frageId), l = listeVon(plan, f);
  const n = String(name).trim();
  return l?.optionen.find(o => o.id === `${l.id}:${n}`) ?? null;
}
/** Kobo „Labels“: genau gleicher Text (getrimmt) in der Exportsprache. */
export function optionNachBeschriftung(plan: FragebogenPlan, frageId: string, text: string, sprache: string): Option | null {
  const l = listeVon(plan, frageMitId(plan, frageId)), t = String(text ?? '').trim();
  return t ? l?.optionen.find(o => (o.text[sprache] ?? '').trim() === t) ?? null : null;
}
/** Kobo-Optionsspalten: 1/0 oder True/False (auch echte Wahrheitswerte); leer oder Fremdes: null. */
export function ankreuzWert(z: string | number | boolean | null | undefined): 0 | 1 | null {
  if (z === true || z === 1) return 1;
  if (z === false || z === 0) return 0;
  if (typeof z !== 'string') return null;
  const t = z.trim().toLowerCase();
  return t === '1' || t === 'true' ? 1 : t === '0' || t === 'false' ? 0 : null;
}

/* ------------------------------------------------------------------ Spalten zuordnen */
/**
 * Die Spaltenköpfe eines Kobo- oder ODK-Exports den Variablen des Plans zuordnen: `gruppe/frage`, `frage/option`, `gruppe/frage/option`, `<frage>_other`, ODK `gruppe-frage`;
 * der Gruppenpfad darf fehlen. Genau passende Köpfe werden zugeordnet, nichts wird geraten: Unbekanntes landet in `unzugeordnet`.
 * Nach Dokumentation und Forumsberichten gebaut, nicht an echten Exporten geprüft.
 */
export function ordneSpalten(plan: FragebogenPlan, kopf: string[]): { zuordnung: SpaltenZuordnung[]; unzugeordnet: string[] } {
  const vars = variablenAusPlan(plan, plan.sprachen[0] ?? 'de');
  const varName = (f: Frage, option?: string, teil?: 'anders') => vars.find(v => v.quelle.element === f.id && v.quelle.option === option && v.quelle.teil === teil && v.quelle.item === undefined)?.name ?? null;
  const karte = new Map<string, Omit<SpaltenZuordnung, 'kopf'>>();
  const setze = (k: string, z: Omit<SpaltenZuordnung, 'kopf'>) => { if (!karte.has(k)) karte.set(k, z); };
  const fragen = flach(plan).filter((e): e is Frage => e.art === 'frage');
  const tiefe = Math.max(0, ...fragen.map(f => (f.gruppe ? f.gruppe.split('/').length : 0)));
  for (let s = 0; s <= tiefe; s++) {
    for (const f of fragen) {
      const pfad = f.gruppe ? f.gruppe.split('/') : [];
      if (s > pfad.length) continue;
      const segmente = [...pfad.slice(s), f.id];
      const l = listeVon(plan, f);
      const sammel = f.typ === 'mehrfach' || f.typ === 'rangfolge';
      for (const trenner of ['/', '-']) {
        const basis = segmente.join(trenner);
        setze(basis, sammel ? { frage: f.id, art: 'sammelspalte', variable: null } : { frage: f.id, art: 'antwort', variable: varName(f) });
        if (sammel && trenner === '/') for (const o of l?.optionen ?? []) setze(`${basis}/${optionName(l!.id, o)}`, { frage: f.id, art: 'optionsspalte', option: o.id, variable: varName(f, o.id) });
        if (f.anders?.an) setze(`${basis}_other`, { frage: f.id, art: 'anders', variable: varName(f, undefined, 'anders') });
      }
    }
  }
  const zuordnung: SpaltenZuordnung[] = [], unzugeordnet: string[] = [];
  for (const k of kopf) { const z = karte.get(k); if (z) zuordnung.push({ kopf: k, ...z }); else unzugeordnet.push(k); }
  return { zuordnung, unzugeordnet };
}

/* ------------------------------------------------------------------ Kodebuch aus Plan und Zuordnung */
export interface XlsAbbildung {
  liste: string;
  /** Name in der XLSForm, Beschriftung in der Sprache des Kodebuchs, Zahl */
  optionen: { name: string; text: string; code: number }[];
  /** `or_other`: der Wert `other` bekommt die nächste Zahl; der freie Text steht in der Spalte `…_anders` */
  anders: { code: number; text: string } | null;
  /** Köpfe der Datenspalten, die in dieser Liste antworten */
  spalten: string[];
}
const istZahlZelle = (z: Zelle | undefined) => typeof z === 'number' || (typeof z === 'string' && /^-?\d+([.,]\d+)?$/.test(z.trim()));

/**
 * Das Kodebuch (für `wendeKodebuchAn` und die Erkennung) aus Plan und Zuordnung. Spalten, deren Zellen Text-Namen oder Beschriftungen statt Zahlen enthalten, bekommen KEINE Wertebeschriftungen:
 * Statt dessen entsteht ein Vorschlag `abbildungen` (Text → Zahl), den die Person erst annehmen muss. Optionsspalten mit True/False (statt 1/0) werden nicht zu einer Mehrfachauswahl; das steht in den Hinweisen.
 */
export function kodebuchAusPlan(plan: FragebogenPlan, zuordnung: SpaltenZuordnung[], tabelle: Tabelle, hersteller: Kodebuch['hersteller'] = 'unbekannt', sprache: string = plan.sprachen[0] ?? 'de'): { kodebuch: Kodebuch; abbildungen: XlsAbbildung[]; hinweise: string[] } {
  const vars = variablenAusPlan(plan, sprache), byName = new Map(vars.map(v => [v.name, v]));
  const spalten: Record<string, KodebuchSpalte> = {};
  const abb = new Map<string, XlsAbbildung>();
  const hinweise: string[] = [];
  /** Wie „True“ in den Optionsspalten EINER Frage geschrieben ist (alle Spalten zusammen, so wie es in den Zellen steht); eine Spalte nur mit „False“ gehört dazu. */
  const wahrSchreibweisen = (frageId: string) => [...new Set(zuordnung.filter(o => o.art === 'optionsspalte' && o.frage === frageId).flatMap(o => { const j = tabelle.kopf.indexOf(o.kopf); return j < 0 ? [] : tabelle.zeilen.map(r => r[j]).filter((c): c is string => typeof c === 'string' && /^true$/i.test(c.trim())).map(c => c.trim()); }))];
  for (const z of zuordnung) {
    const v = z.variable ? byName.get(z.variable) : undefined;
    if (!v) continue;
    const i = tabelle.kopf.indexOf(z.kopf), zellen = i < 0 ? [] : tabelle.zeilen.map(r => r[i]).filter(c => ZEILE(c) !== '');
    const k: KodebuchSpalte = { label: v.label, niveau: v.niveau, ...(v.rolle ? { rolle: v.rolle } : {}) };
    const f = frageMitId(plan, z.frage), l = listeVon(plan, f);
    if (z.art === 'antwort' && f?.typ === 'einfach' && l) {
      const abgebildet = !!plan.herkunft?.codes?.[l.id];
      if (abgebildet || zellen.some(c => !istZahlZelle(c))) {
        let a = abb.get(l.id);
        if (!a) {
          const optionen = l.optionen.map(o => ({ name: optionName(l.id, o), text: txt(o.text, sprache) || optionName(l.id, o), code: o.wert }));
          const hoechst = Math.max(0, ...optionen.map(o => o.code));
          a = { liste: l.id, optionen, anders: f.anders?.an ? { code: hoechst + 1, text: txt(f.anders.text, sprache) } : null, spalten: [] }; abb.set(l.id, a);
        }
        a.spalten.push(z.kopf);
      } else { k.werteLabels = v.werteLabels; if (v.fehlend) k.fehlend = v.fehlend; }
    } else if (z.art === 'optionsspalte') {
      if (zellen.every(c => (typeof c === 'number' ? c === 0 || c === 1 : c === '0' || c === '1'))) { k.werteLabels = v.werteLabels; if (v.gruppe) k.gruppe = v.gruppe; }
      else {
        // Kobo-CSV mit True/False: ein Mehrfachantwort-Set mit dem Zählwert „True“ (so, wie er in den Zellen steht); sonst bleibt die Spalte, wie sie ist
        const wahr = wahrSchreibweisen(z.frage);
        if (v.gruppe && zellen.every(c => typeof c === 'string' && /^(true|false)$/i.test(c.trim())) && wahr.length === 1) k.gruppe = { ...v.gruppe, zaehlwert: wahr[0]! };
        else hinweise.push(L(`Die Spalte „${z.kopf}“ enthält weder 1/0 noch True/False in einer einheitlichen Schreibweise. Eine Mehrfachauswahl legt Statable daraus nicht an; die Spalte bleibt, wie sie ist.`, `The column "${z.kopf}" contains neither 1/0 nor True/False in one consistent spelling. Statable does not build a multiple-choice set from it; the column stays as it is.`));
      }
    } else if (z.art === 'antwort' && v.werteLabels) { k.werteLabels = v.werteLabels; }
    spalten[z.kopf] = k;
  }
  // Sammelspalte (Kobo/ODK: Optionen mit Leerzeichen in einer Zelle) ohne einzelne Optionsspalten: Statable schlägt „Mehrfachauswahl in einer Zelle“ mit den Optionen aus dem Plan vor (Paket 1B); Rangfolgen bleiben, wie sie sind
  for (const z of zuordnung) {
    if (z.art !== 'sammelspalte' || zuordnung.some(o => o.art === 'optionsspalte' && o.frage === z.frage)) continue;
    const f = frageMitId(plan, z.frage), l = listeVon(plan, f);
    if (f?.typ === 'mehrfach' && l?.optionen.length) { spalten[z.kopf] = { label: kuerze(txt(f.text, sprache), 250), niveau: 'nominal', mehrfachZelle: { trenner: ' ', optionen: l.optionen.map(o => optionName(l.id, o)) } }; continue; }
    hinweise.push(L(`Die Spalte „${z.kopf}“ enthält mehrere Antworten in einer Zelle (durch Leerzeichen getrennt), und es gibt keine einzelnen Spalten dazu. Statable teilt sie nicht auf; die Spalte bleibt, wie sie ist.`, `The column "${z.kopf}" holds several answers in one cell (separated by spaces), and there are no separate columns for them. Statable does not split it; the column stays as it is.`));
  }
  return { kodebuch: { hersteller, spalten, fall: {} }, abbildungen: [...abb.values()], hinweise };
}

/**
 * Text → Zahl für eine Spalte: RECODE in eine NEUE Spalte (das Original bleibt), Wertebeschriftungen, Messniveau nominal. Der Text der Datei gelangt nur über `zit` in den Befehl,
 * Zahlen sind geprüfte ganze Zahlen, Namen kommen vom Aufrufer (`psppName`). Texte, die zu keiner Antwort der Liste passen, stehen in `offen`: sie werden NIE still zu „fehlend“.
 * `roh`: die verschiedenen Zellwerte der Spalte (Text, getrimmt); `numerisch`: die Spalte ist in den Daten eine Zahlenspalte (dann gilt nur, was eine Zahl ist).
 */
export function abbildungsBefehl(spalte: string, ziel: string, a: XlsAbbildung, roh: string[], numerisch: boolean, label?: string): { befehl: string } | { offen: string[] } {
  const code = (r: string): number | null => {
    const nach = a.optionen.find(o => o.name === r) ?? (a.anders && r === 'other' ? { code: a.anders.code } : undefined) ?? a.optionen.find(o => o.text === r);
    return nach && Number.isInteger(nach.code) ? nach.code : null;
  };
  const regeln: string[] = [], offen: string[] = [];
  for (const r of roh) {
    const c = code(r);
    if (c === null || (numerisch && !/^-?\d+(\.\d+)?$/.test(r))) { offen.push(r); continue; }
    regeln.push(`(${numerisch ? String(Number(r)) : zit(r, 255)}=${c})`);
  }
  if (offen.length || !regeln.length) return { offen };
  const labels = [...a.optionen.map(o => ({ code: o.code, text: o.text })), ...(a.anders ? [{ code: a.anders.code, text: a.anders.text || 'other' }] : [])];
  return { befehl: [
    `RECODE ${spalte} ${regeln.join(' ')} INTO ${ziel}.`,
    ...(label ? [`VARIABLE LABELS ${ziel} ${zit(label, 250)}.`] : []),
    `VALUE LABELS ${ziel} ${labels.map(l => `${l.code} ${zit(l.text, 120)}`).join(' ')}.`,
    `FORMATS ${ziel} (F8.0).`,
    `VARIABLE LEVEL ${ziel} (NOMINAL).`,
    'EXECUTE.'
  ].join('\n') };
}

/* ------------------------------------------------------------------ Paket 2A: Bedingungen, Prüfung, Namen */
export { zeigen, unerreichbar, type Antworten } from './fragebogenplan-bedingung';

export interface PlanBefund { art: 'fehler' | 'hinweis'; regel: string; /** id des betroffenen Elements (bei `option-text` der Option, bei `item-text` des Block-Items) */ element?: string; text: string }

const NAME_FORM = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
const bedingungsFragen = (b: Bedingung | undefined): string[] => {
  if (!b) return [];
  if ('und' in b) return b.und.flatMap(bedingungsFragen);
  if ('oder' in b) return b.oder.flatMap(bedingungsFragen);
  if ('nicht' in b) return bedingungsFragen(b.nicht);
  return [b.frage];
};
const lokFehlt = (l: Lok | undefined, sprachen: string[]): string[] => sprachen.filter(s => typeof l?.[s] !== 'string' || l[s]!.trim() === '');

/**
 * Prüft den Plan nach Architekturblatt 5.2 und 7: Fehler sperren die Exporte, Hinweise nicht. Ein gültiger Plan ergibt []. Reihenfolge: Plan-Reihenfolge.
 * Texte ohne Anrede; `element` führt zum Sprunglink. Der Plan wird nicht verändert.
 */
/** Platzhalter, die die Vorlagen in Fragetexte schreiben („… (Aussage hier eintragen)“, „(enter here)“). */
const PLATZHALTER = /\([^()]*(?:hier eintragen|enter (?:statement )?here)\)/i;
/** Stellen, an denen ein Vorlagentext noch nicht ersetzt wurde: je Element höchstens eine (Fragen, Blöcke samt Items, Hinweise). */
export function platzhalterStellen(plan: FragebogenPlan): { element: string; name: string }[] {
  const aus: { element: string; name: string }[] = [];
  const hat = (l: Lok | undefined) => !!l && Object.values(l).some(t => typeof t === 'string' && PLATZHALTER.test(t));
  for (const s of plan.elemente) for (const e of s.elemente) {
    if (hat(e.text) || (e.art === 'block' && e.items.some(i => hat(i.text)))) aus.push({ element: e.id, name: e.name });
  }
  return aus;
}

export function planPruefen(plan: FragebogenPlan, optionen: { wege?: Array<'datei' | 'link'> } = {}): PlanBefund[] {
  const b: PlanBefund[] = [];
  const fehler = (regel: string, element: string | undefined, text: string) => b.push({ art: 'fehler', regel, ...(element !== undefined ? { element } : {}), text });
  const hinweis = (regel: string, element: string | undefined, text: string) => b.push({ art: 'hinweis', regel, ...(element !== undefined ? { element } : {}), text });
  const sprachen = plan.sprachen, sprache = sprachen[0] ?? 'de';
  const listen = new Map(plan.antwortlisten.map(l => [l.id, l]));
  const alle = flach(plan);
  const lang = (l: string[]) => l.join(', ');

  /* ---- Namen ---- */
  const nameBefund = (id: string, name: string, was: string) => {
    if (SCHLUESSEL.test(name) && NAME_FORM.test(name)) fehler('name-schluessel', id, L(`${was} „${name}“ ist ein Schlüsselwort von PSPP und als Variablenname nicht möglich.`, `${was} "${name}" is a PSPP keyword and cannot be a variable name.`));
    else if (!NAME_FORM.test(name)) fehler('name-ungueltig', id, L(`${was} „${name}“ ist kein gültiger Variablenname (Buchstabe am Anfang, dann Buchstaben, Ziffern und _, höchstens 32 Zeichen, keine Umlaute).`, `${was} "${name}" is not a valid variable name (starts with a letter, then letters, digits and _, at most 32 characters, no umlauts).`));
  };
  const gesehen = new Map<string, string>();
  const doppelt = (id: string, name: string, was: string) => {
    const k = name.toLowerCase(); if (!k) return;
    if (gesehen.has(k)) fehler('name-doppelt', id, L(`${was} „${name}“ kommt schon vor: Variablennamen sind ohne Unterschied von Groß- und Kleinschreibung eindeutig.`, `${was} "${name}" already exists: variable names are unique regardless of upper and lower case.`));
    else gesehen.set(k, id);
  };
  for (const e of alle) {
    if (e.art === 'hinweis') continue;
    const was = e.art === 'frage' ? L('Der Name', 'The name') : L('Der Blockname', 'The block name');
    nameBefund(e.id, e.name, was); doppelt(e.id, e.name, was);
    if (e.art === 'block') {
      const blockOk = NAME_FORM.test(e.name), innen = new Set<string>();
      for (const it of e.items) {
        const wasI = L('Der Itemname', 'The item name');
        if (!/^[A-Za-z0-9_]+$/.test(it.name) || (blockOk && !NAME_FORM.test(`${e.name}_${it.name}`))) fehler('name-ungueltig', it.id, L(`${wasI} „${it.name}“ ergibt keinen gültigen Variablennamen (Buchstaben, Ziffern und _; Blockname und Item zusammen höchstens 32 Zeichen).`, `${wasI} "${it.name}" does not give a valid variable name (letters, digits and _; block name and item together at most 32 characters).`));
        const k = it.name.toLowerCase();
        if (k && innen.has(k)) fehler('name-doppelt', it.id, L(`${wasI} „${it.name}“ kommt im Block schon vor.`, `${wasI} "${it.name}" already exists in the block.`)); else innen.add(k);
      }
    }
  }
  // Zusammenstoß nach dem Ableiten (q1_2 aus einer Mehrfachfrage gegen eine Frage q1_2, Item gegen Frage, _kommentar bei Pretest)
  const besitzer = new Map<string, { id: string; name: string }>();
  for (const e of alle) {
    for (const v of variablenVon(plan, e, sprache)) {
      const k = v.name.toLowerCase(), alt = besitzer.get(k);
      if (!alt) { besitzer.set(k, { id: e.id, name: e.name.toLowerCase() }); continue; }
      if (alt.id === e.id || alt.name === e.name.toLowerCase()) continue;   // dieselbe Frage oder doppelter Name: schon gemeldet
      fehler('name-zusammenstoss', e.id, L(`Die abgeleitete Variable „${v.name}“ gibt es schon: sie entsteht aus einem anderen Element. Einen der beiden Namen ändern.`, `The derived variable "${v.name}" already exists: it comes from another element. Change one of the two names.`));
    }
  }

  /* ---- Verweise ---- */
  const pos = new Map<string, number>(); let n = 0;
  for (const s of plan.elemente) { pos.set(s.id, n++); for (const e of s.elemente) pos.set(e.id, n++); }
  const kanten = new Map<string, string[]>();
  const verweise = (id: string, p: number, bed: Bedingung | undefined) => {
    for (const ziel of new Set(bedingungsFragen(bed))) {
      if (!pos.has(ziel)) { fehler('verweis-unbekannt', id, L(`Die Bedingung verweist auf eine Frage, die es nicht gibt („${ziel}“).`, `The condition refers to a question that does not exist ("${ziel}").`)); continue; }
      if (pos.get(ziel)! >= p) fehler('verweis-vorn', id, L('Die Bedingung verweist auf die Frage selbst oder auf eine spätere Frage. Verweise sind nur auf frühere Fragen erlaubt.', 'The condition refers to the question itself or to a later question. Conditions may only refer to earlier questions.'));
      kanten.set(id, [...(kanten.get(id) ?? []), ziel]);
    }
  };
  for (const s of plan.elemente) {
    verweise(s.id, pos.get(s.id)!, s.wennGezeigt);
    for (const e of s.elemente) { verweise(e.id, pos.get(e.id)!, e.wennGezeigt); if (e.art === 'frage') verweise(e.id, pos.get(e.id)!, e.gueltig?.regel); }
  }
  // Kreis: ein Element, das über Verweise wieder bei sich ankommt (nur mit Vorwärtsverweis möglich, bleibt als eigene Regel)
  const imKreis = (start: string): boolean => {
    const besucht = new Set<string>(), stapel = [...(kanten.get(start) ?? [])];
    while (stapel.length) { const x = stapel.pop()!; if (x === start) return true; if (besucht.has(x)) continue; besucht.add(x); stapel.push(...(kanten.get(x) ?? [])); }
    return false;
  };
  for (const id of kanten.keys()) if (imKreis(id)) fehler('kreis', id, L('Die Bedingungen verweisen im Kreis aufeinander: keine der Fragen kann zuerst entschieden werden.', 'The conditions refer to each other in a circle: none of the questions can be decided first.'));

  /* ---- Sprachen und Barrierefreiheit ---- */
  const sprachFehlt = (id: string | undefined, l: Lok | undefined, was: string) => {
    const f = lokFehlt(l, sprachen);
    if (f.length) fehler('sprache-fehlt', id, L(`${was}: Text fehlt in ${lang(f)}. Jede Sprache braucht einen Text.`, `${was}: text missing in ${lang(f)}. Every language needs a text.`));
  };
  const bildAlt = (id: string, bild: Bild | undefined) => {
    if (!bild) return;
    const f = lokFehlt(bild.alt, sprachen);
    if (f.length) fehler('bild-alt', id, L(`Bild „${bild.datei}“ ohne Alternativtext in ${lang(f)} (WCAG 1.1.1).`, `Image "${bild.datei}" without alternative text in ${lang(f)} (WCAG 1.1.1).`));
  };
  sprachFehlt(undefined, plan.titel, L('Titel des Plans', 'Plan title'));
  for (const s of plan.elemente) {
    if (s.titel) sprachFehlt(s.id, s.titel, L('Seitentitel', 'Page title'));
    for (const e of s.elemente) {
      if (e.art === 'frage') {
        sprachFehlt(e.id, e.text, L(`Fragetext „${e.name}“`, `Question text "${e.name}"`));
        bildAlt(e.id, e.bild);
        if (e.typ === 'regler' && (typeof e.zahl?.min !== 'number' || typeof e.zahl?.max !== 'number')) fehler('regler-grenzen', e.id, L(`Regler „${e.name}“ braucht Mindest- und Höchstwert.`, `Slider "${e.name}" needs a minimum and a maximum.`));
      } else if (e.art === 'block') {
        sprachFehlt(e.id, e.text, L(`Blocktext „${e.name}“`, `Block text "${e.name}"`));
        for (const it of e.items) { const f = lokFehlt(it.text, sprachen); if (f.length) fehler('item-text', it.id, L(`Block-Item „${it.name}“: Text fehlt in ${lang(f)}.`, `Block item "${it.name}": text missing in ${lang(f)}.`)); }
      } else {
        sprachFehlt(e.id, e.text, L(`Hinweistext „${e.name}“`, `Note text "${e.name}"`));
        bildAlt(e.id, e.bild);
      }
    }
  }
  for (const l of plan.antwortlisten) for (const o of l.optionen) {
    const f = lokFehlt(o.text, sprachen);
    if (f.length) fehler('option-text', o.id, L(`Antwortoption (Code ${o.wert}) der Liste „${l.name}“: Text fehlt in ${lang(f)}. Jede Stufe braucht einen Text.`, `Answer option (code ${o.wert}) of the list "${l.name}": text missing in ${lang(f)}. Every level needs a text.`));
    bildAlt(o.id, o.bild);
  }

  /* ---- Hinweise ---- */
  for (const p of platzhalterStellen(plan)) hinweis('platzhalter', p.element, L(`Vorlagentext noch nicht ersetzt: Der Text von „${p.name}“ enthält noch eine Platzhalter-Klammer wie „(hier eintragen)“. Vor dem Export ersetzen.`, `Template text not replaced yet: the text of "${p.name}" still contains a placeholder in brackets like "(enter here)". Replace it before exporting.`));
  for (const e of alle) {
    if (e.art === 'block') {
      if (e.items.length > 7) hinweis('block-items', e.id, L(`Block „${e.name}“ hat ${e.items.length} Items: ab 8 wird die Matrix am Handy und mit Screenreader unübersichtlich.`, `Block "${e.name}" has ${e.items.length} items: from 8 on the matrix is hard to use on a phone and with a screen reader.`));
      const stufen = (listen.get(e.liste)?.optionen ?? []).filter(o => !o.fehlend).length;
      if (stufen > 7) hinweis('block-stufen', e.id, L(`Die Antwortliste von Block „${e.name}“ hat ${stufen} Stufen: ab 8 wird die Matrix unübersichtlich.`, `The answer list of block "${e.name}" has ${stufen} levels: from 8 on the matrix gets hard to use.`));
    }
    if ((e.art === 'frage' || e.art === 'block') && e.hilfe && Object.values(e.hilfe).some(t => typeof t === 'string' && t.length > 300)) hinweis('hilfe-lang', e.id, L(`Der Hilfetext von „${e.name}“ ist länger als 300 Zeichen. Kürzer ist besser verständlich, vor allem mit Screenreader.`, `The help text of "${e.name}" is longer than 300 characters. Shorter is easier to understand, especially with a screen reader.`));
    if (e.art === 'frage' && e.typ === 'rangfolge' && (listen.get(e.liste ?? '')?.optionen.length ?? 0) > 7) hinweis('rangfolge-lang', e.id, L(`Die Rangfolge „${e.name}“ hat mehr als 7 Optionen: Das Ordnen wird mühsam.`, `The ranking "${e.name}" has more than 7 options: ordering gets tedious.`));
  }
  /* Stufe 3A: Fragebogen-Datei und Link (3C) verschlüsseln die Antworten an den öffentlichen Schlüssel. Nur ein Hinweis, kein Fehler; ohne gewählten Weg (Voreinstellung) kein Befund. */
  if (optionen.wege?.length && !/^age1[a-z0-9]{20,}$/.test(plan.empfaenger?.schluessel ?? '')) hinweis('empfaenger-fehlt', undefined, L('Für die Fragebogen-Datei und den Link fehlt noch ein Schlüssel: Ohne ihn lassen sich Antworten nicht verschlüsseln. Legen Sie unter „Antworten verschlüsseln (Schlüssel)“ ein Schlüsselpaar an oder verwenden Sie einen vorhandenen Schlüssel.', 'The questionnaire file and the link still need a key: without it answers cannot be encrypted. Create a key pair under "Encrypt answers (key)" or use an existing key.'));
  return b;
}

/** Namensvorschlag aus dem Fragetext: erste zwei Wörter, klein, ohne Umlaute (ä→ae …), mit _ verbunden; immer gültig nach 5.2 und frei gegenüber `vergeben` (Nummer ab 2). */
export function namensVorschlag(text: string, vergeben: string[]): string {
  const wort = (w: string) => w.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '');
  let basis = (text ?? '').split(/[^\p{L}\p{N}]+/u).map(wort).filter(Boolean).slice(0, 2).join('_');
  if (!basis) basis = 'frage';
  if (!/^[a-z]/.test(basis)) basis = 'f' + basis;
  basis = basis.slice(0, 32).replace(/_+$/, '') || 'frage';
  const belegt = new Set(vergeben.map(v => v.toLowerCase()));
  const frei = (n: string) => !belegt.has(n) && !SCHLUESSEL.test(n);
  if (frei(basis)) return basis;
  for (let k = 2; ; k++) { const n = basis.slice(0, 32 - String(k).length) + k; if (frei(n)) return n; }
}
