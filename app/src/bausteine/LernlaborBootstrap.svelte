<script module lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { BootstrapErgebnis } from '../lib/lernlabor';
  import { Simulation } from '../lib/lernlaborlauf.svelte';
  const z = $state({ text: '12 15 9 20 14 11 18 13 16 10', B: 10000, niveau: 0.95, letzter: -1 });
  let erg = $state.raw<null | BootstrapErgebnis>(null);
  const sim = new Simulation();
</script>
<script lang="ts">
  import { untrack } from 'svelte';
  import { L, d } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import { proz } from '../i18n/profil';
  import { verzoegert } from '../lib/laedt.svelte';
  import { BOOTSTRAP_MAX, bootstrapLauf, histogramm } from '../lib/lernlabor';
  import { fehlerReihe, g4, hinweisKleinBootstrap, lehreBootstrap, leseReihe, reiheHinweisMax, satzBootstrap, satzBootstrapT } from '../lib/lernlaborsaetze';
  import LernlaborHistogramm from './LernlaborHistogramm.svelte';
  import Rechnet from './Rechnet.svelte';
  import LernlaborTabelle from './LernlaborTabelle.svelte';
  import Icon from './Icon.svelte';

  let { startwert, anstoss }: { startwert: number; anstoss: number } = $props();
  const anim = verzoegert(() => sim.laeuft);
  const reihe = $derived(leseReihe(z.text));
  const fehler = $derived(fehlerReihe(reihe, 2, BOOTSTRAP_MAX, 'reihe'));
  const BEISPIELE = [{ name: L('Beispiel: 10 Werte', 'Example: 10 values'), text: '12 15 9 20 14 11 18 13 16 10' }, { name: L('Beispiel: 8 Werte (wenige)', 'Example: 8 values (few)'), text: '4,1 5,2 3,9 6,8 5 4,4 7,7 5,9' }];

  async function simuliere() {
    if (fehler) return;
    const e = await sim.starte(bootstrapLauf({ daten: reihe.werte, B: z.B, niveau: z.niveau, startwert }));
    if (e) erg = e;
  }
  $effect(() => { const a = anstoss; untrack(() => { if (z.letzter !== a || !erg) { z.letzter = a; void simuliere(); } }); });
  const hist = $derived(erg ? histogramm(erg.werte) : null);
</script>

<div class="ll-raster">
  <div class="ll-eingaben">
    <h2 class="ll-h">{d('Deine Werte', 'Ihre Werte', 'Your values')}</h2>
    <div class="eingabe"><label for="ll-bs-text">{L('Werte (2 bis 200, mit Leerzeichen getrennt)', 'Values (2 to 200, separated by spaces)')}</label>
      <textarea id="ll-bs-text" class="ll-reihe" rows="4" bind:value={z.text} aria-invalid={fehler ? 'true' : undefined} aria-describedby="ll-bs-h" spellcheck="false"></textarea>
      <span class="hilfe" id="ll-bs-h">{fehler || `${reiheHinweisMax()} ${L(`Es sind ${reihe.werte.length}. Das Dezimalzeichen ist das Komma.`, `There are ${reihe.werte.length}. The decimal mark is the comma.`)}`}</span></div>
    <div class="ll-zeile" role="group" aria-label={L('Beispiele', 'Examples')}>{#each BEISPIELE as b}<button class="k klein-knopf" type="button" onclick={() => (z.text = b.text)}>{b.name}</button>{/each}</div>
    <div class="ll-zeile">
      <div class="eingabe"><label for="ll-bs-B">{L('Ziehungen', 'Draws')}</label><select id="ll-bs-B" bind:value={z.B}>{#each [1000, 5000, 10000] as v}<option value={v}>{zahlDe(v)}</option>{/each}</select></div>
      <div class="eingabe"><label for="ll-bs-n">{L('Niveau', 'Level')}</label><select id="ll-bs-n" bind:value={z.niveau}>{#each [0.9, 0.95, 0.99] as v}<option data-begriff="vertrauensniveau" value={v}>{proz(zahlDe(v * 100, 0))}</option>{/each}</select></div>
    </div>
    <button class="k haupt gross" type="button" onclick={simuliere} disabled={!!fehler || undefined}>{L('Bootstrap rechnen', 'Run bootstrap')}</button>
    <p class="hilfe">{d('Bootstrap: aus deinen Werten wird immer wieder neu gezogen, mit Zurücklegen und genauso viele Werte, wie du hast. Jedes Mal wird der Mittelwert notiert.', 'Bootstrap: aus Ihren Werten wird immer wieder neu gezogen, mit Zurücklegen und genauso viele Werte, wie Sie haben. Jedes Mal wird der Mittelwert notiert.', 'Bootstrap: new samples are drawn from your values again and again, with replacement and as many values as you have. Each time the mean is noted.')}</p>
  </div>

  <div class="ll-ergebnis" use:ergebnisAnsage={{ satz: '.ll-satz', anzahl: 1 }}>
    {#if anim.an}<div class="ll-rechnet"><Rechnet text={L('Der Bootstrap läuft …', 'The bootstrap is running …')} /><progress max="1" value={sim.anteil} aria-label={L('Fortschritt', 'Progress')}></progress></div>{/if}
    {#if erg && hist}
      {@const e = erg}
      <h2 class="ll-h">{L('Bootstrap-Mittelwerte', 'Bootstrap means')}</h2>
      <figure class="ll-bild"><LernlaborHistogramm h={hist} n={e.B}
        linien={[{ x: e.mittel, text: `${L('Mittelwert', 'Mean')} ${g4(e.mittel)}`, stil: 'strich', farbe: 'tinte' }]}
        bereich={{ von: e.lo, bis: e.hi, text: `${proz(zahlDe(e.niveau * 100, 0))}: ${g4(e.lo)} - ${g4(e.hi)}` }}
        xText={L('Mittelwert einer Bootstrap-Stichprobe', 'Mean of a bootstrap sample')} yText={L('Anzahl Ziehungen', 'Number of draws')}
        titel={L(`Verteilung von ${e.B} Bootstrap-Mittelwerten`, `Distribution of ${e.B} bootstrap means`)}
        beschreibung={L(`${e.B} Bootstrap-Mittelwerte aus ${e.n} Werten, Startwert ${e.startwert}. Perzentil-Intervall von ${g4(e.lo)} bis ${g4(e.hi)}, Standardfehler ${g4(e.se)}.`, `${e.B} bootstrap means from ${e.n} values, seed ${e.startwert}. Percentile interval from ${g4(e.lo)} to ${g4(e.hi)}, standard error ${g4(e.se)}.`)} />
        <figcaption>{L('Säulen: die Bootstrap-Mittelwerte. Gestrichelt: der Mittelwert der Werte. Dicke Klammer unten: das Perzentil-Intervall (mittlere Bootstrap-Mittelwerte).', 'Bars: the bootstrap means. Dashed: the mean of the values. Thick bracket at the bottom: the percentile interval (middle bootstrap means).')}</figcaption></figure>
      <LernlaborTabelle titel={L('Zwei Intervalle im Vergleich', 'Two intervals compared')}><table class="ll-tabelle"><caption>{L('Zwei Intervalle im Vergleich', 'Two intervals compared')}</caption>
        <thead><tr><th scope="col">{L('Verfahren', 'Method')}</th><th scope="col">{L('von', 'from')}</th><th scope="col">{L('bis', 'to')}</th></tr></thead>
        <tbody>
          <tr><th scope="row">{L('Bootstrap (Perzentil)', 'Bootstrap (percentile)')}</th><td>{g4(e.lo)}</td><td>{g4(e.hi)}</td></tr>
          <tr><th scope="row">{L('t-Intervall', 't interval')}</th><td>{g4(e.tLo)}</td><td>{g4(e.tHi)}</td></tr>
        </tbody></table></LernlaborTabelle>
      <p class="ll-satz" data-startwert={e.startwert}>{satzBootstrap(e)} {satzBootstrapT(e)}</p>
      {#if e.hinweisKlein}<p class="banner"><Icon n="hinweis" /><span>{hinweisKleinBootstrap()}</span></p>{/if}
      <p class="ll-lehre">{lehreBootstrap()}</p>
    {:else if !anim.an}
      <p class="ll-lehre">{d('Tippe deine Werte ein und starte den Bootstrap.', 'Tippen Sie Ihre Werte ein und starten Sie den Bootstrap.', 'Type in your values and start the bootstrap.')}</p>
    {/if}
  </div>
</div>
