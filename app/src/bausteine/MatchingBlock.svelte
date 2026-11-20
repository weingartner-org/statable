<script lang="ts">
  /** „Gruppen vergleichbar machen“ (Propensity-Score-Matching) unter dem Ergebnis von „Unterscheiden sich Gruppen?“ mit zwei Gruppen (S-H). Rechnet im Browser (lib/matching.ts), erst auf Klick. */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L, type Blatt } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma, pWert, type ZweiGruppen } from '../lib/ergebnis';
  import { propensityMatching, type MatchErgebnis, type MatchFehler } from '../lib/matching';
  import Rechnet from './Rechnet.svelte';

  let { blatt, e }: { blatt: Blatt; e: ZweiGruppen } = $props();
  const kennung = $props.id();
  const spY = $derived(s.spalten.find(c => c.name === e.abhaengig || c.bezeichnung === e.abhaengig));
  const spG = $derived(s.spalten.find(c => c.name === e.gruppenSpalte || c.bezeichnung === e.gruppenSpalte));
  const kandidaten = $derived(s.spalten.filter(c => c.art === 'zahl' && c.name !== spY?.name && c.name !== spG?.name));
  let behandelt = $state(''), merkmale = $state<string[]>([]), eng = $state(false), laeuft = $state(false), res = $state<MatchErgebnis | MatchFehler | null>(null), ausgelassen = $state(0);
  const gruppenNamen = $derived([e.a.name, e.b.name]);
  $effect(() => { if (!gruppenNamen.includes(behandelt)) behandelt = gruppenNamen[1] ?? ''; });
  $effect(() => { void blatt.id; res = null; });
  const name = (c: { name: string; bezeichnung: string }) => c.bezeichnung.trim() || c.name;
  const umschalten = (n: string, an: boolean) => { merkmale = an ? [...merkmale, n] : merkmale.filter(x => x !== n); res = null; };

  async function rechnen() {
    if (laeuft || !spY || !spG || !merkmale.length) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    const iy = s.spalten.indexOf(spY), ig = s.spalten.indexOf(spG), ix = merkmale.map(n => s.spalten.findIndex(c => c.name === n));
    const label = (v: unknown) => (typeof v === 'number' ? (spG.werteLabels[String(v)] ?? String(v)) : String(v ?? ''));
    const y: number[] = [], b: boolean[] = [], x: number[][] = []; let weg = 0;
    for (const z of s.zeilen) {
      const gy = z[iy], gl = label(z[ig]), vals = ix.map(j => z[j]);
      const gut = typeof gy === 'number' && !istFehlend(spY, gy) && gruppenNamen.includes(gl) && vals.every((v, k) => typeof v === 'number' && !istFehlend(s.spalten[ix[k]!], v));
      if (!gut) { weg++; continue; }
      y.push(gy as number); b.push(gl === behandelt); x.push(vals as number[]);
    }
    ausgelassen = weg;
    res = propensityMatching({ y, behandelt: b, x, namenX: merkmale.map(n => name(s.spalten.find(c => c.name === n)!)) }, eng ? { caliper: 0.2 } : {});
    laeuft = false;
  }
  const ok = $derived(res && !('fehler' in res) ? res : null);
  const fehlerText = (f: MatchFehler) => f.fehler === 'zu-wenig' ? L('Zu wenige Fälle für so viele Merkmale (Faustregel: mindestens 10 plus 5 je Merkmal).', 'Too few cases for so many characteristics (rule of thumb: at least 10 plus 5 per characteristic).')
    : f.fehler === 'eine-gruppe' ? L('Jede Gruppe braucht mindestens zwei Personen mit allen Angaben.', 'Each group needs at least two people with all answers.')
    : f.fehler === 'keine-merkmale' ? L('Mindestens ein Merkmal wählen.', 'Choose at least one characteristic.')
    : f.fehler === 'trennung' ? L('Die Merkmale trennen die Gruppen fast vollständig: Es gibt keine vergleichbaren Personen in der anderen Gruppe. Matching ist hier nicht möglich.', 'The characteristics separate the groups almost completely: there are no comparable people in the other group. Matching is not possible here.')
    : f.fehler === 'keine-paare' ? L('Mit dem engen Abgleich bleiben weniger als zwei Paare übrig. Ohne „Enger Abgleich“ erneut rechnen.', 'With the tight match fewer than two pairs remain. Calculate again without "Tight match".')
    : L('Die Merkmale lassen sich nicht gemeinsam auswerten (eines bestimmt ein anderes vollständig). Eines davon herausnehmen.', 'The characteristics cannot be analysed together (one fully determines another). Leave one out.');
  const smd = (v: number) => komma(Math.abs(v), 2);
</script>

{#if kandidaten.length >= 1 && gruppenNamen.length === 2}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Gruppen vergleichbar machen (Propensity-Matching)', 'Make the groups comparable (propensity matching)')}</summary>
    <p class="heft-text">{L('Wurden die Personen nicht zufällig auf die Gruppen verteilt, unterscheiden sie sich oft schon vorher in anderen Merkmalen. Statable sucht dann zu jeder Person der einen Gruppe eine möglichst ähnliche Person der anderen und vergleicht nur diese Paare. Berücksichtigt werden nur die hier gewählten Merkmale.', 'If people were not assigned to the groups at random, they often already differ in other characteristics. Statable then looks for the most similar person in the other group for each person in one group and compares only these pairs. Only the characteristics chosen here are taken into account.')}</p>
    <p class="hilfe"><HilfeLink id="matching-propensity-score" text={L('Hilfe: Matching', 'Help: matching')} /></p>
    <fieldset class="segment" style="margin:var(--a2) 0"><legend>{L('Welche Gruppe gilt als behandelt?', 'Which group counts as treated?')}</legend>
      {#each gruppenNamen as g (g)}<label><input type="radio" name="mt-g-{kennung}" value={g} checked={behandelt === g} onchange={() => { behandelt = g; res = null; }} />{g}</label>{/each}
    </fieldset>
    <fieldset style="border:0;padding:0;margin:var(--a2) 0"><legend style="font-weight:600">{L('Welche Merkmale sollen ausgeglichen werden?', 'Which characteristics should be balanced?')}</legend>
      {#each kandidaten as c (c.name)}<label class="schalter" style="display:inline-flex;margin-inline-end:var(--a4)"><input type="checkbox" checked={merkmale.includes(c.name)} onchange={(ev) => umschalten(c.name, ev.currentTarget.checked)} />{name(c)}</label>{/each}
    </fieldset>
    <label class="schalter"><input type="checkbox" bind:checked={eng} onchange={() => (res = null)} />{L('Enger Abgleich (nur Paare, deren Scores höchstens 0,2 Standardabweichungen auseinanderliegen)', 'Tight match (only pairs whose scores differ by at most 0.2 standard deviations)')}</label>
    {#if blatt.gewicht}<p class="heft-text" style="color:var(--tinte-2)">{L('Mit Fallgewicht rechnet Statable das Matching nicht.', 'With a case weight Statable does not calculate the matching.')}</p>
    {:else}
      <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft || !merkmale.length}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{L('Paare bilden und vergleichen', 'Form pairs and compare')}{/if}</button></div>
      {#if res && 'fehler' in res}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>{/if}
      {#if ok}
        <p class="heft-text" role="status">{L(`Es entstehen ${ok.paare} Paare (von ${ok.nB} Personen in der behandelten Gruppe; ${ok.ohnePartner} ohne Partner).`, `${ok.paare} pairs are formed (from ${ok.nB} people in the treated group; ${ok.ohnePartner} without a partner).`)}{ausgelassen ? L(` ${ausgelassen} Zeilen mit Lücken sind nicht dabei.`, ` ${ausgelassen} rows with gaps are not included.`) : ''}</p>
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{L('Ausgleich der Merkmale (standardisierte Differenz)', 'Balance of the characteristics (standardized difference)')}</b></caption>
          <thead><tr><th scope="col">{L('Merkmal', 'Characteristic')}</th><th scope="col">{L('vorher', 'before')}</th><th scope="col">{L('nachher', 'after')}</th></tr></thead>
          <tbody>{#each ok.ausgleich as a}<tr><th scope="row" style="text-align: start">{a.name}</th><td style="text-align:right">{smd(a.smdVorher)}</td><td style="text-align:right">{smd(a.smdNachher)}</td></tr>{/each}</tbody>
        </table></div>
        <p class="heft-text">{ok.maxSmdNachher <= 0.1 ? L(`Die Gruppen sind jetzt gut ausgeglichen (größte Differenz ${smd(ok.maxSmdNachher)}, Faustregel: unter 0,1).`, `The groups are now well balanced (largest difference ${smd(ok.maxSmdNachher)}, rule of thumb: below 0.1).`) : L(`Die Gruppen sind noch nicht gut ausgeglichen (größte Differenz ${smd(ok.maxSmdNachher)} statt vorher ${smd(ok.maxSmdVorher)}; Faustregel: unter 0,1). Das Ergebnis unten mit Vorsicht lesen; mehr Merkmale oder ein größerer Datensatz helfen.`, `The groups are still not well balanced (largest difference ${smd(ok.maxSmdNachher)} instead of ${smd(ok.maxSmdVorher)} before; rule of thumb: below 0.1). Read the result below with caution; more characteristics or a larger data set help.`)}</p>
        <p class="heft-text">{L(`Unterschied im Ergebnis zwischen den Paaren: ${komma(ok.att, 2)}, 95 %-KI [${komma(ok.lo, 2)}; ${komma(ok.hi, 2)}], t(${ok.df}) = ${komma(ok.t, 2)}, p ${pWert(ok.p)} (ohne Matching: ${komma(ok.naiv, 2)}).`, `Difference in the outcome between the pairs: ${komma(ok.att, 2)}, 95% CI [${komma(ok.lo, 2)}; ${komma(ok.hi, 2)}], t(${ok.df}) = ${komma(ok.t, 2)}, p ${pWert(ok.p)} (without matching: ${komma(ok.naiv, 2)}).`)}</p>
        {#if ok.ausserhalb > 0.05}<p class="heft-text" style="color:var(--tinte-2)">{L('Bei einem Teil der behandelten Personen gibt es in der anderen Gruppe keine wirklich ähnliche Person (die Scores überlappen nicht). Die Paare dort sind weniger vergleichbar.', 'For some of the treated people there is no really similar person in the other group (the scores do not overlap). The pairs there are less comparable.')}</p>{/if}
      {/if}
      <p class="heft-text" style="color:var(--tinte-2)">{L('Matching gleicht nur die gewählten Merkmale aus; nicht gemessene Unterschiede bleiben. Es ersetzt keine Zufallszuteilung und belegt keine Ursache. Die Paare werden ohne Zurücklegen gebildet, eine Person kommt nur einmal vor.', 'Matching only balances the chosen characteristics; unmeasured differences remain. It does not replace random assignment and does not establish a cause. Pairs are formed without replacement; each person appears only once.')}</p>
    {/if}
  </details>
{/if}
