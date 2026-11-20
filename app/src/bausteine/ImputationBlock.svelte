<script lang="ts">
  /** Fehlende Werte füllen (Mehrfachimputation) und eine Regression mit zusammengefassten Ergebnissen rechnen, unter „Wie verteilt sich etwas?“ (S-H). Rechnet im Browser (lib/imputation.ts), erst auf Klick. */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma, pWert } from '../lib/ergebnis';
  import { parseZahl } from '../lib/metaanalyse';
  import { regressionMitImputation, type ImputRegression, type ImputFehler } from '../lib/imputation';
  import Rechnet from './Rechnet.svelte';

  const kennung = $props.id();
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  const name = (c: { name: string; bezeichnung: string }) => c.bezeichnung.trim() || c.name;
  let ergSp = $state(''), bed = $state<string[]>([]), mTxt = $state('20'), laeuft = $state(false), res = $state<ImputRegression | ImputFehler | null>(null);
  const gewaehlt = $derived(bed.filter(n => n !== ergSp && zahlen.some(c => c.name === n)));
  const mZ = $derived(parseZahl(mTxt)), mFalsch = $derived(mZ === null || !Number.isInteger(mZ) || mZ < 5 || mZ > 100);
  const spaltenNamen = $derived([ergSp, ...gewaehlt]);
  $effect(() => { void ergSp; void gewaehlt.join('|'); void mTxt; res = null; });
  const wechsel = (n: string) => { bed = bed.includes(n) ? bed.filter(q => q !== n) : [...bed, n]; };
  async function rechnen() {
    if (laeuft || !ergSp || gewaehlt.length < 1 || mFalsch) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    const cols = spaltenNamen.map(n => { const i = s.spalten.findIndex(c => c.name === n), c = s.spalten[i]!; return s.zeilen.map(z => { const v = z[i]; return typeof v === 'number' && !istFehlend(c, v) ? v : null; }); });
    res = regressionMitImputation(cols, { m: mZ!, durchlaeufe: 10, startwert: 1 });
    laeuft = false;
  }
  const r = $derived(res && !('fehler' in res) ? res : null);
  const z4 = (v: number) => komma(Number(v.toPrecision(4)), 4);
  const zeilenName = (i: number) => (i === 0 ? L('Konstante', 'Constant') : (() => { const c = zahlen.find(x => x.name === gewaehlt[i - 1]); return c ? name(c) : ''; })());
  const fehlerText = (f: ImputFehler) => f.fehler === 'keine-luecken' ? L('In diesen Spalten fehlt bei keinem Fall ein Wert: Es gibt nichts zu füllen.', 'No case has a missing value in these columns: there is nothing to fill.')
    : f.fehler === 'zu-viele-luecken' ? L('In einer Spalte fehlt mehr als die Hälfte der Werte: Dafür füllt Statable nicht auf. Die Spalte weglassen oder mehr Daten erheben.', 'More than half of the values are missing in a column: Statable does not fill that. Leave the column out or collect more data.')
    : f.fehler === 'spalte-leer' ? L('Eine Spalte hat gar keine Werte.', 'A column has no values at all.')
    : f.fehler === 'singulaer' ? L('Spalten, die einander vollständig bestimmen, lassen sich nicht gemeinsam füllen. Eine davon weglassen.', 'Columns that fully determine each other cannot be filled together. Leave one of them out.')
    : L('Zu wenige Fälle.', 'Too few cases.');
</script>

{#if zahlen.length >= 2}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Lücken füllen und trotzdem rechnen (Mehrfachimputation)', 'Fill the gaps and still calculate (multiple imputation)')}</summary>
    <p class="heft-text">{L('Fehlen Antworten, werfen die meisten Programme alle Fälle mit Lücken weg. Bei Mehrfachimputation füllt Statable die Lücken stattdessen mehrfach mit plausiblen Werten aus ähnlichen Fällen (Predictive Mean Matching, wie das R-Paket mice), rechnet die Regression in jedem der gefüllten Datensätze und fasst die Ergebnisse nach den Regeln von Rubin zusammen. Die Unsicherheit durch die Lücken steckt dann in den Standardfehlern.', 'When answers are missing, most programs throw away every case with gaps. With multiple imputation Statable instead fills the gaps several times with plausible values from similar cases (predictive mean matching, as the R package mice does), calculates the regression in each of the filled data sets and combines the results following the rules of Rubin. The uncertainty due to the gaps is then part of the standard errors.')}</p>
    <p class="hilfe"><HilfeLink id="fehlende-werte-little-imputation" text={L('Hilfe: fehlende Werte', 'Help: missing values')} /></p>
    <div class="eingabe" style="max-width:340px"><label for="imp-e-{kennung}">{L('Ergebnis (Spalte)', 'Outcome (column)')}</label>
      <select id="imp-e-{kennung}" bind:value={ergSp}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zahlen as c (c.name)}<option value={c.name}>{name(c)}</option>{/each}</select></div>
    <fieldset class="segment" style="margin:var(--a2) 0"><legend>{L('Vorhersagegrößen', 'Predictors')}</legend>
      {#each zahlen.filter(c => c.name !== ergSp) as c (c.name)}<label><input type="checkbox" checked={bed.includes(c.name)} onchange={() => wechsel(c.name)} />{name(c)}</label>{/each}
    </fieldset>
    <div class="eingabe" style="max-width:240px"><label for="imp-m-{kennung}">{L('Zahl der gefüllten Datensätze (5 bis 100)', 'Number of filled data sets (5 to 100)')}</label><input id="imp-m-{kennung}" type="text" inputmode="numeric" bind:value={mTxt} autocomplete="off" /></div>
    {#if mFalsch}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{L('Die Zahl der Datensätze muss eine ganze Zahl von 5 bis 100 sein.', 'The number of data sets must be a whole number from 5 to 100.')}</p>{/if}
    <div class="knopfzeile" style="margin:var(--a2) 0"><button class="k" type="button" onclick={rechnen} disabled={laeuft || !ergSp || gewaehlt.length < 1 || mFalsch}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{L('Lücken füllen und rechnen', 'Fill the gaps and calculate')}{/if}</button></div>
    {#if res && 'fehler' in res}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if r}
      <p class="heft-text" role="status">{L(`${r.n} Fälle, ${r.m} gefüllte Datensätze. Anteil fehlender Werte je Spalte: ${spaltenNamen.map((n, i) => `${name(zahlen.find(c => c.name === n)!)} ${komma(r.anteilFehlend[i]! * 100, 0)} %`).join(', ')}.`, `${r.n} cases, ${r.m} filled data sets. Share of missing values per column: ${spaltenNamen.map((n, i) => `${name(zahlen.find(c => c.name === n)!)} ${komma(r.anteilFehlend[i]! * 100, 0)}%`).join(', ')}.`)}</p>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Regression mit gefüllten Lücken (zusammengefasst nach Rubin)', 'Regression with filled gaps (combined following Rubin)')}</b></caption>
        <thead><tr><th scope="col">{L('Vorhersagegröße', 'Predictor')}</th><th scope="col">B</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">t</th><th scope="col">df</th><th scope="col">p</th><th scope="col">{L('95 %-Intervall', '95% interval')}</th><th scope="col">{L('fehlende Information', 'missing information')}</th></tr></thead>
        <tbody>{#each r.koeff as q, i (i)}<tr><th scope="row" style="text-align: start">{zeilenName(i)}</th><td style="text-align:right">{z4(q.q)}</td><td style="text-align:right">{z4(q.se)}</td><td style="text-align:right">{komma(q.t, 2)}</td><td style="text-align:right">{komma(q.df, 1)}</td><td style="text-align:right">{pWert(q.p).replace(/^= /, '')}</td><td style="text-align:right">[{z4(q.lo)}; {z4(q.hi)}]</td><td style="text-align:right">{komma(q.fmi * 100, 0)} %</td></tr>{/each}</tbody>
      </table></div>
      {#if r.vollstaendig}
        <p class="heft-text">{L(`Zum Vergleich nur mit den ${r.vollstaendig.n} Fällen ohne jede Lücke: ${r.vollstaendig.b.map((b, i) => `${zeilenName(i)} B = ${z4(b)} (SE ${z4(r.vollstaendig!.se[i]!)})`).join('; ')}.`, `For comparison with only the ${r.vollstaendig.n} cases without any gap: ${r.vollstaendig.b.map((b, i) => `${zeilenName(i)} B = ${z4(b)} (SE ${z4(r.vollstaendig!.se[i]!)})`).join('; ')}.`)}</p>
      {/if}
      <p class="heft-text" style="color:var(--tinte-2)">{L('„Fehlende Information“ sagt, welcher Anteil der Unsicherheit eines Koeffizienten von den Lücken kommt. Das Füllen setzt voraus, dass das Fehlen nur von den anderen Spalten abhängt, nicht vom fehlenden Wert selbst (MAR); prüfen lässt sich das nicht. Hilfreich ist es meist bei Lücken in vielen Fällen und bei einem Fehlen, das mit anderen Angaben zusammenhängt; bei sehr wenigen Lücken ändert sich kaum etwas. Eine Regel (White et al., 2011): mindestens so viele Datensätze wie Prozent der Fälle mit Lücken. Die Datensätze entstehen mit festem Startwert, das Ergebnis lässt sich also wiederholen.', '“Missing information” says which share of the uncertainty of a coefficient comes from the gaps. Filling assumes that missingness depends only on the other columns, not on the missing value itself (MAR); this cannot be tested. It usually helps with gaps in many cases and with missingness that is related to other answers; with very few gaps hardly anything changes. A rule (White et al., 2011): at least as many data sets as the percentage of cases with gaps. The data sets are created with a fixed seed, so the result can be repeated.')}</p>
    {/if}
  </details>
{/if}
