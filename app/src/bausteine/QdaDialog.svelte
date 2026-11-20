<script lang="ts">
  import { onMount } from 'svelte';
  import { L, d, Lp } from '../lib/sitzung.svelte';
  import { leseDatei, DateiFehler } from '../lib/einlesen';
  import { liesQda, alsHaeufigkeit, alsVorkommen, dokumentEbene, dokumentEbeneAlsDaten, dokumentEbeneHinweis, dokumenteAbgleichen, verbindeMitVariablen, tabelleAlsDaten, dokumentePseudonym, qdaHinweisSatz, stellenHinweis, type QdaErgebnis } from '../lib/qdaimport';
  import { ladeZweiteDatei } from '../lib/datenassistentlauf';
  import type { Daten } from '../lib/umformen';
  import type { Tabelle } from '../lib/einlesen';
  import type { Wert } from '../lib/eingabe';
  import type { Spalte } from '../lib/verzeichnis';
  import Rechnet from './Rechnet.svelte';

  /**
   * Import qualitativer Codierungen aus MAXQDA, ATLAS.ti oder NVivo (Später S-C, G13 Stufe 1): Code-Matrix oder Segmenttabelle als Excel/CSV.
   * Jede Erkennung ist ein Vorschlag mit Kästchen; Summenzeilen fallen nur weg, wenn sie nachgerechnet stimmen UND die Person es bestätigt. Der Text codierter Stellen wird nie übernommen.
   */
  let { datei, oeffnen, zu }: { datei: File; oeffnen: (name: string, quelle: string, spalten: Spalte[], zeilen: Wert[][]) => void; zu: () => void } = $props();
  let tabelle = $state.raw<Tabelle | null>(null);
  let lesefehler = $state('');
  let summenWeg = $state(false), elternWeg = $state(false), doppeltEinmal = $state(false), pseudonym = $state(false);
  let form = $state<'haeufigkeit' | 'vorkommen' | 'codierende'>('vorkommen');
  let varDaten = $state.raw<{ name: string; daten: Daten } | null>(null);
  let varFehler = $state(''), varLaedt = $state(false);
  let schluessel = $state('');

  onMount(async () => {
    try { const e = await leseDatei(datei); if (e.art !== 'tabelle') throw new DateiFehler('format', datei.name); tabelle = e.tabelle; }
    catch { lesefehler = L('Diese Datei ließ sich nicht als Tabelle lesen. Gebraucht wird eine Excel- oder CSV-Datei aus MAXQDA, ATLAS.ti oder NVivo.', 'This file could not be read as a table. An Excel or CSV file from MAXQDA, ATLAS.ti or NVivo is needed.'); }
  });
  const e = $derived<QdaErgebnis | null>(tabelle ? liesQda(tabelle, { summenWeglassen: summenWeg, elternAuslassen: elternWeg, doppelteEntfernen: doppeltEinmal }) : null);
  const ebene = $derived(e ? dokumentEbene(e) : null);
  $effect(() => { if (e && form === 'codierende' && !ebene) form = 'vorkommen'; });
  const erg = $derived.by((): Daten | null => {
    if (!e || e.art === 'unbekannt') return null;
    if (form === 'codierende') return dokumentEbeneAlsDaten(e);
    const h = form === 'haeufigkeit' ? alsHaeufigkeit(e) : alsVorkommen(e);
    if (!h) return null;
    if (!varDaten || !schluessel) return h;
    try { return verbindeMitVariablen(h, varDaten.daten, { dokument: 'dokument', schluessel }).daten; } catch { return h; }
  });
  const abgleich = $derived(e && e.art !== 'unbekannt' && varDaten && schluessel ? (() => { const i = varDaten.daten.spalten.findIndex(c => c.name === schluessel); return i < 0 ? null : dokumenteAbgleichen(e.dokumente, varDaten.daten.zeilen.map(z => String(z[i] ?? ''))); })() : null);

  async function variablen(f: File) {
    varFehler = ''; varDaten = null; varLaedt = true;
    try {
      if (/\.(sav|zsav)$/i.test(f.name)) { const z = await ladeZweiteDatei(f); varDaten = { name: f.name, daten: z.daten }; }
      else { const l = await leseDatei(f); if (l.art !== 'tabelle') throw new Error('art'); varDaten = { name: f.name, daten: tabelleAlsDaten(l.tabelle) }; }
      schluessel = varDaten.daten.spalten.find(c => c.art === 'text')?.name ?? varDaten.daten.spalten[0]?.name ?? '';
    } catch { varFehler = L('Diese Datei ließ sich nicht lesen. Die Dokumentvariablen als Excel- oder CSV-Datei speichern.', 'This file could not be read. Save the document variables as an Excel or CSV file.'); }
    finally { varLaedt = false; }
  }
  function los() {
    if (!erg) return;
    const daten = pseudonym && form !== 'codierende' ? dokumentePseudonym(erg) : erg;
    const name = datei.name.replace(/\.[a-z0-9]+$/i, '');
    oeffnen(`${name} (${L('Codierungen', 'codings')})`, datei.name, daten.spalten, daten.zeilen);
  }
  const ARTEN = { maxqda: 'MAXQDA', atlasti: 'ATLAS.ti', nvivo: 'NVivo' } as const;
  const programm = $derived(e && e.hersteller !== 'unbekannt' ? ARTEN[e.hersteller] : '');
</script>

<div class="qd tisch ohne-rand"><section class="blatt rund" aria-labelledby="qd-t">
  <div class="blatt-kopf"><h1 id="qd-t">{L('Codierungen übernehmen', 'Take over codings')}</h1></div>
  {#if lesefehler}<p class="as-warn" role="alert">{lesefehler}</p>
  {:else if !tabelle}<p><Rechnet text={L('Die Datei wird gelesen …', 'The file is being read …')} /></p>
  {:else if e}
    {#if e.meldungen.length}{#each e.meldungen as m}<p class="as-warn" role="alert">{m.satz}</p>{/each}
    {:else}
      <p class="as-satz">{e.art === 'matrix'
        ? (programm ? L(`Das ist eine Code-Matrix aus ${programm}.`, `This is a code matrix from ${programm}.`) : L('Das ist eine Code-Matrix.', 'This is a code matrix.'))
        : (programm ? L(`Das ist eine Tabelle codierter Stellen aus ${programm}.`, `This is a table of coded passages from ${programm}.`) : L('Das ist eine Tabelle codierter Stellen.', 'This is a table of coded passages.'))}</p>
      <p class="as-satz">{e.art === 'matrix'
        ? L(`Codes in den Zeilen: ${e.codes.length}. Dokumente in den Spalten: ${e.dokumente.length}.`, `Codes in the rows: ${e.codes.length}. Documents in the columns: ${e.dokumente.length}.`)
        : L(`Codierte Stellen: ${e.segmente?.length ?? 0}. Dokumente: ${e.dokumente.length}. Codes: ${e.codes.length}.`, `Coded passages: ${e.segmente?.length ?? 0}. Documents: ${e.dokumente.length}. Codes: ${e.codes.length}.`)}</p>
      {#if e.art !== 'matrix' && e.codierende}<p class="as-satz">{L(`Codierende: ${e.codierende.length}.`, `Coders: ${e.codierende.length}.`)}</p>{/if}
      <p class="as-hilfe">{d('Nichts davon ist schon geschehen. Du entscheidest mit den Kästchen; die Datei selbst bleibt unverändert, und der Text der codierten Stellen wird nie übernommen.', 'Nichts davon ist schon geschehen. Sie entscheiden mit den Kästchen; die Datei selbst bleibt unverändert, und der Text der codierten Stellen wird nie übernommen.', 'None of it has happened yet. You decide with the checkboxes; the file itself stays unchanged, and the text of the coded passages is never taken over.')}</p>
      <ul class="as-hinweise">{#each e.hinweise as h}<li><span>{qdaHinweisSatz(h, e)}</span></li>{/each}<li><span>{stellenHinweis()}</span></li></ul>

      <fieldset class="qd-gruppe"><legend>{L('Vorschläge', 'Suggestions')}</legend>
        {#if e.summen.zeile || e.summen.spalte}
          {#if e.summen.nachgerechnet === true}<label class="as-eins"><input type="checkbox" bind:checked={summenWeg}><span>{L(`Die Summen (${[e.summen.zeile, e.summen.spalte].filter(Boolean).join(', ')}) stimmen, ich habe sie nachgerechnet. Sie weglassen?`, `The totals (${[e.summen.zeile, e.summen.spalte].filter(Boolean).join(', ')}) are correct, I checked them. Leave them out?`)}</span></label>
          {#if !summenWeg}<p class="as-hilfe">{L('Ohne Häkchen bleiben die Summen als Dokument und Code „SUMME“ in den Daten stehen und verfälschen Häufigkeiten und Mittelwerte.', 'Without a tick the totals stay in the data as document and code "SUMME" and distort frequencies and means.')}</p>{/if}
          {:else}<p class="as-warn">{L('Die Summen in der Datei stimmen nicht mit den Zahlen überein. Sie bleiben deshalb als Dokument und Code „SUMME“ stehen; die Datei sollte geprüft werden.', 'The totals in the file do not match the numbers. They therefore stay as document and code "SUMME"; check the file.')}</p>{/if}
        {/if}
        {#if e.eltern.length}<label class="as-eins"><input type="checkbox" bind:checked={elternWeg}><span>{Lp(e.eltern.length, `Der Oberbegriff ${e.eltern.join(', ')} ist die Summe seiner Unterbegriffe. Ihn auslassen?`, `Die Oberbegriffe ${e.eltern.join(', ')} sind die Summe ihrer Unterbegriffe. Sie auslassen?`, `The parent code ${e.eltern.join(', ')} is the sum of its child codes. Leave it out?`, `The parent codes ${e.eltern.join(', ')} are the sum of their child codes. Leave them out?`)}</span></label>{/if}
        {#if e.doppelte.length}<label class="as-eins"><input type="checkbox" bind:checked={doppeltEinmal}><span>{L('Doppelt vorkommende Stellen nur einmal zählen (sonst zählen sie doppelt).', 'Count passages that occur twice only once (otherwise they count twice).')}</span></label>{/if}
        <label class="as-eins"><input type="checkbox" bind:checked={pseudonym}><span>{L('Dokumentnamen durch „Dokument 1, 2, 3 …“ ersetzen (wenn die Namen Personen verraten).', 'Replace document names with "Document 1, 2, 3 …" (if the names reveal people).')}</span></label>
      </fieldset>

      <fieldset class="qd-gruppe"><legend>{L('Was soll entstehen?', 'What should be created?')}</legend>
        <div class="segment" role="radiogroup" aria-label={L('Ergebnisform', 'Result form')}>
          <label><input type="radio" name="qd-form" value="vorkommen" bind:group={form} disabled={!!e.relativ}>{L('Kommt im Dokument vor (0/1)', 'Occurs in the document (0/1)')}</label>
          <label><input type="radio" name="qd-form" value="haeufigkeit" bind:group={form} disabled={!!e.relativ}>{L('Zahl codierter Stellen', 'Number of coded passages')}</label>
          {#if ebene}<label><input type="radio" name="qd-form" value="codierende" bind:group={form}>{L('Zwei Codierende vergleichen', 'Compare two coders')}</label>{/if}</div>
        {#if form === 'codierende'}<p class="as-warn">{dokumentEbeneHinweis()}</p>
        {:else}<p class="as-hilfe">{L('Mit „kommt vor (0/1)“ lassen sich die Codes als Mehrfachantwort-Set auswerten (Themen nach Gruppe). Die Zahlen codierter Stellen hängen von der Länge der Dokumente ab.', 'With "occurs (0/1)" the codes can be analysed as a multiple-response set (themes by group). The number of coded passages depends on the length of the documents.')}</p>{/if}
        {#if e.relativ}<p class="as-warn">{L('Die Zahlen sind Anteile oder Prozent, keine Zählungen. Sie lassen sich so nicht übernehmen: Die Tabelle noch einmal mit den Häufigkeiten exportieren.', 'The numbers are shares or percentages, not counts. They cannot be taken over like this: export the table again with the frequencies.')}</p>{/if}
      </fieldset>

      {#if form !== 'codierende' && !e.relativ}
      <fieldset class="qd-gruppe"><legend>{L('Dokumentvariablen dazu (freiwillig)', 'Document variables as well (optional)')}</legend>
        <p class="as-hilfe">{L('Alter, Geschlecht, Gruppe … je Dokument aus MAXQDA oder NVivo (Excel, CSV oder SPSS .sav). Sie werden über den Dokumentnamen zugeordnet; wo kein Name passt, bleibt die Zelle leer.', 'Age, gender, group … per document from MAXQDA or NVivo (Excel, CSV or SPSS .sav). They are matched by document name; where no name matches, the cell stays empty.')}</p>
        <label class="k" style="cursor:pointer;width:fit-content">{L('Datei wählen', 'Choose file')}<input type="file" class="nur-vorleser" accept=".xlsx,.xlsm,.xls,.ods,.csv,.tsv,.txt,.sav,.zsav" onchange={(ev) => { const f = ev.currentTarget.files?.[0]; if (f) void variablen(f); ev.currentTarget.value = ''; }}></label>
        {#if varLaedt}<p><Rechnet text={L('Die Datei wird gelesen …', 'The file is being read …')} /></p>{/if}
        {#if varFehler}<p class="as-warn" role="alert">{varFehler}</p>{/if}
        {#if varDaten}
          <div class="as-feld"><label for="qd-schluessel">{L(`Spalte mit dem Dokumentnamen in ${varDaten.name}`, `Column with the document name in ${varDaten.name}`)}</label>
            <select id="qd-schluessel" bind:value={schluessel}>{#each varDaten.daten.spalten as c}<option value={c.name}>{c.name}</option>{/each}</select></div>
          {#if abgleich}
            <p class="as-satz">{Lp(abgleich.zugeordnet.length, `${abgleich.zugeordnet.length} von ${e.dokumente.length} Dokumenten hat passende Variablen.`, `${abgleich.zugeordnet.length} von ${e.dokumente.length} Dokumenten haben passende Variablen.`, `${abgleich.zugeordnet.length} of ${e.dokumente.length} documents has matching variables.`, `${abgleich.zugeordnet.length} of ${e.dokumente.length} documents have matching variables.`)}</p>
            {#if abgleich.nurA.length}<p class="as-warn">{L(`Ohne Partner in den Variablen (die Zellen bleiben leer): ${abgleich.nurA.join(', ')}.`, `Without a partner in the variables (the cells stay empty): ${abgleich.nurA.join(', ')}.`)}</p>{/if}
            {#if abgleich.nurB.length}<p class="as-warn">{L(`In den Variablen, aber nicht in den Codierungen: ${abgleich.nurB.join(', ')}.`, `In the variables but not in the codings: ${abgleich.nurB.join(', ')}.`)}</p>{/if}
            <p class="as-hilfe">{L('Groß-/Kleinschreibung, Leerzeichen am Rand und Endungen wie .docx gleicht Statable aus; „Interview 1“ und „interview_1“ sind verschieden.', 'Statable ignores upper/lower case, spaces at the edge and endings such as .docx; "Interview 1" and "interview_1" are different.')}</p>
          {/if}
        {/if}
      </fieldset>
      {/if}

      {#if erg}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Vorschau der Daten', 'Preview of the data')}>
          <table class="as-tab"><thead><tr>{#each erg.spalten.slice(0, 7) as c}<th scope="col">{c.name}</th>{/each}{#if erg.spalten.length > 7}<th scope="col">…</th>{/if}</tr></thead>
            <tbody>{#each erg.zeilen.slice(0, 6) as z}<tr>{#each z.slice(0, 7) as v, i}<td class:zahl={typeof v === 'number'}>{v ?? '-'}</td>{/each}{#if erg.spalten.length > 7}<td>…</td>{/if}</tr>{/each}</tbody></table></div>
        <p class="as-hilfe">{L(`${erg.zeilen.length} Zeilen, ${erg.spalten.length} Spalten.`, `${erg.zeilen.length} rows, ${erg.spalten.length} columns.`)}</p>
      {/if}
    {/if}
  {/if}
  <div class="knopfzeile qd-tun">
    <button class="k haupt gross" type="button" disabled={!erg} onclick={los}>{L('Als Daten öffnen', 'Open as data')}</button>
    <button class="k leise" type="button" onclick={zu}>{L('Abbrechen', 'Cancel')}</button>
  </div>
</section></div>

<style>
  .qd { padding-bottom: var(--a6); }
  .qd :global(.blatt) { display: flex; flex-direction: column; gap: var(--a4); }
  .qd-gruppe { border: 1px solid var(--linie); border-radius: var(--r); padding: var(--a3) var(--a4); margin: 0; min-width: 0; display: flex; flex-direction: column; gap: var(--a3); }
  .qd-gruppe > legend { font: 650 var(--gr-text)/1.3 var(--schrift-ui); padding: 0 var(--a2); }
  .qd :global(.as-eins) { display: flex; gap: var(--a2); align-items: flex-start; cursor: pointer; }
  .qd :global(.as-eins input) { accent-color: var(--akzent); width: 18px; height: 18px; margin: 3px 0 0; flex: none; }
  .qd :global(.as-hinweise) { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a2); max-width: var(--breite-text); }
  .qd :global(.as-tabhuelle) { overflow: auto; border: 1px solid var(--linie); border-radius: var(--r-klein); max-width: 100%; }
  .qd :global(.as-tab) { border-collapse: collapse; width: max-content; min-width: min(100%, 24rem); background: var(--blatt); }
  .qd :global(.as-tab th), .qd :global(.as-tab td) { padding: var(--a1) var(--a3); text-align: start; border-bottom: 1px solid var(--linie); white-space: nowrap; }
  .qd :global(.as-tab td.zahl) { text-align: right; }
  .qd :global(.as-tab thead th) { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 600; background: var(--blatt-2); }
  .qd :global(.as-warn) { padding: var(--a2) var(--a3); background: var(--blatt-2); border-inline-start: 4px solid var(--hinweis, var(--akzent)); border-radius: var(--r-klein); max-width: var(--breite-text); }
  .qd :global(.as-hilfe) { color: var(--tinte-2); font-size: var(--gr-klein); max-width: var(--breite-text); }
  .qd :global(select) { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a1) var(--a3); max-width: 100%; }
</style>
