<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { begriffe, beendeBegriffe, zurueckBegriff } from '../lib/begriffsrand.svelte';
  import BegriffsInhalt from './BegriffsInhalt.svelte';
  import Icon from './Icon.svelte';
  import { FACHWORT_HINWEIS_ID } from '../lib/begriffsverlinker';
  /** Seiten ohne sichtbare Seitenleiste (Bericht, Daten, Handy …): der Begriff erscheint in einem Fenster. */
  let dlg = $state<HTMLDialogElement>();
  const an = $derived(begriffe.stapel.length > 0 && !begriffe.imRand);
  $effect(() => { if (an && dlg && !dlg.open) dlg.showModal(); else if (!an && dlg?.open) dlg.close(); });
</script>

<!-- Der eine Hinweistext, auf den jeder Fachwort-Knopf zeigt (aria-describedby); der Verlinker lässt `.nur-vorleser` aus. -->
<p id={FACHWORT_HINWEIS_ID} class="nur-vorleser">{L('Fachbegriff, Eingabe zeigt die Erklärung', 'Technical term, press Enter to show the explanation')}</p>

<dialog bind:this={dlg} class="begriff-popup" aria-label={L('Rand: Erklärungen', 'Margin: explanations')} onclose={beendeBegriffe} oncancel={(e) => { if (begriffe.stapel.length > 1) { e.preventDefault(); zurueckBegriff(); } }}>
  <div class="dialog-innen"><div class="dialog-kopf"><div class="notiz im-dialog rand-kontext">{#if an}<BegriffsInhalt basis={false} />{/if}</div>
    <button class="k leise nur-symbol" type="button" aria-label={L('Schließen', 'Close')} onclick={() => dlg?.close()}><Icon n="zu" /></button></div></div>
</dialog>
