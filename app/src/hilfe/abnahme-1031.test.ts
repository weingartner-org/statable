import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/** Abnahme im Browser 31.10.: Die Hilfe nennt, was die Seite wirklich zeigt (F7, F8). Die Namen der Knöpfe stehen in der Oberfläche (Blatt.svelte). */
const artikel = readFileSync(new URL('./artikel.ts', import.meta.url), 'utf8');
const blatt = readFileSync(new URL('../seiten/Blatt.svelte', import.meta.url), 'utf8');
describe('Hilfe und Seite sagen dasselbe', () => {
  it('F7: Prä-Post zeigt zwei Mittelwerte mit Intervall, keine Linie je Person', () => {
    expect(artikel).not.toContain('je Person vorher und nachher');
    expect(artikel).toContain('Liniendiagramm der beiden Mittelwerte und ihrem 95 %-Konfidenzintervall');
  });
  it('F8: Mediation nennt die Auswahl so, wie sie auf der Seite heißt', () => {
    expect(blatt).toContain("L('Intervall des indirekten Effekts'");
    expect(artikel).toContain('BCa-Intervall („Intervall des indirekten Effekts“;');
    expect(artikel).not.toContain('BCa-Intervall („Art des Intervalls“;');
  });
});
