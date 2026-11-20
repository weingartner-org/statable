<script module lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  type Art = 'zwei' | 'gepaart' | 'gruppen' | 'korr' | 'tabelle';
  /** Die Eingaben bleiben beim Wechsel zur Hilfe und zurück erhalten (Zustand nur im Modul, nie im Projekt). */
  let lokal = false;
  const z = $state({
    art: 'zwei' as Art, niveau: 0.95,
    m1: '5', s1: '2', n1: '12', m2: '3,5', s2: '1,5', n2: '10',
    md: '1,2', sd: '2,1', nd: '15',
    gruppen: [{ m: '5,1', s: '1,2', n: '10' }, { m: '6,3', s: '1,5', n: '12' }, { m: '7,2', s: '1,1', n: '9' }],
    r: '0,45', nr: '30',
    zeilen: 2, spalten: 2, tab: [['12', '8', '0', '0'], ['6', '14', '0', '0'], ['0', '0', '0', '0'], ['0', '0', '0', '0']]
  });
</script>
<script lang="ts">
  /** „Gruppen aus Kennzahlen vergleichen“ (S-K K4): die Rechnungen des TI-84 im Menü „Stats“, ohne Rohdaten. Mit den Schritten für den TI-84 und Excel. */
  import { s as sitz, L, d } from '../lib/sitzung.svelte';
  import { iv } from '../i18n/profil';
  import { komma, pWert } from '../lib/ergebnis';
  import { liesZahl } from '../lib/verteilungen';
  import { lokalisiere } from '../lib/verstehenformat';
  import { xl } from '../lib/exceltianleitung';
  import { zweiMittel, gepaart, einfaktor, korrelation, tabelle, type VergleichFehler } from '../lib/kennzahlenvergleich';

  if (!lokal) { lokal = true; lokalisiere(z, ['m1', 's1', 'm2', 's2', 'md', 'sd', 'r']); z.gruppen.forEach(g => lokalisiere(g, ['m', 's'])); }
  const num = (t: string) => liesZahl(t);
  const k2 = (v: number) => komma(v, 2), k3 = (v: number) => komma(v, 3), pt = (p: number) => pWert(p);
  const fehler = (f: VergleichFehler) => f.fehler === 'n' ? L('Jede Gruppe braucht eine ganze Zahl von mindestens 2 Personen.', 'Every group needs a whole number of at least 2 people.')
    : f.fehler === 's' ? L('Die Standardabweichungen dürfen nicht negativ sein, und mindestens eine muss größer als 0 sein.', 'The standard deviations must not be negative, and at least one must be greater than 0.')
    : f.fehler === 'gruppen' ? L('Es braucht mindestens zwei Gruppen.', 'At least two groups are needed.')
    : f.fehler === 'r' ? L('r muss zwischen −1 und 1 liegen (ohne die Grenzen); n mindestens 4.', 'r must lie between −1 and 1 (excluding the limits); n at least 4.')
    : f.fehler === 'tabelle' ? L('Jede Zeile und jede Spalte der Tabelle braucht mindestens eine Person.', 'Every row and every column of the table needs at least one person.')
    : L('Bitte alle Felder mit Zahlen füllen.', 'Please fill all fields with numbers.');
  const ein = $derived({ a: { m: num(z.m1), s: num(z.s1), n: num(z.n1) }, b: { m: num(z.m2), s: num(z.s2), n: num(z.n2) } });
  const rz = $derived(zweiMittel(ein.a, ein.b, z.niveau)), rg = $derived(gepaart(num(z.md), num(z.sd), num(z.nd), z.niveau));
  const ra = $derived(einfaktor(z.gruppen.map(g => ({ m: num(g.m), s: num(g.s), n: num(g.n) })))), rk = $derived(korrelation(num(z.r), num(z.nr), z.niveau));
  const rt = $derived(tabelle(z.tab.slice(0, z.zeilen).map(r => r.slice(0, z.spalten).map(num))));
  const niveauProz = $derived(Math.round(z.niveau * 100));
  const gruppeplus = () => { if (z.gruppen.length < 6) z.gruppen.push({ m: '', s: '', n: '' }); };
  const gruppeminus = () => { if (z.gruppen.length > 2) z.gruppen.pop(); };
</script>

<div class="vst-block">
  <fieldset class="vst-gruppe"><legend>{L('1  Was soll verglichen werden?', '1  What is to be compared?')}</legend>
    <div class="vst-wahl" role="radiogroup" aria-label={L('Art des Vergleichs', 'Kind of comparison')}>
      <label data-begriff="unabhaengiger-t-test"><input type="radio" name="vv-art" value="zwei" bind:group={z.art}><span>{L('Zwei Gruppen', 'Two groups')} <span class="zeichen">(x̄, s, n)</span></span></label>
      <label data-begriff="gepaarter-t-test"><input type="radio" name="vv-art" value="gepaart" bind:group={z.art}><span>{L('Zwei Messungen derselben Personen', 'Two measurements of the same people')} <span class="zeichen">(d̄, s, n)</span></span></label>
      <label data-begriff="einfaktorielle-anova"><input type="radio" name="vv-art" value="gruppen" bind:group={z.art}><span>{L('Mehr als zwei Gruppen', 'More than two groups')}</span></label>
      <label data-begriff="korrelation"><input type="radio" name="vv-art" value="korr" bind:group={z.art}><span>{L('Eine Korrelation', 'A correlation')} <span class="zeichen">(r, n)</span></span></label>
      <label data-begriff="haeufigkeitstabelle"><input type="radio" name="vv-art" value="tabelle" bind:group={z.art}><span>{L('Eine Häufigkeitstabelle', 'A frequency table')} <span class="zeichen">(χ²)</span></span></label>
    </div>
  </fieldset>

  <fieldset class="vst-gruppe"><legend>{L('2  Die Zahlen', '2  The numbers')}</legend>
    {#if z.art === 'zwei'}
      <div class="vst-zeile"><span class="vst-etikett">{L('Gruppe 1', 'Group 1')}</span>
        <div class="eingabe"><label for="vv-m1">x̄₁</label><input id="vv-m1" type="text" inputmode="decimal" autocomplete="off" bind:value={z.m1} /></div>
        <div class="eingabe"><label for="vv-s1">s₁</label><input id="vv-s1" type="text" inputmode="decimal" autocomplete="off" bind:value={z.s1} /></div>
        <div class="eingabe"><label for="vv-n1">n₁</label><input id="vv-n1" type="text" inputmode="numeric" autocomplete="off" bind:value={z.n1} /></div></div>
      <div class="vst-zeile"><span class="vst-etikett">{L('Gruppe 2', 'Group 2')}</span>
        <div class="eingabe"><label for="vv-m2">x̄₂</label><input id="vv-m2" type="text" inputmode="decimal" autocomplete="off" bind:value={z.m2} /></div>
        <div class="eingabe"><label for="vv-s2">s₂</label><input id="vv-s2" type="text" inputmode="decimal" autocomplete="off" bind:value={z.s2} /></div>
        <div class="eingabe"><label for="vv-n2">n₂</label><input id="vv-n2" type="text" inputmode="numeric" autocomplete="off" bind:value={z.n2} /></div></div>
    {:else if z.art === 'gepaart'}
      <div class="vst-zeile">
        <div class="eingabe"><label for="vv-md">{L('Mittel der Unterschiede d̄', 'Mean of the differences d̄')}</label><input id="vv-md" type="text" inputmode="decimal" autocomplete="off" bind:value={z.md} /></div>
        <div class="eingabe"><label for="vv-sd">{L('Standardabweichung der Unterschiede s', 'Standard deviation of the differences s')}</label><input id="vv-sd" type="text" inputmode="decimal" autocomplete="off" bind:value={z.sd} /></div>
        <div class="eingabe"><label for="vv-nd">{L('Zahl der Personen n', 'Number of people n')}</label><input id="vv-nd" type="text" inputmode="numeric" autocomplete="off" bind:value={z.nd} /></div></div>
    {:else if z.art === 'gruppen'}
      {#each z.gruppen as g, i (i)}
        <div class="vst-zeile"><span class="vst-etikett">{L(`Gruppe ${i + 1}`, `Group ${i + 1}`)}</span>
          <div class="eingabe"><label for="vv-gm{i}">x̄</label><input id="vv-gm{i}" type="text" inputmode="decimal" autocomplete="off" bind:value={g.m} /></div>
          <div class="eingabe"><label for="vv-gs{i}">s</label><input id="vv-gs{i}" type="text" inputmode="decimal" autocomplete="off" bind:value={g.s} /></div>
          <div class="eingabe"><label for="vv-gn{i}">n</label><input id="vv-gn{i}" type="text" inputmode="numeric" autocomplete="off" bind:value={g.n} /></div></div>
      {/each}
      <div class="knopfzeile"><button class="k leise" type="button" onclick={gruppeplus} aria-disabled={z.gruppen.length >= 6 ? 'true' : undefined}>{L('Gruppe hinzufügen', 'Add group')}</button><button class="k leise" type="button" onclick={gruppeminus} aria-disabled={z.gruppen.length <= 2 ? 'true' : undefined}>{L('Gruppe entfernen', 'Remove group')}</button></div>
    {:else if z.art === 'korr'}
      <div class="vst-zeile">
        <div class="eingabe"><label for="vv-r">r</label><input id="vv-r" type="text" inputmode="decimal" autocomplete="off" bind:value={z.r} /></div>
        <div class="eingabe"><label for="vv-nr">n</label><input id="vv-nr" type="text" inputmode="numeric" autocomplete="off" bind:value={z.nr} /></div></div>
    {:else}
      <div class="vst-zeile">
        <div class="eingabe"><label for="vv-zn">{L('Zeilen (2 bis 4)', 'Rows (2 to 4)')}</label><select id="vv-zn" bind:value={z.zeilen}>{#each [2, 3, 4] as k}<option value={k}>{k}</option>{/each}</select></div>
        <div class="eingabe"><label for="vv-sn">{L('Spalten (2 bis 4)', 'Columns (2 to 4)')}</label><select id="vv-sn" bind:value={z.spalten}>{#each [2, 3, 4] as k}<option value={k}>{k}</option>{/each}</select></div></div>
      {#each z.tab.slice(0, z.zeilen) as zeile, i (i)}
        <div class="vst-zeile"><span class="vst-etikett">{L(`Zeile ${i + 1}`, `Row ${i + 1}`)}</span>{#each zeile.slice(0, z.spalten) as _, j (j)}<div class="eingabe"><label for="vv-t{i}{j}" class="nur-vorleser">{L(`Zeile ${i + 1}, Spalte ${j + 1}`, `Row ${i + 1}, column ${j + 1}`)}</label><input id="vv-t{i}{j}" type="text" inputmode="numeric" autocomplete="off" bind:value={z.tab[i]![j]} /></div>{/each}</div>
      {/each}
    {/if}
  </fieldset>

  {#if z.art !== 'tabelle'}
  <fieldset class="vst-gruppe"><legend>{L('3  Wie sicher?', '3  How certain?')}</legend>
    <div class="segment" role="radiogroup" aria-label={L('Vertrauensniveau', 'Confidence level')}>{#each [0.9, 0.95, 0.99] as nv}<label data-begriff="vertrauensniveau"><input type="radio" name="vv-nv" checked={z.niveau === nv} onchange={() => (z.niveau = nv)} />{Math.round(nv * 100)} %</label>{/each}</div>
  </fieldset>
  {/if}

  <div class="vst-ergebnis" use:ergebnisAnsage={{ satz: '.heft-text' }}>
    {#if z.art === 'zwei'}
      {#if 'fehler' in rz}<p role="alert" class="vst-fehler">{fehler(rz)}</p>
      {:else}
        <div style="overflow-x:auto"><table class="apa"><caption><b>{L('Zwei Gruppen: t-Test', 'Two groups: t test')}</b></caption>
          <thead><tr><th scope="col">{L('Rechnung', 'Calculation')}</th><th scope="col">t</th><th scope="col">df</th><th scope="col">p</th><th scope="col">{niveauProz} %-{L('Bereich der Differenz', 'interval of the difference')}</th></tr></thead>
          <tbody>
            <tr><th scope="row" style="text-align: start">{L('Klassisch (gleiche Streuung)', 'Classical (equal spread)')}</th><td>{k3(rz.klassisch.t)}</td><td>{k2(rz.klassisch.df)}</td><td>{pt(rz.klassisch.p).replace(/^= /, '')}</td><td>{iv(k3(rz.klassisch.lo), k3(rz.klassisch.hi))}</td></tr>
            <tr><th scope="row" style="text-align: start">Welch</th><td>{k3(rz.welch.t)}</td><td>{k2(rz.welch.df)}</td><td>{pt(rz.welch.p).replace(/^= /, '')}</td><td>{iv(k3(rz.welch.lo), k3(rz.welch.hi))}</td></tr>
          </tbody></table></div>
        <p class="heft-text">{L(`Unterschied der Mittelwerte ${k3(rz.klassisch.diff)}; gemeinsame Standardabweichung ${k3(rz.sp)}; Cohens d = ${k3(rz.d)} (${iv(k2(rz.dLo), k2(rz.dHi))}), Hedges g = ${k3(rz.g)}.`, `Difference of the means ${k3(rz.klassisch.diff)}; common standard deviation ${k3(rz.sp)}; Cohen's d = ${k3(rz.d)} (${iv(k2(rz.dLo), k2(rz.dHi))}), Hedges' g = ${k3(rz.g)}.`)}</p>
        {#if sitz.einst.bezuege?.ti84 || sitz.einst.bezuege?.excel}<h3>{L('So geht es auf dem TI-84 und in Excel', 'How to do it on the TI-84 and in Excel')}</h3>
        <ul class="heft-text">
          {#if sitz.einst.bezuege?.ti84}<li>{L(`TI-84: STAT ▸ TESTS ▸ 4:2-SampTTest …, Inpt: Stats, x̄1 = ${z.m1}, Sx1 = ${z.s1}, n1 = ${z.n1}, x̄2 = ${z.m2}, Sx2 = ${z.s2}, n2 = ${z.n2}, μ1: ≠μ2, Pooled: Yes (klassisch) oder No (Welch), Calculate.`, `TI-84: STAT ▸ TESTS ▸ 4:2-SampTTest …, Inpt: Stats, x̄1 = ${z.m1}, Sx1 = ${z.s1}, n1 = ${z.n1}, x̄2 = ${z.m2}, Sx2 = ${z.s2}, n2 = ${z.n2}, μ1: ≠μ2, Pooled: Yes (classical) or No (Welch), Calculate.`)}</li>{/if}
          {#if sitz.einst.bezuege?.excel}<li>{L(`Excel, p-Wert aus t: ${xl('T.DIST.2T', 'T.VERT.2S', `ABS(${k3(rz.klassisch.t)})`, String(rz.klassisch.df))} (klassisch), ${xl('T.DIST.2T', 'T.VERT.2S', `ABS(${k3(rz.welch.t)})`, k2(rz.welch.df))} (Welch)`, `Excel, p value from t: ${xl('T.DIST.2T', 'T.VERT.2S', `ABS(${k3(rz.klassisch.t)})`, String(rz.klassisch.df))} (classical), ${xl('T.DIST.2T', 'T.VERT.2S', `ABS(${k3(rz.welch.t)})`, k2(rz.welch.df))} (Welch)`)}</li>{/if}
        </ul>
        {/if}
      {/if}
    {:else if z.art === 'gepaart'}
      {#if 'fehler' in rg}<p role="alert" class="vst-fehler">{fehler(rg)}</p>
      {:else}
        <p class="ergebnis-satz">{L(`t(${rg.df}) = ${k3(rg.t)}, p ${pt(rg.p)}; ${niveauProz} %-Bereich des Mittels der Unterschiede ${iv(k3(rg.lo), k3(rg.hi))}; d_z = ${k3(rg.dz)} (${iv(k2(rg.dzLo), k2(rg.dzHi))}).`, `t(${rg.df}) = ${k3(rg.t)}, p ${pt(rg.p)}; ${niveauProz}% interval of the mean difference ${iv(k3(rg.lo), k3(rg.hi))}; d_z = ${k3(rg.dz)} (${iv(k2(rg.dzLo), k2(rg.dzHi))}).`)}</p>
        {#if sitz.einst.bezuege?.ti84 || sitz.einst.bezuege?.excel}<h3>{L('So geht es auf dem TI-84 und in Excel', 'How to do it on the TI-84 and in Excel')}</h3>
        <ul class="heft-text">
          {#if sitz.einst.bezuege?.ti84}<li>{L(`TI-84: STAT ▸ TESTS ▸ 2:T-Test …, Inpt: Stats, μ0 = 0, x̄ = ${z.md}, Sx = ${z.sd}, n = ${z.nd}, μ: ≠μ0, Calculate.`, `TI-84: STAT ▸ TESTS ▸ 2:T-Test …, Inpt: Stats, μ0 = 0, x̄ = ${z.md}, Sx = ${z.sd}, n = ${z.nd}, μ: ≠μ0, Calculate.`)}</li>{/if}
          {#if sitz.einst.bezuege?.excel}<li>{L(`Excel, p-Wert: ${xl('T.DIST.2T', 'T.VERT.2S', `ABS(${k3(rg.t)})`, String(rg.df))}`, `Excel, p value: ${xl('T.DIST.2T', 'T.VERT.2S', `ABS(${k3(rg.t)})`, String(rg.df))}`)}</li>{/if}
        </ul>
        {/if}
      {/if}
    {:else if z.art === 'gruppen'}
      {#if 'fehler' in ra}<p role="alert" class="vst-fehler">{fehler(ra)}</p>
      {:else}
        <div style="overflow-x:auto"><table class="apa"><caption><b>{L('Einfaktorielle Varianzanalyse (klassisch)', 'One-way analysis of variance (classical)')}</b></caption>
          <thead><tr><th scope="col">{L('Quelle', 'Source')}</th><th scope="col">{L('Quadratsumme', 'Sum of squares')}</th><th scope="col">df</th><th scope="col">{L('Mittleres Quadrat', 'Mean square')}</th><th scope="col">F</th><th scope="col">p</th></tr></thead>
          <tbody>
            <tr><th scope="row" style="text-align: start">{L('Zwischen den Gruppen', 'Between groups')}</th><td>{k3(ra.ssZwischen)}</td><td>{ra.dfZwischen}</td><td>{k3(ra.msZwischen)}</td><td>{k3(ra.f)}</td><td>{pt(ra.p).replace(/^= /, '')}</td></tr>
            <tr><th scope="row" style="text-align: start">{L('Innerhalb der Gruppen', 'Within groups')}</th><td>{k3(ra.ssInnerhalb)}</td><td>{ra.dfInnerhalb}</td><td>{k3(ra.msInnerhalb)}</td><td></td><td></td></tr>
          </tbody></table></div>
        <p class="heft-text">{L(`η² = ${k3(ra.eta2)}; Gesamtmittel ${k3(ra.gesamtMittel)}; ${ra.n} Personen.`, `η² = ${k3(ra.eta2)}; grand mean ${k3(ra.gesamtMittel)}; ${ra.n} people.`)}</p>
        {#if sitz.einst.bezuege?.ti84 || sitz.einst.bezuege?.excel}<h3>{L('So geht es auf dem TI-84 und in Excel', 'How to do it on the TI-84 and in Excel')}</h3>
        <ul class="heft-text">
          {#if sitz.einst.bezuege?.ti84}<li>{L(`TI-84, p-Wert aus F: 2nd ▸ DISTR ▸ Fcdf(${k3(ra.f)}, 1E99, ${ra.dfZwischen}, ${ra.dfInnerhalb}) ergibt p.`, `TI-84, p value from F: 2nd ▸ DISTR ▸ Fcdf(${k3(ra.f)}, 1E99, ${ra.dfZwischen}, ${ra.dfInnerhalb}) gives p.`)}</li>{/if}
          {#if sitz.einst.bezuege?.excel}<li>{L(`Excel, p-Wert aus F: ${xl('F.DIST.RT', 'F.VERT.RE', k3(ra.f), String(ra.dfZwischen), String(ra.dfInnerhalb))}`, `Excel, p value from F: ${xl('F.DIST.RT', 'F.VERT.RE', k3(ra.f), String(ra.dfZwischen), String(ra.dfInnerhalb))}`)}</li>{/if}
        </ul>
        {/if}
      {/if}
    {:else if z.art === 'korr'}
      {#if 'fehler' in rk}<p role="alert" class="vst-fehler">{fehler(rk)}</p>
      {:else}
        <p class="ergebnis-satz">{L(`t(${rk.df}) = ${k3(rk.t)}, p ${pt(rk.p)}; ${niveauProz} %-Bereich für r ${iv(k3(rk.lo), k3(rk.hi))}.`, `t(${rk.df}) = ${k3(rk.t)}, p ${pt(rk.p)}; ${niveauProz}% interval for r ${iv(k3(rk.lo), k3(rk.hi))}.`)}</p>
        {#if sitz.einst.bezuege?.ti84 || sitz.einst.bezuege?.excel}<h3>{L('So geht es auf dem TI-84 und in Excel', 'How to do it on the TI-84 and in Excel')}</h3>
        <ul class="heft-text">
          {#if sitz.einst.bezuege?.ti84}<li>{L(`TI-84, p-Wert: 2 · tcdf(−1E99, −${k3(Math.abs(rk.t))}, ${rk.df}) (2nd ▸ DISTR ▸ tcdf).`, `TI-84, p value: 2 · tcdf(−1E99, −${k3(Math.abs(rk.t))}, ${rk.df}) (2nd ▸ DISTR ▸ tcdf).`)}</li>{/if}
          {#if sitz.einst.bezuege?.excel}<li>{L(`Excel, p-Wert: ${xl('T.DIST.2T', 'T.VERT.2S', `ABS(${k3(rk.t)})`, String(rk.df))}`, `Excel, p value: ${xl('T.DIST.2T', 'T.VERT.2S', `ABS(${k3(rk.t)})`, String(rk.df))}`)}</li>{/if}
        </ul>
        {/if}
      {/if}
    {:else}
      {#if 'fehler' in rt}<p role="alert" class="vst-fehler">{fehler(rt)}</p>
      {:else}
        <p class="ergebnis-satz">{L(`χ²(${rt.df}) = ${k3(rt.chi2)}, p ${pt(rt.p)}; Cramérs V = ${k3(rt.v)}; n = ${rt.n}.`, `χ²(${rt.df}) = ${k3(rt.chi2)}, p ${pt(rt.p)}; Cramér's V = ${k3(rt.v)}; n = ${rt.n}.`)}</p>
        <div style="overflow-x:auto"><table class="apa"><caption><b>{L('Erwartete Anzahlen', 'Expected counts')}</b></caption><tbody>{#each rt.erwartet as zeile, i (i)}<tr>{#each zeile as v, j (j)}<td style="text-align:right">{k2(v)}</td>{/each}</tr>{/each}</tbody></table></div>
        {#if rt.unter5}<p class="heft-text" role="alert">{L(`${rt.unter5} erwartete Anzahlen liegen unter 5 (kleinste ${k2(rt.minErwartet)}): Der χ²-Test ist dann nur grob.`, `${rt.unter5} expected counts are below 5 (smallest ${k2(rt.minErwartet)}): the χ² test is then only rough.`)}</p>{/if}
        {#if sitz.einst.bezuege?.ti84 || sitz.einst.bezuege?.excel}<h3>{L('So geht es auf dem TI-84 und in Excel', 'How to do it on the TI-84 and in Excel')}</h3>
        <ul class="heft-text">
          {#if sitz.einst.bezuege?.ti84}<li>{L('TI-84: die Tabelle als Matrix [A] eingeben (2nd ▸ x⁻¹ ▸ EDIT), dann STAT ▸ TESTS ▸ C:χ²-Test …, Observed: [A], Expected: [B], Calculate.', 'TI-84: enter the table as matrix [A] (2nd ▸ x⁻¹ ▸ EDIT), then STAT ▸ TESTS ▸ C:χ²-Test …, Observed: [A], Expected: [B], Calculate.')}</li>{/if}
          {#if sitz.einst.bezuege?.excel}<li>{L(`Excel, p-Wert aus χ²: ${xl('CHISQ.DIST.RT', 'CHIQU.VERT.RE', k3(rt.chi2), String(rt.df))}`, `Excel, p value from χ²: ${xl('CHISQ.DIST.RT', 'CHIQU.VERT.RE', k3(rt.chi2), String(rt.df))}`)}</li>{/if}
        </ul>
        {/if}
      {/if}
    {/if}
  </div>
  <p class="heft-text" style="color:var(--tinte-2)">{d('Alle Zahlen kommen aus den Kennzahlen, die du eingibst; die Rohdaten brauchst du nicht. Der klassische t-Test setzt gleiche Streuung in beiden Gruppen voraus, Welch nicht.', 'Alle Zahlen kommen aus den Kennzahlen, die Sie eingeben; die Rohdaten brauchen Sie nicht. Der klassische t-Test setzt gleiche Streuung in beiden Gruppen voraus, Welch nicht.', 'All numbers come from the summary numbers you enter; you do not need the raw data. The classical t test assumes equal spread in both groups, Welch does not.')}</p>
</div>
