<script lang="ts">
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { ed } from '../lib/fragebogen-editor.svelte';
  import Icon from './Icon.svelte';
  import { dialogFokus } from './dialogFokus';

  /** Rückfrage vor dem Löschen (Fragebogen planen). Der Fokus liegt zuerst auf „Abbrechen“: nichts geht aus Versehen verloren. */
  let dlg = $state<HTMLDialogElement>();
  const f = $derived(ed.rueckfrage);
  $effect(() => { if (f && dlg && !dlg.open) { dlg.showModal(); tick().then(() => document.getElementById('fbrf-nein')?.focus()); } else if (!f && dlg?.open) dlg.close(); });
  function antwort(ja: boolean) { const x = ed.rueckfrage; ed.rueckfrage = null; if (ja && x) x.tun(); }
</script>

<dialog bind:this={dlg} use:dialogFokus aria-labelledby={f ? 'fbrf-t' : undefined} aria-describedby={f ? 'fbrf-text' : undefined} oncancel={(e) => { e.preventDefault(); antwort(false); }}>
  {#if f}
    <div class="dialog-innen">
      <div class="dialog-kopf"><Icon n="hinweis" k="hw" /><h2 id="fbrf-t">{f.titel}</h2></div>
      <p id="fbrf-text">{f.text}</p>
      <div class="knopfzeile">
        <button class="k haupt" type="button" onclick={() => antwort(true)}><Icon n="zu" />{f.ja}</button>
        <button class="k leise" id="fbrf-nein" type="button" onclick={() => antwort(false)}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </div>
  {/if}
</dialog>
