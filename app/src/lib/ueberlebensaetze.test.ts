import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import { kaplanAus } from './ueberleben';
import { kaplanHinweise, medStellen, ratenZeit, saetzeKaplan, tabellenKaplan } from './ueberlebensaetze';

const lies = (d: string) => readFileSync(new URL(`./testdaten/${d}`, import.meta.url), 'utf8').trim().split('\n').slice(1).map(z => z.split(';'));
const aml = lies('kaplanmeier-aml.csv'), lung = lies('kaplanmeier-lung.csv');
const bau = (zeilen: string[][], gcol: number | null, status: (z: string[]) => 0 | 1, namen: string[], w: [string, string]) =>
  kaplanAus(zeilen.map(z => [gcol === null ? 0 : namen.indexOf(z[gcol]!), Number(z[0]), status(z)] as [number, number, 0 | 1]), { zeit: 'zeit', ereignis: 'status', gruppe: gcol === null ? '' : 'gruppe', gruppenNamen: namen, werte: w, ereignisIndex: 1, zeilen: zeilen.length, ausgelassen: 0 });
const amlGr = bau(aml, 2, z => Number(z[1]) as 0 | 1, ['Erhaltungstherapie', 'Ohne Erhaltung'], ['0', '1']);
const lungEins = bau(lung, null, z => (z[1] === '2' ? 1 : 0), [''], ['1', '2']);
const lungEcog = bau(lung, 3, z => (z[1] === '2' ? 1 : 0), ['0', '1', '2'], ['1', '2']);
const mitSprache = <T,>(sp: 'de' | 'en', f: () => T): T => { const alt = s.einst.sprache; s.einst.sprache = sp; try { return f(); } finally { s.einst.sprache = alt; } };

describe('Stellenzahl der Mediane einheitlich (B6)', () => {
  it('medStellen: so viele Stellen wie der genaueste Wert, höchstens zwei', () => {
    const g = (w: number, lo: number, hi: number) => ({ median: { wert: w, lo, hi } }) as never;
    expect(medStellen([g(9.2, 8.65, 9.76), g(5.61, 5.42, 5.8)])).toBe(2);
    expect(medStellen([g(9.2, 8.5, 9.5)])).toBe(1);
    expect(medStellen([g(9, 8, 10)])).toBe(0);
    expect(medStellen([g(9, NaN, Infinity)])).toBe(0);
  });
  it('Satz und APA-Zeile: Mediane und Grenzen mit gleich vielen Nachkommastellen', () => {
    const zeit = [1.5, 2.5, 3.5, 4.25, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5];
    const roh = zeit.flatMap((t, i) => [[0, t, 1], [1, t * 0.6 + 0.01 * i, 1]] as [number, number, 0 | 1][]);
    const k = kaplanAus(roh, { zeit: 'zeit', ereignis: 'status', gruppe: 'g', gruppenNamen: ['A', 'B'], werte: ['0', '1'], ereignisIndex: 1, zeilen: roh.length, ausgelassen: 0 });
    const t = saetzeKaplan(k);
    const segmente = t.apa.match(/Mdn \([AB]\) = [^\]]*\]/g) ?? [];
    const stellen = segmente.flatMap(x => [...x.replace('95 %-KI', '').matchAll(/\d+(?:,(\d+))?/g)].map(m => m[1]?.length ?? 0));
    expect(segmente.length, t.apa).toBe(2); expect(stellen.length, t.apa).toBeGreaterThan(2);
    expect(new Set(stellen).size, t.apa).toBe(1);
  });
});

describe('Sätze und Tabellen zu Kaplan-Meier', () => {
  it('eine Kurve: Median mit Intervall, APA-Zeile', () => {
    const t = saetzeKaplan(lungEins);
    expect(t.haupt).toContain('Von 118 Personen erlebten 107 das Ereignis („2“), 11 wurden zensiert');
    expect(t.haupt).toContain('beträgt 303 (95 %-KI [226; 390])');
    expect(t.apa).toBe('Mdn = 303, 95 %-KI [226; 390]; 118 Personen, 107 Ereignisse');
    expect(t.marken.map(m => m.erklaer)).toEqual(expect.arrayContaining(['median-ueberlebenszeit', 'zensierung', 'kaplan-meier']));
  });
  it('zwei Gruppen: Log-Rank-Satz, Median nicht erreicht wird gesagt', () => {
    const t = saetzeKaplan(amlGr);
    expect(t.zusatz).toContain('Einen Unterschied zwischen den Überlebenskurven belegt der Log-Rank-Test nicht'); expect(t.zusatz).toContain('χ²(1) = 3,40, p = ,065');
    expect(t.haupt).toContain('Erhaltungstherapie: 31 (95 %-KI [18; nicht erreicht])');
    expect(t.apa).toContain('Log-Rank: χ²(1) = 3,40, p = ,065'); expect(t.apa).toContain('- = nicht erreicht');
    expect(t.marken.map(m => m.erklaer)).toEqual(expect.arrayContaining(['log-rank', 'p-wert']));
  });
  it('drei Gruppen: signifikant, paarweise Tabelle mit Holm', () => {
    const t = saetzeKaplan(lungEcog);
    expect(t.zusatz).toContain('Die Überlebenskurven unterscheiden sich; ein so großer Unterschied wäre selten'); expect(t.zusatz).toContain('χ²(2) = 11,85, p = ,003');
    const tab = tabellenKaplan(lungEcog);
    expect(tab.map(x => x.label)).toEqual(['Survival Time', 'Survival Function', 'Log-Rank Test', 'Pairwise Log-Rank']);
    expect(tab[3]!.rows).toBe(4);
  });
  it('Tabellen: Median mit „nicht erreicht“, Überlebensfunktion je Marke', () => {
    const tab = tabellenKaplan(amlGr);
    const med = tab[0]!;
    expect(med.cells.some(c => c.t === 'nicht erreicht')).toBe(true);
    expect(tab[1]!.rows).toBe(1 + 2 * (amlGr.ticks.length - 1));
  });
  it('Hinweise: wenige Ereignisse, Zensierungsannahme; Kreuzen wird gemeldet', () => {
    const h = kaplanHinweise(amlGr).map(x => x.text);
    expect(h.some(x => x.startsWith('Wenige Ereignisse'))).toBe(true);
    expect(h.some(x => x.startsWith('Kann Statable nicht prüfen'))).toBe(true);
    const kreuz = kaplanAus([[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 9, 0], [1, 1, 0], [1, 5, 1], [1, 6, 1], [1, 7, 1]] as [number, number, 0 | 1][], { zeit: 'z', ereignis: 'e', gruppe: 'g', gruppenNamen: ['A', 'B'], werte: ['0', '1'], ereignisIndex: 1, zeilen: 8, ausgelassen: 0 });
    expect(kreuz.kreuzen).toBe(true);
    expect(kaplanHinweise(kreuz).some(x => x.text === 'Die Kurven schneiden sich')).toBe(true);
    expect(amlGr.kreuzen).toBe(false);
  });
  it('Zeitpunkt der Raten liegt bei einer Marke', () => { expect(lungEins.ticks).toContain(ratenZeit(lungEins)); });
  it('englisch', () => {
    mitSprache('en', () => {
      const t = saetzeKaplan(amlGr);
      expect(t.zusatz).toContain('The log-rank test does not show a difference between the survival curves'); expect(t.zusatz).toContain('χ²(1) = 3.40, p = .065');
      expect(t.haupt).toContain('Erhaltungstherapie: 31 (95% CI [18, not reached])');
      expect(tabellenKaplan(amlGr)[0]!.cells.some(c => c.t === 'not reached')).toBe(true);
    });
  });
});

describe('Abnahme 3: Kaplan-Meier', () => {
  it('K3: „- = nicht erreicht“ nur, wenn ein Strich in der Zeile steht; kein Gedankenstrich', () => {
    expect(saetzeKaplan(amlGr).apa).toContain('[18; -]');
    expect(saetzeKaplan(amlGr).apa).toContain('; - = nicht erreicht');
    expect(saetzeKaplan(amlGr).apa).not.toContain('–');
    expect(saetzeKaplan(lungEins).apa).not.toContain('nicht erreicht');
    // alle Mediane und Grenzen erreicht (lung nach ecog: jede Gruppe)
    const alle = lungEcog.gruppen.every(g => [g.median.wert, g.median.lo, g.median.hi].every(Number.isFinite));
    const ap = saetzeKaplan(lungEcog).apa;
    expect(ap.includes('nicht erreicht')).toBe(!alle);
    expect(mitSprache('en', () => saetzeKaplan(amlGr).apa)).toContain('; - = not reached');
  });
  it('K4: Zeitpunkt mit Einheit, „6 und 5“, eine Schreibweise in der Median-Spalte', () => {
    expect(saetzeKaplan(lungEins).zusatz).toMatch(/^Zum Zeitpunkt \d+ \(in Einheiten von „zeit“\) liegt der geschätzte Anteil/);
    const zwei = kaplanAus([[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 9, 0], [1, 1, 0], [1, 5, 1], [1, 6, 1], [1, 7, 1]] as [number, number, 0 | 1][], { zeit: 'z', ereignis: 'e', gruppe: 'g', gruppenNamen: ['A', 'B'], werte: ['0', '1'], ereignisIndex: 1, zeilen: 8, ausgelassen: 0 });
    expect(kaplanHinweise(zwei).find(x => x.text.startsWith('Wenige Ereignisse'))!.text).toBe('Wenige Ereignisse in 2 Gruppen: 3 und 3');
    const med = tabellenKaplan(amlGr)[0]!;
    const kopf = med.cells.filter(c => c.r === 0).map(c => c.t);
    expect(kopf.slice(0, 3)).toEqual(['Gruppe', 'n', 'Median']);       // K2: Median und Intervall stehen vorn (Handy)
    const stellen = new Set(med.cells.filter(c => c.r > 0 && c.c >= 2 && c.c <= 4 && c.n !== undefined).map(c => (c.t.split('.')[1] ?? '').length));
    expect(stellen.size).toBe(1);
  });
  it('M6: Bericht - Satz, dann „Statistik:“; die Klammern des Satzes bleiben ganz', async () => {
    const { berichtSatz } = await import('./berichtsatz');
    const b = { id: 'k', titel: 'k', art: 'kaplanmeier', l1: 'zeit', l2: 'status', l3: [], syntax: '', items: [], ergebnis: { typ: 'kaplanmeier', e: amlGr }, imBericht: true, notiz: '', zeit: 0 };
    const satz = berichtSatz(b as never);
    expect((satz.match(/\(/g) ?? []).length).toBe((satz.match(/\)/g) ?? []).length);
    expect(satz).toMatch(/\. Statistik: Log-Rank: χ²\(1\) = 3,40/);
    expect(satz).toContain('Erhaltungstherapie: 31 (95 %-KI [18; nicht erreicht])');
  });
});
