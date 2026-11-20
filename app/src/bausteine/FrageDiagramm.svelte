<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import XTitel from './XTitel.svelte';
  import YTitel from './YTitel.svelte';
  import { yZusatz, xZusatz, yMarkenZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  import { L, waehle } from '../lib/sitzung.svelte';
  import type { Diagramm } from '../lernen/fragen';
  import { bereiche, geradenEnden, form, farbe, markenPfad, STRICHE } from '../lib/fragediagramm';
  /**
   * Streudiagramm zu einer Üben-Frage. Farbe steht nie allein: jede Gruppe hat eine eigene Form, die Geraden eigene Strichart, die Legende nennt die Namen.
   * Barrierefrei: das Bild hat einen Namen (Kurzbeschreibung), darunter steht aufklappbar „Daten als Tabelle“ - dieselben Angaben als Sätze und Tabelle
   * (Screenreader, Braillezeile). Die Breite richtet sich nach dem Platz (viewBox, `.diagramm` in stil/app.css), kein seitliches Scrollen.
   */
  let { d }: { d: Diagramm } = $props();
  const W = 560, H0 = 340, L0 = 56, R = 24, T = 14, U0 = 54;
  const b = $derived(bereiche(d));
  const xTitel = $derived(waehle(d.x)), yTitel = $derived(waehle(d.y));
  const links = $derived(L0 + yZusatz(yTitel, H0 - T - U0, 13, false) + yMarkenZusatz(b.ym.map(v => zahlDe(v))));
  const XZ = $derived(xZusatz(xTitel, W - links - R));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  /** Innenabstand: Marken am Rand der Achsen werden nicht von der Achse halbiert. */
  const IX = 12, IY = 10;
  const X = (v: number) => links + IX + (W - links - R - 2 * IX) * ((v - b.xb[0]) / (b.xb[1] - b.xb[0] || 1));
  const Y = (v: number) => T + IY + (H - T - U - 2 * IY) * (1 - (v - b.yb[0]) / (b.yb[1] - b.yb[0] || 1));
  const ende = $derived(geradenEnden(d));
  const gruppeVon = (z: readonly number[]) => z[2] ?? 0;
  const R_MARKE = 5;
  const bt = $derived.by(() => {
    const pk = (i: number | null) => d.punkte.filter(z => i === null || gruppeVon(z) === i).map(z => [z[0]!, z[1]!] as [number, number]);
    const t = bildtext('streu', { ...(d.titel ? { titel: waehle(d.titel) } : {}), xAchse: { name: xTitel }, yAchse: { name: yTitel },
      ...(d.gruppen ? { gruppen: d.gruppen.map((gr, i) => { const ge = d.geraden?.find(q => q.gruppe === i); return { name: waehle(gr), punkte: pk(i), ...(ge ? { gerade: { a: ge.a, b: ge.b } } : {}) }; }) }
        : { punkte: pk(null), ...(d.geraden?.[0] ? { gerade: { a: d.geraden[0].a, b: d.geraden[0].b } } : {}) }) });
    return { ...t, beschreibung: [waehle(d.kurz), ...t.beschreibung] };
  });
</script>

<figure class="fd">
  {#if d.titel}<p class="fd-titel">{waehle(d.titel)}</p>{/if}
  <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
    {#each b.ym as v}<line x1={links} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={links - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
    {#each b.xm as v}<line x1={X(v)} x2={X(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
    <line x1={links} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
    <line x1={links} x2={links} y1={T} y2={H - U} stroke="var(--dg-achse)" />
    {#each ende as e}
      {@const g = e.gruppe ?? 0}
      <line x1={X(e.x0)} y1={Y(e.y0)} x2={X(e.x1)} y2={Y(e.y1)} stroke="var(--dg-{e.gruppe === undefined ? 'b' : farbe(g)})" stroke-width="2.5" stroke-linecap="round" stroke-dasharray={e.gruppe === undefined ? undefined : STRICHE[g % STRICHE.length] || undefined} />
    {/each}
    {#each d.punkte as z}
      {@const g = d.gruppen ? gruppeVon(z) : 0}
      {@const f = form(g)}
      {#if f === 'kreis'}
        <circle cx={X(z[0]!)} cy={Y(z[1]!)} r={R_MARKE} fill="var(--dg-punkt-{farbe(g)})" stroke="var(--dg-{farbe(g)})" stroke-width="1.8" />
      {:else}
        <path d={markenPfad(f, X(z[0]!), Y(z[1]!), R_MARKE)} fill="var(--dg-punkt-{farbe(g)})" stroke="var(--dg-{farbe(g)})" stroke-width="1.8" />
      {/if}
    {/each}
    <XTitel x={(links + W - R) / 2} y={H0 - 8} breite={W - links - R} text={xTitel} klasse="klein" />
    <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={yTitel} px={13} klasse="klein" />
  </svg>
  {#if d.gruppen || ende.length}
    <ul class="fd-legende" aria-label={L('Legende', 'Legend')}>
      {#each d.gruppen ?? [] as gr, i}
        {@const f = form(i)}
        <li>
          <svg viewBox="-9 -9 18 18" width="18" height="18" aria-hidden="true" focusable="false">
            {#if f === 'kreis'}<circle r={R_MARKE} fill="var(--dg-punkt-{farbe(i)})" stroke="var(--dg-{farbe(i)})" stroke-width="1.8" />
            {:else}<path d={markenPfad(f, 0, 0, R_MARKE)} fill="var(--dg-punkt-{farbe(i)})" stroke="var(--dg-{farbe(i)})" stroke-width="1.8" />{/if}
          </svg>
          <span>{waehle(gr)}</span>
        </li>
      {/each}
      {#each ende as e}
        {@const g = e.gruppe ?? 0}
        <li>
          <svg viewBox="0 0 30 18" width="30" height="18" aria-hidden="true" focusable="false">
            <line x1="2" y1="9" x2="28" y2="9" stroke="var(--dg-{e.gruppe === undefined ? 'b' : farbe(g)})" stroke-width="2.5" stroke-linecap="round" stroke-dasharray={e.gruppe === undefined ? undefined : STRICHE[g % STRICHE.length] || undefined} />
          </svg>
          <span>{L('Regressionsgerade', 'Regression line')}{e.gruppe !== undefined && d.gruppen?.[e.gruppe] ? ` (${waehle(d.gruppen[e.gruppe]!)})` : ''}</span>
        </li>
      {/each}
    </ul>
  {/if}
  <BildBeschreibung {...bt} />
  <figcaption class="fd-quelle">{waehle(d.quelle)}</figcaption>
</figure>

<style>
  .fd { margin: 0; display: grid; gap: var(--a2); min-width: 0; }
  .fd-titel { margin: 0; font-weight: 650; }
  .fd :global(svg.diagramm) { margin: 0; }
  .fd-legende { display: flex; flex-wrap: wrap; gap: var(--a1) var(--a4); list-style: none; margin: 0; padding: 0; }
  .fd-legende li { display: flex; align-items: center; gap: var(--a2); }
  .fd-legende svg { flex: none; }
  .fd-quelle { font-size: var(--gr-klein); color: var(--tinte-2); }
</style>
