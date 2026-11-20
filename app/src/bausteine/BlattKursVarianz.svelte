<script lang="ts">
  import { L, sichern } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { komma, pWert, type Verteilung } from '../lib/ergebnis';
  import { eineVarianz, eineVarianzSchritte } from '../lib/kurstests';
  import { zahlAusText } from '../lib/aequirci';
  import KursSchritte from './KursSchritte.svelte';
  import { kursSprung, kursZielFrisch } from '../lib/kursziel';

  /** Streuung mit einem festen Wert vergleichen (Kurs-Ordnung 25.10.2026, „eine Stichprobe, Varianz“): χ²-Test für eine Varianz, eingegeben als Standardabweichung.
   *  Der Wert gehört zum Ergebnis (`e.sigmaWerte`); gerechnet wird erst mit dem Knopf. */
  let { blatt, e, melde }: { blatt: Blatt; e: Verteilung; melde: (t: string) => void } = $props();
  const kennung = $props.id();
  const gewaehlt = kursZielFrisch(blatt, 'varianz');
  const zahlen = $derived(e.zahlen.filter(z => z.n >= 2 && z.sd > 0));
  let entwurf = $state<Record<string, string>>({});
  const feld = (name: string) => entwurf[name] ?? (e.sigmaWerte?.[name] !== undefined ? komma(e.sigmaWerte[name]!, Number.isInteger(e.sigmaWerte[name]!) ? 0 : 2) : '');
  function setzen(name: string) {
    const w = zahlAusText(feld(name).trim());
    if (w === null || !(w > 0)) { melde(L('Bitte eine Standardabweichung größer als 0 eintragen.', 'Please enter a standard deviation greater than 0.')); return; }
    blatt.ergebnis = { typ: 'verteilung', e: { ...e, sigmaWerte: { ...(e.sigmaWerte ?? {}), [name]: w } } } as Blatt['ergebnis'];
    delete entwurf[name]; void sichern();
    melde(L('Der Vergleichswert ist festgelegt, der Test ist gerechnet.', 'The comparison value is set, the test is calculated.'));
  }
  function entfernen(name: string) {
    const sw = { ...(e.sigmaWerte ?? {}) }; delete sw[name]; delete entwurf[name];
    blatt.ergebnis = { typ: 'verteilung', e: { ...e, sigmaWerte: sw } } as Blatt['ergebnis'];
    void sichern(); melde(L('Der Test ist entfernt.', 'The test is removed.'));
  }
</script>

{#if zahlen.length && !blatt.gewicht}
  <details class="auf" style="margin-top:var(--a4)" open={gewaehlt || !!Object.keys(e.sigmaWerte ?? {}).length} use:kursSprung={gewaehlt} data-kurs="varianz"><summary>{L('Streuung mit einem festen Wert vergleichen (χ²-Test für eine Varianz)', 'Compare the spread with a fixed value (chi-square test for one variance)')}</summary>
    <p class="heft-text" style="margin:var(--a2) 0">{L('Weicht die Standardabweichung von einem Wert ab, der vor der Auswertung feststeht, zum Beispiel einer Vorgabe für ein Messgerät oder der Streuung einer Normstichprobe?', 'Does the standard deviation differ from a value that is fixed before the analysis, for example a specification for a measuring device or the spread of a norm sample?')}</p>
    {#each zahlen as z, i (z.name)}
      {@const w = e.sigmaWerte?.[z.name]}
      {@const r = w === undefined ? null : eineVarianz(z.n, z.sd, w)}
      <div class="eingabe" style="margin-top:var(--a3);max-width:460px">
        <label for="{kennung}-{i}">{L(`Vergleichswert der Standardabweichung für „${z.name}“`, `Comparison value of the standard deviation for "${z.name}"`)}</label>
        <div class="knopfzeile"><input id="{kennung}-{i}" type="text" inputmode="decimal" value={feld(z.name)} oninput={(ev) => (entwurf[z.name] = (ev.currentTarget as HTMLInputElement).value)} onkeydown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); setzen(z.name); } }} style="max-width:10rem">
          <button class="k" type="button" onclick={() => setzen(z.name)}>{L('Festlegen und rechnen', 'Set and calculate')}</button>
          {#if w !== undefined}<button class="k leise" type="button" onclick={() => entfernen(z.name)}>{L('Test entfernen', 'Remove test')}</button>{/if}</div>
      </div>
      {#if r}
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{L(`χ²-Test für eine Varianz: ${z.name} (Vergleichswert σ = ${komma(r.sigma0, Number.isInteger(r.sigma0) ? 0 : 2)})`, `Chi-square test for one variance: ${z.name} (comparison value σ = ${komma(r.sigma0, Number.isInteger(r.sigma0) ? 0 : 2)})`)}</b></caption>
          <thead><tr><th scope="col">N</th><th scope="col">{L('Std. Abw.', 'SD')}</th><th scope="col">{L('95 %-KI der Std. Abw.', '95% CI of the SD')}</th><th scope="col">χ²</th><th scope="col">df</th><th scope="col">p</th></tr></thead>
          <tbody><tr><td style="text-align:right">{r.n}</td><td style="text-align:right">{komma(r.sd, 2)}</td><td style="text-align:right">[{komma(r.sdLo, 2)}; {komma(r.sdHi, 2)}]</td><td style="text-align:right">{komma(r.chi2, 2)}</td><td style="text-align:right">{r.df}</td><td style="text-align:right">{pWert(r.p).replace(/^= /, '')}</td></tr></tbody>
        </table></div>
        <KursSchritte k={eineVarianzSchritte(r)} />
      {/if}
    {/each}
    <p style="color:var(--tinte-2);margin-top:var(--a2)">{L('Zweiseitig: der kleinere Schwanz der χ²-Verteilung verdoppelt. Der Test setzt normalverteilte Werte voraus und reagiert darauf viel stärker als der t-Test; bei schiefen Werten oder Ausreißern ist das p unzuverlässig, auch bei vielen Fällen. Satz und Zeile für die Arbeit stehen oben im Ergebnis.', 'Two-sided: the smaller tail of the chi-square distribution doubled. The test assumes normally distributed values and is much more sensitive to this than the t test; with skewed values or outliers the p is unreliable, even with many cases. The sentence and the line for the paper are in the result above.')}</p>
  </details>
{/if}
