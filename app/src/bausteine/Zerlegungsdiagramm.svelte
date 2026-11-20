<script lang="ts">
  import { achsenMarken, achsenBereich } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { zeitTeilstriche, zeitLabel, positionIso, type ZeitreiheE, type ZeitreiheAuswertung } from '../lib/zeitreiheblatt';
  import { positionName } from '../lib/zeitreihesaetze';

  /**
   * Die klassische Zerlegung (Später S-E, L7) in drei Teilbildern untereinander: die Reihe mit ihrem Trend (gleitendes Mittel der Periodenlänge), die Saisonfigur (eine Periode) und der Rest.
   * Trend und Rest fehlen am Rand (je eine halbe Periode) - sie werden nicht aufgefüllt.
   */
  let { e, a, wertText }: { e: ZeitreiheE; a: ZeitreiheAuswertung; wertText: string } = $props();
  const uid = $props.id();
  const z = $derived(a.zer);
  const W = 720, L = 66, R = 24, PH = 150, KOPF = 30, LUECKE = 30, UNTEN = 44;
  const H = KOPF + 3 * PH + 2 * LUECKE + UNTEN;
  const t0 = $derived(e.t[0] ?? 1), t1 = $derived(e.t[e.t.length - 1] ?? 1);
  const X = (t: number) => L + 8 + (W - L - R - 16) * (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0));
  const oben = (p: number) => KOPF + p * (PH + LUECKE);
  const skala = (werte: (number | null)[], mitNull = false) => {
    const v = werte.filter((x): x is number => x !== null);
    if (!v.length) return { lo: 0, hi: 1, marken: [0, 1] };
    const [lo, hi] = achsenBereich(mitNull ? Math.min(0, ...v) : Math.min(...v), mitNull ? Math.max(0, ...v) : Math.max(...v), 4);
    return { lo, hi, marken: achsenMarken(lo, hi, 4) };
  };
  const yOf = (p: number, s: { lo: number; hi: number }, v: number) => oben(p) + PH * (1 - (v - s.lo) / (s.hi - s.lo || 1));
  const linie = (p: number, s: { lo: number; hi: number }, werte: (number | null)[]) => {
    const teile: string[] = []; let akt: string[] = [];
    werte.forEach((v, i) => { if (v === null) { if (akt.length) teile.push(akt.join(' ')); akt = []; } else akt.push(`${X(e.t[i]!).toFixed(1)},${yOf(p, s, v).toFixed(1)}`); });
    if (akt.length) teile.push(akt.join(' '));
    return teile;
  };
  const sy = $derived(skala([...(e.y as (number | null)[]), ...(z?.trend ?? [])]));
  const sf = $derived(skala(z?.figur ?? [], z?.art === 'additiv'));
  const sr = $derived(skala(z?.rest ?? [], true));
  const teil = $derived(z?.art === 'additiv' ? 0 : 1);
  const ticksX = $derived(zeitTeilstriche(e, 8));
  const m = $derived(e.periode);
  const XF = (i: number) => L + 20 + (W - L - R - 40) * (m <= 1 ? 0.5 : i / (m - 1));
  const beschreibung = $derived(!z ? '' : z.art === 'additiv'
    ? Lx(`Klassische Zerlegung (additiv, Periode ${m}): Trend, Saisonfigur und Rest von ${wertText}.`, `Classical decomposition (additive, period ${m}): trend, seasonal figure and remainder of ${wertText}.`)
    : Lx(`Klassische Zerlegung (multiplikativ, Periode ${m}): Trend, Saisonfigur und Rest von ${wertText}.`, `Classical decomposition (multiplicative, period ${m}): trend, seasonal figure and remainder of ${wertText}.`));
  const zLabel = (t: number) => (e.raster === 'zeilen' ? String(t) : zeitLabel(positionIso(e, t), e.raster));
  const bt = $derived(!z ? null : bildtext('linie', {
    titel: Lx('Klassische Zerlegung', 'Classical decomposition'),
    xAchse: { name: Lx('Zeit', 'Time') }, yAchse: { name: wertText }, x: e.t.map(zLabel),
    reihen: [{ name: Lx('Reihe', 'Series'), werte: e.y }, { name: Lx('Trend', 'Trend'), werte: z.trend }, { name: Lx('Rest', 'Remainder'), werte: z.rest }]
  }));
  const figurText = $derived(!z ? '' : Lx('Saisonfigur', 'Seasonal figure') + ': ' + z.figur.map((v, i) => `${positionName(i, m, e.erster)} ${zahlDe(v, z.art === 'additiv' ? 2 : 3)}`).join('; ') + '.');
</script>
{#if z && bt}
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <!-- 1. Reihe und Trend -->
  <text x={L} y="20" font-weight="650" style="font-size:14px">{Lx('Reihe und Trend', 'Series and trend')}</text>
  {#each sy.marken as v}<line x1={L} x2={W - R} y1={yOf(0, sy, v)} y2={yOf(0, sy, v)} stroke="var(--dg-gitter)" /><text x={L - 8} y={yOf(0, sy, v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={oben(0)} y2={oben(0) + PH} stroke="var(--dg-achse)" /><line x1={L} x2={W - R} y1={oben(0) + PH} y2={oben(0) + PH} stroke="var(--dg-achse)" />
  {#each linie(0, sy, e.y) as p}<polyline points={p} fill="none" stroke="var(--dg-a)" stroke-width="1.6" opacity=".75" />{/each}
  {#each linie(0, sy, z.trend) as p}<polyline points={p} fill="none" stroke="var(--dg-b)" stroke-width="2.8" stroke-dasharray="9 5" />{/each}
  <!-- 2. Saisonfigur -->
  <text x={L} y={oben(1) - 8} font-weight="650" style="font-size:14px">{Lx(`Saisonfigur (Periode ${m})`, `Seasonal figure (period ${m})`)}</text>
  {#each sf.marken as v}<line x1={L} x2={W - R} y1={yOf(1, sf, v)} y2={yOf(1, sf, v)} stroke="var(--dg-gitter)" /><text x={L - 8} y={yOf(1, sf, v) + 4} text-anchor="end" class="klein">{zahlDe(v, z.art === 'additiv' ? 1 : 2)}</text>{/each}
  <line x1={L} x2={L} y1={oben(1)} y2={oben(1) + PH} stroke="var(--dg-achse)" /><line x1={L} x2={W - R} y1={yOf(1, sf, teil)} y2={yOf(1, sf, teil)} stroke="var(--dg-achse)" />
  <polyline points={z.figur.map((v, i) => `${XF(i).toFixed(1)},${yOf(1, sf, v).toFixed(1)}`).join(' ')} fill="none" stroke="var(--dg-a)" stroke-width="2.4" />
  {#each z.figur as v, i}<circle cx={XF(i)} cy={yOf(1, sf, v)} r="4" fill="var(--blatt)" stroke="var(--dg-a)" stroke-width="2"><title>{positionName(i, m, e.erster)}: {zahlDe(v, z.art === 'additiv' ? 2 : 3)}</title></circle>
    {#if m <= 12 || i % Math.ceil(m / 12) === 0}<text x={XF(i)} y={oben(1) + PH + 16} text-anchor="middle" class="klein" style="font-size:11px">{m <= 12 ? positionName(i, m, e.erster).slice(0, 3) : i + 1}</text>{/if}{/each}
  <!-- 3. Rest -->
  <text x={L} y={oben(2) - 8} font-weight="650" style="font-size:14px">{Lx('Rest', 'Remainder')}</text>
  {#each sr.marken as v}<line x1={L} x2={W - R} y1={yOf(2, sr, v)} y2={yOf(2, sr, v)} stroke="var(--dg-gitter)" /><text x={L - 8} y={yOf(2, sr, v) + 4} text-anchor="end" class="klein">{zahlDe(v, z.art === 'additiv' ? 1 : 2)}</text>{/each}
  <line x1={L} x2={L} y1={oben(2)} y2={oben(2) + PH} stroke="var(--dg-achse)" /><line x1={L} x2={W - R} y1={yOf(2, sr, teil)} y2={yOf(2, sr, teil)} stroke="var(--dg-achse)" />
  {#each linie(2, sr, z.rest) as p}<polyline points={p} fill="none" stroke="var(--dg-a)" stroke-width="1.8" />{/each}
  {#each ticksX as k}<line x1={X(k.t)} x2={X(k.t)} y1={oben(2) + PH} y2={oben(2) + PH + 5} stroke="var(--dg-achse)" /><text x={X(k.t)} y={oben(2) + PH + 20} text-anchor="middle" class="klein">{k.label}</text>{/each}
</svg>
<BildBeschreibung {...bt} beschreibung={[beschreibung, ...bt.beschreibung, figurText]} />
{/if}
