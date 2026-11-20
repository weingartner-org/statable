/**
 * Transkripte aus CHAT (CHILDES/CLAN, `.cha`) und ELAN (`.eaf`) lesen (B5, Teil 1).
 * Gleiches Modell wie die übrigen Leser (`TranskriptBeitrag`): Sprecher, Zeit, Text.
 * Nichts wird ausgeführt; XML wird mit Mustern gelesen (kein DOMParser, keine Entity-Erweiterung von außen).
 * Nur das Hauptgespräch kommt in den Text; Hilfszeilen (%mor, %gra, Referenz-Ebenen) werden gezählt und gemeldet.
 */
import { L } from './sitzung.svelte';
import type { TranskriptBeitrag, TranskriptRoh } from './transkript-lesen';

type Meldung = TranskriptRoh['meldungen'][number];

const platt = (s: string): string => s.replace(/\s+/g, ' ').trim();

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function xmlText(s: string): string {
  return s.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z]{2,5}));/g, (voll: string, d?: string, h?: string, n?: string): string => {
    if (n) return NAMED[n] ?? voll;
    const c = d ? parseInt(d, 10) : parseInt(h ?? '', 16);
    if (!Number.isFinite(c) || c > 0x10FFFF || (c >= 0xD800 && c <= 0xDFFF) || c === 0) return voll;
    return String.fromCodePoint(c);
  });
}

/* ------------------------------------------------------------------ CHAT */

/** Zeitband CHAT: NAK-Zeichen, `von_bis` in Millisekunden. */
const CHAT_BAND = /\u0015(\d+)_(\d+)\u0015/;

export function istChat(text: string, name: string): boolean {
  return /^\s*@(?:UTF8|Begin)\b/m.test(text.slice(0, 2000)) || (/\.cha$/i.test(name) && /^\*[A-Za-z0-9_]{1,7}:\t/m.test(text));
}

export function parseChat(text: string): { beitraege: TranskriptBeitrag[]; meldungen: Meldung[] } {
  const meldungen: Meldung[] = [];
  const beitraege: TranskriptBeitrag[] = [];
  // Fortsetzungszeilen beginnen mit Tabulator und gehören zur Zeile davor.
  const zeilen: string[] = [];
  for (const z of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\t/.test(z) && zeilen.length > 0) zeilen[zeilen.length - 1] += ' ' + z.trim();
    else zeilen.push(z);
  }
  const namen = new Map<string, string>();
  let hilfszeilen = 0;
  for (const z of zeilen) {
    const p = /^@Participants:\t(.*)$/.exec(z);
    if (p) {
      for (const teil of (p[1] ?? '').split(',')) {
        const w = teil.trim().split(/\s+/);
        if (w[0]) namen.set(w[0], w[2] ?? w[1] ?? w[0]);
      }
    }
  }
  for (const z of zeilen) {
    if (z.startsWith('%')) { hilfszeilen++; continue; }
    const m = /^\*([A-Za-z0-9_]{1,7}):\t(.*)$/.exec(z);
    if (!m) continue;
    const kennung = m[1] ?? '';
    let roh = m[2] ?? '';
    let von: number | undefined;
    let bis: number | undefined;
    const b = CHAT_BAND.exec(roh);
    if (b) { von = parseInt(b[1] ?? '0', 10); bis = parseInt(b[2] ?? '0', 10); }
    roh = roh.replace(/\u0015\d+_\d+\u0015/g, ' ');
    const t = platt(roh);
    if (t === '') continue;
    const bt: TranskriptBeitrag = { sprecher: kennung, text: t };
    if (von !== undefined) bt.zeitMs = von;
    if (bis !== undefined) bt.bisMs = bis;
    beitraege.push(bt);
  }
  if (hilfszeilen > 0) {
    meldungen.push({
      art: 'chat-hilfszeilen',
      satz: L(
        `${hilfszeilen} Hilfszeilen (%mor, %gra und ähnliche) wurden nicht übernommen. CHAT-Zeichen wie „xxx“ oder „&=lacht“ bleiben im Text stehen.`,
        `${hilfszeilen} dependent lines (%mor, %gra and similar) were not taken over. CHAT symbols such as "xxx" or "&=laughs" stay in the text.`,
      ),
    });
  }
  if (beitraege.length === 0) {
    meldungen.push({ art: 'chat-leer', satz: L('In der CHAT-Datei wurde keine Sprecherzeile (*XXX:) gefunden.', 'No speaker line (*XXX:) was found in the CHAT file.') });
  }
  return { beitraege, meldungen };
}

/* ------------------------------------------------------------------ ELAN */

export function istElan(text: string, name: string): boolean {
  return /<ANNOTATION_DOCUMENT\b/.test(text.slice(0, 4000)) || (/\.eaf$/i.test(name) && /<TIER\b/.test(text));
}

function attr(tag: string, n: string): string | undefined {
  const m = new RegExp(`\\b${n}="([^"]*)"`).exec(tag);
  return m ? xmlText(m[1] ?? '') : undefined;
}

export function parseElan(text: string): { beitraege: TranskriptBeitrag[]; meldungen: Meldung[] } {
  const meldungen: Meldung[] = [];
  const zeiten = new Map<string, number>();
  for (const m of text.matchAll(/<TIME_SLOT\b[^>]*>/g)) {
    const id = attr(m[0], 'TIME_SLOT_ID');
    const v = attr(m[0], 'TIME_VALUE');
    if (id && v !== undefined && /^\d+$/.test(v)) zeiten.set(id, parseInt(v, 10));
  }
  const rohe: { sprecher: string; von?: number; bis?: number; text: string }[] = [];
  let abhaengig = 0;
  for (const tm of text.matchAll(/<TIER\b([^>]*)>([\s\S]*?)<\/TIER>/g)) {
    const kopf = tm[1] ?? '';
    const tid = attr(kopf, 'TIER_ID') ?? '?';
    // Ebenen mit Eltern (PARENT_REF) sind Hilfsebenen (Glossen, Übersetzung); sie bleiben draußen.
    if (attr(kopf, 'PARENT_REF') !== undefined) { abhaengig++; continue; }
    const sprecher = attr(kopf, 'PARTICIPANT') || tid;
    for (const a of (tm[2] ?? '').matchAll(/<ALIGNABLE_ANNOTATION\b([^>]*)>([\s\S]*?)<\/ALIGNABLE_ANNOTATION>/g)) {
      const w = /<ANNOTATION_VALUE>([\s\S]*?)<\/ANNOTATION_VALUE>/.exec(a[2] ?? '');
      const t = platt(xmlText(w?.[1] ?? ''));
      if (t === '') continue;
      const r1 = attr(a[1] ?? '', 'TIME_SLOT_REF1');
      const r2 = attr(a[1] ?? '', 'TIME_SLOT_REF2');
      const e: { sprecher: string; von?: number; bis?: number; text: string } = { sprecher, text: t };
      const von = r1 !== undefined ? zeiten.get(r1) : undefined;
      const bis = r2 !== undefined ? zeiten.get(r2) : undefined;
      if (von !== undefined) e.von = von;
      if (bis !== undefined) e.bis = bis;
      rohe.push(e);
    }
  }
  // In Zeitreihenfolge bringen (stabil: gleiche Zeit behält die Ebenen-Reihenfolge).
  const geordnet = rohe.map((e, i) => ({ e, i })).sort((x, y) => (x.e.von ?? Infinity) - (y.e.von ?? Infinity) || x.i - y.i).map(x => x.e);
  const beitraege: TranskriptBeitrag[] = geordnet.map(e => {
    const b: TranskriptBeitrag = { sprecher: e.sprecher, text: e.text };
    if (e.von !== undefined) b.zeitMs = e.von;
    if (e.bis !== undefined) b.bisMs = e.bis;
    return b;
  });
  if (abhaengig > 0) {
    meldungen.push({
      art: 'elan-hilfsebenen',
      satz: L(
        `${abhaengig} abhängige Ebenen (Glossen, Übersetzungen) wurden nicht übernommen. Es zählen nur die Hauptebenen.`,
        `${abhaengig} dependent tiers (glosses, translations) were not taken over. Only the main tiers count.`,
      ),
    });
  }
  if (beitraege.length === 0) {
    meldungen.push({ art: 'elan-leer', satz: L('In der ELAN-Datei wurde keine beschriftete Zeitspanne gefunden.', 'No annotated time span was found in the ELAN file.') });
  }
  return { beitraege, meldungen };
}
