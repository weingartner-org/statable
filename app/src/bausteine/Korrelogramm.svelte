<script lang="ts">
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import YTitel from './YTitel.svelte';
  import { zahlDe } from '../lib/format';
  import { L as Lx, Lp } from '../lib/sitzung.svelte';

  /**
   * Das Korrelogramm (Später S-E, L7): ein Stab je Verzögerung (Lag) mit der Autokorrelation, zwei waagerechte Grenzlinien bei ±1,96/√n. Die Grenzen gelten punktweise: bei 24 Verzögerungen
   * ist ein Stab außerhalb allein durch Zufall zu erwarten; der Ljung-Box-Test prüft alle gemeinsam. Bei einer Saison (Periode m) sind die Verzögerungen m, 2m … hervorgehoben.
   */
  let { r, grenze, periode = 1, titel, n, partiell = false }: { r: number[]; grenze: number; periode?: number; titel: string; n: number; partiell?: boolean } = $props();
  const uid = $props.id();
  const W = 720, H = 300, L = 62, Rr = 24, T = 44, U = 56;
  const maxAbs = $derived(Math.max(0.2, grenze * 1.15, ...r.map(v => Math.abs(v))));
  const hoch = $derived(Math.min(1, Math.ceil(maxAbs * 5) / 5));
  const Y = (v: number) => T + (H - T - U) * (1 - (v + hoch) / (2 * hoch));
  const X = (lag: number) => L + 14 + (W - L - Rr - 28) * (r.length <= 1 ? 0.5 : (lag - 1) / (r.length - 1));
  const breiteStab = $derived(Math.max(2, Math.min(14, ((W - L - Rr - 28) / Math.max(1, r.length)) * 0.55)));
  const takt = $derived(r.length > 24 ? (periode > 1 && r.length >= periode ? periode : 5) : 1);
  const marken = $derived(Array.from({ length: Math.floor(hoch * 5) * 2 + 1 }, (_, i) => -hoch + (i * 0.2)).filter(v => Math.abs(v) <= hoch + 1e-9).map(v => Math.round(v * 10) / 10));
  const draussen = $derived(r.filter(v => Math.abs(v) > grenze).length);
  const jahrText = (lag: number) => {
    if (periode !== 12 || lag % 12 !== 0) return '';
    const j = lag / 12;
    return Lp(j, `${j} Jahr`, `${j} Jahre`, `${j} year`, `${j} years`);
  };
  const lagText = (v: number, lag: number) => Lx(`Lag ${lag}: ${zahlDe(v, 2)}`, `lag ${lag}: ${zahlDe(v, 2)}`);
  const werteText = $derived(r.slice(0, 6).map((v, i) => lagText(v, i + 1)).join('; ') + (r.length > 6 ? ' …' : ''));
  const beschreibung = $derived((partiell ? Lx(`Partielles Korrelogramm (${titel}): ${r.length} Verzögerungen, Grenzen ±${zahlDe(grenze, 3)}. ${werteText}. `, `Partial correlogram (${titel}): ${r.length} lags, limits ±${zahlDe(grenze, 3)}. ${werteText}. `) : Lx(`Korrelogramm (${titel}): ${r.length} Verzögerungen, Grenzen ±${zahlDe(grenze, 3)}. ${werteText}. `, `Correlogram (${titel}): ${r.length} lags, limits ±${zahlDe(grenze, 3)}. ${werteText}. `))
    + Lp(draussen, `${draussen} Stab liegt außerhalb der Grenzen.`, `${draussen} Stäbe liegen außerhalb der Grenzen.`, `${draussen} bar lies outside the limits.`, `${draussen} bars lie outside the limits.`));
  const bt = $derived.by(() => {
    const t = bildtext('saeulen', { titel, kategorieName: Lx('Verzögerung (Lag)', 'Lag'), kategorien: r.map((_, i) => String(i + 1)), wertName: partiell ? Lx('Partielle Autokorrelation', 'Partial autocorrelation') : Lx('Autokorrelation', 'Autocorrelation'), reihen: [{ werte: r }] });
    return { ...t, beschreibung: [...t.beschreibung, beschreibung] };
  });
</script>
{#if r.length >= 2}
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  <text x={L} y="22" style="font-size:15px" font-weight="650">{titel}</text>
  {#each marken as v}<line x1={L} x2={W - Rr} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 8} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v, 1)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" />
  <line x1={L} x2={W - Rr} y1={Y(0)} y2={Y(0)} stroke="var(--dg-achse)" />
  <line x1={L} x2={W - Rr} y1={Y(grenze)} y2={Y(grenze)} stroke="var(--dg-b)" stroke-width="2" stroke-dasharray="7 5" /><line x1={L} x2={W - Rr} y1={Y(-grenze)} y2={Y(-grenze)} stroke="var(--dg-b)" stroke-width="2" stroke-dasharray="7 5" />
  {#each r as v, i}
    {@const lag = i + 1}
    <rect x={X(lag) - breiteStab / 2} y={Math.min(Y(0), Y(v))} width={breiteStab} height={Math.max(1, Math.abs(Y(v) - Y(0)))} fill={Math.abs(v) > grenze ? 'var(--dg-b)' : 'var(--dg-a)'} stroke="var(--tinte)" stroke-width={periode > 1 && lag % periode === 0 ? 1.4 : 0.6}><title>{Lx(`Lag ${lag}`, `Lag ${lag}`)}: {zahlDe(v, 2)}</title></rect>
    {#if lag % takt === 0 || lag === 1}<text x={X(lag)} y={H - U + 18} text-anchor="middle" class="klein" font-weight={periode > 1 && lag % periode === 0 ? 700 : undefined}>{lag}</text>{/if}
    {#if jahrText(lag)}<text x={X(lag)} y={H - U + 33} text-anchor="middle" class="klein" style="font-size:11px">{jahrText(lag)}</text>{/if}
  {/each}
  <text x={(L + W - Rr) / 2} y={H - 8} text-anchor="middle" class="klein">{Lx('Verzögerung (Lag)', 'Lag')}</text>
  <YTitel x={16} y={(T + H - U) / 2} laenge={H - T - U} text={partiell ? Lx('Partielle Autokorrelation', 'Partial autocorrelation') : Lx('Autokorrelation', 'Autocorrelation')} px={13} klasse="klein" />
  <text x={W - Rr} y="22" text-anchor="end" class="klein" style="font-size:11px">{Lx(`Linien: ±1,96/√n (n = ${n})`, `Lines: ±1.96/√n (n = ${n})`)}</text>
</svg>
<BildBeschreibung {...bt} />
{/if}
