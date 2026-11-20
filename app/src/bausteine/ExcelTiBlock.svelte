<script lang="ts">
  /** „So geht es in Excel, TI-84, SPSS“ und „Die Rechnung zum Mitlesen“ unter dem Ergebnis (S-K K2, K3, K7): zeigt nur die Programme, die in den Einstellungen („Vergleich mit anderen Programmen“) eingeschaltet sind. */
  import { s, L } from '../lib/sitzung.svelte';
  import { anleitung, type AnleitungQuelle } from '../lib/exceltianleitung';
  import { rechnung } from '../lib/rechnungmitlesen';

  let { e, name }: { e: AnleitungQuelle; name: (n: string) => string } = $props();
  const b = $derived(s.einst.bezuege ?? {});
  const a = $derived(b.excel || b.ti84 || b.spss || b.r || b.jamovi || b.stata ? anleitung(e, name) : null);
  const rz = $derived(b.rechnung ? rechnung(e) : null);
  const namen = $derived([b.excel ? 'Excel' : '', b.ti84 ? 'TI-84' : '', b.spss ? 'SPSS' : '', b.r ? 'R' : '', b.jamovi ? 'jamovi' : '', b.stata ? 'Stata' : ''].filter(Boolean).join(', '));
</script>

{#if a}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('So geht es in', 'How to do it in')} {namen}</summary>
    <p class="heft-text"><b>{a.titel}</b>. {L('Mit diesen Schritten ergibt sich dieselbe Zahl wie hier, zum Nachrechnen im Kurs.', 'These steps give the same number as here, for checking by hand in class.')}</p>
    {#if b.excel}<h4 style="margin:var(--a3) 0 var(--a1)">Excel</h4>
    <ol class="heft-text">{#each a.excel as z, i (i)}<li>{z}</li>{/each}</ol>{/if}
    {#if b.ti84}<h4 style="margin:var(--a3) 0 var(--a1)">TI-84</h4>
    <ol class="heft-text">{#each a.ti as z, i (i)}<li>{z}</li>{/each}</ol>{/if}
    {#if b.spss && a.spss.length}<h4 style="margin:var(--a3) 0 var(--a1)">SPSS</h4>
    <ol class="heft-text">{#each a.spss as z, i (i)}<li>{z}</li>{/each}</ol>{/if}
    {#if b.r && a.r.length}<h4 style="margin:var(--a3) 0 var(--a1)">R</h4>
    <ol class="heft-text">{#each a.r as z, i (i)}<li><code>{z}</code></li>{/each}</ol>{/if}
    {#if b.jamovi && a.jamovi.length}<h4 style="margin:var(--a3) 0 var(--a1)">jamovi</h4>
    <ol class="heft-text">{#each a.jamovi as z, i (i)}<li>{z}</li>{/each}</ol>{/if}
    {#if b.stata && a.stata.length}<h4 style="margin:var(--a3) 0 var(--a1)">Stata</h4>
    <ol class="heft-text">{#each a.stata as z, i (i)}<li><code>{z}</code></li>{/each}</ol>{/if}
    <h4 style="margin:var(--a3) 0 var(--a1)">{L('Das soll herauskommen', 'This is what should come out')}</h4>
    <ul class="heft-text">{#each a.soll as z, i (i)}<li>{z}</li>{/each}</ul>
    {#if a.hinweis}<p class="heft-text" style="color:var(--tinte-2)">{a.hinweis}</p>{/if}
    <p class="heft-text" style="color:var(--tinte-2)">{L('Namen und Menüs hängen von der Version und der Sprache des Programms ab; hier stehen sie passend zur Sprache von Statable. Kleine Abweichungen in der letzten Stelle kommen vom Runden.', 'Names and menus depend on the version and the language of the program; here they match the language of Statable. Small differences in the last digit come from rounding.')}</p>
  </details>
{/if}

{#if rz}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Die Rechnung zum Mitlesen', 'The calculation to follow along')}</summary>
    <p class="heft-text"><b>{rz.titel}</b>. {L('Jeder Schritt mit Formel und den eingesetzten Zahlen, wie an der Tafel.', 'Every step with the formula and the numbers inserted, as on the blackboard.')}</p>
    <ol class="heft-text">{#each rz.schritte as st, i (i)}<li><b>{st.name}</b><br><span style="font-family:var(--mono, monospace)">{st.formel}</span><br><span style="font-family:var(--mono, monospace)">{st.eingesetzt}</span></li>{/each}</ol>
    <p class="heft-text" style="color:var(--tinte-2)">{L('Die Zahlen sind gerundet angezeigt; gerechnet wird mit allen Stellen. Wer von Hand rechnet, kann in der letzten Stelle leicht abweichen.', 'The numbers are shown rounded; the calculation uses all digits. Calculating by hand can differ slightly in the last digit.')}</p>
  </details>
{/if}
