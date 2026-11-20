<script lang="ts">
  import type { Saetze } from '../lib/ergebnis';

  /** Zusatztext eines Ergebnisses: Absätze an „\n“. Steht ein `listen[].text` wörtlich darin, kommt an seine Stelle EINE Ausklappliste (`titel`), darin die Gruppen
   *  mit Überschrift und ein Eintrag je Zeile; bei viel Breite zweispaltig (Johannes 13.11.2026: Fragen je Komponente als Fließtext waren unlesbar; alle Fragen
   *  zusammen auf- und zuklappen, nicht jede Komponente einzeln). */
  type Liste = NonNullable<Saetze['listen']>[number];
  type Teil = { art: 'text'; t: string } | { art: 'liste'; l: Liste };
  let { text, listen = [] }: { text: string; listen?: Liste[] } = $props();
  const kennung = $props.id();

  const teile = $derived.by(() => {
    let rest: Teil[] = [{ art: 'text', t: text }];
    for (const l of listen) {
      if (!l.text || !l.gruppen.length) continue;
      rest = rest.flatMap((x): Teil[] => {
        if (x.art !== 'text') return [x];
        const i = x.t.indexOf(l.text);
        return i < 0 ? [x] : [{ art: 'text', t: x.t.slice(0, i) }, { art: 'liste', l }, { art: 'text', t: x.t.slice(i + l.text.length) }];
      });
    }
    return rest.flatMap((x): Teil[] => (x.art === 'text' ? x.t.split('\n').map(t => t.trim()).filter(Boolean).map(t => ({ art: 'text', t })) : [x]));
  });
</script>

{#each teile as x, i (i)}
  {#if x.art === 'text'}
    <p class="heft-text" style={i > 0 ? 'margin-top:var(--a2)' : undefined}>{x.t}</p>
  {:else}
    <details class="satz-liste" style={i > 0 ? 'margin-top:var(--a3)' : undefined}>
      <summary>{x.l.titel}</summary>
      <div class="satz-liste-huelle">
        <div class="satz-gruppen" class:einzeln={x.l.gruppen.length === 1}>
          {#each x.l.gruppen as g, j (j)}
            <div class="satz-gruppe">
              {#if g.titel}<h4 id="sl-{kennung}-{i}-{j}">{g.titel}</h4>{/if}
              <ul aria-labelledby={g.titel ? `sl-${kennung}-${i}-${j}` : undefined}>{#each g.eintraege as e, k (k)}<li>{e}</li>{/each}</ul>
            </div>
          {/each}
        </div>
      </div>
    </details>
  {/if}
{/each}

<style>
  .satz-liste { border: 1px solid var(--linie); border-radius: var(--r-klein); padding: var(--a1) var(--a3); background: var(--blatt); }
  .satz-liste > summary { cursor: pointer; font-weight: 600; padding: var(--a1) 0; }
  .satz-liste-huelle { container-type: inline-size; }
  .satz-gruppen { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--a3) var(--a5, 2rem); padding: var(--a2) 0 var(--a2); }
  @container (min-width: 40rem) { .satz-gruppen:not(.einzeln) { grid-template-columns: repeat(2, minmax(0, 1fr)); } .satz-gruppen.einzeln ul { columns: 2; column-gap: var(--a5, 2rem); } }
  .satz-gruppe h4 { font-size: inherit; font-weight: 600; margin: 0 0 var(--a1); }
  .satz-gruppe ul { margin: 0; padding-inline-start: 1.2em; }
  .satz-gruppe li { margin: 0.15em 0; line-height: 1.4; break-inside: avoid; }
</style>
