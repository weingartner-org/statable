<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  /** Bevölkerungspyramide unter der Kreuztabelle: Tabelle mit zwei Spalten (zum Beispiel Geschlecht) und mindestens drei Zeilen (zum Beispiel Altersklassen) als Balken nach links und rechts. */
  import HilfeLink from './HilfeLink.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import { L } from '../lib/sitzung.svelte';
  import { komma } from '../lib/ergebnis';
  import { achsenMarken } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import type { Kreuz } from '../lib/ergebnis';

  let { e }: { e: Kreuz } = $props();
  const z = $derived(e.zaehlung);
  let anteil = $state(false);
  const ok = $derived(!!z && z.spalten.length === 2 && z.tab.length >= 3);
  const daten = $derived.by(() => {
    if (!z || !ok) return null;
    const tot = z.tab.reduce((a, r) => a + r[0]! + r[1]!, 0) || 1;
    const werte = z.tab.map(r => anteil ? [r[0]! / tot * 100, r[1]! / tot * 100] : [r[0]!, r[1]!]);
    const max = Math.max(...werte.flat(), 1e-9);
    return { werte, max };
  });
  const W = 600, M = 40, ZH = 24, MITTE = 300;
  const H = $derived(z ? M * 2 + ZH * z.tab.length : 0);
  const hr = $derived(daten ? (MITTE - 70) / (daten.max * 1.05) : 1);
  const zeile = (i: number) => M + ZH * (z!.tab.length - 1 - i);  // erste Zeile unten (jüngste Klasse)
  const fmt = (v: number) => (anteil ? `${komma(v, 1)} %` : zahlDe(v));
  const bt = $derived(bildtext('sonstiges', {
    artName: L('Pyramide', 'Pyramid'), titel: L('Pyramide (zwei Gruppen nebeneinander)', 'Pyramid (two groups side by side)'),
    saetze: z && daten ? [L(`Balken nach links: ${z.spalten[0]}, nach rechts: ${z.spalten[1]}; ${z.tab.length} Zeilen, die erste Zeile steht unten. Gezeigt wird ${anteil ? 'der Anteil an allen Personen in Prozent' : 'die Anzahl'}.`, `Bars to the left: ${z.spalten[0]}, to the right: ${z.spalten[1]}; ${z.tab.length} rows, the first row is at the bottom. Shown is ${anteil ? 'the share of all people in percent' : 'the count'}.`)] : [],
    tabelle: z && daten ? { kopf: [e.gruppen, ...z.spalten], zeilen: z.zeilen.map((nm, i) => [nm, fmt(daten.werte[i]![0]!), fmt(daten.werte[i]![1]!)]) } : undefined
  }));
</script>

{#if ok && daten && z}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Pyramide (zwei Gruppen nebeneinander)', 'Pyramid (two groups side by side)')}</summary>
    <p class="heft-text">{L('Die Pyramide stellt die zwei Spalten der Tabelle als Balken nach links und rechts dar, Zeile für Zeile, zum Beispiel Frauen und Männer je Altersklasse. Die Zeilen sollten in sinnvoller Reihenfolge stehen (zum Beispiel von jung nach alt); die erste Zeile steht unten.', 'The pyramid shows the two columns of the table as bars to the left and right, row by row, for example women and men per age class. The rows should be in a sensible order (for example from young to old); the first row is at the bottom.')}</p>
    <p class="hilfe"><HilfeLink id="bevoelkerungspyramide" text={L('Hilfe: Bevölkerungspyramide', 'Help: population pyramid')} /></p>
    <label class="schalter"><input type="checkbox" bind:checked={anteil} />{L('Als Anteil an allen Personen zeigen (statt Anzahl)', 'Show as share of all people (instead of count)')}</label>
    <DiagrammExport titel={L('Pyramide', 'Pyramid')}>
      <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz}>
        {#each achsenMarken(0, daten.max * 1.05) as v}{@const dx = v * hr}<line x1={MITTE - dx} x2={MITTE - dx} y1={M - 6} y2={H - M + 6} stroke="var(--dg-gitter)" /><line x1={MITTE + dx} x2={MITTE + dx} y1={M - 6} y2={H - M + 6} stroke="var(--dg-gitter)" /><text x={MITTE - dx} y={H - M + 22} text-anchor="middle" class="klein">{fmt(v)}</text><text x={MITTE + dx} y={H - M + 22} text-anchor="middle" class="klein">{fmt(v)}</text>{/each}
        {#each z.tab as _, i (i)}
          <rect x={MITTE - 4 - daten.werte[i]![0]! * hr} y={zeile(i) + 2} width={daten.werte[i]![0]! * hr} height={ZH - 4} fill="var(--dg-a)"><title>{z.spalten[0]}, {z.zeilen[i]}: {fmt(daten.werte[i]![0]!)}</title></rect>
          <rect x={MITTE + 4} y={zeile(i) + 2} width={daten.werte[i]![1]! * hr} height={ZH - 4} fill="var(--dg-b, var(--tinte-2))"><title>{z.spalten[1]}, {z.zeilen[i]}: {fmt(daten.werte[i]![1]!)}</title></rect>
          <text x={MITTE} y={zeile(i) + ZH / 2 + 4} text-anchor="middle" class="klein" fill="var(--tinte)" paint-order="stroke" stroke="var(--blatt)" stroke-width="3">{z.zeilen[i]}</text>
        {/each}
        <text x={MITTE - 20} y={M - 14} text-anchor="end" class="klein" fill="var(--dg-a)">{z.spalten[0]}</text><text x={MITTE + 20} y={M - 14} class="klein" fill="var(--dg-b, var(--tinte-2))">{z.spalten[1]}</text>
      </svg>
    </DiagrammExport>
    <BildBeschreibung {...bt} />
  </details>
{/if}
