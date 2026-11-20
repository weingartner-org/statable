<script lang="ts">
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { aendere, aktuellerLeitfaden, benenneLeitfadenUm, entferneLeitfaden, iv, leitfaeden, legeLeitfadenAn, uebernimmHauptkategorien, vorhandeneHauptkategorien, waehleLeitfaden, type Schritt } from '../lib/interviews.svelte';
  import { bloeckeAlsCodes, type LeitfadenSprache } from '../lib/leitfaden';
  import { leitfadenDateiname, leitfadenMitnehmenWord, leitfadenWord } from '../lib/leitfadenexport';
  import Icon from './Icon.svelte';
  import Rechnet from './Rechnet.svelte';
  import LeitfadenSammeln from './LeitfadenSammeln.svelte';
  import LeitfadenPruefen from './LeitfadenPruefen.svelte';
  import LeitfadenSortieren from './LeitfadenSortieren.svelte';
  import LeitfadenSubsumieren from './LeitfadenSubsumieren.svelte';

  /**
   * Leitfaden-Assistent nach Helfferich (Paket 4D): mehrere Leitfäden je Projekt, vier Schritte (Sammeln, Prüfen, Sortieren, Subsumieren), Word-Export.
   * Die Schritte lassen sich in jeder Reihenfolge besuchen: Die Entwicklung eines Leitfadens verläuft in der Praxis nicht gerade.
   */
  const lf = $derived(aktuellerLeitfaden());
  const alle = $derived(leitfaeden());
  const schritte = $derived<{ n: Schritt; kurz: string; titel: string }[]>([
    { n: 1, kurz: L('Sammeln', 'Collect'), titel: L('Sammeln (Fragen frei zusammentragen, Brainstorming)', 'Collecting (gather questions freely, brainstorming)') },
    { n: 2, kurz: L('Prüfen', 'Check'), titel: L('Prüfen (Fragen auf Form und Eignung prüfen)', 'Checking (check questions for form and suitability)') },
    { n: 3, kurz: L('Sortieren', 'Sort'), titel: L('Sortieren (Fragen in Themenblöcke ordnen)', 'Sorting (arrange questions in thematic blocks)') },
    { n: 4, kurz: L('Subsumieren', 'Subsume'), titel: L('Subsumieren (je Block eine Erzählaufforderung formulieren)', 'Subsuming (write one narrative prompt per block)') }
  ]);
  let laedt = $state('');
  let gestrichenMit = $state(false);
  const sprachName = (sp: string) => (sp === 'de' ? L('Deutsch', 'German') : L('Englisch', 'English'));
  const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  async function gehe(n: Schritt) {
    iv.schritt = n;
    await tick();
    document.getElementById('lf-schritt-t')?.focus();
  }
  async function neu() {
    legeLeitfadenAn();
    await tick();
    document.getElementById('lf-titel')?.focus();
    sage(L('Neuer Leitfaden angelegt. Schritt 1 von 4: Sammeln.', 'New guide created. Step 1 of 4: Collecting.'));
  }
  function entfernen() {
    if (!lf) return;
    const x = lf;
    iv.rueckfrage = {
      titel: L('Ganzen Leitfaden entfernen?', 'Remove the whole guide?'),
      text: L(`„${x.titel}“ mit ${x.gesammelt.length} Fragen und ${x.bloecke.length} Blöcken wird entfernt. Das lässt sich nicht rückgängig machen. Laden Sie ihn vorher als Word-Datei herunter, wenn Sie ihn noch brauchen.`, `"${x.titel}" with ${x.gesammelt.length} questions and ${x.bloecke.length} blocks will be removed. This cannot be undone. Download it as a Word file first if you still need it.`),
      ja: L('Leitfaden entfernen', 'Remove guide'),
      tun: () => { entferneLeitfaden(x.id); sage(L('Leitfaden entfernt.', 'Guide removed.')); setTimeout(() => document.getElementById('lf-neu')?.focus(), 0); }
    };
  }
  async function alsWord(mitnehmen: boolean) {
    if (!lf) return;
    laedt = mitnehmen ? L('Leitfaden zum Mitnehmen', 'Guide to take along') : L('Leitfaden', 'Guide');
    try {
      const { herunterladen } = await import('../lib/export');
      const bytes = mitnehmen ? await leitfadenMitnehmenWord(lf) : await leitfadenWord(lf, { gestrichen: gestrichenMit });
      const name = leitfadenDateiname(lf, mitnehmen);
      herunterladen(bytes, name, WORD);
      sage(L(`Word-Datei „${name}“ gespeichert (Download).`, `Word file "${name}" saved (download).`));
    } finally { laedt = ''; }
  }
  function hauptkategorien() {
    if (!lf) return;
    if (!lf.bloecke.some(b => b.titel.trim())) { sage(L('Es gibt noch keine Blöcke mit Titel. Legen Sie sie in Schritt 3 an.', 'There are no blocks with a title yet. Create them in step 3.')); return; }
    const r = bloeckeAlsCodes(lf, vorhandeneHauptkategorien());
    uebernimmHauptkategorien(r.neu.map(n => n.name), r.uebersprungen);
    zumKodierleitfaden();
  }
  function zumKodierleitfaden() { const e = document.getElementById('iv-kodier-t'); e?.scrollIntoView({ block: 'start' }); e?.focus(); }
</script>

<div class="werkzeug" role="group" aria-label={L('Leitfäden', 'Guides')}>
  {#if alle.length > 1 && lf}
    <div class="eingabe">
      <label for="lf-wahl">{L('Leitfaden', 'Guide')}</label>
      <select id="lf-wahl" value={lf.id} onchange={(e) => waehleLeitfaden(e.currentTarget.value)}>{#each alle as x (x.id)}<option value={x.id}>{x.titel}</option>{/each}</select>
    </div>
  {/if}
  <button class="k" id="lf-neu" type="button" onclick={() => void neu()}><Icon n="plus" />{L('Neuer Leitfaden', 'New guide')}</button>
  {#if lf}<button class="k leise" type="button" onclick={entfernen}><Icon n="zu" />{L('Leitfaden entfernen', 'Remove guide')}</button>{/if}
</div>

{#if !lf}
  <p class="heft-text">{L('Noch kein Leitfaden. Ein Leitfaden hilft, ein Interview vorzubereiten: erst Fragen sammeln, dann prüfen, in Blöcke sortieren und je Block eine offene Erzählaufforderung formulieren.', 'No guide yet. A guide helps to prepare an interview: first collect questions, then check them, sort them into blocks and write one open narrative prompt per block.')}</p>
{:else}
  {#key lf.id}
    <div class="kopf-felder">
      <div class="eingabe"><label for="lf-titel">{L('Titel des Leitfadens', 'Title of the guide')}</label>
        <input type="text" id="lf-titel" value={lf.titel} onchange={(e) => { const t = e.currentTarget.value.trim(); if (t) benenneLeitfadenUm(lf.id, t); else e.currentTarget.value = lf.titel; }}></div>
      <div class="eingabe"><label for="lf-frage">{L('Forschungsfrage (freiwillig)', 'Research question (optional)')}</label>
        <input type="text" id="lf-frage" value={lf.forschungsfrage ?? ''} onchange={(e) => aendere(x => ({ ...x, forschungsfrage: e.currentTarget.value.trim() || undefined, geaendert: Date.now() }))}></div>
      <div class="eingabe"><label for="lf-sprache">{L('Sprache der Fragen (für die Hinweise)', 'Language of the questions (for the notes)')}</label>
        <select id="lf-sprache" value={lf.sprache} onchange={(e) => aendere(x => ({ ...x, sprache: e.currentTarget.value as LeitfadenSprache, geaendert: Date.now() }))}>{#each ['de', 'en'] as sp (sp)}<option value={sp}>{sprachName(sp)}</option>{/each}</select></div>
    </div>

    <nav class="schritte" aria-label={L('Schritte des Leitfadens', 'Steps of the guide')}>
      <ol>
        {#each schritte as st (st.n)}
          <li><button type="button" class="k" aria-current={iv.schritt === st.n ? 'step' : undefined} onclick={() => void gehe(st.n)}>{st.n}. {st.kurz}</button></li>
        {/each}
      </ol>
    </nav>

    <section class="schritt" aria-label={L(`Schritt ${iv.schritt}`, `Step ${iv.schritt}`)}>
      <h3 id="lf-schritt-t" tabindex="-1">{L(`Schritt ${iv.schritt} von 4: `, `Step ${iv.schritt} of 4: `)}{schritte[iv.schritt - 1]!.titel}</h3>
      {#if iv.schritt === 1}<LeitfadenSammeln {lf} />
      {:else if iv.schritt === 2}<LeitfadenPruefen {lf} />
      {:else if iv.schritt === 3}<LeitfadenSortieren {lf} />
      {:else}<LeitfadenSubsumieren {lf} />{/if}
      <div class="knopfzeile">
        {#if iv.schritt > 1}<button class="k leise" type="button" onclick={() => void gehe((iv.schritt - 1) as Schritt)}>{L('Zurück zu Schritt', 'Back to step')} {iv.schritt - 1}</button>{/if}
        {#if iv.schritt < 4}<button class="k haupt" type="button" onclick={() => void gehe((iv.schritt + 1) as Schritt)}>{L('Weiter zu Schritt', 'Continue to step')} {iv.schritt + 1}</button>{/if}
      </div>
    </section>

    <section class="weitergeben" aria-label={L('Leitfaden weitergeben', 'Pass on the guide')}>
      <h3 id="lf-ex-t" tabindex="-1">{L('Weitergeben (Word) und Hauptkategorien', 'Pass on (Word) and main categories')}</h3>
      <div class="knopfzeile">
        <button class="k" type="button" onclick={() => void alsWord(false)}><Icon n="download" />{L('Leitfaden als Word', 'Guide as Word')}</button>
        <button class="k" type="button" onclick={() => void alsWord(true)}><Icon n="download" />{L('Leitfaden zum Mitnehmen (große Schrift)', 'Guide to take along (large print)')}</button>
        <label class="schalter"><input type="checkbox" bind:checked={gestrichenMit}>{L('Gestrichene Fragen mit Grund anhängen', 'Append deleted questions with reason')}</label>
      </div>
      {#if laedt}<p class="heft-text"><Rechnet text={L(`„${laedt}“ wird gebaut …`, `Building "${laedt}" …`)} /></p>{/if}
      <div class="knopfzeile">
        <button class="k" type="button" onclick={hauptkategorien}>{L('Blöcke als Hauptkategorien übernehmen', 'Take over blocks as main categories')}</button>
        <button class="k leise" type="button" onclick={zumKodierleitfaden}>{L('Zum Kodierleitfaden', 'To the coding guide')}</button>
      </div>
      {#if iv.hauptkategorien.length}<p class="hilfe">{L('Übernommene Hauptkategorien:', 'Main categories taken over:')} {iv.hauptkategorien.join(', ')}</p>{/if}
      <p class="hilfe">{L('Eine Hauptkategorie ist ein Oberbegriff, unter dem Sie später Textstellen kodieren (qualitative Inhaltsanalyse).', 'A main category is a heading under which you later code text passages (qualitative content analysis).')}</p>
    </section>
  {/key}
{/if}

<style>
  .werkzeug { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: flex-end; }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); }
  .kopf-felder { display: flex; flex-wrap: wrap; gap: var(--a3); }
  .kopf-felder .eingabe { flex: 1 1 14rem; }
  .schritte ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--a1); }
  .schritte .k[aria-current='step'] { background: var(--akzent); border-color: var(--akzent); color: var(--tinte-auf-akzent); }
  .schritt, .weitergeben { display: flex; flex-direction: column; gap: var(--a3); border-top: 1px solid var(--linie); padding-top: var(--a3); }
  .schritt h3, .weitergeben h3 { margin: 0; font: 650 var(--gr-h2)/1.25 var(--schrift-ui); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: center; }
  .schalter { display: flex; gap: var(--a2); align-items: center; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
</style>
