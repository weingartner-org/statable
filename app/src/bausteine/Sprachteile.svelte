<script lang="ts">
  import { aktuelleSprache } from '../lib/sitzung.svelte';
  import { sprachteile } from '../lib/sprachteile';
  /** Gibt `text` aus; ein englischer Fachbegriff in Klammern bekommt `lang="en"` (WCAG 3.1.2, Regel in `lib/sprachteile.ts`). Der sichtbare Text bleibt gleich. */
  let { text }: { text: string } = $props();
  const teile = $derived(sprachteile(text, aktuelleSprache()));
</script>
{#each teile as x}{#if x.en}<span lang="en">{x.t}</span>{:else}{x.t}{/if}{/each}
