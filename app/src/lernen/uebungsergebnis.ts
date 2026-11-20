/**
 * Ergebnisdatei eines Übungsblatts (V3 Teil 2, Lehre ohne Server).
 *
 * Studierende speichern am Ende des Übungsblatts eine kleine JSON-Datei (je Frage richtig oder nicht, beim ersten Versuch) und schicken sie selbst,
 * zum Beispiel per Mail oder über die Lernplattform. Lehrende lesen mehrere Dateien im Übungsblatt-Bereich ihres Pfads ein und sehen je Frage
 * „k von n richtig“: welche Fragen schwer waren. Keine Noten, keine Punkte, keine Rangliste, keine Namen in der Übersicht.
 * Nichts geht an einen Server; die eingelesenen Dateien bleiben nur auf der Seite, bis sie geschlossen wird.
 *
 * Rein (ohne Browser prüfbar, `lernen/uebungsergebnis.test.ts`). Fremde Dateien werden streng geprüft: nur bekannte Felder, Kennungen wie im Lernplan,
 * Name ohne Steuerzeichen und höchstens `MAX_NAME_PERSON` Zeichen, höchstens `MAX_FRAGEN` Fragen.
 */
import { MAX_FRAGEN, bereinigeName, pruefeKennungen } from './eigenepfade';

export const ART = 'statable-uebungsergebnis';
export const FASSUNG = 1;
export const MAX_NAME_PERSON = 80;
/** Mehr Dateien auf einmal braucht keine Lehrveranstaltung; schützt die Seite vor sehr großen Mengen. */
export const MAX_DATEIEN = 500;
/** Eine Ergebnisdatei ist klein (unter 10 kB); größere Dateien sind sicher keine. */
export const MAX_BYTES = 64 * 1024;

export interface UebungsErgebnis {
  art: typeof ART;
  fassung: typeof FASSUNG;
  /** Name des Lernpfads (nur zur Anzeige; zugeordnet wird über die Fragen). */
  pfad: string;
  /** Alle Fragen des Blatts, in der Reihenfolge des Pfads. */
  fragen: string[];
  /** Je beantwortete Frage: beim ersten Versuch richtig? Unbeantwortete fehlen. */
  antworten: Record<string, boolean>;
  /** Freiwillig. */
  name?: string;
  /** JJJJ-MM-TT */
  datum: string;
}

const steuer = new RegExp('[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069<>]', 'g');
const bereinigePerson = (s: unknown): string => (typeof s === 'string' ? s.replace(steuer, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_PERSON) : '');

/** Ergebnis bauen. `antworten` darf nur Fragen des Blatts enthalten; andere fallen weg. */
export function baueErgebnis(pfad: string, fragen: readonly string[], antworten: Readonly<Record<string, boolean>>, datum: Date, name?: string): UebungsErgebnis {
  const f = [...fragen];
  const a: Record<string, boolean> = {};
  for (const id of f) if (Object.hasOwn(antworten, id)) a[id] = antworten[id] === true;
  const n = bereinigePerson(name);
  const iso = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}-${String(datum.getDate()).padStart(2, '0')}`;
  return { art: ART, fassung: FASSUNG, pfad: bereinigeName(pfad), fragen: f, antworten: a, ...(n ? { name: n } : {}), datum: iso };
}

/** Als Text für die Datei (eingerückt, damit man sie auch im Editor lesen kann). */
export const alsText = (e: UebungsErgebnis): string => JSON.stringify(e, null, 2) + '\n';

/** Dateiname ohne verbotene Zeichen: „Übungsergebnis - <Pfad> - <Name>.json“ (Name nur, wenn angegeben). */
export function dateinameErgebnis(e: UebungsErgebnis, wort: string): string {
  const teil = (s: string) => s.replace(/[\\/:*?"<>|$]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return [wort, teil(e.pfad), e.name ? teil(e.name) : ''].filter(Boolean).join(' - ') + '.json';
}

/** Fremde Datei prüfen. Gibt `null`, wenn es keine Ergebnisdatei von Statable ist oder etwas nicht stimmt. */
export function leseErgebnis(text: string): UebungsErgebnis | null {
  if (text.length > MAX_BYTES) return null;
  let x: unknown;
  try { x = JSON.parse(text); } catch { return null; }
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  if (o.art !== ART || o.fassung !== FASSUNG) return null;
  if (!Array.isArray(o.fragen) || o.fragen.length === 0 || o.fragen.length > MAX_FRAGEN) return null;
  const { gut, unbekannt } = pruefeKennungen(o.fragen);
  if (unbekannt.length || gut.length !== o.fragen.length || new Set(gut).size !== gut.length) return null;
  if (!o.antworten || typeof o.antworten !== 'object' || Array.isArray(o.antworten)) return null;
  const a: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(o.antworten as Record<string, unknown>)) {
    if (!gut.includes(k) || typeof v !== 'boolean') return null;
    a[k] = v;
  }
  if (typeof o.datum !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.datum)) return null;
  const pfad = bereinigeName(o.pfad);
  const name = bereinigePerson(o.name);
  return { art: ART, fassung: FASSUNG, pfad, fragen: gut, antworten: a, ...(name ? { name } : {}), datum: o.datum };
}

export interface FrageStand { id: string; richtig: number; beantwortet: number }
export interface Uebersicht {
  /** Je Frage des Blatts, in dessen Reihenfolge. */
  fragen: FrageStand[];
  /** Dateien, die gezählt wurden. */
  gezaehlt: number;
  /** Keine Ergebnisdatei von Statable oder beschädigt. */
  unlesbar: number;
  /** Ergebnisdatei, aber ohne eine einzige Frage dieses Blatts. */
  fremd: number;
  /** Genau gleiche Datei schon gezählt (zweimal geschickt). */
  doppelt: number;
}

/**
 * Übersicht über mehrere Dateien: je Frage des Blatts, wie viele sie beantwortet und wie viele richtig.
 * Eine Datei zählt, wenn sie mindestens eine Frage des Blatts enthält (so bleiben Dateien gültig, wenn die Lehrperson das Blatt später ändert).
 * Gleiche Dateien zählen einmal (Vergleich über den bereinigten Inhalt).
 */
export function uebersicht(blattFragen: readonly string[], texte: readonly string[]): Uebersicht {
  const stand = new Map(blattFragen.map(id => [id, { id, richtig: 0, beantwortet: 0 }]));
  const gesehen = new Set<string>();
  let gezaehlt = 0, unlesbar = 0, fremd = 0, doppelt = 0;
  for (const t of texte.slice(0, MAX_DATEIEN)) {
    const e = leseErgebnis(t);
    if (!e) { unlesbar++; continue; }
    if (!e.fragen.some(id => stand.has(id))) { fremd++; continue; }
    const schluessel = alsText(e);
    if (gesehen.has(schluessel)) { doppelt++; continue; }
    gesehen.add(schluessel);
    gezaehlt++;
    for (const [id, ok] of Object.entries(e.antworten)) {
      const s = stand.get(id);
      if (!s) continue;
      s.beantwortet++;
      if (ok) s.richtig++;
    }
  }
  unlesbar += Math.max(0, texte.length - MAX_DATEIEN);
  return { fragen: [...stand.values()], gezaehlt, unlesbar, fremd, doppelt };
}
