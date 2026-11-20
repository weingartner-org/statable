import { beforeAll, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import { neuAufbauen } from './eingabe';
import { parseCsv } from '../dialogs/csv';
import { AssistentFehler } from './datenassistent';
import { winsorBefehl, winsorWarnung } from './winsorbefehl';
import { csv, nah, soll3 } from './testdaten/field3';
import type { Daten } from './umformen';
import type { Spalte } from './verzeichnis';

/* Sollwert: R (Opus) docs/fachblaetter/sollwerte/field-stufe3.json, robust.winsor: PlantGrowth weight, Perzentile 20 % und 80 % (quantile type 7). Die Werte werden durch die ECHTE PSPP-Engine gerechnet. */
const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
let m: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { m = await nodeEngine(); });
function lade(d: Daten) { const { syntax, csv: c } = neuAufbauen(d.spalten, d.zeilen); const out = m.run('NEW FILE.\n' + syntax, { '/eingabe.csv': c }); expect(out.filter(i => i.type === 'message' && (i as { severity?: string }).severity === 'error')).toEqual([]); }
function spalte(name: string): (number | null)[] {
  m.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const z = parseCsv(new TextDecoder().decode(m.lies('/t.csv'))), j = z[0]!.map(s => s.toLowerCase()).indexOf(name.toLowerCase());
  return z.slice(1).map(r => (r[j]!.trim() === '' ? null : Number(r[j])));
}

describe('Winsorisieren (Daten-Assistent) gegen R und die PSPP-Engine', () => {
  const w = csv('plantgrowth.csv').map(r => r.weight as number);
  const daten = (): Daten => ({ spalten: [sp('weight')], zeilen: w.map(v => [v]) }) as Daten;
  it('Standard 20 % und 80 %: neue Spalte gleich dem Sollwert, Original unverändert', () => {
    lade(daten());
    const b = winsorBefehl(daten(), { spalte: 'weight', ziel: 'weight_w', unten: 20, oben: 80 });
    expect(m.run(b.syntax).filter(i => i.type === 'message' && /error/.test((i as { severity?: string }).severity ?? '')).map(i => (i as { text?: string }).text)).toEqual([]);
    const neu = spalte('weight_w'), alt = spalte('weight');
    neu.forEach((v, i) => expect(nah(v as number, soll3.robust.winsor.werte[i]), `Zeile ${i}: ${v}`).toBe(true));
    expect(alt).toEqual(w);
    expect(b.nUnten + b.nOben).toBeGreaterThan(0); expect(b.neu).toHaveLength(30);
  });
  it('fehlende Werte und Codes bleiben leer', () => {
    const d = { spalten: [sp('x', { fehlend: [-9] })], zeilen: [[1], [2], [3], [null], [-9], [4], [100]] } as Daten;
    lade(d);
    const b = winsorBefehl(d, { spalte: 'x', ziel: 'xw', unten: 10, oben: 90 });
    m.run(b.syntax);
    const neu = spalte('xw'); expect(neu[3]).toBeNull(); expect(neu[4]).toBeNull(); expect(neu[6]).toBe(b.hi); expect(neu[0]).toBeCloseTo(b.lo, 9);
  });
  it('Fehler: Textspalte, vorhandener Name, ungültige Grenzen', () => {
    const d = { spalten: [sp('x'), sp('t', { art: 'text' })], zeilen: [[1, 'a'], [2, 'b'], [3, 'c']] } as Daten;
    const code = (f: () => unknown) => { try { f(); } catch (e) { return e instanceof AssistentFehler ? e.code : 'anders'; } return 'kein Fehler'; };
    expect(code(() => winsorBefehl(d, { spalte: 't', ziel: 'neu', unten: 20, oben: 80 }))).toBe('spalte');
    expect(code(() => winsorBefehl(d, { spalte: 'x', ziel: 'x', unten: 20, oben: 80 }))).toBe('ueberschreiben');
    expect(code(() => winsorBefehl(d, { spalte: 'x', ziel: 'neu', unten: 80, oben: 20 }))).toBe('bereich');
  });
  it('der Warnsatz nennt: nicht löschen, berichten', () => { expect(winsorWarnung()).toMatch(/nicht gelöscht/); expect(winsorWarnung()).toMatch(/Bericht/); });
});
