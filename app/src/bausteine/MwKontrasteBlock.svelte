<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /** Kontraste für einen Messwiederholungsfaktor mit eigenem Fehlerterm (Field-Stufe 3): je Person der Kontrastwert, t-Test gegen 0. Linear, quadratisch, Trend, Helmert, wiederholt
   *  oder eigene Gewichte. Rechnung: lib/messwiederholung.ts (mwKontraste), Zahlen gegen R (t.test auf den Kontrastwerten) geprüft. */
  import HilfeLink from './HilfeLink.svelte';
  import { L, melde } from '../lib/sitzung.svelte';
  import { komma, pWert } from '../lib/ergebnis';
  import { gewichtLesen } from '../lib/kontraste';
  import { mwGewichte, mwKontraste, type MwKontrastArt } from '../lib/messwiederholung';
  import { kontrastSatz } from '../lib/mehrfaktorsaetze';

  let { werte, stufen, gruppen, faktor }: { werte: number[][]; stufen: string[]; gruppen?: (string | number)[]; faktor: string } = $props();
  const kennung = $props.id();
  const k = $derived(stufen.length);
  let art = $state<MwKontrastArt>('trend');
  let eigen = $state<string[]>([]);
  $effect(() => { if (eigen.length !== k) eigen = Array.from({ length: k }, () => ''); });
  const ARTEN = $derived<[MwKontrastArt, string][]>([
    ['trend', L('Trend (alle Grade)', 'Trend (all degrees)')], ['linear', L('Linear', 'Linear')], ['quadratisch', L('Quadratisch', 'Quadratic')],
    ['helmert', L('Helmert (jede Stufe gegen den Mittelwert der folgenden)', 'Helmert (each level against the mean of the following)')],
    ['wiederholt', L('Wiederholt (jede Stufe gegen die nächste)', 'Repeated (each level against the next)')], ['eigen', L('Eigene Gewichte', 'Own weights')]
  ]);
  const zeilen = $derived.by(() => {
    if (art === 'eigen') { const w = eigen.map(gewichtLesen); return w.length === k && w.every(x => x !== null) ? [w as number[]] : []; }
    return mwGewichte(art, k);
  });
  const ergebnis = $derived(zeilen.length ? mwKontraste(werte, zeilen, gruppen) : null);
  const z3 = (v: number) => komma(v, 3);
  const nr = (i: number) => (art === 'trend' ? [L('linear', 'linear'), L('quadratisch', 'quadratic'), L('kubisch', 'cubic')][i] ?? L(`${i + 1}. Grades`, `degree ${i + 1}`) : art === 'linear' ? L('linear', 'linear') : art === 'quadratisch' ? L('quadratisch', 'quadratic') : L(`Kontrast ${i + 1}`, `Contrast ${i + 1}`));
  const saetze = $derived(ergebnis ? ergebnis.map((r, i) => kontrastSatz(r, i + 1, stufen)) : []);
  const fehlt = $derived(ergebnis ? '' : art === 'eigen'
    ? (eigen.some(x => x.trim() !== '') ? L('Die Gewichte sind unvollständig, oder sie ergeben zusammen nicht 0, oder alle sind 0: Statable rechnet erst, wenn jede Stufe ein Gewicht hat und die Summe 0 ist.', 'The weights are incomplete, or they do not add up to 0, or all are 0: Statable calculates only when every level has a weight and the sum is 0.') : L('Für jede Stufe ein Gewicht eintragen, zusammen 0, zum Beispiel -2, 1, 1.', 'Enter a weight for every level, adding up to 0, for example -2, 1, 1.'))
    : k < 3 && (art === 'linear' || art === 'quadratisch' || art === 'trend') ? L('Trends brauchen mindestens drei Stufen.', 'Trends need at least three levels.') : '');
</script>

{#if k >= 2 && werte.length >= 3}
<details class="auf" style="margin-top:var(--a4)"><summary>{L(`Kontraste für ${faktor} mit eigenem Fehlerterm`, `Contrasts for ${faktor} with their own error term`)}</summary>
  <p class="heft-text">{L('Ein Kontrast mit eigenem Fehlerterm bildet für jede Person den gewichteten Wert aus ihren Messungen und prüft mit einem t-Test, ob dieser Wert im Mittel von 0 abweicht. Der Fehler stammt nur aus diesem einen Vergleich und nicht aus dem gemeinsamen Fehler des ganzen Faktors; deshalb braucht der Kontrast keine Sphärizität. Ein Trend fragt: Steigt oder fällt der Mittelwert gleichmäßig (linear) oder biegt er sich (quadratisch)?', 'A contrast with its own error term forms the weighted value of each person from their measurements and tests with a t test whether this value differs from 0 on average. The error comes from this one comparison alone and not from the pooled error of the whole factor; the contrast therefore does not need sphericity. A trend asks: does the mean rise or fall steadily (linear) or does it bend (quadratic)?')}</p>
  <p class="hilfe"><HilfeLink id="kontrast-eigener-fehlerterm" text={L('Hilfe: Kontrast mit eigenem Fehlerterm', 'Help: contrast with its own error term')} /> <HilfeLink id="sphaerizitaet" text={L('Hilfe: Sphärizität', 'Help: sphericity')} /></p>
  <div class="einst-gruppe">
    <div class="eingabe" style="max-width:520px"><label for="mk-art-{kennung}">{L('Welche Kontraste?', 'Which contrasts?')}</label>
      <select id="mk-art-{kennung}" bind:value={art}>{#each ARTEN as [w, t] (w)}<option value={w}>{t}</option>{/each}</select></div>
    {#if art === 'eigen'}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Kontrastgewichte je Stufe', 'Contrast weights per level')}</b></caption>
        <thead><tr>{#each stufen as x, j (j)}<th scope="col">{x}</th>{/each}</tr></thead>
        <tbody><tr>{#each stufen as x, j (j)}<td><input type="text" inputmode="decimal" size="6" style="text-align:right" bind:value={eigen[j]} aria-label={L(`Gewicht von „${x}“`, `Weight of "${x}"`)} onchange={() => melde(L('Gewichte geändert.', 'Weights changed.'))}></td>{/each}</tr></tbody>
      </table></div>
    {/if}
    {#if fehlt}<p class="heft-text" use:ergebnisAnsage>{fehlt}</p>{/if}
    {#if ergebnis}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Kontraste für ${faktor} (eigener Fehlerterm je Kontrast)`, `Contrasts for ${faktor} (own error term per contrast)`)}</b></caption>
        <thead><tr><th scope="col">{L('Kontrast', 'Contrast')}</th><th scope="col">{L('Gewichte', 'Weights')}</th><th scope="col">{L('Schätzung', 'Estimate')}</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">t</th><th scope="col">df</th><th scope="col">p</th>{#if ergebnis.length > 1}<th scope="col">p ({L('Holm-angepasst', 'Holm-adjusted')})</th>{/if}<th scope="col">{L('95 %-KI untere Grenze', '95% CI lower')}</th><th scope="col">{L('95 %-KI obere Grenze', '95% CI upper')}</th></tr></thead>
        <tbody>{#each ergebnis as r, i (i)}<tr><th scope="row" style="text-align: start">{nr(i)}</th><td>{r.gewichte.map(w => komma(w, Number.isInteger(w) ? 0 : 3)).join('; ')}</td><td style="text-align:right">{z3(r.schaetzung)}</td><td style="text-align:right">{z3(r.se)}</td><td style="text-align:right">{komma(r.t, 2)}</td><td style="text-align:right">{komma(r.df, 0)}</td><td style="text-align:right">{pWert(r.p).replace('= ', '')}</td>{#if ergebnis.length > 1}<td style="text-align:right">{pWert(r.pHolm).replace('= ', '')}</td>{/if}<td style="text-align:right">{z3(r.lo)}</td><td style="text-align:right">{z3(r.hi)}</td></tr>{/each}</tbody>
      </table></div>
      <p class="heft-text">{L('Die Schätzung ist die gewichtete Summe der Mittelwerte. Mit mehreren Kontrasten passt die Holm-Anpassung die p-Werte an; ein einzelner, vorher geplanter Kontrast braucht sie nicht. Mit Gruppenspalte zählen alle Gruppen gleich (ungewichtetes Mittel der Gruppenmittel).', 'The estimate is the weighted sum of the means. With several contrasts the Holm adjustment corrects the p values; a single contrast planned beforehand does not need it. With a grouping column all groups count equally (unweighted mean of the group means).')}</p>
      <ul class="heft-text" use:ergebnisAnsage>{#each saetze as s (s)}<li>{s}</li>{/each}</ul>
    {/if}
  </div>
</details>
{/if}
