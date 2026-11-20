<script module lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { Test } from '../lib/power';
  /** Die Eingaben bleiben beim Wechsel zur Hilfe und zurück erhalten. */
  const z = $state({ ziel: 'n' as 'n' | 'effekt', test: 'unabhaengig' as Test, effektText: '0,50', rText: ',50', alpha: 0.05, power: 0.8, seiten: 2 as 1 | 2, verhaeltnisText: '1', gruppen: 3, df: 1, praediktoren: 3, nText: '100' });
</script>
<script lang="ts">
  import { s, d, L, istEn, waehle, melde } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { P, type Paar } from '../i18n/laufzeit';
  import { dezimal, ort, mitNull } from '../i18n/profil';
  import { zahlDe } from '../lib/format';
  import {
    EFFEKT_MAX, MARKEN, R_PAAR_MAX, R_PAAR_MIN, KLASSISCHE_TESTS, NEUE_TESTS, F2_TESTS, dzAus, effektAuf, effektText, einordnung, hatSeiten, kleinsteGesamt, kleinsterEffekt, kurveEffekt, kurveN, leseZahl, satzAPriori,
    satzSensitivitaet, standardPlan, stichprobe, type NeuerTest, type Plan
  } from '../lib/power';
  import SeitenKopf from '../bausteine/SeitenKopf.svelte';
  import Powerkurve from '../bausteine/Powerkurve.svelte';
  import Icon from '../bausteine/Icon.svelte';
  import PlanenNeu from '../bausteine/PlanenNeu.svelte';
  import PlanenF2 from '../bausteine/PlanenF2.svelte';
  import { planNeu } from '../lib/planneu.svelte';

  const NAMEN: Record<Test, { frage: Paar; fach: Paar }> = {
    unabhaengig: { frage: P('Zwei Gruppen vergleichen', 'Compare two groups'), fach: P('t-Test, unabhängige Stichproben · d', 'Independent-samples t test · d') },
    gepaart: { frage: P('Vorher und nachher vergleichen', 'Compare before and after'), fach: P('t-Test, gepaarte Stichproben · d und r', 'Paired-samples t test · d and r') },
    korrelation: { frage: P('Zusammenhang zweier Zahlen', 'Relationship between two numeric variables'), fach: P('Korrelation · r', 'Correlation · r') },
    anova: { frage: P('Drei oder mehr Gruppen vergleichen', 'Compare three or more groups'), fach: P('Einfaktorielle Varianzanalyse · f', 'One-way analysis of variance · f') },
    chi2: { frage: P('Häufigkeiten in Gruppen vergleichen', 'Compare frequencies across groups'), fach: P('Chi²-Test · w', 'Chi-square test · w') },
    regression: { frage: P('Etwas vorhersagen', 'Predict something'), fach: P('Multiple Regression · f²', 'Multiple regression · f²') }
  };
  /** Später S-D (M9): die drei neuen Fälle haben eigene Eingaben und stehen in bausteine/PlanenNeu.svelte. */
  const NAMEN_NEU: Record<NeuerTest, { frage: Paar; fach: Paar }> = {
    anteile: { frage: P('Anteile vergleichen', 'Compare proportions'), fach: P('Zwei Anteile oder ein Anteil · Fisher, χ², Cohens h', 'Two proportions or one · Fisher, chi-square, Cohen\'s h') },
    ueberleben: { frage: P('Überleben vergleichen', 'Compare survival'), fach: P('Log-Rank-Test · Ereignisse und Personen', 'Log-rank test · events and people') },
    auc: { frage: P('Wie gut trennt ein Test oder Score?', 'How well does a test or score separate?'), fach: P('AUC (ROC-Kurve) · Hanley-McNeil, Obuchowski', 'AUC (ROC curve) · Hanley-McNeil, Obuchowski') },
    /* Später S-F2: eine neue Karte; r2zuwachs und partiell sind die Antworten auf „Was soll geprüft werden?“ bei „Etwas vorhersagen“ (keine eigenen Karten) */
    anovaplus: { frage: P('Gruppen mit mehreren Faktoren oder Messwiederholung', 'Groups with several factors or repeated measures'), fach: P('Mehrfaktorielle Varianzanalyse, Kovariate, Kontrast, Messwiederholung · f', 'Factorial analysis of variance, covariate, contrast, repeated measures · f') },
    r2zuwachs: { frage: P('Ein Block aus mehreren Prädiktoren', 'A block of several predictors'), fach: P('R²-Zuwachs · f²', 'R² increase · f²') },
    partiell: { frage: P('Ein Prädiktor, die anderen festgehalten', 'One predictor, the others held constant'), fach: P('Partielle Korrelation · ρp', 'Partial correlation · ρp') }
  };
  const neu = $derived(planNeu.aktiv);
  const SYM = $derived<Record<Test, string>>({ unabhaengig: 'd', gepaart: 'd', korrelation: 'r', anova: 'f', chi2: 'w', regression: 'f²' });
  const fmt = $derived({ en: istEn(), punkt: dezimal() === '.' });   // Sprache: Schalter `en` für lib/power.ts (Fmt)
  const marke = (i: number) => (i === 0 ? L('klein', 'small') : i === 1 ? L('mittel', 'medium') : L('groß', 'large'));
  const kz = (v: number, st = 2) => zahlDe(v, st);
  const apa = (v: number, st = 2) => (mitNull() ? zahlDe(v, st) : zahlDe(v, st).replace(/^(−?)0(?=[.,])/, '$1'));   // ,80 statt 0,80
  /** Anzeige des Effekts: r geht nie über 1, also ohne führende Null (APA); im Eingabefeld bleibt die Zahl wie sie ist. */
  const kzE = (v: number, st = 2) => (istEn() && z.test === 'korrelation' ? apa(v, st) : kz(v, st));   // Sprache: Null vor dem Punkt weglassen - bisher nur Englisch (APA), Regel je Sprache offen
  const ganz = (v: number) => v.toLocaleString(ort());

  function waehleNeu(t: NeuerTest) { planNeu.art = t; planNeu.aktiv = true; }
  /** Später S-F2: „Was soll geprüft werden?“ bei „Etwas vorhersagen“: alle Prädiktoren zusammen (bisher), ein Prädiktor (partielle Korrelation) oder ein Block (R²-Zuwachs). */
  type Pruefen = 'gesamt' | 'einer' | 'block';
  let pruefenMerk = $state<Pruefen>('gesamt');
  const pruefen = $derived<Pruefen>(neu ? (planNeu.art === 'partiell' ? 'einer' : planNeu.art === 'r2zuwachs' ? 'block' : 'gesamt') : 'gesamt');
  const regAn = $derived(neu ? (planNeu.art === 'partiell' || planNeu.art === 'r2zuwachs') : z.test === 'regression');
  function waehlePruefen(w: Pruefen) {
    pruefenMerk = w;
    if (w === 'gesamt') { waehleTest('regression'); return; }
    planNeu.art = w === 'einer' ? 'partiell' : 'r2zuwachs'; planNeu.aktiv = true;
  }
  function waehleTest(t: Test) {
    planNeu.aktiv = false;
    if (z.test === t) return;
    z.test = t; z.effektText = kz(MARKEN[t].marken[1]);
    if (t === 'gepaart') z.rText = apa(0.5);   // ,50 bzw. .50 je nach Sprache
  }
  const setzeEffekt = (v: number) => { z.effektText = kz(v, Math.abs(Math.round(v * 100) / 100 - v) < 1e-9 ? 2 : 3); };

  /* ---------- Eingaben prüfen ---------- */
  const effekt = $derived(leseZahl(z.effektText));
  const verhaeltnis = $derived(leseZahl(z.verhaeltnisText));
  /** F4: erwartete Korrelation vorher-nachher (nur gepaart); ,5 heißt ohne führende Null 0,5 - leseZahl liest beides. */
  const rPaar = $derived(leseZahl(z.rText));
  const nGegeben = $derived((() => { const v = leseZahl(z.nText); return Number.isInteger(v) ? v : NaN; })());
  const plan = $derived<Plan>({ ...standardPlan(z.test), effekt, rPaar: z.test === 'gepaart' ? rPaar : 0.5, alpha: z.alpha, seiten: hatSeiten(z.test) ? z.seiten : 2, verhaeltnis: z.test === 'unabhaengig' ? verhaeltnis : 1, gruppen: z.gruppen, df: z.df, praediktoren: z.praediktoren });
  const effektFehler = $derived(z.ziel === 'effekt' ? '' : !(effekt > 0) ? L('Bitte eine Zahl größer als 0 eingeben.', 'Please enter a number greater than 0.') : effekt > EFFEKT_MAX[z.test] ? L(`Der Effekt darf höchstens ${kz(EFFEKT_MAX[z.test], EFFEKT_MAX[z.test] < 1 ? 2 : 0)} sein.`, `The effect can be at most ${kz(EFFEKT_MAX[z.test], EFFEKT_MAX[z.test] < 1 ? 2 : 0)}.`) : '');
  const verhFehler = $derived(z.test !== 'unabhaengig' ? '' : !(verhaeltnis >= 0.1 && verhaeltnis <= 10) ? L('Das Verhältnis liegt zwischen 0,1 und 10.', 'The ratio is between 0.1 and 10.') : '');
  const nFehler = $derived(z.ziel !== 'effekt' ? '' : !(nGegeben >= kleinsteGesamt(plan)) ? L(`Bitte eine ganze Zahl ab ${kleinsteGesamt(plan)} eingeben.`, `Please enter a whole number of ${kleinsteGesamt(plan)} or more.`) : nGegeben > 1e6 ? L('Bitte höchstens 1 000 000 eingeben.', 'Please enter at most 1,000,000.') : '');
  const rFehler = $derived(z.test !== 'gepaart' ? '' : !(rPaar >= R_PAAR_MIN && rPaar <= R_PAAR_MAX) ? L(`Die Korrelation liegt zwischen ${kz(R_PAAR_MIN, 1)} und ${kz(R_PAAR_MAX)}.`, `The correlation is between ${kz(R_PAAR_MIN, 1)} and ${kz(R_PAAR_MAX)}.`) : '');
  const gueltig = $derived(!effektFehler && !verhFehler && !nFehler && !rFehler);
  /** Das d_z, mit dem der gepaarte Test rechnet (A priori aus dem eingegebenen d, Sensitivität aus dem gefundenen). */
  const dzText = (d: number) => kz(dzAus(d, rPaar));

  /* ---------- Ergebnis ---------- */
  const apri = $derived(z.ziel === 'n' && gueltig ? stichprobe(plan, z.power) : undefined);
  const apriSatz = $derived(apri ? satzAPriori(plan, z.power, apri, fmt) : '');
  const tabelle = $derived(z.ziel === 'n' && gueltig ? [0.8, 0.9, 0.95].map(p => ({ p, e: stichprobe(plan, p) })) : []);
  const kurve = $derived(apri ? kurveN(plan, apri) : []);

  const sens = $derived(z.ziel === 'effekt' && gueltig ? kleinsterEffekt(plan, nGegeben, z.power) : undefined);
  const sensAuf = $derived(sens ? effektAuf(sens) : 0);
  const sensSatz = $derived(sens ? satzSensitivitaet(plan, z.power, nGegeben, sensAuf, fmt) : '');
  const sensTabelle = $derived(z.ziel === 'effekt' && gueltig ? [0.8, 0.9, 0.95].map(p => ({ p, e: kleinsterEffekt(plan, nGegeben, p) })) : []);
  const sensKurve = $derived(sens ? kurveEffekt(plan, nGegeben, Math.min(EFFEKT_MAX[z.test], Math.max(sens * 1.8, MARKEN[z.test].marken[0] * 1.2))) : []);

  const gesamtText = $derived(apri ? `N = ${ganz(apri.gesamt)}` : '');
  const einsatz = $derived(L('Personen', 'people'));
  /** Ergebnis ansagen: erst 0,7 s nach der letzten Änderung (Regler loslassen, Eingabe-Ende), nie bei jedem Schritt; die Ergebniszeile selbst ist keine Live-Region. */
  const ansageSatz = $derived(!gueltig ? '' : z.ziel === 'n'
    ? (apri ? `${gesamtText} ${einsatz}` : L('Mehr als 500 000 Personen', 'More than 500,000 people'))
    : (sens ? `${SYM[z.test]} = ${kzE(sensAuf, sensAuf === Math.round(sensAuf * 100) / 100 ? 2 : 3)}` : L('Kein Effekt im zulässigen Bereich', 'No effect within the allowed range')));
  let ansageErst = true;
  $effect(() => {
    const satz = ansageSatz;
    if (ansageErst) { ansageErst = false; return; }
    if (!satz) return;
    const tm = setTimeout(() => sage(satz), 700);
    return () => clearTimeout(tm);
  });
  const je = $derived.by(() => {
    if (!apri) return '';
    if (z.test === 'unabhaengig') return apri.je[0] === apri.je[1] ? L(`${ganz(apri.je[0]!)} je Gruppe`, `${ganz(apri.je[0]!)} per group`) : L(`${ganz(apri.je[0]!)} in Gruppe 1 und ${ganz(apri.je[1]!)} in Gruppe 2`, `${ganz(apri.je[0]!)} in group 1 and ${ganz(apri.je[1]!)} in group 2`);
    if (z.test === 'anova') return L(`${ganz(apri.m)} je Gruppe (${z.gruppen} Gruppen)`, `${ganz(apri.m)} per group (${z.gruppen} groups)`);
    return '';
  });
  const einordnungText = (e: number) => [
    L(`Das ist weniger als ein kleiner Effekt (${SYM[z.test]} < ${kzE(MARKEN[z.test].marken[0])}).`, `That is less than a small effect (${SYM[z.test]} < ${kzE(MARKEN[z.test].marken[0])}).`),
    L('Das liegt zwischen einem kleinen und einem mittleren Effekt.', 'That lies between a small and a medium effect.'), L('Das liegt zwischen einem mittleren und einem großen Effekt.', 'That lies between a medium and a large effect.'), L('Das ist ein großer Effekt oder mehr.', 'That is a large effect or more.')
  ][einordnung(z.test, e)]!;
  const kurveBeschr = $derived(z.ziel === 'n'
    ? L(`Die Power steigt mit der Gesamtzahl der Personen. Die gestrichelte Linie liegt bei ${apa(z.power)}; sie wird bei N = ${apri ? ganz(apri.gesamt) : ''} erreicht.`, `Power rises with the total number of people. The dashed line is at ${apa(z.power)}; it is reached at N = ${apri ? ganz(apri.gesamt) : ''}.`)
    : L(`Die Power steigt mit der Größe des Effekts (${SYM[z.test]}). Die gestrichelte Linie liegt bei ${apa(z.power)}; sie wird bei ${SYM[z.test]} = ${kzE(sensAuf)} erreicht.`, `Power rises with the size of the effect (${SYM[z.test]}). The dashed line is at ${apa(z.power)}; it is reached at ${SYM[z.test]} = ${kzE(sensAuf)}.`));

  /* ---------- Kopieren ---------- */
  let kopiert = $state(false);
  async function kopieren(text: string) {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch { /* nichts */ } t.remove(); }
    kopiert = true; melde(L('Satz kopiert.', 'Sentence copied.'));
    setTimeout(() => (kopiert = false), 2500);
  }
  const mw = $derived(MARKEN[z.test]);
  const sliderWert = $derived(Number.isFinite(effekt) ? Math.min(mw.max, Math.max(mw.min, effekt)) : mw.marken[1]);
</script>

{#snippet testWahl()}
  <div class="wahl" role="radiogroup" aria-label={L('Art der Auswertung', 'Type of analysis')}>
    {#each KLASSISCHE_TESTS as t}
      {@const an = t === 'regression' ? regAn : !neu && z.test === t}
      <label class:an><input type="radio" name="pl-test" value={t} checked={an} onchange={() => (t === 'regression' ? waehlePruefen(pruefenMerk) : waehleTest(t))}><span><b>{waehle(NAMEN[t].frage)}</b><small>{waehle(NAMEN[t].fach)}</small></span></label>
    {/each}
    {#each NEUE_TESTS as t}
      <label class:an={neu && planNeu.art === t}><input type="radio" name="pl-test" value={t} checked={neu && planNeu.art === t} onchange={() => waehleNeu(t)}><span><b>{waehle(NAMEN_NEU[t].frage)}</b><small>{waehle(NAMEN_NEU[t].fach)}</small></span></label>
    {/each}
  </div>
  {#if regAn}
    <div class="eingabe pruefen"><span class="lbl" id="pl-pruefen-l">{L('Was soll geprüft werden?', 'What should be tested?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="pl-pruefen-l">
        <label><input id="pl-pruefen-gesamt" type="radio" name="pl-pruefen" value="gesamt" checked={pruefen === 'gesamt'} onchange={() => waehlePruefen('gesamt')}>{L('Alle Prädiktoren zusammen', 'All predictors together')}</label>
        <label data-begriff="partialkorrelation"><input id="pl-pruefen-einer" type="radio" name="pl-pruefen" value="einer" checked={pruefen === 'einer'} onchange={() => waehlePruefen('einer')}>{L('Ein Prädiktor, die anderen festgehalten (partielle Korrelation)', 'One predictor, the others held constant (partial correlation)')}</label>
        <label data-begriff="delta-r2"><input id="pl-pruefen-block" type="radio" name="pl-pruefen" value="block" checked={pruefen === 'block'} onchange={() => waehlePruefen('block')}>{L('Ein Block aus mehreren Prädiktoren (R²-Zuwachs)', 'A block of several predictors (R² increase)')}</label>
      </div>
      <span class="hilfe">{L('„Alle zusammen“ prüft, ob das ganze Modell etwas erklärt. Die beiden anderen fragen, was ein Prädiktor oder ein Block zusätzlich zu den übrigen bringt.', '"All together" tests whether the whole model explains anything. The other two ask what one predictor or a block adds beyond the others.')}</span></div>
  {/if}
{/snippet}

<div class="tisch ohne-rand"><section class="blatt rund planen" aria-labelledby="pl-t">
  <SeitenKopf titelId="pl-t" titel={L('Studie planen', 'Plan a study')} hilfe={{ id: 'power', text: L('Hilfe zur Poweranalyse', 'Help on power analysis') }} zurueck >
    {#snippet untertitel()}<p>{L('Wie viele Personen braucht eine Studie, damit ein erwarteter Effekt mit ausreichender Sicherheit gefunden wird? Die Rechnung gehört vor die Datenerhebung (a priori).', 'How many people does a study need so that an expected effect is found with sufficient certainty? The calculation belongs before data collection (a priori).')}</p>{/snippet}
  </SeitenKopf>

  {#if neu && F2_TESTS.includes(planNeu.art)}
    <PlanenF2 {testWahl} />
  {:else if neu}
    <PlanenNeu {testWahl} />
  {:else}
  <div class="segment ziel" role="radiogroup" aria-label={L('Was soll berechnet werden?', 'What should be calculated?')}>
    <label data-begriff="fallzahlplanung"><input type="radio" name="pl-ziel" value="n" bind:group={z.ziel}>{L('Wie viele Personen brauche ich?', 'How many people do I need?')}</label>
    <label><input type="radio" name="pl-ziel" value="effekt" bind:group={z.ziel}>{L('Ich habe n Personen - welchen Effekt finde ich?', 'I have n people - which effect can I find?')}</label>
  </div>

  <div class="plan-raster">
    <div class="plan-links">
      <fieldset class="gruppe"><legend>{L('1  Was soll verglichen werden?', '1  What is being compared?')}</legend>
        {@render testWahl()}
      </fieldset>

      <fieldset class="gruppe"><legend>{z.ziel === 'n' ? L('2  Wie groß ist der erwartete Effekt?', '2  How large is the expected effect?') : L('2  Wie viele Personen sind es?', '2  How many people are there?')}</legend>
        {#if z.ziel === 'n'}
          <div class="eingabe"><label for="pl-effekt">{L('Effekt', 'Effect')} ({SYM[z.test]})</label>
            <div class="effekt-zeile">
              <input id="pl-effekt" type="text" inputmode="decimal" autocomplete="off" bind:value={z.effektText} aria-invalid={effektFehler ? 'true' : undefined} aria-describedby="pl-effekt-h" style="max-width:8ch">
              <div class="marken" role="group" aria-label={L('Richtwerte nach Cohen', "Cohen's benchmarks")}>
                {#each mw.marken as m, i}<button class="k klein" type="button" data-tipp={L('Faustregel nach Cohen für die Größe des Effekts. Klicken setzt den Wert', 'Cohen rule of thumb for the size of the effect. Click to set the value')} aria-pressed={Math.abs(effekt - m) < 1e-9} onclick={() => setzeEffekt(m)}>{marke(i)} {kz(m)}</button>{/each}
              </div>
            </div>
            <input class="regler" type="range" min={mw.min} max={mw.max} step={mw.schritt} value={sliderWert} oninput={(e) => setzeEffekt(Number((e.currentTarget as HTMLInputElement).value))} aria-label={L(`Effekt ${SYM[z.test]} mit dem Regler wählen`, `Choose effect ${SYM[z.test]} with the slider`)} aria-valuetext={L(`Effekt ${SYM[z.test]} ${kz(sliderWert, 2)}`, `Effect ${SYM[z.test]} ${kz(sliderWert, 2)}`)}>
            <span class="hilfe" id="pl-effekt-h">{effektFehler || (z.test === 'gepaart' ? L('d wie in Studien berichtet: Veränderung geteilt durch die Standardabweichung der Messungen (nicht durch die der Veränderungen). Die Korrelation vorher-nachher kommt unten dazu. ', 'd as reported in studies: change divided by the standard deviation of the measurements (not of the changes). The before-after correlation is added below. ') : '') + L('Am besten aus ähnlichen Studien oder einer Pilotstudie; sonst der kleinste Effekt, der inhaltlich noch zählt. Die Richtwerte nach Cohen sind nur eine grobe Faustregel.', 'Preferably from similar studies or a pilot study; otherwise the smallest effect that still matters in substance. Cohen\'s benchmarks are only a rough rule of thumb.')}</span>
          </div>
        {:else}
          <div class="eingabe"><label for="pl-n">{L('Personen insgesamt', 'People in total')}</label>
            <input id="pl-n" type="text" inputmode="numeric" autocomplete="off" bind:value={z.nText} aria-invalid={nFehler ? 'true' : undefined} aria-describedby="pl-n-h" style="max-width:10ch">
            <span class="hilfe" id="pl-n-h">{nFehler || (z.test === 'unabhaengig' ? L('Beide Gruppen zusammen (nach dem Verhältnis unten verteilt).', 'Both groups together (split by the ratio below).') : z.test === 'anova' ? L('Alle Gruppen zusammen; sie werden gleich groß angenommen.', 'All groups together; they are assumed to be equal in size.') : L('Die Zahl der Personen, mit denen die Auswertung rechnen kann (nach Ausfällen).', 'The number of people the analysis can use (after dropout).'))}</span>
          </div>
        {/if}
      </fieldset>

      <fieldset class="gruppe"><legend>{L('3  Wie sicher soll das Ergebnis sein?', '3  How certain should the result be?')}</legend>
        <div class="paar">
          <div class="eingabe"><span class="lbl" id="pl-alpha-l">{L('Irrtumswahrscheinlichkeit α', 'Significance level α')}</span>
            <div class="segment" role="radiogroup" aria-labelledby="pl-alpha-l" data-tipp={L('Wie oft man einen Unterschied behauptet, obwohl es keinen gibt. Üblich: ,05', 'How often you claim a difference although there is none. Usual: .05')}>{#each [0.1, 0.05, 0.01, 0.001] as a}<label data-begriff="signifikanzniveau"><input type="radio" name="pl-alpha" value={a} bind:group={z.alpha}>{apa(a, a < 0.01 ? 3 : 2)}</label>{/each}</div></div>
          <div class="eingabe"><span class="lbl" id="pl-power-l">{L('Power (1 − β)', 'Power (1 − β)')}</span>
            <div class="segment" role="radiogroup" aria-labelledby="pl-power-l" data-tipp={L('Wie sicher ein wirklich vorhandener Effekt gefunden wird. Üblich: ,80', 'How reliably a truly existing effect is found. Usual: .80')}>{#each [0.8, 0.9, 0.95] as p}<label data-begriff="power"><input type="radio" name="pl-power" value={p} bind:group={z.power}>{apa(p)}</label>{/each}</div></div>
        </div>
        {#if hatSeiten(z.test)}
          <div class="eingabe"><span class="lbl" id="pl-seiten-l">{L('Hypothese', 'Hypothesis')}</span>
            <div class="segment" role="radiogroup" aria-labelledby="pl-seiten-l" data-tipp={L('Zweiseitig: Unterschied in beide Richtungen möglich. Einseitig: nur eine Richtung, vorher begründet', 'Two-tailed: difference possible in both directions. One-tailed: one direction only, justified beforehand')}><label data-begriff="einseitig-zweiseitig"><input type="radio" name="pl-seiten" value={2} bind:group={z.seiten}>{L('zweiseitig (ungerichtet)', 'two-tailed (undirected)')}</label><label data-begriff="einseitig-zweiseitig"><input type="radio" name="pl-seiten" value={1} bind:group={z.seiten}>{L('einseitig (gerichtet)', 'one-tailed (directed)')}</label></div></div>
        {/if}
        {#if z.test === 'gepaart'}
          <div class="eingabe"><label for="pl-r">{L('Erwartete Korrelation vorher-nachher (r)', 'Expected before-after correlation (r)')}</label>
            <input id="pl-r" type="text" inputmode="decimal" autocomplete="off" bind:value={z.rText} aria-invalid={rFehler ? 'true' : undefined} aria-describedby="pl-r-h" style="max-width:8ch">
            <span class="hilfe" id="pl-r-h">{rFehler || (z.ziel === 'n' && !effektFehler ? L(`Gerechnet wird mit dz = d / √(2 · (1 − r)) = ${dzText(effekt)}. Je stärker vorher und nachher zusammenhängen, desto weniger Personen braucht es. Ohne Vorwissen: ,50 (dann ist dz = d).`, `The calculation uses dz = d / √(2 · (1 − r)) = ${dzText(effekt)}. The more strongly before and after are related, the fewer people are needed. Without prior knowledge: .50 (then dz = d).`) : L('Gerechnet wird mit dz = d / √(2 · (1 − r)). Je stärker vorher und nachher zusammenhängen, desto weniger Personen braucht es. Ohne Vorwissen: ,50 (dann ist dz = d).', 'The calculation uses dz = d / √(2 · (1 − r)). The more strongly before and after are related, the fewer people are needed. Without prior knowledge: .50 (then dz = d).'))}</span></div>
        {/if}
        {#if z.test === 'unabhaengig'}
          <div class="eingabe"><label for="pl-verh">{L('Gruppengröße: Gruppe 2 im Verhältnis zu Gruppe 1', 'Group size: group 2 relative to group 1')}</label>
            <input id="pl-verh" type="text" inputmode="decimal" autocomplete="off" bind:value={z.verhaeltnisText} aria-invalid={verhFehler ? 'true' : undefined} aria-describedby="pl-verh-h" style="max-width:8ch">
            <span class="hilfe" id="pl-verh-h">{verhFehler || L('1 = gleich große Gruppen. 2 = Gruppe 2 doppelt so groß wie Gruppe 1.', '1 = equal groups. 2 = group 2 twice as large as group 1.')}</span></div>
        {/if}
        {#if z.test === 'anova'}
          <div class="eingabe"><label for="pl-k">{L('Anzahl der Gruppen (k)', 'Number of groups (k)')}</label>
            <input id="pl-k" type="number" min="2" max="20" step="1" bind:value={z.gruppen} onchange={() => { z.gruppen = Math.min(20, Math.max(2, Math.round(z.gruppen || 3))); }} style="max-width:8ch"></div>
        {/if}
        {#if z.test === 'chi2'}
          <div class="eingabe"><label for="pl-df">{L('Freiheitsgrade (df)', 'Degrees of freedom (df)')}</label>
            <input id="pl-df" type="number" min="1" max="50" step="1" bind:value={z.df} onchange={() => { z.df = Math.min(50, Math.max(1, Math.round(z.df || 1))); }} aria-describedby="pl-df-h" style="max-width:8ch">
            <span class="hilfe" id="pl-df-h">{L('(Zeilen − 1) · (Spalten − 1). Eine 2×2-Tabelle hat df = 1, eine 2×3-Tabelle df = 2.', '(rows − 1) · (columns − 1). A 2×2 table has df = 1, a 2×3 table df = 2.')}</span></div>
        {/if}
        {#if z.test === 'regression'}
          <div class="eingabe"><label for="pl-p">{L('Anzahl der Prädiktoren', 'Number of predictors')}</label>
            <input id="pl-p" type="number" min="1" max="50" step="1" bind:value={z.praediktoren} onchange={() => { z.praediktoren = Math.min(50, Math.max(1, Math.round(z.praediktoren || 1))); }} aria-describedby="pl-p-h" style="max-width:8ch">
            <span class="hilfe" id="pl-p-h">{L('Alle Variablen, mit denen vorhergesagt wird (R² ≠ 0, Gesamtmodell).', 'All variables used for prediction (R² ≠ 0, whole model).')}</span></div>
        {/if}
      </fieldset>
    </div>

    <div class="plan-rechts">
      {#if !gueltig}
        <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p>{effektFehler || verhFehler || nFehler || rFehler}</p></div>
      {:else if z.ziel === 'n'}
        <section class="ergebnis" aria-labelledby="pl-erg-t"><h2 id="pl-erg-t">{L('Benötigte Stichprobe', 'Required sample size')}</h2>
          {#if apri}
            <p class="gross"><span class="zahl">{gesamtText}</span> <span class="einheit">{einsatz}</span></p>
            {#if je}<p class="zeile">{je}</p>{/if}
            <p class="zeile klein">{L(`Erreichte Power: ${apa(apri.power, 3)} (verlangt: ${apa(z.power)}). Aufgerundet auf ganze Personen; Ausfälle sind nicht eingerechnet.`, `Achieved power: ${apa(apri.power, 3)} (required: ${apa(z.power)}). Rounded up to whole people; dropout is not included.`)}</p>
          {:else}
            <p class="gross"><span class="einheit">{L('Mehr als 500 000 Personen', 'More than 500,000 people')}</span></p>
            <p class="zeile">{L('Bei diesem Effekt ist praktisch keine Studie groß genug. Ein größerer Effekt oder eine geringere Power macht die Rechnung möglich.', 'With this effect size practically no study is large enough. A larger effect or a lower power makes the calculation feasible.')}</p>
          {/if}
        </section>

        {#if apri}
          <section class="satz" aria-labelledby="pl-satz-t"><h2 id="pl-satz-t">{L('Satz für den Methodenteil', 'Sentence for the methods section')}</h2>
            <p class="satz-text" lang={s.einst.sprache}>{apriSatz}</p>
            <button class="k" type="button" data-tipp={L('Legt den Satz für die Arbeit in die Zwischenablage', 'Puts the sentence for your paper on the clipboard')} onclick={() => kopieren(apriSatz)}><Icon n={kopiert ? 'haken' : 'kopieren'} />{kopiert ? L('Kopiert', 'Copied') : L('Satz kopieren', 'Copy sentence')}</button>
          </section>

          <section class="kurve" aria-labelledby="pl-kurve-t"><h2 id="pl-kurve-t">{L('Power in Abhängigkeit von N', 'Power as a function of N')}</h2>
            <Powerkurve punkte={kurve} xText={L('Personen insgesamt (N)', 'Total people (N)')} zielY={z.power} markX={apri.gesamt} markY={apri.power} xFormat={(v) => ganz(v)} beschreibung={kurveBeschr} /></section>
        {/if}

        <section aria-labelledby="pl-tab-t"><h2 id="pl-tab-t">{L('Je nach gewünschter Power', 'By required power')}</h2>
          <table class="plan-tabelle"><thead><tr><th scope="col">{L('Power', 'Power')}</th><th scope="col" class="zahl-sp">N</th>{#if z.test === 'unabhaengig' || z.test === 'anova'}<th scope="col" class="zahl-sp">{L('je Gruppe', 'per group')}</th>{/if}</tr></thead>
            <tbody>{#each tabelle as r}<tr class:an={r.p === z.power}><th scope="row">{apa(r.p)}</th><td class="zahl-sp">{r.e ? ganz(r.e.gesamt) : '-'}</td>{#if z.test === 'unabhaengig'}<td class="zahl-sp">{r.e ? (r.e.je[0] === r.e.je[1] ? ganz(r.e.je[0]!) : `${ganz(r.e.je[0]!)} / ${ganz(r.e.je[1]!)}`) : '-'}</td>{:else if z.test === 'anova'}<td class="zahl-sp">{r.e ? ganz(r.e.m) : '-'}</td>{/if}</tr>{/each}</tbody></table>
        </section>
      {:else}
        <section class="ergebnis" aria-labelledby="pl-erg-t"><h2 id="pl-erg-t">{L('Kleinster nachweisbarer Effekt', 'Smallest detectable effect')}</h2>
          {#if sens}
            <p class="gross"><span class="zahl">{SYM[z.test]} = {kzE(sensAuf, sensAuf === Math.round(sensAuf * 100) / 100 ? 2 : 3)}</span>{#if z.test === 'gepaart'} <span class="einheit">(dz = {dzText(sensAuf)})</span>{/if}</p>
            <p class="zeile">{L(`Mit N = ${ganz(nGegeben)} lassen sich Effekte ab dieser Größe mit einer Power von ${apa(z.power)} finden. ${einordnungText(sensAuf)}`, `With N = ${ganz(nGegeben)}, effects of this size or larger can be found with a power of ${apa(z.power)}. ${einordnungText(sensAuf)}`)}</p>
            <p class="zeile klein">{L('Kleinere Effekte bleiben mit dieser Stichprobe wahrscheinlich unentdeckt. Auf zwei Stellen aufgerundet.', 'Smaller effects will probably go undetected with this sample. Rounded up to two decimals.')}</p>
          {:else}
            <p class="gross"><span class="einheit">{L('Kein Effekt im zulässigen Bereich', 'No effect within the allowed range')}</span></p>
            <p class="zeile">{L('Mit so wenigen Personen reicht selbst der größte zulässige Effekt nicht für die verlangte Power.', 'With so few people even the largest allowed effect does not reach the required power.')}</p>
          {/if}
        </section>

        {#if sens}
          <section class="satz" aria-labelledby="pl-satz-t"><h2 id="pl-satz-t">{L('Satz für den Methodenteil', 'Sentence for the methods section')}</h2>
            <p class="satz-text" lang={s.einst.sprache}>{sensSatz}</p>
            <button class="k" type="button" data-tipp={L('Legt den Satz für die Arbeit in die Zwischenablage', 'Puts the sentence for your paper on the clipboard')} onclick={() => kopieren(sensSatz)}><Icon n={kopiert ? 'haken' : 'kopieren'} />{kopiert ? L('Kopiert', 'Copied') : L('Satz kopieren', 'Copy sentence')}</button>
          </section>
          <section class="kurve" aria-labelledby="pl-kurve-t"><h2 id="pl-kurve-t">{L(`Power in Abhängigkeit von ${SYM[z.test]}`, `Power as a function of ${SYM[z.test]}`)}</h2>
            <Powerkurve punkte={sensKurve} xText={L(`Effekt (${SYM[z.test]})`, `Effect (${SYM[z.test]})`)} zielY={z.power} markX={sens} markY={z.power} xFormat={(v) => kzE(v, 2)} beschreibung={kurveBeschr} /></section>
        {/if}

        <section aria-labelledby="pl-tab-t"><h2 id="pl-tab-t">{L('Je nach gewünschter Power', 'By required power')}</h2>
          <table class="plan-tabelle"><thead><tr><th scope="col">{L('Power', 'Power')}</th><th scope="col" class="zahl-sp">{L(`Kleinster Effekt (${SYM[z.test]})`, `Smallest effect (${SYM[z.test]})`)}</th></tr></thead>
            <tbody>{#each sensTabelle as r}<tr class:an={r.p === z.power}><th scope="row">{apa(r.p)}</th><td class="zahl-sp">{r.e ? kzE(effektAuf(r.e)) : '-'}</td></tr>{/each}</tbody></table>
        </section>
      {/if}

      <p class="banner ruhig fuss-hinweis"><Icon n="info" /><span>{L('Die Rechnung gilt vor der Erhebung. Nach der Auswertung gehören Effektstärke und Konfidenzintervall in den Bericht, keine nachträgliche („beobachtete“) Power.', 'The calculation applies before data collection. After the analysis, report the effect size and confidence interval, not a post hoc ("observed") power.')} <a href="#hilfe/power">{L('Mehr dazu', 'More')}</a></span></p>
    </div>
  </div>
  {/if}
</section></div>

<style>
  .planen { padding-bottom: var(--a6); }
  .segment.ziel { margin: var(--a2) 0 var(--a5); }
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
  .effekt-zeile { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a3); align-items: center; }
  .eingabe input[type=text], .eingabe input[type=number] { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a2) var(--a3); width: 100%; }
  .eingabe input[aria-invalid='true'] { border-color: var(--verlust); }
  .eingabe input:focus-visible { border-color: var(--fokus); box-shadow: var(--fokus-ring); }
  .marken { display: flex; flex-wrap: wrap; gap: var(--a2); }
  .marken .k[aria-pressed='true'] { background: var(--akzent-hell); border-color: var(--akzent); color: var(--akzent-tinte); font-weight: 600; }
  .regler { width: 100%; accent-color: var(--akzent); margin: var(--a2) 0 0; min-height: 28px; }
  .paar { display: flex; flex-wrap: wrap; gap: var(--a4) var(--a5); }
  .ergebnis { background: var(--blatt-2); border-radius: var(--r); padding: var(--a4) var(--a5); border-inline-start: 4px solid var(--akzent); }
  .ergebnis h2, .satz h2, .kurve h2, .plan-rechts section > h2 { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin-bottom: var(--a2); }
  .gross { margin: var(--a2) 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--a2) var(--a3); }
  .gross .zahl { font: 700 2.5rem/1.1 var(--schrift-ui); color: var(--akzent-tinte); font-variant-numeric: tabular-nums; }
  .gross .einheit { font-size: var(--gr-h2); color: var(--tinte-2); }
  .zeile { margin-top: var(--a1); }
  .zeile.klein { font-size: var(--gr-klein); color: var(--tinte-2); }
  .satz-text { background: var(--blatt-2); border-radius: var(--r-klein); padding: var(--a3) var(--a4); margin-bottom: var(--a3); max-width: var(--breite-text); user-select: all; }
  .plan-tabelle { border-collapse: collapse; width: 100%; max-width: 420px; }
  .plan-tabelle th, .plan-tabelle td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); font-weight: 400; }
  .plan-tabelle thead th { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 600; }
  .plan-tabelle tbody th { font-weight: 600; }
  .plan-tabelle .zahl-sp { text-align: right; font-variant-numeric: tabular-nums; }
  .plan-tabelle tr.an { background: var(--akzent-hell); }
  .fuss-hinweis { align-items: flex-start; }
  .fuss-hinweis a { color: var(--akzent-tinte); }
  /* gefühlte Breite bis 860 px (lib/groesse.svelte.ts) */
  :global(:where(:root.eng-860)) .plan-raster { grid-template-columns: minmax(0, 1fr); gap: var(--a5); }
  :global(:where(:root.eng-860)) .plan-rechts { position: static; }
  :global(:where(:root.eng-860)) .wahl { grid-template-columns: 1fr; }
  :global(:where(:root.eng-860)) .gross .zahl { font-size: 2.1rem; }
  :global(:where(:root.eng-860)) .ergebnis { padding: var(--a4); }
</style>
