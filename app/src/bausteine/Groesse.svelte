<script lang="ts">
  import { groesse, stufe, STUFEN, hoechste } from '../lib/groesse.svelte';
  import { L } from '../lib/sitzung.svelte';
  import { proz } from '../i18n/profil';
  import Icon from './Icon.svelte';
  /** − / + im Kopf: alles kleiner oder größer (wie Strg − / Strg +). Die Größe steht nur im Hinweis beim Zeigen (Johannes 09.10.: keine Zahl, keine Meldung). */
  /** Im Menü „Ansicht“: mit der Größe als Zahl zwischen − und +. */
  let { flach = false }: { flach?: boolean } = $props();
  const min = $derived(groesse.prozent === STUFEN[0]), max = $derived(groesse.prozent >= hoechste());
  const jetzt = $derived(L(`jetzt ${proz(String(groesse.prozent))}`, `now ${proz(String(groesse.prozent))}`));
</script>

<div class="groesse" class:flach role="group" aria-label={L('Größe der Anzeige', 'Display size')}>
  <button class="k leise nur-symbol" type="button" aria-label={L(`Kleiner, ${jetzt}`, `Smaller, ${jetzt}`)} data-tipp={L(`Alles kleiner (wie Strg −) · ${jetzt}`, `Everything smaller (like Ctrl −) · ${jetzt}`)} aria-disabled={min ? 'true' : undefined} onclick={() => !min && stufe(-1)}><Icon n="minus" /></button>{#if flach}<span class="groesse-zahl">{proz(String(groesse.prozent))}</span>{/if}
  <button class="k leise nur-symbol" type="button" aria-label={L(`Größer, ${jetzt}`, `Larger, ${jetzt}`)} data-tipp={max ? (groesse.prozent === STUFEN.at(-1) ? L(`Größte Stufe (${jetzt})`, `Largest size (${jetzt})`) : L(`Größer geht in diesem Fenster nicht (${jetzt}).`, `Can't get larger in this window (${jetzt}).`)) : L(`Alles größer (wie Strg +) · ${jetzt}`, `Everything larger (like Ctrl +) · ${jetzt}`)} aria-disabled={max ? 'true' : undefined} onclick={() => !max && stufe(1)}><Icon n="plus" /></button>
</div>

<style>
  .groesse { display: inline-flex; align-items: center; }
  .groesse.flach { gap: var(--a2); padding: 0 var(--a2); }
  .groesse-zahl { min-width: 4.5ch; text-align: center; font-weight: 650; font-variant-numeric: tabular-nums; }
</style>
