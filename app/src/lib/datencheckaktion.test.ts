import { describe, it, expect } from 'vitest';
import { fundSatz, fundTitel } from './datencheckaktion';

// Gemeinsam für Daten-Check und Diagramm-Fenster (29.10.2026): dieselben Sätze wie vorher in seiten/Daten.svelte.
describe('Daten-Check: Titel und Satz eines Fundes', () => {
  it('Platzhalter 99', () => {
    const f = { art: 'platzhalter' as const, spalte: 'schlaf', wert: 99, anzahl: 2, zeilen: [3, 7], mittelVorher: 8.4, mittelNachher: 6.9 };
    expect(fundTitel(f)).toContain('Zweimal');
    expect(fundSatz(f)).toBe('99 passt nicht zu den übrigen Werten. In Fragebögen steht 99 oft für „keine Angabe“.');
  });
  it('Schreibweisen und auffälliger Wert', () => {
    expect(fundSatz({ art: 'schreibweise', spalte: 'g', zuordnung: { w: 'weiblich' }, vorher: {}, nachher: {}, zeilen: [] })).toBe('„w“ meint wohl „weiblich“. Für Statable wären das sonst eigene Gruppen.');
    expect(fundSatz({ art: 'ausreisser', spalte: 'x', wert: 50, zeile: 4, spanne: [1, 9] })).toMatch(/^Zeile 5: 50\. Die übrigen Werte liegen zwischen 1 und 9\./);
    expect(fundSatz({ art: 'leer', spalte: 'x', anzahl: 1, zeilen: [0] })).toBe('');
  });
});
