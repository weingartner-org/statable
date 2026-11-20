<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import { kleinste, groesste } from '../lib/menge';
  import type { BlandAltman } from '../lib/blandaltman';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { GRENZE, zieheStichprobe, punkteHinweis } from '../lib/stichprobe';
  /** Bland-Altman-Diagramm: x = Mittelwert beider Werte, y = Differenz (erste minus zweite Spalte). Durchgezogen der Bias, gestrichelt die
   *  Übereinstimmungsgrenzen (Bias ± 1,96 SD); die hellen Bänder sind die 95-%-Intervalle von Bias und Grenzen. */
  let { ba, punkte, aText, bText }: { ba: BlandAltman; punkte: [number, number][]; aText: string; bText: string } = $props();
  const W = 560, H = 410, L = 64, R = 92, U = 84;
  /** Einzelpunkte nur bis zur Grenze (lib/stichprobe.ts); Bias, Grenzen und Bänder rechnen mit allen Fällen. */
  const zeig = $derived(zieheStichprobe(punkte, GRENZE.streu));
  const hinweis = $derived(zeig.gekuerzt ? punkteHinweis(zeig.auswahl.length, zeig.gesamt) : '');
  const T = $derived(hinweis ? 40 : 24);
  const xs = $derived(punkte.map(p => p[0])), [x0, x1] = $derived([Math.min(kleinste(xs)), Math.max(groesste(xs))]);
  const y0 = $derived(Math.min(ba.untere.lo, kleinste(punkte.map(p => p[1])))), y1 = $derived(Math.max(ba.obere.hi, groesste(punkte.map(p => p[1]))));
  const pad = (a: number, b: number) => (b - a || 1) * 0.06;
  const X = (v: number) => L + (W - L - R) * (v - (x0 - pad(x0, x1))) / ((x1 - x0 || 1) + 2 * pad(x0, x1));
  const Y = (v: number) => T + (H - T - U) * (1 - (v - (y0 - pad(y0, y1))) / ((y1 - y0 || 1) + 2 * pad(y0, y1)));
  const tick = (a: number, b: number) => { const s = (b - a) / 5; const m = 10 ** Math.floor(Math.log10(s || 1)); const st = [1, 2, 5, 10].map(f => f * m).find(f => f >= s) ?? m; return Array.from({ length: 14 }, (_, i) => Math.ceil(a / st - 1e-9) * st + i * st).filter(v => v <= b + 1e-9); };
  const band = (lo: number, hi: number) => ({ y: Y(hi), h: Math.max(1, Y(lo) - Y(hi)) });
  const beschr = $derived(Lx(`Bland-Altman-Diagramm mit ${ba.n} Fällen: Differenz (${aText} minus ${bText}) gegen den Mittelwert beider Werte. Bias ${zahlDe(ba.bias, 2)}, Übereinstimmungsgrenzen ${zahlDe(ba.untere.wert, 2)} und ${zahlDe(ba.obere.wert, 2)}.`,
    `Bland-Altman plot with ${ba.n} cases: difference (${aText} minus ${bText}) against the mean of both values. Bias ${zahlDe(ba.bias, 2)}, limits of agreement ${zahlDe(ba.untere.wert, 2)} and ${zahlDe(ba.obere.wert, 2)}.`));
  const bt = $derived(bildtext('sonstiges', { artName: Lx('Bland-Altman-Diagramm', 'Bland-Altman plot'), xAchse: { name: Lx('Mittelwert beider Werte', 'Mean of both values') }, yAchse: { name: Lx('Differenz', 'Difference') },
    saetze: [hinweis ? `${beschr} ${hinweis}.` : beschr], tabelle: { kopf: [Lx('Mittelwert beider Werte', 'Mean of both values'), Lx('Differenz', 'Difference')], zeilen: punkte.map(p => [zahlDe(p[0], 2), zahlDe(p[1], 2)]) } }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#if hinweis}<text x={L} y="18" class="klein">{hinweis}</text>{/if}
  {#each tick(y0, y1) as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  {#each tick(x0, x1) as v}<text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" />
  {#each [[ba.obere.lo, ba.obere.hi], [ba.biasLo, ba.biasHi], [ba.untere.lo, ba.untere.hi]] as [lo, hi]}{@const b = band(lo!, hi!)}<rect x={L} width={W - L - R} y={b.y} height={b.h} fill="var(--dg-punkt-a)" opacity=".28" />{/each}
  {#each zeig.auswahl as [x, y]}<circle cx={X(x)} cy={Y(y)} r="4" fill="var(--dg-punkt-a)" stroke="var(--dg-a)" stroke-width=".8" />{/each}
  <line x1={L} x2={W - R} y1={Y(ba.bias)} y2={Y(ba.bias)} stroke="var(--dg-a)" stroke-width="3" stroke-linecap="round" />
  {#each [ba.obere.wert, ba.untere.wert] as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--tinte)" stroke-width="2" stroke-dasharray="7 5" />{/each}
  <text x={W - R + 8} y={Y(ba.obere.wert) + 4} style="font-size:13px">{zahlDe(ba.obere.wert, 2)}</text>
  <text x={W - R + 8} y={Y(ba.bias) + 4} style="font-size:13px" font-weight="650">{zahlDe(ba.bias, 2)}</text>
  <text x={W - R + 8} y={Y(ba.untere.wert) + 4} style="font-size:13px">{zahlDe(ba.untere.wert, 2)}</text>
  <text x={(W - R + L) / 2} y={H - 34} text-anchor="middle" class="klein">{Lx('Mittelwert beider Werte', 'Mean of both values')}</text>
  <text x={(W - R + L) / 2} y={H - 10} text-anchor="middle" class="klein">{Lx('Linie: Bias · gestrichelt: ± 1,96 SD', 'Line: bias · dashed: ± 1.96 SD')}</text>
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={Lx('Differenz', 'Difference')} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} />
