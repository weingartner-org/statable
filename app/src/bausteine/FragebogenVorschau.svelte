<script lang="ts">
  import { untrack } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import { zeigen, type Antworten } from '../lib/fragebogenplan-bedingung';
  import { finde } from '../lib/fragebogenplan-editor';
  import { anzeigeSprache, anzeigeTitel } from '../lib/fragebogen-aktionen.svelte';
  import { bildUrl, ed, pretestMerke } from '../lib/fragebogen-editor.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * Vorschau (Fragebogen planen, 2C): die Seite so, wie Befragte sie sehen - gezeichnet von der Fragetypen-Bibliothek (`zeichneSeite`, Modus `vorschau`).
   * Umschalter Rechner/Handy (Option `eng`) und Sprache; Filter wirken (beantworten Sie eine Frage, und die abhängige erscheint oder verschwindet).
   * Die Bibliothek wird erst beim ersten Öffnen geladen (eigener Baustein).
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  let bib = $state.raw<typeof import('../ausfuellen/index') | null>(null);
  let ladefehler = $state(false);
  $effect(() => { void import('../ausfuellen/index').then(m => { bib = m; }).catch(() => { ladefehler = true; }); });

  let host = $state<HTMLElement>();
  let eng = $state(false);
  let sprache = $state('');
  let seiteId = $state('');
  let antworten = $state.raw<Antworten>({});
  const spr = $derived(plan.sprachen.includes(sprache) ? sprache : anzeigeSprache(plan));
  const seite = $derived(plan.elemente.find(s => s.id === seiteId) ?? plan.elemente[0]);
  const nKommentare = (a: Antworten) => Object.entries(a).filter(([k, v]) => k.endsWith(':kommentar') && typeof v === 'string' && v.trim()).length;
  /** Pretest: die Antworten (mit Kommentaren) des bisherigen Durchgangs merken und die Vorschau zurücksetzen. */
  function durchgangMerken() {
    const n = nKommentare(antworten);
    if (!n) { sage(L('In diesem Durchgang steht noch kein Kommentar. Schreiben Sie einen Kommentar, dann lässt sich der Durchgang merken.', 'This run has no comment yet. Write a comment, then the run can be kept.')); return; }
    pretestMerke(plan.id, 'vorschau', [{ ...antworten }]);
    antworten = {};
    sage(L(`Durchgang gemerkt: ${n} ${n === 1 ? 'Kommentar' : 'Kommentare'}. Die Vorschau ist zurückgesetzt.`, `Run kept: ${n} ${n === 1 ? 'comment' : 'comments'}. The preview is reset.`));
  }
  const sprachName = (sp: string) => (sp === 'de' ? L('Deutsch', 'German') : sp === 'en' ? L('Englisch', 'English') : sp);

  // Die Vorschau folgt der Auswahl in der Gliederung (die Seite des gewählten Elements).
  $effect(() => { const id = ed.auswahl; untrack(() => { const f = id ? finde(plan, id) : null; if (f) seiteId = f.seite.id; }); });

  function weiter(richtung: -1 | 1) {
    const i = plan.elemente.findIndex(s => s.id === seite?.id);
    for (let j = i + richtung; j >= 0 && j < plan.elemente.length; j += richtung) {
      const z = plan.elemente[j]!;
      if (zeigen(z, antworten, plan)) { seiteId = z.id; return; }
    }
  }
  $effect(() => {
    const m = bib, h = host, p = plan, s = seite, sp = spr, e = eng;
    if (!m || !h) return;
    untrack(() => {
      h.replaceChildren();
      if (!s) return;
      h.append(m.zeichneSeite(p, s, antworten, {
        sprache: sp, eng: e, modus: 'vorschau', zufallStart: 7,
        ansage: t => sage(t), bildUrl: d => bildUrl(p.id, d),
        beiAenderung: a => { antworten = { ...a }; }, beiWeiter: () => weiter(1), beiZurueck: () => weiter(-1)
      }));
    });
  });
</script>

<section class="vo" aria-label={L('Vorschau', 'Preview')}>
  <h2 id="fb-vo-t">{L('Vorschau', 'Preview')}</h2>
  <div class="leiste">
    <div class="knoepfe" role="group" aria-label={L('Darstellung', 'Display')}>
      <button class="k" type="button" aria-pressed={!eng} onclick={() => { eng = false; sage(L('Vorschau am Rechner.', 'Preview on a computer.')); }}>{L('Rechner', 'Computer')}</button>
      <button class="k" type="button" aria-pressed={eng} onclick={() => { eng = true; sage(L('Vorschau am Handy.', 'Preview on a phone.')); }}>{L('Handy', 'Phone')}</button>
    </div>
    {#if plan.sprachen.length > 1}
      <div class="eingabe">
        <label for="fb-vo-sprache">{L('Sprache', 'Language')}</label>
        <select id="fb-vo-sprache" value={spr} onchange={(e) => (sprache = e.currentTarget.value)}>{#each plan.sprachen as sp (sp)}<option value={sp}>{sprachName(sp)}</option>{/each}</select>
      </div>
    {/if}
    {#if plan.elemente.length > 1}
      <div class="eingabe">
        <label for="fb-vo-seite">{L('Seite', 'Page')}</label>
        <select id="fb-vo-seite" value={seite?.id} onchange={(e) => (seiteId = e.currentTarget.value)}>{#each plan.elemente as s, i (s.id)}<option value={s.id}>{i + 1}: {anzeigeTitel(plan, s)}</option>{/each}</select>
      </div>
    {/if}
    <button class="k leise" type="button" onclick={() => { antworten = {}; sage(L('Antworten der Vorschau zurückgesetzt.', 'Preview answers reset.')); }}>{L('Antworten zurücksetzen', 'Reset answers')}</button>
    {#if plan.einstellungen.pretest}<button class="k" type="button" onclick={durchgangMerken}>{L('Durchgang merken (Pretest)', 'Keep run (pretest)')}</button>{/if}
  </div>
  <p class="hilfe">{L('So sehen Befragte die Seite. Filter wirken: Beantworten Sie eine Frage, um zu sehen, wann eine andere erscheint. Zufällige Reihenfolgen stehen in der Vorschau fest.', 'This is how respondents see the page. Filters work: answer a question to see when another one appears. Random orders are fixed in the preview.')}</p>
  {#if plan.elemente.length === 0}
    <p class="heft-text leer">{L('Noch nichts zu zeigen: Fügen Sie eine Seite oder Frage hinzu.', 'Nothing to show yet: add a page or a question.')}</p>
  {:else if ladefehler}
    <p class="heft-text">{L('Die Vorschau ließ sich nicht laden. Laden Sie die Seite neu.', 'The preview could not be loaded. Reload the page.')}</p>
  {:else if !bib}
    <p class="heft-text"><Rechnet text={L('Vorschau wird geladen …', 'Loading the preview …')} /></p>
  {/if}
  <div class="rahmen" class:handy={eng}><div bind:this={host} class="host"></div></div>
</section>

<style>
  .vo { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  .vo h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .leiste { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: flex-end; }
  .knoepfe { display: flex; gap: var(--a1); }
  .knoepfe .k[aria-pressed='true'] { background: var(--akzent); border-color: var(--akzent); color: var(--tinte-auf-akzent); }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .leer { color: var(--tinte-2); }
  .rahmen { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); background: #fff; color: #1a1a1a; min-width: 0; overflow-x: auto; }
  .rahmen.handy { max-width: 375px; }
</style>
