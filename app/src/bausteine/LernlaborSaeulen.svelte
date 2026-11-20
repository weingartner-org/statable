<script module lang="ts">
  let zaehler = 0;
  export interface SaeulenZeile { name: string; beob: number; p: number }
</script>
<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import XTitel from './XTitel.svelte';
  import YTitel from './YTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  import { marken, skala, achsenZahl } from '../lib/lernlaborsaetze';
  /** Beobachtete relative Häufigkeit (volle Säule) neben der Wahrscheinlichkeit P (schraffierte Säule mit gestricheltem Rand) je Ergebnis. */
  let { zeilen, nameText, yText, beobText, pText, titel, beschreibung }: { zeilen: SaeulenZeile[]; nameText: string; yText: string; beobText: string; pText: string; titel: string; beschreibung: string } = $props();
  const id = `ls${++zaehler}`;
  const W = 640, H0 = 320, Lr = 62, R = 18, T = 34, U0 = 52;
  const XZ = $derived(xZusatz(nameText, W - Lr - R)), H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const hoch = $derived(Math.max(0.01, ...zeilen.map(z => Math.max(z.beob, z.p))) * 1.1);
  const y = $derived(skala(0, hoch, H - U, T)), ym = $derived(marken(0, hoch, 5));
  const breite = $derived((W - Lr - R) / Math.max(1, zeilen.length));
  const bw = $derived(Math.min(34, breite * 0.38));
  const bt = $derived.by(() => {
    const t = bildtext('saeulen', { titel, kategorieName: nameText, kategorien: zeilen.map(z => z.name), wertName: yText, reihen: [{ name: beobText, werte: zeilen.map(z => z.beob) }, { name: pText, werte: zeilen.map(z => z.p) }] });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  <defs><pattern id="{id}-s" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--blatt)" /><line x1="0" y1="0" x2="0" y2="6" stroke="var(--dg-b)" stroke-width="2.5" /></pattern></defs>
  {#each ym as v}<line x1={Lr} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={Lr - 8} y={y(v) + 4} text-anchor="end" class="klein">{achsenZahl(v)}</text>{/each}
  {#each zeilen as z, i}
    {@const mx = Lr + breite * (i + 0.5)}
    <rect x={mx - bw - 1} y={y(z.beob)} width={bw} height={y(0) - y(z.beob)} fill="var(--dg-a)" />
    <rect x={mx + 1} y={y(z.p)} width={bw} height={y(0) - y(z.p)} fill="url(#{id}-s)" stroke="var(--dg-b)" stroke-width="1.5" stroke-dasharray="4 2" />
    <text x={mx} y={H - U + 18} text-anchor="middle" class="klein">{z.name}</text>
  {/each}
  <line x1={Lr} x2={Lr} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={Lr} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  <XTitel x={(Lr + W - R) / 2} y={H0 - 8} breite={W - Lr - R} text={nameText} klasse="klein" />
  <YTitel x={14} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={13} klasse="klein" />
  <rect x={Lr + 8} y={8} width="14" height="14" fill="var(--dg-a)" /><text x={Lr + 28} y={20} class="klein">{beobText}</text>
  <rect x={Lr + 220} y={8} width="14" height="14" fill="url(#{id}-s)" stroke="var(--dg-b)" stroke-width="1.5" stroke-dasharray="4 2" /><text x={Lr + 240} y={20} class="klein">{pText}</text>
</svg>
<BildBeschreibung {...bt} />
