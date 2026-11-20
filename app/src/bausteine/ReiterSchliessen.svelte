<script lang="ts">
  import { tick } from 'svelte';
  import { d, L } from '../lib/sitzung.svelte';
  import { schliessen, blattEntfernen } from '../lib/blattentfernen.svelte';
  import Icon from './Icon.svelte';
  import { dialogFokus } from './dialogFokus';

  /** Rückfrage vor dem Schließen eines Reiters. Fokus zuerst auf „Abbrechen“ - nichts geht aus Versehen verloren. */
  let dlg = $state<HTMLDialogElement>();
  const f = $derived(schliessen.offen);
  $effect(() => { if (f && dlg && !dlg.open) { dlg.showModal(); tick().then(() => document.getElementById('rs-nein')?.focus()); } else if (!f && dlg?.open) dlg.close(); });
  function antwort(ja: boolean) { const id = f?.id; schliessen.offen = null; if (ja && id) blattEntfernen(id); }
</script>

<dialog bind:this={dlg} use:dialogFokus aria-labelledby={f ? "rs-t" : undefined} aria-describedby={f ? "rs-text" : undefined} oncancel={(e) => { e.preventDefault(); antwort(false); }}>
  {#if f}
    <div class="dialog-innen">
      <div class="dialog-kopf"><Icon n="hinweis" k="hw" /><h2 id="rs-t">{L('Auswertung schließen und löschen?', 'Close and delete this analysis?')}</h2></div>
      <p id="rs-text"><b>„{f.titel}“</b><br>{d(
        'Ergebnis, Diagramme und Notiz sind dann weg - auch im Bericht. Deine Daten bleiben, wie sie sind: Du kannst die Auswertung jederzeit neu rechnen.',
        'Ergebnis, Diagramme und Notiz sind dann weg - auch im Bericht. Ihre Daten bleiben, wie sie sind: Sie können die Auswertung jederzeit neu rechnen.',
        'Result, charts and note will be gone - in the report too. Your data stays as it is: you can run the analysis again at any time.')}</p>
      <div class="knopfzeile">
        <button class="k haupt" type="button" onclick={() => antwort(true)}><Icon n="zu" />{L('Schließen und löschen', 'Close and delete')}</button>
        <button class="k leise" id="rs-nein" type="button" onclick={() => antwort(false)}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </div>
  {/if}
</dialog>
