<script lang="ts">
  /**
   * Ähnliche Stellen (Stufe 6c, Fachblatt 3.6): „Wo steht noch etwas Ähnliches?“ Vergleicht nur Wörter (TF-IDF, lokal in `aehnlicheStellen`), nicht die Bedeutung.
   * Schlägt keine Codes vor und kodiert nie selbst. Abschaltbar über die Einstellung `kodierAehnliche` (Voreinstellung an).
   * Ausgangsstelle liefert die Seite (`ausgang`): die Auswahl, sonst der Satz an der Schreibmarke.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { aehnlicheStellen, type Aehnlich } from '../lib/kodieren-ansichten';
  import { kodierAehnliche, setzeKodierAehnliche, sprache } from '../lib/kodieren.svelte';
  import { cpTeil, type QualProjekt } from '../lib/qualprojekt';
  import { zahlDe } from '../lib/format';
  import Rechnet from './Rechnet.svelte';

  interface Props {
    q: QualProjekt;
    dokId: string;
    /** Ausgangsstelle im offenen Dokument; `null`, wenn es keine gibt */
    ausgang: () => { start: number; ende: number } | null;
    zeige: (dokument: string, start: number, ende: number) => void;
  }
  let { q, dokId, ausgang, zeige }: Props = $props();

  const lade = new Laedt();
  const an = $derived(kodierAehnliche());
  let treffer = $state<Aehnlich[] | null>(null);
  $effect(() => { void q.dokumente; void dokId; treffer = null; });

  const docName = (id: string): string => q.dokumente.find(x => x.id === id)?.name ?? '';
  const textVon = (t: Aehnlich): string => cpTeil(q.dokumente.find(x => x.id === t.dokument)?.text ?? '', t.start, t.ende);

  async function suchen() {
    const a = ausgang();
    if (!a || a.ende <= a.start) { sage(L('Es gibt keine Stelle zum Vergleichen. Markieren Sie zuerst Text im Dokument.', 'There is no passage to compare. Mark some text in the document first.'), 'dringend'); return; }
    let r: Aehnlich[] = [];
    await lade.mit(async () => { await tick(); r = aehnlicheStellen(q, { dokument: dokId, start: a.start, ende: a.ende }, { anzahl: 10, sprache: sprache() }); });
    treffer = r;
    await tick();
    document.getElementById('ko-ae-erg-t')?.focus();
    sage(r.length === 0
      ? L('Keine ähnlichen Stellen gefunden.', 'No similar passages found.')
      : L(`${Lp(r.length, '1 ähnliche Stelle', `${r.length} ähnliche Stellen`, '', '')} gefunden.`, `${Lp(r.length, '', '', '1 similar passage', `${r.length} similar passages`)} found.`));
  }
</script>

<div class="ae" role="group" aria-label={L('Ähnliche Stellen', 'Similar passages')}>
  <h3 id="ko-ae-t">{L('Ähnliche Stellen', 'Similar passages')}</h3>
  <label class="schalter"><input id="ko-ae-an" type="checkbox" checked={an} onchange={(e) => setzeKodierAehnliche(e.currentTarget.checked)}>{L('Ähnliche Stellen anbieten', 'Offer similar passages')}</label>
  {#if !an}
    <p class="hilfe">{L('Ausgeschaltet.', 'Switched off.')}</p>
  {:else}
    <p class="hilfe">{L('Statable vergleicht nur Wörter (TF-IDF), nicht die Bedeutung. Es schlägt keine Codes vor.', 'Statable only compares words (TF-IDF), not the meaning. It does not suggest codes.')}</p>
    <p class="hilfe">{L('Ausgang ist die markierte Stelle im Dokument, ohne Markierung der Satz an der Schreibmarke. Die Rechnung läuft nur in Ihrem Browser.', 'The starting point is the marked passage in the document, without a mark the sentence at the cursor. The calculation runs only in your browser.')}</p>
    <div class="knopfzeile"><button class="k haupt" id="ko-ae-suchen" type="button" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void suchen(); }}>{L('Ähnliche Stellen suchen', 'Search similar passages')}</button></div>
    {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Stellen werden verglichen …', 'Comparing passages …')} /></p>{/if}
    {#if treffer}
      <h4 id="ko-ae-erg-t" tabindex="-1">{L('Ähnliche Stellen, die ähnlichsten zuerst', 'Similar passages, most similar first')}</h4>
      {#if treffer.length === 0}
        <p>{L('Keine ähnlichen Stellen gefunden.', 'No similar passages found.')}</p>
      {:else}
        <ol class="liste" aria-labelledby="ko-ae-erg-t">
          {#each treffer as t, i (t.dokument + ':' + t.start + ':' + t.ende)}
            <li>
              <span class="klein" data-nolink>{docName(t.dokument)}, {L(`Satz ${t.satz}`, `Sentence ${t.satz}`)}, {L(`Ähnlichkeit ${zahlDe(t.wert, 2)}`, `Similarity ${zahlDe(t.wert, 2)}`)}</span>
              <q class="zitat" data-nolink>{textVon(t)}</q>
              <button class="k" type="button" onclick={() => zeige(t.dokument, t.start, t.ende)}>{L(`Im Text zeigen (Treffer ${i + 1})`, `Show in the text (hit ${i + 1})`)}</button>
            </li>
          {/each}
        </ol>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .ae { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  h4 { margin: var(--a2) 0 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .klein { font-size: var(--gr-klein); color: var(--tinte-2); }
  .schalter { display: inline-flex; align-items: center; gap: var(--a2); min-height: 24px; }
  .schalter input[type="checkbox"] { min-width: 24px; min-height: 24px; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .liste { margin: 0; padding-inline-start: 1.5rem; display: flex; flex-direction: column; gap: var(--a3); }
  .liste li { display: list-item; }
  .liste li > * { display: block; margin-bottom: var(--a1); }
  .zitat { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
