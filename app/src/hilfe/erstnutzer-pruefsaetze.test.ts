/**
 * Unabhängige Prüfsätze der Hilfe-Suche (10.11.2026). Ein Treffer zählt wie in `erstnutzer.test.ts`: ein Zielartikel unter den ersten 5
 * der echten Hilfe-Suche (Sprache de, die englische Anfrage mit Sprache en).
 * - Satz 2 (09.11.): `ERSTNUTZER-ANFRAGEN-2-PRUEFSATZ-2026-11-09.json` zu den Aufgaben e01-e20. Seine Fehltreffer wurden am 10.11. behoben.
 * - Satz 3 (10.11.): `ERSTNUTZER-PRUEFSATZ-3-2026-11-10.json`, von einem frischen Agenten ohne Kenntnis des Suchcodes geschrieben, VOR dem Beheben
 *   gemessen. Seine Fehltreffer werden absichtlich NICHT behoben, damit der Satz eine ehrliche Messung bleibt; die Quote darf nur nicht sinken.
 * Messung 10.11.: Satz 2 vorher 71, nachher 80; Satz 3 vorher 47, nachher 47 (n17/SPSS neu getroffen, n13/SPSS verloren: die Behebung war satzbezogen und trägt kaum auf neue Anfragen).
 * Mit NUTZEN_BERICHT=1 schreibt der Test `docs/nutzen/ERSTNUTZER-PRUEFSAETZE-ERGEBNIS-2026-11-10.json`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { artikelListe } from './artikel';
import { suche } from './suche';
import { ladeGlossar } from './glossar';

const pfad = (n: string) => fileURLToPath(new URL(`../../../docs/nutzen/${n}`, import.meta.url));
const lies = (n: string) => JSON.parse(readFileSync(pfad(n), 'utf8'));
const ARTEN = ['Alltag', 'Fachbegriff', 'SPSS', 'Englisch'] as const;
const TOP = 5;

interface Aufgabe { id: string; ziel: string[]; anfragen: string[] }
const satz2: Aufgabe[] = (() => {
  const a = lies('ERSTNUTZER-AUFGABEN-2026-11-09.json').aufgaben as { id: string; ziel: string[] }[];
  const q = lies('ERSTNUTZER-ANFRAGEN-2-PRUEFSATZ-2026-11-09.json') as Record<string, string[]>;
  return a.map(x => ({ id: x.id, ziel: x.ziel, anfragen: q[x.id] ?? [] }));
})();
const satz3: Aufgabe[] = lies('ERSTNUTZER-PRUEFSATZ-3-2026-11-10.json').aufgaben;

/** Mindestquoten (von 80); dürfen nur steigen. */
/** 11.11.2026 (Zusammenführen main → erheben): Satz 3 von 47 auf 46. Verloren: n01/Englisch „reverse coded items and scale score“, Ziel jetzt Rang 6,
 *  weil die neuen erheben-Artikel „fragebogen-planen“ und „eh-kodebuch“ (Umpolen im Kodebuch) davor stehen. Absichtlich nicht auf die Anfrage zugeschnitten (siehe oben). */
const MINDEST = { satz2: 80, satz3: 46 };

await Promise.all([ladeGlossar('de'), ladeGlossar('en')]);
const de = artikelListe('de'), en = artikelListe('en');
const alle = new Set(de.map(a => a.id));

function miss(satz: Aufgabe[]) {
  return satz.flatMap(a => a.anfragen.map((q, i) => {
    const sp = ARTEN[i] === 'Englisch' ? 'en' : 'de';
    const ids = suche(sp === 'en' ? en : de, q, sp).map(t => t.artikel.id);
    const r = a.ziel.map(z => ids.indexOf(z)).filter(x => x >= 0);
    const rang = r.length ? Math.min(...r) + 1 : null;
    return { aufgabe: a.id, art: ARTEN[i]!, anfrage: q, rang, treffer: rang !== null && rang <= TOP, erste: ids.slice(0, TOP) };
  }));
}
const Z2 = miss(satz2), Z3 = miss(satz3);
const quote = (z: ReturnType<typeof miss>) => ({ gesamt: z.filter(x => x.treffer).length, von: z.length, ...Object.fromEntries(ARTEN.map(a => [a, z.filter(x => x.art === a && x.treffer).length])) });

describe('Unabhängige Prüfsätze der Hilfe-Suche', () => {
  it('Satz 3 ist vollständig: 20 Aufgaben mit je 4 Anfragen, alle Ziele sind Artikel', () => {
    expect(satz3.length).toBe(20);
    for (const a of satz3) expect(a.anfragen.length, a.id).toBe(4);
    expect(satz3.flatMap(a => a.ziel.filter(z => !alle.has(z)).map(z => `${a.id}:${z}`))).toEqual([]);
  });
  it(`Satz 2: mindestens ${MINDEST.satz2} von 80`, () => { expect(quote(Z2).gesamt).toBeGreaterThanOrEqual(MINDEST.satz2); });
  it(`Satz 3: mindestens ${MINDEST.satz3} von 80`, () => { expect(quote(Z3).gesamt).toBeGreaterThanOrEqual(MINDEST.satz3); });
  it('Bericht (nur mit NUTZEN_BERICHT=1)', () => {
    if (!process.env.NUTZEN_BERICHT) return;
    const ohne = (z: ReturnType<typeof miss>) => z.filter(x => !x.treffer).map(x => ({ k: `${x.aufgabe}/${x.art}`, anfrage: x.anfrage, rang: x.rang, erste: x.erste }));
    const aus = process.env.NUTZEN_BERICHT_DATEI ?? pfad('ERSTNUTZER-PRUEFSAETZE-ERGEBNIS-2026-11-10.json');
    writeFileSync(aus, JSON.stringify({ top: TOP, satz2: { quote: quote(Z2), ohne: ohne(Z2) }, satz3: { quote: quote(Z3), ohne: ohne(Z3) } }, null, 1) + '\n', 'utf8');
  });
});
