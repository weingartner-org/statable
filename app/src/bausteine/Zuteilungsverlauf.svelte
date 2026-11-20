<script lang="ts">
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  /**
   * Verlauf des Unterschieds der Gruppengrößen (Später S-F, L6): nach jedem Fall der größte Unterschied zwischen der größten und der kleinsten Gruppe (Treppe). Die gestrichelte Linie ist die Grenze, die Blöcke
   * erzwingen: höchstens die Hälfte der größten Blockgröße (bei zwei gleich großen Gruppen). Es zeigt, was Blöcke bewirken. Mehrere Schichten: eine Treppe je Schicht (Strichart und Beschriftung am Ende).
   */
  let { reihen, grenze = null }: { reihen: { name: string; werte: number[] }[]; grenze?: number | null } = $props();
  const W = 560, H0 = 340, L0 = 56, R = 24, T = 24, U0 = 56;
  const yTitel = $derived(Lx('Unterschied der Gruppengrößen', 'Difference of the group sizes'));
  const xTitel = $derived(Lx('Nummer des Falls', 'Number of the case'));
  const L = $derived(L0 + yZusatz(yTitel, H0 - T - U0, 13, false));
  const XZ = $derived(xZusatz(xTitel, W - L - R));
  const legendeZeilen = $derived(reihen.length > 1 ? Math.ceil(reihen.length / 4) : 0);
  const LG = $derived(legendeZeilen * 20);
  const H = $derived(H0 + XZ + LG), U = $derived(U0 + XZ + LG);
  const nMax = $derived(Math.max(1, ...reihen.map(r => r.werte.length)));
  const yMax = $derived(Math.max(1, grenze ?? 0, ...reihen.map(r => Math.max(0, ...r.werte))));
  const X = (i: number) => L + (W - L - R) * (i / nMax);
  const Y = (v: number) => T + (H - T - U) * (1 - v / yMax);
  const dash = ['', '8 4', '3 3', '12 3 2 3', '6 2 2 2 2 2', '1 4', '10 5', '4 2'];
  /** Linienzug als Treppe; bei sehr vielen Fällen nur die Stellen, an denen sich der Wert ändert. */
  const pfad = (w: number[]) => {
    let d = `M${X(0)} ${Y(0)}`, vor = 0;
    w.forEach((v, i) => { if (v !== vor) { d += `L${X(i)} ${Y(vor)}L${X(i)} ${Y(v)}`; vor = v; } });
    return d + `L${X(w.length)} ${Y(vor)}`;
  };
  const ticksY = $derived(Array.from({ length: yMax + 1 }, (_, i) => i).filter(v => yMax <= 8 || v % Math.ceil(yMax / 8) === 0));
  const ticksX = $derived([0, 0.25, 0.5, 0.75, 1].map(f => Math.round(nMax * f)));
  const groesster = $derived(Math.max(...reihen.map(r => Math.max(0, ...r.werte))));
  const beschr = $derived([Lx(`Verlauf des Unterschieds der Gruppengrößen über ${nMax} Fälle: der größte Unterschied liegt bei ${groesster}.`, `Course of the difference of the group sizes over ${nMax} cases: the largest difference is ${groesster}.`),
    grenze !== null ? Lx(`Die Grenze durch die Blöcke liegt bei ${zahlDe(grenze)}.`, `The limit set by the blocks is ${zahlDe(grenze)}.`) : ''].filter(Boolean).join(' '));
  const bt = $derived(bildtext('linie', {
    titel: Lx('Verlauf des Unterschieds der Gruppengrößen', 'Course of the difference of the group sizes'),
    xAchse: { name: xTitel }, yAchse: { name: yTitel }, x: Array.from({ length: nMax }, (_, i) => i + 1),
    reihen: reihen.map(r => ({ name: r.name, werte: Array.from({ length: nMax }, (_, i) => (i < r.werte.length ? r.werte[i]! : null)) })),
    hilfslinien: grenze !== null ? [{ name: Lx('Grenze durch die Blöcke', 'Limit set by the blocks'), y: grenze }] : []
  }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each ticksY as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  {#each ticksX as v}<text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" />
  {#if grenze !== null}<line x1={L} x2={W - R} y1={Y(grenze)} y2={Y(grenze)} stroke="var(--dg-b)" stroke-width="2" stroke-dasharray="7 5" /><text x={W - R} y={Y(grenze) - 6} text-anchor="end" class="klein">{Lx('Grenze durch die Blöcke', 'Limit set by the blocks')}</text>{/if}
  {#each reihen as r, i (r.name)}<path d={pfad(r.werte)} fill="none" stroke="var(--dg-a)" stroke-width="2.4" stroke-linejoin="round" stroke-dasharray={dash[i % dash.length] || undefined} />{/each}
  <XTitel x={(L + W - R) / 2} y={H0 - 12} breite={W - L - R} text={xTitel} klasse="klein" />
  {#if reihen.length > 1}{#each reihen as r, i (r.name)}<g class="klein"><line x1={L + (i % 4) * 118} x2={L + (i % 4) * 118 + 28} y1={H0 + XZ + 6 + Math.floor(i / 4) * 20} y2={H0 + XZ + 6 + Math.floor(i / 4) * 20} stroke="var(--dg-a)" stroke-width="2.4" stroke-dasharray={dash[i % dash.length] || undefined} /><text x={L + (i % 4) * 118 + 34} y={H0 + XZ + 10 + Math.floor(i / 4) * 20}>{r.name}</text></g>{/each}{/if}
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={yTitel} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} beschreibung={[beschr, ...bt.beschreibung]} />
