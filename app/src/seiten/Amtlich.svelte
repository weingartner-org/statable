<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import AmtlichBearbeiten from '../bausteine/AmtlichBearbeiten.svelte';

  /** Die Seite „Tabelle für die Veröffentlichung“ (#amtlich, zum Ändern #amtlich/<Blatt>): ein eigener Einstieg wie „Tabelle zusammenstellen“, keine Karte. */
  let { id = '' }: { id?: string } = $props();
</script>

<div class="tisch ohne-rand"><section class="blatt rund amtlich-seite" aria-labelledby="amtlich-t">
  <SeitenKopf titelId="amtlich-t" titel={id ? L('Tabelle ändern', 'Change the table') : L('Tabelle für die Veröffentlichung', 'Table for publication')} zurueck={id ? `blatt/${id}` : 'blatt/neu'} />
  {#key id}<AmtlichBearbeiten blattId={id} />{/key}
</section></div>

<style>
  .amtlich-seite { padding-bottom: var(--a6); }
</style>
