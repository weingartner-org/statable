import { afterEach, describe, expect, it } from 'vitest';
import { s } from './sitzung.svelte';
import type { Spalte } from './verzeichnis';
import type { Wert } from './eingabe';
import { katFaelle, katPruefliste, katVorschlaege, stufenMitFaellen } from './katpruefung';
import { leereModell } from './kategwahl';
import { ergebnisFaelltWeg } from './blattstand';

const sp = (name: string, o: Partial<Spalte> = {}): Spalte => ({ name, bezeichnung: name, art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {}, ...o });
afterEach(() => { s.einst.anrede = 'du'; });
const id = (x: string) => x;

describe('Prüfliste der Welle-3-Modelle', () => {
  // zuf: 1-4 (4 ohne Fälle), ort: Text, alter, tage (Zählung), zeit
  const spalten = [sp('zuf', { niveau: 'ordinal', werteLabels: { '1': 'niedrig', '2': 'mittel', '3': 'hoch', '4': 'sehr hoch' } }), sp('ort', { art: 'text', niveau: 'nominal' }), sp('alter'), sp('tage'), sp('zeit')];
  const zeilen: Wert[][] = Array.from({ length: 30 }, (_, i) => [1 + (i % 3), ['Stadt', 'Land'][i % 2]!, 20 + i, i % 4 === 0 ? 0 : (i * 3) % 7, 1 + (i % 5)]);
  const wahl = leereModell();

  it('ordinal: Zahl der Fälle, geordnete Stufen, leere Stufe fällt weg, Brant-Ankündigung', () => {
    const p = katPruefliste({ art: 'ordreg', ziel: 'zuf', praed: ['alter', 'ort'], zeilen, spalten, modell: { ...wahl, art: 'ordinal' }, name: id });
    expect(p[0]!.text).toBe('30 Fälle mit allen Angaben');
    expect(p.find(x => x.text.includes('ist geordnet'))!.text).toBe('„zuf“ ist geordnet: „niedrig“ < „mittel“ < „hoch“ (3 Stufen)');
    expect(p.some(x => x.text.startsWith('Eine Stufe ohne Fälle fällt weg: „sehr hoch“'))).toBe(true);
    expect(p.some(x => x.text.includes('Brant-Test'))).toBe(true);
    expect(p.some(x => x.art === 'sperre')).toBe(false);
  });
  it('multinomial: Vergleichskategorie im Satz, Wahl ohne Fälle sperrt', () => {
    const z2 = zeilen.map((z): Wert[] => [(z[2] as number) % 3 === 0 ? 'Rad' : (z[2] as number) % 3 === 1 ? 'Bus' : 'Zug', z[1]!, z[2]!, z[3]!, z[4]!]);
    const sps = [sp('v', { art: 'text', niveau: 'nominal' }), ...spalten.slice(1)];
    const ok = katPruefliste({ art: 'multreg', ziel: 'v', praed: ['alter'], zeilen: z2, spalten: sps, modell: { ...wahl, art: 'multi', referenz: 'Rad' }, name: id });
    expect(ok.find(x => x.text.startsWith('Ziel mit 3 Kategorien ohne Ordnung'))!.text).toBe('Ziel mit 3 Kategorien ohne Ordnung: multinomiale Regression, Vergleich mit „Rad“');
    const schlecht = katPruefliste({ art: 'multreg', ziel: 'v', praed: ['alter'], zeilen: z2, spalten: sps, modell: { ...wahl, art: 'multi', referenz: 'Auto' }, name: id });
    expect(schlecht.some(x => x.art === 'sperre')).toBe(false);   // unbekannte Wahl gilt nicht - die Stufe der Wahl fehlt ganz (R nimmt die erste)
    expect(stufenMitFaellen(katFaelle('multreg', 'v', ['alter'], z2, sps).stufen)).toEqual(['Bus', 'Rad', 'Zug']);
  });
  it('Zähldaten: negative Zielwerte und Zeit ≤ 0 sind Sperren, die vorn stehen; ohne Zeit steht der Offset-Hinweis', () => {
    const neg = zeilen.map((z, i): Wert[] => (i === 2 ? [z[0]!, z[1]!, z[2]!, -3, z[4]!] : z));
    const p = katPruefliste({ art: 'zaehlreg', ziel: 'tage', praed: ['alter'], zeilen: neg, spalten, modell: { ...wahl, art: 'zaehl' }, name: id });
    expect(p[0]!.art).toBe('sperre'); expect(p[0]!.text).toContain('negative Werte');
    expect(p.some(x => x.text.startsWith('Ohne Beobachtungszeit'))).toBe(true);
    const nullzeit = zeilen.map((z, i): Wert[] => (i === 1 ? [z[0]!, z[1]!, z[2]!, z[3]!, 0] : z));
    const q = katPruefliste({ art: 'zaehlreg', ziel: 'tage', praed: ['alter'], zeilen: nullzeit, spalten, modell: { ...wahl, art: 'zaehl', zeit: 'zeit' }, name: id });
    expect(q[0]!.art).toBe('sperre'); expect(q[0]!.text).toContain('Werte von 0 oder darunter');
    const weg = katPruefliste({ art: 'zaehlreg', ziel: 'tage', praed: ['alter'], zeilen, spalten: spalten.filter(x => x.name !== 'zeit'), modell: { ...wahl, art: 'zaehl', zeit: 'zeit' }, name: id });
    expect(weg[0]!.art).toBe('sperre'); expect(weg[0]!.text).toContain('gibt es nicht mehr');
    s.einst.anrede = 'sie';
    expect(katPruefliste({ art: 'zaehlreg', ziel: 'tage', praed: ['alter'], zeilen, spalten: spalten.filter(x => x.name !== 'zeit'), modell: { ...wahl, art: 'zaehl', zeit: 'zeit' }, name: id })[0]!.text).toContain('Wählen Sie eine andere');
  });
  it('zwei Stufen mit Fällen: Sperre mit dem Satz zur logistischen Regression', () => {
    const zwei = zeilen.map((z): Wert[] => [z[0] === 3 ? 2 : z[0]!, ...z.slice(1)]);
    const p = katPruefliste({ art: 'ordreg', ziel: 'zuf', praed: ['alter'], zeilen: zwei, spalten, modell: { ...wahl, art: 'ordinal' }, name: id });
    expect(p[0]!.art).toBe('sperre'); expect(p[0]!.text).toContain('logistische Regression');
  });
  it('Sperre der Prüfliste lässt das frühere Ergebnis wegfallen (gleiche Regel wie überall)', () => {
    expect(ergebnisFaelltWeg({ editorDa: true, sperre: true, fehlt: 0, datenLaedt: false, geaendert: true, veraltet: false })).toBe(true);
  });
});

describe('Reihenfolge der Stufen: Statable rechnet nie alphabetisch', () => {
  const zeilenT: Wert[][] = Array.from({ length: 30 }, (_, i) => [['nie', 'oft', 'immer'][i % 3]!, 20 + i]);
  it('Text-Ziel mit Niveau „ordinal“ ohne festgelegte Reihenfolge: Sperre mit dem Satz aus der Prüfung (du/Sie)', () => {
    const sps = [sp('y', { art: 'text', niveau: 'ordinal' }), sp('alter')];
    const p = katPruefliste({ art: 'ordreg', ziel: 'y', praed: ['alter'], zeilen: zeilenT, spalten: sps, modell: { ...leereModell(), art: 'ordinal' }, name: id });
    expect(p[0]!.art).toBe('sperre'); expect(p[0]!.text).toBe('Die Reihenfolge der Stufen von „y“ ist nicht festgelegt');
    expect(p[0]!.klein).toBe('Lege sie unter „Spalten beschreiben“ fest; alphabetisch rechnet Statable nicht.');
    expect(p.some(x => x.text.includes('ist geordnet'))).toBe(false);
    s.einst.anrede = 'sie';
    expect(katPruefliste({ art: 'ordreg', ziel: 'y', praed: ['alter'], zeilen: zeilenT, spalten: sps, modell: { ...leereModell(), art: 'ordinal' }, name: id })[0]!.klein).toContain('Legen Sie sie unter');
  });
  it('Zahlen-Codes mit Wertelabels: geordnet, der Satz „nie alphabetisch“ steht da, keine Sperre', () => {
    const sps = [sp('y', { niveau: 'ordinal', werteLabels: { '1': 'nie', '2': 'oft', '3': 'immer' } }), sp('alter')];
    const p = katPruefliste({ art: 'ordreg', ziel: 'y', praed: ['alter'], zeilen: zeilenT.map((z, i): Wert[] => [1 + (i % 3), z[1]!]), spalten: sps, modell: { ...leereModell(), art: 'ordinal' }, name: id });
    expect(p.some(x => x.art === 'sperre')).toBe(false);
    expect(p.find(x => x.text.includes('ist geordnet'))!.klein).toContain('nie alphabetisch');
  });
});

describe('Vorschläge für die lineare Regression - nie still', () => {
  const zeilenZ: Wert[][] = Array.from({ length: 60 }, (_, i) => [[0, 0, 0, 1, 1, 2, 3, 5, 9][i % 9]!, 1 + (i % 4), 20 + i]);
  const alt = [sp('tage'), sp('zuf', { niveau: 'ordinal' }), sp('alter')];
  it('Zählwerte: Hinweis mit Knopf „Als Zähldaten rechnen“, nichts ändert sich vor dem Klick', () => {
    const v = katVorschlaege('tage', ['alter'], zeilenZ, alt, id);
    expect(v).toHaveLength(1); expect(v[0]!.modell).toBe('zaehl'); expect(v[0]!.knopf).toBe('Als Zähldaten rechnen');
    expect(v[0]!.text).toContain('sehen nach Zählwerten aus (ganze Zahlen ab 0, rechtsschief)');
  });
  it('ordinales Ziel mit 3 bis 10 Stufen: Hinweis mit Knopf „Ordinal rechnen“ (und kein Zähl-Vorschlag bei Niveau ordinal)', () => {
    const v = katVorschlaege('zuf', ['alter'], zeilenZ, alt, id);
    expect(v).toHaveLength(1); expect(v[0]!.modell).toBe('ordinal'); expect(v[0]!.knopf).toBe('Ordinal rechnen');
    expect(v[0]!.text).toBe('Das Ziel „zuf“ ist ordinal (4 Stufen). Eine ordinale Regression passt besser als die lineare.');
  });
  it('die Stufen zählen nach dem Ausschluss von Lücken: fällt eine Stufe weg, ändert sich die Zahl; bleiben zwei, gibt es keinen Vorschlag', () => {
    const z: Wert[][] = Array.from({ length: 40 }, (_, i) => [0, 1 + (i % 4), i % 4 === 3 ? null : 20 + i]);   // Stufe 4 hat nur Lücken beim Alter
    expect(katVorschlaege('zuf', ['alter'], z, alt, id)[0]!.text).toContain('ist ordinal (3 Stufen)');
    const z2: Wert[][] = Array.from({ length: 40 }, (_, i) => [0, 1 + (i % 4), i % 4 >= 2 ? null : 20 + i]);
    expect(katVorschlaege('zuf', ['alter'], z2, alt, id)).toEqual([]);
  });
  it('gewöhnliche Messwerte und Spalten mit zwei Werten: kein Vorschlag', () => {
    expect(katVorschlaege('alter', ['tage'], zeilenZ, alt, id)).toEqual([]);
    expect(katVorschlaege('tage', ['alter'], zeilenZ.map((z): Wert[] => [(z[0] as number) > 0 ? 1 : 0, z[1]!, z[2]!]), alt, id)).toEqual([]);
  });
});
