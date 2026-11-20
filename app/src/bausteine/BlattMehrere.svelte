<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { onDestroy } from 'svelte';
  import type { OutputItem } from '../engine/types';
  import { s, L, d, melde, sichern, type Blatt } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { prognoseRechnen } from '../lib/rverfahren.svelte';
  import { MEHRERE_LABELS, MEHRERE_MAX, mehrereRechnen, mehrereSperre, mehrereCodeSatz, mehrereHauptsatz, mehrereWarnungen, mehrereFlags, mehrereGrundSatz, type MehrereE, type MehrereZeile, type Bauer } from '../lib/mehrere';
  import { horizontMax, horizontStandard } from '../lib/prognose';
  import { zeitreiheErgebnis, type ZeitreiheE } from '../lib/zeitreiheblatt';
  import Ausgabe from './Ausgabe.svelte';
  import Rechnet from './Rechnet.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * „Mehrere Reihen auf einmal“ (Fachblatt GLAETTUNG-SERIEN, Abschnitt 4): zwei bis 20 Zahlenspalten mit derselben Datumsspalte und denselben Einstellungen. Rechnet nacheinander die ARIMA-Automatik der
   * Einzelprognose mit Prüfzeitraum; mit Fortschritt („3 von 9“) und Lade-Animation, der Rest der App bleibt bedienbar. Scheitert eine Reihe, steht in ihrer Zeile der Grund. Ohne Klick wird nichts gerechnet.
   * Wer das Blatt verlässt, bricht die Rechnung ab; was fertig ist, bleibt am Ergebnis (ZeitreiheE.mehrere). Das Modell einer Reihe lässt sich mit einem Klick als eigene Auswertung übernehmen.
   */
  let { blatt, e, name, tabellen, speichere }: { blatt: Blatt; e: ZeitreiheE; name: (n: string) => string; tabellen: OutputItem[]; speichere: (neu: ZeitreiheE) => void } = $props();
  const ID = 'mr';
  const lad = new Laedt();
  /** Der Fortschrittstext wechselt mit jeder Reihe und steht darum nicht in einer Live-Region; angesagt wird nur der Anfang. */
  $effect(() => { if (lad.sichtbar) sage(L('Wird gerechnet …', 'Calculating …')); });
  const zahlenSp = $derived(s.spalten.filter(c => c.art === 'zahl'));
  const m = $derived(e.mehrere);
  let gewaehlt = $state<string[]>(e.mehrere?.wahl.spalten ?? [e.wert]);
  let h = $state(e.mehrere?.wahl.h ?? e.prognose?.wahl.h ?? horizontStandard(e.y.length, e.periode));
  let log = $state(e.mehrere?.wahl.log ?? false);
  let fehler = $state('');
  let fertig = $state(0), gesamt = $state(0);
  let lebt = true, stopp = false;
  onDestroy(() => { lebt = false; });
  const sperre = $derived(mehrereSperre(gewaehlt.length));
  const hMax = $derived(horizontMax(e.y.length, e.periode));
  const nur = $derived(tabellen.filter(t => t.type === 'table' && MEHRERE_LABELS.includes((t as { label: string }).label)));

  const schalte = (sp: string, an: boolean) => { gewaehlt = an ? [...gewaehlt.filter(x => x !== sp), sp] : gewaehlt.filter(x => x !== sp); };
  const bauer: Bauer = (sp) => {
    const r = zeitreiheErgebnis(sp, e.datum, { raster: e.rasterGewaehlt ? e.raster : null, periode: e.raster === 'zeilen' ? e.periode : null });
    return r.ok ? { ok: true, e: r.e } : { ok: false, code: r.code, ausgeschlossen: r.ausgeschlossen };
  };
  async function rechnen() {
    const sp = mehrereSperre(gewaehlt.length);
    if (sp) { fehler = mehrereCodeSatz(sp); melde(fehler); return; }
    fehler = ''; stopp = false;
    const reihenfolge = zahlenSp.map(c => c.name).filter(x => gewaehlt.includes(x));
    const wahl = { spalten: reihenfolge, h: Math.max(1, Math.min(Math.round(h), hMax)), log };
    try {
      const erg = await lad.mit(async () => {
        fertig = 0; gesamt = wahl.spalten.length;
        return mehrereRechnen(wahl, bauer, prognoseRechnen, { fortschritt: (f, g) => { fertig = f; gesamt = g; }, abbruch: () => stopp || !lebt });
      });
      if (!erg || !lebt) return;
      speichere({ ...e, mehrere: { wahl, datum: e.datum, raster: e.rasterGewaehlt ? e.raster : null, periode: e.raster === 'zeilen' ? e.periode : null, zeilen: erg.zeilen } });
      melde(erg.abgebrochen ? L('Die Rechnung ist abgebrochen. Was fertig war, steht in der Tabelle.', 'The calculation was stopped. What was finished is in the table.') : L('Alle Reihen sind gerechnet.', 'All series have been calculated.'));
    } catch (x) { fehler = (x as Error)?.message ?? String(x); melde(fehler); }
  }

  /** Das Modell einer Reihe als eigene Auswertung: ein neues Blatt „Zeitreihe“ mit derselben Reihe und derselben Prognose. */
  async function uebernehmen(z: MehrereZeile) {
    if (!z.ok || !m) return;
    const r = zeitreiheErgebnis(z.spalte, m.datum, { raster: m.raster, periode: m.periode });
    if (!r.ok) { melde(L('Diese Reihe lässt sich nicht mehr aufbauen.', 'This series can no longer be built.')); return; }
    const neu: ZeitreiheE = { ...r.e, prognose: { wahl: z.wahl, pr: z.pr, antwort: z.antwort } };
    const b: Blatt = { ...($state.snapshot(blatt) as Blatt), id: Math.random().toString(36).slice(2, 8), titel: `${L('Zeitreihe', 'Time series')}: ${name(z.spalte)}`, l1: z.spalte, l2: m.datum || null, l3: [z.spalte, ...(m.datum ? [m.datum] : [])],
      ergebnis: { typ: 'zeitreihen', e: neu }, notiz: '', imBericht: true, zeit: Date.now() };
    s.blaetter = [...s.blaetter, b];
    await sichern();
    melde(L('Als eigene Auswertung übernommen - sie steht jetzt oben als eigener Reiter.', 'Added as a separate analysis - it now has its own tab at the top.'));
  }
  const zeile = (z: MehrereZeile) => (z.ok ? null : mehrereGrundSatz(z.grund));
</script>

<h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Mehrere Reihen auf einmal', 'Several series at once')}</h3>
<p class="hilfe">{d('Statable rechnet für jede gewählte Spalte nacheinander die automatische ARIMA-Prognose, mit Prüfzeitraum. Datumsspalte und Einstellungen sind für alle gleich; jede Reihe bekommt ihr eigenes Modell. Es wird erst gerechnet, wenn du auf den Knopf klickst.',
  'Statable rechnet für jede gewählte Spalte nacheinander die automatische ARIMA-Prognose, mit Prüfzeitraum. Datumsspalte und Einstellungen sind für alle gleich; jede Reihe bekommt ihr eigenes Modell. Es wird erst gerechnet, wenn Sie auf den Knopf klicken.',
  'For each chosen column Statable calculates the automatic ARIMA forecast one after the other, with a test period. Date column and settings are the same for all; every series gets its own model. Nothing is calculated until you click the button.')}</p>
<div class="korr-wahl" style="margin-top:var(--a3)">
  <fieldset class="zusatz-gruppe">
    <legend>{L(`Zahlenspalten (2 bis ${MEHRERE_MAX})`, `Number columns (2 to ${MEHRERE_MAX})`)}</legend>
    <div style="display:flex;flex-wrap:wrap;gap:var(--a2) var(--a4)">
      {#each zahlenSp as c (c.name)}<label class="schalter"><input type="checkbox" checked={gewaehlt.includes(c.name)} disabled={lad.aktiv} onchange={(ev) => schalte(c.name, ev.currentTarget.checked)}>{name(c.name)}</label>{/each}
    </div>
    {#if sperre}<p class="hilfe" use:ergebnisAnsage style="margin-top:var(--a2)">{mehrereCodeSatz(sperre)}</p>{/if}
  </fieldset>
  <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
    <legend>{L('Einstellungen für alle', 'Settings for all')}</legend>
    <div class="eingabe" style="max-width:260px"><label for="{ID}-h">{L('Horizont (Zahl der Zeitpunkte)', 'Horizon (number of points in time)')}</label>
      <input id="{ID}-h" type="number" min="1" max={hMax} step="1" value={h} aria-describedby="{ID}-h-h" disabled={lad.aktiv}
        onchange={(ev) => { const v = Number(ev.currentTarget.value); if (Number.isInteger(v) && v >= 1 && v <= hMax) h = v; else { ev.currentTarget.value = String(h); melde(L(`Hier gilt eine ganze Zahl von 1 bis ${hMax}.`, `A whole number from 1 to ${hMax} applies here.`)); } }}>
      <p id="{ID}-h-h" class="hilfe">{L('Bei einer kürzeren Reihe gilt der höchste Horizont dieser Reihe.', 'For a shorter series the highest horizon of that series applies.')}</p></div>
    <label class="schalter" style="margin-top:var(--a3)"><input type="checkbox" bind:checked={log} disabled={lad.aktiv} aria-describedby="{ID}-log-h">{L('Log-Skala', 'Log scale')}</label>
    <p id="{ID}-log-h" class="hilfe" style="margin-top:var(--a2)">{L('Eine Reihe mit Werten von 0 oder darunter wird dann nicht gerechnet; in ihrer Zeile steht der Grund.', 'A series with values of 0 or below is then not calculated; its row gives the reason.')}</p>
  </fieldset>
  <div class="knopfzeile" style="margin-top:var(--a3)">
    <button class="k haupt" type="button" disabled={lad.sichtbar} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={rechnen}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{m ? L('Alle Reihen neu rechnen', 'Recalculate all series') : L('Alle Reihen rechnen', 'Calculate all series')}</button>
    {#if lad.aktiv}<button class="k" type="button" onclick={() => (stopp = true)}>{L('Abbrechen', 'Stop')}</button>{/if}
  </div>
  {#if lad.sichtbar}
    <p class="hilfe" style="margin-top:var(--a2)"><Rechnet text={L(`${fertig} von ${gesamt} Reihen fertig …`, `${fertig} of ${gesamt} series done …`)} /> <progress value={gesamt ? fertig / gesamt : 0} max="1" aria-label={L('Fortschritt', 'Progress')} style="vertical-align:middle;width:8rem"></progress></p>
  {/if}
  {#if fehler}<p class="hilfe" role="alert" style="margin-top:var(--a2)">{fehler}</p>{/if}
</div>

{#if m}
  <ul class="hilfe" style="margin:var(--a3) 0;padding-inline-start:1.2em">{#each mehrereWarnungen(m, name) as w (w.code)}<li>{w.satz}</li>{/each}</ul>
  <p>{mehrereHauptsatz(m)}</p>
  <Ausgabe items={nur.filter(t => (t as { label: string }).label === 'Mehrere-Reihen')} nurTabellen />
  <ul class="hilfe" style="margin:var(--a2) 0;padding-inline-start:1.2em;list-style:none">
    {#each m.zeilen as z (z.spalte)}
      <li>{name(z.spalte)}: {#if z.ok}<button class="k" type="button" disabled={lad.aktiv} onclick={() => uebernehmen(z)}>{L('Als eigene Auswertung übernehmen', 'Take over as a separate analysis')}</button>{#if mehrereFlags(z).length}{' '}<b>{L('auffällig', 'conspicuous')}</b>{/if}{:else}<span>{zeile(z)}</span>{/if}</li>
    {/each}
  </ul>
  <details class="auf" style="margin-top:var(--a3)"><summary>{L('Alle Prognosen in langer Form (zum Exportieren)', 'All forecasts in long form (for export)')}</summary>
    <Ausgabe items={nur.filter(t => (t as { label: string }).label === 'Mehrere-Reihen-Prognosen')} nurTabellen /></details>
{/if}
<p class="hilfe" style="margin-top:var(--a3)"><HilfeLink id="zeitreihe-prognose" text={L('Hilfe: Prognose lesen und berichten', 'Help: reading and reporting a forecast')} /></p>
