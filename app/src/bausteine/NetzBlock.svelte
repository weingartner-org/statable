<script lang="ts">
  /**
   * B4 Teil 2: „Welche Variablen hängen direkt zusammen? (Netzwerkanalyse, Partialkorrelationsnetz)“ unter der Korrelationsmatrix.
   * Jede Kante ist die Partialkorrelation zweier Spalten bei festgehaltenen allen anderen (lib/netzwerk.ts, ohne Regularisierung), mit Bootstrap-Intervall und Holm-p.
   * Rechnet im Browser (kein R), erst auf Klick. Bild als Kreis mit Zahlen, die gleichen Zahlen stehen in den Tabellen (Textfassung). Beschreibend, ohne Deutung.
   * Fachblatt docs/ausbau/FACHBLATT-B4-PSYCHOLOGIE.md, Abschnitt Teil 2.
   */
  import HilfeLink from './HilfeLink.svelte';
  import Rechnet from './Rechnet.svelte';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { bildtext } from '../lib/bildtext';
  import { untrack } from 'svelte';
  import { s, L, melde, meldeFehler } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { komma, ohneNull } from '../lib/ergebnis';
  import { herunterladen, heute } from '../lib/export';
  import { rSkriptZip } from '../lib/rskript';
  import { baueNetzSkript, knotenPunkt, netzDaten, netzRechne, NETZ_ALPHA, NETZ_MAX_SPALTEN, NETZ_MIN_FAELLE, NETZ_MIN_SPALTEN, type NetzArt, type NetzErgebnis, type NetzFehler } from '../lib/netzwerk';

  let { spalten, methode = 'pearson' }: { spalten: string[]; methode?: NetzArt } = $props();
  const kennung = $props.id();
  const nm = (n: string) => s.spalten.find(c => c.name === n)?.bezeichnung.trim() || n;
  const passt = $derived(spalten.length >= NETZ_MIN_SPALTEN && spalten.length <= NETZ_MAX_SPALTEN && spalten.every(n => s.spalten.some(c => c.name === n && c.art === 'zahl')));
  let art = $state<NetzArt>('pearson'), startwert = $state(1), alleKanten = $state(false), laeuft = $state(false);
  $effect(() => { art = methode; });
  let res = $state<{ e: NetzErgebnis; benutzt: string[]; weg: number } | NetzFehler | null>(null);
  $effect(() => { void spalten.join('|'); void art; void startwert; untrack(() => { res = null; }); });

  async function rechnen() {
    if (laeuft) return;
    laeuft = true; res = null;
    await new Promise(r => setTimeout(r, 30));
    const sw = Number.isInteger(startwert) && startwert >= 0 ? startwert : 1;
    const d = netzDaten(s.spalten, s.zeilen, spalten);
    if ('fehler' in d) res = d;
    else { const e = netzRechne(d.X, art, sw); res = 'fehler' in e ? e : { e, benutzt: [...spalten], weg: d.weg }; }
    laeuft = false;
    sage(res && 'fehler' in res ? fehlerText(res) : L('Netz gerechnet.', 'Network calculated.'), res && 'fehler' in res ? 'dringend' : undefined);
  }
  const fehlerText = (f: NetzFehler) => f.fehler === 'zu-wenig-spalten' ? L(`Ein Netz braucht mindestens ${NETZ_MIN_SPALTEN} Zahlen-Spalten.`, `A network needs at least ${NETZ_MIN_SPALTEN} number columns.`)
    : f.fehler === 'zu-viele-spalten' ? L(`Mehr als ${NETZ_MAX_SPALTEN} Spalten sind zu viele für ein lesbares Netz.`, `More than ${NETZ_MAX_SPALTEN} columns are too many for a readable network.`)
    : f.fehler === 'zu-wenig-faelle' ? L(`Zu wenige Personen mit allen Angaben (mindestens ${NETZ_MIN_FAELLE}, und mindestens dreimal so viele wie Spalten).`, `Too few people with all answers (at least ${NETZ_MIN_FAELLE}, and at least three times as many as columns).`)
    : f.fehler === 'keine-streuung' ? L('Eine Spalte hat keine Streuung.', 'A column has no variation.')
    : L('Zwei Spalten hängen so eng zusammen oder eine Spalte streut so wenig, dass sich das Netz nicht rechnen lässt (die Korrelationsmatrix ist nicht umkehrbar). Eine der beiden Spalten weglassen.', 'Two columns are so closely related or a column varies so little that the network cannot be calculated (the correlation matrix cannot be inverted). Leave one of the two columns out.');

  const ok = $derived(res && !('fehler' in res) ? res : null);
  const z = (v: number, n = 2) => (Number.isFinite(v) ? komma(v, n) : '-');
  const pw = (v: number) => (!Number.isFinite(v) ? '-' : v < 0.001 ? L('< ,001', '< .001') : ohneNull(v, 3));
  const kante = (e: NetzErgebnis, c: { i: number; j: number }) => `${nm(ok!.benutzt[c.i]!)} – ${nm(ok!.benutzt[c.j]!)}`;
  /** Kanten für Bild und Tabelle: nach Betrag sortiert */
  const sortiert = $derived(ok ? [...ok.e.kanten].sort((a, b) => Math.abs(b.r) - Math.abs(a.r)) : []);
  const gezeigt = $derived(ok ? ok.e.kanten.filter(c => alleKanten || c.pHolm < NETZ_ALPHA) : []);
  const TABELLE_MAX = 30;
  const maxR = $derived(ok ? Math.max(0.05, ...ok.e.kanten.map(c => Math.abs(c.r))) : 1);

  const saetze = $derived.by(() => {
    if (!ok) return [] as string[];
    const e = ok.e, top = sortiert[0]!, groesstes = e.staerke.indexOf(Math.max(...e.staerke));
    const aus = [
      L(`${e.n} Personen gehen ein${ok.weg ? ` (${ok.weg} mit Lücken bleiben außen vor)` : ''}, ${e.k} Spalten, ${e.art === 'spearman' ? 'Rangkorrelation nach Spearman' : 'Korrelation nach Pearson'}.`, `${e.n} people are included${ok.weg ? ` (${ok.weg} with gaps are left out)` : ''}, ${e.k} columns, ${e.art === 'spearman' ? 'Spearman rank correlation' : 'Pearson correlation'}.`),
      L(`Von ${e.kanten.length} möglichen Kanten sind ${e.nSignifikant} nach der Holm-Korrektur deutlich (p < ,05).`, `Of ${e.kanten.length} possible edges, ${e.nSignifikant} are clear after the Holm correction (p < .05).`),
      L(`Die größte Partialkorrelation hat die Kante ${kante(e, top)}: ${z(top.r)} (Bootstrap-Intervall ${z(top.lo)} bis ${z(top.hi)}).`, `The largest partial correlation belongs to the edge ${kante(e, top)}: ${z(top.r)} (bootstrap interval ${z(top.lo)} to ${z(top.hi)}).`),
      L(`Die größte Stärke hat „${nm(ok.benutzt[groesstes]!)}“: ${z(e.staerke[groesstes]!)} (Bootstrap-Intervall ${z(e.staerkeLo[groesstes]!)} bis ${z(e.staerkeHi[groesstes]!)}).`, `“${nm(ok.benutzt[groesstes]!)}” has the largest strength: ${z(e.staerke[groesstes]!)} (bootstrap interval ${z(e.staerkeLo[groesstes]!)} to ${z(e.staerkeHi[groesstes]!)}).`)
    ];
    if (e.gueltig < e.ziehungen) aus.push(L(`${e.ziehungen - e.gueltig} von ${e.ziehungen} Bootstrap-Ziehungen waren nicht rechenbar und zählen nicht mit.`, `${e.ziehungen - e.gueltig} of ${e.ziehungen} bootstrap draws could not be calculated and are not counted.`));
    return aus;
  });

  /** Text zum Bild: Name, Sätze und die gezeichneten Kanten als Tabelle (die vollständigen Tabellen stehen darunter) */
  const bt = $derived(ok ? bildtext('sonstiges', {
    artName: L('Netz aus Partialkorrelationen', 'Network of partial correlations'),
    saetze: [L(`${ok.e.k} Punkte, nummeriert 1 bis ${ok.e.k}, im Kreis angeordnet; ${gezeigt.length} Kanten gezeichnet. Linienbreite = Betrag der Partialkorrelation, negative Kanten gestrichelt.`, `${ok.e.k} nodes, numbered 1 to ${ok.e.k}, arranged in a circle; ${gezeigt.length} edges drawn. Line width = absolute value of the partial correlation, negative edges dashed.`)],
    tabelle: { kopf: [L('Kante', 'Edge'), L('Partialkorrelation', 'Partial correlation')], zeilen: [...gezeigt].sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).map(c => [`${c.i + 1} – ${c.j + 1}`, z(c.r)]) }
  }) : null);
  const W = 480, H = 400, MX = 240, MY = 200, RAD = 140, KR = 15;
  const kantenEnden = (c: { i: number; j: number }, k: number) => ({ a: knotenPunkt(c.i, k, RAD, MX, MY), b: knotenPunkt(c.j, k, RAD, MX, MY) });

  function rSkript() {
    if (!ok) return;
    try {
      const sk = baueNetzSkript({ spalten: s.spalten, zeilen: s.zeilen, benutzt: ok.benutzt, r: ok.e, titel: L('Partialkorrelationsnetz', 'Partial correlation network'), datum: heute() });
      herunterladen(rSkriptZip(sk), `${sk.rName.replace(/\.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${sk.rName} und ${sk.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${sk.rName} and ${sk.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Das R-Skript ließ sich nicht erstellen.', 'The R script could not be created.')); }
  }
</script>

{#if passt}
  <details class="auf netz" style="margin-top:var(--a4)"><summary>{L('Welche Variablen hängen direkt zusammen? (Netzwerkanalyse, Partialkorrelationsnetz)', 'Which variables are directly related? (network analysis, partial correlation network)')}</summary>
    <p class="heft-text">{L('Im Partialkorrelationsnetz ist jede Spalte ein Punkt und jede Kante die Partialkorrelation zweier Spalten, wenn alle anderen Spalten festgehalten werden. Eine Kante bedeutet also: Auch nachdem alles andere herausgerechnet ist, hängen diese beiden noch zusammen. Statable zeigt zu jeder Kante ein Bootstrap-Intervall (95 %) und den p-Wert nach Holm und zu jedem Punkt die Stärke (Summe der Beträge seiner Kanten). Das Netz ist nicht geglättet (kein Lasso).', 'In the partial correlation network each column is a node and each edge is the partial correlation of two columns when all the other columns are held constant. An edge therefore means: even after everything else is taken out, these two are still related. Statable shows a bootstrap interval (95%) and the Holm p value for each edge and the strength (sum of the absolute values of its edges) for each node. The network is not regularised (no lasso).')}</p>
    <p class="hilfe"><HilfeLink id="netzwerkanalyse" text={L('Hilfe: Netzwerkanalyse', 'Help: network analysis')} /> <a href="#lernen/pfad/psychologie">{L('Mehr dazu: Lernpfad Psychologie', 'More: learning path psychology')}</a></p>
    <div class="netz-zeile">
      <fieldset class="netz-art"><legend>{L('Art der Korrelation', 'Type of correlation')}</legend>
        <div class="segment">{#each [['pearson', 'Pearson (r)'], ['spearman', 'Spearman (rs)']] as [w, t] (w)}<label><input type="radio" name="netz-art-{kennung}" value={w} checked={art === w} onchange={() => { art = w as NetzArt; }}>{t}</label>{/each}</div>
      </fieldset>
      <div class="eingabe netz-start"><label for="netz-s-{kennung}">{L('Startwert des Bootstraps', 'Seed of the bootstrap')}</label><input id="netz-s-{kennung}" type="number" min="0" step="1" inputmode="numeric" bind:value={startwert} /></div>
    </div>
    <div class="knopfzeile"><button class="k" type="button" onclick={rechnen} disabled={laeuft}>{#if laeuft}<Rechnet imKnopf text={L('Einen Moment …', 'One moment …')} />{:else}{ok ? L('Netz neu rechnen', 'Recalculate network') : L('Netz rechnen', 'Calculate network')}{/if}</button></div>
    {#if res && 'fehler' in res}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehlerText(res)}</p>
    {:else if ok}
      <div class="netz-saetze">{#each saetze as t (t)}<p class="heft-text">{t}</p>{/each}</div>
      <label class="schalter" style="display:block;margin:var(--a2) 0"><input type="checkbox" bind:checked={alleKanten} /> {L('Auch Kanten zeichnen, die nach Holm nicht deutlich sind', 'Also draw edges that are not clear after Holm')}</label>
      <figure class="ll-bild">
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz} style="max-width:{W}px">
          {#each gezeigt as c (`${c.i}-${c.j}`)}{@const p = kantenEnden(c, ok.e.k)}
            <line x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} stroke={c.r >= 0 ? 'var(--dg-a)' : 'var(--dg-b)'} stroke-width={(1 + 7 * Math.abs(c.r) / maxR).toFixed(2)} stroke-dasharray={c.r >= 0 ? undefined : '7 4'} stroke-linecap="round" opacity="0.9" />
          {/each}
          {#each ok.benutzt as _, i (i)}{@const p = knotenPunkt(i, ok.e.k, RAD, MX, MY)}
            <circle cx={p[0]} cy={p[1]} r={KR} fill="var(--papier, #fff)" stroke="var(--dg-achse, var(--tinte))" stroke-width="2" />
            <text x={p[0]} y={p[1] + 4.5} text-anchor="middle" class="klein" style="font-weight:600" fill="var(--tinte)">{i + 1}</text>
          {/each}
        </svg>
        <figcaption>
          <ul class="ll-legende">
            <li><svg viewBox="0 0 28 10" width="28" height="10" aria-hidden="true"><line x1="1" x2="27" y1="5" y2="5" stroke="var(--dg-a)" stroke-width="3" /></svg> {L('positive Partialkorrelation (durchgezogen)', 'positive partial correlation (solid)')}</li>
            <li><svg viewBox="0 0 28 10" width="28" height="10" aria-hidden="true"><line x1="1" x2="27" y1="5" y2="5" stroke="var(--dg-b)" stroke-width="3" stroke-dasharray="7 4" /></svg> {L('negative Partialkorrelation (gestrichelt)', 'negative partial correlation (dashed)')}</li>
          </ul>
          {L('Dicke der Linie = Betrag der Partialkorrelation. Die Zahlen im Punkt stehen in der Tabelle der Punkte.', 'Line width = absolute value of the partial correlation. The numbers in the nodes are listed in the table of nodes.')}
        </figcaption>
      </figure>
      {#if bt}<BildBeschreibung {...bt} />{/if}
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Punkte: Stärke und erwarteter Einfluss', 'Nodes: strength and expected influence')}</b></caption>
        <thead><tr><th scope="col">{L('Nr.', 'No.')}</th><th scope="col" style="text-align: start">{L('Spalte', 'Column')}</th><th scope="col">{L('Stärke', 'Strength')}</th><th scope="col">{L('95 %-Intervall (Bootstrap)', '95% interval (bootstrap)')}</th><th scope="col">{L('Erwarteter Einfluss', 'Expected influence')}</th></tr></thead>
        <tbody>{#each ok.benutzt as n, i (n)}<tr><td style="text-align:end">{i + 1}</td><th scope="row" style="text-align: start">{nm(n)}</th><td style="text-align:end">{z(ok.e.staerke[i]!)}</td><td style="text-align:end">{z(ok.e.staerkeLo[i]!)} {L('bis', 'to')} {z(ok.e.staerkeHi[i]!)}</td><td style="text-align:end">{z(ok.e.einfluss[i]!)}</td></tr>{/each}</tbody>
      </table></div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Kanten (nach Betrag sortiert${sortiert.length > TABELLE_MAX ? `, die ${TABELLE_MAX} größten von ${sortiert.length}` : ''})`, `Edges (sorted by absolute value${sortiert.length > TABELLE_MAX ? `, the ${TABELLE_MAX} largest of ${sortiert.length}` : ''})`)}</b></caption>
        <thead><tr><th scope="col" style="text-align: start">{L('Kante', 'Edge')}</th><th scope="col">{L('Partialkorrelation', 'Partial correlation')}</th><th scope="col">{L('95 %-Intervall (Bootstrap)', '95% interval (bootstrap)')}</th><th scope="col">p ({L('Holm', 'Holm')})</th></tr></thead>
        <tbody>{#each sortiert.slice(0, TABELLE_MAX) as c (`${c.i}-${c.j}`)}<tr><th scope="row" style="text-align: start">{c.i + 1} – {c.j + 1}: {kante(ok.e, c)}</th><td style="text-align:end">{z(c.r)}</td><td style="text-align:end">{z(c.lo)} {L('bis', 'to')} {z(c.hi)}</td><td style="text-align:end">{pw(c.pHolm)}</td></tr>{/each}</tbody>
      </table></div>
      <div class="knopfzeile"><button class="k" type="button" onclick={rSkript}>{L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)')}</button></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L(`Eine Kante ist ein statistischer Zusammenhang, keine Ursache und keine Richtung: Auch ein Netz aus Querschnittsdaten sagt nicht, was was bewirkt. Ob die Punkte wichtig sind, zeigt die Stärke nicht allein; ihre Intervalle (${ok.e.ziehungen} Bootstrap-Ziehungen) zeigen, wie unsicher sie sind. Nähe und Zwischenzentralität gibt Statable bewusst nicht aus: Ohne Glättung ist jedes Paar verbunden, Wege über Dritte sagen dann kaum etwas. Das Bootstrap-Intervall im R-Skript kann etwas abweichen (andere Zufallsfälle), die Kanten und Stärken sind gleich.`, `An edge is a statistical relation, not a cause and not a direction: even a network from cross-sectional data does not say what causes what. Strength alone does not show whether nodes are important; its intervals (${ok.e.ziehungen} bootstrap draws) show how uncertain it is. Statable deliberately does not report closeness and betweenness: without regularisation every pair is connected, so paths via third nodes say little. The bootstrap interval in the R script can differ somewhat (other random cases), the edges and strengths are the same.`)}</p>
    {/if}
  </details>
{/if}

<style>
  .netz-zeile { display: flex; flex-wrap: wrap; gap: var(--a2) var(--a4); align-items: end; margin-block: var(--a2); }
  .netz-art { border: 0; padding: 0; margin: 0; }
  .netz-art legend { font-weight: 600; margin-bottom: var(--a1); }
  .netz-start { max-width: 200px; margin: 0; }
  .netz :global(.ll-bild) { margin: var(--a2) 0; min-width: 0; }
  .netz :global(.ll-bild figcaption) { font-size: var(--gr-klein); color: var(--tinte-2); max-width: var(--breite-text); margin-top: var(--a1); }
</style>
