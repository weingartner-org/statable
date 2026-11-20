/** Folgeblöcke unter MANOVA und Diskriminanzanalyse: Box-Test, Levene, Strukturmatrix, Diagramm mit Zentroiden und Textfassung (iris, auf dem Server gerendert). */
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { s } from '../lib/sitzung.svelte';
import { csv } from '../lib/testdaten/field2';
import { sitz } from '../lib/kptesthilfe';
import ManovaFolge from './ManovaFolge.svelte';
import DiskrStruktur from './DiskrStruktur.svelte';
import type { ManovaE } from '../lib/manova';
import type { DiskrE } from '../lib/diskriminanz';

s.einst.sprache = 'de'; s.einst.anrede = 'du';
const ZIELE = ['Sepal.Length', 'Sepal.Width', 'Petal.Length', 'Petal.Width'];
const iris = csv('iris.csv');
const q = sitz({ Species: iris.map(r => r.Species as string), ...Object.fromEntries(ZIELE.map(z => [z, iris.map(r => r[z] as number)])) }, ['Species']);
s.spalten = q.spalten; s.zeilen = q.zeilen;
const html = (c: unknown, props: Record<string, unknown>) => (render(c as never, { props }).body as string).replace(/ ?svelte-\w+/g, '');
const name = (n: string) => n;

describe('MANOVA-Folge', () => {
  const h = html(ManovaFolge, { e: { gruppe: 'Species', ziele: ZIELE } as unknown as ManovaE, name });
  it('Knopf zur Diskriminanzanalyse, Box-Test und Levene-Test je Zielgröße', () => {
    expect(h).toContain('Wie unterscheiden sich die Gruppen? (Diskriminanzanalyse)');
    expect(h).toContain('Box-M-Test'); expect(h).toContain('146,66'); expect(h).toContain('7,05');
    expect(h).toContain('Levene-Test'); expect(h).toContain('7,38'); expect(h).toContain('20,68');
    expect(h).toContain('Pillai');
    expect(h).toMatch(/<th[^>]*scope="row"[^>]*>Sepal\.Width</);
  });
});
describe('Diskriminanz: Struktur und Diagramm', () => {
  const h = html(DiskrStruktur, { e: { gruppe: 'Species', merkmale: ZIELE } as unknown as DiskrE, name });
  it('Strukturmatrix mit Anteil, Diagramm mit großen Zentroiden und Textfassung als Tabelle', () => {
    expect(h).toContain('Strukturmatrix'); expect(h).toContain('99,1'); expect(h).toMatch(/-,706|,706/);
    expect(h).toContain('Gruppenzentroid (große Punkte)'); expect(h).toMatch(/r="11"/);
    expect(h).toMatch(/<caption[^>]*>Gruppenzentroide</); expect(h).toContain('versicolor');
    expect(h).toMatch(/role="img"/);
  });
});
