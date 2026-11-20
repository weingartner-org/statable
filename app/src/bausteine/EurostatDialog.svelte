<script lang="ts">
  import { s, L } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import { Laedt } from '../lib/laedt.svelte';
  import {
    eurostatAdresse, eurostatAbrufen, eurostatLesen, eurostatFilterLesen, eurostatTabelle, eurostatQuelle, eurostatFehlerSatz, eurostatGeladenSatz,
    eurostatHinweisSatz, eurostatNachtragSatz, eurostatLizenzSatz, type EurostatDaten, type EurostatQuelle, type EurostatTabelle
  } from '../lib/eurostat';
  import { pruefsumme } from '../lib/protokoll';
  import Rechnet from './Rechnet.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * Daten von Eurostat öffnen (Fachblatt SAISON-EUROSTAT, Abschnitt 2). Nichts geht ins Netz, bevor auf „Von Eurostat laden“ geklickt wird; der Hinweis, was dann an wen geht, steht davor beim Knopf.
   * Es gibt nur die eine feste Adresse (lib/eurostat.ts); Code und Filter laufen durch Muster und encodeURIComponent. Daten aus Statable werden nie gesendet.
   * Das Ergebnis ist erst eine Vorschau mit den Zahlen; „Als Daten öffnen“ legt das Projekt an und speichert die Quelle an den Daten.
   */
  let { oeffnen, zu }: { oeffnen: (tab: EurostatTabelle, quelle: EurostatQuelle, sha256: string | null) => void; zu: () => void } = $props();
  const lad = new Laedt();
  let code = $state(''), filterText = $state(''), seit = $state(''), bis = $state(''), beschriftung = $state(false);
  let fehler = $state('');
  let daten = $state.raw<EurostatDaten | null>(null);
  let quelle = $state.raw<EurostatQuelle | null>(null);
  let sha = $state<string | null>(null);
  let abbruch: AbortController | null = null;
  const vorschau = $derived(daten ? eurostatTabelle(daten, beschriftung) : null);
  const zeigen = (v: string | number | null) => (v === null ? '' : typeof v === 'number' ? zahlDe(v, Math.min(6, /\.(\d+)$/.exec(String(v))?.[1]?.length ?? 0)) : v);

  function geaendert() { daten = null; quelle = null; fehler = ''; }
  async function laden() {
    fehler = ''; daten = null; quelle = null;
    const f = eurostatFilterLesen(filterText);
    if (!f.ok) { fehler = eurostatFehlerSatz(f.fehler); return; }
    const abfrage = { code: code.trim(), filter: f.filter, seit: seit.trim(), bis: bis.trim(), sprache: s.einst.sprache };
    const a = eurostatAdresse(abfrage);
    if (!a.ok) { fehler = eurostatFehlerSatz(a.fehler); return; }
    abbruch = new AbortController();
    const erg = await lad.mit(() => eurostatAbrufen(a.adresse, { signal: abbruch!.signal }));
    abbruch = null;
    if (!erg) return;
    if (!erg.ok) { fehler = eurostatFehlerSatz(erg.fehler); return; }
    const l = eurostatLesen(erg.text);
    if (!l.ok) { fehler = eurostatFehlerSatz(l.fehler); return; }
    sha = await pruefsumme(erg.bytes);
    quelle = eurostatQuelle(abfrage, a.adresse, l.daten);
    daten = l.daten;
  }
  function los() { if (daten && quelle) oeffnen(eurostatTabelle(daten, beschriftung), quelle, sha); }
</script>

<div class="eu tisch ohne-rand"><section class="blatt rund" aria-labelledby="eu-t">
  <div class="blatt-kopf"><h1 id="eu-t">{L('Daten von Eurostat', 'Data from Eurostat')}</h1><HilfeLink id="eurostat-oeffnen" text={L('Hilfe zu Eurostat-Daten', 'Help on Eurostat data')} /></div>
  <p class="eu-hilfe">{L('Eurostat ist das Statistikamt der Europäischen Union. Die Daten kommen in langer Form: eine Zeile je Kombination, eine Spalte je Dimension, dazu „wert“ und „status“. Fehlende Werte bleiben leer.', 'Eurostat is the statistical office of the European Union. The data come in long form: one row per combination, one column per dimension, plus "wert" and "status". Missing values stay empty.')}</p>
  <div class="eu-feld"><label for="eu-code">{L('Code des Datensatzes', 'Dataset code')}</label>
    <input id="eu-code" type="text" bind:value={code} oninput={geaendert} maxlength="40" autocomplete="off" spellcheck="false" placeholder="une_rt_m" aria-describedby="eu-code-h">
    <p id="eu-code-h" class="eu-hilfe">{L('Zum Beispiel une_rt_m (Arbeitslosenquote, monatlich). Den Code nennt die Datenbank von Eurostat.', 'For example une_rt_m (unemployment rate, monthly). The code is given in the Eurostat database.')}</p></div>
  <div class="eu-feld"><label for="eu-filter">{L('Filter (eine Zeile je Filter)', 'Filters (one line per filter)')}</label>
    <textarea id="eu-filter" rows="4" bind:value={filterText} oninput={geaendert} autocomplete="off" spellcheck="false" placeholder={'geo = AT, DE\ns_adj = SA'} aria-describedby="eu-filter-h"></textarea>
    <p id="eu-filter-h" class="eu-hilfe">{L('Wie bei Eurostat: Name = Wert, Wert. Ohne Filter ist die Antwort oft zu groß.', 'As at Eurostat: name = value, value. Without filters the answer is often too large.')}</p></div>
  <div class="eu-zeile">
    <div class="eu-feld"><label for="eu-seit">{L('Von (Zeitraum)', 'From (time range)')}</label><input id="eu-seit" type="text" bind:value={seit} oninput={geaendert} maxlength="10" autocomplete="off" placeholder="2020-01"></div>
    <div class="eu-feld"><label for="eu-bis">{L('Bis (Zeitraum)', 'Until (time range)')}</label><input id="eu-bis" type="text" bind:value={bis} oninput={geaendert} maxlength="10" autocomplete="off" placeholder="2024-12"></div>
  </div>
  <label class="eu-eins"><input type="checkbox" bind:checked={beschriftung}><span>{L('Beschriftungen als zusätzliche Spalten (zum Beispiel „Österreich“ neben „AT“)', 'Labels as additional columns (for example "Austria" next to "AT")')}</span></label>

  <p class="eu-warn" role="note">{eurostatHinweisSatz()}</p>
  <div class="knopfzeile">
    <button class="k haupt gross" type="button" disabled={lad.sichtbar} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={laden}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{L('Von Eurostat laden', 'Load from Eurostat')}</button>
    {#if lad.aktiv}<button class="k leise" type="button" onclick={() => abbruch?.abort()}>{L('Abbrechen', 'Cancel')}</button>{/if}
  </div>
  {#if lad.sichtbar}<p class="eu-hilfe" role="status"><Rechnet text={L('Eurostat wird abgefragt …', 'Eurostat is being queried …')} /></p>{/if}
  {#if fehler}<p class="eu-warn" role="alert">{fehler}</p>{/if}

  {#if daten && vorschau}
    <p class="eu-satz" role="status">{eurostatGeladenSatz(daten)}</p>
    <p class="eu-hilfe">{eurostatNachtragSatz()} {eurostatLizenzSatz()}</p>
    <div class="eu-tabhuelle" role="region" tabindex="0" aria-label={L('Vorschau der Daten', 'Preview of the data')}>
      <table class="eu-tab"><thead><tr>{#each vorschau.kopf as k}<th scope="col">{k}</th>{/each}</tr></thead>
        <tbody>{#each vorschau.zeilen.slice(0, 8) as z}<tr>{#each z as v, i}<td class:zahl={typeof v === 'number'}>{zeigen(v)}</td>{/each}</tr>{/each}</tbody></table>
    </div>
    <p class="eu-hilfe">{L(`Die ersten ${Math.min(8, vorschau.zeilen.length)} von ${vorschau.zeilen.length} Zeilen.`, `The first ${Math.min(8, vorschau.zeilen.length)} of ${vorschau.zeilen.length} rows.`)}</p>
  {/if}

  <div class="knopfzeile eu-tun">
    <button class="k haupt gross" type="button" disabled={!daten} onclick={los}>{L('Als Daten öffnen', 'Open as data')}</button>
    <button class="k leise" type="button" onclick={zu}>{L('Zurück zum Start', 'Back to the start')}</button>
  </div>
</section></div>

<style>
  .eu { padding-bottom: var(--a6); }
  .eu :global(.blatt) { display: flex; flex-direction: column; gap: var(--a4); }
  .eu-feld { display: flex; flex-direction: column; gap: var(--a1); max-width: 36rem; }
  .eu-feld label { font: 650 var(--gr-text)/1.3 var(--schrift-ui); }
  .eu-feld input, .eu-feld textarea { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a2) var(--a3); max-width: 100%; }
  .eu-zeile { display: flex; flex-wrap: wrap; gap: var(--a4); }
  .eu-zeile .eu-feld { width: 12rem; }
  .eu-eins { display: flex; gap: var(--a2); align-items: flex-start; cursor: pointer; max-width: 36rem; }
  .eu-eins input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 3px 0 0; flex: none; }
  .eu-hilfe { color: var(--tinte-2); font-size: var(--gr-klein); max-width: var(--breite-text); margin: 0; }
  .eu-warn { padding: var(--a2) var(--a3); background: var(--blatt-2); border-inline-start: 4px solid var(--hinweis, var(--akzent)); border-radius: var(--r-klein); max-width: var(--breite-text); margin: 0; }
  .eu-satz { margin: 0; max-width: var(--breite-text); }
  .eu-tabhuelle { overflow: auto; border: 1px solid var(--linie); border-radius: var(--r-klein); max-width: 100%; }
  .eu-tab { border-collapse: collapse; width: max-content; min-width: min(100%, 24rem); background: var(--blatt); }
  .eu-tab th, .eu-tab td { padding: var(--a1) var(--a3); text-align: start; border-bottom: 1px solid var(--linie); white-space: nowrap; }
  .eu-tab td.zahl { text-align: right; }
  .eu-tab thead th { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 600; background: var(--blatt-2); }
</style>
