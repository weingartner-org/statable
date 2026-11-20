<script lang="ts">
  import { tick } from 'svelte';
  import { L, Lp, aktuelleSprache } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import { ed, tue } from '../lib/fragebogen-editor.svelte';
  import { anzeigeSprache } from '../lib/fragebogen-aktionen.svelte';
  import { EINORDNUNG, KEINE_RECHTSBERATUNG, mitDatenschutzTexten, offenePlatzhalter, type DatenschutzOptionen, type Rueckweg } from '../lib/datenschutzvorlage';
  import { dateiname } from '../lib/dateiname';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * „Teilnahme-Information und Einwilligung (Datenschutz-Vorlage)“ (Erheben, Stufe 3G). Kleines Formular, setzt die Vorlagentexte in Einleitung und Einwilligung des Plans.
   * Vorlage, keine Rechtsberatung. Was die Person selbst eintragen muss, steht in eckigen Klammern; die Zahl offener Stellen wird gezeigt.
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  const WEGE: { id: Rueckweg; text: string }[] = [
    { id: 'datei', text: L('Datei', 'File') }, { id: 'text', text: L('Text zum Kopieren', 'Text to copy') }, { id: 'qr', text: L('QR-Code', 'QR code') },
    { id: 'teilen', text: L('Teilen-Menü des Geräts', 'Share menu of the device') }, { id: 'station', text: L('Erhebungsstation', 'Survey station') },
  ];
  let offen = $state(false);
  let zweck = $state(''), dauer = $state(''), frist = $state(''), kontakt = $state(''), verantwortlich = $state('');
  let wege = $state<Rueckweg[]>(['datei', 'text']);
  let link = $state(false);
  let fehler = $state('');
  let offenePunkte = $state<string[] | null>(null);

  const uiSprache = $derived<'de' | 'en'>(aktuelleSprache() === 'de' ? 'de' : 'en');
  const sprache = $derived<'de' | 'en'>(anzeigeSprache(plan) === 'en' ? 'en' : 'de');
  const titel = $derived(plan.titel[sprache] || plan.titel[plan.sprachen[0] ?? ''] || plan.id);
  const hatText = $derived(!!(plan.einleitung?.[sprache]?.trim() || plan.einwilligung?.text?.[sprache]?.trim()));

  function optionen(): DatenschutzOptionen | null {
    const o: DatenschutzOptionen = { wege, link };
    if (dauer.trim()) {
      const n = Number(dauer.trim());
      if (!Number.isInteger(n) || n < 1 || n > 600) return null;
      o.dauerMinuten = n;
    }
    if (zweck.trim()) o.zweck = zweck.trim();
    if (frist.trim()) o.loeschfrist = frist.trim();
    if (kontakt.trim()) o.kontakt = kontakt.trim();
    if (verantwortlich.trim()) o.verantwortlich = verantwortlich.trim();
    return o;
  }
  function schalteWeg(id: Rueckweg, an: boolean) { wege = an ? [...new Set([...wege, id])] : wege.filter(w => w !== id); }

  function einsetzen() {
    const o = optionen();
    if (!o) {
      fehler = L('Die Dauer ist eine ganze Zahl in Minuten von 1 bis 600, zum Beispiel 10.', 'The duration is a whole number of minutes from 1 to 600, for example 10.');
      sage(fehler, 'dringend');
      void tick().then(() => document.getElementById('fb-ds-dauer')?.focus());
      return;
    }
    fehler = '';
    const tun = () => {
      const neu = mitDatenschutzTexten(plan, sprache, o);
      tue(L('Vorlage Teilnahme-Information und Einwilligung eingesetzt.', 'Template for participant information and consent inserted.'), p => ({ ...p, einleitung: neu.einleitung, einwilligung: neu.einwilligung }));
      offenePunkte = offenePlatzhalter(`${neu.einleitung?.[sprache] ?? ''}\n${neu.einwilligung?.text[sprache] ?? ''}`);
      sage(offenePunkte.length
        ? Lp(offenePunkte.length, 'Vorlage eingesetzt. Noch 1 Stelle in eckigen Klammern auszufüllen.', `Vorlage eingesetzt. Noch ${offenePunkte.length} Stellen in eckigen Klammern auszufüllen.`, 'Template inserted. 1 place in square brackets still to fill in.', `Template inserted. ${offenePunkte.length} places in square brackets still to fill in.`)
        : L('Vorlage eingesetzt. Alle Angaben sind ausgefüllt.', 'Template inserted. All details are filled in.'), 'dringend');
    };
    if (hatText) {
      ed.rueckfrage = {
        titel: L('Vorhandene Texte ersetzen?', 'Replace existing texts?'),
        text: L('Einleitung und Einwilligung dieser Sprache enthalten schon Text. Die Vorlage ersetzt ihn. Mit „Rückgängig“ kommt der alte Text zurück, solange Sie die Seite nicht verlassen.', 'Introduction and consent of this language already contain text. The template replaces it. "Undo" brings the old text back as long as you stay on this page.'),
        ja: L('Vorlage einsetzen', 'Insert template'), tun,
      };
    } else tun();
  }

  async function alsWord() {
    const o = optionen();
    if (!o) { fehler = L('Die Dauer ist eine ganze Zahl in Minuten von 1 bis 600.', 'The duration is a whole number of minutes from 1 to 600.'); sage(fehler, 'dringend'); return; }
    fehler = '';
    try {
      const [{ teilnahmeWord }, { herunterladen }] = await Promise.all([import('../lib/datenschutzvorlage'), import('../lib/export')]);
      const name = `${dateiname(titel)} - ${L('Teilnahme-Information', 'Participant information')}.docx`;
      herunterladen(await teilnahmeWord(plan, sprache, o), name, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      sage(L(`Teilnahme-Information als Word-Datei „${name}“ gespeichert (Download).`, `Participant information saved as Word file "${name}" (download).`), 'dringend');
    } catch { fehler = L('Die Word-Datei ließ sich nicht erstellen.', 'The Word file could not be created.'); sage(fehler, 'dringend'); }
  }
</script>

<section class="ds" aria-labelledby="fb-ds-t">
  <div class="kopf"><h2 id="fb-ds-t">{L('Teilnahme-Information und Einwilligung (Datenschutz-Vorlage)', 'Participant information and consent (data protection template)')}</h2><HilfeLink id="fragebogen-planen" text={L('Hilfe zu den Datenschutz-Vorlagen', 'Help on the data protection templates')} /></div>
  <p class="hilfe">{L('Befragte müssen vor dem Ausfüllen erfahren, wozu die Befragung dient und was mit ihren Antworten geschieht (Teilnahme-Information), und zustimmen (Einwilligung). Statable liefert dafür eine Vorlage, die Sie anpassen.', 'Respondents must learn before filling in what the survey is for and what happens to their answers (participant information), and agree (consent). Statable provides a template that you adapt.')}</p>
  <p class="hinweis" data-testid="fb-ds-keine-rechtsberatung">{KEINE_RECHTSBERATUNG[uiSprache]}</p>
  <p class="hilfe">{EINORDNUNG[uiSprache]}</p>
  <button class="k" type="button" aria-expanded={offen} aria-controls="fb-ds-form" onclick={() => (offen = !offen)}>{L('Vorlage Teilnahme-Information einsetzen', 'Insert participant information template')}</button>

  {#if offen}
    <form class="formular" id="fb-ds-form" onsubmit={(e) => { e.preventDefault(); einsetzen(); }} aria-label={L('Vorlage Teilnahme-Information einsetzen', 'Insert participant information template')}>
      <div class="eingabe"><label for="fb-ds-zweck">{L('Zweck der Befragung (ein Satz)', 'Purpose of the survey (one sentence)')}</label><input id="fb-ds-zweck" type="text" autocomplete="off" bind:value={zweck}></div>
      <div class="eingabe">
        <label for="fb-ds-dauer">{L('Dauer in Minuten', 'Duration in minutes')}</label>
        <input id="fb-ds-dauer" type="text" inputmode="numeric" autocomplete="off" bind:value={dauer} aria-invalid={fehler ? 'true' : undefined} aria-describedby={fehler ? 'fb-ds-fehler' : undefined}>
      </div>
      <div class="eingabe"><label for="fb-ds-frist">{L('Löschfrist (zum Beispiel „zwei Jahre nach Abschluss der Arbeit“)', 'Deletion period (for example "two years after the work is finished")')}</label><input id="fb-ds-frist" type="text" autocomplete="off" bind:value={frist}></div>
      <div class="eingabe"><label for="fb-ds-kontakt">{L('Kontakt (Name, E-Mail oder Anschrift)', 'Contact (name, email or address)')}</label><input id="fb-ds-kontakt" type="text" autocomplete="off" bind:value={kontakt}></div>
      <div class="eingabe"><label for="fb-ds-verantw">{L('Verantwortliche Stelle (Person oder Hochschule)', 'Responsible body (person or university)')}</label><input id="fb-ds-verantw" type="text" autocomplete="off" bind:value={verantwortlich}></div>
      <fieldset class="eingabe feld">
        <legend>{L('Rückwege der Antwort', 'Return routes of the answer')}</legend>
        {#each WEGE as w (w.id)}
          <label class="schalter"><input type="checkbox" checked={wege.includes(w.id)} onchange={(e) => schalteWeg(w.id, e.currentTarget.checked)}>{w.text}</label>
        {/each}
        <label class="schalter"><input type="checkbox" bind:checked={link}>{L('Der Fragebogen wird über einen Link geöffnet', 'The questionnaire is opened through a link')}</label>
      </fieldset>
      {#if fehler}<p class="fehl" id="fb-ds-fehler">{fehler}</p>{/if}
      <div class="zeile">
        <button class="k haupt" type="submit">{L('Texte in den Fragebogen einsetzen', 'Insert texts into the questionnaire')}</button>
        <button class="k" type="button" onclick={() => void alsWord()}>{L('Als Word speichern', 'Save as Word')}</button>
      </div>
    </form>
  {/if}

  {#if offenePunkte}
    <div class="stand" data-testid="fb-ds-offen">
      {#if offenePunkte.length}
        <p>{Lp(offenePunkte.length, 'Noch 1 Stelle in eckigen Klammern auszufüllen:', `Noch ${offenePunkte.length} Stellen in eckigen Klammern auszufüllen:`, '1 place in square brackets still to fill in:', `${offenePunkte.length} places in square brackets still to fill in:`)}</p>
        <ul>{#each offenePunkte as p (p)}<li translate="no">{p}</li>{/each}</ul>
        <p class="hilfe">{L('Ersetzen Sie diese Stellen in der Einleitung des Fragebogens, bevor Sie ihn verschicken.', 'Replace these places in the introduction of the questionnaire before you send it out.')}</p>
      {:else}
        <p>{L('Alle Angaben sind ausgefüllt.', 'All details are filled in.')}</p>
      {/if}
    </div>
  {/if}
</section>

<style>
  .ds { display: flex; flex-direction: column; gap: var(--a3); align-items: flex-start; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3) var(--a4); }
  .kopf { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: center; }
  .ds h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .hinweis { margin: 0; font-weight: 600; border-inline-start: 4px solid var(--akzent); padding-inline-start: var(--a3); }
  .formular { display: flex; flex-direction: column; gap: var(--a3); max-width: 38rem; width: 100%; }
  .eingabe { display: flex; flex-direction: column; gap: var(--a1); }
  .eingabe label { font-size: var(--gr-klein); font-weight: 600; color: var(--tinte-2); }
  .feld { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a3); margin: 0; min-width: 0; }
  .feld legend { font-size: var(--gr-klein); font-weight: 650; color: var(--tinte-2); padding: 0 var(--a1); }
  .schalter { display: flex; gap: var(--a2); align-items: center; min-height: var(--ziel); }
  .schalter input { width: 1.4rem; height: 1.4rem; }
  .zeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .fehl { color: var(--fehler-text, var(--tinte)); font-weight: 600; font-size: var(--gr-klein); margin: 0; }
  .fehl::before { content: '! '; }
  .stand p { margin: 0; }
  .ds input[type='text'] { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a2) var(--a3); width: 100%; box-sizing: border-box; }
  .ds input[aria-invalid='true'] { border-width: 2px; }
  .ds input:focus-visible { border-color: var(--fokus); outline: 3px solid var(--fokus); outline-offset: 1px; }
</style>
