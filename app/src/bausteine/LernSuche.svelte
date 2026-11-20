<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { L, Lp, aktuelleSprache } from '../lib/sitzung.svelte';
  import { verzoegert } from '../lib/laedt.svelte';
  import { artikelModul } from '../hilfe/artikel-laden';
  import { lernIndex, lernSuche, type LernArt } from '../lernen/lernsuche';
  import type { Sprache } from '../i18n/laufzeit';
  import { einheitNach } from '../lernen/lernplan';
  import { einheitStandText } from '../lib/lernzustand.svelte';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';

  /** Suchfeld über alle Lernbereiche auf der Übersicht „Verstehen“. `frage` nach außen: Solange gesucht wird, stehen dort statt der Kacheln die Treffer. */
  let { frage = $bindable('') }: { frage?: string } = $props();

  let modul = $state<typeof import('../hilfe/artikel')>();
  let geladenFuer = $state<Sprache>();
  let ladefehler = $state(false);
  const sucht = $derived(!!frage.trim());
  const animAn = verzoegert(() => sucht && !modul && !ladefehler);
  /** Die Artikel kommen erst mit der ersten Eingabe (rund 200 KB). */
  const lade = () => { ladefehler = false; const sp = aktuelleSprache(); artikelModul(sp).then(m => { modul = m; geladenFuer = sp; }, () => (ladefehler = true)); };
  $effect(() => { const sp = aktuelleSprache(); if (sucht && geladenFuer !== sp && !ladefehler) lade(); });

  const ix = $derived(modul && geladenFuer ? lernIndex(modul.artikelListe(geladenFuer), geladenFuer) : undefined);
  const treffer = $derived(ix && sucht ? lernSuche(ix, frage, geladenFuer!) : []);
  const artName = (a: LernArt) => a === 'einheit' ? L('Lerneinheit', 'Learning unit') : a === 'beispiel' ? L('Beispiel', 'Example') : a === 'kachel' ? L('Verstehen', 'Understand') : a === 'labor' ? L('Lernlabor', 'Learning lab') : a === 'probieren' ? L('Ausprobieren', 'Try it out') : a === 'ueben' ? L('Üben', 'Practise') : L('Hilfe', 'Help');
  function taste(e: KeyboardEvent) { if (e.key === 'Escape' && frage) { e.preventDefault(); e.stopPropagation(); frage = ''; } }
</script>

<div class="ls-suche suchfeld">
  <label class="nur-vorleser" for="ls-feld">{L('In Lernen suchen', 'Search in Learning')}</label>
  <Icon n="suche" />
  <input id="ls-feld" bind:value={frage} type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" onkeydown={taste}
    aria-controls="ls-treffer" placeholder={L('In Lernen suchen, z. B. „Faktorenanalyse“', 'Search in Learning, e.g. "factor analysis"')}>
</div>
<p class="nur-vorleser" use:ergebnisAnsage>{sucht && ix ? (treffer.length ? L(`${treffer.length} Treffer`, `${treffer.length} results`) : L('Keine Treffer', 'No results')) : ''}</p>

<div id="ls-treffer">
{#if sucht}
  {#if ladefehler}<p class="leise-text" role="status">{L('Die Hilfe konnte nicht geladen werden (kein Netz?).', 'The help could not be loaded (no connection?).')} <button type="button" class="k leise klein-knopf" onclick={lade}>{L('Nochmal versuchen', 'Try again')}</button></p>
  {:else if !ix}{#if animAn.an}<p class="leise-text" role="status"><Rechnet text={L('Hilfe wird geladen …', 'Loading help …')} /></p>{/if}
  {:else if treffer.length}
    <ul class="ls-liste" aria-label={L('Treffer', 'Results')}>
      {#each treffer as t (t.treffer.artikel.id)}
        <li><a href={t.href}>
          <span class="ls-art">{artName(t.art)}{#if t.einheit}{' · '}{einheitStandText(einheitNach(t.einheit)!)}{/if}{#if t.n}{' · '}{Lp(t.n, `${t.n} Frage`, `${t.n} Fragen`, `${t.n} question`, `${t.n} questions`)}{/if}</span>
          <span class="ls-titel">{#each t.treffer.titel as p}{#if p.treffer}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}</span>
          {#if t.treffer.fach}<span class="ls-fach">{L('Fachbegriff: ', 'Technical term: ')}{t.treffer.fach}</span>{/if}
        </a></li>
      {/each}
    </ul>
  {:else}<p class="leise-text">{L('Dazu gibt es nichts in den Lernbereichen. Andere Schreibweise oder ein Oberbegriff (z. B. „Gruppen“, „Korrelation“) kann helfen.', 'Nothing in the learning areas matches. Try another spelling or a broader term (e.g. "groups", "correlation").')}</p>{/if}
{/if}
</div>

<style>
  .ls-suche { margin-top: var(--a3); }   /* Aussehen: `.suchfeld` in stil/app.css (Stufe 9) */
  .ls-liste { list-style: none; margin: var(--a3) 0 0; padding: 0; display: grid; gap: var(--a1); }
  .ls-liste a { display: grid; gap: 2px; padding: var(--a2) var(--a3); border: 1px solid transparent; border-radius: var(--r-klein); color: var(--tinte); text-decoration: none; }
  .ls-liste a:hover { background: var(--akzent-hell); border-color: var(--akzent); }
  .ls-art { font-size: var(--gr-klein); color: var(--akzent-tinte); font-weight: 650; }
  .ls-titel { font-weight: 650; }
  .ls-fach { font-size: var(--gr-klein); color: var(--tinte-2); }
  .leise-text { color: var(--tinte-2); margin-top: var(--a3); }
  mark { background: #FFE9A8; color: #1D2530; border-radius: 2px; padding: 0 1px; }
</style>
