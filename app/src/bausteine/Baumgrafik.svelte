<script lang="ts" module>
  /** Ein Knoten für die Zeichnung: Text im Knoten, Text an den zwei Ästen (nur mit Kindern) */
  export interface GrafikKnoten { text: string[]; links?: GrafikKnoten; rechts?: GrafikKnoten; astLinks?: string; astRechts?: string; blatt: boolean }
</script>
<script lang="ts">
  import { bildtext, type BaumKnoten } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  /** Entscheidungsbaum als Zeichnung (oben die Wurzel, unten die Blätter). Die Wenn-Liste daneben bleibt die Textfassung. */
  import DiagrammExport from './DiagrammExport.svelte';
  import { L } from '../lib/sitzung.svelte';

  let { wurzel, titel }: { wurzel: GrafikKnoten; titel: string } = $props();
  const BW = 112, BH = 46, DX = 12, DY = 78, M = 12;
  interface Platz { k: GrafikKnoten; x: number; y: number; kids: Platz[] }
  const baum = $derived.by(() => {
    let blatt = 0, tiefe = 0;
    const lauf = (k: GrafikKnoten, d: number): Platz => {
      tiefe = Math.max(tiefe, d);
      if (k.links && k.rechts) { const a = lauf(k.links, d + 1), b = lauf(k.rechts, d + 1); return { k, x: (a.x + b.x) / 2, y: d, kids: [a, b] }; }
      return { k, x: blatt++, y: d, kids: [] };
    };
    const w = lauf(wurzel, 0);
    return { w, blaetter: blatt, tiefe };
  });
  const W = $derived(M * 2 + baum.blaetter * (BW + DX)), H = $derived(M * 2 + (baum.tiefe + 1) * DY);
  const px = (x: number) => M + x * (BW + DX) + BW / 2, py = (y: number) => M + y * DY;
  const alle = $derived.by(() => { const r: Platz[] = []; const lauf = (p: Platz) => { r.push(p); p.kids.forEach(lauf); }; lauf(baum.w); return r; });
  const kuerzen = (t: string, n = 17) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
  const konv = (k: GrafikKnoten, ast?: string): BaumKnoten => ({ text: k.text.join(', '), ...(ast ? { ast } : {}), ...(k.links && k.rechts ? { kinder: [konv(k.links, k.astLinks), konv(k.rechts, k.astRechts)] } : {}) });
  const bt = $derived(bildtext('baum', { titel, wurzel: konv(wurzel) }));
</script>

<DiagrammExport {titel}>
  <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz}>
    {#each alle as p (p)}{#each p.kids as c, i (i)}
      <line x1={px(p.x)} y1={py(p.y) + BH} x2={px(c.x)} y2={py(c.y)} stroke="var(--tinte-2, #666)" />
      <text x={(px(p.x) + px(c.x)) / 2 + (i === 0 ? -4 : 4)} y={(py(p.y) + BH + py(c.y)) / 2 + 3} text-anchor={i === 0 ? 'end' : 'start'} class="klein" fill="var(--tinte)" paint-order="stroke" stroke="var(--blatt)" stroke-width="3">{kuerzen(i === 0 ? (p.k.astLinks ?? '') : (p.k.astRechts ?? ''), 15)}</text>
    {/each}{/each}
    {#each alle as p (p)}
      <rect x={px(p.x) - BW / 2} y={py(p.y)} width={BW} height={BH} rx="6" fill={p.k.blatt ? 'var(--dg-a)' : 'var(--blatt)'} fill-opacity={p.k.blatt ? 0.18 : 1} stroke="var(--dg-a)" />
      {#each p.k.text as zl, i (i)}<text x={px(p.x)} y={py(p.y) + 16 + i * 14} text-anchor="middle" class="klein" fill="var(--tinte)" font-weight={i === 0 ? 650 : 400}>{kuerzen(zl)}</text>{/each}
    {/each}
  </svg>
</DiagrammExport>
<BildBeschreibung {...bt} />
