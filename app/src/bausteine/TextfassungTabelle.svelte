<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  /**
   * „Daten als Tabelle“ unter einem Diagramm (Barrierefreiheit): dieselben Angaben wie das Bild als Sätze und Tabellen, aufklappbar.
   * Für Screenreader und Braillezeile, und für alle, die lieber Zahlen lesen. Gleiche Form wie bei den Diagrammen der Üben-Fragen (FrageDiagramm.svelte).
   */
  let { saetze, tabellen, titel = '' }: { saetze: string[]; tabellen: { titel: string; kopf: string[]; zeilen: string[][] }[]; titel?: string } = $props();
</script>
<details class="tf-text">
  <summary>{titel || L('Daten als Tabelle', 'Data as a table')}</summary>
  <div class="tf-inhalt">
    {#each saetze as satz}<p>{satz}</p>{/each}
    {#each tabellen as t}
      <div class="tf-rahmen">
        <table>
          <caption>{t.titel}</caption>
          <thead><tr>{#each t.kopf as k}<th scope="col">{k}</th>{/each}</tr></thead>
          <tbody>{#each t.zeilen as z}<tr>{#each z as c, i}{#if i === 0}<th scope="row">{c}</th>{:else}<td>{c}</td>{/if}{/each}</tr>{/each}</tbody>
        </table>
      </div>
    {/each}
  </div>
</details>

<style>
  .tf-text summary { cursor: pointer; font-weight: 600; min-height: 44px; padding-block: var(--a3); box-sizing: border-box; }
  .tf-text summary:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; border-radius: 4px; }
  .tf-inhalt { display: grid; gap: var(--a2); padding: var(--a2) 0; }
  .tf-inhalt p { margin: 0; }
  .tf-rahmen { overflow-x: auto; margin-top: var(--a2); max-height: 22rem; overflow-y: auto; }
  .tf-rahmen table { border-collapse: collapse; font-variant-numeric: tabular-nums; }
  .tf-rahmen th, .tf-rahmen td { padding: var(--a1) var(--a3); border-bottom: 1px solid var(--linie); text-align: right; }
  .tf-rahmen th[scope='row'], .tf-rahmen thead th:first-child { text-align: start; }
  .tf-rahmen caption { text-align: start; font-weight: 650; padding-bottom: var(--a1); }
</style>
