import { ladeSprache, type Sprache } from '../i18n/laufzeit';
import { ladeTexte } from '../lib/texte';
import { ladeGlossar } from './glossar';

/** Die Artikel der Hilfe erst bei Bedarf laden (eigener Baustein, rund 200 KB): Hilfe-Seite, Suche, Tipps am Rand. Jeder Aufruf bekommt dasselbe Modul. */
let modul: Promise<typeof import('./artikel')> | undefined;
/**
 * Das Modul mit den Artikeln. In einer fremden Sprache `sp` wartet es außerdem auf die Hilfe-Übersetzungen (`sprachen/<code>.hilfe.json`), die
 * Erklärtexte (`messages.<code>.json`) und das Glossar (`glossar/<code>.json`) - erst danach darf `artikelListe(sp)` aufgerufen werden.
 */
export function artikelModul(sp: Sprache = 'de') {
  // Schlägt das Laden fehl (kein Netz, erster Besuch), beim nächsten Mal neu versuchen.
  const m = (modul ??= import('./artikel').catch(e => { modul = undefined; throw e; }));
  return Promise.all([m, ladeSprache(sp, 'hilfe'), ladeTexte(sp), ladeGlossar(sp)]).then(([x]) => x);
}
