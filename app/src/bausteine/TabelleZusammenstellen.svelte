<script lang="ts">
  import { istFehlend, fehlendSchluessel } from '../lib/fehlend';
  import { untrack, onDestroy } from 'svelte';
  import { s, d, L, Lp, melde, sichern, nutzbareSets } from '../lib/sitzung.svelte';
  import { fokusNachVerschieben } from '../lib/ordnen';
  import { einmal } from '../lib/einmal';
  import { kennung as istKennung } from '../lib/verfahren';
  import { lesbar, type Spalte } from '../lib/verzeichnis';
  import { Vorschau, AUTO_ZELLEN } from '../lib/assistentvorschau.svelte';
  import { anzeigeVorschlag, mitStufen, schiebeAuswahl, wahlAus, leereWahl, KENNWERTE, type Anzeige, type TabellenWahl } from '../lib/tabellenwahl';
  import { berechneTabelle, neuesTabellenBlatt, wahlVon, type Berechnet } from '../lib/tabellenblatt';
  import AssistentRahmen from './AssistentRahmen.svelte';
  import TabelleAnzeige from './TabelleAnzeige.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';
  import { zaehle } from '../lib/zaehlen';

  /**
   * „Tabelle zusammenstellen“ (Später, Welle S-C, Teil 1): viele Fragen (Zeilen) nebeneinander für Gruppen (Spalten) in einer Tabelle.
   * Wie ein Daten-Assistent: eine Hauptwahl sichtbar (Gruppe und Fragen), der Rest unter „Weitere Wege“, die Vorschau mit echten Zahlen sofort.
   * Mit `blattId` ändert die Seite die Wahl eines vorhandenen Blatts. Gerechnet wird in JavaScript (lib/tabellenmodell.ts); es gibt keine Tests und keine Buchstaben.
   */
  let { blattId = '' }: { blattId?: string } = $props();
  const vorhanden = untrack(() => (blattId ? s.blaetter.find(b => b.id === blattId && b.art === 'tabelle') : undefined));

  /** Zahl der verschiedenen gültigen Werte einer Spalte (für den Vorschlag „Anteile oder Kennwerte“), einmal je Datenstand. */
  const verschieden = (sp: Spalte) => einmal(s.zeilen, `tab-v|${sp.name}|${fehlendSchluessel(sp)}`, () => {
    const i = s.spalten.findIndex(x => x.name === sp.name), m = new Set<string | number>();
    if (i < 0) return 0;
    for (const z of s.zeilen) { const v = z[i]; if (v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && istFehlend(sp, v))) { m.add(v); if (m.size > 60) break; } }
    return m.size;
  });
  const vorkommend = (sp: Spalte): number[] => einmal(s.zeilen, `tab-w|${sp.name}|${fehlendSchluessel(sp)}`, () => {
    const i = s.spalten.findIndex(x => x.name === sp.name), m = new Set<number>();
    if (i < 0) return [];
    for (const z of s.zeilen) { const v = z[i]; if (typeof v === 'number' && Number.isFinite(v) && !istFehlend(sp, v)) { m.add(v); if (m.size > 40) break; } }
    return [...m];
  });
  const sp = (n: string) => s.spalten.find(x => x.name === n);

  /** Vorschlag für die Gruppe: die erste Spalte mit 2 bis 6 Gruppen, die keine Kennung ist. Die Person kann sie ändern. */
  function gruppenVorschlag(): string {
    const gut = s.spalten.find(x => !istKennung(x) && x.art !== 'datum' && verschieden(x) >= 2 && verschieden(x) <= 6 && (x.niveau === 'nominal' || Object.keys(x.werteLabels).length > 0));
    return gut?.name ?? '';
  }
  let wahl = $state<TabellenWahl>(untrack(() => (vorhanden ? wahlVon(vorhanden) : { ...leereWahl(), gruppe: gruppenVorschlag() })));

  /* ---------- Wahl ---------- */
  const fragenSpalten = $derived(s.spalten.filter(x => x.name !== wahl.gruppe && x.art !== 'datum'));
  const sets = $derived(nutzbareSets());
  const gewaehlt = (id: string) => wahl.auswahl.some(a => a.id === id);
  function schalte(id: string, an: boolean) {
    if (!an) { wahl.auswahl = wahl.auswahl.filter(a => a.id !== id); return; }
    if (gewaehlt(id)) return;
    const spalte = sp(id);
    wahl.auswahl = [...wahl.auswahl, { id, anzeige: id.startsWith('$') ? 'mehrfach' : spalte ? anzeigeVorschlag(spalte, verschieden(spalte)) : 'kat', stufen: [], mitNull: false }];
  }
  function alle(an: boolean) { wahl.auswahl = an ? [...wahl.auswahl, ...fragenSpalten.filter(x => !gewaehlt(x.name) && !istKennung(x) && x.art === 'zahl').map(x => ({ id: x.name, anzeige: anzeigeVorschlag(x, verschieden(x)) as Anzeige, stufen: [], mitNull: false }))] : wahl.auswahl.filter(a => a.id.startsWith('$')); }
  function gruppeSetzen(n: string) { wahl.gruppe = n; wahl.auswahl = wahl.auswahl.filter(a => a.id !== n); }
  const anzeigeName: Record<Exclude<Anzeige, 'mehrfach'>, () => string> = {
    kat: () => L('Anteile je Antwort', 'Shares per answer'),
    metrisch: () => L('Kennwerte (n, M, SD, Median)', 'Statistics (n, M, SD, median)'),
    beides: () => L('Anteile und Kennwerte', 'Shares and statistics'),
    top: () => L('Top-Box (Stufen selbst wählen)', 'Top box (choose the levels yourself)')
  };
  const rueck = (i: number, r: -1 | 1) => {
    const id = wahl.auswahl[i]?.id, j = i + r; wahl.auswahl = schiebeAuswahl(wahl.auswahl, i, r);
    if (id && j >= 0 && j < wahl.auswahl.length) void fokusNachVerschieben(id, r, L(`${frageName(id)} steht jetzt auf Platz ${j + 1} von ${wahl.auswahl.length}.`, `${frageName(id)} is now in position ${j + 1} of ${wahl.auswahl.length}.`));
  };
  const frageName = (id: string) => (id.startsWith('$') ? (sets.find(x => '$' + x.name === id)?.label || id.slice(1)) : lesbar(sp(id), true) || id);

  /* ---------- Vorschau ---------- */
  const zellen = $derived(s.zeilen.length * Math.max(1, wahl.auswahl.length));
  const gross = $derived(zellen > AUTO_ZELLEN);
  const vs = new Vorschau<Berechnet>();
  onDestroy(() => vs.verwerfe());
  $effect(() => {
    const w = $state.snapshot(wahl) as TabellenWahl;
    void s.zeilen; void s.spalten; void s.gewicht; void s.gewichtFrage; void s.einst.sprache; void s.einst.anrede; void s.einst.zahl; void s.sets.length;
    untrack(() => vs.plane(() => berechneTabelle(w), !gross, 120));
  });
  const r = $derived(vs.wert);
  const gerade = $derived(vs.laeuft || (!vs.wert && !vs.veraltet));

  /* ---------- In den Bericht legen / Wahl ändern ---------- */
  const kannSpeichern = $derived(!!r && r.art === 'ok');
  async function speichern() {
    if (!kannSpeichern) { melde(L('Zuerst eine Gruppe und mindestens eine Frage wählen.', 'First choose a group and at least one question.')); return; }
    const w = wahlAus($state.snapshot(wahl) as TabellenWahl);
    if (vorhanden) {
      const alt = neuesTabellenBlatt(wahlVon(vorhanden), vorhanden.id).titel, neu = neuesTabellenBlatt(w, vorhanden.id);
      vorhanden.ergebnis = { typ: 'tabelle', wahl: w }; vorhanden.l1 = neu.l1; vorhanden.l3 = neu.l3; vorhanden.gewicht = neu.gewicht;
      if (vorhanden.titel === alt) vorhanden.titel = neu.titel;
      await sichern(); melde(L('Die Tabelle ist geändert.', 'The table is changed.'));
      location.hash = `blatt/${vorhanden.id}`;
    } else {
      const b = neuesTabellenBlatt(w);
      s.blaetter = [...s.blaetter, b];
      zaehle('verfahren', b.art);
      await sichern(); melde(L('Die Tabelle liegt jetzt im Heft und im Bericht.', 'The table is now in your notebook and in the report.'));
      location.hash = `blatt/${b.id}`;
    }
  }

  const hinweise = $derived.by(() => {
    const h: string[] = [];
    if (r && r.art === 'ok') {
      if (r.ohneStufen.length === 1) h.push(d('Für die Top-Box fehlen noch die Stufen: sie steht erst in der Tabelle, wenn du sie gewählt hast.', 'Für die Top-Box fehlen noch die Stufen: sie steht erst in der Tabelle, wenn Sie sie gewählt haben.', 'The levels for the top box are still missing: it appears in the table once you have chosen them.'));
      else if (r.ohneStufen.length > 1) h.push(d('Für die Top-Boxen fehlen noch die Stufen: sie stehen erst in der Tabelle, wenn du sie gewählt hast.', 'Für die Top-Boxen fehlen noch die Stufen: sie stehen erst in der Tabelle, wenn Sie sie gewählt haben.', 'The levels for the top boxes are still missing: they appear in the table once you have chosen them.'));
      if (r.fehlt.length) h.push(L(`Diese Spalten gibt es nicht mehr und fehlen in der Tabelle: ${r.fehlt.join(', ')}.`, `These columns no longer exist and are missing from the table: ${r.fehlt.join(', ')}.`));
    }
    return h;
  });
</script>

<AssistentRahmen id="tabelle" titel={L('Gruppen und Fragen wählen', 'Choose groups and questions')}
  einleitung={L('Viele Fragen nebeneinander für Gruppen in einer Tabelle: Anzahl, Prozent, Mittelwert, Streuung und Median, so wie sie in Seminar- und Abschlussarbeiten stehen. Die Zahl der Fälle steht immer dabei. Die Tabelle beschreibt nur und enthält keine Tests.', 'Many questions side by side for groups in one table: counts, percentages, mean, spread and median, as they appear in term papers and theses. The number of cases is always shown. The table only describes and contains no tests.')}
  {hinweise} anwendenText={vorhanden ? L('Änderung speichern', 'Save the change') : L('In den Bericht legen', 'Add to the report')} anwenden={speichern} kannAnwenden={kannSpeichern}
  problem={kannSpeichern ? '' : L('Zuerst eine Gruppe und mindestens eine Frage wählen.', 'First choose a group and at least one question.')}>
  {#snippet haupt()}
    <div class="as-feld"><label for="tz-gruppe">{L('1. Gruppen (die Spalten der Tabelle)', '1. Groups (the columns of the table)')}</label>
      <select id="tz-gruppe" value={wahl.gruppe} onchange={(e) => gruppeSetzen(e.currentTarget.value)}>
        <option value="">{L('Gruppe wählen …', 'Choose a group …')}</option>
        {#each s.spalten.filter(x => x.art !== 'datum') as x (x.name)}<option value={x.name}>{lesbar(x, true)}{x.bezeichnung ? ` (${x.name})` : ''} · {Lp(verschieden(x), `${verschieden(x)} Wert`, `${verschieden(x)} Werte`, `${verschieden(x)} value`, `${verschieden(x)} values`)}</option>{/each}
      </select>
      <p class="as-hilfe">{L('Jede Gruppe wird eine Spalte, dazu kommt die Gesamtspalte. Fälle ohne Gruppenangabe stehen nicht in der Tabelle; die Zahl steht unter ihr.', 'Each group becomes a column, plus the total column. Cases without a group are not in the table; the number is stated below it.')}</p></div>

    <fieldset class="as-gruppe"><legend>{L('2. Fragen (die Zeilen der Tabelle)', '2. Questions (the rows of the table)')}</legend>
      <div class="knopfzeile"><button class="k leise" type="button" onclick={() => alle(true)}>{L('Alle Zahlenspalten wählen', 'Choose all number columns')}</button><button class="k leise" type="button" onclick={() => alle(false)}>{L('Keine Spalte', 'No column')}</button></div>
      <ul class="as-liste" aria-label={L('Fragen zum Wählen', 'Questions to choose from')}>{#each fragenSpalten as x (x.name)}
        <li class:an={gewaehlt(x.name)}><label><input type="checkbox" checked={gewaehlt(x.name)} onchange={(e) => schalte(x.name, e.currentTarget.checked)}><span><b>{x.name}</b>{#if x.bezeichnung}<small>{lesbar(x, true)}</small>{/if}</span></label></li>
      {/each}
      {#each sets as st (st.name)}
        <li class:an={gewaehlt('$' + st.name)}><label><input type="checkbox" checked={gewaehlt('$' + st.name)} onchange={(e) => schalte('$' + st.name, e.currentTarget.checked)}><span><b>${st.name}</b><small>{L('Mehrfachantworten', 'Multiple responses')}: {st.label || st.name}</small></span></label></li>
      {/each}</ul>
    </fieldset>

    {#if wahl.auswahl.length}
      <fieldset class="as-gruppe"><legend>{L('Zeilen der Tabelle, von oben nach unten', 'Rows of the table, from top to bottom')}</legend>
        <ol class="tz-zeilen">{#each wahl.auswahl as a, i (a.id)}
          {@const spalte = sp(a.id)}
          <li><span class="tz-nr" aria-hidden="true">{i + 1}</span>
            <span class="tz-name"><b>{frageName(a.id)}</b></span>
            {#if a.id.startsWith('$')}
              <label class="as-eins tz-opt"><input type="checkbox" checked={a.mitNull} onchange={(e) => (a.mitNull = e.currentTarget.checked)}><span>{L('Fälle ohne Ankreuzung mitzählen', 'Count cases without a check')}</span></label>
            {:else}
              <select aria-label={L(`Anzeige für ${frageName(a.id)}`, `Display for ${frageName(a.id)}`)} value={a.anzeige} onchange={(e) => (a.anzeige = e.currentTarget.value as Anzeige)}>
                {#each Object.entries(anzeigeName) as [k, f]}<option value={k}>{f()}</option>{/each}
              </select>
            {/if}
            <span class="tz-knoepfe">
              <button class="k leise nur-symbol" type="button" data-ord="hoch" data-ord-key={a.id} aria-label={L(`${frageName(a.id)} nach oben`, `Move ${frageName(a.id)} up`)} aria-disabled={i === 0 ? 'true' : undefined} onclick={() => rueck(i, -1)}><Icon n="hoch" /></button>
              <button class="k leise nur-symbol" type="button" data-ord="runter" data-ord-key={a.id} aria-label={L(`${frageName(a.id)} nach unten`, `Move ${frageName(a.id)} down`)} aria-disabled={i === wahl.auswahl.length - 1 ? 'true' : undefined} onclick={() => rueck(i, 1)}><Icon n="runter" /></button>
              <button class="k leise nur-symbol" type="button" aria-label={L(`${frageName(a.id)} entfernen`, `Remove ${frageName(a.id)}`)} onclick={() => schalte(a.id, false)}><Icon n="x" /></button>
            </span>
            {#if a.anzeige === 'top' && spalte}
              <div class="tz-top" role="group" aria-label={L('Stufen der Top-Box', 'Levels of the top box')}>
                <p class="as-hilfe">{d('Welche Stufen zählen zur Top-Box? Das entscheidest du: Statable rät die Richtung nie, denn bei manchen Skalen ist 1 die höchste Zustimmung.', 'Welche Stufen zählen zur Top-Box? Das entscheiden Sie: Statable rät die Richtung nie, denn bei manchen Skalen ist 1 die höchste Zustimmung.', 'Which levels belong to the top box? That is your decision: Statable never guesses the direction, because on some scales 1 is the highest agreement.')}</p>
                <div class="as-chips">{#each mitStufen(spalte, vorkommend(spalte)) as st (st.wert)}<label class="as-chip"><input type="checkbox" checked={a.stufen.includes(st.wert)} onchange={(e) => (a.stufen = e.currentTarget.checked ? [...a.stufen, st.wert].sort((x, y) => x - y) : a.stufen.filter(x => x !== st.wert))}>{st.wert}{st.label !== String(st.wert) ? ` ${st.label}` : ''}</label>{/each}</div>
              </div>
            {/if}
          </li>
        {/each}</ol>
      </fieldset>
    {/if}
  {/snippet}

  {#snippet weitere()}
    <fieldset class="as-gruppe"><legend>{L('Wie die Prozente gerechnet werden', 'How the percentages are calculated')}</legend>
      <div class="segment" role="radiogroup" aria-label={L('Prozentbasis', 'Percentage base')}>
        <label><input type="radio" name="tz-basis" value="spalte" bind:group={wahl.prozentBasis}>{L('Innerhalb der Gruppe (Spalte)', 'Within the group (column)')}</label>
        <label><input type="radio" name="tz-basis" value="zeile" bind:group={wahl.prozentBasis}>{L('Innerhalb jeder Zeile', 'Within each row')}</label>
        <label><input type="radio" name="tz-basis" value="gesamt" bind:group={wahl.prozentBasis}>{L('Von allen (Gesamt)', 'Of all (total)')}</label></div>
      <p class="as-hilfe">{wahl.prozentBasis === 'spalte' ? L('Jede Gruppe zählt 100 %. Das beantwortet: „Wie antworten die Gruppen?“', 'Each group counts 100%. This answers: "How do the groups answer?"') : wahl.prozentBasis === 'zeile' ? L('Der Anteil der Gruppen an den Personen mit einer Antwort. Das liest sich leicht falsch: „Von den Zufriedenen sind 70 % Frauen“ sagt nichts über die Zufriedenheit der Frauen.', 'The share of the groups among the people with an answer. This is easy to misread: "Of the satisfied, 70% are women" says nothing about the satisfaction of women.') : L('Der Anteil an allen Antworten der Frage, über alle Gruppen.', 'The share of all answers to the question, across all groups.')}</p>
      <div class="segment" role="radiogroup" aria-label={L('Welche Fälle zählen', 'Which cases count')}>
        <label><input type="radio" name="tz-fehl" value="gueltig" bind:group={wahl.fehlend}>{L('Nur gültige Antworten', 'Valid answers only')}</label>
        <label><input type="radio" name="tz-fehl" value="alle" bind:group={wahl.fehlend}>{L('Alle Fälle, mit Zeile „keine Angabe“', 'All cases, with a row "no answer"')}</label></div>
    </fieldset>
    <fieldset class="as-gruppe"><legend>{L('Darstellung', 'Display')}</legend>
      <label class="as-eins"><input type="checkbox" bind:checked={wahl.gesamt}><span>{L('Gesamtspalte zeigen (die Summe der Gruppen)', 'Show the total column (the sum of the groups)')}</span></label>
      <label class="as-eins"><input type="checkbox" bind:checked={wahl.kombiniert}><span>{L('Anzahl und Prozent in einer Zelle („23 (45,1 %)“)', 'Count and percentage in one cell ("23 (45.1%)")')}</span></label>
      <div class="as-chips" role="group" aria-label={L('Kennwerte für Zahlen', 'Statistics for numbers')}>
        {#each KENNWERTE as k}<label class="as-chip"><input type="checkbox" checked={wahl.kennwerte.includes(k)} onchange={(e) => (wahl.kennwerte = e.currentTarget.checked ? KENNWERTE.filter(x => x === k || wahl.kennwerte.includes(x)) : wahl.kennwerte.filter(x => x !== k))}>{k === 'n' ? 'n' : k === 'mw' ? L('Mittelwert (M)', 'Mean (M)') : k === 'sd' ? L('Standardabweichung (SD)', 'Standard deviation (SD)') : L('Median', 'Median')}</label>{/each}
      </div>
      {#if wahl.auswahl.some(a => a.id.startsWith('$'))}
        <div class="segment" role="radiogroup" aria-label={L('Mehrfachantworten', 'Multiple responses')}>
          <label data-begriff="prozent-der-faelle"><input type="radio" name="tz-mf" value="faelle" bind:group={wahl.mehrfachBasis}>{L('Mehrfachantworten: Prozent der Fälle', 'Multiple responses: percent of cases')}</label>
          <label data-begriff="prozent-der-antworten"><input type="radio" name="tz-mf" value="antworten" bind:group={wahl.mehrfachBasis}>{L('Prozent der Antworten', 'Percent of responses')}</label></div>
      {/if}
    </fieldset>
  {/snippet}

  {#snippet vorschau()}
    {#if gerade}<p><Rechnet text={L('Die Tabelle wird gerechnet …', 'The table is being calculated …')} /></p>
    {:else if vs.veraltet}<p class="as-hilfe">{L('Bei dieser großen Datei rechnet die Vorschau nicht von selbst.', 'With a file this large the preview does not calculate by itself.')} <button class="k" type="button" onclick={() => void vs.jetzt(() => berechneTabelle($state.snapshot(wahl) as TabellenWahl))}>{L('Vorschau berechnen', 'Calculate preview')}</button></p>
    {/if}
    {#if r && !gerade}<TabelleAnzeige {r} {wahl} />{/if}
  {/snippet}
</AssistentRahmen>

<style>
  .tz-zeilen { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a2); }
  .tz-zeilen > li { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a3); align-items: center; border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); background: var(--blatt); }
  .tz-nr { color: var(--tinte-2); font-size: var(--gr-klein); min-width: 1.4em; text-align: right; }
  .tz-name { flex: 1 1 10rem; min-width: 0; overflow-wrap: anywhere; }
  .tz-zeilen select { width: auto; min-width: 12rem; max-width: 100%; }
  .tz-opt { min-height: 0; padding: 0; }
  .tz-knoepfe { display: inline-flex; gap: var(--a1); margin-inline-start: auto; }
  .tz-top { flex-basis: 100%; }
  :global(:where(:root.eng-760)) .tz-zeilen select { width: 100%; }
</style>
