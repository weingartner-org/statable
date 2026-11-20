<script lang="ts">
  import YTitel from './YTitel.svelte';
  import XTitel from './XTitel.svelte';
  import { yZusatz, xZusatz } from '../lib/ytitel';
  import { achsenMarken, achsenBereich } from '../lib/diagrammdaten';
  import { zahlDe } from '../lib/format';
  import { L as Lx, Lp } from '../lib/sitzung.svelte';
  import { bildtext } from '../lib/bildtext';
  import BildBeschreibung from './BildBeschreibung.svelte';
  import { zeitTeilstriche, trendBand, zeitLabel, positionIso, einheitWort, type ZeitreiheE, type ZeitreiheAuswertung } from '../lib/zeitreiheblatt';

  /**
   * Das Verlaufsbild der Zeitreihe (Später S-E, L7): die Werte als Linie mit kleinen Punkten (Lücken sind Unterbrechungen, nichts wird aufgefüllt), auf Wunsch der gleitende Mittelwert,
   * die Trendgerade mit 95-%-Band (und, bei Autokorrelation, einem zweiten gestrichelten Band mit effektiver Fallzahl). Keine Prognose: die Linien enden mit den Daten.
   * Farbe und Strichart unterscheiden die Linien (auch in Schwarz-Weiß).
   */
  let { e, a, wertText, zeitText = '', gleitend = true, trend = true }: { e: ZeitreiheE; a: ZeitreiheAuswertung; wertText: string; zeitText?: string; gleitend?: boolean; trend?: boolean } = $props();
  const uid = $props.id();
  const W = 720, H0 = 380, L0 = 66, R = 24, T = 54, U0 = 64;
  const zeitTitel = $derived(zeitText || Lx('Zeit', 'Time'));
  const L = $derived(L0 + yZusatz(wertText, H0 - T - U0, 14, true));
  const XZ = $derived(xZusatz(zeitTitel, W - L - R, 14, true));
  const H = $derived(H0 + XZ), U = $derived(U0 + XZ);

  const t0 = $derived(e.t[0] ?? 1), t1 = $derived(e.t[e.t.length - 1] ?? 1);
  const mitBand = $derived(trend && !!a.trend && a.trend.df >= 1);
  const band = $derived(mitBand ? trendBand(e, a, false) : []);
  const bandEff = $derived(mitBand && a.effGezeigt && a.eff ? trendBand(e, a, true) : []);
  const gl = $derived(gleitend ? a.gleitend : null);
  const alleY = $derived([...e.y.filter((v): v is number => v !== null), ...(gl ?? []).filter((v): v is number => v !== null), ...band.flatMap(b => [b.lo, b.hi]), ...bandEff.flatMap(b => [b.lo, b.hi])]);
  const bereich = $derived(alleY.length ? achsenBereich(Math.min(...alleY), Math.max(...alleY), 5) : [0, 1] as [number, number]);
  const unten = $derived(bereich[0]), oben = $derived(bereich[1]);
  const ticksY = $derived(achsenMarken(unten, oben, 5));
  const X = (t: number) => L + 8 + (W - L - R - 16) * (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0));
  const Y = (v: number) => T + (H - T - U) * (1 - (v - unten) / (oben - unten || 1));
  const ticksX = $derived(zeitTeilstriche(e, 8));
  /** Linienstücke ohne Lücken */
  const stuecke = $derived.by(() => {
    const aus: { t: number; v: number }[][] = []; let akt: { t: number; v: number }[] = [];
    e.y.forEach((v, i) => { if (v === null) { if (akt.length) aus.push(akt); akt = []; } else akt.push({ t: e.t[i]!, v }); });
    if (akt.length) aus.push(akt);
    return aus;
  });
  const glStuecke = $derived.by(() => {
    if (!gl) return [];
    const aus: { t: number; v: number }[][] = []; let akt: { t: number; v: number }[] = [];
    gl.forEach((v, i) => { if (v === null) { if (akt.length) aus.push(akt); akt = []; } else akt.push({ t: e.t[i]!, v }); });
    if (akt.length) aus.push(akt);
    return aus;
  });
  const punkte = $derived(e.y.length <= 150);
  const pfad = (p: { t: number; v: number }[]) => p.map(q => `${X(q.t).toFixed(1)},${Y(q.v).toFixed(1)}`).join(' ');
  const bandPfad = (b: { t: number; lo: number; hi: number }[]) => (b.length ? `M${b.map(q => `${X(q.t).toFixed(1)},${Y(q.hi).toFixed(1)}`).join('L')}L${[...b].reverse().map(q => `${X(q.t).toFixed(1)},${Y(q.lo).toFixed(1)}`).join('L')}Z` : '');
  const linie = $derived(trend && a.trend ? { a: a.trend.a + a.trend.b * t0, b: a.trend.a + a.trend.b * t1 } : null);
  const von = $derived(zeitLabel(e.erster, e.raster)), bis = $derived(zeitLabel(e.letzter, e.raster));
  const verlaufText = $derived(e.luecken > 0
    ? Lp(e.luecken, `Verlauf von ${wertText}: ${e.n} Werte von ${von} bis ${bis}, ${e.luecken} Lücke. `, `Verlauf von ${wertText}: ${e.n} Werte von ${von} bis ${bis}, ${e.luecken} Lücken. `, `Course of ${wertText}: ${e.n} values from ${von} to ${bis}, ${e.luecken} gap. `, `Course of ${wertText}: ${e.n} values from ${von} to ${bis}, ${e.luecken} gaps. `)
    : Lx(`Verlauf von ${wertText}: ${e.n} Werte von ${von} bis ${bis}. `, `Course of ${wertText}: ${e.n} values from ${von} to ${bis}. `));
  const trendText = $derived(a.trend ? Lx(`Trend ${zahlDe(a.trend.b, 3)} ${einheitWort(e.raster)}, 95-%-Intervall von ${zahlDe(a.trend.kiB[0], 3)} bis ${zahlDe(a.trend.kiB[1], 3)}.`, `Trend ${zahlDe(a.trend.b, 3)} ${einheitWort(e.raster)}, 95% interval from ${zahlDe(a.trend.kiB[0], 3)} to ${zahlDe(a.trend.kiB[1], 3)}.`) : '');
  const beschreibung = $derived(verlaufText + trendText);
  const zLabel = (t: number) => (e.raster === 'zeilen' ? String(t) : zeitLabel(positionIso(e, t), e.raster));
  const bt = $derived(bildtext('linie', {
    titel: Lx('Verlauf der Zeitreihe', 'Course of the time series'),
    xAchse: { name: zeitTitel }, yAchse: { name: wertText }, x: e.t.map(zLabel),
    reihen: [{ name: Lx('Werte', 'Values'), werte: e.y },
      ...(gl ? [{ name: Lx(`Gleitender Mittelwert (Fenster ${e.fenster})`, `Moving average (window ${e.fenster})`), werte: gl }] : []),
      ...(linie && a.trend ? [{ name: Lx('Trendgerade', 'Trend line'), werte: e.t.map(t => a.trend!.a + a.trend!.b * t) }] : [])]
  }));
  const leg = $derived([
    { t: Lx('Werte', 'Values'), f: 'var(--dg-a)', s: '' },
    ...(gl ? [{ t: Lx(`Gleitender Mittelwert (Fenster ${e.fenster})`, `Moving average (window ${e.fenster})`), f: 'var(--dg-b)', s: '9 5' }] : []),
    ...(linie ? [{ t: Lx('Trendgerade', 'Trend line'), f: 'var(--tinte)', s: '2 5' }] : [])
  ]);
</script>
<svg class="diagramm" viewBox="0 0 {W} {H}" role="img" aria-label={bt.kurz} style="max-width:{W}px" stroke-linejoin="round">
  {#each leg as l, i}
    {@const x0 = L + (i === 0 ? 0 : leg.slice(0, i).reduce((s, q) => s + 56 + q.t.length * 6.4, 0))}
    <line x1={x0} x2={x0 + 28} y1="22" y2="22" stroke={l.f} stroke-width="2.6" stroke-dasharray={l.s} /><text x={x0 + 34} y="26" style="font-size:12px">{l.t}</text>
  {/each}
  {#each ticksY as v}<line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} stroke="var(--dg-gitter)" /><text x={L - 8} y={Y(v) + 4} text-anchor="end" class="klein">{zahlDe(v)}</text>{/each}
  <line x1={L} x2={L} y1={T} y2={H - U} stroke="var(--dg-achse)" /><line x1={L} x2={W - R} y1={H - U} y2={H - U} stroke="var(--dg-achse)" />
  {#each ticksX as k}<line x1={X(k.t)} x2={X(k.t)} y1={H - U} y2={H - U + 5} stroke="var(--dg-achse)" /><text x={X(k.t)} y={H - U + 20} text-anchor="middle" class="klein">{k.label}</text>{/each}
  {#if bandEff.length}<path d={bandPfad(bandEff)} fill="var(--tinte)" opacity=".07" stroke="var(--tinte-2)" stroke-width="1" stroke-dasharray="5 4" />{/if}
  {#if band.length}<path d={bandPfad(band)} fill="var(--tinte)" opacity=".14" stroke="none" />{/if}
  {#each stuecke as p}<polyline points={pfad(p)} fill="none" stroke="var(--dg-a)" stroke-width="2" stroke-linecap="round" />{/each}
  {#if punkte}{#each stuecke as p}{#each p as q}<circle cx={X(q.t)} cy={Y(q.v)} r="3" fill="var(--blatt)" stroke="var(--dg-a)" stroke-width="1.8" />{/each}{/each}{/if}
  {#each glStuecke as p}<polyline points={pfad(p)} fill="none" stroke="var(--dg-b)" stroke-width="2.6" stroke-dasharray="9 5" stroke-linecap="round" />{/each}
  {#if linie}<line x1={X(t0)} x2={X(t1)} y1={Y(linie.a)} y2={Y(linie.b)} stroke="var(--tinte)" stroke-width="2.2" stroke-dasharray="2 5" stroke-linecap="round" />{/if}
  <XTitel x={(L + W - R) / 2} y={H - 22 - XZ + 0} breite={W - L - R} text={zeitTitel} px={14} fett />
  <YTitel x={18} y={(T + H - U) / 2} laenge={H - T - U} text={wertText} px={14} fett />
  {#if bandEff.length}<text x={W - R} y={H - 4} text-anchor="end" class="klein" style="font-size:11px">{Lx('Gestrichelt umrandetes Band: Intervall mit effektiver Fallzahl', 'Dashed band: interval with effective sample size')}</text>{/if}
</svg>
<BildBeschreibung {...bt} beschreibung={[beschreibung, ...bt.beschreibung]} />
