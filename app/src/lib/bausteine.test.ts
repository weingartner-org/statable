import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { leseVerzeichnis } from './verzeichnis';
import { parseCsv } from '../dialogs/csv';
import { bausteine } from './bausteine';
import { nodeEngine } from './testengine';
import type { OutputItem } from '../engine/types';

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

/** Lädt Daten frisch und liest Spalten und Zeilen wie die App (sitzung.svelte.ts). */
function lade(daten: string, dateien: Record<string, Uint8Array> = {}) {
  e.run('NEW FILE.\n' + daten, dateien);
  const spalten = leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
  e.run("SAVE TRANSLATE /OUTFILE='/b.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const zeilen = parseCsv(new TextDecoder().decode(e.lies('/b.csv'))).slice(1)
    .map(z => spalten.map((sp, i) => { const w = (z[i] ?? '').trim(); return w === '' ? null : sp.art === 'zahl' ? Number(w) : w; }));
  return { spalten, zeilen };
}
const fehler = (items: OutputItem[]) => items.filter(i => i.type === 'message' && i.severity !== 'note').map(i => (i as { text: string }).text);

const BEISPIEL = zurEngine(leseCsv(readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8')));
const beispiel = () => lade(BEISPIEL.syntax, { '/import.csv': BEISPIEL.csv });

// Eigene Daten mit anderen Namen: Fragen FG1-FG4, Schulart als Zahl mit Wertelabels (3 Gruppen), Geschlecht als Text, Punkte.
const EIGEN = `DATA LIST FREE /id schulart (F1) geschl (A1) FG1 FG2 FG3 FG4 punkte.
BEGIN DATA
${Array.from({ length: 40 }, (_, i) => { const a = (i * 7) % 5 + 1; return `${i + 1} ${i % 3 + 1} ${i % 2 ? 'w' : 'm'} ${a} ${Math.min(5, a + (i % 2))} ${Math.max(1, a - (i % 3 === 0 ? 1 : 0))} ${(a + i) % 5 + 1} ${40 + (i * 13) % 37}`; }).join('\n')}
END DATA.
VARIABLE LEVEL schulart geschl (NOMINAL).
VALUE LABELS schulart 1 'MS' 2 'AHS' 3 'BHS'.`;
const eigen = () => lade(EIGEN);

describe('Befehls-Bausteine (Test 07.10.: feste Beispiele liefen mit eigenen Daten ins Leere)', () => {
  it('Beispieldaten: alle fünf Gruppen, 18 Bausteine, Spalten passend gewählt', () => {
    const g = bausteine(...Object.values(beispiel()) as Parameters<typeof bausteine>);
    expect(g.map(x => x.id)).toEqual(['beschreiben', 'unterschiede', 'zusammenhaenge', 'skalen', 'vorbereiten']);
    expect(g.flatMap(x => x.bausteine).length).toBe(18);
    const b = Object.fromEntries(g.flatMap(x => x.bausteine).map(x => [x.id, x.syntax]));
    expect(b['ttest-unabh']).toMatch(/^T-TEST GROUPS=(geschlecht|handy_im_bett)\('[^']+' '[^']+'\)\n {2}\/VARIABLES=konzentration\.$/);
    expect(b['descriptives']).not.toMatch(/\bnr\b|geschlecht/);
    expect(b['crosstabs']).toMatch(/^CROSSTABS \/TABLES=(geschlecht|handy_im_bett) BY (geschlecht|handy_im_bett|semester)/);
  });

  it('Beispieldaten: jeder Baustein läuft in der Engine ohne Fehler', () => {
    const { spalten, zeilen } = beispiel();
    for (const x of bausteine(spalten, zeilen).flatMap(g => g.bausteine)) {
      beispiel();
      const r = e.run(x.syntax);
      expect(fehler(r), x.id).toEqual([]);
      if (!['compute', 'recode'].includes(x.id)) expect(r.some(i => i.type === 'table'), x.id).toBe(true);
    }
  });

  it('Eigene Daten: andere Namen, Skala aus FG1-FG4, Gruppen mit Wertelabels - alles läuft', () => {
    const { spalten, zeilen } = eigen();
    const g = bausteine(spalten, zeilen);
    const b = Object.fromEntries(g.flatMap(x => x.bausteine).map(x => [x.id, x.syntax]));
    expect(Object.keys(b).length).toBe(18);
    expect(b['reliability']).toMatch(/^RELIABILITY \/VARIABLES=FG1 FG2 FG3 FG4\n/);
    expect(b['oneway']).toMatch(/^ONEWAY punkte BY schulart\n/);
    expect(b['kruskal-wallis']).toBe('NPAR TESTS /K-W=punkte BY schulart(1 3).');
    expect(b['ttest-unabh']).toMatch(/^T-TEST GROUPS=geschl\('m' 'w'\)/);
    expect(b['compute']).toBe('COMPUTE mittelwert = MEAN(FG1, FG2, FG3, FG4).\nEXECUTE.');
    expect(Object.values(b).join('\n')).not.toMatch(/\bid\b/);
    for (const [id, syntax] of Object.entries(b)) {
      eigen();
      const r = e.run(syntax);
      expect(fehler(r), id).toEqual([]);
    }
    // Neue Spalten entstehen wirklich, mit freiem Namen.
    eigen(); e.run(b['compute']! + '\n' + b['recode']!);
    expect(leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).map(sp => sp.name)).toEqual(expect.arrayContaining(['mittelwert', 'punkte_gruppe']));
  });

  it('Kruskal-Wallis mit Text-Gruppen: Bereich in PSPP-Reihenfolge, alle Gruppen zählen', () => {
    const { spalten, zeilen } = lade("DATA LIST FREE /g (A12) y.\nBEGIN DATA\nWeiblich 1 divers 2 männlich 3 Weiblich 4 divers 5 männlich 6 Weiblich 7 divers 8 männlich 9\nEND DATA.");
    const kw = bausteine(spalten, zeilen).flatMap(g => g.bausteine).find(x => x.id === 'kruskal-wallis')!;
    expect(kw.syntax).toBe("NPAR TESTS /K-W=y BY g('Weiblich' 'männlich').");
    const t = e.run(kw.syntax).find(i => i.type === 'table') as { cells?: unknown };
    expect(JSON.stringify(t)).toMatch(/divers/);
    expect(JSON.stringify(t)).toMatch(/Weiblich/);
  });

  it('Eigene Spaltenwahl: Felder bieten passende Spalten an, gebaute Befehle laufen', () => {
    const { spalten, zeilen } = eigen();
    const alle = Object.fromEntries(bausteine(spalten, zeilen).flatMap(g => g.bausteine).map(x => [x.id, x]));
    const t = alle['ttest-unabh']!;
    expect(t.felder.map(f => [f.id, f.vorgabe])).toEqual([['y', ['punkte']], ['g', ['geschl']]]);
    expect(t.felder[1]!.optionen).toContain('schulart');
    expect(t.felder[0]!.optionen).not.toContain('id');
    const gebaut = [
      t.bau({ y: ['FG2'], g: ['schulart'] }),
      alle['crosstabs']!.bau({ a: ['schulart'], b: ['geschl'] }),
      alle['regression']!.bau({ y: ['punkte'], x: ['FG1', 'FG3'] }),
      alle['kruskal-wallis']!.bau({ y: ['FG4'], g: ['geschl'] })
    ];
    expect(gebaut[0]).toBe("T-TEST GROUPS=schulart(1 2)\n  /VARIABLES=FG2.");
    for (const syntax of gebaut) { eigen(); expect(fehler(e.run(syntax)), syntax).toEqual([]); }
  });

  it('Nur Text-Spalten: nur Häufigkeiten und Kreuztabelle, kein Baustein mit leerer Spalte', () => {
    const { spalten, zeilen } = lade("DATA LIST FREE /a (A3) b (A3).\nBEGIN DATA\nx u y v x v y u x u\nEND DATA.");
    const ids = bausteine(spalten, zeilen).flatMap(g => g.bausteine.map(x => x.id));
    expect(ids).toEqual(['frequencies', 'crosstabs']);
  });

  it('Name schon vergeben: neue Spalte bekommt eine Nummer', () => {
    const { spalten, zeilen } = lade(EIGEN + '\nCOMPUTE mittelwert = 1.\nEXECUTE.');
    const c = bausteine(spalten, zeilen).flatMap(g => g.bausteine).find(x => x.id === 'compute')!;
    expect(c.syntax).toMatch(/^COMPUTE mittelwert2 = /);
  });
});
