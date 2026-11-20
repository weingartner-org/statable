<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import TabelleZusammenstellen from '../bausteine/TabelleZusammenstellen.svelte';

  /** Die Seite „Tabelle zusammenstellen“ (#tabelle, zum Ändern #tabelle/<Blatt>): ein eigener Einstieg wie die Daten-Assistenten, keine Karte. */
  let { id = '' }: { id?: string } = $props();
</script>

<div class="tisch ohne-rand"><section class="blatt rund tabelle-seite" aria-labelledby="tabelle-t">
  <SeitenKopf titelId="tabelle-t" titel={id ? L('Tabelle ändern', 'Change the table') : L('Tabelle zusammenstellen', 'Assemble a table')} zurueck={id ? `blatt/${id}` : 'blatt/neu'} />
  {#key id}<TabelleZusammenstellen blattId={id} />{/key}
</section></div>

<style>
  .tabelle-seite { padding-bottom: var(--a6); }
</style>
