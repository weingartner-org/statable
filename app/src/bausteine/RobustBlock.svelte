<script lang="ts">
  /** Robuste Standardfehler (HC3) unter der linearen Regression von „Lässt sich etwas vorhersagen?“ (S-H). Rechnet im Browser (lib/robustse.ts) mit denselben Personen und Hilfsspalten wie die Regression. */
  import HilfeLink from './HilfeLink.svelte';
  import { s, L } from '../lib/sitzung.svelte';
  import { komma, pWert } from '../lib/ergebnis';
  import { robusteSE, type HcArt } from '../lib/robustse';
  import { regMatrix } from '../lib/regmatrix';
  import type { RegTerm } from '../lib/regfaktor';

  let { terme, ziel, name }: { terme: RegTerm[]; ziel: string; name: (n: string) => string } = $props();
  const daten = $derived(regMatrix(s.spalten, s.zeilen, terme, ziel, name));
  let art = $state<HcArt>('HC3');
  const kennung = $props.id();
  const res = $derived(daten ? robusteSE(daten.x, daten.y, art) : null);
  const r = $derived(res && !('fehler' in res) ? res : null);
  const z4 = (v: number) => komma(Number(v.toPrecision(4)), 4);
  const verhaeltnis = $derived(r ? Math.max(...r.zeilen.slice(1).map(q => Math.max(q.se / q.seOls, q.seOls / q.se))) : 1);
</script>

<details class="auf" style="margin-top:var(--a4)"><summary>{L(`Robuste Standardfehler (${art})`, `Robust standard errors (${art})`)}</summary>
  <p class="heft-text">{L('Die übliche Regression nimmt an, dass die Reste überall gleich stark streuen. Streuen sie bei großen Werten mehr als bei kleinen (Heteroskedastizität), stimmen die Standardfehler, p-Werte und Intervalle nicht mehr. Robuste Standardfehler (HC3, nach White und MacKinnon, für kleine und mittlere Stichproben empfohlen; HC4, nach Cribari-Neto, zusätzlich für Fälle mit hohem Hebelwert) bleiben auch dann brauchbar. Die Koeffizienten selbst ändern sich nicht.', 'The usual regression assumes that the residuals scatter equally everywhere. If they scatter more for large values than for small ones (heteroscedasticity), the standard errors, p values and intervals are no longer correct. Robust standard errors (HC3, after White and MacKinnon, recommended for small and medium samples; HC4, after Cribari-Neto, additionally for cases with high leverage) remain usable even then. The coefficients themselves do not change.')}</p>
  <div class="segment" role="radiogroup" aria-labelledby="hc-t-{kennung}" style="margin:var(--a2) 0"><span id="hc-t-{kennung}" class="hilfe">{L('Welche Fassung?', 'Which version?')}</span>
    <label data-begriff="robuste-standardfehler"><input type="radio" name="hc-{kennung}" value="HC3" checked={art === 'HC3'} onchange={() => { art = 'HC3'; }}>{L('HC3 (Standard)', 'HC3 (default)')}</label>
    <label data-begriff="hc4"><input type="radio" name="hc-{kennung}" value="HC4" checked={art === 'HC4'} onchange={() => { art = 'HC4'; }}>{L('HC4 (bei Hebelwerten)', 'HC4 (for leverage)')}</label></div>
  {#if art === 'HC4'}<p class="heft-text">{L('Der HC4-Standardfehler gewichtet Fälle mit hohem Hebelwert (Fälle, die weit von den übrigen Vorhersagewerten liegen) schwächer ab als HC3 und ist dann vorsichtiger. Ohne solche Fälle liegen HC3 und HC4 nah beieinander.', 'The HC4 standard error discounts cases with high leverage (cases far from the other predictor values) more strongly than HC3 and is then more cautious. Without such cases HC3 and HC4 are close.')}</p>{/if}
  <p class="hilfe"><HilfeLink id="robuste-standardfehler" text={L('Hilfe: robuste Standardfehler', 'Help: robust standard errors')} /></p>
  {#if res && 'fehler' in res}
    <p class="heft-text" role="alert" style="color:var(--fehler, #b3261e)">{res.fehler === 'zu-wenig-faelle' ? L('Zu wenige Fälle für so viele Vorhersagegrößen.', 'Too few cases for so many predictors.') : res.fehler === 'hebel' ? L('Ein Fall bestimmt sein Ergebnis allein (Hebelwert 1): Die robuste Rechnung ist nicht möglich.', 'One case determines its own fit alone (leverage 1): the robust calculation is not possible.') : L('Die Vorhersagegrößen lassen sich nicht gemeinsam rechnen (eine bestimmt eine andere vollständig).', 'The predictors cannot be calculated together (one fully determines another).')}</p>
  {:else if r && daten}
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L(`Koeffizienten mit robusten Standardfehlern (${art})`, `Coefficients with robust standard errors (${art})`)}</b></caption>
      <thead><tr><th scope="col">{L('Vorhersagegröße', 'Predictor')}</th><th scope="col">B</th><th scope="col">{L('Standardfehler (üblich)', 'Standard error (usual)')}</th><th scope="col">{L('Standardfehler (robust)', 'Standard error (robust)')}</th><th scope="col">t</th><th scope="col">p</th><th scope="col">{L('95 %-Intervall (robust)', '95% interval (robust)')}</th></tr></thead>
      <tbody>{#each r.zeilen as q, i (i)}<tr><th scope="row" style="text-align: start">{i === 0 ? L('Konstante', 'Constant') : daten.zeilenNamen[i - 1]}</th><td style="text-align:right">{z4(q.b)}</td><td style="text-align:right">{z4(q.seOls)}</td><td style="text-align:right">{z4(q.se)}</td><td style="text-align:right">{komma(q.t, 2)}</td><td style="text-align:right">{pWert(q.p).replace(/^= /, '')}</td><td style="text-align:right">[{z4(q.lo)}; {z4(q.hi)}]</td></tr>{/each}</tbody>
    </table></div>
    <p class="heft-text">{L(`${r.n} Fälle, ${r.df} Freiheitsgrade.`, `${r.n} cases, ${r.df} degrees of freedom.`)} {verhaeltnis > 1.25 ? L('Die robusten Standardfehler weichen deutlich von den üblichen ab: Die Streuung der Reste ist wohl nicht gleich. Die robusten Werte sind dann die verlässlicheren.', 'The robust standard errors differ clearly from the usual ones: the scatter of the residuals is probably not equal. The robust values are then the more reliable ones.') : L('Die robusten und die üblichen Standardfehler liegen nah beieinander: Es gibt keinen Hinweis auf ungleiche Streuung der Reste.', 'The robust and the usual standard errors are close: there is no sign of unequal scatter of the residuals.')}</p>
  {/if}
</details>
