<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { bildtext } from '../lib/bildtext';
  import { s, L } from '../lib/sitzung.svelte';
  import { lesbar } from '../lib/verzeichnis';
  import { zahlenZeilenMitLuecken } from '../lib/diagrammquellen';
  import { streuMatrix, STREUMATRIX_MAX, STREUMATRIX_MIN, STREUMATRIX_PUNKTE } from '../lib/streumatrix';
  import { zahlDe } from '../lib/format';
  /**
   * Streudiagramm-Matrix: für 3 bis 6 Zahlenspalten alle Punktwolken auf einmal. Unten links die Punktwolken, auf der Diagonale die Namen mit kleinstem und größtem Wert,
   * oben rechts die Korrelation r (Zahl statt Farbe, auch im Graudruck lesbar). Mit mehr als 6 Spalten wählt die Person bis zu 6 aus.
   * Darunter „Daten als Tabelle“: jedes Paar mit n und r. Rechnet paarweise mit allen Personen, die beide Angaben haben.
   */
  let { namen: alle, name }: { namen: string[]; name?: (n: string) => string } = $props();
  const nm = (n: string) => (name ? name(n) : lesbar(s.spalten.find(c => c.name === n)));
  let eigene = $state<string[] | null>(null);
  const gewaehlt = $derived(alle.length <= STREUMATRIX_MAX ? alle : (eigene ?? alle.slice(0, STREUMATRIX_MAX)).filter(n => alle.includes(n)));
  const d = $derived(gewaehlt.length >= STREUMATRIX_MIN ? streuMatrix(gewaehlt, zahlenZeilenMitLuecken(gewaehlt)) : null);
  const schalte = (n: string, an: boolean) => { const a = gewaehlt.filter(x => x !== n); eigene = an ? [...a, n].sort((p, q) => alle.indexOf(p) - alle.indexOf(q)) : a; };
  const k = $derived(gewaehlt.length);
  const W = 600, RAND = 8;
  const C = $derived((W - 2 * RAND) / k), H = $derived(C * k + 2 * RAND);
  const feld = (i: number, j: number) => d?.felder.find(f => f.i === i && f.j === j);
  /** Bereich je Spalte aus allen gezeigten Punkten. */
  const bereich = $derived.by(() => gewaehlt.map((_, c) => {
    const w = (d?.felder ?? []).flatMap(f => (f.i === c ? f.punkte.map(p => p[0]) : f.j === c ? f.punkte.map(p => p[1]) : []));
    return w.length ? [Math.min(...w), Math.max(...w)] as [number, number] : [0, 1] as [number, number];
  }));
  const zelle = 6;
  const px = (c: number, v: number, x0: number) => x0 + zelle + (C - 2 * zelle) * ((v - bereich[c]![0]) / ((bereich[c]![1] - bereich[c]![0]) || 1));
  const py = (c: number, v: number, y0: number) => y0 + zelle + (C - 2 * zelle) * (1 - (v - bereich[c]![0]) / ((bereich[c]![1] - bereich[c]![0]) || 1));
  /** Name in bis zu drei Zeilen (nach Wörtern), damit ähnliche Namen unterscheidbar bleiben; zu langes Wort wird gekürzt. */
  const zeilenVon = (t: string, m: number): string[] => {
    const aus: string[] = [];
    let z = '';
    for (const w of t.split(/\s+/)) { const wort = w.length > m ? w.slice(0, m - 1) + '…' : w; if (z && (z + ' ' + wort).length > m) { aus.push(z); z = wort; } else z = z ? z + ' ' + wort : wort; }
    if (z) aus.push(z);
    return aus.length > 3 ? [...aus.slice(0, 2), aus.slice(2).join(' ').slice(0, m - 1) + '…'] : aus;
  };
  const text = $derived.by(() => {
    if (!d) return null;
    const mitR = d.felder.filter(f => f.r !== null), stark = [...mitR].sort((a, b) => Math.abs(b.r!) - Math.abs(a.r!))[0];
    const saetze = [L(`${d.felder.length} Paare aus ${k} Spalten; jede Punktwolke zeigt eine Spalte waagrecht und eine senkrecht.`, `${d.felder.length} pairs from ${k} columns; each dot cloud shows one column horizontally and one vertically.`)];
    if (stark) saetze.push(L(`Der stärkste Zusammenhang: ${nm(d.namen[stark.i]!)} und ${nm(d.namen[stark.j]!)}, r = ${zahlDe(stark.r!, 2)}.`, `The strongest relationship: ${nm(d.namen[stark.i]!)} and ${nm(d.namen[stark.j]!)}, r = ${zahlDe(stark.r!, 2)}.`));
    if (d.gekuerzt) saetze.push(L(`Die Felder zeigen höchstens ${STREUMATRIX_PUNKTE} Punkte (eine feste Auswahl); r und n rechnen mit allen.`, `The panels show at most ${STREUMATRIX_PUNKTE} dots (a fixed selection); r and n use all of them.`));
    return { saetze, tabelle: { titel: L('Korrelation je Paar', 'Correlation per pair'), kopf: [L('Paar', 'Pair'), 'n', 'r'], zeilen: d.felder.map(f => [`${nm(d.namen[f.i]!)} - ${nm(d.namen[f.j]!)}`, String(f.n), f.r === null ? '-' : zahlDe(f.r, 3)]) } };
  });
  /** Kurztext und Aufbau aus der Schablone; die Tabelle ist die Paartabelle (mit n je Paar, die die Korrelationsmatrix nicht hat), die Sätze kommen dazu. */
  const bt = $derived.by(() => {
    if (!d || !text) return null;
    const r: (number | null)[][] = gewaehlt.map(() => gewaehlt.map(() => null));
    for (const f of d.felder) { r[f.i]![f.j] = f.r; r[f.j]![f.i] = f.r; }
    const b = bildtext('streumatrix', { variablen: gewaehlt.map(nm), r });
    return { ...b, beschreibung: [...b.beschreibung, L('Oben rechts im Bild steht je Paar die Korrelation r mit n; die Tabelle nennt sie ebenfalls.', 'At the top right of the picture each pair shows the correlation r with n; the table gives them too.'), ...text.saetze], liste: [], tabelle: { ...text.tabelle, zeilenKopf: true } };
  });
</script>
<div class="sm">
  {#if alle.length > STREUMATRIX_MAX}
    <fieldset class="sm-wahl"><legend>{L(`Welche Spalten? Höchstens ${STREUMATRIX_MAX}.`, `Which columns? At most ${STREUMATRIX_MAX}.`)}</legend>
      {#each alle as n (n)}<label class="schalter"><input type="checkbox" checked={gewaehlt.includes(n)} disabled={!gewaehlt.includes(n) && gewaehlt.length >= STREUMATRIX_MAX} onchange={(ev) => schalte(n, ev.currentTarget.checked)}>{nm(n)}</label>{/each}
    </fieldset>
  {/if}
  {#if d && text && bt}
    <DiagrammExport titel={L('Streudiagramm-Matrix', 'Scatter plot matrix')}>
      <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
        {#each gewaehlt as n, r}
          {#each gewaehlt as _, c}
            {@const x0 = RAND + c * C}
            {@const y0 = RAND + r * C}
            <rect x={x0} y={y0} width={C} height={C} fill="none" stroke="var(--dg-gitter)" />
            {#if r === c}
              {@const zl = zeilenVon(nm(n), k > 4 ? 13 : 17)}
              {#each zl as z, i}<text x={x0 + C / 2} y={y0 + C / 2 - 6 - (zl.length - 1) * 7 + i * 14} text-anchor="middle" font-weight="650" style="font-size:{k > 4 ? 11.5 : 13}px">{z}</text>{/each}
              <text x={x0 + C / 2} y={y0 + C / 2 + 12 + (zl.length - 1) * 7} text-anchor="middle" class="klein">{zahlDe(bereich[r]![0])} - {zahlDe(bereich[r]![1])}</text>
            {:else if r > c}
              {@const f = feld(c, r)}
              {#if f}{#each f.punkte as p}<circle cx={px(c, p[0], x0)} cy={py(r, p[1], y0)} r="2.4" fill="var(--dg-punkt-a)" stroke="var(--dg-a)" stroke-width="0.8" />{/each}{/if}
            {:else}
              {@const f = feld(r, c)}
              <text x={x0 + C / 2} y={y0 + C / 2 + 2} text-anchor="middle" font-weight="650" style="font-size:{k > 4 ? 15 : 19}px">{f?.r === null || !f ? '-' : 'r = ' + zahlDe(f.r, 2)}</text>
              <text x={x0 + C / 2} y={y0 + C / 2 + 20} text-anchor="middle" class="klein">n = {f?.n ?? 0}</text>
            {/if}
          {/each}
        {/each}
      </svg>
    </DiagrammExport>
    <BildBeschreibung {...bt} />
  {:else}<p class="hilfe" use:ergebnisAnsage>{L(`Die Streudiagramm-Matrix braucht ${STREUMATRIX_MIN} bis ${STREUMATRIX_MAX} Spalten.`, `The scatter plot matrix needs ${STREUMATRIX_MIN} to ${STREUMATRIX_MAX} columns.`)}</p>{/if}
</div>

<style>
  .sm { display: grid; gap: var(--a3); margin-top: var(--a4); }
  .sm-wahl { border: 1px solid var(--linie); border-radius: var(--r2, 8px); padding: var(--a3); display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); }
  .sm-wahl legend { font-weight: 600; padding: 0 var(--a1); }
</style>
