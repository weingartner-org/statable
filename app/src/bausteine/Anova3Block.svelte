<script lang="ts">
  /**
   * Dreifaktorielle Varianzanalyse A × B × C unter dem Ergebnis der zweifaktoriellen (Field-Stufe 3): Die Auswahl eines dritten Faktors ergänzt die zwei bisherigen Gruppierungen
   * um den dritten; sieben Effekte, Typ III (Summenkodierung), ηp² mit Intervall, Satz zur Dreifach-Wechselwirkung und ein Interaktionsdiagramm je Stufe des dritten Faktors.
   * Rechnet im Browser (lib/anova3.ts); Zahlen gegen R (car::Anova, npk) geprüft.
   */
  import HilfeLink from './HilfeLink.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import Interaktionsdiagramm from './Interaktionsdiagramm.svelte';
  import TextfassungTabelle from './TextfassungTabelle.svelte';
  import { L, s, spalteNach } from '../lib/sitzung.svelte';
  import { istFehlend } from '../lib/fehlend';
  import { komma, ohneNull, pWert } from '../lib/ergebnis';
  import { anova3, QUELLEN3, zellenJeC, type Anova3 } from '../lib/anova3';
  import { dreifachHinweis, effektName3, satz3 } from '../lib/mehrfaktorsaetze';
  import type { Anova2E } from '../lib/anova2saetze';

  let { e, name }: { e: Anova2E; name: (n: string) => string } = $props();
  const kennung = $props.id();
  let drittes = $state('');
  const vergeben = $derived([e.yCol, e.aCol, e.bCol]);
  const verschieden = (n: string) => {
    const i = s.spalten.findIndex(c => c.name === n), sp = s.spalten[i];
    return new Set(s.zeilen.map(z => z[i]).filter(v => v !== null && v !== undefined && !(sp && istFehlend(sp, v)))).size;
  };
  /** Gruppenspalten mit 2 bis 6 verschiedenen Werten, die noch nicht gewählt sind. */
  const kandidaten = $derived(s.spalten.filter(c => !vergeben.includes(c.name) && !c.name.startsWith('$')).map(c => ({ n: c.name, k: verschieden(c.name) })).filter(x => x.k >= 2 && x.k <= 6));
  $effect(() => { if (drittes && !kandidaten.some(x => x.n === drittes)) drittes = ''; });

  const stufenName = (n: string, w: string | number) => spalteNach(n)?.werteLabels[String(w)] ?? String(w);
  const sortiere = (v: (string | number)[]) => [...new Set(v)].sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'de')));
  const eingabe = $derived.by(() => {
    if (!drittes) return null;
    const ix = [e.yCol, e.aCol, e.bCol, drittes].map(n => s.spalten.findIndex(c => c.name === n));
    if (ix.some(i => i < 0)) return null;
    const cs = ix.map(i => s.spalten[i]!), roh: (string | number)[][] = [[], [], []], y: number[] = [];
    for (const z of s.zeilen) {
      const w = ix.map(i => z[i]);
      if (typeof w[0] !== 'number' || istFehlend(cs[0]!, w[0]) || [1, 2, 3].some(q => w[q] === null || w[q] === undefined || istFehlend(cs[q]!, w[q] as never))) continue;
      y.push(w[0]); [1, 2, 3].forEach(q => roh[q - 1]!.push(w[q] as string | number));
    }
    const st = [e.aCol, e.bCol, drittes].map((n, q) => sortiere(roh[q]!).map(v => ({ roh: v, name: stufenName(n, v) })));
    const nm = (q: number, v: string | number) => st[q]!.find(x => x.roh === v)!.name;
    return { a: roh[0]!.map(v => nm(0, v)), b: roh[1]!.map(v => nm(1, v)), c: roh[2]!.map(v => nm(2, v)), y, aStufen: st[0]!.map(x => x.name), bStufen: st[1]!.map(x => x.name), cStufen: st[2]!.map(x => x.name) };
  });
  const res = $derived(eingabe ? anova3(eingabe) : null);
  const r = $derived(res && 'art' in res ? (res as Anova3) : null);
  const fehlerText = $derived.by(() => {
    if (!res || 'art' in res) return '';
    switch (res.fehler) {
      case 'leere-zelle': return L(`Die Zelle ${res.zelle.join(' × ')} hat keinen Fall. Die dreifaktorielle Varianzanalyse braucht in jeder Kombination mindestens einen Fall.`, `The cell ${res.zelle.join(' × ')} has no case. The three-way analysis of variance needs at least one case in every combination.`);
      case 'zu-wenig-faelle': return L('Zu wenige Fälle: Es braucht mehr Fälle als Zellen, damit ein Fehlerterm entsteht.', 'Too few cases: there must be more cases than cells to form an error term.');
      case 'keine-streuung': return L('Innerhalb der Zellen streuen die Werte nicht: Dann gibt es keinen Fehlerterm.', 'The values do not vary within the cells: then there is no error term.');
      default: return L('Jeder Faktor braucht mindestens zwei Stufen.', 'Each factor needs at least two levels.');
    }
  });
  const namen = $derived<[string, string, string]>([name(e.aCol), name(e.bCol), drittes ? name(drittes) : '']);
  const saetze = $derived(r ? QUELLEN3.map((q, i) => satz3(r.effekte[i]!, namen)) : []);
  const hinweis = $derived(r ? dreifachHinweis(r, namen) : '');
  const pT = (p: number) => pWert(p).replace('= ', '');
  const bereich = $derived<[number, number] | undefined>(r ? [Math.min(...r.zellen.map(z => z.lo)), Math.max(...r.zellen.map(z => z.hi))] : undefined);
  const gleich = $derived(r ? new Set(r.zellen.map(z => z.n)).size === 1 : true);
  const beschreibung = $derived(r ? L(`Mittelwerte je Zelle aus ${namen[0]}, ${namen[1]} und ${namen[2]}, mit 95 %-Intervall.`, `Cell means by ${namen[0]}, ${namen[1]} and ${namen[2]}, with 95% interval.`) : '');
</script>

<details class="auf" style="margin-top:var(--a4)"><summary>{L('Dritten Faktor dazunehmen: dreifaktorielle Varianzanalyse (A × B × C)', 'Add a third factor: three-way analysis of variance (A × B × C)')}</summary>
  <p class="heft-text">{L('Wirken zwei Gruppierungen auf den Messwert, und kommt eine dritte dazu? Die dreifaktorielle Varianzanalyse prüft sieben Effekte: drei Haupteffekte, drei Zweifach-Wechselwirkungen und die Dreifach-Wechselwirkung. Ist die Dreifach-Wechselwirkung bedeutsam, sind die Zweifach-Effekte je Stufe des dritten Faktors zu lesen. Die Quadratsummen sind vom Typ III (Summenkodierung); bei gleich großen Zellen sind alle Typen gleich.', 'Do two groupings act on the score, and is a third added? The three-way analysis of variance tests seven effects: three main effects, three two-way interactions and the three-way interaction. If the three-way interaction is significant, the two-way effects are to be read at each level of the third factor. The sums of squares are Type III (sum coding); with equal cell sizes all types are the same.')}</p>
  <p class="hilfe"><HilfeLink id="dreifach-wechselwirkung" text={L('Hilfe: Dreifach-Wechselwirkung', 'Help: three-way interaction')} /> <HilfeLink id="typ-iii-quadratsumme" text={L('Hilfe: Typ-III-Quadratsumme', 'Help: Type III sum of squares')} /></p>
  <div class="einst-gruppe">
    {#if kandidaten.length === 0}
      <p class="heft-text">{L('Es gibt keine weitere Gruppenspalte mit 2 bis 6 verschiedenen Werten.', 'There is no further grouping column with 2 to 6 different values.')}</p>
    {:else}
      <div class="eingabe" style="max-width:420px"><label for="d3-c-{kennung}">{L('Dritter Faktor (Gruppenspalte)', 'Third factor (grouping column)')}</label>
        <select id="d3-c-{kennung}" bind:value={drittes}><option value="">{L('Keiner', 'None')}</option>{#each kandidaten as x (x.n)}<option value={x.n}>{name(x.n)} ({x.k})</option>{/each}</select></div>
    {/if}
    {#if fehlerText}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehlerText}</p>{/if}
    {#if r && eingabe}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Dreifaktorielle Varianzanalyse: ${namen[0]} × ${namen[1]} × ${namen[2]}`, `Three-way analysis of variance: ${namen[0]} × ${namen[1]} × ${namen[2]}`)} (n = {r.n})</b></caption>
        <thead><tr><th scope="col">{L('Effekt', 'Effect')}</th><th scope="col">F</th><th scope="col">df 1</th><th scope="col">df 2</th><th scope="col">p</th><th scope="col">ηp²</th><th scope="col">{L('95 %-KI ηp²', '95% CI ηp²')}</th></tr></thead>
        <tbody>{#each r.effekte as x (x.quelle)}<tr><th scope="row" style="text-align: start">{effektName3(x.quelle, ...namen)}</th><td style="text-align:right">{komma(x.f, 2)}</td><td style="text-align:right">{x.df}</td><td style="text-align:right">{r.fehler.df}</td><td style="text-align:right">{pT(x.p)}</td><td style="text-align:right">{ohneNull(x.etaP, 3)}</td><td style="text-align:right">{ohneNull(x.etaPLo, 2)} bis {ohneNull(x.etaPHi, 2)}</td></tr>{/each}</tbody>
      </table></div>
      <p class="heft-text">{L(`Fehlerterm: Streuung innerhalb der Zellen (Quadratsumme ${komma(r.fehler.ss, 2)}, ${r.fehler.df} Freiheitsgrade).`, `Error term: variation within the cells (sum of squares ${komma(r.fehler.ss, 2)}, ${r.fehler.df} degrees of freedom).`)}{gleich ? '' : ' ' + L('Die Zellen sind unterschiedlich groß; Typ III testet die ungewichteten Mittel der Zellen.', 'The cells differ in size; Type III tests the unweighted means of the cells.')}</p>
      <p class="heft-text" style="font-weight:600">{hinweis}</p>
      <ul class="heft-text">{#each saetze as t (t)}<li>{t}</li>{/each}</ul>

      <h3 style="margin-top:var(--a3)">{L(`Interaktionsdiagramm: ${namen[0]} und ${namen[1]} je Stufe von ${namen[2]}`, `Interaction plot: ${namen[0]} and ${namen[1]} at each level of ${namen[2]}`)}</h3>
      <p class="heft-text">{L('Je Stufe des dritten Faktors ein Feld mit derselben Skala. Sehen die Felder verschieden aus (Linien parallel in einem Feld, gekreuzt im anderen), zeigt sich die Dreifach-Wechselwirkung.', 'One panel per level of the third factor, all with the same scale. If the panels look different (lines parallel in one, crossing in another), the three-way interaction shows.')}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:var(--a4)">
        {#each r.cStufen as c (c)}
          <div><h4 style="margin:var(--a2) 0">{namen[2]}: {c}</h4>
            <DiagrammExport titel={`${L('Interaktionsdiagramm', 'Interaction plot')}: ${namen[2]} = ${c}`}><Interaktionsdiagramm e={{ zellen: zellenJeC(r, c) }} aText={namen[0]} bText={namen[1]} yText={name(e.yCol)} {bereich} /></DiagrammExport></div>
        {/each}
      </div>
      <TextfassungTabelle saetze={[beschreibung, hinweis]} tabellen={[{ titel: L('Mittelwerte je Zelle', 'Cell means'), kopf: [namen[0], namen[1], namen[2], 'n', L('Mittelwert', 'Mean'), L('Standardabweichung', 'Standard deviation'), L('95 %-KI von', '95% CI from'), L('95 %-KI bis', '95% CI to')], zeilen: r.zellen.map(z => [z.a, z.b, z.c, String(z.n), komma(z.mittel, 2), Number.isFinite(z.sd) ? komma(z.sd, 2) : '-', komma(z.lo, 2), komma(z.hi, 2)]) }]} />
    {/if}
  </div>
</details>
