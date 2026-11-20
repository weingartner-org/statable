<script lang="ts">
  import { L, s } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { katDaten } from '../lib/kategreg';
  import { quantilDesign, untenWert, obenWert, type QuantilErgebnis } from '../lib/quantil';
  import { tabellenQuantil, quantilRCode } from '../lib/quantilsaetze';
  import Ausgabe from './Ausgabe.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import Quantildiagramm from './Quantildiagramm.svelte';
  import Quantilprozess from './Quantilprozess.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /** Ergebnis der Quantilregression (Später S-E, Q1): das Bild mit den Quantilgeraden (nur mit einer Zahl als Vorhersagegröße), auf Wunsch die Wirkung je τ, die Tabellen (dieselben Intervalle wie im Bild)
   *  und unter „Für Fachleute“ der R-Aufruf. Die Sätze stehen wie bei jedem Blatt oben im Ergebnis. */
  let { blatt, e, name }: { blatt: Blatt; e: QuantilErgebnis; name: (n: string) => string } = $props();
  const nichtK = $derived(e.koef.map((k, j) => ({ k, j })).filter(x => x.k.pIdx >= 0));
  let prozessAn = $state(false), prozessJ = $state(-1);
  const gewJ = $derived(prozessJ >= 0 && nichtK.some(x => x.j === prozessJ) ? prozessJ : nichtK[0]?.j ?? 1);
  /** Punkte des Bildes aus den Daten der Sitzung: dieselben vollständigen Fälle wie in der Rechnung. */
  const punkte = $derived.by((): [number, number][] => {
    if (!e.kreuzen.einZahl) return [];
    const dt = katDaten('zaehlreg', e.ziel, e.praed.map(p => p.name), s.zeilen, s.spalten), d = quantilDesign(dt, e.koef);
    return d.y.map((y, i) => [d.x[1]![i]!, y] as [number, number]);
  });
  const linien = $derived(e.erg.map(t => ({ tau: t.tau, a: t.b[0]!, b: t.b[1]! })));
  const xText = $derived(e.praed[0] ? name(e.praed[0].name) : ''), yText = $derived(name(e.ziel));
  const titel = $derived(`${L('Quantilregression', 'Quantile regression')}: ${yText}`);
  const jInfo = $derived(e.koef[gewJ]!);
  const jText = $derived(jInfo.pIdx >= 0 ? (e.praed[jInfo.pIdx]!.art === 'faktor' ? `${name(e.praed[jInfo.pIdx]!.name)}: ${jInfo.stufe}` : name(e.praed[jInfo.pIdx]!.name)) : '');
  const code = $derived(quantilRCode({ ziel: e.ziel, praed: e.praed, taus: e.taus, ki: e.ki, B: e.B, startwert: e.startwert }));
  const kann = $derived(e.erg.length >= 2 && nichtK.length > 0);
  const prozessId = $props.id();
</script>

{#if punkte.length}
  <DiagrammExport titel={titel}><Quantildiagramm {punkte} {linien} {xText} {yText} /></DiagrammExport>
{/if}
{#if kann}
  <div class="korr-wahl" style="margin-top:var(--a3)">
    <label data-begriff="quantilregression" class="schalter"><input type="checkbox" bind:checked={prozessAn}>{L('Wirkung je τ zeigen', 'Show the effect by τ')}</label>
    {#if prozessAn && nichtK.length > 1}
      <div class="eingabe" style="max-width:380px;margin-top:var(--a2)"><label for="qp-{prozessId}">{L('Vorhersagegröße', 'Predictor')}</label>
        <select id="qp-{prozessId}" onchange={(ev) => (prozessJ = Number(ev.currentTarget.value))}>
          {#each nichtK as x (x.j)}<option value={x.j} selected={x.j === gewJ}>{x.k.stufe ? `${name(e.praed[x.k.pIdx]!.name)}: ${x.k.stufe}` : name(e.praed[x.k.pIdx]!.name)}</option>{/each}
        </select></div>
    {/if}
  </div>
  {#if prozessAn}
    <DiagrammExport titel={`${titel} - ${jText}`}><Quantilprozess taus={e.taus} b={e.erg.map(t => t.b[gewJ]!)} unten={e.erg.map(t => untenWert(t.unten[gewJ]))} oben={e.erg.map(t => obenWert(t.oben[gewJ]))} ols={{ b: e.ols.b[gewJ]!, unten: e.ols.unten[gewJ]!, oben: e.ols.oben[gewJ]! }} xText={jText} yText={yText} /></DiagrammExport>
    <p class="hilfe" style="margin-top:var(--a2)">{L('Das Bild zeigt dieselben Intervalle wie die Tabelle. Die Punkte sind die Schätzungen, die Striche das 95 %-Intervall; gestrichelt steht die gewöhnliche Regression (Mittelwert).', 'The chart shows the same intervals as the table. The dots are the estimates, the bars the 95% interval; the dashed line is the ordinary regression (mean).')}</p>
  {/if}
{/if}
<div style="margin-top:var(--a4)"><Ausgabe items={tabellenQuantil(e, name)} nurTabellen /></div>
<p class="hilfe" style="margin-top:var(--a2)"><HilfeLink id="quantilregression" text={L('Hilfe: Quantilregression lesen', 'Help: reading quantile regression')} /></p>
<details class="auf" style="margin-top:var(--a4)"><summary>{L('Für Fachleute', 'For specialists')}</summary>
  <p class="heft-text">{L('Quantilregression mit dem Simplex-Verfahren nach Barrodale und Roberts (quantreg::rq.fit.br). Bis 1000 Fälle rechnet Statable das Konfidenzintervall mit dem Fall-Bootstrap (Paare, 2000 Ziehungen, fester Startwert, Perzentil-Intervall); darüber mit der nid-Näherung. Die Voreinstellung von summary.rq (90 %, gleiche Streuung) übernimmt Statable nie. Die Zahlen sind gegen R (quantreg, lpSolve) geprüft.',
    'Quantile regression with the simplex method of Barrodale and Roberts (quantreg::rq.fit.br). Up to 1000 cases Statable calculates the confidence interval with the case bootstrap (pairs, 2000 draws, fixed seed, percentile interval); above that with the nid approximation. Statable never takes over the default of summary.rq (90%, equal spread). The numbers are checked against R (quantreg, lpSolve).')}</p>
  <pre class="befehl">{code}</pre>
</details>
