<script module lang="ts">
  type Was = 'anteil' | 'mittel' | 'umfang' | 'rate';
  /** Die Eingaben bleiben beim Wechsel zur Hilfe und zurück erhalten (Zustand nur im Modul, nie im Projekt). */
  let lokal = false;
  const z = $state({
    was: 'anteil' as Was,
    eingabe: 'anzahl' as 'anzahl' | 'phat', x: '7', n: '40', phat: '0,175', p0: '0,5',
    niveau: 0.95, seite: 'zwei' as 'zwei' | 'links' | 'rechts',
    m: '52', s: '10', nm: '25', mu0: '50',
    umfangFuer: 'anteil' as 'anteil' | 'mittel', d: '3', laenge: false, pu: '0,5', du: '2', sigmaU: '10'
  });
</script>
<script lang="ts">
  import { L, d } from '../lib/sitzung.svelte';
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import { dez, ganzZahl, iv, proz } from '../i18n/profil';
  import { komma, pWert } from '../lib/ergebnis';
  import { liesZahl } from '../lib/verteilungen';
  import { anteilAusKennzahlen, eingabeAnteil, mittelwertAusKennzahlen, pruefeAnteil, pruefeMittelwert, umfangAnteil, umfangAnteilLaenge, umfangMittelwert, zZumNiveau } from '../lib/kennzahlen';
  import { lokalisiere, zahlKurz } from '../lib/verstehenformat';
  import Icon from './Icon.svelte';
  import VerstehenRatenEingabe from './VerstehenRatenEingabe.svelte';
  import VerstehenRatenErgebnis from './VerstehenRatenErgebnis.svelte';

  if (!lokal) { lokal = true; lokalisiere(z, ['phat', 'p0', 'pu']); }
  const num = (t: string) => liesZahl(t);
  const pz = (v: number, st = 2) => proz(komma(v * 100, st));
  const niveauProz = $derived(Math.round(z.niveau * 100));
  const alpha = $derived(1 - z.niveau);
  /** Intervall mit Semikolon bei Dezimalkomma, Anteile mit Null und vier Stellen (Schulschreibweise). */
  const ivP = (lo: number, hi: number) => iv(komma(lo, 4), komma(hi, 4));

  /* ---------- Anteil ---------- */
  const nA = $derived(num(z.n)), p0 = $derived(num(z.p0));
  const xAus = $derived(z.eingabe === 'anzahl' ? { x: num(z.x), ganzzahlig: Number.isInteger(num(z.x)) } : eingabeAnteil(num(z.phat), nA));
  const fehlerAnteil = $derived(pruefeAnteil({ x: xAus.x, n: nA, p0, niveau: z.niveau }) ?? (z.eingabe === 'anzahl' && !Number.isInteger(xAus.x) ? L('Die Anzahl x muss eine ganze Zahl sein.', 'The count x must be a whole number.') : ''));
  const anteil = $derived(z.was === 'anteil' && !fehlerAnteil ? anteilAusKennzahlen({ x: xAus.x, n: nA, p0, niveau: z.niveau, seite: z.seite }) : null);
  const anteilHinweisRunden = $derived(z.eingabe === 'phat' && !fehlerAnteil && !xAus.ganzzahlig);

  /* ---------- Mittelwert ---------- */
  const mm = $derived(num(z.m)), ss = $derived(num(z.s)), nM = $derived(num(z.nm)), mu0 = $derived(num(z.mu0));
  const fehlerMittel = $derived(!Number.isFinite(mu0) ? L('Bitte μ₀ als Zahl eingeben.', 'Please enter μ₀ as a number.') : (pruefeMittelwert({ m: mm, s: ss, n: nM, niveau: z.niveau }) ?? ''));
  const mittel = $derived(z.was === 'mittel' && !fehlerMittel ? mittelwertAusKennzahlen({ m: mm, s: ss, n: nM, mu0, niveau: z.niveau, seite: z.seite }) : null);

  /* ---------- Stichprobenumfang ---------- */
  const dU = $derived(num(z.d)), pU = $derived(num(z.pu)), dM = $derived(num(z.du)), sigU = $derived(num(z.sigmaU));
  const fehlerUmfang = $derived.by(() => {
    if (z.umfangFuer === 'anteil') {
      if (!(dU > 0) || !(dU < 100)) return L('Die gewünschte Breite muss größer als 0 und kleiner als 100 Prozentpunkte sein.', 'The desired width must be greater than 0 and less than 100 percentage points.');
      if (!(pU > 0 && pU < 1)) return L('Der erwartete Anteil p muss zwischen 0 und 1 liegen (ohne die Grenzen).', 'The expected proportion p must lie between 0 and 1 (excluding the limits).');
      return '';
    }
    if (!(dM > 0)) return L('Die gewünschte Breite muss größer als 0 sein.', 'The desired width must be greater than 0.');
    if (!(sigU > 0)) return L('Die geschätzte Standardabweichung σ muss größer als 0 sein.', 'The estimated standard deviation σ must be greater than 0.');
    return '';
  });
  const nUmfang = $derived.by(() => {
    if (z.was !== 'umfang' || fehlerUmfang) return null;
    if (z.umfangFuer === 'anteil') return z.laenge ? umfangAnteilLaenge(z.niveau, dU / 100, pU) : umfangAnteil(z.niveau, dU / 100, pU);
    return z.laenge ? umfangMittelwert(z.niveau, dM / 2, sigU) : umfangMittelwert(z.niveau, dM, sigU);
  });
  const tabelleUmfang = $derived(z.was === 'umfang' && z.umfangFuer === 'anteil' && !fehlerUmfang && pU === 0.5 ? [1, 2, 3, 5].map(pp => ({ pp, n: umfangAnteil(z.niveau, pp / 100) })) : []);

  const seiteText = $derived(z.seite === 'zwei' ? L('zweiseitig', 'two-sided') : z.seite === 'links' ? L('linksseitig', 'left-sided') : L('rechtsseitig', 'right-sided'));
</script>

<div class="vst-raster">
  <div class="vst-links">
    <fieldset class="vst-gruppe"><legend>{d('1  Was hast du?', '1  Was haben Sie?', '1  What do you have?')}</legend>
      <div class="vst-wahl" role="radiogroup" aria-label={L('Art der Kennzahlen', 'Type of summary numbers')}>
        <label data-begriff="anteil"><input type="radio" name="vk-was" value="anteil" bind:group={z.was}><span>{L('Einen Anteil', 'A proportion')} <span class="zeichen">({L('x von n', 'x out of n')})</span></span></label>
        <label data-begriff="mittelwert"><input type="radio" name="vk-was" value="mittel" bind:group={z.was}><span>{L('Einen Mittelwert', 'A mean')} <span class="zeichen">(x̄, s, n)</span></span></label>
        <label data-begriff="stichprobenumfang"><input type="radio" name="vk-was" value="umfang" bind:group={z.was}><span>{L('Wie groß muss die Stichprobe sein?', 'How large must the sample be?')}</span></label>
        <label data-begriff="rate"><input type="radio" name="vk-was" value="rate" bind:group={z.was}><span>{L('Eine Rate', 'A rate')} <span class="zeichen">({L('Ereignisse, Personenzeit', 'events, person-time')})</span></span></label>
      </div>
    </fieldset>

    {#if z.was === 'anteil'}
      <fieldset class="vst-gruppe"><legend>{L('2  Die Zahlen', '2  The numbers')}</legend>
        <div class="segment" role="radiogroup" aria-label={L('Wie liegt der Anteil vor?', 'How is the proportion given?')}>
          <label data-begriff="absolute-haeufigkeit"><input type="radio" name="vk-ein" value="anzahl" bind:group={z.eingabe}>{L('Anzahl x', 'Count x')}</label>
          <label data-begriff="zeichen-p-dach"><input type="radio" name="vk-ein" value="phat" bind:group={z.eingabe}>{L('Anteil p̂', 'Proportion p̂')}</label>
        </div>
        <div class="vst-paar">
          {#if z.eingabe === 'anzahl'}
            <div class="eingabe"><label for="vk-x">{L('Anzahl x („Treffer“)', 'Count x (“hits”)')}</label><input id="vk-x" type="text" inputmode="numeric" autocomplete="off" bind:value={z.x} aria-invalid={fehlerAnteil ? 'true' : undefined} aria-describedby={(fehlerAnteil) ? 'vk-fehler-anteil' : undefined}></div>
          {:else}
            <div class="eingabe"><label for="vk-phat">{L('Anteil p̂ (0 bis 1)', 'Proportion p̂ (0 to 1)')}</label><input id="vk-phat" type="text" inputmode="decimal" autocomplete="off" bind:value={z.phat} aria-invalid={fehlerAnteil ? 'true' : undefined} aria-describedby={(fehlerAnteil) ? 'vk-fehler-anteil' : undefined}></div>
          {/if}
          <div class="eingabe"><label for="vk-n">{L('Stichprobenumfang n', 'Sample size n')}</label><input id="vk-n" type="text" inputmode="numeric" autocomplete="off" bind:value={z.n} aria-invalid={fehlerAnteil ? 'true' : undefined} aria-describedby={(fehlerAnteil) ? 'vk-fehler-anteil' : undefined}></div>
        </div>
        <div class="eingabe"><label for="vk-p0">{L('Vergleichswert p₀ (zum Testen)', 'Comparison value p₀ (for the test)')}</label><input id="vk-p0" type="text" inputmode="decimal" autocomplete="off" bind:value={z.p0} style="max-width:12ch">
          <span class="hilfe">{L('Der Anteil, gegen den getestet wird, zum Beispiel 0,5 für „die Hälfte“.', 'The proportion that is tested against, for example 0.5 for “half”.')}</span></div>
      </fieldset>
    {:else if z.was === 'mittel'}
      <fieldset class="vst-gruppe"><legend>{L('2  Die Zahlen', '2  The numbers')}</legend>
        <div class="vst-paar">
          <div class="eingabe"><label for="vk-m">{L('Mittelwert x̄', 'Mean x̄')}</label><input id="vk-m" type="text" inputmode="decimal" autocomplete="off" bind:value={z.m} aria-invalid={fehlerMittel ? 'true' : undefined} aria-describedby={(fehlerMittel) ? 'vk-fehler-mittel' : undefined}></div>
          <div class="eingabe"><label for="vk-s">{L('Standardabweichung s', 'Standard deviation s')}</label><input id="vk-s" type="text" inputmode="decimal" autocomplete="off" bind:value={z.s} aria-invalid={fehlerMittel ? 'true' : undefined} aria-describedby={(fehlerMittel) ? 'vk-fehler-mittel' : undefined}></div>
          <div class="eingabe"><label for="vk-nm">{L('Stichprobenumfang n', 'Sample size n')}</label><input id="vk-nm" type="text" inputmode="numeric" autocomplete="off" bind:value={z.nm} aria-invalid={fehlerMittel ? 'true' : undefined} aria-describedby={(fehlerMittel) ? 'vk-fehler-mittel' : undefined}></div>
        </div>
        <div class="eingabe"><label for="vk-mu0">{L('Vergleichswert μ₀ (zum Testen)', 'Comparison value μ₀ (for the test)')}</label><input id="vk-mu0" type="text" inputmode="decimal" autocomplete="off" bind:value={z.mu0} style="max-width:12ch">
          <span class="hilfe">{L('Der Mittelwert, gegen den getestet wird. Die Standardabweichung der Gesamtheit ist unbekannt, darum rechnet Statable mit t, nicht mit z.', 'The mean that is tested against. The population standard deviation is unknown, so Statable uses t, not z.')}</span></div>
      </fieldset>
    {:else if z.was === 'rate'}
      <VerstehenRatenEingabe />
    {:else}
      <fieldset class="vst-gruppe"><legend>{L('2  Wofür?', '2  For what?')}</legend>
        <div class="segment" role="radiogroup" aria-label={L('Wofür wird der Umfang gebraucht?', 'What is the sample size needed for?')}>
          <label data-begriff="anteil"><input type="radio" name="vk-uf" value="anteil" bind:group={z.umfangFuer}>{L('Einen Anteil schätzen', 'Estimate a proportion')}</label>
          <label data-begriff="mittelwert"><input type="radio" name="vk-uf" value="mittel" bind:group={z.umfangFuer}>{L('Einen Mittelwert schätzen', 'Estimate a mean')}</label>
        </div>
        <div class="segment" role="radiogroup" aria-label={L('Wie wird die Breite angegeben?', 'How is the width given?')}>
          <label data-begriff="intervallbreite"><input type="radio" name="vk-lg" checked={!z.laenge} onchange={() => (z.laenge = false)}>{L('Halbbreite „± d“', 'Half-width “± d”')}</label>
          <label data-begriff="intervallbreite"><input type="radio" name="vk-lg" checked={z.laenge} onchange={() => (z.laenge = true)}>{L('Länge L des ganzen Intervalls', 'Length L of the whole interval')}</label>
        </div>
        {#if z.umfangFuer === 'anteil'}
          <div class="vst-paar">
            <div class="eingabe"><label for="vk-d">{z.laenge ? L('Länge L (in Prozentpunkten)', 'Length L (in percentage points)') : L('Halbbreite d (in Prozentpunkten)', 'Half-width d (in percentage points)')}</label><input id="vk-d" type="text" inputmode="decimal" autocomplete="off" bind:value={z.d} aria-invalid={fehlerUmfang ? 'true' : undefined} aria-describedby={(fehlerUmfang) ? 'vk-fehler-umfang' : undefined}></div>
            <div class="eingabe"><label for="vk-pu">{L('Erwarteter Anteil p', 'Expected proportion p')}</label><input id="vk-pu" type="text" inputmode="decimal" autocomplete="off" bind:value={z.pu} aria-invalid={fehlerUmfang ? 'true' : undefined} aria-describedby={(fehlerUmfang) ? 'vk-fehler-umfang' : undefined}></div>
          </div>
          <span class="hilfe">{L('Ohne Vorwissen p = 0,5 lassen: das ist der ungünstigste Fall, kein anderes p braucht mehr Personen.', 'Without prior knowledge leave p = 0.5: that is the worst case, no other p needs more people.')}</span>
        {:else}
          <div class="vst-paar">
            <div class="eingabe"><label for="vk-du">{z.laenge ? L('Länge L (in Einheiten des Mittelwerts)', 'Length L (in units of the mean)') : L('Halbbreite d (in Einheiten des Mittelwerts)', 'Half-width d (in units of the mean)')}</label><input id="vk-du" type="text" inputmode="decimal" autocomplete="off" bind:value={z.du} aria-invalid={fehlerUmfang ? 'true' : undefined} aria-describedby={(fehlerUmfang) ? 'vk-fehler-umfang' : undefined}></div>
            <div class="eingabe"><label for="vk-sg">{L('Geschätzte Standardabweichung σ', 'Estimated standard deviation σ')}</label><input id="vk-sg" type="text" inputmode="decimal" autocomplete="off" bind:value={z.sigmaU} aria-invalid={fehlerUmfang ? 'true' : undefined} aria-describedby={(fehlerUmfang) ? 'vk-fehler-umfang' : undefined}></div>
          </div>
        {/if}
      </fieldset>
    {/if}

    {#if z.was !== 'rate'}
    <fieldset class="vst-gruppe"><legend>{z.was === 'umfang' ? L('3  Wie sicher?', '3  How certain?') : L('3  Wie sicher und wie getestet?', '3  How certain and how tested?')}</legend>
      <div class="eingabe"><span class="lbl" id="vk-niv-l">{L('Niveau des Intervalls', 'Level of the interval')}</span>
        <div class="segment" role="radiogroup" aria-labelledby="vk-niv-l">{#each [0.9, 0.95, 0.99] as nv}<label data-begriff="vertrauensniveau"><input type="radio" name="vk-niv" value={nv} bind:group={z.niveau}>{proz(String(Math.round(nv * 100)))}</label>{/each}</div></div>
      {#if z.was !== 'umfang'}
        <div class="eingabe"><span class="lbl" id="vk-seite-l">{L('Test: welche Richtung?', 'Test: which direction?')}</span>
          <div class="vst-wahl" role="radiogroup" aria-labelledby="vk-seite-l" style="grid-template-columns:1fr">
            <label data-begriff="einseitig-zweiseitig"><input type="radio" name="vk-seite" value="zwei" bind:group={z.seite}><span>{L('zweiseitig', 'two-sided')} <span class="zeichen">({z.was === 'anteil' ? 'p ≠ p₀' : 'μ ≠ μ₀'})</span></span></label>
            <label data-begriff="einseitig-zweiseitig"><input type="radio" name="vk-seite" value="links" bind:group={z.seite}><span>{L('linksseitig', 'left-sided')} <span class="zeichen">({z.was === 'anteil' ? 'p < p₀' : 'μ < μ₀'})</span></span></label>
            <label data-begriff="einseitig-zweiseitig"><input type="radio" name="vk-seite" value="rechts" bind:group={z.seite}><span>{L('rechtsseitig', 'right-sided')} <span class="zeichen">({z.was === 'anteil' ? 'p > p₀' : 'μ > μ₀'})</span></span></label>
          </div></div>
        <span class="hilfe">{L('Das Intervall ist immer zweiseitig. Die Richtung betrifft nur den Test.', 'The interval is always two-sided. The direction affects only the test.')}</span>
      {/if}
    </fieldset>
    {/if}
  </div>

  <div class="vst-rechts">
    {#if z.was === 'anteil'}
      {#if fehlerAnteil}
        <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p id="vk-fehler-anteil">{fehlerAnteil}</p></div>
      {:else if anteil}
        <section class="vst-ergebnis" aria-labelledby="vk-erg-t"><h2 id="vk-erg-t">{L('Anteil und Intervall', 'Proportion and interval')}</h2>
          <p class="vst-gross" use:ergebnisAnsage><span class="zahl">{pz(anteil.phat)}</span> <span class="einheit">p̂ = {komma(anteil.phat, 4)}</span></p>
          <p class="vst-zeile">{L(`Von ${ganzZahl(nA)} Fällen haben ${zahlKurz(xAus.x)} die Eigenschaft: p̂ = ${komma(anteil.phat, 4)} (${pz(anteil.phat)}).`, `Of ${ganzZahl(nA)} cases, ${zahlKurz(xAus.x)} have the property: p̂ = ${komma(anteil.phat, 4)} (${pz(anteil.phat)}).`)}</p>
          <p class="vst-zeile">{L(`Das ${niveauProz} %-Konfidenzintervall nach Wilson für den Anteil in der Gesamtheit: ${ivP(anteil.lo, anteil.hi)}, das sind ${pz(anteil.lo)} bis ${pz(anteil.hi)}.`, `The ${niveauProz}% confidence interval (Wilson) for the proportion in the population: ${ivP(anteil.lo, anteil.hi)}, that is ${pz(anteil.lo)} to ${pz(anteil.hi)}.`)}</p>
        </section>
        {#if anteilHinweisRunden}<div class="banner ruhig vst-hinweis"><Icon n="info" /><p>{d(`p̂ · n = ${zahlKurz(xAus.x)} ist keine ganze Zahl. Statable rundet nicht still: gerechnet wird mit diesem x. Prüfe, ob p̂ gerundet war.`, `p̂ · n = ${zahlKurz(xAus.x)} ist keine ganze Zahl. Statable rundet nicht still: gerechnet wird mit diesem x. Prüfen Sie, ob p̂ gerundet war.`, `p̂ · n = ${zahlKurz(xAus.x)} is not a whole number. Statable does not round silently: this x is used. Check whether p̂ was rounded.`)}</p></div>{/if}

        <section class="vst-block" aria-labelledby="vk-test-t"><h2 id="vk-test-t">{L(`Test gegen p₀ = ${zahlKurz(p0)} (${seiteText})`, `Test against p₀ = ${zahlKurz(p0)} (${seiteText})`)}</h2>
          <p class="vst-zeile">z = {komma(anteil.z, 2)} · p {pWert(anteil.p)}</p>
          <p class="vst-zeile">{#if anteil.p <= alpha}
            {z.seite === 'zwei' ? L(`Auf dem Niveau ${komma(alpha * 100, 0)} % unterscheidet sich der Anteil signifikant von ${zahlKurz(p0)}.`, `At the ${komma(alpha * 100, 0)}% level the proportion differs significantly from ${zahlKurz(p0)}.`)
              : z.seite === 'links' ? L(`Auf dem Niveau ${komma(alpha * 100, 0)} % ist der Anteil signifikant kleiner als ${zahlKurz(p0)}.`, `At the ${komma(alpha * 100, 0)}% level the proportion is significantly smaller than ${zahlKurz(p0)}.`)
              : L(`Auf dem Niveau ${komma(alpha * 100, 0)} % ist der Anteil signifikant größer als ${zahlKurz(p0)}.`, `At the ${komma(alpha * 100, 0)}% level the proportion is significantly larger than ${zahlKurz(p0)}.`)}
          {:else}
            {z.seite === 'zwei' ? L(`Auf dem Niveau ${komma(alpha * 100, 0)} % gibt es zu wenig Hinweis auf einen Unterschied zu ${zahlKurz(p0)}. Das heißt nicht, dass der Anteil gleich ${zahlKurz(p0)} ist.`, `At the ${komma(alpha * 100, 0)}% level there is too little evidence of a difference from ${zahlKurz(p0)}. That does not mean the proportion equals ${zahlKurz(p0)}.`)
              : z.seite === 'links' ? L(`Auf dem Niveau ${komma(alpha * 100, 0)} % gibt es zu wenig Hinweis, dass der Anteil kleiner als ${zahlKurz(p0)} ist. Das heißt nicht, dass er es nicht ist.`, `At the ${komma(alpha * 100, 0)}% level there is too little evidence that the proportion is smaller than ${zahlKurz(p0)}. That does not mean it is not.`)
              : L(`Auf dem Niveau ${komma(alpha * 100, 0)} % gibt es zu wenig Hinweis, dass der Anteil größer als ${zahlKurz(p0)} ist. Das heißt nicht, dass er es nicht ist.`, `At the ${komma(alpha * 100, 0)}% level there is too little evidence that the proportion is larger than ${zahlKurz(p0)}. That does not mean it is not.`)}
          {/if}</p>
          <p class="vst-zeile klein">{L('Das ist der Score-Test, eine Näherung mit der Normalverteilung. Intervall und Test passen zusammen (beide nach Wilson).', 'This is the score test, an approximation with the normal distribution. Interval and test match (both Wilson).')}</p>
        </section>
        {#if anteil.naeherungGrob}
          <div class="banner vst-hinweis"><Icon n="hinweis" /><p>{L(`Die Normalnäherung ist grob, wenn n · p₀ · (1 − p₀) höchstens 9 ist (hier ${zahlKurz(nA * p0 * (1 - p0))}). Den genauen Test mit der Binomialverteilung rechnet die Kachel `, `The normal approximation is rough when n · p₀ · (1 − p₀) is at most 9 (here ${zahlKurz(nA * p0 * (1 - p0))}). The exact test with the binomial distribution is in the tile `)}<a href="#verstehen/anteilstest">{L('Anteilstest verstehen', 'Understand the test for a proportion')}</a>.</p></div>
        {/if}
        <p class="banner ruhig vst-hinweis"><Icon n="info" /><span>{d('Dein Schulbuch rechnet vielleicht mit p̂ ± 1,96 · √(p̂ (1 − p̂) / n). Das gibt eine etwas andere Zahl: Statable nimmt das genauere Wilson-Intervall. ', 'Ihr Schulbuch rechnet vielleicht mit p̂ ± 1,96 · √(p̂ (1 − p̂) / n). Das gibt eine etwas andere Zahl: Statable nimmt das genauere Wilson-Intervall. ', 'Your textbook may use p̂ ± 1.96 · √(p̂ (1 − p̂) / n). That gives a slightly different number: Statable uses the more accurate Wilson interval. ')}<a href="#hilfe/verstehen-kennzahlen">{L('Mit Zahlenbeispiel', 'With a worked example')}</a></span></p>
      {/if}
    {:else if z.was === 'mittel'}
      {#if fehlerMittel}
        <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p id="vk-fehler-mittel">{fehlerMittel}</p></div>
      {:else if mittel}
        <section class="vst-ergebnis" aria-labelledby="vk-erg-t"><h2 id="vk-erg-t">{L('Mittelwert und Intervall', 'Mean and interval')}</h2>
          <p class="vst-gross" use:ergebnisAnsage><span class="zahl">{komma(mm, 2)}</span> <span class="einheit">{L(`${niveauProz} %-Intervall`, `${niveauProz}% interval`)} {iv(komma(mittel.lo, 2), komma(mittel.hi, 2))}</span></p>
          <p class="vst-zeile">{L(`Das ${niveauProz} %-Konfidenzintervall für den Mittelwert in der Gesamtheit: ${iv(komma(mittel.lo, 2), komma(mittel.hi, 2))}. Es rechnet mit dem Standardfehler SE = s / √n = ${komma(mittel.se, 3)} und t mit ${mittel.df} Freiheitsgraden.`, `The ${niveauProz}% confidence interval for the mean in the population: ${iv(komma(mittel.lo, 2), komma(mittel.hi, 2))}. It uses the standard error SE = s / √n = ${komma(mittel.se, 3)} and t with ${mittel.df} degrees of freedom.`)}</p>
        </section>
        <section class="vst-block" aria-labelledby="vk-test-t"><h2 id="vk-test-t">{L(`Test gegen μ₀ = ${komma(mu0, 2)} (${seiteText})`, `Test against μ₀ = ${komma(mu0, 2)} (${seiteText})`)}</h2>
          <p class="vst-zeile">t({mittel.df}) = {komma(mittel.t, 2)} · p {pWert(mittel.p)}</p>
          <p class="vst-zeile">{#if mittel.p <= alpha}
            {z.seite === 'zwei' ? L(`Auf dem Niveau ${komma(alpha * 100, 0)} % unterscheidet sich der Mittelwert signifikant von ${komma(mu0, 2)}.`, `At the ${komma(alpha * 100, 0)}% level the mean differs significantly from ${komma(mu0, 2)}.`)
              : z.seite === 'links' ? L(`Auf dem Niveau ${komma(alpha * 100, 0)} % ist der Mittelwert signifikant kleiner als ${komma(mu0, 2)}.`, `At the ${komma(alpha * 100, 0)}% level the mean is significantly smaller than ${komma(mu0, 2)}.`)
              : L(`Auf dem Niveau ${komma(alpha * 100, 0)} % ist der Mittelwert signifikant größer als ${komma(mu0, 2)}.`, `At the ${komma(alpha * 100, 0)}% level the mean is significantly larger than ${komma(mu0, 2)}.`)}
          {:else}
            {z.seite === 'zwei' ? L(`Auf dem Niveau ${komma(alpha * 100, 0)} % gibt es zu wenig Hinweis auf einen Unterschied zu ${komma(mu0, 2)}. Das heißt nicht, dass der Mittelwert gleich ${komma(mu0, 2)} ist.`, `At the ${komma(alpha * 100, 0)}% level there is too little evidence of a difference from ${komma(mu0, 2)}. That does not mean the mean equals ${komma(mu0, 2)}.`)
              : z.seite === 'links' ? L(`Auf dem Niveau ${komma(alpha * 100, 0)} % gibt es zu wenig Hinweis, dass der Mittelwert kleiner als ${komma(mu0, 2)} ist. Das heißt nicht, dass er es nicht ist.`, `At the ${komma(alpha * 100, 0)}% level there is too little evidence that the mean is smaller than ${komma(mu0, 2)}. That does not mean it is not.`)
              : L(`Auf dem Niveau ${komma(alpha * 100, 0)} % gibt es zu wenig Hinweis, dass der Mittelwert größer als ${komma(mu0, 2)} ist. Das heißt nicht, dass er es nicht ist.`, `At the ${komma(alpha * 100, 0)}% level there is too little evidence that the mean is larger than ${komma(mu0, 2)}. That does not mean it is not.`)}
          {/if}</p>
          <p class="vst-zeile">{L(`Effektstärke (Cohens d für eine Stichprobe): d = (x̄ − μ₀) / s = ${komma(mittel.d, 2)}.`, `Effect size (Cohen’s d for one sample): d = (x̄ − μ₀) / s = ${komma(mittel.d, 2)}.`)}</p>
        </section>
      {/if}
    {:else if z.was === 'rate'}
      <VerstehenRatenErgebnis />
    {:else}
      {#if fehlerUmfang}
        <div class="banner" use:ergebnisAnsage><Icon n="hinweis" /><p id="vk-fehler-umfang">{fehlerUmfang}</p></div>
      {:else if nUmfang !== null}
        <section class="vst-ergebnis" aria-labelledby="vk-erg-t"><h2 id="vk-erg-t">{L('Benötigter Stichprobenumfang', 'Required sample size')}</h2>
          <p class="vst-gross" use:ergebnisAnsage><span class="zahl">n = {ganzZahl(nUmfang)}</span></p>
          {#if z.umfangFuer === 'anteil'}
            <p class="vst-zeile">{z.laenge
              ? (pU === 0.5
                ? L(`Ein ${niveauProz} %-Intervall für einen Anteil soll insgesamt ${zahlKurz(dU)} Prozentpunkte lang sein (also ± ${zahlKurz(dU / 2)}). Beim ungünstigsten Fall p = ${komma(0.5, 1)} braucht man mindestens ${ganzZahl(nUmfang)} Personen.`, `A ${niveauProz}% interval for a proportion should be ${zahlKurz(dU)} percentage points long in total (that is ± ${zahlKurz(dU / 2)}). In the worst case p = ${komma(0.5, 1)} you need at least ${ganzZahl(nUmfang)} people.`)
                : L(`Ein ${niveauProz} %-Intervall für einen Anteil soll insgesamt ${zahlKurz(dU)} Prozentpunkte lang sein (also ± ${zahlKurz(dU / 2)}). Bei p = ${zahlKurz(pU)} braucht man mindestens ${ganzZahl(nUmfang)} Personen.`, `A ${niveauProz}% interval for a proportion should be ${zahlKurz(dU)} percentage points long in total (that is ± ${zahlKurz(dU / 2)}). With p = ${zahlKurz(pU)} you need at least ${ganzZahl(nUmfang)} people.`))
              : (pU === 0.5
                ? L(`Ein ${niveauProz} %-Intervall für einen Anteil soll um höchstens ± ${zahlKurz(dU)} Prozentpunkte streuen. Beim ungünstigsten Fall p = ${komma(0.5, 1)} braucht man mindestens ${ganzZahl(nUmfang)} Personen.`, `A ${niveauProz}% interval for a proportion should have a half-width of at most ± ${zahlKurz(dU)} percentage points. In the worst case p = ${komma(0.5, 1)} you need at least ${ganzZahl(nUmfang)} people.`)
                : L(`Ein ${niveauProz} %-Intervall für einen Anteil soll um höchstens ± ${zahlKurz(dU)} Prozentpunkte streuen. Bei p = ${zahlKurz(pU)} braucht man mindestens ${ganzZahl(nUmfang)} Personen.`, `A ${niveauProz}% interval for a proportion should have a half-width of at most ± ${zahlKurz(dU)} percentage points. With p = ${zahlKurz(pU)} you need at least ${ganzZahl(nUmfang)} people.`))}</p>
          {:else}
            <p class="vst-zeile">{z.laenge
              ? L(`Ein ${niveauProz} %-Intervall für einen Mittelwert soll insgesamt ${zahlKurz(dM)} lang sein (also ± ${zahlKurz(dM / 2)}). Mit der geschätzten Standardabweichung σ = ${zahlKurz(sigU)} braucht man mindestens ${ganzZahl(nUmfang)} Personen.`, `A ${niveauProz}% interval for a mean should be ${zahlKurz(dM)} long in total (that is ± ${zahlKurz(dM / 2)}). With the estimated standard deviation σ = ${zahlKurz(sigU)} you need at least ${ganzZahl(nUmfang)} people.`)
              : L(`Ein ${niveauProz} %-Intervall für einen Mittelwert soll um höchstens ± ${zahlKurz(dM)} streuen. Mit der geschätzten Standardabweichung σ = ${zahlKurz(sigU)} braucht man mindestens ${ganzZahl(nUmfang)} Personen.`, `A ${niveauProz}% interval for a mean should have a half-width of at most ± ${zahlKurz(dM)}. With the estimated standard deviation σ = ${zahlKurz(sigU)} you need at least ${ganzZahl(nUmfang)} people.`)}</p>
            <p class="vst-zeile klein">{L('Gerechnet mit z. Weil später mit t gerechnet wird, braucht man in Wirklichkeit ein paar Personen mehr.', 'Calculated with z. Because t will be used later, you actually need a few more people.')}</p>
          {/if}
          <p class="vst-zeile klein">{L(`Immer aufgerundet auf ganze Personen. Gerechnet mit z = ${komma(zZumNiveau(z.niveau), 3)} für ${niveauProz} %.`, `Always rounded up to whole people. Calculated with z = ${komma(zZumNiveau(z.niveau), 3)} for ${niveauProz}%.`)}</p>
        </section>
        {#if tabelleUmfang.length}
          <section class="vst-block" aria-labelledby="vk-tab-t"><h2 id="vk-tab-t">{L(`Je nach gewünschter Breite (p = ${komma(0.5, 1)})`, `By desired width (p = ${komma(0.5, 1)})`)}</h2>
            <table class="vst-tabelle"><thead><tr><th scope="col">{L('Halbbreite ±', 'Half-width ±')}</th><th scope="col" class="zahl-sp">n</th></tr></thead>
              <tbody>{#each tabelleUmfang as r}<tr><th scope="row">{r.pp} {L('Prozentpunkte', 'percentage points')}</th><td class="zahl-sp">{ganzZahl(r.n)}</td></tr>{/each}</tbody></table></section>
        {/if}
        <p class="banner ruhig vst-hinweis"><Icon n="info" /><span>{z.umfangFuer === 'anteil' ? L('Die Formel ist die einfache Schätzung für n. Das Intervall der fertigen Stichprobe rechnet Statable danach mit Wilson.', 'The formula is the simple estimate for n. Statable then calculates the interval of the finished sample with Wilson.') : L('Die Formel ist die einfache Schätzung für n. Das Intervall der fertigen Stichprobe rechnet Statable danach mit dem t-Intervall.', 'The formula is the simple estimate for n. Statable then calculates the interval of the finished sample with the t interval.')} <a href="#hilfe/verstehen-kennzahlen">{L('Mehr dazu', 'More')}</a></span></p>
      {/if}
    {/if}
  </div>
</div>
