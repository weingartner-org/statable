import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** WCAG 1.3.3 (Sensorische Eigenschaften) und 1.4.1: Ein Text darf nicht allein über die Farbe sagen, was gemeint ist
 *  („Rot markierte Werte“). Gilt, wenn im selben Text ein zweites Merkmal steht (Stern, fett, Symbol, Haken). Lage-Wörter (oben, rechts) stehen immer mit dem Namen des Elements
 *  (von Hand geprüft, `docs/barrierefreiheit/BEFUNDE-D9.md`). */
const SRC = fileURLToPath(new URL('..', import.meta.url));
const FARBE = /\b(rot|rote|roten|roter|rotes|grün|grüne|grünen|grüner|grünes|blau|blaue|blauen|blauer|gelb|gelbe|gelben|orange|red|green|blue|yellow)\b[^.]{0,12}\b(markiert|markierte|markierten|hinterlegt|umrandet|unterlegt|gefärbt|eingefärbt|marked|highlighted|shaded|outlined)\b/i;
const ZWEITES = /\*|Stern|asterisk|\bfett\b|\bbold\b|Symbol|Haken|Sternchen/i;
export function farbeAllein(zeile: string): boolean { return FARBE.test(zeile) && !ZWEITES.test(zeile); }

function dateien(ordner: string, aus: string[] = []): string[] {
  for (const n of readdirSync(ordner)) {
    const p = join(ordner, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules' && n !== 'sprachen') dateien(p, aus); }
    else if (/\.(svelte|ts)$/.test(n) && !/\.test\.ts$/.test(n)) aus.push(p);
  }
  return aus;
}
describe('Sensorische Eigenschaften (1.3.3)', () => {
  it('Gegenprobe: der Prüfer erkennt „nur Farbe“', () => {
    expect(farbeAllein("L('Rot markierte Werte liegen außerhalb', 'Values marked red lie outside')")).toBe(true);
    expect(farbeAllein("L('Mit * markierte Werte (zusätzlich rot)', 'Values marked with *')")).toBe(false);
    expect(farbeAllein('Die Zelle ist blau hinterlegt')).toBe(true);
    expect(farbeAllein('Keine Farbe hier')).toBe(false);
  });
  it('kein Text in der App nennt eine Markierung nur über die Farbe', () => {
    const treffer: string[] = [];
    for (const p of dateien(SRC)) {
      readFileSync(p, 'utf8').split('\n').forEach((z, i) => {
        if (/^\s*(\/\/|\/\*|\*)/.test(z)) return;
        if (farbeAllein(z)) treffer.push(`${p.slice(SRC.length)}:${i + 1}`);
      });
    }
    expect(treffer).toEqual([]);
  });
});
