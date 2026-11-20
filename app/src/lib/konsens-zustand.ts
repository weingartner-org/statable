/**
 * Offene Entscheidungen beim Konsens (Stufe 5, Paket 5E1): Paar, Schwelle, Entscheidungen je Abweichung. Sie liegen in der Projektdatei
 * (`qualitativ/konsens.json`), damit man aufhören und später weitermachen kann. Jedes Feld wird beim Lesen geprüft; Kaputtes wirft `KonsensFehler`.
 * Der Rechenkern steht in `konsens.ts` und wird nicht verändert.
 */
import type { Entscheidung, Wahl } from './konsens';

export interface KonsensEntwurf {
  /** Kennungen der beiden Kodierenden (`Kodierende.id`) */
  a: string; b: string;
  /** Codes, auf die sich die Einigung bezieht (Code-Kennungen) */
  codes: string[];
  /** Schwelle 0,5 bis 1 */
  schwelle: number;
  /** Entscheidungen je Abweichung (Begründung darf in der Entwurfsphase noch leer sein) */
  entscheidungen: Entscheidung[];
  /** Welche Abweichung gerade offen ist (ab 0) */
  position: number;
  /** Name der Konsens-Person; fehlt = Vorschlag der Oberfläche */
  name?: string;
}

export class KonsensFehler extends Error { constructor(pfad: string, was: string) { super(`Konsens: ${pfad}: ${was}`); this.name = 'KonsensFehler'; } }

const WAHLEN: readonly Wahl[] = ['a', 'b', 'beide', 'keiner'];
const istObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (o: Record<string, unknown>, k: string, p: string): string => { const v = o[k]; if (typeof v !== 'string') throw new KonsensFehler(`${p}.${k}`, 'Text erwartet'); return v; };

/** Prüft das aus JSON gelesene Objekt Feld für Feld; unbekannte Felder fallen weg. */
export function leseKonsensEntwurf(json: unknown): KonsensEntwurf {
  if (!istObj(json)) throw new KonsensFehler('konsens', 'Objekt erwartet');
  if (json.version !== 1) throw new KonsensFehler('konsens.version', 'unbekannte Fassung');
  const a = text(json, 'a', 'konsens'), b = text(json, 'b', 'konsens');
  if (!a || !b) throw new KonsensFehler('konsens', 'Kodierende fehlen');
  if (!Array.isArray(json.codes) || !json.codes.every(c => typeof c === 'string')) throw new KonsensFehler('konsens.codes', 'Liste von Texten erwartet');
  const schwelle = json.schwelle;
  if (typeof schwelle !== 'number' || !Number.isFinite(schwelle) || schwelle < 0.5 || schwelle > 1) throw new KonsensFehler('konsens.schwelle', 'Zahl von 0,5 bis 1 erwartet');
  const position = json.position;
  if (typeof position !== 'number' || !Number.isInteger(position) || position < 0) throw new KonsensFehler('konsens.position', 'ganze Zahl ab 0 erwartet');
  if (!Array.isArray(json.entscheidungen)) throw new KonsensFehler('konsens.entscheidungen', 'Liste erwartet');
  const gesehen = new Set<string>();
  const entscheidungen: Entscheidung[] = json.entscheidungen.map((v, i) => {
    const p = `konsens.entscheidungen[${i}]`;
    if (!istObj(v)) throw new KonsensFehler(p, 'Objekt erwartet');
    const abweichung = text(v, 'abweichung', p);
    if (!abweichung || gesehen.has(abweichung)) throw new KonsensFehler(`${p}.abweichung`, 'Kennung fehlt oder doppelt');
    gesehen.add(abweichung);
    const wahl = v.wahl;
    if (typeof wahl !== 'string' || !(WAHLEN as readonly string[]).includes(wahl)) throw new KonsensFehler(`${p}.wahl`, 'a, b, beide oder keiner erwartet');
    const e: Entscheidung = { abweichung, wahl: wahl as Wahl, begruendung: text(v, 'begruendung', p) };
    if (v.regel !== undefined) {
      if (!istObj(v.regel)) throw new KonsensFehler(`${p}.regel`, 'Objekt erwartet');
      e.regel = { code: text(v.regel, 'code', `${p}.regel`), text: text(v.regel, 'text', `${p}.regel`) };
    }
    return e;
  });
  const r: KonsensEntwurf = { a, b, codes: json.codes as string[], schwelle, entscheidungen, position };
  if (json.name !== undefined) r.name = text(json, 'name', 'konsens');
  return r;
}

/** Die Form für die Datei. */
export const konsensAlsJson = (e: KonsensEntwurf): Record<string, unknown> => ({ version: 1, ...e });

/** Zahl der Entscheidungen, die vollständig sind (Wahl und Begründung mit mindestens einem Wort). */
export const istEntschieden = (e: Entscheidung | undefined): boolean => !!e && (e.begruendung.match(/\S+/g) ?? []).length >= 1;
export const zahlEntschieden = (e: KonsensEntwurf): number => e.entscheidungen.filter(istEntschieden).length;
