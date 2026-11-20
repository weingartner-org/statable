<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import type { Mehrebenen } from '../lib/mehrebenen';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { iv } from '../i18n/profil';
  /** Raupendiagramm: die Abweichung jeder Gruppe vom Gesamtmittel (geschätzter zufälliger Achsenabschnitt) mit 95-%-Intervall, aufsteigend geordnet.
   *  Gefüllter Punkt: das Intervall schließt 0 aus. Leerer Punkt: nicht unterscheidbar vom Gesamtmittel. */
  let { e, yText, gText }: { e: Mehrebenen; yText: string; gText: string } = $props();
  const W = 680, H0 = 380, L0 = 62, R = 18, T = 40, U0 = 74;
  /** Linker Rand wächst mit, wenn der senkrechte Titel umbricht (Regel lib/ytitel.ts). */
  const L = $derived(L0 + yZusatz(`${Lx('Abweichung bei', 'Deviation in')} ${yText}`, H0 - T - U0, 13, true));
  const gr = $derived([...e.gruppen].map(g => ({ ...g, lo: g.abw - 1.96 * g.se, hi: g.abw + 1.96 * g.se })).sort((a, b) => a.abw - b.abw));
  const xTitel = $derived(Lx(`${gr.length} Gruppen (${gText}), nach Abweichung geordnet`, `${gr.length} groups (${gText}), ordered by deviation`));
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): Höhe und unterer Rand wachsen mit, die Zeichenfläche bleibt. */
  const XZ = $derived(xZusatz(xTitel, W - L - R, 13, true));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const lo = $derived(Math.min(0, kleinste(gr.map(g => g.lo)))), hi = $derived(Math.max(0, groesste(gr.map(g => g.hi))));
  const schritt = $derived.by(() => { const roh = (hi - lo || 1) / 5, m = 10 ** Math.floor(Math.log10(roh)); return [1, 2, 5, 10].map(f => f * m).find(f => f >= roh) ?? m; });
  const oben = $derived(Math.ceil(hi / schritt - 1e-9) * schritt), unten = $derived(Math.floor(lo / schritt + 1e-9) * schritt);
  const y = (v: number) => T + (H - T - U) * (1 - (v - unten) / (oben - unten || 1));
  const x = (i: number) => L + (W - L - R) * ((i + 0.5) / gr.length);
  const ticks = $derived(Array.from({ length: Math.round((oben - unten) / schritt) + 1 }, (_, i) => unten + i * schritt));
  const kurz = (t: string, n = 22) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
  const mitNamen = $derived(gr.length <= 30);
  const r = $derived(gr.length <= 40 ? 4.2 : gr.length <= 100 ? 3 : 2.2);
  const ausserhalb = $derived(gr.filter(g => g.lo > 0 || g.hi < 0).length);
  const beschreibung = $derived(Lx(
    `Abweichung der ${gr.length} Gruppen (${gText}) vom Gesamtmittel von ${yText}, aufsteigend geordnet, mit 95-%-Intervall. ${ausserhalb} Gruppen unterscheiden sich erkennbar vom Gesamtmittel. Niedrigste Abweichung: ${gr[0]?.name} (${zahlDe(gr[0]?.abw ?? 0, 2)}), höchste: ${gr.at(-1)?.name} (${zahlDe(gr.at(-1)?.abw ?? 0, 2)}).`,
    `Deviation of the ${gr.length} groups (${gText}) from the grand mean of ${yText}, in ascending order, with 95% interval. ${ausserhalb} groups differ visibly from the grand mean. Lowest deviation: ${gr[0]?.name} (${zahlDe(gr[0]?.abw ?? 0, 2)}), highest: ${gr.at(-1)?.name} (${zahlDe(gr.at(-1)?.abw ?? 0, 2)}).`));
  const bt = $derived.by(() => {
    const t = bildtext('mittelwerte', { name: `${Lx('Abweichung bei', 'Deviation in')} ${yText}`, gruppenName: gText, fehler: 'ki95', yAchse: { name: `${Lx('Abweichung bei', 'Deviation in')} ${yText}`, von: unten, bis: oben },
      gruppen: gr.map(g => ({ name: g.name, n: g.n, mittel: g.abw, unten: g.lo, oben: g.hi })), titel: Lx('Abweichung der Gruppen vom Gesamtmittel', 'Deviation of the groups from the grand mean') });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each ticks as v}<line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" />
  <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="var(--dg-achse)" stroke-width="1.6" stroke-dasharray="5 4" />
  <text x={W - R} y={y(0) - 6} text-anchor="end" class="klein" style="font-size:12px">{Lx('Gesamtmittel', 'grand mean')}</text>
  {#each gr as g, i (g.name)}
    {@const aus = g.lo > 0 || g.hi < 0}
    <g><title>{g.name}: {zahlDe(g.abw, 2)} {iv(zahlDe(g.lo, 2), zahlDe(g.hi, 2))}, n = {g.n}</title>
      <line x1={x(i)} x2={x(i)} y1={y(g.lo)} y2={y(g.hi)} stroke={aus ? 'var(--dg-a)' : 'var(--dg-achse)'} stroke-width={gr.length > 100 ? 1 : 1.6} opacity={aus ? 1 : 0.7} />
      <circle cx={x(i)} cy={y(g.abw)} r={r} fill={aus ? 'var(--dg-a)' : 'var(--blatt)'} stroke={aus ? 'var(--dg-a)' : 'var(--dg-achse)'} stroke-width="1.6" /></g>
    {#if mitNamen}<text transform="translate({x(i)} {H - U + 12}) rotate(-50)" text-anchor="end" class="klein" style="font-size:11px">{kurz(g.name)}</text>{/if}
  {/each}
  <XTitel x={(L + W - R) / 2} y={H0 - 8} breite={W - L - R} text={xTitel} fett />
  <YTitel x={16} y={(T + H - U) / 2} laenge={H - T - U} text={`${Lx('Abweichung bei', 'Deviation in')} ${yText}`} px={13} fett />
  <circle cx={L + 6} cy="16" r="4.2" fill="var(--dg-a)" stroke="var(--dg-a)" stroke-width="1.6" /><text x={L + 16} y="20" style="font-size:12px">{Lx('Intervall schließt 0 aus', 'interval excludes 0')}</text>
  <circle cx={L + 200} cy="16" r="4.2" fill="var(--blatt)" stroke="var(--dg-achse)" stroke-width="1.6" /><text x={L + 210} y="20" style="font-size:12px">{Lx('nicht vom Gesamtmittel unterscheidbar', 'not distinguishable from the grand mean')}</text>
</svg>
<BildBeschreibung {...bt} />
