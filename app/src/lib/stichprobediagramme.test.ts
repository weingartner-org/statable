/** Abschlusstest A3: Diagramme zeichnen nur bis zu einer Grenze Einzelpunkte; Kennzahlen aus ALLEN Daten. Gerendert mit svelte/server (kein Browser nötig). */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Gruppendiagramm from '../bausteine/Gruppendiagramm.svelte';
import { dgGrund } from './diagramm';
import type { ZweiGruppen } from './ergebnis';

const werte = (n: number, m: number) => Array.from({ length: n }, (_, i) => m + Math.sin(i * 12.9898) * 10);
const mw = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const grp = (name: string, w: number[]) => ({ name, n: w.length, m: mw(w), sd: 10, kiLo: mw(w) - 0.1, kiHi: mw(w) + 0.1 });
const bild = (a: number[], b: number[], o = dgGrund('T', 'y')) => render(Gruppendiagramm, { props: { e: { a: grp('A', a), b: grp('B', b), abhaengig: 'y', gruppenSpalte: 'g' } as unknown as ZweiGruppen, werte: { A: a, B: b }, o, xText: 'g' } }).body;
const kreise = (h: string) => (h.match(/<circle/g) ?? []).length;

describe('Gruppendiagramm: Einzelpunkte nur bis zur Grenze', () => {
  it('2 × 5.000 Personen: höchstens 500 Punkte je Gruppe, Hinweis in der Bildunterschrift', () => {
    const h = bild(werte(5000, 50), werte(5000, 60));
    expect(kreise(h)).toBeLessThanOrEqual(1000);
    expect(kreise(h)).toBeGreaterThan(900);
    expect(h).toMatch(/Punkte: 1[\s\u00a0\u202f.,]?000 von 10[\s\u00a0\u202f.,]?000 Personen, zufällig, fest/);
  });
  it('Kennzahlen bleiben die aus allen Daten (n in der Beschriftung, Mittelwert in der Beschreibung)', () => {
    const a = werte(5000, 50), b = werte(5000, 60), h = bild(a, b);
    expect(h).toContain('n = 5000');
    const m = /<li[^>]*>A: Mittelwert (\d+(?:,\d+)?)/.exec(h);
    expect(m).not.toBeNull(); expect(Math.abs(Number(m![1]!.replace(',', '.')) - mw(a))).toBeLessThan(0.01);
  });
  it('unter der Grenze: alle Punkte, kein Hinweis', () => {
    const h = bild(werte(300, 50), werte(200, 60));
    expect(kreise(h)).toBe(500); expect(h).not.toContain('zufällig, fest');
  });
  it('ohne Titel steht der Hinweis trotzdem im Bild', () => {
    const h = bild(werte(5000, 50), werte(5000, 60), { ...dgGrund('', 'y'), titel: '' });
    expect(h).toContain('zufällig, fest');
  });
  it('100.000 Personen: Aufbau in Sekundenbruchteilen und höchstens 1.000 Kreise', () => {
    const t0 = Date.now(), h = bild(werte(50000, 50), werte(50000, 60));
    expect(Date.now() - t0).toBeLessThan(3000); expect(kreise(h)).toBeLessThanOrEqual(1000);
  });
  it('Kasten: Ringe höchstens 100 je Gruppe, mit Hinweis', () => {
    const viele = Array.from({ length: 20000 }, (_, i) => (i % 2 ? 1 : -1) * (i < 3000 ? 1000 + i : 5) + (i % 7));
    const h = bild(viele, viele, { ...dgGrund('T', 'y'), art: 'box' });
    expect(kreise(h)).toBeLessThanOrEqual(200); expect(h).toContain('Ringe: ');
  });
});
