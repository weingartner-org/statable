import { describe, expect, it } from 'vitest';
import { iccErgebnis, saetzeIcc, komma, pWert } from './ergebnis';

/* Fachprüfung Welle 7, Punkt 16: bei sehr wenigen Fällen darf nirgends „NaN“ stehen (p ohne Wert: „-“). */
describe('Übereinstimmung bei n = 3: kein „NaN“', () => {
  it('pWert ohne Wert ist „= -“', () => { expect(pWert(NaN)).toBe('= -'); expect(pWert(0.03)).toBe('= ,030'); });
  it('ICC mit drei Fällen: weder Satz noch APA-Zeile noch Marken enthalten NaN', () => {
    const e = iccErgebnis(['a', 'b'], [[1, 2], [2, 4], [3, 3]], 3), t = saetzeIcc(e);
    expect([t.haupt, t.zusatz, t.vorsicht, t.apa, ...t.marken.map(m => m.text), t.ba ?? ''].join(' | ')).not.toMatch(/NaN/);
    expect(komma(1)).toBe('1,00');
  });
});
