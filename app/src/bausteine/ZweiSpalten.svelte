<script lang="ts">
  /** S-G0 (Andreas, 22.10.): zwei Listen nebeneinander vergleichen. Statable stapelt sie in einem neuen Projekt und öffnet die Frage „Unterscheiden sich Gruppen?“ fertig ausgefüllt. */
  import { s, L, oeffneNeueDaten, melde } from '../lib/sitzung.svelte';
  import { stapleListen, MAX_LISTEN } from '../lib/zweispalten';
  import { frageVorschlag } from '../lib/beispielvorschlag.svelte';
  import { kennung as istKennung } from '../lib/verfahren';
  import Rechnet from './Rechnet.svelte';

  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl' && !istKennung(c)));
  let gewaehlt = $state<string[]>([]);
  let arbeitet = $state(false);
  $effect(() => { const ok = gewaehlt.filter(n => zahlen.some(c => c.name === n)); if (ok.length !== gewaehlt.length) gewaehlt = ok; if (!ok.length && zahlen.length >= 2) gewaehlt = zahlen.slice(0, 2).map(c => c.name); });
  const name = (n: string) => { const c = s.spalten.find(x => x.name === n); return c?.bezeichnung.trim() || n; };
  const umschalten = (n: string, an: boolean) => { gewaehlt = an ? [...gewaehlt, n] : gewaehlt.filter(x => x !== n); };
  const genug = $derived(gewaehlt.length >= 2 && gewaehlt.length <= MAX_LISTEN);

  async function los() {
    if (arbeitet || !genug) return;
    arbeitet = true;
    try {
      const r = stapleListen({ spalten: s.spalten, zeilen: s.zeilen }, gewaehlt);
      if (r.anzahl.some(n => n < 2)) { melde(L('Jede Liste braucht mindestens zwei Zahlen.', 'Each list needs at least two numbers.')); return; }
      const vorher = s.projekt?.name ?? '';
      await oeffneNeueDaten(`${vorher} (${gewaehlt.map(name).join(' / ')})`, L(`Spalten aus „${vorher}“ untereinander gestellt`, `columns from "${vorher}" stacked`), r.spalten, r.zeilen, 'umformen');
      frageVorschlag.v = { art: 'gruppen', w: { l1: [r.wertName], l2: [r.gruppeName], l3: [], l4: [] } };
      melde(L('Neues Projekt mit den Listen untereinander geöffnet. Das bisherige Projekt ist unverändert.', 'New project opened with the lists stacked. Your current project is unchanged.'));
      location.hash = 'blatt/neu';
    } catch { melde(L('Das ließ sich nicht öffnen. Das bisherige Projekt ist unverändert.', "That couldn't be opened. Your current project is unchanged.")); }
    finally { arbeitet = false; }
  }
</script>

{#if zahlen.length >= 2}
  <details class="auf zwei-spalten">
    <summary>{L('Meine Werte stehen in mehreren Spalten (Listen)', 'My values are in several columns (lists)')}</summary>
    <p class="hilfe">{L('Zum Beispiel zwei oder mehr Listen aus Excel nebeneinander. Statable stellt sie untereinander und vergleicht die Mittelwerte (bei zwei Listen der t-Test für unabhängige Stichproben, bei drei und mehr die Varianzanalyse). Die Listen dürfen verschieden lang sein. Das Projekt bleibt unverändert; die Daten öffnen als neues Projekt.', 'For example two or more lists side by side from Excel. Statable stacks them and compares the means (the t test for independent samples for two lists, the analysis of variance for three or more). The lists may differ in length. The project stays unchanged; the data open as a new project.')}</p>
    <fieldset class="zs-wahl">
      <legend>{L('Welche Listen? (mindestens zwei)', 'Which lists? (at least two)')}</legend>
      {#each zahlen as c (c.name)}<label class="zs-eine"><input type="checkbox" checked={gewaehlt.includes(c.name)} disabled={!gewaehlt.includes(c.name) && gewaehlt.length >= MAX_LISTEN} onchange={(ev) => umschalten(c.name, ev.currentTarget.checked)} />{c.bezeichnung.trim() || c.name}</label>{/each}
    </fieldset>
    <div class="zeile"><button type="button" class="k haupt" onclick={los} disabled={arbeitet || !genug}>{#if arbeitet}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{L('Listen vergleichen', 'Compare the lists')}{/if}</button></div>
    <p class="hilfe">{L('Sind es dieselben Personen vor und nach etwas, passt „Hat sich etwas verändert?“.', 'If these are the same people before and after something, "Has something changed?" is the right question.')}</p>
  </details>
{/if}

<style>
  .zwei-spalten { margin: var(--a3) 0; }
  .zs-wahl { border: 0; padding: 0; margin: var(--a2) 0; display: flex; flex-wrap: wrap; gap: var(--a1) var(--a4); }
  .zs-wahl legend { font-weight: 600; margin-bottom: var(--a1); }
  .zs-eine { display: inline-flex; gap: var(--a2); align-items: center; }
  .zeile { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; margin: var(--a2) 0; }
</style>
