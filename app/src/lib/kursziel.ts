import type { Blatt, KursZiel } from './sitzung.svelte';

/** Frisch gerechnet: nur dann springt das Blatt zum gewählten Kurs-Test, nicht bei jedem späteren Öffnen aus dem Heft. */
export const FRISCH_MS = 8000;

/** Meint dieses Blatt den Test `ziel` aus „Wie im Kurs“, und wurde es eben erst angelegt? */
export function kursZielFrisch(blatt: Blatt, ziel: KursZiel): boolean {
  return blatt.kursZiel === ziel && Date.now() - blatt.zeit < FRISCH_MS;
}

/** Svelte-Aktion für das `<details>` des Tests: klappt auf, springt hin und setzt den Fokus auf die Überschrift (damit der Screenreader sie vorliest). */
export function kursSprung(el: HTMLDetailsElement, aktiv: boolean) {
  if (!aktiv) return;
  el.open = true;
  el.style.scrollMarginTop = '4.5rem';   // unter der festen Kopfleiste
  requestAnimationFrame(() => {
    const ruhig = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'start', behavior: ruhig ? 'auto' : 'smooth' });
    el.querySelector('summary')?.focus({ preventScroll: true });
  });
}
