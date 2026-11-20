import { beforeAll, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { neuAufbauen, type Wert } from './eingabe';
import { parseCsv } from '../dialogs/csv';
import { bedingung, berechneBefehl, gruppenFehlende, gruppenUebersicht, leereErgebnisse, teilerVon, type Daten } from './datenassistent';
import { ergebnisSaetze, gruppenFehlendSaetze } from './datenassistentsaetze';

/* Befunde der Fachprüfung Welle 5 (Entscheidungen des Koordinators): jeder Teiler 0 ergibt leer (auch 0/0), „Nur wenn …“ wird getrennt gezählt,
 * Gruppen „leer“ und „keine Angabe“ beim Aggregieren werden einzeln genannt. Läuft in der echten Engine. */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

const sp = (name: string, rest: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.0', fehlend: [], fehlendText: '', werteLabels: {}, ...rest });
function lade(d: Daten) { const { syntax, csv } = neuAufbauen(d.spalten, d.zeilen); e.run('NEW FILE.\n' + syntax, { '/eingabe.csv': csv }); }
function lies(): Daten {
  const spalten = leseVerzeichnis(e.run('DISPLAY DICTIONARY.'));
  e.run("SAVE TRANSLATE /OUTFILE='/t.csv' /TYPE=CSV /FIELDNAMES /REPLACE /CELLS=VALUES.");
  const roh = parseCsv(new TextDecoder().decode(e.lies('/t.csv'))).slice(1);
  return { spalten, zeilen: roh.map(z => spalten.map((s, i): Wert => { const w = z[i] ?? ''; return s.art === 'text' ? (w === '' ? null : w) : (w.trim() === '' ? null : Number(w)); })) };
}
const fehlerAus = (syntax: string) => e.run(syntax).filter(i => i.type === 'message' && /error|warning/.test((i as { severity?: string }).severity ?? ''));
const werte = (d: Daten, name: string) => d.zeilen.map(z => z[d.spalten.findIndex(s => s.name === name)]);

describe('teilerVon: die Teiler einer Formel', () => {
  it('Spalte, Klammer, Funktion, Potenz, mehrere, keiner', () => {
    expect(teilerVon('a / b')).toEqual(['b']);
    expect(teilerVon('a/b')).toEqual(['b']);
    expect(teilerVon('x / (y - z) + 1')).toEqual(['(y - z)']);
    expect(teilerVon('a / LN(b) ** 2')).toEqual(['LN(b) ** 2']);
    expect(teilerVon('a / b / c')).toEqual(['b', 'c']);
    expect(teilerVon('a / -b')).toEqual(['-b']);
    expect(teilerVon('(a + 1) / MEAN(b, c) * 2')).toEqual(['MEAN(b, c)']);
    expect(teilerVon('a / b + c / b')).toEqual(['b']);
    expect(teilerVon('a * b + 3')).toEqual([]);
  });
});

describe('Teilen durch 0 - auch 0/0 - ergibt leer (PSPP rechnet 0/0 sonst zu 0)', () => {
  const d: Daten = { spalten: [sp('a'), sp('b'), sp('c')], zeilen: [[0, 0, 1], [5, 0, 1], [6, 3, 1], [null, 2, 1], [8, 4, 4], [1, 2, null]] };
  it('a / b: 0/0 und 5/0 sind leer, 6/3 = 2; Rechenfehler getrennt von Lücken gezählt', () => {
    lade(d);
    const b = berechneBefehl(d, { ziel: 'erg', ausdruck: 'a / b' });
    expect(b.syntax).toContain('IF (b = 0) erg = $SYSMIS.');
    expect(fehlerAus(b.syntax)).toEqual([]);
    const n = lies();
    expect(werte(n, 'erg')).toEqual([null, null, 2, null, 2, 0.5]);
    expect(leereErgebnisse(n, 'erg', ['a', 'b'])).toEqual({ leer: 3, luecken: 1, rechenfehler: 2 });
  });
  it('Teiler als Klammer: a / (b - c); 8 / (4 - 4) ist leer', () => {
    lade(d);
    const b = berechneBefehl(d, { ziel: 'erg', ausdruck: 'a / (b - c)' });
    expect(fehlerAus(b.syntax)).toEqual([]);
    const erg = werte(lies(), 'erg');
    expect(erg[1]).toBe(-5);       // 5 / (0 - 1)
    expect(erg[2]).toBe(3);        // 6 / (3 - 1)
    expect(erg[4]).toBeNull();     // 8 / (4 - 4): Teiler 0
    expect(erg[5]).toBeNull();     // c fehlt
  });
  it('mit „nur wenn“ und überschriebener Spalte: Fälle ohne Bedingung behalten ihren Wert', () => {
    const e2: Daten = { spalten: [sp('g'), sp('a'), sp('b'), sp('erg')], zeilen: [[1, 4, 2, 99], [2, 4, 2, 99], [1, 1, 0, 99]] };
    lade(e2);
    const b = berechneBefehl(e2, { ziel: 'erg', ausdruck: 'a / b', bedingung: 'g = 1', ueberschreiben: true });
    expect(fehlerAus(b.syntax)).toEqual([]);
    expect(werte(lies(), 'erg')).toEqual([2, 99, null]);
  });
});

describe('„Nur wenn …“: Fälle ohne Bedingung getrennt gezählt', () => {
  const d: Daten = { spalten: [sp('g'), sp('a'), sp('b')], zeilen: [[1, 4, 2], [2, 4, 2], [1, 1, 0], [null, 3, 1], [1, null, 2], [2, 7, 7]] };
  it('1 = erfüllt, 0 = nicht, leer = nicht prüfbar; Lücken und Rechenfehler nur bei erfüllter Bedingung', () => {
    lade(d);
    const cond = bedingung([{ spalte: 'g', op: '=', wert: 1 }], 'AND', d);
    const b = berechneBefehl(d, { ziel: 'erg', ausdruck: 'a / b', bedingung: cond });
    expect(fehlerAus(b.syntax + `\nCOMPUTE zz = (${cond}).\nEXECUTE.`)).toEqual([]);
    const z = leereErgebnisse(lies(), 'erg', ['a', 'b'], 'zz');
    expect(z).toEqual({ leer: 5, luecken: 1, rechenfehler: 1, bedingungNicht: 2, bedingungOffen: 1 });
    expect(ergebnisSaetze(z)).toEqual([
      '2 Fälle erfüllen die Bedingung nicht und bleiben leer.',
      'Bei 1 Fall lässt sich die Bedingung nicht prüfen, weil ein Wert fehlt; das Ergebnis bleibt leer.',
      '1 Ergebnis ist leer, weil bei der Person ein Wert fehlt, den die Rechnung braucht.',
      expect.stringMatching(/^1 Ergebnis ist leer, obwohl alle Werte da sind: .*Teilen durch 0, auch 0 geteilt durch 0/)
    ]);
  });
  it('ohne Bedingungsspalte bleibt das Ergebnis bei drei Zahlen (wie bisher)', () => {
    lade(d);
    e.run('COMPUTE erg = a / b.\nEXECUTE.');
    expect(Object.keys(leereErgebnisse(lies(), 'erg', ['a', 'b']))).toEqual(['leer', 'luecken', 'rechenfehler']);
  });
});

describe('Aggregieren: „leer“ und „keine Angabe“ sind zwei Gruppen und werden beide genannt', () => {
  const d: Daten = { spalten: [sp('g', { fehlend: [9] }), sp('x')], zeilen: [[1, 1], [9, 2], [9, 3], [null, 4], [null, 5], [9, 6], [9, 7], [2, 8]] };
  it('gruppenFehlende zählt die Art getrennt, gruppenUebersicht bleibt bei 4 Gruppen', () => {
    expect(gruppenFehlende(d, ['g'])).toEqual({ leer: 2, keineAngabe: 4, codes: [9] });
    expect(gruppenUebersicht(d, ['g'])).toEqual({ gruppen: 4, ohneAngabe: 6 });
    expect(gruppenFehlendSaetze(gruppenFehlende(d, ['g']))).toEqual([
      '4 Fälle mit „keine Angabe“ (9) bilden eine eigene Gruppe.',
      '2 Fälle ohne Gruppenangabe bilden eine eigene Gruppe.'
    ]);
    expect(gruppenFehlendSaetze({ leer: 1, keineAngabe: 0, codes: [] })).toEqual(['1 Fall ohne Gruppenangabe bildet eine eigene Gruppe.']);
    expect(gruppenFehlendSaetze({ leer: 0, keineAngabe: 0, codes: [] })).toEqual([]);
  });
});
