/**
 * Welche Begriffe die Seitenleiste gerade erklärt (Johannes 31.10.): jedes Wort, das `lib/begriffsverlinker.ts` verlinkt, landet hier.
 * Der Stapel ist der Weg zurück: „Zurück“ zeigt den Begriff davor, ist er leer, wieder den Erklärtext, der vorher dort stand.
 */
import { s } from './sitzung.svelte';
import { eng } from './groesse.svelte';
import { merkeAusloeser, gibZurueck, verwirf } from './fokus';

export const begriffe = $state<{ stapel: string[]; /** Hat die Seite eine sichtbare Seitenleiste? Sonst öffnet ein Fenster. */ imRand: boolean; /** Der Fokus soll auf die Überschrift der Erklärung, sobald sie geladen ist (nach dem Öffnen und nach „eine Ebene zurück“). */ ueberschriftFokus: boolean }>({ stapel: [], imRand: true, ueberschriftFokus: false });
/** Wie viele Fokus-Auslöser die Begriffe auf dem Stapel von `lib/fokus.ts` liegen haben (eine je Ebene des Begriffsstapels). */
let ebenen = 0;

/** Unter 1100 px steht der Rand unter dem Text und wäre beim Klick nicht zu sehen: dort öffnet ein Fenster. Die Hilfe hat keine Seitenleiste von sich aus: sie bekommt eine, sobald ein Begriff gewählt wird (nur im breiten Fenster). */
const randSichtbar = () => !eng(520) && (location.hash.startsWith('#hilfe') || [...document.querySelectorAll<HTMLElement>('aside.rand')].some(r => !r.closest('[inert],[aria-hidden="true"]') && (r.offsetParent !== null || r.getClientRects().length > 0)));

export function oeffneBegriff(id: string, ausloeser?: HTMLElement | null) {
  begriffe.imRand = randSichtbar();
  if (begriffe.imRand) s.randEng = false;
  if (begriffe.stapel.at(-1) !== id) { begriffe.stapel.push(id); merkeAusloeser(ausloeser); ebenen++; }
  begriffe.ueberschriftFokus = true;
}
/** Wohin der Fokus geht, wenn die letzte Erklärung zugeht und das Fachwort im Text nicht mehr steht: das gleiche Wort an anderer Stelle, sonst der Hauptbereich. */
const ersatzFuer = (id: string | undefined) => () => (id ? document.querySelector<HTMLElement>(`button.begriff-link[data-gl="${CSS.escape(id)}"]`) : null) ?? '#inhalt';
/** Eine Ebene zurück (Knopf „Zurück“, Esc, Alt+Z). Bleibt ein Begriff darunter, geht der Fokus auf dessen Überschrift (das Fachwort, das ihn öffnete, steht nicht mehr da); sonst zurück ans Fachwort im Text. */
export function zurueckBegriff() {
  const id = begriffe.stapel.pop();
  if (id === undefined || ebenen <= 0) return;
  ebenen--;
  if (begriffe.stapel.length) { verwirf(1); begriffe.ueberschriftFokus = true; }
  else { begriffe.ueberschriftFokus = false; gibZurueck(ersatzFuer(id)); }
}
/** Alles schließen, ohne den Fokus zu bewegen (jemand wählt etwas anderes, die Seite wechselt). */
export function schliesseBegriffe() { begriffe.stapel.length = 0; begriffe.ueberschriftFokus = false; verwirf(ebenen); ebenen = 0; }
/** Alles schließen auf Wunsch der Person (Fenster zu): der Fokus geht zurück ans erste Fachwort, an dem es begann. */
export function beendeBegriffe() {
  const id = begriffe.stapel[0], n = ebenen;
  begriffe.stapel.length = 0; begriffe.ueberschriftFokus = false; ebenen = 0;
  if (n > 0) { verwirf(n - 1); gibZurueck(ersatzFuer(id)); }
}
