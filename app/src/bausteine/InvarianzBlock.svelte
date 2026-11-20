<script lang="ts">
  /** Messinvarianz zwischen Gruppen (S-J) unter dem Ergebnis der konfirmatorischen Faktorenanalyse: gleiche Faktoren, gleiche Ladungen, gleiche Achsenabschnitte (lavaan, ML). */
  import HilfeLink from './HilfeLink.svelte';
  import { untrack } from 'svelte';
  import { s, L, melde } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma } from '../lib/ergebnis';
  import { invarianzRechnen, type CfaFaktorDef, type InvarianzErg } from '../lib/rverfahren.svelte';
  import { invarianzUrteile } from '../lib/invarianz';
  import RStart from './RStart.svelte';

  let { faktoren }: { faktoren: CfaFaktorDef[] } = $props();
  const kennung = $props.id();
  const benutzt = $derived(new Set(faktoren.flatMap(f => f.fragen)));
  /** Spalten mit 2 bis 6 Gruppen, die nicht zu den Fragen gehören */
  const kandidaten = $derived(s.spalten.filter(c => !benutzt.has(c.name)).map(c => {
    const i = s.spalten.indexOf(c), werte = new Set(s.zeilen.map(z => z[i]).filter(v => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && istFehlend(c, v))));
    return { c, n: werte.size };
  }).filter(x => x.n >= 2 && x.n <= 6));
  let wahl = $state(''), ordinal = $state(false), frei = $state<string[]>([]), laeuft = $state(false), fehler = $state(''), fehlt = $state(false), erg = $state<InvarianzErg | null>(null);
  const spalte = $derived(kandidaten.find(x => x.c.name === wahl) ?? null);
  const schluessel = $derived(JSON.stringify([wahl, faktoren, ordinal]));
  $effect(() => { void schluessel; untrack(() => { erg = null; fehler = ''; frei = []; }); });
  const frageName = (n: string) => { const c = s.spalten.find(x => x.name === n); return c ? (c.bezeichnung.trim() || c.name) : n; };
  const freiUm = (q: string) => { frei = frei.includes(q) ? frei.filter(x => x !== q) : [...frei, q]; };
  async function rechnen(mitFrei = false) {
    if (laeuft || !spalte) return;
    laeuft = true; fehler = '';
    try { erg = await invarianzRechnen(faktoren, spalte.c.name, mitFrei ? frei : [], ordinal); melde(L('Messinvarianz gerechnet.', 'Measurement invariance calculated.')); }
    catch (x) { fehler = (x as Error).message; }
    finally { laeuft = false; }
  }
  const urteile = $derived(erg ? invarianzUrteile(erg) : []);
  const teilUrteile = $derived(erg?.teil ? invarianzUrteile({ stufen: [erg.stufen[0]!, ...erg.teil.stufen], diff: erg.teil.diff }) : []);
  const z = (v: number, n = 3) => (Number.isFinite(v) ? komma(v, n) : '-');
  const stufeName = (n: string) => n !== 'konfigural' && erg?.ordinal ? (n === 'metrisch' ? L('Schwellen gleich', 'equal thresholds') : L('Schwellen und Ladungen gleich', 'equal thresholds and loadings')) : n === 'konfigural' ? L('konfigural (gleiche Struktur)', 'configural (same structure)') : n === 'metrisch' ? L('metrisch (gleiche Ladungen)', 'metric (equal loadings)') : L('skalar (gleiche Ladungen und Achsenabschnitte)', 'scalar (equal loadings and intercepts)');
</script>

<details class="auf" style="margin-top:var(--a3)"><summary>{L('Messen die Fragen in allen Gruppen dasselbe? (Messinvarianz)', 'Do the questions measure the same in all groups? (measurement invariance)')}</summary>
  <p class="heft-text">{L('Wer Gruppen vergleichen will (etwa Mittelwerte eines Faktors), muss wissen, ob der Fragebogen in allen Gruppen gleich funktioniert. Statable prüft dazu in drei Stufen: dieselbe Struktur (konfigural), dieselben Ladungen (metrisch) und dieselben Achsenabschnitte (skalar). Erst bei skalarer Invarianz sind Mittelwerte der Gruppen vergleichbar. Gerechnet wird mit der Zuordnung der Fragen von oben.', 'Anyone who wants to compare groups (for example means of a factor) needs to know whether the questionnaire works the same in all groups. For this Statable tests in three steps: the same structure (configural), the same loadings (metric) and the same intercepts (scalar). Only with scalar invariance are the means of the groups comparable. The assignment of the questions from above is used.')}</p>
  <p class="hilfe"><HilfeLink id="messinvarianz" text={L('Hilfe: Messinvarianz', 'Help: measurement invariance')} /></p>
  {#if !kandidaten.length}<p class="heft-text" style="color:var(--tinte-2)">{L('Dafür braucht es eine Spalte mit zwei bis sechs Gruppen (zum Beispiel Geschlecht oder Schule), die keine der Fragen ist.', 'This needs a column with two to six groups (for example gender or school) that is not one of the questions.')}</p>
  {:else}
    <div class="eingabe" style="max-width:340px"><label for="inv-g-{kennung}">{L('Gruppen aus welcher Spalte?', 'Groups from which column?')}</label>
      <select id="inv-g-{kennung}" bind:value={wahl}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each kandidaten as x (x.c.name)}<option value={x.c.name}>{x.c.bezeichnung.trim() || x.c.name} ({x.n})</option>{/each}</select></div>
    {#if fehler}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehler}</p>{/if}
    {#if spalte}<label style="display:block;margin:var(--a2) 0"><input type="checkbox" bind:checked={ordinal} />{L('Die Fragen haben wenige Antwortstufen (zum Beispiel 1 bis 5): als abgestufte Antworten rechnen (WLSMV)', 'The questions have few answer steps (for example 1 to 5): calculate as ordered answers (WLSMV)')}</label>{/if}
    {#if spalte}<RStart knopf={erg ? L('Messinvarianz neu rechnen', 'Recalculate measurement invariance') : L('Messinvarianz prüfen', 'Test measurement invariance')} los={() => rechnen(false)} {laeuft} bind:fehlt />{/if}
    {#if erg}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Anpassung der drei Stufen', 'Fit of the three steps')}</b></caption>
        <thead><tr><th scope="col">{L('Stufe', 'Step')}</th><th scope="col">χ²</th><th scope="col">df</th><th scope="col">CFI</th><th scope="col">RMSEA</th><th scope="col">SRMR</th><th scope="col">ΔCFI</th><th scope="col">ΔRMSEA</th><th scope="col">{L('p (χ²-Differenz)', 'p (χ² difference)')}</th></tr></thead>
        <tbody>{#each erg.stufen as st, i (st.name)}{@const u = i > 0 ? urteile[i - 1] : null}<tr><th scope="row" style="text-align: start">{stufeName(st.name)}</th><td style="text-align:right">{z(st.chisq, 2)}</td><td style="text-align:right">{st.df}</td><td style="text-align:right">{z(st.cfi)}</td><td style="text-align:right">{z(st.rmsea)}</td><td style="text-align:right">{z(st.srmr)}</td><td style="text-align:right">{u ? z(u.dCfi) : '-'}</td><td style="text-align:right">{u ? z(u.dRmsea) : '-'}</td><td style="text-align:right">{u ? z(u.chisqP) : '-'}</td></tr>{/each}</tbody>
      </table></div>
      <p class="heft-text" role="status">{L(`${erg.gruppen.length} Gruppen, ${erg.gruppen.reduce((a, g) => a + g.n, 0)} Personen mit allen Antworten.`, `${erg.gruppen.length} groups, ${erg.gruppen.reduce((a, g) => a + g.n, 0)} people with all answers.`)}
        {urteile[0]?.erfuellt ? L('Metrische Invarianz: erfüllt, die Ladungen dürfen in allen Gruppen gleich gesetzt werden.', 'Metric invariance: met, the loadings may be set equal in all groups.') : L('Metrische Invarianz: nicht erfüllt, die Fragen hängen in den Gruppen verschieden stark mit dem Faktor zusammen.', 'Metric invariance: not met, the questions are related to the factor with different strength in the groups.')}
        {urteile[1]?.erfuellt ? L('Skalare Invarianz: erfüllt, Mittelwerte der Gruppen sind vergleichbar.', 'Scalar invariance: met, means of the groups are comparable.') : L('Skalare Invarianz: nicht erfüllt, Mittelwerte der Gruppen sind nicht ohne Weiteres vergleichbar.', 'Scalar invariance: not met, means of the groups are not simply comparable.')}</p>
      {#if erg.vorschlag.length && !erg.ordinal && !(urteile[0]?.erfuellt && urteile[1]?.erfuellt)}
        <fieldset class="segment" style="margin:var(--a2) 0;display:block"><legend>{L('Teilweise Invarianz: welche Fragen dürfen sich zwischen den Gruppen unterscheiden?', 'Partial invariance: which questions may differ between the groups?')}</legend>
          <p class="heft-text">{L('Die Liste zeigt die Fragen, deren Ladung sich zwischen den Gruppen am stärksten unterscheidet (größter Wert zuerst). Wer einzelne Fragen freigibt, erlaubt ihnen eigene Ladungen und Achsenabschnitte je Gruppe; die übrigen bleiben gleich gesetzt.', 'The list shows the questions whose loading differs most between the groups (largest value first). Releasing single questions lets them have their own loadings and intercepts in each group; the others stay equal.')}</p>
          {#each erg.vorschlag.slice(0, 6) as v (v.frage)}<label style="margin-inline-end:var(--a3)"><input type="checkbox" checked={frei.includes(v.frage)} onchange={() => freiUm(v.frage)} />{frageName(v.frage)} (χ² = {z(v.x2, 2)})</label>{/each}
          {#if frei.length}<RStart knopf={L('Mit den freigegebenen Fragen neu rechnen', 'Recalculate with the released questions')} los={() => rechnen(true)} {laeuft} bind:fehlt />{/if}
        </fieldset>
      {/if}
      {#if erg.teil}
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{L(`Teilweise Invarianz (freigegebene Fragen: ${erg.teil.frei.map(frageName).join(', ')})`, `Partial invariance (released questions: ${erg.teil.frei.map(frageName).join(', ')})`)}</b></caption>
          <thead><tr><th scope="col">{L('Stufe', 'Step')}</th><th scope="col">χ²</th><th scope="col">df</th><th scope="col">CFI</th><th scope="col">RMSEA</th><th scope="col">SRMR</th><th scope="col">ΔCFI</th><th scope="col">ΔRMSEA</th></tr></thead>
          <tbody>{#each erg.teil.stufen as st, i (st.name)}{@const u = teilUrteile[i]}<tr><th scope="row" style="text-align: start">{st.name === 'metrisch' ? L('metrisch, teilweise', 'metric, partial') : L('skalar, teilweise', 'scalar, partial')}</th><td style="text-align:right">{z(st.chisq, 2)}</td><td style="text-align:right">{st.df}</td><td style="text-align:right">{z(st.cfi)}</td><td style="text-align:right">{z(st.rmsea)}</td><td style="text-align:right">{z(st.srmr)}</td><td style="text-align:right">{u ? z(u.dCfi) : '-'}</td><td style="text-align:right">{u ? z(u.dRmsea) : '-'}</td></tr>{/each}</tbody>
        </table></div>
        <p class="heft-text" role="status">{teilUrteile[1]?.erfuellt ? L('Mit den freigegebenen Fragen ist die skalare Invarianz teilweise erfüllt: Mittelwerte der Gruppen lassen sich dann mit Vorsicht vergleichen.', 'With the released questions scalar invariance is partly met: group means can then be compared with caution.') : L('Auch mit den freigegebenen Fragen ist die skalare Invarianz nicht erfüllt: Mittelwerte der Gruppen sind nicht vergleichbar.', 'Even with the released questions scalar invariance is not met: group means are not comparable.')}</p>
        <p class="heft-text" style="color:var(--tinte-2)">{L('Teilweise Invarianz setzt voraus, dass je Faktor mindestens zwei Fragen in allen Gruppen gleich gesetzt bleiben, und nur wenige Fragen dürfen freigegeben werden. Wer Fragen nur freigibt, weil das Ergebnis sonst schlecht aussieht, passt die Prüfung den Daten an; der Grund sollte inhaltlich nachvollziehbar sein.', 'Partial invariance requires that at least two questions per factor stay equal in all groups, and only a few questions may be released. Releasing questions only because the result looks bad otherwise fits the test to the data; the reason should make sense in terms of content.')}</p>
      {/if}
      {#if erg.ordinal}<p class="heft-text" style="color:var(--tinte-2)">{L('Bei abgestuften Antworten bedeutet die zweite Stufe gleiche Schwellen (die Grenzen zwischen den Antwortstufen), die dritte zusätzlich gleiche Ladungen; Achsenabschnitte entfallen. Die Grenzen nach Chen gelten streng genommen für die Schätzung mit ML und sind hier nur eine grobe Orientierung.', 'With ordered answers the second step means equal thresholds (the boundaries between the answer steps), the third additionally equal loadings; intercepts do not apply. The cut-offs by Chen strictly apply to ML estimation and are only a rough guide here.')}</p>{/if}
      {#each erg.warnungen.slice(0, 3) as w (w)}<p class="heft-text" style="color:var(--tinte-2)">R: {w}</p>{/each}
      <p class="heft-text" style="color:var(--tinte-2)">{L('Beurteilt wird nach der Faustregel von Chen (2007): Eine Stufe gilt als nicht erfüllt, wenn der CFI um 0,010 oder mehr sinkt und zugleich der RMSEA um 0,015 oder mehr steigt (oder der SRMR um 0,030 beziehungsweise 0,010). Der χ²-Differenztest wird bei großen Gruppen schnell signifikant und ist darum nur eine Zugabe. Die Schwellen stammen aus Simulationen und sind Richtwerte.', 'The judgment follows the rule of thumb of Chen (2007): a step counts as not met when the CFI drops by 0.010 or more and at the same time the RMSEA rises by 0.015 or more (or the SRMR by 0.030 and 0.010 respectively). The χ² difference test becomes significant quickly with large groups and is therefore only an addition. The thresholds come from simulations and are guidelines.')}</p>
    {/if}
  {/if}
</details>
