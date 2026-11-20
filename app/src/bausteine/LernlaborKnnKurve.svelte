<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import { marken, skala, achsenZahl } from '../lib/lernlaborsaetze';
  import { zahlDe } from '../lib/format';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import XTitel from './XTitel.svelte';
  import YTitel from './YTitel.svelte';
  /** Fehlerrate gegen k (Lernlabor „Vorhersagen“): Training (durchgezogen), Test (gestrichelt), Kreuzvalidierung (gepunktet); senkrecht das gewählte k. Linien unterscheiden sich in Farbe UND Strichart. */
  let { ks, training, test, cv, k, bestesK, titel }: { ks: number[]; training: number[]; test: number[]; cv: number[]; k: number; bestesK: number; titel: string } = $props();
  const W = 640, H = 300, Lr = 72, R = 16, T = 14, U = 52;
  const yMax = $derived(Math.max(0.1, Math.ceil(Math.max(...training, ...test, ...cv) * 10) / 10));
  const x = $derived(skala(1, Math.max(3, ks.at(-1) ?? 3), Lr, W - R)), y = $derived(skala(0, yMax, H - U, T));
  const ym = $derived(marken(0, yMax)), xm = $derived(ks.filter(v => v === 1 || v % 10 === 1 || v === ks.at(-1)));
  const pfad = (w: number[]) => w.map((v, i) => `${i ? 'L' : 'M'}${x(ks[i]!).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const REIHEN = $derived([
    { name: L('Trainingsdaten', 'Training data'), werte: training, farbe: 'var(--dg-a)', strich: '' },
    { name: L('Testdaten', 'Test data'), werte: test, farbe: 'var(--dg-b)', strich: '8 5' },
    { name: L('Kreuzvalidierung', 'Cross-validation'), werte: cv, farbe: 'var(--tinte)', strich: '2 4' }
  ]);
  const bt = $derived.by(() => {
    const t = bildtext('linie', { titel, xAchse: { name: L('k (Zahl der Nachbarn)', 'k (number of neighbours)') }, yAchse: { name: L('Fehlerrate', 'Error rate'), von: 0, bis: yMax }, x: ks, reihen: REIHEN.map(r => ({ name: r.name, werte: r.werte })) });
    return { ...t, beschreibung: [...t.beschreibung, L(`Senkrecht markiert: das gewählte k = ${k} (durchgezogen) und das k mit der kleinsten Fehlerrate in der Kreuzvalidierung, k = ${bestesK} (gestrichelt).`, `Marked vertically: the chosen k = ${k} (solid) and the k with the smallest cross-validation error rate, k = ${bestesK} (dashed).`)] };
  });
</script>
<figure class="ll-bild">
  <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
    {#each ym as v}<line x1={Lr} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={Lr - 8} y={y(v) + 4} text-anchor="end" class="klein">{achsenZahl(v)}</text>{/each}
    {#each xm as v}<line x1={x(v)} x2={x(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={x(v)} y={H - U + 20} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
    <line x1={Lr} x2={Lr} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={Lr} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
    <line x1={x(bestesK)} x2={x(bestesK)} y1={T} y2={H - U} stroke="var(--tinte-2)" stroke-dasharray="4 4" />
    <line x1={x(k)} x2={x(k)} y1={T} y2={H - U} stroke="var(--akzent)" stroke-width="2" />
    {#each REIHEN as r}<path d={pfad(r.werte)} fill="none" stroke={r.farbe} stroke-width="2.2" stroke-dasharray={r.strich || undefined} stroke-linejoin="round" />{/each}
    <XTitel x={(Lr + W - R) / 2} y={H - 8} breite={W - Lr - R} text={L('k (Zahl der Nachbarn)', 'k (number of neighbours)')} klasse="klein" />
    <YTitel x={14} y={(T + H - U) / 2} laenge={H - T - U} text={L('Fehlerrate', 'Error rate')} px={13} klasse="klein" />
  </svg>
  <figcaption>
    <ul class="ll-legende">
      {#each REIHEN as r}<li><svg viewBox="0 0 28 10" width="28" height="10" aria-hidden="true"><line x1="1" x2="27" y1="5" y2="5" stroke={r.farbe} stroke-width="2.2" stroke-dasharray={r.strich || undefined} /></svg>{r.name}</li>{/each}
    </ul>
    {L('Links (kleines k) folgt das Modell jedem Einzelfall, rechts (großes k) glättet es stark.', 'On the left (small k) the model follows every single case, on the right (large k) it smooths strongly.')}
  </figcaption>
</figure>
<BildBeschreibung {...bt} />

<style>
  .ll-legende { list-style: none; display: flex; flex-wrap: wrap; gap: var(--a1) var(--a4); padding: 0; margin: 0 0 var(--a1); }
  .ll-legende li { display: inline-flex; align-items: center; gap: var(--a1); }
</style>
