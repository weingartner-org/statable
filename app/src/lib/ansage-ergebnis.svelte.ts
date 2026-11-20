/**
 * Ergebnis-Ansagen mit Ruhe (Barrierefreiheit F6). Ersetzt die vielen `aria-live`-Regionen um Ergebnis-Zahlen und Ergebnis-Sätze:
 * Während jemand tippt oder einen Regler zieht, bleibt es still; erst `ERGEBNIS_RUHE_MS` nach dem letzten neuen Wert kommt EINE Ansage
 * (über `sage()` aus `lib/ansage.ts`, also über die feste Region). Zwei Wege:
 * - `use:ergebnisAnsage` an einem Element: sagt dessen Text an, wenn er sich ändert (`anfang: true`: auch der erste Text, wenn das Ergebnis erst nach längerer Rechnung erscheint). Erscheint das Element als Folge einer Eingabe (Eingabe, Auswahl, Knopf
 *   in den letzten `EINGABE_FENSTER_MS`), wird auch der erste Text angesagt; sonst (Seite oder Karte wird nur geöffnet) bleibt der erste Text still.
 * - `ansageErgebnis(() => text)` in einer Komponente: für größere Bereiche, bei denen ein kurzer Satz statt des ganzen Inhalts angesagt wird.
 *   Ein leerer Text sagt nichts (z. B. während gerechnet wird).
 */
import { sage } from './ansage';

export const ERGEBNIS_RUHE_MS = 700;
export const EINGABE_FENSTER_MS = 1500;
/** Kartensuche im Blatt: Mit NVDA-Tastenecho vergehen zwischen zwei Buchstaben oft mehr als 700 ms; mit 1200 ms kommt nur der Endstand (Messung NVDA-REST-B Teil 3). */
export const KARTENSUCHE_RUHE_MS = 1200;

export interface Entprellt { push(text: string): void; stop(): void }
type Nach = (f: () => void, ms: number) => () => void;
const echtNach: Nach = (f, ms) => { const t = setTimeout(f, ms); return () => clearTimeout(t); };

/** Sammelt Werte; erst wenn `ms` lang kein neuer kommt, geht der letzte an `sagef`. Rein, ohne Browser testbar. */
export function entprellt(sagef: (text: string) => void, ms = ERGEBNIS_RUHE_MS, nach: Nach = echtNach): Entprellt {
  let zurueck: (() => void) | null = null;
  return {
    push(text) { zurueck?.(); zurueck = nach(() => { zurueck = null; sagef(text); }, ms); },
    stop() { zurueck?.(); zurueck = null; },
  };
}

export const glatt = (t: string | null | undefined): string => (t ?? '').replace(/\s+/g, ' ').trim();

/* ---------- Wann hat der Mensch zuletzt etwas eingegeben? ---------- */
let zuletztEingabe = -Infinity;
export const setzeEingabeZeit = (z: number) => { zuletztEingabe = z; };
export const eingabeJuengst = (jetzt = Date.now()): boolean => jetzt - zuletztEingabe < EINGABE_FENSTER_MS;
if (typeof document !== 'undefined') {
  const merke = () => { zuletztEingabe = Date.now(); };
  document.addEventListener('input', merke, true);
  document.addEventListener('change', merke, true);
  document.addEventListener('click', e => {
    const t = e.target as Element | null;
    if (t?.closest?.('button, input, select, label, [role="switch"]') && !t.closest('a, .kachel, [role="tab"]')) merke();
  }, true);
}

/**
 * Svelte-Aktion: `<p use:ergebnisAnsage>…</p>`. Option `satz` = CSS-Auswahl innerhalb des Elements; dann zählt nur der Text der ersten `anzahl`
 * (Standard 1) passenden Kinder (für große Bereiche: der Ergebnissatz statt alles).
 */
export interface ErgebnisOpt { ms?: number; anfang?: boolean; satz?: string; anzahl?: number; ersatz?: string }
export function ergebnisAnsage(knoten: HTMLElement, opt?: ErgebnisOpt) {
  const e = entprellt(t => { sage(t); }, opt?.ms);
  const hole = (sel: string, n: number) => glatt(Array.from(knoten.querySelectorAll(sel)).slice(0, n).map(k => k.textContent).join(' '));
  /** `ersatz`: Auswahl, die gilt, wenn `satz` nichts findet (erstes Treffer-Element). */
  const lies = () => opt?.satz ? (hole(opt.satz, opt.anzahl ?? 1) || (opt.ersatz ? hole(opt.ersatz, 1) : '')) : glatt(knoten.textContent);
  let letzter = lies();
  if (letzter && (opt?.anfang || eingabeJuengst())) e.push(letzter);
  const beob = new MutationObserver(() => {
    const t = lies();
    if (t === letzter) return;
    letzter = t;
    if (t) e.push(t); else e.stop();
  });
  beob.observe(knoten, { childList: true, subtree: true, characterData: true });
  return { destroy() { beob.disconnect(); e.stop(); } };
}

/** Im Aufbau einer Komponente aufrufen. Sagt den Text an, wenn er sich nach dem ersten Lauf ändert (mit Ruhe); leer sagt nichts. */
export function ansageErgebnis(text: () => string, ms = ERGEBNIS_RUHE_MS) {
  const e = entprellt(t => { sage(t); }, ms);
  let erster = true;
  let letzter = '';
  $effect(() => {
    const t = glatt(text());
    if (erster) { erster = false; letzter = t; return; }
    if (t === letzter) return;
    letzter = t;
    if (t) e.push(t); else e.stop();
  });
  $effect(() => () => e.stop());
}
