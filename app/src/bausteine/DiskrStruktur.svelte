<script lang="ts">
  /** Unter dem Ergebnis der Diskriminanzanalyse (Field-Stufe 3): Strukturmatrix (Korrelationen innerhalb der Gruppen zwischen Zielgrößen und Funktionswerten), Anteil je Funktion
   *  und das Diagramm der Funktionswerte (Funktion 1 gegen 2) mit den Gruppenzentroiden als großen Punkten. Rechnet im Browser (lib/manovafolge.ts), Zahlen gegen R geprüft. */
  import GruppenStreudiagramm from './GruppenStreudiagramm.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { komma, ohneNull } from '../lib/ergebnis';
  import type { DiskrE } from '../lib/diskriminanz';
  import { folgeDaten, diskrFunktionen } from '../lib/manovafolge';
  import { STREU_GRUPPEN_MAX, type GruppenStreu } from '../lib/streugruppen';
  import { form } from '../lib/fragediagramm';

  let { e, name }: { e: DiskrE; name: (n: string) => string } = $props();
  const dt = $derived(folgeDaten(e.gruppe, e.merkmale, s.zeilen, s.spalten));
  const f = $derived(dt ? diskrFunktionen(dt) : null);
  const m = $derived(f ? f.eigen.length : 0);
  const fn = (j: number) => L(`Funktion ${j + 1}`, `Function ${j + 1}`);
  const r3 = (v: number) => ohneNull(v, 3);
  const proz = (v: number) => komma(v * 100, 1);
  /** Je Funktion die Zielgrößen mit dem größten Betrag der Struktur-Korrelation (ab ,30; höchstens drei). */
  const treiber = $derived(f ? f.eigen.map((_, j) => e.merkmale.map((mk, i) => ({ mk, r: f.struktur[i]![j]! })).filter(x => Math.abs(x.r) >= 0.3).sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 3)) : []);
  const zeigeBild = $derived(!!dt && !!f && m >= 2 && dt.je.length <= STREU_GRUPPEN_MAX);
  const bild = $derived.by((): { d: GruppenStreu; zentroide: { i: number; x: number; y: number }[] } | null => {
    if (!zeigeBild || !dt || !f) return null;
    const punkte = f.werte.map((w, r): [number, number, number] => [w[0]!, w[1]!, dt.grp[r]!]);
    return {
      d: { gruppen: dt.stufen.map((nm, g) => ({ name: nm, n: dt.je[g]!, a: null, b: null, r: null })), punkte, ausgelassen: 0, loess: [] },
      zentroide: f.zentroide.map((z, i) => ({ i, x: z[0]!, y: z[1]! }))
    };
  });
  const formName = (i: number) => [L('Kreis', 'circle'), L('Quadrat', 'square'), L('Dreieck', 'triangle'), L('Raute', 'diamond')][['kreis', 'quadrat', 'dreieck', 'raute'].indexOf(form(i))]!;
  const zusatzSaetze = $derived(f && dt ? [L(`Die großen Punkte sind die Gruppenzentroide, also die Mittel der Funktionswerte je Gruppe. Der Anteil der Trennung liegt bei Funktion 1 bei ${proz(f.anteil[0]!)} %, bei Funktion 2 bei ${proz(f.anteil[1]!)} %.`, `The large points are the group centroids, that is the means of the function values per group. The share of the separation is ${proz(f.anteil[0]!)}% for function 1 and ${proz(f.anteil[1]!)}% for function 2.`)] : []);
  const zusatzTabellen = $derived(f && dt ? [{ titel: L('Gruppenzentroide', 'Group centroids'), kopf: [L('Gruppe (Form)', 'Group (shape)'), fn(0), fn(1)], zeilen: f.zentroide.map((z, i) => [`${dt.stufen[i]} (${formName(i)})`, komma(z[0]!, 3), komma(z[1]!, 3)]) }] : []);
</script>

{#if f && dt}
  <details class="auf" style="margin-top:var(--a4)" open><summary>{L('Welche Zielgrößen tragen die Funktionen? (Strukturmatrix) und Diagramm der Funktionswerte', 'Which outcomes carry the functions? (structure matrix) and plot of the function values')}</summary>
    <p class="heft-text">{L('Die Strukturmatrix zeigt, wie eng jede Zahl mit dem Funktionswert zusammenhängt (Korrelation innerhalb der Gruppen). Sie sagt, wofür eine Funktion steht. Die standardisierten Koeffizienten oben sagen dagegen, welchen eigenen Beitrag eine Zahl neben den anderen leistet. Bei eng zusammenhängenden Zahlen können beide verschieden aussehen.', 'The structure matrix shows how closely each number is related to the function value (correlation within the groups). It tells what a function stands for. The standardized coefficients above tell instead what own contribution a number makes beside the others. With closely related numbers the two can look different.')}</p>
    <p class="hilfe"><HilfeLink id="frage-diskriminanz" text={L('Hilfe: Diskriminanzanalyse lesen und berichten', 'Help: reading and reporting a discriminant analysis')} /></p>
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Strukturmatrix: Korrelationen innerhalb der Gruppen', 'Structure matrix: correlations within the groups')}</b></caption>
      <thead><tr><th scope="col">{L('Zielgröße', 'Outcome')}</th>{#each f.eigen as _, j (j)}<th scope="col">{fn(j)}</th>{/each}</tr></thead>
      <tbody>
        {#each e.merkmale as mk, i (mk)}<tr><th scope="row" style="text-align: start">{name(mk)}</th>{#each f.eigen as _, j (j)}<td style="text-align:right">{r3(f.struktur[i]![j]!)}</td>{/each}</tr>{/each}
        <tr><th scope="row" style="text-align: start">{L('Anteil der Trennung (%)', 'Share of the separation (%)')}</th>{#each f.anteil as a, j (j)}<td style="text-align:right">{proz(a)}</td>{/each}</tr>
      </tbody>
    </table></div>
    {#each treiber as t, j (j)}{#if t.length}<p class="heft-text">{L(`${fn(j)}: am engsten verbunden mit ${t.map(x => `${name(x.mk)} (r = ${komma(x.r, 2)})`).join(', ')}.`, `${fn(j)}: most closely related to ${t.map(x => `${name(x.mk)} (r = ${komma(x.r, 2)})`).join(', ')}.`)}</p>{/if}{/each}
    <p class="heft-text">{L('Das Vorzeichen einer Funktion ist willkürlich (SPSS kann das umgekehrte zeigen); wichtig ist der Betrag. Als Faustregel zählt ab |r| = ,30 eine Zahl zur Funktion.', 'The sign of a function is arbitrary (SPSS may show the opposite one); what matters is the size. As a rule of thumb a number belongs to the function from |r| = .30.')}</p>
    {#if bild}
      <GruppenStreudiagramm d={bild.d} xText={`${fn(0)} (${proz(f.anteil[0]!)} %)`} yText={`${fn(1)} (${proz(f.anteil[1]!)} %)`} geraden={false} zentroide={bild.zentroide} {zusatzSaetze} {zusatzTabellen} />
    {:else if m < 2}
      <p class="heft-text">{L('Mit zwei Gruppen gibt es nur eine Funktion; ein Diagramm von Funktion 1 gegen 2 entfällt.', 'With two groups there is only one function; a plot of function 1 against 2 is omitted.')}</p>
    {:else}
      <p class="heft-text">{L(`Das Diagramm zeigt höchstens ${STREU_GRUPPEN_MAX} Gruppen, weil sich mehr nicht sicher an der Form unterscheiden lassen. Die Gruppenzentroide stehen hier als Tabelle.`, `The plot shows at most ${STREU_GRUPPEN_MAX} groups, because more cannot be told apart reliably by shape. The group centroids are given here as a table.`)}</p>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0"><caption><b>{L('Gruppenzentroide', 'Group centroids')}</b></caption><thead><tr><th scope="col">{L('Gruppe', 'Group')}</th>{#each f.eigen as _, j (j)}<th scope="col">{fn(j)}</th>{/each}</tr></thead><tbody>{#each f.zentroide as z, i (i)}<tr><th scope="row" style="text-align: start">{dt.stufen[i]}</th>{#each z as v (v)}<td style="text-align:right">{komma(v, 3)}</td>{/each}</tr>{/each}</tbody></table></div>
    {/if}
  </details>
{/if}
