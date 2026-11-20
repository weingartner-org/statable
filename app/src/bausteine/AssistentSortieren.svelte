<script lang="ts">
  import { s, L } from '../lib/sitzung.svelte';
  import { sortiereMitMeldung } from '../lib/datenschritte.svelte';
  import type { Spalte } from '../lib/verzeichnis';
  import type { Wert } from '../lib/eingabe';
  import { freierName } from '../lib/skalabau';
  import { sortiereReihenfolge, type SortSchluessel } from '../lib/datenassistentc';
  import { anzeigeWert, fehlerSatz, spaltenOption } from '../lib/datenassistentsaetze';
  import { Laedt } from '../lib/laedt.svelte';
  import AssistentRahmen from './AssistentRahmen.svelte';

  /**
   * „Sortieren“ (Später S-C, Fachblatt 4.3): die Vorschau zeigt die Reihenfolge, ohne etwas zu ändern („Ansicht“); „Dauerhaft sortieren“ ordnet die Zeilen der Datei neu
   * (alle Spalten, auch das Fallgewicht, gehen mit; ein Rückgängig-Schritt). Text in deutscher Reihenfolge, fehlende Werte immer am Ende, Gleichstände bleiben in der alten Reihenfolge.
   */
  const daten = $derived({ spalten: $state.snapshot(s.spalten) as Spalte[], zeilen: s.zeilen as Wert[][] });
  let schluessel = $state<{ spalte: string; richtung: 'auf' | 'ab'; natuerlich: boolean }[]>([{ spalte: '', richtung: 'auf', natuerlich: false }]);
  let altNummer = $state(false);
  let altName = $state<string | null>(null);
  const altVorschlag = $derived(freierName('fallnr_alt', s.spalten.map(x => x.name)));
  const gueltig = $derived<SortSchluessel[]>(schluessel.filter(k => k.spalte).map(k => ({ spalte: k.spalte, richtung: k.richtung, natuerlich: k.natuerlich })));
  const ergebnis = $derived.by((): { reihenfolge: number[] } | { problem: string } => {
    if (!gueltig.length) return { problem: L('Mindestens eine Spalte wählen, nach der sortiert wird.', 'Choose at least one column to sort by.') };
    try { return { reihenfolge: sortiereReihenfolge(daten, gueltig) }; } catch (f) { return { problem: fehlerSatz(f) }; }
  });
  const reihenfolge = $derived('reihenfolge' in ergebnis ? ergebnis.reihenfolge : []);
  const zeigeSp = $derived(gueltig.map(k => daten.spalten.find(c => c.name === k.spalte)!).filter(Boolean));
  const lad = new Laedt();
  async function anwenden() {
    if (!gueltig.length) return;
    await lad.mit(() => sortiereMitMeldung(gueltig, altNummer ? (altName ?? altVorschlag) : null));
  }
  function plus() { schluessel = [...schluessel, { spalte: '', richtung: 'auf', natuerlich: false }]; }
</script>

<AssistentRahmen id="sortieren" titel={L('Sortieren', 'Sort')} befehlName={L('Sortieren', 'Sort')}
  einleitung={L('Die Zeilen nach einer oder mehreren Spalten ordnen. Die Vorschau zeigt die neue Reihenfolge, ohne etwas zu ändern. Erst „Dauerhaft sortieren“ ordnet die Datei neu.', 'Order the rows by one or more columns. The preview shows the new order without changing anything. Only "Sort permanently" reorders the file.')}
  problem={'problem' in ergebnis ? ergebnis.problem : ''}
  hinweise={[L('Fehlende Werte stehen immer am Ende, auch bei absteigender Reihenfolge (SPSS stellt sie je nach Richtung nach vorn). Text wird deutsch geordnet: Ä steht bei A.', 'Missing values always come last, also in descending order (SPSS puts them first depending on the direction). Text is ordered in German: Ä comes with A.'),
    L('Danach ändern sich die Zeilennummern.', 'Afterwards the row numbers change.')]}
  anwendenText={L('Dauerhaft sortieren', 'Sort permanently')} anwenden={anwenden} kannAnwenden={gueltig.length > 0} laeuft={lad.sichtbar}>
  {#snippet haupt()}
    <fieldset class="as-gruppe"><legend>{L('Sortieren nach', 'Sort by')}</legend>
      <ul class="as-regeln bed">{#each schluessel as k, i}
        <li><select aria-label={L(`Spalte ${i + 1}`, `Column ${i + 1}`)} bind:value={k.spalte}><option value="">{L('Spalte wählen', 'Choose a column')}</option>{#each s.spalten as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select>
          <select aria-label={L(`Richtung ${i + 1}`, `Direction ${i + 1}`)} bind:value={k.richtung}><option value="auf">{L('aufsteigend', 'ascending')}</option><option value="ab">{L('absteigend', 'descending')}</option></select>
          <label class="as-eins"><input type="checkbox" bind:checked={k.natuerlich}>{L('Zahlen im Text als Zahlen (1, 2, 10)', 'Numbers in text as numbers (1, 2, 10)')}</label>
          {#if schluessel.length > 1}<button class="k leise nur-symbol" type="button" aria-label={L(`Schlüssel ${i + 1} entfernen`, `Remove key ${i + 1}`)} onclick={() => (schluessel = schluessel.filter((_, n) => n !== i))}>×</button>{:else}<span></span>{/if}</li>{/each}</ul>
      <div class="knopfzeile"><button class="k leise" type="button" onclick={plus}>{L('Weitere Spalte', 'Another column')}</button></div>
    </fieldset>
    <div class="as-feld"><label class="as-eins"><input type="checkbox" bind:checked={altNummer}>{L('Die alte Zeilennummer in einer neuen Spalte festhalten', 'Keep the old row number in a new column')}</label>
      {#if altNummer}<input type="text" autocomplete="off" aria-label={L('Name der Spalte mit der alten Zeilennummer', 'Name of the column with the old row number')} value={altName ?? altVorschlag} oninput={(e) => (altName = e.currentTarget.value)}>{/if}</div>
  {/snippet}
  {#snippet vorschau()}
    {#if reihenfolge.length}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Reihenfolge, die ersten 10 Fälle', 'Order, the first 10 cases')}>
        <table class="as-tab"><thead><tr><th scope="col" class="zahl">{L('bisher Zeile', 'was row')}</th>{#each zeigeSp as c}<th scope="col">{c.name}</th>{/each}</tr></thead>
          <tbody>{#each reihenfolge.slice(0, 10) as i}<tr><td class="zahl">{i + 1}</td>{#each zeigeSp as c}<td class:zahl={typeof daten.zeilen[i]![daten.spalten.indexOf(c)] === 'number'}>{anzeigeWert(c, daten.zeilen[i]![daten.spalten.indexOf(c)] ?? null)}</td>{/each}</tr>{/each}</tbody></table></div>
    {:else}<p class="as-hilfe">{L('Die Vorschau erscheint, sobald eine Spalte gewählt ist.', 'The preview appears as soon as a column is chosen.')}</p>{/if}
  {/snippet}
</AssistentRahmen>
