/**
 * Erstnutzer-Probe, zweiter Anfragensatz (10.11.2026): dieselben 20 Aufgaben, andere Formulierungen
 * (Alltag, Fachbegriff, SPSS-Name, Englisch). Treffer = ein Zielartikel unter den ersten 5 der Hilfe-Suche.
 * Die Quote darf nur steigen. Anfragen ohne Treffer stehen mit Grund in OHNE_TREFFER.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { artikelListe } from './artikel';
import { suche } from './suche';
import { ladeGlossar } from './glossar';

const pfad = (n: string) => fileURLToPath(new URL(`../../../docs/nutzen/${n}`, import.meta.url));
const AUFGABEN = JSON.parse(readFileSync(pfad('ERSTNUTZER-AUFGABEN-2026-11-09.json'), 'utf8')).aufgaben as { id: string; ziel: string[] }[];
const ANFRAGEN = JSON.parse(readFileSync(pfad('ERSTNUTZER-ANFRAGEN-2-PRUEFSATZ-2026-11-09.json'), 'utf8')) as Record<string, string[]>;
const ARTEN = ['Alltag', 'Fachbegriff', 'SPSS', 'Englisch'] as const;
const TOP = 5;

/** Mindestquote (Anfragen mit Treffer von 80). Darf nur steigen. */
const MINDESTQUOTE = 80;
/** Anfragen, die bewusst nicht treffen: „<Aufgabe>/<Art>“ → Grund. */
const OHNE_TREFFER: Record<string, string> = {};

await Promise.all([ladeGlossar('de'), ladeGlossar('en')]);
const de = artikelListe('de'), en = artikelListe('en');
const ZEILEN = AUFGABEN.flatMap(a => (ANFRAGEN[a.id] ?? []).map((q, i) => {
  const sp = ARTEN[i] === 'Englisch' ? 'en' : 'de';
  const ids = suche(sp === 'en' ? en : de, q, sp).map(t => t.artikel.id);
  return { key: `${a.id}/${ARTEN[i]}`, treffer: a.ziel.some(z => { const r = ids.indexOf(z); return r >= 0 && r < TOP; }) };
}));

describe('Erstnutzer-Probe, Satz 2', () => {
  it('80 Anfragen', () => { expect(ZEILEN.length).toBe(80); });
  it(`Quote: mindestens ${MINDESTQUOTE} von 80`, () => {
    expect(ZEILEN.filter(z => z.treffer).length).toBeGreaterThanOrEqual(MINDESTQUOTE);
  });
  it('OHNE_TREFFER: genau die Anfragen ohne Treffer, mit Grund', () => {
    const ohne = ZEILEN.filter(z => !z.treffer).map(z => z.key);
    expect(ohne.filter(k => !(k in OHNE_TREFFER)), 'neue Lücke').toEqual([]);
    expect(Object.keys(OHNE_TREFFER).filter(k => !ohne.includes(k)), 'inzwischen abgedeckt - streichen').toEqual([]);
    expect(Object.entries(OHNE_TREFFER).filter(([, g]) => g.trim().length < 15).map(([k]) => k), 'Grund fehlt').toEqual([]);
  });
});
