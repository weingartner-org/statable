import { beforeAll, describe, expect, it } from 'vitest';
import { nodeEngine } from './testengine';
import { leseVerzeichnis, type Spalte } from './verzeichnis';
import { neuAufbauen, type Wert } from './eingabe';
import { parseCsv } from '../dialogs/csv';
import { doppelteFaelle, doppeltBefehl, zuordnenBefehl, type Daten } from './datenassistent';
import { auswahlSatz, behaltenFrage, doppeltSatz, ergebnisSaetze, fehlerSatz, listeText, mindestSatz, sperreSatz } from './datenassistentsaetze';
import { AssistentFehler } from './datenassistent';

/* Ergänzung zu den Sollwert-Tests des Prüfers (die bleiben unverändert): was die Oberfläche zusätzlich braucht - der Befehl für doppelte Fälle
 * (läuft in der echten Engine, trägt die Zeilen von doppelteFaelle ein), die Kennung als Text mit eigenen Fehlend-Codes beim Zusammenführen, und die Sätze. */
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
const probleme = (syntax: string) => e.run(syntax).filter(i => i.type === 'message' && /error|warning/.test((i as { severity?: string }).severity ?? '')).map(i => (i as { text?: string }).text ?? '');

describe('Doppelte Fälle als Befehl (doppeltBefehl)', () => {
  const d: Daten = { spalten: [sp('id'), sp('name', { art: 'text', format: 'A8', niveau: 'nominal' })], zeilen: [[1, 'Anna'], [2, 'Ben'], [1, ' anna'], [3, 'Cem'], [2, 'BEN'], [1, 'Anna']] };
  it('trägt die Wiederholungen nach Zeilennummer ein; die Markierung stimmt mit doppelteFaelle überein', () => {
    lade(d);
    const b = doppeltBefehl(d, { spalten: ['id'], ziel: 'doppelt' });
    expect(probleme(b.syntax)).toEqual([]);
    const nachher = lies(), i = nachher.spalten.findIndex(s => s.name === 'doppelt');
    expect(nachher.zeilen.map(z => z[i])).toEqual(doppelteFaelle(d, { spalten: ['id'] }).markierung);
    expect(b.wiederholungen).toBe(3);
    expect(nachher.spalten[i]!.niveau).toBe('nominal');
    expect(Object.keys(nachher.spalten[i]!.werteLabels).sort()).toEqual(['0', '1']);
  });
  it('mit „löschen“: die Wiederholungen sind weg und die Markierspalte auch', () => {
    lade(d);
    const b = doppeltBefehl(d, { spalten: ['name'], ziel: 'doppelt', loeschen: true });
    expect(probleme(b.syntax)).toEqual([]);
    const nachher = lies();
    expect(nachher.spalten.map(s => s.name)).toEqual(['id', 'name']);
    expect(nachher.zeilen).toEqual([[1, 'Anna'], [2, 'Ben'], [3, 'Cem']]);   // Rand-Leerzeichen und Groß/klein zählen nicht: ' anna' und 'BEN' sind Wiederholungen
  });
  it('ohne Wiederholung: nur COMPUTE, keine Nummernliste; viele Wiederholungen werden auf mehrere Befehle verteilt', () => {
    expect(doppeltBefehl({ ...d, zeilen: [[1, 'a'], [2, 'b']] }, { spalten: [], ziel: 'x' }).syntax).not.toContain('ANY(');
    const viele: Daten = { spalten: [sp('k')], zeilen: Array.from({ length: 500 }, () => [1]) };
    const b = doppeltBefehl(viele, { spalten: [], ziel: 'x' });
    expect(b.syntax.match(/IF \(ANY/g)).toHaveLength(3);
    lade(viele);
    expect(probleme(b.syntax)).toEqual([]);
    const n = lies(); expect(n.zeilen.filter(z => z[1] === 1)).toHaveLength(499);
  });
  it('vorhandener Name wird nie überschrieben; die gerechnete Vorschau lässt sich weiterreichen', () => {
    expect(() => doppeltBefehl(d, { spalten: [], ziel: 'id' })).toThrow(AssistentFehler);
    const vorab = doppelteFaelle(d, { spalten: ['id'] });
    expect(doppeltBefehl(d, { spalten: ['id'], ziel: 'x', vorab }).syntax).toBe(doppeltBefehl(d, { spalten: ['id'], ziel: 'x' }).syntax);
  });
});

describe('Zusammenführen: Kennung als Text mit eigenem „keine Angabe“-Code', () => {
  it('Fälle mit dem Code als Kennung finden keinen Partner (PSPP würde sie verbinden)', () => {
    const text = { art: 'text' as const, format: 'A5', niveau: 'nominal' as const, fehlendText: '"k.A."' };
    const a: Daten = { spalten: [sp('k', text), sp('x')], zeilen: [['a', 1], ['k.A.', 2], ['b', 3]] };
    const b: Daten = { spalten: [sp('k', text), sp('w')], zeilen: [['a', 10], ['k.A.', 20], ['b', 30]] };
    const z = zuordnenBefehl(a, b, { beziehung: '1:1', kennungA: 'k', kennungB: 'k' }, '/zweite.sav');
    expect(z.vorbereitungB).toContain("k <> 'k.A.'");
    lade(a);
    const { syntax, csv } = neuAufbauen(b.spalten, b.zeilen);
    const lauf = e.run(`SAVE OUTFILE='/aktiv.sav'.\nNEW FILE.\n${syntax}\n${z.vorbereitungB}\nSAVE OUTFILE='/zweite.sav'.\nGET FILE='/aktiv.sav'.`, { '/eingabe.csv': csv });
    expect(lauf.filter(i => i.type === 'message' && i.severity === 'error')).toEqual([]);
    expect(probleme(z.syntax)).toEqual([]);
    const nachher = lies(), w = nachher.spalten.findIndex(s => s.name === 'w');
    expect(nachher.zeilen.map(r => r[w])).toEqual([10, null, 30]);
  });
});

describe('Sätze', () => {
  it('listeText: kurze Listen ganz, lange mit „und n weitere“, leer als Strich', () => {
    expect(listeText([7, 12, 15])).toBe('7, 12, 15');
    expect(listeText([1, 2, 3, 4, 5, 6, 7], 3)).toBe('1, 2, 3 und 4 weitere');
    expect(listeText([null, ''])).toBe('-, -');
  });
  it('Lücken und Rechenfehler stehen in getrennten Sätzen, Einzahl und Mehrzahl als ganze Sätze', () => {
    expect(ergebnisSaetze({ leer: 0, luecken: 0, rechenfehler: 0 })).toEqual([]);
    expect(ergebnisSaetze({ leer: 1, luecken: 1, rechenfehler: 0 })).toEqual(['1 Ergebnis ist leer, weil bei der Person ein Wert fehlt, den die Rechnung braucht.']);
    const z = ergebnisSaetze({ leer: 5, luecken: 3, rechenfehler: 2 });
    expect(z).toHaveLength(2);
    expect(z[0]).toMatch(/^3 Ergebnisse sind leer, weil/);
    expect(z[1]).toMatch(/^2 Ergebnisse sind leer, obwohl alle Werte da sind/);
  });
  it('Mindestzahl: eins, Hälfte, SD', () => {
    expect(mindestSatz('MEAN', 5, 1)).toMatch(/mit allen vorhandenen Werten/);
    expect(mindestSatz('MEAN', 5, 3)).toBe('Fehlen bei einer Person mehr als 2 Werte, bleibt ihr Ergebnis leer (mindestens 3 von 5 gültig).');
    expect(mindestSatz('MEAN', 4, 3)).toBe('Fehlt bei einer Person mehr als 1 Wert, bleibt ihr Ergebnis leer (mindestens 3 von 4 gültig).');
    expect(mindestSatz('SD', 5, 1)).toMatch(/mindestens zwei gültige Werte/);
  });
  it('Auswahl, Rückfrage, doppelte Fälle', () => {
    expect(auswahlSatz({ erfuellt: 84, nicht: 30, leer: 6 })).toBe('Die Bedingung gilt für 84 Fälle, für 30 nicht und bei 6 lässt sie sich nicht prüfen, weil ein Wert fehlt.');
    expect(behaltenFrage({ entfernt: 36, leer: 6 })).toMatch(/^Dabei werden 36 Fälle aus den Daten entfernt\. Darunter 6 Fälle, bei denen die Bedingung wegen fehlender Werte nicht prüfbar ist/);
    expect(behaltenFrage({ entfernt: 1, leer: 0 })).toBe('Dabei wird 1 Fall aus den Daten entfernt.');
    expect(doppeltSatz({ wiederholungen: 0, gruppen: 0, nichtPruefbar: 0 })).toEqual(['Es gibt keine doppelten Fälle.']);
    expect(doppeltSatz({ wiederholungen: 4, gruppen: 2, nichtPruefbar: 1 })).toEqual(['4 Fälle wiederholen einen früheren Fall (2 Gruppen gleicher Fälle).', '1 Fall lässt sich nicht prüfen, weil in den gewählten Spalten ein Wert fehlt.']);
  });
  it('Fehler und Sperren werden zu Sätzen mit dem Namen', () => {
    expect(fehlerSatz(new AssistentFehler('ueberschreiben', 'x'))).toContain('Die Spalte „x“ gibt es schon');
    expect(fehlerSatz(new AssistentFehler('name', 'a b'))).toContain('„a b“ ist kein gültiger Spaltenname');
    expect(fehlerSatz(new Error('x'))).toContain('Es ist alles wie vorher');
    expect(sperreSatz({ art: 'doppelt', seite: 'b', kennungen: [3, 4] })).toMatch(/In der zweiten Datei kommen Kennungen mehrfach vor \(3, 4\)/);
    expect(sperreSatz({ art: 'namen', konflikte: [{ name: 'a', vorschlag: 'a_2' }, { name: 'b', vorschlag: 'b_2' }] })).toMatch(/^Die Spalten a, b gibt es in beiden Dateien/);
  });
});
