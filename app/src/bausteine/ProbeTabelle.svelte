<script lang="ts">
  import { L, Lp } from '../lib/sitzung.svelte';
  import type { Probe } from '../lib/datenassistentprobe';
  import type { Vorschau } from '../lib/assistentvorschau.svelte';
  import { anzeigeWert } from '../lib/datenassistentsaetze';
  import Rechnet from './Rechnet.svelte';

  /** Vorschau-Tabelle der Assistenten (Später S-C): die ersten 10 Fälle der beteiligten Spalten, mit Lade-Animation und Knopf bei großen Tabellen. */
  let { vs, bereit, nochNicht, neu }: { vs: Vorschau<Probe>; bereit: boolean; nochNicht?: string; neu: () => void } = $props();
</script>

{#if !bereit}<p class="as-hilfe">{nochNicht ?? L('Die Vorschau erscheint, sobald die Eingaben vollständig sind.', 'The preview appears as soon as the entries are complete.')}</p>
{:else if vs.wert && !vs.wert.fehler.length}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
  <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Vorschau, die ersten 10 Fälle', 'Preview, the first 10 cases')}>
    <table class="as-tab"><thead><tr>{#each vs.wert.spalten as c}<th scope="col" class:zahl={c.art === 'zahl'}>{c.name}</th>{/each}</tr></thead>
      <tbody>{#each vs.wert.zeilen as z}<tr>{#each vs.wert.spalten as c, i}<td class:zahl={typeof z[i] === 'number'}>{anzeigeWert(c, z[i] ?? null)}</td>{/each}</tr>{/each}</tbody></table></div>
    <p class="as-hilfe nur-vorleser">{Lp(vs.wert.zeilen.length, `Vorschau aktualisiert: ${vs.wert.zeilen.length} Fall.`, `Vorschau aktualisiert: ${vs.wert.zeilen.length} Fälle.`, `Preview updated: ${vs.wert.zeilen.length} case.`, `Preview updated: ${vs.wert.zeilen.length} cases.`)}</p>
{:else if vs.laeuft}<p><Rechnet text={L('Die Vorschau wird gerechnet …', 'The preview is being calculated …')} /></p>
{:else if vs.wert?.fehler.length}<p class="as-hilfe">{L(`PSPP meldet: ${vs.wert.fehler[0]}`, `PSPP reports: ${vs.wert.fehler[0]}`)}</p>
{:else}<button class="k" type="button" onclick={neu}>{L('Vorschau berechnen', 'Calculate preview')}</button>{/if}
