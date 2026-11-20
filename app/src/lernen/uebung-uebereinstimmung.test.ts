import { describe, expect, it } from 'vitest';
import { pruefeQualProjekt } from '../lib/qualprojekt';
import { segmentUebereinstimmung } from '../lib/segmentuebereinstimmung';

/* Rechnet die „Selbst machen“-Übung der Einheit uebereinstimmung-segmente (Hilfe eh-uebereinstimmung-segmente) mit dem Rechenkern nach.
 * Die Zahlen der Lösung stehen dort von Hand gerechnet: bei 90 % 4 von 12 Einheiten (33,3 %), bei 60 % 8 von 12 (66,7 %). */
const ZEILEN: [number, 'a' | 'b', string, number, number][] = [
  [1, 'a', 'c1', 0, 100], [1, 'b', 'c1', 0, 80],
  [2, 'a', 'c2', 120, 160], [2, 'b', 'c2', 122, 160],
  [3, 'a', 'c1', 200, 260], [3, 'b', 'c1', 205, 265],
  [4, 'a', 'c2', 300, 340], [4, 'b', 'c1', 300, 340],
  [5, 'a', 'c1', 400, 450],
  [6, 'b', 'c2', 500, 530],
  [7, 'a', 'c1', 600, 650], [7, 'b', 'c1', 600, 650]
];
const projekt = () => {
  const t0 = 1700000000000;
  return pruefeQualProjekt({
    format: 'statable-qualitativ', version: 1, id: 'uebung', name: 'Übung',
    kodierende: [{ id: 'p-a', name: 'A' }, { id: 'p-b', name: 'B' }],
    dokumente: [{ id: 'd1', name: 'Interview', art: 'text', text: 'x'.repeat(700), erstellt: t0, geaendert: t0 }],
    codes: [{ id: 'c1', name: 'Planung', kodierbar: true, reihenfolge: 1 }, { id: 'c2', name: 'Zeitdruck', kodierbar: true, reihenfolge: 2 }],
    segmente: ZEILEN.map(([, p, , von, bis], i) => ({ id: `s${i}`, dokument: 'd1', start: von, ende: bis, erstellt: t0, kodierende: `p-${p}` })),
    kodierungen: ZEILEN.map(([, p, c], i) => ({ id: `k${i}`, segment: `s${i}`, code: c, kodierende: `p-${p}`, erstellt: t0 })),
    memos: [], faelle: [], variablen: [], protokoll: [], herkunft: { art: 'neu', zeit: t0 }
  });
};

describe('Übung „Zwei Kodierungen vergleichen“: Lösung von Hand gleich Rechenkern', () => {
  it('Schwelle 90 %: 4 von 12 Einheiten, 5 Abweichungen', () => {
    const r = segmentUebereinstimmung(projekt(), { a: 'p-a', b: 'p-b', codes: ['c1', 'c2'], schwelle: 0.9 });
    expect([r.einheiten, r.uebereinstimmend, r.nurA, r.nurB]).toEqual([12, 4, 4, 4]);
    expect(r.prozent).toBeCloseTo(4 / 12, 12);
    expect(r.abweichungen.map(a => a.art).sort()).toEqual(['anderer-code', 'grenzen', 'grenzen', 'nur-eine', 'nur-eine']);
  });
  it('Schwelle 60 %: 8 von 12 Einheiten, 3 Abweichungen', () => {
    const r = segmentUebereinstimmung(projekt(), { a: 'p-a', b: 'p-b', codes: ['c1', 'c2'], schwelle: 0.6 });
    expect([r.einheiten, r.uebereinstimmend, r.nurA, r.nurB]).toEqual([12, 8, 2, 2]);
    expect(r.prozent).toBeCloseTo(8 / 12, 12);
    expect(r.abweichungen.map(a => a.art).sort()).toEqual(['anderer-code', 'nur-eine', 'nur-eine']);
  });
});
