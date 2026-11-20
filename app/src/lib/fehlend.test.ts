import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./sitzung.svelte', () => ({ L: (de: string) => de, istEn: () => false, aktuelleSprache: () => 'de', s: { einst: { sprache: 'de', zahl: 'sprache' } }, melde: () => {} }));
import { fehlendMenge, fehlendSchluessel, fehlendSyntax, gleichFehlend, istFehlend, leseFehlendAnzeige } from './fehlend';
import { fehlendAlsText, leseFehlendEingabe } from './fehlendeingabe';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { neuAufbauen, type Wert } from './eingabe';
import { umpolSpanne } from './skalabau';
import { konstant } from './ergebnis';
import { parseCsv } from '../dialogs/csv';
import { nodeEngine } from './testengine';

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

describe('S-F2 B: Fehlend-Bereich - die gemeinsame Funktion', () => {
  const sp = { fehlend: [99], fehlendBereich: { von: -9, bis: -1 } };
  it('istFehlend kennt Einzelwerte und Bereich (Grenzen eingeschlossen)', () => {
    for (const v of [99, -9, -5, -1]) expect(istFehlend(sp, v)).toBe(true);
    for (const v of [0, -10, 98, 1]) expect(istFehlend(sp, v)).toBe(false);
    expect(istFehlend(sp, 'x')).toBe(false); expect(istFehlend(sp, null)).toBe(false); expect(istFehlend(undefined, 5)).toBe(false);
    expect(istFehlend({ fehlend: [], fehlendBereich: { von: -Infinity, bis: 0 } }, -1e9)).toBe(true);
    expect(istFehlend({ fehlend: [], fehlendBereich: { von: 90, bis: Infinity } }, 1e9)).toBe(true);
  });
  it('fehlendMenge gibt dasselbe als includes zurück', () => {
    expect(fehlendMenge(sp).includes(-3)).toBe(true); expect(fehlendMenge(sp).includes(3)).toBe(false);
    expect(fehlendMenge({ fehlend: [1, 2] }).includes(2)).toBe(true); expect(fehlendMenge(undefined).includes(2)).toBe(false);
  });
  it('Schlüssel ändert sich mit dem Bereich; gleichFehlend ohne Reihenfolge', () => {
    expect(fehlendSchluessel(sp)).not.toBe(fehlendSchluessel({ fehlend: [99] }));
    expect(gleichFehlend({ fehlend: [2, 1] }, { fehlend: [1, 2] })).toBe(true);
    expect(gleichFehlend(sp, { fehlend: [99] })).toBe(false);
  });
  it('Befehlstext: Bereich zuerst, dann ein Einzelwert; offene Enden als LOWEST/HIGHEST', () => {
    expect(fehlendSyntax(sp)).toBe('-9 THRU -1, 99');
    expect(fehlendSyntax({ fehlend: [], fehlendBereich: { von: -Infinity, bis: 0 } })).toBe('LOWEST THRU 0');
    expect(fehlendSyntax({ fehlend: [90], fehlendBereich: { von: 95, bis: Infinity } })).toBe('95 THRU HIGHEST, 90');
    expect(fehlendSyntax({ fehlend: [1, 2, 3, 4] })).toBe('1, 2, 3');
    expect(fehlendSyntax({ fehlend: [] })).toBe('');
    expect(() => fehlendSyntax({ fehlend: [NaN] })).toThrow();
  });
  it('Anzeige von PSPP wird gelesen (auch LOWEST/HIGHEST)', () => {
    expect(leseFehlendAnzeige('-9 THRU -1; 99')).toEqual({ fehlend: [99], fehlendBereich: { von: -9, bis: -1 } });
    expect(leseFehlendAnzeige('LOWEST THRU 0')).toEqual({ fehlend: [], fehlendBereich: { von: -Infinity, bis: 0 } });
    expect(leseFehlendAnzeige('95 THRU HIGHEST; 7')).toEqual({ fehlend: [7], fehlendBereich: { von: 95, bis: Infinity } });
    expect(leseFehlendAnzeige('1; 2; 3')).toEqual({ fehlend: [1, 2, 3] });
    expect(leseFehlendAnzeige('')).toEqual({ fehlend: [] });
  });
  it('Eingabe: Einzelwerte, Bereich, Mischung - und die Regeln wie SPSS', () => {
    expect(leseFehlendEingabe('99')).toEqual({ fehlend: [99] });
    expect(leseFehlendEingabe('-9; -8, 99')).toEqual({ fehlend: [-9, -8, 99] });
    expect(leseFehlendEingabe('-9 bis -1')).toEqual({ fehlend: [], fehlendBereich: { von: -9, bis: -1 } });
    expect(leseFehlendEingabe('-9 - -1; 99')).toEqual({ fehlend: [99], fehlendBereich: { von: -9, bis: -1 } });
    expect(leseFehlendEingabe('1-5')).toEqual({ fehlend: [], fehlendBereich: { von: 1, bis: 5 } });
    expect(leseFehlendEingabe('0,5 bis 2,5')).toEqual({ fehlend: [], fehlendBereich: { von: 0.5, bis: 2.5 } });
    expect(leseFehlendEingabe('lo bis 0')).toEqual({ fehlend: [], fehlendBereich: { von: -Infinity, bis: 0 } });
    expect(leseFehlendEingabe('95 thru hi, 7')).toEqual({ fehlend: [7], fehlendBereich: { von: 95, bis: Infinity } });
    expect(leseFehlendEingabe('')).toEqual({ fehlend: [] });
    for (const t of ['1; 2; 3; 4', '-9 bis -1; 98; 99', '-9 bis -1; 1 bis 2', '5 bis 1', 'abc']) expect(leseFehlendEingabe(t)).toHaveProperty('fehler');
  });
  it('Text für das Eingabefeld', () => {
    expect(fehlendAlsText(sp)).toBe('-9 bis -1; 99');
    expect(fehlendAlsText({ fehlend: [1, 2] })).toBe('1; 2');
    expect(leseFehlendEingabe(fehlendAlsText(sp))).toEqual({ fehlend: [99], fehlendBereich: { von: -9, bis: -1 } });
  });
});

const basis = (extra: Partial<Spalte> = {}): Spalte => ({ name: 'x', bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...extra });

describe('S-F2 B: JS-Rechnungen werten den Bereich aus', () => {
  const werte = [1, 3, 5, -5, -9, 99];
  it('umpolSpanne: der Bereich -9 bis -1 zählt nicht zur Spanne', () => {
    expect(umpolSpanne(basis({ fehlend: [99] }), werte)).toEqual({ min: -9, max: 5 });
    expect(umpolSpanne(basis({ fehlend: [99], fehlendBereich: { von: -9, bis: -1 } }), werte)).toEqual({ min: 1, max: 5 });
  });
  it('konstant: nur Fehlend-Codes im Bereich übrig', () => {
    expect(konstant([5, -5, 5], fehlendMenge(basis({ fehlendBereich: { von: -9, bis: -1 } })))).toBe(true);
    expect(konstant([5, -5, 5], fehlendMenge(basis()))).toBe(false);
  });
});

/** Liest Spalten und Zeilen aus der Engine - wie sitzung.aktualisiere. */
function lies(): { spalten: Spalte[]; zeilen: Wert[][] } {
  const spalten = leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
  e.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const roh = parseCsv(new TextDecoder().decode(e.lies('/t.csv'))).slice(1);
  return { spalten, zeilen: roh.map(z => spalten.map((sp, i) => { const w = (z[i] ?? '').trim(); return w === '' ? null : sp.art === 'zahl' ? Number(w) : w; })) };
}
const mittel = () => {
  const t = e.run('DESCRIPTIVES x.').find(i => i.type === 'table' && i.label === 'Descriptive Statistics') as { cells: { r: number; c: number; t: string }[] };
  return Number(t.cells.find(c => c.r === 1 && c.c === 2)!.t);
};

describe('S-F2 B: mit der echten Engine', () => {
  const csv = new TextEncoder().encode('id,x\n1,5\n2,7\n3,-9\n4,-3\n5,99\n6,9\n');
  const lade = (missing: string) => {
    e.run(`GET DATA /TYPE=TXT /FILE='/i.csv' /ENCODING='UTF-8' /ARRANGEMENT=DELIMITED /DELCASE=LINE /FIRSTCASE=2 /DELIMITERS=',' /VARIABLES=id F8.0 x F8.0.\n${missing}\nSAVE OUTFILE='/b.sav'.\nNEW FILE.\nGET FILE='/b.sav'.`, { '/i.csv': csv });
  };
  it('Lesen aus .sav: der Bereich kommt in der Spalte an', () => {
    lade('MISSING VALUES x (-9 THRU -1, 99).');
    const sp = leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).find(x => x.name === 'x')!;
    expect(sp.fehlend).toEqual([99]);
    expect(sp.fehlendBereich).toEqual({ von: -9, bis: -1 });
  });
  it('Mittelwert: Bereich plus Einzelwert gibt dasselbe wie PSPP, nicht dasselbe wie nur der Einzelwert', () => {
    lade('MISSING VALUES x (99).');
    const nur = mittel();   // (5+7-9-3+9)/5
    expect(nur).toBeCloseTo(1.8, 6);
    lade('MISSING VALUES x (-9 THRU -1, 99).');
    const mitBereich = mittel();   // (5+7+9)/3
    expect(mitBereich).toBeCloseTo(7, 6);
    // dieselbe Rechnung in JS über die gemeinsame Funktion
    const sp = basis({ fehlend: [99], fehlendBereich: { von: -9, bis: -1 } });
    const xs = [5, 7, -9, -3, 99, 9].filter(v => !istFehlend(sp, v));
    expect(xs.reduce((a, b) => a + b, 0) / xs.length).toBeCloseTo(mitBereich, 6);
  });
  it('Neuaufbau (Daten ändern, .statable-Weg) behält den Bereich', () => {
    lade('MISSING VALUES x (-9 THRU -1, 99).');
    const { spalten, zeilen } = lies();
    const { syntax, csv: neu } = neuAufbauen(spalten, zeilen);
    e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': neu });
    const danach = leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).find(x => x.name === 'x')!;
    expect(danach.fehlend).toEqual([99]); expect(danach.fehlendBereich).toEqual({ von: -9, bis: -1 });
    expect(mittel()).toBeCloseTo(7, 6);
  });
  it('Neuaufbau: offene Enden bleiben offen', () => {
    lade('MISSING VALUES x (LOWEST THRU 0).');
    const { spalten, zeilen } = lies();
    expect(spalten[1]!.fehlendBereich).toEqual({ von: -Infinity, bis: 0 });
    const { syntax, csv: neu } = neuAufbauen(spalten, zeilen);
    e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': neu });
    expect(leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).find(x => x.name === 'x')!.fehlendBereich).toEqual({ von: -Infinity, bis: 0 });
  });
});

/** Wächter: Fehlend-Codes werden nur über lib/fehlend.ts ausgewertet. Ein `spalte.fehlend.includes(…)` sieht den Bereich nicht. */
describe('S-F2 B: Wächter - keine Auswertung an der gemeinsamen Funktion vorbei', () => {
  const wurzel = fileURLToPath(new URL('..', import.meta.url));
  const dateien = (dir: string): string[] => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? (n === 'testdaten' ? [] : dateien(p)) : /\.(ts|svelte)$/.test(n) && !/\.test\.ts$/.test(n) ? [p] : []; });
  it('kein `.fehlend.includes(` ausserhalb von fehlend.ts', () => {
    // Pfade mit / vergleichen (unter Windows kommt \ vor)
    const mitSchraeg = (p: string) => p.split(sep).join('/');
    const treffer = dateien(wurzel).filter(p => !mitSchraeg(p).endsWith('/lib/fehlend.ts')).flatMap(p => readFileSync(p, 'utf8').split('\n').flatMap((z, i) => (/\.fehlend\.includes\(/.test(z) && !/^\s*(\/\/|\*)/.test(z) ? [`${mitSchraeg(p.replace(wurzel, ''))}:${i + 1}`] : [])));
    expect(treffer).toEqual([]);
  });
});
