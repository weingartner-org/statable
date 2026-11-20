/**
 * Svelte-Aktion `use:dialogFokus` für jedes `<dialog>` mit `showModal()` (Barrierefreiheit Welle 1): einmal hier statt zehnfach von Hand.
 * - Beim Öffnen: den Auslöser merken (BEVOR der Fokus ins Fenster wandert) und, falls der Fokus nicht schon im Fenster liegt, aufs erste sinnvolle Element setzen.
 * - Beim Schließen (Esc, Knopf, Abbrechen, Bestätigen - alles löst `close` aus): Fokus an den Auslöser zurück; fehlt er, ans Ersatzziel (sonst `#inhalt`), nie auf `body`.
 * `merken: false`: Wer den Auslöser selbst früher merkt (Melden nimmt erst ein Bild auf), ruft `merkeAusloeser()` vor `showModal()` selbst auf.
 */
import { merkeAusloeser, gibZurueck, fokusAuf, verwirf, type Ersatz } from '../lib/fokus';

export interface DialogFokusOptionen {
  /** Wohin, wenn der Auslöser weg ist. Standard: `#inhalt`. */
  ersatz?: Ersatz;
  /** Selektor des ersten Elements, falls der Fokus beim Öffnen nicht schon im Fenster liegt. */
  erstes?: string;
  /** `false`: Der Auslöser wurde schon vor `showModal()` gemerkt. */
  merken?: boolean;
  /** Fokus erst nach so vielen ms zurückgeben (NVDA spricht sonst nach dem Schließen den Seitenanfang). Standard 0. */
  spaet?: number;
}

/** Fokus-Rückgabe der Interview-Dialoge nach dem Schließen (ms). Eigene Fokussetzung nach einem Dialog kommt früher (`NACH_DIALOG_MS`), dann bleibt sie bestehen. */
export const DIALOG_SPAET_MS = 250;
export const NACH_DIALOG_MS = 150;
/** Setzt den Fokus erst nach dem Schließen eines Dialogs (Edge baut den Hintergrund neu auf; sonst spricht NVDA den Seitenanfang). */
export function fokusNachDialog(id: string): void {
  setTimeout(() => document.getElementById(id)?.focus(), NACH_DIALOG_MS);
}

const ERSTES = '[autofocus], input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])';

export function dialogFokus(dlg: HTMLDialogElement, opt: DialogFokusOptionen = {}) {
  let o = opt, gemerkt = false;
  const original = dlg.showModal.bind(dlg);
  dlg.showModal = () => {
    const vorher = document.activeElement as HTMLElement | null;
    original();   // wirft, wenn schon offen: dann wird nichts gemerkt
    // `gemerkt` noch gesetzt: das `close` des letzten Schließens steht noch aus (sehr schnelles Wiederöffnen). Dann gilt der neue Auslöser.
    if (gemerkt && o.merken !== false) { verwirf(1); merkeAusloeser(vorher); }
    else if (!gemerkt) { gemerkt = true; if (o.merken !== false) merkeAusloeser(vorher); }
    setTimeout(() => {
      if (!dlg.open || dlg.contains(document.activeElement)) return;
      fokusAuf(dlg.querySelector<HTMLElement>(o.erstes ?? ERSTES) ?? dlg);
    }, 0);
  };
  const zu = () => { if (!gemerkt || dlg.open) return;   // verspätetes `close` nach schnellem Wiederöffnen: nichts tun
    gemerkt = false; gibZurueck(o.ersatz, o.spaet ?? 0, () => !dlg.open); };
  dlg.addEventListener('close', zu);
  return {
    update(neu: DialogFokusOptionen = {}) { o = neu; },
    destroy() {
      dlg.removeEventListener('close', zu);
      dlg.showModal = original;
      if (gemerkt) { gemerkt = false; if (dlg.open) gibZurueck(o.ersatz); else verwirf(1); }
    },
  };
}
