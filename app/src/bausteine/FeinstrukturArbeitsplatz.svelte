<script lang="ts">
  /**
   * Feinstruktur-Arbeitsplatz (Sequenzanalyse nach Froschauer und Lueger), F3B1: wählt je nach Stand den Ausschnitt, das Einteilen oder das Deuten.
   * Solange eine Analyse offen ist (`iv.feinstruktur`), zeigt die Seite Interviews nur diesen Arbeitsplatz (damit nichts vom Dokument daneben im DOM steht).
   * Statable deutet nichts und macht keine Vorschläge.
   */
  import { iv, sequenzanalysen } from '../lib/interviews.svelte';
  import FeinstrukturAusschnitt from './FeinstrukturAusschnitt.svelte';
  import FeinstrukturEinteilen from './FeinstrukturEinteilen.svelte';
  import FeinstrukturDeuten from './FeinstrukturDeuten.svelte';

  const neu = $derived(iv.feinstruktur?.startsWith('neu:') ? iv.feinstruktur.slice(4) : null);
  const sa = $derived(neu === null ? sequenzanalysen().find(x => x.id === iv.feinstruktur) : undefined);
</script>

<div class="arbeitsplatz">
  {#if neu !== null}
    {#key neu}<FeinstrukturAusschnitt dokId={neu} />{/key}
  {:else if sa}
    {#key `${sa.id}-${sa.phase === 'deuten' ? 'd' : 'e'}`}
      {#if sa.phase === 'deuten'}<FeinstrukturDeuten {sa} />{:else}<FeinstrukturEinteilen {sa} />{/if}
    {/key}
  {/if}
</div>
