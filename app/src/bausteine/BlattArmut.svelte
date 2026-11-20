<script lang="ts">
  import type { OutputItem } from '../engine/types';
  import { L, sichern, type Blatt } from '../lib/sitzung.svelte';
  import { proz } from '../i18n/profil';
  import { komma } from '../lib/ergebnis';
  import { armutRCode, ARMUT_ANTEILE, type ArmutE } from '../lib/armut';
  import BlattKurspaket from './BlattKurspaket.svelte';

  /**
   * Das Ergebnis von „Wie ungleich ist das Einkommen verteilt?“ (Abschnitt 3). R hat die Quote für alle vier Schwellen schon gerechnet (40, 50, 60 und 70 % des Medians);
   * die Wahl unter „Weitere Wege“ schaltet nur um, was oben steht. Median, S80/S20 und Gini hängen nicht an der Wahl.
   * Sätze und Warnungen stehen im Textteil des Blatts (immer sichtbar); hier stehen die Tabellen, die Wahl, der Befehl (R) und der Hilfe-Link.
   */
  let { blatt, e, tabellen }: { blatt: Blatt; e: ArmutE; name?: (n: string) => string; tabellen: OutputItem[] } = $props();
  const ID = 'ar';
  function waehle(a: number) { if (Math.abs(a - e.anteil) < 1e-9) return; blatt.ergebnis = { typ: 'armut', e: { ...e, anteil: a } }; void sichern(); }
</script>

<BlattKurspaket {tabellen} rcode={armutRCode(e.einkommen, e.gewicht, e.klumpen, e.schicht, e.anteil)} hilfeId="frage-armut" hilfeText={L('Hilfe: Armut und Ungleichheit lesen', 'Help: reading poverty and inequality')}>
  {#snippet hinten()}
    <details class="auf" style="margin-top:var(--a4)"><summary>{L('Weitere Wege: Höhe der Schwelle', 'More options: level of the threshold')}</summary>
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Schwelle als Anteil des Medians', 'Threshold as a share of the median')}</legend>
        <div class="segment" role="radiogroup" aria-describedby="{ID}-schwelle-h">{#each ARMUT_ANTEILE as a}<label><input type="radio" name="{ID}-schwelle" value={a} checked={Math.abs(e.anteil - a) < 1e-9} onchange={() => waehle(a)}>{proz(komma(a * 100, 0))}</label>{/each}</div>
        <p id="{ID}-schwelle-h" class="hilfe">{L('Üblich sind 60 % des gewichteten Medians. Die Schwelle ändert nur die Quote, nicht den Median, S80/S20 und den Gini-Koeffizienten.', 'The usual threshold is 60% of the weighted median. The threshold only changes the rate, not the median, S80/S20 and the Gini coefficient.')}</p>
      </fieldset>
    </details>
  {/snippet}
</BlattKurspaket>
