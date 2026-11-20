<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { katRCode, R_PAKETE_MULT, type OrdReg, type MultReg, type ZaehlReg } from '../lib/kategreg';
  import HilfeLink from './HilfeLink.svelte';
  import RStart from './RStart.svelte';

  /** Zusatz im Blatt der ordinalen, multinomialen und Zähldaten-Regression (Welle 3): das Angebot „Multinomial rechnen“ nach verletzter Parallelität und „Für Fachleute“ mit dem R-Aufruf.
   *  Das Angebot ändert nur die Wahl im Blatt (`onModell`); gerechnet wird erst, wie bei jeder Änderung der Frage. */
  let { blatt, e, name, onModell, laeuft = false, gesperrt = false }: { blatt: Blatt; e: OrdReg | MultReg | ZaehlReg; name: (n: string) => string; onModell: (art: 'multi') => void; laeuft?: boolean; gesperrt?: boolean } = $props();
  const hilfe = $derived(e.art === 'ordreg' ? 'ordinale-regression' : e.art === 'multreg' ? 'multinomiale-regression' : 'zaehldaten-regression');
  const brantVerletzt = $derived(e.art === 'ordreg' && !!e.brant && e.brant.gesamt.p < 0.05);
  const code = $derived(katRCode({
    art: e.art, ziel: e.ziel, praed: e.praed, stufen: e.art === 'ordreg' ? e.stufen : e.art === 'multreg' ? [e.referenz, ...e.kategorien] : [],
    referenz: e.art === 'multreg' ? e.referenz : undefined, modell: e.art === 'zaehlreg' ? (blatt.zus?.modell?.zaehl ?? 'auto') : undefined, zeit: e.art === 'zaehlreg' ? e.offset ?? undefined : undefined
  }, L));
</script>

{#if brantVerletzt}
  <div class="korr-wahl" style="margin-top:var(--a4)">
    <h3 style="font-size:var(--s-klein,.9rem);margin-bottom:var(--a2)">{L('Die Wirkung ist nicht über alle Stufen gleich', 'The effect is not the same across all levels')}</h3>
    <p style="color:var(--tinte-2);margin-bottom:var(--a2)">{L('Die multinomiale Regression nimmt keine Ordnung der Stufen an und gibt für jede Stufe eigene Odds Ratios. Sie braucht dafür mehr Fälle. Gerechnet wird erst nach dem Klick - dann sofort.', 'Multinomial regression assumes no order of the levels and gives separate odds ratios for each level. It needs more cases for that. Nothing is calculated until you click - then right away.')}</p>
    <RStart knopf={L('Multinomial rechnen (ohne Ordnung)', 'Calculate multinomial (without order)')} los={() => onModell('multi')} {laeuft} {gesperrt} haupt={false} pakete={R_PAKETE_MULT} mitKosten />
  </div>
{/if}
<details class="auf" style="margin-top:var(--a4)"><summary>{L('Für Fachleute', 'For specialists')}</summary>
  <p class="heft-text">{e.art === 'ordreg'
    ? L('Proportional-Odds-Modell mit der logistischen Verteilung (MASS::polr), feste Einstellungen der Optimierung. Konfidenzintervalle und p je Koeffizient nach Wald; die Brant-Teststatistik rechnet Statable nach Brant (1990) selbst. Die Zahlen sind gegen R (polr, clm) geprüft.', 'Proportional-odds model with the logistic distribution (MASS::polr), fixed optimizer settings. Confidence intervals and p per coefficient by Wald; Statable calculates the Brant statistic itself after Brant (1990). The numbers are checked against R (polr, clm).')
    : e.art === 'multreg'
      ? L('Multinomiales Logit-Modell (nnet::multinom, maxit 1000, reltol 1e-12). Konfidenzintervalle und p je Koeffizient nach Wald; der Likelihood-Quotienten-Test je Prädiktor schätzt das Modell ohne ihn neu. Die Zahlen sind gegen R (multinom, VGAM) geprüft.', 'Multinomial logit model (nnet::multinom, maxit 1000, reltol 1e-12). Confidence intervals and p per coefficient by Wald; the likelihood ratio test per predictor re-estimates the model without it. The numbers are checked against R (multinom, VGAM).')
      : L('Verallgemeinertes lineares Modell mit Log-Link (glm). Das negativ-binomiale Modell schätzt θ über die Profil-Likelihood und rechnet B und SE aus dem glm bei diesem θ (wie glm.nb, aber robust bei vielen Nullen). Die Zahlen sind gegen R (glm, MASS::glm.nb) geprüft.', 'Generalized linear model with log link (glm). The negative binomial model estimates θ by profile likelihood and takes B and SE from the glm at this θ (like glm.nb, but robust with many zeros). The numbers are checked against R (glm, MASS::glm.nb).')}</p>
  <pre class="befehl">{code}</pre>
  <p class="hilfe"><HilfeLink id={hilfe} text={e.art === 'ordreg' ? L('Hilfe: Ordinale Regression lesen', 'Help: reading ordinal regression') : e.art === 'multreg' ? L('Hilfe: Multinomiale Regression lesen', 'Help: reading multinomial regression') : L('Hilfe: Zähldaten-Regression lesen', 'Help: reading count regression')} /></p>
</details>
