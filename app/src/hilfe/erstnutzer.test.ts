/**
 * Erstnutzer-Probe (Stufe 5.1, 09.11.2026): 20 Aufgaben ohne Verfahrensnamen, je 4 Anfragen, wie Studierende tippen
 * (Alltag, Fachbegriff, SPSS-Name, Englisch). Ein Treffer zählt, wenn ein Zielartikel unter den ersten 5 Ergebnissen
 * der echten Hilfe-Suche steht (Artikelliste der App, Sprache de; die englische Anfrage mit Sprache en).
 * Die Quote darf nicht sinken. Anfragen ohne Treffer stehen mit Grund in OHNE_TREFFER.
 * Mit NUTZEN_BERICHT=1 schreibt der Test docs/nutzen/ERSTNUTZER-ERGEBNIS-2026-11-09.json.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { artikelListe } from './artikel';
import { suche } from './suche';
import { ladeGlossar } from './glossar';

const pfad = (n: string) => fileURLToPath(new URL(`../../../docs/nutzen/${n}`, import.meta.url));
const AUFGABEN = JSON.parse(readFileSync(pfad('ERSTNUTZER-AUFGABEN-2026-11-09.json'), 'utf8')).aufgaben as { id: string; aufgabe: string; ziel: string[] }[];
const ANFRAGEN = JSON.parse(readFileSync(pfad('ERSTNUTZER-ANFRAGEN-2026-11-09.json'), 'utf8')) as Record<string, string[]>;
const ARTEN = ['Alltag', 'Fachbegriff', 'SPSS', 'Englisch'] as const;
const TOP = 5;

/** Mindestquote (Anfragen mit Treffer von 80). Darf nur steigen. */
const MINDESTQUOTE = 80;
/** Anfragen, die bewusst nicht treffen: „<Aufgabe>/<Art>“ → Grund. */
const OHNE_TREFFER: Record<string, string> = {};

// wie die App: großes Glossar geladen, dann die Artikelliste
await Promise.all([ladeGlossar('de'), ladeGlossar('en')]);
const de = artikelListe('de'), en = artikelListe('en');
const alle = new Set(de.map(a => a.id));

const ZEILEN = AUFGABEN.flatMap(a => (ANFRAGEN[a.id] ?? []).map((q, i) => {
  const sp = ARTEN[i] === 'Englisch' ? 'en' : 'de';
  const ids = suche(sp === 'en' ? en : de, q, sp).map(t => t.artikel.id);
  const raenge = a.ziel.map(z => ids.indexOf(z)).filter(r => r >= 0);
  const rang = raenge.length ? Math.min(...raenge) + 1 : null;
  return { aufgabe: a.id, art: ARTEN[i]!, anfrage: q, rang, treffer: rang !== null && rang <= TOP, erste: ids.slice(0, TOP) };
}));
const zaehle = (art?: string) => { const z = ZEILEN.filter(x => !art || x.art === art); return { treffer: z.filter(x => x.treffer).length, von: z.length }; };

describe('Erstnutzer-Probe', () => {
  it('Aufgaben und Anfragen sind vollständig (20 Aufgaben, je 4 Anfragen)', () => {
    expect(AUFGABEN.length).toBe(20);
    expect(ZEILEN.length).toBe(80);
    for (const a of AUFGABEN) expect(ANFRAGEN[a.id]?.length, a.id).toBe(4);
  });
  it('Alle Zielkennungen gibt es als Artikel', () => {
    const fehlt = AUFGABEN.flatMap(a => a.ziel.filter(z => !alle.has(z)).map(z => `${a.id}:${z}`));
    expect(fehlt).toEqual([]);
  });
  it(`Quote: mindestens ${MINDESTQUOTE} von 80 Anfragen treffen`, () => {
    expect(zaehle().treffer).toBeGreaterThanOrEqual(MINDESTQUOTE);
  });
  it('OHNE_TREFFER: genau die Anfragen ohne Treffer, mit Grund', () => {
    const ohne = ZEILEN.filter(z => !z.treffer).map(z => `${z.aufgabe}/${z.art}`);
    expect(ohne.filter(k => !(k in OHNE_TREFFER)), 'neue Lücke').toEqual([]);
    expect(Object.keys(OHNE_TREFFER).filter(k => !ohne.includes(k)), 'inzwischen abgedeckt - streichen').toEqual([]);
    expect(Object.entries(OHNE_TREFFER).filter(([, g]) => g.trim().length < 15).map(([k]) => k), 'Grund fehlt').toEqual([]);
  });
  it('Bericht (nur mit NUTZEN_BERICHT=1): docs/nutzen/ERSTNUTZER-ERGEBNIS-2026-11-09.json', () => {
    if (!process.env.NUTZEN_BERICHT) return;
    mkdirSync(pfad(''), { recursive: true });
    const quote = { gesamt: zaehle(), ...Object.fromEntries(ARTEN.map(a => [a, zaehle(a)])) };
    const je = Object.fromEntries(AUFGABEN.map(a => [a.id, ZEILEN.filter(z => z.aufgabe === a.id).map(z => ({ art: z.art, anfrage: z.anfrage, rang: z.rang, ...(z.treffer ? {} : { erste: z.erste }) }))]));
    writeFileSync(pfad('ERSTNUTZER-ERGEBNIS-2026-11-09.json'), JSON.stringify({ top: TOP, quote, anfragen: je }, null, 2) + '\n', 'utf8');
  });
});

/** Die 15 SPSS-Menünamen aus Stufe 1 (Fachblatt 5.1), wie SPSS sie nennt: Der passende Artikel steht unter den ersten 5. */
const SPSS_NAMEN: [string, string[]][] = [
  ['T-Test bei unabhängigen Stichproben', ['frage-gruppen']],
  ['Reliabilitätsanalyse', ['frage-skala']],
  ['Univariat', ['zweifaktorielle-varianzanalyse', 'kovarianzanalyse']],
  ['Messwiederholung', ['frage-messwiederholung']],
  ['Kreuztabellen', ['frage-kreuz', 'kreuztabelle']],
  ['Lineare Regression', ['frage-vorhersage']],
  ['Binär logistisch', ['logistische-regression', 'frage-vorhersage']],
  ['Faktorenanalyse', ['frage-faktor', 'faktorenanalyse']],
  ['Bivariate Korrelationen', ['frage-zusammenhang']],
  ['Partielle Korrelationen', ['frage-partialkorrelation']],
  ['Nichtparametrische Tests', ['rangtests-weitere', 'rangtest']],
  ['Diskriminanzanalyse', ['frage-diskriminanz']],
  ['Clusteranalyse', ['frage-cluster']],
  ['Loglinear', ['frage-loglinear']],
  ['Gemischte Modelle', ['frage-mehrebenen']]
];
describe('SPSS-Menünamen (Stufe 1, 15 Namen)', () => {
  for (const [name, ziele] of SPSS_NAMEN) {
    it(`„${name}“ findet ${ziele.join(' oder ')} unter den ersten ${TOP}`, () => {
      const ids = suche(de, name, 'de').slice(0, TOP).map(t => t.artikel.id);
      expect(ids.some(i => ziele.includes(i)), ids.join(', ')).toBe(true);
    });
  }
});
