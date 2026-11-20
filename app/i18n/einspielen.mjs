/**
 * Regel für `uebersetzen.mjs --zusammen`: Ein Wert aus out-<teil>.json kommt nur in die Sprachdatei,
 * wenn der Schlüssel dort FEHLT oder leer ist. Vorhandene Werte (auch Handkorrekturen) bleiben.
 * Mit `ueberschreiben` gilt der alte Fall: out-Wert ersetzt alles.
 * Rückgabe: 'neu' (eingetragen), 'gleich' (schon so da), 'behalten' (vorhanden und anders - nicht angefasst), 'ersetzt' (nur mit ueberschreiben).
 */
export const leer = w => w === undefined || w === null || w === '' || (typeof w === 'object' && Object.keys(w).length === 0);

export function einspielen(ziel, k, wert, ueberschreiben = false) {
  const alt = ziel[k];
  if (leer(alt)) { ziel[k] = wert; return 'neu'; }
  if (JSON.stringify(alt) === JSON.stringify(wert)) return 'gleich';
  if (ueberschreiben) { ziel[k] = wert; return 'ersetzt'; }
  return 'behalten';
}
