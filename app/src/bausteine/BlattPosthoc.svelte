<script lang="ts">
  import type { Blatt } from '../lib/sitzung.svelte';
  import { L, melde, sichern } from '../lib/sitzung.svelte';
  import { anovaHaupt, phName, pWert, type Anova } from '../lib/ergebnis';
  import { PH_ARTEN, phMoeglich, type PhArt } from '../lib/posthoc';
  import { phStandard } from '../lib/ergebnis';
  import { phLeveneText, phRat } from '../lib/posthocsaetze';

  /** Auswahl des Paarvergleichs unter dem Ergebnis der Varianzanalyse (drei und mehr Gruppen). Die Wahl steht am Blatt (`blatt.ph`) und kommt mit der Projektdatei;
   *  fehlt sie (alte Projekte), gilt der Standard Games-Howell (unabhängig vom Levene-Test, Abschlusstest F2). Die Tabelle selbst steht mit den übrigen Tabellen unter dem Ergebnis. */
  let { blatt, e }: { blatt: Blatt; e: Anova } = $props();
  const kennung = $props.id();
  const art = $derived(blatt.ph ?? phStandard());
  const deutlich = $derived(anovaHaupt(e).p < 0.05);
  const kontrolle = $derived(blatt.phKontrolle !== undefined && blatt.phKontrolle < e.gruppen.length ? blatt.phKontrolle : 0);
  const BEGRIFF: Record<PhArt, string> = { tukey: 'tukey', gh: 'games-howell', bonferroni: 'bonferroni', holm: 'holm', scheffe: 'scheffe', dunnett: 'dunnett' };
  function waehle(w: PhArt) { blatt.ph = w; void sichern(); melde(L(`Paarvergleich jetzt: ${phName(w)}.`, `Pairwise comparison now: ${phName(w)}.`)); }
  function waehleKontrolle(i: number) { blatt.phKontrolle = i; void sichern(); melde(L(`Kontrollgruppe jetzt: ${e.gruppen[i]!.name}.`, `Control group now: ${e.gruppen[i]!.name}.`)); }
</script>

{#if phMoeglich(e.gruppen)}
  <div class="einst-gruppe ph-wahl" style="margin-top:var(--a5)">
    <h3 id="ph-t-{kennung}">{L('Welche Gruppen unterscheiden sich?', 'Which groups differ?')}</h3>
    {#if deutlich}
      <div class="segment" role="radiogroup" aria-labelledby="ph-t-{kennung}">{#each PH_ARTEN as w}<label data-begriff={BEGRIFF[w]}><input type="radio" name="ph-{kennung}" value={w} checked={art === w} onchange={() => waehle(w)}>{phName(w)}{w === phStandard() ? ` (${L('Standard', 'default')})` : ''}</label>{/each}</div>
      <p style="color:var(--tinte-2);margin-top:var(--a2)">{phRat(art)}</p>
      {#if art === 'dunnett'}
        <div class="eingabe" style="margin-top:var(--a2)"><label for="ph-k-{kennung}">{L('Kontrollgruppe (Dunnett-Test)', 'Control group (Dunnett test)')}</label>
          <select id="ph-k-{kennung}" onchange={(ev) => waehleKontrolle(Number(ev.currentTarget.value))}>{#each e.gruppen as g, i (i)}<option value={i} selected={i === kontrolle}>{g.name}</option>{/each}</select></div>
      {/if}
      {#if e.leveneP !== undefined}<p style="color:var(--tinte-2);margin-top:var(--a2)">{phLeveneText(pWert(e.leveneP))}</p>{/if}
    {:else}
      <p style="color:var(--tinte-2)">{L('Der Gesamttest ist nicht deutlich. Dann sucht Statable keine einzelnen Paare - das wäre Suchen im Zufall.', 'The overall test is not clear. Statable then does not look for single pairs - that would be searching through chance.')}</p>
    {/if}
  </div>
{/if}
