/** Verbindet Verlinker, Index und Klick: einmal in `App.svelte` aufgerufen. */
import { artikelModul } from '../hilfe/artikel-laden';
import { baueIndex } from '../hilfe/begriffsfinder';
import type { Sprache } from '../i18n/laufzeit';
import { oeffneBegriff, zurueckBegriff, begriffe } from './begriffsrand.svelte';
import { setzeIndex, starteVerlinker } from './begriffsverlinker';

/** Der Begriff, der schon als Seite oder in der Seitenleiste steht, wird nicht noch einmal verlinkt. */
const eigener = () => (location.hash.startsWith('#hilfe/') ? location.hash.slice(7).split('/')[0] : undefined) ?? begriffe.stapel.at(-1);

export function starteBegriffe(): () => void {
  starteVerlinker(eigener);
  const klick = (e: MouseEvent) => {
    const b = (e.target as Element | null)?.closest?.<HTMLElement>('button.begriff-link');
    if (!b?.dataset.gl) return;
    e.preventDefault(); oeffneBegriff(b.dataset.gl, b);
  };
  /** Esc in der Seitenleiste: eine Ebene zurück, am Ende ans Fachwort im Text. Im Begriffsfenster macht Esc die Fensterfunktion selbst (`BegriffsDialog.svelte`).
   *  Alt+Z (dasselbe von überall) wohnt seit Welle 2 in `lib/kuerzel.ts` (eine Quelle für alle Kürzel). */
  const taste = (e: KeyboardEvent) => {
    if (!begriffe.stapel.length || e.defaultPrevented) return;
    if (e.key === 'Escape' && !e.altKey && !e.ctrlKey && !e.metaKey) {
      if (!begriffe.imRand || !(e.target as Element | null)?.closest?.('aside.rand')) return;
      e.preventDefault(); zurueckBegriff();
    }
  };
  document.addEventListener('click', klick);
  document.addEventListener('keydown', taste);
  return () => { document.removeEventListener('click', klick); document.removeEventListener('keydown', taste); };
}

/** Baut für die Sprache den Index aus den Titeln der Hilfe (erst wenn die App ruht: die Artikel laden mit der Hilfe, nicht im Startpaket). */
export function ladeBegriffsIndex(sp: Sprache): () => void {
  let gilt = true;
  const los = () => artikelModul(sp).then(m => { if (gilt) setzeIndex(baueIndex(m.artikelListe(sp).filter(a => a.bereich === 'begriffe'), sp)); }).catch(() => {});
  const t = setTimeout(los, 1500);
  return () => { gilt = false; clearTimeout(t); };
}
