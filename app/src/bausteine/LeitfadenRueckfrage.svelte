<script lang="ts">
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { iv } from '../lib/interviews.svelte';
  import Icon from './Icon.svelte';
  import { dialogFokus, DIALOG_SPAET_MS } from './dialogFokus';

  /** Rückfrage vor dem Entfernen (Interviews). Der Fokus liegt zuerst auf „Abbrechen“: nichts geht aus Versehen verloren. */
  let dlg = $state<HTMLDialogElement>();
  const f = $derived(iv.rueckfrage);
  $effect(() => { if (f && dlg && !dlg.open) { dlg.showModal(); tick().then(() => document.getElementById('lfrf-nein')?.focus()); } else if (!f && dlg?.open) dlg.close(); });
  function antwort(ja: boolean) { const x = iv.rueckfrage; iv.rueckfrage = null; if (ja && x) x.tun(); }
</script>

<dialog bind:this={dlg} use:dialogFokus={{ spaet: DIALOG_SPAET_MS }} aria-labelledby={f ? 'lfrf-t' : undefined} aria-describedby={f ? 'lfrf-text' : undefined} oncancel={(e) => { e.preventDefault(); antwort(false); }}>
  {#if f}
    <div class="dialog-innen">
      <div class="dialog-kopf"><Icon n="hinweis" k="hw" /><h2 id="lfrf-t">{f.titel}</h2></div>
      <p id="lfrf-text">{f.text}</p>
      <div class="knopfzeile">
        <button class="k haupt" type="button" onclick={() => antwort(true)}><Icon n="zu" />{f.ja}</button>
        <button class="k leise" id="lfrf-nein" type="button" onclick={() => antwort(false)}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </div>
  {/if}
</dialog>
