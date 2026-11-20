/**
 * Fokus-Führung (Barrierefreiheit Welle 1). Regeln (Bauplan Abschnitt 2):
 * - Was aufgeht, merkt sich den Auslöser; was zugeht, gibt den Fokus an ihn zurück. Ist er nicht mehr brauchbar, geht der Fokus an ein festes Ersatzziel, nie auf `body`.
 * - Fokus im nächsten Takt mit `setTimeout(0)`, nie mit `requestAnimationFrame` (läuft teils vor dem Einhängen, in versteckten Tabs gar nicht).
 * - Verschachtelte Ebenen (Fachwort in Seitenleiste in Dialog) liegen auf einem Stapel: jede Ebene gibt an ihren eigenen Auslöser zurück.
 * - Die Fokuswache protokolliert einen Fokus, der ins Nichts (auf `body`) fällt. Sie repariert nichts; das Protokoll (`window.__fokusProtokoll`) dient nur dem Messen.
 * Die Logik hängt an einer kleinen Umgebung (`FokusUmgebung`), damit sie ohne Browser getestet werden kann.
 */

export type Ziel = HTMLElement | null | undefined;
/** Ersatzziel: Element, Selektor (erstes Treffer-Element) oder Funktion, die eines liefert. */
export type Ersatz = Ziel | string | (() => Ziel | string);

export interface FokusUmgebung {
  aktiv(): Element | null;
  body(): Element | null;
  enthaelt(e: Element): boolean;
  suche(selektor: string): HTMLElement | null;
  spaeter(f: () => void): void;
  beschreibe(e: Element | null): string;
  ort(): string;
}

const browser: FokusUmgebung = {
  aktiv: () => document.activeElement,
  body: () => document.body,
  enthaelt: e => document.contains(e),
  suche: s => document.querySelector<HTMLElement>(s),
  spaeter: f => { setTimeout(f, 0); },
  beschreibe: e => (e ? `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).join('.') : ''}` : 'nichts'),
  ort: () => (typeof location === 'undefined' ? '' : location.hash || '/'),
};
let umg: FokusUmgebung = browser;
/** Nur für Tests. */
export const setzeUmgebung = (u: FokusUmgebung | null) => { umg = u ?? browser; };

/** Festes Ersatzziel, wenn weder Auslöser noch ein angegebener Ersatz taugt: der Hauptbereich (`<main id="inhalt" tabindex="-1">`). */
export const STANDARD_ERSATZ = '#inhalt';

/** Ein Auslöser taugt, wenn er da ist, nicht `body` ist und noch im Dokument steht. */
export function brauchbar(a: Element | null | undefined): a is HTMLElement {
  return !!a && a !== umg.body() && umg.enthaelt(a);
}

const stapel: (HTMLElement | null)[] = [];
/** Wie viele Ebenen gerade einen Auslöser gemerkt haben. */
export const tiefe = () => stapel.length;

/** Merkt den Auslöser (Standard: das Element, das gerade den Fokus hat). Beim Öffnen aufrufen, BEVOR der Fokus ins Neue wandert. */
export function merkeAusloeser(el?: Ziel): void {
  const a = el ?? umg.aktiv();
  stapel.push(brauchbar(a) ? a : null);
}
/** Nimmt Ebenen vom Stapel, ohne den Fokus zu bewegen (z. B. wenn der Auslöser mit dem Ganzen verschwindet). */
export function verwirf(n = 1): void { stapel.length = Math.max(0, stapel.length - n); }

function loese(e: Ersatz | undefined): HTMLElement | null {
  const w = typeof e === 'function' ? e() : e;
  if (typeof w === 'string') return umg.suche(w);
  return w ?? null;
}
/** Das Ziel, an dem der Fokus landet: erst der Wunsch, dann der Ersatz, dann der Standard. Nie `body`. */
function waehle(wunsch: Ziel, ersatz: Ersatz | undefined): HTMLElement | null {
  if (brauchbar(wunsch)) return wunsch;
  const e = loese(ersatz);
  if (brauchbar(e)) return e;
  const s = loese(STANDARD_ERSATZ);
  return brauchbar(s) ? s : null;
}

/** Setzt den Fokus im nächsten Takt (`setTimeout(0)`, `preventScroll`). Nimmt ein Element oder eine Funktion, die es erst dann liefert. */
export function fokusAuf(el: Ziel | (() => Ziel), ersatz?: Ersatz, neu = false): void {
  umg.spaeter(() => {
    const ziel = waehle(typeof el === 'function' ? el() : el, ersatz);
    if (!ziel) return;
    // Überschriften und Behälter sind nur mit `tabindex` fokussierbar.
    if (!ziel.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(ziel.tagName ?? '')) ziel.setAttribute('tabindex', '-1');
    // `neu`: Liegt der Fokus schon dort (der Browser gibt ihn beim Schließen eines Dialogs selbst zurück), wäre `focus()` ohne Wirkung
    // und NVDA bliebe am Seitenanfang (Stufe 4, B1). Darum kurz lösen und neu setzen: so entsteht ein echtes Fokus-Ereignis.
    if (neu && ziel === umg.aktiv()) { ziel.blur(); umg.spaeter(() => ziel.focus({ preventScroll: true })); return; }
    ziel.focus({ preventScroll: true });
  });
}

/** Gibt den Fokus an den zuletzt gemerkten Auslöser zurück; steht er nicht mehr im Baum, geht er an `ersatz` (sonst an `#inhalt`). */
export function gibZurueck(ersatz?: Ersatz, verzoegerungMs = 0, weiter?: () => boolean): void {
  const a = stapel.pop() ?? null;
  // Hat inzwischen jemand anderes den Fokus mit Absicht auf ein echtes Element gesetzt (z. B. die Seite nach der Antwort), bleibt er dort; nur ein Fokus im Nichts geht ans Ersatzziel.
  // Neu setzen nur, wenn der Fokus an den gemerkten Auslöser zurückgeht (sonst spräche NVDA ein absichtlich gesetztes Ziel doppelt).
  const los = () => fokusAuf(() => (brauchbar(a) ? a : brauchbar(umg.aktiv()) ? umg.aktiv() as HTMLElement : null), ersatz, verzoegerungMs > 0 && brauchbar(a));
  // Verzögert: Edge baut beim Schließen eines modalen Dialogs den Hintergrund neu auf; ein Fokus davor wird von NVDA nicht gesprochen (gemessen Stufe 4, B1).
  if (verzoegerungMs > 0) setTimeout(() => { if (!weiter || weiter()) los(); }, verzoegerungMs); else los();
}

// ---- Fokuswache ----
export interface Fokusfall { zeit: number; von: string; ereignis: string; ort: string }
const protokoll: Fokusfall[] = [];
export const fokusProtokoll = () => protokoll;
export const leereProtokoll = () => { protokoll.length = 0; };
const zeigeProtokoll = () => { if (typeof window !== 'undefined') (window as unknown as { __fokusProtokoll?: Fokusfall[] }).__fokusProtokoll = protokoll; };
zeigeProtokoll();

/** Liegt der Fokus jetzt auf `body` (oder nirgends), obwohl er eben auf `von` lag? Dann protokollieren, nicht reparieren. */
export function pruefeFokusfall(von: Element | null, ereignis: string): void {
  const a = umg.aktiv();
  if (a && a !== umg.body()) return;
  protokoll.push({ zeit: Date.now(), von: umg.beschreibe(von), ereignis, ort: umg.ort() });
  zeigeProtokoll();
}

/** Startet die Fokuswache (einmal, in `App.svelte`). Gibt die Aufräum-Funktion zurück. */
export function starteFokuswache(): () => void {
  if (typeof document === 'undefined') return () => {};
  let letzter: Element | null = null, geplant = false;
  const rein = (e: FocusEvent) => { letzter = e.target as Element; };
  const raus = (e: FocusEvent) => {
    if (e.relatedTarget) return;
    const von = e.target as Element;
    setTimeout(() => { if (von !== document.body) pruefeFokusfall(von, 'focusout'); }, 0);
  };
  // Wird das fokussierte Element samt Umgebung entfernt, feuern manche Browser kein focusout.
  const mb = new MutationObserver(() => {
    if (geplant) return; geplant = true;
    setTimeout(() => {
      geplant = false;
      if (letzter && !document.contains(letzter) && (!document.activeElement || document.activeElement === document.body)) { pruefeFokusfall(letzter, 'entfernt'); letzter = null; }
    }, 0);
  });
  document.addEventListener('focusin', rein); document.addEventListener('focusout', raus);
  mb.observe(document.body, { childList: true, subtree: true });
  return () => { document.removeEventListener('focusin', rein); document.removeEventListener('focusout', raus); mb.disconnect(); };
}

/** Alt+Z, tastaturlayoutfest: Auf QWERTZ liegt die Taste "Z" dort, wo US-Tastaturen Y haben (`e.code` ist dann `KeyY`, `e.key` aber "z"). Darum zuerst `e.key`; `e.code === 'KeyZ'` gilt nur, wenn `e.key` kein Buchstabe ist (Mac: Wahltaste erzeugt Sonderzeichen). Gemessen mit NVDA am 06.11.: nur über `e.code` kam Alt+Z auf der deutschen Tastatur nicht an. */
export function istAltZ(e: Pick<KeyboardEvent, 'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>): boolean {
  if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return false;
  const k = e.key ?? '';
  if (/^[a-zA-Z]$/.test(k)) return k.toLowerCase() === 'z';
  return e.code === 'KeyZ';
}
