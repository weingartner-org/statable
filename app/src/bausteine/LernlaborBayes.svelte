<script module lang="ts">
  /** Bleibt beim Wechsel der Karteireiter erhalten; gehört nicht zum Projekt. */
  const z = $state({ art: 'anteil' as 'anteil' | 'mittel', a: 2, b: 2, k: 7, n: 20, mu0: 100, tau0: 15, nm: 10, xbar: 110, sigma: 15 });
</script>
<script lang="ts">
  import { untrack } from 'svelte';
  import { L, Lp, d } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { zahlDe } from '../lib/format';
  import { anteilKurven, anteilVorwissen, mittelKurven, mittelVorwissen } from '../lib/bayesvorwissen';
  import { g4, prozent } from '../lib/lernlaborsaetze';
  import { proz } from '../i18n/profil';
  import LernlaborBayesBild from './LernlaborBayesBild.svelte';
  import LernlaborTabelle from './LernlaborTabelle.svelte';

  /**
   * Lernlabor „Bayes mit Vorwissen“ (Field-Stufe 3b): Prior, Likelihood und Posterior zum Verschieben. Alles in geschlossener Form (lib/bayesvorwissen.ts), ohne Zufallszahlen.
   * Anteil: Prior Beta(a, b), Daten k von n. Mittelwert: Normal-Prior, bekanntes σ. Die Erklärung steht auf derselben Seite, die Kurven auch als Text und Tabelle.
   */
  const f2 = (v: number) => zahlDe(Number(v.toFixed(2))), f3 = (v: number) => zahlDe(Number(v.toFixed(3)));
  $effect(() => { if (z.k > z.n) z.k = z.n; });
  /** Ergebnis ansagen: erst nach dem Loslassen oder Eingabe-Ende (`change`, entprellt), nie bei jedem Schritt des Reglers. Die Ergebnisfläche selbst ist keine Live-Region. */
  let anstoss = $state(0);
  $effect(() => {
    if (!anstoss) return;
    const t = setTimeout(() => sage(untrack(() => ergebnisSatz)), 700);
    return () => clearTimeout(t);
  });
  const ea = $derived(z.art === 'anteil' ? anteilVorwissen(z.a, z.b, z.k, z.n) : null);
  const em = $derived(z.art === 'mittel' ? mittelVorwissen(z.mu0, z.tau0, z.nm, z.xbar, z.sigma) : null);
  const kurve = $derived(ea ? anteilKurven(z.a, z.b, z.k, z.n) : em ? mittelKurven(em, Math.min(z.mu0 - 4 * z.tau0, z.xbar - 4 * em.datenSe, em.mittel - 4 * em.sd), Math.max(z.mu0 + 4 * z.tau0, z.xbar + 4 * em.datenSe, em.mittel + 4 * em.sd)) : null);
  const e = $derived(ea ?? em);
  const von = $derived(kurve ? kurve.x[0]! : 0), bis = $derived(kurve ? kurve.x.at(-1)! : 1);
  const niv = $derived(proz(zahlDe(95, 0)));
  const sw = $derived(e ? (ea ? (ea.priorGewicht >= 0.5 ? 'prior' : 'daten') : em!.priorGewicht >= 0.5 ? 'prior' : 'daten') : 'daten');

  /** Stützstellen der Textfassung (Dichten an wenigen Punkten). */
  const stuetz = $derived.by(() => {
    if (!kurve) return [] as { x: number; p: number; l: number; q: number }[];
    const idx = Array.from({ length: 11 }, (_, i) => Math.round((i * (kurve.x.length - 1)) / 10));
    return idx.map(i => ({ x: kurve.x[i]!, p: kurve.prior[i]!, l: kurve.likelihood[i]!, q: kurve.posterior[i]! }));
  });
  const lage = (x: number) => (z.art === 'anteil' ? prozent(x, 0) : f2(x));
  const spitze = (w: number[]) => lage(kurve!.x[w.indexOf(Math.max(...w))]!);

  const titel = $derived(z.art === 'anteil' ? L('Prior, Likelihood und Posterior für einen Anteil', 'Prior, likelihood and posterior for a proportion') : L('Prior, Likelihood und Posterior für einen Mittelwert', 'Prior, likelihood and posterior for a mean'));
  const beschreibung = $derived.by(() => {
    if (!kurve || !e) return '';
    if (ea) return L(`Drei Kurven über dem Anteil von 0 bis 100 Prozent. Prior Beta(${f2(ea.prior[0])}; ${f2(ea.prior[1])}) gestrichelt, höchste Stelle bei ${spitze(kurve.prior)}. Likelihood zu ${ea.k} von ${ea.n} gepunktet, höchste Stelle bei ${spitze(kurve.likelihood)}. Posterior Beta(${f2(ea.post[0])}; ${f2(ea.post[1])}) durchgezogen und dick, höchste Stelle bei ${spitze(kurve.posterior)}, Mittel ${prozent(ea.mittel, 1)}. Das ${niv}-Glaubwürdigkeitsintervall reicht von ${prozent(ea.lo, 1)} bis ${prozent(ea.hi, 1)} und ist schraffiert.`,
      `Three curves over the proportion from 0 to 100 percent. Prior Beta(${f2(ea.prior[0])}, ${f2(ea.prior[1])}) dashed, highest at ${spitze(kurve.prior)}. Likelihood for ${ea.k} of ${ea.n} dotted, highest at ${spitze(kurve.likelihood)}. Posterior Beta(${f2(ea.post[0])}, ${f2(ea.post[1])}) solid and thick, highest at ${spitze(kurve.posterior)}, mean ${prozent(ea.mittel, 1)}. The ${niv} credible interval runs from ${prozent(ea.lo, 1)} to ${prozent(ea.hi, 1)} and is hatched.`);
    const m = em!;
    return L(`Drei Kurven über dem Mittelwert. Prior Normalverteilung mit Mittel ${f2(m.priorMittel)} und Streuung ${f2(m.priorSd)} gestrichelt. Likelihood der ${m.n} Werte mit Mittel ${f2(m.datenMittel)} gepunktet. Posterior mit Mittel ${f2(m.mittel)} und Streuung ${f2(m.sd)} durchgezogen und dick. Das ${niv}-Glaubwürdigkeitsintervall reicht von ${f2(m.lo)} bis ${f2(m.hi)} und ist schraffiert.`,
      `Three curves over the mean. Prior normal distribution with mean ${f2(m.priorMittel)} and spread ${f2(m.priorSd)} dashed. Likelihood of the ${m.n} values with mean ${f2(m.datenMittel)} dotted. Posterior with mean ${f2(m.mittel)} and spread ${f2(m.sd)} solid and thick. The ${niv} credible interval runs from ${f2(m.lo)} to ${f2(m.hi)} and is hatched.`);
  });
  const ergebnisSatz = $derived.by(() => {
    if (ea) return L(`Vorwissen Beta(${f2(ea.prior[0])}; ${f2(ea.prior[1])}) hat einen Mittelwert von ${prozent(ea.priorMittel, 1)} und zählt wie ${f2(ea.prior[0] + ea.prior[1])} Beobachtungen. Dazu kommen ${ea.k} von ${ea.n} (${prozent(ea.datenAnteil, 1)}). Der Posterior ist Beta(${f2(ea.post[0])}; ${f2(ea.post[1])}) mit Mittel ${prozent(ea.mittel, 1)}; das ${niv}-Glaubwürdigkeitsintervall reicht von ${prozent(ea.lo, 1)} bis ${prozent(ea.hi, 1)}. Mit ${prozent(ea.pUeberHalb, 1)} Wahrscheinlichkeit liegt der Anteil über 50 %.`,
      `Prior knowledge Beta(${f2(ea.prior[0])}, ${f2(ea.prior[1])}) has a mean of ${prozent(ea.priorMittel, 1)} and counts like ${f2(ea.prior[0] + ea.prior[1])} observations. Added to it are ${ea.k} of ${ea.n} (${prozent(ea.datenAnteil, 1)}). The posterior is Beta(${f2(ea.post[0])}, ${f2(ea.post[1])}) with mean ${prozent(ea.mittel, 1)}; the ${niv} credible interval runs from ${prozent(ea.lo, 1)} to ${prozent(ea.hi, 1)}. With a probability of ${prozent(ea.pUeberHalb, 1)} the proportion is above 50%.`);
    if (em) return L(`Das Vorwissen sagt ${f2(em.priorMittel)} (Streuung ${f2(em.priorSd)}), die ${em.n} Werte haben das Mittel ${f2(em.datenMittel)} (Standardfehler ${f2(em.datenSe)}). Der Posterior hat das Mittel ${f2(em.mittel)} und die Streuung ${f2(em.sd)}; das ${niv}-Glaubwürdigkeitsintervall reicht von ${f2(em.lo)} bis ${f2(em.hi)}. Das Vorwissen trägt ${prozent(em.priorGewicht, 1)} zum Posterior-Mittel bei.`,
      `The prior says ${f2(em.priorMittel)} (spread ${f2(em.priorSd)}), the ${em.n} values have the mean ${f2(em.datenMittel)} (standard error ${f2(em.datenSe)}). The posterior has the mean ${f2(em.mittel)} and the spread ${f2(em.sd)}; the ${niv} credible interval runs from ${f2(em.lo)} to ${f2(em.hi)}. The prior contributes ${prozent(em.priorGewicht, 1)} to the posterior mean.`);
    return '';
  });
  const deutung = $derived(sw === 'prior' ? L('Hier wiegt das Vorwissen schwerer als die Daten: Der Posterior liegt näher am Prior. Mit mehr Daten würde sich das umkehren.', 'Here the prior knowledge weighs more than the data: the posterior lies closer to the prior. With more data this would reverse.')
    : L('Hier wiegen die Daten schwerer als das Vorwissen: Der Posterior liegt näher an der Likelihood. Mit einem stärkeren Prior (größere Werte) würde sich das umkehren.', 'Here the data weigh more than the prior knowledge: the posterior lies closer to the likelihood. With a stronger prior (larger values) this would reverse.'));
</script>

<div class="ll-raster">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="ll-eingaben" onchange={() => anstoss++}>
    <h2 class="ll-h">{L('Vorwissen und Daten', 'Prior knowledge and data')}</h2>
    <div class="eingabe"><span class="lbl" id="ll-bv-art">{L('Was wird geschätzt?', 'What is estimated?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="ll-bv-art">
        <label data-begriff="beta-verteilung"><input type="radio" name="ll-bv-a" value="anteil" bind:group={z.art}>{L('Ein Anteil (Beta-Verteilung)', 'A proportion (beta distribution)')}</label>
        <label><input type="radio" name="ll-bv-a" value="mittel" bind:group={z.art}>{L('Ein Mittelwert (Normalverteilung)', 'A mean (normal distribution)')}</label></div></div>
    {#if z.art === 'anteil'}
      <h3 class="ll-h2" data-begriff="prior">{L('Prior: Beta(a, b)', 'Prior: Beta(a, b)')}</h3>
      <div class="eingabe"><label for="ll-bv-a"><span id="ll-bv-a-n">{L('a (Treffer im Vorwissen)', 'a (hits in the prior knowledge)')}<span aria-hidden="true">:</span></span> <b>{f2(z.a)}</b></label><input id="ll-bv-a" aria-labelledby="ll-bv-a-n" type="range" min="0.5" max="50" step="0.5" bind:value={z.a} aria-valuetext={L(`Treffer im Vorwissen ${f2(z.a)}`, `Hits in the prior knowledge ${f2(z.a)}`)}></div>
      <div class="eingabe"><label for="ll-bv-b"><span id="ll-bv-b-n">{L('b (Nicht-Treffer im Vorwissen)', 'b (misses in the prior knowledge)')}<span aria-hidden="true">:</span></span> <b>{f2(z.b)}</b></label><input id="ll-bv-b" aria-labelledby="ll-bv-b-n" type="range" min="0.5" max="50" step="0.5" bind:value={z.b} aria-valuetext={L(`Nicht-Treffer im Vorwissen ${f2(z.b)}`, `Misses in the prior knowledge ${f2(z.b)}`)}></div>
      <h3 class="ll-h2">{L('Daten', 'Data')}</h3>
      <div class="eingabe"><label for="ll-bv-n"><span id="ll-bv-n-n">{L('n (Zahl der Versuche)', 'n (number of trials)')}<span aria-hidden="true">:</span></span> <b>{z.n}</b></label><input id="ll-bv-n" aria-labelledby="ll-bv-n-n" type="range" min="1" max="200" step="1" bind:value={z.n} aria-valuetext={Lp(z.n, `${z.n} Versuch`, `${z.n} Versuche`, `${z.n} trial`, `${z.n} trials`)}></div>
      <div class="eingabe"><label for="ll-bv-k"><span id="ll-bv-k-n">{L('k (Treffer)', 'k (hits)')}<span aria-hidden="true">:</span></span> <b>{z.k}</b></label><input id="ll-bv-k" aria-labelledby="ll-bv-k-n" type="range" min="0" max={z.n} step="1" bind:value={z.k} aria-valuetext={L(`${z.k} Treffer von ${z.n}`, `${z.k} hits out of ${z.n}`)}></div>
    {:else}
      <h3 class="ll-h2" data-begriff="prior">{L('Prior: Normalverteilung', 'Prior: normal distribution')}</h3>
      <div class="eingabe"><label for="ll-bv-m0"><span id="ll-bv-m0-n">{L('Mittel des Vorwissens μ₀', 'Mean of the prior knowledge μ₀')}<span aria-hidden="true">:</span></span> <b>{f2(z.mu0)}</b></label><input id="ll-bv-m0" aria-labelledby="ll-bv-m0-n" type="range" min="70" max="130" step="1" bind:value={z.mu0} aria-valuetext={L(`Mittel des Vorwissens ${f2(z.mu0)}`, `Mean of the prior knowledge ${f2(z.mu0)}`)}></div>
      <div class="eingabe"><label for="ll-bv-t0"><span id="ll-bv-t0-n">{L('Unsicherheit des Vorwissens τ₀ (Streuung)', 'Uncertainty of the prior knowledge τ₀ (spread)')}<span aria-hidden="true">:</span></span> <b>{f2(z.tau0)}</b></label><input id="ll-bv-t0" aria-labelledby="ll-bv-t0-n" type="range" min="1" max="40" step="1" bind:value={z.tau0} aria-valuetext={L(`Streuung des Vorwissens ${f2(z.tau0)}`, `Spread of the prior knowledge ${f2(z.tau0)}`)}></div>
      <h3 class="ll-h2">{L('Daten', 'Data')}</h3>
      <div class="eingabe"><label for="ll-bv-nm"><span id="ll-bv-nm-n">{L('n (Werte)', 'n (values)')}<span aria-hidden="true">:</span></span> <b>{z.nm}</b></label><input id="ll-bv-nm" aria-labelledby="ll-bv-nm-n" type="range" min="1" max="100" step="1" bind:value={z.nm} aria-valuetext={Lp(z.nm, `${z.nm} Wert`, `${z.nm} Werte`, `${z.nm} value`, `${z.nm} values`)}></div>
      <div class="eingabe"><label for="ll-bv-xb"><span id="ll-bv-xb-n">{L('Mittel der Werte x̄', 'Mean of the values x̄')}<span aria-hidden="true">:</span></span> <b>{f2(z.xbar)}</b></label><input id="ll-bv-xb" aria-labelledby="ll-bv-xb-n" type="range" min="70" max="130" step="1" bind:value={z.xbar} aria-valuetext={L(`Mittel der Werte ${f2(z.xbar)}`, `Mean of the values ${f2(z.xbar)}`)}></div>
      <div class="eingabe"><label for="ll-bv-sg"><span id="ll-bv-sg-n">{L('Bekannte Streuung σ der Einzelwerte', 'Known spread σ of the single values')}<span aria-hidden="true">:</span></span> <b>{f2(z.sigma)}</b></label><input id="ll-bv-sg" aria-labelledby="ll-bv-sg-n" type="range" min="1" max="40" step="1" bind:value={z.sigma} aria-valuetext={L(`Streuung der Einzelwerte ${f2(z.sigma)}`, `Spread of the single values ${f2(z.sigma)}`)}></div>
    {/if}
  </div>

  <div class="ll-ergebnis">
    {#if e && kurve}
      <h2 class="ll-h">{titel}</h2>
      <figure class="ll-bild"><LernlaborBayesBild {kurve} {von} {bis} lo={e.lo} hi={e.hi} mittel={e.mittel} xText={z.art === 'anteil' ? L('Anteil', 'Proportion') : L('Mittelwert', 'Mean')} yText={L('Dichte', 'Density')}
        nameP={L('Prior (Vorwissen)', 'Prior (prior knowledge)')} nameL={L('Likelihood (Daten, skaliert)', 'Likelihood (data, scaled)')} nameQ={L('Posterior (beides zusammen)', 'Posterior (both together)')} niveauText={L(`${niv}-Glaubwürdigkeitsintervall`, `${niv} credible interval`)}
        {titel} {beschreibung} />
        <figcaption>{L('Die Likelihood ist so skaliert, dass die Fläche unter jeder Kurve 1 ergibt; nur so lassen sich die Formen vergleichen. Die senkrechte Linie steht beim Posterior-Mittel.', 'The likelihood is scaled so that the area under each curve is 1; only then can the shapes be compared. The vertical line is at the posterior mean.')}</figcaption></figure>

      <LernlaborTabelle titel={L('Zahlen zum Diagramm', 'Numbers for the chart')}><table class="ll-tabelle"><caption>{L('Zahlen zum Diagramm', 'Numbers for the chart')}</caption>
        <thead><tr><th scope="col">{L('Kurve', 'Curve')}</th><th scope="col">{L('Mittel', 'Mean')}</th><th scope="col">{L('Intervall', 'Interval')}</th></tr></thead>
        <tbody>
          {#if ea}
            <tr><th scope="row">{L('Prior', 'Prior')} Beta({f2(ea.prior[0])}; {f2(ea.prior[1])})</th><td>{prozent(ea.priorMittel, 1)}</td><td>-</td></tr>
            <tr><th scope="row">{L('Likelihood', 'Likelihood')} ({ea.k} / {ea.n})</th><td>{prozent(ea.datenAnteil, 1)}</td><td>-</td></tr>
            <tr><th scope="row">{L('Posterior', 'Posterior')} Beta({f2(ea.post[0])}; {f2(ea.post[1])})</th><td>{prozent(ea.mittel, 1)}</td><td>{prozent(ea.lo, 1)} {L('bis', 'to')} {prozent(ea.hi, 1)}</td></tr>
            <tr><th scope="row">{L('Wahrscheinlichkeit, dass der Anteil über 50 % liegt', 'Probability that the proportion is above 50%')}</th><td colspan="2">{prozent(ea.pUeberHalb, 1)}</td></tr>
          {:else if em}
            <tr><th scope="row">{L('Prior', 'Prior')}</th><td>{f2(em.priorMittel)}</td><td>{L('Streuung', 'spread')} {f2(em.priorSd)}</td></tr>
            <tr><th scope="row">{L('Likelihood', 'Likelihood')}</th><td>{f2(em.datenMittel)}</td><td>{L('Standardfehler', 'standard error')} {f2(em.datenSe)}</td></tr>
            <tr><th scope="row">{L('Posterior', 'Posterior')}</th><td>{f2(em.mittel)}</td><td>{f2(em.lo)} {L('bis', 'to')} {f2(em.hi)}</td></tr>
          {/if}
        </tbody></table></LernlaborTabelle>
      <p class="ll-satz">{ergebnisSatz}</p>
      <p class="ll-lehre">{deutung}</p>

      <details class="auf"><summary>{L('Textfassung des Diagramms (Dichten an elf Stellen)', 'Text version of the chart (densities at eleven points)')}</summary>
        <LernlaborTabelle titel={L('Dichten an elf Stellen', 'Densities at eleven points')}><table class="ll-tabelle"><caption>{L('Dichte von Prior, Likelihood und Posterior an elf Stellen', 'Density of prior, likelihood and posterior at eleven points')}</caption>
          <thead><tr><th scope="col">{z.art === 'anteil' ? L('Anteil', 'Proportion') : L('Mittelwert', 'Mean')}</th><th scope="col">{L('Prior', 'Prior')}</th><th scope="col">{L('Likelihood (skaliert)', 'Likelihood (scaled)')}</th><th scope="col">{L('Posterior', 'Posterior')}</th></tr></thead>
          <tbody>{#each stuetz as s (s.x)}<tr><th scope="row">{lage(s.x)}</th><td>{f3(s.p)}</td><td>{f3(s.l)}</td><td>{f3(s.q)}</td></tr>{/each}</tbody></table></LernlaborTabelle>
      </details>
    {:else}
      <p class="banner" role="alert">{L('Mit diesen Einstellungen lässt sich nichts rechnen.', 'Nothing can be calculated with these settings.')}</p>
    {/if}
  </div>
</div>

<section class="ll-erklaerung" aria-labelledby="ll-bv-erkl">
  <h2 class="ll-h" id="ll-bv-erkl">{L('Was hier passiert', 'What happens here')}</h2>
  <ul>
    <li data-begriff="prior">{L('Prior: Das Vorwissen, bevor die neuen Daten da sind, als Verteilung über den unbekannten Wert. Eine Beta-Verteilung Beta(a, b) verhält sich wie a Treffer und b Nicht-Treffer aus früheren Beobachtungen.', 'Prior: the prior knowledge before the new data, as a distribution over the unknown value. A beta distribution Beta(a, b) behaves like a hits and b misses from earlier observations.')}</li>
    <li data-begriff="likelihood">{L('Likelihood: Wie gut passt jeder mögliche Wert zu den neuen Daten? Sie zeigt allein, was die Daten sagen, und ist keine Wahrscheinlichkeitsverteilung des Werts; sie ist hier nur auf Fläche 1 skaliert, damit sich die Kurven vergleichen lassen.', 'Likelihood: how well does each possible value fit the new data? It shows only what the data say and is not a probability distribution of the value; here it is only scaled to area 1 so that the curves can be compared.')}</li>
    <li data-begriff="posterior">{L('Posterior: Das Wissen nach den Daten, Prior und Likelihood zusammen (Satz von Bayes). Beim Anteil ist es Beta(a + k, b + n − k); beim Mittelwert addieren sich die Genauigkeiten (Kehrwerte der Varianzen) von Vorwissen und Daten.', 'Posterior: the knowledge after the data, prior and likelihood together (Bayes\' theorem). For a proportion it is Beta(a + k, b + n − k); for a mean the precisions (reciprocals of the variances) of prior knowledge and data add up.')}</li>
    <li data-begriff="glaubwuerdigkeitsintervall">{L('Glaubwürdigkeitsintervall: Das 95-%-Intervall umfasst 95 % des Posterior. Unter den Annahmen von Modell und Prior liegt der Wert mit 95 % Wahrscheinlichkeit darin. Ein Konfidenzintervall sagt etwas anderes: Es beschreibt, wie oft das Verfahren bei Wiederholungen den wahren Wert trifft, nicht die Wahrscheinlichkeit des Werts in dieser einen Stichprobe. Das Glaubwürdigkeitsintervall hängt dafür vom Prior ab.', 'Credible interval: the 95% interval contains 95% of the posterior. Under the assumptions of model and prior the value lies in it with 95% probability. A confidence interval says something different: it describes how often the procedure hits the true value in repetitions, not the probability of the value in this one sample. The credible interval depends on the prior instead.')}</li>
  </ul>
  <p class="ll-lehre">{d('Probiere aus: Setze n klein und a, b groß: Das Vorwissen gewinnt. Setze n groß: Die Daten gewinnen, der Prior spielt kaum noch eine Rolle. Mit a = b = 1 ist das Vorwissen „alle Anteile gleich wahrscheinlich“.', 'Probieren Sie aus: n klein und a, b groß: Das Vorwissen gewinnt. n groß: Die Daten gewinnen, der Prior spielt kaum noch eine Rolle. Mit a = b = 1 ist das Vorwissen „alle Anteile gleich wahrscheinlich“.', 'Try it: small n and large a, b: the prior knowledge wins. Large n: the data win and the prior hardly matters. With a = b = 1 the prior knowledge is "all proportions equally likely".')}</p>
</section>

<style>
  .ll-erklaerung { max-width: var(--breite-text); }
  .ll-erklaerung ul { padding-inline-start: 1.2em; display: flex; flex-direction: column; gap: var(--a2); }
  .ll-h2 { font-size: var(--s-klein, .95rem); margin: var(--a3) 0 var(--a1); }
  input[type='range'] { width: 100%; max-width: 360px; accent-color: var(--akzent); }
</style>
