<script lang="ts">
  import { L } from '../lib/sitzung.svelte';
  import type { Blatt } from '../lib/sitzung.svelte';
  import { pfadAuswahl, strafAlphaName, type StrafErgebnis } from '../lib/strafreg';
  import { tabellenStraf, strafRCode, strafPfadName } from '../lib/strafregsaetze';
  import Ausgabe from './Ausgabe.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import Kreuzvalidierungsdiagramm from './Kreuzvalidierungsdiagramm.svelte';
  import Strafpfaddiagramm from './Strafpfaddiagramm.svelte';
  import HilfeLink from './HilfeLink.svelte';

  /** Ergebnis der Strafregression (Später S-E, Q2): Kurve der Kreuzvalidierung, Pfadbild, Tabellen und unter „Für Fachleute“ der R-Aufruf. Es gibt hier absichtlich keinen Knopf „mit den gewählten Größen gewöhnlich rechnen“ (keine p-Werte nach der Auswahl). */
  let { blatt, e, name }: { blatt: Blatt; e: StrafErgebnis; name: (n: string) => string } = $props();
  const titel = $derived(`${strafAlphaName(e.alpha)}: ${name(e.ziel)}`);
  const namen = $derived(e.koef.map(k => strafPfadName(e, k, name)));
  const auswahl = $derived(pfadAuswahl(e.koef.map(k => k.std), 20));
  const code = $derived(strafRCode({ ziel: e.ziel, praed: e.praed, alpha: e.alpha, regel: e.regel, standardisieren: e.standardisieren, K: e.K, R: e.R, startwert: e.startwert }));
</script>

<DiagrammExport titel={`${titel} - ${L('Kreuzvalidierung', 'cross-validation')}`}><Kreuzvalidierungsdiagramm lambda={e.lambda} cvm={e.cvm} cvsd={e.cvsd} nzero={e.nzero} lambdaMin={e.lambdaMin} lambda1se={e.lambda1se} gewaehlt={e.lambdaGewaehlt} /></DiagrammExport>
<p class="hilfe" style="margin-top:var(--a2)">{L('Oben steht, wie viele Größen bei diesem λ im Modell sind. „λ min“ ist der kleinste Fehler, „λ 1se“ das größte λ, dessen Fehler höchstens einen Standardfehler darüber liegt.', 'The top shows how many predictors are in the model at this λ. "λ min" is the smallest error, "λ 1se" the largest λ whose error lies at most one standard error above it.')}</p>
{#if e.koef.length > 1}
  <div style="margin-top:var(--a4)"><DiagrammExport titel={`${titel} - ${L('Pfad', 'path')}`}><Strafpfaddiagramm lambda={e.lambda} pfad={e.pfadStd} {namen} {auswahl} gewaehlt={e.lambdaGewaehlt} /></DiagrammExport></div>
  {#if e.koef.length > 20}<p class="hilfe" style="margin-top:var(--a2)">{L('Beschriftet sind die 20 Größen mit dem größten Betrag; die übrigen sind grau.', 'The 20 predictors with the largest magnitude are labeled; the others are gray.')}</p>{/if}
{/if}
<div style="margin-top:var(--a4)"><Ausgabe items={tabellenStraf(e, name)} nurTabellen /></div>
<p class="hilfe" style="margin-top:var(--a2)"><HilfeLink id="strafregression" text={L('Hilfe: Ridge, Lasso und Elastic Net lesen', 'Help: reading ridge, lasso and elastic net')} /></p>
<details class="auf" style="margin-top:var(--a4)"><summary>{L('Für Fachleute', 'For specialists')}</summary>
  <p class="heft-text">{L('Ridge, Lasso und Elastic Net mit glmnet (Koordinatenabstieg, Genauigkeit 1e-14). Die Faltungen der Kreuzvalidierung mischt Statable selbst mit festem Startwert; 5 Wiederholungen mit anderer Faltung, die Fehlerkurven werden gemittelt. glmnet teilt das Ziel intern durch seine Standardabweichung; die Werte von λ sind darum nur innerhalb von glmnet vergleichbar. Die Zahlen sind gegen R (glmnet, eigener Koordinatenabstieg, geschlossenes Ridge) geprüft.',
    'Ridge, lasso and elastic net with glmnet (coordinate descent, accuracy 1e-14). Statable shuffles the folds of the cross-validation itself with a fixed seed; 5 repetitions with a different fold, the error curves are averaged. glmnet divides the target internally by its standard deviation; the values of λ are therefore only comparable within glmnet. The numbers are checked against R (glmnet, own coordinate descent, closed-form ridge).')}</p>
  <pre class="befehl">{code}</pre>
</details>
