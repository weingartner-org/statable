<script lang="ts">
  import HilfeLink from './HilfeLink.svelte';
  import { untrack } from 'svelte';
  import { L, d, melde, sichern } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { HINWEIS_NICHT_VERWENDET } from '../lib/gewichte';
  import { ohneNull } from '../lib/ergebnis';
  import {
    ESD_K_ANTEIL, ESD_K_MAX, ausreisserAngebot, dixon, esd, grubbs, hinweisSatz, satzDixon, satzEsd, satzGrubbs,
    type AusreisserHinweisArt
  } from '../lib/ausreisser';
  import { einseitigSatz, mehrereSatz, mehrfachTestSatz, regelGegenTestSatz, tabelleAusreisser, ungewoehnlichSatz, wiederholenSatz, dixonGrenzeSatz } from '../lib/ausreissersaetze';
  import { holeWunsch } from '../lib/ausreisserwunsch.svelte';
  import { leereAusreisser, spalteGilt, zahlenSpalten, zahlenWerte, type AusreisserWahl } from '../lib/verteilungwege';
  import Ausgabe from './Ausgabe.svelte';

  /**
   * „Ausreißer prüfen“ unter dem Ergebnis von „Wie verteilt sich etwas?“ (Später, Welle S-D, T2): Grubbs (ein Wert, ab 7 Werten), generalisierter ESD (bis zu k Werte, ab 25) und Dixon r10 (3 bis 10 Werte).
   * Nur ein HINWEIS: Der Fall bleibt in den Daten, Statable bietet keinen Knopf zum Entfernen; M und SD stehen mit und ohne die gemeldeten Werte da. Die Wahl gehört zum Blatt (`blatt.weg.ausreisser`).
   * Der Daten-Check führt über „Mit einem Test genauer prüfen“ hierher (lib/ausreisserwunsch.svelte.ts).
   */
  let { blatt }: { blatt: Blatt } = $props();
  const kennung = $props.id();

  const spalten = $derived(zahlenSpalten(blatt));
  const wahl = $derived<AusreisserWahl>({ ...leereAusreisser(), ...(blatt.weg?.ausreisser ?? {}) });
  const spalte = $derived(spalteGilt(wahl, spalten));
  function setze(neu: Partial<AusreisserWahl>, satz?: string) {
    blatt.weg = { ...blatt.weg, ausreisser: { ...wahl, spalte, ...neu } };
    void sichern();
    if (satz) melde(satz);
  }
  // Kommt jemand vom Daten-Check, ist der Test gleich angeschaltet.
  $effect(() => { untrack(() => { const w = holeWunsch(); if (w && spalten.some(x => x.name === w)) setze({ an: true, spalte: w }); }); });

  const x = $derived(wahl.an && spalte ? zahlenWerte(spalte) : []);
  const n = $derived(x.filter(v => v !== null).length);
  const angebot = $derived(ausreisserAngebot(n));
  /** Der Test, der gerechnet wird: der gewählte, wenn er bei dieser Zahl von Werten angeboten wird, sonst Grubbs oder Dixon. */
  const test = $derived(angebot[wahl.test] ? wahl.test : angebot.grubbs ? 'grubbs' : angebot.dixon ? 'dixon' : wahl.test);
  const kMax = $derived(Math.max(1, Math.min(ESD_K_MAX, Math.floor(ESD_K_ANTEIL * n))));
  const k = $derived(Math.min(wahl.k, kMax));
  const lauf = $derived.by(() => {
    if (!wahl.an || !spalte) return null;
    if (test === 'grubbs') return { grubbs: grubbs(x, { alpha: wahl.alpha, seite: wahl.seite }) };
    if (test === 'esd') return { esd: esd(x, { alpha: wahl.alpha, k }) };
    return { dixon: dixon(x, { alpha: wahl.alpha }) };
  });
  const label = $derived(spalten.find(s => s.name === spalte)?.label ?? spalte);
  const satz = $derived(!lauf ? '' : lauf.grubbs ? satzGrubbs(lauf.grubbs) : lauf.esd ? satzEsd(lauf.esd) : lauf.dixon ? satzDixon(lauf.dixon) : '');
  const hinweise = $derived<AusreisserHinweisArt[]>(lauf?.grubbs?.hinweise ?? lauf?.esd?.hinweise ?? []);
  const fehler = $derived(lauf?.grubbs?.fehler ?? lauf?.esd?.fehler ?? lauf?.dixon?.fehler ?? null);
  const tabelle = $derived(lauf && !fehler ? tabelleAusreisser(label, lauf) : null);
  const nenne = (t: 'grubbs' | 'esd' | 'dixon') => (t === 'grubbs' ? L('Grubbs (ein Wert)', 'Grubbs (one value)') : t === 'esd' ? L('Generalisierter ESD (mehrere Werte)', 'Generalized ESD (several values)') : L('Dixon (kleine Stichprobe)', 'Dixon (small sample)'));
</script>

<details class="auf" style="margin-top:var(--a4)" open={wahl.an}><summary>{L('Weitere Wege: Ausreißer prüfen', 'More options: check for outliers')}</summary>
  <p class="hilfe"><HilfeLink id="ausreisser-tests" text={L('Hilfe: Ausreißertests', 'Help: outlier tests')} /></p>
  <p class="heft-text" style="margin:var(--a2) 0">{d('Ein Test fragt, ob ein auffälliger Wert bei einer Normalverteilung ungewöhnlich wäre. Er sagt nicht, ob der Wert ein Fehler ist: Dein Fall bleibt in den Daten, und Statable entfernt nichts.',
    'Ein Test fragt, ob ein auffälliger Wert bei einer Normalverteilung ungewöhnlich wäre. Er sagt nicht, ob der Wert ein Fehler ist: Ihr Fall bleibt in den Daten, und Statable entfernt nichts.',
    'A test asks whether a conspicuous value would be unusual with a normal distribution. It does not say whether the value is an error: your case stays in the data, and Statable removes nothing.')}</p>
  {#if !spalten.length}
    <p class="heft-text">{L('Dieses Blatt hat keine Zahlenspalte, die sich auf Ausreißer prüfen ließe.', 'This page has no number column that could be checked for outliers.')}</p>
  {:else}
    <label data-begriff="ausreisser" class="schalter"><input type="checkbox" checked={wahl.an} onchange={(ev) => setze({ an: ev.currentTarget.checked }, ev.currentTarget.checked ? L('Ausreißertest wird gerechnet.', 'The outlier test is being calculated.') : L('Ausreißertest ausgeblendet.', 'Outlier test hidden.'))}>{L('Ausreißer prüfen', 'Check for outliers')}</label>
    {#if wahl.an}
      {#if blatt.gewicht}<p class="hilfe" role="note">{HINWEIS_NICHT_VERWENDET()}</p>{/if}
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:var(--a3);margin-top:var(--a3)">
        {#if spalten.length > 1}
          <div class="eingabe"><label for="aus-sp-{kennung}">{L('Welche Spalte?', 'Which column?')}</label>
            <select id="aus-sp-{kennung}" value={spalte} onchange={(ev) => setze({ spalte: ev.currentTarget.value })}>{#each spalten as sp (sp.name)}<option value={sp.name}>{sp.label}</option>{/each}</select></div>
        {/if}
      </div>
      <p class="hilfe" style="margin-top:var(--a2)">{L(`In dieser Spalte stehen ${n} Werte.`, `This column contains ${n} values.`)}</p>
      <div class="segment" role="radiogroup" aria-label={L('Test', 'Test')} style="margin-top:var(--a2)">
        {#each ['grubbs', 'esd', 'dixon'] as t (t)}<label><input type="radio" name="aus-t-{kennung}" value={t} checked={test === t} disabled={!angebot[t as 'grubbs' | 'esd' | 'dixon']} onchange={() => setze({ test: t as AusreisserWahl['test'] })}>{nenne(t as 'grubbs' | 'esd' | 'dixon')}</label>{/each}
      </div>
      <p class="hilfe" style="margin-top:var(--a2)">{L('Grubbs ab 7 Werten, der generalisierte ESD-Test ab 25 Werten, Dixon von 3 bis 10 Werten.', 'Grubbs from 7 values, the generalized ESD test from 25 values, Dixon for 3 to 10 values.')}</p>
      <div class="segment" role="radiogroup" aria-label={L('Niveau', 'Level')} style="margin-top:var(--a2)">
        {#each [0.1, 0.05, 0.01] as a (a)}<label data-begriff="signifikanzniveau"><input type="radio" name="aus-a-{kennung}" value={a} checked={wahl.alpha === a} onchange={() => setze({ alpha: a as AusreisserWahl['alpha'] })}>{L(`Niveau ${ohneNull(a, 2)}`, `Level ${ohneNull(a, 2)}`)}</label>{/each}
      </div>
      {#if test === 'grubbs'}
        <div class="segment" role="radiogroup" aria-label={L('Richtung', 'Direction')} style="margin-top:var(--a2)">
          <label data-begriff="einseitig-zweiseitig"><input type="radio" name="aus-s-{kennung}" value="beide" checked={wahl.seite === 'beide'} onchange={() => setze({ seite: 'beide' })}>{L('zweiseitig (Voreinstellung)', 'two-sided (default)')}</label>
          <label data-begriff="einseitig-zweiseitig"><input type="radio" name="aus-s-{kennung}" value="oben" checked={wahl.seite === 'oben'} onchange={() => setze({ seite: 'oben' })}>{L('nur zu hohe Werte', 'only too high values')}</label>
          <label data-begriff="einseitig-zweiseitig"><input type="radio" name="aus-s-{kennung}" value="unten" checked={wahl.seite === 'unten'} onchange={() => setze({ seite: 'unten' })}>{L('nur zu niedrige Werte', 'only too low values')}</label>
        </div>
        {#if wahl.seite !== 'beide'}<p class="hilfe" role="note">{einseitigSatz()}</p>{/if}
      {/if}
      {#if test === 'esd' && kMax > 1}
        <div class="eingabe" style="margin-top:var(--a2);max-width:16rem"><label for="aus-k-{kennung}">{L('Höchstens so viele Ausreißer suchen', 'Look for at most this many outliers')}</label>
          <select id="aus-k-{kennung}" value={k} onchange={(ev) => setze({ k: Number(ev.currentTarget.value) })}>{#each Array.from({ length: kMax }, (_, i) => i + 1) as q (q)}<option value={q}>{q}</option>{/each}</select></div>
        <p class="hilfe">{L(`Möglich sind bis zu ${kMax} (höchstens 10 und höchstens ein Fünftel der Werte).`, `Up to ${kMax} are possible (at most 10 and at most one fifth of the values).`)}</p>
      {/if}

      {#if lauf}
        <p class="ergebnis-satz" style="margin-top:var(--a4)">{satz}</p>
        {#if !fehler}
          {#each hinweise as h (h)}<p class="heft-text" style="margin-top:var(--a2)" role="note">{hinweisSatz(h)}</p>{/each}
          {#if tabelle}<div style="margin-top:var(--a3)"><Ausgabe items={[tabelle]} nurTabellen /></div>{/if}
          {#if test === 'grubbs' && lauf.grubbs && !lauf.grubbs.gefunden && angebot.esd}<p class="hilfe" style="margin-top:var(--a2)">{mehrereSatz()}</p>{/if}
          {#if test === 'dixon'}<p class="hilfe">{dixonGrenzeSatz()}</p>{/if}
          <p class="hilfe" style="margin-top:var(--a2)">{ungewoehnlichSatz()}</p>
          <p class="hilfe">{regelGegenTestSatz()}</p>
          <p class="hilfe">{wiederholenSatz()}</p>
          <p class="hilfe">{mehrfachTestSatz()}</p>
        {:else if !angebot.grubbs && !angebot.esd && !angebot.dixon}
          <p class="hilfe" style="margin-top:var(--a2)">{L('Für diese Zahl von Werten gibt es hier keinen Test.', 'There is no test for this number of values here.')}</p>
        {/if}
      {/if}
    {/if}
  {/if}
</details>
