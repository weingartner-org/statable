<script lang="ts">
  /** Logistische Regression prüfen (Field-Stufe 2b) unter der logistischen Regression von „Lässt sich etwas vorhersagen?“: auffällige und einflussreiche Fälle (Hebelwert, Cooks Distanz, Devianzresiduum, DFBETA), VIF, Hosmer-Lemeshow-Test,
   *  Linearität des Logits (Box-Tidwell) und ein zweiter Block von Vorhersagegrößen mit Block-χ². Rechnet im Browser (lib/logdiagnose.ts, IRLS) mit denselben Personen wie die Regression; das Ereignis ist das der Regression. */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L, Lp } from '../lib/sitzung.svelte';
  import { komma, ohneNull, pWert } from '../lib/ergebnis';
  import { logDiagnose, logAuffaellige, hosmerLemeshow, boxTidwell, boxTidwellSpalten, logBlock, logitAnpassen } from '../lib/logdiagnose';
  import { regMatrix } from '../lib/regmatrix';
  import type { RegTerm } from '../lib/regfaktor';

  let { terme, ziel, ereignis, referenz, name }: { terme: RegTerm[]; ziel: string; ereignis: string; referenz: string; name: (n: string) => string } = $props();
  let offen = $state(false);
  /** Welche Spalten (Namen) bilden den zweiten Block; Voreinstellung: die zuletzt gewählte. */
  let block2 = $state<string[] | null>(null);
  const sp = $derived(s.spalten.find(c => c.name === ziel));
  const text = (v: string | number) => (typeof v === 'number' ? String(Number(v)) : String(v).trim());
  const daten = $derived(offen ? regMatrix(s.spalten, s.zeilen, terme, ziel, name, v => (text(v) === ereignis ? 1 : text(v) === referenz ? 0 : null)) : null);
  const res = $derived(daten ? logDiagnose(daten.x, daten.y) : null);
  const r = $derived(res && !('fehler' in res) ? res : null);
  const fit = $derived(daten && r ? logitAnpassen(daten.x, daten.y) : null);
  const hl = $derived(fit && !('fehler' in fit) && daten ? hosmerLemeshow(fit.mu, daten.y) : null);
  const btSpalten = $derived(daten ? boxTidwellSpalten(daten.x, terme.flatMap(t => (t.faktor ? t.faktor.hilfs.map(() => false) : [true]))) : []);
  const bt = $derived(daten && btSpalten.length ? boxTidwell(daten.x, daten.y, btSpalten) : null);
  /** Spalten von `x` je Term: Zahl = eine Spalte, Gruppen-Spalte = ihre Hilfsspalten. */
  const bereiche = $derived(terme.reduce<{ spalte: string; von: number; bis: number }[]>((a, t) => { const von = a.at(-1)?.bis ?? 0; a.push({ spalte: t.spalte, von, bis: von + (t.faktor ? t.faktor.hilfs.length : 1) }); return a; }, []));
  const zweiter = $derived(block2 ?? (terme.length >= 2 ? [terme.at(-1)!.spalte] : []));
  const spaltenEins = $derived(bereiche.filter(b => !zweiter.includes(b.spalte)).flatMap(b => Array.from({ length: b.bis - b.von }, (_, i) => b.von + i)));
  const blockRes = $derived(daten && terme.length >= 2 && zweiter.length && spaltenEins.length ? logBlock(daten.x, daten.y, spaltenEins) : null);
  const auf = $derived(r ? logAuffaellige(r).sort((a, b) => r.faelle[b.index]!.cook - r.faelle[a.index]!.cook) : []);
  const AUSWAHL_MAX = 25;
  const z2 = (v: number) => komma(v, 2);
  const z3 = (v: number) => komma(v, 3);
  const hoch = $derived(r && daten ? daten.zeilenNamen.filter((_, i) => r.vif[i]! >= 5) : []);
  const sehrHoch = $derived(r ? r.vif.some(v => v >= 10) : false);
  /** Größte Änderung eines Koeffizienten (an seinem Standardfehler gemessen) bei Weglassen des Falls, als Rohwert wie `dfbeta()`; die Konstante zählt nicht. */
  function dfbeta(i: number): { wert: number; name: string } | null {
    if (!r || !daten) return null;
    const f = r.faelle[i]!; let best = 1;
    for (let j = 2; j < f.dfbeta.length; j++) if (Math.abs(f.dfbeta[j]! / r.se[j]!) > Math.abs(f.dfbeta[best]! / r.se[best]!)) best = j;
    return { wert: f.dfbeta[best]!, name: daten.zeilenNamen[best - 1]! };
  }
  const gruende = (g: { resid: boolean; cook: boolean; cook1: boolean; hebel: boolean }) => [g.resid ? L('Residuum', 'residual') : '', g.cook1 ? L('Cook über 1', 'Cook above 1') : g.cook ? L('Cook', 'Cook') : '', g.hebel ? L('Hebelwert', 'leverage') : ''].filter(Boolean).join(', ');
  const wertName = (w: string) => sp?.werteLabels[w] ?? sp?.werteLabels[String(Number(w))] ?? w;
  const fehlerText = (f: string) => f === 'zu-wenig-faelle' ? L('Zu wenige Fälle für so viele Vorhersagegrößen.', 'Too few cases for so many predictors.')
    : f === 'hebel' ? L('Ein Fall bestimmt sein Ergebnis allein (Hebelwert 1): Die Prüfung ist nicht möglich.', 'One case determines its own fit alone (leverage 1): the check is not possible.')
    : f === 'trennung' ? L('Die Vorhersagegrößen trennen die beiden Gruppen vollständig oder fast vollständig (Trennung): Die Schätzung ist nicht stabil, die Prüfung ist nicht möglich.', 'The predictors separate the two groups completely or almost completely (separation): the estimate is not stable, the check is not possible.')
    : f === 'keine-streuung' ? L('Das Ziel hat nur einen Wert.', 'The outcome has only one value.')
    : L('Die Vorhersagegrößen lassen sich nicht gemeinsam rechnen (eine bestimmt eine andere vollständig).', 'The predictors cannot be calculated together (one fully determines another).');
  function umschalten(spalte: string, an: boolean) {
    const jetzt = zweiter.filter(x => x !== spalte);
    block2 = an ? [...jetzt, spalte] : jetzt;
  }
</script>

<details class="auf" style="margin-top:var(--a4)" ontoggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) offen = true; }}><summary>{L('Logistische Regression prüfen: auffällige Fälle, Passung, Linearität des Logits, Blöcke', 'Checking the logistic regression: unusual cases, fit, linearity of the logit, blocks')}</summary>
  <p class="heft-text">{L('Nach dem Modelltest bleiben vier Fragen: Bestimmen einzelne Fälle das Ergebnis über Gebühr (Hebelwert, Cooks Distanz, Devianzresiduum, DFBETA)? Überschneiden sich die Vorhersagegrößen zu stark (Varianzinflationsfaktor, VIF)? Passen die vorhergesagten Wahrscheinlichkeiten zu den beobachteten Anteilen (Hosmer-Lemeshow-Test)? Und wirkt eine Zahlengröße wirklich gleichmäßig auf das Logit (Linearität des Logits, Box-Tidwell-Test)?', 'After the model test four questions remain: do single cases determine the result unduly (leverage, Cook\'s distance, deviance residual, DFBETA)? Do the predictors overlap too much (variance inflation factor, VIF)? Do the predicted probabilities match the observed proportions (Hosmer-Lemeshow test)? And does a numeric predictor really act evenly on the logit (linearity of the logit, Box-Tidwell test)?')}</p>
  <p class="hilfe"><HilfeLink id="logistische-regression" text={L('Hilfe: Logistische Regression', 'Help: logistic regression')} /> <HilfeLink id="kollinearitaet" text={L('Hilfe: Kollinearität (Toleranz, VIF)', 'Help: collinearity (tolerance, VIF)')} /> <HilfeLink id="ausreisser" text={L('Hilfe: Ausreißer und Hebelwert', 'Help: outliers and leverage')} /></p>
  {#if !offen}
    <!-- gerechnet wird erst nach dem Aufklappen -->
  {:else if res && 'fehler' in res}
    <p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehlerText(res.fehler)}</p>
  {:else if r && daten}
    <p class="heft-text">{L(`Gerechnet mit ${r.n} Fällen; Ereignis ist „${wertName(ereignis)}“ (gegen „${wertName(referenz)}“), wie in der Regression.`, `Calculated with ${r.n} cases; the event is "${wertName(ereignis)}" (versus "${wertName(referenz)}"), as in the regression.`)}</p>

    <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a3) 0 var(--a2)">{L('Kollinearität', 'Collinearity')}</h3>
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Überschneidung der Vorhersagegrößen', 'Overlap of the predictors')}</b></caption>
      <thead><tr><th scope="col">{L('Vorhersagegröße', 'Predictor')}</th><th scope="col">VIF</th></tr></thead>
      <tbody>{#each r.vif as v, i (i)}<tr><th scope="row" style="text-align: start">{daten.zeilenNamen[i]}</th><td style="text-align:right">{z2(v)}</td></tr>{/each}</tbody>
    </table></div>
    <p class="heft-text">{#if hoch.length}{Lp(hoch.length, `Auffällig: ${hoch.join(', ')} überschneidet sich stark mit den anderen Vorhersagegrößen (Varianzinflationsfaktor, VIF, ab 5).`, `Auffällig: ${hoch.join(', ')} überschneiden sich stark mit den anderen Vorhersagegrößen (Varianzinflationsfaktor, VIF, ab 5).`, `Conspicuous: ${hoch.join(', ')} overlaps strongly with the other predictors (variance inflation factor, VIF, from 5).`, `Conspicuous: ${hoch.join(', ')} overlap strongly with the other predictors (variance inflation factor, VIF, from 5).`)} {#if sehrHoch}{L('Ein VIF ab 10 gilt als deutliches Warnzeichen.', 'A VIF from 10 counts as a clear warning sign.')} {/if}{L('Die Standardfehler der betroffenen Koeffizienten sind dadurch größer.', 'The standard errors of the affected coefficients are larger as a result.')}{:else}{L('Kein VIF liegt bei 5 oder darüber: Die Vorhersagegrößen überschneiden sich nicht auffällig.', 'No VIF is 5 or above: the predictors do not overlap conspicuously.')}{/if} {L('Der VIF kommt aus der Kovarianzmatrix der Koeffizienten (wie car::vif bei glm); bei Gruppen-Spalten steht er je Hilfsspalte. VIF 5 und 10 sind Faustregeln.', 'The VIF comes from the covariance matrix of the coefficients (like car::vif for glm); for group columns it is shown per helper column. VIF 5 and 10 are rules of thumb.')}</p>

    <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a3) 0 var(--a2)">{L('Auffällige und einflussreiche Fälle', 'Unusual and influential cases')}</h3>
    {#if auf.length}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{auf.length > AUSWAHL_MAX ? L(`Fälle, die auffallen (${AUSWAHL_MAX} mit der größten Cooks Distanz von ${auf.length}; insgesamt ${r.n} Fälle)`, `Cases that stand out (the ${AUSWAHL_MAX} with the largest Cook's distance of ${auf.length}; ${r.n} cases in all)`) : L(`Fälle, die auffallen (${auf.length} von ${r.n})`, `Cases that stand out (${auf.length} of ${r.n})`)}</b></caption>
        <thead><tr><th scope="col">{L('Zeile in den Daten', 'Row in the data')}</th><th scope="col">{L('Standardisiertes Devianzresiduum', 'Standardised deviance residual')}</th><th scope="col">{L('Hebelwert', 'Leverage')}</th><th scope="col">{L('Cooks Distanz', `Cook's distance`)}</th><th scope="col">{L('DFBETA (größte Änderung, roh)', 'DFBETA (largest change, raw)')}</th><th scope="col">{L('Auffällig wegen', 'Stands out for')}</th></tr></thead>
        <tbody>{#each auf.slice(0, AUSWAHL_MAX) as q (q.index)}{@const f = r.faelle[q.index]!}{@const db = dfbeta(q.index)}<tr><th scope="row" style="text-align:right">{daten.zeile[q.index]}</th><td style="text-align:right">{z2(f.devRest)}</td><td style="text-align:right">{ohneNull(f.hebel, 3)}</td><td style="text-align:right">{z3(f.cook)}</td><td style="text-align:right">{db ? `${komma(db.wert, 4)} (${db.name})` : '-'}</td><td>{gruende(q.grund)}</td></tr>{/each}</tbody>
      </table></div>
    {:else}
      <p class="heft-text">{L('Kein Fall fällt auf: kein standardisiertes Devianzresiduum über 2 im Betrag, keine Cooks Distanz über 4/n, kein Hebelwert über 2k/n.', 'No case stands out: no standardised deviance residual above 2 in absolute value, no Cook\'s distance above 4/n, no leverage above 2k/n.')}</p>
    {/if}
    <p class="heft-text">{L(`Grenzen: Devianzresiduum über 2 im Betrag, Cooks Distanz über 4/n = ${z3(r.grenzen.cook)} (über 1 sehr starker Einfluss), Hebelwert über 2k/n = ${z3(r.grenzen.hebel)} (k = ${r.k} Koeffizienten mit der Konstanten). DFBETA ist die Änderung eines Koeffizienten in Log-Odds, wenn der Fall fehlt (Rohwert wie R dfbeta); gezeigt wird der Koeffizient mit der größten Änderung im Verhältnis zu seinem Standardfehler. Das sind Faustregeln. Die Zeile steht so in der Datenansicht.`, `Limits: deviance residual above 2 in absolute value, Cook's distance above 4/n = ${z3(r.grenzen.cook)} (above 1 very strong influence), leverage above 2k/n = ${z3(r.grenzen.hebel)} (k = ${r.k} coefficients including the constant). DFBETA is the change of a coefficient in log-odds when the case is left out (raw value as R dfbeta); the coefficient with the largest change relative to its standard error is shown. These are rules of thumb. The row number is the one in the data view.`)}</p>
    <p class="heft-text"><b>{L('Fälle bleiben in den Daten.', 'Cases stay in the data.')}</b> {L('Erst prüfen: Ist es ein Tippfehler? Gehört der Fall zu einer anderen Gruppe, als die Frage meint? Nie automatisch löschen. Bei Bedarf die Rechnung mit und ohne den Fall zeigen.', 'First check: is it a typing error? Does the case belong to another group than the question means? Never delete automatically. If needed, show the calculation with and without the case.')}</p>

    <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a3) 0 var(--a2)">{L('Passung: Hosmer-Lemeshow-Test', 'Fit: Hosmer-Lemeshow test')}</h3>
    {#if hl}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Hosmer-Lemeshow-Test: χ²(${hl.df}) = ${z2(hl.chi2)}, p ${pWert(hl.p)}`, `Hosmer-Lemeshow test: χ²(${hl.df}) = ${z2(hl.chi2)}, p ${pWert(hl.p)}`)}</b><i>{L(`${hl.gruppen.length} Gruppen nach der vorhergesagten Wahrscheinlichkeit`, `${hl.gruppen.length} groups by predicted probability`)}</i></caption>
        <thead><tr><th scope="col">{L('Gruppe', 'Group')}</th><th scope="col">{L('Fälle', 'Cases')}</th><th scope="col">{L('Ereignisse beobachtet', 'Events observed')}</th><th scope="col">{L('Ereignisse erwartet', 'Events expected')}</th></tr></thead>
        <tbody>{#each hl.gruppen as g, i (i)}<tr><th scope="row" style="text-align:right">{i + 1}</th><td style="text-align:right">{g.n}</td><td style="text-align:right">{g.beobachtet}</td><td style="text-align:right">{z2(g.erwartet)}</td></tr>{/each}</tbody>
      </table></div>
      <p class="heft-text">{hl.p < 0.05 ? L('Der Test ist signifikant: Die vorhergesagten Wahrscheinlichkeiten weichen auffällig von den beobachteten Anteilen ab. Das Modell passt nicht gut; mögliche Gründe sind fehlende Vorhersagegrößen, fehlende Wechselwirkungen oder ein gekrümmter Zusammenhang (siehe Linearität des Logits).', 'The test is significant: the predicted probabilities deviate conspicuously from the observed proportions. The model does not fit well; possible reasons are missing predictors, missing interactions or a curved relation (see linearity of the logit).') : L('Der Test ist nicht signifikant: Es gibt keinen Hinweis auf eine schlechte Passung.', 'The test is not significant: there is no sign of a poor fit.')} {L('Vorsicht: Nicht signifikant ist kein Beweis für eine gute Passung, bei kleinen Stichproben hat der Test wenig Teststärke. Das Ergebnis hängt von der Gruppenzahl ab (hier 10 Gruppen nach Dezilen, df = Gruppen − 2); eine andere Gruppenzahl kann anders ausgehen.', 'Caution: not significant is no proof of a good fit; with small samples the test has little power. The result depends on the number of groups (here 10 groups by deciles, df = groups − 2); another number of groups can turn out differently.')}</p>
    {:else}
      <p class="heft-text">{L('Der Hosmer-Lemeshow-Test ist hier nicht möglich: Es gibt zu wenige verschiedene vorhergesagte Wahrscheinlichkeiten, um Gruppen zu bilden.', 'The Hosmer-Lemeshow test is not possible here: there are too few different predicted probabilities to form groups.')}</p>
    {/if}

    <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a3) 0 var(--a2)">{L('Linearität des Logits: Box-Tidwell-Test', 'Linearity of the logit: Box-Tidwell test')}</h3>
    {#if bt && !('fehler' in bt)}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Box-Tidwell-Test: Term x · ln(x) je Zahlengröße', 'Box-Tidwell test: term x · ln(x) per numeric predictor')}</b></caption>
        <thead><tr><th scope="col">{L('Vorhersagegröße', 'Predictor')}</th><th scope="col">z</th><th scope="col">p</th></tr></thead>
        <tbody>{#each bt as t (t.spalte)}<tr><th scope="row" style="text-align: start">{daten.zeilenNamen[t.spalte]}</th><td style="text-align:right">{z2(t.z)}</td><td style="text-align:right">{pWert(t.p).replace('= ', '')}</td></tr>{/each}</tbody>
      </table></div>
      <p class="heft-text">{bt.some(t => t.p < 0.05) ? L(`Auffällig: ${bt.filter(t => t.p < 0.05).map(t => daten.zeilenNamen[t.spalte]).join(', ')} wirkt nicht gleichmäßig auf das Logit (p unter ,05). Möglich: die Größe umformen (zum Beispiel logarithmieren) oder in Gruppen einteilen.`, `Conspicuous: ${bt.filter(t => t.p < 0.05).map(t => daten.zeilenNamen[t.spalte]).join(', ')} does not act evenly on the logit (p below .05). Possible: transform the predictor (for example take the logarithm) or split it into groups.`) : L('Kein Term ist signifikant: Es gibt keinen Hinweis, dass eine Zahlengröße nicht linear auf das Logit wirkt.', 'No term is significant: there is no sign that a numeric predictor does not act linearly on the logit.')} {L('Geprüft werden nur Zahlen mit ausschließlich positiven Werten (der Logarithmus braucht das) und mehr als zwei verschiedenen Werten; Ja/Nein-Spalten und Gruppen-Spalten fallen heraus. Wer mehrere Größen prüft, sollte strenger sein, zum Beispiel ,05 geteilt durch die Zahl der Tests. Nicht signifikant bedeutet auch hier keinen Beweis.', 'Only numbers with exclusively positive values (the logarithm needs that) and more than two different values are tested; yes/no columns and group columns drop out. When several predictors are tested, be stricter, for example .05 divided by the number of tests. Not significant is no proof here either.')}</p>
    {:else if bt}
      <p class="heft-text">{fehlerText(bt.fehler)}</p>
    {:else}
      <p class="heft-text">{L('Keine Vorhersagegröße ist dafür geeignet: Es braucht eine Zahl mit ausschließlich positiven Werten und mehr als zwei verschiedenen Werten.', 'No predictor is suitable: it takes a number with exclusively positive values and more than two different values.')}</p>
    {/if}

    {#if terme.length >= 2}
      <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a3) 0 var(--a2)">{L('Blöcke: was bringt ein zweiter Block von Vorhersagegrößen?', 'Blocks: what does a second block of predictors add?')}</h3>
      <fieldset class="korr-wahl" style="border:0;padding:0;margin:var(--a2) 0">
        <legend class="heft-text">{L('Zweiter Block (kommt zum ersten Block dazu):', 'Second block (added to the first block):')}</legend>
        <div class="segment">{#each terme as t (t.spalte)}<label><input type="checkbox" checked={zweiter.includes(t.spalte)} disabled={!zweiter.includes(t.spalte) && zweiter.length >= terme.length - 1} onchange={(ev) => umschalten(t.spalte, ev.currentTarget.checked)}>{name(t.spalte)}</label>{/each}</div>
      </fieldset>
      {#if blockRes && !('fehler' in blockRes)}
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{L('Block-χ² (Likelihood-Quotient-Test)', 'Block χ² (likelihood ratio test)')}</b></caption>
          <thead><tr><th scope="col">{L('Modell', 'Model')}</th><th scope="col">{L('Devianz (−2LL)', 'Deviance (−2LL)')}</th><th scope="col">Nagelkerkes R²</th></tr></thead>
          <tbody>
            <tr><th scope="row" style="text-align: start">{L('Block 1', 'Block 1')}</th><td style="text-align:right">{z2(blockRes.devEins)}</td><td style="text-align:right">{ohneNull(blockRes.nagelkerkeEins, 3)}</td></tr>
            <tr><th scope="row" style="text-align: start">{L('Block 1 und 2', 'Blocks 1 and 2')}</th><td style="text-align:right">{z2(blockRes.devZwei)}</td><td style="text-align:right">{ohneNull(blockRes.nagelkerkeZwei, 3)}</td></tr>
          </tbody>
        </table></div>
        <p class="heft-text">{L(`Block-χ²(${blockRes.df}) = ${z2(blockRes.chi2)}, p ${pWert(blockRes.p)}.`, `Block χ²(${blockRes.df}) = ${z2(blockRes.chi2)}, p ${pWert(blockRes.p)}.`)} {blockRes.p < 0.05 ? L('Der zweite Block verbessert das Modell über den Zufall hinaus.', 'The second block improves the model beyond chance.') : L('Der zweite Block verbessert das Modell nicht nachweisbar.', 'The second block does not demonstrably improve the model.')} {L('Das Block-χ² ist die Differenz der Devianz beider Modelle; es wird mit der χ²-Verteilung beurteilt (df = Zahl der zusätzlichen Koeffizienten, wie R anova(…, test = "Chisq")).', 'The block χ² is the difference in deviance of the two models; it is judged with the χ² distribution (df = number of additional coefficients, like R anova(…, test = "Chisq")).')}</p>
      {:else if blockRes}
        <p class="heft-text">{fehlerText(blockRes.fehler)}</p>
      {:else}
        <p class="heft-text">{L('Der erste Block braucht mindestens eine Vorhersagegröße, der zweite auch.', 'The first block needs at least one predictor, and so does the second.')}</p>
      {/if}
    {/if}
  {/if}
</details>
