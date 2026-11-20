import type { Blatt } from './sitzung.svelte';
import { L, melde, sichern } from './sitzung.svelte';
import type { RangErgebnis } from './rangtests';
import { rangTestName } from './rangsaetze';

/** Schaltet das Blatt auf „Ohne Normalverteilung (Rangtest)“ - die eine Stelle für die Radio-Wahl in BlattRang und den Knopf in RangEmpfehlung.
 *  Gibt true zurück, wenn der Rangtest jetzt gilt; sonst steht die Meldung „lässt sich nicht rechnen“. */
export function rangAnschalten(blatt: Blatt, rang: RangErgebnis | null, nachrechnen: () => RangErgebnis | null): boolean {
  const x = rang ?? nachrechnen();
  if (!x) { melde(L('Der Rangtest lässt sich mit diesen Daten nicht rechnen.', 'The rank test cannot be calculated with these data.')); return false; }
  if (!rang) blatt.ergebnis = { ...(blatt.ergebnis as object), rang: x };
  blatt.rang = true; blatt.robust = false; void sichern();
  const name = rangTestName(x);
  melde(L(`Jetzt: ${name} (ohne Normalverteilung).`, `Now: ${name} (no normal distribution).`));
  return true;
}
