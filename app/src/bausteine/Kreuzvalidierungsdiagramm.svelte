<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { achsenMarken } from '../lib/vorhdiagramm';

  /** Strafregression, Bild 1 (Später S-E): der Fehler der Kreuzvalidierung (mit Standardfehler) gegen log λ. Zwei senkrechte Linien: λ.min (kleinster Fehler) und λ.1se (Ein-Standardfehler-Regel); die obere Achse nennt, wie viele Größen im Modell sind.
   *  Bei Ridge gibt es keine Nullen (alle Größen bleiben im Modell). */
  let { lambda, cvm, cvsd, nzero, lambdaMin, lambda1se, gewaehlt }: { lambda: number[]; cvm: number[]; cvsd: number[]; nzero: number[]; lambdaMin: number; lambda1se: number; gewaehlt: number } = $props();
  const W = 560, H = 340, T = 40, U = 54, R = 24;
  const titelY = Lx('Mittlerer quadrierter Fehler (Kreuzvalidierung)', 'Mean squared error (cross-validation)');
  const L = $derived(64 + yZusatz(titelY, H - T - U, 13, false));
  const lx = $derived(lambda.map(l => Math.log(l)));
  const x0 = $derived(Math.min(...lx)), x1 = $derived(Math.max(...lx));
  const o = $derived(cvm.map((v, i) => v + cvsd[i]!)), u = $derived(cvm.map((v, i) => v - cvsd[i]!));
  const y0 = $derived(Math.min(...u)), y1 = $derived(Math.max(...o)), padY = $derived((y1 - y0 || 1) * 0.05);
  const X = (l: number) => L + (W - L - R) * (x1 - Math.log(l)) / ((x1 - x0) || 1);
  const Y = (v: number) => T + (H - T - U) * (1 - (v - (y0 - padY)) / ((y1 - y0 || 1) + 2 * padY));
  const marken = $derived(achsenMarken(x0, x1, 6));
  const oben = $derived(lambda.map((_, i) => i).filter(i => i % Math.max(1, Math.round(lambda.length / 8)) === 0));
  const bildText = $derived(Lx(`Fehler der Kreuzvalidierung gegen log λ. Kleinster Fehler bei λ = ${zahlDe(lambdaMin, 3)}, Ein-Standardfehler-Regel bei λ = ${zahlDe(lambda1se, 3)}; gewählt: λ = ${zahlDe(gewaehlt, 3)}.`,
    `Cross-validation error against log λ. Smallest error at λ = ${zahlDe(lambdaMin, 3)}, one-standard-error rule at λ = ${zahlDe(lambda1se, 3)}; chosen: λ = ${zahlDe(gewaehlt, 3)}.`));
  const bt = $derived(bildtext('sonstiges', { artName: Lx('Kreuzvalidierung: Fehler gegen log Lambda', 'Cross-validation: error against log lambda'), xAchse: { name: Lx('log Lambda', 'log lambda') }, yAchse: { name: titelY },
    saetze: [Lx(`Kleinster Fehler bei Lambda = ${zahlDe(lambdaMin, 3)}, Ein-Standardfehler-Regel bei Lambda = ${zahlDe(lambda1se, 3)}; gewählt: Lambda = ${zahlDe(gewaehlt, 3)}.`, `Smallest error at lambda = ${zahlDe(lambdaMin, 3)}, one-standard-error rule at lambda = ${zahlDe(lambda1se, 3)}; chosen: lambda = ${zahlDe(gewaehlt, 3)}.`)],
    tabelle: { kopf: [Lx('Lambda', 'Lambda'), Lx('log Lambda', 'log lambda'), Lx('Fehler', 'Error'), Lx('Standardfehler', 'Standard error'), Lx('Größen im Modell', 'Variables in the model')],
      zeilen: lambda.map((l, i) => [zahlDe(l, 4), zahlDe(lx[i]!, 2), zahlDe(cvm[i]!, 3), zahlDe(cvsd[i]!, 3), nzero[i]!]) } }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each achsenMarken(y0 - padY, y1 + padY) as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  {#each marken as v}<text x={X(Math.exp(v))} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  {#each lambda as l, i}
    <line x1={X(l)} x2={X(l)} y1={Y(u[i]!)} y2={Y(o[i]!)} stroke="var(--dg-punkt-a)" stroke-width="1.4" />
    <circle cx={X(l)} cy={Y(cvm[i]!)} r="3" fill="var(--dg-a)" />
  {/each}
  <line x1={X(lambdaMin)} x2={X(lambdaMin)} y1={T} y2={H - U} stroke="var(--dg-achse)" stroke-dasharray="3 3" /><line x1={X(lambda1se)} x2={X(lambda1se)} y1={T} y2={H - U} stroke="var(--dg-b)" stroke-width="1.6" stroke-dasharray="7 4" />
  <text x={X(lambdaMin)} y={T - 22} text-anchor="middle" class="klein">λ min</text><text x={X(lambda1se)} y={T - 22} text-anchor="middle" class="klein" fill="var(--dg-b)">λ 1se</text>
  {#each oben as i}<text x={X(lambda[i]!)} y={T - 6} text-anchor="middle" class="klein">{nzero[i]}</text>{/each}
  <XTitel x={(L + W - R) / 2} y={H - 8} breite={W - L - R} text="log λ" klasse="klein" />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={titelY} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} />
