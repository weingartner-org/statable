<script lang="ts">
  import XTitel from './XTitel.svelte';
  import { xZusatz } from '../lib/ytitel';
  import { komma } from '../lib/ergebnis';
  import { L as Lx } from '../lib/sitzung.svelte';
  import { iv } from '../i18n/profil';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';

  /**
   * Forest-Bild der Odds Ratios je Schicht (Später S-B, M3): je Schicht ein Quadrat (Fläche nach der Zahl der Fälle) mit dem 95-%-Intervall nach Woolf,
   * darunter das Odds Ratio ohne Aufteilung (offene Raute) und das gemeinsame Odds Ratio nach Mantel-Haenszel (Raute). Die Achse ist logarithmisch, 1 = kein Unterschied.
   * Eine Schicht mit leerer Zelle hat kein Odds Ratio (keine Haldane-Korrektur): sie steht mit „nicht schätzbar“ da.
   */
  type Reihe = { name: string; n: number; or: number | null; lo: number | null; hi: number | null };
  type Oder = { or: number; lo: number; hi: number } | null;
  let { reihen, gemeinsam, unbereinigt, gruppe1, gruppe2 }: { reihen: Reihe[]; gemeinsam: Oder; unbereinigt: Oder; gruppe1: string; gruppe2: string } = $props();

  let br = $state(0);
  const kompakt = $derived(br > 0 && br < 520);
  const W = $derived(kompakt ? 400 : 700), ZH = 24, T = 38, LINKS = $derived(kompakt ? 130 : 220), RECHTS = $derived(kompakt ? 14 : 170);
  const zeig = (v: number) => komma(v, 2);
  const alle = $derived([...reihen.flatMap(r => (r.or === null ? [] : [r.lo!, r.hi!, r.or])), ...(gemeinsam ? [gemeinsam.lo, gemeinsam.hi] : []), ...(unbereinigt ? [unbereinigt.lo, unbereinigt.hi] : []), 1].filter(v => Number.isFinite(v) && v > 0));
  const lnLo0 = $derived(Math.log(Math.min(...alle))), lnHi0 = $derived(Math.log(Math.max(...alle)));
  const rand = $derived((lnHi0 - lnLo0) * 0.06 || 0.2);
  const lnLo = $derived(lnLo0 - rand), lnHi = $derived(lnHi0 + rand);
  const x = (v: number) => LINKS + (W - LINKS - RECHTS) * ((Math.log(v) - lnLo) / (lnHi - lnLo || 1));
  /** Achsenmarken bei „runden“ Verhältnissen, die in den Bereich fallen (höchstens etwa 8). */
  const ticks = $derived.by(() => {
    const kand = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.33, 0.5, 1, 2, 3, 4, 5, 10, 20, 50, 100, 200, 500, 1000];
    const im = kand.filter(t => Math.log(t) >= lnLo && Math.log(t) <= lnHi);
    if (im.length <= 8) return im;
    return im.filter((t, i) => i % 2 === 0 || t === 1);
  });
  const tz = (t: number) => (t < 1 ? komma(t, t === 0.33 ? 2 : t * 10 === Math.round(t * 10) ? 1 : 2) : komma(t, 0));
  const maxN = $derived(Math.max(...reihen.map(r => r.n), 1));
  const n = $derived(reihen.length);
  const yu = $derived(T + n * ZH + ZH / 2), yg = $derived(yu + ZH);
  const yAchse = $derived(yg + ZH / 2 + 10);
  const mk = $derived(Lx('Odds Ratio (logarithmische Achse)', 'Odds ratio (logarithmic axis)'));
  const XZ = $derived(xZusatz(mk, W - LINKS - RECHTS, 13, true));
  const seite = $derived(Lx(`höher in ${gruppe2} | höher in ${gruppe1}`, `higher in ${gruppe2} | higher in ${gruppe1}`));
  const H = $derived(yAchse + 70 + XZ);
  const kurz = (t: string, m = 30) => (t.length <= m ? t : t.slice(0, m - 1) + '…');
  const ors = $derived(reihen.flatMap(r => (r.or === null ? [] : [r.or])));
  const beschreibung = $derived([
    Lx(`Forest-Bild der Odds Ratios von ${n} Schichten.`, `Forest plot of the odds ratios of ${n} strata.`),
    gemeinsam ? Lx(`Gemeinsames Odds Ratio ${zeig(gemeinsam.or)} mit 95-%-Intervall von ${zeig(gemeinsam.lo)} bis ${zeig(gemeinsam.hi)}.`, `Common odds ratio ${zeig(gemeinsam.or)} with a 95% interval from ${zeig(gemeinsam.lo)} to ${zeig(gemeinsam.hi)}.`) : '',
    unbereinigt ? Lx(`Ohne Aufteilung ${zeig(unbereinigt.or)}.`, `Without splitting ${zeig(unbereinigt.or)}.`) : '',
    ors.length ? Lx(`Die Odds Ratios der Schichten reichen von ${zeig(Math.min(...ors))} bis ${zeig(Math.max(...ors))}.`, `The odds ratios of the strata range from ${zeig(Math.min(...ors))} to ${zeig(Math.max(...ors))}.`) : ''
  ].filter(Boolean).join(' '));
  const ne = $derived(Lx('nicht schätzbar', 'not estimable'));
  const bt = $derived(bildtext('sonstiges', {
    artName: Lx('Forest-Plot der Odds Ratios je Schicht', 'Forest plot of the odds ratios by stratum'), titel: Lx('Odds Ratios der Schichten', 'Odds ratios of the strata'),
    xAchse: { name: mk },
    saetze: [beschreibung, Lx(`Ein Odds Ratio von 1 bedeutet keinen Unterschied; höher in ${gruppe1} liegt rechts von 1, höher in ${gruppe2} links.`, `An odds ratio of 1 means no difference; higher in ${gruppe1} lies to the right of 1, higher in ${gruppe2} to the left.`)],
    tabelle: {
      kopf: [Lx('Schicht', 'Stratum'), 'n', 'OR', Lx('95-%-Intervall von', '95% interval from'), Lx('95-%-Intervall bis', '95% interval to')],
      zeilen: [
        ...reihen.map(r => [r.name, r.n, r.or === null ? ne : zeig(r.or), r.lo === null ? '' : zeig(r.lo), r.hi === null ? '' : zeig(r.hi)]),
        [Lx('Alle zusammen (unbereinigt)', 'All together (unadjusted)'), '', unbereinigt ? zeig(unbereinigt.or) : ne, unbereinigt ? zeig(unbereinigt.lo) : '', unbereinigt ? zeig(unbereinigt.hi) : ''],
        [Lx('Gemeinsames OR (Mantel-Haenszel)', 'Common OR (Mantel-Haenszel)'), '', gemeinsam ? zeig(gemeinsam.or) : ne, gemeinsam ? zeig(gemeinsam.lo) : '', gemeinsam ? zeig(gemeinsam.hi) : '']
      ]
    }
  }));
</script>
<div bind:clientWidth={br}>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px;min-width:{kompakt ? 0 : 600}px">
  <text x="8" y={T - 14} font-weight="600" style="font-size:12px">{Lx('Schicht', 'Stratum')}</text>
  {#if !kompakt}<text x={W - RECHTS + 14} y={T - 14} font-weight="600" style="font-size:12px">OR [{Lx('95 %-KI', '95% CI')}]</text>{/if}
  <line x1={x(1)} x2={x(1)} y1={T - 6} y2={yAchse} stroke="var(--dg-achse)" stroke-dasharray="4 3" />
  {#each reihen as r, i (i)}
    {@const y = T + i * ZH + ZH / 2}
    {@const seit = 4 + 11 * Math.sqrt(r.n / maxN)}
    <g><title>{r.name}: {r.or === null ? Lx('nicht schätzbar (leere Zelle)', 'not estimable (empty cell)') : `${zeig(r.or)} ${iv(zeig(r.lo!), zeig(r.hi!))}`}, n = {r.n}</title>
      <text x="8" y={y + 4} style="font-size:12px">{kurz(r.name, kompakt ? 16 : 30)}</text>
      {#if r.or !== null}
        <line x1={x(r.lo!)} x2={x(r.hi!)} y1={y} y2={y} stroke="var(--dg-achse)" stroke-width="1.5" />
        <rect x={x(r.or) - seit / 2} y={y - seit / 2} width={seit} height={seit} fill="var(--dg-a)" />
        {#if !kompakt}<text x={W - RECHTS + 14} y={y + 4} style="font-size:12px">{zeig(r.or)} {iv(zeig(r.lo!), zeig(r.hi!))}</text>{/if}
      {:else}
        <text x={x(1)} y={y + 4} text-anchor="middle" class="klein">{Lx('nicht schätzbar', 'not estimable')}</text>
      {/if}</g>
  {/each}
  <line x1={LINKS - 6} x2={W - 8} y1={yu - ZH / 2 + 1} y2={yu - ZH / 2 + 1} stroke="var(--dg-gitter)" />
  {#if unbereinigt}
    <g><title>{Lx('Ohne Aufteilung', 'Without splitting')}: {zeig(unbereinigt.or)} {iv(zeig(unbereinigt.lo), zeig(unbereinigt.hi))}</title>
      <text x="8" y={yu + 4} style="font-size:12px">{kompakt ? Lx('Unbereinigt', 'Unadjusted') : Lx('Alle zusammen (unbereinigt)', 'All together (unadjusted)')}</text>
      <polygon points="{x(unbereinigt.lo)},{yu} {x(unbereinigt.or)},{yu - 7} {x(unbereinigt.hi)},{yu} {x(unbereinigt.or)},{yu + 7}" fill="none" stroke="var(--tinte)" stroke-width="1.5" />
      {#if !kompakt}<text x={W - RECHTS + 14} y={yu + 4} style="font-size:12px">{zeig(unbereinigt.or)} {iv(zeig(unbereinigt.lo), zeig(unbereinigt.hi))}</text>{/if}</g>
  {:else}
    <text x="8" y={yu + 4} style="font-size:12px">{kompakt ? Lx('Unbereinigt', 'Unadjusted') : Lx('Alle zusammen (unbereinigt)', 'All together (unadjusted)')}: {Lx('nicht schätzbar', 'not estimable')}</text>
  {/if}
  <g>
    <text x="8" y={yg + 4} font-weight="700" style="font-size:12px">{kompakt ? Lx('Gemeinsam (MH)', 'Common (MH)') : Lx('Gemeinsames OR (Mantel-Haenszel)', 'Common OR (Mantel-Haenszel)')}</text>
    {#if gemeinsam}
      <title>{Lx('Gemeinsames Odds Ratio', 'Common odds ratio')}: {zeig(gemeinsam.or)} {iv(zeig(gemeinsam.lo), zeig(gemeinsam.hi))}</title>
      <polygon points="{x(gemeinsam.lo)},{yg} {x(gemeinsam.or)},{yg - 8} {x(gemeinsam.hi)},{yg} {x(gemeinsam.or)},{yg + 8}" fill="var(--tinte)" stroke="var(--tinte)" />
      {#if !kompakt}<text x={W - RECHTS + 14} y={yg + 4} font-weight="700" style="font-size:12px">{zeig(gemeinsam.or)} {iv(zeig(gemeinsam.lo), zeig(gemeinsam.hi))}</text>{/if}
    {:else}
      <text x={x(1)} y={yg + 4} text-anchor="middle" class="klein">{Lx('nicht schätzbar', 'not estimable')}</text>
    {/if}</g>
  <line x1={x(Math.exp(lnLo))} x2={x(Math.exp(lnHi))} y1={yAchse} y2={yAchse} stroke="var(--dg-achse)" />
  {#each ticks as t (t)}<line x1={x(t)} x2={x(t)} y1={yAchse} y2={yAchse + 5} stroke="var(--dg-achse)" /><text x={x(t)} y={yAchse + 19} text-anchor="middle" class="klein">{tz(t)}</text>{/each}
  <XTitel x={(x(Math.exp(lnLo)) + x(Math.exp(lnHi))) / 2} y={yAchse + 40} breite={W - LINKS - RECHTS} text={mk} fett />
  <text x={(x(Math.exp(lnLo)) + x(Math.exp(lnHi))) / 2} y={yAchse + 60 + XZ} text-anchor="middle" class="klein">{seite}</text>
</svg>
<BildBeschreibung {...bt} />
</div>
