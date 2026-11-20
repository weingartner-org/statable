import { describe, expect, it } from 'vitest';
import { baueIndex, finde } from './begriffsfinder';

const liste = [
  { id: 'mittelwert', titel: 'Mittelwert' }, { id: 'ki', titel: 'Konfidenzintervall (KI)' }, { id: 'streuung', titel: 'Streuung' },
  { id: 'sd', titel: 'Standardabweichung' }, { id: 'fehler', titel: 'Standardfehler' }, { id: 'sf', titel: 'Standard error' }, { id: 'p', titel: 'Rho' }
];
const de = baueIndex(liste, 'de'), en = baueIndex(liste, 'en');
const wort = (t: string, ix = de) => finde(t, ix).map(f => t.slice(f.von, f.bis));

describe('Begriffe in Text finden', () => {
  it('ganze Wörter, ohne Rücksicht auf Groß und Klein', () => {
    expect(wort('Der Mittelwert und die STREUUNG.')).toEqual(['Mittelwert', 'STREUUNG']);
    expect(wort('Streuungsmaße')).toEqual([]);
  });
  it('deutsche Beugung gehört zum Begriff, in anderen Sprachen nicht', () => {
    expect(wort('Die Mittelwerte und des Mittelwertes')).toEqual(['Mittelwerte', 'Mittelwertes']);
    expect(wort('Mittelwerte', en)).toEqual([]);
  });
  it('mehrteilige Begriffe, längster zuerst; jedes Vorkommen; zu kurze nie', () => {
    expect(wort('Standard error ist nicht die Standardabweichung. Mittelwert, Mittelwert.', baueIndex(liste, 'de'))).toEqual(['Standard error', 'Standardabweichung', 'Mittelwert', 'Mittelwert']);
    expect(wort('Rho ist kurz')).toEqual([]);
  });
  it('Titel mit Zeichen, die beim Zerlegen wegfallen, bleiben weg („and“ ist kein Fachbegriff, Mac-Befund M1)', () => {
    const ix = baueIndex([{ id: 'zeichen-prozent', titel: '% and ‰' }, { id: 'proz', titel: '% und ‰' }, { id: 'etal', titel: 'et al.' }], 'en');
    expect(finde('Statable only counts and calculates, see Smith et al. 2020', ix).map(f => f.id)).toEqual(['etal']);
  });
  it('der eigene Begriff bleibt frei, alle Funde zählen', () => {
    expect(finde('Streuung und Mittelwert', de, 'streuung').map(f => f.id)).toEqual(['mittelwert']);
    expect(finde('Mittelwert Streuung Konfidenzintervall Standardabweichung Standardfehler', de)).toHaveLength(5);
  });
});
