<script module lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /** Bleibt beim Wechsel der Karteireiter erhalten; gehört nicht zum Projekt. */
  const z = $state({ a: '', b: '', pA: '425/2092', pBgA: '316/425', pBgN: '338/1667', N: '2092', beispiel: 'titanic' });
</script>
<script lang="ts">
  import { L, d } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import { baumrechnung } from '../lib/baumrechner';
  import { haeuf, hinweisNichtGanz, leseAnteil, leseGanz, wk } from '../lib/lernlaborsaetze';
  import LernlaborBaum from './LernlaborBaum.svelte';
  import LernlaborTabelle from './LernlaborTabelle.svelte';
  import Icon from './Icon.svelte';

  /** Zweistufiger Baum mit eigenen Begriffen; rechnet sofort bei jeder Eingabe, ohne Zufallszahlen. Die Begriffe stehen nur als Text auf der Seite. */
  const WEITE = 18;
  const BEISPIELE = $derived([
    { id: 'titanic', name: L('Beispiel: Titanic (Erwachsene)', 'Example: Titanic (adults)'), a: L('Frau', 'woman'), b: L('überlebt', 'survived'), pA: '425/2092', pBgA: '316/425', pBgN: '338/1667', N: '2092' },
    { id: 'urne', name: L('Beispiel: Urne ohne Zurücklegen (3 rot, 7 blau)', 'Example: urn without replacement (3 red, 7 blue)'), a: L('1. Kugel rot', '1st ball red'), b: L('2. Kugel rot', '2nd ball red'), pA: '3/10', pBgA: '2/9', pBgN: '3/9', N: '90' },
    { id: 'krankheit', name: L('Beispiel: seltene Krankheit (1 %, 90 %, 9 %)', 'Example: rare disease (1%, 90%, 9%)'), a: L('krank', 'ill'), b: L('positiv', 'positive'), pA: '1', pBgA: '90', pBgN: '9', N: '' },
    { id: 'muenze', name: L('Beispiel: zwei Münzwürfe (unabhängig)', 'Example: two coin tosses (independent)'), a: L('1. Wurf Kopf', '1st toss heads'), b: L('2. Wurf Kopf', '2nd toss heads'), pA: '1/2', pBgA: '1/2', pBgN: '1/2', N: '' }
  ]);
  const gewaehlt = $derived(BEISPIELE.find(x => x.id === z.beispiel));
  const wa = $derived(z.a.trim() || gewaehlt?.a || 'A'), wb = $derived(z.b.trim() || gewaehlt?.b || 'B');
  function nimm(id: string) { const x = BEISPIELE.find(y => y.id === id)!; z.beispiel = id; z.a = ''; z.b = ''; z.pA = x.pA; z.pBgA = x.pBgA; z.pBgN = x.pBgN; z.N = x.N; }

  const pA = $derived(leseAnteil(z.pA)), pBgA = $derived(leseAnteil(z.pBgA)), pBgN = $derived(leseAnteil(z.pBgN));
  const fehler = $derived(!(pA > 0 && pA < 1) ? L('P(A) muss größer als 0 und kleiner als 100 % sein, sonst fehlt ein Ast.', 'P(A) must be above 0 and below 100%, otherwise a branch is missing.')
    : Number.isNaN(pBgA) || Number.isNaN(pBgN) ? L('Die Anteile der zweiten Stufe müssen zwischen 0 und 100 % liegen.', 'The shares of the second stage must be between 0 and 100%.') : '');
  const nEing = $derived(z.N.trim() === '' ? undefined : leseGanz(z.N));
  const nFalsch = $derived(nEing !== undefined && !(nEing >= 1 && nEing <= 1000000000));
  const e = $derived(fehler || nFalsch ? null : baumrechnung(pA, pBgA, pBgN, nEing));
  const f = (x: number) => zahlDe(Number(x.toPrecision(6)));
  const na = $derived(L(`nicht ${wa}`, `not ${wa}`)), nb = $derived(L(`nicht ${wb}`, `not ${wb}`));
  const pfade = $derived(e ? [
    { name: `${wa}, ${wb}`, weg: `${f(e.pA)} · ${f(e.pBgA)}`, p: e.pAB, n: e.v.rp },
    { name: `${wa}, ${nb}`, weg: `${f(e.pA)} · ${f(1 - e.pBgA)}`, p: e.pAN, n: e.v.fn },
    { name: `${na}, ${wb}`, weg: `${f(1 - e.pA)} · ${f(e.pBgN)}`, p: e.pNB, n: e.v.fp },
    { name: `${na}, ${nb}`, weg: `${f(1 - e.pA)} · ${f(1 - e.pBgN)}`, p: e.pNN, n: e.v.rn }
  ] : []);
</script>

<div class="ll-raster">
  <div class="ll-eingaben">
    <h2 class="ll-h">{L('Baumdiagramm mit eigenen Begriffen', 'Tree diagram with your own terms')}</h2>
    <div class="ll-zeile">
      <div class="eingabe"><label for="ll-b-a">{L('Erste Stufe: A', 'First stage: A')}</label><input id="ll-b-a" type="text" maxlength={WEITE} autocomplete="off" placeholder={gewaehlt?.a ?? 'A'} bind:value={z.a} oninput={() => (z.beispiel = '')} style="max-width:20ch"></div>
      <div class="eingabe"><label for="ll-b-b">{L('Zweite Stufe: B', 'Second stage: B')}</label><input id="ll-b-b" type="text" maxlength={WEITE} autocomplete="off" placeholder={gewaehlt?.b ?? 'B'} bind:value={z.b} oninput={() => (z.beispiel = '')} style="max-width:20ch"></div>
    </div>
    <div class="eingabe"><label for="ll-b-pa">{L(`P(A): Wie wahrscheinlich ist „${wa}“? In Prozent`, `P(A): how likely is "${wa}"? In percent`)}</label><input id="ll-b-pa" type="text" inputmode="decimal" bind:value={z.pA} style="max-width:12ch"></div>
    <div class="eingabe"><label for="ll-b-pb"><span aria-hidden="true">P(B | A)</span><span class="nur-vorleser">{L('P von B unter der Bedingung A', 'P of B given A')}</span>{L(`: Wie wahrscheinlich ist „${wb}“, wenn „${wa}“ gilt? In Prozent`, `: how likely is "${wb}" if "${wa}" holds? In percent`)}</label><input id="ll-b-pb" type="text" inputmode="decimal" bind:value={z.pBgA} style="max-width:12ch"></div>
    <div class="eingabe"><label for="ll-b-pn"><span aria-hidden="true">P(B | nicht A)</span><span class="nur-vorleser">{L('P von B unter der Bedingung nicht A', 'P of B given not A')}</span>{L(`: Wie wahrscheinlich ist „${wb}“, wenn „${wa}“ nicht gilt? In Prozent`, `: how likely is "${wb}" if "${wa}" does not hold? In percent`)}</label><input id="ll-b-pn" type="text" inputmode="decimal" bind:value={z.pBgN} style="max-width:12ch"></div>
    <div class="eingabe"><label for="ll-b-n">{L('Bezugsgröße N (leer lassen: so wählen, dass alle Zahlen ganz sind)', 'Reference size N (leave empty: chosen so that all numbers are whole)')}</label><input id="ll-b-n" type="text" inputmode="numeric" bind:value={z.N} style="max-width:12ch">
      <span class="hilfe">{L('Prozentwerte und Brüche gehen, zum Beispiel „1“ für 1 % oder „1/3“ für ein Drittel.', 'Percentages and fractions work, for example "1" for 1% or "1/3" for one third.')}</span></div>
    {#if fehler || nFalsch}<p class="banner" role="alert"><Icon n="hinweis" /><span>{fehler || L('Die Bezugsgröße muss eine ganze Zahl ab 1 sein.', 'The reference size must be a whole number from 1.')}</span></p>{/if}
    <div class="ll-zeile" role="group" aria-label={L('Beispiele', 'Examples')}>{#each BEISPIELE as b (b.id)}<button class="k klein-knopf" type="button" aria-pressed={z.beispiel === b.id} onclick={() => nimm(b.id)}>{b.name}</button>{/each}</div>
    {#if z.beispiel === 'titanic'}<p class="hilfe">{L('Daten: datasets::Titanic (British Board of Trade 1990; Teil von R, Lizenz GPL), 2092 Erwachsene an Bord, davon 425 Frauen; 316 Frauen und 338 Männer überlebten.', 'Data: datasets::Titanic (British Board of Trade 1990; part of R, licence GPL), 2092 adults on board, 425 of them women; 316 women and 338 men survived.')}</p>{/if}
  </div>

  <div class="ll-ergebnis" use:ergebnisAnsage={{ satz: '.ll-satz', anzahl: 2 }}>
    {#if e}
      <h2 class="ll-h">{L('Der Baum', 'The tree')}</h2>
      <figure class="ll-bild"><LernlaborBaum v={e.v} richtung="vor" namen={{ a: wa, b: wb }} /><figcaption>{L(`Erst „${wa}“ oder nicht, dann „${wb}“ oder nicht. In den Kästchen stehen natürliche Häufigkeiten bei ${haeuf(e.v.n)} Fällen, an den Ästen die Wahrscheinlichkeiten.`, `First "${wa}" or not, then "${wb}" or not. The boxes show natural frequencies for ${haeuf(e.v.n)} cases, the branches the probabilities.`)}</figcaption></figure>

      {#if !e.v.ganzzahlig}<p class="banner ruhig"><Icon n="info" /><span>{hinweisNichtGanz()}</span></p>{/if}

      <h2 class="ll-h">{L('Die vier Pfade (Pfadregel)', 'The four paths (path rule)')}</h2>
      <p class="hilfe">{L('Pfadregel: Entlang eines Pfades werden die Wahrscheinlichkeiten multipliziert. Alle vier Pfade zusammen ergeben 1.', 'Path rule: along a path the probabilities are multiplied. All four paths together add up to 1.')}</p>
      <LernlaborTabelle titel={L('Die vier Pfade', 'The four paths')}><table class="ll-tabelle"><caption>{L('Die vier Pfade', 'The four paths')}</caption>
        <thead><tr><th scope="col">{L('Pfad', 'Path')}</th><th scope="col">{L('Rechnung', 'Calculation')}</th><th scope="col">{L('Wahrscheinlichkeit', 'Probability')}</th><th scope="col">{L(`Bei ${haeuf(e.v.n)} Fällen`, `In ${haeuf(e.v.n)} cases`)}</th></tr></thead>
        <tbody>{#each pfade as p (p.name)}<tr><th scope="row">{p.name}</th><td>{p.weg}</td><td>{wk(p.p)}</td><td>{haeuf(p.n)}</td></tr>{/each}</tbody></table></LernlaborTabelle>

      <h2 class="ll-h">{L('Satz der totalen Wahrscheinlichkeit', 'Law of total probability')}</h2>
      <p class="ll-satz">{L(`„${wb}“ kommt über zwei Pfade zustande. Beide zusammen ergeben P(B) = ${wk(e.pB)}.`, `"${wb}" comes about along two paths. Together they give P(B) = ${wk(e.pB)}.`)}</p>
      <div class="ll-rechenweg"><span>P(B) = P(A)·P(B | A) + P(¬A)·P(B | ¬A) = {f(e.pA)}·{f(e.pBgA)} + {f(1 - e.pA)}·{f(e.pBgN)} = {f(e.pB)}</span></div>

      <h2 class="ll-h">{L('Umgekehrt gefragt (Satz von Bayes)', 'Asked the other way round (Bayes\' theorem)')}</h2>
      <figure class="ll-bild"><LernlaborBaum v={e.v} richtung="rueck" namen={{ a: wa, b: wb }} /><figcaption>{L(`Umkehrbaum: dieselben Fälle, aber erst „${wb}“ oder nicht, dann „${wa}“ oder nicht.`, `Reversed tree: the same cases, but first "${wb}" or not, then "${wa}" or not.`)}</figcaption></figure>
      {#if Number.isFinite(e.pAgB)}
        <p class="ll-satz">{L(`Wenn „${wb}“ gilt, gilt „${wa}“ mit P(A | B) = ${wk(e.pAgB)}. Das ist etwas anderes als P(B | A) = ${wk(e.pBgA)}.`, `If "${wb}" holds, "${wa}" holds with P(A | B) = ${wk(e.pAgB)}. That is not the same as P(B | A) = ${wk(e.pBgA)}.`)}</p>
        <div class="ll-rechenweg"><span>P(A | B) = P(A)·P(B | A) / P(B) = {f(e.pAB)} / {f(e.pB)} = {f(e.pAgB)}</span></div>
      {:else}
        <p class="ll-satz">{L(`„${wb}“ tritt hier nie ein. Darum gibt es P(A | B) nicht.`, `"${wb}" never occurs here. So P(A | B) does not exist.`)}</p>
      {/if}

      <h2 class="ll-h">{L('Unabhängig oder nicht?', 'Independent or not?')}</h2>
      <p class="ll-satz">{e.unabhaengig
        ? L(`P(A)·P(B) ist gleich P(A und B). „${wa}“ und „${wb}“ sind stochastisch unabhängig.`, `P(A)·P(B) equals P(A and B). "${wa}" and "${wb}" are stochastically independent.`)
        : L(`P(A)·P(B) = ${f(e.pA * e.pB)}, aber P(A und B) = ${f(e.pAB)}. „${wa}“ und „${wb}“ sind stochastisch abhängig. Das sagt nichts über Ursache und Wirkung.`, `P(A)·P(B) = ${f(e.pA * e.pB)}, but P(A and B) = ${f(e.pAB)}. "${wa}" and "${wb}" are stochastically dependent. That says nothing about cause and effect.`)}</p>
    {:else if !fehler && !nFalsch}
      <p class="ll-lehre">{d('Gib die drei Anteile ein.', 'Geben Sie die drei Anteile ein.', 'Enter the three shares.')}</p>
    {/if}
  </div>
</div>
