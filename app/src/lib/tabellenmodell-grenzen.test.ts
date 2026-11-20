import { describe, expect, it } from 'vitest';
import type { Spalte } from './verzeichnis';
import type { Daten } from './umformen';
import { rechneTabelle, TabellenFehler, GRUPPEN_MAX, GRUPPEN_HINWEIS } from './tabellenmodell';
import { tabelleAlsItem } from './tabellenitem';
import { s } from './sitzung.svelte';

/* Nachträge S-C zur Tabelle: Hinweis nur einmal je Frage und Gruppe, Grenze bei vielen Gruppen, Zahlformat über das Sprachprofil. */
s.einst.sprache = 'de'; s.einst.anrede = 'du';
const sp = (name: string): Spalte => ({ name, bezeichnung: '', art: 'zahl', niveau: 'metrisch', format: 'F8.2', fehlend: [], fehlendText: '', werteLabels: {} });
const daten = (gruppen: number, proGruppe = 6, fehlend = false): Daten => ({ spalten: [sp('g'), sp('q')], zeilen: Array.from({ length: gruppen * proGruppe }, (_, i) => [Math.floor(i / proGruppe) + 1, fehlend && i % proGruppe < 3 ? null : (i % 5) + 1]) });

describe('Tabelle: Grenzen und Hinweise', () => {
  it('dieselbe Frage als Anteile und Kennwerte: der Hinweis „viele ohne Antwort“ steht nur einmal je Gruppe', () => {
    const e = rechneTabelle(daten(2, 6, true), { spalte: 'g', bloecke: [{ art: 'kategorial', spalte: 'q' }, { art: 'metrisch', spalte: 'q' }] });
    expect(e.hinweise.filter(h => h.art === 'vieleFehlend').length).toBe(2);
  });
  it(`mehr als ${GRUPPEN_HINWEIS} Gruppen: Hinweis; mehr als ${GRUPPEN_MAX}: Fehler statt einer unlesbaren Tabelle`, () => {
    expect(rechneTabelle(daten(GRUPPEN_HINWEIS), { spalte: 'g', bloecke: [{ art: 'metrisch', spalte: 'q' }] }).hinweise.some(h => h.art === 'vieleGruppen')).toBe(false);
    expect(rechneTabelle(daten(GRUPPEN_HINWEIS + 1), { spalte: 'g', bloecke: [{ art: 'metrisch', spalte: 'q' }] }).hinweise.some(h => h.art === 'vieleGruppen')).toBe(true);
    expect(() => rechneTabelle(daten(40), { spalte: 'g', bloecke: [{ art: 'metrisch', spalte: 'q' }] })).toThrow(TabellenFehler);
  });
  it('Tabelle als Item: keine Zahl per toFixed, Dezimalkomma aus dem Sprachprofil', () => {
    const e = rechneTabelle(daten(2), { spalte: 'g', bloecke: [{ art: 'metrisch', spalte: 'q' }] });
    const it = tabelleAlsItem(e);
    expect(it.cells.some(c => c.n !== undefined && /,/.test(c.t))).toBe(true);
  });
});
