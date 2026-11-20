<script lang="ts">
  /**
   * Dokument-Übersicht (Stufe 6c, Fachblatt 3.2): „Was ist in diesem Dokument wo kodiert?“ Eine Liste mit einem Knopf je Absatz
   * („Absatz 2: Lernen, Angst (3 Stellen)“). Der Knopf springt in der aktuellen Ansicht zum Absatz (die Seite sagt danach „Absatz 2.“).
   * Rechnet in `lib/kodieren-ansichten.ts`; nichts wird gespeichert. Codenamen nur als Text.
   */
  import { L, Lp } from '../lib/sitzung.svelte';
  import { dokumentUebersicht } from '../lib/kodieren-ansichten';
  import type { Personen } from '../lib/qualauswertung';
  import type { QualProjekt } from '../lib/qualprojekt';

  interface Props {
    q: QualProjekt;
    dokId: string;
    personen: Personen;
    zeige: (start: number, ende: number, absatz: number) => void;
  }
  let { q, dokId, personen, zeige }: Props = $props();

  let auchLeere = $state(false);
  const dok = $derived(q.dokumente.find(d => d.id === dokId));
  const zeilen = $derived(dokumentUebersicht(q, dokId, { kodierende: personen }));
  const kodiert = $derived(zeilen.filter(z => z.stellen > 0));
  const sichtbar = $derived(auchLeere ? zeilen : kodiert);

  const satz = (z: (typeof zeilen)[number]): string => {
    const namen = z.codes.map(c => c.name).join(', ');
    const n = z.stellen;
    return L(
      `Absatz ${z.absatz}: ${namen || 'ohne Code'} (${Lp(n, '1 Stelle', `${n} Stellen`, '1 passage', `${n} passages`)})`,
      `Paragraph ${z.absatz}: ${namen || 'no code'} (${Lp(n, '1 Stelle', `${n} Stellen`, '1 passage', `${n} passages`)})`,
    );
  };
</script>

{#if dok}
  <h3 id="ko-uebersicht-t" tabindex="-1" data-nolink>{L(`Dokument-Übersicht: ${dok.name}`, `Document overview: ${dok.name}`)}</h3>
  <p class="hilfe">{L('Jeder Eintrag ist ein Absatz. Ein Eintrag mit Knopf springt im Dokument zu diesem Absatz.', 'Every entry is a paragraph. An entry with a button jumps to that paragraph in the document.')}</p>
  <label class="radio"><input id="ko-ueb-leere" type="checkbox" bind:checked={auchLeere}>{L('Auch Absätze ohne Code zeigen', 'Also show paragraphs without a code')}</label>
  {#if !kodiert.length && !auchLeere}
    <p class="hilfe">{L('In diesem Dokument ist noch nichts kodiert.', 'Nothing in this document is coded yet.')}</p>
  {:else}
    <ul class="ueb" aria-labelledby="ko-uebersicht-t" data-nolink>
      {#each sichtbar as z (z.absatz)}
        <li><button class="k" type="button" onclick={() => zeige(z.start, z.ende, z.absatz)}>{satz(z)}</button></li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); overflow-wrap: anywhere; }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .ueb { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .ueb .k { text-align: start; white-space: normal; height: auto; }
  .radio { display: inline-flex; align-items: center; gap: var(--a2); min-height: 24px; }
  .radio input[type="checkbox"] { min-width: 24px; min-height: 24px; }
</style>
