<script module lang="ts">
  let zaehler = 0;
</script>
<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import XTitel from './XTitel.svelte';
  import YTitel from './YTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  import { marken, skala, achsenZahl } from '../lib/lernlaborsaetze';
  import type { Kurve } from '../lib/bayesvorwissen';
  /**
   * Prior, Likelihood (auf Fläche 1 skaliert) und Posterior über dem Wert. Unterscheidung nie nur durch Farbe: Prior gestrichelt, Likelihood gepunktet, Posterior durchgezogen und dick;
   * dazu ein schraffierter Streifen für das Glaubwürdigkeitsintervall und eine senkrechte Linie beim Posterior-Mittel. Die Textfassung steht in der Beschreibung und in der Tabelle darunter.
   */
  let { kurve, von, bis, lo, hi, mittel, xText, yText, nameP, nameL, nameQ, niveauText, titel, beschreibung }: {
    kurve: Kurve; von: number; bis: number; lo: number; hi: number; mittel: number; xText: string; yText: string; nameP: string; nameL: string; nameQ: string; niveauText: string; titel: string; beschreibung: string;
  } = $props();
  const id = `lb${++zaehler}`;
  const W = 640, H0 = 320, Lr = 62, R = 18, T = 54, U0 = 52;
  const XZ = $derived(xZusatz(xText, W - Lr - R)), H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const ymax = $derived(Math.max(...kurve.prior, ...kurve.likelihood, ...kurve.posterior) * 1.06 || 1);
  const x = $derived(skala(von, bis, Lr, W - R)), y = $derived(skala(0, ymax, H - U, T));
  const xm = $derived(marken(von, bis, 6)), ym = $derived(marken(0, ymax, 4));
  const pfad = (w: number[]) => w.map((v, i) => `${i ? 'L' : 'M'}${x(kurve.x[i]!).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const flaeche = $derived.by(() => {
    const idx = kurve.x.map((v, i) => (v >= lo && v <= hi ? i : -1)).filter(i => i >= 0);
    if (idx.length < 2) return '';
    return `M${x(kurve.x[idx[0]!]!).toFixed(1)} ${y(0)} ` + idx.map(i => `L${x(kurve.x[i]!).toFixed(1)} ${y(kurve.posterior[i]!).toFixed(1)}`).join(' ') + ` L${x(kurve.x[idx.at(-1)!]!).toFixed(1)} ${y(0)} Z`;
  });
  const bt = $derived.by(() => {
    const pk = (w: number[]) => kurve.x.map((v, i) => [v, w[i]!] as [number, number]);
    const t = bildtext('verteilung', { titel, xAchse: { name: xText, von, bis }, yAchse: { name: yText },
      kurven: [{ name: nameP, punkte: pk(kurve.prior) }, { name: nameL, punkte: pk(kurve.likelihood) }, { name: nameQ, punkte: pk(kurve.posterior) }],
      marken: [{ name: nameQ, x: mittel }], flaeche: [{ name: niveauText, von: lo, bis: hi }] });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  <defs><pattern id="{id}-s" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--dg-punkt-a)" /><line x1="0" y1="0" x2="0" y2="6" stroke="var(--dg-a)" stroke-width="1.5" /></pattern></defs>
  {#each ym as v}<line x1={Lr} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={Lr - 8} y={y(v) + 4} text-anchor="end" class="klein">{achsenZahl(v)}</text>{/each}
  <line x1={Lr} x2={Lr} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={Lr} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each xm as v}<line x1={x(v)} x2={x(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={x(v)} y={H - U + 20} text-anchor="middle" class="klein">{achsenZahl(v)}</text>{/each}
  <XTitel x={(Lr + W - R) / 2} y={H0 - 8} breite={W - Lr - R} text={xText} klasse="klein" />
  <YTitel x={14} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={13} klasse="klein" />
  {#if flaeche}<path d={flaeche} fill="url(#{id}-s)" />{/if}
  <path d={pfad(kurve.prior)} fill="none" stroke="var(--dg-b)" stroke-width="2.2" stroke-dasharray="8 5" stroke-linejoin="round" />
  <path d={pfad(kurve.likelihood)} fill="none" stroke="var(--tinte)" stroke-width="2.4" stroke-dasharray="1.5 4.5" stroke-linecap="round" stroke-linejoin="round" />
  <path d={pfad(kurve.posterior)} fill="none" stroke="var(--dg-a)" stroke-width="3.2" stroke-linejoin="round" />
  <line x1={x(mittel)} x2={x(mittel)} y1={T - 6} y2={H - U} stroke="var(--dg-a)" stroke-width="1.4" />
  <line x1={Lr} x2={Lr + 30} y1={12} y2={12} stroke="var(--dg-b)" stroke-width="2.2" stroke-dasharray="8 5" /><text x={Lr + 36} y={16} class="klein">{nameP}</text>
  <line x1={Lr + 200} x2={Lr + 230} y1={12} y2={12} stroke="var(--tinte)" stroke-width="2.4" stroke-dasharray="1.5 4.5" stroke-linecap="round" /><text x={Lr + 236} y={16} class="klein">{nameL}</text>
  <line x1={Lr} x2={Lr + 30} y1={32} y2={32} stroke="var(--dg-a)" stroke-width="3.2" /><text x={Lr + 36} y={36} class="klein">{nameQ}</text>
  <rect x={Lr + 200} y="26" width="30" height="10" fill="url(#{id}-s)" stroke="var(--dg-a)" /><text x={Lr + 236} y={36} class="klein">{niveauText}</text>
</svg>
<BildBeschreibung {...bt} />
