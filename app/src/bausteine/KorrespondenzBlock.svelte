<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  /** Korrespondenzanalyse unter der Kreuztabelle: Zeilen und Spalten einer Tabelle ab 3 × 3 als gemeinsame Karte. Rechnet im Browser (lib/korrespondenz.ts), erst auf Klick. */
  import HilfeLink from './HilfeLink.svelte';
  import YTitel from './YTitel.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import { L } from '../lib/sitzung.svelte';
  import { komma } from '../lib/ergebnis';
  import { korrespondenz, type KorrespondenzErgebnis, type KorrespondenzFehler } from '../lib/korrespondenz';
  import { achsenMarken } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { planeBeschriftung } from '../lib/beschriftung';
  import type { Kreuz } from '../lib/ergebnis';

  let { e }: { e: Kreuz } = $props();
  const z = $derived(e.zaehlung);
  let res = $state<KorrespondenzErgebnis | KorrespondenzFehler | null>(null);
  $effect(() => { void JSON.stringify(z?.tab); res = null; });
  const r = $derived(res && !('fehler' in res) ? res : null);
  const z3 = (v: number) => komma(v, 3), pr = (v: number) => `${komma(v * 100, 1)} %`;
  const fehlerText = (f: { fehler: string }) => f.fehler === 'leere-zeile' || f.fehler === 'leere-spalte' ? L('Eine Zeile oder Spalte der Tabelle ist leer; die Korrespondenzanalyse braucht überall mindestens eine Person.', 'A row or column of the table is empty; correspondence analysis needs at least one person everywhere.') : L('Die Tabelle ist für die Korrespondenzanalyse nicht geeignet.', 'The table is not suitable for correspondence analysis.');
  const W = 560, H0 = 440, M = 50;
  /* Überdecken sich Beschriftungen, wird das Bild höher; hilft das nicht, stehen keine Texte im Bild (Meldung 01.11.). */
  const geruest = $derived.by(() => {
    if (!r || !z) return null;
    const alle = [...r.zeilen, ...r.spalten], xs = alle.map(p => p.koord[0]!), ys = alle.map(p => p.koord[1] ?? 0);
    const g = Math.max(...xs.map(Math.abs), ...ys.map(Math.abs), 0.05) * 1.25;
    const texte = [...z.zeilen, ...z.spalten];
    const plan = planeBeschriftung(alle.map((p, i) => ({ x: M + (W - 2 * M) * (((p.koord[0] ?? 0) + g) / (2 * g)) + 8, yAnteil: 1 - ((p.koord[1] ?? 0) + g) / (2 * g), text: String(texte[i] ?? '') })), { flaeche: H0 - 2 * M, oben: M });
    return { g, plan, H: 2 * M + (H0 - 2 * M) * plan.faktor };
  });
  const H = $derived(geruest?.H ?? H0);
  const karte = $derived.by(() => {
    if (!geruest) return null;
    const g = geruest.g, plan = geruest.plan;
    return { g, plan, X: (v: number) => M + (W - 2 * M) * ((v + g) / (2 * g)), Y: (v: number) => M + (H - 2 * M) * (1 - (v + g) / (2 * g)) };
  });
  const bt = $derived.by(() => {
    if (!r || !z) return null;
    const dim = (v: number | undefined) => zahlDe(v ?? 0, 2);
    return bildtext('sonstiges', { artName: L('Karte der Tabelle (Korrespondenzanalyse)', 'Map of the table (correspondence analysis)'),
      saetze: [L('Die Zeilen der Tabelle sind Kreise, die Spalten Dreiecke; gezeigt sind die ersten zwei Dimensionen.', 'The rows of the table are circles, the columns are triangles; the first two dimensions are shown.')],
      tabelle: { kopf: [L('Name', 'Name'), L('Art', 'Kind'), `${L('Dimension', 'Dimension')} 1`, `${L('Dimension', 'Dimension')} 2`],
        zeilen: [...r.zeilen.map((p, i) => [String(z.zeilen[i] ?? ''), L('Zeile', 'Row'), dim(p.koord[0]), dim(p.koord[1])]), ...r.spalten.map((p, j) => [String(z.spalten[j] ?? ''), L('Spalte', 'Column'), dim(p.koord[0]), dim(p.koord[1])])] } });
  });
</script>

{#if z && z.tab.length >= 3 && z.spalten.length >= 3}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Karte der Tabelle (Korrespondenzanalyse)', 'Map of the table (correspondence analysis)')}</summary>
    <p class="heft-text">{L('Die Korrespondenzanalyse zeichnet die Zeilen und Spalten der Tabelle auf eine gemeinsame Karte. Zeilen mit ähnlichem Profil liegen nahe beieinander, ebenso Spalten; eine Zeile liegt in Richtung der Spalten, die bei ihr überdurchschnittlich oft vorkommen. Sie beschreibt die Tabelle, sie prüft nichts.', 'Correspondence analysis draws the rows and columns of the table on a common map. Rows with a similar profile lie close together, and so do columns; a row lies in the direction of the columns that occur more often than average with it. It describes the table, it tests nothing.')}</p>
    <p class="hilfe"><HilfeLink id="korrespondenzanalyse" text={L('Hilfe: Korrespondenzanalyse', 'Help: correspondence analysis')} /></p>
    <div class="knopfzeile"><button class="k" type="button" onclick={() => { res = korrespondenz(z.tab); }}>{res ? L('Karte neu zeichnen', 'Redraw the map') : L('Karte zeichnen', 'Draw the map')}</button></div>
    {#if res && 'fehler' in res}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if r && karte}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Dimensionen: Singulärwert und Anteil der Trägheit', 'Dimensions: singular value and share of inertia')}</b></caption>
        <thead><tr><th scope="col">{L('Dimension', 'Dimension')}</th><th scope="col">{L('Singulärwert', 'Singular value')}</th><th scope="col">{L('Trägheit', 'Inertia')}</th><th scope="col">{L('Anteil', 'Share')}</th></tr></thead>
        <tbody>{#each r.singulaer as sv, i (i)}<tr><th scope="row" style="text-align: start">{i + 1}</th><td style="text-align:right">{z3(sv)}</td><td style="text-align:right">{z3(r.traegheit[i]!)}</td><td style="text-align:right">{pr(r.anteil[i]!)}</td></tr>{/each}</tbody>
      </table></div>
      <DiagrammExport titel={L('Korrespondenzkarte', 'Correspondence map')}>
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz}>
          {#each achsenMarken(-karte.g, karte.g) as v}<line x1={karte.X(v)} x2={karte.X(v)} y1={M} y2={H - M} stroke="var(--dg-gitter)" /><line x1={M} x2={W - M} y1={karte.Y(v)} y2={karte.Y(v)} stroke="var(--dg-gitter)" /><text x={karte.X(v)} y={H - M + 16} text-anchor="middle" class="klein">{zahlDe(v)}</text><text x={M - 8} y={karte.Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
          <line x1={karte.X(0)} x2={karte.X(0)} y1={M} y2={H - M} stroke="var(--tinte-2, #666)" /><line x1={M} x2={W - M} y1={karte.Y(0)} y2={karte.Y(0)} stroke="var(--tinte-2, #666)" />
          {#each r.zeilen as p, i (i)}<circle cx={karte.X(p.koord[0]!)} cy={karte.Y(p.koord[1] ?? 0)} r="5" fill="var(--dg-a)"><title>{z.zeilen[i]}</title></circle>{#if karte.plan.zeigen[i]}<text x={karte.X(p.koord[0]!) + 8} y={karte.Y(p.koord[1] ?? 0) + 4} class="klein" fill="var(--dg-a)">{z.zeilen[i]}</text>{/if}{/each}
          {#each r.spalten as p, j (j)}<path d="M{karte.X(p.koord[0]!)},{karte.Y(p.koord[1] ?? 0) - 6} l5.5,10 h-11 z" fill="var(--dg-b, var(--tinte-2))"><title>{z.spalten[j]}</title></path>{#if karte.plan.zeigen[r.zeilen.length + j]}<text x={karte.X(p.koord[0]!) + 8} y={karte.Y(p.koord[1] ?? 0) + 4} class="klein" fill="var(--dg-b, var(--tinte-2))">{z.spalten[j]}</text>{/if}{/each}
          <text x={W / 2} y={H - 8} text-anchor="middle" class="klein">{L('Dimension', 'Dimension')} 1 ({pr(r.anteil[0]!)})</text>
          <YTitel x={14} y={H / 2} laenge={H - 2 * M} text={`${L('Dimension', 'Dimension')} 2 (${pr(r.anteil[1] ?? 0)})`} px={13} klasse="klein" />
        </svg>
      </DiagrammExport>
      {#if bt}<BildBeschreibung {...bt} />{/if}
      <p class="heft-text" style="color:var(--tinte-2)">{L(`Die ersten zwei Dimensionen zeigen zusammen ${pr(r.anteil[0]! + (r.anteil[1] ?? 0))} der Streuung der Tabelle (gesamte Trägheit ${z3(r.gesamt)}, das ist χ² geteilt durch n). Die Abstände zwischen Zeilen und Zeilen sowie zwischen Spalten und Spalten sind aussagekräftig, der Abstand zwischen einer Zeile und einer Spalte nur als Richtung. Mit kleinen Häufigkeiten in einzelnen Feldern wird die Karte unruhig.`, `The first two dimensions together show ${pr(r.anteil[0]! + (r.anteil[1] ?? 0))} of the spread of the table (total inertia ${z3(r.gesamt)}, which is χ² divided by n). The distances between rows and rows and between columns and columns are meaningful, the distance between a row and a column only as a direction. With small counts in single cells the map gets unstable.`)}</p>
    {/if}
  </details>
{/if}
