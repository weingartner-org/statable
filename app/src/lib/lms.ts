/**
 * V4 (14.11.2026): Statable meldet der Startseite eines SCORM-Pakets (`lib/scorm.ts`), dass ein Pfad abgeschlossen ist.
 * Nur wenn die Seite über einen SCORM-Link geöffnet wurde (`?lms=scorm`) und ein öffnendes Fenster da ist.
 * Die Meldung trägt nur Stand und Zahlen, keinen Namen, keine Antworten; die Startseite prüft Herkunft und Fenster.
 */
import { LMS_ART, LMS_FASSUNG } from './scorm';

export interface LmsMeldung { art: typeof LMS_ART; fassung: typeof LMS_FASSUNG; status: 'completed'; beantwortet: number; gesamt: number }

export const baueMeldung = (beantwortet: number, gesamt: number): LmsMeldung => ({ art: LMS_ART, fassung: LMS_FASSUNG, status: 'completed', beantwortet, gesamt });

/** Wurde Statable aus einem SCORM-Paket geöffnet? */
export function lmsModus(suche: string = typeof location === 'undefined' ? '' : location.search): boolean {
  try { return new URLSearchParams(suche).get('lms') === 'scorm'; } catch { return false; }
}

/** Schickt die Meldung an das öffnende Fenster. Gibt zurück, ob etwas geschickt wurde. */
export function meldeAbschluss(beantwortet: number, gesamt: number, w: Window | undefined = typeof window === 'undefined' ? undefined : window): boolean {
  if (!w || !lmsModus(w.location.search) || gesamt <= 0 || beantwortet < gesamt) return false;
  const ziel = w.opener as Window | null;
  if (!ziel || ziel === w) return false;
  // Ziel '*': Die Lernplattform hat einen fremden, unbekannten Ursprung; die Meldung enthält nichts Persönliches.
  try { ziel.postMessage(baueMeldung(beantwortet, gesamt), '*'); return true; } catch { return false; }
}
