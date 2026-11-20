<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import { zahlDe } from '../lib/format';
  import { L as Lx, Lp } from '../lib/sitzung.svelte';
  import { ccfAchsenText, type CcfErgebnis } from '../lib/zeitreiheccf';

  /**
   * Das Bild der Kreuzkorrelation (Später S-F2, C.2): ein Stab je Verzögerung k von −lagMax bis +lagMax mit r(k) und zwei Grenzlinien bei ±1,96/√n.
   * Statable-Richtung: positives k heißt, die erste Reihe liegt vorn. Die Achse sagt es in Worten mit den Spaltennamen („← zweite liegt vorn | erste liegt vorn →“).
   * Die Grenzen gelten für jede Verzögerung einzeln, nicht für alle zusammen.
   */
  let { e, namen, titel, periode = 1 }: { e: CcfErgebnis; namen: [string, string]; titel: string; periode?: number } = $props();
  const uid = $props.id();
  const W = 720, H = 330, L = 62, Rr = 24, T = 44, U = 76;
  const werte = $derived(e.r.map(v => (v === null || !Number.isFinite(v) ? 0 : v)));
  const maxAbs = $derived(Math.max(0.2, e.grenze * 1.15, ...werte.map(v => Math.abs(v))));
  const hoch = $derived(Math.min(1, Math.ceil(maxAbs * 5) / 5));
  const Y = (v: number) => T + (H - T - U) * (1 - (v + hoch) / (2 * hoch));
  const lagMax = $derived(e.lags.length ? e.lags[e.lags.length - 1]! : 1);
  const X = (lag: number) => L + 14 + (W - L - Rr - 28) * ((lag + lagMax) / (2 * lagMax || 1));
  const breiteStab = $derived(Math.max(2, Math.min(14, ((W - L - Rr - 28) / Math.max(1, e.lags.length)) * 0.55)));
  const takt = $derived(e.lags.length > 25 ? (periode > 1 && periode <= lagMax ? periode : 5) : 1);
  const marken = $derived(Array.from({ length: Math.floor(hoch * 5) * 2 + 1 }, (_, i) => -hoch + (i * 0.2)).filter(v => Math.abs(v) <= hoch + 1e-9).map(v => Math.round(v * 10) / 10));
  const draussen = $derived(werte.filter(v => Math.abs(v) > e.grenze).length);
  /** Der größte Betrag mit seiner Verzögerung, für die Beschreibung. */
  const spitze = $derived.by(() => { let b = 0; werte.forEach((v, i) => { if (Math.abs(v) > Math.abs(werte[b]!)) b = i; }); return { k: e.lags[b] ?? 0, r: werte[b] ?? 0 }; });
  const beschreibung = $derived(Lx(`Kreuzkorrelation von ${namen[0]} und ${namen[1]}: ${e.lags.length} Verzögerungen von ${e.lags[0]} bis ${lagMax}, Grenzen ±${zahlDe(e.grenze, 3)}. Der größte Betrag ist r = ${zahlDe(spitze.r, 2)} bei Verzögerung ${spitze.k}. Positive Verzögerung heißt: ${namen[0]} liegt vorn. `,
    `Cross-correlation of ${namen[0]} and ${namen[1]}: ${e.lags.length} lags from ${e.lags[0]} to ${lagMax}, limits ±${zahlDe(e.grenze, 3)}. The largest absolute value is r = ${zahlDe(spitze.r, 2)} at lag ${spitze.k}. Positive lag means: ${namen[0]} leads. `)
    + Lp(draussen, `${draussen} Stab liegt außerhalb der Grenzen.`, `${draussen} Stäbe liegen außerhalb der Grenzen.`, `${draussen} bar lies outside the limits.`, `${draussen} bars lie outside the limits.`));
  const bt = $derived.by(() => {
    const t = bildtext('saeulen', { titel, kategorieName: Lx('Verzögerung k', 'Lag k'), kategorien: e.lags.map(String), wertName: Lx('Kreuzkorrelation (r)', 'Cross-correlation (r)'), reihen: [{ werte: e.r }] });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung, ccfAchsenText(namen)] };
  });
</script>
{#if e.lags.length >= 3}
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <text x={L} y="22" style="font-size:15px" font-weight="650">{titel}</text>
  {#each marken as v}<line x1={L} x2={W - Rr} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 8} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v, 1)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" />
  <line x1={L} x2={W - Rr} y1={Y(0)} y2={Y(0)} stroke="var(--dg-achse)" />
  <line x1={X(0)} x2={X(0)} y1={T} y2={H - U} stroke="var(--dg-achse)" stroke-dasharray="3 4" />
  <line x1={L} x2={W - Rr} y1={Y(e.grenze)} y2={Y(e.grenze)} stroke="var(--dg-b)" stroke-width="2" stroke-dasharray="7 5" /><line x1={L} x2={W - Rr} y1={Y(-e.grenze)} y2={Y(-e.grenze)} stroke="var(--dg-b)" stroke-width="2" stroke-dasharray="7 5" />
  {#each e.lags as lag, i}
    {@const v = werte[i]!}
    <rect x={X(lag) - breiteStab / 2} y={Math.min(Y(0), Y(v))} width={breiteStab} height={Math.max(1, Math.abs(Y(v) - Y(0)))} fill={Math.abs(v) > e.grenze ? 'var(--dg-b)' : 'var(--dg-a)'} stroke="var(--tinte)" stroke-width={periode > 1 && lag !== 0 && lag % periode === 0 ? 1.4 : 0.6}><title>{Lx(`Verzögerung ${lag}`, `Lag ${lag}`)}: r = {e.r[i] === null ? '-' : zahlDe(v, 2)}</title></rect>
    {#if lag % takt === 0 || i === 0 || i === e.lags.length - 1}<text x={X(lag)} y={H - U + 18} text-anchor="middle" class="klein">{lag}</text>{/if}
  {/each}
  <text x={(L + W - Rr) / 2} y={H - U + 40} text-anchor="middle" class="klein">{Lx('Verzögerung k', 'Lag k')}</text>
  <text x={(L + W - Rr) / 2} y={H - 10} text-anchor="middle" class="klein" font-weight="650">{ccfAchsenText(namen)}</text>
  <YTitel x={16} y={(T + H - U) / 2} laenge={H - T - U} text={Lx('Kreuzkorrelation', 'Cross-correlation')} px={13} klasse="klein" />
  <text x={W - Rr} y="22" text-anchor="end" class="klein" style="font-size:11px">{Lx(`Linien: ±1,96/√n (n = ${e.n})`, `Lines: ±1.96/√n (n = ${e.n})`)}</text>
</svg>
<BildBeschreibung {...bt} />
{/if}
