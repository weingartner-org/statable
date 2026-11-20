<script lang="ts">
  /**
   * Randnotizen in drei Schichten (IPA, Stufe A3, Prüfplan A-B9, Fachblatt Arbeitsweisen 5): zu einer markierten Stelle drei beschriftete Felder
   * „beschreibend“, „sprachlich“, „begrifflich“; jede nicht leere Schicht wird ein Memo der Art `ipa-beschreibend` / `ipa-sprachlich` / `ipa-begrifflich`
   * mit Bezug auf das Segment. Statable schlägt nie Notizen vor und deutet nichts. Alles über `aendere()` (Rückgängig), Ansagen nur über `sage()`.
   * Darunter die Randnotizen des offenen Dokuments, nach Stelle gruppiert, mit Zeigen, Bearbeiten und Löschen (Rückfragezeile statt Dialog).
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { NACH_FOKUS_MS, sage, sageSpaeter } from '../lib/ansage';
  import { aendereMemo, entferneMemo, legeMemoAn, segmentFuer } from '../lib/kodieren';
  import { aendere, kuerzen, sicherIch, type Stelle } from '../lib/kodieren.svelte';
  import { cpTeil, type Memo, type MemoArt, type QualProjekt } from '../lib/qualprojekt';

  interface Props {
    q: QualProjekt;
    dokId: string;
    stellen: Stelle[];
    stelleName: string;
    zeigeSegment: (segId: string) => void;
  }
  let { q, dokId, stellen, stelleName, zeigeSegment }: Props = $props();

  type Schicht = 'ipa-beschreibend' | 'ipa-sprachlich' | 'ipa-begrifflich';
  const SCHICHTEN: Schicht[] = ['ipa-beschreibend', 'ipa-sprachlich', 'ipa-begrifflich'];
  const schichtWort = (a: MemoArt | undefined): string =>
    a === 'ipa-beschreibend' ? L('Beschreibend', 'Descriptive') : a === 'ipa-sprachlich' ? L('Sprachlich', 'Linguistic') : L('Begrifflich', 'Conceptual');
  const frage = (a: Schicht): string =>
    a === 'ipa-beschreibend' ? L('Beschreibend: Was wird gesagt?', 'Descriptive: What is being said?')
      : a === 'ipa-sprachlich' ? L('Sprachlich: Wie wird es gesagt? (Bilder, Wiederholungen, Pausen)', 'Linguistic: How is it said? (images, repetitions, pauses)')
        : L('Begrifflich: Was könnte es bedeuten? (fragend)', 'Conceptual: What might it mean? (as a question)');
  const feldId = (a: Schicht): string => `ko-rn-${a.slice(4)}`;

  const dok = $derived(q.dokumente.find(d => d.id === dokId));
  const zitat = (start: number, ende: number): string => (dok ? kuerzen(cpTeil(dok.text, start, ende).replace(/\s+/g, ' ').trim(), 60).trim() : '');
  const zitatMarkiert = $derived(stellen.length && dok ? zitat(stellen[0]!.start, stellen[0]!.ende) : '');

  let werte = $state<Record<Schicht, string>>({ 'ipa-beschreibend': '', 'ipa-sprachlich': '', 'ipa-begrifflich': '' });
  let fehler = $state('');

  function speichere() {
    const mit = SCHICHTEN.filter(a => werte[a].trim());
    if (!mit.length) {
      fehler = L('Bitte mindestens eine Schicht ausfüllen.', 'Please fill in at least one layer.');
      sage(fehler, 'dringend');
      document.getElementById(feldId('ipa-beschreibend'))?.focus();
      return;
    }
    fehler = '';
    const st = stellen, t = { ...werte };
    aendere(Lp(mit.length, 'Randnotiz wieder entfernt', `${mit.length} Randnotizen wieder entfernt`, 'Exploratory note removed again', `${mit.length} exploratory notes removed again`), q0 => {
      let neu = sicherIch(q0);
      const wer = neu.ich!;
      const bezuege: Memo['bezug'] = [];
      for (const s of st) { const r = segmentFuer(neu, dokId, s.start, s.ende, wer); neu = r.q; bezuege.push({ art: 'segment', id: r.id }); }
      if (!bezuege.length) return q0;
      for (const a of mit) {
        const r = legeMemoAn(neu, bezuege[0]!, t[a].trim(), undefined, wer, a);
        neu = r.q;
        if (bezuege.length > 1) neu = { ...neu, memos: neu.memos.map(m => (m.id === r.id ? { ...m, bezug: bezuege } : m)) };
      }
      return neu;
    });
    werte = { 'ipa-beschreibend': '', 'ipa-sprachlich': '', 'ipa-begrifflich': '' };
    sage(Lp(mit.length, '1 Randnotiz gespeichert.', `${mit.length} Randnotizen gespeichert.`, '1 exploratory note saved.', `${mit.length} exploratory notes saved.`));
  }

  /* ---- Liste der Randnotizen dieses Dokuments, nach Stelle gruppiert ---- */
  const gruppen = $derived.by(() => {
    const aus: { key: string; gid: string; segId: string; start: number; titel: string; memos: Memo[] }[] = [];
    for (const m of q.memos) {
      if (!m.art || !(SCHICHTEN as string[]).includes(m.art)) continue;
      const segs = m.bezug.filter(b => b.art === 'segment' && b.id).map(b => q.segmente.find(s => s.id === b.id)).filter((s): s is NonNullable<typeof s> => !!s && s.dokument === dokId);
      if (!segs.length) continue;
      const key = segs.map(s => s.id).join('+');
      let g = aus.find(x => x.key === key);
      if (!g) { g = { key, gid: key.replaceAll("+", "_"), segId: segs[0]!.id, start: segs[0]!.start, titel: zitat(segs[0]!.start, segs[0]!.ende), memos: [] }; aus.push(g); }
      g.memos.push(m);
    }
    for (const g of aus) g.memos.sort((a, b) => SCHICHTEN.indexOf(a.art as Schicht) - SCHICHTEN.indexOf(b.art as Schicht) || a.erstellt - b.erstellt);
    return aus.sort((a, b) => a.start - b.start);
  });

  const ref = (g: { gid: string }, m: Memo): string => `${g.gid}-${m.id}`;
  let bearb = $state<string | null>(null);
  let bText = $state('');
  let loeschKey = $state<string | null>(null);

  async function bearbeite(key: string, m: Memo) {
    loeschKey = null; bearb = key; bText = m.text;
    await tick(); await tick();
    document.getElementById(`ko-rn-x-${key}`)?.focus();
  }
  async function bearbSpeichern(key: string, m: Memo) {
    if (!bText.trim()) { sage(L('Der Text darf nicht leer sein.', 'The text must not be empty.'), 'dringend'); document.getElementById(`ko-rn-x-${key}`)?.focus(); return; }
    aendere(L('Änderung an der Randnotiz zurückgenommen', 'Change to the exploratory note undone'), q0 => aendereMemo(q0, m.id, { text: bText }));
    bearb = null;
    await tick();
    document.getElementById(`ko-rn-b-${key}`)?.focus();
    sageSpaeter(L('Randnotiz gespeichert.', 'Exploratory note saved.'), NACH_FOKUS_MS);
  }
  async function bearbAbbruch(key: string) {
    bearb = null;
    await tick();
    document.getElementById(`ko-rn-b-${key}`)?.focus();
  }
  async function frageLoeschen(key: string) {
    bearb = null; loeschKey = key;
    await tick(); await tick();
    document.getElementById(`ko-rn-behalten-${key}`)?.focus();
  }
  async function loesche(m: Memo) {
    aendere(L('Löschen der Randnotiz zurückgenommen', 'Deleting the exploratory note undone'), q0 => entferneMemo(q0, m.id));
    loeschKey = null;
    await tick();
    (document.querySelector<HTMLElement>('#ko-rn-liste button') ?? document.getElementById(feldId('ipa-beschreibend')))?.focus();
    sageSpaeter(L('Randnotiz gelöscht.', 'Exploratory note deleted.'), NACH_FOKUS_MS);
  }
  async function behalten(key: string) {
    loeschKey = null;
    await tick();
    document.getElementById(`ko-rn-b-${key}`)?.focus();
  }
  const loeschTaste = (e: KeyboardEvent, key: string) => { if (e.key === 'Escape') { e.preventDefault(); void behalten(key); } };
</script>

{#if stellen.length}
  <fieldset id="ko-rn-formular" class="neu">
    <legend>{L('Randnotizen zu: ', 'Exploratory notes on: ')}{zitatMarkiert ? `„${zitatMarkiert}“` : stelleName}</legend>
    {#each SCHICHTEN as a (a)}
      <div class="feld">
        <label for={feldId(a)}>{frage(a)}</label>
        <textarea id={feldId(a)} rows="3" bind:value={werte[a]} aria-describedby={fehler ? 'ko-rn-fehler' : undefined}></textarea>
      </div>
    {/each}
    {#if fehler}<p class="fehl" id="ko-rn-fehler">{fehler}</p>{/if}
    <div class="knopfzeile"><button class="k haupt" id="ko-rn-speichern" type="button" onclick={speichere}>{L('Randnotizen speichern', 'Save exploratory notes')}</button></div>
    <p class="hilfe">{L('Leere Felder werden nicht gespeichert. Statable schlägt keine Notizen vor und deutet nichts.', 'Empty fields are not saved. Statable does not suggest notes and interprets nothing.')}</p>
  </fieldset>
{:else}
  <p class="hilfe" id="ko-rn-leer">{L('Keine Stelle markiert. Markieren Sie im Text eine Stelle mit Umschalt+Pfeil, oder wählen Sie mit S einen Satz oder mit A einen Absatz. Dann können Sie hier Randnotizen schreiben.', 'No passage marked. Mark a passage in the text with Shift+arrow, or choose a sentence with S or a paragraph with A. Then you can write exploratory notes here.')}</p>
{/if}

<div id="ko-rn-liste" class="liste">
  {#each gruppen as g (g.key)}
    <section class="gruppe" aria-labelledby="ko-rn-g-{g.gid}">
      <h3 id="ko-rn-g-{g.gid}" data-nolink>{L('Textstelle', 'Passage')}: „{g.titel}“</h3>
      <ul class="memos">
        {#each g.memos as m (m.id)}
          {@const key = ref(g, m)}
          <li data-nolink>
            <span class="klein">{L('Schicht', 'Layer')}: {schichtWort(m.art)}</span>
            {#if bearb === key}
              <div class="feld"><label for="ko-rn-x-{key}">{L(`Text (${schichtWort(m.art)})`, `Text (${schichtWort(m.art)})`)}</label><textarea id="ko-rn-x-{key}" rows="3" bind:value={bText}></textarea></div>
              <div class="knopfzeile">
                <button class="k haupt" type="button" onclick={() => void bearbSpeichern(key, m)}>{L('Speichern', 'Save')}</button>
                <button class="k" type="button" onclick={() => void bearbAbbruch(key)}>{L('Abbrechen', 'Cancel')}</button>
              </div>
            {:else}
              <span class="text">{m.text}</span>
              <span class="knopfzeile">
                <button class="k" type="button" onclick={() => zeigeSegment(g.segId)}>{L(`Zeigen: ${schichtWort(m.art)}, ${g.titel}`, `Show: ${schichtWort(m.art)}, ${g.titel}`)}</button>
                <button class="k" id="ko-rn-b-{key}" type="button" onclick={() => void bearbeite(key, m)}>{L(`Bearbeiten: ${schichtWort(m.art)}, ${g.titel}`, `Edit: ${schichtWort(m.art)}, ${g.titel}`)}</button>
                <button class="k leise" type="button" onclick={() => void frageLoeschen(key)}>{L(`Löschen: ${schichtWort(m.art)}, ${g.titel}`, `Delete: ${schichtWort(m.art)}, ${g.titel}`)}</button>
              </span>
              {#if loeschKey === key}
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Esc ist nur eine zusätzliche Abkürzung für „Behalten“) -->
                <div class="rueckfrage" role="group" aria-labelledby="ko-rn-lf-{key}" onkeydown={(e) => loeschTaste(e, key)}>
                  <p id="ko-rn-lf-{key}">{L('Randnotiz löschen?', 'Delete exploratory note?')}</p>
                  <span class="knopfzeile">
                    <button class="k" type="button" onclick={() => void loesche(m)}>{L('Löschen', 'Delete')}</button>
                    <button class="k haupt" id="ko-rn-behalten-{key}" type="button" onclick={() => void behalten(key)}>{L('Behalten', 'Keep')}</button>
                  </span>
                </div>
              {/if}
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <p class="hilfe">{L('In diesem Dokument gibt es noch keine Randnotizen.', 'There are no exploratory notes in this document yet.')}</p>
  {/each}
</div>

<style>
  .liste { display: flex; flex-direction: column; gap: var(--a3); }
  .gruppe { display: flex; flex-direction: column; gap: var(--a2); }
  .gruppe h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); overflow-wrap: anywhere; }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .memos { margin: 0; padding-inline-start: var(--a5); display: flex; flex-direction: column; gap: var(--a3); }
  .memos li { display: flex; flex-direction: column; gap: var(--a2); }
  .text { white-space: pre-wrap; overflow-wrap: anywhere; }
  .klein { font-size: var(--gr-klein); color: var(--tinte-2); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .feld { display: flex; flex-direction: column; gap: var(--a1); }
  .neu { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); margin: 0; min-width: 0; }
  .neu legend { font-weight: 600; padding: 0 var(--a1); overflow-wrap: anywhere; }
  .rueckfrage { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); }
  .rueckfrage p { margin: 0; }
</style>
