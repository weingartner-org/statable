<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { xZusatz } from '../lib/ytitel';
  /** Kurve „Power gegen N“ (oder gegen den Effekt): eine Linie, die Ziel-Power als gestrichelte Linie, der gefundene Punkt markiert. */
  let { punkte, xText, zielY, markX, markY, xFormat = (v: number) => zahlDe(v), beschreibung }: {
    punkte: { x: number; y: number }[]; xText: string; zielY: number; markX?: number; markY?: number; xFormat?: (v: number) => string; beschreibung: string;
  } = $props();
  const W = 560, H0 = 300, Lr = 56, R = 20, T = 16, U0 = 52;
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): Höhe und unterer Rand wachsen mit, die Zeichenfläche bleibt. */
  const XZ = $derived(xZusatz(xText, W - Lr - R));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const x0 = $derived(punkte[0]?.x ?? 0), x1 = $derived(punkte.at(-1)?.x ?? 1);
  const x = (v: number) => Lr + ((W - Lr - R) * (v - x0)) / (x1 - x0 || 1);
  const y = (v: number) => T + (H - T - U) * (1 - v);
  /** Schöne Schrittweite (1, 2, 5 · 10^k) für etwa fünf Marken. */
  const schritt = $derived.by(() => {
    const roh = (x1 - x0) / 5 || 1, e = Math.pow(10, Math.floor(Math.log10(roh))), q = roh / e;
    return (q < 1.5 ? 1 : q < 3.5 ? 2 : q < 7.5 ? 5 : 10) * e;
  });
  const marken = $derived(Array.from({ length: Math.floor((x1 - x0) / schritt + 1e-9) + 2 }, (_, i) => Math.ceil(x0 / schritt - 1e-9) * schritt + i * schritt).filter(v => v >= x0 - 1e-9 && v <= x1 + 1e-9));
  const yMarken = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const yText = (v: number) => (v === 0 ? '0' : v === 1 ? '1' : zahlDe(v, 1).replace(/^0/, ''));
  const pfad = $derived(punkte.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)} ${y(p.y).toFixed(1)}`).join(' '));
  const bt = $derived.by(() => {
    const t = bildtext('linie', {
      titel: xText, xAchse: { name: xText }, yAchse: { name: Lx('Power (1 minus Beta)', 'Power (1 minus beta)'), von: 0, bis: 1 },
      x: punkte.map(p => p.x), reihen: [{ werte: punkte.map(p => p.y) }], hilfslinien: [{ name: Lx('Ziel-Power', 'Target power'), y: zielY }]
    });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each yMarken as v}<line x1={Lr} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={Lr - 10} y={y(v) + 4} text-anchor="end" class="klein">{yText(v)}</text>{/each}
  <line x1={Lr} x2={Lr} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={Lr} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each marken as v}<line x1={x(v)} x2={x(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={x(v)} y={H - U + 20} text-anchor="middle" class="klein">{xFormat(v)}</text>{/each}
  <XTitel x={(Lr + W - R) / 2} y={H0 - 8} breite={W - Lr - R} text={xText} klasse="klein" />
  <YTitel x={14} y={(T + H - U) / 2} laenge={H - T - U} text={'Power (1 − β)'} px={13} klasse="klein" />
  <line x1={Lr} x2={W - R} y1={y(zielY)} y2={y(zielY)} stroke="var(--dg-b)" stroke-width="1.5" stroke-dasharray="6 4" />
  <path d={pfad} fill="none" stroke="var(--dg-a)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  {#if markX !== undefined && markY !== undefined}
    <line x1={x(markX)} x2={x(markX)} y1={y(markY)} y2={H - U} stroke="var(--dg-a)" stroke-width="1.5" stroke-dasharray="3 3" />
    <circle cx={x(markX)} cy={y(markY)} r="6" fill="var(--dg-a)" stroke="var(--blatt)" stroke-width="2" />
  {/if}
</svg>
<BildBeschreibung {...bt} />
