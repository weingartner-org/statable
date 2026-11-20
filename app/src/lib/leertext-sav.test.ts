import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./sitzung.svelte', () => ({ L: (de: string) => de, istEn: () => false, aktuelleSprache: () => 'de', s: { einst: { sprache: 'de', zahl: 'sprache' } }, melde: () => {} }));
import { leseCsv, zurEngine } from './einlesen';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { neuAufbauen, textCodes, type Wert } from './eingabe';
import { parseCsv } from '../dialogs/csv';
import { nodeEngine } from './testengine';

/* S-F2 D4: Ein leerer Text ist in einer .sav gültig (wie in SPSS), bei CSV/Excel fehlend.
 * Beim Speichern als .statable bleibt die .sav in der Datei - aber jede Änderung der Daten (und der Wiederaufbau nach einem Absturz) baut den Datensatz mit neuAufbauen neu.
 * Dort wurde der leere Text immer fehlend: die Herkunft ging verloren. */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

function lies(): { spalten: Spalte[]; zeilen: Wert[][] } {
  const spalten = leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
  e.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const roh = parseCsv(new TextDecoder().decode(e.lies('/t.csv'))).slice(1);
  return { spalten, zeilen: roh.map(z => spalten.map((sp, i) => { const w = (z[i] ?? '').trim(); return w === '' ? null : sp.art === 'zahl' ? Number(w) : w; })) };
}
/** Wie viele leere Texte in t zählt PSPP als GÜLTIGE Antwort? (FREQUENCIES: gültige Werte stehen unter „Valid“, als fehlend markierte unter „Missing“.) */
function zaehleLeere(): number {
  const t = e.run('FREQUENCIES t.').find(i => i.type === 'table' && i.label === 't') as { cells: { r: number; c: number; t: string }[] };
  const zeile = t.cells.find(c => c.c === 1 && c.t === '' && c.r >= 1);
  const gueltig = !!zeile && !t.cells.some(c => c.t === 'Missing' && c.r === zeile.r);
  return zeile && gueltig ? Number(t.cells.find(c => c.r === zeile.r && c.c === 2)!.t) : 0;
}
const CSV = new TextEncoder().encode('id,t\n1,ab\n2,\n3,cd\n4,\n');
const lade = (mitMissing: boolean) => e.run(`GET DATA /TYPE=TXT /FILE='/i.csv' /ENCODING='UTF-8' /ARRANGEMENT=DELIMITED /DELCASE=LINE /FIRSTCASE=2 /DELIMITERS=',' /VARIABLES=id F8.0 t A5.\n${mitMissing ? "MISSING VALUES t ('')." : ''}\nSAVE OUTFILE='/b.sav'.\nNEW FILE.\nGET FILE='/b.sav'.`, { '/i.csv': CSV });

describe('S-F2 D4: leerer Text .sav -> Neuaufbau (.statable-Weg)', () => {
  it('.sav: leerer Text gültig - nach dem Neuaufbau noch gültig', () => {
    lade(false);
    const { spalten } = lies();
    expect(spalten[1]!.leerGueltig).toBe(true);
    expect(zaehleLeere()).toBe(2);   // vor dem Neuaufbau: 2 gültige leere Texte
    e.run("NEW FILE.\nGET FILE='/b.sav'.");
    const { spalten: sp, zeilen } = lies();
    const { syntax, csv } = neuAufbauen(sp, zeilen);
    e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv });
    expect(leseVerzeichnis(e.run('DISPLAY DICTIONARY.'))[1]!.leerGueltig).toBe(true);
    expect(zaehleLeere()).toBe(2);
  });
  it('CSV/Excel: leerer Text fehlend - bleibt nach dem Neuaufbau fehlend', () => {
    const { syntax, csv } = zurEngine(leseCsv('id,t\n1,ab\n2,\n3,cd\n4,\n'));
    e.run('NEW FILE.\n' + syntax, { '/import.csv': csv });
    const { spalten, zeilen } = lies();
    expect(spalten[1]!.leerGueltig).toBe(false);
    expect(zaehleLeere()).toBe(0);
    const neu = neuAufbauen(spalten, zeilen);
    e.run('NEW FILE.\n' + neu.syntax, { '/eingabe.csv': neu.csv });
    expect(zaehleLeere()).toBe(0);
  });
  it('Eigene Text-Codes in einer .sav (k.A.) lassen den leeren Text gültig', () => {
    e.run(`GET DATA /TYPE=TXT /FILE='/i.csv' /ENCODING='UTF-8' /ARRANGEMENT=DELIMITED /DELCASE=LINE /FIRSTCASE=2 /DELIMITERS=',' /VARIABLES=id F8.0 t A5.\nMISSING VALUES t ('cd').`, { '/i.csv': CSV });
    const { spalten, zeilen } = lies();
    expect(spalten[1]!.leerGueltig).toBe(true);
    const neu = neuAufbauen(spalten, zeilen);
    e.run('NEW FILE.\n' + neu.syntax, { '/eingabe.csv': neu.csv });
    const d = leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
    expect(d[1]!.leerGueltig).toBe(true); expect(textCodes(d[1]!.fehlendText)).toEqual(['cd']);
    expect(zaehleLeere()).toBe(2);
  });
  it('Neue, von Hand gebaute Spalte (ohne Angabe): der leere Text fehlt wie bisher', () => {
    const sp: Spalte[] = [{ name: 'id', bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {} },
      { name: 't', bezeichnung: '', art: 'text', niveau: 'nominal', format: 'A5', fehlend: [], fehlendText: '', werteLabels: {} }];
    const neu = neuAufbauen(sp, [[1, 'ab'], [2, null]]);
    e.run('NEW FILE.\n' + neu.syntax, { '/eingabe.csv': neu.csv });
    expect(zaehleLeere()).toBe(0);
  });
});
