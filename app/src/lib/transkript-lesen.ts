/**
 * Transkripte einlesen (Stufe 4, Paket 4A; Fachblatt `docs/erheben/FACHBLATT-STUFE-4.md`, Abschnitt "4A" samt Entscheiden F1-F12).
 *
 * `leseTranskript` erkennt das Format (aTrain, noScribe, Teams, Zoom, WebVTT, SRT, f4, CHAT, ELAN, Word, reiner Text) und zerlegt es in Beiträge.
 * `vorschlagZuordnung` schlägt Sprecher-Namen vor (nie echte Namen), `transkriptDokument` baut daraus ein `Dokument` für das `QualProjekt`.
 *
 * Sicherheit: Text aus Dateien wird nie als HTML oder Code verwendet. HTML (noScribe) und Word werden nur zu Text gelesen:
 * `<script>`, `<style>`, Kopf, Bilder und alle Attribute (außer dem Namen der Zeitanker) werden verworfen, nichts wird ausgeführt oder geladen.
 * Dazu dient ein kleiner Text-Herauszieher ohne DOM (Fachblatt: "darf der Bauer schreiben").
 */
import { unzipSync } from 'fflate';
import { L } from './sitzung.svelte';
import { istChat, istElan, parseChat, parseElan } from './transkript-lesen-chat-elan';
import { cpLaenge, positionsKarte, utf16ZuCp } from './qualprojekt';
import type { Dokument, Fall, SprecherRolle, TranskriptAbschnitt, TranskriptSprecher, Variable } from './qualprojekt';

/* ------------------------------------------------------------------ Typen */

export interface TranskriptBeitrag {
  /** Kennung aus der Datei (z. B. SPEAKER_00, I, Erika Muster) */
  sprecher?: string;
  zeitMs?: number;
  bisMs?: number;
  /** Inhalt ohne Kennung und ohne Zeitmarke am Rand (Entscheid F7) */
  text: string;
  /** Nur bei Text-Quellen (f4, reiner Text, noScribe-TXT): Lage des ganzen Beitrags in `TranskriptRoh.text` (UTF-16, Ende exklusiv). */
  ort?: { von: number; bis: number };
}

export interface TranskriptRoh {
  quelle: 'atrain' | 'noscribe' | 'teams' | 'zoom' | 'vtt' | 'srt' | 'f4' | 'docx' | 'text' | 'chat' | 'elan';
  beitraege: TranskriptBeitrag[];
  meldungen: { art: string; satz: string; zeile?: number }[];
  /** Der gelesene Text (ohne BOM) bei Text-Quellen; `transkriptDokument` nimmt ihn, wenn kein Text übergeben wird. */
  text?: string;
}

export interface SprecherPerson {
  /** Kennung aus der Datei */
  kennung: string;
  /** Name im Projekt */
  name: string;
  rolle: SprecherRolle;
  /** Kennung einer anderen Person, mit der diese zusammengelegt wird (aTrain trennt eine Stimme manchmal in zwei) */
  gleichWie?: string;
}

export interface SprecherZuordnung {
  /** "dokument": ein Dokument ist ein Fall; "personen": jede befragte Person ist ein Fall */
  faelle: 'dokument' | 'personen';
  personen: SprecherPerson[];
}

export interface LeseOptionen {
  /** Untertitel (VTT, SRT, aTrain-JSON) zu Absätzen zusammenfassen (Voreinstellung: an) */
  zusammenfassen?: boolean;
}

export const MAX_TRANSKRIPT_BYTES = 20 * 1048576;

/* ------------------------------------------------------------------ Kleinzeug */

type Meldung = TranskriptRoh['meldungen'][number];

const leer = (quelle: TranskriptRoh['quelle'], meldungen: Meldung[]): TranskriptRoh => ({ quelle, beitraege: [], meldungen });

function zeitMs(h: number, m: number, s: number, bruchteil = 0): number {
  return Math.round(((h * 60 + m) * 60 + s) * 1000 + bruchteil);
}

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', lrm: '', rlm: '' };
/** Löst Entities auf (nur die üblichen und Zahlen); Unbekanntes bleibt stehen. */
function entities(s: string): string {
  return s.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z]{2,6}));/g, (voll: string, d?: string, h?: string, n?: string): string => {
    if (n) return NAMED[n] ?? voll;
    const c = d ? parseInt(d, 10) : parseInt(h ?? '', 16);
    if (!Number.isFinite(c) || c > 0x10FFFF || (c >= 0xD800 && c <= 0xDFFF) || c === 0) return voll;
    return String.fromCodePoint(c);
  });
}

type Gr = Record<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, string> & { index: number };
/** Regulärer Ausdruck mit Gruppen; nicht gefundene Gruppen sind zur Laufzeit undefined (Gruppen 1-8 gelten als Text). */
const ausf = (re: RegExp, s: string): Gr | null => re.exec(s) as Gr | null;

const platt = (s: string): string => s.replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ Zeichensatz */

function dekodiere(bytes: Uint8Array, meldungen: Meldung[]): string {
  let text: string;
  let bom = false;
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    text = new TextDecoder('utf-8').decode(bytes.subarray(3)); bom = true;
  } else if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    text = new TextDecoder('utf-16le').decode(bytes.subarray(2)); bom = true;
  } else if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    text = new TextDecoder('utf-16be').decode(bytes.subarray(2)); bom = true;
  } else {
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      meldungen.push({ art: 'zeichensatz', satz: L('Die Datei war nicht in UTF-8. Bitte Umlaute prüfen.', 'The file was not in UTF-8. Please check the umlauts and accents.') });
      try { text = new TextDecoder('windows-1252').decode(bytes); }
      catch { text = Array.from(bytes, b => String.fromCharCode(b)).join(''); }
    }
  }
  if (text.charCodeAt(0) === 0xFEFF) { text = text.slice(1); bom = true; }
  if (bom) meldungen.push({ art: 'bom', satz: L('Das Kennzeichen am Dateianfang (BOM) wurde entfernt. Es gehört nicht zum Text.', 'The marker at the start of the file (BOM) was removed. It is not part of the text.') });
  return text;
}

/* ------------------------------------------------------------------ Zeitmarken */

const F4_MARKE = /#(\d{1,2}):(\d\d):(\d\d)-(\d)#/;
const F4_MARKE_ANFANG = /^\s*#(\d{1,2}):(\d\d):(\d\d)-(\d)#\s*/;
const F4_MARKE_ENDE = /\s*#(\d{1,2}):(\d\d):(\d\d)-(\d)#\s*$/;
const KLAMMER_MARKE_ANFANG = /^\s*[[(](\d{1,2}):(\d\d):(\d\d)[\])]\s*(?:-\s+)?/;
const NACKT_MARKE_ANFANG = /^\s*(\d{1,2}):(\d\d):(\d\d)(?![\d:])\s*/;

interface Marke { ms: number; hash: boolean; laenge: number }

/** Zeitmarke ganz am Anfang von `s` (f4 `#hh:mm:ss-d#`, `[hh:mm:ss]`, `(hh:mm:ss)`, `hh:mm:ss`). */
function markeAmAnfang(s: string): Marke | undefined {
  let m = ausf(F4_MARKE_ANFANG, s);
  if (m) return { ms: zeitMs(+m[1], +m[2], +m[3], +m[4] * 100), hash: true, laenge: m[0].length };
  m = ausf(KLAMMER_MARKE_ANFANG, s) ?? ausf(NACKT_MARKE_ANFANG, s);
  if (m) return { ms: zeitMs(+m[1], +m[2], +m[3]), hash: false, laenge: m[0].length };
  return undefined;
}

/* ------------------------------------------------------------------ Sprecher-Kennungen im Text */

const BEKANNTE_KENNUNG = /^(?:SPEAKER_\d+|S\d{2})$/;
const KENNUNG_ZEICHEN = /^[\p{L}\p{N}_.\- ]+$/u;

function gueltigeKennung(k: string): boolean {
  const t = k.trim();
  return t.length >= 1 && t.length <= 30 && KENNUNG_ZEICHEN.test(t) && !/^\d+$/.test(t);
}

/** `Kennung:` (gefolgt von Leerraum oder Zeilenende) nach einer optionalen Zeitmarke am Zeilenanfang. */
function zeilenKopf(zeile: string): { marke1?: Marke; kennung: string; marke2?: Marke; rest: string } | undefined {
  const m1 = markeAmAnfang(zeile);
  const nach1 = m1 ? zeile.slice(m1.laenge) : zeile;
  const k = ausf(/^\s*([^\s:][^:]{0,29}?):(?=\s|$)/, nach1);
  if (!k || !gueltigeKennung(k[1])) return undefined;
  const nach = nach1.slice(k[0].length);
  const m2 = markeAmAnfang(nach);
  return { marke1: m1, kennung: k[1].trim(), marke2: m2, rest: m2 ? nach.slice(m2.laenge) : nach };
}

/* ------------------------------------------------------------------ Text-Quellen (f4, reiner Text, noScribe-TXT, Word-Text) */

interface Zeile { t: string; von: number; ende: number }

function zeilenVon(text: string): Zeile[] {
  const r: Zeile[] = [];
  let pos = 0;
  while (pos <= text.length) {
    let e = text.indexOf('\n', pos);
    if (e < 0) e = text.length;
    let ende = e;
    if (ende > pos && text.charCodeAt(ende - 1) === 13) ende--;
    r.push({ t: text.slice(pos, ende), von: pos, ende });
    pos = e + 1;
  }
  return r;
}

interface Entwurf { sprecher?: string; start?: Marke; ende?: Marke; teile: string[]; von: number; bis: number }

function parseText(text: string, quelleVorgabe?: TranskriptRoh['quelle']): { beitraege: TranskriptBeitrag[]; quelle: TranskriptRoh['quelle']; meldungen: Meldung[] } {
  const meldungen: Meldung[] = [];
  let zeilen = zeilenVon(text);
  const noscribe = zeilen.slice(0, 15).some(z => /Transcribed with noScribe/i.test(z.t));
  if (noscribe) {
    // Kopfabsatz (Titel bis Sprache) ist kein Beitrag (Entscheid F5)
    let i = zeilen.findIndex(z => /noScribe/i.test(z.t));
    while (i < zeilen.length && (zeilen[i] as Zeile).t.trim() !== '') i++;
    zeilen = zeilen.slice(i);
  }
  const hatHash = F4_MARKE.test(text);

  // Welche Kennungen sind Sprecher? Bekannte Muster schon bei einem Vorkommen, freie Kennungen ab zwei (F12).
  const zaehler = new Map<string, number>();
  for (const z of zeilen) { const k = zeilenKopf(z.t); if (k) zaehler.set(k.kennung, (zaehler.get(k.kennung) ?? 0) + 1); }
  const sprecherKennungen = new Set([...zaehler].filter(([k, n]) => (BEKANNTE_KENNUNG.test(k) ? n >= 1 : n >= 2)).map(([k]) => k));

  const hatLeerzeile = zeilen.some((z, i) => z.t.trim() === '' && i > 0 && i < zeilen.length - 1 && zeilen.slice(0, i).some(x => x.t.trim() !== '') && zeilen.slice(i + 1).some(x => x.t.trim() !== ''));
  const jeZeile = sprecherKennungen.size === 0 && !hatLeerzeile;

  const entwuerfe: Entwurf[] = [];
  let offen: Entwurf | null = null;
  let letzterSprecher: string | undefined;
  for (const z of zeilen) {
    if (z.t.trim() === '') { offen = null; continue; }
    const kopf = zeilenKopf(z.t);
    const ist = kopf && sprecherKennungen.has(kopf.kennung) ? kopf : undefined;
    const lead = z.t.length - z.t.trimStart().length;
    const bis = z.von + z.t.trimEnd().length;
    if (ist) {
      offen = { sprecher: ist.kennung, start: ist.marke1 ?? ist.marke2, teile: [ist.rest], von: z.von + lead, bis };
      letzterSprecher = ist.kennung;
      entwuerfe.push(offen);
    } else if (offen && !jeZeile) {
      offen.teile.push(z.t.trim()); offen.bis = bis;
    } else {
      const m = markeAmAnfang(z.t);
      offen = { sprecher: sprecherKennungen.size > 0 ? letzterSprecher : undefined, start: m, teile: [m ? z.t.slice(m.laenge) : z.t], von: z.von + lead, bis };
      entwuerfe.push(offen);
    }
  }

  // Endmarke (nur f4) abziehen, Text zusammensetzen
  const ausgewertet = entwuerfe.map(e => {
    let t = e.teile.map(x => x.trim()).filter(x => x !== '').join(' ');
    const em = ausf(F4_MARKE_ENDE, t);
    if (em) { e.ende = { ms: zeitMs(+em[1], +em[2], +em[3], +em[4] * 100), hash: true, laenge: 0 }; t = t.slice(0, em.index); }
    return { e, text: platt(t) === '' ? '' : t.replace(/[ \t]+/g, ' ').trim() };
  });
  const behalten = ausgewertet.filter(x => x.text !== '');
  if (behalten.length < ausgewertet.length) {
    const n = ausgewertet.length - behalten.length;
    meldungen.push({ art: 'leer', satz: L(`${n} leere Beiträge wurden weggelassen.`, `${n} empty contributions were left out.`) });
  }

  const beitraege: TranskriptBeitrag[] = behalten.map(({ e, text: t }) => {
    const b: TranskriptBeitrag = { text: t, ort: { von: e.von, bis: e.bis } };
    if (e.sprecher !== undefined) b.sprecher = e.sprecher;
    return b;
  });

  // Zeiten
  const starts = behalten.map(x => x.e.start);
  const enden = behalten.map(x => x.e.ende);
  const n = beitraege.length;
  const hashStart = starts.filter(m => m?.hash).length;
  const hashEnde = enden.filter(m => m?.hash).length;
  if (hatHash && (hashStart > 0 || hashEnde > 0)) {
    if (hashEnde === 0 && hashStart > n / 2) {
      // F1: Marke am Absatzanfang
      beitraege.forEach((b, i) => { const m = starts[i]; if (m) b.zeitMs = m.ms; });
      beitraege.forEach((b, i) => { const nxt = beitraege[i + 1]; if (nxt?.zeitMs !== undefined) b.bisMs = nxt.zeitMs; });
    } else {
      if (hashStart > 0 && hashEnde > 0) meldungen.push({ art: 'zeitmarken-gemischt', satz: L('Die Zeitmarken stehen teils am Anfang, teils am Ende der Absätze. Es gilt die Marke am Ende als Ende des Beitrags.', 'The time marks are partly at the start and partly at the end of the paragraphs. The mark at the end is taken as the end of the contribution.') });
      let vorher: number | undefined = 0;
      beitraege.forEach((b, i) => {
        const e = enden[i];
        const s = starts[i];
        const z = s?.hash ? s.ms : vorher;
        if (z !== undefined) b.zeitMs = z;
        if (e) { b.bisMs = e.ms; vorher = e.ms; } else vorher = undefined;
      });
    }
  } else {
    beitraege.forEach((b, i) => { const m = starts[i]; if (m) b.zeitMs = m.ms; });
  }
  meldungRueckwaerts(beitraege, meldungen);

  const quelle: TranskriptRoh['quelle'] = quelleVorgabe ?? (noscribe ? 'noscribe' : hatHash ? 'f4' : 'text');
  return { beitraege, quelle, meldungen };
}

function meldungRueckwaerts(beitraege: TranskriptBeitrag[], meldungen: Meldung[]): void {
  let n = 0; let vor: number | undefined;
  for (const b of beitraege) {
    if (b.zeitMs === undefined) continue;
    if (vor !== undefined && b.zeitMs < vor) n++;
    vor = b.zeitMs;
  }
  if (n > 0) meldungen.push({ art: 'zeit-rueckwaerts', satz: L(`Die Zeit läuft ${n}-mal rückwärts. Die Reihenfolge wurde nicht geändert.`, `Time runs backwards ${n} time(s). The order was not changed.`) });
}

/* ------------------------------------------------------------------ aTrain (TXT, JSON) */

function parseAtrainTxt(text: string): { beitraege: TranskriptBeitrag[]; meldungen: Meldung[] } {
  const meldungen: Meldung[] = [];
  const zeilen = zeilenVon(text).map(z => z.t);
  let start = zeilen.findIndex(z => z.trim() !== '');
  if (start >= 0 && /^Transcription for\b/.test((zeilen[start] ?? '').trim())) start++; else if (start < 0) start = zeilen.length;
  const bloecke: string[][] = [];
  let akt: string[] = [];
  for (const z of zeilen.slice(start)) {
    if (z.trim() === '') { if (akt.length) bloecke.push(akt); akt = []; } else akt.push(z.trim());
  }
  if (akt.length) bloecke.push(akt);
  const SPRECHERZEILE = /^(SPEAKER_\d+|Speaker undefined)$/;
  const mitSprecher = bloecke.some(b => SPRECHERZEILE.test(b[0] ?? ''));
  const MARKE = /\[(\d{1,2}):(\d\d):(\d\d)\]\s*-\s*/g;
  const beitraege: TranskriptBeitrag[] = [];
  const bauen = (sprecher: string | undefined, zeilenText: string[]) => {
    const roh = zeilenText.join(' ');
    const erste = ausf(/\[(\d{1,2}):(\d\d):(\d\d)\]\s*-\s*/, roh);
    const t = platt(roh.replace(MARKE, ' '));
    if (t === '') return;
    const b: TranskriptBeitrag = { text: t };
    if (sprecher !== undefined) b.sprecher = sprecher;
    if (erste) b.zeitMs = zeitMs(+erste[1], +erste[2], +erste[3]);
    beitraege.push(b);
  };
  if (mitSprecher) {
    for (const b of bloecke) {
      if (SPRECHERZEILE.test(b[0] ?? '')) bauen(b[0], b.slice(1)); else bauen(undefined, b);
    }
  } else {
    for (const b of bloecke) for (const z of b) bauen(undefined, [z]);   // F4: ein Beitrag je nichtleere Zeile
  }
  meldungRueckwaerts(beitraege, meldungen);
  return { beitraege, meldungen };
}

interface Schnitt { sprecher?: string; von: number; bis: number; text: string }

/** Fasst Schnitte (Cues, Segmente) zu Beiträgen zusammen (Fachblatt: Regeln, F10, F11). */
function zusammenfassen(cues: Schnitt[], zus: boolean, meldungen: Meldung[]): TranskriptBeitrag[] {
  const r: TranskriptBeitrag[] = [];
  let rueck = 0;
  let vor: Schnitt | undefined;
  for (const c of cues) {
    const letzter = r[r.length - 1];
    let verbinden = false;
    if (vor && c.von < vor.von) rueck++;
    else if (zus && letzter && vor) {
      if (c.sprecher !== undefined || vor.sprecher !== undefined) verbinden = c.sprecher === vor.sprecher;
      else verbinden = c.von - vor.bis <= 2000;
    }
    if (verbinden && letzter) {
      letzter.text = `${letzter.text} ${c.text}`;
      letzter.bisMs = c.bis;
    } else {
      const b: TranskriptBeitrag = { text: c.text, zeitMs: c.von, bisMs: c.bis };
      if (c.sprecher !== undefined) b.sprecher = c.sprecher;
      r.push(b);
    }
    vor = c;
  }
  if (rueck > 0) meldungen.push({ art: 'zeit-rueckwaerts', satz: L(`Die Zeit läuft ${rueck}-mal rückwärts. Die Beiträge wurden nicht zusammengefasst und nicht umsortiert.`, `Time runs backwards ${rueck} time(s). The contributions were not merged or re-ordered.`) });
  return r;
}

function parseAtrainJson(daten: unknown, zus: boolean): { beitraege: TranskriptBeitrag[]; meldungen: Meldung[] } | undefined {
  const liste = Array.isArray(daten) ? daten : (daten && typeof daten === 'object' ? (daten as { segments?: unknown }).segments : undefined);
  if (!Array.isArray(liste)) return undefined;
  const meldungen: Meldung[] = [];
  const cues: Schnitt[] = [];
  let leere = 0;
  for (const s of liste) {
    if (!s || typeof s !== 'object') continue;
    const o = s as Record<string, unknown>;
    if (typeof o.text !== 'string' || typeof o.start !== 'number' || typeof o.end !== 'number') continue;
    const t = platt(o.text);
    if (t === '') { leere++; continue; }
    let sp = typeof o.speaker === 'string' ? o.speaker : undefined;
    if (sp === undefined && Array.isArray(o.words)) {
      const w = o.words.find(x => x && typeof x === 'object' && typeof (x as { speaker?: unknown }).speaker === 'string') as { speaker: string } | undefined;
      sp = w?.speaker;
    }
    cues.push({ sprecher: sp, von: Math.round(o.start * 1000), bis: Math.round(o.end * 1000), text: t });
  }
  if (leere > 0) meldungen.push({ art: 'leer', satz: L(`${leere} leere Beiträge wurden weggelassen.`, `${leere} empty contributions were left out.`) });
  return { beitraege: zusammenfassen(cues, zus, meldungen), meldungen };
}

/* ------------------------------------------------------------------ WebVTT und SRT */

const CUE_ZEIT = /^\s*(?:(\d{1,3}):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d{1,3}):)?(\d{2}):(\d{2})[.,](\d{3})/;

function parseUntertitel(text: string, srt: boolean, zus: boolean): { beitraege: TranskriptBeitrag[]; quelle: TranskriptRoh['quelle']; meldungen: Meldung[] } {
  const meldungen: Meldung[] = [];
  const bloecke = text.replace(/\r\n?/g, '\n').split(/\n{2,}/);
  let kopf = '';
  let noscribe = false;
  let hatV = false;
  interface RohCue { von: number; bis: number; zeilen: string[]; sprecher?: string }
  const cues: RohCue[] = [];
  for (let i = 0; i < bloecke.length; i++) {
    const zeilen = (bloecke[i] ?? '').split('\n');
    const z0 = zeilen[0] ?? '';
    if (!srt && i === 0 && /^WEBVTT/.test(z0)) { kopf = zeilen.join(' '); if (/noscribe/i.test(kopf)) noscribe = true; if (!zeilen.some(z => CUE_ZEIT.test(z))) continue; }
    if (/^(NOTE)(\s|$)/.test(z0)) { if (/noscribe/i.test(zeilen.join(' '))) noscribe = true; continue; }
    if (/^(STYLE|REGION)\s*$/.test(z0.trim())) continue;
    const zi = zeilen.findIndex(z => CUE_ZEIT.test(z));
    if (zi < 0 || zi > 1) continue;
    const m = ausf(CUE_ZEIT, zeilen[zi] ?? '') as Gr;
    const von = zeitMs(+(m[1] ?? 0), +m[2], +m[3], +m[4]);
    const bis = zeitMs(+(m[5] ?? 0), +m[6], +m[7], +m[8]);
    cues.push({ von, bis, zeilen: zeilen.slice(zi + 1) });
  }
  // Sprecher: <v Name> (Teams, noScribe); sonst Muster "Name: Text" in den meisten Cues (Zoom)
  for (const c of cues) {
    const v = ausf(/<v(?:\.[^\s>]*)?\s+([^>]*)>/, c.zeilen.join('\n'));
    if (v) { hatV = true; c.sprecher = platt(entities(v[1])) || undefined; }
  }
  const inhalt = (c: RohCue): string => platt(entities(c.zeilen.map(z => z.replace(/<[^>]*>/g, '')).join(' ')));
  const nichtLeer = cues.filter(c => inhalt(c) !== '');
  let zoom = false;
  if (!hatV && !noscribe) {
    const treffer = nichtLeer.filter(c => { const k = ausf(/^([^:]{1,30}):\s+\S/, (c.zeilen[0] ?? '').replace(/<[^>]*>/g, '').trim()); return !!k && gueltigeKennung(k[1]); });
    zoom = treffer.length >= 2 && treffer.length >= 0.6 * nichtLeer.length;
  }
  const schnitte: Schnitt[] = [];
  let leere = cues.length - nichtLeer.length;
  for (const c of nichtLeer) {
    let t = inhalt(c);
    let sprecher = c.sprecher;
    if (zoom) {
      const k = ausf(/^([^:]{1,30}):\s+(.*)$/, t);
      if (k && gueltigeKennung(k[1])) { sprecher = k[1].trim(); t = k[2]; }
    }
    if (t === '') { leere++; continue; }
    schnitte.push({ sprecher, von: c.von, bis: c.bis, text: t });
  }
  if (leere > 0) meldungen.push({ art: 'leer', satz: L(`${leere} leere Beiträge wurden weggelassen.`, `${leere} empty contributions were left out.`) });
  const beitraege = zusammenfassen(schnitte, zus, meldungen);
  const quelle: TranskriptRoh['quelle'] = srt ? 'srt' : noscribe ? 'noscribe' : hatV ? 'teams' : zoom ? 'zoom' : 'vtt';
  return { beitraege, quelle, meldungen };
}

/* ------------------------------------------------------------------ HTML (noScribe) ohne DOM */

interface HtmlAbsatz { anker: { name?: string; text: string }[]; lose: string }

function htmlAbsaetze(html: string): HtmlAbsatz[] {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<(script|style|head|noscript|template|svg|object|iframe)\b[\s\S]*?<\/\1\s*>/gi, ' ');
  s = s.replace(/<(script|style|head|noscript|template|svg|object|iframe)\b[\s\S]*$/i, ' ');
  const absaetze: HtmlAbsatz[] = [];
  let ab: HtmlAbsatz = { anker: [], lose: '' };
  let anker: { name?: string; text: string } | null = null;
  const schliesse = () => { if (anker) { ab.anker.push(anker); anker = null; } if (ab.anker.length || ab.lose.trim()) absaetze.push(ab); ab = { anker: [], lose: '' }; };
  const hinzu = (t: string) => { if (anker) anker.text += t; else ab.lose += t; };
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|([^<]+)|</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[4] !== undefined) { hinzu(entities(m[4])); continue; }
    if (m[2] === undefined) continue;
    const tag = m[2].toLowerCase();
    const zu = m[1] === '/';
    if (tag === 'a') {
      if (zu) { if (anker) { ab.anker.push(anker); anker = null; } }
      else {
        if (anker) ab.anker.push(anker);
        const n = ausf(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/i, m[3] ?? '');
        anker = { name: n ? (n[1] ?? n[2]) : undefined, text: '' };
      }
    } else if (tag === 'br') hinzu(' ');
    else if (['p', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'body', 'table', 'ul', 'ol', 'blockquote'].includes(tag)) schliesse();
    else hinzu(' ');   // span u. a.: nur der Inhalt zählt; ein Leerzeichen wird später zusammengezogen
  }
  schliesse();
  return absaetze;
}

function parseHtml(html: string, zus: boolean): { beitraege: TranskriptBeitrag[]; quelle: TranskriptRoh['quelle']; meldungen: Meldung[]; text?: string } {
  const meldungen: Meldung[] = [];
  const absaetze = htmlAbsaetze(html);
  const noscribe = /noScribe/i.test(html.slice(0, 20000));
  const ANKER = /^ts_(\d+)_(\d+)_(.*)$/;
  const hatAnker = absaetze.some(a => a.anker.some(x => x.name && ANKER.test(x.name)));
  if (!hatAnker) {
    const t = absaetze.map(a => platt(a.lose + a.anker.map(x => x.text).join(''))).filter(x => x !== '').join('\n\n');
    const r = parseText(t, noscribe ? 'noscribe' : 'text');
    return { beitraege: r.beitraege, quelle: r.quelle, meldungen: r.meldungen, text: t };
  }
  void zus;
  const beitraege: TranskriptBeitrag[] = [];
  let ueberlappung = 0;
  for (const a of absaetze) {
    let akt: TranskriptBeitrag | null = null;
    let aktText = '';
    const fertig = () => { if (akt) { const t = platt(aktText); if (t !== '') { akt.text = t; beitraege.push(akt); } } akt = null; aktText = ''; };
    for (const x of a.anker) {
      const n = x.name ? ausf(ANKER, x.name) : null;
      if (!n) { if (akt) aktText += x.text; continue; }
      let sp = n[3];
      if (sp.startsWith('//')) { ueberlappung++; sp = sp.slice(2); }
      const von = +n[1]; const bis = +n[2];
      let t = x.text.replace(/^\s*\/\/\s*/, '');
      if (sp !== '') t = t.replace(new RegExp(`^\\s*${sp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*`), '');
      t = t.replace(/^\s*\[\d{1,2}:\d\d:\d\d\]\s*/, '');
      const spr = sp === '' ? undefined : sp;
      if (!akt || (akt as TranskriptBeitrag).sprecher !== spr) {
        fertig();
        akt = { zeitMs: von, bisMs: bis, text: '' };
        if (spr !== undefined) akt.sprecher = spr;
      } else akt.bisMs = bis;
      aktText += t;
    }
    fertig();
  }
  if (ueberlappung > 0) meldungen.push({ art: 'ueberlappung', satz: L(`${ueberlappung} Überlappungen (gleichzeitiges Sprechen) wurden als eigene Beiträge übernommen.`, `${ueberlappung} overlaps (simultaneous speech) were taken over as separate contributions.`) });
  meldungRueckwaerts(beitraege, meldungen);
  return { beitraege, quelle: noscribe ? 'noscribe' : 'text', meldungen };
}

/* ------------------------------------------------------------------ Word (.docx) */

export function docxText(bytes: Uint8Array): string | undefined {
  let dateien: Record<string, Uint8Array>;
  try {
    dateien = unzipSync(bytes, { filter: f => f.name === 'word/document.xml' && f.originalSize <= 64 * 1048576 });
  } catch { return undefined; }
  const doc = dateien['word/document.xml'];
  if (!doc) return undefined;
  const xml = new TextDecoder('utf-8').decode(doc);
  const absaetze: string[] = [];
  const reAbsatz = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>|<w:p(?:\s[^>]*)?\/>/g;
  let m: RegExpExecArray | null;
  while ((m = reAbsatz.exec(xml))) {
    let t = '';
    const inhalt = m[1] ?? '';
    const reTeil = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:t(?:\s[^>]*)?\/>|<w:tab\s*\/>|<w:br\s*\/>|<w:cr\s*\/>/g;
    let n: RegExpExecArray | null;
    while ((n = reTeil.exec(inhalt))) {
      if (n[0].startsWith('<w:tab')) t += '\t';
      else if (n[0].startsWith('<w:br') || n[0].startsWith('<w:cr')) t += ' ';
      else t += entities(n[1] ?? '');
    }
    absaetze.push(t);
  }
  return absaetze.join('\n');
}

/* ------------------------------------------------------------------ Einstieg */

/** Liest eine Transkript-Datei, erkennt das Format und zerlegt sie in Beiträge. Nichts wird ausgeführt. */
export async function leseTranskript(name: string, bytes: Uint8Array, optionen: LeseOptionen = {}): Promise<TranskriptRoh> {
  const zus = optionen.zusammenfassen !== false;
  if (bytes.length > MAX_TRANSKRIPT_BYTES) {
    return leer('text', [{ art: 'zu-gross', satz: L('Die Datei ist größer als 20 MB. Sie wurde nicht gelesen.', 'The file is larger than 20 MB. It was not read.') }]);
  }
  const meldungen: Meldung[] = [];

  // RTF (f4 kann auch Word und Text): wird nicht gelesen
  if (bytes.length > 5 && bytes[0] === 0x7B && bytes[1] === 0x5C && bytes[2] === 0x72 && bytes[3] === 0x74 && bytes[4] === 0x66) {
    return leer('text', [{ art: 'rtf', satz: L('Bitte in f4 als Word oder Text exportieren.', 'Please export from f4 as Word or text.') }]);
  }

  // Word: ZIP-Kennung
  if (bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4B) {
    const t = docxText(bytes);
    if (t === undefined) {
      return leer('docx', [{ art: 'unlesbar', satz: L('Die Word-Datei konnte nicht gelesen werden. Bitte als Text (.txt) oder Word (.docx) neu speichern.', 'The Word file could not be read. Please save it again as text (.txt) or Word (.docx).') }]);
    }
    const r = parseText(t, 'docx');
    return { quelle: 'docx', beitraege: r.beitraege.map(b => ({ sprecher: b.sprecher, zeitMs: b.zeitMs, bisMs: b.bisMs, text: b.text } as TranskriptBeitrag)).map(sauber), meldungen: [...meldungen, ...r.meldungen] };
  }

  const text = dekodiere(bytes, meldungen);
  const kopf = text.slice(0, 2000);
  const klein = name.toLowerCase();

  if (istElan(text, klein)) {
    const r = parseElan(text);
    return { quelle: 'elan', beitraege: r.beitraege, meldungen: [...meldungen, ...r.meldungen] };
  }
  if (istChat(text, klein)) {
    const r = parseChat(text);
    return { quelle: 'chat', beitraege: r.beitraege, meldungen: [...meldungen, ...r.meldungen] };
  }
  if (/^\s*WEBVTT/.test(kopf)) {
    const r = parseUntertitel(text, false, zus);
    return { quelle: r.quelle, beitraege: r.beitraege, meldungen: [...meldungen, ...r.meldungen] };
  }
  if (/\d{2}:\d{2}:\d{2},\d{3}\s*-->/.test(kopf)) {
    const r = parseUntertitel(text, true, zus);
    return { quelle: 'srt', beitraege: r.beitraege, meldungen: [...meldungen, ...r.meldungen] };
  }
  const t0 = text.trimStart();
  if (t0.startsWith('{') || t0.startsWith('[')) {
    let daten: unknown;
    try { daten = JSON.parse(text); } catch { daten = undefined; }
    if (daten !== undefined) {
      const r = parseAtrainJson(daten, zus);
      if (r) return { quelle: 'atrain', beitraege: r.beitraege, meldungen: [...meldungen, ...r.meldungen] };
    }
  }
  if (/^\s*<(?:!DOCTYPE|html|\?xml)/i.test(kopf) || klein.endsWith('.html') || klein.endsWith('.htm')) {
    const r = parseHtml(text, zus);
    return { quelle: r.quelle, beitraege: r.beitraege, meldungen: [...meldungen, ...r.meldungen], ...(r.text !== undefined ? { text: r.text } : {}) };
  }
  if (/^\s*Transcription for\b/.test(kopf)) {
    const r = parseAtrainTxt(text);
    return { quelle: 'atrain', beitraege: r.beitraege, meldungen: [...meldungen, ...r.meldungen] };
  }
  const r = parseText(text);
  return { quelle: r.quelle, beitraege: r.beitraege, meldungen: [...meldungen, ...r.meldungen], text };
}

function sauber(b: TranskriptBeitrag): TranskriptBeitrag {
  const r: TranskriptBeitrag = { text: b.text };
  if (b.sprecher !== undefined) r.sprecher = b.sprecher;
  if (b.zeitMs !== undefined) r.zeitMs = b.zeitMs;
  if (b.bisMs !== undefined) r.bisMs = b.bisMs;
  return r;
}

/** SHA-256 als Hexfolge (für `Dokument.datei.sha256` und `medium.sha256`). */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const kopie = new Uint8Array(bytes);
  const h = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', kopie));
  return Array.from(h, b => b.toString(16).padStart(2, '0')).join('');
}

/* ------------------------------------------------------------------ Sprecher zuordnen */

/** Schlägt Namen und Rollen vor. Es werden nie echte Namen geraten oder aus dem Inhalt gelesen. */
export function vorschlagZuordnung(roh: TranskriptRoh): SprecherZuordnung {
  const kennungen: string[] = [];
  for (const b of roh.beitraege) if (b.sprecher !== undefined && !kennungen.includes(b.sprecher)) kennungen.push(b.sprecher);
  let person = 0;
  const personen: SprecherPerson[] = kennungen.map(k => {
    if (/^(?:SPEAKER_\d+|S\d{2})$/.test(k)) { person++; return { kennung: k, name: L(`Person ${person}`, `Person ${person}`), rolle: 'andere' as SprecherRolle }; }
    let m = /^I(\d*)$/.exec(k);
    if (m) return { kennung: k, name: m[1] ? L(`Interviewer/in ${m[1]}`, `Interviewer ${m[1]}`) : L('Interviewer/in', 'Interviewer'), rolle: 'interview' as SprecherRolle };
    m = /^B(\d*)$/.exec(k);
    if (m) return { kennung: k, name: m[1] ? L(`Befragte Person ${m[1]}`, `Respondent ${m[1]}`) : L('Befragte Person', 'Respondent'), rolle: 'befragt' as SprecherRolle };
    return { kennung: k, name: k, rolle: 'andere' as SprecherRolle };
  });
  return { faelle: 'dokument', personen };
}

/* ------------------------------------------------------------------ Dokument bauen */

const neueId = (): string => globalThis.crypto.randomUUID();

export interface TranskriptErgebnis {
  dokument: Dokument;
  /** Neue Fälle (in das Projekt aufnehmen) */
  faelle: Fall[];
  /** Variablen, die für die Fälle nötig sind (`Rolle`); leer, wenn keine Fälle aus Sprechern entstehen */
  variablen: Variable[];
}

/**
 * Baut aus der Zerlegung und der Zuordnung ein Dokument.
 * - Strukturierte Quellen (VTT, SRT, HTML, JSON, Word, aTrain-TXT): Text neu gebaut, je Beitrag `Name: Inhalt`, getrennt durch eine Leerzeile; Zeiten nur in `abschnitte`.
 * - f4 und reiner Text mit übergebenem (oder in `roh.text` mitgeliefertem) Text: der Text bleibt, wie er in der Datei steht; `abschnitte` zeigen hinein.
 * Positionen sind Codepoints, Ende exklusiv.
 */
export function transkriptDokument(roh: TranskriptRoh, zuordnung: SprecherZuordnung, name: string, rohText?: string, datei?: { name: string; sha256: string }): TranskriptErgebnis {
  // Personen (zusammengelegte Kennungen sind eine Person)
  const nachKennung = new Map<string, SprecherPerson>();
  for (const p of zuordnung.personen) nachKennung.set(p.kennung, p);
  const wurzel = (k: string): string => { const seen = new Set<string>(); let c = k; while (true) { const p = nachKennung.get(c); if (!p?.gleichWie || seen.has(c) || !nachKennung.has(p.gleichWie)) return c; seen.add(c); c = p.gleichWie; } };
  const sprecher: TranskriptSprecher[] = [];
  const idVonWurzel = new Map<string, string>();
  const sprecherFuer = (kennung: string | undefined): string | undefined => {
    if (kennung === undefined) return undefined;
    const w = wurzel(kennung);
    let id = idVonWurzel.get(w);
    if (!id) {
      id = neueId(); idVonWurzel.set(w, id);
      const p = nachKennung.get(w);
      const s: TranskriptSprecher = { id, name: p?.name ?? w };
      if (p) s.rolle = p.rolle;
      sprecher.push(s);
    }
    return id;
  };
  const anzeigename = (kennung: string): string => nachKennung.get(wurzel(kennung))?.name ?? kennung;

  const quelltext = rohText ?? roh.text;
  const behalten = (roh.quelle === 'f4' || roh.quelle === 'text') && quelltext !== undefined && roh.beitraege.every(b => b.ort !== undefined);
  let text: string;
  const abschnitte: TranskriptAbschnitt[] = [];
  if (behalten) {
    text = quelltext as string;
    const karte = positionsKarte(text);
    for (const b of roh.beitraege) {
      const ort = b.ort as { von: number; bis: number };
      const a: TranskriptAbschnitt = { start: utf16ZuCp(karte, ort.von), ende: utf16ZuCp(karte, ort.bis) };
      const sid = sprecherFuer(b.sprecher); if (sid) a.sprecher = sid;
      if (b.zeitMs !== undefined) a.zeitMs = b.zeitMs;
      if (b.bisMs !== undefined) a.bisMs = b.bisMs;
      abschnitte.push(a);
    }
  } else {
    const teile: string[] = [];
    let pos = 0;
    for (const b of roh.beitraege) {
      const zeile = b.sprecher !== undefined ? `${anzeigename(b.sprecher)}: ${b.text}` : b.text;
      const a: TranskriptAbschnitt = { start: pos, ende: pos + cpLaenge(zeile) };
      const sid = sprecherFuer(b.sprecher); if (sid) a.sprecher = sid;
      if (b.zeitMs !== undefined) a.zeitMs = b.zeitMs;
      if (b.bisMs !== undefined) a.bisMs = b.bisMs;
      abschnitte.push(a);
      teile.push(zeile);
      pos = a.ende + 2;
    }
    text = teile.join('\n\n');
  }

  // Personen ohne Beitrag trotzdem als Sprecher führen? Nein: nur wer vorkommt (vorschlagZuordnung kennt nur Vorkommende).
  const jetzt = Date.now();
  const dokument: Dokument = { id: neueId(), name, art: 'text', text, transkript: { sprecher, abschnitte, quelle: roh.quelle }, erstellt: jetzt, geaendert: jetzt };
  if (datei) dokument.datei = datei;

  const faelle: Fall[] = [];
  const variablen: Variable[] = [];
  if (zuordnung.faelle === 'dokument') {
    const f: Fall = { id: neueId(), name, werte: {} };
    faelle.push(f); dokument.fall = f.id;
  } else {
    for (const s of sprecher) {
      if (s.rolle !== 'befragt') continue;
      const f: Fall = { id: neueId(), name: s.name, werte: { Rolle: 'befragt' } };
      faelle.push(f); s.fall = f.id;
    }
    if (faelle.length > 0) variablen.push({ id: neueId(), name: 'Rolle', typ: 'text' });
  }
  return { dokument, faelle, variablen };
}
