<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { L, Lp, melde, spalteNach } from '../lib/sitzung.svelte';
  import { frageVorschlag } from '../lib/beispielvorschlag.svelte';
  import { exportiereTabelleWord, herunterladen } from '../lib/export';
  import { dateiname } from '../lib/dateiname';
  import { kopiereTabelleApa } from '../lib/tabellenexport';
  import { tabelleAlsExcel } from '../lib/tabellenexcel';
  import { tabellenTitel, type Berechnet } from '../lib/tabellenblatt';
  import { pruefKarte, type TabellenWahl } from '../lib/tabellenwahl';
  import { Laedt } from '../lib/laedt.svelte';
  import { lesbar } from '../lib/verzeichnis';
  import { zitat } from '../i18n/profil';
  import Ausgabe from './Ausgabe.svelte';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * Die fertige Tabelle von „Tabelle zusammenstellen“ mit ihren Hinweisen, den Knöpfen zum Mitnehmen (Word, Excel) und, je Frage, dem Knopf
   * „Diese Frage genauer prüfen“, der die passende Karte mit Frage und Gruppe öffnet. Die Tabelle selbst enthält keinen Test und keine Buchstaben (Entscheidung Opus 2).
   * Dieselbe Anzeige steht auf der Seite „Tabelle zusammenstellen“ (Vorschau) und im Blatt.
   */
  let { r, wahl }: { r: Berechnet; wahl: TabellenWahl } = $props();
  const excel = new Laedt(), word = new Laedt(), kopie = new Laedt();

  async function alsExcel() {
    if (r.art !== 'ok') return;
    await excel.mit(async () => {
      const bytes = await tabelleAlsExcel(r.e, r.fuss, tabellenTitel(wahl));
      herunterladen(bytes, `${dateiname(tabellenTitel(wahl))}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      melde(L('Excel-Datei gespeichert. Sie liegt bei den Downloads. Die Zahlen stehen als Zahlen darin.', 'Excel file saved. You will find it in your downloads. The numbers are numbers in it.'));
    });
  }
  async function alsWord() { if (r.art === 'ok') await word.mit(() => exportiereTabelleWord(r.item)); }
  async function fuerWord() {
    if (r.art !== 'ok') return;
    await kopie.mit(async () => { const n = await kopiereTabelleApa(r.item); melde(n ? L(`Tabelle kopiert als „Tabelle ${n}“ - in Word einfügen.`, `Table copied as "Table ${n}" - paste it into Word.`) : L('Kopieren ging nicht. Die Word-Datei geht trotzdem.', "Copying didn't work. The Word file still works.")); });
  }
  const frageName = (id: string) => lesbar(spalteNach(id), true) || id;
  function pruefen(i: number) {
    const a = wahl.auswahl[i]; if (!a) return;
    frageVorschlag.v = pruefKarte(a, wahl.gruppe);
    location.hash = 'blatt/neu';
  }
</script>

{#if r.art === 'ok'}
  <div class="ta-tabelle"><Ausgabe items={[r.item]} nurTabellen ohneMenue /></div>
  <div class="knopfzeile ta-export" role="group" aria-label={L('Tabelle mitnehmen', 'Take the table with you')}>
    <button class="k" type="button" aria-disabled={kopie.aktiv ? 'true' : undefined} onclick={fuerWord}>{#if kopie.sichtbar}<Rechnet imKnopf />{:else}<Icon n="kopieren" />{/if}{L('In Word kopieren (APA)', 'Copy for Word (APA)')}</button>
    <button class="k" type="button" aria-disabled={word.aktiv ? 'true' : undefined} onclick={alsWord}>{#if word.sichtbar}<Rechnet imKnopf />{:else}<Icon n="download" />{/if}{L('Als Word-Datei', 'As Word file')}</button>
    <button class="k" type="button" aria-disabled={excel.aktiv ? 'true' : undefined} data-tipp={L('Die Zahlen stehen als Zahlen in der Datei, ungerundet; Anzahl und Prozent in getrennten Spalten.', 'The numbers are numbers in the file, unrounded; counts and percentages in separate columns.')} onclick={alsExcel}>{#if excel.sichtbar}<Rechnet imKnopf />{:else}<Icon n="download" />{/if}{L('Als Excel-Datei (Zahlen als Zahlen)', 'As Excel file (numbers as numbers)')}</button>
  </div>
  {#if r.hilfe.length}
    <ul class="ta-hilfe" aria-label={L('Zum Lesen der Tabelle', 'Reading the table')}>{#each r.hilfe as h}<li><Icon n="info" k="hw" /><span>{h}</span></li>{/each}</ul>
  {/if}
  {#if wahl.auswahl.length}
    <section class="ta-pruefen" aria-labelledby="ta-pr-t">
      <h3 id="ta-pr-t">{L('Eine Frage genauer ansehen', 'Look at a question more closely')}</h3>
      <p class="ta-klein">{L('Die Tabelle beschreibt nur. Ob ein Unterschied zwischen den Gruppen echt ist, prüft eine eigene Auswertung - sie öffnet mit der Frage und der Gruppe schon ausgefüllt.', 'The table only describes. Whether a difference between the groups is real is checked by an analysis of its own - it opens with the question and the group already filled in.')}</p>
      <ul>{#each wahl.auswahl as a, i (a.id)}{#if !(a.anzeige === 'top' && !a.stufen.length)}
        <li><span class="ta-name">{frageName(a.id)}</span>
          <button class="k leise" type="button" aria-label={L(`Diese Frage genauer prüfen: ${zitat(frageName(a.id))}`, `Check this question more closely: ${zitat(frageName(a.id))}`)} onclick={() => pruefen(i)}>{L('Diese Frage genauer prüfen', 'Check this question more closely')}</button></li>{/if}{/each}</ul>
    </section>
  {/if}
{:else if r.art === 'leer'}
  <p class="ta-klein" use:ergebnisAnsage>{r.grund === 'gruppe'
    ? L('Die Tabelle erscheint, sobald eine Gruppe (Spalten) und mindestens eine Frage (Zeilen) gewählt sind.', 'The table appears as soon as a group (columns) and at least one question (rows) are chosen.')
    : L('Jetzt mindestens eine Frage wählen. Die Tabelle erscheint sofort.', 'Now choose at least one question. The table appears right away.')}
    {#if r.ohneStufen.length}{' '}{Lp(r.ohneStufen.length, 'Für die Top-Box fehlen noch die Stufen.', 'Für die Top-Boxen fehlen noch die Stufen.', 'The levels for the top box are still missing.', 'The levels for the top boxes are still missing.')}{/if}</p>
{:else}
  <p class="ta-fehler" role="alert">{r.text}</p>
{/if}

<style>
  .ta-tabelle { min-width: 0; max-width: 100%; }
  .ta-export { margin-top: var(--a2); }
  .ta-hilfe { list-style: none; padding: 0; margin: var(--a3) 0 0; display: flex; flex-direction: column; gap: var(--a2); max-width: var(--breite-text); }
  .ta-hilfe li { display: flex; gap: var(--a2); align-items: flex-start; }
  .ta-hilfe :global(.ico) { flex: none; margin-top: 3px; }
  .ta-pruefen { margin-top: var(--a4); border-top: 1px solid var(--linie); padding-top: var(--a3); }
  .ta-pruefen h3 { font: 650 var(--gr-text)/1.3 var(--schrift-ui); margin-bottom: var(--a2); }
  .ta-pruefen ul { list-style: none; padding: 0; margin: var(--a2) 0 0; display: flex; flex-direction: column; gap: var(--a1); }
  .ta-pruefen li { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a3); align-items: center; justify-content: space-between; border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a1) var(--a3); max-width: 720px; }
  .ta-name { min-width: 0; overflow-wrap: anywhere; }
  .ta-klein { color: var(--tinte-2); max-width: var(--breite-text); }
  .ta-fehler { color: var(--verlust); max-width: var(--breite-text); }
</style>
