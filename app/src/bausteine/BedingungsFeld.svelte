<script lang="ts" module>
  import type { Spalte } from '../lib/verzeichnis';
  import { L } from '../lib/sitzung.svelte';
  import type { Teilbedingung, Vergleich } from '../lib/datenassistent';

  /** Eine Zeile der Bedingung, wie sie im Formular steht (der Wert noch als Text). */
  export interface BedingungsZeile { id: number; spalte: string; op: Vergleich; wert: string }
  let zaehler = 0;
  export const neueBedingung = (spalte = ''): BedingungsZeile => ({ id: ++zaehler, spalte, op: '=', wert: '' });

  /** Die Zeilen als Teilbedingungen für `bedingung()`; ein Satz, wenn etwas fehlt oder eine Zahl keine ist. Leere Liste → keine Bedingung. */
  export function bedingungsTeile(zeilen: BedingungsZeile[], spalten: Spalte[]): { teile: Teilbedingung[] } | { problem: string } {
    const teile: Teilbedingung[] = [];
    for (const [i, z] of zeilen.entries()) {
      const sp = spalten.find(c => c.name === z.spalte);
      if (!sp) return { problem: L(`In Bedingung ${i + 1} fehlt die Spalte.`, `Condition ${i + 1} has no column.`) };
      if (z.wert.trim() === '') return { problem: L(`In Bedingung ${i + 1} fehlt der Wert.`, `Condition ${i + 1} has no value.`) };
      if (sp.art === 'zahl') {
        const t = z.wert.trim().replace(',', '.');
        if (!/^-?\d+(\.\d+)?$/.test(t)) return { problem: L(`In Bedingung ${i + 1} muss bei „${sp.name}“ eine Zahl stehen.`, `Condition ${i + 1} needs a number for "${sp.name}".`) };
        teile.push({ spalte: sp.name, op: z.op, wert: Number(t) });
      } else teile.push({ spalte: sp.name, op: z.op, wert: z.wert.trim() });
    }
    return { teile };
  }
</script>
<script lang="ts">
  import { spaltenOption } from '../lib/datenassistentsaetze';

  /**
   * „Nur wenn …“ für Berechnen und Fälle auswählen: eine oder mehrere Bedingungen „Spalte, Vergleich, Wert“, verbunden mit UND oder ODER.
   * Hat die Spalte Wertelabels (1 = weiblich), wählt man den Wert aus der Liste.
   */
  let { zeilen = $bindable(), verknuepfung = $bindable('AND'), spalten, id, mindestens = 0 }: {
    zeilen: BedingungsZeile[]; verknuepfung: 'AND' | 'OR'; spalten: Spalte[]; id: string;
    /** so viele Zeilen sind nicht entfernbar (Fälle auswählen braucht eine) */
    mindestens?: number;
  } = $props();

  const OPS: { op: Vergleich; text: () => string }[] = [
    { op: '=', text: () => L('ist gleich', 'equals') }, { op: '<>', text: () => L('ist ungleich', 'does not equal') },
    { op: '<', text: () => L('ist kleiner als', 'is less than') }, { op: '<=', text: () => L('ist höchstens', 'is at most') },
    { op: '>', text: () => L('ist größer als', 'is greater than') }, { op: '>=', text: () => L('ist mindestens', 'is at least') }
  ];
  const labelsVon = (name: string) => Object.entries(spalten.find(c => c.name === name)?.werteLabels ?? {});
</script>

<fieldset class="as-gruppe bed"><legend>{L('Bedingung', 'Condition')}</legend>
  <ul class="as-regeln">{#each zeilen as z, i (z.id)}
    <li>
      <select aria-label={L(`Bedingung ${i + 1}: Spalte`, `Condition ${i + 1}: column`)} bind:value={z.spalte}>{#each spalten as c}<option value={c.name}>{spaltenOption(c)}</option>{/each}</select>
      <select aria-label={L(`Bedingung ${i + 1}: Vergleich`, `Condition ${i + 1}: comparison`)} bind:value={z.op}>{#each OPS as o}<option value={o.op}>{o.text()}</option>{/each}</select>
      {#if labelsVon(z.spalte).length}
        <select aria-label={L(`Bedingung ${i + 1}: Wert`, `Condition ${i + 1}: value`)} bind:value={z.wert}><option value="">{L('Wert wählen', 'Choose a value')}</option>{#each labelsVon(z.spalte) as [w, l]}<option value={w}>{w} {l}</option>{/each}</select>
      {:else}<input type="text" autocomplete="off" aria-label={L(`Bedingung ${i + 1}: Wert`, `Condition ${i + 1}: value`)} placeholder={L('Wert', 'value')} bind:value={z.wert}>{/if}
      <button class="k leise klein" type="button" aria-label={L(`Bedingung ${i + 1} entfernen`, `Remove condition ${i + 1}`)} disabled={zeilen.length <= mindestens} onclick={() => (zeilen = zeilen.filter(x => x.id !== z.id))}>{L('Entfernen', 'Remove')}</button></li>
  {/each}</ul>
  <div class="knopfzeile"><button class="k" type="button" onclick={() => (zeilen = [...zeilen, neueBedingung(spalten[0]?.name)])}>{L('Bedingung hinzufügen', 'Add a condition')}</button></div>
  {#if zeilen.length > 1}
    <div class="as-feld"><span class="lbl" id="bed-{id}-v">{L('Mehrere Bedingungen', 'Several conditions')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="bed-{id}-v">
        <label><input type="radio" name="bed-{id}" value="AND" bind:group={verknuepfung}>{L('alle müssen gelten', 'all must hold')}</label>
        <label><input type="radio" name="bed-{id}" value="OR" bind:group={verknuepfung}>{L('mindestens eine muss gelten', 'at least one must hold')}</label></div></div>
  {/if}
</fieldset>
