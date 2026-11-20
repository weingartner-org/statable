/**
 * Integration der Daten (Mixed Methods) auf Projektebene: vier freie Texte, die der Mensch schreibt (Fetters, Curry & Creswell 2013).
 * Statable gibt nur die Fragen vor und trägt die Antworten in Projektdatei und Word-Bericht ein; es bewertet nichts.
 */
import { L } from './sitzung.svelte';

export interface Integration { warum?: string; wo?: string; gelernt?: string; widersprueche?: string }
export type IntegrationFeld = keyof Integration;
export const INTEGRATION_FELDER: readonly IntegrationFeld[] = ['warum', 'wo', 'gelernt', 'widersprueche'];
/** Höchstens so viele Zeichen je Feld beim Lesen einer Projektdatei. */
export const INTEGRATION_MAX = 10000;

/** Die vier Fragen (Wortlaut aus dem Fachblatt, Fachbegriff in Klammern immer sichtbar). */
export const integrationFrage = (f: IntegrationFeld): string => ({
  warum: L('Warum verbinde ich Zahlen und Texte? (Begründung für Mixed Methods)', 'Why do I combine numbers and texts? (rationale for mixed methods)'),
  wo: L('Wo kommen die Daten zusammen? (Integrationspunkt)', 'Where do the data come together? (point of integration)'),
  gelernt: L('Was habe ich aus beiden zusammen gelernt? (Meta-Inferenz)', 'What did I learn from both together? (meta-inference)'),
  widersprueche: L('Wo widersprechen sich die Ergebnisse, und wie gehe ich damit um? (Widerspruch)', 'Where do the results contradict each other, and how do I deal with it? (discordance)')
})[f];

/** Mindestens ein Feld hat Text. */
export const integrationAusgefuellt = (i: Integration | undefined | null): boolean => !!i && INTEGRATION_FELDER.some(f => typeof i[f] === 'string' && i[f]!.trim() !== '');

/** Aus einer Projektdatei gelesen: nur Texte, je höchstens 10.000 Zeichen (längere werden gekürzt), leere Felder fallen weg; nichts Brauchbares = undefined. */
export function leseIntegration(x: unknown): Integration | undefined {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return undefined;
  const o = x as Record<string, unknown>, r: Integration = {};
  for (const f of INTEGRATION_FELDER) { const v = o[f]; if (typeof v === 'string' && v.trim() !== '') r[f] = v.slice(0, INTEGRATION_MAX); }
  return Object.keys(r).length ? r : undefined;
}
