<script lang="ts">
  import { rutsch } from '../lib/rutsch';
  import { s, L, spracheWaehlen, browserSprache, sprachWahl } from '../lib/sitzung.svelte';
  import { FREIGEGEBEN, SPRACHNAMEN, type Sprache } from '../i18n/laufzeit';
  import { Laedt } from '../lib/laedt.svelte';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';

  /** Sprache oben im Kopf (Johannes 31.10., wie in Tastenflow): zuerst „Automatisch“, dann die Sprachen, jede in ihrer eigenen Schrift. Aufbau wie `Farbwahl.svelte`; Laden mit Lade-Animation. */
  const wert = $derived(sprachWahl.system ? 'system' : s.einst.sprache);
  /** Eine zum Prüfen über ?sprache= gewählte Sprache steht zusätzlich da, solange sie gilt. */
  const sprachen = $derived<Sprache[]>(FREIGEGEBEN.includes(s.einst.sprache) ? FREIGEGEBEN : [...FREIGEGEBEN, s.einst.sprache]);
  const systemName = $derived(SPRACHNAMEN[browserSprache()]);
  const laden = new Laedt();
  /** Im Menü „Ansicht“: nur die Auswahl, ohne eigenen Knopf. */
  let { flach = false }: { flach?: boolean } = $props();
  let offen = $state(false);
  let ort = $state() as HTMLElement;
  let knopf = $state() as HTMLButtonElement;

  function zu(fokus = true) { offen = false; if (fokus) knopf?.focus(); }
  $effect(() => {
    if (!offen) return;
    const draussen = (e: PointerEvent) => { if (!ort.contains(e.target as Node)) zu(false); };
    const taste = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); zu(); } };
    const wegFokus = (e: FocusEvent) => { if (e.relatedTarget && !ort.contains(e.relatedTarget as Node)) zu(false); };
    addEventListener('pointerdown', draussen); ort.addEventListener('keydown', taste); ort.addEventListener('focusout', wegFokus);
    ort.querySelector<HTMLInputElement>('input:checked')?.focus();
    return () => { removeEventListener('pointerdown', draussen); ort.removeEventListener('keydown', taste); ort.removeEventListener('focusout', wegFokus); };
  });
</script>

{#snippet laedt()}
  {#if laden.aktiv}<p class="sprachwahl-laedt" role="status"><Rechnet text={L('Wird geladen …', 'Loading …')} /></p>{/if}
{/snippet}
{#if flach}
  <div class="sprachwahl-feld flach" id="sprachwahl-feld" role="radiogroup" aria-label={L('Sprache', 'Language')} aria-busy={laden.aktiv}>
    <label><input type="radio" name="sprachwahl" value="system" checked={wert === 'system'} disabled={laden.aktiv} onchange={() => laden.mit(() => spracheWaehlen('system'))}>{L(`Automatisch (${systemName})`, `Automatic (${systemName})`)}</label>
    <hr>
    {#each sprachen as sp (sp)}
      <label lang={sp === 'xx' ? 'en' : sp}><input type="radio" name="sprachwahl" value={sp} checked={wert === sp} disabled={laden.aktiv} onchange={() => laden.mit(() => spracheWaehlen(sp))}>{SPRACHNAMEN[sp]}</label>
    {/each}
    {@render laedt()}
  </div>
{:else}
<div class="sprachwahl" bind:this={ort}>
  <button class="k leise nur-symbol" type="button" bind:this={knopf} aria-expanded={offen} aria-controls="sprachwahl-feld"
    aria-label={L('Sprache', 'Language')} data-tipp={L('Sprache', 'Language')} onclick={() => (offen = !offen)}><Icon n="sprache" /></button>
  {#if offen}
    <div class="sprachwahl-feld klappt" transition:rutsch id="sprachwahl-feld" role="radiogroup" aria-label={L('Sprache', 'Language')} aria-busy={laden.aktiv}>
      <p class="sprachwahl-titel" aria-hidden="true">{L('Sprache', 'Language')}</p>
      <label><input type="radio" name="sprachwahl" value="system" checked={wert === 'system'} disabled={laden.aktiv} onchange={() => laden.mit(() => spracheWaehlen('system'))}>{L(`Automatisch (${systemName})`, `Automatic (${systemName})`)}</label>
      <hr>
      {#each sprachen as sp (sp)}
        <label lang={sp === 'xx' ? 'en' : sp === 'xr' ? 'ar' : sp}><input type="radio" name="sprachwahl" value={sp} checked={wert === sp} disabled={laden.aktiv} onchange={() => laden.mit(() => spracheWaehlen(sp))}>{SPRACHNAMEN[sp]}</label>
      {/each}
      {@render laedt()}
    </div>
  {/if}
</div>
{/if}

<style>
  .sprachwahl { position: relative; }
  .sprachwahl-feld { position: absolute; inset-inline-end: 0; top: calc(100% + var(--a2)); z-index: 40; min-width: 14rem; max-height: min(75vh, 44rem); overflow-y: auto; padding: var(--a2); background: var(--blatt-gehoben); color: var(--tinte); border: 1px solid var(--linie-stark); border-radius: var(--r); box-shadow: var(--schatten-heben); display: flex; flex-direction: column; }
  .sprachwahl-feld.flach { position: static; min-width: 0; max-height: none; overflow: visible; padding: 0; background: none; border: 0; box-shadow: none; }
  .sprachwahl-titel { font: 650 var(--gr-klein)/1.3 var(--schrift-ui); color: var(--tinte-2); padding: var(--a1) var(--a2) var(--a2); }
  .sprachwahl-laedt { padding: var(--a2); }
  hr { width: 100%; border: 0; border-top: 1px solid var(--linie); margin: var(--a1) 0; }
  label { display: flex; align-items: center; gap: var(--a3); min-height: var(--ziel); padding: 0 var(--a2); border-radius: var(--r-klein); cursor: pointer; }
  label:hover { background: var(--blatt-2); }
  label:has(input:checked) { font-weight: 650; }
  label:has(input:focus-visible) { box-shadow: var(--fokus-ring); }
  input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 0; flex: none; }
</style>
