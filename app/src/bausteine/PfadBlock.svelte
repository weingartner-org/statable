<script lang="ts">
  /** Pfadmodell mit beobachteten Variablen (S-J S1): wer wirkt auf wen, alle Gleichungen zusammen, mit indirekten Effekten und Passung (lavaan in webR). Erst auf Klick; unter Regression und Mediation. */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { pfeil } from '../i18n/profil';
  import { komma, pWert } from '../lib/ergebnis';
  import { pfadRechnen, fitUrteil, FIT_GRENZEN, type PfadErg, rStatus } from '../lib/rverfahren.svelte';
  import RStart from './RStart.svelte';

  const kennung = $props.id();
  const alleZahlen = $derived(s.spalten.filter(c => c.art === 'zahl'));
  /** Latente Faktoren (S2): bis zu drei, je mit mindestens zwei Fragen; Kennung „F:1“ … in der Matrix */
  let faktoren = $state<{ name: string; fragen: string[] }[]>([]);
  const fertigeFaktoren = $derived(faktoren.map((f, i) => ({ id: `F:${i + 1}`, name: f.name.trim() || L(`Faktor ${i + 1}`, `Factor ${i + 1}`), fragen: f.fragen.filter(q => alleZahlen.some(c => c.name === q)) })).filter(f => f.fragen.length >= 2));
  const fragenBenutzt = $derived(new Set(fertigeFaktoren.flatMap(f => f.fragen)));
  const zahlen = $derived([...alleZahlen.filter(c => !fragenBenutzt.has(c.name)).map(c => ({ name: c.name })), ...fertigeFaktoren.map(f => ({ name: f.id }))]);
  const name = (n: string) => { const f = fertigeFaktoren.find(x => x.id === n); if (f) return f.name; const c = s.spalten.find(x => x.name === n); return c ? (c.bezeichnung.trim() || c.name) : n; };
  const plusF = () => { if (faktoren.length < 3) faktoren.push({ name: '', fragen: [] }); };
  const minusF = () => { faktoren.pop(); };
  const frageUm = (i: number, q: string) => { const f = faktoren[i]!; f.fragen = f.fragen.includes(q) ? f.fragen.filter(x => x !== q) : [...f.fragen, q]; };
  /** Matrix: wirkt[ziel][von] = true heißt „von wirkt auf ziel“ */
  let wirkt = $state<Record<string, Record<string, boolean>>>({}), laeuft = $state(false), bootstrap = $state(false), bootAngefordert = $state(false), nullen = $state<Record<string, boolean>>({}), fehler = $state(''), fehlt = $state(false), erg = $state<PfadErg | null>(null);
  $effect(() => { void JSON.stringify(wirkt); void JSON.stringify(faktoren); void bootstrap; void JSON.stringify(nullen); erg = null; fehler = ''; });
  const schalte = (ziel: string, von: string) => { wirkt[ziel] = { ...(wirkt[ziel] ?? {}), [von]: !wirkt[ziel]?.[von] }; };
  const modell = $derived(Object.entries(wirkt).map(([ziel, m]) => ({ ziel, praed: Object.keys(m).filter(k => m[k]) })).filter(x => x.praed.length && zahlen.some(c => c.name === x.ziel)).map(x => ({ ziel: x.ziel, praed: x.praed.filter(p => zahlen.some(c => c.name === p)) })).filter(x => x.praed.length));
  const anzahlPfade = $derived(modell.reduce((a, m) => a + m.praed.length, 0));
  /** Pfade, die für den Modellvergleich auf 0 gesetzt werden: Schlüssel „von“ + Trennzeichen + „nach“ aus der Tabelle der direkten Pfade */
  const nullModell = $derived(Object.entries(nullen).filter(([, an]) => an).map(([k]) => k.split('\u0001') as [string, string]).reduce<{ ziel: string; praed: string[] }[]>((a, [von, nach]) => { const m = a.find(x => x.ziel === nach); if (m) m.praed.push(von); else a.push({ ziel: nach, praed: [von] }); return a; }, []));
  async function rechnen() {
    if (laeuft || !modell.length) return;
    laeuft = true; fehler = '';
    try { bootAngefordert = bootstrap; erg = await pfadRechnen(modell, false, fertigeFaktoren.map(f => ({ id: f.id, fragen: f.fragen })), bootstrap ? 500 : 0, nullModell); }
    catch (x) { fehler = (x as Error).message; }
    finally { laeuft = false; }
  }
  const z3 = (v: number | null) => (v === null || !Number.isFinite(v) ? '-' : komma(v, 3));
  const ivt = (lo: number | null, hi: number | null) => (lo === null || hi === null ? '-' : `[${komma(lo, 3)}; ${komma(hi, 3)}]`);
  const pt = (p: number | null) => (p === null || !Number.isFinite(p) ? '-' : pWert(p).replace(/^= /, ''));
  const pfadText = (p: string[]) => p.map(name).join(' ' + pfeil() + ' ');
  const urteil = $derived(erg?.fit && erg.df > 0 && erg.fit.cfi !== null && erg.fit.tli !== null && erg.fit.rmsea !== null && erg.fit.srmr !== null ? fitUrteil({ chisq: erg.fit.chisq, df: erg.fit.df, p: erg.fit.p, cfi: erg.fit.cfi, tli: erg.fit.tli, rmsea: erg.fit.rmsea, rmseaLo: 0, rmseaHi: 0, srmr: erg.fit.srmr }) : null);
  void rStatus;
</script>

{#if zahlen.length >= 2}
  <details class="auf" style="margin-top:var(--a4)"><summary>{L('Pfadmodell: Wer wirkt auf wen? (mehrere Gleichungen zusammen)', 'Path model: who affects whom? (several equations together)')}</summary>
    <p class="heft-text">{L('Ein Pfadmodell rechnet mehrere Regressionen gleichzeitig und zeigt, wie Variablen über andere hinweg wirken (zum Beispiel Lernzeit → Motivation → Note). Gesucht sind die direkten Pfade, die indirekten Wege über andere Variablen und der Gesamteffekt. In der Tabelle ein Häkchen setzen, wenn die Spalte auf die Zeile wirken soll.', 'A path model calculates several regressions at once and shows how variables act through others (for example study time → motivation → grade). It gives the direct paths, the indirect routes through other variables and the total effect. In the table, tick a box if the column is meant to affect the row.')}</p>
    <p class="hilfe"><HilfeLink id="pfadmodell-sem" text={L('Hilfe: Pfadmodell', 'Help: path model')} /></p>
    <fieldset class="segment" style="margin:var(--a2) 0;display:block"><legend>{L('Latente Faktoren (optional): mehrere Fragen, die zusammen etwas Unsichtbares messen', 'Latent factors (optional): several questions that together measure something invisible')}</legend>
      {#each faktoren as f, i (i)}
        <div style="margin:var(--a2) 0"><div class="eingabe" style="max-width:280px"><label for="pf-f{kennung}{i}">{L(`Name von Faktor ${i + 1}`, `Name of factor ${i + 1}`)}</label><input id="pf-f{kennung}{i}" type="text" bind:value={f.name} maxlength="24" autocomplete="off" /></div>
          <div>{#each alleZahlen as c (c.name)}<label style="margin-inline-end:var(--a3)"><input type="checkbox" checked={f.fragen.includes(c.name)} onchange={() => frageUm(i, c.name)} />{c.bezeichnung.trim() || c.name}</label>{/each}</div></div>
      {/each}
      <div class="knopfzeile"><button class="k leise" type="button" onclick={plusF} aria-disabled={faktoren.length >= 3 ? 'true' : undefined}>{L('Faktor hinzufügen', 'Add factor')}</button>{#if faktoren.length}<button class="k leise" type="button" onclick={minusF}>{L('Letzten Faktor entfernen', 'Remove last factor')}</button>{/if}</div>
      {#if faktoren.length}<p class="heft-text" style="color:var(--tinte-2)">{L('Ein Faktor braucht mindestens zwei Fragen, besser drei. Die Fragen eines Faktors erscheinen dann nicht mehr einzeln in der Tabelle; der Faktor steht stattdessen als eigene Zeile und Spalte da.', 'A factor needs at least two questions, preferably three. The questions of a factor then no longer appear individually in the table; the factor appears as a row and column of its own instead.')}</p>{/if}
    </fieldset>
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption class="nur-vorleser">{L('Welche Spalte wirkt auf welche Zeile', 'Which column affects which row')}</caption>
      <thead><tr><th scope="col">{L('wirkt auf ↓ / von →', 'affects ↓ / from →')}</th>{#each zahlen as c (c.name)}<th scope="col">{name(c.name)}</th>{/each}</tr></thead>
      <tbody>{#each zahlen as z (z.name)}<tr><th scope="row" style="text-align: start">{name(z.name)}</th>{#each zahlen as c (c.name)}<td style="text-align:center">{#if c.name === z.name}-{:else}<input type="checkbox" aria-label={L(`${name(c.name)} wirkt auf ${name(z.name)}`, `${name(c.name)} affects ${name(z.name)}`)} checked={!!wirkt[z.name]?.[c.name]} onchange={() => schalte(z.name, c.name)} />{/if}</td>{/each}</tr>{/each}</tbody>
    </table></div>
    {#if fehler}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{fehler}</p>{/if}
    {#if anzahlPfade > 1}<fieldset class="segment" style="margin:var(--a2) 0;display:block"><legend>{L('Modellvergleich (optional): welche Pfade sollen im Vergleichsmodell fehlen?', 'Model comparison (optional): which paths should be missing in the comparison model?')}</legend>
      {#each modell as m (m.ziel)}{#each m.praed as v (v)}<label style="margin-inline-end:var(--a3)"><input type="checkbox" checked={!!nullen[v + '\u0001' + m.ziel]} onchange={() => { nullen[v + '\u0001' + m.ziel] = !nullen[v + '\u0001' + m.ziel]; }} />{name(v)} → {name(m.ziel)}</label>{/each}{/each}
      </fieldset>{/if}
    {#if anzahlPfade}<label data-begriff="bootstrap" style="display:block;margin:var(--a2) 0"><input type="checkbox" bind:checked={bootstrap} />{L('Intervalle der indirekten Effekte per Bootstrap (500 Ziehungen, dauert länger)', 'Intervals of the indirect effects by bootstrap (500 draws, takes longer)')}</label>{/if}
    {#if anzahlPfade}<RStart knopf={erg ? L('Pfadmodell neu rechnen', 'Recalculate path model') : L(`Pfadmodell mit ${anzahlPfade} Pfaden rechnen`, `Calculate path model with ${anzahlPfade} paths`)} los={rechnen} {laeuft} bind:fehlt />
    {:else}<p class="heft-text" style="color:var(--tinte-2)">{L('Mindestens einen Pfad ankreuzen.', 'Tick at least one path.')}</p>{/if}
    {#if erg}
      <p class="heft-text" role="status">{L(`${erg.n} Fälle gehen ein.`, `${erg.n} cases are included.`)}{erg.nAlle > erg.n ? ' ' + L(`${erg.nAlle - erg.n} Fälle mit Lücken bleiben außen vor.`, `${erg.nAlle - erg.n} cases with gaps are left out.`) : ''}</p>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Direkte Pfade', 'Direct paths')}</b></caption>
        <thead><tr><th scope="col">{L('Pfad', 'Path')}</th><th scope="col">B</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">p</th><th scope="col">{L('95 %-Intervall', '95% interval')}</th><th scope="col">β</th></tr></thead>
        <tbody>{#each erg.pfade as p, i (i)}<tr><th scope="row" style="text-align: start">{name(p.von)} {pfeil()} {name(p.nach)}</th><td style="text-align:right">{z3(p.est)}</td><td style="text-align:right">{z3(p.se)}</td><td style="text-align:right">{pt(p.p)}</td><td style="text-align:right">{ivt(p.lo, p.hi)}</td><td style="text-align:right">{z3(p.std)}</td></tr>{/each}</tbody>
      </table></div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Erklärter Anteil (R²)', 'Explained share (R²)')}</b></caption>
        <thead><tr><th scope="col">{L('Variable', 'Variable')}</th><th scope="col">R²</th></tr></thead>
        <tbody>{#each erg.r2 as r (r.variable)}<tr><th scope="row" style="text-align: start">{name(r.variable)}</th><td style="text-align:right">{komma(r.r2, 3)}</td></tr>{/each}</tbody>
      </table></div>
      {#if erg.ladungen.length}
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{L('Messmodell: Ladungen der Fragen auf die Faktoren', 'Measurement model: loadings of the questions on the factors')}</b></caption>
          <thead><tr><th scope="col">{L('Faktor', 'Factor')}</th><th scope="col">{L('Frage', 'Question')}</th><th scope="col">{L('Ladung (unstandardisiert)', 'Loading (unstandardized)')}</th><th scope="col">{L('Ladung (standardisiert)', 'Loading (standardized)')}</th></tr></thead>
          <tbody>{#each erg.ladungen as l, i (i)}<tr><th scope="row" style="text-align: start">{name(l.faktor)}</th><td>{name(l.frage)}</td><td style="text-align:right">{z3(l.est)}</td><td style="text-align:right">{z3(l.std)}</td></tr>{/each}</tbody>
        </table></div>
      {/if}
      {#if erg.effekte.length}
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{L('Indirekte Wege und Gesamteffekte', 'Indirect routes and total effects')}</b></caption>
          <thead><tr><th scope="col">{L('Weg', 'Route')}</th><th scope="col">{L('Art', 'Kind')}</th><th scope="col">B</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">p</th><th scope="col">{L('95 %-Intervall', '95% interval')}</th></tr></thead>
          <tbody>{#each erg.effekte as e, i (i)}<tr><th scope="row" style="text-align: start">{pfadText(e.pfad)}</th><td>{e.art === 'indirect' ? L('indirekt', 'indirect') : L('gesamt', 'total')}</td><td style="text-align:right">{z3(e.est)}</td><td style="text-align:right">{z3(e.se)}</td><td style="text-align:right">{pt(e.p)}</td><td style="text-align:right">{ivt(e.lo, e.hi)}</td></tr>{/each}</tbody>
        </table></div>
        {#if bootAngefordert && erg.boot === 0}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{L('Der Bootstrap konnte nicht gerechnet werden (zu wenig Speicher oder Zeit); angezeigt sind die Werte der Delta-Methode.', 'The bootstrap could not be calculated (too little memory or time); the values of the delta method are shown.')}</p>{/if}
        <p class="heft-text" style="color:var(--tinte-2)">{erg.boot > 0
          ? L(`Ein indirekter Effekt ist das Produkt der Koeffizienten entlang des Wegs. Das Intervall ist ein Bootstrap-Intervall (${erg.boot} Ziehungen, Perzentilmethode); Standardfehler und p stammen aus denselben Ziehungen.`, `An indirect effect is the product of the coefficients along the route. The interval is a bootstrap interval (${erg.boot} draws, percentile method); standard error and p come from the same draws.`)
          : L('Ein indirekter Effekt ist das Produkt der Koeffizienten entlang des Wegs. Standardfehler und Intervall stammen aus der Delta-Methode und sind nur bei großen Stichproben verlässlich; für Aufsätze wird meist ein Bootstrap-Intervall verlangt: dafür das Kästchen über dem Knopf ankreuzen.', 'An indirect effect is the product of the coefficients along the route. Standard error and interval come from the delta method and are reliable only in large samples; papers usually require a bootstrap interval: tick the box above the button.')}</p>
      {/if}
      {#if erg.df === 0}<p class="heft-text">{L('Das Modell ist genau bestimmt (jeder Pfad zwischen allen Variablen ist frei): Es passt immer perfekt, darum gibt es keine Passungszahlen. Ob es stimmt, sagt der Fit nicht.', 'The model is exactly identified (every path between all variables is free): it always fits perfectly, so there are no fit figures. The fit does not say whether it is right.')}</p>
      {:else if erg.fit}
        <p class="heft-text">{L(`Passung des Gesamtmodells: χ²(${erg.fit.df}) = ${z3(erg.fit.chisq)}, p ${pWert(erg.fit.p)}; CFI = ${z3(erg.fit.cfi)}, TLI = ${z3(erg.fit.tli)}, RMSEA = ${z3(erg.fit.rmsea)}, SRMR = ${z3(erg.fit.srmr)}.`, `Fit of the whole model: χ²(${erg.fit.df}) = ${z3(erg.fit.chisq)}, p ${pWert(erg.fit.p)}; CFI = ${z3(erg.fit.cfi)}, TLI = ${z3(erg.fit.tli)}, RMSEA = ${z3(erg.fit.rmsea)}, SRMR = ${z3(erg.fit.srmr)}.`)} {urteil === 'gut' ? L(`Nach den üblichen Richtwerten (CFI und TLI mindestens ${komma(FIT_GRENZEN.cfi, 2)}, RMSEA höchstens ${komma(FIT_GRENZEN.rmsea, 2)}, SRMR höchstens ${komma(FIT_GRENZEN.srmr, 2)}) ist die Passung gut: Das Modell widerspricht den Daten nicht.`, `By the usual guidelines (CFI and TLI at least ${komma(FIT_GRENZEN.cfi, 2)}, RMSEA at most ${komma(FIT_GRENZEN.rmsea, 2)}, SRMR at most ${komma(FIT_GRENZEN.srmr, 2)}) the fit is good: the model does not contradict the data.`) : urteil === 'akzeptabel' ? L('Die Passung ist knapp akzeptabel, aber nicht gut: Es fehlt vermutlich ein Pfad oder einer ist zu viel.', 'The fit is barely acceptable but not good: probably a path is missing or one is too many.') : L('Die Passung ist unzureichend: Das Modell widerspricht den Daten. Wahrscheinlich fehlen Pfade.', 'The fit is inadequate: the model contradicts the data. Paths are probably missing.')}</p>
      {/if}
      {#if erg.vergleich}
        {@const v = erg.vergleich}
        <p class="heft-text">{L(`Modellvergleich: Ohne die ${v.k} gewählten Pfade steigt χ² um ${z3(v.dchisq)} bei ${v.ddf} Freiheitsgraden (p ${v.p === null ? '-' : pWert(v.p)}). AIC: ${z3(v.aic)} mit, ${z3(v.aic0)} ohne die Pfade; BIC: ${z3(v.bic)} mit, ${z3(v.bic0)} ohne die Pfade.`, `Model comparison: without the ${v.k} chosen paths, χ² rises by ${z3(v.dchisq)} with ${v.ddf} degrees of freedom (p ${v.p === null ? '-' : pWert(v.p)}). AIC: ${z3(v.aic)} with, ${z3(v.aic0)} without the paths; BIC: ${z3(v.bic)} with, ${z3(v.bic0)} without the paths.`)}</p>
        <p class="heft-text" style="color:var(--tinte-2)">{v.p !== null && v.p < 0.05 ? L('Ein kleines p heißt: Ohne diese Pfade passt das Modell deutlich schlechter, die Pfade tragen also etwas bei. Kleineres AIC oder BIC spricht für das Modell mit dem kleineren Wert.', 'A small p means: without these paths the model fits clearly worse, so the paths contribute something. A smaller AIC or BIC favours the model with the smaller value.') : L('Ein großes p heißt: Ohne diese Pfade passt das Modell nicht merklich schlechter; das ist kein Beweis, dass sie null sind (bei kleinen Stichproben fehlt oft die Trennschärfe). Kleineres AIC oder BIC spricht für das Modell mit dem kleineren Wert.', 'A large p means: without these paths the model does not fit noticeably worse; this is no proof that they are zero (small samples often lack power). A smaller AIC or BIC favours the model with the smaller value.')}</p>
      {/if}
      {#each erg.warnungen.slice(0, 3) as w (w)}<p class="heft-text" style="color:var(--tinte-2)">R: {w}</p>{/each}
      <p class="heft-text" style="color:var(--tinte-2)">{L('Pfade sind keine Beweise für Ursachen: Sie zeigen, was zu den Daten passt, wenn die Richtung der Pfeile stimmt. Eine gute Passung heißt nicht, dass das Modell richtig ist; andere Pfeile können genauso gut passen. Faustregel: mindestens etwa 10 Fälle je Pfad, besser 100 und mehr insgesamt.', 'Paths are not proof of causes: they show what fits the data if the direction of the arrows is right. A good fit does not mean the model is right; other arrows may fit just as well. Rule of thumb: at least about 10 cases per path, better 100 or more in total.')}</p>
    {/if}
  </details>
{/if}
