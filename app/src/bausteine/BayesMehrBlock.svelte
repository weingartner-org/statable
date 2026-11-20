<script lang="ts">
  /** Bayes-Faktoren für die zweifaktorielle Varianzanalyse (S-H): alle Modelle aus den Haupteffekten und der Wechselwirkung (lib/bayesmehr.ts). Nur wenn „Bayes-Faktoren zeigen“ in den Einstellungen an ist. */
  import { s, L } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma } from '../lib/ergebnis';
  import { bayesMehrfaktor } from '../lib/bayesmehr';
  import { bfStufe, type BfStufe } from '../lib/bayes';
  import { bfText } from '../lib/bayessaetze';
  import type { Anova2E } from '../lib/anova2saetze';

  let { e, name }: { e: Anova2E; name: (n: string) => string } = $props();
  const daten = $derived.by(() => {
    const ix = [e.yCol, e.aCol, e.bCol].map(n => s.spalten.findIndex(c => c.name === n));
    if (ix.some(i => i < 0)) return null;
    const cs = ix.map(i => s.spalten[i]!), y: number[] = [], a: string[] = [], b: string[] = [];
    for (const z of s.zeilen) {
      const [v, p, q] = ix.map(i => z[i]!);
      if (typeof v !== 'number' || istFehlend(cs[0]!, v) || p === null || p === undefined || q === null || q === undefined || istFehlend(cs[1]!, p) || istFehlend(cs[2]!, q)) continue;
      y.push(v); a.push(String(p)); b.push(String(q));
    }
    const code = (w: string[]) => { const m = new Map<string, number>(); return w.map(x => { if (!m.has(x)) m.set(x, m.size); return m.get(x)!; }); };
    return { y, a: code(a), b: code(b) };
  });
  const res = $derived(daten && s.einst.bayes ? bayesMehrfaktor(daten.y, daten.a, daten.b) : null);
  const r = $derived(res && !('fehler' in res) ? res : null);
  const wort = (st: BfStufe) => st === 'anekdotisch' ? L('anekdotische', 'anecdotal') : st === 'moderat' ? L('moderate', 'moderate') : st === 'stark' ? L('starke', 'strong') : st === 'sehr-stark' ? L('sehr starke', 'very strong') : L('extreme', 'extreme');
  const modellName = (m: string) => m.replace(/A:B/g, '\u0001').replace(/\bA\b/g, name(e.aCol)).replace(/\bB\b/g, name(e.bCol)).replace(/\u0001/g, `${name(e.aCol)} × ${name(e.bCol)}`);
  const zeile = (effekt: string, bf: number) => {
    const { stufe, fuer } = bfStufe(bf), t = `BF = ${bfText(bf >= 1 ? bf : 1 / bf)}`;
    if (fuer === 'keins' || bfText(bf >= 1 ? bf : 1 / bf) === bfText(1)) return L(`${effekt}: ${t} - weder Evidenz dafür noch dagegen.`, `${effekt}: ${t} - neither evidence for nor against.`);
    return fuer === 'H1' ? L(`${effekt}: ${t} - ${wort(stufe)} Evidenz für einen Effekt.`, `${effekt}: ${t} - ${wort(stufe)} evidence for an effect.`) : L(`${effekt}: ${t} - ${wort(stufe)} Evidenz gegen einen Effekt.`, `${effekt}: ${t} - ${wort(stufe)} evidence against an effect.`);
  };
</script>

{#if s.einst.bayes}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Bayes-Faktoren der zweifaktoriellen Varianzanalyse', 'Bayes factors of the two-way analysis of variance')}</summary>
    <p class="heft-text">{L('Der Bayes-Faktor sagt, wie viel besser ein Modell die Daten erklärt als ein anderes. Hier stehen alle Modelle aus den beiden Faktoren und ihrer Wechselwirkung gegen das Modell ohne Effekte, dazu der Vergleich für jeden Effekt einzeln.', 'The Bayes factor says how much better one model explains the data than another. Here are all models made of the two factors and their interaction against the model without effects, plus the comparison for each effect on its own.')}</p>
    {#if res && 'fehler' in res}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{res.fehler === 'leer' ? L('Jede Kombination der beiden Faktoren braucht mindestens eine Person.', 'Every combination of the two factors needs at least one person.') : res.fehler === 'stufen' ? L('Beide Faktoren brauchen mindestens zwei Stufen.', 'Both factors need at least two levels.') : L('Zu wenige Personen.', 'Too few people.')}</p>
    {:else if r}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Modelle gegen das Nullmodell', 'Models against the null model')}</b></caption>
        <thead><tr><th scope="col">{L('Modell', 'Model')}</th><th scope="col">BF₁₀</th></tr></thead>
        <tbody>{#each r.modelle as m (m.name)}<tr><th scope="row" style="text-align: start">{modellName(m.name)}</th><td style="text-align:right">{bfText(m.bf10)}</td></tr>{/each}</tbody>
      </table></div>
      <ul class="heft-text">
        <li>{zeile(name(e.aCol), r.a)}</li><li>{zeile(name(e.bCol), r.b)}</li><li>{zeile(`${name(e.aCol)} × ${name(e.bCol)}`, r.wechsel)}</li>
      </ul>
      <p class="heft-text" style="color:var(--tinte-2)">{L(`Gerechnet mit ${r.n} Personen, JZS-Prior mit Skala 0,5 für alle Effekte (wie JASP und das R-Paket BayesFactor). Die Effekt-Zeilen vergleichen das Modell mit beiden Haupteffekten mit dem Modell ohne den Effekt, die Wechselwirkung das volle Modell mit den Haupteffekten. Die Rechnung geschieht durch numerische Integration; R rechnet bei mehreren Effekten mit Zufallsziehungen und weicht darum um etwa ein Prozent ab.`, `Calculated with ${r.n} people, JZS prior with scale 0.5 for all effects (as in JASP and the R package BayesFactor). The effect lines compare the model with both main effects against the model without the effect, the interaction the full model against the main effects. The calculation uses numerical integration; with several effects R uses random draws and therefore differs by about one percent.`)}</p>
    {/if}
  </details>
{/if}
