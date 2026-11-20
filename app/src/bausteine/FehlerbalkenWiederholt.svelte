<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import XTitel from './XTitel.svelte';
  import YTitel from './YTitel.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { lesbar } from '../lib/verzeichnis';
  import { zahlenZeilenMitLuecken } from '../lib/diagrammquellen';
  import { balkenWiederholt, type FehlerArt } from '../lib/fehlerbalken';
  import { achsenBereich, achsenMarken } from '../lib/diagrammdaten';
  import { yZusatz, yMarkenZusatz, xZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  /**
   * Mittelwerte mit Fehlerbalken für Messungen an denselben Personen (Messwiederholung, Vorher-Nachher), mit Wahl der Balken: 95 %-Intervall, Standardfehler,
   * Standardabweichung oder Cousineau-Morey. Das letzte nimmt die Unterschiede zwischen den Personen heraus und passt zum Blick auf Veränderungen.
   * Es steht immer dabei: nur zum Ansehen, nicht zum Testen. Rechnung: lib/fehlerbalken.ts (Test gegen R).
   */
  let { spalten, name, yText = '' }: { spalten: string[]; name?: (n: string) => string; yText?: string } = $props();
  const kennung = $props.id();
  const nm = (n: string) => (name ? name(n) : lesbar(s.spalten.find(c => c.name === n)));
  let art = $state<FehlerArt>('ki'), auf = $state(false);
  const ARTEN = $derived<[FehlerArt, string, string][]>([
    ['ki', L('95 %-Intervall', '95% interval'), 'konfidenzintervall'],
    ['se', L('Standardfehler', 'Standard error'), 'standardfehler'],
    ['sd', L('Standardabweichung', 'Standard deviation'), 'standardabweichung'],
    ['cm', L('Cousineau-Morey', 'Cousineau-Morey'), 'cousineau-morey-intervall']
  ]);
  const b = $derived(auf ? balkenWiederholt(zahlenZeilenMitLuecken(spalten) as number[][], art) : null);
  const erklaerung = $derived(art === 'cm'
    ? L('Cousineau-Morey-Intervall: Aus jeder Messung ist der feste Unterschied zwischen den Personen herausgerechnet (jede Person liegt auf ihrem eigenen Durchschnitt). Die Balken zeigen so, wie sicher die Unterschiede zwischen den Messungen sind. Nur zum Ansehen, nicht zum Testen: Der Test rechnet anders.',
      'Cousineau-Morey interval: the fixed difference between people is removed from each measurement (each person is placed on their own average). The bars thus show how certain the differences between the measurements are. For looking only, not for testing: the test calculates differently.')
    : art === 'ki' ? L('95 %-Intervall des Mittelwerts je Messung (t-Verteilung). Es enthält die Unterschiede zwischen den Personen und ist deshalb bei Messwiederholung oft breiter, als der Unterschied zwischen den Messungen es verlangt.', '95% interval of the mean at each measurement (t distribution). It contains the differences between people and is therefore often wider with repeated measures than the difference between the measurements requires.')
    : art === 'se' ? L('Standardfehler des Mittelwerts: die Standardabweichung geteilt durch die Wurzel aus n. Er ist kein Intervall; ein Balken von einem Standardfehler deckt etwa 68 % ab. Im Bericht steht immer dabei, was die Balken zeigen.', 'Standard error of the mean: the standard deviation divided by the square root of n. It is not an interval; a bar of one standard error covers about 68%. Always state what the bars show.')
    : L('Standardabweichung: Sie zeigt, wie weit die Werte der Personen streuen, nicht wie sicher der Mittelwert ist.', 'Standard deviation: it shows how far the values of the people spread, not how certain the mean is.'));
  const k = $derived(spalten.length);
  const W = 560, H0 = 340, L0 = 64, R = 24, T = 24, U0 = 70;
  const lo = $derived(b ? Math.min(...b.lo) : 0), hi = $derived(b ? Math.max(...b.hi) : 1);
  const yb = $derived(achsenBereich(lo, hi)), ym = $derived(achsenMarken(yb[0], yb[1]));
  const links = $derived(L0 + yZusatz(yText, H0 - T - U0, 13, false) + yMarkenZusatz(ym.map(v => zahlDe(v))));
  const XZ = $derived(xZusatz(L('Messung', 'Measurement'), W - links - R));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const X = (j: number) => links + 40 + (W - links - R - 80) * (k === 1 ? 0.5 : j / (k - 1));
  const Y = (v: number) => T + (H - T - U) * (1 - (v - yb[0]) / (yb[1] - yb[0] || 1));
  const kurz = (t: string) => (t.length > 14 ? t.slice(0, 13) + '…' : t);
  const bezeichnung = $derived(ARTEN.find(a => a[0] === art)![1]);
  const beschr = $derived(b ? L(`Mittelwert je Messung mit Fehlerbalken (${bezeichnung}), ${b.n} Personen: ${spalten.map((n, j) => `${nm(n)} ${zahlDe(b.mittel[j]!, 1)} (${zahlDe(b.lo[j]!, 1)} bis ${zahlDe(b.hi[j]!, 1)})`).join(', ')}. Die Zahlen stehen darunter als Tabelle.`,
    `Mean at each measurement with error bars (${bezeichnung}), ${b.n} people: ${spalten.map((n, j) => `${nm(n)} ${zahlDe(b.mittel[j]!, 1)} (${zahlDe(b.lo[j]!, 1)} to ${zahlDe(b.hi[j]!, 1)})`).join(', ')}. The numbers are given below as a table.`) : '');
  const bt = $derived.by(() => {
    if (!b) return null;
    const t = bildtext('mittelwerte', { titel: `${L('Mittelwerte und Balken', 'Means and bars')} (${bezeichnung})`, name: yText || L('Messwert', 'Value'), gruppenName: L('Messung', 'Measurement'),
      fehler: art === 'ki' ? 'ki95' : art === 'se' ? 'se' : art === 'sd' ? 'sd' : 'keine',
      gruppen: spalten.map((n, j) => ({ name: nm(n), n: b.n, mittel: b.mittel[j]!, unten: b.lo[j]!, oben: b.hi[j]! })) });
    return art === 'cm' ? { ...t, beschreibung: [...t.beschreibung, L(`Die Balken zeigen das ${bezeichnung}-Intervall.`, `The bars show the ${bezeichnung} interval.`)] } : t;
  });
</script>
<details class="fw" ontoggle={(ev) => (auf = (ev.currentTarget as HTMLDetailsElement).open)}>
  <summary>{L('Fehlerbalken wählen: 95 %-Intervall, Standardfehler, Cousineau-Morey', 'Choose the error bars: 95% interval, standard error, Cousineau-Morey')}</summary>
  {#if auf}
  <div class="einst-gruppe" style="padding-top:0"><h3 id="{kennung}-t">{L('Fehlerbalken wählen', 'Choose the error bars')}</h3>
    <div class="segment" role="radiogroup" aria-labelledby="{kennung}-t">{#each ARTEN as [w, t, begriff]}<label data-begriff={begriff}><input type="radio" name="{kennung}-art" value={w} checked={art === w} onchange={() => (art = w)}>{t}</label>{/each}</div>
    <p class="hilfe" use:ergebnisAnsage style="margin-top:var(--a2)">{erklaerung}</p>
  </div>
  {#if b}
    <DiagrammExport titel={`${L('Mittelwerte mit', 'Means with')} ${bezeichnung}`}>
      <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz} style="max-width:{W}px" stroke-linejoin="round">
        {#each ym as v}<line x1={links} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={links - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
        <line x1={links} x2={links} y1={T} y2={H - U} stroke="var(--dg-achse)" />
        <polyline points={b.mittel.map((m, j) => `${X(j)},${Y(m)}`).join(' ')} fill="none" stroke="var(--dg-a)" stroke-width="2.5" stroke-linecap="round" />
        {#each b.mittel as m, j}
          <line x1={X(j)} x2={X(j)} y1={Y(b.hi[j]!)} y2={Y(b.lo[j]!)} stroke="var(--dg-a)" stroke-width="2.5" />
          <line x1={X(j) - 9} x2={X(j) + 9} y1={Y(b.hi[j]!)} y2={Y(b.hi[j]!)} stroke="var(--dg-a)" stroke-width="2.5" /><line x1={X(j) - 9} x2={X(j) + 9} y1={Y(b.lo[j]!)} y2={Y(b.lo[j]!)} stroke="var(--dg-a)" stroke-width="2.5" />
          <circle cx={X(j)} cy={Y(m)} r="5.5" fill="var(--dg-punkt-a)" stroke="var(--dg-a)" stroke-width="2" />
          <text x={X(j)} y={H - U + 22} text-anchor="middle" class="klein">{kurz(nm(spalten[j]!))}</text>
        {/each}
        {#if yText}<YTitel x={16} y={(T + H - U) / 2} laenge={H - T - U} text={yText} px={13} klasse="klein" />{/if}
        <XTitel x={(links + W - R) / 2} y={H - U + 46} breite={W - links - R} text={`${L('Punkte: Mittelwerte. Balken', 'Dots: means. Bars')}: ${bezeichnung}. n = ${b.n}`} klasse="klein" />
      </svg>
    </DiagrammExport>
    {#if bt}<BildBeschreibung {...bt} />{/if}
  {:else}<p class="hilfe" use:ergebnisAnsage>{L('Für diese Balken braucht es mindestens drei Personen mit allen Messungen.', 'These bars need at least three people with all measurements.')}</p>{/if}
  {/if}
</details>

<style>
  .fw { margin-top: var(--a4); }
  .fw summary { cursor: pointer; font-weight: 600; min-height: 44px; padding-block: var(--a3); box-sizing: border-box; }
  .fw summary:focus-visible { outline: var(--fokus-outline); outline-offset: 2px; border-radius: 4px; }
  .fw > :global(*:not(summary)) { margin-top: var(--a3); }
</style>
