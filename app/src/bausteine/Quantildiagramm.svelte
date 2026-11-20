<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { GRENZE, zieheStichprobe, punkteHinweis } from '../lib/stichprobe';
  import { achsenMarken, entzerre } from '../lib/vorhdiagramm';
  import { tauText } from '../lib/quantil';

  /** Quantilregression mit einer Zahl als Vorhersagegröße (Später S-E): die Punkte und je τ eine Gerade (der Median kräftig, die anderen dünn), am Ende der Linie beschriftet.
   *  Die OLS-Gerade des Streudiagramms zeichnet dieser Baustein nicht - er zeigt die Geraden der Tabelle. */
  let { punkte, linien, xText, yText }: { punkte: [number, number][]; linien: { tau: number; a: number; b: number }[]; xText: string; yText: string } = $props();
  const W = 560, H0 = 360, L0 = 64, U0 = 56, R = 76;
  const zeig = $derived(zieheStichprobe(punkte, GRENZE.streu));
  const hinweis = $derived(zeig.gekuerzt ? punkteHinweis(zeig.auswahl.length, zeig.gesamt) : '');
  const T = $derived(hinweis ? 40 : 24);
  const L = $derived(L0 + yZusatz(yText, H0 - T - U0, 13, false));
  const XZ = $derived(xZusatz(xText, W - L - R));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const xs = $derived(punkte.map(p => p[0])), ys = $derived(punkte.map(p => p[1]));
  const [x0, x1] = $derived([Math.min(kleinste(xs)), Math.max(groesste(xs))]);
  const alleY = $derived([...ys, ...linien.flatMap(l => [l.a + l.b * x0, l.a + l.b * x1])]);
  const [y0, y1] = $derived([Math.min(kleinste(alleY)), Math.max(groesste(alleY))]);
  const pad = (a: number, b: number) => (b - a || 1) * 0.06;
  const X = (v: number) => L + (W - L - R) * (v - (x0 - pad(x0, x1))) / ((x1 - x0 || 1) + 2 * pad(x0, x1));
  const Y = (v: number) => T + (H - T - U) * (1 - (v - (y0 - pad(y0, y1))) / ((y1 - y0 || 1) + 2 * pad(y0, y1)));
  const sortiert = $derived([...linien].sort((p, q) => p.tau - q.tau));
  const marken = $derived(entzerre(sortiert.map(l => Y(l.a + l.b * x1)), 13, T + 6, H - U - 2));
  const kurz = (t: number) => (t === 0.5 ? Lx('Median', 'median') : `τ = ${tauText(t)}`);
  const bildText = $derived(Lx(`Streudiagramm mit ${punkte.length} Fällen und ${linien.length} Quantilgeraden (${sortiert.map(l => `${kurz(l.tau)}: ${zahlDe(l.b, 2)} ${yText} je Einheit ${xText}`).join('; ')}).`,
    `Scatter plot of ${punkte.length} cases with ${linien.length} quantile lines (${sortiert.map(l => `${kurz(l.tau)}: ${zahlDe(l.b, 2)} ${yText} per unit of ${xText}`).join('; ')}).`) + (hinweis ? ` ${hinweis}.` : ''));
  const deckkraft = (t: number) => (t === 0.5 ? 1 : 0.7);
  const dicke = (t: number) => (t === 0.5 ? 3.2 : 1.8);
  const strich = (i: number, t: number) => (t === 0.5 ? undefined : i % 2 ? '7 4' : '2 3');
  const bt = $derived(bildtext('sonstiges', {
    artName: Lx('Streudiagramm mit Quantilgeraden', 'Scatter plot with quantile lines'), titel: `${yText} ${Lx('über', 'over')} ${xText}`,
    xAchse: { name: xText, von: x0, bis: x1 }, yAchse: { name: yText, von: y0, bis: y1 }, saetze: [bildText],
    tabelle: { kopf: [Lx('Quantil', 'Quantile'), Lx('Achsenabschnitt', 'Intercept'), Lx('Steigung', 'Slope')], zeilen: sortiert.map(l => [l.tau === 0.5 ? Lx('Median', 'median') : `${Lx('Tau', 'Tau')} ${tauText(l.tau)}`, zt(l.a, 3), zt(l.b, 3)]) }
  }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each achsenMarken(y0, y1) as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  {#each achsenMarken(x0, x1) as v}<text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  {#if hinweis}<text x={L} y="18" class="klein">{hinweis}</text>{/if}
  {#each zeig.auswahl as [x, y]}<circle cx={X(x)} cy={Y(y)} r="3.5" fill="var(--dg-punkt-a)" />{/each}
  {#each sortiert as l, i (l.tau)}
    <line x1={X(x0)} y1={Y(l.a + l.b * x0)} x2={X(x1)} y2={Y(l.a + l.b * x1)} stroke="var(--dg-b)" stroke-width={dicke(l.tau)} stroke-opacity={deckkraft(l.tau)} stroke-dasharray={strich(i, l.tau)} stroke-linecap="round" />
    <text x={X(x1) + 6} y={marken[i]! + 4} class="klein" font-weight={l.tau === 0.5 ? 600 : undefined} fill="var(--dg-b)">{kurz(l.tau)}</text>
  {/each}
  <XTitel x={(L + W - R) / 2} y={H0 - 8} breite={W - L - R} text={xText} klasse="klein" />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} />
