/** Die Fachgebiete des Schalters „Mein Fachgebiet“ (nur die Kennungen; Namen, Matrix und Suche stehen in lib/fach.ts). Ohne Abhängigkeiten, damit die Einstellungen sie laden können. */
export const FACH_IDS = ['bildung', 'medizin', 'bio', 'wirtschaft', 'technik', 'informatik', 'alle'] as const;
export type FachId = (typeof FACH_IDS)[number];
export const FACH_STANDARD: FachId = 'bildung';
/** Gespeicherter Wert → gültige Kennung; alte Speicherstände ohne Feld und Unsinn ergeben „Bildung und Psychologie“ (wie bisher alle Karten). */
export const fachAusSpeicher = (x: unknown): FachId => ((FACH_IDS as readonly unknown[]).includes(x) ? (x as FachId) : FACH_STANDARD);
