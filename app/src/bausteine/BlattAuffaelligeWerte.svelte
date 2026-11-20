<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { OutputItem } from '../engine/types';
  import { L, d, melde } from '../lib/sitzung.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import { ausreisserRechnen } from '../lib/rverfahren.svelte';
  import { logMoeglich, prognoseStellen } from '../lib/prognose';
  import {
    AUSREISSER_SCHWELLEN, ausreisserSperre, ausreisserWahlBereinigen, ausreisserCodeSatz, ausreisserHilfeSatz, ausreisserLeitplanken, ausreisserRCode, schwelleText, type AusreisserWahl
  } from '../lib/ausreisserzeit';
  import { ausreisserSaetze, platzLabel, prognoseLogVorschlag, prognoseReihe, type ZeitreiheE, type ZeitreiheAuswertung } from '../lib/zeitreiheblatt';
  import DiagrammExport from './DiagrammExport.svelte';
  import Ausreisserdiagramm from './Ausreisserdiagramm.svelte';
  import Ausgabe from './Ausgabe.svelte';
  import Rechnet from './Rechnet.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * Der Abschnitt „Auffällige Werte“ der Zeitreihen-Karte (Sollwerte scripts/ausreisser-zeitreihe-erwartet.R): Residuen-Verfahren mit Basis-R, keine Erkennung nach Chen und Liu. Ohne Klick wird nichts gerechnet.
   * Wahl: Schwelle |z| (3 / 3,5 / 4, Vorgabe 3,5) und Log-Skala (Vorgabe wie bei der Prognose). Gesperrt (mit Satz statt Knopf) bei Lücken, ungleichen Abständen, unter 20 Werten, gleichen Werten.
   * Ausgabe: Satz, Bild, Tabellen, Hinweise (immer sichtbar), Befehl. Gespeichert wird Wahl und Antwort am Ergebnis des Blatts (ZeitreiheE.ausreisser).
   */
  let { e, a, wertText, zeitText, name, tabellen, speichere }: {
    e: ZeitreiheE; a: ZeitreiheAuswertung; wertText: string; zeitText: string; name: (n: string) => string; tabellen: OutputItem[]; speichere: (neu: ZeitreiheE) => void;
  } = $props();
  const ID = 'ar';
  const lad = new Laedt();
  const reihe = $derived(prognoseReihe(e));
  const sperre = $derived(ausreisserSperre(reihe));
  const logOk = $derived(logMoeglich(reihe));
  const start = e.ausreisser?.wahl;
  let schwelle = $state<number>(start?.schwelle ?? 3.5);
  let log = $state<boolean>(start?.log ?? (prognoseLogVorschlag(a) && logMoeglich(prognoseReihe(e))));
  let fehler = $state('');

  async function rechnen() {
    const rein: AusreisserWahl = ausreisserWahlBereinigen({ schwelle, log }, logOk);
    const s = ausreisserSperre(reihe);
    if (s) { fehler = ausreisserCodeSatz(s); melde(fehler); return; }
    fehler = '';
    try {
      const erg = await lad.mit(() => ausreisserRechnen(e.y, e.periode, rein));
      if (!erg) return;
      schwelle = rein.schwelle; log = rein.log;
      speichere({ ...e, ausreisser: { wahl: rein, antwort: erg } });
      melde(erg.auff.length === 0 ? L('Die Suche ist fertig: kein Wert ist auffällig.', 'The search is finished: no value is conspicuous.') : L('Die Suche ist fertig: Es gibt auffällige Werte.', 'The search is finished: there are conspicuous values.'));
    } catch (x) { fehler = (x as Error)?.message ?? String(x); melde(fehler); }
  }
  const au = $derived(e.ausreisser);
  const saetze = $derived(au ? ausreisserSaetze(e) : null);
  const leit = $derived(au ? ausreisserLeitplanken(au) : []);
  const stellen = $derived(prognoseStellen(e.y));
  const nur = (...l: string[]) => tabellen.filter(t => t.type === 'table' && l.includes((t as { label: string }).label));
  const logText = $derived(!logOk ? L('Nicht möglich: Es gibt Werte von 0 oder darunter.', 'Not possible: there are values of 0 or below.')
    : L('Auf der Log-Skala zählen relative Abweichungen; das passt, wenn die Schwankung mit dem Niveau wächst.', 'On the log scale relative deviations count; this fits when the fluctuation grows with the level.'));
</script>

<h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Auffällige Werte', 'Conspicuous values')}</h3>

{#if sperre}
  <p class="hilfe" use:ergebnisAnsage>{ausreisserCodeSatz(sperre)}</p>
{:else}
  <p class="hilfe">{ausreisserHilfeSatz()}</p>
  <div class="korr-wahl" style="margin-top:var(--a3)">
    <fieldset class="zusatz-gruppe">
      <legend>{L('Schwelle', 'Threshold')}</legend>
      <div class="segment" role="radiogroup" aria-describedby="{ID}-s-h">{#each AUSREISSER_SCHWELLEN as s (s)}
        <label><input type="radio" name="{ID}-schwelle" value={s} checked={schwelle === s} onchange={() => { schwelle = s; }}>|z| &gt; {schwelleText(s)}</label>{/each}</div>
      <p id="{ID}-s-h" class="hilfe" style="margin-top:var(--a2)">{L('Je höher die Schwelle, desto weniger Werte gelten als auffällig. 3,5 ist die Vorgabe. z misst, wie weit der Rest eines Werts vom mittleren Rest entfernt ist, in Einheiten der robusten Streuung.', 'The higher the threshold, the fewer values count as conspicuous. 3.5 is the default. z measures how far the remainder of a value is from the middle remainder, in units of the robust spread.')}</p>
    </fieldset>
    <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
      <legend>{L('Skala', 'Scale')}</legend>
      <label class="schalter"><input type="checkbox" checked={log && logOk} disabled={!logOk} aria-describedby="{ID}-log-h" onchange={(ev) => { log = ev.currentTarget.checked; }}>{L('Log-Skala', 'Log scale')}</label>
      <p id="{ID}-log-h" class="hilfe" style="margin-top:var(--a2)">{logText}</p>
    </fieldset>
    <div class="knopfzeile" style="margin-top:var(--a3)">
      <button class="k haupt" type="button" disabled={lad.sichtbar} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={rechnen}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{au ? L('Auffällige Werte neu suchen', 'Search for conspicuous values again') : L('Auffällige Werte suchen', 'Search for conspicuous values')}</button>
    </div>
    {#if lad.sichtbar}<p class="hilfe" role="status" style="margin-top:var(--a2)"><Rechnet text={L('Die auffälligen Werte werden gesucht …', 'The conspicuous values are being searched for …')} /></p>{/if}
    {#if fehler}<p class="hilfe" role="alert" style="margin-top:var(--a2)">{fehler}</p>{/if}
  </div>
{/if}

{#if au && saetze}
  <h4 style="font-size:var(--s-klein,.9rem);margin:var(--a4) 0 var(--a2)">{L('Hinweise', 'Notes')}</h4>
  <ul class="hilfe" style="margin:0 0 var(--a3);padding-inline-start:1.2em">{#each leit as l (l.code)}<li>{l.satz}</li>{/each}</ul>
  <p>{saetze.haupt}</p>
  <DiagrammExport titel={`${L('Zeitreihe mit auffälligen Werten', 'Time series with conspicuous values')}: ${wertText}`}><Ausreisserdiagramm {e} x={au} {wertText} {zeitText} zeit={(p) => platzLabel(e, p - 1)} {stellen} /></DiagrammExport>
  <Ausgabe items={nur('Auffällige Werte', 'Auffällige Werte-Verfahren')} nurTabellen />
  <details class="auf" style="margin-top:var(--a3)"><summary>{L('Befehl (R)', 'Command (R)')}</summary><pre class="befehl">{ausreisserRCode(au, e.wert)}</pre></details>
{/if}
<p class="hilfe" style="margin-top:var(--a3)"><HilfeLink id="auffaellige-werte-zeitreihe" text={L('Hilfe: Auffällige Werte', 'Help: conspicuous values')} /> <HilfeLink id="frage-zeitreihen" text={L('Hilfe: Zeitreihe lesen und berichten', 'Help: reading and reporting a time series')} /></p>
