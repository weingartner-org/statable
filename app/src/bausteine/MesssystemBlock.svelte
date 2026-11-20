<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import { kursSprung } from '../lib/kursziel';
  /** Messsystemanalyse (Gauge R&R) unter der zweifaktoriellen Varianzanalyse (S-I): ein Faktor sind die Teile, der andere die Prüfenden. Rechnet im Browser (lib/messsystem.ts). */
  import { s, L } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma } from '../lib/ergebnis';
  import { messsystem, urteilRR, type Komponente } from '../lib/messsystem';
  import type { Anova2E } from '../lib/anova2saetze';

  let { e, name, ziel = false }: { e: Anova2E; name: (n: string) => string; ziel?: boolean } = $props();
  const kennung = $props.id();
  let teileSp = $state<'a' | 'b'>('a');
  const tCol = $derived(teileSp === 'a' ? e.aCol : e.bCol), pCol = $derived(teileSp === 'a' ? e.bCol : e.aCol);
  const daten = $derived.by(() => {
    const ix = [tCol, pCol, e.yCol].map(n => s.spalten.findIndex(c => c.name === n));
    if (ix.some(i => i < 0)) return null;
    const cs = ix.map(i => s.spalten[i]!), t: string[] = [], p: string[] = [], y: number[] = [];
    for (const z of s.zeilen) {
      const [a, b, v] = ix.map(i => z[i]!);
      if (typeof v !== 'number' || istFehlend(cs[2]!, v) || a === null || a === undefined || b === null || b === undefined || istFehlend(cs[0]!, a) || istFehlend(cs[1]!, b)) continue;
      t.push(String(a)); p.push(String(b)); y.push(v);
    }
    return { t, p, y };
  });
  const res = $derived(daten ? messsystem(daten.t, daten.p, daten.y) : null);
  const r = $derived(res && !('fehler' in res) ? res : null);
  const knoten: Record<Komponente['name'], () => string> = {
    rr: () => L('Messsystem insgesamt (R&R)', 'Total gauge R&R'), wiederhol: () => L('Wiederholpräzision (Messgerät)', 'Repeatability (equipment)'), vergleich: () => L('Vergleichspräzision (Prüfende)', 'Reproducibility (operators)'),
    pruefende: () => L('Prüfende', 'Operator'), wechsel: () => L('Prüfende × Teile', 'Operator × part'), teile: () => L('Unterschiede zwischen den Teilen', 'Part-to-part'), wdh: () => '', gesamt: () => L('Gesamtstreuung', 'Total variation')
  };
  const z4 = (v: number) => komma(Number(v.toPrecision(4)), 4);
  const urteil = $derived(r ? urteilRR(r.komp.find(k => k.name === 'rr')!.studie) : null);
</script>

<details class="auf" style="margin-top:var(--a4)" open={ziel} use:kursSprung={ziel} data-kurs="messsystem"><summary>{L('Messsystemanalyse (Gauge R&R)', 'Measurement system analysis (gauge R&R)')}</summary>
  <p class="heft-text">{L('Wie viel der gemessenen Streuung kommt vom Messsystem und wie viel von den Teilen selbst? Dafür misst jede Person (Prüfende) jedes Teil mehrmals. Statable zerlegt die Streuung mit der Varianzanalyse in Wiederholpräzision (dasselbe Messgerät, dieselbe Person), Vergleichspräzision (verschiedene Prüfende) und die Unterschiede zwischen den Teilen.', 'How much of the measured variation comes from the measurement system and how much from the parts themselves? For this, each operator measures each part several times. Statable splits the variation with the analysis of variance into repeatability (same equipment, same person), reproducibility (different operators) and the differences between the parts.')}</p>
  <p class="hilfe"><HilfeLink id="messsystemanalyse-gauge-rr" text={L('Hilfe: Messsystemanalyse', 'Help: measurement system analysis')} /></p>
  <fieldset class="segment" style="margin:var(--a2) 0"><legend>{L('Welche Gruppierung nennt die Teile?', 'Which grouping names the parts?')}</legend>
    <label><input type="radio" name="ms-{kennung}" checked={teileSp === 'a'} onchange={() => (teileSp = 'a')} />{name(e.aCol)}</label>
    <label><input type="radio" name="ms-{kennung}" checked={teileSp === 'b'} onchange={() => (teileSp = 'b')} />{name(e.bCol)}</label>
  </fieldset>
  {#if res && 'fehler' in res}
    <p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{res.fehler === 'unausgewogen' ? L('Jede Kombination aus Teil und Prüfenden braucht gleich viele Messungen.', 'Every combination of part and operator needs the same number of measurements.') : res.fehler === 'wenig-wiederholungen' ? L('Jedes Teil muss von jeder Person mindestens zweimal gemessen werden.', 'Each part must be measured at least twice by each operator.') : res.fehler === 'keine-streuung' ? L('Die Werte streuen nicht.', 'The values do not vary.') : L('Zu wenige Messungen.', 'Too few measurements.')}</p>
  {:else if r}
    <p class="heft-text" use:ergebnisAnsage>{L(`${r.teile} Teile, ${r.pruefende} Prüfende, ${r.wdh} Wiederholungen.`, `${r.teile} parts, ${r.pruefende} operators, ${r.wdh} repetitions.`)} {r.mitWechsel ? L('Die Wechselwirkung Prüfende × Teile ist auffällig und bleibt im Modell.', 'The operator × part interaction is notable and stays in the model.') : L('Die Wechselwirkung Prüfende × Teile ist nicht auffällig und wird in den Fehler eingerechnet.', 'The operator × part interaction is not notable and is pooled into the error.')}</p>
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Zerlegung der Streuung', 'Breakdown of the variation')}</b></caption>
      <thead><tr><th scope="col">{L('Quelle', 'Source')}</th><th scope="col">{L('Varianz', 'Variance')}</th><th scope="col">{L('Standardabweichung', 'Standard deviation')}</th><th scope="col">{L('Anteil an der Varianz (%)', 'Share of the variance (%)')}</th><th scope="col">{L('Anteil an der Streuung (%)', 'Share of the variation (%)')}</th></tr></thead>
      <tbody>{#each r.komp as k (k.name)}<tr><th scope="row" style="text-align: start">{knoten[k.name]()}</th><td style="text-align:right">{z4(k.var)}</td><td style="text-align:right">{z4(k.sd)}</td><td style="text-align:right">{komma(k.beitrag, 2)}</td><td style="text-align:right">{komma(k.studie, 2)}</td></tr>{/each}</tbody>
    </table></div>
    {#if urteil}
      {@const rr = r.komp.find(k => k.name === 'rr')!}
      <p class="heft-text">{L(`Das Messsystem macht ${komma(rr.studie, 1)} % der Gesamtstreuung aus:`, `The measurement system accounts for ${komma(rr.studie, 1)}% of the total variation:`)} {urteil === 'gut' ? L('gut brauchbar (Faustregel: unter 10 %).', 'acceptable (rule of thumb: under 10%).') : urteil === 'bedingt' ? L('bedingt brauchbar (Faustregel: 10 bis 30 %).', 'conditionally acceptable (rule of thumb: 10 to 30%).') : L('nicht brauchbar (Faustregel: über 30 %).', 'not acceptable (rule of thumb: over 30%).')} {Number.isFinite(r.ndc) ? L(`Es unterscheidet ${r.ndc} Gruppen von Teilen (Faustregel: mindestens 5).`, `It distinguishes ${r.ndc} groups of parts (rule of thumb: at least 5).`) : L('Es unterscheidet sehr viele Gruppen von Teilen (Faustregel: mindestens 5).', 'It distinguishes very many groups of parts (rule of thumb: at least 5).')}</p>
    {/if}
    <p class="heft-text" style="color:var(--tinte-2)">{L('Aussagekräftig wird das erst mit etwa 10 Teilen, 3 Prüfenden und 2 bis 3 Wiederholungen; die Teile sollten den ganzen Bereich abdecken, den das Verfahren später messen soll. Die Streuung der Teile steht hier nicht für die Fertigung, sondern für die Auswahl der Teile.', 'It becomes meaningful only with about 10 parts, 3 operators and 2 to 3 repetitions; the parts should cover the whole range the method will later measure. The variation of the parts here does not stand for production, but for the choice of parts.')}</p>
  {/if}
</details>
