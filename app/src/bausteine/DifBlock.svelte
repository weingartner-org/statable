<script lang="ts">
  /** Unterschiedliches Funktionieren von Aufgaben (DIF, Mantel-Haenszel) unter der Skalen-Karte: Haben Gruppen mit gleicher Fähigkeit bei einer Aufgabe verschiedene Chancen? Rechnet im Browser (lib/dif.ts), erst auf Klick. */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma, pWert } from '../lib/ergebnis';
  import { dif, type DifErgebnis, type DifFehler } from '../lib/dif';

  let { fragen, name }: { fragen: string[]; name: (n: string) => string } = $props();
  const kennung = $props.id();
  const lab = (c: (typeof s.spalten)[number], v: unknown) => (typeof v === 'number' ? (c.werteLabels[String(v)] ?? String(v)) : String(v ?? ''));
  /** Spalten mit genau zwei Gruppen, die keine der Fragen sind */
  const kandidaten = $derived(s.spalten.filter(c => !fragen.includes(c.name) && c.art !== 'datum').map(c => {
    const i = s.spalten.indexOf(c), w = new Set<string>();
    for (const z of s.zeilen) { const v = z[i]; if (v === null || v === undefined || v === '' || (typeof v === 'number' && istFehlend(c, v))) continue; w.add(lab(c, v)); if (w.size > 3) break; }
    return { c, stufen: [...w].sort() };
  }).filter(x => x.stufen.length === 2));
  let wahl = $state(''), fokusName = $state(''), res = $state<DifErgebnis | DifFehler | null>(null), laeuft = $state(false);
  const gewaehlt = $derived(kandidaten.find(k => k.c.name === wahl) ?? null);
  $effect(() => { void fragen.join('|'); res = null; });
  $effect(() => { void wahl; res = null; fokusName = gewaehlt?.stufen[1] ?? ''; });
  $effect(() => { void fokusName; res = null; });
  async function rechnen() {
    if (laeuft || !gewaehlt) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    const ix = fragen.map(n => s.spalten.findIndex(c => c.name === n)), cs = ix.map(i => s.spalten[i]!), ig = s.spalten.indexOf(gewaehlt.c);
    const x: number[][] = [], fokus: boolean[] = [];
    for (const z of s.zeilen) {
      const r = ix.map(i => z[i]), g = z[ig];
      if (r.some((v, k) => typeof v !== 'number' || istFehlend(cs[k]!, v as number)) || g === null || g === undefined || g === '' || (typeof g === 'number' && istFehlend(gewaehlt.c, g))) continue;
      x.push(r as number[]); fokus.push(lab(gewaehlt.c, g) === fokusName);
    }
    res = dif(x, fokus);
    laeuft = false;
  }
  const daten = $derived.by(() => { const ix = fragen.map(n => s.spalten.findIndex(c => c.name === n)); if (ix.some(i => i < 0)) return false; return fragen.every((_, k) => { const w = new Set<unknown>(); for (const z of s.zeilen) { const v = z[ix[k]!]; if (typeof v === 'number') { w.add(v); if (w.size > 3) return false; } } return [...w].every(v => v === 0 || v === 1); }); });
  const r = $derived(res && !('fehler' in res) ? res : null);
  const z2 = (v: number | null) => (v === null || !Number.isFinite(v) ? '-' : komma(v, 2)), pr = (v: number) => `${komma(v * 100, 0)} %`;
  const fehlerText = (f: { fehler: string }) => f.fehler === 'werte' ? L('Die Prüfung braucht Aufgaben mit genau zwei Antworten: 0 (falsch) und 1 (richtig).', 'The check needs tasks with exactly two answers: 0 (wrong) and 1 (right).')
    : f.fehler === 'zu-wenig-aufgaben' ? L('Es braucht mindestens drei Aufgaben.', 'At least three tasks are needed.')
    : f.fehler === 'eine-gruppe' ? L('Beide Gruppen brauchen Personen mit allen Antworten.', 'Both groups need people with all answers.')
    : L('Zu wenige Personen: Jede Gruppe braucht mindestens 20 (sinnvoll sind 100 und mehr).', 'Too few people: each group needs at least 20 (100 or more make sense).');
  const auffaellig = $derived(r ? r.aufgaben.map((a, i) => ({ a, i })).filter(x => x.a.klasse === 'B' || x.a.klasse === 'C') : []);
</script>

{#if daten && kandidaten.length}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Faire Aufgaben? Unterschiedliches Funktionieren (DIF)', 'Fair tasks? Differential functioning (DIF)')}</summary>
    <p class="heft-text">{L('Eine Aufgabe ist unfair, wenn gleich fähige Personen aus zwei Gruppen (zum Beispiel Mädchen und Jungen, oder zwei Sprachgruppen) unterschiedliche Chancen haben, sie zu lösen. Statable vergleicht dazu in jeder Stufe des Gesamtwerts die beiden Gruppen (Mantel-Haenszel) und gibt das Odds Ratio (Chancenverhältnis) der Referenzgruppe zur Fokusgruppe an.', 'A task is unfair if equally able people from two groups (for example girls and boys, or two language groups) have different chances of solving it. For this, Statable compares the two groups at every level of the total score (Mantel-Haenszel) and gives the odds ratio of the reference group to the focal group.')}</p>
    <p class="hilfe"><HilfeLink id="faire-aufgaben-dif" text={L('Hilfe: faire Aufgaben (DIF)', 'Help: fair tasks (DIF)')} /></p>
    <div class="eingabe" style="max-width:340px"><label for="dif-g-{kennung}">{L('Gruppen aus welcher Spalte?', 'Groups from which column?')}</label>
      <select id="dif-g-{kennung}" bind:value={wahl}><option value="">{L('Bitte wählen', 'Please choose')}</option>{#each kandidaten as k (k.c.name)}<option value={k.c.name}>{k.c.bezeichnung.trim() || k.c.name}</option>{/each}</select></div>
    {#if gewaehlt}
      <fieldset class="segment" style="margin:var(--a2) 0"><legend>{L('Welche Gruppe ist die Fokusgruppe (die mögliche Benachteiligte)?', 'Which group is the focal group (the possibly disadvantaged one)?')}</legend>
        {#each gewaehlt.stufen as g (g)}<label><input type="radio" name="dif-f-{kennung}" value={g} checked={fokusName === g} onchange={() => (fokusName = g)} />{g}</label>{/each}
      </fieldset>
      <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft}>{L('Aufgaben auf DIF prüfen', 'Check the tasks for DIF')}</button></div>
    {/if}
    {#if res && 'fehler' in res}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if r}
      <p class="heft-text" role="status">{L(`${r.referenz} Personen in der Referenzgruppe, ${r.fokus} in der Fokusgruppe (${fokusName}); ${r.schichten} Stufen des Gesamtwerts.`, `${r.referenz} people in the reference group, ${r.fokus} in the focal group (${fokusName}); ${r.schichten} levels of the total score.`)}</p>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Aufgaben: Odds Ratio bei gleichem Gesamtwert', 'Tasks: odds ratio at the same total score')}</b></caption>
        <thead><tr><th scope="col">{L('Aufgabe', 'Task')}</th><th scope="col">{L('Anteil richtig, Referenz', 'Share right, reference')}</th><th scope="col">{L('Anteil richtig, Fokus', 'Share right, focal')}</th><th scope="col">{L('Odds Ratio', 'Odds ratio')}</th><th scope="col">Δ</th><th scope="col">χ²</th><th scope="col">p</th><th scope="col">{L('Klasse', 'Class')}</th></tr></thead>
        <tbody>{#each r.aufgaben as a, i (i)}<tr><th scope="row" style="text-align: start">{name(fragen[i]!)}</th><td style="text-align:right">{pr(a.richtigRef)}</td><td style="text-align:right">{pr(a.richtigFokus)}</td><td style="text-align:right">{z2(a.orMH)}</td><td style="text-align:right">{z2(a.delta)}</td><td style="text-align:right">{z2(a.chi2)}</td><td style="text-align:right">{a.p === null ? '-' : pWert(a.p).replace(/^= /, '')}</td><td style="text-align:center">{a.klasse ?? '-'}</td></tr>{/each}</tbody>
      </table></div>
      {#if auffaellig.length}
        <p class="heft-text">{L(`Auffällig (Klasse B oder C): ${auffaellig.map(x => name(fragen[x.i]!)).join(', ')}. Bei einem Odds Ratio über 1 hat die Referenzgruppe bei gleichem Gesamtwert die besseren Chancen, bei einem Wert unter 1 die Fokusgruppe.`, `Conspicuous (class B or C): ${auffaellig.map(x => name(fragen[x.i]!)).join(', ')}. With an odds ratio above 1 the reference group has the better chances at the same total score, with a value below 1 the focal group.`)}</p>
      {:else}
        <p class="heft-text">{L('Keine Aufgabe fällt auf: Bei keiner ist der Unterschied zugleich bedeutsam (Δ ab 1) und statistisch sicher.', 'No task stands out: for none is the difference both meaningful (Δ from 1) and statistically certain.')}</p>
      {/if}
      <p class="heft-text" style="color:var(--tinte-2)">{L('Δ = −2,35 · ln(Odds Ratio); ein negatives Δ heißt: die Aufgabe ist für die Fokusgruppe schwerer. Klasse A: kein oder kleiner Unterschied (|Δ| unter 1 oder nicht signifikant); B: mäßig; C: groß (|Δ| ab 1,5 und signifikant). Das ist eine Faustregel. Auffällige Aufgaben sind noch nicht unfair: Erst ein Blick auf den Inhalt der Aufgabe sagt, ob der Unterschied einen sachfremden Grund hat. Bei vielen Aufgaben gibt es zufällig einzelne auffällige.', 'Δ = −2.35 · ln(odds ratio); a negative Δ means the task is harder for the focal group. Class A: no or small difference (|Δ| below 1 or not significant); B: moderate; C: large (|Δ| from 1.5 and significant). This is a rule of thumb. Conspicuous tasks are not yet unfair: only a look at the content of the task tells whether the difference has an irrelevant reason. With many tasks a few stand out by chance.')}</p>
    {/if}
  </details>
{/if}
