<script lang="ts">
  /**
   * Feinstruktur F3c: Ergebnis aufbereiten - Schlüsselentscheidungen, Methodenanhang als Vorschlag (nur Fakten des Ablaufs), Word im Format
   * der Abgabe (je Sinneinheit eine Tabelle oder eine große Tabelle). Word enthält nur, was auch der Bildschirm zeigen darf (nicht vorauslesen).
   * Kein modales Fenster; Ansagen nur über `sage`.
   */
  import { L, s } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { dateiname } from '../lib/dateiname';
  import { aendereSequenzanalyse, eigeneSpaltensaetze, qualProjekt } from '../lib/interviews.svelte';
  import type { Sequenzanalyse } from '../lib/qualprojekt';
  import { setzeSchluesselentscheidungen } from '../lib/feinstruktur-gruppe';
  import { methodenanhang } from '../lib/feinstruktur-word';
  import { sichtbarBis } from '../lib/feinstruktur-pruefen';

  let { sa }: { sa: Sequenzanalyse } = $props();

  const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const sprache = (): 'de' | 'en' => (s.einst.sprache === 'de' ? 'de' : 'en');
  const dokName = $derived(qualProjekt()?.dokumente.find(x => x.id === sa.dokument)?.name);
  const anhang = $derived(methodenanhang(sa, sprache(), { dokumentName: dokName, eigene: eigeneSpaltensaetze() }));
  const bis = $derived(sichtbarBis(sa));
  let form = $state<'je-einheit' | 'eine-tabelle'>('je-einheit');
  let mitAnhang = $state(true);
  let arbeitet = $state(false);

  async function speichern() {
    arbeitet = true;
    try {
      const [{ feinstrukturWord }, { herunterladen }] = await Promise.all([import('../lib/feinstruktur-word'), import('../lib/export')]);
      const bytes = await feinstrukturWord($state.snapshot(sa) as Sequenzanalyse, { sprache: sprache(), form, methodenanhang: mitAnhang, dokumentName: dokName, eigene: $state.snapshot(eigeneSpaltensaetze()) });
      herunterladen(bytes, `${dateiname(sa.name)} - ${sa.verfahren === 'feinstruktur' ? L('Feinstrukturanalyse', 'Fine structure analysis') : L('Sequenzanalyse', 'Sequential analysis')}.docx`, WORD);
      sage(L('Word-Datei gespeichert.', 'Word file saved.'));
    } catch (e) { sage(L('Word-Datei konnte nicht erzeugt werden.', 'Could not create the Word file.') + ' ' + (e instanceof Error ? e.message : ''), 'dringend'); }
    finally { arbeitet = false; }
  }
</script>

<div class="wo">
  <h3>{L('Schlüsselentscheidungen', 'Key decisions')}</h3>
  <p class="hilfe" id="fe-se-h">{L('Welche Entscheidungen haben die Deutung geprägt? Zum Beispiel: warum dieser Ausschnitt, wo die Grenzen strittig waren, welche Lesart lange offen blieb. Das hilft anderen, Ihren Weg nachzuvollziehen.', 'Which decisions shaped the interpretation? For example: why this excerpt, where boundaries were disputed, which reading stayed open for long. This helps others follow your path.')}</p>
  <label for="fe-se">{L('Schlüsselentscheidungen', 'Key decisions')}</label>
  <textarea id="fe-se" rows="4" aria-describedby="fe-se-h" value={sa.schluesselentscheidungen ?? ''}
    oninput={(ev) => { const t = ev.currentTarget.value; aendereSequenzanalyse(sa.id, x => setzeSchluesselentscheidungen(x, t, Date.now())); }}></textarea>

  <h3>{L('Methodenanhang (Vorschlag)', 'Methods appendix (suggestion)')}</h3>
  <p class="hilfe">{L('Nur Fakten zum Ablauf, keine Deutung. Übernehmen, ändern oder streichen Sie ihn in Ihrer Arbeit.', 'Only facts about the process, no interpretation. Adopt, change or delete it in your paper.')}</p>
  <div class="anhang">{#each anhang as a, k (k)}<p>{a}</p>{/each}</div>

  <h3>{L('Als Word speichern', 'Save as Word')}</h3>
  {#if bis < sa.einheiten.length - 1}
    <p class="hilfe">{L(`Die Datei enthält die Sinneinheiten 1 bis ${bis + 1}. Spätere Sinneinheiten kommen dazu, sobald Sie sie gedeutet haben.`, `The file contains units 1 to ${bis + 1}. Later units are added once you have interpreted them.`)}</p>
  {/if}
  <fieldset>
    <legend>{L('Form der Deutung', 'Layout of the interpretation')}</legend>
    <label><input type="radio" name="fe-wo-form-{sa.id}" value="je-einheit" bind:group={form} /> {L('Je Sinneinheit eine Tabelle', 'One table per unit')}</label>
    <label><input type="radio" name="fe-wo-form-{sa.id}" value="eine-tabelle" bind:group={form} /> {L('Eine große Tabelle', 'One large table')}</label>
  </fieldset>
  <label class="haken"><input type="checkbox" bind:checked={mitAnhang} /> {L('Methodenanhang anhängen', 'Attach methods appendix')}</label>
  <p><button type="button" class="k haupt" disabled={arbeitet} onclick={() => void speichern()}>{L('Word-Datei speichern', 'Save Word file')}</button></p>
</div>

<style>
  .wo { display: flex; flex-direction: column; gap: .4rem; }
  h3 { margin: .5rem 0 0; }
  .hilfe { color: var(--tinte-2); margin: 0; }
  label { font-weight: 600; }
  fieldset label, .haken { font-weight: normal; display: flex; gap: .4rem; align-items: baseline; }
  fieldset { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: .5rem; display: grid; gap: .25rem; }
  textarea { box-sizing: border-box; width: 100%; font: inherit; padding: .35rem .5rem; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); }
  .anhang { border-inline-start: 3px solid var(--linie-stark); padding-inline-start: .6rem; }
  .anhang p { margin: .25rem 0; }
</style>
