<script lang="ts">
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { achsenMarken, entzerre } from '../lib/vorhdiagramm';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';

  /** Strafregression, Bild 2 (Später S-E): der Pfad - die STANDARDISIERTEN Koeffizienten (Koeffizient mal Standardabweichung der Spalte, vergleichbar zwischen den Größen) gegen log λ, eine Linie je Größe.
   *  Mehr als 20 Größen: die 20 mit dem größten Betrag farbig und beschriftet, der Rest grau. Linien für das gewählte λ. */
  let { lambda, pfad, namen, auswahl, gewaehlt }: { lambda: number[]; pfad: number[][]; namen: string[]; auswahl: number[]; gewaehlt: number } = $props();
  const W = 560, H = 340, T = 24, U = 54;
  const titelY = Lx('Standardisierter Koeffizient', 'Standardized coefficient');
  const L = $derived(64 + yZusatz(titelY, H - T - U, 13, false));
  const R = $derived(Math.min(150, 28 + Math.max(0, ...auswahl.map(i => (namen[i] ?? '').length)) * 6.4));
  const lx = $derived(lambda.map(l => Math.log(l)));
  const x0 = $derived(Math.min(...lx)), x1 = $derived(Math.max(...lx));
  const alle = $derived(pfad.flat().filter(Number.isFinite)), y0 = $derived(Math.min(0, ...alle)), y1 = $derived(Math.max(0, ...alle)), padY = $derived((y1 - y0 || 1) * 0.06);
  const X = (l: number) => L + (W - L - R) * (x1 - Math.log(l)) / ((x1 - x0) || 1);
  const Y = (v: number) => T + (H - T - U) * (1 - (v - (y0 - padY)) / ((y1 - y0 || 1) + 2 * padY));
  const weg = (j: number) => pfad[j]!.map((v, i) => `${i ? 'L' : 'M'}${X(lambda[i]!).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const rest = $derived(pfad.map((_, j) => j).filter(j => !auswahl.includes(j)));
  const enden = $derived(entzerre(auswahl.map(j => Y(pfad[j]![pfad[j]!.length - 1]!)), 12, T + 4, H - U));
  const marken = $derived(achsenMarken(x0, x1, 6));
  const bt = $derived(bildtext('linie', {
    titel: Lx(`Pfad der standardisierten Koeffizienten (gewähltes λ = ${zahlDe(gewaehlt, 3)}; ${pfad.length} Größen, ${auswahl.length} davon in der Tabelle)`, `Path of the standardized coefficients (chosen λ = ${zahlDe(gewaehlt, 3)}; ${pfad.length} predictors, ${auswahl.length} of them in the table)`),
    xAchse: { name: 'log λ' }, yAchse: { name: titelY }, x: lx, reihen: auswahl.map(j => ({ name: namen[j] ?? '', werte: pfad[j]!.map(v => (Number.isFinite(v) ? v : null)) }))
  }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each achsenMarken(y0 - padY, y1 + padY) as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke={v === 0 ? 'var(--dg-achse)' : 'var(--dg-gitter)'} /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  {#each marken as v}<text x={X(Math.exp(v))} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  {#each rest as j}<path d={weg(j)} fill="none" stroke="var(--dg-achse)" stroke-opacity=".35" stroke-width="1.2" />{/each}
  {#each auswahl as j, k (j)}<path d={weg(j)} fill="none" stroke={k % 2 ? 'var(--dg-b)' : 'var(--dg-a)'} stroke-width="1.8" stroke-dasharray={k % 4 > 1 ? '6 3' : undefined} />{/each}
  <line x1={X(gewaehlt)} x2={X(gewaehlt)} y1={T} y2={H - U} stroke="var(--dg-achse)" stroke-dasharray="3 3" />
  {#each auswahl as j, k (j)}<text x={W - R + 6} y={enden[k]! + 4} class="klein" fill={k % 2 ? 'var(--dg-b)' : 'var(--dg-a)'}>{namen[j]}</text>{/each}
  <XTitel x={(L + W - R) / 2} y={H - 8} breite={W - L - R} text="log λ" klasse="klein" />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={titelY} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} />
