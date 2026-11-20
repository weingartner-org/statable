<script lang="ts">
  import { fallVon, verweiseGruppe, oeffneKarte, type Gruppe } from '../lib/naechster-schritt';
  /** Die Verweise einer Gruppe von „Weiter mit …“ unter dem Ergebnis (Usability Stufe 4a): Alltagsfrage mit Fachbegriff, echte Links, keine Ansage.
   *  `mehrere`: bei der Regression zwei und mehr Einflussgrößen (sonst kein VIF-Verweis). */
  let { typ, gruppe, mehrere = true }: { typ: string | undefined | null; gruppe: Gruppe; mehrere?: boolean } = $props();
  const liste = $derived(verweiseGruppe(fallVon(typ), gruppe, mehrere));
</script>
{#if liste.length}
  <ul class="wm-liste">
    {#each liste as v, i (i)}
      <li>{#if 'hilfe' in v.ziel}<a href="#hilfe/{v.ziel.hilfe}">{v.text}</a>{:else}{@const karte = v.ziel.karte}<a href="#blatt/neu" onclick={e => { e.preventDefault(); oeffneKarte(karte); }}>{v.text}</a>{/if}</li>
    {/each}
  </ul>
{/if}
