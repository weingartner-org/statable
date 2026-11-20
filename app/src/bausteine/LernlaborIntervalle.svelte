<script module lang="ts">
  let zaehler = 0;
  export interface IntervallZeile { lo: number; hi: number; ueberdeckt: boolean; schaetzer: number }
</script>
<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import XTitel from './XTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  import { marken, skala, achsenZahl } from '../lib/lernlaborsaetze';
  /**
   * Intervalle übereinander, der wahre Wert als senkrechte Linie. Überdeckt: dünne durchgezogene Linie mit Kreis; nicht überdeckt: dicke gestrichelte Linie mit Raute -
   * die Unterscheidung hängt also nie nur an der Farbe.
   */
  let { intervalle, wahr, von, bis, xText, wahrText, jaText, neinText, titel, beschreibung }: {
    intervalle: IntervallZeile[]; wahr: number; von: number; bis: number; xText: string; wahrText: string; jaText: string; neinText: string; titel: string; beschreibung: string;
  } = $props();
  const id = `li${++zaehler}`;
  const W = 640, Lr = 20, R = 18, T = 44, U0 = 40, ZEILE = 5.4;
  const XZ = $derived(xZusatz(xText, W - Lr - R)), U = $derived(U0 + XZ);
  const H = $derived(T + intervalle.length * ZEILE + U);
  const x = $derived(skala(von, bis, Lr, W - R)), xm = $derived(marken(von, bis, 6));
  const zy = (i: number) => T + (i + 0.5) * ZEILE;
  const kl = (v: number) => Math.min(bis, Math.max(von, v));
  const bt = $derived(bildtext('sonstiges', { artName: L('Konfidenzintervalle übereinander', 'Confidence intervals stacked'), titel, xAchse: { name: xText, von, bis }, saetze: [beschreibung, `${wahrText}: ${achsenZahl(wahr)}.`],
    kennwerte: [{ name: jaText, wert: String(intervalle.filter(q => q.ueberdeckt).length) }, { name: neinText, wert: String(intervalle.filter(q => !q.ueberdeckt).length) }],
    tabelle: { kopf: [L('Nr.', 'No.'), L('untere Grenze', 'lower limit'), L('obere Grenze', 'upper limit'), L('Schätzwert', 'Estimate'), L('überdeckt den wahren Wert', 'covers the true value')], zeilen: intervalle.map((q, i) => [i + 1, achsenZahl(q.lo), achsenZahl(q.hi), achsenZahl(q.schaetzer), q.ueberdeckt ? jaText : neinText]) } }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each xm as v}<line x1={x(v)} x2={x(v)} y1={T - 4} y2={H - U} stroke="var(--dg-gitter)" /><text x={x(v)} y={H - U + 16} text-anchor="middle" class="klein">{achsenZahl(v)}</text>{/each}
  <line x1={Lr} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  <XTitel x={(Lr + W - R) / 2} y={H - U + 32} breite={W - Lr - R} text={xText} klasse="klein" />
  {#each intervalle as iv, i}
    {#if iv.ueberdeckt}
      <line x1={x(kl(iv.lo))} x2={x(kl(iv.hi))} y1={zy(i)} y2={zy(i)} stroke="var(--dg-a)" stroke-width="1.2" />
      <circle cx={x(kl(iv.schaetzer))} cy={zy(i)} r="1.8" fill="var(--dg-a)" />
    {:else}
      <line x1={x(kl(iv.lo))} x2={x(kl(iv.hi))} y1={zy(i)} y2={zy(i)} stroke="var(--dg-b)" stroke-width="2.6" stroke-dasharray="5 3" />
      <rect x={x(kl(iv.schaetzer)) - 2.4} y={zy(i) - 2.4} width="4.8" height="4.8" fill="var(--dg-b)" transform="rotate(45 {x(kl(iv.schaetzer))} {zy(i)})" />
    {/if}
  {/each}
  <line x1={x(wahr)} x2={x(wahr)} y1={T - 8} y2={H - U} stroke="var(--tinte)" stroke-width="2" />
  <text x={x(wahr)} y={T - 12} text-anchor="middle" class="klein">{wahrText}</text>
  <line x1={Lr} x2={Lr + 26} y1={12} y2={12} stroke="var(--dg-a)" stroke-width="1.2" /><circle cx={Lr + 13} cy="12" r="1.8" fill="var(--dg-a)" /><text x={Lr + 32} y={16} class="klein">{jaText}</text>
  <line x1={Lr + 230} x2={Lr + 256} y1={12} y2={12} stroke="var(--dg-b)" stroke-width="2.6" stroke-dasharray="5 3" /><rect x={Lr + 240.6} y="9.6" width="4.8" height="4.8" fill="var(--dg-b)" transform="rotate(45 {Lr + 243} 12)" /><text x={Lr + 262} y={16} class="klein">{neinText}</text>
</svg>
<BildBeschreibung {...bt} />
