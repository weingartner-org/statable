<script module lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  const z = $state({ modus: 'rate' as 'rate' | 'haeufig', pi: '1', se: '90', sp: '91', N: '', rp: '8', fp: '95', fn: '2', rn: '895' });
</script>
<script lang="ts">
  import { L, d } from '../lib/sitzung.svelte';
  import { vierfeldertafel, unabhaengig } from '../lib/lernlabor';
  import { fehlerHaeufig, fehlerRate, haeuf, hinweisNichtGanz, hinweisRundung, lehreBayes, leseAnteil, leseGanz, prozent, rechenwegBayes, saetzeBayes, satzUnabhaengig, sechs, wk } from '../lib/lernlaborsaetze';
  import LernlaborBaum from './LernlaborBaum.svelte';
  import LernlaborTabelle from './LernlaborTabelle.svelte';
  import Icon from './Icon.svelte';

  /** Hier gibt es keine Zufallszahlen: reine Rechnung, deshalb rechnet die Seite sofort bei jeder Eingabe und braucht keinen Startwert. */
  const pi = $derived(leseAnteil(z.pi)), se = $derived(leseAnteil(z.se)), sp = $derived(leseAnteil(z.sp));
  const nEing = $derived(z.N.trim() === '' ? undefined : leseGanz(z.N));
  const zahlen = $derived([z.rp, z.fp, z.fn, z.rn].map(leseGanz));
  const fehler = $derived(z.modus === 'rate' ? fehlerRate(pi, se, sp, nEing) : fehlerHaeufig(zahlen));
  const v = $derived(fehler ? null : z.modus === 'rate' ? vierfeldertafel({ modus: 'rate', praevalenz: pi, se, sp, ...(nEing === undefined ? {} : { N: nEing }) }) : vierfeldertafel({ modus: 'haeufig', rp: zahlen[0]!, fp: zahlen[1]!, fn: zahlen[2]!, rn: zahlen[3]! }));
  const unab = $derived(v ? unabhaengig(v.krank / v.n, v.positiv / v.n, v.rp / v.n) : null);

  const BEISPIELE = [
    { name: L('Beispiel: seltene Krankheit (1 %, 90 %, 91 %)', 'Example: rare disease (1%, 90%, 91%)'), mach: () => { z.modus = 'rate'; z.pi = '1'; z.se = '90'; z.sp = '91'; z.N = ''; } },
    { name: L('Beispiel: Mammographie (1 %, 80 %, 90,4 %)', 'Example: mammography (1%, 80%, 90.4%)'), mach: () => { z.modus = 'rate'; z.pi = '1'; z.se = '80'; z.sp = '90,4'; z.N = ''; } },
    { name: L('Beispiel: häufige Krankheit (30 %, 80 %, 80 %)', 'Example: common disease (30%, 80%, 80%)'), mach: () => { z.modus = 'rate'; z.pi = '30'; z.se = '80'; z.sp = '80'; z.N = ''; } },
    { name: L('Beispiel: vier Häufigkeiten', 'Example: four frequencies'), mach: () => { z.modus = 'haeufig'; z.rp = '8'; z.fp = '95'; z.fn = '2'; z.rn = '895'; } }
  ];
</script>

<div class="ll-raster">
  <div class="ll-eingaben">
    <h2 class="ll-h">{L('Test und Krankheit', 'Test and disease')}</h2>
    <div class="eingabe"><span class="lbl" id="ll-vf-m-l">{L('Was ist bekannt?', 'What is known?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="ll-vf-m-l">
        <label data-begriff="anteil"><input type="radio" name="ll-vf-m" value="rate" bind:group={z.modus}>{L('Anteile', 'Rates')}</label>
        <label data-begriff="absolute-haeufigkeit"><input type="radio" name="ll-vf-m" value="haeufig" bind:group={z.modus}>{L('Vier Häufigkeiten', 'Four frequencies')}</label></div></div>
    {#if z.modus === 'rate'}
      <div class="eingabe"><label for="ll-vf-pi">{L('Prävalenz π: Anteil der Kranken, in Prozent', 'Prevalence π: share of ill people, in percent')}</label><input id="ll-vf-pi" type="text" inputmode="decimal" bind:value={z.pi} aria-invalid={Number.isNaN(pi) ? 'true' : undefined} aria-describedby={(Number.isNaN(pi)) ? 'll-vf-fehler' : undefined} style="max-width:10ch"></div>
      <div class="eingabe"><label for="ll-vf-se">{L('Sensitivität Se: Anteil der Kranken, die positiv testen, in Prozent', 'Sensitivity Se: share of ill people who test positive, in percent')}</label><input id="ll-vf-se" type="text" inputmode="decimal" bind:value={z.se} aria-invalid={Number.isNaN(se) ? 'true' : undefined} aria-describedby={(Number.isNaN(se)) ? 'll-vf-fehler' : undefined} style="max-width:10ch"></div>
      <div class="eingabe"><label for="ll-vf-sp">{L('Spezifität Sp: Anteil der Gesunden, die negativ testen, in Prozent', 'Specificity Sp: share of healthy people who test negative, in percent')}</label><input id="ll-vf-sp" type="text" inputmode="decimal" bind:value={z.sp} aria-invalid={Number.isNaN(sp) ? 'true' : undefined} aria-describedby={(Number.isNaN(sp)) ? 'll-vf-fehler' : undefined} style="max-width:10ch"></div>
      <div class="eingabe"><label for="ll-vf-n">{L('Bezugsgröße N (leer lassen: so wählen, dass alle Zahlen ganz sind)', 'Reference size N (leave empty: chosen so that all numbers are whole)')}</label><input id="ll-vf-n" type="text" inputmode="numeric" bind:value={z.N} placeholder={L('automatisch', 'automatic')} aria-invalid={nEing !== undefined && Number.isNaN(nEing) ? 'true' : undefined} aria-describedby={(nEing !== undefined && Number.isNaN(nEing)) ? 'll-vf-fehler' : undefined} style="max-width:14ch">
        <span class="hilfe">{L('Prozentwerte und Brüche gehen, zum Beispiel „1“ für 1 % oder „1/3“ für ein Drittel.', 'Percentages and fractions work, for example "1" for 1% or "1/3" for one third.')}</span></div>
    {:else}
      <div class="ll-zeile">
        <div class="eingabe"><label for="ll-vf-rp">{L('Krank, positiv', 'Ill, positive')}</label><input id="ll-vf-rp" type="text" inputmode="numeric" bind:value={z.rp} style="max-width:9ch"></div>
        <div class="eingabe"><label for="ll-vf-fp">{L('Gesund, positiv', 'Healthy, positive')}</label><input id="ll-vf-fp" type="text" inputmode="numeric" bind:value={z.fp} style="max-width:9ch"></div>
        <div class="eingabe"><label for="ll-vf-fn">{L('Krank, negativ', 'Ill, negative')}</label><input id="ll-vf-fn" type="text" inputmode="numeric" bind:value={z.fn} style="max-width:9ch"></div>
        <div class="eingabe"><label for="ll-vf-rn">{L('Gesund, negativ', 'Healthy, negative')}</label><input id="ll-vf-rn" type="text" inputmode="numeric" bind:value={z.rn} style="max-width:9ch"></div>
      </div>
    {/if}
    {#if fehler}<p class="banner" role="alert" id="ll-vf-fehler"><Icon n="hinweis" /><span>{fehler}</span></p>{/if}
    <div class="ll-zeile" role="group" aria-label={L('Beispiele', 'Examples')}>{#each BEISPIELE as b}<button class="k klein-knopf" type="button" onclick={b.mach}>{b.name}</button>{/each}</div>
  </div>

  <div class="ll-ergebnis" use:ergebnisAnsage={{ satz: '.ll-satz', anzahl: 1 }}>
    {#if v}
      <h2 class="ll-h">{L('Vierfeldertafel', 'Four-field table')}</h2>
      <LernlaborTabelle titel={L(`Natürliche Häufigkeiten bei ${haeuf(v.n)} Personen (kleiner: Anteil an allen)`, `Natural frequencies for ${haeuf(v.n)} people (smaller: share of all)`)}><table class="ll-tabelle"><caption>{L(`Natürliche Häufigkeiten bei ${haeuf(v.n)} Personen (kleiner: Anteil an allen)`, `Natural frequencies for ${haeuf(v.n)} people (smaller: share of all)`)}</caption>
        <thead><tr><td></td><th scope="col">{L('positiv', 'positive')}</th><th scope="col">{L('negativ', 'negative')}</th><th scope="col">{L('Summe', 'Total')}</th></tr></thead>
        <tbody>
          <tr><th scope="row">{L('krank', 'ill')}</th><td>{haeuf(v.rp)}<br><small>{prozent(v.rp / v.n)}</small></td><td>{haeuf(v.fn)}<br><small>{prozent(v.fn / v.n)}</small></td><td>{haeuf(v.krank)}<br><small>{prozent(v.krank / v.n)}</small></td></tr>
          <tr><th scope="row">{L('gesund', 'healthy')}</th><td>{haeuf(v.fp)}<br><small>{prozent(v.fp / v.n)}</small></td><td>{haeuf(v.rn)}<br><small>{prozent(v.rn / v.n)}</small></td><td>{haeuf(v.gesund)}<br><small>{prozent(v.gesund / v.n)}</small></td></tr>
          <tr><th scope="row">{L('Summe', 'Total')}</th><td>{haeuf(v.positiv)}<br><small>{prozent(v.positiv / v.n)}</small></td><td>{haeuf(v.negativ)}<br><small>{prozent(v.negativ / v.n)}</small></td><td>{haeuf(v.n)}<br><small>{prozent(1)}</small></td></tr>
        </tbody></table></LernlaborTabelle>
      {#if z.modus === 'rate' && nEing === undefined}
        {#if v.ganzzahlig}<p class="hilfe">{L(`Bezugsgröße: N = ${haeuf(v.N)}, die kleinste Zehnerpotenz ab 1 000, bei der alle vier Zahlen ganz sind.`, `Reference size: N = ${haeuf(v.N)}, the smallest power of ten from 1,000 up for which all four numbers are whole.`)}</p>
        {:else}<p class="hilfe">{L(`Bis N = 1 000 000 werden nicht alle Zahlen ganz; deshalb ist N = ${haeuf(v.N)} gewählt und die Zahlen haben Nachkommastellen.`, `Up to N = 1,000,000 not all numbers become whole; therefore N = ${haeuf(v.N)} is used and the numbers have decimals.`)}</p>{/if}
      {/if}
      {#if !v.ganzzahlig}<p class="banner ruhig"><Icon n="info" /><span>{hinweisNichtGanz()}</span></p>{/if}

      <LernlaborTabelle titel={L('Kennzahlen des Tests', 'Test characteristics')}><table class="ll-tabelle"><caption>{L('Kennzahlen des Tests', 'Test characteristics')}</caption>
        <thead><tr><th scope="col">{L('Kennzahl', 'Measure')}</th><th scope="col">{L('Wert', 'Value')}</th></tr></thead>
        <tbody>
          <tr><th scope="row">{L('Prävalenz π', 'Prevalence π')}</th><td>{wk(v.praevalenz)}</td></tr>
          <tr><th scope="row">{L('Sensitivität Se', 'Sensitivity Se')}</th><td>{wk(v.se)}</td></tr>
          <tr><th scope="row">{L('Spezifität Sp', 'Specificity Sp')}</th><td>{wk(v.sp)}</td></tr>
          <tr><th scope="row">{L('Positiver Vorhersagewert (PPV): P(krank | positiv)', 'Positive predictive value (PPV): P(ill | positive)')}</th><td><b>{wk(v.ppv)}</b></td></tr>
          <tr><th scope="row">{L('Negativer Vorhersagewert (NPV): P(gesund | negativ)', 'Negative predictive value (NPV): P(healthy | negative)')}</th><td><b>{wk(v.npv)}</b></td></tr>
        </tbody></table></LernlaborTabelle>

      <div class="ll-satz">{#each saetzeBayes(v) as satz}<p>{satz}</p>{/each}</div>

      <h2 class="ll-h">{L('Der Baum', 'The tree')}</h2>
      <figure class="ll-bild"><LernlaborBaum {v} richtung="vor" /><figcaption>{L('Vorwärts: erst krank oder gesund, dann das Testergebnis. An den Ästen stehen die Wahrscheinlichkeiten.', 'Forward: first ill or healthy, then the test result. The branches show the probabilities.')}</figcaption></figure>
      <figure class="ll-bild"><LernlaborBaum {v} richtung="rueck" /><figcaption>{L('Umkehrbaum: erst das Testergebnis, dann krank oder gesund. Hier lesen wir die Vorhersagewerte ab.', 'Reversed tree: first the test result, then ill or healthy. This is where we read off the predictive values.')}</figcaption></figure>

      <h2 class="ll-h">{L('Rechenweg mit der Bayes-Formel', 'Calculation with the Bayes formula')}</h2>
      <div class="ll-rechenweg">{#each rechenwegBayes(v) as zeile}<span>{zeile}</span>{/each}</div>
      <p class="ll-lehre">{lehreBayes()}</p>

      <h2 class="ll-h">{L('Unabhängig oder nicht?', 'Independent or not?')}</h2>
      {#if unab}
        <LernlaborTabelle titel={L('P(krank und positiv) gegen P(krank) mal P(positiv)', 'P(ill and positive) versus P(ill) times P(positive)')}><table class="ll-tabelle"><caption>{L('P(krank und positiv) gegen P(krank) mal P(positiv)', 'P(ill and positive) versus P(ill) times P(positive)')}</caption>
          <thead><tr><th scope="col">{L('Größe', 'Quantity')}</th><th scope="col">{L('Wert', 'Value')}</th></tr></thead>
          <tbody>
            <tr><th scope="row">P({L('krank', 'ill')})</th><td>{sechs(v.krank / v.n)}</td></tr>
            <tr><th scope="row">P({L('positiv', 'positive')})</th><td>{sechs(v.positiv / v.n)}</td></tr>
            <tr><th scope="row">P({L('krank', 'ill')}) · P({L('positiv', 'positive')})</th><td>{sechs(unab.produkt)}</td></tr>
            <tr><th scope="row">P({L('krank', 'ill')} {L('und', 'and')} {L('positiv', 'positive')})</th><td>{sechs(v.rp / v.n)}</td></tr>
          </tbody></table></LernlaborTabelle>
        <p class="ll-satz">{satzUnabhaengig(v.krank / v.n, v.positiv / v.n, v.rp / v.n, unab.gleich)}</p>
        <p class="hilfe">{hinweisRundung()}</p>
      {/if}
    {:else if !fehler}
      <p class="ll-lehre">{d('Gib Prävalenz, Sensitivität und Spezifität ein.', 'Geben Sie Prävalenz, Sensitivität und Spezifität ein.', 'Enter prevalence, sensitivity and specificity.')}</p>
    {/if}
  </div>
</div>
