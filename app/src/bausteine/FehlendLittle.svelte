<script lang="ts">
  /** „Fehlen Werte zufällig?“ - Little-MCAR-Test unter dem Ergebnis von „Wie verteilt sich etwas?“ (S-H). Rechnet im Browser (lib/little.ts), erst auf Klick. */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L, Lp, d, type Blatt } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { lesbar } from '../lib/verzeichnis';
  import { komma, pWert, type Verteilung } from '../lib/ergebnis';
  import { littleMcar, type Little, type LittleFehler } from '../lib/little';
  import Rechnet from './Rechnet.svelte';

  let { blatt, e }: { blatt: Blatt; e: Verteilung } = $props();
  const kennung = $props.id();
  const sp = $derived(e.zahlen.map(z => s.spalten.find(c => c.name === z.name || c.bezeichnung === z.name || lesbar(c, true) === z.name)).filter((c): c is NonNullable<typeof c> => !!c && c.art === 'zahl'));
  const name = (c: { name: string; bezeichnung: string }) => c.bezeichnung.trim() || c.name;
  let res = $state<Little | LittleFehler | null>(null), laeuft = $state(false);
  $effect(() => { void blatt.id; res = null; });   // anderes Blatt: altes Ergebnis weg

  async function rechnen() {
    if (laeuft) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));   // erst zeichnen (Lade-Animation), dann rechnen
    const idx = sp.map(c => s.spalten.findIndex(x => x.name === c.name));
    const zeilen = s.zeilen.map(z => idx.map((j, k) => (typeof z[j] === 'number' && !istFehlend(sp[k], z[j]) ? (z[j] as number) : null)));
    res = littleMcar(sp.map(name), zeilen);
    laeuft = false;
  }
  const ok = $derived(res && !('fehler' in res) ? res : null);
  const fehlerText = (f: LittleFehler) => f.fehler === 'keine-luecken' ? L('In diesen Spalten fehlt bei keinem Fall ein Wert. Ein Test ist nicht nötig.', 'No case has a missing value in these columns. A test is not needed.')
    : f.fehler === 'zu-wenig-spalten' ? L('Der Test braucht mindestens zwei Zahlenspalten.', 'The test needs at least two number columns.')
    : f.fehler === 'keine-streuung' ? d(`Die Spalte „${f.spalte}“ hat nur einen Wert. Ohne Streuung lässt sich nichts rechnen; nimm sie heraus.`, `Die Spalte „${f.spalte}“ hat nur einen Wert. Ohne Streuung lässt sich nichts rechnen; nehmen Sie sie heraus.`, `The column "${f.spalte}" has only one value. Nothing can be calculated without variation; leave it out.`)
    : f.fehler === 'singulaer' ? d('Spalten, die einander vollständig bestimmen (zum Beispiel Summe und Teile), lassen sich nicht gemeinsam prüfen. Nimm eine davon heraus.', 'Spalten, die einander vollständig bestimmen (zum Beispiel Summe und Teile), lassen sich nicht gemeinsam prüfen. Nehmen Sie eine davon heraus.', 'Columns that completely determine each other (for example a total and its parts) cannot be checked together. Leave one of them out.')
    : f.fehler === 'kein-df' ? L('Aus diesen Fehlend-Mustern lässt sich nichts prüfen.', 'Nothing can be tested from these missing-value patterns.')
    : L('Zu wenige Fälle für den Test.', 'Too few cases for the test.');
  const satz = (r: Little) => r.p < 0.05
    ? L(`Der Test spricht gegen MCAR (χ²(${r.df}) = ${komma(r.chi2)}, p ${pWert(r.p)}): Welche Werte fehlen, hängt erkennbar mit den Werten in den anderen Spalten zusammen. Einfach die Fälle mit Lücken wegzulassen kann die Ergebnisse verzerren.`, `The test speaks against MCAR (χ²(${r.df}) = ${komma(r.chi2)}, p ${pWert(r.p)}): which values are missing is clearly related to the values in the other columns. Simply leaving out the cases with gaps may bias the results.`)
    : L(`Der Test spricht nicht gegen MCAR (χ²(${r.df}) = ${komma(r.chi2)}, p ${pWert(r.p)}): Es gibt keinen Hinweis, dass das Fehlen mit den Werten in den anderen Spalten zusammenhängt. Das belegt MCAR nicht.`, `The test does not speak against MCAR (χ²(${r.df}) = ${komma(r.chi2)}, p ${pWert(r.p)}): there is no sign that missingness is related to the values in the other columns. That does not prove MCAR.`);
</script>

{#if sp.length >= 2}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Fehlen Werte zufällig? (Little-Test)', 'Are values missing at random? (Little test)')}</summary>
    <p class="heft-text">{L('Der Little-Test prüft, ob die fehlenden Werte in diesen Spalten ohne erkennbares Muster fehlen (MCAR). Das ist die Voraussetzung dafür, dass Fälle mit Lücken einfach wegfallen dürfen, ohne die Ergebnisse zu verzerren.', 'The Little test checks whether the missing values in these columns are missing without a recognizable pattern (MCAR). That is the condition for cases with gaps to be simply dropped without biasing the results.')}</p>
    <p class="hilfe"><HilfeLink id="fehlende-werte-little-imputation" text={L('Hilfe: fehlende Werte', 'Help: missing values')} /></p>
    {#if blatt.gewicht}
      <p class="heft-text" style="color:var(--tinte-2)">{L('Mit Fallgewicht rechnet Statable diesen Test nicht.', 'With a case weight Statable does not calculate this test.')}</p>
    {:else}
      <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{L(`Test mit ${sp.length} Spalten rechnen`, `Calculate the test with ${sp.length} columns`)}{/if}</button></div>
      {#if res && 'fehler' in res}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>{/if}
      {#if ok}
        <p class="heft-text" role="status" id="little-{kennung}">{satz(ok)}</p>
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{L('Fehlend-Muster', 'Missing-value patterns')}</b></caption>
          <thead><tr><th scope="col">{L('Fälle', 'Cases')}</th><th scope="col">{L('Anteil', 'Share')}</th><th scope="col">{L('Es fehlen', 'Missing')}</th></tr></thead>
          <tbody>{#each ok.muster as m}<tr><td style="text-align:right">{m.n}</td><td style="text-align:right">{komma(m.anteil * 100, 1)} %</td><td>{m.fehlt.length ? m.fehlt.map(j => ok.spalten[j]).join(', ') : L('nichts (alle Angaben da)', 'nothing (all answers present)')}</td></tr>{/each}</tbody>
        </table></div>
        {@const aus = ok.nOhneAlles ? L(` (${ok.nOhneAlles} ohne jede Angabe bleiben außen vor)`, ` (${ok.nOhneAlles} without any answer are left out)`) : ''}
        <p class="heft-text" style="color:var(--tinte-2)">{Lp(ok.n, `${ok.n} Fall${aus}, ${ok.muster.length} Fehlend-Muster, EM-Schätzung nach ${ok.iterationen} Schritten.`, `${ok.n} Fälle${aus}, ${ok.muster.length} Fehlend-Muster, EM-Schätzung nach ${ok.iterationen} Schritten.`, `${ok.n} case${aus}, ${ok.muster.length} missing-value patterns, EM estimate after ${ok.iterationen} steps.`, `${ok.n} cases${aus}, ${ok.muster.length} missing-value patterns, EM estimate after ${ok.iterationen} steps.`)}</p>
        {#if !ok.konvergiert}<p class="heft-text" style="color:var(--tinte-2)">{L('Die Schätzung ist nicht sicher konvergiert; die Zahlen können ungenau sein.', 'The estimation did not converge reliably; the numbers may be imprecise.')}</p>{/if}
      {/if}
      <p class="heft-text" style="color:var(--tinte-2)">{L('Der Test setzt annähernd normalverteilte Zahlen voraus. Bei sehr vielen Fällen schlägt er schon bei kleinen Abweichungen an, bei wenigen sieht er kaum etwas. Ob Werte vom eigenen Wert abhängig fehlen (nicht zufällig), kann kein Test trennen. Little (1988).', 'The test assumes roughly normal numbers. With very many cases it flags even small deviations; with few it sees hardly anything. No test can tell whether values are missing depending on their own value (not at random). Little (1988).')}</p>
    {/if}
  </details>
{/if}
