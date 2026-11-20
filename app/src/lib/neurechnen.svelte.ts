/** Veraltete Blätter neu rechnen, ohne sie zu öffnen (Abnahme 4, B1). Der Bericht und jeder Export rufen `neuRechnen`; die Warteschlange rechnet ein Blatt nach dem anderen
 *  (PSPP ist nur einmal da). Gerechnet wird von der Blatt-Seite selbst (`Blatt.svelte` mit `nurRechnen`): Sie zeichnet nichts, sondern benutzt dieselbe Rechnung wie „Sofort rechnen“,
 *  damit Bericht, Export und Blatt nie zweierlei Zahlen liefern. Wer die Seite einhängt, ist `Bericht.svelte` (Rechenknecht). */
import { brauchtRBlatt } from './live';

export interface Auftrag { id: string; mitR: boolean }
export const rechenstand = $state<{ aktuell: Auftrag | null; gesamt: number; fertig: number; gescheitert: string[] }>({ aktuell: null, gesamt: 0, fertig: 0, gescheitert: [] });

let wartend: Auftrag[] = [];
let fertigMelder: (() => void)[] = [];
let uhr: ReturnType<typeof setTimeout> | undefined;
/** Längstens so lange darf ein Blatt rechnen (R laden dauert länger). */
export const HOECHSTDAUER_MS = 25_000, HOECHSTDAUER_R_MS = 240_000;

function weiter() {
  if (rechenstand.aktuell) return;
  clearTimeout(uhr);
  const n = wartend.shift();
  if (!n) {
    rechenstand.aktuell = null; rechenstand.gesamt = 0; rechenstand.fertig = 0;
    const m = fertigMelder; fertigMelder = []; for (const f of m) f();
    return;
  }
  rechenstand.aktuell = n;
  uhr = setTimeout(() => ende(n.id, false), n.mitR ? HOECHSTDAUER_R_MS : HOECHSTDAUER_MS);
}

/** Das Blatt, das gerade rechnet, ist fertig (ok) oder konnte nicht gerechnet werden (nicht ok). */
export function ende(id: string, ok: boolean) {
  if (rechenstand.aktuell?.id !== id) return;
  rechenstand.fertig++;
  if (!ok && !rechenstand.gescheitert.includes(id)) rechenstand.gescheitert.push(id);
  if (ok) rechenstand.gescheitert = rechenstand.gescheitert.filter(x => x !== id);
  rechenstand.aktuell = null;
  queueMicrotask(weiter);
}

/** Darf ein Blatt ohne Zutun gerechnet werden? R-Verfahren nur, wenn R schon geladen ist - oder wenn die Person es ausdrücklich verlangt (`mitR`). */
export const darfNeuRechnen = (art: string, rBereit: boolean, mitR = false, zus?: { modell?: { art: string }; cox?: { an: boolean } }, gewicht?: { rechenweg?: string }) => !brauchtRBlatt(art, zus, gewicht) || rBereit || mitR;

/** Reiht Blätter ein und wartet, bis alle durch sind (auch die, die scheitern). `ids` ohne Doppelte; was schon dran ist, bleibt. */
export function neuRechnen(auftraege: Auftrag[]): Promise<void> {
  for (const a of auftraege) {
    if (rechenstand.aktuell?.id === a.id || wartend.some(w => w.id === a.id)) continue;
    wartend.push(a); rechenstand.gesamt++;
  }
  if (!rechenstand.aktuell && !wartend.length) return Promise.resolve();
  const p = new Promise<void>(r => fertigMelder.push(r));
  if (!rechenstand.aktuell) weiter();
  return p;
}

/** Alles verwerfen (Bericht verlassen): Wartende werden nicht mehr gerechnet, wer wartet, wird freigegeben. */
export function neuRechnenAbbrechen() {
  clearTimeout(uhr); wartend = []; rechenstand.aktuell = null; rechenstand.gesamt = 0; rechenstand.fertig = 0;
  const m = fertigMelder; fertigMelder = []; for (const f of m) f();
}
