/**
 * Prototyp F3a (Feinstruktur): Sinneinheiten setzen und deuten - reine Funktionen, kein DOM.
 * Fachblatt: docs/feinstruktur/FACHBLATT-PROTOTYP-F3A.md; Datenmodell: docs/feinstruktur/ARCHITEKTUR-DATENMODELL-FEINSTRUKTUR.md 2.1-2.3.
 * Alle Positionen sind Codepoints (nicht UTF-16-Einheiten), relativ zum Ausschnitt. Das Leerzeichen nach einem Wort gehört zur Einheit davor.
 */
import { L } from './sitzung.svelte';

export interface Wort { von: number; bis: number; wort: string }
export interface Einheit { von: number; bis: number; gedeutet?: boolean }
export type Phase = 'einteilen' | 'deuten';
export interface Analyse { text: string; einheiten: Einheit[]; phase: Phase; aktuell: number; vorauslesenErlaubt?: boolean }

const zeichen = (text: string): string[] => Array.from(text);
const LEER = /^\s$/u;

/** Wörter des Textes: Folgen von Zeichen ohne Leerraum; Satzzeichen am Ende, Apostroph und Bindestrich bleiben am Wort. */
export function woerter(text: string): Wort[] {
  const z = zeichen(text), a: Wort[] = [];
  let von = -1;
  for (let i = 0; i <= z.length; i++) {
    const leer = i === z.length || LEER.test(z[i]!);
    if (!leer && von < 0) von = i;
    else if (leer && von >= 0) { a.push({ von, bis: i, wort: z.slice(von, i).join('') }); von = -1; }
  }
  return a;
}

export const laenge = (text: string): number => zeichen(text).length;

/** Eine Einheit über den ganzen Text. */
export const neueEinheiten = (text: string): Einheit[] => [{ von: 0, bis: laenge(text) }];

/** Die inneren Grenzen (Anfänge der Einheiten 2 bis n). */
export const grenzenAus = (einheiten: readonly Einheit[]): number[] => einheiten.slice(1).map(e => e.von);

/** Lückenlose Einheiten aus Grenzen: sortiert, ohne Doppelte, ohne 0 und Textende. */
export function einheitenAus(grenzen: readonly number[], text: string): Einheit[] {
  const n = laenge(text);
  const g = [...new Set(grenzen)].filter(x => x > 0 && x < n).sort((p, q) => p - q);
  const stellen = [0, ...g, n];
  const e: Einheit[] = [];
  for (let i = 0; i < stellen.length - 1; i++) e.push({ von: stellen[i]!, bis: stellen[i + 1]! });
  if (e[0]!.von !== 0 || e[e.length - 1]!.bis !== n || e.some((x, i) => i > 0 && x.von !== e[i - 1]!.bis)) throw new Error('Einheiten nicht lückenlos');
  return e;
}

/** Rundet eine Schreibmarke auf den Anfang des nächsten Wortes (Anfang des Wortes, vor dem sie steht, sonst des folgenden).
 *  `null`: kein Wort mehr danach (Textende) oder das erste Wort (davor ist keine Grenze möglich). */
export function grenzeAnWort(text: string, pos: number): number | null {
  const w = woerter(text);
  const i = w.findIndex(x => x.von >= pos);
  return i <= 0 ? null : w[i]!.von;
}

/** Setzt die Grenze, wenn es sie nicht gibt, sonst löscht es sie. */
export function umschalten(einheiten: readonly Einheit[], text: string, grenze: number): { einheiten: Einheit[]; gesetzt: boolean } {
  const g = grenzenAus(einheiten);
  const gesetzt = !g.includes(grenze);
  return { einheiten: einheitenAus(gesetzt ? [...g, grenze] : g.filter(x => x !== grenze), text), gesetzt };
}

/** Text einer Einheit ohne Leerraum am Ende. */
export const einheitText = (text: string, e: Einheit): string => zeichen(text).slice(e.von, e.bis).join('').trimEnd();
/** Anzahl der Wörter einer Einheit. */
export const wortzahl = (text: string, e: Einheit): number => woerter(einheitText(text, e)).length;

const ohneSatzzeichen = (w: string) => w.replace(/[^\p{L}\p{N}]+$/u, '').replace(/^[^\p{L}\p{N}]+/u, '');

/** Ansage nach dem Setzen oder Löschen einer Grenze (Prüfplan B2); `einheiten` sind die Einheiten NACH der Änderung. Ohne den Wortlaut der Einheit. */
export function ansageGrenze(text: string, einheiten: readonly Einheit[], grenze: number, gesetzt: boolean): string {
  const davor = woerter(text).filter(x => x.bis <= grenze).pop();
  const wort = davor ? ohneSatzzeichen(davor.wort) : '';
  if (!gesetzt) {
    const n = einheiten.length;
    return L(`Grenze nach ‚${wort}‘ gelöscht. Jetzt ${n} ${n === 1 ? 'Sinneinheit' : 'Sinneinheiten'}.`, `Boundary after ‘${wort}’ deleted. Now ${n} ${n === 1 ? 'unit' : 'units'}.`);
  }
  const i = einheiten.findIndex(e => e.von === grenze);
  const wz = i >= 0 ? wortzahl(text, einheiten[i]!) : 0;
  return L(`Grenze nach ‚${wort}‘. Sinneinheit ${i + 1} von ${einheiten.length}, ${wz} ${wz === 1 ? 'Wort' : 'Wörter'}.`, `Boundary after ‘${wort}’. Unit ${i + 1} of ${einheiten.length}, ${wz} ${wz === 1 ? 'word' : 'words'}.`);
}

/** Beschreibung eines Wortes der Wortliste (Konzept 2): „Sinneinheit 2, Wort 1 von 4“, am Anfang einer Einheit „Beginn Sinneinheit 2, Wort 1 von 4“. */
export function ansageOrt(text: string, einheiten: readonly Einheit[], wortIndex: number): string {
  const w = woerter(text)[wortIndex];
  if (!w) return '';
  const i = einheiten.findIndex(e => w.von >= e.von && w.von < e.bis);
  const e = einheiten[i]!;
  const nr = woerter(text).filter(x => x.von >= e.von && x.von < e.bis).findIndex(x => x.von === w.von) + 1;
  const von = woerter(text).filter(x => x.von >= e.von && x.von < e.bis).length;
  const anfang = i > 0 && e.von === w.von;
  return anfang
    ? L(`Beginn Sinneinheit ${i + 1}, Wort ${nr} von ${von}`, `Start of unit ${i + 1}, word ${nr} of ${von}`)
    : L(`Sinneinheit ${i + 1}, Wort ${nr} von ${von}`, `Unit ${i + 1}, word ${nr} of ${von}`);
}

/** Der Text, der gerade im DOM stehen darf. Einteilen: alles. Deuten: bis zum Ende der aktuellen Einheit - außer Vorauslesen ist erlaubt oder alle sind gedeutet. */
export function sichtbarerText(a: Analyse): string {
  if (a.phase === 'einteilen' || a.vorauslesenErlaubt || (a.einheiten.length > 0 && a.einheiten.every(e => e.gedeutet))) return a.text;
  const e = a.einheiten[Math.min(Math.max(a.aktuell, 0), a.einheiten.length - 1)];
  return e ? zeichen(a.text).slice(0, e.bis).join('') : '';
}
