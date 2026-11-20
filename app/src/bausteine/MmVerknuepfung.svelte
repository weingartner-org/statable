<script lang="ts">
  /**
   * Fälle mit dem Datensatz verknüpfen (Stufe A2). Eine Fallvariable der Interviews (z. B. `survey_id`) hat denselben Wert wie eine Spalte der Umfrage.
   * Statable verknüpft nie selbst: Haben Fallvariable und Spalte denselben Namen, sind sie in den Auswahlfeldern vorausgewählt (Voreinstellung, nicht gespeichert).
   * Speichern über `aendere()` (Rückgängig), Ansagen über `sage()`, alle Rechnungen in `lib/mixed.ts`.
   */
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { ganzZahl } from '../i18n/profil';
  import { aendere } from '../lib/kodieren.svelte';
  import { setzeVerknuepfung, verknuepfe, type DatenSicht } from '../lib/mixed';
  import type { QualProjekt } from '../lib/qualprojekt';

  interface Props { q: QualProjekt; daten: DatenSicht }
  let { q, daten }: Props = $props();

  const gleichName = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();
  /**
   * Vorschlag nur als Voreinstellung: Fallvariable und Spalte heißen gleich. Gibt es mehrere solche Paare, zählt nur ein Paar, dessen Name nach einer
   * Kennung aussieht (id, Nummer, Code); sonst wird nichts vorausgewählt, damit Statable nicht raten muss.
   */
  const KENNUNG = /(^|[^a-z])(id|nr|no|nummer|number|code|key)([^a-z]|$)/i;
  const vorschlag = $derived.by(() => {
    const paare: { variable: string; spalte: string; name: string }[] = [];
    for (const v of q.variablen) { const sp = daten.spalten.find(x => gleichName(x.name, v.name)); if (sp) paare.push({ variable: v.id, spalte: sp.name, name: v.name }); }
    const p = paare.length === 1 ? paare[0] : paare.find(x => KENNUNG.test(x.name));
    return p ? { variable: p.variable, spalte: p.spalte } : null;
  });
  let wahlVar = $state('');
  let wahlSpalte = $state('');
  const var0 = $derived(wahlVar && q.variablen.some(v => v.id === wahlVar) ? wahlVar : q.verknuepfung?.variable ?? vorschlag?.variable ?? '');
  const spalte0 = $derived(wahlSpalte && daten.spalten.some(x => x.name === wahlSpalte) ? wahlSpalte : q.verknuepfung?.spalte ?? vorschlag?.spalte ?? '');

  const vk = $derived(q.verknuepfung);
  const erg = $derived(vk ? verknuepfe(q, daten, vk) : undefined);
  const varName = (id: string): string => q.variablen.find(v => v.id === id)?.name ?? '';
  const spaltenName = (n: string): string => { const sp = daten.spalten.find(x => x.name === n); return sp && sp.bezeichnung && sp.bezeichnung !== sp.name ? `${sp.bezeichnung} (${sp.name})` : n; };
  const nVerknuepft = $derived(erg ? Object.keys(erg.zuordnung).length : 0);
  const fallName = (id: string): string => q.faelle.find(f => f.id === id)?.name ?? '';
  const namen = (ids: string[]): string => ids.map(fallName).join(', ');
  const nFaelle = (n: number): string => Lp(n, '1 Fall', `${ganzZahl(n)} Fälle`, '1 case', `${ganzZahl(n)} cases`);

  const problemListen = $derived(erg ? [
    { id: 'ohne-wert', ids: erg.ohneWert, text: (n: string) => L(`Ohne Wert in der Fallvariable: ${n}.`, `No value in the case variable: ${n}.`) },
    { id: 'ohne-treffer', ids: erg.ohneTreffer, text: (n: string) => L(`Ohne Treffer im Datensatz: ${n}.`, `No match in the data set: ${n}.`) },
    { id: 'mehrfach', ids: erg.mehrfach, text: (n: string) => L(`Der Wert kommt im Datensatz mehrfach vor, darum nicht verknüpft: ${n}.`, `The value occurs several times in the data set, so not linked: ${n}.`) },
    { id: 'gleiche-zeile', ids: erg.gleicheZeile, text: (n: string) => L(`Mehrere Fälle auf derselben Zeile des Datensatzes: ${n}.`, `Several cases on the same row of the data set: ${n}.`) },
  ].filter(p => p.ids.length) : []);

  function verknuepfen() {
    if (!var0 || !spalte0) { sage(L('Bitte wählen Sie eine Fallvariable und eine Spalte.', 'Please choose a case variable and a column.'), 'dringend'); return; }
    aendere(L('Verknüpfung wieder zurückgenommen', 'Link undone'), q0 => setzeVerknuepfung(q0, { variable: var0, spalte: spalte0 }));
    const e = verknuepfe(q, daten, { variable: var0, spalte: spalte0 });
    const n = Object.keys(e.zuordnung).length;
    sage(L(`Verknüpft: ${n} von ${q.faelle.length} Fällen. Variable „${varName(var0)}“, Spalte „${spalte0}“.`, `Linked: ${n} of ${q.faelle.length} cases. Variable "${varName(var0)}", column "${spalte0}".`));
  }
  function loesen() {
    aendere(L('Verknüpfung wieder gesetzt', 'Link restored'), q0 => setzeVerknuepfung(q0, undefined));
    wahlVar = ''; wahlSpalte = '';
    sage(L('Verknüpfung gelöst.', 'Link removed.'));
  }
</script>

<div class="mm-teil">
  <h4 id="ko-mm-vk-t" tabindex="-1">{L('Fälle mit dem Datensatz verknüpfen (Verknüpfung)', 'Link cases with the data set (linking)')}</h4>
  <p class="hilfe">{L('Verknüpfen heißt: Eine Fallvariable Ihrer Interviews hat denselben Wert wie eine Spalte der Umfrage, zum Beispiel eine Nummer wie survey_id. So gehören Interview und Antworten derselben Person zusammen. Statable verknüpft nie von selbst.', 'Linking means: a case variable of your interviews has the same value as a column of the survey, for example a number like survey_id. This way an interview and the answers of the same person belong together. Statable never links by itself.')}</p>

  {#if !q.variablen.length}
    <p>{L('Es gibt noch keine Fallvariablen. Legen Sie zuerst unter „Fälle und Variablen“ eine Variable an, zum Beispiel survey_id, und tragen Sie sie bei den Fällen ein.', 'There are no case variables yet. First create a variable under "Cases and variables", for example survey_id, and enter it for the cases.')}</p>
  {:else if !daten.spalten.length}
    <p>{L('Öffnen Sie zuerst Daten (die Umfrage) in Statable. Dann können Sie hier eine Spalte wählen.', 'Open data (the survey) in Statable first. Then you can choose a column here.')}</p>
  {:else}
    <div class="felder">
      <div class="feld">
        <label for="ko-mm-vk-var">{L('Fallvariable der Interviews', 'Case variable of the interviews')}</label>
        <select id="ko-mm-vk-var" value={var0} onchange={e => (wahlVar = e.currentTarget.value)}>
          <option value="">{L('bitte wählen', 'please choose')}</option>
          {#each q.variablen as v (v.id)}<option value={v.id}>{v.name}</option>{/each}
        </select>
      </div>
      <div class="feld">
        <label for="ko-mm-vk-sp">{L('Spalte im Datensatz', 'Column in the data set')}</label>
        <select id="ko-mm-vk-sp" value={spalte0} onchange={e => (wahlSpalte = e.currentTarget.value)}>
          <option value="">{L('bitte wählen', 'please choose')}</option>
          {#each daten.spalten as sp (sp.name)}<option value={sp.name}>{sp.bezeichnung && sp.bezeichnung !== sp.name ? `${sp.bezeichnung} (${sp.name})` : sp.name}</option>{/each}
        </select>
      </div>
    </div>
    {#if vorschlag && !vk && !wahlVar && !wahlSpalte}
      <p class="hilfe">{L(`Vorausgewählt, weil beide „${varName(vorschlag.variable)}“ heißen. Prüfen Sie das und ändern Sie es, wenn es nicht passt.`, `Preselected because both are called "${varName(vorschlag.variable)}". Check it and change it if it does not fit.`)}</p>
    {/if}
    <div class="knopfzeile">
      <button class="k haupt" id="ko-mm-vk-knopf" type="button" onclick={verknuepfen}>{L('Verknüpfen', 'Link')}</button>
      {#if vk}<button class="k" id="ko-mm-vk-los" type="button" onclick={loesen}>{L('Verknüpfung lösen', 'Remove link')}</button>{/if}
    </div>
  {/if}

  {#if vk && erg}
    <div class="ergebnis">
      <h5 id="ko-mm-vk-erg-t">{L('Ergebnis der Verknüpfung', 'Result of the link')}</h5>
      <p id="ko-mm-vk-erg">{L(`Fallvariable „${varName(vk.variable)}“ und Spalte „${spaltenName(vk.spalte)}“.`, `Case variable "${varName(vk.variable)}" and column "${spaltenName(vk.spalte)}".`)}
        {#if erg.spalteFehlt}{L('Diese Spalte gibt es im geöffneten Datensatz nicht (mehr). Öffnen Sie den passenden Datensatz oder wählen Sie eine andere Spalte.', 'This column does not exist (any more) in the open data set. Open the matching data set or choose another column.')}
        {:else}{L(`${nVerknuepft} von ${q.faelle.length} Fällen verknüpft.`, `${nVerknuepft} of ${q.faelle.length} cases linked.`)}{/if}</p>
      {#if problemListen.length}
        <ul class="liste" aria-labelledby="ko-mm-vk-erg-t">
          {#each problemListen as p (p.id)}<li data-nolink>{p.text(namen(p.ids))}</li>{/each}
        </ul>
      {/if}
      {#if !erg.spalteFehlt && q.faelle.length}
        <details>
          <summary>{L(`Tabelle: Fall, Wert und Zeile im Datensatz (${nFaelle(q.faelle.length)})`, `Table: case, value and row in the data set (${nFaelle(q.faelle.length)})`)}</summary>
          <div class="rahmen" role="region" tabindex="0" aria-label={L('Verknüpfung je Fall, seitlich scrollbar', 'Link per case, scrollable sideways')}>
            <table class="tab">
              <caption class="nur-vorleser">{L('Verknüpfung: je Fall der Wert der Fallvariable und die Zeile im Datensatz', 'Link: for each case the value of the case variable and the row in the data set')}</caption>
              <thead><tr><th scope="col">{L('Fall', 'Case')}</th><th scope="col">{L('Wert', 'Value')}</th><th scope="col">{L('Zeile im Datensatz', 'Row in the data set')}</th></tr></thead>
              <tbody>
                {#each q.faelle as f (f.id)}
                  {@const zeile = erg.zuordnung[f.id]}
                  <tr>
                    <th scope="row" data-nolink>{f.name}</th>
                    <td data-nolink>{f.werte[vk.variable] === undefined || f.werte[vk.variable] === null || String(f.werte[vk.variable]).trim() === '' ? L('(kein Wert)', '(no value)') : String(f.werte[vk.variable])}</td>
                    <td>{zeile !== undefined ? ganzZahl(zeile + 1) : erg.mehrfach.includes(f.id) ? L('mehrfach, nicht verknüpft', 'several, not linked') : L('nicht verknüpft', 'not linked')}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </details>
      {/if}
    </div>
  {/if}
</div>

<style>
  .mm-teil { display: flex; flex-direction: column; gap: var(--a2); min-width: 0; }
  h4 { margin: 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  h5 { margin: 0; font: 650 var(--gr-klein, 0.9rem)/1.3 var(--schrift-ui); }
  p { margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); }
  .felder { display: flex; flex-wrap: wrap; gap: var(--a3); }
  .feld { display: flex; flex-direction: column; gap: var(--a1); min-width: min(100%, 16rem); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .ergebnis { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); }
  .liste { margin: 0; padding-inline-start: var(--a4, 1.5rem); }
  summary { cursor: pointer; font-weight: 600; }
  .rahmen { overflow-x: auto; margin-top: var(--a2); }
  .rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: top; }
  .tab thead th { font-weight: 650; }
  .tab tbody th { font-weight: 600; }
</style>
