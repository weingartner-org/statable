<script module lang="ts">
  let zaehler = 0;
  export interface HistMarke { x: number; text: string; stil: 'voll' | 'strich' | 'punkt'; farbe: 'a' | 'b' | 'tinte' }
</script>
<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import XTitel from './XTitel.svelte';
  import YTitel from './YTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  import { marken as achsenMarken, skala, achsenZahl } from '../lib/lernlaborsaetze';
  import type { Histogramm } from '../lib/lernlabor';
  /**
   * Histogramm mit Text-Alternative (role=img, title, desc). Säulen = Anzahlen (`zaehler`); `kurve` (Dichte, stetig) und `punkte` (Dichte an möglichen Werten, diskret)
   * werden mit n · Klassenbreite auf Anzahlen gebracht. Markierungen und das Intervall sind nie nur Farbe: Linienart, Klammer und Beschriftung kommen dazu.
   */
  let { h, n, kurve = [], punkte = [], linien = [], bereich, xText, yText, titel, beschreibung, xMin, xMax }: {
    h: Histogramm; n: number; kurve?: { x: number; y: number }[]; punkte?: { x: number; y: number }[]; linien?: HistMarke[];
    bereich?: { von: number; bis: number; text: string }; xText: string; yText: string; titel: string; beschreibung: string; xMin?: number; xMax?: number;
  } = $props();
  const id = `lh${++zaehler}`;
  const W = 640, H0 = 320, Lr = 62, R = 18, T = 18, U0 = 52;
  const XZ = $derived(xZusatz(xText, W - Lr - R)), H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const lo = $derived(Math.min(h.kanten[0]!, xMin ?? Infinity, ...linien.map(m => m.x), bereich?.von ?? Infinity));
  const hi = $derived(Math.max(h.kanten.at(-1)!, xMax ?? -Infinity, ...linien.map(m => m.x), bereich?.bis ?? -Infinity));
  const skal = $derived(n * h.schritt);
  const yHoch = $derived(Math.max(1, ...h.zaehler, ...kurve.map(p => p.y * skal), ...punkte.map(p => p.y * skal)) * 1.08);
  const x = $derived(skala(lo, hi, Lr, W - R)), y = $derived(skala(0, yHoch, H - U, T));
  const xm = $derived(achsenMarken(lo, hi, 6)), ym = $derived(achsenMarken(0, yHoch, 5));
  const pfad = $derived(kurve.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)} ${y(p.y * skal).toFixed(1)}`).join(' '));
  const dash = (s: HistMarke['stil']) => (s === 'strich' ? '7 4' : s === 'punkt' ? '2 4' : undefined);
  const farbe = (f: HistMarke['farbe']) => (f === 'a' ? 'var(--dg-a)' : f === 'b' ? 'var(--dg-b)' : 'var(--tinte)');
  /** Beschriftungen übereinander staffeln, damit sich nahe Linien nicht überdecken. */
  const stufen = $derived(linien.map((m, i) => ({ ...m, ebene: i % 3 })));
  const bt = $derived.by(() => {
    const t = bildtext('histogramm', { titel, name: xText, grenzen: h.kanten, anzahl: h.zaehler, n, xAchse: { name: xText }, yAchse: { name: yText } });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung, ...linien.map(m => `${m.text}: ${achsenZahl(m.x)}.`), ...(bereich ? [`${bereich.text}: ${achsenZahl(bereich.von)} - ${achsenZahl(bereich.bis)}.`] : [])] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each ym as v}<line x1={Lr} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={Lr - 8} y={y(v) + 4} text-anchor="end" class="klein">{achsenZahl(v)}</text>{/each}
  {#each h.zaehler as c, i}
    {#if c > 0}<rect x={x(h.kanten[i]!) + 0.5} y={y(c)} width={Math.max(0.5, x(h.kanten[i + 1]!) - x(h.kanten[i]!) - 1)} height={y(0) - y(c)} fill="var(--dg-punkt-a)" stroke="var(--dg-a)" stroke-width="1" />{/if}
  {/each}
  <line x1={Lr} x2={Lr} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={Lr} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each xm as v}<line x1={x(v)} x2={x(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={x(v)} y={H - U + 20} text-anchor="middle" class="klein">{achsenZahl(v)}</text>{/each}
  <XTitel x={(Lr + W - R) / 2} y={H0 - 8} breite={W - Lr - R} text={xText} klasse="klein" />
  <YTitel x={14} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={13} klasse="klein" />
  {#if pfad}<path d={pfad} fill="none" stroke="var(--dg-b)" stroke-width="2.5" stroke-linejoin="round" />{/if}
  {#each punkte as p}<circle cx={x(p.x)} cy={y(p.y * skal)} r="4" fill="var(--dg-b)" stroke="var(--blatt)" stroke-width="1.5" />{/each}
  {#if bereich}
    <line x1={x(bereich.von)} x2={x(bereich.bis)} y1={H - U - 10} y2={H - U - 10} stroke="var(--dg-b)" stroke-width="3" />
    <line x1={x(bereich.von)} x2={x(bereich.von)} y1={H - U - 18} y2={H - U - 2} stroke="var(--dg-b)" stroke-width="3" /><line x1={x(bereich.bis)} x2={x(bereich.bis)} y1={H - U - 18} y2={H - U - 2} stroke="var(--dg-b)" stroke-width="3" />
    <text x={(x(bereich.von) + x(bereich.bis)) / 2} y={H - U - 24} text-anchor="middle" class="klein halo">{bereich.text}</text>
  {/if}
  {#each stufen as m}
    <line x1={x(m.x)} x2={x(m.x)} y1={T} y2={H - U} stroke={farbe(m.farbe)} stroke-width="2" stroke-dasharray={dash(m.stil)} />
    <text x={x(m.x) + (x(m.x) > W - 150 ? -5 : 5)} y={T + 12 + m.ebene * 14} text-anchor={x(m.x) > W - 150 ? 'end' : 'start'} class="klein halo">{m.text}</text>
  {/each}
</svg>
<BildBeschreibung {...bt} />

<style>
  .halo { paint-order: stroke; stroke: var(--blatt); stroke-width: 4px; stroke-linejoin: round; }
</style>
