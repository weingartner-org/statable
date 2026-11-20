<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import { kursSprung } from '../lib/kursziel';
  /** Kalibriergerade mit Nachweis-, Erfassungs- und Bestimmungsgrenze unter dem Streudiagramm von „Hängen zwei Dinge zusammen?“ (S-I, DIN 32645). Rechnet im Browser (lib/kalibrierung.ts). */
  import { L } from '../lib/sitzung.svelte';
  import { komma } from '../lib/ergebnis';
  import { kalibrierung } from '../lib/kalibrierung';

  let { punkte, xName, yName, ziel = false }: { punkte: [number, number][]; xName: string; yName: string; ziel?: boolean } = $props();
  const kennung = $props.id();
  let alpha = $state('0.01');
  const res = $derived(punkte.length >= 4 ? kalibrierung(punkte, Number(alpha)) : null);
  const r = $derived(res && !('fehler' in res) ? res : null);
  const z = (v: number) => komma(Number(v.toPrecision(4)), 4);
  const stufen = $derived(new Set(punkte.map(p => p[0])).size);
</script>

{#if punkte.length >= 4}
  <details class="auf" style="margin-top:var(--a4)" open={ziel} use:kursSprung={ziel} data-kurs="kalibrier"><summary>{L('Kalibriergerade (Nachweis- und Bestimmungsgrenze)', 'Calibration line (limit of detection and quantification)')}</summary>
    <p class="heft-text">{L('Für Messverfahren im Labor: x ist die bekannte Menge (Konzentration), y das gemessene Signal. Statable rechnet die Kalibriergerade und nach dem Vorgehen der DIN 32645 die kleinste Menge, die sich vom Nullwert unterscheiden lässt (Nachweisgrenze), die kleinste sicher nachweisbare Menge (Erfassungsgrenze) und die kleinste Menge, die sich mit vertretbarer Unsicherheit messen lässt (Bestimmungsgrenze, relative Unsicherheit 33 %).', 'For laboratory measurement methods: x is the known amount (concentration), y the measured signal. Statable calculates the calibration line and, following DIN 32645, the smallest amount that can be told apart from zero (decision limit, "Nachweisgrenze"), the smallest reliably detectable amount (limit of detection, "Erfassungsgrenze") and the smallest amount that can be measured with acceptable uncertainty (limit of quantification, relative uncertainty 33%).')}</p>
    <p class="hilfe"><HilfeLink id="kalibriergerade-nachweisgrenze" text={L('Hilfe: Kalibriergerade', 'Help: calibration line')} /></p>
    <div class="eingabe" style="max-width:260px"><label for="kal-a-{kennung}">{L('Irrtumswahrscheinlichkeit', 'Error probability')}</label>
      <select data-begriff="signifikanzniveau" id="kal-a-{kennung}" bind:value={alpha}><option value="0.01">1 %</option><option value="0.05">5 %</option></select></div>
    {#if res && 'fehler' in res}
      <p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{res.fehler === 'keine-streuung' ? L('Alle Werte von x sind gleich: ohne Bereich gibt es keine Gerade.', 'All values of x are equal: without a range there is no line.') : res.fehler === 'keine-steigung' ? L('Die Gerade steigt nicht: Das Signal hängt nicht von der Menge ab.', 'The line does not rise: the signal does not depend on the amount.') : L('Zu wenige Punkte.', 'Too few points.')}</p>
    {:else if r}
      <p class="heft-text" use:ergebnisAnsage>{L(`Kalibriergerade: ${yName} = ${z(r.a)} ${r.b < 0 ? '−' : '+'} ${z(Math.abs(r.b))}·${xName} (R² = ${komma(r.r2, 4)}, ${r.n} Punkte, Reststreuung ${z(r.s)}).`, `Calibration line: ${yName} = ${z(r.a)} ${r.b < 0 ? '−' : '+'} ${z(Math.abs(r.b))}·${xName} (R² = ${komma(r.r2, 4)}, ${r.n} points, residual standard deviation ${z(r.s)}).`)}</p>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Grenzen des Verfahrens', 'Limits of the method')}</b></caption>
        <thead><tr><th scope="col">{L('Kennwert', 'Index')}</th><th scope="col">{L('Wert', 'Value')}</th><th scope="col">{L('Bedeutung', 'Meaning')}</th></tr></thead>
        <tbody>
          <tr><th scope="row" style="text-align: start">{L('Nachweisgrenze', 'Decision limit')}</th><td style="text-align:right">{z(r.ng)}</td><td>{L('kleinste Menge, die sich vom Nullwert unterscheidet', 'smallest amount that differs from the blank')}</td></tr>
          <tr><th scope="row" style="text-align: start">{L('Erfassungsgrenze', 'Limit of detection')}</th><td style="text-align:right">{z(r.eg)}</td><td>{L('kleinste Menge, die sicher nachgewiesen wird (doppelte Nachweisgrenze)', 'smallest amount that is reliably detected (twice the decision limit)')}</td></tr>
          <tr><th scope="row" style="text-align: start">{L('Bestimmungsgrenze', 'Limit of quantification')}</th><td style="text-align:right">{r.bg === null ? '-' : z(r.bg)}</td><td>{r.bg === null ? L('nicht berechenbar (die Gerade streut zu stark)', 'cannot be calculated (the line scatters too much)') : L('kleinste Menge mit höchstens 33 % relativer Unsicherheit', 'smallest amount with at most 33% relative uncertainty')}</td></tr>
          <tr><th scope="row" style="text-align: start">{L('Verfahrensstandardabweichung', 'Method standard deviation')}</th><td style="text-align:right">{z(r.sx0)}</td><td>{L('Reststreuung der Geraden, umgerechnet auf die Einheit von x', 'residual standard deviation converted to the unit of x')}</td></tr>
          <tr><th scope="row" style="text-align: start">{L('Verfahrensvariationskoeffizient', 'Method coefficient of variation')}</th><td style="text-align:right">{Number.isFinite(r.vx0) ? komma(r.vx0 * 100, 1) + ' %' : '-'}</td><td>{L('Verfahrensstandardabweichung durch den Mittelwert von x', 'method standard deviation divided by the mean of x')}</td></tr>
        </tbody>
      </table></div>
      {#if r.n < 6 || stufen < 5}<p class="heft-text" role="alert">{L('Die DIN 32645 verlangt mindestens sechs Kalibrierpunkte in gleichen Abständen. Mit weniger Punkten sind die Grenzen sehr unsicher.', 'DIN 32645 requires at least six calibration points at equal spacing. With fewer points the limits are very uncertain.')}</p>{/if}
      <p class="heft-text" style="color:var(--tinte-2)">{L('Die Grenzen gelten nur, wenn die Punkte wirklich auf einer Geraden liegen, ihre Streuung über den ganzen Bereich ähnlich ist und der Bereich nahe bei null beginnt. Das Streudiagramm zeigt das. Statable nimmt für die Probe eine Einzelmessung an.', 'The limits are valid only if the points really lie on a straight line, their scatter is similar over the whole range and the range starts close to zero. The scatter plot shows this. Statable assumes a single measurement of the sample.')}</p>
    {/if}
  </details>
{/if}
