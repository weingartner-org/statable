<script module lang="ts">
  import { ergebnisAnsage } from '../lib/ansage-ergebnis.svelte';
  import type { UeberdeckungErgebnis } from '../lib/lernlabor';
  const z = $state({ art: 'anteil' as 'mittel' | 'anteil', mu: '100', sigma: '15', p: '30', n: '40', niveau: 0.95, wald: false, letzter: -1 });
  /** Die letzte Runde (100 Intervalle) und die laufende Summe über alle Durchgänge mit denselben Eingaben. */
  let lauf = $state.raw<null | { e: UeberdeckungErgebnis; runde: number; gesamt: number; ueberdeckt: number; waldUeberdeckt: number; schluessel: string; art: 'mittel' | 'anteil'; n: number }>(null);
</script>
<script lang="ts">
  import { untrack } from 'svelte';
  import { L, d } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import { exakteUeberdeckung, ueberdeckung } from '../lib/lernlabor';
  import { g4, lehreKiNiveau, leseAnteil, leseGanz, leseZahl, prozent, satzExakteUeberdeckung, satzUeberdeckung, satzWaldVergleich } from '../lib/lernlaborsaetze';
  import { proz } from '../i18n/profil';
  import LernlaborTabelle from './LernlaborTabelle.svelte';
  import LernlaborIntervalle from './LernlaborIntervalle.svelte';

  let { startwert, anstoss }: { startwert: number; anstoss: number } = $props();
  const mu = $derived(leseZahl(z.mu)), sigma = $derived(leseZahl(z.sigma)), p = $derived(leseAnteil(z.p)), n = $derived(leseGanz(z.n));
  const nMin = $derived(z.art === 'mittel' ? 2 : 1);
  const fehler = $derived.by((): string => {
    if (z.art === 'mittel' && !(Number.isFinite(mu) && sigma > 0)) return L('Bitte μ als Zahl und σ größer als 0 eingeben.', 'Please enter μ as a number and σ greater than 0.');
    if (z.art === 'anteil' && Number.isNaN(p)) return L('Der Anteil p muss zwischen 0 und 100 % liegen.', 'The proportion p must be between 0 and 100%.');
    if (!(n >= nMin && n <= 100000)) return z.art === 'mittel' ? L('Der Stichprobenumfang muss eine ganze Zahl von 2 bis 100 000 sein.', 'The sample size must be a whole number from 2 to 100,000.') : L('Der Stichprobenumfang muss eine ganze Zahl von 1 bis 100 000 sein.', 'The sample size must be a whole number from 1 to 100,000.');
    return '';
  });
  /** Wer die Eingaben ändert, braucht neue Intervalle: „Weitere 100“ gilt nur für dieselben Eingaben und denselben Startwert. */
  const schluessel = $derived(JSON.stringify([z.art, z.mu, z.sigma, z.p, z.n, z.niveau, z.art === 'anteil' && z.wald, startwert]));
  const veraltet = $derived(!!lauf && lauf.schluessel !== schluessel);

  function ziehe(neu: boolean) {
    if (fehler) return;
    const runde = neu || !lauf || veraltet ? 0 : lauf.runde + 1;
    const o = { n, niveau: z.niveau, startwert, nummer: runde };
    const e = z.art === 'mittel' ? ueberdeckung({ art: 'mittel', mu, sigma, ...o }) : ueberdeckung({ art: 'anteil', p, mitWald: z.wald, ...o });
    const vorher = runde === 0 || !lauf ? { gesamt: 0, ueberdeckt: 0, waldUeberdeckt: 0 } : lauf;
    lauf = { e, runde, gesamt: vorher.gesamt + e.anzahl, ueberdeckt: vorher.ueberdeckt + e.ueberdeckt, waldUeberdeckt: vorher.waldUeberdeckt + (e.waldUeberdeckt ?? 0), schluessel, art: z.art, n };
  }
  $effect(() => { const a = anstoss; untrack(() => { if (z.letzter !== a || !lauf) { z.letzter = a; ziehe(true); } }); });

  const bereich = $derived.by(() => {
    if (!lauf) return { von: 0, bis: 1 };
    const w = lauf.e.wahr; let lo = w, hi = w;
    for (const i of lauf.e.intervalle) { lo = Math.min(lo, i.lo, i.wald?.lo ?? Infinity); hi = Math.max(hi, i.hi, i.wald?.hi ?? -Infinity); }
    if (z.art === 'anteil') return { von: Math.max(0, lo), bis: Math.min(1, hi) };
    const rand = (hi - lo) * 0.04; return { von: lo - rand, bis: hi + rand };
  });
  const nv = $derived(zahlDe(z.niveau * 100, 0));
  /** Exakte Überdeckung der Intervalle mit den Eingaben des Laufs (Summe über alle möglichen Ausgänge) - nur für Anteile; beim t-Intervall ist sie das Niveau. */
  const exakt = $derived(lauf && lauf.art === 'anteil' ? exakteUeberdeckung(lauf.e.wahr, lauf.n, lauf.e.niveau, 'wilson') : null);
  const exaktWald = $derived(lauf && lauf.art === 'anteil' && lauf.e.waldUeberdeckt !== undefined ? exakteUeberdeckung(lauf.e.wahr, lauf.n, lauf.e.niveau, 'wald') : null);
  const exaktSatz = $derived(lauf && exakt !== null ? satzExakteUeberdeckung(exakt, lauf.e.niveau, exaktWald !== null, exaktWald ?? undefined) : '');
  /** Beschriftungen je Fall (Anteil oder Mittelwert), jeweils als ganzer Text. */
  const achseText = $derived.by(() => { if (z.art === 'anteil') return L('Anteil', 'Proportion'); return L('Mittelwert', 'Mean'); });
  const verfahrenText = $derived.by(() => { if (lauf?.art === 'anteil') return L('Wilson', 'Wilson'); return L('t-Intervall', 't interval'); });
  const wahrText = $derived.by(() => { if (!lauf) return ''; if (lauf.art === 'anteil') return `p = ${g4(lauf.e.wahr)}`; return `μ = ${g4(lauf.e.wahr)}`; });
</script>

<div class="ll-raster">
  <div class="ll-eingaben">
    <h2 class="ll-h">{L('Welches Intervall?', 'Which interval?')}</h2>
    <div class="eingabe"><span class="lbl" id="ll-ue-a-l">{L('Was wird geschätzt?', 'What is estimated?')}</span>
      <div class="segment" role="radiogroup" aria-labelledby="ll-ue-a-l">
        <label data-begriff="wilson-intervall"><input type="radio" name="ll-ue-a" value="anteil" bind:group={z.art}>{L('Ein Anteil p (Wilson)', 'A proportion p (Wilson)')}</label>
        <label><input type="radio" name="ll-ue-a" value="mittel" bind:group={z.art}>{L('Ein Mittelwert μ (t-Intervall)', 'A mean μ (t interval)')}</label></div></div>
    {#if z.art === 'mittel'}
      <div class="ll-zeile"><div class="eingabe"><label for="ll-ue-mu">{L('Wahres μ', 'True μ')}</label><input id="ll-ue-mu" type="text" inputmode="decimal" bind:value={z.mu} style="max-width:9ch"></div>
        <div class="eingabe"><label for="ll-ue-sigma">{L('Wahres σ', 'True σ')}</label><input id="ll-ue-sigma" type="text" inputmode="decimal" bind:value={z.sigma} style="max-width:9ch"></div></div>
    {:else}
      <div class="eingabe"><label for="ll-ue-p">{L('Wahrer Anteil p, in Prozent', 'True proportion p, in percent')}</label><input id="ll-ue-p" type="text" inputmode="decimal" bind:value={z.p} style="max-width:9ch"></div>
    {/if}
    <div class="ll-zeile"><div class="eingabe"><label for="ll-ue-n">{L('Stichprobenumfang n', 'Sample size n')}</label><input id="ll-ue-n" type="text" inputmode="numeric" bind:value={z.n} style="max-width:9ch"></div>
      <div class="eingabe"><label for="ll-ue-niv">{L('Niveau', 'Level')}</label><select id="ll-ue-niv" bind:value={z.niveau}>{#each [0.9, 0.95, 0.99] as v}<option data-begriff="vertrauensniveau" value={v}>{proz(zahlDe(v * 100, 0))}</option>{/each}</select></div></div>
    {#if z.art === 'anteil'}
      <div class="eingabe"><label data-begriff="wald-intervall" class="ll-check"><input type="checkbox" bind:checked={z.wald}> {L('Mit der Schulformel (Wald) vergleichen', 'Compare with the textbook formula (Wald)')}</label>
        <span class="hilfe">{d('Die Schulformel p̂ ± z·√(p̂(1−p̂)/n) ist eine Näherung. Hier siehst du, wie gut sie trifft - Statable rechnet sonst nie damit. Probiere zum Beispiel p = 5 % und n = 50.', 'Die Schulformel p̂ ± z·√(p̂(1−p̂)/n) ist eine Näherung. Hier sehen Sie, wie gut sie trifft - Statable rechnet sonst nie damit. Probieren Sie zum Beispiel p = 5 % und n = 50.', 'The textbook formula p̂ ± z·√(p̂(1−p̂)/n) is an approximation. Here you see how well it works - Statable never uses it otherwise. Try, for example, p = 5% and n = 50.')}</span></div>
    {/if}
    {#if fehler}<p class="fehler" role="alert">{fehler}</p>{/if}
    <div class="ll-zeile">
      <button class="k haupt gross" type="button" onclick={() => ziehe(true)} disabled={!!fehler || undefined}>{L('100 Intervalle ziehen', 'Draw 100 intervals')}</button>
      <button class="k gross" type="button" onclick={() => ziehe(false)} disabled={!!fehler || !lauf || veraltet || undefined}>{L('Weitere 100', 'Another 100')}</button>
    </div>
    {#if veraltet}<p class="hilfe">{L('Die Eingaben haben sich geändert. „100 Intervalle ziehen“ beginnt neu; „Weitere 100“ gilt wieder für die nächste Reihe.', 'The inputs have changed. "Draw 100 intervals" starts afresh; "Another 100" applies again to the next series.')}</p>{/if}
  </div>

  <div class="ll-ergebnis" use:ergebnisAnsage={{ satz: '.ll-satz', anzahl: 1 }}>
    {#if lauf}
      {@const e = lauf.e}
      <h2 class="ll-h">{L(`${e.ueberdeckt} von ${e.anzahl} Intervallen überdecken den wahren Wert`, `${e.ueberdeckt} of ${e.anzahl} intervals cover the true value`)}</h2>
      <figure class="ll-bild"><LernlaborIntervalle intervalle={e.intervalle} wahr={e.wahr} von={bereich.von} bis={bereich.bis} {wahrText}
        xText={achseText} jaText={L('überdeckt den wahren Wert', 'covers the true value')} neinText={L('überdeckt ihn nicht', 'does not cover it')}
        titel={L(`${e.anzahl} ${proz(nv)}-Intervalle (Wilson bzw. t) im Durchgang ${lauf.runde}`, `${e.anzahl} ${proz(nv)} intervals (Wilson or t) in round ${lauf.runde}`)}
        beschreibung={L(`${e.anzahl} Intervalle übereinander, Startwert ${e.startwert}, Durchgang ${lauf.runde}. ${e.ueberdeckt} überdecken den wahren Wert ${g4(e.wahr)} (durchgezogene Linien mit Kreis), ${e.anzahl - e.ueberdeckt} nicht (gestrichelte dicke Linien mit Raute).`, `${e.anzahl} intervals stacked, seed ${e.startwert}, round ${lauf.runde}. ${e.ueberdeckt} cover the true value ${g4(e.wahr)} (solid lines with circle), ${e.anzahl - e.ueberdeckt} do not (thick dashed lines with diamond).`)} />
        <figcaption>{L('Jede Zeile ist eine eigene Stichprobe mit ihrem Intervall. Die schwarze senkrechte Linie ist der wahre Wert.', 'Each row is a separate sample with its interval. The black vertical line is the true value.')}</figcaption></figure>
      {#if e.waldUeberdeckt !== undefined}
        <h2 class="ll-h">{L(`Die Schulformel (Wald): ${e.waldUeberdeckt} von ${e.anzahl} überdecken`, `The textbook formula (Wald): ${e.waldUeberdeckt} of ${e.anzahl} cover`)}</h2>
        <figure class="ll-bild"><LernlaborIntervalle intervalle={e.intervalle.map(i => ({ lo: i.wald!.lo, hi: i.wald!.hi, ueberdeckt: i.wald!.ueberdeckt, schaetzer: i.schaetzer }))} wahr={e.wahr} von={bereich.von} bis={bereich.bis} {wahrText}
          xText={L('Anteil', 'Proportion')} jaText={L('überdeckt den wahren Wert', 'covers the true value')} neinText={L('überdeckt ihn nicht', 'does not cover it')}
          titel={L(`Dieselben ${e.anzahl} Stichproben mit der Schulformel (Wald)`, `The same ${e.anzahl} samples with the textbook formula (Wald)`)}
          beschreibung={L(`Dieselben Stichproben wie oben, aber mit der Näherungsformel. ${e.waldUeberdeckt} von ${e.anzahl} Intervallen überdecken den wahren Anteil ${g4(e.wahr)}.`, `The same samples as above, but with the approximation formula. ${e.waldUeberdeckt} of ${e.anzahl} intervals cover the true proportion ${g4(e.wahr)}.`)} />
          <figcaption>{L('Gleiche Stichproben, andere Formel. Die Zahl der Treffer ist dieselbe; nur die Grenzen der Intervalle unterscheiden sich.', 'Same samples, different formula. The number of hits is the same; only the limits of the intervals differ.')}</figcaption></figure>
      {/if}
      <LernlaborTabelle titel={L('Zählung über alle Durchgänge', 'Count over all rounds')}><table class="ll-tabelle"><caption>{L('Zählung über alle Durchgänge', 'Count over all rounds')}</caption>
        <thead><tr><th scope="col">{L('Verfahren', 'Method')}</th><th scope="col">{L('Intervalle', 'Intervals')}</th><th scope="col">{L('überdecken', 'cover')}</th><th scope="col">{L('Anteil', 'Share')}</th></tr></thead>
        <tbody>
          <tr><th scope="row">{verfahrenText}</th><td>{zahlDe(lauf.gesamt)}</td><td>{zahlDe(lauf.ueberdeckt)}</td><td>{prozent(lauf.ueberdeckt / lauf.gesamt, 1)}</td></tr>
          {#if e.waldUeberdeckt !== undefined}<tr><th scope="row">{L('Schulformel (Wald)', 'Textbook formula (Wald)')}</th><td>{zahlDe(lauf.gesamt)}</td><td>{zahlDe(lauf.waldUeberdeckt)}</td><td>{prozent(lauf.waldUeberdeckt / lauf.gesamt, 1)}</td></tr>{/if}
          <tr><th scope="row">{L('Eingestelltes Niveau', 'Chosen level')}</th><td></td><td></td><td>{prozent(e.niveau, 1)}</td></tr>
        </tbody></table></LernlaborTabelle>
      <p class="ll-satz" data-startwert={e.startwert}>{satzUeberdeckung(e, lauf.runde, lauf.gesamt, lauf.ueberdeckt, exakt)}</p>
      {#if exaktSatz}<p class="ll-satz">{exaktSatz}</p>{/if}
      {#if e.waldUeberdeckt !== undefined}<p class="ll-satz">{satzWaldVergleich(lauf.ueberdeckt, lauf.waldUeberdeckt, lauf.gesamt)}</p>{/if}
      <p class="ll-lehre">{lehreKiNiveau(e.niveau)}</p>
    {:else}
      <p class="ll-lehre">{d('Ziehe 100 Stichproben und sieh nach, wie viele Intervalle den wahren Wert überdecken.', 'Ziehen Sie 100 Stichproben und sehen Sie nach, wie viele Intervalle den wahren Wert überdecken.', 'Draw 100 samples and see how many intervals cover the true value.')}</p>
    {/if}
  </div>
</div>

<style>
  .ll-check { display: inline-flex; align-items: center; gap: var(--a2); font-size: var(--gr-text) !important; color: var(--tinte) !important; font-weight: 400 !important; min-height: var(--ziel); }
  .ll-check input { accent-color: var(--akzent); width: 18px; height: 18px; margin: 0; }
</style>
