<script lang="ts">
  import { xZeilen } from '../lib/ytitel';
  /** Waagrechter Achsentitel nach der Regel in lib/ytitel.ts: umbrechen statt abschneiden. y = Grundlinie der ersten Zeile, x = Mitte der Achse.
   *  Zeilenabstand in em: auf dem Handy vergrößert dgschrift.ts die Schrift, die Zeilen wachsen mit. */
  let { x, y, breite, text, px = 13, fett = false, klasse = '' }: { x: number; y: number; breite: number; text: string; px?: number; fett?: boolean; klasse?: string } = $props();
  const zeilen = $derived(xZeilen(text, breite, px, fett));
</script>
<text {x} {y} text-anchor="middle" class={klasse || undefined} font-weight={fett ? 600 : undefined} style={klasse ? undefined : `font-size:${px}px`}>{#each zeilen as z, i}<tspan {x} dy={i === 0 ? 0 : '1.25em'}>{z}</tspan>{/each}</text>
