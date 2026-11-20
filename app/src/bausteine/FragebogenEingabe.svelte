<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import type { FragebogenPlan, Frage } from '../lib/fragebogenplan';
  import { eingabePlan, felderDesPlans, gezeigteFelder, mitFilterCodes, pruefeBogenNummer, pruefeFeld, type Antworten } from '../lib/doppeleingabe';
  import { anzeigeSprache, anzeigeTitel } from '../lib/fragebogen-aktionen.svelte';
  import { bildUrl, ed } from '../lib/fragebogen-editor.svelte';
  import { durchgangVon, em, leereDurchgang, loescheBogen, naechsteNummer, speichereBogen, type DurchgangId } from '../lib/eingabemaske.svelte';
  import Rechnet from './Rechnet.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * Eingabemaske (Paket 2F, „Daten eingeben (Eingabemaske)“): ein Papierbogen nach dem anderen, Feld für Feld nach dem Plan.
   * Die Fragen zeichnet die Fragetypen-Bibliothek im Modus `eingabe` (Code sichtbar, Code tippen wählt die Option, Prüfung beim Tippen, Wertelabel neben dem Feld).
   * Bedienung nur mit der Tastatur: Enter springt zum nächsten Feld, Strg+Enter speichert den Bogen und öffnet den nächsten.
   * Doppeleingabe: Durchgang A und B sind blind - B zeigt nichts aus A, auch nicht die Liste der erfassten Bögen.
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  let bib = $state.raw<typeof import('../ausfuellen/index') | null>(null);
  let ladefehler = $state(false);
  $effect(() => { void import('../ausfuellen/index').then(m => { bib = m; }).catch(() => { ladefehler = true; }); });

  let host = $state<HTMLElement>();
  let nrFeld = $state<HTMLInputElement>();
  let nrFehler = $state('');
  /** „Bogen 12 gespeichert“: steht vor der Hilfe des Nummernfelds und wird beim Fokus als Beschreibung mitgelesen (eine Ansage vor dem Fokuswechsel ging verloren). */
  let zuletzt = $state('');
  let sprache = $state('');
  let aktuell: Antworten = {};
  const spr = $derived(plan.sprachen.includes(sprache) ? sprache : anzeigeSprache(plan));
  const sprachName = (sp: string) => (sp === 'de' ? L('Deutsch', 'German') : sp === 'en' ? L('Englisch', 'English') : sp);
  const dg = $derived(durchgangVon(plan.id, em.durchgang));
  const bogenListe = $derived(Object.keys(dg));
  const fragen = $derived(new Map(felderDesPlans(plan).flatMap(f => (f.frage ? [[f.id, f.frage] as [string, Frage]] : []))));
  const felderZahl = $derived(felderDesPlans(plan).length);
  const DURCHGAENGE = $derived<{ id: DurchgangId; text: string; hilfe: string }[]>([
    { id: 'einfach', text: L('Einfach eingeben', 'Single entry'), hilfe: L('Ein Durchgang, kein Abgleich. Schneller, aber Tippfehler bleiben unbemerkt.', 'One pass, no comparison. Faster, but typing errors go unnoticed.') },
    { id: 'A', text: L('Doppeleingabe, Durchgang A', 'Double entry, pass A'), hilfe: L('Erster von zwei unabhängigen Durchgängen.', 'The first of two independent passes.') },
    { id: 'B', text: L('Doppeleingabe, Durchgang B', 'Double entry, pass B'), hilfe: L('Zweiter Durchgang, blind: Er zeigt nichts aus Durchgang A.', 'The second pass, blind: it shows nothing from pass A.') }
  ]);

  function neuZeichnen() { em.zaehler++; }
  async function waehleDurchgang(d: DurchgangId) {
    em.durchgang = d; em.bearbeite = ''; em.nr = ''; nrFehler = ''; zuletzt = ''; neuZeichnen();
    sage(L(`Durchgang gewählt: ${DURCHGAENGE.find(x => x.id === d)?.text}. ${Object.keys(durchgangVon(plan.id, d)).length} Bögen erfasst.`, `Pass chosen: ${DURCHGAENGE.find(x => x.id === d)?.text}. ${Object.keys(durchgangVon(plan.id, d)).length} questionnaires entered.`));
  }

  /* ---------- Maske zeichnen */
  const pruefeEingabe = (id: string, wert: unknown): string => {
    const f = fragen.get(id);
    if (f) { const r = pruefeFeld(plan, f, wert, spr); return r.stufe === 'fehler' ? r.text : ''; }
    return '';
  };
  $effect(() => {
    const m = bib, h = host, p = plan, sp = spr; void em.zaehler;
    if (!m || !h) return;
    untrack(() => {
      h.replaceChildren();
      const ep = eingabePlan(p, { de: 'Fragen des Bogens', en: 'Questions of the questionnaire' });
      const start: Antworten = em.bearbeite ? { ...(durchgangVon(p.id, em.durchgang)[em.bearbeite] ?? {}) } : {};
      aktuell = start;
      h.append(m.zeichneSeite(ep, ep.elemente[0]!, start, {
        sprache: sp, eng: false, modus: 'eingabe', zufallStart: 1,
        weiterText: L('Bogen speichern (Strg+Enter)', 'Save questionnaire (Ctrl+Enter)'),
        pruefeEingabe, bildUrl: d => bildUrl(p.id, d),
        beiAenderung: a => { aktuell = a; },
        beiWeiter: a => speichern(a)
      }));
    });
  });

  /* ---------- Speichern */
  const ohne = (d: Record<string, unknown>, k: string) => Object.fromEntries(Object.entries(d).filter(([x]) => x !== k));
  function nrPruefen(): boolean {
    const nr = em.nr.trim();
    const r = pruefeBogenNummer((em.bearbeite ? ohne(dg, em.bearbeite) : dg) as typeof dg, nr);
    nrFehler = r === 'leer' ? L('Bitte zuerst die Bogen-Nummer eingeben.', 'Please enter the questionnaire number first.')
      : r === 'doppelt' ? L(`Die Bogen-Nummer „${nr}“ gibt es in diesem Durchgang schon. Zum Ändern den Bogen in der Liste mit „Bearbeiten“ öffnen.`, `The questionnaire number "${nr}" already exists in this pass. To change it, open the questionnaire with "Edit" in the list.`) : '';
    if (nrFehler) sage(`${L('Fehler', 'Error')}: ${nrFehler}`, 'dringend');
    return r === 'ok';
  }
  /** Pflichtfragen ohne Antwort: auf Papier kann eine Antwort fehlen, darum eine Rückfrage statt einer Sperre. */
  function pflichtOffen(a: Antworten): string[] {
    const gezeigt = new Set(gezeigteFelder(plan, a)), aus: string[] = [];
    for (const s of plan.elemente) for (const el of s.elemente) {
      if (el.art === 'hinweis' || !el.pflicht?.an) continue;
      // Genannt wird der Fragetext (gekürzt), nicht der Variablenname: Der steht nicht auf dem Papierbogen.
      if (el.art === 'block') { if (el.items.some(i => gezeigt.has(i.id) && (a[i.id] === undefined || a[i.id] === null))) aus.push(`„${anzeigeTitel(plan, el)}“`); }
      else if (gezeigt.has(el.id) && pruefeFeld(plan, el, a[el.id], spr).stufe === 'rueckfrage') aus.push(`„${anzeigeTitel(plan, el)}“`);
    }
    return aus;
  }
  function speichern(a: Antworten) {
    if (!nrPruefen()) { nrFeld?.focus(); return; }
    const offen = pflichtOffen(a);
    if (offen.length) {
      ed.rueckfrage = {
        titel: L('Pflichtfragen ohne Antwort', 'Required questions without an answer'),
        text: L(`Diese Pflichtfragen sind leer: ${offen.join(', ')}. Auf dem Papierbogen kann eine Antwort fehlen. Den Bogen trotzdem speichern? Die Felder bleiben dann leer.`, `These required questions are empty: ${offen.join(', ')}. An answer can be missing on paper. Save the questionnaire anyway? The fields then stay empty.`),
        ja: L('Trotzdem speichern', 'Save anyway'),
        tun: () => ablegen(a)
      };
      return;
    }
    ablegen(a);
  }
  async function ablegen(a: Antworten) {
    const nr = em.nr.trim(), war = em.bearbeite, d = em.durchgang;
    speichereBogen(plan.id, d, nr, mitFilterCodes(plan, a), war);
    const letzte = war ? (Object.keys(durchgangVon(plan.id, d)).at(-1) ?? nr) : nr;
    em.bearbeite = ''; em.nr = naechsteNummer(letzte); nrFehler = '';
    zuletzt = L(`Zuletzt gespeichert: Bogen ${nr}.`, `Last saved: questionnaire ${nr}.`);
    neuZeichnen();
    await tick();
    nrFeld?.focus(); nrFeld?.select();
    // Kam die Bestätigung aus der Rückfrage („Trotzdem speichern“), schließt sich der Dialog erst danach und holt den Fokus weg: nochmals setzen.
    setTimeout(() => { if (document.activeElement !== nrFeld) { nrFeld?.focus(); nrFeld?.select(); } }, 120);
  }

  /* ---------- Liste der Bögen */
  const gezaehlt = (a: Antworten): string => {
    const g = gezeigteFelder(plan, a);
    return `${g.filter(f => a[f] !== undefined && a[f] !== null && a[f] !== '').length} / ${g.length}`;
  };
  async function bearbeiten(nr: string) {
    em.bearbeite = nr; em.nr = nr; nrFehler = ''; neuZeichnen();
    sage(L(`Bogen ${nr} wird bearbeitet.`, `Questionnaire ${nr} is being edited.`));
    await tick(); nrFeld?.focus();
  }
  function loeschen(nr: string) {
    ed.rueckfrage = {
      titel: L('Bogen löschen?', 'Delete questionnaire?'),
      text: L(`Bogen ${nr} wird aus diesem Durchgang gelöscht. Das lässt sich nicht rückgängig machen.`, `Questionnaire ${nr} is deleted from this pass. This cannot be undone.`),
      ja: L('Bogen löschen', 'Delete questionnaire'),
      tun: () => { loescheBogen(plan.id, em.durchgang, nr); if (em.bearbeite === nr) { em.bearbeite = ''; em.nr = ''; neuZeichnen(); } sage(L(`Bogen ${nr} gelöscht.`, `Questionnaire ${nr} deleted.`)); void tick().then(() => nrFeld?.focus()); }
    };
  }
  function durchgangLoeschen() {
    const n = bogenListe.length, d = em.durchgang;
    ed.rueckfrage = {
      titel: L('Ganzen Durchgang löschen?', 'Delete the whole pass?'),
      text: L(`Alle ${n} Bögen dieses Durchgangs werden gelöscht. Das lässt sich nicht rückgängig machen.`, `All ${n} questionnaires of this pass are deleted. This cannot be undone.`),
      ja: L('Durchgang löschen', 'Delete pass'),
      tun: () => { leereDurchgang(plan.id, d); em.bearbeite = ''; em.nr = ''; neuZeichnen(); sage(L('Durchgang gelöscht.', 'Pass deleted.')); }
    };
  }

  /* ---------- Tastatur: Enter = nächstes Feld, Strg+Enter = Bogen speichern */
  function naechstesFeld(von: HTMLElement) {
    const behaelter = Array.from(host?.querySelectorAll<HTMLElement>('[data-frage]') ?? []);
    const i = von === nrFeld ? -1 : behaelter.findIndex(c => c.contains(von));
    const ziel = behaelter[i + 1];
    if (!ziel) { host?.querySelector<HTMLElement>('[data-weiter]')?.focus(); return; }
    (ziel.querySelector<HTMLElement>('input:checked') ?? ziel.querySelector<HTMLElement>('input:not([hidden]), textarea, button'))?.focus();
  }
  function taste(e: KeyboardEvent) {
    if (e.key !== 'Enter' || e.altKey) return;
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); host?.querySelector<HTMLButtonElement>('[data-weiter]')?.click(); return; }
    const z = e.target as HTMLElement;
    if (e.shiftKey || !(z instanceof HTMLInputElement)) return;
    e.preventDefault(); naechstesFeld(z);
  }
</script>

<section class="em" role="group" aria-label={L('Daten eingeben (Eingabemaske)', 'Enter data (input mask)')} onkeydown={taste}>
  <div class="kopfzeile"><h2 id="fb-em-t">{L('Daten eingeben (Eingabemaske)', 'Enter data (input mask)')}</h2><HilfeLink id="papierboegen-eingeben" text={L('Hilfe zur Eingabemaske und zur doppelten Dateneingabe', 'Help on the input mask and double data entry')} /></div>
  <p class="heft-text">{L('Hier geben Sie Papierbögen ein, einen Bogen nach dem anderen, Feld für Feld nach dem Plan. Tippen Sie den Code der Antwort (zum Beispiel 3); die Antwort wird gewählt. Enter springt zum nächsten Feld, Strg+Enter speichert den Bogen und öffnet den nächsten. Jeder gespeicherte Bogen bleibt im Projekt: Sie können jederzeit aufhören.', 'Here you enter paper questionnaires, one after the other, field by field following the plan. Type the code of the answer (for example 3) and the answer is chosen. Enter jumps to the next field, Ctrl+Enter saves the questionnaire and opens the next one. Every saved questionnaire stays in the project: you can stop at any time.')}</p>

  <fieldset class="durchgang">
    <legend>{L('Durchgang', 'Pass')}</legend>
    {#each DURCHGAENGE as d (d.id)}
      <label class="opt"><input type="radio" name="fb-em-dg" value={d.id} checked={em.durchgang === d.id} onchange={() => void waehleDurchgang(d.id)} aria-describedby="fb-em-dg-{d.id}"><span>{d.text}</span></label>
      <span class="hilfe" id="fb-em-dg-{d.id}">{d.hilfe}</span>
    {/each}
  </fieldset>

  {#if plan.sprachen.length > 1}
    <div class="eingabe" style="max-width:16rem">
      <label for="fb-em-sprache">{L('Sprache des Bogens', 'Language of the questionnaire')}</label>
      <select id="fb-em-sprache" value={spr} onchange={(e) => { sprache = e.currentTarget.value; neuZeichnen(); }}>{#each plan.sprachen as sp (sp)}<option value={sp}>{sprachName(sp)}</option>{/each}</select>
    </div>
  {/if}

  {#if felderZahl === 0}
    <p class="heft-text leer">{L('Der Fragebogen hat noch keine Fragen. Fügen Sie in der Gliederung Fragen hinzu.', 'The questionnaire has no questions yet. Add questions in the outline.')}</p>
  {:else}
    <div class="bogen-nr">
      <label for="fb-em-nr">{L('Bogen-Nummer', 'Questionnaire number')} <span class="pflicht">({L('Pflicht', 'required')})</span></label>
      <input type="text" id="fb-em-nr" bind:this={nrFeld} bind:value={em.nr} autocomplete="off" required aria-required="true" aria-describedby="{zuletzt ? 'fb-em-nr-z ' : ''}fb-em-nr-h{nrFehler ? ' fb-em-nr-f' : ''}" aria-invalid={nrFehler ? 'true' : undefined}
        oninput={() => { nrFehler = ''; }} onchange={() => { if (em.nr.trim()) nrPruefen(); }}>
      {#if zuletzt}<span class="hilfe zuletzt" id="fb-em-nr-z">{zuletzt}</span>{/if}
      <span class="hilfe" id="fb-em-nr-h">{em.bearbeite ? L(`Sie ändern Bogen ${em.bearbeite}. Speichern überschreibt ihn.`, `You are changing questionnaire ${em.bearbeite}. Saving overwrites it.`) : L('Jeder Bogen hat in diesem Durchgang eine eigene Nummer, am besten die vom Papierbogen.', 'Every questionnaire has its own number in this pass, preferably the one on the paper.')}</span>
      {#if nrFehler}<p class="fehlertext" id="fb-em-nr-f"><span>{L('Fehler', 'Error')}: </span>{nrFehler}</p>{/if}
    </div>
    {#if ladefehler}
      <p class="heft-text">{L('Die Eingabemaske ließ sich nicht laden. Laden Sie die Seite neu.', 'The input mask could not be loaded. Reload the page.')}</p>
    {:else if !bib}
      <p class="heft-text"><Rechnet text={L('Eingabemaske wird geladen …', 'Loading the input mask …')} /></p>
    {/if}
    <div class="maske" bind:this={host}></div>
  {/if}

  <section class="liste" aria-labelledby="fb-em-liste-t">
    <h3 id="fb-em-liste-t">{L(`Erfasste Bögen in diesem Durchgang: ${bogenListe.length}`, `Questionnaires entered in this pass: ${bogenListe.length}`)}</h3>
    {#if em.durchgang === 'B'}<p class="hilfe">{L('Blind: Hier steht nur, was Sie in Durchgang B eingegeben haben.', 'Blind: only what you entered in pass B is shown here.')}</p>{/if}
    {#if bogenListe.length === 0}
      <p class="heft-text leer">{L('Noch kein Bogen gespeichert.', 'No questionnaire saved yet.')}</p>
    {:else}
      <div class="rolle" role="region" tabindex="0" aria-label={L('Tabelle der erfassten Bögen', 'Table of entered questionnaires')}>
        <table class="bt">
          <caption class="nur-vorleser">{L('Erfasste Bögen', 'Entered questionnaires')}</caption>
          <thead><tr><th scope="col">{L('Bogen-Nummer', 'Number')}</th><th scope="col">{L('Felder mit Antwort', 'Fields answered')}</th><th scope="col">{L('Aktionen', 'Actions')}</th></tr></thead>
          <tbody>
            {#each bogenListe as nr (nr)}
              <tr>
                <th scope="row">{nr}</th><td>{gezaehlt(dg[nr]!)}</td>
                <td class="akt">
                  <button class="k leise" type="button" onclick={() => void bearbeiten(nr)} aria-label={L(`Bogen ${nr} bearbeiten`, `Edit questionnaire ${nr}`)}>{L('Bearbeiten', 'Edit')}</button>
                  <button class="k leise" type="button" onclick={() => loeschen(nr)} aria-label={L(`Bogen ${nr} löschen`, `Delete questionnaire ${nr}`)}>{L('Löschen', 'Delete')}</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <button class="k leise" type="button" onclick={durchgangLoeschen}>{L('Diesen ganzen Durchgang löschen', 'Delete this whole pass')}</button>
    {/if}
  </section>
</section>

<style>
  .em { display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  .kopfzeile { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: baseline; }
  .em h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .em h3 { font: 650 var(--gr-h3, 1.05rem)/1.3 var(--schrift-ui); margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .leer { color: var(--tinte-2); }
  .zuletzt { font-weight: 650; color: var(--tinte); }
  .durchgang { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a1); }
  .durchgang legend { font-size: var(--gr-klein); font-weight: 650; color: var(--tinte-2); padding: 0 0 var(--a1); }
  .durchgang .opt { display: flex; gap: var(--a2); align-items: center; min-height: var(--ziel); }
  .durchgang .hilfe { margin-inline-start: calc(var(--a2) + 1.4rem); }
  .bogen-nr { display: flex; flex-direction: column; gap: var(--a1); max-width: 28rem; }
  .bogen-nr label { font-weight: 650; }
  .bogen-nr .pflicht { font-weight: 400; color: var(--tinte-2); }
  .bogen-nr input { font: inherit; min-height: var(--ziel); padding: var(--a1) var(--a2); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); background: var(--blatt, #fff); color: inherit; }
  .bogen-nr input[aria-invalid='true'] { outline: 2px solid var(--fehler, #a30000); outline-offset: 1px; }
  .fehlertext { margin: 0; padding: var(--a1) var(--a2); border-inline-start: 0.375rem solid var(--fehler, #a30000); font-weight: 650; }
  .maske { border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); background: #fff; color: #1a1a1a; min-width: 0; overflow-x: auto; }
  .liste { display: flex; flex-direction: column; gap: var(--a2); align-items: flex-start; }
  .rolle { position: relative; overflow-x: auto; max-width: 100%; }
  .rolle:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
  table.bt { border-collapse: collapse; }
  table.bt th, table.bt td { padding: var(--a1) var(--a3); text-align: start; border-bottom: 1px solid var(--linie); }
  .akt { display: flex; gap: var(--a1); flex-wrap: wrap; }
</style>
