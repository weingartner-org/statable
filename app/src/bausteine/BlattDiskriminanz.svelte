<script lang="ts">
  import type { OutputItem } from '../engine/types';
  import { L, sichern, type Blatt } from '../lib/sitzung.svelte';
  import { diskrRCode, type DiskrE, type DiskrPrior } from '../lib/diskriminanz';
  import BlattKurspaket from './BlattKurspaket.svelte';

  /**
   * Das Ergebnis der Diskriminanzanalyse (Fachblatt KURSPAKET, Abschnitt 1). R hat beide Einteilungen schon gerechnet (gleiche Vorwahrscheinlichkeit und nach Gruppengröße);
   * die Wahl unter „Weitere Wege“ schaltet nur um, was gezeigt wird. Funktionen, Eigenwerte und Wilks hängen nicht an der Wahl.
   */
  let { blatt, e, tabellen }: { blatt: Blatt; e: DiskrE; tabellen: OutputItem[] } = $props();
  const ID = 'dk';
  function waehle(p: DiskrPrior) { if (p === e.prior) return; blatt.ergebnis = { typ: 'diskriminanz', e: { ...e, prior: p } }; void sichern(); }
</script>

<BlattKurspaket {tabellen} rcode={diskrRCode(e.gruppe, e.merkmale, e.prior)} hilfeId="frage-diskriminanz" hilfeText={L('Hilfe: Diskriminanzanalyse lesen und berichten', 'Help: reading and reporting a discriminant analysis')}>
  {#snippet hinten()}
    <details class="auf" style="margin-top:var(--a4)"><summary>{L('Weitere Wege: Vorwahrscheinlichkeit der Einteilung', 'More options: prior probability of the classification')}</summary>
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Vorwahrscheinlichkeit', 'Prior probability')}</legend>
        <div class="segment" role="radiogroup" aria-describedby="{ID}-prior-h">{#each [['gleich', L('Gleich für alle Gruppen (wie SPSS)', 'Equal for all groups (as in SPSS)')], ['groesse', L('Nach der Größe der Gruppen', 'By the size of the groups')]] as [w, tx]}<label><input type="radio" name="{ID}-prior" value={w} checked={e.prior === w} onchange={() => waehle(w as DiskrPrior)}>{tx}</label>{/each}</div>
        <p id="{ID}-prior-h" class="hilfe">{L('Die Vorwahrscheinlichkeit wirkt nur auf die Einteilung der Fälle, nicht auf die Funktionen, die Eigenwerte und Wilks. Bei ungleich großen Gruppen kann die Trefferquote etwas anders ausfallen.', 'The prior probability only affects the classification of the cases, not the functions, the eigenvalues and Wilks. With groups of unequal size the hit rate can differ a little.')}</p>
      </fieldset>
    </details>
  {/snippet}
</BlattKurspaket>
