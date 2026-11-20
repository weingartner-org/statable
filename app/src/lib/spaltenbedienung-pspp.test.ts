import { beforeAll, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import { neuAufbauen } from './eingabe';
import { leseVerzeichnis } from './verzeichnis';
import { sitz } from './kptesthilfe';
import { umwandeln, umwandlungAnwenden, dezimalstellenBefehl, labelsUebertragen } from './spaltenbedienung';
import type { Daten } from './umformen';

/* Die Engine nimmt die umgewandelten Spalten, FORMATS und VALUE LABELS wie geplant (PSPP 2.1.3). */
let m: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { m = await nodeEngine(); });
const fehler = (items: ReturnType<typeof m.run>) => items.filter(i => i.type === 'message' && (i as { severity?: string }).severity === 'error').map(i => (i as { text?: string }).text);
const lade = (d: Daten) => { const { syntax, csv } = neuAufbauen(d.spalten, d.zeilen); expect(fehler(m.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv }))).toEqual([]); };
const verz = () => leseVerzeichnis(m.run('DISPLAY DICTIONARY.'));

describe('Spaltenbedienung in der Engine', () => {
  it('Text → Zahl und Text → Datum: Neuaufbau klappt, Art stimmt', () => {
    const d = sitz({ z: ['1,5', '2', 'x'], t: ['31.12.2026', '05.01.2026', ''] }, ['z', 't']);
    const n = umwandlungAnwenden(umwandlungAnwenden(d, umwandeln(d, 'z', 'zahl')), umwandeln(d, 't', 'datum'));
    lade(n);
    const v = verz();
    expect(v.find(x => x.name === 'z')).toMatchObject({ art: 'zahl' });
    expect(v.find(x => x.name === 't')).toMatchObject({ art: 'datum', format: 'EDATE10' });
  });
  it('Zahl → Text: Neuaufbau klappt', () => {
    const d = sitz({ z: [1, 2.5, null] });
    lade(umwandlungAnwenden(d, umwandeln(d, 'z', 'text')));
    expect(verz().find(x => x.name === 'z')!.art).toBe('text');
  });
  it('FORMATS ändert nur die Anzeige', () => {
    const d = sitz({ a: [1.2345, 2], b: [3, 4] }); lade(d);
    const r = dezimalstellenBefehl(d, ['a', 'b'], 1);
    expect(fehler(m.run(r.syntax))).toEqual([]);
    expect(verz().find(x => x.name === 'a')!.format).toBe('F8.1');
    const t = m.run('DESCRIPTIVES a /STATISTICS=MEAN.').filter(i => i.type === 'table');
    expect(JSON.stringify(t)).toContain('1.6172');
  });
  it('VALUE LABELS auf mehrere Spalten, auch ersetzend', () => {
    const d = sitz({ q1: [1, 2], q2: [1, 2], q3: [1, 2] }); d.spalten[0]!.werteLabels = { '1': "ja d'accord", '2': 'nein' }; d.spalten[2]!.werteLabels = { '1': 'alt' };
    lade(d);
    const p = labelsUebertragen(d, 'q1', ['q2', 'q3']);
    expect(fehler(m.run(p.syntax))).toEqual([]);
    const v = verz();
    for (const n of ['q2', 'q3']) expect(v.find(x => x.name === n)!.werteLabels).toEqual({ '1': "ja d'accord", '2': 'nein' });
  });
});
