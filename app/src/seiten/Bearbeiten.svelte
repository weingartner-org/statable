<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import AssistentUmkodieren from '../bausteine/AssistentUmkodieren.svelte';
  import AssistentBerechnen from '../bausteine/AssistentBerechnen.svelte';
  import AssistentAuswahl from '../bausteine/AssistentAuswahl.svelte';
  import AssistentZusammen from '../bausteine/AssistentZusammen.svelte';
  import AssistentAggregieren from '../bausteine/AssistentAggregieren.svelte';
  import AssistentDoppelte from '../bausteine/AssistentDoppelte.svelte';
  import AssistentZaehlen from '../bausteine/AssistentZaehlen.svelte';
  import AssistentFehlendcodes from '../bausteine/AssistentFehlendcodes.svelte';
  import AssistentSortieren from '../bausteine/AssistentSortieren.svelte';
  import AssistentRang from '../bausteine/AssistentRang.svelte';
  import AssistentDatum from '../bausteine/AssistentDatum.svelte';
  import AssistentAuffaellig from '../bausteine/AssistentAuffaellig.svelte';
  import AssistentEigenschaften from '../bausteine/AssistentEigenschaften.svelte';
  import AssistentVergleichen from '../bausteine/AssistentVergleichen.svelte';
  import AssistentZeitreihe from '../bausteine/AssistentZeitreihe.svelte';
  import AssistentIndex from '../bausteine/AssistentIndex.svelte';
  import AssistentMikrodaten from '../bausteine/AssistentMikrodaten.svelte';
  import AssistentKlassifikation from '../bausteine/AssistentKlassifikation.svelte';
  import AssistentPlausibel from '../bausteine/AssistentPlausibel.svelte';
  import AssistentAbgleich from '../bausteine/AssistentAbgleich.svelte';
  import AssistentWinsor from '../bausteine/AssistentWinsor.svelte';
  import { ASSISTENTEN } from '../lib/datenassistenten';

  /** Die Seite „Daten bearbeiten“ (#bearbeiten/<assistent>): zwölf Assistenten, jeder mit Vorschau, sichtbarem Befehl und einem Rückgängig-Schritt. */
  let { id = '' }: { id?: string } = $props();
  const aktiv = $derived(ASSISTENTEN.find(a => a.id === id) ?? ASSISTENTEN[0]!);
</script>

<div class="tisch ohne-rand"><section class="blatt rund bearb" aria-labelledby="bearb-t">
  <SeitenKopf titelId="bearb-t" titel={L('Daten bearbeiten', 'Edit data')} hilfe={{ id: 'daten-vorbereiten', text: L('Hilfe zum Bearbeiten der Daten', 'Help on editing the data') }} zurueck="daten" >
    {#snippet untertitel()}<p>{L('Daten für die Auswertung vorbereiten: umkodieren, berechnen, Fälle auswählen, Dateien zusammenführen, Gruppenkennwerte bilden und doppelte Fälle finden. Jeder Schritt zeigt vorher eine Vorschau und den Befehl, und „Rückgängig“ in der Kopfzeile nimmt ihn zurück.', 'Prepare data for analysis: recode, calculate, select cases, merge files, form group statistics and find duplicate cases. Every step shows a preview and the command first, and "Undo" in the header takes it back.')}</p>{/snippet}
  </SeitenKopf>
  <nav class="bearb-wahl" aria-label={L('Assistenten', 'Assistants')}>
    {#each ASSISTENTEN as a (a.id)}<a href="#bearbeiten/{a.id}" aria-current={a.id === aktiv.id ? 'page' : undefined}><Icon n={a.icon} />{a.name()}</a>{/each}
  </nav>
  {#key aktiv.id}
    {#if aktiv.id === 'umkodieren'}<AssistentUmkodieren />
    {:else if aktiv.id === 'berechnen'}<AssistentBerechnen />
    {:else if aktiv.id === 'auswahl'}<AssistentAuswahl />
    {:else if aktiv.id === 'zusammen'}<AssistentZusammen />
    {:else if aktiv.id === 'aggregieren'}<AssistentAggregieren />
    {:else if aktiv.id === 'zaehlen'}<AssistentZaehlen />
    {:else if aktiv.id === 'fehlendcodes'}<AssistentFehlendcodes />
    {:else if aktiv.id === 'sortieren'}<AssistentSortieren />
    {:else if aktiv.id === 'rang'}<AssistentRang />
    {:else if aktiv.id === 'datum'}<AssistentDatum />
    {:else if aktiv.id === 'auffaellig'}<AssistentAuffaellig />
    {:else if aktiv.id === 'eigenschaften'}<AssistentEigenschaften />
    {:else if aktiv.id === 'vergleichen'}<AssistentVergleichen />
    {:else if aktiv.id === 'zeitreihe'}<AssistentZeitreihe />
    {:else if aktiv.id === 'index'}<AssistentIndex />
    {:else if aktiv.id === 'abgleich'}<AssistentAbgleich />
    {:else if aktiv.id === 'winsor'}<AssistentWinsor />
    {:else if aktiv.id === 'klassifikation'}<AssistentKlassifikation />
    {:else if aktiv.id === 'plausibel'}<AssistentPlausibel />
    {:else if aktiv.id === 'mikrodaten'}<AssistentMikrodaten />
    {:else}<AssistentDoppelte />{/if}
  {/key}
</section></div>

<style>
  .bearb { padding-bottom: var(--a6); }
  .bearb-wahl { display: flex; flex-wrap: wrap; gap: var(--a2); margin: var(--a2) 0 var(--a4); }
  .bearb-wahl a { display: inline-flex; align-items: center; gap: var(--a2); min-height: var(--ziel); padding: 0 var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: inherit; text-decoration: none; }
  .bearb-wahl a:hover { background: var(--akzent-hell); }
  .bearb-wahl a[aria-current='page'] { border-color: var(--akzent); background: var(--akzent-hell); color: var(--akzent-tinte); font-weight: 600; box-shadow: inset 0 0 0 1px var(--akzent); }
  .bearb-wahl a:focus-visible { box-shadow: var(--fokus-ring); }
</style>
