<script lang="ts">
  import { L, melde } from '../lib/sitzung.svelte';
  import { exportiereTabelleWord } from '../lib/export';
  import { amtlichAlsExcel } from '../lib/amtlichexport';
  import { kopiereTabelleApa } from '../lib/tabellenexport';
  import type { AmtlichBerechnet } from '../lib/amtlichblatt';
  import { Laedt } from '../lib/laedt.svelte';
  import Ausgabe from './Ausgabe.svelte';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * Die fertige „Tabelle für die Veröffentlichung“: die Tabelle (nur die veröffentlichbare Fassung, mit Zeichenerklärung, Fußnoten und Quelle), die Knöpfe zum Mitnehmen (Word, Excel)
   * und, eingeklappt, das Prüfprotokoll. Das Prüfprotokoll ist NUR zum Ansehen: es kommt in keinen Export und nicht in den Bericht (Fallzahlen gesperrter Zellen!).
   * Dieselbe Anzeige steht auf der Seite „Tabelle für die Veröffentlichung“ (Vorschau) und im Blatt.
   */
  let { r }: { r: Extract<AmtlichBerechnet, { art: 'ok' }> } = $props();
  const excel = new Laedt(), word = new Laedt(), kopie = new Laedt();
  async function fuerWord() {
    await kopie.mit(async () => { const n = await kopiereTabelleApa(r.item); melde(n ? L(`Tabelle kopiert als „Tabelle ${n}“ - in Word einfügen.`, `Table copied as "Table ${n}" - paste it into Word.`) : L('Kopieren ging nicht. Die Word-Datei geht trotzdem.', "Copying didn't work. The Word file still works.")); });
  }
  const p = $derived(r.t.protokoll);
  const R = $derived(r.t.zeilenName.length);
  const C = $derived(r.t.hatSpalte ? r.t.spaltenName.length : 1);
</script>

<div class="am-tabelle"><Ausgabe items={[r.item]} nurTabellen ohneMenue /></div>
<div class="knopfzeile am-export" role="group" aria-label={L('Tabelle mitnehmen', 'Take the table with you')}>
  <button class="k" type="button" aria-disabled={kopie.aktiv ? 'true' : undefined} onclick={fuerWord}>{#if kopie.sichtbar}<Rechnet imKnopf />{:else}<Icon n="kopieren" />{/if}{L('In Word kopieren (APA)', 'Copy for Word (APA)')}</button>
  <button class="k" type="button" aria-disabled={word.aktiv ? 'true' : undefined} onclick={() => word.mit(() => exportiereTabelleWord(r.item))}>{#if word.sichtbar}<Rechnet imKnopf />{:else}<Icon n="download" />{/if}{L('Als Word-Datei', 'As Word file')}</button>
  <button class="k" type="button" aria-disabled={excel.aktiv ? 'true' : undefined} onclick={() => excel.mit(() => amtlichAlsExcel(r.item, r.weg !== 'js'))}>{#if excel.sichtbar}<Rechnet imKnopf />{:else}<Icon n="download" />{/if}{L('Als Excel-Datei', 'As Excel file')}</button>
</div>
{#if r.t.hilfe.length}
  <ul class="am-hilfe" aria-label={L('Zum Lesen der Tabelle', 'Reading the table')}>{#each r.t.hilfe as h}<li><Icon n="info" k="hw" /><span>{h}</span></li>{/each}</ul>
{/if}
{#if r.t.geheim || r.t.rund}
  <details class="auf am-protokoll"><summary>{L('Prüfprotokoll (nicht veröffentlichen)', 'Check log (do not publish)')}</summary>
    <div class="am-protokoll-in">
      <p class="am-klein">{L('Das Prüfprotokoll nennt Fallzahlen gesperrter Zellen. Es steht nicht in der Tabelle, nicht im Bericht und in keiner Datei zum Mitnehmen.', 'The check log names case counts of suppressed cells. It is not in the table, not in the report and not in any file you take with you.')}</p>
      {#if p.saetze.length}<ul class="am-saetze">{#each p.saetze as t}<li>{t}</li>{/each}</ul>{/if}
      {#if p.sperren.length}
        <h4>{L('Gesperrte Zellen', 'Suppressed cells')}</h4>
        <div class="am-rolle"><table>
          <thead><tr><th scope="col">{L('Zeile', 'Row')}</th><th scope="col">{L('Spalte', 'Column')}</th><th scope="col">{L('Art', 'Kind')}</th><th scope="col">{L('Grund', 'Reason')}</th><th scope="col">{L('Fälle', 'Cases')}</th><th scope="col">{L('Eingrenzung', 'Narrowed to')}</th></tr></thead>
          <tbody>{#each p.sperren as z}<tr><th scope="row">{z.zeile}</th><td>{z.spalte}</td><td>{z.art === 'primaer' ? L('zu klein', 'too small') : L('zusätzlich', 'additional')}</td><td>{z.grund}</td><td class="zahl">{z.n}</td><td class="zahl">{z.intervall ?? '-'}</td></tr>{/each}</tbody>
        </table></div>
      {/if}
      <h4>{L('Fälle je Zelle (ungewichtet)', 'Cases per cell (unweighted)')}</h4>
      <div class="am-rolle"><table>
        <thead><tr><th scope="col"><span class="nur-vorleser">{L('Zeile', 'Row')}</span></th>{#each Array(C + 1) as _, j}<th scope="col">{r.t.hatSpalte && j < C ? r.t.spaltenName[j] : L('Insgesamt', 'Total')}</th>{/each}</tr></thead>
        <tbody>{#each Array(R + 1) as _, i}<tr><th scope="row">{i < R ? r.t.zeilenName[i] : L('Insgesamt', 'Total')}</th>{#each Array(C + 1) as _, j}<td class="zahl" class:gesperrt={r.t.zellen[i]![r.t.hatSpalte ? j : 0]!.gesperrt}>{p.fallzahlen[i]![j]}</td>{/each}</tr>{/each}</tbody>
      </table></div>
    </div>
  </details>
{/if}

<style>
  .am-tabelle { min-width: 0; max-width: 100%; }
  .am-export { margin-top: var(--a2); }
  .am-hilfe { list-style: none; padding: 0; margin: var(--a3) 0 0; display: flex; flex-direction: column; gap: var(--a2); max-width: var(--breite-text); }
  .am-hilfe li { display: flex; gap: var(--a2); align-items: flex-start; }
  .am-hilfe :global(.ico) { flex: none; margin-top: 3px; }
  .am-protokoll { margin-top: var(--a4); }
  .am-protokoll-in { padding-top: var(--a2); display: flex; flex-direction: column; gap: var(--a2); min-width: 0; }
  .am-protokoll h4 { font: 650 var(--gr-text)/1.3 var(--schrift-ui); margin: var(--a2) 0 0; }
  .am-klein { color: var(--tinte-2); max-width: var(--breite-text); }
  .am-saetze { margin: 0; padding-inline-start: 1.2em; max-width: var(--breite-text); }
  .am-rolle { overflow-x: auto; max-width: 100%; }
  table { border-collapse: collapse; font-size: var(--gr-klein); }
  th, td { border-bottom: 1px solid var(--linie); padding: var(--a1) var(--a3); text-align: start; white-space: nowrap; }
  td.zahl, thead th:not(:first-child) { text-align: right; }
  td.gesperrt { color: var(--verlust); font-weight: 650; }
</style>
