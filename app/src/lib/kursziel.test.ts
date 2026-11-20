import { describe, it, expect } from 'vitest';
import { kursZielFrisch, FRISCH_MS } from './kursziel';
import type { Blatt } from './sitzung.svelte';

const blatt = (kursZiel: Blatt['kursZiel'], alter: number) => ({ kursZiel, zeit: Date.now() - alter }) as Blatt;

describe('kursZielFrisch', () => {
  it('springt zum gewählten Test, wenn das Blatt eben angelegt wurde', () => {
    expect(kursZielFrisch(blatt('ftest', 100), 'ftest')).toBe(true);
  });
  it('springt nicht zu einem anderen Test', () => {
    expect(kursZielFrisch(blatt('ftest', 100), 'anteil')).toBe(false);
  });
  it('springt nicht, wenn das Blatt über die Karte gewählt wurde', () => {
    expect(kursZielFrisch(blatt(undefined, 100), 'ftest')).toBe(false);
  });
  it('springt nicht mehr, wenn das Blatt später aus dem Heft geöffnet wird', () => {
    expect(kursZielFrisch(blatt('ftest', FRISCH_MS + 1000), 'ftest')).toBe(false);
  });
});
