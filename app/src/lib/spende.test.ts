import { describe, expect, it } from 'vitest';
import { addiere, anfangsstand, leseStand, ERINNERUNG_STUNDEN } from './spende';

const H = 3_600_000;
describe('Spendenerinnerung: je 10 Stunden aktiver Nutzung', () => {
  it('kommt nicht vor 10 Stunden', () => {
    expect(addiere(anfangsstand(), 9.9 * H).faellig).toBe(false);
  });
  it('kommt bei 10 Stunden, einmal, und die nächste Schwelle ist 20', () => {
    const r = addiere(anfangsstand(), 10 * H);
    expect(r).toMatchObject({ faellig: true, stunden: 10, stand: { naechste: 20 } });
    expect(addiere(r.stand, 60_000).faellig).toBe(false);
  });
  it('kommt jedes Mal wieder: bei 20, 30 …', () => {
    let st = anfangsstand(); let n = 0;
    for (let i = 0; i < 35 * 4; i++) { const r = addiere(st, H / 4); st = r.stand; if (r.faellig) n++; }
    expect(n).toBe(3);
  });
  it('eine lange Lücke löst nur EINE Erinnerung aus und springt über die Schwelle', () => {
    const r = addiere(anfangsstand(), 25 * H);
    expect(r).toMatchObject({ faellig: true, stunden: 20, stand: { naechste: 30 } });
  });
  it('liest Unsinn als Anfangsstand', () => {
    for (const x of [null, '', 'x', '{"ms":-1,"naechste":10}', '{"ms":"a","naechste":10}', '{"ms":5,"naechste":3}']) expect(leseStand(x)).toEqual({ ms: 0, naechste: ERINNERUNG_STUNDEN });
    expect(leseStand('{"ms":5,"naechste":20}')).toEqual({ ms: 5, naechste: 20 });
  });
});
