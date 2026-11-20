<script lang="ts">
  import { rutsch } from '../lib/rutsch';
  import { s, L, einstSpeichern, THEMA_GEWAEHLT, type Thema } from '../lib/sitzung.svelte';
  import Icon from './Icon.svelte';

  /** Dieselben Modi wie in den Sensorik-Apps, dazu "Wie das Gerät". Standard ist Hell (Johannes 09.10.). Wählen wirkt sofort; das Feld bleibt offen zum Ausprobieren. */
  const MODI = $derived<[Thema, string][]>([
    ['hell', L('Hell', 'Light')], ['auto', L('Wie das Gerät', 'Same as device')], ['dunkel', L('Dunkel', 'Dark')],
    ['sw', L('Schwarz auf Weiß', 'Black on white')], ['ws', L('Weiß auf Schwarz', 'White on black')],
    ['sg', L('Schwarz auf Gelb', 'Black on yellow')], ['gs', L('Gelb auf Schwarz', 'Yellow on black')], ['gb', L('Gelb auf Blau', 'Yellow on blue')]
  ]);
  /** Im Menü „Ansicht“: nur die Auswahl, ohne eigenen Knopf. */
  let { flach = false }: { flach?: boolean } = $props();
  let offen = $state(false);
  let ort = $state() as HTMLElement;
  let knopf = $state() as HTMLButtonElement;

  function zu(fokus = true) { offen = false; if (fokus) knopf?.focus(); }
  function waehle(t: Thema) { s.einst.thema = t; einstSpeichern(); try { localStorage.setItem(THEMA_GEWAEHLT, '1'); } catch { /* privates Fenster */ } }
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

{#if flach}
  <div class="farbwahl-feld flach" id="farbwahl-feld" role="radiogroup" aria-label={L('Farben und Kontrast', 'Colors and contrast')}>
    {#each MODI as [t, name] (t)}
      <label><input type="radio" name="farbwahl" value={t} checked={s.einst.thema === t} onchange={() => waehle(t)}><span class="muster" data-m={t} aria-hidden="true">Aa</span>{name}</label>
    {/each}
  </div>
{:else}
<div class="farbwahl" bind:this={ort}>
  <button class="k leise nur-symbol" type="button" bind:this={knopf} aria-keyshortcuts="Alt+K" aria-expanded={offen} aria-controls="farbwahl-feld"
    aria-label={L('Farben und Kontrast', 'Colors and contrast')} onclick={() => (offen = !offen)}><Icon n="kontrast" /></button>
  {#if offen}
    <div class="farbwahl-feld klappt" transition:rutsch id="farbwahl-feld" role="radiogroup" aria-label={L('Farben und Kontrast', 'Colors and contrast')}>
      <p class="farbwahl-titel" aria-hidden="true">{L('Farben und Kontrast', 'Colors and contrast')}</p>
      {#each MODI as [t, name] (t)}
        <label><input type="radio" name="farbwahl" value={t} checked={s.einst.thema === t} onchange={() => waehle(t)}><span class="muster" data-m={t} aria-hidden="true">Aa</span>{name}</label>
      {/each}
    </div>
  {/if}
</div>
{/if}

<style>
  .farbwahl { position: relative; }
  .farbwahl-feld { position: absolute; inset-inline-end: 0; top: calc(100% + var(--a2)); z-index: 40; min-width: 15.5rem; padding: var(--a2); background: var(--blatt-gehoben); color: var(--tinte); border: 1px solid var(--linie-stark); border-radius: var(--r); box-shadow: var(--schatten-heben); display: flex; flex-direction: column; }
  .farbwahl-feld.flach { position: static; min-width: 0; padding: 0; background: none; border: 0; box-shadow: none; }
  .farbwahl-titel { font: 650 var(--gr-klein)/1.3 var(--schrift-ui); color: var(--tinte-2); padding: var(--a1) var(--a2) var(--a2); }
  label { display: flex; align-items: center; gap: var(--a3); min-height: var(--ziel); padding: 0 var(--a2); border-radius: var(--r-klein); cursor: pointer; }
  label:hover { background: var(--blatt-2); }
  label:has(input:checked) { font-weight: 650; }
  label:has(input:focus-visible) { box-shadow: var(--fokus-ring); }
  input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 0; }
  /* Kleine Probe je Modus - feste Farben, damit sie in jedem Modus gleich aussehen. */
  .muster { display: inline-grid; place-items: center; width: 2.25rem; height: 1.6rem; border-radius: 6px; font: 700 var(--gr-klein)/1 var(--schrift-ui); border: 1px solid #777; }
  .muster[data-m="auto"] { background: linear-gradient(135deg, #FFFEFB 50%, #1D232A 50%); color: transparent; }
  .muster[data-m="hell"] { background: #FFFEFB; color: #1D2530; }
  .muster[data-m="dunkel"] { background: #1D232A; color: #E8ECEF; }
  .muster[data-m="sw"] { background: #FFFDF0; color: #000; }
  .muster[data-m="ws"] { background: #000; color: #FFF; }
  .muster[data-m="sg"] { background: #FFEC8C; color: #000; }
  .muster[data-m="gs"] { background: #000; color: #FFD600; }
  .muster[data-m="gb"] { background: #132E78; color: #FFD600; }
</style>
