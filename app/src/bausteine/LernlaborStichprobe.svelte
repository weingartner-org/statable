<script module lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { Population, Stichprobenverteilung } from '../lib/lernlabor';
  import { Simulation } from '../lib/lernlaborlauf.svelte';
  /** Eingaben und Ergebnis bleiben beim Wechsel der Karteireiter erhalten. */
  const z = $state({ art: 'exponential' as Population['art'], mu: '100', sigma: '15', a: '0', b: '1', rate: '1', mu1: '-2', mu2: '2', sigma2: '1', p: '30', n: '10', B: 10000, letzter: -1 });
  let erg = $state.raw<null | { e: Stichprobenverteilung; art: Population['art']; pop: Population }>(null);
  const sim = new Simulation();
</script>
<script lang="ts">
  import { untrack } from 'svelte';
  import { L, d, waehle } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import { verzoegert } from '../lib/laedt.svelte';
  import { B_MAX, N_MAX, histogramm, normalDichte, dbinom, populationKennzahlen, pruefePopulation, stichprobenverteilungLauf } from '../lib/lernlabor';
  import { POPULATIONEN, g4, leseAnteil, leseGanz, leseZahl, lehreStichprobe, populationBild, satzStichprobe, popKennText, prozent } from '../lib/lernlaborsaetze';
  import LernlaborHistogramm from './LernlaborHistogramm.svelte';
  import Rechnet from './Rechnet.svelte';
  import LernlaborTabelle from './LernlaborTabelle.svelte';

  let { startwert, anstoss }: { startwert: number; anstoss: number } = $props();
  const anim = verzoegert(() => sim.laeuft);

  /** Die Grundgesamtheit aus den Eingabefeldern (oder ein Fehlertext). */
  const eingabe = $derived.by((): { pop: Population | null; fehler: string } => {
    const f = (t: string) => leseZahl(t);
    const pop: Population | null = z.art === 'normal' ? { art: 'normal', mu: f(z.mu), sigma: f(z.sigma) } : z.art === 'gleich' ? { art: 'gleich', a: f(z.a), b: f(z.b) }
      : z.art === 'exponential' ? { art: 'exponential', rate: f(z.rate) } : z.art === 'zweigipflig' ? { art: 'zweigipflig', mu1: f(z.mu1), mu2: f(z.mu2), sigma: f(z.sigma2) }
      : z.art === 'wuerfel' ? { art: 'wuerfel' } : { art: 'anteil', p: leseAnteil(z.p) };
    if (pruefePopulation(pop)) return { pop: null, fehler: L('Bitte die Werte der Grundgesamtheit prüfen: die Streuung muss größer als 0 sein, bei der Gleichverteilung muss „bis“ über „von“ liegen, und der Anteil liegt zwischen 0 und 100 %.', 'Please check the values of the population: the spread must be greater than 0, for the uniform distribution "to" must be above "from", and the proportion is between 0 and 100%.') };
    return { pop, fehler: '' };
  });
  const nWert = $derived(leseGanz(z.n));
  const nFehler = $derived(Number.isInteger(nWert) && nWert >= 1 && nWert <= N_MAX ? '' : L(`Bitte eine ganze Zahl von 1 bis ${N_MAX} eingeben.`, `Please enter a whole number from 1 to ${N_MAX}.`));
  const bild = $derived(eingabe.pop ? populationBild(eingabe.pop) : null);

  async function simuliere() {
    if (!eingabe.pop || nFehler) return;
    const pop = eingabe.pop, art = pop.art;
    const e = await sim.starte(stichprobenverteilungLauf({ pop, n: nWert, B: z.B, startwert }));
    if (e) erg = { e, art, pop };
  }
  $effect(() => { const a = anstoss; untrack(() => { if (z.letzter !== a || !erg) { z.letzter = a; void simuliere(); } }); });

  /* Bild der Mittelwerte: Säulen, darüber die theoretische Verteilung (Normalkurve bzw. Binomial/n) */
  const ansicht = $derived.by(() => {
    if (!erg) return null;
    const { e, art, pop } = erg, k = populationKennzahlen(pop), se = e.theoretischerSE;
    if (pop.art === 'anteil') {
      const n = e.n, h = histogramm(e.werte, 1 / n);
      const lo = Math.max(0, k.mittel - 5 * se), hi = Math.min(1, k.mittel + 5 * se), punkte: { x: number; y: number }[] = [];
      for (let j = Math.ceil(lo * n - 1e-9); j <= Math.floor(hi * n + 1e-9); j++) punkte.push({ x: j / n, y: dbinom(j, n, pop.p) * n });
      return { h, kurve: [], punkte };
    }
    const h = histogramm(e.werte), lo = Math.min(h.kanten[0]!, k.mittel - 4 * se), hi = Math.max(h.kanten.at(-1)!, k.mittel + 4 * se);
    return { h, kurve: Array.from({ length: 121 }, (_, i) => { const x = lo + ((hi - lo) * i) / 120; return { x, y: normalDichte(x, k.mittel, se) }; }), punkte: [] };
  });
  const bildTitel = $derived.by(() => {
    if (!erg) return '';
    const { e, art } = erg;
    return art === 'anteil' ? L(`Verteilung von ${e.B} Anteilen aus Stichproben vom Umfang ${e.n}`, `Distribution of ${e.B} proportions from samples of size ${e.n}`) : L(`Verteilung von ${e.B} Mittelwerten aus Stichproben vom Umfang ${e.n}`, `Distribution of ${e.B} means from samples of size ${e.n}`);
  });
  const hn = [1, 2, 5, 10, 30, 100, 500];
  /** Beschriftungen je Fall (Anteil oder Mittelwert) als ganze Texte. */
  const achseText = $derived.by(() => { if (erg?.art === 'anteil') return L('Anteil in der Stichprobe', 'Proportion in the sample'); return L('Mittelwert der Stichprobe', 'Mean of the sample'); });
  const formelSE = $derived.by(() => { if (erg?.art === 'anteil') return '(√(p(1−p)/n))'; return '(σ/√n)'; });
</script>

<div class="ll-raster">
  <div class="ll-eingaben">
    <h2 class="ll-h">{L('Grundgesamtheit und Stichprobe', 'Population and sample')}</h2>
    <div class="eingabe"><label for="ll-st-art">{L('Grundgesamtheit', 'Population')}</label>
      <select id="ll-st-art" bind:value={z.art}>{#each POPULATIONEN as p}<option value={p.art}>{waehle(p.name)}</option>{/each}</select>
      <span class="hilfe">{waehle(POPULATIONEN.find(p => p.art === z.art)!.text)}</span></div>
    {#if z.art === 'normal'}
      <div class="ll-zeile"><div class="eingabe"><label for="ll-st-mu">μ</label><input id="ll-st-mu" type="text" inputmode="decimal" bind:value={z.mu} style="max-width:9ch"></div>
        <div class="eingabe"><label for="ll-st-sigma">σ</label><input id="ll-st-sigma" type="text" inputmode="decimal" bind:value={z.sigma} style="max-width:9ch"></div></div>
    {:else if z.art === 'gleich'}
      <div class="ll-zeile"><div class="eingabe"><label for="ll-st-a">{L('von', 'from')}</label><input id="ll-st-a" type="text" inputmode="decimal" bind:value={z.a} style="max-width:9ch"></div>
        <div class="eingabe"><label for="ll-st-b">{L('bis', 'to')}</label><input id="ll-st-b" type="text" inputmode="decimal" bind:value={z.b} style="max-width:9ch"></div></div>
    {:else if z.art === 'exponential'}
      <div class="eingabe"><label for="ll-st-rate">{L('Rate (Mittelwert = 1/Rate)', 'Rate (mean = 1/rate)')}</label><input id="ll-st-rate" type="text" inputmode="decimal" bind:value={z.rate} style="max-width:9ch"></div>
    {:else if z.art === 'zweigipflig'}
      <div class="ll-zeile"><div class="eingabe"><label for="ll-st-mu1">{L('Mitte 1', 'Centre 1')}</label><input id="ll-st-mu1" type="text" inputmode="decimal" bind:value={z.mu1} style="max-width:9ch"></div>
        <div class="eingabe"><label for="ll-st-mu2">{L('Mitte 2', 'Centre 2')}</label><input id="ll-st-mu2" type="text" inputmode="decimal" bind:value={z.mu2} style="max-width:9ch"></div>
        <div class="eingabe"><label for="ll-st-s2">σ</label><input id="ll-st-s2" type="text" inputmode="decimal" bind:value={z.sigma2} style="max-width:9ch"></div></div>
    {:else if z.art === 'anteil'}
      <div class="eingabe"><label for="ll-st-p">{L('Anteil der Treffer p (in Prozent)', 'Share of hits p (in percent)')}</label><input id="ll-st-p" type="text" inputmode="decimal" bind:value={z.p} style="max-width:9ch"></div>
    {/if}
    {#if eingabe.fehler}<p class="fehler" role="alert">{eingabe.fehler}</p>{/if}
    <div class="eingabe"><label for="ll-st-n">{L(`Stichprobenumfang n (1 bis ${N_MAX})`, `Sample size n (1 to ${N_MAX})`)}</label>
      <input id="ll-st-n" type="text" inputmode="numeric" bind:value={z.n} aria-invalid={nFehler ? 'true' : undefined} aria-describedby="ll-st-n-h" style="max-width:9ch">
      <div class="ll-zeile" role="group" aria-label={L('Richtwerte für n', 'Common values for n')}>{#each hn as v}<button class="k klein-knopf" type="button" aria-pressed={nWert === v} onclick={() => (z.n = String(v))}>{v}</button>{/each}</div>
      <span class="hilfe fehler" id="ll-st-n-h">{nFehler}</span></div>
    <div class="eingabe"><label for="ll-st-B">{L(`Anzahl der Stichproben (bis ${zahlDe(10000)})`, `Number of samples (up to ${zahlDe(10000)})`)}</label>
      <select id="ll-st-B" bind:value={z.B}>{#each [100, 1000, 10000] as v}<option value={v}>{zahlDe(v)}</option>{/each}</select></div>
    <button class="k haupt gross" type="button" onclick={simuliere} disabled={!eingabe.pop || !!nFehler || undefined}>{L('Stichproben ziehen', 'Draw samples')}</button>
  </div>

  <div class="ll-ergebnis" use:ergebnisAnsage={{ satz: '.ll-satz', anzahl: 1 }}>
    <h2 class="ll-h">{L('Die Grundgesamtheit', 'The population')}</h2>
    {#if bild && eingabe.pop}
      <figure class="ll-bild" style="max-width:32rem"><LernlaborHistogramm h={bild} n={1} xText={L('Wert in der Grundgesamtheit', 'Value in the population')} yText={L('Wahrscheinlichkeit je Klasse', 'Probability per class')}
        titel={L('So sieht die Grundgesamtheit aus', 'This is what the population looks like')} beschreibung={L(`Verteilung der Grundgesamtheit: ${popKennText(eingabe.pop)}.`, `Distribution of the population: ${popKennText(eingabe.pop)}.`)} />
        <figcaption>{L(`Die Grundgesamtheit (${popKennText(eingabe.pop)}). Daraus werden die Stichproben gezogen.`, `The population (${popKennText(eingabe.pop)}). The samples are drawn from it.`)}</figcaption></figure>
    {/if}
    {#if anim.an}<div class="ll-rechnet"><Rechnet text={L('Die Stichproben werden gezogen …', 'Drawing the samples …')} /><progress max="1" value={sim.anteil} aria-label={L('Fortschritt', 'Progress')}></progress></div>{/if}
    {#if erg && ansicht}
      {@const e = erg.e}
      {#if erg.art === 'anteil'}<h2 class="ll-h">{L('Verteilung der Anteile', 'Distribution of the proportions')}</h2>{:else}<h2 class="ll-h">{L('Verteilung der Mittelwerte', 'Distribution of the means')}</h2>{/if}
      <figure class="ll-bild"><LernlaborHistogramm h={ansicht.h} n={e.B} kurve={ansicht.kurve} punkte={ansicht.punkte}
        linien={[{ x: e.theoretischerMittel, text: `${erg.art === 'anteil' ? 'p' : 'μ'} = ${g4(e.theoretischerMittel)}`, stil: 'strich', farbe: 'tinte' }]}
        xText={achseText} yText={L('Anzahl Stichproben', 'Number of samples')}
        titel={bildTitel} beschreibung={L(`${e.B} Stichproben vom Umfang ${e.n}, Startwert ${e.startwert}. Mittel der Statistik ${g4(e.mittelDerWerte)}, empirischer Standardfehler ${g4(e.empirischerSE)}, theoretischer ${g4(e.theoretischerSE)}.`, `${e.B} samples of size ${e.n}, seed ${e.startwert}. Mean of the statistic ${g4(e.mittelDerWerte)}, empirical standard error ${g4(e.empirischerSE)}, theoretical ${g4(e.theoretischerSE)}.`)} />
        <figcaption>{erg.art === 'anteil' ? L('Säulen: die simulierten Anteile. Punkte: die exakte Binomialverteilung (Anteil = Treffer/n). Gestrichelt: der Anteil in der Grundgesamtheit.', 'Bars: the simulated proportions. Dots: the exact binomial distribution (proportion = hits/n). Dashed: the proportion in the population.') : L('Säulen: die simulierten Mittelwerte. Linie: die Normalverteilung mit Mittel μ und Standardfehler σ/√n. Gestrichelt: μ.', 'Bars: the simulated means. Line: the normal distribution with mean μ and standard error σ/√n. Dashed: μ.')}</figcaption></figure>
      <LernlaborTabelle titel={L('Die Zahlen dazu', 'The numbers')}><table class="ll-tabelle"><caption>{L('Die Zahlen dazu', 'The numbers')}</caption>
        <thead><tr><th scope="col">{L('Größe', 'Quantity')}</th><th scope="col">{L('Simuliert', 'Simulated')}</th><th scope="col">{L('Formel', 'Formula')}</th></tr></thead>
        <tbody>
          <tr><th scope="row">{L('Mittel der Statistik', 'Mean of the statistic')}</th><td>{g4(e.mittelDerWerte)}</td><td>{g4(e.theoretischerMittel)}</td></tr>
          <tr><th scope="row">{L('Standardfehler', 'Standard error')}</th><td>{g4(e.empirischerSE)}</td><td>{g4(e.theoretischerSE)} {formelSE}</td></tr>
        </tbody></table></LernlaborTabelle>
      <p class="ll-satz" data-startwert={e.startwert}>{satzStichprobe(e, erg.art)}</p>
      <p class="ll-lehre">{lehreStichprobe()}</p>
    {:else if !anim.an}
      <p class="ll-lehre">{d('Wähle eine Grundgesamtheit und einen Stichprobenumfang und ziehe Stichproben.', 'Wählen Sie eine Grundgesamtheit und einen Stichprobenumfang und ziehen Sie Stichproben.', 'Choose a population and a sample size and draw samples.')}</p>
    {/if}
  </div>
</div>
