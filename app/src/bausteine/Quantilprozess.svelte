<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { achsenMarken } from '../lib/vorhdiagramm';
  import { tauText } from '../lib/quantil';

  /** Quantilregression, Bild „Wirkung je τ“ (Später S-E): der Koeffizient einer Vorhersagegröße an jedem gerechneten τ mit seinem 95 %-Intervall - dieselben Intervalle wie in der Tabelle.
   *  Waagerecht gestrichelt: die gewöhnliche Regression (Mittelwert) mit ihrem 95 %-Intervall. */
  let { taus, b, unten, oben, ols, xText, yText }: { taus: number[]; b: number[]; unten: number[]; oben: number[]; ols: { b: number; unten: number; oben: number }; xText: string; yText: string } = $props();
  const W = 560, H0 = 320, L0 = 64, R = 24, T = 20, U = 56;
  const titelY = $derived(Lx(`Veränderung von ${yText} je Einheit ${xText}`, `Change in ${yText} per unit of ${xText}`));
  const L = $derived(L0 + yZusatz(titelY, H0 - T - U, 13, false));
  const H = H0;
  const alle = $derived([...unten, ...oben, ols.unten, ols.oben, ...b].filter(v => Number.isFinite(v) && Math.abs(v) < 1e300));   // offene Grenzen (±∞) zählen für die Achse nicht
  const y0 = $derived(Math.min(...alle)), y1 = $derived(Math.max(...alle));
  const padY = $derived((y1 - y0 || 1) * 0.08);
  const Yr = (v: number) => T + (H - T - U) * (1 - (v - (y0 - padY)) / ((y1 - y0 || 1) + 2 * padY));
  /** Eine offene Grenze reicht bis zum Rand des Bildes. */
  const Y = (v: number) => (v === -Infinity || v <= -1e300 ? H - U : v === Infinity || v >= 1e300 ? T : Yr(v));
  const tx0 = $derived(Math.min(...taus)), tx1 = $derived(Math.max(...taus)), padX = $derived((tx1 - tx0 || 0.5) * 0.12);
  const X = (t: number) => L + (W - L - R) * (t - (tx0 - padX)) / ((tx1 - tx0 || 0.5) + 2 * padX);
  const sortiert = $derived(taus.map((t, i) => i).sort((p, q) => taus[p]! - taus[q]!));
  const bildText = $derived(Lx(`Wirkung von ${xText} auf ${yText} je τ: ${sortiert.map(i => `τ = ${tauText(taus[i]!)}: ${zahlDe(b[i]!, 2)}`).join('; ')}. Gestrichelt: gewöhnliche Regression ${zahlDe(ols.b, 2)}.`,
    `Effect of ${xText} on ${yText} by τ: ${sortiert.map(i => `τ = ${tauText(taus[i]!)}: ${zahlDe(b[i]!, 2)}`).join('; ')}. Dashed: ordinary regression ${zahlDe(ols.b, 2)}.`));
  const bt = $derived(bildtext('sonstiges', {
    artName: Lx('Wirkung je Quantil', 'Effect by quantile'), titel: titelY,
    xAchse: { name: Lx('Quantil (Tau)', 'Quantile (tau)') }, yAchse: { name: titelY, von: y0 - padY, bis: y1 + padY }, saetze: [bildText],
    tabelle: { kopf: [Lx('Quantil (Tau)', 'Quantile (tau)'), Lx('Koeffizient', 'Coefficient'), Lx('95 % unten', '95% lower'), Lx('95 % oben', '95% upper')],
      zeilen: [...sortiert.map(i => [tauText(taus[i]!), zt(b[i]!, 3), zt(unten[i]!, 3), zt(oben[i]!, 3)]), [Lx('gewöhnliche Regression', 'ordinary regression'), zt(ols.b, 3), zt(ols.unten, 3), zt(ols.oben, 3)]] }
  }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each achsenMarken(y0 - padY, y1 + padY) as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <rect x={L} width={W - L - R} y={Y(ols.oben)} height={Math.max(0, Y(ols.unten) - Y(ols.oben))} fill="var(--dg-punkt-b)" opacity=".35" />
  <line x1={L} x2={W - R} y1={Y(ols.b)} y2={Y(ols.b)} stroke="var(--dg-b)" stroke-width="2" stroke-dasharray="7 4" />
  {#each sortiert as i (taus[i])}
    <line x1={X(taus[i]!)} x2={X(taus[i]!)} y1={Y(unten[i]!)} y2={Y(oben[i]!)} stroke="var(--dg-a)" stroke-width="2.2" />
    <line x1={X(taus[i]!) - 5} x2={X(taus[i]!) + 5} y1={Y(unten[i]!)} y2={Y(unten[i]!)} stroke="var(--dg-a)" stroke-width="2.2" /><line x1={X(taus[i]!) - 5} x2={X(taus[i]!) + 5} y1={Y(oben[i]!)} y2={Y(oben[i]!)} stroke="var(--dg-a)" stroke-width="2.2" />
    <circle cx={X(taus[i]!)} cy={Y(b[i]!)} r="4.5" fill="var(--dg-a)" />
    <text x={X(taus[i]!)} y={H - U + 22} text-anchor="middle" class="klein">{tauText(taus[i]!)}</text>
  {/each}
  <text x={W - R} y={Y(ols.b) - 6} text-anchor="end" class="klein" fill="var(--dg-b)">{Lx('gewöhnliche Regression', 'ordinary regression')}</text>
  <XTitel x={(L + W - R) / 2} y={H - 8} breite={W - L - R} text="τ" klasse="klein" />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={titelY} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} />
