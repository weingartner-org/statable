<script lang="ts">
  /** Kreuztabelle: Residuen je Zelle (standardisiert, angepasst) und die Chi-Quadrat-Familie (Pearson, Likelihood-Quotient G², bei 2 × 2 Yates). Rechnet im Browser aus den Zählungen (lib/kreuzresiduen.ts). */
  import HilfeLink from './HilfeLink.svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { komma, ohneNull, pWert, kreuzUngenau, type Kreuz } from '../lib/ergebnis';
  import { kreuzResiduen, auffaelligeZellen } from '../lib/kreuzresiduen';

  let { e }: { e: Kreuz } = $props();
  const z = $derived(e.zaehlung);
  const k = $derived(z ? kreuzResiduen(z.tab) : null);
  const auf = $derived(k && z ? auffaelligeZellen(z.tab, k) : []);
  const viele = $derived(k ? k.zeilen * k.spalten > 4 : false);
  const z2 = (v: number) => komma(v, 2);
  const z1 = (v: number) => komma(v, 1);
  const marke = (a: number) => (Math.abs(a) > 1.959964 ? (a > 0 ? ' ▲' : ' ▼') : '');
  const nenn = (zeile: number, spalte: number) => `${e.gruppen} = ${z!.zeilen[zeile]}, ${e.gezaehlt} = ${z!.spalten[spalte]}`;
</script>

{#if k && z}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Welche Zellen weichen ab? (Residuen) und weitere Chi-Quadrat-Werte', 'Which cells deviate? (residuals) and further chi-square values')}</summary>
    <p class="heft-text">{L('Der Chi-Quadrat-Test sagt nur, dass die Tabelle als Ganzes vom Zufall abweicht. Die Residuen zeigen, welche Zellen dazu beitragen. Standardisiertes Residuum: (gezählt − erwartet) / √erwartet. Angepasstes Residuum (korrigiertes Residuum): dasselbe, bezogen auf die Randsummen; es ist ungefähr standardnormalverteilt. Beträge über 1,96 fallen auf (▲ mehr als erwartet, ▼ weniger als erwartet).', 'The chi-square test only says that the table as a whole departs from chance. The residuals show which cells contribute. Standardized residual: (counted − expected) / √expected. Adjusted residual (corrected residual): the same, related to the margins; it is roughly standard normal. Absolute values above 1.96 stand out (▲ more than expected, ▼ fewer than expected).')} <HilfeLink id="standardisiertes-residuum" text={L('Hilfe: standardisiertes und angepasstes Residuum', 'Help: standardized and adjusted residual')} /></p>
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Angepasste Residuen je Zelle', 'Adjusted residuals per cell')}</b></caption>
      <thead><tr><th scope="col">{e.gruppen}</th>{#each z.spalten as sp, j (j)}<th scope="col">{sp}</th>{/each}</tr></thead>
      <tbody>{#each z.zeilen as zl, i (i)}<tr><th scope="row" style="text-align: start">{zl}</th>{#each z.spalten as sp, j (j)}<td style="text-align:right">{#if Math.abs(k.adjres[i]![j]!) > 1.959964}<b>{z2(k.adjres[i]![j]!)}{marke(k.adjres[i]![j]!)}</b>{:else}{z2(k.adjres[i]![j]!)}{/if}</td>{/each}</tr>{/each}</tbody>
    </table></div>
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Standardisierte Residuen je Zelle (gezählt − erwartet) / √erwartet', 'Standardized residuals per cell (counted − expected) / √expected')}</b></caption>
      <thead><tr><th scope="col">{e.gruppen}</th>{#each z.spalten as sp, j (j)}<th scope="col">{sp}</th>{/each}</tr></thead>
      <tbody>{#each z.zeilen as zl, i (i)}<tr><th scope="row" style="text-align: start">{zl}</th>{#each z.spalten as sp, j (j)}<td style="text-align:right">{z2(k.stdres[i]![j]!)}</td>{/each}</tr>{/each}</tbody>
    </table></div>
    {#if auf.length}
      <ul class="heft-text">{#each auf.slice(0, 8) as q (`${q.zeile}-${q.spalte}`)}{@const nn = nenn(q.zeile, q.spalte)}<li>{q.mehr ? L(`${nn}: mehr als erwartet (gezählt ${q.beobachtet}, erwartet ${z1(q.erwartet)}; angepasstes Residuum ${z2(q.adj)}).`, `${nn}: more than expected (counted ${q.beobachtet}, expected ${z1(q.erwartet)}; adjusted residual ${z2(q.adj)}).`) : L(`${nn}: weniger als erwartet (gezählt ${q.beobachtet}, erwartet ${z1(q.erwartet)}; angepasstes Residuum ${z2(q.adj)}).`, `${nn}: fewer than expected (counted ${q.beobachtet}, expected ${z1(q.erwartet)}; adjusted residual ${z2(q.adj)}).`)}</li>{/each}</ul>
      {#if auf.length > 8}<p class="heft-text">{L(`Weitere ${auf.length - 8} Zellen fallen auf; die Tabelle oben zeigt sie.`, `${auf.length - 8} more cells stand out; the table above shows them.`)}</p>{/if}
    {:else}
      <p class="heft-text">{L('Keine Zelle weicht auffällig ab (kein angepasstes Residuum über 1,96 im Betrag).', 'No cell deviates conspicuously (no adjusted residual above 1.96 in absolute value).')}</p>
    {/if}
    {#if viele}
      {@const nUeber = auf.filter(q => q.ueberBonferroni).length}
      <p class="heft-text">{L(`Bei ${k.zeilen * k.spalten} Zellen wird 1,96 rein zufällig öfter überschritten (bei 20 Zellen im Mittel etwa einmal). Strenger ist die Bonferroni-Grenze: ${z2(k.bonferroni)}.`, `With ${k.zeilen * k.spalten} cells, 1.96 is exceeded by chance more often (about once in 20 cells on average). The Bonferroni limit is stricter: ${z2(k.bonferroni)}.`)} {nUeber ? Lp(nUeber, `Darüber liegt ${nUeber} der auffälligen Zellen.`, `Darüber liegen ${nUeber} der auffälligen Zellen.`, `${nUeber} of the conspicuous cells lies above it.`, `${nUeber} of the conspicuous cells lie above it.`) : L('Keine Zelle liegt darüber.', 'No cell lies above it.')}</p>
    {/if}

    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a3) 0 var(--a2)">
      <caption><b>{L('Chi-Quadrat und Verwandte', 'Chi-square and relatives')}</b></caption>
      <thead><tr><th scope="col">{L('Test', 'Test')}</th><th scope="col">χ²</th><th scope="col">df</th><th scope="col">p</th></tr></thead>
      <tbody>
        <tr><th scope="row" style="text-align: start">{L('Pearson-Chi-Quadrat', 'Pearson chi-square')}</th><td style="text-align:right">{z2(k.chi2)}</td><td style="text-align:right">{k.df}</td><td style="text-align:right">{pWert(k.chi2p).replace(/^= /, '')}</td></tr>
        <tr><th scope="row" style="text-align: start">{L('Likelihood-Quotient G²', 'Likelihood ratio G²')}</th><td style="text-align:right">{z2(k.g2)}</td><td style="text-align:right">{k.df}</td><td style="text-align:right">{pWert(k.g2p).replace(/^= /, '')}</td></tr>
        {#if k.yates}<tr><th scope="row" style="text-align: start">{L('Yates-Korrektur (nur 2 × 2)', 'Yates correction (2 × 2 only)')}</th><td style="text-align:right">{z2(k.yates.chi2)}</td><td style="text-align:right">1</td><td style="text-align:right">{pWert(k.yates.p).replace(/^= /, '')}</td></tr>{/if}
      </tbody>
    </table></div>
    <p class="heft-text">{L('Welcher Wert passt? Das Pearson-Chi-Quadrat ist die übliche Wahl. Der Likelihood-Quotient-Test (G²) liegt bei großen Stichproben meist nah daran; er wird gern für Modelle mit mehreren Merkmalen verwendet (Log-lineare Modelle) und ist bei kleinen Stichproben ungenauer. Die Yates-Korrektur zieht bei 2 × 2 Tabellen von jeder Abweichung ein halbes Zählen ab und ist meist zu streng (zu vorsichtig: p zu groß). ', 'Which value fits? The Pearson chi-square is the usual choice. The likelihood ratio test (G²) is usually close to it in large samples; it is often used for models with several variables (log-linear models) and is less accurate in small samples. The Yates correction subtracts half a count from every deviation in 2 × 2 tables and is mostly too strict (too cautious: p too large). ')}{kreuzUngenau(e) ? L('Hier sind die erwarteten Häufigkeiten klein: Dann gilt der exakte Test nach Fisher (siehe oben), nicht eine dieser Varianten.', 'Here the expected counts are small: then Fisher\'s exact test applies (see above), not one of these variants.') : ''}</p>
  </details>
{/if}
