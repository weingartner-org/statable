import { describe, expect, it } from 'vitest';
import { baueVorlage, blattAusVorlage, leseVorlage, vorlageAlsText } from './vorlage';
import { werteVon, zeitreiheSpalten } from './blatttitel';
import type { Blatt } from './sitzung.svelte';

/** Abnahme 31.10. S2: Zeitreihe mit zweiter Reihe, ohne Zeitpunkt: l3 = [Wert, '', zweite Reihe]. Die Vorlage darf den leeren Platz nicht verlieren. */
const zr = (): Blatt => ({ id: 'z1', titel: 'Zeitreihe: Wind', art: 'zeitreihen', l1: 'wind_mph', l2: null, l3: ['wind_mph', '', 'temperatur_f'], syntax: '', items: [], ergebnis: null, imBericht: true, notiz: '', zeit: 0 });
describe('Vorlage: Zeitreihe mit zweiter Reihe ohne Zeitpunkt', () => {
  it('behält den leeren Platz für den Zeitpunkt', () => {
    const { vorlage } = baueVorlage([], { spalten: [{ name: 'wind_mph', art: 'zahl' }, { name: 'temperatur_f', art: 'zahl' }] }, [zr()], [], [], 'v', false, 0);
    const l = leseVorlage(vorlageAlsText(vorlage));
    if (!l.ok) throw new Error('nicht lesbar');
    const b = blattAusVorlage(l.vorlage.blaetter[0]!, 'neu', 1);
    expect(b.l3).toEqual(['wind_mph', '', 'temperatur_f']);
    expect(werteVon(b)).toEqual({ l1: ['wind_mph'], l2: [], l3: ['temperatur_f'], l4: [] });
  });
  it('die Auswahl wird mit leerem Platz abgelegt (nicht [Wert, zweite Reihe])', () => {
    expect(zeitreiheSpalten({ l1: ['wind_mph'], l2: [], l3: ['temperatur_f'], l4: [] })).toEqual(['wind_mph', '', 'temperatur_f']);
    expect(zeitreiheSpalten({ l1: ['wind_mph'], l2: ['datum'], l3: ['temperatur_f'], l4: [] })).toEqual(['wind_mph', 'datum', 'temperatur_f']);
    expect(zeitreiheSpalten({ l1: ['wind_mph'], l2: [], l3: [], l4: [] })).toEqual(['wind_mph']);
    const b = { ...zr(), l3: zeitreiheSpalten({ l1: ['wind_mph'], l2: [], l3: ['temperatur_f'], l4: [] }) };
    expect(werteVon(b)).toEqual({ l1: ['wind_mph'], l2: [], l3: ['temperatur_f'], l4: [] });
  });
});
