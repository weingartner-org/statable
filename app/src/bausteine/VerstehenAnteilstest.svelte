<script module lang="ts">
  /** Die Eingaben bleiben beim Wechsel zur Hilfe und zurück erhalten (Zustand nur im Modul, nie im Projekt). */
  const z = $state({ n: '100', p0: '0,5', seite: 'rechts' as 'links' | 'rechts' | 'zwei', alpha: '5', x: '', p1: '' });
  let lokal = false;
</script>
<script lang="ts">
  import { L, d, s } from '../lib/sitzung.svelte';
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { anteilBezug } from '../lib/anteilbezug';
  import { komma, pWert as pText } from '../lib/ergebnis';
  import { dichte, liesZahl, pruefeVerteilung, rechts as pRechts, links as pLinks } from '../lib/verteilungen';
  import { anteilstest } from '../lib/anteilstest';
  import { lokalisiere, prozent, wahrscheinlichkeit, zahlKurz } from '../lib/verstehenformat';
  import { ganzZahl, proz } from '../i18n/profil';
  import VerstehenBild, { type Saeule } from './VerstehenBild.svelte';
  import Icon from './Icon.svelte';

  if (!lokal) { lokal = true; lokalisiere(z, ['p0']); }
  const num = (t: string) => liesZahl(t);
  const k = zahlKurz;

  const n = $derived(num(z.n)), p0 = $derived(num(z.p0)), alphaProz = $derived(num(z.alpha)), alpha = $derived(alphaProz / 100);
  const hatX = $derived(z.x.trim() !== ''), hatP1 = $derived(z.p1.trim() !== '');
  const x = $derived(num(z.x)), p1 = $derived(num(z.p1));
  const fehler = $derived.by(() => {
    if (!Number.isFinite(n) || !Number.isFinite(p0)) return L('Bitte n und p₀ als Zahlen eingeben.', 'Please enter n and p₀ as numbers.');
    const f = pruefeVerteilung({ art: 'binom', n, p: p0 });
    if (f) return f;
    if (p0 <= 0 || p0 >= 1) return L('Der Vergleichswert p₀ muss zwischen 0 und 1 liegen (ohne die Grenzen).', 'The comparison value p₀ must lie between 0 and 1 (excluding the limits).');
    if (!(alpha > 0 && alpha < 0.5)) return L('Das Niveau α muss zwischen 0 % und 50 % liegen (zum Beispiel 5).', 'The level α must lie between 0% and 50% (for example 5).');
    if (hatX && !(Number.isInteger(x) && x >= 0 && x <= n)) return L('Die beobachtete Anzahl x muss eine ganze Zahl zwischen 0 und n sein.', 'The observed count x must be a whole number between 0 and n.');
    if (hatP1 && !(p1 >= 0 && p1 <= 1)) return L('Der wahre Anteil p₁ muss zwischen 0 und 1 liegen.', 'The true proportion p₁ must lie between 0 and 1.');
    return '';
  });
  const erg = $derived(fehler ? null : anteilstest({ n, p0, alpha, seite: z.seite, x: hatX ? x : undefined, p1: hatP1 ? p1 : undefined }));
  const b = $derived(erg?.bereich ?? null);
  const bz = $derived(s.einst.bezuege ?? {});
  const bezug = $derived(erg && (bz.excel || bz.ti84 || bz.spss || bz.r || bz.geogebra) ? anteilBezug(n, p0, z.seite, alphaProz, hatX ? x : undefined, s.einst.sprache === 'de') : null);
  const bezugNamen = $derived([bz.excel ? 'Excel' : '', bz.ti84 ? 'TI-84' : '', bz.spss ? 'SPSS' : '', bz.r ? 'R' : '', bz.geogebra ? 'GeoGebra' : ''].filter(Boolean).join(', '));

  const alphaT = $derived(proz(zahlKurz(alphaProz)));
  /** {2} · {2, 3} · {2, …, 9}: nie „{2, …, 2}“. */
  const menge = (a: number, c: number) => (a === c ? `{${a}}` : c === a + 1 ? `{${a}, ${c}}` : `{${a}, …, ${c}}`);
  /** K als Zahlenmenge. */
  const kMenge = $derived.by(() => {
    if (!b || b.leer) return '∅';
    const l = b.links !== null ? menge(0, b.links) : '', r = b.rechts !== null ? menge(b.rechts, n) : '';
    return l && r ? `${l} ∪ ${r}` : l || r;
  });
  const regelSatz = $derived.by(() => {
    if (!b || !erg) return '';
    const ta = prozent(b.tatsaechlichAlpha), ng = `n = ${ganzZahl(n)}`, pp = `p₀ = ${k(p0)}`;
    if (b.leer) return L(`Bei diesem n kann H₀ auf dem Niveau ${alphaT} nie abgelehnt werden: schon der äußerste Wert ist unter H₀ nicht selten genug.`, `With this n, H₀ can never be rejected at the ${alphaT} level: even the most extreme value is not rare enough under H₀.`);
    if (z.seite === 'rechts') return L(`Bei ${ng} und ${pp} wird H₀ auf dem Niveau ${alphaT} abgelehnt, wenn mindestens ${b.rechts} Treffer auftreten (tatsächliches α = ${ta}).`, `With ${ng} and ${pp}, H₀ is rejected at the ${alphaT} level if at least ${b.rechts} hits occur (actual α = ${ta}).`);
    if (z.seite === 'links') return L(`Bei ${ng} und ${pp} wird H₀ auf dem Niveau ${alphaT} abgelehnt, wenn höchstens ${b.links} Treffer auftreten (tatsächliches α = ${ta}).`, `With ${ng} and ${pp}, H₀ is rejected at the ${alphaT} level if at most ${b.links} hits occur (actual α = ${ta}).`);
    if (b.links !== null && b.rechts !== null) return L(`Bei ${ng} und ${pp} wird H₀ auf dem Niveau ${alphaT} (je Seite die Hälfte) abgelehnt, wenn höchstens ${b.links} oder mindestens ${b.rechts} Treffer auftreten (tatsächliches α = ${ta}).`, `With ${ng} and ${pp}, H₀ is rejected at the ${alphaT} level (half on each side) if at most ${b.links} or at least ${b.rechts} hits occur (actual α = ${ta}).`);
    if (b.links !== null) return L(`Bei ${ng} und ${pp} wird H₀ auf dem Niveau ${alphaT} (je Seite die Hälfte) abgelehnt, wenn höchstens ${b.links} Treffer auftreten; nach oben ist die Seite zu klein für einen Ablehnungsbereich (tatsächliches α = ${ta}).`, `With ${ng} and ${pp}, H₀ is rejected at the ${alphaT} level (half on each side) if at most ${b.links} hits occur; on the upper side the tail is too small for a rejection region (actual α = ${ta}).`);
    return L(`Bei ${ng} und ${pp} wird H₀ auf dem Niveau ${alphaT} (je Seite die Hälfte) abgelehnt, wenn mindestens ${b.rechts} Treffer auftreten; nach unten ist die Seite zu klein für einen Ablehnungsbereich (tatsächliches α = ${ta}).`, `With ${ng} and ${pp}, H₀ is rejected at the ${alphaT} level (half on each side) if at least ${b.rechts} hits occur; on the lower side the tail is too small for a rejection region (actual α = ${ta}).`);
  });

  const mu = $derived(n * p0), sigma = $derived(Math.sqrt(n * p0 * (1 - p0)));
  const bild = $derived.by(() => {
    if (!b || fehler) return null;
    const v = { art: 'binom', n, p: p0 } as const;
    let klo = Math.max(0, Math.floor(mu - 4 * sigma)), khi = Math.min(n, Math.ceil(mu + 4 * sigma));
    if (khi - klo < 6) { khi = Math.min(n, klo + 6); klo = Math.max(0, khi - 6); }
    const rand = [b.links, b.rechts, hatX ? x : null].filter((w): w is number => w !== null);
    for (const g of rand) { const nlo = Math.min(klo, g - 1), nhi = Math.max(khi, g + 1); if (nhi - nlo <= 3000) { klo = Math.max(0, nlo); khi = Math.min(n, nhi); } }
    const punkte: Saeule[] = [];
    for (let kk = klo; kk <= khi; kk++) punkte.push({ x: kk, p: dichte(v, kk), treffer: (b.links !== null && kk <= b.links) || (b.rechts !== null && kk >= b.rechts) });
    return { punkte, lo: klo - 0.5, hi: khi + 0.5, bereich: [klo, khi] as [number, number], aussen: (klo > 0 ? pLinks(v, klo - 1) : 0) + (khi < n ? pRechts(v, khi + 1) : 0) };
  });
  const bildBeschreibung = $derived.by(() => {
    if (!b || !erg) return '';
    const sat = L(`Säulen: Wahrscheinlichkeit für jede Trefferzahl unter H₀ (n = ${ganzZahl(n)}, p₀ = ${k(p0)}). Schraffiert: Ablehnungsbereich K = ${kMenge}, zusammen ${wahrscheinlichkeit(b.tatsaechlichAlpha)}.`, `Bars: probability of each number of hits under H₀ (n = ${ganzZahl(n)}, p₀ = ${k(p0)}). Hatched: rejection region K = ${kMenge}, ${wahrscheinlichkeit(b.tatsaechlichAlpha)} together.`);
    return hatX ? sat + ' ' + L(`Markiert: beobachtet x = ${x}.`, `Marked: observed x = ${x}.`) : sat;
  });

  /* ---------- Entscheidung, p-Wert ---------- */
  const pSeitenFormel = $derived(z.seite === 'rechts' ? `P(X ≥ ${hatX ? x : 'x'})` : z.seite === 'links' ? `P(X ≤ ${hatX ? x : 'x'})` : `2 · min( P(X ≤ ${hatX ? x : 'x'}), P(X ≥ ${hatX ? x : 'x'}) )`);
  const entscheidung = $derived.by(() => {
    if (!erg || !hatX || erg.ablehnen === undefined) return '';
    return erg.ablehnen
      ? L(`x = ${x} liegt im Ablehnungsbereich K. H₀ wird auf dem Niveau ${alphaT} abgelehnt: das Ergebnis ist signifikant.`, `x = ${x} lies in the rejection region K. H₀ is rejected at the ${alphaT} level: the result is significant.`)
      : L(`x = ${x} liegt nicht im Ablehnungsbereich K. H₀ wird auf dem Niveau ${alphaT} nicht abgelehnt: Die Daten liefern zu wenig Hinweis, dass p von ${k(p0)} abweicht. Das heißt nicht, dass H₀ stimmt.`, `x = ${x} does not lie in the rejection region K. H₀ is not rejected at the ${alphaT} level: the data give too little evidence that p differs from ${k(p0)}. That does not mean H₀ is true.`);
  });
  const pSatz = $derived.by(() => {
    if (!erg || !hatX || erg.pWert === undefined) return '';
    return z.seite === 'zwei'
      ? L(`p-Wert (zweiseitig, verdoppelt): p = min(1; 2 · min(P(X ≤ ${x}), P(X ≥ ${x}))) ${pText(erg.pWert)} (${wahrscheinlichkeit(erg.pWert)}).`, `p value (two-sided, doubled): p = min(1; 2 · min(P(X ≤ ${x}), P(X ≥ ${x}))) ${pText(erg.pWert)} (${wahrscheinlichkeit(erg.pWert)}).`)
      : z.seite === 'rechts'
        ? L(`p-Wert (rechtsseitig): p = P(X ≥ ${x}) ${pText(erg.pWert)} (${wahrscheinlichkeit(erg.pWert)}).`, `p value (right-sided): p = P(X ≥ ${x}) ${pText(erg.pWert)} (${wahrscheinlichkeit(erg.pWert)}).`)
        : L(`p-Wert (linksseitig): p = P(X ≤ ${x}) ${pText(erg.pWert)} (${wahrscheinlichkeit(erg.pWert)}).`, `p value (left-sided): p = P(X ≤ ${x}) ${pText(erg.pWert)} (${wahrscheinlichkeit(erg.pWert)}).`);
  });
  const betaSatz = $derived.by(() => {
    if (!erg || !hatP1 || erg.beta === undefined || erg.teststaerke === undefined) return '';
    if (b?.leer) return L(`Weil H₀ bei diesem n nie abgelehnt wird, ist die Teststärke 0: ein Unterschied wird nie gefunden (β = 100 %).`, `Because H₀ is never rejected with this n, the power is 0: a difference is never found (β = 100%).`);
    return L(`Gilt in Wirklichkeit p₁ = ${k(p1)}, dann wird H₀ mit der Wahrscheinlichkeit ${prozent(erg.teststaerke)} abgelehnt (Teststärke 1 − β). Mit der Wahrscheinlichkeit ${prozent(erg.beta)} wird der Unterschied übersehen (Fehler 2. Art, β).`, `If in reality p₁ = ${k(p1)}, H₀ is rejected with probability ${prozent(erg.teststaerke)} (power 1 − β). With probability ${prozent(erg.beta)} the difference is missed (type II error, β).`);
  });
  const prog = $derived(erg?.prognose ?? null);
  const progSatz = $derived.by(() => {
    if (!prog || !b) return '';
    return L(`Gilt p = ${k(p0)}, dann liegt die Trefferzahl mit der Wahrscheinlichkeit ${prozent(prog.wahrscheinlichkeit)} zwischen ${prog.a} und ${prog.b}. Als Anteil: ${k(prog.relA)} bis ${k(prog.relB)}.`, `If p = ${k(p0)} holds, the number of hits lies between ${prog.a} and ${prog.b} with probability ${prozent(prog.wahrscheinlichkeit)}. As a proportion: ${k(prog.relA)} to ${k(prog.relB)}.`);
  });
  const marke = $derived(hatX && !fehler ? { x: x, text: `x = ${x}` } : null);
</script>

<div class="vst-raster">
  <div class="vst-links">
    <fieldset class="vst-gruppe"><legend>{L('1  Die Annahme H₀', '1  The assumption H₀')}</legend>
      <div class="vst-paar">
        <div class="eingabe"><label for="va-n">{L('Stichprobenumfang n', 'Sample size n')}</label><input id="va-n" type="text" inputmode="numeric" autocomplete="off" bind:value={z.n} aria-invalid={fehler ? 'true' : undefined} aria-describedby={(fehler) ? 'va-fehler' : undefined}></div>
        <div class="eingabe"><label for="va-p0">{L('Anteil unter H₀: p₀', 'Proportion under H₀: p₀')}</label><input id="va-p0" type="text" inputmode="decimal" autocomplete="off" bind:value={z.p0} aria-invalid={fehler ? 'true' : undefined} aria-describedby={(fehler) ? 'va-fehler' : undefined}></div>
      </div>
      <span class="hilfe">{L('H₀ sagt: Der Anteil in der Gesamtheit ist p₀. X ist die Zahl der Treffer in n unabhängigen Versuchen.', 'H₀ says: the proportion in the population is p₀. X is the number of hits in n independent trials.')}</span>
    </fieldset>

    <fieldset class="vst-gruppe"><legend>{L('2  Wie wird getestet?', '2  How is it tested?')}</legend>
      <div class="vst-wahl" role="radiogroup" aria-label={L('Richtung der Alternative', 'Direction of the alternative')} style="grid-template-columns:1fr">
        <label data-begriff="einseitig-zweiseitig"><input type="radio" name="va-seite" value="links" bind:group={z.seite}><span>{L('linksseitig', 'left-sided')} <span class="zeichen">(H₁: p &lt; p₀)</span></span></label>
        <label data-begriff="einseitig-zweiseitig"><input type="radio" name="va-seite" value="rechts" bind:group={z.seite}><span>{L('rechtsseitig', 'right-sided')} <span class="zeichen">(H₁: p &gt; p₀)</span></span></label>
        <label data-begriff="einseitig-zweiseitig"><input type="radio" name="va-seite" value="zwei" bind:group={z.seite}><span>{L('zweiseitig', 'two-sided')} <span class="zeichen">(H₁: p ≠ p₀)</span></span></label>
      </div>
      <div class="eingabe"><span class="lbl" id="va-alpha-l">{L('Signifikanzniveau α', 'Significance level α')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="va-alpha-l">{#each ['1', '5', '10'] as a}<label data-begriff="signifikanzniveau"><input type="radio" name="va-alpha" value={a} bind:group={z.alpha}>{proz(a)}</label>{/each}</div>
        <div style="display:flex;align-items:center;gap:var(--a2);margin-top:var(--a2)"><label for="va-alpha" class="hilfe">{L('oder frei (in Prozent):', 'or free (in percent):')}</label><input id="va-alpha" type="text" inputmode="decimal" autocomplete="off" bind:value={z.alpha} style="max-width:8ch"></div></div>
    </fieldset>

    <fieldset class="vst-gruppe"><legend>{L('3  Optional: Beobachtung und Wirklichkeit', '3  Optional: observation and reality')}</legend>
      <div class="vst-paar">
        <div class="eingabe"><label for="va-x">{L('Beobachtete Treffer x', 'Observed hits x')}</label><input id="va-x" type="text" inputmode="numeric" autocomplete="off" bind:value={z.x} aria-invalid={fehler && hatX ? 'true' : undefined} aria-describedby={(fehler && hatX) ? 'va-fehler' : undefined}></div>
        <div class="eingabe"><label for="va-p1">{L('Wahrer Anteil p₁ (für β)', 'True proportion p₁ (for β)')}</label><input id="va-p1" type="text" inputmode="decimal" autocomplete="off" bind:value={z.p1} aria-invalid={fehler && hatP1 ? 'true' : undefined} aria-describedby={(fehler && hatP1) ? 'va-fehler' : undefined}></div>
      </div>
      <span class="hilfe">{L('Mit x entscheidet die Seite, ob H₀ abgelehnt wird. Mit p₁ zeigt sie, wie oft ein wirklich vorhandener Unterschied übersehen würde.', 'With x the page decides whether H₀ is rejected. With p₁ it shows how often a truly existing difference would be missed.')}</span>
    </fieldset>
  </div>

  <div class="vst-rechts">
    {#if fehler}
      <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p id="va-fehler">{fehler}</p></div>
    {:else if erg && b}
      <section class="vst-ergebnis" aria-labelledby="va-erg-t"><h2 id="va-erg-t">{L('Entscheidungsregel', 'Decision rule')}</h2>
        <p class="vst-gross" use:ergebnisAnsage><span class="zahl">K = {kMenge}</span></p>
        <p class="vst-zeile">{regelSatz}</p>
        <p class="vst-zeile klein">{L(`Tatsächliches α = P(X ∈ K | p₀) = ${wahrscheinlichkeit(b.tatsaechlichAlpha)} (${prozent(b.tatsaechlichAlpha)}). Es liegt nie über dem gewählten α = ${alphaT}, oft aber darunter, weil X nur ganze Werte annimmt: der nächste Wert würde das gewählte α überschreiten.`, `Actual α = P(X ∈ K | p₀) = ${wahrscheinlichkeit(b.tatsaechlichAlpha)} (${prozent(b.tatsaechlichAlpha)}). It is never above the chosen α = ${alphaT}, but often below it, because X takes only whole values: the next value would exceed the chosen α.`)}</p>
      </section>
      {#if bezug}
        <details class="auf"><summary>{L('So geht es in', 'How to do it in')} {bezugNamen}</summary>
          {#if bz.excel && bezug.excel.length}<h4>Excel</h4><ul class="heft-text">{#each bezug.excel as zl, i (i)}<li><code>{zl}</code></li>{/each}</ul>{/if}
          {#if bz.ti84}<h4>TI-84</h4>{#if bezug.ti.length}<ul class="heft-text">{#each bezug.ti as zl, i (i)}<li><code>{zl}</code></li>{/each}</ul>{:else}<p class="heft-text">{L('Für diesen Fall hat der TI-84 keinen fertigen Befehl; mit binomcdf lassen sich die Wahrscheinlichkeiten von Hand zusammensetzen.', 'For this case the TI-84 has no ready-made command; with binomcdf the probabilities can be put together by hand.')}</p>{/if}{/if}
          {#if bz.spss && bezug.spss.length}<h4>SPSS</h4><ul class="heft-text">{#each bezug.spss as zl, i (i)}<li><code>{zl}</code></li>{/each}</ul>{/if}
          {#if bz.r && bezug.r.length}<h4>R</h4><ul class="heft-text">{#each bezug.r as zl, i (i)}<li><code>{zl}</code></li>{/each}</ul>{/if}
          {#if bz.geogebra && bezug.geogebra.length}<h4>GeoGebra</h4><ul class="heft-text">{#each bezug.geogebra as zl, i (i)}<li><code>{zl}</code></li>{/each}</ul>{/if}
          <p class="heft-text" style="color:var(--tinte-2)">{L('Namen und Menüs hängen von der Version und der Sprache des Programms ab; hier stehen sie passend zur Sprache von Statable. Kleine Abweichungen in der letzten Stelle kommen vom Runden.', 'Names and menus depend on the version and the language of the program; here they match the language of Statable. Small differences in the last digit come from rounding.')}</p>
        </details>
      {/if}

      {#if bild}
        <section class="vst-bild" aria-labelledby="va-bild-t"><h2 id="va-bild-t" class="nur-vorleser">{L('Bild', 'Picture')}</h2>
          <VerstehenBild titel={L(`Binomialverteilung B(${ganzZahl(n)}; ${k(p0)}) unter H₀`, `Binomial distribution B(${ganzZahl(n)}; ${k(p0)}) under H₀`)} unterzeile={L('Säulen: P(X = k) unter H₀. Schraffiert: Ablehnungsbereich K.', 'Bars: P(X = k) under H₀. Hatched: rejection region K.')}
            beschreibung={bildBeschreibung} xText={L('Trefferzahl X', 'Number of hits X')} yText={L('Wahrscheinlichkeit', 'Probability')} saeulen={{ punkte: bild.punkte, lo: bild.lo, hi: bild.hi }} marke={marke} farbe="b" />
          <div class="vst-legende"><span><i class="b"></i>{L('Ablehnungsbereich K', 'rejection region K')}</span><span><i class="grau"></i>{L('Annahmebereich', 'non-rejection region')}</span></div>
          {#if bild.aussen > 0}<p class="vst-zeile klein">{L(`Das Bild zeigt nur X von ${ganzZahl(bild.bereich[0])} bis ${ganzZahl(bild.bereich[1])}. Außerhalb liegen zusammen ${wahrscheinlichkeit(bild.aussen)} der Wahrscheinlichkeit.`, `The picture shows only X from ${ganzZahl(bild.bereich[0])} to ${ganzZahl(bild.bereich[1])}. Outside lie ${wahrscheinlichkeit(bild.aussen)} of the probability together.`)}</p>{/if}
        </section>
      {/if}

      {#if hatX && erg.ablehnen !== undefined}
        <section class="vst-block" aria-labelledby="va-ent-t"><h2 id="va-ent-t">{L('Entscheidung für die Beobachtung', 'Decision for the observation')}</h2>
          <p class="vst-zeile"><b>{erg.ablehnen ? L('H₀ ablehnen', 'Reject H₀') : L('H₀ nicht ablehnen', 'Do not reject H₀')}</b></p>
          <p class="vst-zeile">{entscheidung}</p>
          <p class="vst-zeile">{pSatz}</p>
          <p class="vst-zeile klein">{L(`Rechenweg: ${pSeitenFormel}. Ein p-Wert ≤ α ${komma(alpha, 3)} und die Lage in K gehören zusammen: beides führt zur selben Entscheidung.`, `Calculation: ${pSeitenFormel}. A p value ≤ α ${komma(alpha, 3)} and lying in K go together: both lead to the same decision.`)}</p>
          {#if z.seite === 'zwei' && Math.abs(p0 - 0.5) > 1e-12}
            <p class="vst-zeile klein">{L('R (binom.test) rechnet zweiseitig anders: dort zählt die Summe aller Wahrscheinlichkeiten, die höchstens so groß sind wie P(X = x). Bei p₀ ≠ 0,5 kann der p-Wert dort kleiner sein. Statable verdoppelt den kleineren einseitigen Wert, so passen Entscheidung und p-Wert immer zusammen.', 'R (binom.test) calculates two-sided differently: there the sum of all probabilities that are at most as large as P(X = x) counts. For p₀ ≠ 0.5 the p value can be smaller there. Statable doubles the smaller one-sided value, so decision and p value always agree.')}</p>
          {/if}
        </section>
      {/if}

      {#if hatP1 && betaSatz}
        <section class="vst-block" aria-labelledby="va-beta-t"><h2 id="va-beta-t">{L('Fehler 2. Art und Teststärke', 'Type II error and power')}</h2>
          <p class="vst-zeile">{betaSatz}</p>
          <table class="vst-tabelle"><tbody>
            <tr><th scope="row">β = P(X ∉ K | p₁)</th><td class="zahl-sp">{wahrscheinlichkeit(erg.beta!)} · {prozent(erg.beta!)}</td></tr>
            <tr><th scope="row">{L('Teststärke', 'Power')} 1 − β</th><td class="zahl-sp">{wahrscheinlichkeit(erg.teststaerke!)} · {prozent(erg.teststaerke!)}</td></tr>
          </tbody></table>
        </section>
      {/if}

      {#if prog}
        <section class="vst-block" aria-labelledby="va-prog-t"><h2 id="va-prog-t">{L('Prognoseintervall', 'Prediction interval')}</h2>
          <p class="vst-gross"><span class="zahl">[{prog.a}; {prog.b}]</span></p>
          <p class="vst-zeile">{progSatz}</p>
          <p class="vst-zeile klein">{L(`Das Prognoseintervall ist das Gegenstück zu K: alle Trefferzahlen, die nicht zum zweiseitigen Ablehnungsbereich gehören. Zum Vergleich die Sigma-Näherung μ ± z · σ: ${komma(Math.max(0, prog.sigmaVon), 1)} bis ${komma(Math.min(n, prog.sigmaBis), 1)}.`, `The prediction interval is the counterpart of K: all numbers of hits that do not belong to the two-sided rejection region. For comparison, the sigma approximation μ ± z · σ: ${komma(Math.max(0, prog.sigmaVon), 1)} to ${komma(Math.min(n, prog.sigmaBis), 1)}.`)}{#if prog.sigmaVon < 0} {L(`Die Näherung reicht rechnerisch bis ${komma(prog.sigmaVon, 1)}; sie ist bei 0 abgeschnitten, weil es keine negative Trefferzahl gibt.`, `The approximation formally reaches ${komma(prog.sigmaVon, 1)}; it is cut off at 0 because there is no negative number of hits.`)}{/if}{#if prog.sigmaBis > n} {L(`Die Näherung reicht rechnerisch bis ${komma(prog.sigmaBis, 1)}; sie ist bei n = ${ganzZahl(n)} abgeschnitten, weil es nicht mehr Treffer als Versuche geben kann.`, `The approximation formally reaches ${komma(prog.sigmaBis, 1)}; it is cut off at n = ${ganzZahl(n)} because there cannot be more hits than trials.`)}{/if}</p>
        </section>
      {:else}
        <p class="banner ruhig vst-hinweis"><Icon n="info" /><span>{d('Das Prognoseintervall gehört zum zweiseitigen Test. Wähle „zweiseitig“, um es zu sehen.', 'Das Prognoseintervall gehört zum zweiseitigen Test. Wählen Sie „zweiseitig“, um es zu sehen.', 'The prediction interval belongs to the two-sided test. Choose “two-sided” to see it.')}</span></p>
      {/if}

      <p class="banner ruhig vst-hinweis"><Icon n="info" /><span>{L('Prognoseintervall und Konfidenzintervall sind verschieden: Das Prognoseintervall gilt bei bekanntem p für die Trefferzahl (vorwärts). Das Konfidenzintervall gilt bei beobachtetem x für den Anteil p (rückwärts). ', 'Prediction interval and confidence interval are different: the prediction interval is for the number of hits when p is known (forwards). The confidence interval is for the proportion p when x is observed (backwards). ')}<a href="#verstehen/kennzahlen">{L('Konfidenzintervall berechnen', 'Calculate a confidence interval')}</a></span></p>
    {/if}
  </div>
</div>
