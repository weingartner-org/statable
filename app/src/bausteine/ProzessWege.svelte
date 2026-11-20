<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { L, d } from '../lib/sitzung.svelte';
  import { komma } from '../lib/ergebnis';
  import type { ZusatzWahl } from '../lib/aequirci';
  import { kopiereProzess, type ProzessModell } from '../lib/prozesswahl';
  import type { ModeratorWerte } from '../lib/prozess';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * „Weitere Wege“ der Karte Mediation (Später, Welle S-D, G14): bedingte und serielle Mediation (PROCESS-Modelle 7, 14 und 6).
   * Reine Wahl (Modell, Werte von W); gerechnet wird beim Rechnen des Blatts (Blatt.svelte, berechneBlatt), Zahlen und Sätze: lib/prozess.ts, lib/prozesssaetze.ts.
   * Die vierte Spalte (Moderator W oder zweiter Zwischenschritt M2) steht in der Lücke darüber. `wInfo`: die W-Werte, die gerechnet würden (Vorschau); `eigenFehler`: die eigenen Werte lassen sich nicht lesen.
   */
  let { zus = $bindable(), vierte, wInfo, eigenFehler, wName }: {
    zus: ZusatzWahl;
    /** Name der gewählten vierten Spalte, sonst null */ vierte: string | null;
    wInfo: ModeratorWerte | null;
    eigenFehler: boolean;
    wName: string;
  } = $props();

  const wahl = $derived(kopiereProzess(zus.prozess));
  const setze = (neu: Partial<typeof wahl>) => { zus.prozess = { ...wahl, ...neu }; };
  const MODELLE = $derived<[ProzessModell, string, string][]>([
    [4, L('Einfache Mediation', 'Simple mediation'), L('X → M → Y (Standard)', 'X → M → Y (default)')],
    [7, L('Der Weg von X zu M hängt von W ab', 'The path from X to M depends on W'), L('Modell 7 nach Hayes', 'Model 7 by Hayes')],
    [14, L('Der Weg von M zu Y hängt von W ab', 'The path from M to Y depends on W'), L('Modell 14 nach Hayes', 'Model 14 by Hayes')],
    [6, L('Zwei Zwischenschritte hintereinander', 'Two intermediate steps in sequence'), L('Modell 6: X → M1 → M2 → Y', 'Model 6: X → M1 → M2 → Y')]
  ]);
  const kz = (v: number) => komma(v, 2);
</script>

<div class="zusatz-wahl" style="margin-top:var(--a3)">
  <fieldset class="zusatz-gruppe"><legend>{L('Bedingte oder serielle Mediation', 'Conditional or serial mediation')}</legend>
    <div class="wahl-karten" role="radiogroup" aria-label={L('Modell der Mediation', 'Model of the mediation')} aria-describedby="proz-h">
      {#each MODELLE as [m, t1, t2] (m)}
        <label class:an={wahl.modell === m}><input type="radio" name="proz-modell" value={m} checked={wahl.modell === m} onchange={() => setze({ modell: m })}><span><b>{t1}</b><small>{t2}</small></span></label>
      {/each}
    </div>
    <p id="proz-h" class="hilfe">{wahl.modell === 4
      ? d('Wähle ein anderes Modell und oben unter „Bedingte oder serielle Mediation, vierte Größe“ die dazugehörige Spalte, wenn der Einfluss von einem Dritten abhängt oder über zwei Zwischenschritte läuft.', 'Wählen Sie ein anderes Modell und oben unter „Bedingte oder serielle Mediation, vierte Größe“ die dazugehörige Spalte, wenn der Einfluss von einem Dritten abhängt oder über zwei Zwischenschritte läuft.', 'Choose another model and, above under "Conditional or serial mediation, fourth variable", the matching column if the influence depends on a third variable or runs through two intermediate steps.')
      : wahl.modell === 6
      ? L('Die vierte Größe ist der zweite Zwischenschritt M2; er läuft nach M1. Die Reihenfolge ist eine Annahme aus der Theorie, die Daten prüfen sie nicht.', 'The fourth variable is the second intermediate step M2; it comes after M1. The order is an assumption from theory; the data do not test it.')
      : L('Die vierte Größe ist der Moderator W (eine Zahl oder zwei Werte). Maßgeblich ist der Index der moderierten Mediation; die bedingten Effekte beschreiben nur, wie groß der indirekte Effekt bei einzelnen Werten von W ist.', 'The fourth variable is the moderator W (a number or two values). What matters is the index of moderated mediation; the conditional effects only describe how large the indirect effect is at single values of W.')}</p>
    {#if wahl.modell !== 4 && !vierte}<p class="hilfe" use:ergebnisAnsage>{wahl.modell === 6 ? L('Es fehlt noch die Spalte des zweiten Zwischenschritts (oben).', 'The column of the second intermediate step (above) is still missing.') : L('Es fehlt noch die Spalte des Moderators W (oben).', 'The column of the moderator W (above) is still missing.')}</p>{/if}

    {#if (wahl.modell === 7 || wahl.modell === 14) && vierte}
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)"><legend>{L('Bei welchen Werten von W?', 'At which values of W?')}</legend>
        {#if wInfo?.zwei}
          <p class="hilfe">{L(`${wName} hat zwei Werte; die bedingten Effekte gelten bei diesen beiden Werten (${wInfo.werte.map(kz).join(' und ')}).`, `${wName} has two values; the conditional effects hold at these two values (${wInfo.werte.map(kz).join(' and ')}).`)}</p>
        {:else}
          <div class="segment" role="radiogroup" aria-label={L('Werte von W', 'Values of W')} aria-describedby="proz-w-h">{#each [['perzentil', L('16., 50., 84. Perzentil (Standard)', '16th, 50th, 84th percentile (default)')], ['sd', L('Mittelwert ± 1 Standardabweichung', 'Mean ± 1 standard deviation')], ['eigen', L('Eigene Werte', 'Own values')]] as [w, tx]}<label data-begriff={w === 'perzentil' ? 'perzentil' : w === 'sd' ? 'standardabweichung' : undefined}><input type="radio" name="proz-regel" value={w} checked={wahl.regel === w} onchange={() => setze({ regel: w as 'perzentil' | 'sd' | 'eigen' })}>{tx}</label>{/each}</div>
          {#if wahl.regel === 'eigen'}
            <div class="eingabe" style="margin-top:var(--a2)"><label for="proz-eigen">{L('Werte von W (bis zu fünf, durch Semikolon getrennt)', 'Values of W (up to five, separated by semicolons)')}</label>
              <input id="proz-eigen" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value={wahl.eigen} oninput={(ev) => setze({ eigen: ev.currentTarget.value })} aria-invalid={eigenFehler ? 'true' : undefined} aria-describedby="proz-eigen-h" style="max-width:24ch">
              <p id="proz-eigen-h" class="hilfe" role={eigenFehler ? 'alert' : undefined}>{eigenFehler ? L('Das sind keine Zahlen. Beispiel: 2; 3,5; 5', 'These are not numbers. Example: 2; 3.5; 5') : L('Beispiel: 2; 3,5; 5', 'Example: 2; 3.5; 5')}</p></div>
          {/if}
          <p id="proz-w-h" class="hilfe">{wahl.regel === 'perzentil'
            ? L('Das 16., 50. und 84. Perzentil nach Typ 6 (wie in SPSS und PSPP; so wählt auch PROCESS). Die Werte bleiben im beobachteten Bereich. Sie werden einmal aus den Originaldaten bestimmt und in allen Ziehungen festgehalten.', 'The 16th, 50th and 84th percentile by type 6 (as in SPSS and PSPP; PROCESS chooses likewise). The values stay within the observed range. They are determined once from the original data and held fixed in all draws.')
            : wahl.regel === 'sd'
            ? L('Mittelwert und eine Standardabweichung darunter und darüber. Bei schiefen Verteilungen kann ein Wert außerhalb der beobachteten Werte liegen (Hochrechnung).', 'The mean and one standard deviation below and above it. With skewed distributions a value can lie outside the observed values (extrapolation).')
            : L('Frei gewählte Werte. Werte außerhalb der beobachteten Werte sind eine Hochrechnung; das steht dann im Ergebnis.', 'Freely chosen values. Values outside the observed values are an extrapolation; the result then says so.')}</p>
        {/if}
        {#if wInfo && wInfo.werte.length}
          <p class="hilfe">{L(`Gerechnet wird bei ${wName} = ${wInfo.werte.map(kz).join(' | ')}.`, `The calculation is done at ${wName} = ${wInfo.werte.map(kz).join(' | ')}.`)}</p>
        {/if}
      </fieldset>
    {/if}
    <p class="hilfe"><HilfeLink id="frage-mediation" text={L('Hilfe: Mediation', 'Help: mediation')} /></p>
  </fieldset>
</div>

<style>
  .wahl-karten { display: grid; grid-template-columns: 1fr 1fr; gap: var(--a2); }
  .wahl-karten label { display: flex; align-items: flex-start; gap: var(--a2); padding: var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); cursor: pointer; background: var(--blatt); min-height: 64px; }
  .wahl-karten label.an { border-color: var(--akzent); background: var(--akzent-hell); box-shadow: inset 0 0 0 1px var(--akzent); }
  .wahl-karten label:has(input:focus-visible) { box-shadow: var(--fokus-ring); }
  .wahl-karten input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 2px 0 0; flex: none; }
  .wahl-karten span { display: flex; flex-direction: column; gap: 2px; }
  .wahl-karten b { font-weight: 600; line-height: 1.25; }
  .wahl-karten small { color: var(--tinte-2); font-size: var(--gr-klein); }
  :global(:where(:root.eng-860)) .wahl-karten { grid-template-columns: 1fr; }
</style>
