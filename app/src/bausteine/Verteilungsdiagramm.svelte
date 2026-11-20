<script lang="ts">
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { kleinste, groesste } from '../lib/menge';
  import { achsenMarken, achsenBereich, boxStat, histogramm, normalHoehe } from '../lib/diagrammdaten';
  import { xZusatz, yMarkenZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  import { L as Lx, Lp } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { GRENZE, aeusserste, ausreisserHinweis } from '../lib/stichprobe';
  /** Eine Zahlenspalte als Histogramm (Klassen wie R `hist()`) oder als Boxplot (Quartile wie R `boxplot.stats`).
   *  Die Beschreibung für Vorleser nennt dieselben Zahlen wie das Bild. */
  let { werte, titel, art = 'hist', normal = false }: { werte: number[]; titel: string; art?: 'hist' | 'box'; normal?: boolean } = $props();
  const kennung = $props.id();
  const W = 560, R = 24, T = 76;
  const h = $derived(histogramm(werte)), b = $derived(boxStat(werte));
  /** Linker Rand wächst mit langen Achsenzahlen (Regel lib/ytitel.ts); der Boxplot hat keine senkrechte Achse. */
  const L = $derived.by(() => 64 + (art === 'hist' ? yMarkenZusatz(yMarken.map(v => zahlDe(v))) : 0));
  const H0 = $derived(art === 'box' ? 250 : 360), U0 = 58;
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): Höhe und unterer Rand wachsen mit, die Zeichenfläche bleibt. */
  const XZ = $derived(xZusatz(titel, W - L - R));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);

  /* ---- Histogramm ---- */
  const kurve = $derived.by(() => {
    if (!h || !normal || !(h.sd > 0)) return [] as [number, number][];
    const a = h.grenzen[0]!, z = h.grenzen.at(-1)!, n = 80;
    return Array.from({ length: n + 1 }, (_, i) => { const x = a + ((z - a) * i) / n; return [x, normalHoehe(h, x)] as [number, number]; });
  });
  const yMax = $derived(h ? Math.max(groesste(h.anzahl), groesste(kurve.map(p => p[1]))) : 1);
  const yBereich = $derived(achsenBereich(0, yMax));
  const yMarken = $derived(achsenMarken(yBereich[0], yBereich[1]));
  const Y = (v: number) => T + (H - T - U) * (1 - v / (yBereich[1] || 1));
  const hx0 = $derived(h?.grenzen[0] ?? 0), hx1 = $derived(h?.grenzen.at(-1) ?? 1);
  const HX = (v: number) => L + (W - L - R) * ((v - hx0) / (hx1 - hx0 || 1));
  const xMarken = $derived(h ? (h.grenzen.length > 12 ? h.grenzen.filter((_, i) => i % 2 === 0) : h.grenzen) : []);

  /* ---- Boxplot ---- */
  const bereich = $derived(b ? achsenBereich(Math.min(b.unten, kleinste(b.ausreisser)), Math.max(b.oben, groesste(b.ausreisser))) : [0, 1] as [number, number]);
  const BX = (v: number) => L + (W - L - R) * ((v - bereich[0]) / (bereich[1] - bereich[0] || 1));
  const bMarken = $derived(achsenMarken(bereich[0], bereich[1]));
  const mitte = $derived((T + H - U) / 2);

  const grossteKlasse = $derived(h ? h.anzahl.indexOf(Math.max(groesste(h.anzahl))) : 0);
  const beschreibung = $derived.by(() => {
    if (art === 'box' && b) {
      const aus = b.ausreisser.length;
      return Lx(`Boxplot von ${titel}, ${b.n} Werte. Median ${zahlDe(b.median, 2)}, mittlere Hälfte von ${zahlDe(b.q1, 2)} bis ${zahlDe(b.q3, 2)}, Fühler von ${zahlDe(b.unten, 2)} bis ${zahlDe(b.oben, 2)}. `,
        `Boxplot of ${titel}, ${b.n} values. Median ${zahlDe(b.median, 2)}, middle half from ${zahlDe(b.q1, 2)} to ${zahlDe(b.q3, 2)}, whiskers from ${zahlDe(b.unten, 2)} to ${zahlDe(b.oben, 2)}. `) +
        (aus ? Lp(aus, `${aus} Ausreißer`, `${aus} Ausreißer`, `${aus} outlier`, `${aus} outliers`) + (aus <= 6 ? ': ' + b.ausreisser.map(v => zahlDe(v, 2)).join(', ') : '') + '.' : Lx('Keine Ausreißer.', 'No outliers.'));
    }
    if (!h) return '';
    const k = grossteKlasse, von = zahlDe(h.grenzen[k]!), bis = zahlDe(h.grenzen[k + 1]!);
    return Lx(`Histogramm von ${titel}: ${h.n} Werte in ${h.anzahl.length} Klassen von ${zahlDe(hx0)} bis ${zahlDe(hx1)}. Am häufigsten ist die Klasse ${von} bis ${bis} mit ${h.anzahl[k]} Werten. Mittelwert ${zahlDe(h.mittel, 2)}, Standardabweichung ${zahlDe(h.sd, 2)}.`,
      `Histogram of ${titel}: ${h.n} values in ${h.anzahl.length} classes from ${zahlDe(hx0)} to ${zahlDe(hx1)}. The most frequent class is ${von} to ${bis} with ${h.anzahl[k]} values. Mean ${zahlDe(h.mittel, 2)}, standard deviation ${zahlDe(h.sd, 2)}.`) +
      (normal ? ' ' + Lx('Dazu die Kurve der Normalverteilung mit diesem Mittelwert und dieser Standardabweichung.', 'The curve shows a normal distribution with this mean and standard deviation.') : '');
  });
  const bt = $derived(art === 'box'
    ? (b ? bildtext('boxplot', { titel, name: titel, gruppen: [{ n: b.n, unten: b.unten, q1: b.q1, median: b.median, q3: b.q3, oben: b.oben, ausreisser: b.ausreisser }] }) : null)
    : (h ? bildtext('histogramm', { titel, name: titel, grenzen: h.grenzen, anzahl: h.anzahl, n: h.n, mittel: h.mittel }) : null));
  /** Ringe: höchstens GRENZE.ausreisser, die äußersten (lib/stichprobe.ts); Kasten und Fühler rechnen mit allen Werten. */
  const ringe = $derived(b ? aeusserste(b.ausreisser, b.median, GRENZE.ausreisser) : null);
  const ringHinweis = $derived(ringe?.gekuerzt ? ausreisserHinweis(ringe.auswahl.length, ringe.gesamt) : '');
  const unterzeile = $derived(art === 'box'
    ? (ringHinweis ? Lx('Kasten: mittlere Hälfte. Strich: Median.', 'Box: middle half. Line: median.') + ' ' + ringHinweis + '.' : Lx('Kasten: mittlere Hälfte. Strich: Median. Ringe: weit außen.', 'Box: middle half. Line: median. Circles: far out.'))
    : (normal ? Lx('Säulen: Anzahl je Klasse. Linie: Normalverteilung.', 'Bars: count per class. Line: normal distribution.') : Lx('Säulen: Anzahl je Klasse.', 'Bars: count per class.')));
</script>
{#if bt && (art === 'box' ? b : h)}
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <text x="24" y="26" style="font-size:16px" font-weight="650">{titel}</text>
  <text x="24" y="50" class="klein">{unterzeile}</text>
  {#if art === 'hist' && h}
    {#each yMarken as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
    <line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
    {#each h.anzahl as a, i}{#if a > 0}<rect x={HX(h.grenzen[i]!)} y={Y(a)} width={Math.max(1, HX(h.grenzen[i + 1]!) - HX(h.grenzen[i]!))} height={Y(0) - Y(a)} fill="var(--dg-a)" stroke="var(--blatt)" stroke-width="1.5"><title>{zahlDe(h.grenzen[i]!)} - {zahlDe(h.grenzen[i + 1]!)}: {a}</title></rect>{/if}{/each}
    {#if kurve.length}<polyline points={kurve.map(p => `${HX(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ')} fill="none" stroke="var(--dg-b)" stroke-width="3" stroke-linecap="round" />{/if}
    {#each xMarken as v}<line x1={HX(v)} x2={HX(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={HX(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
    <XTitel x={(L + W - R) / 2} y={H0 - 8} breite={W - L - R} text={titel} klasse="klein" />
    <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={Lx('Anzahl', 'Count')} px={13} klasse="klein" />
  {:else if b}
    {#each bMarken as v}<line x1={BX(v)} x2={BX(v)} y1={T} y2={H - U} stroke="var(--dg-gitter)" /><text x={BX(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
    <line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
    <line x1={BX(b.unten)} x2={BX(b.q1)} y1={mitte} y2={mitte} stroke="var(--dg-a)" stroke-width="1.5" /><line x1={BX(b.q3)} x2={BX(b.oben)} y1={mitte} y2={mitte} stroke="var(--dg-a)" stroke-width="1.5" />
    <line x1={BX(b.unten)} x2={BX(b.unten)} y1={mitte - 14} y2={mitte + 14} stroke="var(--dg-a)" stroke-width="1.5" /><line x1={BX(b.oben)} x2={BX(b.oben)} y1={mitte - 14} y2={mitte + 14} stroke="var(--dg-a)" stroke-width="1.5" />
    <rect x={BX(b.q1)} y={mitte - 32} width={Math.max(1, BX(b.q3) - BX(b.q1))} height="64" rx="3" fill="var(--dg-punkt-a)" stroke="var(--dg-a)" stroke-width="1.5"><title>{zahlDe(b.q1, 2)} - {zahlDe(b.q3, 2)}</title></rect>
    <line x1={BX(b.median)} x2={BX(b.median)} y1={mitte - 32} y2={mitte + 32} stroke="var(--dg-a)" stroke-width="3.5" />
    {#each ringe?.auswahl ?? b.ausreisser as v}<circle cx={BX(v)} cy={mitte} r="4" fill="none" stroke="var(--dg-a)" stroke-width="1.5"><title>{zahlDe(v, 2)}</title></circle>{/each}
    <text x={BX(b.median)} y={mitte - 40} text-anchor="middle" font-weight="650" style="font-size:14px">{zahlDe(b.median, 1)}</text>
    <XTitel x={(L + W - R) / 2} y={H0 - 8} breite={W - L - R} text={titel} klasse="klein" />
  {/if}
</svg>
<BildBeschreibung {...bt} beschreibung={[...bt.beschreibung, ...(art === 'hist' && normal ? [Lx('Dazu die Kurve der Normalverteilung mit diesem Mittelwert und dieser Standardabweichung.', 'The curve shows a normal distribution with this mean and standard deviation.')] : []), ...(art === 'hist' && h ? [Lx(`Standardabweichung ${zahlDe(h.sd, 2)}.`, `Standard deviation ${zahlDe(h.sd, 2)}.`)] : [])]} />
{/if}
