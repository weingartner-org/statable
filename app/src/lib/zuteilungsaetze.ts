/**
 * Sätze zum Zufall-zuteilen (Später S-F, L6; Fachblatt 5.3 und 5.5). Ganze Sätze je Fall, Zahlen über das Sprachprofil, Anrede über d().
 * Die Kopfzeile „Lehrmittel - nicht für echte Studien (keine Verdeckung)“ steht in jeder exportierten Datei und über jedem Ergebnis. ⚠ Satzvorlagen von der Fachperson abzunehmen.
 */
import { L, Lp } from './sitzung.svelte';
import { aufzaehlung, ganzZahl } from '../i18n/profil';

/** Die Kopfzeile jeder Datei und jedes Ergebnisses (nur Bindestrich). */
export const zuteilungLehrmittelSatz = (): string => L('Lehrmittel - nicht für echte Studien (keine Verdeckung)', 'Teaching tool - not for real studies (no concealment)');

/** Warum es ein Lehrmittel ist: der sichtbare Startwert. */
export const zuteilungWarnSatz = (): string =>
  L('Dies ist ein Lehrmittel: Der Startwert ist sichtbar, und wer ihn und das Verfahren kennt, kann die ganze Liste im Voraus berechnen. Eine echte Studie braucht ein dafür zugelassenes System mit verdeckter Zuteilung und das Protokoll der Einrichtung.',
    'This is a teaching tool: the seed is visible, and anyone who knows it and the method can calculate the whole list in advance. A real study needs an approved system with concealed allocation and the protocol of the institution.');

/** Zeile „Gerechnet“ und Verfahrenszeile im Export. */
export function zuteilungGerechnet(a: { art: 'block'; verhaeltnis: number[]; blockgroessen: number[]; startwert: number; strom: number; schichten?: boolean } | { art: 'stichprobe'; n: number; k: number; startwert: number } | { art: 'vollstaendig'; groessen: number[]; startwert: number; strom: number }): string {
  if (a.art === 'vollstaendig') {
    const g = a.groessen.join(':');
    return L(`Vollständige Zuteilung mit festen Gruppengrößen ${g}, Startwert ${a.startwert}, Strom ${a.strom}`, `Complete allocation with fixed group sizes ${g}, seed ${a.startwert}, stream ${a.strom}`);
  }
  if (a.art === 'stichprobe') {
    return L(`Zufallsauswahl: Fisher-Yates mit mulberry32, Startwert ${a.startwert} (${a.k} aus ${a.n})`, `Random selection: Fisher-Yates with mulberry32, seed ${a.startwert} (${a.k} of ${a.n})`);
  }
  const v = a.verhaeltnis.join(':'), g = aufzaehlung(a.blockgroessen.map(String)), z = a.blockgroessen.length;
  if (a.schichten) {
    return Lp(z, `Blockrandomisierung ${v}, Blockgröße ${g}, Startwert ${a.startwert}, je Schicht ein eigener Strom (Nummer der Schicht ab 1)`, `Blockrandomisierung ${v}, Blockgrößen ${g}, Startwert ${a.startwert}, je Schicht ein eigener Strom (Nummer der Schicht ab 1)`,
      `Block randomisation ${v}, block size ${g}, seed ${a.startwert}, a separate stream for each stratum (number of the stratum from 1)`, `Block randomisation ${v}, block sizes ${g}, seed ${a.startwert}, a separate stream for each stratum (number of the stratum from 1)`);
  }
  return Lp(z, `Blockrandomisierung ${v}, Blockgröße ${g}, Startwert ${a.startwert}, Strom ${a.strom}`, `Blockrandomisierung ${v}, Blockgrößen ${g}, Startwert ${a.startwert}, Strom ${a.strom}`,
    `Block randomisation ${v}, block size ${g}, seed ${a.startwert}, stream ${a.strom}`, `Block randomisation ${v}, block sizes ${g}, seed ${a.startwert}, stream ${a.strom}`);
}

/** Feste Blöcke sind vorhersagbar. */
export const zuteilungVorhersagSatz = (): string =>
  L('Wer die Blockgröße kennt, kann den letzten Fall jedes Blocks erraten. Darum werden mehrere Blockgrößen gemischt; die Blocknummern zeigen, wo ein Block endet, und dürften in einer echten Studie den Prüfenden nicht bekannt sein.',
    'Anyone who knows the block size can guess the last case of every block. That is why several block sizes are mixed; the block numbers show where a block ends and must not be known to the investigators in a real study.');

/** Der letzte Block ist unvollständig. */
export function zuteilungUnvollstaendigSatz(maxAbweichung: number): string {
  return Lp(maxAbweichung, `Der letzte Block ist unvollständig: Im Verlauf der Liste unterschieden sich die Gruppen höchstens um ${maxAbweichung} Fall.`, `Der letzte Block ist unvollständig: Im Verlauf der Liste unterschieden sich die Gruppen höchstens um ${maxAbweichung} Fälle.`,
    `The last block is incomplete: over the course of the list the groups differed by at most ${maxAbweichung} case.`, `The last block is incomplete: over the course of the list the groups differed by at most ${maxAbweichung} cases.`);
}

/** Viele oder kleine Schichten. */
export const zuteilungSchichtenSatz = (): string =>
  L('Viele kleine Schichten haben viele unvollständige Blöcke; die Gruppen werden dann in den Schichten weniger gleichmäßig.', 'Many small strata have many incomplete blocks; the groups then become less balanced within the strata.');

/** Doppelte Kennungen in der eingefügten Liste. */
export function zuteilungDoppeltSatz(anzahl: number, beispiele: string[]): string {
  const b = aufzaehlung(beispiele.slice(0, 3)), mehr = beispiele.length > 3;
  return mehr
    ? Lp(anzahl, `${anzahl} Kennung kommt mehrfach vor (zum Beispiel ${b}). Sie wurde nicht entfernt: Die Person hat so mehrere Plätze und damit eine höhere Chance.`, `${anzahl} Kennungen kommen mehrfach vor (zum Beispiel ${b}). Sie wurden nicht entfernt: Die Personen haben so mehrere Plätze und damit eine höhere Chance.`,
      `${anzahl} ID occurs more than once (for example ${b}). It was not removed: the person has several places and thus a higher chance.`, `${anzahl} IDs occur more than once (for example ${b}). They were not removed: those people have several places and thus a higher chance.`)
    : Lp(anzahl, `${anzahl} Kennung kommt mehrfach vor (${b}). Sie wurde nicht entfernt: Die Person hat so mehrere Plätze und damit eine höhere Chance.`, `${anzahl} Kennungen kommen mehrfach vor (${b}). Sie wurden nicht entfernt: Die Personen haben so mehrere Plätze und damit eine höhere Chance.`,
      `${anzahl} ID occurs more than once (${b}). It was not removed: the person has several places and thus a higher chance.`, `${anzahl} IDs occur more than once (${b}). They were not removed: those people have several places and thus a higher chance.`);
}

/** Leere Zeilen in der eingefügten Liste. */
export const zuteilungLeerSatz = (anzahl: number): string =>
  Lp(anzahl, `${anzahl} leere Zeile wurde übersprungen.`, `${anzahl} leere Zeilen wurden übersprungen.`, `${anzahl} empty line was skipped.`, `${anzahl} empty lines were skipped.`);

/** Stichprobe ≠ Zuteilung. */
export const zuteilungStichprobeSatz = (): string =>
  L('Eine Zufallsauswahl wählt Personen aus einer Liste aus; eine Zuteilung verteilt Personen auf Gruppen. Das sind zwei verschiedene Schritte.', 'A random selection picks people from a list; an allocation distributes people to groups. These are two different steps.');

/** Ergebnis der Auswahl in einem Satz. */
export const zuteilungAuswahlSatz = (k: number, n: number, startwert: number): string =>
  Lp(k, `Mit dem Startwert ${startwert} wurde ${k} von ${ganzZahl(n)} Fällen ausgewählt.`, `Mit dem Startwert ${startwert} wurden ${k} von ${ganzZahl(n)} Fällen ausgewählt.`, `With seed ${startwert}, ${k} of ${ganzZahl(n)} cases was selected.`, `With seed ${startwert}, ${k} of ${ganzZahl(n)} cases were selected.`);

/** Meldung zu einer ungültigen Eingabe (Codes aus lib/zuteilung.ts). */
export function zuteilungFehlerSatz(code: string): string {
  switch (code) {
    case 'n': return L('Die Zahl der Plätze muss eine ganze Zahl von 1 bis 100 000 sein (bei der Auswahl bis 1 000 000).', 'The number of places must be a whole number from 1 to 100,000 (up to 1,000,000 for the selection).');
    case 'k': return L('Die Zahl der Auswahl muss eine ganze Zahl von 1 bis zur Zahl der Fälle sein.', 'The size of the selection must be a whole number from 1 to the number of cases.');
    case 'gruppen': return L('Es werden 2 bis 6 Gruppen mit verschiedenen, nicht leeren Namen gebraucht.', '2 to 6 groups with different, non-empty names are needed.');
    case 'verhaeltnis': return L('Das Verhältnis der Gruppen besteht aus ganzen Zahlen ab 1, eine je Gruppe.', 'The ratio of the groups consists of whole numbers from 1 up, one per group.');
    case 'blockgroesse': return L('Jede Blockgröße muss eine ganze Zahl sein und ein Vielfaches der Summe des Verhältnisses (bei 1:1 zum Beispiel 4 und 6).', 'Every block size must be a whole number and a multiple of the sum of the ratio (for 1:1, for example, 4 and 6).');
    case 'schichten': return L('Es sind bis zu 8 Schichten erlaubt, jede mit eigenem, nicht leerem Namen und einer Zahl der Plätze von 1 bis 100 000.', 'Up to 8 strata are allowed, each with its own non-empty name and a number of places from 1 to 100,000.');
    case 'startwert': return L('Der Startwert muss eine ganze Zahl von 0 bis 4 294 967 295 sein.', 'The seed must be a whole number from 0 to 4,294,967,295.');
    case 'groessen': return L('Jede Gruppengröße muss eine ganze Zahl ab 1 sein, zusammen höchstens 100 000.', 'Every group size must be a whole number from 1 up, at most 100,000 together.');
    case 'liste-leer': return L('Die Liste ist leer: Es wird mindestens eine Kennung gebraucht.', 'The list is empty: at least one ID is needed.');
    case 'zu-viele-zeilen': return L('Die Liste hat mehr als 1 000 000 Zeilen.', 'The list has more than 1,000,000 lines.');
    case 'zeile-zu-lang': return L('Eine Zeile der Liste hat mehr als 200 Zeichen.', 'A line of the list has more than 200 characters.');
    default: return L('Die Eingabe passt nicht.', 'The input does not fit.');
  }
}
