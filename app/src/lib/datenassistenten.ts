/** Die zwölf Daten-Assistenten (Welle 5 und Später S-C) mit Namen und Symbol - für das Menü „Daten bearbeiten“ auf der Daten-Seite und die Reiter der Seite #bearbeiten. */
import { L } from './sitzung.svelte';

export interface AssistentInfo { id: string; icon: string; name: () => string }
/** Gruppen im Menü „Daten bearbeiten“ (Reihenfolge = Reihenfolge im Menü). */
export type AssistentGruppe = 'werte' | 'faelle' | 'tabelle' | 'fach';
export const ASSISTENT_GRUPPEN: { id: AssistentGruppe; name: () => string; ids: string[] }[] = [
  { id: 'werte', name: () => L('Werte ändern', 'Change values'), ids: ['umkodieren', 'berechnen', 'zaehlen', 'fehlendcodes', 'rang', 'datum', 'winsor', 'klassifikation'] },
  { id: 'faelle', name: () => L('Fälle (Zeilen) wählen und prüfen', 'Choose and check cases (rows)'), ids: ['auswahl', 'sortieren', 'doppelte', 'auffaellig', 'plausibel'] },
  { id: 'tabelle', name: () => L('Tabelle umbauen', 'Rebuild the table'), ids: ['zusammen', 'aggregieren', 'vergleichen', 'eigenschaften'] },
  { id: 'fach', name: () => L('Für bestimmte Fächer', 'For specific fields'), ids: ['zeitreihe', 'index', 'abgleich', 'mikrodaten'] }
];
export const ASSISTENTEN: AssistentInfo[] = [
  { id: 'umkodieren', icon: 'umkodieren', name: () => L('Umkodieren', 'Recode') },
  { id: 'berechnen', icon: 'rechnen', name: () => L('Berechnen', 'Calculate') },
  { id: 'auswahl', icon: 'auswahl', name: () => L('Fälle auswählen', 'Select cases') },
  { id: 'zusammen', icon: 'verbinden', name: () => L('Zusammenführen', 'Merge') },
  { id: 'aggregieren', icon: 'aggregat', name: () => L('Aggregieren', 'Aggregate') },
  { id: 'doppelte', icon: 'doppelt', name: () => L('Doppelte Fälle', 'Duplicate cases') },
  // Später S-C
  { id: 'zaehlen', icon: 'plus', name: () => L('Zählen', 'Count') },
  { id: 'fehlendcodes', icon: 'hinweis', name: () => L('Fehlendcodes setzen', 'Set missing codes') },
  { id: 'sortieren', icon: 'runter', name: () => L('Sortieren', 'Sort') },
  { id: 'rang', icon: 'streifen', name: () => L('Ränge bilden', 'Compute ranks') },
  { id: 'datum', icon: 'uhr', name: () => L('Datum und Zeit', 'Date and time') },
  { id: 'auffaellig', icon: 'auge', name: () => L('Auffällige Fälle', 'Conspicuous cases') },
  // Später S-F2
  { id: 'eigenschaften', icon: 'kopieren', name: () => L('Eigenschaften übernehmen', 'Copy data properties') },
  { id: 'vergleichen', icon: 'uebereinstimmung', name: () => L('Datensätze vergleichen', 'Compare datasets') },
  { id: 'zeitreihe', icon: 'zeitreihe', name: () => L('Verschieben und glätten', 'Shift and smooth') },
  // Abschnitt 3: Indexzahlen
  { id: 'index', icon: 'skala', name: () => L('Indexzahlen', 'Index numbers') },
  // Field-Stufe 3b: Winsorisieren
  { id: 'winsor', icon: 'auswahl', name: () => L('Winsorisieren', 'Winsorizing') },
  // Abschnitt 6: Fälle und Kontrollen abgleichen
  { id: 'abgleich', icon: 'gruppen', name: () => L('Fälle und Kontrollen abgleichen', 'Match cases and controls') },
  // Abschnitt 3 und 4: Klassifikation, Plausibilität
  { id: 'klassifikation', icon: 'ebenen', name: () => L('Klassifikation zuordnen', 'Assign a classification') },
  { id: 'plausibel', icon: 'haken', name: () => L('Plausibilität prüfen', 'Check plausibility') },
  // Mikrodaten (M5b)
  { id: 'mikrodaten', icon: 'schloss', name: () => L('Mikrodaten schützen', 'Protect microdata') }
];
