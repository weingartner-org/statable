<script module lang="ts">
  let zaehler = 0;
</script>
<script lang="ts">
  import { bildtext, type BaumKnoten } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { L } from '../lib/sitzung.svelte';
  import { haeuf, prozent } from '../lib/lernlaborsaetze';
  import type { Vierfeldertafel } from '../lib/lernlabor';
  /**
   * Baum mit natürlichen Häufigkeiten (Gigerenzer & Hoffrage 1995): vorwärts „krank → Test“ oder umgekehrt „Test → krank“.
   * In den Kästchen stehen Wort und Anzahl, an den Ästen die Wahrscheinlichkeit; der umgekehrte Baum zeigt die Vorhersagewerte.
   */
  let { v, richtung, namen }: { v: Vierfeldertafel; richtung: 'vor' | 'rueck'; /** Baumrechner: eigene Begriffe; im Kästchen steht dann nur der Begriff des Astes. */ namen?: { a: string; b: string } } = $props();
  const id = `lb${++zaehler}`;
  const W = 780, H = 300, BW = 122, BH = 44;
  type K = { x: number; y: number; wort: string; zahl: number };
  const vor = $derived(richtung === 'vor');
  const nicht = (w: string) => L(`nicht ${w}`, `not ${w}`);
  const wKrank = $derived(namen ? namen.a : L('krank', 'ill')), wGesund = $derived(namen ? nicht(namen.a) : L('gesund', 'healthy')), wPos = $derived(namen ? namen.b : L('positiv', 'positive')), wNeg = $derived(namen ? nicht(namen.b) : L('negativ', 'negative'));
  /** Kästchen der zweiten Stufe: mit eigenen Begriffen nur der Ast, sonst beide Wörter. */
  const pfad = (erst: string, dann: string) => (namen ? dann : `${erst}, ${dann}`);
  const wurzel = $derived<K>({ x: 8, y: H / 2 - BH / 2, wort: L('alle', 'all'), zahl: v.n });
  const ebene1 = $derived<K[]>(vor ? [{ x: 270, y: 40, wort: wKrank, zahl: v.krank }, { x: 270, y: H - 40 - BH, wort: wGesund, zahl: v.gesund }] : [{ x: 270, y: 40, wort: wPos, zahl: v.positiv }, { x: 270, y: H - 40 - BH, wort: wNeg, zahl: v.negativ }]);
  const ebene2 = $derived<K[]>(vor
    ? [{ x: 630, y: 4, wort: pfad(wKrank, wPos), zahl: v.rp }, { x: 630, y: 78, wort: pfad(wKrank, wNeg), zahl: v.fn }, { x: 630, y: 158, wort: pfad(wGesund, wPos), zahl: v.fp }, { x: 630, y: 232, wort: pfad(wGesund, wNeg), zahl: v.rn }]
    : [{ x: 630, y: 4, wort: pfad(wPos, wKrank), zahl: v.rp }, { x: 630, y: 78, wort: pfad(wPos, wGesund), zahl: v.fp }, { x: 630, y: 158, wort: pfad(wNeg, wKrank), zahl: v.fn }, { x: 630, y: 232, wort: pfad(wNeg, wGesund), zahl: v.rn }]);
  /** Wahrscheinlichkeiten an den Ästen, Reihenfolge wie ebene1 (2) und ebene2 (4). */
  const ast1 = $derived(vor ? [v.praevalenz, 1 - v.praevalenz] : [v.positiv / v.n, v.negativ / v.n]);
  const ast2 = $derived(vor ? [v.se, 1 - v.se, 1 - v.sp, v.sp] : [v.ppv, 1 - v.ppv, 1 - v.npv, v.npv]);
  const ast2Name = $derived(namen ? (vor ? ['P(B | A)', 'P(¬B | A)', 'P(B | ¬A)', 'P(¬B | ¬A)'] : ['P(A | B)', 'P(¬A | B)', 'P(A | ¬B)', 'P(¬A | ¬B)']) : vor ? ['Se', '1 − Se', '1 − Sp', 'Sp'] : ['PPV', '1 − PPV', '1 − NPV', 'NPV']);
  const ast1Name = $derived(namen ? (vor ? ['P(A)', 'P(¬A)'] : ['P(B)', 'P(¬B)']) : vor ? ['π', '1 − π'] : ['P(+)', 'P(−)']);
  const titel = $derived(namen ? (vor ? L(`Baum: erst ${wKrank}, dann ${wPos}`, `Tree: first ${wKrank}, then ${wPos}`) : L(`Umkehrbaum: erst ${wPos}, dann ${wKrank}`, `Reversed tree: first ${wPos}, then ${wKrank}`)) : vor ? L('Baum mit natürlichen Häufigkeiten: erst krank oder gesund, dann das Testergebnis', 'Tree with natural frequencies: first ill or healthy, then the test result') : L('Umkehrbaum: erst das Testergebnis, dann krank oder gesund', 'Reversed tree: first the test result, then ill or healthy'));
  const beschr = $derived(namen ? (vor
    ? L(`Von ${haeuf(v.n)} Fällen: ${wKrank} ${haeuf(v.krank)}, ${wGesund} ${haeuf(v.gesund)}. Bei ${wKrank}: ${wPos} ${haeuf(v.rp)}, ${wNeg} ${haeuf(v.fn)}. Bei ${wGesund}: ${wPos} ${haeuf(v.fp)}, ${wNeg} ${haeuf(v.rn)}.`, `Of ${haeuf(v.n)} cases: ${wKrank} ${haeuf(v.krank)}, ${wGesund} ${haeuf(v.gesund)}. With ${wKrank}: ${wPos} ${haeuf(v.rp)}, ${wNeg} ${haeuf(v.fn)}. With ${wGesund}: ${wPos} ${haeuf(v.fp)}, ${wNeg} ${haeuf(v.rn)}.`)
    : L(`Von ${haeuf(v.n)} Fällen: ${wPos} ${haeuf(v.positiv)}, ${wNeg} ${haeuf(v.negativ)}. Bei ${wPos}: ${wKrank} ${haeuf(v.rp)}, ${wGesund} ${haeuf(v.fp)}. Bei ${wNeg}: ${wKrank} ${haeuf(v.fn)}, ${wGesund} ${haeuf(v.rn)}.`, `Of ${haeuf(v.n)} cases: ${wPos} ${haeuf(v.positiv)}, ${wNeg} ${haeuf(v.negativ)}. With ${wPos}: ${wKrank} ${haeuf(v.rp)}, ${wGesund} ${haeuf(v.fp)}. With ${wNeg}: ${wKrank} ${haeuf(v.fn)}, ${wGesund} ${haeuf(v.rn)}.`)) : vor
    ? L(`Von ${haeuf(v.n)} Personen sind ${haeuf(v.krank)} krank und ${haeuf(v.gesund)} gesund. Von den Kranken testen ${haeuf(v.rp)} positiv und ${haeuf(v.fn)} negativ, von den Gesunden ${haeuf(v.fp)} positiv und ${haeuf(v.rn)} negativ.`, `Of ${haeuf(v.n)} people, ${haeuf(v.krank)} are ill and ${haeuf(v.gesund)} healthy. Of the ill, ${haeuf(v.rp)} test positive and ${haeuf(v.fn)} negative; of the healthy, ${haeuf(v.fp)} test positive and ${haeuf(v.rn)} negative.`)
    : L(`Von ${haeuf(v.n)} Personen testen ${haeuf(v.positiv)} positiv und ${haeuf(v.negativ)} negativ. Von den positiv Getesteten sind ${haeuf(v.rp)} krank und ${haeuf(v.fp)} gesund, von den negativ Getesteten ${haeuf(v.fn)} krank und ${haeuf(v.rn)} gesund.`, `Of ${haeuf(v.n)} people, ${haeuf(v.positiv)} test positive and ${haeuf(v.negativ)} negative. Of those testing positive, ${haeuf(v.rp)} are ill and ${haeuf(v.fp)} healthy; of those testing negative, ${haeuf(v.fn)} are ill and ${haeuf(v.rn)} healthy.`));
  const mitte = (k: K) => ({ rechts: k.x + BW, links: k.x, y: k.y + BH / 2 });
  const bt = $derived.by(() => {
    const ast = (n: string, w: number) => `${n}: ${prozent(w)}`;
    const k = (q: K, ast?: string): BaumKnoten => ({ text: `${q.wort}: ${haeuf(q.zahl)}`, ...(ast ? { ast } : {}) });
    const e1 = ebene1.map((q, i) => ({ ...k(q, ast(ast1Name[i]!, ast1[i]!)), kinder: [0, 1].map(c => k(ebene2[i * 2 + c]!, ast(ast2Name[i * 2 + c]!, ast2[i * 2 + c]!))) }));
    const t = bildtext('baum', { titel, wurzel: { ...k(wurzel), kinder: e1 } });
    return { ...t, beschreibung: [...t.beschreibung, beschr] };
  });
</script>
<svg class="diagramm baum" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
  {#each ebene1 as k, i}
    {@const a = mitte(wurzel)} {@const b = mitte(k)}
    <line x1={a.rechts} y1={a.y} x2={b.links} y2={b.y} stroke="var(--dg-achse)" stroke-width="1.5" />
    <text x={(a.rechts + b.links) / 2} y={(a.y + b.y) / 2 + (i === 0 ? -8 : 16)} text-anchor="middle" class="klein halo">{ast1Name[i]} = {prozent(ast1[i]!)}</text>
  {/each}
  {#each ebene2 as k, j}
    {@const von = mitte(ebene1[j < 2 ? 0 : 1]!)} {@const b = mitte(k)}
    <line x1={von.rechts} y1={von.y} x2={b.links} y2={b.y} stroke="var(--dg-achse)" stroke-width="1.5" />
    <text x={(von.rechts + b.links) / 2 + 8} y={(von.y + b.y) / 2 + (j % 2 === 0 ? -6 : 14)} text-anchor="middle" class="klein halo">{ast2Name[j]} = {prozent(ast2[j]!)}</text>
  {/each}
  {#each [wurzel, ...ebene1, ...ebene2] as k, i}
    <rect x={k.x} y={k.y} width={BW} height={BH} rx="8" fill={i === 0 ? 'var(--blatt-2)' : 'var(--blatt)'} stroke="var(--dg-achse)" stroke-width="1.5" />
    <text x={k.x + BW / 2} y={k.y + 18} text-anchor="middle" class="klein">{k.wort}</text>
    <text x={k.x + BW / 2} y={k.y + 36} text-anchor="middle" style="font-size:15px;font-weight:700">{haeuf(k.zahl)}</text>
  {/each}
</svg>
<BildBeschreibung {...bt} />

<style>
  .halo { paint-order: stroke; stroke: var(--blatt); stroke-width: 4px; stroke-linejoin: round; }
</style>
