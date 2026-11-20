<script lang="ts">
  import type { Snippet } from 'svelte';
  /** Rahmen um eine Tabelle: wird sie schmaler als ihr Inhalt (Handy, große Schrift), scrollt nur der Rahmen, nicht die Seite. Mit Tastatur erreichbar (tabindex) und benannt. */
  let { titel, children }: { titel: string; children: Snippet } = $props();
</script>
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="ll-scroll" role="region" aria-label={titel} tabindex="0">{@render children()}</div>

<style>
  .ll-scroll { max-width: 100%; overflow-x: auto; }
  .ll-scroll:focus-visible { outline: var(--fokus-outline); outline-offset: -3px; border-radius: var(--r-klein); }
</style>
