<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz } from '../lib/ytitel';
  import { zahlDe } from '../lib/format';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { achsenMarken } from '../lib/vorhdiagramm';
  import { spaltenName } from '../lib/medmodsaetze';
  import { nlsKurve, nlsFormelName, nlsFormelText, type NlsE } from '../lib/nls';

  /** Nichtlineare Regression (Abschnitt 5): Bild 1 zeigt die Punkte und die angepasste Kurve (nur innerhalb der beobachteten x-Werte), Bild 2 die Residuen gegen die angepassten Werte.
   *  Die Residuen anzusehen gehört zur Prüfung: Ein Muster darin heißt, dass die Formel nicht passt. */
  let { e }: { e: NlsE } = $props();
  const W = 560, H = 340, T = 24, U = 54, R = 24;
  const titelY = $derived(spaltenName(e.ziel)), titelX = $derived(spaltenName(e.praed));
  const L = $derived(64 + yZusatz(titelY, H - T - U, 13, false));
  const kurve = $derived(nlsKurve(e));
  const x0 = $derived(Math.min(...e.x)), x1 = $derived(Math.max(...e.x));
  const alleY = $derived([...e.y, ...kurve.map(p => p.y)]);
  const y0 = $derived(Math.min(...alleY)), y1 = $derived(Math.max(...alleY)), padY = $derived((y1 - y0 || 1) * 0.06), padX = $derived((x1 - x0 || 1) * 0.03);
  const X = (v: number) => L + (W - L - R) * ((v - (x0 - padX)) / ((x1 - x0 || 1) + 2 * padX));
  const Y = (v: number) => T + (H - T - U) * (1 - (v - (y0 - padY)) / ((y1 - y0 || 1) + 2 * padY));
  const pfad = $derived(kurve.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' '));
  const bild1 = $derived(Lx(`Punkte und angepasste Kurve (${nlsFormelName(e.art)}, ${nlsFormelText(e.art)}) für ${titelY} gegen ${titelX}. Die Kurve reicht nur über die beobachteten Werte.`,
    `Points and fitted curve (${nlsFormelName(e.art)}, ${nlsFormelText(e.art)}) for ${titelY} against ${titelX}. The curve covers only the observed values.`));

  // Bild 2: Residuen gegen angepasste Werte
  const t2 = $derived(Lx('Residuum', 'Residual'));
  const L2 = $derived(64 + yZusatz(t2, H - T - U, 13, false));
  const f0 = $derived(Math.min(...e.angepasst)), f1 = $derived(Math.max(...e.angepasst));
  const rm = $derived(Math.max(...e.rest.map(Math.abs), 1e-12)), rPad = $derived(rm * 0.08);
  const XR = (v: number) => L2 + (W - L2 - R) * ((v - f0) / ((f1 - f0) || 1)) * 0.94 + (W - L2 - R) * 0.03;
  const YR = (v: number) => T + (H - T - U) * (1 - (v + rm + rPad) / (2 * (rm + rPad)));
  const bild2 = $derived(Lx(`Residuen gegen die angepassten Werte. Ein erkennbares Muster heißt, dass die Formel nicht zu den Daten passt.`, `Residuals against the fitted values. A visible pattern means the formula does not fit the data.`));
  const bt1 = $derived.by(() => {
    const t = bildtext('streu', { xAchse: { name: titelX }, yAchse: { name: titelY }, punkte: e.x.map((v, i) => [v, e.y[i]!] as [number, number]) });
    return { ...t, beschreibung: [...t.beschreibung, bild1] };
  });
  const bt2 = $derived.by(() => {
    const t = bildtext('streu', { xAchse: { name: Lx('Angepasster Wert', 'Fitted value') }, yAchse: { name: t2 }, punkte: e.angepasst.map((v, i) => [v, e.rest[i]!] as [number, number]) });
    return { ...t, beschreibung: [...t.beschreibung, bild2] };
  });
</script>
<div class="nls-bilder">
  <div class="nls-bild">
  <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt1.kurz} style="max-width:{W}px">
    {#each achsenMarken(y0 - padY, y1 + padY) as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 10} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
    {#each achsenMarken(x0 - padX, x1 + padX) as v}<text x={X(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
    {#each e.x as x, i}<circle cx={X(x)} cy={Y(e.y[i]!)} r="3.2" fill="var(--dg-a)" fill-opacity="0.8" />{/each}
    <path d={pfad} fill="none" stroke="var(--dg-b)" stroke-width="2" />
    <XTitel x={(L + W - R) / 2} y={H - 8} breite={W - L - R} text={titelX} klasse="klein" />
    <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={titelY} px={13} klasse="klein" />
  </svg>
  <BildBeschreibung {...bt1} />
  </div>
  <div class="nls-bild">
  <svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt2.kurz} style="max-width:{W}px">
    {#each achsenMarken(-rm - rPad, rm + rPad) as v}<line x1={L2} x2={W - R} y1={YR(v)} y2={YR(v)} stroke={v === 0 ? 'var(--dg-achse)' : 'var(--dg-gitter)'} /><text x={L2 - 10} y={YR(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
    {#each achsenMarken(f0, f1) as v}<text x={XR(v)} y={H - U + 22} text-anchor="middle" class="klein">{zahlDe(v)}</text>{/each}
    {#each e.angepasst as f, i}<circle cx={XR(f)} cy={YR(e.rest[i]!)} r="3.2" fill="var(--dg-a)" fill-opacity="0.8" />{/each}
    <XTitel x={(L2 + W - R) / 2} y={H - 8} breite={W - L2 - R} text={Lx('Angepasster Wert', 'Fitted value')} klasse="klein" />
    <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={t2} px={13} klasse="klein" />
  </svg>
  <BildBeschreibung {...bt2} />
  </div>
</div>

<style>
  .nls-bilder { display: flex; flex-wrap: wrap; gap: var(--a3); margin: var(--a3) 0; }
  .nls-bild { flex: 1 1 320px; min-width: 0; }
</style>
