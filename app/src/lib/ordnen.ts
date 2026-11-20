/**
 * Sortierlisten mit Knöpfen „nach oben/unten“ (Ersatz für Ziehen und Ablegen, WCAG 2.5.7): nach dem Verschieben bleibt der Fokus
 * beim Eintrag und die neue Position wird angesagt. Ein verschobener Eintrag zieht um (Svelte setzt die Knoten um), und ein Knopf am
 * Rand der Liste wird deaktiviert; ohne Nacharbeit fiele der Fokus auf `body`. Jeder Knopf trägt `data-ord="hoch|runter"` und
 * `data-ord-key` (eindeutig je Eintrag und Liste).
 */
import { tick } from 'svelte';
import { sage } from './ansage';

const frei = (b: HTMLElement | null | undefined): b is HTMLElement => !!b && !(b as HTMLButtonElement).disabled && b.getAttribute('aria-disabled') !== 'true';

/** Sagt `text` an (leer: nichts, wenn die Liste selbst eine Statuszeile hat) und setzt den Fokus nach dem Umbau auf den gleichen Richtungsknopf des Eintrags; ist er am Rand gesperrt, auf den anderen. */
export async function fokusNachVerschieben(schluessel: string, richtung: -1 | 1, text = '', doc: Document = document): Promise<void> {
  if (text) sage(text);
  await tick();
  const knopf = (r: 'hoch' | 'runter') => doc.querySelector<HTMLElement>(`[data-ord-key="${CSS.escape(schluessel)}"][data-ord="${r}"]`);
  const gleich = knopf(richtung < 0 ? 'hoch' : 'runter'), anderer = knopf(richtung < 0 ? 'runter' : 'hoch');
  (frei(gleich) ? gleich : frei(anderer) ? anderer : gleich)?.focus();
}
