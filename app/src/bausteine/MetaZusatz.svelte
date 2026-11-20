<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { L, melde, sichern, type Blatt } from '../lib/sitzung.svelte';
  import { metaRechnen } from '../lib/rverfahren.svelte';
  import { metaRCode, R_PAKETE_META, type Meta } from '../lib/metaanalyse';
  import { piIntHout } from '../lib/metasaetze';
  import RStart from './RStart.svelte';

  /** Zusatz im Blatt der Meta-Analyse: „Für Fachleute“ (Knapp-Hartung), die R-Meldungen und der R-Aufruf zum Nachrechnen. */
  let { blatt, e }: { blatt: Blatt; e: Meta } = $props();
  let kh = $state(untrack(() => e.ein.kh)), laeuft = $state(false), fehler = $state(''), fehlt = $state(false);
  const geaendert = $derived(kh !== e.ein.kh);
  async function rechnen() {
    if (laeuft) return;
    laeuft = true; fehler = '';
    try {
      const neu = await metaRechnen({ ...e.ein, kh });
      blatt.ergebnis = { typ: 'meta', e: neu };
      sichern();
      melde(kh ? L('Mit Knapp-Hartung neu gerechnet.', 'Recalculated with Knapp-Hartung.') : L('Neu gerechnet.', 'Recalculated.'));
    } catch (x) { fehler = (x as Error).message; await tick(); document.getElementById('meta-zusatz-fehler')?.focus(); }
    finally { laeuft = false; }
  }
</script>

<details class="auf" style="margin-top:var(--a4)"><summary>{L('Für Fachleute', 'For specialists')}</summary>
  <p class="heft-text">{L('Das Modell ist ein Random-Effects-Modell: Die wahren Effekte dürfen sich zwischen den Studien unterscheiden (τ², REML-Schätzung). Standard ist die Anpassung nach Knapp und Hartung: Sie rechnet den Test des gepoolten Effekts mit einer t-Verteilung (k − 1 Freiheitsgrade) und einem angepassten Standardfehler; bei wenigen Studien halten die Intervalle so das 95 %-Niveau besser ein (IntHout et al., 2014). Ohne Haken rechnet Statable wie die Voreinstellung von JASP mit dem z-Test.', 'The model is a random-effects model: the true effects may differ between studies (τ², REML estimate). The default is the Knapp-Hartung adjustment: it tests the pooled effect with a t distribution (k − 1 degrees of freedom) and an adjusted standard error; with few studies the intervals then keep the 95% level better (IntHout et al., 2014). Unticked, Statable calculates like the JASP default with the z test.')}</p>
  <p class="heft-text">{#if piIntHout(e)}{L(`Das Prädiktionsintervall oben ist wie in metafor::predict gerechnet (mit Knapp-Hartung t-Verteilung mit k − 1 Freiheitsgraden, ohne Normalverteilung). IntHout et al. (2016) empfehlen bei wenigen Studien die t-Verteilung mit k − 2 Freiheitsgraden; sie ergibt hier ${piIntHout(e)} (95 %).`, `The prediction interval above is calculated as metafor::predict does (with Knapp-Hartung a t distribution with k − 1 degrees of freedom, without it the normal distribution). IntHout et al. (2016) recommend a t distribution with k − 2 degrees of freedom when there are few studies; here it gives ${piIntHout(e)} (95%).`)}{:else}{L('Das Prädiktionsintervall nach IntHout et al. (2016) mit t(k − 2) ist bei zwei Studien nicht definiert.', 'The prediction interval of IntHout et al. (2016) with t(k − 2) is not defined for two studies.')}{/if}</p>
  <label class="schalter"><input type="checkbox" bind:checked={kh}>{L('Anpassung nach Knapp und Hartung (Standard)', 'Knapp-Hartung adjustment (default)')}</label>
  {#if fehler}<p id="meta-zusatz-fehler" class="heft-text" role="alert" tabindex="-1" style="color:var(--fehler, #b3261e)">{fehler}</p>{/if}
  <RStart knopf={L('Neu rechnen mit dieser Einstellung', 'Recalculate with this setting')} los={rechnen} {laeuft} haupt={geaendert} pakete={R_PAKETE_META} bind:fehlt />
  {#if e.meldungen.length}<p class="heft-text" style="color:var(--tinte-2)">{L('Meldungen von R', 'Messages from R')}: {e.meldungen.slice(0, 3).join(' · ')}</p>{/if}
  <pre class="befehl">{metaRCode(e.ein, L)}</pre>
</details>
