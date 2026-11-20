/** Nebenseiten (Einstellungen, Hilfe, Impressum, Datenschutz) haben alle denselben Weg zurück:
 *  zur letzten Arbeitsseite, nicht `history.back()` - das führte aus Statable hinaus, wenn die Seite direkt geöffnet wurde. */
const NEBEN = ['einstellungen', 'hilfe', 'beispiele', 'planen', 'fragebogen', 'interviews', 'kodieren', 'station', 'verstehen', 'lernen', 'r-probe', 'impressum', 'datenschutz', 'behoerden', 'barrierefreiheit'];
let letzte = '';
let davor = '';   // die Arbeitsseite vor der jetzigen (für „Fertig“ auf Spalten)

export const istNeben = (hash: string) => NEBEN.includes(hash.split('/')[0] ?? '');
export function merkeSeite(hash: string) { if (!istNeben(hash)) { const neu = hash || 'start'; if (neu !== letzte) davor = letzte; letzte = neu; } }
/** Wohin „Fertig“ führt: die Seite, von der man kam (nicht die jetzige), sonst die Daten. */
export const herkunftSeite = (jetzt: string) => (davor && davor !== jetzt && davor !== 'start' ? davor : 'daten');
export function zurueck(mitDaten: boolean) { location.hash = letzte || (mitDaten ? 'daten' : 'start'); }

/** Wohin `zurueck()` führt (für den Namen im Knopf „Zurück zu …“). */
export const letzteSeite = (mitDaten: boolean) => letzte || (mitDaten ? 'daten' : 'start');
