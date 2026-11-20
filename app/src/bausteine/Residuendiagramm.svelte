<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import { z as zt } from '../lib/bildtext/zahlen';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz, yMarkenZusatz } from '../lib/ytitel';
  import { kleinste, groesste } from '../lib/menge';
  import { achsenBereich, achsenMarken, qqnorm, type Reste } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { L as Lx, Lp } from '../lib/sitzung.svelte';
  import { GRENZE, qqIndex, qqHinweis, punkteHinweis, stichprobenIndex } from '../lib/stichprobe';
  /** Zwei Blicke auf die Reste (beobachtet minus vorhergesagt) einer linearen Regression:
   *  `rest`: Reste gegen vorhergesagte Werte mit Null-Linie; `qq`: Q-Q-Diagramm gegen die Normalverteilung (wie R `qqnorm` und `qqline`). */
  let { r, art = 'rest', zielText }: { r: Reste; art?: 'rest' | 'qq'; zielText: string } = $props();
  const kennung = $props.id();
  const W = 560, H0 = 360, L0 = 64, R = 24, T = 76, U0 = 58;
  /** Linker Rand wächst mit, wenn der senkrechte Titel umbricht oder die Achsenzahlen lang sind (Regel lib/ytitel.ts). */
  const L = $derived.by(() => L0 + yZusatz(art === 'qq' ? Lx('Reste', 'Residuals') : Lx('Rest (beobachtet − vorhergesagt)', 'Residual (observed − predicted)'), H0 - T - U0, 13, false) + yMarkenZusatz(ym.map(v => zahlDe(v))));
  const xTitel = $derived(art === 'qq' ? Lx('Theoretische Quantile (Normalverteilung)', 'Theoretical quantiles (normal distribution)') : Lx(`Vorhergesagt: ${zielText}`, `Predicted: ${zielText}`));
  /** Waagrechter Titel bricht um (Regel lib/ytitel.ts): Höhe und unterer Rand wachsen mit, die Zeichenfläche bleibt. */
  const XZ = $derived(xZusatz(xTitel, W - L - R));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);
  const qq = $derived(qqnorm(r.rest));
  const punkte = $derived<[number, number][]>(art === 'qq' ? (qq?.punkte ?? []) : r.vorhergesagt.map((v, i) => [v, r.rest[i]!]));
  const xs = $derived(punkte.map(p => p[0])), ys = $derived(punkte.map(p => p[1]));
  const xb = $derived(achsenBereich(Math.min(kleinste(xs)), Math.max(groesste(xs)))), yb = $derived(achsenBereich(Math.min(0, kleinste(ys), kleinste((art === 'qq' ? [] : [0]))), Math.max(0, groesste(ys))));
  const X = (v: number) => L + (W - L - R) * ((v - xb[0]) / (xb[1] - xb[0] || 1));
  const Y = (v: number) => T + (H - T - U) * (1 - (v - yb[0]) / (yb[1] - yb[0] || 1));
  const xm = $derived(achsenMarken(xb[0], xb[1])), ym = $derived(achsenMarken(yb[0], yb[1]));
  /** Gezeichnet werden höchstens GRENZE.streu Punkte (lib/stichprobe.ts): Q-Q: Enden vollständig, Mitte gleichmäßig; Reste gegen Vorhergesagt: feste Zufallsauswahl. Zahlen und Linien rechnen mit allen. */
  const zeig = $derived(punkte.length <= GRENZE.streu ? punkte : (art === 'qq' ? qqIndex(punkte.length, GRENZE.streu) : stichprobenIndex(punkte.length, GRENZE.streu)).map(i => punkte[i]!));
  const hinweis = $derived(zeig.length < punkte.length ? (art === 'qq' ? qqHinweis(zeig.length, punkte.length) : punkteHinweis(zeig.length, punkte.length)) : '');
  const radius = $derived(zeig.length > 400 ? 2.5 : zeig.length > 150 ? 3.2 : 4);
  const sdRest = $derived(Math.sqrt(r.rest.reduce((a, v) => a + v * v, 0) / Math.max(1, r.n - 1)));
  const gross = $derived(r.rest.filter(v => Math.abs(v) > 3 * sdRest).length);
  const titel = $derived(art === 'qq' ? Lx('Q-Q-Diagramm der Reste', 'Q-Q plot of the residuals') : Lx('Reste gegen vorhergesagte Werte', 'Residuals against predicted values'));
  const grossText = $derived(gross ? ' ' + Lp(gross, `${gross} Rest liegt mehr als drei Standardabweichungen von null entfernt.`, `${gross} Reste liegen mehr als drei Standardabweichungen von null entfernt.`, `${gross} residual is more than three standard deviations from zero.`, `${gross} residuals are more than three standard deviations from zero.`) : '');
  const beschreibung = $derived(art === 'qq'
    ? Lx(`Q-Q-Diagramm der Reste der Vorhersage von ${zielText}, ${r.n} Personen. Die Punkte zeigen die Reste gegen die Werte, die bei Normalverteilung zu erwarten wären; die Linie läuft durch die Quartile. Je näher die Punkte an der Linie liegen, desto eher sind die Reste normalverteilt.`,
        `Q-Q plot of the residuals from predicting ${zielText}, ${r.n} people. The points show the residuals against the values expected under a normal distribution; the line runs through the quartiles. The closer the points lie to the line, the more normal the residuals are.`) + grossText
    : Lx(`Reste gegen vorhergesagte Werte bei der Vorhersage von ${zielText}, ${r.n} Personen. Jeder Punkt ist eine Person; die waagrechte Linie bei 0 ist „Vorhersage genau richtig“. Die Reste liegen zwischen ${zahlDe(Math.min(kleinste(r.rest)), 1)} und ${zahlDe(Math.max(groesste(r.rest)), 1)}.`,
        `Residuals against predicted values when predicting ${zielText}, ${r.n} people. Each dot is one person; the horizontal line at 0 means "prediction exactly right". The residuals range from ${zahlDe(Math.min(kleinste(r.rest)), 1)} to ${zahlDe(Math.max(groesste(r.rest)), 1)}.`) + grossText + ' ' + Lx('Ohne erkennbares Muster passt das Modell.', 'With no visible pattern the model fits.'));
  const bt = $derived.by(() => {
    const t = art === 'qq' && qq
      ? bildtext('qq', { titel, name: Lx('Reste', 'Residuals'), punkte: qq.punkte, steigung: qq.steigung, achsenabschnitt: qq.achsenabschnitt })
      : bildtext('streu', { titel, xAchse: { name: xTitel }, yAchse: { name: Lx('Rest (beobachtet minus vorhergesagt)', 'Residual (observed minus predicted)') }, punkte });
    return { ...t, beschreibung: [...t.beschreibung, hinweis ? `${beschreibung} ${hinweis}.` : beschreibung] };
  });
</script>
{#if punkte.length >= 3}
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <text x="24" y="26" style="font-size:16px" font-weight="650">{titel}</text>
  <text x="24" y="50" class="klein">{hinweis ? `${hinweis}. ${art === 'qq' ? Lx('Linie: Normalverteilung.', 'Line: normal distribution.') : Lx('Linie: Rest 0.', 'Line: residual 0.')}` : art === 'qq' ? Lx('Punkte: Reste. Linie: Normalverteilung.', 'Dots: residuals. Line: normal distribution.') : Lx('Punkte: Personen. Linie: Rest 0.', 'Dots: people. Line: residual 0.')}</text>
  {#each ym as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  {#each xm as v}<line x1={X(v)} x2={X(v)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#if art === 'rest'}
    <line x1={L} x2={W - R} y1={Y(0)} y2={Y(0)} stroke="var(--dg-b)" stroke-width="2.5" stroke-dasharray="7 5" />
  {:else if qq}
    <line x1={X(Math.min(kleinste(xs)))} y1={Y(qq.achsenabschnitt + qq.steigung * Math.min(kleinste(xs)))} x2={X(Math.max(groesste(xs)))} y2={Y(qq.achsenabschnitt + qq.steigung * Math.max(groesste(xs)))} stroke="var(--dg-b)" stroke-width="2.5" stroke-dasharray="7 5" />
  {/if}
  {#each zeig as [x, y]}<circle cx={X(x)} cy={Y(y)} r={radius} fill="var(--dg-punkt-a)" stroke="var(--dg-a)" stroke-width="1"><title>{art === 'qq' ? `${zahlDe(x, 2)} / ${zahlDe(y, 2)}` : `${zahlDe(x, 1)} → ${zahlDe(y, 1)}`}</title></circle>{/each}
  <XTitel x={(L + W - R) / 2} y={H0 - 8} breite={W - L - R} text={xTitel} klasse="klein" />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={art === 'qq' ? Lx('Reste', 'Residuals') : Lx('Rest (beobachtet − vorhergesagt)', 'Residual (observed − predicted)')} px={13} klasse="klein" />
</svg>
<BildBeschreibung {...bt} />
{/if}
