<script lang="ts">
  /**
   * Feinstruktur F3c: gleiche Einträge einer Spalte von Hand zusammenlegen (nur in zusammengeführten Analysen).
   * Der Mensch wählt die Einträge und schreibt den gemeinsamen Text; die Herkunft (Gruppennamen) bleibt am neuen Eintrag. Statable vergleicht
   * nichts, schlägt nichts vor und zählt nichts (keine Übereinstimmungszahl). Kein modales Fenster: alles steht in der Karte.
   */
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendereSequenzanalyse } from '../lib/interviews.svelte';
  import type { Eintrag, Lesart, Sequenzanalyse } from '../lib/qualprojekt';
  import { ortSchluessel, type SpaltenOrt } from '../lib/feinstruktur-spalten';
  import { legeZusammen } from '../lib/feinstruktur-gruppe';

  let { sa, idx, feld, name, liste, mitPruefung = false }: { sa: Sequenzanalyse; idx: number; feld: SpaltenOrt; name: string; liste: (Eintrag | Lesart)[]; mitPruefung?: boolean } = $props();

  let gewaehlt = $state<string[]>([]);
  let offen = $state(false);
  let text = $state('');
  let pruefung = $state('');
  const basis = $derived(`fe-zl-${idx}-${ortSchluessel(feld).replace(':', '-')}`);

  function beginnen() {
    if (gewaehlt.length < 2) { sage(L('Wählen Sie mindestens zwei Einträge.', 'Choose at least two entries.'), 'dringend'); return; }
    const erst = liste.find(e => gewaehlt.includes(e.id));
    text = erst?.text ?? ''; pruefung = erst && 'pruefung' in erst ? erst.pruefung : '';
    offen = true;
    queueMicrotask(() => document.getElementById(`${basis}-text`)?.focus());
  }
  function zusammenlegen() {
    if (!text.trim()) { sage(L('Bitte den gemeinsamen Text eintragen.', 'Please enter the common text.'), 'dringend'); return; }
    try {
      aendereSequenzanalyse(sa.id, x => legeZusammen(x, idx, feld, gewaehlt, text.trim(), Date.now(), mitPruefung ? pruefung.trim() : undefined));
      sage(L(`${gewaehlt.length} Einträge zu einem zusammengelegt. Die Herkunft bleibt vermerkt.`, `${gewaehlt.length} entries combined into one. The origin remains noted.`));
      gewaehlt = []; offen = false;
    } catch (e) { sage(e instanceof Error ? e.message : String(e), 'dringend'); }
  }
</script>

<details class="zl">
  <summary>{L(`Gleiche Einträge zusammenlegen (${name})`, `Combine identical entries (${name})`)}</summary>
  <fieldset>
    <legend>{L('Welche Einträge sagen dasselbe?', 'Which entries say the same?')}</legend>
    {#each liste as e, i (e.id)}
      <label class="eigen-wahl"><input type="checkbox" value={e.id} bind:group={gewaehlt} /> {i + 1}. {e.text}{#if e.gruppe} ({e.gruppe}){/if}</label>
    {/each}
  </fieldset>
  {#if offen}
    <div class="feld">
      <label for="{basis}-text">{L('Gemeinsamer Text', 'Common text')}</label>
      <input type="text" id="{basis}-text" bind:value={text} />
      {#if mitPruefung}
        <label for="{basis}-pruef">{L('Gemeinsames Prüfkriterium', 'Common test criterion')}</label>
        <input type="text" id="{basis}-pruef" bind:value={pruefung} />
      {/if}
      <div class="zeile">
        <button type="button" class="k" onclick={zusammenlegen}>{L('Zusammenlegen', 'Combine')}</button>
        <button type="button" class="k nein" onclick={() => { offen = false; sage(L('Nicht zusammengelegt.', 'Not combined.')); }}>{L('Nicht zusammenlegen', 'Do not combine')}</button>
      </div>
    </div>
  {:else}
    <p><button type="button" class="k klein" onclick={beginnen}>{L('Gewählte zusammenlegen', 'Combine selected')}</button></p>
  {/if}
</details>

<style>
  .zl { margin: .25rem 0; }
  .zl summary { cursor: pointer; }
  fieldset { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: .5rem; margin: .35rem 0; display: grid; gap: .25rem; }
  .eigen-wahl { display: flex; gap: .4rem; align-items: baseline; }
  .feld { display: grid; gap: .35rem; justify-items: start; }
  .feld input[type='text'] { box-sizing: border-box; width: 100%; font: inherit; padding: .35rem .5rem; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); }
  .zeile { display: flex; gap: .5rem; flex-wrap: wrap; }
</style>
