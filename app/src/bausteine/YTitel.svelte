<script lang="ts">
  import { yZeilen } from '../lib/ytitel';
  /** Senkrechter Achsentitel nach der Regel in lib/ytitel.ts: umbrechen statt abschneiden. x = Grundlinie der ersten (äußersten) Zeile, y = Mitte der Achse.
   *  Zeilenabstand in em: auf dem Handy vergrößert dgschrift.ts die Schrift, die Zeilen wachsen mit. */
  let { x, y, laenge, text, px = 13, fett = false, klasse = '' }: { x: number; y: number; laenge: number; text: string; px?: number; fett?: boolean; klasse?: string } = $props();
  const zeilen = $derived(yZeilen(text, laenge, px, fett));
</script>
<text transform="translate({x} {y}) rotate(-90)" text-anchor="middle" class={klasse || undefined} font-weight={fett ? 600 : undefined} style={klasse ? undefined : `font-size:${px}px`}>{#each zeilen as z, i}<tspan x="0" dy={i === 0 ? 0 : '1.25em'}>{z}</tspan>{/each}</text>
