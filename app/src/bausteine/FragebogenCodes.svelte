<script lang="ts">
  import { tick } from 'svelte';
  import { L } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import { tue, ed } from '../lib/fragebogen-editor.svelte';
  import { anzeigeSprache } from '../lib/fragebogen-aktionen.svelte';
  import { codesCsv, erzeugeCodes } from '../lib/einmalcodes';
  import { dateiname } from '../lib/dateiname';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * Einmal-Codes (Teilnahme-Codes), Paket 3D: Schalter „Code verlangen“, Codes erzeugen, Liste als CSV und Word, Haken „ausgegeben“ je Code.
   * Die Liste liegt im Plan (`plan.codes`) und damit im Projekt, aber nie in der Fragebogen-Datei. Ohne Server lässt sich doppeltes Ausfüllen nur erkennen, nicht verhindern.
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  const MAX_ZUGABE = 1000;
  let anzahl = $state('20');
  let fehler = $state('');
  const codes = $derived(plan.codes ?? []);
  const nAusgegeben = $derived(codes.filter(c => c.ausgegeben).length);
  const titel = $derived(plan.titel[plan.sprachen[0] ?? 'de'] || plan.id);

  function verlangen(an: boolean) {
    tue(an ? L('Der Fragebogen verlangt jetzt einen Einmal-Code.', 'The questionnaire now requires a one-time code.') : L('Der Fragebogen verlangt keinen Einmal-Code mehr.', 'The questionnaire no longer requires a one-time code.'), p => ({ ...p, codeVerlangt: an }));
  }
  function erzeugen() {
    const n = Number(anzahl.trim());
    if (!Number.isInteger(n) || n < 1 || n > MAX_ZUGABE) {
      fehler = L(`Bitte eine ganze Zahl von 1 bis ${MAX_ZUGABE} eingeben.`, `Please enter a whole number from 1 to ${MAX_ZUGABE}.`);
      sage(fehler, 'dringend');
      void tick().then(() => document.getElementById('fb-codes-anzahl')?.focus());
      return;
    }
    fehler = '';
    let neu: string[];
    try {
      const vorhanden = new Set(codes.map(c => c.code));
      neu = [];
      // Zufall kann (sehr selten) einen schon vorhandenen Code treffen: dann wird mehr gezogen und aussortiert.
      for (let runde = 0; neu.length < n && runde < 20; runde++) for (const c of erzeugeCodes(n - neu.length)) if (!vorhanden.has(c)) { vorhanden.add(c); neu.push(c); }
    } catch {
      fehler = L('Codes lassen sich in diesem Browser nicht sicher erzeugen (kein kryptografischer Zufall).', 'Codes cannot be created safely in this browser (no cryptographic randomness).');
      sage(fehler, 'dringend');
      return;
    }
    tue(L(`${neu.length} Einmal-Codes erzeugt. Die Liste hat jetzt ${codes.length + neu.length} Codes.`, `${neu.length} one-time codes created. The list now has ${codes.length + neu.length} codes.`),
      p => ({ ...p, codes: [...(p.codes ?? []), ...neu.map(code => ({ code }))] }));
  }
  function haken(code: string, an: boolean) {
    tue(an ? L(`Code ${code} als ausgegeben markiert.`, `Code ${code} marked as issued.`) : L(`Code ${code} nicht mehr als ausgegeben markiert.`, `Code ${code} no longer marked as issued.`),
      p => ({ ...p, codes: (p.codes ?? []).map(c => (c.code === code ? { ...c, ausgegeben: an } : c)) }));
  }
  function listeLoeschen() {
    const n = codes.length;
    ed.rueckfrage = {
      titel: L('Ganze Code-Liste löschen?', 'Delete the whole code list?'),
      text: L(`Alle ${n} Codes werden gelöscht, auch die Haken „ausgegeben“. Schon verteilte Codes gelten danach bei der Auswertung als unbekannt. Mit „Rückgängig“ kommt die Liste zurück, solange Sie die Seite nicht verlassen.`, `All ${n} codes will be deleted, including the "issued" ticks. Codes already handed out count as unknown in the analysis afterwards. "Undo" brings the list back as long as you stay on this page.`),
      ja: L('Liste löschen', 'Delete list'),
      tun: () => { tue(L('Code-Liste gelöscht.', 'Code list deleted.'), q => { const { codes: _c, ...rest } = q; return rest; }); }
    };
  }
  async function alsCsv() {
    if (!codes.length) { sage(L('Es gibt noch keine Codes.', 'There are no codes yet.')); return; }
    const { herunterladen } = await import('../lib/export');
    const name = `${dateiname(titel)} - ${L('Einmal-Codes', 'One-time codes')}.csv`;
    herunterladen(new TextEncoder().encode('﻿' + codesCsv(codes, anzeigeSprache(plan) === 'de')), name, 'text/csv;charset=utf-8');
    sage(L(`Liste als CSV „${name}“ gespeichert (Download).`, `List saved as CSV "${name}" (download).`), 'dringend');
  }
  async function alsWord() {
    if (!codes.length) { sage(L('Es gibt noch keine Codes.', 'There are no codes yet.')); return; }
    const { codesWord } = await import('../lib/fragebogenexport');
    const { herunterladen } = await import('../lib/export');
    const name = `${dateiname(titel)} - ${L('Einmal-Codes', 'One-time codes')}.docx`;
    herunterladen(await codesWord(plan, anzeigeSprache(plan)), name, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    sage(L(`Liste als Word-Datei „${name}“ gespeichert (Download).`, `List saved as Word file "${name}" (download).`), 'dringend');
  }
</script>

<section class="codes" aria-labelledby="fb-codes-t">
  <div class="kopf"><h2 id="fb-codes-t">{L('Einmal-Codes (Teilnahme-Codes)', 'One-time codes (participation codes)')}</h2><HilfeLink id="fragebogen-planen" text={L('Hilfe zu Einmal-Codes und Rücklaufquote', 'Help on one-time codes and response rate')} /></div>
  <p class="hilfe">{L('Ein Einmal-Code ist ein kurzer Zugangscode, den jede eingeladene Person genau einmal bekommt. So lässt sich später zählen, wie viele Eingeladene geantwortet haben (Rücklaufquote). Ohne Server lässt sich doppeltes Ausfüllen nur erkennen, nicht verhindern.', 'A one-time code is a short access code that each invited person gets exactly once. It lets you count later how many of those invited have answered (response rate). Without a server, filling in twice can only be detected, not prevented.')}</p>
  <label class="schalter"><input type="checkbox" checked={!!plan.codeVerlangt} onchange={(e) => verlangen(e.currentTarget.checked)}>{L('Code verlangen', 'Require a code')}</label>

  <div class="erzeugen">
    <div class="eingabe">
      <label for="fb-codes-anzahl">{L('Anzahl neuer Codes', 'Number of new codes')}</label>
      <input id="fb-codes-anzahl" type="text" inputmode="numeric" autocomplete="off" bind:value={anzahl} aria-describedby="fb-codes-anzahl-h{fehler ? ' fb-codes-fehler' : ''}" aria-invalid={fehler ? 'true' : undefined}>
      <span class="hilfe" id="fb-codes-anzahl-h">{L(`1 bis ${MAX_ZUGABE} auf einmal`, `1 to ${MAX_ZUGABE} at a time`)}</span>
    </div>
    <button class="k" type="button" onclick={erzeugen}>{L('Codes erzeugen', 'Create codes')}</button>
  </div>
  {#if fehler}<p class="fehler" id="fb-codes-fehler">{fehler}</p>{/if}

  {#if codes.length}
    <p class="stand" id="fb-codes-stand">{L(`${codes.length} Codes, davon ${nAusgegeben} als ausgegeben markiert.`, `${codes.length} codes, ${nAusgegeben} of them marked as issued.`)}</p>
    <div class="akt" role="group" aria-label={L('Liste ausgeben', 'Output the list')}>
      <button class="k" type="button" onclick={() => void alsCsv()}>{L('Liste als CSV speichern', 'Save list as CSV')}</button>
      <button class="k" type="button" onclick={() => void alsWord()}>{L('Liste als Word speichern (eine Zeile je Code)', 'Save list as Word (one row per code)')}</button>
      <button class="k leise" type="button" onclick={listeLoeschen}>{L('Liste löschen', 'Delete list')}</button>
    </div>
    <div class="rolle" role="region" tabindex="0" aria-label={L('Tabelle der Einmal-Codes', 'Table of one-time codes')}>
      <table class="ct">
        <caption class="nur-vorleser">{L('Einmal-Codes mit Haken „ausgegeben“', 'One-time codes with the tick "issued"')}</caption>
        <thead><tr><th scope="col">{L('Nr.', 'No.')}</th><th scope="col">{L('Code', 'Code')}</th><th scope="col">{L('Ausgegeben', 'Issued')}</th></tr></thead>
        <tbody>
          {#each codes as c, i (c.code)}
            <tr>
              <td>{i + 1}</td>
              <th scope="row" translate="no"><code>{c.code}</code></th>
              <td><label class="schalter"><input type="checkbox" checked={!!c.ausgegeben} onchange={(e) => haken(c.code, e.currentTarget.checked)}><span class="nur-vorleser">{L(`Code ${c.code} ausgegeben`, `Code ${c.code} issued`)}</span><span aria-hidden="true">{L('ausgegeben', 'issued')}</span></label></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="hilfe">{L('Es gibt noch keine Codes.', 'There are no codes yet.')}</p>
  {/if}
</section>

<style>
  .codes { display: flex; flex-direction: column; gap: var(--a3); align-items: flex-start; border: 1px solid var(--linie-stark); border-radius: var(--r-klein); padding: var(--a3); }
  .kopf { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: center; }
  .codes h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .fehler { margin: 0; font-weight: 650; }
  .stand { margin: 0; }
  .schalter { display: flex; gap: var(--a2); align-items: center; }
  .erzeugen { display: flex; flex-wrap: wrap; gap: var(--a3); align-items: flex-end; }
  .akt { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .rolle { position: relative; overflow: auto; max-width: 100%; max-height: 24rem; width: 100%; }
  .rolle:focus-visible { outline: 3px solid var(--fokus); outline-offset: 1px; }
  table.ct { border-collapse: collapse; }
  table.ct th, table.ct td { padding: var(--a1) var(--a3); text-align: start; border-bottom: 1px solid var(--linie); }
  table.ct thead th { position: sticky; top: 0; background: var(--blatt); }
  :global(:where(:root.eng-600)) .erzeugen, :global(:where(:root.eng-600)) .akt { flex-direction: column; align-items: stretch; }
</style>
