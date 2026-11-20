<script lang="ts">
  import { L, Lp } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import { marken, skala, achsenZahl } from '../lib/lernlaborsaetze';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import XTitel from './XTitel.svelte';
  import YTitel from './YTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  /**
   * Streudiagramm des Lernlabor-Reiters „Vorhersagen“: Hintergrund = Gebiete, in denen kNN die Klasse vorhersagen würde (Gitter aus lib/ml.ts gitterVorhersage),
   * gefüllte Zeichen = Trainingsdaten, große offene Zeichen = Testdaten, × = falsch vorhergesagter Testfall. Klassen unterscheiden sich in Farbe UND Form.
   */
  let { punkte, gitter, klassen, xText, yText, titel, k }: {
    punkte: { x: number; y: number; klasse: number; test: boolean; falsch: boolean }[];
    gitter: { werte: number[][]; xBereich: [number, number]; yBereich: [number, number] };
    klassen: string[]; xText: string; yText: string; titel: string; k: number;
  } = $props();
  const FARBE = ['var(--dg-a)', 'var(--dg-b)', 'var(--tinte)'];
  const W = 640, H0 = 420, Lr = 80, R = 16, T = 14, U0 = 52;
  const XZ = $derived(xZusatz(xText, W - Lr - R)), H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const x = $derived(skala(gitter.xBereich[0], gitter.xBereich[1], Lr, W - R)), y = $derived(skala(gitter.yBereich[0], gitter.yBereich[1], H - U, T));
  const xm = $derived(marken(gitter.xBereich[0], gitter.xBereich[1])), ym = $derived(marken(gitter.yBereich[0], gitter.yBereich[1]));
  const s = $derived(gitter.werte.length), zw = $derived((W - R - Lr) / s), zh = $derived((H - U - T) / s);
  /** Form je Klasse als SVG-Pfad um (cx, cy) mit Radius r: Kreis, Quadrat, Dreieck. */
  function form(c: number, cx: number, cy: number, r: number): string {
    if (c === 1) return `M${cx - r} ${cy - r}h${2 * r}v${2 * r}h${-2 * r}Z`;
    if (c === 2) return `M${cx} ${cy - r * 1.2}L${cx + r * 1.1} ${cy + r * 0.8}L${cx - r * 1.1} ${cy + r * 0.8}Z`;
    return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  }
  const nFalsch = $derived(punkte.filter(p => p.falsch).length), nTest = $derived(punkte.filter(p => p.test).length);
  const bt = $derived.by(() => {
    const t = bildtext('streu', { titel, xAchse: { name: xText }, yAchse: { name: yText }, gruppen: klassen.map((name, c) => ({ name, punkte: punkte.filter(p => p.klasse === c).map(p => [p.x, p.y] as [number, number]) })) });
    return { ...t, beschreibung: [...t.beschreibung,
      L(`Die Fläche im Hintergrund ist nach der Klasse gefärbt, die das Modell mit k = ${k} an dieser Stelle vorhersagen würde (Entscheidungsgebiete). Gefüllte kleine Zeichen sind Trainingsdaten, große offene Zeichen Testdaten.`, `The background area is coloured by the class the model with k = ${k} would predict at that point (decision regions). Small filled symbols are training data, large open symbols test data.`),
      Lp(nFalsch, `Mit × markiert: ${nFalsch} von ${nTest} Testpinguinen, die falsch vorhergesagt werden.`, `Mit × markiert: ${nFalsch} von ${nTest} Testpinguinen, die falsch vorhergesagt werden.`, `Marked with ×: ${nFalsch} of ${nTest} test penguins that are predicted wrongly.`, `Marked with ×: ${nFalsch} of ${nTest} test penguins that are predicted wrongly.`)] };
  });
</script>
<figure class="ll-bild">
  <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px">
    {#each gitter.werte as zeile, r}{#each zeile as c, q}<rect x={Lr + q * zw} y={T + r * zh} width={zw + 0.5} height={zh + 0.5} fill={FARBE[c]} fill-opacity="0.13" />{/each}{/each}
    {#each ym as v}<line x1={Lr} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--dg-gitter)" stroke-opacity="0.7" /><text x={Lr - 8} y={y(v) + 4} text-anchor="end" class="klein">{achsenZahl(v)}</text>{/each}
    {#each xm as v}<line x1={x(v)} x2={x(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={x(v)} y={H - U + 20} text-anchor="middle" class="klein">{achsenZahl(v)}</text>{/each}
    <line x1={Lr} x2={Lr} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={Lr} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
    {#each punkte.filter(p => !p.test) as p}<path d={form(p.klasse, x(p.x), y(p.y), 3.2)} fill={FARBE[p.klasse]} fill-opacity="0.55" />{/each}
    {#each punkte.filter(p => p.test) as p}
      <path d={form(p.klasse, x(p.x), y(p.y), 5.5)} fill="var(--blatt)" stroke={FARBE[p.klasse]} stroke-width="2" />
      {#if p.falsch}<path d="M{x(p.x) - 4} {y(p.y) - 4}l8 8M{x(p.x) + 4} {y(p.y) - 4}l-8 8" stroke="var(--tinte)" stroke-width="1.8" />{/if}
    {/each}
    <XTitel x={(Lr + W - R) / 2} y={H0 - 8} breite={W - Lr - R} text={xText} klasse="klein" />
    <YTitel x={14} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={13} klasse="klein" />
  </svg>
  <figcaption>
    <ul class="ll-legende">
      {#each klassen as name, c}<li><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d={form(c, 8, 8, 5)} fill={FARBE[c]} fill-opacity="0.6" stroke={FARBE[c]} /></svg>{name}</li>{/each}
      <li><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="var(--tinte)" stroke-width="1.8" /></svg>{L('falsch vorhergesagt (Testdaten)', 'predicted wrongly (test data)')}</li>
    </ul>
    {L('Klein und gefüllt: Trainingsdaten. Groß und offen: Testdaten.', 'Small and filled: training data. Large and open: test data.')}
  </figcaption>
</figure>
<BildBeschreibung {...bt} />

<style>
  .ll-legende { list-style: none; display: flex; flex-wrap: wrap; gap: var(--a1) var(--a4); padding: 0; margin: 0 0 var(--a1); }
  .ll-legende li { display: inline-flex; align-items: center; gap: var(--a1); }
</style>
