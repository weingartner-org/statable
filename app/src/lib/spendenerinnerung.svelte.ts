/**
 * Die Erinnerung nach je 10 Stunden aktiver Nutzung (Logik und Texte: lib/spende.ts).
 * Aktiv heißt: Tab sichtbar und in den letzten 5 Minuten eine Eingabe. Alle 15 Sekunden wird gebucht; ein Rechner im Ruhezustand bucht höchstens 30 Sekunden
 * (kein Sprung durch eine lange Lücke). Der Stand wird bei jedem Buchen frisch gelesen - so zählen mehrere offene Tabs nicht doppelt.
 */
import { addiere, erinnerungAus, RUHE_MS, spendeMoeglich, standLesen, standSchreiben } from './spende';

/** `offen` zeigt den Hinweis; `stunden` ist die erreichte Schwelle (10, 20 …). */
export const spendenHinweis = $state<{ offen: boolean; stunden: number }>({ offen: false, stunden: 0 });
export const schliesseSpendenHinweis = (): void => { spendenHinweis.offen = false; };

const TAKT_MS = 15_000;
let laeuft = false;

export function starteSpendenzaehler(): void {
  if (laeuft || !spendeMoeglich()) return;
  laeuft = true;
  let letzterTakt = Date.now();
  let letzteEingabe = Date.now();
  const eingabe = () => { letzteEingabe = Date.now(); };
  for (const t of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']) addEventListener(t, eingabe, { passive: true, capture: true });
  setInterval(() => {
    const jetzt = Date.now();
    const dt = Math.min(jetzt - letzterTakt, 2 * TAKT_MS);
    letzterTakt = jetzt;
    if (document.visibilityState !== 'visible' || jetzt - letzteEingabe > RUHE_MS) return;
    const r = addiere(standLesen(), dt);
    standSchreiben(r.stand);
    if (r.faellig && !erinnerungAus()) { spendenHinweis.stunden = r.stunden; spendenHinweis.offen = true; }
  }, TAKT_MS);
}
