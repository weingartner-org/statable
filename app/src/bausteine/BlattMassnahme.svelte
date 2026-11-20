<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { OutputItem } from '../engine/types';
  import { L, melde } from '../lib/sitzung.svelte';
  import { Laedt } from '../lib/laedt.svelte';
  import { massnahmeRechnen, massnahmeVorschlagRechnen } from '../lib/rverfahren.svelte';
  import { horizontMax, horizontStandard, logMoeglich, hatLuecken, prognoseCodeSatz, prognoseSperre, arimaSaisonMoeglich } from '../lib/prognose';
  import {
    MASSNAHME_ARTEN, massnahmeSperre, massnahmeCodeSatz, massnahmeWahlBereinigen, massnahmeWahlGrund, massnahmeHilfeSatz, vorschlagSatz, vorschlagUebernehmen, massnahmeRCode,
    type MassnahmeArt, type MassnahmeWahl, type VorschlagAntwort
  } from '../lib/massnahme';
  import { massnahmeSaetze, platzLabel, prognoseReihe, prognoseZeiten, type ZeitreiheE } from '../lib/zeitreiheblatt';
  import { prognoseStellen } from '../lib/prognose';
  import DiagrammExport from './DiagrammExport.svelte';
  import Massnahmediagramm from './Massnahmediagramm.svelte';
  import Ausgabe from './Ausgabe.svelte';
  import Rechnet from './Rechnet.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * Der Abschnitt „Hat die Maßnahme gewirkt?“ der Zeitreihen-Karte (Fachblatt MASSNAHME, Abschnitt 1). Ohne Klick wird nichts gerechnet.
   * Der Zeitpunkt der Maßnahme ist Pflicht und hat keine Vorgabe. Das Modell wählt die Person selbst; der Vorschlag (nur aus den Werten vor der Maßnahme) wird angezeigt und muss übernommen werden - er rechnet nie von allein.
   * Gesperrt (mit Satz) bei Lücken über 10 %, ungleichen Abständen, unter 20 Werten, gleichen Werten und, je nach Zeitpunkt, am Rand oder mit zu wenigen Werten davor oder danach.
   * Ausgabe: Warnungen (immer sichtbar), Satz, Bild, Tabellen, Befehl. Gespeichert wird Wahl und Antwort am Ergebnis des Blatts (ZeitreiheE.massnahme).
   */
  let { e, wertText, zeitText, name, tabellen, speichere }: { e: ZeitreiheE; wertText: string; zeitText: string; name: (n: string) => string; tabellen: OutputItem[]; speichere: (neu: ZeitreiheE) => void } = $props();
  const ID = 'ms';
  const lad = new Laedt(), vor = new Laedt();
  const reihe = $derived(prognoseReihe(e));
  const reiheSperre = $derived(prognoseSperre(reihe));
  const T = $derived(e.y.length), m = $derived(e.periode);
  const hMax = $derived(horizontMax(T, m));
  const logOk = $derived(logMoeglich(reihe));
  const luecken = $derived(hatLuecken(reihe));
  const saisonArima = $derived(arimaSaisonMoeglich(m));
  const start = e.massnahme?.wahl;
  let t0 = $state<number | null>(start?.t0 ?? null);
  let w = $state<Omit<MassnahmeWahl, 't0'>>({
    art: start?.art ?? 'stufe', log: start?.log ?? false, p: start?.p ?? 0, d: start?.d ?? 1, q: start?.q ?? 1, P: start?.P ?? 0, D: start?.D ?? 0, Q: start?.Q ?? 0, konst: start?.konst ?? false,
    h: start?.h ?? horizontStandard(e.y.length, e.periode)
  });
  let fehler = $state(''), vorFehler = $state('');
  let vorschlag = $state<VorschlagAntwort | null>(null);
  const setze = (x: Partial<typeof w>) => { w = { ...w, ...x }; };
  const zahlWahl = (feld: 'h' | 'p' | 'd' | 'q' | 'P' | 'D' | 'Q', lo: number, hi: number) => (ev: Event & { currentTarget: HTMLInputElement }) => {
    const v = Number(ev.currentTarget.value);
    if (Number.isInteger(v) && v >= lo && v <= hi) setze({ [feld]: v });
    else { ev.currentTarget.value = String(w[feld]); melde(L(`Hier gilt eine ganze Zahl von ${lo} bis ${hi}.`, `A whole number from ${lo} to ${hi} applies here.`)); }
  };
  const konstDarf = $derived(w.d + w.D === 0);
  const zeitSperre = $derived(massnahmeSperre(reihe, t0));
  const plaetze = $derived(Array.from({ length: T }, (_, i) => ({ nr: i + 1, label: platzLabel(e, i) })));
  const zeitWahl = (ev: Event & { currentTarget: HTMLSelectElement }) => {
    const v = ev.currentTarget.value;
    t0 = v === '' ? null : Number(v);
    vorschlag = null;   // der Vorschlag gehört zum Zeitpunkt
  };

  async function vorschlagen() {
    if (t0 === null) { vorFehler = massnahmeCodeSatz('kein-zeitpunkt'); melde(vorFehler); return; }
    const sp = massnahmeSperre(reihe, t0);
    if (sp) { vorFehler = massnahmeCodeSatz(sp); melde(vorFehler); return; }
    if (luecken) { vorFehler = massnahmeCodeSatz('luecken-nur-selbst'); melde(vorFehler); return; }
    if (w.log && !logOk) { vorFehler = massnahmeCodeSatz('log-nicht-positiv'); melde(vorFehler); return; }
    vorFehler = '';
    try {
      const erg = await vor.mit(() => massnahmeVorschlagRechnen(e.y, m, t0!, w.log));
      if (!erg) return;
      vorschlag = erg;
      melde(L('Der Modellvorschlag ist gerechnet. Er wird erst mit „Vorschlag übernehmen“ zur Wahl.', 'The model suggestion has been calculated. It only becomes the choice with "Adopt suggestion".'));
    } catch (x) { vorFehler = (x as Error)?.message ?? String(x); melde(vorFehler); }
  }
  function uebernehmen() {
    if (!vorschlag || t0 === null) return;
    const neu = vorschlagUebernehmen({ ...w, t0 }, vorschlag);
    w = { art: neu.art, log: neu.log, p: neu.p, d: neu.d, q: neu.q, P: neu.P, D: neu.D, Q: neu.Q, konst: neu.konst, h: neu.h };
    melde(L('Der Vorschlag ist übernommen. Gerechnet wird erst mit dem Knopf „Wirkung rechnen“.', 'The suggestion has been adopted. Nothing is calculated until the button "Calculate the effect".'));
  }
  async function rechnen() {
    if (t0 === null) { fehler = massnahmeCodeSatz('kein-zeitpunkt'); melde(fehler); return; }
    const rein = massnahmeWahlBereinigen({ ...w, t0 }, reihe);
    const sp = massnahmeSperre(reihe, rein.t0), grund = massnahmeWahlGrund(rein, reihe);
    if (sp || grund) { fehler = massnahmeCodeSatz((sp ?? grund)!); melde(fehler); return; }
    fehler = '';
    try {
      const erg = await lad.mit(() => massnahmeRechnen(e.y, m, rein));
      if (!erg) return;
      w = { art: rein.art, log: rein.log, p: rein.p, d: rein.d, q: rein.q, P: rein.P, D: rein.D, Q: rein.Q, konst: rein.konst, h: rein.h };
      speichere({ ...e, massnahme: { wahl: rein, antwort: erg } });
      melde(L('Die Wirkung der Maßnahme ist gerechnet.', 'The effect of the measure has been calculated.'));
    } catch (x) { fehler = (x as Error)?.message ?? String(x); melde(fehler); }
  }
  const ms = $derived(e.massnahme);
  const saetze = $derived(ms ? massnahmeSaetze(e, name(e.wert)) : null);
  const zeiten = $derived(ms ? prognoseZeiten(e, ms.antwort.mittel.length) : []);
  const zeitMassnahme = $derived(ms ? platzLabel(e, ms.wahl.t0 - 1) : '');
  const nur = (...l: string[]) => tabellen.filter(t => t.type === 'table' && l.includes((t as { label: string }).label));
  const artWort = (a: MassnahmeArt) => a === 'stufe' ? L('Stufe (0 davor, 1 ab dem Zeitpunkt)', 'Step (0 before, 1 from the point in time on)') : a === 'beides' ? L('Stufe und Impuls (Impuls: 1 nur im Zeitpunkt)', 'Step and pulse (pulse: 1 only at the point in time)') : L('Nur Impuls (1 nur im Zeitpunkt)', 'Pulse only (1 only at the point in time)');
</script>

<h3 style="font-size:var(--s-klein,.9rem);margin:var(--a5) 0 var(--a2)">{L('Hat die Maßnahme gewirkt?', 'Did the measure work?')}</h3>

{#if reiheSperre}
  <p class="hilfe" use:ergebnisAnsage>{prognoseCodeSatz(reiheSperre)}</p>
{:else}
  <p class="hilfe">{massnahmeHilfeSatz()}</p>
  <div class="korr-wahl" style="margin-top:var(--a3)">
    <fieldset class="zusatz-gruppe">
      <legend>{L('Zeitpunkt der Maßnahme', 'Point in time of the measure')}</legend>
      <div class="eingabe" style="max-width:340px"><label for="{ID}-t0">{L('Die Maßnahme gilt ab', 'The measure applies from')}</label>
        <select id="{ID}-t0" aria-describedby="{ID}-t0-h" onchange={zeitWahl}>
          <option value="" selected={t0 === null}>{L('Bitte wählen', 'Please choose')}</option>
          {#each plaetze as p (p.nr)}<option value={p.nr} selected={t0 === p.nr}>{p.label}</option>{/each}
        </select>
        <p id="{ID}-t0-h" class="hilfe" role={zeitSperre || t0 === null ? 'status' : undefined}>{t0 === null ? massnahmeCodeSatz('kein-zeitpunkt') : zeitSperre ? massnahmeCodeSatz(zeitSperre) : L('Der Zeitpunkt gehört zur Zeit mit Maßnahme. Er sollte vorher festgelegt sein.', 'The point in time belongs to the time with the measure. It should be fixed beforehand.')}</p></div>
    </fieldset>

    <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
      <legend>{L('Art der Veränderung', 'Kind of change')}</legend>
      <div class="segment">{#each MASSNAHME_ARTEN as a (a)}<label><input type="radio" name="{ID}-art" value={a} checked={w.art === a} onchange={() => setze({ art: a })}>{artWort(a)}</label>{/each}</div>
    </fieldset>

    <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
      <legend>{L('Skala', 'Scale')}</legend>
      <label class="schalter"><input type="checkbox" checked={w.log && logOk} disabled={!logOk} aria-describedby="{ID}-log-h" onchange={(ev) => { setze({ log: ev.currentTarget.checked }); vorschlag = null; }}>{L('Log-Skala', 'Log scale')}</label>
      <p id="{ID}-log-h" class="hilfe" style="margin-top:var(--a2)">{logOk ? L('Auf der Log-Skala gilt der Effekt als Prozentwert vom Niveau; die Prognose ist ein Median.', 'On the log scale the effect is a percentage of the level; the forecast is a median.') : L('Nicht möglich: Es gibt Werte von 0 oder darunter.', 'Not possible: there are values of 0 or below.')}</p>
    </fieldset>

    <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
      <legend>{L('Ordnung des Modells', 'Order of the model')}</legend>
      <div style="display:flex;flex-wrap:wrap;gap:var(--a3)">
        {#each [['p', L('p (Anteil der Vergangenheit)', 'p (autoregressive part)'), 0, 5], ['d', L('d (Differenzen)', 'd (differences)'), 0, 2], ['q', L('q (gleitender Durchschnitt)', 'q (moving-average part)'), 0, 5]] as [f, tx, lo, hi] (f)}
          <div class="eingabe" style="max-width:150px"><label for="{ID}-{f}">{tx}</label><input id="{ID}-{f}" type="number" min={lo} max={hi} step="1" value={w[f as 'p' | 'd' | 'q']} onchange={zahlWahl(f as 'p' | 'd' | 'q', lo as number, hi as number)}></div>
        {/each}
      </div>
      {#if saisonArima}
        <div style="display:flex;flex-wrap:wrap;gap:var(--a3);margin-top:var(--a3)">
          {#each [['P', L('P (saisonal)', 'P (seasonal)'), 0, 5], ['D', L('D (saisonale Differenzen)', 'D (seasonal differences)'), 0, 1], ['Q', L('Q (saisonal)', 'Q (seasonal)'), 0, 5]] as [f, tx, lo, hi] (f)}
            <div class="eingabe" style="max-width:150px"><label for="{ID}-{f}">{tx}</label><input id="{ID}-{f}" type="number" min={lo} max={hi} step="1" value={w[f as 'P' | 'D' | 'Q']} onchange={zahlWahl(f as 'P' | 'D' | 'Q', lo as number, hi as number)}></div>
          {/each}
        </div>
      {:else}<p class="hilfe" style="margin-top:var(--a2)">{L('Der Saisonteil (P, D, Q) geht nur bei einer Periode von 2 bis 24.', 'The seasonal part (P, D, Q) works only with a period of 2 to 24.')}</p>{/if}
      <label class="schalter" style="margin-top:var(--a3)"><input type="checkbox" checked={w.konst && konstDarf} disabled={!konstDarf} aria-describedby="{ID}-k-h" onchange={(ev) => setze({ konst: ev.currentTarget.checked })}>{L('Mittelwert (Konstante)', 'Mean (constant)')}</label>
      <p id="{ID}-k-h" class="hilfe" style="margin-top:var(--a2)">{konstDarf ? L('Nur bei d + D = 0. Eine Konstante kommt nur ins Modell, wenn sie hier gewählt wird.', 'Only with d + D = 0. A constant enters the model only if it is chosen here.') : L('Bei d + D über 0 gibt es keine Konstante.', 'With d + D above 0 there is no constant.')}</p>

      <div style="margin-top:var(--a3)">
        <p class="hilfe">{L('Der Vorschlag nimmt nur die Werte vor der Maßnahme, damit der Effekt die Wahl nicht beeinflusst. Er rechnet nichts und wird erst mit „Vorschlag übernehmen“ zur Wahl.', 'The suggestion uses only the values before the measure, so that the effect does not influence the choice. It calculates nothing and only becomes the choice with "Adopt suggestion".')}</p>
        <div class="knopfzeile" style="margin-top:var(--a2)">
          <button class="k" type="button" disabled={vor.sichtbar || lad.aktiv || luecken || t0 === null || !!zeitSperre} aria-disabled={vor.aktiv ? 'true' : undefined} onclick={vorschlagen}>{#if vor.sichtbar}<Rechnet imKnopf />{/if}{L('Modell aus der Zeit davor vorschlagen', 'Suggest a model from the time before')}</button>
        </div>
        {#if luecken}<p class="hilfe" style="margin-top:var(--a2)">{massnahmeCodeSatz('luecken-nur-selbst')}</p>{/if}
        {#if vor.sichtbar}<p class="hilfe" role="status" style="margin-top:var(--a2)"><Rechnet text={L('Der Vorschlag wird gerechnet …', 'The suggestion is being calculated …')} /></p>{/if}
        {#if vorFehler}<p class="hilfe" role="alert" style="margin-top:var(--a2)">{vorFehler}</p>{/if}
        {#if vorschlag}
          <p style="margin-top:var(--a2)">{vorschlagSatz(vorschlag, m)}</p>
          <div class="knopfzeile" style="margin-top:var(--a2)"><button class="k" type="button" disabled={lad.aktiv} onclick={uebernehmen}>{L('Vorschlag übernehmen', 'Adopt suggestion')}</button></div>
        {/if}
      </div>
    </fieldset>

    <fieldset class="zusatz-gruppe" style="margin-top:var(--a3)">
      <legend>{L('Prognose', 'Forecast')}</legend>
      <div class="eingabe" style="max-width:260px"><label for="{ID}-h">{L('Zahl der Zeitpunkte nach dem letzten Wert', 'Number of points in time after the last value')}</label>
        <input id="{ID}-h" type="number" min="1" max={hMax} step="1" value={w.h} aria-describedby="{ID}-h-h" onchange={zahlWahl('h', 1, hMax)}>
        <p id="{ID}-h-h" class="hilfe">{L(`Höchstens ${hMax}. Die Prognose nimmt an, dass die Stufe bestehen bleibt und der Impuls nicht wiederkehrt.`, `At most ${hMax}. The forecast assumes that the step remains and the pulse does not return.`)}</p></div>
    </fieldset>

    <div class="knopfzeile" style="margin-top:var(--a3)">
      <button class="k haupt" type="button" disabled={lad.sichtbar || vor.aktiv || t0 === null || !!zeitSperre} aria-disabled={lad.aktiv ? 'true' : undefined} onclick={rechnen}>{#if lad.sichtbar}<Rechnet imKnopf />{/if}{ms ? L('Wirkung neu rechnen', 'Recalculate the effect') : L('Wirkung rechnen', 'Calculate the effect')}</button>
    </div>
    {#if lad.sichtbar}<p class="hilfe" role="status" style="margin-top:var(--a2)"><Rechnet text={L('Die Wirkung wird gerechnet …', 'The effect is being calculated …')} /></p>{/if}
    {#if fehler}<p class="hilfe" role="alert" style="margin-top:var(--a2)">{fehler}</p>{/if}
  </div>
{/if}

{#if ms && saetze}
  <h4 style="font-size:var(--s-klein,.9rem);margin:var(--a4) 0 var(--a2)">{L('Prüfliste', 'Checklist')}</h4>
  <ul class="hilfe" style="margin:0 0 var(--a3);padding-inline-start:1.2em">{#each saetze.warnungen as x (x)}<li>{x}</li>{/each}</ul>
  <p>{saetze.haupt}</p>
  {#if saetze.ljung}<p class="hilfe" style="margin-top:var(--a2)">{saetze.ljung}</p>{/if}
  <DiagrammExport titel={`${L('Zeitreihe mit Maßnahme', 'Time series with a measure')}: ${wertText}`}><Massnahmediagramm {e} m={ms} {wertText} {zeitText} {zeiten} stellen={prognoseStellen(e.y)} zeitMassnahme={zeitMassnahme} /></DiagrammExport>
  <Ausgabe items={nur('Maßnahme-Effekt', 'Maßnahme-Güte', 'Maßnahme-Prognose')} nurTabellen />
  <details class="auf" style="margin-top:var(--a3)"><summary>{L('Befehl (R)', 'Command (R)')}</summary><pre class="befehl">{massnahmeRCode(ms, e.wert)}</pre></details>
{/if}
<p class="hilfe" style="margin-top:var(--a3)"><HilfeLink id="zeitreihe-massnahme" text={L('Hilfe: Wirkung einer Maßnahme lesen', 'Help: reading the effect of a measure')} /></p>
