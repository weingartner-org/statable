<script lang="ts">
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { blattwahl, beantworteBlatt } from '../lib/blattwahl.svelte';
  import Icon from './Icon.svelte';
  import { dialogFokus } from './dialogFokus';

  /** Frage beim Öffnen einer Excel-Datei mit mehreren Blättern: welches? Das erste Blatt ist vorgewählt, der Fokus liegt darauf. */
  let dlg = $state<HTMLDialogElement>();
  $effect(() => { if (blattwahl.offen && dlg && !dlg.open) { dlg.showModal(); tick().then(() => (dlg?.querySelector('input[type=radio]:checked') as HTMLElement | null)?.focus()); } else if (!blattwahl.offen && dlg?.open) dlg.close(); });
  const f = $derived(blattwahl.offen);
</script>

<dialog bind:this={dlg} use:dialogFokus aria-labelledby={f ? "bw-t" : undefined} aria-describedby={f ? "bw-text" : undefined} oncancel={(e) => { e.preventDefault(); beantworteBlatt(null); }}>
  {#if f}
    <form class="dialog-innen" onsubmit={(e) => { e.preventDefault(); beantworteBlatt(blattwahl.gewaehlt); }}>
      <div class="dialog-kopf"><Icon n="tabelle" k="hw" /><h2 id="bw-t">{L('Welches Blatt soll Statable öffnen?', 'Which sheet should Statable open?')}</h2></div>
      <p id="bw-text">{L(`„${f.datei}“ hat ${f.blaetter.length} Blätter mit Daten. Statable öffnet eines davon. Die anderen werden nicht gelesen.`, `"${f.datei}" has ${f.blaetter.length} sheets with data. Statable opens one of them. The others are not read.`)}</p>
      <fieldset class="blatt-liste">
        <legend class="nur-vorleser">{L('Blätter', 'Sheets')}</legend>
        {#each f.blaetter as b (b.name)}
          <label class="ankreuz"><input type="radio" name="blatt-wahl" value={b.name} bind:group={blattwahl.gewaehlt}><span>{b.name} <span class="hilfe">- {Lp(b.zeilen, `${b.zeilen} Zeile`, `${b.zeilen} Zeilen`, `${b.zeilen} row`, `${b.zeilen} rows`)}</span></span></label>
        {/each}
      </fieldset>
      <div class="knopfzeile">
        <button class="k haupt" type="submit">{L('Dieses Blatt öffnen', 'Open this sheet')}</button>
        <button class="k leise" type="button" onclick={() => beantworteBlatt(null)}>{L('Abbrechen', 'Cancel')}</button>
      </div>
    </form>
  {/if}
</dialog>

<style>
  .blatt-liste { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a1, 4px); max-height: 50vh; overflow: auto; }
  .blatt-liste .ankreuz { padding-top: 0; align-items: center; }
</style>
