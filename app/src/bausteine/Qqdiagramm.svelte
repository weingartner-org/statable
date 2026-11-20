<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz, yMarkenZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import { achsenBereich, achsenMarken, qqnorm } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { GRENZE, qqIndex, qqHinweis } from '../lib/stichprobe';
  /** Q-Q-Diagramm einer Zahlenspalte gegen die Normalverteilung (wie R `qqnorm` und `qqline`): Liegen die Punkte nah an der Linie, ist die Verteilung annähernd normal. */
  let { werte, titel }: { werte: number[]; titel: string } = $props();
  const kennung = $props.id();
  const W = 560, H0 = 360, L0 = 64, R = 24, T = 76, U0 = 58;
  /** Linker Rand wächst mit, wenn der senkrechte Titel umbricht oder die Achsenzahlen lang sind (Regel lib/ytitel.ts). */
  const L = $derived.by(() => L0 + yZusatz(titel, H0 - T - U0, 13, false) + yMarkenZusatz(ym.map(v => zahlDe(v))));
  const xTitel = $derived(Lx('Theoretische Quantile (Normalverteilung)', 'Theoretical quantiles (normal distribution)'));
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): Höhe und unterer Rand wachsen mit, die Zeichenfläche bleibt. */
  const XZ = $derived(xZusatz(xTitel, W - L - R));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const qq = $derived(qqnorm(werte));
  const punkte = $derived(qq?.punkte ?? []);
  const xs = $derived(punkte.map(p => p[0])), ys = $derived(punkte.map(p => p[1]));
  const xb = $derived(achsenBereich(Math.min(kleinste(xs)), Math.max(groesste(xs)))), yb = $derived(achsenBereich(Math.min(kleinste(ys)), Math.max(groesste(ys))));
  const X = (v: number) => L + (W - L - R) * ((v - xb[0]) / (xb[1] - xb[0] || 1));
  const Y = (v: number) => T + (H - T - U) * (1 - (v - yb[0]) / (yb[1] - yb[0] || 1));
  const xm = $derived(achsenMarken(xb[0], xb[1])), ym = $derived(achsenMarken(yb[0], yb[1]));
  /** Gezeichnet werden höchstens GRENZE.streu Punkte: die Enden vollständig, die Mitte gleichmäßig (lib/stichprobe.ts); Linie und Achsen rechnen mit allen Werten. */
  const zeig = $derived(punkte.length > GRENZE.streu ? qqIndex(punkte.length, GRENZE.streu).map(i => punkte[i]!) : punkte);
  const hinweis = $derived(zeig.length < punkte.length ? qqHinweis(zeig.length, punkte.length) : '');
  const radius = $derived(zeig.length > 400 ? 2.5 : zeig.length > 150 ? 3.2 : 4);
  const x0 = $derived(Math.min(kleinste(xs))), x1 = $derived(Math.max(groesste(xs)));
  const beschreibung = $derived(Lx(`Q-Q-Diagramm von ${titel}, ${punkte.length} Werte. Die Punkte zeigen die Werte gegen die Werte, die bei Normalverteilung zu erwarten wären; die Linie läuft durch die Quartile. Je näher die Punkte an der Linie liegen, desto eher ist die Verteilung normal. Die Werte reichen von ${zahlDe(Math.min(kleinste(ys)), 2)} bis ${zahlDe(Math.max(groesste(ys)), 2)}.`,
    `Q-Q plot of ${titel}, ${punkte.length} values. The points show the values against the values expected under a normal distribution; the line runs through the quartiles. The closer the points lie to the line, the more normal the distribution. Values range from ${zahlDe(Math.min(kleinste(ys)), 2)} to ${zahlDe(Math.max(groesste(ys)), 2)}.`));
  const bt = $derived(bildtext('qq', { titel, name: titel, punkte: qq?.punkte ?? [], steigung: qq?.steigung ?? 1, achsenabschnitt: qq?.achsenabschnitt ?? 0 }));
</script>
{#if qq}
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <text x="24" y="26" style="font-size:16px" font-weight="650">{titel}</text>
  <text x="24" y="50" class="klein">{hinweis ? `${hinweis}. ${Lx('Linie: Normalverteilung.', 'Line: normal distribution.')}` : Lx('Punkte: Werte. Linie: Normalverteilung.', 'Dots: values. Line: normal distribution.')}</text>
  {#each ym as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  {#each xm as v}<line x1={X(v)} x2={X(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  <line x1={X(x0)} y1={Y(qq.achsenabschnitt + qq.steigung * x0)} x2={X(x1)} y2={Y(qq.achsenabschnitt + qq.steigung * x1)} stroke="var(--dg-b)" stroke-width="2.5" stroke-dasharray="7 5" />
  {#each zeig as [x, y]}<circle cx={X(x)} cy={Y(y)} r={radius} fill="var(--dg-punkt-a)" stroke="var(--dg-a)" stroke-width="1"><title>{zahlDe(x, 2)} / {zahlDe(y, 2)}</title></circle>{/each}
  <XTitel x={(L + W - R) / 2} y={H0 - 8} breite={W - L - R} text={xTitel} klasse="klein" />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={titel} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} />
{/if}
