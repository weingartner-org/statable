/* Wächter der Leistungstabelle: Die Zahlen in „Über Statable“ müssen zum Code passen. */
import { describe, expect, it } from 'vitest';
import { artikelListe } from './artikel';
import { LEISTUNG, ZAHLEN } from './leistung';
import { sichtbareThemen } from '../lernen/fragen';
import { LABOR_TEILE, KACHELN } from '../lernen/lernsuche';
import { PROBIER_TEILE } from '../lernen/probierziele';
import { VERFAHREN } from '../lib/verfahren';
import { BEISPIELE } from '../lib/beispiele';
import { FREIGEGEBEN } from '../i18n/laufzeit';

describe('Über Statable', () => {
  const liste = artikelListe('de');
  it('die Zahlen stimmen', () => {
    const zellen = liste.find(a => a.id === 'ueber-statable')!.inhalt.flatMap(b => (typeof b !== 'string' && 'tabelle' in b ? b.tabelle.zeilen.flat() : []));
    expect(zellen).toContain(String(liste.filter(a => a.bereich !== 'begriffe').length));
    expect(zellen).toContain(String(liste.filter(a => a.bereich === 'begriffe').length));
    expect(zellen.some(z => z.startsWith('{'))).toBe(false);
    expect(ZAHLEN.fragen).toBe(sichtbareThemen().reduce((s, t) => s + t.n, 0));
    expect(ZAHLEN.themen).toBe(sichtbareThemen().length);
    expect(ZAHLEN.kacheln).toBe(KACHELN.length + 2);   // dazu „Ausprobieren“ und „Üben“
    expect(ZAHLEN.labor).toBe(LABOR_TEILE.length);
    expect(ZAHLEN.probieren).toBe(PROBIER_TEILE.length);
    expect(ZAHLEN.karten).toBe(VERFAHREN.length);
    expect(ZAHLEN.beispiele).toBe(BEISPIELE.length);
    expect(ZAHLEN.sprachen).toBe(FREIGEGEBEN.length);
  });
  it('jede Zeile nennt nur die drei Rechenwege; kein anderes Programm wird verglichen', () => {
    for (const g of LEISTUNG) for (const [, m] of g.zeilen) expect(m).toMatch(/^(PSPP|Statable|R( \([\w, ]+\))?)( \+ (Statable))?$/);
    const a = liste.find(x => x.id === 'ueber-statable')!;
    expect(a.offen!.length).toBeGreaterThan(LEISTUNG.length);
    expect(a.inhalt.some(b => typeof b !== 'string' && 'tabelle' in b)).toBe(true);
  });
  it('die Funktionen aus der Funktionsprüfung vom 07.11.2026 stehen in der Tabelle, mit Rechenweg Statable', () => {
    const zeilen = new Map(LEISTUNG.flatMap(g => g.zeilen).map(([p, m]) => [p.de, m] as const));
    const gesucht = ['MAXQDA', 'Eurostat', 'Daten aufbereiten', 'Dreifaktorielle', 'Kontraste', 'Dunnett', 'Regressionsdiagnose', 'Zählkarten', 'Kalibriergerade', 'Kurvenanpassung', 'Tabelle zusammenstellen', 'Tabelle für die Veröffentlichung', 'Befehlspalette', 'Offline-Fassung'];
    for (const w of gesucht) {
      const z = [...zeilen].find(([t]) => t.includes(w));
      expect(z, w).toBeDefined();
      expect(z![1], w).toBe('Statable');   // im Code nachgesehen: eigene Rechnung oder Oberfläche, weder PSPP noch R
    }
  });
  it('„Über Statable“ nennt die vier Links der Fußzeile', () => {
    const text = liste.find(x => x.id === 'ueber-statable')!.inhalt.filter((b): b is string => typeof b === 'string').join(' ');
    for (const w of ['Impressum', 'Datenschutz', 'Für Behörden', 'Barrierefreiheit']) expect(text).toContain(`„${w}“`);
  });
});
