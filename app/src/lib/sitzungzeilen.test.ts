/** Abschlusstest A2: Die Datenzeilen und Spalten sind nicht tief reaktiv (kein Proxy je Zeile), sonst kostet jeder Zugriff Sekunden.
 *  Hinweis: Im Test übersetzt Svelte für den Server - dort gibt es keine Proxys; der Test sichert also nur den Vertrag (Zuweisen ersetzt, Lesen gibt das Array).
 *  Der Beleg für die Geschwindigkeit ist die Messung im Browser (abschlusstest-2026-10-09/A-belastung/skripte/lauf.mjs, Tabelle in der Übergabe). */
import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { einmal } from './einmal';

describe('Datenzeilen ohne Proxy', () => {
  it('s.zeilen ist das zugewiesene Array selbst, nicht ein Proxy darum', () => {
    const z = [[1, 'a'], [2, null]];
    s.zeilen = z;
    expect(s.zeilen).toBe(z); expect(s.zeilen[0]).toBe(z[0]);
  });
  it('s.spalten ebenso', () => {
    const sp = [{ name: 'a' }] as never;
    s.spalten = sp; expect(s.spalten).toBe(sp);
  });
  it('100.000 Zeilen × 47 Spalten: alle Zellen lesen in unter 2 Sekunden', () => {
    const z = Array.from({ length: 100000 }, (_, r) => Array.from({ length: 47 }, (_, c) => r + c));
    s.zeilen = z;
    const t0 = Date.now(); let summe = 0;
    for (const zeile of s.zeilen) for (const v of zeile) summe += v as number;
    expect(Date.now() - t0).toBeLessThan(2000); expect(summe).toBeGreaterThan(0);
  });
  it('neues Array zuweisen ersetzt die Daten (so aktualisiert sich die Oberfläche)', () => {
    s.zeilen = [[1]]; const alt = s.zeilen; s.zeilen = [[2]];
    expect(s.zeilen).not.toBe(alt); expect(s.zeilen[0]![0]).toBe(2);
  });
});

describe('einmal: eine Rechnung je Datenstand', () => {
  it('rechnet nur beim ersten Aufruf; ein neues Array ist ein neuer Stand', () => {
    let n = 0; const a = [[1]], b = [[1]];
    expect(einmal(a, 'k', () => ++n)).toBe(1); expect(einmal(a, 'k', () => ++n)).toBe(1); expect(einmal(b, 'k', () => ++n)).toBe(2);
    expect(einmal(a, 'andere', () => ++n)).toBe(3);
  });
});
