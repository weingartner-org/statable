<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  /** Zwei-Parameter-Modell (2PL) unter der Skalen-Karte (S-J): jede Aufgabe hat eigene Schwierigkeit und Trennschärfe. Rechnet im Browser (lib/irt2pl.ts), erst auf Klick. */
  import HilfeLink from './HilfeLink.svelte';
  import YTitel from './YTitel.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import Rechnet from './Rechnet.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma } from '../lib/ergebnis';
  import IrtPersonenSpalte from './IrtPersonenSpalte.svelte';
  import { eap2pl } from '../lib/irtpersonen';
  import { zweiPL, type Ergebnis2PL, type Fehler2PL } from '../lib/irt2pl';
  import { achsenMarken } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';

  let { fragen, name }: { fragen: string[]; name: (n: string) => string } = $props();
  let res = $state<Ergebnis2PL | Fehler2PL | null>(null), laeuft = $state(false);
  $effect(() => { void fragen.join('|'); res = null; });
  const daten = $derived.by(() => {
    const ix = fragen.map(n => s.spalten.findIndex(c => c.name === n));
    if (ix.some(i => i < 0)) return null;
    const cs = ix.map(i => s.spalten[i]!), zeilen: number[][] = [];
    for (const z of s.zeilen) { const r = ix.map(i => z[i]); if (r.some((v, k) => typeof v !== 'number' || istFehlend(cs[k]!, v as number))) continue; zeilen.push(r as number[]); }
    return zeilen;
  });
  /** Nur für richtig/falsch-Aufgaben (0/1); bei Likert-Fragen steht stattdessen das Stufenmodell da */
  const passt = $derived(!!daten && daten.length >= 1 && daten.every(r => r.every(v => v === 0 || v === 1)));
  async function rechnen() {
    if (laeuft || !daten) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    res = zweiPL(daten);
    laeuft = false;
  }
  const r = $derived(res && !('fehler' in res) ? res : null);
  const z2 = (v: number) => komma(v, 2);
  const fehlerText = (f: { fehler: string }) => f.fehler === 'werte' ? L('Das 2PL-Modell braucht Aufgaben mit genau zwei Antworten: 0 (falsch) und 1 (richtig). Diese Spalten haben andere Werte.', 'The 2PL model needs tasks with exactly two answers: 0 (wrong) and 1 (right). These columns have other values.')
    : f.fehler === 'zu-wenig-aufgaben' ? L('Es braucht mindestens drei Aufgaben.', 'At least three tasks are needed.')
    : f.fehler === 'zu-viele-aufgaben' ? L('Mehr als 40 Aufgaben rechnet Statable im 2PL-Modell nicht.', 'Statable does not calculate more than 40 tasks in the 2PL model.')
    : f.fehler === 'zu-wenig-personen' ? L('Zu wenige Personen (mindestens 30 mit allen Antworten; sinnvoll sind 500 und mehr).', 'Too few people (at least 30 with all answers; 500 or more make sense).')
    : f.fehler === 'aufgabe-ohne-streuung' ? L('Eine Aufgabe wurde von allen gleich beantwortet: Ohne Streuung lässt sich ihre Schwierigkeit nicht schätzen. Diese Aufgabe weglassen.', 'One task was answered the same by everyone: without spread its difficulty cannot be estimated. Leave this task out.')
    : L('Die Schätzung konvergiert nicht (zu wenige Personen oder Aufgaben, die nicht zusammenpassen).', 'The estimation does not converge (too few people or tasks that do not fit together).');
  /* Kennlinien: Wahrscheinlichkeit richtig über der Fähigkeit von −4 bis 4 */
  const W = 560, H = 320, T0 = 20, U0 = 40, X0 = 56, XR = 20;
  const px = (t: number) => X0 + (W - X0 - XR) * ((t + 4) / 8), py = (p: number) => T0 + (H - T0 - U0) * (1 - p);
  const kurve = (a: number, b: number) => Array.from({ length: 81 }, (_, i) => { const t = -4 + i * 0.1; return `${i ? 'L' : 'M'}${px(t).toFixed(1)},${py(1 / (1 + Math.exp(-a * (t - b)))).toFixed(1)}`; }).join(' ');
  const bt = $derived.by(() => {
    if (!r) return null;
    const t = bildtext('verteilung', { titel: L('Kennlinien der Aufgaben (2PL)', 'Item characteristic curves (2PL)'),
      xAchse: { name: L('Fähigkeit (Logit)', 'Ability (logit)'), von: -4, bis: 4 }, yAchse: { name: L('Wahrscheinlichkeit richtig', 'Probability right'), von: 0, bis: 1 },
      kurven: r.item.map((it, i) => ({ name: name(fragen[i]!), punkte: Array.from({ length: 81 }, (_, q) => { const x = -4 + q * 0.1; return [x, 1 / (1 + Math.exp(-it.a * (x - it.b)))] as [number, number]; }) })) });
    return { ...t, beschreibung: [...t.beschreibung, L('Steilere Linien trennen besser.', 'Steeper lines separate better.')] };
  });
</script>

{#if passt}
<details class="auf" style="margin-top:var(--a4)"><summary>{L('2PL-Modell: Trennen alle Aufgaben gleich gut?', '2PL model: do all tasks separate equally well?')}</summary>
  <p class="heft-text">{L('Für Tests mit richtig/falsch-Aufgaben. Das 2PL-Modell gibt jeder Aufgabe zwei Zahlen: die Schwierigkeit (bei welcher Fähigkeit eine Person die Aufgabe mit 50 % löst) und die Trennschärfe (wie steil die Kennlinie ist, also wie gut die Aufgabe zwischen fähigeren und weniger fähigen Personen unterscheidet). Aufgaben mit kleiner Trennschärfe messen schlecht dasselbe wie die übrigen.', 'For tests with right/wrong tasks. The 2PL model gives every task two numbers: the difficulty (at which ability a person solves the task with 50 %) and the discrimination (how steep the curve is, that is how well the task tells apart more able from less able people). Tasks with low discrimination measure the same thing as the others only poorly.')}</p>
  <p class="hilfe"><HilfeLink id="zwei-pl-modell" text={L('Hilfe: 2PL-Modell', 'Help: 2PL model')} /></p>
  <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft || !daten}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{L(`2PL-Modell mit ${fragen.length} Aufgaben rechnen`, `Calculate the 2PL model with ${fragen.length} tasks`)}{/if}</button></div>
  {#if res && 'fehler' in res}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
  {:else if r}
    <p class="heft-text" role="status">{L(`${r.personen} Personen mit allen Antworten, ${r.aufgaben} Aufgaben. Log-Likelihood ${z2(r.logLik)}, AIC ${z2(r.aic)}, BIC ${z2(r.bic)}.`, `${r.personen} people with all answers, ${r.aufgaben} tasks. Log-likelihood ${z2(r.logLik)}, AIC ${z2(r.aic)}, BIC ${z2(r.bic)}.`)}</p>
    {#if r.personen < 500}<p class="heft-text" style="color:var(--tinte-2)">{L('Mit weniger als etwa 500 Personen sind die Schätzungen des 2PL-Modells unsicher (die Standardfehler sind groß). Das Rasch-Modell kommt mit weniger Personen aus.', 'With fewer than about 500 people the estimates of the 2PL model are uncertain (the standard errors are large). The Rasch model manages with fewer people.')}</p>{/if}
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Aufgaben: Schwierigkeit und Trennschärfe', 'Tasks: difficulty and discrimination')}</b></caption>
      <thead><tr><th scope="col">{L('Aufgabe', 'Task')}</th><th scope="col">{L('Anteil richtig', 'Share right')}</th><th scope="col">{L('Schwierigkeit b', 'Difficulty b')}</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">{L('Trennschärfe a', 'Discrimination a')}</th><th scope="col">{L('Standardfehler', 'Standard error')}</th></tr></thead>
      <tbody>{#each r.item as it, i (i)}<tr><th scope="row" style="text-align: start">{name(fragen[i]!)}</th><td style="text-align:right">{komma(it.anteil * 100, 0)} %</td><td style="text-align:right">{z2(it.b)}</td><td style="text-align:right">{z2(it.seB)}</td><td style="text-align:right">{z2(it.a)}</td><td style="text-align:right">{z2(it.seA)}</td></tr>{/each}</tbody>
    </table></div>
    {#if r.item.some(it => it.a < 0)}<p class="heft-text" style="color:var(--fehler, #b3261e)" role="alert">{L('Eine Aufgabe hat eine negative Trennschärfe: Fähigere Personen lösen sie seltener. Das spricht meist für eine umgekehrt kodierte Aufgabe (0 und 1 vertauscht) oder für eine fehlerhafte Aufgabe.', 'A task has a negative discrimination: more able people solve it less often. This usually points to a reverse-coded task (0 and 1 swapped) or a faulty task.')}</p>{/if}
    {#if r.item.some(it => it.a > 3)}<p class="heft-text" style="color:var(--tinte-2)">{L('Eine Trennschärfe über 3 ist ungewöhnlich hoch; die Schätzung ist dann meist unsicher (großer Standardfehler).', 'A discrimination above 3 is unusually high; the estimate is then usually uncertain (large standard error).')}</p>{/if}
    <DiagrammExport titel={L('Kennlinien der Aufgaben (2PL)', 'Item characteristic curves (2PL)')}>
      <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz}>
        {#each achsenMarken(0, 1) as v}<line x1={X0} x2={W - XR} y1={py(v)} y2={py(v)} stroke="var(--dg-gitter)" /><text x={X0 - 8} y={py(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
        {#each [-4, -2, 0, 2, 4] as t}<text x={px(t)} y={H - U0 + 18} text-anchor="middle" class="klein">{zahlDe(t)}</text>{/each}
        {#each r.item as it, i (i)}<path d={kurve(it.a, it.b)} fill="none" stroke="var(--dg-a)" stroke-width="1.5" opacity="0.75"><title>{name(fragen[i]!)}: a = {z2(it.a)}, b = {z2(it.b)}</title></path>{/each}
        <text x={(X0 + W - XR) / 2} y={H - 6} text-anchor="middle" class="klein">{L('Fähigkeit (Logit)', 'Ability (logit)')}</text>
        <YTitel x={14} y={(T0 + H - U0) / 2} laenge={H - T0 - U0} text={L('Wahrscheinlichkeit richtig', 'Probability right')} px={13} klasse="klein" />
      </svg>
    </DiagrammExport>
    {#if bt}<BildBeschreibung {...bt} />{/if}
    <p class="heft-text" style="color:var(--tinte-2)">{L('Das 2PL-Modell nimmt an, dass eine einzige Fähigkeit die Antworten erklärt und dass Raten keine Rolle spielt; die Fähigkeit hat den Mittelwert 0 und die Streuung 1. Die Zahlen sind nur als Richtwerte zu lesen: Wer Aufgaben allein wegen ihrer Trennschärfe streicht, sollte zuerst inhaltlich prüfen, ob die Aufgabe etwas anderes meint.', 'The 2PL model assumes that a single ability explains the answers and that guessing plays no role; the ability has mean 0 and spread 1. The numbers are only guides: before dropping tasks merely because of their discrimination, check first whether the task means something different.')}</p>
    <IrtPersonenSpalte {fragen} rechne={(y) => eap2pl(r.item, y)} />
  {/if}
</details>
{/if}
