<script lang="ts">
  import { untrack } from 'svelte';
  import { fehlendSchluessel, istFehlend } from '../lib/fehlend';
  import { s, d, L, melde, sichern } from '../lib/sitzung.svelte';
  import { einmal } from '../lib/einmal';
  import { kennung as istKennung } from '../lib/verfahren';
  import { lesbar, type Spalte } from '../lib/verzeichnis';
  import { gewichtLage, oeffneGewichtDialog, artName } from '../lib/fallgewicht.svelte';
  import { repAnfaenge, REP_TYPEN, grenzenSatz } from '../lib/genauigkeit';
  import { amtlichWahlAus, leereAmtlichWahl, brauchtWert, amtlichWeg, type AmtlichWahl, type AmtlichInhalt } from '../lib/amtlich';
  import { amtlichBerechne, amtlichRechneNeu, neuesAmtlichBlatt, amtlichWahlVon, amtlichGespeichertVon, type AmtlichGespeichert } from '../lib/amtlichblatt';
  import { Laedt } from '../lib/laedt.svelte';
  import { komma } from '../lib/ergebnis';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import AmtlichAnzeige from './AmtlichAnzeige.svelte';
  import Rechnet from './Rechnet.svelte';
  import { zaehle } from '../lib/zaehlen';

  /**
   * „Tabelle für die Veröffentlichung“ (M5a): Zeilenmerkmal, optional Spaltenmerkmal, Inhalt (Hochrechnung, Anteil, Mittelwert, Summe), Geheimhaltung, Kennzeichnung, Quelle.
   * Wie ein Daten-Assistent: eine Hauptwahl sichtbar, der Rest unter „Weitere Wege“, die Vorschau mit echten Zahlen. Rechnet R (Stichprobenplan oder Replikationsgewichte),
   * läuft das auf Knopfdruck (R lädt beim ersten Mal); alles andere (Geheimhaltung, Kennzeichnung, Texte) ändert die Vorschau sofort.
   * Mit `blattId` ändert die Seite die Wahl eines vorhandenen Blatts.
   */
  let { blattId = '' }: { blattId?: string } = $props();
  const vorhanden = untrack(() => (blattId ? s.blaetter.find(b => b.id === blattId && b.art === 'amtlich') : undefined));

  const verschieden = (sp: Spalte) => einmal(s.zeilen, `am-v|${sp.name}|${fehlendSchluessel(sp)}`, () => {
    const i = s.spalten.findIndex(x => x.name === sp.name), m = new Set<string | number>();
    if (i < 0) return 0;
    for (const z of s.zeilen) { const v = z[i]; if (v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && istFehlend(sp, v))) { m.add(v); if (m.size > 60) break; } }
    return m.size;
  });
  const sp = (n: string) => s.spalten.find(x => x.name === n);
  /** Vorschlag für das Zeilenmerkmal: die erste Spalte mit 2 bis 12 Stufen, die keine Kennung ist und nicht nach Gewicht aussieht. */
  const vorschlag = () => s.spalten.find(x => !istKennung(x) && x.art !== 'datum' && verschieden(x) >= 2 && verschieden(x) <= 12 && (x.niveau === 'nominal' || Object.keys(x.werteLabels).length > 0 || x.art === 'text'))?.name ?? '';
  let wahl = $state<AmtlichWahl>(untrack(() => (vorhanden ? amtlichWahlVon(vorhanden) : { ...leereAmtlichWahl(), zeile: vorschlag() })));
  let gerechnet = $state<AmtlichGespeichert | null>(untrack(() => (vorhanden ? amtlichGespeichertVon(vorhanden) : null)));
  const anfaenge = $derived(repAnfaenge(s.spalten.map(x => x.name)));
  /** Gewichts- und Replikationsspalten sind keine Merkmale der Tabelle (Opus 24.10.: sonst stehen 50 w_rep-Spalten in der Liste). */
  const istGewichtSpalte = (x: Spalte) => x.name === s.gewicht?.spalte || anfaenge.some(a => x.name.startsWith(a.anfang) && /^[0-9]+$/.test(x.name.slice(a.anfang.length)));
  const zahlenSpalten = $derived(s.spalten.filter(x => x.art === 'zahl' && !istKennung(x) && !istGewichtSpalte(x)));
  const lage = $derived(gewichtLage());
  const gw = $derived(lage.art === 'gilt' ? lage.gewicht : undefined);
  const weg = $derived(amtlichWeg(amtlichWahlAus(wahl), gw));

  /* ---------- Wahl ---------- */
  /** Zeilen- und Spaltenmerkmal: höchstens 30 Stufen (Grenze der Tabelle), keine Kennung, kein Gewicht; die gerade gewählte Spalte bleibt immer sichtbar. */
  const spaltenListe = $derived(s.spalten.filter(x => x.name === wahl.zeile || x.name === wahl.spalte || (x.art !== 'datum' && !istKennung(x) && !istGewichtSpalte(x) && verschieden(x) >= 2 && verschieden(x) <= 30)));
  const beschr = (x: Spalte) => `${lesbar(x, true)}${x.bezeichnung ? ` (${x.name})` : ''} · ${verschieden(x)}`;
  const inhaltName: Record<AmtlichInhalt, () => string> = {
    anzahl: () => (gw ? L('Hochrechnung (Anzahl in der Grundgesamtheit)', 'Estimated total (count in the population)') : L('Anzahl', 'Count')),
    zeile: () => L('Anteil in % je Zeile (Zeile = 100 %)', 'Share in % per row (row = 100%)'),
    spalte: () => L('Anteil in % je Spalte (Spalte = 100 %)', 'Share in % per column (column = 100%)'),
    gesamt: () => L('Anteil in % am Gesamt', 'Share in % of the total'),
    mittel: () => L('Mittelwert einer Zahl', 'Mean of a number'),
    summe: () => L('Summe einer Zahl', 'Sum of a number')
  };
  const inhaltGeht = (i: AmtlichInhalt) => (i === 'zeile' || i === 'spalte' ? !!wahl.spalte : true);
  $effect(() => { if (!wahl.spalte && (wahl.inhalt === 'zeile' || wahl.inhalt === 'spalte')) wahl.inhalt = 'gesamt'; });
  $effect(() => { if (wahl.geheim === 'runden' && wahl.inhalt !== 'anzahl' && wahl.inhalt !== 'summe') wahl.geheim = 'sperren'; });
  $effect(() => { if (brauchtWert(wahl) && !wahl.wert) wahl.wert = zahlenSpalten.find(x => x.name !== wahl.zeile && x.name !== wahl.spalte)?.name ?? ''; });
  let scaleText = $state(untrack(() => (wahl.rep.scale !== null ? String(wahl.rep.scale).replace('.', ',') : '')));
  function scaleSetzen(t: string) {
    scaleText = t; const x = t.trim().replace(',', '.');
    const bruch = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(x);
    const v = bruch ? Number(bruch[1]) / Number(bruch[2]) : x === '' ? null : Number(x);
    wahl.rep.scale = v !== null && Number.isFinite(v) && v > 0 ? v : null;
  }
  function repAn(an: boolean) { wahl.rep.an = an; if (an && !wahl.rep.anfang && anfaenge[0]) wahl.rep.anfang = anfaenge[0].anfang; }

  /* ---------- Vorschau ---------- */
  const snap = () => $state.snapshot(wahl) as AmtlichWahl;
  const r = $derived.by(() => { void s.zeilen; void s.spalten; void s.gewicht; void s.gewichtFrage; void s.einst.sprache; void s.einst.anrede; void s.einst.zahl; return amtlichBerechne(snap(), gerechnet); });
  const lad = new Laedt();
  let rFehler = $state('');
  async function rechnen() {
    rFehler = '';
    await lad.mit(async () => { try { gerechnet = await amtlichRechneNeu(snap()); } catch (e) { rFehler = (e as Error).message; } });
  }

  /* ---------- In den Bericht legen / Wahl ändern ---------- */
  const kannSpeichern = $derived(r.art === 'ok');
  const problem = $derived(r.art === 'rechnen' ? L('Zuerst mit R rechnen.', 'First calculate with R.') : L('Zuerst Zeilen und Inhalt wählen.', 'First choose rows and content.'));
  async function speichern() {
    if (r.art !== 'ok') { melde(problem); return; }
    const w = amtlichWahlAus(snap()), roh = r.weg === 'js' ? null : gerechnet;
    if (vorhanden) {
      const alt = neuesAmtlichBlatt(amtlichWahlVon(vorhanden), null, vorhanden.id).titel, neu = neuesAmtlichBlatt(w, roh, vorhanden.id);
      vorhanden.ergebnis = neu.ergebnis; vorhanden.l1 = neu.l1; vorhanden.l2 = neu.l2; vorhanden.l3 = neu.l3; vorhanden.gewicht = neu.gewicht;
      if (vorhanden.titel === alt) vorhanden.titel = neu.titel;
      await sichern(); melde(L('Die Tabelle ist geändert.', 'The table is changed.'));
      location.hash = `blatt/${vorhanden.id}`;
    } else {
      const b = neuesAmtlichBlatt(w, roh);
      s.blaetter = [...s.blaetter, b];
      zaehle('verfahren', b.art);
      await sichern(); melde(L('Die Tabelle liegt jetzt im Heft und im Bericht.', 'The table is now in your notebook and in the report.'));
      location.hash = `blatt/${b.id}`;
    }
  }
  const hinweise = $derived.by(() => {
    const h: string[] = [];
    if (r.art === 'ok' && wahl.geheim === 'aus') h.push(L('Die Geheimhaltung ist aus. Vor dem Veröffentlichen „Sperren“ oder „Runden“ wählen und die Grenze der Organisation einstellen.', 'Confidentiality is off. Before publishing choose "Suppress" or "Round" and set the limit of the organisation.'));
    return h;
  });
</script>

<AssistentRahmen id="amtlich" titel={L('Zeilen, Spalten und Inhalt wählen', 'Choose rows, columns and content')}
  einleitung={L('Eine Tabelle, die sich veröffentlichen lässt: hochgerechnet mit dem Fallgewicht, mit Standardfehler, gesperrten kleinen Zellen und Zeichenerklärung. Die Grenzen legt die Organisation fest.', 'A table that can be published: estimated with the case weight, with standard errors, small cells suppressed and a key. The organisation sets the limits.')}
  {hinweise} anwendenText={vorhanden ? L('Änderung speichern', 'Save the change') : L('In den Bericht legen', 'Add to the report')} anwenden={speichern} kannAnwenden={kannSpeichern} problem={kannSpeichern ? '' : problem}>
  {#snippet haupt()}
    <div class="as-feld"><span class="am-etikett">{L('Gewicht', 'Weight')}</span>
      <p class="as-hilfe">{#if gw}{L(`Fallgewicht: ${gw.spalte} (${artName(gw.art)}). Die Zahlen sind damit hochgerechnet.`, `Case weight: ${gw.spalte} (${artName(gw.art)}). The numbers are estimated with it.`)}{:else if lage.art === 'frage'}{L('Das Fallgewicht ist noch nicht festgelegt.', 'The case weight is not set yet.')}{:else}{L('Kein Fallgewicht: Die Zahlen sind ungewichtet.', 'No case weight: the numbers are unweighted.')}{/if}
        {' '}<button class="k leise klein" type="button" onclick={() => oeffneGewichtDialog(sp('gewicht') ? 'gewicht' : '')}>{L('Fallgewicht festlegen', 'Set the case weight')}</button></p></div>
    <div class="as-feld"><label for="am-zeile">{L('1. Zeilen der Tabelle', '1. Rows of the table')}</label>
      <select id="am-zeile" bind:value={wahl.zeile}><option value="">{L('Zeilenmerkmal wählen …', 'Choose the row variable …')}</option>
        {#each spaltenListe as x (x.name)}<option value={x.name}>{beschr(x)}</option>{/each}</select></div>
    <div class="as-feld"><label for="am-spalte">{L('2. Spalten der Tabelle (wahlfrei)', '2. Columns of the table (optional)')}</label>
      <select id="am-spalte" bind:value={wahl.spalte}><option value="">{L('Keine Spalten, nur „Insgesamt“', 'No columns, only "Total"')}</option>
        {#each spaltenListe.filter(x => x.name !== wahl.zeile) as x (x.name)}<option value={x.name}>{beschr(x)}</option>{/each}</select>
      <p class="as-hilfe">{L('Dazu kommen immer die Ränder („Insgesamt“). Fälle ohne Angabe oder ohne Gewicht stehen nicht in der Tabelle.', 'The totals are always added. Cases without a value or without a weight are not in the table.')}</p></div>
    <fieldset class="as-gruppe"><legend>{L('3. Inhalt der Zellen', '3. Content of the cells')}</legend>
      <div class="segment am-segment" role="radiogroup" aria-label={L('Inhalt', 'Content')}>
        {#each Object.entries(inhaltName) as [k, f]}{#if inhaltGeht(k as AmtlichInhalt)}<label><input type="radio" name="am-inhalt" value={k} bind:group={wahl.inhalt}>{f()}</label>{/if}{/each}</div>
      {#if brauchtWert(wahl)}
        <div class="as-feld"><label for="am-wert">{L('Welche Zahl?', 'Which number?')}</label>
          <select id="am-wert" bind:value={wahl.wert}><option value="">{L('Zahlenspalte wählen …', 'Choose a number column …')}</option>
            {#each zahlenSpalten.filter(x => x.name !== wahl.zeile && x.name !== wahl.spalte) as x (x.name)}<option value={x.name}>{lesbar(x, true)}{x.bezeichnung ? ` (${x.name})` : ''}</option>{/each}</select></div>
      {/if}
    </fieldset>
    <fieldset class="as-gruppe"><legend>{L('4. Geheimhaltung', '4. Confidentiality')}</legend>
      <div class="segment" role="radiogroup" aria-label={L('Geheimhaltung', 'Confidentiality')}>
        <label><input type="radio" name="am-geheim" value="aus" bind:group={wahl.geheim}>{L('Aus', 'Off')}</label>
        <label><input type="radio" name="am-geheim" value="sperren" bind:group={wahl.geheim}>{L('Kleine Zellen sperren', 'Suppress small cells')}</label>
        <label class:aus={wahl.inhalt !== 'anzahl' && wahl.inhalt !== 'summe'}><input type="radio" name="am-geheim" value="runden" disabled={wahl.inhalt !== 'anzahl' && wahl.inhalt !== 'summe'} bind:group={wahl.geheim}>{L('Runden', 'Round')}</label></div>
      {#if wahl.geheim === 'sperren'}
        <div class="as-feld am-zahl"><label for="am-minn">{L('Gesperrt wird eine Zelle mit weniger als … Fällen', 'A cell with fewer than … cases is suppressed')}</label><input id="am-minn" type="number" min="1" step="1" bind:value={wahl.minN}>
          <p class="as-hilfe">{L('Die Grenze legt die Organisation fest. Voreinstellung 3. Gesperrt wird auf den ungewichteten Fällen; weitere Zellen werden gesperrt, damit man gesperrte Zahlen nicht aus den Summen ausrechnen kann.', 'The organisation sets the limit. Default 3. Suppression uses unweighted cases; further cells are suppressed so that suppressed numbers cannot be calculated from the totals.')}</p></div>
      {:else if wahl.geheim === 'runden'}
        <div class="segment" role="radiogroup" aria-label={L('Rundungsbasis', 'Rounding base')}>{#each [3, 5, 10] as b}<label><input type="radio" name="am-basis" value={b} bind:group={wahl.rundenBasis}>{L(`Auf ein Vielfaches von ${b}`, `To a multiple of ${b}`)}</label>{/each}</div>
        <p class="as-hilfe">{L('Alle Zahlen werden gerundet. Summen können abweichen.', 'All numbers are rounded. Totals may differ.')}</p>
      {/if}
      {#if wahl.inhalt !== 'anzahl' && wahl.inhalt !== 'summe'}<p class="as-hilfe">{L('Runden gibt es nur für Anzahl und Summe.', 'Rounding exists only for count and sum.')}</p>{/if}
    </fieldset>
  {/snippet}

  {#snippet weitere()}
    <fieldset class="as-gruppe"><legend>{L('Weitere Regeln für das Sperren', 'More rules for suppression')}</legend>
      <label class="as-eins"><input type="checkbox" bind:checked={wahl.dominanz} disabled={wahl.geheim !== 'sperren'}><span>{L('Dominanzregel: Ein Fall macht mehr als … % der Zelle aus', 'Dominance rule: one case makes up more than … % of the cell')}</span></label>
      {#if wahl.dominanz}<div class="as-feld am-zahl"><label for="am-dk">{L('Prozent', 'Percent')}</label><input id="am-dk" type="number" min="1" max="99" bind:value={wahl.dominanzK}></div>{/if}
      <label class="as-eins"><input type="checkbox" bind:checked={wahl.prozentRegel} disabled={wahl.geheim !== 'sperren'}><span>{L('p-%-Regel (der Rest ohne die zwei größten Beiträge muss mindestens p % des größten sein)', 'p% rule (the rest without the two largest contributions must be at least p% of the largest)')}</span></label>
      {#if wahl.prozentRegel}<div class="as-feld am-zahl"><label for="am-pp">p</label><input id="am-pp" type="number" min="1" max="99" bind:value={wahl.prozentP}></div>{/if}
      {#if wahl.geheim !== 'sperren'}<p class="as-hilfe">{L('Diese Regeln gelten beim Sperren.', 'These rules apply when suppressing.')}</p>{/if}
    </fieldset>
    <fieldset class="as-gruppe"><legend>{L('Kennzeichnung', 'Marking')}</legend>
      <p class="as-hilfe">{L('Die Grenzen legt die Organisation fest; die Voreinstellung ist ein Beispiel.', 'The organisation sets the limits; the default is an example.')}</p>
      <div class="am-reihe">
        <div class="as-feld am-zahl"><label for="am-gx">{L('„x“ unter … Fällen', '"x" below … cases')}</label><input id="am-gx" type="number" min="0" step="1" bind:value={wahl.grenzen.nMinX}></div>
        <div class="as-feld am-zahl"><label for="am-gk">{L('„( )“ unter … Fällen', '"( )" below … cases')}</label><input id="am-gk" type="number" min="0" step="1" bind:value={wahl.grenzen.nMinKlammer}></div>
        <div class="as-feld am-zahl"><label for="am-gcv">{L('„( )“ ab Variationskoeffizient', '"( )" from coefficient of variation')}</label><input id="am-gcv" type="number" min="0" step="0.01" bind:value={wahl.grenzen.cvKlammer}></div></div>
      <p class="as-hilfe">{grenzenSatz(amtlichWahlAus(wahl).grenzen)}</p>
      <label data-begriff="variationskoeffizient" class="as-eins"><input type="checkbox" bind:checked={wahl.cvZeigen} disabled={weg === 'js'}><span>{L('Variationskoeffizient (CV) neben jeder Zahl zeigen', 'Show the coefficient of variation (CV) next to each number')}</span></label>
      {#if weg === 'js'}<p class="as-hilfe">{L('Den CV gibt es nur mit Stichprobenplan oder Replikationsgewichten.', 'The CV exists only with a sampling design or replicate weights.')}</p>{/if}
    </fieldset>
    <fieldset class="as-gruppe"><legend>{L('Replikationsgewichte in der Tabelle', 'Replicate weights in the table')}</legend>
      {#if gw?.art === 'umfrage'}
        <label class="as-eins"><input type="checkbox" checked={wahl.rep.an} onchange={(e) => repAn(e.currentTarget.checked)} disabled={!anfaenge.length && !wahl.rep.an}><span>{L('Standardfehler mit Replikationsgewichten der Daten rechnen', 'Calculate standard errors with replicate weights from the data')}</span></label>
        {#if !anfaenge.length}<p class="as-hilfe">{L('Es gibt keine Spalten, die wie Replikationsgewichte aussehen (gemeinsamer Anfang, danach Ziffern, mindestens 5).', 'There are no columns that look like replicate weights (common start, then digits, at least 5).')}</p>{/if}
        {#if wahl.rep.an}
          <div class="am-reihe">
            <div class="as-feld"><label for="am-ra">{L('Gemeinsamer Anfang der Spaltennamen', 'Common start of the column names')}</label>
              <select id="am-ra" bind:value={wahl.rep.anfang}>{#each anfaenge as a}<option value={a.anfang}>{a.anfang} ({L(`${a.anzahl} Spalten`, `${a.anzahl} columns`)})</option>{/each}
                {#if wahl.rep.anfang && !anfaenge.some(a => a.anfang === wahl.rep.anfang)}<option value={wahl.rep.anfang}>{wahl.rep.anfang}</option>{/if}</select></div>
            <div class="as-feld"><label for="am-rt">{L('Art', 'Type')}</label>
              <select id="am-rt" bind:value={wahl.rep.typ}>{#each REP_TYPEN as t}<option value={t}>{t === 'bootstrap' ? 'Bootstrap' : t === 'JK1' ? L('Jackknife (JK1)', 'Jackknife (JK1)') : t === 'BRR' ? 'BRR' : 'Fay'}</option>{/each}</select></div>
            {#if wahl.rep.typ === 'Fay'}<div class="as-feld am-zahl"><label for="am-rho">rho (0 {L('bis unter', 'to below')} 1)</label><input id="am-rho" type="number" min="0" max="0.99" step="0.05" bind:value={wahl.rep.fay}></div>{/if}
            <div class="as-feld am-zahl"><label for="am-scale">{L('Faktor (scale)', 'Factor (scale)')}</label><input id="am-scale" type="text" inputmode="decimal" value={scaleText} oninput={(e) => scaleSetzen(e.currentTarget.value)} placeholder={L('Voreinstellung', 'default')}></div></div>
          <p class="as-hilfe">{L('Der Faktor steht in der Beschreibung der Daten (zum Beispiel 1/49 bei 50 Bootstrap-Gewichten). Ohne Eingabe gilt die Voreinstellung der Art: Bootstrap 1/(R − 1), wobei R die Zahl der Spalten ist.', 'The factor is stated in the description of the data (for example 1/49 for 50 bootstrap weights). Without input the default of the type applies: bootstrap 1/(R − 1), where R is the number of columns.')}
            {#if !wahl.rep.scale}{' '}{L('Gilt jetzt: Voreinstellung.', 'Applies now: default.')}{:else}{' '}{L(`Gilt jetzt: ${komma(wahl.rep.scale, 4)}.`, `Applies now: ${komma(wahl.rep.scale, 4)}.`)}{/if}</p>
        {/if}
      {:else}<p class="as-hilfe">{L('Replikationsgewichte gibt es nur mit einem Umfragegewicht.', 'Replicate weights exist only with a survey weight.')}</p>{/if}
    </fieldset>
    <fieldset class="as-gruppe"><legend>{L('Quelle und Fußnote', 'Source and note')}</legend>
      <div class="as-feld"><label for="am-quelle">{L('Quelle', 'Source')}</label><input id="am-quelle" type="text" bind:value={wahl.quelle}></div>
      <div class="as-feld"><label for="am-fuss">{L('Fußnote', 'Note')}</label><textarea id="am-fuss" rows="2" bind:value={wahl.fussnote}></textarea></div>
      <p class="as-hilfe">{L('Beides steht unter der Tabelle, auch in Bericht, Word, PDF und Excel.', 'Both appear below the table, also in the report, Word, PDF and Excel.')}</p>
    </fieldset>
  {/snippet}

  {#snippet vorschau()}
    {#if r.art === 'ok'}<AmtlichAnzeige {r} />
    {:else if r.art === 'rechnen'}
      <p class="as-hilfe">{r.weg === 'rep' ? L('Die Standardfehler kommen von R (Paket survey) mit den Replikationsgewichten. Das Laden von R dauert beim ersten Mal etwas.', 'The standard errors come from R (package survey) with the replicate weights. Loading R takes a moment the first time.') : L('Die Standardfehler kommen von R (Paket survey) mit dem Stichprobenplan. Das Laden von R dauert beim ersten Mal etwas.', 'The standard errors come from R (package survey) with the sampling design. Loading R takes a moment the first time.')}</p>
      <div class="knopfzeile"><button class="k haupt" type="button" aria-disabled={lad.aktiv ? 'true' : undefined} onclick={rechnen}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{L('Tabelle mit R rechnen', 'Calculate the table with R')}</button></div>
      {#if lad.sichtbar}<p><Rechnet text={L('Die Tabelle wird gerechnet …', 'The table is being calculated …')} /></p>{/if}
    {:else if r.art === 'fehler'}<p class="am-fehler" role="alert">{r.text}</p>
    {:else}<p class="am-klein">{L('Die Tabelle erscheint, sobald die Zeilen (und bei Mittelwert und Summe die Zahl) gewählt sind.', 'The table appears as soon as the rows (and for mean and sum the number) are chosen.')}</p>{/if}
    {#if rFehler}<p class="am-fehler" role="alert">{rFehler}</p>{/if}
  {/snippet}
</AssistentRahmen>

<style>
  .am-etikett { font-weight: 650; }
  .am-segment { flex-direction: column; align-items: stretch; }
  .am-reihe { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); align-items: flex-end; }
  .am-zahl input[type='number'], .am-zahl input[type='text'] { width: 9rem; max-width: 100%; }
  .am-klein { color: var(--tinte-2); max-width: var(--breite-text); }
  .am-fehler { color: var(--verlust); max-width: var(--breite-text); }
</style>
