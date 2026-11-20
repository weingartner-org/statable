<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /** Mehrebenen: Modelle vergleichen (Field-Stufe 2b): Nullmodell (ICC), feste Effekte, plus Wechselwirkungen, plus zufällige Steigung - alle mit ML, Likelihood-Quotienten-Test je Schritt gegen das Modell davor, AIC, BIC, −2LL.
   *  Rechnet auf Knopfdruck über R (lme4, webR); nur für Messwerte (nicht für Ja/Nein). */
  import { tick } from 'svelte';
  import { L, melde, spalteNach, type Blatt } from '../lib/sitzung.svelte';
  import { lesbar } from '../lib/verzeichnis';
  import { komma, ohneNull, pWert } from '../lib/ergebnis';
  import { mebVergleichRechnen } from '../lib/rverfahren.svelte';
  import type { MebVergleich } from '../lib/mebvergleich';
  import { steigungMoeglich, R_PAKETE_MEB, type Mehrebenen } from '../lib/mehrebenen';
  import { praedName } from '../lib/mehrebenensaetze';
  import RStart from './RStart.svelte';
  import HilfeLink from './HilfeLink.svelte';

  let { blatt, e }: { blatt: Blatt; e: Mehrebenen } = $props();
  const name = (n: string) => { const sp = spalteNach(n); return sp ? lesbar(sp, true) : n; };
  let laeuft = $state(false), fehler = $state(''), fehlt = $state(false), erg = $state<MebVergleich | null>(null), stand = $state('');
  let steigung = $state('');
  const moegliche = $derived(e.praed.filter(p => !(p.teile?.length === 2) && steigungMoeglich(p)));
  const hatProdukte = $derived(e.praed.some(p => p.teile?.length === 2));
  const z2 = (v: number) => komma(v, 2);
  const MODELL: Record<string, () => string> = {
    m0: () => L('Nullmodell (nur Achsenabschnitt je Gruppe)', 'Null model (intercept per group only)'),
    m1: () => L('Feste Effekte (Haupteffekte)', 'Fixed effects (main effects)'),
    m2: () => L('Plus Wechselwirkungen', 'Plus interactions'),
    m3: () => L('Plus zufällige Steigung', 'Plus random slope')
  };
  const mname = (k: string) => MODELL[k]!();
  const aktuell = $derived(JSON.stringify([e.y, e.gruppe, e.praed.map(p => p.name), e.zentrierArt, e.wechsel, steigung]));
  const veraltet = $derived(!!erg && stand !== aktuell);
  const test = (nach: string) => erg?.tests.find(t => t.nach === nach);
  const wechselTest = $derived(test('m2')), steigungTest = $derived(test('m3'));

  async function rechnen() {
    if (laeuft) return;
    laeuft = true; fehler = '';
    try {
      erg = await mebVergleichRechnen(e, steigung);
      stand = aktuell;
      melde(L('Modelle verglichen.', 'Models compared.'));
    } catch (x) { fehler = (x as Error).message; await tick(); document.getElementById('meb-vgl-fehler')?.focus(); }
    finally { laeuft = false; }
  }
</script>

{#if !e.binaer && e.mitPraed && !e.gruppe2}
<details class="auf" style="margin-top:var(--a4)"><summary>{L('Modelle vergleichen: Wechselwirkungen und zufällige Steigung (Modellvergleich)', 'Comparing models: interactions and random slope (model comparison)')}</summary>
  <p class="heft-text">{L('Welches Modell passt besser: das einfache oder das größere? Statable passt dafür die Modelle nacheinander an, jedes mit Maximum-Likelihood-Schätzung (ML), nicht mit REML, denn nur ML erlaubt, Modelle mit verschiedenen festen Effekten zu vergleichen. Jeder Schritt wird mit dem Modell davor verglichen (Likelihood-Quotient-Test: Differenz der −2LL, df = zusätzliche Parameter). AIC und BIC sind kleiner bei besserer Passung unter Strafe für mehr Parameter; BIC straft strenger.', 'Which model fits better: the simple one or the larger one? For this Statable fits the models one after the other, each with maximum likelihood (ML) estimation, not with REML, because only ML allows comparing models with different fixed effects. Each step is compared with the model before it (likelihood ratio test: difference of −2LL, df = additional parameters). AIC and BIC are smaller for a better fit, penalising more parameters; BIC penalises more strictly.')} <HilfeLink id="modellvergleich" text={L('Hilfe: Modellvergleich', 'Help: model comparison')} /></p>
  <div class="eingabe" style="max-width:380px;margin:var(--a2) 0"><label for="meb-vgl-steigung">{L('Zufällige Steigung testen für', 'Test random slope for')}</label>
    <select id="meb-vgl-steigung" bind:value={steigung} disabled={!moegliche.length}>
      <option value="">{L('keine (nur bis zu den Wechselwirkungen)', 'none (only up to the interactions)')}</option>
      {#each moegliche as p (p.name)}<option value={p.name}>{praedName(p, name)}</option>{/each}
    </select>
    {#if !hatProdukte}<p class="hilfe">{L('Wechselwirkungen lassen sich unter „Für Fachleute“ oben hinzufügen; ohne sie vergleicht Statable das Nullmodell, die festen Effekte und (auf Wunsch) die zufällige Steigung.', 'Interactions can be added above under "For specialists"; without them Statable compares the null model, the fixed effects and (on request) the random slope.')}</p>{/if}</div>
  {#if fehler}<p id="meb-vgl-fehler" class="heft-text" role="alert" tabindex="-1" style="color:var(--fehler, #b3261e)">{fehler}</p>{/if}
  <RStart knopf={erg ? L('Modelle neu vergleichen', 'Compare the models again') : L('Modelle vergleichen', 'Compare the models')} los={rechnen} {laeuft} haupt={!erg || veraltet} pakete={R_PAKETE_MEB} bind:fehlt />
  {#if erg}
    {#if veraltet}<p class="heft-text" use:ergebnisAnsage style="color:var(--tinte-2)">{L('Das Modell oder die Wahl hat sich geändert: Die Tabelle zeigt noch den alten Vergleich. „Modelle neu vergleichen“ rechnet sie neu.', 'The model or the choice has changed: the table still shows the old comparison. "Compare the models again" recalculates it.')}</p>{/if}
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Modellvergleich (ML)', 'Model comparison (ML)')}</b><i>{L('Likelihood-Quotienten-Test gegen das Modell davor', 'Likelihood ratio test against the model before')}</i></caption>
      <thead><tr><th scope="col">{L('Modell', 'Model')}</th><th scope="col">{L('Parameter', 'Parameters')}</th><th scope="col">AIC</th><th scope="col">BIC</th><th scope="col">−2LL</th><th scope="col">χ²</th><th scope="col">df</th><th scope="col">p</th></tr></thead>
      <tbody>{#each erg.modelle as m (m.schluessel)}{@const t = test(m.schluessel)}<tr><th scope="row" style="text-align: start">{mname(m.schluessel)}</th><td style="text-align:right">{m.npar}</td><td style="text-align:right">{z2(m.aic)}</td><td style="text-align:right">{z2(m.bic)}</td><td style="text-align:right">{z2(m.minus2ll)}</td><td style="text-align:right">{t ? z2(t.chi2) : '-'}</td><td style="text-align:right">{t ? t.df : '-'}</td><td style="text-align:right">{t ? pWert(t.p).replace('= ', '') : '-'}</td></tr>{/each}</tbody>
    </table></div>
    <p class="heft-text">{L(`ICC des Nullmodells (ML): ${ohneNull(erg.icc, 3)}: ${komma(erg.icc * 100, 1)} % der Streuung liegen zwischen den Gruppen.`, `ICC of the null model (ML): ${ohneNull(erg.icc, 3)}: ${komma(erg.icc * 100, 1)}% of the variation lies between the groups.`)} {L('(Das ICC im Ergebnis oben stammt aus der REML-Schätzung und kann in den letzten Stellen abweichen.)', '(The ICC in the result above comes from the REML estimate and can differ in the last digits.)')}</p>
    {#if wechselTest}{@const m1 = erg.modelle.find(m => m.schluessel === 'm1')}{@const m2 = erg.modelle.find(m => m.schluessel === 'm2')}<p class="heft-text">{wechselTest.p < 0.05 ? L(`Die Wechselwirkungen verbessern das Modell über den Zufall hinaus (χ²(${wechselTest.df}) = ${z2(wechselTest.chi2)}, p ${pWert(wechselTest.p)}).`, `The interactions improve the model beyond chance (χ²(${wechselTest.df}) = ${z2(wechselTest.chi2)}, p ${pWert(wechselTest.p)}).`) : L(`Die Wechselwirkungen verbessern das Modell nicht nachweisbar (χ²(${wechselTest.df}) = ${z2(wechselTest.chi2)}, p ${pWert(wechselTest.p)}).`, `The interactions do not demonstrably improve the model (χ²(${wechselTest.df}) = ${z2(wechselTest.chi2)}, p ${pWert(wechselTest.p)}).`)}{#if m1 && m2} {L(`AIC: ${z2(m1.aic)} ohne gegen ${z2(m2.aic)} mit Wechselwirkungen; BIC: ${z2(m1.bic)} gegen ${z2(m2.bic)}.`, `AIC: ${z2(m1.aic)} without against ${z2(m2.aic)} with interactions; BIC: ${z2(m1.bic)} against ${z2(m2.bic)}.`)}{/if}</p>{/if}
    {#if steigungTest}<p class="heft-text">{L(`Test der zufälligen Steigung: χ²(${steigungTest.df}) = ${z2(steigungTest.chi2)}, p ${pWert(steigungTest.p)}.`, `Test of the random slope: χ²(${steigungTest.df}) = ${z2(steigungTest.chi2)}, p ${pWert(steigungTest.p)}.`)} {steigungTest.p < 0.05 ? L('Die Steigung unterscheidet sich nachweisbar zwischen den Gruppen.', 'The slope differs demonstrably between the groups.') : L('Es ist nicht nachweisbar, dass sich die Steigung zwischen den Gruppen unterscheidet.', 'It cannot be shown that the slope differs between the groups.')} {L('Die zwei Freiheitsgrade gehören zur Varianz der Steigung und ihrer Kovarianz mit dem Achsenabschnitt. Weil eine Varianz nicht unter 0 fallen kann, liegt der Test am Rand des Möglichen: Der angegebene p-Wert ist eher zu groß (vorsichtig).', 'The two degrees of freedom belong to the variance of the slope and its covariance with the intercept. Because a variance cannot fall below 0, the test lies at the edge of what is possible: the p value given is rather too large (cautious).')}</p>{/if}
    {#if erg.modelle.some(m => m.singular)}<p class="heft-text" role="note">{L('Mindestens ein Modell ist singulär (eine Varianz liegt bei 0 oder zwei Größen sind vollständig gekoppelt): Seine Zahlen mit Vorsicht lesen.', 'At least one model is singular (a variance is at 0 or two quantities are completely coupled): read its numbers with caution.')}</p>{/if}
    {#if erg.meldungen.length}<p class="heft-text" style="color:var(--tinte-2)">{L('Meldungen von R', 'Messages from R')}: {erg.meldungen.slice(0, 3).join(' · ')}</p>{/if}
  {/if}
</details>
{/if}
