<script lang="ts">
  import { L, Lp } from '../lib/sitzung.svelte';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import { tue } from '../lib/fragebogen-editor.svelte';
  import { offenePlatzhalter } from '../lib/datenschutzvorlage';
  import { mitAbschluss, mitEinleitung, mitEinwilligungAn, mitEinwilligungPflicht, mitEinwilligungText } from '../lib/fragebogen-rahmen';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * „Einleitung, Einwilligung und Abschluss (Rahmentexte)“: ein Feld je Sprache des Plans. Übernommen wird beim Verlassen des Feldes (`change`),
   * über dieselbe Funktion `tue` wie im Formular (Verlauf, Rückgängig, Ansage). Leeres Feld = Eigenschaft entfällt.
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  const sprachName = (sp: string) => (sp === 'de' ? L('Deutsch', 'German') : sp === 'en' ? L('Englisch', 'English') : sp);
  const offen = (t: string | undefined) => offenePlatzhalter(t ?? '').length;
  const an = $derived(!!plan.einwilligung);
  const warnung = (t: string | undefined) => {
    const n = offen(t);
    return Lp(n, 'Achtung: Noch 1 Stelle in eckigen Klammern auszufüllen.', `Achtung: Noch ${n} Stellen in eckigen Klammern auszufüllen.`, 'Warning: 1 place in square brackets still to fill in.', `Warning: ${n} places in square brackets still to fill in.`);
  };
  // Handler außerhalb des Tags: sonst hält der Formular-Wächter das Wort „required“ im englischen Text für ein Attribut
  function einwilligungAn(e: Event & { currentTarget: HTMLInputElement }) {
    const an = e.currentTarget.checked;
    tue(an ? L('Einwilligung verlangt.', 'Consent required.') : L('Einwilligung entfernt.', 'Consent removed.'), p => mitEinwilligungAn(p, an));
  }
  function einwilligungPflicht(e: Event & { currentTarget: HTMLInputElement }) {
    const an = e.currentTarget.checked;
    tue(an ? L('Einwilligung ist Pflicht.', 'Consent is required.') : L('Einwilligung ist freiwillig.', 'Consent is optional.'), p => mitEinwilligungPflicht(p, an));
  }
</script>

<section class="rt" aria-label={L('Rahmentexte bearbeiten', 'Edit framing texts')}>
  <div class="kopf"><h2 id="fb-rt-t" tabindex="-1">{L('Einleitung, Einwilligung und Abschluss (Rahmentexte)', 'Introduction, consent and closing (framing texts)')}</h2><HilfeLink id="fragebogen-planen" text={L('Hilfe zu den Rahmentexten', 'Help on the framing texts')} /></div>
  <p class="hilfe">{L('Die Einleitung steht vor der ersten Frage, die Einwilligung muss (wenn Pflicht) angekreuzt werden, der Abschlusstext steht am Ende. Eine Datenschutz-Vorlage unten setzt hier Texte ein; ändern Sie sie danach nach Bedarf.', 'The introduction appears before the first question, consent must be ticked (if required), the closing text appears at the end. A data protection template below inserts texts here; adapt them afterwards as needed.')}</p>

  <fieldset class="lok">
    <legend>{L('Einleitung', 'Introduction')}</legend>
    {#each plan.sprachen as sp (sp)}
      <div class="eingabe">
        <label for="fb-rt-ein-{sp}">{L('Einleitung', 'Introduction')} ({sprachName(sp)})</label>
        <textarea id="fb-rt-ein-{sp}" lang={sp} rows="5" value={plan.einleitung?.[sp] ?? ''} aria-describedby={offen(plan.einleitung?.[sp]) ? `fb-rt-ein-${sp}-w` : undefined}
          onchange={(e) => tue(L(`Einleitung (${sp}) geändert.`, `Introduction (${sp}) changed.`), p => mitEinleitung(p, sp, e.currentTarget.value))}></textarea>
        {#if offen(plan.einleitung?.[sp])}<p class="warn" id="fb-rt-ein-{sp}-w">{warnung(plan.einleitung?.[sp])}</p>{/if}
      </div>
    {/each}
  </fieldset>

  <label class="schalter"><input type="checkbox" id="fb-rt-ew-an" checked={an} onchange={einwilligungAn}>{L('Einwilligung verlangen', 'Ask for consent')}</label>
  {#if an}
    <fieldset class="lok">
      <legend>{L('Text der Einwilligung', 'Consent text')}</legend>
      {#each plan.sprachen as sp (sp)}
        <div class="eingabe">
          <label for="fb-rt-ew-{sp}">{L('Einwilligung', 'Consent')} ({sprachName(sp)})</label>
          <textarea id="fb-rt-ew-{sp}" lang={sp} rows="4" value={plan.einwilligung?.text?.[sp] ?? ''} aria-describedby={offen(plan.einwilligung?.text?.[sp]) ? `fb-rt-ew-${sp}-w` : undefined}
            onchange={(e) => tue(L(`Einwilligungstext (${sp}) geändert.`, `Consent text (${sp}) changed.`), p => mitEinwilligungText(p, sp, e.currentTarget.value))}></textarea>
          {#if offen(plan.einwilligung?.text?.[sp])}<p class="warn" id="fb-rt-ew-{sp}-w">{warnung(plan.einwilligung?.text?.[sp])}</p>{/if}
        </div>
      {/each}
      <label class="schalter"><input type="checkbox" id="fb-rt-ew-pflicht" checked={plan.einwilligung?.pflicht ?? true} onchange={einwilligungPflicht}>{L('Pflicht (ohne Haken geht es nicht weiter)', 'Required (cannot continue without ticking)')}</label>
    </fieldset>
  {/if}

  <fieldset class="lok">
    <legend>{L('Abschlusstext', 'Closing text')}</legend>
    {#each plan.sprachen as sp (sp)}
      <div class="eingabe">
        <label for="fb-rt-abs-{sp}">{L('Abschlusstext', 'Closing text')} ({sprachName(sp)})</label>
        <textarea id="fb-rt-abs-{sp}" lang={sp} rows="3" value={plan.abschluss?.[sp] ?? ''} aria-describedby={'fb-rt-abs-h' + (offen(plan.abschluss?.[sp]) ? ` fb-rt-abs-${sp}-w` : '')}
          onchange={(e) => tue(L(`Abschlusstext (${sp}) geändert.`, `Closing text (${sp}) changed.`), p => mitAbschluss(p, sp, e.currentTarget.value))}></textarea>
        {#if offen(plan.abschluss?.[sp])}<p class="warn" id="fb-rt-abs-{sp}-w">{warnung(plan.abschluss?.[sp])}</p>{/if}
      </div>
    {/each}
    <p class="hilfe" id="fb-rt-abs-h">{L('Hier gehört die Rückgabe-Adresse hin, zum Beispiel die E-Mail der forschenden Person. Statable sendet nichts selbst.', 'This is the place for the return address, for example the email of the researcher. Statable sends nothing by itself.')}</p>
  </fieldset>
</section>

<style>
  .rt { display: flex; flex-direction: column; gap: var(--a3); align-items: flex-start; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3) var(--a4); }
  .kopf { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: center; }
  .rt h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .lok { border: 0; padding: 0; margin: 0; min-width: 0; width: 100%; max-width: 38rem; display: flex; flex-direction: column; gap: var(--a2); }
  .lok legend { font-size: var(--gr-klein); font-weight: 650; color: var(--tinte-2); padding: 0 0 var(--a1); }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); }
  .eingabe label { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); }
  .schalter { display: flex; gap: var(--a2); align-items: center; min-height: var(--ziel); }
  .schalter input { width: 1.4rem; height: 1.4rem; }
  .warn { margin: 0; font-weight: 600; font-size: var(--gr-klein); color: var(--fehler-text, var(--tinte)); }
  .warn::before { content: '! '; }
  .rt textarea { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a2) var(--a3); width: 100%; box-sizing: border-box; resize: vertical; }
  .rt textarea:focus-visible { border-color: var(--fokus); outline: 3px solid var(--fokus); outline-offset: 1px; }
</style>
