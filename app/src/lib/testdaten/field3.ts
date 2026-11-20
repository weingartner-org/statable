/** Hilfen nur für die Tests der Field-Stufe 3: Sollwerte (Opus, R) und Rohdaten aus docs/fachblaetter/sollwerte lesen. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ordner = fileURLToPath(new URL('../../../../docs/fachblaetter/sollwerte/', import.meta.url));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const soll = JSON.parse(readFileSync(ordner + 'field-stufe3.json', 'utf8')) as any;

/** Eine CSV mit Kopfzeile (Anführungszeichen, Komma); Zahlen als Zahl, sonst Text. */
export function csv(name: string): Record<string, string | number>[] {
  const zeilen = readFileSync(ordner + name, 'utf8').trim().split(/\r?\n/).map(z => z.split(',').map(x => x.replace(/^"|"$/g, '')));
  const kopf = zeilen[0]!;
  return zeilen.slice(1).map(z => Object.fromEntries(kopf.map((k, i) => [k, z[i] !== '' && z[i] !== undefined && /^-?[\d.]+(e-?\d+)?$/i.test(z[i]!) ? Number(z[i]) : z[i]!])));
}

/** n, Mittelwert und Streuung je Gruppe in der angegebenen Reihenfolge. */
export const nah = (a: number, b: number, rel = 1e-6, abs = 1e-12) => Math.abs(a - b) <= Math.max(abs, rel * Math.abs(b));

/** afex::obk.long breit: eine Zeile je Person (nach id), Spalten phase (pre, post, fup) × hour (1 bis 5), Zelle i·5 + j; dazu Behandlung und Geschlecht je Person. */
export function obkBreit(): { daten: number[][]; treatment: string[]; spalten: string[] } {
  const z = csv('obk-long.csv'), ids = [...new Set(z.map(r => r.id as number))].sort((x, y) => x - y);
  const phasen = ['pre', 'post', 'fup'], stunden = ['1', '2', '3', '4', '5'];
  const spalten = phasen.flatMap(p => stunden.map(h => `${p}_${h}`));
  const daten = ids.map(id => phasen.flatMap(p => stunden.map(h => z.find(r => r.id === id && r.phase === p && String(r.hour) === h)!.value as number)));
  const treatment = ids.map(id => z.find(r => r.id === id)!.treatment as string);
  return { daten, treatment, spalten };
}

/** Für die Tests der Stufe 3b (gleiche Datei). */
export const soll3 = soll;
