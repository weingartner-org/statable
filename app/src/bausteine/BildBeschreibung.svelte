<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import type { BildText } from '../lib/bildtext';
  /**
   * „Beschreibung und Daten“ unter einem Diagramm (Barrierefreiheit, Welle 4). Nimmt das Ergebnis von `bildtext(art, daten)`:
   *   <svg role="img" aria-label={t.kurz}>…</svg>  <BildBeschreibung {...t} />
   * Aufklappbar; darin die Beschreibung als Absätze, die Elemente als Liste (entfällt bei mehr als 20 Elementen, dann steht alles in der Tabelle)
   * und die Daten als echte Tabelle mit Überschrift (caption) und Kopfzellen (scope). Gleiche Form wie TextfassungTabelle.svelte.
   * `kurz` wird hier nicht wiederholt (steht schon als Name am Bild).
   */
  let { kurz = '', beschreibung, liste = [], tabelle, titel = '' }: Partial<BildText> & { beschreibung: string[]; tabelle: BildText['tabelle']; titel?: string } = $props();
  // Für den Export (Word): der Text reist mit dem Diagramm im selben Behälter mit (lib/diagrammbild.ts liest `data-bildtext`), so braucht kein Baustein den Export zu kennen.
  const fuerExport = $derived(JSON.stringify({ kurz, beschreibung, liste, tabelle }));
  const hatTabelle = $derived(tabelle.kopf.length > 0 && tabelle.zeilen.length > 0);
</script>
<details class="bb-text" data-bildtext={fuerExport}>
  <summary>{titel || L('Beschreibung und Daten', 'Description and data')}</summary>
  <div class="bb-inhalt">
    {#each beschreibung as absatz}<p>{absatz}</p>{/each}
    {#if liste.length}<ul>{#each liste as punkt}<li>{punkt}</li>{/each}</ul>{/if}
    {#if hatTabelle}
      <div class="bb-rahmen" role="region" aria-label={tabelle.titel} tabindex="0">
        <table>
          <caption>{tabelle.titel}</caption>
          <thead><tr>{#each tabelle.kopf as k}<th scope="col">{#if k}{k}{:else}<span class="nur-vorleser">{L('Name', 'Name')}</span>{/if}</th>{/each}</tr></thead>
          <tbody>{#each tabelle.zeilen as z}<tr>{#each z as c, i}{#if i === 0 && tabelle.zeilenKopf}<th scope="row">{c}</th>{:else}<td>{c}</td>{/if}{/each}</tr>{/each}</tbody>
        </table>
      </div>
    {/if}
  </div>
</details>

<style>
  .bb-text summary { cursor: pointer; font-weight: 600; min-height: 44px; padding-block: var(--a3); box-sizing: border-box; }
  .bb-text summary:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; box-shadow: var(--fokus-ring); border-radius: 4px; }
  .bb-inhalt { display: grid; gap: var(--a2); padding: var(--a2) 0; }
  .bb-inhalt p { margin: 0; }
  .bb-inhalt ul { margin: 0; padding-inline-start: var(--a5, 1.25rem); display: grid; gap: var(--a1); }
  .bb-rahmen { overflow-x: auto; margin-top: var(--a2); max-height: 22rem; overflow-y: auto; }
  .bb-rahmen:focus-visible { outline: var(--fokus-outline); outline-offset: -3px; }
  .bb-rahmen table { border-collapse: collapse; font-variant-numeric: tabular-nums; }
  .bb-rahmen th, .bb-rahmen td { padding: var(--a1) var(--a3); border-bottom: 1px solid var(--linie); text-align: right; }
  .bb-rahmen th[scope='row'], .bb-rahmen thead th:first-child { text-align: start; }
  .bb-rahmen caption { text-align: start; font-weight: 650; padding-bottom: var(--a1); }
</style>
