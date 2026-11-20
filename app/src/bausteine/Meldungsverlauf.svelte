<script lang="ts">
  /** Fenster „Letzte Meldungen“ (Alt+M, Befehlspalette): die letzten 30 Meldungen, auch die, die schon verschwunden sind (WCAG 2.2.1).
   *  Meldungen mit „Rückgängig“ nennen den Tastenweg Strg+Z; der Knopf hier wirkt nur, wenn es noch etwas zurückzunehmen gibt. */
  import { onMount } from 'svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { empfaenger } from '../lib/kuerzel';
  import Icon from './Icon.svelte';
  import { dialogFokus } from './dialogFokus';

  let dlg = $state<HTMLDialogElement>();
  const uhr = (z?: number) => (z ? new Date(z).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');
  onMount(() => {
    empfaenger.meldungen = () => { if (dlg && !dlg.open) dlg.showModal(); };
    return () => { empfaenger.meldungen = null; };
  });
</script>

<dialog bind:this={dlg} use:dialogFokus={{ erstes: '#mv-ende' }} class="kuerzel" aria-labelledby="mv-t">
  <div class="dialog-innen">
    <div class="dialog-kopf"><Icon n="info" /><h2 id="mv-t">{L('Letzte Meldungen', 'Latest messages')}</h2></div>
    <div class="mv-inhalt">
      {#if s.meldungsverlauf.length}
        <ol>
          {#each s.meldungsverlauf as m (m.id)}
            <li><time>{uhr(m.zeit)}</time> {m.text}{#if m.hinweis} <span class="mv-hinweis">{m.hinweis}</span>{/if}</li>
          {/each}
        </ol>
      {:else}
        <p>{L('Noch keine Meldungen.', 'No messages yet.')}</p>
      {/if}
    </div>
    <div class="knopfzeile"><button id="mv-ende" class="k haupt" type="button" onclick={() => dlg?.close()}>{L('Schließen', 'Close')}</button></div>
  </div>
</dialog>

<style>
  dialog.kuerzel { width: min(42rem, calc(100vw - 2rem)); }
  .mv-inhalt { overflow: auto; max-height: min(55vh, 28rem); padding-inline-end: var(--a2); }
  ol { list-style: none; margin: 0; padding: 0; }
  li { padding: var(--a2); border-bottom: 1px solid var(--linie); }
  time { color: var(--tinte-2); font-size: var(--gr-klein); margin-inline-end: var(--a2); }
  .mv-hinweis { color: var(--tinte-2); }
</style>
