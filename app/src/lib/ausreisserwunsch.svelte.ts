/**
 * Vom Daten-Check zum Ausreißertest (Später, Welle S-D, T2): Der Knopf „Mit einem Test genauer prüfen“ öffnet die Frage „Wie verteilt sich etwas?“ mit dieser Spalte
 * und merkt sich, dass „Ausreißer prüfen“ gleich angeschaltet sein soll. Das Blatt holt den Wunsch beim Öffnen ab; ein Wunsch verfällt nach zwei Minuten.
 */
export const ausreisserWunsch = $state<{ spalte: string | null; zeit: number }>({ spalte: null, zeit: 0 });
export const WUNSCH_DAUER = 120_000;
export function wuensche(spalte: string) { ausreisserWunsch.spalte = spalte; ausreisserWunsch.zeit = Date.now(); }
/** Gibt die Spalte zurück (einmal) und löscht den Wunsch. */
export function holeWunsch(): string | null {
  const sp = ausreisserWunsch.spalte, frisch = Date.now() - ausreisserWunsch.zeit < WUNSCH_DAUER;
  ausreisserWunsch.spalte = null;
  return sp && frisch ? sp : null;
}
