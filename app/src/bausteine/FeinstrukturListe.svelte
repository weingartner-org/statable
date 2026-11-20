<script lang="ts">
  /** Liste der Feinstrukturanalysen im Projekt (Seite Interviews): Name, Transkript, Stand, Öffnen, Löschen mit Rückfrage als Text. */
  import { tick } from 'svelte';
  import { L, Lp, s } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { eigeneSpaltensaetze, entferneSequenzanalyse, iv, qualProjekt, sequenzanalysen } from '../lib/interviews.svelte';
  import type { Sequenzanalyse } from '../lib/qualprojekt';
  import { satzFuer, spaltenText } from '../lib/feinstruktur-spalten';
  import FeinstrukturGruppe from './FeinstrukturGruppe.svelte';

  const liste = $derived(sequenzanalysen());
  const dokName = (id?: string) => (id ? qualProjekt()?.dokumente.find(x => x.id === id)?.name : undefined) ?? L('ohne Transkript', 'without transcript');
  /** Herkunft (F3c): eingelesen oder zusammengeführt; die Quellen nur als Namen, wenn sie im Projekt sind. */
  function herkunft(a: Sequenzanalyse): string {
    if (a.herkunft?.art === 'eingelesen') return L(' - eingelesen', ' - read in') + (a.gruppe?.name ? L(` (Gruppe „${a.gruppe.name}“)`, ` (group “${a.gruppe.name}”)`) : '');
    if (a.herkunft?.art === 'zusammengefuehrt') return L(' - zusammengeführt', ' - merged') + (a.gruppe?.name ? ` (${a.gruppe.name})` : '');
    return '';
  }
  /** A4: bei einem anderen Spaltensatz als der Feinstruktur dessen Name, damit man die Analysen auseinanderhält. */
  const satzName = (a: Sequenzanalyse): string => ((a.spaltensatz ?? 'feinstruktur') === 'feinstruktur' ? '' : ` - ${spaltenText(satzFuer(a, eigeneSpaltensaetze()).name, s.einst.sprache)}`);
  let loeschen = $state<string | null>(null);

  const oeffnen = (id: string) => { iv.feinstruktur = id; };
  async function ja(id: string, name: string) {
    entferneSequenzanalyse(id); loeschen = null;
    sage(L(`Feinstrukturanalyse „${name}“ gelöscht.`, `Fine structure analysis "${name}" deleted.`));
    await tick(); document.getElementById('iv-fein-t')?.focus();
  }
</script>

<div class="fl">
  <p class="hilfe">{L('Statable deutet nichts und macht keine Vorschläge. Sie teilen den Ausschnitt in Sinneinheiten ein und deuten sie Schritt für Schritt. Beginnen Sie mit „Feinstrukturanalyse beginnen“ bei einem Transkript.', 'Statable interprets nothing and makes no suggestions. You divide the excerpt into units of meaning and interpret them step by step. Start with "Start fine structure analysis" at a transcript.')}</p>
  <p class="hilfe">{L('Für andere Sequenzverfahren (Interpretative Phänomenologische Analyse, Objektive Hermeneutik, Dokumentarische Methode, Gesprächsanalyse) wählen Sie beim Anlegen andere Spalten (Spaltensatz) oder legen eigene an.', 'For other sequential methods (interpretative phenomenological analysis, objective hermeneutics, documentary method, conversation analysis) choose other columns (column set) when creating the analysis, or create your own.')}</p>
  {#if !liste.length}
    <p>{L('Noch keine Feinstrukturanalyse.', 'No fine structure analysis yet.')}</p>
  {:else}
    <ul class="liste" aria-label={L('Feinstrukturanalysen', 'Fine structure analyses')}>
      {#each liste as a (a.id)}
        {@const gedeutet = a.einheiten.filter(e => e.gedeutet).length}
        <li>
          <div><strong>{a.name}</strong> - {L('Transkript: ', 'Transcript: ')}{dokName(a.dokument)}{satzName(a)}{herkunft(a)} - {a.phase === 'deuten' ? L(`${gedeutet} von ${a.einheiten.length} gedeutet`, `${gedeutet} of ${a.einheiten.length} interpreted`) : L(`Einteilen (${a.einheiten.length} Sinneinheiten)`, `Dividing (${a.einheiten.length} units)`)}</div>
          {#if loeschen === a.id}
            <div class="rueck" role="group" aria-label={L('Rückfrage zum Löschen', 'Question about deleting')}>
              <p id="fe-lo-{a.id}">{L(`Feinstrukturanalyse „${a.name}“ mit allen Deutungen löschen? Das lässt sich nicht rückgängig machen.`, `Delete the fine structure analysis "${a.name}" with all interpretations? This cannot be undone.`)}</p>
              <div class="zeile">
                <button type="button" class="k" aria-describedby="fe-lo-{a.id}" onclick={() => void ja(a.id, a.name)}>{L('Löschen', 'Delete')}</button>
                <button type="button" class="k nein" aria-describedby="fe-lo-{a.id}" onclick={() => { loeschen = null; sage(L('Nicht gelöscht.', 'Not deleted.')); }}>{L('Nicht löschen', 'Do not delete')}</button>
              </div>
            </div>
          {:else}
            <div class="zeile">
              <button type="button" class="k klein" aria-label="{L('Öffnen', 'Open')}: {a.name}" onclick={() => oeffnen(a.id)}>{L('Öffnen', 'Open')}</button>
              <button type="button" class="k klein leise" aria-label="{L('Löschen', 'Delete')}: {a.name}" onclick={() => { loeschen = a.id; }}>{L('Löschen', 'Delete')}</button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
    <p class="hilfe">{Lp(liste.length, '1 Feinstrukturanalyse.', `${liste.length} Feinstrukturanalysen.`, '1 fine structure analysis.', `${liste.length} fine structure analyses.`)}</p>
  {/if}
  <FeinstrukturGruppe />
</div>

<style>
  .fl { display: flex; flex-direction: column; gap: .5rem; }
  .hilfe { color: var(--tinte-2); margin: 0; }
  .liste { list-style: none; padding: 0; margin: 0; display: grid; gap: .75rem; }
  .zeile { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .25rem; }
  .rueck { border: 1px solid var(--akzent); border-radius: var(--r-klein); padding: .5rem; margin-top: .25rem; }
</style>
