/** Sofort rechnen (wie jamovi und JASP): ein Blatt rechnet sich neu, sobald sich Spalten oder Optionen ändern.
 *  Dieses Modul hat bewusst keine Oberfläche: Entprellen, Laufnummer, „R nur, wenn schon geladen“ und der Datenstand sind reine Logik und getestet.
 *  Regeln: (1) Entprellt, damit ein Klick-Gewitter nur eine Rechnung auslöst. (2) Eine überholte Rechnung wird nie angezeigt (Laufnummer und Schlüssel).
 *  (3) Das alte Ergebnis bleibt stehen, bis das neue fertig ist - es gibt keine halben Blätter. */
import { fehlendSchluessel, type FehlendBereich } from './fehlend';

export const ENTPRELLEN_MS = 350;
/** Das Ergebnis wird leicht abgeblendet, wenn die Rechnung länger dauert als dies (kurze Rechnungen bleiben unsichtbar). */
export const ABBLENDEN_NACH_MS = 150;
/** Der Hinweis „Wird neu gerechnet …“ erscheint erst danach. */
export const HINWEIS_NACH_MS = 500;

/** Verfahren, die R (webR) brauchen: Sie rechnen nur von selbst, wenn R schon geladen ist. Das Laden (Dutzende MB) löst nur der Knopf aus. */
export const R_VERFAHREN = ['mehrebenen', 'meta'];
export const brauchtR = (verfahrenId: string) => R_VERFAHREN.includes(verfahrenId);
/** Braucht dieses Blatt R? Die Frage „Lässt sich etwas vorhersagen?“ nur mit ordinalem, multinomialem oder Zähldaten-Modell (Welle 3); alte Blätter ohne `modell` sind linear. */
export const brauchtRBlatt = (art: string, zus?: { modell?: { art: string }; cox?: { an: boolean } }, gewicht?: { rechenweg?: string }) => brauchtR(art) || (art === 'vorhersage' && !!zus?.modell && zus.modell.art !== 'linear') || (art === 'kaplanmeier' && !!zus?.cox?.an) || gewicht?.rechenweg === 'survey';   // Später S-D2: Umfragegewicht mit Standardfehlern von survey
/** Darf von selbst gerechnet werden? Nur mit eingeschaltetem „Sofort rechnen“, und bei R-Verfahren nur, wenn R bereit ist. */
export const rechnetVonSelbst = (o: { sofort: boolean; verfahrenId: string; rBereit: boolean; /** das Blatt braucht R, auch wenn die Frage es sonst nicht tut (Welle 3) */ mitR?: boolean }) => o.sofort && (!(brauchtR(o.verfahrenId) || o.mitR) || o.rBereit);

/** Eine fortlaufende Nummer: Wer eine Rechnung startet, holt eine neue; nur die jüngste gilt. */
export function laufnummer() {
  let n = 0;
  return { neu: () => ++n, aktuell: (x: number) => x === n, aktuelleNummer: () => n };
}

export interface LiveOptionen<T> {
  /** Entprellzeit in ms */
  ms?: number;
  /** Die eigentliche Rechnung. `gilt()` wird false, sobald eine neuere Rechnung gestartet wurde (dann früh aufhören). */
  rechne: (schluessel: string, gilt: () => boolean) => Promise<T>;
  /** Nur hier wird ein Ergebnis angezeigt - und nur ein fertiges, nicht überholtes. */
  zeige: (ergebnis: T, schluessel: string) => void;
  /** true, sobald etwas ansteht oder rechnet; false, wenn alles ruht (für Abblenden und Hinweis). */
  beschaeftigt?: (an: boolean) => void;
  fehler?: (fehler: unknown, schluessel: string) => void;
  /** Zeitgeber (für Tests austauschbar) */
  setze?: (f: () => void, ms: number) => unknown;
  loesche?: (t: unknown) => void;
}

/** Steuert die Live-Rechnung eines Blatts. `wunsch(schluessel)` meldet bei jeder Änderung den Schlüssel der gewünschten Rechnung (Spalten + Optionen + Datenstand). */
export function liveRechner<T>(opt: LiveOptionen<T>) {
  const setze = opt.setze ?? ((f: () => void, ms: number) => setTimeout(f, ms));
  const loesche = opt.loesche ?? ((t: unknown) => clearTimeout(t as ReturnType<typeof setTimeout>));
  let basis: string | null = null;   // Schlüssel, zu dem das angezeigte Ergebnis gehört (oder gerade gerechnet wird)
  let gewuenscht: string | null = null;
  let timer: unknown;
  let lauf = 0;
  let laeuft = false;
  let busy = false;
  const melde = (b: boolean) => { if (b !== busy) { busy = b; opt.beschaeftigt?.(b); } };
  const stopTimer = () => { if (timer !== undefined) { loesche(timer); timer = undefined; } };

  async function start() {
    timer = undefined;
    const schluessel = gewuenscht;
    if (schluessel === null) { if (!laeuft) melde(false); return; }
    if (schluessel === basis) { if (!laeuft) melde(false); return; }
    basis = schluessel;
    const meine = ++lauf;
    laeuft = true;
    let ergebnis: T;
    try { ergebnis = await opt.rechne(schluessel, () => meine === lauf); }
    catch (f) {
      if (meine !== lauf) return;
      laeuft = false; basis = null;
      if (timer === undefined) melde(false);
      opt.fehler?.(f, schluessel);
      return;
    }
    if (meine !== lauf) return;                 // überholt: nie anzeigen
    laeuft = false;
    if (schluessel !== gewuenscht) {            // inzwischen etwas anderes gewünscht: nicht anzeigen, die nächste Rechnung ist unterwegs
      basis = null;
      if (timer === undefined) { timer = setze(() => void start(), 0); }
      return;
    }
    melde(false);
    opt.zeige(ergebnis, schluessel);
  }

  return {
    /** Das angezeigte Ergebnis passt schon zu diesem Schlüssel (z. B. ein fertiges Blatt wurde geöffnet); null: es passt zu nichts. */
    uebernimm(schluessel: string | null) { stopTimer(); lauf++; laeuft = false; basis = schluessel; gewuenscht = schluessel; melde(false); },
    /** Der Wunsch hat sich (vielleicht) geändert: gleich dem Angezeigten = nichts tun, sonst entprellt rechnen. */
    wunsch(schluessel: string) {
      gewuenscht = schluessel;
      if (schluessel === basis) { stopTimer(); if (!laeuft) melde(false); return; }
      melde(true); stopTimer(); timer = setze(() => void start(), opt.ms ?? ENTPRELLEN_MS);
    },
    /** Ohne Wartezeit (Knopf „Neu rechnen“). */
    jetzt(schluessel: string) { gewuenscht = schluessel; stopTimer(); melde(true); void start(); },
    /** Alles Anstehende verwerfen (Seite verlassen). */
    verwerfe() { stopTimer(); lauf++; laeuft = false; basis = null; gewuenscht = null; melde(false); },
    get anstehend() { return timer !== undefined || laeuft; }
  };
}

/** Ein kurzer Stand der Daten, die ein Blatt benutzt (Namen, Art, „keine Angabe“-Werte, alle Werte). Ändert sich der Stand, ist das Blatt veraltet. */
export function spaltenStand(namen: string[], spalten: { name: string; art?: string; fehlend?: number[]; fehlendBereich?: FehlendBereich }[], zeilen: (string | number | null)[][]): string {
  let h = 0x811c9dc5;
  const mische = (t: string) => { for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } h ^= 0xff; h = Math.imul(h, 0x01000193) >>> 0; };
  for (const n of [...new Set(namen)].sort()) {
    const i = spalten.findIndex(sp => sp.name === n);
    if (i < 0) { mische('?' + n); continue; }
    mische(n); mische(spalten[i]!.art ?? ''); mische(fehlendSchluessel(spalten[i] ? { fehlend: spalten[i]!.fehlend ?? [], fehlendBereich: spalten[i]!.fehlendBereich } : null));
    for (const z of zeilen) mische(z[i] === null || z[i] === undefined ? '' : String(z[i]));
  }
  return h.toString(36) + ':' + zeilen.length;
}
