<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendere } from '../lib/interviews.svelte';
  import { hinweiseZuFrage, setzeGrund, setzeStatus, type FrageStatus, type Leitfaden } from '../lib/leitfaden';
  import { hinweisName, hinweisText, pruefFragen } from '../lib/leitfaden-texte';

  /** Schritt 2 von 4: Prüfen. Je Frage Hinweise (als Beschreibung an der Frage) und die Entscheidung als Auswahlgruppe. */
  let { lf }: { lf: Leitfaden } = $props();
  const WAHL = ['behalten', 'gestrichen', 'kurzfragebogen'] as const;
  const name = (s: FrageStatus) => (s === 'behalten' ? L('behalten', 'keep') : s === 'gestrichen' ? L('gestrichen', 'delete') : L('für den Kurzfragebogen', 'for the short questionnaire'));
  function waehle(id: string, nr: number, status: FrageStatus) {
    aendere(x => setzeStatus(x, id, status));
    sage(L(`Frage ${nr}: ${name(status)}.`, `Question ${nr}: ${name(status)}.`));
  }
</script>

<p class="heft-text">{L('Das sind Hinweise, keine Fehler. Sie entscheiden, was Sie ändern. Jede Frage: behalten, streichen oder in den Kurzfragebogen (zum Beispiel Faktenfragen wie das Alter).', 'These are notes, not errors. You decide what to change. For each question: keep it, delete it, or move it to the short questionnaire (for example questions of fact such as age).')}</p>

<details class="auf">
  <summary>{L('Prüffragen zum Nachdenken (Prüfen nach Helfferich)', 'Questions to think about (checking after Helfferich)')}</summary>
  <ul class="pf">{#each pruefFragen() as p (p)}<li>{p}</li>{/each}</ul>
</details>

{#if !lf.gesammelt.length}
  <p class="hilfe">{L('Es gibt noch keine Fragen. Sammeln Sie zuerst Fragen (Schritt 1).', 'There are no questions yet. Collect some first (step 1).')}</p>
{/if}
<div class="liste">
  {#each lf.gesammelt as g, i (g.id)}
    {@const hw = hinweiseZuFrage(g.text, lf.sprache)}
    <fieldset class="frage" aria-describedby={hw.length ? `lf-hw-${g.id}` : undefined}>
      <legend><span class="nr">{L('Frage', 'Question')} {i + 1}:</span> <span lang={lf.sprache}>{g.text}</span></legend>
      {#if hw.length}
        <ul class="hinweise" id="lf-hw-{g.id}">{#each hw as a (a)}<li><strong>{hinweisName(a)}.</strong> {hinweisText(a)}</li>{/each}</ul>
      {/if}
      <div class="wahl">
        {#each WAHL as st (st)}
          <label class="schalter"><input type="radio" name="lf-st-{g.id}" checked={g.status === st} onchange={() => waehle(g.id, i + 1, st)}>{st === 'behalten' ? L('Behalten', 'Keep') : st === 'gestrichen' ? L('Streichen', 'Delete') : L('Gehört in den Kurzfragebogen', 'Belongs in the short questionnaire')}</label>
        {/each}
      </div>
      {#if g.status === 'gestrichen' || g.status === 'kurzfragebogen'}
        <label class="eingabe">{L('Grund (freiwillig)', 'Reason (optional)')}<input type="text" value={g.grund ?? ''} onchange={(e) => aendere(x => setzeGrund(x, g.id, e.currentTarget.value))}></label>
      {/if}
    </fieldset>
  {/each}
</div>

<style>
  .liste { display: flex; flex-direction: column; gap: var(--a3); }
  .frage { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); margin: 0; min-width: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .frage legend { padding: 0 var(--a1); font-weight: 650; }
  .nr { color: var(--tinte-2); font-weight: 600; }
  .hinweise { margin: 0; padding-inline-start: var(--a5); font-size: var(--gr-klein); }
  .wahl { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); }
  .schalter { display: flex; gap: var(--a2); align-items: center; }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); }
  .pf { margin: var(--a2) 0 0; padding-inline-start: var(--a5); display: flex; flex-direction: column; gap: var(--a1); }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
</style>
