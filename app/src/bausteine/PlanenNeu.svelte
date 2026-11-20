<script lang="ts">
  /**
   * „Studie planen“, Später S-D (M9): Anteile, Überleben (Log-Rank) und AUC. Eingaben und Rechnung: lib/planneu.svelte.ts, Formeln: lib/power.ts.
   * Die Seite fragt nach dem ERWARTETEN Effekt (kein Post-hoc). Bei zwei Anteilen zuerst: „Welchen Test rechnest du später?“ - die Zahl hängt davon ab.
   * Fishers exakter Test wird durch Aufzählung gerechnet (bis 400 je Gruppe) und zeigt dabei die Lade-Animation mit „Abbrechen“.
   */
  import type { Snippet } from 'svelte';
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { s, d, L, istEn, melde } from '../lib/sitzung.svelte';
  import { dezimal, ganzZahl, mitNull } from '../i18n/profil';
  import { zahlDe } from '../lib/format';
  import { satzAnteile, satzAuc, satzLogRank, ausfallZuschlag, FISHER_MAX, planPruefung, type Fmt } from '../lib/power';
  import { planNeu as pn } from '../lib/planneu.svelte';
  import Rechnet from './Rechnet.svelte';
  import Icon from './Icon.svelte';
  import HilfeLink from './HilfeLink.svelte';

  let { testWahl }: { testWahl: Snippet } = $props();

  const fmt = $derived<Fmt>({ en: istEn(), punkt: dezimal() === '.' });
  const kz = (v: number, st = 2) => zahlDe(v, st);
  const apa = (v: number, st = 2) => (mitNull() ? zahlDe(v, st) : zahlDe(v, st).replace(/^(−?)0(?=[.,])/, '$1'));   // ,80 statt 0,80
  const ganz = ganzZahl;
  const prozent = (v: number) => `${zahlDe(v * 100, 0)} %`;

  /* ---------- Fisher: läuft von selbst, wenn gewählt oder dazugerechnet ---------- */
  $effect(() => {
    // jede Eingabe, die in den Schlüssel von starteFisher() eingeht, löst hier den Lauf aus (nach kurzer Pause, damit Tippen nicht jedes Mal rechnet)
    void [pn.art, pn.anzahl, pn.verfahren2, pn.anteilGueltig, pn.p1, pn.p2, pn.alpha, pn.power, pn.seiten, pn.k, pn.fisherDazu];
    const timer = setTimeout(() => pn.starteFisher(), 250);
    return () => clearTimeout(timer);
  });
  $effect(() => { if (pn.verfahren2 === 'fisher') pn.fisherDazu = true; });

  /* ---------- Texte zu den Prüfcodes ---------- */
  const fehlerText = (f: string) => ({
    gleich: d('Die beiden Anteile sind gleich - dann gibt es keinen Unterschied zu finden. Gib zwei verschiedene Anteile ein.', 'Die beiden Anteile sind gleich - dann gibt es keinen Unterschied zu finden. Geben Sie zwei verschiedene Anteile ein.', 'The two proportions are equal - then there is no difference to find. Enter two different proportions.'),
    rand: L('Anteile müssen zwischen 0 und 1 liegen (nicht 0 und nicht 1), zum Beispiel ,30 für 30 %.', 'Proportions must lie between 0 and 1 (not 0 and not 1), for example .30 for 30%.'),
    hr: L('Das Hazard Ratio muss größer als 0 sein und darf nicht 1 sein (1 hieße: kein Unterschied).', 'The hazard ratio must be greater than 0 and must not be 1 (1 would mean no difference).'),
    auc: L('Die erwartete AUC muss größer sein als der Vergleichswert, der Vergleichswert mindestens ,50, und die AUC unter 1.', 'The expected AUC must be larger than the reference value, the reference value at least .50, and the AUC below 1.')
  } as Record<string, string>)[f] ?? '';
  const hinweisText = (h: string) => ({
    normalnaeherung: d('Die Normalnäherung ist hier unsicher: Bei einem der Anteile liegt die erwartete Zahl in einer Zelle unter 5. Nimm Fishers exakten Test.', 'Die Normalnäherung ist hier unsicher: Bei einem der Anteile liegt die erwartete Zahl in einer Zelle unter 5. Nehmen Sie Fishers exakten Test.', 'The normal approximation is unreliable here: for one of the proportions an expected cell count is below 5. Use Fisher\'s exact test.'),
    gross: L('Bei so hoher Power oder so kleinem α werden die Zahlen sehr groß.', 'With such a high power or such a small α the numbers become very large.'),
    'sehr-gross': d('Das sind mehr als eine Million Personen. Prüfe, ob der erwartete Effekt stimmt.', 'Das sind mehr als eine Million Personen. Prüfen Sie, ob der erwartete Effekt stimmt.', 'That is more than a million people. Check whether the expected effect is right.'),
    'auc-klein': L('Mit weniger als 10 Personen mit dem Zustand ist die Näherung unsicher.', 'With fewer than 10 people with the condition the approximation is unreliable.')
  } as Record<string, string>)[h] ?? '';
  const hHinweis = (h: number) => {
    const a = Math.abs(h);
    return a < 0.2 ? L(`Cohens h = ${kz(h)}: weniger als ein kleiner Effekt (Richtwerte ,2 / ,5 / ,8).`, `Cohen's h = ${kz(h)}: less than a small effect (benchmarks .2 / .5 / .8).`)
      : a < 0.5 ? L(`Cohens h = ${kz(h)}: ein kleiner bis mittlerer Effekt (Richtwerte ,2 / ,5 / ,8).`, `Cohen's h = ${kz(h)}: a small to medium effect (benchmarks .2 / .5 / .8).`)
      : a < 0.8 ? L(`Cohens h = ${kz(h)}: ein mittlerer bis großer Effekt (Richtwerte ,2 / ,5 / ,8).`, `Cohen's h = ${kz(h)}: a medium to large effect (benchmarks .2 / .5 / .8).`)
      : L(`Cohens h = ${kz(h)}: ein großer Effekt oder mehr (Richtwerte ,2 / ,5 / ,8).`, `Cohen's h = ${kz(h)}: a large effect or more (benchmarks .2 / .5 / .8).`);
  };
  const hWert = $derived(2 * Math.asin(Math.sqrt(pn.p2)) - 2 * Math.asin(Math.sqrt(pn.p1)));

  /* ---------- Hinweise zur Normalnäherung (mit der errechneten Zahl) ---------- */
  const hinweiseAnteile = $derived.by(() => {
    if (!pn.anteilGueltig) return [];
    if (pn.anzahl === 'zwei') {
      const z = pn.zwei; if (!z) return [];
      const a = planPruefung({ art: 'anteile', p1: pn.p1, p2: pn.p2, n: Math.min(z.n1, z.n2), alpha: pn.alpha, power: pn.power, gesamt: z.gesamt }).hinweise;
      return pn.verfahren2 === 'fisher' ? a.filter(h => h !== 'normalnaeherung') : a;
    }
    const e = pn.einErg?.r; if (!e) return [];
    const a = planPruefung({ art: 'anteile', p1: pn.p0, p2: pn.pEin, n: e.n, alpha: pn.alpha, power: pn.power, gesamt: e.n }).hinweise;
    return pn.verfahren1 === 'exakt' ? a.filter(h => h !== 'normalnaeherung') : a;
  });
  const hinweiseLr = $derived(pn.lrGueltig && pn.lrErg ? planPruefung({ art: 'ueberleben', hr: pn.hrWert, alpha: pn.alpha, power: pn.power, gesamt: pn.lrErg.personen.N }).hinweise : []);

  /* ---------- Sätze ---------- */
  const ohneNullSatz = (v: number, st: number) => apa(v, st);
  const satzOpt = $derived({ alpha: pn.alpha, power: pn.power, seiten: pn.seiten, k: pn.k, verfahren: pn.verfahren2, ausfall: pn.ausfallOk && pn.ausfall > 0 ? pn.ausfall : undefined });
  const satzAnteilText = $derived.by(() => {
    if (pn.anzahl === 'zwei') {
      if (!pn.zwei) return '';
      return satzAnteile(pn.p1, pn.p2, { ...satzOpt, ergebnis: pn.zwei, fisherN: pn.verfahren2 === 'fisher' ? null : pn.fisherAktuell ? pn.fisherAktuell.n1 : null }, fmt);
    }
    const r = pn.einErg?.r; if (!r) return '';
    const a = ohneNullSatz(pn.alpha, pn.alpha < 0.01 ? 3 : 2), P = prozent(pn.power), p0 = apa(pn.p0), p1 = apa(pn.pEin), n = ganz(r.n);
    // Ganze Sätze je Fall (Test, Seitigkeit): keine eingesetzten Wörter
    const kopf = pn.verfahren1 === 'exakt'
      ? L(`Um einen Anteil von ${p1} gegen den Sollwert ${p0} mit dem exakten Binomialtest mit ${P} Power nachzuweisen, braucht es ${n} Personen.`, `To detect a proportion of ${p1} against the reference value ${p0} with the exact binomial test with ${P} power, ${n} people are needed.`)
      : pn.verfahren1 === 'h'
      ? L(`Um einen Anteil von ${p1} gegen den Sollwert ${p0} über Cohens h mit ${P} Power nachzuweisen, braucht es ${n} Personen.`, `To detect a proportion of ${p1} against the reference value ${p0} using Cohen's h with ${P} power, ${n} people are needed.`)
      : L(`Um einen Anteil von ${p1} gegen den Sollwert ${p0} mit der Normalnäherung (z-Test) mit ${P} Power nachzuweisen, braucht es ${n} Personen.`, `To detect a proportion of ${p1} against the reference value ${p0} with the normal approximation (z test) with ${P} power, ${n} people are needed.`);
    return kopf + ' ' + (pn.seiten === 2 ? L(`Der Test ist zweiseitig, das Signifikanzniveau α = ${a}.`, `The test is two-tailed, the significance level α = ${a}.`) : L(`Der Test ist einseitig, das Signifikanzniveau α = ${a}.`, `The test is one-tailed, the significance level α = ${a}.`));
  });
  const satzLrText = $derived(pn.lrGueltig ? satzLogRank(pn.hrWert, pn.sKWert, { alpha: pn.alpha, power: pn.power, seiten: pn.seiten, k: pn.lrK, ausfall: pn.ausfallOk && pn.ausfall > 0 ? pn.ausfall : undefined }, fmt) : '');
  const satzAucText = $derived(pn.aucGueltig ? satzAuc(pn.auc1, { alpha: pn.alpha, power: pn.power, auc0: pn.auc0, R: pn.aucR, ausfall: pn.ausfallOk && pn.ausfall > 0 ? pn.ausfall : undefined }, fmt) : '');

  let kopiert = $state(false);
  async function kopieren(text: string) {
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch { /* nichts */ } t.remove(); }
    kopiert = true; melde(L('Satz kopiert.', 'Sentence copied.'));
    setTimeout(() => (kopiert = false), 2500);
  }

  const PROBLEM = $derived(pn.art === 'anteile' ? pn.anteilPruefung.fehler : pn.art === 'ueberleben' ? pn.lrPruefung.fehler : pn.aucPruefung.fehler);
  const ausfallFehler = $derived(pn.ausfallText.trim() !== '' && !pn.ausfallOk ? L('Der Ausfall liegt zwischen 0 und 90 %.', 'The dropout is between 0 and 90%.') : '');
  const fischerBis = FISHER_MAX;
</script>

{#snippet sicherheit()}
  <fieldset class="gruppe"><legend>{L('Wie sicher soll das Ergebnis sein?', 'How certain should the result be?')}</legend>
    <div class="paar">
      <div class="eingabe"><span class="lbl" id="pn-alpha-l">{L('Irrtumswahrscheinlichkeit α', 'Significance level α')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="pn-alpha-l" data-tipp={L('Wie oft man einen Unterschied behauptet, obwohl es keinen gibt. Üblich: ,05', 'How often you claim a difference although there is none. Usual: .05')}>{#each [0.1, 0.05, 0.01, 0.001] as a}<label data-begriff="signifikanzniveau"><input type="radio" name="pn-alpha" value={a} bind:group={pn.alpha}>{apa(a, a < 0.01 ? 3 : 2)}</label>{/each}</div></div>
      <div class="eingabe"><span class="lbl" id="pn-power-l">{L('Power (1 − β)', 'Power (1 − β)')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="pn-power-l" data-tipp={L('Wie sicher ein wirklich vorhandener Effekt gefunden wird. Üblich: ,80', 'How reliably a truly existing effect is found. Usual: .80')}>{#each [0.8, 0.9, 0.95] as p}<label data-begriff="power"><input type="radio" name="pn-power" value={p} bind:group={pn.power}>{apa(p)}</label>{/each}</div></div>
    </div>
    {#if pn.art !== 'auc'}
      <div class="eingabe"><span class="lbl" id="pn-seiten-l">{L('Hypothese', 'Hypothesis')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="pn-seiten-l" data-tipp={L('Zweiseitig: Unterschied in beide Richtungen möglich. Einseitig: nur eine Richtung, vorher begründet', 'Two-tailed: difference possible in both directions. One-tailed: one direction only, justified beforehand')}><label data-begriff="einseitig-zweiseitig"><input type="radio" name="pn-seiten" value={2} bind:group={pn.seiten}>{L('zweiseitig (Standard)', 'two-tailed (default)')}</label><label data-begriff="einseitig-zweiseitig"><input type="radio" name="pn-seiten" value={1} bind:group={pn.seiten}>{L('einseitig', 'one-tailed')}</label></div></div>
    {/if}
    <div class="eingabe"><label for="pn-ausfall">{L('Erwarteter Ausfall in Prozent (optional)', 'Expected dropout in percent (optional)')}</label>
      <input id="pn-ausfall" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.ausfallText} aria-invalid={ausfallFehler ? 'true' : undefined} aria-describedby="pn-ausfall-h" style="max-width:8ch">
      <span class="hilfe" id="pn-ausfall-h">{ausfallFehler || L('Wer ausfällt, fehlt in der Auswertung. Statable rechnet n / (1 − Ausfall) und rundet auf.', 'People who drop out are missing from the analysis. Statable calculates n / (1 − dropout) and rounds up.')}</span></div>
  </fieldset>
{/snippet}

<div class="plan-raster">
  <div class="plan-links">
    <fieldset class="gruppe"><legend>{L('1  Was soll verglichen werden?', '1  What is being compared?')}</legend>
      {@render testWahl()}
    </fieldset>

    {#if pn.art === 'anteile'}
      <fieldset class="gruppe"><legend>{L('2  Zwei Anteile oder ein Anteil?', '2  Two proportions or one?')}</legend>
        <div class="segment" role="radiogroup" aria-label={L('Zwei Anteile oder ein Anteil', 'Two proportions or one')}>
          <label><input type="radio" name="pn-anz" value="zwei" bind:group={pn.anzahl}>{L('Zwei Gruppen vergleichen', 'Compare two groups')}</label>
          <label><input type="radio" name="pn-anz" value="ein" bind:group={pn.anzahl}>{L('Einen Anteil gegen einen Sollwert', 'One proportion against a reference value')}</label>
        </div>
        {#if pn.anzahl === 'zwei'}
          <div class="paar">
            <div class="eingabe"><label for="pn-p1">{L('Erwarteter Anteil in Gruppe 1', 'Expected proportion in group 1')}</label>
              <input id="pn-p1" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.p1Text} aria-invalid={pn.anteilPruefung.fehler ? 'true' : undefined} aria-describedby={(pn.anteilPruefung.fehler) ? 'pn-fehler' : undefined} style="max-width:8ch"></div>
            <div class="eingabe"><label for="pn-p2">{L('Erwarteter Anteil in Gruppe 2', 'Expected proportion in group 2')}</label>
              <input id="pn-p2" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.p2Text} aria-invalid={pn.anteilPruefung.fehler ? 'true' : undefined} aria-describedby={(pn.anteilPruefung.fehler) ? 'pn-fehler' : undefined} style="max-width:8ch"></div>
          </div>
          <span class="hilfe">{d('Zwischen 0 und 1: ,30 heißt 30 %. Gib den Unterschied ein, den du erwartest - nicht den, den du schon gefunden hast.', 'Zwischen 0 und 1: ,30 heißt 30 %. Geben Sie den Unterschied ein, den Sie erwarten - nicht den, den Sie schon gefunden haben.', 'Between 0 and 1: .30 means 30%. Enter the difference you expect - not one you have already found.')}</span>
          <div class="eingabe"><label for="pn-k">{L('Gruppengröße: Gruppe 2 im Verhältnis zu Gruppe 1', 'Group size: group 2 relative to group 1')}</label>
            <input id="pn-k" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.kText} aria-invalid={!pn.kOk ? 'true' : undefined} aria-describedby="pn-k-h" style="max-width:8ch">
            <span class="hilfe" id="pn-k-h">{!pn.kOk ? L('Das Verhältnis liegt zwischen 0,1 und 10.', 'The ratio is between 0.1 and 10.') : L('1 = gleich große Gruppen. 2 = Gruppe 2 doppelt so groß wie Gruppe 1.', '1 = equal groups. 2 = group 2 twice as large as group 1.')}</span></div>
        {:else}
          <div class="paar">
            <div class="eingabe"><label for="pn-p0">{L('Sollwert (Vergleichsanteil)', 'Reference value (comparison proportion)')}</label>
              <input id="pn-p0" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.p0Text} aria-invalid={pn.anteilPruefung.fehler ? 'true' : undefined} aria-describedby={(pn.anteilPruefung.fehler) ? 'pn-fehler' : undefined} style="max-width:8ch"></div>
            <div class="eingabe"><label for="pn-pe">{L('Erwarteter Anteil', 'Expected proportion')}</label>
              <input id="pn-pe" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.pEinText} aria-invalid={pn.anteilPruefung.fehler ? 'true' : undefined} aria-describedby={(pn.anteilPruefung.fehler) ? 'pn-fehler' : undefined} style="max-width:8ch"></div>
          </div>
        {/if}
      </fieldset>

      <fieldset class="gruppe"><legend>{d('3  Welchen Test rechnest du später?', '3  Welchen Test rechnen Sie später?', '3  Which test will you run later?')}</legend>
        <span class="hilfe">{L('Die Zahl der Personen hängt vom Test ab. Wer mit der einen Formel plant und mit einem anderen Test rechnet, hat weniger Power als gedacht.', 'The number of people depends on the test. If you plan with one formula and analyze with another test, you have less power than you think.')}</span>
        {#if pn.anzahl === 'zwei'}
          <div class="wahl" role="radiogroup" aria-label={L('Test', 'Test')}>
            {#each [['gepoolt', L('χ²-Test ohne Korrektur', 'Chi-square test without correction'), L('Pearson, Normalnäherung (wie R power.prop.test)', 'Pearson, normal approximation (as R power.prop.test)')], ['korrigiert', L('χ²-Test mit Stetigkeitskorrektur', 'Chi-square test with continuity correction'), L('Yates, nach Fleiss, Tytun und Ury', 'Yates, after Fleiss, Tytun and Ury')], ['fisher', L('Fishers exakter Test', "Fisher's exact test"), L(`Aufzählung aller Tafeln, bis ${fischerBis} je Gruppe`, `Enumeration of all tables, up to ${fischerBis} per group`)], ['h', L('Cohens h', "Cohen's h"), L('Effektstärke für Anteile (wie R pwr.2p.test)', 'Effect size for proportions (as R pwr.2p.test)')]] as [w, t1, t2] (w)}
              <label class:an={pn.verfahren2 === w}><input type="radio" name="pn-v2" value={w} checked={pn.verfahren2 === w} onchange={() => (pn.verfahren2 = w as typeof pn.verfahren2)}><span><b>{t1}</b><small>{t2}</small></span></label>
            {/each}
          </div>
        {:else}
          <div class="wahl" role="radiogroup" aria-label={L('Test', 'Test')}>
            {#each [['normal', L('Normalnäherung (z-Test)', 'Normal approximation (z test)'), L('rechnet sofort', 'calculates at once')], ['exakt', L('Exakter Binomialtest', 'Exact binomial test'), L('wie R binom.test; die Power schwankt mit n', 'as R binom.test; power varies with n')], ['h', L('Cohens h', "Cohen's h"), L('wie R pwr.p.test', 'as R pwr.p.test')]] as [w, t1, t2] (w)}
              <label class:an={pn.verfahren1 === w}><input type="radio" name="pn-v1" value={w} checked={pn.verfahren1 === w} onchange={() => (pn.verfahren1 = w as typeof pn.verfahren1)}><span><b>{t1}</b><small>{t2}</small></span></label>
            {/each}
          </div>
        {/if}
      </fieldset>
      {@render sicherheit()}

    {:else if pn.art === 'ueberleben'}
      <fieldset class="gruppe"><legend>{L('2  Welcher Unterschied wird erwartet?', '2  Which difference is expected?')}</legend>
        <div class="segment" role="radiogroup" aria-label={d('Wie gibst du den Unterschied an?', 'Wie geben Sie den Unterschied an?', 'How do you state the difference?')}>
          <label data-begriff="hazard-ratio"><input type="radio" name="pn-lr" value="hr" bind:group={pn.lrArt}>{L('Hazard Ratio', 'Hazard ratio')}</label>
          <label><input type="radio" name="pn-lr" value="median" bind:group={pn.lrArt}>{L('Zwei Mediane', 'Two medians')}</label>
          <label><input type="radio" name="pn-lr" value="anteile" bind:group={pn.lrArt}>{L('Zwei Überlebensanteile', 'Two survival proportions')}</label>
        </div>
        {#if pn.lrArt === 'hr'}
          <div class="eingabe"><label for="pn-hr">{L('Hazard Ratio (Behandlung gegen Kontrolle)', 'Hazard ratio (treatment versus control)')}</label>
            <input id="pn-hr" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.hrText} aria-invalid={pn.lrPruefung.fehler ? 'true' : undefined} aria-describedby="pn-hr-h" style="max-width:8ch">
            <span class="hilfe" id="pn-hr-h">{L(',50 heißt: Das Risiko ist in der Behandlung halb so groß. Unter 1 ist günstig für die Behandlung.', '.50 means: the risk is half as large under treatment. Below 1 is favorable for the treatment.')}</span></div>
        {:else if pn.lrArt === 'median'}
          <div class="paar">
            <div class="eingabe"><label for="pn-mk">{L('Median der Überlebenszeit, Kontrolle', 'Median survival time, control')}</label><input id="pn-mk" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.medianKText} style="max-width:8ch"></div>
            <div class="eingabe"><label for="pn-mb">{L('Median der Überlebenszeit, Behandlung', 'Median survival time, treatment')}</label><input id="pn-mb" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.medianBText} style="max-width:8ch"></div>
          </div>
          <div class="eingabe"><label for="pn-zeit">{L('Nachbeobachtungszeit (in derselben Einheit)', 'Follow-up time (in the same unit)')}</label><input id="pn-zeit" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.zeitText} style="max-width:8ch">
            <span class="hilfe">{L('Gerechnet wird mit gleichbleibendem Risiko (Exponentialverteilung): HR = Median Kontrolle / Median Behandlung.', 'The calculation assumes a constant risk (exponential distribution): HR = median control / median treatment.')}</span></div>
        {:else}
          <div class="paar">
            <div class="eingabe"><label for="pn-sk">{L('Überlebensanteil Kontrolle zum Ende', 'Survival proportion control at the end')}</label><input id="pn-sk" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.sKText} aria-invalid={!pn.lrSkOk ? 'true' : undefined} aria-describedby={(!pn.lrSkOk) ? 'pn-fehler' : undefined} style="max-width:8ch"></div>
            <div class="eingabe"><label for="pn-sb">{L('Überlebensanteil Behandlung zum Ende', 'Survival proportion treatment at the end')}</label><input id="pn-sb" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.sBText} style="max-width:8ch"></div>
          </div>
          <span class="hilfe">{L(`Daraus folgt HR = ${Number.isFinite(pn.hrWert) ? kz(pn.hrWert, 3) : '-'}.`, `This gives HR = ${Number.isFinite(pn.hrWert) ? kz(pn.hrWert, 3) : '-'}.`)}</span>
        {/if}
        {#if pn.lrArt === 'hr'}
          <div class="eingabe"><label for="pn-sk2">{L('Überlebensanteil im Kontrollarm zum Ende der Nachbeobachtung', 'Survival proportion in the control arm at the end of follow-up')}</label>
            <input id="pn-sk2" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.sKText} aria-invalid={!pn.lrSkOk ? 'true' : undefined} aria-describedby="pn-sk2-h" style="max-width:8ch">
            <span class="hilfe" id="pn-sk2-h">{!pn.lrSkOk ? L('Der Anteil liegt zwischen 0 und 1, zum Beispiel ,60.', 'The proportion lies between 0 and 1, for example .60.') : L('Daraus rechnet Statable von den Ereignissen auf die Personen.', 'From this Statable gets from the events to the people.')}</span></div>
        {/if}
        <div class="eingabe"><label for="pn-lrk">{L('Zuteilung: Behandlung je Person in der Kontrolle', 'Allocation: treatment per control person')}</label>
          <input id="pn-lrk" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.lrKText} aria-invalid={!pn.lrKOk ? 'true' : undefined} aria-describedby="pn-lrk-h" style="max-width:8ch">
          <span class="hilfe" id="pn-lrk-h">{!pn.lrKOk ? L('Das Verhältnis liegt zwischen 0,1 und 10.', 'The ratio is between 0.1 and 10.') : L('1 = gleich große Arme. 2 = doppelt so viele in der Behandlung.', '1 = equal arms. 2 = twice as many in the treatment.')}</span></div>
      </fieldset>
      {@render sicherheit()}

    {:else}
      <fieldset class="gruppe"><legend>{L('2  Welche Güte wird erwartet?', '2  Which accuracy is expected?')}</legend>
        <div class="paar">
          <div class="eingabe"><label for="pn-a1">{L('Erwartete AUC', 'Expected AUC')}</label><input id="pn-a1" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.auc1Text} aria-invalid={pn.aucPruefung.fehler ? 'true' : undefined} aria-describedby={(pn.aucPruefung.fehler) ? 'pn-fehler' : undefined} style="max-width:8ch"></div>
          <div class="eingabe"><label for="pn-a0">{L('Vergleichswert (AUC unter H₀)', 'Reference value (AUC under H₀)')}</label><input id="pn-a0" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.auc0Text} aria-invalid={pn.aucPruefung.fehler ? 'true' : undefined} aria-describedby={(pn.aucPruefung.fehler) ? 'pn-fehler' : undefined} style="max-width:8ch"></div>
        </div>
        <span class="hilfe">{L(',50 ist Raten. Eine AUC von ,70 gilt als annehmbar, ,80 als gut, ,90 als sehr gut (Faustregel).', '.50 is guessing. An AUC of .70 counts as acceptable, .80 as good, .90 as very good (rule of thumb).')}</span>
        <div class="segment" role="radiogroup" aria-label={L('Wie viele ohne den Zustand?', 'How many without the condition?')}>
          <label><input type="radio" name="pn-aw" value="R" bind:group={pn.aucWeg}>{L('Kontrollen je Fall', 'Controls per case')}</label>
          <label><input type="radio" name="pn-aw" value="haeufigkeit" bind:group={pn.aucWeg}>{L('Anteil mit dem Zustand', 'Proportion with the condition')}</label>
        </div>
        {#if pn.aucWeg === 'R'}
          <div class="eingabe"><label for="pn-ar">{L('Personen ohne den Zustand je Person mit dem Zustand', 'People without the condition per person with the condition')}</label>
            <input id="pn-ar" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.aucRText} aria-invalid={!pn.aucROk ? 'true' : undefined} aria-describedby="pn-ar-h" style="max-width:8ch">
            <span class="hilfe" id="pn-ar-h">{!pn.aucROk ? L('Das Verhältnis liegt zwischen 0,1 und 100.', 'The ratio is between 0.1 and 100.') : L('1 = gleich viele mit und ohne.', '1 = equal numbers with and without.')}</span></div>
        {:else}
          <div class="eingabe"><label for="pn-ap">{L('Anteil der Personen mit dem Zustand in der Stichprobe', 'Proportion of people with the condition in the sample')}</label>
            <input id="pn-ap" type="text" inputmode="decimal" autocomplete="off" bind:value={pn.aucPraeText} aria-invalid={!pn.aucROk ? 'true' : undefined} aria-describedby="pn-ap-h" style="max-width:8ch">
            <span class="hilfe" id="pn-ap-h">{!pn.aucROk ? L('Der Anteil liegt zwischen 0 und 1, zum Beispiel ,20.', 'The proportion lies between 0 and 1, for example .20.') : L('Daraus rechnet Statable auch die Gesamtzahl der Personen.', 'From this Statable also calculates the total number of people.')}</span></div>
        {/if}
        <div class="segment" role="radiogroup" aria-label={L('Welche Näherung steht oben?', 'Which approximation is shown first?')}>
          <label><input type="radio" name="pn-av" value="hm" bind:group={pn.aucVerfahren}>{L('Hanley-McNeil (Standard)', 'Hanley-McNeil (default)')}</label>
          <label><input type="radio" name="pn-av" value="obuchowski" bind:group={pn.aucVerfahren}>{L('Obuchowski', 'Obuchowski')}</label>
        </div>
      </fieldset>
      {@render sicherheit()}
    {/if}
  </div>

  <div class="plan-rechts">
    {#if PROBLEM}
      <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p>{fehlerText(PROBLEM)}</p></div>
    {:else if !(pn.art === 'anteile' ? pn.anteilGueltig : pn.art === 'ueberleben' ? pn.lrGueltig : pn.aucGueltig)}
      <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p id="pn-fehler">{ausfallFehler || (pn.art === 'anteile' && !pn.kOk ? L('Das Verhältnis der Gruppen liegt zwischen 0,1 und 10.', 'The ratio of the groups is between 0.1 and 10.') : pn.art === 'ueberleben' ? L('Bitte alle Felder mit Zahlen im erlaubten Bereich füllen.', 'Please fill in all fields with numbers in the allowed range.') : L('Bitte die Zahlen prüfen.', 'Please check the numbers.'))}</p></div>

    {:else if pn.art === 'anteile' && pn.anzahl === 'zwei'}
      <section class="ergebnis" aria-labelledby="pn-erg-t"><h2 id="pn-erg-t">{L('Benötigte Stichprobe', 'Required sample size')}</h2>
        {#if pn.verfahren2 === 'fisher' && pn.fisherLaeuft}
          <p class="gross"><Rechnet text={L('Fishers exakter Test wird durchgerechnet …', "Fisher's exact test is being calculated …")} /></p>
          <p class="zeile klein">{L(`Alle Tafeln werden einzeln geprüft (bis ${fischerBis} je Gruppe). Das dauert einen Augenblick.`, `Every table is checked one by one (up to ${fischerBis} per group). This takes a moment.`)}</p>
          <button class="k klein" type="button" onclick={() => pn.bricheFisherAb()}>{L('Abbrechen', 'Cancel')}</button>
        {:else if pn.verfahren2 === 'fisher' && pn.fisherFehler}
          <p class="zeile" role="alert">{pn.fisherFehler}</p>
        {:else if pn.verfahren2 === 'fisher' && pn.fisherAbgebrochen}
          <p class="zeile" role="status">{d('Die Rechnung wurde abgebrochen. Wähle einen anderen Test oder rechne noch einmal.', 'Die Rechnung wurde abgebrochen. Wählen Sie einen anderen Test oder rechnen Sie noch einmal.', 'The calculation was cancelled. Choose another test or calculate again.')}</p>
          <button class="k" type="button" onclick={() => pn.erneutFisher()}>{L('Erneut rechnen', 'Calculate again')}</button>
        {:else if pn.zwei}
          {@const z = pn.zwei}
          <p class="gross" use:ergebnisAnsage={{ anfang: pn.verfahren2 === 'fisher' }}><span class="zahl">{z.n1 === z.n2 ? ganz(z.n1) : `${ganz(z.n1)} / ${ganz(z.n2)}`}</span> <span class="einheit">{z.n1 === z.n2 ? L('Personen je Gruppe', 'people per group') : L('Personen in Gruppe 1 / Gruppe 2', 'people in group 1 / group 2')}</span></p>
          <p class="zeile">{L(`${ganz(z.gesamt)} Personen insgesamt.`, `${ganz(z.gesamt)} people in total.`)}{#if pn.zweiMitAusfall} {L(`Mit ${zahlDe(pn.ausfall * 100, 0)} % Ausfall: ${ganz(pn.zweiMitAusfall.n1)}${pn.zweiMitAusfall.n1 === pn.zweiMitAusfall.n2 ? '' : ` / ${ganz(pn.zweiMitAusfall.n2)}`} je Gruppe, ${ganz(pn.zweiMitAusfall.gesamt)} insgesamt.`, `With ${zahlDe(pn.ausfall * 100, 0)}% dropout: ${ganz(pn.zweiMitAusfall.n1)}${pn.zweiMitAusfall.n1 === pn.zweiMitAusfall.n2 ? '' : ` / ${ganz(pn.zweiMitAusfall.n2)}`} per group, ${ganz(pn.zweiMitAusfall.gesamt)} in total.`)}{/if}</p>
          {#if z.erreicht !== null}
            <p class="zeile klein">{L(`Erreichte Power mit dieser aufgerundeten Zahl: ${apa(z.erreicht, 3)} (verlangt: ${apa(pn.power)}).`, `Achieved power with this rounded-up number: ${apa(z.erreicht, 3)} (required: ${apa(pn.power)}).`)}</p>
          {/if}
          {#if pn.verfahren2 === 'fisher' && z.erstes !== undefined && z.erstes !== z.n1}
            <p class="zeile klein">{L(`Die Power von Fishers exaktem Test steigt nicht gleichmäßig mit n: Schon bei ${z.erstes} je Gruppe wird das Ziel einmal erreicht, bleibt aber erst ab ${z.n1} dauerhaft darüber. Die Zahl oben ist die sichere.`, `The power of Fisher's exact test does not rise evenly with n: the target is reached once at ${z.erstes} per group but stays above it permanently only from ${z.n1}. The number above is the safe one.`)}</p>
          {/if}
          {#if pn.verfahren2 === 'h'}<p class="zeile klein">{hHinweis(hWert)}</p>{/if}
          {#each hinweiseAnteile as h}<p class="zeile klein">{hinweisText(h)}</p>{/each}
        {/if}
      </section>

      {#if pn.zwei && satzAnteilText}
        <section class="satz" aria-labelledby="pn-satz-t"><h2 id="pn-satz-t">{L('Satz für den Methodenteil', 'Sentence for the methods section')}</h2>
          <p class="satz-text" lang={s.einst.sprache}>{satzAnteilText}</p>
          <button class="k" type="button" data-tipp={L('Legt den Satz für die Arbeit in die Zwischenablage', 'Puts the sentence for your paper on the clipboard')} onclick={() => kopieren(satzAnteilText)}><Icon n={kopiert ? 'haken' : 'kopieren'} />{kopiert ? L('Kopiert', 'Copied') : L('Satz kopieren', 'Copy sentence')}</button>
        </section>
      {/if}

      <section aria-labelledby="pn-tab-t"><h2 id="pn-tab-t">{L('Je nach Test', 'By test')}</h2>
        <table class="plan-tabelle"><thead><tr><th scope="col">{L('Test', 'Test')}</th><th scope="col" class="zahl-sp">{L('je Gruppe', 'per group')}</th></tr></thead>
          <tbody>
            {#each pn.zweiAlle as r (r.v)}
              <tr class:an={r.v === pn.verfahren2}><th scope="row">{r.v === 'gepoolt' ? L('χ²-Test ohne Korrektur', 'Chi-square without correction') : r.v === 'korrigiert' ? L('χ²-Test mit Stetigkeitskorrektur', 'Chi-square with continuity correction') : r.v === 'ungepoolt' ? L('z-Test, getrennte Varianzen', 'z test, unpooled variances') : L('Cohens h', "Cohen's h")}</th><td class="zahl-sp">{ganz(r.r.n1)}</td></tr>
            {/each}
            <tr class:an={pn.verfahren2 === 'fisher'}><th scope="row">{L("Fishers exakter Test", "Fisher's exact test")}</th><td class="zahl-sp">{#if pn.fisherAktuell}{ganz(pn.fisherAktuell.n1)}{:else if pn.fisherLaeuft}<Rechnet />{:else if pn.fisherFehler}-{:else}<button class="k klein" type="button" onclick={() => { pn.fisherDazu = true; if (pn.fisherAbgebrochen) pn.erneutFisher(); }}>{L('Dazurechnen', 'Add')}</button>{/if}</td></tr>
          </tbody></table>
      </section>

    {:else if pn.art === 'anteile'}
      <section class="ergebnis" aria-labelledby="pn-erg-t"><h2 id="pn-erg-t">{L('Benötigte Stichprobe', 'Required sample size')}</h2>
        {#if pn.einErg?.fehler}
          <p class="zeile" role="alert">{pn.einErg.fehler}</p>
        {:else if pn.einErg?.r}
          {@const r = pn.einErg.r}
          <p class="gross" use:ergebnisAnsage><span class="zahl">{ganz(r.n)}</span> <span class="einheit">{L('Personen', 'people')}</span></p>
          {#if pn.ausfallOk && pn.ausfall > 0}<p class="zeile">{L(`Mit ${zahlDe(pn.ausfall * 100, 0)} % Ausfall: ${ganz(ausfallZuschlag(r.n, pn.ausfall))} Personen.`, `With ${zahlDe(pn.ausfall * 100, 0)}% dropout: ${ganz(ausfallZuschlag(r.n, pn.ausfall))} people.`)}</p>{/if}
          {#if pn.einErg.erreicht !== null}<p class="zeile klein">{L(`Erreichte Power mit dieser Zahl: ${apa(pn.einErg.erreicht, 3)} (verlangt: ${apa(pn.power)}).`, `Achieved power with this number: ${apa(pn.einErg.erreicht, 3)} (required: ${apa(pn.power)}).`)}</p>{/if}
          {#if r.erstes !== undefined && r.erstes !== r.n}<p class="zeile klein">{L(`Die Power des exakten Tests springt mit n auf und ab: Schon bei ${r.erstes} Personen wird das Ziel einmal erreicht, bleibt aber erst ab ${r.n} dauerhaft darüber. Die Zahl oben ist die sichere.`, `The power of the exact test jumps up and down with n: the target is reached once at ${r.erstes} people but stays above it permanently only from ${r.n}. The number above is the safe one.`)}</p>{/if}
          {#each hinweiseAnteile as h}<p class="zeile klein">{hinweisText(h)}</p>{/each}
        {/if}
      </section>
      {#if satzAnteilText}
        <section class="satz" aria-labelledby="pn-satz-t"><h2 id="pn-satz-t">{L('Satz für den Methodenteil', 'Sentence for the methods section')}</h2>
          <p class="satz-text" lang={s.einst.sprache}>{satzAnteilText}</p>
          <button class="k" type="button" onclick={() => kopieren(satzAnteilText)}><Icon n={kopiert ? 'haken' : 'kopieren'} />{kopiert ? L('Kopiert', 'Copied') : L('Satz kopieren', 'Copy sentence')}</button>
        </section>
      {/if}

    {:else if pn.art === 'ueberleben' && pn.lrErg}
      {@const e = pn.lrErg}
      <section class="ergebnis" aria-labelledby="pn-erg-t"><h2 id="pn-erg-t">{L('Benötigte Ereignisse', 'Required events')}</h2>
        <p class="gross" use:ergebnisAnsage><span class="zahl">{ganz(e.schoenfeld.d)}</span> <span class="einheit">{L('Ereignisse (Schoenfeld)', 'events (Schoenfeld)')}</span></p>
        <p class="zeile">{L(`Dazu braucht es etwa ${ganz(e.personen.N)} Personen. Nach Freedman wären es ${ganz(e.freedman.d)} Ereignisse und ${ganz(e.personenFreedman.N)} Personen.`, `This takes about ${ganz(e.personen.N)} people. By Freedman it would be ${ganz(e.freedman.d)} events and ${ganz(e.personenFreedman.N)} people.`)}{#if pn.ausfallOk && pn.ausfall > 0} {L(`Mit ${zahlDe(pn.ausfall * 100, 0)} % Ausfall: ${ganz(ausfallZuschlag(e.personen.N, pn.ausfall))} Personen.`, `With ${zahlDe(pn.ausfall * 100, 0)}% dropout: ${ganz(ausfallZuschlag(e.personen.N, pn.ausfall))} people.`)}{/if}</p>
        <p class="zeile klein">{L('Die Zahl der Ereignisse ist die Größe, nicht die der Personen: Die Power hängt daran, wie viele das Ereignis erleben. Die Personenzahl gilt nur bei fester Nachbeobachtungszeit, ohne Verluste und ohne verzögerte Aufnahme; vorausgesetzt sind proportionale Hazards.', 'The number of events is what counts, not the number of people: the power depends on how many experience the event. The number of people holds only for a fixed follow-up time, without dropout and without delayed entry; proportional hazards are assumed.')}</p>
        {#each hinweiseLr as h}<p class="zeile klein">{hinweisText(h)}</p>{/each}
      </section>
      {#if satzLrText}
        <section class="satz" aria-labelledby="pn-satz-t"><h2 id="pn-satz-t">{L('Satz für den Methodenteil', 'Sentence for the methods section')}</h2>
          <p class="satz-text" lang={s.einst.sprache}>{satzLrText}</p>
          <button class="k" type="button" onclick={() => kopieren(satzLrText)}><Icon n={kopiert ? 'haken' : 'kopieren'} />{kopiert ? L('Kopiert', 'Copied') : L('Satz kopieren', 'Copy sentence')}</button>
        </section>
      {/if}

    {:else if pn.art === 'auc' && pn.aucErg}
      {@const e = pn.aucErg}
      {@const haupt = pn.aucVerfahren === 'hm' ? e.hm : e.ob}
      {@const zweit = pn.aucVerfahren === 'hm' ? e.ob : e.hm}
      <section class="ergebnis" aria-labelledby="pn-erg-t"><h2 id="pn-erg-t">{L('Benötigte Stichprobe', 'Required sample size')}</h2>
        <p class="gross" use:ergebnisAnsage><span class="zahl">{ganz(haupt.nCases)} / {ganz(haupt.nControls)}</span> <span class="einheit">{L('Personen mit / ohne den Zustand', 'people with / without the condition')}</span></p>
        <p class="zeile">{pn.aucVerfahren === 'hm' ? L(`Nach Hanley und McNeil. Nach Obuchowski wären es ${ganz(zweit.nCases)} / ${ganz(zweit.nControls)}.`, `By Hanley and McNeil. By Obuchowski it would be ${ganz(zweit.nCases)} / ${ganz(zweit.nControls)}.`) : L(`Nach Obuchowski. Nach Hanley und McNeil wären es ${ganz(zweit.nCases)} / ${ganz(zweit.nControls)}.`, `By Obuchowski. By Hanley and McNeil it would be ${ganz(zweit.nCases)} / ${ganz(zweit.nControls)}.`)}
          {#if e.gesamt} {L(`Bei einem Anteil von ${apa(pn.aucPrae)} mit dem Zustand sind das ${ganz(pn.aucVerfahren === 'hm' ? e.gesamt.hm : e.gesamt.ob)} Personen insgesamt.`, `With ${apa(pn.aucPrae)} having the condition that is ${ganz(pn.aucVerfahren === 'hm' ? e.gesamt.hm : e.gesamt.ob)} people in total.`)}{:else} {L(`Insgesamt ${ganz(haupt.nCases + haupt.nControls)} Personen.`, `${ganz(haupt.nCases + haupt.nControls)} people in total.`)}{/if}
          {#if pn.ausfallOk && pn.ausfall > 0} {L(`Mit ${zahlDe(pn.ausfall * 100, 0)} % Ausfall: ${ganz(ausfallZuschlag(haupt.nCases, pn.ausfall))} / ${ganz(ausfallZuschlag(haupt.nControls, pn.ausfall))}.`, `With ${zahlDe(pn.ausfall * 100, 0)}% dropout: ${ganz(ausfallZuschlag(haupt.nCases, pn.ausfall))} / ${ganz(ausfallZuschlag(haupt.nControls, pn.ausfall))}.`)}{/if}</p>
        <p class="zeile klein">{L('Beide Rechnungen sind Näherungen (binormales Modell). Sie unterscheiden sich um etwa eine Person je Gruppe; Hanley-McNeil ist die vorsichtigere.', 'Both calculations are approximations (binormal model). They differ by about one person per group; Hanley-McNeil is the more cautious one.')}</p>
        {#each pn.aucHinweise as h}<p class="zeile klein">{hinweisText(h)}</p>{/each}
      </section>
      {#if satzAucText}
        <section class="satz" aria-labelledby="pn-satz-t"><h2 id="pn-satz-t">{L('Satz für den Methodenteil', 'Sentence for the methods section')}</h2>
          <p class="satz-text" lang={s.einst.sprache}>{satzAucText}</p>
          <button class="k" type="button" onclick={() => kopieren(satzAucText)}><Icon n={kopiert ? 'haken' : 'kopieren'} />{kopiert ? L('Kopiert', 'Copied') : L('Satz kopieren', 'Copy sentence')}</button>
        </section>
      {/if}
    {/if}

    <p class="banner ruhig fuss-hinweis"><Icon n="info" /><span>{L('Die Rechnung gilt vor der Erhebung und geht von unabhängigen Personen aus. Stecken die Personen in Klassen, Praxen oder anderen Gruppen, braucht es mehr (Designeffekt); das rechnet diese Seite nicht. Nach der Auswertung gehören Effektstärke und Konfidenzintervall in den Bericht, keine nachträgliche („beobachtete“) Power.', 'The calculation applies before data collection and assumes independent people. If people are nested in classes, practices or other groups, more are needed (design effect); this page does not calculate that. After the analysis, report the effect size and confidence interval, not a post hoc ("observed") power.')} <HilfeLink id="power" text={L('Hilfe zur Poweranalyse', 'Help on power analysis')} /></span></p>
  </div>
</div>

<style>
  .plan-raster { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--a6); align-items: start; }
  .plan-links, .plan-rechts { display: flex; flex-direction: column; gap: var(--a5); min-width: 0; }
  .plan-rechts { position: sticky; top: var(--a4); }
  fieldset.gruppe { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--a3); min-width: 0; }
  fieldset.gruppe > legend { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin-bottom: var(--a3); padding: 0; }
  .wahl { display: grid; grid-template-columns: 1fr 1fr; gap: var(--a2); }
  .wahl label { display: flex; align-items: flex-start; gap: var(--a2); padding: var(--a3); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); cursor: pointer; background: var(--blatt); min-height: 64px; }
  .wahl label.an { border-color: var(--akzent); background: var(--akzent-hell); box-shadow: inset 0 0 0 1px var(--akzent); }
  .wahl label:has(input:focus-visible) { box-shadow: var(--fokus-ring); }
  .wahl input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 2px 0 0; flex: none; }
  .wahl span { display: flex; flex-direction: column; gap: 2px; }
  .wahl b { font-weight: 600; line-height: 1.25; }
  .wahl small { color: var(--tinte-2); font-size: var(--gr-klein); }
  .eingabe input[type=text] { font: inherit; color: var(--tinte); background: var(--blatt); border: 1px solid var(--linie-stark); border-radius: var(--r-klein); min-height: var(--ziel); padding: var(--a2) var(--a3); width: 100%; }
  .eingabe input[aria-invalid='true'] { border-color: var(--verlust); }
  .eingabe input:focus-visible { border-color: var(--fokus); box-shadow: var(--fokus-ring); }
  .paar { display: flex; flex-wrap: wrap; gap: var(--a4) var(--a5); }
  .ergebnis { background: var(--blatt-2); border-radius: var(--r); padding: var(--a4) var(--a5); border-inline-start: 4px solid var(--akzent); }
  .ergebnis h2, .satz h2, .plan-rechts section > h2 { font: 650 var(--gr-h2)/1.3 var(--schrift-ui); margin-bottom: var(--a2); }
  .gross { margin: var(--a2) 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--a2) var(--a3); }
  .gross .zahl { font: 700 2.5rem/1.1 var(--schrift-ui); color: var(--akzent-tinte); font-variant-numeric: tabular-nums; }
  .gross .einheit { font-size: var(--gr-h2); color: var(--tinte-2); }
  .zeile { margin-top: var(--a1); }
  .zeile.klein { font-size: var(--gr-klein); color: var(--tinte-2); }
  .satz-text { background: var(--blatt-2); border-radius: var(--r-klein); padding: var(--a3) var(--a4); margin-bottom: var(--a3); max-width: var(--breite-text); user-select: all; }
  .plan-tabelle { border-collapse: collapse; width: 100%; max-width: 460px; }
  .plan-tabelle th, .plan-tabelle td { text-align: start; padding: var(--a2) var(--a3); border-bottom: 1px solid var(--linie); font-weight: 400; }
  .plan-tabelle thead th { font-size: var(--gr-klein); color: var(--tinte-2); font-weight: 600; }
  .plan-tabelle tbody th { font-weight: 600; }
  .plan-tabelle .zahl-sp { text-align: right; font-variant-numeric: tabular-nums; }
  .plan-tabelle tr.an { background: var(--akzent-hell); }
  .fuss-hinweis { align-items: flex-start; }
  /* gefühlte Breite bis 860 px (lib/groesse.svelte.ts) */
  :global(:where(:root.eng-860)) .plan-raster { grid-template-columns: minmax(0, 1fr); gap: var(--a5); }
  :global(:where(:root.eng-860)) .plan-rechts { position: static; }
  :global(:where(:root.eng-860)) .wahl { grid-template-columns: 1fr; }
  :global(:where(:root.eng-860)) .gross .zahl { font-size: 2.1rem; }
  :global(:where(:root.eng-860)) .ergebnis { padding: var(--a4); }
</style>
