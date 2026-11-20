<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /** Geplante Vergleiche (Kontraste) unter dem Ergebnis der einfaktoriellen Varianzanalyse (Field-Stufe 2): eigene Gewichte je Gruppe, Vorlagen (Helmert, einfach, wiederholt, Abweichung)
   *  und Trendanalyse für geordnete Stufen. Rechnet im Browser (lib/kontraste.ts) aus n, Mittelwert und Streuung je Gruppe; Zahlen gegen R (emmeans) geprüft. */
  import HilfeLink from './HilfeLink.svelte';
  import { L, melde } from '../lib/sitzung.svelte';
  import { komma, ohneNull, type Anova } from '../lib/ergebnis';
  import { phMoeglich } from '../lib/posthoc';
  import { gewichtLesen, kontrast, orthogonal, summeNull, trendanalyse, vorlage, zahlenAusNamen, type KontrastAnnahme, type Vorlage } from '../lib/kontraste';

  let { e }: { e: Anova } = $props();
  const kennung = $props.id();
  const g = $derived(e.gruppen);
  const k = $derived(g.length);

  /* ---------- geplante Kontraste ---------- */
  let zeilen = $state<string[][]>([Array.from({ length: e.gruppen.length }, () => '')]);
  let annahme = $state<KontrastAnnahme>('welch');
  let vorlageWahl = $state<Vorlage>('helmert');
  // Eine leere Zeile zum Anfangen; ändert sich die Gruppenzahl (anderes Ergebnis), beginnt die Eingabe neu.
  let zuletztK = e.gruppen.length;
  $effect(() => { if (k !== zuletztK) { zuletztK = k; zeilen = [Array.from({ length: k }, () => '')]; } });

  const VORLAGEN: [Vorlage, string, string][] = [
    ['helmert', L('Helmert (jede Gruppe gegen den Mittelwert der folgenden)', 'Helmert (each group against the mean of the following)'), 'helmert'],
    ['einfach', L('Einfach (jede Gruppe gegen die erste)', 'Simple (each group against the first)'), 'kontrastarten'],
    ['wiederholt', L('Wiederholt (jede Gruppe gegen die nächste)', 'Repeated (each group against the next)'), 'kontrastarten'],
    ['abweichung', L('Abweichung (jede Gruppe gegen den Mittelwert aller)', 'Deviation (each group against the mean of all)'), 'kontrastarten']
  ];
  const text = (v: number) => String(Math.round(v * 1e6) / 1e6).replace('.', L(',', '.'));
  function einsetzen() {
    zeilen = vorlage(vorlageWahl, k).map(w => w.map(text));
    melde(L(`Vorlage eingesetzt: ${zeilen.length} Kontraste.`, `Template inserted: ${zeilen.length} contrasts.`));
  }
  const gewichte = $derived(zeilen.map(z => z.map(gewichtLesen)));
  const vollstaendig = $derived(gewichte.map(w => w.every(x => x !== null)));
  const zahlen = $derived(gewichte.map((w, i) => (vollstaendig[i] ? (w as number[]) : null)));
  const ergebnis = $derived(zahlen.map(w => (w && summeNull(w) ? kontrast(g, w, annahme) : null)));
  const paare = $derived.by(() => {
    const aus: { a: number; b: number; ortho: boolean }[] = [];
    for (let a = 0; a < zahlen.length; a++) for (let b = a + 1; b < zahlen.length; b++) { const x = zahlen[a], y = zahlen[b]; if (x && y && summeNull(x) && summeNull(y)) aus.push({ a, b, ortho: orthogonal(g, x, y) }); }
    return aus;
  });
  const gleichGross = $derived(g.every(x => x.n === g[0]!.n));
  const z3 = (v: number) => komma(v, 3);
  const pT = (p: number) => (p < 0.001 ? L('< ,001', '< .001') : ohneNull(p, 3));
  const summeText = (i: number) => {
    if (!vollstaendig[i]) return L('unvollständig', 'incomplete');
    const w = zahlen[i]!, s = w.reduce((a, b) => a + b, 0);
    return summeNull(w) ? L('0 (passt)', '0 (fits)') : L(`${komma(s, 3)} (muss 0 sein)`, `${komma(s, 3)} (must be 0)`);
  };
  function zeileDazu() { zeilen = [...zeilen, Array.from({ length: k }, () => '')]; }
  function zeileWeg(i: number) { zeilen = zeilen.filter((_, j) => j !== i); if (!zeilen.length) zeileDazu(); }
  const rechenbar = $derived(ergebnis.filter(Boolean).length);
  const zusammenfassung = $derived(ergebnis.map((r, i) => (r ? L(`Kontrast ${i + 1}: Schätzung ${z3(r.schaetzung)}, p ${pT(r.p)}.`, `Contrast ${i + 1}: estimate ${z3(r.schaetzung)}, p ${pT(r.p)}.`) : '')).filter(Boolean).join(' '));

  /* ---------- Trendanalyse ---------- */
  const echteAbstaende = $derived(zahlenAusNamen(g.map(x => x.name)));
  let abstand = $state<'gleich' | 'echt'>('gleich');
  const trend = $derived(trendanalyse(g, abstand === 'echt' && echteAbstaende ? echteAbstaende : undefined));
  const trendName = (grad: number) => (grad === 1 ? L('linear', 'linear') : grad === 2 ? L('quadratisch', 'quadratic') : grad === 3 ? L('kubisch', 'cubic') : L(`${grad}. Grades`, `degree ${grad}`));
</script>

{#if phMoeglich(g)}
<details class="auf" style="margin-top:var(--a4)"><summary>{L('Geplante Vergleiche (Kontraste) und Trendanalyse', 'Planned comparisons (contrasts) and trend analysis')}</summary>
  <p class="heft-text">{L('Welche Frage stand schon vor der Auswertung fest? Ein geplanter Vergleich (Kontrast) fragt gezielt, zum Beispiel: Liegt die Kontrollgruppe anders als die beiden Behandlungen zusammen? Dafür steht je Gruppe ein Kontrastgewicht: Gruppen mit positivem Gewicht werden gegen Gruppen mit negativem Gewicht verglichen, Gruppen mit Gewicht 0 bleiben draußen. Die Gewichte müssen zusammen 0 ergeben.', 'Which question was fixed before the analysis? A planned comparison (contrast) asks a specific question, for example: does the control group differ from the two treatments together? For this, each group gets a contrast weight: groups with a positive weight are compared with groups with a negative weight, groups with weight 0 stay out. The weights must add up to 0.')}</p>
  <p class="hilfe"><HilfeLink id="geplanter-kontrast" text={L('Hilfe: Geplanter Vergleich (Kontrast)', 'Help: planned comparison (contrast)')} /> <HilfeLink id="helmert" text={L('Hilfe: Helmert-Kontrast', 'Help: Helmert contrast')} /> <HilfeLink id="trendanalyse" text={L('Hilfe: Trendanalyse (Polynomkontrast)', 'Help: trend analysis (polynomial contrast)')} /></p>

  <div class="einst-gruppe">
    <h3 id="kt-v-{kennung}">{L('Gewichte eingeben', 'Enter the weights')}</h3>
    <div class="eingabe" style="max-width:520px"><label for="kt-vorlage-{kennung}">{L('Vorlage, die die Gewichte füllt', 'Template that fills the weights')}</label>
      <select id="kt-vorlage-{kennung}" bind:value={vorlageWahl}>{#each VORLAGEN as [w, t] (w)}<option value={w}>{t}</option>{/each}</select></div>
    <div class="knopfzeile" style="margin-top:var(--a2)"><button class="k" type="button" onclick={einsetzen}>{L('Vorlage einsetzen', 'Insert template')}</button></div>
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Kontrastgewichte je Gruppe', 'Contrast weights per group')}</b></caption>
      <thead><tr><th scope="col">{L('Kontrast', 'Contrast')}</th>{#each g as x, j (j)}<th scope="col">{x.name}</th>{/each}<th scope="col">{L('Summe', 'Sum')}</th><th scope="col"><span class="nur-vorleser">{L('Entfernen', 'Remove')}</span></th></tr></thead>
      <tbody>{#each zeilen as z, i (i)}<tr>
        <th scope="row" style="text-align: start">{L(`Kontrast ${i + 1}`, `Contrast ${i + 1}`)}</th>
        {#each z as _, j (j)}<td><input type="text" inputmode="decimal" size="6" style="text-align:right" bind:value={z[j]} aria-label={L(`Gewicht von „${g[j]!.name}“ im Kontrast ${i + 1}`, `Weight of "${g[j]!.name}" in contrast ${i + 1}`)}></td>{/each}
        <td style="text-align:right">{summeText(i)}</td>
        <td><button class="k" type="button" onclick={() => zeileWeg(i)} aria-label={L(`Kontrast ${i + 1} entfernen`, `Remove contrast ${i + 1}`)}>{L('Entfernen', 'Remove')}</button></td>
      </tr>{/each}</tbody>
    </table></div>
    <div class="knopfzeile"><button class="k" type="button" onclick={zeileDazu}>{L('Weiteren Kontrast hinzufügen', 'Add another contrast')}</button></div>
    <p class="heft-text">{L('Gewichte als Zahl oder Bruch, zum Beispiel -2, 0,5 oder 1/3.', 'Weights as a number or fraction, for example -2, 0.5 or 1/3.')}</p>

    <h3 id="kt-a-{kennung}" style="margin-top:var(--a3)">{L('Mit welcher Streuung rechnen?', 'Which spread to use?')}</h3>
    <div class="segment" role="radiogroup" aria-labelledby="kt-a-{kennung}">
      <label><input type="radio" name="kt-annahme-{kennung}" value="welch" checked={annahme === 'welch'} onchange={() => (annahme = 'welch')}>{L('Ohne gleiche Varianzen (Welch, Standard)', 'Without equal variances (Welch, default)')}</label>
      <label><input type="radio" name="kt-annahme-{kennung}" value="gemeinsam" checked={annahme === 'gemeinsam'} onchange={() => (annahme = 'gemeinsam')}>{L('Mit gemeinsamer Fehlervarianz (wie SPSS und emmeans)', 'With pooled error variance (as in SPSS and emmeans)')}</label>
    </div>
    <p class="heft-text">{annahme === 'welch'
      ? L('Jede Gruppe geht mit ihrer eigenen Streuung ein; die Freiheitsgrade sind nicht ganzzahlig (Satterthwaite). Das braucht keine gleich große Streuung.', 'Each group enters with its own spread; the degrees of freedom are not whole numbers (Satterthwaite). This does not need equal spread.')
      : L('Alle Gruppen teilen sich eine Streuung (die mittlere Quadratsumme innerhalb). Das setzt gleich große Streuung in den Gruppen voraus, nutzt aber alle Fälle für die Schätzung.', 'All groups share one spread (the mean square within). This assumes equal spread in the groups but uses all cases for the estimate.')}</p>

    <p use:ergebnisAnsage class="nur-vorleser">{zusammenfassung}</p>
    {#if rechenbar}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{annahme === 'welch' ? L('Geplante Kontraste (Welch)', 'Planned contrasts (Welch)') : L('Geplante Kontraste (gemeinsame Fehlervarianz)', 'Planned contrasts (pooled error variance)')}</b></caption>
        <thead><tr><th scope="col">{L('Kontrast', 'Contrast')}</th><th scope="col">{L('Schätzung', 'Estimate')}</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">t</th><th scope="col">df</th><th scope="col">p</th><th scope="col">{L('95 %-KI untere Grenze', '95% CI lower')}</th><th scope="col">{L('95 %-KI obere Grenze', '95% CI upper')}</th></tr></thead>
        <tbody>{#each ergebnis as r, i (i)}{#if r}<tr><th scope="row" style="text-align: start">{L(`Kontrast ${i + 1}`, `Contrast ${i + 1}`)}</th><td style="text-align:right">{z3(r.schaetzung)}</td><td style="text-align:right">{z3(r.se)}</td><td style="text-align:right">{komma(r.t, 2)}</td><td style="text-align:right">{komma(r.df, annahme === 'welch' ? 2 : 0)}</td><td style="text-align:right">{pT(r.p)}</td><td style="text-align:right">{z3(r.lo)}</td><td style="text-align:right">{z3(r.hi)}</td></tr>{/if}{/each}</tbody>
      </table></div>
      <p class="heft-text">{L('Die Schätzung ist die gewichtete Summe der Gruppenmittel. Haben zwei Gruppen die Gewichte −1 und +1, ist sie der Unterschied ihrer Mittelwerte; andere Gewichte skalieren die Schätzung, den Test (t und p) nicht.', 'The estimate is the weighted sum of the group means. If two groups have the weights −1 and +1, it is the difference of their means; other weights rescale the estimate, not the test (t and p).')}</p>
    {:else}
      <p class="heft-text">{L('Sobald die Gewichte vollständig sind und zusammen 0 ergeben, steht hier die Tabelle mit Schätzung, Standardfehler, t, Freiheitsgraden, p und 95 %-Intervall.', 'As soon as the weights are complete and add up to 0, the table with estimate, standard error, t, degrees of freedom, p and 95% interval appears here.')}</p>
    {/if}
    {#if zeilen.some((_, i) => vollstaendig[i] && zahlen[i] && !summeNull(zahlen[i]!))}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{L('Die Gewichte eines Kontrasts ergeben zusammen nicht 0: Dann vergleicht er keine Gruppen miteinander, und Statable rechnet ihn nicht.', 'The weights of a contrast do not add up to 0: it then compares no groups with each other, and Statable does not calculate it.')}</p>{/if}
    {#if paare.length}
      <p class="heft-text">{#each paare as p, i (i)}{p.ortho
        ? L(`Kontrast ${p.a + 1} und ${p.b + 1} sind orthogonal: Ihre Schätzungen sind voneinander unabhängig. `, `Contrast ${p.a + 1} and ${p.b + 1} are orthogonal: their estimates are independent of each other. `)
        : L(`Kontrast ${p.a + 1} und ${p.b + 1} sind nicht orthogonal: Sie überschneiden sich, ihre Ergebnisse sind nicht voneinander unabhängig. `, `Contrast ${p.a + 1} and ${p.b + 1} are not orthogonal: they overlap, their results are not independent of each other. `)}{/each}{gleichGross ? '' : L('Die Gruppen sind unterschiedlich groß; orthogonal heißt dann Σ c·d/n = 0 (nicht Σ c·d = 0).', 'The groups differ in size; orthogonal then means Σ c·d/n = 0 (not Σ c·d = 0).')}</p>
    {/if}
    <p class="heft-text">{L(`Bei k = ${k} Gruppen gibt es höchstens ${k - 1} voneinander unabhängige (orthogonale) Kontraste. Die Kontraste müssen vor dem Blick auf die Daten geplant sein; wer sie erst danach wählt, rechnet besser mit dem Scheffé-Test (unter „Welche Gruppen unterscheiden sich?“). Mehr als ${k - 1} Kontraste oder nicht orthogonale Kontraste: Das Niveau anpassen (zum Beispiel Bonferroni).`, `With k = ${k} groups there are at most ${k - 1} independent (orthogonal) contrasts. The contrasts must be planned before looking at the data; if they are chosen only afterwards, the Scheffé test is the better choice (under "Which groups differ?"). More than ${k - 1} contrasts or non-orthogonal contrasts: adjust the level (for example Bonferroni).`)}</p>
  </div>

  {#if k >= 3}
  <div class="einst-gruppe">
    <h3 id="kt-t-{kennung}">{L('Trendanalyse für geordnete Stufen (Polynomkontraste)', 'Trend analysis for ordered levels (polynomial contrasts)')}</h3>
    <p class="heft-text">{L('Steigt oder fällt der Mittelwert mit den Stufen gleichmäßig (linearer Trend), oder biegt er sich (quadratischer Trend, kubischer Trend und so weiter)? Das ergibt nur Sinn, wenn die Gruppen eine feste Reihenfolge haben, zum Beispiel Dosisstufen. Die Reihenfolge ist die der Gruppen in der Tabelle.', 'Does the mean rise or fall evenly with the levels (linear trend), or does it bend (quadratic trend, cubic trend and so on)? This only makes sense if the groups have a fixed order, for example dose levels. The order is that of the groups in the table.')}</p>
    <div class="segment" role="radiogroup" aria-labelledby="kt-t-{kennung}">
      <label><input type="radio" name="kt-abstand-{kennung}" value="gleich" checked={abstand === 'gleich'} onchange={() => (abstand = 'gleich')}>{L('Gleiche Abstände zwischen den Stufen', 'Equal spacing between the levels')}</label>
      <label><input type="radio" name="kt-abstand-{kennung}" value="echt" checked={abstand === 'echt' && !!echteAbstaende} disabled={!echteAbstaende} onchange={() => (abstand = 'echt')}>{L('Echte Abstände (Zahlenwerte der Gruppen)', 'True spacing (the numbers of the groups)')}</label>
    </div>
    {#if !echteAbstaende}<p class="heft-text">{L('Echte Abstände gehen, wenn alle Gruppen Zahlen sind (zum Beispiel 0,5, 1 und 2). Hier tragen nicht alle Gruppen eine Zahl als Namen.', 'True spacing works when all groups are numbers (for example 0.5, 1 and 2). Here not all groups have a number as their name.')}</p>{/if}
    {#if trend}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{abstand === 'echt' && echteAbstaende ? L('Trend (echte Abstände)', 'Trend (true spacing)') : L('Trend (gleiche Abstände)', 'Trend (equal spacing)')}</b></caption>
        <thead><tr><th scope="col">{L('Trend', 'Trend')}</th><th scope="col">{L('Gewichte', 'Weights')}</th><th scope="col">{L('Schätzung', 'Estimate')}</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">t</th><th scope="col">df</th><th scope="col">p</th><th scope="col">{L('Anteil an der Streuung zwischen den Gruppen', 'Share of the spread between the groups')}</th></tr></thead>
        <tbody>{#each trend as r (r.grad)}<tr><th scope="row" style="text-align: start">{trendName(r.grad)}</th><td>{r.gewichte.map(w => komma(w, abstand === 'echt' && echteAbstaende ? 3 : 0)).join('; ')}</td><td style="text-align:right">{z3(r.schaetzung)}</td><td style="text-align:right">{z3(r.se)}</td><td style="text-align:right">{komma(r.t, 2)}</td><td style="text-align:right">{komma(r.df, 0)}</td><td style="text-align:right">{pT(r.p)}</td><td style="text-align:right">{Number.isFinite(r.anteil) ? komma(r.anteil * 100, 1) + ' %' : '-'}</td></tr>{/each}</tbody>
      </table></div>
      <p class="heft-text">{L('Jeder Trend ist ein Kontrast mit gemeinsamer Fehlervarianz; die Trends sind bei gleich großen Gruppen voneinander unabhängig (orthogonal). Der Anteil sagt, wie viel der Streuung zwischen den Gruppen dieser Trend erklärt; bei gleich großen Gruppen ergeben alle Trends zusammen 100 %. Hohe Grade (ab dem vierten) lassen sich selten inhaltlich deuten.', 'Each trend is a contrast with pooled error variance; with equal group sizes the trends are independent (orthogonal). The share says how much of the spread between the groups this trend explains; with equal group sizes all trends together make 100%. High degrees (from the fourth) can rarely be interpreted in substance.')}</p>
    {:else}
      <p class="heft-text">{L('Für die Trendanalyse müssen die Zahlenwerte der Gruppen verschieden sein.', 'For the trend analysis the numbers of the groups must differ.')}</p>
    {/if}
  </div>
  {/if}
</details>
{/if}
