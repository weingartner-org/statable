/**
 * Verdeckte Zuteilung, Person für Person (Verstehen, 23.10.2026): Die ganze Liste entsteht beim Start aus dem Zufallsgenerator des Browsers (crypto), nicht aus einem Startwert,
 * und wird nicht gezeigt. Jede Person bekommt ihre Gruppe erst, wenn sie eingetragen ist; das Ergebnis steht danach im Protokoll und lässt sich nicht zurücknehmen.
 * Festlegung: Beim Start wird der Fingerabdruck SHA-256(Salz + Liste) gezeigt. Am Ende werden Salz und Liste offengelegt; wer den Fingerabdruck neu rechnet, sieht, dass die Liste nicht nachträglich geändert wurde.
 * Das Salz (128 Bit Zufall) verhindert, dass sich die Liste aus dem Fingerabdruck erraten lässt.
 * GRENZE: Verdeckt ist die Liste nur gegenüber dem Blick auf den Bildschirm. Wer die Entwicklerwerkzeuge des Browsers öffnet, kann den Zustand lesen. Das ist ein Lehrmittel, keine echte Studienrandomisierung.
 * Die Liste selbst kommt aus `zuteilen` (Blöcke, mehrere Blockgrößen, Schichten) mit dem Zufallsstrom des Browsers statt mulberry32.
 */
import { zuteilen, type ZuteilungEingabe } from './zuteilung';

export interface VerdecktEinstellung { gruppen: string[]; verhaeltnis: number[]; blockgroessen: number[]; schichten?: { name: string; n: number }[]; n?: number; aufrunden: boolean }
export interface VerdecktListe { schichten: { name: string | null; folge: string[] }[] }
export type VerdecktFehler = { ok: false; code: string };

/** Zufallszahl in [0, 1) aus dem Browser (2³² Stufen). */
export const kryptoZufall = (): number => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]! / 4294967296; };
/** 128 Bit Zufall als Hex. */
export function kryptoSalz(): string { const a = new Uint8Array(16); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); }

/** Die ganze Liste, je Schicht in der Reihenfolge der Aufnahme. */
export function verdecktErzeugen(e: VerdecktEinstellung, zufall: () => number = kryptoZufall): VerdecktListe | VerdecktFehler {
  const eingabe: ZuteilungEingabe = { gruppen: e.gruppen, verhaeltnis: e.verhaeltnis, blockgroessen: e.blockgroessen, startwert: 0, aufrunden: e.aufrunden, erzeuger: () => zufall, ...(e.schichten ? { schichten: e.schichten } : { n: e.n }) };
  const r = zuteilen(eingabe);
  if (!r.ok) return r;
  const namen = e.schichten ? e.schichten.map(s => s.name) : [null];
  return { schichten: namen.map(name => ({ name, folge: r.liste.filter(x => x.schicht === name).map(x => x.gruppe) })) };
}

/** Der Text, über den der Fingerabdruck gerechnet wird: je Schicht eine Zeile „Schicht: Gruppe,Gruppe,…“. */
export const listenText = (l: VerdecktListe): string => l.schichten.map(s => `${s.name ?? ''}: ${s.folge.join(',')}`).join('\n');

/** SHA-256 als Hex (Web Crypto). */
export async function sha256Hex(text: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}
/** Fingerabdruck der Festlegung. */
export const fingerabdruck = (salz: string, l: VerdecktListe): Promise<string> => sha256Hex(`${salz}\n${listenText(l)}`);

export interface ProtokollZeile { nr: number; schicht: string | null; kennung: string; gruppe: string; zeit: string }
const zelle = (t: string): string => { const x = /^[=+\-@\t\r]/.test(t) ? `'${t}` : t; return /[;"\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };

/** Protokoll als CSV (Semikolon); mit `offen` auch Salz und Liste (nach dem Ende der Aufnahme). */
export function protokollCsv(kopf: string[], zeilen: ProtokollZeile[], hat: { schichten: boolean }, offen?: { salz: string; liste: VerdecktListe }): string {
  const t: string[] = kopf.map(zelle);
  if (offen) { t.push(zelle(`Salz: ${offen.salz}`)); for (const l of listenText(offen.liste).split('\n')) t.push(zelle(`Liste ${l}`)); }
  t.push('');
  t.push(['Nr', ...(hat.schichten ? ['Schicht'] : []), 'Kennung', 'Gruppe', 'Zeit'].map(zelle).join(';'));
  for (const z of zeilen) t.push([String(z.nr), ...(hat.schichten ? [z.schicht ?? ''] : []), z.kennung, z.gruppe, z.zeit].map(zelle).join(';'));
  return t.join('\n');
}
