/**
 * Eigene Lernpfade (rein, ohne Oberfläche): Name und Liste von Einheiten-Kennungen. Ein Pfad hat keinen eigenen Lernstand, der hängt an der Einheit.
 * Gespeichert nur in diesem Browser; geteilt wird als Link mit einem Code (`kodiere`/`dekodiere`), nichts geht an einen Server.
 * Alles, was aus einem Link oder aus dem Speicher kommt, ist fremd: Name als Text bereinigt und gekürzt, Kennungen nur aus dem erlaubten Zeichensatz.
 */
import { DYNAMISCH, einheitNach, type Einheit, type Pfad } from './lernplan';

/**
 * Übungsblatt (V3, Lehrende): einzeln gewählte Fragen statt des zufällig zusammengestellten Abschlusstests.
 * `mischen`: Reihenfolge der Fragen (und im Druck der Antworten) gemischt; `minuten`: vorgesehene Zeit, nur ein Hinweis, es läuft keine Uhr. Keine Noten.
 */
export interface Blatt { fragen: string[]; mischen?: true; minuten?: number }
/** `pruefung`: Abschlussprüfung aus allen Einheiten. Nur ausdrücklich `false` heißt aus; ohne Angabe (alte Pfade, alte Links) gilt „an“. Mit `blatt` gibt es den Test immer, aus den gewählten Fragen. */
export interface EigenerPfad { id: string; name: string; einheiten: string[]; pruefung?: boolean; blatt?: Blatt }

export const MAX_NAME = 60;
export const MAX_EINHEITEN = 300;
export const MAX_PFADE = 30;
export const MAX_FRAGEN = 80;
export const MAX_MINUTEN = 240;
/** Länger ist kein Code, den Statable selbst gemacht hat. */
const MAX_CODE = 9000;
const KENNUNG = /^[a-z0-9][a-z0-9-]{0,59}$/;
const EIGENE_ID = /^mein-[a-z0-9]{1,12}$/;

export const bereinigeName = (s: unknown): string =>
  typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME).trim() : '';

/** Nur gültig geformte, nicht doppelte Kennungen, höchstens `MAX_EINHEITEN`; mit `bekannt` zusätzlich nur solche, die es gibt (der Rest steht in `unbekannt`). */
export function pruefeKennungen(ids: unknown, bekannt?: (id: string) => boolean): { gut: string[]; unbekannt: string[] } {
  const gut: string[] = [], unbekannt: string[] = [], gesehen = new Set<string>();
  if (!Array.isArray(ids)) return { gut, unbekannt };
  for (const i of ids) {
    if (typeof i !== 'string' || !KENNUNG.test(i) || gesehen.has(i)) continue;
    gesehen.add(i);
    if (bekannt && !bekannt(i)) { unbekannt.push(i); continue; }
    if (gut.length < MAX_EINHEITEN) gut.push(i);
  }
  return { gut, unbekannt };
}

/**
 * Übungsblatt aus fremder Quelle (Link, Speicher): Fragen-Kennungen wie Einheiten-Kennungen geprüft, höchstens `MAX_FRAGEN`;
 * Minuten nur als ganze Zahl von 1 bis `MAX_MINUTEN`, sonst weg. Ohne eine Frage gibt es kein Blatt.
 */
export function pruefeBlatt(fragen: unknown, mischen?: unknown, minuten?: unknown): Blatt | undefined {
  const f = pruefeKennungen(fragen).gut.slice(0, MAX_FRAGEN);
  if (!f.length) return undefined;
  const b: Blatt = { fragen: f };
  if (mischen === true || mischen === 1) b.mischen = true;
  if (typeof minuten === 'number' && Number.isInteger(minuten) && minuten >= 1 && minuten <= MAX_MINUTEN) b.minuten = minuten;
  return b;
}

/** Fester Startwert aus einem Text (FNV-1a), damit Druck und Lösungsblatt dieselbe gemischte Fassung zeigen. */
export function startwertAus(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

export const neueId = (): string => 'mein-' + Math.random().toString(36).slice(2, 8).padEnd(6, '0');
export const istEigeneId = (id: string): boolean => EIGENE_ID.test(id);

export const mitPruefung = (p: { pruefung?: boolean }): boolean => p.pruefung !== false;
/** Wie viele der Einheiten Fragen haben; ohne eine gibt es keine Abschlussprüfung. */
export const einheitenMitFragen = (ids: string[]): number => ids.filter(i => !!einheitNach(i)?.fragen.length).length;
export const pruefungId = (pfadId: string): string => `abschluss-${pfadId}`;

/**
 * Als Pfad des Lernplans; der Name ist Eingabe und wird nicht übersetzt. Mit Abschlussprüfung (und mindestens einer Einheit mit Fragen) steht als letzte Einheit
 * `abschluss-<Pfad>`, wie bei den festen Pfaden; sie wird als Einheit zur Laufzeit eingetragen und von `PfadAbschluss` angezeigt.
 */
export function alsPfad(p: EigenerPfad): Pfad {
  const einheiten = [...p.einheiten];
  const blatt = p.blatt?.fragen.length ? p.blatt : undefined;
  if (blatt || (mitPruefung(p) && einheitenMitFragen(p.einheiten))) {
    const id = pruefungId(p.id);
    const e: Einheit = {
      id, bereich: 'abschluss', abschlussVon: p.id,
      alltag: blatt ? { de: `Kann ich die Fragen zu „${p.name}“ beantworten?`, en: `Can I answer the questions on "${p.name}"?` } : { de: `Habe ich „${p.name}“ verstanden?`, en: `Have I understood "${p.name}"?` },
      fach: blatt ? { de: `Übungsblatt: ${p.name}`, en: `Practice sheet: ${p.name}` } : { de: `Abschlusstest: ${p.name}`, en: `Final test: ${p.name}` },
      hilfe: [], beispiele: [], probieren: [], fragen: []
    };
    DYNAMISCH.set(id, e);
    einheiten.push(id);
  }
  return { id: p.id, name: { de: p.name, en: p.name }, einheiten, ...(blatt ? { abschluss: [...blatt.fragen], uebung: { mischen: !!blatt.mischen, ...(blatt.minuten ? { minuten: blatt.minuten } : {}) } } : {}) };
}

const zuBase64Url = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let b = '';
  for (const x of bytes) b += String.fromCharCode(x);
  return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const vonBase64Url = (c: string): string => {
  const b = atob(c.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(b, ch => ch.charCodeAt(0)));
};

/**
 * Der Code für den Link; Fassung 1. `p: 0` steht nur, wenn die Prüfung abgewählt ist; Codes ohne `p` (auch alle alten) gelten als „an“.
 * Übungsblatt: `f` Fragen-Kennungen, `m: 1` gemischt, `z` Minuten. Ältere Fassungen von Statable lesen den Code weiter und lassen das Blatt still weg.
 */
export function kodiere(name: string, einheiten: string[], pruefung = true, blatt?: Blatt): string {
  const b = blatt ? pruefeBlatt(blatt.fragen, blatt.mischen, blatt.minuten) : undefined;
  return zuBase64Url(JSON.stringify({ v: 1, n: bereinigeName(name), e: pruefeKennungen(einheiten).gut, ...(pruefung ? {} : { p: 0 }), ...(b ? { f: b.fragen, ...(b.mischen ? { m: 1 } : {}), ...(b.minuten ? { z: b.minuten } : {}) } : {}) }));
}

/** Der Pfad aus einem Code, oder `null`, wenn der Code kaputt, zu lang oder von einer unbekannten Fassung ist. */
export function dekodiere(code: string): { name: string; einheiten: string[]; pruefung: boolean; blatt?: Blatt } | null {
  if (typeof code !== 'string' || !code || code.length > MAX_CODE || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  try {
    const o: unknown = JSON.parse(vonBase64Url(code));
    if (!o || typeof o !== 'object') return null;
    const { v, n, e, p, f, m, z } = o as { v?: unknown; n?: unknown; e?: unknown; p?: unknown; f?: unknown; m?: unknown; z?: unknown };
    if (v !== 1) return null;
    const name = bereinigeName(n), { gut } = pruefeKennungen(e);
    if (!name || !gut.length) return null;
    const blatt = pruefeBlatt(f, m, z);
    return { name, einheiten: gut, pruefung: !(p === 0 || p === false), ...(blatt ? { blatt } : {}) };
  } catch { return null; }
}

/** Gespeicherte Pfade aus dem Speicher des Browsers; Kaputtes wird still weggelassen. */
export function leseEigene(json: string | null): EigenerPfad[] {
  if (!json) return [];
  try {
    const a: unknown = JSON.parse(json);
    if (!Array.isArray(a)) return [];
    const ids = new Set<string>(), aus: EigenerPfad[] = [];
    for (const x of a) {
      if (!x || typeof x !== 'object') continue;
      const { id, name, einheiten, pruefung, blatt } = x as Partial<EigenerPfad>;
      const n = bereinigeName(name), { gut } = pruefeKennungen(einheiten);
      if (typeof id !== 'string' || !EIGENE_ID.test(id) || ids.has(id) || !n || !gut.length || aus.length >= MAX_PFADE) continue;
      const b = blatt && typeof blatt === 'object' ? pruefeBlatt(blatt.fragen, blatt.mischen, blatt.minuten) : undefined;
      ids.add(id); aus.push({ id, name: n, einheiten: gut, ...(pruefung === false ? { pruefung: false } : {}), ...(b ? { blatt: b } : {}) });
    }
    return aus;
  } catch { return []; }
}
