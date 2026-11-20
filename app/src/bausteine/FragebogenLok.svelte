<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import type { Lok } from '../lib/fragebogenplan';

  /**
   * Ein Text, ein Feld je Sprache des Plans (Fragebogen planen, 2C). Übernommen wird beim Verlassen des Feldes (`change`), nicht bei jedem Zeichen:
   * ein Schritt im Verlauf, eine Ansage. Die Gruppe heißt wie der Text (`fieldset`/`legend`), jedes Feld nach seiner Sprache.
   */
  let { sprachen, label, idBasis, werte, beiAenderung, mehrzeilig = false, hinweis = '', fehlt = [] }: {
    sprachen: string[]; label: string; idBasis: string; werte: Lok | undefined;
    beiAenderung: (sprache: string, text: string) => void; mehrzeilig?: boolean; hinweis?: string; fehlt?: string[];
  } = $props();
  const sprachName = (sp: string) => (sp === 'de' ? L('Deutsch', 'German') : sp === 'en' ? L('Englisch', 'English') : sp);
</script>

<fieldset class="lok">
  <legend>{label}</legend>
  {#each sprachen as sp (sp)}
    <div class="eingabe">
      <label for="{idBasis}-{sp}">{label} ({sprachName(sp)})</label>
      {#if mehrzeilig}
        <textarea id="{idBasis}-{sp}" lang={sp} rows="2" value={werte?.[sp] ?? ''} aria-describedby={hinweis ? `${idBasis}-h` : undefined} onchange={(e) => beiAenderung(sp, e.currentTarget.value)}></textarea>
      {:else}
        <input type="text" id="{idBasis}-{sp}" lang={sp} value={werte?.[sp] ?? ''} aria-describedby={hinweis ? `${idBasis}-h` : undefined} onchange={(e) => beiAenderung(sp, e.currentTarget.value)}>
      {/if}
      {#if fehlt.includes(sp)}<span class="hilfe">{L('Dieser Text fehlt noch.', 'This text is still missing.')}</span>{/if}
    </div>
  {/each}
  {#if hinweis}<p class="hilfe" id="{idBasis}-h">{hinweis}</p>{/if}
</fieldset>

<style>
  .lok { border: 0; padding: 0; margin: 0 0 var(--a3); min-width: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .lok legend { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); padding: 0 0 var(--a1); }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
</style>
