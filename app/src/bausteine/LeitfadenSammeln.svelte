<script lang="ts">
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendere } from '../lib/interviews.svelte';
  import { sammleFragen, entferneFrage, type Leitfaden } from '../lib/leitfaden';
  import Icon from './Icon.svelte';

  /** Schritt 1 von 4: Sammeln (Brainstorming). Fragen frei eingeben, eine je Zeile; noch keine Bewertung. */
  let { lf }: { lf: Leitfaden } = $props();
  let eingabe = $state('');

  async function hinzu() {
    const vorher = lf.gesammelt.length;
    const neu = sammleFragen(lf, eingabe).gesammelt.length - vorher;
    if (!neu) { sage(L('Noch keine Frage eingegeben.', 'No question entered yet.')); document.getElementById('lf-sam-text')?.focus(); return; }
    const text = eingabe;
    aendere(x => sammleFragen(x, text));
    eingabe = '';
    sage(neu === 1 ? L('1 Frage hinzugefügt.', '1 question added.') : L(`${neu} Fragen hinzugefügt.`, `${neu} questions added.`));
    await tick();
    document.getElementById('lf-sam-text')?.focus();
  }
  async function weg(id: string, nr: number) {
    aendere(x => entferneFrage(x, id));
    sage(L(`Frage ${nr} entfernt.`, `Question ${nr} removed.`));
    await tick();
    document.getElementById('lf-sam-text')?.focus();
  }
</script>

<p class="heft-text">{L('Tragen Sie möglichst viele Fragen zu Ihrem Thema zusammen. Die Formulierung spielt noch keine Rolle. Jetzt noch nichts streichen.', 'Collect as many questions on your topic as you can. The wording does not matter yet. Do not delete anything for now.')}</p>
<div class="eingabe">
  <label for="lf-sam-text">{L('Fragen (eine je Zeile)', 'Questions (one per line)')}</label>
  <textarea id="lf-sam-text" rows="5" lang={lf.sprache} bind:value={eingabe}></textarea>
</div>
<div class="knopfzeile"><button class="k haupt" type="button" onclick={() => void hinzu()}><Icon n="plus" />{L('Fragen hinzufügen', 'Add questions')}</button></div>

<h4 class="unter">{L('Gesammelte Fragen', 'Collected questions')} ({lf.gesammelt.length})</h4>
{#if lf.gesammelt.length}
  <ol class="fragen">
    {#each lf.gesammelt as g, i (g.id)}
      <li><span lang={lf.sprache}>{g.text}</span>
        <button class="k leise" type="button" onclick={() => void weg(g.id, i + 1)} aria-label={L(`Frage ${i + 1} entfernen: ${g.text}`, `Remove question ${i + 1}: ${g.text}`)}>{L('Entfernen', 'Remove')}</button></li>
    {/each}
  </ol>
{:else}
  <p class="hilfe">{L('Noch keine Fragen.', 'No questions yet.')}</p>
{/if}

<style>
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); }
  textarea { width: 100%; box-sizing: border-box; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .unter { margin: var(--a3) 0 0; font: 650 var(--gr-h3, 1rem)/1.3 var(--schrift-ui); }
  .fragen { margin: 0; padding-inline-start: var(--a5); display: flex; flex-direction: column; gap: var(--a2); }
  .fragen li { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; justify-content: space-between; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
</style>
