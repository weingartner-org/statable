<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { kleinste, groesste } from '../lib/menge';
  import type { IccErgebnis } from '../lib/ergebnis';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { GRENZE, zieheStichprobe, punkteHinweis } from '../lib/stichprobe';
  /** Eine Linie je Fall über die Beurteilenden (bis 60 Fälle, darüber nur Punkte), dazu der Mittelwert je Beurteilende.
   *  Laufen die Linien parallel, ist die Konsistenz hoch; liegen sie auf gleicher Höhe, auch die absolute Übereinstimmung. */
  const MAX_LINIEN = 60;
  let { e, daten, namen }: { e: IccErgebnis; daten: number[][]; namen: string[] } = $props();
  const k = $derived(namen.length);
  const W = 560, H = 380, L = 64, R = 40, U = 64;
  /** Einzelne Fälle nur bis zur Grenze (lib/stichprobe.ts, bei vielen Beurteilenden weniger); Mittelwerte und Achsen rechnen mit allen. */
  const zeig = $derived(zieheStichprobe(daten, Math.max(100, Math.floor(GRENZE.streu / Math.max(1, namen.length)))));
  const hinweis = $derived(zeig.gekuerzt ? punkteHinweis(zeig.auswahl.length, zeig.gesamt) : '');
  const T = $derived(hinweis ? 40 : 24);
  const x = (j: number) => L + (W - L - R) * (k === 1 ? 0.5 : 0.1 + 0.8 * j / (k - 1));
  const linien = $derived(daten.length <= MAX_LINIEN);
  const alle = $derived(daten.flat());
  const lo = $derived(Math.min(kleinste(alle))), hi = $derived(Math.max(groesste(alle)));
  const schritt = $derived.by(() => { const roh = (hi - lo || 1) / 5, m = 10 ** Math.floor(Math.log10(roh)); return [1, 2, 5, 10].map(f => f * m).find(f => f >= roh) ?? m; });
  const oben = $derived(Math.ceil(hi / schritt) * schritt), unten = $derived(Math.floor(lo / schritt) * schritt);
  const y = (v: number) => T + (H - T - U) * (1 - (v - unten) / (oben - unten || 1));
  const ticks = $derived(Array.from({ length: Math.round((oben - unten) / schritt) + 1 }, (_, i) => unten + i * schritt));
  const kurzName = (t: string) => (t.length > 18 ? t.slice(0, 17) + '…' : t);
  const mwListe = $derived(namen.map((n, j) => `${n} ${zahlDe(e.mittelwerte[j]!, 1)}`).join(', '));
  const beschreibung = $derived(Lx(`Werte von ${daten.length} Fällen bei ${k} Beurteilenden. Mittelwerte: ${mwListe}. `, `Values of ${daten.length} cases for ${k} raters. Means: ${mwListe}. `) +
    (linien ? Lx('Je Fall eine dünne Linie über die Beurteilenden.', 'One thin line per case across the raters.') : Lx('Je Fall ein Punkt.', 'One dot per case.')) + (hinweis ? ' ' + hinweis + '.' : ''));
  const bt = $derived(bildtext('sonstiges', { artName: Lx('Beurteilungen je Fall', 'Ratings per case'), yAchse: { name: Lx('Wert', 'Value') }, saetze: [beschreibung],
    tabelle: { kopf: [Lx('Fall', 'Case'), ...namen], zeilen: [[Lx('Mittelwert', 'Mean'), ...e.mittelwerte.map(m => zahlDe(m, 2))], ...daten.map((z, i) => [i + 1, ...z.map(v => zahlDe(v, 2))])] } }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#if hinweis}<text x={L} y="18" class="klein">{hinweis}</text>{/if}
  {#each ticks as v}<line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" />
  {#if linien}{#each daten as z}<polyline points={z.map((v, j) => `${x(j)},${y(v)}`).join(' ')} fill="none" stroke="var(--dg-punkt-a)" stroke-width="1.5" stroke-linejoin="round" />{/each}{/if}
  {#each zeig.auswahl as z}{#each z as v, j}<circle cx={x(j)} cy={y(v)} r={linien ? 2.5 : 3} fill="var(--dg-punkt-a)" />{/each}{/each}
  <polyline points={e.mittelwerte.map((m, j) => `${x(j)},${y(m)}`).join(' ')} fill="none" stroke="var(--tinte)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  {#each e.mittelwerte as m, j}
    <circle cx={x(j)} cy={y(m)} r="6" fill="var(--dg-a)" stroke="var(--tinte)" stroke-width="1.5" />
    <text x={x(j) + 12} y={y(m) - 10} font-weight="650" style="font-size:15px">{zahlDe(m, 1)}</text>
    <text x={x(j)} y={H - U + 24} text-anchor="middle" class="klein">{kurzName(namen[j]!)}</text>
  {/each}
  <text x={(W + L) / 2} y={H - 8} text-anchor="middle" class="klein">{Lx('Dünne Linien: Fälle. Dicke Linie: Mittelwert je Beurteilende.', 'Thin lines: cases. Thick line: mean per rater.')}</text>
</svg>
<BildBeschreibung {...bt} />
