<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import XTitel from './XTitel.svelte';
  import YTitel from './YTitel.svelte';
  import TextfassungTabelle from './TextfassungTabelle.svelte';
  import { yZusatz, xZusatz, yMarkenZusatz } from '../lib/ytitel';
  import { achsenBereich, achsenMarken } from '../lib/diagrammdaten';
  import { form, farbe, markenPfad, STRICHE } from '../lib/fragediagramm';
  import { streuText, type GruppenStreu } from '../lib/streugruppen';
  import { GRENZE, zieheStichprobe, punkteHinweis } from '../lib/stichprobe';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  /**
   * Streudiagramm mit Gruppen: Farbe steht nie allein - jede Gruppe hat eine eigene Punktform (Kreis, Quadrat, Dreieck, Raute) und ihre Gerade eine eigene Strichart;
   * die Legende im Bild nennt Form, Strichart und Namen. Optional die LOESS-Linie über alle Punkte (gepunktet). Darunter „Daten als Tabelle“.
   */
  let { d, xText, yText, geraden = true, loess = false, zentroide = [], zusatzSaetze = [], zusatzTabellen = [] }: { d: GruppenStreu; xText: string; yText: string; geraden?: boolean; loess?: boolean; zentroide?: { i: number; x: number; y: number }[]; zusatzSaetze?: string[]; zusatzTabellen?: { titel: string; kopf: string[]; zeilen: string[][] }[] } = $props();
  const W = 560, H0 = 340, L0 = 56, R = 24, U0 = 54, R_MARKE = 5, R_ZENTROID = 11;
  const mitGruppen = $derived(d.gruppen.length > 1 || !!d.gruppen[0]?.name);
  const zeig = $derived(zieheStichprobe(d.punkte, GRENZE.streu));
  const hinweis = $derived(zeig.gekuerzt ? punkteHinweis(zeig.auswahl.length, zeig.gesamt) : '');
  /** Legende: Einträge nebeneinander, in Zeilen umgebrochen. */
  const eintraege = $derived([
    ...(mitGruppen ? d.gruppen.map((g, i) => ({ art: 'gruppe' as const, i, text: g.name })) : []),
    ...(loess && d.loess.length ? [{ art: 'loess' as const, i: 0, text: Lx('LOESS-Linie (alle Punkte)', 'LOESS line (all points)') }] : []),
    ...(zentroide.length ? [{ art: 'zentroid' as const, i: 0, text: Lx('Gruppenzentroid (große Punkte)', 'group centroid (large points)') }] : [])
  ]);
  const legende = $derived.by(() => {
    let x = 0, zeile = 0;
    const aus = eintraege.map(e => {
      const breit = 52 + e.text.length * 7.4;
      if (x + breit > W - 24 && x > 0) { x = 0; zeile++; }
      const p = { ...e, x: 24 + x, zeile }; x += breit + 14; return p;
    });
    return { aus, zeilen: eintraege.length ? zeile + 1 : 0 };
  });
  const T = $derived(14 + legende.zeilen * 24 + (hinweis ? 16 : 0));
  const ys = $derived([...d.punkte.map(p => p[1]), ...(geraden ? d.gruppen.flatMap(g => (g.b === null ? [] : [g.a! + g.b * Math.min(...xpunkte(g)), g.a! + g.b * Math.max(...xpunkte(g))])) : []), ...(loess ? d.loess.map(p => p[1]) : []), ...zentroide.map(z => z.y)]);
  const xpunkte = (g: (typeof d.gruppen)[number]) => d.punkte.filter(p => d.gruppen[p[2]] === g).map(p => p[0]);
  const xs = $derived([...d.punkte.map(p => p[0]), ...zentroide.map(z => z.x)]);
  const xb = $derived(achsenBereich(Math.min(...xs), Math.max(...xs))), yb = $derived(achsenBereich(Math.min(...ys), Math.max(...ys)));
  const xm = $derived(achsenMarken(xb[0], xb[1])), ym = $derived(achsenMarken(yb[0], yb[1]));
  const links = $derived(L0 + yZusatz(yText, H0 - T - U0, 13, false) + yMarkenZusatz(ym.map(v => zahlDe(v))));
  const XZ = $derived(xZusatz(xText, W - links - R));
  const H = $derived(H0 + (T - 14) + XZ), U = $derived(U0 + XZ);
  const IX = 12, IY = 10;
  const X = (v: number) => links + IX + (W - links - R - 2 * IX) * ((v - xb[0]) / (xb[1] - xb[0] || 1));
  const Y = (v: number) => T + IY + (H - T - U - 2 * IY) * (1 - (v - yb[0]) / (yb[1] - yb[0] || 1));
  const enden = $derived(geraden ? d.gruppen.map((g, i) => { const xx = xpunkte(g); return g.b === null || !xx.length ? null : { i, x0: Math.min(...xx), x1: Math.max(...xx), a: g.a!, b: g.b }; }).filter(e => e !== null) : []);
  const text = $derived(streuText(d, xText, yText, loess));
  const bt = $derived.by(() => {
    const pk = (i: number) => d.punkte.filter(p => p[2] === i).map(p => [p[0], p[1]] as [number, number]);
    const t = bildtext('streu', { xAchse: { name: xText }, yAchse: { name: yText },
      ...(mitGruppen ? { gruppen: d.gruppen.map((g, i) => ({ name: g.name, punkte: pk(i), ...(geraden && g.b !== null ? { gerade: { a: g.a!, b: g.b } } : {}) })) }
        : { punkte: d.punkte.map(p => [p[0], p[1]] as [number, number]), ...(geraden && d.gruppen[0]?.b != null ? { gerade: { a: d.gruppen[0].a!, b: d.gruppen[0].b } } : {}) }) });
    const extra = [...(d.ausgelassen ? [text.saetze[2]!] : []), ...(loess ? [text.saetze[text.saetze.length - 1]!] : []),
      ...zentroide.map(q => Lx(`Gruppenzentroid ${d.gruppen[q.i]?.name ?? ''}: (${zahlDe(q.x, 2)}; ${zahlDe(q.y, 2)}).`, `Group centroid ${d.gruppen[q.i]?.name ?? ''}: (${zahlDe(q.x, 2)}; ${zahlDe(q.y, 2)}).`))];
    return { ...t, beschreibung: [...t.beschreibung, ...extra] };
  });
</script>
<figure class="gs">
  <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
    {#each legende.aus as e}
      {@const y = 18 + e.zeile * 24}
      {#if e.art === 'gruppe'}
        {@const f = form(e.i)}
        <g aria-hidden="true">
          {#if f === 'kreis'}<circle cx={e.x + 8} cy={y} r={R_MARKE} fill="var(--dg-punkt-{farbe(e.i)})" stroke="var(--dg-{farbe(e.i)})" stroke-width="1.8" />
          {:else}<path d={markenPfad(f, e.x + 8, y, R_MARKE)} fill="var(--dg-punkt-{farbe(e.i)})" stroke="var(--dg-{farbe(e.i)})" stroke-width="1.8" />{/if}
          {#if geraden}<line x1={e.x + 20} x2={e.x + 44} y1={y} y2={y} stroke="var(--dg-{farbe(e.i)})" stroke-width="2.5" stroke-linecap="round" stroke-dasharray={STRICHE[e.i % STRICHE.length] || undefined} />{/if}
        </g>
        <text x={e.x + (geraden ? 50 : 22)} y={y + 4} class="klein">{e.text}</text>
      {:else if e.art === 'zentroid'}
        <circle cx={e.x + 8} cy={y} r={R_ZENTROID - 3} fill="var(--blatt)" stroke="var(--tinte)" stroke-width="3" aria-hidden="true" />
        <text x={e.x + 24} y={y + 4} class="klein">{e.text}</text>
      {:else}
        <line x1={e.x + 2} x2={e.x + 40} y1={y} y2={y} stroke="var(--tinte)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="0.1 5" aria-hidden="true" />
        <text x={e.x + 46} y={y + 4} class="klein">{e.text}</text>
      {/if}
    {/each}
    {#if hinweis}<text x="24" y={T - 8} class="klein">{hinweis}</text>{/if}
    {#each ym as v}<line x1={links} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={links - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
    {#each xm as v}<line x1={X(v)} x2={X(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
    <line x1={links} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
    <line x1={links} x2={links} y1={T} y2={H - U} stroke="var(--dg-achse)" />
    {#each enden as e}
      <line x1={X(e.x0)} y1={Y(e.a + e.b * e.x0)} x2={X(e.x1)} y2={Y(e.a + e.b * e.x1)} stroke="var(--dg-{farbe(e.i)})" stroke-width="2.5" stroke-linecap="round" stroke-dasharray={STRICHE[e.i % STRICHE.length] || undefined} />
    {/each}
    {#if loess && d.loess.length}<polyline points={d.loess.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')} fill="none" stroke="var(--tinte)" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.1 5" />{/if}
    {#each zeig.auswahl as p}
      {@const f = form(p[2])}
      {#if f === 'kreis'}<circle cx={X(p[0])} cy={Y(p[1])} r={R_MARKE} fill="var(--dg-punkt-{farbe(p[2])})" stroke="var(--dg-{farbe(p[2])})" stroke-width="1.8" />
      {:else}<path d={markenPfad(f, X(p[0]), Y(p[1]), R_MARKE)} fill="var(--dg-punkt-{farbe(p[2])})" stroke="var(--dg-{farbe(p[2])})" stroke-width="1.8" />{/if}
    {/each}
    {#each zentroide as z}
      {@const f = form(z.i)}
      {#if f === 'kreis'}<circle cx={X(z.x)} cy={Y(z.y)} r={R_ZENTROID} fill="var(--dg-{farbe(z.i)})" stroke="var(--tinte)" stroke-width="3" />
      {:else}<path d={markenPfad(f, X(z.x), Y(z.y), R_ZENTROID)} fill="var(--dg-{farbe(z.i)})" stroke="var(--tinte)" stroke-width="3" />{/if}
    {/each}
    <XTitel x={(links + W - R) / 2} y={H - U + 46} breite={W - links - R} text={xText} klasse="klein" />
    <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={13} klasse="klein" />
  </svg>
  <BildBeschreibung {...bt} />
  {#if zusatzSaetze.length || zusatzTabellen.length}<TextfassungTabelle saetze={zusatzSaetze} tabellen={zusatzTabellen} />{/if}
</figure>

<style>
  .gs { margin: 0; display: grid; gap: var(--a2); min-width: 0; }
  .gs :global(svg.diagramm) { margin: 0; }
</style>
