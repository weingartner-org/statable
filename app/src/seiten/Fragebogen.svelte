<script lang="ts">
  import { tick } from 'svelte';
  import { s, L, Lp, melde } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { istXlsform, planAusXlsform, type FragebogenPlan } from '../lib/fragebogenplan';
  import { editorBefunde, setzeSprachen } from '../lib/fragebogenplan-editor';
  import { MAX_DATEI, PlanDateiFehler, planAlsDatei, planAusDatei, planDateiname } from '../lib/fragebogenplan-datei';
  import { aktuellerPlan, bilder, ed, entwurfInsProjekt, entwurfWartet, legeNeuenPlanAn, loeschePlan, nimmPlanAuf, plaene, pretestAnzahl, pretestInsProjekt, rueckgaengig, tue, verlaufLaenge, waehlePlan } from '../lib/fragebogen-editor.svelte';
  import { alleElemente } from '../lib/fragebogenplan-editor';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import Rechnet from '../bausteine/Rechnet.svelte';
  import FragebogenGliederung from '../bausteine/FragebogenGliederung.svelte';
  import FragebogenFormular from '../bausteine/FragebogenFormular.svelte';
  import FragebogenVorschau from '../bausteine/FragebogenVorschau.svelte';
  import FragebogenBefunde from '../bausteine/FragebogenBefunde.svelte';
  import FragebogenListen from '../bausteine/FragebogenListen.svelte';
  import FragebogenKodebuch from '../bausteine/FragebogenKodebuch.svelte';
  import FragebogenEingabe from '../bausteine/FragebogenEingabe.svelte';
  import FragebogenAbgleich from '../bausteine/FragebogenAbgleich.svelte';
  import { eingabenInsProjekt } from '../lib/eingabemaske.svelte';
  import FragebogenRueckfrage from '../bausteine/FragebogenRueckfrage.svelte';
  import FragebogenExport from '../bausteine/FragebogenExport.svelte';
  import FragebogenPretest from '../bausteine/FragebogenPretest.svelte';
  import FragebogenSchluessel from '../bausteine/FragebogenSchluessel.svelte';
  import FragebogenCodes from '../bausteine/FragebogenCodes.svelte';
  import FragebogenSammelimport from '../bausteine/FragebogenSammelimport.svelte';
  import PapierbogenEinlesen from '../bausteine/PapierbogenEinlesen.svelte';
  import FragebogenRahmen from '../bausteine/FragebogenRahmen.svelte';
  import FragebogenDatenschutz from '../bausteine/FragebogenDatenschutz.svelte';

  /**
   * „Fragebogen planen (Fragebogenentwicklung)“ - Paket 2C. Gliederung, Bearbeiten und Vorschau nebeneinander (auf schmalen Bildschirmen untereinander),
   * dazu Antwortlisten, Kodebuch und Befunde. Der Plan liegt im Projekt (Autospeichern) oder, ohne Projekt, als Entwurf; „Als Datei speichern“ schreibt
   * `.statable-fragebogen.json`. Geöffnet werden auch XLSForm-Dateien (Kobo, ODK).
   */
  const plan = $derived(aktuellerPlan());
  const befunde = $derived(plan ? editorBefunde(plan) : []);
  const nFragen = (p: FragebogenPlan) => alleElemente(p).filter(e => e.art !== 'hinweis').length;
  let laedt = $state('');
  let importMeldungen = $state<string[]>([]);
  let einstellungenOffen = $state(false);
  const sprachName = (sp: string) => (sp === 'de' ? L('Deutsch', 'German') : sp === 'en' ? L('Englisch', 'English') : sp);

  /** Neuer Plan: Der Knopf, der gedrückt wurde, verschwindet (oder der Plan baut sich neu auf); der Fokus geht auf die Überschrift „Gliederung“, nicht ins Nichts. */
  async function neuerFragebogen() {
    legeNeuenPlanAn();
    await tick();
    setTimeout(() => (document.getElementById('fb-gl-t') ?? document.getElementById('fb-t'))?.focus(), 0);
  }
  /** Sprunglinks über der Gliederung: Das Formular einer Frage hat 60 und mehr Tab-Stopps; so kommt man ohne Durchtabben zu Vorlagen und Export. */
  function zuVorlagen() { const d = document.getElementById('fb-vorlagen') as HTMLDetailsElement | null; if (d) d.open = true; document.getElementById('fb-vorlagen-sum')?.focus(); }
  function zumExport() { document.getElementById('fb-ex-knopf')?.focus(); }
  /** Weitere Sprunglinks (Erheben, Stufe 3): Schlüssel, Verschicken, Antworten einlesen, Rahmentexte. Ziel ist jeweils die Überschrift (tabindex -1) oder der erste Knopf. */
  function zuStelle(id: string) { const e = document.getElementById(id); e?.scrollIntoView({ block: 'start' }); e?.focus(); }
  async function zumVerschicken() {
    const k = document.getElementById('fb-ex-knopf');
    if (k && k.getAttribute('aria-expanded') !== 'true') { k.click(); await tick(); }
    const z = document.querySelector<HTMLElement>('[data-testid="fb-versand-datei"]') ?? k;
    z?.scrollIntoView({ block: 'center' }); z?.focus();
  }

  /* ---------- Dateien */
  async function oeffne(f: File) {
    if (f.size > MAX_DATEI) { melde(L('Die Datei ist größer als 30 MB und wird nicht geöffnet.', 'The file is larger than 30 MB and is not opened.')); return; }
    laedt = f.name; importMeldungen = [];
    try {
      if (/\.json$/i.test(f.name)) {
        const r = planAusDatei(await f.text());
        const p = nimmPlanAuf(r.plan, r.bilder);
        melde(L(`Fragebogen „${p.titel[p.sprachen[0] ?? 'de'] ?? f.name}“ geöffnet.`, `Questionnaire "${p.titel[p.sprachen[0] ?? 'de'] ?? f.name}" opened.`));
      } else {
        const bytes = new Uint8Array(await f.arrayBuffer());
        if (!(await istXlsform(bytes))) { melde(L('Das ist keine XLSForm (Excel-Datei mit Blatt „survey“) und keine Fragebogen-Datei von Statable.', 'This is neither an XLSForm (Excel file with a sheet "survey") nor a Statable questionnaire file.')); return; }
        const { plan: p, meldungen } = await planAusXlsform(bytes, f.name);
        nimmPlanAuf(p);
        importMeldungen = meldungen.map(m => m.satz);
        melde(L(`XLSForm „${f.name}“ geöffnet: ${nFragen(p)} Fragen.${meldungen.length ? ` ${meldungen.length} Meldung(en) stehen unten.` : ''}`, `XLSForm "${f.name}" opened: ${nFragen(p)} questions.${meldungen.length ? ` ${meldungen.length} message(s) are listed below.` : ''}`));
      }
    } catch (e) {
      if (e instanceof PlanDateiFehler) melde(e.art === 'neuer' ? L('Diese Datei stammt aus einer neueren Fassung von Statable und lässt sich hier nicht öffnen.', 'This file comes from a newer version of Statable and cannot be opened here.')
        : e.art === 'zugross' ? L('Die Datei ist zu groß.', 'The file is too large.') : L('Die Datei lässt sich nicht lesen: Sie ist keine Fragebogen-Datei von Statable.', 'The file cannot be read: it is not a Statable questionnaire file.'));
      else melde(L('Die Datei ließ sich nicht öffnen.', 'The file could not be opened.'));
    } finally { laedt = ''; }
  }
  async function alsDatei() {
    if (!plan) return;
    const { herunterladen } = await import('../lib/export');
    herunterladen(new TextEncoder().encode(planAlsDatei(plan, bilder())), planDateiname(plan), 'application/json');
    sage(L(`Fragebogen als Datei „${planDateiname(plan)}“ gespeichert (Download).`, `Questionnaire saved as the file "${planDateiname(plan)}" (download).`));
  }
  function planLoeschen() {
    if (!plan) return;
    const p = plan, titel = p.titel[p.sprachen[0] ?? 'de'] || p.id;
    ed.rueckfrage = {
      titel: L('Ganzen Fragebogen löschen?', 'Delete the whole questionnaire?'),
      text: L(`„${titel}“ mit ${nFragen(p)} Fragen wird gelöscht, samt Bildern. Das lässt sich nicht rückgängig machen. Speichern Sie ihn vorher als Datei, wenn Sie ihn noch brauchen.`, `"${titel}" with ${nFragen(p)} questions will be deleted, including images. This cannot be undone. Save it as a file first if you still need it.`),
      ja: L('Fragebogen löschen', 'Delete questionnaire'),
      tun: () => { loeschePlan(p.id); sage(L('Fragebogen gelöscht.', 'Questionnaire deleted.')); }
    };
  }
  function entwurfUebernehmen() { eingabenInsProjekt(); pretestInsProjekt(); const n = entwurfInsProjekt(); if (n) melde(Lp(n, 'Der Entwurf liegt jetzt im Projekt.', `${n} Entwürfe liegen jetzt im Projekt.`, 'The draft is now in the project.', `${n} drafts are now in the project.`)); }

  /* ---------- Plan-Einstellungen */
  function setzeTitel(sp: string, t: string) { tue(L(`Titel des Fragebogens (${sp}) geändert.`, `Questionnaire title (${sp}) changed.`), p => ({ ...p, titel: { ...p.titel, [sp]: t } })); }
  function sprachWechsel(sp: string, an: boolean) {
    if (!plan) return;
    const jetzt = plan.sprachen, neu = an ? [...jetzt, sp] : jetzt.filter(x => x !== sp);
    if (!neu.length) { sage(L('Mindestens eine Sprache bleibt.', 'At least one language stays.')); return; }
    tue(an ? L(`Sprache ${sprachName(sp)} hinzugefügt: Es gibt jetzt ein Feld mehr je Text.`, `Language ${sprachName(sp)} added: there is now one more field per text.`) : L(`Sprache ${sprachName(sp)} entfernt. Die Texte in dieser Sprache sind weg; mit Rückgängig kommen sie zurück.`, `Language ${sprachName(sp)} removed. The texts in this language are gone; Undo brings them back.`), p => setzeSprachen(p, neu));
  }
  function einst(feld: 'fortschritt' | 'zurueck' | 'pretest', an: boolean, text: string) { tue(text, p => ({ ...p, einstellungen: { ...p.einstellungen, [feld]: an } })); }

  /* Strg+Z nimmt auf dieser Seite die letzte Änderung am Fragebogen zurück (in einem Textfeld gilt das Zurücknehmen des Textes). */
  function taste(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'z') return;
    const z = e.target as HTMLElement | null;
    if (z && (z.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(z.tagName)) || document.querySelector('dialog[open]')) return;
    if (!verlaufLaenge()) return;
    e.preventDefault(); e.stopPropagation(); rueckgaengig();
  }
  const ansichten = $derived<{ id: typeof ed.ansicht; text: string }[]>([
    { id: 'gliederung', text: L('Gliederung und Bearbeiten', 'Outline and editing') },
    { id: 'listen', text: L('Antwortlisten', 'Answer lists') },
    { id: 'kodebuch', text: L('Kodebuch', 'Codebook') },
    { id: 'eingabe', text: L('Daten eingeben (Eingabemaske)', 'Enter data (input mask)') },
    { id: 'abgleich', text: L('Abgleich und Protokoll', 'Comparison and protocol') }
  ]);
</script>

<svelte:window onkeydown={taste} />

<div class="tisch ohne-rand"><article class="blatt fbp" aria-label={L('Fragebogen planen', 'Plan a questionnaire')}>
  <SeitenKopf titel={L('Fragebogen planen (Fragebogenentwicklung)', 'Plan a questionnaire (questionnaire development)')} titelId="fb-t" fokussierbar hilfe={{ id: 'fragebogen-planen', text: L('Hilfe zum Fragebogen planen', 'Help on planning a questionnaire') }} zurueck />
  <p class="heft-text">{L('Ein Fragebogen-Plan ist die Grundlage für alles Weitere: Export, Papierbogen, Eingabemaske und Auswertung. Sie legen Seiten, Fragen und Antworten an; Statable prüft sie nach festen Regeln. Die Hinweise sind Vorschläge. Was passt, entscheiden Sie.', 'A questionnaire plan is the basis for everything that follows: export, paper form, data entry form and analysis. You create pages, questions and answers; Statable checks them against fixed rules. The notes are suggestions. You decide what fits.')}</p>

  {#if !s.projekt}
    <p class="heft-text hinweis-ohne"><Icon n="hinweis" /><span>{L('Es ist kein Projekt geöffnet. Der Fragebogen bleibt nur in dieser Sitzung erhalten. Speichern Sie ihn mit „Als Datei speichern“ oder öffnen Sie ein Projekt, dann wird er mit gespeichert.', 'No project is open. The questionnaire only stays for this session. Save it with "Save as file", or open a project and it is saved along with it.')}</span></p>
  {:else if !entwurfWartet()}
    <p class="hilfe">{L(`Der Fragebogen wird automatisch mit dem Projekt „${s.projekt.name}“ gespeichert.`, `The questionnaire is saved automatically with the project "${s.projekt.name}".`)}</p>
  {:else}
    <div class="banner ruhig"><Icon n="hinweis" /><p>{L('Sie haben einen Fragebogen ohne Projekt angelegt. Ins Projekt übernehmen, damit er mit gespeichert wird?', 'You created a questionnaire without a project. Move it into the project so it is saved along with it?')}</p>
      <button class="k" type="button" onclick={entwurfUebernehmen}>{L('Ins Projekt übernehmen', 'Move into the project')}</button></div>
  {/if}

  <div class="werkzeug" role="group" aria-label={L('Fragebogen', 'Questionnaire')}>
    {#if plaene().length > 1 && plan}
      <div class="eingabe">
        <label for="fb-plan">{L('Fragebogen', 'Questionnaire')}</label>
        <select id="fb-plan" value={plan.id} onchange={(e) => waehlePlan(e.currentTarget.value)}>{#each plaene() as p (p.id)}<option value={p.id}>{p.titel[p.sprachen[0] ?? 'de'] || p.id}</option>{/each}</select>
      </div>
    {/if}
    <button class="k" type="button" onclick={() => void neuerFragebogen()}><Icon n="plus" />{L('Neuer Fragebogen', 'New questionnaire')}</button>
    <label class="k">{L('Datei öffnen (Fragebogen oder XLSForm)', 'Open file (questionnaire or XLSForm)')}<input type="file" class="nur-vorleser" accept=".json,.xlsx,.xlsm,.xls,.ods" onchange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (f) void oeffne(f); }}></label>
    {#if plan}
      <button class="k" type="button" onclick={() => void alsDatei()}><Icon n="download" />{L('Als Datei speichern', 'Save as file')}</button>
      <button class="k leise" type="button" aria-disabled={verlaufLaenge() ? undefined : 'true'} onclick={() => { if (verlaufLaenge()) rueckgaengig(); else sage(L('Noch nichts zum Rückgängigmachen.', 'Nothing to undo yet.')); }}><Icon n="rueck" />{L('Rückgängig', 'Undo')}{#if verlaufLaenge()}{' '}({verlaufLaenge()}){/if}</button>
      <button class="k leise" type="button" onclick={planLoeschen}><Icon n="zu" />{L('Fragebogen löschen', 'Delete questionnaire')}</button>
    {/if}
  </div>
  {#if plan}<FragebogenExport {plan} />{/if}
  {#if laedt}<p class="heft-text"><Rechnet text={L(`„${laedt}“ wird gelesen …`, `Reading "${laedt}" …`)} /></p>{/if}

  {#if importMeldungen.length}
    <section class="meldungen" aria-label={L('Meldungen beim Öffnen', 'Messages on opening')}>
      <h2>{L('Beim Öffnen der XLSForm', 'On opening the XLSForm')}</h2>
      <p class="hilfe">{L('Was Statable nicht kann, wurde übersprungen oder umgerechnet und steht hier. Nichts geschieht still.', 'What Statable cannot do was skipped or converted and is listed here. Nothing happens silently.')}</p>
      <ul>{#each importMeldungen as m, i (i)}<li>{m}</li>{/each}</ul>
      <button class="k leise" type="button" onclick={() => (importMeldungen = [])}>{L('Meldungen schließen', 'Close messages')}</button>
    </section>
  {/if}

  {#if !plan}
    <section class="leer-start" aria-label={L('Anfangen', 'Getting started')}>
      <h2>{L('Anfangen', 'Getting started')}</h2>
      <p class="heft-text">{L('Legen Sie einen neuen Fragebogen an oder öffnen Sie einen vorhandenen: eine Fragebogen-Datei von Statable (.statable-fragebogen.json) oder eine XLSForm aus KoboToolbox oder ODK.', 'Create a new questionnaire or open an existing one: a Statable questionnaire file (.statable-fragebogen.json) or an XLSForm from KoboToolbox or ODK.')}</p>
      <button class="k haupt" type="button" onclick={() => void neuerFragebogen()}><Icon n="plus" />{L('Neuen Fragebogen anlegen', 'Create new questionnaire')}</button>
    </section>
  {:else}
    {#key plan.id}
      <details class="auf einst" bind:open={einstellungenOffen}>
        <summary>{L('Titel, Sprachen und Einstellungen des Fragebogens', 'Title, languages and settings of the questionnaire')}</summary>
        <div class="einst-innen">
          <fieldset class="lok">
            <legend>{L('Titel des Fragebogens', 'Title of the questionnaire')}</legend>
            {#each plan.sprachen as sp (sp)}
              <div class="eingabe"><label for="fb-titel-{sp}">{L('Titel', 'Title')} ({sprachName(sp)})</label><input type="text" id="fb-titel-{sp}" lang={sp} value={plan.titel[sp] ?? ''} onchange={(e) => setzeTitel(sp, e.currentTarget.value)}></div>
            {/each}
          </fieldset>
          <fieldset class="lok">
            <legend>{L('Sprachen des Fragebogens', 'Languages of the questionnaire')}</legend>
            {#each ['de', 'en'] as sp (sp)}
              <label class="schalter"><input type="checkbox" checked={plan.sprachen.includes(sp)} onchange={(e) => sprachWechsel(sp, e.currentTarget.checked)}>{sprachName(sp)}</label>
            {/each}
            <p class="hilfe">{L('Für jede Sprache gibt es bei jedem Text ein eigenes Feld. Jede Sprache braucht einen Text; fehlende Texte erscheinen bei den Befunden.', 'Every language has its own field for every text. Every language needs a text; missing texts appear in the findings.')}</p>
          </fieldset>
          <fieldset class="lok">
            <legend>{L('Verhalten beim Ausfüllen', 'Behaviour when filling in')}</legend>
            <label class="schalter"><input type="checkbox" checked={plan.einstellungen.fortschritt} onchange={(e) => einst('fortschritt', e.currentTarget.checked, e.currentTarget.checked ? L('Fortschritt wird gezeigt.', 'Progress is shown.') : L('Fortschritt wird nicht gezeigt.', 'Progress is not shown.'))}>{L('Fortschritt zeigen („Seite 2 von 4“)', 'Show progress ("page 2 of 4")')}</label>
            <label class="schalter"><input type="checkbox" checked={plan.einstellungen.zurueck} onchange={(e) => einst('zurueck', e.currentTarget.checked, e.currentTarget.checked ? L('Zurückgehen ist erlaubt.', 'Going back is allowed.') : L('Zurückgehen ist nicht erlaubt.', 'Going back is not allowed.'))}>{L('Zurückgehen erlauben', 'Allow going back')}</label>
            <label class="schalter"><input type="checkbox" checked={plan.einstellungen.pretest} onchange={(e) => einst('pretest', e.currentTarget.checked, e.currentTarget.checked ? L('Pretest-Kommentare sind eingeschaltet.', 'Pretest comments are switched on.') : L('Pretest-Kommentare sind ausgeschaltet.', 'Pretest comments are switched off.'))}>{L('Pretest-Modus (Kommentar je Frage)', 'Pretest mode (comment per question)')}</label>
          </fieldset>
        </div>
      </details>

      <FragebogenSchluessel {plan} />

      <div class="ansicht" role="group" aria-label={L('Ansicht', 'View')}>
        {#each ansichten as a (a.id)}
          <button type="button" class="k" aria-pressed={ed.ansicht === a.id} onclick={() => { ed.ansicht = a.id; sage(a.text); }}>{a.text}</button>
        {/each}
      </div>

      {#if ed.ansicht === 'gliederung'}
        {#if plan.einstellungen.pretest || pretestAnzahl(plan)}<FragebogenPretest {plan} />{/if}
        <div class="sprung" role="group" aria-label={L('Sprunglinks', 'Jump links')}>
          <button class="k leise" type="button" onclick={zuVorlagen}>{L('Zu den Vorlagen', 'To the templates')}</button>
          <button class="k leise" type="button" onclick={zumExport}>{L('Zum Export', 'To the export')}</button>
          <a class="k leise" href="#planung">{L('Zur Planung (Datenmanagementplan, Präregistrierung)', 'To the planning (data management plan, preregistration)')}</a>
          <button class="k leise" type="button" onclick={() => zuStelle('fb-schl-t')}>{L('Zu „Antworten verschlüsseln“ (Schlüssel)', 'To "Encrypt answers" (key)')}</button>
          <button class="k leise" type="button" onclick={() => void zumVerschicken()}>{L('Zum Verschicken (Fragebogen-Datei, Link)', 'To sending out (questionnaire file, link)')}</button>
          <button class="k leise" type="button" onclick={() => zuStelle('fb-sam-t')}>{L('Zu „Antworten einlesen“', 'To "Read in answers"')}</button>
          <button class="k leise" type="button" onclick={() => zuStelle('fb-rt-t')}>{L('Zu den Rahmentexten', 'To the framing texts')}</button>
        </div>
        <div class="spalten">
          <FragebogenGliederung {plan} {befunde} />
          <FragebogenFormular {plan} {befunde} />
          <FragebogenVorschau {plan} />
        </div>
        <FragebogenBefunde {plan} {befunde} />
        <FragebogenRahmen {plan} />
        <FragebogenDatenschutz {plan} />
        <FragebogenCodes {plan} />
        <FragebogenSammelimport {plan} />
        <PapierbogenEinlesen {plan} />
      {:else if ed.ansicht === 'listen'}
        <FragebogenListen {plan} />
        <FragebogenBefunde {plan} {befunde} />
      {:else if ed.ansicht === 'eingabe'}
        <FragebogenEingabe {plan} />
      {:else if ed.ansicht === 'abgleich'}
        <FragebogenAbgleich {plan} />
      {:else}
        <FragebogenKodebuch {plan} />
        <FragebogenBefunde {plan} {befunde} />
      {/if}
    {/key}
  {/if}
</article></div>

<FragebogenRueckfrage />

<style>
  .fbp { display: flex; flex-direction: column; gap: var(--a3); }
  .werkzeug { display: flex; flex-wrap: wrap; gap: var(--a2); align-items: flex-end; }
  .hinweis-ohne { display: flex; gap: var(--a2); align-items: flex-start; margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .meldungen { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); display: flex; flex-direction: column; gap: var(--a2); align-items: flex-start; }
  .meldungen h2, .leer-start h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .meldungen ul { margin: 0; padding-inline-start: var(--a5); }
  .leer-start { display: flex; flex-direction: column; gap: var(--a3); align-items: flex-start; }
  .einst-innen { display: flex; flex-wrap: wrap; gap: var(--a4); margin-top: var(--a3); }
  .lok { border: 0; padding: 0; margin: 0; min-width: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .lok legend { font-size: var(--gr-klein); font-weight: 650; color: var(--tinte-2); padding: 0 0 var(--a1); }
  .schalter { display: flex; gap: var(--a2); align-items: center; }
  .sprung { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .ansicht { display: flex; flex-wrap: wrap; gap: var(--a1); }
  .ansicht .k[aria-pressed='true'] { background: var(--akzent); border-color: var(--akzent); color: var(--tinte-auf-akzent); }
  .spalten { display: grid; grid-template-columns: minmax(15rem, 1fr) minmax(20rem, 1.5fr) minmax(18rem, 1.2fr); gap: var(--a5); align-items: start; }
  :global(:where(:root.eng-1100)) .spalten { grid-template-columns: minmax(0, 1fr); }
</style>
