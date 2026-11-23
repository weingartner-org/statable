<script lang="ts">
  /**
   * B3 Teil 2b: „Sind sich die Fachleute einig? (Delphi-Befragung, Konsens)“ unter der Skalen-Auswertung.
   * Zeilen = Fachleute, Spalten = Aussagen. Kennzahlen je Aussage, Konsens nach einer Regel, die die Person vorher selbst festlegt (nie voreingestellt),
   * Kendalls W. Rechnet sofort im Browser (lib/delphi.ts, Kern; lib/delphiblock.ts, Daten und R-Skript). Beschreibend, ohne Deutung.
   * Fachblatt docs/ausbau/FACHBLATT-B3-TEXTANALYSE.md, Abschnitt Teil 2a.
   */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L, melde, meldeFehler } from '../lib/sitzung.svelte';
  import { komma } from '../lib/ergebnis';
  import { csvZelle } from '../lib/protokoll';
  import { herunterladen, heute } from '../lib/export';
  import { rSkriptZip } from '../lib/rskript';
  import { delphiKennzahlen, kendallW, type DelphiRegel } from '../lib/delphi';
  import { baueDelphiSkript, delphiDaten, DELPHI_MAX_SPALTEN, DELPHI_MIN_FACHLEUTE, DELPHI_MIN_SPALTEN, type DelphiFehler } from '../lib/delphiblock';

  let { spalten }: { spalten: string[] } = $props();
  const kennung = $props.id();
  const nm = (n: string) => s.spalten.find(c => c.name === n)?.bezeichnung.trim() || n;
  const passt = $derived(spalten.length >= DELPHI_MIN_SPALTEN && spalten.length <= DELPHI_MAX_SPALTEN && spalten.every(n => s.spalten.some(c => c.name === n && c.art === 'zahl')));

  /* Die Regel setzt die Person: leer = dieser Teil wird nicht geprüft */
  let maxIqr = $state<number | null>(null), von = $state<number | null>(null), bis = $state<number | null>(null), minProzent = $state(75);
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const regel = $derived<DelphiRegel>({
    maxIqr: num(maxIqr) !== null && maxIqr! >= 0 ? maxIqr : null,
    band: num(von) !== null && num(bis) !== null && von! <= bis! ? [von!, bis!] : null,
    minAnteil: (num(minProzent) !== null ? Math.min(100, Math.max(0, minProzent)) : 75) / 100,
  });
  const regelGesetzt = $derived(regel.maxIqr !== null || regel.band !== null);

  const d = $derived(passt ? delphiDaten(s.spalten, s.zeilen, spalten) : null);
  const fehler = $derived(d && 'fehler' in d ? d.fehler : null);
  const ok = $derived(d && !('fehler' in d) ? d : null);
  const zeilen = $derived(ok ? delphiKennzahlen(ok.bew, regel) : []);
  const kw = $derived(ok ? kendallW(ok.bew) : null);
  const z = (v: number, n = 2) => (Number.isFinite(v) ? komma(v, n) : '-');
  const pr = (v: number | null) => (v === null ? '-' : `${komma(v * 100, 0)} %`);
  const pw = (v: number) => (v < 0.001 ? L('< 0,001', '< 0.001') : komma(v, 3));
  const nKons = $derived(zeilen.filter(r => r.konsens).length);

  const fehlerText = (f: DelphiFehler['fehler']) => f === 'zu-wenig-fachleute' ? L(`Es braucht mindestens ${DELPHI_MIN_FACHLEUTE} Personen (Zeilen) mit Bewertungen.`, `At least ${DELPHI_MIN_FACHLEUTE} people (rows) with ratings are needed.`)
    : f === 'keine-zahlen' ? L('Die Spalten enthalten keine Zahlen.', 'The columns contain no numbers.')
    : L(`Wählen Sie ${DELPHI_MIN_SPALTEN} bis ${DELPHI_MAX_SPALTEN} Aussagen (Spalten).`, `Choose ${DELPHI_MIN_SPALTEN} to ${DELPHI_MAX_SPALTEN} statements (columns).`);

  function csv() {
    const kopf = [L('Aussage', 'Statement'), 'n', 'Median', 'Q1', 'Q3', 'IQR', L('Mittelwert', 'Mean'), 'SD', L('Anteil im Bereich', 'Share in range'), L('Konsens', 'Consensus')];
    const t = '﻿' + [kopf, ...zeilen.map((r, j) => [nm(spalten[j]!), r.n, r.median, r.q1, r.q3, r.iqr, r.mittel, r.sd, r.anteil ?? '', regelGesetzt ? (r.konsens ? L('ja', 'yes') : L('nein', 'no')) : ''])]
      .map(r => r.map(csvZelle).join(';')).join('\r\n') + '\r\n';
    herunterladen(new TextEncoder().encode(t), 'delphi-kennzahlen.csv', 'text/csv;charset=utf-8');
    melde(L('Tabelle als CSV gespeichert.', 'Table saved as CSV.'));
  }
  function rSkript() {
    if (!ok) return;
    try {
      const sk = baueDelphiSkript({ spalten: s.spalten, zeilen: s.zeilen, benutzt: [...spalten], regel, titel: L('Delphi-Befragung', 'Delphi survey'), datum: heute() });
      herunterladen(rSkriptZip(sk), `${sk.rName.replace(/\.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${sk.rName} und ${sk.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${sk.rName} and ${sk.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Das R-Skript ließ sich nicht erstellen.', 'The R script could not be created.')); }
  }
</script>

{#if passt}
  <details class="auf delphi" style="margin-top:var(--a4)"><summary>{L('Sind sich die Fachleute einig? (Delphi-Befragung, Konsens)', 'Do the experts agree? (Delphi survey, consensus)')}</summary>
    <p class="heft-text">{L('Für eine Delphi-Befragung stehen in den Zeilen die Fachleute und in den Spalten die Aussagen, die sie bewertet haben (zum Beispiel 1 bis 5). Statable zeigt je Aussage Median, Quartile und Quartilsabstand (IQR). Ob eine Aussage als „Konsens“ gilt, legen Sie selbst fest, und zwar vor der Befragung: Statable gibt keine Regel vor und nennt ohne Ihre Regel nie einen Konsens.', 'In a Delphi survey the rows hold the experts and the columns the statements they rated (for example 1 to 5). For each statement Statable shows the median, quartiles and interquartile range (IQR). Whether a statement counts as “consensus” is for you to decide, before the survey: Statable sets no rule and never names a consensus without your rule.')}</p>
    <p class="hilfe"><HilfeLink id="delphi" text={L('Hilfe: Delphi-Befragung', 'Help: Delphi survey')} /></p>
    <fieldset class="auswahl">
      <legend>{L('Regel für Konsens (leer lassen = nicht prüfen)', 'Rule for consensus (leave empty = do not check)')}</legend>
      <div class="delphi-zeile">
        <div class="eingabe"><label for="dl-iqr-{kennung}">{L('Quartilsabstand höchstens', 'Interquartile range at most')}</label><input id="dl-iqr-{kennung}" type="number" min="0" step="0.5" inputmode="decimal" bind:value={maxIqr} /></div>
        <div class="eingabe"><label for="dl-von-{kennung}">{L('Bereich von', 'Range from')}</label><input id="dl-von-{kennung}" type="number" step="1" inputmode="decimal" bind:value={von} /></div>
        <div class="eingabe"><label for="dl-bis-{kennung}">{L('Bereich bis', 'Range to')}</label><input id="dl-bis-{kennung}" type="number" step="1" inputmode="decimal" bind:value={bis} /></div>
        <div class="eingabe"><label for="dl-pz-{kennung}">{L('Mindestens so viel Prozent im Bereich', 'At least this percent in the range')}</label><input id="dl-pz-{kennung}" type="number" min="0" max="100" step="5" inputmode="numeric" bind:value={minProzent} /></div>
      </div>
    </fieldset>
    {#if fehler}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerText(fehler)}</p>
    {:else if ok}
      <p class="heft-text">{L(`${ok.bew.length} Fachleute, ${spalten.length} Aussagen${ok.weg ? ` (${ok.weg} Zeilen ganz ohne Bewertung bleiben außen vor)` : ''}. ${regelGesetzt ? `Nach Ihrer Regel erreichen ${nKons} von ${spalten.length} Aussagen Konsens.` : 'Noch keine Regel gesetzt: Es wird kein Konsens ermittelt.'}`, `${ok.bew.length} experts, ${spalten.length} statements${ok.weg ? ` (${ok.weg} rows without any rating are left out)` : ''}. ${regelGesetzt ? `By your rule ${nKons} of ${spalten.length} statements reach consensus.` : 'No rule set yet: no consensus is determined.'}`)}</p>
      <div style="overflow-x:auto" role="region" tabindex="0" aria-label={L('Bewertungen je Aussage, Tabelle', 'Ratings per statement, table')}><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Bewertungen je Aussage', 'Ratings per statement')}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Aussage', 'Statement')}</th><th scope="col">n</th><th scope="col">Median</th><th scope="col">Q1</th><th scope="col">Q3</th><th scope="col">IQR</th><th scope="col">{L('Mittelwert', 'Mean')}</th><th scope="col">SD</th><th scope="col">{L('Anteil im Bereich', 'Share in range')}</th><th scope="col">{L('Konsens', 'Consensus')}</th></tr></thead>
        <tbody>{#each zeilen as r, j (j)}<tr><th scope="row" style="text-align: start">{nm(spalten[j]!)}</th><td style="text-align:end">{r.n}</td><td style="text-align:end">{z(r.median)}</td><td style="text-align:end">{z(r.q1)}</td><td style="text-align:end">{z(r.q3)}</td><td style="text-align:end">{z(r.iqr)}</td><td style="text-align:end">{z(r.mittel)}</td><td style="text-align:end">{z(r.sd)}</td><td style="text-align:end">{pr(r.anteil)}</td><td>{regelGesetzt ? (r.konsens ? L('ja', 'yes') : L('nein', 'no')) : '-'}</td></tr>{/each}</tbody>
      </table></div>
      {#if kw}
        <p class="heft-text">{L(`Übereinstimmung der Fachleute insgesamt (Kendalls W): W = ${z(kw.w, 3)}, χ²(${kw.df}) = ${z(kw.chi2)}, p ${kw.p < 0.001 ? '' : '= '}${pw(kw.p)}, ${kw.m} Personen mit allen Bewertungen. W liegt zwischen 0 (keine Übereinstimmung der Rangfolgen) und 1 (alle ordnen die Aussagen gleich).`, `Overall agreement of the experts (Kendall's W): W = ${z(kw.w, 3)}, χ²(${kw.df}) = ${z(kw.chi2)}, p ${kw.p < 0.001 ? '' : '= '}${pw(kw.p)}, ${kw.m} people with all ratings. W lies between 0 (no agreement of the rankings) and 1 (everyone orders the statements the same way).`)}</p>
      {:else}<p class="heft-text" style="color:var(--tinte-2)">{L('Kendalls W braucht mindestens 2 Personen mit allen Bewertungen und 3 Aussagen.', 'Kendall\'s W needs at least 2 people with all ratings and 3 statements.')}</p>{/if}
      <div class="knopfzeile"><button class="k" type="button" onclick={csv}>{L('Als CSV speichern', 'Save as CSV')}</button><button class="k" type="button" onclick={rSkript}>{L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)')}</button></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Die Runden einer Delphi-Befragung vergleichen Sie, indem Sie jede Runde als eigene Tabelle auswerten und Median, Quartilsabstand und Anteil nebeneinander legen. Einen Test zwischen den Runden gibt es nicht, weil die Fachleute selten dieselben sind. Statable zeigt Zahlen, es deutet nichts.', 'To compare the rounds of a Delphi survey, analyse each round as its own table and put median, interquartile range and share side by side. There is no test between rounds, because the experts are rarely the same. Statable shows numbers; it interprets nothing.')}</p>
    {/if}
  </details>
{/if}

<style>
  .delphi-zeile { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); align-items: end; }
  .delphi-zeile .eingabe { max-width: 220px; margin: 0; }
  .delphi-zeile .eingabe input { min-height: var(--ziel); box-sizing: border-box; }
  .delphi .auswahl { border: 1px solid var(--linie); padding: var(--a2) var(--a3); min-width: 0; margin: 0; }
</style>
