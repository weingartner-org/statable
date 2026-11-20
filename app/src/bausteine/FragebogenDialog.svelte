<script lang="ts">
  import { L, Lp, d } from '../lib/sitzung.svelte';
  import { fokusNachVerschieben } from '../lib/ordnen';
  import Rechnet from './Rechnet.svelte';
  import { erkennungSaetze, vorschlagSatz, type Vorschlag } from '../lib/fragebogen';
  import type { FragebogenImport } from '../lib/fragebogenimport.svelte';
  import Icon from './Icon.svelte';
  import { sage } from '../lib/ansage';
  import { onMount } from 'svelte';

  /**
   * „Fragebogen erkannt - übernehmen?“ (Später S-C, D4). Jede Erkennung ist ein Vorschlag mit Kästchen; die Datei selbst bleibt unverändert,
   * und was angekreuzt ist, steht danach als eigener Schritt in den Befehlen und lässt sich mit „Rückgängig“ zurücknehmen.
   */
  let { fb, uebernehmen, roh, zu }: { fb: FragebogenImport; uebernehmen: () => void; roh: () => void; zu: () => void } = $props();
  /** Beim Erscheinen: Fokus auf die Überschrift, damit der Screenreader ankommt (wie beim Seitenwechsel in App.svelte; im nächsten Takt, nie requestAnimationFrame). */
  onMount(() => { const t = setTimeout(() => { const h = document.getElementById('fb-t'); h?.focus({ preventScroll: true }); }, 0); return () => clearTimeout(t); });
  const erk = $derived(fb.erk!);
  const saetze = $derived(erkennungSaetze(erk));
  const vorschlaege = $derived(erk.vorschlaege);
  const vorschau = $derived(fb.vorschau());
  const umgepolt = $derived(fb.umgepolt());
  const nBeschr = $derived(Object.keys(erk.beschriftungen).length);
  const nVariablenlabels = $derived(fb.syntax ? Object.keys(fb.syntax.ergebnis.variablenlabels).length : 0);
  const nWertelabels = $derived(fb.syntax ? Object.keys(fb.syntax.ergebnis.wertelabels).length : 0);
  const nFehlend = $derived(fb.syntax ? Object.keys(fb.syntax.ergebnis.fehlend).length : 0);
  const NAME: Record<string, () => string> = {
    fehlend: () => L('Fehlende Antworten', 'Missing answers'), metadaten: () => L('Spalten der Umfrage-Software', 'Columns of the survey software'), personenbezug: () => L('Personenbezug', 'Personal data'),
    testfaelle: () => L('Test- und Vorschau-Antworten', 'Test and preview answers'), unvollstaendige: () => L('Unvollständige Antworten', 'Incomplete answers'), schnellantworter: () => L('Sehr schnelle Antworten', 'Very quick answers'),
    mehrfachset: () => L('Mehrfachauswahl', 'Multiple choice'), wertelabels: () => L('Wertebeschriftungen', 'Value labels'), textAntworten: () => L('Antworten als Wörter', 'Answers as words'),
    mehrfachZelle: () => L('Mehrfachauswahl in einer Zelle', 'Multiple choice in one cell'), doppelte: () => L('Doppelte Antworten', 'Duplicate answers'), itemblock: () => L('Rasterfrage', 'Grid question')
  };
  /** Eingaben der bearbeitbaren Optionsliste je Vorschlag: die zwei Teile zum Zusammenführen und der Text einer neuen Option */
  let mzEin = $state<Record<string, { a: string; b: string; neu: string }>>({});
  const ein = (id: string) => mzEin[id] ?? { a: '', b: '', neu: '' };
  const setzeEin = (id: string, f: Partial<{ a: string; b: string; neu: string }>) => { mzEin = { ...mzEin, [id]: { ...ein(id), ...f } }; };
  const trennerName = (t: string) => (t === ', ' ? L('Komma', 'comma') : t === ';' || t === '; ' ? L('Semikolon', 'semicolon') : t === ' ' ? L('Leerzeichen', 'space') : L(`Trennzeichen „${t}“`, `separator "${t}"`));
  const optionenSatz = (l: string[]) => l.join(', ');
  function zusammen(id: string) {
    const e = ein(id); if (!e.a || !e.b || e.a === e.b) { sage(L('Bitte zwei verschiedene Teile wählen.', 'Please choose two different parts.')); return; }
    if (fb.mzZusammen(id, e.a, e.b)) { setzeEin(id, { a: '', b: '' }); sage(L(`Zusammengeführt. Die Optionen sind jetzt: ${optionenSatz(fb.mz[id]?.optionen ?? [])}.`, `Merged. The options are now: ${optionenSatz(fb.mz[id]?.optionen ?? [])}.`)); }
  }
  function dazu(id: string) {
    if (fb.mzDazu(id, ein(id).neu)) { setzeEin(id, { neu: '' }); sage(L(`Option ergänzt. Die Optionen sind jetzt: ${optionenSatz(fb.mz[id]?.optionen ?? [])}.`, `Option added. The options are now: ${optionenSatz(fb.mz[id]?.optionen ?? [])}.`)); }
    else sage(L('Die Option ist leer oder gibt es schon.', 'The option is empty or already exists.'));
  }
  function weg(id: string, o: string) { if (fb.mzWeg(id, o)) sage(L(`${o} entfernt. Die Optionen sind jetzt: ${optionenSatz(fb.mz[id]?.optionen ?? [])}.`, `${o} removed. The options are now: ${optionenSatz(fb.mz[id]?.optionen ?? [])}.`)); }
  const verschiebe = (v: Extract<Vorschlag, { art: 'textAntworten' }>, i: number, richtung: -1 | 1) => {
    const l = [...(fb.wahl.stufen[v.id] ?? [])], j = i + richtung; if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j]!, l[i]!]; fb.wahl.stufen[v.id] = l;
    void fokusNachVerschieben(v.id + ':' + l[j], richtung, L(`${l[j]} steht jetzt auf Platz ${j + 1} von ${l.length}.`, `${l[j]} is now in position ${j + 1} of ${l.length}.`));
  };
  async function xlsform(e: Event) { const feld = e.currentTarget as HTMLInputElement, f = feld.files?.[0]; if (f) await fb.ladeXlsform(f); feld.value = ''; }
  async function kodebuch(e: Event) { const feld = e.currentTarget as HTMLInputElement, f = feld.files?.[0]; if (f) await fb.ladeKodebuch(f); feld.value = ''; }
</script>

<div class="fb tisch ohne-rand"><section class="blatt rund" aria-label={L('Fragebogen', 'Questionnaire')}>
  <div class="blatt-kopf"><h1 id="fb-t" tabindex="-1">{L('Fragebogen erkannt - übernehmen?', 'Questionnaire recognised - apply?')}</h1></div>
  <p class="fb-ein">{d('Ich habe in der Datei etwas erkannt. Nichts davon ist schon geschehen: Du siehst jeden Vorschlag mit einem Kästchen. Die Datei selbst bleibt unverändert; was du ankreuzt, steht danach in den Befehlen und lässt sich mit „Rückgängig“ zurücknehmen.', 'Ich habe in der Datei etwas erkannt. Nichts davon ist schon geschehen: Sie sehen jeden Vorschlag mit einem Kästchen. Die Datei selbst bleibt unverändert; was Sie ankreuzen, steht danach in den Befehlen und lässt sich mit „Rückgängig“ zurücknehmen.', 'I recognised something in the file. None of it has happened yet: you see every suggestion with a checkbox. The file itself stays unchanged; what you tick appears in the commands afterwards and can be undone with "Undo".')}</p>
  {#each saetze as t}<p class="as-satz">{t}</p>{/each}
  {#each erk.meldungen as m}<p class="as-warn" role="status">{m.satz}</p>{/each}

  <fieldset class="fb-gruppe"><legend>{L('Kodebuch dazu (SPSS-Syntax, zum Beispiel von SoSci Survey)', 'Codebook as well (SPSS syntax, for example from SoSci Survey)')}</legend>
    <p class="as-hilfe">{L('Die .sps-Datei liefert Fragetexte, Wertebeschriftungen und Fehlend-Codes. Statable liest daraus nur diese Angaben; alle anderen Befehle werden übersprungen und nicht ausgeführt.', 'The .sps file supplies question texts, value labels and missing-value codes. Statable reads only these from it; all other commands are skipped and not executed.')}</p>
    <label class="k" style="cursor:pointer;width:fit-content">{L('.sps-Datei wählen', 'Choose .sps file')}<input type="file" class="nur-vorleser" accept=".sps,.syntax,.txt" aria-describedby="fb-sps-meld" onchange={kodebuch}></label>
    <div id="fb-sps-meld">
      {#if fb.liest}<p role="status"><Rechnet text={L('Die .sps-Datei wird gelesen …', 'The .sps file is being read …')} /></p>{/if}
      {#if fb.kbFehler}<p class="as-warn" role="alert">{fb.kbFehler}</p>{/if}
    </div>
    {#if fb.syntax}
      <p class="as-satz">{L(`Gelesen aus ${fb.syntax.name}:`, `Read from ${fb.syntax.name}:`)}</p>
      <ul class="as-hinweise">
        <li>{Lp(nVariablenlabels, `${nVariablenlabels} Fragetext`, `${nVariablenlabels} Fragetexte`, `${nVariablenlabels} question text`, `${nVariablenlabels} question texts`)}</li>
        <li>{Lp(nWertelabels, `${nWertelabels} Spalte mit Wertebeschriftungen`, `${nWertelabels} Spalten mit Wertebeschriftungen`, `${nWertelabels} column with value labels`, `${nWertelabels} columns with value labels`)}</li>
        <li>{Lp(nFehlend, `${nFehlend} Spalte mit Fehlend-Codes`, `${nFehlend} Spalten mit Fehlend-Codes`, `${nFehlend} column with missing-value codes`, `${nFehlend} columns with missing-value codes`)}</li>
      </ul>
      {#if fb.syntax.ergebnis.ignoriert.length}
        <p class="as-warn" role="status">{Lp(fb.syntax.ergebnis.ignoriert.length, `${fb.syntax.ergebnis.ignoriert.length} Befehl in der Datei wurde übersprungen und nicht ausgeführt:`, `${fb.syntax.ergebnis.ignoriert.length} Befehle in der Datei wurden übersprungen und nicht ausgeführt:`, `${fb.syntax.ergebnis.ignoriert.length} command in the file was skipped and not executed:`, `${fb.syntax.ergebnis.ignoriert.length} commands in the file were skipped and not executed:`)}</p>
        <ul class="as-hinweise">{#each fb.syntax.ergebnis.ignoriert.slice(0, 12) as x}<li>{L(`${x.befehl}, Zeile ${x.zeile}`, `${x.befehl}, line ${x.zeile}`)}</li>{/each}{#if fb.syntax.ergebnis.ignoriert.length > 12}<li>…</li>{/if}</ul>
      {/if}
      {#if umgepolt.length}<p class="as-warn" role="status">{L(`Bei ${umgepolt.join(', ')} laufen die Beschriftungen gegen die Zahlen: Hohe Zahlen bedeuten hier Ablehnung. Mittelwerte sind entsprechend zu lesen, oder die Spalte wird umgepolt (Assistent „Umkodieren“).`, `For ${umgepolt.join(', ')} the labels run against the numbers: high numbers mean rejection here. Read means accordingly, or reverse-code them ("Recode" assistant).`)}</p>{/if}
      <div class="knopfzeile"><button class="k leise" type="button" onclick={() => fb.ohneKodebuch()}>{L('Kodebuch wieder weglassen', 'Leave the codebook out again')}</button></div>
    {/if}
  </fieldset>

  <fieldset class="fb-gruppe"><legend>{L('XLSForm (.xlsx) als Kodebuch (KoboToolbox, ODK)', 'XLSForm (.xlsx) as codebook (KoboToolbox, ODK)')}</legend>
    <p class="as-hilfe">{L('Eine XLSForm ist die Datei, aus der KoboToolbox, ODK und andere Werkzeuge den Fragebogen bauen. Statable liest daraus Fragen, Antwortmöglichkeiten und Sprachen und ordnet sie den Spalten der Daten zu. Für Kobo, ODK und Moodle Questionnaire gilt: nach Dokumentation bzw. Quellcode erkannt, nicht an echten Exporten geprüft.', 'An XLSForm is the file from which KoboToolbox, ODK and other tools build the questionnaire. Statable reads the questions, answer options and languages from it and matches them to the columns of the data. For Kobo, ODK and Moodle Questionnaire: recognised from the documentation or source code, not checked against real exports.')}</p>
    <label class="k" style="cursor:pointer;width:fit-content">{L('XLSForm (.xlsx) als Kodebuch wählen', 'Choose XLSForm (.xlsx) as codebook')}<input type="file" class="nur-vorleser" accept=".xlsx,.xlsm" aria-describedby="fb-xls-meld" onchange={xlsform}></label>
    <div id="fb-xls-meld">
      {#if fb.xlsLiest}<p><Rechnet text={L('Die XLSForm wird gelesen …', 'The XLSForm is being read …')} /></p>{/if}
      {#if fb.xlsFehler}<p class="as-warn">{fb.xlsFehler}</p>{/if}
      {#if fb.xls && !fb.xlsLiest}<p class="as-satz">{fb.xlsSatz}</p>{/if}
    </div>
    {#if fb.xls}
      {@const x = fb.xls}
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Zuordnung der Spalten zu den Fragen', 'Assignment of the columns to the questions')}>
        <table class="as-tab"><caption class="nur-vorleser">{L('Spalte der Daten, Frage der XLSForm, Variable', 'Column of the data, question of the XLSForm, variable')}</caption>
          <thead><tr><th scope="col">{L('Spalte in den Daten', 'Column in the data')}</th><th scope="col">{L('Frage in der XLSForm', 'Question in the XLSForm')}</th><th scope="col">{L('Art', 'Kind')}</th><th scope="col">{L('Variable', 'Variable')}</th></tr></thead>
          <tbody>{#each x.zuordnung as z (z.kopf)}<tr><th scope="row">{z.kopf}</th><td>{z.frage}</td>
            <td>{z.art === 'antwort' ? L('Antwort', 'answer') : z.art === 'sammelspalte' ? L('Sammelspalte (mehrere Antworten)', 'collective column (several answers)') : z.art === 'optionsspalte' ? L('eine Antwortmöglichkeit (1/0)', 'one answer option (1/0)') : L('Anderes, Text', 'other, text')}</td>
            <td>{z.variable ?? L('keine (Sammelspalte)', 'none (collective column)')}</td></tr>{/each}</tbody></table></div>
      {#if x.unzugeordnet.length}
        <p class="as-satz">{Lp(x.unzugeordnet.length, `${x.unzugeordnet.length} Spalte der Daten passt zu keiner Frage und bleibt unverändert:`, `${x.unzugeordnet.length} Spalten der Daten passen zu keiner Frage und bleiben unverändert:`, `${x.unzugeordnet.length} column of the data matches no question and stays unchanged:`, `${x.unzugeordnet.length} columns of the data match no question and stay unchanged:`)}</p>
        <ul class="as-hinweise">{#each x.unzugeordnet.slice(0, 20) as k}<li>{k}</li>{/each}{#if x.unzugeordnet.length > 20}<li>…</li>{/if}</ul>
      {/if}
      {#each x.abbildungen as a (a.liste)}
        <label class="as-eins"><input type="checkbox" name="xls-abb-{a.liste}" bind:checked={fb.xlsHaken[a.liste]}><span>{L(`Texte der Antwortliste „${a.liste}“ in Zahlen umwandeln (neue Spalten für: ${a.spalten.join(', ')}). Ohne Haken bleiben die Spalten, wie sie sind.`, `Turn the texts of the answer list "${a.liste}" into numbers (new columns for: ${a.spalten.join(', ')}). Without the tick the columns stay as they are.`)}</span></label>
        <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L(`Liste ${a.liste}: Text und Zahl`, `List ${a.liste}: text and number`)}>
          <table class="as-tab"><caption class="nur-vorleser">{L(`Liste ${a.liste}: Text in der Datei und die Zahl, die daraus wird`, `List ${a.liste}: text in the file and the number it becomes`)}</caption>
            <thead><tr><th scope="col">{L('Text in der Datei', 'Text in the file')}</th><th scope="col">{L('Zahl', 'Number')}</th><th scope="col">{L('Beschriftung', 'Label')}</th></tr></thead>
            <tbody>{#each a.optionen as o (o.name)}<tr><th scope="row">{o.name}</th><td>{o.code}</td><td>{o.text}</td></tr>{/each}
              {#if a.anders}<tr><th scope="row">other</th><td>{a.anders.code}</td><td>{a.anders.text}</td></tr>{/if}</tbody></table></div>
      {/each}
      {#if x.hinweise.length || x.meldungen.length}
        <p class="as-satz"><strong>{L('Hinweise zur XLSForm', 'Notes on the XLSForm')}</strong></p>
        <ul class="as-hinweise">{#each x.hinweise as h}<li>{h}</li>{/each}{#each x.meldungen as m}<li>{m.satz}</li>{/each}</ul>
      {/if}
      <div class="knopfzeile"><button class="k leise" type="button" onclick={() => fb.ohneKodebuch()}>{L('XLSForm wieder weglassen', 'Leave the XLSForm out again')}</button></div>
    {/if}
  </fieldset>

  <fieldset class="fb-gruppe"><legend>{L('Namen und Köpfe', 'Names and headings')}</legend>
    {#if erk.kopfzeilen === 3}<label class="as-eins"><input type="checkbox" bind:checked={fb.wahl.kopfzeilen}><span>{L('Die ersten drei Zeilen sind Kopfzeilen (Name, Fragetext, interne Angaben); die Antworten beginnen in Zeile 4. Zeile 2 und 3 nicht als Antworten lesen.', 'The first three rows are headings (name, question text, internal information); the answers start in row 4. Do not read rows 2 and 3 as answers.')}</span></label>{/if}
    {#if erk.kopfzeilen === 2}<label class="as-eins"><input type="checkbox" bind:checked={fb.wahl.kopfzeilen}><span>{L('Die zweite Zeile enthält die Fragetexte (Exportoption „Beschriftungen der Variablen einfügen“); die Antworten beginnen in Zeile 3. Zeile 2 nicht als Antwort lesen.', 'The second row contains the question texts (export option "insert variable labels"); the answers start in row 3. Do not read row 2 as an answer.')}</span></label>{/if}
    {#if erk.hersteller === 'limesurvey' && Object.keys(erk.beschriftungen).length}<label class="as-eins"><input type="checkbox" bind:checked={fb.wahl.namen}><span>{L('Den Fragecode (G01Q01) als Spaltennamen nehmen und den Fragetext als Beschriftung.', 'Use the question code (G01Q01) as the column name and the question text as the label.')}</span></label>{/if}
    {#if Object.keys(erk.beschriftungen).length}<label class="as-eins"><input type="checkbox" bind:checked={fb.wahl.beschriftungen}><span>{Lp(nBeschr, `Fragetext als Beschriftung der Spalte setzen (${nBeschr} Spalte).`, `Fragetexte als Beschriftung der Spalten setzen (${nBeschr} Spalten).`, `Set the question text as the column label (${nBeschr} column).`, `Set question texts as column labels (${nBeschr} columns).`)}</span></label>{/if}
    {#if vorschau.length}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
      <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L('Vorschau der ersten Fragespalten', 'Preview of the first question columns')}>
        <table class="as-tab"><thead><tr>{#each vorschau as c}<th scope="col">{c.name}{#if c.label}<br><small>{c.label.length > 40 ? c.label.slice(0, 38) + ' …' : c.label}</small>{/if}</th>{/each}</tr></thead>
          <tbody>{#each [0, 1, 2] as r}<tr>{#each vorschau as c}<td>{c.werte[r] ?? ''}</td>{/each}</tr>{/each}</tbody></table></div>
    {/if}
  </fieldset>

  {#if vorschlaege.length}
  <fieldset class="fb-gruppe"><legend>{L('Vorschläge', 'Suggestions')}</legend>
    <ul class="fb-liste">
      {#each vorschlaege as v (v.id)}
        <li>
          {#if v.art === 'personenbezug' || v.art === 'itemblock'}
            <div class="fb-zeile"><Icon n="hinweis" k="hw" /><div><strong>{NAME[v.art]!()}</strong><p>{vorschlagSatz(v)}</p>{#if v.art === 'personenbezug'}<p class="as-hilfe">{L('Diese Spalten bleiben in der Tabelle. Sie sind vor dem Abgeben oder Weitergeben zu entfernen.', 'These columns stay in the table. Remove them before handing in or passing on.')}</p>{/if}</div></div>
          {:else}
            <label class="fb-zeile"><input type="checkbox" bind:checked={fb.wahl.haken[v.id]}><div><strong>{NAME[v.art]!()}</strong><p>{vorschlagSatz(v)}</p>
              {#if v.art === 'fehlend' && v.quelle === 'hinweis'}<p class="as-hilfe">{L('Das ist nur eine Vermutung; darum ist es nicht vorangekreuzt.', 'This is only a guess; that is why it is not ticked in advance.')}</p>{/if}
              {#if v.art === 'testfaelle' || v.art === 'unvollstaendige' || v.art === 'schnellantworter'}<p class="as-hilfe">{L('Angelegt wird eine Spalte mit 0 und 1. Damit lassen sich die Fälle unter „Fälle auswählen“ ausschließen, wenn das gewünscht ist. Gelöscht wird nichts.', 'A column with 0 and 1 is created. With it you can exclude the cases under "Select cases" if you want to. Nothing is deleted.')}</p>{/if}
              {#if v.art === 'metadaten'}<p class="as-hilfe">{L('Die Spalten bekommen die Rolle „keine“ (VARIABLE ROLE) und bleiben in der Tabelle; nichts wird gelöscht.', 'The columns get the role "none" (VARIABLE ROLE) and stay in the table; nothing is deleted.')}</p>{/if}
              {#if v.art === 'mehrfachset' && v.umkodierung !== 'zaehlwert'}<p class="as-hilfe">{L('Dafür entstehen neue Spalten mit 0 und 1; die Original-Spalten bleiben.', 'New columns with 0 and 1 are created for this; the original columns stay.')}</p>{/if}
              {#if v.art === 'fehlend' && v.codes.includes(0) && v.quelle === 'hersteller'}<p class="as-hilfe">{L('Die 0 ist nur dann ein Code für „gesehen, nicht bearbeitet“, wenn 0 in dieser Frage keine gültige Antwort ist. Das lässt sich aus den Daten nicht sicher sagen; darum ist es nicht vorangekreuzt.', 'The 0 is a code for "seen, not answered" only if 0 is not a valid answer to this question. The data cannot tell for sure; that is why it is not ticked in advance.')}</p>{/if}
              {#if v.art === 'mehrfachset' && v.quelle === 'hersteller'}<p class="as-hilfe">{L('Das ist nur eine Vermutung aus den Werten 1 und 2: Eine Mehrfachauswahl sieht in den Daten genauso aus wie eine Skala mit zwei Stufen. Mit dem Kodebuch (.sps) wäre es sicher; darum ist es nicht vorangekreuzt.', 'This is only a guess from the values 1 and 2: a multiple choice looks the same in the data as a scale with two levels. With the codebook (.sps) it would be certain; that is why it is not ticked in advance.')}</p>{/if}
              {#if v.art === 'mehrfachZelle'}<p class="as-hilfe">{L('Dafür entstehen neue Spalten mit 0 und 1 und ein Mehrfachantwort-Set; die Original-Spalte bleibt. Was zu keiner Option passt, steht als Text in einer Spalte „…_anders“.', 'New columns with 0 and 1 and a multiple-response set are created for this; the original column stays. What fits no option stands as text in a column "…_anders".')}</p>{/if}
              {#if v.art === 'doppelte'}<p class="as-hilfe">{L('Angelegt wird eine Spalte „doppelt“ mit 0 und 1. Gelöscht wird nichts; über „Fälle auswählen“ lassen sich die gekennzeichneten Zeilen ausschließen.', 'A column "doppelt" with 0 and 1 is created. Nothing is deleted; with "Select cases" the flagged rows can be excluded.')}</p>{/if}
              {#if v.art === 'wertelabels'}<p class="as-hilfe">{Object.entries(v.labels).slice(0, 6).map(([k, t]) => `${k} = ${t}`).join('; ')}{Object.keys(v.labels).length > 6 ? ' …' : ''}</p>{/if}
            </div></label>
            {#if v.art === 'mehrfachZelle' && fb.wahl.haken[v.id] && fb.mz[v.id]}
              {@const z = fb.mz[v.id]!}
              <div class="fb-stufen" role="group" aria-label={L(`Antwortmöglichkeiten von ${v.spalte}`, `Answer options of ${v.spalte}`)}>
                <p class="as-satz"><strong>{L('Antwortmöglichkeiten', 'Answer options')}</strong></p>
                <p class="as-hilfe">{d(`Wenn eine Antwortmöglichkeit selbst ein ${trennerName(v.trenner)} enthält, führe die Teile hier zusammen. Mit „Ergänzen“ kannst du eine Option hinzufügen. Danach teilt Statable neu auf.`, `Wenn eine Antwortmöglichkeit selbst ein ${trennerName(v.trenner)} enthält, führen Sie die Teile hier zusammen. Mit „Ergänzen“ können Sie eine Option hinzufügen. Danach teilt Statable neu auf.`, `If an answer option itself contains a ${trennerName(v.trenner)}, merge the parts here. With "Add" you can add an option. Statable then splits again.`)}</p>
                <ul class="fb-opt">{#each z.optionen as o (o)}<li><span>{o}</span> <button class="k leise" type="button" disabled={z.optionen.length < 2} aria-label={L(`${o} entfernen`, `Remove ${o}`)} onclick={() => weg(v.id, o)}>{L('Entfernen', 'Remove')}</button></li>{/each}</ul>
                <div class="fb-offen" role="group" aria-label={L('Zwei Teile zu einer Option zusammenführen', 'Merge two parts into one option')}>
                  <label for="fb-mz-a-{v.id}">{L('Erster Teil', 'First part')}</label>
                  <select id="fb-mz-a-{v.id}" value={ein(v.id).a} onchange={(e) => setzeEin(v.id, { a: e.currentTarget.value })}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each z.optionen as o (o)}<option value={o}>{o}</option>{/each}</select>
                  <label for="fb-mz-b-{v.id}">{L('Zweiter Teil', 'Second part')}</label>
                  <select id="fb-mz-b-{v.id}" value={ein(v.id).b} onchange={(e) => setzeEin(v.id, { b: e.currentTarget.value })}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each z.optionen as o (o)}<option value={o}>{o}</option>{/each}</select>
                </div>
                <div class="knopfzeile"><button class="k" type="button" onclick={() => zusammen(v.id)}>{L('Zu einer Option zusammenführen', 'Merge into one option')}</button></div>
                <div class="fb-offen" role="group" aria-label={L('Eine Option ergänzen', 'Add an option')}>
                  <label for="fb-mz-n-{v.id}">{L('Neue Option', 'New option')}</label>
                  <input id="fb-mz-n-{v.id}" type="text" value={ein(v.id).neu} oninput={(e) => setzeEin(v.id, { neu: e.currentTarget.value })}>
                </div>
                <div class="knopfzeile"><button class="k" type="button" onclick={() => dazu(v.id)}>{L('Ergänzen', 'Add')}</button></div>
                {#if z.erg.unklar.length}
                  <p class="as-warn">{d(`Bei ${z.erg.unklar.length} Antworten ist nicht eindeutig, wie sie aufzuteilen sind. Bitte entscheide selbst: Voreingestellt sind die gefundenen Optionen und der Rest als „Anderes“.`, `Bei ${z.erg.unklar.length} Antworten ist nicht eindeutig, wie sie aufzuteilen sind. Bitte entscheiden Sie selbst: Voreingestellt sind die gefundenen Optionen und der Rest als „Anderes“.`, `For ${z.erg.unklar.length} answers it is not clear how to split them. Please decide yourself: the options found and the rest as "other" are preset.`)}</p>
                  <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
                  <div class="as-tabhuelle" role="region" tabindex="0" aria-label={L(`Unklare Antworten von ${v.spalte}`, `Unclear answers of ${v.spalte}`)}>
                    <table class="as-tab fb-unklar"><caption class="nur-vorleser">{L('Unklare Antworten: Antwort, Zellinhalt und je Option ein Kästchen', 'Unclear answers: answer, cell content and one checkbox per option')}</caption>
                      <thead><tr><th scope="col">{L('Antwort', 'Answer')}</th><th scope="col">{L('Zellinhalt', 'Cell content')}</th>{#each z.optionen as o (o)}<th scope="col">{o}</th>{/each}<th scope="col">{L('Anderes', 'Other')}</th></tr></thead>
                      <tbody>{#each z.erg.unklar.slice(0, 200) as zi (zi)}
                        <tr><th scope="row">{zi + 1}</th><td class="fb-zell">{fb.mzZelle(v.id, zi)}</td>
                          {#each z.optionen as o, k (o)}<td><input type="checkbox" aria-label={L(`${o} in Antwort ${zi + 1}`, `${o} in answer ${zi + 1}`)} checked={z.entscheid[zi]?.optionen[k] ?? false} onchange={(e) => fb.mzEntscheide(v.id, zi, k, e.currentTarget.checked)}></td>{/each}
                          <td><input type="checkbox" aria-label={L(`Anderes in Antwort ${zi + 1}`, `Other in answer ${zi + 1}`)} checked={z.entscheid[zi]?.anders ?? false} onchange={(e) => fb.mzEntscheide(v.id, zi, 'anders', e.currentTarget.checked)}> <small>{z.erg.zeilen[zi]?.rest ?? ''}</small></td></tr>{/each}</tbody></table></div>
                  {#if z.erg.unklar.length > 200}<p class="as-hilfe">{L(`Gezeigt werden die ersten 200 unklaren Antworten; für die übrigen gilt die Voreinstellung.`, `The first 200 unclear answers are shown; the rest follow the preset.`)}</p>{/if}
                {/if}
              </div>
            {/if}
            {#if v.art === 'doppelte' && fb.wahl.haken[v.id]}
              <div class="fb-stufen" role="group" aria-label={L('Gruppen doppelter Antworten', 'Groups of duplicate answers')}>
                <p class="as-hilfe">{L('Je Gruppe bleibt eine Zeile (voreingestellt die erste); die übrigen bekommen in der neuen Spalte eine 1. Ohne Haken bei einer Gruppe bleibt sie unverändert.', 'One row of each group stays (the first one by default); the others get a 1 in the new column. Without the tick a group stays unchanged.')}</p>
                <ul class="fb-opt">{#each v.gruppen.slice(0, 50) as g, gi (gi)}
                  <li><label class="as-eins"><input type="checkbox" checked={fb.wahl.doppelt[gi] !== false} onchange={(e) => { fb.wahl.doppelt[gi] = e.currentTarget.checked; }}><span>{L(`Gruppe ${gi + 1}: Zeilen ${g.map(r => r + 1).join(', ')} - die übrigen kennzeichnen`, `Group ${gi + 1}: rows ${g.map(r => r + 1).join(', ')} - flag the others`)}</span></label>
                    <label for="fb-beh-{gi}">{L(`Behalten in Gruppe ${gi + 1}`, `Keep in group ${gi + 1}`)}</label>
                    <select id="fb-beh-{gi}" value={String(fb.wahl.behalte[gi] ?? g[0])} onchange={(e) => { fb.wahl.behalte[gi] = Number(e.currentTarget.value); }}>{#each g as r (r)}<option value={String(r)}>{L(`Zeile ${r + 1}`, `Row ${r + 1}`)}</option>{/each}</select></li>{/each}</ul>
                {#if v.gruppen.length > 50}<p class="as-hilfe">{L('Gezeigt werden die ersten 50 Gruppen; für die übrigen gilt die Voreinstellung (erste Zeile behalten).', 'The first 50 groups are shown; the rest follow the preset (keep the first row).')}</p>{/if}
              </div>
            {/if}
            {#if v.art === 'textAntworten' && fb.wahl.haken[v.id]}
              <div class="fb-stufen"><p class="as-hilfe">{v.vorbelegt ? L('Die Reihenfolge der Stufen (1 = erste Zeile). Bitte prüfen; mit den Pfeilen lässt sie sich ändern.', 'The order of the levels (1 = first row). Please check; change it with the arrows.') : L('Statable kann die Reihenfolge nicht erraten. Die Stufen mit den Pfeilen ordnen: oben bekommt die Zahl 1.', 'Statable cannot guess the order. Order the levels with the arrows: the top one gets the number 1.')}</p>
                <ol>{#each fb.wahl.stufen[v.id] ?? [] as st, i}<li><span class="as-nr">{i + 1}</span> {st}
                  <button class="k leise nur-symbol" type="button" data-ord="hoch" data-ord-key="{v.id}:{st}" aria-label={L(`${st} nach oben`, `${st} up`)} disabled={i === 0} onclick={() => verschiebe(v, i, -1)}><Icon n="hoch" /></button>
                  <button class="k leise nur-symbol" type="button" data-ord="runter" data-ord-key="{v.id}:{st}" aria-label={L(`${st} nach unten`, `${st} down`)} disabled={i === (fb.wahl.stufen[v.id]?.length ?? 0) - 1} onclick={() => verschiebe(v, i, 1)}><Icon n="runter" /></button></li>{/each}</ol>
                <div class="fb-zuordnung" role="group" aria-label={L('Zuordnung der Texte zu den Stufen', 'Assignment of the texts to the levels')}>
                  <p class="as-satz"><strong>{L('Welcher Text bekommt welche Zahl?', 'Which text gets which number?')}</strong></p>
                  <p class="as-hilfe">{L('Statable ordnet jeden Text einer Stufe zu, soweit er dazu passt. Die Zuordnung lässt sich ändern, und ein Text lässt sich als fehlend markieren: Diese Antworten zählen dann nicht mit, die Zelle in der neuen Spalte bleibt leer.', 'Statable assigns every text to a level where it fits. The assignment can be changed, and a text can be marked as missing: those answers then do not count, the cell in the new column stays empty.')}</p>
                  {#if fb.offeneTexte(v).length}<p class="as-warn" role="status">{L('Diese Texte passen zu keiner Stufe. Sie werden nicht stillschweigend zu „fehlend“: Bitte für jeden entscheiden.', 'These texts do not fit any level. They are not silently turned into "missing": please decide for each one.')}</p>{/if}
                  {#each fb.rohTexte(v) as t (t)}
                    {@const auto = fb.stufeVon(v, t)}
                    <div class="fb-offen"><label for="fb-z-{v.id}-{t}">{t} <small>- {auto === null ? L('passt zu keiner Stufe', 'fits no level') : L(`automatisch Stufe ${auto}`, `automatically level ${auto}`)}</small></label>
                      <select id="fb-z-{v.id}-{t}" value={fb.wahl.zuordnung[v.id]?.[t] ?? ''} onchange={(e) => { (fb.wahl.zuordnung[v.id] ??= {})[t] = e.currentTarget.value; }}>
                        <option value="">{auto === null ? L('Bitte wählen', 'Please choose') : L('wie automatisch', 'as automatic')}</option>
                        {#each fb.wahl.stufen[v.id] ?? [] as st, k}<option value={String(k + 1)}>{k + 1} = {st}</option>{/each}
                        <option value="leer">{L('als fehlend markieren (zählt nicht mit)', 'mark as missing (does not count)')}</option></select></div>
                  {/each}
                </div></div>
            {/if}
          {/if}
        </li>
      {/each}
    </ul>
  </fieldset>
  {:else}<p class="as-satz">{L('Zu dieser Datei habe ich keine Vorschläge.', 'I have no suggestions for this file.')}</p>{/if}

  <div class="knopfzeile fb-tun">
    <button class="k haupt gross" type="button" disabled={fb.unentschieden()} onclick={uebernehmen}>{L('Übernehmen und öffnen', 'Apply and open')}</button>
    <button class="k" type="button" onclick={roh}>{L('Datei ohne diese Änderungen öffnen', 'Open the file without these changes')}</button>
    <button class="k leise" type="button" onclick={zu}>{L('Abbrechen', 'Cancel')}</button>
  </div>
</section></div>

<style>
  .fb { padding-bottom: var(--a6); }
  .fb :global(.blatt) { display: flex; flex-direction: column; gap: var(--a4); }
  .fb-ein { color: var(--tinte-2); max-width: var(--breite-text); }
  .fb-gruppe { border: 1px solid var(--linie); border-radius: var(--r); padding: var(--a3) var(--a4); margin: 0; min-width: 0; display: flex; flex-direction: column; gap: var(--a3); }
  .fb-gruppe > legend { font: 650 var(--gr-text)/1.3 var(--schrift-ui); padding: 0 var(--a2); }
  .fb-liste { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a3); }
  .fb-zeile { display: flex; gap: var(--a3); align-items: flex-start; cursor: pointer; }
  .fb-zeile input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 3px 0 0; flex: none; }
  .fb-zeile p { max-width: var(--breite-text); margin: var(--a1) 0 0; }
  .fb-stufen { margin-block: var(--a2) 0; margin-inline: calc(18px + var(--a3)) 0; }
  .fb-stufen ol { list-style: none; padding: 0; margin: var(--a2) 0 0; display: flex; flex-direction: column; gap: var(--a1); }
  .fb-stufen li { display: flex; gap: var(--a2); align-items: center; }
  .fb-opt { list-style: none; padding: 0; margin: var(--a2) 0; display: flex; flex-direction: column; gap: var(--a1); }
  .fb-opt li { display: flex; gap: var(--a2); align-items: center; flex-wrap: wrap; }
  .fb :global(.fb-unklar td.fb-zell) { white-space: normal; min-width: 12rem; max-width: 24rem; overflow-wrap: anywhere; }
  .fb :global(.fb-unklar td input) { accent-color: var(--akzent); width: 18px; height: 18px; }
  .fb-offen { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--a2); align-items: center; margin-top: var(--a1); }
  .fb-offen select { font: inherit; min-height: var(--ziel); max-width: 100%; }
  .fb-tun { margin-top: var(--a2); }
  .fb :global(.as-eins) { display: flex; gap: var(--a2); align-items: flex-start; cursor: pointer; }
  .fb :global(.as-eins input) { accent-color: var(--akzent); width: 18px; height: 18px; margin: 3px 0 0; flex: none; }
  .fb :global(.as-tabhuelle) { overflow: auto; border: 1px solid var(--linie); border-radius: var(--r-klein); max-width: 100%; }
  .fb :global(.as-tab) { border-collapse: collapse; width: max-content; min-width: min(100%, 24rem); background: var(--blatt); }
  .fb :global(.as-tab th), .fb :global(.as-tab td) { padding: var(--a1) var(--a3); text-align: start; border-bottom: 1px solid var(--linie); white-space: nowrap; }
  .fb :global(.as-tab thead th) { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 600; background: var(--blatt-2); }
  .fb :global(.as-warn) { padding: var(--a2) var(--a3); background: var(--blatt-2); border-inline-start: 4px solid var(--hinweis, var(--akzent)); border-radius: var(--r-klein); max-width: var(--breite-text); }
  .fb :global(.as-hilfe) { color: var(--tinte-2); font-size: var(--gr-klein); }
  .fb :global(.as-nr) { color: var(--tinte-2); font-size: var(--gr-klein); min-width: 1.2em; text-align: right; }
</style>
