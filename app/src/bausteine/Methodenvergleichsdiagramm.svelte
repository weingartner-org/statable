<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { GRENZE, zieheStichprobe, punkteHinweis } from '../lib/stichprobe';
  /**
   * Methodenvergleich (Später S-F, M6). `bild = 'gerade'`: Streudiagramm der beiden Verfahren mit der Identitätslinie (y = x, gestrichelt grau), der Passing-Bablok-Geraden (durchgezogen) und der Deming-Geraden
   * (Strich-Punkt); beide Achsen haben denselben Bereich. Die Linien unterscheiden sich durch Strichart UND Beschriftung, nicht nur durch Farbe. KEINE gewöhnliche Regressionsgerade (Opus 5).
   * `bild = 'reste'`: Residuenbild der Passing-Bablok-Geraden (Rest y − a − b·x gegen x) mit der Nulllinie; es gehört zum Cusum (Statistik ohne p, Opus 5).
   */
  let { punkte: roh, pb = null, deming = null, lambda = 1, xText, yText, bild = 'gerade', reste = [] }: {
    punkte: [number, number][]; pb?: { a: number; b: number } | null; deming?: { a: number; b: number } | null; lambda?: number; xText: string; yText: string; bild?: 'gerade' | 'reste'; reste?: number[];
  } = $props();
  const W = 560, H0 = 400, L0 = 64, R = 24, U0 = 92;
  const paare = $derived(bild === 'reste' ? roh.map((p, i) => [p[0], reste[i] ?? 0] as [number, number]) : roh);
  /** Einzelpunkte nur bis zur Grenze (lib/stichprobe.ts); die Geraden rechnen mit allen Punkten. */
  const zeig = $derived(zieheStichprobe(paare, GRENZE.streu));
  const hinweis = $derived(zeig.gekuerzt ? punkteHinweis(zeig.auswahl.length, zeig.gesamt) : '');
  const T = $derived(hinweis ? 40 : 24);
  const yTitel = $derived(bild === 'reste' ? Lx(`Rest zur Geraden (${yText} − a − b · ${xText})`, `Residual from the line (${yText} − a − b · ${xText})`) : yText);
  const L = $derived(L0 + yZusatz(yTitel, H0 - T - U0, 13, false));
  const XZ = $derived(xZusatz(xText, W - L - R));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const xs = $derived(roh.map(p => p[0])), ys = $derived(roh.map(p => p[1]));
  const [lo, hi] = $derived([Math.min(kleinste(xs), kleinste(ys)), Math.max(groesste(xs), groesste(ys))]);
  const [x0, x1] = $derived(bild === 'reste' ? [Math.min(kleinste(xs)), Math.max(groesste(xs))] : [lo, hi]);
  const rs = $derived(paare.map(p => p[1]));
  const [y0, y1] = $derived(bild === 'reste' ? [Math.min(kleinste(rs), 0), Math.max(groesste(rs), 0)] : [lo, hi]);
  const pad = (a: number, b: number) => (b - a || 1) * 0.06;
  const X = (v: number) => L + (W - L - R) * (v - (x0 - pad(x0, x1))) / ((x1 - x0 || 1) + 2 * pad(x0, x1));
  const Y = (v: number) => T + (H - T - U) * (1 - (v - (y0 - pad(y0, y1))) / ((y1 - y0 || 1) + 2 * pad(y0, y1)));
  const tick = (a: number, b: number) => { const s = (b - a) / 5; const m = 10 ** Math.floor(Math.log10(s || 1)); const st = [1, 2, 5, 10].map(f => f * m).find(f => f >= s) ?? m; return Array.from({ length: 14 }, (_, i) => Math.ceil(a / st - 1e-9) * st + i * st).filter(v => v <= b + 1e-9); };
  /** Gerade über den ganzen Bereich der Zeichenfläche, an den Rändern abgeschnitten. */
  const linie = (a: number, b: number) => {
    const von = x0 - pad(x0, x1), bis = x1 + pad(x0, x1), yv = y0 - pad(y0, y1), yb = y1 + pad(y0, y1);
    let p = von, q = bis;
    if (b > 0) { p = Math.max(p, (yv - a) / b); q = Math.min(q, (yb - a) / b); } else if (b < 0) { p = Math.max(p, (yb - a) / b); q = Math.min(q, (yv - a) / b); }
    return q > p ? { x1: X(p), y1: Y(a + b * p), x2: X(q), y2: Y(a + b * q) } : null;
  };
  const f2 = (v: number) => zahlDe(v, 2);
  const beschr = $derived(bild === 'reste'
    ? Lx(`Residuenbild des Methodenvergleichs mit ${roh.length} Proben: der Rest zur Passing-Bablok-Geraden gegen ${xText}; die Nulllinie ist eingezeichnet.`, `Residual plot of the method comparison with ${roh.length} samples: the residual from the Passing-Bablok line against ${xText}; the zero line is drawn.`)
    : [Lx(`Streudiagramm des Methodenvergleichs mit ${roh.length} Proben: ${yText} gegen ${xText}, mit der Identitätslinie y = x.`, `Scatter plot of the method comparison with ${roh.length} samples: ${yText} against ${xText}, with the identity line y = x.`),
      pb ? Lx(`Passing-Bablok-Gerade: y = ${f2(pb.a)} + ${f2(pb.b)} · x.`, `Passing-Bablok line: y = ${f2(pb.a)} + ${f2(pb.b)} · x.`) : '',
      deming ? Lx(`Deming-Gerade: y = ${f2(deming.a)} + ${f2(deming.b)} · x (λ = ${zahlDe(lambda)}).`, `Deming line: y = ${f2(deming.a)} + ${f2(deming.b)} · x (λ = ${zahlDe(lambda)}).`) : ''].filter(Boolean).join(' '));
  const idL = linie(0, 1);
  const pbL = $derived(pb ? linie(pb.a, pb.b) : null), dmL = $derived(deming ? linie(deming.a, deming.b) : null);
  const kennung = $props.id();
  const bt = $derived.by(() => {
    const t = bildtext('streu', { xAchse: { name: xText }, yAchse: { name: yTitel }, punkte: paare, ...(bild === 'gerade' && pb ? { gerade: { a: pb.a, b: pb.b } } : {}) });
    return { ...t, beschreibung: [...t.beschreibung, beschr] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#if hinweis}<text x={L} y="18" class="klein">{hinweis}</text>{/if}
  {#each tick(y0, y1) as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  {#each tick(x0, x1) as v}<text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" />
  {#each zeig.auswahl as [x, y]}<circle cx={X(x)} cy={Y(y)} r="3.6" fill="var(--dg-punkt-a)" stroke="var(--dg-a)" stroke-width=".7" opacity=".85" />{/each}
  {#if bild === 'reste'}
    <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} stroke="var(--dg-a)" stroke-width="2.4" stroke-linecap="round" />
  {:else}
    {#if idL}<line x1={idL.x1} y1={idL.y1} x2={idL.x2} y2={idL.y2} stroke="var(--dg-achse)" stroke-width="2" stroke-dasharray="7 5" />{/if}
    {#if pbL}<line x1={pbL.x1} y1={pbL.y1} x2={pbL.x2} y2={pbL.y2} stroke="var(--dg-a)" stroke-width="3" stroke-linecap="round" />{/if}
    {#if dmL}<line x1={dmL.x1} y1={dmL.y1} x2={dmL.x2} y2={dmL.y2} stroke="var(--dg-b)" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 4 2 4" />{/if}
  {/if}
  <XTitel x={(L + W - R) / 2} y={H0 - 52} breite={W - L - R} text={xText} klasse="klein" />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={yTitel} px={13} klasse="klein" />
  {#if bild === 'gerade'}
    <g class="klein">
      <line x1={L} x2={L + 34} y1={H - 22} y2={H - 22} stroke="var(--dg-achse)" stroke-width="2" stroke-dasharray="7 5" /><text x={L + 42} y={H - 18}>y = x</text>
      {#if pb}<line x1={L + 110} x2={L + 144} y1={H - 22} y2={H - 22} stroke="var(--dg-a)" stroke-width="3" stroke-linecap="round" /><text x={L + 152} y={H - 18}>{Lx('Passing-Bablok', 'Passing-Bablok')}</text>{/if}
      {#if deming}<line x1={L + 280} x2={L + 314} y1={H - 22} y2={H - 22} stroke="var(--dg-b)" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 4 2 4" /><text x={L + 322} y={H - 18}>Deming (λ = {zahlDe(lambda)})</text>{/if}
    </g>
  {/if}
</svg>
<BildBeschreibung {...bt} />
