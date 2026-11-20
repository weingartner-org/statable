<script lang="ts">
  /**
   * B4 Teil 1: „Wie verläuft die Veränderung bei jeder Person? (Wachstumskurvenmodell, Latent Growth)“ unter „Verändert sich etwas bei denselben Personen?“ (Messwiederholung, ab drei Zeitpunkten).
   * Die Zeitpunkte sind die Spalten des Blatts in deren Reihenfolge. Rechnet erst auf Klick (R in webR, lavaan, ML); beschreibende Sätze ohne Deutung; R-Skript zum Mitnehmen.
   * Fachblatt docs/ausbau/FACHBLATT-B4-PSYCHOLOGIE.md.
   */
  import HilfeLink from './HilfeLink.svelte';
  import RStart from './RStart.svelte';
  import { untrack } from 'svelte';
  import { s, L, melde, meldeFehler } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { komma } from '../lib/ergebnis';
  import { herunterladen, heute } from '../lib/export';
  import { rSkriptZip } from '../lib/rskript';
  import { wachstumRechnen, type WachstumErg } from '../lib/rverfahren.svelte';
  import { baueWachstumSkript, zeitwerteLesen, WACHSTUM_MAX_ZEITPUNKTE } from '../lib/wachstumblock';

  let { spalten, name }: { spalten: string[]; name?: (n: string) => string } = $props();
  const kennung = $props.id();
  const nm = (n: string) => (name ? name(n) : (s.spalten.find(c => c.name === n)?.bezeichnung.trim() || n));
  const passt = $derived(spalten.length >= 3 && spalten.length <= WACHSTUM_MAX_ZEITPUNKTE && spalten.every(n => s.spalten.some(c => c.name === n && c.art === 'zahl')));
  let zeitText = $state(''), gleichRest = $state(false), fiml = $state(false), laeuft = $state(false), fehler = $state(''), fehlt = $state(false);
  let erg = $state<{ e: WachstumErg; spalten: string[]; zeit: number[]; gleichRest: boolean; fiml: boolean } | null>(null);
  const zeit = $derived(zeitwerteLesen(zeitText, spalten.length));
  $effect(() => { void spalten.join('|'); void zeitText; void gleichRest; void fiml; untrack(() => { erg = null; fehler = ''; }); });

  async function rechnen() {
    if (laeuft || !zeit) return;
    laeuft = true; fehler = '';
    try {
      const e = await wachstumRechnen(spalten, zeit, gleichRest, fiml);
      erg = { e, spalten: [...spalten], zeit, gleichRest, fiml };
      sage(L('Wachstumskurvenmodell gerechnet.', 'Growth curve model calculated.'));
    } catch (x) { fehler = (x as Error).message; erg = null; sage(fehler, 'dringend'); }
    finally { laeuft = false; }
  }
  const z = (v: number | null | undefined, n = 2) => (typeof v === 'number' && Number.isFinite(v) ? komma(v, n) : '-');
  const pw = (v: number | null | undefined) => (typeof v !== 'number' || !Number.isFinite(v) ? '-' : v < 0.001 ? '< ,001' : komma(v, 3).replace(/^0/, ''));
  const saetze = $derived.by(() => {
    if (!erg) return [] as string[];
    const e = erg.e, m = e.mittel, v = e.varianz;
    const aus = [
      L(`${e.n} Personen gehen ein${e.nAlle > e.n ? ` (${e.nAlle - e.n} mit Lücken bleiben außen vor)` : ''}, ${erg.spalten.length} Zeitpunkte.`, `${e.n} people are included${e.nAlle > e.n ? ` (${e.nAlle - e.n} with gaps are left out)` : ''}, ${erg.spalten.length} time points.`),
      L(`Der Mittelwert beim Zeitwert 0 (Achsenabschnitt) ist ${z(m.i.est)}, die mittlere Veränderung je Zeiteinheit (Steigung) ${z(m.s.est)}${m.s.lo !== null && m.s.hi !== null ? ` (95 %-Intervall ${z(m.s.lo)} bis ${z(m.s.hi)})` : ''}.`, `The mean at time value 0 (intercept) is ${z(m.i.est)}, the mean change per time unit (slope) is ${z(m.s.est)}${m.s.lo !== null && m.s.hi !== null ? ` (95% interval ${z(m.s.lo)} to ${z(m.s.hi)})` : ''}.`),
      L(`Die Personen streuen um diese Mittelwerte: Standardabweichung der Achsenabschnitte ${z(Math.sqrt(Math.max(v.i.est, 0)))}, der Steigungen ${z(Math.sqrt(Math.max(v.s.est, 0)))}. Achsenabschnitt und Steigung hängen mit r = ${z(e.kov.r)} zusammen.`, `The people vary around these means: standard deviation of the intercepts ${z(Math.sqrt(Math.max(v.i.est, 0)))}, of the slopes ${z(Math.sqrt(Math.max(v.s.est, 0)))}. Intercept and slope are related with r = ${z(e.kov.r)}.`)
    ];
    if (e.fit) aus.push(L(`Passung des Modells: χ² = ${z(e.fit.chisq)} bei ${e.fit.df} Freiheitsgraden${e.fit.cfi !== null ? `, CFI = ${z(e.fit.cfi, 3)}` : ''}${e.fit.rmsea !== null ? `, RMSEA = ${z(e.fit.rmsea, 3)}` : ''}${e.fit.srmr !== null ? `, SRMR = ${z(e.fit.srmr, 3)}` : ''}.`, `Fit of the model: χ² = ${z(e.fit.chisq)} with ${e.fit.df} degrees of freedom${e.fit.cfi !== null ? `, CFI = ${z(e.fit.cfi, 3)}` : ''}${e.fit.rmsea !== null ? `, RMSEA = ${z(e.fit.rmsea, 3)}` : ''}${e.fit.srmr !== null ? `, SRMR = ${z(e.fit.srmr, 3)}` : ''}.`));
    if (e.negativeVarianz) aus.push(L('Eine Varianz kam negativ heraus. Das Modell ist dann mit diesen Daten nicht verlässlich zu schätzen (zum Beispiel zu wenige Personen, nur drei Zeitpunkte oder fast keine Streuung der Steigungen). Ein einfacheres Modell hilft oft: „Restvarianz zu allen Zeitpunkten gleich setzen“.', 'A variance came out negative. The model can then not be estimated reliably with these data (for example too few people, only three time points or hardly any variation of the slopes). A simpler model often helps: “Set the residual variance equal at all time points”.'));
    return aus;
  });

  function rSkript() {
    if (!erg) return;
    try {
      const e = erg.e;
      const sk = baueWachstumSkript({ spalten: s.spalten, zeilen: s.zeilen, benutzt: erg.spalten, zeit: erg.zeit, gleichRest: erg.gleichRest, fiml: erg.fiml, titel: L('Wachstumskurvenmodell', 'Growth curve model'), datum: heute(),
        statable: { n: e.n, mittelI: e.mittel.i.est, mittelS: e.mittel.s.est, varI: e.varianz.i.est, varS: e.varianz.s.est, kov: e.kov.est, chisq: e.fit?.chisq ?? null, df: e.fit?.df ?? null, cfi: e.fit?.cfi ?? null, rmsea: e.fit?.rmsea ?? null } });
      herunterladen(rSkriptZip(sk), `${sk.rName.replace(/\.R$/, '')}.zip`, 'application/zip');
      melde(L(`R-Skript mit Daten gespeichert (${sk.rName} und ${sk.csvName}). Es liegt bei den Downloads.`, `R script with data saved (${sk.rName} and ${sk.csvName}). You will find it in your downloads.`));
    } catch { meldeFehler(L('Das R-Skript ließ sich nicht erstellen.', 'The R script could not be created.')); }
  }
</script>

{#if passt}
  <details class="auf wachstum" style="margin-top:var(--a4)"><summary>{L('Wie verläuft die Veränderung bei jeder Person? (Wachstumskurvenmodell, Latent Growth)', 'How does each person change over time? (growth curve model, latent growth)')}</summary>
    <p class="heft-text">{L('Das Wachstumskurvenmodell (latent growth model) legt für jede Person eine eigene Gerade durch ihre Messwerte: einen Startwert (Achsenabschnitt, intercept) und eine Veränderung je Zeiteinheit (Steigung, slope). Statable zeigt die Mittelwerte dieser beiden Größen und wie stark die Personen um sie streuen. Die Zeitpunkte sind die Spalten oben in ihrer Reihenfolge.', 'The growth curve model (latent growth model) fits a line of its own through each person’s measurements: a starting value (intercept) and a change per time unit (slope). Statable shows the means of these two quantities and how strongly the people vary around them. The time points are the columns above in their order.')}</p>
    <p class="hilfe"><HilfeLink id="wachstumskurvenmodell" text={L('Hilfe: Wachstumskurvenmodell', 'Help: growth curve model')} /> <a href="#lernen/pfad/psychologie">{L('Mehr dazu: Lernpfad Psychologie', 'More: learning path psychology')}</a></p>
    <div class="eingabe" style="max-width:420px"><label for="wk-z-{kennung}">{L('Zeitwerte der Messungen (leer = 0, 1, 2 …)', 'Time values of the measurements (empty = 0, 1, 2 …)')}</label>
      <input id="wk-z-{kennung}" type="text" inputmode="decimal" autocomplete="off" bind:value={zeitText} aria-describedby="wk-h-{kennung}" aria-invalid={zeit ? undefined : true} placeholder="0, 1, 2, 3" />
      <span id="wk-h-{kennung}" class="heft-text" style="color:var(--tinte-2)">{L(`Je Spalte ein Wert (${spalten.length} Werte), durch Komma, Leerzeichen oder Semikolon getrennt; Dezimalzahlen mit Punkt oder mit Semikolon als Trenner. Der Achsenabschnitt gilt beim Zeitwert 0. Bei ungleichen Abständen (zum Beispiel 0, 1, 3, 6 Monate) hier die echten Abstände eintragen.`, `One value per column (${spalten.length} values), separated by comma, space or semicolon; decimals with a point or with a semicolon as separator. The intercept applies at time value 0. For unequal gaps (for example 0, 1, 3, 6 months) enter the real gaps here.`)}</span></div>
    {#if !zeit}<p class="heft-text" style="color:var(--fehler, #b3261e)">{L(`Die Zeitwerte passen nicht: Es braucht genau ${spalten.length} Zahlen, mindestens drei davon verschieden.`, `The time values do not fit: exactly ${spalten.length} numbers are needed, at least three of them different.`)}</p>{/if}
    <label class="schalter" style="display:block;margin:var(--a2) 0"><input type="checkbox" bind:checked={gleichRest} /> {L('Restvarianz zu allen Zeitpunkten gleich setzen (einfacheres Modell)', 'Set the residual variance equal at all time points (simpler model)')}</label>
    <label class="schalter" style="display:block;margin:var(--a2) 0"><input type="checkbox" bind:checked={fiml} /> {L('Personen mit Lücken mitrechnen (FIML)', 'Include people with gaps (FIML)')}</label>
    {#if fehler}<p class="heft-text" style="color:var(--fehler, #b3261e)">{fehler}</p>{/if}
    <RStart knopf={erg ? L('Wachstumskurve neu rechnen', 'Recalculate growth curve') : L('Wachstumskurve rechnen', 'Calculate growth curve')} los={rechnen} {laeuft} bind:fehlt />
    {#if erg}
      <div class="wk-saetze">{#each saetze as t}<p class="heft-text">{t}</p>{/each}</div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Mittelwerte und Streuung der Verlaufsgrößen', 'Means and variation of the growth quantities')}</b></caption>
        <thead><tr><td></td><th scope="col">{L('Schätzwert', 'Estimate')}</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">p</th></tr></thead>
        <tbody>
          <tr><th scope="row" style="text-align: start">{L('Mittelwert Achsenabschnitt', 'Mean intercept')}</th><td style="text-align:end">{z(erg.e.mittel.i.est)}</td><td style="text-align:end">{z(erg.e.mittel.i.se)}</td><td style="text-align:end">{pw(erg.e.mittel.i.p)}</td></tr>
          <tr><th scope="row" style="text-align: start">{L('Mittelwert Steigung', 'Mean slope')}</th><td style="text-align:end">{z(erg.e.mittel.s.est)}</td><td style="text-align:end">{z(erg.e.mittel.s.se)}</td><td style="text-align:end">{pw(erg.e.mittel.s.p)}</td></tr>
          <tr><th scope="row" style="text-align: start">{L('Varianz Achsenabschnitt', 'Variance intercept')}</th><td style="text-align:end">{z(erg.e.varianz.i.est)}</td><td style="text-align:end">{z(erg.e.varianz.i.se)}</td><td style="text-align:end">{pw(erg.e.varianz.i.p)}</td></tr>
          <tr><th scope="row" style="text-align: start">{L('Varianz Steigung', 'Variance slope')}</th><td style="text-align:end">{z(erg.e.varianz.s.est)}</td><td style="text-align:end">{z(erg.e.varianz.s.se)}</td><td style="text-align:end">{pw(erg.e.varianz.s.p)}</td></tr>
          <tr><th scope="row" style="text-align: start">{L('Kovarianz Achsenabschnitt und Steigung', 'Covariance intercept and slope')}</th><td style="text-align:end">{z(erg.e.kov.est)}</td><td style="text-align:end">{z(erg.e.kov.se)}</td><td style="text-align:end">{pw(erg.e.kov.p)}</td></tr>
        </tbody>
      </table></div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Beobachtete und vom Modell erwartete Mittelwerte je Zeitpunkt', 'Observed and model-expected means per time point')}</b></caption>
        <thead><tr><th scope="col">{L('Zeitpunkt', 'Time point')}</th><th scope="col">{L('Zeitwert', 'Time value')}</th><th scope="col">{L('Beobachtet', 'Observed')}</th><th scope="col">{L('Modell', 'Model')}</th><th scope="col">{L('Restvarianz', 'Residual variance')}</th></tr></thead>
        <tbody>{#each erg.spalten as sp, i (sp)}<tr><th scope="row" style="text-align: start">{nm(sp)}</th><td style="text-align:end">{z(erg.zeit[i], 2)}</td><td style="text-align:end">{z(erg.e.beobMittel[i])}</td><td style="text-align:end">{z(erg.e.modellMittel[i])}</td><td style="text-align:end">{z(erg.e.restVarianz[i])}</td></tr>{/each}</tbody>
      </table></div>
      {#each erg.e.warnungen.slice(0, 3) as w (w)}<p class="heft-text" style="color:var(--tinte-2)">R: {w}</p>{/each}
      <div class="knopfzeile"><button class="k" type="button" onclick={rSkript}>{L('Als R-Skript mit Daten (.zip)', 'As R script with data (.zip)')}</button></div>
      <p class="heft-text" style="color:var(--tinte-2)">{L('Das Modell nimmt eine gerade Entwicklung an. Passt sie schlecht (Passung, Abstand zwischen beobachteten und erwarteten Mittelwerten), bildet eine Gerade den Verlauf nicht ab; Statable deutet das nicht, die Zahlen zeigen es. Ein Zusammenhang von Achsenabschnitt und Steigung heißt nicht, dass das eine das andere verursacht. Die Richtwerte für die Passung (zum Beispiel CFI ab 0,95, RMSEA bis 0,06) stammen aus Simulationen und sind keine Gesetze.', 'The model assumes a straight development. If it fits badly (fit, gap between observed and expected means), a straight line does not capture the course; Statable does not interpret this, the numbers show it. A relation between intercept and slope does not mean that one causes the other. The guide values for fit (for example CFI from 0.95, RMSEA up to 0.06) come from simulations and are not laws.')}</p>
    {/if}
  </details>
{/if}
