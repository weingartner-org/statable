import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { baueFaelle, kennwerte, runde2, type RohSpalte } from './faelle';
import { zahlDe } from './format';
import { eigeneSpalten, ergebnisFuer, neuesKatBlatt, uebernahmeStand } from './kategorienblatt';
import { ergebnis, leererKatZustand, neueKategorie, ordne, setzeModus, type Antwort } from './kategorisieren';
import type { Spalte } from './verzeichnis';

/* Befunde der Fachprüfung Welle 4 (Bauer): Rundung an exakten Grenzen (G1) und Erkennung eigener Spalten (G7). */

describe('G1: Rundung an exakten Grenzen', () => {
  const roh: RohSpalte[] = [{ name: 'x', bezeichnung: 'x', art: 'zahl', fehlend: [], werteLabels: {} }, { name: 't', bezeichnung: 't', art: 'text', fehlend: [], werteLabels: {} }];
  it('runde2: 2,975 → 2,98 (wie R und PSPP), auch wenn die Rechnung 2,9749999… ergibt', () => {
    expect(runde2(2.975)).toBe(2.98);
    expect(runde2(2.9749999999999996)).toBe(2.98);
    expect(runde2(2.974)).toBe(2.97);
    expect(runde2(-2.975)).toBe(-2.98);
    expect(runde2(4)).toBe(4);
  });
  it('kennwerte: M = 2,975 erscheint als 2,98 (M, SD, Median stabilisiert)', () => {
    const e = baueFaelle(roh, [[2.5, 'a'], [3.3, 'b'], [3.2, 'c'], [2.9, 'd']], { kennung: '', q: ['x'], t: ['t'] });
    const k = kennwerte(e, [0, 1, 2, 3])[0]!;
    if (k.art !== 'zahl') throw new Error('Zahl erwartet');
    expect(k.mean).toBe(2.975);
    expect(zahlDe(k.mean!, 2)).toBe('2,98');
    expect(zahlDe(runde2(k.median!))).toBe('3,05');
  });
});

const sp = (name: string, art: 'zahl' | 'text' = 'zahl', extra: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: name, art, niveau: 'nominal', format: art === 'text' ? 'A50' : 'F8.2', fehlend: [], fehlendText: '', werteLabels: {}, ...extra });
const antw: Antwort[] = ['a', 'b', 'c'].map((t, i) => ({ schluessel: String(i + 1), text: t }));

describe('G7: eigene Spalte nicht nur am Namen erkennen', () => {
  function vorbereiten() {
    const text = sp('antwort', 'text');
    s.spalten = [sp('nr'), text]; s.zeilen = [[1, 'a'], [2, 'b'], [3, 'c']]; s.sets = [];
    const kb = neuesKatBlatt('antwort', 'T').kat!;
    const a = neueKategorie(kb.z, 'Praxis'); neueKategorie(kb.z, 'Zeit');
    ordne(kb.z, '1', a);
    const erg = ergebnisFuer(kb, 1, []);
    const eigen = sp('antwort_kat', 'zahl', { bezeichnung: erg.spalten[0]!.label, werteLabels: { '1': 'Praxis', '2': 'Zeit' } });
    s.spalten = [sp('nr'), text, eigen]; s.zeilen = [[1, 'a', 1], [2, 'b', null], [3, 'c', null]];
    kb.uebernommen[0] = { namen: ['antwort_kat'], set: null, merkmal: [{ label: eigen.bezeichnung, werte: JSON.stringify([['1', 'Praxis'], ['2', 'Zeit']]) }] };
    return { kb, text };
  }
  it('die eigene Spalte (Label und Wertelabels passen) wird erkannt und überschrieben', () => {
    const { kb } = vorbereiten();
    expect(eigeneSpalten(kb, 1)).toEqual(['antwort_kat']);
    expect(uebernahmeStand(kb, 1)).toBe('aktuell');
    expect(ergebnisFuer(kb, 1).spalten[0]!.name).toBe('antwort_kat');
  });
  it('eine fremde Spalte gleichen Namens (eigene gelöscht und neu angelegt) gilt als fremd: neuer Name, nie überschreiben', () => {
    const { kb, text } = vorbereiten();
    s.spalten = [sp('nr'), text, sp('antwort_kat', 'zahl', { bezeichnung: 'Etwas ganz anderes' })];
    expect(eigeneSpalten(kb, 1)).toEqual([]);
    expect(uebernahmeStand(kb, 1)).toBe('nicht');
    expect(ergebnisFuer(kb, 1).spalten[0]!.name).toBe('antwort_kat2');
  });
  it('Kategorie umbenannt: eines der beiden Merkmale passt noch, die Spalte bleibt die eigene', () => {
    const { kb } = vorbereiten();
    s.spalten[2]!.werteLabels = { '1': 'Praxisbezug', '2': 'Zeit' };
    expect(eigeneSpalten(kb, 1)).toEqual(['antwort_kat']);
  });
  it('ältere Projekte ohne Merkmal: der Name zählt allein', () => {
    const { kb } = vorbereiten();
    delete kb.uebernommen[0]!.merkmal;
    s.spalten[2]!.bezeichnung = 'anders'; s.spalten[2]!.werteLabels = {};
    expect(eigeneSpalten(kb, 1)).toEqual(['antwort_kat']);
  });
});

describe('G7: ein gemeinsamer Stamm für die 0/1-Spalten', () => {
  it('Namenskollision: alle Spalten tragen denselben freien Stamm, die Nummern folgen der Kategorienliste', () => {
    const z = leererKatZustand(); setzeModus(z, true);
    for (let i = 1; i <= 12; i++) neueKategorie(z, `K${i}`);
    const namen = ergebnis(antw, z, 'wunsch', ['wunsch_kat2']).spalten.map(x => x.name);
    expect(namen).toEqual(Array.from({ length: 12 }, (_, i) => `wunsch_kat2${i + 1}`));
    expect(new Set(namen).size).toBe(12);
    const frei = ergebnis(antw, z, 'wunsch', []).spalten.map(x => x.name);
    expect(frei[0]).toBe('wunsch_kat1'); expect(frei[11]).toBe('wunsch_kat12');
  });
});
