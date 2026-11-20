<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { achsenMarken, achsenBereich } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import type { PeriodogrammE } from '../lib/zeitreihenabrunden';

  /**
   * Das Periodogramm (Fachblatt ZEITREIHEN-ABRUNDEN, Abschnitt 3): die Linie des Spektrums über der Frequenz (Vielfache von 1/n), die größten Spitzen markiert und mit ihrer Periode beschriftet.
   * Die senkrechte Achse zeigt den Anteil am gesamten Spektrum (Spektrum geteilt durch die Summe), damit die Höhe der Spitzen lesbar ist. Die Spitzen sind verschieden gefüllt und beschriftet (auch in Schwarz-Weiß lesbar).
   */
  let { p, wertText }: { p: PeriodogrammE; wertText: string } = $props();
  const uid = $props.id();
  const W = 720, H = 340, L = 66, R = 24, T = 44, U = 64;
  const a = $derived(p.antwort);
  const summe = $derived(a.spec.reduce((s, v) => s + v, 0) || 1);
  const anteil = $derived(a.spec.map(v => v / summe));
  const bereich = $derived(achsenBereich(0, Math.max(...anteil) * 1.12, 5));
  const unten = $derived(bereich[0]), oben = $derived(bereich[1]);
  const ticksY = $derived(achsenMarken(unten, oben, 5));
  const ticksX = [0, 0.1, 0.2, 0.3, 0.4, 0.5];
  const X = (f: number) => L + 8 + (W - L - R - 16) * (f / 0.5);
  const Y = (v: number) => T + (H - T - U) * (1 - (v - unten) / (oben - unten || 1));
  const linie = $derived(a.freq.map((f, i) => `${X(f).toFixed(1)},${Y(anteil[i]!).toFixed(1)}`).join(' '));
  const pt = (v: number) => zahlDe(v, 1);
  const beschreibung = $derived(a.spitzen.length
    ? Lx(`Periodogramm von ${wertText}, ${a.n} Werte. Größte Spitzen: ${a.spitzen.map(s => `Periode ${pt(s.periode)} (${zahlDe(100 * s.anteil, 1)} %)`).join('; ')}.`,
      `Periodogram of ${wertText}, ${a.n} values. Largest peaks: ${a.spitzen.map(s => `period ${pt(s.periode)} (${zahlDe(100 * s.anteil, 1)}%)`).join('; ')}.`)
    : Lx(`Periodogramm von ${wertText}, ${a.n} Werte. Es gibt keine Spitze mit einer Periode von 2 bis n/2.`, `Periodogram of ${wertText}, ${a.n} values. There is no peak with a period from 2 to n/2.`));
  const FORM = ['circle', 'square', 'diamond'] as const;
  const bt = $derived(bildtext('sonstiges', {
    artName: Lx('Periodogramm', 'Periodogram'), titel: Lx(`Periodogramm von ${wertText}`, `Periodogram of ${wertText}`),
    xAchse: { name: Lx('Frequenz (Zyklen je Zeitpunkt)', 'Frequency (cycles per point in time)'), von: 0, bis: 0.5 }, yAchse: { name: Lx('Anteil am Spektrum', 'Share of the spectrum'), von: unten, bis: oben },
    saetze: [beschreibung],
    tabelle: { kopf: [Lx('Spitze', 'Peak'), Lx('Periode', 'Period'), Lx('Anteil am Spektrum (%)', 'Share of the spectrum (%)')], zeilen: a.spitzen.map((s, i) => [i + 1, zt(s.periode, 1), zt(100 * s.anteil, 1)]) }
  }));
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <text x={L} y="22" style="font-size:15px" font-weight="650">{Lx(`Periodogramm von ${wertText}`, `Periodogram of ${wertText}`)}</text>
  {#each ticksY as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 8} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v, 2)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each ticksX as f}<line x1={X(f)} x2={X(f)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={X(f)} y={H - U + 20} text-anchor="middle" class="klein">{zahlDe(f, 1)}</text>{/each}
  <polyline points={linie} fill="none" stroke="var(--dg-a)" stroke-width="2" stroke-linecap="round" />
  {#each a.spitzen as s, i}
    {@const x = X(a.freq[s.index - 1]!)}{@const y = Y(anteil[s.index - 1]!)}
    <line x1={x} x2={x} y1={y} y2={H - U} stroke="var(--dg-b)" stroke-width="1.4" stroke-dasharray="3 3" />
    {#if FORM[i] === 'square'}<rect x={x - 5} y={y - 5} width="10" height="10" fill="var(--dg-b)" stroke="var(--tinte)" stroke-width="1" />
    {:else if FORM[i] === 'diamond'}<polygon points="{x},{y - 7} {x + 7},{y} {x},{y + 7} {x - 7},{y}" fill="var(--dg-b)" stroke="var(--tinte)" stroke-width="1" />
    {:else}<circle cx={x} cy={y} r="5.5" fill="var(--dg-b)" stroke="var(--tinte)" stroke-width="1" />{/if}
    <text x={Math.min(x + 9, W - R - 70)} y={Math.max(T + 12, y - 8)} class="klein" style="font-size:12px">{Lx(`Periode ${pt(s.periode)}`, `period ${pt(s.periode)}`)}</text>
  {/each}
  <XTitel x={(L + W - R) / 2} y={H - 22} breite={W - L - R} text={Lx('Frequenz (Zyklen je Zeitpunkt)', 'Frequency (cycles per point in time)')} px={14} fett />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={Lx('Anteil am Spektrum', 'Share of the spectrum')} px={14} fett />
</svg>
<BildBeschreibung {...bt} />
