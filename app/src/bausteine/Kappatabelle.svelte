<script lang="ts">
  import { kleinste, groesste } from '../lib/menge';
  import type { Kappa } from '../lib/ergebnis';
  import { zahlDe } from '../lib/format';
  import { L } from '../lib/sitzung.svelte';
  /** Die Übereinstimmungstabelle: Zeilen = erste Beurteilung, Spalten = zweite. Die Diagonale (beide gleich) ist hervorgehoben, die Farbtiefe folgt der Anzahl. */
  let { e, aText, bText, kat }: { e: Kappa; aText: string; bText: string; kat: (w: string | number) => string } = $props();
  const max = $derived(Math.max(1, groesste(e.tab.flat())));
  const gleich = $derived(e.tab.reduce((a, r, i) => a + r[i]!, 0));
  const farbe = (v: number, diag: boolean) => (v === 0 ? 'transparent' : `color-mix(in srgb, ${diag ? 'var(--akzent)' : 'var(--hinweis)'} ${Math.round(14 + 52 * v / max)}%, var(--blatt))`);
</script>
<div class="kt">
  <table class="apa kappa-tab">
    <caption><b>{L('Wer hat wie beurteilt?', 'Who rated how?')}</b><span>{L(`Zeilen: ${aText}. Spalten: ${bText}. Hervorgehoben: beide urteilen gleich (${gleich} von ${e.n}).`, `Rows: ${aText}. Columns: ${bText}. Highlighted: both rate the same (${gleich} of ${e.n}).`)}</span></caption>
    <thead><tr><th scope="col"><span class="nur-vorleser">{L('Zeile', 'Row')}</span></th>{#each e.kategorien as k (k)}<th scope="col">{kat(k)}</th>{/each}<th scope="col">{L('Summe', 'Total')}</th></tr></thead>
    <tbody>
      {#each e.tab as zeile, i}
        <tr><th scope="row">{kat(e.kategorien[i]!)}</th>
          {#each zeile as v, j}<td class:diag={i === j} style="background:{farbe(v, i === j)}">{v ? zahlDe(v, 0) : '·'}{#if i === j}<span class="nur-vorleser"> {L('(gleich beurteilt)', '(rated the same)')}</span>{/if}</td>{/each}
          <td class="summe">{zahlDe(zeile.reduce((a, b) => a + b, 0), 0)}</td></tr>
      {/each}
    </tbody>
    <tfoot><tr><th scope="row">{L('Summe', 'Total')}</th>{#each e.kategorien as _, j}<td class="summe">{zahlDe(e.tab.reduce((a, r) => a + r[j]!, 0), 0)}</td>{/each}<td class="summe">{zahlDe(e.n, 0)}</td></tr></tfoot>
  </table>
</div>
<style>
  .kt{overflow-x:auto;max-width:100%}
  table{margin-top:0}
  caption span{display:block;color:var(--tinte-2);font-size:var(--gr-klein);max-width:60ch}
  td{text-align:center !important;min-width:3.2em;border-radius:var(--r-klein)}
  td.diag{font-weight:700;outline:2px solid color-mix(in srgb,var(--akzent) 70%,transparent);outline-offset:-2px}
  td.summe{color:var(--tinte-2);font-weight:400}
  tfoot th,tfoot td{border-top:1px solid var(--linie)}
  thead th{text-align:center !important}
</style>
