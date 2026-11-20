<script module lang="ts">
  import { LABOR_TEILE as TABS, type LaborTab as Tab } from '../lernen/lernsuche';
  /** Der Zustand bleibt beim Wechsel zwischen den Karteireitern (und zur Hilfe und zurück) erhalten; er gehört nicht zum Projekt. */
  const z = $state({ tab: 'stichprobe' as Tab, startwert: 1, startText: '1', anstoss: 0 });
</script>
<script lang="ts">
  import { L, d, waehle } from '../lib/sitzung.svelte';
  import { SATZ_ZUFALL } from '../lib/lernlaborsaetze';
  import Icon from './Icon.svelte';
  import LernlaborStichprobe from './LernlaborStichprobe.svelte';
  import LernlaborBootstrap from './LernlaborBootstrap.svelte';
  import LernlaborRandomisierung from './LernlaborRandomisierung.svelte';
  import LernlaborZufall from './LernlaborZufall.svelte';
  import LernlaborVierfelder from './LernlaborVierfelder.svelte';
  import LernlaborBaumrechner from './LernlaborBaumrechner.svelte';
  import LernlaborUeberdeckung from './LernlaborUeberdeckung.svelte';
  import LernlaborBayes from './LernlaborBayes.svelte';
  import LernlaborVorhersagen from './LernlaborVorhersagen.svelte';

  /**
   * Lernlabor (Reiter „Verstehen“, Kachel 4): Simulationen und Bayes zum Ausprobieren. Alles läuft im Browser, nichts davon liegt im Projekt.
   * Der Startwert gilt für alle Karteireiter: gleicher Startwert, gleiche Zahlen. Rechenkerne: lib/lernlabor.ts.
   */
  let { reiter = '' }: { reiter?: string } = $props();
  $effect(() => { const t = TABS.find(x => x.id === reiter); if (t) z.tab = t.id; });
  const MAX_START = 4294967295;
  const startFehler = $derived(/^\d+$/.test(z.startText.trim()) && Number(z.startText.trim()) <= MAX_START ? '' : L('Bitte eine ganze Zahl von 0 bis 4 294 967 295 eingeben.', 'Please enter a whole number from 0 to 4,294,967,295.'));
  function setzeStart() {
    if (startFehler) return;
    const v = Number(z.startText.trim());
    if (v !== z.startwert) { z.startwert = v; z.anstoss++; }
  }
  function nochEinmal() { z.startwert = z.startwert >= MAX_START ? 0 : z.startwert + 1; z.startText = String(z.startwert); z.anstoss++; }
  function taste(e: KeyboardEvent, i: number) {
    const ziel = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
    if (ziel < 0) return;
    e.preventDefault();
    const t = TABS[(ziel + TABS.length) % TABS.length]!;
    z.tab = t.id;
    queueMicrotask(() => document.getElementById(`ll-tab-${t.id}`)?.focus());
  }
</script>

<div class="lernlabor">
  <p class="ll-einleitung">{d('Hier probierst du aus, was in der Statistik sonst nur als Formel steht: Zufall wird tausendfach durchgespielt, und du siehst, was dabei herauskommt.', 'Hier probieren Sie aus, was in der Statistik sonst nur als Formel steht: Zufall wird tausendfach durchgespielt, und Sie sehen, was dabei herauskommt.', 'Here you try out what statistics otherwise gives only as a formula: chance is played through thousands of times and you see what comes out.')}</p>

  <div class="ll-start">
    <div class="eingabe"><label for="ll-startwert">{L('Startwert', 'Seed')}</label>
      <input id="ll-startwert" type="text" inputmode="numeric" autocomplete="off" bind:value={z.startText} onchange={setzeStart} onkeydown={(e) => { if (e.key === 'Enter') setzeStart(); }} aria-invalid={startFehler ? 'true' : undefined} aria-describedby="ll-start-h" style="max-width:14ch"></div>
    <button class="k" type="button" onclick={nochEinmal} data-tipp={L('Zählt den Startwert um 1 hoch und rechnet den offenen Karteireiter noch einmal', 'Counts the seed up by 1 and runs the open tab again')}><Icon n="wieder" />{L('Noch einmal (neuer Startwert)', 'Again (new seed)')}</button>
    <p class="hilfe" id="ll-start-h">{startFehler || L('Gleicher Startwert, gleiche Zahlen: so lässt sich ein Lauf wiederholen. Der Startwert steht in jedem Satz.', 'Same seed, same numbers: this is how a run can be repeated. The seed is stated in every sentence.')} {SATZ_ZUFALL()}</p>
  </div>

  <div class="ll-reiter" role="tablist" aria-label={L('Lernlabor', 'Learning lab')}>
    {#each TABS as t, i}
      <button class="k ll-tab" type="button" role="tab" id="ll-tab-{t.id}" aria-selected={z.tab === t.id} aria-controls="ll-bereich-{t.id}" tabindex={z.tab === t.id ? 0 : -1} onclick={() => (z.tab = t.id)} onkeydown={(e) => taste(e, i)}>
        <span class="ll-tab-name">{waehle(t.name)}</span><span class="ll-tab-frage">{waehle(t.frage)}</span>
      </button>
    {/each}
  </div>

  {#each TABS as t}
    {#if z.tab === t.id}
      <div class="ll-bereich" role="tabpanel" id="ll-bereich-{t.id}" aria-labelledby="ll-tab-{t.id}" tabindex="-1">
        {#if t.id === 'stichprobe'}<LernlaborStichprobe startwert={z.startwert} anstoss={z.anstoss} />
        {:else if t.id === 'bootstrap'}<LernlaborBootstrap startwert={z.startwert} anstoss={z.anstoss} />
        {:else if t.id === 'randomisierung'}<LernlaborRandomisierung startwert={z.startwert} anstoss={z.anstoss} />
        {:else if t.id === 'zufall'}<LernlaborZufall startwert={z.startwert} anstoss={z.anstoss} />
        {:else if t.id === 'baum'}<LernlaborBaumrechner />
        {:else if t.id === 'vierfelder'}<LernlaborVierfelder />
        {:else if t.id === 'bayes'}<LernlaborBayes />
        {:else if t.id === 'vorhersagen'}<LernlaborVorhersagen startwert={z.startwert} anstoss={z.anstoss} />
        {:else}<LernlaborUeberdeckung startwert={z.startwert} anstoss={z.anstoss} />{/if}
      </div>
    {/if}
  {/each}
</div>

<style>
  .lernlabor { display: flex; flex-direction: column; gap: var(--a4); min-width: 0; padding-bottom: var(--a6); }
  .ll-einleitung { max-width: var(--breite-text); }
  .ll-start { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--a2) var(--a4); }
  .ll-start .hilfe { flex: 1 1 100%; margin: 0; max-width: var(--breite-text); }
  .ll-start .eingabe input[aria-invalid='true'] { border-color: var(--verlust); }
  .ll-reiter { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .ll-tab { flex-direction: column; align-items: flex-start; gap: 0; padding: var(--a2) var(--a3); text-align: start; white-space: normal; min-height: var(--ziel); }
  .ll-tab-name { font-weight: 650; }
  .ll-tab-frage { font-weight: 400; font-size: var(--gr-klein); color: var(--tinte-2); }
  .ll-tab[aria-selected='true'] { background: var(--akzent-hell); border-color: var(--akzent); box-shadow: inset 0 0 0 1px var(--akzent); color: var(--akzent-tinte); }
  .ll-tab[aria-selected='true'] .ll-tab-frage { color: var(--akzent-tinte); }
  .ll-tab:focus-visible { box-shadow: var(--fokus-ring); }
  .ll-bereich { display: flex; flex-direction: column; gap: var(--a5); min-width: 0; outline: none; }

  /* gemeinsam für alle Karteireiter (Klassen mit Vorsatz ll-) */
  .lernlabor :global(.ll-raster) { display: grid; grid-template-columns: minmax(0, 20rem) minmax(0, 1fr); gap: var(--a6); align-items: start; }
  .lernlabor :global(.ll-eingaben) { display: flex; flex-direction: column; gap: var(--a4); min-width: 0; }
  .lernlabor :global(.ll-ergebnis) { display: flex; flex-direction: column; gap: var(--a4); min-width: 0; }
  .lernlabor :global(.ll-zeile) { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a3); align-items: flex-end; }
  .lernlabor :global(.ll-eingaben .eingabe input[type=text]), .lernlabor :global(.ll-eingaben .eingabe select) { max-width: 100%; }
  .lernlabor :global(.eingabe input[aria-invalid='true']), .lernlabor :global(.eingabe textarea[aria-invalid='true']) { border-color: var(--verlust); }
  .lernlabor :global(.eingabe .fehler) { color: var(--verlust); font-size: var(--gr-klein); }
  .lernlabor :global(.ll-satz) { background: var(--blatt-2); border-inline-start: 4px solid var(--akzent); border-radius: var(--r-klein); padding: var(--a3) var(--a4); max-width: var(--breite-text); }
  .lernlabor :global(.ll-lehre) { max-width: var(--breite-text); color: var(--tinte-2); }
  .lernlabor :global(.ll-bild) { margin: 0; min-width: 0; }
  .lernlabor :global(.ll-bild figcaption) { font-size: var(--gr-klein); color: var(--tinte-2); max-width: var(--breite-text); margin-top: var(--a1); }
  .lernlabor :global(table.ll-tabelle) { border-collapse: collapse; font-variant-numeric: tabular-nums; }
  .lernlabor :global(table.ll-tabelle th), .lernlabor :global(table.ll-tabelle td) { text-align: right; padding: var(--a1) var(--a3); border-bottom: 1px solid var(--linie); font-weight: 400; }
  .lernlabor :global(table.ll-tabelle th:first-child), .lernlabor :global(table.ll-tabelle td:first-child) { text-align: start; }
  .lernlabor :global(table.ll-tabelle thead th) { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 600; }
  .lernlabor :global(table.ll-tabelle tbody th) { font-weight: 600; }
  .lernlabor :global(table.ll-tabelle caption) { text-align: start; font-weight: 650; padding-bottom: var(--a1); caption-side: top; }
  .lernlabor :global(.ll-rechnet) { display: flex; align-items: center; gap: var(--a3); }
  .lernlabor :global(.ll-rechnet progress) { width: 10rem; accent-color: var(--akzent); }
  .lernlabor :global(.ll-rechenweg) { font-family: var(--schrift-heft); font-variant-numeric: tabular-nums; display: flex; flex-direction: column; gap: var(--a1); overflow-x: auto; }
  .lernlabor :global(.ll-bilder) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--a4); }
  .lernlabor :global(textarea.ll-reihe) { font: inherit; font-variant-numeric: tabular-nums; }
  .lernlabor :global(h2.ll-h) { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin: 0; }
  @media (prefers-reduced-motion: reduce) { .lernlabor :global(*) { scroll-behavior: auto; } }
  /* gefühlte Breite bis 860 px (lib/groesse.svelte.ts) */
  :global(:where(:root.eng-860)) .lernlabor :global(.ll-raster) { grid-template-columns: minmax(0, 1fr); gap: var(--a5); }
  :global(:where(:root.eng-860)) .lernlabor :global(.ll-bilder) { grid-template-columns: minmax(0, 1fr); }
</style>
