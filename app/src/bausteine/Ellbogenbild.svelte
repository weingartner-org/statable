<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { achsenMarken, achsenBereich } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import type { ClusterKErgebnis } from '../lib/clusterblatt';

  /**
   * Zahl der Gruppen (Später S-E, S2): links die Streuung innerhalb der Gruppen je Zahl der Gruppen (Ellbogen; k = 1 ist die Gesamtstreuung), rechts die mittlere Silhouette mit den Linien bei ,25 und ,50.
   * Die Zahl mit der größten Silhouette ist ein Hinweis (Ring), die gewählte ist gefüllt. Die Person entscheidet.
   */
  let { ks, tss, k, vorschlag }: { ks: ClusterKErgebnis[]; tss: number; k: number; vorschlag: number | null } = $props();
  const uid = $props.id();
  const W = 720, PH = 280, T = 38, T2 = 62, U = 52, X0 = 62, X1 = 696;
  const hatSil = $derived(ks.some(x => x.silhouette !== null));
  const H = $derived(PH * (hatSil ? 2 : 1) + 6);
  const kAlle = $derived([1, ...ks.map(x => x.k)]);
  const wss = $derived([{ k: 1, w: tss }, ...ks.map(x => ({ k: x.k, w: x.wss }))]);
  const wBer = $derived(achsenBereich(0, Math.max(...wss.map(x => x.w), 1e-9), 4));
  const wLo = $derived(wBer[0]), wHi = $derived(wBer[1]);
  const sil = $derived(ks.filter(x => x.silhouette !== null).map(x => ({ k: x.k, s: x.silhouette! })));
  const sHi = $derived(Math.max(0.6, Math.ceil(Math.max(0.1, ...sil.map(x => x.s)) * 10) / 10)), sLo = $derived(Math.min(0, Math.floor(Math.min(0, ...sil.map(x => x.s)) * 10) / 10));
  const XK = (_p: number, kk: number) => X0 + 14 + (X1 - X0 - 28) * ((kk - kAlle[0]!) / ((kAlle.at(-1)! - kAlle[0]!) || 1));
  const YW = (v: number) => T + (PH - T - U) * (1 - (v - wLo) / (wHi - wLo || 1));
  const YS = (v: number) => PH + T2 + (PH - T2 - U) * (1 - (v - sLo) / (sHi - sLo || 1));
  const marken = $derived(achsenMarken(wLo, wHi, 4));
  const sMarken = $derived(achsenMarken(sLo, sHi, 5));
  const beschreibung = $derived(Lx(`Zahl der Gruppen: Streuung innerhalb der Gruppen bei k = ${ks.map(x => `${x.k}: ${zahlDe(x.wss, 1)}`).join('; ')}. `, `Number of groups: spread within the groups at k = ${ks.map(x => `${x.k}: ${zahlDe(x.wss, 1)}`).join('; ')}. `)
    + (hatSil ? Lx(`Mittlere Silhouette: ${sil.map(x => `${x.k}: ${zahlDe(x.s, 2)}`).join('; ')}. `, `Mean silhouette: ${sil.map(x => `${x.k}: ${zahlDe(x.s, 2)}`).join('; ')}. `) : '')
    + (vorschlag !== null ? Lx(`Die größte Silhouette hat k = ${vorschlag}, gewählt ist k = ${k}.`, `The largest silhouette is at k = ${vorschlag}, k = ${k} is chosen.`) : Lx(`Gewählt ist k = ${k}.`, `k = ${k} is chosen.`)));
  const bt = $derived(bildtext('sonstiges', { artName: Lx('Zahl der Gruppen: Ellbogen und Silhouette', 'Number of groups: elbow and silhouette'), xAchse: { name: Lx('Zahl der Gruppen (k)', 'Number of groups (k)') }, saetze: [beschreibung],
    tabelle: { kopf: [Lx('Zahl der Gruppen (k)', 'Number of groups (k)'), Lx('Streuung innerhalb der Gruppen', 'Spread within the groups'), ...(hatSil ? [Lx('Mittlere Silhouette', 'Mean silhouette')] : [])],
      zeilen: wss.map(x => { const sv = sil.find(q => q.k === x.k); return [x.k, zahlDe(x.w, 1), ...(hatSil ? [sv ? zahlDe(sv.s, 2) : ''] : [])]; }) } }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <!-- Ellbogen (oben) -->
  <text x={X0} y="22" font-weight="650" style="font-size:14px">{Lx('Streuung innerhalb der Gruppen', 'Spread within the groups')}</text>
  {#each marken as v}<line x1={X0} x2={X1} y1={YW(v)} y2={YW(v)} stroke="var(--dg-gitter)" /><text x={X0 - 6} y={YW(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={X0} x2={X1} y1={PH - U} y2={PH - U} stroke="var(--dg-achse)" /><line x1={X0} x2={X0} y1={T} y2={PH - U} stroke="var(--dg-achse)" />
  <polyline points={wss.map(x => `${XK(0, x.k).toFixed(1)},${YW(x.w).toFixed(1)}`).join(' ')} fill="none" stroke="var(--dg-a)" stroke-width="2.4" />
  {#each wss as x}<circle cx={XK(0, x.k)} cy={YW(x.w)} r={x.k === k ? 7 : 4.5} fill={x.k === k ? 'var(--dg-a)' : 'var(--blatt)'} stroke="var(--dg-a)" stroke-width="2.4"><title>k = {x.k}: {zahlDe(x.w, 1)}</title></circle><text x={XK(0, x.k)} y={PH - U + 18} text-anchor="middle" class="klein">{x.k}</text>{/each}
  <text x={(X0 + X1) / 2} y={PH - 10} text-anchor="middle" class="klein">{Lx('Zahl der Gruppen (k)', 'Number of groups (k)')}</text>
  <!-- Silhouette (unten) -->
  {#if hatSil}
    <text x={X0} y={PH + 22} font-weight="650" style="font-size:14px">{Lx('Mittlere Silhouette', 'Mean silhouette')}</text>
    {#if vorschlag !== null}<text x={X0} y={PH + 42} class="klein" style="font-size:11px">{Lx('Gestrichelter Ring: größte Silhouette (Hinweis)', 'Dashed ring: largest silhouette (hint)')}</text>{/if}
    {#each sMarken as v}<line x1={X0} x2={X1} y1={YS(v)} y2={YS(v)} stroke="var(--dg-gitter)" /><text x={X0 - 6} y={YS(v) + 4} text-anchor="end" class="klein">{zahlDe(v, 1)}</text>{/each}
    <line x1={X0} x2={X1} y1={PH + PH - U} y2={PH + PH - U} stroke="var(--dg-achse)" /><line x1={X0} x2={X0} y1={PH + T2} y2={PH + PH - U} stroke="var(--dg-achse)" />
    <line x1={X0} x2={X1} y1={YS(0.25)} y2={YS(0.25)} stroke="var(--dg-b)" stroke-width="2" stroke-dasharray="7 5" />
    <text x={X0 + 8} y={YS(0.25) + 16} class="klein" style="font-size:11px;fill:var(--dg-b)">{Lx('unter ,25: kaum Struktur', 'below .25: hardly any structure')}</text>
    <polyline points={sil.map(x => `${XK(1, x.k).toFixed(1)},${YS(x.s).toFixed(1)}`).join(' ')} fill="none" stroke="var(--dg-a)" stroke-width="2.4" />
    {#each sil as x}
      {#if x.k === vorschlag}<circle cx={XK(1, x.k)} cy={YS(x.s)} r="11" fill="none" stroke="var(--tinte)" stroke-width="1.6" stroke-dasharray="3 3" />{/if}
      <circle cx={XK(1, x.k)} cy={YS(x.s)} r={x.k === k ? 7 : 4.5} fill={x.k === k ? 'var(--dg-a)' : 'var(--blatt)'} stroke="var(--dg-a)" stroke-width="2.4"><title>k = {x.k}: {zahlDe(x.s, 2)}</title></circle><text x={XK(1, x.k)} y={PH + PH - U + 18} text-anchor="middle" class="klein">{x.k}</text>
    {/each}
    <text x={(X0 + X1) / 2} y={PH + PH - 10} text-anchor="middle" class="klein">{Lx('Zahl der Gruppen (k)', 'Number of groups (k)')}</text>
  {/if}
</svg>
<BildBeschreibung {...bt} />
