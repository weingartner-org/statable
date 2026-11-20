<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import type { KatPunkt } from '../lib/katpruefung';
  import { R_PAKETE_ORD, R_PAKETE_ZAEHL } from '../lib/kategreg';
  import RStart from './RStart.svelte';

  /** Vorschlag unter dem Ergebnis der linearen Regression (Welle 3, Muster BlattRang): ordinales Ziel oder Zielwerte, die nach Zählungen aussehen.
   *  Nie still: Statable ändert nichts, bis die Person den Knopf drückt. Der Klick ist die Zustimmung: Er wählt das Modell, lädt R falls nötig (die Größe steht im Knopf) und rechnet sofort. */
  let { punkte, wahl, laeuft = false, gesperrt = false }: { punkte: KatPunkt[]; wahl: (modell: 'ordinal' | 'zaehl') => void; laeuft?: boolean; gesperrt?: boolean } = $props();
  const kennung = $props.id();
</script>

{#each punkte as p, i (p.modell)}
  <div class="korr-wahl" role="note" aria-labelledby="kv-t-{kennung}-{i}" style="margin-top:var(--a4)">
    <h3 id="kv-t-{kennung}-{i}" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{p.modell === 'ordinal' ? L('Ein anderes Modell passt vielleicht besser: ordinal', 'Another model may fit better: ordinal') : L('Ein anderes Modell passt vielleicht besser: Zähldaten', 'Another model may fit better: count data')}</h3>
    <p style="color:var(--tinte-2);margin-bottom:var(--a2)">{p.text} {p.klein}</p>
    <RStart knopf={p.knopf!} los={() => wahl(p.modell!)} {laeuft} {gesperrt} haupt={false} pakete={p.modell === 'ordinal' ? R_PAKETE_ORD : R_PAKETE_ZAEHL} mitKosten />
  </div>
{/each}
