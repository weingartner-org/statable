<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import HilfeLink from './HilfeLink.svelte';
  import { kursSprung } from '../lib/kursziel';
  /** „Kurve statt Gerade?“ - Kurvenanpassung unter dem Streudiagramm von „Hängen zwei Dinge zusammen?“ (S-I). Rechnet im Browser (lib/kurven.ts). */
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import DiagrammExport from './DiagrammExport.svelte';
  import { L } from '../lib/sitzung.svelte';
  import { zahlDe } from '../lib/format';
  import { komma } from '../lib/ergebnis';
  import { kleinste, groesste } from '../lib/menge';
  import { alleKurven, KURVEN_ARTEN, type Kurve, type KurvenArt } from '../lib/kurven';
  import { achsenMarken } from '../lib/diagrammdaten';
  import { zieheStichprobe, GRENZE } from '../lib/stichprobe';
  import { tQuantil } from '../lib/verteilung';

  let { punkte, xName, yName, ziel = false }: { punkte: [number, number][]; xName: string; yName: string; ziel?: boolean } = $props();
  const kennung = $props.id();
  let wahl = $state<KurvenArt>('quadratisch');
  const alle = $derived(alleKurven(punkte));
  const kurve = $derived(alle.kurven.find(k => k.art === wahl) ?? alle.kurven.find(k => k.art === 'gerade') ?? null);
  const gerade = $derived(alle.kurven.find(k => k.art === 'gerade') ?? null);
  const name = (a: KurvenArt) => a === 'gerade' ? L('Gerade', 'Straight line') : a === 'quadratisch' ? L('Parabel (quadratisch)', 'Parabola (quadratic)') : a === 'logarithmisch' ? L('Logarithmus', 'Logarithm') : a === 'exponentiell' ? L('Exponentiell', 'Exponential') : a === 'potenz' ? L('Potenz', 'Power') : a === 'logistisch' ? L('Logistisches Wachstum', 'Logistic growth') : a === 'gompertz' ? L('Gompertz-Wachstum', 'Gompertz growth') : L('Dosis-Wirkung (4PL)', 'Dose-response (4PL)');
  const grund = (g: string) => g === 'x-nicht-positiv' ? L('braucht x > 0', 'needs x > 0') : g === 'y-nicht-positiv' ? L('braucht y > 0', 'needs y > 0') : g === 'zu-wenig-punkte' ? L('zu wenige Punkte', 'too few points') : g === 'keine-konvergenz' ? L('passt nicht (kein Wachstum mit Sättigung)', 'does not fit (no growth with saturation)') : L('keine Streuung', 'no variation');
  const s4 = (v: number) => zahlDe(Number(v.toPrecision(4)));
  const gleichung = (k: Kurve) => { const [a, b, c] = k.koeff.map(s4) as [string, string, string]; const vz = (t: string) => (t.startsWith('−') ? `− ${t.slice(1)}` : `+ ${t}`);
    return k.art === 'gerade' ? `y = ${a} ${vz(b)}·x` : k.art === 'quadratisch' ? `y = ${a} ${vz(b)}·x ${vz(c)}·x²` : k.art === 'logarithmisch' ? `y = ${a} ${vz(b)}·ln x` : k.art === 'exponentiell' ? `y = ${a}·e^(${b}·x)` : k.art === 'potenz' ? `y = ${a}·x^${b}` : k.art === 'logistisch' ? `y = ${a} / (1 + e^(−${b}·(x ${c.startsWith('−') ? `+ ${c.slice(1)}` : `− ${c}`})))` : k.art === 'gompertz' ? `y = ${a}·e^(−${b}·${c}^x)` : `y = u + (o − u) / (1 + (x / EC50)^b), u = ${a}, o = ${b}, EC50 = ${c}, b = ${s4(k.koeff[3]!)}`; };

  const parName = (a: KurvenArt, i: number) => a === 'logistisch' ? [L('K (obere Grenze)', 'K (upper limit)'), L('r (Steigung)', 'r (steepness)'), L('x₀ (Mittelpunkt)', 'x₀ (midpoint)')][i]! : a === 'gompertz' ? [L('K (obere Grenze)', 'K (upper limit)'), 'b', 'c'][i]! : [L('unten (u)', 'lower (u)'), L('oben (o)', 'upper (o)'), 'EC50', L('Steigung (b)', 'slope (b)')][i]!;
  const intervalle = $derived(kurve?.se ? kurve.koeff.map((b, i) => { const se = kurve.se![i]!, q = tQuantil(0.975, kurve.n - kurve.koeff.length); return { name: parName(kurve.art, i), b, se, lo: b - q * se, hi: b + q * se }; }) : null);
  const W = 560, H = 340, L0 = 64, R = 24, T = 24, U = 56;
  const zeig = $derived(zieheStichprobe(punkte, GRENZE.streu));
  const xs = $derived(punkte.map(p => p[0])), ys = $derived(punkte.map(p => p[1]));
  const x0 = $derived(Math.min(kleinste(xs))), x1 = $derived(Math.max(groesste(xs)));
  const kurvenY = $derived(kurve ? Array.from({ length: 121 }, (_, i) => kurve.y(x0 + (x1 - x0) * i / 120)).filter(Number.isFinite) : []);
  const y0 = $derived(Math.min(kleinste([...ys, ...kurvenY]))), y1 = $derived(Math.max(groesste([...ys, ...kurvenY])));
  const pad = (a: number, b: number) => (b - a || 1) * 0.06;
  const X = (v: number) => L0 + (W - L0 - R) * (v - (x0 - pad(x0, x1))) / ((x1 - x0 || 1) + 2 * pad(x0, x1));
  const Y = (v: number) => T + (H - T - U) * (1 - (v - (y0 - pad(y0, y1))) / ((y1 - y0 || 1) + 2 * pad(y0, y1)));
  const pfad = (k: Kurve | null) => (k ? Array.from({ length: 121 }, (_, i) => { const x = x0 + (x1 - x0) * i / 120, y = k.y(x); return Number.isFinite(y) ? `${i === 0 ? 'M' : 'L'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}` : ''; }).join(' ') : '');
  const beschreibung = $derived(kurve ? L(`Punkte der Messwerte ${yName} gegen ${xName} mit der Kurve ${name(kurve.art)}: ${gleichung(kurve)}, R² = ${komma(kurve.r2, 3)}`, `Points of the values ${yName} against ${xName} with the curve ${name(kurve.art)}: ${gleichung(kurve)}, R² = ${komma(kurve.r2, 3)}`) : '');
  const bt = $derived.by(() => {
    if (!kurve) return null;
    const t = bildtext('streu', { xAchse: { name: xName }, yAchse: { name: yName }, punkte, ...(kurve.art === 'gerade' ? { gerade: { a: kurve.koeff[0]!, b: kurve.koeff[1]!, r2: kurve.r2 } } : {}) });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>

{#if punkte.length >= 4 && alle.kurven.length > 1}
  <details class="auf" style="margin-top:var(--a4)" open={ziel} use:kursSprung={ziel} data-kurs="kurven"><summary>{L('Kurve statt Gerade? (Kurvenanpassung)', 'Curve instead of a straight line? (curve fitting)')}</summary>
    <p class="heft-text">{L('Wenn die Punkte im Streudiagramm keiner Geraden folgen, passt vielleicht eine Kurve besser. Statable rechnet mehrere Formen, auch Wachstum mit Sättigung (logistisch, Gompertz), und zeigt für alle das R² auf der Skala von y.', 'If the points in the scatter plot do not follow a straight line, a curve may fit better. Statable calculates several shapes, including growth with saturation (logistic, Gompertz), and shows R² on the scale of y for all of them.')}</p>
    <p class="hilfe"><HilfeLink id="kurvenanpassung" text={L('Hilfe: Kurvenanpassung', 'Help: curve fitting')} /></p>
    <fieldset class="segment" style="margin:var(--a2) 0"><legend class="nur-vorleser">{L('Welche Kurve zeigen?', 'Which curve to show?')}</legend>
      {#each alle.kurven as k (k.art)}<label><input type="radio" name="kurve-{kennung}" value={k.art} checked={wahl === k.art} onchange={() => (wahl = k.art)} />{name(k.art)}</label>{/each}
    </fieldset>
    <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
      <caption><b>{L('Vergleich der Kurven', 'Comparison of the curves')}</b></caption>
      <thead><tr><th scope="col">{L('Kurve', 'Curve')}</th><th scope="col">{L('Gleichung', 'Equation')}</th><th scope="col">R²</th><th scope="col">{L('R² bereinigt', 'Adjusted R²')}</th></tr></thead>
      <tbody>{#each alle.kurven as k (k.art)}<tr><th scope="row" style="text-align: start">{name(k.art)}</th><td>{gleichung(k)}</td><td style="text-align:right">{komma(k.r2, 3)}</td><td style="text-align:right">{komma(k.r2korr, 3)}</td></tr>{/each}</tbody>
    </table></div>
    {#if alle.fehlen.length}<p class="heft-text" style="color:var(--tinte-2)">{alle.fehlen.map(f => `${name(f.art)}: ${grund(f.grund)}`).join(' · ')}</p>{/if}
    {#if kurve}
      <DiagrammExport titel={`${yName} - ${name(kurve.art)}`}>
        <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt?.kurz} style="max-width:{W}px">
          {#each achsenMarken(y0, y1) as v}<line x1={L0} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L0 - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
          {#each achsenMarken(x0, x1) as v}<text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
          {#each zeig.auswahl as [x, y]}<circle cx={X(x)} cy={Y(y)} r="4" fill="var(--dg-punkt-a)" />{/each}
          {#if gerade && kurve.art !== 'gerade'}<path d={pfad(gerade)} fill="none" stroke="var(--dg-gitter)" stroke-width="2" stroke-dasharray="6 5" />{/if}
          <path d={pfad(kurve)} fill="none" stroke="var(--dg-a)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <XTitel x={(L0 + W - R) / 2} y={H - 8} breite={W - L0 - R} text={xName} klasse="klein" />
          <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={yName} px={13} klasse="klein" />
        </svg>
      </DiagrammExport>
      {#if bt}<BildBeschreibung {...bt} />{/if}
      <p class="heft-text">{gleichung(kurve)} · R² = {komma(kurve.r2, 3)}{kurve.art !== 'gerade' && gerade ? L(` (Gerade: ${komma(gerade.r2, 3)})`, ` (straight line: ${komma(gerade.r2, 3)})`) : ''}</p>
      {#if intervalle}
        <div style="overflow-x:auto"><table class="apa" style="margin:var(--a2) 0">
          <caption><b>{L('Koeffizienten mit Standardfehler und 95 %-Intervall', 'Coefficients with standard error and 95% interval')}</b></caption>
          <thead><tr><th scope="col">{L('Koeffizient', 'Coefficient')}</th><th scope="col">{L('Schätzung', 'Estimate')}</th><th scope="col">{L('Standardfehler', 'Standard error')}</th><th scope="col">{L('95 %-Intervall', '95% interval')}</th></tr></thead>
          <tbody>{#each intervalle as q, i (i)}<tr><th scope="row" style="text-align: start">{q.name}</th><td style="text-align:right">{s4(q.b)}</td><td style="text-align:right">{s4(q.se)}</td><td style="text-align:right">[{s4(q.lo)}; {s4(q.hi)}]</td></tr>{/each}</tbody>
        </table></div>
        <p class="heft-text" style="color:var(--tinte-2)">{L('Die Intervalle sind Näherungen (Wald); bei wenigen Punkten oder flachen Kurven können sie zu schmal sein.', 'The intervals are approximations (Wald); with few points or flat curves they can be too narrow.')}</p>
      {/if}
    {/if}
    <p class="heft-text" style="color:var(--tinte-2)">{L('Eine Kurve mit mehr Zahlen (die Parabel hat drei) passt Punkte immer besser an als eine Gerade - das bereinigte R² rechnet das ein. Am besten gilt die einfachste Form, die zum Sachverhalt passt; eine Kurve ist keine Erklärung. Außerhalb der Daten (Extrapolation) sagen Kurven oft Unsinn voraus: Eine Parabel dreht um, eine Exponentialkurve wächst ins Unermessliche.', 'A curve with more numbers (the parabola has three) always fits points better than a straight line - the adjusted R² takes that into account. The simplest shape that fits the subject matter is best; a curve is not an explanation. Outside the data (extrapolation) curves often predict nonsense: a parabola turns around, an exponential curve grows without bound.')}</p>
    {#if wahl === 'exponentiell' || wahl === 'potenz'}<p class="heft-text" style="color:var(--tinte-2)">{L('Exponentiell und Potenz rechnet Statable über die Logarithmen von y (wie Excel): Die Kurve minimiert die Abweichungen der Logarithmen, nicht der Originalwerte. Das R² oben steht trotzdem auf der Skala von y.', 'Statable calculates exponential and power through the logarithms of y (as Excel does): the curve minimizes the deviations of the logarithms, not of the original values. The R² above is still on the scale of y.')}</p>{/if}
  </details>
{/if}
