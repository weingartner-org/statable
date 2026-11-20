<script lang="ts">
  import { L, d } from '../lib/sitzung.svelte';
  import type { Kreuz } from '../lib/ergebnis';
  import { schichtVon, schichtForest, schichtWahlFuer, type SchichtDaten, type SchichtWahl } from '../lib/schichtsaetze';
  import DiagrammExport from './DiagrammExport.svelte';
  import Schichtforest from './Schichtforest.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * Ergebnis-Teil der Kreuztabelle zu „Stärke des Zusammenhangs“ und „Nach dritter Spalte aufteilen“ (Später, Welle S-B). Tabellen und Sätze stehen im Ergebnis darüber
   * (berichtsatz.ts); hier: die Rollen für das gemeinsame Odds Ratio (wie bei den Risikomaßen aus Welle 7), die Stetigkeitskorrektur und das Forest-Bild der Odds Ratios der Schichten.
   */
  let { e, onSchicht, melde }: { e: Kreuz; onSchicht: (p: Partial<SchichtDaten>) => void; melde: (t: string) => void } = $props();
  const a = $derived(schichtVon(e));
  const forest = $derived(schichtForest(e));
  const wahl = $derived<SchichtWahl | null>(a?.wahl ?? null);
  const z = $derived(e.zaehlung);
  const gruppenWerte = $derived(wahl && z ? (wahl.gruppe === 'zeilen' ? z.zeilen : z.spalten) : []);
  const ereignisWerte = $derived(wahl && z ? (wahl.gruppe === 'zeilen' ? z.spalten : z.zeilen) : []);
  /** Neue Rollen; ändert sich die Spalte der Gruppen, schlägt Statable wieder vor (wie bei den Risikomaßen). */
  function setze(w: SchichtWahl, text: string) { onSchicht({ wahl: w }); melde(text); }
</script>

{#if e.masse}
  <p class="hilfe" style="margin-top:var(--a4)">{L('Stärke des Zusammenhangs: Die Tabelle der Maße steht oben bei den Zahlen, die Sätze darüber.', 'Strength of the association: the table of the measures is shown above with the numbers, the sentences above it.')} <HilfeLink id="zusammenhangsmasse" text={L('Hilfe: Stärke des Zusammenhangs', 'Help: strength of the association')} /></p>
{/if}
{#if e.schicht && a}
  <details class="auf" open style="margin-top:var(--a4)"><summary>{L(`Aufgeteilt nach ${a.schichtName}: Mantel-Haenszel`, `Split by ${a.schichtName}: Mantel-Haenszel`)}</summary>
    {#if a.zwei && a.mh && !a.mh.fehler && wahl && z}
      <label data-begriff="stetigkeitskorrektur" class="schalter" style="margin-top:var(--a2)"><input type="checkbox" checked={e.schicht.korrektur} onchange={(ev) => { onSchicht({ korrektur: ev.currentTarget.checked }); melde(ev.currentTarget.checked ? L('Mit Stetigkeitskorrektur gerechnet.', 'Calculated with continuity correction.') : L('Ohne Stetigkeitskorrektur gerechnet.', 'Calculated without continuity correction.')); }} aria-describedby="sk-h">{L('Mantel-Haenszel-Test mit Stetigkeitskorrektur', 'Mantel-Haenszel test with continuity correction')}</label>
      <p id="sk-h" class="hilfe">{d('SPSS zieht die Korrektur immer ab; Statable nur, wenn die Abweichung mindestens 0,5 beträgt (wie R). Der Unterschied liegt bei χ² unter 0,02, also weit von der Signifikanz.', 'SPSS zieht die Korrektur immer ab; Statable nur, wenn die Abweichung mindestens 0,5 beträgt (wie R). Der Unterschied liegt bei χ² unter 0,02, also weit von der Signifikanz.', 'SPSS always subtracts the correction; Statable only when the deviation is at least 0.5 (as R does). The difference is below 0.02 in χ², far from significance.')}</p>
      <div class="korr-wahl" role="radiogroup" aria-labelledby="sh-gr" style="margin-top:var(--a3)">
        <h3 id="sh-gr" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Welche Spalte nennt die Gruppen?', 'Which column names the groups?')}</h3>
        <div class="segment">{#each [['zeilen', e.gruppen], ['spalten', e.gezaehlt]] as [w, tx]}<label><input type="radio" name="sh-gr" value={w} checked={wahl.gruppe === w} onchange={() => setze(schichtWahlFuer(e, w as 'zeilen' | 'spalten'), L(`Die Gruppen stehen jetzt in: ${tx}.`, `The groups are now in: ${tx}.`))}>{tx}</label>{/each}</div>
      </div>
      <div class="korr-wahl" role="radiogroup" aria-labelledby="sh-g1" style="margin-top:var(--a3)">
        <h3 id="sh-g1" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Welche Gruppe wird mit der anderen verglichen?', 'Which group is compared with the other?')}</h3>
        <div class="segment">{#each gruppenWerte as tx, i}<label><input type="radio" name="sh-g1" value={i} checked={wahl.gruppePos === i} onchange={() => setze({ ...wahl, gruppePos: i as 0 | 1 }, L(`Verglichen wird: ${tx}.`, `Compared: ${tx}.`))}>{tx}</label>{/each}</div>
      </div>
      <div class="korr-wahl" role="radiogroup" aria-labelledby="sh-ev" style="margin-top:var(--a3)">
        <h3 id="sh-ev" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Welche Antwort ist das Ereignis?', 'Which answer is the event?')}</h3>
        <div class="segment">{#each ereignisWerte as tx, i}<label><input type="radio" name="sh-ev" value={i} checked={wahl.ereignisPos === i} onchange={() => setze({ ...wahl, ereignisPos: i as 0 | 1 }, L(`Ereignis ist: ${tx}.`, `Event is: ${tx}.`))}>{tx}</label>{/each}</div>
        <p style="color:var(--tinte-2);margin-top:var(--a2)">{d('Die Wahl dreht das Odds Ratio um (aus 0,9 wird 1,1); der Test und der Breslow-Day-Test bleiben gleich. Statable schlägt etwas vor, rät aber nie still: Prüfe, ob es zu deiner Frage passt.', 'Die Wahl dreht das Odds Ratio um (aus 0,9 wird 1,1); der Test und der Breslow-Day-Test bleiben gleich. Statable schlägt etwas vor, rät aber nie still: Prüfen Sie, ob es zu Ihrer Frage passt.', 'The choice turns the odds ratio around (0.9 becomes 1.1); the test and the Breslow-Day test stay the same. Statable suggests something but never guesses silently: check that it fits your question.')}</p>
      </div>
      {#if forest}
        <p class="heft-text" style="margin-top:var(--a3)">{L('Die Odds Ratios der Schichten im Bild: Liegen sie auf beiden Seiten von 1 oder weit auseinander, fasst das gemeinsame Odds Ratio sie nur grob zusammen - auch wenn der Homogenitätstest nichts findet (er ist bei wenigen Fällen je Schicht schwach).', 'The odds ratios of the strata in the picture: if they lie on both sides of 1 or far apart, the common odds ratio summarizes them only roughly - even if the homogeneity test finds nothing (it is weak with few cases per stratum).')}</p>
        <DiagrammExport titel={L('Odds Ratios der Schichten', 'Odds ratios of the strata')} klasse="dgx-scroll"><Schichtforest reihen={forest.reihen} gemeinsam={forest.gemeinsam} unbereinigt={forest.unbereinigt} gruppe1={a.gruppe1} gruppe2={a.gruppe2} /></DiagrammExport>
      {/if}
    {:else if !a.zwei}
      <p class="heft-text" style="margin-top:var(--a2)">{L('Die Tabelle ist größer als zwei mal zwei Felder. Statable rechnet dann den verallgemeinerten Mantel-Haenszel-Test (allgemeiner Zusammenhang); ein gemeinsames Odds Ratio gibt es nur bei zwei mal zwei Feldern.', 'The table is larger than two by two cells. Statable then calculates the generalized Mantel-Haenszel test (general association); a common odds ratio exists only for two by two cells.')}</p>
    {/if}
    <p class="hilfe"><HilfeLink id="mantel-haenszel" text={L('Hilfe: Mantel-Haenszel', 'Help: Mantel-Haenszel')} /></p>
  </details>
{/if}
