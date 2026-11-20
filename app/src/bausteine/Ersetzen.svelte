<script lang="ts">
  import { tick } from 'svelte';
  import { d, L } from '../lib/sitzung.svelte';
  import { rueckfrage, beantworte } from '../lib/rueckfrage.svelte';
  import { dialogFokus } from './dialogFokus';
  import Icon from './Icon.svelte';

  /** Rückfrage vor dem Entfernen eines Projekts aus dem Browser. Fokus zuerst auf „Abbrechen“ - nichts geht aus Versehen verloren. */
  let dlg = $state<HTMLDialogElement>();
  $effect(() => { if (rueckfrage.offen && dlg && !dlg.open) { dlg.showModal(); tick().then(() => document.getElementById('ers-nein')?.focus()); } else if (!rueckfrage.offen && dlg?.open) dlg.close(); });
  const f = $derived(rueckfrage.offen);
</script>

<dialog bind:this={dlg} use:dialogFokus aria-labelledby={f ? "ers-t" : undefined} aria-describedby={f ? "ers-text" : undefined} oncancel={(e) => { e.preventDefault(); beantworte('abbrechen'); }}>
  {#if f}
    <div class="dialog-innen">
      <div class="dialog-kopf"><Icon n="hinweis" k="hw" /><h2 id="ers-t">{L(`„${f.name}“ aus dem Browser entfernen?`, `Remove "${f.name}" from the browser?`)}</h2></div>
      <p id="ers-text">{d(
        'Danach liegt das Projekt nur noch als Datei vor, falls du es gespeichert hast. Sonst sind Daten, Blätter und Notizen weg. Die ursprüngliche Datendatei auf deinem Gerät bleibt unberührt.',
        'Danach liegt das Projekt nur noch als Datei vor, falls Sie es gespeichert haben. Sonst sind Daten, Blätter und Notizen weg. Die ursprüngliche Datendatei auf Ihrem Gerät bleibt unberührt.',
        'Afterwards the project exists only as a file - if you have saved it as a file. Otherwise data, pages and notes are gone. The original data file on your device is not touched.')}</p>
      <div class="knopfzeile">
        <button class="k haupt" type="button" onclick={() => beantworte('speichern')}><Icon n="download" />{L('Erst als Datei speichern', 'Save as a file first')}</button>
        <button class="k" type="button" onclick={() => beantworte('weiter')}>{L('Entfernen', 'Remove')}</button>
        <button class="k leise" id="ers-nein" type="button" onclick={() => beantworte('abbrechen')}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </div>
  {/if}
</dialog>
