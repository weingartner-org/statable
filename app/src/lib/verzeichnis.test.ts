import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { leseCsv, zurEngine } from './einlesen';
import { leseVerzeichnis, mehrdeutigeSpalten } from './verzeichnis';
import { nodeEngine } from './testengine';

let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => {
  e = await nodeEngine();
  const { syntax, csv } = zurEngine(leseCsv(readFileSync(new URL('./testdaten/schlaf-und-konzentration.csv', import.meta.url), 'utf8')));
  e.run(syntax, { '/import.csv': csv });
});

describe('Spaltenverzeichnis', () => {
  // 07.10.: PSPP nennt in „Value Labels" die Bezeichnung statt des Namens - die Gruppen-Namen gingen verloren.
  it('Werte-Beschriftungen auch bei Spalten mit Bezeichnung', () => {
    e.run("VARIABLE LABELS semester 'Semester'.\nVALUE LABELS semester 1 'erstes Semester' 2 'zweites Semester'.");
    const sp = leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).find(x => x.name === 'semester')!;
    expect(sp.bezeichnung).toBe('Semester');
    expect(Object.values(sp.werteLabels)).toEqual(['erstes Semester', 'zweites Semester']);
  });
  it('und ohne Bezeichnung', () => {
    e.run("VARIABLE LABELS kaffee_tassen ''.\nVALUE LABELS kaffee_tassen 0 'keine'.");
    const sp = leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).find(x => x.name === 'kaffee_tassen')!;
    expect(Object.values(sp.werteLabels)).toEqual(['keine']);
  });
});

describe('Abschlusstest D14: Wertelabels aus .sav mit Schlüssel „1.00“', () => {
  it('der Schlüssel ist die Zahl: „1“, nicht „1.00“', () => {
    e.run("GET FILE='/spss_labels.sav'.", { '/spss_labels.sav': readFileSync(new URL('./testdaten/spss_labels.sav', import.meta.url)) });
    const sp = leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).find(x => x.name === 'geschlecht')!;
    expect(sp.art).toBe('zahl');
    expect(sp.werteLabels['1']).toBe('weiblich');
    expect(sp.werteLabels['2']).toBe('männlich');
    expect(Object.keys(sp.werteLabels).every(k => !k.includes('.'))).toBe(true);
  });
  it('Zahlen mit Nachkommastellen bleiben, wie sie sind', () => {
    e.run("DATA LIST FREE /q (F8.2).\nBEGIN DATA.\n1.5 2\nEND DATA.\nVALUE LABELS q 1.5 'anderthalb' 2 'zwei'.");
    const sp = leseVerzeichnis(e.run('DISPLAY DICTIONARY.')).find(x => x.name === 'q')!;
    expect(sp.werteLabels).toEqual({ '1.5': 'anderthalb', '2': 'zwei' });
  });
});

describe('Sicherheit: Wertelabels gehören der Spalte, nicht der Bezeichnung', () => {
  const lies = () => {
    const v = e.run('DISPLAY DICTIONARY.');
    const nachfrage: Record<string, typeof v> = {};
    for (const n of mehrdeutigeSpalten(v)) nachfrage[n] = e.run(`DISPLAY DICTIONARY /VARIABLES=${n}.`);
    return leseVerzeichnis(v, nachfrage);
  };
  const frisch = (z: string) => e.run(`NEW FILE.\nDATA LIST FREE /a b c.\nBEGIN DATA\n1 2 3\nEND DATA.\n${z}`);
  it('Bezeichnung von a = Name von b: b bekommt nicht die Labels von a (und umgekehrt auch nicht)', () => {
    frisch("VARIABLE LABELS a 'b'.\nVALUE LABELS a 1 'nur-a'.\nVALUE LABELS b 2 'nur-b'.");
    let sp = lies();
    expect(sp.find(x => x.name === 'a')!.werteLabels).toEqual({ '1': 'nur-a' });
    expect(sp.find(x => x.name === 'b')!.werteLabels).toEqual({ '2': 'nur-b' });
    frisch("VARIABLE LABELS a 'b'.\nVALUE LABELS b 2 'nur-b'.");   // nur b hat Labels, a trägt die Bezeichnung „b“
    sp = lies();
    expect(sp.find(x => x.name === 'a')!.werteLabels).toEqual({});
    expect(sp.find(x => x.name === 'b')!.werteLabels).toEqual({ '2': 'nur-b' });
  });
  it('zwei Spalten mit derselben Bezeichnung', () => {
    frisch("VARIABLE LABELS a 'Frage' /b 'Frage'.\nVALUE LABELS b 2 'nur-b'.");
    const sp = lies();
    expect(sp.find(x => x.name === 'a')!.werteLabels).toEqual({});
    expect(sp.find(x => x.name === 'b')!.werteLabels).toEqual({ '2': 'nur-b' });
  });
});
