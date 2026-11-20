import { describe, expect, it } from 'vitest';
import { bereich, lauf, stelleAus, teileBefehle } from './befehlsteile';
import { nodeEngine } from './testengine';

const KURS = `* Aufgabe 1: Häufigkeiten.
FREQUENCIES /VARIABLES=geschlecht.

DESCRIPTIVES
  /VARIABLES=alter
  /STATISTICS=MEAN STDDEV.
DATA LIST FREE /a b.
BEGIN DATA.
1 2

3 4.
END DATA.
COMMENT Aufgabe 2
  über zwei Zeilen.
LIST
EXECUTE.`;

describe('Befehle zum Anhaken (Johannes 07.10.: einzeln ausführen, barrierefrei)', () => {
  it('teilt nach Punkt und leerer Zeile, Kommentar zum folgenden Befehl, Datenblock zum DATA LIST', () => {
    const t = teileBefehle(KURS);
    expect(t.map(x => [x.von, x.bis, x.kopf])).toEqual([
      [0, 1, 'FREQUENCIES /VARIABLES=geschlecht.'],
      [3, 5, 'DESCRIPTIVES'],
      [6, 11, 'DATA LIST FREE /a b.'],
      [12, 14, 'LIST'],
      [15, 15, 'EXECUTE.']
    ]);
    expect(t[0]!.text).toBe('* Aufgabe 1: Häufigkeiten.\nFREQUENCIES /VARIABLES=geschlecht.');
    expect(t[2]!.text).toContain('3 4.\nEND DATA.');
  });

  it('leerer Text, nur Kommentar, Befehl ohne Punkt am Ende', () => {
    expect(teileBefehle('')).toEqual([]);
    expect(teileBefehle('* nur ein Kommentar.')).toEqual([]);
    expect(teileBefehle('FREQUENCIES /VARIABLES=a').map(x => x.kopf)).toEqual(['FREQUENCIES /VARIABLES=a']);
  });

  it('Fehler im angehakten Teil zeigt auf die richtige Stelle im ganzen Text (echte Engine)', async () => {
    const e = await nodeEngine();
    const text = 'DATA LIST FREE /x g.\nBEGIN DATA.\n1 1 2 1 3 2 4 2\nEND DATA.\n\nDESCRIPTIVES /VARIABLES=x.\nONEWAY x BY g\n  /STATISTICS=DESCRIPTIVES WELCH.';
    const t = teileBefehle(text);
    expect(t.length).toBe(3);
    const r = lauf(text, [t[0]!, t[2]!]);
    const fehler = e.run(r.syntax).find(i => i.type === 'message' && i.severity === 'error') as { text: string };
    const st = stelleAus(fehler.text)!;
    const b = bereich(text, r.zeilen, st)!;
    expect(b.zeile).toBe(8);
    expect(text.slice(b.von, b.bis)).toBe('WELCH');
  });

  it('Stelle ohne Spalte: ganze Zeile', () => {
    expect(stelleAus('3: error: x')).toEqual({ z1: 3, s1: 0, z2: 3, s2: 0 });
    const b = bereich('a.\nbb.\nccc.', [0, 1, 2], { z1: 3, s1: 0, z2: 3, s2: 0 })!;
    expect(b).toEqual({ von: 7, bis: 11, zeile: 3 });
    expect(stelleAus('error: ohne Stelle')).toBeNull();
  });
});
