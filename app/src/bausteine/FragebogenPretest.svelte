<script lang="ts">
  import { L, Lp, s } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import type { FragebogenPlan } from '../lib/fragebogenplan';
  import { anzahlKommentare, kommentareJeFrage, kommentarSaetzeAusTabelle } from '../lib/pretest';
  import { pretestAnzahl, pretestLeere, pretestMerke, pretestVon } from '../lib/fragebogen-editor.svelte';
  import Icon from './Icon.svelte';

  /**
   * Pretest (Fragebogen planen, 2G): Zusammenfassung der gesammelten Kommentare und „Kommentare einlesen“ aus den Daten des Projekts (Spalten `<name>_kommentar`).
   * Die Kommentare der Vorschau-Durchgänge kommen über „Durchgang merken“ in der Vorschau. Die gesammelten Kommentare bleiben in dieser Sitzung (nicht in der Projektdatei).
   * Je Frage stehen sie in der Gliederung (Zahl) und im Formular (Liste).
   */
  let { plan }: { plan: FragebogenPlan } = $props();
  const gesamt = $derived(pretestAnzahl(plan));
  const nVorschau = $derived(pretestVon(plan.id)?.vorschau.length ?? 0);
  const nDaten = $derived(pretestVon(plan.id)?.daten.length ?? 0);

  function einlesen() {
    if (!s.projekt || !s.spalten.length) { sage(L('Es sind keine Daten offen, aus denen Kommentare gelesen werden können.', 'No data are open from which comments can be read.')); return; }
    if (!s.spalten.some(c => /_kommentar$/.test(c.name))) { sage(L('In den Daten gibt es keine Spalte, deren Name auf „_kommentar“ endet.', 'The data have no column whose name ends in "_kommentar".')); return; }
    const saetze = kommentarSaetzeAusTabelle(s.spalten, s.zeilen);
    const passend = anzahlKommentare(kommentareJeFrage(plan, saetze));
    pretestMerke(plan.id, 'daten', saetze);
    sage(L(`${saetze.length} Zeilen mit Kommentaren eingelesen; ${passend} Kommentare passen zu Fragen dieses Fragebogens.`, `${saetze.length} rows with comments read; ${passend} comments match questions of this questionnaire.`));
  }
  function leeren() { pretestLeere(plan.id); sage(L('Gesammelte Pretest-Kommentare gelöscht.', 'Collected pretest comments deleted.')); }
</script>

<section class="pt" aria-labelledby="fb-pt-t" data-testid="fb-pretest">
  <h2 id="fb-pt-t">{L('Pretest: Kommentare', 'Pretest: comments')}</h2>
  <p class="hilfe">{plan.einstellungen.pretest
    ? L('Der Pretest-Modus ist an: Die Vorschau zeigt unter jeder Frage ein Kommentarfeld. Mit „Durchgang merken“ in der Vorschau sammeln Sie die Kommentare eines Probedurchgangs.', 'Pretest mode is on: the preview shows a comment field under each question. With "Keep run" in the preview you collect the comments of a trial run.')
    : L('Der Pretest-Modus ist aus. Schon gesammelte Kommentare bleiben sichtbar.', 'Pretest mode is off. Comments already collected stay visible.')}</p>
  <p class="heft-text" data-testid="fb-pretest-zahl">{Lp(gesamt, '1 Kommentar gesammelt', `${gesamt} Kommentare gesammelt`, '1 comment collected', `${gesamt} comments collected`)}
    ({L(`${nVorschau} Durchgänge der Vorschau, ${nDaten} Zeilen aus den Daten`, `${nVorschau} preview runs, ${nDaten} rows from the data`)}).</p>
  <div class="zeile">
    <button class="k" type="button" onclick={einlesen}><Icon n="plus" />{L('Kommentare aus den Daten einlesen', 'Read comments from the data')}</button>
    {#if gesamt || nVorschau || nDaten}<button class="k leise" type="button" onclick={leeren}><Icon n="zu" />{L('Gesammelte Kommentare löschen', 'Delete collected comments')}</button>{/if}
  </div>
  <p class="hilfe">{L('„Einlesen“ liest die Spalten „<Name>_kommentar“ der geöffneten Daten, zum Beispiel aus einer CSV-Datei der Eingabemaske oder eines Befragungswerkzeugs. Jede Zeile ist ein Bogen.', '"Read" reads the columns "<name>_kommentar" of the open data, for example from a CSV file of the entry form or a survey tool. Every row is one questionnaire.')}</p>
</section>

<style>
  .pt { display: flex; flex-direction: column; gap: var(--a2); min-width: 0; border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a3); }
  .pt h2 { font: 650 var(--gr-h2)/1.25 var(--schrift-ui); margin: 0; }
  .hilfe { font-size: var(--gr-klein); color: var(--tinte-2); margin: 0; }
  .zeile { display: flex; flex-wrap: wrap; gap: var(--a2); }
</style>
