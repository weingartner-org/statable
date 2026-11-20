<script lang="ts">
  /** Kontraste für den Zeitfaktor der einfaktoriellen Messwiederholung (Field-Stufe 3): holt die Daten wie das Blatt und reicht sie an MwKontrasteBlock. */
  import MwKontrasteBlock from './MwKontrasteBlock.svelte';
  import { L } from '../lib/sitzung.svelte';
  import { mwZeilen } from '../lib/mwdaten';

  let { spalten, gruppenSpalte, name }: { spalten: string[]; gruppenSpalte?: string; name: (n: string) => string } = $props();
  const d = $derived(mwZeilen(spalten, gruppenSpalte));
</script>
{#if d && d.zeilen.length >= 3}<MwKontrasteBlock werte={d.zeilen} stufen={spalten.map(n => name(n))} gruppen={d.gruppen} faktor={L('Zeit', 'Time')} />{/if}
