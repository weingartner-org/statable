<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import Icon from './Icon.svelte';
  /** Kleiner runder Fragezeichen-Knopf neben einer Funktion: öffnet den passenden Hilfe-Artikel (`#hilfe/<id>`). */
  let { id, text = '' }: { id: string; text?: string } = $props();
  const tipp = $derived(text || L('Hilfe dazu', 'Help on this'));
</script>
<a class="hilfe-link" href="#hilfe/{id}" aria-label={tipp} data-tipp={tipp}><Icon n="frage" /></a>

<style>
  .hilfe-link { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 28px; height: 28px; border-radius: 50%;
    color: var(--tinte-2); text-decoration: none; vertical-align: middle; transition: background var(--dauer-kurz), color var(--dauer-kurz); }
  .hilfe-link:focus-visible { outline: 3px solid var(--fokus); outline-offset: 2px; }
  .hilfe-link:hover { background: var(--akzent-hell); color: var(--akzent-tinte); }
  .hilfe-link :global(.ico) { width: 18px; height: 18px; }
  /* Kontrastmodus (Windows): Der Knopf ist sonst nur ein Symbol ohne Umriss und fällt weg. Rahmen in Systemfarbe, Symbol in Linkfarbe, Fokus deutlich. */
  @media (forced-colors: active) {
    .hilfe-link { border: 2px solid LinkText; color: LinkText; background: Canvas; }
    .hilfe-link:hover, .hilfe-link:focus-visible { background: Highlight; color: HighlightText; border-color: Highlight; }
    .hilfe-link :global(.ico) { stroke: currentColor; }
  }
</style>
