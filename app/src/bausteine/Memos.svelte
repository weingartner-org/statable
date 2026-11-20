<script lang="ts">
  /**
   * Memos (Stufe 6b2, Fachblatt 3.6): Liste der Memos zur aktuellen Auswahl (Stelle, Dokument, Code, Fall, Projekt), neues Memo, Bearbeiten an Ort und Stelle,
   * Löschen mit Rückfragezeile (ohne Dialog). Alle Änderungen über `aendere()` (Rückgängig). Ansagen nur über `sage()`. Memos sind reiner Text.
   * Taste M in Text und Satzliste ruft `neuFuerStellen` auf: Fokus ins Textfeld, nach dem Speichern zurück in die Ansicht (`zurueck`).
   */
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { NACH_FOKUS_MS, sage, sageSpaeter } from '../lib/ansage';
  import { aendereMemo, entferneMemo, legeMemoAn, memosZu, segmentFuer } from '../lib/kodieren';
  import { aendere, kuerzen, sicherIch, type Stelle } from '../lib/kodieren.svelte';
  import type { Memo, MemoArt, QualProjekt } from '../lib/qualprojekt';

  type Bezug = Memo['bezug'][number];
  interface Props {
    q: QualProjekt;
    dokId: string;
    /** Fall des offenen Dokuments (falls zugeordnet) */
    fallId: string | undefined;
    /** der aktive Code im Codebaum */
    codeId: string;
    /** die gerade markierte bzw. gewählte Stelle (leer = nichts) und ihr Name („Satz 3“) */
    stellen: Stelle[];
    stelleName: string;
    /** zurück in die Ansicht (nach Speichern, wenn das Memo über M kam) */
    zurueck: () => void;
    /** reflexives Tagebuch sichtbar (Arbeitsweise oder Strg+K; Stufe A3) */
    tagebuch?: boolean;
    /** Memo-Arten der Grounded Theory sichtbar (Stufe A3) */
    gt?: boolean;
  }
  let { q, dokId, fallId, codeId, stellen, stelleName, zurueck, tagebuch = false, gt = false }: Props = $props();

  /* ---- Art des Memos (Stufe A3) ---- */
  /** Name jeder Art mit Fachbegriff in Klammern (für Auswahl und Filter) */
  const artName = (a: MemoArt): string => {
    switch (a) {
      case 'tagebuch': return L('Reflexives Tagebuch (eigene Rolle, Vorannahmen, Entscheidungen)', 'Reflexive journal (own role, assumptions, decisions)');
      case 'gt-code': return L('Code-Memo (Grounded Theory)', 'Code memo (grounded theory)');
      case 'gt-theoretisch': return L('Theoretisches Memo (Grounded Theory)', 'Theoretical memo (grounded theory)');
      case 'gt-methodisch': return L('Methodenmemo (Grounded Theory)', 'Methodological memo (grounded theory)');
      case 'gt-auswahl': return L('Theoretische Auswahl (theoretical sampling): welche Fälle als Nächstes und warum', 'Theoretical sampling: which cases next and why');
      case 'saettigung': return L('Sättigungs-Memo (theoretische Sättigung)', 'Saturation memo (theoretical saturation)');
      case 'ipa-beschreibend': return L('Randnotiz beschreibend (IPA)', 'Exploratory note, descriptive (IPA)');
      case 'ipa-sprachlich': return L('Randnotiz sprachlich (IPA)', 'Exploratory note, linguistic (IPA)');
      case 'ipa-begrifflich': return L('Randnotiz begrifflich (IPA)', 'Exploratory note, conceptual (IPA)');
      case 'vergleich': return L('Vergleich zweier Stellen (ständiger Vergleich)', 'Comparison of two passages (constant comparison)');
      case 'feldnotiz-empirisch': return L('Feldnotiz empirisch', 'Field note, empirical');
      case 'feldnotiz-methodisch': return L('Feldnotiz methodisch', 'Field note, methodological');
      case 'feldnotiz-theoretisch': return L('Feldnotiz theoretisch', 'Field note, theoretical');
      default: return L('Memo', 'Memo');
    }
  };
  /** Art am Memo als Wort in der Liste (kürzer als in der Auswahl) */
  const artWort = (a: MemoArt | undefined): string => {
    switch (a) {
      case 'tagebuch': return L('Tagebuch', 'Journal');
      case 'gt-code': return L('Code-Memo', 'Code memo');
      case 'gt-theoretisch': return L('Theoretisches Memo', 'Theoretical memo');
      case 'gt-methodisch': return L('Methodenmemo', 'Methodological memo');
      case 'gt-auswahl': return L('Theoretische Auswahl', 'Theoretical sampling');
      case 'saettigung': return L('Sättigungs-Memo', 'Saturation memo');
      case 'ipa-beschreibend': return L('Randnotiz beschreibend', 'Note, descriptive');
      case 'ipa-sprachlich': return L('Randnotiz sprachlich', 'Note, linguistic');
      case 'ipa-begrifflich': return L('Randnotiz begrifflich', 'Note, conceptual');
      case 'vergleich': return L('Vergleich', 'Comparison');
      case 'feldnotiz-empirisch': return L('Feldnotiz empirisch', 'Field note, empirical');
      case 'feldnotiz-methodisch': return L('Feldnotiz methodisch', 'Field note, methodological');
      case 'feldnotiz-theoretisch': return L('Feldnotiz theoretisch', 'Field note, theoretical');
      default: return L('Memo', 'Memo');
    }
  };
  const GT_ARTEN: MemoArt[] = ['gt-code', 'gt-theoretisch', 'gt-methodisch', 'gt-auswahl', 'saettigung'];
  let art = $state<MemoArt>('memo');
  /** Arten, die im Projekt schon vorkommen (ein einfaches Memo zählt als „memo“) */
  const vorhandeneArten = $derived([...new Set(q.memos.map(m => m.art ?? 'memo'))] as MemoArt[]);
  const artOptionen = $derived.by(() => {
    const o: MemoArt[] = ['memo'];
    if (tagebuch) o.push('tagebuch');
    if (gt) o.push(...GT_ARTEN);
    if (!o.includes(art)) o.push(art);   // z. B. über Strg+K gesetzt
    return o;
  });
  const zeigeArtAuswahl = $derived(artOptionen.length > 1);
  /** Art als Wort am Memo zeigen: nur wenn die Arten im Spiel sind (sonst bleibt die Liste wie bisher) */
  const zeigeArtWort = $derived(tagebuch || gt || vorhandeneArten.some(a => a !== 'memo'));
  let artFilter = $state<'alle' | MemoArt>('alle');
  $effect(() => { if (artFilter !== 'alle' && !vorhandeneArten.includes(artFilter)) artFilter = 'alle'; });

  /** Vorgabe für „Wozu?“ je Art: Tagebuch und Projekt-Memos zum Projekt, Code-Memo zum aktiven Code */
  function vorgabeWozu(a: MemoArt) {
    if (a === 'tagebuch' || a === 'gt-theoretisch' || a === 'gt-methodisch' || a === 'gt-auswahl' || a === 'saettigung') { fix = null; wozu = 'projekt'; }
    else if (a === 'gt-code' && codeId) { fix = null; wozu = 'code'; }
  }
  /** Neues Memo einer Art anlegen (Strg+K „Tagebuch-Eintrag“ oder Knopf): Art und Bezug setzen, Fokus ins Textfeld, Ansage */
  export async function neuFuerArt(a: MemoArt) {
    art = a; fehler = '';
    vorgabeWozu(a);
    await tick(); await tick();
    document.getElementById('ko-memo-text')?.focus();
    sageSpaeter(L(`Neuer Eintrag: ${artName(a)}. Bitte den Text schreiben.`, `New entry: ${artName(a)}. Please write the text.`), NACH_FOKUS_MS);
  }

  type Wozu = 'stelle' | 'dokument' | 'code' | 'fall' | 'projekt';
  let wozu = $state<Wozu>('dokument');
  let titel = $state('');
  let text = $state('');
  let fehler = $state('');
  /** fest gemerkte Stelle (aus M oder aus einem Beleg) */
  let fix = $state<{ stellen?: Stelle[]; segId?: string; name: string; ausAnsicht: boolean } | null>(null);

  const stellenAktuell = $derived(fix?.stellen ?? stellen);
  const stelleOk = $derived(!!fix || stellen.length > 0);
  const codeName = $derived(q.codes.find(c => c.id === codeId)?.name ?? '');
  const fallName = $derived(fallId ? q.faelle.find(f => f.id === fallId)?.name ?? '' : '');
  const dokName = $derived(q.dokumente.find(d => d.id === dokId)?.name ?? '');
  const ziel = $derived.by(() => {
    if (wozu === 'stelle') return fix?.name ?? stelleName;
    if (wozu === 'dokument') return L(`Dokument „${dokName}“`, `Document "${dokName}"`);
    if (wozu === 'code') return L(`Code „${codeName}“`, `Code "${codeName}"`);
    if (wozu === 'fall') return L(`Fall „${fallName}“`, `Case "${fallName}"`);
    return L('Projekt', 'Project');
  });

  /* Die Wahl „Wozu?“ bleibt gültig: fällt die Stelle weg (nichts markiert), geht es auf das Dokument zurück */
  $effect(() => {
    if (wozu === 'stelle' && !stelleOk) wozu = 'dokument';
    else if (wozu === 'code' && !codeId) wozu = 'dokument';
    else if (wozu === 'fall' && !fallId) wozu = 'dokument';
  });

  export async function neuFuerStellen(st: Stelle[], name: string, ausAnsicht: boolean) {
    fix = { stellen: st, name, ausAnsicht }; wozu = 'stelle'; fehler = '';
    await tick(); await tick();
    document.getElementById('ko-memo-text')?.focus();
  }
  export async function neuFuerSegment(segId: string, name: string) {
    fix = { segId, name, ausAnsicht: false }; wozu = 'stelle'; fehler = '';
    await tick(); await tick();
    document.getElementById('ko-memo-text')?.focus();
  }

  function speichere() {
    const t = text.trim();
    if (!t) {
      fehler = L('Bitte zuerst den Text des Memos schreiben.', 'Please write the text of the memo first.');
      sage(fehler, 'dringend');
      document.getElementById('ko-memo-text')?.focus();
      return;
    }
    fehler = '';
    const was = wozu, st = stellenAktuell, f = fix, ti = titel, name = ziel, artGewaehlt = art;
    aendere(L(`Memo zu ${name} wieder entfernt`, `Memo for ${name} removed again`), q0 => {
      let neu = sicherIch(q0);
      const wer = neu.ich!;
      const bezuege: Bezug[] = [];
      if (was === 'stelle') {
        if (f?.segId) bezuege.push({ art: 'segment', id: f.segId });
        else for (const s of st) { const r = segmentFuer(neu, dokId, s.start, s.ende, wer); neu = r.q; bezuege.push({ art: 'segment', id: r.id }); }
      } else if (was === 'dokument') bezuege.push({ art: 'dokument', id: dokId });
      else if (was === 'code') bezuege.push({ art: 'code', id: codeId });
      else if (was === 'fall' && fallId) bezuege.push({ art: 'fall', id: fallId });
      else bezuege.push({ art: 'projekt' });
      if (!bezuege.length) return q0;
      const r = legeMemoAn(neu, bezuege[0]!, t, ti, wer, artGewaehlt);
      neu = r.q;
      if (bezuege.length > 1) neu = { ...neu, memos: neu.memos.map(m => (m.id === r.id ? { ...m, bezug: bezuege } : m)) };
      return neu;
    });
    const aus = f?.ausAnsicht ?? false;
    fix = null; text = ''; titel = ''; art = 'memo';
    if (aus) zurueck();
    sageSpaeter(artGewaehlt === 'memo' ? L(`Memo gespeichert: ${name}.`, `Memo saved: ${name}.`) : L(`${artWort(artGewaehlt)} gespeichert: ${name}.`, `${artWort(artGewaehlt)} saved: ${name}.`), NACH_FOKUS_MS);
  }

  /* ---- Liste ---- */
  const segmenteAnStelle = $derived.by(() => {
    const ids = new Set<string>();
    for (const s of q.segmente) {
      if (s.dokument !== dokId) continue;
      for (const st of stellen) if (s.start < st.ende && s.ende > st.start) ids.add(s.id);
    }
    return ids;
  });
  const gruppen = $derived.by(() => {
    const g: { key: string; titel: string; memos: Memo[] }[] = [];
    const passt = (m: Memo): boolean => artFilter === 'alle' || (m.art ?? 'memo') === artFilter;
    const ms = q.memos.filter(m => passt(m) && m.bezug.some(b => b.art === 'segment' && b.id !== undefined && segmenteAnStelle.has(b.id)));
    if (ms.length) g.push({ key: 'stelle', titel: L('Zu dieser Stelle', 'About this passage'), memos: ms });
    const d = memosZu(q, 'dokument', dokId).filter(passt);
    if (d.length) g.push({ key: 'dokument', titel: L('Zu diesem Dokument', 'About this document'), memos: d });
    const c = (codeId ? memosZu(q, 'code', codeId) : []).filter(passt);
    if (c.length) g.push({ key: 'code', titel: L('Zu diesem Code', 'About this code'), memos: c });
    const f = (fallId ? memosZu(q, 'fall', fallId) : []).filter(passt);
    if (f.length) g.push({ key: 'fall', titel: L('Zu diesem Fall', 'About this case'), memos: f });
    const p = memosZu(q, 'projekt').filter(passt);
    if (p.length) g.push({ key: 'projekt', titel: L('Zum Projekt', 'About the project'), memos: p });
    return g;
  });
  const memoName = (m: Memo): string => m.titel ?? kuerzen(m.text.replace(/\s+/g, ' '), 40);
  const von = (m: Memo): string => (m.kodierende ? q.kodierende.find(k => k.id === m.kodierende)?.name ?? '' : '');

  let bearb = $state<string | null>(null);
  let bTitel = $state('');
  let bText = $state('');
  let loeschKey = $state<string | null>(null);

  async function bearbeite(key: string, m: Memo) {
    loeschKey = null; bearb = key; bTitel = m.titel ?? ''; bText = m.text;
    await tick(); await tick();
    document.getElementById(`ko-m-t-${key}`)?.focus();
  }
  async function bearbSpeichern(key: string, m: Memo) {
    if (!bText.trim()) { sage(L('Der Text darf nicht leer sein.', 'The text must not be empty.'), 'dringend'); document.getElementById(`ko-m-x-${key}`)?.focus(); return; }
    aendere(L(`Änderung am Memo „${memoName(m)}“ zurückgenommen`, `Change to memo "${memoName(m)}" undone`), q0 => aendereMemo(q0, m.id, { text: bText, titel: bTitel }));
    bearb = null;
    await tick();
    document.getElementById(`ko-m-b-${key}`)?.focus();
    sage(L('Memo gespeichert.', 'Memo saved.'));
  }
  async function bearbAbbruch(key: string) {
    bearb = null;
    await tick();
    document.getElementById(`ko-m-b-${key}`)?.focus();
  }
  async function frageLoeschen(key: string) {
    bearb = null; loeschKey = key;
    await tick(); await tick();
    document.getElementById(`ko-m-behalten-${key}`)?.focus();
  }
  async function loesche(key: string, m: Memo) {
    aendere(L(`Löschen des Memos „${memoName(m)}“ zurückgenommen`, `Deleting the memo "${memoName(m)}" undone`), q0 => entferneMemo(q0, m.id));
    loeschKey = null;
    await tick();
    (document.querySelector<HTMLElement>('#ko-memo-liste button') ?? document.getElementById('ko-memo-wozu'))?.focus();
    sage(L(`Memo „${memoName(m)}“ gelöscht.`, `Memo "${memoName(m)}" deleted.`));
  }
  async function behalten(key: string) {
    loeschKey = null;
    await tick();
    document.getElementById(`ko-m-b-${key}`)?.focus();
  }
  const loeschTaste = (e: KeyboardEvent, key: string) => { if (e.key === 'Escape') { e.preventDefault(); void behalten(key); } };
</script>

{#if tagebuch}
  <div class="knopfzeile"><button class="k" id="ko-memo-tagebuch" type="button" onclick={() => void neuFuerArt('tagebuch')}>{L('Tagebuch-Eintrag schreiben', 'Write a journal entry')}</button></div>
{/if}
{#if vorhandeneArten.length > 1}
  <div class="feld">
    <label for="ko-memo-filter">{L('Memos nach Art zeigen', 'Show memos by kind')}</label>
    <select id="ko-memo-filter" bind:value={artFilter}>
      <option value="alle">{L('Alle Arten', 'All kinds')}</option>
      {#each vorhandeneArten as a (a)}<option value={a}>{artWort(a)}</option>{/each}
    </select>
  </div>
{/if}
<div id="ko-memo-liste" class="liste">
  {#each gruppen as g (g.key)}
    <h3>{g.titel}</h3>
    <ul class="memos">
      {#each g.memos as m (m.id)}
        {@const key = g.key + '-' + m.id}
        <li data-nolink>
          {#if bearb === key}
            <div class="feld"><label for="ko-m-t-{key}">{L('Titel (freiwillig)', 'Title (optional)')}</label><input id="ko-m-t-{key}" type="text" autocomplete="off" bind:value={bTitel}></div>
            <div class="feld"><label for="ko-m-x-{key}">{L('Text', 'Text')}</label><textarea id="ko-m-x-{key}" rows="4" bind:value={bText}></textarea></div>
            <div class="knopfzeile">
              <button class="k haupt" type="button" onclick={() => void bearbSpeichern(key, m)}>{L('Speichern', 'Save')}</button>
              <button class="k" type="button" onclick={() => void bearbAbbruch(key)}>{L('Abbrechen', 'Cancel')}</button>
            </div>
          {:else}
            {#if zeigeArtWort}<span class="klein" data-nolink>{L('Art', 'Kind')}: {artWort(m.art)}</span>{/if}
            {#if m.titel}<strong>{m.titel}</strong>{/if}
            <span class="text">{m.text}</span>
            {#if von(m)}<span class="klein">{L(`von ${von(m)}`, `by ${von(m)}`)}</span>{/if}
            <span class="knopfzeile">
              <button class="k" id="ko-m-b-{key}" type="button" onclick={() => void bearbeite(key, m)}>{L(`Bearbeiten: ${memoName(m)}`, `Edit: ${memoName(m)}`)}</button>
              <button class="k leise" type="button" onclick={() => void frageLoeschen(key)}>{L(`Löschen: ${memoName(m)}`, `Delete: ${memoName(m)}`)}</button>
            </span>
            {#if loeschKey === key}
              <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Esc ist nur eine zusätzliche Abkürzung für „Behalten“) -->
              <div class="rueckfrage" role="group" aria-labelledby="ko-m-lf-{key}" onkeydown={(e) => loeschTaste(e, key)}>
                <p id="ko-m-lf-{key}">{L(`Memo „${memoName(m)}“ löschen?`, `Delete memo "${memoName(m)}"?`)}</p>
                <span class="knopfzeile">
                  <button class="k" type="button" onclick={() => void loesche(key, m)}>{L('Löschen', 'Delete')}</button>
                  <button class="k haupt" id="ko-m-behalten-{key}" type="button" onclick={() => void behalten(key)}>{L('Behalten', 'Keep')}</button>
                </span>
              </div>
            {/if}
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="hilfe">{L('Noch keine Memos zu dieser Auswahl. Ein Memo ist eine Notiz zu Ihren Gedanken, zum Beispiel warum Sie einen Code so gegeben haben.', 'No memos for this selection yet. A memo is a note of your thoughts, for example why you gave a code.')}</p>
  {/each}
</div>

<fieldset id="ko-memo-formular" class="neu">
  <legend>{L('Neues Memo', 'New memo')}</legend>
  <div class="feld">
    <label for="ko-memo-wozu">{L('Wozu?', 'About what?')}</label>
    <select id="ko-memo-wozu" bind:value={wozu}>
      {#if stelleOk}<option value="stelle">{L('Textstelle', 'Passage')}</option>{/if}
      <option value="dokument">{L('Dokument', 'Document')}</option>
      {#if codeId}<option value="code">{L('Code', 'Code')}</option>{/if}
      {#if fallId}<option value="fall">{L('Fall', 'Case')}</option>{/if}
      <option value="projekt">{L('Projekt', 'Project')}</option>
    </select>
  </div>
  {#if zeigeArtAuswahl}
    <div class="feld">
      <label for="ko-memo-art">{L('Art des Memos', 'Kind of memo')}</label>
      <select id="ko-memo-art" value={art} onchange={(ev) => { art = ev.currentTarget.value as MemoArt; vorgabeWozu(art); }}>
        {#each artOptionen as a (a)}<option value={a}>{artName(a)}</option>{/each}
      </select>
    </div>
  {/if}
  <p class="hilfe" id="ko-memo-ziel" data-nolink>{L(`Das Memo gehört zu: ${ziel}.`, `The memo is about: ${ziel}.`)}</p>
  <div class="feld"><label for="ko-memo-titel">{L('Titel (freiwillig)', 'Title (optional)')}</label><input id="ko-memo-titel" type="text" autocomplete="off" bind:value={titel}></div>
  <div class="feld">
    <label for="ko-memo-text">{L('Text des Memos', 'Text of the memo')}</label>
    <textarea id="ko-memo-text" rows="4" bind:value={text} aria-describedby="ko-memo-ziel{fehler ? ' ko-memo-fehler' : ''}" aria-invalid={fehler ? 'true' : undefined}></textarea>
    {#if fehler}<p class="fehl" id="ko-memo-fehler">{fehler}</p>{/if}
  </div>
  <div class="knopfzeile"><button class="k haupt" id="ko-memo-neu" type="button" onclick={speichere}>{L('Memo speichern', 'Save memo')}</button></div>
  <p class="hilfe">{L('Memos sind reiner Text, ohne Formatierung. Mit der Taste M im Text oder in der Satzliste schreiben Sie ein Memo zur markierten Stelle.', 'Memos are plain text without formatting. With the key M in the text or in the sentence list you write a memo about the marked passage.')}</p>
</fieldset>

<style>
  .liste { display: flex; flex-direction: column; gap: var(--a2); }
  .liste h3 { margin: var(--a2) 0 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .memos { margin: 0; padding-inline-start: var(--a5); display: flex; flex-direction: column; gap: var(--a3); }
  .memos li { display: flex; flex-direction: column; gap: var(--a2); }
  .text { white-space: pre-wrap; overflow-wrap: anywhere; }
  .klein { font-size: var(--gr-klein); color: var(--tinte-2); }
  select, input[type="checkbox"] { min-height: 24px; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .feld { display: flex; flex-direction: column; gap: var(--a1); }
  .neu { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); margin: 0; min-width: 0; }
  .neu legend { font-weight: 600; padding: 0 var(--a1); }
  .rueckfrage { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); }
  .rueckfrage p { margin: 0; }
</style>
