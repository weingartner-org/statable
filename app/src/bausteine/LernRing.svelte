<script lang="ts">
  import type { Stueck } from '../lernen/lernstand';

  /**
   * Fortschrittsring einer Einheit: ein Stück je Abschnitt, grün gefüllt nach dem erledigten Anteil. Voll, wenn alles gemacht ist; dann steht ein Haken in der Mitte.
   * Übersprungen zeigt ein rotes Stück und ein Kreuz in der Mitte, damit der Zustand nicht nur in der Farbe steht. `name` sagt ihn als Text.
   * `name` ist Pflicht: Steht der Stand schon als Text neben dem Ring (Liste in „Lernen“), wird `name=""` übergeben, dann ist der Ring für Vorlesegeräte unsichtbar (keine Doppelansage).
   */
  let { stuecke, name }: { stuecke: Stueck[]; name: string } = $props();

  const LUECKE = 2.5;
  const n = $derived(stuecke.length);
  const voll = $derived(n > 0 && stuecke.every(s => s.anteil >= 1));
  const rot = $derived(stuecke.some(s => s.farbe === 'rot'));
  const teile = $derived(stuecke.map((s, i) => {
    const breit = 100 / n, lang = voll || n === 1 ? breit : breit - LUECKE;
    return { farbe: s.farbe, lang, gefuellt: lang * s.anteil, ab: -(i * breit + (voll || n === 1 ? 0 : LUECKE / 2)) };
  }));
</script>

<svg class="lr" viewBox="0 0 36 36" role={name ? 'img' : undefined} aria-label={name || undefined} aria-hidden={name ? undefined : 'true'} focusable="false">
  <g transform="rotate(-90 18 18)" fill="none" stroke-width="4">
    {#each teile as t, i (i)}
      <circle class="spur {t.farbe}" cx="18" cy="18" r="15" pathLength="100" stroke-dasharray="{t.lang} {100 - t.lang}" stroke-dashoffset={t.ab} />
      {#if t.gefuellt > 0}<circle class="fuell" cx="18" cy="18" r="15" pathLength="100" stroke-dasharray="{t.gefuellt} {100 - t.gefuellt}" stroke-dashoffset={t.ab} />{/if}
    {/each}
  </g>
  {#if voll}
    <path class="haken" d="M11.5 18.4l4.4 4.4 8.6-9.8" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  {:else if rot}
    <path class="kreuz" d="M14 14l8 8M22 14l-8 8" fill="none" stroke-width="3" stroke-linecap="round" />
  {/if}
</svg>

<style>
  .lr { width: 2.25rem; height: 2.25rem; flex: none; display: block; }
  .spur.grau, .spur.gruen { stroke: var(--lern-grau); }
  .spur.rot { stroke: var(--lern-rot); }
  .fuell { stroke: var(--lern-gruen); }
  .haken { stroke: var(--lern-gruen); }
  .kreuz { stroke: var(--lern-rot); }
</style>
