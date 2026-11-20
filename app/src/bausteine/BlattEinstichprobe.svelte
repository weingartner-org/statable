<script lang="ts">
  import { L, sichern } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { komma, pWert, type Verteilung } from '../lib/ergebnis';
  import { einstichprobe } from '../lib/einstichprobe';
  import { zahlAusText } from '../lib/aequirci';
  import HilfeLink from './HilfeLink.svelte';

  /** t-Test bei einer Stichprobe unter „Wie verteilt sich etwas?“ (Nachttest 24.10.2026, wie SPSS „T-Test bei einer Stichprobe“): je Zahlenspalte ein vorab festgelegter Vergleichswert.
   *  Der Wert gehört zum Ergebnis (`e.testwerte`) und kommt so in Satz, Zeile für die Arbeit und Bericht; gerechnet wird erst mit dem Knopf, nie bei jedem Tastendruck. */
  let { blatt, e, melde }: { blatt: Blatt; e: Verteilung; melde: (t: string) => void } = $props();
  const kennung = $props.id();
  const zahlen = $derived(e.zahlen.filter(z => z.n >= 2 && z.sd > 0));
  let entwurf = $state<Record<string, string>>({});
  const feld = (name: string) => entwurf[name] ?? (e.testwerte?.[name] !== undefined ? komma(e.testwerte[name]!, Number.isInteger(e.testwerte[name]!) ? 0 : 2) : '');
  function setzen(name: string) {
    const w = zahlAusText(feld(name).trim());
    if (w === null) { melde(L('Bitte eine Zahl als Vergleichswert eintragen.', 'Please enter a number as the comparison value.')); return; }
    blatt.ergebnis = { typ: 'verteilung', e: { ...e, testwerte: { ...(e.testwerte ?? {}), [name]: w } } } as Blatt['ergebnis'];
    delete entwurf[name]; void sichern();
    melde(L('Der Vergleichswert ist festgelegt, der Test ist gerechnet.', 'The comparison value is set, the test is calculated.'));
  }
  function entfernen(name: string) {
    const tw = { ...(e.testwerte ?? {}) }; delete tw[name]; delete entwurf[name];
    blatt.ergebnis = { typ: 'verteilung', e: { ...e, testwerte: tw } } as Blatt['ergebnis'];
    void sichern(); melde(L('Der Test ist entfernt.', 'The test is removed.'));
  }
</script>

{#if zahlen.length && !blatt.gewicht}
  <details class="auf" style="margin-top:var(--a4)" open={!!Object.keys(e.testwerte ?? {}).length}><summary>{L('Mittelwert mit einem festen Wert vergleichen (t-Test bei einer Stichprobe)', 'Compare the mean with a fixed value (one-sample t test)')}</summary>
    <p class="heft-text" style="margin:var(--a2) 0">{L('Weicht der Mittelwert von einem Wert ab, der vor der Auswertung feststeht, zum Beispiel einem Normwert, der Mitte einer Antwortskala oder einem Wert aus früheren Studien? Den Wert nicht erst nach dem Blick auf die Daten wählen.', 'Does the mean differ from a value that is fixed before the analysis, for example a norm value, the midpoint of an answer scale or a value from earlier studies? Do not choose the value only after looking at the data.')} <HilfeLink id="frage-verteilung" /></p>
    {#each zahlen as z, i (z.name)}
      {@const w = e.testwerte?.[z.name]}
      {@const r = w === undefined ? null : einstichprobe(z, w)}
      <div class="eingabe" style="margin-top:var(--a3);max-width:460px">
        <label for="{kennung}-{i}">{L(`Vergleichswert für „${z.name}“`, `Comparison value for "${z.name}"`)}</label>
        <div class="knopfzeile"><input id="{kennung}-{i}" type="text" inputmode="decimal" value={feld(z.name)} oninput={(ev) => (entwurf[z.name] = (ev.currentTarget as HTMLInputElement).value)} onkeydown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); setzen(z.name); } }} style="max-width:10rem">
          <button class="k" type="button" onclick={() => setzen(z.name)}>{L('Festlegen und rechnen', 'Set and calculate')}</button>
          {#if w !== undefined}<button class="k leise" type="button" onclick={() => entfernen(z.name)}>{L('Test entfernen', 'Remove test')}</button>{/if}</div>
      </div>
      {#if r}
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{L(`t-Test bei einer Stichprobe: ${z.name} (Vergleichswert ${komma(r.mu0, Number.isInteger(r.mu0) ? 0 : 2)})`, `One-sample t test: ${z.name} (comparison value ${komma(r.mu0, Number.isInteger(r.mu0) ? 0 : 2)})`)}</b></caption>
          <thead><tr><th scope="col">N</th><th scope="col">{L('Mittelwert', 'Mean')}</th><th scope="col">{L('Std. Abw.', 'SD')}</th><th scope="col">{L('Differenz', 'Difference')}</th><th scope="col">{L('95 %-KI der Differenz', '95% CI of the difference')}</th><th scope="col">t</th><th scope="col">df</th><th scope="col">p</th><th scope="col">d</th><th scope="col">{L('95 %-KI von d', '95% CI of d')}</th></tr></thead>
          <tbody><tr><td style="text-align:right">{r.n}</td><td style="text-align:right">{komma(r.m, 2)}</td><td style="text-align:right">{komma(r.sd, 2)}</td><td style="text-align:right">{komma(r.diff, 2)}</td><td style="text-align:right">[{komma(r.lo, 2)}; {komma(r.hi, 2)}]</td><td style="text-align:right">{komma(r.t, 2)}</td><td style="text-align:right">{r.df}</td><td style="text-align:right">{pWert(r.p).replace(/^= /, '')}</td><td style="text-align:right">{komma(r.d, 2)}</td><td style="text-align:right">[{komma(r.dLo, 2)}; {komma(r.dHi, 2)}]</td></tr></tbody>
        </table></div>
      {/if}
    {/each}
    <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('Zweiseitig. Cohens d = Differenz geteilt durch die Standardabweichung, Intervall über die nichtzentrale t-Verteilung (wie SPSS). Satz und Zeile für die Arbeit stehen oben im Ergebnis. Der Test setzt annähernd normalverteilte Mittelwerte voraus; bei deutlicher Schiefe und wenigen Werten ist er unsicher.', "Two-sided. Cohen's d = difference divided by the standard deviation, interval from the noncentral t distribution (as in SPSS). The sentence and the line for the paper are in the result above. The test assumes approximately normally distributed means; with clear skewness and few values it is uncertain.")}</p>
  </details>
{/if}
