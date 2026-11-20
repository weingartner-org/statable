/**
 * Weicher Wechsel (Johannes 10.10.): Wird etwas ausgetauscht - ein neues Ergebnis nach dem Umschalten, eine andere Seite -, springt es nicht,
 * sondern gleitet von oben herein und blendet auf. Dieselbe Bewegung wie `einblenden` in app.css (Reiterwechsel), damit alles gleich wirkt.
 * Läuft immer, wie `rutsch` und `weich`: langsame Bewegung hilft Menschen mit Sehbeeinträchtigung (Johannes 08.10.).
 */
export const DAUER_WECHSEL = 600;

export function hereingleiten(el: Element | null | undefined, dauer = DAUER_WECHSEL) {
  if (!el || typeof (el as HTMLElement).animate !== 'function') return;
  (el as HTMLElement).animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }],
    { duration: dauer, easing: 'cubic-bezier(.45,.05,.25,1)' });
}
