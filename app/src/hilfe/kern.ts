/**
 * Kleiner Kern der Hilfe: Typen, Bereichsliste, Artikeltext. Liegt im Startpaket; die Artikel selbst (`artikel.ts`, rund 200 KB) werden erst
 * geladen, wenn Hilfe, Suche oder ein Tipp am Rand sie braucht (`artikel-laden.ts`).
 */
import { P, type Paar } from '../i18n/laufzeit';

export type Bereich = 'start' | 'daten' | 'fragen' | 'lesen' | 'bericht' | 'verstehen' | 'befehle' | 'begriffe' | 'ueber';
/**
 * Absatz (Text) oder ein Sonderblock: Zwischenüberschrift, Aufzählung, Schritte, Befehl, Beispielzeile für die Arbeit, Tabelle.
 * Zwei Didaktik-Bausteine (Field-Stufe 3, 05.11.2026): `falsch` („Stimmt nicht - so ist es“: eine Fehlvorstellung und ihre Richtigstellung) und
 * `mitnehmen` („Zum Mitnehmen“: drei bis fünf Merksätze am Ende). Die Beschriftungen stehen schon in der Sprache des Artikels im Block (Hilfe-App und feste Webseiten setzen sie gleich).
 */
export type Block = string | { h: string } | { ul: string[] } | { ol: string[] } | { code: string } | { apa: string } | { tabelle: { kopf: string[]; zeilen: string[][] } }
  | { falsch: { kopf: string; nein: string; mythos: string; ja: string; richtig: string } } | { mitnehmen: { kopf: string; punkte: string[] } };
export interface Artikel { id: string; bereich: Bereich; titel: string; stichwoerter: string[]; inhalt: Block[]; verwandt: string[]; /** Zwischenüberschriften, deren Abschnitt in der Hilfe offen bleibt; alle anderen klappen ein (30.10.2026). Fehlt: nichts klappt ein. */ offen?: string[] }

export const BEREICHE: { id: Bereich; name: Paar; kurz: Paar }[] = [
  { id: 'start', name: P('Erste Schritte', 'Getting started'), kurz: P('So fängt man an, Datenschutz, Projekt speichern', 'How to start, privacy, saving a project') },
  { id: 'daten', name: P('Daten', 'Data'), kurz: P('Öffnen, Spalten beschreiben, Daten-Check', 'Opening, describing columns, data check') },
  { id: 'fragen', name: P('Auswertungen', 'Running analyses'), kurz: P('Welche Frageart passt, was sie voraussetzt', 'Which question type fits and what it requires') },
  { id: 'lesen', name: P('Ergebnisse lesen', 'Reading results'), kurz: P('Ergebnissatz, Hinweise, Zeile für die Arbeit', 'Result sentence, notes, line for the paper') },
  { id: 'bericht', name: P('Bericht und Export', 'Report and export'), kurz: P('Bericht, Word, PDF, Excel', 'Report, Word, PDF, Excel') },
  { id: 'verstehen', name: P('Verstehen', 'Understand'), kurz: P('Verteilungen, Intervalle, Tests und Zufall ohne eigene Daten', 'Distributions, intervals, tests and chance without data of your own') },
  { id: 'befehle', name: P('Befehle (Syntax)', 'Commands (syntax)'), kurz: P('.sps-Dateien und eigene Befehle', '.sps files and your own commands') },
  { id: 'begriffe', name: P('Begriffe A-Z', 'Terms A-Z'), kurz: P('Fachbegriffe kurz erklärt', 'Technical terms explained') },
  { id: 'ueber', name: P('Über Statable', 'About Statable'), kurz: P('Funktionen, Zahlen, Technik, Lizenz', 'Functions, figures, technology, license') }
];

/** Text eines Artikels als eine Zeichenkette (für die Suche). */
export function artikelText(a: Artikel): string {
  return a.inhalt.map(b => (typeof b === 'string' ? b : 'h' in b ? b.h : 'ul' in b ? b.ul.join(' ') : 'ol' in b ? b.ol.join(' ') : 'code' in b ? b.code : 'apa' in b ? b.apa : 'falsch' in b ? `${b.falsch.mythos} ${b.falsch.richtig}` : 'mitnehmen' in b ? b.mitnehmen.punkte.join(' ') : b.tabelle.zeilen.flat().join(' '))).join(' ');
}

