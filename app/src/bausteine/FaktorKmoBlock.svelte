<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /** Faktorenanalyse: KMO je Frage (MSA) und Determinante der Korrelationsmatrix. Rechnet im Browser (lib/kmofrage.ts) mit denselben Personen wie PSPP (listenweise). */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L, Lp } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma, ohneNull } from '../lib/ergebnis';
  import { kmoJeFrage } from '../lib/kmofrage';

  let { fragen, name }: { fragen: string[]; name: (n: string) => string } = $props();
  const daten = $derived.by(() => {
    const ix = fragen.map(n => s.spalten.findIndex(c => c.name === n));
    if (ix.some(i => i < 0)) return null;
    const cs = ix.map(i => s.spalten[i]!), zeilen: number[][] = [];
    for (const z of s.zeilen) { const r = ix.map(i => z[i]); if (r.some((v, k) => typeof v !== 'number' || istFehlend(cs[k]!, v as number))) continue; zeilen.push(r as number[]); }
    return zeilen;
  });
  const res = $derived(daten ? kmoJeFrage(daten) : null);
  const r = $derived(res && !('fehler' in res) ? res : null);
  const wort = (k: number) => (k >= 0.9 ? L('sehr gut', 'excellent') : k >= 0.8 ? L('gut', 'good') : k >= 0.7 ? L('mittel', 'middling') : k >= 0.6 ? L('mäßig', 'mediocre') : k >= 0.5 ? L('schwach', 'poor') : L('ungeeignet', 'unacceptable'));
  const rund = (v: number) => Number(v.toFixed(2));   // wie angezeigt: ,4996 wird ,50 und ist dann nicht „unter ,50“
  const schlecht = $derived(r ? r.msa.map((v, i) => ({ v, i })).filter(x => rund(x.v) < 0.5) : []);
  const det = $derived(r ? (r.determinante < 0.00001 ? L('< ,00001', '< .00001') : ohneNull(r.determinante, r.determinante < 0.001 ? 5 : 3)) : '');
</script>

{#if r}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Passt jede Frage zu den anderen? (KMO je Frage, Determinante)', 'Does each question fit the others? (KMO per question, determinant)')}</summary>
    <p class="heft-text">{L('Das KMO-Maß insgesamt (Gesamt-KMO) sagt, ob die Fragen insgesamt für eine Faktorenanalyse taugen. Das KMO je Frage (MSA, Measure of Sampling Adequacy, die Diagonale der Anti-Image-Korrelationsmatrix) zeigt, welche einzelne Frage schlecht zu den anderen passt: Sie hängt kaum mit ihnen zusammen. Werte ab ,50 sind brauchbar, ab ,70 gut.', 'The overall KMO measure says whether the questions are suited for a factor analysis as a whole. The KMO per question (MSA, measure of sampling adequacy, the diagonal of the anti-image correlation matrix) shows which single question fits the others badly: it hardly correlates with them. Values from .50 are usable, from .70 good.')} <HilfeLink id="kmo" text={L('Hilfe: KMO', 'Help: KMO')} /></p>
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L(`KMO je Frage (Gesamt-KMO ${ohneNull(r.kmo)}, ${r.n} Personen mit allen Antworten)`, `KMO per question (overall KMO ${ohneNull(r.kmo)}, ${r.n} people with all answers)`)}</b></caption>
      <thead><tr><th scope="col">{L('Frage', 'Question')}</th><th scope="col">KMO (MSA)</th><th scope="col">{L('Einordnung', 'Rating')}</th></tr></thead>
      <tbody>{#each fragen as f, i (i)}<tr><th scope="row" style="text-align: start">{name(f)}</th><td style="text-align:right">{rund(r.msa[i]!) < 0.5 ? '▼ ' : ''}{ohneNull(r.msa[i]!)}</td><td>{wort(rund(r.msa[i]!))}</td></tr>{/each}</tbody>
    </table></div>
    {#if schlecht.length}
      <p class="heft-text" use:ergebnisAnsage>{Lp(schlecht.length, `${schlecht.map(x => name(fragen[x.i]!)).join(', ')}: Diese Frage passt schlecht zu den anderen (KMO unter ,50). Sie ist ein Kandidat zum Streichen; danach die Faktorenanalyse neu rechnen. Erst fachlich prüfen: Streichen, was inhaltlich dazugehört, ändert, was die Skala misst.`, `${schlecht.map(x => name(fragen[x.i]!)).join(', ')}: Diese Fragen passen schlecht zu den anderen (KMO unter ,50). Sie sind Kandidaten zum Streichen; danach die Faktorenanalyse neu rechnen. Erst fachlich prüfen: Streichen, was inhaltlich dazugehört, ändert, was die Skala misst.`, `${schlecht.map(x => name(fragen[x.i]!)).join(', ')}: this question fits the others badly (KMO below .50). It is a candidate for dropping; then recalculate the factor analysis. Check the content first: dropping what belongs to the topic changes what the scale measures.`, `${schlecht.map(x => name(fragen[x.i]!)).join(', ')}: these questions fit the others badly (KMO below .50). They are candidates for dropping; then recalculate the factor analysis. Check the content first: dropping what belongs to the topic changes what the scale measures.`)}</p>
    {:else}
      <p class="heft-text">{L('Keine Frage liegt unter ,50: Jede passt zu den anderen.', 'No question is below .50: each fits the others.')}</p>
    {/if}
    <p class="heft-text">{L(`Determinante der Korrelationsmatrix: ${det}.`, `Determinant of the correlation matrix: ${det}.`)} {r.determinante < 0.00001 ? L('Das ist sehr klein: Einige Fragen hängen extrem stark zusammen (fast doppelte Fragen). Eine davon weglassen oder die beiden zusammenfassen.', 'That is very small: some questions are extremely strongly related (almost duplicate questions). Drop one of them or combine the two.') : L('Über ,00001: Keine Frage ist fast eine Kopie einer anderen. Je näher an 0, desto stärker hängen die Fragen zusammen.', 'Above .00001: no question is almost a copy of another. The closer to 0, the more strongly the questions are related.')}</p>
  </details>
{:else if res && 'fehler' in res && res.fehler !== 'zu-wenig-faelle'}
  <p class="heft-text" style="margin-top:var(--a4)">{res.fehler === 'konstant' ? L('KMO je Frage: Eine Frage hat bei allen Personen dieselbe Antwort, die Rechnung ist nicht möglich.', 'KMO per question: one question has the same answer for all people, the calculation is not possible.') : L('KMO je Frage: Zwei Fragen sind vollständig voneinander abhängig (Determinante 0), die Rechnung ist nicht möglich. Eine davon weglassen.', 'KMO per question: two questions fully depend on each other (determinant 0), the calculation is not possible. Drop one of them.')}</p>
{/if}
