<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendere } from '../lib/interviews.svelte';
  import { aendereBlock, bloeckeGeordnet, fragenAlsAspekte, hinweiseZuFrage, type Leitfaden } from '../lib/leitfaden';
  import { hinweisName, hinweisText } from '../lib/leitfaden-texte';

  /** Schritt 4 von 4: Subsumieren. Je Block eine Erzählaufforderung; Aspekte, Aufrechterhaltungsfragen und konkrete Fragen je eine Zeile. */
  let { lf }: { lf: Leitfaden } = $props();
  const bloecke = $derived(bloeckeGeordnet(lf));
  const zeilen = (t: string) => t.split(/\r?\n/).map(z => z.trim()).filter(Boolean);
  function ausFragen(id: string, titel: string) {
    const n = lf.gesammelt.filter(g => g.status === 'behalten' && g.block === id).length;
    if (!n) { sage(L(`Block „${titel}“ hat keine zugeordneten Fragen.`, `Block "${titel}" has no assigned questions.`)); return; }
    aendere(x => fragenAlsAspekte(x, id));
    sage(L(`Fragen von Block „${titel}“ als Aspekte eingetragen.`, `Questions of block "${titel}" entered as aspects.`));
  }
</script>

<p class="heft-text">{L('Formulieren Sie je Block eine offene Erzählaufforderung, die die einzelnen Fragen umfasst. Die einzelnen Fragen werden zu Aspekten (Merkposten, falls die Person sie nicht von selbst anspricht), Aufrechterhaltungsfragen („Und dann?“) oder konkreten Fragen in fester Formulierung.', 'Write one open narrative prompt per block that covers the individual questions. The individual questions become aspects (reminders in case the person does not raise them), maintenance questions ("And then?") or concrete questions in a fixed wording.')}</p>

{#if !bloecke.length}
  <p class="hilfe">{L('Es gibt noch keine Blöcke. Legen Sie sie in Schritt 3 an.', 'There are no blocks yet. Create them in step 3.')}</p>
{/if}
<div class="liste">
  {#each bloecke as b, i (b.id)}
    {@const hw = hinweiseZuFrage(b.erzaehlaufforderung, lf.sprache)}
    <fieldset class="block">
      <legend>{L(`Block ${i + 1}: ${b.titel || 'ohne Titel'}`, `Block ${i + 1}: ${b.titel || 'untitled'}`)}</legend>
      <label class="eingabe">{L('Erzählaufforderung (offene Leitfrage)', 'Narrative prompt (open guiding question)')}
        <textarea rows="2" lang={lf.sprache} value={b.erzaehlaufforderung} aria-describedby={hw.length ? `lf-ez-${b.id}` : undefined}
          onchange={(e) => aendere(x => aendereBlock(x, b.id, { erzaehlaufforderung: e.currentTarget.value.trim() }))}></textarea></label>
      {#if hw.length}
        <ul class="hinweise" id="lf-ez-{b.id}">{#each hw as a (a)}<li><strong>{hinweisName(a)}.</strong> {hinweisText(a)}</li>{/each}</ul>
      {/if}
      <label class="eingabe">{L('Inhaltliche Aspekte (Merkposten, eine je Zeile)', 'Content aspects (reminders, one per line)')}
        <textarea rows="3" lang={lf.sprache} value={b.aspekte.join('\n')} onchange={(e) => aendere(x => aendereBlock(x, b.id, { aspekte: zeilen(e.currentTarget.value) }))}></textarea></label>
      <button class="k leise" type="button" onclick={() => ausFragen(b.id, b.titel)}>{L('Behaltene Fragen dieses Blocks als Aspekte eintragen', 'Enter the kept questions of this block as aspects')}</button>
      <label class="eingabe">{L('Aufrechterhaltungsfragen (eine je Zeile)', 'Maintenance questions (one per line)')}
        <textarea rows="2" lang={lf.sprache} value={b.aufrechterhaltung.join('\n')} onchange={(e) => aendere(x => aendereBlock(x, b.id, { aufrechterhaltung: zeilen(e.currentTarget.value) }))}></textarea></label>
      <label class="eingabe">{L('Konkrete Fragen (eine je Zeile)', 'Concrete questions (one per line)')}
        <textarea rows="2" lang={lf.sprache} value={b.konkret.join('\n')} onchange={(e) => aendere(x => aendereBlock(x, b.id, { konkret: zeilen(e.currentTarget.value) }))}></textarea></label>
    </fieldset>
  {/each}
</div>

<style>
  .liste { display: flex; flex-direction: column; gap: var(--a3); }
  .block { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); margin: 0; min-width: 0; display: flex; flex-direction: column; gap: var(--a2); align-items: flex-start; }
  .block legend { padding: 0 var(--a1); font-weight: 650; }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); width: 100%; }
  textarea { width: 100%; box-sizing: border-box; }
  .hinweise { margin: 0; padding-inline-start: var(--a5); font-size: var(--gr-klein); }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
</style>
