/**
 * KoboToolbox-Export erkennen (Paket 1C). NACH DOKUMENTATION UND FORUMSBERICHTEN ERKANNT, NICHT AN ECHTEN EXPORTEN GEPRÜFT
 * (Quelle: docs/erheben/KOPFZEILEN-DIENSTE.md Abschnitt 5; Prüfdateien testdaten/dienste/kobo/).
 * Merkmal: mindestens zwei von `_id`, `_uuid`, `_submission_time` UND ein weiteres Merkmal (ein „/“ in einem Kopf, `_validation_status`, `_index`, `_submitted_by`).
 * Ein einzelner Systemkopf genügt nie.
 */
export const KOBO_META = /^(start|end|today|deviceid|__version__|formhub\/uuid|meta\/instanceid|meta\/rootuuid|_id|_uuid|_submission_time|_validation_status|_notes|_status|_submitted_by|_tags|_index|_parent_index|_parent_table_name|_geolocation)$/i;
export const KOBO_ZEIT = /^(start|end|today|_submission_time)$/i;
/** Einzig sicher personenbezogen: wer die Antwort abgeschickt hat (nur mit gefüllten Zellen, das prüft der Aufrufer). */
export const KOBO_PERSONENBEZUG = /^_submitted_by$/i;

export function istKobo(kopf: string[]): boolean {
  const k = new Set(kopf.map(x => x.trim().toLowerCase()));
  const system = ['_id', '_uuid', '_submission_time'].filter(x => k.has(x)).length;
  if (system < 2) return false;
  return kopf.some(x => x.includes('/')) || ['_validation_status', '_index', '_submitted_by'].some(x => k.has(x));
}
