<script lang="ts">
  /**
   * Zwei Stellen nebeneinander vergleichen (Grounded Theory, ständiger Vergleich; Stufe A3, Prüfplan A-B10, Fachblatt Arbeitsweisen 4).
   * Zwei Plätze „Stelle 1“ und „Stelle 2“: je Platz die markierte Stelle übernehmen oder eine Stelle aus den Belegen eines Codes wählen.
   * Gezeigt werden Dokument, Fall, Codes und der Text der Stelle - jeder Platz unter einer Überschrift Ebene 3 (Sprungziel, `tabindex=-1`).
   * Darunter das Vergleichs-Memo (Memo-Art `vergleich`, Bezug auf beide Segmente). Statable sagt nichts darüber, ob die Stellen ähnlich sind.
   * Die Plätze merkt sich der Baustein nur im Arbeitsspeicher (nicht im Projekt); ein Segment entsteht erst beim Speichern des Memos oder beim „Zeigen“.
   * Schmal stehen die Plätze untereinander, ab sehr breit nebeneinander (Klasse `weit-1400` aus `lib/groesse.svelte.ts`).
   */
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { NACH_FOKUS_MS, sage, sageSpaeter } from '../lib/ansage';
  import { belege, codesAn, legeMemoAn, segmentFuer } from '../lib/kodieren';
  import { aendere, aendereOhneStapel, kuerzen, sicherIch, type Stelle } from '../lib/kodieren.svelte';
  import { cpTeil, type Memo, type QualProjekt } from '../lib/qualprojekt';

  interface Props {
    q: QualProjekt;
    dokId: string;
    stellen: Stelle[];
    stelleName: string;
    zeigeSegment: (segId: string) => void;
    /** springt zu einer Stelle ohne Segment (bevorzugt: legt nichts im Projekt an) */
    zeigeStelle?: (dokument: string, start: number, ende: number) => void;
  }
  let { q, dokId, stellen, stelleName, zeigeSegment, zeigeStelle }: Props = $props();
  export function fokussiere() { document.getElementById('ko-vergleich-t')?.focus(); }

  interface Platz { dokument: string; start: number; ende: number }
  let platz = $state<[Platz | null, Platz | null]>([null, null]);
  let memoText = $state('');
  let fehler = $state('');

  /** Ein Platz zählt nur, wenn sein Dokument in der Sicht des Projekts liegt (im Einzelfall-Modus verschwinden verdeckte Fälle von selbst). */
  const gueltig = $derived(platz.map(p => (p && q.dokumente.some(d => d.id === p.dokument) ? p : null)) as [Platz | null, Platz | null]);

  const dokVon = (p: Platz) => q.dokumente.find(d => d.id === p.dokument);
  const textVon = (p: Platz): string => { const d = dokVon(p); return d ? cpTeil(d.text, p.start, p.ende) : ''; };
  const fallVon = (p: Platz): string => { const f = dokVon(p)?.fall; return f ? q.faelle.find(x => x.id === f)?.name ?? '' : ''; };
  const codesVon = (p: Platz): string => codesAn(q, p.dokument, p.start, p.ende).map(c => c.name).join(', ');

  async function uebernehme(i: 0 | 1) {
    if (!stellen.length) {
      sage(L('Es ist nichts markiert. Markieren Sie mit Umschalt+Pfeil, S oder A.', 'Nothing is marked. Mark with Shift+arrow, S or A.'));
      return;
    }
    const st = stellen[0]!;
    platz = i === 0 ? [{ dokument: dokId, start: st.start, ende: st.ende }, platz[1]] : [platz[0], { dokument: dokId, start: st.start, ende: st.ende }];
    fehler = '';
    sage(stellen.length > 1
      ? L(`Textstelle ${i + 1} übernommen: die erste der ${stellen.length} markierten Stellen, ${stelleName}.`, `Passage ${i + 1} taken: the first of the ${stellen.length} marked passages.`)
      : L(`Textstelle ${i + 1} übernommen: ${stelleName}.`, `Passage ${i + 1} taken: ${stelleName}.`));
    await tick();
  }

  /* ---- Auswahl aus den Belegen eines Codes (zugeklappt) ---- */
  const codesMitBelegen = $derived(q.codes.filter(c => q.kodierungen.some(k => k.code === c.id)));
  let belegCode = $state<[string, string]>(['', '']);
  let belegNr = $state<[string, string]>(['', '']);
  const belegListe = (i: 0 | 1) => (belegCode[i] ? belege(q, belegCode[i]) : []);
  function waehleBelegCode(i: 0 | 1, id: string) {
    belegCode = i === 0 ? [id, belegCode[1]] : [belegCode[0], id];
    belegNr = i === 0 ? ['', belegNr[1]] : [belegNr[0], ''];
  }
  function uebernehmeBeleg(i: 0 | 1) {
    const b = belegListe(i)[Number(belegNr[i])];
    if (!b) { sage(L('Bitte zuerst einen Beleg wählen.', 'Please choose a passage first.')); return; }
    platz = i === 0 ? [{ dokument: b.dokument, start: b.start, ende: b.ende }, platz[1]] : [platz[0], { dokument: b.dokument, start: b.start, ende: b.ende }];
    fehler = '';
    sage(L(`Textstelle ${i + 1} übernommen: ${kuerzen(b.text.replace(/\s+/g, ' '), 40).trim()}`, `Passage ${i + 1} taken: ${kuerzen(b.text.replace(/\s+/g, ' '), 40).trim()}`));
  }

  /* ---- Zeigen und Springen ---- */
  function zeige(i: 0 | 1) {
    const p = gueltig[i]; if (!p) return;
    if (zeigeStelle) { zeigeStelle(p.dokument, p.start, p.ende); return; }
    let id = '';
    aendereOhneStapel(q0 => { const r = segmentFuer(sicherIch(q0), p.dokument, p.start, p.ende, sicherIch(q0).ich); id = r.id; return r.q; });
    if (id) zeigeSegment(id);
  }
  async function springe(zu: 0 | 1) {
    await tick();
    document.getElementById(`ko-vgl-h-${zu + 1}`)?.focus();
    sageSpaeter(L(`Textstelle ${zu + 1}.`, `Passage ${zu + 1}.`), NACH_FOKUS_MS);
  }

  /* ---- Vergleichs-Memo ---- */
  function speichere() {
    const [a, b] = gueltig;
    if (!a || !b) {
      fehler = L('Übernehmen Sie zuerst beide Stellen.', 'Please take both passages first.');
      sage(fehler, 'dringend');
      return;
    }
    const t = memoText.trim();
    if (!t) {
      fehler = L('Bitte zuerst den Text des Vergleichs-Memos schreiben.', 'Please write the text of the comparison memo first.');
      sage(fehler, 'dringend');
      document.getElementById('ko-vgl-text')?.focus();
      return;
    }
    fehler = '';
    aendere(L('Vergleichs-Memo wieder entfernt', 'Comparison memo removed again'), q0 => {
      let neu = sicherIch(q0);
      const wer = neu.ich!;
      const bezuege: Memo['bezug'] = [];
      for (const p of [a, b]) {
        const r = segmentFuer(neu, p.dokument, p.start, p.ende, wer); neu = r.q;
        if (!bezuege.some(x => x.id === r.id)) bezuege.push({ art: 'segment', id: r.id });
      }
      const r = legeMemoAn(neu, bezuege[0]!, t, undefined, wer, 'vergleich');
      neu = r.q;
      if (bezuege.length > 1) neu = { ...neu, memos: neu.memos.map(m => (m.id === r.id ? { ...m, bezug: bezuege } : m)) };
      return neu;
    });
    memoText = '';
    sage(L('Vergleichs-Memo gespeichert.', 'Comparison memo saved.'));
  }
</script>

<div class="vgl">
  <p class="hilfe">{L('Markieren Sie eine Stelle im Dokument und übernehmen Sie sie als Stelle 1; markieren Sie dann eine zweite und übernehmen Sie sie als Stelle 2. Was die Stellen verbindet oder trennt, schreiben Sie selbst ins Memo. Statable bewertet nicht, ob sie sich ähneln.', 'Mark a passage in the document and take it as passage 1; then mark a second one and take it as passage 2. What connects or separates them, you write yourself in the memo. Statable does not judge whether they are similar.')}</p>
  <div class="plaetze">
    {#each [0, 1] as const as i (i)}
      {@const p = gueltig[i]}
      <section class="platz" aria-labelledby="ko-vgl-h-{i + 1}">
        <h3 id="ko-vgl-h-{i + 1}" tabindex="-1">{L('Textstelle', 'Passage')} {i + 1}</h3>
        {#if p}
          <p class="meta" data-nolink>
            {L('Dokument', 'Document')}: {dokVon(p)?.name ?? ''}.
            {#if fallVon(p)}{L('Fall', 'Case')}: {fallVon(p)}.{/if}
            {L('Codes', 'Codes')}: {codesVon(p) || L('keine', 'none')}.
          </p>
          <p class="stelle" data-nolink>{kuerzen(textVon(p), 900)}</p>
          <div class="knopfzeile">
            <button class="k" type="button" onclick={() => zeige(i)}>{L(`Zeigen: Textstelle ${i + 1}`, `Show: passage ${i + 1}`)}</button>
            {#if gueltig[0] && gueltig[1]}
              <button class="k" type="button" onclick={() => void springe(i === 0 ? 1 : 0)}>{L(`Zur anderen Stelle springen (Textstelle ${i === 0 ? 2 : 1})`, `Jump to the other passage (passage ${i === 0 ? 2 : 1})`)}</button>
            {/if}
          </div>
        {:else}
          <p class="hilfe">{L('Noch keine Stelle übernommen.', 'No passage taken yet.')}</p>
        {/if}
        <div class="knopfzeile">
          <button class="k haupt" id="ko-vgl-nimm-{i + 1}" type="button" onclick={() => void uebernehme(i)}>{p ? L(`Markierte Stelle übernehmen (ersetzt Stelle ${i + 1})`, `Take marked passage (replaces passage ${i + 1})`) : L('Markierte Stelle übernehmen', 'Take marked passage')}</button>
        </div>
        {#if codesMitBelegen.length}
          <details>
            <summary>{L(`Textstelle ${i + 1} aus den Belegen eines Codes wählen`, `Choose passage ${i + 1} from the passages of a code`)}</summary>
            <div class="feld">
              <label for="ko-vgl-code-{i + 1}">{L('Code', 'Code')}</label>
              <select id="ko-vgl-code-{i + 1}" value={belegCode[i]} onchange={(ev) => waehleBelegCode(i, ev.currentTarget.value)}>
                <option value="">{L('bitte wählen', 'please choose')}</option>
                {#each codesMitBelegen as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
              </select>
            </div>
            {#if belegCode[i]}
              <div class="feld">
                <label for="ko-vgl-beleg-{i + 1}">{L('Beleg', 'Passage')}</label>
                <select id="ko-vgl-beleg-{i + 1}" value={belegNr[i]} onchange={(ev) => { belegNr = i === 0 ? [ev.currentTarget.value, belegNr[1]] : [belegNr[0], ev.currentTarget.value]; }}>
                  <option value="">{L('bitte wählen', 'please choose')}</option>
                  {#each belegListe(i) as b, n (b.kodierung)}<option value={String(n)}>{q.dokumente.find(d => d.id === b.dokument)?.name ?? ''}: {kuerzen(b.text.replace(/\s+/g, ' '), 50)}</option>{/each}
                </select>
              </div>
              <div class="knopfzeile"><button class="k" type="button" onclick={() => uebernehmeBeleg(i)}>{L(`Diesen Beleg als Stelle ${i + 1} übernehmen`, `Take this passage as passage ${i + 1}`)}</button></div>
            {/if}
          </details>
        {/if}
      </section>
    {/each}
  </div>

  <fieldset class="neu" id="ko-vgl-formular">
    <legend>{L('Vergleichs-Memo', 'Comparison memo')}</legend>
    <div class="feld">
      <label for="ko-vgl-text">{L('Was fällt beim Vergleich der beiden Stellen auf? (Ihre eigene Deutung)', 'What do you notice when comparing the two passages? (your own interpretation)')}</label>
      <textarea id="ko-vgl-text" rows="4" bind:value={memoText} aria-describedby={fehler ? 'ko-vgl-fehler' : undefined} aria-invalid={fehler ? 'true' : undefined}></textarea>
      {#if fehler}<p class="fehl" id="ko-vgl-fehler">{fehler}</p>{/if}
    </div>
    <div class="knopfzeile"><button class="k haupt" id="ko-vgl-speichern" type="button" onclick={speichere}>{L('Vergleichs-Memo speichern', 'Save comparison memo')}</button></div>
  </fieldset>
</div>

<style>
  .vgl { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  .plaetze { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--a3); }
  :global(:where(:root.weit-1400)) .plaetze { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .platz { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); min-width: 0; }
  .platz h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .platz h3:focus { outline: 3px solid var(--fokus); outline-offset: 2px; }
  .meta, .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .stelle { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; border-inline-start: 4px solid var(--akzent); padding-inline-start: var(--a3); }
  .fehl { margin: 0; color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .feld { display: flex; flex-direction: column; gap: var(--a1); margin-top: var(--a2); }
  select { min-height: 24px; max-width: 100%; }
  .neu { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); margin: 0; min-width: 0; }
  .neu legend { font-weight: 600; padding: 0 var(--a1); }
</style>
