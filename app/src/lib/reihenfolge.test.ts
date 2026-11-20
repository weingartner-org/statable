import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./sitzung.svelte', () => ({ L: (de: string) => de, istEn: () => false, aktuelleSprache: () => 'de', s: { einst: { sprache: 'de', zahl: 'komma' } }, melde: () => {} }));
import { leseCsv, zurEngine } from './einlesen';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { neuAufbauen, type Wert } from './eingabe';
import { parseCsv } from '../dialogs/csv';
import { nodeEngine } from './testengine';
import { finde } from './tabelle';
import { kategorien, ordnenMoeglich, ordneSpalte, schlageVor } from './reihenfolge';
import { spearman } from './rangkorrelation';
import { VERFAHREN, empfohleneKorrelation, type Ctx } from './verfahren';
import { projektAlsDatei, leseProjektdatei } from './projektdatei';

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

function lies(): { spalten: Spalte[]; zeilen: Wert[][] } {
  const spalten = leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
  e.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const roh = parseCsv(new TextDecoder().decode(e.lies('/t.csv'))).slice(1);
  const zeilen = roh.map(z => spalten.map((sp, i) => { const w = (z[i] ?? '').trim(); if (w === '') return null; return sp.art === 'zahl' ? Number(w) : w; }));
  return { spalten, zeilen };
}
const baue = (spalten: Spalte[], zeilen: Wert[][]) => { const { syntax, csv } = neuAufbauen(spalten, zeilen); const r = e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv }); expect(r.filter(i => i.type === 'message' && /error|warning/.test((i as { severity?: string }).severity ?? ''))).toEqual([]); };
const lade = () => {
  const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL('./testdaten/soziologie.csv', import.meta.url), 'utf8')));
  e.run('NEW FILE.\n' + syntax, { '/import.csv': csv });
  e.run('VARIABLE LEVEL Bildungsabschluss (ORDINAL).');
  return lies();
};
const REIHE = ['kein Abschluss', 'Hauptschule', 'Realschule', 'Abitur', 'Hochschule'];
const bildung = (sp: Spalte[]) => sp.findIndex(x => x.name === 'Bildungsabschluss');
/** Bildungsabschluss in der Reihenfolge REIHE, als wäre „Übernehmen“ gedrückt worden. */
function geordnet() {
  const { spalten, zeilen } = lade();
  const i = bildung(spalten);
  const k = kategorien(spalten[i]!, i, zeilen)!;
  const g = ordneSpalte(spalten[i]!, i, zeilen, REIHE.map(t => k.find(x => x.text === t)!));
  return { spalten, zeilen, i, g, neueSpalten: spalten.map((x, j) => (j === i ? g.spalte : x)), neueZeilen: zeilen.map((z, r) => z.map((v, j) => (j === i ? g.werte[r]! : v))) };
}

describe('Vorschlag der Reihenfolge', () => {
  it('Bildungsabschluss', () => {
    const v = schlageVor(['Abitur', 'Hauptschule', 'Hochschule', 'Realschule', 'kein Abschluss'])!;
    expect(v.reihenfolge).toEqual(REIHE); expect(v.skala).toBe('Bildung');
  });
  it('Antwortskalen: Häufigkeit und Zustimmung', () => {
    expect(schlageVor(['oft', 'nie', 'manchmal', 'immer', 'selten'])!.reihenfolge).toEqual(['nie', 'selten', 'manchmal', 'oft', 'immer']);
    expect(schlageVor(['sehr selten', 'sehr oft', 'selten', 'oft', 'manchmal'])!.reihenfolge).toEqual(['sehr selten', 'selten', 'manchmal', 'oft', 'sehr oft']);
    expect(schlageVor(['stimme voll zu', 'stimme eher zu', 'teils/teils', 'stimme eher nicht zu', 'stimme gar nicht zu'])!.reihenfolge)
      .toEqual(['stimme gar nicht zu', 'stimme eher nicht zu', 'teils/teils', 'stimme eher zu', 'stimme voll zu']);
    expect(schlageVor(['hoch', 'niedrig', 'mittel'])!.reihenfolge).toEqual(['niedrig', 'mittel', 'hoch']);
  });
  it('Zahlen am Anfang', () => {
    expect(schlageVor(['25-34', 'unter 18', '18-24', '65+', '35-64'])!.reihenfolge).toEqual(['unter 18', '18-24', '25-34', '35-64', '65+']);
    expect(schlageVor(['2 = selten', '1 = nie', '3 = oft'])!.reihenfolge).toEqual(['1 = nie', '2 = selten', '3 = oft']);
  });
  it('sonst keiner: Statable rät nicht', () => {
    expect(schlageVor(['Nord', 'Süd', 'Ost', 'West'])).toBeNull();
    expect(schlageVor(['nie', 'Süd'])).toBeNull();
  });
});

describe('soziologie.csv: Bildungsabschluss ordnen', () => {
  it('Einlesen: Text, alphabetisch, leere Felder zählen nicht', () => {
    const { spalten, zeilen } = lade();
    const i = bildung(spalten), sp = spalten[i]!;
    expect([sp.art, sp.niveau]).toEqual(['text', 'ordinal']);
    expect(ordnenMoeglich(sp, i, zeilen)).toBe(true);
    const k = kategorien(sp, i, zeilen)!;
    expect(k.map(x => x.text)).toEqual(['Abitur', 'Hauptschule', 'Hochschule', 'kein Abschluss', 'Realschule']);
    expect(k.reduce((a, x) => a + x.anzahl, 0)).toBe(950);
    expect(ordnenMoeglich({ ...sp, niveau: 'nominal' }, i, zeilen)).toBe(false);
  });

  it('Häufigkeitstabelle in neuer Reihenfolge, kumulierte Prozente wie R', () => {
    const { spalten, zeilen, i, g, neueSpalten, neueZeilen } = geordnet();
    expect(g.verworfen).toBe(0);
    expect(g.spalte).toMatchObject({ art: 'zahl', niveau: 'ordinal', name: 'Bildungsabschluss' });
    expect(g.spalte.werteLabels).toEqual({ 1: 'kein Abschluss', 2: 'Hauptschule', 3: 'Realschule', 4: 'Abitur', 5: 'Hochschule' });
    baue(neueSpalten, neueZeilen);
    const nachher = lies();
    expect(nachher.spalten[i]!.werteLabels).toEqual(g.spalte.werteLabels);
    expect(nachher.spalten[i]!.niveau).toBe('ordinal');
    expect(nachher.spalten.map(x => x.name)).toEqual(spalten.map(x => x.name));
    expect(nachher.zeilen.map(z => z.filter((_, j) => j !== i))).toEqual(zeilen.map(z => z.filter((_, j) => j !== i)));
    const r = e.run('FREQUENCIES VARIABLES=Bildungsabschluss.');
    const t = finde(r, /Bildungsabschluss/)!;
    const treffer = t.t.map((z, j) => ({ name: z.find(x => REIHE.includes(x)), n: t.n[j]! })).filter(x => x.name);
    expect(treffer.map(x => x.name)).toEqual(REIHE);
    expect(treffer.map(x => Number(x.n.filter(v => v !== undefined).at(-1)!.toFixed(1)))).toEqual([12.7, 39.9, 63.3, 83.2, 100]);
  });

  it('Spearman Bildung ~ Zufriedenheit: wählbar und gleich R', () => {
    const { spalten, zeilen, i, g, neueSpalten } = geordnet();
    const z = spalten.findIndex(x => x.name === 'Zufriedenheit');
    const zus = VERFAHREN.find(v => v.id === 'zusammenhang')!;
    const ctx = (sp: Spalte[]): Ctx => ({ verschieden: () => 5, gueltig: () => 900, istZahl: n => sp.find(x => x.name === n)?.art === 'zahl', ordinal: n => sp.find(x => x.name === n)?.niveau === 'ordinal' });
    expect(zus.luecken[0]!.passt(spalten[i]!, ctx(spalten))).toBe(false);
    expect(zus.luecken[0]!.passt(g.spalte, ctx(neueSpalten))).toBe(true);
    expect(empfohleneKorrelation('Bildungsabschluss', 'Zufriedenheit', ctx(neueSpalten)).methode).toBe('spearman');
    // Rscript: cor(b, Zufriedenheit, method = "spearman"), b = 1..5 in der Reihenfolge REIHE, n = 902
    const paare = zeilen.map((r, j) => [g.werte[j], r[z]] as [Wert, Wert]).filter(([a, b]) => a !== null && b !== null) as [number, number][];
    const s = spearman(paare);
    expect(paare.length).toBe(902);
    expect(s.r).toBeCloseTo(0.1767346784, 8);
    expect(s.p).toBeCloseTo(9.15833309e-8, 12);
  });

  it('Speichern und Öffnen: die .statable-Datei bringt Zahlen und Namen zurück', () => {
    const { i, g, neueSpalten, neueZeilen } = geordnet();
    baue(neueSpalten, neueZeilen);
    e.run("SAVE OUTFILE='/p.sav'.");
    const sav = e.lies('/p.sav').slice();
    const datei = projektAlsDatei({ name: 'Test', quelle: 'soziologie.csv', zeit: 1, sav, blaetter: [], sets: [], skalen: [], entscheid: {} } as never);
    const p = leseProjektdatei(datei);
    e.run('NEW FILE.');
    e.run("GET FILE='/q.sav'.", { '/q.sav': p.sav });
    const wieder = lies();
    expect(wieder.spalten[i]!.werteLabels).toEqual(g.spalte.werteLabels);
    expect(wieder.spalten[i]!.art).toBe('zahl');
    expect(wieder.zeilen.map(z => z[i])).toEqual(g.werte);
  });

  it('Zahlen-Codes mit Namen neu ordnen (zweites Mal ordnen)', () => {
    const sp: Spalte = { name: 'x', bezeichnung: '', art: 'zahl', niveau: 'ordinal', format: 'F8.0', fehlend: [99], fehlendText: '99', werteLabels: { 1: 'a', 2: 'b', 3: 'c' } };
    const zeilen: Wert[][] = [[1], [2], [3], [3], [99], [null]];
    expect(ordnenMoeglich(sp, 0, zeilen)).toBe(true);
    const k = kategorien(sp, 0, zeilen)!;
    expect(k.map(x => x.text)).toEqual(['a', 'b', 'c']);
    const g = ordneSpalte(sp, 0, zeilen, [k[2]!, k[0]!, k[1]!]);
    expect(g.werte).toEqual([2, 3, 1, 1, 99, null]);
    expect(g.spalte.werteLabels).toEqual({ 1: 'c', 2: 'a', 3: 'b' });
    expect(g.spalte.fehlend).toEqual([99]);
  });
});
