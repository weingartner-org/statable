import { beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('./sitzung.svelte', () => ({ L: (de: string) => de, istEn: () => false, aktuelleSprache: () => 'de', s: { einst: { sprache: 'de', zahl: 'komma' } }, melde: () => {} }));
import { leseCsv, zurEngine } from './einlesen';
import { leseVerzeichnis } from './verzeichnis';
import { nodeEngine } from './testengine';

/** Prüfung A1 (08.10.): leere Zellen in Textspalten zählten als eigene Kategorie - Kreuztabelle mit falschem df und N. */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });
const CSV = 'gruppe,rueckfall,lang\n' + Array.from({ length: 12 }, (_, i) => `${i % 2 ? 'A' : 'B'},${i < 2 ? '' : i % 3 ? 'ja' : 'nein'},${i < 2 ? '' : 'ein recht langer Text über acht Zeichen'}`).join('\n') + '\n';

describe('Leere Textzellen', () => {
  it('sind fehlend: Kreuztabelle mit N = 10 und df = 1', () => {
    const { syntax, csv } = zurEngine(leseCsv(CSV));
    const r = e.run('NEW FILE.\n' + syntax, { '/import.csv': csv });
    expect(r.filter(i => i.type === 'message' && (i as { severity?: string }).severity === 'error')).toEqual([]);
    const tab = e.run('CROSSTABS /TABLES=gruppe BY rueckfall /STATISTICS=CHISQ.').find(i => i.type === 'table' && i.label === 'gruppe × rueckfall') as { cells: { t: string; cs: number }[] };
    expect(tab.cells.find(c => c.t === 'rueckfall')!.cs).toBe(2);   // nur ja / nein, keine leere Spalte
    const f = JSON.stringify(e.run('FREQUENCIES /VARIABLES=lang.'));
    expect(f).toContain('Missing');
  });
  it('„Keine Angabe“ der Textspalte zeigt nur eigene Codes', () => {
    expect(leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).find(x => x.name === 'rueckfall')!.fehlendText).toBe('');
    e.run("MISSING VALUES rueckfall ('', 'k.A.').");
    expect(leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).find(x => x.name === 'rueckfall')!.fehlendText).toBe('"k.A."');
  });
});

describe('Kennzeichen für keine Angabe in Zahlenspalten (Prüfung A12/C4)', () => {
  it('„k.A.“, „NA“, „-“ machen die Spalte nicht zu Text; sie werden fehlend und gezählt', async () => {
    const { planeSpalten } = await import('./einlesen');
    const t = leseCsv('wohl;name\n3,5;a\nk.A.;b\n4;c\nNA;d\n-;e\n2,25;f\n');
    const [w, n] = planeSpalten(t);
    expect(w!.art).toBe('zahl');
    expect(w!.marker).toEqual({ 'k.A.': 1, NA: 1, '-': 1 });
    expect(n!.art).toBe('text');
    const { syntax, csv } = zurEngine(t);
    e.run('NEW FILE.\n' + syntax, { '/import.csv': csv });
    expect(JSON.stringify(e.run('DESCRIPTIVES wohl /STATISTICS=MEAN.'))).toContain('"n":3');
  });
});
