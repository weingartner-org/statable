<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { variablenAusPlan, type FragebogenPlan } from '../lib/fragebogenplan';
  import { benenneVariable, beschrifteVariable, herkunftText, labelAenderbar, nameAenderbar } from '../lib/fragebogenplan-editor';
  import { anzeigeSprache } from '../lib/fragebogen-aktionen.svelte';
  import { tue } from '../lib/fragebogen-editor.svelte';

  /**
   * Kodebuch-Ansicht (Fragebogen planen, 2C): die Variablen, die der Plan später im Datensatz ergibt (`variablenAusPlan`).
   * Name und Label einer Frage (oder eines Items) lassen sich hier ändern und wirken auf den Plan; abgeleitete Variablen (Antwortoption, „Anderes“, Kommentar) folgen ihrer Frage.
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  let wahl = $state('');
  const sprache = $derived(plan.sprachen.includes(wahl) ? wahl : anzeigeSprache(plan));
  const variablen = $derived(variablenAusPlan(plan, sprache));
  const NIVEAU = (n: string | undefined) => n === 'nominal' ? L('nominal', 'nominal') : n === 'ordinal' ? L('ordinal', 'ordinal') : n === 'skala' ? L('Skala', 'scale') : '-';
  const werteText = (w: Record<string, string> | undefined) => (w && Object.keys(w).length ? Object.entries(w).map(([k, v]) => `${k} = ${v}`).join('; ') : '-');
  const fehlendText = (f: unknown[] | undefined) => (f?.length ? f.map(x => (typeof x === 'number' ? String(x) : `${(x as { von: number }).von} bis ${(x as { bis: number }).bis}`)).join(', ') : '-');
  const sprachName = (sp: string) => (sp === 'de' ? L('Deutsch', 'German') : sp === 'en' ? L('Englisch', 'English') : sp);
</script>

<section class="kb" aria-label={L('Kodebuch', 'Codebook')}>
  <h2 id="fb-kb-t">{L('Kodebuch', 'Codebook')}</h2>
  <p class="heft-text">{L('Das Kodebuch beschreibt jede Spalte der Daten, die dieser Fragebogen später ergibt: Name, Beschriftung, Antwortwerte, Fehlendcodes und Messniveau. Name und Beschriftung einer Frage können Sie hier ändern; sie wirken auf den Fragebogen.', 'The codebook describes every column of the data this questionnaire will later produce: name, label, answer values, missing codes and level of measurement. You can change the name and label of a question here; the change applies to the questionnaire.')}</p>
  <div class="eingabe" style="max-width:16rem">
    <label for="fb-kb-sprache">{L('Sprache der Beschriftungen', 'Language of the labels')}</label>
    <select id="fb-kb-sprache" value={sprache} onchange={(e) => (wahl = e.currentTarget.value)}>{#each plan.sprachen as sp (sp)}<option value={sp}>{sprachName(sp)}</option>{/each}</select>
  </div>
  {#if variablen.length === 0}
    <p class="heft-text leer">{L('Noch keine Variablen: Fügen Sie Fragen hinzu.', 'No variables yet: add questions.')}</p>
  {:else}
    <div class="rolle" role="region" tabindex="0" aria-label={L('Tabelle des Kodebuchs', 'Codebook table')}>
      <table class="kodebuch">
        <caption class="nur-vorleser">{L('Variablen des Fragebogens', 'Variables of the questionnaire')}</caption>
        <thead><tr>
          <th scope="col">{L('Name', 'Name')}</th><th scope="col">{L('Label (Beschriftung)', 'Label')}</th><th scope="col">{L('Werte', 'Values')}</th>
          <th scope="col">{L('Fehlend', 'Missing')}</th><th scope="col">{L('Niveau', 'Level')}</th><th scope="col">{L('Herkunft', 'Origin')}</th>
        </tr></thead>
        <tbody>
          {#each variablen as v (v.name + '|' + v.quelle.element + '|' + (v.quelle.option ?? '') + '|' + (v.quelle.item ?? '') + '|' + (v.quelle.teil ?? ''))}
            <tr>
              {#if nameAenderbar(v)}
                <th scope="row"><input type="text" aria-label={L(`Name der Variable ${v.name}`, `Name of the variable ${v.name}`)} value={v.name}
                  onchange={(e) => { const n = e.currentTarget.value; tue(L(`Variable „${v.name}“ heißt jetzt „${n.trim()}“.`, `Variable "${v.name}" is now called "${n.trim()}".`), p => benenneVariable(p, v, n)); }}></th>
              {:else}
                <th scope="row">{v.name}</th>
              {/if}
              <td>
                {#if labelAenderbar(v)}
                  <input type="text" lang={sprache} aria-label={L(`Label der Variable ${v.name}`, `Label of the variable ${v.name}`)} value={v.label ?? ''}
                    onchange={(e) => { const t = e.currentTarget.value; tue(L(`Label der Variable „${v.name}“ geändert.`, `Label of the variable "${v.name}" changed.`), p => beschrifteVariable(p, v, sprache, t)); }}>
                {:else}{v.label ?? '-'}{/if}
              </td>
              <td class="werte">{werteText(v.werteLabels)}</td>
              <td>{fehlendText(v.fehlend)}</td>
              <td>{NIVEAU(v.niveau)}</td>
              <td>{herkunftText(v)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .kb { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  .kb h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .leer { color: var(--tinte-2); }
  .rolle { position: relative; overflow-x: auto; max-width: 100%; }
  .rolle:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
  table.kodebuch { border-collapse: collapse; width: 100%; }
  table.kodebuch th, table.kodebuch td { padding: var(--a1) var(--a2); text-align: start; border-bottom: 1px solid var(--linie); vertical-align: top; }
  table.kodebuch input[type='text'] { font: inherit; min-height: var(--ziel); padding: var(--a1) var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); width: 100%; min-width: 9rem; }
  .werte { max-width: 28rem; overflow-wrap: anywhere; }
</style>
