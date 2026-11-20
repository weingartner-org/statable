<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { kleinste, groesste } from '../lib/menge';
  import type { PraePost } from '../lib/ergebnis';
  import { tQuantil } from '../lib/verteilung';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  /** Bis 60 Personen: eine Linie je Person von vorher nach nachher, dazu die Mittelwerte. Darüber: nur zwei Mittelwerte mit 95 %-KI (sonst wird es ein Strichknäuel). */
  const MAX_LINIEN = 60;
  let { e, paare, vorherText, nachherText }: { e: PraePost; paare: [number, number][]; vorherText: string; nachherText: string } = $props();
  const W = 560, H = 380, L = 64, R = 40, T = 24, U = 64;
  const linien = $derived(paare.length <= MAX_LINIEN);
  /** Achsenbeschriftung: höchstens zwei Zeilen à 30 Zeichen, sonst „…“ - zwei lange Fragetexte liefen sonst ineinander (09.10.). */
  function zweiZeilen(text: string, n = 30): string[] {
    const woerter = text.split(/\s+/).filter(Boolean), z: string[] = [''];
    for (const w of woerter) { const k = z[z.length - 1]!; if (!k || (k + ' ' + w).length <= n) z[z.length - 1] = k ? k + ' ' + w : w; else z.push(w); }
    const aus = z.slice(0, 2).map(x => (x.length > n ? x.slice(0, n - 1) + '…' : x));
    if (z.length > 2) aus[1] = aus[1]!.replace(/\s*…?$/, '').slice(0, n - 2) + ' …';
    return aus;
  }
  const kiH = (sd: number) => tQuantil(0.975, e.n - 1) * sd / Math.sqrt(e.n);
  const mw = $derived([{ m: e.m1, h: kiH(e.sd1), x: L + (W - L - R) * 0.28, f: 'var(--dg-a)', t: vorherText }, { m: e.m2, h: kiH(e.sd2), x: L + (W - L - R) * 0.78, f: 'var(--dg-b)', t: nachherText }]);
  const alle = $derived([...paare.flat(), ...mw.flatMap(g => [g.m - g.h, g.m + g.h])]);
  const lo = $derived(Math.min(kleinste(alle))), hi = $derived(Math.max(groesste(alle)));
  const schritt = $derived.by(() => { const roh = (hi - lo || 1) / 5, m = 10 ** Math.floor(Math.log10(roh)); return [1, 2, 5, 10].map(f => f * m).find(f => f >= roh) ?? m; });
  const oben = $derived(Math.ceil(hi / schritt) * schritt), unten = $derived(Math.floor(lo / schritt) * schritt);
  const y = (v: number) => T + (H - T - U) * (1 - (v - unten) / (oben - unten || 1));
  const ticks = $derived(Array.from({ length: Math.round((oben - unten) / schritt) + 1 }, (_, i) => unten + i * schritt));
  const beschreibung = $derived((e.diff >= 0
    ? Lx(`Mittelwert ${vorherText}: ${zahlDe(e.m1, 1)}, ${nachherText}: ${zahlDe(e.m2, 1)}; im Schnitt ${zahlDe(Math.abs(e.diff), 1)} höher nachher (95 %-KI der Veränderung ${zahlDe(e.diffLo, 1)} bis ${zahlDe(e.diffHi, 1)}). `,
        `Mean ${vorherText}: ${zahlDe(e.m1, 1)}, ${nachherText}: ${zahlDe(e.m2, 1)}; on average ${zahlDe(Math.abs(e.diff), 1)} higher afterwards (95% CI of the change ${zahlDe(e.diffLo, 1)} to ${zahlDe(e.diffHi, 1)}). `)
    : Lx(`Mittelwert ${vorherText}: ${zahlDe(e.m1, 1)}, ${nachherText}: ${zahlDe(e.m2, 1)}; im Schnitt ${zahlDe(Math.abs(e.diff), 1)} niedriger nachher (95 %-KI der Veränderung ${zahlDe(e.diffLo, 1)} bis ${zahlDe(e.diffHi, 1)}). `,
        `Mean ${vorherText}: ${zahlDe(e.m1, 1)}, ${nachherText}: ${zahlDe(e.m2, 1)}; on average ${zahlDe(Math.abs(e.diff), 1)} lower afterwards (95% CI of the change ${zahlDe(e.diffLo, 1)} to ${zahlDe(e.diffHi, 1)}). `)) +
    (linien ? Lx(`${paare.length} dünne Linien: eine je Person von vorher nach nachher.`, `${paare.length} thin lines: one per person from before to after.`) : Lx('Striche: 95 %-KI der Mittelwerte.', 'Whiskers: 95% CI of the means.')));
  const bt = $derived(bildtext('sonstiges', {
    artName: Lx('Vorher-nachher-Diagramm', 'Before-and-after chart'), titel: Lx('Vorher und nachher', 'Before and after'),
    yAchse: { name: Lx('Wert', 'Value'), von: unten, bis: oben }, saetze: [beschreibung],
    tabelle: { kopf: [Lx('Person', 'Person'), vorherText, nachherText], zeilen: paare.map((p, i) => [i + 1, zt(p[0]), zt(p[1])]) }
  }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each ticks as v}<line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" />
  {#if linien}
    {#each paare as [a, b]}<line x1={mw[0]!.x} y1={y(a)} x2={mw[1]!.x} y2={y(b)} stroke="var(--dg-punkt-a)" stroke-width="1.5" stroke-linecap="round" /><circle cx={mw[0]!.x} cy={y(a)} r="2.5" fill="var(--dg-punkt-a)" /><circle cx={mw[1]!.x} cy={y(b)} r="2.5" fill="var(--dg-punkt-b)" />{/each}
  {/if}
  <line x1={mw[0]!.x} y1={y(e.m1)} x2={mw[1]!.x} y2={y(e.m2)} stroke="var(--tinte)" stroke-width="3.5" stroke-linecap="round" />
  {#each mw as g}
    <line x1={g.x} x2={g.x} y1={y(g.m + g.h)} y2={y(g.m - g.h)} stroke={g.f} stroke-width="2.5" />
    <line x1={g.x - 10} x2={g.x + 10} y1={y(g.m + g.h)} y2={y(g.m + g.h)} stroke={g.f} stroke-width="2.5" /><line x1={g.x - 10} x2={g.x + 10} y1={y(g.m - g.h)} y2={y(g.m - g.h)} stroke={g.f} stroke-width="2.5" />
    <circle cx={g.x} cy={y(g.m)} r="6" fill={g.f} stroke="var(--tinte)" stroke-width="1.5" />
    <text x={g.x + 14} y={y(g.m) - 10} font-weight="650" style="font-size:15px">{zahlDe(g.m, 1)}</text>
    <text x={g.x} y={H - U + 22} text-anchor="middle" class="klein">{#each zweiZeilen(g.t) as z, i}<tspan x={g.x} dy={i ? 15 : 0}>{z}</tspan>{/each}</text>
  {/each}
  <text x={(W + L) / 2} y={H - 8} text-anchor="middle" class="klein">{linien ? Lx('Dünne Linien: Personen. Dicke Linie: Mittelwert. Striche: 95 %-KI.', 'Thin lines: people. Thick line: mean. Whiskers: 95% CI.') : Lx('Linie: Mittelwerte. Striche: 95 %-KI.', 'Line: means. Whiskers: 95% CI.')}</text>
</svg>
<BildBeschreibung {...bt} />
