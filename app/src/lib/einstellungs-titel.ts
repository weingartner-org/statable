/**
 * Stufe 9 („Eine Suche“): Titel, Gruppe und Sprungziel der Einstellungen an EINER Stelle.
 * `seiten/Einstellungen.svelte` (Überschrift der Seitenleiste) und die Befehlspalette (Treffer je Einstellung) lesen beide von hier - nichts doppelt abgeschrieben.
 * Die Gruppen stehen in derselben Reihenfolge wie die Sprungleiste der Seite (`ez-allg` …).
 */
import { L } from './sitzung.svelte';

export type EinstellungId = 'zahl' | 'null' | 'fach' | 'anrede' | 'tabellen' | 'kit' | 'kurs' | 'deutung' | 'bezuege' | 'sofort' | 'bayes' | 'profi' | 'rundgang' | 'kurzekoepfe' | 'wordbild';

/** Die Titel aller Einstellungen der Seite in der aktuellen Sprache. */
export const einstellungsTitel = (): Record<EinstellungId, string> => ({
  zahl: L('Zahlen', 'Numbers'),
  null: L('Null vor dem Komma', 'Leading zero'),
  fach: L('Mein Fachgebiet', 'My field of study'),
  anrede: 'Anrede',
  tabellen: L('Tabellen', 'Tables'),
  kit: L('Bereich beim t-Test', 'Interval in the t test'),
  kurs: L('Kursmodus', 'Course mode'),
  kurzekoepfe: L('Kurze Spaltenköpfe', 'Short column headers'),
  wordbild: L('Bildbeschreibungen im Text', 'Image descriptions in the text'),
  deutung: L('Übungsmodus', 'Practice mode'),
  bezuege: L('Vergleich mit anderen Programmen', 'Comparison with other programs'),
  sofort: L('Sofort rechnen', 'Calculate instantly'),
  bayes: L('Bayes-Faktoren', 'Bayes factors'),
  profi: L('Ich kenne mich aus', 'I know my way around'),
  rundgang: L('Rundgang', 'Tour'),
});

/** Die Gruppen der Seite: Überschrift-Id (`tabindex=-1`), Name und die Einstellungen darin (mit der Element-Id des Bedienelements, wo es eine gibt). */
export const einstellungsGruppen = (): { id: string; name: string; zeilen: { id: EinstellungId; feld?: string }[] }[] => [
  { id: 'ez-allg', name: L('Allgemein', 'General'), zeilen: [{ id: 'anrede' }, { id: 'fach', feld: 'ez-fach' }] },
  { id: 'ez-darst', name: L('Darstellung', 'Display'), zeilen: [{ id: 'zahl', feld: 'ez-zahl' }, { id: 'null', feld: 'ez-null' }, { id: 'tabellen', feld: 'ez-tabellen' }] },
  { id: 'ez-erg', name: L('Ergebnisse', 'Results'), zeilen: [{ id: 'sofort' }, { id: 'kit', feld: 'ez-kit' }, { id: 'kurs', feld: 'ez-kurs' }, { id: 'kurzekoepfe' }, { id: 'wordbild' }, { id: 'deutung', feld: 'ez-deutung' }, { id: 'bezuege' }, { id: 'bayes' }] },
  { id: 'ez-ein', name: L('Einstieg', 'Getting started'), zeilen: [{ id: 'profi' }, { id: 'rundgang' }] },
  { id: 'ez-offline', name: L('Ohne Netz', 'Without internet'), zeilen: [] },
];
