<script lang="ts">
  /** Der Hinweis beim Darüberfahren - groß, schnell, überall gleich (ersetzt das native `title`: das kam erst nach
   *  rund einer Sekunde, in Winzschrift, und wuchs nicht mit Strg/Cmd + Plus).
   *  Quelle: `data-tipp` am Element; Knöpfe nur mit Symbol bekommen ihr `aria-label` von selbst.
   *  Erscheint auch beim Tabben (Fokus), Escape schickt ihn weg, Touch zeigt ihn nicht.
   *  Für Screenreader (WCAG 1.3.1/4.1.2): Bekommt ein Element mit `data-tipp` den Fokus - auch ohne sichtbaren Fokusring, auch mit Touch -, verweist es per `aria-describedby` auf eine
   *  ständig vorhandene, unsichtbare Beschreibung mit demselben Text. Hat das Element schon ein eigenes `aria-describedby`, bleibt es unberührt.
   *  WCAG 1.4.13: Die Maus darf vom Element auf die Blase wandern, ohne dass sie verschwindet; dafür die kurze Frist `NACHLAUF`. */
  import { onMount } from 'svelte';

  const SEL = '[data-tipp], button[aria-label], a[aria-label]';
  let text = $state('');
  let pos = $state({ x: 0, y: 0, oben: false });
  let blase = $state<HTMLElement>();
  let bereit = $state(false);
  let ziel: HTMLElement | null = null;
  let uhr: ReturnType<typeof setTimeout> | undefined, wegUhr: ReturnType<typeof setTimeout> | undefined;
  const NACHLAUF = 300;
  let beschrZiel: HTMLElement | null = null;
  const BESCHR_ID = 'tipp-beschreibung';
  function beschreibe(e: HTMLElement | null) {
    if (beschrZiel && beschrZiel !== e && beschrZiel.getAttribute('aria-describedby') === BESCHR_ID) beschrZiel.removeAttribute('aria-describedby');
    beschrZiel = null;
    const feld = document.getElementById(BESCHR_ID); /* gleich im DOM schreiben, nicht über $state: die Beschreibung muss stehen, wenn der Screenreader den Fokus liest */
    if (feld) feld.textContent = '';
    if (!feld || !e || !e.dataset.tipp || e.hasAttribute('aria-describedby')) return;
    feld.textContent = e.dataset.tipp; beschrZiel = e; e.setAttribute('aria-describedby', BESCHR_ID);
  }

  /** Ein `aria-label` nur zeigen, wenn am Knopf kein Text sichtbar ist (sonst stünde dasselbe zweimal da). */
  function textVon(e: HTMLElement): string {
    if (e.dataset.tipp !== undefined) return e.dataset.tipp;
    const sichtbar = [...e.querySelectorAll<HTMLElement>(':scope > :not(svg):not([aria-hidden="true"])')].some(k => k.offsetWidth && k.textContent?.trim())
      || [...e.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim() && parseFloat(getComputedStyle(e).fontSize) > 0);
    return sichtbar ? '' : (e.getAttribute('aria-label') ?? '');
  }
  function zeige(e: HTMLElement, sofort: boolean) {
    clearTimeout(uhr); clearTimeout(wegUhr);
    const t = textVon(e);
    if (!t) return weg();
    uhr = setTimeout(() => {
      ziel = e; text = t; bereit = false;
      requestAnimationFrame(() => {
        if (!blase || ziel !== e) return;
        const r = e.getBoundingClientRect(), b = blase.getBoundingClientRect();
        const oben = r.bottom + 10 + b.height > innerHeight - 8;
        pos = { x: Math.max(8, Math.min(innerWidth - b.width - 8, r.left + r.width / 2 - b.width / 2)), y: oben ? r.top - b.height - 10 : r.bottom + 10, oben };
        bereit = true;
      });
    }, sofort ? 0 : 120);
  }
  function weg() { clearTimeout(uhr); clearTimeout(wegUhr); ziel = null; text = ''; bereit = false; }

  onMount(() => {
    const ueber = (ev: PointerEvent) => {
      if (ev.pointerType === 'touch') return;
      if (blase?.contains(ev.target as Node)) { clearTimeout(wegUhr); return; }
      const e = (ev.target as Element).closest<HTMLElement>(SEL);
      if (e === ziel) { clearTimeout(wegUhr); return; }
      if (e) { zeige(e, false); return; }
      clearTimeout(uhr); clearTimeout(wegUhr);
      if (ziel) wegUhr = setTimeout(weg, NACHLAUF);
    };
    const fokus = (ev: FocusEvent) => {
      beschreibe((ev.target as Element).closest?.<HTMLElement>('[data-tipp]') ?? null);
      const e = (ev.target as Element).closest?.<HTMLElement>(SEL);
      if (e && e.matches(':focus-visible')) zeige(e, true); else weg();
    };
    const taste = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && text) weg(); };
    addEventListener('pointerover', ueber);
    addEventListener('pointerdown', weg);
    addEventListener('focusin', fokus);
    addEventListener('keydown', taste);
    addEventListener('scroll', weg, true);
    addEventListener('hashchange', weg);
    return () => { removeEventListener('pointerover', ueber); removeEventListener('pointerdown', weg); removeEventListener('focusin', fokus); removeEventListener('keydown', taste); removeEventListener('scroll', weg, true); removeEventListener('hashchange', weg); };
  });
</script>

<div id="tipp-beschreibung" class="nur-vorleser"></div>

{#if text}
  <div class="tipp" class:oben={pos.oben} class:bereit role="tooltip" bind:this={blase} style="left:{pos.x}px;top:{pos.y}px">{text}</div>
{/if}

<style>
  .tipp { position: fixed; z-index: 90; max-width: min(20rem, calc(100vw - 16px)); padding: var(--a1) var(--a2);
    background: var(--tinte); color: var(--blatt); border: 1px solid var(--blatt); border-radius: var(--r-klein); box-shadow: var(--schatten-heben);
    font: 400 var(--gr-klein)/1.4 var(--schrift-ui); visibility: hidden; }
  .tipp.bereit { visibility: visible; animation: tipp-auf var(--dauer) var(--kurve); }
  .tipp.bereit.oben { animation-name: tipp-ab; }
  @keyframes tipp-auf { from { opacity: 0; transform: translateY(-6px) scale(.97); } to { opacity: 1; transform: none; } }
  @keyframes tipp-ab { from { opacity: 0; transform: translateY(6px) scale(.97); } to { opacity: 1; transform: none; } }
</style>
