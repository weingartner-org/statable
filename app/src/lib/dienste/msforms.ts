/**
 * Microsoft Forms (XLSX, „Antworten“) erkennen (Paket 1B). NACH DER MICROSOFT-HILFE UND FORENBERICHTEN ERKANNT, NICHT AN ECHTEN EXPORTEN GEPRÜFT
 * (Quelle: docs/erheben/KOPFZEILEN-DIENSTE.md Abschnitt 2; Prüfdateien testdaten/dienste/msforms/). Deutsche Kopfzeilen sind nicht belegt.
 * Merkmal: mindestens drei der Köpfe `ID`, `Start time`, `Completion time`, `Email`, `Name`, darunter mindestens eine der beiden Zeiten
 * (sonst würde jede Tabelle mit ID, Name und E-Mail erkannt). Zeitzone UTC (Quelle: Q&A, „may be“). Mehrfachauswahl: `;` ohne Leerzeichen, am Ende ein `;`.
 */
export const MSFORMS_META = /^(id|start time|completion time|email|name|last modified time)$/i;
export const MSFORMS_ZEIT = /^(start time|completion time|last modified time)$/i;
const MSFORMS_PERSONENBEZUG = /^(email|name)$/i;
export const MSFORMS_TRENNER = ';';

export function istMsForms(kopf: string[]): boolean {
  const k = new Set(kopf.map(x => x.trim().toLowerCase()));
  const treffer = ['id', 'start time', 'completion time', 'email', 'name'].filter(x => k.has(x)).length;
  return treffer >= 3 && (k.has('start time') || k.has('completion time'));
}

/** E-Mail und Name zählen nur, wenn mindestens eine Zelle gefüllt ist (bei anonymen Formularen sind sie leer). */
export function msformsPersonenbezug(kopf: string, zellen: unknown[]): boolean {
  return MSFORMS_PERSONENBEZUG.test(kopf.trim()) && zellen.some(v => v !== null && v !== undefined && String(v).trim() !== '');
}
