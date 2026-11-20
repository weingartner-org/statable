<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { istFehlend } from '../lib/fehlend';
  import Kursiv from './Kursiv.svelte';
  import { kopiereKursiv } from '../lib/kursiv';
  import { richtung } from '../i18n/profil';
  import { tick, untrack } from 'svelte';
  import { s, d, L, Lp, melde, sichern, type Blatt } from '../lib/sitzung.svelte';
  import { cfaRechnen, cfaPruefung, zuordnungAusFaktoren, rStatus, type CfaFaktorDef } from '../lib/rverfahren.svelte';
  import { saetzeCfa, tabellenCfa, cfaApa } from '../lib/rsaetze';
  import type { Faktoren } from '../lib/ergebnis';
  import DiagrammExport from './DiagrammExport.svelte';
  import RStart from './RStart.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import Icon from './Icon.svelte';
  import Ausgabe from './Ausgabe.svelte';
  import Pfaddiagramm from './Pfaddiagramm.svelte';
  import InvarianzBlock from './InvarianzBlock.svelte';

  /** Konfirmatorische Faktorenanalyse (lavaan) im Blatt der Faktorenanalyse: Fragen den Faktoren zuordnen, rechnen, Passung und Ladungen lesen. */
  let { blatt, e, fragen, name }: { blatt: Blatt; e: Faktoren; fragen: string[]; name: (n: string) => string } = $props();
  const c0 = $derived(e.cfa);
  // Aufgeklappt, wenn schon gerechnet wurde (nur beim Öffnen des Blatts); danach bestimmt die Nutzerin den Zustand.
  let offen = $state(!!untrack(() => e.cfa));
  // Zuordnung: Faktornamen und je Frage der Index des Faktors (-1 = keinem). Beginnt mit dem Stand der letzten Rechnung.
  let namen = $state<string[]>([L('Faktor 1', 'Factor 1'), L('Faktor 2', 'Factor 2')]);
  let zuord = $state<Record<string, number>>({});
  let angefangen = false;
  $effect(() => { if (!angefangen && c0) { angefangen = true; namen = c0.faktoren.map(f => f.name); zuord = Object.fromEntries(c0.faktoren.flatMap((f, i) => f.fragen.map(q => [q, i]))); ordinalW = c0.schaetzer === 'WLSMV'; fiml = c0.fiml; } });
  let ordinalW = $state(false), fiml = $state(false), laeuft = $state(false), fehler = $state(''), fehlt = $state(false);

  $effect(() => { void zuord; void namen; void fiml; void ordinalW; untrack(() => { fehler = ''; }); });
  const defs = $derived<CfaFaktorDef[]>(namen.map((n, i) => ({ name: n.trim() || L(`Faktor ${i + 1}`, `Factor ${i + 1}`), fragen: fragen.filter(q => zuord[q] === i) })));
  const zugeordnet = $derived(fragen.filter(q => (zuord[q] ?? -1) >= 0));
  const nVoll = $derived.by(() => {
    const ix = zugeordnet.map(q => s.spalten.findIndex(x => x.name === q)), sp = zugeordnet.map(q => s.spalten.find(x => x.name === q));
    return s.zeilen.filter(z => ix.every((i, k) => typeof z[i] === 'number' && !istFehlend(sp[k], z[i] as number))).length;
  });
  const mitLuecken = $derived(zugeordnet.length > 0 && nVoll < s.zeilen.length);
  const pruef = $derived(zugeordnet.length ? cfaPruefung(defs, fiml ? s.zeilen.length : nVoll) : null);
  /** Wenige Antwortstufen (höchstens fünf) oder ordinales Niveau: Hinweis auf WLSMV. ⚠ Schwelle von der Fachperson abzunehmen. */
  const wenigeStufen = $derived(zugeordnet.some(q => {
    const i = s.spalten.findIndex(x => x.name === q);
    return s.spalten[i]?.niveau === 'ordinal' || new Set(s.zeilen.map(z => z[i]).filter(v => typeof v === 'number' && !istFehlend(s.spalten[i], v))).size <= 5;
  }));

  function uebernehmen() {
    const v = zuordnungAusFaktoren(e.faktoren, fragen, name, n => s.spalten.find(x => x.name === n)?.bezeichnung);
    if (!v.length) { melde(L('Die Faktorenanalyse hat keine Gruppe mit mindestens zwei Fragen gefunden.', 'The factor analysis found no group with at least two questions.')); return; }
    namen = v.map(f => f.name); zuord = Object.fromEntries(v.flatMap((f, i) => f.fragen.map(q => [q, i])));
    melde(`${Lp(v.length, `${v.length} Faktor aus der Faktorenanalyse übernommen.`, `${v.length} Faktoren aus der Faktorenanalyse übernommen.`, `${v.length} factor taken from the factor analysis.`, `${v.length} factors taken from the factor analysis.`)} ${d('Du kannst sie ändern.', 'Sie können sie ändern.', 'You can change them.')}`, true);
  }
  const plus = () => { if (namen.length < 5) namen = [...namen, L(`Faktor ${namen.length + 1}`, `Factor ${namen.length + 1}`)]; };
  function minus(i: number) {
    if (namen.length <= 1) return;
    namen = namen.filter((_, k) => k !== i);
    zuord = Object.fromEntries(Object.entries(zuord).flatMap(([q, k]) => (k === i ? [] : [[q, k > i ? k - 1 : k]])));
  }
  async function rechnen() {
    if (laeuft) return;
    fehler = pruef ?? '';
    if (!fehler && !zugeordnet.length) fehler = d('Ordne den Faktoren zuerst Fragen zu.', 'Ordnen Sie den Faktoren zuerst Fragen zu.', 'Assign questions to the factors first.');
    if (fehler) { await tick(); document.getElementById('cfa-fehler')?.focus(); return; }
    laeuft = true;
    try {
      const erg = await cfaRechnen(defs, { ordinal: ordinalW, fiml: fiml && !ordinalW });
      blatt.ergebnis = { typ: 'faktor', e: { ...e, cfa: erg } };
      sichern();
      melde(L('Konfirmatorische Faktorenanalyse gerechnet.', 'Confirmatory factor analysis calculated.'));
      await tick(); document.getElementById('cfa-ergebnis')?.focus();
    } catch (x) { fehler = (x as Error).message; await tick(); document.getElementById('cfa-fehler')?.focus(); }
    finally { laeuft = false; }
  }
  async function kopiereApa(t: string) { await kopiereKursiv(t, richtung() === 'rtl'); melde(L('Kopiert: ', 'Copied: ') + t); }
  async function kopiere(t: string) { try { await navigator.clipboard.writeText(t); } catch { /* egal */ } melde(L('Kopiert: ', 'Copied: ') + t); }
  const k = $derived(c0 ? saetzeCfa(c0) : null);
</script>

<details class="auf cfa" bind:open={offen} style="margin-top:var(--a5)">
  <summary>{L('Ich habe schon eine Vermutung, welche Fragen zusammengehören (konfirmatorisch)', 'I already have an idea which questions belong together (confirmatory)')}</summary>
  <p class="heft-text">{d('Die Faktorenanalyse oben sucht die Gruppen aus den Daten. Hier gibst du die Gruppen vor, etwa aus der Theorie oder einem Fragebogen, und Statable prüft, wie gut sie zu den Daten passen (CFA).', 'Die Faktorenanalyse oben sucht die Gruppen aus den Daten. Hier geben Sie die Gruppen vor, etwa aus der Theorie oder einem Fragebogen, und Statable prüft, wie gut sie zu den Daten passen (CFA).', 'The factor analysis above looks for the groups in the data. Here you specify the groups, for example from theory or a questionnaire, and Statable tests how well they fit the data (CFA).')} <HilfeLink id="konfirmatorische-faktorenanalyse-omega" text={L('Hilfe: konfirmatorische Faktorenanalyse', 'Help: confirmatory factor analysis')} /></p>
  <div class="knopfzeile" style="margin:var(--a2) 0">
    <button class="k" type="button" onclick={uebernehmen}><Icon n="faktor" />{L('Aus der Faktorenanalyse übernehmen', 'Take from the factor analysis')}</button>
    <button class="k leise" type="button" onclick={plus} aria-disabled={namen.length >= 5 ? 'true' : undefined}><Icon n="plus" />{L('Faktor hinzufügen', 'Add factor')}</button>
    <button class="k leise" type="button" onclick={() => { zuord = {}; }}>{L('Zuordnung leeren', 'Clear assignment')}</button>
  </div>
  <div class="cfa-tab" tabindex="-1">
    <table class="cfa-zuord">
      <caption class="nur-vorleser">{L('Zuordnung der Fragen zu den Faktoren: je Frage genau ein Faktor oder keiner', 'Assignment of the questions to the factors: one factor per question, or none')}</caption>
      <thead><tr><th scope="col">{L('Frage', 'Question')}</th>
        {#each namen as _, i (i)}<th scope="col"><div class="eingabe"><input type="text" aria-label={L(`Name von Faktor ${i + 1}`, `Name of factor ${i + 1}`)} bind:value={namen[i]} maxlength="24" autocomplete="off">
          {#if namen.length > 1}<button class="k leise klein" type="button" onclick={() => minus(i)} aria-label={L(`Faktor ${i + 1} entfernen`, `Remove factor ${i + 1}`)}><Icon n="zu" /></button>{/if}</div></th>{/each}
        <th scope="col">{L('keinem', 'none')}</th></tr></thead>
      <tbody>
        {#each fragen as q (q)}
          <tr><th scope="row" data-tipp={name(q)}>{name(q)}</th>
            {#each namen as n, i (i)}<td><input type="radio" name="cfa-{q}" aria-label={L(`${name(q)}: ${n || L(`Faktor ${i + 1}`, `Factor ${i + 1}`)}`, `${name(q)}: ${n || L(`Faktor ${i + 1}`, `Factor ${i + 1}`)}`)} checked={zuord[q] === i} onchange={() => (zuord[q] = i)}></td>{/each}
            <td><input type="radio" name="cfa-{q}" aria-label={L(`${name(q)}: keinem Faktor`, `${name(q)}: no factor`)} checked={(zuord[q] ?? -1) < 0} onchange={() => (zuord[q] = -1)}></td></tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if mitLuecken && !fiml}<p class="heft-text">{L(`${nVoll} von ${s.zeilen.length} Personen haben zu allen zugeordneten Fragen eine Antwort; nur sie gehen ein.`, `${nVoll} of ${s.zeilen.length} people answered all assigned questions; only they are included.`)}</p>{/if}
  {#if wenigeStufen}<p class="heft-text"><b>{L('Hinweis:', 'Note:')}</b> {L('Die Antworten haben nur wenige Stufen. Dann rechnen Fachleute oft mit WLSMV statt ML (siehe „Für Fachleute“).', 'The answers have only a few levels. Specialists often use WLSMV instead of ML then (see "For specialists").')}</p>{/if}
  {#if fehler}<p id="cfa-fehler" class="heft-text" role="alert" tabindex="-1" style="color:var(--fehler, #b3261e)">{fehler}</p>
  {:else if pruef}<p class="heft-text" use:ergebnisAnsage>{pruef}</p>{/if}
  <RStart knopf={c0 ? L('CFA neu rechnen', 'Recalculate CFA') : L('CFA rechnen', 'Calculate CFA')} los={rechnen} {laeuft} bind:fehlt />
  <details class="auf" style="margin-top:var(--a2)"><summary>{L('Für Fachleute', 'For specialists')}</summary>
    <div class="segment" role="radiogroup" aria-label={L('Schätzer', 'Estimator')} style="margin:var(--a2) 0">
      <label data-begriff="maximum-likelihood"><input type="radio" name="cfa-est" checked={!ordinalW} onchange={() => (ordinalW = false)}>{L('ML (Maximum Likelihood)', 'ML (maximum likelihood)')}</label>
      <label><input type="radio" name="cfa-est" checked={ordinalW} onchange={() => (ordinalW = true)}>{L('WLSMV (ordinale Antworten)', 'WLSMV (ordinal answers)')}</label>
    </div>
    <div class="segment" style="margin:var(--a2) 0"><label data-begriff="fehlende-werte"><input type="checkbox" bind:checked={fiml} disabled={ordinalW}>{L('Fehlende Werte: FIML statt Personen auslassen', 'Missing values: FIML instead of leaving people out')}</label></div>
    <p class="heft-text">{L('ML setzt metrische, annähernd normalverteilte Antworten voraus. WLSMV behandelt die Antworten als geordnete Kategorien (polychorische Korrelationen) und zeigt skalierte Kennwerte; FIML gibt es dort nicht. Die Faktoren dürfen korrelieren; jede Frage lädt auf genau einem Faktor. Die erste Frage jedes Faktors legt die Skala fest (wie lavaan::cfa).', 'ML assumes metric, approximately normal answers. WLSMV treats the answers as ordered categories (polychoric correlations) and shows scaled statistics; FIML is not available there. The factors may correlate; every question loads on exactly one factor. The first question of each factor sets the scale (as in lavaan::cfa).')}</p>
  </details>

  {#if c0 && k}
    <div style="margin-top:var(--a4)">
      <h3 id="cfa-ergebnis" tabindex="-1">{L('Ergebnis der konfirmatorischen Faktorenanalyse', 'Result of the confirmatory factor analysis')}</h3>
      <p class="ergebnis-satz">{k.haupt}</p>
      <p class="heft-text">{k.zusatz} {k.vorsicht}</p>
      {#each c0.warnungen.slice(0, 3) as w (w)}<p class="heft-text" style="color:var(--tinte-2)">R: {w}</p>{/each}
      <div class="apa-zeile"><span><Kursiv text={cfaApa(c0)} /></span><button class="k" type="button" onclick={() => kopiereApa(cfaApa(c0))}><Icon n="kopieren" />{L('Kopieren', 'Copy')}</button></div>
      <Ausgabe items={tabellenCfa(c0, name)} nurTabellen />
      <figure class="diagramm-rahmen" style="margin:var(--a3) 0"><DiagrammExport titel={L('Pfaddiagramm', 'Path diagram')} klasse="dgx-scroll"><Pfaddiagramm c={c0} {name} /></DiagrammExport></figure>
      {#if c0.schaetzer === 'ML'}<InvarianzBlock faktoren={c0.faktoren} />{/if}
    </div>
  {/if}
</details>

<style>
  .cfa-tab { overflow-x: auto; max-width: 100%; }
  .cfa-zuord { border-collapse: collapse; min-width: 100%; }
  .cfa-zuord th, .cfa-zuord td { padding: var(--a1) var(--a2); border-bottom: 1px solid var(--linie); text-align: center; vertical-align: middle; }
  .cfa-zuord th[scope='row'] { text-align: start; font-weight: 500; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cfa-zuord thead th { min-width: 120px; font-weight: 600; }
  .cfa-zuord thead th:first-child { text-align: start; min-width: 140px; }
  .cfa-zuord input[type='radio'] { width: 20px; height: 20px; accent-color: var(--akzent); }
  .cfa-zuord .eingabe { flex-direction: row; gap: var(--a1); align-items: center; }
  .cfa-zuord .eingabe input { min-width: 0; }
</style>
