/**
 * Die Befehle zu McNemar und Cochran-Q für die Seite „Befehle“ (Fachblatt Welle 2, Paket C, G5). Statable rechnet beides selbst (mcnemarcochran.ts); PSPP liefert mit
 * `NPAR TESTS /MCNEMAR` und `/COCHRAN` dieselben Zahlen, mit den Abweichungen, die die Kommentarzeilen nennen (Messung 15.10., friedman-mcnemar-cochran-pspp.test.ts).
 */
import { L } from './sitzung.svelte';

export const mcnemarBefehl = (vorher: string, nachher: string) =>
  `${L('* Statable rechnet McNemar selbst: exakter Binomialtest der Paare, die sich geändert haben, p höchstens 1. PSPP gibt bei gleich vielen Wechseln ein p über 1 aus und rechnet ohne Wechsel einen „Test“ (2,000).',
    '* Statable calculates McNemar itself: exact binomial test of the pairs that changed, p at most 1. With equal numbers of changes PSPP gives a p above 1, and with no changes it still calculates a "test" (2.000).')}\nNPAR TESTS /MCNEMAR=${vorher} WITH ${nachher} (PAIRED).`;

export const cochranBefehl = (spalten: string[]) =>
  `${L('* Statable rechnet Cochran-Q und die Paarvergleiche selbst. PSPP nennt den zuerst in den Daten stehenden Wert „Success“; Statable legt „ja“ fest (siehe Blatt). Q ist davon unabhängig.',
    '* Statable calculates Cochran\'s Q and the pairwise comparisons itself. PSPP calls the value that appears first in the data "Success"; Statable fixes "yes" (see the page). Q does not depend on it.')}\nNPAR TESTS /COCHRAN=${spalten.join(' ')}.`;
