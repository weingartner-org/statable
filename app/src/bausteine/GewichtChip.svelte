<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { gewichtLage, oeffneGewichtDialog, artKurz } from '../lib/fallgewicht.svelte';
  import { zahlDe } from '../lib/format';
  import Icon from './Icon.svelte';

  /** Das Fallgewicht im Kopf (Fachblatt S-A, 1.4): neben dem Projektnamen, solange eines gilt - kein Chip heißt ungewichtet. Ein Klick öffnet die Angabe. */
  const lage = $derived(gewichtLage());
  const text = $derived.by(() => {
    if (lage.art === 'gilt') {
      const g = lage.gewicht, n = zahlDe(Math.round(g.summe * 1000) / 1000);
      return g.art === 'haeufigkeit'
        ? L(`Fallgewicht: ${g.spalte} (${artKurz(g.art)}) · N = ${n}`, `Case weight: ${g.spalte} (${artKurz(g.art)}) · N = ${n}`)
        : L(`Fallgewicht: ${g.spalte} (${artKurz(g.art)}) · n = ${g.zeilen}`, `Case weight: ${g.spalte} (${artKurz(g.art)}) · n = ${g.zeilen}`);
    }
    if (lage.art === 'frage') return L(`Fallgewicht ${lage.spalte}: Art offen`, `Case weight ${lage.spalte}: type open`);
    if (lage.art === 'fehler') return L(`Fallgewicht ${lage.gewicht.spalte}: Werte unbrauchbar`, `Case weight ${lage.gewicht.spalte}: values unusable`);
    return '';
  });
  const warnt = $derived(lage.art === 'frage' || lage.art === 'fehler');
</script>

{#if lage.art !== 'aus'}
  <button class="gw-chip" class:warnt type="button" aria-label={text} data-tipp={L('Fallgewicht: Klicken zum Ändern oder Ausschalten', 'Case weight: click to change or switch off')} onclick={() => oeffneGewichtDialog()}>
    <Icon n={warnt ? 'hinweis' : 'regler'} k={warnt ? 'hw' : undefined} /><span class="gw-text">{text}</span><span class="gw-kurz" aria-hidden="true">{L('Gewicht', 'Weight')}</span>
  </button>
{/if}

<style>
  .gw-chip { display: inline-flex; align-items: center; gap: var(--a2); min-height: var(--ziel); padding: 0 var(--a3); border: 1px solid var(--akzent); border-radius: 999px; background: var(--akzent-hell); color: var(--akzent-tinte); font: 600 var(--gr-klein)/1.2 var(--schrift-ui); cursor: pointer; white-space: nowrap; min-width: 0; flex: 0 1 auto; }
  .gw-chip:hover { background: color-mix(in srgb, var(--akzent-hell) 70%, var(--akzent) 30%); }
  .gw-chip.warnt { border-color: var(--hinweis-linie); background: var(--hinweis-hell); color: var(--hinweis); }
  .gw-text { overflow: hidden; text-overflow: ellipsis; }
  /* eng: Zeichen und kurzes Wort „Gewicht“ (der volle Text steht im Namen des Knopfs und im Tipp) */
  .gw-kurz { display: none; }
  :global(:where(:root.eng-700)) .gw-chip { padding: 0 var(--a2); }
  :global(:where(:root.eng-700)) .gw-text { display: none; }
  :global(:where(:root.eng-700)) .gw-kurz { display: inline; }
</style>
