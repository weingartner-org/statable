<script lang="ts">
  import { L, s } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { komma, pWert, type ZweiGruppen } from '../lib/ergebnis';
  import { zweiVarianzen, zweiVarianzenSatz, zweiVarianzenSchritte } from '../lib/kurstests';
  import KursSchritte from './KursSchritte.svelte';
  import { kursSprung, kursZielFrisch } from '../lib/kursziel';

  /** Zwei Streuungen vergleichen (Kurs-Ordnung 25.10.2026, „zwei Stichproben, Varianz“): F-Test wie R var.test, aus n und SD der beiden Gruppen des t-Tests. Keine Eingabe nötig. */
  let { blatt, e }: { blatt: Blatt; e: ZweiGruppen } = $props();
  const r = $derived(zweiVarianzen(e.a.n, e.a.sd, e.b.n, e.b.sd));
  /** Gewählt über „Wie im Kurs ▸ F-Test“: aufgeklappt, angesprungen. */
  const gewaehlt = kursZielFrisch(blatt, 'ftest');
</script>

{#if r && !blatt.gewicht}
  <details class="auf" style="margin-top:var(--a4)" open={gewaehlt} use:kursSprung={gewaehlt} data-kurs="ftest"><summary>{L('Streuungen der beiden Gruppen vergleichen (F-Test)', 'Compare the spread of the two groups (F test)')}</summary>
    <p class="heft-text" style="margin:var(--a2) 0">{zweiVarianzenSatz(r, e.a.name, e.b.name)}</p>
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L(`F-Test: Varianz „${e.a.name}“ geteilt durch Varianz „${e.b.name}“`, `F test: variance "${e.a.name}" divided by variance "${e.b.name}"`)}</b></caption>
      <thead><tr><th scope="col">{L('Std. Abw.', 'SD')} {e.a.name}</th><th scope="col">{L('Std. Abw.', 'SD')} {e.b.name}</th><th scope="col">F</th><th scope="col">df1</th><th scope="col">df2</th><th scope="col">p</th><th scope="col">{L('95 %-KI des Varianzverhältnisses', '95% CI of the variance ratio')}</th></tr></thead>
      <tbody><tr><td style="text-align:right">{komma(r.sd1, 2)}</td><td style="text-align:right">{komma(r.sd2, 2)}</td><td style="text-align:right">{komma(r.f, 2)}</td><td style="text-align:right">{r.d1}</td><td style="text-align:right">{r.d2}</td><td style="text-align:right">{pWert(r.p).replace(/^= /, '')}</td><td style="text-align:right">[{komma(r.lo, 2)}; {komma(r.hi, 2)}]</td></tr></tbody>
    </table></div>
    <KursSchritte k={zweiVarianzenSchritte(r)} />
    <p style="color:var(--tinte-2);margin-top:var(--a2)">{s.einst.kurs === 'klassisch'
      ? L('Zweiseitig. Der F-Test setzt normalverteilte Werte voraus und reagiert darauf stark. Als Vortest für die Wahl zwischen klassischem t-Test und Welch taugt er nicht; der Welch-Test steht darum immer mit dabei.', 'Two-sided. The F test assumes normally distributed values and is very sensitive to this. It is not suitable as a pre-test for choosing between the classical t test and Welch; that is why the Welch test is always shown as well.')
      : L('Zweiseitig. Der F-Test setzt normalverteilte Werte voraus und reagiert darauf stark. Als Vortest für den t-Test taugt er nicht: Statable rechnet den t-Test ohnehin nach Welch, der ungleiche Streuung zulässt.', 'Two-sided. The F test assumes normally distributed values and is very sensitive to this. It is not suitable as a pre-test for the t test: Statable calculates the t test by Welch anyway, which allows unequal spread.')}</p>
  </details>
{/if}
