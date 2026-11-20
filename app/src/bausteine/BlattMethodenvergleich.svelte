<script lang="ts">
  import { untrack } from 'svelte';
  import { L, melde, sichern } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { verzoegert } from '../lib/laedt.svelte';
  import { gewichtStatus, sperrSatz } from '../lib/gewichte';
  import { stellenTitel } from '../lib/gewichtkarten';
  import { liesZahl } from '../lib/verteilungen';
  import { leereMvWahl, type MvWahl } from '../lib/methodenvergleichwahl';
  import { methodenvergleich, type MvErgebnis, type MvFehler } from '../lib/methodenvergleich';
  import {
    abweichungSatz, cusumSatz, demingSatz, lambdaAbhaengigSatz, lambdaErklaerung, lambdaWiederholungSatz, mvAchsenSatz, mvBereichSatz, mvFehlerSatz, mvGerechnet, mvHinweisSatz, mvOlsSatz, mvResiduenHinweis,
    pbGesperrtSatz, pbSatz, tabelleMethodenvergleich
  } from '../lib/methodenvergleichsaetze';
  import Ausgabe from './Ausgabe.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import Methodenvergleichsdiagramm from './Methodenvergleichsdiagramm.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import Rechnet from './Rechnet.svelte';

  /**
   * „Methodenvergleich“ unter dem ICC mit zwei Zahlenspalten, neben Bland-Altman (Später S-F, M6): Passing-Bablok (wie R-Paket mcr) und Deming mit sichtbarem λ. Rechnet in JavaScript aus den beiden Spalten
   * des ICC (vollständige Paare); die Wahl gehört zum Blatt (`blatt.mv`). Mit einem Fallgewicht gesperrt (jede Probe zählt einmal). Kein Vergleich mit der gewöhnlichen Regression.
   * Rechnen läuft nach dem Einschalten mit Lade-Animation (bis n = 4000 dauert es einige Sekunden).
   */
  let { blatt, daten, namen }: { blatt: Blatt; daten: number[][]; namen: [string, string] } = $props();
  const kennung = $props.id();

  const wahl = $derived<MvWahl>({ ...leereMvWahl(), ...(blatt.mv ?? {}) });
  const gesperrt = $derived(!!blatt.gewicht && gewichtStatus('uebereinstimmung:methodenvergleich', blatt.gewicht.art) === 'sperren');
  const lambdaZahl = $derived(liesZahl(wahl.lambda));
  const xName = $derived(wahl.tausch ? namen[1] : namen[0]), yName = $derived(wahl.tausch ? namen[0] : namen[1]);
  const xs = $derived(daten.map(z => z[wahl.tausch ? 1 : 0]!)), ys = $derived(daten.map(z => z[wahl.tausch ? 0 : 1]!));

  function setze(neu: Partial<MvWahl>, satz?: string) {
    blatt.mv = { ...wahl, ...neu };
    void sichern();
    if (satz) melde(satz);
  }

  /** Die Rechnung läuft nach dem Einschalten im Hintergrund-Takt (setTimeout), damit die Lade-Animation erscheint; ein neuer Wunsch löst den alten ab. */
  const schluessel = $derived(wahl.an && !gesperrt ? JSON.stringify([daten.length, xs.reduce((a, b) => a + b, 0), ys.reduce((a, b) => a + b, 0), wahl.tausch, Number.isFinite(lambdaZahl) ? lambdaZahl : wahl.lambda]) : '');
  let stand = $state.raw<{ schluessel: string; erg: MvErgebnis | MvFehler } | null>(null);
  let lauf = 0;
  const bereit = $derived(!!schluessel && stand?.schluessel === schluessel);
  const animation = verzoegert(() => !!schluessel && !bereit);
  $effect(() => {
    const k = schluessel;
    untrack(() => {
      if (!k) { lauf++; return; }
      if (stand?.schluessel === k) return;
      const mein = ++lauf, x = xs, y = ys, lam = lambdaZahl;
      setTimeout(() => { if (mein === lauf) stand = { schluessel: k, erg: methodenvergleich(x, y, { lambda: lam }) }; }, 30);
    });
  });
  const erg = $derived(bereit ? stand!.erg : null);
  const ok = $derived(erg && erg.ok ? erg : null);
  const fehlerCode = $derived(erg && !erg.ok ? erg.code : null);
  const punkte = $derived(xs.map((x, i) => [x, ys[i]!] as [number, number]));
  const anderes = $derived(ok ? ok.lambdaTabelle.find(t => t.lambda === (Math.abs(ok.deming.lambda - 2) < 1e-9 ? 0.5 : 2))! : null);
  const tabellen = $derived(ok ? tabelleMethodenvergleich(ok, xName, yName) : []);
</script>

<details class="auf" style="margin-top:var(--a3)" open={wahl.an}><summary>{L('Methodenvergleich: Passing-Bablok und Deming', 'Method comparison: Passing-Bablok and Deming')}</summary>
  <p class="heft-text" style="margin:var(--a2) 0">{L('Zwei Messverfahren an denselben Proben: Weichen sie um einen festen Betrag (Konstante) oder um einen Faktor (Steigung) voneinander ab? Beide Verfahren hier behandeln beide Messungen als fehlerbehaftet; eine gewöhnliche Regression täte das nicht. Das Ergebnis ist ein Hinweis, kein Beweis, dass die Verfahren gleichwertig sind.', 'Two measurement methods on the same samples: do they differ by a fixed amount (constant) or by a factor (slope)? Both procedures here treat both measurements as having error; an ordinary regression would not. The result is an indication, not proof that the methods are equivalent.')}</p>
  <label data-begriff="methodenvergleich" class="schalter"><input type="checkbox" checked={wahl.an} onchange={(ev) => setze({ an: ev.currentTarget.checked }, ev.currentTarget.checked ? L('Methodenvergleich wird gerechnet.', 'The method comparison is being calculated.') : L('Methodenvergleich ausgeblendet.', 'Method comparison hidden.'))}>{L('Methodenvergleich rechnen', 'Calculate the method comparison')}</label>
  {#if wahl.an}
    {#if gesperrt && blatt.gewicht}
      <p class="heft-text" style="margin-top:var(--a3)" role="alert">{sperrSatz('uebereinstimmung:methodenvergleich', blatt.gewicht, stellenTitel('uebereinstimmung:methodenvergleich'))}</p>
    {:else}
      <p class="heft-text" style="margin-top:var(--a3)">{mvAchsenSatz(xName, yName)}</p>
      <div style="display:flex;flex-wrap:wrap;gap:var(--a3);align-items:end;margin-top:var(--a2)">
        <button type="button" class="k" onclick={() => setze({ tausch: !wahl.tausch }, L(`Achsen getauscht: waagerecht ist jetzt ${yName}.`, `Axes swapped: ${yName} is now horizontal.`))}>{L('Achsen tauschen', 'Swap axes')}</button>
        <div class="eingabe"><label for="mv-lam-{kennung}">{L('λ für Deming (Fehlervarianz waagerecht ÷ senkrecht)', 'λ for Deming (error variance horizontal ÷ vertical)')}</label>
          <input id="mv-lam-{kennung}" type="text" inputmode="decimal" autocomplete="off" style="max-width:10ch" value={wahl.lambda} aria-invalid={Number.isFinite(lambdaZahl) && lambdaZahl > 0 ? undefined : 'true'} aria-describedby="mv-lam-h-{kennung}" onchange={(ev) => setze({ lambda: ev.currentTarget.value })}></div>
      </div>
      <p id="mv-lam-h-{kennung}" class="hilfe" style="margin-top:var(--a2)">{lambdaErklaerung()}</p>

      {#if !bereit}
        {#if animation.an}<p class="heft-text" style="margin-top:var(--a4)" role="status"><Rechnet text={L('Der Methodenvergleich wird gerechnet …', 'The method comparison is being calculated …')} /></p>{/if}
      {:else if fehlerCode}
        <p class="heft-text" style="margin-top:var(--a3)" role="alert">{mvFehlerSatz(fehlerCode)}</p>
      {:else if ok}
        {@const r = ok}
        {#each r.hinweise as h (h)}<p class="hilfe" role="note" style="margin-top:var(--a2)">{mvHinweisSatz(h, r.n)}</p>{/each}
        {#if r.ausgelassen > 0}<p class="hilfe">{L(`Paare mit einem fehlenden Wert werden ausgelassen (${r.ausgelassen}).`, `Pairs with a missing value are left out (${r.ausgelassen}).`)}</p>{/if}
        <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a4) 0 var(--a2)">Passing-Bablok</h3>
        {#if r.pb}
          <p class="ergebnis-satz">{pbSatz(r.pb, { n: r.n })}</p>
          <p class="heft-text" style="margin-top:var(--a2)">{abweichungSatz({ unten: r.pb.konstanteUnten, oben: r.pb.konstanteOben }, { unten: r.pb.steigungUnten, oben: r.pb.steigungOben })}</p>
        {:else if r.pbFehler}
          <p class="heft-text" role="note">{pbGesperrtSatz(r.pbFehler)}</p>
        {/if}
        <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a4) 0 var(--a2)">Deming (λ = {wahl.lambda.trim() || '1'})</h3>
        <p class="ergebnis-satz">{demingSatz(r.deming, { n: r.n })}</p>
        {#if !r.pb}<p class="heft-text" style="margin-top:var(--a2)">{abweichungSatz({ unten: r.deming.konstanteUnten, oben: r.deming.konstanteOben }, { unten: r.deming.steigungUnten, oben: r.deming.steigungOben })}</p>{/if}
        {#if anderes}<p class="heft-text" style="margin-top:var(--a2)">{lambdaAbhaengigSatz(r.deming.steigung, anderes)}</p>{/if}
        <p class="hilfe">{lambdaWiederholungSatz()}</p>

        <div style="margin-top:var(--a3)"><DiagrammExport titel={L('Methodenvergleich', 'Method comparison')}><Methodenvergleichsdiagramm {punkte} pb={r.pb ? { a: r.pb.konstante, b: r.pb.steigung } : null} deming={{ a: r.deming.konstante, b: r.deming.steigung }} lambda={r.deming.lambda} xText={xName} yText={yName} /></DiagrammExport></div>
        {#if r.pb}
          <h3 style="font-size:var(--s-klein,.9rem);margin:var(--a4) 0 var(--a2)">{L('Cusum und Residuenbild', 'Cusum and residual plot')}</h3>
          <p class="heft-text">{cusumSatz(r.pb.cusum)}</p>
          <p class="hilfe">{mvResiduenHinweis()}</p>
          <DiagrammExport titel={L('Methodenvergleich: Residuen', 'Method comparison: residuals')}><Methodenvergleichsdiagramm {punkte} bild="reste" reste={r.pb.residuen} xText={xName} yText={yName} /></DiagrammExport>
        {/if}
        <Ausgabe items={tabellen} nurTabellen />
        <p class="hilfe">{mvOlsSatz()} {mvBereichSatz()}</p>
        <p class="hilfe">{r.pb ? mvGerechnet({ art: 'pb', n: r.n }) + '. ' : ''}{mvGerechnet({ art: 'deming', n: r.n, lambda: r.deming.lambda })}.</p>
        <p class="hilfe"><HilfeLink id="methodenvergleich" text={L('Hilfe: Methodenvergleich lesen', 'Help: reading a method comparison')} /></p>
      {/if}
    {/if}
  {/if}
</details>
