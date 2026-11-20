<script lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  /**
   * Varianzanalyse mit ZWEI Messwiederholungsfaktoren (A × B), auch gemischt mit einer Gruppenspalte (Field-Stufe 3). Steht unter dem Ergebnis der Messwiederholung: Die dort gewählten
   * Spalten sind die Zellen; hier wird das Raster (Faktor A Stufen × Faktor B Stufen) festgelegt. Jeder Effekt hat seinen eigenen Fehlerterm; Greenhouse-Geisser und Huynh-Feldt;
   * ηp² und ηG²; einfache Haupteffekte mit Holm; Kontraste je Faktor. Rechnung: lib/messwiederholung2.ts, Zahlen gegen R (afex::aov_ez) geprüft.
   */
  import { untrack } from 'svelte';
  import HilfeLink from './HilfeLink.svelte';
  import MwKontrasteBlock from './MwKontrasteBlock.svelte';
  import { L, s, melde } from '../lib/sitzung.svelte';
  import { mwZeilen } from '../lib/mwdaten';
  import { komma, ohneNull, pWert } from '../lib/ergebnis';
  import { effektName, einfacheEffekte, korrigiert2, messwiederholung2, rasterVorschlag, stufenWerte, QUELLEN_MIT_GRUPPE, QUELLEN_OHNE_GRUPPE, type Mw2 } from '../lib/messwiederholung2';
  import type { MwKorrektur } from '../lib/messwiederholung';
  import { einfachSatz, mw2Satz } from '../lib/mehrfaktorsaetze';

  let { spalten, gruppenSpalte, name }: { spalten: string[]; gruppenSpalte?: string; name: (n: string) => string } = $props();
  const kennung = $props.id();
  const k = $derived(spalten.length);
  /** Mögliche Stufenzahlen von Faktor A: Teiler von k, beide Faktoren mit mindestens zwei Stufen. */
  const teiler = $derived(Array.from({ length: Math.max(0, Math.floor(k / 2) - 1) }, (_, i) => i + 2).filter(d => k % d === 0));
  let aN = $state(0);
  let faktorA = $state(''), faktorB = $state('');
  let stufenA = $state<string[]>([]), stufenB = $state<string[]>([]);
  let zuordnung = $state<number[]>([]);
  let kor = $state<MwKorrektur>('gg');
  const bN = $derived(aN > 0 ? k / aN : 0);

  function beginnen(neuA?: number) {
    const v = rasterVorschlag(spalten.map(n => name(n)));
    const a = neuA ?? (v ? v.a.length : teiler[0] ?? 0), b = a > 0 ? k / a : 0;
    aN = a;
    const passt = v && v.a.length === a;
    stufenA = Array.from({ length: a }, (_, i) => (passt ? v!.a[i]! : `${L('Stufe', 'Level')} ${i + 1}`));
    stufenB = Array.from({ length: b }, (_, j) => (passt ? v!.b[j]! : `${L('Stufe', 'Level')} ${j + 1}`));
    zuordnung = passt ? v!.reihenfolge : Array.from({ length: k }, (_, i) => i);
    if (!faktorA) faktorA = L('Faktor A', 'Factor A');
    if (!faktorB) faktorB = L('Faktor B', 'Factor B');
  }
  let zuletzt = '';
  $effect(() => { const schl = spalten.join('\u0001'); if (schl !== zuletzt) { zuletzt = schl; untrack(() => beginnen()); } });

  /** Die Zeilen mit allen Zellen (und Gruppe), Spalten in der Reihenfolge des Rasters. */
  const daten = $derived.by(() => {
    if (aN < 2 || zuordnung.length !== k || new Set(zuordnung).size !== k) return null;
    return mwZeilen(zuordnung.map(i => spalten[i]!), gruppenSpalte);
  });
  const rechnung = $derived.by((): { e: Mw2 } | { fehler: string } | null => {
    if (!daten) return null;
    try {
      const e = messwiederholung2(daten.zeilen, aN, bN, { faktorA, faktorB, stufenA, stufenB, gruppen: daten.gruppen, gruppenSpalte: gruppenSpalte ? name(gruppenSpalte) : undefined, gesamt: s.zeilen.length });
      return { e };
    } catch (x) { return { fehler: (x as Error).message }; }
  });
  const e = $derived(rechnung && 'e' in rechnung ? { ...rechnung.e, korrektur: kor } : null);
  const doppelt = $derived(zuordnung.length === k && new Set(zuordnung).size !== k);
  const quellen = $derived(e && e.gruppen.length > 1 ? QUELLEN_MIT_GRUPPE : QUELLEN_OHNE_GRUPPE);
  const eff = (q: string) => e!.effekte.find(x => x.quelle === q)!;
  const einfach = $derived(e && daten ? einfacheEffekte(daten.zeilen, aN, bN, stufenA, stufenB, kor, e.gruppen.length > 1 ? daten.gruppen : undefined) : null);
  const bedeutsamWechsel = $derived(e ? e.effekte.some(x => x.quelle.length >= 2 && korrigiert2(e, x, kor).p < 0.05) : false);
  const z3 = (v: number) => komma(v, 3);
  const pT = (p: number) => pWert(p).replace('= ', '');
  const zellName = (j: number) => `${stufenA[Math.floor(j / bN)]} × ${stufenB[j % bN]}`;
  const KOR: [MwKorrektur, string, string | undefined][] = $derived([['gg', L('Greenhouse-Geisser (Standard)', 'Greenhouse-Geisser (default)'), 'greenhouse-geisser'], ['hf', 'Huynh-Feldt', 'huynh-feldt'], ['keine', L('Keine', 'None'), undefined]]);
  const saetze = $derived(e ? quellen.map(q => mw2Satz(e, eff(q), kor)) : []);
</script>

<details class="auf" style="margin-top:var(--a4)"><summary>{L('Zwei Messwiederholungsfaktoren (A × B), auch mit Gruppen', 'Two repeated-measures factors (A × B), also with groups')}</summary>
  <p class="heft-text">{L('Sind die gewählten Spalten die Zellen eines Rasters, zum Beispiel drei Zeitpunkte, jeweils morgens und abends gemessen? Dann gibt es zwei Messwiederholungsfaktoren (Innersubjektfaktoren). Jeder Effekt (A, B und A × B) bekommt seinen eigenen Fehlerterm aus Effekt × Person, mit Greenhouse-Geisser- oder Huynh-Feldt-Korrektur. Mit einer Gruppenspalte kommt ein Zwischensubjektfaktor dazu: dann gibt es sieben Effekte. Hier legt die Zuordnung fest, welche Spalte in welche Zelle gehört.', 'Are the chosen columns the cells of a grid, for example three time points, each measured in the morning and in the evening? Then there are two repeated-measures factors (within-subject factors). Each effect (A, B and A × B) gets its own error term from effect × person, with a Greenhouse-Geisser or Huynh-Feldt correction. With a grouping column a between-subject factor is added: then there are seven effects. The assignment here decides which column belongs in which cell.')}</p>
  <p class="hilfe"><HilfeLink id="innersubjektfaktor" text={L('Hilfe: Innersubjektfaktor (Messwiederholungsfaktor)', 'Help: within-subject factor (repeated-measures factor)')} /> <HilfeLink id="zwischensubjektfaktor" text={L('Hilfe: Zwischensubjektfaktor', 'Help: between-subject factor')} /> <HilfeLink id="greenhouse-geisser" text={L('Hilfe: Greenhouse-Geisser und Huynh-Feldt', 'Help: Greenhouse-Geisser and Huynh-Feldt')} /> <HilfeLink id="generalisiertes-eta" text={L('Hilfe: Generalisiertes Eta-Quadrat', 'Help: generalised eta squared')} /></p>
  {#if teiler.length === 0}
    <p class="heft-text" use:ergebnisAnsage>{L('Dafür braucht es mindestens vier Spalten, die sich als Raster ordnen lassen (4, 6, 8, 9 und so weiter). Mit der jetzigen Auswahl geht das nicht.', 'This needs at least four columns that can be arranged as a grid (4, 6, 8, 9 and so on). The current choice does not allow that.')}</p>
  {:else}
    <div class="einst-gruppe">
      <h3 id="mz-r-{kennung}">{L('Raster festlegen', 'Set up the grid')}</h3>
      <div class="eingabe" style="max-width:420px"><label for="mz-a-{kennung}">{L('Stufen von Faktor A (Faktor B bekommt den Rest)', 'Levels of factor A (factor B gets the rest)')}</label>
        <select id="mz-a-{kennung}" value={aN} onchange={ev => { beginnen(Number((ev.currentTarget as HTMLSelectElement).value)); melde(L(`Raster: ${aN} mal ${bN}.`, `Grid: ${aN} by ${bN}.`)); }}>{#each teiler as d (d)}<option value={d}>{d} × {k / d}</option>{/each}</select></div>
      <div class="eingabe" style="max-width:420px"><label for="mz-na-{kennung}">{L('Name von Faktor A', 'Name of factor A')}</label><input id="mz-na-{kennung}" type="text" bind:value={faktorA}></div>
      <div class="eingabe" style="max-width:420px"><label for="mz-nb-{kennung}">{L('Name von Faktor B', 'Name of factor B')}</label><input id="mz-nb-{kennung}" type="text" bind:value={faktorB}></div>
      <fieldset style="margin:var(--a2) 0"><legend>{L(`Stufen von ${faktorA}`, `Levels of ${faktorA}`)}</legend>
        {#each stufenA as _, i (i)}<div class="eingabe" style="display:inline-block;margin-inline-end:var(--a2)"><label for="mz-sa-{kennung}-{i}" class="nur-vorleser">{L(`Name der Stufe ${i + 1} von ${faktorA}`, `Name of level ${i + 1} of ${faktorA}`)}</label><input id="mz-sa-{kennung}-{i}" type="text" size="12" bind:value={stufenA[i]}></div>{/each}</fieldset>
      <fieldset style="margin:var(--a2) 0"><legend>{L(`Stufen von ${faktorB}`, `Levels of ${faktorB}`)}</legend>
        {#each stufenB as _, j (j)}<div class="eingabe" style="display:inline-block;margin-inline-end:var(--a2)"><label for="mz-sb-{kennung}-{j}" class="nur-vorleser">{L(`Name der Stufe ${j + 1} von ${faktorB}`, `Name of level ${j + 1} of ${faktorB}`)}</label><input id="mz-sb-{kennung}-{j}" type="text" size="12" bind:value={stufenB[j]}></div>{/each}</fieldset>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Welche Spalte gehört in welche Zelle?', 'Which column belongs in which cell?')}</b></caption>
        <thead><tr><th scope="col">{faktorA} \ {faktorB}</th>{#each stufenB as x, j (j)}<th scope="col">{x}</th>{/each}</tr></thead>
        <tbody>{#each stufenA as xa, i (i)}<tr><th scope="row" style="text-align: start">{xa}</th>
          {#each stufenB as xb, j (j)}<td><select aria-label={`${faktorA} ${xa}, ${faktorB} ${xb}`} value={zuordnung[i * bN + j]} onchange={ev => { zuordnung[i * bN + j] = Number((ev.currentTarget as HTMLSelectElement).value); }}>{#each spalten as sp, q (q)}<option value={q}>{name(sp)}</option>{/each}</select></td>{/each}</tr>{/each}</tbody>
      </table></div>
      {#if doppelt}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{L('Jede Spalte darf nur in einer Zelle stehen. Statable rechnet erst, wenn jede Spalte genau einmal vorkommt.', 'Each column may appear in one cell only. Statable calculates only when every column appears exactly once.')}</p>{/if}
    </div>

    {#if rechnung && 'fehler' in rechnung}<p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{rechnung.fehler}</p>{/if}
    {#if e}
      <div class="korr-wahl" role="radiogroup" aria-labelledby="mz-k-{kennung}">
        <h3 id="mz-k-{kennung}" style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Korrektur für die Sphärizität', 'Correction for sphericity')}</h3>
        <div class="segment">{#each KOR as [w, tx, be] (w)}<label data-begriff={be}><input type="radio" name="mz-kor-{kennung}" value={w} checked={kor === w} onchange={() => { kor = w; melde(L(`Jetzt: ${tx}.`, `Now: ${tx}.`)); }}>{tx}</label>{/each}</div>
      </div>
      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L(`Varianzanalyse mit Messwiederholung: ${faktorA} × ${faktorB}${e.gruppen.length > 1 ? ' × ' + (e.gruppenSpalte ?? L('Gruppe', 'Group')) : ''}`, `Repeated-measures analysis of variance: ${faktorA} × ${faktorB}${e.gruppen.length > 1 ? ' × ' + (e.gruppenSpalte ?? L('Group', 'Group')) : ''}`)} (n = {e.n})</b></caption>
        <thead><tr><th scope="col">{L('Effekt', 'Effect')}</th><th scope="col">F</th><th scope="col">df 1</th><th scope="col">df 2</th><th scope="col">ε</th><th scope="col">p</th><th scope="col">ηp²</th><th scope="col">{L('95 %-KI ηp²', '95% CI ηp²')}</th><th scope="col">ηG²</th></tr></thead>
        <tbody>{#each quellen as q (q)}{@const x = eff(q)}{@const c = korrigiert2(e, x, kor)}<tr><th scope="row" style="text-align: start">{effektName(e, q)}</th><td style="text-align:right">{komma(x.f, 2)}</td><td style="text-align:right">{komma(c.df1, c.df1 === Math.round(c.df1) ? 0 : 2)}</td><td style="text-align:right">{komma(c.df2, c.df2 === Math.round(c.df2) ? 0 : 2)}</td><td style="text-align:right">{q === 'g' || c.eps === 1 ? '-' : ohneNull(c.eps, 3)}</td><td style="text-align:right">{pT(c.p)}</td><td style="text-align:right">{ohneNull(x.etaP, 3)}</td><td style="text-align:right">{ohneNull(x.etaPLo, 2)} bis {ohneNull(x.etaPHi, 2)}</td><td style="text-align:right">{ohneNull(x.etaG, 3)}</td></tr>{/each}</tbody>
      </table></div>
      <p class="heft-text">{L(`Greenhouse-Geisser-ε und Huynh-Feldt-ε je Effekt: ${quellen.filter(q => q !== 'g').map(q => `${effektName(e, q)} ${ohneNull(eff(q).epsGG, 3)} / ${ohneNull(eff(q).epsHF, 3)}`).join('; ')}. ε = 1 heißt: Sphärizität erfüllt; die Freiheitsgrade stehen schon mit ε multipliziert, wenn eine Korrektur gewählt ist. Bei Effekten mit nur einem Freiheitsgrad gibt es keine Korrektur (-).`, `Greenhouse-Geisser ε and Huynh-Feldt ε per effect: ${quellen.filter(q => q !== 'g').map(q => `${effektName(e, q)} ${ohneNull(eff(q).epsGG, 3)} / ${ohneNull(eff(q).epsHF, 3)}`).join('; ')}. ε = 1 means: sphericity met; the degrees of freedom are already multiplied by ε when a correction is chosen. Effects with only one degree of freedom have no correction (-).`)}</p>
      <ul class="heft-text">{#each saetze as t (t)}<li>{t}</li>{/each}</ul>
      <p class="heft-text">{L('ηG² (generalisiertes Eta-Quadrat) zieht alle Fehlerquadratsummen in den Nenner und ist deshalb zwischen Designs mit und ohne Messwiederholung vergleichbar; ηp² (partielles Eta-Quadrat) fällt größer aus. Die Quadratsummen sind vom Typ III (wie afex, SPSS und jamovi); bei gleich großen Gruppen sind alle Typen gleich.', 'ηG² (generalised eta squared) puts all error sums of squares in the denominator and is therefore comparable between designs with and without repeated measures; ηp² (partial eta squared) comes out larger. The sums of squares are Type III (as in afex, SPSS and jamovi); with equal group sizes all types are the same.')}</p>

      <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
        <caption><b>{L('Mittelwerte und Standardabweichungen je Zelle', 'Means and standard deviations per cell')}</b></caption>
        <thead><tr><th scope="col">{L('Zelle', 'Cell')}</th>{#each e.gruppen as g, q (q)}<th scope="col">{e.gruppen.length > 1 ? `${g.name} (n = ${g.n})` : `M (SD), n = ${g.n}`}</th>{/each}</tr></thead>
        <tbody>{#each e.randZellen as _, j (j)}<tr><th scope="row" style="text-align: start">{zellName(j)}</th>{#each e.zellen as z, q (q)}<td style="text-align:right">{komma(z[j]!.m, 2)} ({komma(z[j]!.sd, 2)})</td>{/each}</tr>{/each}</tbody>
      </table></div>
      {#if e.levene.length}
        <details class="auf"><summary>{L('Levene-Test je Zelle über die Gruppen (nur Hinweis)', 'Levene test per cell across the groups (hint only)')}</summary>
          <p class="heft-text">{L('Prüft für jede Zelle, ob die Gruppen gleich stark streuen. Der Test dient nur als Hinweis; er entscheidet nichts. Bei sehr kleinen Gruppen ist er schwach.', 'Tests for each cell whether the groups spread equally. The test is a hint only; it decides nothing. With very small groups it is weak.')}</p>
          <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0"><caption><b>{L('Levene-Test je Zelle', 'Levene test per cell')}</b></caption>
            <thead><tr><th scope="col">{L('Zelle', 'Cell')}</th><th scope="col">F</th><th scope="col">df 1</th><th scope="col">df 2</th><th scope="col">p</th></tr></thead>
            <tbody>{#each e.levene as l (l.zelle)}<tr><th scope="row" style="text-align: start">{zellName(l.zelle)}</th><td style="text-align:right">{komma(l.f, 2)}</td><td style="text-align:right">{l.df1}</td><td style="text-align:right">{l.df2}</td><td style="text-align:right">{pT(l.p)}</td></tr>{/each}</tbody></table></div>
        </details>
      {/if}

      {#if einfach}
        <details class="auf" open={bedeutsamWechsel}><summary>{L('Einfache Haupteffekte (nach bedeutsamer Wechselwirkung)', 'Simple main effects (after a significant interaction)')}</summary>
          <p class="heft-text">{bedeutsamWechsel
            ? L('Eine Wechselwirkung ist bedeutsam: Dann zeigen die einfachen Haupteffekte, wo der Effekt auftritt. Jeder einfache Haupteffekt ist eine eigene Varianzanalyse mit Messwiederholung auf den Zellen dieser Stufe; die p-Werte sind nach Holm angepasst.', 'An interaction is significant: the simple main effects then show where the effect occurs. Each simple main effect is a separate repeated-measures analysis of variance on the cells of that level; the p values are adjusted by Holm.')
            : L('Keine Wechselwirkung ist bedeutsam. Einfache Haupteffekte sind dann meist nicht nötig; sie stehen hier zum Nachsehen. Jeder ist eine eigene Varianzanalyse mit Messwiederholung auf den Zellen dieser Stufe, die p-Werte sind nach Holm angepasst.', 'No interaction is significant. Simple main effects are then usually not needed; they are given here for reference. Each is a separate repeated-measures analysis of variance on the cells of that level, with p values adjusted by Holm.')}</p>
          <p class="hilfe"><HilfeLink id="einfacher-haupteffekt" text={L('Hilfe: Einfacher Haupteffekt', 'Help: simple main effect')} /> <HilfeLink id="holm" text={L('Hilfe: Holm-Verfahren', 'Help: Holm procedure')} /></p>
          {#each [[faktorA, faktorB, einfach.aJeB], [faktorB, faktorA, einfach.bJeA], ...(e.gruppen.length > 1 ? [[e.gruppenSpalte ?? L('Gruppe', 'Group'), faktorA, einfach.gruppeJeA], [e.gruppenSpalte ?? L('Gruppe', 'Group'), faktorB, einfach.gruppeJeB]] : [])] as [wer, wo, z] (`${wer}|${wo}`)}
            {#if (z as unknown[]).length}
              <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0"><caption><b>{L(`${wer} je Stufe von ${wo}`, `${wer} at each level of ${wo}`)}</b></caption>
                <thead><tr><th scope="col">{wo}</th><th scope="col">F</th><th scope="col">df 1</th><th scope="col">df 2</th><th scope="col">p</th><th scope="col">p ({L('Holm-angepasst', 'Holm-adjusted')})</th></tr></thead>
                <tbody>{#each z as x (x.stufe)}<tr><th scope="row" style="text-align: start">{x.stufe}</th><td style="text-align:right">{komma(x.f, 2)}</td><td style="text-align:right">{komma(x.df1, x.df1 === Math.round(x.df1) ? 0 : 2)}</td><td style="text-align:right">{komma(x.df2, x.df2 === Math.round(x.df2) ? 0 : 2)}</td><td style="text-align:right">{pT(x.p)}</td><td style="text-align:right">{pT(x.pHolm)}</td></tr>{/each}</tbody></table></div>
              <p class="heft-text">{einfachSatz(wer as string, wo as string, z as never)}</p>
            {/if}
          {/each}
        </details>
      {/if}

      {#if daten}
        <MwKontrasteBlock werte={stufenWerte(daten.zeilen, aN, bN, 'a')} stufen={stufenA} gruppen={e.gruppen.length > 1 ? daten.gruppen : undefined} faktor={faktorA} />
        <MwKontrasteBlock werte={stufenWerte(daten.zeilen, aN, bN, 'b')} stufen={stufenB} gruppen={e.gruppen.length > 1 ? daten.gruppen : undefined} faktor={faktorB} />
      {/if}
    {/if}
  {/if}
</details>
