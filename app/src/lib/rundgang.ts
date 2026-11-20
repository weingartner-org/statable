/**
 * Rundgang beim ersten Start (Usability Stufe 3): welche Stationen es gibt, wann er erscheint, wann die Seitenleiste eingeklappt startet.
 * Reine Funktionen ohne Browser und ohne Sitzung, damit sie testbar sind (`rundgang.test.ts`). Die Texte stehen in `bausteine/Rundgang.svelte`.
 */
export type StationId = 'weise' | 'fach' | 'daten' | 'check' | 'neu' | 'bericht';

/** Weg „Schritt für Schritt“: sechs Stationen. Weg „Ich kenne mich aus“: drei (Weise, Fach, Daten-Check). */
export const stationen = (profi: boolean): StationId[] => (profi ? ['weise', 'fach', 'check'] : ['weise', 'fach', 'daten', 'check', 'neu', 'bericht']);

/** Die Einstellungen, die der Rundgang liest. */
export interface RundgangEinst { rundgang: boolean; profi: boolean; rundgangErneut?: boolean }

/**
 * Soll der Rundgang erscheinen? Neue Leute (profi aus): ja, solange `rundgang` gilt. Profis: nein - außer nach „Wieder zeigen“ (`rundgangErneut`)
 * oder solange er schon offen ist (`offen`): wer im Rundgang selbst „Ich kenne mich aus“ wählt, soll ihn zu Ende sehen.
 */
export const rundgangSichtbar = (e: RundgangEinst, offen: boolean): boolean => e.rundgang && (!e.profi || !!e.rundgangErneut || offen);

/** Die Seitenleiste startet bei „Ich kenne mich aus“ eingeklappt (sonst ausgeklappt). */
export const randEngBeiStart = (profi: boolean): boolean => profi;

/**
 * Anzahl der Hinweise im Daten-Check: offene Funde (ohne die schon erledigten oder bewusst gelassenen) plus Lesehinweise.
 * `schluessel` ist `fundSchluessel` aus datencheck.ts (hier übergeben, damit diese Datei keine Sitzung einbindet).
 */
export const pruefAnzahl = <F>(funde: readonly F[], entscheid: Record<string, unknown>, lesehinweise: number, schluessel: (f: F) => string): number =>
  funde.filter(f => !entscheid[schluessel(f)]).length + lesehinweise;
