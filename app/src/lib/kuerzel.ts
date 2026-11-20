/**
 * Tastenkürzel als EINE Quelle (Barrierefreiheit Welle 2, Auftrag A; Plan Abschnitt 5).
 * - `KUERZEL` ist die Liste, aus der der Dialog (Alt+T), die Befehlspalette, `aria-keyshortcuts` und die Hinweise lesen.
 * - `behandle(e)` ist der EINE globale Handler für die neuen Kürzel (aus `App.svelte` aufgerufen). Zwei Wächter: nicht im Eingabefeld,
 *   nicht bei offenem modalem Fenster; Strg+K gilt auch im Eingabefeld.
 * - Bestehende Kürzel mit eigenem Empfänger (Strg+S, Strg+Z, Alt+Umschalt+P ...) stehen mit `extern` (Datei, in der der Handler sitzt) in der Liste;
 *   `kuerzel.test.ts` prüft per Quelltext-Suche, dass der Empfänger dort wirklich steht.
 * - Regeln: keine blanke Einzeltaste global (WCAG 2.1.4); Alt nur über Tastenort/Buchstabe (`passt`), nie nur über `e.key`:
 *   Auf QWERTZ meldet die Z-Taste `code` KeyY, aber `key` "z"; auf dem Mac erzeugt Wahl+Taste ein Sonderzeichen.
 */
import { zeilenStand, zeilenSatz } from './zeilenstand';
import { L, s } from './sitzung.svelte';
import { sage } from './ansage';
import { fokusAuf } from './fokus';
import { zurueck } from './navi';
import { oeffnePalette } from './palette.svelte';
import { begriffe, zurueckBegriff } from './begriffsrand.svelte';

export type Modifikator = 'keine' | 'umschalt' | 'alt' | 'strg' | 'strg+umschalt' | 'alt+umschalt';
export type BereichId = 'allgemein' | 'reiter' | 'bearbeiten' | 'ueben' | 'interviews';

export interface Kuerzel {
  id: string;
  mod: Modifikator;
  /** Tastenorte (`e.code`): `KeyK`, `Digit1`, `PageDown`, `Escape`, `Enter`, `Slash`, `ArrowUp` ... Mehrere = eine Zeile für mehrere Tasten (Alt+1 bis Alt+9). */
  tasten: string[];
  /** Dieselbe Taste wie der Eintrag mit dieser id, aber an einem Ort, der sich mit ihm nie überschneidet (z. B. Strg+Eingabe im Befehlsfeld und in der Eingabemaske). */
  teilt?: string;
  /** Anzeige in der Windows-Schreibweise, z. B. „Alt+T“ (auf dem Mac wird Alt zu Wahl). */
  anzeige: string;
  bereich: BereichId;
  text: () => string;
  wirkung: () => string;
  /** Gilt nicht überall: in welchem Teil. */
  gilt?: () => string;
  /** Den Handler besitzt eine andere Datei (relativ zu `app/src`); `marke` ist ein Textstück, das dort stehen muss. */
  extern?: { datei: string; marke: string };
}

export const BEREICHE: { id: BereichId; text: () => string }[] = [
  { id: 'allgemein', text: () => L('Überall', 'Everywhere') },
  { id: 'reiter', text: () => L('Reiter und Seiten', 'Tabs and pages') },
  { id: 'bearbeiten', text: () => L('Bearbeiten und Speichern', 'Editing and saving') },
  { id: 'ueben', text: () => L('Üben und Befehle', 'Practice and commands') },
  { id: 'interviews', text: () => L('Interviews: Aufnahme abspielen', 'Interviews: play the recording') },
];

const ZIFFERN = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'];

export const KUERZEL: Kuerzel[] = [
  { id: 'palette', mod: 'strg', tasten: ['KeyK'], anzeige: 'Strg+K', bereich: 'allgemein', text: () => L('Befehlspalette öffnen', 'Open the command palette'), wirkung: () => L('Sucht und startet jede Auswertung, Seite, Einstellung und Hilfe.', 'Finds and starts any analysis, page, setting and help article.') },
  { id: 'liste', mod: 'alt', tasten: ['KeyT'], anzeige: 'Alt+T', bereich: 'allgemein', text: () => L('Tastenkürzel anzeigen', 'Show keyboard shortcuts'), wirkung: () => L('Öffnet diese Liste.', 'Opens this list.') },
  { id: 'wo', mod: 'alt', tasten: ['KeyW'], anzeige: 'Alt+W', bereich: 'allgemein', text: () => L('Wo bin ich?', 'Where am I?'), wirkung: () => L('Sagt an: Reiter, Bereich, Element und in Tabellen Zeile und Spalte mit Kopfzelle.', 'Announces the tab, the area, the element and, in tables, row and column with their header.') },
  { id: 'zurueck', mod: 'alt', tasten: ['KeyZ'], anzeige: 'Alt+Z', bereich: 'allgemein', text: () => L('Zurück zum Fachwort', 'Back to the term'), wirkung: () => L('Geht in der Erklärung eine Ebene zurück, am Ende zum Fachwort im Text.', 'Goes back one level in the explanation, at the end to the term in the text.') },
  { id: 'bereiche', mod: 'alt', tasten: ['KeyJ'], anzeige: 'Alt+J', bereich: 'allgemein', text: () => L('Zum nächsten Bereich springen', 'Jump to the next area'), wirkung: () => L('Springt der Reihe nach zu Kopf, Reitern, Inhalt und Seitenleiste.', 'Jumps in turn to the header, the tabs, the content and the side panel.') },
  { id: 'hilfe', mod: 'alt', tasten: ['KeyH'], anzeige: 'Alt+H', bereich: 'allgemein', text: () => L('Hilfe öffnen oder schließen', 'Open or close help'), wirkung: () => L('Öffnet die Hilfe; noch einmal drücken führt zurück.', 'Opens the help; pressing again goes back.') },
  { id: 'lernen', mod: 'alt', tasten: ['KeyL'], anzeige: 'Alt+L', bereich: 'allgemein', text: () => L('Lernen öffnen oder schließen', 'Open or close Learning'), wirkung: () => L('Öffnet den Bereich Lernen; noch einmal drücken führt zurück.', 'Opens the Learning area; pressing again goes back.') },
  { id: 'einstellungen', mod: 'alt', tasten: ['KeyO'], anzeige: 'Alt+O', bereich: 'allgemein', text: () => L('Einstellungen öffnen oder schließen', 'Open or close settings'), wirkung: () => L('Öffnet die Einstellungen; noch einmal drücken führt zurück.', 'Opens the settings; pressing again goes back.') },
  { id: 'farben', mod: 'alt', tasten: ['KeyK'], anzeige: 'Alt+K', bereich: 'allgemein', text: () => L('Farben und Kontrast wählen', 'Choose colors and contrast'), wirkung: () => L('Öffnet die Farbwahl im Kopf.', 'Opens the color choice in the header.') },
  { id: 'meldungen', mod: 'alt', tasten: ['KeyM'], anzeige: 'Alt+M', bereich: 'allgemein', text: () => L('Letzte Meldungen lesen', 'Read the latest messages'), wirkung: () => L('Öffnet die Liste der letzten Meldungen, auch wenn sie schon verschwunden sind; jede Meldung mit „Rückgängig“ sagt, dass es auch mit Strg+Z geht.', 'Opens the list of the latest messages, even after they have disappeared; every message with "Undo" says that Ctrl+Z works too.') },
  { id: 'esc', mod: 'keine', tasten: ['Escape'], anzeige: 'Esc', bereich: 'allgemein', text: () => L('Schließen', 'Close'), wirkung: () => L('Schließt das oberste Fenster, Menü oder die jüngste Meldung und gibt den Fokus zurück.', 'Closes the topmost window, menu or the latest message and returns the focus.'), gilt: () => L('In Fenstern, Menüs und Meldungen', 'In windows, menus and messages'), extern: { datei: 'App.svelte', marke: "e.key === 'Escape'" } },

  { id: 'reiter-ziffer', mod: 'alt', tasten: ZIFFERN, anzeige: 'Alt+1 bis Alt+9', bereich: 'reiter', text: () => L('Reiter 1 bis 9 öffnen', 'Open tab 1 to 9'), wirkung: () => L('Reiter 1 ist Daten, dann die Auswertungen, Neue Auswertung, Bericht, Befehle, Protokoll.', 'Tab 1 is Data, then the analyses, New analysis, Report, Commands, Log.') },
  { id: 'reiter-weiter', mod: 'alt', tasten: ['PageDown'], anzeige: 'Alt+Bild ab', bereich: 'reiter', text: () => L('Nächster Reiter', 'Next tab'), wirkung: () => L('Wechselt zum nächsten Reiter, am Ende zum ersten.', 'Switches to the next tab, from the last to the first.') },
  { id: 'reiter-zurueck', mod: 'alt', tasten: ['PageUp'], anzeige: 'Alt+Bild auf', bereich: 'reiter', text: () => L('Voriger Reiter', 'Previous tab'), wirkung: () => L('Wechselt zum vorigen Reiter, am Anfang zum letzten.', 'Switches to the previous tab, from the first to the last.') },
  { id: 'neu', mod: 'alt', tasten: ['KeyN'], anzeige: 'Alt+N', bereich: 'reiter', text: () => L('Neue Auswertung', 'New analysis'), wirkung: () => L('Öffnet den Reiter Neue Auswertung.', 'Opens the New analysis tab.') },
  { id: 'bericht', mod: 'alt', tasten: ['KeyB'], anzeige: 'Alt+B', bereich: 'reiter', text: () => L('Bericht', 'Report'), wirkung: () => L('Öffnet den Bericht.', 'Opens the report.') },

  { id: 'speichern', mod: 'strg', tasten: ['KeyS'], anzeige: 'Strg+S', bereich: 'bearbeiten', text: () => L('Projekt als Datei speichern', 'Save the project as a file'), wirkung: () => L('Speichert das Projekt in eine Datei (statt die Webseite).', 'Saves the project to a file (instead of the web page).'), extern: { datei: 'App.svelte', marke: 'projektSpeichern' } },
  { id: 'speichern-unter', mod: 'strg+umschalt', tasten: ['KeyS'], anzeige: 'Strg+Umschalt+S', bereich: 'bearbeiten', text: () => L('Speichern unter', 'Save as'), wirkung: () => L('Speichert das Projekt unter neuem Namen und an neuem Ort.', 'Saves the project under a new name and in a new place.'), extern: { datei: 'App.svelte', marke: 'unter: e.shiftKey' } },
  { id: 'rueckgaengig', mod: 'strg', tasten: ['KeyZ'], anzeige: 'Strg+Z', bereich: 'bearbeiten', text: () => L('Rückgängig', 'Undo'), wirkung: () => L('Nimmt die letzte Änderung an den Daten zurück (im Textfeld den Text).', 'Undoes the last change to the data (in a text field the text).'), extern: { datei: 'App.svelte', marke: 'rueckgaengig()' } },
  { id: 'wiederholen', mod: 'strg', tasten: ['KeyY'], anzeige: 'Strg+Y', bereich: 'bearbeiten', text: () => L('Wiederholen', 'Redo'), wirkung: () => L('Holt zurück, was eben rückgängig gemacht wurde.', 'Brings back what was just undone.'), extern: { datei: 'App.svelte', marke: 'wiederholen()' } },
  { id: 'melden', mod: 'alt+umschalt', tasten: ['KeyP'], anzeige: 'Alt+Umschalt+P', bereich: 'bearbeiten', text: () => L('Fehler oder Wunsch melden', 'Report a problem or a wish'), wirkung: () => L('Öffnet das Fenster Melden.', 'Opens the Report window.'), extern: { datei: 'bausteine/Melden.svelte', marke: "e.code === 'KeyP'" } },

  { id: 'ausfuehren', mod: 'strg', tasten: ['Enter'], anzeige: 'Strg+Eingabe', bereich: 'ueben', text: () => L('Befehle ausführen', 'Run commands'), wirkung: () => L('Führt alle Befehle aus, bei Markierung nur das Markierte.', 'Runs all commands, or only the selection if text is selected.'), gilt: () => L('Im Befehlsfeld', 'In the command box'), extern: { datei: 'seiten/Befehle.svelte', marke: 'tastenLauf' } },
  { id: 'bogen-speichern', teilt: 'ausfuehren', mod: 'strg', tasten: ['Enter'], anzeige: 'Strg+Eingabe', bereich: 'bearbeiten', text: () => L('Bogen speichern und nächsten öffnen', 'Save the questionnaire and open the next one'), wirkung: () => L('Speichert den eingegebenen Bogen und setzt den Fokus auf die Bogen-Nummer des nächsten.', 'Saves the entered questionnaire and puts the focus on the number of the next one.'), gilt: () => L('In der Eingabemaske (Fragebogen planen)', 'In the input mask (Plan a questionnaire)'), extern: { datei: 'bausteine/FragebogenEingabe.svelte', marke: 'e.ctrlKey || e.metaKey' } },
  { id: 'hilfe-suche', mod: 'strg', tasten: ['Slash'], anzeige: 'Strg+/', bereich: 'ueben', text: () => L('In der Hilfe suchen', 'Search the help'), wirkung: () => L('Setzt den Fokus ins Suchfeld der Hilfe.', 'Puts the focus in the search box of the help.'), gilt: () => L('In der Hilfe', 'In the help'), extern: { datei: 'seiten/Hilfe.svelte', marke: "e.key !== '/'" } },
  { id: 'frage-ziffer', mod: 'keine', tasten: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'], anzeige: '1 bis 5', bereich: 'ueben', text: () => L('Antwort in der Übungsfrage wählen', 'Choose an answer in a practice question'), wirkung: () => L('Wählt die Antwort mit dieser Nummer; bei „mehrere möglich“ schaltet 1 bis 4 die Aussagen um und Eingabe prüft.', 'Chooses the answer with this number; for "several possible" 1 to 4 toggle the statements and Enter checks.'), gilt: () => L('Nur, wenn der Fokus in der Frage liegt', 'Only when the focus is inside the question'), extern: { datei: 'bausteine/VerstehenUeben.svelte', marke: 'waehleAntwort(misch[i]' } },
  { id: 'reihenfolge', mod: 'alt', tasten: ['ArrowUp', 'ArrowDown'], anzeige: 'Alt+Pfeil hoch / Alt+Pfeil runter', bereich: 'ueben', text: () => L('Eintrag in der Reihenfolge verschieben', 'Move an item in the ordering'), wirkung: () => L('Schiebt den Eintrag um eine Stelle nach oben oder unten.', 'Moves the item up or down by one place.'), gilt: () => L('Nur auf einem Eintrag der Reihenfolge-Übung', 'Only on an item of the ordering exercise'), extern: { datei: 'bausteine/Reihenfolge.svelte', marke: "'ArrowUp'" } },
  { id: 'aufnahme-abspielen', mod: 'keine', tasten: ['F4'], anzeige: 'F4', bereich: 'interviews', text: () => L('Aufnahme abspielen oder anhalten', 'Play or pause the recording'), wirkung: () => L('Startet die Aufnahme oder hält sie an; beim Weiterspielen beginnt sie ein paar Sekunden früher. Wirkt auch im Textfeld.', 'Starts the recording or pauses it; on resuming it starts a few seconds earlier. Works in the text field too.'), gilt: () => L('Auf der Seite Interviews, bei geöffnetem Transkript', 'On the Interviews page, with a transcript open'), extern: { datei: 'bausteine/TranskriptAnsicht.svelte', marke: 'abspielTaste(' } },
  { id: 'aufnahme-zurueck', mod: 'keine', tasten: ['F8'], anzeige: 'F8', bereich: 'interviews', text: () => L('Aufnahme 5 Sekunden zurück', 'Recording 5 seconds back'), wirkung: () => L('Springt in der Aufnahme 5 Sekunden zurück.', 'Jumps 5 seconds back in the recording.'), gilt: () => L('Auf der Seite Interviews, bei geöffnetem Transkript', 'On the Interviews page, with a transcript open'), extern: { datei: 'bausteine/TranskriptAnsicht.svelte', marke: 'abspielTaste(' } },
  { id: 'aufnahme-vor', mod: 'keine', tasten: ['F9'], anzeige: 'F9', bereich: 'interviews', text: () => L('Aufnahme 5 Sekunden vor', 'Recording 5 seconds forward'), wirkung: () => L('Springt in der Aufnahme 5 Sekunden vor.', 'Jumps 5 seconds forward in the recording.'), gilt: () => L('Auf der Seite Interviews, bei geöffnetem Transkript', 'On the Interviews page, with a transcript open'), extern: { datei: 'bausteine/TranskriptAnsicht.svelte', marke: 'abspielTaste(' } },
  { id: 'aufnahme-langsamer', mod: 'umschalt', tasten: ['F8'], anzeige: 'Umschalt+F8', bereich: 'interviews', text: () => L('Aufnahme langsamer', 'Recording slower'), wirkung: () => L('Stellt das Tempo eine Stufe langsamer (0,5 bis 1,5).', 'Sets the speed one step slower (0.5 to 1.5).'), gilt: () => L('Auf der Seite Interviews, bei geöffnetem Transkript', 'On the Interviews page, with a transcript open'), extern: { datei: 'bausteine/TranskriptAnsicht.svelte', marke: 'abspielTaste(' } },
  { id: 'aufnahme-schneller', mod: 'umschalt', tasten: ['F9'], anzeige: 'Umschalt+F9', bereich: 'interviews', text: () => L('Aufnahme schneller', 'Recording faster'), wirkung: () => L('Stellt das Tempo eine Stufe schneller (0,5 bis 1,5).', 'Sets the speed one step faster (0.5 to 1.5).'), gilt: () => L('Auf der Seite Interviews, bei geöffnetem Transkript', 'On the Interviews page, with a transcript open'), extern: { datei: 'bausteine/TranskriptAnsicht.svelte', marke: 'abspielTaste(' } },
  { id: 'aufnahme-zeitmarke', mod: 'umschalt', tasten: ['F4'], anzeige: 'Umschalt+F4', bereich: 'interviews', text: () => L('Zeitmarke der Aufnahme einfügen', 'Insert the time mark of the recording'), wirkung: () => L('Fügt die aktuelle Stelle der Aufnahme als Zeitmarke an der Schreibmarke ein, nur beim Bearbeiten eines Beitrags.', 'Inserts the current position of the recording as a time mark at the caret, only while editing a contribution.'), gilt: () => L('Auf der Seite Interviews, bei geöffnetem Transkript', 'On the Interviews page, with a transcript open'), extern: { datei: 'bausteine/TranskriptAnsicht.svelte', marke: 'abspielTaste(' } },
];

/* ---------- Anzeige ---------- */

export const istMac = (): boolean => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
/** Anzeige für die Person: auf dem Mac heißt Alt „Wahl“ und Strg „Cmd“. `aria-keyshortcuts` bleibt immer in der Schreibweise `Alt+X` (siehe `kuerzelAttribut`). */
export const zeige = (anzeige: string, mac = istMac()): string => (mac ? anzeige.replace(/\bAlt\b/g, 'Wahl').replace(/\bStrg\b/g, 'Cmd') : anzeige);
/** Anzeige eines Kürzels per Id, z. B. `kuerzelText('hilfe')` = „Alt+H“. */
export function kuerzelText(id: string, mac = istMac()): string {
  const k = KUERZEL.find(x => x.id === id);
  return k ? zeige(k.anzeige, mac) : '';
}
/** Wert für `aria-keyshortcuts` (ARIA-Schreibweise: Alt, Control, Meta, Shift; Tasten groß). */
export function kuerzelAttribut(mod: Modifikator, taste: string): string {
  const t = /^Key(.)$/.exec(taste)?.[1] ?? /^Digit(\d)$/.exec(taste)?.[1] ?? taste;
  const m = mod === 'alt' ? 'Alt+' : mod === 'strg' ? 'Control+' : mod === 'strg+umschalt' ? 'Control+Shift+' : mod === 'alt+umschalt' ? 'Alt+Shift+' : mod === 'umschalt' ? 'Shift+' : '';
  return m + t;
}

/* ---------- Reiter ---------- */

/** Die Reiter in der Reihenfolge des Kopfs: Daten, jedes Blatt, Neue Auswertung, Bericht, Befehle, Protokoll (Nummer 1 = Daten). */
export function reiterHashes(blattIds: readonly string[]): string[] {
  return ['daten', ...blattIds.map(i => 'blatt/' + i), 'blatt/neu', 'bericht', 'befehle', 'protokoll'];
}
/** Zu welchem Reiter gehört die Adresse? (Spalten, Umformen und Bearbeiten zählen zu Daten.) Index oder -1. */
export function reiterIndex(hashes: readonly string[], hash: string): number {
  const h = hash.replace(/^#/, '');
  const [seite] = h.split('/');
  if (seite === 'spalten' || seite === 'umformen' || seite === 'bearbeiten' || seite === 'vorlage') return hashes.indexOf('daten');
  return hashes.indexOf(h);
}
export function reiterTitel(hash: string, blaetter: readonly { id: string; titel: string }[]): string {
  if (hash === 'daten') return L('Daten', 'Data');
  if (hash === 'blatt/neu') return L('Neue Auswertung', 'New analysis');
  if (hash === 'bericht') return L('Bericht', 'Report');
  if (hash === 'befehle') return L('Befehle', 'Commands');
  if (hash === 'protokoll') return L('Protokoll', 'Log');
  return blaetter.find(b => 'blatt/' + b.id === hash)?.titel ?? hash;
}
/** `aria-keyshortcuts` für einen Reiter: Alt+Nummer (bis 9), dazu ein eigenes Kürzel (Alt+N, Alt+B), wenn es eines gibt. */
export function reiterKuerzel(blattIds: readonly string[], hash: string, eigenes?: string): string | undefined {
  const n = reiterHashes(blattIds).indexOf(hash) + 1;
  const teile = [n >= 1 && n <= 9 ? `Alt+${n}` : '', eigenes ?? ''].filter(Boolean);
  return teile.length ? teile.join(' ') : undefined;
}

/* ---------- Tasten erkennen ---------- */

export type TastenEreignis = Pick<KeyboardEvent, 'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>;

function modPasst(mod: Modifikator, e: TastenEreignis): boolean {
  switch (mod) {
    case 'umschalt': return e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;
    case 'alt': return e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;     // Strg+Alt ist auf deutschen Tastaturen AltGr: nicht anfassen
    case 'alt+umschalt': return e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey;
    case 'strg': return (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
    case 'strg+umschalt': return (e.ctrlKey || e.metaKey) && !e.altKey && e.shiftKey;
    default: return !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
  }
}
/** Passt die gedrückte Taste auf `taste` (ein `e.code`-Name)? Buchstaben tastaturlayoutfest: zuerst `e.key` (QWERTZ: Z-Taste = code KeyY, key "z");
 *  ist `e.key` kein Buchstabe (Mac: Wahltaste erzeugt Sonderzeichen, andere Schriften), zählt der Tastenort. Ziffern und Sondertasten über den Tastenort. */
export function tastePasst(taste: string, e: Pick<KeyboardEvent, 'key' | 'code'>): boolean {
  const b = /^Key([A-Z])$/.exec(taste)?.[1];
  if (b) {
    const k = e.key ?? '';
    if (/^[a-zA-Z]$/.test(k)) return k.toLowerCase() === b.toLowerCase();
    return e.code === taste;
  }
  return e.code === taste;
}
/** Findet das Kürzel der Liste, das zu diesem Tastendruck gehört (nur die mit eigenem Empfänger, also nicht `extern`). */
export function finde(e: TastenEreignis): Kuerzel | undefined {
  return KUERZEL.find(k => !k.extern && modPasst(k.mod, e) && k.tasten.some(t => tastePasst(t, e)));
}

/* ---------- Wo bin ich? ---------- */

/** Was von einem DOM-Knoten gebraucht wird; Attrappen im Test erfüllen es mit schlichten Objekten. */
export interface Kn {
  tagName: string;
  textContent: string | null;
  getAttribute(name: string): string | null;
  closest(selektor: string): Kn | null;
  ownerDocument?: { getElementById(id: string): { textContent: string | null } | null } | null;
  cellIndex?: number;
  parentElement?: (Kn & { rowIndex?: number }) | null;
  rows?: ArrayLike<{ cells: ArrayLike<Kn> }>;
}

export interface Umfeld {
  /** Reiter (Nummer ab 1, Zahl, Titel) oder keiner, wenn die Seite kein Reiter ist. */
  reiter?: { nr: number; von: number; titel: string } | null;
  /** Überschrift der Seite, wenn es keinen Reiter gibt. */
  seite?: string | null;
}

const kurz = (t: string | null | undefined, max = 120): string => { const x = (t ?? '').replace(/\s+/g, ' ').trim(); return x.length > max ? x.slice(0, max - 1) + '…' : x; };

/** Zugänglicher Name: aria-label, aria-labelledby, title, placeholder, sonst der Text. */
export function nameVon(el: Kn, mitText = true): string {
  const al = kurz(el.getAttribute('aria-label')); if (al) return al;
  const lb = el.getAttribute('aria-labelledby');
  if (lb) { const t = kurz(lb.split(/\s+/).map(i => el.ownerDocument?.getElementById(i)?.textContent ?? '').join(' ')); if (t) return t; }
  const ti = kurz(el.getAttribute('title')); if (ti) return ti;
  const ph = kurz(el.getAttribute('placeholder')); if (ph) return ph;
  return mitText ? kurz(el.textContent) : '';
}

/** Rolle als Wort: ausdrückliches `role`, sonst nach Tag. */
export function rolleVon(el: Kn): string {
  const r = (el.getAttribute('role') ?? '').toLowerCase();
  const t = (el.tagName ?? '').toLowerCase();
  const art = (el.getAttribute('type') ?? '').toLowerCase();
  const rolle = r || (t === 'a' ? 'link' : t === 'button' ? 'button' : /^h[1-6]$/.test(t) ? 'heading' : t === 'select' ? 'listbox' : t === 'textarea' ? 'textbox'
    : t === 'input' ? (art === 'checkbox' ? 'checkbox' : art === 'radio' ? 'radio' : art === 'search' ? 'searchbox' : art === 'range' ? 'slider' : art === 'submit' || art === 'button' ? 'button' : 'textbox')
    : t === 'td' ? 'cell' : t === 'th' ? ((el.getAttribute('scope') ?? '') === 'row' ? 'rowheader' : 'columnheader') : t === 'summary' ? 'button' : t === 'main' ? 'main' : '');
  switch (rolle) {
    case 'link': return L('Link', 'link');
    case 'button': return L('Schaltfläche', 'button');
    case 'heading': return /^h[1-6]$/.test(t) ? L(`Überschrift Ebene ${t[1]}`, `heading level ${t[1]}`) : L('Überschrift', 'heading');
    case 'listbox': return L('Auswahlliste', 'list box');
    case 'textbox': return L('Eingabefeld', 'edit field');
    case 'searchbox': return L('Suchfeld', 'search field');
    case 'checkbox': return L('Kontrollkästchen', 'check box');
    case 'radio': return L('Optionsfeld', 'radio button');
    case 'slider': return L('Regler', 'slider');
    case 'combobox': return L('Kombinationsfeld', 'combo box');
    case 'option': return L('Eintrag', 'option');
    case 'tab': return L('Registerkarte', 'tab');
    case 'menuitem': return L('Menüeintrag', 'menu item');
    case 'cell': case 'gridcell': return L('Tabellenzelle', 'table cell');
    case 'columnheader': return L('Spaltenkopfzelle', 'column header cell');
    case 'rowheader': return L('Zeilenkopfzelle', 'row header cell');
    default: return '';
  }
}

/** Der Bereich (Landmarke), in dem das Element steht, mit Namen. */
export function bereichVon(el: Kn): string {
  const mit = (art: string, name: string) => (name ? `${art} ${name}` : art);
  const dlg = el.closest('dialog, [role=dialog]');
  if (dlg) return mit(L('Dialog', 'dialog'), nameVon(dlg, false));
  const aside = el.closest('aside');
  if (aside) return mit(L('Seitenleiste', 'side panel'), nameVon(aside, false));
  const nav = el.closest('nav');
  if (nav) return mit(L('Navigation', 'navigation'), nameVon(nav, false));
  if (el.closest('header')) return L('Kopfbereich', 'header');
  if (el.closest('main')) return L('Hauptbereich', 'main area');
  if (el.closest('footer')) return L('Fußbereich', 'footer');
  return '';
}

/** Zeile, Spalte und Kopfzellen, wenn das Element in einer Tabelle steht. Gesprochen wird der lange Name (aria-label), sonst der Text. */
export function tabelleVon(el: Kn): string {
  const zelle = el.closest('td, th'); if (!zelle) return '';
  const tab = zelle.closest('table');
  const zeile = zelle.parentElement;
  const sp = zelle.cellIndex, ze = zeile?.rowIndex;
  if (sp === undefined || ze === undefined || ze < 0) return '';
  const teile: string[] = [L(`Zeile ${ze + 1}, Spalte ${sp + 1}`, `row ${ze + 1}, column ${sp + 1}`)];
  const kopf = (z: Kn | undefined) => (z && (z.tagName ?? '').toLowerCase() === 'th' ? nameVon(z) : '');
  const kopfZeile = tab?.rows?.[0]?.cells;
  const istZeilenkopf = (zelle.tagName ?? '').toLowerCase() === 'th' && (zelle.getAttribute('scope') ?? '') === 'row';   // die Zeilenkopfzelle trägt ihren Namen selbst: keine Ecke vorlesen
  const sk = ze > 0 && kopfZeile && !istZeilenkopf ? kopf(kopfZeile[sp]) : '';
  const zk = sp > 0 && tab?.rows?.[ze] ? kopf(tab.rows[ze]!.cells[0]) : '';
  if (sk) teile.push(L(`Spaltenkopf ${sk}`, `column header ${sk}`));
  if (zk) teile.push(L(`Zeilenkopf ${zk}`, `row header ${zk}`));
  return teile.join(', ');
}

/** Der Satz für Alt+W. Reine Funktion: nimmt das Element im Fokus (oder `null`) und das Umfeld (Reiter, Seite). */
export function beschreibeStelle(el: Kn | null, u: Umfeld = {}): string {
  const teile: string[] = [];
  if (u.reiter) teile.push(L(`Reiter ${u.reiter.nr} von ${u.reiter.von}: ${u.reiter.titel}`, `Tab ${u.reiter.nr} of ${u.reiter.von}: ${u.reiter.titel}`));
  else if (u.seite) teile.push(L(`Seite: ${u.seite}`, `Page: ${u.seite}`));
  if (el) {
    const b = bereichVon(el); if (b) teile.push(L(`Bereich: ${b}`, `Area: ${b}`));
    const rolle = rolleVon(el), name = nameVon(el);
    const e = [rolle, name ? `„${name}“` : ''].filter(Boolean).join(' ');
    if (e) teile.push(e);
    const t = tabelleVon(el); if (t) teile.push(t);
  }
  return teile.length ? teile.join('. ') + '.' : L('Kein Element im Fokus.', 'No element has the focus.');
}

/* ---------- Wächter ---------- */

/** Eingabearten ohne Text: Schalter, Auswahlknöpfe, Regler und Knöpfe schreiben nichts, die Alt-Kürzel gelten dort weiter. */
const OHNE_TEXT = /^(checkbox|radio|range|button|submit|reset|image|color|file)$/i;
/** Steht der Fokus in einem Eingabefeld? Dort gehören Alt-Kombinationen dem Feld. Schalter (Checkbox, Radio, Regler) zählen nicht. */
export const imEingabefeld = (z: EventTarget | null): boolean => {
  const e = z as HTMLElement | null;
  if (!e) return false;
  if (e.isContentEditable) return true;
  if (e.tagName === 'INPUT') return !OHNE_TEXT.test((e as HTMLInputElement).type || 'text');
  return /^(TEXTAREA|SELECT)$/.test(e.tagName);
};
/** Ist ein modales Fenster offen? Dann gehört die Taste ihm. Mit `ausser` (Selektor) wird dieses Fenster nicht gezählt, wenn der Fokus darin steht. */
export function modalOffen(z: EventTarget | null = null, ausser?: string): boolean {
  if (typeof document === 'undefined' || !document.querySelector('dialog[open], [role=dialog][aria-modal=true]')) return false;
  return !(ausser && (z as Element | null)?.closest?.(ausser));
}

/** Ist gerade ein Fenster, Menü oder Aufklapp-Menü offen, das Esc zuerst schließen soll? Nur WIRKLICH offene zählen: ein Menü, das im Dokument steht, aber zu ist
 *  (`[role=menu]` ohne `:popover-open`), und die aufgeklappte Seitenleiste (`aria-expanded=true` ohne `aria-haspopup`) halten Esc nicht auf (sonst ginge die Meldung nie mit Esc zu, WCAG 2.2.1). */
export function popupOffen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector('dialog[open], [role=dialog]:not([hidden]), [role=menu]:popover-open, [aria-haspopup][aria-expanded=true]');
}

/* ---------- Aktionen ---------- */

/** Empfänger, die eine Komponente einhängt (Kürzel-Dialog). */
export const empfaenger: { liste: (() => void) | null; meldungen: (() => void) | null } = { liste: null, meldungen: null };

const aktuellerHash = () => (typeof location === 'undefined' ? '' : location.hash.replace(/^#/, ''));
const seiteVon = (h: string) => h.split('/')[0] || 'start';
/** Reiter und untere Leiste gibt es nur, wenn Daten offen sind (wie `einfach` in `App.svelte`). */
const hatReiter = () => !!s.projekt && seiteVon(aktuellerHash()) !== 'start';
const ohneDaten = () => sage(L('Dafür müssen Daten offen sein.', 'This needs open data.'));

/** Im Reiter „Befehle“ gehört der Fokus ins Befehlsfeld: wer mit Alt+Ziffer hierher springt, will tippen (Messung 0, Befund 2). Das Feld nennt sich selbst, die Überschrift wird übersprungen. */
const BEFEHLSFELD = '#syntax';
function zuReiter(hash: string): void {
  if (aktuellerHash() === hash) { fokusAuf(() => document.querySelector<HTMLElement>(hash === 'befehle' ? BEFEHLSFELD : '#inhalt h1')); return; }   // schon dort: nur die Überschrift (bei Befehlen das Feld) ansteuern (kein hashchange)
  location.hash = hash;   // `App.svelte` setzt nach dem Wechsel den Fokus auf die Überschrift
  if (hash === 'befehle') setTimeout(() => { if (aktuellerHash() === 'befehle') document.querySelector<HTMLElement>(BEFEHLSFELD)?.focus({ preventScroll: true }); }, 250);
}
function reiterNummer(n: number): void {
  if (!hatReiter()) return void ohneDaten();
  const liste = reiterHashes(s.blaetter.map(b => b.id));
  if (n < 1 || n > liste.length) return void sage(L(`Es gibt nur ${liste.length} Reiter.`, `There are only ${liste.length} tabs.`));
  zuReiter(liste[n - 1]!);
}
function reiterSchritt(d: 1 | -1): void {
  if (!hatReiter()) return void ohneDaten();
  const liste = reiterHashes(s.blaetter.map(b => b.id));
  const i = reiterIndex(liste, aktuellerHash());
  zuReiter(liste[i < 0 ? (d === 1 ? 0 : liste.length - 1) : (i + d + liste.length) % liste.length]!);
}
function schalteSeite(p: string): void {
  if (seiteVon(aktuellerHash()) === p) zurueck(!!s.projekt); else location.hash = p;
}

const BEREICH_ORDNUNG: { name: string; ziel: () => HTMLElement | null }[] = [
  { name: 'kopf', ziel: () => document.querySelector<HTMLElement>('header.kopf a.marke') },
  { name: 'reiter', ziel: () => document.querySelector<HTMLElement>('header.kopf nav.reiter a[aria-current]') ?? document.querySelector<HTMLElement>('header.kopf nav.reiter a') },
  { name: 'inhalt', ziel: () => document.querySelector<HTMLElement>('#inhalt h1') ?? document.querySelector<HTMLElement>('#inhalt') },
  { name: 'rand', ziel: () => document.querySelector<HTMLElement>('aside.rand a, aside.rand button') ?? document.querySelector<HTMLElement>('aside.rand') },
];
/** In welchem Bereich steht der Fokus? Index in `BEREICH_ORDNUNG` oder -1. */
function aktuellerBereich(z: Element | null): number {
  if (!z) return -1;
  if (z.closest('aside.rand')) return 3;
  if (z.closest('header.kopf nav.reiter')) return 1;
  if (z.closest('header.kopf')) return 0;
  if (z.closest('#inhalt')) return 2;
  return -1;
}
function bereichSprung(): void {
  const von = aktuellerBereich(document.activeElement);
  for (let k = 1; k <= BEREICH_ORDNUNG.length; k++) {
    const ziel = BEREICH_ORDNUNG[(von + k + BEREICH_ORDNUNG.length) % BEREICH_ORDNUNG.length]!.ziel();
    if (ziel && ziel.getClientRects().length) { fokusAuf(ziel); return; }
  }
}

function woBinIch(): void {
  const hashes = reiterHashes(s.blaetter.map(b => b.id));
  const i = hatReiter() ? reiterIndex(hashes, aktuellerHash()) : -1;
  const umfeld: Umfeld = i >= 0
    ? { reiter: { nr: i + 1, von: hashes.length, titel: reiterTitel(hashes[i]!, s.blaetter) } }
    : { seite: kurz(document.querySelector('#inhalt h1')?.textContent) };
  const z = document.activeElement;
  const feld = z instanceof HTMLTextAreaElement && z.hasAttribute('data-zeilenstand') ? ' ' + zeilenSatz(zeilenStand(z.value, z.selectionStart)) + '.' : '';
  sage(beschreibeStelle(z && z !== document.body ? (z as unknown as Kn) : null, umfeld) + feld);
}

/** Alt+K: öffnet das Menü „Ansicht“ bei den Farben (oder schließt es). */
function farbwahl(): void { dispatchEvent(new CustomEvent('statable:ansicht', { detail: 'farben' })); }

/** Aktionen je Kürzel-Id. Jede Zeile der Liste ohne `extern` hat hier einen Empfänger (`kuerzel.test.ts` prüft das). */
export const AKTIONEN: Record<string, (e: TastenEreignis) => void> = {
  palette: () => oeffnePalette(),
  liste: () => empfaenger.liste?.(),
  meldungen: () => empfaenger.meldungen?.(),
  wo: () => woBinIch(),
  zurueck: () => zurueckBegriff(),
  bereiche: () => bereichSprung(),
  hilfe: () => schalteSeite('hilfe'),
  lernen: () => schalteSeite('lernen'),
  einstellungen: () => schalteSeite('einstellungen'),
  farben: () => farbwahl(),
  'reiter-ziffer': e => reiterNummer(ZIFFERN.findIndex(z => z === e.code) + 1 || Number(/^[1-9]$/.test(e.key) ? e.key : 0)),
  'reiter-weiter': () => reiterSchritt(1),
  'reiter-zurueck': () => reiterSchritt(-1),
  neu: () => (hatReiter() ? zuReiter('blatt/neu') : ohneDaten()),
  bericht: () => (hatReiter() ? zuReiter('bericht') : ohneDaten()),
};

/**
 * Der globale Handler für die Kürzel aus `KUERZEL` ohne `extern`. Gibt `true` zurück, wenn er die Taste behandelt hat (dann hat er auch `preventDefault` gerufen).
 * Wächter: nicht im Eingabefeld (außer Strg+K), nicht bei offenem modalem Fenster. Alt+Z gilt im Begriffsfenster, und nur, wenn es etwas zum Zurückgehen gibt.
 */
export function behandle(e: KeyboardEvent): boolean {
  if (e.defaultPrevented || e.isComposing) return false;
  const k = finde(e);
  if (!k) return false;
  const feld = imEingabefeld(e.target);
  if (k.id === 'palette') {
    if (modalOffen(e.target)) return false;   // die offene Palette ist selbst ein offenes Fenster; Strg+K in einem anderen Fenster gehört dem Fenster. Nicht `palette.offen` fragen: das hinkt dem `close`-Ereignis hinterher.
  } else {
    if (feld && !(k.id === 'wo' && (e.target as HTMLElement).hasAttribute('data-zeilenstand'))) return false;   // Alt+W gilt auch im Befehlsfeld (nennt dort die Zeile)
    if (modalOffen(e.target, k.id === 'zurueck' ? 'dialog.begriff-popup' : undefined)) return false;
  }
  if (k.id === 'zurueck' && !begriffe.stapel.length) return false;
  if (e.repeat && k.id !== 'reiter-weiter' && k.id !== 'reiter-zurueck') { e.preventDefault(); return true; }
  e.preventDefault();
  AKTIONEN[k.id]?.(e);
  return true;
}
