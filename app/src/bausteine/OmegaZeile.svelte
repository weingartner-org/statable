<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { L, melde, sichern, type Blatt } from '../lib/sitzung.svelte';
  import { omegaRechnen, rStatus, type OmegaErg } from '../lib/rverfahren.svelte';
  import { omegaZeile, omegaKi } from '../lib/rsaetze';
  import { ohneNull, alphaWort, type Skala } from '../lib/ergebnis';
  import RStart from './RStart.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /** Zeile „McDonalds Omega“ neben Cronbachs Alpha. R wird erst auf Knopfdruck geladen; ist R schon da, rechnet Statable Omega gleich mit. */
  let { blatt, e, fragen, umpolen }: { blatt: Blatt; e: Skala; fragen: string[]; umpolen: boolean } = $props();
  let laeuft = $state(false), fehler = $state(''), bootstrap = $state(false), fiml = $state(false), nf = $state(0), fehlt = $state(false);
  let versucht = $state(false);
  const o = $derived(e.omega);
  const zuWenig = $derived(fragen.length < 3);
  const kannHierarchisch = $derived(fragen.length >= 6);

  async function rechnen() {
    if (laeuft || zuWenig) return;
    laeuft = true; fehler = ''; versucht = true;
    try {
      const erg: OmegaErg = await omegaRechnen(fragen, { bootstrap, fiml, nf });
      blatt.ergebnis = { typ: 'skala', e: { ...e, omega: erg } };
      sichern();
      melde(L(`McDonalds Omega: ${ohneNull(erg.omega)}.`, `McDonald's omega: ${ohneNull(erg.omega)}.`));
      await tick(); document.getElementById('omega-ergebnis')?.focus();
    } catch (x) { fehler = (x as Error).message; await tick(); document.getElementById('omega-fehler')?.focus(); }
    finally { laeuft = false; }
  }
  // Ist R schon geladen, kommt Omega ohne Klick dazu (nach dem ersten Laden automatisch).
  $effect(() => { if (rStatus.bereit && !untrack(() => o) && !untrack(() => versucht) && !untrack(() => laeuft) && !zuWenig && !umpolen) untrack(() => { void rechnen(); }); });
</script>

<div class="omega" role="group" aria-labelledby="omega-t" style="margin-top:var(--a5)">
  <h3 id="omega-t">{L('McDonalds Omega', "McDonald's omega")} <HilfeLink id="konfirmatorische-faktorenanalyse-omega" text={L('Hilfe: Omega und Alpha', 'Help: omega and alpha')} /></h3>
  {#if zuWenig}
    <p class="heft-text">{L('Omega braucht mindestens drei Fragen.', 'Omega needs at least three questions.')}</p>
  {:else}
    {#if o}
      <p class="ergebnis-satz" id="omega-ergebnis" tabindex="-1" style="font-size:1.05rem">{omegaZeile(o)} <span style="color:var(--tinte-2)">· {L('Alpha', 'Alpha')} = {ohneNull(e.alpha)} · {L('Zuverlässigkeit', 'reliability')} {alphaWort(o.omega)}</span></p>
      <p class="heft-text">{L('Omega lässt zu, dass die Fragen unterschiedlich stark zur Skala beitragen; Alpha nimmt gleiche Beiträge an. Liegt Omega deutlich über Alpha, tragen die Fragen ungleich bei.', 'Omega allows the questions to contribute to the scale to different degrees; alpha assumes equal contributions. If omega is clearly above alpha, the questions contribute unequally.')}
        {#if o.heywood} <b>{L('Hinweis:', 'Note:')}</b> {L('negative Restvarianz oder Ladung über 1 (Heywood-Fall) - Omega ist unsicher.', 'negative residual variance or loading above 1 (Heywood case) - omega is uncertain.')}{/if}
        {#if o.omegaH !== undefined} {L(`Hierarchisch (ωh, ${o.nf} Gruppenfaktoren): ${ohneNull(o.omegaH)}.`, `Hierarchical (ωh, ${o.nf} group factors): ${ohneNull(o.omegaH)}.`)}{/if}</p>
    {:else if umpolen}
      <p class="heft-text">{L('Polt zuerst die gegenläufigen Fragen um (siehe unten bei „Weiter mit der Skala“). Danach stimmt Omega.', 'First reverse-code the questions that run against the others (see "Next steps with the scale" below). Then omega is correct.')}</p>
    {:else}
      <p class="heft-text">{L('Omega ist die Zuverlässigkeit, wenn die Fragen unterschiedlich stark zur Skala beitragen (Alpha nimmt gleiche Beiträge an).', 'Omega is the reliability when the questions contribute to the scale to different degrees (alpha assumes equal contributions).')}</p>
    {/if}
    {#if fehler}<p id="omega-fehler" class="heft-text" role="alert" tabindex="-1" style="color:var(--fehler, #b3261e)">{fehler}</p>{/if}
    {#if !umpolen || o}
      {#if !o || laeuft || !rStatus.bereit}
        <RStart knopf={L('Omega berechnen', 'Calculate omega')} los={rechnen} {laeuft} bind:fehlt />
      {/if}
      <details class="auf" style="margin-top:var(--a2)"><summary>{L('Für Fachleute', 'For specialists')}</summary>
        <p class="heft-text">{L('Ein-Faktor-Modell mit lavaan (ML), ω = (Σλ)² / ((Σλ)² + Σθ) - wie JASP; jamovi rechnet psych::omega mit einem Faktor ohne Intervall. Das Intervall ist standardmäßig die Delta-Methode (rasch); der Bootstrap (1000 Ziehungen, wie JASP) dauert im Browser deutlich länger.', 'One-factor model with lavaan (ML), ω = (Σλ)² / ((Σλ)² + Σθ) - as in JASP; jamovi uses psych::omega with one factor and no interval. The interval is the delta method by default (fast); the bootstrap (1000 draws, as in JASP) takes much longer in the browser.')}</p>
        <div class="segment" style="margin:var(--a2) 0">
          <label data-begriff="bootstrap"><input type="checkbox" bind:checked={bootstrap} disabled={fiml}>{L('Bootstrap-Intervall (dauert länger)', 'Bootstrap interval (takes longer)')}</label>
          <label data-begriff="fehlende-werte"><input type="checkbox" bind:checked={fiml} onchange={() => { if (fiml) bootstrap = false; }}>{L('Fehlende Werte: FIML statt Personen auslassen', 'Missing values: FIML instead of leaving people out')}</label>
        </div>
        {#if kannHierarchisch}
          <div class="eingabe" style="max-width:340px;margin:var(--a2) 0"><label for="omega-nf">{L('ω hierarchisch (ωh) mit Gruppenfaktoren', 'Hierarchical ω (ωh) with group factors')}</label>
            <select id="omega-nf" bind:value={nf}><option value={0}>{L('nicht berechnen', 'do not calculate')}</option>{#each [2, 3, 4] as k}<option value={k}>{k}</option>{/each}</select></div>
        {/if}
        <div class="knopfzeile"><button class="k" type="button" aria-disabled={laeuft || fehlt ? 'true' : undefined} onclick={rechnen}>{o ? L('Neu rechnen mit diesen Einstellungen', 'Recalculate with these settings') : L('Mit diesen Einstellungen berechnen', 'Calculate with these settings')}</button></div>
        {#if o}<p class="heft-text">{o.art === 'bootstrap' ? L(`Intervall: Perzentil-Bootstrap, ${o.ziehungen} Ziehungen.`, `Interval: percentile bootstrap, ${o.ziehungen} draws.`) : L('Intervall: Delta-Methode.', 'Interval: delta method.')} {omegaKi(o)}</p>{/if}
      </details>
    {/if}
  {/if}
</div>
