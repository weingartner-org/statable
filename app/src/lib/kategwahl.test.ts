import { describe, expect, it } from 'vitest';
import { andereAlsZaehlwerte, kopiereModell, leereModell, modellAn, modelleFuer, modellGilt, referenzGilt, zielArt, zaehlwerte } from './kategwahl';
import { kopiereZusatz, leereZusatz, zusatzAn } from './aequirci';
import { brauchtRBlatt, rechnetVonSelbst } from './live';
import { darfNeuRechnen } from './neurechnen.svelte';
import type { Spalte } from './verzeichnis';
import { werteVon } from './blatttitel';
import { fehlendeSpalten } from './blattstand';
import type { Blatt } from './sitzung.svelte';

const sp = (o: Partial<Spalte> = {}): Spalte => ({ name: 'z', bezeichnung: 'z', art: 'zahl', niveau: 'metrisch', format: '', fehlend: [], fehlendText: '', werteLabels: {}, ...o });
const stufen5 = { '1': 'a', '2': 'b', '3': 'c', '4': 'd', '5': 'e' };

describe('Modell unter „Weitere Wege“: welche Möglichkeiten zur Zielspalte passen', () => {
  it('zwei Werte: logistische Regression, keine Wahl', () => { expect(modelleFuer(sp(), 2, [0, 1])).toEqual([]); expect(zielArt(sp({ art: 'text' }), 2)).toBe('binaer'); });
  it('Text oder beschriftete nominale Zahl mit 3 bis 12 Stufen: nur multinomial', () => {
    expect(modelleFuer(sp({ art: 'text', niveau: 'nominal' }), 3)).toEqual(['multi']);
    expect(modelleFuer(sp({ niveau: 'nominal', werteLabels: stufen5 }), 5, [1, 2, 3, 4, 5])).toEqual(['multi']);
    expect(modelleFuer(sp({ art: 'text', niveau: 'nominal' }), 13)).toEqual([]);   // zu viele Stufen: kein Ziel
  });
  it('geordneter Text: ordinal (Standard) oder multinomial; linear geht mit Text nicht', () => { expect(modelleFuer(sp({ art: 'text', niveau: 'ordinal' }), 4)).toEqual(['ordinal', 'multi']); });
  it('Zahl: linear bleibt Standard; ordinal und multinomial nur bei geordneten Stufen; Zähldaten nur bei ganzen Zahlen ab 0', () => {
    expect(modelleFuer(sp(), 40, [1.5, 2.5, 3.2])).toEqual(['linear']);
    expect(modelleFuer(sp({ niveau: 'ordinal' }), 5, [1, 2, 3, 4, 5])).toEqual(['linear', 'ordinal', 'multi', 'zaehl']);
    expect(modelleFuer(sp({ niveau: 'metrisch', werteLabels: stufen5 }), 5, [1, 2, 3, 4, 5])).toEqual(['linear', 'ordinal', 'multi', 'zaehl']);   // beschriftete Likert-Items rechnen weiter linear, ordinal wird angeboten
    expect(modelleFuer(sp(), 12, [0, 1, 2, 0, 5, 9])).toEqual(['linear', 'zaehl']);
    expect(zaehlwerte([0, 1, -1])).toBe(false); expect(zaehlwerte([0, 1, 1, 0])).toBe(false);
  });
  it('negative oder nicht ganze Zielwerte: „Zähldaten“ fehlt in der Wahl, die Wahl sagt warum', () => {
    expect(andereAlsZaehlwerte([0, 1, 2.5])).toBe(true); expect(andereAlsZaehlwerte([0, -1, 3])).toBe(true); expect(andereAlsZaehlwerte([0, 1, 2, 7])).toBe(false);
    expect(modelleFuer(sp(), 12, [0, 1.5, 2, 3])).toEqual(['linear']);
  });
  it('Standard der Zielart gilt, wenn die Wahl nicht passt; alte Blätter bleiben linear', () => {
    expect(modellGilt(undefined, ['linear', 'ordinal'])).toBe('linear');
    expect(modellGilt({ ...leereModell(), art: 'ordinal' }, ['linear', 'ordinal'])).toBe('ordinal');
    expect(modellGilt({ ...leereModell(), art: 'zaehl' }, ['linear', 'ordinal'])).toBe('linear');
    expect(modellGilt({ ...leereModell(), art: 'linear' }, ['multi'])).toBe('multi');
    expect(modellGilt({ ...leereModell(), art: 'ordinal' }, [])).toBe('linear');
  });
  it('Vergleichskategorie: die Wahl, sonst die erste Stufe', () => {
    expect(referenzGilt({ ...leereModell(), referenz: 'Rad' }, ['Bus', 'Rad', 'Zug'])).toBe('Rad');
    expect(referenzGilt({ ...leereModell(), referenz: 'Auto' }, ['Bus', 'Rad', 'Zug'])).toBe('Bus');
    expect(referenzGilt(undefined, ['Bus', 'Rad'])).toBe('Bus');
  });
});

describe('Speichern am Blatt', () => {
  it('Projekte ohne `modell` bleiben linear und ohne gespeicherte Wahl', () => {
    const alt = { tost: { an: false, delta: '' }, rci: { an: false, quelle: 'retest' as const, r: '', skala: '', richtung: '' as const } } as never;
    const z = kopiereZusatz(alt);
    expect(z.modell).toEqual(leereModell()); expect(zusatzAn(z)).toBe(false);
  });
  it('ein anderes Modell wird gespeichert und kopiert', () => {
    const z = { ...leereZusatz(), modell: { art: 'multi' as const, zaehl: 'auto' as const, zeit: '', referenz: 'Rad' } };
    expect(zusatzAn(z)).toBe(true); expect(modellAn(z.modell)).toBe(true);
    const k = kopiereZusatz(z); expect(k.modell).toEqual(z.modell); expect(k.modell).not.toBe(z.modell); expect(kopiereModell(undefined).art).toBe('linear');
  });
  it('R wird nur mit anderem Modell gebraucht: Neu-Rechnen und „von selbst“ warten auf R', () => {
    expect(brauchtRBlatt('vorhersage', undefined)).toBe(false); expect(brauchtRBlatt('vorhersage', { modell: { art: 'linear' } })).toBe(false);
    expect(brauchtRBlatt('vorhersage', { modell: { art: 'ordinal' } })).toBe(true); expect(brauchtRBlatt('mehrebenen')).toBe(true); expect(brauchtRBlatt('gruppen', { modell: { art: 'ordinal' } })).toBe(false);
    expect(darfNeuRechnen('vorhersage', false, false, { modell: { art: 'multi' } })).toBe(false); expect(darfNeuRechnen('vorhersage', true, false, { modell: { art: 'multi' } })).toBe(true);
    expect(darfNeuRechnen('vorhersage', false, true, { modell: { art: 'zaehl' } })).toBe(true); expect(darfNeuRechnen('vorhersage', false)).toBe(true);
    expect(rechnetVonSelbst({ sofort: true, verfahrenId: 'vorhersage', rBereit: false, mitR: true })).toBe(false);
    expect(rechnetVonSelbst({ sofort: true, verfahrenId: 'vorhersage', rBereit: true, mitR: true })).toBe(true);
    expect(rechnetVonSelbst({ sofort: true, verfahrenId: 'vorhersage', rBereit: false })).toBe(true);
  });
});

describe('Beobachtungszeit am gespeicherten Blatt', () => {
  const blatt = (zus: object | undefined): Blatt => ({ id: 'a', titel: 't', art: 'vorhersage', l1: 'tage', l2: 'lernzeit', l3: ['tage', 'lernzeit', 'gruppe', 'wochen'], syntax: '', items: [], ergebnis: null, imBericht: true, notiz: '', zeit: 0, zus } as unknown as Blatt);
  it('die Zeit ist eine Spalte des Blatts, aber keine Vorhersagespalte', () => {
    const z = { modell: { art: 'zaehl', zaehl: 'auto', zeit: 'wochen', referenz: '' } };
    expect(werteVon(blatt(z))).toEqual({ l1: ['tage'], l2: ['lernzeit', 'gruppe'], l3: ['wochen'], l4: [] });
    expect(fehlendeSpalten(blatt(z), { spalten: [{ name: 'tage' }, { name: 'lernzeit' }, { name: 'gruppe' }], zeilen: [], sets: [] })).toEqual(['wochen']);
  });
  it('ohne Zähldaten-Modell (alte Blätter) bleibt alles Vorhersagespalte', () => {
    expect(werteVon(blatt(undefined))).toEqual({ l1: ['tage'], l2: ['lernzeit', 'gruppe', 'wochen'], l3: [], l4: [] });
  });
});
