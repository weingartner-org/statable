/** Zeitmarken für Messungen (Große Daten 31.10.): `performance.getEntriesByName('gr:…')`. Kostet nichts und ändert nichts. */
export const zm = (name: string): void => { try { performance.mark('gr:' + name); } catch { /* ohne Marke weiter */ } };
