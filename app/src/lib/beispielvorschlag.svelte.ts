/** Vom Beispiel-Begleiter: eine ausgefüllte Frage, die das Blatt „Neue Auswertung“ beim Öffnen übernimmt (wie der Vorschlag zum Mehrebenenmodell). */
import type { Werte } from './verfahren';

export const frageVorschlag = $state<{ v: { art: string; w: Werte } | null }>({ v: null });

/** Welches Beispiel gerade geübt wird (zum Projekt gehörig); überlebt das Neuladen. `namen`: Spaltenname der Datei → Name in den Daten (in der Sprache beim Öffnen). */
const SCHLUESSEL = 'statable-beispiel-lauf';
/** `von`: das Beispiel wurde aus dem Bereich „Lernen“ geöffnet (Einheit, Abschnitt und Schritt); der Begleiter bietet dann den Weg zurück. */
export type LaufVon = { einheit: string; schluessel: string; nr: number; schritt: number };
/** `nur`: die Daten enthalten nur die Spalten dieses einen Schrittes (aus „Lernen“ geöffnet: das Beispiel zeigt genau den Lernstoff). */
type Lauf = { id: string; projekt: string; namen?: Record<string, string>; von?: LaufVon; nur?: string[] };
function lies(): Lauf | null {
  try { return JSON.parse(localStorage.getItem(SCHLUESSEL) ?? 'null'); } catch { return null; }
}
export const lauf = $state<{ a: Lauf | null; offen: boolean; schritt: number }>({ a: lies(), offen: true, schritt: 0 });
export function starteLauf(id: string, projekt: string, namen?: Record<string, string>, von?: LaufVon, nur?: string[]) {
  lauf.a = { id, projekt, ...(namen ? { namen } : {}), ...(von ? { von } : {}), ...(nur?.length ? { nur } : {}) }; lauf.offen = true; lauf.schritt = von?.schritt ?? 0;
  speichereLauf();
}
/** Läuft das Beispiel schon im offenen Projekt, genügt es, den Schritt zu wählen und den Weg zurück zu merken. */
export function setzeVon(von: LaufVon) {
  if (!lauf.a) return;
  lauf.a = { ...lauf.a, von }; lauf.offen = true; lauf.schritt = von.schritt;
  speichereLauf();
}
function speichereLauf() {
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(lauf.a)); } catch { /* ohne Speicher: gilt bis zum Neuladen */ }
}
export function beendeLauf() {
  lauf.a = null;
  try { localStorage.removeItem(SCHLUESSEL); } catch { /* egal */ }
}
