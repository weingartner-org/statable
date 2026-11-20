<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { Snippet } from 'svelte';
  import { tick } from 'svelte';
  import { L, melde } from '../lib/sitzung.svelte';
  import { merkeSyntax } from '../lib/befehlsspeicher.svelte';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * Gemeinsamer Rahmen der Daten-Assistenten (Welle 5): eine Hauptwahl sichtbar, der Rest unter „Weitere Wege“, dann die Vorschau, die Hinweise,
   * der PSPP-Befehl (zum Lesen, Kopieren und zum Übernehmen in die Befehle) und der Knopf zum Anwenden. Angewendet wird mit `aendere()`: ein Rückgängig-Schritt.
   */
  let { id, titel, einleitung, haupt, weitere, vorschau, zusatz, hinweise = [], problem = '', syntax = '', befehlName = '', anwendenText, anwenden, kannAnwenden = true, laeuft = false, ueberschreibt = '' }: {
    id: string; titel: string; einleitung: string;
    haupt: Snippet; weitere?: Snippet; vorschau?: Snippet; zusatz?: Snippet;
    /** Sätze zu dem, was auffiel (Lücken, Rechenfehler, Sperren) - jeder mit Hinweis-Zeichen */
    hinweise?: string[];
    /** Warum „Anwenden“ gerade nicht geht (ein Satz); leer = geht */
    problem?: string;
    /** Der PSPP-Befehl, wie er ausgeführt würde; leer = noch nicht bestimmbar */
    syntax?: string; befehlName?: string;
    anwendenText: string; anwenden: () => void | Promise<void>; kannAnwenden?: boolean; laeuft?: boolean;
    /** Name der Spalte, die überschrieben würde: vor dem Anwenden kommt eine Rückfrage (nie still überschreiben) */
    ueberschreibt?: string;
  } = $props();
  let frage = $state(false);
  async function los() {
    if (!kannAnwenden) { if (problem) melde(problem); return; }
    if (ueberschreibt && !frage) { frage = true; await tick(); document.getElementById(`as-${id}-nein`)?.focus(); return; }
    frage = false;
    await anwenden();
  }

  async function kopieren() {
    try { await navigator.clipboard.writeText(syntax); melde(L('Befehl kopiert.', 'Command copied.')); } catch { melde(L('Kopieren ging nicht. Der Befehl lässt sich unter „Befehl“ markieren.', "Copying didn't work. You can select the command under \"Command\".")); }
  }
  function indieBefehle() { merkeSyntax(syntax, befehlName || titel); location.hash = 'befehle'; }
</script>

<section class="as" aria-labelledby="as-{id}-t">
  <h2 id="as-{id}-t">{titel}</h2>
  <p class="as-ein">{einleitung}</p>
  <div class="as-haupt" use:ergebnisAnsage={{ satz: '.as-satz' }}>{@render haupt()}</div>
  {#if weitere}<details class="auf as-weitere"><summary>{L('Weitere Wege', 'More options')}</summary><div class="as-weitere-in">{@render weitere()}</div></details>{/if}
  {#if vorschau}<div class="as-vorschau" use:ergebnisAnsage={{ satz: '.as-satz, .as-warn:not([role])', anzahl: 2, ersatz: '.as-hilfe, .as-hinweise li' }}><h3>{L('Vorschau', 'Preview')}</h3>{@render vorschau()}</div>{/if}
  {#if hinweise.length}<ul class="as-hinweise" aria-label={L('Hinweise', 'Notes')}>{#each hinweise as h}<li><Icon n="hinweis" k="hw" /><span>{h}</span></li>{/each}</ul>{/if}
  {#if problem}<p class="as-problem" role="status">{problem}</p>{/if}
  {#if zusatz}{@render zusatz()}{/if}
  {#if syntax}
    <details class="auf as-befehl"><summary>{L('Befehl', 'Command')}</summary>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <pre tabindex="0" aria-label={L('PSPP-Befehl', 'PSPP command')}>{syntax}</pre>
      <div class="knopfzeile"><button class="k" type="button" onclick={kopieren}><Icon n="kopieren" />{L('Befehl kopieren', 'Copy command')}</button></div>
    </details>
  {/if}
  {#if frage && ueberschreibt}
    <div class="as-frage" role="group" aria-labelledby="as-{id}-fr">
      <h4 id="as-{id}-fr"><Icon n="hinweis" k="hw" />{L('Spalte überschreiben?', 'Overwrite the column?')}</h4>
      <p>{L(`Die Spalte „${ueberschreibt}“ wird mit den neuen Werten überschrieben. Die alten Werte kommen nur über „Rückgängig“ in der Kopfzeile zurück. Eine neue Spalte lässt die alte unverändert.`, `The column "${ueberschreibt}" is overwritten with the new values. The old values only come back through "Undo" in the header. A new column leaves the old one unchanged.`)}</p>
      <div class="knopfzeile"><button class="k haupt" type="button" onclick={los}>{L('Überschreiben', 'Overwrite')}</button><button class="k" id="as-{id}-nein" type="button" onclick={() => (frage = false)}>{L('Abbrechen', 'Cancel')}</button></div>
    </div>
  {/if}
  <div class="knopfzeile as-tun">
    <button class="k haupt" type="button" disabled={laeuft} aria-disabled={!kannAnwenden ? 'true' : undefined} onclick={los}>
      {#if laeuft}<Rechnet imKnopf />{/if}{anwendenText}</button>
    {#if syntax}<button class="k leise" type="button" onclick={indieBefehle}><Icon n="befehl" />{L('In die Befehle übernehmen', 'Add to Commands')}</button>{/if}
    <span class="nur-vorleser" role="status">{laeuft ? L('Wird gerechnet …', 'Calculating …') : ''}</span>
  </div>
</section>

<style>
  .as { display: flex; flex-direction: column; gap: var(--a4); }
  .as h2 { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); }
  .as h3 { font: 650 var(--gr-text)/1.3 var(--schrift-ui); margin-bottom: var(--a2); }
  .as-ein { color: var(--tinte-2); max-width: var(--breite-text); }
  .as-haupt { display: flex; flex-direction: column; gap: var(--a4); }
  .as-weitere { border: 1px solid var(--linie); border-radius: var(--r); background: var(--blatt-2); padding: 0; }
  .as-weitere > summary { padding: var(--a2) var(--a3); }
  .as-weitere > summary:focus-visible { box-shadow: var(--fokus-ring); border-radius: var(--r); }
  .as-weitere-in { display: flex; flex-direction: column; gap: var(--a4); padding: var(--a2) var(--a3) var(--a4); }
  .as-vorschau { border-top: 1px solid var(--linie); padding-top: var(--a3); display: flex; flex-direction: column; gap: var(--a2); min-width: 0; }
  .as-hinweise { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a2); max-width: var(--breite-text); }
  .as-hinweise :global(li) { display: flex; gap: var(--a2); align-items: flex-start; }
  .as-hinweise :global(.ico) { flex: none; margin-top: 3px; }
  .as-problem { color: var(--verlust); max-width: var(--breite-text); }
  .as-befehl { border: 1px solid var(--linie); border-radius: var(--r); padding: 0; }
  .as-befehl > summary { padding: var(--a2) var(--a3); }
  .as-befehl > summary:focus-visible { box-shadow: var(--fokus-ring); border-radius: var(--r); }
  .as-befehl pre { margin: 0; padding: var(--a3); overflow: auto; background: var(--blatt-2); font: .85rem/1.5 var(--schrift-befehl); white-space: pre; max-height: 22rem; }
  .as-befehl pre:focus-visible { box-shadow: var(--fokus-ring); }
  .as-befehl .knopfzeile { padding: var(--a2) var(--a3); }
  .as-tun { margin-top: var(--a1); }
  .as-tun .k[aria-disabled='true'] { opacity: .55; }

  /* Inhalt der Assistenten (kommt aus den Snippets der Aufrufer) */
  .as :global(.as-feld) { display: flex; flex-direction: column; gap: var(--a1); min-width: 0; }
  .as :global(.as-feld > label), .as :global(.as-feld > .lbl), .as :global(.lbl) { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); }
  .as :global(.as-felder) { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: var(--a3) var(--a4); max-width: 720px; }
  .as :global(input[type='text']), .as :global(select) { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a1) var(--a3); width: 100%; min-width: 0; }
  .as :global(input[type='text']:focus-visible), .as :global(select:focus-visible) { border-color: var(--fokus); box-shadow: var(--fokus-ring); }
  .as :global(.as-schmal) { max-width: 9rem; }
  .as :global(.as-gruppe) { border: 0; padding: 0; margin: 0; min-width: 0; display: flex; flex-direction: column; gap: var(--a3); }
  .as :global(.as-gruppe > legend) { font: 650 var(--gr-text)/1.3 var(--schrift-ui); padding: 0; margin-bottom: var(--a2); }
  .as :global(.as-hilfe) { color: var(--tinte-2); font-size: var(--gr-klein); max-width: var(--breite-text); }
  .as :global(.as-satz) { max-width: var(--breite-text); }
  .as :global(.as-warn) { padding: var(--a2) var(--a3); background: var(--blatt-2); border-inline-start: 4px solid var(--hinweis, var(--akzent)); border-radius: var(--r-klein); max-width: var(--breite-text); }
  .as :global(.as-regeln) { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .as :global(.as-regeln > li) { display: grid; grid-template-columns: auto minmax(8rem, 11rem) minmax(8rem, 1fr) auto minmax(7rem, 1fr) auto; gap: var(--a2); align-items: center; }
  .as :global(.bed .as-regeln > li) { grid-template-columns: minmax(9rem, 1.4fr) minmax(8rem, 1fr) minmax(7rem, 1fr) auto; }
  .as :global(.as-nr) { color: var(--tinte-2); font-size: var(--gr-klein); min-width: 1.2em; text-align: right; }
  .as :global(.as-pfeil) { color: var(--akzent); }
  .as :global(.as-bereich) { display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--a1); align-items: center; }
  .as :global(.as-leer) { color: var(--tinte-2); font-size: var(--gr-klein); }
  .as :global(.as-liste) { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: var(--a2); align-items: start; }
  .as :global(.as-liste > li) { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a1) var(--a3); background: var(--blatt); }
  .as :global(.as-liste > li.an) { border-color: var(--akzent); background: var(--akzent-hell); }
  .as :global(.as-liste > li:has(:focus-visible)) { box-shadow: var(--fokus-ring); }
  .as :global(.as-liste label), .as :global(.as-eins) { display: flex; gap: var(--a2); align-items: flex-start; min-height: var(--ziel); padding-block: var(--a1); cursor: pointer; }
  .as :global(.as-liste input), .as :global(.as-eins input), .as :global(.as-chip input) { accent-color: var(--akzent); width: 18px; height: 18px; margin: 3px 0 0; flex: none; }
  .as :global(.as-liste span) { display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; }
  .as :global(.as-liste small) { color: var(--tinte-2); font-size: var(--gr-klein); }
  .as :global(.as-chips) { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .as :global(.as-chip) { display: inline-flex; align-items: center; gap: var(--a2); min-height: var(--ziel); padding: 0 var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); cursor: pointer; }
  .as :global(.as-chip:has(input:checked)) { border-color: var(--akzent); background: var(--akzent-hell); color: var(--akzent-tinte); font-weight: 600; box-shadow: inset 0 0 0 1px var(--akzent); }
  .as :global(.as-chip input) { margin: 0; }
  .as :global(.as-chip:has(input:focus-visible)) { box-shadow: var(--fokus-ring); }
  .as :global(.as-bausteine) { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; }
  .as :global(.as-bausteine select) { width: auto; min-width: 12rem; }
  .as :global(.as-tabhuelle) { overflow: auto; border: 1px solid var(--linie); border-radius: var(--r-klein); background: var(--blatt); max-width: 100%; }
  .as :global(.as-tabhuelle:focus-visible) { box-shadow: var(--fokus-ring); }
  .as :global(.as-tab) { border-collapse: collapse; width: max-content; min-width: min(100%, 24rem); font-variant-numeric: tabular-nums; background: var(--blatt); }
  .as :global(.as-tab th), .as :global(.as-tab td) { padding: var(--a1) var(--a3); text-align: start; border-bottom: 1px solid var(--linie); white-space: nowrap; height: 32px; }
  .as :global(.as-tab thead th) { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 600; background: var(--blatt-2); }
  .as :global(.as-tab td.zahl), .as :global(.as-tab th.zahl) { text-align: right; }
  .as :global(.as-tab tbody tr:last-child td) { border-bottom: 0; }
  .as :global(.as-endgueltig) { border-top: 1px solid var(--linie); padding-top: var(--a3); display: flex; flex-direction: column; gap: var(--a2); }
  .as :global(.as-frage) { padding: var(--a4); background: var(--blatt-2); border-inline-start: 4px solid var(--warn, var(--akzent)); border-radius: var(--r); max-width: 640px; display: flex; flex-direction: column; gap: var(--a3); }
  .as :global(.as-frage h4) { display: flex; gap: var(--a2); align-items: center; font: 650 var(--gr-text)/1.3 var(--schrift-ui); }
  .as :global(.as-frage pre) { margin: 0; padding: var(--a2) var(--a3); overflow: auto; background: var(--blatt); font: .85rem/1.5 var(--schrift-befehl); border-radius: var(--r-klein); }

  /* gefühlte Breite bis 760 px (lib/groesse.svelte.ts): die Regelzeilen werden zu Karten */
  :global(:where(:root.eng-760)) .as :global(.as-regeln > li) { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  :global(:where(:root.eng-760)) .as :global(.as-regeln > li > .as-nr) { display: none; }
  :global(:where(:root.eng-760)) .as :global(.as-regeln > li > .as-pfeil) { display: none; }
  :global(:where(:root.eng-760)) .as :global(.bed .as-regeln > li) { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  :global(:where(:root.eng-760)) .as :global(.bed .as-regeln > li > select:first-child) { grid-column: 1 / -1; }
  :global(:where(:root.eng-760)) .as :global(.as-liste) { grid-template-columns: minmax(0, 1fr); }
</style>
