<script lang="ts">
  /**
   * Eingabefeld für Befehle mit Farben: Das echte Textfeld liegt durchsichtig über einer gefärbten Schicht (aria-hidden).
   * Vorleseprogramme und Tastatur sehen nur das normale Textfeld. Kein Zeilenumbruch, damit Schicht und Feld Zeichen für Zeichen übereinander liegen.
   */
  import { faerbe } from '../lib/faerbung';
  import { zeilenStand, zeilenSatz } from '../lib/zeilenstand';
  let { value = $bindable(''), feld = $bindable(), id, placeholder, onkeydown }: {
    value?: string; feld?: HTMLTextAreaElement; id: string; placeholder?: string; onkeydown?: (e: KeyboardEvent) => void;
  } = $props();
  let schicht = $state<HTMLPreElement>();
  let marke = $state(0);
  const merke = () => { marke = feld?.selectionStart ?? 0; };
  const stuecke = $derived(faerbe(value));
  function folge() { if (schicht && feld) { schicht.scrollTop = feld.scrollTop; schicht.scrollLeft = feld.scrollLeft; } }
  $effect(() => { void value; queueMicrotask(folge); });
</script>

<div class="syntaxfeld">
  <pre class="schicht" dir="ltr" aria-hidden="true" bind:this={schicht}>{#each stuecke as x}{#if x.art}<span class={x.art}>{x.t}</span>{:else}{x.t}{/if}{/each}{'\n'}</pre>
  <textarea dir="ltr" {id} bind:this={feld} bind:value wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off" {placeholder} {onkeydown} onscroll={folge} data-zeilenstand onkeyup={merke} onclick={merke} onfocus={merke} oninput={merke} onselect={merke}></textarea>
</div>
<!-- Anzeige für Sehende; Vorleseprogramme erfahren die Stelle mit Alt+W (kuerzel.ts), nicht bei jedem Tastendruck -->
<span class="zeilenstand" aria-hidden="true">{zeilenSatz(zeilenStand(value, marke))}</span>

<style>
  .syntaxfeld { position: relative; }
  .syntaxfeld textarea, .schicht { font: 400 var(--gr-text)/1.6 var(--schrift-befehl); padding: var(--a2) var(--a3); border: 1px solid transparent; border-radius: var(--r-klein); tab-size: 4; white-space: pre; letter-spacing: 0; margin: 0; }
  .schicht { position: absolute; inset: 0; overflow: hidden; background: var(--blatt); color: var(--tinte); padding-bottom: calc(var(--a2) + 24px); padding-inline-end: calc(var(--a3) + 24px); pointer-events: none; }
  .syntaxfeld textarea { position: relative; display: block; width: 100%; min-height: 220px; resize: vertical; overflow: auto; background: transparent; color: transparent; caret-color: var(--tinte); border-color: var(--linie-stark); }
  .syntaxfeld textarea::placeholder { color: var(--tinte-2); }
  .syntaxfeld textarea::selection { background: color-mix(in srgb, var(--fokus) 30%, transparent); }
  .syntaxfeld textarea:focus-visible { border-color: var(--fokus); }
  .zeilenstand { display: block; margin-top: var(--a1); font-size: var(--gr-klein); color: var(--tinte-2); font-variant-numeric: tabular-nums; }
  .befehl { color: var(--akzent-tinte); }
  .unter { color: var(--fokus); }
  .text { color: var(--hinweis); }
  .kommentar, .daten { color: var(--tinte-2); }
</style>
