/**
 * Google Forms (CSV oder Tabelle) VERMUTLICH erkennen (Paket 1B). Die Quellenlage ist schwach: Der Aufbau der Datei ist nirgends beschrieben, belegt ist nur ein Beispiel aus einem Forum
 * (docs/erheben/KOPFZEILEN-DIENSTE.md Abschnitt 1). Darum ist `Erkennung.sicher` hier immer false und der Dialog sagt „vermutlich Google Forms“.
 * NACH DOKUMENTATION ERKANNT, NICHT AN ECHTEN EXPORTEN GEPRÜFT.
 * Merkmal (beides zugleich, nie eines allein): die ERSTE Spalte heißt `Timestamp` oder `Zeitstempel` UND ihre gefüllten Zellen sehen aus wie ein Datum mit Uhrzeit (`8/6/2023 9:34:20`, `06.08.2023 09:34:20`).
 * Mehrfachauswahl `, `, Raster `Frage [Zeile]`. Die Zeitzone steht nicht in der Datei.
 */
export const GOOGLE_META = /^(timestamp|zeitstempel)$/i;
export const GOOGLE_ZEIT = GOOGLE_META;
export const GOOGLE_TRENNER = ', ';
const DATUM = /^\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4},? \d{1,2}:\d{2}(:\d{2})?( ?[AaPp][Mm])?$/;

export function istGoogleForms(kopf: string[], zeilen: unknown[][] = []): boolean {
  if (!kopf.length || !GOOGLE_META.test(kopf[0]!.trim())) return false;
  const z = zeilen.map(r => r[0]).filter(v => v !== null && v !== undefined && !(typeof v === 'string' && v.trim() === ''));
  return z.length > 0 && z.every(v => v instanceof Date || (typeof v === 'string' && DATUM.test(v.trim())));
}
