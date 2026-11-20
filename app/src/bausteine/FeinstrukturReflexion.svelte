<script lang="ts">
  /**
   * Zwischenreflexion (Feinstruktur F3B2, Fachblatt 7): Angebot nach jeder `reflexionAlle`-ten Sinneinheit, nie Pflicht.
   * Drei Felder mit eigenen Fragen; gespeichert wird nur auf Knopfdruck. Eine Reflexion je Stelle, später änderbar.
   */
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendereSequenzanalyse } from '../lib/interviews.svelte';
  import type { Sequenzanalyse } from '../lib/qualprojekt';
  import { reflexionNach, speichereReflexion } from '../lib/feinstruktur-pruefen';

  let { sa, nach }: { sa: Sequenzanalyse; nach: number } = $props();
  const alt = $derived(reflexionNach(sa, nach));
  // svelte-ignore state_referenced_locally
  let f = $state({ begriffe: reflexionNach(sa, nach)?.begriffe ?? '', bisher: reflexionNach(sa, nach)?.bisher ?? '', pruefen: reflexionNach(sa, nach)?.pruefen ?? '' });
  const id = (k: string) => `fe-zr-${nach}-${k}`;
  const felder = [
    { k: 'begriffe', l: () => L('Welche Begriffe und Spuren behalten Sie im Auge?', 'Which terms and traces do you keep in mind?') },
    { k: 'bisher', l: () => L('Was haben Sie bisher herausgefunden?', 'What have you found so far?') },
    { k: 'pruefen', l: () => L('Was ist noch zu prüfen, und woran?', 'What still needs checking, and against what?') },
  ] as const;

  function speichern() {
    aendereSequenzanalyse(sa.id, x => speichereReflexion(x, nach, { begriffe: f.begriffe.trim(), bisher: f.bisher.trim(), pruefen: f.pruefen.trim() }, Date.now()));
    sage(L(`Zwischenreflexion nach Sinneinheit ${nach + 1} gespeichert.`, `Interim reflection after unit ${nach + 1} saved.`));
  }
</script>

<div class="zr">
  <h3>{L(`Zwischenreflexion nach Sinneinheit ${nach + 1} (freiwillig)`, `Interim reflection after unit ${nach + 1} (optional)`)}</h3>
  <p class="hilfe">{L('Halten Sie kurz inne, bevor Sie weiterdeuten. Sie können diesen Schritt auch auslassen.', 'Pause briefly before interpreting further. You can also skip this step.')}{#if alt} {L('Schon gespeichert, Sie können sie ändern.', 'Already saved; you can change it.')}{/if}</p>
  {#each felder as x (x.k)}
    <label for={id(x.k)}>{x.l()}</label>
    <textarea id={id(x.k)} rows="3" bind:value={f[x.k]}></textarea>
  {/each}
  <p><button type="button" class="k" onclick={speichern}>{L('Zwischenreflexion speichern', 'Save interim reflection')}</button></p>
</div>

<style>
  .zr { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: .5rem .75rem; display: grid; gap: .35rem; }
  h3 { margin: 0; font-size: 1.1rem; }
  .hilfe { margin: 0; color: var(--tinte-2); }
  label { font-weight: 600; }
  textarea { box-sizing: border-box; width: 100%; font: inherit; padding: .35rem .5rem; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); }
  textarea:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; }
  p { margin: 0; }
</style>
