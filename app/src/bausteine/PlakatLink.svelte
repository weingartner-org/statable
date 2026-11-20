<script lang="ts">
  import { L, aktuelleSprache } from '../lib/sitzung.svelte';
  import { FREIGEGEBEN, SPRACHNAMEN } from '../i18n/laufzeit';
  import Icon from './Icon.svelte';
  /** Plakat zum Herunterladen (A3, PDF), erzeugt mit scripts/plakat-pdf.mjs in allen freigegebenen Sprachen (Johannes 18.10.2026).
   *  Zuerst das Plakat in der Sprache der Oberfläche; mit `alle` zusätzlich die Liste aller Sprachen (Impressum). */
  let { alle = false }: { alle?: boolean } = $props();
  const name = (sp: string) => `statable-plakat-${sp}.pdf`;
  const datei = (sp: string) => `plakat/${name(sp)}`;
  const eigene = $derived(FREIGEGEBEN.includes(aktuelleSprache()) ? aktuelleSprache() : 'en');
</script>

<p class="plakat-zeile"><a class="k" href={datei(eigene)} download={name(eigene)} type="application/pdf"><Icon n="download" />{L('Plakat herunterladen (A3, PDF)', 'Download poster (A3, PDF)')}</a></p>
{#if alle}
  <p class="plakat-sprachen">{L('In anderen Sprachen:', 'In other languages:')}</p>
  <ul class="plakat-liste">{#each FREIGEGEBEN.filter(sp => sp !== eigene) as sp (sp)}<li><a href={datei(sp)} download={name(sp)} type="application/pdf" hreflang={sp} lang={sp}>{SPRACHNAMEN[sp]}</a></li>{/each}</ul>
{/if}

<style>
  .plakat-zeile { margin: var(--a2) 0; }
  .plakat-sprachen { margin-bottom: var(--a1); }
  .plakat-liste { display: flex; flex-wrap: wrap; gap: var(--a1) var(--a4); list-style: none; padding: 0; margin: 0 0 var(--a3); }
</style>
