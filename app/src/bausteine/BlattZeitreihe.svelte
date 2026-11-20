<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { OutputItem } from '../engine/types';
  import { L, d, melde, sichern, type Blatt } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import {
    zeitreiheErgebnis, zeitreiheAuswertung, fensterStandard, positionIso, zeitLabel, type ZeitreiheE
  } from '../lib/zeitreiheblatt';
  import { zeitreiheCodeSatz, rasterWort } from '../lib/zeitreihesaetze';
  import type { Raster } from '../lib/zeitreihe';
  import DiagrammExport from './DiagrammExport.svelte';
  import Zeitreihendiagramm from './Zeitreihendiagramm.svelte';
  import Korrelogramm from './Korrelogramm.svelte';
  import Kreuzkorrelogramm from './Kreuzkorrelogramm.svelte';
  import { ccfHilfeText, ccfCodeSatz } from '../lib/zeitreiheccf';
  import Zerlegungsdiagramm from './Zerlegungsdiagramm.svelte';
  import Ausgabe from './Ausgabe.svelte';
  import BlattPrognose from './BlattPrognose.svelte';
  import BlattPeriodogramm from './BlattPeriodogramm.svelte';
  import BlattSaison from './BlattSaison.svelte';
  import { saisonVerweisSatz } from '../lib/saisoncode';
  import BlattMassnahme from './BlattMassnahme.svelte';
  import BlattGranger from './BlattGranger.svelte';
  import BlattAuffaelligeWerte from './BlattAuffaelligeWerte.svelte';
  import { AUSREISSER_LABELS } from '../lib/ausreisserzeit';
  import BlattMehrere from './BlattMehrere.svelte';
  import { MASSNAHME_LABELS } from '../lib/massnahme';
  import { GRANGER_LABELS } from '../lib/granger';
  import { NEU_LABELS } from '../lib/modellneu';
  import { MEHRERE_LABELS } from '../lib/mehrere';
  import { PROGNOSE_LABELS } from '../lib/prognoseblatt';
  import { DIFFERENZEN_LABELS, PERIODOGRAMM_LABELS } from '../lib/zeitreihenabrunden';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * Das Ergebnis der Zeitreihen-Karte am Blatt (Später S-E, L7): Verlaufsbild mit gleitendem Mittelwert und Trend, Korrelogramm, klassische Zerlegung und die Wahlen dazu.
   * Alles rechnet in JavaScript aus der gespeicherten Reihe; eine Wahl schreibt das Ergebnis des Blatts neu (kein Neurechnen mit R, nichts wird aufgefüllt).
   */
  let { blatt, e, name, tabellen }: { blatt: Blatt; e: ZeitreiheE; name: (n: string) => string; tabellen: OutputItem[] } = $props();
  const a = $derived(zeitreiheAuswertung(e));
  const wertText = $derived(name(e.wert)), zeitText = $derived(e.datum ? name(e.datum) : L('Reihenfolge der Zeilen', 'Row order'));
  let trendAn = $state(true);
  const ID = 'zr';
  const RASTER: Raster[] = ['monatlich', 'vierteljaehrlich', 'jaehrlich', 'woechentlich', 'taeglich', 'ungleich'];

  function speichere(neu: ZeitreiheE) { blatt.ergebnis = { typ: 'zeitreihen', e: neu }; void sichern(); }
  const wahl = (w: Partial<Pick<ZeitreiheE, 'fenster' | 'art' | 'acfQuelle'>>) => speichere({ ...e, ...w });
  /** Anderes Raster oder andere Periode: die Reihe wird aus den Daten neu aufgebaut. `raster: null` = wieder das erkannte. Gibt an, ob es geklappt hat. */
  function neuAufbauen(o: { raster?: Raster | null; periode?: number }): boolean {
    const raster = 'raster' in o ? o.raster ?? null : (e.rasterGewaehlt ? e.raster : null), periode = o.periode ?? (e.raster === 'zeilen' ? e.periode : null);
    const r = zeitreiheErgebnis(e.wert, e.datum, { raster, periode, fenster: e.fenster, art: e.art, acfQuelle: e.acfQuelle });
    if (!r.ok) { melde(zeitreiheCodeSatz(r.code, { ausgeschlossen: r.ausgeschlossen, n: e.n })); return false; }
    speichere({ ...r.e, fenster: e.fenster > 0 ? Math.min(e.fenster, Math.max(1, Math.floor(r.e.y.length / 2))) : 0 });   // die Prognose gehört zur alten Reihe und fällt weg
    melde(e.prognose ? d('Die Reihe ist neu aufgebaut. Die Prognose gehört zur alten Reihe und ist weggefallen; rechne sie neu.', 'Die Reihe ist neu aufgebaut. Die Prognose gehört zur alten Reihe und ist weggefallen; rechnen Sie sie neu.', 'The series has been rebuilt. The forecast belonged to the old series and has been dropped; calculate it again.') : L('Die Reihe ist neu aufgebaut.', 'The series has been rebuilt.'));
    return true;
  }
  const fensterGueltig = (k: number) => Number.isInteger(k) && k >= 1 && k <= Math.max(1, Math.floor(e.y.length / 2));
  const lang = $derived(e.y.length > 400);
  /** Die Tabelle der Werte (bildschirmlesbar): bis 400 Plätze alle, sonst Anfang und Ende. */
  const tabellenZeilen = $derived((() => {
    const ix = e.y.map((_, i) => i);
    return lang ? [...ix.slice(0, 40), -1, ...ix.slice(-40)] : ix;
  })());
  const zahl = (v: number | null) => (v === null ? L('Lücke', 'gap') : zahlDe(v, 2));
  const art = $derived(a.zer?.art);
  const pacf = $derived((e.acfQuelle === 'reihe' ? a.pacfReihe : a.pacfResid));
  const vorschlagText = $derived(a.zer ? (a.zer.vorschlag.art === 'multiplikativ'
    ? L(`Statable schlägt multiplikativ vor: Die Spannweite je Periode wächst mit dem Niveau (r = ${zahlDe(a.zer.vorschlag.r, 2)}).`, `Statable suggests multiplicative: the range per period grows with the level (r = ${zahlDe(a.zer.vorschlag.r, 2)}).`)
    : L(`Statable schlägt additiv vor: Die Schwankung wächst nicht deutlich mit dem Niveau (r = ${zahlDe(a.zer.vorschlag.r, 2)}).`, `Statable suggests additive: the fluctuation does not clearly grow with the level (r = ${zahlDe(a.zer.vorschlag.r, 2)}).`)) : '');
</script>

{#if a.trend || a.gleitend}
  <DiagrammExport titel={`${L('Verlauf', 'Course')}: ${wertText}`}><Zeitreihendiagramm {e} {a} {wertText} {zeitText} gleitend={e.fenster > 0} trend={trendAn && !!a.trend} /></DiagrammExport>
{/if}

<div class="korr-wahl" style="margin-top:var(--a3)">
  <fieldset class="zusatz-gruppe">
    <legend>{L('Im Bild', 'In the chart')}</legend>
    <label data-begriff="gleitender-durchschnitt" class="schalter"><input type="checkbox" checked={e.fenster > 0} onchange={(ev) => wahl({ fenster: ev.currentTarget.checked ? fensterStandard(e.periode) : 0 })}>{L('Gleitender Mittelwert', 'Moving average')}</label>
    {#if e.fenster > 0}
      <div class="eingabe" style="max-width:260px;margin-top:var(--a2)"><label for="{ID}-fenster">{L('Fenster (Zahl der Werte)', 'Window (number of values)')}</label>
        <input id="{ID}-fenster" type="number" min="1" max={Math.max(1, Math.floor(e.y.length / 2))} step="1" value={e.fenster} aria-describedby="{ID}-fenster-h"
          onchange={(ev) => { const k = Number(ev.currentTarget.value); if (fensterGueltig(k)) wahl({ fenster: k }); else { ev.currentTarget.value = String(e.fenster); melde(L('Das Fenster muss eine ganze Zahl sein, höchstens halb so groß wie die Reihe.', 'The window must be a whole number, at most half the length of the series.')); } }}>
        <p id="{ID}-fenster-h" class="hilfe">{L('Gerade Fenster werden als 2 × k-Mittel gerechnet (Randgewichte ½, wie in R). An den Rändern gibt es keine Werte; nichts wird aufgefüllt.', 'Even windows are calculated as a 2 × k mean (edge weights ½, as in R). There are no values at the margins; nothing is filled in.')}</p></div>
    {/if}
    <br><label data-begriff="trend" class="schalter" style="margin-top:var(--a2)"><input type="checkbox" bind:checked={trendAn} disabled={!a.trend}>{L('Trendgerade mit 95-%-Band', 'Trend line with a 95% band')}</label>
  </fieldset>

  {#if e.datum}
    <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
      <legend>{L('Zeitraster', 'Time grid')}</legend>
      <div class="eingabe" style="max-width:340px"><label for="{ID}-raster">{L('Abstand der Zeitpunkte', 'Interval between the points in time')}</label>
        <select id="{ID}-raster" aria-describedby="{ID}-raster-h" onchange={(ev) => { const w = ev.currentTarget.value as Raster; if (!neuAufbauen({ raster: w === e.rasterAuto ? null : w })) ev.currentTarget.value = e.raster; }}>
          {#each RASTER as r (r)}<option value={r} selected={e.raster === r}>{rasterWort(r)}{r === e.rasterAuto ? ` (${L('erkannt', 'recognized')})` : ''}</option>{/each}
        </select>
        <p id="{ID}-raster-h" class="hilfe">{L(`Statable hat aus den Abständen „${rasterWort(e.rasterAuto)}“ erkannt. Ein anderes Raster ist nur möglich, wenn es zu den Zeitpunkten passt.`, `Statable recognized "${rasterWort(e.rasterAuto)}" from the intervals. Another grid is only possible if it fits the points in time.`)}</p></div>
    </fieldset>
  {:else}
    <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
      <legend>{L('Periode', 'Period')}</legend>
      <div class="eingabe" style="max-width:260px"><label for="{ID}-periode">{L('Länge einer Saison (Zahl der Zeilen)', 'Length of a season (number of rows)')}</label>
        <input id="{ID}-periode" type="number" min="1" max={Math.max(1, Math.floor(e.y.length / 2))} step="1" value={e.periode} aria-describedby="{ID}-periode-h"
          onchange={(ev) => { const p = Number(ev.currentTarget.value); if (!neuAufbauen({ periode: p })) ev.currentTarget.value = String(e.periode); }}>
        <p id="{ID}-periode-h" class="hilfe">{L('1 heißt: keine Saison. 12 für Monate, 4 für Quartale, 7 für Wochentage. Das ist eine Angabe der Person; Statable setzt gleiche Abstände zwischen den Zeilen voraus.', '1 means: no season. 12 for months, 4 for quarters, 7 for weekdays. This is the person\'s statement; Statable assumes equal intervals between the rows.')}</p></div>
    </fieldset>
  {/if}
</div>

{#if a.acfReihe && a.acfResid && a.grenze !== null}
  <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Hängen aufeinanderfolgende Werte voneinander ab?', 'Do successive values depend on each other?')}</h3>
  <div class="korr-wahl" role="radiogroup" aria-labelledby="{ID}-acf-t" style="margin-bottom:var(--a2)">
    <span id="{ID}-acf-t" class="nur-vorleser">{L('Korrelogramm von', 'Correlogram of')}</span>
    <div class="segment">{#each [['residuen', L('Residuen des Trends', 'Residuals of the trend')], ['reihe', L('Reihe selbst', 'The series itself')]] as [w, tx]}<label><input type="radio" name="{ID}-acf" value={w} checked={e.acfQuelle === w} onchange={() => wahl({ acfQuelle: w as 'residuen' | 'reihe' })}>{tx}</label>{/each}</div>
  </div>
  <DiagrammExport titel={`${L('Korrelogramm', 'Correlogram')}: ${wertText}`}>
    <Korrelogramm r={(e.acfQuelle === 'reihe' ? a.acfReihe : a.acfResid).slice(0, a.lagMax)} grenze={a.grenze} periode={e.periode} n={a.n}
      titel={e.acfQuelle === 'reihe' ? L(`Autokorrelation von ${wertText}`, `Autocorrelation of ${wertText}`) : L(`Autokorrelation der Residuen des Trends von ${wertText}`, `Autocorrelation of the residuals of the trend of ${wertText}`)} />
  </DiagrammExport>
  <p class="hilfe" style="margin-top:var(--a2)">{L('Die Grenzlinien gelten für jeden Stab einzeln: Bei vielen Verzögerungen liegt allein durch Zufall ab und zu ein Stab außerhalb. Der Ljung-Box-Test prüft alle gemeinsam.', 'The limit lines apply to each bar individually: with many lags, a bar will now and then lie outside by chance alone. The Ljung-Box test checks all together.')}</p>
  {#if pacf}
    <DiagrammExport titel={`${L('Partielles Korrelogramm', 'Partial correlogram')}: ${wertText}`}>
      <Korrelogramm r={pacf} grenze={a.grenze} periode={e.periode} n={a.n} partiell
        titel={e.acfQuelle === 'reihe' ? L(`Partielle Autokorrelation von ${wertText}`, `Partial autocorrelation of ${wertText}`) : L(`Partielle Autokorrelation der Residuen des Trends von ${wertText}`, `Partial autocorrelation of the residuals of the trend of ${wertText}`)} />
    </DiagrammExport>
    <p class="hilfe" style="margin-top:var(--a2)">{L('Die PACF zeigt den Zusammenhang bei einer Verzögerung, nachdem die kürzeren herausgerechnet sind. Ein Muster gibt einen Hinweis auf p, die ACF auf q; beides ist ein Hinweis, kein Beweis.', 'The PACF shows the relationship at one lag after the shorter ones have been removed. A pattern gives a hint about p, the ACF about q; both are a hint, not proof.')}</p>
  {:else}
    <p class="hilfe" style="margin-top:var(--a2)">{L('Die vorhandenen Paare passen nicht zusammen; die partielle Autokorrelation wird nicht gezeigt.', 'The available pairs do not fit together; the partial autocorrelation is not shown.')}</p>
  {/if}
{/if}

{#if e.zweite && a.kreuz}
  <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Läuft eine Reihe der anderen voraus? (Kreuzkorrelation)', 'Does one series lead the other? (cross-correlation)')}</h3>
  {#if a.kreuz.ccf}
    <DiagrammExport titel={`${L('Kreuzkorrelation', 'Cross-correlation')}: ${wertText} / ${name(e.zweite)}`}>
      <Kreuzkorrelogramm e={a.kreuz.ccf} namen={[wertText, name(e.zweite)]} periode={e.periode} titel={L(`Kreuzkorrelation von ${wertText} und ${name(e.zweite)}`, `Cross-correlation of ${wertText} and ${name(e.zweite)}`)} />
    </DiagrammExport>
    <p class="hilfe" style="margin-top:var(--a2)">{ccfHilfeText()}</p>
    {#if a.kreuz.hinweis}<p class="hilfe">{L('Beide Reihen oder eine von ihnen hängen stark von der eigenen Vergangenheit ab. Das macht Ausschläge außerhalb der Grenzen häufiger, als der Zufall allein erwarten lässt.', 'Both series or one of them depend strongly on their own past. That makes bars outside the limits more frequent than chance alone would suggest.')} <a href="#bearbeiten/zeitreihe">{L('Assistent „Verschieben und glätten“: Veränderungen statt Werte', 'Assistant "Shift and smooth": changes instead of values')}</a></p>{/if}
  {:else if !a.kreuz.kann.ok}
    <p class="hilfe" use:ergebnisAnsage>{ccfCodeSatz(a.kreuz.kann.code)}</p>
  {/if}
  <p class="hilfe"><HilfeLink id="zeitreihe-kreuzkorrelation" text={L('Hilfe: Kreuzkorrelation lesen', 'Help: reading a cross-correlation')} /></p>
  <BlattGranger {e} {name} {speichere} tabellen={tabellen.filter(t => t.type === 'table' && GRANGER_LABELS.includes(t.label))} />
{/if}

{#if a.zer}
  <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Trend, Saison und Rest', 'Trend, season and remainder')}</h3>
  {#if a.kann.multiplikativ}
    <div class="korr-wahl" role="radiogroup" aria-labelledby="{ID}-art-t" style="margin-bottom:var(--a2)">
      <span id="{ID}-art-t" class="nur-vorleser">{L('Art der Zerlegung', 'Type of decomposition')}</span>
      <div class="segment">{#each [['additiv', L('Additiv (Saison als Abweichung)', 'Additive (season as deviation)')], ['multiplikativ', L('Multiplikativ (Saison als Faktor)', 'Multiplicative (season as factor)')]] as [w, tx]}<label><input type="radio" name="{ID}-art" value={w} checked={art === w} onchange={() => wahl({ art: w as 'additiv' | 'multiplikativ' })}>{tx}</label>{/each}</div>
      <p class="hilfe" style="margin-top:var(--a2)">{vorschlagText}</p>
    </div>
  {:else if a.kann.gruende.multiplikativ}
    <p class="hilfe">{zeitreiheCodeSatz('nicht-positiv')}</p>
  {/if}
  <p class="hilfe">{saisonVerweisSatz()}</p>
  <DiagrammExport titel={`${L('Zerlegung', 'Decomposition')}: ${wertText}`}><Zerlegungsdiagramm {e} {a} {wertText} /></DiagrammExport>
{/if}

<BlattSaison {e} />

<BlattPeriodogramm {e} {wertText} {speichere} tabellen={tabellen.filter(t => t.type === 'table' && PERIODOGRAMM_LABELS.includes(t.label))} />

<BlattPrognose {e} {a} {wertText} {zeitText} {name} {speichere} tabellen={tabellen.filter(t => t.type === 'table' && (PROGNOSE_LABELS.includes(t.label) || DIFFERENZEN_LABELS.includes(t.label) || NEU_LABELS.includes(t.label)))} />

<BlattMehrere {blatt} {e} {name} {speichere} tabellen={tabellen.filter(t => t.type === 'table' && MEHRERE_LABELS.includes(t.label))} />

<BlattMassnahme {e} {wertText} {zeitText} {name} {speichere} tabellen={tabellen.filter(t => t.type === 'table' && MASSNAHME_LABELS.includes(t.label))} />

<BlattAuffaelligeWerte {e} {a} {wertText} {zeitText} {name} {speichere} tabellen={tabellen.filter(t => t.type === 'table' && AUSREISSER_LABELS.includes(t.label))} />

<Ausgabe items={tabellen.filter(t => !(t.type === 'table' && (AUSREISSER_LABELS.includes(t.label) || PROGNOSE_LABELS.includes(t.label) || PERIODOGRAMM_LABELS.includes(t.label) || DIFFERENZEN_LABELS.includes(t.label) || MASSNAHME_LABELS.includes(t.label) || GRANGER_LABELS.includes(t.label) || NEU_LABELS.includes(t.label) || MEHRERE_LABELS.includes(t.label))))} nurTabellen />

<details class="auf" style="margin-top:var(--a4)"><summary>{L('Werte als Tabelle', 'Values as a table')}</summary>
  <div style="overflow-x:auto"><table class="apa" style="margin-top:var(--a2)"><caption><b>{L(`Werte von ${wertText}`, `Values of ${wertText}`)}</b>{#if lang}<i>{L('Anfang und Ende; die Reihe hat mehr als 400 Plätze.', 'Start and end; the series has more than 400 places.')}</i>{/if}</caption>
    <thead><tr><th scope="col">{L('Zeitpunkt', 'Point in time')}</th><th scope="col">{L('Wert', 'Value')}</th>{#if a.gleitend}<th scope="col">{L('Gleitender Mittelwert', 'Moving average')}</th>{/if}</tr></thead>
    <tbody>{#each tabellenZeilen as i (i)}{#if i < 0}<tr><td colspan={a.gleitend ? 3 : 2}>…</td></tr>{:else}<tr><th scope="row">{e.raster === 'zeilen' ? e.t[i] : zeitLabel(positionIso(e, e.t[i]!), e.raster === 'ungleich' || e.raster === 'woechentlich' || e.raster === 'taeglich' ? 'taeglich' : e.raster)}</th><td>{zahl(e.y[i] ?? null)}</td>{#if a.gleitend}<td>{a.gleitend[i] === null || a.gleitend[i] === undefined ? '-' : zahlDe(a.gleitend[i]!, 2)}</td>{/if}</tr>{/if}{/each}</tbody></table></div>
</details>
<p class="hilfe" style="margin-top:var(--a3)"><HilfeLink id="frage-zeitreihen" text={L('Hilfe: Zeitreihe lesen und berichten', 'Help: reading and reporting a time series')} /></p>
