<script lang="ts">
  /**
   * Bereich „Zahlen und Texte verbinden (Mixed Methods)“ im Kodier-Arbeitsplatz, Ansicht im Bereich „Auswerten“ (Stufe A2).
   * Fünf Teile: Fälle mit dem Datensatz verknüpfen, Joint Displays, Design-Steckbrief, Fragebogen aus Interviews (Instrumentenentwicklung),
   * Selbstprüfung (MMAT, GRAMMS). Jeder Teil speichert über `aendere()` (Rückgängig) und sagt über `sage()` an. Kein modales Fenster.
   * Im Einzelfall-Modus ist alles verdeckt (Joint Displays fassen Fälle zusammen; lib/einzelfall-modus.ts).
   * Der Datensatz kommt aus dem offenen Statable-Projekt (`s.spalten`, `s.zeilen`), nur lesend.
   */
  import { tick } from 'svelte';
  import { L, Lp, s } from '../lib/sitzung.svelte';
  import { sage, sageSpaeter } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { ko } from '../lib/kodieren.svelte';
  import { oeffneMixedBeispiel } from '../lib/mixed-beispiel';
  import type { DatenSicht } from '../lib/mixed';
  import type { QualProjekt } from '../lib/qualprojekt';
  import Rechnet from './Rechnet.svelte';
  import MmVerknuepfung from './MmVerknuepfung.svelte';
  import JointDisplays from './JointDisplays.svelte';
  import MmDesign from './MmDesign.svelte';
  import MmInstrument from './MmInstrument.svelte';
  import MmSelbstpruefung from './MmSelbstpruefung.svelte';

  interface Props { q: QualProjekt; einzelAn: boolean }
  let { q, einzelAn }: Props = $props();

  const daten = $derived<DatenSicht>({ spalten: s.spalten, zeilen: s.zeilen });
  const TEILE: { wert: typeof ko.mmTeil; de: string; en: string }[] = [
    { wert: 'verknuepfen', de: 'Fälle mit dem Datensatz verknüpfen (Verknüpfung)', en: 'Link cases with the data set (linking)' },
    { wert: 'displays', de: 'Zahlen und Zitate zusammen zeigen (Joint Display)', en: 'Show numbers and quotes together (joint display)' },
    { wert: 'design', de: 'Welches Design hat meine Studie? (Design-Steckbrief)', en: 'Which design does my study have? (design profile)' },
    { wert: 'instrument', de: 'Aus Interviews einen Fragebogen machen (Instrumentenentwicklung)', en: 'Turn interviews into a questionnaire (instrument development)' },
    { wert: 'pruefung', de: 'Ist meine Studie gut verbunden? (Selbstprüfung MMAT, GRAMMS)', en: 'Is my study well integrated? (self-check MMAT, GRAMMS)' },
  ];

  const lade = new Laedt();
  let fehler = $state('');
  async function beispiel() {
    fehler = '';
    await lade.mit(async () => {
      try {
        const r = await oeffneMixedBeispiel();
        ko.auswerten = 'mixed'; ko.mmTeil = 'verknuepfen';
        await tick(); await tick();
        document.getElementById('ko-mm-t')?.focus();
        sageSpaeter(L(`Beispiel geöffnet: neues Projekt mit ${r.zeilen} Antworten aus der Umfrage und ${Lp(r.dokumente, '1 Interview', `${r.dokumente} Interviews`, '', '')}.`, `Example opened: new project with ${r.zeilen} survey responses and ${Lp(r.dokumente, '', '', '1 interview', `${r.dokumente} interviews`)}.`), 600);
      } catch {
        fehler = L('Das Beispiel ließ sich nicht laden. Bitte prüfen Sie die Verbindung und versuchen Sie es noch einmal.', 'The example could not be loaded. Please check the connection and try again.');
        sage(fehler, 'dringend');
      }
    });
  }
</script>

<div class="mm" role="group" aria-labelledby="ko-mm-t">
  <h3 id="ko-mm-t" tabindex="-1">{L('Zahlen und Texte verbinden (Mixed Methods)', 'Combine numbers and texts (mixed methods)')}</h3>
  {#if einzelAn}
    <p class="hilfe">{L('Mixed Methods fasst mehrere Fälle zusammen. Im Einzelfall-Modus ist das verdeckt, damit Sie nichts aus anderen Fällen sehen. Verlassen Sie den Einzelfall-Modus, um weiterzuarbeiten.', 'Mixed methods brings several cases together. In single-case mode this is hidden so that you see nothing from other cases. Leave the mode to continue.')}</p>
  {:else}
    <p class="hilfe">{L('Hier verbinden Sie Ihre Interviews mit Zahlen aus einer Umfrage. Statable zählt und rechnet nur; welche Zitate passen und was Sie aus beidem lernen, entscheiden Sie.', 'Here you link your interviews with numbers from a survey. Statable only counts and calculates; which quotes fit and what you learn from both is up to you.')}</p>
    <div class="knopfzeile">
      <button class="k" type="button" id="ko-mm-beispiel" aria-disabled={lade.aktiv ? 'true' : undefined} onclick={() => { if (!lade.aktiv) void beispiel(); }}>{L('Beispiel öffnen: Um Hilfe bitten (Umfrage und Interviews, erfunden, neues Projekt)', 'Open example: asking for help (survey and interviews, invented, new project)')}</button>
    </div>
    {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Beispiel wird geladen …', 'Loading the example …')} /></p>{/if}
    {#if fehler}<p class="fehler">{fehler}</p>{/if}
    <fieldset class="auswahl">
      <legend>{L('Teil', 'Part')}</legend>
      {#each TEILE as t (t.wert)}
        <label class="radio"><input type="radio" name="ko-mm-teil" value={t.wert} checked={ko.mmTeil === t.wert} onchange={() => (ko.mmTeil = t.wert)}>{L(t.de, t.en)}</label>
      {/each}
    </fieldset>
    {#if ko.mmTeil === 'verknuepfen'}
      <MmVerknuepfung {q} {daten} />
    {:else if ko.mmTeil === 'displays'}
      <JointDisplays {q} {daten} />
    {:else if ko.mmTeil === 'design'}
      <MmDesign {q} />
    {:else if ko.mmTeil === 'instrument'}
      <MmInstrument {q} {daten} />
    {:else}
      <MmSelbstpruefung {q} {daten} />
    {/if}
  {/if}
</div>

<style>
  .mm { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  h3 { margin: 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .fehler { margin: 0; color: var(--fehler, #b00020); }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .auswahl { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a1); }
  .auswahl legend { font-weight: 650; padding: 0; margin-bottom: var(--a1); }
  .radio { display: flex; gap: var(--a2); align-items: flex-start; min-height: 24px; }
  /* Zielgröße 24 px (WCAG 2.5.8) für alle Optionsfelder und Kästchen der Teile */
  .mm :global(input[type="radio"]), .mm :global(input[type="checkbox"]) { min-width: 24px; min-height: 24px; }
</style>
