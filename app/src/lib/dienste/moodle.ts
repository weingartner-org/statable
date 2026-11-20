/**
 * Moodle Questionnaire (Plugin mod_questionnaire) erkennen (Paket 1C). NACH QUELLCODE UND SPRACHDATEI ERKANNT, NICHT AN ECHTEN EXPORTEN GEPRÜFT
 * (Quelle: docs/erheben/KOPFZEILEN-DIENSTE.md Abschnitt 8; Prüfdateien testdaten/dienste/moodlequestionnaire/).
 * Merkmal: die Köpfe `Response` und `Submitted on:` UND Datumszellen `d/m/Y H:i:s` in der Spalte `Submitted on:`. Ohne die Datumszellen wird nichts erkannt.
 */
export const MOODLE_META = /^(response|submitted on:|institution|department|course|group|user id|user idnumber|full name|username)$/i;
export const MOODLE_ZEIT = /^submitted on:$/i;
const MOODLE_PERSONENBEZUG = /^(institution|department|group|user id|user idnumber|full name|username)$/i;
const DATUM = /^\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2}$/;

export function istMoodleQuestionnaire(kopf: string[], zeilen: unknown[][]): boolean {
  const k = kopf.map(x => x.trim().toLowerCase());
  const i = k.indexOf('submitted on:');
  if (i < 0 || !k.includes('response')) return false;
  const z = zeilen.map(r => r[i]).filter(v => typeof v === 'string' && v.trim() !== '') as string[];
  return z.length > 0 && z.every(v => DATUM.test(v.trim()));
}

/** Personenbezug dieser Moodle-Spalte: Zellen müssen gefüllt sein; „Full name“ zählt nicht, wenn alle gefüllten Zellen mit „Anonymous“ beginnen. */
export function moodlePersonenbezug(kopf: string, zellen: unknown[]): boolean {
  if (!MOODLE_PERSONENBEZUG.test(kopf.trim())) return false;
  const voll = zellen.filter(v => v !== null && v !== undefined && String(v).trim() !== '').map(v => String(v).trim());
  if (!voll.length) return false;
  if (/^full name$/i.test(kopf.trim()) && voll.every(v => /^anonymous/i.test(v))) return false;
  return true;
}
