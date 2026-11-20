<script lang="ts">
  /**
   * „Studie planen“, Später S-F2, Teil A: R²-Zuwachs (Block von Prädiktoren), partielle Korrelation und die Karte „Gruppen mit mehreren Faktoren oder Messwiederholung“.
   * Eingaben und Rechnung: lib/planneu.svelte.ts (planF2), Formeln und Sätze: lib/power.ts (geprüft gegen R, WebPower und die gedruckten Beispiele von G*Power).
   * Wie überall auf der Seite: Die Frage ist der ERWARTETE Effekt (kein Post-hoc), aufgerundet auf ganze Personen, dazu die erreichte Power.
   */
  import type { Snippet } from 'svelte';
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { s, L, istEn, melde } from '../lib/sitzung.svelte';
  import { dezimal, ganzZahl } from '../i18n/profil';
  import { zahlDe } from '../lib/format';
  import {
    ausfallZuschlag, f2AusEtaSpss, fMessAusSpss, hinweisFestesModell, leseZahl, satzAncova, satzAnovaFaktoren, satzKontrast, satzMessw, satzPartiell,
    satzR2Zuwachs, satzR2ZuwachsSens, type Fmt
  } from '../lib/power';
  import { planNeu as pn, planF2 as p } from '../lib/planneu.svelte';
  import Icon from './Icon.svelte';
  import HilfeLink from './HilfeLink.svelte';

  let { testWahl }: { testWahl: Snippet } = $props();

  const fmt = $derived<Fmt>({ en: istEn(), punkt: dezimal() === '.' });
  const kz = (v: number, st = 2) => zahlDe(v, st);
  const apa = (v: number, st = 2) => zahlDe(v, st).replace(/^(−?)0(?=[.,])/, '$1');   // ,80 statt 0,80
  const ganz = ganzZahl;
  const art = $derived(pn.art);

  /* ---------- Texte zu den Prüfcodes ---------- */
  const fehlerText = (f: string | null) => f === null ? '' : ({
    r2: L('Die R²-Werte müssen so liegen: 0 ≤ R² vorher < R² nachher < 1.', 'The R² values must satisfy 0 ≤ R² before < R² after < 1.'),
    r2alle: L('R² mit allen Blöcken muss mindestens so groß sein wie R² nachher und unter 1 liegen. Leer lassen, wenn es keinen dritten Block gibt.', 'R² with all blocks must be at least as large as R² after and below 1. Leave it empty if there is no third block.'),
    q: L('Die getesteten Prädiktoren sind eine ganze Zahl ab 1 und höchstens so viele wie alle Prädiktoren im Modell.', 'The tested predictors are a whole number of 1 or more and at most as many as all predictors in the model.'),
    n: L('Die Zahl der Personen ist zu klein für dieses Modell.', 'The number of people is too small for this model.'),
    f2: L('f² muss eine Zahl größer als 0 sein.', 'f² must be a number greater than 0.'),
    rp: L('Die partielle Korrelation liegt zwischen −1 und 1, nicht 0 und nicht ±1.', 'The partial correlation lies between −1 and 1, not 0 and not ±1.'),
    k: L('Die Zahl der Kontrollvariablen ist eine ganze Zahl ab 0.', 'The number of control variables is a whole number of 0 or more.'),
    zellen: L('Die Zahl der Gruppen (Zellen) ist eine ganze Zahl von 2 bis 200.', 'The number of groups (cells) is a whole number from 2 to 200.'),
    df1: L('Die Freiheitsgrade des Effekts passen nicht zur Zahl der Zellen.', 'The degrees of freedom of the effect do not fit the number of cells.'),
    r2kov: L('R² der Kovariate liegt von 0 bis unter 1.', 'R² of the covariate lies from 0 to below 1.'),
    kov: L('Die Zahl der Kovariaten liegt zwischen 1 und 20.', 'The number of covariates is between 1 and 20.'),
    f: L('Cohens f liegt zwischen 0 und 3 (Richtwerte ,10 / ,25 / ,40).', "Cohen's f lies between 0 and 3 (benchmarks .10 / .25 / .40)."),
    liste: L('Mittelwerte und Gewichte sind je eine Liste gleicher Länge, mit Semikolon getrennt.', 'Means and weights are lists of the same length, separated by semicolons.'),
    summe: L('Die Gewichte eines Kontrasts ergeben zusammen 0.', 'The weights of a contrast add up to 0.'),
    null: L('Dieser Kontrast hat keinen Unterschied: Die Mittelwerte ergeben mit den Gewichten 0.', 'This contrast shows no difference: the means with these weights give 0.'),
    m: L('Eine Messwiederholung hat mindestens 2 Messungen.', 'Repeated measures need at least 2 measurements.'),
    rho: L('Die Korrelation zwischen den Messungen liegt von −1/(Messungen − 1) bis unter 1.', 'The correlation between the measurements lies from −1/(measurements − 1) to below 1.'),
    eps: L('ε liegt von 1/(Messungen − 1) bis 1 (1 = Sphärizität).', 'ε lies from 1/(measurements − 1) to 1 (1 = sphericity).')
  } as Record<string, string>)[f] ?? L('Bitte die Zahlen prüfen.', 'Please check the numbers.');
  const ausfallFehler = $derived(p.ausfallText.trim() !== '' && !p.ausfallOk ? L('Der Ausfall liegt zwischen 0 und 90 %.', 'The dropout is between 0 and 90%.') : '');
  const ausfallGilt = $derived(p.ausfallOk && p.ausfall > 0);
  const mitAusfall = (n: number) => ausfallZuschlag(n, p.ausfall);

  /* ---------- Hilfsfenster: f aus Mittelwerten, f aus SPSS ---------- */
  let hMittel = $state('90; 100; 110'), hSd = $state('20'), hEta = $state('.06'), hN0 = $state('60'), hHinweis = $state('');
  const liste = (t: string) => t.split(/[;\s]+/).map(x => x.trim()).filter(Boolean).map(leseZahl);
  function fAusMitteln() {
    const mu = liste(hMittel), sd = leseZahl(hSd);
    if (mu.length < 2 || mu.some(v => !Number.isFinite(v)) || !(sd > 0)) { hHinweis = L('Bitte mindestens zwei Mittelwerte und eine Standardabweichung größer als 0 eingeben.', 'Please enter at least two means and a standard deviation greater than 0.'); return; }
    const mw = mu.reduce((x, v) => x + v, 0) / mu.length, sM = Math.sqrt(mu.reduce((x, v) => x + (v - mw) ** 2, 0) / mu.length);
    setzeF(sM / sd);
  }
  function fAusSpss() {
    const e = leseZahl(hEta), n0 = leseZahl(hN0);
    if (!(e > 0 && e < 1) || !(n0 > 2)) { hHinweis = L('Das partielle η² liegt zwischen 0 und 1; N der Vorstudie ist größer als 2.', 'The partial η² lies between 0 and 1; N of the pilot study is greater than 2.'); return; }
    if (art === 'anovaplus' && p.anovaArt === 'messw') {
      if (!(p.messM >= 2) || !(p.messK >= 1) || !(n0 > p.messK) || !Number.isFinite(p.rho)) { hHinweis = L('Dafür müssen Gruppen, Messungen und die Korrelation unten stimmen.', 'For this, the groups, measurements and the correlation below must be valid.'); return; }
      setzeF(fMessAusSpss(e, n0, p.messK, p.messM, p.rho));
    } else {
      const zellen = p.anovaArt === 'faktoren' ? p.zellenFaktoren : p.anovaArt === 'kovariate' ? p.gruppen : p.mittel.length, kov = p.anovaArt === 'kovariate' && p.kov > 0 ? p.kov : 0, df2 = n0 - zellen - kov;
      if (!(df2 >= 1)) { hHinweis = L('N der Vorstudie ist für diesen Plan zu klein.', 'N of the pilot study is too small for this design.'); return; }
      setzeF(Math.sqrt(f2AusEtaSpss(e, n0, df2)));
    }
  }
  function setzeF(f: number) {
    p.fText = kz(Math.round(f * 10000) / 10000, 4).replace(/0+$/, '').replace(/[.,]$/, '');
    hHinweis = L(`Eingetragen: f = ${apa(f, 3)}.`, `Entered: f = ${apa(f, 3)}.`);
  }

  /* ---------- Sätze ---------- */
  const satzR2 = $derived(p.r2Erg ? satzR2Zuwachs({ f2: p.f2, q: p.q, m: p.m, alpha: p.alpha, ziel: p.power, N: p.r2Erg.N }, fmt) : '');
  const satzR2S = $derived(p.r2Sens ? satzR2ZuwachsSens({ f2: p.r2SensAuf, q: p.q, m: p.m, alpha: p.alpha, ziel: p.power, N: p.nGegeben }, fmt) : '');
  const satzPart = $derived(p.partErg && p.partErg.N !== null ? satzPartiell({ rp: p.rp, k: p.k, alpha: p.alpha, ziel: p.power, seiten: p.seiten, weg: p.partWeg, N: p.partErg.N }, fmt) : '');
  const satzFaktoren = $derived.by(() => {
    const r = p.faktorenErg?.r, e = p.gewaehlterEffekt; if (!r || !e) return '';
    return satzAnovaFaktoren({ a: p.a, b: p.b, ...(p.c >= 2 ? { c: p.c } : {}), effekt: e.name === 'A' ? 'A' : e.name === 'B' ? 'B' : 'A×B', effektName: e.name, f: p.f, df1: e.df1, alpha: p.alpha, ziel: p.power, N: r.N, jeZelle: r.jeZelle, NGleich: r.NGleich }, fmt);
  });
  const satzKov = $derived(p.kovErg ? satzAncova({ f: p.f, r2kov: p.r2kov, kovariaten: p.kov, df1: p.kovDf, zellen: p.gruppen, alpha: p.alpha, ziel: p.power, N: p.kovErg.N }, fmt) : '');
  const satzKontr = $derived(p.kontrastErg ? satzKontrast({ f: p.kontrastWert, gruppen: p.mittel.length, alpha: p.alpha, ziel: p.power, N: p.kontrastErg.N }, fmt) : '');
  const satzMess = $derived(p.messErg ? satzMessw({ typ: p.messTyp, k: p.messK, m: p.messM, f: p.f, rho: p.rho, eps: p.eps, alpha: p.alpha, ziel: p.power, N: p.messErg.N }, fmt) : '');
  const satzAnova = $derived(p.anovaArt === 'faktoren' ? satzFaktoren : p.anovaArt === 'kovariate' ? satzKov : p.anovaArt === 'kontrast' ? satzKontr : satzMess);
  const satz = $derived(art === 'r2zuwachs' ? (p.r2Ziel === 'n' ? satzR2 : satzR2S) : art === 'partiell' ? satzPart : satzAnova);

  let kopiert = $state(false);
  async function kopieren(text: string) {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch { /* nichts */ } t.remove(); }
    kopiert = true; melde(L('Satz kopiert.', 'Sentence copied.'));
    setTimeout(() => (kopiert = false), 2500);
  }
  const typName = (t: string) => t === 'innerhalb' ? L('Messzeitpunkte (innerhalb)', 'Measurement occasions (within)') : t === 'zwischen' ? L('Gruppen (zwischen)', 'Groups (between)') : L('Wechselwirkung Gruppe × Zeit', 'Interaction group × time');
</script>

{#snippet sicherheit(mitSeiten: boolean)}
  <fieldset class="gruppe"><legend>{L('Wie sicher soll das Ergebnis sein?', 'How certain should the result be?')}</legend>
    <div class="paar">
      <div class="eingabe"><span class="lbl" id="pf-alpha-l">{L('Irrtumswahrscheinlichkeit α', 'Significance level α')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="pf-alpha-l" data-tipp={L('Wie oft man einen Unterschied behauptet, obwohl es keinen gibt. Üblich: ,05', 'How often you claim a difference although there is none. Usual: .05')}>{#each [0.1, 0.05, 0.01, 0.001] as a}<label data-begriff="signifikanzniveau"><input type="radio" name="pf-alpha" value={a} bind:group={p.alpha}>{apa(a, a < 0.01 ? 3 : 2)}</label>{/each}</div></div>
      <div class="eingabe"><span class="lbl" id="pf-power-l">{L('Power (1 − β)', 'Power (1 − β)')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="pf-power-l" data-tipp={L('Wie sicher ein wirklich vorhandener Effekt gefunden wird. Üblich: ,80', 'How reliably a truly existing effect is found. Usual: .80')}>{#each [0.8, 0.9, 0.95] as pw}<label data-begriff="power"><input type="radio" name="pf-power" value={pw} bind:group={p.power}>{apa(pw)}</label>{/each}</div></div>
    </div>
    {#if mitSeiten}
      <div class="eingabe"><span class="lbl" id="pf-seiten-l">{L('Hypothese', 'Hypothesis')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="pf-seiten-l"><label data-begriff="einseitig-zweiseitig"><input type="radio" name="pf-seiten" value={2} bind:group={p.seiten}>{L('zweiseitig (Standard)', 'two-tailed (default)')}</label><label data-begriff="einseitig-zweiseitig"><input type="radio" name="pf-seiten" value={1} bind:group={p.seiten}>{L('einseitig', 'one-tailed')}</label></div></div>
    {/if}
    <div class="eingabe"><label for="pf-ausfall">{L('Erwarteter Ausfall in Prozent (optional)', 'Expected dropout in percent (optional)')}</label>
      <input id="pf-ausfall" type="text" inputmode="decimal" autocomplete="off" bind:value={p.ausfallText} aria-invalid={ausfallFehler ? 'true' : undefined} aria-describedby="pf-ausfall-h" style="max-width:8ch">
      <span class="hilfe" id="pf-ausfall-h">{ausfallFehler || L('Wer ausfällt, fehlt in der Auswertung. Statable rechnet n / (1 − Ausfall) und rundet auf.', 'People who drop out are missing from the analysis. Statable calculates n / (1 − dropout) and rounds up.')}</span></div>
  </fieldset>
{/snippet}

{#snippet hilfsfenster(mitMittel: boolean)}
  <details class="hilfs">
    <summary>{L('Hilfe: f ausrechnen', 'Help: work out f')}</summary>
    <div class="hilfs-innen">
      {#if mitMittel}
        <div class="eingabe"><label for="pf-h-mu">{art === 'anovaplus' && p.anovaArt === 'messw' ? L('Erwartete Mittelwerte der Messungen (mit Semikolon getrennt)', 'Expected means of the measurements (separated by semicolons)') : L('Erwartete Mittelwerte der Gruppen (mit Semikolon getrennt)', 'Expected group means (separated by semicolons)')}</label>
          <input id="pf-h-mu" type="text" autocomplete="off" bind:value={hMittel}></div>
        <div class="eingabe"><label for="pf-h-sd">{art === 'anovaplus' && p.anovaArt === 'messw' ? L('Standardabweichung einer Messung innerhalb einer Gruppe', 'Standard deviation of one measurement within a group') : L('Standardabweichung innerhalb der Gruppen', 'Standard deviation within the groups')}</label>
          <input id="pf-h-sd" type="text" inputmode="decimal" autocomplete="off" bind:value={hSd} style="max-width:10ch"></div>
        <div class="knopfzeile"><button id="pf-h-f" class="k klein" type="button" onclick={fAusMitteln}>{L('f aus Mittelwerten übernehmen', 'Use f from the means')}</button></div>
        <span class="hilfe">{L('f = Streuung der Mittelwerte (durch ihre Zahl geteilt) geteilt durch die Streuung innerhalb der Gruppen. Bei gleich großen Gruppen.', 'f = spread of the means (divided by their number) divided by the spread within the groups. For equal-sized groups.')}</span>
      {/if}
      <div class="paar">
        <div class="eingabe"><label for="pf-h-eta">{L('Partielles η² aus SPSS', 'Partial η² from SPSS')}</label><input id="pf-h-eta" type="text" inputmode="decimal" autocomplete="off" bind:value={hEta} style="max-width:10ch"></div>
        <div class="eingabe"><label for="pf-h-n0">{L('N der Vorstudie', 'N of the pilot study')}</label><input id="pf-h-n0" type="text" inputmode="numeric" autocomplete="off" bind:value={hN0} style="max-width:10ch"></div>
      </div>
      <div class="knopfzeile"><button id="pf-h-spss" class="k klein" type="button" onclick={fAusSpss}>{L('f aus SPSS übernehmen', 'Use f from SPSS')}</button></div>
      <span class="hilfe">{L('Das partielle η² von SPSS hängt von der Zahl der Personen der Vorstudie ab. Statable rechnet es auf das f von G*Power um. Das η² einer Kovarianzanalyse ist schon um die Kovariate bereinigt: Dann R² der Kovariate unten auf 0 setzen.', 'The partial η² from SPSS depends on the number of people in the pilot study. Statable converts it to the f of G*Power. The η² from an analysis of covariance is already adjusted for the covariate: then set R² of the covariate below to 0.')}</span>
      <span class="hilfe" role="status">{hHinweis}</span>
    </div>
  </details>
{/snippet}

<div class="plan-raster">
  <div class="plan-links">
    <fieldset class="gruppe"><legend>{L('1  Was soll verglichen werden?', '1  What is being compared?')}</legend>
      {@render testWahl()}
    </fieldset>

    {#if art === 'r2zuwachs'}
      <fieldset class="gruppe"><legend>{L('2  Was soll berechnet werden?', '2  What should be calculated?')}</legend>
        <div class="segment" role="radiogroup" aria-label={L('Was soll berechnet werden?', 'What should be calculated?')}>
          <label data-begriff="fallzahlplanung"><input type="radio" name="pf-r2ziel" value="n" bind:group={p.r2Ziel}>{L('Wie viele Personen brauche ich?', 'How many people do I need?')}</label>
          <label><input type="radio" name="pf-r2ziel" value="effekt" bind:group={p.r2Ziel}>{L('Ich habe n Personen - welchen Effekt finde ich?', 'I have n people - which effect can I find?')}</label>
        </div>
        {#if p.r2Ziel === 'n'}
          <div class="segment" role="radiogroup" aria-label={L('Wie wird der Effekt angegeben?', 'How is the effect stated?')}>
            <label><input type="radio" name="pf-r2art" value="r2" bind:group={p.r2Art}>{L('Aus R²-Werten', 'From R² values')}</label>
            <label><input type="radio" name="pf-r2art" value="f2" bind:group={p.r2Art}>{L('f² direkt', 'f² directly')}</label>
          </div>
          {#if p.r2Art === 'r2'}
            <div class="paar">
              <div class="eingabe"><label for="pf-r2alt">{L('R² ohne den Block', 'R² without the block')}</label><input id="pf-r2alt" type="text" inputmode="decimal" autocomplete="off" bind:value={p.r2altText} style="max-width:8ch"></div>
              <div class="eingabe"><label for="pf-r2voll">{L('R² mit dem Block', 'R² with the block')}</label><input id="pf-r2voll" type="text" inputmode="decimal" autocomplete="off" bind:value={p.r2vollText} style="max-width:8ch"></div>
            </div>
            <div class="eingabe"><label for="pf-r2alle">{L('R² mit allen Blöcken (optional, wenn ein dritter Block nur Streuung bindet)', 'R² with all blocks (optional, if a third block only absorbs variance)')}</label><input id="pf-r2alle" type="text" inputmode="decimal" autocomplete="off" bind:value={p.r2alleText} style="max-width:8ch"></div>
            <span class="hilfe">{Number.isFinite(p.f2) ? L(`Daraus folgt f² = ${apa(p.f2, 4)}. Die Richtwerte ,02 / ,15 / ,35 von Cohen gelten für f², nicht für den Zuwachs an R².`, `This gives f² = ${apa(p.f2, 4)}. Cohen's benchmarks .02 / .15 / .35 apply to f², not to the increase in R².`) : L('f² = (R² mit − R² ohne) / (1 − R² mit). Die Richtwerte ,02 / ,15 / ,35 gelten für f², nicht für den Zuwachs an R².', 'f² = (R² with − R² without) / (1 − R² with). The benchmarks .02 / .15 / .35 apply to f², not to the increase in R².')}</span>
          {:else}
            <div class="eingabe"><label for="pf-f2">f²</label><input id="pf-f2" type="text" inputmode="decimal" autocomplete="off" bind:value={p.f2Text} aria-invalid={p.r2Fehler === 'f2' ? 'true' : undefined} aria-describedby={(p.r2Fehler === 'f2') ? 'pf-fehler-r2' : undefined} style="max-width:8ch">
              <span class="hilfe">{L('Richtwerte nach Cohen: ,02 klein, ,15 mittel, ,35 groß.', 'Benchmarks by Cohen: .02 small, .15 medium, .35 large.')}</span></div>
          {/if}
        {:else}
          <div class="eingabe"><label for="pf-n">{L('Personen insgesamt', 'People in total')}</label><input id="pf-n" type="text" inputmode="numeric" autocomplete="off" bind:value={p.nText} style="max-width:10ch"></div>
        {/if}
        <div class="paar">
          <div class="eingabe"><label for="pf-q">{L('Getestete Prädiktoren (der Block)', 'Tested predictors (the block)')}</label><input id="pf-q" type="text" inputmode="numeric" autocomplete="off" bind:value={p.qText} style="max-width:8ch"></div>
          <div class="eingabe"><label for="pf-m">{L('Alle Prädiktoren im Modell', 'All predictors in the model')}</label><input id="pf-m" type="text" inputmode="numeric" autocomplete="off" bind:value={p.mText} style="max-width:8ch"></div>
        </div>
        <span class="hilfe">{L('Ein Gruppenmerkmal mit g Stufen zählt g − 1 Prädiktoren. „Alle Prädiktoren“ sind die des vollen Modells, auch die schon enthaltenen.', 'A group variable with g levels counts as g − 1 predictors. "All predictors" are those of the full model, including those already in it.')}</span>
      </fieldset>
      {@render sicherheit(false)}

    {:else if art === 'partiell'}
      <fieldset class="gruppe"><legend>{L('2  Welcher Zusammenhang wird erwartet?', '2  Which relationship is expected?')}</legend>
        <div class="paar">
          <div class="eingabe"><label for="pf-rp">{L('Partielle Korrelation (ρp)', 'Partial correlation (ρp)')}</label><input id="pf-rp" type="text" inputmode="decimal" autocomplete="off" bind:value={p.rpText} aria-invalid={p.partFehler === 'rp' ? 'true' : undefined} aria-describedby={(p.partFehler === 'rp') ? 'pf-fehler-part' : undefined} style="max-width:8ch"></div>
          <div class="eingabe"><label for="pf-k">{L('Herausgerechnete Variablen', 'Variables partialled out')}</label><input id="pf-k" type="text" inputmode="numeric" autocomplete="off" bind:value={p.kText} aria-invalid={p.partFehler === 'k' ? 'true' : undefined} aria-describedby={(p.partFehler === 'k') ? 'pf-fehler-part' : undefined} style="max-width:8ch"></div>
        </div>
        <span class="hilfe">{L('Der Zusammenhang zweier Variablen, wenn die Kontrollvariablen herausgerechnet sind. Die Kontrollvariablen sollen mit beiden zusammenhängen, sonst ist es nur die einfache Korrelation. Teilkorrelation (semipartiell) und standardisiertes β sind etwas anderes.', 'The relationship between two variables once the control variables are partialled out. The control variables should be related to both, otherwise it is just the simple correlation. Semipartial correlation and the standardized β are different things.')}</span>
        <div class="wahl" role="radiogroup" aria-label={L('Rechenweg', 'Method')}>
          <label class:an={p.partWeg === 'exakt'}><input type="radio" name="pf-weg" value="exakt" checked={p.partWeg === 'exakt'} onchange={() => (p.partWeg = 'exakt')}><span><b>{L('Exakt (Standard)', 'Exact (default)')}</b><small>{L('Verteilung von r mit N − k Paaren', 'Distribution of r with N − k pairs')}</small></span></label>
          <label class:an={p.partWeg === 'fest'}><input type="radio" name="pf-weg" value="fest" checked={p.partWeg === 'fest'} onchange={() => (p.partWeg = 'fest')}><span><b>{L('Wie G*Power (fest)', 'As G*Power (fixed)')}</b><small>{L('R²-Zuwachs mit einem Prädiktor', 'R² increase with one predictor')}</small></span></label>
        </div>
      </fieldset>
      {@render sicherheit(true)}

    {:else}
      <fieldset class="gruppe"><legend>{L('2  Welcher Plan?', '2  Which design?')}</legend>
        <div class="wahl" role="radiogroup" aria-label={L('Plan', 'Design')}>
          {#each [['faktoren', L('Zwei oder drei Faktoren', 'Two or three factors'), L('Haupteffekt oder Wechselwirkung', 'Main effect or interaction')], ['kovariate', L('Mit Kovariate', 'With covariate'), L('Kovarianzanalyse', 'Analysis of covariance')], ['kontrast', L('Geplanter Kontrast', 'Planned contrast'), L('ein Vergleich mit Gewichten', 'one comparison with weights')], ['messw', L('Mit Messwiederholung', 'With repeated measures'), L('Zeit, Gruppe oder Wechselwirkung', 'Time, group or interaction')]] as [w, t1, t2] (w)}
            <label class:an={p.anovaArt === w}><input type="radio" name="pf-art" value={w} checked={p.anovaArt === w} onchange={() => (p.anovaArt = w as typeof p.anovaArt)}><span><b>{t1}</b><small>{t2}</small></span></label>
          {/each}
        </div>
      </fieldset>

      {#if p.anovaArt === 'faktoren'}
        <fieldset class="gruppe"><legend>{L('3  Plan und Effekt', '3  Design and effect')}</legend>
          <div class="paar">
            <div class="eingabe"><label for="pf-a">{L('Stufen Faktor A', 'Levels of factor A')}</label><input id="pf-a" type="text" inputmode="numeric" autocomplete="off" bind:value={p.aText} style="max-width:8ch"></div>
            <div class="eingabe"><label for="pf-b">{L('Stufen Faktor B', 'Levels of factor B')}</label><input id="pf-b" type="text" inputmode="numeric" autocomplete="off" bind:value={p.bText} style="max-width:8ch"></div>
            <div class="eingabe"><label for="pf-c">{L('Stufen Faktor C (1 = keiner)', 'Levels of factor C (1 = none)')}</label><input id="pf-c" type="text" inputmode="numeric" autocomplete="off" bind:value={p.cText} style="max-width:8ch"></div>
          </div>
          <div class="eingabe"><label for="pf-effekt">{L('Welcher Effekt soll gefunden werden?', 'Which effect should be found?')}</label>
            <select id="pf-effekt" bind:value={p.effekt}>{#each p.effekte as e (e.name)}<option value={e.name}>{e.name} ({L('Zähler-Freiheitsgrade', 'numerator df')}: {e.df1})</option>{/each}</select></div>
          <div class="eingabe"><label for="pf-f">{L('Erwarteter Effekt f (Cohen)', 'Expected effect f (Cohen)')}</label><input id="pf-f" type="text" inputmode="decimal" autocomplete="off" bind:value={p.fText} aria-invalid={p.faktorenFehler === 'f' ? 'true' : undefined} aria-describedby={(p.faktorenFehler === 'f') ? 'pf-fehler-anova' : undefined} style="max-width:8ch">
            <span class="hilfe">{L('Richtwerte: ,10 klein, ,25 mittel, ,40 groß - je Effekt, nicht für den ganzen Plan. Der Plan geht nur über die Zahl der Zellen in die Rechnung ein.', 'Benchmarks: .10 small, .25 medium, .40 large - per effect, not for the whole design. The design enters only through the number of cells.')}</span></div>
          {@render hilfsfenster(true)}
        </fieldset>
      {:else if p.anovaArt === 'kovariate'}
        <fieldset class="gruppe"><legend>{L('3  Gruppen und Kovariate', '3  Groups and covariate')}</legend>
          <div class="paar">
            <div class="eingabe"><label for="pf-gr">{L('Zahl der Gruppen', 'Number of groups')}</label><input id="pf-gr" type="text" inputmode="numeric" autocomplete="off" bind:value={p.gruppenText} style="max-width:8ch"></div>
            <div class="eingabe"><label for="pf-kov">{L('Zahl der Kovariaten', 'Number of covariates')}</label><input id="pf-kov" type="text" inputmode="numeric" autocomplete="off" bind:value={p.kovText} style="max-width:8ch"></div>
          </div>
          <div class="eingabe"><label for="pf-kovdf">{L('Zähler-Freiheitsgrade des Effekts (leer = Gruppen − 1)', 'Numerator degrees of freedom of the effect (empty = groups − 1)')}</label><input id="pf-kovdf" type="text" inputmode="numeric" autocomplete="off" bind:value={p.kovDfText} aria-invalid={p.kovFehler === 'df1' ? 'true' : undefined} aria-describedby={(p.kovFehler === 'df1') ? 'pf-fehler-anova' : undefined} style="max-width:8ch">
            <span class="hilfe">{L('Bei einem Faktor mit g Stufen sind es g − 1. In einem Plan mit mehreren Faktoren zählt der Effekt: Gruppen = alle Zellen, hier die Freiheitsgrade des Effekts (zum Beispiel 2 für einen Faktor mit 3 Stufen in einem 2 × 3-Plan).', 'For one factor with g levels it is g − 1. In a design with several factors the effect counts: groups = all cells, here the degrees of freedom of the effect (for example 2 for a factor with 3 levels in a 2 × 3 design).')}</span></div>
          <div class="eingabe"><label for="pf-r2kov">{L('R² der Kovariate(n) innerhalb der Gruppen', 'R² of the covariate(s) within the groups')}</label><input id="pf-r2kov" type="text" inputmode="decimal" autocomplete="off" bind:value={p.r2kovText} aria-invalid={p.kovFehler === 'r2kov' ? 'true' : undefined} aria-describedby={(p.kovFehler === 'r2kov') ? 'pf-fehler-anova' : undefined} style="max-width:8ch">
            <span class="hilfe">{L('Der Anteil der Streuung innerhalb der Gruppen, den die Kovariate(n) erklären. Die Kovariate soll nicht mit der Gruppe zusammenhängen (Zufallszuteilung).', 'The share of the variance within the groups that the covariate(s) explain. The covariate should not be related to the group (random assignment).')}</span></div>
          <div class="eingabe"><label for="pf-f">{L('Erwarteter Effekt f (Cohen) ohne Kovariate', 'Expected effect f (Cohen) without covariate')}</label><input id="pf-f" type="text" inputmode="decimal" autocomplete="off" bind:value={p.fText} aria-invalid={p.kovFehler === 'f' ? 'true' : undefined} aria-describedby={(p.kovFehler === 'f') ? 'pf-fehler-anova' : undefined} style="max-width:8ch"></div>
          {@render hilfsfenster(true)}
        </fieldset>
      {:else if p.anovaArt === 'kontrast'}
        <fieldset class="gruppe"><legend>{L('3  Kontrast', '3  Contrast')}</legend>
          <div class="eingabe"><label for="pf-mu">{L('Erwartete Mittelwerte der Gruppen (mit Semikolon getrennt)', 'Expected group means (separated by semicolons)')}</label><input id="pf-mu" type="text" autocomplete="off" bind:value={p.mittelText}></div>
          <div class="eingabe"><label for="pf-cw">{L('Gewichte des Kontrasts (Summe 0)', 'Weights of the contrast (sum 0)')}</label><input id="pf-cw" type="text" autocomplete="off" bind:value={p.gewichteText} aria-invalid={p.kontrastFehler === 'summe' || p.kontrastFehler === 'liste' ? 'true' : undefined} aria-describedby={(p.kontrastFehler === 'summe' || p.kontrastFehler === 'liste') ? 'pf-fehler-kontrast' : undefined}></div>
          <div class="paar">
            <div class="eingabe"><label for="pf-nje">{L('Personen je Gruppe (Annahme)', 'People per group (assumption)')}</label><input id="pf-nje" type="text" inputmode="numeric" autocomplete="off" bind:value={p.nJeText} style="max-width:8ch"></div>
            <div class="eingabe"><label for="pf-sigma">{L('Standardabweichung innerhalb der Gruppen', 'Standard deviation within the groups')}</label><input id="pf-sigma" type="text" inputmode="decimal" autocomplete="off" bind:value={p.sigmaText} style="max-width:8ch"></div>
          </div>
          <span class="hilfe">{Number.isFinite(p.kontrastWert) ? L(`Daraus folgt f = ${apa(p.kontrastWert, 3)} bei einem Zähler-Freiheitsgrad. Die Personen je Gruppe gehen nur in f ein; die Gesamtzahl kommt aus der Rechnung.`, `This gives f = ${apa(p.kontrastWert, 3)} with one numerator degree of freedom. The people per group enter only into f; the total comes from the calculation.`) : L('Beispiel: vier Gruppen, Kontrast (−1/2, −1/2, +1/2, +1/2) vergleicht die ersten zwei mit den letzten zwei.', 'Example: four groups, contrast (−1/2, −1/2, +1/2, +1/2) compares the first two with the last two.')}</span>
        </fieldset>
      {:else}
        <fieldset class="gruppe"><legend>{L('3  Messwiederholung', '3  Repeated measures')}</legend>
          <div class="wahl" role="radiogroup" aria-label={L('Welcher Effekt', 'Which effect')}>
            {#each [['innerhalb', L('Zeit (innerhalb)', 'Time (within)'), L('Ändern sich die Messungen?', 'Do the measurements change?')], ['zwischen', L('Gruppen (zwischen)', 'Groups (between)'), L('Unterscheiden sich die Gruppen?', 'Do the groups differ?')], ['wechsel', L('Gruppe × Zeit', 'Group × time'), L('Verläuft es je Gruppe anders?', 'Does it develop differently per group?')]] as [w, t1, t2] (w)}
              <label class:an={p.messTyp === w}><input type="radio" name="pf-typ" value={w} checked={p.messTyp === w} onchange={() => (p.messTyp = w as typeof p.messTyp)}><span><b>{t1}</b><small>{t2}</small></span></label>
            {/each}
          </div>
          <div class="paar">
            <div class="eingabe"><label for="pf-mk">{L('Zahl der Gruppen', 'Number of groups')}</label><input id="pf-mk" type="text" inputmode="numeric" autocomplete="off" bind:value={p.messKText} style="max-width:8ch"></div>
            <div class="eingabe"><label for="pf-mm">{L('Zahl der Messungen', 'Number of measurements')}</label><input id="pf-mm" type="text" inputmode="numeric" autocomplete="off" bind:value={p.messMText} style="max-width:8ch"></div>
          </div>
          <div class="paar">
            <div class="eingabe"><label for="pf-rho">{L('Erwartete Korrelation zwischen den Messungen', 'Expected correlation between the measurements')}</label><input id="pf-rho" type="text" inputmode="decimal" autocomplete="off" bind:value={p.rhoText} aria-invalid={p.messFehler === 'rho' ? 'true' : undefined} aria-describedby={(p.messFehler === 'rho') ? 'pf-fehler-mess' : undefined} style="max-width:8ch"></div>
            <div class="eingabe"><label for="pf-eps">{L('ε (1 = Sphärizität)', 'ε (1 = sphericity)')}</label><input id="pf-eps" type="text" inputmode="decimal" autocomplete="off" bind:value={p.epsText} aria-invalid={p.messFehler === 'eps' ? 'true' : undefined} aria-describedby={(p.messFehler === 'eps') ? 'pf-fehler-mess' : undefined} style="max-width:8ch"></div>
          </div>
          <span class="hilfe">{L('Je höher die Korrelation, desto weniger Personen braucht der Zeiteffekt - aber desto MEHR der Gruppenunterschied. ε unter 1 verlangt mehr Personen (SPSS zeigt ε nach Greenhouse-Geisser).', 'The higher the correlation, the fewer people the time effect needs - but the MORE the group difference needs. ε below 1 requires more people (SPSS shows ε after Greenhouse-Geisser).')}</span>
          <div class="eingabe"><label for="pf-f">{L('Erwarteter Effekt f - wie in G*Power', 'Expected effect f - as in G*Power')}</label><input id="pf-f" type="text" inputmode="decimal" autocomplete="off" bind:value={p.fText} aria-invalid={p.messFehler === 'f' ? 'true' : undefined} aria-describedby={(p.messFehler === 'f') ? 'pf-fehler-mess' : undefined} style="max-width:8ch">
            <span class="hilfe">{L('Dasselbe f heißt in G*Power, WebPower und SPSS etwas anderes: G*Power teilt durch die Streuung EINER Messung, WebPower rechnet die Korrelation schon ein, SPSS gibt das partielle η² aus. Mit demselben f ergibt sich in G*Power N = 36, in WebPower N = 148. Hier gilt die Weise von G*Power.', 'The same f means something different in G*Power, WebPower and SPSS: G*Power divides by the spread of ONE measurement, WebPower already includes the correlation, SPSS reports the partial η². With the same f, G*Power gives N = 36 and WebPower N = 148. Here the G*Power meaning applies.')}</span></div>
          {@render hilfsfenster(true)}
        </fieldset>
      {/if}
      {@render sicherheit(false)}
    {/if}
  </div>

  <div class="plan-rechts">
    {#if art === 'r2zuwachs'}
      {#if p.r2Fehler}
        <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p id="pf-fehler-r2">{fehlerText(p.r2Fehler)}</p></div>
      {:else if p.r2Ziel === 'n'}
        <section class="ergebnis" aria-labelledby="pf-erg-t"><h2 id="pf-erg-t">{L('Benötigte Stichprobe', 'Required sample size')}</h2>
          {#if p.r2Erg}
            <p class="gross" use:ergebnisAnsage><span class="zahl">N = {ganz(p.r2Erg.N)}</span> <span class="einheit">{L('Personen', 'people')}</span></p>
            <p class="zeile klein">{L(`Erreichte Power: ${apa(p.r2Erg.power, 3)} (verlangt: ${apa(p.power)}). Aufgerundet auf ganze Personen; f² = ${apa(p.f2, 3)}, ${p.q} von ${p.m} Prädiktoren getestet.`, `Achieved power: ${apa(p.r2Erg.power, 3)} (required: ${apa(p.power)}). Rounded up to whole people; f² = ${apa(p.f2, 3)}, ${p.q} of ${p.m} predictors tested.`)}</p>
            {#if ausfallGilt}<p class="zeile">{L(`Mit ${kz(p.ausfall * 100, 0)} % Ausfall: ${ganz(mitAusfall(p.r2Erg.N))} Personen.`, `With ${kz(p.ausfall * 100, 0)}% dropout: ${ganz(mitAusfall(p.r2Erg.N))} people.`)}</p>{/if}
          {:else}
            <p class="gross"><span class="einheit">{L('Mehr als 500 000 Personen', 'More than 500,000 people')}</span></p>
            <p class="zeile">{L('Bei diesem Effekt ist praktisch keine Studie groß genug.', 'With this effect size practically no study is large enough.')}</p>
          {/if}
          <p class="zeile klein">{hinweisFestesModell(fmt)}</p>
        </section>
      {:else}
        <section class="ergebnis" aria-labelledby="pf-erg-t"><h2 id="pf-erg-t">{L('Kleinster nachweisbarer Effekt', 'Smallest detectable effect')}</h2>
          {#if p.r2Sens}
            <p class="gross" use:ergebnisAnsage><span class="zahl">f² = {apa(p.r2SensAuf)}</span></p>
            <p class="zeile klein">{L(`Mit N = ${ganz(p.nGegeben)} Personen und Power ${apa(p.power)} findet der Test Effekte ab f² = ${apa(p.r2Sens, 4)} (aufgerundet ${apa(p.r2SensAuf)}).`, `With N = ${ganz(p.nGegeben)} people and power ${apa(p.power)} the test finds effects from f² = ${apa(p.r2Sens, 4)} (rounded up ${apa(p.r2SensAuf)}).`)}</p>
            <p class="zeile klein">{hinweisFestesModell(fmt)}</p>
          {:else}
            <p class="zeile">{L('Mit so wenigen Personen lässt sich dieser Test nicht rechnen oder selbst ein sehr großer Effekt reicht nicht.', 'With so few people this test cannot be calculated, or even a very large effect is not enough.')}</p>
          {/if}
        </section>
      {/if}

    {:else if art === 'partiell'}
      {#if p.partFehler}
        <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p id="pf-fehler-part">{fehlerText(p.partFehler)}</p></div>
      {:else if p.partErg}
        {@const e = p.partErg}
        <section class="ergebnis" aria-labelledby="pf-erg-t"><h2 id="pf-erg-t">{L('Benötigte Stichprobe', 'Required sample size')}</h2>
          {#if e.N !== null}
            <p class="gross" use:ergebnisAnsage><span class="zahl">N = {ganz(e.N)}</span> <span class="einheit">{L('Personen', 'people')}</span></p>
            {#if e.power !== null}<p class="zeile klein">{L(`Erreichte Power: ${apa(e.power, 3)} (verlangt: ${apa(p.power)}). Aufgerundet auf ganze Personen.`, `Achieved power: ${apa(e.power, 3)} (required: ${apa(p.power)}). Rounded up to whole people.`)}</p>{/if}
            {#if ausfallGilt}<p class="zeile">{L(`Mit ${kz(p.ausfall * 100, 0)} % Ausfall: ${ganz(mitAusfall(e.N))} Personen.`, `With ${kz(p.ausfall * 100, 0)}% dropout: ${ganz(mitAusfall(e.N))} people.`)}</p>{/if}
            <p class="zeile klein">{L(`Exakt gerechnet sind es ${e.exakt === null ? '-' : ganz(e.exakt)} Personen, nach der Weise von G*Power (fest, ohne die Kontrollvariablen) ${e.fest === null ? '-' : ganz(e.fest)}. Je mehr Variablen herausgerechnet werden, desto mehr Personen braucht es; die feste Rechnung ignoriert das.`, `Calculated exactly it is ${e.exakt === null ? '-' : ganz(e.exakt)} people, in the way of G*Power (fixed, ignoring the control variables) ${e.fest === null ? '-' : ganz(e.fest)}. The more variables are partialled out, the more people are needed; the fixed calculation ignores that.`)}</p>
          {:else}
            <p class="gross"><span class="einheit">{L('Mehr als 500 000 Personen', 'More than 500,000 people')}</span></p>
          {/if}
        </section>
      {/if}

    {:else}
      {#if p.anovaFehler}
        <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p id="pf-fehler-anova">{fehlerText(p.anovaFehler)}</p></div>
      {:else if p.anovaArt === 'faktoren' && p.faktorenErg}
        {@const r = p.faktorenErg.r}
        <section class="ergebnis" aria-labelledby="pf-erg-t"><h2 id="pf-erg-t">{L('Benötigte Stichprobe', 'Required sample size')}</h2>
          {#if r}
            <p class="gross" use:ergebnisAnsage><span class="zahl">N = {ganz(r.N)}</span> <span class="einheit">{L('Personen', 'people')}</span></p>
            <p class="zeile">{L(`Bei gleich großen Zellen: ${ganz(r.NGleich)} Personen (${ganz(r.jeZelle)} je Zelle, ${p.zellenFaktoren} Zellen), Power dann ${apa(r.powerGleich, 3)}.`, `With equal-sized cells: ${ganz(r.NGleich)} people (${ganz(r.jeZelle)} per cell, ${p.zellenFaktoren} cells), power then ${apa(r.powerGleich, 3)}.`)}</p>
            <p class="zeile klein">{L(`Erreichte Power mit der kleinsten Zahl: ${apa(r.power, 3)} (verlangt: ${apa(p.power)}). G*Power nennt die kleinste Zahl, die nicht ein Vielfaches der Zellen sein muss.`, `Achieved power with the smallest number: ${apa(r.power, 3)} (required: ${apa(p.power)}). G*Power gives the smallest number, which need not be a multiple of the cells.`)}</p>
            {#if ausfallGilt}<p class="zeile">{L(`Mit ${kz(p.ausfall * 100, 0)} % Ausfall: ${ganz(mitAusfall(r.NGleich))} Personen bei gleich großen Zellen.`, `With ${kz(p.ausfall * 100, 0)}% dropout: ${ganz(mitAusfall(r.NGleich))} people with equal-sized cells.`)}</p>{/if}
          {:else}
            <p class="gross"><span class="einheit">{L('Mehr als 500 000 Personen', 'More than 500,000 people')}</span></p>
          {/if}
        </section>
        {#if p.faktorenErg.mehrere}
          {@const mm = p.faktorenErg.mehrere}
          <section aria-labelledby="pf-tab-t"><h2 id="pf-tab-t">{L('Alle Effekte des Plans bei diesem f', 'All effects of the design at this f')}</h2>
            <table class="plan-tabelle"><thead><tr><th scope="col">{L('Effekt', 'Effect')}</th><th scope="col" class="zahl-sp">N</th></tr></thead>
              <tbody>{#each mm.je as x (x.name)}<tr class:an={x.name === mm.ungünstigster}><th scope="row">{x.name}</th><td class="zahl-sp">{ganz(x.N)}</td></tr>{/each}</tbody></table>
            <p class="zeile klein">{L(`Sollen mehrere Effekte gefunden werden, gilt der ungünstigste: ${mm.ungünstigster} mit N = ${ganz(mm.N)} (gleich große Zellen: ${ganz(mm.NGleich)}).`, `If several effects are to be found, the least favorable one counts: ${mm.ungünstigster} with N = ${ganz(mm.N)} (equal-sized cells: ${ganz(mm.NGleich)}).`)}</p>
          </section>
        {/if}
      {:else if p.anovaArt === 'kovariate' && p.kovErg}
        {@const r = p.kovErg}
        <section class="ergebnis" aria-labelledby="pf-erg-t"><h2 id="pf-erg-t">{L('Benötigte Stichprobe', 'Required sample size')}</h2>
          <p class="gross" use:ergebnisAnsage><span class="zahl">N = {ganz(r.N)}</span> <span class="einheit">{L('Personen', 'people')}</span></p>
          <p class="zeile">{L(`Ohne Kovariate wären es ${p.kovOhne ? ganz(p.kovOhne.N) : '-'} Personen. Das wirksame f ist ${apa(p.f / Math.sqrt(1 - p.r2kov), 3)}.`, `Without a covariate it would be ${p.kovOhne ? ganz(p.kovOhne.N) : '-'} people. The effective f is ${apa(p.f / Math.sqrt(1 - p.r2kov), 3)}.`)}</p>
          <p class="zeile klein">{L(`Erreichte Power: ${apa(r.power, 3)} (verlangt: ${apa(p.power)}). Gleich große Gruppen: ${ganz(r.NGleich)} Personen (${ganz(r.jeZelle)} je Gruppe). Die Formel ist durch eine Simulation belegt, nicht durch ein gedrucktes Beispiel.`, `Achieved power: ${apa(r.power, 3)} (required: ${apa(p.power)}). Equal-sized groups: ${ganz(r.NGleich)} people (${ganz(r.jeZelle)} per group). The formula is backed by a simulation, not by a printed example.`)}</p>
          {#if ausfallGilt}<p class="zeile">{L(`Mit ${kz(p.ausfall * 100, 0)} % Ausfall: ${ganz(mitAusfall(r.NGleich))} Personen bei gleich großen Gruppen.`, `With ${kz(p.ausfall * 100, 0)}% dropout: ${ganz(mitAusfall(r.NGleich))} people with equal-sized groups.`)}</p>{/if}
        </section>
      {:else if p.anovaArt === 'kontrast'}
        <section class="ergebnis" aria-labelledby="pf-erg-t"><h2 id="pf-erg-t">{L('Benötigte Stichprobe', 'Required sample size')}</h2>
          {#if p.kontrastErg}
            {@const r = p.kontrastErg}
            <p class="gross" use:ergebnisAnsage><span class="zahl">N = {ganz(r.N)}</span> <span class="einheit">{L('Personen', 'people')}</span></p>
            <p class="zeile">{L(`Gleich große Gruppen: ${ganz(r.NGleich)} Personen (${ganz(r.jeZelle)} je Gruppe), Power dann ${apa(r.powerGleich, 3)}.`, `Equal-sized groups: ${ganz(r.NGleich)} people (${ganz(r.jeZelle)} per group), power then ${apa(r.powerGleich, 3)}.`)}</p>
            <p class="zeile klein">{L(`f = ${apa(p.kontrastWert, 3)}, ein Zähler-Freiheitsgrad. Erreichte Power: ${apa(r.power, 3)} (verlangt: ${apa(p.power)}).`, `f = ${apa(p.kontrastWert, 3)}, one numerator degree of freedom. Achieved power: ${apa(r.power, 3)} (required: ${apa(p.power)}).`)}</p>
          {:else}
            <p class="zeile" id="pf-fehler-kontrast">{p.kontrastFehler ? fehlerText(p.kontrastFehler) : L('Mehr als 500 000 Personen.', 'More than 500,000 people.')}</p>
          {/if}
        </section>
      {:else if p.anovaArt === 'messw'}
        {#if p.messErg}
          {@const r = p.messErg}
          <section class="ergebnis" aria-labelledby="pf-erg-t"><h2 id="pf-erg-t">{L('Benötigte Stichprobe', 'Required sample size')}</h2>
            <p class="gross" use:ergebnisAnsage><span class="zahl">N = {ganz(r.N)}</span> <span class="einheit">{L('Personen', 'people')}</span></p>
            <p class="zeile klein">{L(`Effekt: ${typName(p.messTyp)}. Erreichte Power: ${apa(r.power, 3)} (verlangt: ${apa(p.power)}). Aufgerundet auf ganze Personen.`, `Effect: ${typName(p.messTyp)}. Achieved power: ${apa(r.power, 3)} (required: ${apa(p.power)}). Rounded up to whole people.`)}</p>
            {#if ausfallGilt}<p class="zeile">{L(`Mit ${kz(p.ausfall * 100, 0)} % Ausfall: ${ganz(mitAusfall(r.N))} Personen.`, `With ${kz(p.ausfall * 100, 0)}% dropout: ${ganz(mitAusfall(r.N))} people.`)}</p>{/if}
            {#if p.messHinweise.includes('epsilon-naeherung')}<p class="zeile klein">{L('Bei ε unter 1 ist die Rechnung eine Näherung, die eher etwas zu optimistisch ist (ein Greenhouse-Geisser-Test hat etwas weniger Power).', 'With ε below 1 the calculation is an approximation that tends to be somewhat optimistic (a Greenhouse-Geisser test has somewhat less power).')}</p>{/if}
            {#if p.messWebPower}<p class="zeile klein">{L(`Dasselbe f in der Weise von WebPower gelesen (f schließt die Korrelation schon ein): N = ${ganz(p.messWebPower.N)}. Das ist ein anderer Effekt, kein Fehler.`, `The same f read the WebPower way (f already includes the correlation): N = ${ganz(p.messWebPower.N)}. That is a different effect, not an error.`)}</p>{/if}
          </section>
          <section aria-labelledby="pf-tab-t"><h2 id="pf-tab-t">{L('Je nach Effekt', 'By effect')}</h2>
            <table class="plan-tabelle"><thead><tr><th scope="col">{L('Effekt', 'Effect')}</th><th scope="col" class="zahl-sp">N</th></tr></thead>
              <tbody>{#each p.messAlle as x (x.typ)}<tr class:an={x.typ === p.messTyp}><th scope="row">{typName(x.typ)}</th><td class="zahl-sp">{x.r ? ganz(x.r.N) : '-'}</td></tr>{/each}</tbody></table>
          </section>
        {:else}
          <section class="ergebnis"><h2>{L('Benötigte Stichprobe', 'Required sample size')}</h2>
            <p class="zeile" id="pf-fehler-mess">{p.messFehler ? fehlerText(p.messFehler) : L('Mehr als 500 000 Personen (oder dieser Effekt ist mit den Angaben nicht prüfbar).', 'More than 500,000 people (or this effect cannot be tested with these entries).')}</p></section>
        {/if}
      {/if}
    {/if}

    {#if satz}
      <section class="satz" aria-labelledby="pf-satz-t"><h2 id="pf-satz-t">{L('Satz für den Methodenteil', 'Sentence for the methods section')}</h2>
        <p class="satz-text" lang={s.einst.sprache}>{satz}</p>
        <button class="k" type="button" data-tipp={L('Legt den Satz für die Arbeit in die Zwischenablage', 'Puts the sentence for your paper on the clipboard')} onclick={() => kopieren(satz)}><Icon n={kopiert ? 'haken' : 'kopieren'} />{kopiert ? L('Kopiert', 'Copied') : L('Satz kopieren', 'Copy sentence')}</button>
      </section>
    {/if}

    <p class="banner ruhig fuss-hinweis"><Icon n="info" /><span>{L('Die Rechnung gilt vor der Erhebung und geht von unabhängigen Personen aus. Nach der Auswertung gehören Effektstärke und Konfidenzintervall in den Bericht, keine nachträgliche („beobachtete“) Power.', 'The calculation applies before data collection and assumes independent people. After the analysis, report the effect size and confidence interval, not a post hoc ("observed") power.')} <HilfeLink id="fallzahl-ergaenzen" text={L('Hilfe zu diesen Fällen', 'Help on these cases')} /></span></p>
  </div>
</div>

<style>
  .plan-raster { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--a6); align-items: start; }
  .plan-links, .plan-rechts { display: flex; flex-direction: column; gap: var(--a5); min-width: 0; }
  .plan-rechts { position: sticky; top: var(--a4); }
  fieldset.gruppe { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  fieldset.gruppe > legend { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin-bottom: var(--a3); padding: 0; }
  .wahl { display: grid; grid-template-columns: 1fr 1fr; gap: var(--a2); }
  .wahl label { display: flex; align-items: flex-start; gap: var(--a2); padding: var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); cursor: pointer; background: var(--blatt); min-height: 64px; }
  .wahl label.an { border-color: var(--akzent); background: var(--akzent-hell); box-shadow: inset 0 0 0 1px var(--akzent); }
  .wahl label:has(input:focus-visible) { box-shadow: var(--fokus-ring); }
  .wahl input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 2px 0 0; flex: none; }
  .wahl span { display: flex; flex-direction: column; gap: 2px; }
  .wahl b { font-weight: 600; line-height: 1.25; }
  .wahl small { color: var(--tinte-2); font-size: var(--gr-klein); }
  .eingabe input[type=text] { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a2) var(--a3); width: 100%; }
  .eingabe input[aria-invalid='true'] { border-color: var(--verlust); }
  .eingabe input:focus-visible { border-color: var(--fokus); box-shadow: var(--fokus-ring); }
  .paar { display: flex; flex-wrap: wrap; gap: var(--a4) var(--a5); }
  .hilfs { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a2) var(--a3); }
  .hilfs summary { cursor: pointer; font-weight: 600; min-height: var(--ziel); display: flex; align-items: center; }
  .hilfs-innen { display: flex; flex-direction: column; gap: var(--a3); padding: var(--a2) 0; }
  .ergebnis { background: var(--blatt-2); border-radius: var(--r); padding: var(--a4) var(--a5); border-inline-start: 4px solid var(--akzent); }
  .ergebnis h2, .satz h2, .plan-rechts section > h2 { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin-bottom: var(--a2); }
  .gross { margin: var(--a2) 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--a2) var(--a3); }
  .gross .zahl { font: 700 2.5rem/1.1 var(--schrift-ui); color: var(--akzent-tinte); font-variant-numeric: tabular-nums; }
  .gross .einheit { font-size: var(--gr-h2); color: var(--tinte-2); }
  .zeile { margin-top: var(--a1); }
  .zeile.klein { font-size: var(--gr-klein); color: var(--tinte-2); }
  .satz-text { background: var(--blatt-2); border-radius: var(--r-klein); padding: var(--a3) var(--a4); margin-bottom: var(--a3); max-width: var(--breite-text); user-select: all; }
  .plan-tabelle { border-collapse: collapse; width: 100%; max-width: 460px; }
  .plan-tabelle th, .plan-tabelle td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); font-weight: 400; }
  .plan-tabelle thead th { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 600; }
  .plan-tabelle tbody th { font-weight: 600; }
  .plan-tabelle .zahl-sp { text-align: right; font-variant-numeric: tabular-nums; }
  .plan-tabelle tr.an { background: var(--akzent-hell); }
  .fuss-hinweis { align-items: flex-start; }
  /* gefühlte Breite bis 860 px (lib/groesse.svelte.ts) */
  :global(:where(:root.eng-860)) .plan-raster { grid-template-columns: minmax(0, 1fr); gap: var(--a5); }
  :global(:where(:root.eng-860)) .plan-rechts { position: static; }
  :global(:where(:root.eng-860)) .wahl { grid-template-columns: 1fr; }
  :global(:where(:root.eng-860)) .gross .zahl { font-size: 2.1rem; }
  :global(:where(:root.eng-860)) .ergebnis { padding: var(--a4); }
</style>
