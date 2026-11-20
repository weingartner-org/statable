import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { mehrfachRechnen, type MehrfachSet, type Zelle } from './mehrfach';
import { MEHRFACH_WENIG, basisFrage, basisFrageText, mehrfachHinweise, saetzeMehrfach, saetzeMitMehrfach, tabellenMehrfach } from './mehrfachsaetze';
import { saetzeVerteilung, verteilungNurSets } from './ergebnis';

const roh = readFileSync(new URL('./testdaten/mehrfach-medien.csv', import.meta.url), 'utf8').trim().split('\n').map(z => z.split(';'));
const kopf = roh[0]!;
const zeilen: Zelle[][] = roh.slice(1).map(z => z.map(t => (t.trim() === '' ? null : Number(t.replace(',', '.')))));
const medien = kopf.filter(n => n.startsWith('medien_'));
const NAMEN = ['Fernsehen', 'Radio', 'Zeitung', 'Internet', 'Podcast', 'Buch'];
const set: MehrfachSet = { name: 'medien', label: 'Genutzte Medien', spalten: medien, zaehlwert: 1 };
const gi = kopf.indexOf('gruppe');
const rechne = (mitNull: boolean, gruppe: boolean) => mehrfachRechnen({
  set, optionsNamen: NAMEN, zeilen: zeilen.map(z => medien.map(n => z[kopf.indexOf(n)]!)), fehlend: medien.map(() => []), mitNull,
  ...(gruppe ? { gruppe: { spalte: 'gruppe', name: 'Studiengang', werte: zeilen.map(z => z[gi]!), fehlend: [], stufenName: (w: string | number) => (w === 1 ? 'Lehramt' : 'Sonderpädagogik') } } : {})
});
const mitSprache = <T,>(sp: 'de' | 'en', f: () => T): T => { const alt = s.einst.sprache; s.einst.sprache = sp; try { return f(); } finally { s.einst.sprache = alt; } };
/** Geschützte Leerzeichen (vor %) als gewöhnliche, damit die Erwartungen lesbar bleiben. */
const glatt = <T extends object>(o: T): T => JSON.parse(JSON.stringify(o).replace(/\u00a0/g, ' '));

describe('Sätze und Tabellen zu Mehrfachantworten', () => {
  it('Häufigkeiten: häufigste Option, Basis, mehr als 100 %', () => {
    const t = glatt(mitSprache('de', () => saetzeMehrfach(rechne(false, false))));
    expect(t.haupt).toContain('wurde „Fernsehen“ am häufigsten genannt: von 24 der 31 Personen, die mindestens eine Option angekreuzt haben (77 % der Fälle)');
    expect(t.haupt).toContain('„Radio“ (55 %)');
    expect(t.zusatz).toContain('72 Nennungen, im Mittel 2,3 je Person'); expect(t.zusatz).toContain('summieren sich auf 232 %');
    expect(t.zusatz).toContain('7 von 38 Personen, die die Frage beantwortet haben'); expect(t.zusatz).toContain('2 von 40 Zeilen haben keine Angabe');
    expect(t.apa).toContain('Fernsehen n = 24 (77,4 % der Fälle)'); expect(t.apa).toContain('N = 31 Fälle, 72 Antworten');
    expect(t.marken.map(m => m.erklaer)).toEqual(expect.arrayContaining(['prozent-der-faelle', 'prozent-der-antworten', 'mehrfachantworten-set']));
    expect(t.vorsicht).toContain('hängen zusammen');
  });
  it('englisch', () => {
    const t = glatt(mitSprache('en', () => saetzeMehrfach(rechne(false, false))));
    expect(t.haupt).toContain('"Fernsehen" was named most often: by 24 of 31 people who checked at least one option (77% of cases)');
    expect(t.zusatz).toContain('72 checks in total, 2.3 per person');
  });
  it('mit Fällen ohne Ankreuzung wird es gesagt', () => {
    const t = glatt(mitSprache('de', () => saetzeMehrfach(rechne(true, false))));
    expect(t.zusatz).toContain('7 Personen haben nichts angekreuzt und zählen mit');
  });
  it('Kreuztabelle: Gruppen, größter Unterschied in Prozentpunkten, kein Test', () => {
    const t = glatt(mitSprache('de', () => saetzeMehrfach(rechne(false, true))));
    expect(t.zusatz).toContain('größte Unterschied zwischen den Gruppen liegt bei „Radio“: 75 % der Fälle in der Gruppe „Sonderpädagogik“ gegen 36 % in der Gruppe „Lehramt“ (39 Prozentpunkte)');
    expect(t.zusatz).toContain('1 Person ohne Angabe zu „Studiengang“ bleibt');
    expect(t.vorsicht).toContain('Chi-Quadrat-Test'); expect(t.apa).not.toMatch(/χ²/);
  });
  it('Tabellen: Summenzeile und Spalten-Prozente', () => {
    const [h] = mitSprache('de', () => tabellenMehrfach(rechne(false, false)));
    const z = (i: number) => h!.cells.filter(c => c.r === i).map(c => c.t);
    expect(z(1)).toEqual(['Fernsehen', '24', '33.3', '77.4']);
    expect(z(7)).toEqual(['Gesamt', '72', '100.0', '232.3']);
    const [k, h2] = mitSprache('de', () => tabellenMehrfach(rechne(false, true)));
    expect(k!.cols).toBe(1 + 2 * 2 + 2); expect(h2!.rows).toBe(8);
    // Zweizeiliger Kopf (Abnahme 4, B8): Gruppe mit n über je zwei Spalten, darunter Anzahl und % der Fälle
    expect(k!.headRows[0]).toBe(2);
    expect(k!.cells.filter(c => c.r === 0).map(c => [c.t, c.cs])).toEqual([['', 1], ['Lehramt (n = 14)', 2], ['Sonderpädagogik (n = 16)', 2], ['Gesamt (n = 30)', 2]]);
    expect(k!.cells.filter(c => c.r === 1).map(c => c.t)).toEqual(['Option', 'Anzahl', '% der Fälle', 'Anzahl', '% der Fälle', 'Anzahl', '% der Fälle']);
    expect(k!.cells.filter(c => c.r === 2).map(c => c.t)).toEqual(['Fernsehen', '11', '78.6', '12', '75.0', '23', '76.7']);
    expect(k!.cells.filter(c => c.r === 8).map(c => c.t)).toEqual(['n (Basis)', '14', '', '16', '', '30', '']);
  });
  it('Hinweise: wenige Fälle', () => {
    expect(MEHRFACH_WENIG).toBe(30);
    expect(mehrfachHinweise(rechne(false, false)).find(h => h.art === 'ok')?.text).toContain('31 Personen');
    expect(mehrfachHinweise(rechne(false, true)).find(h => h.art === 'hinweis' && h.klein?.includes('unsicher'))).toBeUndefined();
    const klein = mehrfachRechnen({ set, optionsNamen: NAMEN, zeilen: zeilen.slice(0, 6).map(z => medien.map(n => z[kopf.indexOf(n)]!)), fehlend: medien.map(() => []), mitNull: false });
    expect(mehrfachHinweise(klein).find(h => h.art === 'hinweis' && h.klein?.includes('unsicher'))).toBeDefined();
  });
  it('Basis (Abnahme 4, B3): „45 Personen“ sind die Ankreuzer, nicht alle, die geantwortet haben', () => {
    // 60 Zeilen: 45 mit Ankreuzung, 13 mit Angabe aber ohne Ankreuzung, 2 ohne jede Angabe (wie im Beleg der Abnahme: 45 von 58)
    const set2: MehrfachSet = { name: 'nutz', label: 'Mediennutzung', spalten: ['a', 'b'], zaehlwert: 1 };
    const z: Zelle[][] = [...Array(45).fill(0).map((_, i) => [1, i % 2 ? 1 : 2]), ...Array(13).fill(0).map(() => [2, 2]), ...Array(2).fill(0).map(() => [null, null])] as Zelle[][];
    const eing = (mitNull: boolean) => ({ set: set2, optionsNamen: ['A', 'B'], zeilen: z, fehlend: [[], []], mitNull });
    const std = mehrfachRechnen(eing(false)), alle = mehrfachRechnen(eing(true));
    expect([std.faelle, std.mitAngabe, std.nichtAngekreuzt, alle.faelle]).toEqual([45, 58, 13, 58]);
    const t = glatt(mitSprache('de', () => saetzeMehrfach(std)));
    expect(t.haupt).toContain('der 45 Personen, die mindestens eine Option angekreuzt haben');
    expect(t.marken.map(m => m.text)).toContain('45 Personen mit mindestens einer Ankreuzung');
    expect(JSON.stringify(t.marken)).not.toContain('mit Angabe');
    expect(t.zusatz).toContain('13 von 58 Personen, die die Frage beantwortet haben, haben nichts angekreuzt');
    const h = mitSprache('de', () => mehrfachHinweise(std)).find(x => x.text.includes('13 von 58'))!;
    expect(h.art).toBe('hinweis');   // 22 % - mehr als ein Zehntel: hervorgehoben
    expect(mitSprache('de', () => basisFrageText(std))).toContain('Basis ändern?');
    expect(basisFrage(alle)).toBeNull();
    expect(glatt(mitSprache('de', () => saetzeMehrfach(alle))).marken.map(m => m.text)).toContain('58 Personen mit mindestens einer Angabe');
    const en = glatt(mitSprache('en', () => saetzeMehrfach(std)));
    expect(en.haupt).toContain('of 45 people who checked at least one option'); expect(en.marken.map(m => m.text)).toContain('45 people who checked at least one option');
    // Wenige Nichtankreuzer (unter einem Zehntel): Hinweis nur als Information
    const wenig = mehrfachRechnen({ ...eing(false), zeilen: [...z.slice(0, 45), ...z.slice(45, 47)] });
    expect(mitSprache('de', () => mehrfachHinweise(wenig)).find(x => x.text.includes('2 von 47'))?.art).toBe('info');
  });
  it('Verteilung nur mit Set und gemischt', () => {
    const m = rechne(false, false);
    const nur = saetzeMitMehrfach(verteilungNurSets([m]), saetzeVerteilung);
    expect(nur.haupt).toContain('Fernsehen');
    const gemischt = saetzeMitMehrfach({ art: 'verteilung', zahlen: [{ name: 'Alter', n: 30, m: 21.5, sd: 2, min: 18, max: 30 }], gruppen: [], mehrfach: [m] }, saetzeVerteilung);
    expect(gemischt.haupt).toContain('Alter'); expect(gemischt.zusatz).toContain('Fernsehen'); expect(gemischt.apa).toContain('M = 21,50');
  });
});
