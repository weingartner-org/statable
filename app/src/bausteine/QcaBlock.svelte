<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /** Qualitative Vergleichsanalyse (QCA) unter „Fälle vergleichen, Mixed Methods“ (S-H): crisp-set und fuzzy-set mit schon kalibrierten Werten (0 bis 1). Rechnet im Browser (lib/qca.ts). */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma } from '../lib/ergebnis';
  import { parseZahl } from '../lib/metaanalyse';
  import { qca } from '../lib/qca';

  const kennung = $props.id();
  const zahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let ergSp = $state(''), bed = $state<string[]>([]), incl = $state('0,8'), nMin = $state('1'), sparsam = $state(false);
  const ergebnisSp = $derived(zahlen.find(c => c.name === ergSp) ?? null);
  const gewaehlt = $derived(bed.filter(n => n !== ergebnisSp?.name && zahlen.some(c => c.name === n)));
  const inclZ = $derived(parseZahl(incl)), nZ = $derived(parseZahl(nMin));
  const eingabeFalsch = $derived(inclZ === null || !(inclZ > 0 && inclZ <= 1) || nZ === null || !(nZ >= 1) || !Number.isInteger(nZ));
  const daten = $derived.by(() => {
    if (!ergebnisSp || gewaehlt.length < 2) return null;
    const cols = [ergebnisSp, ...gewaehlt.map(n => zahlen.find(c => c.name === n)!)], ix = cols.map(c => s.spalten.findIndex(q => q.name === c.name));
    const x: number[][] = [], y: number[] = []; let ohne = 0;
    for (const z of s.zeilen) {
      const w = ix.map((i, k) => z[i]!);
      if (w.some((v, k) => typeof v !== 'number' || istFehlend(cols[k]!, v))) { ohne++; continue; }
      y.push(w[0] as number); x.push((w as number[]).slice(1));
    }
    return { x, y, ohne };
  });
  const res = $derived(daten && !eingabeFalsch ? qca({ namen: gewaehlt, x: daten.x, y: daten.y, inclGrenze: inclZ!, nMin: nZ!, priGrenze: 0, sparsam }) : null);
  const r = $derived(res && !('fehler' in res) ? res : null);
  const belegt = $derived(r ? r.zeilen.filter(z => z.n > 0) : []);
  const f3 = (v: number | null) => (v === null || !Number.isFinite(v) ? '-' : komma(v, 3));
  const wechsel = (n: string) => { bed = bed.includes(n) ? bed.filter(q => q !== n) : [...bed, n]; };
</script>

<details class="auf" style="margin-top:var(--a4)"><summary>{L('Welche Bedingungen führen zum Ergebnis? (QCA)', 'Which conditions lead to the outcome? (QCA)')}</summary>
  <p class="heft-text">{L('Die qualitative Vergleichsanalyse (QCA, nach Ragin) sucht bei wenigen Fällen die Kombinationen von Bedingungen, mit denen ein Ergebnis auftritt. Gebraucht werden Spalten mit Werten von 0 bis 1: nur 0 und 1 (crisp-set) oder Zugehörigkeitswerte dazwischen (fuzzy-set), schon kalibriert. Statable bildet die Wahrheitstafel und fasst die Zeilen mit dem Ergebnis zu möglichst kurzen Ausdrücken zusammen („A*b“ heißt: A vorhanden und B nicht vorhanden; „+“ heißt oder).', 'Qualitative comparative analysis (QCA, after Ragin) looks, in a small number of cases, for the combinations of conditions with which an outcome occurs. It needs columns with values from 0 to 1: only 0 and 1 (crisp set) or membership values in between (fuzzy set), already calibrated. Statable builds the truth table and reduces the rows with the outcome to the shortest possible expressions ("A*b" means: A present and B not present; "+" means or).')}</p>
  <p class="hilfe"><HilfeLink id="qca-konfigurationen" text={L('Hilfe: QCA', 'Help: QCA')} /></p>
  {#if zahlen.length < 3}<p class="heft-text" style="color:var(--tinte-2)">{L('Dafür braucht es das Ergebnis und mindestens zwei Bedingungen als Zahlenspalten.', 'This needs the outcome and at least two conditions as number columns.')}</p>
  {:else}
    <div class="eingabe" style="max-width:340px"><label for="qca-e-{kennung}">{L('Ergebnis (Spalte)', 'Outcome (column)')}</label>
      <select id="qca-e-{kennung}" bind:value={ergSp}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each zahlen as c (c.name)}<option value={c.name}>{c.bezeichnung.trim() || c.name}</option>{/each}</select></div>
    <fieldset class="segment" style="margin:var(--a2) 0"><legend>{L('Bedingungen (2 bis 8 Spalten)', 'Conditions (2 to 8 columns)')}</legend>
      {#each zahlen.filter(c => c.name !== ergebnisSp?.name) as c (c.name)}<label><input type="checkbox" checked={bed.includes(c.name)} onchange={() => wechsel(c.name)} />{c.bezeichnung.trim() || c.name}</label>{/each}
    </fieldset>
    <div style="display:flex;flex-wrap:wrap;gap:var(--a3);margin:var(--a2) 0">
      <div class="eingabe" style="max-width:200px"><label for="qca-i-{kennung}">{L('Mindest-Konsistenz', 'Minimum consistency')}</label><input id="qca-i-{kennung}" type="text" inputmode="decimal" bind:value={incl} autocomplete="off" /></div>
      <div class="eingabe" style="max-width:200px"><label for="qca-n-{kennung}">{L('Mindestzahl Fälle je Zeile', 'Minimum cases per row')}</label><input id="qca-n-{kennung}" type="text" inputmode="numeric" bind:value={nMin} autocomplete="off" /></div>
    </div>
    <label style="display:block;margin:var(--a2) 0"><input type="checkbox" bind:checked={sparsam} />{L('Sparsame Lösung (nicht beobachtete Kombinationen dürfen mithelfen)', 'Parsimonious solution (unobserved combinations may help)')}</label>
    {#if eingabeFalsch}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{L('Die Konsistenz muss zwischen 0 und 1 liegen, die Mindestzahl eine ganze Zahl ab 1 sein.', 'The consistency must lie between 0 and 1, the minimum a whole number from 1.')}</p>
    {:else if !ergebnisSp || gewaehlt.length < 2}<p class="heft-text" style="color:var(--tinte-2)">{L('Das Ergebnis und mindestens zwei Bedingungen wählen.', 'Choose the outcome and at least two conditions.')}</p>
    {:else if res && 'fehler' in res}
      <p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{res.fehler === 'werte' ? L('Alle Werte müssen zwischen 0 und 1 liegen (kalibriert). Eine Kalibrierung rechnet Statable hier nicht.', 'All values must lie between 0 and 1 (calibrated). Statable does not calibrate here.') : res.fehler === 'keine-einsen' ? L('Keine Kombination erreicht die Mindest-Konsistenz mit genug Fällen: Es gibt keine Lösung. Mit niedrigerer Konsistenz oder weniger Mindestfällen noch einmal probieren.', 'No combination reaches the minimum consistency with enough cases: there is no solution. Try again with a lower consistency or fewer minimum cases.') : res.fehler === 'keine-streuung' ? L('Das Ergebnis hat überall denselben Wert.', 'The outcome has the same value everywhere.') : res.fehler === 'zu-viele-bedingungen' ? L('Mehr als 8 Bedingungen rechnet Statable nicht.', 'Statable does not calculate more than 8 conditions.') : res.fehler === 'zu-wenig-bedingungen' ? L('Es braucht mindestens zwei Bedingungen.', 'At least two conditions are needed.') : L('Zu wenige Fälle.', 'Too few cases.')}</p>
    {:else if r && daten}
      <p class="heft-text" use:ergebnisAnsage>{L(`${daten.y.length} Fälle, ${r.zeilen.filter(z => z.out === '1').length} von ${belegt.length} beobachteten Zeilen der Wahrheitstafel führen zum Ergebnis.`, `${daten.y.length} cases, ${r.zeilen.filter(z => z.out === '1').length} of ${belegt.length} observed rows of the truth table lead to the outcome.`)}{daten.ohne ? ' ' + L(`${daten.ohne} Zeilen mit Lücken sind nicht dabei.`, `${daten.ohne} rows with gaps are not included.`) : ''}</p>
      {#if r.loesungen.length > 1}<p class="heft-text">{L(`Es gibt ${r.loesungen.length} gleichwertige Lösungen (Modellmehrdeutigkeit): Die Daten allein entscheiden nicht zwischen ihnen; das Fachwissen muss es tun.`, `There are ${r.loesungen.length} equally good solutions (model ambiguity): the data alone do not decide between them; subject knowledge has to.`)}</p>{/if}
      {#each r.loesungen as l, li (li)}
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{r.loesungen.length > 1 ? L(`Lösung ${li + 1}`, `Solution ${li + 1}`) : L('Lösung', 'Solution')}: {l.terme.map(t => t.text).join(' + ')}</b></caption>
          <thead><tr><th scope="col">{L('Ausdruck', 'Expression')}</th><th scope="col">{L('Konsistenz', 'Consistency')}</th><th scope="col">PRI</th><th scope="col">{L('Überdeckung (roh)', 'Coverage (raw)')}</th><th scope="col">{L('Überdeckung (eindeutig)', 'Coverage (unique)')}</th></tr></thead>
          <tbody>
            {#each l.terme as t (t.text)}<tr><th scope="row" style="text-align: start">{t.text}</th><td style="text-align:right">{f3(t.incl)}</td><td style="text-align:right">{f3(t.pri)}</td><td style="text-align:right">{f3(t.covS)}</td><td style="text-align:right">{f3(t.covU)}</td></tr>{/each}
            <tr><th scope="row" style="text-align: start">{L('Lösung insgesamt', 'Solution overall')}</th><td style="text-align:right">{f3(l.incl)}</td><td style="text-align:right">{f3(l.pri)}</td><td style="text-align:right">{f3(l.covS)}</td><td style="text-align:right">-</td></tr>
          </tbody>
        </table></div>
      {/each}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Notwendigkeit der einzelnen Bedingungen', 'Necessity of the single conditions')}</b></caption>
        <thead><tr><th scope="col">{L('Bedingung', 'Condition')}</th><th scope="col">{L('Konsistenz', 'Consistency')}</th><th scope="col">{L('Überdeckung', 'Coverage')}</th><th scope="col">{L('Relevanz (RoN)', 'Relevance (RoN)')}</th></tr></thead>
        <tbody>{#each r.notwendig as q (q.bedingung + (q.negiert ? 'n' : 'p'))}<tr><th scope="row" style="text-align: start">{q.negiert ? '~' : ''}{gewaehlt[q.bedingung]}</th><td style="text-align:right">{f3(q.incl)}</td><td style="text-align:right">{f3(q.cov)}</td><td style="text-align:right">{f3(q.ron)}</td></tr>{/each}</tbody>
      </table></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Eine Bedingung gilt als notwendig, wenn ihre Konsistenz mindestens 0,9 beträgt; die Relevanz sollte dann nicht niedrig sein (sonst ist die Bedingung fast überall vorhanden und sagt nichts aus).', 'A condition counts as necessary when its consistency is at least 0.9; the relevance should then not be low (otherwise the condition is present almost everywhere and says nothing).')}</p>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Wahrheitstafel (nur beobachtete Zeilen)', 'Truth table (observed rows only)')}</b></caption>
        <thead><tr>{#each gewaehlt as n (n)}<th scope="col">{n}</th>{/each}<th scope="col">{L('Ergebnis', 'Outcome')}</th><th scope="col">{L('Fälle', 'Cases')}</th><th scope="col">{L('Konsistenz', 'Consistency')}</th><th scope="col">PRI</th></tr></thead>
        <tbody>{#each belegt as z, zi (zi)}<tr>{#each z.muster as m, mi (mi)}<td style="text-align:center">{m}</td>{/each}<td style="text-align:center">{z.out}</td><td style="text-align:right">{z.n}</td><td style="text-align:right">{f3(z.incl)}</td><td style="text-align:right">{f3(z.pri)}</td></tr>{/each}</tbody>
      </table></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Eine Konsistenz unter 0,75 gilt als zu niedrig, um von einer hinreichenden Bedingung zu sprechen; die Überdeckung sagt, wie viel vom Ergebnis die Lösung erklärt. QCA zeigt Muster in wenigen Fällen, keine Wirkungen und keine Wahrscheinlichkeiten. Die Zwischenlösung mit Richtungserwartungen und die Kalibrierung der Rohdaten rechnet Statable hier nicht.', 'A consistency below 0.75 is considered too low to speak of a sufficient condition; coverage says how much of the outcome the solution explains. QCA shows patterns in a few cases, not effects and not probabilities. Statable does not calculate the intermediate solution with directional expectations or the calibration of raw data here.')}</p>
    {/if}
  {/if}
</details>
