import { describe, expect, it } from 'vitest';
import { redeanteileCsv, type RedeanteilZeile } from './redeanteile';

const Z: RedeanteilZeile[] = [
  { person: 'Interviewerin', rolle: 'interview', beitraege: 3, woerter: 11, anteilWoerter: 26.8, sprechzeitMs: 9000, anteilZeit: 22.5 },
  { person: '=Befragte; "A"', beitraege: 3, woerter: 30, anteilWoerter: 73.2, sprechzeitMs: null, anteilZeit: null }
];

describe('redeanteileCsv', () => {
  it('Spalten wie im Fachblatt, Zahlen mit dem Dezimalzeichen des Profils (Standard: deutsch, Komma, Strichpunkt)', () => {
    const z = redeanteileCsv(Z, 'de').split('\r\n');
    expect(z[0]).toBe('Person;Rolle;Beiträge;Wörter;Anteil Wörter (%);Sprechzeit (s);Anteil Zeit (%)');
    expect(z[1]).toBe('Interviewerin;interview;3;11;26,8;9,0;22,5');
    expect(z[3]).toBe('');
  });
  it('englische Kopfzeile', () => {
    expect(redeanteileCsv(Z, 'en').split('\r\n')[0]).toBe('Person;Role;Contributions;Words;Share of words (%);Speaking time (s);Share of time (%)');
  });
  it('Formelzeichen am Anfang werden entschärft, Anführungszeichen und Trenner maskiert, fehlende Zeit bleibt leer', () => {
    const z = redeanteileCsv(Z, 'de').split('\r\n');
    expect(z[2]).toBe(`"'=Befragte; ""A""";;3;30;73,2;;`);
  });
});
