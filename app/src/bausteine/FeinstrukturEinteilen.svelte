<script lang="ts">
  /**
   * Feinstruktur-Arbeitsplatz, Phase Einteilen (F3B1): der ganze Ausschnitt ist sichtbar, die Person setzt die Grenzen der Sinneinheiten.
   * Zwei Ansichten desselben Zustands (Architekturblatt „Bedienkonzept“): Text (gesperrtes Textfeld) | Wörter (Wortliste, Vorgabe).
   * Statable schlägt keine Grenzen vor. Rückfragen sind Text mit zwei Knöpfen, kein modales Fenster. Ansagen nur über lib/ansage.
   */
  import { onMount, tick } from 'svelte';
  import { L, d, s } from '../lib/sitzung.svelte';
  import { leereAnsagen, sage, sageSpaeter, NACH_FOKUS_MS } from '../lib/ansage';
  import { aendereSequenzanalyse, qualProjekt } from '../lib/interviews.svelte';
  import type { Sequenzanalyse } from '../lib/qualprojekt';
  import { abweichungSatz, beginneDeuten, einheitHinweis, schalteGrenze } from '../lib/feinstruktur-analyse';
  import { woerter, grenzeAnWort, grenzenAus, ansageGrenze, ansageOrt, einheitText } from '../lib/feinstruktur';
  import FeinstrukturSpaltensatz from './FeinstrukturSpaltensatz.svelte';

  let { sa }: { sa: Sequenzanalyse } = $props();

  const SCHLUESSEL = 'statable-feinstruktur-ansicht';
  type Ansicht = 'text' | 'woerter';
  function leseAnsicht(): Ansicht { try { return localStorage.getItem(SCHLUESSEL) === 'text' ? 'text' : 'woerter'; } catch { return 'woerter'; } }
  let ansicht = $state<Ansicht>(leseAnsicht());
  function waehleAnsicht(a: Ansicht) { ansicht = a; try { localStorage.setItem(SCHLUESSEL, a); } catch { /* ohne Speicher: gilt für diese Sitzung */ } }

  const sprache = (): 'de' | 'en' => (s.einst.sprache === 'de' ? 'de' : 'en');
  const text = $derived(sa.ausschnitt.text);
  const einheiten = $derived(sa.einheiten);
  const n = $derived(einheiten.length);
  const ws = $derived(woerter(text));
  const dok = $derived(qualProjekt()?.dokumente.find(x => x.id === sa.dokument));
  const abweichung = $derived(abweichungSatz(sa, dok, sprache()));
  let fokusWort = $state(0);
  let feld: HTMLTextAreaElement | undefined = $state();
  let ueberschrift: HTMLHeadingElement | undefined = $state();
  let wortEl: (HTMLElement | undefined)[] = [];
  let frageFehlt = $state(false);
  let rueck = $state<{ g: number; gesetzt: boolean; einheiten: number[] } | null>(null);
  let rueckEl: HTMLElement | undefined = $state();

  onMount(() => { void tick().then(() => ueberschrift?.focus()); });

  const grenzeVor = (i: number) => i > 0 && grenzenAus(einheiten).includes(ws[i]!.von);
  const keinOrt = (pos: number) => pos <= (ws[0]?.von ?? 0)
    ? L('Vor dem ersten Wort ist keine Grenze möglich.', 'No boundary is possible before the first word.')
    : L('Am Ende des Textes ist keine Grenze möglich.', 'No boundary is possible at the end of the text.');

  const nr = (l: number[]) => l.map(i => i + 1).join(', ');
  const rueckText = (l: number[]): string => {
    const gedeutet = l.some(i => einheiten[i]?.gedeutet);
    return gedeutet
      ? L(`Sinneinheit ${nr(l)} ist schon gedeutet. Grenze trotzdem ändern? Die Deutungen bleiben erhalten.`, `Unit ${nr(l)} is already interpreted. Change the boundary anyway? The interpretations are kept.`)
      : L(`Sinneinheit ${nr(l)} hat schon Einträge. Grenze trotzdem ändern? Die Einträge bleiben erhalten.`, `Unit ${nr(l)} already has entries. Change the boundary anyway? The entries are kept.`);
  };
  function schalte(g: number | null, nachricht: string, bestaetigt = false) {
    if (g === null) { sage(nachricht); return; }
    const r = schalteGrenze(sa, g, Date.now(), bestaetigt);
    if (r.art === 'gesperrt') { sage(L('Hier ist keine Änderung möglich.', 'No change is possible here.')); return; }
    if (r.art === 'rueckfrage') {
      rueck = { g, gesetzt: r.gesetzt, einheiten: r.einheiten }; sage(rueckText(r.einheiten));
      void tick().then(() => rueckEl?.querySelector<HTMLElement>('button.nein')?.focus()); return;
    }
    rueck = null;
    aendereSequenzanalyse(sa.id, () => r.analyse, r.vermerk);
    sage(ansageGrenze(text, r.analyse.einheiten, g, r.gesetzt));
  }
  function bestaetige() { if (rueck) schalte(rueck.g, '', true); }
  function verwirf() { rueck = null; sage(L('Nicht geändert.', 'Not changed.')); void tick().then(() => (ansicht === 'woerter' ? wortEl[fokusWort] : feld)?.focus()); }

  /* ---- Ansicht Text ---- */
  $effect(() => { if (feld) feld.setSelectionRange(0, 0); });
  function schreibmarke(): number { return Array.from(text.slice(0, feld?.selectionStart ?? 0)).length; }
  function setzeAnMarke() { const p = schreibmarke(); schalte(grenzeAnWort(text, p), keinOrt(p)); }
  const blocke = (e: Event) => e.preventDefault();
  function taste1(e: KeyboardEvent) { if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); setzeAnMarke(); } }

  /* ---- Ansicht Wörter ---- */
  function geheZu(i: number) { fokusWort = Math.max(0, Math.min(ws.length - 1, i)); wortEl[fokusWort]?.focus(); }
  function setzeVorWort() { schalte(fokusWort === 0 ? null : ws[fokusWort]!.von, keinOrt(0)); }
  function taste2(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); geheZu(fokusWort + 1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); geheZu(fokusWort - 1); }
    else if (k === 'Home') { e.preventDefault(); geheZu(0); }
    else if (k === 'End') { e.preventDefault(); geheZu(ws.length - 1); }
    else if (k === 'Enter') { e.preventDefault(); setzeVorWort(); }
  }

  function frage(v: string) { frageFehlt = false; aendereSequenzanalyse(sa.id, x => ({ ...x, forschungsfrage: v, geaendert: Date.now() })); }
  function deuten() {
    if (!sa.forschungsfrage.trim()) {
      frageFehlt = true; sage(L('Bitte zuerst die Forschungsfrage eintragen.', 'Please enter the research question first.'), 'dringend');
      document.getElementById('fe-frage')?.focus(); return;
    }
    leereAnsagen();   // die letzte Ansage „Grenze nach …“ nennt ein Wort des Ausschnitts (Prüfplan B1)
    aendereSequenzanalyse(sa.id, x => beginneDeuten(x, Date.now()));
    sageSpaeter(L(`Phase Deuten. Sinneinheit ${sa.aktuelleEinheit + 1} von ${n}.`, `Interpreting phase. Unit ${sa.aktuelleEinheit + 1} of ${n}.`), NACH_FOKUS_MS);
  }
</script>

<div class="fe">
  <h2 id="fe-ein-h" tabindex="-1" bind:this={ueberschrift}>{L('Einteilen: Sinneinheiten setzen', 'Dividing: set units of meaning')} - {sa.name}</h2>
  {#if abweichung}<p class="warn" role="note">{abweichung}</p>{/if}
  <p class="hinweis">{d('Beim Einteilen siehst du den ganzen Ausschnitt. Lies ihn nicht inhaltlich, bevor du deutest.', 'Beim Einteilen sehen Sie den ganzen Ausschnitt. Lesen Sie ihn nicht inhaltlich, bevor Sie deuten.', 'While dividing you see the whole excerpt. Do not read it for its content before you interpret.')}</p>

  <label class="feldname" for="fe-frage">{L('Forschungsfrage (vor dem Deuten nötig)', 'Research question (needed before interpreting)')}</label>
  <textarea id="fe-frage" rows="2" value={sa.forschungsfrage} aria-invalid={frageFehlt ? 'true' : undefined} aria-describedby={frageFehlt ? 'fe-frage-fehler' : undefined} oninput={(e) => frage(e.currentTarget.value)}></textarea>
  {#if frageFehlt}<p id="fe-frage-fehler" class="fehler">{L('Bitte zuerst die Forschungsfrage eintragen.', 'Please enter the research question first.')}</p>{/if}

  <fieldset class="ansicht">
    <legend>{L('Ansicht beim Einteilen', 'View while dividing')}</legend>
    <label><input type="radio" name="fe-ansicht" value="text" checked={ansicht === 'text'} onchange={() => waehleAnsicht('text')} /> {L('Text', 'Text')}</label>
    <label><input type="radio" name="fe-ansicht" value="woerter" checked={ansicht === 'woerter'} onchange={() => waehleAnsicht('woerter')} /> {L('Wörter', 'Words')}</label>
  </fieldset>

  {#if ansicht === 'text'}
    <label for="fe-feld" class="feldname">{L('Ausschnitt, Grenzen mit Enter setzen', 'Excerpt, set boundaries with Enter')}</label>
    <p class="hilfe" id="fe-feld-kurz">{L('Pfeiltasten bewegen die Schreibmarke. Enter setzt oder löscht eine Grenze vor dem nächsten Wort.', 'Arrow keys move the cursor. Enter sets or deletes a boundary before the next word.')}</p>
    <textarea id="fe-feld" class="ausschnitt" rows="9" spellcheck="false" bind:this={feld} value={text} data-nolink
      aria-describedby="fe-feld-kurz" onkeydown={taste1} onbeforeinput={blocke} onpaste={blocke} ondrop={blocke} oncut={blocke}></textarea>
    <p><button type="button" class="k" onclick={setzeAnMarke}>{L('Grenze setzen oder löschen', 'Set or delete boundary')}</button></p>
    <div class="spiegel" aria-hidden="true" data-nolink>{#each einheiten as e, i (e.id)}{#if i > 0}<span class="strich">|</span>{/if}<span>{Array.from(text).slice(e.von, e.bis).join('')}</span>{/each}</div>
  {:else}
    <p class="hilfe" id="fe-liste-kurz">{L('Pfeiltasten wandern durch die Wörter. Enter setzt oder löscht eine Grenze vor dem Wort.', 'Arrow keys move through the words. Enter sets or deletes a boundary before the word.')}</p>
    <ul class="wortliste" role="listbox" aria-label={L('Wörter des Ausschnitts', 'Words of the excerpt')} aria-describedby="fe-liste-kurz" data-nolink onkeydown={taste2}>
      {#each ws as w, i (i)}
        <li role="option" aria-selected={i === fokusWort} tabindex={i === fokusWort ? 0 : -1} class:grenze={grenzeVor(i)} bind:this={wortEl[i]}
          {...{ 'aria-description': ansageOrt(text, einheiten, i) }} onfocus={() => { fokusWort = i; }} onclick={() => geheZu(i)}>{w.wort}</li>
      {/each}
    </ul>
    <!-- U1: Auf einer gesetzten Grenze heißt der Knopf, was er tut (F4-Befund 2: zwei Wege, die sich still aufheben) -->
    <p><button type="button" class="k" onclick={setzeVorWort}>{grenzeVor(fokusWort) ? L('Grenze vor diesem Wort entfernen', 'Remove the boundary before this word') : L('Neue Sinneinheit ab hier', 'New unit from here')}</button></p>
  {/if}

  {#if rueck}
    <div class="rueck" role="group" aria-label={L('Rückfrage zur Grenze', 'Question about the boundary')} bind:this={rueckEl}>
      <p id="fe-rueck-t">{rueckText(rueck.einheiten)}</p>
      <div class="zeile">
        <button type="button" class="k" aria-describedby="fe-rueck-t" onclick={bestaetige}>{L('Grenze ändern', 'Change boundary')}</button>
        <button type="button" class="k nein" aria-describedby="fe-rueck-t" onclick={verwirf}>{L('Nicht ändern', 'Do not change')}</button>
      </div>
    </div>
  {/if}

  <h3>{L(`Eingeteilte Sinneinheiten (${n})`, `Units so far (${n})`)}</h3>
  <ol class="einheiten" data-nolink>
    {#each einheiten as e, i (e.id)}
      {@const h = einheitHinweis(sa, i, sprache())}
      <li>{einheitText(text, e)}{#if h}<br /><span class="hinweis-klein">{h}</span>{/if}</li>
    {/each}
  </ol>
  <!-- A4: Spalten der Deutung und „Folgetext verdecken“ bleiben bis zum Deuten änderbar (ein Wechsel löscht nie etwas) -->
  <details class="einst">
    <summary>{L('Spalten der Deutung und Folgetext verdecken (Spaltensatz)', 'Columns of the interpretation and hiding the following text (column set)')}</summary>
    <FeinstrukturSpaltensatz {sa} />
  </details>
  <!-- U1 (F4-Befund 3): die Pflicht steht am Knopf, nicht erst nach dem Drücken -->
  {#if !sa.forschungsfrage.trim() && !frageFehlt}<p class="hinweis" id="fe-frage-vorher">{L('Vorher oben die Forschungsfrage eintragen.', 'Enter the research question above first.')}</p>{/if}
  <p><button type="button" class="k haupt" aria-describedby={!sa.forschungsfrage.trim() && !frageFehlt ? 'fe-frage-vorher' : undefined} onclick={deuten}>{L('Einteilung fertig, mit dem Deuten beginnen', 'Division done, start interpreting')}</button></p>
</div>

<style>
  .fe { display: flex; flex-direction: column; gap: .5rem; }
  h2 { margin: 0; font-size: 1.3rem; }
  .einst summary { cursor: pointer; }
  h3 { margin: .5rem 0 0; }
  h2[tabindex='-1']:focus { outline: none; }
  h2[tabindex='-1']:focus-visible { outline: var(--fokus-outline); outline-offset: 4px; }
  .hinweis, .hilfe, .hinweis-klein { color: var(--tinte-2); margin: .25rem 0; }
  .warn { background: var(--blatt-2); padding: .5rem; border-radius: var(--r-klein); }
  .fehler { color: var(--fehler, #b00020); margin: 0; }
  .feldname { font-weight: 600; margin-top: .5rem; }
  fieldset.ansicht { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); display: flex; gap: 1rem; flex-wrap: wrap; }
  textarea { width: 100%; box-sizing: border-box; font: inherit; line-height: 1.6; padding: .5rem; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt); color: var(--tinte); }
  textarea:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; }
  .spiegel { padding: .5rem; background: var(--blatt-2); border-radius: var(--r-klein); line-height: 1.7; }
  .strich { color: var(--akzent-tinte); font-weight: 700; margin: 0 .15em; }
  ul.wortliste { list-style: none; margin: .5rem 0; padding: .5rem; display: flex; flex-wrap: wrap; gap: .25rem .5rem; background: var(--blatt-2); border-radius: var(--r-klein); }
  ul.wortliste li { padding: .15rem .35rem; border-radius: var(--r-klein); cursor: pointer; border-inline-start: 3px solid transparent; }
  ul.wortliste li.grenze { border-inline-start-color: var(--akzent); margin-inline-start: .35rem; }
  ul.wortliste li:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; background: var(--akzent-hell); }
  ol.einheiten li { margin: .25rem 0; }
  .rueck { border: 1px solid var(--akzent); border-radius: var(--r-klein); padding: .5rem; }
  .zeile { display: flex; gap: .5rem; flex-wrap: wrap; }
</style>
