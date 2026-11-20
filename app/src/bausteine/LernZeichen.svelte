<script lang="ts">
  /**
   * Kleines Diagramm je Thema oder Lernpfad in der Seitenleiste von „Lernen“: Linien in der Textfarbe, ein Punkt hebt sich ab wie der letzte Messpunkt im Logo.
   * Nur Schmuck, der Name steht daneben. Farben über Tokens, damit alle Themen stimmen; `--lz-punkt` setzt die aktive Zeile.
   */
  let { id }: { id: string } = $props();
  const PFAD_ZU_THEMA: Record<string, string> = {
    grundlagen: 'verteilung', 'grundlagen-2': 'vergleichen', 'grundlagen-3': 'messen', fragebogen: 'messen', 'fragebogen-vertiefen': 'messen', 'ergebnisse-lesen': 'schliessen', gruppen: 'vergleichen', 'studie-planen': 'planen',
    medizin: 'fach', psychologie: 'messen', wirtschaft: 'vorhersage', natur: 'zusammenhang', 'lineares-modell': 'vorhersage', 'regression-pruefen': 'vorhersage'
  };
  const z = $derived(PFAD_ZU_THEMA[id] ?? id);
</script>

<svg class="lz" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  {#if z === 'daten'}
    <rect x="6" y="9" width="32" height="26" rx="3" /><path d="M6 18h32M6 26.5h32M17 9v26" /><circle class="lz-p" cx="28" cy="22" r="3.2" />
  {:else if z === 'beschreiben'}
    <path d="M5 22h8M31 22h8M5 17v10M39 17v10" /><rect x="13" y="13" width="18" height="18" rx="2" /><path class="lz-l" d="M22 13v18" />
  {:else if z === 'verteilung'}
    <path d="M4 36h36M6 35C14 35 15 9 22 9s8 26 16 26" /><path class="lz-l" d="M22 9v27" />
  {:else if z === 'wahrscheinlichkeit'}
    <path d="M9 22l15-11M9 22l15 11M24 11l11-4M24 11l11 6M24 33l11-5M24 33l11 5" /><circle class="lz-v" cx="9" cy="22" r="3.2" /><circle class="lz-p" cx="35" cy="7" r="3.2" />
  {:else if z === 'schliessen'}
    <path d="M10 12v20M6 12h8M6 32h8M22 8v22M18 8h8M18 30h8M34 15v20M30 15h8M30 35h8" /><circle class="lz-v" cx="10" cy="22" r="3" /><circle class="lz-v" cx="22" cy="19" r="3" /><circle class="lz-p" cx="34" cy="25" r="3.2" />
  {:else if z === 'planen'}
    {#each [10, 22, 34] as y}{#each [10, 22, 34] as x}<circle class={x === 22 && y === 22 ? 'lz-p' : 'lz-v'} cx={x} cy={y} r="3.2" />{/each}{/each}
  {:else if z === 'vergleichen'}
    <rect x="7" y="16" width="12" height="18" rx="2" /><rect class="lz-l" x="25" y="9" width="12" height="18" rx="2" /><path d="M4 38h36" />
  {:else if z === 'zusammenhang'}
    <path d="M5 5v34h34" /><circle class="lz-v" cx="12" cy="31" r="2.6" /><circle class="lz-v" cx="17" cy="25" r="2.6" /><circle class="lz-v" cx="21" cy="29" r="2.6" /><circle class="lz-v" cx="25" cy="20" r="2.6" /><circle class="lz-v" cx="29" cy="16" r="2.6" /><circle class="lz-p" cx="35" cy="10" r="3.2" />
  {:else if z === 'regression-lesen'}
    <path d="M7 35L33 15" /><path class="lz-l" d="M35 6v14M31 6h8M31 20h8" /><circle class="lz-v" cx="12" cy="29" r="2.6" /><circle class="lz-v" cx="21" cy="26" r="2.6" /><circle class="lz-p" cx="35" cy="13" r="3.4" />
  {:else if z === 'vorhersage'}
    <path d="M7 35L37 9" /><circle class="lz-v" cx="10" cy="26" r="2.6" /><circle class="lz-v" cx="18" cy="30" r="2.6" /><circle class="lz-v" cx="22" cy="17" r="2.6" /><circle class="lz-v" cx="29" cy="21" r="2.6" /><circle class="lz-p" cx="37" cy="9" r="3.6" />
  {:else if z === 'kategorien'}
    <rect class="lz-v" x="7" y="22" width="8" height="15" rx="1.5" stroke="none" /><rect class="lz-p" x="18" y="10" width="8" height="27" rx="1.5" /><rect class="lz-v" x="29" y="17" width="8" height="20" rx="1.5" stroke="none" />
  {:else if z === 'messen'}
    <path d="M5 22h34" /><circle class="lz-v" cx="7" cy="22" r="3" /><circle class="lz-v" cx="15" cy="22" r="3" /><circle class="lz-p" cx="23" cy="22" r="4.2" /><circle class="lz-v" cx="30" cy="22" r="3" /><circle class="lz-v" cx="37" cy="22" r="3" />
  {:else if z === 'technik'}
    <path d="M5 11h34M5 33h34" stroke-dasharray="3 5" /><path d="M6 24l7-5 7 6 7-7 6 4 5-3" /><circle class="lz-p" cx="38" cy="19" r="3.2" />
  {:else}
    <path d="M6 8v28h32" /><path class="lz-l" d="M6 11h10v8h9v8h13" />
  {/if}
</svg>

<style>
  .lz { width: 2rem; height: 2rem; flex: none; display: block; }
  .lz-p { fill: var(--lz-punkt, var(--dg-b)); stroke: none; }
  .lz-v { fill: currentColor; stroke: none; }
  .lz-l { stroke: var(--lz-punkt, var(--dg-b)); }
</style>
