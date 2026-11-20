<script lang="ts">
  /** Nach der MANOVA (Field-Stufe 3): Voraussetzungen prüfen (Box-Test der Kovarianzmatrizen, Levene-Test je Zielgröße) und der Weg weiter zur Diskriminanzanalyse mit denselben Spalten.
   *  Rechnet im Browser (lib/manovafolge.ts) mit denselben vollständigen Fällen wie die MANOVA; Zahlen gegen R geprüft. */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L, melde } from '../lib/sitzung.svelte';
  import { komma, pWert } from '../lib/ergebnis';
  import type { ManovaE } from '../lib/manova';
  import { folgeDaten, boxTest, boxSaetze, boxFehlerSatz, leveneTest } from '../lib/manovafolge';
  import { frageVorschlag } from '../lib/beispielvorschlag.svelte';

  let { e, name }: { e: ManovaE; name: (n: string) => string } = $props();
  const dt = $derived(folgeDaten(e.gruppe, e.ziele, s.zeilen, s.spalten));
  const box = $derived(dt ? boxTest(dt) : null);
  const boxOk = $derived(box && !('fehler' in box) ? box : null);
  const levene = $derived(dt ? e.ziele.map((_, j) => leveneTest(dt.cols[j]!, dt.grp, dt.je.length)) : []);
  const z2 = (v: number) => komma(v, 2);
  const pT = (p: number) => (p < 0.001 ? L('< ,001', '< .001') : pWert(p).replace(/^= /, ''));
  const auffaellig = $derived(dt ? e.ziele.filter((_, j) => (levene[j]?.p ?? 1) < 0.05).map(name) : []);

  function weiter() {
    frageVorschlag.v = { art: 'diskriminanz', w: { l1: [e.gruppe], l2: [...e.ziele], l3: [], l4: [] } };
    melde(L('Das Fenster der Diskriminanzanalyse öffnet sich mit denselben Spalten.', 'The discriminant analysis opens with the same columns.'));
    location.hash = 'blatt/neu';
  }
</script>

<div class="manova-folge" style="margin-top:var(--a4)">
  <div class="knopfzeile"><button class="k" type="button" onclick={weiter}>{L('Wie unterscheiden sich die Gruppen? (Diskriminanzanalyse)', 'How do the groups differ? (discriminant analysis)')}</button></div>
  <p class="hilfe">{L('Eine MANOVA sagt, dass sich die Gruppen unterscheiden. Eine Diskriminanzanalyse zeigt, in welcher Kombination der Zielgrößen. Sie übernimmt dieselben Spalten.', 'A MANOVA says that the groups differ. A discriminant analysis shows in which combination of the outcomes. It takes over the same columns.')}</p>

  <details class="auf" style="margin-top:var(--a3)"><summary>{L('Voraussetzungen prüfen: Box-M-Test und Levene-Test', "Checking the assumptions: Box\'s M test and Levene test")}</summary>
    <p class="heft-text">{L('Eine MANOVA setzt voraus, dass die Gruppen in allen Zielgrößen gleich streuen und die Zielgrößen in allen Gruppen gleich zusammenhängen (gleiche Kovarianzmatrizen). Der Box-M-Test prüft die Kovarianzmatrizen zusammen, der Levene-Test die Streuung je Zielgröße.', 'A MANOVA assumes that the groups spread equally in all outcomes and that the outcomes are related in the same way in all groups (equal covariance matrices). Box\'s M test checks the covariance matrices together, the Levene test the spread of each outcome.')}</p>
    <p class="hilfe"><HilfeLink id="frage-manova" text={L('Hilfe: MANOVA lesen und berichten', 'Help: reading and reporting a MANOVA')} /></p>

    <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a3) 0 var(--a2)">{L('Box-M-Test der Kovarianzmatrizen', "Box\'s M test of the covariance matrices")}</h3>
    {#if boxOk}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Box-M-Test', "Box\'s M test")}</b></caption>
        <thead><tr><th scope="col">{L('Näherung', 'Approximation')}</th><th scope="col">{L('Prüfgröße', 'Statistic')}</th><th scope="col">df1</th><th scope="col">df2</th><th scope="col">p</th></tr></thead>
        <tbody>
          <tr><th scope="row" style="text-align: start">F</th><td style="text-align:right">{z2(boxOk.F)}</td><td style="text-align:right">{komma(boxOk.df1, 0)}</td><td style="text-align:right">{komma(boxOk.df2, 1)}</td><td style="text-align:right">{pT(boxOk.p)}</td></tr>
          <tr><th scope="row" style="text-align: start">χ²</th><td style="text-align:right">{z2(boxOk.chi2)}</td><td style="text-align:right">{komma(boxOk.chiDf, 0)}</td><td style="text-align:right">-</td><td style="text-align:right">{pT(boxOk.chiP)}</td></tr>
        </tbody>
      </table></div>
      <p class="heft-text">M = {z2(boxOk.M)}.</p>
      {#each boxSaetze(boxOk) as satz, i (i)}<p class="heft-text">{satz}</p>{/each}
    {:else if box && 'fehler' in box}
      <p class="heft-text" role="alert">{boxFehlerSatz(box.fehler)}</p>
    {/if}

    <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a3) 0 var(--a2)">{L('Levene-Test je Zielgröße', 'Levene test for each outcome')}</h3>
    {#if dt}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Levene-Test auf gleiche Streuung (Mittelwert-Zentrierung wie SPSS)', 'Levene test for equal spread (centred on the mean, as in SPSS)')}</b></caption>
        <thead><tr><th scope="col">{L('Zielgröße', 'Outcome')}</th><th scope="col">F</th><th scope="col">df1</th><th scope="col">df2</th><th scope="col">p</th></tr></thead>
        <tbody>{#each e.ziele as z, j (z)}{@const l = levene[j]}<tr><th scope="row" style="text-align: start">{name(z)}</th>{#if l}<td style="text-align:right">{z2(l.F)}</td><td style="text-align:right">{komma(l.df1, 0)}</td><td style="text-align:right">{komma(l.df2, 0)}</td><td style="text-align:right">{pT(l.p)}</td>{:else}<td colspan="4">{L('nicht berechenbar (keine Streuung)', 'not calculable (no spread)')}</td>{/if}</tr>{/each}</tbody>
      </table></div>
      <p class="heft-text">{#if auffaellig.length}{L(`Die Streuung ist nicht in allen Gruppen gleich bei: ${auffaellig.join(', ')} (p unter ,05). Bei gleich großen Gruppen ist die Varianzanalyse dafür recht robust; bei ungleich großen Gruppen besser die Welch-Varianzanalyse je Zielgröße ansehen.`, `The spread is not the same in all groups for: ${auffaellig.join(', ')} (p below .05). With equally large groups the analysis of variance is fairly robust to this; with unequal groups it is better to look at the Welch analysis of variance for each outcome.`)}{:else}{L('Kein Levene-Test ist signifikant: Die Streuung unterscheidet sich nicht auffällig zwischen den Gruppen.', 'No Levene test is significant: the spread does not differ conspicuously between the groups.')}{/if}</p>
    {/if}
  </details>
</div>
