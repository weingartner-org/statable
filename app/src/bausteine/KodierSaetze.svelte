<script lang="ts">
  /**
   * Kodier-Arbeitsplatz, Ansicht „Sätze“ (Stufe 6b, Fachblatt 3.2): Listbox mit Mehrfachauswahl, ein Tab-Stopp, `aria-activedescendant`, Optionen ohne `tabindex`.
   * Jede Option kennt `aria-setsize` und `aria-posinset`. Ab 300 Sätzen Teilanzeige: im DOM liegt nur ein Fenster von 200 Optionen um den Fokus; es wandert mit,
   * bevor `aria-activedescendant` auf eine Option außerhalb zeigen würde (`$effect.pre`). Pfeile, Bild auf/ab, Pos1 und Ende laufen über das ganze Dokument.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { codeBeschriftungen, memosAnStelle, stellenAusSaetzen, type Einheit } from '../lib/kodieren';
  import { absatzNr, type Stelle } from '../lib/kodieren.svelte';
  import type { Dokument, QualProjekt } from '../lib/qualprojekt';

  interface Props {
    dok: Dokument;
    q: QualProjekt;
    saetze: Einheit[];
    gewaehlt: Set<number>;
    fokusNr: number;
    nurIch: boolean;
    ich: string | undefined;
    zumCode: (stellen: Stelle[]) => void;
    ziffer: (n: number, stellen: Stelle[]) => void;
    /** Memo zu den gewählten Sätzen (Taste M, Knopf) */
    memo: (stellen: Stelle[]) => void;
    rueck: () => void;
  }
  let { dok, q, saetze, gewaehlt = $bindable(), fokusNr = $bindable(), nurIch, ich, zumCode, ziffer, memo, rueck }: Props = $props();

  let liste = $state<HTMLElement>();
  let anker = $state<number | null>(null);
  const n = $derived(saetze.length);
  const von = (): string => L('von', 'by');
  /** Teilanzeige ab 300 Sätzen: Fenster von 200 Sätzen um den Fokus */
  const TEIL_AB = 300, FENSTER = 200;
  const teil = $derived(n >= TEIL_AB);
  let fenster = $state(1);
  const zeigeVon = $derived(teil ? Math.max(1, Math.min(fenster, n - FENSTER + 1)) : 1);
  const sichtbar = $derived(teil ? saetze.slice(zeigeVon - 1, zeigeVon - 1 + FENSTER) : saetze);
  $effect.pre(() => {
    if (!teil) return;
    const z = Math.max(1, Math.min(n, fokusNr));
    if (z < zeigeVon || z >= zeigeVon + FENSTER) fenster = Math.max(1, Math.min(n - FENSTER + 1, z - Math.floor(FENSTER / 2)));
  });
  const codesJe = $derived(new Map(saetze.map(e => [e.nr, codeBeschriftungen(q, dok.id, e.start, e.ende, ich, nurIch, von())])));
  const memosJe = $derived(new Map(saetze.map(e => [e.nr, memosAnStelle(q, dok.id, e.start, e.ende)])));

  export function fokussiere() { liste?.focus(); }

  function gehe(nr: number, umschalt: boolean) {
    const z = Math.max(1, Math.min(n, nr));
    if (umschalt) {
      const a = anker ?? fokusNr; anker = a;
      const g = new Set<number>();
      for (let i = Math.min(a, z); i <= Math.max(a, z); i++) g.add(i);
      gewaehlt = g;
    } else anker = z;
    fokusNr = z;
    void tick().then(() => document.getElementById(`ko-s-${z}`)?.scrollIntoView({ block: 'nearest' }));
  }
  function umschalten(nr: number) {
    const g = new Set(gewaehlt);
    if (g.has(nr)) g.delete(nr); else g.add(nr);
    gewaehlt = g; anker = nr;
  }
  function springe(roh: string) {
    const z = Math.round(Number(roh));
    if (!Number.isFinite(z) || z < 1 || z > n) { sage(L(`Bitte eine Zahl von 1 bis ${n} eingeben.`, `Please enter a number from 1 to ${n}.`)); return; }
    gehe(z, false);
    liste?.focus();
    sage(L(`Satz ${z} von ${n}.`, `Sentence ${z} of ${n}.`));
  }
  const stellen = (): Stelle[] => stellenAusSaetzen(saetze, gewaehlt.size ? gewaehlt : [fokusNr]);
  function info() {
    const e = saetze[fokusNr - 1];
    if (!e) return;
    const c = codesJe.get(e.nr) ?? [];
    const m = memosJe.get(e.nr) ?? 0;
    const memo = m ? ' ' + Lp(m, '1 Memo.', `${m} Memos.`, '1 memo.', `${m} memos.`) : '';
    sage((c.length ? L(`Hier kodiert: ${c.join(', ')}.`, `Coded here: ${c.join(', ')}.`) : L('Hier ist nichts kodiert.', 'Nothing is coded here.')) + memo);
  }
  function hebeAuf() { gewaehlt = new Set(); anker = null; sage(L('Auswahl aufgehoben.', 'Selection cleared.')); }
  function taste(e: KeyboardEvent) {
    if (e.altKey) return;
    const k = e.key;
    if (e.ctrlKey || e.metaKey) {
      const l = k.toLowerCase();
      if (l === 'a') { e.preventDefault(); gewaehlt = new Set(saetze.map(x => x.nr)); sage(Lp(n, '1 Satz gewählt.', `${n} Sätze gewählt.`, '1 sentence selected.', `${n} sentences selected.`)); }
      else if (l === 'z') { e.preventDefault(); rueck(); }
      return;
    }
    const kl = k.toLowerCase();
    if (k === 'ArrowDown') { e.preventDefault(); gehe(fokusNr + 1, e.shiftKey); }
    else if (k === 'ArrowUp') { e.preventDefault(); gehe(fokusNr - 1, e.shiftKey); }
    else if (k === 'Home') { e.preventDefault(); gehe(1, e.shiftKey); }
    else if (k === 'End') { e.preventDefault(); gehe(n, e.shiftKey); }
    else if (k === 'PageDown') { e.preventDefault(); gehe(fokusNr + 10, e.shiftKey); }
    else if (k === 'PageUp') { e.preventDefault(); gehe(fokusNr - 10, e.shiftKey); }
    else if (k === ' ') { e.preventDefault(); umschalten(fokusNr); }
    else if (k === 'Enter' || (kl === 'k' && !e.shiftKey)) { e.preventDefault(); if (n) zumCode(stellen()); }
    else if (/^[1-9]$/.test(k) && !e.shiftKey) { e.preventDefault(); if (n) ziffer(Number(k), stellen()); }
    else if (k === 'Delete' || k === 'Escape') { e.preventDefault(); hebeAuf(); }
    else if (kl === 'i' && !e.shiftKey) { e.preventDefault(); info(); }
    else if (kl === 'm' && !e.shiftKey) { e.preventDefault(); if (n) memo(stellen()); }
  }
  const beschr = (e: Einheit): string => {
    const c = codesJe.get(e.nr) ?? [];
    const m = memosJe.get(e.nr) ?? 0;
    const memo = m ? ' ' + Lp(m, '1 Memo.', `${m} Memos.`, '1 memo.', `${m} memos.`) : '';
    const ab = absatzNr(dok.text, e.start);
    return L(`Satz ${e.nr} von ${n}, Absatz ${ab}. ${c.length ? 'Codes: ' + c.join(', ') + '.' : 'Keine Codes.'}${memo}`, `Sentence ${e.nr} of ${n}, paragraph ${ab}. ${c.length ? 'Codes: ' + c.join(', ') + '.' : 'No codes.'}${memo}`);
  };
  /** Vollständiger Name der Option: VoiceOver liest `aria-describedby` an Optionen nicht, `aria-label` immer */
  const label = (e: Einheit): string => `${e.text}${/[.!?…]\s*$/u.test(e.text) ? ' ' : '. '}${beschr(e)}`;
</script>

<p class="hilfe" id="ko-liste-kurz" data-nolink>{L('Pfeil auf und ab: Sätze lesen. Leertaste: Satz wählen oder abwählen. Umschalt+Pfeil: mehrere Sätze wählen. 1 bis 9: Code aus der Schnellleiste. Enter: Code geben. I: Codes am Satz, M: Memo, Entf: Auswahl aufheben. Lieber im Text markieren? Ansicht „Text“ oben.', 'Arrow up and down: read sentences. Space: select or deselect a sentence. Shift+arrow: select several sentences. 1 to 9: code from the quick bar. Enter: assign code. I: codes of the sentence, M: memo, Delete: clear selection. Prefer to mark in the text? View "Text" above.')}</p>
<div id="ko-liste" data-nolink class="ko-liste" role="listbox" aria-multiselectable="true" tabindex="0" aria-label={L(`Sätze in ${dok.name}`, `Sentences in ${dok.name}`)}
  aria-describedby="ko-liste-kurz" aria-activedescendant={n ? `ko-s-${fokusNr}` : undefined} bind:this={liste} onkeydown={taste}>
  {#each sichtbar as e (e.nr)}
    <!-- svelte-ignore a11y_interactive_supports_focus (Fokus läuft über aria-activedescendant der Liste) -->
    <div id="ko-s-{e.nr}" class="opt" class:fokus={e.nr === fokusNr} role="option" aria-selected={gewaehlt.has(e.nr) ? 'true' : 'false'}
      aria-label={label(e)} aria-setsize={n} aria-posinset={e.nr} onclick={() => { fokusNr = e.nr; umschalten(e.nr); liste?.focus(); }} onkeydown={() => {}}>
      <span class="nr" aria-hidden="true">{e.nr}</span><span class="satz" aria-hidden="true">{e.text}</span>
      {#if codesJe.get(e.nr)?.length}<span class="cn" aria-hidden="true">{codesJe.get(e.nr)!.join(', ')}</span>{/if}
    </div>
  {/each}
</div>
{#if teil}
  <div class="springen">
    <p class="hilfe" id="ko-s-teil" data-nolink>{L(`Langes Dokument: Die Liste zeigt jeweils 200 von ${n} Sätzen um den Fokus. Pfeiltasten, Bild auf und ab, Pos1 und Ende laufen durch das ganze Dokument.`, `Long document: the list shows 200 of ${n} sentences around the focus at a time. Arrow keys, Page up and down, Home and End run through the whole document.`)}</p>
    <label for="ko-s-gehe">{L('Zu Satz Nr.', 'Go to sentence no.')}</label>
    <input id="ko-s-gehe" type="number" min="1" max={n} inputmode="numeric" aria-describedby="ko-s-teil" onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); springe(e.currentTarget.value); } }}>
  </div>
{/if}
<div class="knopfzeile">
  <button class="k haupt" id="ko-l-code" type="button" onclick={() => { if (n) zumCode(stellen()); }}>{L('Code geben …', 'Assign code …')}</button>
  <button class="k" id="ko-l-info" type="button" onclick={info}>{L('Was ist hier kodiert?', 'What is coded here?')}</button>
  <button class="k leise" id="ko-l-aufheben" type="button" onclick={hebeAuf}>{L('Auswahl aufheben', 'Clear selection')}</button>
  <button class="k" id="ko-l-memo" type="button" onclick={() => { if (n) memo(stellen()); }}>{L('Memo schreiben …', 'Write memo …')}</button>
</div>

<style>
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .springen { display: flex; flex-wrap: wrap; align-items: center; gap: var(--a2); }
  .springen .hilfe { flex: 1 1 100%; }
  .ko-liste { max-height: 24rem; overflow: auto; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); }
  .ko-liste:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; }
  .opt { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: baseline; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); cursor: pointer; }
  .opt[aria-selected="true"] { background: var(--akzent-hell); box-shadow: inset 4px 0 0 var(--akzent); }
  .opt.fokus { outline: 3px solid var(--fokus); outline-offset: -3px; }
  .nr { min-width: 2.5ch; font-size: var(--gr-klein); color: var(--tinte-2); }
  .satz { flex: 1 1 14rem; }
  .cn { font-size: var(--gr-klein); font-weight: 600; color: var(--akzent-tinte); }
  @media (forced-colors: active) {
    .opt[aria-selected="true"] { outline: 3px solid Highlight; outline-offset: -3px; }
  }
</style>
