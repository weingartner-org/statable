<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  /** Stufenmodell (GRM) für Fragen mit geordneten Antworten wie 1 bis 5, unter der Skalen-Karte (S-J). Rechnet im Browser (lib/irtgrm.ts), erst auf Klick. */
  import HilfeLink from './HilfeLink.svelte';
  import YTitel from './YTitel.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import Rechnet from './Rechnet.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma } from '../lib/ergebnis';
  import IrtPersonenSpalte from './IrtPersonenSpalte.svelte';
  import { eapStufen } from '../lib/irtpersonen';
  import { stufenModell, type ErgebnisGrm, type FehlerGrm } from '../lib/irtgrm';
  import { achsenMarken } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';

  let { fragen, name }: { fragen: string[]; name: (n: string) => string } = $props();
  const kennung = $props.id();
  let res = $state<ErgebnisGrm | FehlerGrm | null>(null), laeuft = $state(false), wahl = $state(0);
  $effect(() => { void fragen.join('|'); res = null; wahl = 0; });
  const daten = $derived.by(() => {
    const ix = fragen.map(n => s.spalten.findIndex(c => c.name === n));
    if (ix.some(i => i < 0)) return null;
    const cs = ix.map(i => s.spalten[i]!), zeilen: number[][] = [];
    for (const z of s.zeilen) { const r = ix.map(i => z[i]); if (r.some((v, k) => typeof v !== 'number' || istFehlend(cs[k]!, v as number))) continue; zeilen.push(r as number[]); }
    return zeilen;
  });
  /** Sinnvoll nur, wenn die Fragen mehr als zwei und höchstens acht verschiedene Werte haben */
  const passt = $derived(!!daten && daten.length >= 1 && fragen.every((_, j) => { const w = new Set(daten.map(r => r[j])); return w.size >= 3 && w.size <= 8; }));
  async function rechnen() {
    if (laeuft || !daten) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    res = stufenModell(daten);
    laeuft = false;
  }
  const r = $derived(res && !('fehler' in res) ? res : null);
  const z2 = (v: number) => komma(v, 2);
  const fehlerText = (f: { fehler: string }) => f.fehler === 'werte' ? L('Das Stufenmodell braucht ganze Zahlen als Antworten (zum Beispiel 1 bis 5).', 'The graded response model needs whole numbers as answers (for example 1 to 5).')
    : f.fehler === 'zu-wenig-aufgaben' ? L('Es braucht mindestens drei Fragen.', 'At least three questions are needed.')
    : f.fehler === 'zu-viele-aufgaben' ? L('Mehr als 30 Fragen rechnet Statable im Stufenmodell nicht.', 'Statable does not calculate more than 30 questions in the graded response model.')
    : f.fehler === 'zu-wenig-personen' ? L('Zu wenige Personen (mindestens 50 mit allen Antworten; sinnvoll sind 500 und mehr).', 'Too few people (at least 50 with all answers; 500 or more make sense).')
    : f.fehler === 'stufe-leer' ? L('Eine Frage hat weniger als zwei verschiedene Antworten.', 'A question has fewer than two different answers.')
    : f.fehler === 'zu-viele-stufen' ? L('Eine Frage hat mehr als acht Antwortstufen.', 'A question has more than eight answer steps.')
    : L('Die Schätzung konvergiert nicht (zu wenige Personen oder Antwortstufen, die kaum besetzt sind).', 'The estimation does not converge (too few people or answer steps that are hardly used).');
  /* Antwortkurven einer Frage: Wahrscheinlichkeit jeder Antwort über der Fähigkeit */
  const W = 560, H = 320, T0 = 20, U0 = 40, X0 = 56, XR = 20;
  const px = (t: number) => X0 + (W - X0 - XR) * ((t + 4) / 8), py = (p: number) => T0 + (H - T0 - U0) * (1 - p);
  const kurven = $derived.by(() => {
    if (!r) return [];
    const it = r.item[Math.min(wahl, r.item.length - 1)]!, K = it.stufen.length;
    const F = (c: number, t: number) => (c <= 0 ? 1 : c >= K ? 0 : 1 / (1 + Math.exp(-it.a * (t - it.schwellen[c - 1]!))));
    return Array.from({ length: K }, (_, c) => ({ stufe: it.stufen[c]!, d: Array.from({ length: 81 }, (_, i) => { const t = -4 + i * 0.1; return `${i ? 'L' : 'M'}${px(t).toFixed(1)},${py(F(c, t) - F(c + 1, t)).toFixed(1)}`; }).join(' ') }));
  });
  const farbe = (c: number, K: number) => `hsl(${Math.round(190 + (c / Math.max(K - 1, 1)) * 150)} 55% 42%)`;
  const maxK = $derived(r ? Math.max(...r.item.map(it => it.stufen.length)) : 0);
  const bt = $derived.by(() => {
    if (!r) return null;
    const it = r.item[Math.min(wahl, r.item.length - 1)]!, K = it.stufen.length;
    const F = (c: number, t: number) => (c <= 0 ? 1 : c >= K ? 0 : 1 / (1 + Math.exp(-it.a * (t - it.schwellen[c - 1]!))));
    return bildtext('verteilung', { titel: `${L('Antwortkurven (Stufenmodell)', 'Answer curves (graded response model)')}: ${name(fragen[Math.min(wahl, fragen.length - 1)]!)}`,
      xAchse: { name: L('Fähigkeit (Logit)', 'Ability (logit)'), von: -4, bis: 4 }, yAchse: { name: L('Wahrscheinlichkeit', 'Probability'), von: 0, bis: 1 },
      kurven: Array.from({ length: K }, (_, c) => ({ name: `${L('Antwort', 'Answer')} ${it.stufen[c]}`, punkte: Array.from({ length: 81 }, (_, i) => { const t = -4 + i * 0.1; return [t, F(c, t) - F(c + 1, t)] as [number, number]; }) })) });
  });
</script>

{#if passt}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Stufenmodell: Wie trennen die Antwortstufen? (Fragen mit Antworten 1 bis 5)', 'Graded response model: how do the answer steps separate? (questions with answers 1 to 5)')}</summary>
    <p class="heft-text">{L('Für Fragebögen mit geordneten Antworten (zum Beispiel „stimme gar nicht zu“ bis „stimme voll zu“). Das Stufenmodell gibt jeder Frage eine Trennschärfe (wie gut sie Personen mit mehr und weniger von der Eigenschaft unterscheidet) und je eine Schwelle zwischen zwei benachbarten Antworten: die Fähigkeit, bei der die höhere Antwort genauso wahrscheinlich ist wie die niedrigere oder eine noch niedrigere.', 'For questionnaires with ordered answers (for example "strongly disagree" to "strongly agree"). The graded response model gives every question a discrimination (how well it tells apart people with more and less of the trait) and a threshold between each two neighbouring answers: the ability at which the higher answer is as likely as the lower one or a still lower one.')}</p>
    <p class="hilfe"><HilfeLink id="stufenmodell-grm" text={L('Hilfe: Stufenmodell', 'Help: graded response model')} /></p>
    <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft || !daten}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{L(`Stufenmodell mit ${fragen.length} Fragen rechnen`, `Calculate the graded response model with ${fragen.length} questions`)}{/if}</button></div>
    {#if res && 'fehler' in res}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if r}
      <p class="heft-text" role="status">{L(`${r.personen} Personen mit allen Antworten, ${r.aufgaben} Fragen. Log-Likelihood ${z2(r.logLik)}, AIC ${z2(r.aic)}, BIC ${z2(r.bic)}.`, `${r.personen} people with all answers, ${r.aufgaben} questions. Log-likelihood ${z2(r.logLik)}, AIC ${z2(r.aic)}, BIC ${z2(r.bic)}.`)}</p>
      {#if r.personen < 500}<p class="heft-text" style="color:var(--tinte-2)">{L('Mit weniger als etwa 500 Personen sind die Schätzungen des Stufenmodells unsicher (die Standardfehler sind groß).', 'With fewer than about 500 people the estimates of the graded response model are uncertain (the standard errors are large).')}</p>{/if}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Fragen: Trennschärfe und Schwellen (mit Standardfehler)', 'Questions: discrimination and thresholds (with standard error)')}</b></caption>
        <thead><tr><th scope="col">{L('Frage', 'Question')}</th><th scope="col">{L('Trennschärfe a', 'Discrimination a')}</th>{#each Array.from({ length: maxK - 1 }, (_, k) => k) as k (k)}<th scope="col">{L('Schwelle', 'Threshold')} {k + 1}</th>{/each}</tr></thead>
        <tbody>{#each r.item as it, i (i)}<tr><th scope="row" style="text-align: start">{name(fragen[i]!)}</th><td style="text-align:right">{z2(it.a)} ({z2(it.seA)})</td>{#each Array.from({ length: maxK - 1 }, (_, k) => k) as k (k)}<td style="text-align:right">{it.schwellen[k] !== undefined ? `${z2(it.schwellen[k]!)} (${z2(it.seSchwellen[k]!)})` : ''}</td>{/each}</tr>{/each}</tbody>
      </table></div>
      <div class="eingabe" style="max-width:340px"><label for="grm-w-{kennung}">{L('Antwortkurven für welche Frage?', 'Answer curves for which question?')}</label>
        <select id="grm-w-{kennung}" bind:value={wahl}>{#each r.item as _, i (i)}<option value={i}>{name(fragen[i]!)}</option>{/each}</select></div>
      <DiagrammExport titel={L('Antwortkurven (Stufenmodell)', 'Answer curves (graded response model)')}>
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz}>
          {#each achsenMarken(0, 1) as v}<line x1={X0} x2={W - XR} y1={py(v)} y2={py(v)} stroke="var(--dg-gitter)" /><text x={X0 - 8} y={py(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
          {#each [-4, -2, 0, 2, 4] as t}<text x={px(t)} y={H - U0 + 18} text-anchor="middle" class="klein">{zahlDe(t)}</text>{/each}
          {#each kurven as k, c (c)}<path d={k.d} fill="none" stroke={farbe(c, kurven.length)} stroke-width="2"><title>{L('Antwort', 'Answer')} {k.stufe}</title></path>{/each}
          {#each kurven as k, c (c)}<text x={W - XR - 4 - (kurven.length - 1 - c) * 28} y={T0 + 8} text-anchor="end" class="klein" fill={farbe(c, kurven.length)}>{k.stufe}</text>{/each}
          <text x={(X0 + W - XR) / 2} y={H - 6} text-anchor="middle" class="klein">{L('Fähigkeit (Logit)', 'Ability (logit)')}</text>
          <YTitel x={14} y={(T0 + H - U0) / 2} laenge={H - T0 - U0} text={L('Wahrscheinlichkeit', 'Probability')} px={13} klasse="klein" />
        </svg>
      </DiagrammExport>
      {#if bt}<BildBeschreibung {...bt} />{/if}
      <p class="heft-text" style="color:var(--tinte-2)">{L('Das Stufenmodell nimmt an, dass eine einzige Eigenschaft die Antworten erklärt und dass die Antworten geordnet sind; die Eigenschaft hat den Mittelwert 0 und die Streuung 1. Schwellen sollten aufsteigend liegen; eine Antwortstufe, die fast nie gewählt wird, hat eine unsichere Schwelle (großer Standardfehler).', 'The graded response model assumes that a single trait explains the answers and that the answers are ordered; the trait has mean 0 and spread 1. Thresholds should be in ascending order; an answer step that is almost never chosen has an uncertain threshold (large standard error).')}</p>
      <IrtPersonenSpalte {fragen} rechne={(y) => eapStufen(r.item, y)} />
    {/if}
  </details>
{/if}
