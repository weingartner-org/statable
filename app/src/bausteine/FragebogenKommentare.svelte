<script lang="ts">
  import { L, Lp } from '../lib/sitzung.svelte';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import { pretestKommentare } from '../lib/fragebogen-editor.svelte';

  /** Pretest-Kommentare zu einer Frage oder einem Block als Liste (Fragebogen planen, 2G). Ohne Kommentare steht nichts da. */
  let { plan, id }: { plan: FragebogenPlan; id: string } = $props();
  const liste = $derived(pretestKommentare(plan)[id] ?? []);
</script>

{#if liste.length}
  <section class="kom" aria-labelledby="fb-kom-t" data-testid="fb-kommentare">
    <h3 id="fb-kom-t">{Lp(liste.length, 'Pretest: 1 Kommentar zu dieser Frage', `Pretest: ${liste.length} Kommentare zu dieser Frage`, 'Pretest: 1 comment on this question', `Pretest: ${liste.length} comments on this question`)}</h3>
    <ol>{#each liste as k, i (i)}<li>{k}</li>{/each}</ol>
    <p class="hilfe">{L('Gelesen aus den Durchgängen der Vorschau und den eingelesenen Daten. Ändern Sie die Frage danach selbst; Statable ändert nichts.', 'Read from the preview runs and the data read in. Change the question yourself afterwards; Statable changes nothing.')}</p>
  </section>
{/if}

<style>
  .kom { display: flex; flex-direction: column; gap: var(--a2); border-inline-start: 3px solid var(--linie-stark); padding-inline-start: var(--a3); }
  .kom h3 { font: 650 var(--gr-text)/1.3 var(--schrift-ui); margin: 0; }
  ol { margin: 0; padding-inline-start: var(--a5); display: flex; flex-direction: column; gap: var(--a1); overflow-wrap: anywhere; white-space: pre-wrap; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
</style>
