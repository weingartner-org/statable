/** Hilfen nur für die Tests der Field-Stufe 2: Sollwerte (Opus, R) und Rohdaten aus docs/fachblaetter/sollwerte lesen. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { PhGruppe } from '../posthoc';

const ordner = fileURLToPath(new URL('../../../../docs/fachblaetter/sollwerte/', import.meta.url));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const soll = JSON.parse(readFileSync(ordner + 'field-stufe2.json', 'utf8')) as any;

/** Eine CSV mit Kopfzeile (Anführungszeichen, Komma); Zahlen als Zahl, sonst Text. */
export function csv(name: string): Record<string, string | number>[] {
  const zeilen = readFileSync(ordner + name, 'utf8').trim().split(/\r?\n/).map(z => z.split(',').map(x => x.replace(/^"|"$/g, '')));
  const kopf = zeilen[0]!;
  return zeilen.slice(1).map(z => Object.fromEntries(kopf.map((k, i) => [k, z[i] !== '' && z[i] !== undefined && /^-?[\d.]+(e-?\d+)?$/i.test(z[i]!) ? Number(z[i]) : z[i]!])));
}

/** n, Mittelwert und Streuung je Gruppe in der angegebenen Reihenfolge. */
export function kennzahlen(werte: number[], gruppe: (string | number)[], folge: (string | number)[]): PhGruppe[] {
  return folge.map(f => {
    const x = werte.filter((_, i) => gruppe[i] === f), n = x.length, m = x.reduce((a, b) => a + b, 0) / n;
    return { name: String(f), n, m, sd: Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) };
  });
}
export const nah = (a: number, b: number, rel = 1e-6, abs = 1e-12) => Math.abs(a - b) <= Math.max(abs, rel * Math.abs(b));
