/** Die Erinnerung ans Speichern in eine Datei: Warnung beim Schließen des Tabs und der ruhige Hinweis nach längerer Arbeit. Regeln in `erinnerung.ts`. */
import { s, projektSchuetzenswert, projektSpeichern, meldeGespeichert, autoSpeichern } from './sitzung.svelte';
import { sollErinnern, warnenBeimVerlassen } from './erinnerung';

export const hinweis = $state({ offen: false });
const gezeigt = new Set<string>();   // je Projekt einmal pro Sitzung
const AUS = 'statable-erinnern-aus';
const AUTO_NACH_MS = 4000;
const abgeschaltet = (id: string) => { try { return (JSON.parse(localStorage.getItem(AUS) ?? '[]') as string[]).includes(id); } catch { return false; } };

/** Prüft jetzt, ob der Hinweis fällig ist (sonst schließt es ihn, wenn er überholt ist). */
export function pruefeErinnerung(jetzt = Date.now()) {
  const id = s.projekt?.id;
  if (!id || !s.ungesichert) { hinweis.offen = false; return; }
  if (sollErinnern({ offen: true, ungesichert: s.ungesichert, seit: s.ungesichertSeit, jetzt, schuetzenswert: projektSchuetzenswert(), schonGezeigt: gezeigt.has(id), abgeschaltet: abgeschaltet(id) })) {
    gezeigt.add(id); hinweis.offen = true;
  }
}
export const schliesseHinweis = () => { hinweis.offen = false; };
export function nichtMehrErinnern() {
  hinweis.offen = false;
  const id = s.projekt?.id; if (!id) return;
  try { const l = JSON.parse(localStorage.getItem(AUS) ?? '[]') as string[]; if (!l.includes(id)) localStorage.setItem(AUS, JSON.stringify([...l, id].slice(-200))); } catch { /* ohne Speicher: nur für diese Sitzung */ }
}
export async function hinweisSpeichern() {
  hinweis.offen = false;
  const name = await projektSpeichern();
  if (name) meldeGespeichert(name);
}

/** Startet die Prüfung (alle 30 Sekunden) und die Warnung beim Verlassen; gibt die Aufräum-Funktion zurück. */
export function starteErinnerung(): () => void {
  const uhr = setInterval(() => pruefeErinnerung(), 30000);
  // Autospeichern: einige Sekunden nach der ersten ungesicherten Änderung still in die Datei (nur wenn schon einmal in eine Datei gespeichert).
  const auto = setInterval(() => { if (s.ungesichert && s.ungesichertSeit !== null && Date.now() - s.ungesichertSeit >= AUTO_NACH_MS) void autoSpeichern(); }, 2000);
  const vor = (e: BeforeUnloadEvent) => {
    if (warnenBeimVerlassen({ offen: !!s.projekt, ungesichert: s.ungesichert, schuetzenswert: projektSchuetzenswert() })) { e.preventDefault(); e.returnValue = ''; }
  };
  addEventListener('beforeunload', vor);
  return () => { clearInterval(uhr); clearInterval(auto); removeEventListener('beforeunload', vor); };
}
