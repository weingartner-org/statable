<script lang="ts">
  /** Pareto-Diagramm (S-I): Säulen nach Größe, dazu die kumulierte Summe in Prozent (rechte Achse). */
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  import type { Haeufigkeit } from '../lib/ergebnis';
  import { achsenBereich, achsenMarken, balkenPfad } from '../lib/diagrammdaten';
  import { paretoZeilen, wenigeWichtige } from '../lib/pareto';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { proz } from '../i18n/profil';
  let { h }: { h: Haeufigkeit } = $props();
  const z = $derived(paretoZeilen(h.werte)), k = $derived(wenigeWichtige(z));
  const W = 560, L1 = 64, R1 = 64, T1 = 76, U10 = 64, H10 = 360;
  const kurz = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
  const bereich = $derived(achsenBereich(0, Math.max(...z.map(r => r.anzahl), 1)));
  const marken = $derived(achsenMarken(bereich[0], bereich[1]));
  const platz = $derived((W - L1 - R1) / Math.max(1, z.length));
  const XZ = $derived(Math.max(0, ...z.map(r => xZusatz(r.name, platz * 0.94))));
  const U1 = $derived(U10 + XZ), H1 = $derived(H10 + XZ);
  const Y = (v: number) => T1 + (H1 - T1 - U1) * (1 - v / (bereich[1] || 1));
  const Yp = (p: number) => T1 + (H1 - T1 - U1) * (1 - p);
  const xm = (i: number) => L1 + platz * i + platz * 0.5;
  const linie = $derived(z.map((r, i) => `${i ? 'L' : 'M'}${xm(i).toFixed(1)} ${Yp(r.kumuliert).toFixed(1)}`).join(' '));
  const bt = $derived(bildtext('sonstiges', {
    artName: Lx('Pareto-Diagramm', 'Pareto chart'), titel: h.name,
    yAchse: { name: Lx('Anzahl', 'Count'), von: 0, bis: bereich[1] },
    saetze: [Lx(`Säulen nach Größe geordnet, ${z.length} Kategorien (n = ${h.n}); dazu die kumulierte Summe in Prozent (rechte Achse). Die ersten ${k} Säulen sind hervorgehoben.`, `Columns sorted by size, ${z.length} categories (n = ${h.n}); with the cumulative sum in percent (right axis). The first ${k} columns are highlighted.`)],
    tabelle: { kopf: [h.name, Lx('Anzahl', 'Count'), Lx('Anteil', 'Share'), Lx('kumuliert', 'cumulative')], zeilen: z.map(r => [r.name, zahlDe(r.anzahl), proz(zahlDe(r.anteil * 100, 1)), proz(zahlDe(r.kumuliert * 100, 1))]) }
  }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H1}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <text x="24" y="26" style="font-size:16px" font-weight="650">{kurz(h.name, 56)}</text>
  <text x="24" y="50" class="klein">{Lx('Anzahl und kumulierter Anteil', 'Count and cumulative share')} (n = {h.n})</text>
  {#each marken as v}<line x1={L1} x2={W - R1} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L1 - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  {#each [0, 0.25, 0.5, 0.75, 1] as p}<text x={W - R1 + 10} y={Yp(p) + 4} class="klein">{proz(zahlDe(p * 100, 0))}</text>{/each}
  <line x1={L1} x2={W - R1} y1={H1 - U1} y2={H1 - U1} stroke="var(--dg-achse)" />
  {#each z as r, i}
    {@const bw = platz * 0.7}
    <path d={balkenPfad(xm(i) - bw / 2, Y(r.anzahl), bw, Math.max(0, Y(0) - Y(r.anzahl)), 4)} fill="var(--dg-a)" opacity={i < k ? 1 : 0.55}><title>{r.name}: {zahlDe(r.anzahl)} ({proz(zahlDe(r.anteil * 100, 0))})</title></path>
    <g><title>{r.name}</title><XTitel x={xm(i)} y={H10 - U10 + 22} breite={platz * 0.94} text={r.name} /></g>
  {/each}
  <path d={linie} fill="none" stroke="var(--dg-b, var(--tinte))" stroke-width="2.5" stroke-linecap="round" />
  {#each z as r, i}<circle cx={xm(i)} cy={Yp(r.kumuliert)} r="4" fill="var(--dg-b, var(--tinte))"><title>{r.name}: {proz(zahlDe(r.kumuliert * 100, 0))}</title></circle>{/each}
  <YTitel x={18} y={(T1 + H1 - U1) / 2} laenge={H1 - T1 - U1} text={Lx('Anzahl', 'Count')} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} />
