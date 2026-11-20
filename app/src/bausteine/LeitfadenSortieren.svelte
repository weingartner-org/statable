<script lang="ts">
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import { fokusNachDialog } from './dialogFokus';
  import { aendere, iv } from '../lib/interviews.svelte';
  import { aendereBlock, bloeckeGeordnet, entferneBlock, neuerBlock, ordneZu, verschiebeBlock, type Leitfaden } from '../lib/leitfaden';

  /** Schritt 3 von 4: Sortieren. Behaltene Fragen den Blöcken zuordnen (Auswahlfeld), Blöcke anlegen, umbenennen und mit Knöpfen verschieben - kein Ziehen als einziger Weg. */
  let { lf }: { lf: Leitfaden } = $props();
  let neuTitel = $state('');
  const bloecke = $derived(bloeckeGeordnet(lf));
  const behalten = $derived(lf.gesammelt.filter(g => g.status === 'behalten'));

  async function anlegen() {
    const t = neuTitel.trim();
    if (!t) { sage(L('Bitte einen Titel für den Block eingeben.', 'Please enter a title for the block.')); document.getElementById('lf-so-neu')?.focus(); return; }
    aendere(x => neuerBlock(x, t).leitfaden);
    neuTitel = '';
    sage(L(`Block „${t}“ angelegt.`, `Block "${t}" created.`));
    await tick();
    document.getElementById('lf-so-neu')?.focus();
  }
  async function schieben(id: string, titel: string, schritt: number) {
    const r = verschiebeBlock(lf, id, schritt);
    const i = bloecke.findIndex(b => b.id === id) + 1;
    if (r.stelle === i) { sage(schritt < 0 ? L(`Block „${titel}“ steht schon ganz oben.`, `Block "${titel}" is already at the top.`) : L(`Block „${titel}“ steht schon ganz unten.`, `Block "${titel}" is already at the bottom.`)); return; }
    aendere(x => verschiebeBlock(x, id, schritt).leitfaden);
    sage(L(`Block „${titel}“ steht jetzt an Stelle ${r.stelle} von ${bloecke.length}.`, `Block "${titel}" is now at position ${r.stelle} of ${bloecke.length}.`));
    await tick();
    document.getElementById((schritt < 0 ? 'lf-auf-' : 'lf-ab-') + id)?.focus();
  }
  function entfernen(id: string, titel: string) {
    iv.rueckfrage = {
      titel: L('Block entfernen?', 'Remove block?'),
      text: L(`Der Block „${titel}“ mit seinen Texten (Erzählaufforderung, Aspekte, Fragen) wird entfernt. Die zugeordneten Fragen bleiben erhalten, sie haben dann keinen Block.`, `The block "${titel}" with its texts (narrative prompt, aspects, questions) is removed. The assigned questions stay, but then have no block.`),
      ja: L('Block entfernen', 'Remove block'),
      tun: () => { aendere(x => entferneBlock(x, id)); sageSpaeter(L(`Block „${titel}“ entfernt.`, `Block "${titel}" removed.`), 600); fokusNachDialog('lf-so-neu'); }
    };
  }
  function zuordnen(frageId: string, nr: number, wert: string) {
    aendere(x => ordneZu(x, frageId, wert || null));
    const b = bloecke.find(x => x.id === wert);
    sage(b ? L(`Frage ${nr} gehört jetzt zu Block „${b.titel}“.`, `Question ${nr} now belongs to block "${b.titel}".`) : L(`Frage ${nr} hat keinen Block.`, `Question ${nr} has no block.`));
  }
</script>

<p class="heft-text">{L('Ordnen Sie die behaltenen Fragen Themenblöcken zu. Jeder Block wird später eine Hauptkategorie. Die Reihenfolge der Blöcke ist die Reihenfolge im Interview.', 'Assign the questions you kept to thematic blocks. Each block later becomes a main category. The order of the blocks is the order in the interview.')}</p>

<div class="neu">
  <label class="eingabe" for="lf-so-neu">{L('Neuer Block (Thema)', 'New block (topic)')}</label>
  <div class="zeile"><input type="text" id="lf-so-neu" bind:value={neuTitel} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void anlegen(); } }}>
    <button class="k" type="button" onclick={() => void anlegen()}>{L('Block anlegen', 'Create block')}</button></div>
</div>

<h4 class="unter">{L('Blöcke', 'Blocks')} ({bloecke.length})</h4>
{#if bloecke.length}
  <ol class="bloecke">
    {#each bloecke as b, i (b.id)}
      <li>
        <label class="eingabe">{L(`Titel von Block ${i + 1}`, `Title of block ${i + 1}`)}<input type="text" value={b.titel} onchange={(e) => aendere(x => aendereBlock(x, b.id, { titel: e.currentTarget.value }))}></label>
        <div class="knopfzeile">
          <button class="k leise" type="button" id="lf-auf-{b.id}" onclick={() => void schieben(b.id, b.titel, -1)} aria-label={L(`Block „${b.titel}“ nach oben`, `Move block "${b.titel}" up`)}>{L('Nach oben', 'Up')}</button>
          <button class="k leise" type="button" id="lf-ab-{b.id}" onclick={() => void schieben(b.id, b.titel, 1)} aria-label={L(`Block „${b.titel}“ nach unten`, `Move block "${b.titel}" down`)}>{L('Nach unten', 'Down')}</button>
          <button class="k leise" type="button" onclick={() => entfernen(b.id, b.titel)} aria-label={L(`Block „${b.titel}“ entfernen`, `Remove block "${b.titel}"`)}>{L('Entfernen', 'Remove')}</button>
        </div>
      </li>
    {/each}
  </ol>
{:else}
  <p class="hilfe">{L('Noch keine Blöcke.', 'No blocks yet.')}</p>
{/if}

<h4 class="unter">{L('Behaltene Fragen', 'Questions kept')} ({behalten.length})</h4>
{#if behalten.length}
  <ul class="fragen">
    {#each behalten as g, i (g.id)}
      <li><span lang={lf.sprache}>{g.text}</span>
        <label class="eingabe">{L(`Block für Frage ${i + 1}`, `Block for question ${i + 1}`)}
          <select value={g.block ?? ''} onchange={(e) => zuordnen(g.id, i + 1, e.currentTarget.value)}>
            <option value="">{L('kein Block', 'no block')}</option>
            {#each bloecke as b, j (b.id)}<option value={b.id}>{L(`Block ${j + 1}: ${b.titel}`, `Block ${j + 1}: ${b.titel}`)}</option>{/each}
          </select></label></li>
    {/each}
  </ul>
{:else}
  <p class="hilfe">{L('Es gibt noch keine behaltenen Fragen. In Schritt 2 entscheiden Sie, welche Fragen bleiben.', 'There are no questions kept yet. In step 2 you decide which questions stay.')}</p>
{/if}

<style>
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); }
  .zeile { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; }
  .zeile input { flex: 1 1 14rem; min-height: 24px; }
  .unter { margin: var(--a3) 0 0; font: 650 var(--gr-h3, 1rem)/1.3 var(--schrift-ui); }
  .bloecke, .fragen { margin: 0; padding-inline-start: var(--a5); display: flex; flex-direction: column; gap: var(--a3); }
  .fragen { list-style: none; padding-inline-start: 0; }
  .fragen li { border-bottom: 1px solid var(--linie); padding-bottom: var(--a2); display: flex; flex-direction: column; gap: var(--a1); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); margin-top: var(--a1); }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
</style>
