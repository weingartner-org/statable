<script lang="ts">
  import type { Snippet } from 'svelte';
  import HilfeLink from './HilfeLink.svelte';
  import Zurueck from './Zurueck.svelte';
  /** Derselbe Seitenkopf auf jeder Seite (Stufe 1 „Statable usable machen“):
   *  Titel (h1) · „?“ direkt dahinter · freie Mitte (z. B. Umschalter) · Aktionen rechts, die Hauptaktion zuletzt.
   *  Darunter optional ein Untertitel. „Zurück“ nur dort, wo kein Reiter und keine Kopfzeile hinführt: dann „Zurück zu …“ mit dem echten Ziel. */
  let { titel, titelId, titelTipp, hilfe, zurueck, mitte, aktionen, untertitel, dicht = false, h1El = $bindable(), fokussierbar = false }: {
    titel: string | Snippet; titelId?: string; titelTipp?: string;
    hilfe?: { id: string; text?: string };
    /** `true` = „Zurück“ zur letzten Arbeitsseite, Text = fester Weg (Hash), nichts = kein Zurück. */
    zurueck?: boolean | string; mitte?: Snippet; aktionen?: Snippet; untertitel?: Snippet;
    /** Enger Kopf der Datenseite. */ dicht?: boolean;
    h1El?: HTMLElement | undefined; fokussierbar?: boolean;
  } = $props();
</script>

<div class="blatt-kopf sk" class:daten-kopf={dicht} class:ohne-mitte={!mitte}>
  <span class="sk-titel"><h1 id={titelId} data-tipp={titelTipp} tabindex={fokussierbar ? -1 : undefined} bind:this={h1El}>{#if typeof titel === 'string'}{titel}{:else}{@render titel()}{/if}</h1>{#if hilfe}<HilfeLink id={hilfe.id} text={hilfe.text} />{/if}</span>
  {@render mitte?.()}
  {#if aktionen || zurueck}<span class="sk-aktionen">{#if zurueck}<Zurueck ziel={typeof zurueck === 'string' ? zurueck : ''} />{/if}{@render aktionen?.()}</span>{/if}
  {@render untertitel?.()}
</div>
