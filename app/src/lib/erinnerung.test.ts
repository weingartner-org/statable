import { describe, expect, it } from 'vitest';
import { ERINNERN_NACH_MS, istSchuetzenswert, sollErinnern, standText, standVon, vorZeit, warnenBeimVerlassen } from './erinnerung';

const MIN = 60000;
describe('Schutzwürdig und Warnung beim Verlassen', () => {
  it('Beispieldaten und leere Tabellen sind nicht schutzwürdig', () => {
    expect(istSchuetzenswert({ quelle: 'schlaf-und-konzentration.csv', blaetter: 3, sets: 0, hatWerte: true })).toBe(false);
    expect(istSchuetzenswert({ quelle: 'in Statable eingegeben', blaetter: 0, sets: 0, hatWerte: false })).toBe(false);
  });
  it('eigene Daten oder Blätter sind schutzwürdig', () => {
    expect(istSchuetzenswert({ quelle: 'umfrage.xlsx', blaetter: 0, sets: 0, hatWerte: true })).toBe(true);
    expect(istSchuetzenswert({ quelle: 'umfrage.xlsx', blaetter: 1, sets: 0, hatWerte: false })).toBe(true);
  });
  it('warnt nur bei offenem Projekt mit Änderungen seit der Datei, das etwas wert ist', () => {
    const l = { offen: true, ungesichert: true, schuetzenswert: true };
    expect(warnenBeimVerlassen(l)).toBe(true);
    expect(warnenBeimVerlassen({ ...l, ungesichert: false })).toBe(false);
    expect(warnenBeimVerlassen({ ...l, schuetzenswert: false })).toBe(false);
    expect(warnenBeimVerlassen({ ...l, offen: false })).toBe(false);
  });
});

describe('Ruhiger Hinweis nach zehn Minuten', () => {
  const l = { offen: true, ungesichert: true, seit: 0, jetzt: ERINNERN_NACH_MS, schuetzenswert: true, schonGezeigt: false, abgeschaltet: false };
  it('kommt nach 10 Minuten, nicht davor', () => {
    expect(sollErinnern(l)).toBe(true);
    expect(sollErinnern({ ...l, jetzt: ERINNERN_NACH_MS - 1 })).toBe(false);
  });
  it('kommt nicht, wenn gespeichert, schon gezeigt, abgeschaltet, Beispiel oder ohne Beginn', () => {
    expect(sollErinnern({ ...l, ungesichert: false })).toBe(false);
    expect(sollErinnern({ ...l, schonGezeigt: true })).toBe(false);
    expect(sollErinnern({ ...l, abgeschaltet: true })).toBe(false);
    expect(sollErinnern({ ...l, schuetzenswert: false })).toBe(false);
    expect(sollErinnern({ ...l, seit: null })).toBe(false);
  });
});

describe('Anzeige des Zustands', () => {
  it('Zeitangaben', () => {
    expect(vorZeit(0, 20000, false)).toBe('gerade eben');
    expect(vorZeit(0, 2 * MIN, false)).toBe('vor 2 Min.');
    expect(vorZeit(0, 3 * 60 * MIN, false)).toBe('vor 3 Std.');
    expect(vorZeit(0, 2 * MIN, true)).toBe('2 min ago');
  });
  it('drei Zustände', () => {
    expect(standText(standVon({ ungesichert: false, ziel: null }), 0, false)).toBe('Nicht in einer Datei gespeichert');
    expect(standText(standVon({ ungesichert: true, ziel: null }), 0, false)).toBe('Ungespeicherte Änderungen');
    expect(standText(standVon({ ungesichert: true, ziel: { name: 'medien.statable', zeit: 0, art: 'datei' } }), 0, false)).toBe('Ungespeicherte Änderungen seit medien.statable');
    expect(standText(standVon({ ungesichert: false, ziel: { name: 'medien.statable', zeit: 0, art: 'datei' } }), 2 * MIN, false)).toBe('Gespeichert in medien.statable · vor 2 Min.');
  });
  it('heruntergeladen und geöffnet werden ehrlich unterschieden', () => {
    expect(standText(standVon({ ungesichert: false, ziel: { name: 'a.statable', zeit: 0, art: 'download' } }), 0, false)).toBe('Heruntergeladen als a.statable · gerade eben');
    expect(standText(standVon({ ungesichert: false, ziel: { name: 'a.statable', zeit: 0, art: 'geoeffnet' } }), 0, true)).toBe('Opened from a.statable · just now');
  });
});
