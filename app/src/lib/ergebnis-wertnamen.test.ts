import { beforeAll, describe, expect, it } from 'vitest';
import { korrigiereAusgabe } from '../engine/korrektur';
import { kreuz, saetzeKreuz, saetzeVerteilung, verteilung } from './ergebnis';
import { nodeEngine } from './testengine';

/* Befund Fachprüfung Welle 5: In der Verteilungskarte stand „Bei „x“ ist „8.10“ mit 18 % am häufigsten“ - PSPP schreibt den Wert einer Zahlenspalte
 * ohne Beschriftung englisch („8.10“); im Satz gilt das Dezimalzeichen des Sprachprofils (Standard Deutsch: Komma). */
let e: Awaited<ReturnType<typeof nodeEngine>>;
beforeAll(async () => { e = await nodeEngine(); });

describe('Werte als Zeilen- und Spaltenköpfe im Satz: Dezimalzeichen nach Profil', () => {
  it('Verteilung: „8,10“ statt „8.10“', () => {
    const items = korrigiereAusgabe(e.run(`NEW FILE.
DATA LIST FREE /x.
BEGIN DATA
8.1 8.1 8.1 2.5 3.25 4 5 6 7 9.5 10
END DATA.
FORMATS x (F5.2).
FREQUENCIES /VARIABLES=x /STATISTICS=NONE.`));
    const v = verteilung(items);
    expect(v.gruppen[0]!.werte.map(w => w.name)).toContain('8,10');
    const s = saetzeVerteilung(v), z = s.haupt + s.zusatz;
    expect(z).toMatch(/„8,10“ mit 27\s%\sam häufigsten/);
    expect(z).not.toMatch(/\d\.\d/);
  });
  it('Kreuztabelle: der häufigste Wert als Spaltenkopf mit Komma', () => {
    const items = korrigiereAusgabe(e.run(`NEW FILE.
DATA LIST FREE /g y.
BEGIN DATA
1 1.5 1 1.5 1 2.5 2 2.5 2 2.5 2 1.5
END DATA.
FORMATS y (F3.1).
CROSSTABS /TABLES=g BY y /STATISTICS=CHISQ /CELLS=COUNT ROW EXPECTED.`));
    const k = kreuz(items);
    expect(k.je.map(g => g.haeufigst)).toEqual(['1,5', '2,5']);
    expect(saetzeKreuz(k).haupt + saetzeKreuz(k).zusatz).not.toMatch(/\d\.\d/);
  });
});
