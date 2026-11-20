import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('./sitzung.svelte', () => ({ L: (de: string) => de, istEn: () => false, aktuelleSprache: () => 'de', s: { einst: { sprache: 'de', zahl: 'sprache' } }, melde: () => {} }));
import * as XLSX from 'xlsx';
import { DateiFehler, leseTabellenkalkulation, setzeBlattFrager, type BlattInfo } from './einlesen';

/* S-F2 D1: Hat eine Arbeitsmappe mehr als ein Blatt mit Inhalt, fragt Statable, welches (Name und Zahl der Zeilen). Ein Blatt mit Inhalt: wie bisher, ohne Frage. */
const mappe = (blaetter: [string, unknown[][]][]) => {
  const m = XLSX.utils.book_new();
  for (const [n, aoa] of blaetter) XLSX.utils.book_append_sheet(m, XLSX.utils.aoa_to_sheet(aoa), n);
  return XLSX.write(m, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
};
const zwei = () => mappe([['Frauen', [['id', 'punkte'], [1, 10], [2, 20], [3, 30]]], ['Leer', []], ['Männer', [['id', 'punkte'], [4, 40], [5, 50]]]]);

afterEach(() => setzeBlattFrager(null));

describe('Excel-Blatt wählen', () => {
  it('mehrere Blätter mit Inhalt: Statable fragt mit Name und Zahl der Zeilen (leere Blätter fehlen in der Liste)', async () => {
    let gefragt: { datei: string; blaetter: BlattInfo[] } | null = null;
    setzeBlattFrager(async (datei, blaetter) => { gefragt = { datei, blaetter }; return 'Männer'; });
    const t = await leseTabellenkalkulation(zwei(), 'daten.xlsx');
    expect(gefragt).toEqual({ datei: 'daten.xlsx', blaetter: [{ name: 'Frauen', zeilen: 3 }, { name: 'Männer', zeilen: 2 }] });
    expect(t.zeilen.map(z => z[0])).toEqual([4, 5]);
    expect(t.quelle).toContain('Männer');
    expect(t.blatt).toBe('Männer'); expect(t.gewaehlt).toBe(true); expect(t.weitere).toEqual(['Frauen']);
  });
  it('ein Blatt mit Inhalt: keine Frage', async () => {
    const frage = vi.fn(async () => 'x');
    setzeBlattFrager(frage);
    const t = await leseTabellenkalkulation(mappe([['Leer', []], ['Daten', [['a'], [1]]]]), 'x.xlsx');
    expect(frage).not.toHaveBeenCalled();
    expect(t.kopf).toEqual(['a']); expect(t.gewaehlt).toBeUndefined();
  });
  it('Abbrechen in der Frage: nichts wird geöffnet', async () => {
    setzeBlattFrager(async () => null);
    await expect(leseTabellenkalkulation(zwei(), 'daten.xlsx')).rejects.toMatchObject({ grund: 'abgebrochen' });
    await expect(leseTabellenkalkulation(zwei(), 'daten.xlsx')).rejects.toBeInstanceOf(DateiFehler);
  });
  it('ein ausdrücklich genanntes Blatt wird ohne Frage gelesen; ein unbekanntes ist ein Fehler', async () => {
    const frage = vi.fn(async () => 'Frauen');
    setzeBlattFrager(frage);
    const t = await leseTabellenkalkulation(zwei(), 'daten.xlsx', 'Frauen');
    expect(frage).not.toHaveBeenCalled(); expect(t.zeilen).toHaveLength(3);
    await expect(leseTabellenkalkulation(zwei(), 'daten.xlsx', 'Gibt es nicht')).rejects.toMatchObject({ grund: 'unlesbar' });
  });
  it('ohne Frager (Tests, andere Wege): wie bisher das erste Blatt mit Inhalt, mit Hinweis auf die übrigen', async () => {
    const t = await leseTabellenkalkulation(zwei(), 'daten.xlsx');
    expect(t.zeilen).toHaveLength(3); expect(t.weitere).toEqual(['Männer']); expect(t.gewaehlt).toBeUndefined();
  });
});
