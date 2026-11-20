import { describe, expect, it } from 'vitest';
import { kwic, typischeWoerter, woerterbuchZaehlen, wortliste } from './textanalyse';

// Sollwerte: scripts/textanalyse-erwartet.R (Basis-R, R 4.6.1)
const A = ['Ich bin heute müde und die Arbeit ist schwer', 'Die Arbeit macht Spaß, die Kollegen sind nett', 'Müde, müde, immer müde'];
const B = ['Der Urlaub war schön und die Sonne schien', 'Spaß am Strand, die Kinder sind froh'];
const SOLL: Record<string, [number, number, number, number]> = {
  am: [0, 1, 1.7509374747, 1.8575892214e-01], arbeit: [2, 0, 2.1559860029, 1.4201525160e-01], die: [3, 2, 0.0057372837, 9.3962208587e-01],
  müde: [4, 0, 4.3119720059, 3.7845067016e-02], sind: [1, 1, 0.0563417539, 8.1237427597e-01], und: [1, 1, 0.0563417539, 8.1237427597e-01],
  heute: [1, 0, 1.0779930015, 2.9914696947e-01], urlaub: [0, 1, 1.7509374747, 1.8575892214e-01],
};

describe('Textanalyse', () => {
  it('Typische Wörter: G2 und p wie R', () => {
    const t = typischeWoerter(A, B);
    expect(t.length).toBe(25);
    for (const [w, [a, b, g2, p]] of Object.entries(SOLL)) {
      const z = t.find(x => x.wort === w)!;
      expect([z.a, z.b]).toEqual([a, b]);
      expect(Math.abs(z.g2 - g2)).toBeLessThan(1e-8);
      expect(Math.abs(z.p - p) / p).toBeLessThan(1e-7);
    }
    expect(t[0].wort).toBe('müde');
    expect(t[0].richtung).toBe('a');
  });
  it('Wortliste zählt, ordnet und lässt Stoppwörter weg', () => {
    const w = wortliste(A, { stopp: ['die', 'und'] });
    expect(w.gesamt).toBe(21 - 3 - 1);
    expect(w.zeilen[0]).toMatchObject({ wort: 'müde', anzahl: 4, dokumente: 2 });
    expect(w.zeilen.find(z => z.wort === 'die')).toBeUndefined();
    expect(wortliste(A).gesamt).toBe(21);
  });
  it('Schlüsselwort im Kontext', () => {
    const k = kwic(A, 'Arbeit', 2);
    expect(k).toHaveLength(2);
    expect(k[0]).toMatchObject({ text: 0, links: 'und die', treffer: 'Arbeit', rechts: 'ist schwer' });
    expect(kwic(A, 'müde und', 1)).toHaveLength(1);
    expect(kwic(A, '  ')).toEqual([]);
  });
  it('Wörterbuch zählt Wörter, mit Sternchen am Wortanfang', () => {
    const r = woerterbuchZaehlen(A, [{ name: 'Erschöpfung', woerter: ['müde*', 'schwer'] }, { name: 'Leer', woerter: [' ', ''] }]);
    expect(r.zeilen[0].je).toEqual([2, 0, 3]);
    expect(r.zeilen[0].summe).toBe(5);
    expect(r.zeilen[1].summe).toBe(0);
    expect(r.gesamt).toEqual([9, 8, 4]);
  });
});
