import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./sitzung.svelte', () => ({ L: (de: string) => de, istEn: () => false, aktuelleSprache: () => 'de', s: { einst: { sprache: 'de', zahl: 'sprache' } }, melde: () => {} }));
import { leseCsv, liesUhrzeit, liesZeitpunkt, planeSpalten, textAlsDatum, zurEngine, type Tabelle } from './einlesen';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { neuAufbauen, type Wert } from './eingabe';
import { datumBefehl } from './datumrechnen';
import { parseCsv } from '../dialogs/csv';
import { nodeEngine } from './testengine';

/* S-F2 D3: Uhrzeiten im Datum. „2026-01-31 14:05“ (auch mit Sekunden, auch „31.01.2026 14:05“) behält die Uhrzeit; „14:30“ allein ist eine Uhrzeit (Dauer seit Mitternacht wie SPSS TIME).
 * Gespeichert wird wie bei jedem Datum in der Engine (Zahl mit Format): YMDHMS20.0 bzw. TIME8.0. Nie eine Zeitzonen-Verschiebung. */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

describe('S-F2 D3: Zeitpunkte lesen', () => {
  it('Datum mit Uhrzeit: ISO, mit Sekunden, mit T, deutsch', () => {
    expect(liesZeitpunkt('2026-01-31 14:05')).toEqual({ y: 2026, m: 1, d: 31, sek: 14 * 3600 + 5 * 60 });
    expect(liesZeitpunkt('2026-01-31 14:05:09')).toEqual({ y: 2026, m: 1, d: 31, sek: 14 * 3600 + 5 * 60 + 9 });
    expect(liesZeitpunkt('2026-01-31T14:05:09')?.sek).toBe(14 * 3600 + 5 * 60 + 9);
    expect(liesZeitpunkt('2026-01-31T14:05:09+02:00')?.sek).toBe(14 * 3600 + 5 * 60 + 9);   // Anhang wird nicht verrechnet
    expect(liesZeitpunkt('31.01.2026 14:05')).toEqual({ y: 2026, m: 1, d: 31, sek: 14 * 3600 + 5 * 60 });
    expect(liesZeitpunkt('31.1.2026 9:05:30')?.sek).toBe(9 * 3600 + 5 * 60 + 30);
    expect(liesZeitpunkt('2026-01-31')).toEqual({ y: 2026, m: 1, d: 31, sek: null });
    expect(liesZeitpunkt('31.01.2026')).toEqual({ y: 2026, m: 1, d: 31, sek: null });
  });
  it('Unmögliches ist keine Zeit', () => {
    for (const t of ['2026-01-31 25:00', '2026-01-31 14:61', '2026-02-30 10:00', '31.02.2026 10:00', 'abc 14:05', '14:05']) expect(liesZeitpunkt(t)).toBeNull();
    expect(textAlsDatum('2026-01-31 14:05')).toEqual(new Date(2026, 0, 31));
  });
  it('Uhrzeit allein: Sekunden seit Mitternacht', () => {
    expect(liesUhrzeit('14:30')).toBe(52200);
    expect(liesUhrzeit('14:30:15')).toBe(52215);
    expect(liesUhrzeit('00:05')).toBe(300);
    expect(liesUhrzeit('2:30 PM')).toBe(52200);
    expect(liesUhrzeit('12:00 AM')).toBe(0);
    expect(liesUhrzeit('14:30 Uhr')).toBe(52200);
    for (const t of ['25:00', '14:60', '14', '14:3', 'ja', '2026-01-31']) expect(liesUhrzeit(t)).toBeNull();
    expect(liesUhrzeit(null)).toBeNull(); expect(liesUhrzeit(52200)).toBeNull();
  });
  it('Excel: Zeitstempel behält die Uhrzeit, reine Uhrzeit (30.12.1899) ist eine Uhrzeit - gerundet auf die Sekunde', () => {
    expect(liesZeitpunkt(new Date(2026, 0, 31, 14, 5, 0))).toEqual({ y: 2026, m: 1, d: 31, sek: 14 * 3600 + 5 * 60 });
    expect(liesZeitpunkt(new Date(2026, 0, 31, 0, 0, 0))).toEqual({ y: 2026, m: 1, d: 31, sek: null });
    expect(liesUhrzeit(new Date(1899, 11, 30, 14, 30, 0))).toBe(52200);
    expect(liesUhrzeit(new Date(new Date(1899, 11, 30, 14, 30, 0).getTime() - 1))).toBe(52200);   // 14:29:59,999
    expect(liesUhrzeit(new Date(2026, 0, 31, 14, 30))).toBeNull();
  });
});

const tab = (kopf: string[], zeilen: (string | Date | null)[][]): Tabelle => ({ kopf, zeilen, quelle: 'T' });

describe('S-F2 D3: Spalten erkennen und in die Engine geben', () => {
  it('Text mit Uhrzeit: Datumsspalte mit Uhrzeit; Text „14:30“: Uhrzeitspalte; reines Datum bleibt Datum', () => {
    const p = planeSpalten(leseCsv('a,b,c,d\n2026-01-31 14:05,14:30,31.01.2026,31.01.2026 14:05:30\n2026-02-01 09:00:30,00:05:15,01.02.2026,01.02.2026 09:00\n'));
    expect(p.map(x => [x.art, x.zeit])).toEqual([['datum', 'datumzeit'], ['datum', 'uhrzeit'], ['datum', undefined], ['datum', 'datumzeit']]);
  });
  it('Gemischt (manche mit, manche ohne Uhrzeit): die Uhrzeit bleibt, fehlende Uhrzeit ist 00:00:00', () => {
    const t = leseCsv('a\n2026-01-31 14:05\n2026-02-01\n');
    const { csv, syntax } = zurEngine(t);
    expect(new TextDecoder().decode(csv)).toBe('a\n2026-01-31 14:05:00\n2026-02-01 00:00:00\n');
    expect(syntax).toContain('a YMDHMS20.0');
  });
  it('in der Engine: Datum und Uhrzeit als Datumsspalten, Stunden dazwischen stimmen, Neuaufbau erhält alles', () => {
    const t = leseCsv('wann,dauer,tag\n2026-01-31 14:05,14:30:15,31.01.2026\n2026-02-01 09:00:30,00:05:00,01.02.2026\n,,02.02.2026\n');
    const { csv, syntax } = zurEngine(t);
    e.run('NEW FILE.\n' + syntax, { '/import.csv': csv });
    const lies = (): { spalten: Spalte[]; zeilen: Wert[][] } => {
      const spalten = leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
      e.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
      const roh = parseCsv(new TextDecoder().decode(e.lies('/t.csv'))).slice(1);
      return { spalten, zeilen: roh.map(z => spalten.map((sp, i) => { const w = (z[i] ?? '').trim(); if (w === '') return null; if (sp.art === 'datum') return w.replace(/^(\d{2})\/(\d{2})\/(\d{4})/, '$2.$1.$3'); return sp.art === 'zahl' ? Number(w) : w; })) };
    };
    const a = lies();
    expect(a.spalten.map(s => [s.art, s.format])).toEqual([['datum', 'YMDHMS20.0'], ['datum', 'TIME8.0'], ['datum', 'EDATE10']]);
    expect(a.zeilen).toEqual([['31.01.2026 14:05:00', '14:30:15', '31.01.2026'], ['01.02.2026 09:00:30', '00:05:00', '01.02.2026'], [null, null, '02.02.2026']]);
    const neu = neuAufbauen(a.spalten, a.zeilen);
    e.run('NEW FILE.\n' + neu.syntax, { '/eingabe.csv': neu.csv });
    const b = lies();
    expect(b.zeilen).toEqual(a.zeilen); expect(b.spalten.map(s => s.format)).toEqual(['YMDHMS20.0', 'TIME8.0', 'EDATE10']);
    // der Daten-Assistent „Datum und Zeit“ rechnet damit: Stunden von der ersten zur zweiten Zeile (Datum+Zeit: 31.1. 14:05:00 bis 1.2. 09:00:30 = 18 h 55 min 30 s)
    const d = { spalten: b.spalten, zeilen: b.zeilen };
    const { syntax: sy } = datumBefehl(d, { art: 'teil', datum: 'wann', teil: 'tag', ziel: 'tag_aus_wann' });
    e.run(sy);
    const c = lies();
    expect(c.zeilen.map(z => z[3])).toEqual([31, 1, null]);
  });
  it('Zeitzone: dieselbe Datei in jeder Zeitzone gleich (Excel-Zeitstempel und Uhrzeit)', () => {
    const vorher = process.env.TZ;
    try {
      const aus = ['UTC', 'America/Los_Angeles', 'Pacific/Auckland', 'Europe/Vienna', 'Asia/Kolkata'].map(tz => {
        process.env.TZ = tz;
        const t = tab(['wann', 'dauer'], [[new Date(2026, 0, 31, 14, 5, 0), new Date(1899, 11, 30, 14, 30, 0)], [new Date(2026, 5, 15, 2, 30, 0), new Date(1899, 11, 30, 0, 5, 15)]]);
        const { csv, syntax } = zurEngine(t);
        return new TextDecoder().decode(csv) + syntax;
      });
      expect(new Set(aus).size).toBe(1);
      expect(aus[0]).toContain('wann,dauer\n2026-01-31 14:05:00,14:30:00\n');
      expect(aus[0]).toContain('YMDHMS20.0 dauer TIME8.0');
    } finally { if (vorher === undefined) delete process.env.TZ; else process.env.TZ = vorher; }
  });
});
