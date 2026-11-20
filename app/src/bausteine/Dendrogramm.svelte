<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { achsenMarken } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { dendrogrammBaum } from '../lib/cluster';
  import { clusterFarbe, clusterStrich } from '../lib/clusterfarben';

  /**
   * Das Dendrogramm der Ward-Rechnung (Später S-E, S2), waagerecht: links die Fälle, nach rechts wächst der Abstand beim Zusammenlegen (Höhe = √(2·Zuwachs der Streuung), wie hclust ward.D2).
   * Bis 60 Fälle vollständig; darüber gestutzt: die obersten 30 Verschmelzungen als Äste, die Blätter sind Gruppen mit ihrer Größe. Die senkrechte gestrichelte Linie ist der Schnitt bei k Gruppen;
   * jede Gruppe hat Farbe und Strichart. Die Beschriftung der Fälle dient nur der Anzeige.
   */
  let { mergeA, mergeB, hoehe, n, k, beschriftung }: { mergeA: number[]; mergeB: number[]; hoehe: number[]; n: number; k: number; beschriftung: (fall: number) => string } = $props();
  const uid = $props.id();
  const W = 720, R = 40, T = 22, U = 56, ZEILE = 15;
  const baum = $derived(dendrogrammBaum(mergeA, mergeB, hoehe, n, k));
  const gestutzt = $derived(n > 60);
  const L = $derived(gestutzt ? 90 : 118);
  const H = $derived(T + U + Math.max(8, baum.blaetter) * ZEILE);
  const hmax = $derived(baum.hoeheMax || 1);
  const X = (h: number) => L + 10 + (W - L - R - 10) * (h / hmax);
  const Y = (pos: number) => T + (pos + 0.5) * ZEILE;
  const marken = $derived(achsenMarken(0, hmax, 5));
  const ast = (i: number): { x1: number; x2: number; y1: number; y2: number; g: number }[] => {
    const kn = baum.knoten[i]!;
    if (!kn.kinder) return [];
    const [a, b] = kn.kinder.map(c => baum.knoten[c]!) as [typeof kn, typeof kn];
    const nx = X(kn.hoehe);
    return [{ x1: X(a.hoehe), x2: nx, y1: Y(a.x), y2: Y(a.x), g: a.gruppe }, { x1: X(b.hoehe), x2: nx, y1: Y(b.x), y2: Y(b.x), g: b.gruppe }, { x1: nx, x2: nx, y1: Y(a.x), y2: Y(b.x), g: kn.gruppe }];
  };
  const alleAeste = $derived(baum.knoten.flatMap((_, i) => ast(i)));
  const blaetter = $derived(baum.knoten.filter(x => x.blatt));
  const beschreibung = $derived(gestutzt
    ? Lx(`Dendrogramm des Ward-Verfahrens mit ${n} Fällen, geschnitten bei ${k} Gruppen. Gestutzt: die obersten 30 Verschmelzungen, die Blätter sind Gruppen mit ihrer Größe. Der größte Abstand beim Zusammenlegen ist ${zahlDe(hmax, 2)}.`,
      `Dendrogram of Ward's method with ${n} cases, cut at ${k} groups. Truncated: the top 30 merges, the leaves are groups with their size. The largest distance when joining is ${zahlDe(hmax, 2)}.`)
    : Lx(`Dendrogramm des Ward-Verfahrens mit ${n} Fällen, geschnitten bei ${k} Gruppen. Der größte Abstand beim Zusammenlegen ist ${zahlDe(hmax, 2)}.`,
      `Dendrogram of Ward's method with ${n} cases, cut at ${k} groups. The largest distance when joining is ${zahlDe(hmax, 2)}.`));
  const bt = $derived(bildtext('sonstiges', { artName: Lx('Dendrogramm', 'Dendrogram'), xAchse: { name: Lx('Abstand beim Zusammenlegen (Ward)', 'Distance when joining (Ward)'), von: 0, bis: hmax }, saetze: [beschreibung],
    tabelle: { kopf: [Lx('Schritt', 'Step'), Lx('Abstand beim Zusammenlegen', 'Distance when joining')], zeilen: hoehe.map((h, i) => [i + 1, zahlDe(h, 2)]) } }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  {#each marken as v}<line x1={X(v)} x2={X(v)} y1={T} y2={H - U} stroke="var(--dg-gitter)" /><text x={X(v)} y={H - U + 18} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L + 10} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each alleAeste as s}<line x1={s.x1} x2={s.x2} y1={s.y1} y2={s.y2} stroke={clusterFarbe(s.g)} stroke-width="2" stroke-dasharray={clusterStrich(s.g)} stroke-linecap="round" />{/each}
  {#each blaetter as b}
    <circle cx={L + 10} cy={Y(b.x)} r="3" fill={clusterFarbe(b.gruppe)} />
    <text x={L + 2} y={Y(b.x) + 4} text-anchor="end" style="font-size:11px">{gestutzt ? Lx(`n = ${b.blatt!.groesse}`, `n = ${b.blatt!.groesse}`) : beschriftung(b.blatt!.fall)}</text>
  {/each}
  <line x1={X(baum.schnitt)} x2={X(baum.schnitt)} y1={T - 6} y2={H - U} stroke="var(--tinte)" stroke-width="1.6" stroke-dasharray="6 4" />
  <text x={X(baum.schnitt)} y={T - 8} text-anchor="middle" class="klein" style="font-size:11px">{Lx(`Schnitt: ${k} Gruppen`, `Cut: ${k} groups`)}</text>
  <text x={(L + W - R) / 2} y={H - 8} text-anchor="middle" class="klein">{Lx('Abstand beim Zusammenlegen (Ward)', 'Distance when joining (Ward)')}</text>
</svg>
<BildBeschreibung {...bt} />
