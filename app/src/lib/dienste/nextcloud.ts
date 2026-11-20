/**
 * Nextcloud Forms (CSV, XLSX, ODS) erkennen (Paket 1B). NACH QUELLCODE ERKANNT, NICHT AN ECHTEN EXPORTEN GEPRÜFT
 * (Quelle: docs/erheben/KOPFZEILEN-DIENSTE.md Abschnitt 3; Prüfdateien testdaten/dienste/nextcloud/). Eigenes Format, nicht das von Google:
 * `Submission ID`, `User ID`, `User display name`, `Timestamp` (de `Einreichungs-ID`, `Benutzer-ID`, `Anzeigename des Nutzers`, `Zeitstempel`), Zeit ISO 8601 mit Verschiebung,
 * Mehrfachauswahl mit `; `, Raster `Frage (Zeile)`, Antwort „Anderes“ als `system-other-answer:Text`.
 * Merkmal: mindestens drei der vier Köpfe; steht die Zeitspalte da, passen ihre Zellen zu ISO 8601.
 */
const KOEPFE = [['submission id', 'einreichungs-id'], ['user id', 'benutzer-id'], ['user display name', 'anzeigename des nutzers'], ['timestamp', 'zeitstempel']];
export const NEXTCLOUD_META = /^(submission id|einreichungs-id|user id|benutzer-id|user display name|anzeigename des nutzers|timestamp|zeitstempel)$/i;
export const NEXTCLOUD_ZEIT = /^(timestamp|zeitstempel)$/i;
const NEXTCLOUD_PERSONENBEZUG = /^(user id|benutzer-id|user display name|anzeigename des nutzers)$/i;
export const NEXTCLOUD_TRENNER = '; ';
export const NEXTCLOUD_ANDERES = /^system-other-answer:\s*/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

export function istNextcloud(kopf: string[], zeilen: unknown[][] = []): boolean {
  const k = kopf.map(x => x.trim().toLowerCase());
  const treffer = KOEPFE.filter(namen => namen.some(n => k.includes(n))).length;
  if (treffer < 3) return false;
  const i = k.findIndex(x => x === 'timestamp' || x === 'zeitstempel');
  if (i >= 0) { const z = zeilen.map(r => r[i]).filter(v => v !== null && v !== undefined && String(v).trim() !== ''); if (z.length && !z.every(v => typeof v === 'string' && ISO.test(v.trim()))) return false; }
  return true;
}

/** Personenbezug: gefüllte Zellen; ein Anzeigename „Anonymer Benutzer“ / „Anonymous user“ in allen gefüllten Zellen zählt nicht. */
export function nextcloudPersonenbezug(kopf: string, zellen: unknown[]): boolean {
  if (!NEXTCLOUD_PERSONENBEZUG.test(kopf.trim())) return false;
  const voll = zellen.filter(v => v !== null && v !== undefined && String(v).trim() !== '').map(v => String(v).trim());
  if (!voll.length) return false;
  if (/^(user display name|anzeigename des nutzers)$/i.test(kopf.trim()) && voll.every(v => /^anonym/i.test(v))) return false;
  return true;
}
