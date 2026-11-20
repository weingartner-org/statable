<script lang="ts">
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz, yMarkenZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { GRENZE, zieheStichprobe, punkteHinweis } from '../lib/stichprobe';
  /** `rang`: Spearman und Kendall rechnen mit Rängen, nicht mit den Werten - dann zeigt das Diagramm die Ränge und keine Gerade. */
  let { punkte: roh, xText, yText, rang = false }: { punkte: [number, number][]; xText: string; yText: string; rang?: boolean } = $props();
  /** Mittlere Ränge (Bindungen teilen sich den Rang). */
  const raenge = (v: number[]) => { const o = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]), r = new Array<number>(v.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1]![0] === o[i]![0]) j++; for (let k = i; k <= j; k++) r[o[k]![1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
  const punkte = $derived.by((): [number, number][] => { if (!rang) return roh; const rx = raenge(roh.map(p => p[0])), ry = raenge(roh.map(p => p[1])); return roh.map((_, i) => [rx[i]!, ry[i]!]); });
  const W = 560, H0 = 360, L0 = 64, R = 24, U0 = 56;
  /** Einzelpunkte nur bis zur Grenze (lib/stichprobe.ts); Gerade, Achsen und Zahlen im Satz rechnen mit allen Punkten. */
  const zeig = $derived(zieheStichprobe(punkte, GRENZE.streu));
  const hinweis = $derived(zeig.gekuerzt ? punkteHinweis(zeig.auswahl.length, zeig.gesamt) : '');
  const T = $derived(hinweis ? 40 : 24);
  /** Linker Rand wächst mit, wenn der senkrechte Titel umbricht oder die Achsenzahlen lang sind (Regel lib/ytitel.ts). */
  const L = $derived.by(() => L0 + yZusatz(`${yText}${rang ? ' (' + Lx('Ränge', 'ranks') + ')' : ''}`, H0 - T - U0, 13, false) + yMarkenZusatz(tick(y0, y1).map(v => zahlDe(v))));
  const xTitel = $derived(`${xText}${rang ? ' (' + Lx('Ränge', 'ranks') + ')' : ''}`);
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): Höhe und unterer Rand wachsen mit, die Zeichenfläche bleibt. */
  const XZ = $derived(xZusatz(xTitel, W - L - R));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const xs = $derived(punkte.map(p => p[0])), ys = $derived(punkte.map(p => p[1]));
  const [x0, x1] = $derived([Math.min(kleinste(xs)), Math.max(groesste(xs))]), [y0, y1] = $derived([Math.min(kleinste(ys)), Math.max(groesste(ys))]);
  const pad = (a: number, b: number) => (b - a || 1) * 0.06;
  const X = (v: number) => L + (W - L - R) * (v - (x0 - pad(x0, x1))) / ((x1 - x0 || 1) + 2 * pad(x0, x1));
  const Y = (v: number) => T + (H - T - U) * (1 - (v - (y0 - pad(y0, y1))) / ((y1 - y0 || 1) + 2 * pad(y0, y1)));
  const gerade = $derived.by(() => {
    const n = punkte.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    const b = punkte.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0) / (punkte.reduce((a, [x]) => a + (x - mx) ** 2, 0) || 1);
    return { b, a: my - b * mx };
  });
  const bt = $derived(bildtext('streu', {
    xAchse: { name: xTitel }, yAchse: { name: `${yText}${rang ? ' (' + Lx('Ränge', 'ranks') + ')' : ''}` },
    punkte, ...(rang ? {} : { gerade: { a: gerade.a, b: gerade.b } })
  }));
  const tick = (a: number, b: number) => { const s = (b - a) / 5; const m = 10 ** Math.floor(Math.log10(s || 1)); const st = [1, 2, 5, 10].map(f => f * m).find(f => f >= s) ?? m; return Array.from({ length: 12 }, (_, i) => Math.ceil(a / st) * st + i * st).filter(v => v <= b); };
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each tick(y0, y1) as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  {#each tick(x0, x1) as v}<text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  {#if hinweis}<text x={L} y="18" class="klein">{hinweis}</text>{/if}
  {#each zeig.auswahl as [x, y]}<circle cx={X(x)} cy={Y(y)} r="4" fill="var(--dg-punkt-a)" />{/each}
  {#if !rang}<line x1={X(x0)} y1={Y(gerade.a + gerade.b * x0)} x2={X(x1)} y2={Y(gerade.a + gerade.b * x1)} stroke="var(--dg-a)" stroke-width="3" stroke-linecap="round" />{/if}
  <XTitel x={(L + W - R) / 2} y={H0 - 8} breite={W - L - R} text={xTitel} klasse="klein" />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={`${yText}${rang ? ' (' + Lx('Ränge', 'ranks') + ')' : ''}`} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} />
