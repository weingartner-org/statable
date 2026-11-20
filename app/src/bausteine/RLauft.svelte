<script lang="ts">
  /**
   * Leiste für lange R-Rechnungen, die keinen eigenen Knopf zeigen. R läuft an vielen Stellen (Blatt von selbst, Blöcke, Assistenten), und eine hängende Rechnung sperrt alle folgenden:
   * Abbrechen muss darum überall erreichbar sein. Erscheint erst nach `NACH_MS`, damit sie bei normalen Rechnungen nie auftaucht. Das Erscheinen sagt `lib/ansage.ts` einmal an (der Ort `.toast-ort` ist keine Live-Region mehr); der späte Hinweis steht nur da, nichts dazwischen.
   */
  import { L, melde, textAbgebrochen } from '../lib/sitzung.svelte';
  import { verzoegert } from '../lib/laedt.svelte';
  import { R_HINWEIS_MS, rAbbrechen, rStatus } from '../lib/rlauf.svelte';
  import { sage } from '../lib/ansage';
  import Rechnet from './Rechnet.svelte';
  const NACH_MS = 5000;
  const spaet = verzoegert(() => rStatus.belegt && !rStatus.knoepfe, NACH_MS);
  const lange = verzoegert(() => rStatus.belegt, R_HINWEIS_MS);
  $effect(() => { if (spaet.an) sage(L('R rechnet …', 'R is calculating …')); });
  function abbrechen() { rAbbrechen(); melde(textAbgebrochen()); }
</script>

{#if spaet.an}
  <div class="toast" style="flex-wrap:wrap">
    <span><Rechnet text={L('R rechnet …', 'R is calculating …')} />{#if lange.an}{' '}{L('Das dauert länger. Bei großen Daten ist das normal. Warten oder abbrechen ist beides möglich: Die Daten bleiben unverändert.', 'This is taking longer. With large data that is normal. You can wait or cancel: the data stay unchanged.')}{/if}</span>
    <button class="k" type="button" onclick={abbrechen}>{L('Abbrechen', 'Cancel')}</button>
  </div>
{/if}
