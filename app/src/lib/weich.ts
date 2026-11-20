/** Svelte-Aktion: ein Bereich ändert seine Höhe nicht mit einem Sprung, sondern gleitet von der alten zur neuen Höhe
 *  (Johannes 07.10.: auf dem Frage-Blatt klappen vier Abschnitte auf und zu - „lass dir Zeit, damit man es wirklich sieht“).
 *  Funktioniert für jede Änderung im Inhalt (Kacheln → Satz, Abschnitt öffnet sich, Auswahl erscheint), ohne feste Höhen im CSS.
 *  Läuft immer: langsame Bewegung hilft Menschen mit Sehbeeinträchtigung (Johannes 08.10.). */
export const DAUER_WEICH = 800;

export function weich(node: HTMLElement) {
  let alt = node.offsetHeight;
  let anim: Animation | null = null;
  let geplant = false;

  function lauf() {
    geplant = false;
    const jetzt = node.getBoundingClientRect().height;   // mitten in einer Bewegung: die gerade sichtbare Höhe
    const laeuft = !!anim;
    anim?.cancel(); anim = null;
    const neu = node.offsetHeight;                         // die natürliche neue Höhe
    const von = laeuft ? jetzt : alt;
    alt = neu;
    if (Math.abs(von - neu) < 2) return;
    anim = node.animate([{ height: `${von}px`, overflow: 'hidden' }, { height: `${neu}px`, overflow: 'hidden' }],
      { duration: DAUER_WEICH, easing: 'cubic-bezier(.45,.05,.25,1)' });
    anim.onfinish = () => { anim = null; alt = node.offsetHeight; };
  }
  const plane = () => { if (!geplant) { geplant = true; requestAnimationFrame(lauf); } };
  const mo = new MutationObserver(plane);
  mo.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'open', 'hidden'], characterData: true });
  const groesse = () => { if (!anim) alt = node.offsetHeight; };
  addEventListener('resize', groesse);
  return { destroy() { mo.disconnect(); anim?.cancel(); removeEventListener('resize', groesse); } };
}
