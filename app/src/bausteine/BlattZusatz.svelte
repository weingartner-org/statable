<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { L, d, type Blatt } from '../lib/sitzung.svelte';
  import { saetzeTost, saetzeRci } from '../lib/aequisaetze';
  import { reliabilitaetAusText, type TostAnzeige, type RciAnzeige } from '../lib/aequirci';
  import HilfeLink from './HilfeLink.svelte';

  /** Ergebnisse der „Weiteren Wege“ unter dem Ergebnis von „Unterscheiden sich Gruppen?“ (zwei Gruppen) und „Hat sich etwas verändert?“: Äquivalenztest (TOST, G15) und
   *  Reliable Change Index (G16). Die Wahl (Grenze Δ, Reliabilität, Richtung) steht in `blatt.zus` und wird in der Frage gesetzt - die Grenze nach dem Rechnen zu ändern, soll nicht
   *  bequem sein. Die Tabellen (auch je Person) stehen unter „Für deine Arbeit“ und im Bericht (berichtTabellen). */
  /** `einstellen`: springt in Schritt 1 zum Kästchen des Äquivalenztests bzw. des RCI (fehlt, wenn die Frage auf diesem Blatt nicht zu ändern ist: dann steht der Weg als Satz da). */
  let { blatt, tost, rci, name, paired, einstellen }: { blatt: Blatt; tost?: TostAnzeige; rci?: RciAnzeige; name: (n: string) => string; paired: boolean; einstellen?: (ziel: 'tost' | 'rci') => void } = $props();
  const kennung = $props.id();
  const tostAn = $derived(!!blatt.zus?.tost.an), rciAn = $derived(!!blatt.zus?.rci.an);
  const st = $derived(tost ? saetzeTost(tost, name) : null);
  const sr = $derived(rci ? saetzeRci(rci, name) : null);
  /** Fehlt für den RCI eine Pflichtangabe? Dann steht das im Ergebnis, nicht nur in der Prüfliste (Fachprüfung Paket D). */
  const rciFehlt = $derived.by(() => {
    const z = blatt.zus?.rci; if (!z) return '';
    if (!z.richtung) return 'richtung';
    if (z.quelle === 'retest' ? reliabilitaetAusText(z.r) === null : !z.skala) return 'reliabilitaet';
    return '';
  });
</script>

{#if tostAn}
  <div class="zusatz-ergebnis" role="group" aria-labelledby="tost-t-{kennung}" style="margin-top:var(--a4)">
    <h3 id="tost-t-{kennung}" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Äquivalenztest (TOST)', 'Equivalence test (TOST)')}</h3>
    {#if st}
      <p class="ergebnis-satz">{st.haupt}</p>
      {#each st.zusatz.split('\n') as ab, i (i)}<p class="heft-text" style="margin-top:var(--a2)">{ab}</p>{/each}
      <p class="heft-text" style="margin-top:var(--a2)">{st.vorsicht}</p>
      <p class="heft-text" style="margin-top:var(--a2)"><HilfeLink id="aequivalenztest-tost" text={L('Hilfe: Äquivalenztest lesen', 'Help: reading the equivalence test')} /></p>
    {:else}
      <p class="heft-text" use:ergebnisAnsage>{L('Der Äquivalenztest lässt sich mit diesen Daten oder dieser Grenze nicht rechnen (zu wenige Werte, keine Streuung oder Δ nicht größer als 0).', 'The equivalence test cannot be calculated with these data or this bound (too few values, no spread, or Δ not greater than 0).')}</p>
    {/if}
  </div>
{/if}
{#if rciAn}
  <div class="zusatz-ergebnis" role="group" aria-labelledby="rci-t-{kennung}" style="margin-top:var(--a4)">
    <h3 id="rci-t-{kennung}" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Verlässliche Veränderung je Person (Reliable Change Index)', 'Reliable change for each person (Reliable Change Index)')}</h3>
    {#if sr}
      <p class="ergebnis-satz">{sr.haupt}</p>
      {#each sr.zusatz.split('\n') as ab, i (i)}<p class="heft-text" style="margin-top:var(--a2)">{ab}</p>{/each}
      <p class="heft-text" style="margin-top:var(--a2)">{sr.vorsicht}</p>
      <p class="heft-text" style="margin-top:var(--a2)">{d('Die Tabelle mit dem RCI jeder Person steht unter „Für deine Arbeit“.', 'Die Tabelle mit dem RCI jeder Person steht unter „Für Ihre Arbeit“.', 'The table with the RCI of each person is under "For your paper".')} <HilfeLink id="reliable-change-index" text={L('Hilfe: Reliable Change Index lesen', 'Help: reading the Reliable Change Index')} /></p>
    {:else if rciFehlt === 'richtung'}
      <p class="heft-text" use:ergebnisAnsage>{L('Für den RCI fehlt die Angabe, ob hohe Werte besser sind.', 'For the RCI the entry is missing whether high values are better.')} {L('Eingabe unter „Spalten und Optionen ändern“, „Weitere Wege“.', 'Enter it under "Change columns and options", "More options".')}</p>
    {:else if rciFehlt === 'reliabilitaet'}
      <p class="heft-text" use:ergebnisAnsage>{L('Für den RCI fehlt die Reliabilität (eine Zahl von 0 bis unter 1 oder die Skala für Cronbachs Alpha).', "For the RCI the reliability is missing (a number from 0 to below 1, or the scale for Cronbach's alpha).")} {L('Eingabe unter „Spalten und Optionen ändern“, „Weitere Wege“.', 'Enter it under "Change columns and options", "More options".')}</p>
    {:else}
      <p class="heft-text" use:ergebnisAnsage>{L('Der Reliable Change Index lässt sich mit diesen Daten oder dieser Reliabilität nicht rechnen (zu wenige Personen, keine Streuung der Vorher-Werte oder Reliabilität außerhalb von 0 bis unter 1).', 'The Reliable Change Index cannot be calculated with these data or this reliability (too few people, no spread in the before values, or a reliability outside 0 to below 1).')}</p>
    {/if}
  </div>
{/if}
{#if !tostAn && !rciAn}
  {#if einstellen}
    <ul class="zusatz-wege" style="margin-top:var(--a3)">
      <li><span>{L('Sind die Gruppen gleichwertig? (Äquivalenztest)', 'Are the groups equivalent? (equivalence test)')}</span> <button class="k leise" type="button" onclick={() => einstellen('tost')}>{L('Einstellen', 'Set up')}</button></li>
      {#if paired}<li><span>{L('Hat sich eine einzelne Person verändert? (Reliable Change Index)', 'Has a single person changed? (Reliable Change Index)')}</span> <button class="k leise" type="button" onclick={() => einstellen('rci')}>{L('Einstellen', 'Set up')}</button></li>{/if}
    </ul>
  {:else}
  <p class="heft-text" style="margin-top:var(--a3);color:var(--tinte-2)">{paired ? L('Weitere Wege: Auf Gleichwertigkeit prüfen (Äquivalenztest) und die verlässliche Veränderung je Person (Reliable Change Index) stehen unter „Spalten und Optionen ändern“, „Weitere Wege“.', 'More options: testing for equivalence (equivalence test) and reliable change for each person (Reliable Change Index) are under "Change columns and options", "More options".') : L('Weitere Wege: Auf Gleichwertigkeit prüfen (Äquivalenztest) steht unter „Spalten und Optionen ändern“, „Weitere Wege“.', 'More options: testing for equivalence (equivalence test) is under "Change columns and options", "More options".')}</p>
  {/if}
{/if}

<style>
  .zusatz-wege { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--a2); }
  .zusatz-wege li { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a3); align-items: baseline; }
</style>
