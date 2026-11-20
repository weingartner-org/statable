<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz } from '../lib/ytitel';
  import type { RocKurve } from '../lib/roc';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  /** ROC-Kurve: Sensitivität gegen 1 − Spezifität, die Diagonale ist „Zufall“, der Punkt der beste Schwellenwert (Youden-Index).
   *  Die Beschreibung für Vorleser nennt dieselben Zahlen wie das Bild. */
  let { k, titel, positiv }: { k: RocKurve; titel: string; positiv: string } = $props();
  const kennung = $props.id();
  const W = 460, H0 = 460, L0 = 64, R = 24, T = 76, U0 = 58;
  /** Linker Rand wächst mit, wenn der senkrechte Titel umbricht (Regel lib/ytitel.ts). */
  const L = $derived(L0 + yZusatz(Lx('Sensitivität (Anteil richtig Positiver)', 'Sensitivity (true positive rate)'), H0 - T - U0, 13, false));
  const xTitel = $derived(Lx('1 − Spezifität (Anteil falsch Positiver)', '1 − specificity (false positive rate)'));
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): Höhe und unterer Rand wachsen mit, die Zeichenfläche bleibt. */
  const XZ = $derived(xZusatz(xTitel, W - L - R));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const X = (v: number) => L + (W - L - R) * v, Y = (v: number) => T + (H - T - U) * (1 - v);
  const marken = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const pfad = $derived(k.punkte.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' '));
  const proz = (v: number) => zahlDe(v * 100, 0) + ' %';
  const beschreibung = $derived(Lx(`ROC-Kurve für ${titel}, positiv ist „${positiv}“: ${k.nPositiv} positive und ${k.nNegativ} negative Personen. Fläche unter der Kurve ${zahlDe(k.auc, 2)}. Bester Schwellenwert nach Youden: ${zahlDe(k.beste.schwelle, 2)} oder mehr, Sensitivität ${proz(k.beste.sens)}, Spezifität ${proz(k.beste.spez)}.`,
    `ROC curve for ${titel}, positive is "${positiv}": ${k.nPositiv} positive and ${k.nNegativ} negative people. Area under the curve ${zahlDe(k.auc, 2)}. Best cut-off by Youden: ${zahlDe(k.beste.schwelle, 2)} or more, sensitivity ${proz(k.beste.sens)}, specificity ${proz(k.beste.spez)}.`));
  const bt = $derived(bildtext('sonstiges', {
    artName: Lx('ROC-Kurve', 'ROC curve'), titel,
    xAchse: { name: Lx('1 minus Spezifität (Anteil falsch Positiver)', '1 minus specificity (false positive rate)'), von: 0, bis: 1 }, yAchse: { name: Lx('Sensitivität (Anteil richtig Positiver)', 'Sensitivity (true positive rate)'), von: 0, bis: 1 },
    saetze: [beschreibung],
    tabelle: { kopf: [Lx('Punkt', 'Point'), Lx('1 minus Spezifität', '1 minus specificity'), Lx('Sensitivität', 'Sensitivity')], zeilen: k.punkte.map(([x, y], i) => [i + 1, zt(x, 3), zt(y, 3)]) }
  }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <text x="24" y="26" style="font-size:16px" font-weight="650">{Lx('ROC-Kurve', 'ROC curve')}: {titel}</text>
  <text x="24" y="50" class="klein">{Lx(`Positiv: ${positiv}. Punkt: bester Schwellenwert. Fläche = ${zahlDe(k.auc, 2)}.`, `Positive: ${positiv}. Dot: best cut-off. Area = ${zahlDe(k.auc, 2)}.`)}</text>
  {#each marken as v}
    <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v, 1)}</text>
    <line x1={X(v)} x2={X(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v, 1)}</text>
  {/each}
  <line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  <line x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} stroke="var(--dg-b)" stroke-width="2.5" stroke-dasharray="7 5" />
  <polyline points={pfad} fill="none" stroke="var(--dg-a)" stroke-width="3" stroke-linecap="round" />
  <circle cx={X(1 - k.beste.spez)} cy={Y(k.beste.sens)} r="7" fill="var(--dg-a)" stroke="var(--blatt)" stroke-width="2"><title>{Lx(`Schwellenwert ${zahlDe(k.beste.schwelle, 2)}: Sensitivität ${proz(k.beste.sens)}, Spezifität ${proz(k.beste.spez)}`, `Cut-off ${zahlDe(k.beste.schwelle, 2)}: sensitivity ${proz(k.beste.sens)}, specificity ${proz(k.beste.spez)}`)}</title></circle>
  <XTitel x={(L + W - R) / 2} y={H0 - 8} breite={W - L - R} text={xTitel} klasse="klein" />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={Lx('Sensitivität (Anteil richtig Positiver)', 'Sensitivity (true positive rate)')} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} />
