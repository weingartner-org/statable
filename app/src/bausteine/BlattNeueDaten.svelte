<script lang="ts">
  import type { OutputItem } from '../engine/types';
  import { s, L, melde } from '../lib/sitzung.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import { neuRechnen } from '../lib/rverfahren.svelte';
  import { NEU_LABELS, neuModell, neuSperre, neuCodeSatz, neuHilfeSatz, neuHorizont, neuHauptsatz, neuLjungSatz, neuWarnungen, neuRCode } from '../lib/modellneu';
  import { prognoseModellText, prognoseStellen, type PrognoseE, type PrognoseWahl } from '../lib/prognose';
  import { zeitreiheErgebnis, prognoseZeiten, type ZeitreiheE } from '../lib/zeitreiheblatt';
  import { zeitreiheCodeSatz } from '../lib/zeitreihesaetze';
  import { zitat } from '../i18n/profil';
  import DiagrammExport from './DiagrammExport.svelte';
  import Prognosediagramm from './Prognosediagramm.svelte';
  import Ausgabe from './Ausgabe.svelte';
  import Rechnet from './Rechnet.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * „Dieses Modell auf andere Daten anwenden“ unter der Prognose (Fachblatt GLAETTUNG-SERIEN, Abschnitt 5): das gerechnete ARIMA-Modell mit denselben Koeffizienten auf eine andere Zahlenspalte
   * oder auf dieselbe Spalte mit neuen Zeilen. Ohne Klick wird nichts gerechnet. Nichts wird neu geschätzt; die Warnungen sind immer sichtbar. Gespeichert wird alles am Ergebnis des Blatts (ZeitreiheE.neu).
   */
  let { e, pg, name, tabellen, speichere }: { e: ZeitreiheE; pg: PrognoseE; name: (n: string) => string; tabellen: OutputItem[]; speichere: (neu: ZeitreiheE) => void } = $props();
  const ID = 'nd';
  const lad = new Laedt();
  const modell = $derived(neuModell(pg));
  const zahlenSp = $derived(s.spalten.filter(c => c.art === 'zahl'));
  let spalte = $state(e.neu?.reihe.spalte ?? e.wert);
  let fehler = $state('');
  const n = $derived(e.neu);
  const nur = $derived(tabellen.filter(t => t.type === 'table' && NEU_LABELS.includes((t as { label: string }).label)));

  async function rechnen() {
    if (!modell) { fehler = neuCodeSatz('kein-modell'); melde(fehler); return; }
    const r = zeitreiheErgebnis(spalte, e.datum, { raster: e.rasterGewaehlt ? e.raster : null, periode: e.raster === 'zeilen' ? e.periode : null });
    if (!r.ok) { fehler = zeitreiheCodeSatz(r.code, { ausgeschlossen: r.ausgeschlossen, n: e.n }); melde(fehler); return; }
    const en = r.e, sperre = neuSperre(modell, { raster: en.raster, periode: en.periode, y: en.y });
    if (sperre) { fehler = neuCodeSatz(sperre, { modell: modell.periode, neu: en.periode }); melde(fehler); return; }
    fehler = '';
    const h = neuHorizont(pg.wahl.h, en.y.length, en.periode);
    try {
      const erg = await lad.mit(() => neuRechnen(en.y, en.periode, modell, h));
      if (!erg) return;
      speichere({ ...e, neu: { von: e.wert, modell, reihe: { spalte, raster: en.raster, periode: en.periode, erster: en.erster, t: en.t, y: en.y, luecken: en.luecken }, h, antwort: erg } });
      melde(L('Das Modell ist auf die Daten angewandt.', 'The model has been applied to the data.'));
    } catch (x) { fehler = (x as Error)?.message ?? String(x); melde(fehler); }
  }
  const zeiten = $derived(n ? prognoseZeiten(n.reihe, n.antwort.mittel.length) : []);
  const stellen = $derived(n ? prognoseStellen(n.reihe.y) : 2);
  const progE = $derived<PrognoseE | null>(n ? { wahl: { art: 'arima', h: n.h, log: n.modell.log, p: n.modell.p, d: n.modell.d, q: n.modell.q, P: n.modell.P, D: n.modell.D, Q: n.modell.Q, konst: n.modell.konst, glaettung: 'einfach' } satisfies PrognoseWahl, pr: 0, antwort: n.antwort } : null);
</script>

<h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Dieses Modell auf andere Daten anwenden', 'Apply this model to other data')}</h3>
{#if !modell}
  <p class="hilfe">{neuCodeSatz('kein-modell')}</p>
{:else}
  <p class="hilfe">{neuHilfeSatz()}</p>
  <p class="hilfe">{L(`Gewähltes Modell: ${prognoseModellText(pg.antwort)}. Die Koeffizienten bleiben, wie sie sind.`, `Chosen model: ${prognoseModellText(pg.antwort)}. The coefficients stay as they are.`)}</p>
  <div class="korr-wahl" style="margin-top:var(--a3)">
    <div class="eingabe" style="max-width:340px"><label for="{ID}-sp">{L('Auf welche Zahlenspalte?', 'To which number column?')}</label>
      <select id="{ID}-sp" aria-describedby="{ID}-sp-h" onchange={(ev) => (spalte = ev.currentTarget.value)}>
        {#each zahlenSp as c (c.name)}<option value={c.name} selected={spalte === c.name}>{name(c.name)}{c.name === e.wert ? ` (${L('dieselbe Spalte, mit den Zeilen von jetzt', 'same column, with the rows as they are now')})` : ''}</option>{/each}
      </select>
      <p id="{ID}-sp-h" class="hilfe">{L('Die Zeitpunkte kommen aus derselben Datumsspalte (oder der Reihenfolge der Zeilen) wie bei der Prognose. Der Horizont bleibt wie bei der Prognose.', 'The points in time come from the same date column (or the row order) as in the forecast. The horizon stays as in the forecast.')}</p></div>
    <div class="knopfzeile" style="margin-top:var(--a3)">
      <button class="k haupt" type="button" disabled={lad.sichtbar} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={rechnen}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{n ? L('Modell neu anwenden', 'Apply the model again') : L('Modell anwenden', 'Apply the model')}</button>
    </div>
    {#if lad.sichtbar}<p class="hilfe" role="status" style="margin-top:var(--a2)"><Rechnet text={L('Das Modell wird angewandt …', 'The model is being applied …')} /></p>{/if}
    {#if fehler}<p class="hilfe" role="alert" style="margin-top:var(--a2)">{fehler}</p>{/if}
  </div>
{/if}

{#if n && progE}
  <ul class="hilfe" style="margin:var(--a3) 0;padding-inline-start:1.2em">{#each neuWarnungen(n, n.reihe.y.length) as w (w.code)}<li>{w.satz}</li>{/each}</ul>
  <p>{neuHauptsatz(n, { name: zitat(name(n.reihe.spalte)), zeiten, stellen })}</p>
  <DiagrammExport titel={`${L('Prognose mit dem Modell von', 'Forecast with the model of')} ${name(n.von)}: ${name(n.reihe.spalte)}`}><Prognosediagramm e={n.reihe} p={progE} wertText={name(n.reihe.spalte)} zeitText={e.datum ? name(e.datum) : L('Reihenfolge der Zeilen', 'Row order')} {zeiten} {stellen} /></DiagrammExport>
  <Ausgabe items={nur} nurTabellen />
  {#if n.antwort.ljung}<p class="hilfe" style="margin-top:var(--a2)">{neuLjungSatz(n.antwort.ljung)}</p>{/if}
  <details class="auf" style="margin-top:var(--a3)"><summary>{L('Befehl (R)', 'Command (R)')}</summary><pre class="befehl">{neuRCode(n)}</pre></details>
{/if}
<p class="hilfe" style="margin-top:var(--a3)"><HilfeLink id="zeitreihe-prognose" text={L('Hilfe: Prognose lesen und berichten', 'Help: reading and reporting a forecast')} /></p>
