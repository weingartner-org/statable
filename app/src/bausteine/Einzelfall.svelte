<script module lang="ts">
  /** Das erste Verlassen des Modus in dieser Sitzung bekommt immer den methodischen Satz (auch wenn alle Fälle fertig sind). */
  let verlassenGewarnt = false;
</script>

<script lang="ts">
  /**
   * Einzelfall-Modus der IPA (Stufe A3, Prüfplan A-B8, Fachblatt Arbeitsweisen 5).
   * Im Modus sieht die Person nur den aktuellen Fall; die Sicht darauf baut `sichtbaresProjekt` (Seite). Dieser Baustein bekommt das GANZE Projekt,
   * zeigt daraus aber nur Fallnamen und Zahlen, nie Text aus Dokumenten (Test: `Einzelfall-ui.test.ts`).
   * Alles schreibt über `aendere()` (Rückgängig) mit `lib/einzelfall-modus.ts`; nach jeder Handlung kommt eine Ansage (nach dem Fokuswechsel),
   * der Fokus bleibt im Bereich. Kein modales Fenster: die Rückfrage beim Verlassen ist eine Zeile im Bereich (Esc = im Modus bleiben).
   * Statable bewertet nichts: „fertig“ ist allein die Entscheidung der Person.
   */
  import { tick } from 'svelte';
  import { L, Lp } from '../lib/sitzung.svelte';
  import { NACH_FOKUS_MS, sage, sageSpaeter } from '../lib/ansage';
  import { aendere } from '../lib/kodieren.svelte';
  import { fallFertig, fallNichtFertig, offeneFaelle, starteEinzelfall, verlasseEinzelfall } from '../lib/einzelfall-modus';
  import type { QualProjekt } from '../lib/qualprojekt';

  interface Props {
    /** das ganze Projekt (Namen der Fälle zum Wählen; nie Text verdeckter Fälle zeigen) */
    ganz: QualProjekt;
    /** Angebot beim Wechsel auf IPA (Modus noch aus) */
    angebot: boolean;
  }
  let { ganz, angebot }: Props = $props();


  const an = $derived(!!ganz.einzelfall?.an);
  const aktuell = $derived(ganz.einzelfall?.aktuell);
  const fertig = $derived(ganz.einzelfall?.fertig ?? []);
  const name = (id: string | undefined): string => ganz.faelle.find(f => f.id === id)?.name ?? '';
  const offen = $derived(offeneFaelle(ganz));
  const nFaelle = (n: number): string => Lp(n, '1 Fall', `${n} Fälle`, '1 case', `${n} cases`);
  const nFertig = $derived(Lp(fertig.length, '1 Fall fertig.', `${fertig.length} Fälle fertig.`, '1 case finished.', `${fertig.length} cases finished.`));
  const alleFertig = $derived(ganz.faelle.length > 0 && offen.length === 0);

  let wahl = $state('');
  const wahlOk = $derived(offen.includes(wahl) ? wahl : (offen[0] ?? ''));
  let frage = $state(false);

  /** Fokus in den Bereich, dann die Ansage nach dem Fokuswechsel (VoiceOver verschluckt sonst beides). */
  async function nach(id: string, satz: string) {
    await tick(); await tick();
    document.getElementById(id)?.focus();
    sageSpaeter(satz, NACH_FOKUS_MS);
  }

  async function starte() {
    const id = wahlOk;
    if (!id) { sage(L('Es gibt keinen offenen Fall zum Beginnen.', 'There is no open case to begin with.')); return; }
    const n = name(id);
    aendere(L(`Einzelfall-Modus mit „${n}“ zurückgenommen`, `Single-case mode with "${n}" undone`), q0 => starteEinzelfall(q0, id));
    await nach('ko-ez-status', L(`Einzelfall-Modus an. Sie sehen nur Fall ${n}. Die anderen Fälle sind verdeckt.`, `Single-case mode on. You see only case ${n}. The other cases are hidden.`));
  }

  async function markiereFertig() {
    const n = name(aktuell);
    const rest = offen.filter(f => f !== aktuell).length;
    aendere(L(`„${n}“ als fertig markiert, zurückgenommen`, `"${n}" marked as finished, undone`), q0 => fallFertig(q0));
    if (rest === 0) await nach('ko-ez-status', L(`Fall ${n} ist fertig. Alle Fälle sind fertig. Für Gruppen-Erfahrungsthemen den Einzelfall-Modus verlassen.`, `Case ${n} is finished. All cases are finished. To work on group experiential themes, leave single-case mode.`));
    else await nach('ko-ez-naechster', L(`Fall ${n} ist fertig. Noch ${nFaelle(rest)} offen. Wählen Sie den nächsten Fall.`, `Case ${n} is finished. ${nFaelle(rest)} still open. Choose the next case.`));
  }

  async function weiter() {
    const id = wahlOk;
    if (!id) return;
    const n = name(id);
    aendere(L(`Wechsel zu „${n}“ zurückgenommen`, `Switch to "${n}" undone`), q0 => starteEinzelfall(q0, id));
    await nach('ko-ez-status', L(`Sie sehen jetzt nur Fall ${n}.`, `You now see only case ${n}.`));
  }

  async function wiederOeffnen(id: string) {
    const n = name(id);
    aendere(L(`„${n}“ wieder auf fertig gesetzt`, `"${n}" set to finished again`), q0 => fallNichtFertig(q0, id));
    await nach('ko-ez-status', L(`Fall ${n} ist wieder offen und kann gewählt werden.`, `Case ${n} is open again and can be chosen.`));
  }

  async function verlassePruefen() {
    if (alleFertig && verlassenGewarnt) { await verlasse(); return; }
    frage = true;
    await tick(); await tick();
    document.getElementById('ko-ez-bleiben')?.focus();
  }
  async function verlasse() {
    verlassenGewarnt = true; frage = false;
    aendere(L('Verlassen des Einzelfall-Modus zurückgenommen', 'Leaving single-case mode undone'), q0 => verlasseEinzelfall(q0));
    await nach('ko-ez-status', L('Einzelfall-Modus verlassen. Alle Fälle sind wieder sichtbar.', 'Single-case mode left. All cases are visible again.'));
  }
  async function bleiben() {
    verlassenGewarnt = true; frage = false;
    await nach('ko-ez-verlassen', L('Sie bleiben im Einzelfall-Modus.', 'You stay in single-case mode.'));
  }
  const frageTaste = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); void bleiben(); } };
</script>

<div class="ez" data-angebot={angebot ? "ja" : undefined}>
  {#if an}
    <p class="stark" id="ko-ez-status" tabindex="-1" data-nolink>
      {#if aktuell}
        {L(`Einzelfall-Modus: Sie sehen nur Fall ‚${name(aktuell)}‘.`, `Single-case mode: you see only case '${name(aktuell)}'.`)} {nFertig}
      {:else}
        {L('Einzelfall-Modus: Zurzeit ist kein Fall geöffnet, es ist nichts zu sehen.', 'Single-case mode: no case is open at the moment, there is nothing to see.')} {nFertig}
      {/if}
    </p>

    {#if aktuell}
      <div class="knopfzeile"><button class="k haupt" id="ko-ez-fertig" type="button" onclick={() => void markiereFertig()}>{L('Fall als fertig markieren', 'Mark case as finished')}</button></div>
    {:else if alleFertig}
      <p class="hilfe" id="ko-ez-alle">{L('Alle Fälle sind fertig. Für Gruppen-Erfahrungsthemen den Einzelfall-Modus verlassen.', 'All cases are finished. To work on group experiential themes, leave single-case mode.')}</p>
    {:else if offen.length}
      <div class="feld">
        <label for="ko-ez-naechster">{L('Nächster Fall', 'Next case')}</label>
        <select id="ko-ez-naechster" value={wahlOk} onchange={(ev) => (wahl = ev.currentTarget.value)}>
          {#each offen as id (id)}<option value={id}>{name(id)}</option>{/each}
        </select>
      </div>
      <div class="knopfzeile"><button class="k haupt" id="ko-ez-weiter" type="button" onclick={() => void weiter()}>{L('Weiter mit diesem Fall', 'Continue with this case')}</button></div>
    {:else}
      <p class="hilfe">{L('Es gibt keine Fälle. Legen Sie Fälle an und ordnen Sie ihnen Dokumente zu.', 'There are no cases. Create cases and assign documents to them.')}</p>
    {/if}

    {#if fertig.length}
      <ul class="fertig" aria-label={L('Fertige Fälle', 'Finished cases')} data-nolink>
        {#each fertig as id (id)}
          <li><span>{name(id)}</span> <button class="k leise" type="button" onclick={() => void wiederOeffnen(id)}>{L(`Wieder öffnen: ${name(id)}`, `Reopen: ${name(id)}`)}</button></li>
        {/each}
      </ul>
    {/if}

    <div class="knopfzeile"><button class="k" id="ko-ez-verlassen" type="button" onclick={() => void verlassePruefen()}>{L('Einzelfall-Modus verlassen', 'Leave single-case mode')}</button></div>

    {#if frage}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions (Esc ist nur eine zusätzliche Abkürzung für „Im Modus bleiben“) -->
      <div id="ko-ez-frage" class="rueckfrage" role="group" aria-labelledby="ko-ez-frage-t" onkeydown={frageTaste}>
        <p id="ko-ez-frage-t">{alleFertig
          ? L('Wenn Sie den Einzelfall-Modus verlassen, sehen Sie wieder alle Fälle zugleich. Die Interpretative Phänomenologische Analyse (IPA) liest Fall für Fall; jetzt, wo alle Fälle fertig sind, können Sie über die Fälle hinweg lesen.', 'If you leave the mode, you see all cases at once again. Interpretative phenomenological analysis (IPA) reads case by case; now that all cases are finished, you can read across cases.')
          : L('Die Interpretative Phänomenologische Analyse (IPA) liest Fall für Fall. Wenn Sie den Einzelfall-Modus jetzt verlassen, sehen Sie die anderen Fälle schon, bevor jeder Fall für sich fertig gedeutet ist. Sie können später jederzeit wieder einsteigen.', 'Interpretative phenomenological analysis (IPA) reads case by case. If you leave the mode now, you see the other cases before each case has been interpreted on its own. You can re-enter at any time.')}</p>
        <div class="knopfzeile">
          <button class="k" id="ko-ez-trotzdem" type="button" onclick={() => void verlasse()}>{L('Trotzdem verlassen', 'Leave anyway')}</button>
          <button class="k haupt" id="ko-ez-bleiben" type="button" onclick={() => void bleiben()}>{L('Im Modus bleiben', 'Stay in the mode')}</button>
        </div>
      </div>
    {/if}
  {:else}
    <p class="stark" id="ko-ez-status" tabindex="-1" data-nolink>{L('Einzelfall-Modus aus.', 'Single-case mode off.')}</p>
    <p class="hilfe">{L('Der Einzelfall-Modus verdeckt alle anderen Fälle, bis ein Fall fertig ist: Sie lesen und deuten Fall für Fall. Sie können ihn jederzeit verlassen.', 'The mode hides all other cases until a case is finished: you read and interpret case by case. You can leave it at any time.')}</p>
    {#if ganz.faelle.length === 0}
      <p class="hilfe">{L('Es gibt noch keine Fälle. Legen Sie Fälle an und ordnen Sie ihnen Dokumente zu (Bereich „Fälle und Variablen“).', 'There are no cases yet. Create cases and assign documents to them ("Cases and variables" area).')}</p>
    {:else if offen.length}
      <div class="feld">
        <label for="ko-ez-beginn">{L('Mit welchem Fall beginnen Sie?', 'Which case do you begin with?')}</label>
        <select id="ko-ez-beginn" value={wahlOk} onchange={(ev) => (wahl = ev.currentTarget.value)}>
          {#each offen as id (id)}<option value={id}>{name(id)}</option>{/each}
        </select>
      </div>
      <div class="knopfzeile"><button class="k haupt" id="ko-ez-start" type="button" onclick={() => void starte()}>{L('Einzelfall-Modus starten', 'Start single-case mode')}</button></div>
    {:else}
      <p class="hilfe">{L('Alle Fälle sind fertig. Mit „Wieder öffnen“ können Sie einen Fall noch einmal bearbeiten.', 'All cases are finished. With "Reopen" you can work on a case again.')}</p>
    {/if}
    {#if fertig.length}
      <ul class="fertig" aria-label={L('Fertige Fälle', 'Finished cases')} data-nolink>
        {#each fertig as id (id)}
          <li><span>{name(id)}</span> <button class="k leise" type="button" onclick={() => void wiederOeffnen(id)}>{L(`Wieder öffnen: ${name(id)}`, `Reopen: ${name(id)}`)}</button></li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .ez { display: flex; flex-direction: column; gap: var(--a2); min-width: 0; }
  .ez p { margin: 0; }
  .stark { font-weight: 600; }

  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); }
  .feld { display: flex; flex-direction: column; gap: var(--a1); }
  select { min-height: 24px; }
  .knopfzeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .fertig { margin: 0; padding-inline-start: var(--a4); display: flex; flex-direction: column; gap: var(--a2); }
  .rueckfrage { display: flex; flex-direction: column; gap: var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); }
</style>
