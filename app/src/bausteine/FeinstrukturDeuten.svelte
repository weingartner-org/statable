<script lang="ts">
  /**
   * Feinstruktur-Arbeitsplatz, Phase Deuten (F3B1): Sinneinheit für Sinneinheit. Nicht vorauslesen (Architekturblatt 2.3):
   * Solange nicht alle Einheiten gedeutet sind (und das Vorauslesen nicht erlaubt ist), steht kein Zeichen nach dem Ende der aktuellen Einheit im DOM.
   * Alles aus dem Ausschnitt kommt hier aus `einheitSichtbar` / `sichtbar` (lib/feinstruktur-analyse.ts); die Wortliste und das Textfeld gibt es in dieser Phase nicht.
   */
  import { onMount, tick } from 'svelte';
  import { L, s } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter, NACH_FOKUS_MS } from '../lib/ansage';
  import { aendereSequenzanalyse, qualProjekt } from '../lib/interviews.svelte';
  import type { Sequenzanalyse } from '../lib/qualprojekt';
  import { abweichungSatz, alleGedeutet, einheitFertig, einheitSichtbar, folgetextVerdeckt, nochEinheiten, zumEinteilen } from '../lib/feinstruktur-analyse';
  import FeinstrukturKarte from './FeinstrukturKarte.svelte';
  import FeinstrukturLesartenPruefen from './FeinstrukturLesartenPruefen.svelte';
  import FeinstrukturReflexion from './FeinstrukturReflexion.svelte';
  import FeinstrukturUebersicht from './FeinstrukturUebersicht.svelte';
  import FeinstrukturFazit from './FeinstrukturFazit.svelte';
  import FeinstrukturWord from './FeinstrukturWord.svelte';
  import { fuellwortAngebot, reflexionsStellen, uebernimmDeutung } from '../lib/feinstruktur-pruefen';

  let { sa }: { sa: Sequenzanalyse } = $props();

  const sprache = (): 'de' | 'en' => (s.einst.sprache === 'de' ? 'de' : 'en');
  const n = $derived(sa.einheiten.length);
  const i = $derived(sa.aktuelleEinheit);
  const alle = $derived(alleGedeutet(sa));
  const noch = $derived(nochEinheiten(sa));
  const dok = $derived(qualProjekt()?.dokumente.find(x => x.id === sa.dokument));
  const abweichung = $derived(abweichungSatz(sa, dok, sprache()));
  let ueberschrift: HTMLHeadingElement | undefined = $state();
  let zurueckFrage = $state(false);
  let zurueckEl: HTMLElement | undefined = $state();

  const nochSatz = $derived(noch <= 0 ? L('Das ist die letzte Sinneinheit.', 'This is the last unit.') : noch === 1 ? L('Noch 1 Sinneinheit.', 'One unit to go.') : L(`Noch ${noch} Sinneinheiten.`, `${noch} units to go.`));

  onMount(() => { void tick().then(() => ueberschrift?.focus()); sageSpaeter(alle ? L('Alle Sinneinheiten gedeutet.', 'All units interpreted.') : L(`Phase Deuten. Sinneinheit ${i + 1} von ${n}.`, `Interpreting phase. Unit ${i + 1} of ${n}.`), NACH_FOKUS_MS); });

  async function weiter() {
    aendereSequenzanalyse(sa.id, x => einheitFertig(x, Date.now()));
    await tick(); ueberschrift?.focus();
    // `sa` ist hier schon die neue Fassung (Eigenschaft folgt dem Projekt)
    sageSpaeter(alleGedeutet(sa) ? L('Alle Sinneinheiten gedeutet.', 'All units interpreted.') : nochSatz, NACH_FOKUS_MS);
  }
  function zurueck() {
    if (sa.einheiten.some(e => e.gedeutet) && !zurueckFrage) {
      zurueckFrage = true; sage(L('Zurück zum Einteilen? Deutungen bleiben erhalten, aber der ganze Ausschnitt wird wieder sichtbar.', 'Back to dividing? Interpretations are kept, but the whole excerpt becomes visible again.'));
      void tick().then(() => zurueckEl?.querySelector<HTMLElement>('button.nein')?.focus()); return;
    }
    aendereSequenzanalyse(sa.id, x => zumEinteilen(x, Date.now()));
  }
  const fuell = $derived(alle ? undefined : fuellwortAngebot(sa, i));
  const reflexion = $derived(alle || i === 0 || !reflexionsStellen(sa).includes(i - 1) ? undefined : i - 1);
  let weiterEl: HTMLButtonElement | undefined = $state();
  function uebernehmen(k: number) {
    aendereSequenzanalyse(sa.id, x => uebernimmDeutung(x, i, k, Date.now()));
    sage(L(`Deutung von Sinneinheit ${k + 1} übernommen. Sie können sie hier ändern.`, `Interpretation of unit ${k + 1} taken over. You can change it here.`));
  }
  /* Gruppenmodus an einem Gerät (F3c): große Schrift, nur die aktuelle Sinneinheit, Name der Person freiwillig. Nicht vorauslesen gilt weiter. */
  let gruppenmodus = $state(false);
  let person = $state('');
  function schalteGruppenmodus() {
    gruppenmodus = !gruppenmodus;
    sage(gruppenmodus ? L('Gruppenmodus an: große Schrift, nur die aktuelle Sinneinheit.', 'Group mode on: large text, only the current unit.') : L('Gruppenmodus aus.', 'Group mode off.'));
  }
  const bisherige = $derived(sa.einheiten.map((_, k) => k).filter(k => k <= i));
</script>

<div class="fe" class:gross={gruppenmodus && !alle}>
  <h2 id="fe-deu-h" tabindex="-1" bind:this={ueberschrift}>{alle ? L('Alle Sinneinheiten gedeutet', 'All units interpreted') : L(`Deuten: Sinneinheit ${i + 1} von ${n}`, `Interpreting: unit ${i + 1} of ${n}`)}</h2>
  {#if abweichung}<p class="warn" role="note">{abweichung}</p>{/if}
  <p><strong>{L('Forschungsfrage: ', 'Research question: ')}</strong>{sa.forschungsfrage}</p>
  {#if !alle}<p><button type="button" class="k klein" aria-pressed={gruppenmodus} onclick={schalteGruppenmodus}>{L('Gruppenmodus (für den Beamer)', 'Group mode (for the projector)')}</button></p>{/if}

  {#if alle}
    <p>{L('Der ganze Ausschnitt ist jetzt sichtbar, alle Deutungen stehen zum Lesen da.', 'Now the whole excerpt is visible, and all interpretations are there to read.')}</p>
    <h3>{L('Übersicht', 'Overview')}</h3>
    <FeinstrukturUebersicht {sa} />
    <FeinstrukturFazit {sa} />
    <h3>{L('Ergebnis aufbereiten', 'Prepare the result')}</h3>
    <FeinstrukturWord {sa} />
    {#each reflexionsStellen(sa) as k (k)}
      <details class="frueher">
        <summary>{L(`Zwischenreflexion nach Sinneinheit ${k + 1} ansehen und ändern`, `View and edit interim reflection after unit ${k + 1}`)}</summary>
        <FeinstrukturReflexion {sa} nach={k} />
      </details>
    {/each}
  {:else}
    {#if sa.ausschnitt.kontext}<p class="kontext" data-nolink><strong>{L('Frage davor: ', 'Question before: ')}</strong>{sa.ausschnitt.kontext}</p>{/if}
    {#if !folgetextVerdeckt(sa)}
      <!-- A4: „Folgetext verdecken“ ist aus - dann steht der ganze Ausschnitt da (Entscheidung der Person, beim Einteilen umschaltbar) -->
      <p class="ganz" data-nolink><strong>{L('Ganzer Ausschnitt (Folgetext nicht verdeckt): ', 'Whole excerpt (following text not hidden): ')}</strong>{sa.ausschnitt.text}</p>
    {/if}
    {#if gruppenmodus}
    <h3>{L(`Sinneinheit ${i + 1}`, `Unit ${i + 1}`)}</h3>
    <p class="jetzt-gross" data-nolink>{einheitSichtbar(sa, i)}</p>
    <p><label for="fe-gm-person">{L('Wer trägt gerade ein? (freiwillig)', 'Who is entering now? (optional)')}</label> <input type="text" id="fe-gm-person" bind:value={person} /></p>
    {:else}
    <h3>{L('Bisherige Sinneinheiten', 'Units so far')}</h3>
    <ol class="einheiten" data-nolink>
      {#each bisherige as k (sa.einheiten[k]!.id)}
        <li class:jetzt={k === i} aria-current={k === i ? 'step' : undefined}>
          <span class="text">{einheitSichtbar(sa, k)}</span>
          {#if k < i}
            <details class="frueher">
              <summary>{L(`Einträge zu Sinneinheit ${k + 1} ansehen und ändern`, `View and edit entries for unit ${k + 1}`)}</summary>
              <FeinstrukturKarte {sa} idx={k} nr={k + 1} />
            </details>
          {/if}
        </li>
      {/each}
    </ol>
    {/if}
    <p>{nochSatz}</p>
    {#if !gruppenmodus}
    <details class="frueher">
      <summary>{L(`Übersicht bis Sinneinheit ${i + 1}`, `Overview up to unit ${i + 1}`)}</summary>
      <FeinstrukturUebersicht {sa} />
    </details>
    <details class="frueher">
      <summary>{L(`Ergebnis aufbereiten und Word (bis Sinneinheit ${i + 1})`, `Prepare the result and Word (up to unit ${i + 1})`)}</summary>
      <FeinstrukturWord {sa} />
    </details>
    {/if}
    {#if reflexion !== undefined}{#key reflexion}<FeinstrukturReflexion {sa} nach={reflexion} />{/key}{/if}
    <FeinstrukturLesartenPruefen {sa} idx={i} />
    {#if fuell !== undefined}
      <div class="fuell">
        <p>{L(`Diese Sinneinheit ist dasselbe Wort wie Sinneinheit ${fuell + 1}. Gilt die frühere Deutung, weil der Zusammenhang gleich ist, können Sie sie übernehmen und hier anpassen.`, `This unit is the same word as unit ${fuell + 1}. If the earlier interpretation applies because the context is the same, you can take it over and adjust it here.`)}</p>
        <button type="button" class="k" onclick={() => uebernehmen(fuell!)}>{L(`Deutung von Sinneinheit ${fuell + 1} übernehmen`, `Take over interpretation of unit ${fuell + 1}`)}</button>
      </div>
    {/if}
    <h3 class="karte-h">{L(`Deutung der Sinneinheit ${i + 1}`, `Interpretation of unit ${i + 1}`)}</h3>
    <p><button type="button" class="k leise klein" onclick={() => weiterEl?.focus()}>{L('Ans Ende der Karte springen', 'Jump to the end of the card')}</button></p>
    {#key sa.einheiten[i]?.id}<FeinstrukturKarte {sa} idx={i} person={gruppenmodus ? person : ''} />{/key}
    <p><button type="button" class="k haupt" bind:this={weiterEl} onclick={() => void weiter()}>{L('Einheit fertig, weiter', 'Unit done, next')}</button></p>
  {/if}

  {#if zurueckFrage}
    <div class="rueck" role="group" aria-label={L('Rückfrage zum Einteilen', 'Question about dividing')} bind:this={zurueckEl}>
      <p id="fe-zurueck-t">{L('Zurück zum Einteilen? Deutungen bleiben erhalten, aber der ganze Ausschnitt wird wieder sichtbar.', 'Back to dividing? Interpretations are kept, but the whole excerpt becomes visible again.')}</p>
      <div class="zeile">
        <button type="button" class="k" aria-describedby="fe-zurueck-t" onclick={zurueck}>{L('Zurück zum Einteilen', 'Back to dividing')}</button>
        <button type="button" class="k nein" aria-describedby="fe-zurueck-t" onclick={() => { zurueckFrage = false; sage(L('Nicht geändert.', 'Not changed.')); }}>{L('Nicht ändern', 'Do not change')}</button>
      </div>
    </div>
  {:else}
    <p><button type="button" class="k" onclick={zurueck}>{L('Zurück zum Einteilen', 'Back to dividing')}</button></p>
  {/if}
</div>

<style>
  .fe { display: flex; flex-direction: column; gap: .5rem; }
  h2 { margin: 0; font-size: 1.3rem; }
  h3 { margin: .5rem 0 0; }
  h2[tabindex='-1']:focus { outline: none; }
  h2[tabindex='-1']:focus-visible { outline: var(--fokus-outline); outline-offset: 4px; }
  .warn { background: var(--blatt-2); padding: .5rem; border-radius: var(--r-klein); }
  .kontext { color: var(--tinte-2); }
  .ganz { border-inline-start: 3px solid var(--linie-stark); padding-inline-start: .5rem; margin: 0; }
  ol.einheiten li { margin: .25rem 0; }
  ol.einheiten li.jetzt { background: var(--akzent-hell); border-inline-start: 3px solid var(--akzent); padding-inline-start: .4rem; }
  .text { font-weight: 600; }
  .frueher { margin-top: .25rem; }
  .frueher summary { cursor: pointer; }
  .fuell { border: 1px dashed var(--akzent); border-radius: var(--r-klein); padding: .5rem; }
  .fuell p { margin: 0 0 .35rem; }
  .gross { font-size: 1.3rem; }
  .gross :global(input), .gross :global(button), .gross :global(textarea) { font-size: 1.15rem; }
  .jetzt-gross { font-size: 1.6rem; font-weight: 600; background: var(--akzent-hell); border-inline-start: 4px solid var(--akzent); padding: .5rem .75rem; margin: 0; }
  .rueck { border: 1px solid var(--akzent); border-radius: var(--r-klein); padding: .5rem; }
  .zeile { display: flex; gap: .5rem; flex-wrap: wrap; }
</style>
