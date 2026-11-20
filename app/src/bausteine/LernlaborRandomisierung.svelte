<script module lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { RandomisierungErgebnis } from '../lib/lernlabor';
  import { Simulation } from '../lib/lernlaborlauf.svelte';
  const z = $state({ text1: '12 15 9 20 14', text2: '8 10 7 11 6 9', B: 10000, letzter: -1 });
  let erg = $state.raw<null | { e: RandomisierungErgebnis; exakt: null | { p: number; anzahl: number; gesamt: number }; g1: number[]; g2: number[] }>(null);
  const sim = new Simulation();
</script>
<script lang="ts">
  import { untrack } from 'svelte';
  import { L, d } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import { verzoegert } from '../lib/laedt.svelte';
  import { GRUPPE_MAX, histogramm, randomisierungExakt, randomisierungLauf } from '../lib/lernlabor';
  import { fehlerReihe, g4, gruppeHinweisMax, hinweisKeineVollauszaehlung, lehreRandomisierung, leseReihe, satzRandomisierung, satzRandomisierungExakt, satzWelch } from '../lib/lernlaborsaetze';
  import LernlaborHistogramm from './LernlaborHistogramm.svelte';
  import Rechnet from './Rechnet.svelte';
  import LernlaborTabelle from './LernlaborTabelle.svelte';

  let { startwert, anstoss }: { startwert: number; anstoss: number } = $props();
  const anim = verzoegert(() => sim.laeuft);
  const r1 = $derived(leseReihe(z.text1)), r2 = $derived(leseReihe(z.text2));
  const f1 = $derived(fehlerReihe(r1, 2, GRUPPE_MAX, 'gruppe')), f2 = $derived(fehlerReihe(r2, 2, GRUPPE_MAX, 'gruppe'));
  const mittel = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

  async function simuliere() {
    if (f1 || f2) return;
    const g1 = r1.werte, g2 = r2.werte;
    const e = await sim.starte(randomisierungLauf({ g1, g2, B: z.B, startwert }));
    if (e) erg = { e, exakt: randomisierungExakt(g1, g2), g1, g2 };
  }
  $effect(() => { const a = anstoss; untrack(() => { if (z.letzter !== a || !erg) { z.letzter = a; void simuliere(); } }); });
  const hist = $derived(erg ? histogramm(erg.e.werte) : null);
</script>

<div class="ll-raster">
  <div class="ll-eingaben">
    <h2 class="ll-h">{L('Zwei Gruppen', 'Two groups')}</h2>
    <div class="eingabe"><label for="ll-rz-1">{L('Gruppe 1', 'Group 1')}</label>
      <textarea id="ll-rz-1" class="ll-reihe" rows="3" bind:value={z.text1} aria-invalid={f1 ? 'true' : undefined} aria-describedby="ll-rz-1h" spellcheck="false"></textarea>
      <span class="hilfe" id="ll-rz-1h">{f1 || L(`${r1.werte.length} Werte`, `${r1.werte.length} values`)}</span></div>
    <div class="eingabe"><label for="ll-rz-2">{L('Gruppe 2', 'Group 2')}</label>
      <textarea id="ll-rz-2" class="ll-reihe" rows="3" bind:value={z.text2} aria-invalid={f2 ? 'true' : undefined} aria-describedby="ll-rz-2h" spellcheck="false"></textarea>
      <span class="hilfe" id="ll-rz-2h">{f2 || L(`${r2.werte.length} Werte`, `${r2.werte.length} values`)}</span></div>
    <p class="hilfe">{gruppeHinweisMax()} {L('Werte mit Leerzeichen oder Semikolon trennen; das Dezimalzeichen ist das Komma.', 'Separate values with spaces or semicolons; the decimal mark is the comma.')}</p>
    <div class="eingabe"><label for="ll-rz-B">{L('Mischungen', 'Shuffles')}</label><select id="ll-rz-B" bind:value={z.B}>{#each [1000, 10000, 100000] as v}<option value={v}>{zahlDe(v)}</option>{/each}</select></div>
    <button class="k haupt gross" type="button" onclick={simuliere} disabled={!!(f1 || f2) || undefined}>{L('Gruppen mischen', 'Shuffle the groups')}</button>
    <p class="hilfe">{L('Gedanke: Wären Gruppe 1 und 2 reiner Zufall, dürfte man die Werte beliebig auf die beiden Gruppen verteilen. Also wird die Einteilung immer wieder neu gemischt, und jedes Mal wird der Unterschied der Mittelwerte notiert.', 'Idea: if groups 1 and 2 were pure chance, the values could be assigned to the two groups in any way. So the assignment is shuffled again and again, and each time the difference of the means is noted.')}</p>
  </div>

  <div class="ll-ergebnis" use:ergebnisAnsage={{ satz: '.ll-satz', anzahl: 1 }}>
    {#if anim.an}<div class="ll-rechnet"><Rechnet text={L('Die Gruppen werden gemischt …', 'Shuffling the groups …')} /><progress max="1" value={sim.anteil} aria-label={L('Fortschritt', 'Progress')}></progress></div>{/if}
    {#if erg && hist}
      {@const e = erg.e}
      <h2 class="ll-h">{L('Unterschiede bei zufälliger Einteilung', 'Differences under random assignment')}</h2>
      <figure class="ll-bild"><LernlaborHistogramm h={hist} n={e.B}
        linien={[{ x: e.beobachtet, text: `${L('beobachtet', 'observed')} ${g4(e.beobachtet)}`, stil: 'voll', farbe: 'b' }, { x: -e.beobachtet, text: `${g4(-e.beobachtet)}`, stil: 'strich', farbe: 'b' }, { x: 0, text: '0', stil: 'punkt', farbe: 'tinte' }]}
        xText={L('Mittelwert Gruppe 1 minus Gruppe 2', 'Mean of group 1 minus group 2')} yText={L('Anzahl Mischungen', 'Number of shuffles')}
        titel={L(`Verteilung der Unterschiede nach ${e.B} Mischungen`, `Distribution of the differences after ${e.B} shuffles`)}
        beschreibung={L(`${e.B} Mischungen, Startwert ${e.startwert}. Beobachteter Unterschied ${g4(e.beobachtet)}; ${e.anzahl} Mischungen liefern einen Unterschied vom Betrag her mindestens so groß; p ungefähr ${zahlDe(e.p, 3)}.`, `${e.B} shuffles, seed ${e.startwert}. Observed difference ${g4(e.beobachtet)}; ${e.anzahl} shuffles give a difference at least as large in absolute value; p about ${zahlDe(e.p, 3)}.`)} />
        <figcaption>{L('Säulen: der Unterschied der Mittelwerte bei jeder Mischung. Durchgezogen: der beobachtete Unterschied; gestrichelt: derselbe Betrag auf der anderen Seite (zweiseitig); gepunktet: kein Unterschied.', 'Bars: the difference of the means for each shuffle. Solid: the observed difference; dashed: the same amount on the other side (two-sided); dotted: no difference.')}</figcaption></figure>
      <LernlaborTabelle titel={L('Die Gruppen', 'The groups')}><table class="ll-tabelle"><caption>{L('Die Gruppen', 'The groups')}</caption>
        <thead><tr><th scope="col">{L('Gruppe', 'Group')}</th><th scope="col">n</th><th scope="col">{L('Mittelwert', 'Mean')}</th></tr></thead>
        <tbody><tr><th scope="row">1</th><td>{erg.g1.length}</td><td>{g4(mittel(erg.g1))}</td></tr><tr><th scope="row">2</th><td>{erg.g2.length}</td><td>{g4(mittel(erg.g2))}</td></tr></tbody></table></LernlaborTabelle>
      <p class="ll-satz" data-startwert={e.startwert}>{satzRandomisierung(e)}</p>
      {#if erg.exakt}<p class="ll-satz">{satzRandomisierungExakt(erg.exakt)}</p>
      {:else}<p class="hilfe">{hinweisKeineVollauszaehlung()}</p>{/if}
      {#if Number.isFinite(e.welch.p)}<p class="ll-satz">{satzWelch(e.welch)}</p>{/if}
      <p class="ll-lehre">{lehreRandomisierung()}</p>
    {:else if !anim.an}
      <p class="ll-lehre">{d('Tippe die Werte beider Gruppen ein und mische.', 'Tippen Sie die Werte beider Gruppen ein und mischen Sie.', 'Type in the values of both groups and shuffle.')}</p>
    {/if}
  </div>
</div>
