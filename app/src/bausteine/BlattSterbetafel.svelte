<script lang="ts">
  import { L, d } from '../lib/sitzung.svelte';
  import type { Kaplan } from '../lib/ueberleben';
  import { sterbetafelHinweise, ZEITEINHEITEN, zeiteinheitWort, zeiteinheitId } from '../lib/sterbetafelsaetze';
  import DiagrammExport from './DiagrammExport.svelte';
  import Sterbetafeldiagramm from './Sterbetafeldiagramm.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import Icon from './Icon.svelte';
  import { komma } from '../lib/ergebnis';

  /**
   * Die Sterbetafel am Blatt der Karte Kaplan-Meier (Später S-F, Teil 1): statt der Kaplan-Meier-Kurve zwei Bilder (kumulierter Anteil, Ausfallrate), die Wahl der Intervalle
   * (Breite, Ende, Zeiteinheit - eine Änderung rechnet sofort neu, die Tafel ändert sich mit der Breite) und die Hinweise. Die Tabellen und Sätze stehen wie bei jedem Blatt in der Ausgabe.
   * `neu` schreibt die Wahl ins Blatt und rechnet die Tafel (JavaScript); es gibt den Satz zurück, wenn es nicht ging.
   */
  let { e, name, neu }: { e: Kaplan; name: (n: string) => string; neu: (o: { breite: string; ende: string; einheit: string }) => string | null } = $props();
  const st = $derived(e.sterbe!);
  let breite = $state(''), ende = $state(''), einheit = $state(''), fehler = $state('');
  let zuletzt = '';
  $effect(() => { const k = `${st.breite}|${st.ende}|${st.einheit}`; if (k !== zuletzt) { zuletzt = k; breite = String(st.breite).replace('.', ','); ende = String(st.ende).replace('.', ','); einheit = st.einheit; } });
  const hinweise = $derived(sterbetafelHinweise(st));
  const id = $props.id();
  function uebernehmen() { fehler = neu({ breite, ende, einheit }) ?? ''; }
  function vorgabe() { fehler = neu({ breite: '', ende: '', einheit }) ?? ''; }
  const zeitName = $derived(name(e.zeit));
</script>

{#if fehler}<p class="st-alt-hinweis" role="status"><Icon n="hinweis" k="hw" /><span><b>{L('Stand der vorigen Intervalle.', 'Result of the previous intervals.')}</b> {L(`Die Bilder, Sätze und Tabellen zeigen noch die Tafel mit der Breite ${komma(st.breite, Number.isInteger(st.breite) ? 0 : 2)}, nicht die zuletzt eingegebene Wahl.`, `The charts, sentences and tables still show the table with width ${komma(st.breite, Number.isInteger(st.breite) ? 0 : 2)}, not the choice entered last.`)}</span></p>{/if}
<div class:st-alt={!!fehler}>
<DiagrammExport titel={`${L('Sterbetafel', 'Life table')}: ${L('kumulierter Anteil', 'cumulative proportion')}`}><Sterbetafeldiagramm e={st} art="anteil" {zeitName} /></DiagrammExport>
<DiagrammExport titel={`${L('Sterbetafel', 'Life table')}: ${L('Ausfallrate (Hazard)', 'hazard rate')}`}><Sterbetafeldiagramm e={st} art="hazard" {zeitName} /></DiagrammExport>
</div>
<p class="hilfe" style="margin-top:var(--a2)">{L('„Ausfallrate (Hazard)“ ist die Ereignisrate im Intervall: wie viele von denen, die zu Beginn des Intervalls noch dabei sind, haben das Ereignis, bezogen auf die Länge des Intervalls.', '"Hazard rate" is the event rate within the interval: how many of those still in at the start of the interval have the event, relative to the length of the interval.')}</p>

<form class="korr-wahl st-wahl" onsubmit={(ev) => { ev.preventDefault(); uebernehmen(); }} aria-labelledby="{id}-t">
  <h3 id="{id}-t" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Intervalle der Sterbetafel', 'Intervals of the life table')}</h3>
  <div class="st-felder">
    <div class="eingabe"><label for="{id}-b">{L('Breite eines Intervalls', 'Width of an interval')}</label><input id="{id}-b" type="text" inputmode="decimal" autocomplete="off" bind:value={breite}></div>
    <div class="eingabe"><label for="{id}-e">{L('Ende der Intervalle (Anfang des offenen letzten)', 'End of the intervals (start of the open last one)')}</label><input id="{id}-e" type="text" inputmode="decimal" autocomplete="off" bind:value={ende}></div>
    <div class="eingabe"><label for="{id}-u">{L('Zeiteinheit', 'Time unit')}</label><select id="{id}-u" bind:value={einheit} aria-describedby="{id}-uh"><option value="" selected={einheit === ''}>{L('keine Angabe', 'not specified')}</option>{#each ZEITEINHEITEN as u (u)}<option value={u} selected={einheit === u}>{zeiteinheitWort(u)}</option>{/each}{#if einheit && !zeiteinheitId(einheit)}<option value={einheit} selected>{einheit}</option>{/if}</select></div>
  </div>
  <p class="hilfe" id="{id}-uh">{d('Statable kennt die Einheit deiner Zeitspalte nicht. Die Wahl steht in den Sätzen und Tabellen, gerechnet wird nicht anders.', 'Statable kennt die Einheit Ihrer Zeitspalte nicht. Die Wahl steht in den Sätzen und Tabellen, gerechnet wird nicht anders.', 'Statable does not know the unit of your time column. The choice appears in the sentences and tables; the calculation does not change.')}</p>
  <div class="knopfzeile"><button class="k" type="submit"><Icon n="rechnen" />{L('Neu rechnen', 'Recalculate')}</button><button class="k leise" type="button" onclick={vorgabe}><Icon n="rueck" />{L('Wie vorgeschlagen', 'As suggested')}</button></div>
  {#if fehler}<p class="hilfe" role="status" style="color:var(--verlust)">{fehler}</p>{/if}
  <p class="hilfe">{L('Die Wahl der Intervalle ändert das Ergebnis. Die Kaplan-Meier-Kurve bleibt davon unberührt; ihre Zahlen stehen in den Tabellen.', 'The choice of intervals changes the result. The Kaplan-Meier curve is not affected; its numbers are in the tables.')}</p>
</form>

<ul class="st-hinweise" aria-label={L('Hinweise zur Sterbetafel', 'Notes on the life table')}>
  {#each hinweise as h}<li><Icon n={h.art === 'hinweis' ? 'hinweis' : 'info'} k="hw" /><span><b>{h.text}</b>{#if h.klein}<small>{h.klein}</small>{/if}</span></li>{/each}
</ul>
<p class="hilfe"><HilfeLink id="sterbetafel" text={L('Hilfe: Sterbetafel lesen', 'Help: reading a life table')} /></p>

<style>
  .st-alt { opacity: .45; }
  .st-alt-hinweis { display: flex; gap: var(--a2); align-items: flex-start; margin: var(--a3) 0 var(--a2); color: var(--verlust); max-width: var(--breite-text); }
  .st-alt-hinweis :global(.ico) { flex: none; margin-top: 3px; }
  .st-wahl { margin-top: var(--a3); }
  .st-felder { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); gap: var(--a3); max-width: 760px; }
  .st-hinweise { list-style: none; padding: 0; margin: var(--a3) 0 0; display: flex; flex-direction: column; gap: var(--a2); max-width: var(--breite-text); }
  .st-hinweise li { display: flex; gap: var(--a2); align-items: flex-start; }
  .st-hinweise :global(.ico) { flex: none; margin-top: 3px; }
  .st-hinweise span { display: flex; flex-direction: column; }
  .st-hinweise small { color: var(--tinte-2); font-size: var(--gr-klein); }
</style>
