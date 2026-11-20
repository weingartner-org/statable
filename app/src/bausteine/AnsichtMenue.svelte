<script lang="ts">
  import { tick } from 'svelte';
  import { rutsch } from '../lib/rutsch';
  import { L } from '../lib/sitzung.svelte';
  import Icon from './Icon.svelte';
  import Groesse from './Groesse.svelte';
  import Farbwahl from './Farbwahl.svelte';
  import Sprachwahl from './Sprachwahl.svelte';

  /** Menü „Ansicht“ in der Kopfzeile (Stufe 1): Schriftgröße, Farben und Kontrast, Sprache - drei sichtbare Gruppen in EINEM Feld statt drei Einzelknöpfe.
   *  Aufbau wie `Projektmenue.svelte`. Alt+K öffnet es und springt zu den Farben (Ereignis `statable:ansicht`). */
  let offen = $state(false);
  let ort = $state<HTMLElement>();
  let knopf = $state<HTMLButtonElement>();

  function zu(fokus = true) { offen = false; if (fokus) knopf?.focus(); }
  async function oeffneBei(gruppe: 'farben' | 'sprache' | 'groesse' | '') {
    offen = true; await tick();
    const wo = gruppe === 'farben' ? '#farbwahl-feld' : gruppe === 'sprache' ? '#sprachwahl-feld' : gruppe === 'groesse' ? '.am-groesse' : '';
    const ziel = wo ? ort?.querySelector<HTMLElement>(`${wo} input:checked, ${wo} button`) : null;
    (ziel ?? ort?.querySelector<HTMLElement>('.am-feld input:checked, .am-feld button'))?.focus();
  }
  $effect(() => {
    const auf = (e: Event) => { const g = (e as CustomEvent<string>).detail; offen ? zu() : oeffneBei((g as 'farben') ?? ''); };
    addEventListener('statable:ansicht', auf);
    return () => removeEventListener('statable:ansicht', auf);
  });
  $effect(() => {
    if (!offen) return;
    const o = ort; if (!o) return;
    const draussen = (e: PointerEvent) => { if (!o.contains(e.target as Node)) zu(false); };
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); zu(); } };
    const wegFokus = (e: FocusEvent) => { if (e.relatedTarget && !o.contains(e.relatedTarget as Node)) zu(false); };
    addEventListener('pointerdown', draussen); o.addEventListener('keydown', taste); o.addEventListener('focusout', wegFokus);
    return () => { removeEventListener('pointerdown', draussen); o.removeEventListener('keydown', taste); o.removeEventListener('focusout', wegFokus); };
  });
</script>

<div class="ansicht-menue" bind:this={ort}>
  <button class="k leise" type="button" bind:this={knopf} aria-expanded={offen} aria-controls="am-feld" aria-keyshortcuts="Alt+K"
    aria-label={L('Aa Ansicht', 'Aa View')} {...{ 'aria-description': L('Ansicht: Schriftgröße, Farben und Sprache', 'View: text size, colors and language') }} data-tipp={offen ? undefined : L('Ansicht: Schriftgröße, Farben und Kontrast, Sprache (Alt+K für Farben)', 'View: text size, colors and contrast, language (Alt+K for colors)')}
    onclick={() => (offen = !offen)}><span class="am-aa" aria-hidden="true">Aa</span><span class="nur-breit" aria-hidden="true">{L('Ansicht', 'View')}</span><Icon n="winkel" k="am-winkel" /></button>
  {#if offen}
    <div class="am-feld klappt" transition:rutsch id="am-feld" role="group" aria-label={L('Ansicht', 'View')}>
      <section class="am-gruppe am-groesse" aria-labelledby="am-t-groesse"><h2 class="am-titel" id="am-t-groesse">{L('Schriftgröße', 'Text size')}</h2><Groesse flach /></section>
      <section class="am-gruppe" aria-labelledby="am-t-farben"><h2 class="am-titel" id="am-t-farben">{L('Farben und Kontrast', 'Colors and contrast')}</h2><Farbwahl flach /></section>
      <section class="am-gruppe" aria-labelledby="am-t-sprache"><h2 class="am-titel" id="am-t-sprache">{L('Sprache', 'Language')}</h2><Sprachwahl flach /></section>
    </div>
  {/if}
</div>

<style>
  .ansicht-menue { position: relative; }
  .am-aa { font: 700 var(--gr-klein)/1 var(--schrift-ui); letter-spacing: -0.02em; }
  .ansicht-menue :global(.am-winkel) { width: 14px; height: 14px; color: var(--tinte-2); }
  .am-feld { position: absolute; inset-inline-end: 0; top: calc(100% + var(--a2)); z-index: 40; width: 17rem; max-width: calc(100vw - 2 * var(--a4)); max-height: min(80vh, 46rem); overflow-y: auto; padding: var(--a2); background: var(--blatt-gehoben); color: var(--tinte); border: 1px solid var(--linie-stark); border-radius: var(--r); box-shadow: var(--schatten-heben); display: flex; flex-direction: column; gap: var(--a2); }
  .am-gruppe + .am-gruppe { border-top: 1px solid var(--linie); padding-top: var(--a2); }
  /* 15 Sprachen in zwei Spalten, damit das Menü nicht so lang wird (Reihenfolge zum Vorlesen bleibt die der Liste). */
  .am-feld :global(.sprachwahl-feld.flach) { display: grid; grid-template-columns: 1fr 1fr; column-gap: var(--a1); }
  .am-feld :global(.sprachwahl-feld.flach > :is(hr, .sprachwahl-laedt, label:first-child)) { grid-column: 1 / -1; }
  /* Schmal: Die Leisten unten (Daten-Check, Reiter) liegen über der Kopfzeile - das Menü endet darüber und scrollt in sich. */
  :global(:where(:root.eng-700)) .am-feld { max-height: calc(100dvh - 12rem); }
  .am-titel { font: 650 var(--gr-klein)/1.3 var(--schrift-ui); color: var(--tinte-2); padding: var(--a1) var(--a2); margin: 0; }
</style>
