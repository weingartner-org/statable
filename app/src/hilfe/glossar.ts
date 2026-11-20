/**
 * Das große Glossar der Begriffe A-Z (Johannes 31.10.2026: ein ganzes Statistik-Lehrbuch, alle Fachbegriffe und Fremdwörter). Rund zehnmal so viel Text wie `erklaer`,
 * darum eigene Dateien, die erst mit der Hilfe laden: `glossar/<sprache>.json`. Englisch ist die Grundlage, jede Sprache überschreibt Feld für Feld. Regeln: docs/fachblaetter/GLOSSAR.md.
 */
import type { Sprache } from '../i18n/laufzeit';

export interface GlossarEintrag { titel: string; kurz: string; beispiel?: string; vorsicht?: string; fachwoerter?: string; /** Wo es in Statable steht (Field-Stufe 1 und 2); fehlt bei den meisten Begriffen. */ statable?: string; /** Andere Namen und Zeichen, nur für die Suche. */ sw?: string[]; /** Verwandte Einträge (Ids). */ siehe?: string[] }
type Datei = Record<string, Partial<GlossarEintrag>>;

const lader = import.meta.glob<Datei>('./glossar/*.json', { import: 'default' });
const geladen: Partial<Record<string, Datei>> = {};

/** Lädt die Sprache und die englische Grundlage. Schlägt das Laden fehl, fehlt nur das große Glossar; die Hilfe läuft weiter. */
export async function ladeGlossar(sp: Sprache): Promise<void> {
  await Promise.all(['en', sp].map(async c => { const f = lader[`./glossar/${c}.json`]; if (f && !geladen[c]) geladen[c] = await f().catch(() => undefined); }));
}
const gemischt = (id: string, sp: Sprache): GlossarEintrag | undefined => {
  const basis = geladen.en?.[id], eigen = geladen[sp]?.[id];
  return basis || eigen ? { ...basis, ...eigen } as GlossarEintrag : undefined;
};
export const glossarEintrag = gemischt;
export const glossarListe = (sp: Sprache): [string, GlossarEintrag][] => [...new Set([...Object.keys(geladen.en ?? {}), ...Object.keys(geladen[sp] ?? {})])].map(id => [id, gemischt(id, sp)!]);
/** Hat diese Sprache den Eintrag selbst? Fehlt er, zeigt die App Englisch, aber die festen Webseiten lassen ihn aus (sonst stünde englischer Text unter einer fremden Sprachadresse). */
export const glossarNurEnglisch = (id: string, sp: Sprache) => !!geladen.en?.[id] && !geladen[sp]?.[id];
