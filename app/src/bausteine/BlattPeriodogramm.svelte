<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { OutputItem } from '../engine/types';
  import { L, melde } from '../lib/sitzung.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import { periodogrammRechnen } from '../lib/rverfahren.svelte';
  import { prognoseReihe, type ZeitreiheE } from '../lib/zeitreiheblatt';
  import { periodogrammSperre, periodogrammCodeSatz, periodogrammHauptsatz, periodogrammWarnungen, periodogrammRCode } from '../lib/zeitreihenabrunden';
  import DiagrammExport from './DiagrammExport.svelte';
  import Periodogrammdiagramm from './Periodogrammdiagramm.svelte';
  import Ausgabe from './Ausgabe.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * Der Abschnitt „Gibt es eine Periode, die ich nicht kenne?“ der Zeitreihen-Karte (Fachblatt ZEITREIHEN-ABRUNDEN, Abschnitt 3). Ohne Klick wird nichts gerechnet.
   * Gesperrt (mit Satz statt Knopf) bei Lücken, ungleichen Abständen, unter 20 Werten und wenn alle Werte gleich sind; nichts wird aufgefüllt.
   * Ausgabe: Bild, Hauptsatz, Tabelle, die drei Warnungen (immer sichtbar), Befehl. Gespeichert wird die Antwort am Ergebnis des Blatts (ZeitreiheE.periodogramm).
   */
  let { e, wertText, tabellen, speichere }: { e: ZeitreiheE; wertText: string; tabellen: OutputItem[]; speichere: (neu: ZeitreiheE) => void } = $props();
  const lad = new Laedt();
  let fehler = $state('');
  const sperre = $derived(periodogrammSperre(prognoseReihe(e)));
  const pd = $derived(e.periodogramm);

  async function rechnen() {
    if (sperre) { fehler = periodogrammCodeSatz(sperre); melde(fehler); return; }
    fehler = '';
    try {
      const erg = await lad.mit(() => periodogrammRechnen(e.y));
      if (!erg) return;
      speichere({ ...e, periodogramm: { antwort: erg } });
      melde(L('Das Periodogramm ist gerechnet.', 'The periodogram has been calculated.'));
    } catch (x) { fehler = (x as Error)?.message ?? String(x); melde(fehler); }
  }
</script>

<h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Gibt es eine Periode, die ich nicht kenne?', 'Is there a period I do not know about?')}</h3>
{#if sperre}
  <p class="hilfe" use:ergebnisAnsage>{periodogrammCodeSatz(sperre)}</p>
{:else}
  <p class="hilfe">{L('Das Periodogramm zeigt, bei welchen Perioden die Reihe am stärksten schwingt. Es wird erst gerechnet, wenn auf den Knopf geklickt wird.', 'The periodogram shows at which periods the series oscillates most strongly. Nothing is calculated until the button is clicked.')}</p>
  <div class="knopfzeile" style="margin-top:var(--a3)">
    <button class="k haupt" type="button" disabled={lad.sichtbar} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={rechnen}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{pd ? L('Periodogramm neu rechnen', 'Recalculate periodogram') : L('Periodogramm rechnen', 'Calculate periodogram')}</button>
  </div>
  {#if lad.sichtbar}<p class="hilfe" role="status" style="margin-top:var(--a2)"><Rechnet text={L('Das Periodogramm wird gerechnet …', 'The periodogram is being calculated …')} /></p>{/if}
  {#if fehler}<p class="hilfe" role="alert" style="margin-top:var(--a2)">{fehler}</p>{/if}
{/if}

{#if pd}
  <p style="margin-top:var(--a3)">{periodogrammHauptsatz(pd)}</p>
  <ul class="hilfe" style="margin:0 0 var(--a3);padding-inline-start:1.2em">{#each periodogrammWarnungen() as w (w.code)}<li>{w.satz}</li>{/each}</ul>
  <DiagrammExport titel={`${L('Periodogramm', 'Periodogram')}: ${wertText}`}><Periodogrammdiagramm p={pd} {wertText} /></DiagrammExport>
  <Ausgabe items={tabellen} nurTabellen />
  <details class="auf" style="margin-top:var(--a3)"><summary>{L('Befehl (R)', 'Command (R)')}</summary><pre class="befehl">{periodogrammRCode(e.wert)}</pre></details>
{/if}
