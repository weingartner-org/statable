<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import { achsenMarken, achsenBereich } from '../lib/diagrammdaten';
  import { yZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { clusterFarbe, clusterStrich } from '../lib/clusterfarben';
  import type { ClusterProfil } from '../lib/cluster';

  /**
   * Profile der Gruppen (Später S-E, S2): je Gruppe ein Punkt je Merkmal - die Abweichung des Gruppenmittels vom Gesamtmittel in Standardabweichungen (z). Die Linien verbinden nur die Punkte einer Gruppe;
   * die Merkmale haben keine Reihenfolge. Das Bild beschreibt; es gibt keine Tests zwischen den Gruppen.
   */
  let { p, merkmale }: { p: ClusterProfil; merkmale: string[] } = $props();
  const uid = $props.id();
  const m = $derived(merkmale.length), k = $derived(p.n.length);
  const W = 720, R = 24, UO = 64;
  const T = $derived(40 + Math.ceil(k / 2) * 22);
  const yText = $derived(Lx('Abweichung vom Gesamtmittel (z)', 'Deviation from the overall mean (z)'));
  const L = $derived(64 + yZusatz(yText, 200, 13));
  const lang = $derived(Math.max(...merkmale.map(x => x.length), 0) > 10);
  const U = $derived(UO + (lang ? 92 : 0));
  const H = $derived(296 + T + (lang ? 92 : 0));
  const alle = $derived(p.zMittel.flat());
  const ber = $derived(achsenBereich(Math.min(0, ...alle), Math.max(0, ...alle), 5));
  const lo = $derived(ber[0]), hi = $derived(ber[1]);
  const Y = (v: number) => T + (H - T - U) * (1 - (v - lo) / (hi - lo || 1));
  const X = (j: number) => L + (lang ? 70 : 30) + (W - L - R - (lang ? 100 : 60)) * (m <= 1 ? 0.5 : j / (m - 1));
  const marken = $derived(achsenMarken(lo, hi, 5));
  const kurz = (t: string) => (t.length > 18 ? t.slice(0, 17) + '…' : t);
  const versatz = (g: number) => (k === 1 ? 0 : (g - (k - 1) / 2) * 6);
  const form = (g: number, cx: number, cy: number) => (g % 4 === 0 ? '' : g % 4 === 1 ? `M${cx - 5} ${cy - 5}h10v10h-10z` : g % 4 === 2 ? `M${cx} ${cy - 6.5}l6.5 11h-13z` : `M${cx} ${cy - 6.5}l6 6.5-6 6.5-6-6.5z`);
  const beschreibung = $derived(Lx(`Profile von ${k} Gruppen über ${m} Merkmale (Abweichung vom Gesamtmittel in Standardabweichungen). `, `Profiles of ${k} groups over ${m} features (deviation from the overall mean in standard deviations). `)
    + p.zMittel.map((row, g) => `${Lx('Gruppe', 'Group')} ${g + 1} (n = ${p.n[g]}): ${row.map((v, j) => `${merkmale[j]} ${zahlDe(v, 2)}`).join('; ')}.`).join(' '));
  const bt = $derived(bildtext('sonstiges', { artName: Lx('Profile der Gruppen', 'Profiles of the groups'), yAchse: { name: yText },
    saetze: [Lx('Die Linien verbinden nur die Punkte einer Gruppe; die Merkmale haben keine Reihenfolge.', 'The lines only connect the points of a group; the features have no order.')],
    tabelle: { kopf: [Lx('Merkmal', 'Feature'), ...p.n.map((n, g) => Lx(`Gruppe ${g + 1} (n = ${n})`, `Group ${g + 1} (n = ${n})`))], zeilen: merkmale.map((mm, j) => [mm, ...p.zMittel.map(row => zahlDe(row[j]!, 2))]) } }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  {#each Array(k) as _, g}
    {@const x0 = L + (g % 2) * 300}{@const y0 = 20 + Math.floor(g / 2) * 22}
    <line x1={x0} x2={x0 + 24} y1={y0} y2={y0} stroke={clusterFarbe(g + 1)} stroke-width="2.4" stroke-dasharray={clusterStrich(g + 1)} />
    <path d={form(g, x0 + 12, y0)} fill={clusterFarbe(g + 1)} stroke="none" /><circle cx={x0 + 12} cy={y0} r="4" fill={g % 4 === 0 ? clusterFarbe(g + 1) : 'none'} stroke="none" />
    <text x={x0 + 30} y={y0 + 4} style="font-size:12px">{Lx(`Gruppe ${g + 1}`, `Group ${g + 1}`)} (n = {p.n[g]})</text>
  {/each}
  {#each marken as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 8} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v, 1)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} stroke="var(--dg-achse)" stroke-width="1.5" />
  {#each p.zMittel as row, g}
    <polyline points={row.map((v, j) => `${X(j) + versatz(g)},${Y(v)}`).join(' ')} fill="none" stroke={clusterFarbe(g + 1)} stroke-width="1.6" stroke-dasharray={clusterStrich(g + 1)} opacity=".6" />
    {#each row as v, j}
      {#if g % 4 === 0}<circle cx={X(j) + versatz(g)} cy={Y(v)} r="5" fill={clusterFarbe(g + 1)} stroke="var(--blatt)" stroke-width="1"><title>{Lx(`Gruppe ${g + 1}`, `Group ${g + 1}`)}, {merkmale[j]}: {zahlDe(v, 2)}</title></circle>
      {:else}<path d={form(g, X(j) + versatz(g), Y(v))} fill={clusterFarbe(g + 1)} stroke="var(--blatt)" stroke-width="1"><title>{Lx(`Gruppe ${g + 1}`, `Group ${g + 1}`)}, {merkmale[j]}: {zahlDe(v, 2)}</title></path>{/if}
    {/each}
  {/each}
  {#each merkmale as t, j}
    {#if lang}<text transform="translate({X(j) + 4} {H - U + 14}) rotate(-35)" text-anchor="end" class="klein" style="font-size:12px"><title>{t}</title>{kurz(t)}</text>
    {:else}<text x={X(j)} y={H - U + 20} text-anchor="middle" class="klein"><title>{t}</title>{kurz(t)}</text>{/if}
  {/each}
  <YTitel x={16} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={13} klasse="klein" />
  <text x={L} y={H - 20} class="klein" style="font-size:11px">{Lx('Die Linien verbinden nur die Punkte einer Gruppe;', 'The lines only connect the points of a group;')}</text>
  <text x={L} y={H - 5} class="klein" style="font-size:11px">{Lx('die Merkmale haben keine Reihenfolge.', 'the features have no order.')}</text>
</svg>
<BildBeschreibung {...bt} />
