import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./sitzung.svelte', () => ({ L: (de: string) => de, istEn: () => false, aktuelleSprache: () => 'de', s: { einst: { sprache: 'de', zahl: 'sprache' } }, melde: () => {} }));
import { eigenschaftenUebernehmen, type Uebernahme } from './eigenschaften';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import type { Daten } from './umformen';
import type { Wert } from './eingabe';
import { parseCsv } from '../dialogs/csv';
import { nodeEngine } from './testengine';

/* S-F2 D5: „Eigenschaften aus anderer Datei übernehmen“ (SPSS: Dateneigenschaften kopieren). Quelle .sav; Zuordnung nach Spaltenname; die Daten bleiben unverändert. */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

const lies = (): Daten => {
  const spalten = leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
  e.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const roh = parseCsv(new TextDecoder().decode(e.lies('/t.csv'))).slice(1);
  return { spalten, zeilen: roh.map(z => spalten.map((sp, i): Wert => { const w = (z[i] ?? '').trim(); return w === '' ? null : sp.art === 'zahl' ? Number(w) : w; })) };
};
const GET = (vars: string, csv: string) => ({ syntax: `GET DATA /TYPE=TXT /FILE='/i.csv' /ENCODING='UTF-8' /ARRANGEMENT=DELIMITED /DELCASE=LINE /FIRSTCASE=2 /DELIMITERS=',' /VARIABLES=${vars}.`, dateien: { '/i.csv': new TextEncoder().encode(csv) } });

/** Quelle: eine ausgebaute Datei mit allen Eigenschaften (über .sav, wie eine echte Quelle). */
function quelle(): Daten {
  const g = GET('alter F8.0 geschl F1.0 wohl F8.0 frage A3 nur_q F8.0', 'alter,geschl,wohl,frage,nur_q\n30,1,3,a,1\n40,2,4,b,2\n');
  e.run(`${g.syntax}
VARIABLE LABELS alter 'Alter in Jahren' /geschl 'Geschlecht' /wohl 'Wohlbefinden'.
VALUE LABELS geschl 1 'weiblich' 2 'männlich'.
VALUE LABELS frage 'a' 'Ja' 'b' 'Nein'.
MISSING VALUES alter (-9 THRU -1, 99).
MISSING VALUES geschl (9).
MISSING VALUES frage ('x').
VARIABLE LEVEL alter wohl (SCALE) /geschl (NOMINAL).
VARIABLE LEVEL wohl (ORDINAL).
SAVE OUTFILE='/quelle.sav'.`, g.dateien);
  e.run("NEW FILE.\nGET FILE='/quelle.sav'.");
  return lies();
}
/** Ziel: Daten mit anderen Namen in anderer Schreibung, ohne Eigenschaften. */
function ziel(): Daten {
  const g = GET('ALTER F8.0 Geschl F1.0 wohl F8.0 frage F8.0 nur_z F8.0', 'ALTER,Geschl,wohl,frage,nur_z\n-5,1,3,1,7\n25,9,4,2,8\n99,2,5,1,9\n');
  e.run('NEW FILE.\n' + g.syntax, g.dateien);
  return lies();
}
const ALLES: Uebernahme = { bezeichnung: true, werteLabels: true, fehlend: true, niveau: true };

describe('Eigenschaften übernehmen: der Plan', () => {
  it('Zuordnung nach Spaltenname (Groß/klein egal): passende, nur in der Quelle, nur in den Daten, Typ passt nicht', () => {
    const q = quelle(), z = ziel();
    const p = eigenschaftenUebernehmen(z, q, ALLES);
    expect(p.spalten.map(x => [x.name, x.quelle])).toEqual([['ALTER', 'alter'], ['Geschl', 'geschl'], ['wohl', 'wohl'], ['frage', 'frage']]);
    expect(p.nurInQuelle).toEqual(['nur_q']);
    expect(p.nurInDaten).toEqual(['nur_z']);
    const frage = p.spalten.find(x => x.name === 'frage')!;
    expect(frage.typPasstNicht).toBe(true);   // Text gegen Zahl
    expect(frage.aenderungen.map(a => a.art)).toEqual([]);   // weder Wertelabels noch Fehlend-Codes; nichts anderes zu tun
    const alter = p.spalten.find(x => x.name === 'ALTER')!;
    expect(alter.aenderungen.map(a => a.art).sort()).toEqual(['bezeichnung', 'fehlend', 'niveau']);
    expect(alter.aenderungen.find(a => a.art === 'fehlend')!.neuFehlend).toBe(2);   // -5 (im Bereich) und 99 würden fehlend
  });
  it('Auswahl: nur die gewählten Eigenschaften', () => {
    const p = eigenschaftenUebernehmen(ziel(), quelle(), { bezeichnung: true, werteLabels: false, fehlend: false, niveau: false });
    expect(p.spalten.flatMap(x => x.aenderungen.map(a => a.art))).toEqual(['bezeichnung', 'bezeichnung', 'bezeichnung']);
    expect(p.syntax).not.toMatch(/VALUE LABELS|MISSING VALUES|VARIABLE LEVEL/);
    expect(eigenschaftenUebernehmen(ziel(), quelle(), { bezeichnung: false, werteLabels: false, fehlend: false, niveau: false }).syntax).toBe('');
  });
});

describe('Eigenschaften übernehmen: in der echten Engine', () => {
  it('Beschriftung, Wertelabels, Fehlend (Bereich), Messniveau kommen an; die Daten bleiben gleich', () => {
    const q = quelle(), z = ziel();
    const vorher = z.zeilen.map(r => [...r]);
    const p = eigenschaftenUebernehmen(z, q, ALLES);
    expect(p.syntax).toMatch(/MISSING VALUES ALTER \(-9 THRU -1, 99\)\./);
    e.run(p.syntax);
    const danach = lies();
    expect(danach.zeilen).toEqual(vorher);   // Daten unverändert
    const sp = (n: string) => danach.spalten.find(x => x.name === n)!;
    expect(sp('ALTER').bezeichnung).toBe('Alter in Jahren');
    expect(sp('ALTER').fehlend).toEqual([99]); expect(sp('ALTER').fehlendBereich).toEqual({ von: -9, bis: -1 });
    expect(sp('ALTER').niveau).toBe('metrisch');
    expect(sp('Geschl').werteLabels).toEqual({ 1: 'weiblich', 2: 'männlich' }); expect(sp('Geschl').fehlend).toEqual([9]); expect(sp('Geschl').niveau).toBe('nominal');
    expect(sp('wohl').niveau).toBe('ordinal');
    expect(sp('frage').werteLabels).toEqual({}); expect(sp('frage').fehlend).toEqual([]);   // Typ passt nicht: nichts übernommen
    expect(sp('nur_z').bezeichnung).toBe('');
  });
  it('Text gegen Text: Wertelabels und Fehlend-Codes werden übernommen', () => {
    const q = quelle();
    const g = GET('frage A3 id F8.0', 'frage,id\na,1\nb,2\nx,3\n');
    e.run('NEW FILE.\n' + g.syntax, g.dateien);
    const p = eigenschaftenUebernehmen(lies(), q, ALLES);
    const r = e.run(p.syntax);
    expect(r.filter(i => i.type === 'message' && (i as { severity?: string }).severity === 'error')).toEqual([]);
    const f = lies().spalten.find(x => x.name === 'frage')!;
    expect(f.werteLabels).toEqual({ a: 'Ja', b: 'Nein' });
    expect(f.fehlendText).toContain('x');
  });
  it('Texte aus der Quelle sind nie Befehl (Apostroph und Zeilenumbruch in Beschriftung und Wertelabel)', () => {
    const q: Daten = { spalten: [{ name: 'a', bezeichnung: "O'Brien\n* EXECUTE.\nDELETE VARIABLES a.", art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: { 1: "ja'\nDELETE VARIABLES a." } }], zeilen: [] };
    const g = GET('a F8.0', 'a\n1\n2\n');
    e.run('NEW FILE.\n' + g.syntax, g.dateien);
    const p = eigenschaftenUebernehmen(lies(), q, ALLES);
    const r = e.run(p.syntax);
    expect(r.filter(i => i.type === 'message' && (i as { severity?: string }).severity === 'error')).toEqual([]);
    const d = lies();
    expect(d.spalten.map(x => x.name)).toEqual(['a']);   // nichts gelöscht
    expect(d.spalten[0]!.bezeichnung).toContain("O'Brien");
  });
});
