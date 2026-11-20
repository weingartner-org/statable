<script lang="ts">
  import { s, d, L, einstSpeichern, melde } from '../lib/sitzung.svelte';
  import { FAECHER, fachName, fachFrageErledigt, fachFrageMerken } from '../lib/fach';
  import { fachAusSpeicher } from '../lib/fachid';

  /**
   * Die einmalige Frage nach dem Fachgebiet (nicht blockierend): steht auf der Daten-Seite, bis jemand antwortet oder sie wegklickt; danach nie wieder.
   * Sie ändert nur die Kartenliste von „Neue Auswertung“, nie eine Rechnung (lib/fach.ts).
   */
  let offen = $state(!fachFrageErledigt());
  let wahl = $state(false);
  function nein() { fachFrageMerken(); offen = false; }
  function setze(w: string) {
    s.einst.fach = fachAusSpeicher(w); einstSpeichern(); fachFrageMerken(); offen = false;
    melde(L(`Fachgebiet: ${fachName(s.einst.fach)}. Das lässt sich in den Einstellungen ändern.`, `Field of study: ${fachName(s.einst.fach)}. You can change this in the settings.`));
  }
</script>

{#if offen}
  <section class="fach-frage" aria-labelledby="ff-t">
    <h2 id="ff-t">{d('Studierst du etwas anderes als Bildung oder Psychologie?', 'Studieren Sie etwas anderes als Bildung oder Psychologie?', 'Do you study something other than education or psychology?')}</h2>
    <p>{d('Dann zeigt Statable bei „Neue Auswertung“ zuerst die Verfahren, die in deinem Fach üblich sind. Gerechnet wird überall gleich, und die Suche findet alles.', 'Dann zeigt Statable bei „Neue Auswertung“ zuerst die Verfahren, die in Ihrem Fach üblich sind. Gerechnet wird überall gleich, und die Suche findet alles.', 'Then Statable shows the methods that are usual in your field first under "New analysis". Calculation is the same everywhere, and the search finds everything.')}</p>
    {#if wahl}
      <div class="eingabe"><label for="ff-fach">{L('Mein Fachgebiet', 'My field of study')}</label>
        <select id="ff-fach" value={s.einst.fach} onchange={(e) => setze((e.currentTarget as HTMLSelectElement).value)}>
          {#each FAECHER as f (f.id)}<option value={f.id}>{fachName(f.id)}</option>{/each}
        </select></div>
    {/if}
    <div class="knopfzeile">
      {#if !wahl}<button class="k" type="button" onclick={() => (wahl = true)}>{L('Fachgebiet wählen', 'Choose field of study')}</button>{/if}
      <button class="k leise" type="button" onclick={nein}>{L('Nein, passt', 'No, that is fine')}</button>
    </div>
  </section>
{/if}

<style>
  .fach-frage { margin: var(--a3) 0; padding: var(--a3) var(--a4); border: 1px solid var(--linie-stark); border-radius: var(--r-gross); background: var(--blatt); }
  .fach-frage h2 { font-size: var(--gr-h2); margin: 0 0 var(--a2); }
  .fach-frage p { margin: 0 0 var(--a3); color: var(--tinte-2); }
  .fach-frage .eingabe { margin-bottom: var(--a3); max-width: 28rem; }
</style>
