<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { OutputItem } from '../engine/types';
  import { L, d, melde } from '../lib/sitzung.svelte';
  import { sage } from '../lib/ansage';
  import { Laedt } from '../lib/laedt.svelte';
  import { zahlDe } from '../lib/format';
  import { ohneNull } from '../lib/ergebnis';
  import { prognoseRechnen, differenzenRechnen } from '../lib/rverfahren.svelte';
  import {
    GLAETTUNGEN, glaettungName, glaettungGrund, horizontMax, logMoeglich, prognoseAutoErlaubt, prognoseCodeSatz, prognoseLeitplanken, prognoseModellName,
    prognoseRCode, prognoseSperre, prognoseStandardWahl, hatLuecken, pruefzeitraumLuecke, prognoseStellen, prognoseWahlBereinigen, prognoseWahlGrund, pruefzeitraumLaenge, arimaSaisonMoeglich, etsKandidaten,
    type PrognoseKandidat, type PrognoseWahl, type GlaettungArt
  } from '../lib/prognose';
  import { prognoseLogVorschlag, prognoseReihe, prognoseSaetze, prognoseZeiten, type ZeitreiheE, type ZeitreiheAuswertung } from '../lib/zeitreiheblatt';
  import { acfGrenze } from '../lib/zeitreihe';
  import DiagrammExport from './DiagrammExport.svelte';
  import Prognosediagramm from './Prognosediagramm.svelte';
  import Korrelogramm from './Korrelogramm.svelte';
  import { differenzenSaetze, differenzenHilfeSatz, differenzenRCode, type DifferenzenE } from '../lib/zeitreihenabrunden';
  import Ausgabe from './Ausgabe.svelte';
  import Rechnet from './Rechnet.svelte';
  import BlattNeueDaten from './BlattNeueDaten.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * Der Abschnitt „Wie könnte es weitergehen? (Prognose)“ der Zeitreihen-Karte (Fachblatt docs/fachblaetter/PROGNOSE-ARIMA.md, Abschnitt 3).
   * Ohne Klick wird nichts gerechnet. Gesperrt (mit Satz statt Knopf) bei mehr als 10 % Lücken, ungleichen Abständen, unter 20 vorhandenen Werten und wenn alle Werte gleich sind. Mit Lücken bis 10 % geht nur „ARIMA selbst wählen“.
   * Bei „ARIMA selbst wählen“ kann die Person auf Knopfdruck die Differenzen prüfen lassen (Fachblatt ZEITREIHEN-ABRUNDEN, Abschnitt 2); das wählt nichts aus.
   * Ausgabe in dieser Reihenfolge: Prüfliste, Bild, Prognosetabelle, Modell, Automatik, Residuen, Prüfzeitraum. Gespeichert wird Wahl und Antwort am Ergebnis des Blatts (ZeitreiheE.prognose).
   */
  let { e, a, wertText, zeitText, tabellen, speichere, name }: {
    e: ZeitreiheE; a: ZeitreiheAuswertung; wertText: string; zeitText: string; tabellen: OutputItem[]; speichere: (neu: ZeitreiheE) => void; name: (n: string) => string;
  } = $props();
  const ID = 'pg';
  const lad = new Laedt();
  /** Der Fortschrittstext wechselt mit jedem Modell und steht darum nicht in einer Live-Region; angesagt wird nur der Anfang. */
  $effect(() => { if (lad.sichtbar) sage(L('Wird gerechnet …', 'Calculating …')); });
  const reihe = $derived(prognoseReihe(e));
  const sperre = $derived(prognoseSperre(reihe));
  const T = $derived(e.y.length), m = $derived(e.periode);
  const hMax = $derived(horizontMax(T, m));
  const autoErlaubt = $derived(prognoseAutoErlaubt(T));
  const logOk = $derived(logMoeglich(reihe));
  const luecken = $derived(hatLuecken(reihe));
  const vorschlagLog = $derived(prognoseLogVorschlag(a));
  const saisonArima = $derived(arimaSaisonMoeglich(m));
  const startWahl = (): PrognoseWahl => e.prognose?.wahl ?? prognoseStandardWahl(prognoseReihe(e), prognoseLogVorschlag(a));
  let wahl = $state<PrognoseWahl>(startWahl());
  let fehler = $state('');
  /** Fortschritt der Automatik über die Glättung: Modelle fertig / alle Modelle */
  let fertig = $state(0), gesamt = $state(0);

  const setze = (w: Partial<PrognoseWahl>) => { wahl = { ...wahl, ...w }; };
  const zahlWahl = (feld: 'h' | 'p' | 'd' | 'q' | 'P' | 'D' | 'Q', lo: number, hi: number) => (ev: Event & { currentTarget: HTMLInputElement }) => {
    const v = Number(ev.currentTarget.value);
    if (Number.isInteger(v) && v >= lo && v <= hi) setze({ [feld]: v });
    else { ev.currentTarget.value = String(wahl[feld]); melde(L(`Hier gilt eine ganze Zahl von ${lo} bis ${hi}.`, `A whole number from ${lo} to ${hi} applies here.`)); }
  };
  const konstDarf = $derived(wahl.d + wahl.D <= 1);
  const konstWort = $derived(wahl.d + wahl.D === 0 ? L('Mittelwert (Konstante)', 'Mean (constant)') : L('Drift (Konstante)', 'Drift (constant)'));
  const glGrund = $derived(glaettungGrund(wahl.glaettung, reihe));
  /** Vor dem Klick: mit Saison rechnet die Glättungs-Automatik neun Modelle und kann je nach Länge der Reihe rund eine halbe bis zwei Minuten dauern; ohne Saison sind es drei. */
  const etsSaison = $derived(etsKandidaten(m, T, logOk).length > 3);
  const etsAutoHinweis = $derived(etsSaison ? d('Mit Saison kann die Rechnung je nach Länge der Reihe rund eine halbe bis zwei Minuten dauern. Du kannst währenddessen weiterarbeiten.', 'Mit Saison kann die Rechnung je nach Länge der Reihe rund eine halbe bis zwei Minuten dauern. Sie können währenddessen weiterarbeiten.', 'With a season the calculation can take roughly half a minute to two minutes, depending on the length of the series. You can keep working meanwhile.') : L('Die Automatik rechnet drei Modelle ohne Saison; das dauert nur kurz.', 'The automatic selection calculates three models without a season; this takes only a short time.'));

  async function rechnen(w: PrognoseWahl = wahl) {
    const rein = prognoseWahlBereinigen(w, reihe), grund = prognoseWahlGrund(rein, reihe);
    if (grund) { fehler = prognoseCodeSatz(grund); melde(fehler); return; }
    fehler = '';
    const pr = pruefzeitraumLaenge(T, m);
    try {
      const erg = await lad.mit(() => { fertig = 0; gesamt = 0; return prognoseRechnen(e.y, m, rein, pr, (f, g) => { fertig = f; gesamt = g; }); });
      if (!erg) return;
      wahl = rein;
      speichere({ ...e, prognose: { wahl: rein, pr, antwort: erg } });
      melde(L('Die Prognose ist gerechnet.', 'The forecast has been calculated.'));
    } catch (x) { fehler = (x as Error)?.message ?? String(x); melde(fehler); }
  }
  /** „Dieses Modell rechnen“: wechselt nach „ARIMA selbst wählen“ mit der Ordnung der Zeile. */
  function dieses(k: PrognoseKandidat) {
    const pg = e.prognose; if (!pg?.antwort.wahl) return;
    const w: PrognoseWahl = { ...wahl, art: 'arima', p: k.p, d: pg.antwort.wahl.d, q: k.q, P: k.P, D: pg.antwort.wahl.D, Q: k.Q, konst: k.konst, log: pg.wahl.log };
    wahl = w; void rechnen(w);
  }

  const diff = new Laedt();
  let dzFehler = $state('');
  const dz = $derived(e.differenzen);
  /** Differenzen prüfen: rechnet mit der bereinigten Wahl (d, D, Log) und speichert die Antwort am Blatt; wählt nichts aus und ändert die Wahl nicht. */
  async function differenzenPruefen() {
    const rein = prognoseWahlBereinigen(wahl, reihe), grund = prognoseWahlGrund(rein, reihe);
    if (grund) { dzFehler = prognoseCodeSatz(grund); melde(dzFehler); return; }
    dzFehler = '';
    try {
      const erg = await diff.mit(() => differenzenRechnen(e.y, m, rein.log, rein.d, rein.D));
      if (!erg) return;
      speichere({ ...e, differenzen: { d: rein.d, D: rein.D, log: rein.log, periode: m, luecken: luecken, antwort: erg } });
      melde(L('Die Differenzen sind geprüft.', 'The differences have been checked.'));
    } catch (x) { dzFehler = (x as Error)?.message ?? String(x); melde(dzFehler); }
  }
  const pg = $derived(e.prognose);
  const stellen = $derived(prognoseStellen(e.y));
  const zeiten = $derived(pg ? prognoseZeiten(e, pg.antwort.mittel.length) : []);
  const saetze = $derived(pg ? prognoseSaetze(e, name(e.wert)) : null);
  const leit = $derived(pg ? prognoseLeitplanken({ wahl: pg.wahl, antwort: pg.antwort, T, periode: m, alleWerteUeber0: logOk, luecken: e.luecken, pruefLuecke: pg.pr > 0 && pruefzeitraumLuecke(e.y, m, pg.pr) }) : []);
  const nur = (...l: string[]) => tabellen.filter(t => t.type === 'table' && l.includes((t as { label: string }).label));
  const kand = (k: PrognoseKandidat, d: number, D: number) => `${prognoseModellName({ p: k.p, d, q: k.q, P: k.P, D, Q: k.Q, periode: m })}${k.konst ? (d + D === 1 ? L(' mit Drift', ' with drift') : L(' mit Mittelwert', ' with mean')) : ''}`;
  const zahl2 = (v: number) => zahlDe(v, 2);
  const logText = $derived(!logOk ? L('Nicht möglich: Es gibt Werte von 0 oder darunter.', 'Not possible: there are values of 0 or below.')
    : vorschlagLog ? L('Voreingestellt, weil die Zerlegung multiplikativ vorschlägt: Die Schwankung wächst mit dem Niveau.', 'On by default because the decomposition suggests multiplicative: the fluctuation grows with the level.')
      : L('Voreingestellt aus: Die Schwankung wächst nicht deutlich mit dem Niveau. Prognose und Grenzen werden zurückgerechnet; die Prognose ist dann ein Median.', 'Off by default: the fluctuation does not clearly grow with the level. Forecast and limits are back-transformed; the forecast is then a median.'));
</script>

<h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Wie könnte es weitergehen? (Prognose)', 'What might happen next? (forecast)')}</h3>

{#if sperre}
  <p class="hilfe" use:ergebnisAnsage>{prognoseCodeSatz(sperre)}</p>
{:else}
  <p class="hilfe">{d('Eine Prognose schreibt die Vergangenheit fort. Es wird erst gerechnet, wenn du auf den Knopf klickst.', 'Eine Prognose schreibt die Vergangenheit fort. Es wird erst gerechnet, wenn Sie auf den Knopf klicken.', 'A forecast extends the past. Nothing is calculated until you click the button.')}</p>
  <div class="korr-wahl" style="margin-top:var(--a3)">
    <fieldset class="zusatz-gruppe">
      <legend>{L('Art der Prognose', 'Type of forecast')}</legend>
      <div class="segment">{#each [['auto', L('Automatisch (Statable schlägt ein Modell vor)', 'Automatic (Statable suggests a model)')], ['ets-auto', L('Automatisch über die Glättung', 'Automatic through smoothing')], ['arima', L('ARIMA selbst wählen', 'Choose ARIMA yourself')], ['glaettung', L('Exponentielle Glättung', 'Exponential smoothing')]] as [w, tx] (w)}
        <label data-begriff={w === 'arima' ? 'arima' : w === 'auto' ? undefined : 'exponentielle-glaettung'}><input type="radio" name="{ID}-art" value={w} checked={wahl.art === w} disabled={(w === 'auto' && !autoErlaubt) || (w !== 'arima' && luecken)} onchange={() => setze({ art: w as PrognoseWahl['art'] })}>{tx}</label>{/each}</div>
      {#if !autoErlaubt}<p class="hilfe" style="margin-top:var(--a2)">{prognoseCodeSatz('auto-zu-lang')}</p>{/if}
      {#if wahl.art === 'ets-auto'}<p class="hilfe" style="margin-top:var(--a2)">{etsAutoHinweis}</p>{/if}
      {#if luecken}<p class="hilfe" style="margin-top:var(--a2)">{prognoseCodeSatz('luecken-nur-selbst')}</p>{/if}
    </fieldset>

    <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
      <legend>{L('Horizont', 'Horizon')}</legend>
      <div class="eingabe" style="max-width:260px"><label for="{ID}-h">{L('Zahl der Zeitpunkte nach dem letzten Wert', 'Number of points in time after the last value')}</label>
        <input id="{ID}-h" type="number" min="1" max={hMax} step="1" value={wahl.h} aria-describedby="{ID}-h-h" onchange={zahlWahl('h', 1, hMax)}>
        <p id="{ID}-h-h" class="hilfe">{L(`Höchstens ${hMax}: bei Saison zwei Perioden, sonst ein Viertel der Reihe. Je weiter voraus, desto breiter das Band.`, `At most ${hMax}: two periods with a season, otherwise a quarter of the series. The further ahead, the wider the band.`)}</p></div>
    </fieldset>

    {#if wahl.art === 'auto' || wahl.art === 'arima'}
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
        <legend>{L('Skala', 'Scale')}</legend>
        <label class="schalter"><input type="checkbox" checked={wahl.log && logOk} disabled={!logOk} aria-describedby="{ID}-log-h" onchange={(ev) => setze({ log: ev.currentTarget.checked })}>{L('Log-Skala', 'Log scale')}</label>
        <p id="{ID}-log-h" class="hilfe" style="margin-top:var(--a2)">{logText}</p>
      </fieldset>
    {/if}

    {#if wahl.art === 'arima'}
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
        <legend>{L('Ordnung des Modells', 'Order of the model')}</legend>
        <div style="display:flex;flex-wrap:wrap;gap:var(--a3)">
          {#each [['p', L('p (Anteil der Vergangenheit)', 'p (autoregressive part)'), 0, 5], ['d', L('d (Differenzen)', 'd (differences)'), 0, 2], ['q', L('q (gleitender Durchschnitt)', 'q (moving-average part)'), 0, 5]] as [f, tx, lo, hi] (f)}
            <div class="eingabe" style="max-width:150px"><label for="{ID}-{f}">{tx}</label><input id="{ID}-{f}" type="number" min={lo} max={hi} step="1" value={wahl[f as 'p' | 'd' | 'q']} onchange={zahlWahl(f as 'p' | 'd' | 'q', lo as number, hi as number)}></div>
          {/each}
        </div>
        {#if saisonArima}
          <div style="display:flex;flex-wrap:wrap;gap:var(--a3);margin-top:var(--a3)">
            {#each [['P', L('P (saisonal)', 'P (seasonal)'), 0, 5], ['D', L('D (saisonale Differenzen)', 'D (seasonal differences)'), 0, 1], ['Q', L('Q (saisonal)', 'Q (seasonal)'), 0, 5]] as [f, tx, lo, hi] (f)}
              <div class="eingabe" style="max-width:150px"><label for="{ID}-{f}">{tx}</label><input id="{ID}-{f}" type="number" min={lo} max={hi} step="1" value={wahl[f as 'P' | 'D' | 'Q']} onchange={zahlWahl(f as 'P' | 'D' | 'Q', lo as number, hi as number)}></div>
            {/each}
          </div>
        {:else}<p class="hilfe" style="margin-top:var(--a2)">{L('Der Saisonteil (P, D, Q) geht nur bei einer Periode von 2 bis 24.', 'The seasonal part (P, D, Q) works only with a period of 2 to 24.')}</p>{/if}
        <label class="schalter" style="margin-top:var(--a3)"><input type="checkbox" checked={wahl.konst && konstDarf} disabled={!konstDarf} aria-describedby="{ID}-k-h" onchange={(ev) => setze({ konst: ev.currentTarget.checked })}>{konstWort}</label>
        <p id="{ID}-k-h" class="hilfe" style="margin-top:var(--a2)">{konstDarf ? L('Bei d + D = 0 ist es der Mittelwert, bei d + D = 1 eine Drift (gleichmäßiger Anstieg).', 'With d + D = 0 it is the mean, with d + D = 1 a drift (steady rise).') : L('Bei d + D über 1 gibt es keine Konstante.', 'With d + D above 1 there is no constant.')}</p>
      </fieldset>
    {:else if wahl.art === 'glaettung'}
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
        <legend>{L('Glättung', 'Smoothing')}</legend>
        <div class="eingabe" style="max-width:340px"><label for="{ID}-gl">{L('Verfahren', 'Method')}</label>
          <select data-begriff="exponentielle-glaettung" id="{ID}-gl" aria-describedby="{ID}-gl-h" onchange={(ev) => setze({ glaettung: ev.currentTarget.value as GlaettungArt })}>
            {#each GLAETTUNGEN as g (g)}<option value={g} selected={wahl.glaettung === g} disabled={glaettungGrund(g, reihe) !== null}>{glaettungName(g)}</option>{/each}
          </select>
          <p id="{ID}-gl-h" class="hilfe">{glGrund ? prognoseCodeSatz(glGrund) : L('Mit Saison nur bei einer Periode ab 2 und mindestens zwei Perioden plus einem Wert.', 'With a season only with a period of 2 or more and at least two periods plus one value.')}</p></div>
      </fieldset>
    {/if}

    {#if wahl.art === 'arima'}
      <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
        <legend>{L('Differenzen prüfen', 'Check the differences')}</legend>
        <p class="hilfe">{differenzenHilfeSatz()}</p>
        <div class="knopfzeile" style="margin-top:var(--a2)">
          <button class="k" type="button" disabled={diff.sichtbar || lad.aktiv} aria-disabled={diff.aktiv ? 'true' : undefined} onclick={differenzenPruefen}>{#if diff.sichtbar}<Rechnet imKnopf />{/if}{dz ? L('Differenzen neu prüfen', 'Check the differences again') : L('Differenzen prüfen', 'Check the differences')}</button>
        </div>
        {#if diff.sichtbar}<p class="hilfe" role="status" style="margin-top:var(--a2)"><Rechnet text={L('Die Differenzen werden geprüft …', 'The differences are being checked …')} /></p>{/if}
        {#if dzFehler}<p class="hilfe" role="alert" style="margin-top:var(--a2)">{dzFehler}</p>{/if}
      </fieldset>
    {/if}

    <div class="knopfzeile" style="margin-top:var(--a3)">
      <button class="k haupt" type="button" disabled={lad.sichtbar} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={() => rechnen()}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{pg ? L('Prognose neu rechnen', 'Recalculate forecast') : L('Prognose rechnen', 'Calculate forecast')}</button>
    </div>
    {#if lad.sichtbar}<p class="hilfe" style="margin-top:var(--a2)"><Rechnet text={gesamt > 0 ? L(`${fertig} von ${gesamt} Modellen gerechnet …`, `${fertig} of ${gesamt} models calculated …`) : L('Die Prognose wird gerechnet …', 'The forecast is being calculated …')} />{#if gesamt > 0} <progress value={fertig / gesamt} max="1" aria-label={L('Fortschritt', 'Progress')} style="vertical-align:middle;width:8rem"></progress>{/if}</p>{/if}
    {#if fehler}<p class="hilfe" role="alert" style="margin-top:var(--a2)">{fehler}</p>{/if}
  </div>
{/if}

{#if dz}
  <h4 style="font-size:var(--s-klein,.9rem);margin:var(--a4) 0 var(--a2)">{L('Differenzen prüfen', 'Check the differences')}</h4>
  <ul class="hilfe" style="margin:0 0 var(--a3);padding-inline-start:1.2em">{#each differenzenSaetze(dz) as s (s.code)}<li>{s.satz}</li>{/each}</ul>
  <Ausgabe items={nur('Differenzen')} nurTabellen />
  <DiagrammExport titel={`${L('Korrelogramm der differenzierten Reihe', 'Correlogram of the differenced series')}: ${wertText}`}>
    <Korrelogramm r={dz.antwort.acf} grenze={dz.antwort.grenze} periode={m} n={dz.antwort.n} titel={L(`Autokorrelation von ${wertText} bei d = ${dz.d}, D = ${dz.D}`, `Autocorrelation of ${wertText} at d = ${dz.d}, D = ${dz.D}`)} />
  </DiagrammExport>
  {#if dz.antwort.pacf}
    <DiagrammExport titel={`${L('Partielles Korrelogramm der differenzierten Reihe', 'Partial correlogram of the differenced series')}: ${wertText}`}>
      <Korrelogramm r={dz.antwort.pacf} grenze={dz.antwort.grenze} periode={m} n={dz.antwort.n} partiell titel={L(`Partielle Autokorrelation von ${wertText} bei d = ${dz.d}, D = ${dz.D}`, `Partial autocorrelation of ${wertText} at d = ${dz.d}, D = ${dz.D}`)} />
    </DiagrammExport>
  {:else}
    <p class="hilfe">{L('Die vorhandenen Paare passen nicht zusammen; die partielle Autokorrelation wird nicht gezeigt.', 'The available pairs do not fit together; the partial autocorrelation is not shown.')}</p>
  {/if}
  <Ausgabe items={nur('Differenzen-Korrelogramm')} nurTabellen />
  <details class="auf" style="margin-top:var(--a3)"><summary>{L('Befehl (R)', 'Command (R)')}</summary><pre class="befehl">{differenzenRCode(dz, e.wert)}</pre></details>
{/if}

{#if pg && saetze}
  <h4 style="font-size:var(--s-klein,.9rem);margin:var(--a4) 0 var(--a2)">{L('Prüfliste', 'Checklist')}</h4>
  <ul class="hilfe" style="margin:0 0 var(--a3);padding-inline-start:1.2em">{#each leit as l (l.code)}<li>{l.satz}</li>{/each}</ul>
  <p>{saetze.haupt}</p>
  <DiagrammExport titel={`${L('Prognose', 'Forecast')}: ${wertText}`}><Prognosediagramm {e} p={pg} {wertText} {zeitText} {zeiten} {stellen} /></DiagrammExport>
  <Ausgabe items={nur('Prognose')} nurTabellen />
  <Ausgabe items={nur('Prognosemodell', 'Prognose-Gütemaße')} nurTabellen />
  {#if pg.antwort.wahlEts}<Ausgabe items={nur('Prognose-Automatik')} nurTabellen />{/if}

  {#if pg.antwort.wahl}
    {@const w = pg.antwort.wahl}
    <div style="overflow-x:auto"><table class="apa" style="margin-top:var(--a3)"><caption><b>{L('Automatische Modellwahl: die besten fünf Modelle', 'Automatic model selection: the best five models')}</b><i>{L(`Differenzen: d = ${w.d} (KPSS ${ohneNull(w.kpss, 3)}, Grenze ${ohneNull(0.463, 3)})${w.staerke !== null ? `, D = ${w.D} (Saisonstärke ${ohneNull(w.staerke, 3)}, Grenze ${ohneNull(0.64, 2)})` : ''}. ${w.geprueft} Modelle geprüft.`, `Differences: d = ${w.d} (KPSS ${ohneNull(w.kpss, 3)}, limit ${ohneNull(0.463, 3)})${w.staerke !== null ? `, D = ${w.D} (seasonal strength ${ohneNull(w.staerke, 3)}, limit ${ohneNull(0.64, 2)})` : ''}. ${w.geprueft} models checked.`)}</i></caption>
      <thead><tr><th scope="col">{L('Modell', 'Model')}</th><th scope="col">AICc</th><th scope="col">ΔAICc</th><th scope="col"><span class="nur-vorleser">{L('Aktion', 'Action')}</span></th></tr></thead>
      <tbody>{#each w.liste as k, i (i)}<tr><th scope="row">{kand(k, w.d, w.D)}</th><td>{zahl2(k.aicc)}</td><td>{zahl2(k.aicc - w.liste[0]!.aicc)}</td>
        <td><button class="k" type="button" disabled={lad.aktiv} onclick={() => dieses(k)} aria-label={L(`Dieses Modell rechnen: ${kand(k, w.d, w.D)}`, `Calculate this model: ${kand(k, w.d, w.D)}`)}>{L('Dieses Modell rechnen', 'Calculate this model')}</button></td></tr>{/each}</tbody></table></div>
  {/if}

  {#if pg.antwort.acfRes.length}
    <h4 style="font-size:var(--s-klein,.9rem);margin:var(--a4) 0 var(--a2)">{L('Residuen', 'Residuals')}</h4>
    <DiagrammExport titel={`${L('Korrelogramm der Residuen', 'Correlogram of the residuals')}: ${wertText}`}>
      <Korrelogramm r={pg.antwort.acfRes} grenze={acfGrenze(T)} periode={pg.antwort.periode} n={T} titel={L(`Autokorrelation der Residuen der Prognose von ${wertText}`, `Autocorrelation of the residuals of the forecast of ${wertText}`)} />
    </DiagrammExport>
    {#if saetze.ljung}<p class="hilfe" style="margin-top:var(--a2)">{saetze.ljung}</p>{/if}
  {/if}

  {#if pg.antwort.pruef}
    <Ausgabe items={nur('Prognose-Prüfzeitraum')} nurTabellen />
  {/if}

  <details class="auf" style="margin-top:var(--a3)"><summary>{L('Befehl (R)', 'Command (R)')}</summary><pre class="befehl">{prognoseRCode(pg, e.wert, T, e.luecken)}</pre></details>

  {#if pg.antwort.art === 'arima'}<BlattNeueDaten {e} {pg} {name} {tabellen} {speichere} />{/if}
{/if}
<p class="hilfe" style="margin-top:var(--a3)"><HilfeLink id="zeitreihe-prognose" text={L('Hilfe: Prognose lesen und berichten', 'Help: reading and reporting a forecast')} /></p>
