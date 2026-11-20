/**
 * Der Lernstand im Browser (Bereich „Lernen“): `localStorage`, nichts auf einem Server, nichts in der .statable-Datei.
 * Die Rechenregeln stehen rein in `lernen/lernstand.ts`; hier liegen der reaktive Stand, das Speichern und das Mitlesen der Beispiele.
 */
import { untrack } from 'svelte';
import { s, L } from './sitzung.svelte';
import { zaehle } from './zaehlen';
import { EINHEITEN, type Einheit } from '../lernen/lernplan';
import {
  leererStand, leseStand, abschnittsFarben, istBesucht, besuche, machFertig, richtigBeantwortet, schrittGeoeffnet, neuFertigeBeispiele, type Stand
} from '../lernen/lernstand';

const SCHLUESSEL = 'statable-lernstand';
function lies(): Stand {
  try { return leseStand(localStorage.getItem(SCHLUESSEL)); } catch { return leererStand(); }
}
export const lernstand = $state<{ st: Stand }>({ st: lies() });

function setze(neu: Stand) {
  if (neu === lernstand.st) return;
  lernstand.st = neu;
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(neu)); } catch { /* ohne Speicher gilt der Stand bis zum Neuladen */ }
}

export const lernBesuche = (e: Einheit, i: number) => setze(besuche(lernstand.st, e, i));
/** Zählung (nur Summe je Tag, ohne Bezug zur Person): Einheiten, die mit dieser Änderung zum ersten Mal ganz durchgemacht sind. */
function meldeFertige(vorher: Stand, nachher: Stand, einheiten: Einheit[]) {
  const ganz = (st: Stand, e: Einheit) => { const f = abschnittsFarben(st, e); return f.length > 0 && f.every(x => x === 'gruen'); };
  for (const e of einheiten) if (!ganz(vorher, e) && ganz(nachher, e)) zaehle('lernfertig', e.id);
}
export const lernFertig = (e: Einheit, schluessel: string) => { const v = lernstand.st; setze(machFertig(v, e, schluessel)); meldeFertige(v, lernstand.st, [e]); };
export const lernRichtig = (frage: string) => { const v = lernstand.st; setze(richtigBeantwortet(v, frage)); meldeFertige(v, lernstand.st, EINHEITEN.filter(e => e.fragen.includes(frage))); };
export const lernSchrittOffen = (einheit: string, schluessel: string, art: string, projekt: string) =>
  setze(schrittGeoeffnet(lernstand.st, einheit, schluessel, { zeit: Date.now(), projekt, art }));
export function lernZuruecksetzen() {
  lernstand.st = leererStand();
  try { localStorage.removeItem(SCHLUESSEL); } catch { /* egal */ }
}

/** Ein geöffneter Beispiel-Schritt zählt, sobald im Projekt danach ein Ergebnis dieser Art liegt. Das Blatt entsteht auf einer anderen Seite, darum läuft das hier für die ganze App. */
$effect.root(() => {
  $effect(() => {
    const st = lernstand.st, blaetter = s.blaetter, projekt = s.projekt?.id;
    if (!Object.keys(st.geoeffnet).length) return;
    untrack(() => { for (const x of neuFertigeBeispiele(st, EINHEITEN, blaetter, projekt)) lernFertig(x.einheit, x.schluessel); });
  });
});

/** Der Stand einer Einheit als Satz (nie nur Farbe): durchgemacht, begonnen oder noch nicht begonnen. */
export function einheitStandText(e: Einheit): string {
  const f = abschnittsFarben(lernstand.st, e), ok = f.filter(x => x === 'gruen').length;
  if (f.length && ok === f.length) return L('durchgemacht', 'completed');
  return istBesucht(lernstand.st, e) ? L(`begonnen, ${ok} von ${f.length} Abschnitten durchgemacht`, `started, ${ok} of ${f.length} sections completed`) : L('noch nicht begonnen', 'not started yet');
}
