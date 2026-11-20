<script lang="ts">
  import { L, d } from '../lib/sitzung.svelte';
  import { umfrageTestWert, type ZusatzWahl } from '../lib/aequirci';
  import { proz } from '../i18n/profil';

  /**
   * „Weitere Wege“ der Karte Verteilung bei einem Umfragegewicht mit der Antwort „Personen einzeln gezogen: Ja“ (Später S-D2, Fachblatt 1.2 und 2.2, Entscheidungen Opus 2 und 5):
   * der Test des Mittelwerts gegen einen Wert und das Intervall für Anteile (Logit = Voreinstellung, Korn-Graubard). Reine Wahl; gerechnet wird beim Rechnen des Blatts (Blatt.svelte, berechneBlatt).
   */
  let { zus = $bindable() }: { zus: ZusatzWahl } = $props();
  const u = $derived(zus.umfrage ?? { test: false, wert: '', anteil: 'logit' as const });
  const setze = (neu: Partial<NonNullable<ZusatzWahl['umfrage']>>) => { zus.umfrage = { ...u, ...neu }; };
  const wert = $derived(umfrageTestWert(u));
  const kennung = $props.id();
</script>

<div class="zusatz-wahl" style="margin-top:var(--a3)">
  <label class="schalter"><input type="checkbox" checked={u.test} onchange={e => setze({ test: e.currentTarget.checked })}>{L('Mittelwert gegen einen Wert testen (Umfragegewicht)', 'Test the mean against a value (survey weight)')}</label>
  {#if u.test}
    <div class="eingabe"><label for="{kennung}-wert">{L('Wert, gegen den getestet wird (Pflichtangabe)', 'Value to test against (required)')}</label>
      <input id="{kennung}-wert" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value={u.wert} oninput={e => setze({ wert: e.currentTarget.value })} placeholder={L('z. B. 3', 'e.g. 3')}
        aria-invalid={u.wert.trim() !== '' && wert === null ? 'true' : undefined} aria-describedby="{kennung}-wert-h" style="max-width:10ch">
      <p id="{kennung}-wert-h" class="hilfe">{d('Zweiseitiger t-Test des gewichteten Mittelwerts mit dem Standardfehler der Umfrage. Der Wert kommt aus der Fragestellung oder der Literatur und steht vor der Auswertung fest.',
        'Zweiseitiger t-Test des gewichteten Mittelwerts mit dem Standardfehler der Umfrage. Der Wert kommt aus der Fragestellung oder der Literatur und steht vor der Auswertung fest.',
        'Two-sided t test of the weighted mean with the survey standard error. The value comes from the research question or the literature and is fixed before the analysis.')}</p>
      {#if u.wert.trim() !== '' && wert === null}<p class="hilfe" role="alert">{L('Der Wert muss eine Zahl sein, zum Beispiel 3 oder 50,5.', 'The value must be a number, for example 3 or 50.5.')}</p>{/if}
    </div>
  {/if}
  <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)"><legend>{L('Intervall für Anteile', 'Interval for proportions')}</legend>
    <div class="segment" role="radiogroup" aria-describedby="{kennung}-ki-h">{#each [['logit', L('Logit-Intervall (Standard)', 'Logit interval (default)')], ['beta', L('Korn-Graubard', 'Korn-Graubard')]] as [w, tx]}<label><input type="radio" name="{kennung}-ki" value={w} checked={u.anteil === w} onchange={() => setze({ anteil: w as 'logit' | 'beta' })}>{tx}</label>{/each}</div>
    <p id="{kennung}-ki-h" class="hilfe">{u.anteil === 'beta'
      ? L(`Das Intervall nach Korn-Graubard ist bei wenigen Fällen und bei Anteilen nahe ${proz('0')} und ${proz('100')} verlässlicher als das Logit-Intervall; es ist meist etwas breiter und das Verfahren der amtlichen Gesundheitsstatistik der USA.`, `The Korn-Graubard interval is more reliable than the logit interval with few cases and with proportions close to ${proz('0')} and ${proz('100')}; it is usually a little wider and the method of the official US health statistics.`)
      : L(`Das Logit-Intervall ist die Voreinstellung (wie in SUDAAN und SPSS Complex Samples). Es liegt immer zwischen ${proz('0')} und ${proz('100')}. Bei weniger als 10 Fällen auf der kleineren Seite weist Statable auf das Intervall nach Korn-Graubard hin.`, `The logit interval is the default (as in SUDAAN and SPSS Complex Samples). It always lies between ${proz('0')} and ${proz('100')}. With fewer than 10 cases on the smaller side Statable points to the Korn-Graubard interval.`)}</p>
  </fieldset>
</div>
