<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { s, L, melde } from '../lib/sitzung.svelte';
  import { komma, pWert } from '../lib/ergebnis';
  import { logTermName, type LogE } from '../lib/loglinear';
  import { rueckwaertsAusDaten, zellZeilen, type RueckLauf } from '../lib/loglinrueck';
  import { kwegHinweis, modellText, ordnungName, rueckApa, rueckSatz, rueckWas, rueckZufall } from '../lib/loglinrueck-saetze';
  import HilfeLink from './HilfeLink.svelte';

  /**
   * „Rückwärts wie SPSS“ (Field-Stufe 3b) unter den loglinearen Modellen: K-Weg-Tabelle, Schrittzusammenfassung, Endmodell mit beobachtet/erwartet je Zelle.
   * Rechnet im Browser (lib/loglinrueck.ts) aus denselben Zeilen wie das Modell oben; die Wahl von Hand bleibt daneben bestehen und ist der Standard.
   */
  let { e, name }: { e: LogE; name: (n: string) => string } = $props();
  const kennung = $props.id();
  let kriterium = $state(0.05);
  let ergebnis = $state<RueckLauf | null>(null);
  let problem = $state('');
  const ZELLEN_MAX = 200;
  const p3 = (p: number) => (Number.isFinite(p) ? pWert(p).replace(/^= /, '') : '-');
  const z2 = (v: number) => komma(v, 2);

  function rechne() {
    problem = '';
    try {
      const lauf = rueckwaertsAusDaten(e.faktoren, e.haeuf, s.zeilen, s.spalten, kriterium);
      if (Math.round(lauf.tab.n) !== Math.round(e.n)) { problem = L('Die Daten haben sich seit der Rechnung oben geändert. Bitte die Frage neu rechnen.', 'The data have changed since the calculation above. Please recalculate the question.'); ergebnis = null; return; }
      ergebnis = lauf;
      melde(L('Rückwärts-Eliminierung gerechnet.', 'Backward elimination calculated.'));
    } catch { problem = L('Das ließ sich mit diesen Daten nicht rechnen.', 'This could not be calculated with these data.'); ergebnis = null; }
  }
  const zellen = $derived(ergebnis ? zellZeilen(ergebnis.tab, ergebnis.rueck.erwartet, ergebnis.labels) : []);
</script>

<details class="auf" style="margin-top:var(--a4)"><summary>{L('Automatische Suche: Rückwärts wie SPSS (hierarchisch)', 'Automatic search: backward as SPSS (hierarchical)')}</summary>
  <p class="heft-text" data-begriff="rueckwaerts-eliminierung">{rueckWas()} <HilfeLink id="loglinear-rueckwaerts" text={L('Hilfe: Rückwärts-Eliminierung', 'Help: backward elimination')} /></p>
  <p class="heft-text" role="note">{rueckZufall()}</p>
  <div class="eingabe" style="max-width:360px"><label for="lr-krit-{kennung}">{L('Ein Term wird entfernt, wenn sein p größer ist als', 'A term is removed when its p is larger than')}</label>
    <select id="lr-krit-{kennung}" onchange={(ev) => { kriterium = Number(ev.currentTarget.value); if (ergebnis) rechne(); }}>{#each [0.01, 0.05, 0.1] as v (v)}<option value={v} selected={kriterium === v}>{komma(v, 2).replace(/^0/, '')}{v === 0.05 ? ` (${L('wie SPSS', 'as SPSS')})` : ''}</option>{/each}</select></div>
  <p style="margin-top:var(--a2)"><button class="k" type="button" onclick={rechne}>{ergebnis ? L('Neu rechnen', 'Recalculate') : L('Rückwärts-Eliminierung rechnen', 'Calculate backward elimination')}</button></p>
  {#if problem}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{problem}</p>{/if}
  {#if ergebnis}
    {@const r = ergebnis.rueck}
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0" data-begriff="k-weg-effekt">
      <caption><b>{L('K-Weg-Effekte', 'K-way effects')}</b></caption>
      <thead><tr><th scope="col" rowspan="2">{L('Ordnung k', 'Order k')}</th><th scope="colgroup" colspan="4">{L('k-Weg- und höhere Effekte sind 0', 'k-way and higher effects are 0')}</th><th scope="colgroup" colspan="4">{L('genau k-Weg-Effekte sind 0', 'exactly k-way effects are 0')}</th></tr>
        <tr><th scope="col">G²</th><th scope="col">df</th><th scope="col">p</th><th scope="col">X²</th><th scope="col">G²</th><th scope="col">df</th><th scope="col">p</th><th scope="col">X²</th></tr></thead>
      <tbody>{#each ergebnis.kweg as z (z.k)}<tr><th scope="row" style="text-align: start">{ordnungName(z.k)}</th><td style="text-align:right">{z2(z.g2Hoeher)}</td><td style="text-align:right">{komma(z.dfHoeher, 0)}</td><td style="text-align:right">{p3(z.pHoeher)}</td><td style="text-align:right">{z2(z.x2Hoeher)}</td>
        <td style="text-align:right">{z2(z.g2Genau)}</td><td style="text-align:right">{komma(z.dfGenau, 0)}</td><td style="text-align:right">{p3(z.pGenau)}</td><td style="text-align:right">{z2(z.x2Genau)}</td></tr>{/each}</tbody>
    </table></div>
    <p class="hilfe">{kwegHinweis()}</p>

    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Schrittzusammenfassung', 'Step summary')}</b></caption>
      <thead><tr><th scope="col">{L('Schritt', 'Step')}</th><th scope="col">{L('Modell (erzeugende Terme)', 'Model (generating terms)')}</th><th scope="col">{L('Geprüfter Term', 'Term tested')}</th><th scope="col">ΔG²</th><th scope="col">Δdf</th><th scope="col">p</th><th scope="col">{L('Entscheidung', 'Decision')}</th></tr></thead>
      <tbody>{#each r.schritte as st, i (i)}{#each st.kandidaten as c, j (j)}<tr>
        {#if j === 0}<th scope="row" rowspan={st.kandidaten.length} style="text-align: start">{i}</th><td rowspan={st.kandidaten.length}>{modellText(st.gen, e.faktoren, name)}<br><small>G² = {z2(st.g2)}, df = {komma(st.df, 0)}</small></td>{/if}
        <td>{logTermName(c.term, e.faktoren, name)}</td><td style="text-align:right">{z2(c.dG2)}</td><td style="text-align:right">{komma(c.dDf, 0)}</td><td style="text-align:right">{p3(c.p)}</td>
        <td>{st.entfernt && st.entfernt.join('-') === c.term.join('-') ? L('entfernt', 'removed') : L('bleibt', 'kept')}</td></tr>{/each}{/each}</tbody>
    </table></div>
    <p class="hilfe">{L('Schritt 0 ist das Modell mit allen Wechselwirkungen. Jeder Term der erzeugenden Klasse wird probeweise entfernt; ΔG² und Δdf sind der Zuwachs von G² und df gegenüber dem Modell des Schritts.', 'Step 0 is the model with all interactions. Every term of the generating class is removed on trial; ΔG² and Δdf are the increase of G² and df compared with the model of the step.')}</p>

    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Endmodell', 'Final model')}</b></caption>
      <thead><tr><th scope="col">{L('Erzeugende Terme', 'Generating terms')}</th><th scope="col">G²</th><th scope="col">df</th><th scope="col">p</th><th scope="col">X²</th><th scope="col">p (X²)</th></tr></thead>
      <tbody><tr><td>{modellText(r.gen, e.faktoren, name)}</td><td style="text-align:right">{z2(r.g2)}</td><td style="text-align:right">{komma(r.df, 0)}</td><td style="text-align:right">{p3(r.p)}</td><td style="text-align:right">{z2(r.x2)}</td><td style="text-align:right">{p3(r.pX2)}</td></tr></tbody>
    </table></div>
    <p class="heft-text" use:ergebnisAnsage>{rueckSatz(r, e.faktoren, name)} <span class="hilfe">({rueckApa(r)})</span></p>

    <details class="auf" style="margin-top:var(--a2)"><summary>{L('Beobachtet und erwartet je Zelle (Endmodell)', 'Observed and expected per cell (final model)')}</summary>
      <div style="overflow-x:auto;max-height:420px"><table class="apa" style="margin:var(--a2) 0">
        <caption class="nur-sr">{L('Beobachtete und erwartete Häufigkeiten je Zelle des Endmodells', 'Observed and expected frequencies per cell of the final model')}</caption>
        <thead><tr>{#each e.faktoren as f, j (j)}<th scope="col">{name(f)}</th>{/each}<th scope="col">{L('Beobachtet', 'Observed')}</th><th scope="col">{L('Erwartet', 'Expected')}</th><th scope="col">{L('Rest', 'Residual')}</th><th scope="col">{L('Std. Rest', 'Std. residual')}</th></tr></thead>
        <tbody>{#each zellen.slice(0, ZELLEN_MAX) as z, i (i)}<tr>{#each z.stufen as st, j (j)}<th scope="row" style="text-align: start;font-weight:normal">{st}</th>{/each}<td style="text-align:right">{komma(z.beob, 0)}</td><td style="text-align:right">{z2(z.erw)}</td><td style="text-align:right">{z2(z.rest)}</td><td style="text-align:right">{Number.isFinite(z.stdRest) ? z2(z.stdRest) : '-'}</td></tr>{/each}</tbody>
      </table></div>
      {#if zellen.length > ZELLEN_MAX}<p class="hilfe">{L(`Gezeigt sind die ersten ${ZELLEN_MAX} von ${zellen.length} Zellen.`, `The first ${ZELLEN_MAX} of ${zellen.length} cells are shown.`)}</p>{/if}
      <p class="hilfe">{L('Rest = beobachtet minus erwartet; Std. Rest = Rest geteilt durch die Wurzel der erwarteten Häufigkeit.', 'Residual = observed minus expected; std. residual = residual divided by the square root of the expected frequency.')}</p>
    </details>
  {/if}
</details>
