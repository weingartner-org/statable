/**
 * PSPP-Wörterbücher je Sprache (Bauplan Sprachen, 0.5): die Engine liefert Tabellentitel und Köpfe auf Englisch.
 * Jede Sprache außer Englisch kann ein Wörterbuch `output/<code>-dict.json` haben (Schlüssel = englischer PSPP-Text, Wert = Übersetzung;
 * Platzhalter %s, %zu, %g wie in PSPPs .po-Dateien). Es ist ein eigener Baustein und wird erst beim Bedarf geladen (wie bisher de-dict.json).
 * Fehlt die Datei oder ein Eintrag, bleibt das englische Original stehen. Englisch hat kein Wörterbuch.
 * Erzeugt wird die Datei aus PSPPs Übersetzung (`node scripts/po-to-json.mjs <code>`, Quelle data/<code>.po) oder von Hand nach
 * `i18n/pspp-vorlage.json` (die rund 120 Texte, die in Tabellen wirklich vorkommen; `node i18n/pspp-vorlage.mjs`).
 */
import type { Sprache } from '../i18n/laufzeit';
import { translate, ERGAENZUNG_DE, type Dict } from './format-de';

const lader = import.meta.glob<Dict>('./*-dict.json', { import: 'default' });
const datei = (sp: Sprache) => `./${sp}-dict.json`;

const KEINS: Dict = Object.freeze({});
const cache: Partial<Record<Sprache, Dict>> = {};
const laeuft = new Map<Sprache, Promise<Dict>>();
/** Zu welcher Sprache ein geladenes Wörterbuch gehört (damit die Tabelle ein veraltetes Wörterbuch nach einem Sprachwechsel nicht benutzt). */
const SPRACHE_VON = new WeakMap<Dict, Sprache>();
/** Zählt mit, wenn ein Wörterbuch fertig geladen ist - so zeichnet eine Tabelle, die es gerade anfordert, sich danach neu. */
const stand = $state({ n: 0 });

/** Gibt es für diese Sprache ein Wörterbuch (Datei vorhanden)? */
// Sprache: Englisch ist das Original der Engine, ohne Wörterbuch.
export const hatWoerterbuch = (sp: Sprache) => sp !== 'en' && datei(sp) in lader;
/** Zu welcher Sprache gehört dieses (geladene) Wörterbuch? `undefined`: unbekannt (z. B. von Hand übergeben). */
export const woerterbuchSprache = (d: Dict): Sprache | undefined => SPRACHE_VON.get(d);

/** Lädt das Wörterbuch (einmal). Ohne Datei, und für Englisch: ein leeres - dann bleibt das Original stehen. */
export function ladeWoerterbuch(sp: Sprache): Promise<Dict> {
  const fertig = cache[sp];
  if (fertig) return Promise.resolve(fertig);
  let p = laeuft.get(sp);
  if (!p) {
    const f = sp === 'en' ? undefined : lader[datei(sp)];
    p = (f ? f() : Promise.resolve(KEINS)).then(d => {
      const eigenes: Dict = d === KEINS ? Object.freeze({}) : d;
      SPRACHE_VON.set(eigenes, sp); cache[sp] = eigenes; stand.n++;
      return eigenes;
    }, () => { laeuft.delete(sp); return KEINS; });
    laeuft.set(sp, p);
  }
  return p;
}

/**
 * Das Wörterbuch der Sprache, wenn es schon geladen ist; sonst `null` - und das Laden beginnt (eine Tabelle zeichnet sich danach neu, weil sie
 * `stand` gelesen hat). Für Englisch: immer `null`.
 */
export function woerterbuch(sp: Sprache): Dict | null {
  void stand.n;
  if (sp === 'en') return null;
  const d = cache[sp];
  if (d) return d;
  void ladeWoerterbuch(sp);
  return null;
}

/** Ein PSPP-Text (Tabellentitel, Meldung …) in der Sprache; ohne Wörterbuch oder Eintrag das Original. */
export function psppText(text: string, sp: Sprache): string {
  const d = woerterbuch(sp);
  return d ? translate(text, d, sp === 'de' ? ERGAENZUNG_DE : KEINS) : text;
}
