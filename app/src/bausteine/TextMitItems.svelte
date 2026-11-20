<script lang="ts">
  import { teileItems, type TextTeil } from '../lib/item-liste';

  /** Text, in dem Aufzählungen von Fragen mit Wortlaut (A1 „…“, A2 „…“ …) als Liste stehen, eine Frage je Zeile, bei viel Breite zweispaltig
   *  (Johannes 13.11.2026: wie in der Auswertung, nicht als Fließtext). `teile` statt `text`, wenn der Aufrufer schon geteilt hat. */
  let { text = '', teile, klasse = '', id }: { text?: string; teile?: TextTeil[]; klasse?: string; id?: string } = $props();
  const liste = $derived(teile ?? teileItems(text));
</script>

<div class="tmi {klasse}" {id}>
  {#each liste as x, i (i)}
    {#if x.art === 'text'}<p>{x.t}</p>{:else}<ul>{#each x.eintraege as e, k (k)}<li>{e}</li>{/each}</ul>{/if}
  {/each}
</div>

<style>
  .tmi { container-type: inline-size; }
  .tmi > p { margin: 0; }
  .tmi > * + * { margin-top: var(--a2); }
  .tmi ul { margin-bottom: 0; padding-inline-start: 1.2em; }
  .tmi li { margin: 0.15em 0; line-height: 1.4; break-inside: avoid; }
  @container (min-width: 40rem) { .tmi ul { columns: 2; column-gap: var(--a5, 2rem); } }
</style>
