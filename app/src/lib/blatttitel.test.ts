import { describe, expect, it } from 'vitest';
import { s, type Blatt } from './sitzung.svelte';
import { titelNachziehen } from './blatttitel';

const blatt = (art: string, titel: string, l3: string[]): Blatt => ({ id: 'x', titel, art, l1: l3[0] ?? null, l2: l3[1] ?? null, l3, syntax: '', items: [], ergebnis: null, imBericht: true, notiz: '', zeit: 0 });

describe('Blatt-Titel folgen der Sprache (Test 07.10.: „Skala (4 Fragen)“ blieb englisch)', () => {
  it('übersetzt vorgeschlagene Titel und lässt eigene stehen', () => {
    const vorher = s.einst.sprache;
    try {
      s.einst.sprache = 'de';
      const b = [blatt('skala', 'Scale (4 questions)', ['FG22', 'FG44', 'FG63', 'FG76R']), blatt('faktor', 'Meine Faktoren', ['a', 'b', 'c']), blatt('befehle', 'Commands', [])];
      expect(titelNachziehen(b)).toBe(true);
      expect(b.map(x => x.titel)).toEqual(['Skala (4 Fragen)', 'Meine Faktoren', 'Befehle']);
      expect(titelNachziehen(b)).toBe(false);
      s.einst.sprache = 'en';
      titelNachziehen(b);
      expect(b.map(x => x.titel)).toEqual(['Scale (4 questions)', 'Meine Faktoren', 'Commands']);
    } finally { s.einst.sprache = vorher; }
  });
});
