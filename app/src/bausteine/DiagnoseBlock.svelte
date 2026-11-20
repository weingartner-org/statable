<script lang="ts">
  /** Regression prüfen unter der linearen Regression von „Lässt sich etwas vorhersagen?“ (Field-Stufe 1): Kollinearität (Toleranz, VIF), eigener Beitrag (sr²), auffällige und einflussreiche Fälle, Durbin-Watson. Rechnet im Browser (lib/regdiagnose.ts) mit denselben Personen wie die Regression. */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L, Lp } from '../lib/sitzung.svelte';
  import { komma, ohneNull } from '../lib/ergebnis';
  import { regDiagnose, auffaelligeFaelle, residuenUeberZwei } from '../lib/regdiagnose';
  import { regMatrix } from '../lib/regmatrix';
  import type { RegTerm } from '../lib/regfaktor';

  let { terme, ziel, name }: { terme: RegTerm[]; ziel: string; name: (n: string) => string } = $props();
  const daten = $derived(regMatrix(s.spalten, s.zeilen, terme, ziel, name));
  const res = $derived(daten ? regDiagnose(daten.x, daten.y) : null);
  const r = $derived(res && !('fehler' in res) ? res : null);
  const z2 = (v: number) => komma(v, 2);
  const z3 = (v: number) => komma(v, 3);
  const sr2 = (v: number) => (v > 0 && v < 0.0005 ? L('< ,001', '< .001') : ohneNull(v, 3));
  const auf = $derived(r ? auffaelligeFaelle(r) : []);
  const ueber2 = $derived(r ? residuenUeberZwei(r) : { anzahl: 0, anteil: 0 });
  const prozent = (v: number) => komma(v * 100, 1) + ' %';
  const hoch = $derived(r && daten ? daten.zeilenNamen.filter((_, i) => r.groessen[i]!.vif >= 5) : []);
  const sehrHoch = $derived(r ? r.groessen.some(q => q.vif >= 10) : false);
  const dw = $derived(r?.durbinWatson ?? 2);
  /** Größter |DFBETAS| eines Falls (ohne Konstante) mit dem Namen der Vorhersagegröße; Faustgrenze 2/√n. */
  function dfbeta(i: number): { wert: number; name: string } | null {
    if (!r || !daten) return null;
    const f = r.faelle[i]!; let best = 1;
    for (let j = 2; j < f.dfbetas.length; j++) if (Math.abs(f.dfbetas[j]!) > Math.abs(f.dfbetas[best]!)) best = j;
    return { wert: f.dfbetas[best]!, name: daten.zeilenNamen[best - 1]! };
  }
  const grenzeDf = $derived(r ? 2 / Math.sqrt(r.n) : 0);
  const gruende = (g: { resid: boolean; cook: boolean; cook1: boolean; hebel: boolean }) => [g.resid ? L('Residuum', 'residual') : '', g.cook1 ? L('Cook über 1', 'Cook above 1') : g.cook ? L('Cook', 'Cook') : '', g.hebel ? L('Hebelwert', 'leverage') : ''].filter(Boolean).join(', ');
</script>

<details class="auf" style="margin-top:var(--a4)"><summary>{L('Regression prüfen: Kollinearität und auffällige Fälle', 'Checking the regression: collinearity and unusual cases')}</summary>
  <p class="heft-text">{L(`Zwei Fragen sind offen, wenn das Modell steht: Überschneiden sich die Vorhersagegrößen so stark, dass man ihren eigenen Beitrag kaum trennen kann (Kollinearität: Toleranz, VIF)? Und bestimmen einzelne Fälle das Ergebnis über Gebühr (Residuum, Hebelwert, Cooks Distanz)?`, `Two questions remain once the model is fitted: do the predictors overlap so much that their own contribution can hardly be separated (collinearity: tolerance, VIF)? And do single cases determine the result unduly (residual, leverage, Cook's distance)?`)}</p>
  <p class="hilfe"><HilfeLink id="kollinearitaet" text={L('Hilfe: Kollinearität (Toleranz, VIF)', 'Help: collinearity (tolerance, VIF)')} /> <HilfeLink id="ausreisser" text={L('Hilfe: Ausreißer und Hebelwert', 'Help: outliers and leverage')} /></p>
  {#if res && 'fehler' in res}
    <p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{res.fehler === 'zu-wenig-faelle' ? L('Zu wenige Fälle für so viele Vorhersagegrößen.', 'Too few cases for so many predictors.') : res.fehler === 'hebel' ? L('Ein Fall bestimmt sein Ergebnis allein (Hebelwert 1): Die Prüfung ist nicht möglich.', 'One case determines its own fit alone (leverage 1): the check is not possible.') : L('Die Vorhersagegrößen lassen sich nicht gemeinsam rechnen (eine bestimmt eine andere vollständig).', 'The predictors cannot be calculated together (one fully determines another).')}</p>
  {:else if r && daten}
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Kollinearität und eigener Beitrag', 'Collinearity and own contribution')}</b></caption>
      <thead><tr><th scope="col">{L('Vorhersagegröße', 'Predictor')}</th><th scope="col">{L('Toleranz', 'Tolerance')}</th><th scope="col">VIF</th><th scope="col">sr²</th></tr></thead>
      <tbody>{#each r.groessen as q, i (i)}<tr><th scope="row" style="text-align: start">{daten.zeilenNamen[i]}</th><td style="text-align:right">{ohneNull(q.toleranz, 3)}</td><td style="text-align:right">{z2(q.vif)}</td><td style="text-align:right">{sr2(q.sr2)}</td></tr>{/each}</tbody>
    </table></div>
    <p class="heft-text">{#if hoch.length}{Lp(hoch.length, `Auffällig: ${hoch.join(', ')} überschneidet sich stark mit den anderen Vorhersagegrößen (Varianzinflationsfaktor, VIF, ab 5).`, `Auffällig: ${hoch.join(', ')} überschneiden sich stark mit den anderen Vorhersagegrößen (Varianzinflationsfaktor, VIF, ab 5).`, `Conspicuous: ${hoch.join(', ')} overlaps strongly with the other predictors (variance inflation factor, VIF, from 5).`, `Conspicuous: ${hoch.join(', ')} overlap strongly with the other predictors (variance inflation factor, VIF, from 5).`)} {#if sehrHoch}{L('Ein VIF ab 10 gilt als deutliches Warnzeichen.', 'A VIF from 10 counts as a clear warning sign.')} {/if}{L('Die Standardfehler der betroffenen B sind dadurch größer, das einzelne B ist unsicherer; das Modell als Ganzes kann trotzdem gut vorhersagen. Möglich: Größen zusammenfassen oder eine davon weglassen und neu rechnen.', 'The standard errors of the affected B are larger as a result, the single B is less certain; the model as a whole can still predict well. Possible: combine predictors or drop one of them and recalculate.')}{:else}{L('Kein VIF liegt bei 5 oder darüber: Die Vorhersagegrößen überschneiden sich nicht auffällig.', 'No VIF is 5 or above: the predictors do not overlap conspicuously.')}{/if} {L('VIF 5 und 10 (Toleranz unter ,20 und ,10) sind Faustregeln, keine Gesetze.', 'VIF 5 and 10 (tolerance below .20 and .10) are rules of thumb, not laws.')}</p>
    <p class="heft-text">{L('sr² (quadrierte Semipartialkorrelation) ist der Anteil an der Streuung des Ziels, den nur diese Vorhersagegröße zusätzlich erklärt, wenn die anderen schon im Modell sind. Die sr² ergeben zusammen weniger als R², weil gemeinsam Erklärtes keiner Größe allein gehört.', 'sr² (squared semipartial correlation) is the share of the spread of the outcome that only this predictor explains in addition when the others are already in the model. The sr² add up to less than R², because what is explained jointly belongs to no predictor alone.')}</p>

    <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a3) 0 var(--a2)">{L('Auffällige und einflussreiche Fälle', 'Unusual and influential cases')}</h3>
    {#if auf.length}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Fälle, die auffallen (${auf.length} von ${r.n})`, `Cases that stand out (${auf.length} of ${r.n})`)}</b></caption>
        <thead><tr><th scope="col">{L('Zeile in den Daten', 'Row in the data')}</th><th scope="col">{L('Studentisiertes Residuum', 'Studentised residual')}</th><th scope="col">{L('Hebelwert', 'Leverage')}</th><th scope="col">{L('Cooks Distanz', `Cook's distance`)}</th><th scope="col">DFFITS</th><th scope="col">{L('DFBETAS (größter)', 'DFBETAS (largest)')}</th><th scope="col">{L('Auffällig wegen', 'Stands out for')}</th></tr></thead>
        <tbody>{#each auf as q (q.index)}{@const f = r.faelle[q.index]!}{@const db = dfbeta(q.index)}<tr><th scope="row" style="text-align:right">{daten.zeile[q.index]}</th><td style="text-align:right">{z2(f.rstudent)}</td><td style="text-align:right">{ohneNull(f.hebel, 3)}</td><td style="text-align:right">{z3(f.cook)}</td><td style="text-align:right">{z2(f.dffits)}</td><td style="text-align:right">{db ? `${z2(db.wert)} (${db.name})` : '-'}</td><td>{gruende(q.grund)}</td></tr>{/each}</tbody>
      </table></div>
    {:else}
      <p class="heft-text">{L(`Kein Fall fällt auf: kein studentisiertes Residuum über 2 im Betrag, keine Cooks Distanz über 4/n, kein Hebelwert über 2(k + 1)/n.`, `No case stands out: no studentised residual above 2 in absolute value, no Cook's distance above 4/n, no leverage above 2(k + 1)/n.`)}</p>
    {/if}
    <p class="heft-text">{L(`Ein studentisiertes Residuum über 2 im Betrag haben ${ueber2.anzahl} von ${r.n} Fällen (${prozent(ueber2.anteil)}); bei passendem Modell erwartet man etwa 5 %. Grenzen: Cooks Distanz über 4/n = ${z3(r.grenzen.cook)} (über 1 sehr starker Einfluss), Hebelwert über 2(k + 1)/n = ${z3(r.grenzen.hebel)} (k = Zahl der Vorhersagegrößen), größtes DFBETAS über 2/√n = ${z2(grenzeDf)}. Das sind Faustregeln. Die Zeile steht so in der Datenansicht.`, `${ueber2.anzahl} of ${r.n} cases (${prozent(ueber2.anteil)}) have a studentised residual above 2 in absolute value; with a fitting model about 5% are expected. Limits: Cook's distance above 4/n = ${z3(r.grenzen.cook)} (above 1 very strong influence), leverage above 2(k + 1)/n = ${z3(r.grenzen.hebel)} (k = number of predictors), largest DFBETAS above 2/√n = ${z2(grenzeDf)}. These are rules of thumb. The row number is the one in the data view.`)}</p>
    <p class="heft-text"><b>{L('Fälle bleiben in den Daten.', 'Cases stay in the data.')}</b> {L('Erst prüfen: Ist es ein Tippfehler? Gehört der Fall zu einer anderen Gruppe, als die Frage meint? Nie automatisch löschen. Bei Bedarf die Rechnung mit und ohne den Fall zeigen.', 'First check: is it a typing error? Does the case belong to another group than the question means? Never delete automatically. If needed, show the calculation with and without the case.')}</p>
    <p class="heft-text">{L(`Durbin-Watson-Test: d = ${z2(dw)}. Werte um 2 sprechen dafür, dass benachbarte Reste unabhängig sind; deutlich darunter (etwa unter 1,5) ähneln sich aufeinanderfolgende Reste, deutlich darüber (über 2,5) wechseln sie das Vorzeichen auffällig oft.`, `Durbin-Watson test: d = ${z2(dw)}. Values around 2 suggest that neighbouring residuals are independent; clearly below (about below 1.5) successive residuals resemble each other, clearly above (over 2.5) they change sign conspicuously often.`)} {#if dw < 1.5 || dw > 2.5}{L('Hier liegt der Wert außerhalb dieses Bereichs.', 'Here the value lies outside this range.')} {/if}{L('Das ist nur sinnvoll, wenn die Reihenfolge der Zeilen eine Bedeutung hat (zum Beispiel die Zeit).', 'This only makes sense if the order of the rows has a meaning (for example time).')}</p>
  {/if}
</details>
