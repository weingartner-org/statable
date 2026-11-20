import { describe, it, expect } from 'vitest';
import { wahlAktion, istPfeil } from './wahltasten';

describe('Tastenweg in der Einzelwahl', () => {
  it('Pfeil merkt nur vor, Klick übernimmt sofort', () => {
    expect(wahlAktion({ art: 'change', vonPfeil: true })).toBe('vormerken');
    expect(wahlAktion({ art: 'change', vonPfeil: false })).toBe('setzen');
  });
  it('Enter und Leertaste auf einem Radio übernehmen', () => {
    expect(wahlAktion({ art: 'keydown', taste: 'Enter', aufRadio: true })).toBe('setzen');
    expect(wahlAktion({ art: 'keydown', taste: ' ', aufRadio: true })).toBe('setzen');
    expect(wahlAktion({ art: 'keydown', taste: 'Enter', aufRadio: false })).toBe('nichts');
    expect(wahlAktion({ art: 'keydown', taste: 'a', aufRadio: true })).toBe('nichts');
  });
  it('Verlassen der Gruppe übernimmt nur mit Vormerkung', () => {
    expect(wahlAktion({ art: 'focusout', ausserhalb: true, vorgemerkt: true })).toBe('uebernehmen');
    expect(wahlAktion({ art: 'focusout', ausserhalb: true, vorgemerkt: false })).toBe('nichts');
    expect(wahlAktion({ art: 'focusout', ausserhalb: false, vorgemerkt: true })).toBe('nichts');
  });
  it('erkennt Pfeiltasten', () => { expect(istPfeil('ArrowDown')).toBe(true); expect(istPfeil('Tab')).toBe(false); });
});
