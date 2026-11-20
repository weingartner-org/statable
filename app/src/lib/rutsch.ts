import { slide } from 'svelte/transition';
import { cubicOut } from 'svelte/easing';

/** Weiches, langsames Ausklappen nach unten (und Einklappen nach oben) für alles unter `{#if}`.
 *  Das Auge soll mitkommen: 700 ms. Läuft immer, auch bei „Bewegung reduzieren“ - Johannes 08.10.:
 *  langsames Rutschen hilft Menschen mit Sehbeeinträchtigung. */
export function rutsch(node: Element, opt: { duration?: number } = {}) {
  return slide(node, { duration: opt.duration ?? 700, easing: cubicOut });
}
