<script lang="ts">
  /**
   * „Wie oft kommt welcher Code vor?“ (Fall-Code-Matrix, Quantifizieren), Stufe 5, Paket 5E1: Auswahl, Hinweissätze, Tabelle, uneindeutige Fälle,
   * „Als Datensatz übernehmen“ (mit Zitaten nur auf ausdrückliche Wahl), Code-Überschneidungen und Segmentlängen als Tabellen.
   * Der Rechenkern steht in `lib/qualauswertung.ts`; der Datensatz geht über `oeffneNeueDaten` (Werte als Text und Zahlen, nie als Befehlstext).
   * Texte aus dem Projekt (Namen, Codes, Zitate) kommen nur als Text auf die Seite.
   */
  import { tick } from 'svelte';
  import { L, Lp, melde, oeffneNeueDaten } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { dez, ganzZahl } from '../i18n/profil';
  import { Laedt } from '../lib/laedt.svelte';
  import { behalteInterviews, merkeZitate, qualProjekt } from '../lib/interviews.svelte';
  import { exportWarnungen, faelleVonDokumenten, type ExportWarnung } from '../lib/einwilligung';
  import { codeUeberschneidungen, fallCodeMatrix, segmentlaengen, type Matrix, type MatrixOptionen, type Personen } from '../lib/qualauswertung';
  import { kodierbareCodes, matrixDatensatz, standardStufen, stufenCodes } from '../lib/qualauswertung-ausgabe';
  import Rechnet from './Rechnet.svelte';

  const sprache = (): 'de' | 'en' => (L('de', 'en') === 'en' ? 'en' : 'de');
  const lade = new Laedt();
  const q = $derived(qualProjekt());
  const codes = $derived(q ? kodierbareCodes(q) : []);
  const stufenWahl = $derived(q ? stufenCodes(q) : []);
  const hatKodierungen = $derived((q?.kodierungen.length ?? 0) > 0);

  let art = $state<'01' | 'anzahl' | 'stufe'>('01');
  let zeilenArt = $state<'faelle' | 'dokumente'>('faelle');
  let person = $state('alle');
  let gewaehlt = $state<string[]>([]);
  let stufenCode = $state('');
  let stufen = $state<Record<string, number>>({});
  let zitate = $state(false);
  /** Warnung vor dem Übernehmen von Zitaten (Einwilligung, Feinstruktur F2B): Text im Bereich, Fokus darauf, nie ein modales Fenster, nie gesperrt. */
  let zitatWarnungen = $state<ExportWarnung[] | null>(null);
  $effect(() => { if (!zitate) zitatWarnungen = null; });
  let angefangen = $state(false);
  $effect(() => { if (!angefangen && codes.length) { gewaehlt = codes.map(c => c.id); angefangen = true; } });
  $effect(() => { if (!stufenCode && stufenWahl.length) { stufenCode = stufenWahl[0]!.id; stufen = standardStufen(stufenWahl[0]!.unter); } });
  const unter = $derived(stufenWahl.find(x => x.id === stufenCode)?.unter ?? []);
  function waehleStufenCode(id: string) { stufenCode = id; stufen = standardStufen(stufenWahl.find(x => x.id === id)?.unter ?? []); }

  const personen = $derived<Personen>(person === 'alle' ? 'alle' : [person]);
  const mehrerePersonen = $derived(person === 'alle' && (q?.kodierende.length ?? 0) > 1);
  const optionen = $derived<MatrixOptionen>({ art, zeilen: zeilenArt, kodierende: personen, codes: art === 'stufe' ? (stufenCode ? [stufenCode] : []) : gewaehlt, ...(art === 'stufe' ? { stufen: { ...stufen } } : {}) });
  const schluessel = $derived(JSON.stringify(optionen));

  let ergebnis = $state<{ matrix: Matrix; opt: MatrixOptionen; key: string; mitPersonen: boolean } | null>(null);
  let ueberErg = $state<{ namen: string[]; werte: number[][]; mitPersonen: boolean } | null>(null);
  let laengeErg = $state<{ zeilen: ReturnType<typeof segmentlaengen>; namen: Record<string, string>; mitPersonen: boolean } | null>(null);
  const veraltet = $derived(!!ergebnis && ergebnis.key !== schluessel);

  const nameVon = (id: string): string => q?.codes.find(c => c.id === id)?.name ?? id;

  async function erstellen() {
    if (!q) return;
    if (optionen.codes.length === 0) { sage(L('Bitte mindestens einen Code wählen.', 'Please choose at least one code.'), 'dringend'); document.getElementById('qm-codes-leg')?.focus(); return; }
    if (art === 'stufe') {
      const zahlen = Object.values(stufen);
      if (zahlen.some(z => !Number.isFinite(z))) { sage(L('Bitte jedem Untercode eine Zahl geben.', 'Please give every subcode a number.'), 'dringend'); return; }
    }
    const m = fallCodeMatrix(q, optionen);
    ergebnis = { matrix: m, opt: { ...optionen, codes: [...optionen.codes] }, key: schluessel, mitPersonen: mehrerePersonen };
    await tick();
    const h = document.getElementById('qm-erg-t'); h?.scrollIntoView({ block: 'start' }); h?.focus();
    sage(L(`Tabelle erstellt: ${Lp(m.zeilen.length, '1 Zeile', `${m.zeilen.length} Zeilen`, '1 row', `${m.zeilen.length} rows`)}, ${Lp(m.spalten.length, '1 Spalte', `${m.spalten.length} Spalten`, '1 column', `${m.spalten.length} columns`)}.`, `Table created: ${Lp(m.zeilen.length, '1 Zeile', `${m.zeilen.length} Zeilen`, '1 row', `${m.zeilen.length} rows`)}, ${Lp(m.spalten.length, '1 Spalte', `${m.spalten.length} Spalten`, '1 column', `${m.spalten.length} columns`)}.`));
  }
  async function ueberschneidungen() {
    if (!q || !gewaehlt.length) { sage(L('Bitte mindestens einen Code wählen.', 'Please choose at least one code.'), 'dringend'); return; }
    const c = [...gewaehlt];
    ueberErg = { namen: c.map(nameVon), werte: codeUeberschneidungen(q, { kodierende: personen, codes: c }), mitPersonen: mehrerePersonen };
    await tick();
    const h = document.getElementById('qm-ueb-erg-t'); h?.scrollIntoView({ block: 'start' }); h?.focus();
    sage(L('Tabelle der Code-Überschneidungen erstellt.', 'Table of code overlaps created.'));
  }
  async function laengen() {
    if (!q || !gewaehlt.length) { sage(L('Bitte mindestens einen Code wählen.', 'Please choose at least one code.'), 'dringend'); return; }
    const c = [...gewaehlt];
    laengeErg = { zeilen: segmentlaengen(q, { kodierende: personen, codes: c }), namen: Object.fromEntries(c.map(x => [x, nameVon(x)])), mitPersonen: mehrerePersonen };
    await tick();
    const h = document.getElementById('qm-len-erg-t'); h?.scrollIntoView({ block: 'start' }); h?.focus();
    sage(L('Tabelle der Segmentlängen erstellt.', 'Table of passage lengths created.'));
  }

  async function pruefeZitateUndUebernimm() {
    const e = ergebnis;
    if (!q || !e || veraltet) return;
    if (zitate && e.opt.art !== 'stufe') {
      const ids = e.matrix.zeilen.map(z => z.id);
      const dokIds = e.opt.zeilen === 'dokumente' ? ids : ids.filter(i => i.startsWith('dok:')).map(i => i.slice(4));
      const faelle = [...new Set([...(e.opt.zeilen === 'faelle' ? ids : []), ...faelleVonDokumenten(q, dokIds)])];
      const w = exportWarnungen(q, 'fall-code-matrix-zitate', faelle, sprache());
      if (w.length) {
        zitatWarnungen = w;
        await tick();
        document.getElementById('qm-zit-warn-t')?.focus();
        return;
      }
    }
    zitatWarnungen = null;
    await alsDatensatz();
  }
  async function alsDatensatz() {
    const e = ergebnis;
    if (!q || !e || veraltet) return;
    await lade.mit(async () => {
      try {
        const d = matrixDatensatz(q, e.matrix, e.opt, sprache(), zitate && e.opt.art !== 'stufe');
        if (!d.zeilen.length) { sage(L('Es gibt keine Zeilen zum Öffnen.', 'There are no rows to open.'), 'dringend'); return; }
        await behalteInterviews(() => oeffneNeueDaten(L('Fall-Code-Matrix', 'Case-code matrix'), L(`Fall-Code-Matrix (${Lp(d.zeilen.length, '1 Zeile', `${d.zeilen.length} Zeilen`, '1 row', `${d.zeilen.length} rows`)})`, `Case-code matrix (${Lp(d.zeilen.length, '1 Zeile', `${d.zeilen.length} Zeilen`, '1 row', `${d.zeilen.length} rows`)})`), d.spalten, d.zeilen));
        if (d.enthaeltZitate) merkeZitate();
        melde(L(`Datensatz erzeugt: ${Lp(d.zeilen.length, '1 Zeile', `${d.zeilen.length} Zeilen`, '1 row', `${d.zeilen.length} rows`)}, ${Lp(d.spalten.length, '1 Spalte', `${d.spalten.length} Spalten`, '1 column', `${d.spalten.length} columns`)}. Sie sehen ihn jetzt in der Datenansicht.`, `Data set created: ${Lp(d.zeilen.length, '1 Zeile', `${d.zeilen.length} Zeilen`, '1 row', `${d.zeilen.length} rows`)}, ${Lp(d.spalten.length, '1 Spalte', `${d.spalten.length} Spalten`, '1 column', `${d.spalten.length} columns`)}. You now see it in the data view.`)
          + (d.meldungen.length ? ' ' + d.meldungen.join(' ') : '')
          + (d.enthaeltZitate ? ' ' + L('Die Datei enthält jetzt Interviewtext (Zitate). Das sind persönliche Daten.', 'The file now contains interview text (quotes). That is personal data.') : ''));
        location.hash = 'daten';
        await tick();
      } catch (err) { melde(L(`Der Datensatz ließ sich nicht erzeugen: ${(err as Error).message}`, `The data set could not be created: ${(err as Error).message}`)); }
    });
  }
  const f1 = (x: number | null): string => (x === null ? '-' : dez(x.toFixed(1)));
  const zelle = (m: Matrix, zi: number, si: number): string => {
    const w = m.werte[zi]?.[si] ?? null;
    if (w !== null) return ganzZahl(w);
    return m.uneindeutig.includes(m.zeilen[zi]!.id) ? L('uneindeutig', 'ambiguous') : L('nicht eingestuft', 'not rated');
  };
  function alleCodes(an: boolean) { gewaehlt = an ? codes.map(c => c.id) : []; }
</script>

<div class="matrix" role="group" aria-label={L('Fall-Code-Matrix', 'Case-code matrix')}>
  {#if !q || !hatKodierungen}
    <p class="hilfe">{L('Für diese Auswertung braucht es Kodierungen. Lesen Sie ein Projekt aus einem Kodierprogramm ein (.qdpx) oder kodieren Sie Textstellen. Danach zählt Statable hier, wie oft jeder Code in jedem Fall vorkommt.', 'This analysis needs codings. Read in a project from a coding program (.qdpx) or code passages. Then Statable counts here how often each code occurs in each case.')}</p>
  {:else}
    <p class="hilfe">{L('Statable zählt, in welchem Fall (oder Dokument) welcher Code vorkommt. Daraus entsteht eine Tabelle, die Sie als Datensatz weiter auswerten können. Das ist Quantifizieren: Aussagen aus Texten werden zu Zahlen.', 'Statable counts in which case (or document) which code occurs. That gives a table you can analyse further as a data set. This is quantitizing: statements from texts become numbers.')}</p>

    <fieldset class="gruppe">
      <legend>{L('Was soll in die Tabelle?', 'What goes into the table?')}</legend>
      <div class="eingabe"><label for="qm-art">{L('Art der Zahl', 'Kind of number')}</label>
        <select id="qm-art" bind:value={art}>
          <option value="01">{L('vorhanden (0 oder 1)', 'present (0 or 1)')}</option>
          <option value="anzahl">{L('Anzahl der Textstellen', 'number of passages')}</option>
          <option value="stufe" disabled={!stufenWahl.length}>{L('Einstufung aus Untercodes (zum Beispiel niedrig, mittel, hoch)', 'rating from subcodes (for example low, medium, high)')}</option>
        </select></div>
      <div class="eingabe"><label for="qm-zeilen">{L('Eine Zeile je …', 'One row per …')}</label>
        <select id="qm-zeilen" bind:value={zeilenArt}>
          <option value="faelle">{L('Fall (Interviewte Person oder Interview)', 'case (interviewee or interview)')}</option>
          <option value="dokumente">{L('Dokument', 'document')}</option>
        </select></div>
      <div class="eingabe"><label for="qm-person">{L('Kodiert von', 'Coded by')}</label>
        <select id="qm-person" bind:value={person}>
          <option value="alle">{L('allen Kodierenden zusammen', 'all coders together')}</option>
          {#each q.kodierende as k (k.id)}<option value={k.id}>{k.name}</option>{/each}
        </select></div>
      {#if mehrerePersonen && art === 'anzahl'}<p class="hilfe">{L('Bei „allen Kodierenden zusammen“ zählt eine Stelle doppelt, wenn zwei Personen sie kodiert haben. Wählen Sie eine Person, um jede Stelle nur einmal zu zählen.', 'With "all coders together" a passage counts twice if two people coded it. Choose one person to count each passage only once.')}</p>{/if}

      {#if art === 'stufe'}
        <div class="eingabe"><label for="qm-stufcode">{L('Obercode mit den Stufen', 'Parent code with the levels')}</label>
          <select id="qm-stufcode" value={stufenCode} onchange={(e) => waehleStufenCode(e.currentTarget.value)}>
            {#each stufenWahl as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
          </select></div>
        <fieldset class="gruppe innen">
          <legend>{L('Zahl für jeden Untercode', 'Number for each subcode')}</legend>
          {#each unter as u (u.id)}
            <div class="eingabe zeile"><label for="qm-st-{u.id}">{u.name}</label>
              <input id="qm-st-{u.id}" type="number" step="1" min="1" max="97" value={stufen[u.id] ?? ''} oninput={(e) => { stufen = { ...stufen, [u.id]: e.currentTarget.valueAsNumber }; }}></div>
          {/each}
        </fieldset>
      {:else}
        <fieldset class="gruppe innen">
          <legend id="qm-codes-leg" tabindex="-1">{L(`Codes (${gewaehlt.length} von ${codes.length} gewählt)`, `Codes (${gewaehlt.length} of ${codes.length} chosen)`)}</legend>
          <div class="knopfzeile">
            <button class="k klein" type="button" onclick={() => alleCodes(true)}>{L('Alle Codes wählen', 'Choose all codes')}</button>
            <button class="k klein" type="button" onclick={() => alleCodes(false)}>{L('Keinen Code wählen', 'Choose no code')}</button>
          </div>
          {#each codes as c (c.id)}
            <label class="schalter" style="padding-inline-start: {c.ebene * 1.25}rem"><input type="checkbox" value={c.id} bind:group={gewaehlt}>{c.name}</label>
          {/each}
        </fieldset>
      {/if}
    </fieldset>

    <div class="knopfzeile"><button class="k haupt" id="qm-erstellen" type="button" onclick={() => void erstellen()}>{L('Tabelle erstellen', 'Create table')}</button></div>

    {#if ergebnis}
      {@const m = ergebnis.matrix}
      <h3 id="qm-erg-t" tabindex="-1">{L(`Fall-Code-Matrix (${Lp(m.zeilen.length, '1 Zeile', `${m.zeilen.length} Zeilen`, '1 row', `${m.zeilen.length} rows`)}, ${Lp(m.spalten.length, '1 Spalte', `${m.spalten.length} Spalten`, '1 column', `${m.spalten.length} columns`)})`, `Case-code matrix (${Lp(m.zeilen.length, '1 Zeile', `${m.zeilen.length} Zeilen`, '1 row', `${m.zeilen.length} rows`)}, ${Lp(m.spalten.length, '1 Spalte', `${m.spalten.length} Spalten`, '1 column', `${m.spalten.length} columns`)})`)}</h3>
      {#if veraltet}<p class="hinweis">{L('Die Auswahl hat sich geändert. Erstellen Sie die Tabelle neu.', 'The selection has changed. Create the table again.')}</p>{/if}
      {#if ergebnis.opt.art === '01'}
        <p>{L('0 heißt: nicht kodiert. Das ist nicht dasselbe wie „trifft nicht zu“.', '0 means: not coded. That is not the same as "does not apply".')}</p>
      {:else if ergebnis.opt.art === 'anzahl'}
        <p>{L('Wie oft etwas kodiert ist, hängt auch davon ab, wie lang das Interview war und wie fein kodiert wurde.', 'How often something is coded also depends on how long the interview was and how finely it was coded.')}</p>
        {#if ergebnis.mitPersonen}<p>{L('Eine Stelle zählt doppelt, wenn zwei Personen sie kodiert haben.', 'A passage counts twice if two people coded it.')}</p>{/if}
      {:else}
        <p>{L('Bei einer evaluativen Inhaltsanalyse bekommt jeder Fall eine Einstufung. Statable zählt nicht, es übernimmt Ihre Einstufung.', 'In an evaluative content analysis every case gets a rating. Statable does not count, it takes over your rating.')}</p>
        <p>{L('„nicht eingestuft“ heißt: Im Fall steht kein Untercode. „uneindeutig“ heißt: Im Fall stehen verschiedene Stufen.', '"not rated" means: no subcode in the case. "ambiguous" means: different levels in the case.')}</p>
      {/if}
      {#if !m.zeilen.length || !m.spalten.length}
        <p>{L('Die Tabelle ist leer.', 'The table is empty.')}</p>
      {:else}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="rahmen" role="region" tabindex="0" aria-label={L('Fall-Code-Matrix, seitlich scrollbar', 'Case-code matrix, scrollable sideways')}>
          <table class="tab">
            <caption class="nur-vorleser">{L('Fall-Code-Matrix: Zeilen sind Fälle oder Dokumente, Spalten sind Codes', 'Case-code matrix: rows are cases or documents, columns are codes')}</caption>
            <thead><tr><th scope="col">{ergebnis.opt.zeilen === 'faelle' ? L('Fall', 'Case') : L('Dokument', 'Document')}</th>{#each m.spalten as sp (sp.code)}<th scope="col">{sp.name}</th>{/each}</tr></thead>
            <tbody>
              {#each m.zeilen as z, zi (z.id)}
                <tr><th scope="row">{z.name}</th>{#each m.spalten as sp, si (sp.code)}<td>{zelle(m, zi, si)}</td>{/each}</tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
      {#if m.uneindeutig.length}
        <h4 id="qm-unein-t">{L(`Uneindeutige Fälle (${m.uneindeutig.length})`, `Ambiguous cases (${m.uneindeutig.length})`)}</h4>
        <ul aria-labelledby="qm-unein-t">{#each m.uneindeutig as id (id)}<li>{m.zeilen.find(z => z.id === id)?.name ?? id}</li>{/each}</ul>
      {/if}

      <fieldset class="gruppe">
        <legend>{L('Als Datensatz übernehmen', 'Take over as data set')}</legend>
        {#if ergebnis.opt.art !== 'stufe'}
          <label class="schalter"><input type="checkbox" bind:checked={zitate}>{L('Zitate als Textspalten übernehmen', 'Take over quotes as text columns')}</label>
          <p class="hilfe">{L('Dann steht je Code eine Spalte mit den Textstellen in den Daten. Das ist Interviewtext, also persönliche Daten. Voreinstellung: aus.', 'Then each code gets a column with the passages in the data. That is interview text, so personal data. Default: off.')}</p>
        {/if}
        <p class="hilfe">{L('Diese Zahlen kommen aus kodierten Interviews. Die Fälle sind meist gezielt ausgewählt und wenige; ein p-Wert sagt dann wenig.', 'These numbers come from coded interviews. The cases are usually selected on purpose and few; a p-value then says little.')}</p>
        <div class="knopfzeile"><button class="k haupt" type="button" aria-disabled={lade.aktiv || veraltet ? 'true' : undefined} onclick={() => { if (!lade.aktiv && !veraltet) void pruefeZitateUndUebernimm(); }}>{L('Als Datensatz übernehmen', 'Take over as data set')}</button></div>
        {#if zitatWarnungen}
          <div class="warnung" role="group" aria-labelledby="qm-zit-warn-t">
            <h4 id="qm-zit-warn-t" tabindex="-1">{Lp(zitatWarnungen.length, 'Achtung zur Einwilligung (1 Hinweis)', `Achtung zur Einwilligung (${zitatWarnungen.length} Hinweise)`, 'Check consent (1 note)', `Check consent (${zitatWarnungen.length} notes)`)}</h4>
            <ul>{#each zitatWarnungen as w, i (i)}<li>{w.satz}</li>{/each}</ul>
            <p class="hilfe">{L('Statable sperrt nichts. Vielleicht gibt es eine spätere Zustimmung, die noch nicht eingetragen ist. Die Einwilligung tragen Sie im Bereich „Einwilligung“ dieser Seite ein.', 'Statable blocks nothing. Perhaps there is a later consent that is not entered yet. You enter consent in the section "Consent" on this page.')}</p>
            <div class="knopfzeile">
              <button class="k" type="button" onclick={() => { zitatWarnungen = null; void alsDatensatz(); }}>{L('Trotzdem übernehmen', 'Take over anyway')}</button>
              <button class="k leise" type="button" onclick={() => { zitatWarnungen = null; document.getElementById('qm-erg-t')?.focus(); sage(L('Abgebrochen. Es wurde nichts übernommen.', 'Cancelled. Nothing was taken over.')); }}>{L('Abbrechen', 'Cancel')}</button>
            </div>
          </div>
        {/if}
        {#if lade.sichtbar}<p class="hilfe"><Rechnet text={L('Datensatz wird erzeugt …', 'Creating the data set …')} /></p>{/if}
      </fieldset>
    {/if}

    {#if art !== 'stufe'}
      <h3 id="qm-ueb-t" tabindex="-1">{L('Welche Codes stehen an derselben Stelle? (Code-Überschneidungen)', 'Which codes sit on the same passage? (code overlaps)')}</h3>
      <p class="hilfe">{L('Gilt für die oben gewählten Personen und Codes. Die Zahl nennt, wie oft sich Textstellen mit beiden Codes überlappen. In der Diagonale steht, wie viele Textstellen der Code hat.', 'Applies to the people and codes chosen above. The number says how often passages with both codes overlap. The diagonal shows how many passages the code has.')}</p>
      <div class="knopfzeile"><button class="k" type="button" onclick={() => void ueberschneidungen()}>{L('Überschneidungen berechnen', 'Calculate overlaps')}</button></div>
      {#if ueberErg}
        <h4 id="qm-ueb-erg-t" tabindex="-1">{L('Code-Überschneidungen', 'Code overlaps')}</h4>
        {#if ueberErg.mitPersonen}<p class="hilfe">{L('Gezählt wird je Person, dann zusammen: eine Stelle zählt doppelt, wenn zwei Personen sie kodiert haben.', 'Counted per person, then added: a passage counts twice if two people coded it.')}</p>{/if}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="rahmen" role="region" tabindex="0" aria-label={L('Code-Überschneidungen, seitlich scrollbar', 'Code overlaps, scrollable sideways')}>
          <table class="tab">
            <caption class="nur-vorleser">{L('Code-Überschneidungen: Zahl der überlappenden Textstellen je Codepaar', 'Code overlaps: number of overlapping passages per code pair')}</caption>
            <thead><tr><th scope="col">{L('Code', 'Code')}</th>{#each ueberErg.namen as n, i (i)}<th scope="col">{n}</th>{/each}</tr></thead>
            <tbody>{#each ueberErg.werte as zeile, i (i)}<tr><th scope="row">{ueberErg.namen[i]}</th>{#each zeile as w, j (j)}<td>{ganzZahl(w)}</td>{/each}</tr>{/each}</tbody>
          </table>
        </div>
      {/if}

      <h3 id="qm-len-t" tabindex="-1">{L('Wie lang sind die kodierten Textstellen? (Segmentlängen)', 'How long are the coded passages? (passage lengths)')}</h3>
      <p class="hilfe">{L('Gilt für die oben gewählten Personen und Codes. Länge in Zeichen und in Wörtern.', 'Applies to the people and codes chosen above. Length in characters and in words.')}</p>
      <div class="knopfzeile"><button class="k" type="button" onclick={() => void laengen()}>{L('Segmentlängen berechnen', 'Calculate passage lengths')}</button></div>
      {#if laengeErg}
        <h4 id="qm-len-erg-t" tabindex="-1">{L('Segmentlängen', 'Passage lengths')}</h4>
        <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollbarer Bereich per Tastatur erreichbar) -->
        <div class="rahmen" role="region" tabindex="0" aria-label={L('Segmentlängen, seitlich scrollbar', 'Passage lengths, scrollable sideways')}>
          <table class="tab">
            <caption class="nur-vorleser">{L('Segmentlängen je Code', 'Passage lengths per code')}</caption>
            <thead><tr>
              <th scope="col">{L('Code', 'Code')}</th><th scope="col">{L('Textstellen', 'Passages')}</th>
              <th scope="col">{L('Zeichen: Mittelwert', 'Characters: mean')}</th><th scope="col">{L('Zeichen: Median', 'Characters: median')}</th><th scope="col">{L('Zeichen: kleinste', 'Characters: smallest')}</th><th scope="col">{L('Zeichen: größte', 'Characters: largest')}</th>
              <th scope="col">{L('Wörter: Mittelwert', 'Words: mean')}</th><th scope="col">{L('Wörter: Median', 'Words: median')}</th><th scope="col">{L('Wörter: kleinste', 'Words: smallest')}</th><th scope="col">{L('Wörter: größte', 'Words: largest')}</th>
            </tr></thead>
            <tbody>
              {#each laengeErg.zeilen as z (z.code)}
                <tr><th scope="row">{laengeErg.namen[z.code]}</th><td>{ganzZahl(z.n)}</td>
                  <td>{f1(z.zeichen?.mittel ?? null)}</td><td>{f1(z.zeichen?.median ?? null)}</td><td>{f1(z.zeichen?.min ?? null)}</td><td>{f1(z.zeichen?.max ?? null)}</td>
                  <td>{f1(z.woerter?.mittel ?? null)}</td><td>{f1(z.woerter?.median ?? null)}</td><td>{f1(z.woerter?.min ?? null)}</td><td>{f1(z.woerter?.max ?? null)}</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .matrix { display: flex; flex-direction: column; gap: var(--a3); }
  .matrix h3 { margin: var(--a3) 0 0; font: 650 var(--gr-h3, 1.1rem)/1.3 var(--schrift-ui); }
  .matrix h4 { margin: var(--a2) 0 0; font: 650 var(--gr-text, 1rem)/1.3 var(--schrift-ui); }
  .hilfe { margin: 0; font-size: var(--gr-klein); color: var(--tinte-2); }
  .hinweis { margin: 0; font-weight: 600; }
  .gruppe { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .gruppe legend { font-weight: 600; padding: 0 var(--a1); }
  .warnung { border: 2px solid var(--linie-stark); border-inline-start-width: 6px; border-radius: var(--r-klein); padding: var(--a2) var(--a3); display: flex; flex-direction: column; gap: var(--a2); }
  .warnung ul { margin: 0; padding-inline-start: var(--a4); }
  .gruppe.innen { border-style: dashed; }
  .eingabe.zeile { flex-direction: row; align-items: center; gap: var(--a3); }
  .eingabe.zeile input { width: 6rem; }
  .rahmen { overflow-x: auto; }
  .rahmen:focus-visible { box-shadow: var(--fokus-ring); }
  .tab { border-collapse: collapse; width: 100%; font-size: var(--gr-klein); }
  .tab th, .tab td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); vertical-align: middle; }
  .tab thead th { font-weight: 650; }
  .tab tbody th { font-weight: 600; }
</style>
