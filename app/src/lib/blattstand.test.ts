/** Veraltete Blätter, Neurechnen-Warteschlange, Dateinamen, Tabellennummern (Abnahme 4: B1, B7, B8). */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Blatt } from './sitzung.svelte';
import { s } from './sitzung.svelte';
import { istVeraltet, veralteteVon, standVon, fehlendeSpalten, ergebnisFaelltWeg, type DatenStand } from './blattstand';
import { dateiname } from './dateiname';
import { tabellenNummer } from './tabellennummer';
import { neuRechnen, neuRechnenAbbrechen, ende, rechenstand, darfNeuRechnen } from './neurechnen.svelte';
import { veraltetMarke } from './export';

const daten = (konz: (number | null)[], fehlend: number[] = []): DatenStand => ({
  spalten: [{ name: 'gruppe', art: 'zahl', fehlend: [] }, { name: 'konz', art: 'zahl', fehlend }],
  zeilen: konz.map((k, i) => [i % 2, k]), sets: []
});
const blatt = (d: DatenStand, art = 'gruppen'): Blatt => ({ id: 'b1', titel: 'Handy und Konzentration', art, l1: 'konz', l2: 'gruppe', l3: ['konz', 'gruppe'], syntax: '', items: [], ergebnis: null, imBericht: true, notiz: '', zeit: 0, stand: standVon({ l1: ['konz'], l2: ['gruppe'], l3: [], l4: [] }, d) });

describe('veraltete Blätter (B1)', () => {
  const vorher = daten([60, 61, 70, 55, 52, 58]);
  it('gleicher Datenstand: nicht veraltet', () => { expect(istVeraltet(blatt(vorher), vorher)).toBe(false); });
  it('„Keine Angabe“ = 70 gesetzt (der Beleg der Abnahme): veraltet', () => {
    const b = blatt(vorher), nachher = daten([60, 61, 70, 55, 52, 58], [70]);
    expect(istVeraltet(b, nachher)).toBe(true); expect(veralteteVon([b], nachher)).toEqual([b]);
  });
  it('ein Wert geändert, eine Zeile mehr, eine andere (unbenutzte) Spalte geändert', () => {
    const b = blatt(vorher);
    expect(istVeraltet(b, daten([60, 61, 71, 55, 52, 58]))).toBe(true);
    expect(istVeraltet(b, daten([60, 61, 70, 55, 52, 58, 50]))).toBe(true);
    const anders = daten([60, 61, 70, 55, 52, 58]); anders.spalten.push({ name: 'x' }); anders.zeilen.forEach(z => z.push(9));
    expect(istVeraltet(b, anders)).toBe(false);
  });
  it('Blätter ohne Stand und Meta-Analysen gelten nie als veraltet', () => {
    const b = { ...blatt(vorher), stand: undefined }, m = blatt(vorher, 'meta');
    expect(istVeraltet(b, daten([1, 2, 3]))).toBe(false); expect(istVeraltet(m, daten([1, 2, 3]))).toBe(false);
  });
  it('Export und Bericht kennzeichnen ein veraltetes Blatt (nie stillschweigend alte Zahlen)', () => {
    const b = blatt(vorher);
    Object.assign(s, { spalten: daten([60, 61, 70, 55, 52, 58]).spalten, zeilen: daten([60, 61, 70, 55, 52, 58]).zeilen, sets: [] });
    expect(veraltetMarke(b)).toBe('');
    const d2 = daten([60, 61, 70, 55, 52, 58], [70]); Object.assign(s, { spalten: d2.spalten });
    expect(veraltetMarke(b)).toContain('veraltet');
    expect(veraltetMarke(b)).toContain('Daten wurden nach dieser Rechnung geändert');
  });
});

describe('Neurechnen-Warteschlange', () => {
  beforeEach(() => neuRechnenAbbrechen());
  it('rechnet ein Blatt nach dem anderen und wartet, bis alle durch sind (auch gescheiterte)', async () => {
    const fertig = vi.fn();
    const p = neuRechnen([{ id: 'a', mitR: false }, { id: 'b', mitR: false }, { id: 'a', mitR: false }]).then(fertig);
    expect(rechenstand.aktuell?.id).toBe('a'); expect(rechenstand.gesamt).toBe(2);
    ende('b', true); await Promise.resolve();   // nicht das aktuelle: ignoriert
    expect(rechenstand.aktuell?.id).toBe('a');
    ende('a', true); await Promise.resolve(); await Promise.resolve();
    expect(rechenstand.aktuell?.id).toBe('b'); expect(fertig).not.toHaveBeenCalled();
    ende('b', false); await p;
    expect(fertig).toHaveBeenCalled(); expect(rechenstand.aktuell).toBeNull(); expect(rechenstand.gescheitert).toContain('b');
  });
  it('leere Liste ist sofort fertig; Abbrechen gibt Wartende frei', async () => {
    await neuRechnen([]);
    const p = neuRechnen([{ id: 'x', mitR: false }]); neuRechnenAbbrechen(); await p;
    expect(rechenstand.aktuell).toBeNull();
  });
  it('R-Verfahren nur mit geladenem R oder auf ausdrücklichen Wunsch', () => {
    expect(darfNeuRechnen('gruppen', false)).toBe(true);
    expect(darfNeuRechnen('meta', false)).toBe(false); expect(darfNeuRechnen('mehrebenen', true)).toBe(true); expect(darfNeuRechnen('mehrebenen', false, true)).toBe(true);
  });
});

describe('Dateinamen und Tabellennummern', () => {
  it('„<Titel> - <Art>“, ohne $ und Sonderzeichen (B7)', () => {
    expect(dateiname('Mehrfachantworten $nutz')).toBe('Mehrfachantworten nutz');
    expect(dateiname('a/b: c?')).toBe('ab c');
  });
  it('Tabellennummern zählen fortlaufend, dieselbe Tabelle behält ihre Nummer (B8)', () => {
    s.projekt = { id: 'p-nummern', name: 'x', quelle: '' } as never;
    expect([tabellenNummer('A'), tabellenNummer('B'), tabellenNummer('A'), tabellenNummer('C')]).toEqual([1, 2, 1, 3]);
    s.projekt = { id: 'p-anders', name: 'y', quelle: '' } as never;
    expect(tabellenNummer('A')).toBe(1);
  });
  it('gleicher Titel, verschiedene Tabellen: verschiedene Nummern; dieselbe Tabelle behält ihre (G7)', () => {
    s.projekt = { id: 'p-g7', name: 'x', quelle: '' } as never;
    const t1 = {}, t2 = {}, t3 = {};
    expect([tabellenNummer('Deskriptive Statistiken', t1), tabellenNummer('Deskriptive Statistiken', t2), tabellenNummer('Deskriptive Statistiken', t3), tabellenNummer('Deskriptive Statistiken', t1)]).toEqual([1, 2, 3, 1]);
  });
});

describe('Abschlusstest D12: Spalte entfernt', () => {
  const voll = daten([60, 61, 70, 55, 52, 58]);
  const ohne = (name: string): DatenStand => ({ spalten: voll.spalten.filter(x => x.name !== name), zeilen: voll.zeilen.map(z => z.filter((_, i) => voll.spalten[i]!.name !== name)), sets: [] });
  it('nennt die Spalten, die das Blatt braucht und die es nicht mehr gibt', () => {
    expect(fehlendeSpalten(blatt(voll), voll)).toEqual([]);
    expect(fehlendeSpalten(blatt(voll), ohne('konz'))).toEqual(['konz']);
    expect(fehlendeSpalten(blatt(voll), ohne('gruppe'))).toEqual(['gruppe']);
  });
  it('Meta-Analyse und Befehls-Blätter brauchen keine Spalten', () => {
    expect(fehlendeSpalten(blatt(voll, 'meta'), ohne('konz'))).toEqual([]);
    expect(fehlendeSpalten({ ...blatt(voll, 'befehle'), l1: null, l2: null, l3: undefined }, ohne('konz'))).toEqual([]);
  });
  it('ein Mehrfachantworten-Set zählt als fehlend, wenn das Set oder eine seiner Spalten fehlt', () => {
    const b = { ...blatt(voll, 'mehrfach'), l1: '$medien', l2: null, l3: ['$medien'] };
    expect(fehlendeSpalten(b, { ...voll, sets: [{ name: 'medien', spalten: ['konz', 'gruppe'] }] })).toEqual([]);
    expect(fehlendeSpalten(b, { ...ohne('konz'), sets: [{ name: 'medien', spalten: ['konz', 'gruppe'] }] })).toEqual(['konz']);
    expect(fehlendeSpalten(b, voll)).toEqual(['$medien']);
  });
});

describe('gesperrte Frage: wann das frühere Ergebnis wegfällt (Fachprüfung Pakete A bis C)', () => {
  const basis = { gesperrt: undefined as boolean | undefined, editorDa: true, sperre: true, fehlt: 0, datenLaedt: false, geaendert: true, veraltet: false };
  it('echte Sperre nach geänderter Auswahl: Ergebnis fällt weg (jedes Verfahren, z. B. leerer Block)', () => { expect(ergebnisFaelltWeg(basis)).toBe(true); });
  it('echte Sperre nach geänderten Daten: Ergebnis fällt weg', () => { expect(ergebnisFaelltWeg({ ...basis, geaendert: false, veraltet: true })).toBe(true); });
  it('keine Sperre: nichts passiert', () => { expect(ergebnisFaelltWeg({ ...basis, sperre: false })).toBe(false); });
  it('Blatt wird nur geöffnet (Auswahl und Daten unverändert): nichts passiert', () => { expect(ergebnisFaelltWeg({ ...basis, geaendert: false, veraltet: false })).toBe(false); });
  it('Daten werden noch geladen (Spalten und Zeilen fehlen vorübergehend): nichts passiert', () => {
    expect(ergebnisFaelltWeg({ ...basis, datenLaedt: true })).toBe(false);
    expect(ergebnisFaelltWeg({ ...basis, datenLaedt: true, geaendert: false, veraltet: true })).toBe(false);
  });
  it('Spalte fehlt: eigener Fall „Spalte entfernt“, Ergebnis bleibt als alte Zahlen stehen', () => { expect(ergebnisFaelltWeg({ ...basis, fehlt: 1 })).toBe(false); });
  it('Editor gehört noch zum vorigen Blatt: nichts passiert', () => { expect(ergebnisFaelltWeg({ ...basis, editorDa: false })).toBe(false); });
  it('schon gesperrt: nicht noch einmal', () => { expect(ergebnisFaelltWeg({ ...basis, gesperrt: true })).toBe(false); });
});
