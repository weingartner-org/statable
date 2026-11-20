<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { untrack } from 'svelte';
  import type { OutputItem } from '../engine/types';
  import { L, d, melde, sichern, type Blatt } from '../lib/sitzung.svelte';
  import { logRCode, logTerme, logAngebot, logTermName, logWahlBereinigen, type LogE, type LogArt } from '../lib/loglinear';
  import { loglinearRechnen } from '../lib/rverfahren.svelte';
  import BlattKurspaket from './BlattKurspaket.svelte';
  import LoglinRueck from './LoglinRueck.svelte';
  import RStart from './RStart.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * Das Ergebnis der loglinearen Modelle (Fachblatt KURSPAKET, Abschnitt 2). Das Modell wählt die Person von Hand: Unabhängigkeit, alle Zweifach-Wechselwirkungen, gesättigt oder einzelne
   * Wechselwirkungen (hierarchisch: eine Wechselwirkung schließt ihre Haupteffekte ein). Eine andere Wahl rechnet in R neu. Daneben (Field-Stufe 3b) die automatische Suche „Rückwärts wie SPSS“ (LoglinRueck.svelte, im Browser); sie ist zufallsabhängig und nie voreingestellt.
   */
  let { blatt, e, name, tabellen }: { blatt: Blatt; e: LogE; name: (n: string) => string; tabellen: OutputItem[] } = $props();
  const ID = 'll', k = $derived(e.faktoren.length);
  let art = $state<LogArt>(untrack(() => e.wahl.art)), eigen = $state<number[][]>(untrack(() => e.wahl.eigen.map(t => [...t])));
  let rechnet = $state(false), fehler = $state('');
  const angebot = $derived(logAngebot(k));
  const arten = $derived<LogArt[]>(k <= 2 ? ['unabh', 'voll'] : ['unabh', 'zwei', 'voll', 'eigen']);
  const artName = (a: LogArt) => (a === 'unabh' ? L('Unabhängigkeit (nur Haupteffekte)', 'Independence (main effects only)') : a === 'zwei' ? L('Alle Zweifach-Wechselwirkungen', 'All two-way interactions') : a === 'voll' ? L('Gesättigt (alle Wechselwirkungen)', 'Saturated (all interactions)') : L('Einzelne Wechselwirkungen ankreuzen', 'Tick single interactions'));
  const wahl = $derived(logWahlBereinigen({ art, eigen }, k));
  const geaendert = $derived(wahl.art !== e.wahl.art || (wahl.art === 'eigen' && JSON.stringify(wahl.eigen) !== JSON.stringify(e.wahl.eigen)));
  const eigenLeer = $derived(art === 'eigen' && wahl.eigen.length === 0);
  const schluessel = (t: number[]) => t.join('-');
  const an = (t: number[]) => eigen.some(u => schluessel(u) === schluessel(t));
  function umschalten(t: number[]) { eigen = an(t) ? eigen.filter(u => schluessel(u) !== schluessel(t)) : [...eigen, t]; }
  async function neuRechnen() {
    if (rechnet || eigenLeer) return;
    rechnet = true; fehler = '';
    try {
      const neu = await loglinearRechnen(e.faktoren, e.haeuf, wahl);
      blatt.ergebnis = { typ: 'loglinear', e: neu }; void sichern();
      melde(L('Neu gerechnet.', 'Recalculated.'));
    } catch (x) { fehler = (x as Error).message; }
    finally { rechnet = false; }
  }
</script>

<BlattKurspaket {tabellen} rcode={logRCode(e.faktoren, e.haeuf, e.modelle[0]!.terme)} hilfeId="frage-loglinear" hilfeText={L('Hilfe: Loglineare Modelle lesen und berichten', 'Help: reading and reporting log-linear models')}>
  {#snippet hinten()}
    <details class="auf" style="margin-top:var(--a4)" open={geaendert}><summary>{L('Weitere Wege: Modell wählen', 'More options: choose the model')}</summary>
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a2)"><legend>{L('Modell', 'Model')}</legend>
        <div class="segment" role="radiogroup" aria-describedby="{ID}-modell-h">{#each arten as a (a)}<label><input type="radio" name="{ID}-art" value={a} checked={art === a} onchange={() => (art = a)}>{artName(a)}</label>{/each}</div>
        <p id="{ID}-modell-h" class="hilfe">{L('Das Modell gilt hierarchisch: Eine Wechselwirkung schließt ihre Haupteffekte und niedrigeren Wechselwirkungen ein. Die Wahl von Hand ist der Standard; die automatische Suche „Rückwärts wie SPSS“ steht darunter und ist zufallsabhängig.', 'The model is hierarchical: an interaction includes its main effects and lower-order interactions. Choosing by hand is the default; the automatic search "backward as SPSS" is below and depends on chance.')}</p>
        {#if art === 'eigen'}
          <div class="segment" role="group" aria-label={L('Wechselwirkungen', 'Interactions')} style="margin-top:var(--a2)">{#each angebot as t (schluessel(t))}<label data-begriff="interaktion"><input type="checkbox" checked={an(t)} onchange={() => umschalten(t)}>{logTermName(t, e.faktoren, name)}</label>{/each}</div>
          {#if eigenLeer}<p class="hilfe" use:ergebnisAnsage>{d('Kreuze mindestens eine Wechselwirkung an. Ohne sie ist es das Modell der Unabhängigkeit.', 'Kreuzen Sie mindestens eine Wechselwirkung an. Ohne sie ist es das Modell der Unabhängigkeit.', 'Tick at least one interaction. Without one it is the independence model.')}</p>{/if}
        {/if}
        <p class="hilfe">{L(`Gewählt: ${logTerme(wahl, k).map(t => logTermName(t, e.faktoren, name)).join(', ')}.`, `Chosen: ${logTerme(wahl, k).map(t => logTermName(t, e.faktoren, name)).join(', ')}.`)}</p>
      </fieldset>
      <RStart knopf={L('Mit diesem Modell neu rechnen', 'Recalculate with this model')} los={neuRechnen} laeuft={rechnet} haupt={false} pakete={[]} gesperrt={!geaendert || eigenLeer} />
      {#if !geaendert && !rechnet}<p class="hilfe">{d('Ändere das Modell, dann ist der Knopf frei.', 'Ändern Sie das Modell, dann ist der Knopf frei.', 'Change the model and the button becomes active.')}</p>{/if}
      {#if fehler}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehler}</p>{/if}
    </details>
    <LoglinRueck {e} {name} />
  {/snippet}
</BlattKurspaket>
