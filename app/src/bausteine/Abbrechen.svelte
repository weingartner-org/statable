<script lang="ts">
  /**
   * Knopf „Abbrechen“ neben einer lang laufenden Rechnung (Abschlusstest D15): erscheint erst nach `NACH_MS`, damit er bei normalen Rechnungen nie auftaucht.
   * Er startet die Engine neu und füllt die Daten aus der Kopie wieder ein (`bricheRechnungAb`). Rechnet gerade R, hilft das nichts: Dafür steht dann der Knopf in RStart oder die Leiste RLauft.
   */
  import { L, bricheRechnungAb } from '../lib/sitzung.svelte';
  import { verzoegert } from '../lib/laedt.svelte';
  import { rStatus } from '../lib/rlauf.svelte';
  const NACH_MS = 5000;
  let { aktiv }: { aktiv: boolean } = $props();
  const spaet = verzoegert(() => aktiv, NACH_MS);
</script>

{#if spaet.an && !rStatus.belegt}<button class="k" type="button" onclick={() => void bricheRechnungAb()}>{L('Abbrechen', 'Cancel')}</button>{/if}
