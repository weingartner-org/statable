<script lang="ts">
  /** Rasch-Modell unter der Skalen-Karte „Wie zuverlässig misst meine Skala?“ (S-J): für Aufgaben mit richtig/falsch (0/1). Rechnet im Browser (lib/rasch.ts), erst auf Klick. */
  import HilfeLink from './HilfeLink.svelte';
  import YTitel from './YTitel.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import Rechnet from './Rechnet.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma, pWert } from '../lib/ergebnis';
  import { rasch, type RaschErgebnis, type RaschFehler } from '../lib/rasch';
  import { achsenMarken } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { kleinste, groesste } from '../lib/menge';
  import { spreize } from '../lib/beschriftung';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';

  let { fragen, name }: { fragen: string[]; name: (n: string) => string } = $props();
  let res = $state<RaschErgebnis | RaschFehler | { fehler: 'zwei-antworten' } | null>(null), laeuft = $state(false);
  $effect(() => { void fragen.join('|'); res = null; });
  const daten = $derived.by(() => {
    const ix = fragen.map(n => s.spalten.findIndex(c => c.name === n));
    if (ix.some(i => i < 0)) return null;
    const cs = ix.map(i => s.spalten[i]!), zeilen: number[][] = []; let ok = true;
    for (const z of s.zeilen) { const r = ix.map((i, k) => z[i]); if (r.some((v, k) => typeof v !== 'number' || istFehlend(cs[k]!, v as number))) continue; if (r.some(v => v !== 0 && v !== 1)) ok = false; zeilen.push(r as number[]); }
    return { zeilen, ok };
  });
  async function rechnen() {
    if (laeuft || !daten) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    res = !daten.ok ? { fehler: 'zwei-antworten' } : rasch(daten.zeilen);
    laeuft = false;
  }
  const r = $derived(res && !('fehler' in res) ? res : null);
  const z3 = (v: number) => komma(v, 3), z2 = (v: number) => komma(v, 2);
  const fehlerText = (f: { fehler: string }) => f.fehler === 'zwei-antworten' ? L('Das Rasch-Modell braucht Aufgaben mit genau zwei Antworten: 0 (falsch) und 1 (richtig). Diese Spalten haben andere Werte.', 'The Rasch model needs tasks with exactly two answers: 0 (wrong) and 1 (right). These columns have other values.')
    : f.fehler === 'zu-wenig-aufgaben' ? L('Es braucht mindestens drei Aufgaben.', 'At least three tasks are needed.')
    : f.fehler === 'zu-viele-aufgaben' ? L('Mehr als 60 Aufgaben rechnet Statable nicht.', 'Statable does not calculate more than 60 tasks.')
    : f.fehler === 'zu-wenig-personen' ? L('Zu wenige Personen mit gemischten Antworten (nicht alles falsch, nicht alles richtig).', 'Too few people with mixed answers (not all wrong, not all right).')
    : f.fehler === 'aufgabe-ohne-streuung' ? L('Eine Aufgabe wurde von allen (mit gemischten Antworten) gleich beantwortet: Ohne Streuung lässt sich ihre Schwierigkeit nicht schätzen. Diese Aufgabe weglassen.', 'One task was answered the same by everyone (with mixed answers): without variation its difficulty cannot be estimated. Leave this task out.')
    : L('Die Schätzung konvergiert nicht (die Aufgaben passen schlecht zusammen).', 'The estimation does not converge (the tasks fit together badly).');
  const aus = (v: number) => v < 0.7 || v > 1.3;
  /** Lange Namen in der Mitte kürzen: der Schluss („… Tun: schreien“) unterscheidet die Aufgaben. */
  const mitte = (t: string, max = 44) => (t.length <= max ? t : `${t.slice(0, Math.ceil(max / 2) - 2).trimEnd()} … ${t.slice(t.length - Math.floor(max / 2) + 2).trimStart()}`);
  /* Wright-Karte: Personen (Balken je Rohwert bei ihrem Wert) und Aufgaben auf derselben Achse */
  const W = 560, T0 = 24, U0 = 24, X0 = 70, ZEILE = 15;
  /* Viele Aufgaben: das ganze Bild wird höher, damit jeder Name eine eigene Zeile hat (Meldung 01.11.). */
  const H = $derived(Math.max(360, T0 + U0 + (r?.aufgabe.length ?? 0) * ZEILE));
  const karte = $derived.by(() => {
    if (!r) return null;
    const th = r.werte.filter(w => w.theta !== null).map(w => w.theta!), bs = r.aufgabe.map(a => a.schwierigkeit);
    const lo = Math.floor(Math.min(kleinste([...th, ...bs])) - 0.5), hi = Math.ceil(Math.max(groesste([...th, ...bs])) + 0.5), Y = (v: number) => T0 + (H - T0 - U0) * (1 - (v - lo) / (hi - lo));
    const nmax = Math.max(...r.werte.map(w => w.n), 1);
    const ziel = bs.map(Y), namen = spreize(ziel, ZEILE, T0 + 4, H - U0 - 4);
    return { lo, hi, Y, nmax, namen };
  });
  const bt = $derived(r && karte ? bildtext('sonstiges', {
    artName: L('Wright-Karte (Rasch-Modell)', 'Wright map (Rasch model)'), titel: L('Personen und Aufgaben auf derselben Achse', 'People and tasks on the same axis'),
    yAchse: { name: L('Fähigkeit und Schwierigkeit (Logit)', 'Ability and difficulty (logit)'), von: karte.lo, bis: karte.hi },
    saetze: [L(`Links die Personen nach Rohwert (Balken, ${r.personen} Personen), rechts die ${r.aufgaben} Aufgaben nach Schwierigkeit. Die Einzelwerte stehen in den beiden Tabellen darüber.`, `On the left the people by raw score (bars, ${r.personen} people), on the right the ${r.aufgaben} tasks by difficulty. The individual values are in the two tables above.`)]
  }) : null);
</script>

{#if daten?.ok && daten.zeilen.length}
<details class="auf" style="margin-top:var(--a4)"><summary>{L('Rasch-Modell: Passen die Aufgaben zusammen?', 'Rasch model: do the tasks fit together?')}</summary>
  <p class="heft-text">{L('Für Tests mit richtig/falsch-Aufgaben. Das Rasch-Modell schätzt gleichzeitig, wie schwer jede Aufgabe ist und wie fähig jede Person ist, und prüft, ob alle Aufgaben dieselbe Fähigkeit messen. Es zeigt, welche Aufgaben aus dem Rahmen fallen.', 'For tests with right/wrong tasks. The Rasch model estimates at the same time how hard each task is and how able each person is, and checks whether all tasks measure the same ability. It shows which tasks fall out of line.')}</p>
  <p class="hilfe"><HilfeLink id="rasch-modell" text={L('Hilfe: Rasch-Modell', 'Help: Rasch model')} /></p>
  <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft || !daten}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{L(`Rasch-Modell mit ${fragen.length} Aufgaben rechnen`, `Calculate the Rasch model with ${fragen.length} tasks`)}{/if}</button></div>
  {#if res && 'fehler' in res}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
  {:else if r}
    <p class="heft-text" role="status">{L(`${r.personen} Personen, davon ${r.mitInfo} mit gemischten Antworten (nur sie tragen zur Schätzung bei); ${r.aufgaben} Aufgaben.`, `${r.personen} people, of whom ${r.mitInfo} with mixed answers (only they contribute to the estimation); ${r.aufgaben} tasks.`)}</p>
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Aufgaben: Schwierigkeit und Passung', 'Tasks: difficulty and fit')}</b></caption>
      <thead><tr><th scope="col">{L('Aufgabe', 'Task')}</th><th scope="col">{L('Anteil richtig', 'Share right')}</th><th scope="col">{L('Schwierigkeit', 'Difficulty')}</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">Infit</th><th scope="col">Outfit</th><th scope="col">p (χ²)</th></tr></thead>
      <tbody>{#each r.aufgabe as a, i (i)}<tr><th scope="row" style="text-align: start">{name(fragen[i]!)}</th><td style="text-align:right">{komma(a.anteil * 100, 0)} %</td><td style="text-align:right">{z2(a.schwierigkeit)}</td><td style="text-align:right">{z2(a.se)}</td><td style="text-align:right;{aus(a.infit) ? 'font-weight:700;color:var(--fehler, #b3261e)' : ''}">{z2(a.infit)}{aus(a.infit) ? ' *' : ''}</td><td style="text-align:right;{aus(a.outfit) ? 'font-weight:700;color:var(--fehler, #b3261e)' : ''}">{z2(a.outfit)}{aus(a.outfit) ? ' *' : ''}</td><td style="text-align:right">{pWert(a.p).replace(/^= /, '')}</td></tr>{/each}</tbody>
    </table></div>
    <p class="heft-text">{r.aufgabe.some(a => aus(a.infit) || aus(a.outfit)) ? L('Mit * markierte Werte (zusätzlich fett und rot) liegen außerhalb von 0,7 bis 1,3: Diese Aufgaben passen schlecht zum Modell (zu zufällig beantwortet oder zu vorhersagbar). Prüfen, ob die Aufgabe missverständlich ist oder etwas anderes misst.', 'Values marked with * (also bold and red) lie outside 0.7 to 1.3: these tasks fit the model badly (answered too randomly or too predictably). Check whether the task is ambiguous or measures something else.') : L('Alle Infit- und Outfit-Werte liegen zwischen 0,7 und 1,3: Keine Aufgabe fällt auf.', 'All infit and outfit values lie between 0.7 and 1.3: no task stands out.')}</p>
    {#if r.lr}<p class="heft-text">{L(`Andersen-Test (Personen mit niedrigem und hohem Rohwert getrennt, ${r.lr.nUnten} und ${r.lr.nOben} Personen): χ²(${r.lr.df}) = ${z3(r.lr.lr)}, p ${pWert(r.lr.p)}.`, `Andersen test (people with low and high raw score separately, ${r.lr.nUnten} and ${r.lr.nOben} people): χ²(${r.lr.df}) = ${z3(r.lr.lr)}, p ${pWert(r.lr.p)}.`)} {r.lr.p < 0.05 ? L('Die Schwierigkeiten unterscheiden sich zwischen den beiden Gruppen: Das Modell gilt nicht für alle gleich.', 'The difficulties differ between the two groups: the model does not hold equally for everyone.') : L('Kein Hinweis, dass sich die Schwierigkeiten zwischen den Gruppen unterscheiden.', 'No sign that the difficulties differ between the groups.')}</p>{/if}
    {#if r.reliabilitaet !== null}<p class="heft-text">{L(`Personentrennung (Reliabilität): ${z2(r.reliabilitaet)}.`, `Person separation (reliability): ${z2(r.reliabilitaet)}.`)}</p>{/if}
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Personenwerte je Rohwert', 'Person values by raw score')}</b></caption>
      <thead><tr><th scope="col">{L('Rohwert (richtige Aufgaben)', 'Raw score (tasks right)')}</th><th scope="col">{L('Personen', 'People')}</th><th scope="col">{L('Fähigkeit', 'Ability')}</th><th scope="col">{L('Standardfehler', 'Standard error')}</th></tr></thead>
      <tbody>{#each r.werte as w (w.roh)}<tr><th scope="row" style="text-align: start">{w.roh}</th><td style="text-align:right">{w.n}</td><td style="text-align:right">{w.theta === null ? '-' : z2(w.theta)}</td><td style="text-align:right">{w.se === null ? '-' : z2(w.se)}</td></tr>{/each}</tbody>
    </table></div>
    {#if r.werte[0]!.n + r.werte[r.aufgaben]!.n > 0}<p class="heft-text" style="color:var(--tinte-2)">{L(`${r.werte[0]!.n} Personen ohne eine richtige und ${r.werte[r.aufgaben]!.n} mit allen richtig haben keinen Fähigkeitswert: Aus so einem Ergebnis lässt sich nur sagen, dass die Fähigkeit unter bzw. über dem Bereich der Aufgaben liegt.`, `${r.werte[0]!.n} people with no task right and ${r.werte[r.aufgaben]!.n} with all right have no ability value: from such a result one can only say that the ability lies below or above the range of the tasks.`)}</p>{/if}
    {#if karte}
      <DiagrammExport titel={L('Wright-Karte: Personen und Aufgaben', 'Wright map: people and tasks')}>
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz ?? ''} style="max-width:{W}px">
          {#each achsenMarken(karte.lo, karte.hi) as v}<line x1={X0} x2={W - 20} y1={karte.Y(v)} y2={karte.Y(v)} stroke="var(--dg-gitter)" /><text x={X0 - 8} y={karte.Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
          <line x1={W / 2} x2={W / 2} y1={T0} y2={H - U0} stroke="var(--tinte-2, #666)" />
          {#each r.werte.filter(w => w.theta !== null) as w (w.roh)}<rect x={W / 2 - 8 - (w.n / karte.nmax) * (W / 2 - X0 - 20)} y={karte.Y(w.theta!) - 6} width={(w.n / karte.nmax) * (W / 2 - X0 - 20)} height="12" fill="var(--dg-a)"><title>{w.roh}: {w.n}</title></rect>{/each}
          {#each r.aufgabe as a, i (i)}<line x1={W / 2 + 14} y1={karte.Y(a.schwierigkeit)} x2={W / 2 + 20} y2={karte.namen[i]!} stroke="var(--dg-gitter)" /><circle cx={W / 2 + 14} cy={karte.Y(a.schwierigkeit)} r="4" fill={aus(a.infit) || aus(a.outfit) ? 'var(--fehler, #b3261e)' : 'var(--dg-b, var(--dg-a))'}><title>{name(fragen[i]!)}</title></circle><text x={W / 2 + 22} y={karte.namen[i]! + 4} class="klein"><title>{name(fragen[i]!)}</title>{mitte(name(fragen[i]!))}</text>{/each}
          <text x={X0 + 10} y={T0 - 6} class="klein">{L('Personen', 'People')}</text><text x={W / 2 + 14} y={T0 - 6} class="klein">{L('Aufgaben', 'Tasks')}</text>
          <YTitel x={14} y={(T0 + H - U0) / 2} laenge={H - T0 - U0} text={L('Fähigkeit und Schwierigkeit (Logit)', 'Ability and difficulty (logit)')} px={13} klasse="klein" />
        </svg>
      </DiagrammExport>
      {#if bt}<BildBeschreibung {...bt} />{/if}
    {/if}
    <p class="heft-text" style="color:var(--tinte-2)">{L('Das Rasch-Modell nimmt an, dass alle Aufgaben gleich gut zwischen fähigeren und weniger fähigen Personen trennen und dass Raten keine Rolle spielt. Mit weniger als etwa 100 Personen oder 4 Aufgaben sind die Schätzungen unsicher. Die Schwierigkeiten sind so verschoben, dass ihre Summe 0 ist; sie gelten nur relativ zueinander. Die Grenzen 0,7 und 1,3 sind eine Faustregel, kein Test.', 'The Rasch model assumes that all tasks separate equally well between more and less able people and that guessing plays no role. With fewer than about 100 people or 4 tasks the estimates are uncertain. The difficulties are shifted so that they sum to 0; they hold only relative to each other. The limits 0.7 and 1.3 are a rule of thumb, not a test.')}</p>
  {/if}
</details>
{/if}
